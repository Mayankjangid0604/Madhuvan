const fs = require("fs");
const path = require("path");
const os = require("os");
const Database = require("better-sqlite3");

const APP_NAME = "Madhuvan";

// Backup directory
const BACKUP_DIR = path.join(
  process.env.APPDATA || path.join(os.homedir(), "AppData", "Roaming"),
  APP_NAME,
  "backups"
);

// Database path
const DATA_DIR = path.join(
  process.env.APPDATA || path.join(os.homedir(), "AppData", "Roaming"),
  APP_NAME,
  "data"
);

const DB_PATH = path.join(DATA_DIR, "hostel.db");

// Ensure directories exist
const ensureDir = (dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

ensureDir(BACKUP_DIR);
ensureDir(DATA_DIR);

/**
 * Create a backup of the database
 */
const createBackup = async () => {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupFileName = `backup_${timestamp}.db`;
    const backupPath = path.join(BACKUP_DIR, backupFileName);

    // Check if database exists
    if (!fs.existsSync(DB_PATH)) {
      console.log("Database not found at:", DB_PATH);
      return { success: false, error: "Database file not found" };
    }

    // Copy database file
    fs.copyFileSync(DB_PATH, backupPath);

    // Also copy WAL and SHM files if they exist
    const walPath = DB_PATH + "-wal";
    const shmPath = DB_PATH + "-shm";
    
    if (fs.existsSync(walPath)) {
      fs.copyFileSync(walPath, backupPath + "-wal");
    }
    if (fs.existsSync(shmPath)) {
      fs.copyFileSync(shmPath, backupPath + "-shm");
    }

    const stats = fs.statSync(backupPath);

    console.log(`✅ Backup created: ${backupFileName}`);

    return {
      success: true,
      filename: backupFileName,
      path: backupPath,
      size: stats.size,
      createdAt: new Date().toISOString()
    };
  } catch (error) {
    console.error("Backup error:", error.message);
    return { success: false, error: error.message };
  }
};

/**
 * List all backups
 */
const listBackups = async () => {
  try {
    if (!fs.existsSync(BACKUP_DIR)) {
      return [];
    }

    const files = fs.readdirSync(BACKUP_DIR)
      .filter(f => f.endsWith(".db") && (f.startsWith("backup_") || f.startsWith("pre_restore_")))
      .map(filename => {
        const filePath = path.join(BACKUP_DIR, filename);
        const stats = fs.statSync(filePath);
        return {
          filename,
          size: stats.size,
          createdAt: stats.birthtime,
          path: filePath
        };
      })
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return files;
  } catch (error) {
    console.error("List backups error:", error.message);
    return [];
  }
};

/**
 * Restore from backup - Smart restore that handles mismatched tables
 * 
 * Strategy:
 * 1. Create a pre-restore backup of current DB
 * 2. Close current DB connection
 * 3. Open the backup DB (read-only)
 * 4. Reinitialize current DB with fresh schema (via reopen which calls initializeDatabase)
 * 5. For each table in the current schema:
 *    - If the table exists in backup: copy all matching columns from backup
 *    - If the table does NOT exist in backup: leave it empty (null/default)
 * 6. Extra tables in backup that don't exist in current schema are ignored
 */
