import { useState, useRef } from "react";
import { X, Printer, Download, CheckCircle, AlertCircle } from "lucide-react";
import { feeAPI } from "../../services/api/fee.api";
import { printElement } from "../../utils/printUtil";
import "./FeeInvoiceModal.css";

const API_URL = import.meta.env.VITE_API_BASE_URL;

const FeeInvoicePreview = ({ open, onClose, payment, student }) => {
  const contentRef = useRef();
  if (!open || !payment) return null;

  const breakdown = payment.breakdown || [];
  const formatCurrency = (amt) => `₹${(amt || 0).toLocaleString("en-IN")}`;
  const formatDate = (d) => d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "N/A";

  const handlePrint = () => {
    if (!contentRef.current) return;

    const styles = `
      * { margin: 0; padding: 0; box-sizing: border-box; font-family: 'Segoe UI', Tahoma, sans-serif; }
      body { padding: 40px; color: #333; }
      .fim-content { 
        border: 1px solid #eee; 
        padding: 40px; 
        border-radius: 12px;
        background: white;
      }
      .fim-info { display: flex; justify-content: space-between; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid #3b82f6; }
      .fim-info-row { display: flex; flex-direction: column; }
      .fim-info-row span { font-size: 12px; color: #64748b; text-transform: uppercase; }
      .fim-info-row strong { font-size: 16px; color: #1e3a8a; }
      
      .fim-student { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; padding: 20px; background: #f8fafc; border-radius: 8px; }
      .fim-student-row { display: flex; flex-direction: column; }
      .fim-student-row span { font-size: 11px; color: #64748b; }
      .fim-student-row strong { font-size: 14px; color: #334155; }
      
      .fim-payment { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 30px; padding: 20px; border: 1px dashed #cbd5e1; border-radius: 8px; }
      .fim-payment-amount { display: flex; flex-direction: column; }
      .fim-payment-amount span { font-size: 12px; color: #64748b; }
      .fim-payment-amount strong { font-size: 24px; color: #059669; }
      .fim-payment-mode { font-size: 14px; font-weight: 600; color: #475569; }
      
      .fim-breakdown h4 { font-size: 14px; color: #1e40af; margin-bottom: 15px; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px; }
      .fim-breakdown-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f1f5f9; font-size: 13px; }
      
      .fim-advance { display: flex; align-items: center; gap: 10px; margin-top: 20px; padding: 12px; background: #ecfdf5; color: #059669; border-radius: 6px; font-weight: 600; }
      
      .fim-total { display: flex; justify-content: space-between; margin-top: 30px; padding-top: 15px; border-top: 2px solid #1e3a8a; }
      .fim-total span { font-size: 16px; font-weight: 600; }
      .fim-total strong { font-size: 20px; color: #1e3a8a; }
      
      @media print {
        body { padding: 0; }
        .fim-content { border: none; padding: 0; box-shadow: none; }
      }
    `;

    printElement(contentRef.current.innerHTML, `Receipt - ${payment.invoice_number}`, styles);
  };

  const handleDownload = () => {
    const link = document.createElement("a");
    link.href = `${API_URL}${feeAPI.getInvoiceDownloadUrl(payment.invoice_number)}`;
    link.download = `Receipt_${payment.invoice_number}.pdf`;
    link.click();
  };

  // Calculate advance if any
  const advanceItem = breakdown.find(b => b.type === "Advance Created");
  const paymentItems = breakdown.filter(b => b.type !== "Advance Created");

  return (
    <div className="fim-overlay" onClick={onClose}>
      <div className="fim-modal" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="fim-header">
          <h3>Fee Receipt</h3>
          <div className="fim-actions">
            <button onClick={handlePrint} title="Print"><Printer size={18} /></button>
            <button onClick={handleDownload} title="Download"><Download size={18} /></button>
            <button onClick={onClose} title="Close"><X size={18} /></button>
          </div>
        </div>

        {/* Invoice Content */}
        <div className="fim-content" ref={contentRef}>
          {/* Invoice Info */}
          <div className="fim-info">
            <div className="fim-info-row">
              <span>Invoice No:</span>
              <strong>{payment.invoice_number || "N/A"}</strong>
            </div>
            <div className="fim-info-row">
              <span>Date:</span>
              <strong>{formatDate(payment.payment_date)}</strong>
            </div>
          </div>

          {/* Student Info */}
          <div className="fim-student">
            <div className="fim-student-row">
              <span>Student:</span>
              <strong>{student.student_name}</strong>
            </div>
            <div className="fim-student-row">
              <span>Father:</span>
              <strong>{student.father_name || "N/A"}</strong>
            </div>
            <div className="fim-student-row">
              <span>ID / Room:</span>
              <strong>{student.student_id} / {student.room_no || "N/A"}</strong>
            </div>
          </div>

          {/* Payment Info */}
          <div className="fim-payment">
            <div className="fim-payment-amount">
              <span>Payment Received</span>
              <strong>{formatCurrency(payment.payment_amount)}</strong>
            </div>
            <div className="fim-payment-mode">
              {payment.payment_mode}
              {payment.reference_no && <span> • Ref: {payment.reference_no}</span>}
            </div>
          </div>

          {/* Breakdown */}
          <div className="fim-breakdown">
            <h4>Applied To:</h4>
            <div className="fim-breakdown-list">
              {paymentItems.map((item, idx) => (
                <div key={idx} className="fim-breakdown-row">
                  <span>{item.month ? `${item.month} ${item.type}` : item.type}</span>
                  <span>{formatCurrency(item.amount)} ✓</span>
                </div>
              ))}
            </div>
          </div>

          {/* Advance */}
          {advanceItem && (
            <div className="fim-advance">
              <CheckCircle size={16} />
              <span>Advance Created: {formatCurrency(advanceItem.amount)}</span>
            </div>
          )}

          {/* Total */}
          <div className="fim-total">
            <span>Total Paid</span>
            <strong>{formatCurrency(payment.payment_amount)}</strong>
          </div>
        </div>

        {/* Footer */}
        <div className="fim-footer">
          <button className="fim-btn-secondary" onClick={onClose}>Close</button>
          <button className="fim-btn-primary" onClick={handlePrint}>
            <Printer size={16} /> Print Receipt
          </button>
        </div>
      </div>
    </div>
  );
};

export default FeeInvoicePreview;