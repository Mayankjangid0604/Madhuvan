const authService = require("../services/auth.service");
const asyncHandler = require("../utils/asyncHandler");

/**
 * Admin Login
 * POST /api/auth/login
 */
exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: "Email and password are required"
    });
  }

  try {
    const result = await authService.login(email, password);

    return res.status(200).json({
      success: true,
      message: "Login successful",
      token: result.token,
      admin: result.admin
    });
  } catch (err) {
    // Check for specific errors
    if (err.message === "Invalid credentials" || err.message === "Admin account disabled") {
      return res.status(401).json({
        success: false,
        message: err.message
      });
    }

    console.error("Login error:", err.message);
    return res.status(500).json({
      success: false,
      message: "Login failed"
    });
  }
});

/**
 * Change Password
 * POST /api/auth/change-password
 */
exports.changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const adminId = req.admin?.id;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({
      success: false,
      message: "Current password and new password are required"
    });
  }

  if (!adminId) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized"
    });
  }

  try {
    const result = await authService.changePassword(adminId, currentPassword, newPassword);

    return res.status(200).json({
      success: true,
      message: result.message
    });
  } catch (err) {
    if (err.message === "Current password is incorrect") {
      return res.status(401).json({
        success: false,
        message: err.message
      });
    }

    if (err.message === "Admin not found") {
      return res.status(404).json({
        success: false,
        message: err.message
      });
    }

    if (err.message.includes("at least 6 characters")) {
      return res.status(400).json({
        success: false,
        message: err.message
      });
    }

    console.error("Change password error:", err.message);
    return res.status(500).json({
      success: false,
      message: "Failed to change password"
    });
  }
});

/**
 * Change Username (Email)
 * POST /api/auth/change-username
 */
exports.changeUsername = asyncHandler(async (req, res) => {
  const { currentPassword, newEmail } = req.body;
  const adminId = req.admin?.id;

  if (!currentPassword || !newEmail) {
    return res.status(400).json({
      success: false,
      message: "Current password and new username are required"
    });
  }
  if (!adminId) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }

  try {
    const result = await authService.changeEmail(adminId, currentPassword, newEmail);
    return res.status(200).json({
      success: true,
      message: result.message,
      token: result.token,
      admin: result.admin
    });
  } catch (err) {
    const msg = err.message || "Failed to change username";
    if (msg === "Current password is incorrect") {
      return res.status(401).json({ success: false, message: msg });
    }
    if (msg === "Invalid email format" ||
        msg === "This username is already taken" ||
        msg === "New username is the same as current username") {
      return res.status(400).json({ success: false, message: msg });
    }
    if (msg === "Admin not found") {
      return res.status(404).json({ success: false, message: msg });
    }
    console.error("Change username error:", msg);
    return res.status(500).json({ success: false, message: "Failed to change username" });
  }
});

/**
 * Get Current Admin Info
 * GET /api/auth/me
 */
exports.getCurrentAdmin = asyncHandler(async (req, res) => {
  const adminId = req.admin?.id;

  if (!adminId) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized"
    });
  }

  try {
    const admin = await authService.getAdminInfo(adminId);

    return res.status(200).json({
      success: true,
      data: admin
    });
  } catch (err) {
    if (err.message === "Admin not found") {
      return res.status(404).json({
        success: false,
        message: err.message
      });
    }

    console.error("Get current admin error:", err.message);
    return res.status(500).json({
      success: false,
      message: "Failed to get admin info"
    });
  }
});