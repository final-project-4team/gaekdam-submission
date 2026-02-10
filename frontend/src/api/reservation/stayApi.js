import api from "@/api/axios";

/**
 * 체크인 등록
 */
export const checkinApi = (reservationCode) => {
    return api.post(`/stays/${reservationCode}/checkin`);
};

/**
 * 체크아웃 등록
 */
export const checkoutApi = (reservationCode) => {
    return api.post(`/stays/${reservationCode}/checkout`);
};
