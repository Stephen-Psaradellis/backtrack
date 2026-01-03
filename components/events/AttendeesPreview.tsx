/**
 * AttendeesPreview Component
 *
 * Displays a preview of event attendees with stacked avatars.
 * Shows a "+N more" indicator when there are additional attendees.
 *
 * Features:
 * - Stacked avatar display
 * - Configurable max avatars shown
 * - Shows count of additional attendees
 * - Verified badge support
 * - Tap to view full list
 *
 * @example
 * ```tsx
 * <AttendeesPreview
 *   attendees={attendees}
 *   totalCount={goingCount}
 *   onPress={() => showAttendeesModal()}
 * />
 * ```
 */

import React, { memo } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  type ViewStyle,
} from 'react-native'
import { SvgXml } from 'react-native-svg'
import type { EventAttendee } from '../../hooks/useEventAttendance'

// ============================================================================
// Types
// ============================================================================

/**
 * Props for the AttendeesPreview component
 */
export interface AttendeesPreviewProps {
  /**
   * List of attendees to display
   */
  attendees: EventAttendee[]

  /**
   * Total count of attendees (for "+N more" display)
   */
  totalCount: number

  /**
   * Maximum number of avatars to show
   * @default 5
   */
  maxAvatars?: number

  /**
   * Size of each avatar
   * @default 32
   */
  avatarSize?: number

  /**
   * Label to show (e.g., "going", "interested")
   * @default "going"
   */
  label?: string

  /**
   * Callback when the component is pressed
   */
  onPress?: () => void

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
// Icons
// ============================================================================

const personIconSvg = `
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
  <circle cx="12" cy="7" r="4"></circle>
</svg>
`

// ============================================================================
// Component
// ============================================================================

/**
 * AttendeesPreview displays stacked avatars of event attendees
 */
function AttendeesPreviewComponent({
  attendees,
  totalCount,
  maxAvatars = 5,
  avatarSize = 32,
  label = 'going',
  onPress,
  style,
  testID = 'attendees-preview',
}: AttendeesPreviewProps) {
  // Don't render if no attendees
  if (totalCount === 0) {
    return null
  }

  const displayedAttendees = attendees.slice(0, maxAvatars)
  const remainingCount = totalCount - displayedAttendees.length
  const overlap = avatarSize * 0.3 // 30% overlap

  const Container = onPress ? TouchableOpacity : View

  return (
    <Container
      style={[styles.container, style]}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole={onPress ? 'button' : 'none'}
      accessibilityLabel={`${totalCount} people ${label}`}
      testID={testID}
    >
      {/* Stacked Avatars */}
      <View style={styles.avatarsContainer}>
        {displayedAttendees.map((attendee, index) => (
          <View
            key={attendee.user_id}
            style={[
              styles.avatarWrapper,
              {
                width: avatarSize,
                height: avatarSize,
                marginLeft: index === 0 ? 0 : -overlap,
                zIndex: displayedAttendees.length - index,
              },
            ]}
          >
            {attendee.avatar_url ? (
              <Image
                source={{ uri: attendee.avatar_url }}
                style={[
                  styles.avatar,
                  { width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2 },
                ]}
              />
            ) : (
              <View
                style={[
                  styles.avatarPlaceholder,
                  { width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2 },
                ]}
              >
                <SvgXml
                  xml={personIconSvg}
                  width={avatarSize * 0.5}
                  height={avatarSize * 0.5}
                  color="#9CA3AF"
                />
              </View>
            )}
          </View>
        ))}

        {/* "+N more" indicator */}
        {remainingCount > 0 && (
          <View
            style={[
              styles.moreIndicator,
              {
                width: avatarSize,
                height: avatarSize,
                marginLeft: -overlap,
                borderRadius: avatarSize / 2,
              },
            ]}
          >
            <Text
              style={[
                styles.moreText,
                { fontSize: avatarSize * 0.35 },
              ]}
            >
              +{remainingCount > 99 ? '99+' : remainingCount}
            </Text>
          </View>
        )}
      </View>

      {/* Label */}
      <Text style={styles.label}>
        {totalCount} {label}
      </Text>
    </Container>
  )
}

// ============================================================================
// Compact Version
// ============================================================================

/**
 * Props for compact version
 */
export interface AttendeesCompactProps {
  goingCount: number
  interestedCount: number
  onPress?: () => void
  style?: ViewStyle
  testID?: string
}

/**
 * Compact attendees display showing just counts
 */
export function AttendeesCompact({
  goingCount,
  interestedCount,
  onPress,
  style,
  testID = 'attendees-compact',
}: AttendeesCompactProps) {
  const Container = onPress ? TouchableOpacity : View

  return (
    <Container
      style={[styles.compactContainer, style]}
      onPress={onPress}
      activeOpacity={0.7}
      testID={testID}
    >
      {goingCount > 0 && (
        <View style={styles.compactItem}>
          <Text style={styles.compactCount}>{goingCount}</Text>
          <Text style={styles.compactLabel}>going</Text>
        </View>
      )}
      {goingCount > 0 && interestedCount > 0 && (
        <View style={styles.compactDivider} />
      )}
      {interestedCount > 0 && (
        <View style={styles.compactItem}>
          <Text style={styles.compactCount}>{interestedCount}</Text>
          <Text style={styles.compactLabel}>interested</Text>
        </View>
      )}
    </Container>
  )
}

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarWrapper: {
    borderWidth: 2,
    borderColor: '#FFFFFF',
    borderRadius: 100,
    overflow: 'hidden',
  },
  avatar: {
    backgroundColor: '#E5E7EB',
  },
  avatarPlaceholder: {
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  moreIndicator: {
    backgroundColor: '#374151',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  moreText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  label: {
    marginLeft: 8,
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  // Compact styles
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  compactItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  compactCount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginRight: 3,
  },
  compactLabel: {
    fontSize: 13,
    color: '#6B7280',
  },
  compactDivider: {
    width: 1,
    height: 14,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 10,
  },
})

// ============================================================================
// Export
// ============================================================================

/**
 * Memoized AttendeesPreview for performance optimization
 */
export const AttendeesPreview = memo(AttendeesPreviewComponent)

export default AttendeesPreview
