import { Routes, Route, useLocation } from "react-router-dom";
import { useEffect } from "react";
import ProtectedRoute from "../../components/auth/ProtectedRoute";
import MainLayout from "../../layout/MainLayout/MainLayout";
import Dashboard from "../../pages/Dashboard/Dashboard";
import Students from "../../pages/Students/Students";
import Rooms from "../../pages/Rooms/Rooms";
import AddRoom from "../../pages/Rooms/AddRoom";
import BulkAddRoom from "../../pages/Rooms/BulkAddRoom";
import Fees from "../../pages/Fees/ReceiveFee";
import Ledger from "../../pages/Ledger/Ledger";
import Reports from "../../pages/Reports/Reports";
import Settings from "../../pages/Settings/Settings";
import AddStudent from "../../pages/Students/AddStudent/AddStudent";
import EditStudent from "../../pages/Students/EditStudent/EditStudent";
import FeeDetails from "../../pages/Fees/FeeDetails";
import Login from "../../pages/Auth/Login";
import AllocateRoom from "../../pages/Rooms/AllocateRoom";
import FinePage from "../../pages/fine/FinePage";
import Members from "../../pages/members/Members";

// ✅ Reset body styles on route change
const resetBodyStyles = () => {
  document.body.style.overflow = '';
  document.body.style.pointerEvents = '';
  document.body.style.position = '';
  document.body.style.top = '';
  document.body.style.left = '';
  document.body.style.right = '';
  document.body.classList.remove('modal-open', 'overflow-hidden', 'no-scroll');
  document.documentElement.style.overflow = '';
  document.documentElement.style.pointerEvents = '';
};

// ✅ Hook to reset body on route change + scroll to top
const useBodyScrollReset = () => {
  const location = useLocation();

  useEffect(() => {
    resetBodyStyles();
    // ✅ FIX: Scroll ALL scrollable containers to top on every page navigation
    window.scrollTo(0, 0);
    // The actual scrollable element in the layout is .layout-content
    const layoutContent = document.querySelector('.layout-content');
    if (layoutContent) {
      layoutContent.scrollTop = 0;
    }
  }, [location.pathname]);
};

const AppRoutes = () => {
  useBodyScrollReset();

  return (
    <Routes>
      {/* ✅ FIX: Login OUTSIDE MainLayout — no sidebar/topbar on login page */}
      <Route path="/login" element={<Login />} />

      {/* ✅ All protected routes INSIDE MainLayout */}
      <Route element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
        <Route path="/" element={<Dashboard />} />

        {/* Students */}
        <Route path="/students" element={<Students />} />
        <Route path="/students/add" element={<AddStudent />} />
        <Route path="/students/edit/:id" element={<EditStudent />} />

        {/* Rooms */}
        <Route path="/rooms" element={<Rooms />} />
        <Route path="/rooms/add" element={<AddRoom />} />
        <Route path="/rooms/bulk-add" element={<BulkAddRoom />} />
        <Route path="/rooms/allocate" element={<AllocateRoom />} />

        {/* Fees & Finance */}
        <Route path="/fees" element={<Fees />} />
        <Route path="/fees/student/:studentId" element={<FeeDetails />} />
        <Route path="/fine" element={<FinePage />} />
        <Route path="/ledger" element={<Ledger />} />

        {/* Other */}
        <Route path="/reports" element={<Reports />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/members" element={<Members />} />
      </Route>
    </Routes>
  );
};

export default AppRoutes;