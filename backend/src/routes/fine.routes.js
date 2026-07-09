const express = require("express");
const router = express.Router();
const fineController = require("../controllers/fine.controller");
const auth = require("../middlewares/auth.middleware");

router.use(auth);

/**
 * @swagger
 * tags:
 *   name: Fines
 *   description: Fine & penalty management
 */

/**
 * @swagger
 * /api/fines/room/{roomNo}/students:
 *   get:
 *     summary: Get students by room
 *     tags: [Fines]
 */
router.get("/room/:roomNo/students", fineController.getStudentsByRoom);

/**
 * @swagger
 * /api/fines/student/{studentId}/security:
 *   get:
 *     summary: Get student security deposit info
 *     tags: [Fines]
 */
router.get("/student/:studentId/security", fineController.getStudentSecurity);

/**
 * @swagger
 * /api/fines/student/{studentId}/pending:
 *   get:
 *     summary: Get pending fines/damages for student
 *     tags: [Fines]
 */
router.get("/student/:studentId/pending", fineController.getPendingItems);

/**
 * @swagger
 * /api/fines/apply-fine:
 *   post:
 *     summary: Apply fine to student
 *     tags: [Fines]
 */
router.post("/apply-fine", fineController.applyFine);

/**
 * @swagger
 * /api/fines/apply-damage:
 *   post:
 *     summary: Apply property damage charge
 *     tags: [Fines]
 */
router.post("/apply-damage", fineController.applyPropertyDamage);

/**
 * @swagger
 * /api/fines/give-money:
 *   post:
 *     summary: Give money to student
 *     tags: [Fines]
 */
router.post("/give-money", fineController.giveMoneyToStudent);

/**
 * @swagger
 * /api/fines/collect:
 *   post:
 *     summary: Collect payment for a pending fine or damage
 *     tags: [Fines]
 */
router.post("/collect", fineController.collectFine);

/**
 * @swagger
 * /api/fines/history:
 *   get:
 *     summary: Get fine/damage history
 *     tags: [Fines]
 */
router.get("/history", fineController.getHistory);

module.exports = router;