/**
 * Transition System
 * Transition presets for smooth animations
 */

const transitions = {
  // ============================================
  // PROPERTIES
  // ============================================
  property: {
    none: 'none',
    all: 'all',
    default: 'color, background-color, border-color, text-decoration-color, fill, stroke, opacity, box-shadow, transform, filter, backdrop-filter',
    colors: 'color, background-color, border-color, text-decoration-color, fill, stroke',
    opacity: 'opacity',
    shadow: 'box-shadow',
    transform: 'transform',
    dimensions: 'width, height',
    spacing: 'margin, padding',
    border: 'border-color, border-width',
  },

  // ============================================
  // DURATION
  // ============================================
  duration: {
    instant: '0ms',
    fastest: '75ms',
    faster: '100ms',
    fast: '150ms',
    DEFAULT: '200ms',
    normal: '200ms',
    slow: '300ms',
    slower: '500ms',
    slowest: '700ms',
    1000: '1000ms',
  },

  // ============================================
  // TIMING FUNCTIONS (EASING)
  // ============================================
  timing: {
    linear: 'linear',
    ease: 'ease',
    easeIn: 'ease-in',
    easeOut: 'ease-out',
    easeInOut: 'ease-in-out',

    // Custom cubic-bezier
    smooth: 'cubic-bezier(0.4, 0, 0.2, 1)',        // Material Design standard
    smoothIn: 'cubic-bezier(0.4, 0, 1, 1)',        // Accelerate
    smoothOut: 'cubic-bezier(0, 0, 0.2, 1)',       // Decelerate

    sharp: 'cubic-bezier(0.4, 0, 0.6, 1)',         // Sharp curve

    spring: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',  // Spring effect
    bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',   // Bounce effect
    elastic: 'cubic-bezier(0.68, -0.6, 0.32, 1.6)',     // Elastic effect

    // Sine
    sineIn: 'cubic-bezier(0.12, 0, 0.39, 0)',
    sineOut: 'cubic-bezier(0.61, 1, 0.88, 1)',
    sineInOut: 'cubic-bezier(0.37, 0, 0.63, 1)',

    // Quad
    quadIn: 'cubic-bezier(0.11, 0, 0.5, 0)',
    quadOut: 'cubic-bezier(0.5, 1, 0.89, 1)',
    quadInOut: 'cubic-bezier(0.45, 0, 0.55, 1)',

    // Cubic
    cubicIn: 'cubic-bezier(0.32, 0, 0.67, 0)',
    cubicOut: 'cubic-bezier(0.33, 1, 0.68, 1)',
    cubicInOut: 'cubic-bezier(0.65, 0, 0.35, 1)',

    // Quart
    quartIn: 'cubic-bezier(0.5, 0, 0.75, 0)',
    quartOut: 'cubic-bezier(0.25, 1, 0.5, 1)',
    quartInOut: 'cubic-bezier(0.76, 0, 0.24, 1)',

    // Expo
    expoIn: 'cubic-bezier(0.7, 0, 0.84, 0)',
    expoOut: 'cubic-bezier(0.16, 1, 0.3, 1)',
    expoInOut: 'cubic-bezier(0.87, 0, 0.13, 1)',

    // Back (overshoot)
    backIn: 'cubic-bezier(0.36, 0, 0.66, -0.56)',
    backOut: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
    backInOut: 'cubic-bezier(0.68, -0.6, 0.32, 1.6)',
  },

  // ============================================
  // PRESETS (ready-to-use transitions)
  // ============================================
  presets: {
    // None
    none: 'none',

    // All properties
    all: 'all 200ms cubic-bezier(0.4, 0, 0.2, 1)',
    allFast: 'all 150ms cubic-bezier(0.4, 0, 0.2, 1)',
    allSlow: 'all 300ms cubic-bezier(0.4, 0, 0.2, 1)',

    // Colors
    colors: 'color 200ms ease, background-color 200ms ease, border-color 200ms ease',
    colorsFast: 'color 150ms ease, background-color 150ms ease, border-color 150ms ease',

    // Opacity
    opacity: 'opacity 200ms ease',
    opacityFast: 'opacity 150ms ease',
    opacitySlow: 'opacity 300ms ease',

    // Transform
    transform: 'transform 200ms cubic-bezier(0.4, 0, 0.2, 1)',
    transformFast: 'transform 150ms cubic-bezier(0.4, 0, 0.2, 1)',
    transformSlow: 'transform 300ms cubic-bezier(0.4, 0, 0.2, 1)',
    transformSpring: 'transform 300ms cubic-bezier(0.175, 0.885, 0.32, 1.275)',

    // Shadow
    shadow: 'box-shadow 200ms ease',
    shadowFast: 'box-shadow 150ms ease',

    // Combined common
    button: 'all 150ms cubic-bezier(0.4, 0, 0.2, 1)',
    input: 'border-color 150ms ease, box-shadow 150ms ease',
    card: 'transform 200ms ease, box-shadow 200ms ease',
    link: 'color 150ms ease',

    // Specific components
    dropdown: 'opacity 150ms ease, transform 150ms cubic-bezier(0.4, 0, 0.2, 1)',
    modal: 'opacity 200ms ease, transform 200ms cubic-bezier(0.4, 0, 0.2, 1)',
    drawer: 'transform 300ms cubic-bezier(0.4, 0, 0.2, 1)',
    tooltip: 'opacity 100ms ease, transform 100ms ease',
    toast: 'transform 300ms cubic-bezier(0.4, 0, 0.2, 1), opacity 300ms ease',
    accordion: 'height 300ms cubic-bezier(0.4, 0, 0.2, 1), opacity 200ms ease',
    tab: 'color 150ms ease, background-color 150ms ease',
    menu: 'background-color 100ms ease',

    // Sidebar
    sidebar: 'width 250ms cubic-bezier(0.4, 0, 0.2, 1)',
    sidebarItem: 'background-color 150ms ease, color 150ms ease',

    // Scale effects
    scale: 'transform 200ms cubic-bezier(0.4, 0, 0.2, 1)',
    scaleSpring: 'transform 300ms cubic-bezier(0.175, 0.885, 0.32, 1.275)',

    // Hover effects
    hover: 'all 200ms cubic-bezier(0.4, 0, 0.2, 1)',
    hoverLift: 'transform 200ms ease, box-shadow 200ms ease',
    hoverGlow: 'box-shadow 300ms ease',

    // Page transitions
    page: 'opacity 300ms ease, transform 300ms ease',
    pageFast: 'opacity 200ms ease, transform 200ms ease',
  },

  // ============================================
  // COMPONENT TRANSITIONS
  // ============================================
  components: {
    button: {
      base: 'all 150ms cubic-bezier(0.4, 0, 0.2, 1)',
      hover: 'transform 100ms ease',
      active: 'transform 50ms ease',
    },
    input: {
      base: 'border-color 150ms ease, box-shadow 150ms ease, background-color 150ms ease',
      focus: 'box-shadow 200ms ease',
    },
    card: {
      base: 'box-shadow 200ms ease',
      hover: 'transform 200ms ease, box-shadow 200ms ease',
    },
    modal: {
      overlay: 'opacity 200ms ease',
      content: 'opacity 200ms ease, transform 200ms cubic-bezier(0.4, 0, 0.2, 1)',
    },
    dropdown: {
      menu: 'opacity 150ms ease, transform 150ms cubic-bezier(0.4, 0, 0.2, 1)',
      item: 'background-color 100ms ease',
    },
    sidebar: {
      container: 'width 250ms cubic-bezier(0.4, 0, 0.2, 1)',
      item: 'background-color 150ms ease, padding-left 150ms ease',
      icon: 'transform 200ms ease',
    },
    toast: {
      enter: 'transform 300ms cubic-bezier(0.4, 0, 0.2, 1), opacity 300ms ease',
      exit: 'transform 200ms ease, opacity 200ms ease',
    },
    tooltip: {
      show: 'opacity 100ms ease, transform 100ms ease',
      hide: 'opacity 75ms ease',
    },
    accordion: {
      content: 'height 300ms cubic-bezier(0.4, 0, 0.2, 1)',
      icon: 'transform 200ms ease',
    },
    switch: {
      track: 'background-color 200ms ease',
      thumb: 'transform 200ms cubic-bezier(0.4, 0, 0.2, 1)',
    },
    checkbox: {
      box: 'border-color 150ms ease, background-color 150ms ease',
      check: 'transform 150ms ease, opacity 150ms ease',
    },
    tabs: {
      indicator: 'left 200ms ease, width 200ms ease',
      tab: 'color 150ms ease, background-color 150ms ease',
    },
    avatar: {
      hover: 'transform 200ms ease, box-shadow 200ms ease',
    },
    badge: {
      pulse: 'transform 200ms ease',
    },
    progress: {
      bar: 'width 500ms cubic-bezier(0.4, 0, 0.2, 1)',
    },
    skeleton: {
      shimmer: 'background-position 1500ms linear infinite',
    },
    table: {
      row: 'background-color 100ms ease',
      sort: 'color 150ms ease',
    },
    pagination: {
      button: 'background-color 150ms ease, color 150ms ease, border-color 150ms ease',
    },
  },
};

export default transitions;