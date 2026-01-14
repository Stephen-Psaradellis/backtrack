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
import { SmAvatarSnapshot } from '../avatar3d'
import { LoadingSpinner } from '../LoadingSpinner'
import { selectionFeedback } from '../../lib/haptics'
import type { LiveCheckinUser } from '../../types/database'

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
          <SmAvatarSnapshot avatar={item.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Ionicons name="person" size={20} color="#8E8E93" />
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
          <Ionicons name="people" size={20} color="#FF6B47" />
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
          <Ionicons name="people" size={20} color="#8E8E93" />
          <Text style={[styles.title, styles.titleNoAccess]}>Live View</Text>
          {count > 0 && (
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>{count}</Text>
            </View>
          )}
        </View>

        <View style={styles.noAccessContent}>
          <Ionicons name="lock-closed-outline" size={32} color="#C0C0C0" />
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
        <Ionicons name="people" size={20} color="#FF6B47" />
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
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  containerNoAccess: {
    backgroundColor: '#F8F8F8',
    borderColor: '#E0E0E0',
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
    color: '#333333',
    flex: 1,
  },
  titleNoAccess: {
    color: '#8E8E93',
  },
  countBadge: {
    backgroundColor: '#F0F0F0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  countBadgeActive: {
    backgroundColor: '#FFF0EB',
  },
  countBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666666',
  },
  countBadgeTextActive: {
    color: '#FF6B47',
  },
  regularBadge: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  regularBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2E7D32',
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
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 8,
  },
  checkInCTA: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF6B47',
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
    color: '#8E8E93',
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
    backgroundColor: '#F0F0F0',
    marginBottom: 4,
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F0F0F0',
  },
  userName: {
    fontSize: 12,
    color: '#666666',
    textAlign: 'center',
  },
})

export default LiveCheckinView
