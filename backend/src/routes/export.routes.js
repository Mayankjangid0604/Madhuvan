const express = require("express");
const router = express.Router();
const exportController = require("../controllers/export.controller");
const auth = require("../middlewares/auth.middleware");

// ✅ FIX: Add authentication middleware to protect all export routes
router.use(auth);

/**
 * @swagger
 * tags:
 *   name: Export
 *   description: CSV & Excel exports
 */

// ============================================
// GET routes (legacy support)
// ============================================

/**
 * @swagger
 * /api/export/ledger/csv:
 *   get:
 *     summary: Export ledger to CSV
 *     tags: [Export]
 *     security:
 *       - bearerAuth: []
 */
router.get("/ledger/csv", exportController.exportLedgerCSV);

/**
 * @swagger
 * /api/export/ledger/excel:
 *   get:
 *     summary: Export ledger to Excel
 *     tags: [Export]
 *     security:
 *       - bearerAuth: []
 */
router.get("/ledger/excel", exportController.exportLedgerExcel);

/**
 * @swagger
 * /api/export/fees/csv:
 *   get:
 *     summary: Export fees to CSV
 *     tags: [Export]
 *     security:
 *       - bearerAuth: []
 */
router.get("/fees/csv", exportController.exportFeesCSV);

/**
 * @swagger
 * /api/export/fees/excel:
 *   get:
 *     summary: Export fees to Excel
 *     tags: [Export]
 *     security:
 *       - bearerAuth: []
 */
router.get("/fees/excel", exportController.exportFeesExcel);

/**
 * @swagger
 * /api/export/students/csv:
 *   get:
 *     summary: Export students to CSV
 *     tags: [Export]
 *     security:
 *       - bearerAuth: []
 */
router.get("/students/csv", exportController.exportStudentsCSV);

/**
 * @swagger
 * /api/export/students/excel:
 *   get:
 *     summary: Export students to Excel
 *     tags: [Export]
 *     security:
 *       - bearerAuth: []
 */
router.get("/students/excel", exportController.exportStudentsExcel);

/**
 * @swagger
 * /api/export/occupancy/csv:
 *   get:
 *     summary: Export occupancy to CSV
 *     tags: [Export]
 *     security:
 *       - bearerAuth: []
 */
router.get("/occupancy/csv", exportController.exportOccupancyCSV);

/**
 * @swagger
 * /api/export/occupancy/excel:
 *   get:
 *     summary: Export occupancy to Excel
 *     tags: [Export]
 *     security:
 *       - bearerAuth: []
 */
router.get("/occupancy/excel", exportController.exportOccupancyExcel);

/**
 * @swagger
 * /api/export/student/{studentId}/ledger/csv:
 *   get:
 *     summary: Export student ledger to CSV
 *     tags: [Export]
 *     security:
 *       - bearerAuth: []
 */
router.get("/student/:studentId/ledger/csv", exportController.exportStudentLedgerCSV);

// ============================================
// POST routes (with column selection and filters)
// ============================================

/**
 * @swagger
 * /api/export/ledger/excel:
 *   post:
 *     summary: Export ledger to Excel with custom columns
 *     tags: [Export]
 *     security:
 *       - bearerAuth: []
 */
router.post("/ledger/excel", exportController.exportLedgerExcel);

/**
 * @swagger
 * /api/export/fees/excel:
 *   post:
 *     summary: Export fees to Excel with custom columns
 *     tags: [Export]
 *     security:
 *       - bearerAuth: []
 */
router.post("/fees/excel", exportController.exportFeesExcel);

/**
 * @swagger
 * /api/export/students/excel:
 *   post:
 *     summary: Export students to Excel with custom columns
 *     tags: [Export]
 *     security:
 *       - bearerAuth: []
 */
router.post("/students/excel", exportController.exportStudentsExcel);

/**
 * @swagger
 * /api/export/occupancy/excel:
 *   post:
 *     summary: Export occupancy to Excel with custom columns
 *     tags: [Export]
 *     security:
 *       - bearerAuth: []
 */
router.post("/occupancy/excel", exportController.exportOccupancyExcel);

/**
 * @swagger
 * /api/export/custom:
 *   post:
 *     summary: Generate custom report
 *     tags: [Export]
 *     security:
 *       - bearerAuth: []
 */
router.post("/custom", exportController.exportCustomReport);

/**
 * @swagger
 * /api/export/gst-report:
 *   get:
 *     summary: GST-ready summary of online-payment fee collections
 *     tags: [Export]
 *     security:
 *       - bearerAuth: []
 */
router.get("/gst-report", exportController.exportGstReport);

module.exports = router;