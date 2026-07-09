// controllers/fee.controller.js
const feeService = require("../services/fee.service");
const studentFeeDetailsService = require("../services/studentFeeDetails.service");
const asyncHandler = require("../utils/asyncHandler");

// Lazy load invoice service
let invoiceService = null;
const getInvoiceService = () => {
  if (!invoiceService) {
    try {
      invoiceService = require("../services/invoice.service");
    } catch (e) { }
  }
  return invoiceService;
};

let notificationService = null;
const getNotificationService = () => {
  if (!notificationService) {
    try { notificationService = require("../services/notification.service"); } catch (e) {}
  }
  return notificationService;
};

// ============================================
// GET ALL FEES (supports ?comprehensive=true)
// ============================================
exports.getAllFees = asyncHandler(async (req, res) => {
  const { comprehensive, student_id, month, status } = req.query;

  try {
    // ✅ FIX: When comprehensive=true, return student-grouped data
    if (comprehensive === 'true') {
      const data = feeService.getAllFeesComprehensive();
      return res.json({
        success: true,
        data: data,
        count: data.length
      });
    }

    // Normal flat fee list
    const filters = {};
    if (student_id) filters.student_id = parseInt(student_id);
    if (month) filters.month = month;
    if (status) filters.status = status;

    const fees = feeService.getAllFees(filters);

    return res.json({
      success: true,
      data: fees,
      count: fees.length
    });
  } catch (err) {
    console.error("Get all fees error:", err.message);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch fees"
    });
  }
});

// ============================================
// GET ALL PAYMENTS
// ============================================
exports.getAllPayments = asyncHandler(async (req, res) => {
  const { student_id } = req.query;

  try {
    let payments = feeService.getAllPayments(student_id ? parseInt(student_id) : null);

    return res.json({
      success: true,
      data: payments,
      count: payments.length
    });
  } catch (err) {
    console.error("Get all payments error:", err.message);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch payments"
    });
  }
});

// ============================================
// CREATE FEE
// ============================================
exports.createFee = asyncHandler(async (req, res) => {
  const { student_id, fee_month } = req.body;

  if (!student_id) {
    return res.status(400).json({
      success: false,
      message: "student_id is required"
    });
  }

  try {
    // ✅ FIX: Use correct function name
    const result = feeService.createMonthlyFee(student_id, fee_month);

    return res.status(201).json({
      success: true,
      message: "Fee created successfully",
      data: result
    });
  } catch (err) {
    console.error("Create fee error:", err.message);
    return res.status(500).json({
      success: false,
      message: err.message || "Failed to create fee"
    });
  }
});

// ============================================
// GET FEE BY ID
// ============================================
exports.getFeeById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  try {
    const fee = feeService.getFeeById(id);

    if (!fee) {
      return res.status(404).json({
        success: false,
        message: "Fee not found"
      });
    }

    return res.json({
      success: true,
      data: fee
    });
  } catch (err) {
    console.error("Get fee error:", err.message);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch fee"
    });
  }
});

