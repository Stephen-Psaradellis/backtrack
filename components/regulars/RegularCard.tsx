/**
 * RegularCard Component
 *
 * Displays information about a fellow regular at a shared location.
 *
 * @example
 * ```tsx
 * <RegularCard
 *   regular={fellowRegular}
 *   onPress={() => navigateToProfile(regular.fellow_user_id)}
 * />
 * ```
 */

import React from 'react'
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { FellowRegular, LocationRegular } from '../../hooks/useRegulars'
import { Avatar } from 'react-native-bitmoji'
import { darkTheme } from '../../constants/glassStyles'

// ============================================================================
// Types
// ============================================================================

interface RegularCardProps {
  regular: FellowRegular | LocationRegular
  /** Show location name (for FellowRegular type) */
  showLocation?: boolean
  /** Called when card is pressed */
  onPress?: () => void
  /** Custom styles */
  style?: object
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Type guard to check if regular is FellowRegular
 */
function isFellowRegular(
  regular: FellowRegular | LocationRegular
): regular is FellowRegular {
  return 'fellow_user_id' in regular
}

/**
 * Get visibility icon based on setting
 */
function getVisibilityIcon(visibility: string): keyof typeof Ionicons.glyphMap {
  switch (visibility) {
    case 'public':
      return 'globe-outline'
    case 'mutual':
      return 'people-outline'
    case 'hidden':
      return 'eye-off-outline'
    default:
      return 'help-outline'
  }
}

/**
 * Format streak weeks text
 */
function formatWeeksText(weeks: number): string {
  if (weeks === 1) return '1 week'
  return `${weeks} weeks`
}

// ============================================================================
// Component
// ============================================================================

export function RegularCard({
  regular,
  showLocation = false,
  onPress,
  style,
}: RegularCardProps) {
  const displayName = regular.display_name || 'Anonymous'
  const avatar = regular.avatar
  const isVerified = regular.is_verified
  const visibility = regular.visibility

  // Get weeks count based on type
  const weeksCount = isFellowRegular(regular)
    ? regular.shared_weeks
    : regular.weekly_visit_count

  // Get location name if available
  const locationName = isFellowRegular(regular) ? regular.location_name : null

  return (
    <TouchableOpacity
      style={[styles.container, style]}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
      disabled={!onPress}
    >
      {/* Avatar */}
      <View style={styles.avatarContainer}>
        {avatar ? (
          <Avatar config={avatar.config} size="md" />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Ionicons name="person" size={24} color="#9CA3AF" />
          </View>
        )}
        {isVerified && (
          <View style={styles.verifiedBadge}>
            <Ionicons name="checkmark-circle" size={16} color="#3B82F6" />
          </View>
        )}
      </View>

      {/* Info */}
      <View style={styles.infoContainer}>
        <View style={styles.nameRow}>
          <Text style={styles.name} numberOfLines={1}>
            {displayName}
          </Text>
          <Ionicons
            name={getVisibilityIcon(visibility)}
            size={14}
            color="#9CA3AF"
          />
        </View>

        {showLocation && locationName && (
          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={12} color="#6B7280" />
            <Text style={styles.locationText} numberOfLines={1}>
              {locationName}
            </Text>
          </View>
        )}

        <View style={styles.streakRow}>
          <Ionicons name="calendar-outline" size={12} color="#F59E0B" />
          <Text style={styles.streakText}>
            {formatWeeksText(weeksCount)} regular
          </Text>
        </View>
      </View>

      {/* Arrow */}
      {onPress && (
        <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
      )}
    </TouchableOpacity>
  )
}

// ============================================================================
// Compact Variant
// ============================================================================

interface RegularAvatarProps {
  regular: FellowRegular | LocationRegular
  size?: number
  onPress?: () => void
}

export function RegularAvatar({ regular, size = 40, onPress }: RegularAvatarProps) {
  const avatar = regular.avatar
  const isVerified = regular.is_verified

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
      disabled={!onPress}
    >
      <View style={[styles.avatarOnlyContainer, { width: size, height: size }]}>
        {avatar ? (
          <Avatar config={avatar.config} size="sm" />
        ) : (
          <View
            style={[
              styles.avatarOnlyPlaceholder,
              { width: size, height: size, borderRadius: size / 2 },
            ]}
          >
            <Ionicons name="person" size={size * 0.5} color="#9CA3AF" />
          </View>
        )}
        {isVerified && (
          <View style={[styles.verifiedBadgeSmall, { right: -2, bottom: -2 }]}>
            <Ionicons name="checkmark-circle" size={12} color="#3B82F6" />
          </View>
        )}
      </View>
    </TouchableOpacity>
  )
}

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 12,
    padding: 12,
    marginVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifiedBadge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    backgroundColor: darkTheme.background,
    borderRadius: 10,
  },
  infoContainer: {
    flex: 1,
    marginRight: 8,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: darkTheme.textPrimary,
    flex: 1,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  locationText: {
    fontSize: 13,
    color: darkTheme.textMuted,
    flex: 1,
  },
  streakRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  streakText: {
    fontSize: 12,
    color: '#F59E0B',
    fontWeight: '500',
  },
  // Avatar only styles
  avatarOnlyContainer: {
    position: 'relative',
  },
  avatarOnly: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  avatarOnlyPlaceholder: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifiedBadgeSmall: {
    position: 'absolute',
    backgroundColor: darkTheme.background,
    borderRadius: 8,
  },
})

export default RegularCard
