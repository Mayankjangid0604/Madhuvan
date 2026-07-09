// frontend/src/services/api/dashboard.api.js
import api from "./axiosInstance";

export const dashboardAPI = {
  getSummary() {
    return api.get("/dashboard/summary");
  },

  getMonthlyCollection() {
    return api.get("/dashboard/monthly-collection");
  },

  getRecentAdmissions(limit = 5) {
    return api.get(`/dashboard/recent-admissions?limit=${limit}`);
  },

  getRecentCheckouts(limit = 5) {
    return api.get(`/dashboard/recent-checkouts?limit=${limit}`);
  },

  getOverdueAlerts() {
    return api.get("/dashboard/overdue-alerts");
  },

  getRoomOccupancy() {
    return api.get("/dashboard/room-occupancy");
  }
};