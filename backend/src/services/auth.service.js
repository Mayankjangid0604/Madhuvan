const bcrypt = require("bcrypt");
const { generateToken } = require("../utils/jwt.util");
const { query } = require("../config/db.sqlite");

/**
 * Admin Login Service
 * @param {string} email 
 * @param {string} password 
 * @returns {Promise<{token: string, admin: object}>}
 */
exports.login = async (email, password) => {
  const emailNormalized = email.trim().toLowerCase();

  const [rows] = query(
    "SELECT id, email, password, is_active FROM admins WHERE LOWER(email) = ?",
    [emailNormalized]
  );

  const admin = Array.isArray(rows) ? rows[0] : rows;

  if (!admin) {
    throw new Error("Invalid credentials");
  }

  if (!admin.is_active) {
    throw new Error("Admin account disabled");
  }

  const isPasswordValid = await bcrypt.compare(password, admin.password);

  if (!isPasswordValid) {
    throw new Error("Invalid credentials");
  }

  const token = generateToken({
    id: admin.id,
    email: admin.email
  });

  return {
    token,
    admin: {
      id: admin.id,
      email: admin.email
    }
  };
};

/**
 * Change Password Service
 * @param {number} adminId 
 * @param {string} currentPassword 
 * @param {string} newPassword 
 * @returns {Promise<{message: string}>}
 */
exports.changePassword = async (adminId, currentPassword, newPassword) => {
  // Validate new password
  if (!newPassword || newPassword.length < 6) {
    throw new Error("New password must be at least 6 characters long");
  }

  const [rows] = query(
    "SELECT id, password FROM admins WHERE id = ?",
    [adminId]
  );

  const admin = Array.isArray(rows) ? rows[0] : rows;

  if (!admin) {
    throw new Error("Admin not found");
  }

  const isPasswordValid = await bcrypt.compare(currentPassword, admin.password);

  if (!isPasswordValid) {
    throw new Error("Current password is incorrect");
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);

  query(
    "UPDATE admins SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
    [hashedPassword, adminId]
  );

  return { message: "Password changed successfully" };
};

/**
 * Change Email (Username) Service
 * @param {number} adminId
 * @param {string} currentPassword
 * @param {string} newEmail
 * @returns {Promise<{message: string, admin: object, token: string}>}
 */
exports.changeEmail = async (adminId, currentPassword, newEmail) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!newEmail || !emailRegex.test(newEmail)) {
    throw new Error("Invalid email format");
  }
  if (!currentPassword) {
    throw new Error("Current password is required");
  }

  const normalizedEmail = newEmail.trim().toLowerCase();

  const [rows] = query("SELECT id, email, password FROM admins WHERE id = ?", [adminId]);
  const admin = Array.isArray(rows) ? rows[0] : rows;
  if (!admin) throw new Error("Admin not found");

  const isPasswordValid = await bcrypt.compare(currentPassword, admin.password);
  if (!isPasswordValid) throw new Error("Current password is incorrect");

  if (admin.email.toLowerCase() === normalizedEmail) {
    throw new Error("New username is the same as current username");
  }

  const [existingRows] = query(
    "SELECT id FROM admins WHERE LOWER(email) = ? AND id != ?",
    [normalizedEmail, adminId]
  );
  const existing = Array.isArray(existingRows) ? existingRows[0] : existingRows;
  if (existing) throw new Error("This username is already taken");

  query(
    "UPDATE admins SET email = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
    [normalizedEmail, adminId]
  );

  const token = generateToken({ id: adminId, email: normalizedEmail });

  return {
    message: "Username changed successfully",
    admin: { id: adminId, email: normalizedEmail },
    token
  };
};

/**
 * Get Admin Info Service
 * @param {number} adminId
 * @returns {Promise<object>}
 */
exports.getAdminInfo = async (adminId) => {
  const [rows] = query(
    "SELECT id, email, is_active, created_at FROM admins WHERE id = ?",
    [adminId]
  );

  const admin = Array.isArray(rows) ? rows[0] : rows;

  if (!admin) {
    throw new Error("Admin not found");
  }

  return admin;
};