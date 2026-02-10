import api from "@/api/axios.js";

// 시스템 로그 목록 조회
export const getSystemLogList = async ({
    page = 1,
    size = 10,
    filters = {},
    detail = {},
    sort = {}
} = {}) => {
    // 날짜를 LocalDateTime 형식으로 변환 (YYYY-MM-DDTHH:mm:ss)
    const formatDate = (dateStr, isEndDate = false) => {
        if (!dateStr) return undefined;
        // 시작일은 00:00:00, 종료일은 23:59:59
        const time = isEndDate ? 'T23:59:59' : 'T00:00:00';
        return dateStr + time;
    };

    const params = {
        page,
        size,

        result: filters.result,

        // 날짜 필터 (LocalDateTime 형식)
        fromDate: formatDate(detail.fromDate, false),
        toDate: formatDate(detail.toDate, true),

        // 검색: loginId, userIp, keyword
        loginId: detail.loginId || undefined,
        userIp: detail.userIp || undefined,
        keyword: detail.keyword || undefined,

        // 정렬
        sortBy: sort.sortBy || undefined,
        direction: sort.direction || undefined
    };

    console.log('API Request Params:', params); // 디버깅용

    const res = await api.get("/logs/login", { params });
    return res.data.data;
};

// 시스템 로그 상세 조회
// 활동 로그 상세 조회 (Audit Log)
export const getSystemLogDetail = async (auditLogCode) => {
    const res = await api.get(`/logs/audit/${auditLogCode}`);
    return res.data.data;
};

// 활동 기록 조회
export const getActivityLogList = async ({
    page = 1,
    size = 10,
    filters = {},
    detail = {},
    sort = {}
} = {}) => {
    // 날짜를 LocalDateTime 형식으로 변환
    const formatDate = (dateStr, isEndDate = false) => {
        if (!dateStr) return undefined;
        const time = isEndDate ? 'T23:59:59' : 'T00:00:00';
        return dateStr + time;
    };

    const params = {
        page,
        size,
        fromDate: formatDate(detail.fromDate, false),
        toDate: formatDate(detail.toDate, true),
        keyword: detail.keyword || undefined,
        employeeLoginId: detail.loginId || undefined,
        permissionTypeKey: detail.action || undefined,
        details: detail.detail || undefined,

        // 정렬
        sortBy: sort.sortBy || undefined,
        direction: sort.direction || undefined
    };

    const res = await api.get("/logs/audit", { params });
    return res.data.data;
};

// 권한 변경 이력 조회
export const getPermissionLogList = async ({
    page = 1,
    size = 10,
    filters = {},
    detail = {},
    sort = {}
} = {}) => {
    const formatDate = (dateStr, isEndDate = false) => {
        if (!dateStr) return undefined;
        const time = isEndDate ? 'T23:59:59' : 'T00:00:00';
        return dateStr + time;
    };

    const params = {
        page,
        size,
        fromDate: formatDate(detail.fromDate, false),
        toDate: formatDate(detail.toDate, true),
        keyword: detail.keyword || undefined,

        // 상세 검색 필드
        changedLoginId: detail.targetId || undefined,
        accessorLoginId: detail.modifierId || undefined,
        beforePermissionName: detail.beforePermission || undefined,
        afterPermissionName: detail.afterPermission || undefined,

        sortBy: sort.sortBy || undefined,
        direction: sort.direction || undefined
    };

    const res = await api.get("/logs/permission-changed", { params });
    return res.data.data;
};

// 개인정보 조회 이력 조회
export const getPrivacyLogList = async ({
    page = 1,
    size = 10,
    filters = {},
    detail = {},
    sort = {}
} = {}) => {
    const formatDate = (dateStr, isEndDate = false) => {
        if (!dateStr) return undefined;
        const time = isEndDate ? 'T23:59:59' : 'T00:00:00';
        return dateStr + time;
    };

    const params = {
        page,
        size,
        fromDate: formatDate(detail.fromDate, false),
        toDate: formatDate(detail.toDate, true),
        keyword: detail.keyword || undefined,

        // 상세 검색 필드
        personalInformationLogCode: detail.privacyLogCode || undefined,
        accessorLoginId: detail.loginId || undefined,
        employeeAccessorName: detail.accessorName || undefined,
        permissionTypeKey: detail.action || undefined,
        targetCode: detail.targetCode || undefined,
        targetName: detail.targetName || undefined,
        targetType: detail.targetType || undefined,

        sortBy: sort.sortBy || undefined,
        direction: sort.direction || undefined
    };

    const res = await api.get("/logs/personal-information", { params });
    return res.data.data;
};
