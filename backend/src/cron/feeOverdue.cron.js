const cron = require("node-cron");
const db = require("../config/db.sqlite");
const notificationService = require("../services/notification.service");

/**
 * Runs every day at 00:05 AM
 * 1. Updates fee status
 * 2. Sends reminders for overdue fees
 */
const startFeeOverdueCron = () => {
  // Update fee status daily at 00:05 AM
  cron.schedule("5 0 * * *", async () => {
    console.log("⏳ Running fee overdue cron (scheduled)...");
    try {
      await updateFeeStatus();
    } catch (err) {
      console.error("❌ Fee overdue cron failed:", err.message);
    }
  });

  console.log("⏰ Fee overdue cron job started");

  // Run immediately on startup
  updateFeeStatus();
};

/**
 * Update fee status
 */
const updateFeeStatus = async () => {
  await db.query(
    `UPDATE student_fees
     SET fee_status = 
       CASE
         WHEN paid_amount >= fee_amount THEN 'PAID'
         WHEN date('now') <= date(fee_date, '+5 days') THEN 'DUE'
         ELSE 'OVERDUE'
       END`
  );
  console.log("✅ Fee overdue status updated");
};

module.exports = { startFeeOverdueCron };
