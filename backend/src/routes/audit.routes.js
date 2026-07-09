const express = require("express");
const router = express.Router();
const auditController = require("../controllers/audit.controller");
const auth = require("../middlewares/auth.middleware");

// ✅ Apply authentication to all routes
router.use(auth);

/**
 * @swagger
 * tags:
 *   name: Audit
 *   description: Admin audit logs
 */

/**
 * @swagger
 * /api/audit:
 *   get:
 *     summary: Get audit logs
 *     tags: [Audit]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Audit log list
 */
router.get("/", auditController.getAuditLogs);

module.exports = router;
