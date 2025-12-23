/**
 * Button Component
 *
 * Reusable button with multiple variants, sizes, and states.
 * Provides a consistent button experience throughout the app.
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

// ============================================================================
// TYPES
// ============================================================================

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
export type ButtonSize = 'small' | 'medium' | 'large'

export interface ButtonProps {
  /** Button text */
  title: string
  /** Press handler */
  onPress: () => void
  /** Visual variant (default: 'primary') */
  variant?: ButtonVariant
  /** Button size (default: 'medium') */
  size?: ButtonSize
  /** Whether the button is disabled */
  disabled?: boolean
  /** Whether to show loading state */
  loading?: boolean
  /** Icon to display before the title */
  leftIcon?: React.ReactNode
  /** Icon to display after the title */
  rightIcon?: React.ReactNode
  /** Whether the button should fill its container width */
  fullWidth?: boolean
  /** Custom container style */
  style?: StyleProp<ViewStyle>
  /** Custom text style */
  textStyle?: StyleProp<TextStyle>
  /** Test ID for testing purposes */
  testID?: string
  /** Accessibility label */
  accessibilityLabel?: string
  /** Whether to disable haptic feedback on press (default: false) */
  hapticDisabled?: boolean
}

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * Button - A customizable button component
 *
 * @example
 * // Primary button (default)
 * <Button title="Submit" onPress={handleSubmit} />
 *
 * @example
 * // Outline button with loading
 * <Button
 *   title="Save"
 *   variant="outline"
 *   loading={isLoading}
 *   onPress={handleSave}
 * />
 *
 * @example
 * // Danger button (for destructive actions)
 * <Button
 *   title="Delete"
 *   variant="danger"
 *   onPress={handleDelete}
 * />
 *
 * @example
 * // Full width button
 * <Button title="Continue" fullWidth onPress={handleContinue} />
 */
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
  // Determine if button should be interactive
  const isDisabled = disabled || loading

  // Wrap onPress to trigger haptic feedback before executing callback
  const handlePress = useCallback(async () => {
    if (!hapticDisabled) {
      // Danger variant uses warning feedback, all others use light feedback
      if (variant === 'danger') {
        await warningFeedback()
      } else {
        await lightFeedback()
      }
    }
    onPress()
  }, [hapticDisabled, variant, onPress])

  // Get styles based on variant and size
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

  // Get loading indicator color based on variant
  const loadingColor = variant === 'primary' || variant === 'danger' ? '#FFFFFF' : '#007AFF'

  return (
    <TouchableOpacity
      style={containerStyles}
      onPress={handlePress}
      disabled={isDisabled}
      activeOpacity={0.7}
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

/**
 * Primary action button
 */
export function PrimaryButton(
  props: Omit<ButtonProps, 'variant'>
): JSX.Element {
  return <Button {...props} variant="primary" />
}

/**
 * Secondary action button
 */
export function SecondaryButton(
  props: Omit<ButtonProps, 'variant'>
): JSX.Element {
  return <Button {...props} variant="secondary" />
}

/**
 * Outline button
 */
export function OutlineButton(
  props: Omit<ButtonProps, 'variant'>
): JSX.Element {
  return <Button {...props} variant="outline" />
}

/**
 * Ghost/text button (minimal styling)
 */
export function GhostButton(
  props: Omit<ButtonProps, 'variant'>
): JSX.Element {
  return <Button {...props} variant="ghost" />
}

/**
 * Danger button (for destructive actions)
 */
export function DangerButton(
  props: Omit<ButtonProps, 'variant'>
): JSX.Element {
  return <Button {...props} variant="danger" />
}

/**
 * Icon-only button
 */
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
  /** Whether to disable haptic feedback on press (default: false) */
  hapticDisabled?: boolean
}): JSX.Element {
  // Wrap onPress to trigger haptic feedback before executing callback
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
      activeOpacity={0.7}
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
    borderRadius: 10,
  },
  fullWidth: {
    width: '100%',
  },
  containerDisabled: {
    opacity: 0.5,
  },

  // Container sizes
  container_small: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    minHeight: 32,
  },
  container_medium: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    minHeight: 44,
  },
  container_large: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    minHeight: 52,
  },

  // Container variants
  container_primary: {
    backgroundColor: '#007AFF',
  },
  container_primary_disabled: {
    backgroundColor: '#B0D4FF',
  },
  container_secondary: {
    backgroundColor: '#E5E5EA',
  },
  container_secondary_disabled: {
    backgroundColor: '#F2F2F7',
  },
  container_outline: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: '#007AFF',
  },
  container_outline_disabled: {
    borderColor: '#B0D4FF',
  },
  container_ghost: {
    backgroundColor: 'transparent',
  },
  container_ghost_disabled: {},
  container_danger: {
    backgroundColor: '#FF3B30',
  },
  container_danger_disabled: {
    backgroundColor: '#FFB0AB',
  },

  // Text base
  text: {
    fontWeight: '600',
    textAlign: 'center',
  },
  textDisabled: {
    opacity: 0.7,
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
    color: '#FFFFFF',
  },
  text_primary_disabled: {
    color: '#FFFFFF',
  },
  text_secondary: {
    color: '#000000',
  },
  text_secondary_disabled: {
    color: '#8E8E93',
  },
  text_outline: {
    color: '#007AFF',
  },
  text_outline_disabled: {
    color: '#B0D4FF',
  },
  text_ghost: {
    color: '#007AFF',
  },
  text_ghost_disabled: {
    color: '#B0D4FF',
  },
  text_danger: {
    color: '#FFFFFF',
  },
  text_danger_disabled: {
    color: '#FFFFFF',
  },

  // Content container (for icons)
  contentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  leftIcon: {
    marginRight: 8,
  },
  rightIcon: {
    marginLeft: 8,
  },

  // Icon button styles
  iconButton: {
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  iconButton_small: {
    width: 32,
    height: 32,
  },
  iconButton_medium: {
    width: 44,
    height: 44,
  },
  iconButton_large: {
    width: 52,
    height: 52,
  },
})

// ============================================================================
// EXPORTS
// ============================================================================

export default Button