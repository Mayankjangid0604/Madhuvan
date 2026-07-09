const { query } = require("../config/db.sqlite");

exports.getDashboardSummary = () => {
  try {
    const [students] = query(
      `SELECT COUNT(*) AS total FROM students WHERE date_of_leaving IS NULL`
    );

    const [activeStudents] = query(
      `SELECT COUNT(DISTINCT student_id) AS active
       FROM room_allocation
       WHERE allocation_status = 'active'`
    );

    const [beds] = query(
      `SELECT
         COUNT(*) AS total,
         SUM(CASE WHEN bed_status = 'available' THEN 1 ELSE 0 END) AS available,
         SUM(CASE WHEN bed_status = 'occupied' THEN 1 ELSE 0 END) AS occupied
       FROM beds`
    );

    const [fees] = query(
      `SELECT
         COALESCE(SUM(CASE WHEN fee_status IN ('DUE', 'OVERDUE') THEN final_amount - paid_amount ELSE 0 END), 0) AS total_due,
         COALESCE(SUM(CASE WHEN fee_status = 'OVERDUE' THEN 1 ELSE 0 END), 0) AS overdue_count
       FROM student_fees`
    );

    const [rooms] = query(
      `SELECT COUNT(*) AS total FROM rooms`
    );

    return {
      total_students: students[0]?.total || 0,
      active_students: activeStudents[0]?.active || 0,
      total_rooms: rooms[0]?.total || 0,
      occupied_beds: beds[0]?.occupied || 0,
      total_due: parseFloat(fees[0]?.total_due || 0),
      overdue_count: parseInt(fees[0]?.overdue_count || 0)
    };
  } catch (error) {
    console.error('getDashboardSummary Error:', error.message);
    return {
      total_students: 0,
      active_students: 0,
      total_rooms: 0,
      occupied_beds: 0,
      total_due: 0,
      overdue_count: 0
    };
  }
};

exports.getMonthlyCollection = () => {
  try {
    const [rows] = query(
      `SELECT 
         CAST(strftime('%m', payment_date) AS INTEGER) as month,
         CAST(strftime('%Y', payment_date) AS INTEGER) as year,
         SUM(payment_amount) as total
       FROM fee_payments
       WHERE strftime('%Y', payment_date) = strftime('%Y', 'now')
       GROUP BY strftime('%Y', payment_date), strftime('%m', payment_date)
       ORDER BY month`
    );
    
    const monthlyData = Array(12).fill(0);
    rows.forEach(row => {
      if (row.month >= 1 && row.month <= 12) {
        monthlyData[row.month - 1] = parseFloat(row.total || 0);
      }
    });
    
    return monthlyData;
  } catch (error) {
    console.error('getMonthlyCollection Error:', error.message);
    return Array(12).fill(0);
  }
};

exports.getRecentAdmissions = (limit = 5) => {
  try {
    const [rows] = query(
      `SELECT 
         s.student_id,
         s.student_name,
         s.date_of_joining,
         r.room_no,
         b.bed_no
       FROM students s
       LEFT JOIN room_allocation ra ON s.student_id = ra.student_id AND ra.allocation_status = 'active'
       LEFT JOIN rooms r ON ra.room_id = r.room_id
       LEFT JOIN beds b ON ra.bed_id = b.bed_id
       WHERE s.date_of_leaving IS NULL
       ORDER BY s.date_of_joining DESC
       LIMIT ?`,
      [limit]
    );
    
    return rows;
  } catch (error) {
    console.error('getRecentAdmissions Error:', error.message);
    return [];
  }
};

exports.getRecentCheckouts = (limit = 5) => {
  try {
    const [rows] = query(
      `SELECT 
         student_id,
         student_name,
         date_of_leaving,
         date_of_joining
       FROM students
       WHERE date_of_leaving IS NOT NULL
       ORDER BY date_of_leaving DESC
       LIMIT ?`,
      [limit]
    );
    
    return rows;
  } catch (error) {
    console.error('getRecentCheckouts Error:', error.message);
    return [];
  }
};

exports.getOverdueAlerts = () => {
  try {
    const [rows] = query(
      `SELECT 
         s.student_id,
         s.student_name,
         s.father_mobile,
         sf.fee_id,
         sf.final_amount,
         sf.paid_amount,
         (sf.final_amount - sf.paid_amount) as remaining,
         sf.due_date,
         CAST((julianday('now') - julianday(sf.due_date)) AS INTEGER) as days_overdue
       FROM student_fees sf
       JOIN students s ON sf.student_id = s.student_id
       WHERE sf.fee_status = 'OVERDUE'
       AND s.date_of_leaving IS NULL
       ORDER BY days_overdue DESC
       LIMIT 10`
    );
    
    return rows;
  } catch (error) {
    console.error('getOverdueAlerts Error:', error.message);
    return [];
  }
};

exports.getRoomOccupancyByType = () => {
  try {
    const [rows] = query(
      `SELECT 
         r.room_type,
         COUNT(DISTINCT r.room_id) as total_rooms,
         SUM(CASE WHEN b.bed_status = 'occupied' THEN 1 ELSE 0 END) as occupied_beds,
         COUNT(b.bed_id) as total_beds
       FROM rooms r
       LEFT JOIN beds b ON r.room_id = b.room_id
       GROUP BY r.room_type
       ORDER BY r.room_type`
    );
    
    return rows;
  } catch (error) {
    console.error('getRoomOccupancyByType Error:', error.message);
    return [];
  }
};

module.exports = exports;
