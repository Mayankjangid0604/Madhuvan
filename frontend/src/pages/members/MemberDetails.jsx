import { useState, useEffect, useRef } from "react";
import { memberAPI } from "../../services/api/member.api";
import SalaryReceipt from "./SalaryReceipt";

const Icons = {
  close: "✕",
  edit: "✏️",
  delete: "🗑️",
  money: "💰",
  phone: "📱",
  calendar: "📅",
  father: "👨",
  id: "🪪",
  print: "🖨️",
  user: "👤"
};

const ID_TYPE_LABELS = {
  aadhar: "Aadhar Card",
  pan: "PAN Card",
  passport: "Passport",
  driving_license: "Driving License",
  voter_id: "Voter ID",
  other: "Other"
};

import ConfirmModal from "../../components/modals/ConfirmModal";


const MemberDetails = ({ member, onClose, onEdit, onPaySalary, onDelete, showToast }) => {
  const [activeTab, setActiveTab] = useState("info");
  const [transactions, setTransactions] = useState([]);
  const [salaryHistory, setSalaryHistory] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showReceipt, setShowReceipt] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);

  // ✅ FIX: Confirm dialog state for salary delete
  const [salaryDeleteConfirm, setSalaryDeleteConfirm] = useState({
    isOpen: false,
    paymentId: null
  });

  useEffect(() => {
    loadData();
  }, [member.member_id]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [txRes, sumRes, salaryRes] = await Promise.all([
        memberAPI.getTransactions(member.member_id),
        memberAPI.getSummary(member.member_id),
        memberAPI.getSalaryHistory(member.member_id)
      ]);
      setTransactions(txRes.data.data || []);
      setSummary(sumRes.data.data || {});
      setSalaryHistory(salaryRes.data.data || []);
    } catch (error) {
      showToast("Failed to load member details", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleViewReceipt = (payment) => {
    setSelectedPayment(payment);
    setShowReceipt(true);
  };

  // ✅ FIX: Use custom confirm dialog instead of window.confirm
  const handleDeleteSalary = (paymentId) => {
    setSalaryDeleteConfirm({
      isOpen: true,
      paymentId
    });
  };

  const executeDeleteSalary = async () => {
    try {
      await memberAPI.deleteSalaryPayment(salaryDeleteConfirm.paymentId);
      showToast("Salary payment deleted");
      setSalaryDeleteConfirm({ isOpen: false, paymentId: null });
      loadData();
    } catch (error) {
      showToast("Failed to delete salary payment", "error");
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric'
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency', currency: 'INR', minimumFractionDigits: 0
    }).format(amount || 0);
  };

  const calculateAge = (dob) => {
    if (!dob) return null;
    const today = new Date();
    const birthDate = new Date(dob);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) age--;
    return age;
  };

  const getInitials = (name) => {
    return name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || "??";
  };

  if (showReceipt && selectedPayment) {
    return (
      <SalaryReceipt
        payment={selectedPayment}
        member={member}
        onClose={() => setShowReceipt(false)}
      />
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container large" onClick={e => e.stopPropagation()}>
        {/* ✅ FIX: Custom Confirm Dialog */}
        <ConfirmModal
          isOpen={salaryDeleteConfirm.isOpen}
          title="Delete Salary Payment"
          message="Are you sure you want to delete this salary payment? This action cannot be undone."
          onConfirm={executeDeleteSalary}
          onCancel={() => setSalaryDeleteConfirm({ isOpen: false, paymentId: null })}
          type="danger"
        />

        {/* Header */}
        <div className="modal-header gradient">
          <div className="modal-header-content">
            <div className="modal-avatar">{getInitials(member.name)}</div>
            <div className="modal-header-info">
              <h3>{member.name}</h3>
              <p>{Icons.phone} {member.mobile || 'No mobile'}</p>
            </div>
          </div>
          <button className="modal-close light" onClick={onClose}>{Icons.close}</button>
        </div>

        {/* Tabs */}
        <div className="modal-tabs">
          <button className={`tab ${activeTab === "info" ? "active" : ""}`} onClick={() => setActiveTab("info")}>
            {Icons.user} Info
          </button>
          <button className={`tab ${activeTab === "salary" ? "active" : ""}`} onClick={() => setActiveTab("salary")}>
            {Icons.money} Manual Salary Payments
          </button>
          <button className={`tab ${activeTab === "transactions" ? "active" : ""}`} onClick={() => setActiveTab("transactions")}>
            📊 Fees Collected (counts as salary)
          </button>
        </div>

        {/* Body */}
        <div className="modal-body">
          {loading ? (
            <div className="loading-container">
              <div className="loading-spinner"></div>
              <p>Loading...</p>
            </div>
          ) : (
            <>
              {/* Info Tab */}
              {activeTab === "info" && (
                <div className="info-tab">
                  <div className="summary-grid">
                    <div className="summary-card highlight">
                      <div className="summary-value">{formatCurrency((summary?.total_fee_collected || 0) + (summary?.total_manual_paid || 0))}</div>
                      <div className="summary-label">Total Salary Paid</div>
                    </div>
                    <div className="summary-card">
                      <div className="summary-value">{formatCurrency(member.salary || 0)}</div>
                      <div className="summary-label">Monthly Salary</div>
                    </div>
                    <div className="summary-card">
                      <div className="summary-value">{summary?.salary_payment_count || 0}</div>
                      <div className="summary-label">Salary Payments</div>
                    </div>
                    <div className="summary-card" style={{ borderTop: '3px solid #f59e0b', background: '#fffbeb' }}>
                      <div className="summary-value" style={{ color: summary?.remaining_this_month > 0 ? '#d97706' : '#16a34a' }}>
                        {formatCurrency(summary?.remaining_this_month)}
                      </div>
                      <div className="summary-label">Remaining This Month</div>
                    </div>
                    {summary?.total_remaining_salary > 0 && (
                      <div className="summary-card" style={{ borderTop: '3px solid #ef4444', background: '#fef2f2' }}>
                        <div className="summary-value" style={{ color: '#dc2626' }}>
                          {formatCurrency(summary?.total_remaining_salary)}
                        </div>
                        <div className="summary-label">Total Salary Pending</div>
                      </div>
                    )}
                    {summary?.advance_paid > 0 && (
                      <div className="summary-card" style={{ borderTop: '3px solid #7c3aed', background: '#f5f3ff' }}>
                        <div className="summary-value" style={{ color: '#7c3aed' }}>
                          {formatCurrency(summary?.advance_paid)}
                        </div>
                        <div className="summary-label">Advance Given</div>
                      </div>
                    )}
                  </div>


                  <div className="info-grid">
                    <div className="info-item">
                      <div className="info-icon">{Icons.user}</div>
                      <div className="info-content">
                        <span className="info-label">Full Name</span>
                        <span className="info-value">{member.name || 'N/A'}</span>
                      </div>
                    </div>
                    <div className="info-item">
                      <div className="info-icon">{Icons.father}</div>
                      <div className="info-content">
                        <span className="info-label">Father's Name</span>
                        <span className="info-value">{member.father_name || 'N/A'}</span>
                      </div>
                    </div>
                    <div className="info-item">
                      <div className="info-icon">{Icons.phone}</div>
                      <div className="info-content">
                        <span className="info-label">Mobile</span>
                        <span className="info-value">{member.mobile || 'N/A'}</span>
                      </div>
                    </div>
                    <div className="info-item">
                      <div className="info-icon">{Icons.calendar}</div>
                      <div className="info-content">
                        <span className="info-label">Date of Birth</span>
                        <span className="info-value">
                          {member.dob ? `${formatDate(member.dob)} (${calculateAge(member.dob)} yrs)` : 'N/A'}
                        </span>
                      </div>
                    </div>
                    <div className="info-item">
                      <div className="info-icon">{Icons.calendar}</div>
                      <div className="info-content">
                        <span className="info-label">Date of Joining</span>
                        <span className="info-value">
                          {member.date_of_joining ? formatDate(member.date_of_joining) : 'N/A'}
                        </span>
                      </div>
                    </div>
                    <div className="info-item">
                      <div className="info-icon">{Icons.id}</div>
                      <div className="info-content">
                        <span className="info-label">{ID_TYPE_LABELS[member.id_type] || 'ID'}</span>
                        <span className="info-value">{member.id_number || 'N/A'}</span>
                      </div>
                    </div>
                    <div className="info-item" style={{ gridColumn: '1 / -1' }}>
                      <div className="info-icon">🏠</div>
                      <div className="info-content">
                        <span className="info-label">Address</span>
                        <span className="info-value">{member.address || 'N/A'}</span>
                      </div>
                    </div>
                    <div className="info-item">
                      <div className="info-icon">{Icons.money}</div>
                      <div className="info-content">
                        <span className="info-label">Last Salary Payment</span>
                        <span className="info-value">{summary?.last_salary_payment ? formatDate(summary.last_salary_payment) : 'Never'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Salary History Tab */}
              {activeTab === "salary" && (
                <div className="salary-tab">
                  {salaryHistory.length === 0 ? (
                    <div className="empty-state small">
                      <div className="empty-icon">{Icons.money}</div>
                      <h4>No salary payments</h4>
                      <p>Click "Pay Salary" to make the first payment</p>
                    </div>
                  ) : (
                    <div className="table-container">
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>Month/Year</th>
                            <th>Amount</th>
                            <th>Date</th>
                            <th>Mode</th>
                            <th>Receipt</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {salaryHistory.map(payment => (
                            <tr key={payment.payment_id}>
                              <td><strong>{payment.payment_month} {payment.payment_year}</strong></td>
                              <td className="amount">{formatCurrency(payment.amount)}</td>
                              <td>{formatDate(payment.payment_date)}</td>
                              <td>{payment.payment_mode}</td>
                              <td><code>{payment.receipt_number}</code></td>
                              <td>
                                <div className="table-actions">
                                  <button className="btn btn-sm btn-primary" onClick={() => handleViewReceipt(payment)}>
                                    {Icons.print}
                                  </button>
                                  <button className="btn btn-sm btn-danger" onClick={() => handleDeleteSalary(payment.payment_id)}>
                                    {Icons.delete}
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* Transactions Tab */}
              {activeTab === "transactions" && (
                <div className="transactions-tab">
                  {transactions.length === 0 ? (
                    <div className="empty-state small">
                      <div className="empty-icon">📊</div>
                      <h4>No fee collections</h4>
                      <p>This member hasn't collected any fees yet</p>
                    </div>
                  ) : (
                    <div className="table-container">
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>Date</th>
                            <th>Amount</th>
                            <th>Student</th>
                            <th>Reference</th>
                          </tr>
                        </thead>
                        <tbody>
                          {transactions.map(tx => (
                            <tr key={tx.id}>
                              <td>{formatDate(tx.created_at)}</td>
                              <td className="amount">{formatCurrency(tx.amount)}</td>
                              <td>
                                <div className="student-info">
                                  <span className="student-name">{tx.student_name}</span>
                                  {tx.father_name && <span className="student-parent">S/O {tx.father_name}</span>}
                                </div>
                              </td>
                              <td>{tx.reference_no || '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer Actions */}
        <div className="modal-footer">
          <button className="btn btn-danger" onClick={onDelete}>{Icons.delete} Delete</button>
          <div className="footer-right">
            <button className="btn btn-secondary" onClick={onEdit}>{Icons.edit} Edit</button>
            <button className="btn btn-success" onClick={onPaySalary}>{Icons.money} Pay Salary</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MemberDetails;