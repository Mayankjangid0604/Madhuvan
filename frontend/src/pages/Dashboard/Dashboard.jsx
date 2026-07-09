import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { dashboardAPI } from "../../services/api/dashboard.api";
import {
  Plus,
  TrendingUp,
  TrendingDown,
  Users,
  Home,
  DollarSign,
  AlertTriangle,
  UserPlus,
  LogOut,
  ArrowRight,
  Phone,
  RefreshCw,
  BedDouble,
  Calendar,
  Clock,
} from "lucide-react";
import StatusBadge from "../../components/badges/StatusBadge";
import "./dashboard.css";

// ============================================
// CONSTANTS
// ============================================
const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

const INITIAL_STATS = {
  total_students: 0,
  active_students: 0,
  total_rooms: 0,
  occupied_beds: 0,
  total_due: 0,
  overdue_count: 0,
};

// ============================================
// HELPER FUNCTIONS
// ============================================
const formatCurrency = (amount) => {
  return `₹${(amount || 0).toLocaleString("en-IN")}`;
};

const formatCompactCurrency = (amount) => {
  if (amount >= 100000) {
    return `₹${(amount / 100000).toFixed(1)}L`;
  }
  if (amount >= 1000) {
    return `₹${(amount / 1000).toFixed(0)}K`;
  }
  return `₹${amount}`;
};

const formatDate = (dateString, format = "short") => {
  if (!dateString) return "N/A";
  
  const date = new Date(dateString);
  
  // ✅ Add this line to prevent Invalid Date errors
  if (isNaN(date.getTime())) return "N/A";
  
  if (format === "short") {
    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
    });
  }
  
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const calculateDaysDuration = (startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const days = Math.floor((end - start) / (1000 * 60 * 60 * 24));
  
  if (days <= 0) return "Same day";
  if (days === 1) return "1 day";
  if (days < 30) return `${days} days`;
  if (days < 365) return `${Math.floor(days / 30)} months`;
  return `${Math.floor(days / 365)}+ years`;
};

// ============================================
// SUB-COMPONENTS
// ============================================

// Loading State Component
const LoadingState = () => (
  <div className="dashboard">
    <div className="loading-state">
      <div className="loading-spinner" />
      <p>Loading dashboard...</p>
    </div>
  </div>
);

// Error State Component
const ErrorState = ({ error, onRetry }) => (
  <div className="dashboard">
    <div className="error-state">
      <AlertTriangle size={48} strokeWidth={1.5} />
      <h3>Something went wrong</h3>
      <p>{error}</p>
      <button className="action-btn primary" onClick={onRetry}>
        <RefreshCw size={18} />
        Try Again
      </button>
    </div>
  </div>
);

// Stat Card Component
const StatCard = ({ title, value, subtitle, color, bgColor, icon: Icon, trend }) => (
  <div className="stat-card">
    <div className="stat-header">
      <div
        className="stat-icon"
        style={{ background: bgColor, color: color }}
      >
        <Icon size={24} strokeWidth={1.8} />
      </div>
      {trend && (
        <div className={`stat-trend ${trend.direction}`}>
          {trend.direction === "up" ? (
            <TrendingUp size={14} />
          ) : (
            <TrendingDown size={14} />
          )}
          <span>{trend.value}</span>
        </div>
      )}
    </div>
    <h2 className="stat-value" style={{ color }}>
      {value}
    </h2>
    <p className="stat-title">{title}</p>
    {subtitle && <p className="stat-subtitle">{subtitle}</p>}
  </div>
);

// Bar Chart Component
const BarChart = ({ data, months }) => {
  const maxValue = Math.max(...data, 1);
  const hasData = data.some((amount) => amount > 0);

  return (
    <div className="bar-chart">
      {months.map((month, index) => {
        const amount = data[index] || 0;
        const heightPercent = hasData ? (amount / maxValue) * 100 : 5;
        const hasValue = amount > 0;

        return (
          <div key={month} className="bar-wrapper">
            <div
              className="bar"
              style={{
                height: `${Math.max(heightPercent, 5)}%`,
                background: hasValue
                  ? "linear-gradient(180deg, #2563eb 0%, #1d4ed8 100%)"
                  : "rgba(229, 231, 235, 0.6)",
              }}
              title={formatCurrency(amount)}
            >
              {hasValue && (
                <span className="bar-amount">
                  {formatCompactCurrency(amount)}
                </span>
              )}
            </div>
            <span className="bar-label">{month}</span>
          </div>
        );
      })}
    </div>
  );
};

