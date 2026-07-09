const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');
const { DATA_DIR } = require('./paths');

// ============================================
// DATABASE PATH
// ============================================
const dbPath = path.join(DATA_DIR, 'hostel.db');

// Ensure directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// ============================================
// SCHEMA VERSION
// ============================================
const CURRENT_SCHEMA_VERSION = 26;

// ============================================
// DATABASE REPAIR FUNCTION
// ============================================
function repairDatabase() {
  console.log('\n🔧 DATABASE REPAIR INITIATED');
  
  const backupPath = path.join(DATA_DIR, `hostel_backup_${Date.now()}.db`);
  const tempPath = path.join(DATA_DIR, 'hostel_temp.db');
  
  try {
    // Create backup
    console.log('📦 Creating backup...');
    fs.copyFileSync(dbPath, backupPath);
    console.log('✅ Backup created:', backupPath);
    
    // Open corrupted database
    let oldDb;
    try {
      oldDb = new Database(dbPath, { readonly: true, fileMustExist: true });
      oldDb.pragma('writable_schema = ON');
    } catch (err) {
      console.error('❌ Cannot open corrupted database:', err.message);
      return false;
    }
    
    // Create new database
    console.log('📝 Creating fresh database...');
    const newDb = new Database(tempPath);
    newDb.pragma('journal_mode = WAL');
    newDb.pragma('foreign_keys = OFF');
    
    // Get tables from corrupted database
    let tables = [];
    try {
      tables = oldDb.prepare(`
        SELECT name, sql FROM sqlite_master 
        WHERE type='table' AND name NOT LIKE 'sqlite_%'
        ORDER BY name
      `).all();
      console.log(`📋 Found ${tables.length} tables to recover`);
    } catch (err) {
      console.error('⚠️ Cannot read schema:', err.message);
      oldDb.close();
      newDb.close();
      fs.unlinkSync(tempPath);
      return false;
    }
    
    // Recreate tables (without CHECK constraints)
    console.log('🏗️ Recreating tables...');
    let tablesCreated = 0;
    for (const table of tables) {
      try {
        if (table.sql) {
          // Remove problematic CHECK constraints
          let cleanSql = table.sql.replace(/CHECK\s*\([^)]+\)/gi, '');
          newDb.exec(cleanSql);
          tablesCreated++;
        }
      } catch (err) {
        console.warn(`  ⚠️ Table ${table.name}: ${err.message}`);
      }
    }
    
    // Copy data
    console.log('📊 Recovering data...');
    let totalRows = 0;
    for (const table of tables) {
      try {
        const columns = oldDb.prepare(`PRAGMA table_info('${table.name}')`).all();
        const columnNames = columns.map(c => c.name).join(', ');
        const placeholders = columns.map(() => '?').join(', ');
        
        const selectStmt = oldDb.prepare(`SELECT * FROM ${table.name}`);
        const insertStmt = newDb.prepare(
          `INSERT INTO ${table.name} (${columnNames}) VALUES (${placeholders})`
        );
        
        const copyTx = newDb.transaction(() => {
          let count = 0;
          try {
            for (const row of selectStmt.iterate()) {
              try {
                insertStmt.run(...Object.values(row));
                count++;
              } catch (rowErr) {
                // Skip corrupted rows
              }
            }
          } catch (iterErr) {
            console.warn(`  ⚠️ ${table.name}: Some rows skipped`);
          }
          return count;
        });
        
        const rowCount = copyTx();
        totalRows += rowCount;
        if (rowCount > 0) {
          console.log(`  ✅ ${table.name}: ${rowCount} rows recovered`);
        }
      } catch (err) {
        console.warn(`  ⚠️ ${table.name}: Could not recover data`);
      }
    }
    
    // Close databases
    oldDb.close();
    
    // Set schema version
    newDb.pragma(`user_version = ${CURRENT_SCHEMA_VERSION}`);
    
    // Optimize
    newDb.exec('VACUUM');
    newDb.close();
    
    // Replace corrupted database
    const corruptPath = path.join(DATA_DIR, 'hostel_corrupt.db');
    try {
      if (fs.existsSync(corruptPath)) {
        fs.unlinkSync(corruptPath);
      }
      fs.renameSync(dbPath, corruptPath);
      fs.renameSync(tempPath, dbPath);
      
      console.log('✅ Database repaired successfully!');
      console.log(`📊 Recovered ${totalRows} rows from ${tablesCreated} tables`);
      return true;
    } catch (err) {
      console.error('❌ Could not replace database:', err.message);
      return false;
    }
  } catch (err) {
    console.error('❌ Repair failed:', err.message);
    if (fs.existsSync(tempPath)) {
      fs.unlinkSync(tempPath);
    }
    return false;
  }
}

