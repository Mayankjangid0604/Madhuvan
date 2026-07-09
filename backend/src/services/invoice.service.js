const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const db = require('../config/db.sqlite');
const settingsService = require('./settings.service');

const toNum = (v) => Number(v) || 0;

const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A';
const formatCurrency = (a) => `₹${toNum(a).toLocaleString('en-IN')}`;
const formatMonth = (d) => d ? new Date(d).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) : 'N/A';

// ============================================
// DRAW SINGLE INVOICE COPY
// ============================================
function drawInvoiceCopy(doc, yOffset, hostelInfo, student, payment, copyLabel) {
  const breakdown = payment.breakdown || [];
  const isPaid = breakdown.length > 0;
  
  // Get remaining balance
  const remainingResult = db.db.prepare(`
    SELECT COALESCE(SUM(
      final_amount + previous_dues + penalty_amount + fine_amount + property_damage_amount + money_given_amount - paid_amount
    ), 0) as total FROM student_fees WHERE student_id = ? AND fee_status != 'PAID'
  `).get(payment.student_id);
  const remainingBalance = toNum(remainingResult?.total);
  
  // Header
  doc.fontSize(14).font('Helvetica-Bold')
    .text(hostelInfo?.hostel_name || 'HOSTEL', 50, yOffset + 15, { align: 'center', width: 495 });
  
  doc.fontSize(8).font('Helvetica')
    .text('FEE RECEIPT', 50, yOffset + 35, { align: 'center', width: 495 });
  
  // Copy label
  doc.fontSize(7).text(copyLabel, 480, yOffset + 15);
  
  // Line
  doc.moveTo(50, yOffset + 48).lineTo(545, yOffset + 48).stroke();
  
  // Invoice info row
  doc.fontSize(9).font('Helvetica');
  doc.text(`Invoice: ${payment.invoice_number || 'N/A'}`, 50, yOffset + 55);
  doc.text(`Date: ${formatDate(payment.payment_date)}`, 300, yOffset + 55);
  
  // Student info row
  doc.text(`Student: ${student.student_name}`, 50, yOffset + 70);
  doc.text(`ID: ${student.student_id} | Room: ${student.room_no || 'N/A'}`, 300, yOffset + 70);
  doc.text(`Father: ${student.father_name || 'N/A'}`, 50, yOffset + 85);
  doc.text(`📞 ${student.student_mobile || student.father_mobile || 'N/A'}`, 300, yOffset + 85);
  
  // Line
  doc.moveTo(50, yOffset + 100).lineTo(545, yOffset + 100).stroke();
  
  // Payment amount
  doc.fontSize(10).font('Helvetica-Bold')
    .text(`PAYMENT: ${formatCurrency(payment.payment_amount)} (${payment.payment_mode || 'CASH'}${payment.reference_no ? ' | Ref: ' + payment.reference_no : ''})`, 50, yOffset + 108);
  
  // Line
  doc.moveTo(50, yOffset + 123).lineTo(545, yOffset + 123).stroke();
  
  // Applied to section
  let y = yOffset + 133;
  doc.fontSize(9).font('Helvetica-Bold').text('APPLIED TO:', 50, y);
  doc.text('AMOUNT', 480, y, { align: 'right', width: 65 });
  y += 15;
  
  doc.font('Helvetica').fontSize(9);
  
  // Breakdown items
  for (const item of breakdown) {
    if (item.type === 'Advance Created') continue;
    
    const label = item.month ? `${item.month} ${item.type}` : item.type;
    doc.text(label, 50, y);
    doc.text(formatCurrency(item.amount) + ' ✓', 480, y, { align: 'right', width: 65 });
    y += 14;
  }
  
  // Advance created
  const advanceItem = breakdown.find(b => b.type === 'Advance Created');
  if (advanceItem) {
    doc.fillColor('green');
    doc.text('Advance Created', 50, y);
    doc.text(formatCurrency(advanceItem.amount), 480, y, { align: 'right', width: 65 });
    doc.fillColor('black');
    y += 14;
  }
  
  // Line
  doc.moveTo(50, y + 3).lineTo(545, y + 3).stroke();
  y += 13;
  
  // Total paid
  doc.font('Helvetica-Bold').fontSize(10);
  doc.text('TOTAL PAID', 50, y);
  doc.text(formatCurrency(payment.payment_amount), 480, y, { align: 'right', width: 65 });
  y += 18;
  
  // Balance due section
  if (remainingBalance > 0) {
    doc.moveTo(50, y).lineTo(545, y).stroke();
    y += 10;
    
    doc.font('Helvetica-Bold').fontSize(9).fillColor('red');
    doc.text('BALANCE DUE:', 50, y);
    y += 14;
    
    // Get unpaid fees breakdown
    const unpaidFees = db.db.prepare(`
      SELECT * FROM student_fees WHERE student_id = ? AND fee_status != 'PAID' ORDER BY fee_month ASC
    `).all(payment.student_id);
    
    doc.font('Helvetica').fontSize(8);
    for (const fee of unpaidFees) {
      const remaining = toNum(fee.final_amount) + toNum(fee.previous_dues) + toNum(fee.penalty_amount) +
        toNum(fee.fine_amount) + toNum(fee.property_damage_amount) + toNum(fee.money_given_amount) - toNum(fee.paid_amount);
      
      if (remaining > 0) {
        doc.text(`${formatMonth(fee.fee_month)} - ${fee.fee_type}`, 60, y);
        doc.text(formatCurrency(remaining), 480, y, { align: 'right', width: 65 });
        y += 12;
      }
    }
    
    doc.fillColor('black');
    y += 5;
    doc.moveTo(50, y).lineTo(545, y).stroke();
    y += 10;
    
    doc.font('Helvetica-Bold').fontSize(10).fillColor('red');
    doc.text('TOTAL DUE', 50, y);
    doc.text(formatCurrency(remainingBalance), 480, y, { align: 'right', width: 65 });
    doc.fillColor('black');
    y += 18;
  } else {
    doc.font('Helvetica-Bold').fontSize(10).fillColor('green');
    doc.text('✓ ALL DUES CLEARED', 50, y);
    doc.fillColor('black');
    y += 18;
  }
  
  // Footer
  doc.fontSize(8).font('Helvetica');
  doc.text(`Printed: ${formatDate(new Date())}`, 50, y + 10);
  doc.text('Authorized Signature: _______________', 380, y + 10);
  
  return y + 40;
}

