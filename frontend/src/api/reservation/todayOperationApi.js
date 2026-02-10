import api from "@/api/axios.js";

/**
 * ============================
 * 오늘 운영 Summary API
 * ============================
 */

export const getTodayOperationSummaryApi = ({ propertyCode } = {}) => {
    return api.get('/reservations/today/operations/summary', {
        params: {
            propertyCode: propertyCode ?? undefined,
        },
        skipLoading: true,
    })
}
