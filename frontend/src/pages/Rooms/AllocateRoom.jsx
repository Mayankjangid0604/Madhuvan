import React, { useEffect, useState, useMemo, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Home,
  Bed,
  User,
  CheckCircle,
  AlertCircle,
  X,
  Loader2,
  Search,
  Filter,
  ChevronRight,
  Building2,
  Sparkles,
  AlertTriangle,
  Check
} from "lucide-react";
import { roomAPI } from "../../services/api/room.api";
import "./allocateRoom.css";

import ConfirmModal from "../../components/modals/ConfirmModal";

// Separate Bed Component to isolate click handling
const BedCard = ({ bed, isSelected, onSelect }) => {
  const handleClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    onSelect(bed.bed_id);
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          handleClick(e);
        }
      }}
      style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        background: isSelected
          ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(139, 92, 246, 0.15))'
          : 'rgba(255, 255, 255, 0.8)',
        border: isSelected
          ? '3px solid #6366f1'
          : '2px solid rgba(0, 0, 0, 0.1)',
        borderRadius: '14px',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        minHeight: '120px',
        boxShadow: isSelected
          ? '0 4px 20px rgba(99, 102, 241, 0.3)'
          : '0 2px 8px rgba(0, 0, 0, 0.05)',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        pointerEvents: 'auto',
        zIndex: 10
      }}
    >
      <div style={{
        width: '56px',
        height: '56px',
        borderRadius: '14px',
        background: isSelected
          ? 'linear-gradient(135deg, #6366f1, #8b5cf6)'
          : 'linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(139, 92, 246, 0.1))',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: isSelected ? 'white' : '#6366f1',
        marginBottom: '10px',
        pointerEvents: 'none'
      }}>
        <Bed size={28} />
      </div>
      <span style={{
        fontSize: '16px',
        fontWeight: isSelected ? '700' : '600',
        color: isSelected ? '#4f46e5' : '#374151',
        pointerEvents: 'none'
      }}>
        Bed {bed.bed_no}
      </span>
      {isSelected && (
        <div style={{
          position: 'absolute',
          top: '10px',
          right: '10px',
          color: '#10b981',
          pointerEvents: 'none'
        }}>
          <CheckCircle size={22} />
        </div>
      )}
    </div>
  );
};

const AllocateRoom = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const studentId = searchParams.get("student_id");
  const studentName = searchParams.get("name") || "Student";

  const [groupedRooms, setGroupedRooms] = useState([]);
  const [selectedRoomId, setSelectedRoomId] = useState(null);
  const [selectedBedId, setSelectedBedId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [allocating, setAllocating] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterFloor, setFilterFloor] = useState("");
  const [filterType, setFilterType] = useState("");
  const [toast, setToast] = useState({ show: false, type: '', message: '' });

  // ✅ FIX: Custom confirm modal state
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: null
  });

  useEffect(() => {
    if (studentId) {
      fetchAvailableRooms();
    }
  }, [studentId]);

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

  const fetchAvailableRooms = async () => {
    try {
      setLoading(true);
      const res = await roomAPI.getAvailableRooms();
      const rows = res.data?.data || [];
      groupRooms(rows);
    } catch (err) {
      console.error("Error fetching rooms:", err);
      showToast('error', 'Failed to load available rooms');
    } finally {
      setLoading(false);
    }
  };

  const groupRooms = (rows) => {
    const map = {};
    rows.forEach((r) => {
      if (!map[r.room_id]) {
        map[r.room_id] = {
          room_id: r.room_id,
          room_no: r.room_no,
          room_type: r.room_type,
          floor_no: r.floor_no || r.room_no?.toString().charAt(0) || "1",
          beds: []
        };
      }
      map[r.room_id].beds.push({
        bed_id: r.bed_id,
        bed_no: r.bed_no
      });
    });
    setGroupedRooms(Object.values(map));
  };

  const filteredRooms = useMemo(() => {
    return groupedRooms.filter(room => {
      const matchesSearch = room.room_no?.toString().toLowerCase().includes(searchTerm.toLowerCase());
      const matchesFloor = !filterFloor || room.floor_no === filterFloor;
      const matchesType = !filterType || room.room_type === filterType;
      return matchesSearch && matchesFloor && matchesType;
    });
  }, [groupedRooms, searchTerm, filterFloor, filterType]);

  const floors = useMemo(() => {
    return [...new Set(groupedRooms.map(r => r.floor_no))].sort();
  }, [groupedRooms]);

  const roomTypes = useMemo(() => {
    return [...new Set(groupedRooms.map(r => r.room_type))];
  }, [groupedRooms]);

  const selectedRoom = useMemo(() => {
    return groupedRooms.find(r => r.room_id === selectedRoomId) || null;
  }, [groupedRooms, selectedRoomId]);

  const selectedBed = useMemo(() => {
    if (!selectedRoom) return null;
    return selectedRoom.beds.find(b => b.bed_id === selectedBedId) || null;
  }, [selectedRoom, selectedBedId]);

  const getRoomTypeColor = (type) => {
    const colors = {
      "Single": { bg: "rgba(99, 102, 241, 0.15)", text: "#4f46e5", border: "rgba(99, 102, 241, 0.3)" },
      "Double": { bg: "rgba(16, 185, 129, 0.15)", text: "#059669", border: "rgba(16, 185, 129, 0.3)" },
      "Triple": { bg: "rgba(245, 158, 11, 0.15)", text: "#d97706", border: "rgba(245, 158, 11, 0.3)" },
      "Quad": { bg: "rgba(236, 72, 153, 0.15)", text: "#db2777", border: "rgba(236, 72, 153, 0.3)" }
    };
    return colors[type] || colors["Double"];
  };

  const handleRoomSelect = (roomId) => {
    setSelectedRoomId(roomId);
    setSelectedBedId(null);
  };

  const handleBedSelect = (bedId) => {
    setSelectedBedId(bedId);
  };

  // ✅ FIX: Execute allocation after confirm
  const executeAllocate = async () => {
    setAllocating(true);

    try {
      await roomAPI.allocateRoom({
        student_id: Number(studentId),
        room_id: Number(selectedRoomId),
        bed_id: Number(selectedBedId)
      });

      showToast('success', 'Room allocated successfully!');

      setTimeout(() => {
        navigate("/students", { state: { refresh: true, message: 'Room allocated successfully' } });
      }, 1500);
    } catch (err) {
      console.error("Allocation error:", err);
      showToast('error', err.response?.data?.message || 'Allocation failed');
      setAllocating(false);
    }
  };

  // ✅ FIX: Show custom confirm modal instead of window.confirm
  const handleAllocate = () => {
    if (!selectedRoomId || !selectedBedId) {
      showToast('error', 'Please select both room and bed');
      return;
    }

    setConfirmModal({
      isOpen: true,
      title: 'Confirm Room Allocation',
      message: `Allocate Room ${selectedRoom.room_no}, Bed ${selectedBed.bed_no} to ${studentName}?`,
      onConfirm: () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        executeAllocate();
      }
    });
  };

  const clearFilters = () => {
    setSearchTerm("");
    setFilterFloor("");
    setFilterType("");
  };

  const hasActiveFilters = searchTerm || filterFloor || filterType;

  if (!studentId) {
    return (
      <div className="allocate-room-page">
        <div className="empty-state glass-card">
          <div className="empty-icon">
            <User size={48} />
          </div>
          <h2>No Student Selected</h2>
          <p>Please select a student from the students list to allocate a room.</p>
          <button
            className="btn btn-primary"
            onClick={() => navigate("/students")}
          >
            <ArrowLeft size={18} />
            <span>Go to Students</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="allocate-room-page">
      {/* Toast Notification */}
      {toast.show && (
        <div className={`toast-notification toast-${toast.type}`}>
          <div className="toast-icon">
            {toast.type === 'success' && <CheckCircle size={20} />}
            {toast.type === 'error' && <AlertCircle size={20} />}
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

      {/* ✅ FIX: Custom Confirm Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText="Allocate Room"
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        type="info"
      />

      {/* Page Header */}
      <div className="page-header-enhanced">
        <div className="header-content">
          <div className="header-icon">
            <Building2 size={28} />
          </div>
          <div className="header-text">
            <h1>Allocate Room</h1>
            <p>
              Assigning room for <strong>{studentName}</strong>
              <span className="student-id">(ID: {studentId})</span>
            </p>
          </div>
        </div>
        <button
          className="back-button"
          onClick={() => navigate("/students")}
        >
          <ArrowLeft size={18} />
          <span>Back to Students</span>
        </button>
      </div>

      {/* ✅ FIX: Removed Debug Panel */}

      {/* Main Content */}
      <div className="allocate-content">
        {/* Left Panel - Room Selection */}
        <div className="room-selection-panel glass-card">
          <div className="panel-header">
            <div className="panel-title">
              <Home size={20} />
              <h2>Available Rooms</h2>
              <span className="room-count">{filteredRooms.length} rooms</span>
            </div>
          </div>

          {/* Filters */}
          <div className="filters-section">
            <div className="search-box">
              <Search size={18} />
              <input
                type="text"
                placeholder="Search by room number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
            </div>
            <div className="filter-row">
              <div className="filter-group">
                <Filter size={16} />
                <select
                  value={filterFloor}
                  onChange={(e) => setFilterFloor(e.target.value)}
                  className="filter-select"
                >
                  <option value="">All Floors</option>
                  {floors.map(floor => (
                    <option key={floor} value={floor}>Floor {floor}</option>
                  ))}
                </select>
              </div>
              <div className="filter-group">
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="filter-select"
                >
                  <option value="">All Types</option>
                  {roomTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
              {hasActiveFilters && (
                <button className="clear-filters-btn" onClick={clearFilters}>
                  <X size={14} />
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Room List */}
          <div className="room-list">
            {loading ? (
              <div className="loading-state">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="room-card-skeleton shimmer"></div>
                ))}
              </div>
            ) : filteredRooms.length === 0 ? (
              <div className="empty-rooms">
                <Home size={40} />
                <h3>No Available Rooms</h3>
                <p>
                  {hasActiveFilters
                    ? "No rooms match your filters. Try adjusting them."
                    : "All rooms are currently occupied."}
                </p>
                {hasActiveFilters && (
                  <button className="btn btn-secondary" onClick={clearFilters}>
                    Clear Filters
                  </button>
                )}
              </div>
            ) : (
              filteredRooms.map(room => {
                const colors = getRoomTypeColor(room.room_type);
                const isSelected = selectedRoomId === room.room_id;

                return (
                  <div
                    key={room.room_id}
                    className={`room-card ${isSelected ? 'selected' : ''}`}
                    onClick={() => handleRoomSelect(room.room_id)}
                    style={{ cursor: 'pointer' }}
                  >
                    <div className="room-card-main">
                      <div className="room-number">
                        <Home size={18} />
                        <span>{room.room_no}</span>
                      </div>
                      <div
                        className="room-type-badge"
                        style={{
                          background: colors.bg,
                          color: colors.text,
                          border: `1px solid ${colors.border}`
                        }}
                      >
                        {room.room_type}
                      </div>
                    </div>
                    <div className="room-card-details">
                      <span className="floor-info">Floor {room.floor_no}</span>
                      <span className="bed-count">
                        <Bed size={14} />
                        {room.beds.length} bed{room.beds.length !== 1 ? 's' : ''} available
                      </span>
                    </div>
                    <div className="room-card-arrow">
                      <ChevronRight size={18} />
                    </div>
                    {isSelected && <div className="selected-indicator"></div>}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Panel - Bed Selection & Confirmation */}
        <div className="bed-selection-panel">
          {/* Bed Selection Card */}
          <div className="glass-card" style={{ overflow: 'visible', position: 'relative', zIndex: 1 }}>
            <div className="panel-header">
              <div className="panel-title">
                <Bed size={20} />
                <h2>Select Bed</h2>
              </div>
            </div>

            <div style={{ padding: '24px', position: 'relative', zIndex: 2 }}>
              {selectedRoom ? (
                <>
                  <div className="selected-room-info">
                    <span className="label">Selected Room</span>
                    <div className="room-badge">
                      <Home size={16} />
                      Room {selectedRoom.room_no}
                      <span
                        className="type-tag"
                        style={{
                          background: getRoomTypeColor(selectedRoom.room_type).bg,
                          color: getRoomTypeColor(selectedRoom.room_type).text
                        }}
                      >
                        {selectedRoom.room_type}
                      </span>
                    </div>
                  </div>

                  <p style={{ marginBottom: '16px', color: '#6b7280', fontSize: '14px' }}>
                    Click on a bed to select it ({selectedRoom.beds.length} available):
                  </p>

                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gap: '16px',
                    position: 'relative',
                    zIndex: 10
                  }}>
                    {selectedRoom.beds.map(bed => (
                      <BedCard
                        key={bed.bed_id}
                        bed={bed}
                        isSelected={selectedBedId === bed.bed_id}
                        onSelect={handleBedSelect}
                      />
                    ))}
                  </div>
                </>
              ) : (
                <div className="no-room-selected">
                  <Home size={40} />
                  <p>Select a room first to view available beds</p>
                </div>
              )}
            </div>
          </div>

          {/* Confirmation Card */}
          <div className="glass-card confirmation-card">
            <div className="panel-header">
              <div className="panel-title">
                <Sparkles size={20} />
                <h2>Allocation Summary</h2>
              </div>
            </div>

            <div className="summary-content">
              <div className="summary-item">
                <User size={18} />
                <div>
                  <span className="summary-label">Student</span>
                  <span className="summary-value">{studentName}</span>
                </div>
              </div>

              <div className="summary-item">
                <Home size={18} />
                <div>
                  <span className="summary-label">Room</span>
                  <span className="summary-value">
                    {selectedRoom ? `Room ${selectedRoom.room_no}` : 'Not selected'}
                  </span>
                </div>
              </div>

              <div className="summary-item">
                <Bed size={18} />
                <div>
                  <span className="summary-label">Bed</span>
                  <span className="summary-value" style={{
                    color: selectedBed ? '#10b981' : '#9ca3af',
                    fontWeight: selectedBed ? '700' : '600'
                  }}>
                    {selectedBed ? `Bed ${selectedBed.bed_no}` : 'Not selected'}
                  </span>
                </div>
              </div>
            </div>

            <div className="action-buttons">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => navigate("/students")}
                disabled={allocating}
              >
                <X size={18} />
                <span>Cancel</span>
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleAllocate}
                disabled={!selectedRoomId || !selectedBedId || allocating}
              >
                {allocating ? (
                  <>
                    <Loader2 size={18} className="spinning" />
                    <span>Allocating...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle size={18} />
                    <span>Confirm Allocation</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AllocateRoom;