/**
 * Spacing System
 * Consistent spacing scale for margins, padding, and gaps
 */

const spacing = {
  // ============================================
  // BASE SPACING SCALE
  // ============================================
  0: '0',
  px: '1px',
  0.5: '2px',
  1: '4px',
  1.5: '6px',
  2: '8px',
  2.5: '10px',
  3: '12px',
  3.5: '14px',
  4: '16px',
  5: '20px',
  6: '24px',
  7: '28px',
  8: '32px',
  9: '36px',
  10: '40px',
  11: '44px',
  12: '48px',
  14: '56px',
  16: '64px',
  20: '80px',
  24: '96px',
  28: '112px',
  32: '128px',
  36: '144px',
  40: '160px',
  44: '176px',
  48: '192px',
  52: '208px',
  56: '224px',
  60: '240px',
  64: '256px',
  72: '288px',
  80: '320px',
  96: '384px',

  // ============================================
  // NAMED SPACING
  // ============================================
  none: '0',
  xs: '4px',
  sm: '8px',
  md: '12px',
  lg: '16px',
  xl: '20px',
  '2xl': '24px',
  '3xl': '32px',
  '4xl': '40px',
  '5xl': '48px',
  '6xl': '64px',
  '7xl': '80px',
  '8xl': '96px',

  // ============================================
  // COMPONENT SPACING
  // ============================================
  component: {
    // Card
    card: {
      padding: '24px',
      paddingSm: '16px',
      paddingLg: '32px',
      gap: '16px',
    },
    
    // Button
    button: {
      paddingX: '16px',
      paddingY: '10px',
      paddingXSm: '12px',
      paddingYSm: '8px',
      paddingXLg: '24px',
      paddingYLg: '14px',
      gap: '8px',
    },
    
    // Input
    input: {
      paddingX: '14px',
      paddingY: '12px',
      paddingXSm: '10px',
      paddingYSm: '8px',
      paddingXLg: '16px',
      paddingYLg: '14px',
    },
    
    // Modal
    modal: {
      padding: '24px',
      headerPadding: '20px 24px',
      bodyPadding: '24px',
      footerPadding: '16px 24px',
    },
    
    // Table
    table: {
      cellPaddingX: '16px',
      cellPaddingY: '12px',
      headerPaddingY: '14px',
    },
    
    // Badge
    badge: {
      paddingX: '8px',
      paddingY: '2px',
      paddingXLg: '12px',
      paddingYLg: '4px',
    },
    
    // Avatar
    avatar: {
      gap: '-8px', // For stacking
    },
    
    // List
    list: {
      itemPadding: '12px 16px',
      gap: '2px',
    },
    
    // Tab
    tab: {
      paddingX: '16px',
      paddingY: '10px',
      gap: '4px',
    },
    
    // Dropdown
    dropdown: {
      itemPadding: '10px 16px',
      padding: '8px 0',
    },
    
    // Tooltip
    tooltip: {
      padding: '8px 12px',
    },
    
    // Alert
    alert: {
      padding: '16px',
      gap: '12px',
    },
    
    // Form
    form: {
      fieldGap: '16px',
      labelGap: '6px',
      sectionGap: '24px',
      groupGap: '20px',
    },
  },

  // ============================================
  // LAYOUT SPACING
  // ============================================
  layout: {
    // Page
    page: {
      paddingX: '24px',
      paddingY: '24px',
      paddingXMobile: '16px',
      paddingYMobile: '16px',
    },
    
    // Section
    section: {
      gap: '32px',
      gapSm: '24px',
      gapLg: '48px',
    },
    
    // Grid
    grid: {
      gap: '16px',
      gapSm: '12px',
      gapLg: '24px',
    },
    
    // Stack
    stack: {
      gap: '16px',
      gapSm: '8px',
      gapLg: '24px',
    },
    
    // Container
    container: {
      paddingX: '16px',
      paddingXMd: '24px',
      paddingXLg: '32px',
    },
  },

  // ============================================
  // NEGATIVE SPACING
  // ============================================
  negative: {
    1: '-4px',
    2: '-8px',
    3: '-12px',
    4: '-16px',
    5: '-20px',
    6: '-24px',
    8: '-32px',
    10: '-40px',
    12: '-48px',
  },
};

export default spacing;