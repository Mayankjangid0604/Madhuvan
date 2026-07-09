import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";  // ✅ THIS WAS MISSING OR REMOVED
import { saveDraft, deleteDraft, getDraft } from "../../../utils/studentDrafts";
import { useReactToPrint } from 'react-to-print';
import {
  ArrowLeft,
  ArrowRight,
  Save,
  User,
  Home,
  IndianRupee,
  Check,
  AlertCircle,
  Upload,
  X,
  Calendar,
  Phone,
  Mail,
  MapPin,
  CreditCard,
  FileText,
  Shield,
  Users,
  BookOpen,
  Building,
  Bed,
  RefreshCw,
  CheckCircle,
  Info,
  Loader2,
  Percent,
  Hash,
  Clock,
  Repeat,
  Printer  // ✅ ADD THIS TOO
} from "lucide-react";
import { studentAPI } from "../../../services/api/student.api.js";
import { roomAPI } from "../../../services/api/room.api.js";
import { settingsAPI } from "../../../services/api/settings.api.js";
import Card from "../../../components/cards/Card.jsx";
import Button from "../../../components/buttons/Button.jsx";
import PageHeader from "../../../components/layout/PageHeader.jsx";
import StudentAdmissionForm from "../../../components/PrintForm/StudentAdmissionForm";
import DateInput from "../../../components/common/DateInput";
import "./addStudent.css";

