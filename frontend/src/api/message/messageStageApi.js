import api from '@/api/axios'


export const getMessageJourneyStagesApi = () => {
    return api.get('/message/journey-stages')
}