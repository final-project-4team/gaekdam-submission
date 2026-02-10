import api from '@/api/axios'

export const createReportLayout = (payload) =>
  api.post('/report/dashboard/layouts', payload)

export const deleteReportLayout = (id) =>
  api.delete(`/report/dashboard/layouts/${id}`)

export const listReportLayouts = (employeeCode) =>
  api.get('/report/dashboard/layouts', { params: { employeeCode } })

export const updateReportLayout = (id, payload) =>
  api.patch(`/report/dashboard/layouts/${id}`, payload)