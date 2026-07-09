const fs = require("fs");
const path = require("path");
const { RUNTIME_DIR, isProduction } = require("../config/paths");

const isDev = !isProduction;
const markerFile = path.join(RUNTIME_DIR, "installed.flag");

// ✅ FIX: Handle empty string case with trim()
const APP_VERSION = (process.env.APP_VERSION || "").trim() || "1.0.0";

/**
 * Detect install mode
 * 
 * Returns:
 * - "DEV"       → Development mode, skip all install logic
 * - "FRESH"     → First ever install, no marker exists
 * - "REINSTALL" → App was upgraded (version changed)
 * - "INSTALLED" → Normal startup, no action needed
 */
function getInstallMode() {
  try {
    // 🔒 Never trigger install logic in dev
    if (isDev) return "DEV";

    // No marker = first install
    if (!fs.existsSync(markerFile)) {
      return "FRESH";
    }

    // Check version to detect upgrade/reinstall
    try {
      const markerContent = fs.readFileSync(markerFile, "utf8").trim();
      const markerData = JSON.parse(markerContent);
      
      if (markerData.version !== APP_VERSION) {
        // Version changed = reinstall/upgrade
        console.log(`📦 Version change detected: ${markerData.version} → ${APP_VERSION}`);
        return "REINSTALL";
      }
      
      // Same version = normal startup
      return "INSTALLED";
    } catch (parseErr) {
      // Old marker format (just timestamp) = treat as reinstall for safety
      console.log("⚠️ Old marker format detected, treating as reinstall");
      return "REINSTALL";
    }
  } catch (err) {
    console.error("❌ Install mode detection failed:", err.message);
    return "FRESH";
  }
}

/**
 * Mark application as installed with version info
 */
function markInstalled() {
  try {
    if (!fs.existsSync(RUNTIME_DIR)) {
      fs.mkdirSync(RUNTIME_DIR, { recursive: true });
    }

    // Always update marker with current version
    const markerData = {
      version: APP_VERSION,
      installedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Check if updating existing marker
    if (fs.existsSync(markerFile)) {
      try {
        const existing = JSON.parse(fs.readFileSync(markerFile, "utf8"));
        markerData.installedAt = existing.installedAt || markerData.installedAt;
      } catch {}
    }

    fs.writeFileSync(markerFile, JSON.stringify(markerData, null, 2), "utf8");
    console.log(`✅ Installation marked: v${APP_VERSION}`);
  } catch (err) {
    console.error("❌ Failed to mark installation:", err.message);
  }
}

/**
 * Force reset the install marker (for manual reinstall trigger)
 */
function resetInstallMarker() {
  try {
    if (fs.existsSync(markerFile)) {
      fs.unlinkSync(markerFile);
      console.log("🗑️ Install marker reset");
    }
  } catch (err) {
    console.error("❌ Failed to reset install marker:", err.message);
  }
}

/**
 * Get current install info
 */
function getInstallInfo() {
  try {
    if (!fs.existsSync(markerFile)) {
      return null;
    }
    return JSON.parse(fs.readFileSync(markerFile, "utf8"));
  } catch {
    return null;
  }
}

module.exports = {
  getInstallMode,
  markInstalled,
  resetInstallMarker,
  getInstallInfo,
  APP_VERSION
};