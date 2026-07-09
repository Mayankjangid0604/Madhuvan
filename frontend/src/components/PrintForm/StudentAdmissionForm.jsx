// src/components/PrintForm/StudentAdmissionForm.jsx
import { forwardRef } from "react";
import "./studentAdmissionForm.css";

const StudentAdmissionForm = forwardRef(
  ({ hostelInfo, studentData, allocationData, feeData, rules = [] }, ref) => {
    // Helper: Format date
    const formatDate = (dateStr) => {
      if (!dateStr) return "_______________";
      try {
        return new Date(dateStr).toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "long",
          year: "numeric",
        });
      } catch {
        return dateStr;
      }
    };

    // Helper: Format date short
    const formatDateShort = (dateStr) => {
      if (!dateStr) return "__/__/____";
      try {
        return new Date(dateStr).toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        });
      } catch {
        return dateStr;
      }
    };

    // Helper: Safe value or placeholder
    const safeValue = (val, placeholder = "______________________") => {
      return val && val.toString().trim() ? val : placeholder;
    };

    // Helper: Format currency
    const formatCurrency = (amount) => {
      const num = Number(amount);
      if (isNaN(num) || num === 0) return "___________";
      return `₹ ${num.toLocaleString("en-IN")}`;
    };

    // Helper: Generate Form Number - MGH 2026 0001
    const generateFormNumber = () => {
      const studentId = studentData?.student_id;
      const joiningDate = studentData?.date_of_joining || studentData?.form_date;
      
      let year = new Date().getFullYear();
      if (joiningDate) {
        try {
          year = new Date(joiningDate).getFullYear();
        } catch {
          // Use current year if parsing fails
        }
      }
      
      const paddedId = studentId ? String(studentId).padStart(4, "0") : "0000";
      return `MGH ${year} ${paddedId}`;
    };

    // Check if header has content
    const hasHeaderContent =
      hostelInfo?.hostel_name ||
      hostelInfo?.logo_left ||
      hostelInfo?.logo_right;

    // Check if address exists
    const hasAddress =
      hostelInfo?.address_line1 ||
      hostelInfo?.address_line2 ||
      hostelInfo?.phone ||
      hostelInfo?.email;

    // Get photo URL
    const getPhotoSrc = () => {
      if (studentData?.photo_base64) {
        return studentData.photo_base64;
      }
      if (studentData?.photo_url) {
        if (studentData.photo_url.startsWith("data:")) {
          return studentData.photo_url;
        }
        if (studentData.photo_url.startsWith("http")) {
          return studentData.photo_url;
        }
        return `${import.meta.env.VITE_API_BASE_URL?.replace("/api", "")}${studentData.photo_url}`;
      }
      return null;
    };

    const photoSrc = getPhotoSrc();

    // Build full address - comma separated
    const getFullAddress = () => {
      const parts = [
        studentData?.address_line1,
        studentData?.address_line2,
        studentData?.address_line3,
      ].filter(Boolean);
      
      return parts.length > 0 ? parts.join(", ") : null;
    };

    // Parse rules - handle string or array
    const parseRules = () => {
      if (!rules) return [];
      
      // If already an array, return it
      if (Array.isArray(rules)) {
        return rules.filter(r => r && r.toString().trim());
      }
      
      // If string, try to parse as JSON
      if (typeof rules === 'string') {
        try {
          const parsed = JSON.parse(rules);
          if (Array.isArray(parsed)) {
            return parsed.filter(r => r && r.toString().trim());
          }
        } catch {
          // If not valid JSON, split by newline
          return rules.split('\n').filter(r => r && r.trim());
        }
      }
      
      return [];
    };

    const hostelRules = parseRules();

    return (
      <div ref={ref} className="admission-form-print">
        {/* ==================== PAGE 1 ==================== */}
        <div className="print-page page-1">
          {/* Header - always rendered */}
          <div className="form-header">
            {/* Left Logo */}
            <div className="header-logo left">
              {hostelInfo?.logo_left && (
                <img
                  src={
                    hostelInfo.logo_left.startsWith("http") ||
                    hostelInfo.logo_left.startsWith("data:")
                      ? hostelInfo.logo_left
                      : `${import.meta.env.VITE_API_BASE_URL?.replace("/api", "")}${hostelInfo.logo_left}`
                  }
                  alt="Logo"
                  crossOrigin="anonymous"
                />
              )}
            </div>

            {/* Center Content */}
            <div className="header-center">
              <h1 className="hostel-name">
                {hostelInfo?.hostel_name || "HOSTEL"}
              </h1>
              {hostelInfo?.tagline && (
                <p className="hostel-tagline">{hostelInfo.tagline}</p>
              )}
              {hasAddress && (
                <div className="hostel-contact">
                  {(hostelInfo?.address_line1 || hostelInfo?.address_line2) && (
                    <p className="address">
                      {[hostelInfo.address_line1, hostelInfo.address_line2]
                        .filter(Boolean)
                        .join(", ")}
                    </p>
                  )}
                  <p className="contact-info">
                    {hostelInfo?.phone && <span>📞 {hostelInfo.phone}</span>}
                    {hostelInfo?.phone && hostelInfo?.email && (
                      <span className="separator"> | </span>
                    )}
                    {hostelInfo?.email && <span>✉️ {hostelInfo.email}</span>}
                  </p>
                  {hostelInfo?.website && (
                    <p className="website">🌐 {hostelInfo.website}</p>
                  )}
                </div>
              )}
            </div>

            {/* Right Logo */}
            <div className="header-logo right">
              {hostelInfo?.logo_right && (
                <img
                  src={
                    hostelInfo.logo_right.startsWith("http") ||
                    hostelInfo.logo_right.startsWith("data:")
                      ? hostelInfo.logo_right
                      : `${import.meta.env.VITE_API_BASE_URL?.replace("/api", "")}${hostelInfo.logo_right}`
                  }
                  alt="Logo"
                  crossOrigin="anonymous"
                />
              )}
            </div>
          </div>

          {/* Form Title */}
          <div className="form-title">
            <h2>ADMISSION FORM</h2>
          </div>

          {/* Form Meta Info - 3 Columns */}
          <div className="form-meta-row">
            <div className="meta-left">
              <span className="meta-item">
                <strong>Form No:</strong> {generateFormNumber()}
              </span>
            </div>
            <div className="meta-center">
              <span className="meta-item">
                <strong>Date:</strong> {formatDate(studentData?.form_date || studentData?.date_of_joining)}
              </span>
            </div>
            <div className="meta-right">
              <span className="meta-item">
                <strong>AC Unit:</strong> ________________
              </span>
            </div>
          </div>

          {/* Student Photo & Basic Info Section */}
          <div className="student-header-section">
            {/* Photo Box */}
            <div className="photo-section">
              <div className="photo-box">
                {photoSrc ? (
                  <img src={photoSrc} alt="Student Photo" crossOrigin="anonymous" />
                ) : (
                  <div className="photo-placeholder">
                    <span>PHOTO</span>
                    <small>(Passport Size)</small>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Info */}
            <div className="quick-info-section">
              <table className="info-table">
                <tbody>
                  <tr>
                    <td className="label">Student ID</td>
                    <td className="value">{safeValue(studentData?.student_id)}</td>
                  </tr>
                  <tr>
                    <td className="label">Room No.</td>
                    <td className="value">{safeValue(allocationData?.room_no)}</td>
                  </tr>
                  <tr>
                    <td className="label">Bed No.</td>
                    <td className="value">{safeValue(allocationData?.bed_no)}</td>
                  </tr>
                  <tr>
                    <td className="label">Date of Joining</td>
                    <td className="value">
                      {formatDate(allocationData?.allocation_start_date || studentData?.date_of_joining)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Personal Details Section */}
          <div className="section personal-section">
            <div className="section-title blue">
              <span className="section-number">1</span>
              Personal Details
            </div>
            <table className="details-table">
              <tbody>
                <tr>
                  <td className="label">Full Name</td>
                  <td className="value" colSpan="3">
                    {safeValue(studentData?.student_name)}
                  </td>
                </tr>
                <tr>
                  <td className="label">Date of Birth</td>
                  <td className="value">{formatDate(studentData?.date_of_birth)}</td>
                  <td className="label">Mobile No.</td>
                  <td className="value">{safeValue(studentData?.student_mobile)}</td>
                </tr>
                <tr>
                  <td className="label">Class / Course</td>
                  <td className="value">{safeValue(studentData?.class_or_coaching)}</td>
                  <td className="label">Institute Name</td>
                  <td className="value">{safeValue(studentData?.institute_name)}</td>
                </tr>
                <tr>
                  <td className="label">ID Type</td>
                  <td className="value">{safeValue(studentData?.id_type)}</td>
                  <td className="label">ID Number</td>
                  <td className="value">{safeValue(studentData?.id_number)}</td>
                </tr>
                <tr>
                  <td className="label">Address</td>
                  <td className="value" colSpan="3">
                    {getFullAddress() || safeValue(null)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Parent/Guardian Details Section */}
          <div className="section parent-section">
            <div className="section-title green">
              <span className="section-number">2</span>
              Parent / Guardian Details
            </div>
            <table className="details-table">
              <tbody>
                {/* Father's Information - One Line */}
                <tr>
                  <td className="label">Father's Name</td>
                  <td className="value">{safeValue(studentData?.father_name)}</td>
                  <td className="label">Mobile</td>
                  <td className="value">{safeValue(studentData?.father_mobile)}</td>
                  <td className="label">Email</td>
                  <td className="value">{safeValue(studentData?.father_email)}</td>
                </tr>
                
                {/* Mother's Information - One Line */}
                <tr>
                  <td className="label">Mother's Name</td>
                  <td className="value">{safeValue(studentData?.mother_name)}</td>
                  <td className="label">Mobile</td>
                  <td className="value">{safeValue(studentData?.mother_mobile)}</td>
                  <td className="label">Email</td>
                  <td className="value">{safeValue(studentData?.mother_email)}</td>
                </tr>

                {/* Local Guardian - One Line */}
                {(studentData?.local_guardian_name || studentData?.local_guardian_mobile) && (
                  <tr>
                    <td className="label">Guardian Name</td>
                    <td className="value">{safeValue(studentData?.local_guardian_name)}</td>
                    <td className="label">Relation</td>
                    <td className="value">{safeValue(studentData?.local_guardian_relation)}</td>
                    <td className="label">Mobile</td>
                    <td className="value">{safeValue(studentData?.local_guardian_mobile)}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Fee Details Section */}
          <div className="section fee-section">
            <div className="section-title purple">
              <span className="section-number">3</span>
              Fee Details
            </div>
            <table className="fee-table">
              <thead>
                <tr>
                  <th>Particulars</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Monthly Hostel Fee</td>
                  <td>{formatCurrency(feeData?.monthly_fee)}</td>
                </tr>
                <tr>
                  <td>Security Deposit (Refundable)</td>
                  <td>{formatCurrency(feeData?.security_deposit)}</td>
                </tr>
                <tr className="total-row">
                  <td><strong>Total Amount Paid</strong></td>
                  <td>
                    <strong>
                      {formatCurrency(
                        Number(feeData?.security_deposit || 0) +
                        Number(feeData?.monthly_fee || 0)
                      )}
                    </strong>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Page Footer */}
          <div className="page-footer">
            <p>Page 1 of 2</p>
          </div>
        </div>

        {/* ==================== PAGE 2 ==================== */}
        <div className="print-page page-2">
          {/* Mini Header */}
          <div className="mini-header">
            <h3>{hostelInfo?.hostel_name || "HOSTEL"}</h3>
            <p>Admission Form - {safeValue(studentData?.student_name, "Student")} | {generateFormNumber()}</p>
          </div>

          {/* Hostel Rules Section - Only shows if rules exist */}
          {hostelRules.length > 0 && (
            <div className="section rules-section">
              <div className="section-title orange">
                <span className="section-number">4</span>
                Hostel Rules & Regulations
              </div>
              <div className="rules-container">
                <ol className="rules-list">
                  {hostelRules.map((rule, index) => (
                    <li key={index}>{rule}</li>
                  ))}
                </ol>
              </div>
            </div>
          )}

          {/* No Rules Message */}
          {hostelRules.length === 0 && (
            <div className="section rules-section">
              <div className="section-title orange">
                <span className="section-number">4</span>
                Hostel Rules & Regulations
              </div>
              <div className="rules-container no-rules">
                <p className="no-rules-text">
                  Please refer to the hostel rules document provided separately or displayed at the hostel premises.
                </p>
              </div>
            </div>
          )}

          {/* Declaration Section */}
          <div className="section declaration-section">
            <div className="section-title pink">
              <span className="section-number">5</span>
              Declaration
            </div>
            
            {/* Student Declaration */}
            <div className="declaration-block student-declaration">
              <h4 className="declaration-heading">DECLARATION BY STUDENT</h4>
              <p className="declaration-text">
                I, <strong>{safeValue(studentData?.student_name, "_______________________")}</strong>, 
                daughter/son of <strong>{safeValue(studentData?.father_name, "_______________________")}</strong>, 
                hereby declare that I have not concealed any facts in the application form nor have I provided any incorrect information.
              </p>
              <p className="declaration-text">
                I have carefully read and understood the hostel rules and regulations, and I shall strictly follow these rules. 
                Otherwise, my admission may be cancelled.
              </p>
              <div className="signature-inline">
                <div className="sign-item">
                  <span className="sign-label">Signature of Student:</span>
                  <span className="sign-line"></span>
                </div>
                <div className="sign-item">
                  <span className="sign-label">Date:</span>
                  <span className="sign-line short"></span>
                </div>
              </div>
            </div>

            {/* Parent Declaration */}
            <div className="declaration-block parent-declaration">
              <h4 className="declaration-heading">DECLARATION BY PARENT / GUARDIAN</h4>
              <p className="declaration-text">
                I, <strong>{safeValue(studentData?.father_name, "_______________________")}</strong>, 
                father/mother/guardian of <strong>{safeValue(studentData?.student_name, "_______________________")}</strong>, 
                hereby declare that I have carefully read and understood the above rules and conditions and my ward fully agrees to these rules and conditions.
              </p>
              <p className="declaration-text">
                I assure that my ward will maintain disciplined behavior as a student. If my ward is found indulging in indiscipline, 
                his/her admission will be cancelled and the fees will not be refunded.
              </p>
              <p className="declaration-text">
                <strong>I shall be fully responsible for the conduct and behavior of my ward.</strong>
              </p>
            </div>
          </div>

          {/* Signature Section */}
          <div className="signature-section">
            <div className="signature-row">
              <div className="signature-box">
                <div className="sign-line-box"></div>
                <p className="sign-label-text">Signature of Parent/Guardian</p>
              </div>

              <div className="signature-box">
                <div className="sign-line-box"></div>
                <p className="sign-label-text">Signature of Director</p>
              </div>
            </div>
          </div>

          {/* Page Footer */}
          <div className="page-footer">
            <p>Page 2 of 2</p>
            {hostelInfo?.hostel_name && (
              <p className="footer-hostel">{hostelInfo.hostel_name}</p>
            )}
          </div>
        </div>
      </div>
    );
  }
);

StudentAdmissionForm.displayName = "StudentAdmissionForm";

export default StudentAdmissionForm;