module.exports = (err, req, res, next) => {
  // ✅ FIX #1: Log full error details for debugging
  console.error("❌ ERROR:", {
    message: err.message,
    stack: err.stack,
    path: req.originalUrl,
    method: req.method
  });

  const status = err.statusCode || 500;

  // ✅ FIX #2: Only send safe messages to client
  const isOperational = err.isOperational === true;

  res.status(status).json({
    success: false,
    message: isOperational
      ? err.message
      : "Internal Server Error"
  });
};