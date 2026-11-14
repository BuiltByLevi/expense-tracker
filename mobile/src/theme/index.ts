/**
 * React Native port of the web app's design tokens (src/styles/theme.ts).
 *
 * Same token NAMES and same hex values, so both apps read as one product, but
 * typed for React Native: spacing/radius/font sizes are numbers (RN has no
 * "px" strings) and CSS `linear-gradient` strings become colour-stop arrays
 * consumed by expo-linear-gradient / react-native-svg.
 */

export type ColorTheme = 'midnight' | 'original';
export type ColorMode = 'light' | 'dark';

export interface Palette {
  screenBg: string;
  bgGradient: readonly [string, string, string];
  cardBg: string;
  cardBorder: string;
  primary: string;
  primaryLight: string;
  primaryDark: string;
  primaryGradient: readonly [string, string];
  teal: string;
  tealLight: string;
  tealDark: string;
  accentBright: string;
  success: string;
  successLight: string;
  danger: string;
  dangerLight: string;
  warning: string;
  warningLight: string;
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  textInverse: string;
  pastelBlue: string;
  pastelMint: string;
  /** --glass-bg / --glass-border: the translucent .glass-card surface. */
  glassBg: string;
  glassBorder: string;
  /** --input-bg / --input-border (.input, .btn-ghost). */
  inputBg: string;
  inputBorder: string;
  /** --modal-bg / --modal-border / --modal-overlay. */
  modalBg: string;
  modalBorder: string;
  modalOverlay: string;
  /** --aurora-1..3: the three radial glows painted over the page gradient. */
  aurora: readonly [string, string, string];
  /** .btn-primary / .tab.active fill — reversed in dark mode on the web. */
  actionGradient: readonly [string, string];
}

const midnightLight: Palette = {
  screenBg: '#f2f5fb',
  bgGradient: ['#eef2fa', '#e8f6f4', '#f5f3ea'],
  cardBg: '#ffffff',
  cardBorder: 'rgba(30, 64, 175, 0.08)',
  primary: '#1e3a8a',
  primaryLight: '#93b4e8',
  primaryDark: '#15296b',
  primaryGradient: ['#1e3a8a', '#14b8a6'],
  teal: '#14b8a6',
  tealLight: '#99f0e4',
  tealDark: '#0f766e',
  accentBright: '#2dd4bf',
  success: '#14b8a6',
  successLight: '#ccfbf1',
  danger: '#ef4444',
  dangerLight: '#fee2e2',
  warning: '#f59e0b',
  warningLight: '#fef3c7',
  textPrimary: '#1e293b',
  textSecondary: '#64748b',
  textTertiary: '#94a3b8',
  textInverse: '#ffffff',
  pastelBlue: '#dbeafe',
  pastelMint: '#ccfbf1',
  glassBg: 'rgba(255, 255, 255, 0.65)',
  glassBorder: 'rgba(255, 255, 255, 0.6)',
  inputBg: 'rgba(255, 255, 255, 0.7)',
  inputBorder: 'rgba(0, 0, 0, 0.06)',
  modalBg: 'rgba(255, 255, 255, 0.97)',
  modalBorder: 'rgba(255, 255, 255, 0.8)',
  modalOverlay: 'rgba(15, 23, 42, 0.4)',
  aurora: ['rgba(20, 184, 166, 0.14)', 'rgba(30, 64, 175, 0.10)', 'rgba(212, 160, 23, 0.08)'],
  actionGradient: ['#1e3a8a', '#14b8a6'],
};

const midnightDark: Palette = {
  ...midnightLight,
  screenBg: '#0a0e1a',
  bgGradient: ['#0a0e1a', '#101a33', '#0a1420'],
  cardBg: '#141e32',
  cardBorder: 'rgba(148, 163, 184, 0.12)',
  primary: '#5b86d6',
  teal: '#2dd4bf',
  success: '#2dd4bf',
  danger: '#f87171',
  warning: '#fbbf24',
  // The pastel *Light tints are banner//badge BACKGROUNDS here (deficit
  // banner, success toasts, import format badges). Carrying the light-mode
  // pastels onto a near-black ground makes them glare, so dark mode uses
  // translucent tints of the same hue instead.
  successLight: 'rgba(45, 212, 191, 0.14)',
  dangerLight: 'rgba(248, 113, 113, 0.16)',
  warningLight: 'rgba(251, 191, 36, 0.16)',
  pastelBlue: 'rgba(91, 134, 214, 0.14)',
  pastelMint: 'rgba(45, 212, 191, 0.14)',
  textPrimary: '#f1f5f9',
  textSecondary: '#a5b4c8',
  textTertiary: '#6b7a94',
  glassBg: 'rgba(20, 30, 50, 0.55)',
  glassBorder: 'rgba(148, 163, 184, 0.12)',
  inputBg: 'rgba(10, 18, 36, 0.7)',
  inputBorder: 'rgba(148, 163, 184, 0.15)',
  modalBg: 'rgba(12, 20, 38, 0.97)',
  modalBorder: 'rgba(45, 212, 191, 0.15)',
  modalOverlay: 'rgba(0, 0, 0, 0.75)',
  aurora: ['rgba(45, 212, 191, 0.32)', 'rgba(76, 123, 217, 0.26)', 'rgba(212, 160, 23, 0.14)'],
  actionGradient: ['#2dd4bf', '#5b86d6'],
};

