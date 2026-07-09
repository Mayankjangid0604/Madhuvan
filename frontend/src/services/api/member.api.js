import api from "./axiosInstance";

export const memberAPI = {
  // ============================================
  // MEMBER CRUD
  // ============================================
  
  getAll(config = {}) {
    return api.get("/members", config);
  },

  getById(id, config = {}) {
    return api.get(`/members/${id}`, config);
  },

  getActive(config = {}) {
    return api.get("/members/active/list", config);
  },

  create(data) {
    return api.post("/members", data);
  },

  update(id, data) {
    return api.put(`/members/${id}`, data);
  },

  deactivate(id) {
    return api.delete(`/members/${id}`);
  },

  // ============================================
  // MEMBER TRANSACTIONS (FEE COLLECTION)
  // ============================================

  getTransactions(id, config = {}) {
    return api.get(`/members/${id}/transactions`, config);
  },

  getSummary(id, config = {}) {
    return api.get(`/members/${id}/summary`, config);
  },

  // ============================================
  // SALARY OPERATIONS
  // ============================================

  paySalary(memberId, data) {
    return api.post(`/members/${memberId}/salary`, data);
  },

  getSalaryHistory(memberId, config = {}) {
    return api.get(`/members/${memberId}/salary-history`, config);
  },

  getSalaryPayment(paymentId, config = {}) {
    return api.get(`/members/salary-payment/${paymentId}`, config);
  },

  deleteSalaryPayment(paymentId) {
    return api.delete(`/members/salary-payment/${paymentId}`);
  },

  getAllSalaryPayments(filters = {}) {
    const { signal, ...params } = filters;
    const queryParams = new URLSearchParams();
    if (params.month) queryParams.append('month', params.month);
    if (params.year) queryParams.append('year', params.year);
    if (params.member_id) queryParams.append('member_id', params.member_id);
    
    const queryString = queryParams.toString();
    return api.get(`/members/salary/all${queryString ? `?${queryString}` : ''}`, { signal });
  },

  getMemberSalaryStatus(memberId, month, year, config = {}) {
    const params = new URLSearchParams();
    if (month) params.append('month', month);
    if (year) params.append('year', year);
    
    const queryString = params.toString();
    return api.get(`/members/${memberId}/salary-status${queryString ? `?${queryString}` : ''}`, config);
  },

  // ============================================
  // MEMBER PHOTO UPLOAD
  // ============================================

  uploadPhoto(memberId, formData) {
    return api.post(`/members/${memberId}/photo`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
  }
};