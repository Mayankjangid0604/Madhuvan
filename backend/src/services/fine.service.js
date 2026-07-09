const db = require("../config/db.sqlite");

const toNum = (v) => Number(v) || 0;

// ============================================
// GET STUDENTS BY ROOM
// ============================================
exports.getStudentsByRoom = (roomNo) => {
  const students = db.db.prepare(`
    SELECT 
      s.student_id, 
      s.student_name, 
      s.student_mobile,
      r.room_no,
      b.bed_no
    FROM students s
    LEFT JOIN room_allocation a ON a.student_id = s.student_id AND a.allocation_status = 'active'
    LEFT JOIN rooms r ON a.room_id = r.room_id
    LEFT JOIN beds b ON a.bed_id = b.bed_id
    WHERE r.room_no = ? AND s.status = 'active' AND s.date_of_leaving IS NULL
    ORDER BY b.bed_no
  `).all(roomNo);

  return students;
};

// ============================================
// GET STUDENT SECURITY INFO
// ============================================
exports.getStudentSecurity = (studentId) => {
  const student = db.db.prepare(`
    SELECT 
      student_id, 
      student_name, 
      security_deposit, 
      original_security_deposit
    FROM students 
    WHERE student_id = ?
  `).get(studentId);

  if (!student) return null;

  // ✅ FIX: Check how much security has actually been PAID/RECEIVED (not just configured)
  const securityPaidRow = db.db.prepare(`
    SELECT COALESCE(SUM(paid_amount), 0) as total_paid
    FROM student_fees
    WHERE student_id = ? AND fee_type = 'Security Deposit'
  `).get(studentId);

  const actualPaidSecurity = toNum(securityPaidRow?.total_paid);

  // Get security deductions made so far
  const deductions = db.db.prepare(`
    SELECT 
      'Fine' as type,
      amount,
      created_at as date,
      note as description
    FROM pending_fines
    WHERE student_id = ? AND status = 'DEDUCTED' AND deducted_from_security = 1
    UNION ALL
    SELECT 
      'Property Damage' as type,
      amount,
      created_at as date,
      note as description
    FROM property_damage_records
    WHERE student_id = ? AND deducted_from_security = 1
    UNION ALL
    SELECT 
      'Money Given' as type,
      amount,
      created_at as date,
      note as description
    FROM money_given_records
    WHERE student_id = ? AND deducted_from_security = 1
    ORDER BY date DESC
  `).all(studentId, studentId, studentId);

  const totalDeductions = deductions.reduce((sum, d) => sum + toNum(d.amount), 0);
  // Available = actually received - deductions (never negative)
  const remaining = Math.max(0, actualPaidSecurity - totalDeductions);

  return {
    ...student,
    deductions,
    total_deductions: totalDeductions,
    security_paid: actualPaidSecurity,
    remaining_security: remaining
  };
};

// ============================================
// GET PENDING ITEMS FOR STUDENT
// ============================================
exports.getPendingItems = (studentId) => {
  const fines = db.db.prepare(`
    SELECT * FROM pending_fines 
    WHERE student_id = ? AND status = 'PENDING'
    ORDER BY created_at DESC
  `).all(studentId);

  const damages = db.db.prepare(`
    SELECT * FROM property_damage_records 
    WHERE student_id = ? AND status = 'PENDING'
    ORDER BY created_at DESC
  `).all(studentId);

  const moneyGiven = db.db.prepare(`
    SELECT * FROM money_given_records 
    WHERE student_id = ? AND status = 'PENDING'
    ORDER BY created_at DESC
  `).all(studentId);

  return {
    fines,
    damages,
    money_given: moneyGiven,
    total_fines: fines.reduce((sum, f) => sum + toNum(f.amount), 0),
    total_damages: damages.reduce((sum, d) => sum + toNum(d.amount), 0),
    total_money_given: moneyGiven.reduce((sum, m) => sum + toNum(m.amount), 0)
  };
};

