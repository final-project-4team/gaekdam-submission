import api from "@/api/axios.js";

export const getMembershipGradeList = async (params = {}) => {
  const res = await api.get("/membership-grade", { params });
  return res.data.data;
};

export const getMembershipGradeDetail = async (membershipGradeCode) => {
  const res = await api.get("/membership-grade/" + membershipGradeCode);
  return res.data.data;
};
export const createMembershipGrade = async (membershipGradeDetail) => {
  const res = await api.post("/membership-grade", membershipGradeDetail);
  return res.data.data;
};

export const updateMembershipGrade = async (membershipGradeCode, membershipGradeDetail) => {
  const res = await api.put("/membership-grade/" + membershipGradeCode, membershipGradeDetail);
  return res.data.data;
};

export const deleteMembershipGrade = async (membershipGradeCode) => {
  const res = await api.delete("/membership-grade/" + membershipGradeCode);
  return res.data.data;
};