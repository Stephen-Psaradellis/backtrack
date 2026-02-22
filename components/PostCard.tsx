/**
 * PostCard Component
 *
 * Displays a ledger post with avatar, note preview, location, and timestamp.
 * Used in the LedgerScreen to show "missed connection" posts at a location.
 *
 * Features:
 * - Shows target avatar using AvatarPreview component
 * - Displays truncated note preview
 * - Shows location name and relative timestamp
 * - Optional match indicator with score and color coding
 * - Built-in report functionality on long press
 * - Compact mode for denser list displays
 *
 * @example
 * ```tsx
 * import { PostCard } from 'components/PostCard'
 *
 * // Basic usage
 * <PostCard
 *   post={post}
 *   onPress={(post) => navigation.navigate('PostDetail', { postId: post.id })}
 * />
 *
 * // With producer profile for verification badge
 * <PostCard
 *   post={post}
 *   producerProfile={producerProfile}
 *   onPress={handlePress}
 * />
 *
 * // With PostWithDetails (includes producer profile)
 * <PostCard
 *   post={postWithDetails}  // { ...post, producer: Profile, location: Location }
 *   onPress={handlePress}
 * />
 *
 * // With match indicator
 * <PostCard
 *   post={post}
 *   matchScore={75}
 *   isMatch={true}
 *   onPress={handlePress}
 * />
 *
 * // With custom long press handler (disables built-in reporting)
 * <PostCard
 *   post={post}
 *   onPress={handlePress}
 *   onLongPress={(post) => showCustomOptions(post)}
 * />
 *
 * // Disable built-in reporting
 * <PostCard
 *   post={post}
 *   onPress={handlePress}
 *   enableReporting={false}
 * />
 * ```
 */

import React, { memo, useCallback, useState, useMemo } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ViewStyle,
  Alert,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { ReportPostModal } from './ReportModal'
import { Avatar } from 'react-native-bitmoji'
import { VerifiedBadge } from './VerifiedBadge'
import { PressableScale } from './native/PressableScale'
import { PostReactions } from './PostReactions'
import { formatSightingTime, parseDate } from '../utils/dateTime'
import { darkTheme } from '../constants/glassStyles'
import { useAuthState } from '../contexts/AuthContext'
import type { Post, PostWithDetails, Location, Profile } from '../types/database'

// ============================================================================
// TYPES
// ============================================================================

/**
 * Props for the PostCard component
 */
export interface PostCardProps {
  /**
   * Post data to display
   * Can be a basic Post or PostWithDetails (with location expanded)
   */
  post: Post | PostWithDetails

  /**
   * Optional location data (if not included in post)
   * Used when post is not PostWithDetails
   */
  location?: Location

  /**
   * Optional producer profile data (if not included in post)
   * Used when post is not PostWithDetails
   * Includes is_verified status for displaying verification badge
   */
  producerProfile?: Pick<Profile, 'id' | 'is_verified' | 'display_name' | 'username'>

  /**
   * Match score (0-100) if consumer has an avatar configured
   * When provided, shows match indicator
   */
  matchScore?: number

  /**
   * Whether this post is considered a match for the consumer
   * Determined by matchScore >= threshold
   */
  isMatch?: boolean

  /**
   * Callback when the card is pressed
   * Receives the post data for navigation
   */
  onPress?: (post: Post | PostWithDetails) => void

  /**
   * Whether the card is in a compact mode for lists
   * @default false
   */
  compact?: boolean

  /**
   * Whether to show the location name
   * @default true
   */
  showLocation?: boolean

  /**
   * Callback when the card is long-pressed
   * Used to trigger options like reporting
   */
  onLongPress?: (post: Post | PostWithDetails) => void

  /**
   * Whether to enable built-in report functionality on long press
   * If true, shows a report option when long-pressing the card
   * @default true
   */
  enableReporting?: boolean

  /**
   * Callback when report is successfully submitted
   */
  onReportSuccess?: () => void

