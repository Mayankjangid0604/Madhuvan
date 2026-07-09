// controllers/fine.controller.js
const fineService = require("../services/fine.service");
const asyncHandler = require("../utils/asyncHandler");

// ============================================
// GET STUDENTS BY ROOM
// ============================================
exports.getStudentsByRoom = asyncHandler(async (req, res) => {
  const { roomNo } = req.params;

  try {
    const students = fineService.getStudentsByRoom(roomNo);

    return res.json({
      success: true,
      data: students
    });
  } catch (err) {
    console.error("Get students by room error:", err.message);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch students"
    });
  }
});

// ============================================
// GET STUDENT SECURITY INFO
// ============================================
exports.getStudentSecurity = asyncHandler(async (req, res) => {
  const { studentId } = req.params;

  try {
    const security = fineService.getStudentSecurity(studentId);

    if (!security) {
      return res.status(404).json({
        success: false,
        message: "Student not found"
      });
    }

    return res.json({
      success: true,
      data: security
    });
  } catch (err) {
    console.error("Get student security error:", err.message);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch security info"
    });
  }
});

// ============================================
// GET PENDING ITEMS
// ============================================
exports.getPendingItems = asyncHandler(async (req, res) => {
  const { studentId } = req.params;

  try {
    const items = fineService.getPendingItems(studentId);

    return res.json({
      success: true,
      data: items
    });
  } catch (err) {
    console.error("Get pending items error:", err.message);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch pending items"
    });
  }
});

// ============================================
// APPLY FINE
// ============================================
exports.applyFine = asyncHandler(async (req, res) => {
  const { student_id, amount, reason, fine_type, fee_id, cut_from_security } = req.body;

  if (!student_id || !amount) {
    return res.status(400).json({
      success: false,
      message: "student_id and amount are required"
    });
  }

  try {
    const result = fineService.applyFine({
      student_id,
      amount,
      note: reason,
      fine_type: fine_type || 'FINE',
      fee_id,
      cut_from_security
    });

    // Create ledger entry when fine is deducted from security
    if (cut_from_security) {
      try {
        const ledgerService = require("../services/ledger.service");
        ledgerService.createMoneyGivenEntry({
          student_id,
          amount: Number(amount),
          given_date: new Date().toISOString().split('T')[0],
          note: `Fine - ${reason || 'Deducted from security deposit'}`
        });
        console.log("✅ Ledger entry created for fine security deduction");
      } catch (ledgerErr) {
        console.error("⚠️ Ledger entry failed for fine deduction:", ledgerErr.message);
      }
    }

    return res.json({
      success: true,
      message: "Fine applied successfully",
      data: result
    });
  } catch (err) {
    console.error("Apply fine error:", err.message);
    return res.status(500).json({
      success: false,
      message: err.message || "Failed to apply fine"
    });
  }
});

// ============================================
// APPLY PROPERTY DAMAGE
// ============================================
exports.applyPropertyDamage = asyncHandler(async (req, res) => {
  const { student_id, amount, description, damage_type, cut_from_security } = req.body;

  if (!student_id || !amount) {
    return res.status(400).json({
      success: false,
      message: "student_id and amount are required"
    });
  }

  try {
    const result = fineService.applyPropertyDamage({
      student_id,
      amount,
      note: description,
      damage_type: damage_type || 'GENERAL',
      deduct_from_security: cut_from_security
    });

    // ✅ FIX ISSUE 4: Create ledger entry when property damage is deducted from security
    if (cut_from_security) {
      try {
        const ledgerService = require("../services/ledger.service");
        ledgerService.createMoneyGivenEntry({
          student_id,
          amount: Number(amount),
          given_date: new Date().toISOString().split('T')[0],
          note: `Property Damage - ${description || 'Deducted from security deposit'}`
        });
        console.log("✅ Ledger entry created for property damage deduction");
      } catch (ledgerErr) {
        console.error("⚠️ Ledger entry failed for property damage:", ledgerErr.message);
      }
    }

    return res.json({
      success: true,
      message: "Property damage recorded",
      data: result
    });
  } catch (err) {
    console.error("Apply property damage error:", err.message);
    return res.status(500).json({
      success: false,
      message: err.message || "Failed to record damage"
    });
  }
});

// ============================================
// GIVE MONEY TO STUDENT
// ============================================
exports.giveMoneyToStudent = asyncHandler(async (req, res) => {
  const { student_id, amount, note, given_by, cut_from_security } = req.body;

  if (!student_id || !amount) {
    return res.status(400).json({
      success: false,
      message: "student_id and amount are required"
    });
  }

  try {
    const result = fineService.giveMoneyToStudent({
      student_id,
      amount,
      note,
      given_by: given_by || 'ADMIN',
      deduct_from_security: cut_from_security
    });

    // ✅ FIX ISSUE 4: Create ledger entry for money given to student
    try {
      const ledgerService = require("../services/ledger.service");
      ledgerService.createMoneyGivenEntry({
        student_id,
        amount: Number(amount),
        given_date: new Date().toISOString().split('T')[0],
        note: note || `Money given to student${cut_from_security ? ' (from security deposit)' : ''}`
      });
      console.log("✅ Ledger entry created for money given to student");
    } catch (ledgerErr) {
      console.error("⚠️ Ledger entry failed for money given:", ledgerErr.message);
    }

    return res.json({
      success: true,
      message: "Money given recorded",
      data: result
    });
  } catch (err) {
    console.error("Give money error:", err.message);
    return res.status(500).json({
      success: false,
      message: err.message || "Failed to record money given"
    });
  }
});

// ============================================
// COLLECT FINE (receive payment for a pending fine)
// ============================================
exports.collectFine = asyncHandler(async (req, res) => {
  const { record_type, record_id, payment_mode, reference_no, note } = req.body;

  if (!record_type || !record_id) {
    return res.status(400).json({
      success: false,
      message: "record_type and record_id are required"
    });
  }

  try {
    const result = fineService.collectFine({
      record_type,
      record_id,
      payment_mode: payment_mode || 'CASH',
      reference_no: reference_no || null,
      note: note || null
    });

    return res.json({
      success: true,
      message: "Fine collected successfully",
      data: result
    });
  } catch (err) {
    console.error("Collect fine error:", err.message);
    return res.status(400).json({
      success: false,
      message: err.message || "Failed to collect fine"
    });
  }
});

// ============================================
// GET HISTORY
// ============================================
exports.getHistory = asyncHandler(async (req, res) => {
  const { search } = req.query;

  try {
    const records = fineService.getHistory({ search });

    return res.json({
      success: true,
      data: records
    });
  } catch (err) {
    console.error("Get history error:", err.message);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch history"
    });
  }
});

module.exports = exports;