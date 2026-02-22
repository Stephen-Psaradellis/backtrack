/**
 * TrustProgress Component
 *
 * Displays user trust level progress with visual indicators.
 * Shows current tier, progress bar to next tier, and points status.
 *
 * Features:
 * - Tier badge with shield icon
 * - Animated progress bar
 * - Points display with "X/Y to Next Tier" format
 * - Color-coded by tier level
 * - Dark theme glassmorphism styling
 *
 * @example
 * ```tsx
 * function ProfileScreen() {
 *   const { trustLevel, trustPoints } = useTrustLevel()
 *
 *   return (
 *     <TrustProgress
 *       trustLevel={trustLevel}
 *       trustPoints={trustPoints}
 *       testID="profile-trust-progress"
 *     />
 *   )
 * }
 * ```
 */

import React, { memo } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'

import { TRUST_TIERS, type TrustTier } from '../hooks/useTrustLevel'
import { darkTheme } from '../constants/glassStyles'
import { spacing } from '../constants/theme'

// ============================================================================
// TYPES
// ============================================================================

/**
 * Props for the TrustProgress component
 */
export interface TrustProgressProps {
  /**
   * Current trust level (1-5)
   */
  trustLevel: number

  /**
   * Current trust points
   */
  trustPoints: number

  /**
   * Test ID for testing purposes
   */
  testID?: string
}

// ============================================================================
// UTILITIES
// ============================================================================

/**
 * Get tier information for a given level
 */
function getTierForLevel(level: number): TrustTier {
  return TRUST_TIERS.find((tier) => tier.level === level) || TRUST_TIERS[0]
}

/**
 * Calculate points needed to reach next tier
 */
function getPointsToNextTier(currentPoints: number, currentTier: TrustTier): number {
  if (currentTier.maxPoints === null) {
    return 0
  }

  const nextTier = TRUST_TIERS.find((tier) => tier.level === currentTier.level + 1)
  if (!nextTier) {
    return 0
  }

  return nextTier.minPoints - currentPoints
}

/**
 * Calculate progress percentage to next tier
 */
function getProgressPercent(currentPoints: number, currentTier: TrustTier): number {
  if (currentTier.maxPoints === null) {
    return 100
  }

  const tierRange = currentTier.maxPoints - currentTier.minPoints + 1
  const progressInTier = currentPoints - currentTier.minPoints
  return Math.min(Math.max((progressInTier / tierRange) * 100, 0), 100)
}

/**
 * Get gradient colors for a tier
 */
function getTierGradient(tier: TrustTier): [string, string] {
  const gradients: Record<number, [string, string]> = {
    1: ['rgba(107, 114, 128, 0.2)', 'rgba(107, 114, 128, 0.1)'], // gray
    2: ['rgba(59, 130, 246, 0.2)', 'rgba(59, 130, 246, 0.1)'], // blue
    3: ['rgba(139, 92, 246, 0.2)', 'rgba(139, 92, 246, 0.1)'], // purple
    4: ['rgba(245, 158, 11, 0.2)', 'rgba(245, 158, 11, 0.1)'], // amber
    5: ['rgba(16, 185, 129, 0.2)', 'rgba(16, 185, 129, 0.1)'], // green
  }
  return gradients[tier.level] || gradients[1]
}

/**
 * Get progress bar gradient colors for a tier
 */
function getProgressGradient(tier: TrustTier): [string, string] {
  const gradients: Record<number, [string, string]> = {
    1: ['#6B7280', '#4B5563'], // gray
    2: ['#3B82F6', '#2563EB'], // blue
    3: ['#8B5CF6', '#7C3AED'], // purple
    4: ['#F59E0B', '#D97706'], // amber
    5: ['#10B981', '#059669'], // green
  }
  return gradients[tier.level] || gradients[1]
}

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * TrustProgress displays user trust level progress
 *
 * @param trustLevel - Current trust level (1-5)
 * @param trustPoints - Current trust points
 * @param testID - Test ID for testing purposes
 */
