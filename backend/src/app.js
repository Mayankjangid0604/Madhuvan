// ============================================
// PHASE 1: IMPORTS
// ============================================
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const express = require("express");
const cors = require("cors");

// ============================================
// ENVIRONMENT DETECTION
// ============================================
const isElectron = !!process.versions.electron;
const isProduction = process.env.NODE_ENV === "production" || isElectron;

console.log("");
console.log("==================================================");
console.log("🚀 BACKEND STARTING");
console.log("==================================================");
console.log(`   - Electron: ${isElectron}`);
console.log(`   - Production: ${isProduction}`);
console.log(`   - NODE_ENV: ${process.env.NODE_ENV || 'development'}`);

// Load dotenv in development
if (!isProduction) {
  try {
    require("dotenv").config();
    console.log("   - dotenv: loaded");
  } catch (err) {
    console.log("   - dotenv: not available");
  }
}

// ============================================
// PATH CONFIGURATION (Use centralized paths.js)
// ============================================
const {
  APP_NAME,
  RUNTIME_DIR,
  CONFIG_FILE,
  UPLOADS_DIR,
  STUDENTS_UPLOAD_DIR,
  LOGOS_UPLOAD_DIR,
  MEMBERS_UPLOAD_DIR,
  DATA_DIR,
  ensureDirectories
} = require("./config/paths");

console.log(`   - App Directory: ${RUNTIME_DIR}`);

// ============================================
// CREATE DIRECTORIES
// ============================================
ensureDirectories();

// ============================================
// JWT AUTO-GENERATION
// ============================================
let config = {};
if (fs.existsSync(CONFIG_FILE)) {
  try {
    config = JSON.parse(fs.readFileSync(CONFIG_FILE, "utf-8"));
  } catch {
    config = {};
  }
}

if (!config.jwtSecret) {
  config.jwtSecret = crypto.randomBytes(64).toString("hex");
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
  console.log("   🔐 JWT_SECRET generated");
}

// Set environment variables for all modules
process.env.JWT_SECRET = config.jwtSecret;
process.env.UPLOADS_DIR = UPLOADS_DIR;
process.env.STUDENTS_UPLOAD_DIR = STUDENTS_UPLOAD_DIR;
process.env.LOGOS_UPLOAD_DIR = LOGOS_UPLOAD_DIR;
process.env.MEMBERS_UPLOAD_DIR = MEMBERS_UPLOAD_DIR;
process.env.DATA_DIR = DATA_DIR;
process.env.APP_DIR = RUNTIME_DIR;

// ============================================
// GLOBAL ERROR HANDLERS
// ============================================
process.on("uncaughtException", (err) => {
  console.error("❌ Uncaught Exception:", err);
});

process.on("unhandledRejection", (err) => {
  console.error("❌ Unhandled Rejection:", err);
});

// ============================================
// INITIALIZE DATABASE
// ============================================
console.log("📦 Initializing database...");
try {
  require("./config/db.sqlite");
  console.log("   ✅ Database ready");
} catch (err) {
  console.error("   ❌ Database failed:", err.message);
  process.exit(1);
}

// ============================================
// INSTALL MODE CHECK
// ============================================
try {
  const { getInstallMode, markInstalled } = require("./utils/installMode");
  const installMode = getInstallMode();

  if (installMode !== "INSTALLED" && installMode !== "DEV") {
    console.log(`   🛠 Install mode: ${installMode}`);
    markInstalled();
  }
} catch (err) {
  console.warn("   ⚠️ Install mode check:", err.message);
}

// ============================================
// EXPRESS SETUP
// ============================================
const app = express();

// CORS Configuration
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "cache-control", "pragma", "expires"]
}));

// Body Parsers
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));

// ============================================
// STATIC FILES
// ============================================
console.log(`📁 Serving /uploads from: ${UPLOADS_DIR}`);

app.use("/uploads", express.static(UPLOADS_DIR, {
  maxAge: "1d",
  etag: true,
  setHeaders: (res, filePath) => {
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes = {
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".png": "image/png",
      ".gif": "image/gif",
      ".webp": "image/webp",
      ".svg": "image/svg+xml"
    };
    if (mimeTypes[ext]) {
      res.setHeader("Content-Type", mimeTypes[ext]);
    }
  }
}));

// ============================================
// HEALTH ENDPOINTS
// ============================================
let isFullyReady = false;
let routesLoaded = 0;

