const { query } = require("../config/db.sqlite");
const ledgerService = require("./ledger.service");

// --- SAFE allocateBed: unwrap nested student_id if needed ---
exports.allocateBed = ({ student_id, room_id, bed_id, allocation_start_date }) => {
  // ✅ Unwrap nested student_id if passed as { student_id: N }
  if (student_id && typeof student_id === "object" && student_id.student_id) {
    student_id = student_id.student_id;
  }

  // 1. Check active allocation for student
  const [studentAlloc] = query(
    `SELECT 1 FROM room_allocation
     WHERE student_id = ? AND allocation_status = 'active'`,
    [student_id]
  );

  if (studentAlloc.length > 0) {
    throw new Error("Student already has an active allocation");
  }

  // 2. Check bed availability
  const [bed] = query(
    `SELECT bed_status FROM beds WHERE bed_id = ?`,
    [bed_id]
  );

  if (!bed || (!Array.isArray(bed) && bed.length > 0) || (Array.isArray(bed) && bed.length > 0 && bed[0].bed_status !== "available")) {
    throw new Error("Bed is not available");
  }

  // 3. Insert allocation
  const [result] = query(
    `INSERT INTO room_allocation
     (student_id, room_id, bed_id, allocation_date, allocation_start_date, allocation_status)
     VALUES (?,?,?,?,?,?)`,
    [student_id, room_id, bed_id, allocation_start_date, allocation_start_date, 'active']
  );

  // 4. Update bed status
  query(
    `UPDATE beds SET bed_status = 'occupied' WHERE bed_id = ?`,
    [bed_id]
  );

  return result.insertId;
};

exports.getActiveAllocations = () => {
  const [rows] = query(
    `SELECT ra.*, s.student_name, r.room_no, b.bed_no
     FROM room_allocation ra
     JOIN students s ON s.student_id = ra.student_id
     JOIN rooms r ON r.room_id = ra.room_id
     JOIN beds b ON b.bed_id = ra.bed_id
     WHERE ra.allocation_status = 'active'`
  );

  return rows;
};

exports.allocateRoom = ({ student_id, room_id, bed_id, allocation_start_date }) => {
  return exports.allocateBed({ student_id, room_id, bed_id, allocation_start_date });
};

exports.getAvailableRoomsAndBeds = () => {
  const [rooms] = query(
    `SELECT 
      r.room_id,
      r.room_no,
      r.floor_no,
      r.room_type,
      b.bed_id,
      b.bed_no,
      b.bed_label,
      b.bed_status
     FROM rooms r
     INNER JOIN beds b ON r.room_id = b.room_id
     WHERE b.bed_status = 'available'
     ORDER BY r.room_no, b.bed_no`
  );
  return rooms;
};

exports.getAllRooms = () => {
  const [rooms] = query(`
    SELECT r.*, 
           COUNT(b.bed_id) as total_beds,
           SUM(CASE WHEN b.bed_status = 'occupied' THEN 1 ELSE 0 END) as occupied_beds
    FROM rooms r
    LEFT JOIN beds b ON r.room_id = b.room_id
    GROUP BY r.room_id
    ORDER BY CAST(r.room_no AS INTEGER), r.room_no
  `);
  return rooms;
};

exports.createRoom = ({ room_no, floor_no, room_type }) => {
  try {
    // Strip leading zeros from room number (e.g. "010" → "10")
    const cleanRoomNo = String(parseInt(room_no, 10));

    // ✅ floor_no is already a number from the controller
    // Just validate it's actually a number
    const actualFloorNo = Number(floor_no);

    if (isNaN(actualFloorNo)) {
      throw new Error(`Invalid floor_no: "${floor_no}" — must be a number`);
    }

    console.log('🏠 Creating room:', { room_no: cleanRoomNo, floor_no: actualFloorNo, room_type });

    // Calculate beds based on room type
    const bedMap = {
      "Single": 1,
      "Double": 2,
      "Triple": 3,
      "Quad": 4
    };
    const bedsCount = bedMap[room_type] || 2;

    // Insert room
    const [result] = query(
      `INSERT INTO rooms (room_no, floor_no, room_type)
       VALUES (?, ?, ?)`,
      [cleanRoomNo, actualFloorNo, room_type]
    );

    const roomId = result.insertId;

    // Create beds for the room
    for (let i = 1; i <= bedsCount; i++) {
      query(
        `INSERT INTO beds (room_id, bed_no, bed_status)
         VALUES (?, ?, 'available')`,
        [roomId, i]
      );
    }

    console.log('✅ Room created:', { roomId, room_no: cleanRoomNo, floor_no: actualFloorNo, beds: bedsCount });
    return roomId;
  } catch (err) {
    console.error('Create room error:', err);
    throw err;
  }
};