// ============================================
// PAY FEE
// ============================================
exports.payFee = asyncHandler(async (req, res) => {
  const { student_id, payment_amount, payment_mode, reference_no, received_by, received_member_id, fee_type, fee_id } = req.body;

  if (!student_id || !payment_amount) {
    return res.status(400).json({
      success: false,
      message: "student_id and payment_amount are required"
    });
  }

  try {
    const { db: database } = require("../config/db.sqlite");

    // ✅ FIX ISSUE 3: Monthly Rent and Security Deposit are separate
    // If fee_type is specified (e.g. 'Security Deposit'), find that specific fee
    // Otherwise default to Monthly Rent only (FIFO by month)
    const targetFeeType = fee_type || 'Monthly Rent';
    
    let unpaidFee;
    
    if (fee_id) {
      unpaidFee = database.prepare(`
        SELECT fee_id, fee_type FROM student_fees 
        WHERE fee_id = ? AND student_id = ? AND fee_status != 'PAID'
      `).get(fee_id, student_id);
    } else {
      unpaidFee = database.prepare(`
        SELECT fee_id, fee_type FROM student_fees 
        WHERE student_id = ? AND fee_status != 'PAID' AND fee_type = ?
        ORDER BY fee_month ASC 
        LIMIT 1
      `).get(student_id, targetFeeType);
    }

    if (!unpaidFee) {
      // If no Monthly Rent fee found and no explicit type requested, check if any fee exists
      if (!fee_type) {
        const anyUnpaidFee = database.prepare(`
          SELECT fee_id, fee_type FROM student_fees 
          WHERE student_id = ? AND fee_status != 'PAID'
          ORDER BY fee_month ASC 
          LIMIT 1
        `).get(student_id);

        if (!anyUnpaidFee) {
          return res.status(400).json({
            success: false,
            message: "No unpaid fees found for this student"
          });
        }

        // Fall back to whatever fee exists (could be security deposit)
        const result = feeService.payFee({
          fee_id: anyUnpaidFee.fee_id,
          student_id,
          payment_amount: Number(payment_amount),
          payment_mode: payment_mode || 'CASH',
          reference_no,
          received_by,
          received_member_id
        });

        // Send notifications (non-blocking)
        const ns = getNotificationService();
        if (ns) {
          ns.sendPaymentNotifications(student_id, {
            feeId: anyUnpaidFee.fee_id,
            amount: Number(payment_amount),
            invoiceNumber: result.invoice_number || ''
          }).catch(e => console.error('Notification error:', e.message));
        }

        return res.json({
          success: true,
          message: "Payment recorded successfully",
          data: result
        });
      }

      return res.status(400).json({
        success: false,
        message: `No unpaid ${targetFeeType} fees found for this student`
      });
    }

    const result = feeService.payFee({
      fee_id: unpaidFee.fee_id,
      student_id,
      payment_amount: Number(payment_amount),
      payment_mode: payment_mode || 'CASH',
      reference_no,
      received_by,
      received_member_id
    });

    // Send notifications (non-blocking)
    const ns = getNotificationService();
    if (ns) {
      ns.sendPaymentNotifications(student_id, {
        feeId: unpaidFee.fee_id,
        amount: Number(payment_amount),
        invoiceNumber: result.invoice_number || ''
      }).catch(e => console.error('Notification error:', e.message));
    }

    return res.json({
      success: true,
      message: "Payment recorded successfully",
      data: result
    });
  } catch (err) {
    console.error("Pay fee error:", err.message);
    return res.status(500).json({
      success: false,
      message: err.message || "Failed to record payment"
    });
  }
});

// ============================================
// PAY ALL REMAINING FEES (Single invoice, single entry)
// ============================================
exports.payAllFees = asyncHandler(async (req, res) => {
  const { student_id, payment_amount, payment_mode, reference_no, received_by, received_member_id } = req.body;

  if (!student_id || !payment_amount) {
    return res.status(400).json({ success: false, message: "student_id and payment_amount are required" });
  }

  try {
    const { db: database } = require("../config/db.sqlite");
    const toNum = (v) => Number(v) || 0;

    const payAllTx = database.transaction(() => {
      const student = database.prepare("SELECT * FROM students WHERE student_id = ?").get(student_id);
      if (!student) throw new Error("Student not found");

      // STEP 1: Bake pending items into a rent fee
      // First try unpaid rent fee, then fall back to LAST rent fee (even if PAID)
      // ✅ FIX: Look for any unpaid rent fee (monthly, half-yearly, or yearly)
      let targetFee = database.prepare(`
        SELECT fee_id FROM student_fees 
        WHERE student_id = ? AND fee_type IN ('Monthly Rent','Half-Yearly Rent','Yearly Rent') AND fee_status != 'PAID'
        ORDER BY fee_month ASC LIMIT 1
      `).get(student_id);

      if (!targetFee) {
        // All fees are PAID — use the last rent fee to bake fines into
        targetFee = database.prepare(`
          SELECT fee_id FROM student_fees 
          WHERE student_id = ? AND fee_type IN ('Monthly Rent','Half-Yearly Rent','Yearly Rent')
          ORDER BY fee_month DESC LIMIT 1
        `).get(student_id);
      }

      if (targetFee) {
        const pendingFines = toNum(database.prepare(`
          SELECT COALESCE(SUM(amount), 0) as total FROM pending_fines WHERE student_id = ? AND status = 'PENDING'
        `).get(student_id)?.total);

        const pendingDamages = toNum(database.prepare(`
          SELECT COALESCE(SUM(amount), 0) as total FROM property_damage_records WHERE student_id = ? AND status = 'PENDING' AND deducted_from_security = 0
        `).get(student_id)?.total);

        const pendingMoney = toNum(database.prepare(`
          SELECT COALESCE(SUM(amount), 0) as total FROM money_given_records WHERE student_id = ? AND status = 'PENDING' AND deducted_from_security = 0
        `).get(student_id)?.total);

        if (pendingFines > 0 || pendingDamages > 0 || pendingMoney > 0) {
          database.prepare(`
            UPDATE student_fees SET fine_amount = fine_amount + ?, property_damage_amount = property_damage_amount + ?, money_given_amount = money_given_amount + ?,
            fee_status = CASE WHEN fee_status = 'PAID' THEN 'DUE' ELSE fee_status END,
            updated_at = CURRENT_TIMESTAMP
            WHERE fee_id = ?
          `).run(pendingFines, pendingDamages, pendingMoney, targetFee.fee_id);

          // Mark pending items as applied
          database.prepare(`UPDATE pending_fines SET status = 'APPLIED', applied_to_fee_id = ?, applied_at = CURRENT_TIMESTAMP WHERE student_id = ? AND status = 'PENDING'`).run(targetFee.fee_id, student_id);
          database.prepare(`UPDATE property_damage_records SET status = 'APPLIED', applied_to_fee_id = ? WHERE student_id = ? AND status = 'PENDING' AND deducted_from_security = 0`).run(targetFee.fee_id, student_id);
          database.prepare(`UPDATE money_given_records SET status = 'APPLIED', applied_to_fee_id = ? WHERE student_id = ? AND status = 'PENDING' AND deducted_from_security = 0`).run(targetFee.fee_id, student_id);
        }
      }

      // STEP 2: Get all fees with remaining balance (including ones that just had fines added)
      const unpaidFees = database.prepare(`
        SELECT fee_id, fee_type, paid_amount,
               (COALESCE(final_amount,0) + COALESCE(previous_dues,0) + COALESCE(penalty_amount,0) + COALESCE(fine_amount,0) + COALESCE(property_damage_amount,0) + COALESCE(money_given_amount,0) - COALESCE(paid_amount,0) - COALESCE(advance_used,0)) as remaining
        FROM student_fees 
        WHERE student_id = ? AND (fee_status != 'PAID' OR (COALESCE(final_amount,0) + COALESCE(previous_dues,0) + COALESCE(penalty_amount,0) + COALESCE(fine_amount,0) + COALESCE(property_damage_amount,0) + COALESCE(money_given_amount,0) - COALESCE(paid_amount,0) - COALESCE(advance_used,0)) > 0)
        ORDER BY CASE fee_type WHEN 'Monthly Rent' THEN 1 ELSE 2 END, fee_month ASC
      `).all(student_id);

      if (!unpaidFees || unpaidFees.length === 0) {
        throw new Error("No unpaid fees found for this student");
      }

      // STEP 3: Distribute payment across fees (update each fee directly)
      let remainingAmount = Number(payment_amount);
      let totalApplied = 0;
      let firstFeeId = unpaidFees[0].fee_id;
      const breakdown = [];

      for (const fee of unpaidFees) {
        if (remainingAmount <= 0) break;
        const feeRemaining = Math.max(0, fee.remaining);
        if (feeRemaining <= 0) continue;

        const applyAmount = Math.min(remainingAmount, feeRemaining);
        const newPaidAmount = toNum(fee.paid_amount) + applyAmount;

        // Recalculate total due for this fee
        const fullFee = database.prepare("SELECT * FROM student_fees WHERE fee_id = ?").get(fee.fee_id);
        const totalDue = toNum(fullFee.final_amount) + toNum(fullFee.previous_dues) + toNum(fullFee.penalty_amount) + toNum(fullFee.fine_amount) + toNum(fullFee.property_damage_amount) + toNum(fullFee.money_given_amount) - toNum(fullFee.advance_used);

        // Build itemized breakdown by greedily consuming applyAmount
        let appliedToBreakdown = applyAmount;
        const addBreakdown = (type, bucketAmount, month) => {
           if (bucketAmount > 0 && appliedToBreakdown > 0) {
             const amt = Math.min(bucketAmount, appliedToBreakdown);
             breakdown.push({ type, amount: amt, month });
             appliedToBreakdown -= amt;
           }
        };

        const monthStr = fee.fee_month ? new Date(fee.fee_month).toLocaleString('en-IN', {month: 'short', year: 'numeric'}) : '';
        addBreakdown('Property Damage', toNum(fullFee.property_damage_amount), '');
        addBreakdown('Fine', toNum(fullFee.fine_amount), '');
        addBreakdown('Penalty', toNum(fullFee.penalty_amount), '');
        addBreakdown('Money Given', toNum(fullFee.money_given_amount), '');
        addBreakdown('Previous Dues', toNum(fullFee.previous_dues), '');
        addBreakdown(fee.fee_type || 'Rent', toNum(fullFee.final_amount), monthStr);

        let newStatus;
        if (newPaidAmount >= totalDue) newStatus = "PAID";
        else if (newPaidAmount > 0) newStatus = "PARTIAL";
        else newStatus = fullFee.fee_status;

        database.prepare(`
          UPDATE student_fees SET paid_amount = ?, fee_status = ?, updated_at = CURRENT_TIMESTAMP WHERE fee_id = ?
        `).run(newPaidAmount, newStatus, fee.fee_id);

        remainingAmount -= applyAmount;
        totalApplied += applyAmount;
      }

      // STEP 4: Generate ONE invoice number
      const year = new Date().getFullYear();
      const prefix = `INV-${year}-`;
      const last = database.prepare(`SELECT invoice_number FROM fee_payments WHERE invoice_number LIKE ? ORDER BY payment_id DESC LIMIT 1`).get(`${prefix}%`);
      const seq = last?.invoice_number ? parseInt(last.invoice_number.split('-').pop()) + 1 : 1;
      const invoiceNumber = `${prefix}${String(seq).padStart(6, '0')}`;
      const paymentDate = new Date().toISOString().split("T")[0];

      // Add advance to breakdown if any
      if (remainingAmount > 0) {
        breakdown.push({ type: 'Advance Created', amount: remainingAmount, month: '' });
      }

      // Update invoice on the first fee
      database.prepare(`
        UPDATE student_fees SET invoice_number = ?, invoice_generated_at = CURRENT_TIMESTAMP WHERE fee_id = ?
      `).run(invoiceNumber, firstFeeId);

      // STEP 5: Create ONE payment record
      const normalizedMode = (() => {
        if (!payment_mode) return 'CASH';
        const upper = payment_mode.toUpperCase().trim();
        return ['CASH', 'UPI', 'BANK', 'CHEQUE', 'ONLINE', 'CARD'].includes(upper) ? upper : 'CASH';
      })();

      database.prepare(`
        INSERT INTO fee_payments (fee_id, student_id, payment_amount, payment_date, payment_mode, reference_no, received_by, received_member_id, notes, is_advance_payment, invoice_number, breakdown)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(firstFeeId, student_id, Number(payment_amount), paymentDate, normalizedMode, reference_no || null, received_by || 'ADMIN', received_member_id || null, 'Pay All Fees', 0, invoiceNumber, JSON.stringify(breakdown));

      // STEP 6: Create Ledger Entries
      let currentBalance = database.prepare(`SELECT COALESCE(SUM(debit), 0) - COALESCE(SUM(credit), 0) as balance FROM ledger_entries`).get();
      let ledgerBalance = toNum(currentBalance?.balance);

      if (totalApplied > 0) {
        ledgerBalance += totalApplied;
        database.prepare(`
          INSERT INTO ledger_entries (entry_date, entry_type, category, amount, debit, credit, balance, payment_mode, reference_no, description, student_id)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(paymentDate, 'income', 'Fee Received', totalApplied, totalApplied, 0, ledgerBalance, normalizedMode, reference_no || invoiceNumber, `${student.student_name} S/O ${student.father_name || 'N/A'} - All Fees Applied: ₹${totalApplied}`, student_id);
      }

      const advanceAmt = remainingAmount;
      if (advanceAmt > 0) {
        ledgerBalance += advanceAmt;
        database.prepare(`
          INSERT INTO ledger_entries (entry_date, entry_type, category, amount, debit, credit, balance, payment_mode, reference_no, description, student_id)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(paymentDate, 'income', 'Advance Received', advanceAmt, advanceAmt, 0, ledgerBalance, normalizedMode, reference_no || invoiceNumber, `${student.student_name} S/O ${student.father_name || 'N/A'} - Advance Recv: ₹${advanceAmt}`, student_id);
      }

      // STEP 7: Member salary tracking (single entry)
      if (received_member_id && String(received_member_id) !== 'ADMIN' && String(received_member_id) !== '0' && String(received_member_id) !== '') {
        const memberId = Number(received_member_id);
        if (memberId > 0) {
          const member = database.prepare('SELECT member_id, name, salary FROM members WHERE member_id = ?').get(memberId);
          if (member) {
            const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
            const now = new Date();
            const pMonth = now.getMonth();
            const pYear = now.getFullYear();
            const salaryMonth = `${pYear}-${String(pMonth + 1).padStart(2, '0')}`;

            database.prepare(`
              INSERT INTO member_transactions (member_id, amount, transaction_type, description, reference_no, student_id, salary_month)
              VALUES (?, ?, 'fee_collection', ?, ?, ?, ?)
            `).run(memberId, Number(payment_amount), `Fee collected from ${student.student_name} S/O ${student.father_name || 'N/A'}`, reference_no || invoiceNumber, student_id, salaryMonth);

            ledgerBalance -= Number(payment_amount);
            database.prepare(`
              INSERT INTO ledger_entries (entry_date, entry_type, category, amount, debit, credit, balance, payment_mode, reference_no, description, student_id)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(paymentDate, 'expense', 'Salary - Fee Collection', Number(payment_amount), 0, Number(payment_amount), ledgerBalance, 'Internal', `SAL-${memberId}-${Date.now()}`, `Salary: ${member.name} - Fee collection from ${student.student_name}`, null);
          }
        }
      }

      // STEP 8: Handle excess as advance
      if (remainingAmount > 0) {
        database.prepare(`
          INSERT INTO student_advances (student_id, amount, original_amount, used_amount, status, notes, created_at)
          VALUES (?, ?, ?, 0, 'PENDING', 'Overpayment - Pay All', CURRENT_TIMESTAMP)
        `).run(student_id, remainingAmount, remainingAmount);
      }

      return {
        total_paid: totalApplied,
        invoice_number: invoiceNumber,
        advance_received: remainingAmount > 0 ? remainingAmount : 0
      };
    });

    const result = payAllTx();

    // Send notifications (non-blocking)
    const ns = getNotificationService();
    if (ns) {
      ns.sendPaymentNotifications(student_id, {
        feeId: null,
        amount: Number(payment_amount),
        invoiceNumber: result.invoice_number || ''
      }).catch(e => console.error('Notification error:', e.message));
    }

    return res.json({
      success: true,
      message: "All fees paid successfully",
      data: result
    });

  } catch (err) {
    console.error("Pay all fees error:", err.message);
    return res.status(500).json({ success: false, message: err.message || "Failed to process payment" });
  }
});

