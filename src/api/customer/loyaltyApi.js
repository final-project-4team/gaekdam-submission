import api from "@/api/axios";

export const getCustomerLoyaltyApi = async ({ customerCode }) => {
    const res = await api.get(`/customers/${customerCode}/loyalty`);
    return res.data.data;
};

export const getCustomerLoyaltyHistoriesApi = async ({
                                                         customerCode,
                                                         page = 1,     // 1-base 그대로
                                                         size = 20,
                                                         from,         // "YYYY-MM-DD" 필수
                                                         to,           // "YYYY-MM-DD" 필수
                                                     }) => {
    const res = await api.get(`/customers/${customerCode}/loyalties/history`, {
        params: { page, size, from, to },
    });
    return res.data.data;
};
