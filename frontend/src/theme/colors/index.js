/**
 * Color System
 * A comprehensive color palette with light/dark mode support
 */

// Color palette generator helper
const generateColorShades = (baseColor) => {
  // This is a simplified version - in production you'd use a library like polished or chroma-js
  return {
    50: baseColor,
    100: baseColor,
    200: baseColor,
    300: baseColor,
    400: baseColor,
    500: baseColor,
    600: baseColor,
    700: baseColor,
    800: baseColor,
    900: baseColor,
  };
};

const colors = {
  // ============================================
  // BRAND COLORS
  // ============================================
  brand: {
    // Primary Green Palette
    primary: {
      50: "#f0f7f5",
      100: "#d1e7e1",
      200: "#a3cfbd",
      300: "#75b799",
      400: "#479f75",
      500: "#1f3d35",    // Main primary color
      600: "#1a332d",
      700: "#162a25",
      800: "#11201d",
      900: "#0c1715",
      DEFAULT: "#1f3d35",
      light: "#2a5045",
      dark: "#16302a",
      darker: "#0f1f1a",
      contrast: "#ffffff",
    },

    // Secondary Emerald Palette
    secondary: {
      50: "#ecfdf5",
      100: "#d1fae5",
      200: "#a7f3d0",
      300: "#6ee7b7",
      400: "#34d399",
      500: "#10b981",
      600: "#059669",    // Main secondary color
      700: "#047857",
      800: "#065f46",
      900: "#064e3b",
      DEFAULT: "#059669",
      light: "#10b981",
      dark: "#047857",
      contrast: "#ffffff",
    },

    // Accent Amber Palette
    accent: {
      50: "#fffbeb",
      100: "#fef3c7",
      200: "#fde68a",
      300: "#fcd34d",
      400: "#fbbf24",
      500: "#f59e0b",    // Main accent color
      600: "#d97706",
      700: "#b45309",
      800: "#92400e",
      900: "#78350f",
      DEFAULT: "#f59e0b",
      light: "#fbbf24",
      dark: "#d97706",
      contrast: "#1f2937",
    },

    // Tertiary/Alternative colors
    tertiary: {
      DEFAULT: "#6366f1",
      light: "#818cf8",
      dark: "#4f46e5",
      contrast: "#ffffff",
    },
  },

  // ============================================
  // BACKGROUND COLORS
  // ============================================
  background: {
    // App backgrounds
    app: "#f9fafb",
    page: "#f3f4f6",
    
    // Component backgrounds
    card: "#ffffff",
    cardHover: "#fafafa",
    cardActive: "#f5f5f5",
    
    // Sidebar
    sidebar: "#ffffff",
    sidebarHover: "#f3f4f6",
    sidebarActive: "#e5e7eb",
    
    // Interactive states
    hover: "#f3f4f6",
    active: "#e5e7eb",
    selected: "#dbeafe",
    selectedHover: "#bfdbfe",
    
    // Modals & Overlays
    modal: "#ffffff",
    overlay: "rgba(0, 0, 0, 0.5)",
    overlayLight: "rgba(0, 0, 0, 0.3)",
    overlayDark: "rgba(0, 0, 0, 0.7)",
    
    // Input backgrounds
    input: "#ffffff",
    inputDisabled: "#f3f4f6",
    inputFocus: "#ffffff",
    
    // Table backgrounds
    tableHeader: "#f9fafb",
    tableRowHover: "#f3f4f6",
    tableRowSelected: "#eff6ff",
    tableRowStripe: "#fafafa",
    
    // Skeleton loading
    skeleton: "#e5e7eb",
    skeletonShimmer: "#f3f4f6",
    
    // Tooltip
    tooltip: "#1f2937",
    tooltipLight: "#ffffff",
    
    // Code blocks
    code: "#f3f4f6",
    codeInline: "#f1f5f9",
  },

  // ============================================
  // TEXT COLORS
  // ============================================
  text: {
    // Main text hierarchy
    primary: "#1f2937",
    secondary: "#4b5563",
    tertiary: "#6b7280",
    quaternary: "#9ca3af",
    
    // Disabled & placeholder
    disabled: "#d1d5db",
    placeholder: "#9ca3af",
    
    // Inverse text (on dark backgrounds)
    inverse: "#ffffff",
    inverseSecondary: "rgba(255, 255, 255, 0.8)",
    inverseTertiary: "rgba(255, 255, 255, 0.6)",
    
    // Link colors
    link: "#1f3d35",
    linkHover: "#16302a",
    linkVisited: "#4c1d95",
    
    // Heading colors
    heading: "#111827",
    subheading: "#374151",
    
    // Special text
    muted: "#9ca3af",
    highlight: "#1f3d35",
    
    // On colored backgrounds
    onPrimary: "#ffffff",
    onSecondary: "#ffffff",
    onAccent: "#1f2937",
    onSuccess: "#ffffff",
    onWarning: "#1f2937",
    onError: "#ffffff",
    onInfo: "#ffffff",
  },

  // ============================================
  // STATUS / SEMANTIC COLORS
  // ============================================
  status: {
    // Payment status
    paid: {
      bg: "#d1fae5",
      text: "#065f46",
      border: "#a7f3d0",
      icon: "#10b981",
      DEFAULT: "#10b981",
    },
    due: {
      bg: "#fef3c7",
      text: "#92400e",
      border: "#fde68a",
      icon: "#f59e0b",
      DEFAULT: "#f59e0b",
    },
    overdue: {
      bg: "#fee2e2",
      text: "#991b1b",
      border: "#fecaca",
      icon: "#ef4444",
      DEFAULT: "#ef4444",
    },
    partial: {
      bg: "#dbeafe",
      text: "#1e40af",
      border: "#bfdbfe",
      icon: "#3b82f6",
      DEFAULT: "#3b82f6",
    },
    pending: {
      bg: "#fef3c7",
      text: "#92400e",
      border: "#fde68a",
      icon: "#f59e0b",
      DEFAULT: "#f59e0b",
    },

    // General status
    active: {
      bg: "#dbeafe",
      text: "#1e40af",
      border: "#bfdbfe",
      icon: "#3b82f6",
      DEFAULT: "#3b82f6",
    },
    inactive: {
      bg: "#f1f5f9",
      text: "#475569",
      border: "#e2e8f0",
      icon: "#94a3b8",
      DEFAULT: "#94a3b8",
    },
    draft: {
      bg: "#f3f4f6",
      text: "#4b5563",
      border: "#e5e7eb",
      icon: "#6b7280",
      DEFAULT: "#6b7280",
    },
    cancelled: {
      bg: "#fee2e2",
      text: "#991b1b",
      border: "#fecaca",
      icon: "#ef4444",
      DEFAULT: "#ef4444",
    },
    completed: {
      bg: "#d1fae5",
      text: "#065f46",
      border: "#a7f3d0",
      icon: "#10b981",
      DEFAULT: "#10b981",
    },
    processing: {
      bg: "#e0e7ff",
      text: "#3730a3",
      border: "#c7d2fe",
      icon: "#6366f1",
      DEFAULT: "#6366f1",
    },

    // Online status
    online: "#10b981",
    offline: "#94a3b8",
    away: "#f59e0b",
    busy: "#ef4444",
  },

  // ============================================
  // SEMANTIC COLORS
  // ============================================
  semantic: {
    // Success
    success: {
      50: "#ecfdf5",
      100: "#d1fae5",
      200: "#a7f3d0",
      300: "#6ee7b7",
      400: "#34d399",
      500: "#10b981",
      600: "#059669",
      700: "#047857",
      800: "#065f46",
      900: "#064e3b",
      DEFAULT: "#10b981",
      light: "#d1fae5",
      dark: "#059669",
      text: "#065f46",
      bg: "#ecfdf5",
      border: "#a7f3d0",
    },

    // Error/Danger
    error: {
      50: "#fef2f2",
      100: "#fee2e2",
      200: "#fecaca",
      300: "#fca5a5",
      400: "#f87171",
      500: "#ef4444",
      600: "#dc2626",
      700: "#b91c1c",
      800: "#991b1b",
      900: "#7f1d1d",
      DEFAULT: "#ef4444",
      light: "#fee2e2",
      dark: "#dc2626",
      text: "#991b1b",
      bg: "#fef2f2",
      border: "#fecaca",
    },

    // Warning
    warning: {
      50: "#fffbeb",
      100: "#fef3c7",
      200: "#fde68a",
      300: "#fcd34d",
      400: "#fbbf24",
      500: "#f59e0b",
      600: "#d97706",
      700: "#b45309",
      800: "#92400e",
      900: "#78350f",
      DEFAULT: "#f59e0b",
      light: "#fef3c7",
      dark: "#d97706",
      text: "#92400e",
      bg: "#fffbeb",
      border: "#fde68a",
    },

    // Info
    info: {
      50: "#eff6ff",
      100: "#dbeafe",
      200: "#bfdbfe",
      300: "#93c5fd",
      400: "#60a5fa",
      500: "#3b82f6",
      600: "#2563eb",
      700: "#1d4ed8",
      800: "#1e40af",
      900: "#1e3a8a",
      DEFAULT: "#3b82f6",
      light: "#dbeafe",
      dark: "#2563eb",
      text: "#1e40af",
      bg: "#eff6ff",
      border: "#bfdbfe",
    },

    // Neutral
    neutral: {
      50: "#f9fafb",
      100: "#f3f4f6",
      200: "#e5e7eb",
      300: "#d1d5db",
      400: "#9ca3af",
      500: "#6b7280",
      600: "#4b5563",
      700: "#374151",
      800: "#1f2937",
      900: "#111827",
      DEFAULT: "#6b7280",
    },
  },

  // ============================================
  // BORDER COLORS
  // ============================================
  border: {
    // Base borders
    transparent: "transparent",
    light: "#f3f4f6",
    default: "#e5e7eb",
    medium: "#d1d5db",
    dark: "#9ca3af",
    darker: "#6b7280",
    
    // Interactive borders
    hover: "#d1d5db",
    focus: "#1f3d35",
    focusRing: "rgba(31, 61, 53, 0.25)",
    
    // Input borders
    input: "#d1d5db",
    inputHover: "#9ca3af",
    inputFocus: "#1f3d35",
    inputError: "#ef4444",
    inputSuccess: "#10b981",
    inputWarning: "#f59e0b",
    inputDisabled: "#e5e7eb",
    
    // Divider
    divider: "#e5e7eb",
    dividerLight: "#f3f4f6",
    
    // Table borders
    table: "#e5e7eb",
    tableHeader: "#d1d5db",
  },

  // ============================================
  // CHART / DATA VISUALIZATION COLORS
  // ============================================
  chart: {
    // Main chart palette
    palette: [
      "#1f3d35",  // Primary
      "#059669",  // Secondary
      "#3b82f6",  // Blue
      "#f59e0b",  // Amber
      "#ef4444",  // Red
      "#8b5cf6",  // Purple
      "#ec4899",  // Pink
      "#14b8a6",  // Teal
      "#f97316",  // Orange
      "#06b6d4",  // Cyan
    ],

    // Specific chart colors
    primary: "#1f3d35",
    secondary: "#059669",
    tertiary: "#3b82f6",
    quaternary: "#f59e0b",
    
    // Positive/Negative
    positive: "#10b981",
    negative: "#ef4444",
    neutral: "#6b7280",
    
    // Grid & Axis
    grid: "#e5e7eb",
    gridLight: "#f3f4f6",
    axis: "#9ca3af",
    axisLabel: "#6b7280",
    
    // Tooltip
    tooltipBg: "#1f2937",
    tooltipText: "#ffffff",
    tooltipBorder: "#374151",
    
    // Area chart fills (with transparency)
    area: {
      primary: "rgba(31, 61, 53, 0.1)",
      secondary: "rgba(5, 150, 105, 0.1)",
      tertiary: "rgba(59, 130, 246, 0.1)",
    },

    // Gradient definitions
    gradients: {
      primary: ["#1f3d35", "#2a5045"],
      secondary: ["#059669", "#10b981"],
      success: ["#059669", "#34d399"],
      warning: ["#d97706", "#fbbf24"],
      danger: ["#dc2626", "#f87171"],
    },
  },

  // ============================================
  // GRADIENT PRESETS
  // ============================================
  gradients: {
    // Brand gradients
    primary: "linear-gradient(135deg, #1f3d35 0%, #2a5045 100%)",
    primaryDark: "linear-gradient(135deg, #16302a 0%, #1f3d35 100%)",
    secondary: "linear-gradient(135deg, #059669 0%, #10b981 100%)",
    accent: "linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)",
    
    // Aesthetic gradients
    ocean: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    sunset: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
    forest: "linear-gradient(135deg, #11998e 0%, #38ef7d 100%)",
    aurora: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
    
    // Utility gradients
    shimmer: "linear-gradient(90deg, #f3f4f6 0%, #e5e7eb 50%, #f3f4f6 100%)",
    skeleton: "linear-gradient(90deg, #e5e7eb 25%, #f3f4f6 50%, #e5e7eb 75%)",
    
    // Glass morphism
    glass: "linear-gradient(135deg, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0.1) 100%)",
    glassDark: "linear-gradient(135deg, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.1) 100%)",
  },

  // ============================================
  // SPECIAL / MISC COLORS
  // ============================================
  special: {
    // Social colors
    facebook: "#1877f2",
    twitter: "#1da1f2",
    instagram: "#e4405f",
    linkedin: "#0a66c2",
    youtube: "#ff0000",
    whatsapp: "#25d366",
    google: "#4285f4",
    
    // Priority levels
    priority: {
      urgent: "#ef4444",
      high: "#f59e0b",
      medium: "#3b82f6",
      low: "#10b981",
      none: "#6b7280",
    },
    
    // Rating stars
    star: "#fbbf24",
    starEmpty: "#d1d5db",
    
    // Avatar fallback colors
    avatar: [
      "#ef4444", "#f97316", "#f59e0b", "#eab308",
      "#84cc16", "#22c55e", "#10b981", "#14b8a6",
      "#06b6d4", "#0ea5e9", "#3b82f6", "#6366f1",
      "#8b5cf6", "#a855f7", "#d946ef", "#ec4899",
    ],
  },
};

