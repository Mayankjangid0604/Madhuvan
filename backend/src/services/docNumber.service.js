// Generates monotonic per-year sequence numbers for invoice / receipt / bill.
// Format:  {PREFIX}-YYYY-NNNNN   (e.g. INV-2026-00042)
const db = require("../config/db.sqlite");

const PREFIX_BY_TYPE = {
  invoice: "INV",
  receipt: "RCPT",
  bill: "BILL",
  voucher: "VCH",
};

exports.nextDocNumber = (docType) => {
  const type = String(docType || "").toLowerCase();
  const prefix = PREFIX_BY_TYPE[type];
  if (!prefix) throw new Error(`Unknown doc type: ${docType}`);

  const year = new Date().getFullYear();

  const tx = db.db.transaction(() => {
    const row = db.db.prepare(
      "SELECT counter, year FROM doc_counters WHERE doc_type = ?"
    ).get(type);

    let nextCounter;
    if (!row) {
      nextCounter = 1;
      db.db.prepare(
        "INSERT INTO doc_counters (doc_type, year, counter) VALUES (?, ?, ?)"
      ).run(type, year, nextCounter);
    } else if (row.year !== year) {
      nextCounter = 1;
      db.db.prepare(
        "UPDATE doc_counters SET year = ?, counter = ? WHERE doc_type = ?"
      ).run(year, nextCounter, type);
    } else {
      nextCounter = row.counter + 1;
      db.db.prepare(
        "UPDATE doc_counters SET counter = ? WHERE doc_type = ?"
      ).run(nextCounter, type);
    }
    return nextCounter;
  });

  const counter = tx();
  return `${prefix}-${year}-${String(counter).padStart(5, "0")}`;
};

module.exports = exports;
