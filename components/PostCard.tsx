/**
 * PostCard Component
 *
 * Displays a ledger post with glassmorphism styling, poster info,
 * target avatar, location with distance, expiry countdown, and reactions.
 */

import React, { memo, useCallback, useState, useMemo } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ViewStyle,
  Alert,
  Share,
  Platform,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { ReportPostModal } from './ReportModal'
import { AvatarDisplay } from './AvatarDisplay'
import { VerifiedBadge } from './VerifiedBadge'
import { PressableScale } from './native/PressableScale'
import { PostReactions } from './PostReactions'
import { TimelineOverlay } from './TimelineOverlay'
import { formatSightingTimeRange, parseDate } from '../utils/dateTime'
import { darkTheme } from '../constants/glassStyles'
import { useAuthState } from '../contexts/AuthContext'
import type { Post, PostWithDetails, Location, Profile } from '../types/database'
import type { PostOverlap } from '../hooks/useMyOverlappingCheckins'

// ============================================================================
// TYPES
// ============================================================================

export interface PostCardProps {
  post: Post | PostWithDetails
  location?: Location
  producerProfile?: Pick<Profile, 'id' | 'is_verified' | 'display_name' | 'username'>
  matchScore?: number
  isMatch?: boolean
  onPress?: (post: Post | PostWithDetails) => void
  showLocation?: boolean
  onLongPress?: (post: Post | PostWithDetails) => void
  enableReporting?: boolean
  onReportSuccess?: () => void
  style?: ViewStyle
  detailLevel?: 'full' | 'reduced' | 'minimal'
  testID?: string
  /** Distance in meters from current user */
  distance?: number
  /** Number of responses/replies on this post */
  responseCount?: number
  /** Viewer's overlapping check-in for this post (Feature 2.1). Undefined = no overlap. */
  overlap?: PostOverlap
  /**
   * Feature 3.3 — Progressive disclosure mode.
   * When true, the card collapses by default to avatars + sighting time +
   * match badge + timeline overlay, expanding on tap to reveal note/meta/
   * reactions. The onPress prop still fires (e.g. for navigation) — expansion
   * is in addition to whatever onPress does.
   */
  expandable?: boolean
  /** Initial expanded state when expandable=true. Default false. */
  defaultExpanded?: boolean
}

// ============================================================================
// CONSTANTS
// ============================================================================

const MATCH_COLORS = {
  matchExcellent: '#34C759',
  matchStrong: '#5AC8FA',
  matchGood: darkTheme.primary,
  matchPartial: darkTheme.warning,
  matchLow: darkTheme.textMuted,
} as const

const NOTE_PREVIEW_LENGTH = 160

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

export function formatRelativeTime(timestamp: string, approximate: boolean = false): string {
  const now = new Date()
  const then = new Date(timestamp)
  const diffMs = now.getTime() - then.getTime()

  if (diffMs < 0 || isNaN(diffMs)) return 'Just now'

  const diffSeconds = Math.floor(diffMs / 1000)
  const diffMinutes = Math.floor(diffSeconds / 60)
  const diffHours = Math.floor(diffMinutes / 60)
  const diffDays = Math.floor(diffHours / 24)
  const diffWeeks = Math.floor(diffDays / 7)

  if (approximate) {
    if (diffHours < 12) return 'this morning'
    if (diffHours < 24) return 'today'
    if (diffDays < 2) return 'yesterday'
    if (diffDays < 7) return 'this week'
    if (diffWeeks < 4) return 'recently'
    return 'a while ago'
  }

  if (diffSeconds < 60) return 'Just now'
  if (diffMinutes < 60) return `${diffMinutes}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  if (diffWeeks < 4) return `${diffWeeks}w ago`

  return then.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  const truncated = text.substring(0, maxLength)
  const lastSpace = truncated.lastIndexOf(' ')
  if (lastSpace > maxLength * 0.7) return truncated.substring(0, lastSpace) + '...'
  return truncated + '...'
}

export function getMatchColor(score: number): string {
  if (score >= 90) return MATCH_COLORS.matchExcellent
  if (score >= 75) return MATCH_COLORS.matchStrong
  if (score >= 60) return MATCH_COLORS.matchGood
  if (score >= 40) return MATCH_COLORS.matchPartial
  return MATCH_COLORS.matchLow
}

export function getMatchLabel(score: number): string {
  if (score >= 90) return 'Excellent match!'
  if (score >= 75) return 'Strong match'
  if (score >= 60) return 'Good match'
  if (score >= 40) return 'Partial match'
  return 'Low match'
}

function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)}m`
  return `${(meters / 1000).toFixed(1)}km`
}

