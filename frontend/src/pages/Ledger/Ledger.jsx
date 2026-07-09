import { useEffect, useState, useMemo, useRef, Fragment } from "react";
import { ledgerAPI } from "../../services/api/ledger.api";
import DateInput from "../../components/common/DateInput";
import {
  Plus,
  Filter,
  Calendar,
  TrendingUp,
  TrendingDown,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  X,
  Search,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Loader2,
  Clock,
  Edit2,
  DollarSign,
  CreditCard,
  Receipt,
  Sparkles,
  Info,
  BarChart3,
  Printer,
  Eye,
  FileText,
  Building2
} from "lucide-react";
import { printElement } from "../../utils/printUtil";
import { printReceipt, printBill } from "../../utils/feeDocuments";
import { settingsAPI } from "../../services/api/settings.api";
import "./ledger.css";

const Ledger = () => {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showManualModal, setShowManualModal] = useState(false);
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");

  // Print ref
  const printRef = useRef();

  // Toast notification state
  const [toast, setToast] = useState({ show: false, type: '', message: '' });

  // Date presets
  const [activePreset, setActivePreset] = useState('month');

  // ✅ FIX: Format date as local YYYY-MM-DD (avoid UTC shift that pushes
  // IST/local dates back by one day when using toISOString())
  const toLocalDateStr = (date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  // Get current month's date range
  const getCurrentMonthRange = () => {
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    return {
      from_date: toLocalDateStr(startOfMonth),
      to_date: toLocalDateStr(endOfMonth)
    };
  };

  const [filters, setFilters] = useState(getCurrentMonthRange());
  const [hostelInfo, setHostelInfo] = useState({});
  const [copyChooser, setCopyChooser] = useState({ open: false, row: null });

  useEffect(() => {
    settingsAPI.getHostelInfo()
      .then((r) => { if (r.data?.success) setHostelInfo(r.data.data || {}); })
      .catch(() => {});
  }, []);

  const fetchLedgerDocNumber = async (type) => {
    try {
      const token = localStorage.getItem("token");
      const url = `${import.meta.env.VITE_API_BASE_URL}/doc-number/next?type=${type}`;
      const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      const j = await r.json();
      return j.data?.number;
    } catch { return null; }
  };

  const handlePrintLedgerRow = async (row) => {
    if (row.entry_type === 'income') {
      // Show copy chooser before printing receipt
      setCopyChooser({ open: true, row });
    } else {
      const bill_no = (await fetchLedgerDocNumber("bill")) || `BILL-LDG-${row.entry_id}`;
      printBill({ hostel: hostelInfo, entry: { ...row, entry_id: bill_no } });
    }
  };

  const doPrintLedgerReceipt = async (copies) => {
    const { row } = copyChooser;
    setCopyChooser({ open: false, row: null });
    if (!row) return;
    const receipt_no = (await fetchLedgerDocNumber("receipt")) || `RCPT-LDG-${row.entry_id}`;
    const paymentMode = (row.payment_mode || 'CASH').toUpperCase();
    printReceipt({
      hostel: hostelInfo,
      student: { student_name: row.description?.split(' - ')[0] || 'Received From', student_id: row.student_id || '-' },
      receipt_no,
      payment_date: row.entry_date,
      amount_received: row.amount,
      payment_mode: paymentMode,
      reference_no: row.reference_no,
      notes: row.description,
      total_amount: Number(row.amount) || 0,
      copies,
    });
  };


  // Initial state for manual entry
  const getInitialManualEntry = () => ({
    entry_date: new Date().toISOString().split('T')[0],
    entry_type: "expense",
    category: "",
    amount: "",
    payment_mode: "",
    reference_no: "",
    description: "",
    student_id: ""
  });

  const [manualEntry, setManualEntry] = useState(getInitialManualEntry());
  const [formErrors, setFormErrors] = useState({});

  // ✅ FIXED: Added missing resetManualEntry function
  const resetManualEntry = () => {
    setManualEntry(getInitialManualEntry());
    setFormErrors({});
  };

  // ✅ FIXED: Added handleCloseModal helper
  const handleCloseModal = () => {
    if (!modalLoading) {
      setShowManualModal(false);
      resetManualEntry();
    }
  };

  // Auto-dismiss toast
  useEffect(() => {
    if (toast.show) {
      const timer = setTimeout(() => {
        setToast({ show: false, type: '', message: '' });
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [toast.show]);

  const showToast = (type, message) => {
    setToast({ show: true, type, message });
  };

  // Date presets
  const datePresets = [
    {
      id: 'today',
      label: 'Today',
      getRange: () => {
        const today = toLocalDateStr(new Date());
        return { from_date: today, to_date: today };
      }
    },
    {
      id: 'week',
      label: 'This Week',
      getRange: () => {
        const today = new Date();
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay());
        return {
          from_date: toLocalDateStr(startOfWeek),
          to_date: toLocalDateStr(new Date())
        };
      }
    },
    {
      id: 'month',
      label: 'This Month',
      getRange: () => getCurrentMonthRange()
    },
    {
      id: 'lastMonth',
      label: 'Last Month',
      getRange: () => {
        const today = new Date();
        const startOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const endOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
        return {
          from_date: toLocalDateStr(startOfLastMonth),
          to_date: toLocalDateStr(endOfLastMonth)
        };
      }
    },
    {
      id: 'year',
      label: 'This Year',
      getRange: () => {
        const today = new Date();
        return {
          from_date: `${today.getFullYear()}-01-01`,
          to_date: toLocalDateStr(new Date())
        };
      }
    }
  ];

  useEffect(() => {
    // ✅ FIX: Reset modal states on mount to prevent blocking overlays
    setShowManualModal(false);
    setShowPrintPreview(false);

    fetchLedger();
  }, []);

  // Auto-refetch when preset filter changes
  useEffect(() => {
    if (!loading) {
      fetchLedger();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.from_date, filters.to_date]);

  const fetchLedger = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      const response = await ledgerAPI.getLedger(filters);
      setEntries(response.data.data || []);
      if (isRefresh) {
        showToast('success', 'Ledger refreshed successfully!');
      }
    } catch (err) {
      showToast('error', err.response?.data?.message || "Failed to fetch ledger");
      setEntries([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    fetchLedger(true);
  };

  const applyDatePreset = (presetId) => {
    const preset = datePresets.find(p => p.id === presetId);
    if (preset) {
      const range = preset.getRange();
      setFilters(range);
      setActivePreset(presetId);
    }
  };

  const clearFilters = () => {
    setFilters(getCurrentMonthRange());
    setActivePreset('month');
    setSearchTerm("");
    setFilterType("all");
  };

  const validateManualEntry = () => {
    const errors = {};
    if (!manualEntry.category) errors.category = "Category is required";
    if (!manualEntry.amount || parseFloat(manualEntry.amount) <= 0) {
      errors.amount = "Valid amount is required";
    }
    if (!manualEntry.description) errors.description = "Description is required";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // ✅ FIXED: Updated handleAddManualEntry with proper reset and refresh
  const handleAddManualEntry = async () => {
    if (!validateManualEntry()) return;

    try {
      setModalLoading(true);

      // Make API call
      await ledgerAPI.addManualEntry(manualEntry);

      // Close modal
      setShowManualModal(false);

      // Reset the form
      resetManualEntry();

      // Show success toast
      showToast('success', 'Manual entry added successfully!');

      // Refresh the ledger data
      await fetchLedger();

    } catch (err) {
      console.error('Error adding manual entry:', err);
      showToast('error', err.response?.data?.message || "Failed to add entry");
    } finally {
      setModalLoading(false);
    }
  };

  // Open Print Preview
  const handleOpenPrintPreview = () => {
    setShowPrintPreview(true);
  };

  // Actual Print Function
  const handlePrint = () => {
    const printContent = printRef.current;

    const printStyles = `
      @page { 
        size: A4 landscape; 
        margin: 15mm; 
      }
      * { 
        margin: 0; 
        padding: 0; 
        box-sizing: border-box; 
      }
      body { 
        font-family: 'Segoe UI', Arial, sans-serif; 
        font-size: 11px; 
        color: #333;
        line-height: 1.4;
      }
      .print-container {
        padding: 20px;
      }
      .print-header-content { 
        text-align: center; 
        margin-bottom: 20px; 
        padding-bottom: 15px; 
        border-bottom: 3px solid #1e40af; 
      }
      .print-header-content h1 { 
        font-size: 24px; 
        margin-bottom: 5px; 
        color: #1e3a8a;
      }
      .print-header-content p { 
        color: #64748b; 
        font-size: 12px; 
      }
      .print-logo {
        width: 60px;
        height: 60px;
        background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);
        border-radius: 12px;
        margin: 0 auto 12px;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .print-meta-info {
        display: flex;
        justify-content: space-between;
        margin-bottom: 15px;
        font-size: 10px;
        color: #64748b;
        padding: 8px 12px;
        background: #f8fafc;
        border-radius: 6px;
      }
      .print-period-box { 
        background: #f1f5f9; 
        padding: 12px 20px; 
        border-radius: 8px; 
        margin-bottom: 20px; 
        text-align: center;
        border-left: 4px solid #3b82f6;
      }
      .print-period-box strong {
        color: #1e40af;
      }
      .print-period-box .period-type {
        display: inline-block;
        margin-left: 10px;
        padding: 2px 10px;
        background: #3b82f6;
        color: white;
        border-radius: 12px;
        font-size: 11px;
      }
      .print-stats-grid { 
        display: flex; 
        justify-content: space-between; 
        margin-bottom: 20px; 
        gap: 15px;
      }
      .print-stat-box { 
        flex: 1;
        text-align: center; 
        padding: 15px;
        background: #f8fafc;
        border-radius: 8px;
        border: 1px solid #e2e8f0;
      }
      .print-stat-box .stat-label { 
        font-size: 10px; 
        color: #64748b; 
        text-transform: uppercase;
        letter-spacing: 0.5px;
        margin-bottom: 5px;
        display: block;
      }
      .print-stat-box .stat-value { 
        font-size: 18px; 
        font-weight: 700;
        display: block;
      }
      .print-stat-box.income { background: linear-gradient(135deg, #ecfdf5, #d1fae5); }
      .print-stat-box.income .stat-value { color: #059669; }
      .print-stat-box.expense { background: linear-gradient(135deg, #fef2f2, #fee2e2); }
      .print-stat-box.expense .stat-value { color: #dc2626; }
      .print-stat-box.balance { background: linear-gradient(135deg, #eff6ff, #dbeafe); }
      .print-stat-box.balance .stat-value { color: #2563eb; }
      .print-stat-box.count { background: linear-gradient(135deg, #f5f3ff, #ede9fe); }
      .print-stat-box.count .stat-value { color: #7c3aed; }
      .print-table-section { margin-bottom: 30px; }
      .print-table-section h4 {
        font-size: 14px;
        color: #1e3a8a;
        margin-bottom: 12px;
        padding-bottom: 8px;
        border-bottom: 2px solid #e2e8f0;
      }
      .print-table { 
        width: 100%; 
        border-collapse: collapse; 
        margin-top: 10px; 
        font-size: 10px;
      }
      .print-table th { 
        background: #1e40af; 
        color: white;
        padding: 10px 8px; 
        text-align: left; 
        font-weight: 600;
        font-size: 10px;
      }
      .print-table td { 
        border: 1px solid #e2e8f0; 
        padding: 8px; 
      }
      .print-table tbody tr:nth-child(even) { background-color: #f8fafc; }
      .print-table .income-row { background-color: #f0fdf4 !important; }
      .print-table .expense-row { background-color: #fef2f2 !important; }
      .print-table .month-header { background: #dbeafe !important; }
      .print-table .month-header td { border-color: #93c5fd; padding: 8px 12px; font-size: 12px; color: #1e40af; }
      .text-right { text-align: right; }
      .text-center { text-align: center; }
      .amount-credit { color: #059669; font-weight: 600; }
      .amount-debit { color: #dc2626; font-weight: 600; }
      .balance-positive { color: #059669; font-weight: 600; }
      .balance-negative { color: #dc2626; font-weight: 600; }
      .print-table tfoot tr { 
        background: #1e3a8a !important; 
      }
      .print-table tfoot td {
        color: white;
        border-color: #1e3a8a;
        padding: 12px 8px;
        font-weight: bold;
      }
      .print-table tfoot .amount-debit,
      .print-table tfoot .amount-credit,
      .print-table tfoot .balance-positive,
      .print-table tfoot .balance-negative {
        color: white;
      }
      .print-signatures { 
        display: flex; 
        justify-content: space-between; 
        margin-top: 50px; 
        padding-top: 20px;
      }
      .signature-block { 
        text-align: center; 
        flex: 1;
      }
      .signature-block .signature-line { 
        width: 150px;
        margin: 0 auto 10px;
        margin-top: 60px; 
        border-top: 1px solid #333; 
      }
      .signature-block span { 
        font-size: 11px; 
        color: #64748b; 
      }
      .print-footer-note {
        margin-top: 30px;
        padding: 15px;
        background: #f8fafc;
        border-radius: 8px;
        text-align: center;
        border: 1px dashed #cbd5e1;
      }
      .print-footer-note p {
        margin: 0;
        font-size: 10px;
        color: #64748b;
      }
      .print-footer-note p:first-child {
        margin-bottom: 4px;
      }
    `;

    printElement(printContent.innerHTML, `Ledger Report - ${getPeriodLabel()}`, printStyles);
  };

  const formatDateForPrint = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const getPeriodLabel = () => {
    if (activePreset) {
      const preset = datePresets.find(p => p.id === activePreset);
      return preset?.label || 'Custom Period';
    }
    return 'Custom Period';
  };

  // Calculate balance from oldest to newest
  const entriesWithBalance = useMemo(() => {
    const sortedEntries = [...entries].sort((a, b) =>
      new Date(a.entry_date) - new Date(b.entry_date)
    );

    let balance = 0;
    const calculated = sortedEntries.map(entry => {
      if (entry.entry_type === 'income') {
        balance += parseFloat(entry.amount);
      } else if (entry.entry_type === 'expense') {
        balance -= parseFloat(entry.amount);
      }
      return { ...entry, balance };
    });

    return calculated;
  }, [entries]);

  // Add monthly serial numbers (resets at start of each month)
  const entriesWithMonthlySerial = useMemo(() => {
    let currentMonth = null;
    let serialCounter = 0;

    return entriesWithBalance.map(entry => {
      const entryDate = new Date(entry.entry_date);
      const entryMonth = `${entryDate.getFullYear()}-${entryDate.getMonth()}`;

      if (entryMonth !== currentMonth) {
        currentMonth = entryMonth;
        serialCounter = 1;
      } else {
        serialCounter++;
      }

      return {
        ...entry,
        monthlySerial: serialCounter,
        monthYear: entryDate.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })
      };
    });
  }, [entriesWithBalance]);

  // Filter entries
  const filteredEntries = useMemo(() => {
    return entriesWithMonthlySerial.filter(entry => {
      const matchesSearch = !searchTerm ||
        entry.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.category?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesType = filterType === "all" || entry.entry_type === filterType;

      return matchesSearch && matchesType;
    });
  }, [entriesWithMonthlySerial, searchTerm, filterType]);

  // Calculate statistics
  const stats = useMemo(() => {
    const totalIncome = entriesWithBalance
      .filter(e => e.entry_type === 'income')
      .reduce((sum, e) => sum + parseFloat(e.amount), 0);

    const totalExpense = entriesWithBalance
      .filter(e => e.entry_type === 'expense')
      .reduce((sum, e) => sum + parseFloat(e.amount), 0);

    const currentBalance = entriesWithBalance.length > 0
      ? entriesWithBalance[entriesWithBalance.length - 1].balance
      : 0;

    return {
      totalIncome,
      totalExpense,
      currentBalance,
      totalTransactions: entriesWithBalance.length
    };
  }, [entriesWithBalance]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const getCategoryIcon = (category) => {
    const icons = {
      'hostel_fees': '🏠',
      'mess_fees': '🍽️',
      'maintenance': '🔧',
      'utilities': '💡',
      'electric_bill': '⚡',
      'salary': '👤',
      'supplies': '📦',
      'mess_supplies': '🍚',
      'hostel_supplies': '📦',
      'refund': '↩️',
      'miscellaneous': '📋',
      'other': '📌'
    };
    return icons[category] || '📋';
  };

  // Group entries by month for display
  const groupedByMonth = useMemo(() => {
    const groups = {};
    filteredEntries.forEach(entry => {
      const monthKey = entry.monthYear;
      if (!groups[monthKey]) {
        groups[monthKey] = [];
      }
      groups[monthKey].push(entry);
    });
    return groups;
  }, [filteredEntries]);

  const hasActiveFilters = searchTerm || filterType !== "all" ||
    (filters.from_date !== getCurrentMonthRange().from_date ||
      filters.to_date !== getCurrentMonthRange().to_date);

  // Loading State
  if (loading) {
    return (
      <div className="ledger-page">
        <div className="loading-state">
          <div className="loading-spinner">
            <Loader2 size={48} className="spinning" />
          </div>
          <h3>Loading Ledger</h3>
          <p>Please wait while we fetch your financial data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="ledger-page">
      {/* Toast Notification */}
      {toast.show && (
        <div className={`toast-notification toast-${toast.type}`}>
          <div className="toast-icon">
            {toast.type === 'success' && <CheckCircle size={20} />}
            {toast.type === 'error' && <AlertCircle size={20} />}
          </div>
          <span className="toast-message">{toast.message}</span>
          <button
            className="toast-close"
            onClick={() => setToast({ show: false, type: '', message: '' })}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Page Header */}
      <div className="page-header">
        <div className="header-content">
          <div className="header-icon">
            <BarChart3 size={28} />
          </div>
          <div className="header-text">
            <h1>Accounting Ledger</h1>
            <p>Track all income and expenses with running balance</p>
          </div>
        </div>
        <div className="header-actions">
          <button
            className={`btn btn-refresh ${refreshing ? 'spinning' : ''}`}
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw size={18} />
            <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>
          <button
            className="btn btn-print"
            onClick={handleOpenPrintPreview}
            disabled={filteredEntries.length === 0}
          >
            <Eye size={18} />
            <span>Print Preview</span>
          </button>
          <button
            className="btn btn-primary"
            onClick={() => {
              setManualEntry({ ...getInitialManualEntry(), entry_type: 'expense' });
              setShowManualModal(true);
            }}
          >
            <Plus size={18} />
            <span>Add Expense</span>
          </button>
        </div>
      </div>

      {/* Current Period Display */}
      <div className="current-period-banner">
        <Calendar size={18} />
        <span>
          Showing data for: <strong>{getPeriodLabel()}</strong>
          {filters.from_date && filters.to_date && (
            <span className="period-dates">
              ({formatDateForPrint(filters.from_date)} - {formatDateForPrint(filters.to_date)})
            </span>
          )}
        </span>
      </div>

      {/* Statistics Cards */}
      <div className="stats-grid">
        <div className="stat-card income">
          <div className="stat-icon-wrapper">
            <TrendingUp size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-label">Total Income</span>
            <span className="stat-value">{formatCurrency(stats.totalIncome)}</span>
          </div>
          <div className="stat-indicator positive">
            <ArrowUpRight size={16} />
          </div>
        </div>

        <div className="stat-card expense">
          <div className="stat-icon-wrapper">
            <TrendingDown size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-label">Total Expenses</span>
            <span className="stat-value">{formatCurrency(stats.totalExpense)}</span>
          </div>
          <div className="stat-indicator negative">
            <ArrowDownRight size={16} />
          </div>
        </div>

        <div className="stat-card balance">
          <div className="stat-icon-wrapper">
            <Wallet size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-label">Net Balance</span>
            <span className={`stat-value ${stats.currentBalance >= 0 ? 'positive' : 'negative'}`}>
              {formatCurrency(stats.currentBalance)}
            </span>
          </div>
        </div>

        <div className="stat-card transactions">
          <div className="stat-icon-wrapper">
            <Receipt size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-label">Transactions</span>
            <span className="stat-value">{stats.totalTransactions}</span>
          </div>
        </div>
      </div>

      {/* Filters Section */}
      <div className="filters-section glass-card">
        <div className="filters-header">
          <div className="filters-title">
            <Filter size={18} />
            <span>Filters</span>
            {hasActiveFilters && (
              <span className="active-count">Custom</span>
            )}
          </div>
          {hasActiveFilters && (
            <button className="clear-btn" onClick={clearFilters}>
              <X size={14} />
              <span>Reset to Current Month</span>
            </button>
          )}
        </div>

        {/* Date Presets */}
        <div className="date-presets">
          {datePresets.map(preset => (
            <button
              key={preset.id}
              className={`preset-btn ${activePreset === preset.id ? 'active' : ''}`}
              onClick={() => applyDatePreset(preset.id)}
            >
              <Clock size={14} />
              <span>{preset.label}</span>
            </button>
          ))}
        </div>

        {/* Filter Controls */}
        <div className="filters-content">
          <div className="search-wrapper">
            <Search size={18} />
            <input
              type="text"
              placeholder="Search by description or category..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
            {searchTerm && (
              <button className="search-clear" onClick={() => setSearchTerm("")}>
                <X size={16} />
              </button>
            )}
          </div>

          <div className="filter-group">
            <label>
              <Calendar size={14} />
              From Date
            </label>
            <DateInput
              value={filters.from_date}
              onChange={(val) => {
                setFilters({ ...filters, from_date: val });
                setActivePreset(null);
              }}
              className="date-input"
            />
          </div>

          <div className="filter-group">
            <label>
              <Calendar size={14} />
              To Date
            </label>
            <DateInput
              value={filters.to_date}
              onChange={(val) => {
                setFilters({ ...filters, to_date: val });
                setActivePreset(null);
              }}
              className="date-input"
            />
          </div>

          <div className="filter-group">
            <label>
              <DollarSign size={14} />
              Type
            </label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="type-select"
            >
              <option value="all">All Types</option>
              <option value="income">Income Only</option>
              <option value="expense">Expense Only</option>
            </select>
          </div>

          <button
            className="apply-btn"
            onClick={() => fetchLedger()}
          >
            <Filter size={16} />
            <span>Apply</span>
          </button>
        </div>

        {/* Results count */}
        <div className="filters-footer">
          <span className="results-count">
            Showing <strong>{filteredEntries.length}</strong> of <strong>{entriesWithBalance.length}</strong> entries
          </span>
        </div>
      </div>

      {/* Ledger Table */}
      <div className="table-container glass-card">
        <div className="table-header">
          <h3>
            <Receipt size={20} />
            Transaction History
          </h3>
          <div className="table-header-right">
            <span className="table-info">
              Serial resets monthly • Sorted by date
            </span>
          </div>
        </div>

        <div className="table-wrapper">
          <table className="ledger-table">
            <thead>
              <tr>
                <th>S.No</th>
                <th>Date</th>
                <th>Category</th>
                <th>Description</th>
                <th>Payment</th>
                <th className="debit-col">Debit</th>
                <th className="credit-col">Credit</th>
                <th className="balance-col">Balance</th>
                <th>Print</th>
              </tr>
            </thead>

            <tbody>
              {filteredEntries.length === 0 ? (
                <tr className="empty-row">
                  <td colSpan="9">
                    <div className="empty-state">
                      <Receipt size={48} />
                      <h4>No Entries Found</h4>
                      <p>
                        {hasActiveFilters
                          ? "No entries match your current filters."
                          : "No transactions for the current month."}
                      </p>
                      {hasActiveFilters && (
                        <button className="btn btn-secondary" onClick={clearFilters}>
                          Reset to Current Month
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                Object.entries(groupedByMonth).map(([monthYear, monthEntries]) => (
                  <Fragment key={monthYear}>
                    {/* Month Separator Row */}
                    <tr className="month-separator-row">
                      <td colSpan="9">
                        <div className="month-separator">
                          <Calendar size={14} />
                          <span>{monthYear}</span>
                          <span className="month-count">({monthEntries.length} entries)</span>
                        </div>
                      </td>
                    </tr>

                    {/* Month Entries */}
                    {monthEntries.map((row) => (
                      <tr key={row.entry_id} className={row.entry_type}>
                        <td className="seq-cell">
                          <span className="serial-badge">{row.monthlySerial}</span>
                        </td>
                        <td className="date-cell">
                          <span className="date-value">
                            {new Date(row.entry_date).toLocaleDateString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric'
                            })}
                          </span>
                        </td>
                        <td className="category-cell">
                          <div className="category-badge">
                            <span className="category-icon">{getCategoryIcon(row.category)}</span>
                            <span className="category-name">
                              {row.category?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Other'}
                            </span>
                          </div>
                        </td>
                        <td className="description-cell">
                          <span className="description-text">{row.description || '-'}</span>
                          {row.reference_no && (
                            <span className="reference-tag">Ref: {row.reference_no}</span>
                          )}
                        </td>
                        <td className="payment-cell">
                          <span className={`payment-badge ${row.payment_mode || 'auto'}`}>
                            {row.payment_mode?.toUpperCase() || 'AUTO'}
                          </span>
                        </td>
                        <td className="debit-cell">
                          {row.entry_type === "expense" ? (
                            <span className="amount debit">
                              <ArrowDownRight size={14} />
                              {formatCurrency(row.amount)}
                            </span>
                          ) : (
                            <span className="empty-amount">-</span>
                          )}
                        </td>
                        <td className="credit-cell">
                          {row.entry_type === "income" ? (
                            <span className="amount credit">
                              <ArrowUpRight size={14} />
                              {formatCurrency(row.amount)}
                            </span>
                          ) : (
                            <span className="empty-amount">-</span>
                          )}
                        </td>
                        <td className="balance-cell">
                          <span className={`balance-amount ${row.balance >= 0 ? 'positive' : 'negative'}`}>
                            {formatCurrency(row.balance)}
                          </span>
                        </td>
                        <td>
                          <button
                            title={row.entry_type === 'income' ? 'Print Receipt' : 'Print Bill'}
                            onClick={() => handlePrintLedgerRow(row)}
                            style={{
                              background: row.entry_type === 'income' ? '#059669' : '#dc2626',
                              color: '#fff', border: 'none', padding: '5px 10px',
                              borderRadius: '6px', cursor: 'pointer',
                              display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px'
                            }}
                          >
                            <Printer size={12} />
                            {row.entry_type === 'income' ? 'Receipt' : 'Bill'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </Fragment>
                ))
              )}
            </tbody>

            {filteredEntries.length > 0 && (
              <tfoot>
                <tr className="totals-row">
                  <td colSpan="5" className="totals-label">Period Totals</td>
                  <td className="debit-cell">
                    <span className="total-amount debit">
                      {formatCurrency(stats.totalExpense)}
                    </span>
                  </td>
                  <td className="credit-cell">
                    <span className="total-amount credit">
                      {formatCurrency(stats.totalIncome)}
                    </span>
                  </td>
                  <td className="balance-cell">
                    <span className={`total-balance ${stats.currentBalance >= 0 ? 'positive' : 'negative'}`}>
                      {formatCurrency(stats.currentBalance)}
                    </span>
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Print Preview Modal */}
      {showPrintPreview && (
        <div className="modal-overlay print-preview-overlay" onClick={() => setShowPrintPreview(false)}>
          <div className="print-preview-modal" onClick={(e) => e.stopPropagation()}>
            {/* Preview Header */}
            <div className="preview-header">
              <div className="preview-title">
                <FileText size={24} />
                <div>
                  <h3>Print Preview</h3>
                  <p>Review before printing</p>
                </div>
              </div>
              <div className="preview-actions">
                <button className="btn btn-secondary" onClick={() => setShowPrintPreview(false)}>
                  <X size={18} />
                  <span>Close</span>
                </button>
                <button className="btn btn-print-action" onClick={handlePrint}>
                  <Printer size={18} />
                  <span>Print Now</span>
                </button>
              </div>
            </div>

            {/* Preview Content */}
            <div className="preview-content">
              <div className="preview-paper" ref={printRef}>
                <div className="print-container">
                  {/* Print Header */}
                  <div className="print-header-content">
                    <div className="print-logo">
                      <Building2 size={40} color="white" />
                    </div>
                    <h1>Accounting Ledger Report</h1>
                    <p>Financial Transaction Statement</p>
                  </div>

                  {/* Print Meta */}
                  <div className="print-meta-info">
                    <span>Generated on: {new Date().toLocaleString('en-IN')}</span>
                    <span>Report ID: LDG-{Date.now().toString().slice(-8)}</span>
                  </div>

                  {/* Period Info */}
                  <div className="print-period-box">
                    <strong>Reporting Period:</strong> {formatDateForPrint(filters.from_date)} to {formatDateForPrint(filters.to_date)}
                    <span className="period-type">({getPeriodLabel()})</span>
                  </div>

                  {/* Statistics Summary */}
                  <div className="print-stats-grid">
                    <div className="print-stat-box income">
                      <span className="stat-label">Total Income</span>
                      <span className="stat-value">{formatCurrency(stats.totalIncome)}</span>
                    </div>
                    <div className="print-stat-box expense">
                      <span className="stat-label">Total Expenses</span>
                      <span className="stat-value">{formatCurrency(stats.totalExpense)}</span>
                    </div>
                    <div className="print-stat-box balance">
                      <span className="stat-label">Net Balance</span>
                      <span className="stat-value">{formatCurrency(stats.currentBalance)}</span>
                    </div>
                    <div className="print-stat-box count">
                      <span className="stat-label">Total Entries</span>
                      <span className="stat-value">{stats.totalTransactions}</span>
                    </div>
                  </div>

                  {/* Transaction Table */}
                  <div className="print-table-section">
                    <h4>Transaction Details</h4>
                    <table className="print-table">
                      <thead>
                        <tr>
                          <th style={{ width: '50px' }}>S.No</th>
                          <th style={{ width: '90px' }}>Date</th>
                          <th style={{ width: '110px' }}>Category</th>
                          <th>Description</th>
                          <th style={{ width: '70px' }}>Payment</th>
                          <th style={{ width: '100px' }} className="text-right">Debit (₹)</th>
                          <th style={{ width: '100px' }} className="text-right">Credit (₹)</th>
                          <th style={{ width: '100px' }} className="text-right">Balance (₹)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(groupedByMonth).map(([monthYear, monthEntries]) => (
                          <Fragment key={`print-${monthYear}`}>
                            <tr className="month-header">
                              <td colSpan="8">
                                <strong>📅 {monthYear}</strong> — {monthEntries.length} transactions
                              </td>
                            </tr>
                            {monthEntries.map((row) => (
                              <tr key={`print-${row.entry_id}`} className={row.entry_type === 'income' ? 'income-row' : 'expense-row'}>
                                <td className="text-center">{row.monthlySerial}</td>
                                <td>{formatDateForPrint(row.entry_date)}</td>
                                <td>{row.category?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Other'}</td>
                                <td>
                                  {row.description || '-'}
                                  {row.reference_no && <small> (Ref: {row.reference_no})</small>}
                                </td>
                                <td>{row.payment_mode?.toUpperCase() || 'AUTO'}</td>
                                <td className={`text-right ${row.entry_type === 'expense' ? 'amount-debit' : ''}`}>
                                  {row.entry_type === 'expense' ? formatCurrency(row.amount).replace('₹', '') : '-'}
                                </td>
                                <td className={`text-right ${row.entry_type === 'income' ? 'amount-credit' : ''}`}>
                                  {row.entry_type === 'income' ? formatCurrency(row.amount).replace('₹', '') : '-'}
                                </td>
                                <td className={`text-right ${row.balance >= 0 ? 'balance-positive' : 'balance-negative'}`}>
                                  {formatCurrency(row.balance).replace('₹', '')}
                                </td>
                              </tr>
                            ))}
                          </Fragment>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr>
                          <td colSpan="5" className="text-right"><strong>GRAND TOTALS</strong></td>
                          <td className="text-right amount-debit"><strong>{formatCurrency(stats.totalExpense).replace('₹', '')}</strong></td>
                          <td className="text-right amount-credit"><strong>{formatCurrency(stats.totalIncome).replace('₹', '')}</strong></td>
                          <td className={`text-right ${stats.currentBalance >= 0 ? 'balance-positive' : 'balance-negative'}`}>
                            <strong>{formatCurrency(stats.currentBalance).replace('₹', '')}</strong>
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>

                  {/* Footer Note */}
                  <div className="print-footer-note">
                    <p>This is a computer-generated document. No signature is required.</p>
                    <p>For any queries, please contact the accounts department.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Manual Entry Modal - ✅ FIXED: Using handleCloseModal */}
      {showManualModal && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content glass-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">
                <div className="modal-icon">
                  <Plus size={20} />
                </div>
                <div>
                  <h3>{manualEntry.entry_type === 'income' ? 'Add Income Entry' : 'Add Expense (Bill)'}</h3>
                  <p>{manualEntry.entry_type === 'income' ? 'Record income received' : 'Enter expense as if writing a shop bill'}</p>
                </div>
              </div>
              <button
                className="modal-close"
                onClick={handleCloseModal}
                disabled={modalLoading}
              >
                <X size={20} />
              </button>
            </div>

            <div className="modal-body">
              {/* Bill-style summary card */}
              <div style={{
                background: 'linear-gradient(135deg, #fef3c7, #fef9c3)',
                border: '2px dashed #d97706',
                borderRadius: 12,
                padding: '14px 16px',
                marginBottom: 16,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div>
                  <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, color: '#92400e', fontWeight: 700 }}>
                    Bill / Voucher
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: '#78350f' }}>
                    {manualEntry.description || 'New Expense'}
                  </div>
                  <div style={{ fontSize: 12, color: '#92400e' }}>
                    {manualEntry.entry_date || 'Today'} · {manualEntry.category || 'Uncategorised'}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 11, color: '#92400e' }}>Amount</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: '#78350f' }}>
                    ₹ {Number(manualEntry.amount || 0).toLocaleString('en-IN')}
                  </div>
                </div>
              </div>

              <div className="form-row">
                <div className={`form-group ${formErrors.entry_date ? 'has-error' : ''}`}>
                  <label>
                    <Calendar size={14} />
                    Entry Date <span className="required">*</span>
                  </label>
                  <DateInput
                    value={manualEntry.entry_date}
                    onChange={(val) => setManualEntry({ ...manualEntry, entry_date: val })}
                    className="form-input"
                    disabled={modalLoading}
                  />
                </div>

                <div className={`form-group ${formErrors.amount ? 'has-error' : ''}`}>
                  <label>
                    <DollarSign size={14} />
                    Amount <span className="required">*</span>
                  </label>
                  <div className="amount-input-wrapper">
                    <span className="currency-symbol">₹</span>
                    <input
                      type="number"
                      value={manualEntry.amount}
                      onChange={(e) => {
                        setManualEntry({ ...manualEntry, amount: e.target.value });
                        if (formErrors.amount) setFormErrors({ ...formErrors, amount: '' });
                      }}
                      placeholder="0.00"
                      className="form-input amount-input"
                      disabled={modalLoading}
                    />
                  </div>
                  {formErrors.amount && (
                    <span className="error-text">{formErrors.amount}</span>
                  )}
                </div>
              </div>

              <div className={`form-group ${formErrors.category ? 'has-error' : ''}`}>
                <label>
                  <Receipt size={14} />
                  Category <span className="required">*</span>
                </label>
                <select
                  value={manualEntry.category}
                  onChange={(e) => {
                    setManualEntry({ ...manualEntry, category: e.target.value });
                    if (formErrors.category) setFormErrors({ ...formErrors, category: '' });
                  }}
                  className="form-input"
                  disabled={modalLoading}
                >
                  <option value="">Select Category</option>
                  <option value="hostel_fees">🏠 Hostel Fees</option>
                  <option value="maintenance">🔧 Maintenance</option>
                  <option value="electric_bill">⚡ Electric Bill</option>
                  <option value="salary">👤 Salary</option>
                  <option value="mess_supplies">🍚 Mess Supplies</option>
                  <option value="hostel_supplies">📦 Hostel Supplies</option>
                  <option value="refund">↩️ Refund</option>
                  <option value="miscellaneous">📋 Miscellaneous</option>
                  <option value="other">📌 Other</option>
                </select>
                {formErrors.category && (
                  <span className="error-text">{formErrors.category}</span>
                )}
              </div>

              <div className={`form-group ${formErrors.description ? 'has-error' : ''}`}>
                <label>
                  <Edit2 size={14} />
                  Description <span className="required">*</span>
                </label>
                <input
                  type="text"
                  value={manualEntry.description}
                  onChange={(e) => {
                    setManualEntry({ ...manualEntry, description: e.target.value });
                    if (formErrors.description) setFormErrors({ ...formErrors, description: '' });
                  }}
                  placeholder="Brief description of this entry"
                  className="form-input"
                  disabled={modalLoading}
                />
                {formErrors.description && (
                  <span className="error-text">{formErrors.description}</span>
                )}
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>
                    <CreditCard size={14} />
                    Payment Mode
                  </label>
                  <select
                    value={manualEntry.payment_mode}
                    onChange={(e) => setManualEntry({ ...manualEntry, payment_mode: e.target.value })}
                    className="form-input"
                    disabled={modalLoading}
                  >
                    <option value="">Select Mode</option>
                    <option value="cash">Cash</option>
                    <option value="cheque">Cheque</option>
                    <option value="online">Online Transfer</option>
                    <option value="upi">UPI</option>
                    <option value="card">Card</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>
                    <Receipt size={14} />
                    Reference No
                  </label>
                  <input
                    type="text"
                    value={manualEntry.reference_no}
                    onChange={(e) => setManualEntry({ ...manualEntry, reference_no: e.target.value })}
                    placeholder="Transaction ID"
                    className="form-input"
                    disabled={modalLoading}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>
                  <Info size={14} />
                  Student ID <span className="optional">(Optional)</span>
                </label>
                <input
                  type="number"
                  value={manualEntry.student_id}
                  onChange={(e) => setManualEntry({ ...manualEntry, student_id: e.target.value })}
                  placeholder="Link to specific student (leave blank if N/A)"
                  className="form-input"
                  disabled={modalLoading}
                />
              </div>

              {/* Entry Preview */}
              <div className={`entry-preview ${manualEntry.entry_type}`}>
                <Sparkles size={16} />
                <span>
                  This will record a <strong>{manualEntry.entry_type === 'expense' ? 'debit' : 'credit'}</strong> entry
                  {manualEntry.amount && ` of ${formatCurrency(parseFloat(manualEntry.amount) || 0)}`}
                  {manualEntry.category && ` for ${manualEntry.category.replace(/_/g, ' ')}`}
                </span>
              </div>
            </div>

            <div className="modal-footer">
              <button
                className="btn btn-secondary"
                onClick={handleCloseModal}
                disabled={modalLoading}
              >
                Cancel
              </button>
              <button
                className={`btn btn-primary ${manualEntry.entry_type === 'income' ? 'income' : 'expense'}`}
                onClick={handleAddManualEntry}
                disabled={modalLoading}
              >
                {modalLoading ? (
                  <>
                    <Loader2 size={18} className="spinning" />
                    <span>Adding...</span>
                  </>
                ) : (
                  <>
                    <Plus size={18} />
                    <span>Add {manualEntry.entry_type === 'expense' ? 'Expense' : 'Income'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Copy Chooser Modal (for ledger receipt printing) */}
      {copyChooser.open && (
        <div
          onClick={() => setCopyChooser({ open: false, row: null })}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20
          }}>
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#fff', borderRadius: 16, maxWidth: 400, width: '100%',
              padding: '24px 20px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
            }}>
            <h3 style={{ margin: 0, marginBottom: 8, fontSize: 18, color: '#1e293b' }}>Print Receipt</h3>
            <p style={{ margin: 0, marginBottom: 16, fontSize: 13, color: '#64748b' }}>
              Which copy do you want to print?
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button onClick={() => doPrintLedgerReceipt(["admin", "student"])}
                style={{ padding: '12px 16px', border: 'none', borderRadius: 8, background: '#1e40af', color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: 14 }}>
                Both Copies (Admin + Student)
              </button>
              <button onClick={() => doPrintLedgerReceipt(["admin"])}
                style={{ padding: '12px 16px', border: '1px solid #e2e8f0', borderRadius: 8, background: '#fff', color: '#1e293b', fontWeight: 600, cursor: 'pointer', fontSize: 14 }}>
                Admin Copy only
              </button>
              <button onClick={() => doPrintLedgerReceipt(["student"])}
                style={{ padding: '12px 16px', border: '1px solid #e2e8f0', borderRadius: 8, background: '#fff', color: '#1e293b', fontWeight: 600, cursor: 'pointer', fontSize: 14 }}>
                Student Copy only
              </button>
              <button onClick={() => setCopyChooser({ open: false, row: null })}
                style={{ padding: '10px 16px', border: 'none', borderRadius: 8, background: 'transparent', color: '#64748b', cursor: 'pointer', fontSize: 13, marginTop: 4 }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Ledger;