import api from '@/api/axios'

/**
 * DEMO 문자 발송
 * - templateCode는 서버에서 자동 선택
 * - senderPhoneCode는 필수
 */
export const sendDemoSmsApi = ({
                                   reservationCode,
                                   stageCode,
                                   senderPhoneCode,
                                   toPhone,
                               }) => {
    return api.post('/demo/sms/send', {
        reservationCode,
        stageCode,
        senderPhoneCode,
        toPhone,
    })
}
