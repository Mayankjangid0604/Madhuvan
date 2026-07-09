// services/student.service.js
const db = require("../config/db.sqlite");
const fs = require("fs");
const path = require("path");

// ✅ FIX: Make sharp optional for Electron compatibility
let sharp;
try {
  sharp = require("sharp");
} catch (err) {
  console.warn("⚠️ Sharp not available - image processing will be limited");
  sharp = null;
}

const { STUDENTS_UPLOAD_DIR } = require("../config/paths");

// Lazy load feeService to avoid circular dependency
let feeService = null;
const getFeeService = () => {
  if (!feeService) {
    feeService = require("./fee.service");
  }
  return feeService;
};

/* =======================
   CREATE STUDENT WITH FEES
======================= */
exports.createStudentWithFees = (data) => {
  const today = new Date().toISOString().split("T")[0];
  const formDate = data.form_date || today;
  const joiningDate = data.date_of_joining || today;
  const securityDeposit = Number(data.security_deposit) || 0;
  const feeStartMonth = data.fee_start_month || data.fee_start_date || joiningDate;

  if (data.discount_applicable === 'first_month') {
    data.discount_applicable = 'specific_months';
    data.discount_months = data.fee_start_month;
  }

  console.log("📝 Creating student:", {
    name: data.student_name,
    fee_type_cycle: data.fee_type_cycle,
    monthly_fee: data.monthly_fee,
    security_deposit: securityDeposit
  });

  let creationResult = {
    student_id: null,
    fees_created: false,
    fee_error: null,
    main_fee_id: null,
    security_fee_id: null
  };

  const createTransaction = db.db.transaction(() => {
    const result = db.db.prepare(`
      INSERT INTO students (
        form_date, student_name, date_of_birth, student_mobile, father_email, mother_email,
        class_or_coaching, institute_name, date_of_joining, father_name, father_mobile,
        mother_name, mother_mobile, local_guardian_name, local_guardian_relation,
        local_guardian_mobile, id_type, id_number, address_line1, address_line2, address_line3,
        photo_url, monthly_fee, security_deposit, fee_start_month, fee_end_month, fee_term_months,
        has_discount, discount_type, discount_value, discount_applicable, discount_months,
        discount_on_full_month,
        fee_type_cycle, next_fee_due_date, original_security_deposit, payment_mode, gender
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    `).run(
      formDate, data.student_name, data.date_of_birth || null, data.student_mobile || null,
      data.father_email || null, data.mother_email || null, data.class_or_coaching || null,
      data.institute_name || null, joiningDate, data.father_name || null, data.father_mobile || null,
      data.mother_name || null, data.mother_mobile || null, data.local_guardian_name || null,
      data.local_guardian_relation || null, data.local_guardian_mobile || null,
      data.id_type || null, data.id_number || null, data.address_line1 || null,
      data.address_line2 || null, data.address_line3 || null, data.photo_url || null,
      Number(data.monthly_fee) || 0, securityDeposit, feeStartMonth, data.fee_end_month || null,
      Number(data.fee_term_months) || 1, data.has_discount ? 1 : 0, data.discount_type || null,
      Number(data.discount_value) || 0, data.discount_applicable || null, data.discount_months || null,
      data.discount_on_full_month !== undefined ? (data.discount_on_full_month ? 1 : 0) : 1,
      data.fee_type_cycle || 'monthly', data.next_fee_due_date || null, securityDeposit,
      (data.payment_mode === 'online' ? 'online' : 'cash'),
      data.gender || 'Girl'
    );

    const studentId = result.lastInsertRowid;
    creationResult.student_id = studentId;
    console.log("✅ Student record created, ID:", studentId);

    if (data.monthly_fee && Number(data.monthly_fee) > 0) {
      try {
        const feeServiceInstance = getFeeService();

        const feeResult = feeServiceInstance.createInitialFeesForStudent({
          student_id: studentId,
          monthly_fee: Number(data.monthly_fee),
          security_deposit: securityDeposit,
          fee_start_date: feeStartMonth,
          fee_type_cycle: data.fee_type_cycle || 'monthly',
          next_fee_due_date: data.next_fee_due_date || null,
          has_discount: data.has_discount ? 1 : 0,
          discount_type: data.discount_type,
          discount_value: Number(data.discount_value) || 0,
          discount_applicable: data.discount_applicable,
          discount_months: data.discount_months,
          discount_on_full_month: data.discount_on_full_month !== undefined ? (data.discount_on_full_month ? 1 : 0) : 1
        }, true);

        if (feeResult && feeResult.success) {
          creationResult.fees_created = true;
          creationResult.main_fee_id = feeResult.main_fee_id;
          creationResult.security_fee_id = feeResult.security_fee_id;
          console.log("✅ Initial fees created:", feeResult);

          // ✅ FIX: Generate catch-up fees for months between joining and current month
          try {
            const joinDate = new Date(feeStartMonth);
            const joinYear = joinDate.getFullYear();
            const joinMonth = joinDate.getMonth(); // 0-indexed
            const now = new Date();
            const currentYear = now.getFullYear();
            const currentMonth = now.getMonth(); // 0-indexed

            let catchupCount = 0;
            let y = joinYear;
            let m = joinMonth + 1; // Start from the month AFTER joining
            if (m > 11) { m = 0; y++; }

            while (y < currentYear || (y === currentYear && m <= currentMonth)) {
              const catchupMonth = `${y}-${String(m + 1).padStart(2, '0')}-01`;
              try {
                const catchupResult = feeServiceInstance.createMonthlyFee(studentId, catchupMonth);
                if (catchupResult.success) catchupCount++;
              } catch (catchupErr) {
                console.warn(`⚠️ Catch-up fee for ${catchupMonth} failed:`, catchupErr.message);
              }
              m++;
              if (m > 11) { m = 0; y++; }
            }

            if (catchupCount > 0) {
              console.log(`✅ Generated ${catchupCount} catch-up fee(s) for student ${studentId}`);
            }
          } catch (catchupErr) {
            console.warn("⚠️ Catch-up fee generation failed:", catchupErr.message);
          }
        }
      } catch (feeErr) {
        console.error("⚠️ Fee creation failed:", feeErr.message);
        creationResult.fee_error = feeErr.message;
        throw new Error(`Student created but fee generation failed: ${feeErr.message}`);
      }
    }

    return creationResult;
  });

  return createTransaction();
};

