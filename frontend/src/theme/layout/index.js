/**
 * Layout System
 * Layout-related values and component dimensions
 */

const layout = {
  // ============================================
  // SIDEBAR
  // ============================================
  sidebar: {
    width: '260px',
    widthCollapsed: '72px',
    widthMobile: '280px',
    transition: 'width 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
    zIndex: 40,
  },

  // ============================================
  // TOPBAR / HEADER
  // ============================================
  topbar: {
    height: '64px',
    heightMobile: '56px',
    zIndex: 30,
  },

  // ============================================
  // FOOTER
  // ============================================
  footer: {
    height: '48px',
  },

  // ============================================
  // CONTAINER
  // ============================================
  container: {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px',
    full: '100%',
  },

  // ============================================
  // BORDER RADIUS
  // ============================================
  borderRadius: {
    none: '0',
    xs: '2px',
    sm: '4px',
    DEFAULT: '6px',
    md: '8px',
    lg: '12px',
    xl: '16px',
    '2xl': '24px',
    '3xl': '32px',
    full: '9999px',

    // Component specific
    button: '8px',
    buttonSm: '6px',
    buttonLg: '10px',
    buttonPill: '9999px',
    
    input: '8px',
    inputSm: '6px',
    inputLg: '10px',
    
    card: '12px',
    cardSm: '8px',
    cardLg: '16px',
    
    modal: '16px',
    dropdown: '10px',
    tooltip: '6px',
    badge: '6px',
    badgePill: '9999px',
    avatar: '9999px',
    avatarSquare: '8px',
    
    tag: '4px',
    chip: '9999px',
    
    image: '8px',
    imageLg: '12px',
  },

  // ============================================
  // BREAKPOINTS
  // ============================================
  breakpoints: {
    xs: '320px',
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px',
  },

  // ============================================
  // COMPONENT SIZES
  // ============================================
  sizes: {
    // Button heights
    button: {
      xs: '28px',
      sm: '32px',
      DEFAULT: '40px',
      md: '40px',
      lg: '48px',
      xl: '56px',
    },
    
    // Input heights
    input: {
      sm: '36px',
      DEFAULT: '42px',
      md: '42px',
      lg: '48px',
    },
    
    // Avatar sizes
    avatar: {
      xs: '24px',
      sm: '32px',
      DEFAULT: '40px',
      md: '40px',
      lg: '48px',
      xl: '64px',
      '2xl': '80px',
      '3xl': '96px',
    },
    
    // Icon sizes
    icon: {
      xs: '12px',
      sm: '16px',
      DEFAULT: '20px',
      md: '20px',
      lg: '24px',
      xl: '32px',
      '2xl': '40px',
    },
    
    // Badge sizes
    badge: {
      sm: '18px',
      DEFAULT: '22px',
      lg: '26px',
    },
    
    // Spinner/Loader sizes
    spinner: {
      xs: '16px',
      sm: '20px',
      DEFAULT: '24px',
      md: '24px',
      lg: '32px',
      xl: '48px',
    },
    
    // Toggle/Switch sizes
    toggle: {
      sm: { width: '36px', height: '20px', thumb: '16px' },
      DEFAULT: { width: '44px', height: '24px', thumb: '20px' },
      lg: { width: '56px', height: '30px', thumb: '26px' },
    },
    
    // Checkbox/Radio sizes
    checkbox: {
      sm: '16px',
      DEFAULT: '18px',
      lg: '22px',
    },
  },

  // ============================================
  // WIDTH UTILITIES
  // ============================================
  width: {
    dropdown: {
      sm: '200px',
      DEFAULT: '240px',
      md: '280px',
      lg: '320px',
    },
    modal: {
      xs: '320px',
      sm: '400px',
      DEFAULT: '500px',
      md: '600px',
      lg: '800px',
      xl: '1000px',
      full: 'calc(100vw - 32px)',
    },
    sidebar: {
      collapsed: '72px',
      DEFAULT: '260px',
      expanded: '280px',
    },
    drawer: {
      sm: '320px',
      DEFAULT: '400px',
      md: '500px',
      lg: '600px',
    },
  },

  // ============================================
  // ASPECT RATIOS
  // ============================================
  aspectRatio: {
    square: '1 / 1',
    video: '16 / 9',
    photo: '4 / 3',
    portrait: '3 / 4',
    wide: '21 / 9',
  },
};

export default layout;