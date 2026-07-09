import { useState, useEffect } from "react";
import DateInput from "../../components/common/DateInput";
import {
  FileText,
  Users,
  DollarSign,
  Home,
  Filter,
  Calendar,
  FileSpreadsheet,
  Settings,
  CheckSquare,
  Square,
  X,
  Download,
  Loader2,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  TrendingUp,
  BarChart3,
  PieChart,
  ArrowRight,
  Sparkles,
  Info,
  Clock,
  ChevronRight
} from "lucide-react";
import { printElement } from "../../utils/printUtil";
import axios from "axios";
import "./reports.css";

const Reports = () => {
  const [dateRange, setDateRange] = useState({
    from: "",
    to: ""
  });
  const [filters, setFilters] = useState({
    fee_status: "",
    active_only: false,
    entry_type: ""
  });
  const [loading, setLoading] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showColumnModal, setShowColumnModal] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [selectedColumns, setSelectedColumns] = useState([]);

  // Toast notification state
  const [toast, setToast] = useState({ show: false, type: '', message: '' });

  // Quick date range presets
  const [activePreset, setActivePreset] = useState(null);

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

  const handleGstReport = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const params = new URLSearchParams();
      if (dateRange.from) params.set("from_date", dateRange.from);
      if (dateRange.to) params.set("to_date", dateRange.to);
      const url = `${import.meta.env.VITE_API_BASE_URL}/export/gst-report?${params.toString()}`;
      const res = await axios.get(url, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.data.success) throw new Error(res.data.message || "Failed");
      const { entries, totals, period } = res.data.data;
      const fmt = (n) => new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(n || 0);
      const rows = entries.map((e, i) => `
        <tr>
          <td>${i + 1}</td>
          <td>${new Date(e.payment_date).toLocaleDateString("en-IN")}</td>
          <td>${e.student_name || ""}<br><small>${e.father_name || ""}</small></td>
          <td>${e.reference_no || "-"}</td>
          <td class="r">${fmt(e.accommodation.base)}</td>
          <td class="r">${fmt(e.accommodation.cgst)}</td>
          <td class="r">${fmt(e.accommodation.sgst)}</td>
          <td class="r">${fmt(e.mess.base)}</td>
          <td class="r">${fmt(e.mess.cgst)}</td>
          <td class="r">${fmt(e.mess.sgst)}</td>
          <td class="r"><strong>${fmt(e.grand_total)}</strong></td>
        </tr>
      `).join("");
      const html = `
        <div style="padding:20px">
          <h1 style="margin:0 0 8px;color:#1e40af">GST-Ready Fee Collection Report</h1>
          <p style="color:#64748b;margin-bottom:16px">
            Period: <strong>${period.from || "All time"}</strong> to <strong>${period.to || "today"}</strong>
            &nbsp;|&nbsp; Online-Payment Students Only
          </p>
          <table class="rpt">
            <thead>
              <tr>
                <th>#</th><th>Date</th><th>Student</th><th>Ref</th>
                <th class="r">Accom. Base</th><th class="r">Accom. CGST</th><th class="r">Accom. SGST</th>
                <th class="r">Mess Base</th><th class="r">Mess CGST</th><th class="r">Mess SGST</th>
                <th class="r">Grand Total</th>
              </tr>
            </thead>
            <tbody>${rows || `<tr><td colspan="11" style="text-align:center;padding:16px;color:#94a3b8">No online-payment collections in this period</td></tr>`}</tbody>
            <tfoot>
              <tr style="background:#1e3a8a;color:#fff">
                <td colspan="4"><strong>TOTALS</strong></td>
                <td class="r"><strong>${fmt(totals.accommodation_base)}</strong></td>
                <td class="r"><strong>${fmt(totals.accommodation_cgst)}</strong></td>
                <td class="r"><strong>${fmt(totals.accommodation_sgst)}</strong></td>
                <td class="r"><strong>${fmt(totals.mess_base)}</strong></td>
                <td class="r"><strong>${fmt(totals.mess_cgst)}</strong></td>
                <td class="r"><strong>${fmt(totals.mess_sgst)}</strong></td>
                <td class="r"><strong>${fmt(totals.grand_total)}</strong></td>
              </tr>
            </tfoot>
          </table>
          <div style="margin-top:20px;padding:14px;background:#f1f5f9;border-radius:8px;font-size:12px;color:#475569">
            <p style="margin:0"><strong>Accommodation:</strong> Base + CGST(2.5%) + SGST(2.5%) — GST-inclusive back-calculation.</p>
            <p style="margin:4px 0 0"><strong>Mess:</strong> Base ₹5,000 + CGST(2.5%) + SGST(2.5%) added on top.</p>
          </div>
        </div>
      `;
      const styles = `
        @page { size: A4 landscape; margin: 12mm; }
        body { font-family: Arial, sans-serif; color: #1e293b; font-size: 11px; }
        .rpt { width: 100%; border-collapse: collapse; margin-top: 8px; }
        .rpt th, .rpt td { border: 1px solid #cbd5e1; padding: 6px 8px; }
        .rpt th { background: #1e40af; color: #fff; font-size: 10px; text-align: left; }
        .r { text-align: right; font-variant-numeric: tabular-nums; }
      `;
      printElement(html, "GST Report", styles);
      showToast("success", "GST report generated");
    } catch (err) {
      console.error(err);
      showToast("error", err.response?.data?.message || err.message || "Failed to generate GST report");
    } finally {
      setLoading(false);
    }
  };

  // Date presets
  const datePresets = [
    {
      id: 'today',
      label: 'Today',
      getRange: () => {
        const today = new Date().toISOString().split('T')[0];
        return { from: today, to: today };
      }
    },
    {
      id: 'week',
      label: 'This Week',
      getRange: () => {
        const today = new Date();
        const startOfWeek = new Date(today.setDate(today.getDate() - today.getDay()));
        const endOfWeek = new Date(today.setDate(today.getDate() - today.getDay() + 6));
        return {
          from: startOfWeek.toISOString().split('T')[0],
          to: endOfWeek.toISOString().split('T')[0]
        };
      }
    },
    {
      id: 'month',
      label: 'This Month',
      getRange: () => {
        const today = new Date();
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        return {
          from: startOfMonth.toISOString().split('T')[0],
          to: endOfMonth.toISOString().split('T')[0]
        };
      }
    },
    {
      id: 'quarter',
      label: 'This Quarter',
      getRange: () => {
        const today = new Date();
        const quarter = Math.floor(today.getMonth() / 3);
        const startOfQuarter = new Date(today.getFullYear(), quarter * 3, 1);
        const endOfQuarter = new Date(today.getFullYear(), quarter * 3 + 3, 0);
        return {
          from: startOfQuarter.toISOString().split('T')[0],
          to: endOfQuarter.toISOString().split('T')[0]
        };
      }
    },
    {
      id: 'year',
      label: 'This Year',
      getRange: () => {
        const today = new Date();
        return {
          from: `${today.getFullYear()}-01-01`,
          to: `${today.getFullYear()}-12-31`
        };
      }
    }
  ];

  // Report columns configuration
  const reportColumns = {
    ledger: [
      { key: 'entry_id', label: 'Seq No', default: true },
      { key: 'entry_date', label: 'Date', default: true },
      { key: 'entry_type', label: 'Type', default: true },
      { key: 'category', label: 'Category', default: true },
      { key: 'amount', label: 'Amount', default: true },
      { key: 'payment_mode', label: 'Payment Mode', default: true },
      { key: 'reference_no', label: 'Reference', default: false },
      { key: 'student_name', label: 'Student', default: false },
      { key: 'description', label: 'Description', default: true }
    ],
    fees: [
      { key: 'student_id', label: 'Student ID', default: true },
      { key: 'student_name', label: 'Student Name', default: true },
      { key: 'father_name', label: 'Father Name', default: true },
      { key: 'father_mobile', label: 'Contact', default: true },
      { key: 'fee_type', label: 'Fee Type', default: true },
      { key: 'fee_amount', label: 'Fee Amount', default: true },
      { key: 'discount_amount', label: 'Discount', default: false },
      { key: 'final_amount', label: 'Final Amount', default: true },
      { key: 'paid_amount', label: 'Paid Amount', default: true },
      { key: 'balance', label: 'Balance', default: true },
      { key: 'fee_status', label: 'Status', default: true },
      { key: 'fee_date', label: 'Fee Date', default: true },
      { key: 'due_date', label: 'Due Date', default: true }
    ],
    students: [
      { key: 'student_id', label: 'Student ID', default: true },
      { key: 'student_name', label: 'Name', default: true },
      { key: 'date_of_birth', label: 'DOB', default: false },
      { key: 'student_mobile', label: 'Mobile', default: true },
      { key: 'class_or_coaching', label: 'Class', default: true },
      { key: 'institute_name', label: 'Institute', default: false },
      { key: 'father_name', label: 'Father Name', default: true },
      { key: 'father_mobile', label: 'Father Mobile', default: true },
      { key: 'mother_name', label: 'Mother Name', default: false },
      { key: 'mother_mobile', label: 'Mother Mobile', default: false },
      { key: 'address_line1', label: 'Address', default: false },
      { key: 'date_of_joining', label: 'Joining Date', default: true },
      { key: 'date_of_leaving', label: 'Leaving Date', default: false },
      { key: 'room_no', label: 'Room', default: true },
      { key: 'bed_no', label: 'Bed', default: true }
    ],
    occupancy: [
      { key: 'room_no', label: 'Room No', default: true },
      { key: 'floor_no', label: 'Floor', default: true },
      { key: 'room_type', label: 'Type', default: true },
      { key: 'bed_no', label: 'Bed No', default: true },
      { key: 'bed_status', label: 'Status', default: true },
      { key: 'student_name', label: 'Student', default: true },
      { key: 'student_mobile', label: 'Mobile', default: true },
      { key: 'allocation_start_date', label: 'From Date', default: true }
    ]
  };

  const reports = [
    {
      id: 'ledger',
      title: 'Ledger Report',
      description: 'Complete financial transaction history with income and expense tracking',
      icon: FileText,
      gradient: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
      bgGradient: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(139, 92, 246, 0.1))',
      iconBg: 'rgba(99, 102, 241, 0.15)',
      filters: ['date', 'entry_type'],
      stats: { label: 'Transactions', value: '' } // Removed sample value
    },
    {
      id: 'fees',
      title: 'Fee Collection Report',
      description: 'Student fees, payments, discounts, and outstanding balances',
      icon: DollarSign,
      gradient: 'linear-gradient(135deg, #10b981, #059669)',
      bgGradient: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(5, 150, 105, 0.1))',
      iconBg: 'rgba(16, 185, 129, 0.15)',
      filters: ['date', 'fee_status'],
      stats: { label: 'Collections', value: '' } // Removed sample value
    },
    {
      id: 'students',
      title: 'Student Database',
      description: 'Complete student records with personal and contact information',
      icon: Users,
      gradient: 'linear-gradient(135deg, #3b82f6, #2563eb)',
      bgGradient: 'linear-gradient(135deg, rgba(59, 130, 246, 0.15), rgba(37, 99, 235, 0.1))',
      iconBg: 'rgba(59, 130, 246, 0.15)',
      filters: ['date', 'active_only'],
      stats: { label: 'Students', value: '' } // Removed sample value
    },
    {
      id: 'occupancy',
      title: 'Room Occupancy',
      description: 'Current room and bed allocation status with vacancy details',
      icon: Home,
      gradient: 'linear-gradient(135deg, #f59e0b, #d97706)',
      bgGradient: 'linear-gradient(135deg, rgba(245, 158, 11, 0.15), rgba(217, 119, 6, 0.1))',
      iconBg: 'rgba(245, 158, 11, 0.15)',
      filters: [],
      stats: { label: 'Occupancy', value: '' } // Removed sample value
    }
  ];

  // Apply date preset
  const applyDatePreset = (presetId) => {
    const preset = datePresets.find(p => p.id === presetId);
    if (preset) {
      setDateRange(preset.getRange());
      setActivePreset(presetId);
    }
  };

  // Clear date range
  const clearDateRange = () => {
    setDateRange({ from: "", to: "" });
    setActivePreset(null);
  };

  // Open column selector modal
  const openColumnSelector = (reportId) => {
    setSelectedReport(reportId);
    const defaultColumns = reportColumns[reportId]
      .filter(col => col.default)
      .map(col => col.key);
    setSelectedColumns(defaultColumns);
    setShowColumnModal(true);
  };

  // Toggle column selection
  const toggleColumn = (columnKey) => {
    setSelectedColumns(prev =>
      prev.includes(columnKey)
        ? prev.filter(k => k !== columnKey)
        : [...prev, columnKey]
    );
  };

  // Select/Deselect all columns
  const toggleAllColumns = () => {
    const allKeys = reportColumns[selectedReport].map(col => col.key);
    if (selectedColumns.length === allKeys.length) {
      setSelectedColumns([]);
    } else {
      setSelectedColumns(allKeys);
    }
  };

  // Select default columns
  const selectDefaultColumns = () => {
    const defaultKeys = reportColumns[selectedReport]
      .filter(col => col.default)
      .map(col => col.key);
    setSelectedColumns(defaultKeys);
  };

  const handleExport = async () => {
    if (selectedColumns.length === 0) {
      showToast('error', 'Please select at least one column');
      return;
    }

    setLoading(true);
    try {
      const baseUrl = import.meta.env.VITE_API_BASE_URL;
      const token = localStorage.getItem('token');

      if (!token) {
        showToast('error', 'Session expired. Please login again.');
        window.location.href = '/login';
        return;
      }

      const requestBody = {
        columns: selectedColumns,
        filters: {
          from_date: dateRange.from || null,
          to_date: dateRange.to || null,
          fee_status: filters.fee_status || null,
          entry_type: filters.entry_type || null,
          active_only: filters.active_only || false
        }
      };

      const url = `${baseUrl}/export/${selectedReport}/excel`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      if (response.status === 401) {
        showToast('error', 'Your session has expired. Please login again.');
        localStorage.removeItem('token');
        window.location.href = '/login';
        return;
      }

      if (!response.ok) {
        let errorMessage = `Export failed: ${response.status} ${response.statusText}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
        } catch (e) {
          const errorText = await response.text();
          if (errorText) errorMessage = errorText;
        }
        throw new Error(errorMessage);
      }

      const blob = await response.blob();

      if (blob.size === 0) {
        throw new Error('Export returned empty file');
      }

      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `${selectedReport}_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(downloadUrl);

      showToast('success', 'Report exported successfully!');
      setShowColumnModal(false);
    } catch (err) {
      console.error('Export error:', err);
      showToast('error', err.message || 'Export failed');
    } finally {
      setLoading(false);
    }
  };

  const openFilterModal = (reportId) => {
    setSelectedReport(reportId);
    setShowFilterModal(true);
  };

  const closeFilterModal = () => {
    setShowFilterModal(false);
    setSelectedReport(null);
  };

  const currentReport = reports.find(r => r.id === selectedReport);

  return (
    <div className="reports-page">
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
            <h1>Reports & Exports</h1>
            <p>Generate comprehensive reports and export data in Excel format</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button
            onClick={handleGstReport}
            disabled={loading}
            style={{
              background: 'linear-gradient(135deg, #059669, #10b981)',
              color: '#fff', border: 'none', padding: '10px 16px',
              borderRadius: '8px', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
              display: 'inline-flex', alignItems: 'center', gap: '8px'
            }}
          >
            <FileText size={16} />
            {loading ? 'Generating...' : 'GST Report'}
          </button>
          <div className="header-badge">
            <Sparkles size={16} />
            <span>4 Report Types</span>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="quick-stats">
        <div className="quick-stat-item">
          <div className="stat-icon purple">
            <TrendingUp size={20} />
          </div>
          <div className="stat-info">
            <span className="stat-value"></span>
            <span className="stat-label">Total Transactions</span>
          </div>
        </div>
        <div className="quick-stat-item">
          <div className="stat-icon green">
            <DollarSign size={20} />
          </div>
          <div className="stat-info">
            <span className="stat-value"></span>
            <span className="stat-label">Total Collections</span>
          </div>
        </div>
        <div className="quick-stat-item">
          <div className="stat-icon blue">
            <Users size={20} />
          </div>
          <div className="stat-info">
            <span className="stat-value"></span>
            <span className="stat-label">Active Students</span>
          </div>
        </div>
        <div className="quick-stat-item">
          <div className="stat-icon amber">
            <PieChart size={20} />
          </div>
          <div className="stat-info">
            <span className="stat-value"></span>
            <span className="stat-label">Occupancy Rate</span>
          </div>
        </div>
      </div>

      {/* Date Range Filter Card */}
      <div className="filter-card glass-card">
        <div className="filter-card-header">
          <div className="filter-title">
            <div className="filter-icon">
              <Calendar size={20} />
            </div>
            <div>
              <h3>Date Range Filter</h3>
              <p>Select a date range for your reports</p>
            </div>
          </div>
          {(dateRange.from || dateRange.to) && (
            <button className="clear-btn" onClick={clearDateRange}>
              <X size={14} />
              <span>Clear</span>
            </button>
          )}
        </div>

        {/* Quick Presets */}
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

        {/* Date Inputs */}
        <div className="date-inputs">
          <div className="form-group">
            <label>
              <Calendar size={14} />
              From Date
            </label>
            <DateInput
              value={dateRange.from}
              onChange={(val) => {
                setDateRange({ ...dateRange, from: val });
                setActivePreset(null);
              }}
              className="form-input glass-input"
            />
          </div>
          <div className="date-separator">
            <ArrowRight size={20} />
          </div>
          <div className="form-group">
            <label>
              <Calendar size={14} />
              To Date
            </label>
            <DateInput
              value={dateRange.to}
              onChange={(val) => {
                setDateRange({ ...dateRange, to: val });
                setActivePreset(null);
              }}
              className="form-input glass-input"
            />
          </div>
        </div>

        {/* Date Range Info */}
        {dateRange.from && dateRange.to && (
          <div className="date-info">
            <Info size={16} />
            <span>
              Reports will be filtered from <strong>{new Date(dateRange.from).toLocaleDateString()}</strong> to <strong>{new Date(dateRange.to).toLocaleDateString()}</strong>
            </span>
          </div>
        )}
      </div>

      {/* Reports Grid */}
      <div className="section-header">
        <h2>Available Reports</h2>
        <p>Click on any report to customize columns and export</p>
      </div>

      <div className="reports-grid">
        {reports.map((report) => {
          const Icon = report.icon;
          return (
            <div
              key={report.id}
              className="report-card glass-card"
            >
              {/* Card Header */}
              <div className="report-card-header">
                <div
                  className="report-icon"
                  style={{ background: report.iconBg }}
                >
                  <Icon size={28} style={{ color: report.gradient.includes('#6366f1') ? '#6366f1' : report.gradient.includes('#10b981') ? '#10b981' : report.gradient.includes('#3b82f6') ? '#3b82f6' : '#f59e0b' }} />
                </div>
                <div className="report-stat">
                  <span className="stat-value">{report.stats.value}</span>
                  <span className="stat-label">{report.stats.label}</span>
                </div>
              </div>

              {/* Card Content */}
              <div className="report-card-content">
                <h3>{report.title}</h3>
                <p>{report.description}</p>
              </div>

              {/* Card Actions */}
              <div className="report-card-actions">
                {report.filters.length > 0 && (
                  <button
                    className="action-btn filter-action"
                    onClick={() => openFilterModal(report.id)}
                    disabled={loading}
                  >
                    <Filter size={16} />
                    <span>Filters</span>
                  </button>
                )}

                <button
                  className="action-btn export-action"
                  onClick={() => openColumnSelector(report.id)}
                  disabled={loading}
                  style={{ background: report.gradient }}
                >
                  <FileSpreadsheet size={16} />
                  <span>Export Excel</span>
                  <ChevronRight size={16} />
                </button>
              </div>

              {/* Decorative gradient line */}
              <div
                className="card-accent"
                style={{ background: report.gradient }}
              ></div>
            </div>
          );
        })}
      </div>

      {/* Column Selection Modal */}
      {showColumnModal && selectedReport && (
        <div className="modal-overlay" onClick={() => setShowColumnModal(false)}>
          <div className="modal-content glass-modal column-selector" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">
                <div
                  className="modal-icon"
                  style={{ background: currentReport?.gradient }}
                >
                  <FileSpreadsheet size={20} />
                </div>
                <div>
                  <h3>Select Columns</h3>
                  <p>{currentReport?.title}</p>
                </div>
              </div>
              <button className="modal-close" onClick={() => setShowColumnModal(false)}>
                <X size={20} />
              </button>
            </div>

            <div className="modal-body">
              {/* Column Actions */}
              <div className="column-actions">
                <button
                  className="column-action-btn"
                  onClick={toggleAllColumns}
                >
                  {selectedColumns.length === reportColumns[selectedReport].length ? (
                    <CheckSquare size={16} />
                  ) : (
                    <Square size={16} />
                  )}
                  <span>
                    {selectedColumns.length === reportColumns[selectedReport].length
                      ? 'Deselect All'
                      : 'Select All'}
                  </span>
                </button>
                <button
                  className="column-action-btn"
                  onClick={selectDefaultColumns}
                >
                  <RefreshCw size={16} />
                  <span>Reset to Default</span>
                </button>
                <div className="column-count">
                  <span>{selectedColumns.length}</span> of <span>{reportColumns[selectedReport].length}</span> selected
                </div>
              </div>

              {/* Columns Grid */}
              <div className="columns-grid">
                {reportColumns[selectedReport].map((column) => (
                  <div
                    key={column.key}
                    className={`column-item ${selectedColumns.includes(column.key) ? 'selected' : ''}`}
                    onClick={() => toggleColumn(column.key)}
                  >
                    <div className="column-checkbox">
                      {selectedColumns.includes(column.key) ? (
                        <CheckSquare size={18} />
                      ) : (
                        <Square size={18} />
                      )}
                    </div>
                    <span className="column-label">{column.label}</span>
                    {column.default && (
                      <span className="default-badge">Default</span>
                    )}
                  </div>
                ))}
              </div>

              {/* Export Info */}
              <div className="export-info">
                <Info size={16} />
                <span>
                  Selected columns will be exported to Excel file.
                  {dateRange.from && dateRange.to && (
                    <> Date range: {new Date(dateRange.from).toLocaleDateString()} - {new Date(dateRange.to).toLocaleDateString()}</>
                  )}
                </span>
              </div>
            </div>

            <div className="modal-footer">
              <button
                className="btn btn-secondary"
                onClick={() => setShowColumnModal(false)}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleExport}
                disabled={loading || selectedColumns.length === 0}
                style={{ background: currentReport?.gradient }}
              >
                {loading ? (
                  <>
                    <Loader2 size={18} className="spinning" />
                    <span>Exporting...</span>
                  </>
                ) : (
                  <>
                    <Download size={18} />
                    <span>Export {selectedColumns.length} Columns</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filter Modal */}
      {showFilterModal && currentReport && (
        <div className="modal-overlay" onClick={closeFilterModal}>
          <div className="modal-content glass-modal filter-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">
                <div
                  className="modal-icon"
                  style={{ background: currentReport.gradient }}
                >
                  <Settings size={20} />
                </div>
                <div>
                  <h3>Filter Options</h3>
                  <p>{currentReport.title}</p>
                </div>
              </div>
              <button className="modal-close" onClick={closeFilterModal}>
                <X size={20} />
              </button>
            </div>

            <div className="modal-body">
              {currentReport.filters.includes('fee_status') && (
                <div className="form-group">
                  <label>
                    <DollarSign size={14} />
                    Fee Status
                  </label>
                  <select
                    value={filters.fee_status}
                    onChange={(e) => setFilters({ ...filters, fee_status: e.target.value })}
                    className="form-input glass-input"
                  >
                    <option value="">All Status</option>
                    <option value="PAID">Paid</option>
                    <option value="DUE">Due</option>
                    <option value="OVERDUE">Overdue</option>
                  </select>
                </div>
              )}

              {currentReport.filters.includes('entry_type') && (
                <div className="form-group">
                  <label>
                    <TrendingUp size={14} />
                    Entry Type
                  </label>
                  <select
                    value={filters.entry_type}
                    onChange={(e) => setFilters({ ...filters, entry_type: e.target.value })}
                    className="form-input glass-input"
                  >
                    <option value="">All Types</option>
                    <option value="income">Income</option>
                    <option value="expense">Expense</option>
                  </select>
                </div>
              )}

              {currentReport.filters.includes('active_only') && (
                <div className="form-group checkbox-group">
                  <label
                    className="checkbox-label"
                    onClick={() => setFilters({ ...filters, active_only: !filters.active_only })}
                  >
                    <div className={`custom-checkbox ${filters.active_only ? 'checked' : ''}`}>
                      {filters.active_only && <CheckCircle size={16} />}
                    </div>
                    <span>Show Active Students Only</span>
                  </label>
                  <p className="checkbox-help">Filter out students who have left the hostel</p>
                </div>
              )}

              {/* Filter Preview */}
              <div className="filter-preview">
                <h4>Active Filters</h4>
                <div className="filter-tags">
                  {filters.fee_status && (
                    <span className="filter-tag">
                      Fee Status: {filters.fee_status}
                      <X size={12} onClick={() => setFilters({ ...filters, fee_status: '' })} />
                    </span>
                  )}
                  {filters.entry_type && (
                    <span className="filter-tag">
                      Entry Type: {filters.entry_type}
                      <X size={12} onClick={() => setFilters({ ...filters, entry_type: '' })} />
                    </span>
                  )}
                  {filters.active_only && (
                    <span className="filter-tag">
                      Active Only
                      <X size={12} onClick={() => setFilters({ ...filters, active_only: false })} />
                    </span>
                  )}
                  {!filters.fee_status && !filters.entry_type && !filters.active_only && (
                    <span className="no-filters">No filters applied</span>
                  )}
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button
                className="btn btn-secondary"
                onClick={() => setFilters({ fee_status: '', active_only: false, entry_type: '' })}
              >
                Clear All
              </button>
              <button
                className="btn btn-primary"
                onClick={closeFilterModal}
                style={{ background: currentReport.gradient }}
              >
                <CheckCircle size={18} />
                <span>Apply Filters</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Reports;