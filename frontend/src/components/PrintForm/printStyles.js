// src/components/PrintForm/printStyles.js

export const printStyles = `
  @page {
    size: A4;
    margin: 0;
  }
  
  * {
    box-sizing: border-box;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
    color-adjust: exact !important;
  }
  
  body {
    margin: 0;
    padding: 0;
    font-family: "Times New Roman", Times, serif;
    font-size: 12pt;
    color: #000;
    background: #fff;
    line-height: 1.4;
  }
  
  .admission-form-print {
    width: 210mm;
    margin: 0 auto;
  }
  
  .print-page {
    width: 210mm;
    min-height: 297mm;
    padding: 10mm 12mm;
    background: #fff;
    position: relative;
    page-break-after: always;
    page-break-inside: avoid;
  }
  
  .print-page:last-child {
    page-break-after: auto;
  }
  
  /* Header */
  .form-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-bottom: 8px;
    border-bottom: 3px double #2563eb;
    margin-bottom: 10px;
    background: linear-gradient(135deg, #eff6ff 0%, #fdf4ff 100%);
    padding: 10px;
    border-radius: 8px 8px 0 0;
  }
  
  .header-logo {
    width: 65px;
    height: 65px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .header-logo img {
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
  }
  
  .header-center {
    flex: 1;
    text-align: center;
    padding: 0 12px;
  }
  
  .hostel-name {
    font-size: 20pt;
    font-weight: bold;
    margin: 0;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: #1e40af;
  }
  
  .hostel-tagline {
    font-size: 10pt;
    font-style: italic;
    margin: 2px 0 5px;
    color: #6b21a8;
  }
  
  .hostel-contact {
    font-size: 9pt;
    color: #374151;
  }
  
  .hostel-contact p {
    margin: 2px 0;
  }
  
  /* Form Title */
  .form-title {
    text-align: center;
    margin: 12px 0;
    padding: 8px 0;
    background: linear-gradient(90deg, #dbeafe 0%, #f3e8ff 50%, #fce7f3 100%);
    border: 2px solid #3b82f6;
    border-radius: 6px;
  }
  
  .form-title h2 {
    margin: 0;
    font-size: 14pt;
    font-weight: bold;
    letter-spacing: 3px;
    text-transform: uppercase;
    color: #1e3a8a;
  }
  
  /* Form Meta */
  .form-meta-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
    padding: 8px 12px;
    background: #fefce8;
    border-radius: 6px;
    border: 1px solid #fde047;
  }
  
  .meta-item {
    font-size: 10pt;
  }
  
  .meta-item strong {
    margin-right: 5px;
    color: #92400e;
  }
  
  /* Student Header Section */
  .student-header-section {
    display: flex;
    gap: 20px;
    margin-bottom: 12px;
    padding: 10px;
    background: linear-gradient(135deg, #f0fdf4 0%, #ecfeff 100%);
    border-radius: 8px;
    border: 1px solid #a7f3d0;
  }
  
  .photo-box {
    width: 90px;
    height: 110px;
    border: 3px solid #10b981;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #fff;
    overflow: hidden;
    border-radius: 6px;
  }
  
  .photo-box img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  
  .photo-placeholder {
    text-align: center;
    color: #6b7280;
    font-size: 9pt;
  }
  
  .quick-info-section {
    flex: 1;
  }
  
  .info-table {
    width: 100%;
    border-collapse: collapse;
  }
  
  .info-table td {
    padding: 5px 8px;
    border: 1px solid #86efac;
  }
  
  .info-table .label {
    width: 40%;
    font-weight: bold;
    background: #dcfce7;
    font-size: 9pt;
    color: #166534;
  }
  
  .info-table .value {
    font-size: 10pt;
    background: #fff;
  }
  
  /* Section Styles */
  .section {
    margin-bottom: 10px;
  }
  
  .section-title {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 11pt;
    font-weight: bold;
    padding: 6px 10px;
    border-radius: 6px 6px 0 0;
    text-transform: uppercase;
  }
  
  .section-title.blue {
    background: linear-gradient(90deg, #dbeafe 0%, #e0e7ff 100%);
    border: 1px solid #93c5fd;
    border-bottom: none;
    color: #1e40af;
  }
  
  .section-title.green {
    background: linear-gradient(90deg, #dcfce7 0%, #d1fae5 100%);
    border: 1px solid #86efac;
    border-bottom: none;
    color: #166534;
  }
  
  .section-title.purple {
    background: linear-gradient(90deg, #f3e8ff 0%, #ede9fe 100%);
    border: 1px solid #c4b5fd;
    border-bottom: none;
    color: #6b21a8;
  }
  
  .section-title.orange {
    background: linear-gradient(90deg, #ffedd5 0%, #fef3c7 100%);
    border: 1px solid #fdba74;
    border-bottom: none;
    color: #c2410c;
  }
  
  .section-title.pink {
    background: linear-gradient(90deg, #fce7f3 0%, #ffe4e6 100%);
    border: 1px solid #f9a8d4;
    border-bottom: none;
    color: #be185d;
  }
  
  .section-number {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 22px;
    height: 22px;
    background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
    color: #fff;
    border-radius: 50%;
    font-size: 10pt;
    font-weight: bold;
  }
  
  /* Details Table */
  .details-table {
    width: 100%;
    border-collapse: collapse;
    border: 1px solid #d1d5db;
    border-radius: 0 0 6px 6px;
    overflow: hidden;
  }
  
  .details-table td {
    padding: 6px 8px;
    border: 1px solid #e5e7eb;
    font-size: 10pt;
  }
  
  .details-table .label {
    width: 18%;
    font-weight: bold;
    background: #f9fafb;
    font-size: 9pt;
    color: #374151;
  }
  
  .details-table .value {
    width: 32%;
    background: #fff;
  }
  
  /* Parent Details - 6 columns */
  .parent-section .details-table .label {
    width: 12%;
  }
  
  .parent-section .details-table .value {
    width: 21%;
  }
  
  .parent-section .details-table td {
    padding: 5px 6px;
    font-size: 9pt;
  }
  
  .sub-header .sub-title {
    background: linear-gradient(90deg, #f0fdf4 0%, #ecfeff 100%);
    font-weight: bold;
    font-size: 9pt;
    color: #0f766e;
    text-align: center;
    padding: 4px;
    border-top: 2px solid #99f6e4;
  }
  
  /* Fee Table */
  .fee-table {
    width: 100%;
    border-collapse: collapse;
    border: 1px solid #c4b5fd;
    border-radius: 0 0 6px 6px;
    overflow: hidden;
  }
  
  .fee-table th,
  .fee-table td {
    padding: 6px 10px;
    border: 1px solid #ddd6fe;
    font-size: 10pt;
    text-align: left;
  }
  
  .fee-table th {
    background: linear-gradient(90deg, #ede9fe 0%, #f3e8ff 100%);
    font-weight: bold;
    text-transform: uppercase;
    font-size: 9pt;
    color: #6b21a8;
  }
  
  .fee-table th:last-child,
  .fee-table td:last-child {
    text-align: right;
    width: 35%;
  }
  
  .fee-table .total-row {
    background: linear-gradient(90deg, #ddd6fe 0%, #e9d5ff 100%);
  }
  
  .fee-table .total-row td {
    border-top: 2px solid #8b5cf6;
    color: #581c87;
  }
  
  /* Mini Header */
  .mini-header {
    text-align: center;
    padding: 10px;
    background: linear-gradient(135deg, #eff6ff 0%, #fdf4ff 100%);
    border-bottom: 2px solid #3b82f6;
    margin-bottom: 12px;
    border-radius: 8px 8px 0 0;
  }
  
  .mini-header h3 {
    margin: 0;
    font-size: 13pt;
    text-transform: uppercase;
    color: #1e40af;
  }
  
  .mini-header p {
    margin: 3px 0 0;
    font-size: 9pt;
    color: #6b21a8;
  }
  
  /* Rules */
  .rules-container {
    border: 1px solid #fdba74;
    border-top: none;
    padding: 10px 12px;
    background: linear-gradient(180deg, #fffbeb 0%, #fff 100%);
    border-radius: 0 0 6px 6px;
  }
  
  .rules-list {
    margin: 0;
    padding-left: 22px;
    font-size: 9pt;
    line-height: 1.45;
    color: #1f2937;
  }
  
  .rules-list li {
    margin-bottom: 4px;
    text-align: justify;
  }
  
  .no-rules-text {
    font-size: 11pt;
    color: #6b7280;
    font-style: italic;
    text-align: center;
    padding: 20px;
  }
  
  /* Declaration */
  .declaration-block {
    padding: 12px 15px;
    border: 1px solid #f9a8d4;
    border-top: none;
    background: #fff;
  }
  
  .student-declaration {
    background: linear-gradient(180deg, #fdf2f8 0%, #fff 100%);
    border-bottom: 2px dashed #f9a8d4;
  }
  
  .parent-declaration {
    background: linear-gradient(180deg, #fef7ff 0%, #fff 100%);
    border-radius: 0 0 6px 6px;
  }
  
  .declaration-heading {
    margin: 0 0 8px;
    font-size: 11pt;
    font-weight: bold;
    color: #be185d;
    text-transform: uppercase;
    padding-bottom: 4px;
    border-bottom: 1px solid #fbcfe8;
  }
  
  .declaration-text {
    margin: 0 0 8px;
    font-size: 10pt;
    text-align: justify;
    line-height: 1.5;
    color: #1f2937;
  }
  
  /* Signature */
  .signature-inline {
    display: flex;
    gap: 30px;
    margin-top: 12px;
    padding-top: 8px;
  }
  
  .sign-item {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  
  .sign-item .sign-label {
    font-size: 9pt;
    font-weight: bold;
    white-space: nowrap;
  }
  
  .sign-item .sign-line {
    display: inline-block;
    border-bottom: 1px solid #000;
    min-width: 120px;
    height: 20px;
  }
  
  .sign-item .sign-line.short {
    min-width: 80px;
  }
  
  .signature-section {
    margin: 20px 0 15px;
    padding: 15px;
    background: linear-gradient(135deg, #f0fdf4 0%, #f0f9ff 50%, #fdf4ff 100%);
    border-radius: 8px;
    border: 1px solid #a7f3d0;
  }
  
  .signature-row {
    display: flex;
    justify-content: space-between;
    gap: 40px;
  }
  
  .signature-box {
    flex: 1;
    text-align: center;
  }
  
  .sign-line-box {
    border-bottom: 2px solid #374151;
    height: 50px;
    margin-bottom: 6px;
    background: #fff;
    border-radius: 4px;
  }
  
  .sign-label-text {
    margin: 0;
    font-size: 10pt;
    font-weight: bold;
    color: #1f2937;
  }
  
  /* Page Footer */
  .page-footer {
    position: absolute;
    bottom: 8mm;
    left: 12mm;
    right: 12mm;
    text-align: center;
    font-size: 8pt;
    color: #6b7280;
    border-top: 1px solid #e5e7eb;
    padding-top: 6px;
  }
  
  .page-footer p {
    margin: 0;
  }
  
  .footer-hostel {
    font-size: 7pt;
    margin-top: 2px;
    color: #9ca3af;
  }
  
  @media print {
    body {
      margin: 0;
      padding: 0;
    }
    
    .print-page {
      page-break-after: always;
    }
    
    .print-page:last-child {
      page-break-after: auto;
    }
  }
`;