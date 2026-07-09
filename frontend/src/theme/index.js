/**
 * Main Theme Export
 * Unified theme object with all sub-modules
 */

import colors, { lightColors, darkColors } from './colors';
import typography from './typography';
import spacing from './spacing';
import shadows, { lightShadows, darkShadows } from './shadows';
import layout from './layout';
import animations from './animations';
import breakpoints, { mediaUp, mediaDown, mediaBetween } from './breakpoints';
import zIndex from './zIndex';
import transitions from './transitions';
import utils from './utils';

// ============================================
// LIGHT THEME
// ============================================
const lightTheme = {
  name: 'light',
  colors: lightColors,
  typography,
  spacing,
  shadows: lightShadows,
  layout,
  animations,
  breakpoints,
  zIndex,
  transitions,
};

// ============================================
// DARK THEME
// ============================================
const darkTheme = {
  name: 'dark',
  colors: darkColors,
  typography,
  spacing,
  shadows: darkShadows,
  layout,
  animations,
  breakpoints,
  zIndex,
  transitions,
};

// ============================================
// DEFAULT THEME (Light)
// ============================================
const theme = {
  ...lightTheme,
  
  // Theme variants
  light: lightTheme,
  dark: darkTheme,
  
  // Utility functions
  utils,
  
  // Media query helpers
  media: {
    up: mediaUp,
    down: mediaDown,
    between: mediaBetween,
    ...breakpoints.up,
  },
  
  // Quick access helpers
  fn: {
    // Color helpers
    rgba: utils.hexToRgba,
    lighten: utils.lighten,
    darken: utils.darken,
    contrast: utils.getContrastColor,
    
    // Spacing helpers
    spacing: utils.spacing,
    
    // Typography helpers
    pxToRem: utils.pxToRem,
    fluidType: utils.fluidType,
    
    // Layout helpers
    flexCenter: utils.flexCenter,
    flexBetween: utils.flexBetween,
    absoluteFill: utils.absoluteFill,
    
    // Animation helpers
    transition: utils.transition,
    
    // Accessibility helpers
    srOnly: utils.srOnly,
    focusVisible: utils.focusVisible,
    
    // Text helpers
    truncate: utils.truncate,
    
    // Theme getter
    get: (path, defaultValue) => utils.get(theme, path, defaultValue),
  },
};

// ============================================
// NAMED EXPORTS
// ============================================
export {
  colors,
  lightColors,
  darkColors,
  typography,
  spacing,
  shadows,
  lightShadows,
  darkShadows,
  layout,
  animations,
  breakpoints,
  zIndex,
  transitions,
  utils,
  lightTheme,
  darkTheme,
  mediaUp,
  mediaDown,
  mediaBetween,
};

// ============================================
// DEFAULT EXPORT
// ============================================
export default theme;