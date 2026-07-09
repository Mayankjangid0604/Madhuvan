const express = require("express");
const router = express.Router();
const memberController = require("../controllers/member.controller");
const { uploadMemberPhoto } = require("../middlewares/upload.middleware");
const auth = require("../middlewares/auth.middleware");

// Apply authentication to all routes
router.use(auth);

/**
 * @swagger
 * tags:
 *   name: Members
 *   description: Staff member management
 */

/**
 * @swagger
 * /api/members:
 *   get:
 *     summary: Get all active members
 *     tags: [Members]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of members
 */
router.get("/", memberController.getAllMembers);

/**
 * @swagger
 * /api/members/active/list:
 *   get:
 *     summary: Get active members for dropdown
 *     tags: [Members]
 *     security:
 *       - bearerAuth: []
 */
router.get("/active/list", memberController.getActiveMembers);

/**
 * @swagger
 * /api/members/salary/all:
 *   get:
 *     summary: Get all salary payments
 *     tags: [Members]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: month
 *         schema:
 *           type: string
 *       - in: query
 *         name: year
 *         schema:
 *           type: integer
 *       - in: query
 *         name: member_id
 *         schema:
 *           type: integer
 */
router.get("/salary/all", memberController.getAllSalaryPayments);

/**
 * @swagger
 * /api/members:
 *   post:
 *     summary: Create new member
 *     tags: [Members]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               mobile:
 *                 type: string
 *               salary:
 *                 type: number
 */
router.post("/", memberController.createMember);

/**
 * @swagger
 * /api/members/{id}:
 *   get:
 *     summary: Get member by ID
 *     tags: [Members]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 */
router.get("/:id", memberController.getMemberById);

/**
 * @swagger
 * /api/members/{id}:
 *   put:
 *     summary: Update member
 *     tags: [Members]
 *     security:
 *       - bearerAuth: []
 */
router.put("/:id", memberController.updateMember);

/**
 * @swagger
 * /api/members/{id}/photo:
 *   post:
 *     summary: Upload member photo
 *     tags: [Members]
 *     security:
 *       - bearerAuth: []
 */
router.post("/:id/photo", uploadMemberPhoto.single("photo"), memberController.uploadPhoto);

/**
 * @swagger
 * /api/members/{id}:
 *   delete:
 *     summary: Delete (deactivate) member
 *     tags: [Members]
 *     security:
 *       - bearerAuth: []
 */
router.delete("/:id", memberController.deleteMember);

/**
 * @swagger
 * /api/members/{id}/transactions:
 *   get:
 *     summary: Get member transaction history
 *     tags: [Members]
 *     security:
 *       - bearerAuth: []
 */
router.get("/:id/transactions", memberController.getMemberTransactions);

/**
 * @swagger
 * /api/members/{id}/summary:
 *   get:
 *     summary: Get member summary
 *     tags: [Members]
 *     security:
 *       - bearerAuth: []
 */
router.get("/:id/summary", memberController.getMemberSummary);

/**
 * @swagger
 * /api/members/{id}/salary:
 *   post:
 *     summary: Pay salary to member
 *     tags: [Members]
 *     security:
 *       - bearerAuth: []
 */
router.post("/:id/salary", memberController.paySalary);

/**
 * @swagger
 * /api/members/{id}/salary-history:
 *   get:
 *     summary: Get salary payment history
 *     tags: [Members]
 *     security:
 *       - bearerAuth: []
 */
router.get("/:id/salary-history", memberController.getSalaryHistory);

/**
 * @swagger
 * /api/members/salary-payment/{paymentId}:
 *   get:
 *     summary: Get salary payment details
 *     tags: [Members]
 *     security:
 *       - bearerAuth: []
 */
router.get("/salary-payment/:paymentId", memberController.getSalaryPayment);

/**
 * @swagger
 * /api/members/salary-payment/{paymentId}:
 *   delete:
 *     summary: Delete salary payment
 *     tags: [Members]
 *     security:
 *       - bearerAuth: []
 */
router.delete("/salary-payment/:paymentId", memberController.deleteSalaryPayment);

/**
 * @swagger
 * /api/members/{id}/salary-status:
 *   get:
 *     summary: Get member salary status for month
 *     tags: [Members]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: month
 *         schema:
 *           type: string
 *       - in: query
 *         name: year
 *         schema:
 *           type: integer
 */
router.get("/:id/salary-status", memberController.getMemberSalaryStatus);

module.exports = router;