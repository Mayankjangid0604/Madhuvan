/**
 * Theme Utilities
 * Helper functions for working with theme values
 */

// ============================================
// COLOR UTILITIES
// ============================================

/**
 * Convert hex to RGB
 */
export const hexToRgb = (hex) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
};

/**
 * Convert RGB to hex
 */
export const rgbToHex = (r, g, b) => {
  return '#' + [r, g, b].map((x) => {
    const hex = x.toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');
};

/**
 * Add alpha to hex color
 */
export const hexToRgba = (hex, alpha = 1) => {
  const rgb = hexToRgb(hex);
  if (!rgb) return null;
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
};

/**
 * Lighten a color
 */
export const lighten = (hex, percent) => {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  
  const factor = percent / 100;
  const r = Math.round(rgb.r + (255 - rgb.r) * factor);
  const g = Math.round(rgb.g + (255 - rgb.g) * factor);
  const b = Math.round(rgb.b + (255 - rgb.b) * factor);
  
  return rgbToHex(r, g, b);
};

/**
 * Darken a color
 */
export const darken = (hex, percent) => {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  
  const factor = 1 - percent / 100;
  const r = Math.round(rgb.r * factor);
  const g = Math.round(rgb.g * factor);
  const b = Math.round(rgb.b * factor);
  
  return rgbToHex(r, g, b);
};

/**
 * Get contrasting text color (black or white)
 */
export const getContrastColor = (hex) => {
  const rgb = hexToRgb(hex);
  if (!rgb) return '#000000';
  
  // Calculate luminance
  const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
  return luminance > 0.5 ? '#000000' : '#ffffff';
};

/**
 * Mix two colors
 */
export const mixColors = (color1, color2, weight = 50) => {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);
  if (!rgb1 || !rgb2) return color1;
  
  const w = weight / 100;
  const r = Math.round(rgb1.r * w + rgb2.r * (1 - w));
  const g = Math.round(rgb1.g * w + rgb2.g * (1 - w));
  const b = Math.round(rgb1.b * w + rgb2.b * (1 - w));
  
  return rgbToHex(r, g, b);
};

// ============================================
// SPACING UTILITIES
// ============================================

/**
 * Convert spacing value to pixels
 */
export const spacing = (value, base = 4) => {
  if (typeof value === 'number') {
    return `${value * base}px`;
  }
  return value;
};

/**
 * Create responsive spacing object
 */
export const responsiveSpacing = (mobile, tablet, desktop) => ({
  mobile: spacing(mobile),
  tablet: spacing(tablet),
  desktop: spacing(desktop),
});

// ============================================
// TYPOGRAPHY UTILITIES
// ============================================

/**
 * Convert px to rem
 */
export const pxToRem = (px, baseFontSize = 16) => {
  return `${px / baseFontSize}rem`;
};

/**
 * Convert rem to px
 */
export const remToPx = (rem, baseFontSize = 16) => {
  return `${parseFloat(rem) * baseFontSize}px`;
};

/**
 * Create fluid typography (clamp)
 */
export const fluidType = (minSize, maxSize, minWidth = 320, maxWidth = 1200) => {
  const slope = (maxSize - minSize) / (maxWidth - minWidth);
  const yAxisIntersection = -minWidth * slope + minSize;
  
  return `clamp(${minSize}px, ${yAxisIntersection.toFixed(4)}px + ${(slope * 100).toFixed(4)}vw, ${maxSize}px)`;
};

// ============================================
// LAYOUT UTILITIES
// ============================================

/**
 * Create CSS Grid template
 */
export const gridTemplate = (columns, gap = '16px') => ({
  display: 'grid',
  gridTemplateColumns: `repeat(${columns}, 1fr)`,
  gap,
});

/**
 * Create flexbox center
 */
export const flexCenter = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

/**
 * Create flexbox between
 */
export const flexBetween = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
};

/**
 * Create absolute fill
 */
export const absoluteFill = {
  position: 'absolute',
  top: 0,
  right: 0,
  bottom: 0,
  left: 0,
};

/**
 * Create fixed fill
 */
export const fixedFill = {
  position: 'fixed',
  top: 0,
  right: 0,
  bottom: 0,
  left: 0,
};

// ============================================
// SHADOW UTILITIES
// ============================================

/**
 * Create colored shadow
 */
export const coloredShadow = (color, intensity = 0.25) => {
  const rgba = hexToRgba(color, intensity);
  return `0 4px 14px 0 ${rgba}`;
};

/**
 * Create elevation shadow
 */
