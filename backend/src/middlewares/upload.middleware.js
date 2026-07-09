/**
 * Upload Middleware
 * Delegates to config/uploads.js to avoid duplication
 */
const { 
  studentUpload, 
  logoUpload, 
  memberUpload,
  STUDENTS_UPLOAD_DIR,
  LOGOS_UPLOAD_DIR,
  MEMBERS_UPLOAD_DIR
} = require("../config/uploads");
const multer = require("multer");

// ============================================
// ERROR HANDLER MIDDLEWARE
// ============================================
const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        success: false,
        message: "File too large. Maximum size allowed.",
      });
    }
    return res.status(400).json({
      success: false,
      message: `Upload error: ${err.message}`,
    });
  } else if (err) {
    return res.status(400).json({
      success: false,
      message: err.message || "Upload failed",
    });
  }
  next();
};

// ============================================
// EXPORTS
// ============================================
module.exports = {
  uploadStudentPhoto: studentUpload,
  uploadLogo: logoUpload,
  uploadMemberPhoto: memberUpload,
  handleUploadError,
  STUDENTS_DIR: STUDENTS_UPLOAD_DIR,
  LOGOS_DIR: LOGOS_UPLOAD_DIR,
  MEMBERS_DIR: MEMBERS_UPLOAD_DIR
};