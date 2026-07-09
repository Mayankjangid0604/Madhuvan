const { db } = require("../config/db.sqlite");
const memberService = require("../services/member.service");

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

// ============================================
// HELPERS
// ============================================
const toNum = (v) => Number(v) || 0;

function generateReceiptNumber() {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `SAL${year}${month}${random}`;
}

function getMonthIndex(monthName) {
  return MONTHS.indexOf(monthName);
}

function formatMonthYear(month, year) {
  return `${year}-${String(getMonthIndex(month) + 1).padStart(2, '0')}`;
}

/**
 * Calculate prorated salary for the joining month.
 * @param {number} baseSalary - Full monthly salary
 * @param {string} joiningDate - YYYY-MM-DD
 * @param {number} year - Year of the target month
 * @param {number} month - 0-indexed target month
 * @returns {{ amount: number, isProrated: boolean, daysWorked: number, daysInMonth: number, periodStart: string, periodEnd: string }}
 */
function calculateProratedSalary(baseSalary, joiningDate, year, month) {
  const dateStr = String(joiningDate).substring(0, 10);
  const parts = dateStr.split('-');
  const joinYear = parseInt(parts[0]);
  const joinMonth = parseInt(parts[1]) - 1; // 0-indexed
  const joinDay = parseInt(parts[2]);

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthStr = String(month + 1).padStart(2, '0');
  const periodEnd = `${year}-${monthStr}-${String(daysInMonth).padStart(2, '0')}`;

  // Only prorate if this is the joining month
  if (joinYear === year && joinMonth === month) {
    const periodStart = dateStr;
    if (joinDay === 1) {
      return { amount: baseSalary, isProrated: false, daysWorked: daysInMonth, daysInMonth, periodStart, periodEnd };
    }
    const daysWorked = daysInMonth - joinDay + 1;
    const proratedAmount = Math.round((baseSalary / daysInMonth) * daysWorked);
    return { amount: proratedAmount, isProrated: true, daysWorked, daysInMonth, periodStart, periodEnd };
  }

  // Not the joining month — full salary
  const periodStart = `${year}-${monthStr}-01`;
  return { amount: baseSalary, isProrated: false, daysWorked: daysInMonth, daysInMonth, periodStart, periodEnd };
}

// Get fee collections for a specific salary month
function getFeeCollectionsForMonth(memberId, salaryMonth) {
  const result = db.prepare(`
    SELECT COALESCE(SUM(amount), 0) as total, COUNT(*) as count
    FROM member_transactions
    WHERE member_id = ? AND salary_month = ?
  `).get(memberId, salaryMonth);
  return { total: toNum(result?.total), count: toNum(result?.count) };
}

// Get manual payments for a specific month
function getManualPaymentsForMonth(memberId, month, year) {
  const result = db.prepare(`
    SELECT COALESCE(SUM(amount), 0) as total, COUNT(*) as count
    FROM member_salary_payments
    WHERE member_id = ? AND payment_month = ? AND payment_year = ?
  `).get(memberId, month, year);
  return { total: toNum(result?.total), count: toNum(result?.count) };
}

// Get pending advances that apply to this month (from previous months)
function getPendingAdvancesForMonth(memberId, targetMonth, targetYear) {
  const result = db.prepare(`
    SELECT COALESCE(SUM(amount - used_amount), 0) as total
    FROM member_salary_advances
    WHERE member_id = ? AND target_month = ? AND target_year = ? AND status = 'PENDING'
  `).get(memberId, targetMonth, targetYear);
  return toNum(result?.total);
}

// Get all pending advances for a member
function getTotalPendingAdvances(memberId) {
  const result = db.prepare(`
    SELECT COALESCE(SUM(amount - used_amount), 0) as total
    FROM member_salary_advances
    WHERE member_id = ? AND status = 'PENDING'
  `).get(memberId);
  return toNum(result?.total);
}

