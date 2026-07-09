import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { roomAPI } from "../../services/api/room.api";
import { studentAPI } from "../../services/api/student.api";
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Home,
  Bed,
  Users,
  ArrowRightLeft,
  Grid3x3,
  List,
  X,
  AlertTriangle,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Loader2,
  Building,
  Filter,
  Layers,
  ChevronRight,
  ChevronDown,
  Info,
  Sparkles,
  TrendingUp,
  Eye,
  EyeOff,
  Check
} from "lucide-react";
import "./rooms.css";

// ===== CUSTOM CONFIRM MODAL COMPONENT =====
const ConfirmModal = ({ isOpen, title, message, onConfirm, onCancel, type = 'warning' }) => {
  const confirmBtnRef = useRef(null);

  useEffect(() => {
    if (isOpen && confirmBtnRef.current) {
      confirmBtnRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onCancel?.();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  const iconColor = type === 'danger' ? '#ef4444' : '#f59e0b';
  const bgColor = type === 'danger' ? '#fef2f2' : '#fef3c7';
  const btnColor = type === 'danger' ? '#ef4444' : '#3b82f6';

  return (
    <div
      className="confirm-modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onCancel?.();
        }
      }}
      role="dialog"
      aria-modal="true"
    >
      <div className="confirm-modal-content">
        <div className="confirm-modal-icon" style={{ background: bgColor, color: iconColor }}>
          {type === 'danger' ? <Trash2 size={32} /> : <AlertTriangle size={32} />}
        </div>
        <h3 className="confirm-modal-title">{title}</h3>
        <p className="confirm-modal-message">{message}</p>
        <div className="confirm-modal-actions">
          <button
            type="button"
            className="confirm-modal-btn cancel"
            onClick={onCancel}
          >
            <X size={16} />
            Cancel
          </button>
          <button
            type="button"
            className={`confirm-modal-btn ${type === 'danger' ? 'danger' : 'confirm'}`}
            onClick={onConfirm}
            ref={confirmBtnRef}
          >
            {type === 'danger' ? <Trash2 size={16} /> : <Check size={16} />}
            {type === 'danger' ? 'Delete' : 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ✅ CORRECTED: Proper floor detection
// 001-099 = Ground Floor (3-digit with 0 prefix)
// 0001-0099 = Basement (4-digit with 00 prefix)
// 101-199 = First Floor (3-digit with 1 prefix)
// 201-299 = Second Floor (3-digit with 2 prefix), etc.
const getFloorFromRoomNo = (roomNo) => {
  if (!roomNo || roomNo.length === 0) return "";

  const originalLength = roomNo.length;

  // 4-digit starting with 00 = Basement
  if (originalLength === 4 && roomNo.startsWith("00")) {
    return "-1"; // Basement
  }

  // 3-digit or less: first digit is floor
  if (originalLength <= 3) {
    const floorPrefix = parseInt(roomNo.charAt(0), 10);
    if (floorPrefix === 0) {
      return "0"; // Ground floor (001-099)
    }
    return floorPrefix.toString(); // 1st, 2nd, 3rd floor
  }

  // 4-digit not starting with 00: first two digits are floor
  if (originalLength === 4) {
    const floorPrefix = parseInt(roomNo.substring(0, 2), 10);
    if (floorPrefix === 0) {
      return "0"; // Ground
    }
    return floorPrefix.toString();
  }

  return "";
};

const getFloorDisplayName = (floorNo) => {
  if (floorNo === "-1") return "Basement";
  if (floorNo === "0") return "Ground";
  if (floorNo === "1") return "1st Floor";
  if (floorNo === "2") return "2nd Floor";
  if (floorNo === "3") return "3rd Floor";
  return `${floorNo}th Floor`;
};

const Rooms = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [rooms, setRooms] = useState([]);
  const [allocations, setAllocations] = useState([]);
  const [students, setStudents] = useState([]);
  const [availableBeds, setAvailableBeds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [filterFloor, setFilterFloor] = useState("all");
  const [viewMode, setViewMode] = useState("grid");
  const [expandedRooms, setExpandedRooms] = useState(new Set());
  const [expandAll, setExpandAll] = useState(false);

  // Toast notification state
  const [toast, setToast] = useState({ show: false, type: '', message: '' });

  // Modals
  const [showEditModal, setShowEditModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);

  // Form states
  const [editRoom, setEditRoom] = useState(null);
  const [deleteRoom, setDeleteRoom] = useState(null);
  const [transferData, setTransferData] = useState({
    student_id: "",
    student_name: "",
    current_room_id: "",
    current_room_no: "",
    current_bed_id: "",
    current_bed_no: "",
    current_allocation_id: "",
    new_room_id: "",
    new_bed_id: "",
    transfer_date: new Date().toISOString().split("T")[0],
  });

  // Auto-dismiss toast
  useEffect(() => {
    if (toast.show) {
      const timer = setTimeout(() => {
        setToast({ show: false, type: '', message: '' });
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [toast.show]);

  const showToast = (type, message) => {
    setToast({ show: true, type, message });
  };

  useEffect(() => {
    // ✅ FIX: Close all modals on mount - prevents modal persistence bug
    setShowEditModal(false);
    setShowTransferModal(false);
    setShowDeleteModal(false);
    setEditRoom(null);
    setDeleteRoom(null);

    fetchData();
  }, []);

  useEffect(() => {
    if (location.state?.refresh) {
      fetchData();
      if (location.state?.message) {
        showToast('success', location.state.message);
      }
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state]);

  const fetchData = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const [roomsRes, allocationsRes, studentsRes, availableBedsRes] = await Promise.all([
        roomAPI.getAllRooms(),
        roomAPI.getActiveAllocations(),
        studentAPI.getStudents(),
        roomAPI.getAvailableRoomsAndBeds(),
      ]);

      setRooms(roomsRes.data.data || []);
      setAllocations(allocationsRes.data.data || []);
      setStudents(studentsRes.data.data || []);
      setAvailableBeds(availableBedsRes.data.data || []);

      if (isRefresh) {
        showToast('success', 'Data refreshed successfully!');
      }
    } catch (err) {
      showToast('error', 'Failed to load rooms data');
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const handleRefresh = () => {
    fetchData(true);
  };

  // Build room data with bed details including bed_id
  const roomData = useMemo(() => {
    return rooms.map((room) => {
      const roomAllocations = allocations.filter(
        (a) => a.room_id === room.room_id || a.room_no === room.room_no
      );

      const roomAvailableBeds = availableBeds.filter(b => b.room_id === room.room_id);

      const beds = [];

      for (let i = 1; i <= room.total_beds; i++) {
        const allocation = roomAllocations.find((a) => a.bed_no === i);
        const availableBed = roomAvailableBeds.find(b => b.bed_no === i);

        // Get actual bed_id from allocation or available beds
        const bedId = allocation?.bed_id || availableBed?.bed_id || null;

        beds.push({
          bed_no: i,
          bed_id: bedId,
          status: allocation ? "occupied" : "available",
          student: allocation
            ? {
              id: allocation.student_id,
              name: allocation.student_name,
              allocation_id: allocation.allocation_id,
              bed_id: allocation.bed_id,
            }
            : null,
        });
      }

      const occupiedBeds = beds.filter((b) => b.status === "occupied").length;
      const occupancyRate = room.total_beds > 0 ? (occupiedBeds / room.total_beds) * 100 : 0;

      return {
        ...room,
        beds,
        occupied_beds: occupiedBeds,
        available_beds: room.total_beds - occupiedBeds,
        occupancy_rate: occupancyRate,
        is_full: occupiedBeds === room.total_beds,
      };
    });
  }, [rooms, allocations, availableBeds]);

  // Get unique floors
  const floors = useMemo(() => {
    const uniqueFloors = [...new Set(roomData.map(r => getFloorFromRoomNo(r.room_no)))].sort((a, b) => {
      // Sort: Basement (-1) first, then Ground (0), then 1st, 2nd, etc.
      const aNum = parseInt(a);
      const bNum = parseInt(b);
      return aNum - bNum;
    });
    return uniqueFloors;
  }, [roomData]);

  // Filter rooms - UPDATED with new filter logic
  const filteredRooms = useMemo(() => {
    return roomData.filter((room) => {
      const matchesSearch = !searchTerm ||
        room.room_no.toString().toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus =
        filterStatus === "all" ||
        (filterStatus === "vacant" && room.occupied_beds === 0) ||
        (filterStatus === "partial_vacant" && room.occupied_beds > 0 && room.available_beds > 0) ||
        (filterStatus === "fully_occupied" && room.available_beds === 0 && room.occupied_beds > 0);

      const matchesType = filterType === "all" || room.room_type === filterType;
      const matchesFloor = filterFloor === "all" || getFloorFromRoomNo(room.room_no) === filterFloor;

      return matchesSearch && matchesStatus && matchesType && matchesFloor;
    });
  }, [roomData, searchTerm, filterStatus, filterType, filterFloor]);

  // Statistics
  const stats = useMemo(() => {
    const total_rooms = roomData.length;
    const total_beds = roomData.reduce((sum, r) => sum + r.total_beds, 0);
    const occupied_beds = roomData.reduce((sum, r) => sum + r.occupied_beds, 0);
    const available_beds = roomData.reduce((sum, r) => sum + r.available_beds, 0);
    const full_rooms = roomData.filter((r) => r.is_full).length;
    const occupancy_rate = total_beds > 0 ? ((occupied_beds / total_beds) * 100).toFixed(1) : 0;

    return {
      total_rooms,
      total_beds,
      occupied_beds,
      available_beds,
      full_rooms,
      occupancy_rate
    };
  }, [roomData]);

  // Filter counts - UPDATED with new filter categories
  const filterCounts = useMemo(() => ({
    all: roomData.length,
    vacant: roomData.filter(r => r.occupied_beds === 0).length,
    partial_vacant: roomData.filter(r => r.occupied_beds > 0 && r.available_beds > 0).length,
    fully_occupied: roomData.filter(r => r.available_beds === 0 && r.occupied_beds > 0).length
  }), [roomData]);

  // Available rooms for transfer
  const availableRoomsForTransfer = useMemo(() => {
    return roomData.filter((r) => r.available_beds > 0);
  }, [roomData]);

  // Get available beds for selected room in transfer modal
  const availableBedsForTransfer = useMemo(() => {
    if (!transferData.new_room_id) return [];

    const bedsForRoom = availableBeds.filter(
      b => b.room_id.toString() === transferData.new_room_id.toString()
    );

    return bedsForRoom;
  }, [transferData.new_room_id, availableBeds]);

  // Check if there are active filters
  const hasActiveFilters = searchTerm || filterStatus !== "all" || filterType !== "all" || filterFloor !== "all";

  // Clear all filters
  const clearFilters = () => {
    setSearchTerm("");
    setFilterStatus("all");
    setFilterType("all");
    setFilterFloor("all");
  };

  // Toggle expand all rooms
  const handleExpandAll = () => {
    if (expandAll) {
      setExpandedRooms(new Set());
    } else {
      setExpandedRooms(new Set(filteredRooms.map(r => r.room_id)));
    }
    setExpandAll(!expandAll);
  };

  // Handlers
  const handleEditRoom = async () => {
    try {
      setModalLoading(true);
      await roomAPI.updateRoom(editRoom.room_id, {
        room_no: editRoom.room_no,
        floor_no: editRoom.floor_no,
        room_type: editRoom.room_type,
      });

      showToast('success', `Room ${editRoom.room_no} updated successfully!`);
      setShowEditModal(false);
      setEditRoom(null);
      fetchData();
    } catch (err) {
      showToast('error', err.response?.data?.message || "Failed to update room");
    } finally {
      setModalLoading(false);
    }
  };

  const handleDeleteRoom = async () => {
    try {
      setModalLoading(true);
      await roomAPI.deleteRoom(deleteRoom.room_id);
      showToast('success', `Room ${deleteRoom.room_no} deleted successfully!`);
      setShowDeleteModal(false);
      setDeleteRoom(null);
      fetchData();
    } catch (err) {
      showToast('error', err.response?.data?.message || "Failed to delete room");
    } finally {
      setModalLoading(false);
    }
  };

  const handleTransfer = async () => {
    try {
      if (!transferData.student_id || !transferData.new_room_id || !transferData.new_bed_id) {
        showToast('error', 'Please select both room and bed');
        return;
      }

      // Check if trying to transfer to same bed
      if (transferData.new_bed_id.toString() === transferData.current_bed_id.toString()) {
        showToast('error', 'Cannot transfer to the same bed. Please select a different bed.');
        return;
      }

      setModalLoading(true);

      await roomAPI.shiftRoom({
        student_id: Number(transferData.student_id),
        new_room_id: Number(transferData.new_room_id),
        new_bed_id: Number(transferData.new_bed_id),
      });

      showToast('success', `${transferData.student_name} transferred successfully!`);
      setShowTransferModal(false);
      setTransferData({
        student_id: "",
        student_name: "",
        current_room_id: "",
        current_room_no: "",
        current_bed_id: "",
        current_bed_no: "",
        current_allocation_id: "",
        new_room_id: "",
        new_bed_id: "",
        transfer_date: new Date().toISOString().split("T")[0],
      });
      fetchData();
    } catch (err) {
      console.error('Transfer error:', err);
      showToast('error', err.response?.data?.message || "Failed to transfer student");
    } finally {
      setModalLoading(false);
    }
  };

  const openEditModal = (room) => {
    setEditRoom({
      room_id: room.room_id,
      room_no: room.room_no,
      floor_no: room.floor_no,
      room_type: room.room_type,
    });
    setShowEditModal(true);
  };

  const openDeleteModal = (room) => {
    if (room.occupied_beds > 0) {
      showToast('error', "Cannot delete room with occupied beds. Please deallocate students first.");
      return;
    }
    setDeleteRoom(room);
    setShowDeleteModal(true);
  };

  const openTransferModal = (student, allocationId, room) => {
    const bed = room.beds.find(b => b.student?.id === student.id);

    setTransferData({
      student_id: student.id,
      student_name: student.name,
      current_room_id: room.room_id,
      current_room_no: room.room_no,
      current_bed_id: bed?.bed_id || student.bed_id,
      current_bed_no: bed?.bed_no,
      current_allocation_id: allocationId,
      new_room_id: "",
      new_bed_id: "",
      transfer_date: new Date().toISOString().split("T")[0],
    });
    setShowTransferModal(true);
  };

  const toggleRoomExpand = (roomId) => {
    const newExpanded = new Set(expandedRooms);
    if (newExpanded.has(roomId)) {
      newExpanded.delete(roomId);
    } else {
      newExpanded.add(roomId);
    }
    setExpandedRooms(newExpanded);
  };

  const getOccupancyColor = (rate) => {
    if (rate >= 100) return { gradient: "linear-gradient(90deg, #ef4444, #dc2626)", color: "#ef4444", bg: "rgba(239, 68, 68, 0.1)" };
    if (rate >= 75) return { gradient: "linear-gradient(90deg, #f59e0b, #d97706)", color: "#f59e0b", bg: "rgba(245, 158, 11, 0.1)" };
    if (rate >= 50) return { gradient: "linear-gradient(90deg, #3b82f6, #2563eb)", color: "#3b82f6", bg: "rgba(59, 130, 246, 0.1)" };
    return { gradient: "linear-gradient(90deg, #10b981, #059669)", color: "#10b981", bg: "rgba(16, 185, 129, 0.1)" };
  };

  const getRoomTypeConfig = (type) => {
    const configs = {
      "Single": { bg: "rgba(99, 102, 241, 0.15)", text: "#4f46e5", emoji: "👤", border: "rgba(99, 102, 241, 0.3)" },
      "Double": { bg: "rgba(16, 185, 129, 0.15)", text: "#059669", emoji: "👥", border: "rgba(16, 185, 129, 0.3)" },
      "Triple": { bg: "rgba(245, 158, 11, 0.15)", text: "#d97706", emoji: "👨‍👩‍👦", border: "rgba(245, 158, 11, 0.3)" },
      "Quad": { bg: "rgba(236, 72, 153, 0.15)", text: "#db2777", emoji: "👨‍👩‍👧‍👦", border: "rgba(236, 72, 153, 0.3)" }
    };
    return configs[type] || configs["Double"];
  };

  // Loading State
  if (loading) {
    return (
      <div className="rooms-page">
        <div className="loading-state">
          <div className="loading-spinner">
            <Loader2 size={48} className="spinning" />
          </div>
          <h3>Loading Rooms</h3>
          <p>Please wait while we fetch your room data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rooms-page">
      {/* Toast Notification */}
      {toast.show && (
        <div className={`toast-notification toast-${toast.type}`}>
          <div className="toast-icon">
            {toast.type === 'success' && <CheckCircle size={20} />}
            {toast.type === 'error' && <AlertCircle size={20} />}
            {toast.type === 'warning' && <AlertTriangle size={20} />}
          </div>
          <span className="toast-message">{toast.message}</span>
          <button
            className="toast-close"
            onClick={() => setToast({ show: false, type: '', message: '' })}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Page Header */}
      <div className="page-header">
        <div className="header-content">
          <div className="header-icon">
            <Building size={28} />
          </div>
          <div className="header-text">
            <h1>Room Management</h1>
            <p>Manage rooms, beds, and student allocations</p>
          </div>
        </div>
        <div className="header-actions">
          <button
            className={`btn btn-refresh ${refreshing ? 'spinning' : ''}`}
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw size={18} />
            <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => navigate('/rooms/bulk-add')}
          >
            <Grid3x3 size={18} />
            <span>Bulk Add</span>
          </button>
          <button
            className="btn btn-primary"
            onClick={() => navigate('/rooms/add')}
          >
            <Plus size={18} />
            <span>Add Room</span>
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="stats-grid">
        <div key="stat-total" className="stat-card stat-card-blue">
          <div className="stat-icon-wrapper blue">
            <Home size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-label">Total Rooms</span>
            <div className="stat-value-row">
              <span className="stat-value">{stats.total_rooms}</span>
              <span className="stat-badge neutral">{floors.length} floors</span>
            </div>
          </div>
        </div>

        <div key="stat-beds" className="stat-card stat-card-green">
          <div className="stat-icon-wrapper green">
            <Bed size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-label">Available Beds</span>
            <div className="stat-value-row">
              <span className="stat-value">{stats.available_beds}</span>
              <span className="stat-badge success">of {stats.total_beds}</span>
            </div>
          </div>
        </div>

        <div key="stat-occupancy" className="stat-card stat-card-amber">
          <div className="stat-icon-wrapper amber">
            <TrendingUp size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-label">Occupancy Rate</span>
            <div className="stat-value-row">
              <span className="stat-value">{stats.occupancy_rate}%</span>
              <div className="mini-progress">
                <div
                  className="mini-progress-fill"
                  style={{
                    width: `${stats.occupancy_rate}%`,
                    background: getOccupancyColor(parseFloat(stats.occupancy_rate)).gradient
                  }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        <div key="stat-fullrooms" className="stat-card stat-card-red">
          <div className="stat-icon-wrapper red">
            <AlertTriangle size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-label">Full Rooms</span>
            <div className="stat-value-row">
              <span className="stat-value">{stats.full_rooms}</span>
              <span className="stat-badge danger">No vacancy</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filters Section */}
      <div className="filters-section glass-card">
        <div className="filters-header">
          <div className="filters-title">
            <Filter size={18} />
            <span>Filters & View</span>
            {hasActiveFilters && (
              <span className="active-filters-count">
                {[searchTerm, filterStatus !== 'all', filterType !== 'all', filterFloor !== 'all'].filter(Boolean).length} active
              </span>
            )}
          </div>
          <div className="filters-actions">
            {hasActiveFilters && (
              <button className="clear-filters-btn" onClick={clearFilters}>
                <X size={14} />
                <span>Clear all</span>
              </button>
            )}
            <button
              className={`expand-all-btn ${expandAll ? 'expanded' : ''}`}
              onClick={handleExpandAll}
            >
              {expandAll ? <EyeOff size={16} /> : <Eye size={16} />}
              <span>{expandAll ? 'Collapse All' : 'Expand All'}</span>
            </button>
          </div>
        </div>

        <div className="filters-content">
          <div className="search-wrapper">
            <Search size={18} />
            <input
              type="text"
              placeholder="Search by room number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
            {searchTerm && (
              <button className="search-clear" onClick={() => setSearchTerm("")}>
                <X size={16} />
              </button>
            )}
          </div>

          <div className="filter-group">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="filter-select"
            >
              <option value="all">All Status ({filterCounts.all})</option>
              <option value="vacant">Vacant ({filterCounts.vacant})</option>
              <option value="partial_vacant">Partially Vacant ({filterCounts.partial_vacant})</option>
              <option value="fully_occupied">Fully Occupied ({filterCounts.fully_occupied})</option>
            </select>
          </div>

          <div className="filter-group">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="filter-select"
            >
              <option value="all">All Types</option>
              <option value="Single">Single</option>
              <option value="Double">Double</option>
              <option value="Triple">Triple</option>
              <option value="Quad">Quad</option>
            </select>
          </div>

          <div className="filter-group">
            <select
              value={filterFloor}
              onChange={(e) => setFilterFloor(e.target.value)}
              className="filter-select"
            >
              <option value="all">All Floors</option>
              {floors.map(floor => (
                <option key={floor} value={floor.toString()}>{getFloorDisplayName(String(floor))}</option>
              ))}
            </select>
          </div>

          <div className="view-toggle">
            <button
              className={`toggle-btn ${viewMode === "grid" ? "active" : ""}`}
              onClick={() => setViewMode("grid")}
              title="Grid View"
            >
              <Grid3x3 size={18} />
            </button>
            <button
              className={`toggle-btn ${viewMode === "list" ? "active" : ""}`}
              onClick={() => setViewMode("list")}
              title="List View"
            >
              <List size={18} />
            </button>
          </div>
        </div>

        <div className="filters-footer">
          <span className="results-count">
            Showing <strong>{filteredRooms.length}</strong> of <strong>{roomData.length}</strong> rooms
            {stats.occupied_beds > 0 && (
              <span className="occupancy-summary">
                • <strong>{stats.occupied_beds}</strong> students housed
              </span>
            )}
          </span>
        </div>
      </div>

      {/* Rooms Grid/List */}
      {filteredRooms.length === 0 ? (
        <div className="empty-state glass-card">
          <div className="empty-icon">
            <Home size={56} />
          </div>
          <h3>No Rooms Found</h3>
          <p>
            {hasActiveFilters
              ? "No rooms match your current filters. Try adjusting them."
              : "Get started by adding your first room."
            }
          </p>
          <div className="empty-actions">
            {hasActiveFilters ? (
              <button className="btn btn-secondary" onClick={clearFilters}>
                <X size={18} />
                <span>Clear Filters</span>
              </button>
            ) : (
              <button className="btn btn-primary" onClick={() => navigate('/rooms/add')}>
                <Plus size={18} />
                <span>Add First Room</span>
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className={`rooms-${viewMode}`}>
          {filteredRooms.map((room) => {
            const typeConfig = getRoomTypeConfig(room.room_type);
            const occupancyColor = getOccupancyColor(room.occupancy_rate);
            const isExpanded = expandedRooms.has(room.room_id);

            return (
              <div
                key={room.room_id}
                className={`room-card glass-card ${isExpanded ? 'expanded' : ''}`}
              >
                {/* Room Header */}
                <div className="room-header">
                  <div className="room-info">
                    <div className="room-title">
                      <h3>Room {room.room_no}</h3>
                      <div
                        className="room-type-badge"
                        style={{
                          background: typeConfig.bg,
                          color: typeConfig.text,
                          borderColor: typeConfig.border
                        }}
                      >
                        <span className="type-emoji">{typeConfig.emoji}</span>
                        <span>{room.room_type}</span>
                      </div>
                    </div>
                    <div className="room-meta">
                      <span className="meta-item">
                        <Layers size={14} />
                        {getFloorDisplayName(getFloorFromRoomNo(room.room_no))}
                      </span>
                      <span className="meta-item">
                        <Bed size={14} />
                        {room.total_beds} beds
                      </span>
                      <span
                        className="meta-item occupancy-indicator"
                        style={{ color: occupancyColor.color }}
                      >
                        <Users size={14} />
                        {room.occupied_beds}/{room.total_beds} occupied
                      </span>
                    </div>
                  </div>
                  <div className="room-actions">
                    <button
                      className="action-btn edit"
                      onClick={() => openEditModal(room)}
                      title="Edit Room"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      className="action-btn delete"
                      onClick={() => openDeleteModal(room)}
                      title="Delete Room"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                {/* Occupancy Bar */}
                <div className="occupancy-section" style={{ background: occupancyColor.bg }}>
                  <div className="occupancy-header">
                    <span className="occupancy-label">Occupancy</span>
                    <span
                      className="occupancy-value"
                      style={{ color: occupancyColor.color }}
                    >
                      {room.occupancy_rate.toFixed(0)}%
                    </span>
                  </div>
                  <div className="occupancy-bar">
                    <div
                      className="occupancy-fill"
                      style={{
                        width: `${room.occupancy_rate}%`,
                        background: occupancyColor.gradient,
                      }}
                    ></div>
                  </div>
                  <div className="occupancy-stats">
                    <span className="occ-stat">
                      <span className="occ-dot occupied"></span>
                      {room.occupied_beds} occupied
                    </span>
                    <span className="occ-stat">
                      <span className="occ-dot available"></span>
                      {room.available_beds} available
                    </span>
                  </div>
                </div>

                {/* Beds Section */}
                <div className="beds-section">
                  <div
                    className="beds-header"
                    onClick={() => toggleRoomExpand(room.room_id)}
                  >
                    <span className="beds-header-title">
                      <Bed size={16} />
                      <span>Bed Details</span>
                      <span className="beds-count-badge">
                        {room.occupied_beds}/{room.total_beds}
                      </span>
                    </span>
                    <ChevronDown
                      size={18}
                      className={`expand-icon ${isExpanded ? 'expanded' : ''}`}
                    />
                  </div>

                  <div className={`beds-grid ${isExpanded ? 'expanded' : ''}`}>
                    {room.beds.map((bed) => (
                      <div
                        key={bed.bed_no}
                        className={`bed-item ${bed.status}`}
                      >
                        <div className="bed-icon-wrapper">
                          <Bed size={18} />
                        </div>
                        <div className="bed-content">
                          <div className="bed-header">
                            <span className="bed-number">Bed {bed.bed_no}</span>
                            {bed.bed_id && (
                              <span className="bed-id-tag">ID: {bed.bed_id}</span>
                            )}
                          </div>
                          {bed.student ? (
                            <div className="bed-student-info">
                              <span className="bed-student-name">{bed.student.name}</span>
                              <span className="bed-student-id">Student #{bed.student.id}</span>
                            </div>
                          ) : (
                            <span className="bed-available-tag">
                              <CheckCircle size={12} />
                              Available
                            </span>
                          )}
                        </div>
                        {bed.student && (
                          <button
                            className="transfer-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              openTransferModal(bed.student, bed.student.allocation_id, room);
                            }}
                            title="Transfer Student"
                          >
                            <ArrowRightLeft size={14} />
                          </button>
                        )}
                        <span className={`bed-status-indicator ${bed.status}`}></span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit Room Modal */}
      {showEditModal && editRoom && (
        <div className="modal-overlay" onClick={() => !modalLoading && setShowEditModal(false)}>
          <div className="modal-content glass-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">
                <div className="modal-icon edit">
                  <Edit2 size={20} />
                </div>
                <div>
                  <h3>Edit Room</h3>
                  <p>Update room information</p>
                </div>
              </div>
              <button
                className="modal-close"
                onClick={() => setShowEditModal(false)}
                disabled={modalLoading}
              >
                <X size={20} />
              </button>
            </div>

            <div className="modal-body">
              <div className="form-group">
                <label>
                  <Home size={16} />
                  Room Number
                  <span className="required">*</span>
                </label>
                <input
                  type="text"
                  value={editRoom.room_no}
                  onChange={(e) => setEditRoom({ ...editRoom, room_no: e.target.value })}
                  className="form-input"
                  disabled={modalLoading}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>
                    <Layers size={16} />
                    Floor
                    <span className="required">*</span>
                  </label>
                  <select
                    value={String(editRoom.floor_no ?? "")}
                    onChange={(e) => setEditRoom({ ...editRoom, floor_no: e.target.value })}
                    className="form-input"
                    disabled={modalLoading}
                  >
                    <option value="-1">Basement</option>
                    <option value="0">Ground Floor</option>
                    <option value="1">1st Floor</option>
                    <option value="2">2nd Floor</option>
                    <option value="3">3rd Floor</option>
                    <option value="4">4th Floor</option>
                    <option value="5">5th Floor</option>
                  </select>
                </div>


                <div className="form-group">
                  <label>
                    <Users size={16} />
                    Room Type
                    <span className="required">*</span>
                  </label>
                  <select
                    value={editRoom.room_type}
                    onChange={(e) => setEditRoom({ ...editRoom, room_type: e.target.value })}
                    className="form-input"
                    disabled={modalLoading}
                  >
                    <option value="Single">Single (1 Bed)</option>
                    <option value="Double">Double (2 Beds)</option>
                    <option value="Triple">Triple (3 Beds)</option>
                    <option value="Quad">Quad (4 Beds)</option>
                  </select>
                </div>
              </div>

              <div className="info-box">
                <Info size={16} />
                <span>Changing room type will automatically adjust the number of beds.</span>
              </div>
            </div>

            <div className="modal-footer">
              <button
                className="btn btn-secondary"
                onClick={() => setShowEditModal(false)}
                disabled={modalLoading}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleEditRoom}
                disabled={modalLoading}
              >
                {modalLoading ? (
                  <>
                    <Loader2 size={18} className="spinning" />
                    <span>Updating...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle size={18} />
                    <span>Update Room</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && deleteRoom && (
        <ConfirmModal
          isOpen={showDeleteModal}
          title="Delete Room"
          message={`Are you sure you want to delete Room ${deleteRoom.room_no}? This action cannot be undone.`}
          type="danger"
          onConfirm={handleDeleteRoom}
          onCancel={() => setShowDeleteModal(false)}
        />
      )}

      {/* Transfer Student Modal */}
      {showTransferModal && (
        <div className="modal-overlay" onClick={() => !modalLoading && setShowTransferModal(false)}>
          <div className="modal-content glass-modal transfer-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">
                <div className="modal-icon transfer">
                  <ArrowRightLeft size={20} />
                </div>
                <div>
                  <h3>Transfer Student</h3>
                  <p>Move student to a different room/bed</p>
                </div>
              </div>
              <button
                className="modal-close"
                onClick={() => setShowTransferModal(false)}
                disabled={modalLoading}
              >
                <X size={20} />
              </button>
            </div>

            <div className="modal-body">
              {/* Current Allocation Info */}
              <div className="current-allocation-card">
                <div className="allocation-header">
                  <span className="allocation-label">Current Allocation</span>
                </div>
                <div className="allocation-details">
                  <div className="allocation-item">
                    <Users size={16} />
                    <div>
                      <span className="item-label">Student</span>
                      <span className="item-value">{transferData.student_name}</span>
                    </div>
                  </div>
                  <div className="allocation-item">
                    <Home size={16} />
                    <div>
                      <span className="item-label">Room</span>
                      <span className="item-value">Room {transferData.current_room_no}</span>
                    </div>
                  </div>
                  <div className="allocation-item">
                    <Bed size={16} />
                    <div>
                      <span className="item-label">Bed</span>
                      <span className="item-value">Bed {transferData.current_bed_no}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Transfer Arrow */}
              <div className="transfer-arrow">
                <ChevronDown size={24} />
                <span>Transfer To</span>
              </div>

              {/* New Room Selection */}
              <div className="form-group">
                <label>
                  <Home size={16} />
                  New Room
                  <span className="required">*</span>
                </label>
                <select
                  value={transferData.new_room_id}
                  onChange={(e) => {
                    setTransferData({
                      ...transferData,
                      new_room_id: e.target.value,
                      new_bed_id: ''
                    });
                  }}
                  className="form-input"
                  disabled={modalLoading}
                >
                  <option value="">-- Select Room --</option>
                  {availableRoomsForTransfer.map(room => (
                    <option key={room.room_id} value={room.room_id}>
                      Room {room.room_no} ({room.room_type}) - {room.available_beds} bed(s) available
                    </option>
                  ))}
                </select>
              </div>

              {/* New Bed Selection */}
              {transferData.new_room_id && (
                <div className="form-group">
                  <label>
                    <Bed size={16} />
                    New Bed
                    <span className="required">*</span>
                  </label>
                  {availableBedsForTransfer.length > 0 ? (
                    <div className="bed-selection-grid">
                      {availableBedsForTransfer.map(bed => (
                        <button
                          key={bed.bed_id}
                          type="button"
                          className={`bed-option ${transferData.new_bed_id.toString() === bed.bed_id.toString() ? 'selected' : ''}`}
                          onClick={() => setTransferData({ ...transferData, new_bed_id: bed.bed_id.toString() })}
                          disabled={modalLoading}
                        >
                          <Bed size={18} />
                          <span className="bed-option-number">Bed {bed.bed_no}</span>
                          <span className="bed-option-id">ID: {bed.bed_id}</span>
                          {transferData.new_bed_id.toString() === bed.bed_id.toString() && (
                            <CheckCircle size={16} className="selected-check" />
                          )}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="no-beds-message">
                      <AlertCircle size={18} />
                      <span>No available beds in selected room</span>
                    </div>
                  )}
                </div>
              )}

              {/* Transfer Summary */}
              {transferData.new_room_id && transferData.new_bed_id && (
                <div className="transfer-summary">
                  <Sparkles size={16} />
                  <span>
                    {transferData.student_name} will be moved from <strong>Room {transferData.current_room_no}, Bed {transferData.current_bed_no}</strong> to{' '}
                    <strong>
                      Room {availableRoomsForTransfer.find(r => r.room_id.toString() === transferData.new_room_id.toString())?.room_no},{' '}
                      Bed {availableBedsForTransfer.find(b => b.bed_id.toString() === transferData.new_bed_id.toString())?.bed_no}
                    </strong>
                  </span>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button
                className="btn btn-secondary"
                onClick={() => setShowTransferModal(false)}
                disabled={modalLoading}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleTransfer}
                disabled={modalLoading || !transferData.new_room_id || !transferData.new_bed_id}
              >
                {modalLoading ? (
                  <>
                    <Loader2 size={18} className="spinning" />
                    <span>Transferring...</span>
                  </>
                ) : (
                  <>
                    <ArrowRightLeft size={18} />
                    <span>Confirm Transfer</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Rooms;