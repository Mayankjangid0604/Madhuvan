// Printable documents for the Madhuvan Hostels workflow.
// Layouts match the reference PDFs shared by the user:
//   Invoice — one page; blue theme; logos left+right; GSTIN pill; QR SCAN & PAY
//   Receipt — Admin Copy + Student Copy on one page separated by cut line; when
//             printing, we ask which copy the user wants
//   Bill    — vendor block, itemised table, totals, payment details
import { printElement, printWithPreview } from "./printUtil";

// -----------------------------------------------------------------------------
// SHARED HELPERS
// -----------------------------------------------------------------------------
const fmtINR = (amount) =>
  new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2, minimumFractionDigits: 2 })
    .format(Math.round(Number(amount || 0) * 100) / 100);

const fmtDate = (d) => {
  if (!d) return "";
  const date = new Date(d);
  if (isNaN(date.getTime())) return String(d);
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

const fmtMonth = (d) => {
  if (!d) return "";
  const date = new Date(d);
  if (isNaN(date.getTime())) return String(d);
  return date.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
};

const escapeHtml = (str) =>
  String(str ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
  );

function amountToWords(num) {
  const n = Math.floor(Number(num) || 0);
  if (n === 0) return "Zero";
  const a = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
    "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const b = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
  const inWords = (v) => {
    if (v < 20) return a[v];
    if (v < 100) return b[Math.floor(v / 10)] + (v % 10 ? " " + a[v % 10] : "");
    return a[Math.floor(v / 100)] + " Hundred" + (v % 100 ? " " + inWords(v % 100) : "");
  };
  let s = "";
  const crore = Math.floor(n / 10000000);
  const lakh = Math.floor((n % 10000000) / 100000);
  const thousand = Math.floor((n % 100000) / 1000);
  const rest = n % 1000;
  if (crore) s += inWords(crore) + " Crore ";
  if (lakh) s += inWords(lakh) + " Lakh ";
  if (thousand) s += inWords(thousand) + " Thousand ";
  if (rest) s += inWords(rest);
  return s.trim();
}

const sessionFromDate = (isoDate) => {
  const d = isoDate ? new Date(isoDate) : new Date();
  // Session starts April in Indian academic year
  const year = d.getFullYear();
  const month = d.getMonth();
  if (month >= 3) return `${year}-${String(year + 1).slice(2)}`;
  return `${year - 1}-${String(year).slice(2)}`;
};

const backendBase = () => {
  try {
    return (import.meta.env.VITE_API_BASE_URL || "").replace(/\/api$/, "");
  } catch {
    return "";
  }
};

const logoImg = (path, alt) => {
  if (!path) {
    // fallback: Madhuvan text badge
    return `<div class="logo-badge">${escapeHtml(alt || "M")}</div>`;
  }
  const url = /^https?:\/\//.test(path) ? path : `${backendBase()}${path}`;
  return `<img class="logo-badge-img" src="${escapeHtml(url)}" alt="${escapeHtml(alt || "logo")}" />`;
};

// -----------------------------------------------------------------------------
// SPLIT (kept as no-op single invoice; user removed the split)
// -----------------------------------------------------------------------------
export const splitInvoicesForFee = ({ total_amount, fee_type_cycle, period_start }) => {
  const total = Number(total_amount) || 0;
  const cycle = (fee_type_cycle || "monthly").toLowerCase();
  const months = cycle === "half_yearly" ? 6 : cycle === "yearly" ? 12 : 1;
  const start = period_start ? new Date(period_start) : new Date();
  const invStart = new Date(start.getFullYear(), start.getMonth(), 1);
  const invEnd = new Date(start.getFullYear(), start.getMonth() + months, 0);
  return [{
    index: 1, total: 1,
    amount: Math.round(total * 100) / 100,
    period_start: invStart.toISOString().split("T")[0],
    period_end: invEnd.toISOString().split("T")[0],
  }];
};

// -----------------------------------------------------------------------------
// GST SPLIT
// -----------------------------------------------------------------------------
// Given (accommodation_amount, mess_amount, num_months), returns GST breakdown.
//   Regular billing:
//     Mess portion: CGST 2.5% + SGST 2.5% (exclusive on top of ₹5000 × n)
//     Accommodation: GST-exempt
//   Early exit:
//     Mess portion: CGST 2.5% + SGST 2.5% (unchanged)
//     Accommodation: CGST 9% + SGST 9% (exclusive; on total accommodation)
export const gstBreakdown = ({ accommodation_base, mess_base, apply_accommodation_gst = false }) => {
  const accBase = Number(accommodation_base) || 0;
  const messBase = Number(mess_base) || 0;

  const messCgst = messBase * 0.025;
  const messSgst = messBase * 0.025;

  const accCgst = apply_accommodation_gst ? accBase * 0.09 : 0;
  const accSgst = apply_accommodation_gst ? accBase * 0.09 : 0;

  const subtotal = accBase + messBase;
  const totalGst = accCgst + accSgst + messCgst + messSgst;
  const grand = subtotal + totalGst;

  return {
    accommodation: {
      base: Math.round(accBase * 100) / 100,
      cgst: Math.round(accCgst * 100) / 100,
      sgst: Math.round(accSgst * 100) / 100,
      total: Math.round((accBase + accCgst + accSgst) * 100) / 100,
    },
    mess: {
      base: Math.round(messBase * 100) / 100,
      cgst: Math.round(messCgst * 100) / 100,
      sgst: Math.round(messSgst * 100) / 100,
      total: Math.round((messBase + messCgst + messSgst) * 100) / 100,
    },
    subtotal: Math.round(subtotal * 100) / 100,
    total_gst: Math.round(totalGst * 100) / 100,
    grand_total: Math.round(grand * 100) / 100,
  };
};

// -----------------------------------------------------------------------------
// SHARED STYLES (blue theme matching the PDFs)
// -----------------------------------------------------------------------------
const baseStyles = `
  @page { size: A4; margin: 12mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Segoe UI', 'Inter', Arial, sans-serif;
    color: #1e293b;
    font-size: 11px;
    line-height: 1.35;
    background: #fff;
  }
  .page { max-width: 780px; margin: 0 auto; padding: 8px 6px; }

  /* Header with big center title + logos left + right */
  .doc-brand {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 6px 0;
  }
  .logo-badge, .logo-badge-img {
    width: 80px; height: 80px;
    border-radius: 10px;
    background: #1e3a8a;
    color: #fff;
    display: flex; align-items: center; justify-content: center;
    font-family: 'Segoe UI', Arial, sans-serif;
    font-weight: 900;
    font-size: 22px;
    object-fit: contain;
  }
  .doc-brand .brand-center {
    flex: 1; text-align: center;
    padding: 0 16px;
  }
  .brand-name {
    font-size: 30px; font-weight: 900;
    color: #1e3a8a; letter-spacing: 0.5px;
  }
  .brand-sub {
    font-size: 15px; color: #1e293b; margin-top: 2px;
  }
  .brand-contact {
    margin-top: 6px;
    font-size: 12px; color: #334155;
  }
  .brand-contact span { display: inline-block; margin: 0 6px; }
  .brand-contact .icon { color: #ef4444; margin-right: 4px; }

  .doc-title {
    text-align: center;
    font-size: 22px; font-weight: 800;
    color: #1e3a8a;
    letter-spacing: 1px;
    margin: 18px 0 8px;
  }
  .paid-badge {
    display: inline-flex; align-items: center; gap: 6px;
    background: #dcfce7; color: #166534;
    padding: 4px 12px; border-radius: 999px;
    font-weight: 800; font-size: 12px;
    margin: 4px auto 6px;
  }
  .gstin-pill {
    display: inline-block;
    padding: 6px 18px;
    border: 1.5px solid #1e3a8a;
    border-radius: 8px;
    font-weight: 700;
    color: #1e293b;
    font-size: 12px;
  }
  .doc-number {
    text-align: center;
    font-size: 12px; font-weight: 700;
    color: #1e293b;
    margin-top: 6px;
  }
  hr.rule {
    border: none; border-top: 2px solid #1e293b; margin: 14px 0;
  }

  .info-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
    margin-bottom: 12px;
  }
  .info-block h4 {
    font-size: 12px; font-weight: 800;
    color: #1e3a8a;
    text-transform: uppercase; letter-spacing: 0.6px;
    margin-bottom: 6px;
  }
  .info-block .row {
    display: grid;
    grid-template-columns: 110px 10px 1fr;
    font-size: 12px;
    padding: 2px 0;
  }
  .info-block .row .k { font-weight: 700; color: #334155; }
  .info-block .row .v { color: #1e293b; }
  .info-block .row .v.strong { font-weight: 700; }
  .info-block .row .v.due { color: #dc2626; font-weight: 700; }

  table.items {
    width: 100%;
    border-collapse: collapse;
    margin-top: 4px;
    font-size: 11px;
  }
  table.items th {
    background: #1e3a8a;
    color: #fff;
    text-align: left;
    padding: 8px 10px;
    font-weight: 700;
    letter-spacing: 0.3px;
  }
  table.items th.r, table.items td.r { text-align: right; }
  table.items td {
    padding: 8px 10px;
    border-bottom: 1px solid #e2e8f0;
    background: #fff;
  }
  table.items tr.subtotal td {
    background: #f8fafc;
    font-weight: 700;
  }
  table.items tr.grand td {
    background: #dbeafe;
    font-weight: 800;
    color: #1e3a8a;
    font-size: 12px;
  }

  .side-summary {
    display: grid; grid-template-columns: 1fr 320px; gap: 16px;
    margin-top: 10px;
  }
  .side-summary .in-words {
    border: 1px solid #cbd5e1; border-radius: 8px; padding: 10px 12px;
  }
  .side-summary .in-words .lbl {
    font-size: 10px; font-weight: 800; color: #1e3a8a;
    text-transform: uppercase; letter-spacing: 0.6px; margin-bottom: 4px;
  }
  .side-summary .in-words .val {
    font-size: 13px; font-weight: 700; color: #1e293b;
  }
  .payment-summary {
    border: 1px solid #cbd5e1; border-radius: 8px; padding: 10px 14px;
  }
  .payment-summary .row {
    display: flex; justify-content: space-between; padding: 3px 0; font-size: 12px;
  }
  .payment-summary .row.total {
    border-top: 2px solid #1e3a8a;
    margin-top: 6px; padding-top: 8px;
    font-weight: 800; color: #1e3a8a; font-size: 14px;
  }

  .notes {
    margin-top: 16px;
    display: grid; grid-template-columns: 1fr 200px; gap: 16px;
    align-items: start;
  }
  .notes h5 {
    font-size: 11px; font-weight: 800; color: #1e3a8a;
    text-transform: uppercase; letter-spacing: 0.6px; margin-bottom: 4px;
  }
  .notes ul { padding-left: 18px; font-size: 11px; color: #334155; }
  .notes ul li { margin: 3px 0; }

  .qr-box {
    text-align: center;
    border: 1px solid #cbd5e1;
    border-radius: 8px;
    padding: 8px;
    background: #fff;
  }
  .qr-box .qr-title {
    font-size: 11px; font-weight: 800;
    letter-spacing: 0.8px;
    color: #1e293b;
    margin-bottom: 6px;
  }
  .qr-box img { max-width: 120px; height: auto; display: block; margin: 0 auto; }
  .qr-box .powered {
    font-size: 9px; color: #64748b; margin-top: 4px;
  }

  .doc-footer {
    text-align: center;
    margin-top: 22px;
    padding-top: 10px;
    border-top: 1px solid #cbd5e1;
    color: #475569;
    font-size: 10px;
  }
  .thanks {
    color: #1e3a8a; font-weight: 700; font-size: 12px; font-style: italic;
    margin-bottom: 4px;
  }

  /* Receipt copy separator */
  .copy-tag {
    display: inline-block;
    background: #1e3a8a; color: #fff;
    padding: 2px 10px;
    font-size: 10px; font-weight: 800;
    border-radius: 4px;
    letter-spacing: 1px;
  }
  .cut-line {
    display: flex; align-items: center;
    color: #94a3b8;
    margin: 6px 0;
    gap: 8px;
  }
  .cut-line::before, .cut-line::after {
    content: "";
    flex: 1;
    border-top: 1.5px dashed #94a3b8;
  }

  /* Both receipt copies must fit on one A4 page */
  .receipt-dual .page {
    font-size: 10px;
    padding: 4px 6px;
  }
  .receipt-dual .doc-brand { padding: 2px 0; }
  .receipt-dual .logo-badge, .receipt-dual .logo-badge-img { width: 50px; height: 50px; font-size: 16px; }
  .receipt-dual .brand-name { font-size: 20px; }
  .receipt-dual .brand-sub { font-size: 12px; }
  .receipt-dual .brand-contact { font-size: 10px; margin-top: 2px; }
  .receipt-dual .doc-title { font-size: 16px; margin: 6px 0 4px; }
  .receipt-dual .paid-badge { font-size: 10px; padding: 2px 8px; margin: 2px auto 4px; }
  .receipt-dual .doc-number { font-size: 10px; margin-top: 2px; }
  .receipt-dual hr.rule { margin: 6px 0; }
  .receipt-dual .info-grid { gap: 10px; margin-bottom: 6px; }
  .receipt-dual .info-block h4 { font-size: 10px; margin-bottom: 3px; }
  .receipt-dual .info-block .row { font-size: 10px; padding: 1px 0; grid-template-columns: 95px 8px 1fr; }
  .receipt-dual table.items th { padding: 4px 6px; font-size: 9px; }
  .receipt-dual table.items td { padding: 4px 6px; font-size: 10px; }
  .receipt-dual .in-words .lbl { font-size: 9px; }
  .receipt-dual .in-words .val { font-size: 10px; }
  .receipt-dual .payment-summary .row { font-size: 10px; padding: 2px 0; }
  .receipt-dual .payment-summary .row.total { font-size: 12px; }
  .receipt-dual .notes { margin-top: 6px; }
  .receipt-dual .doc-footer { margin-top: 6px; padding-top: 4px; font-size: 9px; }
  .receipt-dual .thanks { font-size: 10px; }
  .receipt-dual .gstin-pill { font-size: 10px; padding: 3px 10px; }
`;

// -----------------------------------------------------------------------------
// BRAND HEADER (shared)
// -----------------------------------------------------------------------------
const brandHeader = (hostel = {}) => {
  const hostelName = escapeHtml(hostel.hostel_name || "Madhuvan Hostels");
  const tagline = escapeHtml(hostel.tagline || "Girls Residency");
  const phone = escapeHtml(hostel.phone || "");
  const email = escapeHtml(hostel.email || "");
  return `
    <div class="doc-brand">
      ${logoImg(hostel.logo_left, "M")}
      <div class="brand-center">
        <div class="brand-name">${hostelName.toUpperCase()}</div>
        <div class="brand-sub">${tagline}</div>
        <div class="brand-contact">
          ${phone ? `<span><span class="icon">📞</span>${phone}</span>` : ""}
          ${phone && email ? "|" : ""}
          ${email ? `<span><span class="icon">✉</span>${email}</span>` : ""}
        </div>
      </div>
      ${logoImg(hostel.logo_right, "M")}
    </div>
  `;
};

// -----------------------------------------------------------------------------
// INVOICE  (image 1)
// -----------------------------------------------------------------------------
export const buildInvoiceHTML = ({
  hostel = {},
  student = {},
  invoice_no,
  invoice_date,
  due_date,
  period_start,
  period_end,
  accommodation_amount = 0,
  mess_amount = 0,
  apply_accommodation_gst = false,
  // NEW: if true, show accommodation+mess split with GST; if false, show single fee line (cash mode)
  is_online_payment = false,
  total_fee_amount = 0, // used in cash mode
}) => {
  const invDate = fmtDate(invoice_date || new Date());
  const dueDate = fmtDate(due_date);
  const session = sessionFromDate(invoice_date);
  const monthLabel = fmtMonth(period_start || invoice_date);
  const gstin = escapeHtml(hostel.gstin || "");

  const rows = [];

  // ── CASH MODE: single line, no GST ──
  if (!is_online_payment) {
    const total = total_fee_amount || (accommodation_amount + mess_amount);
    rows.push(`
      <tr>
        <td>Hostel Fee</td>
        <td>${monthLabel}</td>
        <td class="r">${fmtINR(total)}</td>
      </tr>
    `);
    rows.push(`
      <tr class="grand">
        <td>GRAND TOTAL (TOTAL AMOUNT PAYABLE)</td>
        <td></td>
        <td class="r">₹${fmtINR(total)}</td>
      </tr>
    `);

    return `
      <div class="page">
        ${brandHeader(hostel)}
        <div class="doc-title">INVOICE</div>
        <div class="doc-number">Invoice No.: ${escapeHtml(invoice_no || "")}</div>
        <hr class="rule" />

        <div class="info-grid">
          <div class="info-block">
            <h4>Student Information</h4>
            <div class="row"><span class="k">Student Name</span><span>:</span><span class="v strong">${escapeHtml(student.student_name || "")}</span></div>
            <div class="row"><span class="k">Father Name</span><span>:</span><span class="v">${escapeHtml(student.father_name || "-")}</span></div>
            <div class="row"><span class="k">Student ID</span><span>:</span><span class="v">${escapeHtml(student.student_id || "-")}</span></div>
            <div class="row"><span class="k">Room</span><span>:</span><span class="v">${escapeHtml(student.room_no || "-")}${student.bed_no ? ` (Bed ${escapeHtml(student.bed_no)})` : ""}</span></div>
          </div>
          <div class="info-block">
            <h4>Invoice Information</h4>
            <div class="row"><span class="k">Invoice Date</span><span>:</span><span class="v">${invDate}</span></div>
            <div class="row"><span class="k">Due Date</span><span>:</span><span class="v due">${dueDate || "-"}</span></div>
            <div class="row"><span class="k">Session</span><span>:</span><span class="v">${session}</span></div>
            <div class="row"><span class="k">Payment Mode</span><span>:</span><span class="v">CASH</span></div>
          </div>
        </div>

        <table class="items">
          <thead>
            <tr>
              <th style="width:55%">DESCRIPTION</th>
              <th style="width:25%">MONTH</th>
              <th class="r" style="width:20%">AMOUNT (₹)</th>
            </tr>
          </thead>
          <tbody>${rows.join("")}</tbody>
        </table>

        <div class="side-summary">
          <div class="in-words">
            <div class="lbl">Amount in Words</div>
            <div class="val">Rupees ${amountToWords(total)} Only</div>
          </div>
          <div class="payment-summary">
            <div class="row total"><span>TOTAL PAYABLE</span><span>₹${fmtINR(total)}</span></div>
          </div>
        </div>
      </div>
    `;
  }

  // ── ONLINE MODE: accommodation + mess split with GST ──
  const parts = gstBreakdown({
    accommodation_base: accommodation_amount,
    mess_base: mess_amount,
    apply_accommodation_gst,
  });

  if (parts.accommodation.base > 0) {
    rows.push(`
      <tr>
        <td>Hostel Accommodation Fee</td>
        <td>${monthLabel}</td>
        <td class="r">${fmtINR(parts.accommodation.base)}</td>
      </tr>
    `);
  }
  if (parts.mess.base > 0) {
    rows.push(`
      <tr>
        <td>Mess Charges</td>
        <td>${monthLabel}</td>
        <td class="r">${fmtINR(parts.mess.base)}</td>
      </tr>
    `);
  }
  rows.push(`
    <tr class="subtotal">
      <td>Subtotal</td>
      <td></td>
      <td class="r">${fmtINR(parts.subtotal)}</td>
    </tr>
  `);
  if (apply_accommodation_gst && parts.accommodation.cgst > 0) {
    rows.push(`
      <tr>
        <td>CGST @9% (Accommodation)</td>
        <td>${monthLabel}</td>
        <td class="r">${fmtINR(parts.accommodation.cgst)}</td>
      </tr>
      <tr>
        <td>SGST @9% (Accommodation)</td>
        <td>${monthLabel}</td>
        <td class="r">${fmtINR(parts.accommodation.sgst)}</td>
      </tr>
    `);
  }
  if (parts.mess.cgst > 0) {
    rows.push(`
      <tr>
        <td>CGST @2.5% (Applicable on Mess Charges only)</td>
        <td>${monthLabel}</td>
        <td class="r">${fmtINR(parts.mess.cgst)}</td>
      </tr>
      <tr>
        <td>SGST @2.5% (Applicable on Mess Charges only)</td>
        <td>${monthLabel}</td>
        <td class="r">${fmtINR(parts.mess.sgst)}</td>
      </tr>
    `);
  }
  rows.push(`
    <tr class="grand">
      <td>GRAND TOTAL (TOTAL AMOUNT PAYABLE)</td>
      <td></td>
      <td class="r">₹${fmtINR(parts.grand_total)}</td>
    </tr>
  `);

  return `
    <div class="page">
      ${brandHeader(hostel)}
      <div class="doc-title">INVOICE</div>
      <div style="text-align:center;">
        ${gstin ? `<div class="gstin-pill">GSTIN : ${gstin}</div>` : ""}
      </div>
      <div class="doc-number">Invoice No.: ${escapeHtml(invoice_no || "")}</div>
      <hr class="rule" />

      <div class="info-grid">
        <div class="info-block">
          <h4>Student Information</h4>
          <div class="row"><span class="k">Student Name</span><span>:</span><span class="v strong">${escapeHtml(student.student_name || "")}</span></div>
          <div class="row"><span class="k">Father Name</span><span>:</span><span class="v">${escapeHtml(student.father_name || "-")}</span></div>
          <div class="row"><span class="k">Student ID</span><span>:</span><span class="v">${escapeHtml(student.student_id || "-")}</span></div>
          <div class="row"><span class="k">Room</span><span>:</span><span class="v">${escapeHtml(student.room_no || "-")}${student.bed_no ? ` (Bed ${escapeHtml(student.bed_no)})` : ""}</span></div>
        </div>
        <div class="info-block">
          <h4>Invoice Information</h4>
          <div class="row"><span class="k">Invoice Date</span><span>:</span><span class="v">${invDate}</span></div>
          <div class="row"><span class="k">Due Date</span><span>:</span><span class="v due">${dueDate || "-"}</span></div>
          <div class="row"><span class="k">Session</span><span>:</span><span class="v">${session}</span></div>
        </div>
      </div>

      <table class="items">
        <thead>
          <tr>
            <th style="width:55%">DESCRIPTION</th>
            <th style="width:25%">MONTH</th>
            <th class="r" style="width:20%">AMOUNT (₹)</th>
          </tr>
        </thead>
        <tbody>${rows.join("")}</tbody>
      </table>

      <div class="side-summary">
        <div class="in-words">
          <div class="lbl">Amount in Words</div>
          <div class="val">Rupees ${amountToWords(parts.grand_total)} Only</div>
        </div>
        <div class="payment-summary">
          <div class="row"><span>Subtotal</span><span>₹${fmtINR(parts.subtotal)}</span></div>
          <div class="row"><span>Total GST (CGST + SGST)</span><span>₹${fmtINR(parts.total_gst)}</span></div>
          <div class="row total"><span>TOTAL PAYABLE</span><span>₹${fmtINR(parts.grand_total)}</span></div>
        </div>
      </div>

      <div class="notes" style="grid-template-columns:1fr;">
        <div>
          <h5>Notes</h5>
          <ul>
            <li>GST is applicable ${apply_accommodation_gst ? "on Mess &amp; Accommodation Charges." : "only on Mess Charges."}</li>
            <li>Kindly make the payment on or before the due date.</li>
            <li>Please mention the <strong>Student Name or Invoice Number</strong> while making the payment.</li>
          </ul>
        </div>
      </div>

      <div class="doc-footer">
        <div class="thanks">Thank you for choosing ${escapeHtml(hostel.hostel_name || "Madhuvan Hostels")}.</div>
        <div>For any queries, please contact the hostel office.</div>
        <div>This is a computer-generated invoice and does not require a signature.</div>
      </div>
    </div>
  `;
};

// -----------------------------------------------------------------------------
// RECEIPT  (image 2 — Admin + Student copies on one page)
// -----------------------------------------------------------------------------
const receiptCopy = ({
  copyTag, hostel, student, receipt_no, payment_date, for_month, payment_mode, received_by,
  accommodation_amount, mess_amount, apply_accommodation_gst, gstin,
  is_online_payment = false, total_amount = 0,
}) => {
  const monthLabel = fmtMonth(for_month);
  const generatedOn = new Date().toLocaleString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit"
  });

  const rows = [];

  // ── CASH MODE: single fee line, no GST ──
  if (!is_online_payment) {
    const total = total_amount || (accommodation_amount + mess_amount);
    rows.push(`<tr><td>Hostel Fee</td><td>${monthLabel}</td><td class="r">${fmtINR(total)}</td></tr>`);
    rows.push(`<tr class="grand"><td>TOTAL AMOUNT RECEIVED</td><td></td><td class="r">₹${fmtINR(total)}</td></tr>`);

    return `
      <div class="page">
        <div style="text-align:center;margin-bottom:2px;">
          <span class="copy-tag">${copyTag}</span>
        </div>
        ${brandHeader(hostel)}
        <div class="doc-title">PAYMENT RECEIPT</div>
        <div style="text-align:center;"><span class="paid-badge">✔ PAID</span></div>
        <div class="doc-number">Receipt No.: ${escapeHtml(receipt_no || "")}</div>
        <hr class="rule" />

        <div class="info-grid">
          <div class="info-block">
            <h4>Student Information</h4>
            <div class="row"><span class="k">Student Name</span><span>:</span><span class="v strong">${escapeHtml(student.student_name || "")}</span></div>
            <div class="row"><span class="k">Father Name</span><span>:</span><span class="v">${escapeHtml(student.father_name || "-")}</span></div>
            <div class="row"><span class="k">Student ID</span><span>:</span><span class="v">${escapeHtml(student.student_id || "-")}</span></div>
            <div class="row"><span class="k">Room</span><span>:</span><span class="v">${escapeHtml(student.room_no || "-")}${student.bed_no ? ` (Bed ${escapeHtml(student.bed_no)})` : ""}</span></div>
          </div>
          <div class="info-block">
            <h4>Payment Information</h4>
            <div class="row"><span class="k">Receipt Date</span><span>:</span><span class="v">${fmtDate(payment_date)}</span></div>
            <div class="row"><span class="k">For Month</span><span>:</span><span class="v">${monthLabel}</span></div>
            <div class="row"><span class="k">Mode of Payment</span><span>:</span><span class="v">CASH</span></div>
            <div class="row"><span class="k">Received By</span><span>:</span><span class="v">${escapeHtml(received_by || "ADMIN")}</span></div>
          </div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 260px;gap:14px;">
          <table class="items">
            <thead>
              <tr>
                <th style="width:55%">DESCRIPTION</th>
                <th style="width:25%">MONTH</th>
                <th class="r" style="width:20%">AMOUNT (₹)</th>
              </tr>
            </thead>
            <tbody>${rows.join("")}</tbody>
          </table>
          <div>
            <div class="in-words" style="margin-bottom:10px;">
              <div class="lbl">Amount in Words</div>
              <div class="val" style="font-size:12px;">Rupees ${amountToWords(total)} Only</div>
            </div>
            <div class="payment-summary">
              <div class="row total"><span>TOTAL RECEIVED</span><span>₹${fmtINR(total)}</span></div>
            </div>
          </div>
        </div>

        <div class="doc-footer">
          <div class="thanks">Thank you for your payment!</div>
          <div>Generated on: ${generatedOn}</div>
        </div>
      </div>
    `;
  }

  // ── ONLINE MODE: accommodation + mess split with GST ──
  const parts = gstBreakdown({
    accommodation_base: accommodation_amount,
    mess_base: mess_amount,
    apply_accommodation_gst,
  });

  if (parts.accommodation.base > 0) {
    rows.push(`
      <tr><td>Hostel Accommodation Fee</td><td>${monthLabel}</td><td class="r">${fmtINR(parts.accommodation.base)}</td></tr>
    `);
  }
  if (parts.mess.base > 0) {
    rows.push(`
      <tr><td>Mess Charges</td><td>${monthLabel}</td><td class="r">${fmtINR(parts.mess.base)}</td></tr>
    `);
  }
  rows.push(`
    <tr class="subtotal"><td>Subtotal</td><td></td><td class="r">${fmtINR(parts.subtotal)}</td></tr>
  `);
  if (apply_accommodation_gst && parts.accommodation.cgst > 0) {

    rows.push(`
      <tr><td>CGST @9% (Accommodation)</td><td>${monthLabel}</td><td class="r">${fmtINR(parts.accommodation.cgst)}</td></tr>
      <tr><td>SGST @9% (Accommodation)</td><td>${monthLabel}</td><td class="r">${fmtINR(parts.accommodation.sgst)}</td></tr>
    `);
  }
  if (parts.mess.cgst > 0) {
    rows.push(`
      <tr><td>CGST @2.5% (Applicable on Mess Charges only)</td><td>${monthLabel}</td><td class="r">${fmtINR(parts.mess.cgst)}</td></tr>
      <tr><td>SGST @2.5% (Applicable on Mess Charges only)</td><td>${monthLabel}</td><td class="r">${fmtINR(parts.mess.sgst)}</td></tr>
    `);
  }
  rows.push(`
    <tr class="grand"><td>TOTAL AMOUNT RECEIVED</td><td></td><td class="r">₹${fmtINR(parts.grand_total)}</td></tr>
  `);

  return `
    <div class="page">
      <div style="text-align:center;margin-bottom:2px;">
        <span class="copy-tag">${copyTag}</span>
      </div>
      ${brandHeader(hostel)}
      <div class="doc-title">PAYMENT RECEIPT</div>
      <div style="text-align:center;"><span class="paid-badge">✔ PAID</span></div>
      <div style="text-align:center;">${gstin ? `<div class="gstin-pill">GSTIN : ${escapeHtml(gstin)}</div>` : ""}</div>
      <div class="doc-number">Receipt No.: ${escapeHtml(receipt_no || "")}</div>
      <hr class="rule" />

      <div class="info-grid">
        <div class="info-block">
          <h4>Student Information</h4>
          <div class="row"><span class="k">Student Name</span><span>:</span><span class="v strong">${escapeHtml(student.student_name || "")}</span></div>
          <div class="row"><span class="k">Father Name</span><span>:</span><span class="v">${escapeHtml(student.father_name || "-")}</span></div>
          <div class="row"><span class="k">Student ID</span><span>:</span><span class="v">${escapeHtml(student.student_id || "-")}</span></div>
          <div class="row"><span class="k">Room</span><span>:</span><span class="v">${escapeHtml(student.room_no || "-")}${student.bed_no ? ` (Bed ${escapeHtml(student.bed_no)})` : ""}</span></div>
        </div>
        <div class="info-block">
          <h4>Payment Information</h4>
          <div class="row"><span class="k">Receipt Date</span><span>:</span><span class="v">${fmtDate(payment_date)}</span></div>
          <div class="row"><span class="k">For Month</span><span>:</span><span class="v">${monthLabel}</span></div>
          <div class="row"><span class="k">Mode of Payment</span><span>:</span><span class="v">${escapeHtml(payment_mode || "CASH")}</span></div>
          <div class="row"><span class="k">Received By</span><span>:</span><span class="v">${escapeHtml(received_by || "ADMIN")}</span></div>
        </div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 260px;gap:14px;">
        <table class="items">
          <thead>
            <tr>
              <th style="width:55%">DESCRIPTION</th>
              <th style="width:25%">MONTH</th>
              <th class="r" style="width:20%">AMOUNT (₹)</th>
            </tr>
          </thead>
          <tbody>${rows.join("")}</tbody>
        </table>

        <div>
          <div class="in-words" style="margin-bottom:10px;">
            <div class="lbl">Amount in Words</div>
            <div class="val" style="font-size:12px;">Rupees ${amountToWords(parts.grand_total)} Only</div>
          </div>
          <div class="payment-summary">
            <div class="row"><span>Subtotal</span><span>₹${fmtINR(parts.subtotal)}</span></div>
            <div class="row"><span>Total GST (CGST + SGST)</span><span>₹${fmtINR(parts.total_gst)}</span></div>
            <div class="row total"><span>TOTAL RECEIVED</span><span>₹${fmtINR(parts.grand_total)}</span></div>
          </div>
        </div>
      </div>

      <div class="notes" style="grid-template-columns:1fr;">
        <div>
          <h5>Notes</h5>
          <ul>
            <li>Payment received for the above charges.</li>
            <li>This is a computer-generated receipt and does not require a signature.</li>
          </ul>
        </div>
      </div>

      <div class="doc-footer">
        <div class="thanks">Thank you for your payment!</div>
        <div>Please mention the Receipt Number for any future reference.</div>
        <div>Generated on: ${generatedOn}</div>
      </div>
    </div>
  `;
};

