import React, { useState, useEffect, useRef } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  Home,
  Users,
  BedDouble,
  IndianRupee,
  BookOpen,
  FileBarChart2,
  Settings,
  ChevronLeft,
  UserCheck,
  AlertCircle,
  Menu,
  X,
  Pin,
  PinOff,
} from "lucide-react";
import "./sidebar.css";

const menuItems = [
  { label: "Dashboard", icon: Home, path: "/" },
  { label: "Students", icon: Users, path: "/students" },
  { label: "Rooms", icon: BedDouble, path: "/rooms" },
  { label: "Fees", icon: IndianRupee, path: "/fees" },
  { label: "Ledger", icon: BookOpen, path: "/ledger" },
  { label: "Members", icon: UserCheck, path: "/members" },
  { label: "Fine / Advance", icon: AlertCircle, path: "/fine" },
  { label: "Reports", icon: FileBarChart2, path: "/reports" },
  { label: "Settings", icon: Settings, path: "/settings" },
];

const EXPANDED_WIDTH = 260;
const COLLAPSED_WIDTH = 72;

const Sidebar = () => {
  const location = useLocation();
  const [isHovered, setIsHovered] = useState(false);
  const [isPinned, setIsPinned] = useState(() => {
    const saved = localStorage.getItem("sidebarPinned");
    return saved === "true";
  });
  const [mobileOpen, setMobileOpen] = useState(false);
  const sidebarRef = useRef(null);
  const hoverTimeoutRef = useRef(null);

  // Determine if sidebar is expanded
  const isExpanded = isHovered || isPinned;

  // Update body classes when expanded state changes
  useEffect(() => {
    if (isExpanded) {
      document.body.classList.add("sidebar-expanded");
      document.body.classList.remove("sidebar-collapsed");
    } else {
      document.body.classList.add("sidebar-collapsed");
      document.body.classList.remove("sidebar-expanded");
    }

    // Update CSS variable
    document.documentElement.style.setProperty(
      "--sidebar-width",
      `${isExpanded ? EXPANDED_WIDTH : COLLAPSED_WIDTH}px`
    );

    return () => {
      document.body.classList.remove("sidebar-expanded", "sidebar-collapsed");
    };
  }, [isExpanded]);

  // Auto-close on route change (mobile)
  useEffect(() => {
    if (window.innerWidth < 768) {
      setMobileOpen(false);
    }
  }, [location]);

  // Handle click outside on mobile
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (sidebarRef.current && !sidebarRef.current.contains(e.target)) {
        if (window.innerWidth < 768) {
          setMobileOpen(false);
        }
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  // Handle mouse enter - expand after small delay
  const handleMouseEnter = () => {
    if (window.innerWidth < 768) return;
    if (isPinned) return;

    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }

    hoverTimeoutRef.current = setTimeout(() => {
      setIsHovered(true);
    }, 100);
  };

  // Handle mouse leave - collapse
  const handleMouseLeave = () => {
    if (window.innerWidth < 768) return;
    if (isPinned) return;

    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }

    setIsHovered(false);
  };

  // Toggle pin state
  const togglePin = (e) => {
    e.stopPropagation();
    const newPinned = !isPinned;
    setIsPinned(newPinned);
    localStorage.setItem("sidebarPinned", String(newPinned));
    
    if (!newPinned) {
      setIsHovered(false);
    }
  };

  // Toggle mobile menu
  const toggleMobileMenu = () => {
    setMobileOpen(!mobileOpen);
  };

  const sidebarClasses = [
    "sidebar",
    isExpanded ? "expanded" : "collapsed",
    mobileOpen ? "mobile-open" : "",
    isPinned ? "pinned" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <>
      {/* Mobile Toggle Button */}
      <button
        className="mobile-menu-btn"
        onClick={toggleMobileMenu}
        aria-label="Toggle Menu"
      >
        {mobileOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Mobile Overlay */}
      {mobileOpen && (
        <div 
          className="sidebar-overlay" 
          onClick={() => setMobileOpen(false)} 
        />
      )}

      {/* Sidebar */}
      <aside
        ref={sidebarRef}
        className={sidebarClasses}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {/* LOGO */}
        <div className="sidebar-logo">
          <div className="logo-icon">
            <span>🏠</span>
          </div>
          <div className="logo-content">
            <span className="logo-text">HOSTEL</span>
            <span className="logo-subtext">Management</span>
          </div>
        </div>

        {/* MENU */}
        <nav className="sidebar-menu">
          <div className="menu-section">
            <span className="menu-section-label">Main Menu</span>
          </div>
          {menuItems.map((item, index) => {
            const Icon = item.icon;
            const isActive =
              location.pathname === item.path ||
              (item.path !== "/" && location.pathname.startsWith(item.path));

            return (
              <NavLink
                key={item.label}
                to={item.path}
                end={item.path === "/"}
                className={`menu-item ${isActive ? "active" : ""}`}
                title={!isExpanded ? item.label : ""}
                style={{ animationDelay: `${index * 0.03}s` }}
              >
                <div className="menu-item-icon">
                  <Icon size={18} strokeWidth={2} />
                </div>
                <span className="menu-item-label">{item.label}</span>
                {isActive && <div className="active-indicator" />}
              </NavLink>
            );
          })}
        </nav>

        {/* FOOTER - Pin Toggle */}
        <div className="sidebar-footer">
          <div
            className={`sidebar-toggle ${isPinned ? "pinned" : ""}`}
            onClick={togglePin}
            title={isPinned ? "Unpin sidebar" : "Pin sidebar open"}
          >
            <div className="toggle-icon-wrapper">
              {isPinned ? (
                <PinOff size={18} />
              ) : (
                <Pin size={18} />
              )}
            </div>
            <span className="toggle-label">
              {isPinned ? "Unpin Menu" : "Pin Menu"}
            </span>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;