  /**
   * Additional container style
   */
  style?: ViewStyle

  /**
   * Level of detail to show based on distance
   * - 'full' (0-500m): show full detail (note, avatar, exact time, location name)
   * - 'reduced' (500m-2km): show note, avatar, approximate time, location area
   * - 'minimal' (2km-25km): show note only, general area, relative time (no avatar details)
   * @default 'full'
   */
  detailLevel?: 'full' | 'reduced' | 'minimal'

  /**
   * Test ID for testing purposes
   */
  testID?: string
}

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Colors used in the PostCard component
 * Match colors are kept local since darkTheme doesn't define them
 */
const MATCH_COLORS = {
  matchExcellent: '#34C759', // Green - excellent match
  matchStrong: '#5AC8FA', // Light blue - strong match
  matchGood: darkTheme.primary, // Coral - good match
  matchPartial: darkTheme.warning, // Orange - partial match
  matchLow: darkTheme.textMuted, // Gray - low match
} as const

/**
 * Maximum number of characters to show in note preview
 */
const NOTE_PREVIEW_LENGTH = 120

/**
 * Maximum number of characters in compact mode
 */
const NOTE_PREVIEW_LENGTH_COMPACT = 60

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Format a timestamp into a relative time string
 *
 * @param timestamp - ISO 8601 timestamp string
 * @param approximate - If true, use approximate time ranges (e.g., "this morning" instead of "2 hours ago")
 * @returns Human-readable relative time (e.g., "2 hours ago", "3 days ago")
 */
export function formatRelativeTime(timestamp: string, approximate: boolean = false): string {
  const now = new Date()
  const then = new Date(timestamp)
  const diffMs = now.getTime() - then.getTime()

  // Handle future dates or invalid timestamps
  if (diffMs < 0 || isNaN(diffMs)) {
    return 'Just now'
  }

  const diffSeconds = Math.floor(diffMs / 1000)
  const diffMinutes = Math.floor(diffSeconds / 60)
  const diffHours = Math.floor(diffMinutes / 60)
  const diffDays = Math.floor(diffHours / 24)
  const diffWeeks = Math.floor(diffDays / 7)

  // Approximate time formatting (for privacy)
  if (approximate) {
    if (diffHours < 12) {
      return 'this morning'
    }
    if (diffHours < 24) {
      return 'today'
    }
    if (diffDays < 2) {
      return 'yesterday'
    }
    if (diffDays < 7) {
      return 'this week'
    }
    if (diffWeeks < 4) {
      return 'recently'
    }
    return 'a while ago'
  }

  // Exact time formatting
  if (diffSeconds < 60) {
    return 'Just now'
  }
  if (diffMinutes < 60) {
    return diffMinutes === 1 ? '1 minute ago' : `${diffMinutes} minutes ago`
  }
  if (diffHours < 24) {
    return diffHours === 1 ? '1 hour ago' : `${diffHours} hours ago`
  }
  if (diffDays < 7) {
    return diffDays === 1 ? '1 day ago' : `${diffDays} days ago`
  }
  if (diffWeeks < 4) {
    return diffWeeks === 1 ? '1 week ago' : `${diffWeeks} weeks ago`
  }

  // For older posts, show the date
  return then.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  })
}

/**
 * Truncate text to a maximum length with ellipsis
 *
 * @param text - Text to truncate
 * @param maxLength - Maximum length before truncation
 * @returns Truncated text with "..." if needed
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text
  }
  // Find the last space before maxLength to avoid cutting words
  const truncated = text.substring(0, maxLength)
  const lastSpace = truncated.lastIndexOf(' ')
  if (lastSpace > maxLength * 0.7) {
    return truncated.substring(0, lastSpace) + '...'
  }
  return truncated + '...'
}

/**
 * Get the color for a match score
 *
 * @param score - Match score (0-100)
 * @returns Color string for the match indicator
 */
