// frontend/src/services/api/ledger.api.js
import api from "./axiosInstance";

export const ledgerAPI = {
  /**
   * Get all ledger entries
   * @param {Object} params - Filter params (from_date, to_date, entry_type, category)
   */
  getAllEntries(params = {}) {
    return api.get("/ledger", { params });
  },

  /**
   * Get student ledger
   */
  getStudentLedger(studentId) {
    return api.get(`/ledger/student/${studentId}`);
  },

  /**
   * Get overall summary
   */
  getOverallSummary(params = {}) {
    return api.get("/ledger/summary/overall", { params });
  },

  /**
   * Get student summary
   */
  getStudentSummary(studentId) {
    return api.get(`/ledger/summary/student/${studentId}`);
  },

  /**
   * Get category-wise summary
   */
  getCategorySummary(params = {}) {
    return api.get("/ledger/summary/categories", { params });
  },

  /**
   * Add manual expense entry
   */
  addExpense(data) {
    return api.post("/ledger/expense", data);
  },

  /**
   * Add manual income entry
   */
  addIncome(data) {
    return api.post("/ledger/income", data);
  },

  /**
   * Update ledger entry
   */
  updateEntry(id, data) {
    return api.put(`/ledger/${id}`, data);
  },

  /**
   * Delete ledger entry
   */
  deleteEntry(id) {
    return api.delete(`/ledger/${id}`);
  },

  /**
   * Export to CSV
   */
  exportCSV(params = {}) {
    return api.get("/ledger/export/csv", { 
      params,
      responseType: 'blob' 
    });
  },

  /**
   * ✅ FIX: Added missing getLedger function (used by Ledger.jsx fetchLedger)
   */
  getLedger(params = {}) {
    return api.get("/ledger", { params });
  },

  /**
   * ✅ FIX: Added missing addManualEntry function (used by Ledger.jsx handleAddManualEntry)
   */
  addManualEntry(data) {
    // Determine endpoint based on entry_type
    const endpoint = data.entry_type === 'income' ? '/ledger/income' : '/ledger/expense';
    return api.post(endpoint, data);
  },
};