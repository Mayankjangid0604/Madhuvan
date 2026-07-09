const { query } = require("../config/db.sqlite");

/**
 * Find admin by email
 * @param {string} email 
 * @returns {object|undefined} Admin record or undefined
 */
const findAdminByEmail = (email) => {
  const [rows] = query(
    "SELECT id, email, password FROM admins WHERE email = ? AND is_active = 1",
    [email]
  );
  // ✅ FIX: Return first row, not the array
  return Array.isArray(rows) ? rows[0] : rows;
};

/**
 * Find admin by ID
 * @param {number} id 
 * @returns {object|undefined} Admin record or undefined
 */
const findAdminById = (id) => {
  const [rows] = query(
    "SELECT id, email FROM admins WHERE id = ? AND is_active = 1",
    [id]
  );
  // ✅ FIX: Return first row, not the array
  return Array.isArray(rows) ? rows[0] : rows;
};

/**
 * Update admin password
 * @param {number} id 
 * @param {string} hashedPassword 
 * @returns {object} Result with affectedRows
 */
const updatePassword = (id, hashedPassword) => {
  const [result] = query(
    "UPDATE admins SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
    [hashedPassword, id]
  );
  return result;
};

module.exports = {
  findAdminByEmail,
  findAdminById,
  updatePassword
};