/**
 * Breakpoint System
 * Responsive design breakpoints
 */

const breakpoints = {
  // ============================================
  // BREAKPOINT VALUES
  // ============================================
  values: {
    xs: 0,
    sm: 640,
    md: 768,
    lg: 1024,
    xl: 1280,
    '2xl': 1536,
  },

  // ============================================
  // BREAKPOINT STRINGS (with px)
  // ============================================
  px: {
    xs: '0px',
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px',
  },

  // ============================================
  // MEDIA QUERY HELPERS
  // ============================================
  up: {
    xs: '@media (min-width: 0px)',
    sm: '@media (min-width: 640px)',
    md: '@media (min-width: 768px)',
    lg: '@media (min-width: 1024px)',
    xl: '@media (min-width: 1280px)',
    '2xl': '@media (min-width: 1536px)',
  },

  down: {
    xs: '@media (max-width: 639px)',
    sm: '@media (max-width: 767px)',
    md: '@media (max-width: 1023px)',
    lg: '@media (max-width: 1279px)',
    xl: '@media (max-width: 1535px)',
    '2xl': '@media (max-width: 9999px)',
  },

  only: {
    xs: '@media (min-width: 0px) and (max-width: 639px)',
    sm: '@media (min-width: 640px) and (max-width: 767px)',
    md: '@media (min-width: 768px) and (max-width: 1023px)',
    lg: '@media (min-width: 1024px) and (max-width: 1279px)',
    xl: '@media (min-width: 1280px) and (max-width: 1535px)',
    '2xl': '@media (min-width: 1536px)',
  },

  between: {
    'xs-sm': '@media (min-width: 0px) and (max-width: 639px)',
    'sm-md': '@media (min-width: 640px) and (max-width: 767px)',
    'md-lg': '@media (min-width: 768px) and (max-width: 1023px)',
    'lg-xl': '@media (min-width: 1024px) and (max-width: 1279px)',
    'xl-2xl': '@media (min-width: 1280px) and (max-width: 1535px)',
  },

  // ============================================
  // DEVICE-BASED QUERIES
  // ============================================
  devices: {
    mobile: '@media (max-width: 767px)',
    mobileSmall: '@media (max-width: 374px)',
    mobileLarge: '@media (min-width: 375px) and (max-width: 767px)',
    tablet: '@media (min-width: 768px) and (max-width: 1023px)',
    tabletUp: '@media (min-width: 768px)',
    desktop: '@media (min-width: 1024px)',
    desktopLarge: '@media (min-width: 1280px)',
    desktopXLarge: '@media (min-width: 1536px)',
  },

  // ============================================
  // SPECIAL QUERIES
  // ============================================
  special: {
    // Orientation
    portrait: '@media (orientation: portrait)',
    landscape: '@media (orientation: landscape)',
    
    // High DPI / Retina
    retina: '@media (-webkit-min-device-pixel-ratio: 2), (min-resolution: 192dpi)',
    highDpi: '@media (-webkit-min-device-pixel-ratio: 1.5), (min-resolution: 144dpi)',
    
    // Touch devices
    touch: '@media (hover: none) and (pointer: coarse)',
    mouse: '@media (hover: hover) and (pointer: fine)',
    
    // Print
    print: '@media print',
    screen: '@media screen',
    
    // Reduced motion (accessibility)
    reducedMotion: '@media (prefers-reduced-motion: reduce)',
    motionOk: '@media (prefers-reduced-motion: no-preference)',
    
    // Color scheme preference
    darkMode: '@media (prefers-color-scheme: dark)',
    lightMode: '@media (prefers-color-scheme: light)',
    
    // High contrast (accessibility)
    highContrast: '@media (prefers-contrast: high)',
    
    // Hover capability
    canHover: '@media (hover: hover)',
    noHover: '@media (hover: none)',
  },

  // ============================================
  // CONTAINER QUERIES (Modern CSS)
  // ============================================
  container: {
    sm: '@container (min-width: 640px)',
    md: '@container (min-width: 768px)',
    lg: '@container (min-width: 1024px)',
  },
};

// Helper functions
export const mediaUp = (breakpoint) => {
  const value = breakpoints.values[breakpoint];
  return `@media (min-width: ${value}px)`;
};

export const mediaDown = (breakpoint) => {
  const value = breakpoints.values[breakpoint] - 1;
  return `@media (max-width: ${value}px)`;
};

export const mediaBetween = (start, end) => {
  const startValue = breakpoints.values[start];
  const endValue = breakpoints.values[end] - 1;
  return `@media (min-width: ${startValue}px) and (max-width: ${endValue}px)`;
};

export default breakpoints;