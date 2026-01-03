/**
 * StreakBadge Component
 *
 * Displays a compact streak indicator with fire emoji and count.
 * Used to show visit streaks on location cards and in lists.
 *
 * Features:
 * - Three size variants: 'sm', 'md', 'lg'
 * - Shows streak count with type indicator (d/w/m)
 * - Fire emoji for visual impact
 * - Accessible with proper labels
 *
 * @example
 * ```tsx
 * // On a location card (small badge)
 * <StreakBadge count={5} type="weekly" size="sm" />
 *
 * // In a profile section (medium badge)
 * <StreakBadge count={12} type="daily" size="md" />
 *
 * // Featured display (large badge)
 * <StreakBadge count={25} type="monthly" size="lg" showLabel />
 * ```
 */

import React, { memo } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import type { StreakType } from '../../types/streaks'
import { STREAK_TYPE_SHORT_LABELS, STREAK_TYPE_LABELS } from '../../types/streaks'

// ============================================================================
// Types
// ============================================================================

/**
 * Props for the StreakBadge component
 */
export interface StreakBadgeProps {
  /**
   * Current streak count
   */
  count: number

  /**
   * Type of streak (daily, weekly, monthly)
   */
  type: StreakType

  /**
   * Size of the badge
   * - 'sm': Compact for lists and cards
   * - 'md': Default size for most uses
   * - 'lg': Large for featured displays
   * @default 'md'
   */
  size?: 'sm' | 'md' | 'lg'

  /**
   * Whether to show the full label (e.g., "5 days" vs "5d")
   * @default false
   */
  showLabel?: boolean

  /**
   * Test ID for testing purposes
   */
  testID?: string
}

// ============================================================================
// Constants
// ============================================================================

const BADGE_STYLES = {
  sm: {
    container: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 },
    emoji: { fontSize: 10 },
    text: { fontSize: 10, fontWeight: '600' as const },
  },
  md: {
    container: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
    emoji: { fontSize: 12 },
    text: { fontSize: 12, fontWeight: '600' as const },
  },
  lg: {
    container: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
    emoji: { fontSize: 16 },
    text: { fontSize: 14, fontWeight: '700' as const },
  },
} as const

// ============================================================================
// Component
// ============================================================================

/**
 * StreakBadge displays a compact streak indicator
 *
 * @param count - Current streak count
 * @param type - Type of streak (daily, weekly, monthly)
 * @param size - Badge size variant
 * @param showLabel - Whether to show full label
 * @param testID - Test ID for testing
 */
function StreakBadgeComponent({
  count,
  type,
  size = 'md',
  showLabel = false,
  testID = 'streak-badge',
}: StreakBadgeProps) {
  // Don't render if count is 0 or less
  if (count <= 0) {
    return null
  }

  const sizeStyles = BADGE_STYLES[size]
  const label = showLabel
    ? `${count} ${STREAK_TYPE_LABELS[type]}${count !== 1 ? 's' : ''}`
    : `${count}${STREAK_TYPE_SHORT_LABELS[type]}`

  const accessibilityLabel = `${count} ${STREAK_TYPE_LABELS[type]} streak`

  return (
    <View
      style={[styles.container, sizeStyles.container]}
      accessibilityRole="text"
      accessibilityLabel={accessibilityLabel}
      testID={testID}
    >
      <Text style={[styles.emoji, sizeStyles.emoji]}>🔥</Text>
      <Text style={[styles.text, sizeStyles.text]}>{label}</Text>
    </View>
  )
}

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(249, 115, 22, 0.15)', // Orange-ish background
    gap: 2,
  },
  emoji: {
    // Emoji styling handled by size variants
  },
  text: {
    color: '#EA580C', // Orange-600
  },
})

// ============================================================================
// Export
// ============================================================================

/**
 * Memoized StreakBadge for performance optimization
 */
export const StreakBadge = memo(StreakBadgeComponent)

export default StreakBadge