// ============================================
// APPLY FINE
// ============================================
exports.applyFine = (data) => {
  const { student_id, amount, note, fine_type = 'FINE', cut_from_security = false } = data;

  const deductFromSecurity = cut_from_security === true || cut_from_security === 'true' || cut_from_security === 1;

  // If deducting from security, update student's security deposit
  if (deductFromSecurity) {
    const student = db.db.prepare('SELECT security_deposit FROM students WHERE student_id = ?').get(student_id);
    if (!student) throw new Error('Student not found');

    // Check if security deposit has actually been paid/collected
    const securityFee = db.db.prepare(`
      SELECT COALESCE(SUM(paid_amount), 0) as total_paid 
      FROM student_fees 
      WHERE student_id = ? AND fee_type = 'Security Deposit'
    `).get(student_id);

    const actualPaidSecurity = toNum(securityFee?.total_paid);
    if (actualPaidSecurity <= 0) {
      throw new Error('Cannot deduct from security deposit - security deposit has not been received yet');
    }

    // Calculate how much is actually available (paid minus previous deductions)
    const previousDeductions = db.db.prepare(`
      SELECT COALESCE(SUM(change_amount), 0) as total 
      FROM security_deposit_history 
      WHERE student_id = ? AND change_type = 'DEDUCTION'
    `).get(student_id);

    const availableSecurity = actualPaidSecurity - toNum(previousDeductions?.total);
    if (toNum(amount) > availableSecurity) {
      throw new Error(`Insufficient security balance. Available: ₹${availableSecurity}, Requested: ₹${amount}`);
    }

    const newSecurity = Math.max(0, toNum(student.security_deposit) - toNum(amount));

    db.db.prepare('UPDATE students SET security_deposit = ? WHERE student_id = ?').run(newSecurity, student_id);

    // Log in security deposit history
    db.db.prepare(`
      INSERT INTO security_deposit_history 
      (student_id, previous_amount, new_amount, change_amount, change_type, reason)
      VALUES (?, ?, ?, ?, 'DEDUCTION', ?)
    `).run(student_id, toNum(student.security_deposit), newSecurity, toNum(amount), note || 'Fine deduction from security');
  }

  const result = db.db.prepare(`
    INSERT INTO pending_fines (student_id, amount, fine_type, note, status, deducted_from_security, created_at)
    VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
  `).run(student_id, amount, fine_type, note, deductFromSecurity ? 'DEDUCTED' : 'TRANSFERRED', deductFromSecurity ? 1 : 0);

  if (!deductFromSecurity) {
    db.db.prepare(`
      INSERT INTO student_fees (student_id, fee_type, fee_month, fee_amount, final_amount, fee_status, fee_date, due_date, fee_period_start, fee_period_end)
      VALUES (?, 'Fine', date('now', 'start of month'), ?, ?, 'DUE', date('now'), date('now', '+5 days'), date('now'), date('now'))
    `).run(student_id, amount, amount);
  }

  return {
    fine_id: result.lastInsertRowid,
    student_id,
    amount,
    fine_type,
    note,
    deducted_from_security: deductFromSecurity ? 1 : 0,
    status: deductFromSecurity ? 'DEDUCTED' : 'TRANSFERRED'
  };
};