const AddStudent = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [currentStep, setCurrentStep] = useState(1);
  const [draftId, setDraftId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [availableRooms, setAvailableRooms] = useState([]);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [createdStudentData, setCreatedStudentData] = useState(null);
  const [refreshingRooms, setRefreshingRooms] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const printRef = useRef(null);
  const [hostelInfo, setHostelInfo] = useState(null);
  // Step 1: Student Details
  const [studentData, setStudentData] = useState({
    form_date: new Date().toISOString().split('T')[0],
    student_name: "",
    gender: "Girl",
    date_of_birth: "",
    student_mobile: "",
    father_email: "",
    mother_email: "",
    class_or_coaching: "",
    institute_name: "",
    custom_institute_name: "",
    date_of_joining: new Date().toISOString().split('T')[0],
    date_of_leaving: null,
    father_name: "",
    father_mobile: "",
    mother_name: "",
    mother_mobile: "",
    local_guardian_name: "",
    local_guardian_relation: "",
    local_guardian_mobile: "",
    id_type: "Aadhar Card",
    id_number: "",
    address_line1: "",
    address_line2: "",
    address_line3: ""
  });

  // Step 2: Room Allocation
  const [allocationData, setAllocationData] = useState({
    room_id: "",
    bed_id: "",
    allocation_start_date: new Date().toISOString().split('T')[0]
  });

  // Step 3: Fee Setup - UPDATED with fee_type_cycle
  const [feeData, setFeeData] = useState({
    fee_type_cycle: "monthly", // NEW: monthly, half_yearly, yearly
    payment_mode: "cash", // NEW: cash or online (affects invoice format)
    monthly_fee: "",           // For monthly cycle
    half_yearly_fee: "",       // For half-yearly cycle
    yearly_fee: "",            // For yearly cycle
    next_fee_date: "",         // For half-yearly: next due date
    security_deposit: "",
    has_discount: false,
    discount_type: "percentage",
    discount_value: "",
    discount_applicable: "all_months",
    discount_months: "",
    discount_on_full_month: true,
    fee_start_date: new Date().toISOString().split("T")[0],
    fee_end_month: null,
    fee_term_months: 1,
    remarks: ""
  });

  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);

  // Fee Type Options - NEW
  const feeTypeOptions = [
    {
      value: "monthly",
      label: "Monthly",
      description: "Fee collected every month",
      icon: "📅"
    },
    {
      value: "half_yearly",
      label: "Half-Yearly (Bi-Annual)",
      description: "Fee collected 2 times per year (every 6 months)",
      icon: "📆"
    },
    {
      value: "yearly",
      label: "Yearly (Annual)",
      description: "Fee collected once per year",
      icon: "🗓️"
    }
  ];

  // Institute options
  const instituteOptions = [
    { value: "", label: "-- Select Institute --" },
    { value: "Matrix", label: "Matrix" },
    { value: "GCI", label: "GCI" },
    { value: "CLC", label: "CLC" },
    { value: "Aakash", label: "Aakash" },
    { value: "Kotilya", label: "Kotilya" },
    { value: "Allen", label: "Allen" },
    { value: "Path", label: "Path" },
    { value: "PW", label: "PW" },
    { value: "Aayam", label: "Aayam" },
    { value: "Custom", label: "Custom (Other)" }
  ];

  // ID Type options
  const idTypeOptions = [
    { value: "Aadhar Card", label: "Aadhar Card", placeholder: "12 digits only", maxLength: 12 },
    { value: "PAN Card", label: "PAN Card", placeholder: "ABCDE1234F", maxLength: 10 },
    { value: "Driving License", label: "Driving License", placeholder: "State code + numbers", maxLength: 16 },
    { value: "Voter ID", label: "Voter ID Card", placeholder: "Alphanumeric", maxLength: 10 },
    { value: "Passport", label: "Passport", placeholder: "Alphanumeric", maxLength: 8 }
  ];

  useEffect(() => {
    window.scrollTo(0, 0); // ✅ FIX: Always open page from the top
    resetForm();
    fetchAvailableRooms();
    fetchHostelInfo();

    // Load draft if navigated with draftId
    const stateDraftId = location.state?.draftId;
    if (stateDraftId) {
      const draft = getDraft(stateDraftId);
      if (draft) {
        setDraftId(stateDraftId);
        if (draft.studentData) setStudentData(prev => ({ ...prev, ...draft.studentData }));
        if (draft.allocationData) setAllocationData(prev => ({ ...prev, ...draft.allocationData }));
        if (draft.feeData) setFeeData(prev => ({ ...prev, ...draft.feeData }));
        if (typeof draft.currentStep === 'number') setCurrentStep(draft.currentStep);
        setSuccessMessage("Draft loaded — continue where you left off");
        setTimeout(() => setSuccessMessage(""), 3000);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSaveDraft = () => {
    const saved = saveDraft({
      id: draftId,
      currentStep,
      studentData,
      allocationData,
      feeData
    });
    setDraftId(saved.id);
    setSuccessMessage("✓ Draft saved. Find it under Drafts on the Students page.");
    setTimeout(() => setSuccessMessage(""), 3500);
  };

  // Set default next_fee_date when fee_type_cycle changes to half_yearly
  useEffect(() => {
    if (feeData.fee_type_cycle === "half_yearly" && !feeData.next_fee_date) {
      const startDate = new Date(feeData.fee_start_date);
      startDate.setMonth(startDate.getMonth() + 6);
      setFeeData(prev => ({
        ...prev,
        next_fee_date: startDate.toISOString().split('T')[0]
      }));
    }
  }, [feeData.fee_type_cycle, feeData.fee_start_date]);

  // Keep allocation_start_date in sync with date_of_joining (they represent the same event)
  useEffect(() => {
    if (studentData.date_of_joining) {
      setAllocationData(prev => ({
        ...prev,
        allocation_start_date: studentData.date_of_joining
      }));
    }
  }, [studentData.date_of_joining]);

  const fetchAvailableRooms = async (showRefreshMessage = false) => {
    try {
      if (showRefreshMessage) {
        setRefreshingRooms(true);
      }
      const res = await roomAPI.getAvailableRooms();
      setAvailableRooms(res.data.data || []);

      if (showRefreshMessage) {
        setSuccessMessage("Rooms refreshed successfully!");
        setTimeout(() => setSuccessMessage(""), 3000);
      }
    } catch (error) {
      console.error("Failed to fetch rooms:", error);
      setErrorMessage("Failed to load available rooms");
    } finally {
      setRefreshingRooms(false);
    }
  };

  const fetchHostelInfo = async () => {
    try {
      const res = await settingsAPI.getHostelInfo();
      if (res.data.success && res.data.data) {
        let hostelData = res.data.data;
        if (typeof hostelData.rules === 'string') {
          try {
            hostelData.rules = JSON.parse(hostelData.rules);
          } catch {
            hostelData.rules = [];
          }
        }
        setHostelInfo(hostelData);
      } else {
        setDefaultHostelInfo();
      }
    } catch (error) {
      console.error("Failed to fetch hostel info:", error);
      setDefaultHostelInfo();
    }
  };

  const setDefaultHostelInfo = () => {
    setHostelInfo({
      hostel_name: "Madhuvan Hostel",
      tagline: "Your Home Away From Home",
      address_line1: "",
      address_line2: "",
      phone: "",
      email: "",
      logo_left: null,
      logo_right: null,
      rules: [
        "Maintain discipline and decorum at all times",
        "Entry/Exit timings must be strictly followed",
        "Guests are not allowed without prior permission",
        "Keep your room and surroundings clean",
        "Consumption of alcohol and smoking is prohibited",
        "Damage to hostel property will be charged",
        "Fees must be paid on or before due date",
        "Management reserves the right to cancel admission"
      ]
    });
  };

  // Helper function to format date as DD-MM-YYYY
  const formatDateDisplay = (isoDate) => {
    if (!isoDate) return "";
    const [year, month, day] = isoDate.split('-');
    return `${day}-${month}-${year}`;
  };

  // Format class/coaching with auto "th" and uppercase
  const formatClassCoaching = (value) => {
    if (!value) return "";

    let formatted = value.trim().replace(/\s+/g, ' ');
    formatted = formatted.replace(/(\d+)(?!th)/gi, '$1th');

    const uppercaseWords = ['neet', 'jee', 'iit', 'ca', 'cs', 'nda', 'upsc'];
    uppercaseWords.forEach(word => {
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      formatted = formatted.replace(regex, word.toUpperCase());
    });

    return formatted;
  };

  // Format ID number based on type
  const formatIDNumber = (idType, value) => {
    if (!value) return "";

    switch (idType) {
      case "Aadhar Card":
        return value.replace(/\D/g, '').slice(0, 12);
      case "PAN Card":
        return value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10);
      case "Driving License":
        return value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 16);
      case "Voter ID":
        return value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10);
      case "Passport":
        return value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
      default:
        return value;
    }
  };

  // Get ID type help text
  const getIDHelpText = (idType) => {
    switch (idType) {
      case "Aadhar Card": return "Exactly 12 digits";
      case "PAN Card": return "Format: 5 letters + 4 numbers + 1 letter";
      case "Driving License": return "Min 10 characters";
      case "Voter ID": return "Min 10 characters";
      case "Passport": return "Min 8 characters";
      default: return "";
    }
  };

  // Get the applicable fee amount based on fee type - NEW
  const getApplicableFeeAmount = () => {
    switch (feeData.fee_type_cycle) {
      case "monthly":
        return Number(feeData.monthly_fee) || 0;
      case "half_yearly":
        return Number(feeData.half_yearly_fee) || 0;
      case "yearly":
        return Number(feeData.yearly_fee) || 0;
      default:
        return 0;
    }
  };

  // Get fee cycle label - NEW
  const getFeeCycleLabel = () => {
    switch (feeData.fee_type_cycle) {
      case "monthly": return "Monthly";
      case "half_yearly": return "Half-Yearly";
      case "yearly": return "Yearly";
      default: return "";
    }
  };

  // Validation functions
  const validateStep1 = () => {
    const newErrors = {};

    if (!studentData.student_name.trim()) newErrors.student_name = "Name is required";
    if (!studentData.date_of_birth) newErrors.date_of_birth = "DOB is required";
    if (!studentData.class_or_coaching.trim()) newErrors.class_or_coaching = "Class/Coaching is required";
    if (!studentData.father_name.trim()) newErrors.father_name = "Father name is required";
    if (!studentData.father_mobile.trim()) newErrors.father_mobile = "Father mobile is required";
    else if (!/^\d{10}$/.test(studentData.father_mobile)) newErrors.father_mobile = "Must be exactly 10 digits";
    if (!studentData.mother_name.trim()) newErrors.mother_name = "Mother name is required";
    if (!studentData.mother_mobile.trim()) newErrors.mother_mobile = "Mother mobile is required";
    else if (!/^\d{10}$/.test(studentData.mother_mobile)) newErrors.mother_mobile = "Must be exactly 10 digits";
    if (!studentData.institute_name) newErrors.institute_name = "Institute name is required";
    if (studentData.institute_name === "Custom" && !studentData.custom_institute_name) {
      newErrors.custom_institute_name = "Please enter custom institute name";
    }
    if (studentData.student_mobile && !/^\d{10}$/.test(studentData.student_mobile)) {
      newErrors.student_mobile = "Must be exactly 10 digits";
    }
    if (studentData.local_guardian_mobile && !/^\d{10}$/.test(studentData.local_guardian_mobile)) {
      newErrors.local_guardian_mobile = "Must be exactly 10 digits";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep2 = () => {
    const newErrors = {};

    if (!allocationData.room_id) newErrors.room_id = "Please select a room";
    if (!allocationData.bed_id) newErrors.bed_id = "Please select a bed";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // UPDATED: Validate Step 3 with new fee types
  const validateStep3 = () => {
    const newErrors = {};

    // Validate based on fee type
    if (feeData.fee_type_cycle === "monthly") {
      if (!feeData.monthly_fee || parseFloat(feeData.monthly_fee) <= 0) {
        newErrors.monthly_fee = "Monthly fee is required and must be greater than 0";
      }
    } else if (feeData.fee_type_cycle === "half_yearly") {
      if (!feeData.half_yearly_fee || parseFloat(feeData.half_yearly_fee) <= 0) {
        newErrors.half_yearly_fee = "Half-yearly fee is required and must be greater than 0";
      }
      if (!feeData.next_fee_date) {
        newErrors.next_fee_date = "Next fee date is required for half-yearly billing";
      }
    } else if (feeData.fee_type_cycle === "yearly") {
      if (!feeData.yearly_fee || parseFloat(feeData.yearly_fee) <= 0) {
        newErrors.yearly_fee = "Yearly fee is required and must be greater than 0";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    // Allow free navigation between steps; only enforce validation on final submit.
    setCurrentStep(currentStep + 1);
    setErrors({});
    window.scrollTo({ top: 0, behavior: 'smooth' });
    const el = document.querySelector('.layout-content');
    if (el) el.scrollTop = 0;
  };

  const handlePrevious = () => {
    setCurrentStep(currentStep - 1);
    setErrors({});
    window.scrollTo({ top: 0, behavior: 'smooth' });
    const el = document.querySelector('.layout-content');
    if (el) el.scrollTop = 0;
  };

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Student_Admission_Form_${createdStudentData?.student_id}`,
    onAfterPrint: () => {
      console.log("Print completed");
    },
  });

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setErrorMessage("Please select a valid image file");
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setErrorMessage("Photo size must be less than 5MB");
        return;
      }
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const handleRemovePhoto = () => {
    setPhotoFile(null);
    setPhotoPreview(null);
  };

  // UPDATED: Handle submit with new fee structure
  const handleSubmit = async () => {
    // Validate ALL steps at final submit time (users can navigate freely between steps)
    const step1Ok = validateStep1();
    const step2Ok = validateStep2();
    const step3Ok = validateStep3();

    if (!step1Ok) {
      setCurrentStep(1);
      setErrorMessage("Please fill all required fields in Student Details");
      return;
    }
    if (!step2Ok) {
      setCurrentStep(2);
      setErrorMessage("Please allocate a room and bed before submitting");
      return;
    }
    if (!step3Ok) {
      setCurrentStep(3);
      setErrorMessage("Please fill all required fields in Fee Setup");
      return;
    }

    setLoading(true);
    setErrorMessage("");

    try {
      const finalInstituteValue = studentData.institute_name === "Custom"
        ? studentData.custom_institute_name
        : studentData.institute_name;

      // Determine fee amount based on cycle
      let feeAmount = 0;
      if (feeData.fee_type_cycle === "monthly") {
        feeAmount = Number(feeData.monthly_fee);
      } else if (feeData.fee_type_cycle === "half_yearly") {
        feeAmount = Number(feeData.half_yearly_fee);
      } else if (feeData.fee_type_cycle === "yearly") {
        feeAmount = Number(feeData.yearly_fee);
      }

      // Prepare JSON payload - UPDATED
      const studentPayload = {
        form_date: studentData.form_date,
        student_name: studentData.student_name,
        gender: studentData.gender || 'Girl',
        date_of_birth: studentData.date_of_birth,
        student_mobile: studentData.student_mobile,
        father_email: studentData.father_email || null,
        mother_email: studentData.mother_email || null,
        class_or_coaching: studentData.class_or_coaching,
        institute_name: finalInstituteValue,
        date_of_joining: allocationData.allocation_start_date,
        father_name: studentData.father_name,
        father_mobile: studentData.father_mobile,
        mother_name: studentData.mother_name,
        mother_mobile: studentData.mother_mobile,
        local_guardian_name: studentData.local_guardian_name,
        local_guardian_relation: studentData.local_guardian_relation,
        local_guardian_mobile: studentData.local_guardian_mobile,
        id_type: studentData.id_type,
        id_number: studentData.id_number,
        address_line1: studentData.address_line1,
        address_line2: studentData.address_line2,
        address_line3: studentData.address_line3,
        photo_url: null,

        // NEW: Fee type cycle + payment mode
        fee_type_cycle: feeData.fee_type_cycle,
        payment_mode: feeData.payment_mode || 'cash',
        monthly_fee: feeAmount, // Store the applicable fee amount
        security_deposit: Number(feeData.security_deposit || 0),
        fee_start_month: feeData.fee_start_date,
        next_fee_due_date: feeData.fee_type_cycle === "half_yearly" ? feeData.next_fee_date : null,
        fee_end_month: null,
        fee_term_months: feeData.fee_type_cycle === "monthly" ? 1 :
          feeData.fee_type_cycle === "half_yearly" ? 6 : 12,
        has_discount: feeData.has_discount ? 1 : 0,
        discount_type: feeData.has_discount ? feeData.discount_type : null,
        discount_value: feeData.has_discount ? Number(feeData.discount_value) : 0,
        discount_applicable: feeData.has_discount ? feeData.discount_applicable : null,
        discount_months: feeData.has_discount && feeData.discount_applicable === 'specific_months' ? feeData.discount_months : null
      };

      // Create student (JSON)
      console.log("📝 Sending Student Payload to Backend:", JSON.stringify(studentPayload, null, 2));
      const response = await studentAPI.createStudent(studentPayload);

      if (response.data.success) {
        const studentId = response.data.data.student_id;
        const feesCreated = response.data.data.fees_created;
        const feeError = response.data.data.fee_error;

        // Save data for print form
        const selectedRoom = getSelectedRoom();
        const selectedBed = getAvailableBedsForRoom().find(
          r => r.bed_id.toString() === allocationData.bed_id
        );

        setCreatedStudentData({
          student_id: studentId,
          ...studentPayload,
          allocation: {
            ...allocationData,
            room_no: selectedRoom?.room_no || "N/A",
            floor_no: selectedRoom?.floor_no || "N/A",
            room_type: selectedRoom?.room_type || "N/A",
            bed_no: selectedBed?.bed_no || "N/A",
            bed_label: selectedBed?.bed_label || ""
          },
          fees: {
            ...feeData,
            monthly_fee: feeAmount,
            security_deposit: Number(feeData.security_deposit || 0)
          }
        });

        // Allocate room
        if (allocationData.room_id && allocationData.bed_id) {
          try {
            await roomAPI.allocateRoom({
              student_id: studentId,
              room_id: Number(allocationData.room_id),
              bed_id: Number(allocationData.bed_id),
              allocation_start_date: allocationData.allocation_start_date
            });
          } catch (allocErr) {
            console.error("Allocation failed:", allocErr);
          }
        }

        // Upload photo (optional)
        if (photoFile) {
          try {
            const photoForm = new FormData();
            photoForm.append("photo", photoFile);
            await studentAPI.uploadPhoto(studentId, photoForm);
          } catch (photoErr) {
            console.error("Photo upload failed:", photoErr);
          }
        }

        // Show appropriate success message based on fee status
        if (feesCreated) {
          setSuccessMessage("✅ Student added successfully! Fees generated.");
        } else if (feeError) {
          setSuccessMessage(`⚠️ Student added but fees not generated: ${feeError}`);
          setErrorMessage(`Fee generation issue: ${feeError}`);
        } else {
          setSuccessMessage("✅ Student added successfully!");
        }

        // Remove draft if this was created from a draft
        if (draftId) {
          deleteDraft(draftId);
          setDraftId(null);
        }

        // ✅ FIX: Navigate directly to students page instead of showing print modal
        navigate("/students", { state: { message: "Student added successfully!" } });
      }
    } catch (error) {
      console.error("Error:", error);
      setErrorMessage(error.response?.data?.message || "Failed to add student");
    } finally {
      setLoading(false);
    }
  };

  const getSelectedRoom = () => {
    return availableRooms.find(r => r.room_id.toString() === allocationData.room_id.toString());
  };

  const getAvailableBedsForRoom = () => {
    const selectedRoom = getSelectedRoom();
    if (!selectedRoom) return [];
    return availableRooms.filter(r => r.room_id === selectedRoom.room_id);
  };

  const getUniqueRooms = () => {
    const uniqueRoomIds = [...new Set(availableRooms.map(r => r.room_id))];
    return uniqueRoomIds.map(roomId => {
      const room = availableRooms.find(r => r.room_id === roomId);
      const bedsCount = availableRooms.filter(r => r.room_id === roomId).length;
      return { ...room, availableBeds: bedsCount };
    });
  };

  // UPDATED: Get discounted fee based on cycle
  const getDiscountedFee = () => {
    const baseFee = getApplicableFeeAmount();

    if (!feeData.has_discount || !feeData.discount_value) {
      return baseFee;
    }

    const discountValue = Number(feeData.discount_value);

    if (feeData.discount_type === 'percentage') {
      return baseFee - (baseFee * discountValue / 100);
    }
    return baseFee - discountValue;
  };

  const steps = [
    { number: 1, title: "Student Details", icon: User, description: "Personal & Family Info" },
    { number: 2, title: "Room Allocation", icon: Home, description: "Assign Room & Bed" },
    { number: 3, title: "Fee Setup", icon: IndianRupee, description: "Configure Fees" }
  ];

  const resetForm = () => {
    setCurrentStep(1);
    setErrors({});
    setLoading(false);
    setPhotoFile(null);
    setPhotoPreview(null);
    setSuccessMessage("");
    setErrorMessage("");
    // ✅ FIX: Reset modal states to prevent blocking overlay
    setShowPrintModal(false);
    setCreatedStudentData(null);

    setStudentData({
      form_date: new Date().toISOString().split('T')[0],
      student_name: "",
      gender: "Girl",
      date_of_birth: "",
      student_mobile: "",
      father_email: "",
      mother_email: "",
      class_or_coaching: "",
      institute_name: "",
      custom_institute_name: "",
      date_of_joining: new Date().toISOString().split('T')[0],
      date_of_leaving: null,
      father_name: "",
      father_mobile: "",
      mother_name: "",
      mother_mobile: "",
      local_guardian_name: "",
      local_guardian_relation: "",
      local_guardian_mobile: "",
      id_type: "Aadhar Card",
      id_number: "",
      address_line1: "",
      address_line2: "",
      address_line3: ""
    });

    setAllocationData({
      room_id: "",
      bed_id: "",
      allocation_start_date: new Date().toISOString().split('T')[0]
    });

    setFeeData({
      fee_type_cycle: "monthly",
      payment_mode: "cash",
      monthly_fee: "",
      half_yearly_fee: "",
      yearly_fee: "",
      next_fee_date: "",
      security_deposit: "",
      has_discount: false,
      discount_type: "percentage",
      discount_value: "",
      discount_applicable: "all_months",
      discount_months: "",
      fee_start_date: new Date().toISOString().split("T")[0],
      fee_end_month: null,
      fee_term_months: 1,
      remarks: ""
    });
  };

  // Clear specific field
  const clearField = (field, dataType = 'student') => {
    if (dataType === 'student') {
      setStudentData({ ...studentData, [field]: '' });
    } else if (dataType === 'allocation') {
      setAllocationData({ ...allocationData, [field]: '' });
    } else {
      setFeeData({ ...feeData, [field]: '' });
    }
    if (errors[field]) {
      setErrors({ ...errors, [field]: null });
    }
  };

  return (
    <div className="add-student-container">
      <div className="add-student">
        <PageHeader
          title="Add New Student"
          subtitle="Complete all steps to register a new student"
          action={
            <div className="header-actions">
              <Button
                variant="ghost"
                onClick={resetForm}
                className="reset-btn"
              >
                <RefreshCw size={16} />
                Reset Form
              </Button>
              <Button variant="primary" onClick={handleSaveDraft}>
                <Save size={16} />
                Save as Draft
              </Button>
              <Button variant="secondary" onClick={() => navigate("/students")}>
                <ArrowLeft size={16} />
                Back to Students
              </Button>
            </div>
          }
        />

        {/* Success Message */}
        {successMessage && (
          <div className="message-banner success">
            <CheckCircle size={20} />
            <span>{successMessage}</span>
            <button onClick={() => setSuccessMessage("")} className="close-btn">
              <X size={16} />
            </button>
          </div>
        )}

        {/* Error Message */}
        {errorMessage && (
          <div className="message-banner error">
            <AlertCircle size={20} />
            <span>{errorMessage}</span>
            <button onClick={() => setErrorMessage("")} className="close-btn">
              <X size={16} />
            </button>
          </div>
        )}

        {/* Step Indicator */}
        <div className="step-indicator">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isActive = currentStep === step.number;
            const isCompleted = currentStep > step.number;

            return (
              <React.Fragment key={step.number}>
                <div className={`step-item ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}>
                  <div className="step-icon">
                    {isCompleted ? <Check size={22} /> : <Icon size={22} />}
                  </div>
                  <div className="step-info">
                    <span className="step-number">Step {step.number}</span>
                    <span className="step-title">{step.title}</span>
                  </div>
                </div>
                {index < steps.length - 1 && (
                  <div className={`step-connector ${isCompleted ? 'completed' : ''}`} />
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Step Content */}
        <Card className="form-card glass">
          {/* STEP 1: Student Details - UNCHANGED */}
          {currentStep === 1 && (
            <div className="step-content">
              <h3 className="step-heading">
                <User size={24} />
                Personal Information
              </h3>

              {/* Basic Information */}
              <div className="form-section-card glass-light">
                <div className="section-card-header">
                  <FileText size={18} />
                  <span>Basic Details</span>
                </div>
                <div className="form-grid">
                  <div className="form-group">
                    <label>
                      <Calendar size={14} />
                      Form Date <span className="required">*</span>
                    </label>
                    <DateInput
                      value={studentData.form_date}
                      onChange={(val) => setStudentData({ ...studentData, form_date: val })}
                      className="form-input"
                    />
                  </div>

                  <div className="form-group">
                    <label>
                      <User size={14} />
                      Student Name <span className="required">*</span>
                    </label>
                    <div className="input-with-clear">
                      <input
                        type="text"
                        value={studentData.student_name}
                        onChange={(e) => setStudentData({ ...studentData, student_name: e.target.value })}
                        className={`form-input ${errors.student_name ? 'error' : ''}`}
                        placeholder="Enter full name"
                      />
                      {studentData.student_name && (
                        <button
                          type="button"
                          className="clear-btn"
                          onClick={() => clearField('student_name')}
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
                    <label>
                      <Calendar size={14} />
                      Date of Birth <span className="required">*</span>
                    </label>
                    <DateInput
                      value={studentData.date_of_birth}
                      onChange={(val) => setStudentData({ ...studentData, date_of_birth: val })}
                      className={`form-input ${errors.date_of_birth ? 'error' : ''}`}
                    />
                    {errors.date_of_birth && (
                      <span className="error-text">
                        <AlertCircle size={12} />
                        {errors.date_of_birth}
                      </span>
                    )}
                  </div>

                  <div className="form-group">
                    <label>
                      <User size={14} />
                      Gender <span className="required">*</span>
                    </label>
                    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                      {['Girl', 'Boy', 'Other'].map(g => (
                        <label key={g} style={{
                          display: 'inline-flex', alignItems: 'center', gap: 6,
                          padding: '10px 14px',
                          border: `2px solid ${studentData.gender === g ? '#6366f1' : '#e5e7eb'}`,
                          borderRadius: 10, cursor: 'pointer',
                          background: studentData.gender === g ? 'rgba(99,102,241,0.08)' : 'transparent',
                          fontWeight: studentData.gender === g ? 700 : 500
                        }}>
                          <input
                            type="radio"
                            name="gender"
                            value={g}
                            checked={studentData.gender === g}
                            onChange={() => setStudentData({ ...studentData, gender: g })}
                          />
                          {g}
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="form-group">
                    <label>
                      <Phone size={14} />
                      Student Mobile
                    </label>
                    <div className="input-with-clear">
                      <input
                        type="text"
                        value={studentData.student_mobile}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, '').slice(0, 10);
                          setStudentData({ ...studentData, student_mobile: value });
                        }}
                        className={`form-input ${errors.student_mobile ? 'error' : ''}`}
                        placeholder="10 digit mobile"
                        maxLength="10"
                      />
                      {studentData.student_mobile && (
                        <button
                          type="button"
                          className="clear-btn"
                          onClick={() => clearField('student_mobile')}
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
                    <label>
                      <BookOpen size={14} />
                      Class/Coaching <span className="required">*</span>
                    </label>
                    <div className="input-with-clear">
                      <input
                        type="text"
                        value={studentData.class_or_coaching}
                        onChange={(e) => setStudentData({ ...studentData, class_or_coaching: e.target.value })}
                        onBlur={(e) => setStudentData({ ...studentData, class_or_coaching: formatClassCoaching(e.target.value) })}
                        className={`form-input ${errors.class_or_coaching ? 'error' : ''}`}
                        placeholder="e.g., 12 neet"
                      />
                      {studentData.class_or_coaching && (
                        <button
                          type="button"
                          className="clear-btn"
                          onClick={() => clearField('class_or_coaching')}
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>
                    <span className="help-text">Auto-formats: 12 neet → 12th NEET</span>
                    {errors.class_or_coaching && (
                      <span className="error-text">
                        <AlertCircle size={12} />
                        {errors.class_or_coaching}
                      </span>
                    )}
                  </div>

                  <div className="form-group">
                    <label>
                      <Building size={14} />
                      Institute Name <span className="required">*</span>
                    </label>
                    <select
                      value={studentData.institute_name}
                      onChange={(e) => {
                        setStudentData({ ...studentData, institute_name: e.target.value });
                        if (errors.institute_name) {
                          setErrors({ ...errors, institute_name: null });
                        }
                      }}
                      className={`form-input ${errors.institute_name ? 'error' : ''}`}
                    >
                      {instituteOptions.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                    {errors.institute_name && (
                      <span className="error-text">
                        <AlertCircle size={12} />
                        {errors.institute_name}
                      </span>
                    )}
                  </div>

                  {studentData.institute_name === "Custom" && (
                    <div className="form-group">
                      <label>
                        <Building size={14} />
                        Custom Institute Name <span className="required">*</span>
                      </label>
                      <input
                        type="text"
                        value={studentData.custom_institute_name || ''}
                        onChange={(e) => setStudentData({ ...studentData, custom_institute_name: e.target.value })}
                        className={`form-input ${errors.custom_institute_name ? 'error' : ''}`}
                        placeholder="Enter institute name"
                      />
                      {errors.custom_institute_name && (
                        <span className="error-text">
                          <AlertCircle size={12} />
                          {errors.custom_institute_name}
                        </span>
                      )}
                    </div>
                  )}

                  <div className="form-group">
                    <label>
                      <Calendar size={14} />
                      Date of Joining <span className="required">*</span>
                    </label>
                    <DateInput
                      value={studentData.date_of_joining}
                      onChange={(val) => setStudentData({ ...studentData, date_of_joining: val })}
                      className="form-input"
                    />
                  </div>
                </div>
              </div>

              {/* Parent Details */}
              <h4 className="subsection-heading">
                <Users size={18} />
                Parent Details
              </h4>

              <div className="parent-cards-grid">
                {/* Father's Card */}
                <div className="parent-info-card glass-light">
                  <div className="parent-card-header father">
                    <User size={18} />
                    <span>Father's Information</span>
                  </div>
                  <div className="parent-card-body">
                    <div className="form-group">
                      <label>Name <span className="required">*</span></label>
                      <input
                        type="text"
                        value={studentData.father_name}
                        onChange={(e) => setStudentData({ ...studentData, father_name: e.target.value })}
                        className={`form-input ${errors.father_name ? 'error' : ''}`}
                        placeholder="Father's full name"
                      />
                      {errors.father_name && (
                        <span className="error-text">
                          <AlertCircle size={12} />
                          {errors.father_name}
                        </span>
                      )}
                    </div>

                    <div className="form-group">
                      <label>Mobile <span className="required">*</span></label>
                      <input
                        type="text"
                        value={studentData.father_mobile}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, '').slice(0, 10);
                          setStudentData({ ...studentData, father_mobile: value });
                        }}
                        className={`form-input ${errors.father_mobile ? 'error' : ''}`}
                        placeholder="10 digit mobile"
                        maxLength="10"
                      />
                      {errors.father_mobile && (
                        <span className="error-text">
                          <AlertCircle size={12} />
                          {errors.father_mobile}
                        </span>
                      )}
                    </div>

                    <div className="form-group">
                      <label>Email (Optional)</label>
                      <input
                        type="email"
                        value={studentData.father_email || ""}
                        onChange={(e) => setStudentData({ ...studentData, father_email: e.target.value })}
                        className="form-input"
                        placeholder="father@example.com"
                      />
                      <span className="help-text">For fee reminders</span>
                    </div>
                  </div>
                </div>

                {/* Mother's Card */}
                <div className="parent-info-card glass-light">
                  <div className="parent-card-header mother">
                    <User size={18} />
                    <span>Mother's Information</span>
                  </div>
                  <div className="parent-card-body">
                    <div className="form-group">
                      <label>Name <span className="required">*</span></label>
                      <input
                        type="text"
                        value={studentData.mother_name}
                        onChange={(e) => setStudentData({ ...studentData, mother_name: e.target.value })}
                        className={`form-input ${errors.mother_name ? 'error' : ''}`}
                        placeholder="Mother's full name"
                      />
                      {errors.mother_name && (
                        <span className="error-text">
                          <AlertCircle size={12} />
                          {errors.mother_name}
                        </span>
                      )}
                    </div>

                    <div className="form-group">
                      <label>Mobile <span className="required">*</span></label>
                      <input
                        type="text"
                        value={studentData.mother_mobile}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, '').slice(0, 10);
                          setStudentData({ ...studentData, mother_mobile: value });
                        }}
                        className={`form-input ${errors.mother_mobile ? 'error' : ''}`}
                        placeholder="10 digit mobile"
                        maxLength="10"
                      />
                      {errors.mother_mobile && (
                        <span className="error-text">
                          <AlertCircle size={12} />
                          {errors.mother_mobile}
                        </span>
                      )}
                    </div>

                    <div className="form-group">
                      <label>Email (Optional)</label>
                      <input
                        type="email"
                        value={studentData.mother_email}
                        onChange={(e) => setStudentData({ ...studentData, mother_email: e.target.value })}
                        className="form-input"
                        placeholder="mother@example.com"
                      />
                      <span className="help-text">For notifications</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Local Guardian */}
              <h4 className="subsection-heading">
                <Shield size={18} />
                Local Guardian (Optional)
              </h4>

              <div className="form-section-card glass-light">
                <div className="form-grid three-cols">
                  <div className="form-group">
                    <label>Guardian Name</label>
                    <input
                      type="text"
                      value={studentData.local_guardian_name}
                      onChange={(e) => setStudentData({ ...studentData, local_guardian_name: e.target.value })}
                      className="form-input"
                      placeholder="Enter guardian name"
                    />
                  </div>

                  <div className="form-group">
                    <label>Relation</label>
                    <input
                      type="text"
                      value={studentData.local_guardian_relation}
                      onChange={(e) => setStudentData({ ...studentData, local_guardian_relation: e.target.value })}
                      className="form-input"
                      placeholder="e.g., Uncle, Aunt"
                    />
                  </div>

                  <div className="form-group">
                    <label>Guardian Mobile</label>
                    <input
                      type="text"
                      value={studentData.local_guardian_mobile}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '').slice(0, 10);
                        setStudentData({ ...studentData, local_guardian_mobile: value });
                      }}
                      className={`form-input ${errors.local_guardian_mobile ? 'error' : ''}`}
                      placeholder="10 digit mobile"
                      maxLength="10"
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

              {/* Identity Proof */}
              <h4 className="subsection-heading">
                <CreditCard size={18} />
                Identity Proof
              </h4>

              <div className="form-section-card glass-light">
                <div className="form-grid">
                  <div className="form-group">
                    <label>ID Type <span className="required">*</span></label>
                    <select
                      value={studentData.id_type}
                      onChange={(e) => {
                        setStudentData({ ...studentData, id_type: e.target.value, id_number: '' });
                        setErrors({ ...errors, id_number: null });
                      }}
                      className="form-input"
                    >
                      {idTypeOptions.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>ID Number <span className="required">*</span></label>
                    <input
                      type="text"
                      value={studentData.id_number}
                      onChange={(e) => {
                        const formatted = formatIDNumber(studentData.id_type, e.target.value);
                        setStudentData({ ...studentData, id_number: formatted });
                      }}
                      className={`form-input ${errors.id_number ? 'error' : ''}`}
                      placeholder={idTypeOptions.find(o => o.value === studentData.id_type)?.placeholder}
                    />
                    <span className="help-text">{getIDHelpText(studentData.id_type)}</span>
                    {errors.id_number && (
                      <span className="error-text">
                        <AlertCircle size={12} />
                        {errors.id_number}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Address */}
              <h4 className="subsection-heading">
                <MapPin size={18} />
                Permanent Address
              </h4>

              <div className="form-section-card glass-light">
                <div className="form-grid single-col">
                  <div className="form-group">
                    <label>Address Line 1 <span className="required">*</span></label>
                    <input
                      type="text"
                      value={studentData.address_line1}
                      onChange={(e) => setStudentData({ ...studentData, address_line1: e.target.value })}
                      className={`form-input ${errors.address_line1 ? 'error' : ''}`}
                      placeholder="House No., Street Name"
                    />
                    {errors.address_line1 && (
                      <span className="error-text">
                        <AlertCircle size={12} />
                        {errors.address_line1}
                      </span>
                    )}
                  </div>

                  <div className="form-group">
                    <label>Address Line 2</label>
                    <input
                      type="text"
                      value={studentData.address_line2}
                      onChange={(e) => setStudentData({ ...studentData, address_line2: e.target.value })}
                      className="form-input"
                      placeholder="Area, Locality, Landmark"
                    />
                  </div>

                  <div className="form-group">
                    <label>Address Line 3</label>
                    <input
                      type="text"
                      value={studentData.address_line3}
                      onChange={(e) => setStudentData({ ...studentData, address_line3: e.target.value })}
                      className="form-input"
                      placeholder="City, State, PIN Code"
                    />
                  </div>
                </div>
              </div>

              {/* Photo Upload */}
              <h4 className="subsection-heading">
                <Upload size={18} />
                Student Photo
              </h4>

              <div className="photo-upload-section glass-light">
                <div className="photo-preview-box">
                  {photoPreview ? (
                    <img src={photoPreview} alt="Student" />
                  ) : (
                    <div className="photo-placeholder">
                      <User size={48} />
                      <span>No photo</span>
                    </div>
                  )}
                </div>
                <div className="photo-upload-actions">
                  <input
                    type="file"
                    id="photo-input"
                    accept="image/*"
                    onChange={handlePhotoChange}
                    style={{ display: 'none' }}
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => document.getElementById('photo-input').click()}
                    className="upload-btn"
                  >
                    <Upload size={16} />
                    {photoPreview ? 'Change Photo' : 'Upload Photo'}
                  </Button>
                  {photoPreview && (
                    <Button
                      type="button"
                      variant="danger"
                      onClick={handleRemovePhoto}
                      className="remove-btn"
                    >
                      <X size={16} />
                      Remove
                    </Button>
                  )}
                  <div className="photo-guidelines">
                    <Info size={14} />
                    <span>Max 5MB • JPG, PNG, GIF • Passport size recommended</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Room Allocation - UNCHANGED */}
          {currentStep === 2 && (
            <div className="step-content">
              <h3 className="step-heading">
                <Home size={24} />
                Room & Bed Allocation
              </h3>

              <div className="room-header-actions">
                <Button
                  variant="ghost"
                  onClick={() => fetchAvailableRooms(true)}
                  disabled={refreshingRooms}
                  className={`refresh-rooms-btn ${refreshingRooms ? 'spinning' : ''}`}
                >
                  <RefreshCw size={16} className={refreshingRooms ? 'spin' : ''} />
                  {refreshingRooms ? 'Refreshing...' : 'Refresh Rooms'}
                </Button>
                <div className="room-stats">
                  <span className="stat-badge available">
                    {getUniqueRooms().length} Rooms Available
                  </span>
                  <span className="stat-badge beds">
                    {availableRooms.length} Beds Available
                  </span>
                </div>
              </div>

              {availableRooms.length === 0 ? (
                <div className="alert alert-warning">
                  <AlertCircle size={24} />
                  <div>
                    <strong>No Rooms Available</strong>
                    <p>All rooms are currently occupied. Please add new rooms or free up existing beds from the Rooms page.</p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="room-allocation-grid">
                    <div className="form-section-card glass-light">
                      <div className="section-card-header">
                        <Home size={18} />
                        <span>Select Room</span>
                      </div>
                      <div className="form-group">
                        <label>Room <span className="required">*</span></label>
                        <select
                          value={allocationData.room_id}
                          onChange={(e) => setAllocationData({
                            ...allocationData,
                            room_id: e.target.value,
                            bed_id: ''
                          })}
                          className={`form-input room-select ${errors.room_id ? 'error' : ''}`}
                        >
                          <option value="">-- Select Room --</option>
                          {getUniqueRooms().map(room => (
                            <option key={room.room_id} value={room.room_id}>
                              Room {room.room_no} • Floor {room.floor_no} • {room.room_type} • {room.availableBeds} bed(s)
                            </option>
                          ))}
                        </select>
                        {errors.room_id && (
                          <span className="error-text">
                            <AlertCircle size={12} />
                            {errors.room_id}
                          </span>
                        )}
                      </div>

                      {allocationData.room_id && (
                        <div className="selected-room-info">
                          <div className="room-info-badge">
                            <Home size={16} />
                            <span>Room {getSelectedRoom()?.room_no}</span>
                          </div>
                          <div className="room-info-badge">
                            <Building size={16} />
                            <span>Floor {getSelectedRoom()?.floor_no}</span>
                          </div>
                          <div className="room-info-badge type">
                            <span>{getSelectedRoom()?.room_type}</span>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="form-section-card glass-light">
                      <div className="section-card-header">
                        <Bed size={18} />
                        <span>Select Bed</span>
                      </div>
                      <div className="form-group">
                        <label>Bed <span className="required">*</span></label>
                        <select
                          value={allocationData.bed_id}
                          onChange={(e) => setAllocationData({ ...allocationData, bed_id: e.target.value })}
                          className={`form-input ${errors.bed_id ? 'error' : ''}`}
                          disabled={!allocationData.room_id}
                        >
                          <option value="">-- Select Bed --</option>
                          {getAvailableBedsForRoom().map(room => (
                            <option key={room.bed_id} value={room.bed_id}>
                              Bed {room.bed_no} ({room.bed_label})
                            </option>
                          ))}
                        </select>
                        {errors.bed_id && (
                          <span className="error-text">
                            <AlertCircle size={12} />
                            {errors.bed_id}
                          </span>
                        )}
                        {!allocationData.room_id && (
                          <span className="help-text">Please select a room first</span>
                        )}
                      </div>

                      {allocationData.bed_id && (
                        <div className="selected-bed-info">
                          <Bed size={20} />
                          <div>
                            <strong>Bed {getAvailableBedsForRoom().find(r => r.bed_id.toString() === allocationData.bed_id)?.bed_no}</strong>
                            <span>{getAvailableBedsForRoom().find(r => r.bed_id.toString() === allocationData.bed_id)?.bed_label}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {allocationData.room_id && allocationData.bed_id && (
                    <div className="allocation-summary">
                      <h4>
                        <CheckCircle size={20} />
                        Allocation Confirmed
                      </h4>
                      <div className="summary-grid">
                        <div className="summary-item">
                          <span className="label">Student</span>
                          <span className="value">{studentData.student_name}</span>
                        </div>
                        <div className="summary-item">
                          <span className="label">Room</span>
                          <span className="value">Room {getSelectedRoom()?.room_no} (Floor {getSelectedRoom()?.floor_no})</span>
                        </div>
                        <div className="summary-item">
                          <span className="label">Bed</span>
                          <span className="value">
                            Bed {getAvailableBedsForRoom().find(r => r.bed_id.toString() === allocationData.bed_id)?.bed_no}
                          </span>
                        </div>
                        <div className="summary-item">
                          <span className="label">Room Type</span>
                          <span className="value">{getSelectedRoom()?.room_type}</span>
                        </div>
                        <div className="summary-item">
                          <span className="label">Start Date</span>
                          <span className="value">{formatDateDisplay(allocationData.allocation_start_date)}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* STEP 3: Fee Setup - UPDATED WITH FEE TYPE SELECTION */}
          {currentStep === 3 && (
            <div className="step-content">
              <h3 className="step-heading">
                <IndianRupee size={24} />
                Fee Configuration
              </h3>

              {/* NEW: Payment Mode Selection */}
              <div className="form-section-card glass-light">
                <div className="section-card-header">
                  <CreditCard size={18} />
                  <span>Payment Mode <span className="required">*</span></span>
                </div>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  <label style={{
                    flex: 1, minWidth: 200,
                    display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px',
                    border: `2px solid ${feeData.payment_mode === 'cash' ? '#6366f1' : '#e5e7eb'}`,
                    borderRadius: 12, cursor: 'pointer',
                    background: feeData.payment_mode === 'cash' ? 'rgba(99,102,241,0.08)' : 'transparent'
                  }}>
                    <input
                      type="radio"
                      name="payment_mode"
                      value="cash"
                      checked={feeData.payment_mode === 'cash'}
                      onChange={() => setFeeData({ ...feeData, payment_mode: 'cash' })}
                    />
                    <div>
                      <div style={{ fontWeight: 700 }}>💵 Cash</div>
                      <div style={{ fontSize: 12, opacity: 0.7 }}>Simple invoices, no GST split</div>
                    </div>
                  </label>
                  <label style={{
                    flex: 1, minWidth: 200,
                    display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px',
                    border: `2px solid ${feeData.payment_mode === 'online' ? '#6366f1' : '#e5e7eb'}`,
                    borderRadius: 12, cursor: 'pointer',
                    background: feeData.payment_mode === 'online' ? 'rgba(99,102,241,0.08)' : 'transparent'
                  }}>
                    <input
                      type="radio"
                      name="payment_mode"
                      value="online"
                      checked={feeData.payment_mode === 'online'}
                      onChange={() => setFeeData({ ...feeData, payment_mode: 'online' })}
                    />
                    <div>
                      <div style={{ fontWeight: 700 }}>💳 Online</div>
                      <div style={{ fontSize: 12, opacity: 0.7 }}>Splits Accommodation + Mess (₹5000) with 2.5% CGST + 2.5% SGST</div>
                    </div>
                  </label>
                </div>
              </div>

              {/* NEW: Fee Type Selection */}
              <div className="form-section-card glass-light fee-type-section">
                <div className="section-card-header">
                  <Repeat size={18} />
                  <span>Fee Collection Cycle <span className="required">*</span></span>
                </div>

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
                        onChange={(e) => setFeeData({
                          ...feeData,
                          fee_type_cycle: e.target.value,
                          // Reset fee values when changing type
                          monthly_fee: "",
                          half_yearly_fee: "",
                          yearly_fee: "",
                          next_fee_date: ""
                        })}
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

              {/* Dynamic Fee Input Section based on fee type */}
              <div className="fee-setup-grid">
                {/* Monthly Fee Input */}
                {feeData.fee_type_cycle === "monthly" && (
                  <div className="fee-card glass-light full-width">
                    <div className="fee-card-header monthly">
                      <div className="fee-icon">
                        <IndianRupee size={24} />
                      </div>
                      <div className="fee-info">
                        <span className="fee-label">Monthly Fee</span>
                        <span className="fee-required">Required</span>
                      </div>
                    </div>
                    <div className="fee-card-body">
                      <div className="fee-input-wrapper">
                        <span className="currency">₹</span>
                        <input
                          type="text"
                          value={feeData.monthly_fee}
                          onChange={(e) => {
                            const value = e.target.value.replace(/\D/g, '');
                            setFeeData({ ...feeData, monthly_fee: value });
                          }}
                          className={`form-input fee-input ${errors.monthly_fee ? 'error' : ''}`}
                          placeholder="0"
                        />
                      </div>
                      {errors.monthly_fee && (
                        <span className="error-text">
                          <AlertCircle size={12} />
                          {errors.monthly_fee}
                        </span>
                      )}
                      <span className="help-text">Fee will be collected every month on the 1st</span>
                    </div>
                  </div>
                )}

                {/* Half-Yearly Fee Input */}
                {feeData.fee_type_cycle === "half_yearly" && (
                  <>
                    <div className="fee-card glass-light">
                      <div className="fee-card-header half-yearly">
                        <div className="fee-icon">
                          <IndianRupee size={24} />
                        </div>
                        <div className="fee-info">
                          <span className="fee-label">Half-Yearly Fee</span>
                          <span className="fee-required">Required</span>
                        </div>
                      </div>
                      <div className="fee-card-body">
                        <div className="fee-input-wrapper">
                          <span className="currency">₹</span>
                          <input
                            type="text"
                            value={feeData.half_yearly_fee}
                            onChange={(e) => {
                              const value = e.target.value.replace(/\D/g, '');
                              setFeeData({ ...feeData, half_yearly_fee: value });
                            }}
                            className={`form-input fee-input ${errors.half_yearly_fee ? 'error' : ''}`}
                            placeholder="0"
                          />
                        </div>
                        {errors.half_yearly_fee && (
                          <span className="error-text">
                            <AlertCircle size={12} />
                            {errors.half_yearly_fee}
                          </span>
                        )}
                        <span className="help-text">Fee for 6 months period</span>
                      </div>
                    </div>

                    <div className="fee-card glass-light">
                      <div className="fee-card-header next-date">
                        <div className="fee-icon">
                          <Calendar size={24} />
                        </div>
                        <div className="fee-info">
                          <span className="fee-label">Next Fee Due Date</span>
                          <span className="fee-required">Required</span>
                        </div>
                      </div>
                      <div className="fee-card-body">
                        <DateInput
                          value={feeData.next_fee_date}
                          onChange={(val) => setFeeData({ ...feeData, next_fee_date: val })}
                          className={`form-input ${errors.next_fee_date ? 'error' : ''}`}
                        />
                        {errors.next_fee_date && (
                          <span className="error-text">
                            <AlertCircle size={12} />
                            {errors.next_fee_date}
                          </span>
                        )}
                        {feeData.next_fee_date && (
                          <span className="help-text">Next due: {formatDateDisplay(feeData.next_fee_date)}</span>
                        )}
                      </div>
                    </div>
                  </>
                )}

                {/* Yearly Fee Input */}
                {feeData.fee_type_cycle === "yearly" && (
                  <div className="fee-card glass-light full-width">
                    <div className="fee-card-header yearly">
                      <div className="fee-icon">
                        <IndianRupee size={24} />
                      </div>
                      <div className="fee-info">
                        <span className="fee-label">Yearly Fee</span>
                        <span className="fee-required">Required</span>
                      </div>
                    </div>
                    <div className="fee-card-body">
                      <div className="fee-input-wrapper">
                        <span className="currency">₹</span>
                        <input
                          type="text"
                          value={feeData.yearly_fee}
                          onChange={(e) => {
                            const value = e.target.value.replace(/\D/g, '');
                            setFeeData({ ...feeData, yearly_fee: value });
                          }}
                          className={`form-input fee-input ${errors.yearly_fee ? 'error' : ''}`}
                          placeholder="0"
                        />
                      </div>
                      {errors.yearly_fee && (
                        <span className="error-text">
                          <AlertCircle size={12} />
                          {errors.yearly_fee}
                        </span>
                      )}
                      <span className="help-text">Fee for complete 12 months period</span>
                    </div>
                  </div>
                )}

                {/* Security Deposit - Always visible */}
                <div className={`fee-card glass-light ${feeData.fee_type_cycle !== "half_yearly" ? "" : ""}`}>
                  <div className="fee-card-header security">
                    <div className="fee-icon">
                      <Shield size={24} />
                    </div>
                    <div className="fee-info">
                      <span className="fee-label">Security Deposit</span>
                      <span className="fee-optional">Optional</span>
                    </div>
                  </div>
                  <div className="fee-card-body">
                    <div className="fee-input-wrapper">
                      <span className="currency">₹</span>
                      <input
                        type="text"
                        value={feeData.security_deposit}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, '');
                          setFeeData({ ...feeData, security_deposit: value });
                        }}
                        className="form-input fee-input"
                        placeholder="0"
                      />
                    </div>
                    <span className="help-text">One-time refundable deposit</span>
                  </div>
                </div>
              </div>

              {/* Fee Start Date */}
              <div className="form-section-card glass-light">
                <div className="section-card-header">
                  <Calendar size={18} />
                  <span>Fee Start Date</span>
                </div>
                <div className="form-grid">
                  <div className="form-group">
                    <label>Start Date <span className="required">*</span></label>
                    <DateInput
                      value={feeData.fee_start_date}
                      onChange={(val) => setFeeData({ ...feeData, fee_start_date: val })}
                      className="form-input"
                    />
                  </div>
                </div>
              </div>

              {/* Auto Fee Generation Info - UPDATED */}
              <div className="alert alert-info">
                <Info size={22} />
                <div>
                  <strong>Automatic Fee Generation - {getFeeCycleLabel()}</strong>
                  {feeData.fee_type_cycle === "monthly" && (
                    <>
                      <p>Monthly fees will be automatically generated:</p>
                      <ul>
                        <li>If student joins mid-month, a prorated fee for remaining days will be calculated</li>
                        <li>From next month onwards, full fees will be auto-generated on 1st of every month</li>
                        <li>Fee generation continues until student checkout</li>
                      </ul>
                    </>
                  )}
                  {feeData.fee_type_cycle === "half_yearly" && (
                    <>
                      <p>Half-yearly fees will be automatically generated:</p>
                      <ul>
                        <li>First fee is created for the current period starting from joining date</li>
                        <li>Next fee will be generated on: <strong>{formatDateDisplay(feeData.next_fee_date)}</strong></li>
                        <li>Fees will be generated every 6 months until student checkout</li>
                      </ul>
                    </>
                  )}
                  {feeData.fee_type_cycle === "yearly" && (
                    <>
                      <p>Yearly fee will be automatically generated:</p>
                      <ul>
                        <li>One fee is created for the entire year starting from joining date</li>
                        <li>Next fee will be generated after 12 months</li>
                        <li>Fee generation continues annually until student checkout</li>
                      </ul>
                    </>
                  )}
                </div>
              </div>

              {/* Remarks */}
              <div className="form-section-card glass-light">
                <div className="section-card-header">
                  <FileText size={18} />
                  <span>Additional Remarks</span>
                </div>
                <div className="form-group">
                  <textarea
                    value={feeData.remarks}
                    onChange={(e) => setFeeData({ ...feeData, remarks: e.target.value })}
                    className="form-input"
                    placeholder="Any additional notes or special instructions..."
                    rows="3"
                  />
                </div>
              </div>

              {/* Fee Summary - UPDATED */}
              <div className="fee-summary">
                <h4>
                  <IndianRupee size={20} />
                  Fee Summary
                </h4>
                <div className="fee-breakdown">
                  <div className="fee-row">
                    <span>{getFeeCycleLabel()} Fee</span>
                    <span>₹ {getApplicableFeeAmount().toLocaleString('en-IN')}</span>
                  </div>

                  {Number(feeData.security_deposit) > 0 && (
                    <div className="fee-row">
                      <span>Security Deposit (One-time)</span>
                      <span>₹ {Number(feeData.security_deposit).toLocaleString('en-IN')}</span>
                    </div>
                  )}

                  <div className="fee-row total">
                    <span>First Payment Total</span>
                    <span>₹ {(getApplicableFeeAmount() + Number(feeData.security_deposit || 0)).toLocaleString('en-IN')}</span>
                  </div>

                  {/* Fee split into Accommodation + Mess (₹5000/mo) */}
                  {(() => {
                    const cycle = feeData.fee_type_cycle;
                    const months = cycle === "half_yearly" ? 6 : cycle === "yearly" ? 12 : 1;
                    const messTotal = 5000 * months;
                    const total = getApplicableFeeAmount();
                    const accommodation = Math.max(0, total - messTotal);
                    const messShown = Math.min(total, messTotal);
                    return (
                      <div style={{
                        marginTop: 8, padding: 10,
                        border: "1px dashed #94a3b8", borderRadius: 8,
                        background: "rgba(255,255,255,0.03)"
                      }}>
                        <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 6, letterSpacing: 0.5 }}>
                          AUTO-SPLIT (₹5,000 per month reserved for mess)
                        </div>
                        <div className="fee-row">
                          <span>Accommodation Fee</span>
                          <span>₹ {accommodation.toLocaleString('en-IN')}</span>
                        </div>
                        <div className="fee-row">
                          <span>Mess Fee ({months} × ₹5,000)</span>
                          <span>₹ {messShown.toLocaleString('en-IN')}</span>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Fee Schedule Info */}
                  <div className="fee-schedule-info">
                    <div className="schedule-item">
                      <Clock size={16} />
                      <span>
                        <strong>Billing Cycle:</strong> {getFeeCycleLabel()}
                        {feeData.fee_type_cycle === "monthly" && " (12 times/year)"}
                        {feeData.fee_type_cycle === "half_yearly" && " (2 times/year)"}
                        {feeData.fee_type_cycle === "yearly" && " (1 time/year)"}
                      </span>
                    </div>
                    {feeData.fee_type_cycle === "half_yearly" && feeData.next_fee_date && (
                      <div className="schedule-item">
                        <Calendar size={16} />
                        <span><strong>Next Due:</strong> {formatDateDisplay(feeData.next_fee_date)}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Complete Summary - UPDATED */}
              <div className="complete-summary">
                <h4>📋 Complete Student Summary</h4>
                <div className="summary-sections">
                  <div className="summary-section">
                    <h5>
                      <User size={16} />
                      Student Details
                    </h5>
                    <p><strong>Name:</strong> {studentData.student_name}</p>
                    <p><strong>DOB:</strong> {formatDateDisplay(studentData.date_of_birth)}</p>
                    <p><strong>Class:</strong> {formatClassCoaching(studentData.class_or_coaching)}</p>
                    <p><strong>Institute:</strong> {studentData.institute_name === "Custom" ? studentData.custom_institute_name : studentData.institute_name}</p>
                    <p><strong>Father:</strong> {studentData.father_name} ({studentData.father_mobile})</p>
                    <p><strong>Mother:</strong> {studentData.mother_name} ({studentData.mother_mobile})</p>
                  </div>

                  <div className="summary-section">
                    <h5>
                      <Home size={16} />
                      Room Allocation
                    </h5>
                    <p><strong>Room:</strong> Room {getSelectedRoom()?.room_no}</p>
                    <p><strong>Floor:</strong> {getSelectedRoom()?.floor_no}</p>
                    <p><strong>Type:</strong> {getSelectedRoom()?.room_type}</p>
                    <p><strong>Bed:</strong> Bed {getAvailableBedsForRoom().find(r => r.bed_id.toString() === allocationData.bed_id)?.bed_no}</p>
                    <p><strong>Start:</strong> {formatDateDisplay(allocationData.allocation_start_date)}</p>
                  </div>

                  <div className="summary-section">
                    <h5>
                      <IndianRupee size={16} />
                      Fee Details                    </h5>
                    <p><strong>Billing Cycle:</strong> {getFeeCycleLabel()}</p>
                    <p><strong>{getFeeCycleLabel()} Fee:</strong> ₹ {getApplicableFeeAmount().toLocaleString('en-IN')}</p>
                    <p><strong>Security:</strong> ₹ {Number(feeData.security_deposit || 0).toLocaleString('en-IN')}</p>
                    <p><strong>First Payment:</strong> ₹ {(getApplicableFeeAmount() + Number(feeData.security_deposit || 0)).toLocaleString('en-IN')}</p>
                    {feeData.fee_type_cycle === "half_yearly" && feeData.next_fee_date && (
                      <p><strong>Next Due:</strong> {formatDateDisplay(feeData.next_fee_date)}</p>
                    )}

                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="form-actions">
            <div className="action-left">
              {currentStep > 1 && (
                <Button variant="secondary" onClick={handlePrevious} disabled={loading}>
                  <ArrowLeft size={16} />
                  Previous
                </Button>
              )}
            </div>

            <div className="action-right">
              <Button variant="secondary" onClick={() => navigate("/students")} disabled={loading}>
                Cancel
              </Button>

              {currentStep < 3 ? (
                <Button variant="primary" onClick={handleNext}>
                  Next Step
                  <ArrowRight size={16} />
                </Button>
              ) : (
                <Button
                  variant="success"
                  onClick={handleSubmit}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 size={16} className="spin" />
                      Adding Student...
                    </>
                  ) : (
                    <>
                      <Save size={16} />
                      Add Student
                    </>
                  )}

                </Button>
              )}
            </div>
          </div>
        </Card>
      </div>

      {/* Print Modal */}
      {showPrintModal && createdStudentData && hostelInfo && (
        <div className="modal-overlay">
          <div className="modal-content print-modal">
            <div className="modal-header">
              <h3>✅ Student Added Successfully!</h3>
              <button
                className="close-btn"
                onClick={() => {
                  setShowPrintModal(false);
                  navigate("/students");
                }}
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <p>Student has been added successfully. You can now print the admission form.</p>

              {/* Hidden print target */}
              <div style={{ position: 'absolute', left: '-9999px', top: 0 }}>
                <StudentAdmissionForm
                  ref={printRef}
                  studentData={createdStudentData}
                  allocationData={createdStudentData.allocation}
                  feeData={createdStudentData.fees}
                  hostelInfo={hostelInfo}
                />
              </div>
            </div>
            <div className="modal-footer">
              <Button
                variant="secondary"
                onClick={() => {
                  setShowPrintModal(false);
                  navigate("/students");
                }}
              >
                Skip
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  if (printRef.current) {
                    handlePrint();
                  }
                  setTimeout(() => {
                    setShowPrintModal(false);
                    navigate("/students");
                  }, 1000);
                }}
              >
                <Printer size={16} />
                Print Form
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AddStudent;

