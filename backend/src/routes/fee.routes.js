const express = require("express");
const router = express.Router();
const feeController = require("../controllers/fee.controller");
const auth = require("../middlewares/auth.middleware");

// ✅ Apply authentication to all routes
router.use(auth);

/**
 * @swagger
 * tags:
 *   name: Fees
 *   description: Fee management
 */

/**
 * @swagger
 * /api/fees:
 *   get:
 *     summary: Get all fees
 *     tags: [Fees]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: comprehensive
 *         schema:
 *           type: boolean
 *         description: Include comprehensive details
 *       - in: query
 *         name: student_id
 *         schema:
 *           type: integer
 *         description: Filter by student ID
 *       - in: query
 *         name: month
 *         schema:
 *           type: string
 *         description: Filter by month (YYYY-MM)
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [DUE, PAID, OVERDUE, PARTIAL]
 *     responses:
 *       200:
 *         description: List of fees
 */
router.get("/", feeController.getAllFees);
router.post("/pay-all", feeController.payAllFees);

/**
 * @swagger
 * /api/fees/payments:
 *   get:
 *     summary: Get all payments
 *     tags: [Fees]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: student_id
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of payments
 */
router.get("/payments", feeController.getAllPayments);

/**
 * @swagger
 * /api/fees/generate-all:
 *   post:
 *     summary: Generate fees for all students
 *     tags: [Fees]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               month:
 *                 type: string
 *                 description: Month (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: Fees generated
 */
router.post("/generate-all", feeController.generateAllFees);

/**
 * @swagger
 * /api/fees/pay:
 *   post:
 *     summary: Pay fee (smart payment allocation)
 *     tags: [Fees]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - student_id
 *               - payment_amount
 *             properties:
 *               student_id:
 *                 type: integer
 *               payment_amount:
 *                 type: number
 *               payment_mode:
 *                 type: string
 *                 enum: [CASH, UPI, BANK, CHEQUE, ONLINE]
 *               reference_no:
 *                 type: string
 *               received_by:
 *                 type: string
 *               received_member_id:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Payment recorded
 */
router.post("/pay", feeController.payFee);

/**
 * @swagger
 * /api/fees/update-statuses:
 *   post:
 *     summary: Update all fee statuses (DUE/OVERDUE)
 *     tags: [Fees]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Statuses updated
 */
router.post("/update-statuses", feeController.updateAllFeeStatuses);

/**
 * @swagger
 * /api/fees/apply-penalties:
 *   post:
 *     summary: Apply penalties to overdue fees
 *     tags: [Fees]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Penalties applied
 */
router.post("/apply-penalties", feeController.applyPenalties);

/**
 * @swagger
 * /api/fees/student/{studentId}/details:
 *   get:
 *     summary: Get student fee details
 *     tags: [Fees]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: studentId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Fee details
 */
router.get("/student/:studentId/details", feeController.getStudentFeeDetails);

/**
 * @swagger
 * /api/fees/student/{studentId}/summary:
 *   get:
 *     summary: Get student fee summary
 *     tags: [Fees]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: studentId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Fee summary
 */
router.get("/student/:studentId/summary", feeController.getStudentFeeSummary);

/**
 * @swagger
 * /api/fees/invoice/{invoiceNumber}:
 *   get:
 *     summary: Get payment by invoice number
 *     tags: [Fees]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: invoiceNumber
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Payment details
 *       404:
 *         description: Invoice not found
 */
router.get("/invoice/:invoiceNumber", feeController.getPaymentByInvoice);

/**
 * @swagger
 * /api/fees/invoice/{invoiceNumber}/download:
 *   get:
 *     summary: Download invoice PDF
 *     tags: [Fees]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: invoiceNumber
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: PDF file
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 */
router.get("/invoice/:invoiceNumber/download", feeController.downloadInvoice);

/**
 * @swagger
 * /api/fees/{id}:
 *   get:
 *     summary: Get fee by ID
 *     tags: [Fees]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Fee details
 *       404:
 *         description: Fee not found
 */
router.get("/:id", feeController.getFeeById);

/**
 * @swagger
 * /api/fees:
 *   post:
 *     summary: Create monthly fee for student
 *     tags: [Fees]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - student_id
 *             properties:
 *               student_id:
 *                 type: integer
 *               fee_month:
 *                 type: string
 *                 description: Month (YYYY-MM-DD)
 *     responses:
 *       201:
 *         description: Fee created
 */
router.post("/", feeController.createFee);
router.post("/apply-waiver", feeController.applyWaiver);
router.get("/student/:studentId/early-exit", feeController.getEarlyExitInvoice);

module.exports = router;