import { useState, useEffect, useRef } from "react";
import { memberAPI } from "../../services/api/member.api";
import { Camera, X, Upload, AlertCircle, Trash2 } from "lucide-react";
import DateInput from "../../components/common/DateInput";
import { getFileUrl } from "../../utils/imageSrc"; // ✅ FIX: Changed from fileUrl to imageSrc

const Icons = {
  close: "✕",
  user: "👤",
  save: "💾"
};

const ID_TYPES = [
  { value: "", label: "Select ID Type" },
  { value: "aadhar", label: "Aadhar Card" },
  { value: "pan", label: "PAN Card" },
  { value: "passport", label: "Passport" },
  { value: "driving_license", label: "Driving License" },
  { value: "voter_id", label: "Voter ID" },
  { value: "other", label: "Other" }
];

const initialFormState = {
  name: "",
  father_name: "",
  mobile: "",
  dob: "",
  date_of_joining: "",
  address: "",
  photo_url: "",
  id_type: "",
  id_number: "",
  salary: ""
  // ✅ FIX: Removed fee_commission_percent
};

const MemberForm = ({ member, isEditing, onClose, onSuccess, showToast }) => {
  const [form, setForm] = useState(initialFormState);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [originalPhoto, setOriginalPhoto] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (isEditing && member) {
      setForm({
        name: member.name || "",
        father_name: member.father_name || "",
        mobile: member.mobile || "",
        dob: member.dob ? member.dob.split('T')[0] : "",
        date_of_joining: member.date_of_joining ? member.date_of_joining.split('T')[0] : "",
        address: member.address || "",
        photo_url: member.photo_url || "",
        id_type: member.id_type || "",
        id_number: member.id_number || "",
        salary: member.salary || ""
      });

      if (member.photo_url) {
        setPhotoPreview(member.photo_url);
        setOriginalPhoto(member.photo_url);
      }
    }
  }, [member, isEditing]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));

    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast("Please select a valid image file", "error");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast("Image size should be less than 5MB", "error");
      return;
    }

    const newPreviewUrl = URL.createObjectURL(file);
    setPhotoFile(file);
    setPhotoPreview(newPreviewUrl);

    e.target.value = '';
  };

  const handleRemovePhoto = () => {
    setPhotoFile(null);
    setPhotoPreview(originalPhoto);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const validate = () => {
    const newErrors = {};

    if (!form.name.trim()) {
      newErrors.name = "Member name is required";
    }

    if (form.mobile && !/^\d{10}$/.test(form.mobile)) {
      newErrors.mobile = "Enter valid 10-digit mobile number";
    }

    if (form.salary && (isNaN(parseFloat(form.salary)) || parseFloat(form.salary) <= 0)) {
      newErrors.salary = "Enter valid salary amount";
    }

    if (form.id_type && !form.id_number.trim()) {
      newErrors.id_number = "ID number is required when ID type is selected";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validate()) return;

    try {
      setLoading(true);

      const salary = form.salary ? parseFloat(form.salary) : null;

      const data = {
        name: form.name.trim(),
        father_name: form.father_name.trim() || null,
        mobile: form.mobile.trim() || null,
        dob: form.dob || null,
        date_of_joining: form.date_of_joining || null,
        address: form.address.trim() || null,
        id_type: form.id_type || null,
        id_number: form.id_number.trim() || null,
        salary: salary
        // ✅ FIX: Removed fee_commission_percent
      };

      let memberId;
      if (isEditing) {
        await memberAPI.update(member.member_id, data);
        memberId = member.member_id;
      } else {
        const res = await memberAPI.create(data);
        memberId = res.data.data.member_id;
      }

      // Upload photo if selected
      if (photoFile) {
        const photoForm = new FormData();
        photoForm.append("photo", photoFile);
        try {
          await memberAPI.uploadPhoto(memberId, photoForm);
        } catch (photoErr) {
          console.error("Photo upload error:", photoErr);
          showToast("Member saved but photo upload failed", "warning");
        }
      }

      showToast(isEditing ? "Member updated successfully" : "Member added successfully", "success");
      onSuccess();
    } catch (error) {
      showToast(error.response?.data?.message || "Failed to save member", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container member-form-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">
            <span className="modal-icon">{Icons.user}</span>
            <h3>{isEditing ? "Edit Member" : "Add New Member"}</h3>
          </div>
          <button className="modal-close" onClick={onClose}>{Icons.close}</button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body">
          {/* Photo Upload Section */}
          <div className="form-group full-width photo-section">
            <label>Member Photo</label>
            <div className="photo-upload-wrapper">
              {photoPreview ? (
                <div className="photo-preview-container">
                  <div className="photo-preview">
                    <img
                      src={photoFile ? photoPreview : getFileUrl(photoPreview)}
                      alt="Member"
                      onError={(e) => {
                        e.target.src = '/placeholder-avatar.png';
                      }}
                    />
                  </div>
                  <div className="photo-actions">
                    <button
                      type="button"
                      className="btn-icon change-photo"
                      onClick={(e) => {
                        e.preventDefault();
                        fileInputRef.current?.click();
                      }}
                      title="Change photo"
                    >
                      <Camera size={16} />
                      Change
                    </button>
                    {photoFile && (
                      <button
                        type="button"
                        className="btn-icon remove-photo"
                        onClick={(e) => {
                          e.preventDefault();
                          handleRemovePhoto();
                        }}
                        title="Remove photo"
                      >
                        <Trash2 size={16} />
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="photo-upload-placeholder" onClick={() => fileInputRef.current?.click()}>
                  <Upload size={32} />
                  <span>Upload Photo</span>
                  <small>JPG, PNG (Max 5MB)</small>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoChange}
                className="photo-input-hidden"
                disabled={loading}
                style={{ display: 'none' }}
              />
            </div>
          </div>

          {/* Form Grid */}
          <div className="form-grid">
            {/* Name */}
            <div className="form-group full-width">
              <label>Member Name <span className="required">*</span></label>
              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="Enter full name"
                className={errors.name ? "error" : ""}
                disabled={loading}
              />
              {errors.name && <span className="error-text">{errors.name}</span>}
            </div>

            {/* Father's Name */}
            <div className="form-group">
              <label>Father's Name</label>
              <input
                type="text"
                name="father_name"
                value={form.father_name}
                onChange={handleChange}
                placeholder="Enter father's name"
                disabled={loading}
              />
            </div>

            {/* Mobile */}
            <div className="form-group">
              <label>Mobile Number</label>
              <input
                type="tel"
                name="mobile"
                value={form.mobile}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                  handleChange({ target: { name: 'mobile', value: val } });
                }}
                placeholder="10-digit mobile number"
                maxLength={10}
                className={errors.mobile ? "error" : ""}
                disabled={loading}
              />
              {errors.mobile && <span className="error-text">{errors.mobile}</span>}
            </div>

            {/* DOB */}
            <div className="form-group">
              <label>Date of Birth</label>
              <DateInput
                value={form.dob}
                onChange={(val) => setForm(prev => ({ ...prev, dob: val }))}
                disabled={loading}
              />
            </div>

            {/* Date of Joining */}
            <div className="form-group">
              <label>Date of Joining</label>
              <DateInput
                value={form.date_of_joining}
                onChange={(val) => setForm(prev => ({ ...prev, date_of_joining: val }))}
                disabled={loading}
              />
            </div>

            {/* Salary */}
            <div className="form-group">
              <label>Monthly Salary (₹)</label>
              <input
                type="number"
                name="salary"
                value={form.salary}
                onChange={handleChange}
                placeholder="Enter salary amount"
                min="0"
                step="1"
                className={errors.salary ? "error" : ""}
                disabled={loading}
              />
              {errors.salary && <span className="error-text">{errors.salary}</span>}
            </div>

            {/* ID Type */}
            <div className="form-group">
              <label>ID Type</label>
              <select
                name="id_type"
                value={form.id_type}
                onChange={handleChange}
                disabled={loading}
              >
                {ID_TYPES.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>

            {/* ID Number */}
            <div className="form-group">
              <label>ID Number</label>
              <input
                type="text"
                name="id_number"
                value={form.id_number}
                onChange={handleChange}
                placeholder="Enter ID number"
                disabled={!form.id_type || loading}
                className={errors.id_number ? "error" : ""}
              />
              {errors.id_number && <span className="error-text">{errors.id_number}</span>}
            </div>

            {/* Address */}
            <div className="form-group full-width">
              <label>Address</label>
              <textarea
                name="address"
                value={form.address}
                onChange={handleChange}
                placeholder="Enter member address"
                rows="2"
                disabled={loading}
              />
            </div>

            {/* ✅ FIX: Removed Fee Commission field entirely */}
          </div>

          {/* Modal Footer */}
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? "Saving..." : (isEditing ? "Update Member" : "Add Member")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MemberForm;