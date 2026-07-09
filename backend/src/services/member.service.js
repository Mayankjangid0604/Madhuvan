// services/member.service.js
const db = require("../config/db.sqlite");
const fs = require("fs");
const path = require("path");

// ✅ FIX: Make sharp optional for Electron compatibility
let sharp;
try {
  sharp = require("sharp");
} catch (err) {
  console.warn("⚠️ Sharp module not available - image processing will skip compression");
  sharp = null;
}

const { MEMBERS_UPLOAD_DIR } = require("../config/paths");

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

// ============================================
// HELPERS
// ============================================
const toNum = (v) => Number(v) || 0;

function getMonthIndex(monthName) {
  return MONTHS.indexOf(monthName);
}

function formatMonthYear(month, year) {
  return `${year}-${String(getMonthIndex(month) + 1).padStart(2, '0')}`;
}

/**
 * Calculate prorated salary for the joining month.
 * If joined on the 1st, full salary. Otherwise prorate by days worked.
 * @param {number} baseSalary - Full monthly salary
 * @param {string} joiningDate - YYYY-MM-DD
 * @param {number} year - Year of the month to calculate for
 * @param {number} month - 0-indexed month to calculate for
 * @returns {{ amount: number, isProrated: boolean, daysWorked: number, daysInMonth: number }}
 */
function calculateProratedSalary(baseSalary, joiningDate, year, month) {
  const dateStr = String(joiningDate).substring(0, 10);
  const parts = dateStr.split('-');
  const joinYear = parseInt(parts[0]);
  const joinMonth = parseInt(parts[1]) - 1; // 0-indexed
  const joinDay = parseInt(parts[2]);

  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Only prorate if this is the joining month
  if (joinYear === year && joinMonth === month) {
    if (joinDay === 1) {
      return { amount: baseSalary, isProrated: false, daysWorked: daysInMonth, daysInMonth };
    }
    const daysWorked = daysInMonth - joinDay + 1;
    const proratedAmount = Math.round((baseSalary / daysInMonth) * daysWorked);
    return { amount: proratedAmount, isProrated: true, daysWorked, daysInMonth };
  }

  // Not the joining month — full salary
  return { amount: baseSalary, isProrated: false, daysWorked: daysInMonth, daysInMonth };
}

// ============================================
// CREATE MEMBER
// ============================================
exports.createMember = (data) => {
  const today = new Date().toISOString().split('T')[0];

  const result = db.db.prepare(`
    INSERT INTO members (
      name, father_name, mobile, email, role, dob, id_type, id_number,
      salary, date_of_joining, address, is_active
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
  `).run(
    data.name,
    data.father_name || null,
    data.mobile || null,
    data.email || null,
    data.role || 'staff',
    data.dob || null,
    data.id_type || null,
    data.id_number || null,
    toNum(data.salary),
    data.date_of_joining || today,
    data.address || null
  );

  return { member_id: result.lastInsertRowid };
};

// ============================================
// GET ALL MEMBERS (ACTIVE)
// ============================================
exports.getAllMembers = () => {
  const members = db.db.prepare(`
    SELECT m.* FROM members m WHERE m.is_active = 1 ORDER BY m.created_at DESC
  `).all();

  return members.map(m => {
    const totalCollected = toNum(db.db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total FROM member_transactions WHERE member_id = ?
    `).get(m.member_id)?.total);

    const totalManualPaid = toNum(db.db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total FROM member_salary_payments WHERE member_id = ?
    `).get(m.member_id)?.total);

    const pendingAdvances = toNum(db.db.prepare(`
      SELECT COALESCE(SUM(amount - used_amount), 0) as total
      FROM member_salary_advances WHERE member_id = ? AND status = 'PENDING'
    `).get(m.member_id)?.total);

    return {
      ...m,
      total_fee_collected: totalCollected,
      total_manual_paid: totalManualPaid,
      total_salary_earned: totalCollected + totalManualPaid,
      pending_advances: pendingAdvances
    };
  });
};

// ============================================
// GET ACTIVE MEMBERS (FOR DROPDOWN)
// ============================================
exports.getActiveMembers = () => {
  return db.db.prepare(`
    SELECT member_id, name, role, salary FROM members WHERE is_active = 1 ORDER BY name ASC
  `).all();
};

// ============================================
// GET MEMBER BY ID
// ============================================
exports.getMemberById = (memberId) => {
  const member = db.db.prepare(`SELECT * FROM members WHERE member_id = ?`).get(memberId);
  if (!member) throw new Error('Member not found');
  return member;
};

