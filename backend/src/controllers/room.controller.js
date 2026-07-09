const { query, db } = require("../config/db.sqlite");

/**
 * GET AVAILABLE ROOMS WITH FREE BEDS
 */
exports.getAvailableRooms = (req, res) => {
  try {
    const [rows] = query(`
      SELECT
        r.room_id,
        r.room_no,
        r.room_type,
        r.floor_no,
        b.bed_id,
        b.bed_no
      FROM rooms r
      JOIN beds b ON b.room_id = r.room_id
      LEFT JOIN room_allocation ra
        ON ra.bed_id = b.bed_id
        AND ra.allocation_status = 'active'
      WHERE b.bed_status = 'available'
        AND (ra.allocation_status IS NULL OR ra.allocation_status != 'active')
      ORDER BY r.room_no, b.bed_no
    `);

    res.json({ success: true, data: rows });
  } catch (err) {
    console.error("GET AVAILABLE ROOMS ERROR:", err);
    res.status(500).json({
      success: false,
      message: "Failed to load available rooms"
    });
  }
};

/**
 * ALLOCATE ROOM
 */
exports.allocateRoom = (req, res) => {
  // Force numbers and handle allocation_start_date
  const student_id = Number(req.body.student_id);
  const room_id = Number(req.body.room_id);
  const bed_id = Number(req.body.bed_id);
  const allocation_start_date =
    req.body.allocation_start_date || new Date().toISOString().split("T")[0];

  if (!student_id || !room_id || !bed_id) {
    return res.status(400).json({
      success: false,
      message: "student_id, room_id and bed_id required"
    });
  }

  try {
    // Prevent double-allocating a bed
    const [bedCheck] = query(
      `SELECT bed_status FROM beds WHERE bed_id = ?`,
      [bed_id]
    );
    if (!bedCheck || bedCheck.length === 0 || bedCheck[0].bed_status !== "available") {
      return res.status(400).json({
        success: false,
        message: "Bed is no longer available"
      });
    }

    // Prevent double-allocating a student
    const [existing] = query(
      `SELECT allocation_id
       FROM room_allocation
       WHERE student_id = ?
       AND allocation_status = 'active'`,
      [student_id]
    );
    if (existing && existing.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Student already has a room allocated"
      });
    }

    // Use better-sqlite3 transaction
    const allocateTransaction = db.transaction(() => {
      db.prepare(`
        INSERT INTO room_allocation (
          student_id,
          room_id,
          bed_id,
          allocation_date,
          allocation_start_date,
          allocation_status
        ) VALUES (?,?,?,?,?,?)`
      ).run(
        student_id,
        room_id,
        bed_id,
        new Date().toISOString().split("T")[0],
        allocation_start_date,
        "active"
      );

      db.prepare(
        `UPDATE beds SET bed_status = 'occupied' WHERE bed_id = ?`
      ).run(bed_id);
    });

    allocateTransaction();
    
    res.json({ success: true, message: "Room allocated successfully" });
  } catch (err) {
    console.error("ALLOCATE ROOM ERROR:", err);
    res.status(500).json({
      success: false,
      message: "Room allocation failed"
    });
  }
};

module.exports = exports;
