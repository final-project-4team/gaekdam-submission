import api from '@/api/axios'

export const getMessageSendHistoryApi = ({
                                             page = 1,
                                             size = 10,
                                             sort,
                                             search,
                                         }) => {
    return api.get('/message-send-histories', {
        params: {
            page,
            size,
            ...sort,
            ...search,
        },
    })
}

/**
 * 메시지 발송 이력 상세
 */
export const getMessageSendHistoryDetailApi = (sendCode) => {
    return api.get(`/message-send-histories/${sendCode}`)
}
