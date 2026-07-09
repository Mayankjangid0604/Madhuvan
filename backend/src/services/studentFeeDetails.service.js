// services/studentFeeDetails.service.js
const db = require("../config/db.sqlite");

const toNum = (v) => Number(v) || 0;

const getFeeGst = (fee, student) => {
  if (!student || (student.payment_mode || 'cash').toLowerCase() !== 'online') {
    return 0;
  }
  const cycle = (student.fee_type_cycle || "monthly").toLowerCase();
  const months = cycle === "half_yearly" ? 6 : cycle === "yearly" ? 12 : 1;
  const totalMess = 5000 * months;
  
  const feeTotal = toNum(fee.final_amount);
  const type = String(fee.fee_type || "").toLowerCase();
  
  let mess_amount = 0;
  if (type.includes("rent")) {
    mess_amount = Math.min(feeTotal, totalMess);
  } else if (type.includes("mess")) {
    mess_amount = feeTotal;
  }
  
  return mess_amount * 0.05; // 5% GST (2.5% CGST + 2.5% SGST)
};

const getTotalDue = (fee, student) => {
  return toNum(fee.final_amount) + toNum(fee.previous_dues) + toNum(fee.penalty_amount) +
    toNum(fee.fine_amount) + toNum(fee.property_damage_amount) + toNum(fee.money_given_amount) -
    toNum(fee.advance_used) + getFeeGst(fee, student);
};

const getRemaining = (fee, student) => Math.max(0, getTotalDue(fee, student) - toNum(fee.paid_amount));

exports.getStudentFeeDetails = (studentId) => {
  // Get student info
  const student = db.db.prepare(`
    SELECT s.*, r.room_no, b.bed_no
    FROM students s
    LEFT JOIN room_allocation a ON a.student_id = s.student_id AND a.allocation_status = 'active'
    LEFT JOIN rooms r ON a.room_id = r.room_id
    LEFT JOIN beds b ON a.bed_id = b.bed_id
    WHERE s.student_id = ?
  `).get(studentId);

  if (!student) return null;

  // Get all fees
  const fees = db.db.prepare(`
    SELECT * FROM student_fees 
    WHERE student_id = ? 
    ORDER BY fee_month DESC, fee_id DESC
  `).all(studentId);

  // Add total_due and remaining to each fee
  const processedFees = fees.map(fee => ({
    ...fee,
    total_due: getTotalDue(fee, student),
    remaining: getRemaining(fee, student)
  }));

  // Get all payments with fee details
  const payments = db.db.prepare(`
    SELECT 
      fp.*,
      sf.fee_type,
      sf.fee_month,
      sf.final_amount as fee_amount
    FROM fee_payments fp
    LEFT JOIN student_fees sf ON sf.fee_id = fp.fee_id
    WHERE fp.student_id = ?
    ORDER BY fp.payment_date DESC, fp.payment_id DESC
  `).all(studentId);

  // Calculate summary
  let totalDue = 0;
  let totalPaid = 0;

  for (const fee of processedFees) {
    totalDue += fee.total_due;
    totalPaid += toNum(fee.paid_amount);
  }

  // Get advance balance
  const advanceResult = db.db.prepare(`
    SELECT COALESCE(SUM(amount - used_amount), 0) as total
    FROM student_advances
    WHERE student_id = ? AND status = 'PENDING'
  `).get(studentId);

  // Get pending fines
  const finesResult = db.db.prepare(`
    SELECT COALESCE(SUM(amount), 0) as total
    FROM pending_fines
    WHERE student_id = ? AND status = 'PENDING'
  `).get(studentId);

  // Get pending damages
  const damagesResult = db.db.prepare(`
    SELECT COALESCE(SUM(amount), 0) as total
    FROM property_damage_records
    WHERE student_id = ? AND status = 'PENDING'
  `).get(studentId);

  // Get pending money given
  const moneyResult = db.db.prepare(`
    SELECT COALESCE(SUM(amount), 0) as total
    FROM money_given_records
    WHERE student_id = ? AND status = 'PENDING'
  `).get(studentId);

  // Update totals to include pending items
  const finalTotalDue = totalDue + toNum(finesResult?.total) + toNum(damagesResult?.total) + toNum(moneyResult?.total);
  const finalTotalRemaining = Math.max(0, totalDue - totalPaid) + toNum(finesResult?.total) + toNum(damagesResult?.total) + toNum(moneyResult?.total);

  return {
    student,
    fees: processedFees,
    payments,
    summary: {
      total_due: finalTotalDue,
      total_paid: totalPaid,
      total_remaining: finalTotalRemaining,
      advance_balance: toNum(advanceResult?.total),
      pending_fines: toNum(finesResult?.total),
      pending_damages: toNum(damagesResult?.total),
      pending_money_given: toNum(moneyResult?.total)
    }
  };
};