// Occupancy Progress Component
const OccupancyProgress = ({ room, index }) => {
  const occupancyPercent =
    room.total_beds > 0
      ? (room.occupied_beds / room.total_beds) * 100
      : 0;

  const getProgressColor = (percent) => {
    if (percent > 80) return "linear-gradient(90deg, #ef4444, #dc2626)";
    if (percent > 50) return "linear-gradient(90deg, #f59e0b, #d97706)";
    return "linear-gradient(90deg, #10b981, #059669)";
  };

  return (
    <div key={index} className="occupancy-item">
      <div className="occupancy-header">
        <span className="occupancy-type">{room.room_type}</span>
        <span className="occupancy-count">
          {room.occupied_beds}/{room.total_beds}
        </span>
      </div>
      <div className="progress-bar">
        <div
          className="progress-fill"
          style={{
            width: `${occupancyPercent}%`,
            background: getProgressColor(occupancyPercent),
          }}
        />
      </div>
      <span className="occupancy-percent">
        {Math.round(occupancyPercent)}% occupied
      </span>
    </div>
  );
};

// Alert Item Component
const AlertItem = ({ alert }) => (
  <div className="alert-item">
    <div className="alert-info">
      <div className="alert-name">{alert.student_name}</div>
      <div className="alert-details">
        <Phone size={14} />
        <span>{alert.father_mobile || "No contact"}</span>
      </div>
    </div>
    <div className="alert-amount">
      <span className="amount">{formatCurrency(alert.remaining)}</span>
      <span className="overdue-days">{alert.days_overdue} days</span>
    </div>
  </div>
);

// Activity Item Component
const ActivityItem = ({ item, type }) => {
  const isAdmission = type === "admission";
  const IconComponent = isAdmission ? UserPlus : LogOut;

  const getSubtitle = () => {
    if (isAdmission) {
      return `Room ${item.room_no || "N/A"} • ${formatDate(item.date_of_joining)}`;
    }
    const duration = calculateDaysDuration(item.date_of_joining, item.date_of_leaving);
    return `${duration} • ${formatDate(item.date_of_leaving)}`;
  };

  return (
    <div className="activity-item">
      <div className={`activity-icon ${type}`}>
        <IconComponent size={18} strokeWidth={2} />
      </div>
      <div className="activity-content">
        <p className="activity-title">{item.student_name}</p>
        <p className="activity-subtitle">{getSubtitle()}</p>
      </div>
      <StatusBadge
        type={isAdmission ? "ACTIVE" : "INACTIVE"}
        size="sm"
      />
    </div>
  );
};

// Empty State Component
const EmptyState = ({ message, icon: Icon }) => (
  <div className="empty-message">
    {Icon && <Icon size={20} style={{ marginRight: 8, opacity: 0.5 }} />}
    {message}
  </div>
);

