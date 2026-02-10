// src/api/report/templateWidgetsApi.js
import axios from '@/api/axios'

export const getTemplateWidgets = (templateId, period) =>
  axios.get(`/report/templates/${templateId}/widgets`, { params: { period } })