app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    ready: isFullyReady,
    version: process.env.APP_VERSION || "1.0.0"
  });
});

app.get("/ready", (req, res) => {
  res.json({
    ready: isFullyReady,
    routes: routesLoaded
  });
});

// Debug endpoint for uploads
app.get("/api/debug/uploads", (req, res) => {
  try {
    res.json({
      success: true,
      paths: {
        uploads: UPLOADS_DIR,
        students: STUDENTS_UPLOAD_DIR,
        logos: LOGOS_UPLOAD_DIR,
        members: MEMBERS_UPLOAD_DIR
      },
      exists: {
        uploads: fs.existsSync(UPLOADS_DIR),
        students: fs.existsSync(STUDENTS_UPLOAD_DIR),
        logos: fs.existsSync(LOGOS_UPLOAD_DIR),
        members: fs.existsSync(MEMBERS_UPLOAD_DIR)
      },
      files: {
        students: fs.existsSync(STUDENTS_UPLOAD_DIR)
          ? fs.readdirSync(STUDENTS_UPLOAD_DIR).slice(0, 5)
          : [],
        logos: fs.existsSync(LOGOS_UPLOAD_DIR)
          ? fs.readdirSync(LOGOS_UPLOAD_DIR).slice(0, 5)
          : [],
        members: fs.existsSync(MEMBERS_UPLOAD_DIR)
          ? fs.readdirSync(MEMBERS_UPLOAD_DIR).slice(0, 5)
          : []
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================
// SWAGGER (OPTIONAL)
// ============================================
try {
  const swaggerUi = require("swagger-ui-express");
  const swaggerSpec = require("./config/swagger");
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  console.log("   📚 Swagger: /api-docs");
} catch (err) {
  // Swagger not available - that's okay
}

// ============================================
// LOAD ROUTES
// ============================================
console.log("📦 Loading routes...");

const routes = [
  { path: "/api/auth", module: "./routes/auth.routes" },
  { path: "/api/dashboard", module: "./routes/dashboard.routes" },
  { path: "/api/students", module: "./routes/student.routes" },
  { path: "/api/allocations", module: "./routes/allocation.routes" },
  { path: "/api/fees", module: "./routes/fee.routes" },
  { path: "/api/fine", module: "./routes/fine.routes" },
  { path: "/api/ledger", module: "./routes/ledger.routes" },
  { path: "/api/rooms", module: "./routes/room.routes" },
  { path: "/api/settings", module: "./routes/settings.routes" },
  { path: "/api/export", module: "./routes/export.routes" },
  { path: "/api/audit", module: "./routes/audit.routes" },
  { path: "/api/notifications", module: "./routes/notification.routes" },
  { path: "/api/backup", module: "./routes/backup.routes" },
  { path: "/api/members", module: "./routes/member.routes" },
  { path: "/api/doc-number", module: "./routes/docNumber.routes" },
  { path: "/api/webhooks", module: "./routes/webhook.routes" }
];

let loaded = 0;
let failed = 0;

routes.forEach(route => {
  try {
    app.use(route.path, require(route.module));
    loaded++;
    console.log(`   ✅ ${route.path}`);
  } catch (err) {
    failed++;
    console.error(`   ❌ ${route.path}: ${err.message}`);
  }
});

routesLoaded = loaded;
console.log(`   📊 Routes: ${loaded}/${routes.length} loaded`);

if (failed > 0) {
  console.warn(`   ⚠️ ${failed} route(s) failed to load`);
}

// ============================================
// 404 HANDLER FOR API ROUTES
// ============================================
app.use("/api", (req, res) => {
  res.status(404).json({
    success: false,
    message: `Endpoint not found: ${req.method} ${req.originalUrl}`
  });
});

// ============================================
// GLOBAL ERROR HANDLER
// ============================================
app.use((err, req, res, next) => {
  console.error("❌ Error:", err.message);

  // Handle specific error types
  if (err.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({
      success: false,
      message: "File too large (max 5MB)"
    });
  }

  if (err.name === "MulterError") {
    return res.status(400).json({
      success: false,
      message: err.message
    });
  }

  if (err.name === "JsonWebTokenError") {
    return res.status(401).json({
      success: false,
      message: "Invalid token"
    });
  }

  if (err.name === "TokenExpiredError") {
    return res.status(401).json({
      success: false,
      message: "Token expired"
    });
  }

  // Default error response
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal server error"
  });
});

// ============================================
// BACKGROUND JOBS & CRON TASKS (Delayed Start)
// ============================================
setTimeout(() => {
  console.log("📦 Starting background jobs & cron tasks...");

  // ============================================
  // JOBS
  // ============================================
  try {
    require("./jobs/penalty.job");
    console.log("   ✅ Penalty job started");
  } catch (err) {
    console.warn("   ⚠️ Penalty job:", err.message);
  }

  try {
    require("./jobs/reminder.job");
    console.log("   ✅ Reminder job started");
  } catch (err) {
    console.warn("   ⚠️ Reminder job:", err.message);
  }

  // ============================================
  // CRON JOBS
  // ============================================
  try {
    const { startAutoGenerateFeesCron } = require("./cron/autoGenerateFees.cron");
    startAutoGenerateFeesCron();
    console.log("   ✅ Auto-generate fees cron started");
  } catch (err) {
    console.warn("   ⚠️ Fee cron:", err.message);
  }

  try {
    const { startFeeOverdueCron } = require("./cron/feeOverdue.cron");
    startFeeOverdueCron();
    console.log("   ✅ Fee overdue cron started");
  } catch (err) {
    console.warn("   ⚠️ Overdue cron:", err.message);
  }

  try {
    const { startBackupCron } = require("./cron/backup.cron");
    startBackupCron();
    console.log("   ✅ Backup cron started");
  } catch (err) {
    console.warn("   ⚠️ Backup cron:", err.message);
  }

  try {
    const { startCleanupCron } = require("./cron/cleanup.cron");
    startCleanupCron();
    console.log("   ✅ Cleanup cron started");
  } catch (err) {
    console.warn("   ⚠️ Cleanup cron:", err.message);
  }

  try {
    const { startFeeEmailCrons } = require("./cron/emailSchedule.cron");
    startFeeEmailCrons();
    console.log("   ✅ Fee email cron started (1st invoice, 3rd/5th reminders, 6+ daily overdue)");
  } catch (err) {
    console.warn("   ⚠️ Email cron:", err.message);
  }

  try {
    const { startPushWorker } = require("./sync/pushWorker");
    startPushWorker();
  } catch (err) {
    console.warn("   ⚠️ Push worker:", err.message);
  }

}, 3000);

// ============================================
// START SERVER
// ============================================
const PORT = process.env.PORT || 5001;

const server = app.listen(PORT, "0.0.0.0", () => {
  isFullyReady = true;

  console.log("");
  console.log("==================================================");
  console.log(`✅ ${APP_NAME} Backend Ready`);
  console.log(`   🌐 http://localhost:${PORT}`);
  console.log(`   💚 Health: http://localhost:${PORT}/health`);
  console.log(`   📚 API Docs: http://localhost:${PORT}/api-docs`);
  console.log("==================================================");
  console.log("");

  // Notify Electron main process if running in Electron
  if (process.send) {
    process.send("BACKEND_READY");
  }
});

// Handle server errors
server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(`❌ Port ${PORT} is already in use!`);
    process.exit(1);
  }
  console.error("❌ Server error:", err);
});

// Set server timeout
server.timeout = 120000; // 2 minutes

// ============================================
// GRACEFUL SHUTDOWN
// ============================================
function gracefulShutdown(signal) {
  console.log(`\n🛑 ${signal} - Shutting down gracefully...`);

  isFullyReady = false;

  server.close(() => {
    console.log("   ✅ HTTP server closed");

    // Close database connection
    try {
      const { end } = require("./config/db.sqlite");
      end();
      console.log("   ✅ Database closed");
    } catch (err) {
      // Ignore
    }

    console.log("✅ Shutdown complete");
    process.exit(0);
  });

  // Force shutdown after 10 seconds
  setTimeout(() => {
    console.error("❌ Forced shutdown after timeout");
    process.exit(1);
  }, 10000);
}

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

// ============================================
// EXPORTS
// ============================================
module.exports = server;
module.exports.app = app;
module.exports.UPLOADS_DIR = UPLOADS_DIR;
module.exports.STUDENTS_UPLOAD_DIR = STUDENTS_UPLOAD_DIR;
module.exports.LOGOS_UPLOAD_DIR = LOGOS_UPLOAD_DIR;
module.exports.MEMBERS_UPLOAD_DIR = MEMBERS_UPLOAD_DIR;