// ============================================
// APPLY PROPERTY DAMAGE
// ============================================
exports.applyPropertyDamage = (data) => {
  const { student_id, amount, note, deduct_from_security = false, damage_type = 'GENERAL' } = data;

  const deductFromSecurity = deduct_from_security === true ? 1 : 0;

  // If deducting from security, update student's security deposit
  if (deductFromSecurity) {
    const student = db.db.prepare('SELECT security_deposit FROM students WHERE student_id = ?').get(student_id);
    if (!student) throw new Error('Student not found');

    // ✅ FIX: Check if security deposit has actually been paid/collected
    const securityFee = db.db.prepare(`
      SELECT COALESCE(SUM(paid_amount), 0) as total_paid 
      FROM student_fees 
      WHERE student_id = ? AND fee_type = 'Security Deposit'
    `).get(student_id);

    const actualPaidSecurity = toNum(securityFee?.total_paid);
    if (actualPaidSecurity <= 0) {
      throw new Error('Cannot deduct from security deposit - security deposit has not been received yet');
    }

    // Calculate how much is actually available (paid minus previous deductions)
    const previousDeductions = db.db.prepare(`
      SELECT COALESCE(SUM(change_amount), 0) as total 
      FROM security_deposit_history 
      WHERE student_id = ? AND change_type = 'DEDUCTION'
    `).get(student_id);

    const availableSecurity = actualPaidSecurity - toNum(previousDeductions?.total);
    if (toNum(amount) > availableSecurity) {
      throw new Error(`Insufficient security balance. Available: ₹${availableSecurity}, Requested: ₹${amount}`);
    }

    const newSecurity = Math.max(0, toNum(student.security_deposit) - toNum(amount));

    db.db.prepare('UPDATE students SET security_deposit = ? WHERE student_id = ?').run(newSecurity, student_id);

    // Log in security deposit history
    db.db.prepare(`
      INSERT INTO security_deposit_history 
      (student_id, previous_amount, new_amount, change_amount, change_type, reason)
      VALUES (?, ?, ?, ?, 'DEDUCTION', ?)
    `).run(student_id, toNum(student.security_deposit), newSecurity, toNum(amount), note || 'Property damage deduction');
  }

  const result = db.db.prepare(`
    INSERT INTO property_damage_records 
    (student_id, amount, note, damage_type, status, deducted_from_security, created_at)
    VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
  `).run(
    student_id,
    amount,
    note,
    damage_type,
    deductFromSecurity ? 'DEDUCTED' : 'TRANSFERRED',
    deductFromSecurity
  );

  if (!deductFromSecurity) {
    db.db.prepare(`
      INSERT INTO student_fees (student_id, fee_type, fee_month, fee_amount, final_amount, fee_status, fee_date, due_date, fee_period_start, fee_period_end)
      VALUES (?, 'Property Damage', date('now', 'start of month'), ?, ?, 'DUE', date('now'), date('now', '+5 days'), date('now'), date('now'))
    `).run(student_id, amount, amount);
  }

  return {
    damage_id: result.lastInsertRowid,
    student_id,
    amount,
    note,
    damage_type,
    deducted_from_security: deductFromSecurity,
    status: deductFromSecurity ? 'DEDUCTED' : 'TRANSFERRED'
  };
};

// ============================================
// GIVE MONEY TO STUDENT
// ============================================
exports.giveMoneyToStudent = (data) => {
  const { student_id, amount, note, given_by = 'ADMIN', deduct_from_security = false } = data;

  const deductFromSecurity = deduct_from_security === true ? 1 : 0;

  // If deducting from security, update student's security deposit
  if (deductFromSecurity) {
    const student = db.db.prepare('SELECT security_deposit FROM students WHERE student_id = ?').get(student_id);
    if (!student) throw new Error('Student not found');

    // ✅ FIX: Check if security deposit has actually been paid/collected
    const securityFee = db.db.prepare(`
      SELECT COALESCE(SUM(paid_amount), 0) as total_paid 
      FROM student_fees 
      WHERE student_id = ? AND fee_type = 'Security Deposit'
    `).get(student_id);

    const actualPaidSecurity = toNum(securityFee?.total_paid);
    if (actualPaidSecurity <= 0) {
      throw new Error('Cannot deduct from security deposit - security deposit has not been received yet');
    }

    // Calculate how much is actually available (paid minus previous deductions)
    const previousDeductions = db.db.prepare(`
      SELECT COALESCE(SUM(change_amount), 0) as total 
      FROM security_deposit_history 
      WHERE student_id = ? AND change_type = 'DEDUCTION'
    `).get(student_id);

    const availableSecurity = actualPaidSecurity - toNum(previousDeductions?.total);
    if (toNum(amount) > availableSecurity) {
      throw new Error(`Insufficient security balance. Available: ₹${availableSecurity}, Requested: ₹${amount}`);
    }

    const newSecurity = Math.max(0, toNum(student.security_deposit) - toNum(amount));

    db.db.prepare('UPDATE students SET security_deposit = ? WHERE student_id = ?').run(newSecurity, student_id);

    // Log in security deposit history
    db.db.prepare(`
      INSERT INTO security_deposit_history 
      (student_id, previous_amount, new_amount, change_amount, change_type, reason)
      VALUES (?, ?, ?, ?, 'DEDUCTION', ?)
    `).run(student_id, toNum(student.security_deposit), newSecurity, toNum(amount), note || 'Money given to student');
  }

  const result = db.db.prepare(`
    INSERT INTO money_given_records 
    (student_id, amount, note, given_by, status, deducted_from_security, created_at)
    VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
  `).run(
    student_id,
    amount,
    note,
    given_by,
    deductFromSecurity ? 'DEDUCTED' : 'TRANSFERRED',
    deductFromSecurity
  );

  if (!deductFromSecurity) {
    db.db.prepare(`
      INSERT INTO student_fees (student_id, fee_type, fee_month, fee_amount, final_amount, fee_status, fee_date, due_date, fee_period_start, fee_period_end)
      VALUES (?, 'Money Given', date('now', 'start of month'), ?, ?, 'DUE', date('now'), date('now', '+5 days'), date('now'), date('now'))
    `).run(student_id, amount, amount);
  }

  return {
    record_id: result.lastInsertRowid,
    student_id,
    amount,
    note,
    given_by,
    deducted_from_security: deductFromSecurity,
    status: deductFromSecurity ? 'DEDUCTED' : 'TRANSFERRED'
  };
};