// ============================================
// DARK MODE COLORS
// ============================================
const darkColors = {
  brand: {
    ...colors.brand,
    primary: {
      ...colors.brand.primary,
      DEFAULT: "#2a5045",
      light: "#3a6055",
      dark: "#1f3d35",
    },
  },

  background: {
    app: "#0f172a",
    page: "#1e293b",
    card: "#1e293b",
    cardHover: "#334155",
    cardActive: "#475569",
    sidebar: "#1e293b",
    sidebarHover: "#334155",
    sidebarActive: "#475569",
    hover: "#334155",
    active: "#475569",
    selected: "#1e3a5f",
    selectedHover: "#1e40af",
    modal: "#1e293b",
    overlay: "rgba(0, 0, 0, 0.7)",
    overlayLight: "rgba(0, 0, 0, 0.5)",
    overlayDark: "rgba(0, 0, 0, 0.85)",
    input: "#1e293b",
    inputDisabled: "#334155",
    inputFocus: "#1e293b",
    tableHeader: "#334155",
    tableRowHover: "#334155",
    tableRowSelected: "#1e3a5f",
    tableRowStripe: "#1e293b",
    skeleton: "#334155",
    skeletonShimmer: "#475569",
    tooltip: "#f8fafc",
    tooltipLight: "#1e293b",
    code: "#1e293b",
    codeInline: "#334155",
  },

  text: {
    primary: "#f8fafc",
    secondary: "#cbd5e1",
    tertiary: "#94a3b8",
    quaternary: "#64748b",
    disabled: "#475569",
    placeholder: "#64748b",
    inverse: "#0f172a",
    inverseSecondary: "rgba(15, 23, 42, 0.8)",
    inverseTertiary: "rgba(15, 23, 42, 0.6)",
    link: "#38bdf8",
    linkHover: "#7dd3fc",
    linkVisited: "#a78bfa",
    heading: "#f8fafc",
    subheading: "#e2e8f0",
    muted: "#64748b",
    highlight: "#38bdf8",
    onPrimary: "#ffffff",
    onSecondary: "#ffffff",
    onAccent: "#0f172a",
    onSuccess: "#ffffff",
    onWarning: "#0f172a",
    onError: "#ffffff",
    onInfo: "#ffffff",
  },

  border: {
    transparent: "transparent",
    light: "#334155",
    default: "#475569",
    medium: "#64748b",
    dark: "#94a3b8",
    darker: "#cbd5e1",
    hover: "#64748b",
    focus: "#38bdf8",
    focusRing: "rgba(56, 189, 248, 0.25)",
    input: "#475569",
    inputHover: "#64748b",
    inputFocus: "#38bdf8",
    inputError: "#ef4444",
    inputSuccess: "#10b981",
    inputWarning: "#f59e0b",
    inputDisabled: "#334155",
    divider: "#334155",
    dividerLight: "#1e293b",
    table: "#334155",
    tableHeader: "#475569",
  },

  semantic: {
    ...colors.semantic,
    success: {
      ...colors.semantic.success,
      light: "rgba(16, 185, 129, 0.2)",
      bg: "rgba(16, 185, 129, 0.1)",
    },
    error: {
      ...colors.semantic.error,
      light: "rgba(239, 68, 68, 0.2)",
      bg: "rgba(239, 68, 68, 0.1)",
    },
    warning: {
      ...colors.semantic.warning,
      light: "rgba(245, 158, 11, 0.2)",
      bg: "rgba(245, 158, 11, 0.1)",
    },
    info: {
      ...colors.semantic.info,
      light: "rgba(59, 130, 246, 0.2)",
      bg: "rgba(59, 130, 246, 0.1)",
    },
  },

  status: {
    paid: {
      ...colors.status.paid,
      bg: "rgba(16, 185, 129, 0.15)",
      border: "rgba(16, 185, 129, 0.3)",
    },
    due: {
      ...colors.status.due,
      bg: "rgba(245, 158, 11, 0.15)",
      border: "rgba(245, 158, 11, 0.3)",
    },
    overdue: {
      ...colors.status.overdue,
      bg: "rgba(239, 68, 68, 0.15)",
      border: "rgba(239, 68, 68, 0.3)",
    },
    partial: {
      ...colors.status.partial,
      bg: "rgba(59, 130, 246, 0.15)",
      border: "rgba(59, 130, 246, 0.3)",
    },
    pending: {
      ...colors.status.pending,
      bg: "rgba(245, 158, 11, 0.15)",
      border: "rgba(245, 158, 11, 0.3)",
    },
    active: {
      ...colors.status.active,
      bg: "rgba(59, 130, 246, 0.15)",
      border: "rgba(59, 130, 246, 0.3)",
    },
    inactive: {
      ...colors.status.inactive,
      bg: "rgba(148, 163, 184, 0.15)",
      border: "rgba(148, 163, 184, 0.3)",
    },
    draft: {
      ...colors.status.draft,
      bg: "rgba(107, 114, 128, 0.15)",
      border: "rgba(107, 114, 128, 0.3)",
    },
    cancelled: {
      ...colors.status.cancelled,
      bg: "rgba(239, 68, 68, 0.15)",
      border: "rgba(239, 68, 68, 0.3)",
    },
    completed: {
      ...colors.status.completed,
      bg: "rgba(16, 185, 129, 0.15)",
      border: "rgba(16, 185, 129, 0.3)",
    },
    processing: {
      ...colors.status.processing,
      bg: "rgba(99, 102, 241, 0.15)",
      border: "rgba(99, 102, 241, 0.3)",
    },
    online: "#10b981",
    offline: "#64748b",
    away: "#f59e0b",
    busy: "#ef4444",
  },

  chart: {
    ...colors.chart,
    grid: "#334155",
    gridLight: "#1e293b",
    axis: "#64748b",
    axisLabel: "#94a3b8",
  },

  gradients: {
    ...colors.gradients,
    shimmer: "linear-gradient(90deg, #334155 0%, #475569 50%, #334155 100%)",
    skeleton: "linear-gradient(90deg, #334155 25%, #475569 50%, #334155 75%)",
    glass: "linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)",
    glassDark: "linear-gradient(135deg, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.3) 100%)",
  },

  special: colors.special,
};

// Export both light and dark themes
export { colors as lightColors, darkColors };
export default colors;