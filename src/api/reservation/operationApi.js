import api from '@/api/axios'

/**
 * ============================
 * [통합 운영보드] 정렬 컬럼 매핑
 * ============================
 * - OperationBoard (통합조회 전용)
 * - t alias 기준
 */
const OPERATION_SORT_KEY_MAP = {
    reservationNo: 'r.reservation_code',
    propertyName: 'p.property_name',
    customerName: 'c.customer_name_hash',
    roomType: 'rt.type_name',
    checkinDate: 'r.checkin_date',
    checkoutDate: 'r.checkout_date',
}

/**
 * ============================
 * 운영 보드 조회 API (통합 조회)
 * ============================
 * endpoint: /reservations/operations
 *
 * ✔ 정렬 가능
 * ✔ 필터 가능
 * ✔ summaryType = 조회 범위 개념
 */
export const getOperationBoardApi = ({
                                         page = 1,
                                         size = 10,
                                         filters = {},
                                         detail = {},
                                         sort = {},
                                         summaryType,
                                     }) => {
    return api.get('/reservations/operations', {
        params: {
            page,
            size,

            /* =====================
             * Summary
             * ===================== */
            summaryType: summaryType ?? undefined,

            /* =====================
             * Filters
             * ===================== */
            propertyCode:
                filters.propertyCode !== null && filters.propertyCode !== ''
                    ? filters.propertyCode
                    : undefined,

            status:
                filters.status !== null && filters.status !== ''
                    ? filters.status
                    : undefined,

            /* =====================
             * 전체검색 (핵심)
             * ===================== */
            keyword:
                detail.keyword && detail.keyword.trim() !== ''
                    ? detail.keyword
                    : undefined,

            /* =====================
             * 고객명 (해시 검색)
             * ===================== */
            customerName:
                detail.customerName && detail.customerName.trim() !== ''
                    ? detail.customerName
                    : undefined,

            /* =====================
             * 예약번호 (LIKE)
             * ===================== */
            reservationCode:
                detail.reservationCode != null && detail.reservationCode !== ''
                    ? detail.reservationCode
                    : undefined,

            /* =====================
             * Sort
             * ===================== */
            sortBy:
                sort.sortBy && OPERATION_SORT_KEY_MAP[sort.sortBy]
                    ? OPERATION_SORT_KEY_MAP[sort.sortBy]
                    : undefined,

            direction: sort.direction || undefined,
        },
        skipLoading: true,
    })
}

/**
 * ============================
 * 오늘 운영 리스트 API (체크인/아웃)
 * ============================
 * endpoint: /reservations/today/operations
 *
 * ✔ summaryType = todayOperationStatus
 * ✔ 정렬 (서버 고정)
 * ✔ ALL_TODAY → summaryType 미전송
 */

const TODAY_SORT_KEY_MAP = {
    reservationCode: 't.reservationCode',
    customerName: 't.customerNameHash',
    plannedCheckinDate: 't.plannedCheckinDate',
    plannedCheckoutDate: 't.plannedCheckoutDate',
}
export const getTodayOperationListApi = ({
                                             page = 1,
                                             size = 10,
                                             summaryType,
                                             propertyCode,
                                             sort = {},
                                             detail = {},
                                         }) => {
    return api.get('/reservations/today/operations', {
        params: {
            page,
            size,

            summaryType:
                summaryType && summaryType !== 'ALL_TODAY'
                    ? summaryType
                    : undefined,

            propertyCode: propertyCode ?? undefined,

            //  검색 (중요)
            customerName: detail.customerName || undefined,
            reservationCode: detail.reservationCode || undefined,

            // 정렬
            sortBy:
                sort.sortBy && TODAY_SORT_KEY_MAP[sort.sortBy]
                    ? TODAY_SORT_KEY_MAP[sort.sortBy]
                    : undefined,

            direction: sort.direction || undefined,
        },
    })
}