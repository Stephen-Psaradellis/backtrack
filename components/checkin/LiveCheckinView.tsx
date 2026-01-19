/**
 * LiveCheckinView
 *
 * Component showing users currently checked in at a location.
 * Access is restricted:
 * - IF user is checked into location AND currently within 200m → show live view
 * - OR IF user is a Regular at location → show live view
 * - ELSE → show greyed out card with CTA
 *
 * @example
 * ```tsx
 * <LiveCheckinView
 *   locationId="abc-123"
 *   locationName="Coffee Shop"
 *   testID="location-live-view"
 * />
 * ```
 */

import React, { useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  type ViewStyle,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'

import { useLiveCheckins } from '../../hooks/useLiveCheckins'
import { useCheckin } from '../../hooks/useCheckin'
import { Avatar2DDisplay } from '../avatar2d'
import { LoadingSpinner } from '../LoadingSpinner'
import { selectionFeedback } from '../../lib/haptics'
import type { LiveCheckinUser } from '../../types/database'
import { darkTheme } from '../../constants/glassStyles'
import { colors } from '../../constants/theme'

// ============================================================================
// TYPES
// ============================================================================

export interface LiveCheckinViewProps {
  /** Location ID to show check-ins for */
  locationId: string
  /** Location name for display */
  locationName: string
  /** Additional container style */
  style?: ViewStyle
  /** Callback when check-in CTA is pressed */
  onCheckIn?: () => void
  /** Test ID for testing */
  testID?: string
}

// ============================================================================
// COMPONENT
// ============================================================================

export function LiveCheckinView({
  locationId,
  locationName,
  style,
  onCheckIn,
  testID = 'live-checkin-view',
}: LiveCheckinViewProps): React.ReactNode {
  const {
    checkins,
    count,
    hasAccess,
    accessReason,
    isLoading,
    error,
  } = useLiveCheckins(locationId)

  const { checkIn, isCheckingIn } = useCheckin()

  /**
   * Handle check-in CTA press
   */
  const handleCheckInPress = useCallback(async () => {
    await selectionFeedback()
    if (onCheckIn) {
      onCheckIn()
    } else {
      // Default behavior: check in to this location
      await checkIn(locationId)
    }
  }, [onCheckIn, checkIn, locationId])

  /**
   * Render individual user item
   */
  const renderUserItem = useCallback(({ item }: { item: LiveCheckinUser }) => (
    <View style={styles.userItem}>
      <View style={styles.userAvatar}>
        {item.avatar ? (
          <Avatar2DDisplay avatar={item.avatar} size="sm" />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Ionicons name="person" size={20} color={darkTheme.textMuted} />
          </View>
        )}
      </View>
      {item.display_name && (
        <Text style={styles.userName} numberOfLines={1}>
          {item.display_name}
        </Text>
      )}
    </View>
  ), [])

  // ---------------------------------------------------------------------------
  // RENDER: LOADING
  // ---------------------------------------------------------------------------

  if (isLoading) {
    return (
      <View style={[styles.container, style]} testID={testID}>
        <View style={styles.header}>
          <Ionicons name="people" size={20} color={colors.primary[500]} />
          <Text style={styles.title}>Live View</Text>
        </View>
        <View style={styles.loadingContainer}>
          <LoadingSpinner size="small" />
        </View>
      </View>
    )
  }

  // ---------------------------------------------------------------------------
  // RENDER: NO ACCESS
  // ---------------------------------------------------------------------------

  if (!hasAccess) {
    return (
      <View style={[styles.container, styles.containerNoAccess, style]} testID={testID}>
        <View style={styles.header}>
          <Ionicons name="people" size={20} color={darkTheme.textMuted} />
          <Text style={[styles.title, styles.titleNoAccess]}>Live View</Text>
          {count > 0 && (
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>{count}</Text>
            </View>
          )}
        </View>

        <View style={styles.noAccessContent}>
          <Ionicons name="lock-closed-outline" size={32} color={darkTheme.textMuted} />
          <Text style={styles.noAccessText}>
            Check into {locationName} or become a Regular to see who else is here
          </Text>
          <TouchableOpacity
            style={styles.checkInCTA}
            onPress={handleCheckInPress}
            disabled={isCheckingIn}
            activeOpacity={0.8}
            testID={`${testID}-checkin-cta`}
          >
            {isCheckingIn ? (
              <LoadingSpinner size="small" />
            ) : (
              <>
                <Ionicons name="location" size={18} color="#FFFFFF" />
                <Text style={styles.checkInCTAText}>Check In</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  // ---------------------------------------------------------------------------
  // RENDER: HAS ACCESS
  // ---------------------------------------------------------------------------

  return (
    <View style={[styles.container, style]} testID={testID}>
      <View style={styles.header}>
        <Ionicons name="people" size={20} color={colors.primary[500]} />
        <Text style={styles.title}>Live View</Text>
        <View style={[styles.countBadge, styles.countBadgeActive]}>
          <Text style={[styles.countBadgeText, styles.countBadgeTextActive]}>
            {count} here
          </Text>
        </View>
        {accessReason === 'regular' && (
          <View style={styles.regularBadge}>
            <Text style={styles.regularBadgeText}>Regular</Text>
          </View>
        )}
      </View>

      {checkins.length === 0 ? (
        <View style={styles.emptyContent}>
          <Text style={styles.emptyText}>No one else is checked in right now</Text>
        </View>
      ) : (
        <FlatList
          data={checkins}
          renderItem={renderUserItem}
          keyExtractor={(item) => item.user_id}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.userList}
          testID={`${testID}-user-list`}
        />
      )}
    </View>
  )
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    backgroundColor: darkTheme.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: darkTheme.glassBorder,
    shadowColor: colors.primary[500],
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  containerNoAccess: {
    backgroundColor: darkTheme.surfaceElevated,
    borderColor: darkTheme.glassBorder,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: darkTheme.textPrimary,
    flex: 1,
  },
  titleNoAccess: {
    color: darkTheme.textMuted,
  },
  countBadge: {
    backgroundColor: darkTheme.glass,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  countBadgeActive: {
    backgroundColor: 'rgba(255, 107, 71, 0.15)',
  },
  countBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: darkTheme.textSecondary,
  },
  countBadgeTextActive: {
    color: colors.primary[500],
  },
  regularBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  regularBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: darkTheme.success,
  },
  loadingContainer: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  noAccessContent: {
    alignItems: 'center',
    paddingVertical: 16,
    gap: 12,
  },
  noAccessText: {
    fontSize: 14,
    color: darkTheme.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 8,
  },
  checkInCTA: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary[500],
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 6,
  },
  checkInCTAText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  emptyContent: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: darkTheme.textMuted,
  },
  userList: {
    paddingVertical: 8,
    gap: 12,
  },
  userItem: {
    alignItems: 'center',
    marginRight: 12,
    width: 60,
  },
  userAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: darkTheme.glass,
    marginBottom: 4,
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: darkTheme.glass,
  },
  userName: {
    fontSize: 12,
    color: darkTheme.textSecondary,
    textAlign: 'center',
  },
})

export default LiveCheckinView
