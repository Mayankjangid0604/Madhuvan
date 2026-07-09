import React from "react";
import { 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Info,
  XCircle,
  Minus,
  Zap,
  TrendingUp,
  TrendingDown
} from "lucide-react";
import "./statusBadge.css";

const StatusBadge = ({ 
  label, 
  type = "INFO", 
  size = "md",
  showIcon = true,
  showDot = false,
  variant = "soft",
  animated = false,
  clickable = false,
  onClick
}) => {
  const statusConfig = {
    PAID: {
      color: "#10b981",
      bgColor: "rgba(16, 185, 129, 0.15)",
      icon: CheckCircle2,
      label: label || "Paid"
    },
    UPCOMING: {
      color: "#6366f1",
      bgColor: "rgba(99, 102, 241, 0.15)",
      icon: Clock,
      label: label || "Upcoming"
    },
    DUE: {
      color: "#f59e0b",
      bgColor: "rgba(245, 158, 11, 0.15)",
      icon: Clock,
      label: label || "Due"
    },
    OVERDUE: {
      color: "#ef4444",
      bgColor: "rgba(239, 68, 68, 0.15)",
      icon: AlertCircle,
      label: label || "Overdue"
    },
    ACTIVE: {
      color: "#10b981",
      bgColor: "rgba(16, 185, 129, 0.15)",
      icon: CheckCircle2,
      label: label || "Active"
    },
    INACTIVE: {
      color: "#6b7280",
      bgColor: "rgba(107, 114, 128, 0.15)",
      icon: XCircle,
      label: label || "Inactive"
    },
    PENDING: {
      color: "#f59e0b",
      bgColor: "rgba(245, 158, 11, 0.15)",
      icon: Clock,
      label: label || "Pending"
    },
    AUTO: {
      color: "#8b5cf6",
      bgColor: "rgba(139, 92, 246, 0.15)",
      icon: Zap,
      label: label || "Auto"
    },
    MANUAL: {
      color: "#2563eb",
      bgColor: "rgba(37, 99, 235, 0.15)",
      icon: Minus,
      label: label || "Manual"
    },
    SUCCESS: {
      color: "#10b981",
      bgColor: "rgba(16, 185, 129, 0.15)",
      icon: CheckCircle2,
      label: label || "Success"
    },
    ERROR: {
      color: "#ef4444",
      bgColor: "rgba(239, 68, 68, 0.15)",
      icon: XCircle,
      label: label || "Error"
    },
    WARNING: {
      color: "#f59e0b",
      bgColor: "rgba(245, 158, 11, 0.15)",
      icon: AlertCircle,
      label: label || "Warning"
    },
    INFO: {
      color: "#3b82f6",
      bgColor: "rgba(59, 130, 246, 0.15)",
      icon: Info,
      label: label || "Info"
    },
    PARTIAL: {
      color: "#f59e0b",
      bgColor: "rgba(245, 158, 11, 0.15)",
      icon: TrendingUp,
      label: label || "Partial"
    },
    NEW: {
      color: "#8b5cf6",
      bgColor: "rgba(139, 92, 246, 0.15)",
      icon: Zap,
      label: label || "New"
    },
    HIGH: {
      color: "#ef4444",
      bgColor: "rgba(239, 68, 68, 0.15)",
      icon: TrendingUp,
      label: label || "High"
    },
    LOW: {
      color: "#10b981",
      bgColor: "rgba(16, 185, 129, 0.15)",
      icon: TrendingDown,
      label: label || "Low"
    }
  };

  const config = statusConfig[type] || statusConfig.INFO;
  const Icon = config.icon;

  const getStyles = () => {
    switch (variant) {
      case "solid":
        return {
          backgroundColor: config.color,
          color: "#ffffff",
          borderColor: "transparent"
        };
      case "outline":
        return {
          backgroundColor: "transparent",
          color: config.color,
          borderColor: config.color
        };
      case "glass":
        return {
          backgroundColor: config.bgColor,
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
          color: config.color,
          borderColor: `${config.color}30`
        };
      case "soft":
      default:
        return {
          backgroundColor: config.bgColor,
          color: config.color,
          borderColor: "transparent"
        };
    }
  };

  const iconSize = size === "sm" ? 12 : size === "lg" ? 16 : 14;

  return (
    <span 
      className={`
        status-badge 
        status-badge--${size} 
        status-badge--${variant}
        ${animated ? 'status-badge--animated' : ''}
        ${clickable ? 'status-badge--clickable' : ''}
      `}
      style={getStyles()}
      onClick={clickable ? onClick : undefined}
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
    >
      {showDot && (
        <span 
          className={`status-badge__dot ${animated ? 'status-badge__dot--pulse' : ''}`}
          style={{ backgroundColor: variant === "solid" ? "#ffffff" : config.color }}
        />
      )}
      {showIcon && !showDot && (
        <Icon 
          className="status-badge__icon" 
          size={iconSize}
          strokeWidth={2.5}
        />
      )}
      <span className="status-badge__label">{config.label}</span>
    </span>
  );
};

export default StatusBadge;