// ============================================
// UPDATE MEMBER
// ============================================
exports.updateMember = (memberId, data) => {
  const member = exports.getMemberById(memberId);

  db.db.prepare(`
    UPDATE members SET
      name = ?, father_name = ?, mobile = ?, email = ?, role = ?,
      dob = ?, id_type = ?, id_number = ?, salary = ?,
      date_of_joining = ?, address = ?, updated_at = CURRENT_TIMESTAMP
    WHERE member_id = ?
  `).run(
    data.name || member.name,
    data.father_name || null,
    data.mobile || null,
    data.email || null,
    data.role || member.role,
    data.dob || null,
    data.id_type || null,
    data.id_number || null,
    toNum(data.salary),
    data.date_of_joining || member.date_of_joining,
    data.address || null,
    memberId
  );

  return { success: true };
};

// ============================================
// UPLOAD MEMBER PHOTO
// ============================================
exports.uploadMemberPhoto = async (memberId, file) => {
  if (!file || !file.path) throw new Error("Photo upload failed - no file provided");
  const member = exports.getMemberById(memberId);

  try {
    const outputFilename = `member-${memberId}-${Date.now()}.jpg`;
    const outputPath = path.join(MEMBERS_UPLOAD_DIR, outputFilename);

    // ✅ FIX: Handle case where sharp is not available
    if (sharp) {
      await sharp(file.path)
        .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 85, progressive: true })
        .toFile(outputPath);

      if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
    } else {
      // Fallback: Just rename/move the file without compression
      console.log(`⚠️ Sharp not available - saving image without compression`);
      fs.renameSync(file.path, outputPath);
    }

    if (member.photo_url) {
      try {
        const oldFilename = member.photo_url.replace(/^\/uploads\/members\//, "");
        const oldFilePath = path.join(MEMBERS_UPLOAD_DIR, oldFilename);
        if (fs.existsSync(oldFilePath) && oldFilePath !== outputPath) fs.unlinkSync(oldFilePath);
      } catch (err) { console.warn("Could not delete old photo:", err.message); }
    }

    const photoUrl = `/uploads/members/${outputFilename}`;
    db.db.prepare(`UPDATE members SET photo_url = ?, updated_at = CURRENT_TIMESTAMP WHERE member_id = ?`)
      .run(photoUrl, memberId);

    return { photo_url: photoUrl };
  } catch (err) {
    if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
    throw new Error(`Photo processing failed: ${err.message}`);
  }
};

// ============================================
// DELETE (DEACTIVATE) MEMBER
// ============================================
exports.deleteMember = (memberId) => {
  exports.getMemberById(memberId);
  db.db.prepare(`UPDATE members SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE member_id = ?`)
    .run(memberId);
  return { success: true };
};

// ============================================
// GET MEMBER TRANSACTIONS (FEE COLLECTIONS)
// ============================================
exports.getMemberTransactions = (memberId) => {
  return db.db.prepare(`
    SELECT mt.*, s.student_name, s.father_name
    FROM member_transactions mt
    LEFT JOIN students s ON mt.student_id = s.student_id
    WHERE mt.member_id = ?
    ORDER BY mt.created_at DESC
  `).all(memberId);
};

