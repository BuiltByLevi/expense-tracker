export const theme = {
  colors: {
    // Backgrounds — "Midnight Blue & Teal": cool off-white by day, deep navy-black by night.
    bgGradient: 'linear-gradient(135deg, #eef2fa 0%, #e8f6f4 50%, #f5f3ea 100%)',
    bgGradientDark: 'linear-gradient(135deg, #0a0e1a 0%, #101a33 50%, #0a1420 100%)',

    // Glass cards
    glassBg: 'rgba(255, 255, 255, 0.65)',
    glassBgHover: 'rgba(255, 255, 255, 0.8)',
    glassBorder: 'rgba(255, 255, 255, 0.6)',
    glassShadow: '0 8px 32px rgba(30, 64, 175, 0.08)',
    glassShadowHover: '0 12px 40px rgba(30, 64, 175, 0.15)',

    // Accent — navy primary, teal secondary (used together for the brand gradient)
    primary: '#1e3a8a',
    primaryLight: '#93b4e8',
    primaryDark: '#15296b',
    primaryGradient: 'linear-gradient(135deg, #1e3a8a 0%, #14b8a6 100%)',
    teal: '#14b8a6',
    tealLight: '#99f0e4',
    tealDark: '#0f766e',

    // Semantic — success now shares the teal accent; danger/warning stay standard
    success: '#14b8a6',
    successLight: '#ccfbf1',
    danger: '#ef4444',
    dangerLight: '#fee2e2',
    warning: '#f59e0b',
    warningLight: '#fef3c7',

    // Text
    textPrimary: '#1e293b',
    textSecondary: '#64748b',
    textTertiary: '#94a3b8',
    textInverse: '#ffffff',

    // Pastel accents
    pastelPurple: '#dbe4fb',
    pastelMint: '#ccfbf1',
    pastelPeach: '#fed7aa',
    pastelBlue: '#dbeafe',
    pastelPink: '#fce7f3',
  },
  
  fonts: {
    family: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    sizes: {
      xs: '11px',
      sm: '13px',
      md: '14px',
      lg: '16px',
      xl: '20px',
      xxl: '28px',
      xxxl: '36px',
    },
    weights: {
      regular: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    },
  },
  
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '12px',
    lg: '16px',
    xl: '20px',
    xxl: '24px',
    xxxl: '32px',
  },
  
  radius: {
    sm: '8px',
    md: '12px',
    lg: '16px',
    xl: '20px',
    xxl: '24px',
    full: '9999px',
  },
  
  glass: {
    backdrop: 'blur(20px)',
    backdropStrong: 'blur(30px)',
  },
};

// Categorical hues validated with the data-viz skill's six checks (OKLCH
// lightness band, chroma floor, CVD ΔE on adjacent pairs, normal-vision
// floor, contrast vs. surface) for both light (#fcfcfb) and dark (#0a0e1a)
// surfaces — same hue order in both, re-stepped lightness/chroma per mode.
// Only the first 8 are validated as a fixed categorical set (see
// CategoryLegend's cap in DashboardWeb/Mobile); slots 9-17 are a lower-
// priority second tier for the long tail of less-used categories and cycle
// the same 8 hues at reduced chroma, since they're folded under "+N more"
// in the legend and only ever seen as thin pie slices.
export const categoryColors = [
  '#2971c6', // blue    — Food & Dining
  '#b9454c', // red     — Transportation
  '#0085a7', // teal    — Shopping
  '#ae5600', // amber   — Entertainment
  '#725ec2', // violet  — Bills & Utilities
  '#877100', // olive   — Healthcare
  '#a04c9a', // magenta — Education
  '#008b52', // green   — Rent
  '#6f93cf', // blue (muted)    — Groceries
  '#c47d81', // red (muted)     — Fuel
  '#5fa6ba', // teal (muted)    — EMI & Loans
  '#c99a5c', // amber (muted)   — Insurance
  '#a496d4', // violet (muted)  — Investments
  '#b3a65c', // olive (muted)   — Cash Withdrawal
  '#c086bb', // magenta (muted) — Bank Charges
  '#5ea684', // green (muted)   — Transfers
  '#94a3b8', // neutral gray    — Other
];

// Dark-mode counterparts (same hue order, re-stepped for the dark surface —
// see categoryColors above). Consumers that need to theme-switch the chart
// itself can read this; most places only show these via the light set today.
export const categoryColorsDark = [
  '#3a7bcb', '#bf5257', '#008dad', '#b46200', '#7b69c6', '#8e7a00', '#a758a1', '#00935d',
  '#6f93cf', '#c47d81', '#5fa6ba', '#c99a5c', '#a496d4', '#b3a65c', '#c086bb', '#5ea684',
  '#94a3b8',
];

export const incomeCategoryColors: Record<string, string> = {
  Salary: theme.colors.success,
  Interest: theme.colors.primary,
  Refund: theme.colors.warning,
  Transfer: theme.colors.textSecondary,
  'Other Income': theme.colors.textTertiary,
};