import api from "./axiosInstance";

export const studentAPI = {
  createStudent(data) {
    return api.post("/students", data);
  },

  getStudents() {
    return api.get("/students");
  },

  getStudentById(id) {
    return api.get(`/students/${id}`);
  },

  updateStudent(id, data) {
    return api.put(`/students/${id}`, data);
  },

  uploadPhoto(id, formData) {
    return api.post(`/students/${id}/photo`, formData);
  },

  exitStudent(id) {
    return api.post(`/students/${id}/exit`);
  },

  deleteStudent(id) {
    return api.delete(`/students/${id}`);
  },

  // ✅ FIX: Uses soft delete since permanent delete route was removed from backend
  hardDeleteStudent(id) {
    return api.delete(`/students/${id}`);
  },
};