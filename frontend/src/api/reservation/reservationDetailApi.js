import api from "@/api/axios";

/**
 * 예약 통합 상세 조회
 * GET /api/v1/reservations/detail/{reservationCode}
 */
export const getReservationDetailApi = (reservationCode, reason) => {
    return api.get(`/reservations/detail/${reservationCode}`, { params: { reason } });
};