// ============================================
// EARLY-EXIT FINAL INVOICE PREVIEW (< 90 days)
// Computes:
//   - Remaining accommodation for the exit-month period (unpaid days × per-day rate)
//   - Remaining mess for the exit-month period (unpaid days × ₹5000/mo prorated)
//   - 5% GST (2.5% CGST + 2.5% SGST) on remaining mess
//   - 18% GST (9% CGST + 9% SGST) on TOTAL accommodation ever billed
//     (accommodation already paid + remaining accommodation).
// Returns numbers only — the caller renders the invoice.
// ============================================
exports.computeEarlyExitInvoice = ({ studentId, exit_date }) => {
  const db = require("../config/db.sqlite");
  const student = db.db.prepare("SELECT * FROM students WHERE student_id = ?").get(studentId);
  if (!student) throw new Error("Student not found");

  const joining = new Date(student.date_of_joining);
  const exit = exit_date ? new Date(exit_date) : new Date();
  const daysStayed = Math.max(0, Math.floor((exit - joining) / (1000 * 60 * 60 * 24)));

  const cycle = (student.fee_type_cycle || "monthly").toLowerCase();
  const months = cycle === "half_yearly" ? 6 : cycle === "yearly" ? 12 : 1;
  const messPerMonth = 5000;
  const cycleTotal = Number(student.monthly_fee || 0);
  const cycleMess = messPerMonth * months;
  const cycleAccommodation = Math.max(0, cycleTotal - cycleMess);
  const perDayAccommodation = cycleAccommodation / (months * 30);
  const perDayMess = cycleMess / (months * 30);

  // Sum all paid amounts previously received against accommodation portion.
  const paidRows = db.db.prepare(`
    SELECT COALESCE(SUM(paid_amount), 0) as total
    FROM student_fees
    WHERE student_id = ?
      AND fee_type NOT LIKE '%Mess%'
      AND fee_type NOT LIKE '%Security%'
  `).get(studentId);
  const accPaidHistorical = Number(paidRows?.total || 0);

  // (unpaid remaining not currently used in the proration; kept for future use)

  // Compute a proration for the current partial period from joining anniversary.
  // For simplicity we take the fractional days beyond the last completed month.
  const daysLeftInPeriod = daysStayed % 30;
  const proratedAccommodation = Math.round(perDayAccommodation * daysLeftInPeriod * 100) / 100;
  const proratedMess = Math.round(perDayMess * daysLeftInPeriod * 100) / 100;

  const totalAccommodation = accPaidHistorical + proratedAccommodation;
  const accCgst = Math.round(totalAccommodation * 0.09 * 100) / 100;
  const accSgst = Math.round(totalAccommodation * 0.09 * 100) / 100;

  const messCgst = Math.round(proratedMess * 0.025 * 100) / 100;
  const messSgst = Math.round(proratedMess * 0.025 * 100) / 100;

  const grand = proratedAccommodation + proratedMess + accCgst + accSgst + messCgst + messSgst;

  return {
    student_id: studentId,
    exit_date: exit.toISOString().split("T")[0],
    days_stayed: daysStayed,
    days_left_in_period: daysLeftInPeriod,
    accommodation_remaining: proratedAccommodation,
    mess_remaining: proratedMess,
    accommodation_paid_historical: Math.round(accPaidHistorical * 100) / 100,
    total_accommodation: Math.round(totalAccommodation * 100) / 100,
    accommodation_cgst: accCgst,
    accommodation_sgst: accSgst,
    mess_cgst: messCgst,
    mess_sgst: messSgst,
    grand_total: Math.round(grand * 100) / 100,
    applies: daysStayed < 90,
  };
};

module.exports = exports;