exports.updateRoom = (roomId, data) => {
  try {
    // Strip leading zeros from room number (e.g. "010" → "10")
    const cleanRoomNo = String(parseInt(data.room_no, 10));

    // ✅ floor_no is already a number from the controller
    const actualFloorNo = Number(data.floor_no);

    if (isNaN(actualFloorNo)) {
      throw new Error(`Invalid floor_no: "${data.floor_no}" — must be a number`);
    }

    // Update room details
    query(
      `UPDATE rooms SET room_no = ?, floor_no = ?, room_type = ?
       WHERE room_id = ?`,
      [cleanRoomNo, actualFloorNo, data.room_type, roomId]
    );

    // Calculate required beds based on room type
    const bedMap = {
      "Single": 1,
      "Double": 2,
      "Triple": 3,
      "Quad": 4
    };
    const requiredBeds = bedMap[data.room_type] || 2;

    // Get current beds
    const [currentBeds] = query(
      `SELECT bed_id, bed_no FROM beds WHERE room_id = ? ORDER BY bed_no`,
      [roomId]
    );

    const currentBedCount = currentBeds.length;

    if (requiredBeds > currentBedCount) {
      for (let i = currentBedCount + 1; i <= requiredBeds; i++) {
        query(
          `INSERT INTO beds (room_id, bed_no, bed_status)
           VALUES (?, ?, 'available')`,
          [roomId, i]
        );
      }
    }

    if (requiredBeds < currentBedCount) {
      const [occupiedBeds] = query(
        `SELECT COUNT(*) as count FROM beds 
         WHERE room_id = ? AND bed_status = 'occupied'`,
        [roomId]
      );

      if (occupiedBeds[0].count > requiredBeds) {
        throw new Error(`Cannot reduce beds. ${occupiedBeds[0].count} beds are currently occupied.`);
      }

      const bedsToDelete = currentBeds.slice(requiredBeds);
      for (const bed of bedsToDelete) {
        const [bedStatus] = query(
          `SELECT bed_status FROM beds WHERE bed_id = ?`,
          [bed.bed_id]
        );

        if (bedStatus[0]?.bed_status === 'available') {
          query(`DELETE FROM beds WHERE bed_id = ?`, [bed.bed_id]);
        }
      }
    }

    return true;
  } catch (err) {
    console.error('Update room error:', err);
    throw err;
  }
};

exports.deleteRoom = (roomId) => {
  const [allocations] = query(
    `SELECT COUNT(*) as count FROM room_allocation
     WHERE room_id = ? AND allocation_status = 'active'`,
    [roomId]
  );

  if (allocations[0].count > 0) {
    throw new Error("Cannot delete room with active allocations");
  }

  query(`DELETE FROM beds WHERE room_id = ?`, [roomId]);
  query(`DELETE FROM rooms WHERE room_id = ?`, [roomId]);
};

exports.checkoutStudent = ({
  student_id,
  checkout_date,
  reason,
  remarks,
  refund_amount,
  payment_mode
}) => {
  try {
    if (!student_id) {
      throw new Error("student_id is required");
    }
    if (!checkout_date) {
      throw new Error("checkout_date is required");
    }

    const [allocation] = query(
      `SELECT allocation_id, bed_id FROM room_allocation
       WHERE student_id = ? AND allocation_status = 'active'`,
      [student_id]
    );

    if (!allocation || allocation.length === 0) {
      throw new Error("No active allocation found for student");
    }

    const { allocation_id, bed_id } = allocation[0];

    const [students] = query(
      `SELECT student_name, father_name FROM students WHERE student_id = ?`,
      [student_id]
    );

    if (!students || students.length === 0) {
      throw new Error("Student not found");
    }

    const student = students[0];
    const studentName = student.student_name;
    const fatherName = student.father_name || "N/A";

    query(
      `UPDATE room_allocation
       SET allocation_status = 'checkout',
           allocation_end_date = ?,
           checkout_date = ?,
           checkout_reason = ?
       WHERE allocation_id = ?`,
      [checkout_date, checkout_date, remarks || reason, allocation_id]
    );

    query(
      `UPDATE beds SET bed_status = 'available' WHERE bed_id = ?`,
      [bed_id]
    );

    query(
      `UPDATE students
       SET date_of_leaving = ?
       WHERE student_id = ?`,
      [checkout_date, student_id]
    );

    query(
      `UPDATE student_fees
       SET fee_status = 'CANCELLED'
       WHERE student_id = ? AND fee_status NOT IN ('PAID', 'CANCELLED')`,
      [student_id]
    );

    const finalRefundAmount = Number(refund_amount || 0);
    if (finalRefundAmount > 0) {
      ledgerService.createSecurityRefundEntry({
        student_id,
        amount: finalRefundAmount,
        refund_date: checkout_date,
        payment_mode: payment_mode || 'Cash',
        reason: remarks || reason || 'Checkout'
      });
    }

    return {
      success: true,
      message: "Student checked out successfully",
      data: {
        student_name: studentName,
        father_name: fatherName,
        refund_amount: finalRefundAmount,
        payment_mode: payment_mode || 'Cash'
      }
    };

  } catch (error) {
    console.error('Checkout Error:', error);
    throw error;
  }
};

