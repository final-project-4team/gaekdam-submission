import api from '@/api/axios' // use project's axios instance

export async function listByHotelGroup(hotelGroupCode) {
  const res = await api.get('/report/kpi-targets', { params: { hotelGroupCode } })
  return res.data
}

export async function createTarget(dto) {
  // dto: { targetId, hotelGroupCode, kpiCode, periodType, periodValue, targetValue }
  const res = await api.post('/report/kpi-targets', dto)
  return res.data
}

export async function updateTarget(hotelGroupCode, targetId, dto) {
  const res = await api.patch(`/report/kpi-targets/${hotelGroupCode}/${targetId}`, dto)
  return res.data
}

export async function fetchTargets({ periodType, period }) {
  // This helper queries a different endpoint if implemented server-side. Keep for compatibility.
  const res = await api.get('/report/kpi-targets', { params: { periodType, period } })
  return res.data
}

export async function saveTargets(payload) {
  // payload: { periodType, period, targets: { kpiCode: value, ... } }
  const res = await api.post('/report/kpi-targets', payload)
  return res.data
}

export async function exportTemplate({ periodType }) {
  const res = await api.get('/report/kpi-targets/template', { params: { periodType }, responseType: 'blob' })
  return res.data
}

export async function importTargets(file, { periodType, period }) {
  const fd = new FormData()
  fd.append('file', file)
  fd.append('periodType', periodType)
  fd.append('period', period)
  const res = await api.post('/report/kpi-targets/import', fd, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
  return res.data
}

export async function listKpiCodes(){
  const res = await api.get('/report/kpi-codes')
  // unwrap ApiResponse wrapper used by backend:
  return res.data?.data ?? res.data ?? res
}

// 세팅 - 목표관리 엑셀 양식 다운받기
export async function downloadExcelTemplate({ hotelGroupCode, periodType, periodValue }) {
  const res = await api.get('/setting/objective/template', {
    params: { hotelGroupCode, periodType, periodValue },
    responseType: 'blob'
  });
  return res.data; // Blob
}

export function uploadExcelTemplate(formData) {
  return api.post('/setting/objective/template/import', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then(res => res.data);
}