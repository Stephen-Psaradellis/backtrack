/**
 * Design System Theme
 *
 * Unified design tokens for both web (Tailwind) and mobile (React Native).
 * This creates a cohesive, modern visual language across platforms.
 */

// ============================================================================
// COLOR PALETTE
// ============================================================================

/**
 * Brand Colors
 * Primary: Warm Coral - inviting, modern, friendly
 * Accent: Deep Violet - sophisticated, adds depth
 */
export const colors = {
  // Primary - Warm Coral gradient range
  primary: {
    50: '#FFF5F2',
    100: '#FFE8E1',
    200: '#FFD0C2',
    300: '#FFB199',
    400: '#FF8C6B',
    500: '#FF6B47', // Main primary
    600: '#F04E2A',
    700: '#CC3D1E',
    800: '#A83318',
    900: '#8A2C16',
    950: '#4A1409',
  },

  // Accent - Deep Violet
  accent: {
    50: '#F5F3FF',
    100: '#EDE9FE',
    200: '#DDD6FE',
    300: '#C4B5FD',
    400: '#A78BFA',
    500: '#8B5CF6', // Main accent
    600: '#7C3AED',
    700: '#6D28D9',
    800: '#5B21B6',
    900: '#4C1D95',
    950: '#2E1065',
  },

  // Neutral - Warm grays (slight warm tint)
  neutral: {
    50: '#FAFAF9',
    100: '#F5F5F4',
    200: '#E7E5E4',
    300: '#D6D3D1',
    400: '#A8A29E',
    500: '#78716C',
    600: '#57534E',
    700: '#44403C',
    800: '#292524',
    900: '#1C1917',
    950: '#0C0A09',
  },

  // Semantic colors
  success: {
    light: '#D1FAE5',
    main: '#10B981',
    dark: '#047857',
  },
  warning: {
    light: '#FEF3C7',
    main: '#F59E0B',
    dark: '#B45309',
  },
  error: {
    light: '#FEE2E2',
    main: '#EF4444',
    dark: '#B91C1C',
  },
  info: {
    light: '#DBEAFE',
    main: '#3B82F6',
    dark: '#1D4ED8',
  },

  // Special
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
} as const;

// ============================================================================
// SPACING
// ============================================================================

/**
 * Spacing scale (in pixels)
 * Based on 4px base unit for consistency
 */
export const spacing = {
  0: 0,
  0.5: 2,
  1: 4,
  1.5: 6,
  2: 8,
  2.5: 10,
  3: 12,
  3.5: 14,
  4: 16,
  5: 20,
  6: 24,
  7: 28,
  8: 32,
  9: 36,
  10: 40,
  11: 44,
  12: 48,
  14: 56,
  16: 64,
  20: 80,
  24: 96,
  28: 112,
  32: 128,
} as const;

// ============================================================================
// TYPOGRAPHY
// ============================================================================

export const typography = {
  fontFamily: {
    sans: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    mono: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace',
  },
  fontSize: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
    '4xl': 36,
    '5xl': 48,
  },
  fontWeight: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
  lineHeight: {
    tight: 1.25,
    normal: 1.5,
    relaxed: 1.75,
  },
  letterSpacing: {
    tight: -0.5,
    normal: 0,
    wide: 0.5,
  },
} as const;

// ============================================================================
// BORDER RADIUS
// ============================================================================

/**
 * Modern, rounded corners
 * Larger radii for a softer, more contemporary feel
 */
export const borderRadius = {
  none: 0,
  sm: 6,
  DEFAULT: 12,
  md: 16,
  lg: 20,
  xl: 24,
  '2xl': 32,
  full: 9999,
} as const;

// ============================================================================
// SHADOWS
// ============================================================================

/**
 * Soft shadows with subtle color tinting
 * More modern than pure black shadows
 */
export const shadows = {
  // For web (CSS box-shadow)
  web: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.03), 0 1px 3px 0 rgba(0, 0, 0, 0.06)',
    DEFAULT: '0 2px 4px -1px rgba(0, 0, 0, 0.04), 0 4px 6px -1px rgba(0, 0, 0, 0.08)',
    md: '0 4px 6px -2px rgba(0, 0, 0, 0.04), 0 10px 15px -3px rgba(0, 0, 0, 0.08)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.06), 0 20px 25px -5px rgba(0, 0, 0, 0.10)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.08), 0 25px 50px -12px rgba(0, 0, 0, 0.15)',
    glow: `0 0 20px ${colors.primary[500]}40, 0 0 40px ${colors.primary[500]}20`,
    glowAccent: `0 0 20px ${colors.accent[500]}40, 0 0 40px ${colors.accent[500]}20`,
  },
  // For React Native
  native: {
    sm: {
      shadowColor: colors.neutral[900],
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.06,
      shadowRadius: 2,
      elevation: 1,
    },
    DEFAULT: {
      shadowColor: colors.neutral[900],
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 4,
      elevation: 2,
    },
    md: {
      shadowColor: colors.neutral[900],
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.10,
      shadowRadius: 8,
      elevation: 4,
    },
    lg: {
      shadowColor: colors.neutral[900],
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.12,
      shadowRadius: 16,
      elevation: 8,
    },
  },
} as const;

// ============================================================================
// ANIMATION
// ============================================================================

