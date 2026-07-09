const express = require("express");
const router = express.Router();
const studentController = require("../controllers/student.controller");
const { uploadStudentPhoto } = require("../middlewares/upload.middleware");
const auth = require("../middlewares/auth.middleware");

// Middleware to validate student ID
function validateStudentId(req, res, next) {
  const id = parseInt(req.params.id);
  if (isNaN(id) || id < 1) {
    return res.status(400).json({
      success: false,
      message: "Invalid student ID"
    });
  }
  req.params.id = id;
  next();
}

// Apply authentication to ALL routes
router.use(auth);

// Routes
router.post("/", studentController.createStudent);
router.get("/", studentController.getAllStudents);
router.get("/:id", validateStudentId, studentController.getStudentById);
router.put("/:id", validateStudentId, studentController.updateStudent);
router.post("/:id/photo", validateStudentId, uploadStudentPhoto.single("photo"), studentController.uploadPhoto);
router.post("/:id/exit", validateStudentId, studentController.exitStudent);
router.delete("/:id", validateStudentId, studentController.deleteStudent);
router.get("/debug/schema", (req, res) => {
  const db = require("../config/db.sqlite");
  const studentsCols = db.db.prepare("PRAGMA table_info(students)").all();
  const feesCols = db.db.prepare("PRAGMA table_info(student_fees)").all();
  res.json({
    students: studentsCols.map(c => c.name),
    student_fees: feesCols.map(c => c.name)
  });
});

// ❌ REMOVED: router.delete("/:id/permanent") - no longer supported

module.exports = router;