// Automated fee email schedule
//   1st of month  at 08:00  → Invoice email (fee generated for the month)
//   3rd of month  at 08:00  → Reminder (fee due in 2 days)
//   5th of month  at 08:00  → Last-day reminder (penalty applies from tomorrow)
//   6th+ daily    at 08:00  → Updated invoice email with penalty added
//                             (no GST on the penalty amount)
//   On payment received      → Receipt email (student copy only)
//
// The actual email sending function is `sendEmail(to, subject, body)` from
// notification.service.js. If SMTP is not configured, sends will silently
// no-op and log a warning.

const cron = require("node-cron");
const db = require("../config/db.sqlite");
const settingsService = require("../services/settings.service");
let notificationService;
try {
  notificationService = require("../services/notification.service");
} catch (e) {
  notificationService = { sendEmail: async () => console.warn("notification.service missing:", e.message) };
}

const fmtINR = (n) => "₹" + Math.round(Number(n || 0)).toLocaleString("en-IN");

const fillTemplate = (tpl, vars) => {
  let s = String(tpl || "");
  Object.entries(vars || {}).forEach(([k, v]) => {
    s = s.split(`{${k}}`).join(String(v ?? ""));
  });
  return s;
};

// Fetch all active students with a father/mother email and their unpaid fees.
const getUnpaidFeesForCurrentMonth = () => {
  const now = new Date();
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  return db.db.prepare(`
    SELECT
      s.student_id, s.student_name, s.father_name, s.mother_name,
      s.father_email, s.mother_email,
      sf.fee_id, sf.fee_type, sf.fee_month, sf.final_amount,
      sf.paid_amount, sf.penalty_amount, sf.due_date
    FROM student_fees sf
    JOIN students s ON s.student_id = sf.student_id
    WHERE s.status = 'active' AND s.date_of_leaving IS NULL
      AND sf.fee_status != 'PAID'
      AND (sf.fee_month = ? OR sf.fee_month LIKE ?)
  `).all(monthStart, `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}%`);
};

const runInvoiceRound = async () => {
  const rows = getUnpaidFeesForCurrentMonth();
  const templates = await settingsService.getTemplates().catch(() => ({}));
  const tpl = templates.invoice_email || {
    subject: "Invoice - {student_name}",
    body: "Dear {father_name},\n\nInvoice for {student_name} is generated for this month. Amount: {fee_amount}. Due: {due_date}.\n\nRegards,\n{hostel_name}"
  };
  const hostelInfo = (await settingsService.getHostelInfo?.().catch(() => ({}))) || {};
  const hostelName = hostelInfo?.hostel_name || "Madhuvan Hostels";
  let sent = 0;
  for (const r of rows) {
    const to = r.father_email || r.mother_email;
    if (!to) continue;
    const remaining = Math.max(0, Number(r.final_amount) - Number(r.paid_amount || 0));
    const vars = {
      student_name: r.student_name,
      father_name: r.father_name || "",
      fee_amount: fmtINR(remaining + Number(r.penalty_amount || 0)),
      due_date: r.due_date || "-",
      period: r.fee_type,
      hostel_name: hostelName,
      invoice_number: `INV-${r.student_id}-${r.fee_id}`,
    };
    try {
      await notificationService.sendEmail(to, fillTemplate(tpl.subject, vars), fillTemplate(tpl.body, vars));
      sent++;
    } catch (e) {
      console.warn(`Invoice email to ${to} failed:`, e.message);
    }
  }
  console.log(`📧 Invoice emails sent: ${sent}/${rows.length}`);
  return sent;
};

