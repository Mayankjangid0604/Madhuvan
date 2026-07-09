const jwt = require("jsonwebtoken");

/**
 * JWT Authentication Middleware
 * - Validates Authorization header
 * - Verifies JWT signature & expiry
 * - Attaches admin info to req.admin
 */
module.exports = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    // ✅ FIX #2: Strict validation of Bearer format
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Authorization token missing or malformed"
      });
    }

    const token = authHeader.split(" ")[1];

    // ✅ FIX #1: Ensure JWT_SECRET exists
    if (!process.env.JWT_SECRET) {
      console.error("❌ JWT_SECRET is not defined");
      return res.status(500).json({
        success: false,
        message: "Server authentication misconfigured"
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // ✅ FIX #3: Validate decoded payload structure
    if (!decoded || !decoded.id || !decoded.email) {
      return res.status(401).json({
        success: false,
        message: "Invalid token payload"
      });
    }

    // Attach clean admin object to request
    req.admin = {
      id: decoded.id,
      email: decoded.email
    };

    next();
  } catch (err) {
    // Handle JWT errors (expired, invalid signature, etc.)
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token"
    });
  }
};