const restoreBackup = async (filename) => {
  try {
    const backupPath = path.join(BACKUP_DIR, filename);
    
    if (!fs.existsSync(backupPath)) {
      return { success: false, error: "Backup file not found" };
    }

    // Step 1: Create a pre-restore backup of current database
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const preRestoreBackupFile = `pre_restore_${timestamp}.db`;
    const preRestoreBackup = path.join(BACKUP_DIR, preRestoreBackupFile);
    
    if (fs.existsSync(DB_PATH)) {
      fs.copyFileSync(DB_PATH, preRestoreBackup);
      console.log(`📦 Pre-restore backup created: ${preRestoreBackupFile}`);
    }

    // Step 2: Close existing database connection
    const dbModule = require("../config/db.sqlite");
    if (dbModule.end) {
      dbModule.end();
    }

    // Wait to ensure closure
    await new Promise(resolve => setTimeout(resolve, 500));

    // Step 3: Open backup DB read-only to read data
    let backupDb;
    try {
      // Merge WAL if exists  
      const backupWal = backupPath + "-wal";
      const backupShm = backupPath + "-shm";
      
      backupDb = new Database(backupPath, { readonly: false, fileMustExist: true });
      backupDb.pragma('journal_mode = DELETE'); // Force WAL checkpoint
      backupDb.pragma('wal_checkpoint(TRUNCATE)');
      backupDb.close();
      
      // Now open read-only
      backupDb = new Database(backupPath, { readonly: true, fileMustExist: true });
    } catch (err) {
      console.error("Failed to open backup DB:", err.message);
      // Try to reopen original DB
      try {
        delete require.cache[require.resolve("../config/db.sqlite")]; 
        const freshDb = require("../config/db.sqlite");
        if (freshDb.reopen) freshDb.reopen();
      } catch (e) { /* ignore */ }
      return { success: false, error: "Failed to open backup database: " + err.message };
    }

    // Step 4: Get list of tables from backup
    let backupTables = {};
    try {
      const tables = backupDb.prepare(`
        SELECT name, sql FROM sqlite_master 
        WHERE type='table' AND name NOT LIKE 'sqlite_%'
      `).all();
      
      for (const t of tables) {
        try {
          const columns = backupDb.prepare(`PRAGMA table_info('${t.name}')`).all();
          backupTables[t.name] = {
            sql: t.sql,
            columns: columns.map(c => c.name)
          };
        } catch (e) {
          console.warn(`  ⚠️ Could not read columns for backup table ${t.name}`);
        }
      }
      console.log(`📋 Backup has ${Object.keys(backupTables).length} tables: ${Object.keys(backupTables).join(', ')}`);
    } catch (err) {
      backupDb.close();
      console.error("Failed to read backup tables:", err.message);
      try {
        delete require.cache[require.resolve("../config/db.sqlite")];
        const freshDb = require("../config/db.sqlite");
        if (freshDb.reopen) freshDb.reopen();
      } catch (e) { /* ignore */ }
      return { success: false, error: "Failed to read backup database structure: " + err.message };
    }

    // Step 5: Read all data from backup tables into memory
    const backupData = {};
    for (const [tableName, tableInfo] of Object.entries(backupTables)) {
      try {
        backupData[tableName] = backupDb.prepare(`SELECT * FROM "${tableName}"`).all();
        console.log(`  📦 Read ${backupData[tableName].length} rows from ${tableName}`);
      } catch (err) {
        console.warn(`  ⚠️ Could not read data from backup table ${tableName}: ${err.message}`);
        backupData[tableName] = [];
      }
    }

    // Close backup DB
    backupDb.close();

    // Step 6: Delete current DB and recreate with fresh schema
    try {
      if (fs.existsSync(DB_PATH)) fs.unlinkSync(DB_PATH);
      const walPath = DB_PATH + "-wal";
      const shmPath = DB_PATH + "-shm";
      if (fs.existsSync(walPath)) fs.unlinkSync(walPath);
      if (fs.existsSync(shmPath)) fs.unlinkSync(shmPath);
    } catch (err) {
      console.warn("Could not delete old DB files:", err.message);
    }

    // Clear require cache and reinitialize DB (this creates fresh schema)
    delete require.cache[require.resolve("../config/db.sqlite")];
    const freshDbModule = require("../config/db.sqlite");
    
    // The require above triggers initializeDatabase() which creates all tables with current schema
    
    // Step 7: Get current schema tables
    const currentTables = {};
    try {
      const tables = freshDbModule.db.prepare(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name NOT LIKE 'sqlite_%'
      `).all();
      
      for (const t of tables) {
        const columns = freshDbModule.db.prepare(`PRAGMA table_info('${t.name}')`).all();
        currentTables[t.name] = columns.map(c => c.name);
      }
      console.log(`📋 Current schema has ${Object.keys(currentTables).length} tables`);
    } catch (err) {
      console.error("Failed to read current schema:", err.message);
      return { success: false, error: "Failed to read current schema after recreation: " + err.message };
    }

    // Step 8: For each table in current schema, import matching data from backup
    freshDbModule.db.pragma('foreign_keys = OFF');
    
    let tablesRestored = 0;
    let tablesSkipped = 0;
    let totalRows = 0;
    const restoreLog = [];

    for (const [tableName, currentColumns] of Object.entries(currentTables)) {
      if (!backupData[tableName] || backupData[tableName].length === 0) {
        // Table doesn't exist in backup or has no data — leave empty with defaults
        if (!backupTables[tableName]) {
          restoreLog.push(`${tableName}: not in backup (left empty)`);
        } else {
          restoreLog.push(`${tableName}: empty in backup`);
        }
        tablesSkipped++;
        continue;
      }

      try {
        // Clear any seed data that was created during schema init
        freshDbModule.db.prepare(`DELETE FROM "${tableName}"`).run();
        
        // Find matching columns between backup and current schema
        const backupColumns = backupTables[tableName]?.columns || [];
        const matchingColumns = currentColumns.filter(c => backupColumns.includes(c));
        
        if (matchingColumns.length === 0) {
          restoreLog.push(`${tableName}: no matching columns (skipped)`);
          tablesSkipped++;
          continue;
        }

        const columnList = matchingColumns.map(c => `"${c}"`).join(', ');
        const placeholders = matchingColumns.map(() => '?').join(', ');
        
        const insertStmt = freshDbModule.db.prepare(
          `INSERT INTO "${tableName}" (${columnList}) VALUES (${placeholders})`
        );

        const insertAll = freshDbModule.db.transaction((rows) => {
          let count = 0;
          for (const row of rows) {
            try {
              const values = matchingColumns.map(col => {
                const val = row[col];
                return val === undefined ? null : val;
              });
              insertStmt.run(...values);
              count++;
            } catch (rowErr) {
              // Skip rows that fail (e.g., unique constraint violations)
              // This is expected for seed data conflicts
            }
          }
          return count;
        });

        const rowCount = insertAll(backupData[tableName]);
        totalRows += rowCount;
        tablesRestored++;
        
        const extraInBackup = backupColumns.filter(c => !currentColumns.includes(c));
        const missingInBackup = currentColumns.filter(c => !backupColumns.includes(c));
        
        let note = `${rowCount}/${backupData[tableName].length} rows`;
        if (extraInBackup.length > 0) note += `, ignored cols: ${extraInBackup.join(',')}`;
        if (missingInBackup.length > 0) note += `, nulled cols: ${missingInBackup.join(',')}`;
        
        restoreLog.push(`${tableName}: ${note}`);
        console.log(`  ✅ ${tableName}: ${rowCount} rows restored`);
      } catch (err) {
        console.warn(`  ⚠️ ${tableName}: restore failed - ${err.message}`);
        restoreLog.push(`${tableName}: FAILED - ${err.message}`);
        tablesSkipped++;
      }
    }

    // Log tables that exist in backup but not in current schema
    for (const tableName of Object.keys(backupTables)) {
      if (!currentTables[tableName]) {
        restoreLog.push(`${tableName}: exists in backup but not in current schema (ignored)`);
        console.log(`  ℹ️ ${tableName}: exists in backup but not in current schema (ignored)`);
      }
    }

    freshDbModule.db.pragma('foreign_keys = ON');

    console.log(`\n✅ Restore complete from: ${filename}`);
    console.log(`   Tables restored: ${tablesRestored}, Skipped: ${tablesSkipped}, Total rows: ${totalRows}`);

    // Wait for stabilization
    await new Promise(resolve => setTimeout(resolve, 500));

    return { 
      success: true, 
      restoredFrom: filename,
      preRestoreBackup: preRestoreBackupFile,
      tablesRestored,
      tablesSkipped,
      totalRows,
      details: restoreLog,
      requireRestart: true,
      message: "Backup restored successfully. Please restart the application for changes to take full effect."
    };
  } catch (error) {
    console.error("Restore error:", error.message);
    // Try to recover by reopening DB
    try {
      delete require.cache[require.resolve("../config/db.sqlite")];
      const freshDb = require("../config/db.sqlite");
      if (freshDb.reopen) freshDb.reopen();
    } catch (e) { /* ignore */ }
    return { success: false, error: error.message };
  }
};

/**
 * Delete a backup
 */
const deleteBackup = async (filename) => {
  try {
    const backupPath = path.join(BACKUP_DIR, filename);
    
    if (!fs.existsSync(backupPath)) {
      return { success: false, error: "Backup file not found" };
    }

    fs.unlinkSync(backupPath);
    
    // Also delete WAL and SHM if they exist
    const walPath = backupPath + "-wal";
    const shmPath = backupPath + "-shm";
    
    if (fs.existsSync(walPath)) fs.unlinkSync(walPath);
    if (fs.existsSync(shmPath)) fs.unlinkSync(shmPath);

    console.log(`✅ Deleted backup: ${filename}`);
    
    return { success: true };
  } catch (error) {
    console.error("Delete backup error:", error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Restore from an uploaded external backup file
 */
const restoreBackupFromFile = async (uploadedFilePath, originalFilename) => {
  try {
    const fs = require("fs");
    
    // Copy uploaded file to backup directory
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupFileName = `uploaded_${timestamp}.db`;
    const backupPath = path.join(BACKUP_DIR, backupFileName);
    
    fs.copyFileSync(uploadedFilePath, backupPath);
    
    // Delete temp file
    fs.unlinkSync(uploadedFilePath);
    
    // Now restore using the standard restore function
    const result = await restoreBackup(backupFileName);
    
    return result;
  } catch (error) {
    console.error("Upload and restore error:", error.message);
    return { success: false, error: error.message };
  }
};

// Export all functions
module.exports = {
  createBackup,
  listBackups,
  restoreBackup,
  deleteBackup,
  restoreBackupFromFile,
  BACKUP_DIR,
  DB_PATH
};