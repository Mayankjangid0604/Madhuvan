import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Save,
  User,
  Phone,
  Calendar,
  MapPin,
  CreditCard,
  BookOpen,
  AlertCircle,
  RefreshCw,
  Camera,
  X,
  CheckCircle,
  Loader2,
  Upload,
  Trash2,
  Home,
  FileText,
  Shield,
  Repeat,
  IndianRupee,
  Check
} from "lucide-react";
import { studentAPI } from "../../../services/api/student.api.js";
import { roomAPI } from "../../../services/api/room.api.js";
import Button from "../../../components/buttons/Button.jsx";
import PageHeader from "../../../components/layout/PageHeader.jsx";
import ConfirmModal from "../../../components/modals/ConfirmModal";
import DateInput from "../../../components/common/DateInput";
import { getFileUrl } from "../../../utils/imageSrc.js";
import "./editStudent.css";

// Initial state constants
const INITIAL_STUDENT_DATA = {
  form_date: "",
  student_name: "",
  date_of_birth: "",
  student_mobile: "",
  class_or_coaching: "",
  institute_name: "",
  date_of_joining: "",
  date_of_leaving: null,
  father_name: "",
  father_mobile: "",
  father_email: "",
  mother_name: "",
  mother_mobile: "",
  mother_email: "",
  local_guardian_name: "",
  local_guardian_relation: "",
  local_guardian_mobile: "",
  id_type: "Aadhar",
  id_number: "",
  address_line1: "",
  address_line2: "",
  address_line3: ""
};

const INITIAL_FEE_DATA = {
  fee_type_cycle: "monthly",
  payment_mode: "cash",
  monthly_fee: "",
  half_yearly_fee: "",
  yearly_fee: "",
  next_fee_date: "",
  fee_start_date: "",
  security_deposit: "",
  has_discount: false,
  discount_type: "percentage",
  discount_value: "",
  discount_applicable: "all_months",
  discount_on_full_month: true
};



