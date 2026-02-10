import { ref, computed } from "vue";
import { defineStore } from "pinia";
import { jwtDecode } from "jwt-decode";
import {
  loginApi,
  refreshApi,
  logoutApi,
  getMyPermissionsApi
} from "@/api/auth/authApi";
import router from "@/router";
import { getMyPropertyApi } from "@/api/property/propertyApi.js";

export const useAuthStore = defineStore("auth", () => {

  /* state */
  const accessToken = ref(null);
  const user = ref(null);
  const permissions = ref([]); // 권한 목록 저장소 (예: ['permission:read', ...])
  const loading = ref(false);
  const hotel = ref(null);

  /* getters */
  const isLoggedIn = computed(() => !!accessToken.value);


  const hasPermission = (required) => {
    if (!required) {
      return true;
    }

    const mine = permissions.value;
    if (Array.isArray(required)) {
      return required.every(p => mine.includes(p));
    }
    return mine.includes(required);
  };

  //  JWT role 기반임  제거 가능
  const hasAuthority = (authority) =>
    computed(() => user.value?.authorities?.includes(authority));

  //setters
  const setAccessToken = (token) => {
    accessToken.value = token;
    if (token) {
      localStorage.setItem("accessToken", token);
    } else {
      localStorage.removeItem("accessToken");
    }
  };

  const setUser = (data) => {
    user.value = data;
    if (data) {
      localStorage.setItem("user", JSON.stringify(data));
    } else {
      localStorage.removeItem("user");
    }
  };

  // [권한 목록 저장]
  const setPermissions = (perms) => {
    permissions.value = perms || [];
    if (perms) {
      localStorage.setItem("permissions", JSON.stringify(perms));
    } else {
      localStorage.removeItem("permissions");
    }
  };

  /* JWT → user */

  const setUserFromToken = (token) => {
    try {
      const payload = jwtDecode(token);

      setUser({
        loginId: payload.sub,
        authorities: [payload.role],     // permissionName
        hotelGroupCode: payload.hotelGroupCode,
        propertyCode: payload.propertyCode,
      });

    } catch (e) {
      console.error("JWT decode 실패", e);
      setUser(null);
    }
  };

  /* storage 복원 */
  const loadFromStorage = () => {
    const token = localStorage.getItem("accessToken");
    const userStr = localStorage.getItem("user");
    const hotelStr = localStorage.getItem("hotel");
    const permsStr = localStorage.getItem("permissions"); // 권한 복구

    if (token) {
      accessToken.value = token;
    }
    if (userStr) {
      user.value = JSON.parse(userStr);
    }
    if (hotelStr) {
      hotel.value = JSON.parse(hotelStr);
    }
    if (permsStr) {
      permissions.value = JSON.parse(permsStr);
    } // 권한 복구
  };


  const defaultRouteByPermission = () => {
    // 헬퍼 함수: 목록 중 하나라도 권한이 있는지 확인
    const hasAny = (perms) => perms.some(p => hasPermission(p));
    if (hasPermission("REPORT_LAYOUT_LIST")) return "/reports";
    if (hasAny(["CUSTOMER_LIST", "CUSTOMER_READ"])) return "/customers";
    if (hasAny(["INQUIRY_LIST", "INCIDENT_LIST"])) return "/voc";
    if (hasAny([
      "RESERVATION_LIST", "TODAY_RESERVATION_LIST",
      "TODAY_FACILITY_USAGE_LIST", "CUSTOMER_TIMELINE_READ"
    ])) return "/activities";
    if (hasAny(["MESSAGE_CREATE", "MESSAGE_LIST"])) return "/messages";
    if (hasAny([
      "EMPLOYEE_LIST", "SETTING_OBJECTIVE_LIST", "PERMISSION_LIST",
      "MEMBERSHIP_POLICY_LIST", "LOYALTY_POLICY_LIST"
    ])) return "/setting";
    if (hasAny([
      "LOG_LOGIN_LIST", "LOG_AUDIT_LIST",
      "LOG_PERMISSION_CHANGED_LIST", "LOG_PERSONAL_INFORMATION_LIST"
    ])) return "/system";
    return "/myPage";
  }


  /* login */
  const login = async ({ loginId, password }) => {
    loading.value = true;
    try {
      const res = await loginApi(loginId, password);
      const { success, data } = res.data;
      if (!success) {
        throw new Error();
      }

      setAccessToken(data.accessToken);
      setUserFromToken(data.accessToken);

      // [권한 목록 및 호텔 정보 조회]
      await Promise.all([
        fetchMyPermissions(),
        fetchMyHotel()
      ]);

      return { success: true };
    } catch (e) {
      // API 에러 응답에서 메시지 추출
      const msg = e.response?.data?.message || "로그인에 실패했습니다.";
      return { success: false, message: msg };
    } finally {
      loading.value = false;
    }
  };

  // [권한 목록 조회 Action]
  const fetchMyPermissions = async () => {
    try {
      const res = await getMyPermissionsApi();

      // 백엔드 응답 구조에 따라 res.data.data 등 확인 필요
      // 만약 res.data가 바로 배열인 경우 등 구조 확인용
      const content = res.data?.data || res.data;

      // 안전하게 배열 여부 확인하여 저장
      if (Array.isArray(content)) {
        setPermissions(content);
      } else if (Array.isArray(res.data?.data)) {
        // 기존 로직 fallback
        setPermissions(res.data.data);
      } else {
        console.warn("[AuthStore] Unexpected permission data format:",
          res.data);
        setPermissions([]);
      }

    } catch (e) {
      console.error("권한 목록 조회 실패", e);
      // 실패 시 권한 없음 처리 또는 예외 처리
      setPermissions([]);
    }
  }

  const setHotel = (data) => {
    hotel.value = data;
    if (data) {
      localStorage.setItem("hotel", JSON.stringify(data));
    } else {
      localStorage.removeItem("hotel");
    }
  };

  const fetchMyHotel = async () => {
    try {
      const res = await getMyPropertyApi();
      setHotel(res.data.data);
    } catch (e) {
      console.error("호텔 정보 조회 실패", e);
      setHotel(null);
    }
  };

  /* refresh */
  const refreshTokens = async () => {
    try {
      const res = await refreshApi();
      const {data} = res.data;

      setAccessToken(data.accessToken);
      setUserFromToken(data.accessToken);
    }
    catch(e){
      const msg = e.response?.data?.message ;
      alert(msg);
      throw e;
    }
  };

  /* logout */
  const logout = async () => {
    try {
      await logoutApi();
    } finally {
      clearAuthState();
    }
  };

  // 상태 초기화
  const clearAuthState = () => {
    setAccessToken(null);
    setUser(null);
    setHotel(null);
    setPermissions([]); // 권한 초기화
    localStorage.removeItem("permissions"); // 스토리지 삭제
    router.push("/login");
  };

  return {
    accessToken,
    user,
    hotel,
    permissions,
    loading,

    isLoggedIn,
    hasAuthority,
    hasPermission,

    login,
    refreshTokens,
    logout,
    fetchMyPermissions,

    loadFromStorage,
    clearAuthState,
    defaultRouteByPermission,
  };
});
