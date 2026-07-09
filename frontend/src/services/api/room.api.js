import api from "./axiosInstance";

export const roomAPI = {
  // ============================================
  // ROOM MANAGEMENT
  // ============================================
  
  getAllRooms() {
    return api.get("/allocations/rooms/all");
  },

  createRoom(data) {
    return api.post("/allocations/rooms", data);
  },

  updateRoom(roomId, data) {
    return api.put(`/allocations/rooms/${roomId}`, data);
  },

  deleteRoom(roomId) {
    return api.delete(`/allocations/rooms/${roomId}`);
  },

  // ============================================
  // ROOM AVAILABILITY
  // ============================================

  getAvailableRooms() {
    return api.get("/rooms/available");
  },

  getAvailableRoomsAndBeds() {
    return api.get("/allocations/available");
  },

  // ============================================
  // ALLOCATION MANAGEMENT
  // ============================================

  allocateRoom(data) {
    return api.post("/rooms/allocate", {
      student_id: Number(data.student_id),
      room_id: Number(data.room_id),
      bed_id: Number(data.bed_id),
      allocation_start_date: data.allocation_start_date || new Date().toISOString().split("T")[0]
    });
  },

  allocateRoomWithDetails({ student_id, room_id, bed_id, allocation_start_date }) {
    return api.post("/allocations", {
      student_id: Number(student_id),
      room_id: Number(room_id),
      bed_id: Number(bed_id),
      allocation_start_date: allocation_start_date || new Date().toISOString().split("T")[0]
    });
  },

  getActiveAllocations() {
    return api.get("/allocations/active");
  },

  shiftRoom(data) {
    return api.post("/allocations/shift", data);
  },

  // ============================================
  // STUDENT CHECKOUT
  // ============================================

  exitStudent(data) {
    return api.post("/allocations/exit", data);
  },

  checkoutStudent(data) {
    return api.post("/allocations/checkout", data);
  }
};

export default roomAPI;