export const buildReceiptHTML = (params) => {
  const gstin = params.hostel?.gstin || "";
  // GST split: use STUDENT'S admission payment_mode as primary signal.
  // If the student registered as 'online', always show acc+mess+GST format.
  // If they registered as 'cash'/'offline', always show simple fee format.
  const studentMode = (params.student?.payment_mode || "cash").toLowerCase();
  const txMode = (params.payment_mode || "cash").toLowerCase();
  const is_online = studentMode === "online" ||
    txMode === "online" || txMode === "upi" || txMode === "bank" || txMode === "card";
  const total = params.total_amount || (params.accommodation_amount || 0) + (params.mess_amount || 0);
  const commonProps = {
    hostel: params.hostel || {},
    student: params.student || {},
    receipt_no: params.receipt_no,
    payment_date: params.payment_date,
    for_month: params.for_period_start,
    payment_mode: params.payment_mode,
    received_by: params.received_by || "ADMIN",
    accommodation_amount: params.accommodation_amount || 0,
    mess_amount: params.mess_amount || 0,
    apply_accommodation_gst: params.apply_accommodation_gst || false,
    gstin,
    is_online_payment: is_online,
    total_amount: total,
  };

  const copies = params.copies || ["admin", "student"]; // both copies by default

  const pages = [];
  if (copies.includes("admin")) {
    pages.push(receiptCopy({ ...commonProps, copyTag: "ADMIN COPY" }));
  }
  if (copies.includes("student")) {
    if (pages.length) pages.push(`<div class="cut-line">✂ cut here</div>`);
    pages.push(receiptCopy({ ...commonProps, copyTag: "STUDENT COPY" }));
  }
  const inner = pages.join("");
  // Wrap in receipt-dual when both copies print so they fit on one A4
  if (copies.length > 1) {
    return `<div class="receipt-dual">${inner}</div>`;
  }
  return inner;
};

