import api from "./axios.js";

export const hotelGroupList=async() =>{
  const res=await api.get("/hotel-group");
  return res.data.data.content;
}