// ============================================
// CORE SCHEMA DEFINITIONS (for migration use)
// ============================================
function getCoreSchemaDefinitions() {
  return {
    admins: `
      CREATE TABLE admins (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        is_active INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `,
    students: `
      CREATE TABLE students (
        student_id INTEGER PRIMARY KEY AUTOINCREMENT,
        form_date DATE,
        student_name TEXT NOT NULL,
        date_of_birth DATE,
        student_mobile TEXT,
        father_email TEXT,
        mother_email TEXT,
        class_or_coaching TEXT,
        institute_name TEXT,
        date_of_joining DATE NOT NULL,
        father_name TEXT,
        father_mobile TEXT,
        mother_name TEXT,
        mother_mobile TEXT,
        local_guardian_name TEXT,
        local_guardian_relation TEXT,
        local_guardian_mobile TEXT,
        id_type TEXT,
        id_number TEXT,
        address_line1 TEXT,
        address_line2 TEXT,
        address_line3 TEXT,
        photo_url TEXT,
        date_of_leaving DATE,
        monthly_fee REAL DEFAULT 0,
        security_deposit REAL DEFAULT 0,
        fee_start_month DATE,
        fee_end_month DATE,
        fee_term_months INTEGER DEFAULT 1,
        has_discount INTEGER DEFAULT 0,
        discount_type TEXT,
        discount_value REAL DEFAULT 0,
        discount_applicable TEXT,
        discount_months TEXT,
        discount_on_full_month INTEGER DEFAULT 1,
        fee_type_cycle TEXT DEFAULT 'monthly',
        next_fee_due_date DATE,
        original_security_deposit REAL,
        status TEXT DEFAULT 'active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `,
    rooms: `
      CREATE TABLE rooms (
        room_id INTEGER PRIMARY KEY AUTOINCREMENT,
        room_no TEXT UNIQUE NOT NULL,
        floor_no INTEGER NOT NULL,
        room_type TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `,
    beds: `
      CREATE TABLE beds (
        bed_id INTEGER PRIMARY KEY AUTOINCREMENT,
        room_id INTEGER NOT NULL,
        bed_no INTEGER NOT NULL,
        bed_label TEXT,
        bed_status TEXT DEFAULT 'available',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (room_id) REFERENCES rooms(room_id) ON DELETE CASCADE,
        UNIQUE(room_id, bed_no)
      )
    `,
    room_allocation: `
      CREATE TABLE room_allocation (
        allocation_id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id INTEGER NOT NULL,
        room_id INTEGER NOT NULL,
        bed_id INTEGER NOT NULL,
        allocation_date DATE NOT NULL,
        allocation_start_date DATE NOT NULL,
        allocation_end_date DATE,
        allocation_status TEXT DEFAULT 'active',
        checkout_date DATE,
        checkout_reason TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE,
        FOREIGN KEY (room_id) REFERENCES rooms(room_id) ON DELETE CASCADE,
        FOREIGN KEY (bed_id) REFERENCES beds(bed_id) ON DELETE CASCADE
      )
    `,
    student_fees: `
      CREATE TABLE student_fees (
        fee_id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id INTEGER NOT NULL,
        fee_type TEXT DEFAULT 'Monthly Rent',
        fee_month DATE,
        fee_amount REAL NOT NULL,
        discount_amount REAL DEFAULT 0,
        final_amount REAL NOT NULL,
        paid_amount REAL DEFAULT 0,
        previous_dues REAL DEFAULT 0,
        penalty_amount REAL DEFAULT 0,
        fine_amount REAL DEFAULT 0,
        property_damage_amount REAL DEFAULT 0,
        money_given_amount REAL DEFAULT 0,
        advance_used REAL DEFAULT 0,
        advance_received REAL DEFAULT 0,
        fee_status TEXT DEFAULT 'DUE',
        fee_date DATE NOT NULL,
        due_date DATE NOT NULL,
        fee_period_start DATE,
        fee_period_end DATE,
        invoice_number TEXT,
        invoice_generated_at DATETIME,
        paid_via_advance INTEGER DEFAULT 0,
        fine_adjustment_note TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE
      )
    `,
    fee_payments: `
      CREATE TABLE fee_payments (
        payment_id INTEGER PRIMARY KEY AUTOINCREMENT,
        fee_id INTEGER,
        student_id INTEGER NOT NULL,
        payment_amount REAL NOT NULL,
        payment_date DATE NOT NULL,
        payment_mode TEXT,
        reference_no TEXT,
        received_by TEXT DEFAULT 'ADMIN',
        received_member_id INTEGER,
        notes TEXT,
        invoice_number TEXT,
        breakdown TEXT,
        is_advance_payment INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE
      )
    `,
    student_advances: `
      CREATE TABLE student_advances (
        advance_id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id INTEGER NOT NULL,
        amount REAL NOT NULL,
        original_amount REAL NOT NULL,
        used_amount REAL DEFAULT 0,
        status TEXT DEFAULT 'PENDING',
        source_payment_id INTEGER,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE
      )
    `,
    pending_fines: `
      CREATE TABLE pending_fines (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id INTEGER NOT NULL,
        amount REAL NOT NULL,
        fine_type TEXT DEFAULT 'FINE',
        note TEXT,
        applied_to_fee_id INTEGER,
        applied_at DATETIME,
        deducted_from_security INTEGER DEFAULT 0,
        status TEXT DEFAULT 'PENDING',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE
      )
    `,
    property_damage_records: `
      CREATE TABLE property_damage_records (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id INTEGER NOT NULL,
        amount REAL NOT NULL,
        deducted_from_security INTEGER DEFAULT 0,
        remaining_security REAL,
        fee_id INTEGER,
        note TEXT,
        damage_type TEXT DEFAULT 'GENERAL',
        status TEXT DEFAULT 'PENDING',
        applied_to_fee_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE
      )
    `,
    money_given_records: `
      CREATE TABLE money_given_records (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id INTEGER NOT NULL,
        amount REAL NOT NULL,
        note TEXT,
        given_by TEXT DEFAULT 'ADMIN',
        deducted_from_security INTEGER DEFAULT 0,
        status TEXT DEFAULT 'PENDING',
        applied_to_fee_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE
      )
    `,
    security_deposit_history: `
      CREATE TABLE security_deposit_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id INTEGER NOT NULL,
        previous_amount REAL NOT NULL,
        new_amount REAL NOT NULL,
        change_amount REAL NOT NULL,
        change_type TEXT NOT NULL,
        reason TEXT,
        reference_id INTEGER,
        reference_type TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE
      )
    `,
    penalty_settings: `
      CREATE TABLE penalty_settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        enabled INTEGER DEFAULT 0,
        penalty_type TEXT DEFAULT 'fixed',
        fixed_amount REAL DEFAULT 0,
        percentage REAL DEFAULT 0,
        max_penalty REAL DEFAULT 0,
        grace_days INTEGER DEFAULT 5,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `,
    ledger_entries: `
      CREATE TABLE ledger_entries (
        entry_id INTEGER PRIMARY KEY AUTOINCREMENT,
        entry_date DATE NOT NULL,
        entry_type TEXT NOT NULL,
        category TEXT NOT NULL,
        amount REAL NOT NULL,
        debit REAL DEFAULT 0,
        credit REAL DEFAULT 0,
        balance REAL DEFAULT 0,
        payment_mode TEXT,
        reference_no TEXT,
        description TEXT,
        student_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE SET NULL
      )
    `,
    settings: `
      CREATE TABLE settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        setting_key TEXT UNIQUE NOT NULL,
        setting_value TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `,
    members: `
      CREATE TABLE members (
        member_id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        mobile TEXT,
        email TEXT,
        role TEXT DEFAULT 'staff',
        photo_url TEXT,
        dob DATE,
        id_type TEXT,
        id_number TEXT,
        salary REAL DEFAULT 0,
        father_name TEXT,
        date_of_joining DATE,
        address TEXT,
        fee_commission_percent REAL DEFAULT 0,
        is_active INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `,
    member_transactions: `
      CREATE TABLE member_transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        member_id INTEGER NOT NULL,
        amount REAL NOT NULL,
        transaction_type TEXT DEFAULT 'fee_collection',
        description TEXT,
        reference_no TEXT,
        student_id INTEGER,
        fee_month TEXT,
        salary_month TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (member_id) REFERENCES members(member_id) ON DELETE CASCADE
      )
    `,
    member_salary_payments: `
      CREATE TABLE member_salary_payments (
        payment_id INTEGER PRIMARY KEY AUTOINCREMENT,
        member_id INTEGER NOT NULL,
        amount REAL NOT NULL,
        payment_date DATE NOT NULL,
        payment_month TEXT NOT NULL,
        payment_year INTEGER NOT NULL,
        payment_type TEXT DEFAULT 'manual',
        payment_mode TEXT DEFAULT 'Cash',
        reference_no TEXT,
        notes TEXT,
        receipt_number TEXT UNIQUE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (member_id) REFERENCES members(member_id) ON DELETE CASCADE
      )
    `,
    member_salary_advances: `
      CREATE TABLE member_salary_advances (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        member_id INTEGER NOT NULL,
        amount REAL NOT NULL,
        used_amount REAL DEFAULT 0,
        source_month TEXT NOT NULL,
        source_year INTEGER NOT NULL,
        target_month TEXT NOT NULL,
        target_year INTEGER NOT NULL,
        status TEXT DEFAULT 'PENDING',
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        applied_at DATETIME,
        FOREIGN KEY (member_id) REFERENCES members(member_id) ON DELETE CASCADE
      )
    `,
    audit_logs: `
      CREATE TABLE audit_logs (
        log_id INTEGER PRIMARY KEY AUTOINCREMENT,
        admin_id INTEGER,
        action TEXT NOT NULL,
        table_name TEXT,
        record_id INTEGER,
        old_value TEXT,
        new_value TEXT,
        ip_address TEXT,
        user_agent TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `,
    reminder_counter: `
      CREATE TABLE reminder_counter (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id INTEGER NOT NULL,
        fee_id INTEGER NOT NULL,
        last_account_id INTEGER,
        last_sent_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(student_id, fee_id)
      )
    `,
    notification_logs: `
      CREATE TABLE notification_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id INTEGER NOT NULL,
        notification_type TEXT NOT NULL,
        notification_method TEXT NOT NULL,
        notification_status TEXT NOT NULL,
        notification_message TEXT,
        sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE
      )
    `,
    reminder_logs: `
      CREATE TABLE reminder_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id INTEGER NOT NULL,
        fee_id INTEGER,
        reminder_type TEXT NOT NULL,
        reminder_method TEXT NOT NULL,
        reminder_status TEXT NOT NULL,
        sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE
      )
    `
  };
}