const originalLight: Palette = {
  ...midnightLight,
  screenBg: '#f3f2fd',
  bgGradient: ['#e0e7ff', '#f0fdf4', '#fef3c7'],
  primary: '#6366f1',
  primaryLight: '#a5b4fc',
  primaryDark: '#4f46e5',
  primaryGradient: ['#6366f1', '#8b5cf6'],
  teal: '#8b5cf6',
  tealLight: '#c4b5fd',
  tealDark: '#7c3aed',
  accentBright: '#a78bfa',
  success: '#10b981',
  successLight: '#d1fae5',
  aurora: ['rgba(139, 92, 246, 0.15)', 'rgba(16, 185, 129, 0.12)', 'rgba(251, 191, 36, 0.1)'],
  actionGradient: ['#6366f1', '#8b5cf6'],
};

const originalDark: Palette = {
  ...originalLight,
  screenBg: '#0a0e1a',
  // Same ground as the web's [data-theme=dark][data-color-theme=original].
  bgGradient: ['#0a0e1a', '#14172e', '#0f1420'],
  cardBg: '#1e293b',
  cardBorder: 'rgba(148, 163, 184, 0.12)',
  primary: '#818cf8',
  teal: '#a78bfa',
  success: '#34d399',
  danger: '#f87171',
  warning: '#fbbf24',
  // See midnightDark — tints become translucent on a dark ground.
  successLight: 'rgba(52, 211, 153, 0.14)',
  dangerLight: 'rgba(248, 113, 113, 0.16)',
  warningLight: 'rgba(251, 191, 36, 0.16)',
  pastelBlue: 'rgba(129, 140, 248, 0.14)',
  pastelMint: 'rgba(52, 211, 153, 0.14)',
  textPrimary: '#f1f5f9',
  textSecondary: '#a5b4c8',
  textTertiary: '#6b7a94',
  glassBg: 'rgba(30, 41, 59, 0.55)',
  glassBorder: 'rgba(148, 163, 184, 0.12)',
  inputBg: 'rgba(15, 23, 42, 0.7)',
  inputBorder: 'rgba(148, 163, 184, 0.15)',
  modalBg: 'rgba(20, 25, 42, 0.97)',
  modalBorder: 'rgba(139, 92, 246, 0.15)',
  modalOverlay: 'rgba(0, 0, 0, 0.75)',
  aurora: ['rgba(139, 92, 246, 0.35)', 'rgba(16, 185, 129, 0.22)', 'rgba(59, 130, 246, 0.28)'],
  actionGradient: ['#8b5cf6', '#6366f1'],
};

export function getPalette(name: ColorTheme, mode: ColorMode): Palette {
  if (name === 'original') return mode === 'dark' ? originalDark : originalLight;
  return mode === 'dark' ? midnightDark : midnightLight;
}

/** Categorical hues, CVD-validated on both surfaces — mirrors the web set. */
const midnightCategoryLight = [
  '#2971c6', '#b9454c', '#0085a7', '#ae5600', '#725ec2', '#877100', '#a04c9a', '#008b52',
  '#6f93cf', '#c47d81', '#5fa6ba', '#c99a5c', '#a496d4', '#b3a65c', '#c086bb', '#5ea684',
  '#94a3b8',
];

const midnightCategoryDark = [
  '#3a7bcb', '#bf5257', '#008dad', '#b46200', '#7b69c6', '#8e7a00', '#a758a1', '#00935d',
  '#6f93cf', '#c47d81', '#5fa6ba', '#c99a5c', '#a496d4', '#b3a65c', '#c086bb', '#5ea684',
  '#94a3b8',
];

const originalCategory = [
  '#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#14b8a6',
  '#84cc16', '#f97316', '#a855f7', '#0ea5e9', '#22c55e', '#eab308', '#64748b', '#d946ef',
  '#94a3b8',
];

export function getCategoryColors(name: ColorTheme, mode: ColorMode): string[] {
  if (name === 'original') return originalCategory;
  return mode === 'dark' ? midnightCategoryDark : midnightCategoryLight;
}

export function getIncomeCategoryColors(p: Palette): Record<string, string> {
  return {
    Salary: p.success,
    Interest: p.primary,
    Refund: p.warning,
    Transfer: p.textSecondary,
    'Other Income': p.textTertiary,
  };
}

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32 } as const;

export const radius = { sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, full: 9999 } as const;

export const fontSize = { xs: 11, sm: 13, md: 14, lg: 16, xl: 20, xxl: 28, xxxl: 36 } as const;

export const fontWeight = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
} as const;
