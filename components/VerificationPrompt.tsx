/**
 * VerificationPrompt Component
 *
 * Displays a prompt encouraging non-verified users to complete verification.
 * Shows a banner/card with trust-building message and CTA button.
 *
 * This component should only be shown to non-verified users on their own profile.
 * Verified users or when viewing other users' profiles should not see this prompt.
 *
 * @example
 * ```tsx
 * // Basic usage on profile screen
 * {!profile.is_verified && isOwnProfile && (
 *   <VerificationPrompt
 *     onVerify={() => navigation.navigate('Verification')}
 *   />
 * )}
 *
 * // Compact variant for inline use
 * <VerificationPrompt
 *   variant="compact"
 *   onVerify={handleStartVerification}
 * />
 * ```
 */

import React from 'react'
import {
  View,
  Text,
  StyleSheet,
  StyleProp,
  ViewStyle,
} from 'react-native'
import { SvgXml } from 'react-native-svg'
import { Button } from './Button'

// ============================================================================
// TYPES
// ============================================================================

export type VerificationPromptVariant = 'default' | 'compact'

export interface VerificationPromptProps {
  /** Handler called when user taps the verification CTA button */
  onVerify: () => void
  /** Visual variant (default: 'default') */
  variant?: VerificationPromptVariant
  /** Whether to show loading state on button */
  loading?: boolean
  /** Custom container style */
  style?: StyleProp<ViewStyle>
  /** Test ID for testing purposes */
  testID?: string
}

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Shield icon SVG for verification prompt
 * Uses a shield with checkmark to represent trust/verification
 */
function getShieldIconSvg(): string {
  return `
    <svg viewBox="0 0 24 24" fill="none">
      <path
        d="M12 2L4 6V12C4 16.42 7.49 20.47 12 22C16.51 20.47 20 16.42 20 12V6L12 2Z"
        fill="#3B82F6"
        opacity="0.15"
      />
      <path
        d="M12 2L4 6V12C4 16.42 7.49 20.47 12 22C16.51 20.47 20 16.42 20 12V6L12 2Z"
        stroke="#3B82F6"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <path
        d="M9 12L11 14L15 10"
        stroke="#3B82F6"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
  `
}

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * VerificationPrompt - Encourage users to complete verification
 *
 * @param onVerify - Callback when user taps verification CTA
 * @param variant - Visual variant ('default' | 'compact')
 * @param loading - Whether to show loading state on button
 * @param style - Custom container style
 * @param testID - Test ID for testing purposes
 *
 * @example
 * // On profile screen
 * <VerificationPrompt
 *   onVerify={() => navigation.navigate('Verification')}
 * />
 *
 * @example
 * // Compact variant in a list
 * <VerificationPrompt
 *   variant="compact"
 *   onVerify={handleVerify}
 * />
 */
export function VerificationPrompt({
  onVerify,
  variant = 'default',
  loading = false,
  style,
  testID = 'verification-prompt',
}: VerificationPromptProps): JSX.Element {
  const isCompact = variant === 'compact'

  if (isCompact) {
    return (
      <View style={[styles.compactContainer, style]} testID={testID}>
        <View style={styles.compactContent}>
          <View style={styles.compactIconContainer}>
            <SvgXml xml={getShieldIconSvg()} width={20} height={20} />
          </View>
          <Text style={styles.compactText} testID={`${testID}-text`}>
            Get verified to build trust
          </Text>
        </View>
        <Button
          title="Verify"
          onPress={onVerify}
          size="small"
          variant="primary"
          loading={loading}
          testID={`${testID}-button`}
        />
      </View>
    )
  }

  return (
    <View style={[styles.container, style]} testID={testID}>
      <View style={styles.iconContainer}>
        <SvgXml xml={getShieldIconSvg()} width={48} height={48} />
      </View>
      <Text style={styles.title} testID={`${testID}-title`}>
        Get verified to build trust
      </Text>
      <Text style={styles.message} testID={`${testID}-message`}>
        Complete selfie verification to show others you&apos;re a real person. Verified users get more responses!
      </Text>
      <View style={styles.buttonContainer}>
        <Button
          title="Complete Verification"
          onPress={onVerify}
          variant="primary"
          fullWidth
          loading={loading}
          testID={`${testID}-button`}
        />
      </View>
    </View>
  )
}

// ============================================================================
// PRESET VARIANTS
// ============================================================================

/**
 * Compact verification prompt for inline use
 */
export function CompactVerificationPrompt(
  props: Omit<VerificationPromptProps, 'variant'>
): JSX.Element {
  return <VerificationPrompt {...props} variant="compact" />
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  // Default variant styles
  container: {
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    padding: 20,
    marginHorizontal: 16,
    marginVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  iconContainer: {
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E40AF',
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    color: '#3B82F6',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  buttonContainer: {
    width: '100%',
    maxWidth: 280,
  },

  // Compact variant styles
  compactContainer: {
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  compactContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  compactIconContainer: {
    marginRight: 8,
  },
  compactText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1E40AF',
    flex: 1,
  },
})

// ============================================================================
// EXPORTS
// ============================================================================

export default VerificationPrompt
