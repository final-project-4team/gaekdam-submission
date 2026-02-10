import api from "@/api/axios.js";

// 비밀번호 변경
export const changePassword = async (data) => {
    const res = await api.patch("/employee/password", data);
    return res.data;
};
//비밀번호 리셋
//현재 비밀번호 데이터,바뀔 비밀번호 데이터도 필요 직원 코드 뿐만 아니라
export const resetPassword = (employeeCode) => {
    const res = api.patch("/employee/password-reset/" + employeeCode);
    return res.data;
};
//직원 상태 활성화
export const unlockEmployee = (employeeCode) => {
    return api.post("/employee/unlock/" + employeeCode);
};
