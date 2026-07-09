const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const backupController = require("../controllers/backup.controller");
const authMiddleware = require("../middlewares/auth.middleware");

// Configure multer for backup file upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), "uploads", "temp");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, `temp_backup_${Date.now()}.db`);
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.originalname.endsWith('.db')) {
      cb(null, true);
    } else {
      cb(new Error('Only .db files are allowed'));
    }
  }
});

// Apply auth middleware
router.use(authMiddleware);

/**
 * @route POST /api/backup/create
 * @desc Create manual backup
 */
router.post("/create", backupController.createBackup);

/**
 * @route GET /api/backup/list
 * @desc List all backups
 */
router.get("/list", backupController.listBackups);

/**
 * @route POST /api/backup/restore/:filename
 * @desc Restore from backup
 */
router.post("/restore/:filename", backupController.restoreBackup);

/**
 * @route POST /api/backup/upload-restore
 * @desc Upload and restore from external backup file
 */
router.post("/upload-restore", upload.single('backup'), backupController.uploadAndRestoreBackup);

/**
 * @route DELETE /api/backup/:filename
 * @desc Delete a backup
 */
router.delete("/:filename", backupController.deleteBackup);

module.exports = router;