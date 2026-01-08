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

import React, { memo, useCallback, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
  Alert,
} from 'react-native'
import { ReportPostModal } from './ReportModal'
import { MdAvatarSnapshot } from './avatar3d'
import { VerifiedBadge } from './VerifiedBadge'
import { formatSightingTime, parseDate } from '../utils/dateTime'
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
   * Test ID for testing purposes
   */
  testID?: string
}

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Colors used in the PostCard component
 */
const COLORS = {
  primary: '#FF6B47',
  textPrimary: '#000000',
  textSecondary: '#8E8E93',
  textTertiary: '#C7C7CC',
  background: '#FFFFFF',
  border: '#E5E5EA',
  matchExcellent: '#34C759', // Green - excellent match
  matchStrong: '#5AC8FA', // Light blue - strong match
  matchGood: '#FF6B47', // Coral - good match
  matchPartial: '#FF9500', // Orange - partial match
  matchLow: '#8E8E93', // Gray - low match
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
 * @returns Human-readable relative time (e.g., "2 hours ago", "3 days ago")
 */
export function formatRelativeTime(timestamp: string): string {
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
  if (score >= 90) return COLORS.matchExcellent
  if (score >= 75) return COLORS.matchStrong
  if (score >= 60) return COLORS.matchGood
  if (score >= 40) return COLORS.matchPartial
  return COLORS.matchLow
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
  testID = 'post-card',
}: PostCardProps) {
  // ---------------------------------------------------------------------------
  // STATE
  // ---------------------------------------------------------------------------

  const [reportModalVisible, setReportModalVisible] = useState(false)

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

  // Truncate note for preview
  const maxLength = compact ? NOTE_PREVIEW_LENGTH_COMPACT : NOTE_PREVIEW_LENGTH
  const notePreview = truncateText(post.message, maxLength)

  // Format timestamp
  const timeAgo = formatRelativeTime(post.created_at)

  // Format sighting time if available
  const sightingDate = post.sighting_date ? parseDate(post.sighting_date) : null
  const hasSightingTime = sightingDate !== null && post.time_granularity !== null
  const formattedSightingTime = hasSightingTime && sightingDate
    ? formatSightingTime(sightingDate, post.time_granularity!)
    : null

  // Show match indicator if score is provided
  const showMatchIndicator = matchScore !== undefined

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
      <TouchableOpacity
        style={[styles.container, compact && styles.containerCompact, style]}
        onPress={handlePress}
        onLongPress={handleLongPress}
        activeOpacity={0.7}
        disabled={!onPress && !enableReporting && !onLongPress}
        testID={testID}
        accessibilityRole="button"
        accessibilityLabel={`Post from ${timeAgo}${postLocation ? ` at ${postLocation.name}` : ''}`}
      >
      {/* Avatar Section */}
      <View style={styles.avatarContainer} testID={`${testID}-avatar`}>
        <MdAvatarSnapshot
          avatar={post.target_avatar_v2}
          testID={`${testID}-avatar-preview`}
        />
        {/* Match Badge */}
        {showMatchIndicator && isMatch && (
          <View
            style={[
              styles.matchBadge,
              { backgroundColor: getMatchColor(matchScore) },
            ]}
            testID={`${testID}-match-badge`}
          >
            <Text style={styles.matchBadgeText}>
              {matchScore}%
            </Text>
          </View>
        )}
      </View>

      {/* Content Section */}
      <View style={styles.contentContainer}>
        {/* Note Preview */}
        <Text
          style={[styles.noteText, compact && styles.noteTextCompact]}
          numberOfLines={compact ? 2 : 3}
          testID={`${testID}-note`}
        >
          {notePreview}
        </Text>

        {/* Sighting Time - displayed prominently when available */}
        {hasSightingTime && formattedSightingTime && (
          <View style={styles.sightingTimeContainer} testID={`${testID}-sighting-time`}>
            <Text style={styles.sightingTimeIcon}>🕐</Text>
            <Text style={styles.sightingTimeText}>
              Seen {formattedSightingTime}
            </Text>
          </View>
        )}

        {/* Meta Information */}
        <View style={styles.metaContainer}>
          {/* Location */}
          {showLocation && postLocation && (
            <View style={styles.locationContainer}>
              <Text style={styles.locationIcon}>📍</Text>
              <Text
                style={styles.locationText}
                numberOfLines={1}
                testID={`${testID}-location`}
              >
                {postLocation.name}
              </Text>
            </View>
          )}

          {/* Timestamp and Verified Badge */}
          <View style={styles.timestampContainer}>
            {isProducerVerified && (
              <VerifiedBadge size="sm" testID={`${testID}-verified-badge`} />
            )}
            <Text style={styles.timestampText} testID={`${testID}-timestamp`}>
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
          >
            <Text
              style={[styles.matchIndicatorText, { color: getMatchColor(matchScore) }]}
            >
              {getMatchLabel(matchScore)}
            </Text>
          </View>
        )}
      </View>
      </TouchableOpacity>

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
    backgroundColor: COLORS.background,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
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
    borderColor: COLORS.background,
  },
  matchBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.background,
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
    color: COLORS.textPrimary,
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
    backgroundColor: '#F8F8F8',
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderRadius: 4,
  },
  sightingTimeIcon: {
    fontSize: 12,
    marginRight: 4,
  },
  sightingTimeText: {
    fontSize: 12,
    color: COLORS.textPrimary,
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
    fontSize: 12,
    marginRight: 4,
  },
  locationText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    flex: 1,
  },
  timestampContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  timestampText: {
    fontSize: 12,
    color: COLORS.textSecondary,
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