const path = require("path");
const fs = require("fs");
const os = require("os");

const APP_NAME = "Madhuvan";
const isElectron = !!process.versions.electron;
const isProduction = process.env.NODE_ENV === "production" || isElectron;

// ============================================
// GET APP DATA DIRECTORY
// ============================================
const getAppDataDir = () => {
  if (process.platform === "win32") {
    return process.env.APPDATA || path.join(os.homedir(), "AppData", "Roaming");
  } else if (process.platform === "darwin") {
    return path.join(os.homedir(), "Library", "Application Support");
  } else {
    return path.join(os.homedir(), ".config");
  }
};

// ============================================
// DETERMINE BASE DIRECTORY
// ============================================
const RUNTIME_DIR = isProduction 
  ? path.join(getAppDataDir(), APP_NAME)
  : path.join(__dirname, "..", "..");

// ============================================
// DEFINE PATHS
// ============================================
const CONFIG_FILE = path.join(RUNTIME_DIR, "config.json");
const UPLOADS_DIR = path.join(RUNTIME_DIR, "uploads");
const STUDENTS_UPLOAD_DIR = path.join(UPLOADS_DIR, "students");
const LOGOS_UPLOAD_DIR = path.join(UPLOADS_DIR, "logos");
const MEMBERS_UPLOAD_DIR = path.join(UPLOADS_DIR, "members");
const DATA_DIR = path.join(RUNTIME_DIR, "data");

// ============================================
// ENSURE DIRECTORIES EXIST
// ============================================
function ensureDirectories() {
  const dirs = [
    RUNTIME_DIR,
    UPLOADS_DIR,
    STUDENTS_UPLOAD_DIR,
    LOGOS_UPLOAD_DIR,
    MEMBERS_UPLOAD_DIR,
    DATA_DIR
  ];

  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      try {
        fs.mkdirSync(dir, { recursive: true, mode: 0o755 });
        console.log(`   ✅ Created: ${dir}`);
      } catch (err) {
        console.error(`   ❌ Failed to create ${dir}:`, err.message);
      }
    }
  });
}

// ============================================
// EXPORTS
// ============================================
module.exports = {
  APP_NAME,
  RUNTIME_DIR,
  CONFIG_FILE,
  UPLOADS_DIR,
  STUDENTS_UPLOAD_DIR,
  LOGOS_UPLOAD_DIR,
  MEMBERS_UPLOAD_DIR,
  DATA_DIR,
  isProduction,
  isElectron,
  ensureDirectories
};