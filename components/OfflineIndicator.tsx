/**
 * Offline Indicator Component
 *
 * A banner component that displays when the device is offline or has no internet.
 * Provides visual feedback about network status and allows retry actions.
 *
 * Features:
 * - Automatic visibility based on network status
 * - Animated slide-in/slide-out
 * - Retry button for connection check
 * - Customizable appearance and messages
 */

import React, { useEffect, useRef } from 'react'
import {
  View,
  Text,
  StyleSheet,
  StyleProp,
  ViewStyle,
  TextStyle,
  TouchableOpacity,
  Animated,
  Dimensions,
} from 'react-native'

import {
  useNetworkStatus,
  getConnectionTypeLabel,
  type NetworkConnectionType,
} from '../hooks/useNetworkStatus'

// ============================================================================
// TYPES
// ============================================================================

/**
 * Position of the offline indicator
 */
export type OfflineIndicatorPosition = 'top' | 'bottom'

/**
 * Variant of the offline indicator
 */
export type OfflineIndicatorVariant = 'error' | 'warning' | 'info'

/**
 * Props for the OfflineIndicator component
 */
export interface OfflineIndicatorProps {
  /** Position of the indicator (default: 'top') */
  position?: OfflineIndicatorPosition
  /** Visual variant (default: 'error') */
  variant?: OfflineIndicatorVariant
  /** Custom message to display when offline */
  message?: string
  /** Whether to show retry button (default: true) */
  showRetryButton?: boolean
  /** Label for retry button (default: 'Retry') */
  retryLabel?: string
  /** Whether to show connection type info (default: false) */
  showConnectionType?: boolean
  /** Whether to auto-hide when connected (default: true) */
  autoHide?: boolean
  /** Animation duration in ms (default: 300) */
  animationDuration?: number
  /** Custom container style */
  style?: StyleProp<ViewStyle>
  /** Custom text style */
  textStyle?: StyleProp<TextStyle>
  /** Callback when retry is pressed */
  onRetry?: () => void
  /** Callback when connection status changes */
  onStatusChange?: (isConnected: boolean) => void
  /** Test ID for testing purposes */
  testID?: string
}

/**
 * Props for controlled OfflineIndicator (when managing visibility externally)
 */
export interface ControlledOfflineIndicatorProps
  extends Omit<OfflineIndicatorProps, 'autoHide'> {
  /** Whether the indicator is visible */
  visible: boolean
  /** Connection type to display (if showConnectionType is true) */
  connectionType?: NetworkConnectionType
}

// ============================================================================
// CONSTANTS
// ============================================================================

const SCREEN_WIDTH = Dimensions.get('window').width

/**
 * Default messages for different states
 */
const DEFAULT_MESSAGES = {
  offline: 'No internet connection',
  connecting: 'Checking connection...',
  slowConnection: 'Connection is slow',
} as const

/**
 * Colors for different variants
 */
const VARIANT_COLORS = {
  error: {
    background: '#FF3B30',
    text: '#FFFFFF',
    button: 'rgba(255, 255, 255, 0.2)',
    buttonText: '#FFFFFF',
  },
  warning: {
    background: '#FF9500',
    text: '#FFFFFF',
    button: 'rgba(255, 255, 255, 0.2)',
    buttonText: '#FFFFFF',
  },
  info: {
    background: '#5856D6',
    text: '#FFFFFF',
    button: 'rgba(255, 255, 255, 0.2)',
    buttonText: '#FFFFFF',
  },
} as const

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * OfflineIndicator - A banner that shows when device is offline
 *
 * @example
 * // Basic usage - auto-manages visibility based on network status
 * <OfflineIndicator />
 *
 * @example
 * // At bottom of screen with warning variant
 * <OfflineIndicator position="bottom" variant="warning" />
 *
 * @example
 * // Custom message with retry callback
 * <OfflineIndicator
 *   message="Unable to connect to server"
 *   onRetry={() => refetchData()}
 * />
 *
 * @example
 * // With connection type info
 * <OfflineIndicator showConnectionType />
 */
