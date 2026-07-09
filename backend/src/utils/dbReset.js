const db = require("../config/db.sqlite");

/**
 * Reset database during reinstall while preserving student data
 * 
 * This function:
 * - Clears operational tables (fees, payments, allocations, etc.)
 * - Preserves student master data
 * - Handles foreign key dependencies correctly
 * - Is fault-tolerant (best-effort, not all-or-nothing)
 */
module.exports.resetDatabasePreserveStudents = () => {
  console.log("♻️ Reinstall detected — cleaning operational data");

  // Correct dependency order (child → parent)
  const tablesToClear = [
    // Level 1: No dependencies on other tables in this list
    "fee_payments",           // depends on: student_fees, students, members
    "member_transactions",    // depends on: members, students, student_fees
    "reminder_logs",          // depends on: students, student_fees
    "notification_logs",      // depends on: students
    "student_advances",       // depends on: students, student_fees
    "ledger_entries",         // depends on: students
    
    // Level 2: Depends on Level 1 tables
    "student_fees",           // depends on: students
    
    // Level 3: Room allocation depends on rooms, beds, students
    "room_allocation",        // depends on: rooms, beds, students
    
    // Level 4: Beds depends on rooms
    "beds",                   // depends on: rooms
    
    // Level 5: Parent tables (no dependencies in this list)
    "rooms",
    "members"
  ];

  // Apply safety pragmas before reset
  let foreignKeysWereOn = false;
  try {
    // Check current FK state
    const fkState = db.db.pragma("foreign_keys", { simple: true });
    foreignKeysWereOn = fkState === 1;
    
    // Temporarily disable foreign keys for safe deletion
    db.db.pragma("foreign_keys = OFF");
    
    // Set busy timeout to prevent lock errors
    db.db.pragma("busy_timeout = 5000");
    
    console.log("🔓 Foreign keys temporarily disabled");
  } catch (err) {
    console.warn("⚠️ Could not disable foreign keys:", err.message);
  }

  // No global transaction - best-effort independent clears
  let successCount = 0;
  let failCount = 0;
  const failedTables = [];

  for (const table of tablesToClear) {
    try {
      // Check if table exists first
      const tableExists = db.db.prepare(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name=?
      `).get(table);

      if (!tableExists) {
        console.log(`⏭️ Skipped ${table} (does not exist)`);
        continue;
      }

      // Get row count before delete (for logging)
      const countResult = db.db.prepare(`SELECT COUNT(*) as count FROM ${table}`).get();
      const rowCount = countResult?.count || 0;

      // Delete all rows
      const result = db.db.prepare(`DELETE FROM ${table}`).run();
      
      console.log(`🧹 Cleared ${table} (${rowCount} rows)`);
      successCount++;
    } catch (err) {
      console.warn(`⚠️ Failed to clear ${table}:`, err.message);
      failedTables.push(table);
      failCount++;
      // Continue with next table - best effort approach
    }
  }

  // Restore foreign keys
  try {
    if (foreignKeysWereOn) {
      db.db.pragma("foreign_keys = ON");
      console.log("🔒 Foreign keys re-enabled");
    }
  } catch (err) {
    console.warn("⚠️ Could not re-enable foreign keys:", err.message);
  }

  // Summary
  console.log("─".repeat(50));
  console.log(`✅ Reset complete: ${successCount} cleared, ${failCount} failed`);
  
  if (failedTables.length > 0) {
    console.warn(`⚠️ Failed tables: ${failedTables.join(", ")}`);
  }
  
  console.log("📌 Student data preserved");

  // Return status for caller to decide next steps
  return {
    success: failCount === 0,
    cleared: successCount,
    failed: failCount,
    failedTables
  };
};

/**
 * Full database reset (for fresh install)
 * Clears ALL data including students
 */
module.exports.resetDatabaseFull = () => {
  console.log("🔄 Full database reset — clearing all data");

  const allTables = [
    // Child tables first
    "fee_payments",
    "member_transactions",
    "reminder_logs",
    "notification_logs",
    "student_advances",
    "ledger_entries",
    "student_fees",
    "room_allocation",
    "beds",
    "rooms",
    "members",
    "reminder_counter",
    "audit_logs",
    // Parent tables last
    "students"
    // Settings and accounts preserved (commented out)
    // "settings",
    // "payment_accounts",
    // "admins"
  ];

  // Disable FK constraints and set busy timeout
  try {
    db.db.pragma("foreign_keys = OFF");
    db.db.pragma("busy_timeout = 5000");
  } catch {}

  let successCount = 0;

  for (const table of allTables) {
    try {
      const tableExists = db.db.prepare(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name=?
      `).get(table);

      if (tableExists) {
        db.db.prepare(`DELETE FROM ${table}`).run();
        console.log(`🧹 Cleared ${table}`);
        successCount++;
      }
    } catch (err) {
      console.warn(`⚠️ Failed to clear ${table}:`, err.message);
    }
  }

  // Re-enable FK constraints
  try {
    db.db.pragma("foreign_keys = ON");
  } catch {}

  console.log(`✅ Full reset complete: ${successCount} tables cleared`);

  return { success: true, cleared: successCount };
};