// ============================================
// GET MEMBER SUMMARY
// ============================================
exports.getMemberSummary = (memberId) => {
  const member = exports.getMemberById(memberId);
  const baseSalary = toNum(member.salary);

  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth(); // 0-indexed

  // Total fees collected by this member (all time)
  const totalCollected = toNum(db.db.prepare(`
    SELECT COALESCE(SUM(amount), 0) as total FROM member_transactions WHERE member_id = ?
  `).get(memberId)?.total);

  // Manual salary payments (all time)
  const salaryData = db.db.prepare(`
    SELECT COALESCE(SUM(amount), 0) as total, COUNT(*) as count, MAX(payment_date) as last_payment
    FROM member_salary_payments WHERE member_id = ?
  `).get(memberId);
  const totalManualPaid = toNum(salaryData?.total);
  const totalEverPaid = totalCollected + totalManualPaid;

  // Advance salary given to member
  const advancePaid = toNum(db.db.prepare(`
    SELECT COALESCE(SUM(amount), 0) as total FROM member_salary_advances WHERE member_id = ?
  `).get(memberId)?.total);

  const pendingAdvances = toNum(db.db.prepare(`
    SELECT COALESCE(SUM(amount - used_amount), 0) as total
    FROM member_salary_advances WHERE member_id = ? AND status = 'PENDING'
  `).get(memberId)?.total);

  // ── Total salary DUE — only for COMPLETED months (not the current month) ──
  // Salary is paid AFTER the month is completed.
  // First month is prorated from joining date to end of that month.
  let totalSalaryDue = 0;
  let joinDateUsed = null;
  if (baseSalary > 0) {
    const rawDate = member.date_of_joining || member.created_at;
    if (rawDate) {
      const dateStr = String(rawDate).substring(0, 10);
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const joinYear = parseInt(parts[0]);
        const joinMonth = parseInt(parts[1]) - 1; // 0-indexed
        joinDateUsed = dateStr;

        // Iterate through each completed month from joining to last month
        // Current month is NOT included (salary paid after month completes)
        let y = joinYear;
        let m = joinMonth;
        while (y < currentYear || (y === currentYear && m < currentMonth)) {
          // First month: prorated; subsequent months: full salary
          const prorated = calculateProratedSalary(baseSalary, dateStr, y, m);
          totalSalaryDue += prorated.amount;
          // Next month
          m++;
          if (m > 11) { m = 0; y++; }
        }
      } else {
        totalSalaryDue = baseSalary; // fallback: just 1 month
      }
    } else {
      totalSalaryDue = baseSalary;
    }
  }

  // Total remaining = cumulative due minus all payments
  const total_remaining_salary = Math.max(0, totalSalaryDue - totalEverPaid);

  // Last completed month's remaining salary
  // (the month that just ended — the one salary should be paid for)
  let lastMonth = currentMonth - 1;
  let lastMonthYear = currentYear;
  if (lastMonth < 0) { lastMonth = 11; lastMonthYear--; }
  const lastMonthStr = `${lastMonthYear}-${String(lastMonth + 1).padStart(2, '0')}`;

  const lastMonthCollected = toNum(db.db.prepare(`
    SELECT COALESCE(SUM(amount), 0) as total
    FROM member_transactions
    WHERE member_id = ? AND salary_month = ?
  `).get(memberId, lastMonthStr)?.total);

  const lastMonthManualPaid = toNum(db.db.prepare(`
    SELECT COALESCE(SUM(amount), 0) as total
    FROM member_salary_payments
    WHERE member_id = ? AND payment_month = ? AND CAST(payment_year AS INTEGER) = ?
  `).get(memberId, MONTHS[lastMonth], lastMonthYear)?.total);

  // For last month, use prorated salary if it's the joining month
  let lastMonthSalary = baseSalary;
  if (joinDateUsed) {
    const prorated = calculateProratedSalary(baseSalary, joinDateUsed, lastMonthYear, lastMonth);
    lastMonthSalary = prorated.amount;
  }

  const remaining_this_month = Math.max(0, lastMonthSalary - lastMonthCollected - lastMonthManualPaid);

  return {
    base_salary: baseSalary,
    total_fee_collected: totalCollected,
    total_manual_paid: totalManualPaid,
    total_salary_earned: totalEverPaid,
    total_salary_due: totalSalaryDue,
    total_remaining_salary,
    remaining_this_month,
    advance_paid: advancePaid,
    pending_advances: pendingAdvances,
    salary_payment_count: salaryData?.count || 0,
    last_salary_payment: salaryData?.last_payment || null
  };
};


// ============================================
// GET SALARY HISTORY
// ============================================
exports.getSalaryHistory = (memberId) => {
  return db.db.prepare(`
    SELECT * FROM member_salary_payments
    WHERE member_id = ?
    ORDER BY payment_year DESC, payment_month DESC, payment_date DESC
  `).all(memberId);
};

// ============================================
// GET SALARY PAYMENT BY ID
// ============================================
exports.getSalaryPayment = (paymentId) => {
  const payment = db.db.prepare(`
    SELECT * FROM member_salary_payments WHERE payment_id = ?
  `).get(paymentId);
  if (!payment) throw new Error('Salary payment not found');
  return payment;
};

// ============================================
// DELETE SALARY PAYMENT
// ============================================
exports.deleteSalaryPayment = (paymentId) => {
  const payment = exports.getSalaryPayment(paymentId);

  const deleteTx = db.db.transaction(() => {
    db.db.prepare(`DELETE FROM member_salary_payments WHERE payment_id = ?`).run(paymentId);
    db.db.prepare(`
      DELETE FROM ledger_entries
      WHERE entry_type = 'expense' AND category = 'Salary Payment'
      AND reference_no = ?
    `).run(payment.receipt_number);
  });

  deleteTx();
  return { success: true };
};

// ============================================
// GET ALL SALARY PAYMENTS (WITH FILTERS)
// ============================================
exports.getAllSalaryPayments = (filters = {}) => {
  let sql = `
    SELECT msp.*, m.name as member_name, m.role
    FROM member_salary_payments msp
    JOIN members m ON msp.member_id = m.member_id
    WHERE 1=1
  `;
  const params = [];

  if (filters.member_id) { sql += ' AND msp.member_id = ?'; params.push(filters.member_id); }
  if (filters.month) { sql += ' AND msp.payment_month = ?'; params.push(filters.month); }
  if (filters.year) { sql += ' AND msp.payment_year = ?'; params.push(filters.year); }

  sql += ' ORDER BY msp.payment_date DESC, msp.payment_id DESC';
  return db.db.prepare(sql).all(...params);
};

module.exports = exports;