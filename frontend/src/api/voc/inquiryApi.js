import api from "@/api/axios";

// 문의 목록
export const getInquiryListApi = (params) => api.get("/inquiries", { params });

// 문의 상세
export const getInquiryDetailApi = (inquiryCode, params) =>
    api.get(`/inquiries/${inquiryCode}`, { params });

// 선택용(모달 검색) - 목록이랑 동일 endpoint지만 "용도"가 달라서 함수 분리
export const fetchInquiriesForSelect = (params) => api.get("/inquiries", { params });