// ============================================
// GENERATE ALL FEES
// ============================================
exports.generateAllFees = asyncHandler(async (req, res) => {
  const { month } = req.body;

  try {
    // ✅ FIX: Use correct function name
    const result = feeService.generateAllMonthlyFees(month);

    return res.json({
      success: true,
      message: "Fees generated successfully",
      data: result
    });
  } catch (err) {
    console.error("Generate all fees error:", err.message);
    return res.status(500).json({
      success: false,
      message: err.message || "Failed to generate fees"
    });
  }
});

// ============================================
// UPDATE ALL FEE STATUSES
// ============================================
exports.updateAllFeeStatuses = asyncHandler(async (req, res) => {
  try {
    const result = feeService.updateAllFeeStatuses();

    return res.json({
      success: true,
      message: "Fee statuses updated",
      data: result
    });
  } catch (err) {
    console.error("Update fee statuses error:", err.message);
    return res.status(500).json({
      success: false,
      message: "Failed to update fee statuses"
    });
  }
});

// ============================================
// APPLY PENALTIES
// ============================================
exports.applyPenalties = asyncHandler(async (req, res) => {
  try {
    const result = feeService.applyPenalties();

    return res.json({
      success: true,
      message: "Penalties applied",
      data: result
    });
  } catch (err) {
    console.error("Apply penalties error:", err.message);
    return res.status(500).json({
      success: false,
      message: "Failed to apply penalties"
    });
  }
});

