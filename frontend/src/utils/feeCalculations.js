/**
 * Fee / Invoice calculation utility
 * FINAL_AMOUNT IS SOURCE OF TRUTH
 */

export const calculateInvoiceTotals = (fee) => {
  const feeAmount = Number(fee.fee_amount || 0);
  const discount = Number(fee.discount_amount || 0);
  const penalty = Number(fee.penalty_amount || 0);
  const fine = Number(fee.fine_added_to_fee || 0);

  // ✅ BACKEND-CALCULATED FINAL AMOUNT
  const totalPayable = Number(fee.final_amount || 0);

  const paid = Number(fee.paid_amount || 0);

  const remaining = Math.max(totalPayable - paid, 0);

  const advance =
    paid > totalPayable
      ? paid - totalPayable
      : 0;

  return {
    feeAmount,
    discount,
    penalty,
    fine,
    totalPayable,
    paid,
    remaining,
    advance
  };
};