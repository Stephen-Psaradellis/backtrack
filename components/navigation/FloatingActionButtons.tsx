/**
 * FloatingActionButtons
 *
 * A floating button container positioned above the tab bar on the right side.
 * Contains Check In and Live View buttons stacked vertically.
 *
 * Features:
 * - Check In button (top) - Opens check-in flow
 * - Live View button (bottom) - Shows who's checked in at current location
 * - Positioned absolutely on bottom-right, above tab bar
 * - Consistent across all tab screens
 *
 * @example
 * ```tsx
 * <View style={styles.container}>
 *   <GlobalHeader />
 *   <FloatingActionButtons />
 *   {/* Screen content *\/}
 * </View>
 * ```
 */

import React, { useState, useCallback, memo } from 'react'
import {
  View,
  TouchableOpacity,
  StyleSheet,
  type ViewStyle,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'

import { CheckInButton } from '../checkin/CheckInButton'
import { LiveViewModal } from '../modals/LiveViewModal'
import { useCheckin } from '../../hooks/useCheckin'
import { selectionFeedback } from '../../lib/haptics'
import { darkTheme } from '../../constants/glassStyles'
import { colors } from '../../constants/theme'

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Tab bar height calculation (must match AnimatedTabBar.tsx):
 * - paddingTop: 12
 * - icon + paddingVertical: ~36
 * Total fixed tab bar height (excluding safe area bottom): ~50px
 */
const TAB_BAR_HEIGHT = 50

/**
 * Gap between FABs and tab bar
 */
const TAB_BAR_GAP = 16

// ============================================================================
// TYPES
// ============================================================================

export interface FloatingActionButtonsProps {
  /** Additional style for the container */
  style?: ViewStyle
  /** Test ID prefix for testing */
  testID?: string
  /** Controls whether the FABs are rendered. Defaults to true. Set to false on screens where FABs should be hidden (e.g., Profile, Chats). */
  isVisible?: boolean
}

// ============================================================================
// COMPONENT
// ============================================================================

function FloatingActionButtonsBase({
  style,
  testID = 'floating-action-buttons',
  isVisible = true,
}: FloatingActionButtonsProps): React.ReactNode {
  const insets = useSafeAreaInsets()
  const { activeCheckin, getActiveCheckin } = useCheckin()
  const [showLiveView, setShowLiveView] = useState(false)

  // Hide FABs on screens where they are not relevant (e.g., Profile, Chats)
  if (!isVisible) {
    return null
  }

  // Calculate dynamic bottom position above tab bar + safe area
  const dynamicBottom = TAB_BAR_HEIGHT + Math.max(insets.bottom, 8) + TAB_BAR_GAP

  /**
   * Handle Live View button press
   */
  const handleLiveViewPress = useCallback(async () => {
    await selectionFeedback()
    // Re-fetch active checkin to ensure we have latest state (useCheckin is per-instance)
    await getActiveCheckin()
    setShowLiveView(true)
  }, [getActiveCheckin])

  /**
   * Handle Live View modal close
   */
  const handleLiveViewClose = useCallback(() => {
    setShowLiveView(false)
  }, [])

  return (
    <>
      <View style={[styles.container, { bottom: dynamicBottom }, style]} testID={testID}>
        {/* Check In Button */}
        <CheckInButton testID={`${testID}-checkin`} />

        {/* Live View Button */}
        <TouchableOpacity
          style={[
            styles.liveViewButton,
            activeCheckin ? styles.liveViewButtonActive : styles.liveViewButtonDefault,
          ]}
          onPress={handleLiveViewPress}
          activeOpacity={0.8}
          testID={`${testID}-live-view`}
          accessibilityRole="button"
          accessibilityLabel={
            activeCheckin
              ? `View who's at ${activeCheckin.location_name}`
              : 'Live View - Check in to see who else is here'
          }
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
        >
          <Ionicons
            name="people"
            size={18}
            color={activeCheckin ? '#FFFFFF' : colors.accent[500]}
          />
        </TouchableOpacity>
      </View>

      {/* Live View Modal */}
      <LiveViewModal
        visible={showLiveView}
        onClose={handleLiveViewClose}
        locationId={activeCheckin?.location_id}
        locationName={activeCheckin?.location_name}
        testID={`${testID}-live-view-modal`}
      />
    </>
  )
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    // bottom is set dynamically based on tab bar height + safe area
    right: 16,
    zIndex: 100,
    gap: 8,
    alignItems: 'flex-end',
  },
  liveViewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 6,
    shadowColor: colors.accent[500],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  liveViewButtonDefault: {
    backgroundColor: darkTheme.surface,
    borderWidth: 1,
    borderColor: colors.accent[500],
  },
  liveViewButtonActive: {
    backgroundColor: colors.accent[500],
  },
})

export const FloatingActionButtons = memo(FloatingActionButtonsBase)

export default FloatingActionButtons