export function getMatchColor(score: number): string {
  if (score >= 90) return MATCH_COLORS.matchExcellent
  if (score >= 75) return MATCH_COLORS.matchStrong
  if (score >= 60) return MATCH_COLORS.matchGood
  if (score >= 40) return MATCH_COLORS.matchPartial
  return MATCH_COLORS.matchLow
}

/**
 * Get match label text for a score
 *
 * @param score - Match score (0-100)
 * @returns Human-readable match description
 */
export function getMatchLabel(score: number): string {
  if (score >= 90) return 'Excellent match!'
  if (score >= 75) return 'Strong match'
  if (score >= 60) return 'Good match'
  if (score >= 40) return 'Partial match'
  return 'Low match'
}

/**
 * Check if a post has expanded location data
 */
function isPostWithDetails(
  post: Post | PostWithDetails
): post is PostWithDetails {
  return 'location' in post && post.location !== undefined
}

/**
 * Check if a post has expanded producer data
 */
function hasProducerDetails(
  post: Post | PostWithDetails
): post is PostWithDetails {
  return 'producer' in post && post.producer !== undefined
}

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * PostCard displays a ledger post with avatar, note preview, location, and timestamp.
 *
 * Features:
 * - Shows target avatar using AvatarPreview component
 * - Displays truncated note preview
 * - Shows location name and relative timestamp
 * - Optional match indicator with score and color coding
 * - Compact mode for denser list displays
 * - Memoized for performance in FlatList
 */
