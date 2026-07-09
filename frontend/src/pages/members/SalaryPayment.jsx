import { useState, useEffect } from "react";
import { memberAPI } from "../../services/api/member.api";
import SalaryReceipt from "./SalaryReceipt";
import DateInput from "../../components/common/DateInput";
import "./salaryPayment.css";

const Icons = {
  close: "✕",
  money: "💰",
  info: "ℹ️",
  warning: "⚠️",
  success: "✅"
};

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const PAYMENT_MODES = [
  { value: "Cash", label: "Cash" },
  { value: "UPI", label: "UPI" },
  { value: "Bank Transfer", label: "Bank Transfer" },
  { value: "Cheque", label: "Cheque" },
  { value: "Other", label: "Other" }
];

const SalaryPayment = ({ member, onClose, onSuccess, showToast }) => {
  const currentDate = new Date();
  // Default to PREVIOUS month (salary paid after month completes)
  let defaultMonth = currentDate.getMonth() - 1;
  let defaultYear = currentDate.getFullYear();
  if (defaultMonth < 0) { defaultMonth = 11; defaultYear--; }

  const [form, setForm] = useState({
    amount: "",
    payment_date: currentDate.toISOString().split('T')[0],
    payment_month: MONTHS[defaultMonth],
    payment_year: defaultYear,
    payment_mode: "Cash",
    reference_no: "",
    notes: ""
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [showReceipt, setShowReceipt] = useState(false);
  const [paymentData, setPaymentData] = useState(null);
  const [salaryStatus, setSalaryStatus] = useState(null);
  const [loadingStatus, setLoadingStatus] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!form.amount || parseFloat(form.amount) <= 0) {
      newErrors.amount = "Valid amount is required";
    }
    if (!form.payment_month) {
      newErrors.payment_month = "Select payment month";
    }
    if (!form.payment_year) {
      newErrors.payment_year = "Enter payment year";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      setLoading(true);
      const response = await memberAPI.paySalary(member.member_id, {
        amount: parseFloat(form.amount),
        payment_date: form.payment_date,
        payment_month: form.payment_month,
        payment_year: parseInt(form.payment_year),
        payment_mode: form.payment_mode,
        reference_no: form.reference_no || null,
        notes: form.notes || null
      });

      // Store payment data for receipt
      setPaymentData({
        ...form,
        payment_id: response.data.data.payment_id,
        receipt_number: response.data.data.receipt_number,
        amount: parseFloat(form.amount),
        payment_year: parseInt(form.payment_year)
      });

      setShowReceipt(true);
      showToast("Salary paid successfully", "success");
    } catch (error) {
      showToast(error.response?.data?.message || "Failed to pay salary", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleReceiptClose = () => {
    setShowReceipt(false);
    onSuccess();
  };

  // Generate year options (last 2 years + current + next year)
  const yearOptions = [];
  const cy = currentDate.getFullYear();
  for (let y = cy - 2; y <= cy + 1; y++) {
    yearOptions.push(y);
  }

  // Format date for display (DD MMM YYYY)
  const formatPeriodDate = (dateStr) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length < 3) return dateStr;
    const d = parseInt(parts[2]);
    const m = parseInt(parts[1]) - 1;
    const shortMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${d} ${shortMonths[m]} ${parts[0]}`;
  };

  const loadSalaryStatus = async () => {
    try {
      setLoadingStatus(true);
      const response = await memberAPI.getMemberSalaryStatus(
        member.member_id,
        form.payment_month,
        form.payment_year
      );
      setSalaryStatus(response.data.data);

      // Auto-fill remaining amount if applicable
      if (response.data.data.remaining > 0 && !form.amount) {
        setForm(prev => ({ ...prev, amount: response.data.data.remaining }));
      }
    } catch (error) {
      console.error('Failed to load salary status:', error);
    } finally {
      setLoadingStatus(false);
    }
  };

  // Load salary status when month/year changes
  useEffect(() => {
    if (form.payment_month && form.payment_year) {
      loadSalaryStatus();
    }
  }, [form.payment_month, form.payment_year]);

  if (showReceipt && paymentData) {
    return (
      <SalaryReceipt
        payment={paymentData}
        member={member}
        onClose={handleReceiptClose}
      />
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container" onClick={e => e.stopPropagation()}>
        <div className="modal-header success">
          <div className="modal-title">
            <span className="modal-icon">{Icons.money}</span>
            <h3>Pay Salary</h3>
          </div>
          <button className="modal-close light" onClick={onClose}>{Icons.close}</button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body">
          {/* Member Info */}
          <div className="salary-member-info">
            <div className="member-name">{member.name}</div>
            <div className="member-salary">Base Monthly Salary: <strong>₹{member.salary || 0}</strong></div>
          </div>

          {/* Salary Status Information */}
          {salaryStatus && !loadingStatus && (
            <div className="salary-status-box">
              <div className="status-title">
                <span>{Icons.info}</span> Salary Status for {salaryStatus.month} {salaryStatus.year}
              </div>

              {/* Current/Future month warning */}
              {(salaryStatus.is_current_month || salaryStatus.is_future_month) && (
                <div className="status-warning" style={{ marginBottom: 10 }}>
                  {Icons.warning} {salaryStatus.is_current_month
                    ? "This month is still in progress. Salary is payable after the month completes."
                    : "This is a future month. Salary cannot be paid yet."}
                </div>
              )}

              {/* Before joining warning */}
              {salaryStatus.is_before_joining && (
                <div className="status-warning" style={{ marginBottom: 10 }}>
                  {Icons.warning} Member had not joined yet during this month.
                </div>
              )}

              {/* Salary Period */}
              {salaryStatus.salary_period_start && salaryStatus.salary_period_end && !salaryStatus.is_before_joining && (
                <div className="status-row" style={{ marginBottom: 6, fontSize: '0.9em', color: '#6b7280' }}>
                  <span className="status-label">Salary Period:</span>
                  <span className="status-value">{formatPeriodDate(salaryStatus.salary_period_start)} — {formatPeriodDate(salaryStatus.salary_period_end)}</span>
                </div>
              )}

              <div className="status-grid">
                <div className="status-row">
                  <span className="status-label">Base Salary:</span>
                  <span className="status-value">₹{salaryStatus.base_salary}</span>
                </div>

                {/* Prorated info */}
                {salaryStatus.is_prorated && (
                  <div className="status-row" style={{ color: '#d97706' }}>
                    <span className="status-label">Prorated ({salaryStatus.days_worked}/{salaryStatus.days_in_month} days):</span>
                    <span className="status-value">₹{salaryStatus.effective_base_salary}</span>
                  </div>
                )}

                {salaryStatus.advance_from_previous > 0 && (
                  <div className="status-row advance">
                    <span className="status-label">Advance from Previous Month:</span>
                    <span className="status-value">-₹{salaryStatus.advance_from_previous}</span>
                  </div>
                )}

                <div className="status-row">
                  <span className="status-label">Effective Salary Needed:</span>
                  <span className="status-value strong">₹{salaryStatus.effective_salary_needed}</span>
                </div>

                {salaryStatus.fee_collected > 0 && (
                  <div className="status-row collected">
                    <span className="status-label">Collected via Fees:</span>
                    <span className="status-value">₹{salaryStatus.fee_collected}</span>
                    <span className="status-extra">({salaryStatus.fee_collections_count} collections)</span>
                  </div>
                )}

                {salaryStatus.manual_paid > 0 && (
                  <div className="status-row paid">
                    <span className="status-label">Already Paid Manually:</span>
                    <span className="status-value">₹{salaryStatus.manual_paid}</span>
                    <span className="status-extra">({salaryStatus.manual_payments_count} payments)</span>
                  </div>
                )}

                <div className="status-divider"></div>

                {salaryStatus.remaining > 0 ? (
                  <div className="status-row remaining">
                    <span className="status-label">Remaining to Pay:</span>
                    <span className="status-value highlight-red">₹{salaryStatus.remaining}</span>
                  </div>
                ) : salaryStatus.excess > 0 ? (
                  <div className="status-row excess">
                    <span className="status-label">Excess (will carry to next month):</span>
                    <span className="status-value highlight-green">₹{salaryStatus.excess}</span>
                  </div>
                ) : (
                  <div className="status-row complete">
                    <span className="status-label">{Icons.success} Salary Fully Paid</span>
                  </div>
                )}
              </div>

              {salaryStatus.excess > 0 && parseFloat(form.amount || 0) > 0 && (
                <div className="status-warning">
                  {Icons.warning} Additional payment will increase advance for next month
                </div>
              )}
            </div>
          )}

          <div className="form-grid">
            {/* Month */}
            <div className="form-group">
              <label>Salary Month <span className="required">*</span></label>
              <select
                name="payment_month"
                value={form.payment_month}
                onChange={handleChange}
                className={errors.payment_month ? "error" : ""}
              >
                {MONTHS.map(month => (
                  <option key={month} value={month}>{month}</option>
                ))}
              </select>
              {errors.payment_month && <span className="error-text">{errors.payment_month}</span>}
            </div>

            {/* Year */}
            <div className="form-group">
              <label>Salary Year <span className="required">*</span></label>
              <select
                name="payment_year"
                value={form.payment_year}
                onChange={handleChange}
                className={errors.payment_year ? "error" : ""}
              >
                {yearOptions.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
              {errors.payment_year && <span className="error-text">{errors.payment_year}</span>}
            </div>

            {/* Amount */}
            <div className="form-group">
              <label>Amount (₹) <span className="required">*</span></label>
              <input
                type="number"
                name="amount"
                value={form.amount}
                onChange={handleChange}
                placeholder="Enter amount"
                min="0"
                step="1"
                className={errors.amount ? "error" : ""}
              />
              {errors.amount && <span className="error-text">{errors.amount}</span>}
            </div>

            {/* Payment Date */}
            <div className="form-group">
              <label>Payment Date</label>
              <DateInput
                value={form.payment_date}
                onChange={(val) => setForm(prev => ({ ...prev, payment_date: val }))}
              />
            </div>

            {/* Payment Mode */}
            <div className="form-group">
              <label>Payment Mode</label>
              <select
                name="payment_mode"
                value={form.payment_mode}
                onChange={handleChange}
              >
                {PAYMENT_MODES.map(mode => (
                  <option key={mode.value} value={mode.value}>{mode.label}</option>
                ))}
              </select>
            </div>

            {/* Reference */}
            <div className="form-group">
              <label>Reference No.</label>
              <input
                type="text"
                name="reference_no"
                value={form.reference_no}
                onChange={handleChange}
                placeholder="Transaction ID / Cheque No."
              />
            </div>

            {/* Notes */}
            <div className="form-group full-width">
              <label>Notes (Optional)</label>
              <textarea
                name="notes"
                value={form.notes}
                onChange={handleChange}
                placeholder="Any additional notes..."
                rows={2}
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-success" disabled={loading || (salaryStatus && (salaryStatus.is_future_month))}>
              {loading ? "Processing..." : `Pay ₹${form.amount || 0}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SalaryPayment;