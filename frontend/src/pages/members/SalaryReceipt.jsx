import { useState, useEffect, useRef } from "react";
import { settingsAPI } from "../../services/api/settings.api";
import { getFileUrl } from "../../utils/imageSrc";
import { printElement } from "../../utils/printUtil";

const Icons = {
  close: "✕",
  print: "🖨️",
  download: "⬇️"
};

const ReceiptCopy = ({ title, hostelInfo, member, payment }) => {
  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric'
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency', currency: 'INR', minimumFractionDigits: 0
    }).format(amount || 0);
  };

  const numberToWords = (num) => {
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
      'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
      'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

    if (num === 0) return 'Zero';
    if (num < 20) return ones[num];
    if (num < 100) return tens[Math.floor(num / 10)] + (num % 10 ? ' ' + ones[num % 10] : '');
    if (num < 1000) return ones[Math.floor(num / 100)] + ' Hundred' + (num % 100 ? ' ' + numberToWords(num % 100) : '');
    if (num < 100000) return numberToWords(Math.floor(num / 1000)) + ' Thousand' + (num % 1000 ? ' ' + numberToWords(num % 1000) : '');
    if (num < 10000000) return numberToWords(Math.floor(num / 100000)) + ' Lakh' + (num % 100000 ? ' ' + numberToWords(num % 100000) : '');
    return numberToWords(Math.floor(num / 10000000)) + ' Crore' + (num % 10000000 ? ' ' + numberToWords(num % 10000000) : '');
  };

  return (
    <div className="receipt-copy">
      {/* Header */}
      <div className="receipt-header">
        <div className="logo-left">
          {hostelInfo?.logo_left && (
            <img src={getFileUrl(hostelInfo.logo_left)} alt="Logo" />
          )}
        </div>
        <div className="header-center">
          <h2>{hostelInfo?.hostel_name || 'Hostel Name'}</h2>
          {hostelInfo?.tagline && <p className="tagline">{hostelInfo.tagline}</p>}
          <p className="address">
            {hostelInfo?.address_line1} {hostelInfo?.address_line2}
          </p>
          <p className="contact">
            📞 {hostelInfo?.phone} | ✉️ {hostelInfo?.email}
          </p>
        </div>
        <div className="logo-right">
          {hostelInfo?.logo_right && (
            <img src={getFileUrl(hostelInfo.logo_right)} alt="Logo" />
          )}
        </div>
      </div>

      {/* Title Bar */}
      <div className="receipt-title-bar">
        <div className="copy-type">{title}</div>
        <div className="receipt-badge">
          Receipt: <strong>{payment.receipt_number || 'N/A'}</strong>
        </div>
      </div>

      {/* Receipt Info */}
      <div className="receipt-info-section">
        <div className="info-grid">
          <div className="info-row">
            <span className="label">Receipt No:</span>
            <span className="value highlight">{payment.receipt_number}</span>
          </div>
          <div className="info-row">
            <span className="label">Date:</span>
            <span className="value">{formatDate(payment.payment_date)}</span>
          </div>
          <div className="info-row">
            <span className="label">Employee Name:</span>
            <span className="value">{member.name}</span>
          </div>
          <div className="info-row">
            <span className="label">Father's Name:</span>
            <span className="value">{member.father_name || 'N/A'}</span>
          </div>
          <div className="info-row">
            <span className="label">Mobile:</span>
            <span className="value">{member.mobile || 'N/A'}</span>
          </div>
          <div className="info-row">
            <span className="label">Salary Month:</span>
            <span className="value">{payment.payment_month} {payment.payment_year}</span>
          </div>
        </div>
      </div>

      {/* Payment Details */}
      <div className="receipt-table-container">
        <table className="receipt-table">
          <thead>
            <tr>
              <th>Description</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Monthly Salary for {payment.payment_month} {payment.payment_year}</td>
              <td>{formatCurrency(payment.amount)}</td>
            </tr>
          </tbody>
          <tfoot>
            <tr className="total-row">
              <td>Total Paid</td>
              <td>{formatCurrency(payment.amount)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Amount in Words */}
      <div className="amount-words">
        <strong>Amount in Words:</strong> {numberToWords(Math.round(payment.amount))} Rupees Only
      </div>

      {/* Payment Info */}
      <div className="payment-info">
        <div className="payment-row">
          <span>Payment Mode:</span>
          <strong>{payment.payment_mode}</strong>
        </div>
        {payment.reference_no && (
          <div className="payment-row">
            <span>Reference No:</span>
            <strong>{payment.reference_no}</strong>
          </div>
        )}
        {payment.notes && (
          <div className="payment-row notes">
            <span>Notes:</span>
            <span>{payment.notes}</span>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="receipt-footer">
        <div className="footer-left">
          <p className="receipt-ref">Ref: {payment.receipt_number}</p>
          <p className="print-date">Printed: {formatDate(new Date())}</p>
        </div>
        <div className="footer-right">
          <div className="signature-block">
            <div className="signature-line"></div>
            <p>Authorized Signature</p>
          </div>
        </div>
      </div>
    </div>
  );
};

const SalaryReceipt = ({ payment, member, onClose }) => {
  const [hostelInfo, setHostelInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const printRef = useRef();

  useEffect(() => {
    loadHostelInfo();
  }, []);

  const loadHostelInfo = async () => {
    try {
      const res = await settingsAPI.getHostelInfo();
      setHostelInfo(res.data.data || {});
    } catch (error) {
      console.error("Failed to load hostel info:", error);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    const printContent = printRef.current.innerHTML;
    const styles = `
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { font-family: 'Segoe UI', Tahoma, sans-serif; font-size: 12px; color: #333; }
      
      .receipt-page { padding: 20px; }
      
      .receipt-copy {
        border: 2px solid #333;
        padding: 20px;
        margin-bottom: 30px;
        page-break-inside: avoid;
      }
      
      .receipt-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-bottom: 2px solid #333;
        padding-bottom: 15px;
        margin-bottom: 15px;
      }
      
      .logo-left img, .logo-right img {
        max-height: 60px;
        max-width: 80px;
      }
      
      .header-center {
        text-align: center;
        flex: 1;
      }
      
      .header-center h2 {
        font-size: 20px;
        color: #1a1a2e;
        margin-bottom: 4px;
      }
      
      .header-center .tagline {
        font-style: italic;
        color: #666;
        font-size: 11px;
      }
      
      .header-center .address, .header-center .contact {
        font-size: 11px;
        color: #444;
        margin-top: 3px;
      }
      
      .receipt-title-bar {
        display: flex;
        justify-content: space-between;
        align-items: center;
        background: #f0f0f0;
        padding: 10px 15px;
        border-radius: 5px;
        margin-bottom: 15px;
      }
      
      .copy-type {
        font-weight: bold;
        font-size: 13px;
        color: #1a1a2e;
      }
      
      .receipt-badge {
        font-size: 12px;
      }
      
      .receipt-info-section {
        margin-bottom: 15px;
      }
      
      .info-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8px;
      }
      
      .info-row {
        display: flex;
        gap: 10px;
      }
      
      .info-row .label {
        color: #666;
        min-width: 120px;
      }
      
      .info-row .value {
        font-weight: 500;
      }
      
      .info-row .value.highlight {
        font-weight: bold;
        color: #1a1a2e;
      }
      
      .receipt-table-container {
        margin: 15px 0;
      }
      
      .receipt-table {
        width: 100%;
        border-collapse: collapse;
      }
      
      .receipt-table th, .receipt-table td {
        border: 1px solid #ddd;
        padding: 10px;
        text-align: left;
      }
      
      .receipt-table th {
        background: #f5f5f5;
        font-weight: 600;
      }
      
      .receipt-table td:last-child, .receipt-table th:last-child {
        text-align: right;
        width: 150px;
      }
      
      .total-row {
        background: #e8f5e9;
        font-weight: bold;
      }
      
      .total-row td {
        font-size: 14px;
      }
      
      .amount-words {
        background: #fff8e1;
        padding: 10px 15px;
        border-radius: 5px;
        margin: 15px 0;
        font-size: 11px;
      }
      
      .payment-info {
        display: flex;
        flex-wrap: wrap;
        gap: 15px;
        margin: 15px 0;
        padding: 10px;
        background: #f9f9f9;
        border-radius: 5px;
      }
      
      .payment-row {
        display: flex;
        gap: 8px;
      }
      
      .payment-row.notes {
        width: 100%;
      }
      
      .receipt-footer {
        display: flex;
        justify-content: space-between;
        align-items: flex-end;
        margin-top: 30px;
        padding-top: 15px;
        border-top: 1px dashed #ccc;
      }
      
      .footer-left {
        font-size: 10px;
        color: #666;
      }
      
      .signature-block {
        text-align: center;
      }
      
      .signature-line {
        width: 150px;
        border-bottom: 1px solid #333;
        margin-bottom: 5px;
        height: 40px;
      }
      
      .signature-block p {
        font-size: 11px;
        color: #666;
      }
      
      @media print {
        body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        .receipt-copy { page-break-after: always; }
        .receipt-copy:last-child { page-break-after: auto; }
      }
    `;

    printElement(`<div class="receipt-page">${printContent}</div>`, `Salary Receipt - ${payment.receipt_number}`, styles);
  };

  if (loading) {
    return (
      <div className="modal-overlay">
        <div className="modal-container">
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Loading receipt...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container receipt-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">
            <span className="modal-icon">{Icons.print}</span>
            <h3>Salary Receipt</h3>
          </div>
          <button className="modal-close" onClick={onClose}>{Icons.close}</button>
        </div>

        <div className="modal-body receipt-body">
          <div className="receipt-actions">
            <button className="btn btn-primary" onClick={handlePrint}>
              {Icons.print} Print Receipt
            </button>
          </div>

          <div className="receipt-preview" ref={printRef}>
            <ReceiptCopy
              title="ADMINISTRATION COPY"
              hostelInfo={hostelInfo}
              member={member}
              payment={payment}
            />
            <ReceiptCopy
              title="EMPLOYEE COPY"
              hostelInfo={hostelInfo}
              member={member}
              payment={payment}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default SalaryReceipt;