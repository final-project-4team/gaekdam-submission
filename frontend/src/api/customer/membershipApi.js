import api from "@/api/axios";

export const getCustomerMembershipApi = async ({ customerCode }) => {
    const res = await api.get(`/customers/${customerCode}/membership`);
    return res.data.data;
};

export const getCustomerMembershipHistoriesApi = async ({
                                                            customerCode,
                                                            page = 1,     // 화면은 1부터, 백도 1-base라 그대로 보냄
                                                            size = 20,
                                                            from,         // "YYYY-MM-DD" 필수
                                                            to,           // "YYYY-MM-DD" 필수
                                                        }) => {
    const res = await api.get(`/customers/${customerCode}/memberships/history`, {
        params: { page, size, from, to },
    });
    return res.data.data;
};

export const patchMembershipManuallyApi = async (customerCode, payload) => {
    const res = await api.patch(`/memberships/customers/${customerCode}/manual`, payload);
    return res.data?.data;
};


