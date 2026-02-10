import api from "@/api/axios";

// 고객 목록 조회
export const getCustomerListApi = (params) => {
    return api.get("/customers", {
        params,
        skipLoading: true,
    });
};

// 고객 활동쪽에서 추가함
export const getCustomerBasicApi = (customerCode) => {
    return api.get(`/customers/${customerCode}/basic`);
};




