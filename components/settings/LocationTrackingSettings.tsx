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

import React, { useCallback, useState } from 'react'
import { View, Text, StyleSheet, Switch, Alert, Modal, TouchableOpacity, Platform, ActionSheetIOS } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import * as Notifications from 'expo-notifications'
import * as Location from 'expo-location'
import { searchNearbyPlaces } from '../../services/locationService'
import { getTaskDiagnostics } from '../../services/backgroundLocation'

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

  const [showDisclosure, setShowDisclosure] = useState(false)

  /**
   * Proceed with enabling background location after user acknowledges disclosure
   */
  const handleConfirmEnable = useCallback(async () => {
    setShowDisclosure(false)
    const success = await toggleAlwaysOn()
    if (success) {
      await successFeedback()
    } else {
      await errorFeedback()
    }
  }, [toggleAlwaysOn])

  /**
   * Handle toggle with feedback and confirmation.
   * On Android, Google Play requires a prominent in-app disclosure before
   * requesting ACCESS_BACKGROUND_LOCATION. We show a full-screen modal.
   * On iOS, Alert.alert is sufficient since Apple handles this via the system dialog.
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
    } else if (Platform.OS === 'android') {
      // Android: Show full-screen disclosure modal (Google Play requirement)
      setShowDisclosure(true)
    } else {
      // iOS: Alert is sufficient
      Alert.alert(
        'Enable Background Location',
        'Backtrack will use your location in the background to notify you when someone posts a missed connection at a venue you\'re visiting.\n\nYou can disable this anytime in Settings.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Enable', onPress: handleConfirmEnable },
        ]
      )
    }
  }, [settings.always_on_tracking_enabled, toggleAlwaysOn, handleConfirmEnable])

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
          <TouchableOpacity
            style={styles.pickerButton}
            onPress={() => {
              if (isUpdating) return
              const labels = PROMPT_MINUTE_OPTIONS.map((o) => o.label)
              if (Platform.OS === 'ios') {
                ActionSheetIOS.showActionSheetWithOptions(
                  {
                    options: [...labels, 'Cancel'],
                    cancelButtonIndex: labels.length,
                    title: 'Check-in prompt delay',
                  },
                  (index) => {
                    if (index < labels.length) {
                      handlePromptMinutesChange(PROMPT_MINUTE_OPTIONS[index].value)
                    }
                  }
                )
              } else {
                Alert.alert(
                  'Check-in prompt delay',
                  'Ask me to check in after...',
                  [
                    ...PROMPT_MINUTE_OPTIONS.map((o) => ({
                      text: o.label,
                      onPress: () => handlePromptMinutesChange(o.value),
                    })),
                    { text: 'Cancel', style: 'cancel' as const },
                  ]
                )
              }
            }}
            disabled={isUpdating}
            testID={`${testID}-picker`}
          >
            <Text style={styles.pickerButtonText}>
              {PROMPT_MINUTE_OPTIONS.find((o) => o.value === settings.checkin_prompt_minutes)?.label ?? `${settings.checkin_prompt_minutes} minutes`}
            </Text>
            <Ionicons name="chevron-down" size={18} color={darkTheme.textMuted} />
          </TouchableOpacity>
        </View>
      )}

      {/* Debug buttons */}
      {settings.always_on_tracking_enabled && (
        <View style={styles.debugButtons}>
          <TouchableOpacity
            style={styles.testNotifButton}
            onPress={async () => {
              try {
                // 1. Get current location
                const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
                const { latitude, longitude } = loc.coords

                // 2. Check background task status
                const TaskManager = await import('expo-task-manager')
                const isTaskRunning = await Location.hasStartedLocationUpdatesAsync('BACKTRACK_BACKGROUND_LOCATION').catch(() => false)

                // 3. Try Google Places
                const result = await searchNearbyPlaces({
                  latitude,
                  longitude,
                  radius_meters: 500,
                  max_results: 5,
                })

                const places = result.success
                  ? result.places.map(p => p.displayName?.text || 'unnamed').join(', ')
                  : `Failed: ${result.error?.message || 'unknown'}`

                Alert.alert(
                  'Dwell Debug',
                  `Location: ${latitude.toFixed(5)}, ${longitude.toFixed(5)}\n\n` +
                  `Background task running: ${isTaskRunning}\n\n` +
                  `Nearby places (500m): ${result.success ? result.places.length : 0}\n${places}`
                )
              } catch (err: any) {
                Alert.alert('Debug failed', err.message || String(err))
              }
            }}
            testID={`${testID}-test-dwell`}
          >
            <Ionicons name="bug-outline" size={16} color={darkTheme.textMuted} />
            <Text style={styles.testNotifText}>Test dwell detection</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.testNotifButton}
            onPress={async () => {
              try {
                const diag = await getTaskDiagnostics()
                if (!diag) {
                  Alert.alert('No Data', 'Background task has not fired yet. Wait a couple minutes and check again.')
                  return
                }
                Alert.alert(
                  'Background Task Diagnostics',
                  `Last fired: ${diag.lastFired}\n` +
                  `Location: ${diag.lat}, ${diag.lon}\n` +
                  `Nearby: ${diag.nearbyLocationName || 'none'} (${diag.distToVenueM || '?'}m)\n` +
                  `Dwell action: ${diag.dwellAction}\n` +
                  `Should notify: ${diag.shouldNotify}\n` +
                  `Dwell at: ${diag.dwellCurrentLocation || 'none'} (id: ${diag.dwellCurrentId?.slice(0, 8) || '?'})\n` +
                  `Same venue?: ${diag.sameVenueId}\n` +
                  `Arrived: ${diag.arrivedAt || 'n/a'}\n` +
                  `Dwell elapsed: ${diag.dwellElapsedMin || '0'} min / ${diag.promptMinutes} min\n` +
                  `Notif sent: ${diag.notificationSent}\n` +
                  `Stationary shortcut: ${diag.isStationaryAtLocation}`
                )
              } catch (err: any) {
                Alert.alert('Error', err.message || String(err))
              }
            }}
            testID={`${testID}-diagnostics`}
          >
            <Ionicons name="analytics-outline" size={16} color={darkTheme.textMuted} />
            <Text style={styles.testNotifText}>View task diagnostics</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.testNotifButton}
            onPress={async () => {
              try {
                await Notifications.scheduleNotificationAsync({
                  content: {
                    title: 'Test Notification',
                    body: 'If you see this, notifications are working!',
                    sound: 'default',
                    interruptionLevel: 'active',
                  },
                  trigger: null,
                })
                Alert.alert('Sent', 'Test notification scheduled. You should see it now.')
              } catch (err: any) {
                Alert.alert('Notification Failed', err.message || String(err))
              }
            }}
            testID={`${testID}-test-notif`}
          >
            <Ionicons name="notifications-outline" size={16} color={darkTheme.textMuted} />
            <Text style={styles.testNotifText}>Send test notification</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Info text */}
      <Text style={styles.infoText}>
        Check-ins help you connect with others at the same location and unlock features like posting and live views.
      </Text>

      {/* Android background location disclosure modal (Google Play compliance) */}
      <Modal
        visible={showDisclosure}
        animationType="slide"
        transparent
        onRequestClose={() => setShowDisclosure(false)}
        testID={`${testID}-disclosure-modal`}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Background Location Access</Text>

            <Text style={styles.modalBody}>
              Backtrack collects your location in the background to detect when
              you&apos;re at a venue (like a cafe, gym, or park) and prompt you
              to check in. This powers missed-connection matching at that location.
            </Text>

            <Text style={styles.modalBody}>
              Your location is never shared with other users. It is only used to
              trigger check-in prompts and is not stored after each session.
            </Text>

            <Text style={styles.modalBody}>
              You can disable background location at any time from this settings
              screen or from your device&apos;s system settings.
            </Text>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalButtonCancel}
                onPress={() => setShowDisclosure(false)}
                testID={`${testID}-disclosure-cancel`}
              >
                <Text style={styles.modalButtonCancelText}>No Thanks</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalButtonConfirm}
                onPress={handleConfirmEnable}
                testID={`${testID}-disclosure-confirm`}
              >
                <Text style={styles.modalButtonConfirmText}>Allow Background Location</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  pickerButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  pickerButtonText: {
    fontSize: 16,
    color: darkTheme.textPrimary,
    fontWeight: '500',
  },
  debugButtons: {
    gap: 8,
    marginTop: 8,
  },
  testNotifButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    alignSelf: 'flex-start' as const,
  },
  testNotifText: {
    fontSize: 13,
    color: darkTheme.textMuted,
  },
  infoText: {
    fontSize: 13,
    color: darkTheme.textMuted,
    marginTop: 8,
    lineHeight: 18,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: darkTheme.textPrimary,
    marginBottom: 16,
    textAlign: 'center',
  },
  modalBody: {
    fontSize: 15,
    color: darkTheme.textSecondary,
    lineHeight: 22,
    marginBottom: 12,
  },
  modalButtons: {
    marginTop: 16,
    gap: 12,
  },
  modalButtonConfirm: {
    backgroundColor: colors.primary[500],
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  modalButtonConfirmText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  modalButtonCancel: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  modalButtonCancelText: {
    color: darkTheme.textMuted,
    fontSize: 16,
    fontWeight: '500',
  },
})

export default LocationTrackingSettings
