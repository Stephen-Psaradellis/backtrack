/**
 * AttendanceButton Component
 *
 * Displays attendance buttons (Going/Interested) for events.
 * Allows users to indicate their attendance status.
 *
 * Features:
 * - Toggle between Going, Interested, or neither
 * - Shows current counts for each status
 * - Loading state during updates
 * - Accessible with proper labels
 *
 * @example
 * ```tsx
 * <AttendanceButton
 *   userStatus={userStatus}
 *   goingCount={goingCount}
 *   interestedCount={interestedCount}
 *   onToggleGoing={toggleGoing}
 *   onToggleInterested={toggleInterested}
 *   isLoading={isUpdating}
 * />
 * ```
 */

import React, { memo } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  type ViewStyle,
} from 'react-native'
import { SvgXml } from 'react-native-svg'
import type { AttendanceStatus } from '../../hooks/useEventAttendance'

// ============================================================================
// Types
// ============================================================================

/**
 * Props for the AttendanceButton component
 */
export interface AttendanceButtonProps {
  /**
   * Current user's attendance status
   */
  userStatus: AttendanceStatus

  /**
   * Number of users marked "going"
   */
  goingCount: number

  /**
   * Number of users marked "interested"
   */
  interestedCount: number

  /**
   * Callback when "Going" button is pressed
   */
  onToggleGoing: () => void

  /**
   * Callback when "Interested" button is pressed
   */
  onToggleInterested: () => void

  /**
   * Whether an update is in progress
   */
  isLoading?: boolean

  /**
   * Whether the buttons are disabled
   */
  disabled?: boolean

  /**
   * Layout mode
   * - 'row': Buttons side by side (default)
   * - 'column': Buttons stacked
   */
  layout?: 'row' | 'column'

  /**
   * Size of the buttons
   */
  size?: 'sm' | 'md' | 'lg'

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

const checkIconSvg = `
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
  <polyline points="20 6 9 17 4 12"></polyline>
</svg>
`

const starIconSvg = `
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
</svg>
`

const starFilledIconSvg = `
<svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
</svg>
`

// ============================================================================
// Size Configurations
// ============================================================================

const SIZE_CONFIG = {
  sm: {
    container: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 6 },
    icon: 14,
    text: 12,
    gap: 4,
  },
  md: {
    container: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8 },
    icon: 18,
    text: 14,
    gap: 6,
  },
  lg: {
    container: { paddingVertical: 12, paddingHorizontal: 20, borderRadius: 10 },
    icon: 20,
    text: 16,
    gap: 8,
  },
} as const

// ============================================================================
// Component
// ============================================================================

/**
 * AttendanceButton displays Going/Interested toggle buttons
 */
function AttendanceButtonComponent({
  userStatus,
  goingCount,
  interestedCount,
  onToggleGoing,
  onToggleInterested,
  isLoading = false,
  disabled = false,
  layout = 'row',
  size = 'md',
  style,
  testID = 'attendance-button',
}: AttendanceButtonProps) {
  const sizeConfig = SIZE_CONFIG[size]
  const isGoing = userStatus === 'going'
  const isInterested = userStatus === 'interested'
  const isDisabled = disabled || isLoading

  return (
    <View
      style={[
        styles.container,
        layout === 'column' && styles.containerColumn,
        style,
      ]}
      testID={testID}
    >
      {/* Going Button */}
      <TouchableOpacity
        style={[
          styles.button,
          sizeConfig.container,
          isGoing ? styles.buttonActiveGoing : styles.buttonInactive,
          isDisabled && styles.buttonDisabled,
        ]}
        onPress={onToggleGoing}
        disabled={isDisabled}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityState={{ selected: isGoing, disabled: isDisabled }}
        accessibilityLabel={`Going: ${goingCount} people. ${isGoing ? 'Selected' : 'Tap to RSVP'}`}
        testID={`${testID}-going`}
      >
        {isLoading && userStatus === 'going' ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <>
            <SvgXml
              xml={checkIconSvg}
              width={sizeConfig.icon}
              height={sizeConfig.icon}
              color={isGoing ? '#FFFFFF' : '#10B981'}
            />
            <Text
              style={[
                styles.buttonText,
                { fontSize: sizeConfig.text },
                isGoing ? styles.buttonTextActive : styles.buttonTextInactiveGoing,
              ]}
            >
              Going
            </Text>
            <Text
              style={[
                styles.countText,
                { fontSize: sizeConfig.text - 2 },
                isGoing ? styles.countTextActive : styles.countTextInactive,
              ]}
            >
              ({goingCount})
            </Text>
          </>
        )}
      </TouchableOpacity>

      {/* Interested Button */}
      <TouchableOpacity
        style={[
          styles.button,
          sizeConfig.container,
          isInterested ? styles.buttonActiveInterested : styles.buttonInactive,
          isDisabled && styles.buttonDisabled,
        ]}
        onPress={onToggleInterested}
        disabled={isDisabled}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityState={{ selected: isInterested, disabled: isDisabled }}
        accessibilityLabel={`Interested: ${interestedCount} people. ${isInterested ? 'Selected' : 'Tap to mark interested'}`}
        testID={`${testID}-interested`}
      >
        {isLoading && userStatus === 'interested' ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <>
            <SvgXml
              xml={isInterested ? starFilledIconSvg : starIconSvg}
              width={sizeConfig.icon}
              height={sizeConfig.icon}
              color={isInterested ? '#FFFFFF' : '#F59E0B'}
            />
            <Text
              style={[
                styles.buttonText,
                { fontSize: sizeConfig.text },
                isInterested
                  ? styles.buttonTextActive
                  : styles.buttonTextInactiveInterested,
              ]}
            >
              Interested
            </Text>
            <Text
              style={[
                styles.countText,
                { fontSize: sizeConfig.text - 2 },
                isInterested ? styles.countTextActive : styles.countTextInactive,
              ]}
            >
              ({interestedCount})
            </Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  )
}

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 8,
  },
  containerColumn: {
    flexDirection: 'column',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    flex: 1,
  },
  buttonInactive: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E5E7EB',
  },
  buttonActiveGoing: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  buttonActiveInterested: {
    backgroundColor: '#F59E0B',
    borderColor: '#F59E0B',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    fontWeight: '600',
    marginLeft: 6,
  },
  buttonTextActive: {
    color: '#FFFFFF',
  },
  buttonTextInactiveGoing: {
    color: '#10B981',
  },
  buttonTextInactiveInterested: {
    color: '#F59E0B',
  },
  countText: {
    marginLeft: 4,
    fontWeight: '500',
  },
  countTextActive: {
    color: 'rgba(255, 255, 255, 0.9)',
  },
  countTextInactive: {
    color: '#9CA3AF',
  },
})

// ============================================================================
// Export
// ============================================================================

/**
 * Memoized AttendanceButton for performance optimization
 */
export const AttendanceButton = memo(AttendanceButtonComponent)

export default AttendanceButton
