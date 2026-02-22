/**
 * Social Login Button Component
 *
 * Reusable button component for social authentication providers (Apple, Google).
 * Features platform-specific styling, press animations, and proper branding.
 *
 * Design:
 * - Apple: Black background, Apple logo, "Continue with Apple"
 * - Google: White background with dark border, Google "G" logo, "Continue with Google"
 * - Press animations using Animated API
 * - Loading states with spinner
 * - Proper accessibility labels
 */

import React, { useRef } from 'react'
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  View,
  Animated,
  Image,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { lightFeedback } from '../lib/haptics'
import { darkTheme } from '../constants/glassStyles'
import { spacing, borderRadius } from '../constants/theme'

// ============================================================================
// TYPES
// ============================================================================

export type SocialProvider = 'apple' | 'google'

export interface SocialLoginButtonProps {
  provider: SocialProvider
  onPress: () => void
  loading?: boolean
  disabled?: boolean
  testID?: string
}

// ============================================================================
// CONSTANTS
// ============================================================================

const PROVIDER_CONFIG = {
  apple: {
    label: 'Continue with Apple',
    backgroundColor: '#000000',
    textColor: '#FFFFFF',
    icon: 'logo-apple',
    accessibilityLabel: 'Sign in with Apple',
  },
  google: {
    label: 'Continue with Google',
    backgroundColor: '#FFFFFF',
    textColor: '#1F1F1F',
    icon: 'logo-google',
    accessibilityLabel: 'Sign in with Google',
  },
} as const

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * SocialLoginButton Component
 *
 * Platform-branded button for social authentication.
 * Handles press animations, loading states, and accessibility.
 *
 * @example
 * ```tsx
 * <SocialLoginButton
 *   provider="apple"
 *   onPress={handleAppleSignIn}
 *   loading={appleLoading}
 * />
 * ```
 */
export function SocialLoginButton({
  provider,
  onPress,
  loading = false,
  disabled = false,
  testID = `social-login-${provider}`,
}: SocialLoginButtonProps): React.JSX.Element {
  // ---------------------------------------------------------------------------
  // ANIMATION
  // ---------------------------------------------------------------------------

  const scaleAnim = useRef(new Animated.Value(1)).current

  // ---------------------------------------------------------------------------
  // HANDLERS
  // ---------------------------------------------------------------------------

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.97,
      tension: 300,
      friction: 10,
      useNativeDriver: true,
    }).start()
  }

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      tension: 300,
      friction: 10,
      useNativeDriver: true,
    }).start()
  }

  const handlePress = async () => {
    if (loading || disabled) {
      return
    }

    await lightFeedback()
    onPress()
  }

  // ---------------------------------------------------------------------------
  // CONFIG
  // ---------------------------------------------------------------------------

  const config = PROVIDER_CONFIG[provider]
  const isDisabled = disabled || loading

  // ---------------------------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------------------------

  return (
    <Animated.View
      style={[
        {
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      <TouchableOpacity
        style={[
          styles.container,
          {
            backgroundColor: config.backgroundColor,
            borderColor: provider === 'google' ? darkTheme.cardBorder : config.backgroundColor,
          },
          isDisabled && styles.disabled,
        ]}
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={isDisabled}
        activeOpacity={0.8}
        testID={testID}
        accessibilityLabel={config.accessibilityLabel}
        accessibilityRole="button"
        accessibilityState={{ disabled: isDisabled, busy: loading }}
      >
        {loading ? (
          <ActivityIndicator
            size="small"
            color={config.textColor}
            testID={`${testID}-loading`}
          />
        ) : (
          <View style={styles.content}>
            <Ionicons
              name={config.icon as any}
              size={20}
              color={config.textColor}
              style={styles.icon}
            />
            <Text
              style={[
                styles.text,
                { color: config.textColor },
              ]}
              numberOfLines={1}
            >
              {config.label}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  )
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    height: 48,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[4],
    marginBottom: spacing[3],
  },
  disabled: {
    opacity: 0.6,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    marginRight: spacing[2.5],
  },
  text: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
})

// ============================================================================
// EXPORTS
// ============================================================================

export default SocialLoginButton