// ============================================
// INTELLIGENT DATABASE MIGRATION & MERGE
// ============================================
function migrateAndMergeDatabases() {
  console.log('\n🔄 INTELLIGENT DATABASE MIGRATION & MERGE INITIATED');
  
  const backupPath = path.join(DATA_DIR, `hostel_backup_pre_migration_${Date.now()}.db`);
  const tempPath = path.join(DATA_DIR, 'hostel_temp_migration.db');
  
  try {
    // Create backup of current database before migration
    if (fs.existsSync(dbPath)) {
      console.log('📦 Creating backup before migration...');
      fs.copyFileSync(dbPath, backupPath);
      console.log('✅ Backup created:', backupPath);
    }
    
    // Open old database (if exists)
    let oldDb;
    let oldTables = [];
    let hasOldData = false;
    
    if (fs.existsSync(dbPath)) {
      try {
        oldDb = new Database(dbPath, { readonly: true, fileMustExist: true });
        
        // Get all tables from old database (excluding system tables)
        oldTables = oldDb.prepare(`
          SELECT name, sql FROM sqlite_master 
          WHERE type='table' AND name NOT LIKE 'sqlite_%'
          ORDER BY name
        `).all();
        
        if (oldTables.length > 0) {
          hasOldData = true;
          console.log(`📋 Old database has ${oldTables.length} tables`);
          oldTables.forEach(t => console.log(`   - ${t.name}`));
        }
      } catch (err) {
        console.warn('⚠️ Could not read old database:', err.message);
        // Continue without old database
      }
    }
    
    // Create new fresh database with current schema
    console.log('📝 Creating new database with fresh schema...');
    const newDb = new Database(tempPath);
    newDb.pragma('journal_mode = WAL');
    newDb.pragma('foreign_keys = OFF');
    newDb.pragma('synchronous = NORMAL');
    
    // Create all tables with current schema
    const schemaDefinitions = getCoreSchemaDefinitions();
    const validTableNames = new Set(Object.keys(schemaDefinitions));
    
    console.log('🏗️ Creating current schema tables...');
    for (const [tableName, sql] of Object.entries(schemaDefinitions)) {
      try {
        newDb.exec(sql);
        console.log(`  ✅ Created: ${tableName}`);
      } catch (err) {
        console.warn(`  ⚠️ ${tableName}:`, err.message);
      }
    }
    
    // Helper to get table columns
    function getTableColumns(db, tableName) {
      try {
        const cols = db.prepare(`PRAGMA table_info("${tableName}")`).all();
        return cols.map(c => ({
          name: c.name,
          type: c.type,
          notnull: c.notnull,
          dflt_value: c.dflt_value,
          pk: c.pk
        }));
      } catch (err) {
        console.warn(`⚠️ Could not get columns for ${tableName}:`, err.message);
        return [];
      }
    }
    
    // Process each old table and merge data (ONLY for tables that exist in new schema)
    if (hasOldData && oldDb && oldTables.length > 0) {
      console.log('\n🔀 MERGING OLD DATA INTO NEW SCHEMA');
      console.log('🗑️  Tables/columns NOT in new schema will be IGNORED (deleted)');
      
      let totalRowsMerged = 0;
      let tablesIgnored = 0;
      
      for (const oldTable of oldTables) {
        const tableName = oldTable.name;
        console.log(`\n  📊 Processing: ${tableName}`);
        
        try {
          // ⚠️ CHECK: Only process if table exists in new schema
          if (!validTableNames.has(tableName)) {
            console.log(`    🗑️  Table NOT in new schema - IGNORING (will be deleted)`);
            tablesIgnored++;
            continue;
          }
          
          // Get column info from old table
          const oldColumns = getTableColumns(oldDb, tableName);
          
          if (oldColumns.length === 0) {
            console.warn(`    ⚠️ No columns found in old table, skipping`);
            continue;
          }
          
          // Get columns from new schema table
          const newColumns = getTableColumns(newDb, tableName);
          
          if (newColumns.length === 0) {
            console.warn(`    ⚠️ No columns in new table, skipping`);
            continue;
          }
          
          console.log(`    ✅ Table exists in new schema (${newColumns.length} columns)`);
          
          // Map old columns to new columns (ONLY columns that exist in BOTH)
          const newColumnNames = new Set(newColumns.map(c => c.name));
          const mappedOldCols = oldColumns.filter(c => newColumnNames.has(c.name)).map(c => c.name);
          
          // Report columns that will be deleted
          const deletedColumns = oldColumns.filter(c => !newColumnNames.has(c.name)).map(c => c.name);
          if (deletedColumns.length > 0) {
            console.log(`    🗑️  Columns NOT in new schema (will be deleted): ${deletedColumns.join(', ')}`);
          }
          
          if (mappedOldCols.length === 0) {
            console.warn(`    ⚠️ No matching columns to migrate`);
            continue;
          }
          
          console.log(`    📋 Migrating columns: ${mappedOldCols.join(', ')}`);
          
          // Get data from old table (ONLY columns that exist in new schema)
          const selectSql = `SELECT ${mappedOldCols.map(c => `"${c}"`).join(', ')} FROM "${tableName}"`;
          let oldData = [];
          
          try {
            oldData = oldDb.prepare(selectSql).all();
          } catch (err) {
            console.warn(`    ⚠️ Could not read data:`, err.message);
            oldData = [];
          }
          
          if (oldData.length === 0) {
            console.log(`    📭 No data to migrate from old table`);
            continue;
          }
          
          // Insert data into new table
          let rowsMerged = 0;
          let rowsSkipped = 0;
          
          for (const row of oldData) {
            try {
              // Build insert values - ONLY include columns that exist in BOTH old and new
              const insertValues = {};
              
              for (const colName of mappedOldCols) {
                if (row.hasOwnProperty(colName)) {
                  insertValues[colName] = row[colName];
                }
              }
              
              const colNames = Object.keys(insertValues);
              if (colNames.length === 0) {
                rowsSkipped++;
                continue;
              }
              
              const placeholders = colNames.map(() => '?').join(', ');
              const insertSql = `INSERT INTO "${tableName}" (${colNames.map(c => `"${c}"`).join(', ')}) VALUES (${placeholders})`;
              
              try {
                newDb.prepare(insertSql).run(...Object.values(insertValues));
                rowsMerged++;
              } catch (rowErr) {
                // Skip rows that violate constraints (e.g., duplicate keys, foreign keys)
                rowsSkipped++;
              }
            } catch (err) {
              rowsSkipped++;
            }
          }
          
          if (rowsMerged > 0) {
            console.log(`    ✅ Merged ${rowsMerged}/${oldData.length} rows (${rowsSkipped} skipped)`);
            totalRowsMerged += rowsMerged;
          } else if (rowsSkipped > 0) {
            console.log(`    ⚠️ Skipped ${rowsSkipped} rows (constraint violations)`);
          }
          
        } catch (tableErr) {
          console.warn(`  ❌ Error processing ${tableName}:`, tableErr.message);
        }
      }
      
      console.log(`\n✅ MERGE COMPLETE: ${totalRowsMerged} total rows merged`);
      if (tablesIgnored > 0) {
        console.log(`🗑️  ${tablesIgnored} tables NOT in new schema were IGNORED (deleted)`);
      }
    } else if (!hasOldData) {
      console.log('📭 No old database data to merge, starting fresh');
    }
    
    // Close old database
    if (oldDb) {
      try {
        oldDb.close();
      } catch (err) { /* ignore */ }
    }
    
    // Set schema version on new database
    newDb.pragma(`user_version = ${CURRENT_SCHEMA_VERSION}`);
    
    // Create indexes
    console.log('📑 Creating indexes...');
    try {
      newDb.exec('CREATE INDEX IF NOT EXISTS idx_fees_student ON student_fees(student_id)');
      newDb.exec('CREATE INDEX IF NOT EXISTS idx_fees_status ON student_fees(fee_status)');
      newDb.exec('CREATE INDEX IF NOT EXISTS idx_fees_month ON student_fees(fee_month)');
      newDb.exec('CREATE INDEX IF NOT EXISTS idx_payments_student ON fee_payments(student_id)');
      newDb.exec('CREATE INDEX IF NOT EXISTS idx_advances_student ON student_advances(student_id)');
      newDb.exec('CREATE INDEX IF NOT EXISTS idx_fines_student ON pending_fines(student_id)');
      newDb.exec('CREATE INDEX IF NOT EXISTS idx_member_salary_member ON member_salary_payments(member_id)');
      newDb.exec('CREATE INDEX IF NOT EXISTS idx_member_salary_month_year ON member_salary_payments(payment_month, payment_year)');
      newDb.exec('CREATE INDEX IF NOT EXISTS idx_member_tx_member ON member_transactions(member_id)');
      newDb.exec('CREATE INDEX IF NOT EXISTS idx_member_tx_salary_month ON member_transactions(salary_month)');
      newDb.exec('CREATE INDEX IF NOT EXISTS idx_member_advances ON member_salary_advances(member_id, status)');
      console.log('  ✅ Indexes created');
    } catch (e) {
      console.warn('  ⚠️ Some indexes failed:', e.message);
    }
    
    // Optimize new database
    console.log('🔧 Optimizing database...');
    newDb.exec('VACUUM');
    newDb.exec('ANALYZE');
    newDb.close();
    
    // Replace old database with new one
    if (fs.existsSync(dbPath)) {
      const archivedPath = path.join(DATA_DIR, `hostel_old_schema_${Date.now()}.db`);
      try {
        fs.renameSync(dbPath, archivedPath);
        console.log(`📦 Old database archived as:`, path.basename(archivedPath));
      } catch (err) {
        console.warn('❌ Could not archive old database:', err.message);
        
        // If we can't archive, try to delete the old one
        try {
          fs.unlinkSync(dbPath);
          console.log('📦 Old database removed');
        } catch (delErr) {
          console.error('❌ Could not remove old database:', delErr.message);
          throw new Error('Cannot replace old database');
        }
      }
    }
    
    // Move new database to main location
    fs.renameSync(tempPath, dbPath);
    
    console.log('✅ Database migration and merge completed successfully!');
    console.log(`📁 New database ready at: ${dbPath}`);
    return true;
    
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    console.error(err.stack);
    
    // Cleanup temp file
    if (fs.existsSync(tempPath)) {
      try {
        fs.unlinkSync(tempPath);
      } catch (e) { /* ignore */ }
    }
    
    return false;
  }
}

