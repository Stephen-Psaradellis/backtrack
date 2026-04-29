/**
 * CheckinDurationPicker
 *
 * Bottom sheet that appears after a manual check-in for users without
 * always-on tracking. Lets user choose how long they'll be at the venue,
 * so the app can auto-checkout when the duration expires.
 */

import React, { useCallback } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'

import BottomSheet from '../native/BottomSheet'
import { darkTheme } from '../../constants/glassStyles'
import { colors } from '../../constants/theme'

// ============================================================================
// TYPES
// ============================================================================

export interface DurationOption {
  label: string
  minutes: number
  icon: keyof typeof Ionicons.glyphMap
}

export interface CheckinDurationPickerProps {
  visible: boolean
  onClose: () => void
  onSelectDuration: (minutes: number) => void
  locationName?: string
  testID?: string
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DURATION_OPTIONS: DurationOption[] = [
  { label: '30 min', minutes: 30, icon: 'time-outline' },
  { label: '1 hour', minutes: 60, icon: 'time-outline' },
  { label: '2 hours', minutes: 120, icon: 'time-outline' },
  { label: '4 hours', minutes: 240, icon: 'cafe-outline' },
  { label: '8 hours', minutes: 480, icon: 'moon-outline' },
  { label: '12 hours', minutes: 720, icon: 'sunny-outline' },
]

// ============================================================================
// COMPONENT
// ============================================================================

export function CheckinDurationPicker({
  visible,
  onClose,
  onSelectDuration,
  locationName,
  testID = 'duration-picker',
}: CheckinDurationPickerProps) {
  const handleSelect = useCallback((minutes: number) => {
    onSelectDuration(minutes)
  }, [onSelectDuration])

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title="How long will you be here?"
      snapPoints={[420]}
    >
      <View style={styles.container} testID={testID}>
        {locationName && (
          <Text style={styles.subtitle} numberOfLines={1}>
            {locationName}
          </Text>
        )}
        <View style={styles.grid}>
          {DURATION_OPTIONS.map((option) => (
            <TouchableOpacity
              key={option.minutes}
              style={styles.option}
              onPress={() => handleSelect(option.minutes)}
              activeOpacity={0.7}
              accessibilityLabel={`Stay for ${option.label}`}
              accessibilityRole="button"
              testID={`${testID}-option-${option.minutes}`}
            >
              <Ionicons
                name={option.icon}
                size={22}
                color={darkTheme.primary}
              />
              <Text style={styles.optionLabel}>{option.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity
          style={styles.skipButton}
          onPress={onClose}
          activeOpacity={0.7}
          accessibilityLabel="Skip, use default 3-hour expiry"
          accessibilityRole="button"
          testID={`${testID}-skip`}
        >
          <Text style={styles.skipText}>Skip (3hr default)</Text>
        </TouchableOpacity>
      </View>
    </BottomSheet>
  )
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    paddingTop: 4,
  },
  subtitle: {
    fontSize: 14,
    color: darkTheme.textSecondary,
    textAlign: 'center',
    marginBottom: 16,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'center',
  },
  option: {
    width: '30%',
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: darkTheme.surfaceElevated,
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  optionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: darkTheme.textPrimary,
  },
  skipButton: {
    alignSelf: 'center',
    marginTop: 16,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  skipText: {
    fontSize: 14,
    color: darkTheme.textMuted,
  },
})
