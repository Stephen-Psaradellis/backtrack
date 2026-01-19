/**
 * LiveViewModal Component
 *
 * A full-screen modal displaying users currently checked in at a location.
 * Shows an avatar grid when the user has access (checked in or is a Regular),
 * otherwise prompts them to check in.
 *
 * Features:
 * - Full-screen modal display
 * - Avatar grid showing checked-in users
 * - Count badge showing number of people present
 * - Check-in prompt when user has no access
 * - Loading and error states
 * - Real-time updates via useLiveCheckins
 *
 * @module components/modals/LiveViewModal
 *
 * @example
 * ```tsx
 * import { LiveViewModal } from 'components/modals/LiveViewModal'
 *
 * <LiveViewModal
 *   visible={showLiveView}
 *   onClose={() => setShowLiveView(false)}
 *   locationId="abc-123"
 *   locationName="Coffee Shop"
 * />
 * ```
 */

import React, { memo, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'

import { useLiveCheckins } from '../../hooks/useLiveCheckins'
import { CheckInButton } from '../checkin/CheckInButton'
import { Avatar2DDisplay } from '../avatar2d'
import { LoadingSpinner } from '../LoadingSpinner'
import { lightFeedback } from '../../lib/haptics'
import type { LiveCheckinUser } from '../../types/database'
import { darkTheme } from '../../constants/glassStyles'
import { colors } from '../../constants/theme'

// ============================================================================
// TYPES
// ============================================================================

/**
 * Props for the LiveViewModal component
 */
export interface LiveViewModalProps {
  /**
   * Whether the modal is visible
   */
  visible: boolean

  /**
   * Callback when modal is closed
   */
  onClose: () => void

  /**
   * ID of the location to show live check-ins for
   */
  locationId?: string | null

  /**
   * Name of the location for display
   */
  locationName?: string

  /**
   * Test ID for testing purposes
   */
  testID?: string
}

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Colors used in the LiveViewModal component - using centralized dark theme
 */
const COLORS = {
  primary: colors.primary[500],
  background: darkTheme.background,
  overlay: 'rgba(0, 0, 0, 0.9)',
  border: darkTheme.glassBorder,
  textPrimary: darkTheme.textPrimary,
  textSecondary: darkTheme.textSecondary,
  textDark: darkTheme.textPrimary,
  cardBackground: darkTheme.surface,
  avatarBackground: darkTheme.surfaceElevated,
  badgeBackground: colors.primary[500],
  regularBadge: darkTheme.success,
} as const

// ============================================================================
// SUBCOMPONENTS
// ============================================================================

/**
 * Individual avatar item in the grid
 */
interface AvatarItemProps {
  user: LiveCheckinUser
  testID?: string
}

const AvatarItem = memo(function AvatarItem({
  user,
  testID,
}: AvatarItemProps): JSX.Element {
  return (
    <View style={styles.avatarItem} testID={testID}>
      <View style={styles.avatarContainer}>
        {user.avatar ? (
          <Avatar2DDisplay avatar={user.avatar} size="md" />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Ionicons name="person" size={24} color={COLORS.textSecondary} />
          </View>
        )}
      </View>
      {user.display_name && (
        <Text style={styles.avatarName} numberOfLines={1}>
          {user.display_name}
        </Text>
      )}
      {user.is_verified && (
        <View style={styles.verifiedBadge}>
          <Ionicons name="checkmark-circle" size={14} color="#34C759" />
        </View>
      )}
    </View>
  )
})

/**
 * Not checked in state - prompts user to check in
 */
interface NotCheckedInViewProps {
  locationName?: string
  accessReason: string
  testID?: string
}

function NotCheckedInView({
  locationName,
  accessReason,
  testID,
}: NotCheckedInViewProps): JSX.Element {
  return (
    <View style={styles.notCheckedInContainer} testID={testID}>
      <View style={styles.lockIconContainer}>
        <Ionicons name="lock-closed-outline" size={48} color={COLORS.textSecondary} />
      </View>
      <Text style={styles.notCheckedInTitle}>
        Check in to see who{'\u0027'}s here
      </Text>
      <Text style={styles.notCheckedInMessage}>
        {accessReason === 'not_authenticated'
          ? 'Sign in to see other users at this location'
          : `Check in to ${locationName || 'this location'} or become a Regular to see who else is here`}
      </Text>
      <View style={styles.checkInButtonContainer}>
        <CheckInButton testID={`${testID}-checkin-button`} />
      </View>
    </View>
  )
}

/**
 * Empty state when checked in but no others present
 */
function EmptyLiveView({ testID }: { testID?: string }): JSX.Element {
  return (
    <View style={styles.emptyContainer} testID={testID}>
      <Text style={styles.emptyIcon}>{'👤'}</Text>
      <Text style={styles.emptyTitle}>You{'\u0027'}re the only one here</Text>
      <Text style={styles.emptyMessage}>
        Check back later to see who else shows up!
      </Text>
    </View>
  )
}

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * LiveViewModal - A full-screen modal for viewing live check-ins
 */
export const LiveViewModal = memo(function LiveViewModal({
  visible,
  onClose,
  locationId,
  locationName,
  testID = 'live-view-modal',
}: LiveViewModalProps): JSX.Element {
  // ---------------------------------------------------------------------------
  // HOOKS
  // ---------------------------------------------------------------------------

  const {
    checkins,
    count,
    hasAccess,
    accessReason,
    isLoading,
    error,
  } = useLiveCheckins(locationId || null, { enabled: visible && !!locationId })

  // ---------------------------------------------------------------------------
  // HANDLERS
  // ---------------------------------------------------------------------------

  /**
   * Handle close button press
   */
  const handleClose = useCallback(async () => {
    await lightFeedback()
    onClose()
  }, [onClose])

  // ---------------------------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------------------------

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={false}
      onRequestClose={handleClose}
      testID={testID}
    >
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={handleClose}
            style={styles.closeButton}
            testID={`${testID}-close`}
            accessibilityLabel="Close live view"
            accessibilityRole="button"
          >
            <Ionicons name="close" size={28} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <View style={styles.titleContainer}>
            <Ionicons name="people" size={20} color={COLORS.primary} />
            <Text style={styles.title} numberOfLines={1} testID={`${testID}-title`}>
              Live at {locationName || 'Location'}
            </Text>
          </View>
          {/* Count badge */}
          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>
              {count} {count === 1 ? 'person' : 'people'}
            </Text>
          </View>
        </View>

        {/* Access indicator */}
        {hasAccess && accessReason === 'regular' && (
          <View style={styles.accessBadge}>
            <Ionicons name="star" size={14} color={COLORS.regularBadge} />
            <Text style={styles.accessBadgeText}>Regular Access</Text>
          </View>
        )}
        {hasAccess && accessReason === 'checked_in' && (
          <View style={styles.accessBadge}>
            <Ionicons name="location" size={14} color={COLORS.primary} />
            <Text style={styles.accessBadgeText}>Checked In</Text>
          </View>
        )}

        {/* Content */}
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          {!locationId ? (
            <View style={styles.noLocationContainer}>
              <Ionicons name="location-outline" size={48} color={COLORS.textSecondary} />
              <Text style={styles.noLocationText}>No location selected</Text>
            </View>
          ) : isLoading ? (
            <View style={styles.loadingContainer} testID={`${testID}-loading`}>
              <LoadingSpinner message="Loading live view..." />
            </View>
          ) : error ? (
            <View style={styles.errorContainer} testID={`${testID}-error`}>
              <Ionicons name="alert-circle-outline" size={48} color={COLORS.primary} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : !hasAccess ? (
            <NotCheckedInView
              locationName={locationName}
              accessReason={accessReason}
              testID={`${testID}-not-checked-in`}
            />
          ) : checkins.length === 0 ? (
            <EmptyLiveView testID={`${testID}-empty`} />
          ) : (
            <View style={styles.avatarGrid} testID={`${testID}-grid`}>
              {checkins.map((user) => (
                <AvatarItem
                  key={user.user_id}
                  user={user}
                  testID={`${testID}-avatar-${user.user_id}`}
                />
              ))}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  )
})

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  // Container
  container: {
    flex: 1,
    backgroundColor: COLORS.cardBackground,
  },

  // Header styles
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: darkTheme.glassBorder,
  },
  closeButton: {
    padding: 8,
    marginRight: 8,
  },
  titleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textPrimary,
    flex: 1,
  },
  countBadge: {
    backgroundColor: COLORS.badgeBackground,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  countBadgeText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },

  // Access badge
  accessBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    backgroundColor: darkTheme.surfaceElevated,
  },
  accessBadgeText: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },

  // Content styles
  content: {
    flex: 1,
  },
  contentContainer: {
    flexGrow: 1,
    padding: 16,
  },

  // Avatar grid
  avatarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    gap: 16,
  },
  avatarItem: {
    alignItems: 'center',
    width: 80,
    marginBottom: 8,
  },
  avatarContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    overflow: 'hidden',
    backgroundColor: COLORS.avatarBackground,
    marginBottom: 8,
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.avatarBackground,
  },
  avatarName: {
    fontSize: 12,
    color: COLORS.textPrimary,
    textAlign: 'center',
    maxWidth: 80,
  },
  verifiedBadge: {
    position: 'absolute',
    top: 0,
    right: 4,
    backgroundColor: COLORS.cardBackground,
    borderRadius: 8,
    padding: 2,
  },

  // Not checked in state
  notCheckedInContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  lockIconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: darkTheme.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  notCheckedInTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 12,
    textAlign: 'center',
  },
  notCheckedInMessage: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  checkInButtonContainer: {
    marginTop: 16,
  },

  // Empty state
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyMessage: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },

  // Loading state
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 48,
  },

  // Error state
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    gap: 16,
  },
  errorText: {
    fontSize: 14,
    color: COLORS.primary,
    textAlign: 'center',
    lineHeight: 20,
  },

  // No location state
  noLocationContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  noLocationText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
})

// ============================================================================
// DEFAULT EXPORT
// ============================================================================

export default LiveViewModal
