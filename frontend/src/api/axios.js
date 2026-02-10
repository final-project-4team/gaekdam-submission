import axios from "axios";
import { useAuthStore } from "@/stores/authStore";
import { useToastStore } from "@/stores/toastStore";
import { useLoadingStore } from "@/stores/loading"; // 전역 로딩 스토어

// ========== axios instance ==========
const api = axios.create({
    baseURL: `${import.meta.env.VITE_API_BASE}/api/v1`, // /api/v1
    withCredentials: true,
});

// ========== Request: 토큰 자동 포함 + 전역 로딩 시작 ==========
api.interceptors.request.use(
    (config) => {
        const authStore = useAuthStore();
        const loadingStore = useLoadingStore();

        // 전역 로딩 시작 (옵션으로 스킵 가능)
        if (!config.skipLoading) {
            loadingStore.start();
        }

        // login, signup, 인증 요청 → Authorization 제거
        if (
            config.url.includes("/auth/login") ||
            config.url.includes("/auth/signup") ||
            config.url.includes("/auth/sms") ||
            config.url.includes("/auth/business")
        ) {
            config.headers.Authorization = null;
            return config;
        }

        // refresh 요청은 토큰 제거
        if (config.url.includes("/auth/refresh")) {
            config.headers.Authorization = null;
            return config;
        }

        // 인증 생략 옵션
        if (config.skipAuth) return config;

        // 일반 요청은 access token 자동 포함
        if (authStore.accessToken && !config.headers.Authorization) {
            config.headers.Authorization = `Bearer ${authStore.accessToken}`;
        }

        return config;
    },
    (error) => {
        // 요청 단계 에러 시 로딩 종료
        const loadingStore = useLoadingStore();
        loadingStore.end();
        return Promise.reject(error);
    }
);

// ========== Response: 자동 재발급 + 전역 로딩 종료 ==========
let isRefreshing = false;
let refreshSubscribers = [];

const onTokenRefreshed = (accessToken) => {
    refreshSubscribers.forEach((callback) => callback(accessToken));
    refreshSubscribers = [];
};

const addRefreshSubscriber = (callback) => {
    refreshSubscribers.push(callback);
};

api.interceptors.response.use(
    (response) => {
        // 정상 응답 시 로딩 종료
        const loadingStore = useLoadingStore();
        loadingStore.end();

        // ApiResponse success=false → 에러 처리
        if (response.data?.success === false) {
            // [추가] 토큰/인증 관련 메시지가 포함된 경우 강제 로그아웃
            const msg = response.data.message || "";
            if (
                msg.includes("유효하지 않은 토큰") ||
                msg.includes("로그인") ||
                msg.includes("인증") ||
                msg.includes("권한") ||
                msg.includes("Token")
            ) {
                const authStore = useAuthStore();
                authStore.clearAuthState();
            }

            const err = new Error(msg || "요청 실패");
            err.response = response;
            throw err;
        }

        return response;
    },

    async (error) => {
        const loadingStore = useLoadingStore();
        const authStore = useAuthStore();
        const toastStore = useToastStore();
        const originalRequest = error.config;

        // 에러 응답 시 로딩 종료
        loadingStore.end();

        if (!error.response) return Promise.reject(error);
        const status = error.response.status;
        const msg = error.response.data?.message || "";

        console.log("Axios Error Interceptor:", { status, msg, data: error.response.data });

        // [추가] 403 Forbidden 이지만 인증 관련 메시지인 경우 로그아웃 처리
        // (백엔드가 401 대신 403을 주는 경우 대비)
        if (status === 403) {
            if (
                msg.includes("유효하지 않은 토큰") ||
                msg.includes("로그인") ||
                msg.includes("인증") ||
                msg.includes("Token")
            ) {
                authStore.clearAuthState();
                return Promise.reject(error);
            }
        }

        // 401 이외는 그대로 에러 처리
        if (status !== 401) return Promise.reject(error);

        // auth 요청(특히 refresh)은 재발급 대상 제외 (무한루프 방지)
        if (originalRequest.url.includes("/auth/refresh") || originalRequest.url.includes("/auth/login")) {
            // [Fix] Refresh Token 자체가 만료/무효인 경우 로그아웃 처리
            if (originalRequest.url.includes("/auth/refresh")) {
                authStore.clearAuthState();
            }
            return Promise.reject(error);
        }

        // 토큰 없으면 실패
        if (!authStore.accessToken) return Promise.reject(error);

        // 중복 재시도 방지 (재요청이 실패한 경우)
        if (originalRequest._retry) return Promise.reject(error);

        // 이미 갱신 중이라면 대기열에 추가
        if (isRefreshing) {
            return new Promise((resolve) => {
                addRefreshSubscriber((accessToken) => {
                    originalRequest.headers.Authorization = `Bearer ${accessToken}`;
                    resolve(api(originalRequest));
                });
            });
        }

        originalRequest._retry = true;
        isRefreshing = true;

        try {
            // refresh 중에는 로딩 다시 안 띄우기 (선택 사항)
            originalRequest.skipLoading = true;

            // refreshToken으로 accessToken 재발급
            await authStore.refreshTokens();
            const newAccessToken = authStore.accessToken;

            isRefreshing = false;

            // 대기 중이던 요청들 일괄 처리
            onTokenRefreshed(newAccessToken);

            // 현재 요청 재시도
            originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
            return api(originalRequest);

        } catch (err) {
            isRefreshing = false;
            refreshSubscribers = []; // 대기열 비우기
            loadingStore.reset();
            authStore.clearAuthState();
            return Promise.reject(err);
        }
    }
);

export default api;
