import api from "@/api/axios";

// 회원가입
export const signupApi = (data) => {
    return api.post("/auth/signup", data);
};

// 로그인
export const loginApi = (loginId, password) => {
    return api.post("/auth/login", { loginId, password });
};

// 토큰 재발급
export const refreshApi = () => api.post("/auth/refresh");

// 로그아웃
export const logoutApi = () => api.delete("/auth/logout");

// 내 권한 목록 조회
// 백엔드에서 '/auth/permissions' 엔드포인트를 통해 현재 로그인한 사용자의 권한 코드 목록을 반환
export const getMyPermissionsApi = () => {
    return api.get("/auth/permissions");
};
