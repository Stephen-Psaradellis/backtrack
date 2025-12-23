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
import { MediumAvatarPreview } from './AvatarPreview'
import type { Post, PostWithDetails, Location } from '../types/database'
import type { AvatarConfig } from '../types/avatar'

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
  primary: '#007AFF',
  textPrimary: '#000000',
  textSecondary: '#8E8E93',
  textTertiary: '#C7C7CC',
  background: '#FFFFFF',
  border: '#E5E5EA',
  matchExcellent: '#34C759', // Green - excellent match
  matchStrong: '#5AC8FA', // Light blue - strong match
  matchGood: '#007AFF', // Blue - good match
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

  // Truncate note for preview
  const maxLength = compact ? NOTE_PREVIEW_LENGTH_COMPACT : NOTE_PREVIEW_LENGTH
  const notePreview = truncateText(post.note, maxLength)

  // Format timestamp
  const timeAgo = formatRelativeTime(post.created_at)

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
        <MediumAvatarPreview
          config={post.target_avatar as AvatarConfig}
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

          {/* Timestamp */}
          <Text style={styles.timestampText} testID={`${testID}-timestamp`}>
            {timeAgo}
          </Text>
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
  return (
    <PostCard
      {...props}
      compact={true}
      testID={props.testID ?? 'post-card-compact'}
    />
  )
})

/**
 * PostCard without location display (for location-specific ledgers)
 */
export const PostCardNoLocation = memo(function PostCardNoLocation(
  props: Omit<PostCardProps, 'showLocation'>
) {
  return (
    <PostCard
      {...props}
      showLocation={false}
      testID={props.testID ?? 'post-card-no-location'}
    />
  )
})

/**
 * PostCard with match highlighting enabled
 */
export const MatchablePostCard = memo(function MatchablePostCard(
  props: PostCardProps & { matchScore: number; isMatch: boolean }
) {
  return (
    <PostCard
      {...props}
      testID={props.testID ?? 'post-card-matchable'}
    />
  )
})

// ============================================================================
// LIST ITEM COMPONENT
// ============================================================================

/**
 * Props for PostCardListItem
 */
export interface PostCardListItemProps extends PostCardProps {
  /**
   * Index in the list (for alternating backgrounds or separators)
   */
  index?: number

  /**
   * Whether to show a separator below the item
   * @default true
   */
  showSeparator?: boolean
}

/**
 * PostCard wrapped for use in FlatList with separator
 */
export const PostCardListItem = memo(function PostCardListItem({
  index,
  showSeparator = true,
  ...props
}: PostCardListItemProps) {
  return (
    <View testID={`${props.testID ?? 'post-card-list-item'}-${index ?? 0}`}>
      <PostCard {...props} />
      {showSeparator && <View style={styles.separator} />}
    </View>
  )
})

// ============================================================================
// RENDER ITEM HELPER
// ============================================================================

/**
 * Create a renderItem function for FlatList
 *
 * @param onPress - Callback when a post is pressed
 * @param matchScores - Optional map of postId -> matchScore for match indicators
 * @param matchThreshold - Score threshold for considering a match (default: 60)
 * @returns A function suitable for FlatList's renderItem prop
 *
 * @example
 * ```tsx
 * const renderItem = createPostCardRenderer(
 *   (post) => navigation.navigate('PostDetail', { postId: post.id }),
 *   matchScores,
 *   60
 * )
 *
 * <FlatList
 *   data={posts}
 *   renderItem={renderItem}
 *   keyExtractor={(item) => item.id}
 * />
 * ```
 */
export function createPostCardRenderer(
  onPress: (post: Post | PostWithDetails) => void,
  matchScores?: Map<string, number>,
  matchThreshold: number = 60
) {
  return ({
    item,
    index,
  }: {
    item: Post | PostWithDetails
    index: number
  }) => {
    const score = matchScores?.get(item.id)
    return (
      <PostCardListItem
        post={item}
        onPress={onPress}
        matchScore={score}
        isMatch={score !== undefined && score >= matchThreshold}
        index={index}
        testID={`post-card-${item.id}`}
      />
    )
  }
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: COLORS.background,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  containerCompact: {
    padding: 12,
    borderRadius: 8,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  matchBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 36,
    alignItems: 'center',
  },
  matchBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'space-between',
  },
  noteText: {
    fontSize: 15,
    lineHeight: 20,
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  noteTextCompact: {
    fontSize: 14,
    lineHeight: 18,
    marginBottom: 4,
  },
  metaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  locationIcon: {
    fontSize: 12,
    marginRight: 4,
  },
  locationText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    flex: 1,
  },
  timestampText: {
    fontSize: 12,
    color: COLORS.textTertiary,
  },
  matchIndicator: {
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  matchIndicatorText: {
    fontSize: 12,
    fontWeight: '600',
  },
  separator: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 8,
    marginHorizontal: 16,
  },
})
