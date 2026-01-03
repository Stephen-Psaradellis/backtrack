/**
 * Button Component
 *
 * Reusable button with multiple variants, sizes, and states.
 * Uses the unified design system colors.
 */

import React, { useCallback } from 'react'
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  StyleProp,
  ViewStyle,
  TextStyle,
  ActivityIndicator,
  View,
} from 'react-native'
import { lightFeedback, warningFeedback } from '../lib/haptics'
import { colors, borderRadius, shadows } from '../constants/theme'

// ============================================================================
// TYPES
// ============================================================================

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
export type ButtonSize = 'small' | 'medium' | 'large'

export interface ButtonProps {
  title: string
  onPress: () => void
  variant?: ButtonVariant
  size?: ButtonSize
  disabled?: boolean
  loading?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  fullWidth?: boolean
  style?: StyleProp<ViewStyle>
  textStyle?: StyleProp<TextStyle>
  testID?: string
  accessibilityLabel?: string
  hapticDisabled?: boolean
}

// ============================================================================
// COMPONENT
// ============================================================================

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  leftIcon,
  rightIcon,
  fullWidth = false,
  style,
  textStyle,
  testID = 'button',
  accessibilityLabel,
  hapticDisabled = false,
}: ButtonProps): JSX.Element {
  const isDisabled = disabled || loading

  const handlePress = useCallback(async () => {
    if (!hapticDisabled) {
      if (variant === 'danger') {
        await warningFeedback()
      } else {
        await lightFeedback()
      }
    }
    onPress()
  }, [hapticDisabled, variant, onPress])

  const containerStyles = [
    styles.container,
    styles[`container_${size}` as keyof typeof styles],
    styles[`container_${variant}` as keyof typeof styles],
    fullWidth && styles.fullWidth,
    isDisabled && styles.containerDisabled,
    isDisabled && styles[`container_${variant}_disabled` as keyof typeof styles],
    style,
  ]

  const textStyles = [
    styles.text,
    styles[`text_${size}` as keyof typeof styles],
    styles[`text_${variant}` as keyof typeof styles],
    isDisabled && styles.textDisabled,
    isDisabled && styles[`text_${variant}_disabled` as keyof typeof styles],
    textStyle,
  ]

  const loadingColor = variant === 'primary' || variant === 'danger'
    ? colors.white
    : colors.primary[500]

  return (
    <TouchableOpacity
      style={containerStyles}
      onPress={handlePress}
      disabled={isDisabled}
      activeOpacity={0.8}
      testID={testID}
      accessibilityLabel={accessibilityLabel || title}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={loadingColor}
          testID={`${testID}-loading`}
        />
      ) : (
        <View style={styles.contentContainer}>
          {leftIcon && <View style={styles.leftIcon}>{leftIcon}</View>}
          <Text style={textStyles} testID={`${testID}-text`}>
            {title}
          </Text>
          {rightIcon && <View style={styles.rightIcon}>{rightIcon}</View>}
        </View>
      )}
    </TouchableOpacity>
  )
}

// ============================================================================
// PRESET VARIANTS
// ============================================================================

export function PrimaryButton(
  props: Omit<ButtonProps, 'variant'>
): JSX.Element {
  return <Button {...props} variant="primary" />
}

export function SecondaryButton(
  props: Omit<ButtonProps, 'variant'>
): JSX.Element {
  return <Button {...props} variant="secondary" />
}

export function OutlineButton(
  props: Omit<ButtonProps, 'variant'>
): JSX.Element {
  return <Button {...props} variant="outline" />
}

export function GhostButton(
  props: Omit<ButtonProps, 'variant'>
): JSX.Element {
  return <Button {...props} variant="ghost" />
}

export function DangerButton(
  props: Omit<ButtonProps, 'variant'>
): JSX.Element {
  return <Button {...props} variant="danger" />
}

