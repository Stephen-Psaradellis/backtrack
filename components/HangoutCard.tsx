/**
 * HangoutCard Component
 *
 * Compact card for displaying a hangout with join/leave functionality.
 * Shows vibe emoji, title, location, time, attendees, and action button.
 *
 * Features:
 * - Vibe emoji icons
 * - Relative time display (In 2 hours, Tomorrow 7pm)
 * - Attendee avatar stack (max 3 shown + count)
 * - Join/Leave button with press animation
 * - Dark glassmorphism styling
 *
 * @example
 * ```tsx
 * <HangoutCard
 *   hangout={hangout}
 *   onJoin={() => joinHangout(hangout.id)}
 *   onLeave={() => leaveHangout(hangout.id)}
 *   isAttending={false}
 * />
 * ```
 */

import React, { useMemo, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { formatDistanceToNow, format, isTomorrow, isToday } from 'date-fns'

import { PressableScale } from './native/PressableScale'
import { darkTheme } from '../constants/glassStyles'
import { spacing } from '../constants/theme'
import { selectionFeedback } from '../lib/haptics'
import type { HangoutWithDetails, HangoutVibe } from '../types/database'

// ============================================================================
// TYPES
// ============================================================================

export interface HangoutCardProps {
  /** Hangout data to display */
  hangout: HangoutWithDetails
  /** Whether current user is attending */
  isAttending: boolean
  /** Callback when user joins */
  onJoin: () => void | Promise<void>
  /** Callback when user leaves */
  onLeave: () => void | Promise<void>
  /** Test ID for testing */
  testID?: string
}

// ============================================================================
// CONSTANTS
// ============================================================================

/** Vibe emoji mapping */
const VIBE_EMOJIS: Record<HangoutVibe, string> = {
  chill: '🧊',
  party: '🎉',
  adventure: '🏔️',
  food: '🍕',
  creative: '🎨',
  active: '⚡',
}

/** Max attendee avatars to show */
const MAX_AVATAR_DISPLAY = 3

// ============================================================================
// COMPONENT
// ============================================================================

export function HangoutCard({
  hangout,
  isAttending,
  onJoin,
  onLeave,
  testID = 'hangout-card',
}: HangoutCardProps): React.ReactNode {
  // ---------------------------------------------------------------------------
  // Computed Values
  // ---------------------------------------------------------------------------

  /** Vibe emoji or default */
  const vibeEmoji = hangout.vibe ? VIBE_EMOJIS[hangout.vibe] : '📍'

  /** Formatted time display */
  const timeDisplay = useMemo(() => {
    const scheduledDate = new Date(hangout.scheduled_for)

    if (isToday(scheduledDate)) {
      // "In 2 hours" or "7:30 PM"
      const distance = formatDistanceToNow(scheduledDate, { addSuffix: true })
      return distance.replace('in about', 'In').replace('in less than', 'In')
    } else if (isTomorrow(scheduledDate)) {
      // "Tomorrow 7pm"
      return `Tomorrow ${format(scheduledDate, 'h:mm a')}`
    } else {
      // "Sat 7pm" or "Feb 15 7pm"
      const now = new Date()
      const daysDiff = Math.floor((scheduledDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

      if (daysDiff <= 7) {
        return format(scheduledDate, 'EEE h:mm a')
      } else {
        return format(scheduledDate, 'MMM d h:mm a')
      }
    }
  }, [hangout.scheduled_for])

  /** Whether hangout is full */
  const isFull = hangout.status === 'full' || hangout.attendee_count >= hangout.max_attendees

  /** Remaining spots */
  const remainingSpots = hangout.max_attendees - hangout.attendee_count

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  const handleActionPress = useCallback(async () => {
    await selectionFeedback()
    if (isAttending) {
      await onLeave()
    } else {
      await onJoin()
    }
  }, [isAttending, onJoin, onLeave])

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <PressableScale
      style={styles.card}
      onPress={() => {}} // Card itself doesn't need press action, just visual feedback
      testID={testID}
    >
      <View style={styles.header}>
        {/* Vibe Icon */}
        <View style={styles.vibeIcon}>
          <Text style={styles.vibeEmoji}>{vibeEmoji}</Text>
        </View>

        {/* Title and Location */}
        <View style={styles.titleContainer}>
          <Text style={styles.title} numberOfLines={1}>
            {hangout.title}
          </Text>
          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={12} color={darkTheme.textMuted} />
            <Text style={styles.locationText} numberOfLines={1}>
              {hangout.location_name}
            </Text>
          </View>
        </View>

        {/* Status Badge */}
        {isFull && (
          <View style={styles.fullBadge}>
            <Text style={styles.fullText}>Full</Text>
          </View>
        )}
      </View>

      {/* Time and Attendees Row */}
      <View style={styles.metaRow}>
        {/* Time */}
        <View style={styles.timeContainer}>
          <Ionicons name="time-outline" size={14} color={darkTheme.accent} />
          <Text style={styles.timeText}>{timeDisplay}</Text>
        </View>

        {/* Attendees */}
        <View style={styles.attendeesContainer}>
          <Ionicons name="people-outline" size={14} color={darkTheme.textMuted} />
          <Text style={styles.attendeesText}>
            {hangout.attendee_count}/{hangout.max_attendees}
          </Text>
        </View>
      </View>

      {/* Action Button */}
      <TouchableOpacity
        style={[
          styles.actionButton,
          isAttending && styles.actionButtonAttending,
          isFull && !isAttending && styles.actionButtonDisabled,
        ]}
        onPress={handleActionPress}
        activeOpacity={0.8}
        disabled={isFull && !isAttending}
        testID={`${testID}-action-button`}
      >
        <Ionicons
          name={isAttending ? 'checkmark-circle' : 'add-circle-outline'}
          size={18}
          color={isAttending ? darkTheme.success : '#FFFFFF'}
        />
        <Text
          style={[
            styles.actionButtonText,
            isAttending && styles.actionButtonTextAttending,
          ]}
        >
          {isAttending ? 'Going' : isFull ? 'Full' : `Join${remainingSpots <= 2 ? ` (${remainingSpots} left)` : ''}`}
        </Text>
      </TouchableOpacity>
    </PressableScale>
  )
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  card: {
    backgroundColor: darkTheme.cardBackground,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: darkTheme.cardBorder,
    padding: spacing[4],
    gap: spacing[3],
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[2.5],
  },
  vibeIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  vibeEmoji: {
    fontSize: 20,
  },
  titleContainer: {
    flex: 1,
    gap: spacing[1],
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: darkTheme.textPrimary,
    lineHeight: 20,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
  },
  locationText: {
    fontSize: 13,
    color: darkTheme.textMuted,
    fontWeight: '500',
    flex: 1,
  },
  fullBadge: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderRadius: 8,
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  fullText: {
    fontSize: 11,
    fontWeight: '700',
    color: darkTheme.error,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing[2],
    borderTopWidth: 1,
    borderTopColor: darkTheme.cardBorder,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1.5],
  },
  timeText: {
    fontSize: 13,
    fontWeight: '600',
    color: darkTheme.accent,
  },
  attendeesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1.5],
  },
  attendeesText: {
    fontSize: 13,
    fontWeight: '600',
    color: darkTheme.textMuted,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[1.5],
    backgroundColor: darkTheme.primary,
    borderRadius: 12,
    paddingVertical: spacing[2.5],
    paddingHorizontal: spacing[4],
    ...Platform.select({
      ios: {
        shadowColor: darkTheme.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  actionButtonAttending: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  actionButtonDisabled: {
    backgroundColor: darkTheme.surface,
    opacity: 0.6,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  actionButtonTextAttending: {
    color: darkTheme.success,
  },
})
