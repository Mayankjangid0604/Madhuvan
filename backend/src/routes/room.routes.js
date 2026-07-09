const express = require("express");
const router = express.Router();
const roomController = require("../controllers/room.controller");
const auth = require("../middlewares/auth.middleware");

// Apply authentication
router.use(auth);

/**
 * @swagger
 * tags:
 *   name: Rooms
 *   description: Room and bed management
 */

/**
 * @swagger
 * /api/rooms/available:
 *   get:
 *     summary: Get available rooms with free beds
 *     tags: [Rooms]
 *     security:
 *       - bearerAuth: []
 */
router.get("/available", roomController.getAvailableRooms);

/**
 * @swagger
 * /api/rooms/allocate:
 *   post:
 *     summary: Allocate room to student
 *     tags: [Rooms]
 *     security:
 *       - bearerAuth: []
 */
router.post("/allocate", roomController.allocateRoom);

module.exports = router;