/* =======================
   GET ALL STUDENTS
======================= */
exports.getAllStudents = () => {
  return db.db.prepare(`
    SELECT * FROM students
    WHERE status = 'active' AND date_of_leaving IS NULL
    ORDER BY created_at DESC
  `).all();
};

/* =======================
   GET STUDENT BY ID
======================= */
exports.getStudentById = (id) => {
  return db.db.prepare(`SELECT * FROM students WHERE student_id = ?`).get(id);
};

/* =======================
   UPDATE STUDENT
======================= */
exports.updateStudent = (id, data) => {
  const student = exports.getStudentById(id);
  if (!student) throw new Error("Student not found");

  if (data.discount_applicable === 'first_month') {
    data.discount_applicable = 'specific_months';
    data.discount_months = data.fee_start_month;
  }

  const updateTransaction = db.db.transaction(() => {
    db.db.prepare(`
      UPDATE students SET
        form_date = ?, student_name = ?, date_of_birth = ?, student_mobile = ?,
        father_email = ?, mother_email = ?,
        class_or_coaching = ?, institute_name = ?, date_of_joining = ?,
        father_name = ?, father_mobile = ?, mother_name = ?, mother_mobile = ?,
        local_guardian_name = ?, local_guardian_relation = ?, local_guardian_mobile = ?,
        id_type = ?, id_number = ?,
        address_line1 = ?, address_line2 = ?, address_line3 = ?,
        monthly_fee = ?, security_deposit = ?, fee_start_month = ?, fee_end_month = ?,
        fee_term_months = ?, has_discount = ?, discount_type = ?, discount_value = ?,
        discount_applicable = ?, discount_months = ?, 
        discount_on_full_month = ?,
        fee_type_cycle = ?,
        next_fee_due_date = ?, original_security_deposit = ?,
        payment_mode = ?,
        gender = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE student_id = ?
    `).run(
      data.form_date || student.form_date,
      data.student_name || student.student_name,
      data.date_of_birth !== undefined ? data.date_of_birth : student.date_of_birth,
      data.student_mobile !== undefined ? data.student_mobile : student.student_mobile,
      data.father_email !== undefined ? data.father_email : student.father_email,
      data.mother_email !== undefined ? data.mother_email : student.mother_email,
      data.class_or_coaching !== undefined ? data.class_or_coaching : student.class_or_coaching,
      data.institute_name !== undefined ? data.institute_name : student.institute_name,
      data.date_of_joining || student.date_of_joining,
      data.father_name !== undefined ? data.father_name : student.father_name,
      data.father_mobile !== undefined ? data.father_mobile : student.father_mobile,
      data.mother_name !== undefined ? data.mother_name : student.mother_name,
      data.mother_mobile !== undefined ? data.mother_mobile : student.mother_mobile,
      data.local_guardian_name !== undefined ? data.local_guardian_name : student.local_guardian_name,
      data.local_guardian_relation !== undefined ? data.local_guardian_relation : student.local_guardian_relation,
      data.local_guardian_mobile !== undefined ? data.local_guardian_mobile : student.local_guardian_mobile,
      data.id_type !== undefined ? data.id_type : student.id_type,
      data.id_number !== undefined ? data.id_number : student.id_number,
      data.address_line1 !== undefined ? data.address_line1 : student.address_line1,
      data.address_line2 !== undefined ? data.address_line2 : student.address_line2,
      data.address_line3 !== undefined ? data.address_line3 : student.address_line3,
      data.monthly_fee !== undefined ? Number(data.monthly_fee) : student.monthly_fee,
      data.security_deposit !== undefined ? Number(data.security_deposit) : student.security_deposit,
      data.fee_start_month !== undefined ? data.fee_start_month : student.fee_start_month,
      data.fee_end_month !== undefined ? data.fee_end_month : student.fee_end_month,
      data.fee_term_months !== undefined ? Number(data.fee_term_months) : student.fee_term_months,
      data.has_discount !== undefined ? (data.has_discount ? 1 : 0) : student.has_discount,
      data.discount_type !== undefined ? data.discount_type : student.discount_type,
      data.discount_value !== undefined ? Number(data.discount_value) : student.discount_value,
      data.discount_applicable !== undefined ? data.discount_applicable : student.discount_applicable,
      data.discount_months !== undefined ? data.discount_months : student.discount_months,
      data.discount_on_full_month !== undefined ? (data.discount_on_full_month ? 1 : 0) : student.discount_on_full_month,
      data.fee_type_cycle !== undefined ? data.fee_type_cycle : student.fee_type_cycle,
      data.next_fee_due_date !== undefined ? data.next_fee_due_date : student.next_fee_due_date,
      data.original_security_deposit !== undefined ? Number(data.original_security_deposit) : student.original_security_deposit,
      data.payment_mode !== undefined ? (data.payment_mode === 'online' ? 'online' : 'cash') : (student.payment_mode || 'cash'),
      data.gender !== undefined ? data.gender : (student.gender || 'Girl'),
      id
    );

    const feeFieldsChanged = (
      (data.monthly_fee !== undefined && Number(data.monthly_fee) !== Number(student.monthly_fee)) ||
      (data.fee_type_cycle !== undefined && data.fee_type_cycle !== student.fee_type_cycle) ||
      (data.has_discount !== undefined && (data.has_discount ? 1 : 0) !== student.has_discount) ||
      (data.discount_type !== undefined && data.discount_type !== student.discount_type) ||
      (data.discount_value !== undefined && Number(data.discount_value) !== Number(student.discount_value)) ||
      (data.discount_applicable !== undefined && data.discount_applicable !== student.discount_applicable) ||
      (data.discount_months !== undefined && (data.discount_months || null) !== (student.discount_months || null)) ||
      (data.discount_on_full_month !== undefined && (data.discount_on_full_month ? 1 : 0) !== student.discount_on_full_month)
    );

    let feesUpdated = false;
    if (feeFieldsChanged || (data.security_deposit !== undefined && Number(data.security_deposit) !== Number(student.security_deposit))) {
      try {
        // Find all fees that can be updated: DUE, PARTIAL, UPCOMING, OVERDUE
        const updatableFees = db.db.prepare(`
          SELECT * FROM student_fees
          WHERE student_id = ? AND fee_status != 'PAID'
        `).all(id);

        if (updatableFees.length > 0) {
          const newMonthlyFee = data.monthly_fee !== undefined ? Number(data.monthly_fee) : Number(student.monthly_fee);
          const newSecurityDeposit = data.security_deposit !== undefined ? Number(data.security_deposit) : Number(student.security_deposit);
          const newHasDiscount = data.has_discount !== undefined ? (data.has_discount ? 1 : 0) : student.has_discount;
          const newDiscountType = data.discount_type !== undefined ? data.discount_type : student.discount_type;
          const newDiscountValue = data.discount_value !== undefined ? Number(data.discount_value) : Number(student.discount_value);
          const newDiscountOnFull = data.discount_on_full_month !== undefined ? (data.discount_on_full_month ? 1 : 0) : student.discount_on_full_month;
          const newDiscountApplicable = data.discount_applicable !== undefined ? data.discount_applicable : student.discount_applicable;
          const newDiscountMonths = data.discount_months !== undefined ? data.discount_months : student.discount_months;

          // NaN Safety
          if (isNaN(newMonthlyFee) || isNaN(newSecurityDeposit) || isNaN(newDiscountValue)) {
            console.error("⚠️ Invalid numeric values in update request", { newMonthlyFee, newSecurityDeposit, newDiscountValue });
            throw new Error("Invalid numeric values for fee calculation");
          }

          // ✅ FIX: Determine the correct fee_type label for the new cycle
          const newCycle = data.fee_type_cycle !== undefined ? data.fee_type_cycle : student.fee_type_cycle;
          const oldCycle = student.fee_type_cycle;
          const cycleChanged = newCycle !== oldCycle;
          const newRentFeeType = newCycle === 'yearly' ? 'Yearly Rent'
            : newCycle === 'half_yearly' ? 'Half-Yearly Rent'
            : 'Monthly Rent';

          for (const fee of updatableFees) {
            if (fee.fee_type === 'Security Deposit') {
              // Only update security deposit if it's not paid at all
              if (Number(fee.paid_amount) === 0) {
                db.db.prepare(`
                  UPDATE student_fees SET
                    fee_amount = ?, final_amount = ?, updated_at = CURRENT_TIMESTAMP
                  WHERE fee_id = ?
                `).run(newSecurityDeposit, newSecurityDeposit, fee.fee_id);
              }
              continue;
            }

            // For Rent fees (Monthly, Half-Yearly, Yearly)
            const paidAmount = Number(fee.paid_amount);

            // ✅ FIX: If fee_type_cycle changed, update the fee_type label on unpaid rent records
            if (cycleChanged && ['Monthly Rent', 'Half-Yearly Rent', 'Yearly Rent'].includes(fee.fee_type)) {
              db.db.prepare(`
                UPDATE student_fees SET fee_type = ?, updated_at = CURRENT_TIMESTAMP
                WHERE fee_id = ?
              `).run(newRentFeeType, fee.fee_id);
            }

            // Calculate base amount for this specific fee record
            // In our system, monthly_fee column stores the RENT amount PER CYCLE.
            let newBaseAmount = newMonthlyFee;
            
            const studentJoinDate = data.date_of_joining || student.date_of_joining;
            const feeSvc = getFeeService();
            const joinParts = feeSvc.parseDateParts(studentJoinDate);
            const feeParts = feeSvc.parseDateParts(fee.fee_month);
            
            let isProratedRecord = false;
            let proratedInfo = null;

            // Only prorate for monthly cycle records in the join month
            if (newCycle === 'monthly' && joinParts.year === feeParts.year && joinParts.month === feeParts.month && joinParts.day > 1) {
              const feeService = require("./fee.service");
              proratedInfo = feeService.calculateProratedFee(newMonthlyFee, studentJoinDate);
              newBaseAmount = proratedInfo.amount;
              isProratedRecord = true;
            }

            // Increase always allowed. Decrease only if >= paidAmount.
            if (newBaseAmount < paidAmount) {
              console.warn(`⚠️ Cannot decrease fee ${fee.fee_id} below paid amount ${paidAmount}. Capping at ${paidAmount}.`);
              newBaseAmount = paidAmount;
            }

            // Calculate discount for this record
            let discountAmount = 0;
            if (newHasDiscount && newDiscountValue > 0) {
              // Respect discount_applicable: 'all_months' (or legacy 'complete') vs 'specific_months'
              const normalDiscountApplicable = newDiscountApplicable === 'complete' ? 'all_months' : newDiscountApplicable;
              const monthKey = `${feeParts.year}-${String(feeParts.month + 1).padStart(2, '0')}`;

              let shouldApply = false;
              if (!normalDiscountApplicable || normalDiscountApplicable === 'all_months') {
                shouldApply = true;
              } else if (normalDiscountApplicable === 'specific_months' && newDiscountMonths) {
                const allowedMonths = String(newDiscountMonths).split(',').map(m => m.trim());
                shouldApply = allowedMonths.includes(monthKey);
              }

              if (shouldApply) {
                const normalDiscountType = newDiscountType === 'percent' ? 'percentage' : (newDiscountType === 'amount' ? 'fixed' : newDiscountType);
                const useFullMonth = (newDiscountOnFull === 1 || newDiscountOnFull === true);

                if (normalDiscountType === 'percentage') {
                  const targetAmount = useFullMonth ? newMonthlyFee : newBaseAmount;
                  discountAmount = Math.round((targetAmount * newDiscountValue) / 100);
                } else if (normalDiscountType === 'fixed') {
                  if (isProratedRecord && !useFullMonth && proratedInfo) {
                     discountAmount = Math.round((newDiscountValue / proratedInfo.daysInMonth) * proratedInfo.remainingDays);
                  } else {
                    discountAmount = newDiscountValue;
                  }
                }
              }
            }

            let finalAmount = Math.max(0, newBaseAmount - discountAmount);
            
            if (finalAmount < paidAmount) {
               finalAmount = paidAmount;
               discountAmount = Math.max(0, newBaseAmount - finalAmount);
            }

            db.db.prepare(`
              UPDATE student_fees SET
                fee_amount = ?, discount_amount = ?, final_amount = ?, updated_at = CURRENT_TIMESTAMP
              WHERE fee_id = ?
            `).run(newBaseAmount, discountAmount, finalAmount, fee.fee_id);
          }
          feesUpdated = true;
          console.log(`✅ Updated ${updatableFees.length} fees for student ${id}`);
        }

        // ✅ FIX: Create Security Deposit fee record if one doesn't exist yet.
        // This runs OUTSIDE the updatableFees block so it works even when all rent fees are PAID.
        const newSecDepForInsert = data.security_deposit !== undefined ? Number(data.security_deposit) : Number(student.security_deposit);
        if (newSecDepForInsert > 0) {
          const existingSecFee = db.db.prepare(`
            SELECT fee_id FROM student_fees WHERE student_id = ? AND fee_type = 'Security Deposit'
          `).get(id);
          if (!existingSecFee) {
            const feeStartDate = student.fee_start_month || student.date_of_joining;
            const today = new Date().toISOString().split('T')[0];
            const insertDate = feeStartDate || today;
            db.db.prepare(`
              INSERT INTO student_fees (
                student_id, fee_type, fee_month, fee_amount, discount_amount,
                final_amount, paid_amount, fee_status, fee_date, due_date,
                fee_period_start, fee_period_end
              ) VALUES (?, 'Security Deposit', ?, ?, 0, ?, 0, 'DUE', ?, ?, ?, ?)
            `).run(
              id, insertDate, newSecDepForInsert, newSecDepForInsert,
              insertDate, insertDate, insertDate, insertDate
            );
            console.log(`✅ Created new Security Deposit fee of ₹${newSecDepForInsert} for student ${id}`);
          }
        }
      } catch (err) {
        console.error("⚠️ Failed to update fees:", err.message);
      }
    }

    return { student_id: id, feesUpdated };
  });

  return updateTransaction();
};

