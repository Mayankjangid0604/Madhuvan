// controllers/ledger.controller.js
const ledgerService = require("../services/ledger.service");
const asyncHandler = require("../utils/asyncHandler");

/**
 * Get all ledger entries
 * GET /api/ledger
 */
exports.getAllEntries = asyncHandler(async (req, res) => {
  const entries = ledgerService.getAllEntries(req.query);

  res.json({
    success: true,
    data: entries,
    count: entries.length
  });
});

/**
 * Get student ledger
 * GET /api/ledger/student/:studentId
 */
exports.getStudentLedger = asyncHandler(async (req, res) => {
  const { studentId } = req.params;
  
  const entries = ledgerService.getStudentLedger(studentId);
  
  res.json({
    success: true,
    data: entries,
    count: entries.length
  });
});

/**
 * Get overall summary
 * GET /api/ledger/summary/overall
 */
exports.getOverallSummary = asyncHandler(async (req, res) => {
  const summary = ledgerService.getOverallSummary(req.query);
  
  res.json({
    success: true,
    data: summary
  });
});

/**
 * Get student summary
 * GET /api/ledger/summary/student/:studentId
 */
exports.getStudentSummary = asyncHandler(async (req, res) => {
  const { studentId } = req.params;
  
  const summary = ledgerService.getStudentSummary(studentId);
  
  res.json({
    success: true,
    data: summary
  });
});

/**
 * Get category summary
 * GET /api/ledger/summary/categories
 */
exports.getCategorySummary = asyncHandler(async (req, res) => {
  const summary = ledgerService.getCategorySummary(req.query);
  
  res.json({
    success: true,
    data: summary
  });
});

/**
 * Add manual expense entry
 * POST /api/ledger/expense
 */
exports.addExpenseEntry = asyncHandler(async (req, res) => {
  const entryId = ledgerService.createManualExpenseEntry(req.body);
  
  res.status(201).json({
    success: true,
    message: "Expense entry added",
    entry_id: entryId
  });
});

/**
 * Add manual income entry
 * POST /api/ledger/income
 */
exports.addIncomeEntry = asyncHandler(async (req, res) => {
  const entryId = ledgerService.createManualIncomeEntry(req.body);
  
  res.status(201).json({
    success: true,
    message: "Income entry added",
    entry_id: entryId
  });
});

/**
 * Update ledger entry
 * PUT /api/ledger/:id
 */
exports.updateEntry = asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  ledgerService.updateEntry(id, req.body);
  
  res.json({
    success: true,
    message: "Ledger entry updated"
  });
});

/**
 * Delete ledger entry
 * DELETE /api/ledger/:id
 */
exports.deleteEntry = asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  ledgerService.deleteEntry(id);
  
  res.json({
    success: true,
    message: "Ledger entry deleted"
  });
});

/**
 * Export ledger to CSV
 * GET /api/ledger/export/csv
 */
exports.exportCSV = asyncHandler(async (req, res) => {
  const csv = ledgerService.exportToCSV(req.query);
  
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=ledger.csv');
  res.send(csv);
});

module.exports = exports;