// ============================================
// DATABASE CONNECTION WITH AUTO-REPAIR
// ============================================
let db;
let dbClosed = false;
let repairAttempted = false;
let migrationAttempted = false;

function openDatabase() {
  try {
    db = new Database(dbPath, { verbose: null });
    
    // Test database health
    try {
      db.pragma('integrity_check');
      db.prepare('SELECT 1').get();
      
      // Set pragmas
      db.pragma('journal_mode = WAL');
      db.pragma('busy_timeout = 5000');
      db.pragma('foreign_keys = OFF');
      db.pragma('synchronous = NORMAL');
      db.pragma('cache_size = -2000');
      
      return true;
    } catch (err) {
      console.error('❌ Database health check failed:', err.message);
      db.close();
      throw err;
    }
  } catch (err) {
    console.error('❌ Database open failed:', err.message);
    
    // Attempt migration once (for schema incompatibility)
    if (!migrationAttempted) {
      console.log('\n⚠️ Attempting database migration...');
      migrationAttempted = true;
      
      if (migrateAndMergeDatabases()) {
        console.log('🔄 Retrying with migrated database...');
        return openDatabase();
      }
    }
    
    // Attempt repair once (for corrupted databases)
    if (!repairAttempted && err.message.includes('malformed')) {
      console.log('\n⚠️ Database appears corrupted, attempting repair...');
      repairAttempted = true;
      
      if (repairDatabase()) {
        console.log('🔄 Retrying with repaired database...');
        return openDatabase();
      } else {
        console.error('❌ Repair failed, creating fresh database...');
        
        // Rename corrupted database and create fresh
        try {
          const corruptPath = path.join(DATA_DIR, `hostel_corrupt_${Date.now()}.db`);
          fs.renameSync(dbPath, corruptPath);
          console.log(`📦 Corrupted database saved as: ${corruptPath}`);
        } catch (renameErr) {
          console.error('⚠️ Could not rename corrupted database');
        }
        
        // Try opening again (will create fresh)
        db = new Database(dbPath, { verbose: null });
        db.pragma('journal_mode = WAL');
        db.pragma('busy_timeout = 5000');
        db.pragma('foreign_keys = OFF');
        db.pragma('synchronous = NORMAL');
        db.pragma('cache_size = -2000');
        return true;
      }
    }
    
    throw err;
  }
}

