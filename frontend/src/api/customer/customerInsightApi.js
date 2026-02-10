import api from "@/api/axios";

// 고객 분석 리포트 조회
export const getCustomerInsightApi = (customerCode) => {
    return api.get(`/customers/${customerCode}/analysis-report`);
};
