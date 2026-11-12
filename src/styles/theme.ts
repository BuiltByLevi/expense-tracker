// Two selectable color themes share the same token names so every component
// keeps reading `theme.colors.X` unchanged:
//  - 'midnight'  — the current Midnight Blue & Teal brand (default)
//  - 'original'  — the app's original Indigo & Violet brand, kept as a
//    user-selectable option in Profile → Preferences → Theme.
// `theme.colors` and the category arrays are mutated IN PLACE by
// applyColorTheme() so existing static imports stay valid; ThemeContext
// re-renders the tree after switching so inline styles pick up new values.

export type ColorTheme = 'midnight' | 'original';

const midnightColors = {
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

  // Raw rgb triplets + bright accent, for translucent tints in inline styles
  primaryRgb: '30, 64, 175',
  successRgb: '20, 184, 166',
  accentBrightRgb: '45, 212, 191',
  accentBright: '#2dd4bf',

  // Semantic — success shares the teal accent; danger/warning stay standard
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
};

// The pre-redesign Indigo & Violet brand. `teal` here maps to the original
// secondary accent (violet) so two-accent UI keeps its intended pairing.
const originalColors: typeof midnightColors = {
  bgGradient: 'linear-gradient(135deg, #e0e7ff 0%, #f0fdf4 50%, #fef3c7 100%)',
  bgGradientDark: 'linear-gradient(135deg, #1e1b4b 0%, #1e293b 50%, #0f172a 100%)',

  glassBg: 'rgba(255, 255, 255, 0.65)',
  glassBgHover: 'rgba(255, 255, 255, 0.8)',
  glassBorder: 'rgba(255, 255, 255, 0.6)',
  glassShadow: '0 8px 32px rgba(99, 102, 241, 0.08)',
  glassShadowHover: '0 12px 40px rgba(99, 102, 241, 0.15)',

  primary: '#6366f1',
  primaryLight: '#a5b4fc',
  primaryDark: '#4f46e5',
  primaryGradient: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
  teal: '#8b5cf6',
  tealLight: '#c4b5fd',
  tealDark: '#7c3aed',

  primaryRgb: '99, 102, 241',
  successRgb: '16, 185, 129',
  accentBrightRgb: '139, 92, 246',
  accentBright: '#a78bfa',

  success: '#10b981',
  successLight: '#d1fae5',
  danger: '#ef4444',
  dangerLight: '#fee2e2',
  warning: '#f59e0b',
  warningLight: '#fef3c7',

  textPrimary: '#1e293b',
  textSecondary: '#64748b',
  textTertiary: '#94a3b8',
  textInverse: '#ffffff',

  pastelPurple: '#ede9fe',
  pastelMint: '#d1fae5',
  pastelPeach: '#fed7aa',
  pastelBlue: '#dbeafe',
  pastelPink: '#fce7f3',
};

export const theme = {
  colors: { ...midnightColors },

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
const midnightCategoryColors = [
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

const midnightCategoryColorsDark = [
  '#3a7bcb', '#bf5257', '#008dad', '#b46200', '#7b69c6', '#8e7a00', '#a758a1', '#00935d',
  '#6f93cf', '#c47d81', '#5fa6ba', '#c99a5c', '#a496d4', '#b3a65c', '#c086bb', '#5ea684',
  '#94a3b8',
];

// The app's original category palette (not CVD-validated — kept verbatim for
// the 'original' theme so it looks exactly like it used to).
const originalCategoryColors = [
  '#6366f1', // indigo        — Food & Dining
  '#10b981', // emerald       — Transportation
  '#f59e0b', // amber         — Shopping
  '#ef4444', // red           — Entertainment
  '#8b5cf6', // violet        — Bills & Utilities
  '#06b6d4', // cyan          — Healthcare
  '#ec4899', // pink          — Education
  '#14b8a6', // teal          — Rent
  '#84cc16', // lime          — Groceries
  '#f97316', // orange        — Fuel
  '#a855f7', // purple        — EMI & Loans
  '#0ea5e9', // sky           — Insurance
  '#22c55e', // green         — Investments
  '#eab308', // yellow        — Cash Withdrawal
  '#64748b', // slate         — Bank Charges
  '#d946ef', // fuchsia       — Transfers
  '#94a3b8', // gray          — Other
];

export const categoryColors = [...midnightCategoryColors];

// Dark-mode counterparts (same hue order, re-stepped for the dark surface —
// see categoryColors above). Consumers that need to theme-switch the chart
// itself can read this; most places only show these via the light set today.
export const categoryColorsDark = [...midnightCategoryColorsDark];

export const incomeCategoryColors: Record<string, string> = {
  Salary: theme.colors.success,
  Interest: theme.colors.primary,
  Refund: theme.colors.warning,
  Transfer: theme.colors.textSecondary,
  'Other Income': theme.colors.textTertiary,
};

export function applyColorTheme(name: ColorTheme): void {
  const colors = name === 'original' ? originalColors : midnightColors;
  Object.assign(theme.colors, colors);

  const cats = name === 'original' ? originalCategoryColors : midnightCategoryColors;
  categoryColors.splice(0, categoryColors.length, ...cats);

  // The original theme had a single palette for both modes.
  const catsDark = name === 'original' ? originalCategoryColors : midnightCategoryColorsDark;
  categoryColorsDark.splice(0, categoryColorsDark.length, ...catsDark);

  incomeCategoryColors.Salary = theme.colors.success;
  incomeCategoryColors.Interest = theme.colors.primary;
  incomeCategoryColors.Refund = theme.colors.warning;
  incomeCategoryColors.Transfer = theme.colors.textSecondary;
  incomeCategoryColors['Other Income'] = theme.colors.textTertiary;
}
