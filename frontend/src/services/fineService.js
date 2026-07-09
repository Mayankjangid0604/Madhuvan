// frontend/src/services/fineService.js
import api from "./api/axiosInstance";

// Get students by room number
export const getStudentsByRoom = (roomNo) => {
  return api.get(`/fine/room/${roomNo}/students`);
};

// Get student security deposit
export const getStudentSecurity = (studentId) => {
  return api.get(`/fine/student/${studentId}/security`);
};

// Get fine history with optional search
export const getFineHistory = (search = "") => {
  const params = search ? { search } : {};
  return api.get("/fine/history", { params });
};

// Apply fine to student fee
export const applyFine = (data) => {
  return api.post("/fine/apply", data);
};

// Apply property damage (can deduct from security or add to fee)
export const applyPropertyDamage = (data) => {
  return api.post("/fine/property-damage", data);
};

// Record money given to student
export const giveMoneyToStudent = (data) => {
  return api.post("/fine/give-money", data);
};