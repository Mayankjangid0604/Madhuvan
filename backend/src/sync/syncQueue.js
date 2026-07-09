// Sync queue helper — writes get logged for eventual cloud sync.
// This module is ready to use but NOT auto-called from any mutation yet.
// When you're ready to go online, wrap your inserts/updates with
// `logChange('student', id, 'insert', row)` etc, and start the push worker.
const db = require("../config/db.sqlite");

exports.logChange = (entity, entityId, op, payload) => {
  try {
    const json = payload ? JSON.stringify(payload) : null;
    db.db.prepare(`
      INSERT INTO sync_queue (entity, entity_id, op, payload)
      VALUES (?, ?, ?, ?)
    `).run(entity, entityId, op, json);
  } catch (e) {
    // Never fail the primary write because of the queue.
    console.warn(`sync_queue log skipped (${entity}#${entityId} ${op}):`, e.message);
  }
};

exports.getPendingChanges = (limit = 100) => {
  return db.db.prepare(`
    SELECT * FROM sync_queue
    WHERE sent_at IS NULL
    ORDER BY id ASC
    LIMIT ?
  `).all(limit);
};

exports.markSent = (ids) => {
  if (!ids || !ids.length) return;
  const placeholders = ids.map(() => "?").join(",");
  db.db.prepare(`
    UPDATE sync_queue SET sent_at = CURRENT_TIMESTAMP WHERE id IN (${placeholders})
  `).run(...ids);
};

exports.markFailed = (id, error) => {
  db.db.prepare(`UPDATE sync_queue SET error = ? WHERE id = ?`)
    .run(String(error || "").slice(0, 500), id);
};

exports.pendingCount = () => {
  return db.db.prepare(`SELECT COUNT(*) as c FROM sync_queue WHERE sent_at IS NULL`).get().c;
};