const runReminderRound = async (kind /* 'due_in_2', 'due_today', 'overdue' */) => {
  const rows = getUnpaidFeesForCurrentMonth();
  const templates = await settingsService.getTemplates().catch(() => ({}));
  const tpl = templates.email || {
    subject: "Fee Payment Reminder - {student_name}",
    body: "Dear {father_name},\n\n{reminder_body}\n\nAmount: {fee_amount}. Due: {due_date}.\n\nRegards,\n{hostel_name}"
  };
  const hostelInfo = (await settingsService.getHostelInfo?.().catch(() => ({}))) || {};
  const hostelName = hostelInfo?.hostel_name || "Madhuvan Hostels";
  const reminderBody = {
    due_in_2: "This is a friendly reminder — the hostel fee will be due in 2 days.",
    due_today: "Today is the last day to pay the hostel fee. From tomorrow a late-payment penalty will apply.",
    overdue: "The hostel fee is overdue. A late-payment penalty has been added and continues to accrue.",
  }[kind] || "This is a reminder to pay the hostel fee.";

  let sent = 0;
  for (const r of rows) {
    const to = r.father_email || r.mother_email;
    if (!to) continue;
    const remaining = Math.max(0, Number(r.final_amount) - Number(r.paid_amount || 0));
    const vars = {
      student_name: r.student_name,
      father_name: r.father_name || "",
      fee_amount: fmtINR(remaining + Number(r.penalty_amount || 0)),
      due_date: r.due_date || "-",
      fee_status: kind === "overdue" ? "OVERDUE" : "DUE",
      hostel_name: hostelName,
      reminder_body: reminderBody,
    };
    try {
      await notificationService.sendEmail(to, fillTemplate(tpl.subject, vars), fillTemplate(tpl.body, vars));
      sent++;
    } catch (e) {
      console.warn(`Reminder email to ${to} failed:`, e.message);
    }
  }
  console.log(`📧 Reminder emails (${kind}) sent: ${sent}/${rows.length}`);
  return sent;
};

exports.startFeeEmailCrons = () => {
  const tz = { timezone: "Asia/Kolkata" };
  // 1st @ 08:00 — invoice
  cron.schedule("0 8 1 * *", () => runInvoiceRound().catch(e => console.error("Invoice cron failed:", e.message)), tz);
  // 3rd @ 08:00 — due-in-2 reminder
  cron.schedule("0 8 3 * *", () => runReminderRound("due_in_2").catch(e => console.error("Reminder cron failed:", e.message)), tz);
  // 5th @ 08:00 — last-day reminder
  cron.schedule("0 8 5 * *", () => runReminderRound("due_today").catch(e => console.error("Reminder cron failed:", e.message)), tz);
  // 6th–31st @ 08:00 — daily overdue reminder (updated invoice with penalty)
  cron.schedule("0 8 6-31 * *", () => runReminderRound("overdue").catch(e => console.error("Overdue cron failed:", e.message)), tz);
};

exports.sendPaymentReceipt = async ({ studentId, receiptNumber, amount, forPeriod, paymentDate }) => {
  const student = db.db.prepare("SELECT * FROM students WHERE student_id = ?").get(studentId);
  const to = student?.father_email || student?.mother_email;
  if (!to) return;

  const templates = await settingsService.getTemplates().catch(() => ({}));
  const tpl = templates.receipt_email || {
    subject: "Payment Receipt #{receipt_number} - {student_name}",
    body: "Dear {father_name},\n\nReceived {amount_paid} on {payment_date}. Receipt: {receipt_number}.\n\nThank you,\n{hostel_name}",
  };
  const hostelInfo = (await settingsService.getHostelInfo?.().catch(() => ({}))) || {};
  const vars = {
    student_name: student.student_name,
    father_name: student.father_name || "",
    receipt_number: receiptNumber,
    amount_paid: fmtINR(amount),
    payment_date: paymentDate,
    period: forPeriod || "-",
    hostel_name: hostelInfo?.hostel_name || "Madhuvan Hostels",
  };
  try {
    await notificationService.sendEmail(to, fillTemplate(tpl.subject, vars), fillTemplate(tpl.body, vars));
  } catch (e) {
    console.warn(`Receipt email to ${to} failed:`, e.message);
  }
};

// Manual triggers exposed for testing
exports.runInvoiceRound = runInvoiceRound;
exports.runReminderRound = runReminderRound;
