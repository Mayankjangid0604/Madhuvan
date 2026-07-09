import React, { useEffect, useState, useMemo, useCallback, useRef } from "react";
import {
  AlertTriangle,
  Banknote,
  CheckCircle,
  AlertCircle,
  Clock,
  DollarSign,
  FileText,
  Home,
  Info,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  User,
  X,
  Hammer,
  ArrowRightLeft,
  Shield,
  ShieldOff,
  Check
} from "lucide-react";
import fineAPI from "../../services/api/fine.api";
import { feeAPI } from "../../services/api/fee.api"; // ✅ FIX: Import feeAPI instead of undefined 'api'
import "./FinePage.css";

// ============================================
// CONSTANTS
// ============================================
const FINE_TYPES = {
  FINE: "FINE",
  PROPERTY_DAMAGE: "PROPERTY_DAMAGE",
  MONEY_GIVEN: "MONEY_GIVEN",
};

const INITIAL_FORM_STATE = {
  student_id: "",
  amount: "",
  type: FINE_TYPES.FINE,
  note: "",
  cut_from_security: false,
};

// ============================================
// HELPER FUNCTIONS
// ============================================
const formatCurrency = (amount) => {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount || 0);
};

const formatDate = (dateString) => {
  if (!dateString) return "N/A";
  return new Date(dateString).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatTime = (dateString) => {
  if (!dateString) return "";
  return new Date(dateString).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getInitials = (name) => {
  if (!name) return "?";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
};

// ============================================
// SUB-COMPONENTS
// ============================================
const Toast = ({ toast, onClose }) => {
  if (!toast.show) return null;

  return (
    <div className={`toast-notification toast-${toast.type}`}>
      <div className="toast-icon">
        {toast.type === "success" && <CheckCircle size={20} />}
        {toast.type === "error" && <AlertCircle size={20} />}
        {toast.type === "warning" && <AlertTriangle size={20} />}
      </div>
      <span className="toast-message">{toast.message}</span>
      <button className="toast-close" onClick={onClose}>
        <X size={16} />
      </button>
    </div>
  );
};

import ConfirmModal from "../../components/modals/ConfirmModal";


const LoadingState = () => (
  <div className="loading-state">
    <div className="loading-spinner">
      <Loader2 size={48} className="spinning" />
    </div>
    <h3>Loading Data</h3>
    <p>Please wait while we fetch records...</p>
  </div>
);

const StatCard = ({ type, icon: Icon, label, value, subtitle }) => (
  <div className={`stat-card ${type}`}>
    <div className="stat-icon-wrapper">
      <Icon size={24} />
    </div>
    <div className="stat-content">
      <span className="stat-label">{label}</span>
      <span className="stat-value">{value}</span>
      {subtitle && <span className="stat-subtitle">{subtitle}</span>}
    </div>
  </div>
);

const TypeSelector = ({ value, onChange }) => {
  const types = [
    { id: FINE_TYPES.FINE, label: "Normal Fine", icon: AlertTriangle, className: "fine" },
    { id: FINE_TYPES.PROPERTY_DAMAGE, label: "Property Damage", icon: Hammer, className: "damage" },
    { id: FINE_TYPES.MONEY_GIVEN, label: "Money Given", icon: ArrowRightLeft, className: "money-given" },
  ];

  return (
    <div className="type-selector">
      {types.map((type) => {
        const Icon = type.icon;
        return (
          <button
            key={type.id}
            type="button"
            className={`type-option ${type.className} ${value === type.id ? "active" : ""}`}
            onClick={() => onChange(type.id)}
          >
            <Icon size={20} />
            <span>{type.label}</span>
          </button>
        );
      })}
    </div>
  );
};

const EmptyState = ({ message, submessage }) => (
  <div className="empty-state">
    <div className="empty-icon">
      <FileText size={40} />
    </div>
    <h4>{message}</h4>
    <p>{submessage}</p>
  </div>
);

const SecurityDeductionOption = ({
  checked,
  onChange,
  securityDeposit,
  damageAmount,
  disabled,
  entryType
}) => {
  const canDeduct = securityDeposit >= damageAmount && damageAmount > 0;

  const getLabel = () => {
    switch (entryType) {
      case FINE_TYPES.FINE:
        return "Deduct Fine from Security Deposit";
      case FINE_TYPES.MONEY_GIVEN:
        return "Deduct from Security Deposit";
      case FINE_TYPES.PROPERTY_DAMAGE:
      default:
        return "Deduct from Security Deposit";
    }
  };

  return (
    <div className={`security-option ${checked ? 'active' : ''} ${!canDeduct && damageAmount > 0 ? 'insufficient' : ''}`}>
      <label className="security-checkbox">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          disabled={disabled || !canDeduct}
        />
        <span className="checkbox-custom">
          {checked ? <ShieldOff size={16} /> : <Shield size={16} />}
        </span>
        <span className="checkbox-label">{getLabel()}</span>
      </label>
      <div className="security-info">
        <span className="security-amount">Available: {formatCurrency(securityDeposit)}</span>
        {!canDeduct && damageAmount > 0 && (
          <span className="security-warning">
            <AlertTriangle size={12} />
            Insufficient security deposit
          </span>
        )}
      </div>
    </div>
  );
};

// ============================================
// MAIN COMPONENT
// ============================================
const FinePage = () => {
  const [roomNo, setRoomNo] = useState("");
  const [students, setStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [filterType, setFilterType] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [form, setForm] = useState(INITIAL_FORM_STATE);
  const [toast, setToast] = useState({ show: false, type: "", message: "" });
  const [studentFees, setStudentFees] = useState([]);
  const [selectedFee, setSelectedFee] = useState(null);
  const [feeMessage, setFeeMessage] = useState("");
  const [securityDeposit, setSecurityDeposit] = useState(0);
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  const searchInputRef = useRef(null);

  useEffect(() => {
    if (toast.show) {
      const timer = setTimeout(() => {
        setToast({ show: false, type: "", message: "" });
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [toast.show]);

  const showToast = useCallback((type, message) => {
    setToast({ show: true, type, message });
  }, []);

  // Fetch students when room changes
  useEffect(() => {
    if (!roomNo) {
      setStudents([]);
      setForm((prev) => ({ ...prev, student_id: "" }));
      return;
    }

    const fetchStudents = async () => {
      setLoadingStudents(true);
      try {
        const res = await fineAPI.getStudentsByRoom(roomNo);
        setStudents(res.data.data || []);
      } catch (err) {
        console.error("Failed to fetch students:", err);
        setStudents([]);
      } finally {
        setLoadingStudents(false);
      }
    };

    const debounce = setTimeout(fetchStudents, 300);
    return () => clearTimeout(debounce);
  }, [roomNo]);

  // Fetch student fees when student changes
  useEffect(() => {
    const fetchStudentData = async () => {
      if (!form.student_id) {
        setStudentFees([]);
        setSelectedFee(null);
        setFeeMessage("");
        setSecurityDeposit(0);
        return;
      }

      try {
        // ✅ FIX: Use feeAPI instead of undefined 'api'
        const feesRes = await feeAPI.getAllFees({ student_id: form.student_id });

        const student = students.find(s => s.student_id.toString() === form.student_id.toString());
        setSecurityDeposit(Number(student?.security_deposit) || 0);

        if (!feesRes.data.success || !feesRes.data.data || feesRes.data.data.length === 0) {
          setStudentFees([]);
          setSelectedFee(null);
          setFeeMessage("⚠️ No fees generated. Fine will be stored as pending.");
          return;
        }

        const fees = feesRes.data.data || [];
        setStudentFees(fees);

        const today = new Date();
        const currentMonth = today.getMonth();
        const currentYear = today.getFullYear();

        let currentMonthFee = fees.find(fee => {
          if (!fee.fee_period_start) return false;
          const feeDate = new Date(fee.fee_period_start);
          return feeDate.getMonth() === currentMonth && feeDate.getFullYear() === currentYear;
        });

        if (!currentMonthFee) {
          currentMonthFee = fees.find(f => f.fee_status !== 'PAID');
        }

        const nextUnpaidFee = fees.find(fee => {
          return fee.fee_status !== 'PAID' && new Date(fee.fee_period_start) > today;
        });

        let targetFee = null;
        let message = "";

        if (currentMonthFee) {
          if (currentMonthFee.fee_status !== 'PAID') {
            targetFee = currentMonthFee;
            message = `✅ Will be added to ${formatDate(currentMonthFee.fee_period_start)} fee`;
          } else if (nextUnpaidFee) {
            targetFee = nextUnpaidFee;
            message = `✅ Will be added to ${formatDate(nextUnpaidFee.fee_period_start)} fee`;
          } else {
            message = `⚠️ All fees paid. Will be stored as pending.`;
          }
        } else if (fees.length > 0) {
          targetFee = fees.find(f => f.fee_status !== 'PAID') || null;
          message = targetFee
            ? `✅ Will be added to ${formatDate(targetFee.fee_period_start)} fee`
            : `⚠️ All fees paid. Will be stored as pending.`;
        }

        setSelectedFee(targetFee);
        setFeeMessage(message);

      } catch (err) {
        console.error("Failed to load student data:", err);
        setFeeMessage("❌ Failed to load fees");
        setStudentFees([]);
        setSelectedFee(null);
      }
    };

    fetchStudentData();
  }, [form.student_id, students]);

  // Fetch latest security deposit from backend
  useEffect(() => {
    const fetchSecurityDeposit = async () => {
      if (!form.student_id) {
        setSecurityDeposit(0);
        return;
      }

      try {
        const securityRes = await fineAPI.getStudentSecurity(form.student_id);
        if (securityRes.data.success && securityRes.data.data) {
          // Use remaining security (after any deductions)
          setSecurityDeposit(Number(securityRes.data.data.remaining_security) || 0);
        } else {
          const student = students.find(s => s.student_id.toString() === form.student_id.toString());
          setSecurityDeposit(Number(student?.security_deposit) || 0);
        }
      } catch (err) {
        console.error("Failed to fetch security deposit:", err);
        const student = students.find(s => s.student_id.toString() === form.student_id.toString());
        setSecurityDeposit(Number(student?.security_deposit) || 0);
      }
    };

    fetchSecurityDeposit();
  }, [form.student_id, students]);

  const fetchRecords = useCallback(async (isRefresh = false, search = "") => {
    try {
      if (!initialLoadDone) {
        setLoading(true);
      } else if (isRefresh) {
        setRefreshing(true);
      }

      const res = await fineAPI.getHistory({ search });
      const rawRecords = res.data?.data || [];

      const processedRecords = rawRecords.map((record, index) => {
        let displayType = "FINE";
        if (record.record_type === "money_given" || record.type === "Money Given") {
          displayType = "MONEY_GIVEN";
        } else if (record.record_type === "damage" || record.type === "Property Damage") {
          displayType = "PROPERTY_DAMAGE";
        }

        return {
          ...record,
          uniqueKey: `${record.record_type || record.type}-${record.record_id || record.id}-idx${index}`,
          displayType,
          displayDate: record.created_at,
          displayNote: record.description || record.note || "-",
        };
      });

      setRecords(processedRecords);

      if (!initialLoadDone) {
        setInitialLoadDone(true);
      }

      if (isRefresh) {
        showToast("success", "Records refreshed!");
      }
    } catch (err) {
      console.error("Failed to fetch records:", err);
      showToast("error", "Failed to fetch records");
      setRecords([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [showToast, initialLoadDone]);

  useEffect(() => {
    fetchRecords();
  }, []);

  useEffect(() => {
    if (!initialLoadDone) return;

    const timer = setTimeout(() => {
      fetchRecords(false, searchQuery);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery, initialLoadDone]);

  const handleFormChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const resetForm = useCallback(() => {
    setForm(INITIAL_FORM_STATE);
    setRoomNo("");
    setStudents([]);
    setStudentFees([]);
    setSelectedFee(null);
    setFeeMessage("");
    setSecurityDeposit(0);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.student_id) {
      showToast("error", "Please select a student");
      return;
    }

    if (!form.amount || parseFloat(form.amount) <= 0) {
      showToast("error", "Please enter a valid amount");
      return;
    }

    if (form.cut_from_security) {
      if (parseFloat(form.amount) > securityDeposit) {
        showToast("error", `Insufficient security. Available: ${formatCurrency(securityDeposit)}`);
        return;
      }
    }

    setSubmitting(true);

    try {
      const selectedStudent = students.find(s => s.student_id.toString() === form.student_id.toString());
      const studentName = selectedStudent?.student_name || `Student #${form.student_id}`;

      if (form.type === FINE_TYPES.MONEY_GIVEN) {
        await fineAPI.giveMoney({
          student_id: Number(form.student_id),
          amount: parseFloat(form.amount),
          note: form.note || "Money given to student",
          given_by: "Admin",
          cut_from_security: form.cut_from_security
        });

        if (form.cut_from_security) {
          showToast("success", `₹${form.amount} deducted from security and given to ${studentName}!`);
        } else {
          showToast("success", `₹${form.amount} given to ${studentName}!`);
        }

      } else if (form.type === FINE_TYPES.PROPERTY_DAMAGE) {
        await fineAPI.applyDamage({
          student_id: Number(form.student_id),
          amount: parseFloat(form.amount),
          description: form.note || "Property Damage",
          damage_type: form.cut_from_security ? "SECURITY_DEDUCTION" : "FEE_ADDITION",
          cut_from_security: form.cut_from_security
        });

        if (form.cut_from_security) {
          showToast("success", `₹${form.amount} deducted from security for damage!`);
        } else {
          showToast("success", `₹${form.amount} damage recorded!`);
        }

      } else {
        await fineAPI.applyFine({
          student_id: Number(form.student_id),
          fee_id: form.cut_from_security ? null : (selectedFee?.fee_id || null),
          amount: parseFloat(form.amount),
          reason: form.note || "Fine Applied",
          fine_type: "FINE",
          cut_from_security: form.cut_from_security
        });

        if (form.cut_from_security) {
          showToast("success", `₹${form.amount} fine deducted from security of ${studentName}!`);
        } else {
          showToast("success", `₹${form.amount} fine applied to ${studentName}!`);
        }
      }

      resetForm();
      setTimeout(() => fetchRecords(true), 500);

    } catch (err) {
      console.error("Submit error:", err);
      const errorMsg = err.response?.data?.message || "Failed to process request";
      showToast("error", errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  // Stats
  const stats = useMemo(() => {
    const fines = records.filter((r) => r.displayType === "FINE");
    const damages = records.filter((r) => r.displayType === "PROPERTY_DAMAGE");
    const moneyGiven = records.filter((r) => r.displayType === "MONEY_GIVEN");
    const pending = records.filter((r) => r.status === "PENDING");

    return {
      finesCount: fines.length,
      totalFines: fines.reduce((sum, r) => sum + parseFloat(r.amount || 0), 0),
      damagesCount: damages.length,
      totalDamages: damages.reduce((sum, r) => sum + parseFloat(r.amount || 0), 0),
      moneyGivenCount: moneyGiven.length,
      totalMoneyGiven: moneyGiven.reduce((sum, r) => sum + parseFloat(r.amount || 0), 0),
      pendingCount: pending.length,
    };
  }, [records]);

  // Filter
  const filteredRecords = useMemo(() => {
    if (filterType === "fines") return records.filter((r) => r.displayType === "FINE");
    if (filterType === "damages") return records.filter((r) => r.displayType === "PROPERTY_DAMAGE");
    if (filterType === "money") return records.filter((r) => r.displayType === "MONEY_GIVEN");
    return records;
  }, [records, filterType]);

  const selectedStudent = useMemo(() => {
    return students.find((s) => s.student_id.toString() === form.student_id);
  }, [students, form.student_id]);

  const showSecurityOption = selectedStudent && form.amount && parseFloat(form.amount) > 0;

  if (loading) {
    return (
      <div className="fine-page">
        <LoadingState />
      </div>
    );
  }

  return (
    <div className="fine-page">
      <Toast toast={toast} onClose={() => setToast({ show: false, type: "", message: "" })} />

      {/* Header */}
      <div className="page-header">
        <div className="header-content">
          <div className="header-icon">
            <AlertTriangle size={28} />
          </div>
          <div className="header-text">
            <h1>Fine & Damage Management</h1>
            <p>Apply fines, record damages, and track money given</p>
          </div>
        </div>
        <button
          className={`btn btn-refresh ${refreshing ? "spinning" : ""}`}
          onClick={() => fetchRecords(true)}
          disabled={refreshing}
        >
          <RefreshCw size={18} />
          <span>{refreshing ? "Refreshing..." : "Refresh"}</span>
        </button>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        <StatCard type="fines" icon={AlertTriangle} label="Total Fines" value={formatCurrency(stats.totalFines)} subtitle={`${stats.finesCount} fines`} />
        <StatCard type="damages" icon={Hammer} label="Property Damages" value={formatCurrency(stats.totalDamages)} subtitle={`${stats.damagesCount} damages`} />
        <StatCard type="money-given" icon={Banknote} label="Money Given" value={formatCurrency(stats.totalMoneyGiven)} subtitle={`${stats.moneyGivenCount} transactions`} />
        <StatCard type="pending" icon={Clock} label="Pending" value={stats.pendingCount} subtitle="Awaiting payment" />
      </div>

      {/* Main Grid */}
      <div className="fine-content-grid">
        {/* Form */}
        <div className="fine-form-card">
          <div className="form-header">
            <div className="form-header-icon"><Plus size={20} /></div>
            <div className="form-header-text">
              <h3>Add New Entry</h3>
              <p>Apply fine, record damage, or give money</p>
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-body">
              <div className="form-group">
                <label><FileText size={14} /> Entry Type <span className="required">*</span></label>
                <TypeSelector
                  value={form.type}
                  onChange={(value) => {
                    handleFormChange("type", value);
                    handleFormChange("cut_from_security", false);
                  }}
                />
              </div>

              <div className="form-group">
                <label><Home size={14} /> Room Number <span className="required">*</span></label>
                <input
                  type="text"
                  value={roomNo}
                  onChange={(e) => setRoomNo(e.target.value)}
                  placeholder="Enter room no."
                  className="form-input"
                  disabled={submitting}
                />
              </div>

              <div className="form-group">
                <label><User size={14} /> Student <span className="required">*</span></label>
                <select
                  value={form.student_id}
                  onChange={(e) => handleFormChange("student_id", e.target.value)}
                  className="form-input"
                  disabled={!roomNo || loadingStudents || submitting}
                >
                  <option value="">
                    {loadingStudents ? "Loading..." : !roomNo ? "Enter room first" : "Select student"}
                  </option>
                  {students.map((s) => (
                    <option key={s.student_id} value={s.student_id}>
                      {s.student_name} (Bed {s.bed_no})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label><DollarSign size={14} /> Amount <span className="required">*</span></label>
                <div className="amount-input-wrapper">
                  <span className="currency-symbol">₹</span>
                  <input
                    type="number"
                    value={form.amount}
                    onChange={(e) => handleFormChange("amount", e.target.value)}
                    placeholder="0"
                    className="form-input amount-input"
                    min="1"
                    disabled={submitting}
                  />
                </div>
              </div>

              {showSecurityOption && (
                <SecurityDeductionOption
                  checked={form.cut_from_security}
                  onChange={(checked) => handleFormChange("cut_from_security", checked)}
                  securityDeposit={securityDeposit}
                  damageAmount={parseFloat(form.amount) || 0}
                  disabled={submitting}
                  entryType={form.type}
                />
              )}

              <div className="form-group">
                <label><FileText size={14} /> Note / Reason</label>
                <textarea
                  value={form.note}
                  onChange={(e) => handleFormChange("note", e.target.value)}
                  placeholder="Enter reason..."
                  className="form-input"
                  rows={3}
                  disabled={submitting}
                />
              </div>

              {selectedStudent && form.type === FINE_TYPES.FINE && !form.cut_from_security && feeMessage && (
                <div className={`info-box ${selectedFee ? '' : 'warning'}`}>
                  <Info size={18} />
                  <p>{feeMessage}</p>
                </div>
              )}

              {selectedStudent && form.cut_from_security && form.amount && (
                <div className="info-box warning">
                  <ShieldOff size={18} />
                  <div>
                    <p><strong>{formatCurrency(form.amount)}</strong> will be deducted from security</p>
                    <p>Remaining: <strong>{formatCurrency(securityDeposit - parseFloat(form.amount))}</strong></p>
                  </div>
                </div>
              )}

              {selectedStudent && form.type === FINE_TYPES.MONEY_GIVEN && !form.cut_from_security && form.amount && (
                <div className="info-box money-given">
                  <Banknote size={18} />
                  <p><strong>{formatCurrency(form.amount)}</strong> will be given to {selectedStudent.student_name}</p>
                </div>
              )}
            </div>

            <div className="form-footer">
              <button
                type="submit"
                className={`btn submit-btn ${form.cut_from_security ? "btn-warning" :
                    form.type === FINE_TYPES.MONEY_GIVEN ? "btn-success" :
                      form.type === FINE_TYPES.PROPERTY_DAMAGE ? "btn-warning" : "btn-primary"
                  }`}
                disabled={submitting || !form.student_id || !form.amount}
              >
                {submitting ? (
                  <><Loader2 size={18} className="spinning" /><span>Processing...</span></>
                ) : form.cut_from_security ? (
                  <><ShieldOff size={18} /><span>Deduct from Security</span></>
                ) : (
                  <>
                    {form.type === FINE_TYPES.MONEY_GIVEN && <Banknote size={18} />}
                    {form.type === FINE_TYPES.PROPERTY_DAMAGE && <Hammer size={18} />}
                    {form.type === FINE_TYPES.FINE && <AlertTriangle size={18} />}
                    <span>
                      {form.type === FINE_TYPES.MONEY_GIVEN && "Record Money Given"}
                      {form.type === FINE_TYPES.PROPERTY_DAMAGE && "Record Damage"}
                      {form.type === FINE_TYPES.FINE && "Apply Fine"}
                    </span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* History */}
        <div className="history-container">
          <div className="history-header">
            <div className="history-header-left">
              <div className="history-icon"><FileText size={22} /></div>
              <div className="history-title">
                <h3>Recent Records</h3>
                <p>History of all transactions</p>
              </div>
            </div>

            <div className="history-filters">
              <div className="search-box">
                <Search size={16} />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search by name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="search-input"
                />
                {searchQuery && (
                  <button className="search-clear" onClick={() => { setSearchQuery(""); searchInputRef.current?.focus(); }}>
                    <X size={14} />
                  </button>
                )}
              </div>

              <button className={`filter-tab ${filterType === "all" ? "active" : ""}`} onClick={() => setFilterType("all")}>All ({records.length})</button>
              <button className={`filter-tab ${filterType === "fines" ? "active" : ""}`} onClick={() => setFilterType("fines")}><AlertTriangle size={14} /> Fines ({stats.finesCount})</button>
              <button className={`filter-tab ${filterType === "damages" ? "active" : ""}`} onClick={() => setFilterType("damages")}><Hammer size={14} /> Damages ({stats.damagesCount})</button>
              <button className={`filter-tab ${filterType === "money" ? "active" : ""}`} onClick={() => setFilterType("money")}><Banknote size={14} /> Given ({stats.moneyGivenCount})</button>
            </div>
          </div>

          <div className="table-wrapper">
            {filteredRecords.length === 0 ? (
              <EmptyState message="No Records Found" submessage={searchQuery ? `No results for "${searchQuery}"` : "Start by adding your first entry."} />
            ) : (
              <table className="fine-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Student</th>
                    <th>Type</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Note</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRecords.map((record) => {
                    const canCollect =
                      record.displayType !== "MONEY_GIVEN" &&
                      Number(record.deducted_from_security) !== 1 &&
                      !["COLLECTED", "DEDUCTED", "GIVEN"].includes(record.status);
                    return (
                    <tr key={record.uniqueKey}>
                      <td>
                        <div className="date-cell">
                          <span className="date-value">{formatDate(record.displayDate)}</span>
                          <span className="time-value">{formatTime(record.displayDate)}</span>
                        </div>
                      </td>
                      <td>
                        <div className="student-cell">
                          <div className="student-avatar">{getInitials(record.student_name)}</div>
                          <div className="student-info">
                            <span className="student-name">{record.student_name}</span>
                            {record.father_name && <span className="student-father">S/o {record.father_name}</span>}
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className={`type-badge ${record.displayType === "MONEY_GIVEN" ? "money-given" : record.displayType === "PROPERTY_DAMAGE" ? "damage" : "fine"}`}>
                          {record.displayType === "MONEY_GIVEN" && <><ArrowRightLeft size={12} /><span>Given</span></>}
                          {record.displayType === "PROPERTY_DAMAGE" && <><Hammer size={12} /><span>Damage</span></>}
                          {record.displayType === "FINE" && <><AlertTriangle size={12} /><span>Fine</span></>}
                        </span>
                      </td>
                      <td className="amount-cell">
                        <span className={`amount-value ${record.displayType === "MONEY_GIVEN" ? "money-given" : "fine"}`}>
                          {record.displayType === "MONEY_GIVEN" ? "-" : "+"}{formatCurrency(record.amount)}
                        </span>
                      </td>
                      <td>
                        <span className={`status-badge ${record.status === "COLLECTED" ? "collected" : record.status === "DEDUCTED" ? "deducted" : record.status === "GIVEN" ? "given" : record.status === "APPLIED" ? "added" : "pending"}`}>
                          {record.status === "COLLECTED" && <CheckCircle size={12} />}
                          {record.status === "DEDUCTED" && <ShieldOff size={12} />}
                          {record.status === "PENDING" && <Clock size={12} />}
                          {record.status === "GIVEN" && <CheckCircle size={12} />}
                          {record.status === "APPLIED" && <Plus size={12} />}
                          {record.status || "Pending"}
                        </span>
                      </td>
                      <td className="note-cell">
                        <span className="note-text" title={record.displayNote}>{record.displayNote}</span>
                      </td>
                      <td>
                        {canCollect ? (
                          <button
                            className="btn btn-success btn-sm"
                            style={{ padding: "6px 10px", fontSize: "12px", display: "inline-flex", alignItems: "center", gap: "4px" }}
                            onClick={async () => {
                              try {
                                await fineAPI.collectFine({
                                  record_type: record.type,
                                  record_id: record.record_id || record.id,
                                  payment_mode: "CASH"
                                });
                                showToast("success", `${formatCurrency(record.amount)} collected from ${record.student_name}`);
                                fetchRecords(true);
                              } catch (err) {
                                showToast("error", err.response?.data?.message || "Failed to collect");
                              }
                            }}
                          >
                            <Banknote size={12} />
                            Collect
                          </button>
                        ) : (
                          <span style={{ color: "#94a3b8", fontSize: "12px" }}>—</span>
                        )}
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {filteredRecords.length > 0 && (
            <div className="table-footer">
              <span className="showing-info">Showing <strong>{filteredRecords.length}</strong> of <strong>{records.length}</strong> records</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FinePage;