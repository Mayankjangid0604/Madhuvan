const cron = require("node-cron");
const feeService = require("../services/fee.service");

// ============================================
// GENERATE MONTHLY FEES ON STARTUP
// ============================================
const generateOnStartup = () => {
  console.log("\n📅 Checking for missing monthly fees...\n");
  
  try {
    // Clean up any inadvertently generated past fees before proceeding
    const cleanup = feeService.cleanupInvalidPastFees();
    if (cleanup && cleanup.deleted > 0) {
      console.log(`🧹 Cleaned up ${cleanup.deleted} falsely generated past fees`);
    }

    const result = feeService.generateAllMonthlyFees();
    console.log(`✅ Fees: ${result.created} created, ${result.skipped} skipped\n`);
    return result;
  } catch (err) {
    console.error("❌ Fee generation failed:", err.message);
    return { created: 0, skipped: 0, error: err.message };
  }
};

// ============================================
// UPDATE FEE STATUSES
// ============================================
const updateStatuses = () => {
  try {
    const result = feeService.updateAllFeeStatuses();
    console.log(`📊 Fee statuses: ${result.updated} updated`);
    return result;
  } catch (err) {
    console.error("❌ Status update failed:", err.message);
    return { updated: 0, error: err.message };
  }
};

// ============================================
// APPLY PENALTIES
// ============================================
const applyPenalties = () => {
  try {
    // ✅ FIX: Use correct function name from fee.service.js
    const result = feeService.applyPenaltiesToOverdueFees();
    if (result.applied > 0) {
      console.log(`⚠️ Penalties: ${result.applied} applied`);
    }
    return result;
  } catch (err) {
    console.error("❌ Penalty application failed:", err.message);
    return { applied: 0, error: err.message };
  }
};

// ============================================
// START CRON JOBS
// ============================================
const startAutoGenerateFeesCron = () => {
  console.log("\n📅 Starting Fee Cron Jobs...\n");
  
  // Run on startup (with delay to let DB initialize)
  setTimeout(() => {
    generateOnStartup();
    updateStatuses();
    applyPenalties();
  }, 5000);
  
  // Daily at 00:05 - Generate fees & apply penalties
  cron.schedule("5 0 * * *", () => {
    console.log(`\n📅 Daily fee job: ${new Date().toISOString()}\n`);
    generateOnStartup();
    updateStatuses();
    applyPenalties();
  });
  
  // Every 6 hours - Update statuses
  cron.schedule("0 */6 * * *", () => {
    console.log(`📊 Status update: ${new Date().toISOString()}`);
    updateStatuses();
  });
  
  console.log("📅 Cron jobs started:");
  console.log("   ✅ Daily fee generation: 00:05");
  console.log("   ✅ Status updates: Every 6 hours");
  console.log("");
};

module.exports = {
  startAutoGenerateFeesCron,
  generateOnStartup,
  updateStatuses,
  applyPenalties
};