export const animation = {
  duration: {
    fast: 150,
    normal: 200,
    slow: 300,
    slower: 500,
  },
  easing: {
    ease: 'ease',
    easeIn: 'ease-in',
    easeOut: 'ease-out',
    easeInOut: 'ease-in-out',
    // Modern spring-like curves
    spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
    smooth: 'cubic-bezier(0.4, 0, 0.2, 1)',
  },
} as const;

// ============================================================================
// COMPONENT TOKENS
// ============================================================================

/**
 * Button-specific design tokens
 */
export const buttonTokens = {
  borderRadius: borderRadius.md,
  // Size variants
  sizes: {
    sm: {
      paddingVertical: spacing[2],
      paddingHorizontal: spacing[3],
      fontSize: typography.fontSize.sm,
      minHeight: 36,
    },
    md: {
      paddingVertical: spacing[3],
      paddingHorizontal: spacing[5],
      fontSize: typography.fontSize.base,
      minHeight: 44,
    },
    lg: {
      paddingVertical: spacing[4],
      paddingHorizontal: spacing[6],
      fontSize: typography.fontSize.lg,
      minHeight: 52,
    },
  },
  // Variant colors
  variants: {
    primary: {
      background: colors.primary[500],
      backgroundHover: colors.primary[600],
      backgroundActive: colors.primary[700],
      backgroundDisabled: colors.primary[200],
      text: colors.white,
      textDisabled: colors.white,
    },
    secondary: {
      background: colors.neutral[100],
      backgroundHover: colors.neutral[200],
      backgroundActive: colors.neutral[300],
      backgroundDisabled: colors.neutral[50],
      text: colors.neutral[900],
      textDisabled: colors.neutral[400],
    },
    outline: {
      background: colors.transparent,
      backgroundHover: colors.primary[50],
      backgroundActive: colors.primary[100],
      backgroundDisabled: colors.transparent,
      border: colors.primary[500],
      borderDisabled: colors.primary[200],
      text: colors.primary[600],
      textDisabled: colors.primary[300],
    },
    ghost: {
      background: colors.transparent,
      backgroundHover: colors.neutral[100],
      backgroundActive: colors.neutral[200],
      backgroundDisabled: colors.transparent,
      text: colors.neutral[700],
      textDisabled: colors.neutral[400],
    },
    danger: {
      background: colors.error.main,
      backgroundHover: colors.error.dark,
      backgroundActive: '#991B1B',
      backgroundDisabled: colors.error.light,
      text: colors.white,
      textDisabled: colors.white,
    },
  },
} as const;

/**
 * Input-specific design tokens
 */
export const inputTokens = {
  borderRadius: borderRadius.DEFAULT,
  borderWidth: 1.5,
  colors: {
    border: colors.neutral[300],
    borderFocus: colors.primary[500],
    borderError: colors.error.main,
    background: colors.white,
    backgroundDisabled: colors.neutral[50],
    text: colors.neutral[900],
    textDisabled: colors.neutral[500],
    placeholder: colors.neutral[400],
    label: colors.neutral[700],
  },
} as const;

/**
 * Card-specific design tokens
 */
export const cardTokens = {
  borderRadius: borderRadius.lg,
  padding: spacing[5],
  background: colors.white,
  backgroundDark: colors.neutral[800],
} as const;

// ============================================================================
// GRADIENTS
// ============================================================================

export const gradients = {
  // Primary gradient (coral)
  primary: {
    web: `linear-gradient(135deg, ${colors.primary[400]} 0%, ${colors.primary[600]} 100%)`,
    native: {
      colors: [colors.primary[400], colors.primary[600]],
      start: { x: 0, y: 0 },
      end: { x: 1, y: 1 },
    },
  },
  // Accent gradient (violet)
  accent: {
    web: `linear-gradient(135deg, ${colors.accent[400]} 0%, ${colors.accent[600]} 100%)`,
    native: {
      colors: [colors.accent[400], colors.accent[600]],
      start: { x: 0, y: 0 },
      end: { x: 1, y: 1 },
    },
  },
  // Warm sunset gradient
  sunset: {
    web: `linear-gradient(135deg, ${colors.primary[400]} 0%, ${colors.accent[500]} 100%)`,
    native: {
      colors: [colors.primary[400], colors.accent[500]],
      start: { x: 0, y: 0 },
      end: { x: 1, y: 1 },
    },
  },
  // Subtle background gradient
  subtle: {
    web: `linear-gradient(180deg, ${colors.neutral[50]} 0%, ${colors.white} 100%)`,
    native: {
      colors: [colors.neutral[50], colors.white],
      start: { x: 0, y: 0 },
      end: { x: 0, y: 1 },
    },
  },
} as const;

// ============================================================================
// DARK MODE COLORS
// ============================================================================

export const darkModeColors = {
  background: colors.neutral[950],
  foreground: colors.neutral[50],
  card: colors.neutral[900],
  cardForeground: colors.neutral[50],
  border: colors.neutral[800],
  input: colors.neutral[800],
  primary: colors.primary[500],
  primaryForeground: colors.white,
  secondary: colors.neutral[800],
  secondaryForeground: colors.neutral[100],
  muted: colors.neutral[800],
  mutedForeground: colors.neutral[400],
} as const;

// ============================================================================
// EXPORT THEME OBJECT
// ============================================================================

export const theme = {
  colors,
  spacing,
  typography,
  borderRadius,
  shadows,
  animation,
  gradients,
  buttonTokens,
  inputTokens,
  cardTokens,
  darkModeColors,
} as const;

export default theme;