/* =======================
   CHECKOUT STUDENT
======================= */
exports.checkoutStudent = (id, options = {}) => {
  const student = exports.getStudentById(id);
  if (!student) throw new Error("Student not found");
  if (student.date_of_leaving) throw new Error("Student has already checked out");

  // Block checkout when any fee still has unpaid balance.
  // Admin can zero-out a fee via the "Write Off / Discount" button from the
  // fee history page before retrying.
  if (!options.force_checkout) {
    const unpaidRow = db.db.prepare(`
      SELECT COALESCE(SUM(CASE WHEN final_amount > paid_amount THEN final_amount - paid_amount ELSE 0 END), 0) as unpaid
      FROM student_fees
      WHERE student_id = ? AND fee_status != 'PAID'
    `).get(id);
    const unpaid = Number(unpaidRow?.unpaid || 0);
    if (unpaid > 0) {
      const err = new Error(
        `Cannot check out — ₹${unpaid.toLocaleString('en-IN')} in fees remain unpaid. ` +
        `Collect the payment or write off the unpaid balance from the fee history page.`
      );
      err.code = 'UNPAID_FEES';
      throw err;
    }
  }

  const checkoutDate = options.checkoutDate || new Date().toISOString().split("T")[0];
  const reason = options.reason || "Manual checkout";

  const checkoutTransaction = db.db.transaction(() => {
    db.db.prepare(`
      UPDATE students SET
        date_of_leaving = ?,
        status = 'checked_out',
        updated_at = CURRENT_TIMESTAMP
      WHERE student_id = ?
    `).run(checkoutDate, id);

    const allocation = db.db.prepare(`
      SELECT allocation_id FROM room_allocation
      WHERE student_id = ? AND allocation_status = 'active'
    `).get(id);

    if (allocation) {
      db.db.prepare(`
        UPDATE room_allocation SET
          allocation_status = 'vacated',
          allocation_end_date = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE allocation_id = ?
      `).run(checkoutDate, allocation.allocation_id);
    }

    if (options.deletePhoto && student.photo_url) {
      try {
        const filename = student.photo_url.replace(/^\/uploads\/students\//, "");
        const filePath = path.join(STUDENTS_UPLOAD_DIR, filename);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          console.log("🗑️ Deleted student photo:", filename);
        }
      } catch (err) {
        console.warn("Could not delete photo:", err.message);
      }
    }

    return {
      student_id: id,
      checkout_date: checkoutDate,
      reason: reason,
      room_deallocated: !!allocation
    };
  });

  return checkoutTransaction();
};

