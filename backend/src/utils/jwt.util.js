const jwt = require("jsonwebtoken");

/**
 * Generate JWT access token
 * @param {{ id: number, email: string }} admin
 */
const generateToken = (admin) => {
  // Validate payload before signing
  if (!admin || !admin.id || !admin.email) {
    throw new Error("Invalid admin payload for JWT");
  }

  // Ensure JWT_SECRET exists
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET is not defined");
  }

  return jwt.sign(
    {
      id: admin.id,
      email: admin.email
    },
    secret,
    {
      expiresIn: process.env.JWT_EXPIRES_IN || "7d"
    }
  );
};

module.exports = { generateToken };