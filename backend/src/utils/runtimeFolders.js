const { ensureDirectories, RUNTIME_DIR } = require("../config/paths");

/**
 * Ensure all runtime folders exist
 * Safe to call multiple times - delegates to paths.js
 */
function ensureRuntimeFolders() {
  ensureDirectories();
}

module.exports = {
  ensureRuntimeFolders,
  appDir: RUNTIME_DIR
};