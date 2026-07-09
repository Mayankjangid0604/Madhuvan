const { query } = require("../config/db.sqlite");

/**
 * Audit Logging Middleware
 * 
 * Logs admin actions to the audit_logs table.
 * Use on routes where you want to track changes.
 * 
 * Usage:
 *   router.post("/students", authMiddleware, auditMiddleware("CREATE", "students"), controller.create);
 *   router.put("/students/:id", authMiddleware, auditMiddleware("UPDATE", "students"), controller.update);
 *   router.delete("/students/:id", authMiddleware, auditMiddleware("DELETE", "students"), controller.delete);
 */

/**
 * Creates audit middleware for a specific action
 * @param {string} action - Action type: CREATE, UPDATE, DELETE, LOGIN, etc.
 * @param {string} tableName - Table being affected
 * @returns {Function} Express middleware
 */
const auditMiddleware = (action, tableName) => {
  return (req, res, next) => {
    // Capture the original json method to intercept response
    const originalJson = res.json.bind(res);

    res.json = (data) => {
      // Only log on successful operations
      if (res.statusCode >= 200 && res.statusCode < 300) {
        try {
          const adminId = req.admin?.id || null;
          const recordId = req.params?.id || req.params?.studentId || data?.data?.id || data?.insertId || null;
          const ipAddress = req.ip || req.connection?.remoteAddress || 'unknown';
          const userAgent = req.headers['user-agent'] || 'unknown';

          // Determine old/new values based on action
          let oldValue = null;
          let newValue = null;

          if (action === 'CREATE') {
            newValue = JSON.stringify(req.body || {});
          } else if (action === 'UPDATE') {
            // old_value should be set by the controller if needed (via req.auditOldValue)
            oldValue = req.auditOldValue ? JSON.stringify(req.auditOldValue) : null;
            newValue = JSON.stringify(req.body || {});
          } else if (action === 'DELETE') {
            oldValue = req.auditOldValue ? JSON.stringify(req.auditOldValue) : null;
          }

          // Truncate large values to prevent DB bloat
          if (oldValue && oldValue.length > 5000) oldValue = oldValue.substring(0, 5000) + '...';
          if (newValue && newValue.length > 5000) newValue = newValue.substring(0, 5000) + '...';

          query(
            `INSERT INTO audit_logs (admin_id, action, table_name, record_id, old_value, new_value, ip_address, user_agent)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [adminId, action, tableName, recordId, oldValue, newValue, ipAddress, userAgent]
          );
        } catch (err) {
          // Never let audit logging break the actual request
          console.warn('⚠️ Audit log failed:', err.message);
        }
      }

      return originalJson(data);
    };

    next();
  };
};

/**
 * Direct audit log function (for use in services/controllers)
 * @param {object} params - Audit log parameters
 */
const logAuditEntry = ({ adminId, action, tableName, recordId, oldValue, newValue, ipAddress, userAgent }) => {
  try {
    query(
      `INSERT INTO audit_logs (admin_id, action, table_name, record_id, old_value, new_value, ip_address, user_agent)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        adminId || null,
        action,
        tableName || null,
        recordId || null,
        oldValue ? JSON.stringify(oldValue) : null,
        newValue ? JSON.stringify(newValue) : null,
        ipAddress || 'system',
        userAgent || 'system'
      ]
    );
  } catch (err) {
    console.warn('⚠️ Audit log failed:', err.message);
  }
};

module.exports = auditMiddleware;
module.exports.logAuditEntry = logAuditEntry;