/* =======================
   EXIT STUDENT
======================= */
exports.exitStudent = (id, options = {}) => {
  return exports.checkoutStudent(id, options);
};

/* =======================
   UPLOAD STUDENT PHOTO
======================= */
exports.uploadStudentPhoto = async (studentId, file) => {
  if (!file || !file.path) {
    throw new Error("Photo upload failed - no file provided");
  }

  const student = exports.getStudentById(studentId);
  if (!student) {
    if (fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
    }
    throw new Error("Student not found");
  }

  try {
    const outputFilename = `student-${studentId}-${Date.now()}.jpg`;
    const outputPath = path.join(STUDENTS_UPLOAD_DIR, outputFilename);

    if (sharp) {
      await sharp(file.path)
        .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 85, progressive: true })
        .toFile(outputPath);

      console.log(`📸 Image compressed: ${file.size} bytes → ${fs.statSync(outputPath).size} bytes`);

      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
    } else {
      console.log(`⚠️ Sharp not available - saving image without compression`);
      fs.renameSync(file.path, outputPath);
    }

    if (student.photo_url) {
      try {
        const oldFilename = student.photo_url.replace(/^\/uploads\/students\//, "");
        const oldFilePath = path.join(STUDENTS_UPLOAD_DIR, oldFilename);
        if (fs.existsSync(oldFilePath) && oldFilePath !== outputPath) {
          fs.unlinkSync(oldFilePath);
          console.log("🗑️ Deleted old photo");
        }
      } catch (err) {
        console.warn("Could not delete old photo:", err.message);
      }
    }

    const photoUrl = `/uploads/students/${outputFilename}`;
    db.db.prepare(`
      UPDATE students SET photo_url = ?, updated_at = CURRENT_TIMESTAMP WHERE student_id = ?
    `).run(photoUrl, studentId);

    return { photo_url: photoUrl };
  } catch (err) {
    if (fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
    }
    throw new Error(`Photo processing failed: ${err.message}`);
  }
};

/* =======================
   DELETE STUDENT (SOFT)
======================= */
exports.deleteStudent = (id) => {
  const student = exports.getStudentById(id);
  if (!student) throw new Error("Student not found");

  db.db.prepare(`
    UPDATE students SET status = 'inactive', updated_at = CURRENT_TIMESTAMP WHERE student_id = ?
  `).run(id);

  return { student_id: id, deleted: true };
};