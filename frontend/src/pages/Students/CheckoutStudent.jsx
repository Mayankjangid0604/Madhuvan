import React, { useState, useEffect } from "react";
import {
  X,
  AlertTriangle,
  Calendar,
  User,
  MessageSquare,
  LogOut,
  Info,
  IndianRupee,
  Wallet,
  Shield,
} from "lucide-react";
import { roomAPI } from "../../services/api/room.api";
import { fineAPI } from "../../services/api/fine.api";
import { feeAPI } from "../../services/api/fee.api";
import { settingsAPI } from "../../services/api/settings.api";
import { printInvoice } from "../../utils/feeDocuments";
import Button from "../../components/buttons/Button";
import ConfirmModal from "../../components/modals/ConfirmModal";
import DateInput from "../../components/common/DateInput";
import "./checkoutStudent.css";

const CheckoutStudent = ({ student, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    checkout_date: new Date().toISOString().split("T")[0],
    reason: "",
    remarks: "",
    refund_amount: "",
    payment_mode: "Cash",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [securityInfo, setSecurityInfo] = useState(null);
  const [successModal, setSuccessModal] = useState({
    isOpen: false,
    message: ""
  });

  // Fetch security deposit info
  useEffect(() => {
    if (student?.student_id) {
      fineAPI.getStudentSecurity(student.student_id)
        .then(res => {
          const data = res.data?.data;
          if (data) {
            setSecurityInfo(data);
            if (data.remaining_security > 0) {
              setFormData(prev => ({
                ...prev,
                refund_amount: String(data.remaining_security)
              }));
            }
          }
        })
        .catch(err => console.error("Failed to fetch security info:", err));
    }
  }, [student?.student_id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!formData.reason.trim()) {
      setError("Please select a checkout reason");
      return;
    }

    // Validate refund amount if entered
    const refundAmount = Number(formData.refund_amount || 0);
    if (formData.refund_amount && refundAmount < 0) {
      setError("Refund amount cannot be negative");
      return;
    }

    setLoading(true);
    try {
      const response = await roomAPI.checkoutStudent({
        student_id: student.student_id,
        checkout_date: formData.checkout_date,
        reason: formData.reason,
        remarks: formData.remarks,
        refund_amount: refundAmount,
        payment_mode: formData.payment_mode,
      });

      // Build success message
      let message = "✅ Student checked out successfully!";

      const responseData = response.data?.data || response.data;

      if (responseData?.refund_amount > 0) {
        message += `\n\n💰 Refund Amount: ₹${responseData.refund_amount.toLocaleString("en-IN")}`;
        message += `\n📝 Ledger entry created for security deposit refund.`;
      }

      setSuccessModal({
        isOpen: true,
        message: message
      });
    } catch (error) {
      console.error("Checkout failed:", error);
      setError(error.response?.data?.message || "Checkout failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const checkoutReasons = [
    { value: "", label: "Select reason" },
    { value: "Course Completed", label: "Course Completed" },
    { value: "Changed Coaching", label: "Changed Coaching" },
    { value: "Personal Reasons", label: "Personal Reasons" },
    { value: "Disciplinary Issues", label: "Disciplinary Issues" },
    { value: "Fee Non-Payment", label: "Fee Non-Payment" },
    { value: "Relocation", label: "Relocation" },
    { value: "Health Issues", label: "Health Issues" },
    { value: "Other", label: "Other" },
  ];

  const paymentModes = [
    { value: "Cash", label: "Cash" },
    { value: "UPI", label: "UPI" },
    { value: "Bank Transfer", label: "Bank Transfer" },
    { value: "Cheque", label: "Cheque" },
  ];

  const refundAmount = Number(formData.refund_amount || 0);

  return (
    <div className="checkout-modal-overlay" onClick={onClose}>
      <div
        className="checkout-modal"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="checkout-modal-header">
          <div className="header-info">
            <div className="header-icon">
              <LogOut size={24} />
            </div>
            <div>
              <h2>Checkout Student</h2>
              <p>{student.student_name}</p>
            </div>
          </div>
          <button className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Student Info Summary */}
        <div className="student-summary">
          <div className="summary-item">
            <User size={16} />
            <span>ID: {student.student_id}</span>
          </div>
          <div className="summary-item">
            <User size={16} />
            <span>D/O: {student.father_name || "N/A"}</span>
          </div>
          <div className="summary-item">
            <Calendar size={16} />
            <span>
              Joined:{" "}
              {new Date(student.date_of_joining).toLocaleDateString("en-IN")}
            </span>
          </div>
          {student.room_no && student.room_no !== "Not Allocated" && (
            <div className="summary-item">
              <Info size={16} />
              <span>Room: {student.room_no}</span>
            </div>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="checkout-error">
            <AlertTriangle size={18} />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="checkout-form">
          {/* Checkout Date */}
          <div className="form-group">
            <label>
              <Calendar size={16} />
              Checkout Date <span className="required">*</span>
            </label>
            <DateInput
              value={formData.checkout_date}
              onChange={(val) =>
                setFormData({ ...formData, checkout_date: val })
              }
            />
          </div>

          {/* Reason */}
          <div className="form-group">
            <label>
              <MessageSquare size={16} />
              Checkout Reason <span className="required">*</span>
            </label>
            <select
              value={formData.reason}
              onChange={(e) =>
                setFormData({ ...formData, reason: e.target.value })
              }
              required
            >
              {checkoutReasons.map((reason) => (
                <option key={reason.value} value={reason.value}>
                  {reason.label}
                </option>
              ))}
            </select>
          </div>

          {/* Remarks */}
          <div className="form-group">
            <label>Additional Remarks</label>
            <textarea
              value={formData.remarks}
              onChange={(e) =>
                setFormData({ ...formData, remarks: e.target.value })
              }
              rows="3"
              placeholder="Any additional notes about this checkout..."
            />
          </div>

          {/* Security Deposit Refund Section */}
          <div className="checkout-section refund-section">
            <div className="section-header-title">
              <Wallet size={20} />
              <span>Security Deposit Refund</span>
            </div>

            <div className="section-content">
              {/* Security Balance Summary */}
              {securityInfo && (
                <div style={{
                  background: "#f0f9ff",
                  border: "1px solid #bae6fd",
                  borderRadius: "8px",
                  padding: "12px 16px",
                  marginBottom: "16px"
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                    <Shield size={18} style={{ color: "#0369a1" }} />
                    <strong style={{ color: "#0369a1", fontSize: "14px" }}>Security Deposit Balance</strong>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", fontSize: "13px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "#64748b" }}>Original Amount:</span>
                      <strong>₹{(securityInfo.security_paid || 0).toLocaleString("en-IN")}</strong>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "#64748b" }}>Total Deductions:</span>
                      <strong style={{ color: securityInfo.total_deductions > 0 ? "#dc2626" : "#333" }}>
                        ₹{(securityInfo.total_deductions || 0).toLocaleString("en-IN")}
                      </strong>
                    </div>
                  </div>
                  <div style={{
                    marginTop: "8px",
                    paddingTop: "8px",
                    borderTop: "1px solid #bae6fd",
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: "15px",
                    fontWeight: "700",
                    color: "#0369a1"
                  }}>
                    <span>Available for Refund:</span>
                    <span>₹{(securityInfo.remaining_security || 0).toLocaleString("en-IN")}</span>
                  </div>
                  {securityInfo.deductions && securityInfo.deductions.length > 0 && (
                    <div style={{ marginTop: "8px", fontSize: "12px", color: "#64748b" }}>
                      <div style={{ fontWeight: "600", marginBottom: "4px" }}>Deduction History:</div>
                      {securityInfo.deductions.map((d, i) => (
                        <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "2px 0" }}>
                          <span>{d.type}: {d.description || "N/A"}</span>
                          <span style={{ color: "#dc2626" }}>-₹{Number(d.amount).toLocaleString("en-IN")}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="form-row">
                <div className="form-group flex-2">
                  <label>
                    <IndianRupee size={16} />
                    Refund Amount (₹)
                  </label>
                  <input
                    type="number"
                    value={formData.refund_amount}
                    onChange={(e) =>
                      setFormData({ ...formData, refund_amount: e.target.value })
                    }
                    min="0"
                    max={securityInfo?.remaining_security || undefined}
                    step="1"
                    placeholder="Enter amount to refund (0 if none)"
                  />
                  <span className="input-hint">
                    Enter the security deposit amount to refund. Leave empty or 0 if no refund.
                  </span>
                </div>

                <div className="form-group flex-1">
                  <label>Payment Mode</label>
                  <select
                    value={formData.payment_mode}
                    onChange={(e) =>
                      setFormData({ ...formData, payment_mode: e.target.value })
                    }
                  >
                    {paymentModes.map((mode) => (
                      <option key={mode.value} value={mode.value}>
                        {mode.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Refund Preview */}
              {refundAmount > 0 && (
                <div className="refund-preview">
                  <div className="preview-header">
                    <IndianRupee size={18} />
                    <span>Refund Summary</span>
                  </div>
                  <div className="preview-content">
                    <div className="preview-row">
                      <span>Refund Amount</span>
                      <span className="amount">₹{refundAmount.toLocaleString("en-IN")}</span>
                    </div>
                    <div className="preview-row">
                      <span>Payment Mode</span>
                      <span>{formData.payment_mode}</span>
                    </div>
                    <div className="preview-row ledger-entry">
                      <span>Ledger Entry</span>
                      <span className="entry-type">Expense (Debit)</span>
                    </div>
                  </div>
                  <div className="preview-description">
                    <Info size={14} />
                    <span>
                      Description: Security deposit refunded to <strong>{student.student_name}</strong> D/O <strong>{student.father_name || "N/A"}</strong>
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Warning Notice */}
          <div className="checkout-warning">
            <AlertTriangle size={18} />
            <p>
              This action cannot be undone. The student will be marked as
              checked out and their room allocation will be released.
              {refundAmount > 0 && (
                <strong> A ledger entry will be created for the ₹{refundAmount.toLocaleString("en-IN")} refund.</strong>
              )}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="checkout-actions">
            <Button variant="secondary" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button
              variant="primary"
              type="button"
              disabled={loading}
              onClick={async () => {
                try {
                  const [previewRes, hostelRes] = await Promise.all([
                    feeAPI.getEarlyExitInvoice(student.student_id, formData.checkout_date),
                    settingsAPI.getHostelInfo().catch(() => ({ data: { data: {} } })),
                  ]);
                  const preview = previewRes.data?.data;
                  const hostel = hostelRes.data?.data || {};
                  if (!preview) {
                    alert("Could not compute exit invoice.");
                    return;
                  }
                  if (!preview.applies) {
                    const ok = window.confirm(
                      `Student has stayed ${preview.days_stayed} days (>= 90). No accommodation GST will apply. Print anyway?`
                    );
                    if (!ok) return;
                  }
                  printInvoice({
                    hostel,
                    student,
                    invoice_no: `INV-EXIT-${student.student_id}`,
                    invoice_date: formData.checkout_date,
                    due_date: formData.checkout_date,
                    period_start: student.date_of_joining,
                    period_end: formData.checkout_date,
                    accommodation_amount: preview.total_accommodation,
                    mess_amount: preview.mess_remaining,
                    apply_accommodation_gst: preview.applies,
                  });
                } catch (err) {
                  alert(err.response?.data?.message || "Failed to generate exit invoice");
                }
              }}
            >
              🧾 Preview / Print Exit Invoice
            </Button>
            <Button variant="danger" type="submit" disabled={loading}>
              <LogOut size={16} />
              {loading ? "Processing..." : "Confirm Checkout"}
            </Button>
          </div>
        </form>
      </div>

      <ConfirmModal
        isOpen={successModal.isOpen}
        title="Success"
        message={successModal.message}
        onConfirm={() => {
          setSuccessModal({ isOpen: false, message: "" });
          onSuccess();
          onClose();
        }}
        showCancel={false}
        confirmText="Done"
        type="success"
      />
    </div>
  );
};

export default CheckoutStudent;