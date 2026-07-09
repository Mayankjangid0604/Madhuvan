const PDFDocument = require('pdfkit');
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');
const db = require('../config/db.sqlite');
const settingsService = require("./settings.service");
const invoiceService = require('./invoice.service');

const buildTwilioMsgParams = (smsConfig, to, body) => {
  const params = { body, to };
  if (smsConfig.messagingServiceSid) {
    params.messagingServiceSid = smsConfig.messagingServiceSid;
  } else {
    params.from = smsConfig.from || smsConfig.fromNumber;
  }
  return params;
};

// Global transporter - will be updated dynamically
let emailTransporter = null;
let twilioClient = null;

/**
 * Initialize email transporter from database settings
 */
const initializeEmailTransporter = async () => {
  try {
    const emailConfig = await settingsService.getEmailConfig();

    if (!emailConfig.enabled || !emailConfig.user || !emailConfig.password) {
      console.log('⚠️ Email not configured');
      emailTransporter = null;
      return;
    }

    // 🔥 DESTROY OLD TRANSPORTER
    emailTransporter = null;

    const secure = Number(emailConfig.port) === 465;

    emailTransporter = nodemailer.createTransport({
      host: emailConfig.host,
      port: Number(emailConfig.port),
      secure,
      auth: {
        user: emailConfig.user,
        pass: emailConfig.password
      }
    });

    await emailTransporter.verify();
    console.log('✅ Email transporter verified');

  } catch (err) {
    console.error('❌ Email init failed:', err.message);
    emailTransporter = null;
  }
};

/**
 * Initialize SMS client from database settings
 */
const initializeTwilioClient = async () => {
  try {
    const smsConfig = await settingsService.getSmsConfig();
    
    // Check if SMS is enabled and configured
    if (!smsConfig.enabled || !smsConfig.accountSid || !smsConfig.authToken) {
      console.log('⚠️  SMS not configured - SMS reminders disabled');
      twilioClient = null;
      return;
    }

    const twilio = require('twilio');
    twilioClient = twilio(smsConfig.accountSid, smsConfig.authToken);
    console.log('✅ SMS configured from database settings');
  } catch (error) {
    console.log('⚠️  SMS initialization failed:', error.message);
    twilioClient = null;
  }
};

/**
 * Initialize both email and SMS on startup
 */
const initialize = async () => {
  await initializeEmailTransporter();
  await initializeTwilioClient();
};

// Initialize on module load
initialize();

/**
 * Re-initialize after settings change
 */
exports.reinitialize = async () => {
  console.log('🔄 Reinitializing notification services...');
  await initialize();
};

/**
 * Build Email Content using template
 */
const buildEmailContent = async (student, fee) => {
  const hostelInfo = await settingsService.getHostelInfo() || {};
  const templates = await settingsService.getTemplates();
  const template = templates.email;
  const emailConfig = await settingsService.getEmailConfig();
  
  // Replace variables
  let subject = template.subject
    .replace(/{student_name}/g, student.student_name || '')
    .replace(/{hostel_name}/g, hostelInfo.hostel_name || '');

  let body = template.body
    .replace(/{student_name}/g, student.student_name || '')
    .replace(/{father_name}/g, student.father_name || '')
    .replace(/{mother_name}/g, student.mother_name || '')
    .replace(/{fee_amount}/g, fee.penalty_amount > 0
      ? `${fee.fee_amount} + ₹${fee.penalty_amount} = ₹${fee.fee_amount + fee.penalty_amount}`
      : fee.fee_amount
    )
    .replace(/{due_date}/g, fee.due_date || '')
    .replace(/{fee_status}/g, fee.fee_status || '')
    .replace(/{hostel_name}/g, hostelInfo.hostel_name || '')
    .replace(/{hostel_phone}/g, hostelInfo.phone || '')
    .replace(/{hostel_email}/g, hostelInfo.email || '');
  
  return {
    subject,
    body,
    fromName: emailConfig.fromName || "Hostel Management",
    fromEmail: emailConfig.fromEmail || emailConfig.user
  };
};

/**
 * Build SMS Content using template
 */
