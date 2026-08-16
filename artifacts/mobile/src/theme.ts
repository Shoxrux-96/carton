// Web sayt bilan bir xil tema — Vivid Orange primary
export const colors = {
  primary: '#f97316',       // Orange (web: hsl(24,95%,53%))
  primaryDark: '#ea580c',
  primaryLight: '#fed7aa',
  secondary: '#f59e0b',     // Amber
  success: '#22c55e',       // Green (web: hsl(142,71%,45%))
  danger: '#ef4444',        // Red
  warning: '#eab308',       // Yellow (web: hsl(38,92%,50%))
  info: '#3b82f6',          // Blue
  background: '#fafaf9',    // Warm white
  surface: '#ffffff',
  surfaceAlt: '#f5f5f4',    // Stone-100
  text: '#1c1917',          // Stone-900
  textSecondary: '#57534e',  // Stone-600
  textMuted: '#a8a29e',     // Stone-400
  border: '#e7e5e4',        // Stone-200
  shadow: '#000',
  gradientStart: '#f97316',
  gradientEnd: '#ea580c',
  cardBg: '#ffffff',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  full: 999,
};

export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 8,
  },
};
