import api from '@/api/axios'

/**
 * ============================
 * 타임라인 전용 고객 검색
 * (투숙(stay) 이력 있는 고객만)
 * endpoint: /api/v1/timeline/customers
 * ============================
 */
export const getTimelineCustomerListApi = ({
                                               keyword,
                                           }) => {
    return api.get('/timeline/customers', {
        params: { keyword },
    })
}

/**
 * ============================
 * 고객 → 투숙 리스트 조회
 * endpoint: /api/v1/timeline/customers/{customerCode}/stays
 * ============================
 */
export const getCustomerStayListApi = ({
                                           customerCode,
                                       }) => {
    return api.get(`/timeline/customers/${customerCode}/stays`)
}

/**
 * ============================
 * 투숙 → 타임라인 조회
 * endpoint: /api/v1/timeline/stays/{stayCode}
 * ============================
 */
export const getStayTimelineApi = ({
                                       stayCode,
                                   }) => {
    return api.get(`/timeline/stays/${stayCode}`)
}
