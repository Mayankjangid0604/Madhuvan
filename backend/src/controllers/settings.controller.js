const settingsService = require("../services/settings.service");
const notificationService = require("../services/notification.service");
const path = require("path");
const fs = require("fs");

/**
 * GET HOSTEL INFO
 */
exports.getHostelInfo = async (req, res, next) => {
  try {
    const data = await settingsService.getHostelInfo();
    res.json({
      success: true,
      data
    });
  } catch (error) {
    console.error("Get hostel info error:", error);
    next(error);
  }
};

/**
 * SAVE HOSTEL INFO (with logo upload)
 */
exports.saveHostelInfo = async (req, res, next) => {
  try {
    // Merge with existing info to preserve logo paths when not re-uploaded
    const existingInfo = await settingsService.getHostelInfo() || {};
    const data = { ...existingInfo, ...req.body };

    // Handle logo uploads
    if (req.files) {
      if (req.files.logo_left && req.files.logo_left[0]) {
        data.logo_left = `/uploads/logos/${req.files.logo_left[0].filename}`;
      }
      if (req.files.logo_right && req.files.logo_right[0]) {
        data.logo_right = `/uploads/logos/${req.files.logo_right[0].filename}`;
      }
    }

    await settingsService.saveHostelInfo(data);

    res.json({
      success: true,
      message: "Hostel information saved successfully",
      data
    });
  } catch (error) {
    console.error("Save hostel info error:", error);
    next(error);
  }
};

/**
 * GET RULES
 */
exports.getRules = async (req, res, next) => {
  try {
    const rules = await settingsService.getRules();
    res.json({
      success: true,
      data: rules
    });
  } catch (error) {
    console.error("Get rules error:", error);
    next(error);
  }
};

/**
 * SAVE RULES
 */
exports.saveRules = async (req, res, next) => {
  try {
    await settingsService.saveRules(req.body.rules || req.body);
    res.json({
      success: true,
      message: "Rules saved successfully"
    });
  } catch (error) {
    console.error("Save rules error:", error);
    next(error);
  }
};

/**
 * GET TEMPLATES
 */
exports.getTemplates = async (req, res, next) => {
  try {
    const templates = await settingsService.getTemplates();
    res.json({
      success: true,
      data: templates
    });
  } catch (error) {
    console.error("Get templates error:", error);
    next(error);
  }
};

/**
 * SAVE EMAIL TEMPLATE
 */
exports.saveEmailTemplate = async (req, res, next) => {
  try {
    await settingsService.saveEmailTemplate(req.body);
    res.json({
      success: true,
      message: "Email template saved successfully"
    });
  } catch (error) {
    console.error("Save email template error:", error);
    next(error);
  }
};

/**
 * SAVE SMS TEMPLATE
 */
exports.saveSmsTemplate = async (req, res, next) => {
  try {
    await settingsService.saveSmsTemplate(req.body);
    res.json({
      success: true,
      message: "SMS template saved successfully"
    });
  } catch (error) {
    console.error("Save SMS template error:", error);
    next(error);
  }
};

exports.saveInvoiceEmailTemplate = async (req, res, next) => {
  try {
    await settingsService.saveTemplate("invoice_email", req.body);
    res.json({ success: true, message: "Invoice email template saved" });
  } catch (error) { next(error); }
};

exports.saveReceiptEmailTemplate = async (req, res, next) => {
  try {
    await settingsService.saveTemplate("receipt_email", req.body);
    res.json({ success: true, message: "Receipt email template saved" });
  } catch (error) { next(error); }
};

exports.getPhonePeConfig = async (req, res, next) => {
  try {
    const cfg = await settingsService.getConfig("phonepe_config", {
      enabled: false,
      merchant_id: "",
      salt_key: "",
      salt_index: "1",
      environment: "SANDBOX",
      callback_url: "",
    });
    res.json({ success: true, data: cfg });
  } catch (error) { next(error); }
};

exports.savePhonePeConfig = async (req, res, next) => {
  try {
    await settingsService.saveConfig("phonepe_config", req.body);
    res.json({ success: true, message: "PhonePe configuration saved" });
  } catch (error) { next(error); }
};

/**
 * GET EMAIL CONFIG
 */
