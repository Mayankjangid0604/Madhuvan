const validatePayment = (data) => {
  const errors = [];
  
  if (!data.student_id) errors.push("Student ID is required");
  if (!data.payment_amount) errors.push("Payment amount is required");
  if (data.payment_amount && data.payment_amount <= 0) errors.push("Amount must be greater than 0");
  
  const validModes = ['CASH', 'UPI', 'BANK', 'CHEQUE', 'ONLINE'];
  if (data.payment_mode && !validModes.includes(data.payment_mode.toUpperCase())) {
    errors.push(`Invalid payment mode. Use: ${validModes.join(', ')}`);
  }
  
  return { valid: errors.length === 0, errors };
};

const validateFine = (data) => {
  const errors = [];
  
  if (!data.student_id) errors.push("Student ID is required");
  if (!data.amount) errors.push("Amount is required");
  if (data.amount && data.amount <= 0) errors.push("Amount must be greater than 0");
  
  return { valid: errors.length === 0, errors };
};

module.exports = { validatePayment, validateFine };