const multer = require("multer");
const path = require("path");
const {
  STUDENTS_UPLOAD_DIR,
  LOGOS_UPLOAD_DIR,
  MEMBERS_UPLOAD_DIR
} = require("./paths");

// ============================================
// STUDENT PHOTO UPLOAD
// ============================================
const studentStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, STUDENTS_UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `student-${uniqueSuffix}${ext}`);
  }
});

// ============================================
// LOGO UPLOAD
// ============================================
const logoStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, LOGOS_UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `logo-${Date.now()}${ext}`);
  }
});

// ============================================
// MEMBER PHOTO UPLOAD
// ============================================
const memberStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, MEMBERS_UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `member-${uniqueSuffix}${ext}`);
  }
});

// ============================================
// FILE FILTER (Images Only)
// ============================================
const imageFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp|svg/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);
  
  if (extname && mimetype) {
    return cb(null, true);
  } else {
    cb(new Error("Only image files (JPEG, PNG, GIF, WEBP, SVG) are allowed"));
  }
};

// ============================================
// MULTER INSTANCES
// ============================================
const studentUpload = multer({
  storage: studentStorage,
  limits: { 
    fileSize: 5 * 1024 * 1024 // 5MB
  },
  fileFilter: imageFilter
});

const logoUpload = multer({
  storage: logoStorage,
  limits: { 
    fileSize: 2 * 1024 * 1024 // 2MB
  },
  fileFilter: imageFilter
});

const memberUpload = multer({
  storage: memberStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: imageFilter
});

// ============================================
// EXPORTS
// ============================================
module.exports = {
  studentUpload,
  logoUpload,
  memberUpload,
  STUDENTS_UPLOAD_DIR,
  LOGOS_UPLOAD_DIR,
  MEMBERS_UPLOAD_DIR
};