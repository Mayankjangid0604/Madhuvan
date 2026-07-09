const allocationService = require("../services/allocation.service");

/**
 * Allocate room & bed to student
 */
exports.allocateRoom = (req, res, next) => {
  try {
    const { student_id, room_id, bed_id, allocation_start_date } = req.body;

    if (!student_id || !room_id || !bed_id || !allocation_start_date) {
      return res.status(400).json({
        success: false,
        message: "student_id, room_id, bed_id and allocation_start_date are required"
      });
    }

    allocationService.allocateRoom({
      student_id,
      room_id,
      bed_id,
      allocation_start_date
    });

    res.status(201).json({
      success: true,
      message: "Room allocated successfully"
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Shift student to another room/bed
 */
exports.shiftRoom = (req, res, next) => {
  try {
    const { student_id, new_room_id, new_bed_id, shift_date } = req.body;

    if (!student_id || !new_room_id || !new_bed_id) {
      return res.status(400).json({
        success: false,
        message: "student_id, new_room_id and new_bed_id are required"
      });
    }

    const result = allocationService.shiftRoom({
      student_id,
      new_room_id,
      new_bed_id,
      shift_date
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
};

/**
 * Exit student from hostel (simple exit)
 */
exports.exitStudent = (req, res, next) => {
  try {
    const { student_id, exit_date, reason } = req.body;

    if (!student_id) {
      return res.status(400).json({
        success: false,
        message: "student_id is required"
      });
    }

    const result = allocationService.exitStudent({
      student_id,
      exit_date,
      reason
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
};

/**
 * Checkout student (full checkout with fines & security deposit)
 */
exports.checkoutStudent = (req, res, next) => {
  try {
    console.log('Checkout request body:', req.body);
    const result = allocationService.checkoutStudent(req.body);
    res.json(result);
  } catch (err) {
    console.error('Checkout error:', err);
    next(err);
  }
};

/**
 * Get active allocations
 */
exports.getActiveAllocations = (req, res, next) => {
  try {
    const data = allocationService.getActiveAllocations();
    res.json({
      success: true,
      data
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get available rooms and beds
 */
exports.getAvailableRoomsAndBeds = (req, res, next) => {
  try {
    const data = allocationService.getAvailableRoomsAndBeds();
    res.json({
      success: true,
      data
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get all rooms
 */
exports.getAllRooms = (req, res, next) => {
  try {
    const rooms = allocationService.getAllRooms();
    res.json({
      success: true,
      data: rooms
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Create room — validate and convert floor_no before passing to service
 */
exports.createRoom = (req, res, next) => {
  try {
    const { room_no, floor_no, room_type } = req.body;

    console.log('📦 createRoom received:', { room_no, floor_no, room_type });

    // Validate required fields
    if (!room_no) {
      return res.status(400).json({
        success: false,
        message: "room_no is required"
      });
    }

    if (!room_type) {
      return res.status(400).json({
        success: false,
        message: "room_type is required"
      });
    }

    // ✅ Convert floor_no string to a valid integer BEFORE passing to service
    let numericFloor;
    const floorStr = String(floor_no || "").trim().toLowerCase();

    if (!floorStr) {
      return res.status(400).json({
        success: false,
        message: "floor_no is required"
      });
    }

    if (floorStr === "basement") {
      numericFloor = -1;
    } else if (floorStr === "ground") {
      numericFloor = 0;
    } else {
      numericFloor = parseInt(floorStr, 10);
      if (isNaN(numericFloor)) {
        return res.status(400).json({
          success: false,
          message: `Invalid floor_no: "${floor_no}"`
        });
      }
    }

    console.log('📦 Converted floor_no:', floor_no, '→', numericFloor);

    const roomId = allocationService.createRoom({
      room_no,
      floor_no: numericFloor,
      room_type
    });

    res.status(201).json({
      success: true,
      message: "Room created successfully",
      data: { roomId }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Update room
 */
exports.updateRoom = (req, res, next) => {
  try {
    const { room_no, floor_no, room_type } = req.body;

    // ✅ Same floor conversion for update
    let numericFloor;
    const floorStr = String(floor_no ?? "").trim().toLowerCase();

    if (!floorStr) {
      return res.status(400).json({
        success: false,
        message: "floor_no is required"
      });
    }

    if (floorStr === "basement") {
      numericFloor = -1;
    } else if (floorStr === "ground") {
      numericFloor = 0;
    } else {
      numericFloor = parseInt(floorStr, 10);
      if (isNaN(numericFloor)) {
        return res.status(400).json({
          success: false,
          message: `Invalid floor_no: "${floor_no}"`
        });
      }
    }

    allocationService.updateRoom(req.params.id, {
      room_no,
      floor_no: numericFloor,
      room_type
    });

    res.json({
      success: true,
      message: "Room updated successfully"
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Delete room
 */
exports.deleteRoom = (req, res, next) => {
  try {
    allocationService.deleteRoom(req.params.id);
    res.json({
      success: true,
      message: "Room deleted successfully"
    });
  } catch (err) {
    next(err);
  }
};

module.exports = exports;
