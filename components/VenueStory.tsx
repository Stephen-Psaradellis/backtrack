/**
 * VenueStory Component
 *
 * Displays a single venue story with user avatar, content, and expiry countdown.
 * Stories are ephemeral 4-hour posts about what's happening at a venue.
 *
 * Features:
 * - User avatar initial (first letter of display name or "A")
 * - Story content text (max 140 characters)
 * - Time ago and expiry countdown
 * - Glass card styling with dark theme
 * - Accessible with proper labels
 *
 * @example
 * ```tsx
 * <VenueStory
 *   story={{
 *     id: '123',
 *     content: 'Great live music tonight!',
 *     created_at: '2024-01-01T20:00:00Z',
 *     expires_at: '2024-01-02T00:00:00Z',
 *     display_name: 'Alice',
 *     is_verified: true,
 *   }}
 *   testID="venue-story-1"
 * />
 * ```
 */

import React, { memo, useMemo } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { VerifiedBadge } from './VerifiedBadge'
import { darkTheme } from '../constants/glassStyles'
import { formatRelativeTime } from './PostCard'

// ============================================================================
// TYPES
// ============================================================================

/**
 * Venue story data structure
 */
export interface VenueStoryData {
  /** Unique ID of the story */
  id: string
  /** Story content (max 140 chars) */
  content: string
  /** When the story was created */
  created_at: string
  /** When the story expires */
  expires_at: string
  /** User's display name (or null) */
  display_name: string | null
  /** Whether the user is verified */
  is_verified: boolean
}

/**
 * Props for VenueStory component
 */
export interface VenueStoryProps {
  /** Story data to display */
  story: VenueStoryData
  /** Test ID for testing */
  testID?: string
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get the user's avatar initial (first letter of display name or "A")
 */
function getAvatarInitial(displayName: string | null): string {
  if (!displayName || displayName.trim().length === 0) {
    return 'A'
  }
  return displayName.trim()[0].toUpperCase()
}

/**
 * Calculate time remaining until expiry
 * Returns formatted string like "3h 45m" or "45m" or "just expired"
 */
function getExpiryCountdown(expiresAt: string): string {
  const now = new Date()
  const expiry = new Date(expiresAt)
  const diffMs = expiry.getTime() - now.getTime()

  // Already expired
  if (diffMs <= 0) {
    return 'expired'
  }

  const diffMinutes = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMinutes / 60)
  const remainingMinutes = diffMinutes % 60

  // Less than 1 hour
  if (diffHours === 0) {
    return `${diffMinutes}m left`
  }

  // 1+ hours
  if (remainingMinutes === 0) {
    return `${diffHours}h left`
  }

  return `${diffHours}h ${remainingMinutes}m left`
}

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * VenueStory displays a compact story card with avatar, content, and expiry
 */
export const VenueStory = memo(function VenueStory({
  story,
  testID = 'venue-story',
}: VenueStoryProps) {
  // ---------------------------------------------------------------------------
  // COMPUTED
  // ---------------------------------------------------------------------------

  const avatarInitial = useMemo(
    () => getAvatarInitial(story.display_name),
    [story.display_name]
  )

  const timeAgo = useMemo(
    () => formatRelativeTime(story.created_at, false),
    [story.created_at]
  )

  const expiryCountdown = useMemo(
    () => getExpiryCountdown(story.expires_at),
    [story.expires_at]
  )

  const accessibilityLabel = useMemo(
    () => {
      let label = `Story: ${story.content}`
      if (story.display_name) {
        label += `, by ${story.display_name}`
      }
      if (story.is_verified) {
        label += ', verified user'
      }
      label += `, posted ${timeAgo}, ${expiryCountdown}`
      return label
    },
    [story.content, story.display_name, story.is_verified, timeAgo, expiryCountdown]
  )

  // ---------------------------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------------------------

  return (
    <View
      style={styles.container}
      accessible={true}
      accessibilityRole="text"
      accessibilityLabel={accessibilityLabel}
      testID={testID}
    >
      {/* Avatar Initial Circle */}
      <View style={styles.avatarCircle} accessible={false}>
        <Text style={styles.avatarText} accessible={false}>
          {avatarInitial}
        </Text>
      </View>

      {/* Content Section */}
      <View style={styles.contentContainer} accessible={false}>
        {/* Header: Display Name + Verified Badge + Time */}
        <View style={styles.header} accessible={false}>
          <View style={styles.nameContainer} accessible={false}>
            <Text style={styles.displayName} numberOfLines={1} accessible={false}>
              {story.display_name || 'Anonymous'}
            </Text>
            {story.is_verified && (
              <VerifiedBadge size="sm" testID={`${testID}-verified`} accessible={false} />
            )}
          </View>
          <Text style={styles.timeAgo} accessible={false}>
            {timeAgo}
          </Text>
        </View>

        {/* Story Content */}
        <Text style={styles.content} accessible={false}>
          {story.content}
        </Text>

        {/* Expiry Countdown Badge */}
        <View style={styles.expiryBadge} accessible={false}>
          <Ionicons
            name="time-outline"
            size={12}
            color={darkTheme.textSecondary}
            style={styles.expiryIcon}
            accessible={false}
          />
          <Text style={styles.expiryText} accessible={false}>
            {expiryCountdown}
          </Text>
        </View>
      </View>
    </View>
  )
})

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: darkTheme.cardBackground,
    borderRadius: 12,
    padding: 12,
    marginRight: 12,
    width: 280,
    borderWidth: 1,
    borderColor: darkTheme.cardBorder,
  },

  // Avatar
  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: darkTheme.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: darkTheme.textPrimary,
  },

  // Content
  contentContainer: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  displayName: {
    fontSize: 14,
    fontWeight: '600',
    color: darkTheme.textPrimary,
    flex: 1,
  },
  timeAgo: {
    fontSize: 12,
    color: darkTheme.textSecondary,
    marginLeft: 8,
  },

  // Story content
  content: {
    fontSize: 14,
    lineHeight: 20,
    color: darkTheme.textPrimary,
    marginBottom: 8,
  },

  // Expiry badge
  expiryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: darkTheme.surfaceElevated,
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  expiryIcon: {
    marginRight: 4,
  },
  expiryText: {
    fontSize: 11,
    fontWeight: '600',
    color: darkTheme.textSecondary,
  },
})