// ============================================
// GET HISTORY
// ============================================
exports.getHistory = (params = {}) => {
  const { search = '' } = params;

  const unionQuery = `
    SELECT 
      'Fine' as type,
      pf.id as id,
      pf.student_id,
      s.student_name,
      pf.amount,
      pf.note as description,
      pf.fine_type,
      pf.status,
      pf.created_at,
      pf.applied_to_fee_id,
      pf.deducted_from_security
    FROM pending_fines pf
    JOIN students s ON s.student_id = pf.student_id
    WHERE s.date_of_leaving IS NULL AND s.status = 'active'
    
    UNION ALL
    
    SELECT 
      'Property Damage' as type,
      pd.id as id,
      pd.student_id,
      s.student_name,
      pd.amount,
      pd.note as description,
      pd.damage_type as fine_type,
      pd.status,
      pd.created_at,
      pd.applied_to_fee_id,
      pd.deducted_from_security
    FROM property_damage_records pd
    JOIN students s ON s.student_id = pd.student_id
    WHERE s.date_of_leaving IS NULL AND s.status = 'active'
    
    UNION ALL
    
    SELECT 
      'Money Given' as type,
      mg.id as id,
      mg.student_id,
      s.student_name,
      mg.amount,
      mg.note as description,
      mg.given_by as fine_type,
      mg.status,
      mg.created_at,
      mg.applied_to_fee_id,
      mg.deducted_from_security
    FROM money_given_records mg
    JOIN students s ON s.student_id = mg.student_id
    WHERE s.date_of_leaving IS NULL AND s.status = 'active'
  `;

  const sqlParams = [];
  let sql;

  if (search && search.trim()) {
    // With search filter
    const searchPattern = `%${search.trim()}%`;
    sql = `SELECT * FROM (${unionQuery}) AS history 
           WHERE student_name LIKE ? OR student_id LIKE ? 
           ORDER BY created_at DESC LIMIT 100`;
    sqlParams.push(searchPattern, searchPattern);
  } else {
    // No search — still must wrap UNION in subquery for ORDER BY to work
    sql = `SELECT * FROM (${unionQuery}) AS history 
           ORDER BY created_at DESC LIMIT 100`;
  }

  const records = db.db.prepare(sql).all(...sqlParams);

  return records;
};

