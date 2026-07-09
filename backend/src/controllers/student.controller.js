// controllers/student.controller.js
const studentService = require("../services/student.service");
const { validateStudent, validateStudentId, validateCheckout } = require("../validations/student.validation");
const asyncHandler = require("../utils/asyncHandler");
const path = require("path");

/**
 * Create new student
 * POST /api/students
 */
exports.createStudent = asyncHandler(async (req, res) => {
  // Validate input
  const validation = validateStudent(req.body, false);
  if (!validation.valid) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: validation.errors
    });
  }

  try {
    const result = studentService.createStudentWithFees(req.body);
    
    return res.status(201).json({
      success: true,
      message: "Student created successfully",
      data: {
        student_id: result.student_id,
        fees_created: result.fees_created,
        main_fee_id: result.main_fee_id,
        security_fee_id: result.security_fee_id
      }
    });
  } catch (err) {
    console.error("Create student error:", err.message);
    
    if (err.message.includes("fee generation failed")) {
      return res.status(500).json({
        success: false,
        message: err.message
      });
    }
    
    return res.status(500).json({
      success: false,
      message: "Failed to create student"
    });
  }
});

/**
 * Get all students
 * GET /api/students
 */
exports.getAllStudents = asyncHandler(async (req, res) => {
  try {
    const students = studentService.getAllStudents();
    
    return res.status(200).json({
      success: true,
      data: students,
      count: students.length
    });
  } catch (err) {
    console.error("Get all students error:", err.message);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch students"
    });
  }
});

/**
 * Get student by ID
 * GET /api/students/:id
 */
exports.getStudentById = asyncHandler(async (req, res) => {
  const student = studentService.getStudentById(req.params.id);
  
  if (!student) {
    return res.status(404).json({
      success: false,
      message: "Student not found"
    });
  }
  
  return res.status(200).json({
    success: true,
    data: student
  });
});

/**
 * Update student
 * PUT /api/students/:id
 */
exports.updateStudent = asyncHandler(async (req, res) => {
  // Validate input
  const validation = validateStudent(req.body, true);
  if (!validation.valid) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: validation.errors
    });
  }

  try {
    const result = studentService.updateStudent(req.params.id, req.body);
    
    return res.status(200).json({
      success: true,
      message: result.feesUpdated 
        ? "Student updated and fees recalculated" 
        : "Student updated successfully",
      data: result
    });
  } catch (err) {
    if (err.message === "Student not found") {
      return res.status(404).json({
        success: false,
        message: err.message
      });
    }
    
    console.error("Update student error:", err.message);
    return res.status(500).json({
      success: false,
      message: err.message || "Failed to update student"
    });
  }
});

/**
 * Upload student photo
 * POST /api/students/:id/photo
 */
exports.uploadPhoto = asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: "No photo uploaded"
    });
  }

  try {
    const result = await studentService.uploadStudentPhoto(req.params.id, req.file);
    
    return res.status(200).json({
      success: true,
      message: "Photo uploaded successfully",
      data: result
    });
  } catch (err) {
    if (err.message === "Student not found") {
      return res.status(404).json({
        success: false,
        message: err.message
      });
    }
    
    console.error("Upload photo error:", err.message);
    return res.status(500).json({
      success: false,
      message: "Failed to upload photo"
    });
  }
});

/**
 * Exit/Checkout student
 * POST /api/students/:id/exit
 */
exports.exitStudent = asyncHandler(async (req, res) => {
  try {
    const result = studentService.checkoutStudent(req.params.id, {
      checkoutDate: req.body.date_of_leaving,
      reason: req.body.reason || 'Manual checkout',
      deletePhoto: true
    });
    
    return res.status(200).json({
      success: true,
      message: "Student checked out successfully",
      data: result
    });
  } catch (err) {
    if (err.message === "Student not found") {
      return res.status(404).json({
        success: false,
        message: err.message
      });
    }
    
    if (err.message === "Student has already checked out") {
      return res.status(400).json({
        success: false,
        message: err.message
      });
    }
    
    console.error("Exit student error:", err.message);
    return res.status(500).json({
      success: false,
      message: "Failed to checkout student"
    });
  }
});

/**
 * Soft delete student (deprecated - use exit)
 * DELETE /api/students/:id
 */
exports.deleteStudent = asyncHandler(async (req, res) => {
  try {
    const result = studentService.deleteStudent(req.params.id);
    
    return res.status(200).json({
      success: true,
      message: "Student soft deleted",
      data: result
    });
  } catch (err) {
    if (err.message === "Student not found") {
      return res.status(404).json({
        success: false,
        message: err.message
      });
    }
    
    console.error("Delete student error:", err.message);
    return res.status(500).json({
      success: false,
      message: "Failed to delete student"
    });
  }
});

// ❌ REMOVED: hardDeleteStudent - no longer supported

module.exports = exports;