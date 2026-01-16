/**
 * FloatingActionButtons
 *
 * A floating button container positioned below the GlobalHeader on the right side.
 * Contains Check In and Live View buttons stacked vertically.
 *
 * Features:
 * - Check In button (top) - Opens check-in flow
 * - Live View button (bottom) - Shows who's checked in at current location
 * - Positioned absolutely on top-right, below header
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

import React, { useState, useCallback } from 'react'
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  type ViewStyle,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'

import { CheckInButton } from '../checkin/CheckInButton'
import { LiveViewModal } from '../modals/LiveViewModal'
import { useCheckin } from '../../hooks/useCheckin'
import { selectionFeedback } from '../../lib/haptics'

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * GlobalHeader height calculation (must match GlobalHeader.tsx):
 * - topRow: paddingVertical (12) + button height (40) + paddingVertical (12) = 64
 * - border: 1px
 * Total fixed header height (excluding safe area): 65px
 */
const HEADER_FIXED_HEIGHT = 65

/**
 * Gap between header and floating buttons
 */
const HEADER_GAP = 8

// ============================================================================
// TYPES
// ============================================================================

export interface FloatingActionButtonsProps {
  /** Additional style for the container */
  style?: ViewStyle
  /** Test ID prefix for testing */
  testID?: string
}

// ============================================================================
// COMPONENT
// ============================================================================

export function FloatingActionButtons({
  style,
  testID = 'floating-action-buttons',
}: FloatingActionButtonsProps): React.ReactNode {
  const insets = useSafeAreaInsets()
  const { activeCheckin } = useCheckin()
  const [showLiveView, setShowLiveView] = useState(false)

  // Calculate dynamic top position based on header height + safe area
  const dynamicTop = insets.top + HEADER_FIXED_HEIGHT + HEADER_GAP

  /**
   * Handle Live View button press
   */
  const handleLiveViewPress = useCallback(async () => {
    await selectionFeedback()
    setShowLiveView(true)
  }, [])

  /**
   * Handle Live View modal close
   */
  const handleLiveViewClose = useCallback(() => {
    setShowLiveView(false)
  }, [])

  return (
    <>
      <View style={[styles.container, { top: dynamicTop }, style]} testID={testID}>
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
        >
          <Ionicons
            name="people"
            size={20}
            color={activeCheckin ? '#FFFFFF' : '#5856D6'}
          />
          <Text
            style={[
              styles.liveViewText,
              activeCheckin ? styles.liveViewTextActive : styles.liveViewTextDefault,
            ]}
          >
            Live View
          </Text>
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
    // top is set dynamically based on safe area insets
    right: 16,
    zIndex: 100,
    gap: 8,
    alignItems: 'flex-end',
  },
  liveViewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  liveViewButtonDefault: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#5856D6',
  },
  liveViewButtonActive: {
    backgroundColor: '#5856D6',
  },
  liveViewText: {
    fontSize: 14,
    fontWeight: '600',
  },
  liveViewTextDefault: {
    color: '#5856D6',
  },
  liveViewTextActive: {
    color: '#FFFFFF',
  },
})

export default FloatingActionButtons