const buildSMSContent = async (student, fee) => {
  const templates = await settingsService.getTemplates();
  const template = templates.sms;
  
  let message = template.message
    .replace('{student_name}', student.student_name)
    .replace('{father_name}', student.father_name)
    .replace('{mother_name}', student.mother_name || '')
    .replace('{fee_amount}', fee.fee_amount)
    .replace('{due_date}', fee.due_date)
    .replace('{fee_status}', fee.fee_status);
  
  return message;
};

/**
 * Send Email to Father
 */
exports.sendEmailReminder = async (studentId, feeDetails) => {
  try {
    // Re-initialize if not already done
    if (!emailTransporter) {
      await initializeEmailTransporter();
    }

    if (!emailTransporter) {
      console.log('Email not configured');
      return { success: false, reason: 'Email not configured' };
    }

    const student = db.db.prepare(`
      SELECT s.student_name, s.father_name, s.father_email,
             sf.fee_amount, sf.paid_amount, sf.due_date, sf.fee_status, sf.fee_id
      FROM students s
      JOIN student_fees sf ON s.student_id = sf.student_id
      WHERE s.student_id = ? AND sf.fee_id = ?
    `).get(studentId, feeDetails.fee_id);

    if (!student || !student.father_email) {
      console.log(`No email for student ${studentId}`);
      return { success: false, reason: 'No email found' };
    }

    const fee = db.db.prepare(`SELECT * FROM student_fees WHERE fee_id = ?`).get(feeDetails.fee_id);
    
    if (!fee) {
      console.log(`No fee record for fee_id ${feeDetails.fee_id}`);
      return { success: false, reason: 'No fee record found' };
    }

    process.env.EMAIL_MODE = 'true';
    try {
      // Get email content from template
      const { subject, body, fromName, fromEmail } = await buildEmailContent(student, {
        ...fee,
        fee_status: String(fee.fee_status || 'DUE')
      });

      let invoicePath = null;
      try {
        invoicePath = await invoiceService.generateInvoiceForFee(feeDetails.fee_id);
      } catch (err) {
        console.log('Skipping invoice attachment for reminder:', err.message);
      }

      const mailOptions = {
        from: `"${fromName}" <${fromEmail}>`,
        to: student.father_email,
        subject: subject,
        html: body.replace(/\n/g, '<br>')
      };

      if (invoicePath) {
        mailOptions.attachments = [{
          filename: `invoice_${feeDetails.fee_id}_UNPAID.pdf`,
          path: invoicePath
        }];
      }

      await emailTransporter.sendMail(mailOptions);

      // Log notification
      db.db.prepare(`
        INSERT INTO notification_logs (student_id, notification_type, notification_method, notification_status, notification_message, sent_at)
        VALUES (?, 'fee_reminder', 'email', 'sent', ?, datetime('now'))
      `).run(studentId, `Email sent to ${student.father_email}`);

      console.log(`✅ Email sent to ${student.father_email}`);
      return { success: true, email: student.father_email };
    } finally {
      delete process.env.EMAIL_MODE;
    }
  } catch (error) {
    console.error('Email error:', error.message);

    // Log failed notification
    db.db.prepare(`
      INSERT INTO notification_logs (student_id, notification_type, notification_method, notification_status, notification_message, sent_at)
      VALUES (?, 'fee_reminder', 'email', 'failed', ?, datetime('now'))
    `).run(studentId, `Email failed: ${error.message}`);

    return { success: false, error: error.message };
  }
};

/**
 * Send SMS to Father
 */
exports.sendSMSReminder = async (studentId, feeDetails) => {
  try {
    if (!twilioClient) await initializeTwilioClient();
    if (!twilioClient) return { success: false, reason: 'SMS not configured' };

    const smsConfig = await settingsService.getSmsConfig();

    const student = db.db.prepare(`
      SELECT s.student_name, s.mother_name, s.father_mobile, s.father_name,
             sf.fee_amount, sf.paid_amount, sf.due_date, sf.fee_status
      FROM students s
      JOIN student_fees sf ON s.student_id = sf.student_id
      WHERE s.student_id = ? AND sf.fee_id = ?
    `).get(studentId, feeDetails.fee_id);

    if (!student || !student.father_mobile) {
      console.log(`No father mobile for student ${studentId}`);
      return { success: false, reason: 'No father mobile found' };
    }

    const message = await buildSMSContent(student, student);
    const phoneNumber = '+91' + String(student.father_mobile).replace(/^0+/, '');

    await twilioClient.messages.create(buildTwilioMsgParams(smsConfig, phoneNumber, message));

    db.db.prepare(`
      INSERT INTO notification_logs (student_id, notification_type, notification_method, notification_status, notification_message, sent_at)
      VALUES (?, 'fee_reminder', 'sms', 'sent', ?, datetime('now'))
    `).run(studentId, `SMS sent to ${student.father_mobile}`);

    console.log(`✅ SMS sent to ${student.father_mobile}`);
    return { success: true, mobile: student.father_mobile };
  } catch (error) {
    console.error('SMS error:', error.message);
    db.db.prepare(`
      INSERT INTO notification_logs (student_id, notification_type, notification_method, notification_status, notification_message, sent_at)
      VALUES (?, 'fee_reminder', 'sms', 'failed', ?, datetime('now'))
    `).run(studentId, `SMS failed: ${error.message}`);
    return { success: false, error: error.message };
  }
};


