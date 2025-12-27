/**
 * VerifiedBadge Component
 *
 * Displays a verification badge (checkmark icon) for verified users.
 * This badge is rendered next to usernames across the app to indicate
 * that a user has completed the selfie verification process.
 *
 * Features:
 * - Three size variants: 'sm', 'md', 'lg'
 * - Accessible with proper accessibilityLabel
 * - Blue checkmark icon following design system colors
 *
 * The verification status is always server-authoritative - this component
 * only handles display, never the verification state itself.
 *
 * @example
 * ```tsx
 * // In a post card (small badge)
 * {profile.is_verified && <VerifiedBadge size="sm" />}
 *
 * // In a user profile (medium badge)
 * {user.is_verified && <VerifiedBadge size="md" />}
 *
 * // In a featured section (large badge)
 * {user.is_verified && <VerifiedBadge size="lg" />}
 * ```
 */

import React, { memo } from 'react'
import { View, StyleSheet } from 'react-native'
import { SvgXml } from 'react-native-svg'

/**
 * Props for the VerifiedBadge component
 */
export interface VerifiedBadgeProps {
  /**
   * Size of the badge
   * - 'sm': 16px - For use in lists, post cards, conversation items
   * - 'md': 20px - For use in profile headers, chat headers
   * - 'lg': 24px - For use in featured/prominent displays
   * @default 'md'
   */
  size?: 'sm' | 'md' | 'lg'

  /**
   * Test ID for testing purposes
   */
  testID?: string
}

/**
 * Size mappings for the badge
 */
const BADGE_SIZES = {
  sm: 16,
  md: 20,
  lg: 24,
} as const

/**
 * Generate SVG string for the verified checkmark badge
 * Uses a filled blue circle background with a white checkmark
 */
function getVerifiedBadgeSvg(): string {
  return `
    <svg viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="12" fill="#3B82F6" />
      <path
        d="M7.5 12.5L10.5 15.5L16.5 9.5"
        stroke="white"
        stroke-width="2.5"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
  `
}

/**
 * VerifiedBadge displays a verification indicator for verified users
 *
 * @param size - Badge size variant ('sm' | 'md' | 'lg')
 * @param testID - Test ID for testing purposes
 */
function VerifiedBadgeComponent({
  size = 'md',
  testID = 'verified-badge',
}: VerifiedBadgeProps) {
  const badgeSize = BADGE_SIZES[size]

  return (
    <View
      style={styles.container}
      accessibilityRole="image"
      accessibilityLabel="Verified user"
      testID={testID}
    >
      <SvgXml xml={getVerifiedBadgeSvg()} width={badgeSize} height={badgeSize} />
    </View>
  )
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flexShrink: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
})

/**
 * Memoized VerifiedBadge for performance optimization
 * Only re-renders when props change
 */
export const VerifiedBadge = memo(VerifiedBadgeComponent)