// ============================================
// GET ALL MEMBERS
// ============================================
exports.getAllMembers = (req, res, next) => {
  try {
    const members = db.prepare(`
      SELECT m.*
      FROM members m
      WHERE m.is_active = 1
      ORDER BY m.name ASC
    `).all();

    // Add salary info for each member
    const result = members.map(m => {
      const totalCollected = toNum(db.prepare(`
        SELECT COALESCE(SUM(amount), 0) as total FROM member_transactions WHERE member_id = ?
      `).get(m.member_id)?.total);

      const totalManualPaid = toNum(db.prepare(`
        SELECT COALESCE(SUM(amount), 0) as total FROM member_salary_payments WHERE member_id = ?
      `).get(m.member_id)?.total);

      const totalAdvances = getTotalPendingAdvances(m.member_id);

      return {
        ...m,
        total_fee_collected: totalCollected,
        total_manual_paid: totalManualPaid,
        total_salary_earned: totalCollected + totalManualPaid,
        pending_advances: totalAdvances
      };
    });

    res.json({ success: true, data: result });
  } catch (err) {
    console.error("Get members error:", err);
    next(err);
  }
};

// ============================================
// GET ACTIVE MEMBERS (FOR DROPDOWN)
// ============================================
exports.getActiveMembers = (req, res, next) => {
  try {
    const rows = db.prepare(`
      SELECT member_id, name, mobile, salary
      FROM members
      WHERE is_active = 1
      ORDER BY name
    `).all();

    res.json({ success: true, data: rows });
  } catch (err) {
    console.error("Get active members error:", err);
    next(err);
  }
};

// ============================================
// GET ALL SALARY PAYMENTS
// ============================================
exports.getAllSalaryPayments = (req, res, next) => {
  try {
    const { month, year, member_id } = req.query;

    let sql = `
      SELECT sp.*, m.name as member_name, m.mobile as member_mobile
      FROM member_salary_payments sp
      JOIN members m ON m.member_id = sp.member_id
      WHERE 1=1
    `;
    const params = [];

    if (month) {
      sql += ` AND sp.payment_month = ?`;
      params.push(month);
    }
    if (year) {
      sql += ` AND sp.payment_year = ?`;
      params.push(parseInt(year));
    }
    if (member_id) {
      sql += ` AND sp.member_id = ?`;
      params.push(member_id);
    }

    sql += ` ORDER BY sp.payment_year DESC, sp.payment_date DESC`;

    const rows = db.prepare(sql).all(...params);
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error("Get all salary payments error:", err);
    next(err);
  }
};

