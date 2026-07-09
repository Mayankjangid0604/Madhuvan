// Public webhooks (no auth) — used by external payment gateways.
// PhonePe posts an X-VERIFY header and a base64 payload. Signature format:
//   sha256(base64Payload + '/api/webhooks/phonepe' + saltKey) + '###' + saltIndex
// See https://developer.phonepe.com/v1/docs/server-to-server-callback for details.
const express = require("express");
const crypto = require("crypto");
const router = express.Router();
const db = require("../config/db.sqlite");
const settingsService = require("../services/settings.service");
const feeService = require("../services/fee.service");
const docService = require("../services/docNumber.service");
let emailCron;
try { emailCron = require("../cron/emailSchedule.cron"); } catch { emailCron = { sendPaymentReceipt: async () => {} }; }

const WEBHOOK_PATH = "/api/webhooks/phonepe";

const verifyPhonePeSignature = (body, header, saltKey, saltIndex) => {
  if (!header) return false;
  const [providedHash, providedIndex] = String(header).split("###");
  const expected = crypto
    .createHash("sha256")
    .update(body + WEBHOOK_PATH + saltKey)
    .digest("hex");
  return providedHash === expected && String(providedIndex) === String(saltIndex);
};

router.post("/phonepe", express.json({
  verify: (req, _res, buf) => { req.rawBody = buf.toString("utf8"); }
}), async (req, res) => {
  try {
    const cfg = await settingsService.getConfig("phonepe_config", { enabled: false });
    if (!cfg?.enabled) {
      return res.status(503).json({ success: false, message: "PhonePe integration is disabled" });
    }

    // Verify checksum
    const raw = req.rawBody || JSON.stringify(req.body);
    const xVerify = req.headers["x-verify"];
    if (!verifyPhonePeSignature(raw, xVerify, cfg.salt_key, cfg.salt_index || "1")) {
      console.warn("PhonePe webhook: invalid signature");
      return res.status(401).json({ success: false, message: "Invalid signature" });
    }

    // PhonePe payload structure: { response: "<base64 JSON>" }
    let payload;
    try {
      const b64 = req.body?.response;
      payload = b64 ? JSON.parse(Buffer.from(b64, "base64").toString("utf8")) : req.body;
    } catch (e) {
      return res.status(400).json({ success: false, message: "Bad payload" });
    }

    const code = payload?.code;
    const data = payload?.data || {};
    const merchantTxnId = data.merchantTransactionId; // Format: MHF-<studentId>-<feeId>-<ts>
    const amountPaise = Number(data.amount || 0);
    const amount = amountPaise / 100;

    if (code !== "PAYMENT_SUCCESS") {
      console.log(`PhonePe webhook: ${code} for ${merchantTxnId}`);
      return res.json({ success: true, message: "Non-success acknowledged" });
    }

    // Extract fee_id from merchantTransactionId
    const match = /^MHF-(\d+)-(\d+)-/.exec(String(merchantTxnId || ""));
    if (!match) {
      console.warn("PhonePe webhook: could not parse fee from merchantTransactionId:", merchantTxnId);
      return res.status(400).json({ success: false, message: "Cannot resolve fee from merchantTransactionId" });
    }
    const studentId = Number(match[1]);
    const feeId = Number(match[2]);

    // Duplicate check: skip if this transaction was already processed
    const txnRef = data.transactionId || merchantTxnId;
    const existing = db.db.prepare(`
      SELECT payment_id FROM fee_payments WHERE reference_no = ? AND payment_mode = 'PHONEPE'
    `).get(txnRef);
    if (existing) {
      console.log(`PhonePe webhook: duplicate callback for ${txnRef}, skipping`);
      return res.json({ success: true, message: "Duplicate — already processed" });
    }

    // Mark fee PAID (or add partial payment)
    const paidAt = new Date().toISOString().split("T")[0];
    try {
      db.db.prepare(`
        UPDATE student_fees
           SET paid_amount = COALESCE(paid_amount, 0) + ?,
               fee_status = CASE
                 WHEN COALESCE(paid_amount, 0) + ? >= final_amount THEN 'PAID'
                 ELSE COALESCE(fee_status, 'DUE')
               END,
               payment_date = ?,
               payment_mode = 'PHONEPE',
               reference_no = ?
         WHERE fee_id = ?
      `).run(amount, amount, paidAt, txnRef, feeId);

      db.db.prepare(`
        INSERT INTO fee_payments
          (student_id, fee_id, payment_amount, payment_date, payment_mode, reference_no, received_by)
        VALUES (?, ?, ?, ?, 'PHONEPE', ?, 'PhonePe Auto')
      `).run(studentId, feeId, amount, paidAt, txnRef);

      // Create ledger income entry
      try {
        const ledgerService = require("../services/ledger.service");
        const fee = db.db.prepare("SELECT fee_month FROM student_fees WHERE fee_id = ?").get(feeId);
        ledgerService.createFeePaymentEntry({
          student_id: studentId,
          payment_amount: amount,
          payment_date: paidAt,
          payment_mode: 'PHONEPE',
          reference_no: txnRef,
          fee_month: fee?.fee_month || paidAt
        });
      } catch (le) {
        console.warn("PhonePe webhook: ledger entry failed:", le.message);
      }
    } catch (e) {
      console.error("Failed to update fee row from PhonePe webhook:", e.message);
    }

    // Fire receipt email (student copy)
    try {
      const receiptNumber = docService.nextDocNumber("receipt");
      const fee = db.db.prepare("SELECT * FROM student_fees WHERE fee_id = ?").get(feeId);
      await emailCron.sendPaymentReceipt({
        studentId,
        receiptNumber,
        amount,
        forPeriod: fee?.fee_type || "",
        paymentDate: paidAt,
      });
    } catch (e) {
      console.warn("Receipt email failed:", e.message);
    }

    res.json({ success: true, message: "Payment recorded" });
  } catch (err) {
    console.error("PhonePe webhook error:", err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
