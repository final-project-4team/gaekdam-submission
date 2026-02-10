import api from '@/api/axios'

/**
 * ============================
 * 부대시설 이용 내역 조회 (Query)
 * GET /api/v1/facility-usages
 * ============================
 */
export const getFacilityUsageListApi = ({
                                            page,
                                            size,
                                            sort,
                                            propertyCode,
                                            facilityCode,
                                            detail,
                                        }) => {
    return api.get('/facility-usages', {
        params: {
            // paging
            page,
            size,

            // sorting
            sortBy: sort?.sortBy ?? undefined,
            direction: sort?.direction ?? undefined,

            // filters
            propertyCode: propertyCode ?? undefined,
            facilityCode: facilityCode ?? undefined,

            // 검색
            customerName:
                detail?.customerName && detail.customerName.trim() !== ''
                    ? detail.customerName
                    : undefined,

            stayCodeLike:
                detail?.stayCode && detail.stayCode !== ''
                    ? detail.stayCode
                    : undefined,
        },
        skipLoading: true,
    })
}


/**
 * ============================
 * 오늘 부대시설 이용 Summary (카드)
 * GET /api/v1/facility-usages/today/summary
 * ============================
 */
export const getTodayFacilityUsageSummaryApi = ({ propertyCode } = {}) => {
    return api.get('/facility-usages/today/summary', {
        params: {
            propertyCode: propertyCode ?? undefined,
        },
    })
}