function TrustProgressComponent({ trustLevel, trustPoints, testID = 'trust-progress' }: TrustProgressProps) {
  const tier = getTierForLevel(trustLevel)
  const pointsToNext = getPointsToNextTier(trustPoints, tier)
  const progressPercent = getProgressPercent(trustPoints, tier)
  const isMaxTier = tier.maxPoints === null

  const tierGradient = getTierGradient(tier)
  const progressGradient = getProgressGradient(tier)
  const nextTier = TRUST_TIERS.find((t) => t.level === tier.level + 1)

  return (
    <View style={styles.container} testID={testID}>
      <LinearGradient colors={tierGradient} style={styles.card}>
        {/* Tier Badge and Info */}
        <View style={styles.header}>
          {/* Tier Icon */}
          <View style={[styles.iconContainer, { backgroundColor: `${tier.color}20` }]}>
            <Ionicons name={tier.icon as any} size={24} color={tier.color} />
          </View>

          {/* Tier Info */}
          <View style={styles.tierInfo}>
            <View style={styles.tierTitleRow}>
              <Text style={styles.tierName}>{tier.name}</Text>
              <View style={[styles.levelBadge, { backgroundColor: `${tier.color}30` }]}>
                <Text style={[styles.levelText, { color: tier.color }]}>Level {tier.level}</Text>
              </View>
            </View>
            <Text style={styles.tierDescription}>{tier.description}</Text>
          </View>
        </View>

        {/* Progress Section */}
        <View style={styles.progressSection}>
          {/* Points Display */}
          <View style={styles.pointsRow}>
            <Text style={styles.pointsLabel}>Trust Points</Text>
            <Text style={styles.pointsValue}>
              {isMaxTier ? (
                <Text style={[styles.maxTierText, { color: tier.color }]}>{trustPoints} points</Text>
              ) : (
                <>
                  <Text style={styles.currentPoints}>{trustPoints}</Text>
                  <Text style={styles.pointsSeparator}>/</Text>
                  <Text style={styles.nextPoints}>{nextTier?.minPoints || 0}</Text>
                  <Text style={styles.toNextText}> to {nextTier?.name || 'Next Tier'}</Text>
                </>
              )}
            </Text>
          </View>

          {/* Progress Bar */}
          {!isMaxTier && (
            <View style={styles.progressBarContainer}>
              <View style={styles.progressBarTrack}>
                <LinearGradient
                  colors={progressGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[styles.progressBarFill, { width: `${progressPercent}%` }]}
                >
                  <View style={styles.progressBarShine} />
                </LinearGradient>
              </View>
              <Text style={styles.progressText}>{Math.round(progressPercent)}%</Text>
            </View>
          )}

          {/* Points to Next Tier */}
          {!isMaxTier && pointsToNext > 0 && (
            <Text style={styles.pointsToNext}>{pointsToNext} points to next tier</Text>
          )}

          {/* Max Tier Message */}
          {isMaxTier && (
            <View style={styles.maxTierBadge}>
              <Ionicons name="trophy" size={16} color={tier.color} />
              <Text style={[styles.maxTierMessage, { color: tier.color }]}>Maximum tier reached!</Text>
            </View>
          )}
        </View>
      </LinearGradient>
    </View>
  )
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  card: {
    padding: spacing[5],
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing[4],
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing[3],
  },
  tierInfo: {
    flex: 1,
  },
  tierTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing[1],
  },
  tierName: {
    fontSize: 18,
    fontWeight: '700',
    color: darkTheme.textPrimary,
  },
  levelBadge: {
    paddingHorizontal: spacing[2.5],
    paddingVertical: spacing[1],
    borderRadius: 12,
  },
  levelText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tierDescription: {
    fontSize: 13,
    color: darkTheme.textMuted,
    lineHeight: 18,
  },
  progressSection: {
    gap: spacing[3],
  },
  pointsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pointsLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: darkTheme.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  pointsValue: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  currentPoints: {
    fontSize: 16,
    fontWeight: '700',
    color: darkTheme.textPrimary,
  },
  pointsSeparator: {
    fontSize: 14,
    fontWeight: '400',
    color: darkTheme.textMuted,
    marginHorizontal: spacing[1],
  },
  nextPoints: {
    fontSize: 14,
    fontWeight: '600',
    color: darkTheme.textSecondary,
  },
  toNextText: {
    fontSize: 13,
    color: darkTheme.textMuted,
    marginLeft: spacing[1],
  },
  maxTierText: {
    fontSize: 16,
    fontWeight: '700',
  },
  progressBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  progressBarTrack: {
    flex: 1,
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
    position: 'relative',
    minWidth: 4,
  },
  progressBarShine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '50%',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '700',
    color: darkTheme.textSecondary,
    minWidth: 36,
    textAlign: 'right',
  },
  pointsToNext: {
    fontSize: 12,
    color: darkTheme.textMuted,
    textAlign: 'center',
  },
  maxTierBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    paddingVertical: spacing[2],
  },
  maxTierMessage: {
    fontSize: 13,
    fontWeight: '600',
  },
})

/**
 * Memoized TrustProgress for performance optimization
 * Only re-renders when props change
 */
export const TrustProgress = memo(TrustProgressComponent)
