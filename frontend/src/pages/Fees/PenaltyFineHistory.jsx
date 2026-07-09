import { useEffect, useState, useMemo } from "react";
import { 
  IndianRupee, 
  AlertTriangle, 
  Search, 
  X, 
  RefreshCw,
  Calendar,
  Filter,
  TrendingUp,
  Clock,
  User,
  FileText,
  Loader2,
  CheckCircle,
  AlertCircle,
  ChevronDown,
  Download
} from "lucide-react";
import { feeAPI } from "../../services/api/fee.api";
import "./penaltyFineHistory.css";

const PenaltyFineHistory = () => {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [sortOrder, setSortOrder] = useState("newest");
  
  // Toast notification state
  const [toast, setToast] = useState({ show: false, type: '', message: '' });

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

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      
      const res = await feeAPI.getAllFees();
      const fees = res.data.data || [];

      const history = [];

      fees.forEach((fee) => {
        if (fee.penalty_amount > 0) {
          history.push({
            id: `penalty-${fee.fee_id}`,
            date: fee.updated_at,
            student: fee.student_name,
            student_id: fee.student_id,
            month: fee.fee_period_start,
            type: "Penalty",
            amount: fee.penalty_amount,
            source: "Late Fee",
            fee_id: fee.fee_id
          });
        }

        if (fee.fine_added_to_fee > 0) {
          history.push({
            id: `fine-${fee.fee_id}`,
            date: fee.updated_at,
            student: fee.student_name,
            student_id: fee.student_id,
            month: fee.fee_period_start,
            type: "Fine",
            amount: fee.fine_added_to_fee,
            source: fee.fine_adjustment_note || "Fee Adjustment",
            fee_id: fee.fee_id
          });
        }
      });

      // Sort by date (newest first by default)
      history.sort((a, b) => new Date(b.date) - new Date(a.date));

      setRecords(history);
      
      if (isRefresh) {
        showToast('success', 'Data refreshed successfully!');
      }
    } catch (err) {
      console.error("Failed to load penalty/fine history");
      showToast('error', 'Failed to load history');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    loadData(true);
  };

  // Statistics
  const stats = useMemo(() => {
    const totalPenalties = records.filter(r => r.type === "Penalty").reduce((sum, r) => sum + Number(r.amount), 0);
    const totalFines = records.filter(r => r.type === "Fine").reduce((sum, r) => sum + Number(r.amount), 0);
    const penaltyCount = records.filter(r => r.type === "Penalty").length;
    const fineCount = records.filter(r => r.type === "Fine").length;
    const uniqueStudents = new Set(records.map(r => r.student_id)).size;

    return {
      totalPenalties,
      totalFines,
      totalAmount: totalPenalties + totalFines,
      penaltyCount,
      fineCount,
      totalCount: records.length,
      uniqueStudents
    };
  }, [records]);

  // Filter and search records
  const filteredRecords = useMemo(() => {
    let filtered = [...records];

    // Apply type filter
    if (filterType !== "all") {
      filtered = filtered.filter(r => r.type.toLowerCase() === filterType);
    }

    // Apply search
    if (searchTerm) {
      filtered = filtered.filter(r =>
        r.student?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.source?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply sort
    if (sortOrder === "newest") {
      filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
    } else if (sortOrder === "oldest") {
      filtered.sort((a, b) => new Date(a.date) - new Date(b.date));
    } else if (sortOrder === "highest") {
      filtered.sort((a, b) => Number(b.amount) - Number(a.amount));
    } else if (sortOrder === "lowest") {
      filtered.sort((a, b) => Number(a.amount) - Number(b.amount));
    }

    return filtered;
  }, [records, filterType, searchTerm, sortOrder]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const hasActiveFilters = searchTerm || filterType !== "all";

  const clearFilters = () => {
    setSearchTerm("");
    setFilterType("all");
    setSortOrder("newest");
  };

  // Loading State
  if (loading) {
    return (
      <div className="pf-page">
        <div className="loading-state">
          <div className="loading-spinner">
            <Loader2 size={48} className="spinning" />
          </div>
          <h3>Loading History</h3>
          <p>Fetching penalty and fine records...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pf-page">
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
            <AlertTriangle size={28} />
          </div>
          <div className="header-text">
            <h1>Penalty & Fine History</h1>
            <p>View all system-generated penalties and fines (read-only)</p>
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
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="stats-grid">
        <div className="stat-card total">
          <div className="stat-icon-wrapper">
            <IndianRupee size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-label">Total Amount</span>
            <span className="stat-value">{formatCurrency(stats.totalAmount)}</span>
          </div>
          <span className="stat-badge">{stats.totalCount} records</span>
        </div>

        <div className="stat-card penalty">
          <div className="stat-icon-wrapper">
            <Clock size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-label">Penalties</span>
            <span className="stat-value">{formatCurrency(stats.totalPenalties)}</span>
          </div>
          <span className="stat-badge">{stats.penaltyCount} entries</span>
        </div>

        <div className="stat-card fine">
          <div className="stat-icon-wrapper">
            <AlertTriangle size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-label">Fines</span>
            <span className="stat-value">{formatCurrency(stats.totalFines)}</span>
          </div>
          <span className="stat-badge">{stats.fineCount} entries</span>
        </div>

        <div className="stat-card students">
          <div className="stat-icon-wrapper">
            <User size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-label">Students Affected</span>
            <span className="stat-value">{stats.uniqueStudents}</span>
          </div>
        </div>
      </div>

      {/* Filters Section */}
      <div className="filters-section glass-card">
        <div className="filters-header">
          <div className="filters-title">
            <Filter size={18} />
            <span>Filters & Search</span>
            {hasActiveFilters && (
              <span className="active-count">Active</span>
            )}
          </div>
          {hasActiveFilters && (
            <button className="clear-btn" onClick={clearFilters}>
              <X size={14} />
              <span>Clear all</span>
            </button>
          )}
        </div>

        <div className="filters-content">
          <div className="search-wrapper">
            <Search size={18} />
            <input
              type="text"
              placeholder="Search by student name or source..."
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
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="filter-select"
            >
              <option value="all">All Types</option>
              <option value="penalty">Penalties Only</option>
              <option value="fine">Fines Only</option>
            </select>
          </div>

          <div className="filter-group">
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className="filter-select"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="highest">Highest Amount</option>
              <option value="lowest">Lowest Amount</option>
            </select>
          </div>
        </div>

        <div className="filters-footer">
          <span className="results-count">
            Showing <strong>{filteredRecords.length}</strong> of <strong>{records.length}</strong> records
          </span>
        </div>
      </div>

      {/* Records Table */}
      {records.length === 0 ? (
        <div className="empty-state glass-card">
          <div className="empty-icon">
            <CheckCircle size={56} />
          </div>
          <h3>No Records Found</h3>
          <p>No penalties or fines have been recorded yet.</p>
        </div>
      ) : filteredRecords.length === 0 ? (
        <div className="empty-state glass-card">
          <div className="empty-icon">
            <Search size={56} />
          </div>
          <h3>No Matching Records</h3>
          <p>No records match your current filters.</p>
          <button className="btn btn-secondary" onClick={clearFilters}>
            <X size={18} />
            <span>Clear Filters</span>
          </button>
        </div>
      ) : (
        <div className="table-container glass-card">
          <div className="table-header">
            <h3>
              <FileText size={20} />
              Transaction Records
            </h3>
          </div>

          <div className="table-wrapper">
            <table className="pf-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Student</th>
                  <th>Fee Month</th>
                  <th>Type</th>
                  <th>Amount</th>
                  <th>Source</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecords.map((r) => (
                  <tr key={r.id} className={r.type.toLowerCase()}>
                    <td className="date-cell">
                      <span className="date-value">
                        {r.date
                          ? new Date(r.date).toLocaleDateString("en-IN", {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric'
                            })
                          : "—"}
                      </span>
                    </td>
                    <td className="student-cell">
                      <div className="student-info">
                        <span className="student-name">{r.student}</span>
                        <span className="student-id">ID: {r.student_id}</span>
                      </div>
                    </td>
                    <td className="month-cell">
                      {r.month
                        ? new Date(r.month).toLocaleDateString("en-IN", {
                            month: "short",
                            year: "numeric"
                          })
                        : "—"}
                    </td>
                    <td className="type-cell">
                      <span className={`type-badge ${r.type.toLowerCase()}`}>
                        {r.type === "Penalty" ? <Clock size={12} /> : <AlertTriangle size={12} />}
                        {r.type}
                      </span>
                    </td>
                    <td className="amount-cell">
                      <span className="amount-value">
                        {formatCurrency(r.amount)}
                      </span>
                    </td>
                    <td className="source-cell">
                      <span className="source-badge">{r.source}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Table Footer */}
          <div className="table-footer">
            <div className="footer-stats">
              <span>
                Total Displayed: <strong>{formatCurrency(filteredRecords.reduce((sum, r) => sum + Number(r.amount), 0))}</strong>
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PenaltyFineHistory;