// ============================================
// GET STUDENT FEE DETAILS
// ============================================
exports.getStudentFeeDetails = asyncHandler(async (req, res) => {
  const { studentId } = req.params;

  try {
    const details = studentFeeDetailsService.getStudentFeeDetails(studentId);

    if (!details) {
      return res.status(404).json({
        success: false,
        message: "Student fee details not found"
      });
    }

    return res.json({
      success: true,
      data: details
    });
  } catch (err) {
    console.error("Get student fee details error:", err.message);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch student fee details"
    });
  }
});

// ============================================
// GET STUDENT FEE SUMMARY
// ============================================
exports.getStudentFeeSummary = asyncHandler(async (req, res) => {
  const { studentId } = req.params;

  try {
    const summary = feeService.getStudentFeeSummary(studentId);

    if (!summary) {
      return res.status(404).json({
        success: false,
        message: "Student fee summary not found"
      });
    }

    return res.json({
      success: true,
      data: summary
    });
  } catch (err) {
    console.error("Get student fee summary error:", err.message);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch student fee summary"
    });
  }
});

// ============================================
// GET PAYMENT BY INVOICE
// ============================================
exports.getPaymentByInvoice = asyncHandler(async (req, res) => {
  const { invoiceNumber } = req.params;

  try {
    const payment = feeService.getPaymentByInvoice(invoiceNumber);

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Invoice not found"
      });
    }

    return res.json({
      success: true,
      data: payment
    });
  } catch (err) {
    console.error("Get payment by invoice error:", err.message);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch payment"
    });
  }
});

