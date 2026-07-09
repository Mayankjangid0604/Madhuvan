/**
 * Logo Upload Middleware
 * Delegates to config/uploads.js to avoid duplication
 */
const { logoUpload } = require("../config/uploads");

module.exports = logoUpload;