const cron = require("node-cron");
const penaltyService = require("../services/penalty.service");

/**
 * Apply penalties daily at 1:00 AM
 */
const startPenaltyCron = () => {
  let isRunning = false;

  cron.schedule("0 1 * * *", async () => {
    if (isRunning) return;
    isRunning = true;

    console.log("💰 Running penalty calculation job...");

    try {
      // ✅ FIX: Use correct function name from penalty.service.js
      const result = penaltyService.applyPenaltiesToOverdueFees();
      console.log(`✅ Penalty job completed: ${result.applied} penalties applied`);
    } catch (err) {
      console.error("❌ Penalty cron failed:", err.message);
    } finally {
      isRunning = false;
    }
  });

  console.log("💰 Penalty cron job started (daily at 1:00 AM)");
  
  // Run immediately on startup (with delay)
  setTimeout(() => {
    try {
      penaltyService.applyPenaltiesToOverdueFees();
    } catch (err) {
      console.error("❌ Initial penalty calculation failed:", err.message);
    }
  }, 7000);
};

module.exports = { startPenaltyCron };