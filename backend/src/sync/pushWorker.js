// Push worker skeleton — batches pending sync_queue rows and POSTs them to a
// cloud endpoint. Currently disabled: startPushWorker() is a no-op unless
// process.env.CLOUD_SYNC_URL is set. When you host the mirror API and set the
// env var, this will start pushing changes every 30 seconds.
const syncQueue = require("./syncQueue");

let intervalHandle = null;

const push = async () => {
  const url = process.env.CLOUD_SYNC_URL;
  const authToken = process.env.CLOUD_SYNC_TOKEN;
  if (!url) return; // integration disabled

  const rows = syncQueue.getPendingChanges(50);
  if (rows.length === 0) return;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      },
      body: JSON.stringify({ changes: rows.map(r => ({
        id: r.id,
        entity: r.entity,
        entity_id: r.entity_id,
        op: r.op,
        payload: r.payload ? JSON.parse(r.payload) : null,
        created_at: r.created_at,
      })) }),
    });
    if (!res.ok) throw new Error(`Cloud sync HTTP ${res.status}`);
    syncQueue.markSent(rows.map(r => r.id));
  } catch (err) {
    console.warn("Cloud push failed:", err.message);
    for (const r of rows) syncQueue.markFailed(r.id, err.message);
  }
};

exports.startPushWorker = () => {
  if (!process.env.CLOUD_SYNC_URL) {
    console.log("   ⏸  Cloud sync disabled (CLOUD_SYNC_URL not set)");
    return;
  }
  if (intervalHandle) return;
  intervalHandle = setInterval(() => push().catch(e => console.error("push tick failed:", e.message)), 30_000);
  console.log("   ✅ Cloud push worker started (every 30s)");
};

exports.stopPushWorker = () => {
  if (intervalHandle) clearInterval(intervalHandle);
  intervalHandle = null;
};

// Manual trigger for testing
exports.runOnce = push;