// ============================================
// HELPERS
// ============================================
function columnExists(table, column) {
  try {
    const cols = db.prepare(`PRAGMA table_info(${table})`).all();
    return cols.some(c => c.name === column);
  } catch (err) {
    console.warn(`⚠️ columnExists(${table}.${column}):`, err.message);
    return false;
  }
}

function tableExists(table) {
  try {
    const r = db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`).get(table);
    return !!r;
  } catch (err) {
    console.warn(`⚠️ tableExists(${table}):`, err.message);
    return false;
  }
}

function safeAddColumn(table, column, def) {
  if (!columnExists(table, column)) {
    try {
      db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${def}`);
      console.log(`  ✅ Added: ${table}.${column}`);
      return true;
    } catch (e) {
      console.warn(`  ⚠️ ${table}.${column}:`, e.message);
    }
  }
  return false;
}

function safeCreateTable(name, sql) {
  if (!tableExists(name)) {
    try {
      db.exec(sql);
      console.log(`  ✅ Created table: ${name}`);
      return true;
    } catch (e) {
      console.warn(`  ⚠️ ${name}:`, e.message);
    }
  }
  return false;
}

// ============================================
// CHECK CONSTRAINT REMOVAL MIGRATION
// ============================================
function removeCheckConstraints() {
  console.log('🔧 Checking for legacy CHECK constraints...');

  const tablesToFix = [
    { name: 'student_advances', statusField: 'status' },
    { name: 'pending_fines', statusField: 'status' },
    { name: 'member_transactions', statusField: 'transaction_type' },
    { name: 'student_fees', statusField: 'fee_status' },
    { name: 'students', statusField: 'status' }
  ];

  for (const tableConfig of tablesToFix) {
    const tableName = tableConfig.name;
    const tableInfo = db.prepare(`SELECT sql FROM sqlite_master WHERE type='table' AND name=?`).get(tableName);

    if (tableInfo?.sql && tableInfo.sql.includes('CHECK')) {
      console.log(`  ⚠️ Found CHECK constraint in ${tableName} table, recreating...`);

      try {
        // Backup data
        db.exec(`CREATE TABLE IF NOT EXISTS ${tableName}_backup AS SELECT * FROM ${tableName}`);
        db.exec(`DROP TABLE IF EXISTS ${tableName}`);

        // Recreate based on table name
        if (tableName === 'student_advances') {
          db.exec(`
            CREATE TABLE student_advances (
              advance_id INTEGER PRIMARY KEY AUTOINCREMENT,
              student_id INTEGER NOT NULL,
              amount REAL NOT NULL,
              original_amount REAL NOT NULL,
              used_amount REAL DEFAULT 0,
              status TEXT DEFAULT 'PENDING',
              source_payment_id INTEGER,
              notes TEXT,
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE
            )
          `);
        } else if (tableName === 'pending_fines') {
          db.exec(`
            CREATE TABLE pending_fines (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              student_id INTEGER NOT NULL,
              amount REAL NOT NULL,
              fine_type TEXT DEFAULT 'FINE',
              note TEXT,
              applied_to_fee_id INTEGER,
              applied_at DATETIME,
              status TEXT DEFAULT 'PENDING',
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE
            )
          `);
        } else if (tableName === 'member_transactions') {
          db.exec(`
            CREATE TABLE member_transactions (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              member_id INTEGER NOT NULL,
              amount REAL NOT NULL,
              transaction_type TEXT DEFAULT 'fee_collection',
              description TEXT,
              reference_no TEXT,
              student_id INTEGER,
              fee_month TEXT,
              salary_month TEXT,
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              FOREIGN KEY (member_id) REFERENCES members(member_id) ON DELETE CASCADE
            )
          `);
        } else if (tableName === 'student_fees') {
          db.exec(`
            CREATE TABLE student_fees (
              fee_id INTEGER PRIMARY KEY AUTOINCREMENT,
              student_id INTEGER NOT NULL,
              fee_type TEXT DEFAULT 'Monthly Rent',
              fee_month DATE,
              fee_amount REAL NOT NULL,
              discount_amount REAL DEFAULT 0,
              final_amount REAL NOT NULL,
              paid_amount REAL DEFAULT 0,
              previous_dues REAL DEFAULT 0,
              penalty_amount REAL DEFAULT 0,
              fine_amount REAL DEFAULT 0,
              property_damage_amount REAL DEFAULT 0,
              money_given_amount REAL DEFAULT 0,
              advance_used REAL DEFAULT 0,
              advance_received REAL DEFAULT 0,
              fee_status TEXT DEFAULT 'DUE',
              fee_date DATE NOT NULL,
              due_date DATE NOT NULL,
              fee_period_start DATE,
              fee_period_end DATE,
              invoice_number TEXT,
              invoice_generated_at DATETIME,
              paid_via_advance INTEGER DEFAULT 0,
              fine_adjustment_note TEXT,
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE
            )
          `);
        } else if (tableName === 'students') {
          // Recreate students table WITHOUT any CHECK constraints
          db.exec(`
            CREATE TABLE students (
              student_id INTEGER PRIMARY KEY AUTOINCREMENT,
              form_date DATE,
              student_name TEXT NOT NULL,
              date_of_birth DATE,
              student_mobile TEXT,
              father_email TEXT,
              mother_email TEXT,
              class_or_coaching TEXT,
              institute_name TEXT,
              date_of_joining DATE NOT NULL,
              father_name TEXT,
              father_mobile TEXT,
              mother_name TEXT,
              mother_mobile TEXT,
              local_guardian_name TEXT,
              local_guardian_relation TEXT,
              local_guardian_mobile TEXT,
              id_type TEXT,
              id_number TEXT,
              address_line1 TEXT,
              address_line2 TEXT,
              address_line3 TEXT,
              photo_url TEXT,
              date_of_leaving DATE,
              monthly_fee REAL DEFAULT 0,
              security_deposit REAL DEFAULT 0,
              fee_start_month DATE,
              fee_end_month DATE,
              fee_term_months INTEGER DEFAULT 1,
              has_discount INTEGER DEFAULT 0,
              discount_type TEXT,
              discount_value REAL DEFAULT 0,
              discount_applicable TEXT,
              discount_months TEXT,
              discount_on_full_month INTEGER DEFAULT 1,
              fee_type_cycle TEXT DEFAULT 'monthly',
              next_fee_due_date DATE,
              original_security_deposit REAL,
              status TEXT DEFAULT 'active',
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
          `);
        }

        // Restore data using column-mapped insert (works for all tables)
        const backupData = db.prepare(`SELECT * FROM ${tableName}_backup`).all();
        if (backupData.length > 0) {
          console.log(`  📦 Restoring ${backupData.length} records to ${tableName}...`);

          if (tableName === 'students' || tableName === 'student_fees') {
            // Use the actual table name for PRAGMA so students and student_fees each use their own columns
            const cols = db.prepare(`PRAGMA table_info('${tableName}')`).all().map(c => c.name);
            const placeholders = cols.map(() => '?').join(', ');
            const insert = db.prepare(`INSERT INTO "${tableName}" (${cols.map(c=>`"${c}"`).join(', ')}) VALUES (${placeholders})`);
            for (const row of backupData) {
              try { insert.run(cols.map(c => row[c])); } catch (rowErr) { /* skip rows that violate other constraints */ }
            }
          } else if (tableName === 'student_advances') {
            const insert = db.prepare(`
              INSERT INTO student_advances (advance_id, student_id, amount, original_amount, used_amount, status, source_payment_id, notes, created_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `);
            for (const row of backupData) {
              insert.run(row.advance_id, row.student_id, row.amount, row.original_amount, row.used_amount, row.status || 'PENDING', row.source_payment_id, row.notes, row.created_at);
            }
          } else if (tableName === 'pending_fines') {
            const insert = db.prepare(`
              INSERT INTO pending_fines (id, student_id, amount, fine_type, note, applied_to_fee_id, applied_at, status, created_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `);
            for (const row of backupData) {
              insert.run(row.id, row.student_id, row.amount, row.fine_type, row.note, row.applied_to_fee_id, row.applied_at, row.status || 'PENDING', row.created_at);
            }
          } else if (tableName === 'member_transactions') {
            const insert = db.prepare(`
              INSERT INTO member_transactions (id, member_id, amount, transaction_type, description, reference_no, student_id, fee_month, salary_month, created_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `);
            for (const row of backupData) {
              insert.run(row.id, row.member_id, row.amount, row.transaction_type || 'fee_collection', row.description, row.reference_no, row.student_id, row.fee_month, row.salary_month, row.created_at);
            }
          }

          console.log(`  ✅ Restored ${backupData.length} records`);
        }

        db.exec(`DROP TABLE IF EXISTS ${tableName}_backup`);
        console.log(`  ✅ ${tableName} table fixed`);
      } catch (e) {
        console.warn(`  ⚠️ Failed to fix ${tableName}:`, e.message);
      }
    }
  }
}

