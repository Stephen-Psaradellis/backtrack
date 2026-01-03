/**
 * CheckinButton Component
 *
 * A button for checking in/out of locations with GPS verification.
 * Shows different states: not checked in, checked in (verified), loading.
 *
 * @example
 * ```tsx
 * <CheckinButton
 *   locationId="abc-123"
 *   locationName="Central Perk"
 *   onCheckinSuccess={(result) => console.log('Checked in:', result)}
 * />
 * ```
 */

import React, { memo, useCallback } from 'react'
import {
  TouchableOpacity,
  Text,
  View,
  ActivityIndicator,
  StyleSheet,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'

import { useCheckin, type CheckinResult, type CheckoutResult } from '../hooks/useCheckin'
import { triggerHaptic } from '../lib/haptics'

// ============================================================================
// TYPES
// ============================================================================

export interface CheckinButtonProps {
  /** ID of the location to check in/out of */
  locationId: string
  /** Name of the location (for accessibility) */
  locationName: string
  /** Callback when check-in succeeds */
  onCheckinSuccess?: (result: CheckinResult) => void
  /** Callback when check-out succeeds */
  onCheckoutSuccess?: (result: CheckoutResult) => void
  /** Callback when operation fails */
  onError?: (error: string) => void
  /** Size variant */
  size?: 'small' | 'medium' | 'large'
  /** Style variant */
  variant?: 'primary' | 'outline'
  /** Test ID for testing */
  testID?: string
}

// ============================================================================
// CONSTANTS
// ============================================================================

const COLORS = {
  primary: '#3B82F6', // Blue
  checkedIn: '#10B981', // Green (verified)
  unverified: '#F59E0B', // Amber (not verified)
  text: '#FFFFFF',
  textOutline: '#3B82F6',
  border: '#3B82F6',
} as const

const SIZES = {
  small: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    iconSize: 16,
    borderRadius: 6,
  },
  medium: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    iconSize: 20,
    borderRadius: 8,
  },
  large: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    fontSize: 18,
    iconSize: 24,
    borderRadius: 10,
  },
} as const

// ============================================================================
// COMPONENT
// ============================================================================

function CheckinButtonComponent({
  locationId,
  locationName,
  onCheckinSuccess,
  onCheckoutSuccess,
  onError,
  size = 'medium',
  variant = 'primary',
  testID,
}: CheckinButtonProps) {
  const {
    activeCheckin,
    isCheckingIn,
    isCheckingOut,
    isCheckedInAt,
    checkIn,
    checkOut,
  } = useCheckin()

  const isCheckedIn = isCheckedInAt(locationId)
  const isVerified = isCheckedIn && activeCheckin?.verified
  const isLoading = isCheckingIn || isCheckingOut
  const sizeConfig = SIZES[size]

  /**
   * Handle button press - toggle check-in state
   */
  const handlePress = useCallback(async () => {
    if (isLoading) return

    triggerHaptic('light')

    if (isCheckedIn) {
      const result = await checkOut(locationId)
      if (result.success) {
        triggerHaptic('success')
        onCheckoutSuccess?.(result)
      } else if (result.error) {
        triggerHaptic('error')
        onError?.(result.error)
      }
    } else {
      const result = await checkIn(locationId)
      if (result.success) {
        triggerHaptic('success')
        onCheckinSuccess?.(result)
      } else if (result.error) {
        triggerHaptic('error')
        onError?.(result.error)
      }
    }
  }, [
    isLoading,
    isCheckedIn,
    locationId,
    checkIn,
    checkOut,
    onCheckinSuccess,
    onCheckoutSuccess,
    onError,
  ])

  // Determine button colors
  let backgroundColor: string
  let textColor: string
  let borderColor: string

  if (isCheckedIn) {
    backgroundColor = isVerified ? COLORS.checkedIn : COLORS.unverified
    textColor = COLORS.text
    borderColor = isVerified ? COLORS.checkedIn : COLORS.unverified
  } else if (variant === 'outline') {
    backgroundColor = 'transparent'
    textColor = COLORS.textOutline
    borderColor = COLORS.border
  } else {
    backgroundColor = COLORS.primary
    textColor = COLORS.text
    borderColor = COLORS.primary
  }

  // Determine icon
  const iconName = isCheckedIn ? 'checkmark-circle' : 'location'

  // Determine label
  const label = isCheckedIn ? 'Checked In' : 'Check In'

  return (
    <TouchableOpacity
      onPress={handlePress}
      disabled={isLoading}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={
        isCheckedIn
          ? `Checked in at ${locationName}. Tap to check out.`
          : `Check in to ${locationName}`
      }
      accessibilityState={{ disabled: isLoading }}
      testID={testID}
      style={[
        styles.button,
        {
          backgroundColor,
          borderColor,
          paddingHorizontal: sizeConfig.paddingHorizontal,
          paddingVertical: sizeConfig.paddingVertical,
          borderRadius: sizeConfig.borderRadius,
          opacity: isLoading ? 0.7 : 1,
        },
      ]}
    >
      {isLoading ? (
        <ActivityIndicator color={textColor} size="small" />
      ) : (
        <>
          <Ionicons
            name={iconName}
            size={sizeConfig.iconSize}
            color={textColor}
          />
          <Text
            style={[
              styles.label,
              {
                color: textColor,
                fontSize: sizeConfig.fontSize,
              },
            ]}
          >
            {label}
          </Text>
          {isCheckedIn && isVerified && (
            <View style={styles.verifiedBadge}>
              <Text style={styles.verifiedText}>VERIFIED</Text>
            </View>
          )}
        </>
      )}
    </TouchableOpacity>
  )
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  label: {
    fontWeight: '600',
    marginLeft: 8,
  },
  verifiedBadge: {
    marginLeft: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  verifiedText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
})

// ============================================================================
// EXPORTS
// ============================================================================

export const CheckinButton = memo(CheckinButtonComponent)
