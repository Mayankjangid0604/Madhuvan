const cron = require("node-cron");
const notificationService = require("../services/notification.service");
const fs = require('fs');
const path = require('path');

// ✅ FIX: Use centralized paths
const { DATA_DIR } = require("../config/paths");
const LAST_REMINDER_FILE = path.join(DATA_DIR, '.last-reminder');

/**
 * Check and send reminders if missed today
 */
const checkAndSendReminders = async () => {
  try {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    
    // Ensure DATA_DIR exists
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    
    // Check last reminder date
    let lastReminder = null;
    if (fs.existsSync(LAST_REMINDER_FILE)) {
      const lastReminderStr = fs.readFileSync(LAST_REMINDER_FILE, 'utf8');
      lastReminder = lastReminderStr.split('T')[0];
    }
    
    // If never sent or last sent was not today, send reminders
    if (!lastReminder || lastReminder !== today) {
      console.log("📧 Sending daily fee reminders (catchup)...");
      
      const result = await notificationService.sendBulkOverdueReminders();
      console.log(`✅ Sent reminders to ${result.total} students`);
      
      // Update last reminder timestamp
      fs.writeFileSync(LAST_REMINDER_FILE, now.toISOString());
    }
  } catch (err) {
    console.error("❌ Reminder catchup failed:", err.message);
  }
};

/**
 * Send fee reminders for overdue fees - runs every day at 09:00 AM
 */
const startFeeReminderCron = () => {
  cron.schedule("0 9 * * *", async () => {
    console.log("📧 Running daily fee reminder job (scheduled)...");

    try {
      const result = await notificationService.sendBulkOverdueReminders();
      console.log(`✅ Sent reminders to ${result.total} students`);
      
      // Update last reminder timestamp
      fs.writeFileSync(LAST_REMINDER_FILE, new Date().toISOString());
    } catch (err) {
      console.error("❌ Fee reminder cron failed:", err.message);
    }
  });

  console.log("📧 Fee reminder cron job started (Daily at 09:00 AM)");
  
  // Run catchup check on startup (with delay)
  setTimeout(() => {
    checkAndSendReminders();
  }, 10000);
};

module.exports = { startFeeReminderCron };