// ============================================
// CORE SCHEMA
// ============================================
function initializeCoreSchema() {
  console.log('📦 Initializing core schema...');

  const schemas = getCoreSchemaDefinitions();
  
  for (const [tableName, sql] of Object.entries(schemas)) {
    safeCreateTable(tableName, sql);
  }

  console.log('✅ Core schema initialized');
}

// ============================================
// MIGRATIONS
// ============================================
function runMigrations() {
  const currentVersion = db.pragma('user_version', { simple: true }) || 0;
  console.log(`📦 Migrations: v${currentVersion} → v${CURRENT_SCHEMA_VERSION}`);

  if (currentVersion < 13) {
    safeAddColumn('student_fees', 'previous_dues', 'REAL DEFAULT 0');
    safeAddColumn('student_fees', 'property_damage_amount', 'REAL DEFAULT 0');
    safeAddColumn('student_fees', 'money_given_amount', 'REAL DEFAULT 0');
  }

  if (currentVersion < 14) {
    safeAddColumn('fee_payments', 'invoice_number', 'TEXT');
    safeAddColumn('fee_payments', 'breakdown', 'TEXT');
    safeAddColumn('fee_payments', 'fee_id', 'INTEGER');
    safeAddColumn('fee_payments', 'is_advance_payment', 'INTEGER DEFAULT 0');
    safeAddColumn('property_damage_records', 'status', "TEXT DEFAULT 'PENDING'");
    safeAddColumn('property_damage_records', 'applied_to_fee_id', 'INTEGER');
    safeAddColumn('money_given_records', 'deducted_from_security', 'INTEGER DEFAULT 0');
    safeAddColumn('money_given_records', 'status', "TEXT DEFAULT 'PENDING'");
    safeAddColumn('money_given_records', 'applied_to_fee_id', 'INTEGER');
  }

  if (currentVersion < 16) {
    safeAddColumn('ledger_entries', 'debit', 'REAL DEFAULT 0');
    safeAddColumn('ledger_entries', 'credit', 'REAL DEFAULT 0');
    safeAddColumn('ledger_entries', 'balance', 'REAL DEFAULT 0');

    try {
      const oldEntries = db.prepare('SELECT * FROM ledger_entries WHERE debit = 0 AND credit = 0').all();
      if (oldEntries.length > 0) {
        oldEntries.forEach(e => {
          const debit = e.entry_type === 'income' ? e.amount : 0;
          const credit = e.entry_type === 'expense' ? e.amount : 0;
          db.prepare('UPDATE ledger_entries SET debit = ?, credit = ? WHERE entry_id = ?')
            .run(debit, credit, e.entry_id);
        });
        console.log('  ✅ Migrated ledger entries to debit/credit format');
      }
    } catch (e) { /* ignore */ }
  }

  if (currentVersion < 17) {
    safeAddColumn('student_fees', 'fine_adjustment_note', 'TEXT');
  }

  if (currentVersion < 18) {
    safeAddColumn('member_transactions', 'fee_month', 'TEXT');
    console.log('  ✅ v18: Fee month tracking added');
  }

  if (currentVersion < 19) {
    safeAddColumn('member_transactions', 'salary_month', 'TEXT');
    safeAddColumn('member_salary_payments', 'payment_type', "TEXT DEFAULT 'manual'");
    console.log('  ✅ v19: Salary advance system added');
  }

  // ✅ v20: Fix member_transactions CHECK constraint
  if (currentVersion < 20) {
    removeCheckConstraints();
    console.log('  ✅ v20: CHECK constraints removed');
  }

  // ✅ v21: Strip leading zeros from existing room numbers (e.g. "010" → "10")
  if (currentVersion < 21) {
    try {
      const updated = db.prepare(
        "UPDATE rooms SET room_no = CAST(CAST(room_no AS INTEGER) AS TEXT) WHERE room_no GLOB '0*' AND room_no != '0'"
      ).run();
      console.log(`  ✅ v21: Fixed ${updated.changes} room numbers with leading zeros`);
    } catch (e) {
      console.warn('  ⚠️ v21: Room number migration skipped:', e.message);
    }
  }

  // ✅ v22: Add deducted_from_security column to pending_fines
  if (currentVersion < 22) {
    safeAddColumn('pending_fines', 'deducted_from_security', 'INTEGER DEFAULT 0');
    console.log('  ✅ v22: Added deducted_from_security to pending_fines');
  }

  // ✅ v23: Remove CHECK constraint from student_fees (allows CANCELLED status on checkout)
  if (currentVersion < 23) {
    try {
      const tableInfo = db.prepare(`SELECT sql FROM sqlite_master WHERE type='table' AND name='student_fees'`).get();
      if (tableInfo?.sql && tableInfo.sql.includes('CHECK')) {
        console.log('  ⚠️ Found CHECK constraint in student_fees, removing...');
        removeCheckConstraints();
      }
      console.log('  ✅ v23: student_fees CHECK constraint migration done');
    } catch (e) {
      console.warn('  ⚠️ v23 migration skipped:', e.message);
    }
  }

  // ✅ v24/v25: Add discount_on_full_month column to students table
  if (currentVersion < 25) {
    safeAddColumn('students', 'discount_on_full_month', 'INTEGER DEFAULT 1');
    console.log('  ✅ v25: Added discount_on_full_month to students');
  }

  // ✅ v26: Remove CHECK constraint from students table (if old DB had one)
  if (currentVersion < 26) {
    try {
      const tableInfo = db.prepare(`SELECT sql FROM sqlite_master WHERE type='table' AND name='students'`).get();
      if (tableInfo?.sql && tableInfo.sql.toUpperCase().includes('CHECK')) {
        console.log('  ⚠️ Found CHECK constraint in students table, removing...');
        removeCheckConstraints();
        console.log('  ✅ v26: students table CHECK constraint removed');
      } else {
        console.log('  ✅ v26: students table has no CHECK constraint (OK)');
      }
    } catch (e) {
      console.warn('  ⚠️ v26 migration skipped:', e.message);
    }
  }

  // ============================================
  // CRITICAL SCHEMA UPDATES (Final Safeguard)
  // Ensures ALL necessary columns exist for newer code versions
  // ============================================
  
  // 1. STUDENTS Table Critical Columns
  safeAddColumn('students', 'updated_at', 'DATETIME DEFAULT CURRENT_TIMESTAMP');
  safeAddColumn('students', 'status', "TEXT DEFAULT 'active'");
  safeAddColumn('students', 'fee_type_cycle', "TEXT DEFAULT 'monthly'");
  safeAddColumn('students', 'next_fee_due_date', 'DATE');
  safeAddColumn('students', 'original_security_deposit', 'REAL');
  safeAddColumn('students', 'discount_on_full_month', 'INTEGER DEFAULT 1');
  safeAddColumn('students', 'payment_mode', "TEXT DEFAULT 'cash'");
  safeAddColumn('students', 'gender', "TEXT DEFAULT 'Girl'");

  // One-time migration for existing rows: default payment mode = cash, gender = Girl.
  try {
    db.prepare(`UPDATE students SET payment_mode = 'cash' WHERE payment_mode IS NULL OR payment_mode = ''`).run();
    db.prepare(`UPDATE students SET gender = 'Girl' WHERE gender IS NULL OR gender = '' OR gender = 'Female'`).run();
    db.prepare(`UPDATE students SET gender = 'Boy' WHERE gender = 'Male'`).run();
  } catch (e) {
    console.warn('Existing-student migration skipped:', e.message);
  }

  // (hostel_info is stored as a JSON row in `settings` — no schema change needed for gstin)

  // Document counters (invoice / receipt / bill numbers)
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS doc_counters (
        doc_type TEXT PRIMARY KEY,
        year INTEGER NOT NULL,
        counter INTEGER NOT NULL DEFAULT 0
      )
    `);
  } catch (e) {
    console.warn('doc_counters table creation skipped:', e.message);
  }

  // Sync queue — every write can log a row here; a worker will POST them to the
  // cloud when we go online. Kept unwired for now.
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS sync_queue (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        entity TEXT NOT NULL,          -- e.g. 'student', 'fee', 'ledger'
        entity_id INTEGER,             -- primary key of the changed row
        op TEXT NOT NULL,              -- 'insert' | 'update' | 'delete'
        payload TEXT,                  -- JSON snapshot of the row
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        sent_at DATETIME,              -- when the cloud accepted it
        error TEXT                     -- last push error (if any)
      )
    `);
    db.exec("CREATE INDEX IF NOT EXISTS idx_sync_queue_pending ON sync_queue(sent_at) WHERE sent_at IS NULL");
  } catch (e) {
    console.warn('sync_queue table creation skipped:', e.message);
  }

  // (Branch system removed — no branches table, no per-row branch_id.)

  // 2. STUDENT_FEES Table Critical Columns
  safeAddColumn('student_fees', 'updated_at', 'DATETIME DEFAULT CURRENT_TIMESTAMP');
  safeAddColumn('student_fees', 'discount_amount', 'REAL DEFAULT 0');
  safeAddColumn('student_fees', 'final_amount', 'REAL NOT NULL DEFAULT 0');
  safeAddColumn('student_fees', 'paid_amount', 'REAL DEFAULT 0');
  safeAddColumn('student_fees', 'previous_dues', 'REAL DEFAULT 0');
  safeAddColumn('student_fees', 'penalty_amount', 'REAL DEFAULT 0');
  safeAddColumn('student_fees', 'fine_amount', 'REAL DEFAULT 0');
  safeAddColumn('student_fees', 'property_damage_amount', 'REAL DEFAULT 0');
  safeAddColumn('student_fees', 'money_given_amount', 'REAL DEFAULT 0');
  safeAddColumn('student_fees', 'advance_used', 'REAL DEFAULT 0');
  safeAddColumn('student_fees', 'advance_received', 'REAL DEFAULT 0');
  safeAddColumn('student_fees', 'paid_via_advance', 'INTEGER DEFAULT 0');
  safeAddColumn('student_fees', 'fee_period_start', 'DATE');
  safeAddColumn('student_fees', 'fee_period_end', 'DATE');
  safeAddColumn('student_fees', 'invoice_number', 'TEXT');
  safeAddColumn('student_fees', 'invoice_generated_at', 'DATETIME');

  // 3. Additional Required Columns for Payment Sync
  safeAddColumn('property_damage_records', 'deducted_from_security', 'INTEGER DEFAULT 0');
  safeAddColumn('pending_fines', 'deducted_from_security', 'INTEGER DEFAULT 0');
  safeAddColumn('money_given_records', 'deducted_from_security', 'INTEGER DEFAULT 0');

  // 4. Create indexes (ensure all exist)
  try {
    db.exec('CREATE INDEX IF NOT EXISTS idx_fees_student ON student_fees(student_id)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_fees_status ON student_fees(fee_status)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_fees_month ON student_fees(fee_month)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_payments_student ON fee_payments(student_id)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_advances_student ON student_advances(student_id)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_fines_student ON pending_fines(student_id)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_member_salary_member ON member_salary_payments(member_id)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_member_salary_month_year ON member_salary_payments(payment_month, payment_year)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_member_tx_member ON member_transactions(member_id)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_member_tx_salary_month ON member_transactions(salary_month)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_member_advances ON member_salary_advances(member_id, status)');
  } catch (e) { /* ignore */ }

  db.pragma(`user_version = ${CURRENT_SCHEMA_VERSION}`);
  console.log(`✅ Schema at v${CURRENT_SCHEMA_VERSION}`);
}