// ============================================
// GENERATE INVOICE PDF
// ============================================
async function generateInvoicePDF(invoiceNumber) {
  // Get payment by invoice number
  const payment = db.db.prepare(`
    SELECT fp.*, s.student_name, s.father_name, s.student_mobile, s.father_mobile, r.room_no
    FROM fee_payments fp
    JOIN students s ON s.student_id = fp.student_id
    LEFT JOIN room_allocation a ON a.student_id = s.student_id AND a.allocation_status = 'active'
    LEFT JOIN rooms r ON a.room_id = r.room_id
    WHERE fp.invoice_number = ?
  `).get(invoiceNumber);
  
  if (!payment) throw new Error('Invoice not found');
  
  // Parse breakdown
  payment.breakdown = payment.breakdown ? JSON.parse(payment.breakdown) : [];
  
  const student = {
    student_id: payment.student_id,
    student_name: payment.student_name,
    father_name: payment.father_name,
    student_mobile: payment.student_mobile,
    father_mobile: payment.father_mobile,
    room_no: payment.room_no
  };
  
  const hostelInfo = await settingsService.getHostelInfo() || {};
  
  // Create PDF directory
  const appDir = path.join(process.env.APPDATA || process.env.HOME, 'Madhuvan');
  const dir = path.join(appDir, 'invoices');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  
  const filePath = path.join(dir, `invoice_${invoiceNumber.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`);
  
  // Create PDF
  const doc = new PDFDocument({ size: 'A4', margin: 40 });
  doc.pipe(fs.createWriteStream(filePath));
  
  // Admin copy (top half)
  drawInvoiceCopy(doc, 0, hostelInfo, student, payment, 'ADMIN COPY');
  
  // Separator line
  doc.moveTo(40, 410).lineTo(555, 410).dash(3).stroke().undash();
  
  // Student copy (bottom half)
  drawInvoiceCopy(doc, 420, hostelInfo, student, payment, 'STUDENT COPY');
  
  doc.end();
  
  return filePath;
}

// ============================================
// GENERATE INVOICE FOR FEE (Legacy support)
// ============================================
async function generateInvoiceForFee(feeId) {
  const fee = db.db.prepare('SELECT * FROM student_fees WHERE fee_id = ?').get(feeId);
  if (!fee) throw new Error('Fee not found');
  
  // Find payment for this fee
  const payment = db.db.prepare(`
    SELECT invoice_number FROM fee_payments 
    WHERE student_id = ? AND invoice_number IS NOT NULL
    ORDER BY payment_id DESC LIMIT 1
  `).get(fee.student_id);
  
  if (!payment?.invoice_number) throw new Error('No invoice found for this fee');
  
  return generateInvoicePDF(payment.invoice_number);
}

module.exports = { generateInvoicePDF, generateInvoiceForFee };