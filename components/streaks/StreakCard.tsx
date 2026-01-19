/**
 * StreakCard Component
 *
 * Displays detailed streak information for a location.
 * Shows current streak, longest streak, and total visits.
 *
 * Features:
 * - Displays location name and address
 * - Shows all streak types (daily, weekly, monthly)
 * - Highlights current streaks with fire emoji
 * - Shows personal best (longest streak)
 * - Compact or expanded display modes
 *
 * @example
 * ```tsx
 * // Basic usage
 * <StreakCard streak={streakData} />
 *
 * // Compact mode for lists
 * <StreakCard streak={streakData} compact />
 *
 * // With press handler
 * <StreakCard streak={streakData} onPress={() => navigateToLocation()} />
 * ```
 */

import React, { memo } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, type ViewStyle } from 'react-native'
import type { LocationStreakWithDetails, StreakType } from '../../types/streaks'
import { STREAK_TYPE_LABELS } from '../../types/streaks'
import { StreakBadge } from './StreakBadge'
import { darkTheme } from '../../constants/glassStyles'

// ============================================================================
// Types
// ============================================================================

/**
 * Props for the StreakCard component
 */
export interface StreakCardProps {
  /**
   * Streak data with location details
   */
  streak: LocationStreakWithDetails

  /**
   * Whether to use compact display mode
   * @default false
   */
  compact?: boolean

  /**
   * Callback when card is pressed
   */
  onPress?: () => void

  /**
   * Additional container style
   */
  style?: ViewStyle

  /**
   * Test ID for testing purposes
   */
  testID?: string
}

/**
 * Props for displaying all streaks at a location
 */
export interface LocationStreaksCardProps {
  /**
   * Location name
   */
  locationName: string

  /**
   * Location address
   */
  locationAddress?: string | null

  /**
   * All streaks for this location (daily, weekly, monthly)
   */
  streaks: LocationStreakWithDetails[]

  /**
   * Whether to use compact display mode
   * @default false
   */
  compact?: boolean

  /**
   * Callback when card is pressed
   */
  onPress?: () => void

  /**
   * Additional container style
   */
  style?: ViewStyle

  /**
   * Test ID for testing purposes
   */
  testID?: string
}

// ============================================================================
// Helper Components
// ============================================================================

/**
 * Single streak type row
 */
const StreakRow = memo(function StreakRow({
  type,
  current,
  longest,
  total,
}: {
  type: StreakType
  current: number
  longest: number
  total: number
}) {
  const typeLabel = STREAK_TYPE_LABELS[type]

  return (
    <View style={rowStyles.container}>
      <View style={rowStyles.labelContainer}>
        <Text style={rowStyles.typeLabel}>{typeLabel.charAt(0).toUpperCase() + typeLabel.slice(1)}</Text>
        {current > 0 && <StreakBadge count={current} type={type} size="sm" />}
      </View>
      <View style={rowStyles.statsContainer}>
        <View style={rowStyles.stat}>
          <Text style={rowStyles.statValue}>{longest}</Text>
          <Text style={rowStyles.statLabel}>best</Text>
        </View>
        <View style={rowStyles.stat}>
          <Text style={rowStyles.statValue}>{total}</Text>
          <Text style={rowStyles.statLabel}>total</Text>
        </View>
      </View>
    </View>
  )
})

const rowStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  typeLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: darkTheme.textSecondary,
    minWidth: 60,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 16,
  },
  stat: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '600',
    color: darkTheme.textPrimary,
  },
  statLabel: {
    fontSize: 10,
    color: darkTheme.textMuted,
    textTransform: 'uppercase',
  },
})

// ============================================================================
// Main Component
// ============================================================================

/**
 * StreakCard displays detailed streak info for a single streak type
 */