export function OfflineIndicator({
  position = 'top',
  variant = 'error',
  message = DEFAULT_MESSAGES.offline,
  showRetryButton = true,
  retryLabel = 'Retry',
  showConnectionType = false,
  autoHide = true,
  animationDuration = 300,
  style,
  textStyle,
  onRetry,
  onStatusChange,
  testID = 'offline-indicator',
}: OfflineIndicatorProps): JSX.Element | null {
  // Network status hook
  const { isConnected, isInternetReachable, type, loading, refresh } =
    useNetworkStatus()

  // Animation value for slide in/out
  const slideAnim = useRef(new Animated.Value(-100)).current

  // Determine if we should show the indicator
  const shouldShow = !isConnected || isInternetReachable === false

  // ---------------------------------------------------------------------------
  // EFFECTS
  // ---------------------------------------------------------------------------

  // Animate in/out based on connection status
  useEffect(() => {
    if (shouldShow) {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: animationDuration,
        useNativeDriver: true,
      }).start()
    } else if (autoHide) {
      Animated.timing(slideAnim, {
        toValue: position === 'top' ? -100 : 100,
        duration: animationDuration,
        useNativeDriver: true,
      }).start()
    }
  }, [shouldShow, autoHide, position, slideAnim, animationDuration])

  // Call status change callback
  useEffect(() => {
    onStatusChange?.(isConnected && isInternetReachable !== false)
  }, [isConnected, isInternetReachable, onStatusChange])

  // ---------------------------------------------------------------------------
  // HANDLERS
  // ---------------------------------------------------------------------------

  const handleRetry = async () => {
    await refresh()
    onRetry?.()
  }

  // ---------------------------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------------------------

  // Don't render at all if hidden and not animating
  if (!shouldShow && autoHide) {
    return null
  }

  const colors = VARIANT_COLORS[variant]

  const containerStyles = [
    styles.container,
    position === 'top' ? styles.containerTop : styles.containerBottom,
    { backgroundColor: colors.background },
    style,
  ]

  const animatedStyle = {
    transform: [
      {
        translateY: slideAnim,
      },
    ],
  }

  const displayMessage = loading ? DEFAULT_MESSAGES.connecting : message
  const connectionLabel = showConnectionType ? getConnectionTypeLabel(type) : null

  return (
    <Animated.View
      style={[containerStyles, animatedStyle]}
      testID={testID}
      accessibilityRole="alert"
      accessibilityLabel={displayMessage}
    >
      <View style={styles.contentContainer}>
        <View style={styles.textContainer}>
          <Text
            style={[styles.message, { color: colors.text }, textStyle]}
            testID={`${testID}-message`}
          >
            {displayMessage}
          </Text>
          {connectionLabel && (
            <Text
              style={[styles.connectionType, { color: colors.text }]}
              testID={`${testID}-connection-type`}
            >
              {connectionLabel}
            </Text>
          )}
        </View>

        {showRetryButton && (
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: colors.button }]}
            onPress={handleRetry}
            disabled={loading}
            activeOpacity={0.7}
            testID={`${testID}-retry-button`}
            accessibilityLabel={retryLabel}
            accessibilityRole="button"
          >
            <Text style={[styles.retryText, { color: colors.buttonText }]}>
              {loading ? '...' : retryLabel}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </Animated.View>
  )
}

// ============================================================================
// CONTROLLED VARIANT
// ============================================================================

/**
 * ControlledOfflineIndicator - Offline indicator with external visibility control
 *
 * Use this when you want to manage the visibility yourself instead of
 * relying on automatic network status detection.
 *
 * @example
 * const [showOffline, setShowOffline] = useState(false)
 *
 * <ControlledOfflineIndicator
 *   visible={showOffline}
 *   message="Server unavailable"
 * />
 */