export function IconButton({
  icon,
  onPress,
  size = 'medium',
  variant = 'ghost',
  disabled = false,
  testID = 'icon-button',
  accessibilityLabel,
  hapticDisabled = false,
}: {
  icon: React.ReactNode
  onPress: () => void
  size?: ButtonSize
  variant?: ButtonVariant
  disabled?: boolean
  testID?: string
  accessibilityLabel: string
  hapticDisabled?: boolean
}): JSX.Element {
  const handlePress = useCallback(async () => {
    if (!hapticDisabled) {
      await lightFeedback()
    }
    onPress()
  }, [hapticDisabled, onPress])

  const containerStyles = [
    styles.iconButton,
    styles[`iconButton_${size}` as keyof typeof styles],
    styles[`container_${variant}` as keyof typeof styles],
    disabled && styles.containerDisabled,
  ]

  return (
    <TouchableOpacity
      style={containerStyles}
      onPress={handlePress}
      disabled={disabled}
      activeOpacity={0.8}
      testID={testID}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
    >
      {icon}
    </TouchableOpacity>
  )
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  // Container base
  container: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: borderRadius.md,
    ...shadows.native.DEFAULT,
  },
  fullWidth: {
    width: '100%',
  },
  containerDisabled: {
    opacity: 0.6,
    ...shadows.native.sm,
  },

  // Container sizes
  container_small: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    minHeight: 36,
    borderRadius: borderRadius.DEFAULT,
  },
  container_medium: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    minHeight: 48,
    borderRadius: borderRadius.md,
  },
  container_large: {
    paddingVertical: 18,
    paddingHorizontal: 32,
    minHeight: 56,
    borderRadius: borderRadius.lg,
  },

  // Container variants - Using new coral/violet palette
  container_primary: {
    backgroundColor: colors.primary[500],
  },
  container_primary_disabled: {
    backgroundColor: colors.primary[200],
  },
  container_secondary: {
    backgroundColor: colors.neutral[100],
    shadowOpacity: 0.04,
  },
  container_secondary_disabled: {
    backgroundColor: colors.neutral[50],
  },
  container_outline: {
    backgroundColor: colors.transparent,
    borderWidth: 2,
    borderColor: colors.primary[500],
    shadowOpacity: 0,
  },
  container_outline_disabled: {
    borderColor: colors.primary[200],
  },
  container_ghost: {
    backgroundColor: colors.transparent,
    shadowOpacity: 0,
  },
  container_ghost_disabled: {},
  container_danger: {
    backgroundColor: colors.error.main,
  },
  container_danger_disabled: {
    backgroundColor: colors.error.light,
  },

  // Text base
  text: {
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  textDisabled: {
    opacity: 0.8,
  },

  // Text sizes
  text_small: {
    fontSize: 14,
  },
  text_medium: {
    fontSize: 16,
  },
  text_large: {
    fontSize: 18,
  },

  // Text variants
  text_primary: {
    color: colors.white,
  },
  text_primary_disabled: {
    color: colors.white,
  },
  text_secondary: {
    color: colors.neutral[900],
  },
  text_secondary_disabled: {
    color: colors.neutral[500],
  },
  text_outline: {
    color: colors.primary[600],
  },
  text_outline_disabled: {
    color: colors.primary[300],
  },
  text_ghost: {
    color: colors.primary[600],
  },
  text_ghost_disabled: {
    color: colors.primary[300],
  },
  text_danger: {
    color: colors.white,
  },
  text_danger_disabled: {
    color: colors.white,
  },

  // Content container (for icons)
  contentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  leftIcon: {
    marginRight: 10,
  },
  rightIcon: {
    marginLeft: 10,
  },

  // Icon button styles
  iconButton: {
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: borderRadius.DEFAULT,
  },
  iconButton_small: {
    width: 36,
    height: 36,
  },
  iconButton_medium: {
    width: 48,
    height: 48,
  },
  iconButton_large: {
    width: 56,
    height: 56,
  },
})

// ============================================================================
// EXPORTS
// ============================================================================

export default Button
