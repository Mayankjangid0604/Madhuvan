import { useRef, useEffect, useState } from "react";
import { X, Printer } from "lucide-react";
import { settingsAPI } from "../../services/api/settings.api";
import { printElement } from "../../utils/printUtil";
import "./FeeInvoiceModal.css";

const API_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5001";

const FeeInvoiceModal = ({ open, onClose, payment, student, fee, breakdown }) => {
  const printRef = useRef();
  const [hostelInfo, setHostelInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showError, setShowError] = useState(false);

  useEffect(() => {
    if (open) {
      setLoading(true);
      settingsAPI.getHostelInfo()
        .then(res => setHostelInfo(res.data.data || {}))
        .catch(err => {
          console.error("Failed to fetch hostel info:", err);
          setHostelInfo({});
        })
        .finally(() => setLoading(false));
    }
  }, [open]);

  if (!open || !payment) return null;

  const formatCurrency = (amt) => `₹${(amt || 0).toLocaleString("en-IN")}`;

  const formatDate = (d) => {
    if (!d) return "N/A";
    return new Date(d).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    });
  };

  const getImageUrl = (path) => {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    return `${API_URL.replace('/api', '')}${path}`;
  };

  const handlePrint = () => {
    if (loading) {
      setShowError(true);
      setTimeout(() => setShowError(false), 3000);
      return;
    }

    const printContent = printRef.current;
    if (!printContent) return;

    const styles = `
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body { 
        width: 100%; 
        height: 100%; 
        background: white;
      }
      body { 
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
        padding: 40px 20px;
        color: #333;
      }
      .invoice-container { 
        max-width: 800px; 
        margin: 0 auto; 
        background: white; 
        padding: 40px;
      }
      
      @media print {
        body { padding: 0; }
        .invoice-container { max-width: 100%; padding: 0; border: none; box-shadow: none; }
        button { display: none; }
      }
    `;

    printElement(printContent.innerHTML, `Invoice - ${payment.invoice_number || `TXN-${payment.payment_id}`}`, styles);
  };

  return (
    <div className="invoice-modal-overlay" onClick={onClose}>
      <div className="invoice-modal" onClick={e => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="invoice-modal-header">
          <h2>Payment Receipt</h2>
          <div className="invoice-modal-actions">
            <button
              className="invoice-action-btn"
              onClick={handlePrint}
              disabled={loading}
              title={loading ? "Loading hostel details..." : "Print"}
            >
              <Printer size={18} />
              {loading ? "Loading..." : "Print"}
            </button>
            <button className="invoice-close-btn" onClick={onClose}>
              <X size={20} />
            </button>
          </div>
        </div>

        {showError && (
          <div className="invoice-error-toast">
            <X size={14} />
            Please wait for hostel details to load
          </div>
        )}

        {/* Invoice Content - Preview */}
        <div className="invoice-modal-body" ref={printRef} style={{ background: "white", padding: "20px" }}>
          <div style={{
            maxWidth: "800px",
            margin: "0 auto",
            background: "white",
            padding: "30px",
            borderRadius: "8px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
          }}>
            {/* HEADER */}
            <div style={{
              textAlign: "center",
              marginBottom: "30px",
              paddingBottom: "20px",
              borderBottom: "2px solid #000"
            }}>
              <div style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                gap: "15px",
                marginBottom: "15px"
              }}>
                {hostelInfo?.logo_left && (
                  <img
                    src={getImageUrl(hostelInfo.logo_left)}
                    alt="Logo"
                    style={{
                      maxWidth: "70px",
                      maxHeight: "70px",
                      objectFit: "contain"
                    }}
                    onError={(e) => e.target.style.display = 'none'}
                  />
                )}
                <div>
                  <div style={{
                    fontSize: "28px",
                    fontWeight: "800",
                    color: "#1e3a8a",
                    marginBottom: "4px"
                  }}>
                    {hostelInfo?.hostel_name || "MADHUVAN"}
                  </div>
                  {hostelInfo?.tagline && (
                    <div style={{
                      fontSize: "11px",
                      color: "#666",
                      marginBottom: "6px"
                    }}>
                      {hostelInfo.tagline}
                    </div>
                  )}
                  <div style={{
                    fontSize: "10px",
                    color: "#666",
                    lineHeight: "1.5"
                  }}>
                    {hostelInfo?.phone && <div>📞 {hostelInfo.phone}</div>}
                    {hostelInfo?.email && <div>✉️ {hostelInfo.email}</div>}
                    {hostelInfo?.address && <div>{hostelInfo.address}</div>}
                  </div>
                </div>
                {hostelInfo?.logo_right && (
                  <img
                    src={getImageUrl(hostelInfo.logo_right)}
                    alt="Logo"
                    style={{
                      maxWidth: "70px",
                      maxHeight: "70px",
                      objectFit: "contain"
                    }}
                    onError={(e) => e.target.style.display = 'none'}
                  />
                )}
              </div>

              <div style={{ fontSize: "18px", fontWeight: "700", marginTop: "12px" }}>
                PAYMENT RECEIPT
              </div>
              <div style={{
                fontSize: "13px",
                color: "#1e3a8a",
                fontWeight: "700",
                marginTop: "6px"
              }}>
                {payment.invoice_number || `TXN-${payment.payment_id}`}
              </div>
              <span style={{
                display: "inline-block",
                background: "#d1fae5",
                color: "#047857",
                padding: "5px 12px",
                borderRadius: "15px",
                fontSize: "10px",
                fontWeight: "700",
                marginTop: "8px"
              }}>
                ✓ PAID
              </span>
            </div>

            {/* INFO ROWS */}
            <div style={{
              display: "flex",
              gap: "50px",
              margin: "25px 0",
              fontSize: "11px"
            }}>
              <div style={{ flex: 1 }}>
                <div style={{
                  fontSize: "9px",
                  color: "#999",
                  textTransform: "uppercase",
                  fontWeight: "700",
                  marginBottom: "8px",
                  letterSpacing: "0.5px"
                }}>
                  Student Information
                </div>
                <div style={{ color: "#333", lineHeight: "1.6" }}>
                  <strong style={{ display: "block", fontSize: "12px" }}>
                    {student?.student_name || "N/A"}
                  </strong>
                  S/O {student?.father_name || "N/A"}
                  {student?.student_id && <div>ID: {student.student_id}</div>}
                  {student?.room_no && (
                    <div>Room: {student.room_no}{student?.bed_no ? ` (Bed ${student.bed_no})` : ""}</div>
                  )}
                  {student?.student_mobile && <div>Mobile: {student.student_mobile}</div>}
                </div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{
                  fontSize: "9px",
                  color: "#999",
                  textTransform: "uppercase",
                  fontWeight: "700",
                  marginBottom: "8px",
                  letterSpacing: "0.5px"
                }}>
                  Payment Information
                </div>
                <div style={{ color: "#333", lineHeight: "1.6" }}>
                  <strong style={{ display: "block", fontSize: "12px" }}>
                    Date: {formatDate(payment.payment_date)}
                  </strong>
                  Mode: <strong>{payment.payment_mode}</strong>
                  {payment.reference_no && <div>Reference: {payment.reference_no}</div>}
                  {payment.received_by && <div>Received By: {payment.received_by}</div>}
                </div>
              </div>
            </div>

            {/* TABLE */}
            <table style={{
              width: "100%",
              margin: "25px 0",
              borderCollapse: "collapse"
            }}>
              <thead>
                <tr style={{ background: "#f5f5f5", borderBottom: "2px solid #ddd" }}>
                  <th style={{
                    padding: "10px",
                    textAlign: "left",
                    fontSize: "9px",
                    color: "#666",
                    fontWeight: "700",
                    textTransform: "uppercase"
                  }}>
                    Description
                  </th>
                  <th style={{
                    padding: "10px",
                    textAlign: "center",
                    fontSize: "9px",
                    color: "#666",
                    fontWeight: "700",
                    textTransform: "uppercase"
                  }}>
                    Month
                  </th>
                  <th style={{
                    padding: "10px",
                    textAlign: "right",
                    fontSize: "9px",
                    color: "#666",
                    fontWeight: "700",
                    textTransform: "uppercase"
                  }}>
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody>
                {Array.isArray(breakdown) ? (
                  breakdown.map((item, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: '10px 12px', fontSize: '11px', fontWeight: idx === breakdown.length - 1 ? 600 : 500, color: item.type === 'Advance Created' ? '#059669' : '#333' }}>
                        {item.type}
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'center', fontSize: '11px' }}>
                        {item.month || '—'}
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', fontSize: '12px', fontWeight: 700, color: item.type === 'Advance Created' ? '#059669' : '#333' }}>
                        {formatCurrency(item.amount)}
                      </td>
                    </tr>
                  ))
                ) : breakdown ? (
                  <>
                    {breakdown.monthlyFee > 0 && <tr style={{ borderBottom: '1px solid #eee' }}><td style={{ padding: '10px 12px', fontSize: '11px', fontWeight: 600 }}>{fee?.fee_type || 'Rent'}</td><td style={{ padding: '10px 12px', textAlign: 'center', fontSize: '11px' }}>{(() => {
                      if (!payment.fee_month) return '—';
                      const date = new Date(payment.fee_month);
                      const start = date.toLocaleDateString("en-IN", { month: "short", year: "numeric" });
                      const feeType = fee?.fee_type || payment.fee_type;
                      if (feeType === 'Half-Yearly Rent') {
                        const endDate = new Date(date);
                        endDate.setMonth(date.getMonth() + 5);
                        return `${start.split(' ')[0]} - ${endDate.toLocaleDateString("en-IN", { month: "short", year: "numeric" })}`;
                      }
                      if (feeType === 'Yearly Rent') {
                        const endDate = new Date(date);
                        endDate.setMonth(date.getMonth() + 11);
                        return `${start.split(' ')[0]} - ${endDate.toLocaleDateString("en-IN", { month: "short", year: "numeric" })}`;
                      }
                      return start;
                    })()}</td><td style={{ padding: '10px 12px', textAlign: 'right', fontSize: '12px', fontWeight: 700 }}>{formatCurrency(breakdown.monthlyFee)}</td></tr>}
                    {breakdown.fine > 0 && <tr style={{ borderBottom: '1px solid #eee' }}><td style={{ padding: '10px 12px', fontSize: '11px' }}>Fine</td><td style={{ padding: '10px 12px', textAlign: 'center', fontSize: '11px' }}>—</td><td style={{ padding: '10px 12px', textAlign: 'right', fontSize: '12px', fontWeight: 700, color: '#dc2626' }}>{formatCurrency(breakdown.fine)}</td></tr>}
                    {breakdown.penalty > 0 && <tr style={{ borderBottom: '1px solid #eee' }}><td style={{ padding: '10px 12px', fontSize: '11px' }}>Penalty</td><td style={{ padding: '10px 12px', textAlign: 'center', fontSize: '11px' }}>—</td><td style={{ padding: '10px 12px', textAlign: 'right', fontSize: '12px', fontWeight: 700, color: '#dc2626' }}>{formatCurrency(breakdown.penalty)}</td></tr>}
                    {breakdown.propertyDamage > 0 && <tr style={{ borderBottom: '1px solid #eee' }}><td style={{ padding: '10px 12px', fontSize: '11px' }}>Property Damage</td><td style={{ padding: '10px 12px', textAlign: 'center', fontSize: '11px' }}>—</td><td style={{ padding: '10px 12px', textAlign: 'right', fontSize: '12px', fontWeight: 700, color: '#f59e0b' }}>{formatCurrency(breakdown.propertyDamage)}</td></tr>}
                    {breakdown.moneyGiven > 0 && <tr style={{ borderBottom: '1px solid #eee' }}><td style={{ padding: '10px 12px', fontSize: '11px' }}>Money Given to Student</td><td style={{ padding: '10px 12px', textAlign: 'center', fontSize: '11px' }}>—</td><td style={{ padding: '10px 12px', textAlign: 'right', fontSize: '12px', fontWeight: 700, color: '#f59e0b' }}>{formatCurrency(breakdown.moneyGiven)}</td></tr>}
                    {breakdown.previousDues > 0 && <tr style={{ borderBottom: '1px solid #eee' }}><td style={{ padding: '10px 12px', fontSize: '11px' }}>Previous Dues</td><td style={{ padding: '10px 12px', textAlign: 'center', fontSize: '11px' }}>—</td><td style={{ padding: '10px 12px', textAlign: 'right', fontSize: '12px', fontWeight: 700 }}>{formatCurrency(breakdown.previousDues)}</td></tr>}
                    {breakdown.securityDue > 0 && <tr style={{ borderBottom: '1px solid #eee' }}><td style={{ padding: '10px 12px', fontSize: '11px' }}>Security Deposit</td><td style={{ padding: '10px 12px', textAlign: 'center', fontSize: '11px' }}>—</td><td style={{ padding: '10px 12px', textAlign: 'right', fontSize: '12px', fontWeight: 700, color: '#0891b2' }}>{formatCurrency(breakdown.securityDue)}</td></tr>}
                  </>
                ) : (
                  <tr style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '12px', fontSize: '11px', fontWeight: '600' }}>
                      {fee?.fee_type || payment.fee_type || "Fee Payment"}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center', fontSize: '11px' }}>
                      {(() => {
                        const d = fee?.fee_month || payment.fee_month;
                        if (!d) return "—";
                        const date = new Date(d);
                        const start = date.toLocaleDateString("en-IN", { month: "short", year: "numeric" });
                        const feeType = fee?.fee_type || payment.fee_type;
                        if (feeType === 'Half-Yearly Rent') {
                          const endDate = new Date(date);
                          endDate.setMonth(date.getMonth() + 5);
                          return `${start.split(' ')[0]} - ${endDate.toLocaleDateString("en-IN", { month: "short", year: "numeric" })}`;
                        }
                        if (feeType === 'Yearly Rent') {
                          const endDate = new Date(date);
                          endDate.setMonth(date.getMonth() + 11);
                          return `${start.split(' ')[0]} - ${endDate.toLocaleDateString("en-IN", { month: "short", year: "numeric" })}`;
                        }
                        return start;
                      })()}
                    </td>
                    <td style={{
                      padding: '12px',
                      textAlign: 'right',
                      fontSize: '12px',
                      fontWeight: '700'
                    }}>
                      {formatCurrency(payment.payment_amount)}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            {/* TOTAL */}
            <div style={{ display: "flex", justifyContent: "flex-end", margin: "25px 0" }}>
              <div style={{ width: "280px", border: "1px solid #ddd" }}>
                <div style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "10px 14px",
                  borderBottom: "1px solid #ddd",
                  fontSize: "11px"
                }}>
                  <span>Amount Received</span>
                  <span>{formatCurrency(payment.payment_amount)}</span>
                </div>
                <div style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "12px 14px",
                  background: "#f9fafb",
                  borderTop: "2px solid #000",
                  fontSize: "13px",
                  fontWeight: "700",
                  color: "#059669"
                }}>
                  <span>Total Paid</span>
                  <span>{formatCurrency(payment.payment_amount)}</span>
                </div>
              </div>
            </div>

            {/* FOOTER */}
            <div style={{
              marginTop: "30px",
              paddingTop: "15px",
              borderTop: "1px solid #ddd",
              textAlign: "center",
              color: "#999",
              fontSize: "10px",
              lineHeight: "1.5"
            }}>
              <p>Thank you for your timely payment!</p>
              <p>For any queries, please contact the hostel office</p>
              <p style={{ marginTop: "8px", color: "#ccc" }}>Generated on {formatDate(new Date())}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FeeInvoiceModal;