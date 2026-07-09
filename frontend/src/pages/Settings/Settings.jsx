import { useState, useEffect } from "react";
import {
  Download,
  Mail,
  MessageSquare,
  Key,
  Database,
  Edit,
  Save,
  X,
  Eye,
  EyeOff,
  Settings as SettingsIcon,
  Cloud,
  IndianRupee,
  Building2,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Plus,
  Trash2,
  FileText,
  UploadCloud,
  User as UserIcon
} from "lucide-react";
import Button from "../../components/buttons/Button";
import Card from "../../components/cards/Card";
import ConfirmModal from "../../components/modals/ConfirmModal";
import PromptModal from "../../components/modals/PromptModal";
import axios from "axios";
import { useAuth } from "../../contexts/AuthContext";
import { useTheme } from "../../contexts/ThemeContext";
import { authAPI } from "../../services/api/auth.api";
import { Moon, Sun } from "lucide-react";
import "./settings.css";

const Settings = () => {
  const { user, updateAuth } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const isSuperAdmin = true;
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  // Modal States
  const [showUsernameModal, setShowUsernameModal] = useState(false);
  const [usernameData, setUsernameData] = useState({
    currentPassword: "",
    newEmail: ""
  });
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showEmailTemplateModal, setShowEmailTemplateModal] = useState(false);
  const [showEmailConfigModal, setShowEmailConfigModal] = useState(false);
  const [showSmsTemplateModal, setShowSmsTemplateModal] = useState(false);
  const [showSmsConfigModal, setShowSmsConfigModal] = useState(false);
  const [showDriveConfigModal, setShowDriveConfigModal] = useState(false);
  const [showRulesModal, setShowRulesModal] = useState(false);
  const [showPenaltyConfigModal, setShowPenaltyConfigModal] = useState(false);
  const [showHostelInfoModal, setShowHostelInfoModal] = useState(false);
  const [showBackupListModal, setShowBackupListModal] = useState(false);

  const [showPassword, setShowPassword] = useState({
    current: false,
    new: false,
    confirm: false,
    email: false
  });

  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: null,
    type: "warning"
  });

  const [promptModal, setPromptModal] = useState({
    isOpen: false,
    title: "",
    message: "",
    placeholder: "",
    defaultValue: "",
    onConfirm: null
  });

  // Data States
  const [hostelInfo, setHostelInfo] = useState({
    hostel_name: "",
    tagline: "",
    address_line1: "",
    address_line2: "",
    phone: "",
    email: "",
    website: "",
    gstin: "",
    logo_left: "",
    logo_right: ""
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });

  const [emailTemplate, setEmailTemplate] = useState({
    subject: "Fee Payment Reminder - {student_name}",
    body: `Dear {father_name},

This is a reminder that the hostel fee for {student_name} is due.

Fee Details:
- Amount: ₹{fee_amount}
- Due Date: {due_date}
- Status: {fee_status}

Please make the payment at the earliest.

Thank you,
{hostel_name}`
  });

  const [invoiceEmailTemplate, setInvoiceEmailTemplate] = useState({
    subject: "Invoice #{invoice_number} - {student_name}",
    body: `Dear {father_name},

Please find attached the invoice for {student_name} for the period {period}.

Amount Payable: ₹{fee_amount}
Due Date: {due_date}

Kindly make the payment on or before the due date.

Regards,
{hostel_name}`
  });

  const [receiptEmailTemplate, setReceiptEmailTemplate] = useState({
    subject: "Payment Receipt #{receipt_number} - {student_name}",
    body: `Dear {father_name},

We have received your payment of ₹{amount_paid} for {student_name}.

Receipt No: {receipt_number}
Payment Date: {payment_date}
For Period: {period}

Please retain this receipt for your records.

Thank you,
{hostel_name}`
  });

  const [showInvoiceEmailModal, setShowInvoiceEmailModal] = useState(false);
  const [showReceiptEmailModal, setShowReceiptEmailModal] = useState(false);
  const [showPhonePeModal, setShowPhonePeModal] = useState(false);
  const [phonePeConfig, setPhonePeConfig] = useState({
    enabled: false,
    merchant_id: "",
    salt_key: "",
    salt_index: "1",
    environment: "SANDBOX", // or PROD
    callback_url: "",
  });

  const loadPhonePeConfig = async () => {
    try {
      const r = await axios.get(`${API_URL}/settings/phonepe-config`, { headers: getAuthHeaders() });
      if (r.data?.success && r.data?.data) setPhonePeConfig(prev => ({ ...prev, ...r.data.data }));
    } catch (err) { /* silent */ }
  };

  const handleSavePhonePeConfig = async () => {
    setLoading(true);
    try {
      await axios.post(`${API_URL}/settings/phonepe-config`, phonePeConfig, { headers: getAuthHeaders() });
      showSuccess("✓ PhonePe configuration saved");
      setShowPhonePeModal(false);
    } catch (err) {
      showError(err.response?.data?.message || err.message);
    } finally { setLoading(false); }
  };

  const [emailConfig, setEmailConfig] = useState({
    enabled: false,
    service: "gmail",
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    user: "",
    password: "",
    fromName: "Hostel Management",
    fromEmail: ""
  });

  const [smsTemplate, setSmsTemplate] = useState({
    message: "Dear {mother_name}, Fee of Rs.{fee_amount} for {student_name} is due on {due_date}. Please pay soon. - {hostel_name}"
  });

  const [smsConfig, setSmsConfig] = useState({
    enabled: false,
    accountSid: "",
    authToken: "",
    fromNumber: ""
  });

  const [driveConfig, setDriveConfig] = useState({
    enabled: false,
    serviceAccountJson: "",
    folderId: "",
    autoBackup: true,
    backupSchedule: "monthly"
  });

  const [penaltyConfig, setPenaltyConfig] = useState({
    enabled: false,
    grace_days: 5,
    penalty_amount: 50,
    penalty_type: 'fixed',
    penalty_percentage: 5,
    recurring: false,
    recurring_days: 7,
    max_penalty: 500,
    include_in_email: true
  });

  const [hostelRules, setHostelRules] = useState([]);
  const [newRule, setNewRule] = useState("");

  const [logoLeftFile, setLogoLeftFile] = useState(null);
  const [logoRightFile, setLogoRightFile] = useState(null);
  const [logoLeftPreview, setLogoLeftPreview] = useState(null);
  const [logoRightPreview, setLogoRightPreview] = useState(null);

  const [backupList, setBackupList] = useState([]);
  const [loadingBackups, setLoadingBackups] = useState(false);

  // API Base URL
  const API_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5001/api";

  // Show success message helper
  const showSuccess = (message) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(""), 4000);
  };

  // Show error message helper
  const showError = (message) => {
    setErrorMessage(message);
    setTimeout(() => setErrorMessage(""), 5000);
  };

  // Get auth headers
  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return { Authorization: `Bearer ${token}` };
  };

  // ==================== UTILITY HELPERS ====================

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes || bytes === 0) return '0 B';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  };

  // ==================== LIFECYCLE ====================

  useEffect(() => {
    // Close all modals on mount - prevents modal persistence bug
    setShowUsernameModal(false);
    setShowPasswordModal(false);
    setShowEmailTemplateModal(false);
    setShowEmailConfigModal(false);
    setShowSmsTemplateModal(false);
    setShowSmsConfigModal(false);
    setShowDriveConfigModal(false);
    setShowRulesModal(false);
    setShowPenaltyConfigModal(false);
    setShowHostelInfoModal(false);
    setShowBackupListModal(false);

    loadAllSettings();
  }, []);

  // ==================== LOAD FUNCTIONS ====================

  const loadAllSettings = async () => {
    setRefreshing(true);
    try {
      await Promise.allSettled([
        loadTemplates(),
        loadEmailConfig(),
        loadSmsConfig(),
        loadDriveConfig(),
        loadPenaltyConfig(),
        loadHostelRules(),
        loadHostelInfo()
      ]);
    } catch (error) {
      console.error("Error loading settings:", error);
    } finally {
      setRefreshing(false);
    }
  };

  const loadTemplates = async () => {
    try {
      const response = await axios.get(`${API_URL}/settings/templates`, {
        headers: getAuthHeaders()
      });

      if (response.data.success && response.data.data) {
        if (response.data.data.email) {
          setEmailTemplate(prev => ({ ...prev, ...response.data.data.email }));
        }
        if (response.data.data.sms) {
          setSmsTemplate(prev => ({ ...prev, ...response.data.data.sms }));
        }
        if (response.data.data.invoice_email) {
          setInvoiceEmailTemplate(prev => ({ ...prev, ...response.data.data.invoice_email }));
        }
        if (response.data.data.receipt_email) {
          setReceiptEmailTemplate(prev => ({ ...prev, ...response.data.data.receipt_email }));
        }
      }
    } catch (error) {
      console.log('Templates not loaded:', error.message);
    }
  };

  const handleSaveInvoiceEmailTemplate = async () => {
    setLoading(true);
    try {
      await axios.post(
        `${API_URL}/settings/templates/invoice-email`,
        invoiceEmailTemplate,
        { headers: getAuthHeaders() }
      );
      showSuccess("✓ Invoice email template saved!");
      setShowInvoiceEmailModal(false);
    } catch (err) {
      showError("Save failed: " + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleSaveReceiptEmailTemplate = async () => {
    setLoading(true);
    try {
      await axios.post(
        `${API_URL}/settings/templates/receipt-email`,
        receiptEmailTemplate,
        { headers: getAuthHeaders() }
      );
      showSuccess("✓ Receipt email template saved!");
      setShowReceiptEmailModal(false);
    } catch (err) {
      showError("Save failed: " + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  const loadEmailConfig = async () => {
    try {
      const response = await axios.get(`${API_URL}/settings/email-config`, {
        headers: getAuthHeaders()
      });

      if (response.data.success && response.data.data) {
        setEmailConfig(prev => ({ ...prev, ...response.data.data }));
      }
    } catch (error) {
      console.log('Email config not loaded:', error.message);
    }
  };

  const loadSmsConfig = async () => {
    try {
      const response = await axios.get(`${API_URL}/settings/sms-config`, {
        headers: getAuthHeaders()
      });

      if (response.data.success && response.data.data) {
        setSmsConfig(prev => ({ ...prev, ...response.data.data }));
      }
    } catch (error) {
      console.log('SMS config not loaded:', error.message);
    }
  };

  const loadDriveConfig = async () => {
    try {
      const response = await axios.get(`${API_URL}/settings/drive-config`, {
        headers: getAuthHeaders()
      });

      if (response.data.success && response.data.data) {
        const d = response.data.data;
        setDriveConfig({
          enabled: d.enabled || false,
          folderId: d.folder_path || "",
          serviceAccountJson: d.credentials || "",
          autoBackup: d.autoBackup ?? true,
          backupSchedule: d.backupSchedule || "monthly"
        });
      }
    } catch (error) {
      console.log('Drive config not loaded:', error.message);
    }
  };

  const loadPenaltyConfig = async () => {
    try {
      const response = await axios.get(`${API_URL}/settings/penalty-config`, {
        headers: getAuthHeaders()
      });

      if (response.data.success && response.data.data) {
        setPenaltyConfig(prev => ({ ...prev, ...response.data.data }));
      }
    } catch (error) {
      console.log('Penalty config not loaded:', error.message);
    }
  };

  const loadHostelRules = async () => {
    try {
      const response = await axios.get(`${API_URL}/settings/rules`, {
        headers: getAuthHeaders()
      });

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
      console.log("Rules not loaded:", error.message);
      setHostelRules([]);
    }
  };

  const loadHostelInfo = async () => {
    try {
      const response = await axios.get(`${API_URL}/settings/hostel-info`, {
        headers: getAuthHeaders()
      });

      if (response.data.success && response.data.data) {
        setHostelInfo(prev => ({ ...prev, ...response.data.data }));
      }
    } catch (error) {
      console.log("Hostel info not loaded:", error.message);
    }
  };

  // ==================== BACKUP HANDLERS ====================

  const handleBackup = async () => {
    setConfirmModal({
      isOpen: true,
      title: "Create Backup",
      message: "Create database backup now?",
      onConfirm: async () => {
        setConfirmModal({ ...confirmModal, isOpen: false });
        setLoading(true);
        try {
          const response = await axios.post(
            `${API_URL}/backup/create`,
            {},
            { headers: getAuthHeaders() }
          );
          showSuccess(`✓ Backup created successfully! ${response.data.message || ''}`);
        } catch (error) {
          showError("Backup failed: " + (error.response?.data?.message || error.message));
        } finally {
          setLoading(false);
        }
      }
    });
  };

  const handleListBackups = async () => {
    setShowBackupListModal(true);
    setLoadingBackups(true);
    try {
      const response = await axios.get(
        `${API_URL}/backup/list`,
        { headers: getAuthHeaders() }
      );
      if (response.data.success && Array.isArray(response.data.data)) {
        setBackupList(response.data.data);
      } else {
        setBackupList([]);
      }
    } catch (error) {
      showError("Failed to load backups: " + (error.response?.data?.message || error.message));
      setBackupList([]);
    } finally {
      setLoadingBackups(false);
    }
  };

  const handleRestoreNow = async () => {
    // Create a file input element
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.db';

    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      if (!file.name.endsWith('.db')) {
        showError("Please select a valid backup file (.db)");
        return;
      }

      setConfirmModal({
        isOpen: true,
        title: "Confirm Restore",
        message: `Are you sure you want to restore from "${file.name}"?\n\nThis will replace all current data and require an application restart.`,
        onConfirm: async () => {
          setLoading(true);
          try {
            const formData = new FormData();
            formData.append('backup', file);

            const response = await axios.post(
              `${API_URL}/backup/upload-restore`,
              formData,
              {
                headers: {
                  ...getAuthHeaders(),
                  'Content-Type': 'multipart/form-data'
                }
              }
            );

            if (response.data.success) {
              setConfirmModal({
                isOpen: true,
                title: "Restore Successful",
                message: "Backup restored successfully!\n\nThe application will now close. Please restart it manually to see the restored data.",
                onConfirm: () => {
                  if (window.electronAPI?.quitApp) {
                    window.electronAPI.quitApp();
                  } else {
                    window.close();
                  }
                },
                type: "info",
                confirmText: "Close App"
              });
            } else {
              showError(response.data.message || "Failed to restore backup");
              setLoading(false);
            }
          } catch (error) {
            showError("Failed to restore backup: " + (error.response?.data?.message || error.message));
            setLoading(false);
          }
        },
        type: "danger"
      });
    };

    // Trigger file picker
    input.click();
  };

  const handleRestoreBackup = async (filename) => {
    setConfirmModal({
      isOpen: true,
      title: "Confirm Restore",
      message: `Are you sure you want to restore from ${filename}?\n\nThis will replace all current data and require an application restart.`,
      onConfirm: async () => {
        setLoading(true);
        try {
          const response = await fetch(`${API_URL}/backup/restore/${filename}`, {
            method: "POST",
            headers: getAuthHeaders()
          });

          const result = await response.json();

          if (result.success) {
            setConfirmModal({
              isOpen: true,
              title: "Restore Successful",
              message: "Backup restored successfully!\n\nThe application will now close. Please restart it manually to see the restored data.",
              onConfirm: () => {
                if (window.electronAPI?.quitApp) {
                  window.electronAPI.quitApp();
                } else {
                  window.close();
                }
              },
              type: "info",
              confirmText: "Close App"
            });
          } else {
            showError(result.message || "Failed to restore backup");
            setLoading(false);
          }
        } catch (error) {
          showError("Failed to restore backup: " + error.message);
          setLoading(false);
        }
      },
      type: "danger"
    });
  };

  const handleDeleteBackup = async (filename) => {
    setConfirmModal({
      isOpen: true,
      title: "Delete Backup",
      message: `Delete backup "${filename}"? This cannot be undone.`,
      type: "danger",
      onConfirm: async () => {
        setConfirmModal({ ...confirmModal, isOpen: false });
        setLoading(true);
        try {
          await axios.delete(
            `${API_URL}/backup/${encodeURIComponent(filename)}`,
            { headers: getAuthHeaders() }
          );
          setBackupList(prev => prev.filter(b => b.filename !== filename));
          showSuccess(`✓ Backup "${filename}" deleted successfully!`);
        } catch (error) {
          showError("Delete failed: " + (error.response?.data?.message || error.message));
        } finally {
          setLoading(false);
        }
      }
    });
  };

  // ==================== NOTIFICATION HANDLERS ====================

  const handleTestEmail = () => {
    setPromptModal({
      isOpen: true,
      title: "Test Email",
      message: "Enter your email address for test:",
      placeholder: "example@email.com",
      defaultValue: "",
      onConfirm: async (email) => {
        if (!email) return;
        setPromptModal(prev => ({ ...prev, isOpen: false }));
        setLoading(true);
        try {
          await axios.post(
            `${API_URL}/notifications/test-email`,
            { email },
            { headers: getAuthHeaders() }
          );
          showSuccess("✓ Test email sent successfully!");
        } catch (error) {
          showError("Email failed: " + (error.response?.data?.message || error.message));
        } finally {
          setLoading(false);
        }
      }
    });
  };

  const handleTestSms = () => {
    setPromptModal({
      isOpen: true,
      title: "Test SMS",
      message: "Enter test phone number (with country code):",
      placeholder: "+919999999999",
      defaultValue: "+91",
      onConfirm: async (phone) => {
        if (!phone) return;
        setPromptModal(prev => ({ ...prev, isOpen: false }));
        setLoading(true);
        try {
          await axios.post(
            `${API_URL}/notifications/test-sms`,
            { phone },
            { headers: getAuthHeaders() }
          );
          showSuccess("✓ Test SMS sent successfully!");
        } catch (error) {
          showError("SMS failed: " + (error.response?.data?.message || error.message));
        } finally {
          setLoading(false);
        }
      }
    });
  };

  // ==================== USERNAME HANDLER ====================

  const handleChangeUsername = async () => {
    const email = (usernameData.newEmail || "").trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!usernameData.currentPassword) {
      showError("Current password is required");
      return;
    }
    if (!email || !emailRegex.test(email)) {
      showError("Please enter a valid email as your new username");
      return;
    }

    setLoading(true);
    try {
      const res = await authAPI.changeUsername({
        currentPassword: usernameData.currentPassword,
        newEmail: email
      });
      if (res.data?.success) {
        if (res.data.token && updateAuth) {
          updateAuth(res.data.token, res.data.admin?.email || email);
        }
        showSuccess("✓ Username changed successfully!");
        setShowUsernameModal(false);
        setUsernameData({ currentPassword: "", newEmail: "" });
      } else {
        showError(res.data?.message || "Failed to change username");
      }
    } catch (error) {
      showError(error.response?.data?.message || "Failed to change username");
    } finally {
      setLoading(false);
    }
  };

  // ==================== PASSWORD HANDLER ====================

  const handleChangePassword = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      showError("New passwords don't match!");
      return;
    }

    if (passwordData.newPassword.length < 6) {
      showError("Password must be at least 6 characters long!");
      return;
    }

    setLoading(true);
    try {
      await axios.post(
        `${API_URL}/auth/change-password`,
        {
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword
        },
        { headers: getAuthHeaders() }
      );
      showSuccess("✓ Password changed successfully!");
      setShowPasswordModal(false);
      setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (error) {
      showError("Password change failed: " + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  // ==================== SAVE HANDLERS ====================

  const handleSaveEmailTemplate = async () => {
    setLoading(true);
    try {
      await axios.post(
        `${API_URL}/settings/templates/email`,
        emailTemplate,
        { headers: getAuthHeaders() }
      );
      showSuccess("✓ Email template saved successfully!");
      setShowEmailTemplateModal(false);
    } catch (error) {
      showError("Save failed: " + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleSaveEmailConfig = async () => {
    if (emailConfig.enabled && (!emailConfig.user || !emailConfig.password)) {
      showError("Please fill in email and password!");
      return;
    }

    setLoading(true);
    try {
      await axios.post(
        `${API_URL}/settings/email-config`,
        emailConfig,
        { headers: getAuthHeaders() }
      );
      showSuccess("✓ Email configuration saved successfully!");
      setShowEmailConfigModal(false);
      await loadEmailConfig();
    } catch (error) {
      showError("Save failed: " + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSmsTemplate = async () => {
    setLoading(true);
    try {
      await axios.post(
        `${API_URL}/settings/templates/sms`,
        smsTemplate,
        { headers: getAuthHeaders() }
      );
      showSuccess("✓ SMS template saved successfully!");
      setShowSmsTemplateModal(false);
    } catch (error) {
      showError("Save failed: " + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSmsConfig = async () => {
    setLoading(true);
    try {
      await axios.post(
        `${API_URL}/settings/sms-config`,
        smsConfig,
        { headers: getAuthHeaders() }
      );
      showSuccess("✓ SMS configuration saved successfully!");
      setShowSmsConfigModal(false);
      await loadSmsConfig();
    } catch (error) {
      showError("Save failed: " + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDriveConfig = async () => {
    setLoading(true);
    try {
      const payload = {
        enabled: driveConfig.enabled,
        provider: "google",
        folder_path: driveConfig.folderId,
        credentials: driveConfig.serviceAccountJson,
        autoBackup: driveConfig.autoBackup,
        backupSchedule: driveConfig.backupSchedule
      };
      await axios.post(
        `${API_URL}/settings/drive-config`,
        payload,
        { headers: getAuthHeaders() }
      );
      showSuccess("✓ Google Drive configuration saved successfully!");
      setShowDriveConfigModal(false);
      await loadDriveConfig();
    } catch (error) {
      showError("Save failed: " + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleSavePenaltyConfig = async () => {
    let payload = { ...penaltyConfig };

    if (payload.enabled) {
      if (payload.penalty_type === 'fixed' && payload.penalty_amount <= 0) {
        showError("Penalty amount must be greater than 0");
        return;
      }

      if (payload.penalty_type === 'percentage' &&
        (payload.penalty_percentage <= 0 || payload.penalty_percentage > 100)) {
        showError("Penalty percentage must be between 1 and 100");
        return;
      }

      if (payload.recurring && payload.recurring_days <= 0) {
        showError("Recurring days must be greater than 0");
        return;
      }
    }

    setLoading(true);
    try {
      await axios.post(
        `${API_URL}/settings/penalty-config`,
        payload,
        { headers: getAuthHeaders() }
      );
      showSuccess("✓ Penalty configuration saved successfully!");
      setShowPenaltyConfigModal(false);
      await loadPenaltyConfig();
    } catch (error) {
      showError("Save failed: " + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleSaveHostelInfo = async () => {
    setLoading(true);
    try {
      const formData = new FormData();

      Object.keys(hostelInfo).forEach(key => {
        if (key !== 'logo_left' && key !== 'logo_right' && key !== 'rules') {
          formData.append(key, hostelInfo[key] || "");
        }
      });

      if (logoLeftFile) {
        formData.append("logo_left", logoLeftFile);
      }
      if (logoRightFile) {
        formData.append("logo_right", logoRightFile);
      }

      const response = await axios.post(
        `${API_URL}/settings/hostel-info`,
        formData,
        {
          headers: {
            ...getAuthHeaders(),
            "Content-Type": "multipart/form-data"
          }
        }
      );

      if (response.data.success) {
        showSuccess("✓ Hostel information saved successfully!");
        setShowHostelInfoModal(false);

        setLogoLeftFile(null);
        setLogoRightFile(null);
        setLogoLeftPreview(null);
        setLogoRightPreview(null);

        await loadHostelInfo();
      }
    } catch (error) {
      console.error("Error saving hostel info:", error);
      showError(error.response?.data?.message || "Failed to save hostel information");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveRules = async () => {
    setLoading(true);
    try {
      await axios.post(
        `${API_URL}/settings/rules`,
        hostelRules,
        { headers: getAuthHeaders() }
      );
      showSuccess("✓ Hostel rules saved successfully!");
      setShowRulesModal(false);
      await loadHostelRules();
    } catch (error) {
      showError("Save failed: " + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  // ==================== RULE HANDLERS ====================

  const handleAddRule = () => {
    if (newRule.trim()) {
      setHostelRules(prev => [...prev, newRule.trim()]);
      setNewRule("");
    }
  };

  const handleRemoveRule = (index) => {
    setHostelRules(prev => prev.filter((_, i) => i !== index));
  };

  // ==================== LOGO HANDLERS ====================

  const MAX_LOGO_SIZE = 1024 * 1024; // 1MB
  const MAX_DIMENSION = 300;

  const resizeImage = (file) => {
    return new Promise((resolve, reject) => {
      if (!file.type.startsWith("image/")) {
        reject("Only image files allowed");
        return;
      }

      const reader = new FileReader();
      reader.readAsDataURL(file);

      reader.onload = (e) => {
        const img = new window.Image();
        img.src = e.target.result;

        img.onload = () => {
          let { width, height } = img;

          if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
            const scale = Math.min(MAX_DIMENSION / width, MAX_DIMENSION / height);
            width = Math.round(width * scale);
            height = Math.round(height * scale);
          }

          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, width, height);

          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject("Failed to process image");
                return;
              }

              if (blob.size > MAX_LOGO_SIZE) {
                reject("Logo must be under 1MB after resize");
                return;
              }

              const resizedFile = new File([blob], file.name, { type: "image/png" });
              resolve(resizedFile);
            },
            "image/png",
            0.8
          );
        };

        img.onerror = () => reject("Failed to load image");
      };

      reader.onerror = () => reject("Failed to read file");
    });
  };

  const handleLogoLeft = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const resized = await resizeImage(file);
      setLogoLeftFile(resized);
      setLogoLeftPreview(URL.createObjectURL(resized));
    } catch (err) {
      showError(typeof err === 'string' ? err : "Failed to process logo");
    }
  };

  const handleLogoRight = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const resized = await resizeImage(file);
      setLogoRightFile(resized);
      setLogoRightPreview(URL.createObjectURL(resized));
    } catch (err) {
      showError(typeof err === 'string' ? err : "Failed to process logo");
    }
  };

  // ==================== RENDER ====================

  return (
    <div className="settings-page">
      {/* Success Message */}
      {successMessage && (
        <div className="message-banner success">
          <CheckCircle size={20} />
          <span>{successMessage}</span>
          <button onClick={() => setSuccessMessage("")} className="close-message-btn">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Error Message */}
      {errorMessage && (
        <div className="message-banner error">
          <AlertCircle size={20} />
          <span>{errorMessage}</span>
          <button onClick={() => setErrorMessage("")} className="close-message-btn">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="settings-header">
        <div className="header-content">
          <h2>Settings & Configuration</h2>
          <p className="subtitle">Manage system settings, integrations, and preferences</p>
        </div>
        <Button
          variant="ghost"
          onClick={loadAllSettings}
          disabled={refreshing}
          className={`refresh-btn ${refreshing ? 'spinning' : ''}`}
        >
          <RefreshCw size={16} className={refreshing ? 'spin' : ''} />
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </Button>
      </div>

      {/* Settings Grid */}
      <div className="settings-grid">
        {/* Database Backup */}
        {isSuperAdmin && (
        <Card>
          <div className="card-icon" style={{ backgroundColor: '#10b98115' }}>
            <Database size={24} color="#10b981" />
          </div>
          <h3>Database Backup</h3>
          <p>Manual and auto backup to Google Drive</p>
          <div className="status-badge" style={{
            backgroundColor: driveConfig.enabled ? '#d1fae5' : '#fee2e2',
            color: driveConfig.enabled ? '#065f46' : '#991b1b'
          }}>
            {driveConfig.enabled ? <CheckCircle size={14} /> : <X size={14} />}
            Auto Backup: {driveConfig.enabled ? 'Enabled' : 'Disabled'}
          </div>
          <div className="button-group">
            <Button onClick={handleBackup} loading={loading} disabled={loading} size="sm">
              <Download size={14} />
              Backup Now
            </Button>
            <Button onClick={handleRestoreNow} variant="secondary" size="sm" disabled={loading}>
              <UploadCloud size={14} />
              Restore Now
            </Button>
            <Button onClick={() => setShowDriveConfigModal(true)} variant="outline" size="sm">
              <Cloud size={14} />
              Configure
            </Button>
          </div>
          <small className="help-text">
            💡 Auto backups run on {driveConfig.backupSchedule === 'monthly' ? '1st of every month' : driveConfig.backupSchedule === 'weekly' ? 'every Sunday' : 'daily'} at 2 AM
          </small>
        </Card>
        )}

        {/* Email Notifications */}
        {isSuperAdmin && (
        <Card>
          <div className="card-icon" style={{ backgroundColor: '#3b82f615' }}>
            <Mail size={24} color="#3b82f6" />
          </div>
          <h3>Email Notifications</h3>
          <p>Configure and test email reminders</p>
          <div className="status-badge" style={{
            backgroundColor: emailConfig.enabled ? '#d1fae5' : '#fee2e2',
            color: emailConfig.enabled ? '#065f46' : '#991b1b'
          }}>
            {emailConfig.enabled ? <CheckCircle size={14} /> : <X size={14} />}
            {emailConfig.enabled ? 'Enabled' : 'Disabled'}
          </div>
          <div className="button-group">
            <Button
              onClick={handleTestEmail}
              loading={loading}
              disabled={loading || !emailConfig.enabled}
              variant="secondary"
              size="sm"
            >
              <Mail size={14} />
              Test
            </Button>
            <Button onClick={() => setShowEmailConfigModal(true)} variant="outline" size="sm">
              <SettingsIcon size={14} />
              Config
            </Button>
            <Button onClick={() => setShowEmailTemplateModal(true)} variant="outline" size="sm">
              <Edit size={14} />
              Reminder
            </Button>
            <Button onClick={() => setShowInvoiceEmailModal(true)} variant="outline" size="sm">
              <Edit size={14} />
              Invoice
            </Button>
            <Button onClick={() => setShowReceiptEmailModal(true)} variant="outline" size="sm">
              <Edit size={14} />
              Receipt
            </Button>
          </div>
          <small className="help-text">💡 Templates: Fee Reminder · Invoice Email · Receipt Email</small>
        </Card>
        )}

        {/* SMS Notifications */}
        {isSuperAdmin && (
        <Card>
          <div className="card-icon" style={{ backgroundColor: '#f59e0b15' }}>
            <MessageSquare size={24} color="#f59e0b" />
          </div>
          <h3>SMS Notifications</h3>
          <p>Configure Twilio and send SMS</p>
          <div className="status-badge" style={{
            backgroundColor: smsConfig.enabled ? '#d1fae5' : '#fee2e2',
            color: smsConfig.enabled ? '#065f46' : '#991b1b'
          }}>
            {smsConfig.enabled ? <CheckCircle size={14} /> : <X size={14} />}
            {smsConfig.enabled ? 'Enabled' : 'Disabled'}
          </div>
          <div className="button-group">
            <Button
              onClick={handleTestSms}
              loading={loading}
              disabled={loading || !smsConfig.enabled}
              variant="secondary"
              size="sm"
            >
              <MessageSquare size={14} />
              Test
            </Button>
            <Button onClick={() => setShowSmsConfigModal(true)} variant="outline" size="sm">
              <SettingsIcon size={14} />
              Config
            </Button>
            <Button onClick={() => setShowSmsTemplateModal(true)} variant="outline" size="sm">
              <Edit size={14} />
              Template
            </Button>
          </div>
        </Card>
        )}

        {/* PhonePe Payment Gateway */}
        {isSuperAdmin && (
        <Card>
          <div className="card-icon" style={{ backgroundColor: '#5f259f15' }}>
            <IndianRupee size={24} color="#5f259f" />
          </div>
          <h3>PhonePe Payment Gateway</h3>
          <p>Auto-collect fees & auto-receipt</p>
          <div className="status-badge" style={{
            backgroundColor: phonePeConfig.enabled ? '#d1fae5' : '#fee2e2',
            color: phonePeConfig.enabled ? '#065f46' : '#991b1b'
          }}>
            {phonePeConfig.enabled ? <CheckCircle size={14} /> : <X size={14} />}
            {phonePeConfig.enabled ? 'Enabled' : 'Not configured'}
          </div>
          <div className="button-group">
            <Button onClick={() => { loadPhonePeConfig(); setShowPhonePeModal(true); }} variant="outline">
              <SettingsIcon size={14} /> Configure PhonePe
            </Button>
          </div>
          <small className="help-text">💡 Payments received in PhonePe auto-update the fee & send the receipt</small>
        </Card>
        )}

        {/* Theme */}
        {isSuperAdmin && (
        <Card>
          <div className="card-icon" style={{ backgroundColor: theme === 'dark' ? '#1e293b30' : '#fde68a30' }}>
            {theme === 'dark' ? <Moon size={24} color="#cbd5e1" /> : <Sun size={24} color="#f59e0b" />}
          </div>
          <h3>Appearance</h3>
          <p>Switch between light and dark theme</p>
          <div className="status-badge" style={{
            backgroundColor: theme === 'dark' ? '#1e293b' : '#fef3c7',
            color: theme === 'dark' ? '#e2e8f0' : '#92400e'
          }}>
            {theme === 'dark' ? <Moon size={14} /> : <Sun size={14} />}
            Currently: {theme === 'dark' ? 'Dark Mode' : 'Light Mode'}
          </div>
          <div className="button-group">
            <Button onClick={toggleTheme} variant="outline">
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
              Switch to {theme === 'dark' ? 'Light' : 'Dark'} Mode
            </Button>
          </div>
          <small className="help-text">💡 Preference is saved on this device</small>
        </Card>
        )}

        {/* Change Username */}
        {isSuperAdmin && (
        <Card>
          <div className="card-icon" style={{ backgroundColor: '#0ea5e915' }}>
            <UserIcon size={24} color="#0ea5e9" />
          </div>
          <h3>Change Username</h3>
          <p>Update your admin login email</p>
          <div className="info-box compact">
            Current: <strong>{user?.email || 'admin@example.com'}</strong>
          </div>
          <div className="button-group">
            <Button onClick={() => setShowUsernameModal(true)} variant="outline">
              <UserIcon size={16} />
              Change Username
            </Button>
          </div>
          <small className="help-text">💡 You'll use this email to log in next time</small>
        </Card>
        )}

        {/* Change Password */}
        <Card>
          <div className="card-icon" style={{ backgroundColor: '#ef444415' }}>
            <Key size={24} color="#ef4444" />
          </div>
          <h3>Change Password</h3>
          <p>Update your admin password</p>
          <div className="button-group">
            <Button onClick={() => setShowPasswordModal(true)} variant="outline">
              <Key size={16} />
              Change Password
            </Button>
          </div>
          <small className="help-text">💡 Use a strong password with at least 6 characters</small>
        </Card>

        {/* Hostel Rules */}
        <Card>
          <div className="card-icon" style={{ backgroundColor: '#6366f115' }}>
            <FileText size={24} color="#6366f1" />
          </div>
          <h3>Hostel Rules</h3>
          <p>Manage rules printed on admission form</p>
          <div className="info-box compact">
            <strong>{hostelRules.length}</strong> rules configured
          </div>
          <div className="button-group">
            <Button onClick={() => setShowRulesModal(true)} variant="outline">
              <Edit size={16} />
              Edit Rules
            </Button>
          </div>
          <small className="help-text">💡 These rules will be printed on student admission form</small>
        </Card>

        {/* Penalty Settings */}
        {isSuperAdmin && (
        <Card>
          <div className="card-icon" style={{ backgroundColor: '#ef444415' }}>
            <IndianRupee size={24} color="#ef4444" />
          </div>
          <h3>Penalty Settings</h3>
          <p>Configure overdue fee penalties</p>
          <div className="status-badge" style={{
            backgroundColor: penaltyConfig.enabled ? '#d1fae5' : '#fee2e2',
            color: penaltyConfig.enabled ? '#065f46' : '#991b1b'
          }}>
            {penaltyConfig.enabled ? <CheckCircle size={14} /> : <X size={14} />}
            {penaltyConfig.enabled ? 'Enabled' : 'Disabled'}
          </div>
          {penaltyConfig.enabled && (
            <div className="info-box compact">
              <strong>₹{penaltyConfig.penalty_amount || 0}</strong> after {penaltyConfig.grace_days} days overdue
            </div>
          )}
          <div className="button-group">
            <Button onClick={() => setShowPenaltyConfigModal(true)} variant="outline">
              <SettingsIcon size={16} />
              Configure Penalty
            </Button>
          </div>
          <small className="help-text">💡 Penalties are auto-added to overdue fees</small>
        </Card>
        )}

        {/* Hostel Information */}
        <Card>
          <div className="card-icon" style={{ backgroundColor: '#8b5cf615' }}>
            <Building2 size={24} color="#8b5cf6" />
          </div>
          <h3>Hostel Information</h3>
          <p>Configure hostel name, logos, and contact details</p>
          <div className="settings-card-body">
            <div className="setting-item">
              <span className="setting-label">Name:</span>
              <span className="setting-value">{hostelInfo?.hostel_name || 'Not Set'}</span>
            </div>
            <div className="setting-item">
              <span className="setting-label">Email:</span>
              <span className="setting-value">{hostelInfo?.email || 'Not Set'}</span>
            </div>
          </div>
          <div className="button-group">
            <Button variant="outline" onClick={() => setShowHostelInfoModal(true)}>
              <Edit size={16} />
              Configure
            </Button>
          </div>
        </Card>
      </div>

      {/* System Information */}
      <div className="settings-info">
        <h3>System Information</h3>
        <div className="info-grid">
          <div className="info-item">
            <span className="info-label">Application</span>
            <span className="info-value">Madhuvan Hostel Management</span>
          </div>
          <div className="info-item">
            <span className="info-label">Version</span>
            <span className="info-value">1.0.0</span>
          </div>
          <div className="info-item">
            <span className="info-label">Database</span>
            <span className="info-value">SQLite</span>
          </div>
          <div className="info-item">
            <span className="info-label">API URL</span>
            <span className="info-value">{API_URL}</span>
          </div>
        </div>
      </div>

      {/* ==================== MODALS ==================== */}

      {/* Google Drive Config Modal */}
      {showDriveConfigModal && (
        <div className="modal-overlay" onClick={() => setShowDriveConfigModal(false)}>
          <div className="modal-content config-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3><Cloud size={20} /> Google Drive Backup Configuration</h3>
              <button className="close-btn" onClick={() => setShowDriveConfigModal(false)}>
                <X size={20} />
              </button>
            </div>

            <div className="modal-body">
              <div className="form-group checkbox">
                <label>
                  <input
                    type="checkbox"
                    checked={driveConfig.enabled}
                    onChange={(e) => setDriveConfig({ ...driveConfig, enabled: e.target.checked })}
                  />
                  <span>Enable Auto Backup to Google Drive</span>
                </label>
              </div>

              <div className="form-group">
                <label>Backup Schedule</label>
                <select
                  value={driveConfig.backupSchedule}
                  onChange={(e) => setDriveConfig({ ...driveConfig, backupSchedule: e.target.value })}
                  className="form-input"
                >
                  <option value="daily">Daily (Every day at 2 AM)</option>
                  <option value="weekly">Weekly (Every Sunday at 2 AM)</option>
                  <option value="monthly">Monthly (1st of month at 2 AM)</option>
                </select>
              </div>

              <div className="form-group">
                <label>Google Drive Folder ID *</label>
                <input
                  type="text"
                  value={driveConfig.folderId}
                  onChange={(e) => setDriveConfig({ ...driveConfig, folderId: e.target.value })}
                  placeholder="1234abcd5678efgh"
                  className="form-input"
                />
                <small className="help-text">Get folder ID from the Drive folder URL</small>
              </div>

              <div className="form-group">
                <label>Service Account JSON *</label>
                <textarea
                  value={driveConfig.serviceAccountJson}
                  onChange={(e) => setDriveConfig({ ...driveConfig, serviceAccountJson: e.target.value })}
                  placeholder='{"type": "service_account", "project_id": "..."}'
                  className="form-textarea"
                  rows={8}
                />
              </div>

              <div className="info-box">
                <strong>Setup Instructions:</strong>
                <ol>
                  <li>Go to <a href="https://console.cloud.google.com" target="_blank" rel="noopener noreferrer">Google Cloud Console</a></li>
                  <li>Create a new project or select existing one</li>
                  <li>Enable Google Drive API</li>
                  <li>Create Service Account and download JSON key</li>
                  <li>Create a folder in Google Drive and share it with the service account email</li>
                  <li>Copy the folder ID from the URL and paste it above</li>
                </ol>
              </div>
            </div>

            <div className="modal-footer">
              <Button variant="secondary" onClick={() => setShowDriveConfigModal(false)}>
                Cancel
              </Button>
              <Button variant="success" onClick={handleSaveDriveConfig} loading={loading} disabled={loading}>
                <Save size={16} /> Save Configuration
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Change Username Modal */}
      {showUsernameModal && (
        <div className="modal-overlay" onClick={() => setShowUsernameModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3><UserIcon size={20} /> Change Username</h3>
              <button className="close-btn" onClick={() => setShowUsernameModal(false)}>
                <X size={20} />
              </button>
            </div>

            <div className="modal-body">
              <div className="form-group">
                <label>Current Username</label>
                <input
                  type="text"
                  value={user?.email || ''}
                  disabled
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label>New Username (Email) *</label>
                <input
                  type="email"
                  value={usernameData.newEmail}
                  onChange={(e) => setUsernameData({ ...usernameData, newEmail: e.target.value })}
                  placeholder="new-admin@example.com"
                  className="form-input"
                  autoComplete="username"
                />
              </div>

              <div className="form-group">
                <label>Current Password *</label>
                <div className="password-input">
                  <input
                    type={showPassword.current ? "text" : "password"}
                    value={usernameData.currentPassword}
                    onChange={(e) => setUsernameData({ ...usernameData, currentPassword: e.target.value })}
                    placeholder="Enter current password to confirm"
                    className="form-input"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    className="toggle-password"
                    onClick={() => setShowPassword({ ...showPassword, current: !showPassword.current })}
                  >
                    {showPassword.current ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="info-box">
                <strong>Note:</strong> After changing, use the new email to log in.
                Your session will remain active with the new username.
              </div>
            </div>

            <div className="modal-footer">
              <Button variant="secondary" onClick={() => setShowUsernameModal(false)}>
                Cancel
              </Button>
              <Button variant="primary" onClick={handleChangeUsername} loading={loading} disabled={loading}>
                <Save size={16} /> Change Username
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      {showPasswordModal && (
        <div className="modal-overlay" onClick={() => setShowPasswordModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3><Key size={20} /> Change Password</h3>
              <button className="close-btn" onClick={() => setShowPasswordModal(false)}>
                <X size={20} />
              </button>
            </div>

            <div className="modal-body">
              <div className="form-group">
                <label>Current Password *</label>
                <div className="password-input">
                  <input
                    type={showPassword.current ? "text" : "password"}
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                    placeholder="Enter current password"
                    className="form-input"
                  />
                  <button
                    type="button"
                    className="toggle-password"
                    onClick={() => setShowPassword({ ...showPassword, current: !showPassword.current })}
                  >
                    {showPassword.current ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label>New Password *</label>
                <div className="password-input">
                  <input
                    type={showPassword.new ? "text" : "password"}
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                    placeholder="Enter new password (min 6 chars)"
                    className="form-input"
                  />
                  <button
                    type="button"
                    className="toggle-password"
                    onClick={() => setShowPassword({ ...showPassword, new: !showPassword.new })}
                  >
                    {showPassword.new ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label>Confirm New Password *</label>
                <div className="password-input">
                  <input
                    type={showPassword.confirm ? "text" : "password"}
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                    placeholder="Confirm new password"
                    className="form-input"
                  />
                  <button
                    type="button"
                    className="toggle-password"
                    onClick={() => setShowPassword({ ...showPassword, confirm: !showPassword.confirm })}
                  >
                    {showPassword.confirm ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <Button variant="secondary" onClick={() => setShowPasswordModal(false)}>
                Cancel
              </Button>
              <Button variant="primary" onClick={handleChangePassword} loading={loading} disabled={loading}>
                <Key size={16} /> Change Password
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Email Configuration Modal */}
      {showEmailConfigModal && (
        <div className="modal-overlay" onClick={() => setShowEmailConfigModal(false)}>
          <div className="modal-content config-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3><Mail size={20} /> Email Configuration (SMTP)</h3>
              <button className="close-btn" onClick={() => setShowEmailConfigModal(false)}>
                <X size={20} />
              </button>
            </div>

            <div className="modal-body">
              <div className="form-group checkbox">
                <label>
                  <input
                    type="checkbox"
                    checked={emailConfig.enabled}
                    onChange={(e) => setEmailConfig({ ...emailConfig, enabled: e.target.checked })}
                  />
                  <span>Enable Email Notifications</span>
                </label>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Service Provider</label>
                  <select
                    value={emailConfig.service}
                    onChange={(e) => {
                      const service = e.target.value;
                      const configs = {
                        gmail: { host: 'smtp.gmail.com', port: 587, secure: false },
                        outlook: { host: 'smtp-mail.outlook.com', port: 587, secure: false },
                        yahoo: { host: 'smtp.mail.yahoo.com', port: 465, secure: true },
                        custom: { host: '', port: 587, secure: false }
                      };
                      setEmailConfig({ ...emailConfig, service, ...configs[service] });
                    }}
                    className="form-input"
                  >
                    <option value="gmail">Gmail</option>
                    <option value="outlook">Outlook</option>
                    <option value="yahoo">Yahoo</option>
                    <option value="custom">Custom SMTP</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Port</label>
                  <input
                    type="number"
                    value={emailConfig.port}
                    onChange={(e) => setEmailConfig({ ...emailConfig, port: parseInt(e.target.value) || 587 })}
                    className="form-input"
                  />
                </div>
              </div>

              {emailConfig.service === 'custom' && (
                <div className="form-group">
                  <label>SMTP Host</label>
                  <input
                    type="text"
                    value={emailConfig.host}
                    onChange={(e) => setEmailConfig({ ...emailConfig, host: e.target.value })}
                    placeholder="smtp.example.com"
                    className="form-input"
                  />
                </div>
              )}

              <div className="form-group">
                <label>Email Address *</label>
                <input
                  type="email"
                  value={emailConfig.user}
                  onChange={(e) => setEmailConfig({ ...emailConfig, user: e.target.value, fromEmail: e.target.value })}
                  placeholder="your-email@gmail.com"
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label>Password / App Password *</label>
                <div className="password-input">
                  <input
                    type={showPassword.email ? "text" : "password"}
                    value={emailConfig.password}
                    onChange={(e) => setEmailConfig({ ...emailConfig, password: e.target.value })}
                    placeholder="Your password or app password"
                    className="form-input"
                  />
                  <button
                    type="button"
                    className="toggle-password"
                    onClick={() => setShowPassword({ ...showPassword, email: !showPassword.email })}
                  >
                    {showPassword.email ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label>From Name</label>
                <input
                  type="text"
                  value={emailConfig.fromName}
                  onChange={(e) => setEmailConfig({ ...emailConfig, fromName: e.target.value })}
                  placeholder="Hostel Management"
                  className="form-input"
                />
              </div>

              <div className="info-box">
                <strong>Gmail Users:</strong> Enable 2-Factor Authentication and create an App Password from your Google Account settings.
              </div>
            </div>

            <div className="modal-footer">
              <Button variant="secondary" onClick={() => setShowEmailConfigModal(false)}>
                Cancel
              </Button>
              <Button variant="success" onClick={handleSaveEmailConfig} loading={loading} disabled={loading}>
                <Save size={16} /> Save Configuration
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Email Template Modal */}
      {showEmailTemplateModal && (
        <div className="modal-overlay" onClick={() => setShowEmailTemplateModal(false)}>
          <div className="modal-content template-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3><Mail size={20} /> Edit Email Template</h3>
              <button className="close-btn" onClick={() => setShowEmailTemplateModal(false)}>
                <X size={20} />
              </button>
            </div>

            <div className="modal-body">
              <div className="template-info">
                <strong>Available Variables:</strong>
                <div className="variables-list">
                  <span className="variable">{'{student_name}'}</span>
                  <span className="variable">{'{father_name}'}</span>
                  <span className="variable">{'{mother_name}'}</span>
                  <span className="variable">{'{fee_amount}'}</span>
                  <span className="variable">{'{due_date}'}</span>
                  <span className="variable">{'{fee_status}'}</span>
                  <span className="variable">{'{hostel_name}'}</span>
                </div>
              </div>

              <div className="form-group">
                <label>Subject *</label>
                <input
                  type="text"
                  value={emailTemplate.subject}
                  onChange={(e) => setEmailTemplate({ ...emailTemplate, subject: e.target.value })}
                  placeholder="Email subject"
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label>Message Body *</label>
                <textarea
                  value={emailTemplate.body}
                  onChange={(e) => setEmailTemplate({ ...emailTemplate, body: e.target.value })}
                  placeholder="Email body"
                  className="form-textarea"
                  rows={12}
                />
              </div>
            </div>

            <div className="modal-footer">
              <Button variant="secondary" onClick={() => setShowEmailTemplateModal(false)}>
                Cancel
              </Button>
              <Button variant="success" onClick={handleSaveEmailTemplate} loading={loading} disabled={loading}>
                <Save size={16} /> Save Template
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Invoice Email Template Modal */}
      {showInvoiceEmailModal && (
        <div className="modal-overlay" onClick={() => setShowInvoiceEmailModal(false)}>
          <div className="modal-content template-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3><Mail size={20} /> Edit Invoice Email Template</h3>
              <button className="close-btn" onClick={() => setShowInvoiceEmailModal(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <div className="template-info">
                <strong>Available Variables:</strong>
                <div className="variables-list">
                  <span className="variable">{'{student_name}'}</span>
                  <span className="variable">{'{father_name}'}</span>
                  <span className="variable">{'{invoice_number}'}</span>
                  <span className="variable">{'{fee_amount}'}</span>
                  <span className="variable">{'{due_date}'}</span>
                  <span className="variable">{'{period}'}</span>
                  <span className="variable">{'{hostel_name}'}</span>
                </div>
              </div>
              <div className="form-group">
                <label>Subject *</label>
                <input
                  type="text"
                  value={invoiceEmailTemplate.subject}
                  onChange={(e) => setInvoiceEmailTemplate({ ...invoiceEmailTemplate, subject: e.target.value })}
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label>Message Body *</label>
                <textarea
                  value={invoiceEmailTemplate.body}
                  onChange={(e) => setInvoiceEmailTemplate({ ...invoiceEmailTemplate, body: e.target.value })}
                  className="form-textarea"
                  rows={12}
                />
              </div>
            </div>
            <div className="modal-footer">
              <Button variant="secondary" onClick={() => setShowInvoiceEmailModal(false)}>Cancel</Button>
              <Button variant="success" onClick={handleSaveInvoiceEmailTemplate} loading={loading} disabled={loading}>
                <Save size={16} /> Save Template
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* PhonePe Config Modal */}
      {showPhonePeModal && (
        <div className="modal-overlay" onClick={() => setShowPhonePeModal(false)}>
          <div className="modal-content config-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3><IndianRupee size={20} /> PhonePe Gateway Configuration</h3>
              <button className="close-btn" onClick={() => setShowPhonePeModal(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group checkbox">
                <label>
                  <input type="checkbox"
                    checked={phonePeConfig.enabled}
                    onChange={(e) => setPhonePeConfig({ ...phonePeConfig, enabled: e.target.checked })} />
                  <span>Enable PhonePe auto-payment</span>
                </label>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Merchant ID *</label>
                  <input className="form-input" value={phonePeConfig.merchant_id}
                    onChange={e => setPhonePeConfig({ ...phonePeConfig, merchant_id: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Environment</label>
                  <select className="form-input" value={phonePeConfig.environment}
                    onChange={e => setPhonePeConfig({ ...phonePeConfig, environment: e.target.value })}>
                    <option value="SANDBOX">Sandbox (testing)</option>
                    <option value="PROD">Production</option>
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Salt Key *</label>
                  <input className="form-input" type="password" value={phonePeConfig.salt_key}
                    onChange={e => setPhonePeConfig({ ...phonePeConfig, salt_key: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Salt Index</label>
                  <input className="form-input" value={phonePeConfig.salt_index}
                    onChange={e => setPhonePeConfig({ ...phonePeConfig, salt_index: e.target.value })} />
                </div>
              </div>
              <div className="form-group">
                <label>Callback / Webhook URL</label>
                <input className="form-input" value={phonePeConfig.callback_url}
                  placeholder="https://your-server.example.com/api/webhooks/phonepe"
                  onChange={e => setPhonePeConfig({ ...phonePeConfig, callback_url: e.target.value })} />
                <small className="help-text">PhonePe will POST payment events to this URL. Your server must be reachable from the internet.</small>
              </div>
              <div className="info-box">
                <strong>How to get credentials:</strong>
                <ol>
                  <li>Log in to PhonePe Business dashboard</li>
                  <li>Go to Developer Settings → Payment Gateway APIs</li>
                  <li>Copy Merchant ID, Salt Key and Salt Index into the fields above</li>
                  <li>Add the Callback URL to your PhonePe portal webhooks</li>
                </ol>
              </div>
            </div>
            <div className="modal-footer">
              <Button variant="secondary" onClick={() => setShowPhonePeModal(false)}>Cancel</Button>
              <Button variant="success" onClick={handleSavePhonePeConfig} loading={loading} disabled={loading}>
                <Save size={16} /> Save Configuration
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Receipt Email Template Modal */}
      {showReceiptEmailModal && (
        <div className="modal-overlay" onClick={() => setShowReceiptEmailModal(false)}>
          <div className="modal-content template-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3><Mail size={20} /> Edit Receipt Email Template</h3>
              <button className="close-btn" onClick={() => setShowReceiptEmailModal(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <div className="template-info">
                <strong>Available Variables:</strong>
                <div className="variables-list">
                  <span className="variable">{'{student_name}'}</span>
                  <span className="variable">{'{father_name}'}</span>
                  <span className="variable">{'{receipt_number}'}</span>
                  <span className="variable">{'{amount_paid}'}</span>
                  <span className="variable">{'{payment_date}'}</span>
                  <span className="variable">{'{period}'}</span>
                  <span className="variable">{'{hostel_name}'}</span>
                </div>
              </div>
              <div className="form-group">
                <label>Subject *</label>
                <input
                  type="text"
                  value={receiptEmailTemplate.subject}
                  onChange={(e) => setReceiptEmailTemplate({ ...receiptEmailTemplate, subject: e.target.value })}
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label>Message Body *</label>
                <textarea
                  value={receiptEmailTemplate.body}
                  onChange={(e) => setReceiptEmailTemplate({ ...receiptEmailTemplate, body: e.target.value })}
                  className="form-textarea"
                  rows={12}
                />
              </div>
            </div>
            <div className="modal-footer">
              <Button variant="secondary" onClick={() => setShowReceiptEmailModal(false)}>Cancel</Button>
              <Button variant="success" onClick={handleSaveReceiptEmailTemplate} loading={loading} disabled={loading}>
                <Save size={16} /> Save Template
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* SMS Template Modal */}
      {showSmsTemplateModal && (
        <div className="modal-overlay" onClick={() => setShowSmsTemplateModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3><MessageSquare size={20} /> Edit SMS Template</h3>
              <button className="close-btn" onClick={() => setShowSmsTemplateModal(false)}>
                <X size={20} />
              </button>
            </div>

            <div className="modal-body">
              <div className="template-info">
                <strong>Available Variables:</strong>
                <div className="variables-list">
                  <span className="variable">{'{student_name}'}</span>
                  <span className="variable">{'{mother_name}'}</span>
                  <span className="variable">{'{fee_amount}'}</span>
                  <span className="variable">{'{due_date}'}</span>
                  <span className="variable">{'{hostel_name}'}</span>
                </div>
                <small className="help-text">💡 Keep SMS under 160 characters</small>
              </div>

              <div className="form-group">
                <label>SMS Message * ({smsTemplate.message.length}/160)</label>
                <textarea
                  value={smsTemplate.message}
                  onChange={(e) => setSmsTemplate({ ...smsTemplate, message: e.target.value })}
                  placeholder="SMS message"
                  className="form-textarea"
                  rows={5}
                  maxLength={160}
                />
              </div>
            </div>

            <div className="modal-footer">
              <Button variant="secondary" onClick={() => setShowSmsTemplateModal(false)}>
                Cancel
              </Button>
              <Button variant="success" onClick={handleSaveSmsTemplate} loading={loading} disabled={loading}>
                <Save size={16} /> Save Template
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* SMS Config Modal */}
      {showSmsConfigModal && (
        <div className="modal-overlay" onClick={() => setShowSmsConfigModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3><MessageSquare size={20} /> SMS Configuration (Twilio)</h3>
              <button className="close-btn" onClick={() => setShowSmsConfigModal(false)}>
                <X size={20} />
              </button>
            </div>

            <div className="modal-body">
              <div className="form-group checkbox">
                <label>
                  <input
                    type="checkbox"
                    checked={smsConfig.enabled}
                    onChange={(e) => setSmsConfig({ ...smsConfig, enabled: e.target.checked })}
                  />
                  <span>Enable SMS Notifications</span>
                </label>
              </div>

              <div className="form-group">
                <label>Twilio Account SID</label>
                <input
                  type="text"
                  value={smsConfig.accountSid}
                  onChange={(e) => setSmsConfig({ ...smsConfig, accountSid: e.target.value })}
                  placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label>Twilio Auth Token</label>
                <input
                  type="password"
                  value={smsConfig.authToken}
                  onChange={(e) => setSmsConfig({ ...smsConfig, authToken: e.target.value })}
                  placeholder="Your auth token"
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label>Twilio Phone Number</label>
                <input
                  type="text"
                  value={smsConfig.fromNumber}
                  onChange={(e) => setSmsConfig({ ...smsConfig, fromNumber: e.target.value })}
                  placeholder="+1234567890"
                  className="form-input"
                />
              </div>

              <div className="info-box">
                <strong>Note:</strong> Get your Twilio credentials from <a href="https://www.twilio.com/console" target="_blank" rel="noopener noreferrer">Twilio Console</a>
              </div>
            </div>

            <div className="modal-footer">
              <Button variant="secondary" onClick={() => setShowSmsConfigModal(false)}>
                Cancel
              </Button>
              <Button variant="success" onClick={handleSaveSmsConfig} loading={loading} disabled={loading}>
                <Save size={16} /> Save Configuration
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Hostel Rules Modal */}
      {showRulesModal && (
        <div className="modal-overlay" onClick={() => setShowRulesModal(false)}>
          <div className="modal-content config-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3><FileText size={20} /> Manage Hostel Rules</h3>
              <button className="close-btn" onClick={() => setShowRulesModal(false)}>
                <X size={20} />
              </button>
            </div>

            <div className="modal-body">
              <div className="form-group">
                <label>Add New Rule</label>
                <div className="add-rule-input">
                  <input
                    type="text"
                    value={newRule}
                    onChange={(e) => setNewRule(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddRule()}
                    placeholder="Enter new rule and press Enter"
                    className="form-input"
                  />
                  <Button onClick={handleAddRule} size="sm">
                    <Plus size={16} /> Add
                  </Button>
                </div>
              </div>

              <div className="rules-list">
                <label>Current Rules ({hostelRules.length})</label>
                {hostelRules.length === 0 ? (
                  <div className="empty-accounts">
                    <FileText size={40} />
                    <p>No rules added yet</p>
                  </div>
                ) : (
                  hostelRules.map((rule, index) => (
                    <div key={index} className="rule-item">
                      <span className="rule-number">{index + 1}</span>
                      <span className="rule-text">{rule}</span>
                      <button className="remove-rule-btn" onClick={() => handleRemoveRule(index)}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="modal-footer">
              <Button variant="secondary" onClick={() => setShowRulesModal(false)}>
                Close
              </Button>
              <Button variant="success" onClick={handleSaveRules} loading={loading} disabled={loading}>
                <Save size={16} /> Save Rules
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Penalty Configuration Modal */}
      {showPenaltyConfigModal && (
        <div className="modal-overlay" onClick={() => setShowPenaltyConfigModal(false)}>
          <div className="modal-content config-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3><IndianRupee size={20} /> Penalty Configuration</h3>
              <button className="close-btn" onClick={() => setShowPenaltyConfigModal(false)}>
                <X size={20} />
              </button>
            </div>

            <div className="modal-body">
              <div className="form-group checkbox">
                <label>
                  <input
                    type="checkbox"
                    checked={penaltyConfig.enabled}
                    onChange={(e) => setPenaltyConfig({ ...penaltyConfig, enabled: e.target.checked })}
                  />
                  <span>Enable Penalty for Overdue Fees</span>
                </label>
              </div>

              {penaltyConfig.enabled && (
                <>
                  <div className="form-group">
                    <label>Grace Period (Days) *</label>
                    <input
                      type="number"
                      value={penaltyConfig.grace_days}
                      onChange={(e) => setPenaltyConfig({ ...penaltyConfig, grace_days: parseInt(e.target.value) || 0 })}
                      placeholder="5"
                      className="form-input"
                      min="0"
                    />
                    <small className="help-text">Penalty starts this many days after due date</small>
                  </div>

                  <div className="form-group">
                    <label>Penalty Type *</label>
                    <select
                      value={penaltyConfig.penalty_type}
                      onChange={(e) => setPenaltyConfig({ ...penaltyConfig, penalty_type: e.target.value })}
                      className="form-input"
                    >
                      <option value="fixed">Fixed Amount</option>
                      <option value="percentage">Percentage of Fee</option>
                    </select>
                  </div>

                  {penaltyConfig.penalty_type === 'fixed' ? (
                    <div className="form-group">
                      <label>Penalty Amount (₹) *</label>
                      <input
                        type="number"
                        value={penaltyConfig.penalty_amount}
                        onChange={(e) => setPenaltyConfig({ ...penaltyConfig, penalty_amount: parseInt(e.target.value) || 0 })}
                        placeholder="50"
                        className="form-input"
                        min="0"
                      />
                    </div>
                  ) : (
                    <div className="form-group">
                      <label>Penalty Percentage (%) *</label>
                      <input
                        type="number"
                        value={penaltyConfig.penalty_percentage}
                        onChange={(e) => setPenaltyConfig({ ...penaltyConfig, penalty_percentage: parseInt(e.target.value) || 0 })}
                        placeholder="5"
                        className="form-input"
                        min="0"
                        max="100"
                      />
                    </div>
                  )}

                  <div className="form-group checkbox">
                    <label>
                      <input
                        type="checkbox"
                        checked={penaltyConfig.recurring}
                        onChange={(e) => setPenaltyConfig({ ...penaltyConfig, recurring: e.target.checked })}
                      />
                      <span>Recurring Penalty</span>
                    </label>
                  </div>

                  {penaltyConfig.recurring && (
                    <div className="form-group">
                      <label>Recurring Interval (Days)</label>
                      <input
                        type="number"
                        value={penaltyConfig.recurring_days}
                        onChange={(e) => setPenaltyConfig({ ...penaltyConfig, recurring_days: parseInt(e.target.value) || 7 })}
                        placeholder="7"
                        className="form-input"
                        min="1"
                      />
                    </div>
                  )}

                  <div className="form-group">
                    <label>Maximum Penalty Cap (₹)</label>
                    <input
                      type="number"
                      value={penaltyConfig.max_penalty}
                      onChange={(e) => setPenaltyConfig({ ...penaltyConfig, max_penalty: parseInt(e.target.value) || 0 })}
                      placeholder="500"
                      className="form-input"
                      min="0"
                    />
                    <small className="help-text">0 = no limit</small>
                  </div>

                  <div className="form-group checkbox">
                    <label>
                      <input
                        type="checkbox"
                        checked={penaltyConfig.include_in_email}
                        onChange={(e) => setPenaltyConfig({ ...penaltyConfig, include_in_email: e.target.checked })}
                      />
                      <span>Include Penalty Details in Email Reminders</span>
                    </label>
                  </div>
                </>
              )}

              <div className="info-box">
                <strong>Example:</strong>
                <p style={{ margin: '8px 0 0 0', fontSize: '13px' }}>
                  If monthly fee is ₹10,000, due date is Jan 1st, and grace period is 5 days:
                  <br />• Jan 1-5: No penalty
                  <br />• Jan 6+: {penaltyConfig.penalty_type === 'fixed'
                    ? `₹${penaltyConfig.penalty_amount} penalty added`
                    : `${penaltyConfig.penalty_percentage}% penalty added`}
                </p>
              </div>
            </div>

            <div className="modal-footer">
              <Button variant="secondary" onClick={() => setShowPenaltyConfigModal(false)}>
                Cancel
              </Button>
              <Button variant="success" onClick={handleSavePenaltyConfig} loading={loading} disabled={loading}>
                <Save size={16} /> Save Configuration
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Hostel Info Modal */}
      {showHostelInfoModal && (
        <div className="modal-overlay" onClick={() => setShowHostelInfoModal(false)}>
          <div className="modal-content config-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3><Building2 size={20} /> Hostel Information</h3>
              <button className="close-btn" onClick={() => setShowHostelInfoModal(false)}>
                <X size={20} />
              </button>
            </div>

            <div className="modal-body">
              <div className="form-row">
                <div className="form-group">
                  <label>Hostel Name *</label>
                  <input
                    type="text"
                    value={hostelInfo.hostel_name}
                    onChange={(e) => setHostelInfo({ ...hostelInfo, hostel_name: e.target.value })}
                    placeholder="Enter hostel name"
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label>Tagline</label>
                  <input
                    type="text"
                    value={hostelInfo.tagline}
                    onChange={(e) => setHostelInfo({ ...hostelInfo, tagline: e.target.value })}
                    placeholder="e.g., Your Home Away From Home"
                    className="form-input"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Address Line 1</label>
                <input
                  type="text"
                  value={hostelInfo.address_line1}
                  onChange={(e) => setHostelInfo({ ...hostelInfo, address_line1: e.target.value })}
                  placeholder="Street address"
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label>Address Line 2</label>
                <input
                  type="text"
                  value={hostelInfo.address_line2}
                  onChange={(e) => setHostelInfo({ ...hostelInfo, address_line2: e.target.value })}
                  placeholder="City, State, ZIP"
                  className="form-input"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Phone Number *</label>
                  <input
                    type="text"
                    value={hostelInfo.phone}
                    onChange={(e) => setHostelInfo({ ...hostelInfo, phone: e.target.value })}
                    placeholder="+91-XXXXXXXXXX"
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label>Email *</label>
                  <input
                    type="email"
                    value={hostelInfo.email}
                    onChange={(e) => setHostelInfo({ ...hostelInfo, email: e.target.value })}
                    placeholder="info@yourhostel.com"
                    className="form-input"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Website</label>
                  <input
                    type="url"
                    value={hostelInfo.website}
                    onChange={(e) => setHostelInfo({ ...hostelInfo, website: e.target.value })}
                    placeholder="https://yourhostel.com"
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label>GST Number (GSTIN)</label>
                  <input
                    type="text"
                    value={hostelInfo.gstin || ''}
                    onChange={(e) => setHostelInfo({ ...hostelInfo, gstin: e.target.value.toUpperCase() })}
                    placeholder="22AAAAA0000A1Z5"
                    className="form-input"
                    maxLength={15}
                  />
                  <p className="help-text">Shown on tax invoices generated for online-payment students.</p>
                </div>
              </div>

              <div className="form-group">
                <label>Upload Logos</label>
                <p className="help-text">You can add logos for left and right sides of printed forms.</p>

                <div className="logo-upload-section">
                  <div className="logo-upload-box">
                    <label className="logo-label">Logo (Top Left)</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoLeft}
                    />
                    <p className="logo-hint">Used on left side of printed header</p>
                  </div>

                  <div className="logo-upload-box">
                    <label className="logo-label">Logo (Top Right)</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoRight}
                    />
                    <p className="logo-hint">Used on right side of printed header</p>
                  </div>
                </div>

                {/* Show existing logos from server */}
                {(hostelInfo.logo_left || hostelInfo.logo_right) && !logoLeftPreview && !logoRightPreview && (
                  <div className="logo-preview-row">
                    {hostelInfo.logo_left && (
                      <div className="logo-preview">
                        <img
                          src={`${API_URL.replace('/api', '')}${hostelInfo.logo_left}`}
                          alt="Left Logo"
                          onError={(e) => { e.target.style.display = 'none'; }}
                        />
                        <span>Current Left Logo</span>
                      </div>
                    )}
                    {hostelInfo.logo_right && (
                      <div className="logo-preview">
                        <img
                          src={`${API_URL.replace('/api', '')}${hostelInfo.logo_right}`}
                          alt="Right Logo"
                          onError={(e) => { e.target.style.display = 'none'; }}
                        />
                        <span>Current Right Logo</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Show new logo previews */}
                {(logoLeftPreview || logoRightPreview) && (
                  <div className="logo-preview-row">
                    {logoLeftPreview && (
                      <div className="logo-preview">
                        <img src={logoLeftPreview} alt="New Left Logo" />
                        <span>New Left Logo</span>
                      </div>
                    )}
                    {logoRightPreview && (
                      <div className="logo-preview">
                        <img src={logoRightPreview} alt="New Right Logo" />
                        <span>New Right Logo</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="modal-footer">
              <Button
                variant="secondary"
                onClick={() => {
                  setShowHostelInfoModal(false);
                  setLogoLeftFile(null);
                  setLogoRightFile(null);
                  setLogoLeftPreview(null);
                  setLogoRightPreview(null);
                }}
              >
                Cancel
              </Button>
              <Button
                variant="success"
                onClick={handleSaveHostelInfo}
                loading={loading}
                disabled={loading}
              >
                <Save size={16} /> Save Information
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Backup List & Restore Modal */}
      {showBackupListModal && (
        <div className="modal-overlay" onClick={() => setShowBackupListModal(false)}>
          <div className="modal-content modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                <Database size={20} />
                Database Backups
              </h3>
              <button className="modal-close" onClick={() => setShowBackupListModal(false)}>
                <X size={18} />
              </button>
            </div>

            <div className="modal-body">
              {loadingBackups ? (
                <div style={{ textAlign: 'center', padding: '40px' }}>
                  <RefreshCw size={32} className="spin" style={{ color: '#10b981' }} />
                  <p style={{ marginTop: '16px', color: '#6b7280' }}>Loading backups...</p>
                </div>
              ) : backupList.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px' }}>
                  <Database size={48} style={{ color: '#d1d5db', marginBottom: '16px' }} />
                  <p style={{ color: '#6b7280' }}>No backups found</p>
                  <p style={{ color: '#9ca3af', fontSize: '14px', marginTop: '8px' }}>
                    Create your first backup using the "Backup Now" button
                  </p>
                </div>
              ) : (
                <div className="backup-list">
                  <div className="backup-list-header">
                    <div style={{ fontSize: '14px', color: '#6b7280' }}>
                      Found {backupList.length} backup{backupList.length > 1 ? 's' : ''}
                    </div>
                  </div>

                  {backupList.map((backup, index) => (
                    <div key={backup.filename} className="backup-item">
                      <div className="backup-info">
                        <div className="backup-icon">
                          <Database size={20} color="#10b981" />
                        </div>
                        <div className="backup-details">
                          <div className="backup-filename">{backup.filename}</div>
                          <div className="backup-meta">
                            <span>{formatDate(backup.createdAt)}</span>
                            <span>&bull;</span>
                            <span>{formatFileSize(backup.size)}</span>
                          </div>
                        </div>
                      </div>
                      <div className="backup-actions">
                        <Button
                          onClick={() => handleRestoreBackup(backup.filename)}
                          variant="secondary"
                          size="sm"
                          disabled={loading}
                        >
                          <RefreshCw size={14} />
                          Restore
                        </Button>
                        <Button
                          onClick={() => handleDeleteBackup(backup.filename)}
                          variant="outline"
                          size="sm"
                          className="delete-btn"
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="modal-footer">
              <div style={{
                fontSize: '12px',
                color: '#6b7280',
                fontStyle: 'italic',
                textAlign: 'left',
                flex: 1
              }}>
                ⚠️ Restoring a backup will replace current data. A pre-restore backup is created automatically.
              </div>
              <Button variant="outline" onClick={() => setShowBackupListModal(false)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal({ ...confirmModal, isOpen: false })}
        type={confirmModal.type}
      />

      <PromptModal
        isOpen={promptModal.isOpen}
        title={promptModal.title}
        message={promptModal.message}
        placeholder={promptModal.placeholder}
        defaultValue={promptModal.defaultValue}
        onConfirm={promptModal.onConfirm}
        onCancel={() => setPromptModal(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};

export default Settings;