const EditStudent = () => {
  const navigate = useNavigate();
  const { id } = useParams();

  // All state declarations
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errors, setErrors] = useState({});
  const [currentAllocation, setCurrentAllocation] = useState(null);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [originalPhoto, setOriginalPhoto] = useState(null);
  const [studentData, setStudentData] = useState(INITIAL_STUDENT_DATA);
  const [feeData, setFeeData] = useState(INITIAL_FEE_DATA);
  const [hasChanges, setHasChanges] = useState(false);

  // NEW: Custom confirm modal state
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: null,
    onCancel: null,
    type: "warning"
  });

  // Refs for cleanup
  const isMountedRef = useRef(true);
  const timeoutsRef = useRef([]);
  const photoPreviewUrlRef = useRef(null);
  const isInitialLoad = useRef(true);
  const previousId = useRef(id);
  const abortControllerRef = useRef(null);
  // NEW: Ref to track original data for comparison
  const originalDataRef = useRef({ student: null, fee: null });

  // Fee Type Options
  const feeTypeOptions = [
    { value: "monthly", label: "Monthly", description: "Fee collected every month", icon: "📅" },
    { value: "half_yearly", label: "Half-Yearly", description: "Fee collected 2 times per year", icon: "📆" },
    { value: "yearly", label: "Yearly", description: "Fee collected once per year", icon: "🗓️" }
  ];

  // ===== CUSTOM CONFIRM HELPER =====
  const showConfirm = useCallback((title, message) => {
    return new Promise((resolve) => {
      setConfirmModal({
        isOpen: true,
        title,
        message,
        onConfirm: () => {
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
          // Use requestAnimationFrame to ensure modal is fully
          // closed before resolving
          requestAnimationFrame(() => {
            resolve(true);
          });
        },
        onCancel: () => {
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
          requestAnimationFrame(() => {
            resolve(false);
          });
        }
      });
    });
  }, []);

  // ===== CLEANUP FUNCTIONS =====

  const clearAllTimeouts = useCallback(() => {
    timeoutsRef.current.forEach(timeoutId => clearTimeout(timeoutId));
    timeoutsRef.current = [];
  }, []);

  const safeSetTimeout = useCallback((callback, delay) => {
    const timeoutId = setTimeout(() => {
      if (isMountedRef.current) {
        callback();
      }
    }, delay);
    timeoutsRef.current.push(timeoutId);
    return timeoutId;
  }, []);

  const cleanupObjectUrls = useCallback(() => {
    if (photoPreviewUrlRef.current) {
      URL.revokeObjectURL(photoPreviewUrlRef.current);
      photoPreviewUrlRef.current = null;
    }
  }, []);

  const resetState = useCallback(() => {
    clearAllTimeouts();
    cleanupObjectUrls();
    setStudentData(INITIAL_STUDENT_DATA);
    setFeeData(INITIAL_FEE_DATA);
    setPhotoFile(null);
    setPhotoPreview(null);
    setOriginalPhoto(null);
    setErrors({});
    setSuccessMessage("");
    setErrorMessage("");
    setCurrentAllocation(null);
    setHasChanges(false);
    setLoading(false);
    setRefreshing(false);
    setConfirmModal({ isOpen: false, title: "", message: "", onConfirm: null, onCancel: null });
    isInitialLoad.current = true;
    originalDataRef.current = { student: null, fee: null };
  }, [clearAllTimeouts, cleanupObjectUrls]);

  // ===== EFFECTS =====

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
      timeoutsRef.current.forEach(timeoutId => clearTimeout(timeoutId));
      timeoutsRef.current = [];
      if (photoPreviewUrlRef.current) {
        URL.revokeObjectURL(photoPreviewUrlRef.current);
        photoPreviewUrlRef.current = null;
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (previousId.current !== id) {
      resetState();
      previousId.current = id;
    }
  }, [id, resetState]);

  // Fetch student data
  const fetchStudentData = useCallback(async (isRefresh = false) => {
    if (!isMountedRef.current) return;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setFetchLoading(true);
      }
      setErrorMessage("");

      const [studentRes, allocationsRes] = await Promise.all([
        studentAPI.getStudentById(id),
        roomAPI.getActiveAllocations()
      ]);

      if (!isMountedRef.current) return;

      const student = studentRes.data.data;

      const newStudentData = {
        form_date: student.form_date?.split('T')[0] || "",
        student_name: student.student_name || "",
        date_of_birth: student.date_of_birth?.split('T')[0] || "",
        student_mobile: student.student_mobile || "",
        class_or_coaching: student.class_or_coaching || "",
        institute_name: student.institute_name || "",
        date_of_joining: student.date_of_joining?.split('T')[0] || "",
        date_of_leaving: student.date_of_leaving?.split('T')[0] || null,
        father_name: student.father_name || "",
        father_mobile: student.father_mobile || "",
        father_email: student.father_email || "",
        mother_name: student.mother_name || "",
        mother_mobile: student.mother_mobile || "",
        mother_email: student.mother_email || "",
        local_guardian_name: student.local_guardian_name || "",
        local_guardian_relation: student.local_guardian_relation || "",
        local_guardian_mobile: student.local_guardian_mobile || "",
        id_type: student.id_type || "Aadhar",
        id_number: student.id_number || "",
        address_line1: student.address_line1 || "",
        address_line2: student.address_line2 || "",
        address_line3: student.address_line3 || ""
      };

      const feeType = student.fee_type_cycle || "monthly";
      const newFeeData = {
        fee_type_cycle: feeType,
        payment_mode: student.payment_mode === 'online' ? 'online' : 'cash',
        monthly_fee: feeType === "monthly" ? student.monthly_fee || "" : "",
        half_yearly_fee: feeType === "half_yearly" ? student.monthly_fee || "" : "",
        yearly_fee: feeType === "yearly" ? student.monthly_fee || "" : "",
        next_fee_date: student.next_fee_due_date?.split('T')[0] || "",
        fee_start_date: student.fee_start_month?.split('T')[0] || "",
        security_deposit: student.security_deposit || "",
        has_discount: student.has_discount === 1,
        discount_type: student.discount_type || "percentage",
        discount_value: student.discount_value || "",
        discount_applicable: student.discount_applicable || "all_months",
        discount_on_full_month: student.discount_on_full_month === 1
      };

      setStudentData(newStudentData);
      setFeeData(newFeeData);

      // Store original data for change detection
      originalDataRef.current = {
        student: { ...newStudentData },
        fee: { ...newFeeData }
      };

      if (student.photo_url) {
        setPhotoPreview(student.photo_url);
        setOriginalPhoto(student.photo_url);
      } else {
        setPhotoPreview(null);
        setOriginalPhoto(null);
      }

      const allocations = allocationsRes.data.data || [];
      const allocation = allocations.find(a => a.student_id === parseInt(id));
      setCurrentAllocation(allocation || null);

      // Use requestAnimationFrame instead of setTimeout for 
      // more reliable timing
      requestAnimationFrame(() => {
        if (isMountedRef.current) {
          isInitialLoad.current = false;
          setHasChanges(false);
        }
      });

      if (isRefresh && isMountedRef.current) {
        setSuccessMessage("Data refreshed successfully!");
        safeSetTimeout(() => setSuccessMessage(""), 3000);
      }

    } catch (error) {
      if (!isMountedRef.current) return;
      if (error.name === 'AbortError') return;

      console.error("Failed to fetch student:", error);
      setErrorMessage("Failed to load student data. Please try again.");
    } finally {
      if (isMountedRef.current) {
        setFetchLoading(false);
        setRefreshing(false);
      }
    }
  }, [id, safeSetTimeout]);

  useEffect(() => {
    if (id) {
      fetchStudentData();
    }
  }, [id, fetchStudentData]);

  // FIX: Better change detection using deep comparison 
  // instead of effect on every render
  const checkForChanges = useCallback(() => {
    if (isInitialLoad.current) return false;
    if (!originalDataRef.current.student) return false;
    if (photoFile) return true;

    const origStudent = originalDataRef.current.student;
    const origFee = originalDataRef.current.fee;

    const studentChanged = Object.keys(origStudent).some(
      key => origStudent[key] !== studentData[key]
    );
    const feeChanged = Object.keys(origFee).some(
      key => origFee[key] !== feeData[key]
    );

    return studentChanged || feeChanged;
  }, [studentData, feeData, photoFile]);

  // Track changes with proper comparison
  useEffect(() => {
    if (!isInitialLoad.current && isMountedRef.current) {
      const changed = checkForChanges();
      setHasChanges(changed);
    }
  }, [checkForChanges]);

  // Half-yearly default date
  useEffect(() => {
    if (
      feeData.fee_type_cycle === "half_yearly" &&
      !feeData.next_fee_date &&
      !isInitialLoad.current
    ) {
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() + 6);
      if (isMountedRef.current) {
        setFeeData(prev => ({
          ...prev,
          next_fee_date: startDate.toISOString().split('T')[0]
        }));
      }
    }
  }, [feeData.fee_type_cycle, feeData.next_fee_date]);

  // ===== HANDLERS =====

  const handleRefresh = useCallback(() => {
    fetchStudentData(true);
  }, [fetchStudentData]);

  const getApplicableFeeAmount = useCallback(() => {
    switch (feeData.fee_type_cycle) {
      case "monthly": return Number(feeData.monthly_fee) || 0;
      case "half_yearly": return Number(feeData.half_yearly_fee) || 0;
      case "yearly": return Number(feeData.yearly_fee) || 0;
      default: return 0;
    }
  }, [feeData]);

  const validateForm = useCallback(() => {
    const newErrors = {};

    if (!studentData.student_name.trim()) {
      newErrors.student_name = "Student name is required";
    }
    if (!studentData.date_of_birth) {
      newErrors.date_of_birth = "Date of birth is required";
    }
    if (!studentData.class_or_coaching.trim()) {
      newErrors.class_or_coaching = "Class/Coaching is required";
    }
    if (!studentData.institute_name.trim()) {
      newErrors.institute_name = "Institute name is required";
    }
    if (!studentData.father_name.trim()) {
      newErrors.father_name = "Father's name is required";
    }
    if (!studentData.father_mobile.trim()) {
      newErrors.father_mobile = "Father's mobile is required";
    } else if (!/^\d{10}$/.test(studentData.father_mobile)) {
      newErrors.father_mobile = "Invalid mobile number";
    }
    if (!studentData.mother_name.trim()) {
      newErrors.mother_name = "Mother's name is required";
    }
    if (!studentData.mother_mobile.trim()) {
      newErrors.mother_mobile = "Mother's mobile is required";
    } else if (!/^\d{10}$/.test(studentData.mother_mobile)) {
      newErrors.mother_mobile = "Invalid mobile number";
    }
    if (
      studentData.student_mobile &&
      !/^\d{10}$/.test(studentData.student_mobile)
    ) {
      newErrors.student_mobile = "Invalid mobile number";
    }
    if (
      studentData.local_guardian_mobile &&
      !/^\d{10}$/.test(studentData.local_guardian_mobile)
    ) {
      newErrors.local_guardian_mobile = "Invalid mobile number";
    }

    if (feeData.fee_type_cycle === "monthly") {
      if (!feeData.monthly_fee || Number(feeData.monthly_fee) <= 0) {
        newErrors.monthly_fee = "Monthly fee must be greater than 0";
      }
    } else if (feeData.fee_type_cycle === "half_yearly") {
      if (!feeData.half_yearly_fee || Number(feeData.half_yearly_fee) <= 0) {
        newErrors.half_yearly_fee = "Half-yearly fee must be greater than 0";
      }
      if (!feeData.next_fee_date) {
        newErrors.next_fee_date = "Next fee date is required";
      }
    } else if (feeData.fee_type_cycle === "yearly") {
      if (!feeData.yearly_fee || Number(feeData.yearly_fee) <= 0) {
        newErrors.yearly_fee = "Yearly fee must be greater than 0";
      }
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (studentData.father_email && !emailRegex.test(studentData.father_email)) {
      newErrors.father_email = "Invalid email format";
    }
    if (studentData.mother_email && !emailRegex.test(studentData.mother_email)) {
      newErrors.mother_email = "Invalid email format";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [studentData, feeData]);

  // FIX: Main submit handler using custom modal instead of 
  // window.confirm
  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();

    if (!isMountedRef.current) return;
    if (loading) return;

    setSuccessMessage("");
    setErrorMessage("");

    if (!validateForm()) {
      setErrorMessage("Please fix all validation errors before submitting");
      return;
    }

    // Use custom confirm modal instead of window.confirm
    const confirmed = await showConfirm(
      "Update Student",
      "Are you sure you want to update this student's information?"
    );

    if (!confirmed) return;
    if (!isMountedRef.current) return;

    setLoading(true);

    try {
      const feeAmount = getApplicableFeeAmount();

      const updateData = {
        ...studentData,
        fee_type_cycle: feeData.fee_type_cycle,
        payment_mode: feeData.payment_mode || 'cash',
        monthly_fee: feeAmount,
        security_deposit: feeData.security_deposit || 0,
        fee_start_month: feeData.fee_start_date || null,
        next_fee_due_date: feeData.fee_type_cycle === "half_yearly"
          ? feeData.next_fee_date
          : null,
        has_discount: feeData.has_discount,
        discount_type: feeData.discount_type,
        discount_value: feeData.discount_value,
        discount_applicable: feeData.discount_applicable,
        discount_on_full_month: feeData.discount_on_full_month
      };

      await studentAPI.updateStudent(id, updateData);

      if (photoFile) {
        const photoForm = new FormData();
        photoForm.append("photo", photoFile);
        await studentAPI.uploadPhoto(id, photoForm);
      }

      if (!isMountedRef.current) return;

      setLoading(false);
      setHasChanges(false);

      navigate('/students', { replace: true });

    } catch (error) {
      console.error("Error updating student:", error);

      if (isMountedRef.current) {
        setErrorMessage(
          error.response?.data?.message || "Failed to update student"
        );
        setLoading(false);
      }
    }
  }, [
    loading, validateForm, showConfirm, getApplicableFeeAmount,
    studentData, feeData, id, photoFile, navigate
  ]);

  const handlePhotoChange = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMessage("Please select a valid image file");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage("Image size should be less than 5MB");
      return;
    }

    cleanupObjectUrls();

    const newPreviewUrl = URL.createObjectURL(file);
    photoPreviewUrlRef.current = newPreviewUrl;

    setPhotoFile(file);
    setPhotoPreview(newPreviewUrl);

    e.target.value = '';
  }, [cleanupObjectUrls]);

  const handleRemovePhoto = useCallback(() => {
    cleanupObjectUrls();
    setPhotoFile(null);
    setPhotoPreview(originalPhoto);
  }, [originalPhoto, cleanupObjectUrls]);

  const clearInput = useCallback((field, dataType = 'student') => {
    if (!isMountedRef.current) return;

    if (dataType === 'student') {
      setStudentData(prev => ({ ...prev, [field]: '' }));
    } else {
      setFeeData(prev => ({ ...prev, [field]: '' }));
    }
  }, []);

  const handleStudentDataChange = useCallback((field, value) => {
    if (!isMountedRef.current) return;
    setStudentData(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleFeeDataChange = useCallback((field, value) => {
    if (!isMountedRef.current) return;
    setFeeData(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleFeeTypeChange = useCallback((value) => {
    if (!isMountedRef.current) return;
    setFeeData(prev => ({
      fee_type_cycle: value,
      monthly_fee: "",
      half_yearly_fee: "",
      yearly_fee: "",
      next_fee_date: "",
      security_deposit: prev.security_deposit
    }));
  }, []);

  // FIX: Cancel handler using custom modal
  const handleCancel = useCallback(async () => {
    if (loading) return;

    if (hasChanges) {
      const confirmed = await showConfirm(
        "Discard Changes",
        "You have unsaved changes. Are you sure you want to leave?"
      );
      if (!confirmed) return;
    }

    if (isMountedRef.current) {
      navigate('/students', { replace: true });
    }
  }, [hasChanges, loading, navigate, showConfirm]);

  // FIX: Back handler using custom modal
  const handleBackToStudents = useCallback(async () => {
    if (loading) return;

    if (hasChanges) {
      const confirmed = await showConfirm(
        "Discard Changes",
        "You have unsaved changes. Are you sure you want to leave?"
      );
      if (!confirmed) return;
    }

    if (isMountedRef.current) {
      navigate('/students', { replace: true });
    }
  }, [hasChanges, loading, navigate, showConfirm]);

  // ===== RENDER =====

  if (fetchLoading) {
    return (
      <div className="edit-student">
        <div className="loading-container">
          <div className="loading-spinner">
            <Loader2 className="spin" size={48} />
          </div>
          <h3>Loading Student Data</h3>
          <p>Please wait while we fetch the student information...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="edit-student" key={`edit-student-${id}`}>
      {/* Custom Confirm Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onCancel={confirmModal.onCancel}
      />

      <PageHeader
        title={`Edit Student: ${studentData.student_name}`}
        subtitle={`Student ID: #${id} • Last updated: ${new Date().toLocaleDateString()}`}
        action={
          <div className="header-actions">
            <Button
              variant="ghost"
              onClick={handleRefresh}
              disabled={refreshing || loading}
              className={`refresh-btn ${refreshing ? 'spinning' : ''}`}
              type="button"
            >
              <RefreshCw size={16} className={refreshing ? 'spin' : ''} />
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </Button>
            <Button
              variant="secondary"
              onClick={handleBackToStudents}
              disabled={loading}
              type="button"
            >
              <ArrowLeft size={16} />
              Back to Students
            </Button>
          </div>
        }
      />

      {successMessage && (
        <div className="message-banner success">
          <CheckCircle size={20} />
          <span>{successMessage}</span>
          <button
            onClick={() => setSuccessMessage("")}
            className="close-btn"
            type="button"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="message-banner error">
          <AlertCircle size={20} />
          <span>{errorMessage}</span>
          <button
            onClick={() => setErrorMessage("")}
            className="close-btn"
            type="button"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {currentAllocation && (
        <div className="allocation-info-banner">
          <div className="banner-icon">
            <Home size={24} />
          </div>
          <div className="banner-content">
            <div className="banner-title">Current Room Allocation</div>
            <div className="banner-details">
              <span className="detail-badge room">
                Room {currentAllocation.room_no}
              </span>
              <span className="detail-badge bed">
                Bed {currentAllocation.bed_no}
              </span>
              <span className="detail-badge floor">
                Floor {currentAllocation.floor_no}
              </span>
            </div>
            <p className="banner-hint">
              To change room allocation, use the Rooms page or checkout and reallocate.
            </p>
          </div>
        </div>
      )}

      <div className="form-card">
        <form onSubmit={handleSubmit} noValidate>
          {/* Photo Upload Section */}
          <div className="form-section">
            <div className="section-header">
              <div className="section-icon">
                <Camera size={20} />
              </div>
              <div className="section-info">
                <h3>Student Photo</h3>
                <p>Upload a clear photo of the student</p>
              </div>
            </div>

            <div className="photo-upload-container">
              <div className="photo-preview-wrapper">
                {photoPreview ? (
                  <div className="photo-preview">
                    <img
                      src={photoFile ? photoPreview : getFileUrl(photoPreview)}
                      alt="Student"
                      onError={(e) => {
                        e.target.src = '/placeholder-avatar.png';
                      }}
                    />
                    <div className="photo-overlay">
                      <label className="photo-edit-btn" htmlFor="photo-input">
                        <Camera size={16} />
                        Change
                      </label>
                      {photoFile && (
                        <button
                          type="button"
                          className="photo-remove-btn"
                          onClick={handleRemovePhoto}
                        >
                          <Trash2 size={16} />
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <label className="photo-placeholder" htmlFor="photo-input">
                    <Upload size={32} />
                    <span>Upload Photo</span>
                    <small>JPG, PNG (Max 5MB)</small>
                  </label>
                )}
                <input
                  type="file"
                  id="photo-input"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  className="photo-input-hidden"
                  disabled={loading}
                />
              </div>
              <div className="photo-guidelines">
                <h4>Photo Guidelines</h4>
                <ul>
                  <li>Use a recent passport-size photo</li>
                  <li>Face should be clearly visible</li>
                  <li>Plain background preferred</li>
                  <li>Maximum file size: 5MB</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Personal Information */}
          <div className="form-section">
            <div className="section-header">
              <div className="section-icon">
                <User size={20} />
              </div>
              <div className="section-info">
                <h3>Personal Information</h3>
                <p>Basic details about the student</p>
              </div>
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="form_date">Form Date</label>
                <div className="input-wrapper">
                  <Calendar size={18} className="input-icon" />
                  <DateInput
                    id="form_date"
                    value={studentData.form_date}
                    onChange={(val) => handleStudentDataChange('form_date', val)}
                    className="form-input with-icon"
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="student_name">
                  Student Name <span className="required">*</span>
                </label>
                <div className="input-wrapper">
                  <User size={18} className="input-icon" />
                  <input
                    type="text"
                    id="student_name"
                    value={studentData.student_name}
                    onChange={(e) => handleStudentDataChange('student_name', e.target.value)}
                    className={`form-input with-icon ${errors.student_name ? 'error' : ''}`}
                    placeholder="Enter student name"
                    disabled={loading}
                  />
                  {studentData.student_name && !loading && (
                    <button
                      type="button"
                      className="clear-input-btn"
                      onClick={() => clearInput('student_name')}
                      aria-label="Clear"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
                {errors.student_name && (
                  <span className="error-text">
                    <AlertCircle size={12} />
                    {errors.student_name}
                  </span>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="date_of_birth">
                  Date of Birth <span className="required">*</span>
                </label>
                <div className="input-wrapper">
                  <Calendar size={18} className="input-icon" />
                  <DateInput
                    id="date_of_birth"
                    value={studentData.date_of_birth}
                    onChange={(val) => handleStudentDataChange('date_of_birth', val)}
                    className={`form-input with-icon ${errors.date_of_birth ? 'error' : ''}`}
                    disabled={loading}
                  />
                </div>
                {errors.date_of_birth && (
                  <span className="error-text">
                    <AlertCircle size={12} />
                    {errors.date_of_birth}
                  </span>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="student_mobile">Student Mobile</label>
                <div className="input-wrapper">
                  <Phone size={18} className="input-icon" />
                  <input
                    type="tel"
                    id="student_mobile"
                    value={studentData.student_mobile}
                    onChange={(e) => handleStudentDataChange(
                      'student_mobile',
                      e.target.value.replace(/\D/g, '').slice(0, 10)
                    )}
                    className={`form-input with-icon ${errors.student_mobile ? 'error' : ''}`}
                    placeholder="10 digit mobile"
                    maxLength="10"
                    disabled={loading}
                  />
                  {studentData.student_mobile && !loading && (
                    <button
                      type="button"
                      className="clear-input-btn"
                      onClick={() => clearInput('student_mobile')}
                      aria-label="Clear"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
                {errors.student_mobile && (
                  <span className="error-text">
                    <AlertCircle size={12} />
                    {errors.student_mobile}
                  </span>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="class_or_coaching">
                  Class/Coaching <span className="required">*</span>
                </label>
                <div className="input-wrapper">
                  <BookOpen size={18} className="input-icon" />
                  <input
                    type="text"
                    id="class_or_coaching"
                    value={studentData.class_or_coaching}
                    onChange={(e) => handleStudentDataChange('class_or_coaching', e.target.value)}
                    className={`form-input with-icon ${errors.class_or_coaching ? 'error' : ''}`}
                    placeholder="e.g., 12th Science, JEE"
                    disabled={loading}
                  />
                  {studentData.class_or_coaching && !loading && (
                    <button
                      type="button"
                      className="clear-input-btn"
                      onClick={() => clearInput('class_or_coaching')}
                      aria-label="Clear"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
                {errors.class_or_coaching && (
                  <span className="error-text">
                    <AlertCircle size={12} />
                    {errors.class_or_coaching}
                  </span>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="institute_name">
                  Institute Name <span className="required">*</span>
                </label>
                <div className="input-wrapper">
                  <Home size={18} className="input-icon" />
                  <input
                    type="text"
                    id="institute_name"
                    value={studentData.institute_name}
                    onChange={(e) => handleStudentDataChange('institute_name', e.target.value)}
                    className={`form-input with-icon ${errors.institute_name ? 'error' : ''}`}
                    placeholder="School/College/Coaching name"
                    disabled={loading}
                  />
                  {studentData.institute_name && !loading && (
                    <button
                      type="button"
                      className="clear-input-btn"
                      onClick={() => clearInput('institute_name')}
                      aria-label="Clear"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
                {errors.institute_name && (
                  <span className="error-text">
                    <AlertCircle size={12} />
                    {errors.institute_name}
                  </span>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="date_of_joining">
                  Date of Joining <span className="required">*</span>
                </label>
                <div className="input-wrapper">
                  <Calendar size={18} className="input-icon" />
                  <DateInput
                    id="date_of_joining"
                    value={studentData.date_of_joining}
                    onChange={(val) => handleStudentDataChange('date_of_joining', val)}
                    className="form-input with-icon"
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="date_of_leaving">Date of Leaving</label>
                <div className="input-wrapper">
                  <Calendar size={18} className="input-icon" />
                  <DateInput
                    id="date_of_leaving"
                    value={studentData.date_of_leaving || ""}
                    onChange={(val) => handleStudentDataChange(
                      'date_of_leaving',
                      val || null
                    )}
                    className="form-input with-icon"
                    disabled={loading}
                  />
                </div>
                <small className="help-text">
                  Leave empty if student is still active
                </small>
              </div>
            </div>
          </div>

          {/* Parent & Guardian Information */}
          <div className="form-section">
            <div className="section-header">
              <div className="section-icon parent-icon">
                <Phone size={20} />
              </div>
              <div className="section-info">
                <h3>Parent & Guardian Information</h3>
                <p>Contact details for parents and local guardian</p>
              </div>
            </div>

            <div className="parent-cards">
              <div className="parent-card">
                <div className="parent-card-header father">
                  <User size={20} />
                  <span>Father's Details</span>
                </div>
                <div className="parent-card-body">
                  <div className="form-group">
                    <label htmlFor="father_name">
                      Name <span className="required">*</span>
                    </label>
                    <input
                      type="text"
                      id="father_name"
                      value={studentData.father_name}
                      onChange={(e) => handleStudentDataChange('father_name', e.target.value)}
                      className={`form-input ${errors.father_name ? 'error' : ''}`}
                      placeholder="Father's full name"
                      disabled={loading}
                    />
                    {errors.father_name && (
                      <span className="error-text">
                        <AlertCircle size={12} />
                        {errors.father_name}
                      </span>
                    )}
                  </div>

                  <div className="form-group">
                    <label htmlFor="father_mobile">
                      Mobile <span className="required">*</span>
                    </label>
                    <input
                      type="tel"
                      id="father_mobile"
                      value={studentData.father_mobile}
                      onChange={(e) => handleStudentDataChange(
                        'father_mobile',
                        e.target.value.replace(/\D/g, '').slice(0, 10)
                      )}
                      className={`form-input ${errors.father_mobile ? 'error' : ''}`}
                      placeholder="10 digit mobile"
                      maxLength="10"
                      disabled={loading}
                    />
                    {errors.father_mobile && (
                      <span className="error-text">
                        <AlertCircle size={12} />
                        {errors.father_mobile}
                      </span>
                    )}
                  </div>

                  <div className="form-group">
                    <label htmlFor="father_email">Email</label>
                    <input
                      type="email"
                      id="father_email"
                      value={studentData.father_email}
                      onChange={(e) => handleStudentDataChange('father_email', e.target.value)}
                      className={`form-input ${errors.father_email ? 'error' : ''}`}
                      placeholder="father@example.com"
                      disabled={loading}
                    />
                    {errors.father_email && (
                      <span className="error-text">
                        <AlertCircle size={12} />
                        {errors.father_email}
                      </span>
                    )}
                    <small className="help-text">For fee reminder emails</small>
                  </div>
                </div>
              </div>

              <div className="parent-card">
                <div className="parent-card-header mother">
                  <User size={20} />
                  <span>Mother's Details</span>
                </div>
                <div className="parent-card-body">
                  <div className="form-group">
                    <label htmlFor="mother_name">
                      Name <span className="required">*</span>
                    </label>
                    <input
                      type="text"
                      id="mother_name"
                      value={studentData.mother_name}
                      onChange={(e) => handleStudentDataChange('mother_name', e.target.value)}
                      className={`form-input ${errors.mother_name ? 'error' : ''}`}
                      placeholder="Mother's full name"
                      disabled={loading}
                    />
                    {errors.mother_name && (
                      <span className="error-text">
                        <AlertCircle size={12} />
                        {errors.mother_name}
                      </span>
                    )}
                  </div>

                  <div className="form-group">
                    <label htmlFor="mother_mobile">
                      Mobile <span className="required">*</span>
                    </label>
                    <input
                      type="tel"
                      id="mother_mobile"
                      value={studentData.mother_mobile}
                      onChange={(e) => handleStudentDataChange(
                        'mother_mobile',
                        e.target.value.replace(/\D/g, '').slice(0, 10)
                      )}
                      className={`form-input ${errors.mother_mobile ? 'error' : ''}`}
                      placeholder="10 digit mobile"
                      maxLength="10"
                      disabled={loading}
                    />
                    {errors.mother_mobile && (
                      <span className="error-text">
                        <AlertCircle size={12} />
                        {errors.mother_mobile}
                      </span>
                    )}
                  </div>

                  <div className="form-group">
                    <label htmlFor="mother_email">Email</label>
                    <input
                      type="email"
                      id="mother_email"
                      value={studentData.mother_email}
                      onChange={(e) => handleStudentDataChange('mother_email', e.target.value)}
                      className={`form-input ${errors.mother_email ? 'error' : ''}`}
                      placeholder="mother@example.com"
                      disabled={loading}
                    />
                    {errors.mother_email && (
                      <span className="error-text">
                        <AlertCircle size={12} />
                        {errors.mother_email}
                      </span>
                    )}
                    <small className="help-text">For fee reminder emails</small>
                  </div>
                </div>
              </div>

              <div className="parent-card full-width">
                <div className="parent-card-header guardian">
                  <Shield size={20} />
                  <span>Local Guardian (Optional)</span>
                </div>
                <div className="parent-card-body horizontal">
                  <div className="form-group">
                    <label htmlFor="local_guardian_name">Name</label>
                    <input
                      type="text"
                      id="local_guardian_name"
                      value={studentData.local_guardian_name}
                      onChange={(e) => handleStudentDataChange('local_guardian_name', e.target.value)}
                      className="form-input"
                      placeholder="Guardian's name"
                      disabled={loading}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="local_guardian_relation">Relation</label>
                    <input
                      type="text"
                      id="local_guardian_relation"
                      value={studentData.local_guardian_relation}
                      onChange={(e) => handleStudentDataChange('local_guardian_relation', e.target.value)}
                      className="form-input"
                      placeholder="e.g., Uncle, Aunt"
                      disabled={loading}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="local_guardian_mobile">Mobile</label>
                    <input
                      type="tel"
                      id="local_guardian_mobile"
                      value={studentData.local_guardian_mobile}
                      onChange={(e) => handleStudentDataChange(
                        'local_guardian_mobile',
                        e.target.value.replace(/\D/g, '').slice(0, 10)
                      )}
                      className={`form-input ${errors.local_guardian_mobile ? 'error' : ''}`}
                      placeholder="10 digit mobile"
                      maxLength="10"
                      disabled={loading}
                    />
                    {errors.local_guardian_mobile && (
                      <span className="error-text">
                        <AlertCircle size={12} />
                        {errors.local_guardian_mobile}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ID Proof & Address */}
          <div className="form-section">
            <div className="section-header">
              <div className="section-icon address-icon">
                <MapPin size={20} />
              </div>
              <div className="section-info">
                <h3>ID Proof & Address</h3>
                <p>Identity verification and permanent address</p>
              </div>
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="id_type">ID Type</label>
                <div className="input-wrapper">
                  <FileText size={18} className="input-icon" />
                  <select
                    id="id_type"
                    value={studentData.id_type}
                    onChange={(e) => handleStudentDataChange('id_type', e.target.value)}
                    className="form-input with-icon select-input"
                    disabled={loading}
                  >
                    <option value="Aadhar">Aadhar Card</option>
                    <option value="PAN">PAN Card</option>
                    <option value="Voter ID">Voter ID</option>
                    <option value="Driving License">Driving License</option>
                    <option value="Passport">Passport</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="id_number">ID Number</label>
                <div className="input-wrapper">
                  <CreditCard size={18} className="input-icon" />
                  <input
                    type="text"
                    id="id_number"
                    value={studentData.id_number}
                    onChange={(e) => handleStudentDataChange('id_number', e.target.value)}
                    className="form-input with-icon"
                    placeholder="Enter ID number"
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="form-group full-width">
                <label htmlFor="address_line1">Address Line 1</label>
                <div className="input-wrapper">
                  <MapPin size={18} className="input-icon" />
                  <input
                    type="text"
                    id="address_line1"
                    value={studentData.address_line1}
                    onChange={(e) => handleStudentDataChange('address_line1', e.target.value)}
                    className="form-input with-icon"
                    placeholder="House No., Street Name"
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="form-group full-width">
                <label htmlFor="address_line2">Address Line 2</label>
                <div className="input-wrapper">
                  <MapPin size={18} className="input-icon" />
                  <input
                    type="text"
                    id="address_line2"
                    value={studentData.address_line2}
                    onChange={(e) => handleStudentDataChange('address_line2', e.target.value)}
                    className="form-input with-icon"
                    placeholder="Area, Landmark"
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="form-group full-width">
                <label htmlFor="address_line3">Address Line 3</label>
                <div className="input-wrapper">
                  <MapPin size={18} className="input-icon" />
                  <input
                    type="text"
                    id="address_line3"
                    value={studentData.address_line3}
                    onChange={(e) => handleStudentDataChange('address_line3', e.target.value)}
                    className="form-input with-icon"
                    placeholder="City, State, PIN Code"
                    disabled={loading}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Fee Information */}
          <div className="form-section">
            <div className="section-header">
              <div className="section-icon fee-icon">
                <IndianRupee size={20} />
              </div>
              <div className="section-info">
                <h3>Fee Configuration</h3>
                <p>Fee cycle and payment details</p>
              </div>
            </div>

            <div className="fee-type-section" style={{ marginBottom: 16 }}>
              <label className="section-label">
                💳 Payment Mode <span className="required">*</span>
              </label>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <label style={{
                  flex: 1, minWidth: 200,
                  display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px',
                  border: `2px solid ${feeData.payment_mode === 'cash' ? '#6366f1' : '#e5e7eb'}`,
                  borderRadius: 12, cursor: 'pointer',
                  background: feeData.payment_mode === 'cash' ? 'rgba(99,102,241,0.08)' : 'transparent'
                }}>
                  <input
                    type="radio"
                    name="payment_mode_edit"
                    value="cash"
                    checked={feeData.payment_mode === 'cash'}
                    onChange={() => handleFeeDataChange('payment_mode', 'cash')}
                    disabled={loading}
                  />
                  <div>
                    <div style={{ fontWeight: 700 }}>💵 Cash</div>
                    <div style={{ fontSize: 12, opacity: 0.7 }}>Simple invoice</div>
                  </div>
                </label>
                <label style={{
                  flex: 1, minWidth: 200,
                  display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px',
                  border: `2px solid ${feeData.payment_mode === 'online' ? '#6366f1' : '#e5e7eb'}`,
                  borderRadius: 12, cursor: 'pointer',
                  background: feeData.payment_mode === 'online' ? 'rgba(99,102,241,0.08)' : 'transparent'
                }}>
                  <input
                    type="radio"
                    name="payment_mode_edit"
                    value="online"
                    checked={feeData.payment_mode === 'online'}
                    onChange={() => handleFeeDataChange('payment_mode', 'online')}
                    disabled={loading}
                  />
                  <div>
                    <div style={{ fontWeight: 700 }}>💳 Online</div>
                    <div style={{ fontSize: 12, opacity: 0.7 }}>GST split invoice</div>
                  </div>
                </label>
              </div>
            </div>

            <div className="fee-type-section">
              <label className="section-label">
                <Repeat size={16} />
                Fee Collection Cycle <span className="required">*</span>
              </label>

              <div className="fee-type-options">
                {feeTypeOptions.map(option => (
                  <label
                    key={option.value}
                    className={`fee-type-option ${feeData.fee_type_cycle === option.value ? 'selected' : ''}`}
                  >
                    <input
                      type="radio"
                      name="fee_type_cycle"
                      value={option.value}
                      checked={feeData.fee_type_cycle === option.value}
                      onChange={(e) => handleFeeTypeChange(e.target.value)}
                      disabled={loading}
                    />
                    <div className="fee-type-content">
                      <span className="fee-type-icon">{option.icon}</span>
                      <div className="fee-type-info">
                        <span className="fee-type-label">{option.label}</span>
                        <span className="fee-type-desc">{option.description}</span>
                      </div>
                      <div className="fee-type-check">
                        {feeData.fee_type_cycle === option.value && <Check size={20} />}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div className="fee-cards">
              {feeData.fee_type_cycle === "monthly" && (
                <div className="fee-card">
                  <div className="fee-card-icon monthly">
                    <IndianRupee size={24} />
                  </div>
                  <div className="fee-card-content">
                    <label htmlFor="monthly_fee">
                      Monthly Fee <span className="required">*</span>
                    </label>
                    <div className="fee-input-wrapper">
                      <span className="currency-symbol">₹</span>
                      <input
                        type="text"
                        id="monthly_fee"
                        value={feeData.monthly_fee}
                        onChange={(e) => handleFeeDataChange(
                          'monthly_fee',
                          e.target.value.replace(/\D/g, '')
                        )}
                        className={`form-input fee-input ${errors.monthly_fee ? "error" : ""}`}
                        placeholder="0"
                        disabled={loading}
                      />
                    </div>
                    {errors.monthly_fee && (
                      <span className="error-text">
                        <AlertCircle size={12} />
                        {errors.monthly_fee}
                      </span>
                    )}
                    <small className="help-text">Fee collected every month</small>
                  </div>
                </div>
              )}

              {feeData.fee_type_cycle === "half_yearly" && (
                <>
                  <div className="fee-card">
                    <div className="fee-card-icon half-yearly">
                      <IndianRupee size={24} />
                    </div>
                    <div className="fee-card-content">
                      <label htmlFor="half_yearly_fee">
                        Half-Yearly Fee <span className="required">*</span>
                      </label>
                      <div className="fee-input-wrapper">
                        <span className="currency-symbol">₹</span>
                        <input
                          type="text"
                          id="half_yearly_fee"
                          value={feeData.half_yearly_fee}
                          onChange={(e) => handleFeeDataChange(
                            'half_yearly_fee',
                            e.target.value.replace(/\D/g, '')
                          )}
                          className={`form-input fee-input ${errors.half_yearly_fee ? "error" : ""}`}
                          placeholder="0"
                          disabled={loading}
                        />
                      </div>
                      {errors.half_yearly_fee && (
                        <span className="error-text">
                          <AlertCircle size={12} />
                          {errors.half_yearly_fee}
                        </span>
                      )}
                      <small className="help-text">Fee for 6 months period</small>
                    </div>
                  </div>

                  <div className="fee-card">
                    <div className="fee-card-icon next-date">
                      <Calendar size={24} />
                    </div>
                    <div className="fee-card-content">
                      <label htmlFor="next_fee_date">
                        Next Fee Due Date <span className="required">*</span>
                      </label>
                      <DateInput
                        id="next_fee_date"
                        value={feeData.next_fee_date}
                        onChange={(val) => handleFeeDataChange('next_fee_date', val)}
                        className={`form-input ${errors.next_fee_date ? "error" : ""}`}
                        disabled={loading}
                      />
                      {errors.next_fee_date && (
                        <span className="error-text">
                          <AlertCircle size={12} />
                          {errors.next_fee_date}
                        </span>
                      )}
                      <small className="help-text">
                        When next fee will be generated
                      </small>
                    </div>
                  </div>
                </>
              )}

              {feeData.fee_type_cycle === "yearly" && (
                <div className="fee-card full-width">
                  <div className="fee-card-icon yearly">
                    <IndianRupee size={24} />
                  </div>
                  <div className="fee-card-content">
                    <label htmlFor="yearly_fee">
                      Yearly Fee <span className="required">*</span>
                    </label>
                    <div className="fee-input-wrapper">
                      <span className="currency-symbol">₹</span>
                      <input
                        type="text"
                        id="yearly_fee"
                        value={feeData.yearly_fee}
                        onChange={(e) => handleFeeDataChange(
                          'yearly_fee',
                          e.target.value.replace(/\D/g, '')
                        )}
                        className={`form-input fee-input ${errors.yearly_fee ? "error" : ""}`}
                        placeholder="0"
                        disabled={loading}
                      />
                    </div>
                    {errors.yearly_fee && (
                      <span className="error-text">
                        <AlertCircle size={12} />
                        {errors.yearly_fee}
                      </span>
                    )}
                    <small className="help-text">Fee for complete 12 months</small>
                  </div>
                </div>
              )}

              <div className="fee-card">
                <div className="fee-card-icon security">
                  <Shield size={24} />
                </div>
                <div className="fee-card-content">
                  <label htmlFor="security_deposit">Security Deposit</label>
                  <div className="fee-input-wrapper">
                    <span className="currency-symbol">₹</span>
                    <input
                      type="text"
                      id="security_deposit"
                      value={feeData.security_deposit}
                      onChange={(e) => handleFeeDataChange(
                        'security_deposit',
                        e.target.value.replace(/\D/g, '')
                      )}
                      className="form-input fee-input"
                      placeholder="0 (Optional)"
                      disabled={loading}
                    />
                  </div>
                  <small className="help-text">One-time refundable deposit</small>
                </div>
              </div>

              <div className="fee-card">
                <div className="fee-card-icon next-date">
                  <Calendar size={24} />
                </div>
                <div className="fee-card-content">
                  <label htmlFor="fee_start_date">Fee Start Date</label>
                  <DateInput
                    id="fee_start_date"
                    value={feeData.fee_start_date}
                    onChange={(val) => handleFeeDataChange('fee_start_date', val)}
                    className="form-input"
                    disabled={loading}
                  />
                  <small className="help-text">
                    The month from which fees are calculated
                  </small>
                </div>
              </div>
            </div>

            {/* Discount Section */}
            <div className="discount-section-edit glass-light" style={{ marginTop: '20px', padding: '15px', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', marginBottom: '15px', fontWeight: 'bold' }}>
                <input
                  type="checkbox"
                  checked={feeData.has_discount}
                  onChange={(e) => handleFeeDataChange('has_discount', e.target.checked)}
                />
                Apply Discount
              </label>

              {feeData.has_discount && (
                <div className="discount-fields" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
                  <div className="form-group">
                    <label>Discount Type</label>
                    <select
                      value={feeData.discount_type}
                      onChange={(e) => handleFeeDataChange('discount_type', e.target.value)}
                      className="form-input"
                      disabled={loading}
                    >
                      <option value="percentage">Percentage (%)</option>
                      <option value="fixed">Fixed Amount (₹)</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Discount Value</label>
                    <input
                      type="number"
                      value={feeData.discount_value}
                      onChange={(e) => handleFeeDataChange('discount_value', e.target.value)}
                      className="form-input"
                      placeholder="e.g. 10 or 500"
                      disabled={loading}
                    />
                  </div>

                  <div className="form-group">
                    <label>Discount Calculation</label>
                    <select
                      value={feeData.discount_on_full_month ? "full" : "prorated"}
                      onChange={(e) => handleFeeDataChange('discount_on_full_month', e.target.value === "full")}
                      className="form-input"
                      disabled={loading}
                    >
                      <option value="full">Apply on FULL Month Fee</option>
                      <option value="prorated">Apply on PRORATED Amount</option>
                    </select>
                  </div>
                </div>
              )}
            </div>

            <div className="alert alert-info">
              <AlertCircle size={20} />
              <div className="alert-content">
                <strong>Important Note</strong>
                <p>
                  Updating fees will apply to <strong>future fee generation</strong> and <strong>all unpaid/partially paid fees</strong>.
                  Fully paid records will not be modified.
                </p>
              </div>
            </div>
          </div>

          {/* Submit Buttons */}
          <div className="form-actions">
            <div className="action-info">
              {hasChanges && !loading && (
                <span className="unsaved-changes">
                  <AlertCircle size={14} />
                  Unsaved changes
                </span>
              )}
            </div>
            <div className="action-buttons">
              <button
                type="button"
                onClick={handleCancel}
                disabled={loading}
                className="cancel-btn"
              >
                <X size={16} />
                Cancel
              </button>

              <button
                type="submit"
                disabled={loading}
                className="submit-btn"
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="spin" />
                    Updating...
                  </>
                ) : (
                  <>
                    <Save size={16} />
                    Update Student
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditStudent;