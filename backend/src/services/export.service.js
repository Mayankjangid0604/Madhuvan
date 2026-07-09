const db = require("../config/db.sqlite");
const XLSX = require("xlsx");

// CSV Helper
function arrayToCSV(data) {
  if (!data || data.length === 0) return "";
  
  const headers = Object.keys(data[0]);
  const rows = data.map(row => 
    headers.map(header => {
      const val = row[header];
      // Escape quotes and wrap in quotes if contains comma
      if (val === null || val === undefined) return '';
      const str = String(val);
      return str.includes(',') || str.includes('"') 
        ? `"${str.replace(/"/g, '""')}"` 
        : str;
    }).join(',')
  );
  
  return [headers.join(','), ...rows].join('\n');
}

// 🔥 LEDGER REPORTS (FIXED FOR SQLITE)
exports.getLedgerCSV = async (filters = {}) => {
  let query = `
    SELECT 
      date(le.entry_date) as 'Date',
      le.description as 'Description',
      'Pay' as 'Payment Method',
      CASE WHEN le.entry_type = 'income' THEN le.amount ELSE '' END as 'Credit',
      CASE WHEN le.entry_type = 'expense' THEN le.amount ELSE '' END as 'Debit',
      '' as 'Balance'
    FROM ledger_entries le
    WHERE 1=1
  `;

  const params = [];
  if (filters.from_date) {
    query += ` AND le.entry_date >= ?`;
    params.push(filters.from_date);
  }
  if (filters.to_date) {
    query += ` AND le.entry_date <= ?`;
    params.push(filters.to_date);
  }
  query += ` ORDER BY le.entry_date ASC, le.entry_id ASC`;

  const [rows] = await db.query(query, params);

  // Calculate running balance
  let balance = 0;
  rows.forEach(row => {
    const credit = parseFloat(row['Credit']) || 0;
    const debit = parseFloat(row['Debit']) || 0;
    balance += credit - debit;
    row['Balance'] = balance;
  });

  return arrayToCSV(rows);
};

exports.getLedgerExcel = async (filters = {}) => {
  const columnMap = {
    'entry_id': 'le.entry_id',
    'entry_date': 'le.entry_date',
    'entry_type': 'le.entry_type',
    'category': 'le.category',
    'amount': 'le.amount',
    'payment_mode': 'le.payment_mode',
    'reference_no': 'le.reference_no',
    'student_name': 's.student_name',
    'description': 'le.description'
  };

  // If columns are specified, use them; otherwise use all
  let selectColumns = '*';
  if (filters.columns && Array.isArray(filters.columns) && filters.columns.length > 0) {
    selectColumns = filters.columns
      .filter(col => columnMap[col])
      .map(col => `${columnMap[col]} as ${col}`)
      .join(', ');
  } else {
    selectColumns = Object.entries(columnMap)
      .map(([alias, col]) => `${col} as ${alias}`)
      .join(', ');
  }

  let query = `
    SELECT ${selectColumns}
    FROM ledger_entries le
    LEFT JOIN students s ON le.student_id = s.student_id
    WHERE 1=1
  `;
  
  const params = [];
  
  if (filters.from_date) {
    query += ` AND le.entry_date >= ?`;
    params.push(filters.from_date);
  }
  
  if (filters.to_date) {
    query += ` AND le.entry_date <= ?`;
    params.push(filters.to_date);
  }
  
  if (filters.entry_type) {
    query += ` AND le.entry_type = ?`;
    params.push(filters.entry_type);
  }
  
  query += ` ORDER BY le.entry_date ASC, le.entry_id ASC`;
  
  const [rows] = await db.query(query, params);
  
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Ledger");
  
  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
};

// 🔥 FEE REPORTS (FIXED FOR SQLITE)
exports.getFeesCSV = async (filters = {}) => {
  let query = `
    SELECT 
      s.student_id as 'Student ID',
      s.student_name as 'Student Name',
      s.father_name as 'Father Name',
      s.father_mobile as 'Contact',
      sf.fee_type as 'Fee Type',
      sf.fee_amount as 'Fee Amount',
      sf.discount_amount as 'Discount',
      sf.final_amount as 'Final Amount',
      sf.paid_amount as 'Paid Amount',
      (sf.final_amount - sf.paid_amount) as 'Balance',
      sf.fee_status as 'Status',
      date(sf.fee_date) as 'Fee Date',
      date(sf.due_date) as 'Due Date'
    FROM student_fees sf
    JOIN students s ON sf.student_id = s.student_id
    WHERE 1=1
  `;
  
  const params = [];
  
  if (filters.from_date) {
    query += ` AND sf.fee_date >= ?`;
    params.push(filters.from_date);
  }
  
  if (filters.to_date) {
    query += ` AND sf.fee_date <= ?`;
    params.push(filters.to_date);
  }
  
  if (filters.fee_status) {
    query += ` AND sf.fee_status = ?`;
    params.push(filters.fee_status);
  }
  
  query += ` ORDER BY sf.fee_date DESC, s.student_name`;
  
  const [rows] = await db.query(query, params);
  return arrayToCSV(rows);
};

exports.getFeesExcel = async (filters = {}) => {
  const columnMap = {
    'student_id': 's.student_id',
    'student_name': 's.student_name',
    'father_name': 's.father_name',
    'father_mobile': 's.father_mobile',
    'fee_type': 'sf.fee_type',
    'fee_amount': 'sf.fee_amount',
    'discount_amount': 'sf.discount_amount',
    'final_amount': 'sf.final_amount',
    'paid_amount': 'sf.paid_amount',
    'balance': '(sf.final_amount - sf.paid_amount)',
    'fee_status': 'sf.fee_status',
    'fee_date': 'sf.fee_date',
    'due_date': 'sf.due_date'
  };

  let selectColumns = '*';
  if (filters.columns && Array.isArray(filters.columns) && filters.columns.length > 0) {
    selectColumns = filters.columns
      .filter(col => columnMap[col])
      .map(col => `${columnMap[col]} as ${col}`)
      .join(', ');
  } else {
    selectColumns = Object.entries(columnMap)
      .map(([alias, col]) => `${col} as ${alias}`)
      .join(', ');
  }

  let query = `
    SELECT ${selectColumns}
    FROM student_fees sf
    JOIN students s ON sf.student_id = s.student_id
    WHERE 1=1
  `;
  
  const params = [];
  
  if (filters.from_date) {
    query += ` AND sf.fee_date >= ?`;
    params.push(filters.from_date);
  }
  
  if (filters.to_date) {
    query += ` AND sf.fee_date <= ?`;
    params.push(filters.to_date);
  }
  
  if (filters.fee_status) {
    query += ` AND sf.fee_status = ?`;
    params.push(filters.fee_status);
  }
  
  query += ` ORDER BY sf.fee_date DESC`;
  
  const [rows] = await db.query(query, params);
  
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Fees");
  
  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
};

// 🔥 STUDENT REPORTS (FIXED FOR SQLITE)
exports.getStudentsCSV = async (filters = {}) => {
  let query = `
    SELECT 
      s.student_id as 'Student ID',
      s.student_name as 'Name',
      date(s.date_of_birth) as 'DOB',
      s.student_mobile as 'Mobile',
      s.class_or_coaching as 'Class',
      s.institute_name as 'Institute',
      s.father_name as 'Father Name',
      s.father_mobile as 'Father Mobile',
      s.mother_name as 'Mother Name',
      s.mother_mobile as 'Mother Mobile',
      s.address_line1 as 'Address',
      date(s.date_of_joining) as 'Joining Date',
      date(s.date_of_leaving) as 'Leaving Date',
      r.room_no as 'Room',
      b.bed_no as 'Bed'
    FROM students s
    LEFT JOIN room_allocation ra ON s.student_id = ra.student_id AND ra.allocation_status = 'active'
    LEFT JOIN rooms r ON ra.room_id = r.room_id
    LEFT JOIN beds b ON ra.bed_id = b.bed_id
    WHERE 1=1
  `;
  
  const params = [];
  
  if (filters.active_only) {
    query += ` AND s.date_of_leaving IS NULL`;
  }
  
  if (filters.from_date) {
    query += ` AND s.date_of_joining >= ?`;
    params.push(filters.from_date);
  }
  
  query += ` ORDER BY s.student_name`;
  
  const [rows] = await db.query(query, params);
  return arrayToCSV(rows);
};

exports.getStudentsExcel = async (filters = {}) => {
  const columnMap = {
    'student_id': 's.student_id',
    'student_name': 's.student_name',
    'date_of_birth': 's.date_of_birth',
    'student_mobile': 's.student_mobile',
    'class_or_coaching': 's.class_or_coaching',
    'institute_name': 's.institute_name',
    'father_name': 's.father_name',
    'father_mobile': 's.father_mobile',
    'mother_name': 's.mother_name',
    'mother_mobile': 's.mother_mobile',
    'address_line1': 's.address_line1',
    'date_of_joining': 's.date_of_joining',
    'date_of_leaving': 's.date_of_leaving',
    'room_no': 'r.room_no',
    'bed_no': 'b.bed_no'
  };

  let selectColumns = '*';
  if (filters.columns && Array.isArray(filters.columns) && filters.columns.length > 0) {
    selectColumns = filters.columns
      .filter(col => columnMap[col])
      .map(col => `${columnMap[col]} as ${col}`)
      .join(', ');
  } else {
    selectColumns = Object.entries(columnMap)
      .map(([alias, col]) => `${col} as ${alias}`)
      .join(', ');
  }

  let query = `
    SELECT ${selectColumns}
    FROM students s
    LEFT JOIN room_allocation ra ON s.student_id = ra.student_id AND ra.allocation_status = 'active'
    LEFT JOIN rooms r ON ra.room_id = r.room_id
    LEFT JOIN beds b ON ra.bed_id = b.bed_id
    WHERE 1=1
  `;
  
  const params = [];
  
  if (filters.active_only) {
    query += ` AND s.date_of_leaving IS NULL`;
  }
  
  query += ` ORDER BY s.student_name`;
  
  const [rows] = await db.query(query, params);
  
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Students");
  
  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
};

// 🔥 OCCUPANCY REPORTS (FIXED FOR SQLITE)
exports.getOccupancyCSV = async () => {
  const query = `
    SELECT 
      r.room_no as 'Room No',
      r.floor_no as 'Floor',
      r.room_type as 'Type',
      b.bed_no as 'Bed No',
      b.bed_status as 'Status',
      s.student_name as 'Student',
      s.student_mobile as 'Mobile',
      date(ra.allocation_start_date) as 'From Date'
    FROM rooms r
    JOIN beds b ON r.room_id = b.room_id
    LEFT JOIN room_allocation ra ON b.bed_id = ra.bed_id AND ra.allocation_status = 'active'
    LEFT JOIN students s ON ra.student_id = s.student_id
    ORDER BY r.room_no, b.bed_no
  `;
  
  const [rows] = await db.query(query);
  return arrayToCSV(rows);
};

exports.getOccupancyExcel = async (filters = {}) => {
  const columnMap = {
    'room_no': 'r.room_no',
    'floor_no': 'r.floor_no',
    'room_type': 'r.room_type',
    'bed_no': 'b.bed_no',
    'bed_status': 'b.bed_status',
    'student_name': 's.student_name',
    'student_mobile': 's.student_mobile',
    'allocation_start_date': 'ra.allocation_start_date'
  };

  let selectColumns = '*';
  if (filters.columns && Array.isArray(filters.columns) && filters.columns.length > 0) {
    selectColumns = filters.columns
      .filter(col => columnMap[col])
      .map(col => `${columnMap[col]} as ${col}`)
      .join(', ');
  } else {
    selectColumns = Object.entries(columnMap)
      .map(([alias, col]) => `${col} as ${alias}`)
      .join(', ');
  }

  const query = `
    SELECT ${selectColumns}
    FROM rooms r
    JOIN beds b ON r.room_id = b.room_id
    LEFT JOIN room_allocation ra ON b.bed_id = ra.bed_id AND ra.allocation_status = 'active'
    LEFT JOIN students s ON ra.student_id = s.student_id
    ORDER BY r.room_no, b.bed_no
  `;
  
  const [rows] = await db.query(query);
  
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Occupancy");
  
  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
};

// CUSTOM REPORT
exports.getCustomReport = async (config) => {
  const { table, columns, filters, format } = config;
  
  let query = `SELECT ${columns.join(', ')} FROM ${table} WHERE 1=1`;
  const params = [];
  
  if (filters) {
    Object.entries(filters).forEach(([key, value]) => {
      query += ` AND ${key} = ?`;
      params.push(value);
    });
  }
  
  const [rows] = await db.query(query, params);
  
  if (format === 'csv') {
    return arrayToCSV(rows);
  } else {
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Report");
    return XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  }
};

// 🔥 GST REPORT — only for ONLINE-mode payments.
// Rule: Mess portion (₹5,000/mo) always attracts 2.5% CGST + 2.5% SGST.
// Accommodation portion is GST-exempt UNLESS the student is exiting < 90 days —
// that case is handled at final-invoice time, not in this recurring report.
exports.getGstReport = async ({ from_date, to_date } = {}) => {
  // Build SQL to get all payments for students whose admission payment_mode = 'online'
  // We use LOWER() for case-insensitive match on student.payment_mode.
  let sql = `
    SELECT
      fp.payment_id,
      fp.payment_date,
      fp.payment_amount,
      COALESCE(fp.payment_mode, 'CASH') as tx_mode,
      fp.reference_no,
      s.student_id,
      s.student_name,
      s.father_name,
      s.payment_mode,
      s.date_of_joining,
      sf.fee_type,
      sf.fee_month
    FROM fee_payments fp
    JOIN students s ON s.student_id = fp.student_id
    LEFT JOIN student_fees sf ON sf.fee_id = fp.fee_id
    WHERE LOWER(COALESCE(s.payment_mode, 'cash')) = 'online'
  `;
  const params = [];
  // GST applies only from July 2026 onwards
  const gstStartDate = '2026-07-01';
  const effectiveFrom = from_date && from_date > gstStartDate ? from_date : gstStartDate;
  sql += ' AND fp.payment_date >= ?'; params.push(effectiveFrom);
  if (to_date) { sql += ' AND fp.payment_date <= ?'; params.push(to_date); }
  sql += ' ORDER BY fp.payment_date ASC';

  // Use synchronous better-sqlite3 API (db.db is the raw Database instance)
  let rows;
  try {
    rows = db.db.prepare(sql).all(...params);
  } catch (err) {
    console.error('❌ GST Report SQL error:', err.message);
    throw new Error(`GST Report query failed: ${err.message}`);
  }

  const MESS_BASE = 5000;
  const MESS_CGST = MESS_BASE * 0.025;
  const MESS_SGST = MESS_BASE * 0.025;
  const MESS_TOTAL = MESS_BASE + MESS_CGST + MESS_SGST;

  const entries = [];
  const totals = {
    accommodation_base: 0,
    mess_base: 0, mess_cgst: 0, mess_sgst: 0,
    grand_total: 0
  };

  for (const r of rows) {
    const amt = Number(r.payment_amount) || 0;
    let messBase = 0, messCgst = 0, messSgst = 0;
    let accBase = 0;
    if (amt <= MESS_TOTAL) {
      const b = amt / 1.05;
      messBase = b; messCgst = b * 0.025; messSgst = b * 0.025;
    } else {
      messBase = MESS_BASE; messCgst = MESS_CGST; messSgst = MESS_SGST;
      accBase = amt - MESS_TOTAL;
    }
    entries.push({
      payment_id: r.payment_id,
      payment_date: r.payment_date,
      student_id: r.student_id,
      student_name: r.student_name,
      father_name: r.father_name,
      fee_type: r.fee_type,
      reference_no: r.reference_no,
      accommodation: {
        base: Math.round(accBase * 100) / 100,
        cgst: 0,
        sgst: 0,
        total: Math.round(accBase * 100) / 100
      },
      mess: {
        base: Math.round(messBase * 100) / 100,
        cgst: Math.round(messCgst * 100) / 100,
        sgst: Math.round(messSgst * 100) / 100,
        total: Math.round((messBase + messCgst + messSgst) * 100) / 100
      },
      grand_total: amt
    });
    totals.accommodation_base += accBase;
    totals.mess_base += messBase;
    totals.mess_cgst += messCgst;
    totals.mess_sgst += messSgst;
    totals.grand_total += amt;
  }
  totals.accommodation_cgst = 0;
  totals.accommodation_sgst = 0;
  Object.keys(totals).forEach(k => { totals[k] = Math.round(totals[k] * 100) / 100; });

  return { period: { from: from_date || null, to: to_date || null }, entries, totals };
};


// 🔥 STUDENT LEDGER (FIXED FOR SQLITE)
exports.getStudentLedgerCSV = async (studentId) => {
  const query = `
    SELECT 
      le.entry_id as 'Seq No',
      date(le.entry_date) as 'Date',
      le.entry_type as 'Type',
      le.category as 'Category',
      le.amount as 'Amount',
      le.payment_mode as 'Payment Mode',
      le.reference_no as 'Reference',
      le.description as 'Description'
    FROM ledger_entries le
    WHERE le.student_id = ?
    ORDER BY le.entry_date ASC, le.entry_id ASC
  `;
  
  const [rows] = await db.query(query, [studentId]);
  return arrayToCSV(rows);
};
