import api from '@/api/axios'

/**
 * =================================================
 * 메시지 템플릿 설정 화면 (여정 기준 전체 조회)
 * GET /api/v1/message-templates/setting
 * =================================================
 */
export const getMessageTemplateSettingApi = () => {
    return api.get('/message-templates/setting')
}

/**
 * =================================================
 * 메시지 템플릿 목록 조회 (리스트 / 이력용)
 * GET /api/v1/message-templates
 * =================================================
 */
export const getMessageTemplateListApi = ({
                                              page = 1,
                                              size = 10,
                                              sort,
                                              search,
                                          }) => {
    return api.get('/message-templates', {
        params: {
            page,
            size,
            ...sort,
            ...search,
        },
    })
}

/**
 * =================================================
 * 메시지 템플릿 생성
 * POST /api/v1/message-templates
 * =================================================
 */
export const createMessageTemplateApi = ({
                                             stageCode,
                                             visitorType,
                                             languageCode,
                                             title,
                                             content,
                                             conditionExpr,
                                             isActive,
                                             membershipGradeCode,
                                         }) => {
    return api.post('/message-templates', {
        stageCode,
        visitorType,
        languageCode,
        title,
        content,
        conditionExpr,
        isActive,
        membershipGradeCode,
    })
}

/**
 * =================================================
 * 메시지 템플릿 수정
 * PUT /api/v1/message-templates/{templateCode}
 * =================================================
 */
export const updateMessageTemplateApi = (
    templateCode,
    {
        title,
        content,
        languageCode,
        isActive,
        conditionExpr,
    }
) => {
    return api.put(`/message-templates/${templateCode}`, {
        title,
        content,
        languageCode,
        isActive,
        conditionExpr,
    })
}



// 템플릿 상세조회
export const getMessageTemplateApi = (templateCode) => {
    return api.get(`/message-templates/${templateCode}`)
}


