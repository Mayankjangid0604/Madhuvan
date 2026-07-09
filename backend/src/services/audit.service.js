const { query } = require("../config/db.sqlite");

exports.getAuditLogs = () => {
  // ✅ FIX: Destructure [rows] if query() returns [rows, fields]
  const [rows] = query(
    `SELECT al.*, a.email AS admin_email
     FROM audit_logs al
     LEFT JOIN admins a ON a.id = al.admin_id
     ORDER BY al.created_at DESC
     LIMIT 500`
  );
  
  // ✅ Return rows array, not nested array
  return rows || [];
};

module.exports = exports;