/**
 * Send Bulk Reminders for Overdue Fees
 */
exports.sendBulkOverdueReminders = async () => {
  try {
    const overdueFees = db.db.prepare(`
      SELECT DISTINCT s.student_id, sf.fee_id
      FROM students s
      JOIN student_fees sf ON s.student_id = sf.student_id
      WHERE sf.fee_status = 'OVERDUE'
      AND s.date_of_leaving IS NULL
      LIMIT 50
    `).all();

    console.log(`📧 Sending reminders to ${overdueFees.length} students...`);

    const results = [];
    for (const fee of overdueFees) {
      const result = await exports.sendFeeReminder(fee.student_id, fee.fee_id);
      results.push(result);
      // Wait 1 second between sends to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    return { total: overdueFees.length, results };
  } catch (error) {
    console.error('Bulk reminder error:', error.message);
    throw error;
  }
};

/**
 * Send Fee Receipt Email
 */
exports.sendFeeReceiptEmail = async (studentId, feeId, invoiceNumber) => {
  try {
    if (!emailTransporter) {
      await initializeEmailTransporter();
    }
    if (!emailTransporter) {
      console.log('Email not configured');
      return { success: false, reason: 'Email not configured' };
    }

    const student = db.db.prepare(`
      SELECT s.student_name, s.father_name, s.father_email,
             sf.fee_amount, sf.paid_amount, sf.due_date, sf.fee_status, sf.fee_id
      FROM students s
      JOIN student_fees sf ON s.student_id = sf.student_id
      WHERE s.student_id = ? AND sf.fee_id = ?
    `).get(studentId, feeId);

    if (!student || !student.father_email) {
      console.log(`No email for student ${studentId}`);
      return { success: false, reason: 'No email found' };
    }

    const fee = feeId ? db.db.prepare(`SELECT * FROM student_fees WHERE fee_id = ?`).get(feeId) : {};
    
    if (!fee && feeId) {
      console.log(`No fee record for fee_id ${feeId}`);
      return { success: false, reason: 'No fee record found' };
    }

    process.env.EMAIL_MODE = 'true';
    try {
      const { subject, body, fromName, fromEmail } = await buildEmailContent(student, fee);

      let invoicePath = null;
      try {
        if (invoiceNumber) {
          invoicePath = await invoiceService.generateInvoicePDF(invoiceNumber);
        } else if (feeId) {
          invoicePath = await invoiceService.generateInvoiceForFee(feeId);
        }
      } catch (err) {
        console.log('Skipping invoice attachment for receipt:', err.message);
      }

      const mailOptions = {
        from: `"${fromName}" <${fromEmail}>`,
        to: student.father_email,
        subject: `Fee Receipt - ${student.student_name}`,
        html: `Dear ${student.father_name},<br><br>Your payment has been received.<br><br>${body ? body.replace(/\n/g, '<br>') : ''}<br><br>Receipt attached.`
      };

      if (invoicePath) {
        mailOptions.attachments = [{
          filename: `invoice_${invoiceNumber || feeId}_PAID.pdf`,
          path: invoicePath
        }];
      }

      await emailTransporter.sendMail(mailOptions);

      // Log notification
      db.db.prepare(`
        INSERT INTO notification_logs (student_id, notification_type, notification_method, notification_status, notification_message, sent_at)
        VALUES (?, 'fee_receipt', 'email', 'sent', ?, datetime('now'))
      `).run(studentId, `Receipt email sent to ${student.father_email}`);

      console.log(`✅ Receipt email sent to ${student.father_email}`);
      return { success: true, email: student.father_email };
    } finally {
      delete process.env.EMAIL_MODE;
    }
  } catch (error) {
    console.error('Receipt email error:', error.message);

    // Log failed notification
    db.db.prepare(`
      INSERT INTO notification_logs (student_id, notification_type, notification_method, notification_status, notification_message, sent_at)
      VALUES (?, 'fee_receipt', 'email', 'failed', ?, datetime('now'))
    `).run(studentId, `Receipt email failed: ${error.message}`);

    return { success: false, error: error.message };
  }
};

/**
 * ✅ NEW: Send Email with Attachment (for invoices after payment)
 */
exports.sendEmailWithAttachment = async ({ to, subject, text, html, attachments }) => {
  try {
    // Re-initialize if not already done
    if (!emailTransporter) {
      await initializeEmailTransporter();
    }

    if (!emailTransporter) {
      console.log('⚠️ Email not configured - skipping email');
      return { success: false, reason: 'Email not configured' };
    }

    const emailConfig = await settingsService.getEmailConfig();
    
    // Handle array of recipients
    let recipients;
    if (Array.isArray(to)) {
      recipients = to.filter(Boolean).join(', ');
    } else {
      recipients = to;
    }
    
    if (!recipients) {
      console.log('⚠️ No valid recipients for email');
      return { success: false, reason: 'No valid recipients' };
    }

    const mailOptions = {
      from: `"${emailConfig.fromName || 'Hostel Management'}" <${emailConfig.fromEmail || emailConfig.user}>`,
      to: recipients,
      subject: subject || 'Fee Invoice',
      text: text || '',
      html: html || (text ? text.replace(/\n/g, '<br>') : ''),
      attachments: attachments || []
    };

    await emailTransporter.sendMail(mailOptions);
    
    console.log(`✅ Email with attachment sent to ${recipients}`);
    return { success: true, email: recipients };
    
  } catch (error) {
    console.error('❌ Email with attachment error:', error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Send Test Email
 */
exports.sendTestEmail = async (to) => {
  if (!emailTransporter) {
    await initializeEmailTransporter();
  }

  if (!emailTransporter) {
    throw new Error("Email not configured");
  }

  const emailConfig = await settingsService.getEmailConfig();

  await emailTransporter.sendMail({
    from: `"${emailConfig.fromName}" <${emailConfig.fromEmail || emailConfig.user}>`,
    to,
    subject: "Test Email Successful",
    html: "<b>Email configuration is working correctly.</b>"
  });
};

/**
 * Send Test SMS
 */
exports.sendTestSMS = async (to) => {
  if (!twilioClient) {
    await initializeTwilioClient();
  }

  if (!twilioClient) {
    throw new Error("SMS not configured. Please configure Twilio settings first.");
  }

  const smsConfig = await settingsService.getSmsConfig();
  const fromNumber = smsConfig.from || smsConfig.fromNumber;
  if (!fromNumber && !smsConfig.messagingServiceSid) {
    throw new Error("Twilio 'From' number or Messaging Service SID not configured");
  }

  // Ensure phone number has country code
  let phoneNumber = to.trim();
  if (!phoneNumber.startsWith('+')) {
    phoneNumber = '+91' + phoneNumber.replace(/^0+/, '');
  }

  await twilioClient.messages.create(buildTwilioMsgParams(smsConfig, phoneNumber, "Test SMS from Hostel Management System. SMS configuration is working correctly!"));

  console.log(`✅ Test SMS sent to ${phoneNumber}`);
};

/**
 * Send SMS (generic)
 */
exports.sendSMS = async (to, message) => {
  if (!twilioClient) {
    await initializeTwilioClient();
  }

  if (!twilioClient) {
    return { success: false, reason: "SMS not configured" };
  }

  const smsConfig = await settingsService.getSmsConfig();

  // Ensure phone number has country code
  let phoneNumber = to.trim();
  if (!phoneNumber.startsWith('+')) {
    phoneNumber = '+91' + phoneNumber.replace(/^0+/, '');
  }

  try {
    await twilioClient.messages.create(buildTwilioMsgParams(smsConfig, phoneNumber, message));
    return { success: true, mobile: phoneNumber };
  } catch (error) {
    console.error("SMS send error:", error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Simple sendEmail(to, subject, body) for cron/scheduled emails
 */
exports.sendEmail = async (to, subject, body) => {
  if (!emailTransporter) await initializeEmailTransporter();
  if (!emailTransporter) {
    console.log('Email not configured - skipping');
    return { success: false, reason: 'Email not configured' };
  }
  const emailConfig = await settingsService.getEmailConfig();
  await emailTransporter.sendMail({
    from: `"${emailConfig.fromName || 'Hostel Management'}" <${emailConfig.fromEmail || emailConfig.user}>`,
    to,
    subject,
    html: String(body || '').replace(/\n/g, '<br>')
  });
  return { success: true };
};

/**
 * Send SMS receipt after fee payment to father's number
 */
exports.sendSMSReceipt = async (studentId, { amount, invoiceNumber }) => {
  try {
    if (!twilioClient) await initializeTwilioClient();
    if (!twilioClient) return { success: false, reason: 'SMS not configured' };

    const smsConfig = await settingsService.getSmsConfig();
    const student = db.db.prepare(`SELECT student_name, father_name, father_mobile FROM students WHERE student_id = ?`).get(studentId);

    if (!student || !student.father_mobile) return { success: false, reason: 'No father mobile' };

    const phoneNumber = '+91' + String(student.father_mobile).replace(/^0+/, '');
    const msg = `Dear ${student.father_name || 'Parent'}, Payment of Rs.${amount} received for ${student.student_name}. Receipt: ${invoiceNumber}. Thank you!`;

    await twilioClient.messages.create(buildTwilioMsgParams(smsConfig, phoneNumber, msg));

    db.db.prepare(`
      INSERT INTO notification_logs (student_id, notification_type, notification_method, notification_status, notification_message, sent_at)
      VALUES (?, 'fee_receipt', 'sms', 'sent', ?, datetime('now'))
    `).run(studentId, `Receipt SMS sent to ${student.father_mobile}`);

    console.log(`✅ Receipt SMS sent to ${student.father_mobile}`);
    return { success: true, mobile: student.father_mobile };
  } catch (error) {
    console.error('Receipt SMS error:', error.message);
    db.db.prepare(`
      INSERT INTO notification_logs (student_id, notification_type, notification_method, notification_status, notification_message, sent_at)
      VALUES (?, 'fee_receipt', 'sms', 'failed', ?, datetime('now'))
    `).run(studentId, `Receipt SMS failed: ${error.message}`);
    return { success: false, error: error.message };
  }
};

/**
 * Send WhatsApp message via Twilio
 */
const sendWhatsApp = async (to, body, mediaUrl) => {
  try {
    if (!twilioClient) await initializeTwilioClient();
    if (!twilioClient) return { success: false, reason: 'Twilio not configured' };

    const whatsappConfig = await settingsService.getWhatsappConfig();
    if (!whatsappConfig.enabled || !whatsappConfig.from) {
      return { success: false, reason: 'WhatsApp not configured' };
    }

    const phoneNumber = '+91' + String(to).replace(/^0+/, '').replace(/^\+91/, '');
    const params = {
      body,
      from: `whatsapp:${whatsappConfig.from}`,
      to: `whatsapp:${phoneNumber}`
    };
    if (mediaUrl) params.mediaUrl = Array.isArray(mediaUrl) ? mediaUrl : [mediaUrl];

    await twilioClient.messages.create(params);
    return { success: true, mobile: phoneNumber };
  } catch (error) {
    console.error('WhatsApp error:', error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Send WhatsApp reminder for due fee with invoice PDF
 */
exports.sendWhatsAppReminder = async (studentId, feeDetails) => {
  try {
    const student = db.db.prepare(`
      SELECT s.student_name, s.father_name, s.father_mobile,
             sf.fee_amount, sf.due_date, sf.fee_status
      FROM students s
      JOIN student_fees sf ON s.student_id = sf.student_id
      WHERE s.student_id = ? AND sf.fee_id = ?
    `).get(studentId, feeDetails.fee_id);

    if (!student || !student.father_mobile) return { success: false, reason: 'No father mobile' };

    const msg = `Dear ${student.father_name || 'Parent'},\n\nFee reminder for ${student.student_name}.\nAmount: Rs.${student.fee_amount}\nDue: ${student.due_date || 'N/A'}\nStatus: ${student.fee_status}\n\nPlease pay at the earliest.`;

    let mediaUrl = null;
    try {
      const invoicePath = await invoiceService.generateInvoicePDF(feeDetails.fee_id, { isPaid: false });
      const hostelInfo = await settingsService.getHostelInfo() || {};
      if (hostelInfo.app_url) {
        mediaUrl = `${hostelInfo.app_url}/api/fees/invoice/${feeDetails.fee_id}/download`;
      }
    } catch (_) {}

    const result = await sendWhatsApp(student.father_mobile, msg, mediaUrl);

    db.db.prepare(`
      INSERT INTO notification_logs (student_id, notification_type, notification_method, notification_status, notification_message, sent_at)
      VALUES (?, 'fee_reminder', 'whatsapp', ?, ?, datetime('now'))
    `).run(studentId, result.success ? 'sent' : 'failed', `WhatsApp reminder ${result.success ? 'sent to' : 'failed for'} ${student.father_mobile}`);

    return result;
  } catch (error) {
    console.error('WhatsApp reminder error:', error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Send WhatsApp receipt after payment with receipt PDF
 */
exports.sendWhatsAppReceipt = async (studentId, { feeId, amount, invoiceNumber }) => {
  try {
    const student = db.db.prepare(`SELECT student_name, father_name, father_mobile FROM students WHERE student_id = ?`).get(studentId);
    if (!student || !student.father_mobile) return { success: false, reason: 'No father mobile' };

    const msg = `Dear ${student.father_name || 'Parent'},\n\nPayment of Rs.${amount} received for ${student.student_name}.\nReceipt: ${invoiceNumber}\n\nThank you!`;

    let mediaUrl = null;
    try {
      if (feeId) {
        const hostelInfo = await settingsService.getHostelInfo() || {};
        if (hostelInfo.app_url) {
          mediaUrl = `${hostelInfo.app_url}/api/fees/invoice/${invoiceNumber}/download`;
        }
      }
    } catch (_) {}

    const result = await sendWhatsApp(student.father_mobile, msg, mediaUrl);

    db.db.prepare(`
      INSERT INTO notification_logs (student_id, notification_type, notification_method, notification_status, notification_message, sent_at)
      VALUES (?, 'fee_receipt', 'whatsapp', ?, ?, datetime('now'))
    `).run(studentId, result.success ? 'sent' : 'failed', `WhatsApp receipt ${result.success ? 'sent to' : 'failed for'} ${student.father_mobile}`);

    return result;
  } catch (error) {
    console.error('WhatsApp receipt error:', error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Send all notifications after fee payment (email + SMS + WhatsApp)
 * Called from fee.controller.js after successful payment
 */
exports.sendPaymentNotifications = async (studentId, { feeId, amount, invoiceNumber }) => {
  const results = {};
  try {
    results.email = await exports.sendFeeReceiptEmail(studentId, feeId, invoiceNumber);
  } catch (e) { results.email = { success: false, error: e.message }; }
  try {
    results.sms = await exports.sendSMSReceipt(studentId, { amount, invoiceNumber });
  } catch (e) { results.sms = { success: false, error: e.message }; }
  try {
    results.whatsapp = await exports.sendWhatsAppReceipt(studentId, { feeId, amount, invoiceNumber });
  } catch (e) { results.whatsapp = { success: false, error: e.message }; }
  console.log('Payment notifications:', JSON.stringify(results));
  return results;
};

/**
 * Send all reminders (email + SMS + WhatsApp) for due fee
 */
exports.sendFeeReminder = async (studentId, feeId) => {
  const feeDetails = { fee_id: feeId };

  const [emailResult, smsResult] = await Promise.all([
    exports.sendEmailReminder(studentId, feeDetails),
    exports.sendSMSReminder(studentId, feeDetails)
  ]);

  let whatsappResult = { success: false, reason: 'skipped' };
  try {
    whatsappResult = await exports.sendWhatsAppReminder(studentId, feeDetails);
  } catch (e) { whatsappResult = { success: false, error: e.message }; }

  return { email: emailResult, sms: smsResult, whatsapp: whatsappResult };
};

module.exports = exports;