// -----------------------------------------------------------------------------
// BILL  (image 3 — expense bill with items table)
// -----------------------------------------------------------------------------
export const buildBillHTML = ({ hostel = {}, entry = {}, items = [] }) => {
  const billNo = escapeHtml(entry.bill_no || entry.entry_id || "EXP");
  const billDate = fmtDate(entry.entry_date || new Date());

  const table = (items && items.length)
    ? items
    : [{
        description: entry.description || "Expense",
        qty: 1,
        unit: "-",
        rate: entry.amount || 0,
        amount: entry.amount || 0,
      }];

  const totalAmount = table.reduce((sum, r) => sum + Number(r.amount || 0), 0);
  const itemRows = table.map((r, i) => `
    <tr>
      <td class="r">${i + 1}</td>
      <td>${escapeHtml(r.description || "-")}</td>
      <td class="r">${fmtINR(r.qty || 0)}</td>
      <td>${escapeHtml(r.unit || "-")}</td>
      <td class="r">${fmtINR(r.rate || 0)}</td>
      <td class="r">${fmtINR(r.amount || 0)}</td>
    </tr>
  `).join("");

  return `
    <div class="page">
      ${brandHeader(hostel)}
      <hr class="rule" style="border-top:1px dotted #94a3b8; margin: 8px 0 14px;" />
      <div class="doc-title" style="letter-spacing:1px;">EXPENSE BILL</div>

      <div class="info-grid">
        <div class="info-block" style="border:1px solid #cbd5e1; border-radius:8px; padding:10px 12px;">
          <div class="row"><span class="k">Bill No.</span><span>:</span><span class="v">${billNo}</span></div>
          <div class="row"><span class="k">Bill Date</span><span>:</span><span class="v">${billDate}</span></div>
          <div class="row"><span class="k">Expense Category</span><span>:</span><span class="v">${escapeHtml((entry.category || "").replace(/_/g, " "))}</span></div>
          <div class="row"><span class="k">Payment Mode</span><span>:</span><span class="v">${escapeHtml(entry.payment_mode || "-")}</span></div>
          <div class="row"><span class="k">Reference No.</span><span>:</span><span class="v">${escapeHtml(entry.reference_no || "-")}</span></div>
        </div>
        <div class="info-block" style="border:1px solid #cbd5e1; border-radius:8px; padding:10px 12px;">
          <h4>Vendor / Supplier Details</h4>
          <div class="row"><span class="k">Supplier Name</span><span>:</span><span class="v">${escapeHtml(entry.supplier_name || "-")}</span></div>
          <div class="row"><span class="k">Address</span><span>:</span><span class="v">${escapeHtml(entry.supplier_address || "-")}</span></div>
          <div class="row"><span class="k">Contact No.</span><span>:</span><span class="v">${escapeHtml(entry.supplier_phone || "-")}</span></div>
        </div>
      </div>

      <table class="items">
        <thead>
          <tr>
            <th class="r" style="width:6%">S. No.</th>
            <th style="width:38%">Description of Item / Service</th>
            <th class="r" style="width:12%">Quantity</th>
            <th style="width:10%">Unit</th>
            <th class="r" style="width:14%">Rate (₹)</th>
            <th class="r" style="width:20%">Amount (₹)</th>
          </tr>
        </thead>
        <tbody>${itemRows}</tbody>
        <tfoot>
          <tr class="grand">
            <td colspan="5" class="r"><strong>TOTAL AMOUNT</strong></td>
            <td class="r"><strong>₹${fmtINR(totalAmount)}</strong></td>
          </tr>
        </tfoot>
      </table>

      <div class="in-words" style="margin-top:10px;">
        <div class="lbl">Amount in Words</div>
        <div class="val">Rupees ${amountToWords(totalAmount)} Only</div>
      </div>

      ${entry.notes ? `
        <div style="margin-top:10px;border:1px solid #cbd5e1;border-radius:8px;padding:8px 12px;">
          <div style="font-weight:800;color:#1e3a8a;font-size:11px;text-transform:uppercase;">Notes / Purpose of Expense:</div>
          <div style="font-size:11px;color:#334155;margin-top:2px;">${escapeHtml(entry.notes)}</div>
        </div>` : ""}

      <div style="margin-top:10px;border:1px solid #1e3a8a;border-radius:8px;overflow:hidden;">
        <div style="background:#1e3a8a;color:#fff;padding:6px 12px;font-weight:800;font-size:11px;text-transform:uppercase;">Payment Details</div>
        <div class="info-grid" style="margin:10px 12px;">
          <div class="info-block">
            <div class="row"><span class="k">Paid To</span><span>:</span><span class="v">${escapeHtml(entry.supplier_name || "-")}</span></div>
            <div class="row"><span class="k">Amount Paid</span><span>:</span><span class="v strong">₹${fmtINR(totalAmount)}</span></div>
            <div class="row"><span class="k">Payment Date</span><span>:</span><span class="v">${billDate}</span></div>
          </div>
          <div class="info-block">
            <div class="row"><span class="k">Payment Mode</span><span>:</span><span class="v">${escapeHtml(entry.payment_mode || "-")}</span></div>
            <div class="row"><span class="k">Reference No.</span><span>:</span><span class="v">${escapeHtml(entry.reference_no || "-")}</span></div>
          </div>
        </div>
      </div>

      <div class="doc-footer">This is a computer-generated bill and does not require a signature.</div>
    </div>
  `;
};

