import api from '@/api/axios'

/**
 * ============================
 * 체크인 등록 (Command)
 * POST /checkinout/checkin
 * ============================
 */
export const createCheckInApi = ({
                                     reservationCode,
                                     guestCount,
                                     recordedAt,
                                     recordChannel,
                                     settlementYn,
                                     carNumber,
                                 }) => {
    return api.post('/checkinout/checkin', {
        reservationCode,
        guestCount,
        recordedAt,
        recordChannel,
        settlementYn,
        carNumber,
    })
}

/**
 * ============================
 * 체크아웃 등록 (Command)
 * POST /checkinout/checkout
 * ============================
 */
export const createCheckOutApi = ({
                                      stayCode,
                                      guestCount,
                                      recordedAt,
                                      recordChannel,
                                      settlementYn,
                                      carNumber,
                                  }) => {
    return api.post('/checkinout/checkout', {
        stayCode,
        guestCount,
        recordedAt,
        recordChannel,
        settlementYn,
        carNumber,
    })
}