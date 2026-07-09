import api from "./axiosInstance";

export const authAPI = {
  /**
   * Login
   * @param {{email: string, password: string}} credentials
   */
  login(credentials) {
    return api.post("/auth/login", credentials);
  },

  /**
   * Change Password
   * @param {{currentPassword: string, newPassword: string}} data
   */
  changePassword(data) {
    return api.post("/auth/change-password", data);
  },

  /**
   * Change Username (email)
   * @param {{currentPassword: string, newEmail: string}} data
   */
  changeUsername(data) {
    return api.post("/auth/change-username", data);
  },

  /**
   * Get Current Admin Info
   */
  getCurrentAdmin() {
    return api.get("/auth/me");
  },

  /**
   * Logout (client-side only)
   * Clears local storage and redirects
   */
  logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("isAuthenticated");
    window.location.hash = '#/login';
    return Promise.resolve();
  }
};