// -----------------------------------------------------------------------------
// VOUCHER (kept for salary printouts elsewhere)
// -----------------------------------------------------------------------------
export const buildVoucherHTML = ({ hostel = {}, voucher_no, date, payee, amount, purpose, payment_mode = "CASH", reference_no }) => `
  <div class="page">
    ${brandHeader(hostel)}
    <div class="doc-title">PAYMENT VOUCHER</div>
    <div class="doc-number">Voucher No.: ${escapeHtml(voucher_no || "")}</div>
    <hr class="rule" />
    <div class="info-grid">
      <div class="info-block">
        <div class="row"><span class="k">Date</span><span>:</span><span class="v">${fmtDate(date)}</span></div>
        <div class="row"><span class="k">Paid To</span><span>:</span><span class="v strong">${escapeHtml(payee || "")}</span></div>
        <div class="row"><span class="k">Purpose</span><span>:</span><span class="v">${escapeHtml(purpose || "")}</span></div>
      </div>
      <div class="info-block">
        <div class="row"><span class="k">Payment Mode</span><span>:</span><span class="v">${escapeHtml(payment_mode)}</span></div>
        <div class="row"><span class="k">Reference No.</span><span>:</span><span class="v">${escapeHtml(reference_no || "-")}</span></div>
        <div class="row"><span class="k">Amount</span><span>:</span><span class="v strong">₹${fmtINR(amount)}</span></div>
      </div>
    </div>
    <div class="in-words" style="margin-top:12px;">
      <div class="lbl">Amount in Words</div>
      <div class="val">Rupees ${amountToWords(amount)} Only</div>
    </div>
    <div class="doc-footer">Computer-generated voucher.</div>
  </div>
`;

// -----------------------------------------------------------------------------
// PRINT HELPERS
// -----------------------------------------------------------------------------
export const printInvoice = (params) => {
  const html = buildInvoiceHTML(params);
  printWithPreview(html, `Invoice-${params.invoice_no || "New"}`, baseStyles);
};

export const printReceipt = (params) => {
  const copies = params.copies && params.copies.length ? params.copies : ["admin", "student"];
  const html = buildReceiptHTML({ ...params, copies });
  printWithPreview(html, `Receipt-${params.receipt_no || "New"}`, baseStyles);
};

export const printBill = (params) => {
  const html = buildBillHTML(params);
  printWithPreview(html, `Bill-${params.entry?.bill_no || params.entry?.entry_id || "New"}`, baseStyles);
};

export const printVoucher = (params) => {
  const html = buildVoucherHTML(params);
  printWithPreview(html, `Voucher-${params.voucher_no || "New"}`, baseStyles);
};

// Prints a single invoice for one fee (accommodation + mess split by 5000 rule — online only).
export const printInvoiceForFee = ({
  hostel, student, fee,
  apply_accommodation_gst = false,
  invoice_no,
}) => {
  // Determine if this is an online payment student
  const paymentMode = (student.payment_mode || "cash").toLowerCase();
  const is_online_payment = paymentMode === "online";

  const cycle = (student.fee_type_cycle || "monthly").toLowerCase();
  const months = cycle === "half_yearly" ? 6 : cycle === "yearly" ? 12 : 1;
  const monthlyMess = 5000;
  const totalMess = monthlyMess * months;

  const feeTotal = Number(fee.final_amount || fee.fee_amount || 0);
  // If the fee's fee_type suggests it's a Mess-only or Accommodation-only entry,
  // treat that whole amount as one bucket. Otherwise split by 5000 rule.
  const type = String(fee.fee_type || "").toLowerCase();
  
  let accommodation_amount = 0;
  let mess_amount = 0;
  
  if (type.includes("rent")) {
    accommodation_amount = Math.max(0, feeTotal - totalMess);
    mess_amount = Math.min(feeTotal, totalMess);
  } else if (type.includes("mess")) {
    mess_amount = feeTotal;
  } else if (type.includes("security")) {
    accommodation_amount = feeTotal;
  } else {
    // For fines, penalties, property damage, money given, etc.
    // Assign to accommodation_amount so no GST is applied.
    accommodation_amount = feeTotal;
  }

  const html = buildInvoiceHTML({
    hostel,
    student,
    invoice_no: invoice_no || `INV-${student.student_id}-${fee.fee_id}`,
    invoice_date: new Date().toISOString().split("T")[0],
    due_date: fee.due_date,
    period_start: fee.fee_period_start || fee.fee_month,
    period_end: fee.fee_period_end,
    accommodation_amount,
    mess_amount,
    apply_accommodation_gst: is_online_payment ? apply_accommodation_gst : false,
    is_online_payment,
    total_fee_amount: feeTotal,
  });
  printWithPreview(html, `Invoice-${student.student_name}`, baseStyles);
};

// Back-compat alias
export const printAllInvoicesForFee = printInvoiceForFee;

// Legacy helper (was used to compute a single number split into acc + mess).
export const gstSplitFromOnlineInvoice = (invoice_amount, opts = {}) => {
  const total = Number(invoice_amount) || 0;
  const messBase = 5000;
  const accBase = Math.max(0, total - messBase);
  return gstBreakdown({
    accommodation_base: accBase,
    mess_base: messBase,
    apply_accommodation_gst: !!opts.apply_accommodation_gst,
  });
};