// ============================================
// SEED DATA
// ============================================
function seedDefaultData() {
  try {
    const admin = db.prepare('SELECT id FROM admins WHERE id = 1').get();
    if (!admin) {
      db.prepare(`
        INSERT INTO admins (id, email, password, is_active)
        VALUES (1, 'admin@example.com', '$2b$10$Rn.Wemjw956Atj9gNgG2COnb6Eum3UGoEmiH6CdWtRgjJ4x9T2deG', 1)
      `).run();
      console.log('  ✅ Default admin created');
    }
  } catch (e) { /* ignore */ }

  try {
    const existing = db.prepare('SELECT id FROM penalty_settings LIMIT 1').get();
    if (!existing) {
      db.prepare(`
        INSERT INTO penalty_settings (enabled, penalty_type, fixed_amount, percentage, max_penalty, grace_days)
        VALUES (0, 'fixed', 50, 1, 500, 5)
      `).run();
      console.log('  ✅ Default penalty settings created');
    }
  } catch (e) {
    console.warn('  ⚠️ Failed to seed penalty settings:', e.message);
  }

  db.pragma('foreign_keys = ON');
}

// ============================================
// DATA CLEANUP / MIGRATION (Fixing old incorrect formats)
// ============================================
function runDataCleanup() {
  try {
    // 1. Fix issue where yearly/half_yearly fees generated before fee_type_cycle update were labelled "Monthly Rent"
    db.prepare(`
        UPDATE student_fees 
        SET fee_type = 'Yearly Rent' 
        WHERE fee_type = 'Monthly Rent' 
        AND student_id IN (SELECT student_id FROM students WHERE fee_type_cycle = 'yearly')
    `).run();

    db.prepare(`
        UPDATE student_fees 
        SET fee_type = 'Half-Yearly Rent' 
        WHERE fee_type = 'Monthly Rent' 
        AND student_id IN (SELECT student_id FROM students WHERE fee_type_cycle = 'half_yearly')
    `).run();

    // 2. MIGRATION: Convert pending_fines, property_damages, and money_given directly into student_fees.
    // This makes them explicitly show up as their own rows identically to Rent.
    
    // Fines
    db.prepare(`
      INSERT INTO student_fees (student_id, fee_type, fee_month, fee_amount, final_amount, fee_status, fee_date, due_date, fee_period_start, fee_period_end)
      SELECT student_id, 'Fine', date(created_at, 'start of month'), amount, amount, 'DUE', date(created_at), date(created_at, '+5 days'), date(created_at), date(created_at)
      FROM pending_fines
      WHERE status = 'PENDING'
    `).run();
    db.prepare(`UPDATE pending_fines SET status = 'TRANSFERRED' WHERE status = 'PENDING'`).run();

    // Property Damage
    db.prepare(`
      INSERT INTO student_fees (student_id, fee_type, fee_month, fee_amount, final_amount, fee_status, fee_date, due_date, fee_period_start, fee_period_end)
      SELECT student_id, 'Property Damage', date(created_at, 'start of month'), amount, amount, 'DUE', date(created_at), date(created_at, '+5 days'), date(created_at), date(created_at)
      FROM property_damage_records
      WHERE status = 'PENDING'
    `).run();
    db.prepare(`UPDATE property_damage_records SET status = 'TRANSFERRED' WHERE status = 'PENDING'`).run();

    // Money Given
    db.prepare(`
      INSERT INTO student_fees (student_id, fee_type, fee_month, fee_amount, final_amount, fee_status, fee_date, due_date, fee_period_start, fee_period_end)
      SELECT student_id, 'Money Given', date(created_at, 'start of month'), amount, amount, 'DUE', date(created_at), date(created_at, '+5 days'), date(created_at), date(created_at)
      FROM money_given_records
      WHERE status = 'PENDING'
    `).run();
    db.prepare(`UPDATE money_given_records SET status = 'TRANSFERRED' WHERE status = 'PENDING'`).run();
    
    console.log('✅ Applied data cleanup for older generic fee labels and converted pending items to native fees');
  } catch(e) {
    console.log('⚠️ Failed to apply data cleanups:', e.message);
  }
}

