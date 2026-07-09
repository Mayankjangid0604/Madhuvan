// services/ledger.service.js
const db = require("../config/db.sqlite");

// ============================================
// HELPERS
// ============================================

const getCurrentBalance = () => {
  const result = db.db.prepare(`
    SELECT COALESCE(SUM(debit), 0) - COALESCE(SUM(credit), 0) as balance
    FROM ledger_entries
  `).get();
  return Number(result?.balance || 0);
};

const getMonthName = (dateStr) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
};

// ============================================
// 1. FEE PAYMENT ENTRY (DEBIT)
// ============================================
exports.createFeePaymentEntry = ({
  student_id,
  payment_amount,
  payment_date,
  payment_mode,
  reference_no,
  fee_month,
  advance_included = 0,
  received_by_member = null
}) => {
  const numAmount = Number(payment_amount);
  if (!numAmount || numAmount <= 0) {
    console.warn('⚠️ Skipping ledger entry: invalid fee payment amount', payment_amount);
    return null;
  }

  const student = db.db.prepare(`
    SELECT student_name, father_name FROM students WHERE student_id = ?
  `).get(student_id);
  
  if (!student) throw new Error('Student not found');
  
  const category = getMonthName(fee_month || payment_date);
  
  let description = `${student.student_name} D/O ${student.father_name || 'N/A'}`;
  if (advance_included > 0) {
    description += ` - Fee ₹${numAmount - advance_included} + Advance ₹${advance_included}`;
  } else {
    description += ` - Fee ₹${numAmount}`;
  }
  if (received_by_member) {
    description += ` - Received by ${received_by_member}`;
  }
  
  const currentBalance = getCurrentBalance();
  const newBalance = currentBalance + numAmount;
  
  const result = db.db.prepare(`
    INSERT INTO ledger_entries (
      entry_date, entry_type, category, amount, debit, credit, balance,
      payment_mode, reference_no, description, student_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    payment_date, 'income', category, numAmount, numAmount, 0, newBalance,
    payment_mode || 'CASH', reference_no, description, student_id
  );
  
  return result.lastInsertRowid;
};

// ============================================
// 2. SECURITY DEPOSIT ENTRY (DEBIT)
// ============================================
exports.createSecurityDepositEntry = ({
  student_id,
  amount,
  payment_date,
  payment_mode,
  reference_no
}) => {
  const numAmount = Number(amount);
  if (!numAmount || numAmount <= 0) {
    console.warn('⚠️ Skipping ledger entry: invalid security deposit amount', amount);
    return null;
  }

  const student = db.db.prepare(`
    SELECT student_name, father_name FROM students WHERE student_id = ?
  `).get(student_id);
  
  if (!student) throw new Error('Student not found');
  
  const description = `${student.student_name} D/O ${student.father_name || 'N/A'} - Security Deposit`;
  
  const currentBalance = getCurrentBalance();
  const newBalance = currentBalance + numAmount;
  
  const result = db.db.prepare(`
    INSERT INTO ledger_entries (
      entry_date, entry_type, category, amount, debit, credit, balance,
      payment_mode, reference_no, description, student_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    payment_date, 'income', 'Security Deposit', numAmount, numAmount, 0, newBalance,
    payment_mode || 'CASH', reference_no, description, student_id
  );
  
  return result.lastInsertRowid;
};

// ============================================
// 3. MONEY GIVEN TO STUDENT (CREDIT)
// ============================================
exports.createMoneyGivenEntry = ({
  student_id,
  amount,
  given_date,
  note
}) => {
  const numAmount = Number(amount);
  if (!numAmount || numAmount <= 0) {
    console.warn('⚠️ Skipping ledger entry: invalid money given amount', amount);
    return null;
  }

  const student = db.db.prepare(`
    SELECT student_name FROM students WHERE student_id = ?
  `).get(student_id);
  
  if (!student) throw new Error('Student not found');
  
  const description = note || `Given cash to ${student.student_name}`;
  
  const currentBalance = getCurrentBalance();
  const newBalance = currentBalance - numAmount;
  
  const result = db.db.prepare(`
    INSERT INTO ledger_entries (
      entry_date, entry_type, category, amount, debit, credit, balance,
      description, student_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    given_date || new Date().toISOString().split('T')[0],
    'expense', 'Given Money', numAmount, 0, numAmount, newBalance,
    description, student_id
  );
  
  return result.lastInsertRowid;
};

// ============================================
// 4. SECURITY REFUND (CREDIT)
// ============================================
exports.createSecurityRefundEntry = ({
  student_id,
  amount,
  refund_date,
  payment_mode,
  reason
}) => {
  const numAmount = Number(amount);
  if (!numAmount || numAmount <= 0) {
    console.warn('⚠️ Skipping ledger entry: invalid refund amount', amount);
    return null;
  }

  const student = db.db.prepare(`
    SELECT student_name, father_name FROM students WHERE student_id = ?
  `).get(student_id);
  
  if (!student) throw new Error('Student not found');
  
  const description = `Refund to ${student.student_name} D/O ${student.father_name || 'N/A'} - ${reason || 'Checkout'}`;
  
  const currentBalance = getCurrentBalance();
  const newBalance = currentBalance - numAmount;
  
  const result = db.db.prepare(`
    INSERT INTO ledger_entries (
      entry_date, entry_type, category, amount, debit, credit, balance,
      payment_mode, description, student_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    refund_date || new Date().toISOString().split('T')[0],
    'expense', 'Security Refund', numAmount, 0, numAmount, newBalance,
    payment_mode || 'CASH', description, student_id
  );
  
  return result.lastInsertRowid;
};

// ============================================
// 5. SALARY FROM FEE (CREDIT)
// ============================================
exports.createSalaryFromFeeEntry = ({
  member_id,
  member_name,
  amount,
  payment_date,
  student_name,
  fee_invoice
}) => {
  const numAmount = Number(amount);
  if (!numAmount || numAmount <= 0) {
    console.warn('⚠️ Skipping ledger entry: invalid salary from fee amount', amount);
    return null;
  }

  const description = `Salary paid to ${member_name} - Via fee from ${student_name}`;
  
  const currentBalance = getCurrentBalance();
  const newBalance = currentBalance - numAmount;
  
  const result = db.db.prepare(`
    INSERT INTO ledger_entries (
      entry_date, entry_type, category, amount, debit, credit, balance,
      reference_no, description
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    payment_date, 'expense', 'Salary Payment', numAmount, 0, numAmount, newBalance,
    fee_invoice, description
  );
  
  return result.lastInsertRowid;
};

// ============================================
// 6. DIRECT SALARY PAYMENT (CREDIT)
// ============================================
exports.createSalaryPaymentEntry = ({
  member_id,
  amount,
  payment_date,
  payment_month,
  payment_mode,
  reference_no,
  notes
}) => {
  const numAmount = Number(amount);
  if (!numAmount || numAmount <= 0) {
    console.warn('⚠️ Skipping ledger entry: invalid salary amount', amount);
    return null;
  }

  const member = db.db.prepare(`
    SELECT name FROM members WHERE member_id = ?
  `).get(member_id);
  
  if (!member) {
    console.warn('⚠️ Skipping ledger entry: member not found', member_id);
    return null;
  }
  
  const description = notes || `Salary paid to ${member.name} for ${payment_month || 'N/A'}`;
  
  const currentBalance = getCurrentBalance();
  const newBalance = currentBalance - numAmount;
  
  const result = db.db.prepare(`
    INSERT INTO ledger_entries (
      entry_date, entry_type, category, amount, debit, credit, balance,
      payment_mode, reference_no, description
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    payment_date || new Date().toISOString().split('T')[0],
    'expense', 'Salary Payment', numAmount, 0, numAmount, newBalance,
    payment_mode || 'CASH', reference_no || null, description
  );
  
  return result.lastInsertRowid;
};

// ============================================
// 7. MANUAL EXPENSE ENTRY (CREDIT)
// ============================================
exports.createManualExpenseEntry = ({
  entry_date,
  category,
  amount,
  payment_mode,
  reference_no,
  description
}) => {
  const numAmount = Number(amount);
  if (!entry_date || !category || !numAmount || numAmount <= 0) {
    throw new Error('Entry date, category, and valid amount are required');
  }
  
  const currentBalance = getCurrentBalance();
  const newBalance = currentBalance - numAmount;
  
  const result = db.db.prepare(`
    INSERT INTO ledger_entries (
      entry_date, entry_type, category, amount, debit, credit, balance,
      payment_mode, reference_no, description
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    entry_date, 'expense', category, numAmount, 0, numAmount, newBalance,
    payment_mode || 'CASH', reference_no, description
  );
  
  return result.lastInsertRowid;
};

// ============================================
// 8. MANUAL INCOME ENTRY (DEBIT)
// ============================================
exports.createManualIncomeEntry = ({
  entry_date,
  category,
  amount,
  payment_mode,
  reference_no,
  description
}) => {
  const numAmount = Number(amount);
  if (!entry_date || !category || !numAmount || numAmount <= 0) {
    throw new Error('Entry date, category, and valid amount are required');
  }
  
  const currentBalance = getCurrentBalance();
  const newBalance = currentBalance + numAmount;
  
  const result = db.db.prepare(`
    INSERT INTO ledger_entries (
      entry_date, entry_type, category, amount, debit, credit, balance,
      payment_mode, reference_no, description
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    entry_date, 'income', category, numAmount, numAmount, 0, newBalance,
    payment_mode || 'CASH', reference_no, description
  );
  
  return result.lastInsertRowid;
};

// ============================================
// GET MEMBER SALARY STATUS
// ============================================
exports.getMemberSalaryStatus = (memberId, month, year) => {
  const member = db.db.prepare(`
    SELECT name, salary FROM members WHERE member_id = ?
  `).get(memberId);
  
  if (!member) return null;
  
  const monthStr = `${year}-${String(month).padStart(2, '0')}`;
  
  const feePayments = db.db.prepare(`
    SELECT COALESCE(SUM(amount), 0) as total
    FROM member_transactions
    WHERE member_id = ? AND transaction_type = 'salary_from_fee'
    AND strftime('%Y-%m', created_at) = ?
  `).get(memberId, monthStr);
  
  const directPayments = db.db.prepare(`
    SELECT COALESCE(SUM(amount), 0) as total
    FROM member_salary_payments
    WHERE member_id = ? AND payment_month = ? AND payment_year = ?
  `).get(memberId, month, year);
  
  const baseSalary = Number(member.salary || 0);
  const paidViaFees = Number(feePayments?.total || 0);
  const paidDirect = Number(directPayments?.total || 0);
  const totalPaid = paidViaFees + paidDirect;
  const remaining = Math.max(0, baseSalary - totalPaid);
  
  return {
    member_name: member.name,
    base_salary: baseSalary,
    paid_via_fees: paidViaFees,
    paid_direct: paidDirect,
    total_paid: totalPaid,
    remaining: remaining,
    is_fully_paid: remaining === 0
  };
};

// ============================================
// GET ALL ENTRIES
// ============================================
exports.getAllEntries = (filters = {}) => {
  let sql = `
    SELECT le.*, s.student_name, s.father_name
    FROM ledger_entries le
    LEFT JOIN students s ON le.student_id = s.student_id
    WHERE 1=1
  `;
  const params = [];
  
  if (filters.from_date) {
    sql += ' AND le.entry_date >= ?';
    params.push(filters.from_date);
  }
  if (filters.to_date) {
    sql += ' AND le.entry_date <= ?';
    params.push(filters.to_date);
  }
  if (filters.entry_type) {
    if (filters.entry_type === 'income') {
      sql += ' AND le.debit > 0';
    } else if (filters.entry_type === 'expense') {
      sql += ' AND le.credit > 0';
    }
  }
  if (filters.category) {
    sql += ' AND le.category = ?';
    params.push(filters.category);
  }
  if (filters.student_id) {
    sql += ' AND le.student_id = ?';
    params.push(filters.student_id);
  }
  
  sql += ' ORDER BY le.entry_date ASC, le.entry_id ASC';
  
  return db.db.prepare(sql).all(...params).map(e => {
    const debit = Number(e.debit || 0);
    const credit = Number(e.credit || 0);
    
    return {
      ...e,
      amount: Number(e.amount) || debit + credit,
      entry_type: debit > 0 ? 'income' : 'expense',
      original_type: e.entry_type,
      debit: debit,
      credit: credit,
      balance: Number(e.balance || 0)
    };
  });
};

// ============================================
// GET STUDENT LEDGER
// ============================================
exports.getStudentLedger = (studentId) => {
  return db.db.prepare(`
    SELECT * FROM ledger_entries WHERE student_id = ?
    ORDER BY entry_date ASC, entry_id ASC
  `).all(studentId).map(e => {
    const debit = Number(e.debit || 0);
    const credit = Number(e.credit || 0);
    
    return {
      ...e,
      amount: Number(e.amount) || debit + credit,
      entry_type: debit > 0 ? 'income' : 'expense',
      original_type: e.entry_type,
      debit: debit,
      credit: credit,
      balance: Number(e.balance || 0)
    };
  });
};

// ============================================
// GET OVERALL SUMMARY
// ============================================
exports.getOverallSummary = (filters = {}) => {
  let sql = `
    SELECT
      COALESCE(SUM(debit), 0) as total_debit,
      COALESCE(SUM(credit), 0) as total_credit
    FROM ledger_entries WHERE 1=1
  `;
  const params = [];
  
  if (filters.from_date) {
    sql += ' AND entry_date >= ?';
    params.push(filters.from_date);
  }
  if (filters.to_date) {
    sql += ' AND entry_date <= ?';
    params.push(filters.to_date);
  }
  
  const result = db.db.prepare(sql).get(...params);
  const totalDebit = Number(result?.total_debit || 0);
  const totalCredit = Number(result?.total_credit || 0);
  
  return {
    total_debit: totalDebit,
    total_credit: totalCredit,
    balance: totalDebit - totalCredit,
    total_income: totalDebit,
    total_expense: totalCredit
  };
};

// ============================================
// GET STUDENT SUMMARY
// ============================================
exports.getStudentSummary = (studentId) => {
  const result = db.db.prepare(`
    SELECT
      COALESCE(SUM(debit), 0) as total_debit,
      COALESCE(SUM(credit), 0) as total_credit
    FROM ledger_entries WHERE student_id = ?
  `).get(studentId);
  
  const totalDebit = Number(result?.total_debit || 0);
  const totalCredit = Number(result?.total_credit || 0);
  
  return {
    total_debit: totalDebit,
    total_credit: totalCredit,
    balance: totalDebit - totalCredit,
    total_received: totalDebit,
    total_given: totalCredit
  };
};

// ============================================
// GET CATEGORY SUMMARY
// ============================================
exports.getCategorySummary = (filters = {}) => {
  let sql = `
    SELECT category,
      CASE WHEN SUM(debit) > 0 THEN 'income' ELSE 'expense' END as entry_type,
      SUM(debit) as total_debit,
      SUM(credit) as total_credit,
      COUNT(*) as count
    FROM ledger_entries WHERE 1=1
  `;
  const params = [];
  
  if (filters.from_date) {
    sql += ' AND entry_date >= ?';
    params.push(filters.from_date);
  }
  if (filters.to_date) {
    sql += ' AND entry_date <= ?';
    params.push(filters.to_date);
  }
  
  sql += ' GROUP BY category ORDER BY total_debit + total_credit DESC';
  
  return db.db.prepare(sql).all(...params).map(r => ({
    category: r.category,
    entry_type: r.entry_type,
    total_debit: Number(r.total_debit || 0),
    total_credit: Number(r.total_credit || 0),
    count: r.count
  }));
};

// ============================================
// UPDATE & DELETE
// ============================================
exports.updateEntry = (entryId, data) => {
  const existing = db.db.prepare(`SELECT * FROM ledger_entries WHERE entry_id = ?`).get(entryId);
  if (!existing) throw new Error('Ledger entry not found');
  
  const updateTx = db.db.transaction(() => {
    const newDebit = data.debit !== undefined ? data.debit : existing.debit;
    const newCredit = data.credit !== undefined ? data.credit : existing.credit;
    const newAmount = Number(newDebit) + Number(newCredit);

    db.db.prepare(`
      UPDATE ledger_entries SET
        entry_date = ?, category = ?, amount = ?, debit = ?, credit = ?,
        payment_mode = ?, reference_no = ?, description = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE entry_id = ?
    `).run(
      data.entry_date || existing.entry_date,
      data.category || existing.category,
      newAmount,
      newDebit,
      newCredit,
      data.payment_mode || existing.payment_mode,
      data.reference_no || existing.reference_no,
      data.description || existing.description,
      entryId
    );
    recalculateBalances();
  });
  
  updateTx();
  return { success: true };
};

exports.deleteEntry = (entryId) => {
  const deleteTx = db.db.transaction(() => {
    db.db.prepare(`DELETE FROM ledger_entries WHERE entry_id = ?`).run(entryId);
    recalculateBalances();
  });
  deleteTx();
  return { success: true };
};

function recalculateBalances() {
  const entries = db.db.prepare(`
    SELECT entry_id, debit, credit FROM ledger_entries
    ORDER BY entry_date ASC, entry_id ASC
  `).all();
  
  let runningBalance = 0;
  for (const entry of entries) {
    runningBalance += Number(entry.debit || 0) - Number(entry.credit || 0);
    db.db.prepare(`UPDATE ledger_entries SET balance = ? WHERE entry_id = ?`)
      .run(runningBalance, entry.entry_id);
  }
}

// Backwards compatibility
exports.getLedger = exports.getAllEntries;
exports.addManualEntry = (data) => {
  if (data.entry_type === 'income') {
    return exports.createManualIncomeEntry(data);
  } else {
    return exports.createManualExpenseEntry(data);
  }
};

module.exports = exports;