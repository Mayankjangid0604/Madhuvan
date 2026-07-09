import { useState, useEffect, useMemo } from "react";
import { feeAPI } from "../../services/api/fee.api";
import {
  Bell,
  Send,
  CheckCircle,
  Search,
  X,
  AlertCircle,
  Loader2,
  Users,
  IndianRupee,
  MessageSquare,
  Phone,
  RefreshCw,
  Filter,
  Clock,
  AlertTriangle,
  Sparkles,
  Mail,
  CheckSquare,
  Square
} from "lucide-react";
import ConfirmModal from "../../components/modals/ConfirmModal";
import "./sendReminder.css";

const SendReminder = () => {
  const [overdueStudents, setOverdueStudents] = useState([]);
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [customMessage, setCustomMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: null,
    type: "warning"
  });

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
    fetchOverdueStudents();
  }, []);

  const fetchOverdueStudents = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const res = await feeAPI.getAllFees();
      const fees = res.data.data || [];

      // Group by student and filter overdue
      const studentMap = {};
      fees.forEach(fee => {
        if (fee.fee_status === 'OVERDUE' || fee.fee_status === 'DUE') {
          if (!studentMap[fee.student_id]) {
            studentMap[fee.student_id] = {
              student_id: fee.student_id,
              student_name: fee.student_name,
              father_name: fee.father_name,
              father_mobile: fee.father_mobile,
              student_mobile: fee.student_mobile,
              total_due: 0,
              fee_count: 0,
              has_overdue: false
            };
          }
          studentMap[fee.student_id].total_due += (fee.fee_amount - fee.paid_amount);
          studentMap[fee.student_id].fee_count++;
          if (fee.fee_status === 'OVERDUE') {
            studentMap[fee.student_id].has_overdue = true;
          }
        }
      });

      setOverdueStudents(Object.values(studentMap));

      if (isRefresh) {
        showToast('success', 'Student list refreshed!');
      }
    } catch (error) {
      console.error("Failed to fetch overdue students:", error);
      showToast('error', 'Failed to load students');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    fetchOverdueStudents(true);
  };

  // Filter students based on search
  const filteredStudents = useMemo(() => {
    if (!searchTerm) return overdueStudents;

    return overdueStudents.filter(student =>
      student.student_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.father_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.father_mobile?.includes(searchTerm)
    );
  }, [overdueStudents, searchTerm]);

  // Statistics
  const stats = useMemo(() => {
    const totalStudents = overdueStudents.length;
    const selectedCount = selectedStudents.length;
    const totalDue = overdueStudents.reduce((sum, s) => sum + s.total_due, 0);
    const selectedDue = overdueStudents
      .filter(s => selectedStudents.includes(s.student_id))
      .reduce((sum, s) => sum + s.total_due, 0);
    const overdueCount = overdueStudents.filter(s => s.has_overdue).length;

    return {
      totalStudents,
      selectedCount,
      totalDue,
      selectedDue,
      overdueCount
    };
  }, [overdueStudents, selectedStudents]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const handleSelectAll = () => {
    if (selectedStudents.length === filteredStudents.length) {
      setSelectedStudents([]);
    } else {
      setSelectedStudents(filteredStudents.map(s => s.student_id));
    }
  };

  const handleSelectStudent = (studentId) => {
    if (selectedStudents.includes(studentId)) {
      setSelectedStudents(selectedStudents.filter(id => id !== studentId));
    } else {
      setSelectedStudents([...selectedStudents, studentId]);
    }
  };

  const handleSendReminders = async () => {
    if (selectedStudents.length === 0) {
      showToast('error', 'Please select at least one student');
      return;
    }

    setConfirmModal({
      isOpen: true,
      title: "Send Reminders",
      message: `Send reminders to ${selectedStudents.length} student(s)?`,
      type: "info",
      onConfirm: async () => {
        setConfirmModal({ ...confirmModal, isOpen: false });
        setSending(true);
        try {
          // TODO: Implement API call
          // await notificationAPI.sendReminders({
          //   student_ids: selectedStudents,
          //   message: customMessage
          // });

          // Simulate API delay
          await new Promise(resolve => setTimeout(resolve, 1500));

          showToast('success', `Successfully sent reminders to ${selectedStudents.length} students!`);
          setSelectedStudents([]);
          setCustomMessage("");
        } catch (error) {
          showToast('error', 'Failed to send reminders: ' + error.message);
        } finally {
          setSending(false);
        }
      }
    });
  };

  const defaultMessage = "Dear Parent, Your ward has pending fee of ₹XXX. Please clear at earliest.";

  // Loading State
  if (loading) {
    return (
      <div className="send-reminder-page">
        <div className="loading-state">
          <div className="loading-spinner">
            <Loader2 size={48} className="spinning" />
          </div>
          <h3>Loading Students</h3>
          <p>Fetching students with pending fees...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="send-reminder-page">
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
            <Bell size={28} />
          </div>
          <div className="header-text">
            <h1>Send Fee Reminders</h1>
            <p>Send SMS/WhatsApp reminders to students with pending fees</p>
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
        <div className="stat-card students">
          <div className="stat-icon-wrapper">
            <Users size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-label">Pending Students</span>
            <span className="stat-value">{stats.totalStudents}</span>
          </div>
        </div>

        <div className="stat-card amount">
          <div className="stat-icon-wrapper">
            <IndianRupee size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-label">Total Due</span>
            <span className="stat-value">{formatCurrency(stats.totalDue)}</span>
          </div>
        </div>

        <div className="stat-card overdue">
          <div className="stat-icon-wrapper">
            <AlertTriangle size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-label">Overdue</span>
            <span className="stat-value">{stats.overdueCount}</span>
          </div>
        </div>

        <div className="stat-card selected">
          <div className="stat-icon-wrapper">
            <CheckCircle size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-label">Selected</span>
            <span className="stat-value">{stats.selectedCount}</span>
          </div>
          {stats.selectedCount > 0 && (
            <span className="stat-badge">{formatCurrency(stats.selectedDue)}</span>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="reminder-container">
        {/* Message Configuration */}
        <div className="config-panel glass-card">
          <div className="panel-header">
            <div className="panel-icon">
              <MessageSquare size={20} />
            </div>
            <div>
              <h3>Message Configuration</h3>
              <p>Customize the reminder message</p>
            </div>
          </div>

          <div className="message-section">
            <div className="form-group">
              <label>
                <MessageSquare size={14} />
                Custom Message <span className="optional">(Optional)</span>
              </label>
              <textarea
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                placeholder={defaultMessage}
                rows="4"
                className="form-textarea"
              />
              <small className="help-text">
                Leave empty to use the default message. Use ₹XXX as placeholder for amount.
              </small>
            </div>

            {/* Message Preview */}
            <div className="message-preview">
              <div className="preview-header">
                <Sparkles size={16} />
                <span>Message Preview</span>
              </div>
              <div className="preview-content">
                <div className="phone-frame">
                  <div className="message-bubble">
                    {customMessage || defaultMessage}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Send Summary */}
          <div className="send-summary">
            <div className="summary-row">
              <span>Selected Students:</span>
              <strong>{stats.selectedCount}</strong>
            </div>
            <div className="summary-row">
              <span>Total Due Amount:</span>
              <strong className="amount">{formatCurrency(stats.selectedDue)}</strong>
            </div>
          </div>

          {/* Send Button */}
          <button
            className="send-btn"
            onClick={handleSendReminders}
            disabled={sending || selectedStudents.length === 0}
          >
            {sending ? (
              <>
                <Loader2 size={20} className="spinning" />
                <span>Sending Reminders...</span>
              </>
            ) : (
              <>
                <Send size={20} />
                <span>Send Reminders ({stats.selectedCount})</span>
              </>
            )}
          </button>
        </div>

        {/* Students List */}
        <div className="students-panel glass-card">
          <div className="panel-header">
            <div className="panel-icon">
              <Users size={20} />
            </div>
            <div>
              <h3>Students with Pending Fees</h3>
              <p>Select students to send reminders</p>
            </div>
          </div>

          {/* Search */}
          <div className="search-wrapper">
            <Search size={18} />
            <input
              type="text"
              placeholder="Search by name or mobile..."
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

          {/* Select All */}
          <div className="select-all-row">
            <button
              className="select-all-btn"
              onClick={handleSelectAll}
            >
              {selectedStudents.length === filteredStudents.length && filteredStudents.length > 0 ? (
                <CheckSquare size={18} />
              ) : (
                <Square size={18} />
              )}
              <span>
                {selectedStudents.length === filteredStudents.length && filteredStudents.length > 0
                  ? 'Deselect All'
                  : 'Select All'}
              </span>
              <span className="count">({filteredStudents.length})</span>
            </button>
          </div>

          {/* Students List */}
          {overdueStudents.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">
                <CheckCircle size={48} />
              </div>
              <h4>All Clear!</h4>
              <p>No pending fees. All students are up to date.</p>
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">
                <Search size={48} />
              </div>
              <h4>No Results</h4>
              <p>No students match your search.</p>
              <button className="btn btn-secondary" onClick={() => setSearchTerm("")}>
                Clear Search
              </button>
            </div>
          ) : (
            <div className="students-list">
              {filteredStudents.map(student => {
                const isSelected = selectedStudents.includes(student.student_id);

                return (
                  <div
                    key={student.student_id}
                    className={`student-item ${isSelected ? 'selected' : ''} ${student.has_overdue ? 'overdue' : ''}`}
                    onClick={() => handleSelectStudent(student.student_id)}
                  >
                    <div className="student-checkbox">
                      {isSelected ? (
                        <CheckSquare size={20} />
                      ) : (
                        <Square size={20} />
                      )}
                    </div>

                    <div className="student-info">
                      <div className="student-name">{student.student_name}</div>
                      <div className="student-meta">
                        <span>S/O {student.father_name}</span>
                      </div>
                      <div className="student-contact">
                        <Phone size={12} />
                        <span>{student.father_mobile || student.student_mobile}</span>
                      </div>
                    </div>

                    <div className="student-due">
                      <span className="due-amount">{formatCurrency(student.total_due)}</span>
                      <span className="due-count">{student.fee_count} fee(s)</span>
                      {student.has_overdue && (
                        <span className="overdue-badge">
                          <AlertTriangle size={12} />
                          Overdue
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal({ ...confirmModal, isOpen: false })}
        type={confirmModal.type}
      />
    </div>
  );
};

export default SendReminder;