/**
 * LocationCard Component
 *
 * An expandable card showing location stats and post activity in a narrative style.
 * Features avatar peek, story-driven stats, and action buttons.
 *
 * Features:
 * - Location name + distance
 * - Narrative stats ("X missed connections", "First story: Y ago", etc.)
 * - Avatar peek showing recent target avatars
 * - Two action buttons: Browse Stories + Post Here
 * - Animated expansion
 *
 * @example
 * ```tsx
 * <LocationCard
 *   name="Blue Bottle Coffee"
 *   distance={0.3}
 *   postCount={5}
 *   firstPostAt={new Date('2024-01-01')}
 *   latestPostAt={new Date()}
 *   recentAvatars={[avatar1, avatar2, avatar3]}
 *   onBrowse={() => navigate('Ledger')}
 *   onPost={() => navigate('CreatePost')}
 * />
 * ```
 */

import React, { memo, useCallback, useState } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  LayoutAnimation,
  UIManager,
  Platform,
  Animated,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'

import { Avatar2DDisplay } from './avatar2d'
import { Button, OutlineButton } from './Button'
import { lightFeedback } from '../lib/haptics'
import type { StoredAvatar2D } from './avatar2d/types'

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true)
}

// ============================================================================
// TYPES
// ============================================================================

/**
 * Props for the LocationCard component
 */
export interface LocationCardProps {
  /**
   * Location name
   */
  name: string

  /**
   * Address (optional)
   */
  address?: string | null

  /**
   * Distance from user in kilometers (optional)
   */
  distance?: number | null

  /**
   * Number of posts at this location
   */
  postCount: number

  /**
   * Timestamp of the first post (null if no posts)
   */
  firstPostAt?: Date | null

  /**
   * Timestamp of the most recent post (null if no posts)
   */
  latestPostAt?: Date | null

  /**
   * Recent target avatars to display as peek (up to 3)
   */
  recentAvatars?: StoredAvatar2D[]

  /**
   * Whether the card is initially expanded
   * @default false
   */
  expanded?: boolean

  /**
   * Callback when Browse Stories button is pressed
   */
  onBrowse: () => void

  /**
   * Callback when Post Here button is pressed
   */
  onPost: () => void

  /**
   * Test ID prefix
   */
  testID?: string
}

// ============================================================================
// CONSTANTS
// ============================================================================

const COLORS = {
  primary: '#FF6B47',
  amber: '#F4A261',
  background: '#FFFFFF',
  backgroundSecondary: '#F2F2F7',
  border: '#E5E5EA',
  textPrimary: '#1C1917',
  textSecondary: '#8E8E93',
}

// Time thresholds
const TWO_HOURS_MS = 2 * 60 * 60 * 1000

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Format distance for display
 */
function formatDistance(km: number | null | undefined): string {
  if (km === null || km === undefined) return ''
  if (km < 0.1) return 'nearby'
  if (km < 1) return `${Math.round(km * 1000)}m away`
  return `${km.toFixed(1)}km away`
}

/**
 * Format relative time in a narrative style
 */
function formatRelativeTime(date: Date | null | undefined): string {
  if (!date) return ''

  const now = Date.now()
  const diff = now - date.getTime()

  const minutes = Math.floor(diff / (1000 * 60))
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const weeks = Math.floor(days / 7)
  const months = Math.floor(days / 30)

  if (minutes < 5) return 'just now'
  if (minutes < 60) return `${minutes} min ago`
  if (hours < 24) return `${hours}h ago`
  if (days === 1) return 'yesterday'
  if (days < 7) return `${days} days ago`
  if (weeks === 1) return 'a week ago'
  if (weeks < 4) return `${weeks} weeks ago`
  if (months === 1) return 'a month ago'
  return `${months} months ago`
}

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * LocationCard - Expandable location info card with narrative stats
 */
