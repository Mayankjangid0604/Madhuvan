const express = require("express");
const router = express.Router();
const notificationService = require("../services/notification.service");
const auth = require("../middlewares/auth.middleware");

// ✅ FIX: Add authentication middleware to all routes
router.use(auth);

/**
 * @swagger
 * tags:
 *   name: Notifications
 *   description: Email and SMS notification management
 */

/**
 * @swagger
 * /api/notifications/test-email:
 *   post:
 *     summary: Send test email
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 */
router.post("/test-email", async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ 
        success: false, 
        message: "Email address is required" 
      });
    }
    
    // ✅ FIX: Removed redundant require - already imported at top
    await notificationService.sendTestEmail(email);

    res.json({ 
      success: true,
      message: "Test email sent successfully"
    });
  } catch (err) {
    res.status(400).json({ 
      success: false, 
      message: err.message 
    });
  }
});

/**
 * @swagger
 * /api/notifications/test-sms:
 *   post:
 *     summary: Send test SMS
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 */
router.post("/test-sms", async (req, res) => {
  try {
    const { phone } = req.body;
    
    if (!phone) {
      return res.status(400).json({ 
        success: false, 
        message: "Phone number is required" 
      });
    }
    
    await notificationService.sendTestSMS(phone);

    res.json({ 
      success: true,
      message: "Test SMS sent successfully"
    });
  } catch (err) {
    res.status(400).json({ 
      success: false, 
      message: err.message 
    });
  }
});

/**
 * @swagger
 * /api/notifications/send-reminder/{studentId}/{feeId}:
 *   post:
 *     summary: Send fee reminder to student
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 */
router.post("/send-reminder/:studentId/:feeId", async (req, res) => {
  try {
    const { studentId, feeId } = req.params;
    const result = await notificationService.sendFeeReminder(studentId, feeId);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * @swagger
 * /api/notifications/bulk-reminders:
 *   post:
 *     summary: Send bulk overdue reminders
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 */
router.post("/bulk-reminders", async (req, res) => {
  try {
    const result = await notificationService.sendBulkOverdueReminders();
    
    res.json({
      success: true,
      message: `Sent reminders to ${result.total} students`,
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * @swagger
 * /api/notifications/reinitialize:
 *   post:
 *     summary: Reinitialize notification services after settings change
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 */
router.post("/reinitialize", async (req, res) => {
  try {
    await notificationService.reinitialize();
    
    res.json({
      success: true,
      message: "Notification services reinitialized"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;