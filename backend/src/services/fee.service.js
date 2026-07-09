77// services/fee.service.js
const db = require("../config/db.sqlite");

// ============================================
// CONSTANTS
// ============================================
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

// ============================================
// HELPERS
// ============================================
const toNum = (v) => Number(v) || 0;
const getRentFeeType = (cycle) => {
  const c = String(cycle || 'monthly').toLowerCase();
  if (c === 'yearly') return 'Yearly Rent';
  if (c === 'half_yearly') return 'Half-Yearly Rent';
  return 'Monthly Rent';
};

const getMonthEnd = (year, month) => new Date(year, month + 1, 0).getDate();

const parseDateParts = exports.parseDateParts = (dateStr) => {
  if (!dateStr) {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth(), day: now.getDate() };
  }
  const str = String(dateStr).trim();
  const parts = str.split('T')[0].split('-');
  if (parts.length >= 3) {
    return {
      year: parseInt(parts[0], 10),
      month: parseInt(parts[1], 10) - 1,
      day: parseInt(parts[2], 10)
    };
  }
  const d = new Date(str);
  return {
    year: d.getUTCFullYear(),
    month: d.getUTCMonth(),
    day: d.getUTCDate()
  };
};

const generateInvoiceNumber = () => {
  const year = new Date().getFullYear();
  const prefix = `INV-${year}-`;
  const last = db.db.prepare(`
    SELECT invoice_number FROM fee_payments 
    WHERE invoice_number LIKE ? ORDER BY payment_id DESC LIMIT 1
  `).get(`${prefix}%`);

  const seq = last?.invoice_number ? parseInt(last.invoice_number.split('-').pop()) + 1 : 1;
  return `${prefix}${String(seq).padStart(6, '0')}`;
};

