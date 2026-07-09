// routes/ledger.routes.js
const express = require("express");
const router = express.Router();
const ledgerController = require("../controllers/ledger.controller");
const auth = require("../middlewares/auth.middleware");

// Apply authentication to all routes
router.use(auth);

/**
 * @swagger
 * tags:
 *   name: Ledger
 *   description: Ledger management with double-entry bookkeeping
 */

// GET routes
router.get("/", ledgerController.getAllEntries);
router.get("/student/:studentId", ledgerController.getStudentLedger);
router.get("/summary/overall", ledgerController.getOverallSummary);
router.get("/summary/student/:studentId", ledgerController.getStudentSummary);
router.get("/summary/categories", ledgerController.getCategorySummary);
router.get("/export/csv", ledgerController.exportCSV);

// POST routes
router.post("/expense", ledgerController.addExpenseEntry);
router.post("/income", ledgerController.addIncomeEntry);

// PUT/DELETE routes
router.put("/:id", ledgerController.updateEntry);
router.delete("/:id", ledgerController.deleteEntry);

module.exports = router;