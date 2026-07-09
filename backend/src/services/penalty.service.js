const db = require('../config/db.sqlite');

const toNum = (v) => Number(v) || 0;

// ============================================
// GET PENALTY SETTINGS
// ============================================
exports.getSettings = () => {
  let settings = db.db.prepare('SELECT * FROM penalty_settings WHERE id = 1').get();
  
  if (!settings) {
    db.db.prepare(`
      INSERT INTO penalty_settings (id, enabled, penalty_type, fixed_amount, percentage, max_penalty, grace_days)
      VALUES (1, 0, 'fixed', 50, 1, 500, 5)
    `).run();
    settings = db.db.prepare('SELECT * FROM penalty_settings WHERE id = 1').get();
  }
  
  return settings;
};

// ============================================
// UPDATE PENALTY SETTINGS
// ============================================
exports.updateSettings = (data) => {
  const { enabled, penalty_type, fixed_amount, percentage, max_penalty, grace_days } = data;
  
  db.db.prepare(`
    UPDATE penalty_settings SET 
      enabled = ?, penalty_type = ?, fixed_amount = ?, percentage = ?, max_penalty = ?, grace_days = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = 1
  `).run(
    enabled ? 1 : 0,
    penalty_type || 'fixed',
    toNum(fixed_amount),
    toNum(percentage),
    toNum(max_penalty),
    toNum(grace_days)
  );
  
  return exports.getSettings();
};

// ============================================
// CALCULATE PENALTY FOR A FEE
// ============================================
exports.calculatePenalty = (fee) => {
  const settings = exports.getSettings();
  if (!settings?.enabled) return 0;
  
  const dueDate = new Date(fee.due_date);
  const today = new Date();
  
  const daysOverdue = Math.floor((today - dueDate) / (1000 * 60 * 60 * 24));
  if (daysOverdue <= 0) return 0;
  
  const daysAfterGrace = Math.max(0, daysOverdue - (settings.grace_days || 0));
  if (daysAfterGrace <= 0) return 0;
  
  let penalty = 0;
  const baseFee = toNum(fee.final_amount);
  
  if (settings.penalty_type === 'fixed') {
    penalty = daysAfterGrace * toNum(settings.fixed_amount);
  } else {
    penalty = daysAfterGrace * (baseFee * toNum(settings.percentage) / 100);
  }
  
  // Apply max cap
  if (settings.max_penalty > 0) {
    penalty = Math.min(penalty, toNum(settings.max_penalty));
  }
  
  return Math.round(penalty);
};

// ============================================
// APPLY PENALTIES TO ALL OVERDUE FEES
// ============================================
exports.applyToAllOverdue = () => {
  const settings = exports.getSettings();
  if (!settings?.enabled) return { applied: 0, message: 'Penalty disabled' };
  
  const overdueFees = db.db.prepare(`
    SELECT sf.* FROM student_fees sf
    JOIN students s ON s.student_id = sf.student_id
    WHERE sf.fee_status = 'OVERDUE' 
      AND s.status = 'active' 
      AND s.date_of_leaving IS NULL
  `).all();
  
  let applied = 0;
  
  for (const fee of overdueFees) {
    const newPenalty = exports.calculatePenalty(fee);
    const currentPenalty = toNum(fee.penalty_amount);
    
    if (newPenalty > currentPenalty) {
      db.db.prepare('UPDATE student_fees SET penalty_amount = ?, updated_at = CURRENT_TIMESTAMP WHERE fee_id = ?')
        .run(newPenalty, fee.fee_id);
      applied++;
    }
  }
  
  return { applied, checked: overdueFees.length };
};

module.exports = exports;