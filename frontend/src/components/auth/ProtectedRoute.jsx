import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) return null;

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // ✅ FIX: If used as layout wrapper (no children passed), render Outlet
  // If used wrapping a specific component, render children
  return children || <Outlet />;
};

export default ProtectedRoute;