export function ControlledOfflineIndicator({
  visible,
  connectionType,
  position = 'top',
  variant = 'error',
  message = DEFAULT_MESSAGES.offline,
  showRetryButton = true,
  retryLabel = 'Retry',
  showConnectionType = false,
  animationDuration = 300,
  style,
  textStyle,
  onRetry,
  testID = 'offline-indicator-controlled',
}: ControlledOfflineIndicatorProps): JSX.Element | null {
  // Animation value for slide in/out
  const slideAnim = useRef(new Animated.Value(-100)).current

  // ---------------------------------------------------------------------------
  // EFFECTS
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (visible) {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: animationDuration,
        useNativeDriver: true,
      }).start()
    } else {
      Animated.timing(slideAnim, {
        toValue: position === 'top' ? -100 : 100,
        duration: animationDuration,
        useNativeDriver: true,
      }).start()
    }
  }, [visible, position, slideAnim, animationDuration])

  // ---------------------------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------------------------

  if (!visible) {
    return null
  }

  const colors = VARIANT_COLORS[variant]

  const containerStyles = [
    styles.container,
    position === 'top' ? styles.containerTop : styles.containerBottom,
    { backgroundColor: colors.background },
    style,
  ]

  const animatedStyle = {
    transform: [
      {
        translateY: slideAnim,
      },
    ],
  }

  const connectionLabel = showConnectionType && connectionType
    ? getConnectionTypeLabel(connectionType)
    : null

  return (
    <Animated.View
      style={[containerStyles, animatedStyle]}
      testID={testID}
      accessibilityRole="alert"
      accessibilityLabel={message}
    >
      <View style={styles.contentContainer}>
        <View style={styles.textContainer}>
          <Text
            style={[styles.message, { color: colors.text }, textStyle]}
            testID={`${testID}-message`}
          >
            {message}
          </Text>
          {connectionLabel && (
            <Text
              style={[styles.connectionType, { color: colors.text }]}
              testID={`${testID}-connection-type`}
            >
              {connectionLabel}
            </Text>
          )}
        </View>

        {showRetryButton && (
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: colors.button }]}
            onPress={onRetry}
            activeOpacity={0.7}
            testID={`${testID}-retry-button`}
            accessibilityLabel={retryLabel}
            accessibilityRole="button"
          >
            <Text style={[styles.retryText, { color: colors.buttonText }]}>
              {retryLabel}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </Animated.View>
  )
}

// ============================================================================
// PRESET VARIANTS
// ============================================================================

/**
 * Top-positioned offline indicator (default)
 */
export function TopOfflineIndicator(
  props: Omit<OfflineIndicatorProps, 'position'>
): JSX.Element | null {
  return <OfflineIndicator {...props} position="top" />
}

/**
 * Bottom-positioned offline indicator
 */
export function BottomOfflineIndicator(
  props: Omit<OfflineIndicatorProps, 'position'>
): JSX.Element | null {
  return <OfflineIndicator {...props} position="bottom" />
}

/**
 * Warning-style offline indicator (e.g., for slow connections)
 */
export function SlowConnectionIndicator(
  props: Omit<OfflineIndicatorProps, 'variant' | 'message'>
): JSX.Element | null {
  return (
    <OfflineIndicator
      {...props}
      variant="warning"
      message={DEFAULT_MESSAGES.slowConnection}
    />
  )
}

/**
 * Minimal offline indicator (no retry button, compact)
 */
export function MinimalOfflineIndicator(
  props: Omit<OfflineIndicatorProps, 'showRetryButton'>
): JSX.Element | null {
  return (
    <OfflineIndicator {...props} showRetryButton={false} style={styles.minimal} />
  )
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingVertical: 12,
    zIndex: 1000,
    elevation: 10,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  containerTop: {
    top: 0,
  },
  containerBottom: {
    bottom: 0,
  },
  contentContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  textContainer: {
    flex: 1,
    marginRight: 12,
  },
  message: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'left',
  },
  connectionType: {
    fontSize: 12,
    fontWeight: '400',
    marginTop: 2,
    opacity: 0.8,
  },
  retryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    minWidth: 60,
    alignItems: 'center',
  },
  retryText: {
    fontSize: 14,
    fontWeight: '600',
  },
  minimal: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
})

// ============================================================================
// EXPORTS
// ============================================================================

export default OfflineIndicator
export type {
  OfflineIndicatorPosition,
  OfflineIndicatorVariant,
  OfflineIndicatorProps,
  ControlledOfflineIndicatorProps,
}
