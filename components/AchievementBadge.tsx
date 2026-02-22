/**
 * AchievementBadge Component
 *
 * Displays an achievement badge with icon, name, and tier color.
 * Shows locked state for unearned achievements and progress bar for partially completed.
 *
 * @example
 * ```tsx
 * <AchievementBadge
 *   achievement={{
 *     id: 'explorer_first_steps',
 *     name: 'First Steps',
 *     icon: 'pin',
 *     tier: 'bronze',
 *     earned: true,
 *   }}
 * />
 * ```
 */

import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import type { AchievementWithStatus } from '../hooks/useAchievements'
import { darkTheme } from '../constants/glassStyles'
import { spacing } from '../constants/theme'

// ============================================================================
// CONSTANTS
// ============================================================================

const TIER_COLORS = {
  bronze: '#CD7F32',
  silver: '#C0C0C0',
  gold: '#FFD700',
}

const TIER_GRADIENTS = {
  bronze: ['#CD7F32', '#A0522D'],
  silver: ['#E8E8E8', '#A0A0A0'],
  gold: ['#FFD700', '#FFA500'],
}

// ============================================================================
// TYPES
// ============================================================================

export interface AchievementBadgeProps {
  achievement: AchievementWithStatus
  size?: 'small' | 'medium' | 'large'
  showProgress?: boolean
  testID?: string
}

// ============================================================================
// COMPONENT
// ============================================================================

export function AchievementBadge({
  achievement,
  size = 'medium',
  showProgress = true,
  testID = 'achievement-badge',
}: AchievementBadgeProps): React.ReactElement {
  const { earned, tier, icon, name, description, progress = 0 } = achievement

  // Size-dependent dimensions
  const dimensions = {
    small: { badge: 64, icon: 28, fontSize: 11 },
    medium: { badge: 80, icon: 36, fontSize: 13 },
    large: { badge: 96, icon: 44, fontSize: 15 },
  }[size]

  const tierColor = TIER_COLORS[tier]
  const tierGradient = TIER_GRADIENTS[tier]

  return (
    <View style={styles.container} testID={testID}>
      {/* Badge Circle */}
      <View style={[styles.badgeContainer, { width: dimensions.badge, height: dimensions.badge }]}>
        {earned ? (
          // Earned badge with tier gradient
          <LinearGradient
            colors={tierGradient}
            style={styles.badgeGradient}
          >
            <View style={styles.badgeContent}>
              <Ionicons
                name={icon as any}
                size={dimensions.icon}
                color="#FFFFFF"
              />
            </View>
          </LinearGradient>
        ) : (
          // Locked badge (grayed out)
          <View style={styles.badgeLocked}>
            <View style={styles.badgeContent}>
              <Ionicons
                name={icon as any}
                size={dimensions.icon}
                color="rgba(255, 255, 255, 0.25)"
              />
              <View style={styles.lockOverlay}>
                <Ionicons name="lock-closed" size={dimensions.icon * 0.4} color="rgba(255, 255, 255, 0.3)" />
              </View>
            </View>
          </View>
        )}

        {/* Progress Ring (for partially completed) */}
        {!earned && showProgress && progress > 0 && (
          <View style={[styles.progressRing, { borderColor: tierColor }]}>
            <View
              style={[
                styles.progressFill,
                {
                  borderColor: tierColor,
                  borderWidth: 3,
                  transform: [{ rotate: `${(progress / 100) * 360}deg` }],
                },
              ]}
            />
          </View>
        )}
      </View>

      {/* Name */}
      <Text
        style={[
          styles.name,
          { fontSize: dimensions.fontSize },
          !earned && styles.nameLocked,
        ]}
        numberOfLines={1}
      >
        {name}
      </Text>

      {/* Progress Percentage (for locked achievements) */}
      {!earned && showProgress && progress > 0 && (
        <Text style={styles.progressText}>{progress}%</Text>
      )}
    </View>
  )
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    width: 100,
  },
  badgeContainer: {
    position: 'relative',
    marginBottom: spacing[2],
  },
  badgeGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 1000,
    overflow: 'hidden',
  },
  badgeLocked: {
    width: '100%',
    height: '100%',
    borderRadius: 1000,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  badgeContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  lockOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderRadius: 1000,
  },
  progressRing: {
    position: 'absolute',
    top: -4,
    left: -4,
    right: -4,
    bottom: -4,
    borderRadius: 1000,
    borderWidth: 3,
    borderColor: 'transparent',
  },
  progressFill: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    borderRadius: 1000,
  },
  name: {
    color: darkTheme.textPrimary,
    fontWeight: '600',
    textAlign: 'center',
    paddingHorizontal: spacing[1],
  },
  nameLocked: {
    color: darkTheme.textMuted,
  },
  progressText: {
    fontSize: 10,
    color: darkTheme.textMuted,
    marginTop: spacing[0.5],
    fontWeight: '500',
  },
})

export default AchievementBadge
