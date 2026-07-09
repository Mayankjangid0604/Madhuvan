const db = require("../config/db.sqlite");

exports.listBranches = () =>
  db.db.prepare(`SELECT * FROM branches WHERE is_active = 1 ORDER BY is_default DESC, branch_name`).all();

exports.getBranch = (id) =>
  db.db.prepare(`SELECT * FROM branches WHERE branch_id = ?`).get(id);

exports.createBranch = (data) => {
  const stmt = db.db.prepare(`
    INSERT INTO branches (branch_name, branch_code, address, phone, email, gstin, is_default, is_active)
    VALUES (?, ?, ?, ?, ?, ?, ?, 1)
  `);
  const result = stmt.run(
    data.branch_name,
    data.branch_code || null,
    data.address || null,
    data.phone || null,
    data.email || null,
    data.gstin || null,
    data.is_default ? 1 : 0
  );
  if (data.is_default) {
    db.db.prepare(`UPDATE branches SET is_default = 0 WHERE branch_id != ?`).run(result.lastInsertRowid);
  }
  return { branch_id: result.lastInsertRowid };
};

exports.updateBranch = (id, data) => {
  const fields = [];
  const values = [];
  for (const k of ["branch_name", "branch_code", "address", "phone", "email", "gstin"]) {
    if (data[k] !== undefined) {
      fields.push(`${k} = ?`);
      values.push(data[k]);
    }
  }
  if (data.is_default !== undefined) {
    fields.push("is_default = ?");
    values.push(data.is_default ? 1 : 0);
  }
  if (fields.length === 0) return { changes: 0 };
  values.push(id);
  const res = db.db.prepare(`UPDATE branches SET ${fields.join(", ")} WHERE branch_id = ?`).run(...values);
  if (data.is_default) {
    db.db.prepare(`UPDATE branches SET is_default = 0 WHERE branch_id != ?`).run(id);
  }
  return { changes: res.changes };
};

exports.deleteBranch = (id) => {
  return db.db.prepare(`UPDATE branches SET is_active = 0 WHERE branch_id = ?`).run(id);
};

module.exports = exports;