exports.shiftRoom = ({ student_id, new_room_id, new_bed_id, shift_date }) => {
  try {
    student_id = Number(student_id);
    new_room_id = Number(new_room_id);
    new_bed_id = Number(new_bed_id);

    if (!student_id || isNaN(student_id)) {
      throw new Error("Invalid student_id provided");
    }
    if (!new_room_id || isNaN(new_room_id)) {
      throw new Error("Invalid new_room_id provided");
    }
    if (!new_bed_id || isNaN(new_bed_id)) {
      throw new Error("Invalid new_bed_id provided");
    }

    const [currentAllocation] = query(
      `SELECT allocation_id, bed_id, room_id FROM room_allocation
       WHERE student_id = ? AND allocation_status = 'active'`,
      [student_id]
    );

    if (!currentAllocation || currentAllocation.length === 0) {
      throw new Error("No active allocation found for student");
    }

    const { allocation_id, bed_id: old_bed_id, room_id: old_room_id } = currentAllocation[0];

    if (old_bed_id === new_bed_id) {
      throw new Error("Student is already allocated to this bed");
    }

    const [newRoom] = query(
      `SELECT room_id, room_no FROM rooms WHERE room_id = ?`,
      [new_room_id]
    );

    if (!newRoom || newRoom.length === 0) {
      throw new Error("New room does not exist");
    }

    const [newBed] = query(
      `SELECT bed_id, bed_status, room_id FROM beds WHERE bed_id = ?`,
      [new_bed_id]
    );

    if (!newBed || newBed.length === 0) {
      throw new Error("New bed does not exist");
    }

    if (newBed[0].room_id !== new_room_id) {
      throw new Error(`Bed ${new_bed_id} does not belong to room ${new_room_id}`);
    }

    if (newBed[0].bed_status !== "available") {
      throw new Error(`New bed is not available (current status: ${newBed[0].bed_status})`);
    }

    const [existingAllocation] = query(
      `SELECT allocation_id, student_id FROM room_allocation 
       WHERE bed_id = ? AND allocation_status = 'active'`,
      [new_bed_id]
    );

    if (existingAllocation && existingAllocation.length > 0) {
      throw new Error("New bed already has an active allocation");
    }

    const shiftDateValue = shift_date || new Date().toISOString().split('T')[0];

    query(
      `UPDATE room_allocation
       SET allocation_status = 'checkout',
           allocation_end_date = ?,
           checkout_date = ?,
           checkout_reason = 'Room shifted'
       WHERE allocation_id = ?`,
      [shiftDateValue, shiftDateValue, allocation_id]
    );

    query(
      `UPDATE beds SET bed_status = 'available' WHERE bed_id = ?`,
      [old_bed_id]
    );

    query(
      `UPDATE beds SET bed_status = 'occupied' WHERE bed_id = ?`,
      [new_bed_id]
    );

    const [result] = query(
      `INSERT INTO room_allocation
       (student_id, room_id, bed_id, allocation_date, allocation_start_date, allocation_status)
       VALUES (?, ?, ?, ?, ?, 'active')`,
      [
        student_id,
        new_room_id,
        new_bed_id,
        shiftDateValue,
        shiftDateValue
      ]
    );

    const [roomDetails] = query(
      `SELECT r.room_no, b.bed_no 
       FROM rooms r 
       JOIN beds b ON b.room_id = r.room_id 
       WHERE b.bed_id = ?`,
      [new_bed_id]
    );

    return {
      success: true,
      message: "Room shifted successfully",
      data: {
        new_allocation_id: result.insertId,
        new_room_no: roomDetails[0]?.room_no,
        new_bed_no: roomDetails[0]?.bed_no
      }
    };

  } catch (error) {
    console.error('Shift room error:', error);
    throw error;
  }
};

exports.exitStudent = ({ student_id, exit_date, reason }) => {
  try {
    const [allocation] = query(
      `SELECT allocation_id, bed_id FROM room_allocation
       WHERE student_id = ? AND allocation_status = 'active'`,
      [student_id]
    );

    if (!allocation || allocation.length === 0) {
      throw new Error("No active allocation found for student");
    }

    const { allocation_id, bed_id } = allocation[0];
    const exitDateValue = exit_date || new Date().toISOString().split('T')[0];

    query(
      `UPDATE room_allocation
       SET allocation_status = 'checkout',
           allocation_end_date = ?,
           checkout_date = ?,
           checkout_reason = ?
       WHERE allocation_id = ?`,
      [exitDateValue, exitDateValue, reason || 'Student exited', allocation_id]
    );

    query(
      `UPDATE beds SET bed_status = 'available' WHERE bed_id = ?`,
      [bed_id]
    );

    query(
      `UPDATE students
       SET date_of_leaving = ?
       WHERE student_id = ?`,
      [exitDateValue, student_id]
    );

    return {
      success: true,
      message: "Student exited successfully"
    };

  } catch (error) {
    console.error('Exit student error:', error);
    throw error;
  }
};

module.exports = exports;