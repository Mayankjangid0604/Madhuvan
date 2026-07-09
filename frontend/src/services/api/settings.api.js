import api from "./axiosInstance";

export const settingsAPI = {
  getHostelInfo() {
    return api.get("/settings/hostel-info");
  },
  saveHostelInfo(formData) {
    return api.post("/settings/hostel-info", formData, {
      headers: { "Content-Type": "multipart/form-data" }
    });
  },
  getRules() {
    return api.get("/settings/rules");
  },
  // ✅ FIX: Send raw array instead of { rules } wrapper
  saveRules(rules) {
    return api.post("/settings/rules", rules);
  },
  getTemplates() {
    return api.get("/settings/templates");
  },
  saveEmailTemplate(data) {
    return api.post("/settings/templates/email", data);
  },
  saveSmsTemplate(data) {
    return api.post("/settings/templates/sms", data);
  },
  getEmailConfig() {
    return api.get("/settings/email-config");
  },
  saveEmailConfig(data) {
    return api.post("/settings/email-config", data);
  },
  getSmsConfig() {
    return api.get("/settings/sms-config");
  },
  saveSmsConfig(data) {
    return api.post("/settings/sms-config", data);
  },
  getDriveConfig() {
    return api.get("/settings/drive-config");
  },
  saveDriveConfig(data) {
    return api.post("/settings/drive-config", data);
  },
  getPenaltyConfig() {
    return api.get("/settings/penalty-config");
  },
  savePenaltyConfig(data) {
    return api.post("/settings/penalty-config", data);
  },
  uploadLogo(formData) {
    return api.post("/settings/upload-logo", formData, {
      headers: { "Content-Type": "multipart/form-data" }
    });
  }
};