// ============================================
// COLLECT FINE (receive payment for a pending fine)
// ============================================
exports.collectFine = ({ record_type, record_id, payment_mode = 'CASH', reference_no = null, note = null }) => {
  const type = String(record_type || '').toLowerCase();
  let tableName, columnId;

  if (type === 'fine' || type === 'pending_fines') {
    tableName = 'pending_fines';
    columnId = 'id';
  } else if (type === 'property damage' || type === 'property_damage' || type === 'damage') {
    tableName = 'property_damage_records';
    columnId = 'id';
  } else {
    throw new Error(`Cannot collect record of type "${record_type}"`);
  }

  const record = db.db.prepare(`SELECT * FROM ${tableName} WHERE ${columnId} = ?`).get(record_id);
  if (!record) throw new Error('Fine record not found');
  if (record.status === 'COLLECTED') throw new Error('This fine has already been collected');
  if (record.deducted_from_security) throw new Error('This fine was already deducted from security');

  const amount = toNum(record.amount);
  if (amount <= 0) throw new Error('Invalid fine amount');

  const today = new Date().toISOString().split('T')[0];

  // Mark this record as COLLECTED
  db.db.prepare(`
    UPDATE ${tableName}
       SET status = 'COLLECTED'
     WHERE ${columnId} = ?
  `).run(record_id);

  // Determine the target fee row (existing linked fee OR new Fine row we just insert)
  let targetFeeId = record.applied_to_fee_id;

  if (targetFeeId) {
    try {
      db.db.prepare(`
        UPDATE student_fees
           SET paid_amount = COALESCE(paid_amount, 0) + ?,
               fee_status = 'PAID',
               payment_date = ?,
               payment_mode = ?,
               reference_no = COALESCE(?, reference_no)
         WHERE fee_id = ?
      `).run(amount, today, payment_mode, reference_no, targetFeeId);
    } catch (e) {
      console.warn('Could not update linked student_fees entry:', e.message);
    }
  } else {
    try {
      const insertRes = db.db.prepare(`
        INSERT INTO student_fees
          (student_id, fee_type, fee_month, fee_amount, final_amount, paid_amount,
           fee_status, fee_date, due_date, payment_date, payment_mode, reference_no,
           fee_period_start, fee_period_end)
        VALUES (?, ?, date('now','start of month'), ?, ?, ?, 'PAID',
                date('now'), date('now'), ?, ?, ?, date('now'), date('now'))
      `).run(
        record.student_id,
        tableName === 'pending_fines' ? 'Fine' : 'Property Damage',
        amount, amount, amount, today, payment_mode, reference_no
      );
      targetFeeId = insertRes.lastInsertRowid;

      // Link the fine record back to the created fee row for later reference.
      try {
        db.db.prepare(`UPDATE ${tableName} SET applied_to_fee_id = ? WHERE ${columnId} = ?`)
          .run(targetFeeId, record_id);
      } catch (_) { /* column may not exist on all tables; not fatal */ }
    } catch (e) {
      console.warn('Could not insert Fine fee entry:', e.message);
    }
  }

  // Also insert a payment row so the receipt/history shows the payment.
  if (targetFeeId) {
    try {
      db.db.prepare(`
        INSERT INTO fee_payments
          (student_id, fee_id, payment_amount, payment_date, payment_mode, reference_no, received_by)
        VALUES (?, ?, ?, ?, ?, ?, 'Admin')
      `).run(record.student_id, targetFeeId, amount, today, payment_mode, reference_no);
    } catch (e) {
      console.warn('Could not insert fee_payments row:', e.message);
    }
  }

  // Add ledger income entry
  try {
    const ledgerService = require('./ledger.service');
    const student = db.db.prepare('SELECT student_name, father_name FROM students WHERE student_id = ?').get(record.student_id);
    const studentLabel = student ? `${student.student_name}${student.father_name ? ` D/O ${student.father_name}` : ''}` : `Student #${record.student_id}`;
    const categoryLabel = tableName === 'pending_fines' ? 'Fine' : 'Property Damage';
    const description = `${categoryLabel} collected - ${studentLabel}${note ? ` (${note})` : ''}`;

    ledgerService.addManualEntry({
      entry_date: today,
      entry_type: 'income',
      category: categoryLabel,
      amount,
      payment_mode: (payment_mode || 'cash').toLowerCase(),
      reference_no,
      description,
      student_id: record.student_id
    });
  } catch (e) {
    console.warn('Ledger entry for fine collection failed:', e.message);
  }

  return {
    record_id,
    record_type: tableName,
    amount,
    payment_mode,
    reference_no,
    status: 'COLLECTED',
    student_id: record.student_id
  };
};

module.exports = exports;