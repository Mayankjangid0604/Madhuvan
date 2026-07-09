import { useEffect, useState } from "react";
import { studentAPI } from "../../services/api/student.api";
import {
  Search,
  Calendar,
  User,
  Clock,
  LogOut,
  RefreshCw,
  X,
  Filter,
} from "lucide-react";
import StatusBadge from "../../components/badges/StatusBadge";
import Button from "../../components/buttons/Button";
import "./checkoutHistory.css";

const CheckoutHistory = () => {
  const [checkouts, setCheckouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("date_desc");

  useEffect(() => {
    fetchCheckouts();
  }, []);

  const fetchCheckouts = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const res = await studentAPI.getStudents();
      const students = res.data.data || [];

      // Filter students who have left
      const exited = students.filter((s) => s.date_of_leaving);
      setCheckouts(exited);
    } catch (error) {
      console.error("Failed to fetch checkouts:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    fetchCheckouts(true);
  };

  const filteredCheckouts = checkouts
    .filter(
      (s) =>
        s.student_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.father_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.student_id?.toString().includes(searchTerm)
    )
    .sort((a, b) => {
      switch (sortBy) {
        case "date_desc":
          return new Date(b.date_of_leaving) - new Date(a.date_of_leaving);
        case "date_asc":
          return new Date(a.date_of_leaving) - new Date(b.date_of_leaving);
        case "name_asc":
          return a.student_name.localeCompare(b.student_name);
        case "name_desc":
          return b.student_name.localeCompare(a.student_name);
        case "duration_desc":
          return (
            new Date(b.date_of_leaving) -
            new Date(b.date_of_joining) -
            (new Date(a.date_of_leaving) - new Date(a.date_of_joining))
          );
        default:
          return 0;
      }
    });

  const calculateDuration = (joining, leaving) => {
    const joined = new Date(joining);
    const left = new Date(leaving);
    const days = Math.floor((left - joined) / (1000 * 60 * 60 * 24));

    if (days >= 365) {
      const years = Math.floor(days / 365);
      const months = Math.floor((days % 365) / 30);
      return `${years}y ${months}m`;
    } else if (days >= 30) {
      const months = Math.floor(days / 30);
      const remainingDays = days % 30;
      return `${months}m ${remainingDays}d`;
    }
    return `${days} days`;
  };

  // Stats
  const totalCheckouts = checkouts.length;
  const thisMonth = checkouts.filter((s) => {
    const leftDate = new Date(s.date_of_leaving);
    const now = new Date();
    return (
      leftDate.getMonth() === now.getMonth() &&
      leftDate.getFullYear() === now.getFullYear()
    );
  }).length;

  const avgDuration =
    checkouts.length > 0
      ? Math.round(
          checkouts.reduce((sum, s) => {
            const days = Math.floor(
              (new Date(s.date_of_leaving) - new Date(s.date_of_joining)) /
                (1000 * 60 * 60 * 24)
            );
            return sum + days;
          }, 0) / checkouts.length
        )
      : 0;

  if (loading) {
    return (
      <div className="checkout-history-page">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading checkout history</p>
        </div>
      </div>
    );
  }

  return (
    <div className="checkout-history-page">
      {/* Header */}
      <div className="page-header">
        <div>
          <h2>Checkout History</h2>
          <p className="subtitle">
            Students who have left the hostel ({totalCheckouts} total)
          </p>
        </div>
        <Button
          variant="secondary"
          onClick={handleRefresh}
          disabled={refreshing}
        >
          <RefreshCw size={16} className={refreshing ? "spinning" : ""} />
          {refreshing ? "Refreshing..." : "Refresh"}
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="checkout-stats">
        <div className="stat-card">
          <div className="stat-icon total">
            <LogOut size={24} />
          </div>
          <div className="stat-info">
            <span className="stat-value">{totalCheckouts}</span>
            <span className="stat-label">Total Checkouts</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon recent">
            <Calendar size={24} />
          </div>
          <div className="stat-info">
            <span className="stat-value">{thisMonth}</span>
            <span className="stat-label">This Month</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon duration">
            <Clock size={24} />
          </div>
          <div className="stat-info">
            <span className="stat-value">{avgDuration}</span>
            <span className="stat-label">Avg. Stay (days)</span>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="checkout-controls">
        <div className="search-box">
          <Search size={18} />
          <input
            type="text"
            placeholder="Search by name or ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button
              className="clear-search"
              onClick={() => setSearchTerm("")}
            >
              <X size={16} />
            </button>
          )}
        </div>

        <div className="sort-dropdown">
          <Filter size={16} />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="date_desc">Newest First</option>
            <option value="date_asc">Oldest First</option>
            <option value="name_asc">Name A-Z</option>
            <option value="name_desc">Name Z-A</option>
            <option value="duration_desc">Longest Stay</option>
          </select>
        </div>
      </div>

      {/* Content */}
      {filteredCheckouts.length === 0 ? (
        <div className="empty-state">
          <LogOut size={56} />
          <h3>No Checkout Records</h3>
          <p>
            {searchTerm
              ? "No students found matching your search"
              : "No students have checked out yet"}
          </p>
        </div>
      ) : (
        <div className="checkout-table-container">
          <table className="checkout-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Student Name</th>
                <th>Father Name</th>
                <th>Joined Date</th>
                <th>Left Date</th>
                <th>Duration</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredCheckouts.map((student) => {
                const duration = calculateDuration(
                  student.date_of_joining,
                  student.date_of_leaving
                );

                return (
                  <tr key={student.student_id}>
                    <td className="id-cell">{student.student_id}</td>
                    <td className="name-cell">
                      <div className="student-name-wrapper">
                        <div className="student-avatar">
                          {student.student_name.charAt(0).toUpperCase()}
                        </div>
                        <span>{student.student_name}</span>
                      </div>
                    </td>
                    <td>{student.father_name}</td>
                    <td>
                      <div className="date-cell">
                        <Calendar size={14} />
                        {new Date(student.date_of_joining).toLocaleDateString(
                          "en-IN",
                          {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          }
                        )}
                      </div>
                    </td>
                    <td>
                      <div className="date-cell leaving">
                        <LogOut size={14} />
                        {new Date(student.date_of_leaving).toLocaleDateString(
                          "en-IN",
                          {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          }
                        )}
                      </div>
                    </td>
                    <td>
                      <span className="duration-badge">{duration}</span>
                    </td>
                    <td>
                      <StatusBadge type="INACTIVE" size="sm" showIcon={true} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default CheckoutHistory;