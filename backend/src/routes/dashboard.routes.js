const express = require("express");
const router = express.Router();
const dashboardController = require("../controllers/dashboard.controller");
const auth = require("../middlewares/auth.middleware");

// ✅ Apply authentication to all routes
router.use(auth);

/**
 * @swagger
 * tags:
 *   name: Dashboard
 *   description: Admin dashboard summaries
 */

/**
 * @swagger
 * /api/dashboard/summary:
 *   get:
 *     summary: Get dashboard summary
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard data
 */
router.get("/summary", dashboardController.getDashboardSummary);

/**
 * @swagger
 * /api/dashboard/monthly-collection:
 *   get:
 *     summary: Get monthly collection data
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 */
router.get("/monthly-collection", dashboardController.getMonthlyCollection);

/**
 * @swagger
 * /api/dashboard/recent-admissions:
 *   get:
 *     summary: Get recent admissions
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 */
router.get("/recent-admissions", dashboardController.getRecentAdmissions);

/**
 * @swagger
 * /api/dashboard/recent-checkouts:
 *   get:
 *     summary: Get recent checkouts
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 */
router.get("/recent-checkouts", dashboardController.getRecentCheckouts);

/**
 * @swagger
 * /api/dashboard/overdue-alerts:
 *   get:
 *     summary: Get overdue fee alerts
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 */
router.get("/overdue-alerts", dashboardController.getOverdueAlerts);

/**
 * @swagger
 * /api/dashboard/room-occupancy:
 *   get:
 *     summary: Get room occupancy by type
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 */
router.get("/room-occupancy", dashboardController.getRoomOccupancy);

module.exports = router;