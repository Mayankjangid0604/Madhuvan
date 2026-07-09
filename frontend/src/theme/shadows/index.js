/**
 * Shadow System
 * Box shadows for elevation and depth
 */

const shadows = {
  // ============================================
  // STANDARD SHADOWS
  // ============================================
  none: 'none',
  
  // Extra small - subtle
  xs: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  
  // Small - input focus, small cards
  sm: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)',
  
  // Default - cards, dropdowns
  DEFAULT: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
  
  // Large - modals, popovers
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',
  
  // Extra large - mega menus
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
  
  // 2XL - floating elements
  '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
  
  // Inner shadow
  inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.05)',
  innerMd: 'inset 0 4px 6px 0 rgba(0, 0, 0, 0.1)',

  // ============================================
  // COMPONENT SHADOWS
  // ============================================
  card: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
  cardHover: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  cardElevated: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  
  button: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  buttonHover: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  buttonActive: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.1)',
  
  dropdown: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  popover: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  modal: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
  sidebar: '4px 0 6px -1px rgba(0, 0, 0, 0.1)',
  
  tooltip: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  toast: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  
  input: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  inputFocus: '0 0 0 3px rgba(31, 61, 53, 0.15)',
  
  // ============================================
  // COLORED SHADOWS
  // ============================================
  primary: '0 4px 14px 0 rgba(31, 61, 53, 0.25)',
  primaryHover: '0 6px 20px 0 rgba(31, 61, 53, 0.35)',
  
  secondary: '0 4px 14px 0 rgba(5, 150, 105, 0.25)',
  secondaryHover: '0 6px 20px 0 rgba(5, 150, 105, 0.35)',
  
  success: '0 4px 14px 0 rgba(16, 185, 129, 0.25)',
  successHover: '0 6px 20px 0 rgba(16, 185, 129, 0.35)',
  
  warning: '0 4px 14px 0 rgba(245, 158, 11, 0.25)',
  warningHover: '0 6px 20px 0 rgba(245, 158, 11, 0.35)',
  
  error: '0 4px 14px 0 rgba(239, 68, 68, 0.25)',
  errorHover: '0 6px 20px 0 rgba(239, 68, 68, 0.35)',
  
  info: '0 4px 14px 0 rgba(59, 130, 246, 0.25)',
  infoHover: '0 6px 20px 0 rgba(59, 130, 246, 0.35)',

  // ============================================
  // FOCUS RING SHADOWS
  // ============================================
  focusRing: {
    primary: '0 0 0 3px rgba(31, 61, 53, 0.2)',
    secondary: '0 0 0 3px rgba(5, 150, 105, 0.2)',
    error: '0 0 0 3px rgba(239, 68, 68, 0.2)',
    warning: '0 0 0 3px rgba(245, 158, 11, 0.2)',
    success: '0 0 0 3px rgba(16, 185, 129, 0.2)',
    info: '0 0 0 3px rgba(59, 130, 246, 0.2)',
  },

  // ============================================
  // ELEVATION LEVELS (Material Design inspired)
  // ============================================
  elevation: {
    0: 'none',
    1: '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)',
    2: '0 3px 6px rgba(0,0,0,0.15), 0 2px 4px rgba(0,0,0,0.12)',
    3: '0 10px 20px rgba(0,0,0,0.15), 0 3px 6px rgba(0,0,0,0.10)',
    4: '0 15px 25px rgba(0,0,0,0.15), 0 5px 10px rgba(0,0,0,0.05)',
    5: '0 20px 40px rgba(0,0,0,0.2)',
  },
};

// ============================================
// DARK MODE SHADOWS
// ============================================
const darkShadows = {
  ...shadows,
  
  xs: '0 1px 2px 0 rgba(0, 0, 0, 0.3)',
  sm: '0 1px 3px 0 rgba(0, 0, 0, 0.4), 0 1px 2px -1px rgba(0, 0, 0, 0.4)',
  DEFAULT: '0 1px 3px 0 rgba(0, 0, 0, 0.4), 0 1px 2px 0 rgba(0, 0, 0, 0.3)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.4), 0 2px 4px -2px rgba(0, 0, 0, 0.4)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.4), 0 4px 6px -4px rgba(0, 0, 0, 0.4)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.4), 0 8px 10px -6px rgba(0, 0, 0, 0.4)',
  '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
  
  card: '0 2px 8px 0 rgba(0, 0, 0, 0.4)',
  cardHover: '0 8px 16px rgba(0, 0, 0, 0.4)',
  modal: '0 25px 50px -12px rgba(0, 0, 0, 0.6)',
  dropdown: '0 10px 15px -3px rgba(0, 0, 0, 0.5)',
  
  focusRing: {
    primary: '0 0 0 3px rgba(42, 80, 69, 0.4)',
    secondary: '0 0 0 3px rgba(16, 185, 129, 0.3)',
    error: '0 0 0 3px rgba(239, 68, 68, 0.3)',
    warning: '0 0 0 3px rgba(245, 158, 11, 0.3)',
    success: '0 0 0 3px rgba(16, 185, 129, 0.3)',
    info: '0 0 0 3px rgba(59, 130, 246, 0.3)',
  },
};

export { shadows as lightShadows, darkShadows };
export default shadows;