const fs = require("fs");
const path = require("path");
const os = require("os");

/**
 * Runtime base directory
 * Same logic as app.js
 */
const baseDir =
  process.env.APPDATA ||
  path.join(os.homedir(), "AppData", "Roaming");

const appDir = path.join(baseDir, "Madhuvan");

// Required runtime folders
const requiredDirs = [
  appDir,
  path.join(appDir, "uploads"),
  path.join(appDir, "uploads", "logos"),
  path.join(appDir, "uploads", "students"),
  path.join(appDir, "data"),
  path.join(appDir, "backups")
];

for (const dir of requiredDirs) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log("📁 Created:", dir);
  }
}

console.log("✅ Backend runtime folders ready");
