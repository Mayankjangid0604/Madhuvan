import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Save,
  Grid3x3,
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  X,
  Loader2,
  Layers,
  Home,
  Bed,
  Sparkles,
  Info,
  Check
} from "lucide-react";
import { roomAPI } from "../../services/api/room.api";
import "./BulkAddRoom.css";

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

import ConfirmModal from "../../components/modals/ConfirmModal";


const BulkAddRoom = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [progress, setProgress] = useState({ current: 0, total: 0, status: '' });
  const [showProgress, setShowProgress] = useState(false);

  // Toast notification state
  const [toast, setToast] = useState({ show: false, type: '', message: '' });

  // ✅ FIX: Custom confirm modal state
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: null
  });

  const [bulkRooms, setBulkRooms] = useState({
    start_room: "",
    end_room: "",
    floor_no: "",
    room_type: "Double"
  });

  // ✅ FIX: Use improved floor detection
  useEffect(() => {
    const floorNo = getFloorFromRoomNo(bulkRooms.start_room);
    setBulkRooms(prev => ({ ...prev, floor_no: floorNo }));
  }, [bulkRooms.start_room]);

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

  const getBedCount = (type) => {
    const bedMap = { "Single": 1, "Double": 2, "Triple": 3, "Quad": 4 };
    return bedMap[type] || 2;
  };

  const getRoomTypeIcon = (type) => {
    const icons = { "Single": "👤", "Double": "👥", "Triple": "👨‍👩‍👦", "Quad": "👨‍👩‍👧‍👦" };
    return icons[type] || "🏠";
  };

  const validateForm = useCallback(() => {
    const newErrors = {};
    const start = parseInt(bulkRooms.start_room);
    const end = parseInt(bulkRooms.end_room);

    if (!bulkRooms.start_room) {
      newErrors.start_room = "Start room number is required";
    } else if (isNaN(start) || start <= 0) {
      newErrors.start_room = "Please enter a valid room number";
    }

    if (!bulkRooms.end_room) {
      newErrors.end_room = "End room number is required";
    } else if (isNaN(end) || end <= 0) {
      newErrors.end_room = "Please enter a valid room number";
    }

    if (start && end && start > end) {
      newErrors.end_room = "End room must be greater than or equal to start room";
    }

    if (start && end && (end - start + 1) > 50) {
      newErrors.end_room = "Cannot add more than 50 rooms at once";
    }

    if (!bulkRooms.floor_no) {
      newErrors.floor_no = "Floor number is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [bulkRooms]);

  // ✅ FIX: Actual creation logic (called after confirm)
  const executeCreateRooms = async () => {
    const start = parseInt(bulkRooms.start_room);
    const end = parseInt(bulkRooms.end_room);
    const count = end - start + 1;

    setLoading(true);
    setShowProgress(true);
    setProgress({ current: 0, total: count, status: 'Creating rooms...' });

    let successCount = 0;
    let failedRooms = [];

    try {
      for (let i = start; i <= end; i++) {
        // Use clean number string without leading zeros
        const roomNo = i.toString();
        setProgress(prev => ({
          ...prev,
          current: i - start + 1,
          status: `Creating room ${roomNo}...`
        }));

        try {
          await roomAPI.createRoom({
            room_no: roomNo,
            floor_no: bulkRooms.floor_no,
            room_type: bulkRooms.room_type
          });
          successCount++;
        } catch (err) {
          failedRooms.push(roomNo);
        }

        await new Promise(resolve => setTimeout(resolve, 100));
      }

      if (successCount === count) {
        setProgress(prev => ({ ...prev, status: 'All rooms created successfully!' }));
        showToast('success', `Successfully created ${count} rooms!`);
      } else if (successCount > 0) {
        showToast('warning', `Created ${successCount}/${count} rooms. Failed: ${failedRooms.join(', ')}`);
      } else {
        showToast('error', 'Failed to create rooms');
      }

      setTimeout(() => {
        navigate("/rooms", { state: { refresh: true, message: `Created ${successCount} rooms` } });
      }, 2000);

    } catch (error) {
      console.error("Error adding rooms:", error);
      showToast('error', error.response?.data?.message || "Failed to add rooms");
      setLoading(false);
      setShowProgress(false);
    }
  };

  // ✅ FIX: Show custom confirm modal instead of window.confirm
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;
    if (loading) return;

    const start = parseInt(bulkRooms.start_room);
    const end = parseInt(bulkRooms.end_room);
    const count = end - start + 1;

    setConfirmModal({
      isOpen: true,
      title: 'Confirm Bulk Creation',
      message: `This will create ${count} rooms (${start} to ${end}) on ${bulkRooms.floor_no === "Basement" ? "Basement" : bulkRooms.floor_no === "Ground" ? "Ground Floor" : `Floor ${bulkRooms.floor_no}`}. Continue?`,
      onConfirm: () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        executeCreateRooms();
      }
    });
  };

  const handleInputChange = (field, value) => {
    setBulkRooms(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const roomCount = bulkRooms.start_room && bulkRooms.end_room
    ? Math.max(0, parseInt(bulkRooms.end_room) - parseInt(bulkRooms.start_room) + 1)
    : 0;

  const bedCount = getBedCount(bulkRooms.room_type);
  const totalBeds = roomCount * bedCount;
  const progressPercent = showProgress ? (progress.current / progress.total) * 100 : 0;

  return (
    <div className="bulk-add-room-page">
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

      {/* ✅ FIX: Custom Confirm Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText={`Create ${roomCount} Rooms`}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        type="warning"
      />

      {/* Page Header */}
      <div className="page-header-enhanced">
        <div className="header-content">
          <div className="header-icon">
            <Layers size={28} />
          </div>
          <div className="header-text">
            <h1>Bulk Add Rooms</h1>
            <p>Create multiple rooms at once with automatic bed generation</p>
          </div>
        </div>
        <button
          className="back-button"
          onClick={() => navigate("/rooms")}
        >
          <ArrowLeft size={18} />
          <span>Back to Rooms</span>
        </button>
      </div>

      {/* Main Form Card */}
      <div className="form-card glass-card">
        <form onSubmit={handleSubmit}>
          {/* Step Header */}
          <div className="step-header">
            <div className="step-icon">
              <Grid3x3 size={24} />
            </div>
            <div className="step-info">
              <h2>Room Configuration</h2>
              <p>Define the range and type of rooms to create</p>
            </div>
            <div className="step-badge">
              <Sparkles size={14} />
              <span>Bulk Creation</span>
            </div>
          </div>

          {/* Form Grid */}
          <div className="form-grid">
            {/* Start Room */}
            <div className={`form-group ${errors.start_room ? 'has-error' : ''}`}>
              <label htmlFor="start_room">
                <Home size={16} />
                Start Room Number
                <span className="required">*</span>
              </label>
              <div className="input-wrapper">
                <input
                  id="start_room"
                  type="text"
                  value={bulkRooms.start_room}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '');
                    handleInputChange('start_room', value);
                  }}
                  className="form-input glass-input"
                  placeholder="e.g., 1001"
                  maxLength="4"
                  disabled={loading}
                />
                <div className="input-glow"></div>
              </div>
              {errors.start_room && (
                <span className="error-text">
                  <AlertCircle size={12} />
                  {errors.start_room}
                </span>
              )}
              <small className="help-text">
                <Info size={12} />
                First room in the range
              </small>
            </div>

            {/* End Room */}
            <div className={`form-group ${errors.end_room ? 'has-error' : ''}`}>
              <label htmlFor="end_room">
                <Home size={16} />
                End Room Number
                <span className="required">*</span>
              </label>
              <div className="input-wrapper">
                <input
                  id="end_room"
                  type="text"
                  value={bulkRooms.end_room}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '');
                    handleInputChange('end_room', value);
                  }}
                  className="form-input glass-input"
                  placeholder="e.g., 1010"
                  maxLength="4"
                  disabled={loading}
                />
                <div className="input-glow"></div>
              </div>
              {errors.end_room && (
                <span className="error-text">
                  <AlertCircle size={12} />
                  {errors.end_room}
                </span>
              )}
              <small className="help-text">
                <Info size={12} />
                Last room (max 50 rooms per batch)
              </small>
            </div>

            {/* Floor Number */}
            <div className={`form-group ${errors.floor_no ? 'has-error' : ''}`}>
              <label htmlFor="floor_no">
                <Layers size={16} />
                Floor
                <span className="required">*</span>
              </label>
              <div className="input-wrapper">
                <input
                  id="floor_no"
                  type="text"
                  value={bulkRooms.floor_no}
                  readOnly
                  className="form-input glass-input readonly"
                  placeholder="Auto-detected"
                />
                <div className="auto-badge">AUTO</div>
              </div>
              {errors.floor_no && (
                <span className="error-text">
                  <AlertCircle size={12} />
                  {errors.floor_no}
                </span>
              )}
              <small className="help-text">
                <Info size={12} />
                00XX=Basement, 01XX=Ground, 10XX=Floor 1...
              </small>
            </div>

            {/* Room Type */}
            <div className="form-group">
              <label htmlFor="room_type">
                <Bed size={16} />
                Room Type
                <span className="required">*</span>
              </label>
              <div className="input-wrapper">
                <select
                  id="room_type"
                  value={bulkRooms.room_type}
                  onChange={(e) => handleInputChange('room_type', e.target.value)}
                  className="form-input glass-input"
                  disabled={loading}
                >
                  <option value="Single">👤 Single (1 Bed)</option>
                  <option value="Double">👥 Double (2 Beds)</option>
                  <option value="Triple">👨‍👩‍👦 Triple (3 Beds)</option>
                  <option value="Quad">👨‍👩‍👧‍👦 Quad (4 Beds)</option>
                </select>
                <div className="input-glow"></div>
              </div>
              <small className="help-text">
                <Info size={12} />
                Beds are auto-created based on type
              </small>
            </div>
          </div>

          {/* Preview Section */}
          {roomCount > 0 && roomCount <= 50 && (
            <div className="preview-section">
              <div className="preview-header">
                <AlertTriangle size={20} />
                <h3>Creation Preview</h3>
              </div>
              <div className="preview-content">
                <div className="preview-stats">
                  <div className="preview-stat">
                    <div className="stat-icon rooms">
                      <Home size={20} />
                    </div>
                    <div className="stat-info">
                      <span className="stat-value">{roomCount}</span>
                      <span className="stat-label">Rooms</span>
                    </div>
                  </div>
                  <div className="preview-stat">
                    <div className="stat-icon beds">
                      <Bed size={20} />
                    </div>
                    <div className="stat-info">
                      <span className="stat-value">{totalBeds}</span>
                      <span className="stat-label">Total Beds</span>
                    </div>
                  </div>
                  <div className="preview-stat">
                    <div className="stat-icon type">
                      <span className="emoji">{getRoomTypeIcon(bulkRooms.room_type)}</span>
                    </div>
                    <div className="stat-info">
                      <span className="stat-value">{bedCount}</span>
                      <span className="stat-label">Beds/Room</span>
                    </div>
                  </div>
                </div>
                <div className="preview-details">
                  <p>
                    <strong>Range:</strong> Room {bulkRooms.start_room} → Room {bulkRooms.end_room}
                  </p>
                  <p>
                    <strong>Floor:</strong> {bulkRooms.floor_no === "Basement" ? "Basement" : bulkRooms.floor_no === "Ground" ? "Ground Floor" : `Floor ${bulkRooms.floor_no}`}
                  </p>
                  <p>
                    <strong>Type:</strong> {bulkRooms.room_type}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Error: Too Many Rooms */}
          {roomCount > 50 && (
            <div className="preview-section error-preview">
              <div className="preview-header">
                <AlertCircle size={20} />
                <h3>Limit Exceeded</h3>
              </div>
              <div className="preview-content">
                <p className="error-message">
                  You can only create up to <strong>50 rooms</strong> at once.
                  <br />
                  Current selection: <strong>{roomCount} rooms</strong>
                </p>
                <p className="suggestion">
                  Please reduce the range or create rooms in multiple batches.
                </p>
              </div>
            </div>
          )}

          {/* Progress Bar */}
          {showProgress && (
            <div className="progress-section">
              <div className="progress-header">
                <Loader2 size={18} className="spinning" />
                <span>{progress.status}</span>
                <span className="progress-count">{progress.current}/{progress.total}</span>
              </div>
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{ width: `${progressPercent}%` }}
                ></div>
              </div>
            </div>
          )}

          {/* Form Actions */}
          <div className="form-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => navigate("/rooms")}
              disabled={loading}
            >
              <X size={18} />
              <span>Cancel</span>
            </button>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading || roomCount === 0 || roomCount > 50}
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="spinning" />
                  <span>Creating...</span>
                </>
              ) : (
                <>
                  <Save size={18} />
                  <span>
                    Create {roomCount > 0 && roomCount <= 50
                      ? `${roomCount} Room${roomCount !== 1 ? 's' : ''}`
                      : 'Rooms'}
                  </span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Info Card */}
      <div className="info-card glass-card">
        <div className="info-header">
          <Info size={20} />
          <h3>Room Number Format</h3>
        </div>
        <ul className="info-list">
          <li>
            <CheckCircle size={14} />
            <span><strong>00XX</strong> = Basement (e.g., 0001-0010)</span>
          </li>
          <li>
            <CheckCircle size={14} />
            <span><strong>01XX</strong> = Ground Floor (e.g., 0101-0110)</span>
          </li>
          <li>
            <CheckCircle size={14} />
            <span><strong>10XX</strong> = 1st Floor (e.g., 1001-1010)</span>
          </li>
          <li>
            <CheckCircle size={14} />
            <span>Maximum 50 rooms can be created in one batch</span>
          </li>
        </ul>
      </div>
    </div>
  );
};

export default BulkAddRoom;