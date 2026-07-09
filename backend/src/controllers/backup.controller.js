const backupService = require("../services/backup.service");

/**
 * Create manual backup
 */
const createBackup = async (req, res) => {
  try {
    const result = await backupService.createBackup();
    
    if (result.success) {
      res.json({
        success: true,
        message: "Backup created successfully",
        data: result
      });
    } else {
      res.status(500).json({
        success: false,
        message: result.error || "Backup failed"
      });
    }
  } catch (error) {
    console.error("Backup error:", error.message);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * List all backups
 */
const listBackups = async (req, res) => {
  try {
    const backups = await backupService.listBackups();
    res.json({
      success: true,
      data: backups
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Restore from backup
 */
const restoreBackup = async (req, res) => {
  try {
    const { filename } = req.params;
    const result = await backupService.restoreBackup(filename);
    
    if (result.success) {
      res.json({
        success: true,
        message: "Backup restored successfully"
      });
    } else {
      res.status(500).json({
        success: false,
        message: result.error || "Restore failed"
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Delete a backup
 */
const deleteBackup = async (req, res) => {
  try {
    const { filename } = req.params;
    const result = await backupService.deleteBackup(filename);
    
    if (result.success) {
      res.json({
        success: true,
        message: "Backup deleted successfully"
      });
    } else {
      res.status(500).json({
        success: false,
        message: result.error || "Delete failed"
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Upload and restore from external backup file
 */
const uploadAndRestoreBackup = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No backup file uploaded"
      });
    }

    const uploadedFilePath = req.file.path;
    const filename = req.file.filename;

    // Move to backup directory and restore
    const result = await backupService.restoreBackupFromFile(uploadedFilePath, filename);
    
    if (result.success) {
      res.json({
        success: true,
        message: "Backup restored successfully",
        data: result
      });
    } else {
      res.status(500).json({
        success: false,
        message: result.error || "Restore failed"
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Export all functions
module.exports = {
  createBackup,
  listBackups,
  restoreBackup,
  deleteBackup,
  uploadAndRestoreBackup
};