import api from "./axiosInstance";

export const feeAPI = {
  // Get all fees (supports comprehensive mode)
  getAllFees(params = {}) {
    const { signal, ...queryParams } = params;
    return api.get("/fees", { params: queryParams, signal });
  },

  getAllFeesComprehensive(params = {}) {
    const { signal, ...queryParams } = params;
    return api.get("/fees", {
      params: { comprehensive: true, ...queryParams },
      signal
    });
  },

  getFeeById(id, config = {}) {
    return api.get(`/fees/${id}`, config);
  },

  createFee(data) {
    return api.post("/fees", data);
  },

  payFee(data) {
    return api.post("/fees/pay", data);
  },

  payAllFees(data) {
    return api.post("/fees/pay-all", data);
  },

  generateAllFees(data) {
    return api.post("/fees/generate-all", data);
  },

  updateFeeStatuses() {
    return api.post("/fees/update-statuses");
  },

  applyPenalties() {
    return api.post("/fees/apply-penalties");
  },

  getStudentFeeDetails(studentId, config = {}) {
    return api.get(`/fees/student/${studentId}/details`, config);
  },

  getStudentFeeSummary(studentId, config = {}) {
    return api.get(`/fees/student/${studentId}/summary`, config);
  },

  getPaymentByInvoice(invoiceNumber) {
    return api.get(`/fees/invoice/${invoiceNumber}`);
  },

  getAllPayments(params = {}) {
    const { signal, ...queryParams } = params;
    return api.get("/fees/payments", { params: queryParams, signal });
  },

  downloadInvoice(invoiceNumber) {
    return api.get(`/fees/invoice/${invoiceNumber}/download`, {
      responseType: 'blob'
    });
  },

  applyWaiver(data) {
    return api.post("/fees/apply-waiver", data);
  },

  getEarlyExitInvoice(studentId, exit_date) {
    return api.get(`/fees/student/${studentId}/early-exit`, { params: { exit_date } });
  }
};

export default feeAPI;