const auditService = require("../services/audit.service");

exports.getAuditLogs = (req, res) => {
  try {
    const logs = auditService.getAuditLogs();
    res.json({ success: true, data: logs });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = exports;
