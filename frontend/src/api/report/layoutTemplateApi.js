// src/api/report/layoutTemplateApi.js
import axios from '@/api/axios' // 혹은 프로젝트의 axios wrapper 경로

export const listLayoutTemplates = (layoutId) =>
  axios.get(`/report/dashboard/layouts/${layoutId}/templates`)

export const addLayoutTemplate = (layoutId, dto, employeeCode) =>
  axios.post(`/report/dashboard/layouts/${layoutId}/templates`, dto, { params: { employeeCode } })

export const updateLayoutTemplate = (layoutId, layoutTemplateId, dto) =>
  axios.patch(`/report/dashboard/layouts/${layoutId}/templates/${layoutTemplateId}`, dto)

export const deleteLayoutTemplate = (layoutId, layoutTemplateId) =>
  axios.delete(`/report/dashboard/layouts/${layoutId}/templates/${layoutTemplateId}`)

export const getTemplateWidgets = (templateId, period) => 
  axios.get(`/report/templates/${templateId}/widgets`, { params: { period } })