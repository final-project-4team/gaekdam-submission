import api from '@/api/axios'

export const getDemoReservationApi = () => {
    return api.get('/demo/reservations/one')
}