// ============================================
// DOWNLOAD INVOICE PDF
// ============================================
exports.downloadInvoice = asyncHandler(async (req, res) => {
  const { invoiceNumber } = req.params;

  const invoice = getInvoiceService();

  if (!invoice) {
    const payment = feeService.getPaymentByInvoice(invoiceNumber);
    if (!payment) {
      return res.status(404).json({ success: false, message: "Invoice not found" });
    }
    return res.json({ success: true, data: payment });
  }

  try {
    const filePath = await invoice.generateInvoicePDF(invoiceNumber);
    const fileName = `Receipt_${invoiceNumber.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
    res.download(filePath, fileName);
  } catch (err) {
    console.error("Invoice generation error:", err.message);
    const payment = feeService.getPaymentByInvoice(invoiceNumber);
    if (!payment) {
      return res.status(404).json({ success: false, message: "Invoice not found" });
    }
    return res.json({ success: true, data: payment });
  }
});

// APPLY WAIVER / CONCESSION
exports.applyWaiver = asyncHandler(async (req, res) => {
  const { fee_id, amount, reason } = req.body;
  if (!fee_id || !amount) {
    return res.status(400).json({ success: false, message: "fee_id and amount are required" });
  }
  try {
    const result = feeService.applyWaiver({ fee_id, amount, reason });
    return res.json({ success: true, message: "Waiver applied", data: result });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
});

// EARLY EXIT INVOICE PREVIEW
exports.getEarlyExitInvoice = asyncHandler(async (req, res) => {
  try {
    const studentId = Number(req.params.studentId);
    const { exit_date } = req.query;
    const data = studentFeeDetailsService.computeEarlyExitInvoice({ studentId, exit_date });
    res.json({ success: true, data });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

module.exports = exports;