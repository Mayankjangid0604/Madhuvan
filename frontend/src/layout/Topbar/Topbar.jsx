import React, { useState, useRef, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Bell,
  LogOut,
  Search,
  Users,
  BedDouble,
  IndianRupee,
  Home,
  CheckCircle,
} from "lucide-react";
import { notificationAPI } from "../../services/api/notification.api";
// ✅ FIX: Import useAuth hook
import { useAuth } from "../../contexts/AuthContext";
import "./topbar.css";

const Topbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  // ✅ FIX: Use AuthContext
  const { logout } = useAuth();
  
  const [showNotifications, setShowNotifications] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const notifRef = useRef(null);
  const searchRef = useRef(null);

  const getPageTitle = () => {
    const path = location.pathname;
    const routes = {
      "/": "Dashboard",
      "/students": "Students",
      "/students/add": "Add Student",
      "/rooms": "Rooms",
      "/fees": "Receive Fee",
      "/ledger": "Ledger",
      "/members": "Members",
      "/fine": "Fine / Advance",
      "/reports": "Reports",
      "/settings": "Settings"
    };
    
    if (path.startsWith("/students/")) return "Student Details";
    if (path.startsWith("/fees/")) return "Fee Details";
    
    return routes[path] || "Dashboard";
  };

  // Fetch notifications
  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchNotifications = async () => {
    try {
      setLoadingNotifications(true);
      const [summaryRes, overdueRes, admissionsRes] = await Promise.all([
        notificationAPI.getNotifications().catch(() => ({ data: { data: {} } })),
        notificationAPI.getOverdueAlerts().catch(() => ({ data: { data: [] } })),
        notificationAPI.getRecentAdmissions(3).catch(() => ({ data: { data: [] } }))
      ]);

      const summary = summaryRes.data.data || {};
      const admissions = admissionsRes.data.data || [];
      const builtNotifications = [];

      if (summary.overdue_count > 0) {
        builtNotifications.push({
          id: 1,
          title: `${summary.overdue_count} Overdue Fees`,
          message: `${summary.overdue_count} students have overdue fees`,
          time: "just now",
          unread: true,
          type: "alert"
        });
      }

      if (summary.total_rooms && summary.occupied_beds !== undefined) {
        const totalBeds = summary.total_rooms * 2;
        const occupancyPercent = Math.round((summary.occupied_beds / totalBeds) * 100);
        if (occupancyPercent < 50) {
          builtNotifications.push({
            id: 2,
            title: "Low Room Occupancy",
            message: `Only ${occupancyPercent}% of beds are occupied`,
            time: "just now",
            unread: true,
            type: "warning"
          });
        }
      }

      admissions.forEach((admission, index) => {
        builtNotifications.push({
          id: 10 + index,
          title: "New Student Added",
          message: `${admission.student_name} has been registered`,
          time: "recent",
          unread: false,
          type: "info"
        });
      });

      if (summary.total_collection !== undefined && summary.total_collection > 0) {
        builtNotifications.push({
          id: 20,
          title: "Fee Collection",
          message: `₹${(summary.total_collection || 0).toLocaleString("en-IN")} collected`,
          time: "today",
          unread: false,
          type: "payment"
        });
      }

      if (builtNotifications.length === 0) {
        builtNotifications.push({
          id: 999,
          title: "All Clear",
          message: "No pending alerts or notifications",
          time: "now",
          unread: false,
          type: "success"
        });
      }

      setNotifications(builtNotifications);
    } catch (error) {
      console.error("Error fetching notifications:", error);
    } finally {
      setLoadingNotifications(false);
    }
  };

  // Click outside handlers
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowSearchResults(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    setShowNotifications(false);
    setShowSearchResults(false);
    setSearchQuery("");
  }, [location]);

  useEffect(() => {
    if (searchQuery.trim().length > 1) {
      const debounce = setTimeout(() => {
        performSearch(searchQuery);
      }, 300);
      return () => clearTimeout(debounce);
    } else {
      setSearchResults([]);
      setShowSearchResults(false);
    }
  }, [searchQuery]);

  const performSearch = async (query) => {
    try {
      const { studentAPI } = await import("../../services/api/student.api");
      const { feeAPI } = await import("../../services/api/fee.api");
      const { roomAPI } = await import("../../services/api/room.api");

      const [studentsRes, feesRes, roomsRes] = await Promise.all([
        studentAPI.getStudents().catch(() => ({ data: { data: [] }})),
        feeAPI.getAllFees().catch(() => ({ data: { data: [] }})),
        roomAPI.getAllRooms().catch(() => ({ data: { data: [] }}))
      ]);

      const students = studentsRes.data.data || [];
      const fees = feesRes.data.data || [];
      const rooms = roomsRes.data.data || [];

      const queryLower = query.toLowerCase();
      
      const studentResults = students
        .filter(s => s.student_name?.toLowerCase().includes(queryLower))
        .slice(0, 3)
        .map(s => ({ ...s, type: "STUDENT" }));
      
      const feeResults = fees
        .filter(f => f.student_name?.toLowerCase().includes(queryLower))
        .slice(0, 3)
        .map(f => ({ ...f, type: "FEE" }));
      
      const roomResults = rooms
        .filter(r => r.room_no?.toString().includes(query))
        .slice(0, 2)
        .map(r => ({ ...r, type: "ROOM" }));

      setSearchResults([...studentResults, ...feeResults, ...roomResults]);
      setShowSearchResults(true);
    } catch (error) {
      console.error("Search error:", error);
    }
  };

  // ✅ FIX: Use logout from AuthContext
  const handleLogout = () => {
    logout();
  };

  const unreadCount = notifications.filter(n => n.unread).length;

  const handleMarkAllRead = () => {
    setNotifications(notifications.map(n => ({ ...n, unread: false })));
  };

  const handleNotificationClick = (notif) => {
    setNotifications(prev => 
      prev.map(n => n.id === notif.id ? { ...n, unread: false } : n)
    );
    
    if (notif.type === "alert") {
      navigate("/fees");
    } else if (notif.type === "info") {
      navigate("/students");
    } else if (notif.type === "payment") {
      navigate("/ledger");
    }
    setShowNotifications(false);
  };

  const handleSearchResultClick = (result) => {
    if (result.type === "STUDENT") {
      navigate(`/students?search=${encodeURIComponent(result.student_name)}`);
    } else if (result.type === "ROOM") {
      navigate("/rooms");
    } else if (result.type === "FEE") {
      navigate(`/fees?search=${encodeURIComponent(result.student_name)}`);
    }
    setSearchQuery("");
    setShowSearchResults(false);
  };

  const getNotifIcon = (type) => {
    switch (type) {
      case "alert": return <Bell size={18} color="#ef4444" />;
      case "warning": return <Bell size={18} color="#f59e0b" />;
      case "info": return <Users size={18} color="#3b82f6" />;
      case "payment": return <IndianRupee size={18} color="#10b981" />;
      case "success": return <CheckCircle size={18} color="#10b981" />;
      default: return <Bell size={18} color="#64748b" />;
    }
  };

  return (
    <header className="topbar">
      <div className="topbar-left">
        <button 
          className="home-btn" 
          onClick={() => navigate('/')}
          title="Dashboard"
        >
          <Home size={20} />
        </button>
        <h2 className="page-title">{getPageTitle()}</h2>
      </div>

      <div className="topbar-right">
        {/* Search */}
        <div className="search-container" ref={searchRef}>
          <div className="search-input">
            <Search size={18} />
            <input
              type="text"
              placeholder="Search students, rooms..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {showSearchResults && searchResults.length > 0 && (
            <div className="search-results-dropdown">
              {searchResults.map((result, index) => (
                <div
                  key={`${result.type}-${index}`}
                  className="search-result-item"
                  onClick={() => handleSearchResultClick(result)}
                >
                  {result.type === "STUDENT" && (
                    <>
                      <Users size={16} />
                      <div className="result-info">
                        <span className="result-name">{result.student_name}</span>
                        <span className="result-detail">
                          Student • Room {result.room_no || 'N/A'}
                        </span>
                      </div>
                    </>
                  )}
                  {result.type === "FEE" && (
                    <>
                      <IndianRupee size={16} />
                      <div className="result-info">
                        <span className="result-name">{result.student_name}</span>
                        <span className="result-detail">
                          Fee • ₹{result.fee_amount?.toLocaleString('en-IN')}
                        </span>
                      </div>
                    </>
                  )}
                  {result.type === "ROOM" && (
                    <>
                      <BedDouble size={16} />
                      <div className="result-info">
                        <span className="result-name">Room {result.room_no}</span>
                        <span className="result-detail">
                          {result.room_type} • {result.available_beds} beds available
                        </span>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}

          {showSearchResults && searchQuery.length > 1 && searchResults.length === 0 && (
            <div className="search-results-dropdown">
              <div className="notification-item empty">
                <Search size={32} color="#d1d5db" />
                <p>No results found</p>
              </div>
            </div>
          )}
        </div>

        {/* Notifications */}
        <div className="icon-btn-wrapper" ref={notifRef}>
          <button
            className="icon-btn"
            onClick={() => setShowNotifications(!showNotifications)}
            title="Notifications"
          >
            <Bell size={20} />
            {unreadCount > 0 && <span className="badge">{unreadCount}</span>}
          </button>

          {showNotifications && (
            <div className="dropdown notifications-dropdown">
              <div className="dropdown-header">
                <h4>Notifications</h4>
                {unreadCount > 0 && (
                  <button className="mark-read-btn" onClick={handleMarkAllRead}>
                    Mark all read
                  </button>
                )}
              </div>
              <div className="dropdown-content">
                {loadingNotifications ? (
                  <div className="topbar-loading">Loading...</div>
                ) : notifications.length === 0 ? (
                  <div className="notification-item empty">
                    <Bell size={48} color="#d1d5db" />
                    <p>No notifications</p>
                  </div>
                ) : (
                  notifications.map((notif) => (
                    <div
                      key={notif.id}
                      className={`notification-item ${notif.unread ? 'unread' : ''}`}
                      onClick={() => handleNotificationClick(notif)}
                    >
                      <div className="notif-icon">
                        {getNotifIcon(notif.type)}
                      </div>
                      <div className="notif-content">
                        <h5>{notif.title}</h5>
                        <p>{notif.message}</p>
                        <span className="notif-time">{notif.time}</span>
                      </div>
                      {notif.unread && <span className="unread-dot"></span>}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Logout Button */}
        <button
          className="icon-btn logout-btn"
          onClick={handleLogout}
          title="Logout"
        >
          <LogOut size={20} />
        </button>
      </div>
    </header>
  );
};

export default Topbar;