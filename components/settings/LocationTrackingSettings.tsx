/**
 * LocationTrackingSettings
 *
 * Settings component for configuring location tracking and check-in prompts.
 * Allows users to enable always-on tracking and set check-in prompt timing.
 *
 * @example
 * ```tsx
 * <LocationTrackingSettings testID="profile-location-tracking" />
 * ```
 */

import React, { useCallback } from 'react'
import { View, Text, StyleSheet, Switch, Alert } from 'react-native'
import { Picker } from '@react-native-picker/picker'

import { useCheckinSettings } from '../../hooks/useCheckinSettings'
import { LoadingSpinner } from '../LoadingSpinner'
import { successFeedback, errorFeedback } from '../../lib/haptics'
import { darkTheme } from '../../constants/glassStyles'
import { colors } from '../../constants/theme'

// ============================================================================
// TYPES
// ============================================================================

export interface LocationTrackingSettingsProps {
  /** Test ID for testing */
  testID?: string
}

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Prompt minute options
 */
const PROMPT_MINUTE_OPTIONS = [
  { label: '1 minute', value: 1 },
  { label: '5 minutes', value: 5 },
  { label: '10 minutes', value: 10 },
  { label: '15 minutes', value: 15 },
  { label: '30 minutes', value: 30 },
  { label: '45 minutes', value: 45 },
  { label: '60 minutes', value: 60 },
]

// ============================================================================
// COMPONENT
// ============================================================================

export function LocationTrackingSettings({
  testID = 'location-tracking-settings',
}: LocationTrackingSettingsProps): React.ReactNode {
  const {
    settings,
    isLoading,
    isUpdating,
    error,
    updateSettings,
    toggleAlwaysOn,
    clearError,
  } = useCheckinSettings()

  /**
   * Handle toggle with feedback and confirmation
   */
  const handleToggleAlwaysOn = useCallback(async () => {
    if (settings.always_on_tracking_enabled) {
      // Turning off - just do it
      const success = await toggleAlwaysOn()
      if (success) {
        await successFeedback()
      } else {
        await errorFeedback()
      }
    } else {
      // Turning on - show explanation
      Alert.alert(
        'Enable Location Tracking',
        'When enabled, the app will track your location in the background and prompt you to check in when you\'ve been at a location for the specified time.\n\nThis helps you easily check in to locations you visit regularly.',
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Enable',
            onPress: async () => {
              const success = await toggleAlwaysOn()
              if (success) {
                await successFeedback()
              } else {
                await errorFeedback()
              }
            },
          },
        ]
      )
    }
  }, [settings.always_on_tracking_enabled, toggleAlwaysOn])

  /**
   * Handle prompt minutes change
   */
  const handlePromptMinutesChange = useCallback(
    async (value: number) => {
      const success = await updateSettings({ checkin_prompt_minutes: value })
      if (success) {
        await successFeedback()
      } else {
        await errorFeedback()
      }
    },
    [updateSettings]
  )

  // ---------------------------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------------------------

  if (isLoading) {
    return (
      <View style={styles.container} testID={testID}>
        <Text style={styles.title}>Location Tracking</Text>
        <View style={styles.loadingContainer}>
          <LoadingSpinner size="small" />
        </View>
      </View>
    )
  }

  return (
    <View style={styles.container} testID={testID}>
      <Text style={styles.title}>Location Tracking</Text>
      <Text style={styles.description}>
        Configure automatic check-in prompts when you visit locations
      </Text>

      {/* Error display */}
      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error.message}</Text>
        </View>
      )}

      {/* Always-on toggle */}
      <View style={styles.settingRow}>
        <View style={styles.settingInfo}>
          <Text style={styles.settingLabel}>Enable always-on location tracking</Text>
          <Text style={styles.settingHint}>
            Receive check-in prompts when you stay at a location
          </Text>
        </View>
        <Switch
          value={settings.always_on_tracking_enabled}
          onValueChange={handleToggleAlwaysOn}
          disabled={isUpdating}
          trackColor={{ false: 'rgba(255, 255, 255, 0.2)', true: colors.primary[400] }}
          thumbColor={settings.always_on_tracking_enabled ? colors.primary[500] : darkTheme.textMuted}
          testID={`${testID}-toggle`}
        />
      </View>

      {/* Prompt minutes picker (only shown when tracking is enabled) */}
      {settings.always_on_tracking_enabled && (
        <View style={styles.pickerContainer}>
          <Text style={styles.pickerLabel}>
            Ask me to check in after being at same location for...
          </Text>
          <View style={styles.pickerWrapper}>
            <Picker
              selectedValue={settings.checkin_prompt_minutes}
              onValueChange={handlePromptMinutesChange}
              enabled={!isUpdating}
              style={styles.picker}
              testID={`${testID}-picker`}
            >
              {PROMPT_MINUTE_OPTIONS.map((option) => (
                <Picker.Item
                  key={option.value}
                  label={option.label}
                  value={option.value}
                />
              ))}
            </Picker>
          </View>
        </View>
      )}

      {/* Info text */}
      <Text style={styles.infoText}>
        Check-ins help you connect with others at the same location and unlock features like posting and live views.
      </Text>
    </View>
  )
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: darkTheme.textPrimary,
  },
  description: {
    fontSize: 14,
    color: darkTheme.textMuted,
    marginBottom: 8,
  },
  loadingContainer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  errorBanner: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#EF4444',
  },
  errorText: {
    fontSize: 14,
    color: '#EF4444',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingLabel: {
    fontSize: 16,
    color: darkTheme.textPrimary,
    fontWeight: '500',
  },
  settingHint: {
    fontSize: 13,
    color: darkTheme.textMuted,
    marginTop: 4,
  },
  pickerContainer: {
    marginTop: 8,
  },
  pickerLabel: {
    fontSize: 14,
    color: darkTheme.textSecondary,
    marginBottom: 8,
  },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    overflow: 'hidden',
  },
  picker: {
    height: 50,
    color: darkTheme.textPrimary,
  },
  infoText: {
    fontSize: 13,
    color: darkTheme.textMuted,
    marginTop: 8,
    lineHeight: 18,
  },
})

export default LocationTrackingSettings
