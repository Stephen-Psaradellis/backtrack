/**
 * Theme Constants
 *
 * Color palette and theme configuration for the avatar editor.
 */

export const colors = {
  // Primary colors
  primary: {
    50: '#eef2ff',
    100: '#e0e7ff',
    200: '#c7d2fe',
    300: '#a5b4fc',
    400: '#818cf8',
    500: '#6366f1',
    600: '#4f46e5',
    700: '#4338ca',
    800: '#3730a3',
    900: '#312e81',
  },

  // Accent colors
  accent: {
    50: '#fdf4ff',
    100: '#fae8ff',
    200: '#f5d0fe',
    300: '#f0abfc',
    400: '#e879f9',
    500: '#d946ef',
    600: '#c026d3',
    700: '#a21caf',
    800: '#86198f',
    900: '#701a75',
  },

  // Neutral colors
  neutral: {
    50: '#fafafa',
    100: '#f5f5f5',
    200: '#e5e5e5',
    300: '#d4d4d4',
    400: '#a3a3a3',
    500: '#737373',
    600: '#525252',
    700: '#404040',
    800: '#262626',
    900: '#171717',
  },

  // Semantic colors
  success: {
    500: '#22c55e',
    600: '#16a34a',
  },
  warning: {
    500: '#f59e0b',
    600: '#d97706',
  },
  error: {
    500: '#ef4444',
    600: '#dc2626',
  },

  // Red palette (for delete/destructive actions)
  red: {
    50: '#fef2f2',
    100: '#fee2e2',
    200: '#fecaca',
    300: '#fca5a5',
    400: '#f87171',
    500: '#ef4444',
    600: '#dc2626',
    700: '#b91c1c',
    800: '#991b1b',
    900: '#7f1d1d',
  },

  // Base colors
  white: '#ffffff',
  black: '#000000',
};

export const darkTheme = {
  background: '#0f0f14',
  backgroundAlt: '#16161e',
  surface: '#1e1e28',
  surfaceElevated: '#262632',
  textPrimary: '#ffffff',
  textSecondary: '#a1a1aa',
  textMuted: '#71717a',
  textDisabled: '#3f3f46',
  text: '#a1a1aa', // Alias for textSecondary
  glassBorder: 'rgba(255, 255, 255, 0.08)',
  glassBackground: 'rgba(255, 255, 255, 0.04)',
};

export const lightTheme = {
  background: '#ffffff',
  backgroundAlt: '#f9fafb',
  surface: '#ffffff',
  surfaceElevated: '#f3f4f6',
  textPrimary: '#111827',
  textSecondary: '#4b5563',
  textMuted: '#9ca3af',
  textDisabled: '#d1d5db',
  glassBorder: 'rgba(0, 0, 0, 0.08)',
  glassBackground: 'rgba(0, 0, 0, 0.02)',
};
