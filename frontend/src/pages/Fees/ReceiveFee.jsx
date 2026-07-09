import { useEffect, useState, useMemo, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { feeAPI } from "../../services/api/fee.api";
import { memberAPI } from "../../services/api/member.api";
import { getFileUrl } from "../../utils/imageSrc";
import {
  Search, X, IndianRupee, User, CreditCard, Receipt,
  CheckCircle, AlertCircle, Loader2,
  RefreshCw, Home, Wallet, Info, FileText,
  Banknote, CircleDollarSign, PiggyBank,
  Clock, AlertTriangle, Shield, Calendar
} from "lucide-react";
import FeeInvoiceModal from "../../components/fees/FeeInvoiceModal";
import "./receiveFee.css";

const ReceiveFee = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [autoPayHandled, setAutoPayHandled] = useState(false);

  // Data
  const [students, setStudents] = useState([]);
  const [members, setMembers] = useState([]);

  // UI
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expanded, setExpanded] = useState({});
  // eslint-disable-next-line no-unused-vars

  // Payment modal
  const [showPayModal, setShowPayModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [selectedFeeType, setSelectedFeeType] = useState("Monthly Rent");
  const [selectedFeeId, setSelectedFeeId] = useState(null);
  const [paymentData, setPaymentData] = useState({ amount: "", mode: "CASH", reference: "" });
  const [paying, setPaying] = useState(false);
  const [receivedBy, setReceivedBy] = useState("");

  // Invoice modal
  const [showInvoice, setShowInvoice] = useState(false);
  const [invoiceData, setInvoiceData] = useState(null);

  // Toast
  const [toast, setToast] = useState({ show: false, type: "", message: "" });

  // ── Toast Auto-dismiss ──
  useEffect(() => {
    if (toast.show) {
      const timer = setTimeout(() => setToast({ show: false, type: "", message: "" }), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast.show]);

  const showToast = useCallback((type, message) => {
    setToast({ show: true, type, message });
  }, []);

  // ── Types ──
  const rentTypes = useMemo(() => ['Monthly Rent', 'Half-Yearly Rent', 'Yearly Rent'], []);

  // ── Fetch Data ──
  const fetchData = useCallback(async (isRefresh = false) => {
    try {
      isRefresh ? setRefreshing(true) : setLoading(true);
      const res = await feeAPI.getAllFeesComprehensive();
      const data = res.data.data || [];

      const unique = [...new Map(data.map(s => [s.student_id, s])).values()];
      setStudents(unique);

      if (isRefresh) showToast("success", "Data refreshed successfully!");
    } catch (err) {
      console.error("Failed to load fee data:", err);
      showToast("error", "Failed to load fee data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchData();
    memberAPI.getActive()
      .then(res => setMembers(res.data.data || []))
      .catch(() => { });
  }, [fetchData]);

  // Handle autoPay from FeeDetails route state
  useEffect(() => {
    if (students.length > 0 && location.state?.autoPay && !autoPayHandled) {
      const targetStudent = students.find(s => s.student_id === location.state.studentId);
      if (targetStudent) {
        setSearchTerm(targetStudent.student_name);
        openPayModal(
          targetStudent, 
          location.state.feeType, 
          location.state.amountToPay, 
          location.state.feeId
        );
      }
      setAutoPayHandled(true);
      // Optional: replace state to avoid re-triggering on refresh
      window.history.replaceState({}, document.title);
    }
  }, [students, location.state, autoPayHandled]);

  // ── Helpers ──
  const formatCurrency = (amt) => `₹${(amt || 0).toLocaleString("en-IN")}`;
  const formatMonth = (d, feeType = 'Monthly Rent') => {
    if (!d) return "N/A";
    const date = new Date(d);
    const start = date.toLocaleDateString("en-IN", { month: "short", year: "numeric" });
    
    if (feeType === 'Half-Yearly Rent') {
      const endDate = new Date(date);
      endDate.setMonth(date.getMonth() + 5);
      const end = endDate.toLocaleDateString("en-IN", { month: "short", year: "numeric" });
      return `${start.split(' ')[0]} - ${end}`;
    }
    
    if (feeType === 'Yearly Rent') {
      const endDate = new Date(date);
      endDate.setMonth(date.getMonth() + 11);
      const end = endDate.toLocaleDateString("en-IN", { month: "short", year: "numeric" });
      return `${start.split(' ')[0]} - ${end}`;
    }

    return start;
  };

  const toNum = (v) => Number(v) || 0;

  // ── Get student fee breakdown (Issue 2 - Cards) ──
  const getStudentBreakdown = useCallback((student) => {
    const fees = student.fees || [];
    const otherTypes = ['Fine', 'Property Damage', 'Money Given'];
    const unpaidRentFees = fees.filter(f => (rentTypes.includes(f.fee_type) || otherTypes.includes(f.fee_type)) && f.remaining > 0);
    const unpaidSecurityFees = fees.filter(f => f.fee_type === 'Security Deposit' && f.remaining > 0);

    let totalMonthlyFee = 0;
    let totalPenalty = 0;
    let totalFine = 0;
    let totalPreviousDues = 0;
    let totalPropertyDamage = 0;
    let totalMoneyGiven = 0;

    unpaidRentFees.forEach(f => {
      if (rentTypes.includes(f.fee_type)) {
        totalMonthlyFee += toNum(f.final_amount);
        totalFine += toNum(f.fine_amount);
        totalPropertyDamage += toNum(f.property_damage_amount);
        totalMoneyGiven += toNum(f.money_given_amount);
      } else if (f.fee_type === 'Fine') {
        totalFine += toNum(f.remaining);
      } else if (f.fee_type === 'Property Damage') {
        totalPropertyDamage += toNum(f.remaining);
      } else if (f.fee_type === 'Money Given') {
        totalMoneyGiven += toNum(f.remaining);
      }
      totalPenalty += toNum(f.penalty_amount);
      totalPreviousDues += toNum(f.previous_dues);
    });

    // ✅ FIX: Also include PENDING fines/damages/money_given from records tables
    // These haven't been applied to a fee yet but should show in breakdown
    const pendingFines = toNum(student.pending_fines);
    const pendingDamages = toNum(student.pending_damages);
    const pendingMoneyGiven = toNum(student.pending_money_given);

    const totalAdvance = toNum(student.total_advance);
    const totalSecurityDue = unpaidSecurityFees.reduce((sum, f) => sum + toNum(f.remaining), 0);
    const totalRentRemaining = unpaidRentFees.reduce((sum, f) => sum + toNum(f.remaining), 0);

    return {
      monthlyFee: totalMonthlyFee,
      penalty: totalPenalty,
      fine: totalFine + pendingFines,
      previousDues: totalPreviousDues,
      propertyDamage: totalPropertyDamage + pendingDamages,
      moneyGiven: totalMoneyGiven + pendingMoneyGiven,
      advance: totalAdvance,
      securityDue: totalSecurityDue,
      rentRemaining: totalRentRemaining,
      pendingFines,
      pendingDamages,
      pendingMoneyGiven,
      unpaidRentFees,
      unpaidSecurityFees
    };
  }, []);

  // ── Stats ──
  const stats = useMemo(() => {
    const total = students.length;
    const pending = students.filter(s => s.total_remaining > 0).length;
    const paid = students.filter(s => s.total_remaining <= 0).length;
    const overdue = students.filter(s =>
      s.fees?.some(f => f.fee_status === "OVERDUE" && f.remaining > 0)
    ).length;
    const totalPending = students.reduce((sum, s) => sum + (s.total_remaining || 0), 0);
    const totalCollected = students.reduce((sum, s) => sum + (s.total_paid || 0), 0);
    const totalAdvance = students.reduce((sum, s) => sum + (s.total_advance || 0), 0);
    return { total, pending, paid, overdue, totalPending, totalCollected, totalAdvance };
  }, [students]);

  // ── Filter Students ──
  const filtered = useMemo(() => {
    return students
      .filter(s => {
        const search = searchTerm.toLowerCase();
        const matchSearch = !search ||
          s.student_name?.toLowerCase().includes(search) ||
          s.father_name?.toLowerCase().includes(search) ||
          s.student_id?.toString().includes(search) ||
          s.room_no?.toString().includes(search);

        const status = s.total_remaining <= 0
          ? "paid"
          : s.fees?.some(f => f.fee_status === "OVERDUE") ? "overdue" : "pending";

        const matchFilter = filterStatus === "all" || filterStatus === status;
        return matchSearch && matchFilter;
      })
      .sort((a, b) => a.student_id - b.student_id);
  }, [students, searchTerm, filterStatus]);

  // ── FIX ISSUE 3: Separate pay for Monthly Rent vs Security Deposit ──
  const openPayModal = (student, feeType = "Monthly Rent", specificAmount = null, specificFeeId = null) => {
    const breakdown = getStudentBreakdown(student);
    let targetAmount = specificAmount;

    if (targetAmount === null || targetAmount === undefined) {
      targetAmount = feeType === "Security Deposit"
        ? breakdown.securityDue
        : feeType === "ALL"
          ? student.total_remaining
          : breakdown.rentRemaining;
    }

    const isOnlineStudent = (student.payment_mode || 'cash').toLowerCase() === 'online';
    setSelectedStudent(student);
    setSelectedFeeType(feeType);
    setSelectedFeeId(specificFeeId);
    setPaymentData({
      amount: targetAmount > 0 ? Math.round(targetAmount).toString() : "",
      mode: isOnlineStudent ? "UPI" : "CASH",
      reference: ""
    });
    setReceivedBy("");
    setShowPayModal(true);
  };

  const handlePayment = async () => {
    const amount = parseFloat(paymentData.amount);
    if (!amount || amount <= 0) {
      return showToast("error", "Enter a valid amount");
    }
    if (paymentData.mode !== "CASH" && !receivedBy) {
      return showToast("error", "Select a receiving account");
    }

    // ✅ Snapshot breakdown BEFORE payment so invoice shows correct items
    const breakdownSnapshot = getStudentBreakdown(selectedStudent);

    try {
      setPaying(true);
      let res;

      if (selectedFeeType === "ALL") {
        // ✅ Use dedicated /pay-all endpoint: distributes across ALL unpaid fees (rent → security)
        res = await feeAPI.payAllFees({
          student_id: selectedStudent.student_id,
          payment_amount: amount,
          payment_mode: paymentData.mode,
          reference_no: paymentData.reference,
          received_by: "ADMIN",
          received_member_id: paymentData.mode !== "CASH" && receivedBy !== "ADMIN" ? receivedBy : null,
        });
      } else {
        res = await feeAPI.payFee({
          student_id: selectedStudent.student_id,
          payment_amount: amount,
          payment_mode: paymentData.mode,
          reference_no: paymentData.reference,
          received_by: "ADMIN",
          received_member_id: paymentData.mode !== "CASH" && receivedBy !== "ADMIN" ? receivedBy : null,
          fee_type: selectedFeeType,
          fee_id: selectedFeeId
        });
      }

      if (res.data.success) {
        const result = res.data.data;
        showToast("success", `₹${result.total_paid || amount} payment recorded successfully!`);
        setShowPayModal(false);

        if (result.invoice_number) {
          try {
            const invoiceRes = await feeAPI.getPaymentByInvoice(result.invoice_number);
            setInvoiceData({ payment: invoiceRes.data.data, student: selectedStudent, breakdown: breakdownSnapshot });
            setShowInvoice(true);
          } catch { /* Invoice fetch failed, payment still succeeded */ }
        }

        fetchData();
      }
    } catch (err) {
      showToast("error", err.response?.data?.message || "Payment failed");
    } finally {
      setPaying(false);
    }
  };

  const getStatus = (student) => {
    if (student.total_remaining <= 0) return { label: "PAID", color: "green" };
    if (student.fees?.some(f => f.fee_status === "OVERDUE")) return { label: "OVERDUE", color: "red" };
    return { label: "PENDING", color: "orange" };
  };

  // eslint-disable-next-line no-unused-vars
  const toggleExpand = (studentId) => {
    setExpanded(prev => ({ ...prev, [studentId]: !prev[studentId] }));
  };

  // ── Quick Pay Amounts ──
  const getQuickPayAmounts = (totalRemaining) => {
    return [...new Set([
      Math.round(totalRemaining),
      5000,
      2000,
      1000
    ])].filter(v => v > 0 && v <= totalRemaining);
  };

  // ── Loading ──
  if (loading) {
    return (
      <div className="receive-fee">
        <div className="loading-container">
          <div className="loading-spinner">
            <Loader2 size={36} className="spin" />
          </div>
          <h3>Loading Fee Data</h3>
          <p>Fetching student fee records...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="receive-fee">
      {/* ── Toast ── */}
      {toast.show && (
        <div className={`toast-banner ${toast.type}`}>
          {toast.type === "success" ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          <span>{toast.message}</span>
          <button className="close-btn" onClick={() => setToast({ show: false, type: "", message: "" })}>
            <X size={14} />
          </button>
        </div>
      )}

      {/* ── Header ── */}
      <div className="page-header">
        <div className="header-left">
          <div className="header-icon">
            <Wallet size={22} />
          </div>
          <div className="header-info">
            <h1>Fee Collection</h1>
            <p>Receive and manage student fee payments</p>
          </div>
        </div>
        <div className="header-actions">
          <button
            className={`refresh-btn ${refreshing ? "spinning" : ""}`}
            onClick={() => fetchData(true)}
            disabled={refreshing}
          >
            <RefreshCw size={16} />
            <span>{refreshing ? "Refreshing..." : "Refresh"}</span>
          </button>
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon stat-icon-blue">
            <User size={20} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{stats.total}</span>
            <span className="stat-label">Total Students</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon stat-icon-green">
            <CheckCircle size={20} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{formatCurrency(stats.totalCollected)}</span>
            <span className="stat-label">Collected</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon stat-icon-orange">
            <Clock size={20} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{formatCurrency(stats.totalPending)}</span>
            <span className="stat-label">Pending ({stats.pending})</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon stat-icon-red">
            <AlertTriangle size={20} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{stats.overdue}</span>
            <span className="stat-label">Overdue</span>
          </div>
        </div>
        {stats.totalAdvance > 0 && (
          <div className="stat-card">
            <div className="stat-icon stat-icon-purple">
              <PiggyBank size={20} />
            </div>
            <div className="stat-content">
              <span className="stat-value">{formatCurrency(stats.totalAdvance)}</span>
              <span className="stat-label">Advance</span>
            </div>
          </div>
        )}
      </div>

      {/* ── Filters ── */}
      <div className="filters-bar">
        <div className="search-wrapper">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            placeholder="Search by name, ID, room..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
          {searchTerm && (
            <button className="clear-search" onClick={() => setSearchTerm("")}>
              <X size={14} />
            </button>
          )}
        </div>
        <div className="filter-tabs">
          {["all", "pending", "overdue", "paid"].map(tab => (
            <button
              key={`tab-${tab}`}
              className={`filter-tab ${filterStatus === tab ? "active" : ""}`}
              onClick={() => setFilterStatus(tab)}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
              <span className="tab-count">
                {tab === "all" ? stats.total : stats[tab] || 0}
              </span>
            </button>
          ))}
        </div>
        <span className="results-count">
          Showing {filtered.length} of {students.length}
        </span>
      </div>

      {/* ── Student Cards ── */}
      {filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">
            <IndianRupee size={40} />
          </div>
          <h3>No Students Found</h3>
          <p>Try adjusting your search or filter criteria</p>
        </div>
      ) : (
        <div className="cards-grid">
          {filtered.map(student => {
            const status = getStatus(student);
            const isExpanded = expanded[student.student_id];
            const breakdown = getStudentBreakdown(student);

            return (
              <div key={`student-${student.student_id}`} className={`student-card status-${status.color}`}>
                {/* Card Header — not clickable anymore */}
                <div className="card-header">
                  <div className="student-info">
                    <div className={`student-avatar avatar-${status.color}`} style={{ overflow: 'hidden' }}>
                      {student.photo_url ? (
                        <img src={getFileUrl(student.photo_url)} alt={student.student_name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'inherit' }} onError={(e) => { e.target.onerror = null; e.target.style.display = 'none'; e.target.parentNode.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>'; }} />
                      ) : (
                        <User size={18} />
                      )}
                    </div>
                    <div className="student-details">
                      <h3 className="student-name">
                        {student.student_name}
                        {student.room_no && (
                          <span className="room-badge">
                            <Home size={11} /> {student.room_no}
                          </span>
                        )}
                      </h3>
                      <p className="student-meta">
                        D/O {student.father_name || "N/A"} &bull; ID: {student.student_id}
                      </p>
                    </div>
                  </div>
                  <div className="card-actions">
                    <span className={`status-badge badge-${status.color}`}>{status.label}</span>
                  </div>
                </div>

                {/* ── ISSUE 2: Breakdown Cards ── */}
                <div className="card-summary">
                  <div className="summary-item">
                    <span className="summary-label"><IndianRupee size={13} /> Total</span>
                    <strong className="summary-value">{formatCurrency(student.total_amount)}</strong>
                  </div>
                  <div className="summary-item text-green">
                    <span className="summary-label"><CheckCircle size={13} /> Paid</span>
                    <strong className="summary-value">{formatCurrency(student.total_paid)}</strong>
                  </div>
                  <div className={`summary-item ${student.total_remaining > 0 ? "text-orange" : "text-green"}`}>
                    <span className="summary-label"><Clock size={13} /> Remaining</span>
                    <strong className="summary-value">{formatCurrency(student.total_remaining)}</strong>
                  </div>
                  {student.total_advance > 0 && false && (
                    <div className="summary-item text-purple">
                      <span className="summary-label"><PiggyBank size={13} /> Advance</span>
                      <strong className="summary-value">{formatCurrency(student.total_advance)}</strong>
                    </div>
                  )}
                </div>

                {/* View Fee History link — replaces Pay All Remaining */}
                <div className="card-pay-section">
                  <button
                    className="pay-btn pay-btn-all"
                    style={{ width: '100%', background: 'linear-gradient(135deg, #1e40af, #2563eb)', color: '#fff', border: 'none', borderRadius: '10px', padding: '12px 16px', fontWeight: 700, fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                    onClick={(e) => { e.stopPropagation(); navigate(`/fees/student/${student.student_id}`); }}
                  >
                    <Receipt size={16} />
                    <span>View Fee History</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Payment Modal ── */}
      {showPayModal && selectedStudent && (
        <div className="modal-overlay" onClick={() => !paying && setShowPayModal(false)}>
          <div className="payment-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-row">
                <div className="modal-title-icon">
                  {selectedFeeType === "Security Deposit" ? <Shield size={20} /> : selectedFeeType === "ALL" ? <CreditCard size={20} /> : <CreditCard size={20} />}
                </div>
                <h3>
                  {selectedFeeType === "Security Deposit" ? "Receive Security Deposit" : selectedFeeType === "ALL" ? "Receive All Remaining" : `Receive ${selectedFeeType.replace(' Rent', '')} Fee`}
                </h3>
              </div>
              <button className="modal-close" onClick={() => !paying && setShowPayModal(false)}>
                <X size={20} />
              </button>
            </div>

            <div className="modal-body">
              {/* Student Info */}
              <div className="modal-student-card">
                <div className="modal-student-avatar">
                  <User size={22} />
                </div>
                <div className="modal-student-info">
                  <h4>{selectedStudent.student_name}</h4>
                  <p>D/O {selectedStudent.father_name || "N/A"} &bull; ID: {selectedStudent.student_id}</p>
                </div>
              </div>

              {/* Fee Type Badge */}
              <div className={`fee-type-badge ${selectedFeeType === "Security Deposit" ? "badge-security" : "badge-rent"}`}>
                {selectedFeeType === "Security Deposit" ? <Shield size={16} /> : <Calendar size={16} />}
                <span>{selectedFeeType}</span>
              </div>

              {/* Due Amount */}
              <div className="modal-due-banner">
                <span className="due-label">{selectedFeeType === "ALL" ? "Total" : selectedFeeType} Due</span>
                <strong className="due-amount">
                  {formatCurrency(
                    selectedFeeType === "Security Deposit"
                      ? getStudentBreakdown(selectedStudent).securityDue
                      : selectedFeeType === "ALL"
                        ? selectedStudent.total_remaining
                        : getStudentBreakdown(selectedStudent).rentRemaining
                  )}
                </strong>
              </div>

              {/* Quick Pay - only shown for specific fee types, not ALL */}
              {selectedFeeType !== "ALL" && (() => {
                const bd = getStudentBreakdown(selectedStudent);
                const targetAmount = selectedFeeType === "Security Deposit"
                  ? bd.securityDue
                  : bd.rentRemaining;
                const quickAmounts = getQuickPayAmounts(targetAmount);
                return quickAmounts.length > 1 ? (
                  <div className="quick-pay-section">
                    <span className="quick-pay-label">Quick Select:</span>
                    <div className="quick-pay-btns">
                      {quickAmounts.map((amt, idx) => (
                        <button
                          key={`qp-${idx}`}
                          className={`quick-pay-btn ${paymentData.amount === amt.toString() ? "active" : ""}`}
                          onClick={() => setPaymentData(p => ({ ...p, amount: amt.toString() }))}
                        >
                          {formatCurrency(amt)}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null;
              })()}

              {/* Form */}
              <div className="modal-form">
                <div className="form-group">
                  <label>Amount <span className="required">*</span></label>
                  <div className="currency-input-wrapper">
                    <span className="currency-symbol">₹</span>
                    <input
                      type="number"
                      className="form-input fee-amount-input"
                      value={paymentData.amount}
                      onChange={e => setPaymentData(p => ({ ...p, amount: e.target.value }))}
                      placeholder="Enter amount"
                      min="1"
                    />
                  </div>
                </div>

                <div className="form-row-2col">
                  <div className="form-group">
                    <label>Payment Mode <span className="required">*</span></label>
                    <select
                      className="form-input"
                      value={paymentData.mode}
                      onChange={e => setPaymentData(p => ({ ...p, mode: e.target.value }))}
                    >
                      {(selectedStudent?.payment_mode || 'cash').toLowerCase() !== 'online' && (
                        <option value="CASH">Cash</option>
                      )}
                      <option value="UPI">UPI</option>
                      <option value="BANK">Bank Transfer</option>
                      <option value="CHEQUE">Cheque</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Reference No.</label>
                    <input
                      type="text"
                      className="form-input"
                      value={paymentData.reference}
                      onChange={e => setPaymentData(p => ({ ...p, reference: e.target.value }))}
                      placeholder="Transaction ID"
                    />
                  </div>
                </div>

                {paymentData.mode !== "CASH" && (
                  <div className="form-group">
                    <label>Received In <span className="required">*</span></label>
                    <select
                      className="form-input"
                      value={receivedBy}
                      onChange={e => setReceivedBy(e.target.value)}
                    >
                      <option value="">Select Account</option>
                      <option value="ADMIN">Admin Account</option>
                      {members.map(m => (
                        <option key={`member-${m.member_id}`} value={m.member_id}>{m.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Advance Notice */}
                {(() => {
                  const breakdown = getStudentBreakdown(selectedStudent);
                  const targetAmount = selectedFeeType === "Security Deposit"
                    ? breakdown.securityDue
                    : selectedFeeType === "ALL"
                      ? selectedStudent.total_remaining
                      : breakdown.rentRemaining;
                  return parseFloat(paymentData.amount) > targetAmount ? (
                    <div className="advance-notice">
                      <div className="advance-icon">
                        <PiggyBank size={20} />
                      </div>
                      <div className="advance-content">
                        <strong>Advance Payment</strong>
                        <p>
                          ₹{(parseFloat(paymentData.amount) - targetAmount).toLocaleString("en-IN")}{" "}
                          will be saved as advance balance
                        </p>
                      </div>
                    </div>
                  ) : null;
                })()}
              </div>
            </div>

            <div className="modal-footer">
              <button className="cancel-btn" onClick={() => setShowPayModal(false)} disabled={paying}>
                Cancel
              </button>
              <button className="submit-btn" onClick={handlePayment} disabled={paying}>
                {paying ? (
                  <>
                    <Loader2 size={16} className="spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <CreditCard size={16} />
                    <span>Pay {formatCurrency(parseFloat(paymentData.amount) || 0)}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Invoice Modal ── */}
      {showInvoice && invoiceData && (
        <FeeInvoiceModal
          open={showInvoice}
          onClose={() => setShowInvoice(false)}
          payment={invoiceData.payment}
          student={invoiceData.student}
          breakdown={invoiceData.breakdown}
        />
      )}
    </div>
  );
};

export default ReceiveFee;