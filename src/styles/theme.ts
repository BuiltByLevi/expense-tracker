export const theme = {
  colors: {
    // Backgrounds
    bgGradient: 'linear-gradient(135deg, #e0e7ff 0%, #f0fdf4 50%, #fef3c7 100%)',
    bgGradientDark: 'linear-gradient(135deg, #1e1b4b 0%, #1e293b 50%, #0f172a 100%)',
    
    // Glass cards
    glassBg: 'rgba(255, 255, 255, 0.65)',
    glassBgHover: 'rgba(255, 255, 255, 0.8)',
    glassBorder: 'rgba(255, 255, 255, 0.6)',
    glassShadow: '0 8px 32px rgba(99, 102, 241, 0.08)',
    glassShadowHover: '0 12px 40px rgba(99, 102, 241, 0.15)',
    
    // Accent
    primary: '#6366f1',
    primaryLight: '#a5b4fc',
    primaryDark: '#4f46e5',
    primaryGradient: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
    
    // Semantic
    success: '#10b981',
    successLight: '#d1fae5',
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
    pastelPurple: '#ede9fe',
    pastelMint: '#d1fae5',
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

export const categoryColors = [
  '#6366f1', // indigo
  '#10b981', // emerald
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // violet
  '#06b6d4', // cyan
  '#ec4899', // pink
  '#14b8a6', // teal
  '#f97316', // orange
];