// ============================================
// CREATE MEMBER
// ============================================
exports.createMember = (req, res, next) => {
  try {
    const { name, mobile, dob, date_of_joining, address, id_type, id_number, salary, father_name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: "Member name is required" });
    }

    const result = db.prepare(`
      INSERT INTO members (name, mobile, dob, date_of_joining, address, id_type, id_number, salary, father_name)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      name.trim(),
      mobile || null,
      dob || null,
      date_of_joining || null,
      address || null,
      id_type || null,
      id_number || null,
      toNum(salary),
      father_name || null
    );

    res.status(201).json({
      success: true,
      message: "Member created successfully",
      data: { member_id: result.lastInsertRowid }
    });
  } catch (err) {
    console.error("Create member error:", err);
    next(err);
  }
};

// ============================================
// GET SINGLE MEMBER BY ID
// ============================================
exports.getMemberById = (req, res, next) => {
  try {
    const member = db.prepare(`
      SELECT * FROM members WHERE member_id = ? AND is_active = 1
    `).get(req.params.id);

    if (!member) {
      return res.status(404).json({ success: false, message: "Member not found" });
    }

    // Add salary info
    const totalCollected = toNum(db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total FROM member_transactions WHERE member_id = ?
    `).get(member.member_id)?.total);

    const totalManualPaid = toNum(db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total FROM member_salary_payments WHERE member_id = ?
    `).get(member.member_id)?.total);

    const totalAdvances = getTotalPendingAdvances(member.member_id);

    res.json({
      success: true,
      data: {
        ...member,
        total_fee_collected: totalCollected,
        total_manual_paid: totalManualPaid,
        total_salary_earned: totalCollected + totalManualPaid,
        pending_advances: totalAdvances
      }
    });
  } catch (err) {
    console.error("Get member error:", err);
    next(err);
  }
};

// ============================================
// UPDATE MEMBER
// ============================================
exports.updateMember = (req, res, next) => {
  try {
    const { name, mobile, dob, date_of_joining, address, id_type, id_number, salary, father_name, is_active } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: "Member name is required" });
    }

    db.prepare(`
      UPDATE members
      SET name = ?, mobile = ?, dob = ?, date_of_joining = ?, address = ?,
          id_type = ?, id_number = ?, salary = ?, father_name = ?,
          is_active = ?, updated_at = CURRENT_TIMESTAMP
      WHERE member_id = ?
    `).run(
      name.trim(),
      mobile || null,
      dob || null,
      date_of_joining || null,
      address || null,
      id_type || null,
      id_number || null,
      toNum(salary),
      father_name || null,
      is_active !== undefined ? is_active : 1,
      req.params.id
    );

    res.json({ success: true, message: "Member updated successfully" });
  } catch (err) {
    console.error("Update member error:", err);
    next(err);
  }
};

// ============================================
// UPLOAD MEMBER PHOTO
// ============================================
exports.uploadPhoto = (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No photo file provided" });
    }

    const photoUrl = `/uploads/members/${req.file.filename}`;

    db.prepare(`
      UPDATE members SET photo_url = ?, updated_at = CURRENT_TIMESTAMP WHERE member_id = ?
    `).run(photoUrl, req.params.id);

    res.json({ success: true, message: "Photo uploaded successfully", data: { photo_url: photoUrl } });
  } catch (err) {
    console.error("Upload photo error:", err);
    next(err);
  }
};

// ============================================
// DELETE (SOFT) MEMBER
// ============================================
exports.deleteMember = (req, res, next) => {
  try {
    db.prepare(`
      UPDATE members SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE member_id = ?
    `).run(req.params.id);

    res.json({ success: true, message: "Member deactivated successfully" });
  } catch (err) {
    console.error("Delete member error:", err);
    next(err);
  }
};

// ============================================
// GET MEMBER TRANSACTIONS (FEE COLLECTION HISTORY)
// ============================================
exports.getMemberTransactions = (req, res, next) => {
  try {
    const rows = db.prepare(`
      SELECT mt.*, s.student_name, s.father_name
      FROM member_transactions mt
      LEFT JOIN students s ON s.student_id = mt.student_id
      WHERE mt.member_id = ?
      ORDER BY mt.created_at DESC
      LIMIT 100
    `).all(req.params.id);

    res.json({ success: true, data: rows });
  } catch (err) {
    console.error("Get member transactions error:", err);
    next(err);
  }
};

// ============================================
// GET MEMBER SUMMARY
// ============================================
exports.getMemberSummary = (req, res, next) => {
  try {
    const memberId = req.params.id;
    const summary = memberService.getMemberSummary(memberId);

    res.json({
      success: true,
      data: summary
    });
  } catch (err) {
    console.error("Get member summary error:", err);
    next(err);
  }
};


// ============================================
// GET MEMBER SALARY STATUS FOR MONTH
// ============================================
exports.getMemberSalaryStatus = (req, res, next) => {
  try {
    const memberId = req.params.id;
    let { month, year } = req.query;

    // Default to PREVIOUS month (salary paid after month completes)
    if (!month || !year) {
      const now = new Date();
      let prevMonth = now.getMonth() - 1;
      let prevYear = now.getFullYear();
      if (prevMonth < 0) { prevMonth = 11; prevYear--; }
      month = MONTHS[prevMonth];
      year = prevYear;
    }

    const member = db.prepare(`
      SELECT member_id, name, salary, date_of_joining, created_at FROM members WHERE member_id = ? AND is_active = 1
    `).get(memberId);

    if (!member) {
      return res.status(404).json({ success: false, message: "Member not found" });
    }

    const baseSalary = toNum(member.salary);
    const monthIndex = getMonthIndex(month);
    const yearNum = parseInt(year);
    const salaryMonth = formatMonthYear(month, year);

    // Check if this is the current month (not yet completed)
    const now = new Date();
    const isCurrentMonth = (yearNum === now.getFullYear() && monthIndex === now.getMonth());
    const isFutureMonth = (yearNum > now.getFullYear()) || (yearNum === now.getFullYear() && monthIndex > now.getMonth());

    // Check if this month is before the joining month
    const joiningDate = member.date_of_joining || member.created_at;
    let isBeforeJoining = false;
    let prorationInfo = null;

    if (joiningDate) {
      const joinStr = String(joiningDate).substring(0, 10);
      const joinParts = joinStr.split('-');
      const joinYear = parseInt(joinParts[0]);
      const joinMonth = parseInt(joinParts[1]) - 1;

      if (yearNum < joinYear || (yearNum === joinYear && monthIndex < joinMonth)) {
        isBeforeJoining = true;
      }

      // Calculate prorated salary for this month
      prorationInfo = calculateProratedSalary(baseSalary, joinStr, yearNum, monthIndex);
    } else {
      const daysInMonth = new Date(yearNum, monthIndex + 1, 0).getDate();
      const monthStr = String(monthIndex + 1).padStart(2, '0');
      prorationInfo = {
        amount: baseSalary,
        isProrated: false,
        daysWorked: daysInMonth,
        daysInMonth,
        periodStart: `${yearNum}-${monthStr}-01`,
        periodEnd: `${yearNum}-${monthStr}-${String(daysInMonth).padStart(2, '0')}`
      };
    }

    // Use prorated amount as the effective base for this month
    const effectiveBaseSalary = prorationInfo.amount;

    // Fee collections this month (count as salary)
    const feeCollections = getFeeCollectionsForMonth(memberId, salaryMonth);

    // Manual payments this month
    const manualPayments = getManualPaymentsForMonth(memberId, month, year);

    // Advances from previous month that apply to this month
    const advanceFromPrevious = getPendingAdvancesForMonth(memberId, month, year);

    // Total earned this month
    const totalEarned = feeCollections.total + manualPayments.total;

    // Effective salary after applying advance from previous month
    const effectiveSalaryNeeded = Math.max(0, effectiveBaseSalary - advanceFromPrevious);

    // Remaining to pay
    const remaining = Math.max(0, effectiveSalaryNeeded - totalEarned);

    // Excess (will become advance for next month)
    const excess = totalEarned > effectiveSalaryNeeded ? totalEarned - effectiveSalaryNeeded : 0;

    // Check if fully paid
    const isFullyPaid = remaining === 0;

    res.json({
      success: true,
      data: {
        member_name: member.name,
        month,
        year: yearNum,
        base_salary: baseSalary,
        effective_base_salary: effectiveBaseSalary,
        is_prorated: prorationInfo.isProrated,
        days_worked: prorationInfo.daysWorked,
        days_in_month: prorationInfo.daysInMonth,
        salary_period_start: prorationInfo.periodStart,
        salary_period_end: prorationInfo.periodEnd,
        is_current_month: isCurrentMonth,
        is_future_month: isFutureMonth,
        is_before_joining: isBeforeJoining,
        advance_from_previous: advanceFromPrevious,
        effective_salary_needed: effectiveSalaryNeeded,
        fee_collected: feeCollections.total,
        fee_collections_count: feeCollections.count,
        manual_paid: manualPayments.total,
        manual_payments_count: manualPayments.count,
        total_earned: totalEarned,
        remaining,
        excess,
        is_fully_paid: isFullyPaid
      }
    });
  } catch (err) {
    console.error("Get member salary status error:", err);
    next(err);
  }
};

// ============================================
// PAY SALARY (MANUAL PAYMENT BY ADMIN)
// ============================================
exports.paySalary = (req, res, next) => {
  try {
    const memberId = req.params.id;
    const { amount, payment_date, payment_month, payment_year, payment_mode, reference_no, notes } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, message: "Valid amount is required" });
    }

    if (!payment_month || !payment_year) {
      return res.status(400).json({ success: false, message: "Payment month and year are required" });
    }

    const member = db.prepare(`
      SELECT member_id, name, salary, date_of_joining, created_at FROM members WHERE member_id = ? AND is_active = 1
    `).get(memberId);

    if (!member) {
      return res.status(404).json({ success: false, message: "Member not found or inactive" });
    }

    const payTx = db.transaction(() => {
      const baseSalary = toNum(member.salary);
      const salaryMonth = formatMonthYear(payment_month, payment_year);
      const paymentDateStr = payment_date || new Date().toISOString().split('T')[0];
      const receiptNumber = generateReceiptNumber();
      const monthIndex = getMonthIndex(payment_month);
      const yearNum = parseInt(payment_year);

      // Calculate prorated salary for joining month
      const joiningDate = member.date_of_joining || member.created_at;
      let effectiveBaseSalary = baseSalary;
      if (joiningDate) {
        const joinStr = String(joiningDate).substring(0, 10);
        const prorationInfo = calculateProratedSalary(baseSalary, joinStr, yearNum, monthIndex);
        effectiveBaseSalary = prorationInfo.amount;
      }

      // Get current status for this month
      const feeCollections = getFeeCollectionsForMonth(memberId, salaryMonth);
      const manualPayments = getManualPaymentsForMonth(memberId, payment_month, payment_year);
      const advanceFromPrevious = getPendingAdvancesForMonth(memberId, payment_month, payment_year);

      const effectiveSalaryNeeded = Math.max(0, effectiveBaseSalary - advanceFromPrevious);
      const alreadyEarned = feeCollections.total + manualPayments.total;
      const paymentAmount = toNum(amount);
      const totalAfterPayment = alreadyEarned + paymentAmount;

      // Record the payment
      const result = db.prepare(`
        INSERT INTO member_salary_payments
        (member_id, amount, payment_date, payment_month, payment_year, payment_type, payment_mode, reference_no, notes, receipt_number)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        memberId,
        paymentAmount,
        paymentDateStr,
        payment_month,
        yearNum,
        'manual',
        payment_mode || 'Cash',
        reference_no || null,
        notes || null,
        receiptNumber
      );

      // Apply advances from previous month if any
      if (advanceFromPrevious > 0) {
        const pendingAdvances = db.prepare(`
          SELECT * FROM member_salary_advances
          WHERE member_id = ? AND target_month = ? AND target_year = ? AND status = 'PENDING'
          ORDER BY created_at ASC
        `).all(memberId, payment_month, payment_year);

        let remainingToApply = Math.min(advanceFromPrevious, effectiveBaseSalary);
        for (const adv of pendingAdvances) {
          if (remainingToApply <= 0) break;
          const available = toNum(adv.amount) - toNum(adv.used_amount);
          const useAmount = Math.min(available, remainingToApply);

          db.prepare(`
            UPDATE member_salary_advances
            SET used_amount = used_amount + ?,
                status = CASE WHEN used_amount + ? >= amount THEN 'APPLIED' ELSE 'PENDING' END,
                applied_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `).run(useAmount, useAmount, adv.id);

          remainingToApply -= useAmount;
        }
      }

      // Check if there's excess → Create advance for next month
      const newExcess = totalAfterPayment - effectiveSalaryNeeded;
      if (newExcess > 0 && effectiveBaseSalary > 0) {
        // Calculate next month
        let nextMonthIndex = monthIndex + 1;
        let nextYear = yearNum;
        if (nextMonthIndex > 11) {
          nextMonthIndex = 0;
          nextYear++;
        }
        const nextMonth = MONTHS[nextMonthIndex];

        // Check if advance already exists for this source month
        const existingAdvance = db.prepare(`
          SELECT id, amount FROM member_salary_advances
          WHERE member_id = ? AND source_month = ? AND source_year = ? AND status = 'PENDING'
        `).get(memberId, payment_month, payment_year);

        if (existingAdvance) {
          // Update existing advance
          db.prepare(`
            UPDATE member_salary_advances SET amount = amount + ? WHERE id = ?
          `).run(newExcess, existingAdvance.id);
        } else {
          // Create new advance
          db.prepare(`
            INSERT INTO member_salary_advances
            (member_id, amount, source_month, source_year, target_month, target_year, description)
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `).run(
            memberId,
            newExcess,
            payment_month,
            yearNum,
            nextMonth,
            nextYear,
            `Excess salary from ${payment_month} ${payment_year}`
          );
        }

        console.log(`📦 Created advance of ₹${newExcess} for ${member.name} → ${nextMonth} ${nextYear}`);
      }

      // Create ledger entry
      try {
        const ledgerService = require("../services/ledger.service");
        ledgerService.createSalaryPaymentEntry({
          member_id: memberId,
          amount: paymentAmount,
          payment_date: paymentDateStr,
          payment_month: `${payment_month} ${payment_year}`,
          payment_mode: payment_mode || 'Cash',
          reference_no,
          notes: notes || `Manual salary payment to ${member.name}`
        });
      } catch (e) {
        console.warn("Ledger entry creation failed:", e.message);
      }

      return {
        payment_id: result.lastInsertRowid,
        receipt_number: receiptNumber,
        base_salary: baseSalary,
        effective_base_salary: effectiveBaseSalary,
        advance_applied: advanceFromPrevious,
        effective_salary: effectiveSalaryNeeded,
        fee_collected: feeCollections.total,
        manual_paid: paymentAmount,
        total_paid: totalAfterPayment,
        remaining: Math.max(0, effectiveSalaryNeeded - totalAfterPayment),
        excess_for_next_month: Math.max(0, newExcess)
      };
    });

    const result = payTx();

    res.status(201).json({
      success: true,
      message: "Salary paid successfully",
      data: result
    });
  } catch (err) {
    console.error("Pay salary error:", err);
    next(err);
  }
};