export const elevation = (level) => {
  const shadows = {
    0: 'none',
    1: '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)',
    2: '0 3px 6px rgba(0,0,0,0.15), 0 2px 4px rgba(0,0,0,0.12)',
    3: '0 10px 20px rgba(0,0,0,0.15), 0 3px 6px rgba(0,0,0,0.10)',
    4: '0 15px 25px rgba(0,0,0,0.15), 0 5px 10px rgba(0,0,0,0.05)',
    5: '0 20px 40px rgba(0,0,0,0.2)',
  };
  return shadows[level] || shadows[0];
};

// ============================================
// ANIMATION UTILITIES
// ============================================

/**
 * Create transition string
 */
export const transition = (properties = 'all', duration = '200ms', easing = 'ease') => {
  if (Array.isArray(properties)) {
    return properties.map((prop) => `${prop} ${duration} ${easing}`).join(', ');
  }
  return `${properties} ${duration} ${easing}`;
};

/**
 * Create keyframe animation string
 */
export const animation = (name, duration = '200ms', easing = 'ease', options = {}) => {
  const { delay = '0ms', fillMode = 'forwards', iterationCount = 1 } = options;
  return `${name} ${duration} ${easing} ${delay} ${iterationCount} ${fillMode}`;
};

// ============================================
// RESPONSIVE UTILITIES
// ============================================

/**
 * Create responsive value object
 */
export const responsive = (values) => {
  const breakpoints = ['xs', 'sm', 'md', 'lg', 'xl', '2xl'];
  const result = {};
  
  if (Array.isArray(values)) {
    values.forEach((value, index) => {
      if (value !== null && value !== undefined) {
        result[breakpoints[index]] = value;
      }
    });
  } else if (typeof values === 'object') {
    return values;
  } else {
    return { xs: values };
  }
  
  return result;
};

// ============================================
// ACCESSIBILITY UTILITIES
// ============================================

/**
 * Screen reader only styles
 */
export const srOnly = {
  position: 'absolute',
  width: '1px',
  height: '1px',
  padding: 0,
  margin: '-1px',
  overflow: 'hidden',
  clip: 'rect(0, 0, 0, 0)',
  whiteSpace: 'nowrap',
  borderWidth: 0,
};

/**
 * Focus visible styles
 */
export const focusVisible = (color = '#1f3d35') => ({
  outline: 'none',
  boxShadow: `0 0 0 3px ${hexToRgba(color, 0.25)}`,
});

// ============================================
// CSS-IN-JS UTILITIES
// ============================================

/**
 * Create style object with hover state
 */
export const withHover = (baseStyles, hoverStyles) => ({
  ...baseStyles,
  '&:hover': hoverStyles,
});

/**
 * Create style object with focus state
 */
export const withFocus = (baseStyles, focusStyles) => ({
  ...baseStyles,
  '&:focus': focusStyles,
  '&:focus-visible': focusStyles,
});

/**
 * Create style object with active state
 */
export const withActive = (baseStyles, activeStyles) => ({
  ...baseStyles,
  '&:active': activeStyles,
});

/**
 * Create style object with disabled state
 */
export const withDisabled = (baseStyles, disabledStyles = {}) => ({
  ...baseStyles,
  '&:disabled': {
    opacity: 0.6,
    cursor: 'not-allowed',
    pointerEvents: 'none',
    ...disabledStyles,
  },
});

/**
 * Truncate text
 */
export const truncate = (lines = 1) => {
  if (lines === 1) {
    return {
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
    };
  }
  return {
    display: '-webkit-box',
    WebkitLineClamp: lines,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
  };
};

// ============================================
// THEME GETTER UTILITIES
// ============================================

/**
 * Get nested theme value
 */
export const get = (obj, path, defaultValue = undefined) => {
  const keys = path.split('.');
  let result = obj;
  
  for (const key of keys) {
    if (result === null || result === undefined) {
      return defaultValue;
    }
    result = result[key];
  }
  
  return result === undefined ? defaultValue : result;
};

/**
 * Create theme getter function
 */
export const createThemeGetter = (theme) => (path, defaultValue) => {
  return get(theme, path, defaultValue);
};

export default {
  // Color utilities
  hexToRgb,
  rgbToHex,
  hexToRgba,
  lighten,
  darken,
  getContrastColor,
  mixColors,
  
  // Spacing utilities
  spacing,
  responsiveSpacing,
  
  // Typography utilities
  pxToRem,
  remToPx,
  fluidType,
  
  // Layout utilities
  gridTemplate,
  flexCenter,
  flexBetween,
  absoluteFill,
  fixedFill,
  
  // Shadow utilities
  coloredShadow,
  elevation,
  
  // Animation utilities
  transition,
  animation,
  
  // Responsive utilities
  responsive,
  
  // Accessibility utilities
  srOnly,
  focusVisible,
  
  // CSS-in-JS utilities
  withHover,
  withFocus,
  withActive,
  withDisabled,
  truncate,
  
  // Theme getter utilities
  get,
  createThemeGetter,
};