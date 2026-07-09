const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settings.controller');
const { uploadLogo } = require('../middlewares/upload.middleware');
const authMiddleware = require('../middlewares/auth.middleware');

// Apply auth middleware to all settings routes
router.use(authMiddleware);

// =========================
// Hostel Information
// =========================
router.get('/hostel-info', settingsController.getHostelInfo);
router.post('/hostel-info', uploadLogo.fields([
  { name: 'logo_left', maxCount: 1 },
  { name: 'logo_right', maxCount: 1 }
]), settingsController.saveHostelInfo);

// =========================
// Hostel Rules
// =========================
router.get('/rules', settingsController.getRules);
router.post('/rules', settingsController.saveRules);

// =========================
// Templates
// =========================
router.get('/templates', settingsController.getTemplates);
router.post('/templates/email', settingsController.saveEmailTemplate);
router.post('/templates/sms', settingsController.saveSmsTemplate);
router.post('/templates/invoice-email', settingsController.saveInvoiceEmailTemplate);
router.post('/templates/receipt-email', settingsController.saveReceiptEmailTemplate);

// =========================
// Email Config
// =========================
router.get('/email-config', settingsController.getEmailConfig);
router.post('/email-config', settingsController.saveEmailConfig);

// =========================
// SMS Config
// =========================
router.get('/sms-config', settingsController.getSmsConfig);
router.post('/sms-config', settingsController.saveSmsConfig);

// =========================
// WhatsApp Config
// =========================
router.get('/whatsapp-config', settingsController.getWhatsappConfig);
router.post('/whatsapp-config', settingsController.saveWhatsappConfig);

// =========================
// Drive Config
// =========================
router.get('/drive-config', settingsController.getDriveConfig);
router.post('/drive-config', settingsController.saveDriveConfig);

// =========================
// Penalty Config
// =========================
router.get('/penalty-config', settingsController.getPenaltyConfig);
router.post('/penalty-config', settingsController.savePenaltyConfig);

// =========================
// PhonePe Gateway Config
// =========================
router.get('/phonepe-config', settingsController.getPhonePeConfig);
router.post('/phonepe-config', settingsController.savePhonePeConfig);

// =========================
// Logo Upload (standalone endpoint)
// =========================
router.post('/upload-logo', uploadLogo.single('logo'), settingsController.uploadLogo);

module.exports = router;