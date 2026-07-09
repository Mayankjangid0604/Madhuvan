const express = require("express");
const router = express.Router();
const allocationController = require("../controllers/allocation.controller");
const auth = require("../middlewares/auth.middleware");

// Apply authentication
router.use(auth);

/**
 * @swagger
 * tags:
 *   name: Allocation
 *   description: Room & bed allocation
 */

/**
 * @swagger
 * /api/allocations:
 *   post:
 *     summary: Allocate room & bed to student
 *     tags: [Allocation]
 *     requestBody:
 *       required: true
 *     responses:
 *       201:
 *         description: Allocation successful
 */
router.post("/", allocationController.allocateRoom);

/**
 * @swagger
 * /api/allocations/shift:
 *   post:
 *     summary: Shift student to another room/bed
 *     tags: [Allocation]
 *     requestBody:
 *       required: true
 *     responses:
 *       200:
 *         description: Shift successful
 */
router.post("/shift", allocationController.shiftRoom);

/**
 * @swagger
 * /api/allocations/exit:
 *   post:
 *     summary: Exit student from hostel
 *     tags: [Allocation]
 *     requestBody:
 *       required: true
 *     responses:
 *       200:
 *         description: Exit recorded
 */
router.post("/exit", allocationController.exitStudent);

/**
 * @swagger
 * /api/allocations/active:
 *   get:
 *     summary: Get active allocations
 *     tags: [Allocation]
 *     responses:
 *       200:
 *         description: Active students list
 */
router.get("/active", allocationController.getActiveAllocations);

/**
 * @swagger
 * /api/allocations/available:
 *   get:
 *     summary: Get available rooms and beds
 *     tags: [Allocation]
 *     responses:
 *       200:
 *         description: Available rooms and beds list
 */
router.get("/available", allocationController.getAvailableRoomsAndBeds);

/**
 * @swagger
 * /api/allocations/rooms/all:
 *   get:
 *     summary: Get all rooms
 *     tags: [Allocation]
 *     responses:
 *       200:
 *         description: All rooms list
 */
router.get("/rooms/all", allocationController.getAllRooms);

/**
 * @swagger
 * /api/allocations/rooms:
 *   post:
 *     summary: Create a new room
 *     tags: [Allocation]
 *     requestBody:
 *       required: true
 *     responses:
 *       201:
 *         description: Room created successfully
 */
router.post("/rooms", allocationController.createRoom);

/**
 * @swagger
 * /api/allocations/rooms/{id}:
 *   put:
 *     summary: Update an existing room
 *     tags: [Allocation]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: The ID of the room to update
 *     requestBody:
 *       required: true
 *     responses:
 *       200:
 *         description: Room updated successfully
 */
router.put("/rooms/:id", allocationController.updateRoom);

/**
 * @swagger
 * /api/allocations/rooms/{id}:
 *   delete:
 *     summary: Delete a room
 *     tags: [Allocation]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: The ID of the room to delete
 *     responses:
 *       204:
 *         description: Room deleted successfully
 */
router.delete("/rooms/:id", allocationController.deleteRoom);

/**
 * @swagger
 * /api/allocations/checkout:
 *   post:
 *     summary: Checkout student from hostel
 *     tags: [Allocation]
 *     requestBody:
 *       required: true
 *     responses:
 *       200:
 *         description: Checkout successful
 */
router.post("/checkout", allocationController.checkoutStudent);

module.exports = router;
