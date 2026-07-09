import { useEffect, useState, useMemo } from "react";
import { memberAPI } from "../../services/api/member.api";
import { getFileUrl } from "../../utils/imageSrc";
import MemberForm from "./MemberForm";
import MemberDetails from "./MemberDetails";
import SalaryPayment from "./SalaryPayment";
import "./member.css";

const Icons = {
  search: "🔍", plus: "➕", edit: "✏️", view: "👁️", delete: "🗑️",
  money: "💰", phone: "📱", calendar: "📅", user: "👤", father: "👨",
  id: "🪪", success: "✓", error: "✕", empty: "📋", close: "✕",
  collected: "📥", salary: "💵", carryForward: "📦"
};

const ID_TYPE_LABELS = {
  aadhar: "Aadhar Card", pan: "PAN Card", passport: "Passport",
  driving_license: "Driving License", voter_id: "Voter ID", other: "Other"
};

const Members = () => {
  const [members, setMembers] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [pageLoading, setPageLoading] = useState(true);
  const [showFormModal, setShowFormModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showSalaryModal, setShowSalaryModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [toast, setToast] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState(null);

  useEffect(() => {
    setShowFormModal(false);
    setShowDetailsModal(false);
    setShowSalaryModal(false);
    setSelectedMember(null);
    setIsEditing(false);
    loadMembers();
  }, []);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const loadMembers = async () => {
    try {
      setPageLoading(true);
      const res = await memberAPI.getAll();
      const activeMembers = (res.data.data || []).filter(m => m.is_active !== 0);
      setMembers(activeMembers);
    } catch (error) {
      showToast("Failed to load members", "error");
    } finally {
      setPageLoading(false);
    }
  };

  const showToast = (message, type = "success") => {
    setToast({ message, type });
  };

  const stats = useMemo(() => {
    // ✅ FIX ISSUE 1: Use correct backend field names
    const totalFeeCollected = members.reduce((sum, m) => sum + (m.total_fee_collected || 0), 0);
    const totalManualPaid = members.reduce((sum, m) => sum + (m.total_manual_paid || 0), 0);
    const totalSalary = members.reduce((sum, m) => sum + (parseFloat(m.salary) || 0), 0);
    // total_salary_earned = fee_collected + manual_paid (combined on backend)
    const totalSalaryEarned = members.reduce((sum, m) => sum + (m.total_salary_earned || 0), 0);
    const totalPendingAdvances = members.reduce((sum, m) => sum + (m.pending_advances || 0), 0);
    return { total: members.length, totalFeeCollected, totalManualPaid, totalSalary, totalSalaryEarned, totalPendingAdvances };
  }, [members]);

  const filteredMembers = useMemo(() => {
    if (!searchQuery) return members;
    const query = searchQuery.toLowerCase();
    return members.filter(member =>
      member.name?.toLowerCase().includes(query) ||
      member.mobile?.includes(searchQuery) ||
      member.father_name?.toLowerCase().includes(query) ||
      member.id_number?.toLowerCase().includes(query)
    );
  }, [members, searchQuery]);

  const handleAddMember = () => { setSelectedMember(null); setIsEditing(false); setShowFormModal(true); };
  const handleEditMember = (member) => { setSelectedMember(member); setIsEditing(true); setShowFormModal(true); };
  const handleViewDetails = (member) => { setSelectedMember(member); setShowDetailsModal(true); };
  const handlePaySalary = (member) => { setSelectedMember(member); setShowSalaryModal(true); };

  const handleDeleteMember = (member) => {
    setConfirmDialog({
      title: "Delete Member",
      message: `Are you sure you want to delete "${member.name}"? This action cannot be undone.`,
      onConfirm: async () => {
        try {
          await memberAPI.deactivate(member.member_id);
          showToast("Member deleted successfully");
          loadMembers();
          setConfirmDialog(null);
        } catch (error) {
          showToast("Failed to delete member", "error");
        }
      },
      onCancel: () => setConfirmDialog(null)
    });
  };

  const handleFormSuccess = () => {
    setShowFormModal(false);
    loadMembers();
    showToast(isEditing ? "Member updated successfully" : "Member added successfully");
  };

  const handleSalarySuccess = () => {
    setShowSalaryModal(false);
    loadMembers();
    showToast("Salary paid successfully");
  };

  const getInitials = (name) => name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || "??";

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(amount || 0);
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

  // ✅ FIX ISSUE 1: Combined salary status (fee collected + manual paid)
  const getSalaryStatus = (member) => {
    const salary = parseFloat(member.salary) || 0;
    // total_salary_earned = fee_collected + manual_paid (already combined on backend)
    const earned = member.total_salary_earned || 0;
    if (salary <= 0) return { label: "No Salary", color: "gray" };
    if (earned >= salary) return { label: "Fully Paid", color: "green" };
    if (earned > 0) return { label: "Partial", color: "orange" };
    return { label: "Pending", color: "red" };
  };

  return (
    <div className="member-page">
      {toast && (
        <div className="toast-container">
          <div className={`toast ${toast.type}`}>
            <span className="toast-icon">{toast.type === "success" ? Icons.success : Icons.error}</span>
            <span className="toast-message">{toast.message}</span>
          </div>
        </div>
      )}

      {confirmDialog && (
        <div className="modal-overlay" onClick={confirmDialog.onCancel}>
          <div className="confirm-dialog" onClick={e => e.stopPropagation()}>
            <div className="confirm-dialog-icon delete">{Icons.delete}</div>
            <h3>{confirmDialog.title}</h3>
            <p>{confirmDialog.message}</p>
            <div className="confirm-dialog-actions">
              <button className="btn btn-secondary" onClick={confirmDialog.onCancel}>Cancel</button>
              <button className="btn btn-danger" onClick={confirmDialog.onConfirm}>Delete</button>
            </div>
          </div>
        </div>
      )}

      <div className="member-header">
        <div className="member-header-left">
          <h2>Members Management</h2>
          <p>Manage staff members — Any fee they collect counts toward their salary</p>
        </div>
        <button className="btn btn-primary" onClick={handleAddMember}>{Icons.plus} Add Member</button>
      </div>

      <div className="member-stats">
        <div className="stat-card total">
          <div className="stat-value">{stats.total}</div>
          <div className="stat-label">Total Members</div>
        </div>
        <div className="stat-card paid">
          <div className="stat-value">{formatCurrency(stats.totalSalaryEarned)}</div>
          <div className="stat-label">{Icons.money} Total Salary Paid</div>
        </div>
        <div className="stat-card salary">
          <div className="stat-value">{formatCurrency(stats.totalSalary)}</div>
          <div className="stat-label">{Icons.salary} Monthly Salary Bill</div>
        </div>
        {stats.totalPendingAdvances > 0 && (
          <div className="stat-card carry-forward">
            <div className="stat-value">{formatCurrency(stats.totalPendingAdvances)}</div>
            <div className="stat-label">{Icons.carryForward} Pending Advances</div>
          </div>
        )}
      </div>

      <div className="member-toolbar">
        <div className="search-box">
          <span className="search-icon">{Icons.search}</span>
          <input type="text" placeholder="Search by name, mobile, father's name..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
        </div>
        <div className="members-count">
          Showing <strong>{filteredMembers.length}</strong> of <strong>{members.length}</strong> members
        </div>
      </div>

      {pageLoading ? (
        <div className="member-grid">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="skeleton-card">
              <div className="skeleton-header">
                <div className="skeleton skeleton-avatar"></div>
                <div className="skeleton-info">
                  <div className="skeleton skeleton-text medium"></div>
                  <div className="skeleton skeleton-text short"></div>
                </div>
              </div>
              <div className="skeleton skeleton-text"></div>
              <div className="skeleton skeleton-text short"></div>
            </div>
          ))}
        </div>
      ) : filteredMembers.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">{Icons.empty}</div>
          <h3>{searchQuery ? 'No members found' : 'No members yet'}</h3>
          <p>{searchQuery ? 'Try adjusting your search criteria' : 'Click "Add Member" to add your first member'}</p>
        </div>
      ) : (
        <div className="member-grid">
          {filteredMembers.map((member) => {
            const salaryStatus = getSalaryStatus(member);
            return (
              <div key={member.member_id} className="member-card">
                <div className="member-card-header">
                  <div className="member-avatar">
                    {member.photo_url ? (
                      <img
                        src={getFileUrl(member.photo_url)}
                        alt={member.name}
                        className="member-avatar-photo"
                        onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                      />
                    ) : null}
                    <div className="member-avatar-initials" style={{ display: !member.photo_url ? 'flex' : 'none' }}>
                      {getInitials(member.name)}
                    </div>
                  </div>
                  <div className="member-badges">
                    <span className="member-badge">ID: {member.member_id}</span>
                    {member.salary > 0 && (
                      <span className="member-badge salary-badge">{formatCurrency(member.salary)}/mo</span>
                    )}
                    <span className={`member-badge status-badge status-${salaryStatus.color}`}>
                      {salaryStatus.label}
                    </span>
                  </div>
                </div>

                <div className="member-info">
                  <div className="member-name">{member.name}</div>
                  {member.father_name && (
                    <div className="member-detail"><span className="icon">{Icons.father}</span>S/O {member.father_name}</div>
                  )}
                  <div className="member-detail"><span className="icon">{Icons.phone}</span>{member.mobile || 'No mobile'}</div>
                  {member.dob && (
                    <div className="member-detail">
                      <span className="icon">{Icons.calendar}</span>{formatDate(member.dob)} ({calculateAge(member.dob)} yrs)
                    </div>
                  )}
                  {member.id_type && (
                    <div className="member-detail">
                      <span className="icon">{Icons.id}</span>{ID_TYPE_LABELS[member.id_type] || member.id_type}: {member.id_number || 'N/A'}
                    </div>
                  )}
                </div>

                <div className="member-stats-row">
                  <div className="member-stat">
                    <span className="stat-label">Total Salary Paid</span>
                    <span className="stat-value salary" style={{ fontWeight: 800 }}>{formatCurrency(member.total_salary_earned || 0)}</span>
                  </div>
                  <div className="member-stat">
                    <span className="stat-label">Monthly Salary</span>
                    <span className="stat-value collected">{formatCurrency(member.salary || 0)}</span>
                  </div>
                </div>

                <div className="member-card-actions">
                  <button className="btn btn-primary btn-sm" onClick={() => handleViewDetails(member)}>{Icons.view} View</button>
                  <button className="btn btn-success btn-sm" onClick={() => handlePaySalary(member)}>{Icons.money} Pay Salary</button>
                  <button className="btn btn-secondary btn-sm" onClick={() => handleEditMember(member)}>{Icons.edit}</button>
                  <button className="btn btn-danger btn-sm" onClick={() => handleDeleteMember(member)}>{Icons.delete}</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showFormModal && (
        <MemberForm member={selectedMember} isEditing={isEditing} onClose={() => setShowFormModal(false)} onSuccess={handleFormSuccess} showToast={showToast} />
      )}
      {showDetailsModal && selectedMember && (
        <MemberDetails
          member={selectedMember}
          onClose={() => setShowDetailsModal(false)}
          onEdit={() => { setShowDetailsModal(false); handleEditMember(selectedMember); }}
          onPaySalary={() => { setShowDetailsModal(false); handlePaySalary(selectedMember); }}
          onDelete={() => { setShowDetailsModal(false); handleDeleteMember(selectedMember); }}
          showToast={showToast}
        />
      )}
      {showSalaryModal && selectedMember && (
        <SalaryPayment member={selectedMember} onClose={() => setShowSalaryModal(false)} onSuccess={handleSalarySuccess} showToast={showToast} />
      )}
    </div>
  );
};

export default Members;