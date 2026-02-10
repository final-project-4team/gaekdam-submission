import api from '@/api/axios'

/**
 * =================================================
 * 발신번호 목록 조회 (호텔그룹 기준)
 * GET /api/v1/message/sender-phones
 * =================================================
 */
export const getMessageSenderPhoneListApi = () => {
    return api.get('/message/sender-phones')
}

/**
 * =================================================
 * 발신번호 등록
 * POST /api/v1/message/sender-phones
 * =================================================
 */
export const createMessageSenderPhoneApi = ({
                                                phoneNumber,
                                                label,
                                            }) => {
    return api.post('/message/sender-phones', {
        phoneNumber,
        label,
    })
}

/**
 * =================================================
 * 발신번호 활성화 (대표 발신번호 설정)
 * POST /api/v1/message/sender-phones/{senderPhoneCode}/activate
 * =================================================
 */
export const activateMessageSenderPhoneApi = (senderPhoneCode) => {
    return api.post(`/message/sender-phones/${senderPhoneCode}/activate`)
}
