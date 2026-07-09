/**
 * Typography System
 * Comprehensive typography scale and settings
 */

const typography = {
  // ============================================
  // FONT FAMILIES
  // ============================================
  fontFamily: {
    // Primary font stack
    sans: [
      'Inter',
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Roboto',
      '"Helvetica Neue"',
      'Arial',
      'sans-serif',
      '"Apple Color Emoji"',
      '"Segoe UI Emoji"',
      '"Segoe UI Symbol"',
    ].join(', '),

    // Heading font (optional different font)
    heading: [
      'Poppins',
      'Inter',
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'sans-serif',
    ].join(', '),

    // Monospace for code
    mono: [
      '"Fira Code"',
      '"JetBrains Mono"',
      'Menlo',
      'Monaco',
      'Consolas',
      '"Liberation Mono"',
      '"Courier New"',
      'monospace',
    ].join(', '),

    // Serif for special content
    serif: [
      '"Merriweather"',
      'Georgia',
      '"Times New Roman"',
      'Times',
      'serif',
    ].join(', '),
  },

  // ============================================
  // FONT SIZES (with line heights)
  // ============================================
  fontSize: {
    // Base scale
    '2xs': ['10px', { lineHeight: '14px', letterSpacing: '0.01em' }],
    xs: ['12px', { lineHeight: '16px', letterSpacing: '0.01em' }],
    sm: ['13px', { lineHeight: '18px', letterSpacing: '0' }],
    base: ['14px', { lineHeight: '20px', letterSpacing: '0' }],
    md: ['15px', { lineHeight: '22px', letterSpacing: '0' }],
    lg: ['16px', { lineHeight: '24px', letterSpacing: '-0.01em' }],
    xl: ['18px', { lineHeight: '26px', letterSpacing: '-0.01em' }],
    '2xl': ['20px', { lineHeight: '28px', letterSpacing: '-0.02em' }],
    '3xl': ['24px', { lineHeight: '32px', letterSpacing: '-0.02em' }],
    '4xl': ['30px', { lineHeight: '38px', letterSpacing: '-0.02em' }],
    '5xl': ['36px', { lineHeight: '44px', letterSpacing: '-0.02em' }],
    '6xl': ['48px', { lineHeight: '56px', letterSpacing: '-0.025em' }],
    '7xl': ['60px', { lineHeight: '68px', letterSpacing: '-0.025em' }],
    '8xl': ['72px', { lineHeight: '80px', letterSpacing: '-0.03em' }],
    '9xl': ['96px', { lineHeight: '104px', letterSpacing: '-0.03em' }],

    // Simple values for backward compatibility
    simple: {
      '2xs': '10px',
      xs: '12px',
      sm: '13px',
      base: '14px',
      md: '15px',
      lg: '16px',
      xl: '18px',
      '2xl': '20px',
      '3xl': '24px',
      '4xl': '30px',
      '5xl': '36px',
      '6xl': '48px',
    },
  },

  // ============================================
  // FONT WEIGHTS
  // ============================================
  fontWeight: {
    hairline: 100,
    thin: 200,
    light: 300,
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
    extrabold: 800,
    black: 900,
  },

  // ============================================
  // LINE HEIGHTS
  // ============================================
  lineHeight: {
    none: 1,
    tight: 1.25,
    snug: 1.375,
    normal: 1.5,
    relaxed: 1.625,
    loose: 2,
    
    // Specific values
    '3': '12px',
    '4': '16px',
    '5': '20px',
    '6': '24px',
    '7': '28px',
    '8': '32px',
    '9': '36px',
    '10': '40px',
  },

  // ============================================
  // LETTER SPACING
  // ============================================
  letterSpacing: {
    tighter: '-0.05em',
    tight: '-0.025em',
    normal: '0',
    wide: '0.025em',
    wider: '0.05em',
    widest: '0.1em',
  },

  // ============================================
  // TEXT DECORATION
  // ============================================
  textDecoration: {
    none: 'none',
    underline: 'underline',
    lineThrough: 'line-through',
    overline: 'overline',
  },

  // ============================================
  // TEXT TRANSFORM
  // ============================================
  textTransform: {
    none: 'none',
    uppercase: 'uppercase',
    lowercase: 'lowercase',
    capitalize: 'capitalize',
  },

  // ============================================
  // HEADING PRESETS
  // ============================================
  headings: {
    h1: {
      fontSize: '30px',
      lineHeight: '38px',
      fontWeight: 700,
      letterSpacing: '-0.02em',
    },
    h2: {
      fontSize: '24px',
      lineHeight: '32px',
      fontWeight: 600,
      letterSpacing: '-0.02em',
    },
    h3: {
      fontSize: '20px',
      lineHeight: '28px',
      fontWeight: 600,
      letterSpacing: '-0.01em',
    },
    h4: {
      fontSize: '18px',
      lineHeight: '26px',
      fontWeight: 600,
      letterSpacing: '-0.01em',
    },
    h5: {
      fontSize: '16px',
      lineHeight: '24px',
      fontWeight: 600,
      letterSpacing: '0',
    },
    h6: {
      fontSize: '14px',
      lineHeight: '20px',
      fontWeight: 600,
      letterSpacing: '0',
    },
  },

  // ============================================
  // TEXT STYLE PRESETS
  // ============================================
  styles: {
    // Body text
    body: {
      fontSize: '14px',
      lineHeight: '20px',
      fontWeight: 400,
    },
    bodyLarge: {
      fontSize: '16px',
      lineHeight: '24px',
      fontWeight: 400,
    },
    bodySmall: {
      fontSize: '13px',
      lineHeight: '18px',
      fontWeight: 400,
    },

    // Labels
    label: {
      fontSize: '13px',
      lineHeight: '18px',
      fontWeight: 500,
    },
    labelLarge: {
      fontSize: '14px',
      lineHeight: '20px',
      fontWeight: 500,
    },
    labelSmall: {
      fontSize: '12px',
      lineHeight: '16px',
      fontWeight: 500,
    },

    // Caption
    caption: {
      fontSize: '12px',
      lineHeight: '16px',
      fontWeight: 400,
    },
    captionSmall: {
      fontSize: '10px',
      lineHeight: '14px',
      fontWeight: 400,
    },

    // Overline
    overline: {
      fontSize: '11px',
      lineHeight: '16px',
      fontWeight: 600,
      letterSpacing: '0.05em',
      textTransform: 'uppercase',
    },

    // Button text
    button: {
      fontSize: '14px',
      lineHeight: '20px',
      fontWeight: 500,
    },
    buttonSmall: {
      fontSize: '13px',
      lineHeight: '18px',
      fontWeight: 500,
    },
    buttonLarge: {
      fontSize: '15px',
      lineHeight: '22px',
      fontWeight: 500,
    },

    // Input text
    input: {
      fontSize: '14px',
      lineHeight: '20px',
      fontWeight: 400,
    },

    // Code
    code: {
      fontSize: '13px',
      lineHeight: '20px',
      fontWeight: 400,
    },

    // Quote
    quote: {
      fontSize: '18px',
      lineHeight: '28px',
      fontWeight: 400,
      fontStyle: 'italic',
    },

    // Lead/Intro text
    lead: {
      fontSize: '18px',
      lineHeight: '28px',
      fontWeight: 400,
    },
  },

  // ============================================
  // RESPONSIVE TYPOGRAPHY SCALE
  // ============================================
  responsive: {
    // Mobile first approach
    mobile: {
      h1: { fontSize: '24px', lineHeight: '32px' },
      h2: { fontSize: '20px', lineHeight: '28px' },
      h3: { fontSize: '18px', lineHeight: '26px' },
      body: { fontSize: '14px', lineHeight: '20px' },
    },
    tablet: {
      h1: { fontSize: '28px', lineHeight: '36px' },
      h2: { fontSize: '22px', lineHeight: '30px' },
      h3: { fontSize: '18px', lineHeight: '26px' },
      body: { fontSize: '14px', lineHeight: '20px' },
    },
    desktop: {
      h1: { fontSize: '30px', lineHeight: '38px' },
      h2: { fontSize: '24px', lineHeight: '32px' },
      h3: { fontSize: '20px', lineHeight: '28px' },
      body: { fontSize: '14px', lineHeight: '20px' },
    },
  },
};

export default typography;