export const LocationCard = memo(function LocationCard({
  name,
  address,
  distance,
  postCount,
  firstPostAt,
  latestPostAt,
  recentAvatars = [],
  expanded: initialExpanded = false,
  onBrowse,
  onPost,
  testID = 'location-card',
}: LocationCardProps): JSX.Element {
  // ---------------------------------------------------------------------------
  // STATE
  // ---------------------------------------------------------------------------

  const [expanded, setExpanded] = useState(initialExpanded)

  // ---------------------------------------------------------------------------
  // COMPUTED VALUES
  // ---------------------------------------------------------------------------

  const hasRecentPost = latestPostAt && (Date.now() - latestPostAt.getTime()) < TWO_HOURS_MS
  const distanceText = formatDistance(distance)
  const latestText = formatRelativeTime(latestPostAt)
  const firstText = formatRelativeTime(firstPostAt)

  // Narrative stats
  const narrativeStats = []
  if (postCount > 0) {
    narrativeStats.push(`${postCount} missed connection${postCount === 1 ? '' : 's'}`)
  }
  if (firstPostAt && postCount > 0) {
    narrativeStats.push(`First story: ${firstText}`)
  }
  if (latestPostAt && postCount > 0) {
    narrativeStats.push(`Most recent: ${latestText}`)
  }

  // ---------------------------------------------------------------------------
  // HANDLERS
  // ---------------------------------------------------------------------------

  const handleToggleExpand = useCallback(async () => {
    await lightFeedback()
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
    setExpanded(prev => !prev)
  }, [])

  // ---------------------------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------------------------

  return (
    <TouchableOpacity
      style={[styles.container, expanded && styles.containerExpanded]}
      onPress={handleToggleExpand}
      activeOpacity={0.9}
      testID={testID}
    >
      {/* Header Row */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          {/* Location icon with activity indicator */}
          <View style={styles.iconContainer}>
            <Ionicons
              name="location"
              size={24}
              color={hasRecentPost ? COLORS.amber : COLORS.primary}
            />
            {hasRecentPost && <View style={styles.hotIndicator} />}
          </View>

          {/* Location info */}
          <View style={styles.locationInfo}>
            <Text style={styles.locationName} numberOfLines={1}>{name}</Text>
            {distanceText && (
              <Text style={styles.distance}>{distanceText}</Text>
            )}
          </View>
        </View>

        {/* Expand indicator */}
        <View style={styles.expandButton}>
          <Ionicons
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={20}
            color={COLORS.textSecondary}
          />
        </View>
      </View>

      {/* Expanded Content */}
      {expanded && (
        <View style={styles.expandedContent}>
          {/* Narrative Stats */}
          {narrativeStats.length > 0 ? (
            <View style={styles.statsContainer}>
              {narrativeStats.map((stat, index) => (
                <View key={index} style={styles.statRow}>
                  <View style={[
                    styles.statDot,
                    index === narrativeStats.length - 1 && hasRecentPost && styles.statDotPulse,
                  ]} />
                  <Text style={[
                    styles.statText,
                    index === narrativeStats.length - 1 && hasRecentPost && styles.statTextHighlight,
                  ]}>
                    {stat}
                  </Text>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.emptyStats}>
              <Text style={styles.emptyText}>No stories here yet</Text>
            </View>
          )}

          {/* Avatar Peek */}
          {recentAvatars.length > 0 && (
            <View style={styles.avatarPeek}>
              <Text style={styles.avatarPeekLabel}>Recent lookouts:</Text>
              <View style={styles.avatarRow}>
                {recentAvatars.slice(0, 3).map((avatar, index) => (
                  <View
                    key={index}
                    style={[styles.avatarThumb, { marginLeft: index > 0 ? -8 : 0 }]}
                  >
                    <Avatar2DDisplay avatar={avatar} size="sm" />
                  </View>
                ))}
                {recentAvatars.length > 3 && (
                  <View style={[styles.avatarThumb, styles.avatarOverflow]}>
                    <Text style={styles.avatarOverflowText}>+{recentAvatars.length - 3}</Text>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.actions}>
            <OutlineButton
              title="Browse Stories"
              onPress={onBrowse}
              style={styles.actionButton}
              testID={`${testID}-browse`}
            />
            <Button
              title="Post Here"
              onPress={onPost}
              style={styles.actionButton}
              testID={`${testID}-post`}
            />
          </View>
        </View>
      )}
    </TouchableOpacity>
  )
})

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },

  containerExpanded: {
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },

  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },

  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  hotIndicator: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.amber,
    borderWidth: 2,
    borderColor: COLORS.background,
  },

  locationInfo: {
    flex: 1,
  },

  locationName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },

  distance: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },

  expandButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },

  expandedContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },

  statsContainer: {
    paddingTop: 16,
    gap: 8,
  },

  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  statDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.textSecondary,
    marginRight: 10,
  },

  statDotPulse: {
    backgroundColor: COLORS.amber,
  },

  statText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },

  statTextHighlight: {
    color: COLORS.amber,
    fontWeight: '500',
  },

  emptyStats: {
    paddingTop: 16,
    alignItems: 'center',
  },

  emptyText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
  },

  avatarPeek: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },

  avatarPeekLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  avatarThumb: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.backgroundSecondary,
    borderWidth: 2,
    borderColor: COLORS.background,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },

  avatarOverflow: {
    backgroundColor: COLORS.primary,
    marginLeft: -8,
  },

  avatarOverflowText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.background,
  },

  actions: {
    flexDirection: 'row',
    marginTop: 16,
    gap: 8,
  },

  actionButton: {
    flex: 1,
  },
})

// ============================================================================
// EXPORTS
// ============================================================================

export default LocationCard