function StreakCardComponent({
  streak,
  compact = false,
  onPress,
  style,
  testID = 'streak-card',
}: StreakCardProps) {
  const Container = onPress ? TouchableOpacity : View

  return (
    <Container
      style={[styles.container, compact && styles.containerCompact, style]}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole={onPress ? 'button' : 'none'}
      testID={testID}
    >
      {/* Header with location info */}
      <View style={styles.header}>
        <View style={styles.locationInfo}>
          <Text style={styles.locationName} numberOfLines={1}>
            {streak.location_name}
          </Text>
          {streak.location_address && !compact && (
            <Text style={styles.locationAddress} numberOfLines={1}>
              {streak.location_address}
            </Text>
          )}
        </View>
        <StreakBadge
          count={streak.current_streak}
          type={streak.streak_type}
          size={compact ? 'sm' : 'md'}
        />
      </View>

      {/* Stats */}
      {!compact && (
        <View style={styles.stats}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{streak.current_streak}</Text>
            <Text style={styles.statLabel}>Current</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{streak.longest_streak}</Text>
            <Text style={styles.statLabel}>Best</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{streak.total_visits}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
        </View>
      )}
    </Container>
  )
}

/**
 * LocationStreaksCard displays all streak types for a location
 */
export function LocationStreaksCard({
  locationName,
  locationAddress,
  streaks,
  compact = false,
  onPress,
  style,
  testID = 'location-streaks-card',
}: LocationStreaksCardProps) {
  const Container = onPress ? TouchableOpacity : View

  // Get streak data by type
  const getStreakByType = (type: StreakType) =>
    streaks.find((s) => s.streak_type === type)

  const dailyStreak = getStreakByType('daily')
  const weeklyStreak = getStreakByType('weekly')
  const monthlyStreak = getStreakByType('monthly')

  // Find the best current streak for the header badge
  const bestCurrentStreak = streaks.reduce(
    (best, current) =>
      current.current_streak > (best?.current_streak || 0) ? current : best,
    null as LocationStreakWithDetails | null
  )

  return (
    <Container
      style={[styles.container, style]}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole={onPress ? 'button' : 'none'}
      testID={testID}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.locationInfo}>
          <Text style={styles.locationName} numberOfLines={1}>
            {locationName}
          </Text>
          {locationAddress && !compact && (
            <Text style={styles.locationAddress} numberOfLines={1}>
              {locationAddress}
            </Text>
          )}
        </View>
        {bestCurrentStreak && bestCurrentStreak.current_streak > 0 && (
          <StreakBadge
            count={bestCurrentStreak.current_streak}
            type={bestCurrentStreak.streak_type}
            size="md"
          />
        )}
      </View>

      {/* Streak Rows */}
      {!compact && (
        <View style={styles.streakRows}>
          {dailyStreak && (
            <StreakRow
              type="daily"
              current={dailyStreak.current_streak}
              longest={dailyStreak.longest_streak}
              total={dailyStreak.total_visits}
            />
          )}
          {weeklyStreak && (
            <StreakRow
              type="weekly"
              current={weeklyStreak.current_streak}
              longest={weeklyStreak.longest_streak}
              total={weeklyStreak.total_visits}
            />
          )}
          {monthlyStreak && (
            <StreakRow
              type="monthly"
              current={monthlyStreak.current_streak}
              longest={monthlyStreak.longest_streak}
              total={monthlyStreak.total_visits}
            />
          )}
        </View>
      )}
    </Container>
  )
}

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  containerCompact: {
    padding: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  locationInfo: {
    flex: 1,
    marginRight: 12,
  },
  locationName: {
    fontSize: 16,
    fontWeight: '600',
    color: darkTheme.textPrimary,
  },
  locationAddress: {
    fontSize: 13,
    color: darkTheme.textMuted,
    marginTop: 2,
  },
  stats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: darkTheme.textPrimary,
  },
  statLabel: {
    fontSize: 11,
    color: darkTheme.textMuted,
    marginTop: 2,
    textTransform: 'uppercase',
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  streakRows: {
    marginTop: 12,
  },
})

// ============================================================================
// Export
// ============================================================================

/**
 * Memoized StreakCard for performance optimization
 */
export const StreakCard = memo(StreakCardComponent)

export default StreakCard
