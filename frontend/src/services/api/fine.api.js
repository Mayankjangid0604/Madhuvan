import axiosInstance from "./axiosInstance";

export const fineAPI = {
  // Get students by room
  getStudentsByRoom: (roomNo) => axiosInstance.get(`/fine/room/${roomNo}/students`),
  
  // Get student security info
  getStudentSecurity: (studentId) => axiosInstance.get(`/fine/student/${studentId}/security`),
  
  // Get pending items for student
  getPendingItems: (studentId) => axiosInstance.get(`/fine/student/${studentId}/pending`),
  
  // Apply fine
  applyFine: (data) => axiosInstance.post("/fine/apply-fine", data),
  
  // Apply property damage
  applyDamage: (data) => axiosInstance.post("/fine/apply-damage", data),
  
  // Give money to student
  giveMoney: (data) => axiosInstance.post("/fine/give-money", data),
  
  // Get history
  getHistory: (params = {}) => axiosInstance.get("/fine/history", { params }),

  // Collect payment for a pending fine or damage
  collectFine: (data) => axiosInstance.post("/fine/collect", data)
};

export default fineAPI;