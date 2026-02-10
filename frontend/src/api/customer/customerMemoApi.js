import api from "@/api/axios";

// 목록
export const getCustomerMemosApi = ({
                                        customerCode,
                                        page = 1,
                                        size = 20,
                                        sortBy = "created_at",
                                        direction = "DESC",
                                        fromDate, // ISO DATE_TIME: 2026-08-01T00:00:00
                                        toDate,   // ISO DATE_TIME: 2026-08-31T23:59:59
                                    }) => {
    return api.get(`/customers/${customerCode}/memos`, {
        params: { page, size, sortBy, direction, fromDate, toDate },
    });
};

// 상세
export const getCustomerMemoDetailApi = ({ customerCode, memoCode }) => {
    return api.get(`/customers/${customerCode}/memos/${memoCode}`);
};

// 작성
export const createCustomerMemoApi = ({ customerCode, body }) => {
    return api.post(`/customers/${customerCode}/memos`, body);
};

// 수정
export const updateCustomerMemoApi = ({ customerCode, memoCode, body }) => {
    return api.put(`/customers/${customerCode}/memos/${memoCode}`, body);
};

// 삭제
export const deleteCustomerMemoApi = ({ customerCode, memoCode }) => {
    return api.delete(`/customers/${customerCode}/memos/${memoCode}`);
};