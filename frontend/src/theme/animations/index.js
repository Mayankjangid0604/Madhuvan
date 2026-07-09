/**
 * Animation System
 * Keyframes and animation presets
 */

const animations = {
  // ============================================
  // KEYFRAMES
  // ============================================
  keyframes: {
    // Fade
    fadeIn: {
      from: { opacity: 0 },
      to: { opacity: 1 },
    },
    fadeOut: {
      from: { opacity: 1 },
      to: { opacity: 0 },
    },
    fadeInUp: {
      from: { opacity: 0, transform: 'translateY(10px)' },
      to: { opacity: 1, transform: 'translateY(0)' },
    },
    fadeInDown: {
      from: { opacity: 0, transform: 'translateY(-10px)' },
      to: { opacity: 1, transform: 'translateY(0)' },
    },
    fadeInLeft: {
      from: { opacity: 0, transform: 'translateX(-10px)' },
      to: { opacity: 1, transform: 'translateX(0)' },
    },
    fadeInRight: {
      from: { opacity: 0, transform: 'translateX(10px)' },
      to: { opacity: 1, transform: 'translateX(0)' },
    },

    // Slide
    slideInUp: {
      from: { transform: 'translateY(100%)' },
      to: { transform: 'translateY(0)' },
    },
    slideInDown: {
      from: { transform: 'translateY(-100%)' },
      to: { transform: 'translateY(0)' },
    },
    slideInLeft: {
      from: { transform: 'translateX(-100%)' },
      to: { transform: 'translateX(0)' },
    },
    slideInRight: {
      from: { transform: 'translateX(100%)' },
      to: { transform: 'translateX(0)' },
    },
    slideOutUp: {
      from: { transform: 'translateY(0)' },
      to: { transform: 'translateY(-100%)' },
    },
    slideOutDown: {
      from: { transform: 'translateY(0)' },
      to: { transform: 'translateY(100%)' },
    },

    // Scale
    scaleIn: {
      from: { opacity: 0, transform: 'scale(0.95)' },
      to: { opacity: 1, transform: 'scale(1)' },
    },
    scaleOut: {
      from: { opacity: 1, transform: 'scale(1)' },
      to: { opacity: 0, transform: 'scale(0.95)' },
    },
    zoomIn: {
      from: { opacity: 0, transform: 'scale(0.5)' },
      to: { opacity: 1, transform: 'scale(1)' },
    },
    zoomOut: {
      from: { opacity: 1, transform: 'scale(1)' },
      to: { opacity: 0, transform: 'scale(0.5)' },
    },

    // Bounce
    bounce: {
      '0%, 100%': { transform: 'translateY(-5%)', animationTimingFunction: 'cubic-bezier(0.8, 0, 1, 1)' },
      '50%': { transform: 'translateY(0)', animationTimingFunction: 'cubic-bezier(0, 0, 0.2, 1)' },
    },
    bounceIn: {
      '0%': { opacity: 0, transform: 'scale(0.3)' },
      '50%': { transform: 'scale(1.05)' },
      '70%': { transform: 'scale(0.9)' },
      '100%': { opacity: 1, transform: 'scale(1)' },
    },

    // Pulse
    pulse: {
      '0%, 100%': { opacity: 1 },
      '50%': { opacity: 0.5 },
    },
    pulseScale: {
      '0%, 100%': { transform: 'scale(1)' },
      '50%': { transform: 'scale(1.05)' },
    },

    // Spin
    spin: {
      from: { transform: 'rotate(0deg)' },
      to: { transform: 'rotate(360deg)' },
    },

    // Ping (ripple effect)
    ping: {
      '75%, 100%': { transform: 'scale(2)', opacity: 0 },
    },

    // Shake
    shake: {
      '0%, 100%': { transform: 'translateX(0)' },
      '10%, 30%, 50%, 70%, 90%': { transform: 'translateX(-4px)' },
      '20%, 40%, 60%, 80%': { transform: 'translateX(4px)' },
    },

    // Wiggle
    wiggle: {
      '0%, 100%': { transform: 'rotate(-3deg)' },
      '50%': { transform: 'rotate(3deg)' },
    },

    // Skeleton shimmer
    shimmer: {
      '0%': { backgroundPosition: '-200% 0' },
      '100%': { backgroundPosition: '200% 0' },
    },

    // Progress bar
    progress: {
      '0%': { width: '0%' },
      '100%': { width: '100%' },
    },

    // Typing cursor
    blink: {
      '0%, 50%': { opacity: 1 },
      '51%, 100%': { opacity: 0 },
    },

    // Accordion expand
    accordionDown: {
      from: { height: 0, opacity: 0 },
      to: { height: 'var(--accordion-content-height)', opacity: 1 },
    },
    accordionUp: {
      from: { height: 'var(--accordion-content-height)', opacity: 1 },
      to: { height: 0, opacity: 0 },
    },

    // Float
    float: {
      '0%, 100%': { transform: 'translateY(0)' },
      '50%': { transform: 'translateY(-10px)' },
    },

    // Glow
    glow: {
      '0%, 100%': { boxShadow: '0 0 5px rgba(31, 61, 53, 0.5)' },
      '50%': { boxShadow: '0 0 20px rgba(31, 61, 53, 0.8)' },
    },
  },

  // ============================================
  // ANIMATION PRESETS
  // ============================================
  presets: {
    // Basic animations
    fadeIn: 'fadeIn 0.2s ease-out',
    fadeOut: 'fadeOut 0.2s ease-out',
    fadeInUp: 'fadeInUp 0.3s ease-out',
    fadeInDown: 'fadeInDown 0.3s ease-out',
    fadeInLeft: 'fadeInLeft 0.3s ease-out',
    fadeInRight: 'fadeInRight 0.3s ease-out',

    // Slide animations
    slideInUp: 'slideInUp 0.3s ease-out',
    slideInDown: 'slideInDown 0.3s ease-out',
    slideInLeft: 'slideInLeft 0.3s ease-out',
    slideInRight: 'slideInRight 0.3s ease-out',

    // Scale animations
    scaleIn: 'scaleIn 0.2s ease-out',
    scaleOut: 'scaleOut 0.2s ease-out',
    zoomIn: 'zoomIn 0.3s ease-out',
    zoomOut: 'zoomOut 0.3s ease-out',

    // Continuous animations
    spin: 'spin 1s linear infinite',
    spinSlow: 'spin 2s linear infinite',
    spinFast: 'spin 0.5s linear infinite',
    pulse: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
    bounce: 'bounce 1s infinite',
    ping: 'ping 1s cubic-bezier(0, 0, 0.2, 1) infinite',
    shake: 'shake 0.5s ease-in-out',
    wiggle: 'wiggle 0.3s ease-in-out',

    // Component animations
    shimmer: 'shimmer 2s linear infinite',
    float: 'float 3s ease-in-out infinite',
    glow: 'glow 2s ease-in-out infinite',

    // Modal/Dialog
    modalIn: 'fadeIn 0.2s ease-out, scaleIn 0.2s ease-out',
    modalOut: 'fadeOut 0.15s ease-in, scaleOut 0.15s ease-in',

    // Dropdown
    dropdownIn: 'fadeIn 0.15s ease-out, slideInDown 0.15s ease-out',
    dropdownOut: 'fadeOut 0.1s ease-in',

    // Toast
    toastIn: 'slideInRight 0.3s ease-out',
    toastOut: 'slideOutRight 0.2s ease-in',

    // Drawer
    drawerInLeft: 'slideInLeft 0.3s ease-out',
    drawerInRight: 'slideInRight 0.3s ease-out',
    drawerOutLeft: 'slideOutLeft 0.2s ease-in',
    drawerOutRight: 'slideOutRight 0.2s ease-in',
  },

  // ============================================
  // DURATION
  // ============================================
  duration: {
    instant: '0ms',
    fastest: '50ms',
    faster: '100ms',
    fast: '150ms',
    DEFAULT: '200ms',
    normal: '200ms',
    slow: '300ms',
    slower: '400ms',
    slowest: '500ms',
    deliberate: '700ms',
  },

  // ============================================
  // EASING FUNCTIONS
  // ============================================
  easing: {
    // Standard
    linear: 'linear',
    ease: 'ease',
    easeIn: 'ease-in',
    easeOut: 'ease-out',
    easeInOut: 'ease-in-out',

    // Cubic bezier
    easeInSine: 'cubic-bezier(0.12, 0, 0.39, 0)',
    easeOutSine: 'cubic-bezier(0.61, 1, 0.88, 1)',
    easeInOutSine: 'cubic-bezier(0.37, 0, 0.63, 1)',
    
    easeInQuad: 'cubic-bezier(0.11, 0, 0.5, 0)',
    easeOutQuad: 'cubic-bezier(0.5, 1, 0.89, 1)',
    easeInOutQuad: 'cubic-bezier(0.45, 0, 0.55, 1)',
    
    easeInCubic: 'cubic-bezier(0.32, 0, 0.67, 0)',
    easeOutCubic: 'cubic-bezier(0.33, 1, 0.68, 1)',
    easeInOutCubic: 'cubic-bezier(0.65, 0, 0.35, 1)',
    
    easeInQuart: 'cubic-bezier(0.5, 0, 0.75, 0)',
    easeOutQuart: 'cubic-bezier(0.25, 1, 0.5, 1)',
    easeInOutQuart: 'cubic-bezier(0.76, 0, 0.24, 1)',
    
    easeInExpo: 'cubic-bezier(0.7, 0, 0.84, 0)',
    easeOutExpo: 'cubic-bezier(0.16, 1, 0.3, 1)',
    easeInOutExpo: 'cubic-bezier(0.87, 0, 0.13, 1)',
    
    easeInBack: 'cubic-bezier(0.36, 0, 0.66, -0.56)',
    easeOutBack: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
    easeInOutBack: 'cubic-bezier(0.68, -0.6, 0.32, 1.6)',

    // Spring-like
    spring: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
    bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  },

  // ============================================
  // DELAY
  // ============================================
  delay: {
    none: '0ms',
    75: '75ms',
    100: '100ms',
    150: '150ms',
    200: '200ms',
    300: '300ms',
    500: '500ms',
    700: '700ms',
    1000: '1000ms',
  },
};

export default animations;