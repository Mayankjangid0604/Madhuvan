// src/pages/Students/Students.jsx
import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { studentAPI } from "../../services/api/student.api";
import { feeAPI } from "../../services/api/fee.api";
import { roomAPI } from "../../services/api/room.api";
import { settingsAPI } from "../../services/api/settings.api";
import { fineAPI } from "../../services/api/fine.api";
import StatusBadge from "../../components/badges/StatusBadge";
import Button from "../../components/buttons/Button";
import CheckoutModal from "../../components/modals/CheckoutModal";
import ConfirmModal from "../../components/modals/ConfirmModal";
import StudentAdmissionForm from "../../components/PrintForm/StudentAdmissionForm";
import HardDeleteStudentModal from "../../components/modals/HardDeleteStudentModal";
import { printStyles } from "../../components/PrintForm/printStyles";
import {
  Search,
  Eye,
  Edit,
  LogOut,
  UserPlus,
  X,
  User,
  Phone,
  Calendar,
  MapPin,
  CreditCard,
  Home,
  BookOpen,
  Users,
  Building2,
  IndianRupee,
  CheckCircle2,
  AlertCircle,
  Printer,
  Trash2,
  RefreshCw,
} from "lucide-react";
import axios from "axios";
import { imageUrlToBase64 } from "../../utils/imageToBase64";
import { getFileUrl } from "../../utils/imageSrc";
import { printElement } from "../../utils/printUtil";
import { loadDrafts, deleteDraft } from "../../utils/studentDrafts";
import { FileText } from "lucide-react";
import "./students.css";

// ✅ Helper function to reset body styles
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