const calculateDueDate = (startDate) => {
  const { year, month, day } = parseDateParts(startDate);
  const endOfMonth = getMonthEnd(year, month);
  const dueDay = Math.min(day + 5, endOfMonth);
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(dueDay).padStart(2, '0')}`;
};

const calculateProratedFee = exports.calculateProratedFee = (monthlyFee, joiningDate) => {
  const { year, month, day } = parseDateParts(joiningDate);

  if (day === 1) {
    return { amount: monthlyFee, isProrated: false };
  }

  const daysInMonth = getMonthEnd(year, month);
  const remainingDays = daysInMonth - day + 1;
  const proratedAmount = Math.round((monthlyFee / daysInMonth) * remainingDays);

  return {
    amount: proratedAmount,
    isProrated: true,
    daysInMonth,
    remainingDays,
    perDayRate: Math.round(monthlyFee / daysInMonth)
  };
};

const getFeeGst = (fee, student) => {
  if (!student || (student.payment_mode || 'cash').toLowerCase() !== 'online') {
    return 0;
  }

  // GST applies only from July 2026 onwards
  const feeMonth = fee.fee_month || fee.fee_date || '';
  if (feeMonth && feeMonth < '2026-07') {
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

  return mess_amount * 0.05;
};

const getTotalDue = (fee, student = null) => {
  return toNum(fee.final_amount) + toNum(fee.previous_dues) +
    toNum(fee.penalty_amount) + toNum(fee.fine_amount) +
    toNum(fee.property_damage_amount) + toNum(fee.money_given_amount) -
    toNum(fee.advance_used) + getFeeGst(fee, student);
};

const calculateStatus = (fee, student = null) => {
  const totalDue = getTotalDue(fee, student);
  const paid = toNum(fee.paid_amount);

  if (paid >= totalDue) return 'PAID';
  if (paid > 0) return 'PARTIAL';

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(fee.due_date);
  due.setHours(0, 0, 0, 0);

  return today > due ? 'OVERDUE' : 'DUE';
};

const getRemaining = (fee, student = null) => Math.max(0, getTotalDue(fee, student) - toNum(fee.paid_amount));

const normalizePaymentMode = (mode) => {
  if (!mode) return 'CASH';
  const upper = mode.toUpperCase().trim();
  const validModes = ['CASH', 'UPI', 'BANK', 'CHEQUE', 'ONLINE', 'CARD'];
  return validModes.includes(upper) ? upper : 'CASH';
};

const getStudentAdvance = (studentId) => {
  const r = db.db.prepare(`
    SELECT COALESCE(SUM(amount - used_amount), 0) as total
    FROM student_advances 
    WHERE student_id = ? AND status = 'PENDING' AND (amount - used_amount) > 0
  `).get(studentId);
  return toNum(r?.total);
};

const getPreviousDues = (studentId, beforeMonth) => {
  const fees = db.db.prepare(`
    SELECT * FROM student_fees 
    WHERE student_id = ? AND fee_month < ? 
    AND fee_status != 'PAID'
    AND fee_type IN ('Monthly Rent', 'Half-Yearly Rent', 'Yearly Rent')
    ORDER BY fee_month ASC
  `).all(studentId, beforeMonth);

  return fees.reduce((sum, f) => sum + getRemaining(f), 0);
};

const getPendingItems = (studentId) => {
  const fines = db.db.prepare(`
    SELECT COALESCE(SUM(amount), 0) as total FROM pending_fines 
    WHERE student_id = ? AND status = 'PENDING'
  `).get(studentId);

  const damages = db.db.prepare(`
    SELECT COALESCE(SUM(amount), 0) as total FROM property_damage_records 
    WHERE student_id = ? AND status = 'PENDING' AND deducted_from_security = 0
  `).get(studentId);

  const money = db.db.prepare(`
    SELECT COALESCE(SUM(amount), 0) as total FROM money_given_records 
    WHERE student_id = ? AND status = 'PENDING' AND deducted_from_security = 0
  `).get(studentId);

  return {
    fines: toNum(fines?.total),
    damages: toNum(damages?.total),
    moneyGiven: toNum(money?.total)
  };
};

const applyPendingItems = (studentId, feeId) => {
  db.db.prepare(`
    UPDATE pending_fines SET status = 'APPLIED', applied_to_fee_id = ?, applied_at = CURRENT_TIMESTAMP
    WHERE student_id = ? AND status = 'PENDING'
  `).run(feeId, studentId);

  db.db.prepare(`
    UPDATE property_damage_records SET status = 'APPLIED', applied_to_fee_id = ?
    WHERE student_id = ? AND status = 'PENDING' AND deducted_from_security = 0
  `).run(feeId, studentId);

  db.db.prepare(`
    UPDATE money_given_records SET status = 'APPLIED', applied_to_fee_id = ?
    WHERE student_id = ? AND status = 'PENDING' AND deducted_from_security = 0
  `).run(feeId, studentId);
};

// ============================================
// CREATE INITIAL FEES FOR STUDENT
// ============================================
exports.createInitialFeesForStudent = (data, isInsideTransaction = false) => {
  const {
    student_id,
    monthly_fee,
    security_deposit,
    fee_start_date,
    has_discount,
    discount_type,
    discount_value,
    discount_applicable,
    discount_months,
    next_fee_due_date,
    fee_type_cycle,
    discount_on_full_month
  } = data;

  const createFees = () => {
    let mainFeeId = null;
    let securityFeeId = null;

    if (security_deposit && security_deposit > 0) {
      const secResult = db.db.prepare(`
        INSERT INTO student_fees (
          student_id, fee_type, fee_month, fee_amount, discount_amount, 
          final_amount, paid_amount, fee_status, fee_date, due_date,
          fee_period_start, fee_period_end
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        student_id, 'Security Deposit', fee_start_date, security_deposit, 0,
        security_deposit, 0, 'DUE', fee_start_date, calculateDueDate(fee_start_date),
        fee_start_date, fee_start_date
      );
      securityFeeId = secResult.lastInsertRowid;
    }

    if (monthly_fee && monthly_fee > 0) {
      const { year, month } = parseDateParts(fee_start_date);
      const monthStr = `${year}-${String(month + 1).padStart(2, '0')}-01`;
      const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;

      const existing = db.db.prepare(`
        SELECT fee_id FROM student_fees 
        WHERE student_id = ? 
        AND strftime('%Y-%m', fee_month) = ?
        AND fee_type IN ('Monthly Rent', 'Half-Yearly Rent', 'Yearly Rent')
      `).get(student_id, monthKey);

      if (existing) {
        mainFeeId = existing.fee_id;
      } else {
        const cycle = (fee_type_cycle || 'monthly').toLowerCase();
        let baseFeeAmount = monthly_fee;
        let proratedInfo = { isProrated: false, daysInMonth: 30, remainingDays: 30 }; // Default object for standard rate

        // ✅ FIX: Only prorate if the cycle is monthly
        if (cycle === 'monthly') {
          proratedInfo = calculateProratedFee(monthly_fee, fee_start_date);
          baseFeeAmount = proratedInfo.amount;
        }

        let discountAmount = 0;
        if (has_discount && discount_value > 0) {
          // Normalize values for backward compatibility
          const normalDiscountApplicable = discount_applicable === 'complete' ? 'all_months' : discount_applicable;
          const normalDiscountType = discount_type === 'percent' ? 'percentage' : (discount_type === 'amount' ? 'fixed' : discount_type);

          let shouldApplyDiscount = false;
          if (normalDiscountApplicable === 'all_months') {
            shouldApplyDiscount = true;
          } else if (normalDiscountApplicable === 'specific_months' && discount_months) {
            const allowedMonths = discount_months.split(',').map(m => m.trim());
            shouldApplyDiscount = allowedMonths.includes(monthKey);
          }
          if (shouldApplyDiscount) {
            const useFullMonthForDiscount = (discount_on_full_month === 1 || discount_on_full_month === true);

            if (normalDiscountType === 'percentage') {
              const targetAmount = useFullMonthForDiscount ? monthly_fee : baseFeeAmount;
              discountAmount = Math.round((targetAmount * discount_value) / 100);
            } else if (normalDiscountType === 'fixed') {
              if (proratedInfo.isProrated && !useFullMonthForDiscount) {
                discountAmount = Math.round((discount_value / proratedInfo.daysInMonth) * proratedInfo.remainingDays);
              } else {
                discountAmount = discount_value;
              }
            }
          }
        }

        const finalAmount = Math.max(0, baseFeeAmount - discountAmount);
        const dueDate = next_fee_due_date || calculateDueDate(fee_start_date);
        // ✅ FIX: For half-yearly/yearly cycles, span the full cycle period
        let periodEnd;
        if (cycle === 'half_yearly') {
          const endMonth = (month + 6) % 12;
          const endYear = year + Math.floor((month + 6) / 12);
          periodEnd = `${endYear}-${String(endMonth + 1).padStart(2, '0')}-${getMonthEnd(endYear, endMonth)}`;
        } else if (cycle === 'yearly') {
          const endYear = year + 1;
          periodEnd = `${endYear}-${String(month + 1).padStart(2, '0')}-${getMonthEnd(endYear, month)}`;
        } else {
          periodEnd = `${year}-${String(month + 1).padStart(2, '0')}-${getMonthEnd(year, month)}`;
        }

        const result = db.db.prepare(`
          INSERT INTO student_fees (
            student_id, fee_type, fee_month, fee_amount, discount_amount, 
            final_amount, paid_amount, fee_status, fee_date, due_date,
            fee_period_start, fee_period_end, previous_dues, penalty_amount,
            fine_amount, property_damage_amount, money_given_amount
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          student_id, getRentFeeType(fee_type_cycle), monthStr, baseFeeAmount, discountAmount,
          finalAmount, 0, 'DUE', fee_start_date, dueDate, fee_start_date, periodEnd,
          0, 0, 0, 0, 0
        );
        mainFeeId = result.lastInsertRowid;
      }
    }

    return { success: true, main_fee_id: mainFeeId, security_fee_id: securityFeeId };
  };

  if (isInsideTransaction) {
    return createFees();
  } else {
    const tx = db.db.transaction(createFees);
    return tx();
  }
};

// ============================================
// CREATE MONTHLY FEE FOR STUDENT
// ============================================
exports.createMonthlyFee = (studentId, feeMonth = null, options = {}) => {
  const force = !!options.force;

  const student = db.db.prepare(`
    SELECT * FROM students WHERE student_id = ? AND status = 'active'
  `).get(studentId);

  if (!student) throw new Error('Student not found or inactive');

  const cycle = (student.fee_type_cycle || 'monthly').toLowerCase();
  const baseFee = toNum(student.monthly_fee);
  if (baseFee <= 0) {
    return { success: false, message: 'No monthly fee set for student', fee_id: null };
  }

  // ✅ PRORATING LOGIC: If this is the student's JOIN month or START month, check for mid-month join
  let { year, month } = feeMonth ? parseDateParts(feeMonth) : { year: new Date().getFullYear(), month: new Date().getMonth() };

  // ✅ FIX: Respect fee_type_cycle (monthly / half_yearly / yearly)
  if (cycle === 'yearly' || cycle === 'half_yearly') {
    const intervalMonths = cycle === 'yearly' ? 12 : 6;
    const lastFee = db.db.prepare(`
      SELECT fee_month FROM student_fees
      WHERE student_id = ? AND fee_type IN ('Monthly Rent', 'Half-Yearly Rent', 'Yearly Rent')
      ORDER BY fee_month DESC LIMIT 1
    `).get(studentId);

    if (lastFee) {
      // A previous fee exists — check if enough months have passed
      const lastParts = parseDateParts(lastFee.fee_month);
      const monthsSinceLast = (year - lastParts.year) * 12 + (month - lastParts.month);
      if (monthsSinceLast < intervalMonths) {
        return { success: false, message: `${cycle} cycle - next fee not due yet (${monthsSinceLast}/${intervalMonths} months)`, fee_id: null };
      }
    } else {
      // No fee exists yet — only allow generation for the student's start month
      // (initial fee is created during admission; if it's missing, only allow the start month)
      const startDateToCheck = student.fee_start_month || student.date_of_joining;
      if (startDateToCheck) {
        const startParts = parseDateParts(startDateToCheck);
        const monthsFromStart = (year - startParts.year) * 12 + (month - startParts.month);
        // For half-yearly/yearly, only generate if we are exactly at a valid interval from start
        if (monthsFromStart > 0 && monthsFromStart % intervalMonths !== 0) {
          return { success: false, message: `${cycle} cycle - no prior fee and current month is not a valid cycle month (${monthsFromStart} months from start)`, fee_id: null };
        }
      }
    }
  }


  if (feeMonth) {
    const parts = parseDateParts(feeMonth);
    year = parts.year;
    month = parts.month;
  } else {
    const today = new Date();
    year = today.getFullYear();
    month = today.getMonth();
  }

  const monthStr = `${year}-${String(month + 1).padStart(2, '0')}-01`;
  const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;

  const startDateToUse = student.fee_start_month || student.date_of_joining;
  if (!force && startDateToUse) {
    const startParts = parseDateParts(startDateToUse);
    if (startParts.year === year && startParts.month === month) {
      return { success: false, message: 'Initial fee already created during admission', fee_id: null };
    }
    if (year < startParts.year || (year === startParts.year && month < startParts.month)) {
      return { success: false, message: 'Target month is before student start month', fee_id: null };
    }
  }


  const existing = db.db.prepare(`
    SELECT fee_id FROM student_fees 
    WHERE student_id = ? 
    AND strftime('%Y-%m', fee_month) = ?
    AND fee_type IN ('Monthly Rent', 'Half-Yearly Rent', 'Yearly Rent')
  `).get(studentId, monthKey);

  if (existing) return { success: false, message: 'Fee already exists for this month', fee_id: existing.fee_id };

  const createTx = db.db.transaction(() => {
    let currentBaseFee = baseFee;
    let prorated = { isProrated: false };

    // ✅ PRORATING LOGIC: If this is the student's JOIN month or START month, check for mid-month join
    const startDateToUse = student.fee_start_month || student.date_of_joining;
    if (startDateToUse && cycle === 'monthly') {
      const startParts = parseDateParts(startDateToUse);
      if (startParts.year === year && startParts.month === month && startParts.day > 1) {
        prorated = calculateProratedFee(baseFee, startDateToUse);
        currentBaseFee = prorated.amount;
      }
    }

    let discount = 0;
    if (student.has_discount && student.discount_value > 0) {
      // Normalize values for backward compatibility
      const normalDiscountApplicable = student.discount_applicable === 'complete' ? 'all_months' : student.discount_applicable;
      const normalDiscountType = student.discount_type === 'percent' ? 'percentage' : (student.discount_type === 'amount' ? 'fixed' : student.discount_type);

      let shouldApplyDiscount = false;
      if (normalDiscountApplicable === 'all_months') {
        shouldApplyDiscount = true;
      } else if (normalDiscountApplicable === 'specific_months' && student.discount_months) {
        const allowedMonths = student.discount_months.split(',').map(m => m.trim());
        shouldApplyDiscount = allowedMonths.includes(monthKey);
      }
      if (shouldApplyDiscount) {
        const useFullMonthForDiscount = (student.discount_on_full_month === 1 || student.discount_on_full_month === true);

        if (normalDiscountType === 'percentage') {
          const targetAmount = useFullMonthForDiscount ? baseFee : currentBaseFee;
          discount = Math.round((targetAmount * student.discount_value) / 100);
        } else if (normalDiscountType === 'fixed') {
          if (prorated.isProrated && !useFullMonthForDiscount) {
            // Prorate the fixed discount too
            discount = Math.round((toNum(student.discount_value) / prorated.daysInMonth) * prorated.remainingDays);
          } else {
            discount = toNum(student.discount_value);
          }
        }
      }
    }

    const finalAmount = Math.max(0, currentBaseFee - discount);
    if (finalAmount <= 0 && !force) {
      return { success: false, message: 'Fee amount is zero after discount', fee_id: null };
    }

    // ✅ Start and End dates for the period
    let feeDate = monthStr;

    // ✅ FIX: For half-yearly / yearly cycles, fee_period_end spans the FULL cycle
    let feePeriodEnd;
    if (cycle === 'half_yearly') {
      // Period ends 6 months from start (last day of the 6th month)
      const endMonth = (month + 6) % 12;
      const endYear = year + Math.floor((month + 6) / 12);
      feePeriodEnd = `${endYear}-${String(endMonth + 1).padStart(2, '0')}-${getMonthEnd(endYear, endMonth)}`;
    } else if (cycle === 'yearly') {
      // Period ends 12 months from start (last day of the 12th month)
      const endMonth = month;
      const endYear = year + 1;
      feePeriodEnd = `${endYear}-${String(endMonth + 1).padStart(2, '0')}-${getMonthEnd(endYear, endMonth)}`;
    } else {
      feePeriodEnd = `${year}-${String(month + 1).padStart(2, '0')}-${getMonthEnd(year, month)}`;
    }

    // If prorated (monthly only), use the actual join date as period start
    if (prorated.isProrated) {
      const startParts = parseDateParts(startDateToUse);
      feeDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(startParts.day).padStart(2, '0')}`;
    }

    const dueDate = `${year}-${String(month + 1).padStart(2, '0')}-05`;

    const tempFee = { fee_type: getRentFeeType(cycle), final_amount: finalAmount };
    const gstAmount = getFeeGst(tempFee, student);

    const advance = getStudentAdvance(studentId);
    const totalDue = finalAmount + gstAmount;
    const advanceUsed = Math.min(advance, totalDue);
    const paidAmount = advanceUsed;

    const result = db.db.prepare(`
      INSERT INTO student_fees (
        student_id, fee_type, fee_month, fee_amount, discount_amount, final_amount,
        previous_dues, penalty_amount, fine_amount, property_damage_amount, money_given_amount,
        advance_used, paid_amount, fee_status, fee_date, due_date, fee_period_start, fee_period_end
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      studentId, getRentFeeType(cycle), monthStr, baseFee, discount,
      finalAmount, 0, 0, 0, 0, 0,
      advanceUsed, paidAmount, 'DUE', feeDate, dueDate, feeDate, feePeriodEnd
    );

    const feeId = result.lastInsertRowid;

    if (advanceUsed > 0) {
      let remaining = advanceUsed;
      const advances = db.db.prepare(`
        SELECT * FROM student_advances 
        WHERE student_id = ? AND status = 'PENDING' AND (amount - used_amount) > 0
        ORDER BY created_at ASC
      `).all(studentId);

      for (const adv of advances) {
        if (remaining <= 0) break;
        const available = toNum(adv.amount) - toNum(adv.used_amount);
        const use = Math.min(available, remaining);
        db.db.prepare(`
          UPDATE student_advances 
          SET used_amount = used_amount + ?, 
              status = CASE WHEN used_amount + ? >= amount THEN 'USED' ELSE 'PENDING' END
          WHERE advance_id = ?
        `).run(use, use, adv.advance_id);
        remaining -= use;
      }
    }

    const fee = db.db.prepare('SELECT * FROM student_fees WHERE fee_id = ?').get(feeId);
    const status = calculateStatus(fee, student);
    db.db.prepare('UPDATE student_fees SET fee_status = ? WHERE fee_id = ?').run(status, feeId);

    return { success: true, fee_id: feeId, status, total_due: totalDue, advance_used: advanceUsed };
  });

  return createTx();
};

// ============================================
// GENERATE MONTHLY FEES FOR ALL STUDENTS
// ============================================
exports.generateAllMonthlyFees = (targetMonth = null, options = {}) => {
  const force = !!options.force;

  let year, month;
  if (targetMonth) {
    const parts = parseDateParts(targetMonth);
    year = parts.year;
    month = parts.month;
  } else {
    const today = new Date();
    year = today.getFullYear();
    month = today.getMonth();
  }
  const monthStr = `${year}-${String(month + 1).padStart(2, '0')}`;

  // ✅ FIX Bug 2: Include fee_type_cycle so createMonthlyFee can check it
  const students = db.db.prepare(`
    SELECT student_id, date_of_joining, fee_start_month, fee_type_cycle FROM students 
    WHERE status = 'active' AND date_of_leaving IS NULL
  `).all();

  let created = 0, skipped = 0, errors = 0;

  for (const s of students) {
    try {
      const startDateToUse = s.fee_start_month || s.date_of_joining;
      if (!force && startDateToUse) {
        const startParts = parseDateParts(startDateToUse);
        if (startParts.year === year && startParts.month === month) {
          skipped++;
          continue;
        }
        if (year < startParts.year || (year === startParts.year && month < startParts.month)) {
          skipped++;
          continue;
        }
      }

      const result = exports.createMonthlyFee(s.student_id, `${monthStr}-01`, { force });

      if (result.success) created++;
      else skipped++;
    } catch (e) {
      errors++;
    }
  }

  return { month: monthStr, created, skipped, errors, total: students.length };
};

// ============================================
// CLEANUP INVALID FEES (FOR OLDER CLIENT DATA)
// ============================================
exports.cleanupInvalidPastFees = () => {
  try {
    const fees = db.db.prepare(`
      SELECT sf.fee_id, sf.fee_month, s.fee_start_month, s.date_of_joining, s.student_name
      FROM student_fees sf
      JOIN students s ON sf.student_id = s.student_id
      WHERE sf.fee_type IN ('Monthly Rent', 'Half-Yearly Rent', 'Yearly Rent')
      AND (sf.paid_amount IS NULL OR sf.paid_amount = 0)
    `).all();

    let deleted = 0;
    for (const f of fees) {
      const startDateToUse = f.fee_start_month || f.date_of_joining;
      if (!startDateToUse) continue;

      const startParts = exports.parseDateParts(startDateToUse);
      const feeParts = exports.parseDateParts(f.fee_month);

      if (feeParts.year < startParts.year || (feeParts.year === startParts.year && feeParts.month < startParts.month)) {
        console.log(`🧹 Cleaning up invalid ${f.fee_month} fee for ${f.student_name} (starts on ${startDateToUse})`);
        db.db.prepare(`DELETE FROM student_fees WHERE fee_id = ?`).run(f.fee_id);
        deleted++;
      }
    }
    return { success: true, deleted };
  } catch (err) {
    console.error("❌ Cleanup failed:", err.message);
    return { success: false, deleted: 0, error: err.message };
  }
};

// ============================================
// PAY FEE - FIXED VERSION
// ============================================
exports.payFee = (data) => {
  const {
    fee_id,
    student_id,
    payment_amount,
    payment_date,
    payment_mode,
    reference_no,
    received_by,
    received_member_id,
    notes
  } = data;

  const normalizedMode = normalizePaymentMode(payment_mode);
  const paymentDateNormalized = payment_date || new Date().toISOString().split("T")[0];

  if (!payment_amount || payment_amount <= 0) {
    throw new Error("Invalid payment amount");
  }

  const paymentTransaction = db.db.transaction(() => {
    const fee = db.db.prepare("SELECT * FROM student_fees WHERE fee_id = ?").get(fee_id);
    if (!fee) throw new Error("Fee not found");

    // ✅ FIX #1: Don't allow payments on already PAID fees
    if (fee.fee_status === 'PAID') {
      throw new Error("This fee is already paid. Cannot accept additional payments on it.");
    }

    const effectiveStudentId = student_id || fee.student_id;
    if (!effectiveStudentId) throw new Error("student_id is required");

    const student = db.db.prepare("SELECT * FROM students WHERE student_id = ?").get(effectiveStudentId);
    if (!student) throw new Error("Student not found");

    const totalDue = getTotalDue(fee, student);
    const currentPaid = toNum(fee.paid_amount);

    let newPaidAmount = currentPaid + payment_amount;
    let excessAmount = Math.max(0, newPaidAmount - totalDue);

    if (newPaidAmount > totalDue) {
      newPaidAmount = totalDue;
    }

    let newStatus;
    if (newPaidAmount >= totalDue) {
      newStatus = "PAID";
    } else if (newPaidAmount > 0) {
      newStatus = "PARTIAL";
    } else {
      newStatus = calculateStatus({ ...fee, paid_amount: newPaidAmount }, student);
    }

    let invoiceNumber = fee.invoice_number;
    let invoiceGeneratedAt = fee.invoice_generated_at;
    if (newStatus === "PAID" && !invoiceNumber) {
      invoiceNumber = generateInvoiceNumber();
      invoiceGeneratedAt = new Date().toISOString();

      // ✅ FIX #3: Now apply pending items only when fee is PAID
      applyPendingItems(effectiveStudentId, fee_id);
    }

    db.db.prepare(`
      UPDATE student_fees
      SET paid_amount = ?, 
          fee_status = ?, invoice_number = ?, invoice_generated_at = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE fee_id = ?
    `).run(newPaidAmount, newStatus, invoiceNumber, invoiceGeneratedAt, fee_id);

    // Create breakdown
    let appliedAmount = payment_amount;
    if (excessAmount > 0) {
      appliedAmount = totalDue;
    }
    const breakdown = [];
    if (appliedAmount > 0) {
      breakdown.push({
        type: fee.fee_type || 'Monthly Rent',
        amount: appliedAmount,
        month: fee.fee_month ? new Date(fee.fee_month).toLocaleString('en-IN', { month: 'short', year: 'numeric' }) : ''
      });
    }
    if (excessAmount > 0) {
      breakdown.push({
        type: 'Advance Created',
        amount: excessAmount
      });
    }

    db.db.prepare(`
      INSERT INTO fee_payments (
        fee_id, student_id, payment_amount, payment_date,
        payment_mode, reference_no, received_by, received_member_id, notes, is_advance_payment,
        invoice_number, breakdown
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      fee_id, effectiveStudentId, payment_amount,
      paymentDateNormalized, normalizedMode, reference_no || null,
      received_by || 'ADMIN', received_member_id || null, notes || null, 0,
      invoiceNumber || null, JSON.stringify(breakdown)
    );

    // Ledger entry
    const currentBalance = db.db.prepare(`
      SELECT COALESCE(SUM(debit), 0) - COALESCE(SUM(credit), 0) as balance FROM ledger_entries
    `).get();
    let ledgerBalance = toNum(currentBalance?.balance);

    const feeDescription = `${student.student_name} S/O ${student.father_name || 'N/A'} - ${fee.fee_type || 'Fee'}: ₹${payment_amount}`;
    ledgerBalance += payment_amount;

    db.db.prepare(`
      INSERT INTO ledger_entries (
        entry_date, entry_type, category, amount, debit, credit, balance,
        payment_mode, reference_no, description, student_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      paymentDateNormalized, 'income', 'Fee Received', payment_amount,
      payment_amount, 0, ledgerBalance, normalizedMode,
      reference_no || invoiceNumber || null, feeDescription, effectiveStudentId
    );

    // Member salary tracking - IMPROVED
    if (received_member_id && String(received_member_id) !== 'ADMIN' && String(received_member_id) !== '0' && String(received_member_id) !== '') {
      const memberId = Number(received_member_id);

      if (memberId > 0) {
        const member = db.db.prepare('SELECT member_id, name, salary FROM members WHERE member_id = ?').get(memberId);

        if (member) {
          const actualCollected = payment_amount;
          const { year: pYear, month: pMonth } = parseDateParts(paymentDateNormalized);
          const salaryMonth = `${pYear}-${String(pMonth + 1).padStart(2, '0')}`;
          const paymentMonthName = MONTHS[pMonth];
          const paymentYear = pYear;

          // 1. Record the transaction as a Salary Payment from Fee
          const receiptNumber = `SAL-FEE-${memberId}-${Date.now()}`;

          db.db.prepare(`
            INSERT INTO member_transactions (
              member_id, amount, transaction_type, description, reference_no, student_id, salary_month
            ) VALUES (?, ?, 'salary_payment_from_fee', ?, ?, ?, ?)
          `).run(
            memberId, actualCollected,
            `Salary Paid (Direct from ${student.student_name} fee collection)`,
            reference_no || invoiceNumber || receiptNumber, effectiveStudentId, salaryMonth
          );

          // 2. Also record in member_salary_payments to avoid "Twice Entry" headache and show in history
          db.db.prepare(`
            INSERT INTO member_salary_payments (
              member_id, amount, payment_date, payment_month, payment_year, 
              payment_type, payment_mode, reference_no, notes, receipt_number
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            memberId, actualCollected, paymentDateNormalized, paymentMonthName, paymentYear,
            'fee_collection', 'Internal (Fee Transfer)',
            reference_no || invoiceNumber || null,
            `Direct salary payment from fee collected from student ${student.student_name}`,
            receiptNumber
          );

          const salaryDescription = `Salary: ${member.name} - Paid via Fee Collection (${student.student_name})`;
          ledgerBalance -= actualCollected;

          db.db.prepare(`
            INSERT INTO ledger_entries (
              entry_date, entry_type, category, amount, debit, credit, balance,
              payment_mode, reference_no, description, student_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            paymentDateNormalized, 'expense', 'Salary Payment', actualCollected,
            0, actualCollected, ledgerBalance, 'Internal',
            receiptNumber, salaryDescription, null
          );

          // 3. Advance logic (keep as is for overflow tracking)
          const baseSalary = toNum(member.salary);
          if (baseSalary > 0) {
            const totalCollectedThisMonth = toNum(db.db.prepare(`
              SELECT COALESCE(SUM(amount), 0) as total
              FROM member_transactions WHERE member_id = ? AND salary_month = ?
              AND transaction_type = 'salary_payment_from_fee'
            `).get(memberId, salaryMonth)?.total);

            const manualPaidThisMonth = toNum(db.db.prepare(`
              SELECT COALESCE(SUM(amount), 0) as total
              FROM member_salary_payments WHERE member_id = ? AND payment_month = ? AND payment_year = ?
              AND payment_type != 'fee_collection'
            `).get(memberId, paymentMonthName, paymentYear)?.total);

            const advancesApplied = toNum(db.db.prepare(`
              SELECT COALESCE(SUM(amount - used_amount), 0) as total
              FROM member_salary_advances
              WHERE member_id = ? AND target_month = ? AND target_year = ? AND status = 'PENDING'
            `).get(memberId, paymentMonthName, paymentYear)?.total);

            const effectiveSalaryNeeded = Math.max(0, baseSalary - advancesApplied);
            const totalEarned = totalCollectedThisMonth + manualPaidThisMonth;
            const excess = totalEarned - effectiveSalaryNeeded;

            if (excess > 0) {
              let nextMonthIndex = pMonth + 1;
              let nextYear = paymentYear;
              if (nextMonthIndex > 11) { nextMonthIndex = 0; nextYear++; }
              const nextMonth = MONTHS[nextMonthIndex];

              const existingAdvance = db.db.prepare(`
                SELECT id, amount FROM member_salary_advances
                WHERE member_id = ? AND source_month = ? AND source_year = ? AND status = 'PENDING'
              `).get(memberId, paymentMonthName, paymentYear);

              if (existingAdvance) {
                db.db.prepare(`UPDATE member_salary_advances SET amount = ? WHERE id = ?`).run(excess, existingAdvance.id);
              } else {
                db.db.prepare(`
                  INSERT INTO member_salary_advances
                  (member_id, amount, source_month, source_year, target_month, target_year, description)
                  VALUES (?, ?, ?, ?, ?, ?, ?)
                `).run(memberId, excess, paymentMonthName, paymentYear, nextMonth, nextYear,
                  `Excess salary from ${paymentMonthName} ${paymentYear} (Fee Collection)`);
              }
            }
          }
        }
      }
    }

    // Handle excess as student advance
    if (excessAmount > 0) {
      db.db.prepare(`
        INSERT INTO student_advances (student_id, amount, original_amount, used_amount, status, notes, created_at)
        VALUES (?, ?, ?, 0, 'PENDING', 'Overpayment', CURRENT_TIMESTAMP)
      `).run(effectiveStudentId, excessAmount, excessAmount);
    }

    return {
      success: true,
      payment_id: fee_id,
      total_received: payment_amount,
      total_paid: newPaidAmount,
      new_status: newStatus,
      invoice_number: invoiceNumber,
      remaining_balance: Math.max(0, totalDue - newPaidAmount),
      advance_received: excessAmount
    };
  });

  return paymentTransaction();
};

// ============================================
// GET FEE BY ID
// ============================================
exports.getFeeById = (feeId) => {
  const fee = db.db.prepare(`
    SELECT sf.*, s.student_name, s.father_name, s.student_mobile, r.room_no, b.bed_no
    FROM student_fees sf
    JOIN students s ON s.student_id = sf.student_id
    LEFT JOIN room_allocation a ON a.student_id = s.student_id AND a.allocation_status = 'active'
    LEFT JOIN rooms r ON a.room_id = r.room_id
    LEFT JOIN beds b ON a.bed_id = b.bed_id
    WHERE sf.fee_id = ?
  `).get(feeId);

  if (!fee) return null;
  fee.total_due = getTotalDue(fee);
  fee.remaining = getRemaining(fee);
  return fee;
};

// ============================================
// GET ALL FEES
// ============================================
exports.getAllFees = (filters = {}) => {
  let sql = `
    SELECT sf.*, s.student_name, s.father_name, s.student_mobile, r.room_no, b.bed_no
    FROM student_fees sf
    JOIN students s ON s.student_id = sf.student_id
    LEFT JOIN room_allocation a ON a.student_id = s.student_id AND a.allocation_status = 'active'
    LEFT JOIN rooms r ON a.room_id = r.room_id
    LEFT JOIN beds b ON a.bed_id = b.bed_id
    WHERE 1=1
  `;
  const params = [];

  if (filters.student_id) { sql += ' AND sf.student_id = ?'; params.push(filters.student_id); }
  if (filters.month) { sql += " AND strftime('%Y-%m', sf.fee_month) = ?"; params.push(filters.month); }
  if (filters.status) { sql += ' AND sf.fee_status = ?'; params.push(filters.status); }

  sql += ' ORDER BY sf.fee_month DESC, sf.fee_id DESC';

  return db.db.prepare(sql).all(...params).map(f => ({
    ...f, total_due: getTotalDue(f), remaining: getRemaining(f)
  }));
};

// ============================================
// GET STUDENT FEE SUMMARY
// ============================================
exports.getStudentFeeSummary = (studentId) => {
  const fees = db.db.prepare(`SELECT * FROM student_fees WHERE student_id = ? ORDER BY fee_month ASC`).all(studentId);
  const student = db.db.prepare(`
    SELECT s.*, r.room_no, b.bed_no FROM students s
    LEFT JOIN room_allocation a ON a.student_id = s.student_id AND a.allocation_status = 'active'
    LEFT JOIN rooms r ON a.room_id = r.room_id
    LEFT JOIN beds b ON a.bed_id = b.bed_id
    WHERE s.student_id = ?
  `).get(studentId);

  if (!student) return null;

  const advance = getStudentAdvance(studentId);
  const pending = getPendingItems(studentId);

  let totalDue = 0, totalPaid = 0;
  const feeList = fees.map(f => {
    const due = getTotalDue(f);
    totalDue += due;
    totalPaid += toNum(f.paid_amount);
    return { ...f, total_due: due, remaining: getRemaining(f) };
  });

  return {
    student,
    fees: feeList,
    summary: {
      total_due: totalDue,
      total_paid: totalPaid,
      total_remaining: totalDue - totalPaid,
      advance_balance: advance,
      pending_fines: pending.fines,
      pending_damages: pending.damages,
      pending_money_given: pending.moneyGiven
    }
  };
};

// ============================================
// UPDATE FEE STATUSES
// ============================================
exports.updateAllFeeStatuses = () => {
  const fees = db.db.prepare(`SELECT * FROM student_fees WHERE fee_status != 'PAID'`).all();
  let updated = 0;
  for (const fee of fees) {
    const newStatus = calculateStatus(fee);
    if (newStatus !== fee.fee_status) {
      db.db.prepare(`UPDATE student_fees SET fee_status = ? WHERE fee_id = ?`).run(newStatus, fee.fee_id);
      updated++;
    }
  }
  return { updated, checked: fees.length };
};

// ============================================
// GET PAYMENT BY INVOICE
// ============================================
exports.getPaymentByInvoice = (invoiceNumber) => {
  // First try fee_payments.invoice_number (new payments store it here)
  let payment = db.db.prepare(`
    SELECT fp.*, s.student_name, s.father_name FROM fee_payments fp
    JOIN students s ON s.student_id = fp.student_id
    WHERE fp.invoice_number = ?
  `).get(invoiceNumber);

  // Fallback: check student_fees.invoice_number and return the latest payment for that fee
  if (!payment) {
    payment = db.db.prepare(`
      SELECT fp.*, s.student_name, s.father_name, sf.invoice_number
      FROM student_fees sf
      JOIN fee_payments fp ON fp.fee_id = sf.fee_id
      JOIN students s ON s.student_id = fp.student_id
      WHERE sf.invoice_number = ?
      ORDER BY fp.payment_id DESC
      LIMIT 1
    `).get(invoiceNumber);
  }

  return payment;
};

// ============================================
// GET ALL PAYMENTS
// ============================================
exports.getAllPayments = (studentId = null) => {
  let sql = `SELECT fp.*, s.student_name, s.father_name FROM fee_payments fp JOIN students s ON s.student_id = fp.student_id`;
  if (studentId) sql += ` WHERE fp.student_id = ?`;
  sql += ' ORDER BY fp.payment_date DESC';
  return studentId ? db.db.prepare(sql).all(studentId) : db.db.prepare(sql).all();
};

// ============================================
// APPLY PENALTIES
// ============================================
exports.applyPenalties = () => {
  const settings = db.db.prepare('SELECT * FROM penalty_settings WHERE id = 1').get();
  if (!settings?.enabled) return { applied: 0, message: 'Penalty disabled' };

  const overdueFees = db.db.prepare(`
    SELECT sf.* FROM student_fees sf
    JOIN students s ON s.student_id = sf.student_id
    WHERE sf.fee_status IN ('OVERDUE', 'DUE', 'PARTIAL')
    AND s.status = 'active' AND s.date_of_leaving IS NULL
    AND sf.fee_type = 'Monthly Rent'
  `).all();

  let applied = 0;
  for (const fee of overdueFees) {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const dueDate = new Date(fee.due_date); dueDate.setHours(0, 0, 0, 0);
    if (today <= dueDate) continue;

    const daysOverdue = Math.floor((today - dueDate) / (1000 * 60 * 60 * 24));
    const daysAfterGrace = Math.max(0, daysOverdue - (settings.grace_days || 0));
    if (daysAfterGrace <= 0) continue;

    let penalty = settings.penalty_type === 'percentage'
      ? daysAfterGrace * ((toNum(fee.final_amount) * toNum(settings.percentage)) / 100)
      : daysAfterGrace * toNum(settings.fixed_amount);

    if (settings.max_penalty > 0) penalty = Math.min(penalty, toNum(settings.max_penalty));
    penalty = Math.round(penalty);

    if (penalty > toNum(fee.penalty_amount)) {
      db.db.prepare(`UPDATE student_fees SET penalty_amount = ?, fee_status = 'OVERDUE' WHERE fee_id = ?`)
        .run(penalty, fee.fee_id);
      applied++;
    }
  }
  return { applied, checked: overdueFees.length };
};

exports.applyPenaltiesToOverdueFees = exports.applyPenalties;

// ============================================
// GET ALL FEES COMPREHENSIVE - FIXED VERSION
// Active students AND checked-out students that still have unpaid fees.
// (Once every fee of a checked-out student is fully paid, they drop off the list.)
// ============================================
exports.getAllFeesComprehensive = () => {
  const students = db.db.prepare(`
    SELECT DISTINCT s.student_id, s.student_name, s.father_name, s.student_mobile, s.photo_url,
                    s.status, s.date_of_leaving,
                    r.room_no, b.bed_no
    FROM students s
    LEFT JOIN room_allocation a ON a.student_id = s.student_id AND a.allocation_status = 'active'
    LEFT JOIN rooms r ON a.room_id = r.room_id
    LEFT JOIN beds b ON a.bed_id = b.bed_id
    WHERE (
      (s.status = 'active' AND s.date_of_leaving IS NULL)
      OR EXISTS (
        SELECT 1 FROM student_fees sf
        WHERE sf.student_id = s.student_id
          AND sf.fee_status != 'PAID'
          AND COALESCE(sf.final_amount, 0) > COALESCE(sf.paid_amount, 0)
      )
    )
  `).all();

  return students.map(student => {
    const fees = db.db.prepare(`SELECT * FROM student_fees WHERE student_id = ? ORDER BY fee_month DESC`).all(student.student_id);

    let totalDueAmounts = 0, totalPaidAmounts = 0;
    const feeList = fees.map(f => {
      const due = getTotalDue(f);
      const remaining = getRemaining(f);
      totalDueAmounts += due;
      totalPaidAmounts += toNum(f.paid_amount);
      return { ...f, total_due: due, remaining: remaining };
    });

    const totalRemaining = Math.max(0, totalDueAmounts - totalPaidAmounts);

    // ✅ FIX: Include pending fines, damages, and money given
    const pendingFines = toNum(db.db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total FROM pending_fines 
      WHERE student_id = ? AND status = 'PENDING'
    `).get(student.student_id)?.total);

    const pendingDamages = toNum(db.db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total FROM property_damage_records 
      WHERE student_id = ? AND status = 'PENDING'
    `).get(student.student_id)?.total);

    const pendingMoneyGiven = toNum(db.db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total FROM money_given_records 
      WHERE student_id = ? AND status = 'PENDING'
    `).get(student.student_id)?.total);

    // Add pending fees to the total student balances
    const finalTotalAmount = totalDueAmounts + pendingFines + pendingDamages + pendingMoneyGiven;
    const finalTotalRemaining = totalRemaining + pendingFines + pendingDamages + pendingMoneyGiven;

    return {
      ...student,
      total_amount: finalTotalAmount,
      total_paid: totalPaidAmounts,
      total_remaining: finalTotalRemaining,
      total_advance: getStudentAdvance(student.student_id),
      pending_fines: pendingFines,
      pending_damages: pendingDamages,
      pending_money_given: pendingMoneyGiven,
      fees: feeList
    };
  });
};