// ============================================
// GET SALARY PAYMENT HISTORY
// ============================================
exports.getSalaryHistory = (req, res, next) => {
  try {
    const rows = db.prepare(`
      SELECT * FROM member_salary_payments
      WHERE member_id = ?
      ORDER BY payment_year DESC, payment_date DESC
    `).all(req.params.id);

    res.json({ success: true, data: rows });
  } catch (err) {
    console.error("Get salary history error:", err);
    next(err);
  }
};

// ============================================
// GET SINGLE SALARY PAYMENT (FOR RECEIPT)
// ============================================
exports.getSalaryPayment = (req, res, next) => {
  try {
    const payment = db.prepare(`
      SELECT sp.*, m.name as member_name, m.mobile as member_mobile,
             m.father_name as member_father_name, m.id_type as member_id_type,
             m.id_number as member_id_number, m.salary as member_salary
      FROM member_salary_payments sp
      JOIN members m ON m.member_id = sp.member_id
      WHERE sp.payment_id = ?
    `).get(req.params.paymentId);

    if (!payment) {
      return res.status(404).json({ success: false, message: "Salary payment not found" });
    }

    res.json({ success: true, data: payment });
  } catch (err) {
    console.error("Get salary payment error:", err);
    next(err);
  }
};

// ============================================
// DELETE SALARY PAYMENT
// ============================================
exports.deleteSalaryPayment = (req, res, next) => {
  try {
    const payment = db.prepare(`
      SELECT * FROM member_salary_payments WHERE payment_id = ?
    `).get(req.params.paymentId);

    if (!payment) {
      return res.status(404).json({ success: false, message: "Salary payment not found" });
    }

    db.prepare(`DELETE FROM member_salary_payments WHERE payment_id = ?`).run(req.params.paymentId);

    res.json({ success: true, message: "Salary payment deleted successfully" });
  } catch (err) {
    console.error("Delete salary payment error:", err);
    next(err);
  }
};

module.exports = exports;