const db = require("../config/db.sqlite");

console.log("========================================");
console.log("STARTING OVERPAYMENT & LEDGER FIX SCRIPT");
console.log("========================================");

try {
  const transaction = db.db.transaction(() => {
    // 1. Fix Fee Payments Breakdown
    console.log("\n[1] Check and Fix Fee Payment Breakdowns...");
    const payments = db.db.prepare("SELECT * FROM fee_payments").all();
    let fixedBreakdowns = 0;

    for (const payment of payments) {
      try {
        if (payment.breakdown && Array.isArray(JSON.parse(payment.breakdown))) {
            const parsed = JSON.parse(payment.breakdown);
            // Re-run if it has "Total Fees Applied"
            if (!parsed.some(p => p.type === 'Total Fees Applied')) {
              continue;
            }
        }
      } catch (e) {}

      const breakdown = [];
      const paymentAmount = Number(payment.payment_amount) || 0;

      if (payment.notes === 'Pay All Fees' && payment.invoice_number) {
        // Find all fees under this invoice
        const fees = db.db.prepare("SELECT * FROM student_fees WHERE invoice_number = ? ORDER BY fee_month ASC").all(payment.invoice_number);
        let remainingAmount = paymentAmount;
        let totalApplied = 0;

        for (const f of fees) {
          const appliedToFee = Math.min(Number(f.paid_amount) || 0, remainingAmount);
          if (appliedToFee <= 0) continue;

          let appliedToBreakdown = appliedToFee;
          const addBreakdown = (type, bucketAmount, month) => {
             if (bucketAmount > 0 && appliedToBreakdown > 0) {
               const amt = Math.min(bucketAmount, appliedToBreakdown);
               breakdown.push({ type, amount: amt, month });
               appliedToBreakdown -= amt;
             }
          };

          const monthStr = f.fee_month ? new Date(f.fee_month).toLocaleString('en-IN', {month: 'short', year: 'numeric'}) : '';
          addBreakdown('Property Damage', Number(f.property_damage_amount) || 0, '');
          addBreakdown('Fine', Number(f.fine_amount) || 0, '');
          addBreakdown('Penalty', Number(f.penalty_amount) || 0, '');
          addBreakdown('Money Given', Number(f.money_given_amount) || 0, '');
          addBreakdown('Previous Dues', Number(f.previous_dues) || 0, '');
          addBreakdown(f.fee_type || 'Rent', Number(f.final_amount) || 0, monthStr);

          remainingAmount -= appliedToFee;
          totalApplied += appliedToFee;
        }
        
        if (remainingAmount > 0) {
          breakdown.push({ type: 'Advance Created', amount: remainingAmount, month: '' });
        }
      } else if (payment.fee_id) {
        // Single fee payment
        const fee = db.db.prepare("SELECT * FROM student_fees WHERE fee_id = ?").get(payment.fee_id);
        if (fee) {
          const totalDue = (Number(fee.final_amount) || 0) + (Number(fee.previous_dues) || 0) + 
                           (Number(fee.penalty_amount) || 0) + (Number(fee.fine_amount) || 0) + 
                           (Number(fee.property_damage_amount) || 0) + (Number(fee.money_given_amount) || 0) - 
                           (Number(fee.advance_used) || 0);

          let appliedAmount = paymentAmount;
          let excessAmount = Math.max(0, paymentAmount - totalDue);

          if (excessAmount > 0) {
            appliedAmount = totalDue;
          }

          if (appliedAmount > 0) {
            const dateStr = fee.fee_month ? new Date(fee.fee_month).toLocaleString('en-IN', {month: 'short', year: 'numeric'}) : '';
            breakdown.push({
              type: fee.fee_type || 'Monthly Rent',
              amount: appliedAmount,
              month: dateStr
            });
          }

          if (excessAmount > 0) {
            breakdown.push({ type: 'Advance Created', amount: excessAmount, month: '' });
          }
        }
      }

      if (breakdown.length > 0) {
        db.db.prepare("UPDATE fee_payments SET breakdown = ? WHERE payment_id = ?").run(JSON.stringify(breakdown), payment.payment_id);
        fixedBreakdowns++;
      }
    }
    console.log(`✅ Fixed ${fixedBreakdowns} fee payment breakdowns.`);

    // 2. Fix Ledger Entries for "Pay All Fees"
    console.log("\n[2] Check and Fix Ledger Entries for Pay All Fees...");
    const payAllPayments = db.db.prepare("SELECT * FROM fee_payments WHERE notes = 'Pay All Fees'").all();
    let fixedLedgers = 0;

    for (const payment of payAllPayments) {
      const pAmount = Number(payment.payment_amount) || 0;
      let totalFeesApplied = 0;
      let advanceCreated = 0;
      
      try {
        const bd = JSON.parse(payment.breakdown);
        totalFeesApplied = bd.filter(i => i.type !== 'Advance Created').reduce((s, i) => s + i.amount, 0);
        advanceCreated = bd.filter(i => i.type === 'Advance Created').reduce((s, i) => s + i.amount, 0);
      } catch(e) {}

      // Find the corresponding ledger entry (or entries)
      const ledgerEntries = db.db.prepare(`
        SELECT * FROM ledger_entries 
        WHERE student_id = ? AND category IN ('Fee Received', 'Advance Received') AND (reference_no = ? OR reference_no = ?)
      `).all(payment.student_id, payment.invoice_number, payment.invoice_number);

      // Force split if there's only 1 entry and advance was created, OR if amount is smaller
      if (ledgerEntries.length === 1 && (ledgerEntries[0].amount < pAmount || advanceCreated > 0)) {
        const student = db.db.prepare("SELECT * FROM students WHERE student_id = ?").get(payment.student_id);
        const refNo = payment.invoice_number;

        // Delete old entry
        db.db.prepare("DELETE FROM ledger_entries WHERE entry_id = ?").run(ledgerEntries[0].entry_id);

        if (totalFeesApplied > 0) {
            db.db.prepare(`
               INSERT INTO ledger_entries (entry_date, entry_type, category, amount, debit, credit, balance, payment_mode, reference_no, description, student_id)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(payment.payment_date, 'income', 'Fee Received', totalFeesApplied, totalFeesApplied, 0, 0, payment.payment_mode, refNo, `${student.student_name} S/O ${student.father_name || 'N/A'} - All Fees Applied: ₹${totalFeesApplied}`, payment.student_id);
        }

        if (advanceCreated > 0) {
            db.db.prepare(`
               INSERT INTO ledger_entries (entry_date, entry_type, category, amount, debit, credit, balance, payment_mode, reference_no, description, student_id)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(payment.payment_date, 'income', 'Advance Received', advanceCreated, advanceCreated, 0, 0, payment.payment_mode, refNo, `${student.student_name} S/O ${student.father_name || 'N/A'} - Advance Recv: ₹${advanceCreated}`, payment.student_id);
        }

        fixedLedgers++;

        // Fix corresponding Member Salary Tracking if any
        if (payment.received_member_id && payment.received_member_id != 0 && payment.received_member_id != 'ADMIN') {
          db.db.prepare(`
            UPDATE member_transactions 
            SET amount = ? 
            WHERE student_id = ? AND transaction_type = 'fee_collection' AND (reference_no = ? OR reference_no = ?)
          `).run(pAmount, payment.student_id, payment.invoice_number, payment.invoice_number);

          db.db.prepare(`
            UPDATE ledger_entries 
            SET amount = ?, credit = ? 
            WHERE category = 'Salary - Fee Collection' AND reference_no LIKE ?
          `).run(pAmount, pAmount, `SAL-${payment.received_member_id}-%`);
        }
      }
    }
    console.log(`✅ Fixed ${fixedLedgers} underlying ledger entries amounts.`);

    // 3. Recalculate all ledger balances sequentially
    console.log("\n[3] Recalculating ledger balances...");
    const allLedgers = db.db.prepare("SELECT * FROM ledger_entries ORDER BY entry_id ASC").all();
    let runningBalance = 0;
    
    for (const entry of allLedgers) {
      runningBalance += Number(entry.debit) || 0;
      runningBalance -= Number(entry.credit) || 0;
      
      db.db.prepare("UPDATE ledger_entries SET balance = ? WHERE entry_id = ?").run(runningBalance, entry.entry_id);
    }
    console.log(`✅ Recalculated balance for ${allLedgers.length} ledger entries.`);

  });

  transaction();
  console.log("\n🎉 ALL FIXES APPLIED SUCCESSFULLY! 🎉");

} catch (err) {
  console.error("❌ ERROR APPLYING FIXES:", err.message);
}