exports.getEmailConfig = async (req, res, next) => {
  try {
    const config = await settingsService.getEmailConfig();
    // Don't send password to frontend
    if (config.password) {
      config.password = '********';
    }
    res.json({
      success: true,
      data: config
    });
  } catch (error) {
    console.error("Get email config error:", error);
    next(error);
  }
};

/**
 * SAVE EMAIL CONFIG
 */
exports.saveEmailConfig = async (req, res, next) => {
  try {
    // Only update password if it's not the masked value
    if (req.body.password === '********') {
      const currentConfig = await settingsService.getEmailConfig();
      req.body.password = currentConfig.password;
    }

    await settingsService.saveEmailConfig(req.body);

    // Reinitialize notification service with new config
    await notificationService.reinitialize();

    res.json({
      success: true,
      message: "Email configuration saved successfully"
    });
  } catch (error) {
    console.error("Save email config error:", error);
    next(error);
  }
};

/**
 * GET SMS CONFIG
 */
exports.getSmsConfig = async (req, res, next) => {
  try {
    const config = await settingsService.getSmsConfig();
    // Don't send auth token to frontend
    if (config.authToken) {
      config.authToken = '********';
    }
    res.json({
      success: true,
      data: config
    });
  } catch (error) {
    console.error("Get SMS config error:", error);
    next(error);
  }
};

/**
 * SAVE SMS CONFIG
 */
exports.saveSmsConfig = async (req, res, next) => {
  try {
    // Only update auth token if it's not the masked value
    if (req.body.authToken === '********') {
      const currentConfig = await settingsService.getSmsConfig();
      req.body.authToken = currentConfig.authToken;
    }

    await settingsService.saveSmsConfig(req.body);

    // Reinitialize notification service with new config
    await notificationService.reinitialize();

    res.json({
      success: true,
      message: "SMS configuration saved successfully"
    });
  } catch (error) {
    console.error("Save SMS config error:", error);
    next(error);
  }
};

/**
 * GET WHATSAPP CONFIG
 */
exports.getWhatsappConfig = async (req, res, next) => {
  try {
    const config = await settingsService.getWhatsappConfig();
    res.json({ success: true, data: config });
  } catch (error) {
    next(error);
  }
};

/**
 * SAVE WHATSAPP CONFIG
 */
exports.saveWhatsappConfig = async (req, res, next) => {
  try {
    await settingsService.saveWhatsappConfig(req.body);
    await notificationService.reinitialize();
    res.json({ success: true, message: "WhatsApp configuration saved successfully" });
  } catch (error) {
    next(error);
  }
};

/**
 * GET DRIVE CONFIG
 */
exports.getDriveConfig = async (req, res, next) => {
  try {
    const config = await settingsService.getDriveConfig();
    res.json({
      success: true,
      data: config
    });
  } catch (error) {
    console.error("Get drive config error:", error);
    next(error);
  }
};

/**
 * SAVE DRIVE CONFIG
 */
exports.saveDriveConfig = async (req, res, next) => {
  try {
    await settingsService.saveDriveConfig(req.body);
    res.json({
      success: true,
      message: "Drive configuration saved successfully"
    });
  } catch (error) {
    console.error("Save drive config error:", error);
    next(error);
  }
};

/**
 * GET PENALTY CONFIG
 */
exports.getPenaltyConfig = async (req, res, next) => {
  try {
    const config = await settingsService.getPenaltyConfig();
    res.json({
      success: true,
      data: config
    });
  } catch (error) {
    console.error("Get penalty config error:", error);
    next(error);
  }
};

/**
 * SAVE PENALTY CONFIG
 */
exports.savePenaltyConfig = async (req, res, next) => {
  try {
    await settingsService.savePenaltyConfig(req.body);
    res.json({
      success: true,
      message: "Penalty configuration saved successfully"
    });
  } catch (error) {
    console.error("Save penalty config error:", error);
    next(error);
  }
};

/**
 * UPLOAD LOGO (standalone endpoint)
 */
exports.uploadLogo = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No logo file provided"
      });
    }

    const logoUrl = `/uploads/logos/${req.file.filename}`;

    res.json({
      success: true,
      message: "Logo uploaded successfully",
      data: { logo_url: logoUrl }
    });
  } catch (error) {
    console.error("Upload logo error:", error);
    next(error);
  }
};

module.exports = exports;