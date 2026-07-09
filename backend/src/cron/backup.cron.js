const cron = require("node-cron");
const backupService = require("../services/backup.service");
const fs = require('fs');
const path = require('path');

// ✅ FIX: Use centralized paths
const { DATA_DIR } = require("../config/paths");
const LAST_BACKUP_FILE = path.join(DATA_DIR, '.last-backup');

/**
 * Check and create backup if missed
 */
const checkAndBackup = async () => {
  try {
    // Ensure DATA_DIR exists
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    // Check last backup date
    let lastBackup = null;
    if (fs.existsSync(LAST_BACKUP_FILE)) {
      const lastBackupStr = fs.readFileSync(LAST_BACKUP_FILE, 'utf8');
      lastBackup = new Date(lastBackupStr);
    }
    
    // If never backed up or last backup was in previous month, create backup
    if (!lastBackup || lastBackup.getMonth() !== currentMonth || lastBackup.getFullYear() !== currentYear) {
      console.log("📦 Creating monthly backup (catchup)...");
      
      // ✅ FIX: Check if function exists
      if (backupService.createMonthlyBackup) {
        const result = await backupService.createMonthlyBackup();
        
        if (result.success) {
          console.log(`✅ Catchup backup completed: ${result.backup}`);
          if (result.googleDrive) {
            console.log(`☁️  Uploaded to Google Drive: ${result.googleDrive.link}`);
          }
          
          // Update last backup timestamp
          fs.writeFileSync(LAST_BACKUP_FILE, now.toISOString());
        }
      } else if (backupService.createBackup) {
        const result = await backupService.createBackup();
        if (result.success) {
          console.log(`✅ Catchup backup completed`);
          fs.writeFileSync(LAST_BACKUP_FILE, now.toISOString());
        }
      }
    }
  } catch (err) {
    console.error("❌ Backup catchup failed:", err.message);
  }
};

/**
 * Monthly backup - runs on 1st of every month at 02:00 AM
 */
const startBackupCron = () => {
  cron.schedule("0 2 1 * *", async () => {
    console.log("📦 Running monthly backup job (scheduled)...");

    try {
      const createBackupFn = backupService.createMonthlyBackup || backupService.createBackup;
      
      if (!createBackupFn) {
        console.error("❌ Backup function not available");
        return;
      }

      const result = await createBackupFn();
      
      if (result.success) {
        console.log(`✅ Monthly backup completed: ${result.backup || 'done'}`);
        if (result.googleDrive?.link) {
          console.log(`☁️  Uploaded to Google Drive: ${result.googleDrive.link}`);
        }
        
        // Update last backup timestamp
        fs.writeFileSync(LAST_BACKUP_FILE, new Date().toISOString());
      } else {
        console.error(`❌ Backup failed: ${result.error}`);
      }
    } catch (err) {
      console.error("❌ Backup cron failed:", err.message);
    }
  });

  console.log("📦 Monthly backup cron job started (1st of every month at 02:00 AM)");
  
  // Run catchup check on startup (with delay)
  setTimeout(() => {
    checkAndBackup();
  }, 15000);
};

module.exports = { startBackupCron };