// ============================================
// MAIN DASHBOARD COMPONENT
// ============================================
const Dashboard = () => {
  const navigate = useNavigate();

  // State
  const [stats, setStats] = useState(INITIAL_STATS);
  const [monthlyCollection, setMonthlyCollection] = useState([]);
  const [recentAdmissions, setRecentAdmissions] = useState([]);
  const [recentCheckouts, setRecentCheckouts] = useState([]);
  const [overdueAlerts, setOverdueAlerts] = useState([]);
  const [roomOccupancy, setRoomOccupancy] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  // Fetch Dashboard Data
  const fetchDashboardData = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const [
        summaryRes,
        collectionRes,
        admissionsRes,
        checkoutsRes,
        alertsRes,
        occupancyRes,
      ] = await Promise.all([
        dashboardAPI.getSummary(),
        dashboardAPI.getMonthlyCollection(),
        dashboardAPI.getRecentAdmissions(5),
        dashboardAPI.getRecentCheckouts(5),
        dashboardAPI.getOverdueAlerts(),
        dashboardAPI.getRoomOccupancy(),
      ]);

      setStats(summaryRes.data.data || INITIAL_STATS);
      setMonthlyCollection(collectionRes.data.data || []);
      setRecentAdmissions(admissionsRes.data.data || []);
      setRecentCheckouts(checkoutsRes.data.data || []);
      setOverdueAlerts(alertsRes.data.data || []);
      setRoomOccupancy(occupancyRes.data.data || []);
      setError("");
    } catch (err) {
      console.error("Dashboard fetch error:", err);
      setError("Failed to load dashboard data. Please try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Initial Load
  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Handle Refresh
  const handleRefresh = useCallback(() => {
    fetchDashboardData(true);
  }, [fetchDashboardData]);

  // Calculate derived values
  const totalBeds = (stats.total_rooms || 0) * 2;
  const vacantBeds = Math.max(totalBeds - (stats.occupied_beds || 0), 0);
  const occupancyRate =
    totalBeds > 0
      ? Math.round((stats.occupied_beds / totalBeds) * 100)
      : 0;
  const totalYearlyCollection = monthlyCollection.reduce((a, b) => a + b, 0);
  const currentYear = new Date().getFullYear();

  // Stat Cards Configuration
  const statCards = [
    {
      title: "Total Students",
      value: stats.total_students || 0,
      subtitle: `${stats.active_students || 0} currently active`,
      color: "#2563eb",
      bgColor: "rgba(37, 99, 235, 0.1)",
      icon: Users,
      trend: null,
    },
    {
      title: "Room Occupancy",
      value: `${occupancyRate}%`,
      subtitle: `${stats.occupied_beds || 0}/${totalBeds} beds filled`,
      color: "#16a34a",
      bgColor: "rgba(22, 163, 74, 0.1)",
      icon: Home,
      trend:
        occupancyRate > 80
          ? { direction: "up", value: "High" }
          : null,
    },
    {
      title: "Total Due",
      value: formatCurrency(stats.total_due),
      subtitle: `${stats.overdue_count || 0} overdue payments`,
      color: "#dc2626",
      bgColor: "rgba(220, 38, 38, 0.1)",
      icon: DollarSign,
      trend:
        stats.overdue_count > 0
          ? { direction: "down", value: stats.overdue_count }
          : null,
    },
    {
      title: "Vacant Beds",
      value: vacantBeds,
      subtitle: `${stats.total_rooms || 0} total rooms`,
      color: "#7c3aed",
      bgColor: "rgba(124, 58, 237, 0.1)",
      icon: BedDouble,
      trend: null,
    },
  ];

  // Loading State
  if (loading) {
    return <LoadingState />;
  }

  // Error State
  if (error) {
    return <ErrorState error={error} onRetry={() => fetchDashboardData()} />;
  }

  return (
    <div className="dashboard">
      {/* ==================== HEADER ==================== */}
      <header className="dashboard-header">
        <div className="dashboard-header-content">
          <h1>Dashboard</h1>
          <p className="subtitle">
            Welcome back! Here's what's happening today.
          </p>
        </div>

        <div className="dashboard-actions">
          <button
            className="action-btn"
            onClick={handleRefresh}
            disabled={refreshing}
            aria-label="Refresh dashboard"
          >
            <RefreshCw
              size={18}
              className={refreshing ? "spinning" : ""}
            />
            <span>{refreshing ? "Refreshing..." : "Refresh"}</span>
          </button>

          <button
            className="action-btn primary"
            onClick={() => navigate("/students/add")}
            aria-label="Add new student"
          >
            <Plus size={18} />
            <span>Add Student</span>
          </button>

          <button
            className="action-btn"
            onClick={() => navigate("/fees")}
            aria-label="Receive fee payment"
          >
            <DollarSign size={18} />
            <span>Receive Fee</span>
          </button>
        </div>
      </header>

      {/* ==================== STATS CARDS ==================== */}
      <section className="dashboard-stats" aria-label="Statistics overview">
        {statCards.map((card) => (
          <StatCard key={card.title} {...card} />
        ))}
      </section>

      {/* ==================== CHARTS SECTION ==================== */}
      <section className="dashboard-charts" aria-label="Charts and analytics">
        {/* Monthly Collection Chart */}
        <div className="chart-card large">
          <div className="chart-header">
            <h3>
              <Calendar size={18} />
              Monthly Fee Collection - {currentYear}
            </h3>
            <div className="chart-summary">
              <span className="chart-total">
                Total: {formatCurrency(totalYearlyCollection)}
              </span>
            </div>
          </div>
          <div className="chart-content">
            <BarChart
              data={
                monthlyCollection.length > 0
                  ? monthlyCollection
                  : Array(12).fill(0)
              }
              months={MONTHS}
            />
          </div>
        </div>

        {/* Room Occupancy by Type */}
        <div className="chart-card">
          <h3>
            <Home size={18} />
            Room Occupancy by Type
          </h3>
          <div className="chart-content">
            <div className="occupancy-list">
              {roomOccupancy.length === 0 ? (
                <EmptyState
                  message="No room data available"
                  icon={Home}
                />
              ) : (
                roomOccupancy.map((room, index) => (
                  <OccupancyProgress
                    key={room.room_type || index}
                    room={room}
                    index={index}
                  />
                ))
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ==================== ALERTS & ACTIVITY ROW ==================== */}
      <section className="dashboard-row" aria-label="Alerts and recent activity">
        {/* Overdue Alerts */}
        <div className="dashboard-card alert-card">
          <div className="card-header">
            <h3>
              <AlertTriangle size={20} />
              Overdue Alerts
            </h3>
            {overdueAlerts.length > 0 && (
              <button
                className="view-all-btn"
                onClick={() => navigate("/fees?filter=overdue")}
                aria-label="View all overdue alerts"
              >
                <span>View All</span>
                <ArrowRight size={16} />
              </button>
            )}
          </div>
          <div className="card-content">
            {overdueAlerts.length === 0 ? (
              <EmptyState message="🎉 No overdue payments!" />
            ) : (
              <div className="alert-list">
                {overdueAlerts.slice(0, 5).map((alert) => (
                  <AlertItem key={alert.fee_id} alert={alert} />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Recent Admissions */}
        <div className="dashboard-card">
          <div className="card-header">
            <h3>
              <UserPlus size={20} />
              Recent Admissions
            </h3>
            {recentAdmissions.length > 0 && (
              <button
                className="view-all-btn"
                onClick={() => navigate("/students?sort=newest")}
                aria-label="View all students"
              >
                <span>View All</span>
                <ArrowRight size={16} />
              </button>
            )}
          </div>
          <div className="card-content">
            {recentAdmissions.length === 0 ? (
              <EmptyState
                message="No recent admissions"
                icon={UserPlus}
              />
            ) : (
              <div className="activity-list">
                {recentAdmissions.map((admission) => (
                  <ActivityItem
                    key={admission.student_id}
                    item={admission}
                    type="admission"
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Recent Checkouts */}
        <div className="dashboard-card">
          <div className="card-header">
            <h3>
              <LogOut size={20} />
              Recent Checkouts
            </h3>
            {recentCheckouts.length > 0 && (
              <button
                className="view-all-btn"
                onClick={() => navigate("/students?status=inactive")}
                aria-label="View all checkouts"
              >
                <span>View All</span>
                <ArrowRight size={16} />
              </button>
            )}
          </div>
          <div className="card-content">
            {recentCheckouts.length === 0 ? (
              <EmptyState
                message="No recent checkouts"
                icon={LogOut}
              />
            ) : (
              <div className="activity-list">
                {recentCheckouts.map((checkout) => (
                  <ActivityItem
                    key={checkout.student_id}
                    item={checkout}
                    type="checkout"
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};

export default Dashboard;