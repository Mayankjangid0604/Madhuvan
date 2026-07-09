import React, { useState, useEffect } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "../Sidebar/Sidebar";
import Topbar from "../Topbar/Topbar";
import "./mainLayout.css";

const MainLayout = () => {
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  // Listen for sidebar state changes
  useEffect(() => {
    const handleSidebarChange = () => {
      const isExpanded = document.body.classList.contains("sidebar-expanded");
      setSidebarExpanded(isExpanded);
    };

    // Create observer to watch body class changes
    const observer = new MutationObserver(handleSidebarChange);
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ["class"],
    });

    // Handle resize
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener("resize", handleResize);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  // Calculate margin based on sidebar state
  const sidebarWidth = sidebarExpanded ? 260 : 72;

  return (
    <div className="layout-root">
      {/* REMOVED: Video Background */}
      
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div
        className={`layout-main ${sidebarExpanded ? "sidebar-open" : "sidebar-closed"}`}
        style={{
          marginLeft: isMobile ? 0 : sidebarWidth,
          width: isMobile ? "100%" : `calc(100% - ${sidebarWidth}px)`,
        }}
      >
        <Topbar />
        <main className="layout-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default MainLayout;