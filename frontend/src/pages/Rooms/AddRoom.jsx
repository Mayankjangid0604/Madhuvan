// AddRoom.jsx
import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { 
  ArrowLeft, 
  Save, 
  AlertCircle,
  CheckCircle,
  X,
  Loader2,
  Layers,
  Home,
  Bed,
  Sparkles,
  Info,
  Plus,
  Hash
} from "lucide-react";
import { roomAPI } from "../../services/api/room.api";
import "./AddRoom.css";

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

const AddRoom = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  
  // Toast notification state
  const [toast, setToast] = useState({ show: false, type: '', message: '' });

  // Form state
  const [roomData, setRoomData] = useState({
    room_no: "",
    floor_no: "",
    room_type: "Double"
  });

  // ✅ FIX: Use improved floor detection
  useEffect(() => {
    const floorNo = getFloorFromRoomNo(roomData.room_no);
    setRoomData(prev => ({ ...prev, floor_no: floorNo }));
  }, [roomData.room_no]);

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
    const bedMap = {
      "Single": 1,
      "Double": 2,
      "Triple": 3,
      "Quad": 4
    };
    return bedMap[type] || 2;
  };

  const getRoomTypeIcon = (type) => {
    const icons = {
      "Single": "👤",
      "Double": "👥",
      "Triple": "👨‍👩‍👦",
      "Quad": "👨‍👩‍👧‍👦"
    };
    return icons[type] || "🏠";
  };

  const getRoomTypeColor = (type) => {
    const colors = {
      "Single": "#10b981",
      "Double": "#3b82f6",
      "Triple": "#8b5cf6",
      "Quad": "#f59e0b"
    };
    return colors[type] || "#6b7280";
  };

  const validateForm = useCallback(() => {
    const newErrors = {};
    const roomNo = parseInt(roomData.room_no);

    if (!roomData.room_no) {
      newErrors.room_no = "Room number is required";
    } else if (isNaN(roomNo) || roomNo <= 0) {
      newErrors.room_no = "Please enter a valid room number";
    } else if (roomData.room_no.length > 4) {
      newErrors.room_no = "Room number cannot exceed 4 digits";
    }

    if (!roomData.floor_no) {
      newErrors.floor_no = "Floor number is required";
    }

    if (!roomData.room_type) {
      newErrors.room_type = "Room type is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [roomData]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;
    if (loading) return;

    setLoading(true);

    try {
      await roomAPI.createRoom({
        room_no: roomData.room_no,
        floor_no: roomData.floor_no,
        room_type: roomData.room_type
      });

      showToast('success', `Room ${roomData.room_no} created successfully!`);
      
      // Reset form state after save
      setRoomData({
        room_no: "",
        floor_no: "",
        room_type: "Double"
      });
      setErrors({});
      setLoading(false);
      setTimeout(() => {
        navigate("/rooms", { 
          state: { 
            refresh: true, 
            message: `Room ${roomData.room_no} created successfully` 
          } 
        });
      }, 1500);

    } catch (error) {
      console.error("Error adding room:", error);
      const errorMessage = error.response?.data?.message || "Failed to add room";
      showToast('error', errorMessage);
      setLoading(false);
    }
  };

  const handleAddAnother = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;
    if (loading) return;

    setLoading(true);

    try {
      await roomAPI.createRoom({
        room_no: roomData.room_no,
        floor_no: roomData.floor_no,
        room_type: roomData.room_type
      });

      showToast('success', `Room ${roomData.room_no} created! Add another room.`);
      
      setRoomData({
        room_no: "",
        floor_no: "",
        room_type: roomData.room_type
      });
      setErrors({});
      setLoading(false);

    } catch (error) {
      console.error("Error adding room:", error);
      const errorMessage = error.response?.data?.message || "Failed to add room";
      showToast('error', errorMessage);
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setRoomData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleReset = () => {
    setRoomData({
      room_no: "",
      floor_no: "",
      room_type: "Double"
    });
    setErrors({});
  };

  const bedCount = getBedCount(roomData.room_type);
  const isFormValid = roomData.room_no && roomData.floor_no && roomData.room_type;

  return (
    <div className="single-add-room-page">
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

      {/* Page Header */}
      <div className="page-header-enhanced">
        <div className="header-content">
          <div className="header-icon">
            <Plus size={28} />
          </div>
          <div className="header-text">
            <h1>Add New Room</h1>
            <p>Create a single room with automatic bed generation</p>
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

      <div className="form-layout">
        {/* Main Form Card */}
        <div className="form-card glass-card">
          <form onSubmit={handleSubmit}>
            {/* Step Header */}
            <div className="step-header">
              <div className="step-icon">
                <Home size={24} />
              </div>
              <div className="step-info">
                <h2>Room Details</h2>
                <p>Enter the room information below</p>
              </div>
              <div className="step-badge">
                <Sparkles size={14} />
                <span>New Room</span>
              </div>
            </div>

            {/* Form Grid */}
            <div className="form-grid">
              {/* Room Number */}
              <div className={`form-group ${errors.room_no ? 'has-error' : ''}`}>
                <label htmlFor="room_no">
                  <Hash size={16} />
                  Room Number
                  <span className="required">*</span>
                </label>
                <div className="input-wrapper">
                  <input
                    id="room_no"
                    type="text"
                    value={roomData.room_no}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '');
                      handleInputChange('room_no', value);
                    }}
                    className="form-input glass-input"
                    placeholder="e.g., 101 or 1001"
                    maxLength="4"
                    disabled={loading}
                    autoFocus
                  />
                  <div className="input-glow"></div>
                </div>
                {errors.room_no && (
                  <span className="error-text">
                    <AlertCircle size={12} />
                    {errors.room_no}
                  </span>
                )}
                <small className="help-text">
                  <Info size={12} />
                  Format: 3-digit (101) or 4-digit (1001). First digits = floor.
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
                    value={roomData.floor_no}
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
                  00XX=Basement, 01XX=Ground, 10XX=Floor 1, 20XX=Floor 2...
                </small>
              </div>

              {/* Room Type - Full Width */}
              <div className={`form-group full-width ${errors.room_type ? 'has-error' : ''}`}>
                <label>
                  <Bed size={16} />
                  Room Type
                  <span className="required">*</span>
                </label>
                <div className="room-type-grid">
                  {["Single", "Double", "Triple", "Quad"].map((type) => (
                    <div
                      key={type}
                      className={`room-type-card ${roomData.room_type === type ? 'selected' : ''}`}
                      onClick={() => !loading && handleInputChange('room_type', type)}
                      style={{
                        '--type-color': getRoomTypeColor(type)
                      }}
                    >
                      <div className="type-icon">
                        {getRoomTypeIcon(type)}
                      </div>
                      <div className="type-info">
                        <span className="type-name">{type}</span>
                        <span className="type-beds">
                          {getBedCount(type)} Bed{getBedCount(type) > 1 ? 's' : ''}
                        </span>
                      </div>
                      {roomData.room_type === type && (
                        <div className="selected-indicator">
                          <CheckCircle size={16} />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                {errors.room_type && (
                  <span className="error-text">
                    <AlertCircle size={12} />
                    {errors.room_type}
                  </span>
                )}
              </div>
            </div>

            {/* Preview Section */}
            {isFormValid && (
              <div className="preview-section success-preview">
                <div className="preview-header">
                  <CheckCircle size={20} />
                  <h3>Room Preview</h3>
                </div>
                <div className="preview-content">
                  <div className="room-preview-card">
                    <div 
                      className="preview-room-icon" 
                      style={{ background: getRoomTypeColor(roomData.room_type) }}
                    >
                      <Home size={32} />
                    </div>
                    <div className="preview-room-details">
                      <div className="preview-room-number">
                        Room {roomData.room_no}
                      </div>
                      <div className="preview-room-meta">
                        <span className="meta-item">
                          <Layers size={14} />
                          {roomData.floor_no === "Basement" ? "Basement" : 
                           roomData.floor_no === "Ground" ? "Ground Floor" : 
                           `Floor ${roomData.floor_no}`}
                        </span>
                        <span className="meta-item">
                          <Bed size={14} />
                          {bedCount} Bed{bedCount > 1 ? 's' : ''}
                        </span>
                        <span 
                          className="meta-item type-badge" 
                          style={{ background: getRoomTypeColor(roomData.room_type) }}
                        >
                          {getRoomTypeIcon(roomData.room_type)} {roomData.room_type}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="preview-note">
                    <Info size={14} />
                    <span>
                      {bedCount} bed{bedCount > 1 ? 's' : ''} will be automatically created for this room
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Form Actions */}
            <div className="form-actions">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={handleReset}
                disabled={loading}
              >
                <X size={18} />
                <span>Reset</span>
              </button>

              <div className="action-group">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleAddAnother}
                  disabled={loading || !isFormValid}
                >
                  {loading ? (
                    <>
                      <Loader2 size={18} className="spinning" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Plus size={18} />
                      <span>Save & Add Another</span>
                    </>
                  )}
                </button>

                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={loading || !isFormValid}
                >
                  {loading ? (
                    <>
                      <Loader2 size={18} className="spinning" />
                      <span>Creating...</span>
                    </>
                  ) : (
                    <>
                      <Save size={18} />
                      <span>Create Room</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* Side Panel */}
        <div className="side-panel">
          {/* Info Card */}
          <div className="info-card glass-card">
            <div className="info-header">
              <Info size={20} />
              <h3>Room Number Format</h3>
            </div>
            <ul className="info-list">
              <li>
                <CheckCircle size={14} />
                <span><strong>00XX</strong> = Basement (e.g., 0001, 0002)</span>
              </li>
              <li>
                <CheckCircle size={14} />
                <span><strong>01XX</strong> = Ground Floor (e.g., 0101, 0102)</span>
              </li>
              <li>
                <CheckCircle size={14} />
                <span><strong>10XX</strong> = 1st Floor (e.g., 1001, 1002)</span>
              </li>
              <li>
                <CheckCircle size={14} />
                <span><strong>20XX</strong> = 2nd Floor (e.g., 2001, 2002)</span>
              </li>
              <li>
                <CheckCircle size={14} />
                <span>Or use 3-digit: <strong>1XX</strong> = 1st Floor</span>
              </li>
            </ul>
          </div>

          {/* Room Types Legend */}
          <div className="legend-card glass-card">
            <div className="info-header">
              <Bed size={20} />
              <h3>Room Types</h3>
            </div>
            <div className="legend-list">
              {["Single", "Double", "Triple", "Quad"].map((type) => (
                <div key={type} className="legend-item">
                  <span 
                    className="legend-color" 
                    style={{ background: getRoomTypeColor(type) }}
                  ></span>
                  <span className="legend-icon">{getRoomTypeIcon(type)}</span>
                  <span className="legend-name">{type}</span>
                  <span className="legend-beds">
                    {getBedCount(type)} bed{getBedCount(type) > 1 ? 's' : ''}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Bulk Add Shortcut */}
          <div className="shortcut-card glass-card">
            <div className="shortcut-content">
              <Layers size={24} />
              <div className="shortcut-text">
                <h4>Need to add multiple rooms?</h4>
                <p>Use bulk add to create many rooms at once</p>
              </div>
            </div>
            <button 
              className="btn btn-outline"
              onClick={() => navigate("/rooms/bulk-add")}
            >
              <Plus size={16} />
              <span>Bulk Add Rooms</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddRoom;