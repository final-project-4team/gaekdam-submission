import api from "@/api/axios";

// 고객 상세
export const getCustomerDetailApi = ({ customerCode, hotelGroupCode }) => {
    return api.get(`/customers/${customerCode}`, { params: { hotelGroupCode } });
};

// 고객 스냅샷
export const getCustomerSnapshotApi = ({ customerCode, hotelGroupCode }) => {
    return api.get(`/customers/${customerCode}/snapshot`, { params: { hotelGroupCode } });
};

// 고객 타임라인
export const getCustomerTimelineApi = ({ customerCode, hotelGroupCode, limit = 50 }) => {
    return api.get(`/customers/${customerCode}/timeline`, {
        params: { hotelGroupCode, limit },
    });
};

// 고객 상태 변경 이력
export const getCustomerStatusHistoriesApi = ({ customerCode, hotelGroupCode, params = {} }) => {
    return api.get(`/customers/${customerCode}/status-histories`, {
        params: { ...params, hotelGroupCode },
    });
};