// ============================================
// INITIALIZE
// ============================================
function initializeDatabase() {
  console.log('\n==================================================');
  console.log('🗄️  DATABASE INITIALIZATION');
  console.log('==================================================');
  console.log(`📁 Path: ${dbPath}`);

  initializeCoreSchema();
  runMigrations();
  seedDefaultData();
  runDataCleanup();

  console.log('✅ Database ready\n');
}

// ============================================
// QUERY WRAPPER
// ============================================
const query = (sql, params = []) => {
  const trimmed = sql.trim().toUpperCase();
  const isSelect = trimmed.startsWith('SELECT') || trimmed.startsWith('PRAGMA') || trimmed.startsWith('WITH');

  if (isSelect) {
    const stmt = db.prepare(sql);
    return [params.length ? stmt.all(...params) : stmt.all()];
  } else {
    const stmt = db.prepare(sql);
    const result = params.length ? stmt.run(...params) : stmt.run();
    return [{ affectedRows: result.changes, insertId: result.lastInsertRowid }];
  }
};

const transaction = (fn) => db.transaction(fn)();

function safeCloseDb() {
  if (!dbClosed && db && db.open) {
    try {
      db.pragma('wal_checkpoint(TRUNCATE)');
      db.close();
      dbClosed = true;
      console.log('✅ Database closed');
    } catch (e) { /* ignore */ }
  }
}

function reopenDatabase() {
  if (db && db.open) {
    try {
      db.pragma('wal_checkpoint(TRUNCATE)');
      db.close();
    } catch (e) { /* ignore */ }
  }
  dbClosed = false;
  repairAttempted = false;
  migrationAttempted = false;
  openDatabase();
  
  // Reinitialize database schema after reopening
  initializeDatabase();
}

process.on('exit', safeCloseDb);
process.on('SIGINT', () => { safeCloseDb(); process.exit(0); });
process.on('SIGTERM', () => { safeCloseDb(); process.exit(0); });

// Open database and initialize
openDatabase();
initializeDatabase();

module.exports = { 
  query, 
  transaction, 
  get db() { return db; },
  end: safeCloseDb, 
  reopen: reopenDatabase, 
  columnExists, 
  tableExists, 
  safeAddColumn 
};