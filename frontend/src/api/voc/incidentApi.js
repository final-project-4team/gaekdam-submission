import api from "@/api/axios";

// 목록
export const getIncidentListApi = (params) => api.get("/incidents", { params });

// 상세
export const getIncidentDetailApi = (incidentCode) => api.get(`/incidents/${incidentCode}`);

// 등록
export const createIncidentApi = (payload) => api.post("/incidents", payload);

// 종결(조치 완료)
export const closeIncidentApi = (incidentCode) =>
    api.patch(`/incidents/${incidentCode}/close`);

// 조치 이력 목록
export const getIncidentActionsApi = (incidentCode) =>
    api.get(`/incidents/${incidentCode}/actions`);

// 조치 추가
export const createIncidentActionApi = (incidentCode, payload) =>
    api.post(`/incidents/${incidentCode}/actions`, payload);

// 직원 자동완성 검색
export const searchIncidentEmployeesApi = (params) =>
    api.get("/incidents/employees/search", { params });

