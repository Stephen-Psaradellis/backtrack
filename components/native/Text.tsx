/**
 * Native Text Component with Variant System
 *
 * A wrapper around React Native's Text component with predefined typography variants
 * following the Love-Ledger design system.
 *
 * @example
 * ```tsx
 * <Text variant="heading">Welcome Back</Text>
 * <Text variant="body" color={theme.colors.primary[500]}>Custom color</Text>
 * <Text variant="caption" align="center" numberOfLines={2}>Truncated text</Text>
 * ```
 */

import React from 'react';
import { Text as RNText, TextProps as RNTextProps, TextStyle } from 'react-native';
import { colors, typography } from '../../constants/theme';

// ============================================================================
// TYPES
// ============================================================================

export type TextVariant =
  | 'hero'
  | 'heading'
  | 'subheading'
  | 'body'
  | 'bodySmall'
  | 'caption'
  | 'label'
  | 'overline';

export interface TextProps extends Omit<RNTextProps, 'style'> {
  /**
   * Typography variant - defines size, weight, line height, and default color
   * @default 'body'
   */
  variant?: TextVariant;

  /**
   * Override the variant's default text color
   */
  color?: string;

  /**
   * Text alignment
   */
  align?: 'left' | 'center' | 'right' | 'justify';

  /**
   * Number of lines before truncation
   */
  numberOfLines?: number;

  /**
   * Custom styles (merged with variant styles)
   */
  style?: RNTextProps['style'];
}

// ============================================================================
// VARIANT STYLES
// ============================================================================

const variantStyles: Record<TextVariant, TextStyle> = {
  hero: {
    fontSize: typography.fontSize['5xl'],
    fontWeight: typography.fontWeight.bold,
    lineHeight: typography.fontSize['5xl'] * typography.lineHeight.tight,
    color: colors.text.primary,
    fontFamily: typography.fontFamily.display,
  },
  heading: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: typography.fontWeight.bold,
    lineHeight: typography.fontSize['2xl'] * typography.lineHeight.tight,
    color: colors.text.primary,
    fontFamily: typography.fontFamily.display,
  },
  subheading: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    lineHeight: typography.fontSize.lg * typography.lineHeight.normal,
    color: colors.text.primary,
    fontFamily: typography.fontFamily.displayMedium,
  },
  body: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.normal,
    lineHeight: typography.fontSize.base * typography.lineHeight.normal,
    color: colors.text.primary,
  },
  bodySmall: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.normal,
    lineHeight: typography.fontSize.sm * typography.lineHeight.normal,
    color: colors.text.secondary,
  },
  caption: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.normal,
    lineHeight: typography.fontSize.xs * typography.lineHeight.normal,
    color: colors.text.muted,
  },
  label: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    lineHeight: typography.fontSize.sm * typography.lineHeight.tight,
    color: colors.text.secondary,
  },
  overline: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
    lineHeight: typography.fontSize.xs * typography.lineHeight.tight,
    color: colors.text.muted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontFamily: typography.fontFamily.displayMedium,
  },
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Determines if a variant should have semantic header role
 */
const isHeadingVariant = (variant?: TextVariant): boolean => {
  return variant === 'heading' || variant === 'subheading';
};

// ============================================================================
// COMPONENT
// ============================================================================

export const Text = React.forwardRef<RNText, TextProps>(
  (
    {
      variant = 'body',
      color,
      align,
      numberOfLines,
      style,
      children,
      ...restProps
    },
    ref
  ) => {
    // Build combined styles
    const combinedStyle: TextStyle = {
      ...variantStyles[variant],
      ...(color && { color }),
      ...(align && { textAlign: align }),
    };

    // Add accessibility role for heading variants
    const accessibilityProps = isHeadingVariant(variant)
      ? { accessibilityRole: 'header' as const }
      : {};

    return (
      <RNText
        ref={ref}
        style={[combinedStyle, style]}
        numberOfLines={numberOfLines}
        {...accessibilityProps}
        {...restProps}
      >
        {children}
      </RNText>
    );
  }
);

Text.displayName = 'Text';

// ============================================================================
// EXPORTS
// ============================================================================

export default Text;
