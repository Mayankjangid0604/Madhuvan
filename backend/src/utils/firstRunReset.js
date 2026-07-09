const fs = require("fs");
const path = require("path");
const { resetDatabaseFull } = require("./dbReset");

const isDev = process.env.NODE_ENV !== "production";

// ✅ FIX #2: Respect dev vs prod paths
const appDir = path.join(
  process.env.APPDATA || process.env.HOME,
  isDev ? "Madhuvan-dev" : "Madhuvan"
);

// ✅ FIX #1 & #2: Use same marker as installMode.js (no duplicate flags)
const FIRST_RUN_FLAG = path.join(appDir, "first_run_complete.flag");

/**
 * 🔥 Runs ONLY on FRESH install (first time ever)
 * - Sets up initial database state
 * - Creates default data if needed
 * - Does NOT handle reinstalls (that's dbReset.js's job)
 */
function resetDatabaseIfNeeded() {
  // ✅ FIX #1: Only handle FRESH install, not reinstalls
  if (fs.existsSync(FIRST_RUN_FLAG)) {
    // Not a fresh install - skip
    return;
  }

  console.log("🆕 Fresh installation detected - initializing database");

  try {
    // ✅ FIX #3: Use existing reset function, don't duplicate logic
    const result = resetDatabaseFull();

    if (result.success) {
      console.log(`✅ Fresh install initialization complete (${result.cleared} tables prepared)`);

      // Mark first run as complete
      if (!fs.existsSync(appDir)) {
        fs.mkdirSync(appDir, { recursive: true });
      }

      fs.writeFileSync(
        FIRST_RUN_FLAG,
        JSON.stringify({
          completedAt: new Date().toISOString(),
          tablesCleared: result.cleared
        }, null, 2),
        "utf8"
      );

      console.log("🔒 First run marked complete:", FIRST_RUN_FLAG);
    } else {
      console.error("⚠️ Fresh install initialization had issues");
    }
  } catch (err) {
    console.error("❌ Fresh install initialization failed:", err.message);
    // Don't throw - let app continue with existing state
  }
}

// ✅ FIX #4: Function is synchronous (removed async)
module.exports = resetDatabaseIfNeeded;