import api from "@/api/axios";

export const getMyPropertyApi = () => {
    return api.get("/property/me");
};

export const getPropertyListByHotelGroupApi = () => {
    return api.get('/property/by-hotel-group')
}