export const PostCard = memo(function PostCard({
  post,
  location,
  producerProfile,
  matchScore,
  isMatch,
  onPress,
  compact = false,
  showLocation = true,
  onLongPress,
  enableReporting = true,
  onReportSuccess,
  style,
  detailLevel = 'full',
  testID = 'post-card',
}: PostCardProps) {
  // ---------------------------------------------------------------------------
  // STATE
  // ---------------------------------------------------------------------------

  const [reportModalVisible, setReportModalVisible] = useState(false)
  const { userId } = useAuthState()

  // ---------------------------------------------------------------------------
  // COMPUTED
  // ---------------------------------------------------------------------------

  // Get location from post details or prop
  const postLocation = isPostWithDetails(post) ? post.location : location

  // Get producer profile from post details or prop
  // Used for displaying verification badge
  const postProducer = hasProducerDetails(post) ? post.producer : producerProfile

  // Check if the producer is verified
  const isProducerVerified = postProducer?.is_verified ?? false

  // Format location based on detail level
  // 'full': exact location name, 'reduced': area name, 'minimal': general area
  const getLocationDisplay = () => {
    if (!postLocation) return ''

    if (detailLevel === 'minimal') {
      // For minimal, show just the city or general area (extract from location name)
      // If location name has comma, take the last part (usually city/area)
      const parts = postLocation.name.split(',').map(p => p.trim())
      return parts.length > 1 ? parts[parts.length - 1] : postLocation.name
    }

    if (detailLevel === 'reduced') {
      // For reduced, abbreviate long location names
      return postLocation.name.length > 30
        ? truncateText(postLocation.name, 30)
        : postLocation.name
    }

    // Full detail - show complete location name
    return postLocation.name
  }

  const locationDisplay = getLocationDisplay()

  // Truncate note for preview
  const maxLength = compact ? NOTE_PREVIEW_LENGTH_COMPACT : NOTE_PREVIEW_LENGTH
  const notePreview = truncateText(post.message, maxLength)

  // Format timestamp based on detail level
  // 'full': exact time, 'reduced': approximate, 'minimal': very approximate
  const useApproximateTime = detailLevel === 'reduced' || detailLevel === 'minimal'
  const timeAgo = formatRelativeTime(post.created_at, useApproximateTime)

  // Determine what to show based on detail level
  const showAvatar = detailLevel !== 'minimal'
  const showExactLocation = detailLevel === 'full'
  const showSightingTime = detailLevel === 'full'

  // Format sighting time if available
  const sightingDate = post.sighting_date ? parseDate(post.sighting_date) : null
  const hasSightingTime = sightingDate !== null && post.time_granularity !== null
  const formattedSightingTime = hasSightingTime && sightingDate
    ? formatSightingTime(sightingDate, post.time_granularity!)
    : null

  // Show match indicator if score is provided
  const showMatchIndicator = matchScore !== undefined

  // Build accessibility label
  const accessibilityLabel = useMemo(() => {
    let label = `Post: ${notePreview}`

    if (hasSightingTime && formattedSightingTime) {
      label += `, seen ${formattedSightingTime}`
    }

    if (postLocation && showLocation) {
      label += `, at ${postLocation.name}`
    }

    if (isProducerVerified) {
      label += ', from verified user'
    }

    label += `, posted ${timeAgo}`

    if (showMatchIndicator && isMatch) {
      label += `, ${getMatchLabel(matchScore)}`
    }

    return label
  }, [notePreview, hasSightingTime, formattedSightingTime, postLocation, showLocation, isProducerVerified, timeAgo, showMatchIndicator, isMatch, matchScore])

  // ---------------------------------------------------------------------------
  // HANDLERS
  // ---------------------------------------------------------------------------

  // Handle card press
  const handlePress = useCallback(() => {
    onPress?.(post)
  }, [onPress, post])

  // Handle card long press
  const handleLongPress = useCallback(() => {
    // If custom onLongPress handler provided, use it
    if (onLongPress) {
      onLongPress(post)
      return
    }

    // Otherwise, show built-in report option if enabled
    if (enableReporting) {
      Alert.alert(
        'Post Options',
        'What would you like to do?',
        [
          {
            text: 'Report Post',
            style: 'destructive',
            onPress: () => setReportModalVisible(true),
          },
          { text: 'Cancel', style: 'cancel' },
        ]
      )
    }
  }, [onLongPress, enableReporting, post])

// Handle closing report modal
  const handleCloseReportModal = useCallback(() => {
    setReportModalVisible(false)
  }, [])

  // Handle successful report submission
  const handleReportSuccess = useCallback(() => {
    Alert.alert(
      'Report Submitted',
      'Thank you for helping keep our community safe. We will review your report.',
      [{ text: 'OK' }]
    )
    onReportSuccess?.()
  }, [onReportSuccess])

  // ---------------------------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------------------------

  return (
    <>
      <PressableScale
        style={style}
        onPress={handlePress}
        disabled={!onPress && !enableReporting && !onLongPress}
        testID={testID}
      >
      <View
        style={[styles.container, compact && styles.containerCompact]}
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        // Note: Long press functionality moved to gesture handler if needed in future
      >
      {/* Avatar Section - hidden for minimal detail level */}
      {showAvatar && (
        <View style={styles.avatarContainer} testID={`${testID}-avatar`} accessible={false}>
          <Avatar
            config={post.target_avatar_v2?.config}
            size="md"
          />
          {/* Match Badge */}
          {showMatchIndicator && isMatch && (
            <View
              style={[
                styles.matchBadge,
                { backgroundColor: getMatchColor(matchScore) },
              ]}
              testID={`${testID}-match-badge`}
              accessible={false}
            >
              <Text style={styles.matchBadgeText} accessible={false}>
                {matchScore}%
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Content Section */}
      <View style={styles.contentContainer} accessible={false}>
        {/* Note Preview */}
        <Text
          style={[styles.noteText, compact && styles.noteTextCompact]}
          numberOfLines={compact ? 2 : 3}
          testID={`${testID}-note`}
          accessible={false}
        >
          {notePreview}
        </Text>

        {/* Sighting Time - displayed prominently when available (full detail only) */}
        {showSightingTime && hasSightingTime && formattedSightingTime && (
          <View style={styles.sightingTimeContainer} testID={`${testID}-sighting-time`} accessible={false}>
            <Ionicons name="time-outline" size={14} color={darkTheme.textSecondary} style={styles.sightingTimeIcon} accessible={false} />
            <Text style={styles.sightingTimeText} accessible={false}>
              Seen {formattedSightingTime}
            </Text>
          </View>
        )}

        {/* Meta Information */}
        <View style={styles.metaContainer} accessible={false}>
          {/* Location - formatted based on detail level */}
          {showLocation && locationDisplay && (
            <View style={styles.locationContainer} accessible={false}>
              <Ionicons name="location-outline" size={14} color={darkTheme.textSecondary} style={styles.locationIcon} accessible={false} />
              <Text
                style={styles.locationText}
                numberOfLines={1}
                testID={`${testID}-location`}
                accessible={false}
              >
                {locationDisplay}
              </Text>
            </View>
          )}

          {/* Timestamp and Verified Badge (hide verified badge for minimal detail) */}
          <View style={styles.timestampContainer} accessible={false}>
            {isProducerVerified && detailLevel !== 'minimal' && (
              <VerifiedBadge size="sm" testID={`${testID}-verified-badge`} accessible={false} />
            )}
            <Text style={styles.timestampText} testID={`${testID}-timestamp`} accessible={false}>
              {timeAgo}
            </Text>
          </View>
        </View>

        {/* Match Indicator (if provided and is a match) */}
        {showMatchIndicator && isMatch && !compact && (
          <View
            style={[
              styles.matchIndicator,
              { backgroundColor: `${getMatchColor(matchScore)}15` },
            ]}
            testID={`${testID}-match-indicator`}
            accessible={false}
          >
            <Text
              style={[styles.matchIndicatorText, { color: getMatchColor(matchScore) }]}
              accessible={false}
            >
              {getMatchLabel(matchScore)}
            </Text>
          </View>
        )}

        {/* Post Reactions */}
        {!compact && (
          <PostReactions
            postId={post.id}
            userId={userId}
            testID={`${testID}-reactions`}
          />
        )}
      </View>
      </View>
      </PressableScale>

      {/* Report Post Modal */}
      {enableReporting && (
        <ReportPostModal
          visible={reportModalVisible}
          onClose={handleCloseReportModal}
          reportedId={post.id}
          onSuccess={handleReportSuccess}
          testID={`${testID}-report-modal`}
        />
      )}
    </>
  )
})

// ============================================================================
// PRESET VARIANTS
// ============================================================================

/**
 * Compact PostCard for dense list displays
 */
export const CompactPostCard = memo(function CompactPostCard(
  props: Omit<PostCardProps, 'compact'>
) {
  return <PostCard {...props} compact={true} />
})

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  // Container
  container: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: darkTheme.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: darkTheme.cardBorder,
  },
  containerCompact: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },

  // Avatar
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
    marginTop: 4,
  },
  matchBadge: {
    position: 'absolute',
    bottom: -6,
    right: -6,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: darkTheme.surface,
  },
  matchBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: darkTheme.textPrimary,
  },

  // Content
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
  },

  // Note
  noteText: {
    fontSize: 14,
    lineHeight: 20,
    color: darkTheme.textPrimary,
    marginBottom: 8,
    fontWeight: '500',
  },
  noteTextCompact: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 6,
  },

  // Sighting Time
  sightingTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    backgroundColor: darkTheme.surfaceElevated,
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderRadius: 4,
  },
  sightingTimeIcon: {
    marginRight: 4,
  },
  sightingTimeText: {
    fontSize: 12,
    color: darkTheme.textPrimary,
    fontWeight: '500',
  },

  // Meta Information
  metaContainer: {
    flexDirection: 'column',
    gap: 4,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationIcon: {
    marginRight: 4,
  },
  locationText: {
    fontSize: 12,
    color: darkTheme.textSecondary,
    flex: 1,
  },
  timestampContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  timestampText: {
    fontSize: 12,
    color: darkTheme.textSecondary,
  },

  // Match Indicator
  matchIndicator: {
    marginTop: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  matchIndicatorText: {
    fontSize: 12,
    fontWeight: '600',
  },
})