/**
 * Glassmorphism & Modern Dark Theme Styles
 *
 * Reusable style utilities for the modern dark UI redesign.
 * Includes glass cards, gradient backgrounds, and premium effects.
 */

import { StyleSheet, Platform } from 'react-native';
import { colors, gradients } from './theme';

// ============================================================================
// DARK THEME COLORS
// ============================================================================

export const darkTheme = {
  // Backgrounds
  background: '#0F0F13',
  backgroundAlt: '#16161D',
  surface: '#1C1C24',
  surfaceElevated: '#242430',

  // Glass effects
  glass: 'rgba(255, 255, 255, 0.05)',
  glassBorder: 'rgba(255, 255, 255, 0.08)',
  glassHighlight: 'rgba(255, 255, 255, 0.12)',

  // Text
  textPrimary: '#FFFFFF',
  textSecondary: 'rgba(255, 255, 255, 0.7)',
  textMuted: 'rgba(255, 255, 255, 0.5)',
  textDisabled: 'rgba(255, 255, 255, 0.3)',

  // Accents
  primary: colors.primary[500],
  primaryGlow: colors.primary[400],
  accent: colors.accent[500],
  accentGlow: colors.accent[400],

  // Gradients
  gradientStart: colors.primary[500],
  gradientEnd: colors.accent[600],

  // Semantic
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6',
} as const;

// ============================================================================
// GRADIENT DEFINITIONS
// ============================================================================

export const darkGradients = {
  // Primary header gradient (coral to violet)
  header: {
    colors: [colors.primary[500], colors.accent[600]],
    start: { x: 0, y: 0 },
    end: { x: 1, y: 1 },
  },
  // Subtle background gradient
  background: {
    colors: ['#0F0F13', '#1A1A24'],
    start: { x: 0, y: 0 },
    end: { x: 0, y: 1 },
  },
  // Card accent gradient
  cardAccent: {
    colors: ['rgba(255, 107, 71, 0.15)', 'rgba(139, 92, 246, 0.15)'],
    start: { x: 0, y: 0 },
    end: { x: 1, y: 1 },
  },
  // Button gradient
  button: {
    colors: [colors.primary[500], colors.primary[600]],
    start: { x: 0, y: 0 },
    end: { x: 1, y: 0 },
  },
  // Premium glow gradient
  glow: {
    colors: ['rgba(255, 107, 71, 0.3)', 'rgba(139, 92, 246, 0.3)', 'transparent'],
    start: { x: 0.5, y: 0 },
    end: { x: 0.5, y: 1 },
  },
} as const;

// ============================================================================
// GLASSMORPHISM STYLES
// ============================================================================

export const glassStyles = StyleSheet.create({
  // Basic glass card
  card: {
    backgroundColor: darkTheme.glass,
    borderWidth: 1,
    borderColor: darkTheme.glassBorder,
    borderRadius: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
      },
      android: {
        elevation: 8,
      },
    }),
  },

  // Elevated glass card (more prominent)
  cardElevated: {
    backgroundColor: darkTheme.surfaceElevated,
    borderWidth: 1,
    borderColor: darkTheme.glassHighlight,
    borderRadius: 24,
    ...Platform.select({
      ios: {
        shadowColor: colors.primary[500],
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.2,
        shadowRadius: 24,
      },
      android: {
        elevation: 12,
      },
    }),
  },

  // Subtle glass card (less prominent)
  cardSubtle: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
  },

  // Input field glass style
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    color: darkTheme.textPrimary,
  },

  // Input focused state
  inputFocused: {
    borderColor: colors.primary[500],
    backgroundColor: 'rgba(255, 107, 71, 0.05)',
  },

  // Divider line
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    marginVertical: 16,
  },
});

// ============================================================================
// BUTTON STYLES (DARK THEME)
// ============================================================================

export const darkButtonStyles = StyleSheet.create({
  // Primary gradient button base
  primary: {
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: colors.primary[500],
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
      },
      android: {
        elevation: 6,
      },
    }),
  },

  primaryText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },

  // Secondary (outline) button
  secondary: {
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: colors.primary[500],
  },

  secondaryText: {
    color: colors.primary[500],
    fontSize: 16,
    fontWeight: '600',
  },

  // Ghost button
  ghost: {
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },

  ghostText: {
    color: darkTheme.textSecondary,
    fontSize: 16,
    fontWeight: '500',
  },

  // Danger button
  danger: {
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },

  dangerText: {
    color: '#EF4444',
    fontSize: 16,
    fontWeight: '600',
  },

  // Small button variant
  small: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
  },

  smallText: {
    fontSize: 14,
  },
});

// ============================================================================
// TYPOGRAPHY STYLES (DARK THEME)
// ============================================================================

export const darkTypography = StyleSheet.create({
  // Hero title (used in headers)
  hero: {
    fontSize: 32,
    fontWeight: '700',
    color: darkTheme.textPrimary,
    letterSpacing: -0.5,
  },

  // Section title
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: darkTheme.textPrimary,
    letterSpacing: -0.3,
  },

  // Subtitle
  subtitle: {
    fontSize: 16,
    fontWeight: '600',
    color: darkTheme.textSecondary,
  },

  // Body text
  body: {
    fontSize: 15,
    color: darkTheme.textSecondary,
    lineHeight: 22,
  },

  // Label (form labels, small headers)
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: darkTheme.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },

  // Caption (small helper text)
  caption: {
    fontSize: 13,
    color: darkTheme.textMuted,
    lineHeight: 18,
  },

  // Accent text (highlighted values)
  accent: {
    color: colors.primary[400],
    fontWeight: '600',
  },

  // Value text (displayed values in forms)
  value: {
    fontSize: 16,
    color: darkTheme.textPrimary,
    fontWeight: '500',
  },
});

// ============================================================================
// LAYOUT HELPERS
// ============================================================================

export const darkLayout = StyleSheet.create({
  // Full screen container
  container: {
    flex: 1,
    backgroundColor: darkTheme.background,
  },

  // Section padding
  section: {
    paddingHorizontal: 20,
    paddingVertical: 24,
  },

  // Card padding
  cardPadding: {
    padding: 20,
  },

  // Row layout
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  // Space between row
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  // Center content
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Gap utilities
  gap4: { gap: 4 },
  gap8: { gap: 8 },
  gap12: { gap: 12 },
  gap16: { gap: 16 },
  gap20: { gap: 20 },
  gap24: { gap: 24 },
});

export default {
  darkTheme,
  darkGradients,
  glassStyles,
  darkButtonStyles,
  darkTypography,
  darkLayout,
};