// ============================================
// APPLY WAIVER / CONCESSION on a specific fee
// Only allowed on accommodation-type fees (Monthly / Half-Yearly / Yearly Rent).
// Cannot waive Mess, Security Deposit, Fine, Property Damage, or Money Given.
// ============================================
exports.applyWaiver = ({ fee_id, amount, reason }) => {
  const wAmount = Number(amount) || 0;
  if (!fee_id || wAmount <= 0) {
    throw new Error("fee_id and positive amount are required");
  }

  const fee = db.db.prepare("SELECT * FROM student_fees WHERE fee_id = ?").get(fee_id);
  if (!fee) throw new Error(`Fee #${fee_id} not found`);
  if (fee.fee_status === 'PAID') throw new Error("This fee is already fully paid");

  // Allow write-off/discount on any fee type — admin decision

  const totalDue = Number(fee.final_amount || 0)
    + Number(fee.previous_dues || 0)
    + Number(fee.penalty_amount || 0)
    + Number(fee.fine_amount || 0)
    + Number(fee.property_damage_amount || 0)
    + Number(fee.money_given_amount || 0)
    - Number(fee.advance_used || 0);
  const alreadyPaid = Number(fee.paid_amount || 0);
  const remaining = Math.max(0, totalDue - alreadyPaid);
  if (wAmount > remaining) {
    throw new Error(`Waiver ₹${wAmount} exceeds the remaining balance ₹${remaining}`);
  }

  const currentFinal = Number(fee.final_amount || 0);
  const newDiscount = Number(fee.discount_amount || 0) + wAmount;
  const newFinal = Math.max(0, currentFinal - wAmount);
  const newStatus = (newFinal <= alreadyPaid) ? 'PAID' : fee.fee_status;

  db.db.prepare(`
    UPDATE student_fees
       SET discount_amount = ?,
           final_amount = ?,
           fee_status = ?,
           updated_at = CURRENT_TIMESTAMP
     WHERE fee_id = ?
  `).run(newDiscount, newFinal, newStatus, fee_id);

  // No outgoing ledger entry for waivers/discounts — they only reduce the
  // invoice amount, they don't represent money leaving the hostel.

  return { fee_id, waiver_amount: wAmount, new_final: newFinal, new_status: newStatus };
};

module.exports = exports;