function formatExpiry(expiresAt: string): string | null {
  const now = new Date()
  const expiry = new Date(expiresAt)
  const diffMs = expiry.getTime() - now.getTime()
  if (diffMs <= 0) return 'Expired'

  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffHours / 24)

  if (diffDays > 0) return `${diffDays}d left`
  if (diffHours > 0) return `${diffHours}h left`
  return '<1h left'
}

function isPostWithDetails(post: Post | PostWithDetails): post is PostWithDetails {
  return 'location' in post && post.location !== undefined
}

function hasProducerDetails(post: Post | PostWithDetails): post is PostWithDetails {
  return 'producer' in post && post.producer !== undefined
}

// ============================================================================
// COMPONENT
// ============================================================================

export const PostCard = memo(function PostCard({
  post,
  location,
  producerProfile,
  matchScore,
  isMatch,
  onPress,
  showLocation = true,
  onLongPress,
  enableReporting = true,
  onReportSuccess,
  style,
  detailLevel = 'full',
  testID = 'post-card',
  distance,
  responseCount,
  overlap,
  expandable = false,
  defaultExpanded = false,
}: PostCardProps) {
  const [reportModalVisible, setReportModalVisible] = useState(false)
  const [expanded, setExpanded] = useState(defaultExpanded)
  const { userId } = useAuthState()

  // Computed values
  const postLocation = isPostWithDetails(post) ? post.location : location
  const postProducer = hasProducerDetails(post) ? post.producer : producerProfile
  const isProducerVerified = postProducer?.is_verified ?? false
  const producerName = postProducer?.display_name || postProducer?.username || 'Anonymous'

  const getLocationDisplay = () => {
    if (!postLocation) return ''
    if (detailLevel === 'minimal') {
      const parts = postLocation.name.split(',').map(p => p.trim())
      return parts.length > 1 ? parts[parts.length - 1] : postLocation.name
    }
    if (detailLevel === 'reduced') {
      return postLocation.name.length > 30 ? truncateText(postLocation.name, 30) : postLocation.name
    }
    return postLocation.name
  }

  const locationDisplay = getLocationDisplay()
  const notePreview = truncateText(post.message, NOTE_PREVIEW_LENGTH)

  const useApproximateTime = detailLevel === 'reduced' || detailLevel === 'minimal'
  const timeAgo = formatRelativeTime(post.created_at, useApproximateTime)

  const showAvatar = detailLevel !== 'minimal'
  const showSightingTime = detailLevel === 'full'

  const sightingDate = post.sighting_date ? parseDate(post.sighting_date) : null
  const sightingEndDate = post.sighting_end_date ? parseDate(post.sighting_end_date) : null
  const hasSightingTime = sightingDate !== null && post.time_granularity !== null
  const formattedSightingTime = hasSightingTime && sightingDate
    ? formatSightingTimeRange(sightingDate, sightingEndDate, post.time_granularity!)
    : null

  const showMatchIndicator = matchScore !== undefined
  const expiryText = post.expires_at ? formatExpiry(post.expires_at) : null

  const accessibilityLabel = useMemo(() => {
    let label = `Post: ${notePreview}`
    if (hasSightingTime && formattedSightingTime) label += `, seen ${formattedSightingTime}`
    if (postLocation && showLocation) label += `, at ${postLocation.name}`
    if (isProducerVerified) label += ', from verified user'
    label += `, posted ${timeAgo}`
    if (showMatchIndicator && isMatch) label += `, ${getMatchLabel(matchScore)}`
    return label
  }, [notePreview, hasSightingTime, formattedSightingTime, postLocation, showLocation, isProducerVerified, timeAgo, showMatchIndicator, isMatch, matchScore])

  // Handlers
  // Feature 3.3 progressive disclosure: in expandable mode, the first tap
  // expands; once expanded, a tap navigates via onPress. This makes tap a
  // single, escalating gesture rather than firing both at once.
  const handlePress = useCallback(() => {
    if (expandable && !expanded) {
      setExpanded(true)
      return
    }
    onPress?.(post)
  }, [expandable, expanded, onPress, post])

  const handleLongPress = useCallback(() => {
    if (onLongPress) { onLongPress(post); return }
    if (enableReporting) {
      Alert.alert('Post Options', 'What would you like to do?', [
        { text: 'Report Post', style: 'destructive', onPress: () => setReportModalVisible(true) },
        { text: 'Cancel', style: 'cancel' },
      ])
    }
  }, [onLongPress, enableReporting, post])

  const handleCloseReportModal = useCallback(() => { setReportModalVisible(false) }, [])

  const handleReportSuccess = useCallback(() => {
    Alert.alert('Report Submitted', 'Thank you for helping keep our community safe. We will review your report.', [{ text: 'OK' }])
    onReportSuccess?.()
  }, [onReportSuccess])

  const handleShare = useCallback(async () => {
    const shareMessage = `"${truncateText(post.message, 100)}"${postLocation ? ` at ${postLocation.name}` : ''}`
    try {
      await Share.share({ message: shareMessage })
    } catch {
      // User cancelled share
    }
  }, [post.message, postLocation])

  // Full glass card render
  // Feature 3.3 — when expandable, hide the message body, full meta row, and
  // reactions until the card is expanded by tap. The header, sighting time,
  // timeline overlay, and target avatar / match badge always render so the
  // collapsed card still communicates the essentials.
  const showDetails = !expandable || expanded
  return (
    <>
      <PressableScale
        style={style}
        onPress={handlePress}
        onLongPress={handleLongPress}
        disabled={!onPress && !enableReporting && !onLongPress && !expandable}
        testID={testID}
      >
        <View style={styles.card} accessible accessibilityRole="button" accessibilityLabel={accessibilityLabel}>

          {/* ── Header: Poster info + time + share ── */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <AvatarDisplay
                avatar={hasProducerDetails(post) ? (post.producer as any)?.avatar : undefined}
                initials={producerName[0]}
                pixelSize={28}
                testID={`${testID}-poster-avatar`}
              />
              <View style={styles.headerInfo}>
                <View style={styles.headerNameRow}>
                  <Text style={styles.posterName} numberOfLines={1}>{producerName}</Text>
                  {isProducerVerified && detailLevel !== 'minimal' && (
                    <VerifiedBadge size="sm" testID={`${testID}-verified-badge`} />
                  )}
                </View>
                <Text style={styles.headerTime}>{timeAgo}</Text>
              </View>
            </View>
            {expandable && (
              <Ionicons
                name={expanded ? 'chevron-up' : 'chevron-down'}
                size={18}
                color={darkTheme.textMuted}
                style={styles.expandChevron}
                testID={`${testID}-expand-chevron`}
              />
            )}
            <PressableScale onPress={handleShare} testID={`${testID}-share`} style={styles.shareButton}>
              <Ionicons name="share-outline" size={18} color={darkTheme.textSecondary} />
            </PressableScale>
          </View>

          {/* ── Body: Message text (only when expanded) ── */}
          {showDetails && (
            <Text
              style={styles.noteText}
              numberOfLines={4}
              testID={`${testID}-note`}
            >
              {notePreview}
            </Text>
          )}

          {/* ── Sighting Time ── */}
          {showSightingTime && hasSightingTime && formattedSightingTime && (
            <View style={styles.sightingTimeContainer} testID={`${testID}-sighting-time`}>
              <Ionicons name="time-outline" size={13} color={darkTheme.textSecondary} />
              <Text style={styles.sightingTimeText}>Seen {formattedSightingTime}</Text>
            </View>
          )}

          {/* ── Timeline Overlay (Feature 2.1) ── */}
          {detailLevel !== 'minimal' && (
            <TimelineOverlay overlap={overlap} testID={`${testID}-timeline`} />
          )}

          {/* ── Target Avatar Section ── */}
          {showAvatar && post.target_avatar_v2 && (
            <View style={styles.targetSection}>
              <Text style={styles.targetLabel}>Looking for</Text>
              <View style={styles.targetAvatarRow}>
                <AvatarDisplay
                  avatar={post.target_avatar_v2}
                  size="lg"
                  testID={`${testID}-avatar`}
                />
                {showMatchIndicator && isMatch && (
                  <View style={[styles.matchBadge, { backgroundColor: getMatchColor(matchScore) }]} testID={`${testID}-match-badge`}>
                    <Text style={styles.matchBadgeText}>{matchScore}%</Text>
                    <Text style={styles.matchLabelText}>{getMatchLabel(matchScore)}</Text>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* ── Meta Row + Reactions (only when expanded) ── */}
          {showDetails && (
            <>
              <View style={styles.metaRow}>
                <View style={styles.metaLeft}>
                  {showLocation && locationDisplay ? (
                    <View style={styles.metaItem}>
                      <Ionicons name="location-outline" size={14} color={darkTheme.accent} />
                      <Text style={styles.metaText} numberOfLines={1}>{locationDisplay}</Text>
                      {distance != null && distance > 0 && (
                        <View style={styles.distanceBadge}>
                          <Text style={styles.distanceBadgeText}>{formatDistance(distance)}</Text>
                        </View>
                      )}
                    </View>
                  ) : null}
                  <View style={styles.metaSecondRow}>
                    {expiryText && (
                      <View style={styles.metaItem}>
                        <Ionicons name="hourglass-outline" size={13} color={darkTheme.textMuted} />
                        <Text style={styles.metaTextMuted}>{expiryText}</Text>
                      </View>
                    )}
                    {responseCount != null && responseCount > 0 && (
                      <View style={styles.metaItem}>
                        <Ionicons name="chatbubble-outline" size={13} color={darkTheme.textMuted} />
                        <Text style={styles.metaTextMuted}>
                          {responseCount} {responseCount === 1 ? 'reply' : 'replies'}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>

              {/* PostReactions runs queries on mount; only mount when expanded
                  to avoid N reaction queries on feed scroll. */}
              <PostReactions
                postId={post.id}
                userId={userId}
                compact
                testID={`${testID}-reactions`}
              />
            </>
          )}
        </View>
      </PressableScale>

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
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  // ── Glass Card ──
  card: {
    borderRadius: 16,
    backgroundColor: darkTheme.cardBackground,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },

  // ── Header ──
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 10,
  },
  headerInfo: {
    flex: 1,
  },
  headerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  posterName: {
    fontSize: 14,
    fontWeight: '600',
    color: darkTheme.textPrimary,
  },
  headerTime: {
    fontSize: 12,
    color: darkTheme.textMuted,
    marginTop: 1,
  },
  shareButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: darkTheme.surfaceElevated,
  },
  expandChevron: {
    marginRight: 4,
  },

  // ── Note / Body ──
  noteText: {
    fontSize: 15,
    lineHeight: 22,
    color: darkTheme.textPrimary,
    fontWeight: '500',
    marginBottom: 10,
  },

  // ── Sighting Time ──
  sightingTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 10,
    backgroundColor: darkTheme.surfaceElevated,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  sightingTimeText: {
    fontSize: 12,
    color: darkTheme.textPrimary,
    fontWeight: '500',
  },

  // ── Target Avatar Section ──
  targetSection: {
    marginBottom: 12,
    paddingTop: 4,
  },
  targetLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: darkTheme.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  targetAvatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  matchBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  matchBadgeText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  matchLabelText: {
    fontSize: 11,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.85)',
    marginTop: 1,
  },

  // ── Meta Row ──
  metaRow: {
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
    marginBottom: 4,
  },
  metaLeft: {
    gap: 6,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  metaSecondRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  metaText: {
    fontSize: 13,
    color: darkTheme.textSecondary,
    flexShrink: 1,
  },
  metaTextMuted: {
    fontSize: 12,
    color: darkTheme.textMuted,
  },
  distanceBadge: {
    backgroundColor: `${darkTheme.accent}20`,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  distanceBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: darkTheme.accent,
  },
})
