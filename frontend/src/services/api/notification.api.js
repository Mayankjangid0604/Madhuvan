import api from "./axiosInstance";

export const notificationAPI = {
  // Get all notifications (real-time data from various sources)
  getNotifications() {
    return api.get("/dashboard/summary");
  },

  // Get overdue alerts
  getOverdueAlerts() {
    return api.get("/dashboard/overdue-alerts");
  },

  // Get recent activities
  getRecentAdmissions(limit = 5) {
    return api.get("/dashboard/recent-admissions", { params: { limit } });
  },

  // Get recent checkouts
  getRecentCheckouts(limit = 5) {
    return api.get("/dashboard/recent-checkouts", { params: { limit } });
  }
};