const Students = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // State
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [showDraftsModal, setShowDraftsModal] = useState(false);
  const [drafts, setDrafts] = useState([]);

  // Modal States
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [checkoutStudent, setCheckoutStudent] = useState(null);
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [showHardDeleteModal, setShowHardDeleteModal] = useState(false);
  const [hardDeleteStudent, setHardDeleteStudent] = useState(null);

  // Custom Modal State
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => { },
    type: "info",
    confirmText: "OK",
    showCancel: false
  });

  // Print State
  const [printStudent, setPrintStudent] = useState(null);

  // Tab State
  const [activeTab, setActiveTab] = useState("personal");

  // Security details for view modal
  const [securityDetails, setSecurityDetails] = useState(null);

  // Hostel Info & Rules
  const [hostelInfo, setHostelInfo] = useState(null);
  const [hostelRules, setHostelRules] = useState([]);
  const [printHostelInfo, setPrintHostelInfo] = useState(null);

  // Print ref for preview
  const printPreviewRef = useRef(null);

  // ✅ CRITICAL: Reset body styles on component mount
  useEffect(() => {
    // Force cleanup any stuck modal states on mount
    resetBodyStyles();

    // Remove any orphaned overlay elements
    const orphanedOverlays = document.querySelectorAll('.modal-overlay');
    orphanedOverlays.forEach(overlay => {
      if (overlay && !document.querySelector('.students-page')?.contains(overlay)) {
        // Don't remove if it's part of this component
      }
    });

    return () => {
      // Cleanup on unmount
      resetBodyStyles();
    };
  }, []);

  // Initialize Data - runs only once on mount
  useEffect(() => {
    let isMounted = true;

    const initializeData = async () => {
      // ✅ Force body cleanup first
      resetBodyStyles();

      // Reset all modal states
      setShowModal(false);
      setShowCheckoutModal(false);
      setShowPrintPreview(false);
      setShowHardDeleteModal(false);
      setSelectedStudent(null);
      setCheckoutStudent(null);
      setPrintStudent(null);
      setHardDeleteStudent(null);
      setConfirmModal({
        isOpen: false,
        title: "",
        message: "",
        onConfirm: () => { },
        type: "info",
        confirmText: "OK",
        showCancel: false
      });
      setActiveTab("personal");

      if (isMounted) {
        await fetchStudents();
        await loadHostelInfo();
        await loadHostelRules();
      }
    };

    initializeData();

    return () => {
      isMounted = false;
      // ✅ Cleanup on unmount
      resetBodyStyles();
    };
  }, []);

  // Handle search params separately
  useEffect(() => {
    const searchFromUrl = searchParams.get("search");
    if (searchFromUrl) {
      setSearchTerm(searchFromUrl);
    }
  }, [searchParams]);

  // Fetch Students
  const fetchStudents = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError("");

      const [studentsRes, feesRes, allocationsRes] = await Promise.all([
        studentAPI.getStudents(),
        feeAPI.getAllFees(),
        roomAPI.getActiveAllocations(),
      ]);

      const studentsData = studentsRes.data.data || [];
      const feesData = feesRes.data.data || [];
      const allocationsData = allocationsRes.data.data || [];

      const mergedStudents = studentsData.map((student) => {
        const studentFees = feesData.filter(
          (f) => f.student_id === student.student_id
        );
        const allocation = allocationsData.find(
          (a) => a.student_id === student.student_id
        );

        const totalFeeAmount = studentFees
          .filter(f => f.fee_type !== "Security Deposit")
          .reduce((sum, f) => {
            return sum + Number(f.final_amount || f.fee_amount || 0)
              + Number(f.previous_dues || 0)
              + Number(f.penalty_amount || 0)
              + Number(f.fine_amount || 0)
              + Number(f.property_damage_amount || 0)
              + Number(f.money_given_amount || 0)
              - Number(f.advance_used || 0);
          }, 0);

        const totalPaid = studentFees
          .filter(f => f.fee_type !== "Security Deposit")
          .reduce((sum, f) => sum + Number(f.paid_amount || 0), 0);

        const totalRemaining = Math.max(0, totalFeeAmount - totalPaid);

        let feeStatus = "PAID";
        if (totalRemaining > 0) {
          const hasOverdue = studentFees.some(
            (f) => f.fee_status === "OVERDUE"
          );
          const hasDue = studentFees.some((f) => f.fee_status === "DUE");
          const hasPartial = studentFees.some(
            (f) => f.fee_status === "PARTIAL"
          );

          if (hasOverdue) feeStatus = "OVERDUE";
          else if (hasDue) feeStatus = "DUE";
          else if (hasPartial) feeStatus = "PARTIAL";
        }

        return {
          ...student,
          room_no: allocation?.room_no || "Not Allocated",
          bed_no: allocation?.bed_no || "-",
          fee_status: feeStatus,
          fees: studentFees,
          allocation: allocation,
          total_fee_amount: totalFeeAmount,
          total_paid: totalPaid,
          total_remaining: totalRemaining,
        };
      });

      setStudents(mergedStudents);
    } catch (err) {
      setError("Failed to load students. Please try again.");
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Load Hostel Info
  const loadHostelInfo = async () => {
    try {
      const response = await settingsAPI.getHostelInfo();
      if (response.data.success && response.data.data) {
        let hostelData = response.data.data;
        if (typeof hostelData.rules === 'string') {
          try { hostelData.rules = JSON.parse(hostelData.rules); } catch { hostelData.rules = []; }
        }
        setHostelInfo(hostelData);
      }
    } catch (error) {
      console.error("Error loading hostel info:", error);
      setHostelInfo({
        hostel_name: "HOSTEL",
        tagline: "Management System",
        address_line1: "",
        address_line2: "",
        phone: "",
        email: "",
        website: "",
        logo_left: "",
        logo_right: "",
      });
    }
  };

  // Load Hostel Rules
  const loadHostelRules = async () => {
    try {
      const response = await settingsAPI.getRules();
      if (response.data.success) {
        const rules = response.data.data;
        if (Array.isArray(rules)) {
          setHostelRules(rules);
        } else if (typeof rules === "string") {
          try {
            const parsed = JSON.parse(rules);
            setHostelRules(Array.isArray(parsed) ? parsed : []);
          } catch {
            setHostelRules([]);
          }
        } else {
          setHostelRules([]);
        }
      }
    } catch (error) {
      console.error("Error loading rules:", error);
      setHostelRules([]);
    }
  };

  // ✅ Close all modals and reset body
  const closeAllModals = useCallback(() => {
    setShowModal(false);
    setShowCheckoutModal(false);
    setShowPrintPreview(false);
    setShowHardDeleteModal(false);
    setSelectedStudent(null);
    setCheckoutStudent(null);
    setPrintStudent(null);
    setHardDeleteStudent(null);

    // Force body cleanup
    resetBodyStyles();
  }, []);

  // Handlers
  const handleViewDetails = (student) => {
    setSelectedStudent(student);
    setActiveTab("personal");
    setSecurityDetails(null);
    setShowModal(true);

    // Fetch security details
    fineAPI.getStudentSecurity(student.student_id)
      .then(res => setSecurityDetails(res.data?.data || null))
      .catch(err => console.error("Failed to fetch security details:", err));
  };

  // ✅ Fixed: Close modal with body reset
  const handleCloseModal = useCallback(() => {
    setShowModal(false);
    setSelectedStudent(null);
    resetBodyStyles();
  }, []);

  const handleCheckoutClick = (student) => {
    if (student.date_of_leaving) {
      setConfirmModal({
        isOpen: true,
        title: "Already Checked Out",
        message: "Student has already been checked out",
        onConfirm: () => { },
        type: "info",
        confirmText: "OK",
        showCancel: false
      });
      return;
    }

    if (student.room_no === "Not Allocated") {
      setConfirmModal({
        isOpen: true,
        title: "No Room Allocation",
        message: "Student has no active room allocation",
        onConfirm: () => { },
        type: "info",
        confirmText: "OK",
        showCancel: false
      });
      return;
    }

    setCheckoutStudent(student);
    setShowCheckoutModal(true);
  };

  // ✅ Fixed: Close checkout modal with body reset
  const handleCloseCheckoutModal = useCallback(() => {
    setShowCheckoutModal(false);
    setCheckoutStudent(null);
    resetBodyStyles();
  }, []);

  const handleCheckoutConfirm = async (checkoutData) => {
    try {
      await roomAPI.checkoutStudent({
        student_id: checkoutStudent.student_id,
        checkout_date: checkoutData.checkout_date,
        reason: checkoutData.reason,
        remarks: checkoutData.remarks,
        refund_amount: checkoutData.refund_amount || 0,
        payment_mode: checkoutData.payment_mode || 'Cash',
      });

      setConfirmModal({
        isOpen: true,
        title: "Success",
        message: "Student checked out successfully!",
        onConfirm: () => {
          handleCloseCheckoutModal();
          fetchStudents(true);
        },
        type: "info",
        confirmText: "OK",
        showCancel: false
      });
    } catch (error) {
      console.error("Checkout failed:", error);
      setConfirmModal({
        isOpen: true,
        title: "Error",
        message: error.response?.data?.message || "Failed to checkout student",
        onConfirm: () => { },
        type: "danger",
        confirmText: "OK",
        showCancel: false
      });
    }
  };

  // Handle Print Click - Opens Preview
  const handlePrintClick = async (student) => {
    let photoBase64 = null;

    if (student.photo_url) {
      try {
        photoBase64 = await imageUrlToBase64(getFileUrl(student.photo_url));
      } catch (e) {
        console.warn("Could not convert photo to base64:", e);
      }
    }

    const studentWithPhoto = {
      ...student,
      photo_base64: photoBase64,
    };

    // Convert hostel logos to base64 so they render in the popup print window
    let hostelInfoForPrint = hostelInfo ? { ...hostelInfo } : null;
    if (hostelInfoForPrint) {
      if (hostelInfoForPrint.logo_left) {
        try {
          const b64 = await imageUrlToBase64(getFileUrl(hostelInfoForPrint.logo_left));
          if (b64) hostelInfoForPrint.logo_left = b64;
        } catch (e) {
          console.warn("Could not convert logo_left to base64:", e);
        }
      }
      if (hostelInfoForPrint.logo_right) {
        try {
          const b64 = await imageUrlToBase64(getFileUrl(hostelInfoForPrint.logo_right));
          if (b64) hostelInfoForPrint.logo_right = b64;
        } catch (e) {
          console.warn("Could not convert logo_right to base64:", e);
        }
      }
    }

    setPrintHostelInfo(hostelInfoForPrint);
    setPrintStudent(studentWithPhoto);
    setShowPrintPreview(true);
  };

  // ✅ Fixed: Close Print Preview with body reset
  const closePrintPreview = useCallback(() => {
    setShowPrintPreview(false);
    setPrintStudent(null);
    setPrintHostelInfo(null);
    resetBodyStyles();
  }, []);

  // Print Function - Auto closes preview after print (FIXED)
  const triggerPrint = useCallback(() => {
    if (!printStudent) {
      setConfirmModal({
        isOpen: true,
        title: "Print Error",
        message: "No student data available for printing",
        onConfirm: () => { },
        type: "danger",
        confirmText: "OK",
        showCancel: false
      });
      return;
    }

    if (!printPreviewRef.current) {
      setConfirmModal({
        isOpen: true,
        title: "Print Error",
        message: "Print content not ready. Please try again.",
        onConfirm: () => { },
        type: "danger",
        confirmText: "OK",
        showCancel: false
      });
      return;
    }

    const printContent = printPreviewRef.current.innerHTML;
    const printWindow = window.open("", "_blank", "width=900,height=700");

    if (!printWindow) {
      setConfirmModal({
        isOpen: true,
        title: "Popup Blocked",
        message: "Please allow popups to print the form",
        onConfirm: () => { },
        type: "warning",
        confirmText: "OK",
        showCancel: false
      });
      return;
    }

    // Create the complete HTML with better structure
    const printHTML = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Admission Form - ${printStudent.student_name}</title>
          <meta charset="UTF-8">
          <style>
            /* ==================== GENERAL STYLES ==================== */
            .admission-form-print { font-family: "Times New Roman", Times, serif; font-size: 12pt; color: #000; background: #fff; line-height: 1.4; }
            .admission-form-print * { box-sizing: border-box; }
            /* ==================== PAGE STRUCTURE ==================== */
            .print-page { width: 210mm; min-height: 297mm; padding: 10mm 12mm; background: #fff; position: relative; page-break-after: always; page-break-inside: avoid; }
            .print-page:last-child { page-break-after: auto; }
            /* ==================== HEADER STYLES ==================== */
            .form-header { display: flex; align-items: center; justify-content: space-between; padding: 10px; border-bottom: 3px double #2563eb; margin-bottom: 10px; background: linear-gradient(135deg, #eff6ff 0%, #fdf4ff 100%); border-radius: 8px 8px 0 0; }
            .header-logo { width: 65px; height: 65px; display: flex; align-items: center; justify-content: center; }
            .header-logo img { max-width: 100%; max-height: 100%; object-fit: contain; }
            .header-logo.left { justify-content: flex-start; }
            .header-logo.right { justify-content: flex-end; }
            .header-center { flex: 1; text-align: center; padding: 0 12px; }
            .hostel-name { font-size: 20pt; font-weight: bold; margin: 0; text-transform: uppercase; letter-spacing: 1px; color: #1e40af; }
            .hostel-tagline { font-size: 10pt; font-style: italic; margin: 2px 0 5px; color: #6b21a8; }
            .hostel-contact { font-size: 9pt; color: #374151; }
            .hostel-contact p { margin: 2px 0; }
            .hostel-contact .separator { margin: 0 5px; }
            .hostel-contact .website { font-size: 8pt; }
            /* ==================== FORM TITLE ==================== */
            .form-title { text-align: center; margin: 12px 0; padding: 8px 0; background: linear-gradient(90deg, #dbeafe 0%, #f3e8ff 50%, #fce7f3 100%); border: 2px solid #3b82f6; border-radius: 6px; }
            .form-title h2 { margin: 0; font-size: 14pt; font-weight: bold; letter-spacing: 3px; text-transform: uppercase; color: #1e3a8a; }
            /* ==================== FORM META INFO ==================== */
            .form-meta-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; padding: 8px 12px; background: #fefce8; border-radius: 6px; border: 1px solid #fde047; }
            .form-meta-row .meta-left { text-align: left; flex: 1; }
            .form-meta-row .meta-center { text-align: center; flex: 1; }
            .form-meta-row .meta-right { text-align: right; flex: 1; }
            .meta-item { font-size: 10pt; }
            .meta-item strong { margin-right: 5px; color: #92400e; }
            /* ==================== STUDENT HEADER SECTION ==================== */
            .student-header-section { display: flex; gap: 20px; margin-bottom: 12px; padding: 10px; background: linear-gradient(135deg, #f0fdf4 0%, #ecfeff 100%); border-radius: 8px; border: 1px solid #a7f3d0; }
            .photo-section { flex-shrink: 0; }
            .photo-box { width: 90px; height: 110px; border: 3px solid #10b981; display: flex; align-items: center; justify-content: center; background: #fff; overflow: hidden; border-radius: 6px; }
            .photo-box img { width: 100%; height: 100%; object-fit: cover; }
            .photo-placeholder { text-align: center; color: #6b7280; font-size: 9pt; }
            .photo-placeholder span { display: block; font-weight: bold; margin-bottom: 3px; color: #059669; }
            .photo-placeholder small { font-size: 7pt; }
            .quick-info-section { flex: 1; }
            .info-table { width: 100%; border-collapse: collapse; }
            .info-table td { padding: 5px 8px; border: 1px solid #86efac; }
            .info-table .label { width: 40%; font-weight: bold; background: #dcfce7; font-size: 9pt; color: #166534; }
            .info-table .value { font-size: 10pt; background: #fff; }
            /* ==================== SECTION STYLES ==================== */
            .section { margin-bottom: 10px; }
            .section-title { display: flex; align-items: center; gap: 8px; font-size: 11pt; font-weight: bold; padding: 6px 10px; border-radius: 6px 6px 0 0; text-transform: uppercase; }
            .section-title.blue { background: linear-gradient(90deg, #dbeafe 0%, #e0e7ff 100%); border: 1px solid #93c5fd; border-bottom: none; color: #1e40af; }
            .section-title.green { background: linear-gradient(90deg, #dcfce7 0%, #d1fae5 100%); border: 1px solid #86efac; border-bottom: none; color: #166534; }
            .section-title.purple { background: linear-gradient(90deg, #f3e8ff 0%, #ede9fe 100%); border: 1px solid #c4b5fd; border-bottom: none; color: #6b21a8; }
            .section-title.orange { background: linear-gradient(90deg, #ffedd5 0%, #fef3c7 100%); border: 1px solid #fdba74; border-bottom: none; color: #c2410c; }
            .section-title.pink { background: linear-gradient(90deg, #fce7f3 0%, #ffe4e6 100%); border: 1px solid #f9a8d4; border-bottom: none; color: #be185d; }
            .section-number { display: inline-flex; align-items: center; justify-content: center; width: 22px; height: 22px; background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); color: #fff; border-radius: 50%; font-size: 10pt; font-weight: bold; }
            /* ==================== DETAILS TABLE ==================== */
            .details-table { width: 100%; border-collapse: collapse; border: 1px solid #d1d5db; border-radius: 0 0 6px 6px; overflow: hidden; }
            .details-table td { padding: 6px 8px; border: 1px solid #e5e7eb; font-size: 10pt; }
            .details-table .label { width: 18%; font-weight: bold; background: #f9fafb; font-size: 9pt; color: #374151; }
            .details-table .value { width: 32%; background: #fff; }
            .sub-header .sub-title { background: linear-gradient(90deg, #f0fdf4 0%, #ecfeff 100%); font-weight: bold; font-size: 9pt; color: #0f766e; text-align: center; padding: 4px; border-top: 2px solid #99f6e4; }
            /* ==================== FEE TABLE ==================== */
            .fee-table { width: 100%; border-collapse: collapse; border: 1px solid #c4b5fd; border-radius: 0 0 6px 6px; overflow: hidden; }
            .fee-table th, .fee-table td { padding: 6px 10px; border: 1px solid #ddd6fe; font-size: 10pt; text-align: left; }
            .fee-table th { background: linear-gradient(90deg, #ede9fe 0%, #f3e8ff 100%); font-weight: bold; text-transform: uppercase; font-size: 9pt; color: #6b21a8; }
            .fee-table th:last-child, .fee-table td:last-child { text-align: right; width: 35%; }
            .fee-table tbody tr:nth-child(even) { background: #faf5ff; }
            .fee-table tbody tr:nth-child(odd) { background: #fff; }
            .fee-table .total-row { background: linear-gradient(90deg, #ddd6fe 0%, #e9d5ff 100%) !important; }
            .fee-table .total-row td { border-top: 2px solid #8b5cf6; color: #581c87; }
            /* ==================== MINI HEADER (PAGE 2) ==================== */
            .mini-header { text-align: center; padding: 10px; background: linear-gradient(135deg, #eff6ff 0%, #fdf4ff 100%); border-bottom: 2px solid #3b82f6; margin-bottom: 12px; border-radius: 8px 8px 0 0; }
            .mini-header h3 { margin: 0; font-size: 13pt; text-transform: uppercase; color: #1e40af; }
            .mini-header p { margin: 3px 0 0; font-size: 9pt; color: #6b21a8; }
            /* ==================== RULES SECTION ==================== */
            .rules-section { margin-bottom: 12px; }
            .rules-container { border: 1px solid #fdba74; border-top: none; padding: 10px 12px; background: linear-gradient(180deg, #fffbeb 0%, #fff 100%); border-radius: 0 0 6px 6px; }
            .rules-container.no-rules { text-align: center; padding: 20px; }
            .no-rules-text { font-size: 11pt; color: #6b7280; font-style: italic; margin: 0; }
            .rules-list { margin: 0; padding-left: 22px; font-size: 9pt; line-height: 1.45; color: #1f2937; }
            .rules-list li { margin-bottom: 4px; text-align: justify; }
            .rules-list li::marker { color: #ea580c; font-weight: bold; }
            /* ==================== DECLARATION SECTION ==================== */
            .declaration-section { margin-bottom: 12px; }
            .declaration-block { padding: 12px 15px; border: 1px solid #f9a8d4; border-top: none; background: #fff; }
            .declaration-block:last-of-type { border-radius: 0 0 6px 6px; }
            .student-declaration { background: linear-gradient(180deg, #fdf2f8 0%, #fff 100%); border-bottom: 2px dashed #f9a8d4; }
            .parent-declaration { background: linear-gradient(180deg, #fef7ff 0%, #fff 100%); }
            .declaration-heading { margin: 0 0 8px; font-size: 11pt; font-weight: bold; color: #be185d; text-transform: uppercase; padding-bottom: 4px; border-bottom: 1px solid #fbcfe8; }
            .declaration-text { margin: 0 0 8px; font-size: 10pt; text-align: justify; line-height: 1.5; color: #1f2937; }
            .declaration-text:last-child { margin-bottom: 0; }
            .signature-inline { display: flex; gap: 30px; margin-top: 12px; padding-top: 8px; }
            .sign-item { display: flex; align-items: center; gap: 8px; }
            .sign-item .sign-label { font-size: 9pt; font-weight: bold; white-space: nowrap; }
            .sign-item .sign-line { display: inline-block; border-bottom: 1px solid #000; min-width: 120px; height: 20px; }
            .sign-item .sign-line.short { min-width: 80px; }
            /* ==================== SIGNATURE SECTION ==================== */
            .signature-section { margin: 20px 0 15px; padding: 15px; background: linear-gradient(135deg, #f0fdf4 0%, #f0f9ff 50%, #fdf4ff 100%); border-radius: 8px; border: 1px solid #a7f3d0; }
            .signature-row { display: flex; justify-content: space-between; gap: 40px; }
            .signature-box { flex: 1; text-align: center; }
            .sign-line-box { border-bottom: 2px solid #374151; height: 50px; margin-bottom: 6px; background: #fff; border-radius: 4px; }
            .sign-label-text { margin: 0; font-size: 10pt; font-weight: bold; color: #1f2937; }
            /* ==================== PAGE FOOTER ==================== */
            .page-footer { position: absolute; bottom: 8mm; left: 12mm; right: 12mm; text-align: center; font-size: 8pt; color: #6b7280; border-top: 1px solid #e5e7eb; padding-top: 6px; background: linear-gradient(90deg, #f9fafb 0%, #fff 50%, #f9fafb 100%); }
            .page-footer p { margin: 0; }
            .page-footer .footer-hostel { font-size: 7pt; margin-top: 2px; color: #9ca3af; }
            /* ==================== PRINT MEDIA QUERIES ==================== */
            @media print {
              @page { size: A4; margin: 0; }
              html, body { width: 210mm; height: 297mm; margin: 0 !important; padding: 0 !important; }
              .admission-form-print { width: 210mm; margin: 0; padding: 0; }
              .print-page { width: 210mm; min-height: 297mm; height: 297mm; padding: 10mm 12mm; margin: 0; box-shadow: none; page-break-after: always; page-break-inside: avoid; }
              .print-page:last-child { page-break-after: auto; }
              * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; }
              .no-print { display: none !important; }
              img { max-width: 100% !important; page-break-inside: avoid; }
              .section, .signature-section, .declaration-block, .rules-container { page-break-inside: avoid; }
              table { page-break-inside: avoid; }
              tr { page-break-inside: avoid; page-break-after: auto; }
              .form-header { page-break-after: avoid; }
              .page-footer { position: absolute; bottom: 8mm; }
            }
          </style>
        </head>
        <body>
          ${printContent}
          <script>
            function waitForImages() {
              const images = document.querySelectorAll('img');
              if (images.length === 0) {
                window.print();
                return;
              }
              let loaded = 0;
              const total = images.length;
              const tryPrint = () => {
                loaded++;
                if (loaded >= total) window.print();
              };
              images.forEach(img => {
                if (img.complete) {
                  tryPrint();
                } else {
                  img.addEventListener('load', tryPrint);
                  img.addEventListener('error', tryPrint);
                }
              });
            }
            // Start waiting for images when document is ready
            if (document.readyState === 'loading') {
              document.addEventListener('DOMContentLoaded', waitForImages);
            } else {
              waitForImages();
            }
          <\/script>
        </body>
      </html>
    `;

    // Write and close document
    printWindow.document.write(printHTML);
    printWindow.document.close();

    // Auto-close print window after printing
    printWindow.onbeforeunload = () => {
      closePrintPreview();
    };

  }, [printStudent, closePrintPreview]);

  const openHardDelete = (student) => {
    setHardDeleteStudent(student);
    setShowHardDeleteModal(true);
  };

  // ✅ Fixed: Close hard delete modal with body reset
  const handleCloseHardDeleteModal = useCallback(() => {
    setShowHardDeleteModal(false);
    setHardDeleteStudent(null);
    resetBodyStyles();
  }, []);

  const confirmHardDelete = async () => {
    if (!hardDeleteStudent) return;

    try {
      await studentAPI.hardDeleteStudent(hardDeleteStudent.student_id);
      setConfirmModal({
        isOpen: true,
        title: "Deleted",
        message: "Student permanently deleted",
        onConfirm: () => {
          handleCloseHardDeleteModal();
          fetchStudents(true);
        },
        type: "info",
        confirmText: "OK",
        showCancel: false
      });
    } catch (err) {
      setConfirmModal({
        isOpen: true,
        title: "Error",
        message: err.response?.data?.message || "Delete failed",
        onConfirm: () => { },
        type: "danger",
        confirmText: "OK",
        showCancel: false
      });
    }
  };

  const canDeleteStudent = (student) => {
    return (
      student.room_no === "Not Allocated" &&
      Number(student.total_remaining || 0) === 0
    );
  };

  const handleRefresh = () => {
    fetchStudents(true);
  };

  // Filter Students
  const filteredStudents = students
    .filter((s) => {
      if (filterStatus === "all") return true;
      return s.fee_status === filterStatus;
    })
    .filter(
      (s) =>
        s.student_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.father_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.student_id?.toString().includes(searchTerm)
    )
    .sort((a, b) => {
      const statusOrder = { OVERDUE: 0, DUE: 1, PARTIAL: 2, PAID: 3 };
      return (
        (statusOrder[a.fee_status] || 4) - (statusOrder[b.fee_status] || 4)
      );
    });

  // Stats
  const stats = {
    total: students.length,
    overdue: students.filter((s) => s.fee_status === "OVERDUE").length,
    due: students.filter((s) => s.fee_status === "DUE").length,
    paid: students.filter((s) => s.fee_status === "PAID").length,
  };

  // Loading State
  if (loading && students.length === 0) {
    return (
      <div className="students-page">
        <div className="loading-state">Loading students...</div>
      </div>
    );
  }

  return (
    <div className="students-page">
      {/* Global Confirm/Alert Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        confirmText={confirmModal.confirmText}
        type={confirmModal.type}
        cancelText={confirmModal.showCancel ? "Cancel" : null}
      />

      {/* Header */}
      <div className="students-header">
        <div>
          <h2>Students</h2>
          <p className="subtitle">
            Manage student records and details ({stats.total} total)
          </p>
        </div>
        <div style={{ display: "flex", gap: "12px" }}>
          <Button
            variant="secondary"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw size={16} className={refreshing ? "spinning" : ""} />
            {refreshing ? "Refreshing..." : "Refresh"}
          </Button>
          <Button
            variant="secondary"
            onClick={() => { setDrafts(loadDrafts()); setShowDraftsModal(true); }}
          >
            <FileText size={16} />
            Drafts{loadDrafts().length > 0 ? ` (${loadDrafts().length})` : ""}
          </Button>
          <Button variant="primary" onClick={() => navigate("/students/add")}>
            <UserPlus size={16} />
            Add Student
          </Button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="alert alert-error">
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      {/* Controls */}
      <div className="students-controls">
        <div className="search-box">
          <Search size={18} />
          <input
            type="text"
            placeholder="Search by name, father name, or ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: "4px",
              }}
            >
              <X size={16} color="#94a3b8" />
            </button>
          )}
        </div>

        <div className="filter-buttons">
          <button
            className={`filter-btn ${filterStatus === "all" ? "active" : ""}`}
            onClick={() => setFilterStatus("all")}
          >
            All ({stats.total})
          </button>
          <button
            className={`filter-btn overdue ${filterStatus === "OVERDUE" ? "active" : ""
              }`}
            onClick={() => setFilterStatus("OVERDUE")}
          >
            Overdue ({stats.overdue})
          </button>
          <button
            className={`filter-btn due ${filterStatus === "DUE" ? "active" : ""
              }`}
            onClick={() => setFilterStatus("DUE")}
          >
            Due ({stats.due})
          </button>
          <button
            className={`filter-btn paid ${filterStatus === "PAID" ? "active" : ""
              }`}
            onClick={() => setFilterStatus("PAID")}
          >
            Paid ({stats.paid})
          </button>
        </div>
      </div>

      {/* Content */}
      {filteredStudents.length === 0 ? (
        <div className="empty-state">
          <User size={56} />
          <p>
            {searchTerm || filterStatus !== "all"
              ? "No students found matching your criteria"
              : "No students added yet"}
          </p>
          {!searchTerm && filterStatus === "all" && (
            <Button
              variant="primary"
              onClick={() => navigate("/students/add")}
              style={{ marginTop: "16px" }}
            >
              <UserPlus size={16} />
              Add First Student
            </Button>
          )}
        </div>
      ) : (
        <div className="students-table-container">
          <table className="students-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Student Name</th>
                <th>Father Name</th>
                <th>Mobile</th>
                <th>Room</th>
                <th>Address</th>
                <th>Fee Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.map((student) => (
                <tr key={student.student_id}>
                  <td className="id-cell">{student.student_id}</td>
                  <td className="name-cell">{student.student_name}</td>
                  <td>{student.father_name}</td>
                  <td>{student.mother_mobile || student.father_mobile}</td>
                  <td>
                    <span className="room-badge">{student.room_no}</span>
                  </td>
                  <td className="address-cell">
                    {student.address_line1 || "-"}
                  </td>
                  <td>
                    <StatusBadge
                      type={student.fee_status}
                      size="sm"
                      showIcon={true}
                    />
                  </td>
                  <td>
                    <div
                      style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}
                    >
                      <button
                        className="action-btn view-btn"
                        onClick={() => handleViewDetails(student)}
                        title="View Details"
                      >
                        <Eye size={16} />
                        View
                      </button>
                      <button
                        className="action-btn edit-btn"
                        onClick={() =>
                          navigate(
                            `/students/edit/${student.student_id}?allocate=true`
                          )
                        }
                        title="Edit Student"
                      >
                        <Edit size={16} />
                        Edit
                      </button>
                      <button
                        className="action-btn print-btn"
                        onClick={() => handlePrintClick(student)}
                        title="Print Form"
                      >
                        <Printer size={16} />
                        Print
                      </button>
                      {student.room_no === "Not Allocated" && (
                        <button
                          className="action-btn allocate-btn"
                          onClick={() =>
                            navigate(
                              `/rooms/allocate?student_id=${student.student_id}`
                            )
                          }
                          title="Allocate Room"
                        >
                          <Home size={16} />
                          Allocate
                        </button>
                      )}
                      {!student.date_of_leaving &&
                        student.room_no !== "Not Allocated" && (
                          <button
                            className="action-btn checkout-btn"
                            onClick={() => handleCheckoutClick(student)}
                            title="Checkout Student"
                          >
                            <LogOut size={16} />
                            Checkout
                          </button>
                        )}
                      {canDeleteStudent(student) && (
                        <button
                          className="action-btn delete-btn"
                          onClick={() => openHardDelete(student)}
                          title="Delete Permanently"
                        >
                          <Trash2 size={16} />
                          Delete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* View Details Modal */}
      {showModal && selectedStudent && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div
            className="modal-content student-details-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h3>
                <User size={20} />
                Student Details
              </h3>
              <button className="close-btn" onClick={handleCloseModal}>
                <X size={20} />
              </button>
            </div>

            {/* Tabs */}
            <div className="modal-tabs">
              <button
                className={`tab-btn ${activeTab === "personal" ? "active" : ""
                  }`}
                onClick={() => setActiveTab("personal")}
              >
                <User size={16} />
                Personal Details
              </button>
              <button
                className={`tab-btn ${activeTab === "fee" ? "active" : ""}`}
                onClick={() => setActiveTab("fee")}
              >
                <IndianRupee size={16} />
                Fee Records
              </button>
              <button
                className={`tab-btn ${activeTab === "security" ? "active" : ""
                  }`}
                onClick={() => setActiveTab("security")}
              >
                <CreditCard size={16} />
                Security Deposit
              </button>
            </div>

            <div className="modal-body">
              {/* Student Profile Card */}
              <div className="student-profile-card">
                <div className="profile-photo">
                  <div className="photo-placeholder">
                    {selectedStudent.photo_url ? (
                      <img
                        src={getFileUrl(selectedStudent.photo_url)}
                        alt="Student"
                      />
                    ) : (
                      <User size={56} />
                    )}
                  </div>
                  <span className="photo-label">Student Photo</span>
                </div>
                <div className="profile-info">
                  <h2 className="student-title">
                    {selectedStudent.student_name}
                  </h2>
                  <p className="student-subtitle">
                    ID: {selectedStudent.student_id}
                  </p>
                  <div className="quick-stats">
                    <StatusBadge
                      type={selectedStudent.fee_status}
                      size="sm"
                      showIcon={true}
                    />
                    <div className="stat-item">
                      <Home size={16} />
                      <span>Room {selectedStudent.room_no}</span>
                    </div>
                    <div className="stat-item">
                      <Calendar size={16} />
                      <span>
                        Joined{" "}
                        {new Date(
                          selectedStudent.date_of_joining
                        ).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tab Content */}
              <div className="tab-content">
                {/* Personal Details Tab */}
                {activeTab === "personal" && (
                  <div className="tab-panel">
                    <div className="details-section">
                      <h4 className="section-title">
                        <User size={18} />
                        Personal Information
                      </h4>
                      <div className="details-grid">
                        <div className="detail-item">
                          <span className="detail-label">Full Name</span>
                          <span className="detail-value">
                            {selectedStudent.student_name}
                          </span>
                        </div>
                        <div className="detail-item">
                          <span className="detail-label">Date of Birth</span>
                          <span className="detail-value">
                            {selectedStudent.date_of_birth
                              ? new Date(
                                selectedStudent.date_of_birth
                              ).toLocaleDateString("en-IN", {
                                day: "2-digit",
                                month: "long",
                                year: "numeric",
                              })
                              : "N/A"}
                          </span>
                        </div>
                        <div className="detail-item">
                          <span className="detail-label">Student Mobile</span>
                          <span className="detail-value">
                            <Phone size={14} />
                            {selectedStudent.student_mobile || "Not Provided"}
                          </span>
                        </div>
                        <div className="detail-item">
                          <span className="detail-label">Class/Coaching</span>
                          <span className="detail-value">
                            {selectedStudent.class_or_coaching || "-"}
                          </span>
                        </div>
                        <div className="detail-item">
                          <span className="detail-label">Institute Name</span>
                          <span className="detail-value">
                            {selectedStudent.institute_name || "-"}
                          </span>
                        </div>
                        <div className="detail-item">
                          <span className="detail-label">Date of Joining</span>
                          <span className="detail-value">
                            {new Date(
                              selectedStudent.date_of_joining
                            ).toLocaleDateString("en-IN")}
                          </span>
                        </div>
                        <div className="detail-item">
                          <span className="detail-label">Gender</span>
                          <span className="detail-value">
                            {selectedStudent.gender || "-"}
                          </span>
                        </div>
                        <div className="detail-item">
                          <span className="detail-label">Payment Mode</span>
                          <span className="detail-value">
                            {selectedStudent.payment_mode || "Cash"}
                          </span>
                        </div>
                        <div className="detail-item">
                          <span className="detail-label">Fee Cycle</span>
                          <span className="detail-value">
                            {(selectedStudent.fee_type_cycle || "monthly").replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="details-section">
                      <h4 className="section-title">
                        <Users size={18} />
                        Parent & Guardian Information
                      </h4>
                      <div className="details-grid">
                        <div className="detail-item">
                          <span className="detail-label">Father's Name</span>
                          <span className="detail-value">
                            {selectedStudent.father_name}
                          </span>
                        </div>
                        <div className="detail-item">
                          <span className="detail-label">Father's Mobile</span>
                          <span className="detail-value">
                            <Phone size={14} />
                            {selectedStudent.father_mobile}
                          </span>
                        </div>
                        <div className="detail-item">
                          <span className="detail-label">Father's Email</span>
                          <span className="detail-value">
                            {selectedStudent.father_email || "-"}
                          </span>
                        </div>
                        <div className="detail-item">
                          <span className="detail-label">Mother's Name</span>
                          <span className="detail-value">
                            {selectedStudent.mother_name || "-"}
                          </span>
                        </div>
                        <div className="detail-item">
                          <span className="detail-label">Mother's Mobile</span>
                          <span className="detail-value">
                            <Phone size={14} />
                            {selectedStudent.mother_mobile || "-"}
                          </span>
                        </div>
                        <div className="detail-item">
                          <span className="detail-label">Mother's Email</span>
                          <span className="detail-value">
                            {selectedStudent.mother_email || "-"}
                          </span>
                        </div>
                        {selectedStudent.local_guardian_name && (
                          <>
                            <div className="detail-item">
                              <span className="detail-label">
                                Local Guardian
                              </span>
                              <span className="detail-value">
                                {selectedStudent.local_guardian_name}
                              </span>
                            </div>
                            <div className="detail-item">
                              <span className="detail-label">
                                Guardian Mobile
                              </span>
                              <span className="detail-value">
                                <Phone size={14} />
                                {selectedStudent.local_guardian_mobile}
                              </span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="details-section">
                      <h4 className="section-title">
                        <CreditCard size={18} />
                        Identity & Address
                      </h4>
                      <div className="details-grid">
                        <div className="detail-item">
                          <span className="detail-label">ID Type</span>
                          <span className="detail-value">
                            {selectedStudent.id_type || "-"}
                          </span>
                        </div>
                        <div className="detail-item">
                          <span className="detail-label">ID Number</span>
                          <span className="detail-value">
                            {selectedStudent.id_number || "-"}
                          </span>
                        </div>
                      </div>
                      {selectedStudent.address_line1 && (
                        <div className="address-box">
                          <MapPin size={18} />
                          <div>
                            <p>{selectedStudent.address_line1}</p>
                            {selectedStudent.address_line2 && (
                              <p>{selectedStudent.address_line2}</p>
                            )}
                            {selectedStudent.address_line3 && (
                              <p>{selectedStudent.address_line3}</p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Room Allocation */}
                    <div className="details-section">
                      <h4 className="section-title">
                        <Building2 size={18} />
                        Room Allocation
                      </h4>
                      <div className="room-allocation-card">
                        <div className="room-visual">
                          <Home size={40} />
                          <h3>Room {selectedStudent.room_no}</h3>
                        </div>
                        <div className="details-grid">
                          <div className="detail-item">
                            <span className="detail-label">Bed Number</span>
                            <span className="detail-value">
                              {selectedStudent.bed_no || "-"}
                            </span>
                          </div>
                          <div className="detail-item">
                            <span className="detail-label">Allocation Date</span>
                            <span className="detail-value">
                              {selectedStudent.allocation?.allocation_start_date
                                ? new Date(
                                  selectedStudent.allocation.allocation_start_date
                                ).toLocaleDateString("en-IN")
                                : new Date(
                                  selectedStudent.date_of_joining
                                ).toLocaleDateString("en-IN")}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Fee Records Tab */}
                {activeTab === "fee" && (
                  <div className="tab-panel">
                    <div className="details-section">
                      <h4 className="section-title">
                        <IndianRupee size={18} />
                        Fee Summary
                      </h4>

                      <div className="fee-summary-cards">
                        <div className="fee-summary-card total">
                          <div className="summary-icon">
                            <BookOpen size={24} />
                          </div>
                          <div className="summary-info">
                            <p className="summary-label">Total Fee</p>
                            <p className="summary-value">
                              ₹{" "}
                              {selectedStudent.total_fee_amount.toLocaleString(
                                "en-IN"
                              )}
                            </p>
                          </div>
                        </div>
                        <div className="fee-summary-card paid">
                          <div className="summary-icon">
                            <CheckCircle2 size={24} />
                          </div>
                          <div className="summary-info">
                            <p className="summary-label">Total Paid</p>
                            <p className="summary-value">
                              ₹{" "}
                              {selectedStudent.total_paid.toLocaleString(
                                "en-IN"
                              )}
                            </p>
                          </div>
                        </div>
                        <div className="fee-summary-card remaining">
                          <div className="summary-icon">
                            <AlertCircle size={24} />
                          </div>
                          <div className="summary-info">
                            <p className="summary-label">Remaining</p>
                            <p className="summary-value">
                              ₹{" "}
                              {selectedStudent.total_remaining.toLocaleString(
                                "en-IN"
                              )}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="fee-records-list">
                        <h5>
                          Fee Records ({selectedStudent.fees?.length || 0})
                        </h5>
                        {selectedStudent.fees &&
                          selectedStudent.fees.length > 0 ? (
                          <div className="fee-records-table">
                            <table>
                              <thead>
                                <tr>
                                  <th>Period</th>
                                  <th>Due Date</th>
                                  <th>Amount</th>
                                  <th>Paid</th>
                                  <th>Remaining</th>
                                  <th>Status</th>
                                </tr>
                              </thead>
                              <tbody>
                                {selectedStudent.fees
                                  .filter(fee => fee.fee_type !== "Security Deposit")
                                  .map((fee) => {
                                    const remaining =
                                      Number(
                                        fee.final_amount || fee.fee_amount
                                      ) - Number(fee.paid_amount || 0);
                                    return (
                                      <tr key={fee.fee_id}>
                                        <td>
                                          {fee.fee_month
                                            ? new Date(
                                              fee.fee_month
                                            ).toLocaleDateString("en-IN", {
                                              month: "short",
                                              year: "numeric",
                                            })
                                            : fee.fee_type}
                                        </td>
                                        <td>
                                          {new Date(
                                            fee.due_date
                                          ).toLocaleDateString("en-IN")}
                                        </td>
                                        <td className="amount">
                                          ₹{" "}
                                          {Number(
                                            fee.final_amount || fee.fee_amount
                                          ).toLocaleString("en-IN")}
                                        </td>
                                        <td className="paid">
                                          ₹{" "}
                                          {Number(fee.paid_amount || 0).toLocaleString(
                                            "en-IN"
                                          )}
                                        </td>
                                        <td
                                          className={
                                            remaining > 0
                                              ? "remaining"
                                              : "success"
                                          }
                                        >
                                          ₹ {remaining.toLocaleString("en-IN")}
                                        </td>
                                        <td>
                                          <StatusBadge
                                            type={fee.fee_status}
                                            size="sm"
                                            showDot={true}
                                          />
                                        </td>
                                      </tr>
                                    );
                                  })}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <div className="no-fees">
                            <IndianRupee size={36} />
                            <p>No fee records found</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Security Deposit Tab */}
                {activeTab === "security" && (
                  <div className="tab-panel">
                    <div className="details-section">
                      <h4 className="section-title">
                        <CreditCard size={18} />
                        Security Deposit Information
                      </h4>

                      {(() => {
                        const securityDepositFee = selectedStudent.fees?.find(
                          (fee) => fee.fee_type === "Security Deposit"
                        );

                        if (
                          !securityDepositFee &&
                          !selectedStudent.security_deposit
                        ) {
                          return (
                            <div className="no-fees">
                              <CreditCard size={36} />
                              <p>No security deposit record found</p>
                            </div>
                          );
                        }

                        const depositAmount = Number(
                          securityDepositFee?.fee_amount ||
                          selectedStudent.security_deposit ||
                          0
                        );
                        const paidAmount = Number(
                          securityDepositFee?.paid_amount || 0
                        );
                        const remainingAmount = depositAmount - paidAmount;
                        const totalDeductions = securityDetails?.total_deductions || 0;
                        const availableSecurity = securityDetails?.remaining_security ?? paidAmount;

                        return (
                          <>
                            <div className="security-deposit-card">
                              <div className="deposit-icon">
                                <CreditCard size={40} />
                              </div>
                              <div className="deposit-details">
                                <div className="deposit-row">
                                  <span className="deposit-label">
                                    Security Amount
                                  </span>
                                  <span className="deposit-value">
                                    ₹ {depositAmount.toLocaleString("en-IN")}
                                  </span>
                                </div>
                                <div className="deposit-row">
                                  <span className="deposit-label">
                                    Amount Paid
                                  </span>
                                  <span className="deposit-value paid">
                                    ₹ {paidAmount.toLocaleString("en-IN")}
                                  </span>
                                </div>
                                {remainingAmount > 0 && (
                                  <div className="deposit-row">
                                    <span className="deposit-label">
                                      Unpaid
                                    </span>
                                    <span className="deposit-value remaining">
                                      ₹{" "}
                                      {remainingAmount.toLocaleString("en-IN")}
                                    </span>
                                  </div>
                                )}
                                {totalDeductions > 0 && (
                                  <div className="deposit-row">
                                    <span className="deposit-label">
                                      Total Deductions
                                    </span>
                                    <span className="deposit-value" style={{ color: "#dc2626" }}>
                                      - ₹ {totalDeductions.toLocaleString("en-IN")}
                                    </span>
                                  </div>
                                )}
                                <div className="deposit-row" style={{
                                  background: "#f0f9ff",
                                  borderRadius: "6px",
                                  padding: "8px 12px",
                                  marginTop: "4px"
                                }}>
                                  <span className="deposit-label" style={{ fontWeight: "700", color: "#0369a1" }}>
                                    Available Balance
                                  </span>
                                  <span className="deposit-value" style={{ fontWeight: "700", color: "#0369a1", fontSize: "18px" }}>
                                    ₹ {availableSecurity.toLocaleString("en-IN")}
                                  </span>
                                </div>
                                <div className="deposit-row">
                                  <span className="deposit-label">
                                    Payment Status
                                  </span>
                                  <StatusBadge
                                    type={
                                      securityDepositFee?.fee_status ||
                                      (remainingAmount > 0 ? "DUE" : "PAID")
                                    }
                                    size="sm"
                                    showIcon={true}
                                  />
                                </div>
                                <div className="deposit-row">
                                  <span className="deposit-label">
                                    Refund Status
                                  </span>
                                  <span
                                    className={`deposit-status ${selectedStudent.date_of_leaving
                                      ? "refundable"
                                      : "active"
                                      }`}
                                  >
                                    {selectedStudent.date_of_leaving
                                      ? "Eligible for Refund"
                                      : "Active - Non-Refundable"}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Deduction History */}
                            {securityDetails?.deductions && securityDetails.deductions.length > 0 && (
                              <div style={{
                                marginTop: "16px",
                                background: "#fef2f2",
                                border: "1px solid #fecaca",
                                borderRadius: "8px",
                                padding: "12px 16px"
                              }}>
                                <h5 style={{ margin: "0 0 10px", color: "#991b1b", fontSize: "14px" }}>
                                  Deduction History
                                </h5>
                                {securityDetails.deductions.map((d, i) => (
                                  <div key={i} style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    padding: "6px 0",
                                    borderBottom: i < securityDetails.deductions.length - 1 ? "1px solid #fecaca" : "none",
                                    fontSize: "13px"
                                  }}>
                                    <div>
                                      <strong style={{ color: "#991b1b" }}>{d.type}</strong>
                                      <span style={{ color: "#64748b", marginLeft: "8px" }}>
                                        {d.description || "N/A"}
                                      </span>
                                    </div>
                                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                                      <span style={{ color: "#dc2626", fontWeight: "600" }}>
                                        -₹{Number(d.amount).toLocaleString("en-IN")}
                                      </span>
                                      <span style={{ color: "#94a3b8", fontSize: "11px" }}>
                                        {new Date(d.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}

                            <div className="security-note">
                              <AlertCircle size={18} />
                              <p>
                                Security deposit is refundable upon room
                                checkout and clearance of all dues.
                              </p>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="modal-footer">
              <Button
                variant="secondary"
                onClick={() => handlePrintClick(selectedStudent)}
              >
                <Printer size={16} />
                Print Form
              </Button>
              <Button variant="secondary" onClick={handleCloseModal}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Checkout Modal */}
      {showCheckoutModal && checkoutStudent && (
        <CheckoutModal
          student={checkoutStudent}
          onClose={handleCloseCheckoutModal}
          onConfirm={handleCheckoutConfirm}
        />
      )}

      {/* Print Preview Modal */}
      {showPrintPreview && printStudent && (
        <div className="modal-overlay" onClick={closePrintPreview}>
          <div
            className="modal-content print-preview-modal"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: "900px", width: "95%" }}
          >
            <div className="modal-header">
              <h3>
                <Printer size={20} />
                Print Admission Form - {printStudent.student_name}
              </h3>
              <button className="close-btn" onClick={closePrintPreview}>
                <X size={20} />
              </button>
            </div>

            <div
              className="modal-body"
              style={{
                maxHeight: "65vh",
                overflow: "auto",
                background: "#f3f4f6",
                padding: "20px",
              }}
            >
              <div
                ref={printPreviewRef}
                style={{
                  background: "#fff",
                  borderRadius: "8px",
                  boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
                }}
              >
                <StudentAdmissionForm
                  hostelInfo={printHostelInfo || hostelInfo}
                  studentData={{
                    ...printStudent,
                    form_date:
                      printStudent.form_date || printStudent.date_of_joining,
                    photo_url:
                      printStudent.photo_base64 || printStudent.photo_url,
                  }}
                  allocationData={{
                    room_no: printStudent.room_no || "Not Allocated",
                    bed_no: printStudent.bed_no || "N/A",
                    allocation_start_date:
                      printStudent.allocation?.allocation_start_date ||
                      printStudent.date_of_joining,
                  }}
                  feeData={{
                    monthly_fee:
                      printStudent.monthly_fee ||
                      printStudent.fees?.[0]?.fee_amount ||
                      0,
                    security_deposit: printStudent.security_deposit || 0,
                    advance_months: printStudent.fees?.length || 1,
                  }}
                  rules={hostelRules}
                />
              </div>
            </div>

            <div className="modal-footer">
              <Button variant="secondary" onClick={closePrintPreview}>
                Cancel
              </Button>
              <Button variant="primary" onClick={triggerPrint}>
                <Printer size={16} />
                Print Now
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Hard Delete Modal */}
      {showHardDeleteModal && hardDeleteStudent && (
        <HardDeleteStudentModal
          student={hardDeleteStudent}
          onClose={handleCloseHardDeleteModal}
          onConfirm={confirmHardDelete}
        />
      )}

      {/* Drafts Modal */}
      {showDraftsModal && (
        <div className="modal-overlay" onClick={() => setShowDraftsModal(false)}>
          <div
            className="modal-content"
            style={{ maxWidth: "620px", background: "#fff", padding: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ padding: "16px 20px", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0, fontSize: "18px", display: "flex", alignItems: "center", gap: "8px" }}>
                <FileText size={20} /> Saved Drafts
              </h3>
              <button
                onClick={() => setShowDraftsModal(false)}
                style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}
              >
                <X size={20} />
              </button>
            </div>
            <div style={{ maxHeight: "60vh", overflowY: "auto", padding: "16px 20px" }}>
              {drafts.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px 20px", color: "#64748b" }}>
                  <FileText size={40} style={{ margin: "0 auto 8px", opacity: 0.5 }} />
                  <p style={{ margin: 0 }}>No drafts saved yet.</p>
                  <p style={{ fontSize: "13px", marginTop: "6px" }}>
                    Click "Save as Draft" while adding a student to save progress.
                  </p>
                </div>
              ) : (
                drafts.map((d) => {
                  const name = d.studentData?.student_name?.trim() || "(Unnamed student)";
                  const father = d.studentData?.father_name || "";
                  const updatedAt = d.updated_at ? new Date(d.updated_at).toLocaleString("en-IN") : "";
                  return (
                    <div
                      key={d.id}
                      style={{
                        border: "1px solid #e2e8f0",
                        borderRadius: "10px",
                        padding: "12px 14px",
                        marginBottom: "10px",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: "12px"
                      }}
                    >
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontWeight: 600, color: "#1e293b" }}>{name}</div>
                        {father && (
                          <div style={{ fontSize: "12px", color: "#64748b" }}>Father: {father}</div>
                        )}
                        <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "4px" }}>
                          Saved: {updatedAt} • Step {d.currentStep || 1}
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: "6px" }}>
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => {
                            setShowDraftsModal(false);
                            navigate("/students/add", { state: { draftId: d.id } });
                          }}
                        >
                          Continue
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => {
                            const remaining = deleteDraft(d.id);
                            setDrafts(remaining);
                          }}
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Students;