/**
 * Loading Spinner Component
 *
 * Reusable loading indicator with customizable size and colors.
 * Use this component to show loading state throughout the app.
 */

import React from 'react'
import {
  View,
  ActivityIndicator,
  Text,
  StyleSheet,
  StyleProp,
  ViewStyle,
} from 'react-native'

// ============================================================================
// TYPES
// ============================================================================

export interface LoadingSpinnerProps {
  /** Size of the spinner - 'small' | 'large' | number (default: 'large') */
  size?: 'small' | 'large' | number
  /** Color of the spinner (default: '#FF6B47') */
  color?: string
  /** Optional message to display below the spinner */
  message?: string
  /** Whether to display in full screen mode (centered in container) */
  fullScreen?: boolean
  /** Custom container style */
  style?: StyleProp<ViewStyle>
  /** Whether the spinner should be visible (default: true) */
  visible?: boolean
  /** Test ID for testing purposes */
  testID?: string
}

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * LoadingSpinner - A reusable loading indicator
 *
 * @example
 * // Basic usage
 * <LoadingSpinner />
 *
 * @example
 * // With message
 * <LoadingSpinner message="Loading posts..." />
 *
 * @example
 * // Full screen overlay
 * <LoadingSpinner fullScreen message="Please wait..." />
 *
 * @example
 * // Custom size and color
 * <LoadingSpinner size="small" color="#FF3B30" />
 */
export function LoadingSpinner({
  size = 'large',
  color = '#FF6B47',
  message,
  fullScreen = false,
  style,
  visible = true,
  testID = 'loading-spinner',
}: LoadingSpinnerProps): JSX.Element | null {
  // Don't render if not visible
  if (!visible) {
    return null
  }

  const containerStyle = fullScreen ? styles.fullScreenContainer : styles.container

  return (
    <View style={[containerStyle, style]} testID={testID}>
      <ActivityIndicator size={size} color={color} testID={`${testID}-indicator`} />
      {message && (
        <Text style={styles.message} testID={`${testID}-message`}>
          {message}
        </Text>
      )}
    </View>
  )
}

// ============================================================================
// PRESET VARIANTS
// ============================================================================

/**
 * Full-screen loading overlay
 */
export function FullScreenLoader({
  message = 'Loading...',
  ...props
}: Omit<LoadingSpinnerProps, 'fullScreen'>): JSX.Element | null {
  return <LoadingSpinner {...props} message={message} fullScreen />
}

/**
 * Inline loading spinner (for buttons, list items, etc.)
 */
export function InlineLoader({
  size = 'small',
  color = '#8E8E93',
  ...props
}: LoadingSpinnerProps): JSX.Element | null {
  return <LoadingSpinner {...props} size={size} color={color} style={styles.inline} />
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  fullScreenContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  message: {
    marginTop: 12,
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
  },
  inline: {
    padding: 0,
    flexDirection: 'row',
  },
})

// ============================================================================
// EXPORTS
// ============================================================================

export default LoadingSpinner
