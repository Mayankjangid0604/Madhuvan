import { useRef, useEffect, useState } from "react";
import { X, Printer } from "lucide-react";
import { settingsAPI } from "../../services/api/settings.api";
import { printElement } from "../../utils/printUtil";

const API_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5001";

const RefundReceiptModal = ({ open, onClose, student, refundAmount, paymentMode, checkoutDate }) => {
  const printRef = useRef();
  const [hostelInfo, setHostelInfo] = useState(null);
  const [loading, setLoading] = useState(true);

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

  if (!open || !student) return null;

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
      .refund-receipt-container { 
        max-width: 800px; 
        margin: 0 auto; 
        background: white; 
        padding: 40px;
      }
      @media print {
        body { padding: 0; }
        .refund-receipt-container { max-width: 100%; padding: 0; border: none; box-shadow: none; }
        button { display: none; }
      }
    `;

    printElement(printContent.innerHTML, `Refund Receipt - ${student.student_name}`, styles);
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.6)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 10000,
        padding: "20px"
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "white",
          borderRadius: "12px",
          width: "100%",
          maxWidth: "700px",
          maxHeight: "90vh",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column"
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "16px 24px",
          borderBottom: "1px solid #e5e7eb",
          background: "#f9fafb"
        }}>
          <h2 style={{ fontSize: "16px", fontWeight: "700", margin: 0 }}>Refund Receipt</h2>
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <button
              onClick={handlePrint}
              disabled={loading}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "8px 16px",
                background: "#2563eb",
                color: "white",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
                fontSize: "13px",
                fontWeight: "600"
              }}
            >
              <Printer size={18} />
              {loading ? "Loading..." : "Print"}
            </button>
            <button
              onClick={onClose}
              style={{
                display: "flex",
                alignItems: "center",
                padding: "6px",
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "#6b7280"
              }}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Receipt Content */}
        <div style={{ overflow: "auto", padding: "20px" }} ref={printRef}>
          <div className="refund-receipt-container" style={{
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
                    style={{ maxWidth: "70px", maxHeight: "70px", objectFit: "contain" }}
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
                    <div style={{ fontSize: "11px", color: "#666", marginBottom: "6px" }}>
                      {hostelInfo.tagline}
                    </div>
                  )}
                  <div style={{ fontSize: "10px", color: "#666", lineHeight: "1.5" }}>
                    {hostelInfo?.phone && <div>📞 {hostelInfo.phone}</div>}
                    {hostelInfo?.email && <div>✉️ {hostelInfo.email}</div>}
                    {hostelInfo?.address && <div>{hostelInfo.address}</div>}
                  </div>
                </div>
                {hostelInfo?.logo_right && (
                  <img
                    src={getImageUrl(hostelInfo.logo_right)}
                    alt="Logo"
                    style={{ maxWidth: "70px", maxHeight: "70px", objectFit: "contain" }}
                    onError={(e) => e.target.style.display = 'none'}
                  />
                )}
              </div>

              <div style={{ fontSize: "18px", fontWeight: "700", marginTop: "12px" }}>
                REFUND RECEIPT
              </div>
              <span style={{
                display: "inline-block",
                background: "#dbeafe",
                color: "#1d4ed8",
                padding: "5px 12px",
                borderRadius: "15px",
                fontSize: "10px",
                fontWeight: "700",
                marginTop: "8px"
              }}>
                SECURITY DEPOSIT REFUND
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
                    {student.student_name || "N/A"}
                  </strong>
                  S/O {student.father_name || "N/A"}
                  {student.student_id && <div>ID: {student.student_id}</div>}
                  {student.room_no && (
                    <div>Room: {student.room_no}{student.bed_no ? ` (Bed ${student.bed_no})` : ""}</div>
                  )}
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
                  Refund Information
                </div>
                <div style={{ color: "#333", lineHeight: "1.6" }}>
                  <strong style={{ display: "block", fontSize: "12px" }}>
                    Date: {formatDate(checkoutDate)}
                  </strong>
                  Mode: <strong>{paymentMode || "Cash"}</strong>
                  <div>Type: Checkout - Security Deposit Refund</div>
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
                  }}>Description</th>
                  <th style={{
                    padding: "10px",
                    textAlign: "center",
                    fontSize: "9px",
                    color: "#666",
                    fontWeight: "700",
                    textTransform: "uppercase"
                  }}>Details</th>
                  <th style={{
                    padding: "10px",
                    textAlign: "right",
                    fontSize: "9px",
                    color: "#666",
                    fontWeight: "700",
                    textTransform: "uppercase"
                  }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: "1px solid #eee" }}>
                  <td style={{ padding: "12px", fontSize: "11px", fontWeight: "600" }}>
                    Security Deposit Refund
                  </td>
                  <td style={{ padding: "12px", textAlign: "center", fontSize: "11px" }}>
                    Checkout
                  </td>
                  <td style={{
                    padding: "12px",
                    textAlign: "right",
                    fontSize: "12px",
                    fontWeight: "700",
                    color: "#059669"
                  }}>
                    {formatCurrency(refundAmount)}
                  </td>
                </tr>
              </tbody>
            </table>

            {/* TOTAL */}
            <div style={{ display: "flex", justifyContent: "flex-end", margin: "25px 0" }}>
              <div style={{ width: "280px", border: "1px solid #ddd" }}>
                <div style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "12px 14px",
                  background: "#f0fdf4",
                  borderTop: "2px solid #059669",
                  fontSize: "13px",
                  fontWeight: "700",
                  color: "#059669"
                }}>
                  <span>Total Refunded</span>
                  <span>{formatCurrency(refundAmount)}</span>
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
              <p>Security deposit has been refunded to the student.</p>
              <p>For any queries, please contact the hostel office.</p>
              <p style={{ marginTop: "8px", color: "#ccc" }}>Generated on {formatDate(new Date())}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RefundReceiptModal;
