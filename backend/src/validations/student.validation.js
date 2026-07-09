/**
 * Validate student creation/update data
 * @param {object} data - Student data
 * @param {boolean} isUpdate - Is this an update operation?
 * @returns {{ valid: boolean, errors: string[] }}
 */
const validateStudent = (data, isUpdate = false) => {
  const errors = [];

  // Required fields for creation
  if (!isUpdate) {
    if (!data.student_name || data.student_name.trim() === '') {
      errors.push("Student name is required");
    }
    if (!data.date_of_joining) {
      errors.push("Date of joining is required");
    }
  }

  // Validate student name if provided
  if (data.student_name !== undefined) {
    if (typeof data.student_name !== 'string') {
      errors.push("Student name must be a string");
    } else if (data.student_name.trim().length < 2) {
      errors.push("Student name must be at least 2 characters");
    } else if (data.student_name.trim().length > 100) {
      errors.push("Student name must be less than 100 characters");
    }
  }

  // Validate mobile numbers (10 digits)
  const mobileFields = ['student_mobile', 'father_mobile', 'mother_mobile', 'local_guardian_mobile'];
  mobileFields.forEach(field => {
    if (data[field] && !/^[0-9]{10}$/.test(data[field])) {
      errors.push(`${field.replace(/_/g, ' ')} must be 10 digits`);
    }
  });

  // Validate email fields
  const emailFields = ['father_email', 'mother_email'];
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  emailFields.forEach(field => {
    if (data[field] && !emailRegex.test(data[field])) {
      errors.push(`${field.replace(/_/g, ' ')} must be a valid email`);
    }
  });

  // Validate dates
  const dateFields = ['date_of_birth', 'date_of_joining', 'fee_start_month', 'fee_end_month', 'form_date'];
  dateFields.forEach(field => {
    if (data[field] && isNaN(Date.parse(data[field]))) {
      errors.push(`${field.replace(/_/g, ' ')} must be a valid date`);
    }
  });

  // Validate numeric fields
  if (data.monthly_fee !== undefined) {
    const fee = parseFloat(data.monthly_fee);
    if (isNaN(fee) || fee < 0) {
      errors.push("Monthly fee must be a positive number");
    }
  }

  if (data.security_deposit !== undefined) {
    const deposit = parseFloat(data.security_deposit);
    if (isNaN(deposit) || deposit < 0) {
      errors.push("Security deposit must be a positive number");
    }
  }

  if (data.fee_term_months !== undefined) {
    const term = parseInt(data.fee_term_months);
    if (isNaN(term) || term < 1 || term > 12) {
      errors.push("Fee term months must be between 1 and 12");
    }
  }

  // ✅ IMPROVED: Robust discount validation
  const hasDiscount = data.has_discount === true || data.has_discount === 1 || data.has_discount === '1' || data.has_discount === 'true';
  
  if (hasDiscount) {
    const validDiscountTypes = ['percentage', 'fixed', 'percent', 'amount'];
    if (!data.discount_type || !validDiscountTypes.includes(data.discount_type)) {
      errors.push("Discount type must be 'percent' or 'amount'");
    }
    if (data.discount_value === undefined || data.discount_value === '' || parseFloat(data.discount_value) < 0) {
      errors.push("Discount value must be a positive number");
    }
    if (['percentage', 'percent'].includes(data.discount_type) && parseFloat(data.discount_value) > 100) {
      errors.push("Percentage discount cannot exceed 100%");
    }
  }

  // Validate status
  if (data.status !== undefined) {
    const validStatuses = ['active', 'checked_out', 'inactive'];
    if (!validStatuses.includes(data.status)) {
      errors.push(`Status must be one of: ${validStatuses.join(', ')}`);
    }
  }

  // ✅ FIX: Accept all ID type formats (frontend sends "Aadhar Card", not "aadhar")
  if (data.id_type !== undefined && data.id_type) {
    const validIdTypes = [
      'aadhar', 'aadhar card', 'pan', 'pan card', 'passport', 
      'voter_id', 'voter id', 'driving_license', 'driving license', 'other'
    ];
    if (!validIdTypes.includes(data.id_type.toLowerCase())) {
      errors.push(`ID type '${data.id_type}' is not recognized`);
    }
  }

  // ✅ NEW: Validate fee_type_cycle
  if (data.fee_type_cycle !== undefined) {
    const validCycles = ['monthly', 'half_yearly', 'yearly'];
    if (!validCycles.includes(data.fee_type_cycle)) {
      errors.push(`Fee type cycle must be one of: ${validCycles.join(', ')}`);
    }
  }

  return { 
    valid: errors.length === 0, 
    errors 
  };
};

/**
 * Validate student ID parameter
 * @param {any} id 
 * @returns {{ valid: boolean, errors: string[] }}
 */
const validateStudentId = (id) => {
  const errors = [];
  
  const studentId = parseInt(id);
  if (isNaN(studentId) || studentId <= 0) {
    errors.push("Valid student ID is required");
  }

  return { 
    valid: errors.length === 0, 
    errors,
    studentId: errors.length === 0 ? studentId : null
  };
};

/**
 * Validate checkout data
 * @param {object} data 
 * @returns {{ valid: boolean, errors: string[] }}
 */
const validateCheckout = (data) => {
  const errors = [];

  if (!data.checkout_date) {
    errors.push("Checkout date is required");
  } else if (isNaN(Date.parse(data.checkout_date))) {
    errors.push("Checkout date must be a valid date");
  }

  if (data.checkout_reason && data.checkout_reason.length > 500) {
    errors.push("Checkout reason must be less than 500 characters");
  }

  return { 
    valid: errors.length === 0, 
    errors 
  };
};

/**
 * Validate room allocation data
 * @param {object} data 
 * @returns {{ valid: boolean, errors: string[] }}
 */
const validateAllocation = (data) => {
  const errors = [];

  if (!data.student_id) {
    errors.push("Student ID is required");
  }
  if (!data.room_id) {
    errors.push("Room ID is required");
  }
  if (!data.bed_id) {
    errors.push("Bed ID is required");
  }
  if (!data.allocation_date) {
    errors.push("Allocation date is required");
  }

  return { 
    valid: errors.length === 0, 
    errors 
  };
};

module.exports = {
  validateStudent,
  validateStudentId,
  validateCheckout,
  validateAllocation
};