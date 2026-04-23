/**
 * SceneStep Component (Moment 1: Where & When)
 *
 * First step in the new 3-moment CreatePost wizard flow.
 * Combines location selection and time range specification.
 *
 * Features:
 * - Location picker at top (required)
 * - Start/End time pickers with checkin bounds (defaults from checkin time)
 * - Back/Next navigation buttons
 */

import React, { memo, useCallback, useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Platform,
  ViewStyle,
} from 'react-native'
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker'

import { LocationPicker, type LocationItem } from '../../../components/LocationPicker'
import { Button, OutlineButton } from '../../../components/Button'
import { EmptyState } from '../../../components/EmptyState'
import { lightFeedback } from '../../../lib/haptics'
import { COLORS } from '../styles'

// ============================================================================
// TYPES
// ============================================================================

interface Coordinates {
  latitude: number
  longitude: number
}

export interface SceneStepProps {
  locations: LocationItem[]
  selectedLocation: LocationItem | null
  onLocationSelect: (location: LocationItem) => void
  userCoordinates: Coordinates | null
  loadingLocations?: boolean
  isPreselected?: boolean
  /** Start time for the sighting (null = not set) */
  sightingDate: Date | null
  /** End time for the sighting (null = instant/no end) */
  sightingEndDate: Date | null
  /** Callback when start time changes */
  onStartTimeChange: (date: Date | null) => void
  /** Callback when end time changes */
  onEndTimeChange: (date: Date | null) => void
  /** Clear all time fields */
  onClearTime: () => void
  /** Earliest valid start time (checkin time) */
  checkinTime?: Date | null
  /** Latest valid end time (checkout time or now) */
  checkoutTime?: Date | null
  onNext: () => void
  onBack: () => void
  testID?: string
}

// ============================================================================
// HELPERS
// ============================================================================

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

/**
 * Clamp a date between min and max bounds (time-only comparison).
 * Returns the clamped date, or the original if no bounds apply.
 */
function clampTime(date: Date, min: Date | null, max: Date | null): Date {
  if (min && date < min) return min
  if (max && date > max) return max
  return date
}

// ============================================================================
// COMPONENT
// ============================================================================

export const SceneStep = memo(function SceneStep({
  locations,
  selectedLocation,
  onLocationSelect,
  userCoordinates,
  loadingLocations = false,
  isPreselected = false,
  sightingDate,
  sightingEndDate,
  onStartTimeChange,
  onEndTimeChange,
  onClearTime,
  checkinTime = null,
  checkoutTime = null,
  onNext,
  onBack,
  testID = 'create-post',
}: SceneStepProps): JSX.Element {
  // DateTimePicker is toggled on/off via button press on both platforms
  const [showStartPicker, setShowStartPicker] = useState(false)
  const [showEndPicker, setShowEndPicker] = useState(false)

  const isLocationSelected = selectedLocation !== null
  const hasNoVisits = !loadingLocations && locations.length === 0 && !isPreselected
  const hasTime = sightingDate !== null
  // Start time is required; end time must be > start time if set
  const isTimeValid = hasTime && (
    !sightingEndDate || sightingEndDate > sightingDate!
  )
  const canProceed = isLocationSelected && isTimeValid

  // ---------------------------------------------------------------------------
  // HANDLERS
  // ---------------------------------------------------------------------------

  const handleLocationSelectWithFeedback = useCallback(async (location: LocationItem) => {
    await lightFeedback()
    onLocationSelect(location)
  }, [onLocationSelect])

  const handleStartTimeChange = useCallback((_event: DateTimePickerEvent, date?: Date) => {
    setShowStartPicker(Platform.OS === 'ios') // iOS keeps spinner open, Android closes
    if (date) {
      // Clamp to checkin/checkout bounds
      const clamped = clampTime(date, checkinTime, checkoutTime)
      onStartTimeChange(clamped)
    }
  }, [onStartTimeChange, checkinTime, checkoutTime])

  const handleEndTimeChange = useCallback((_event: DateTimePickerEvent, date?: Date) => {
    setShowEndPicker(Platform.OS === 'ios') // iOS keeps spinner open, Android closes
    if (date) {
      // Clamp: min = start time, max = checkout
      const clamped = clampTime(date, sightingDate, checkoutTime)
      onEndTimeChange(clamped)
    }
  }, [onEndTimeChange, sightingDate, checkoutTime])

  const handleClearEndTime = useCallback(async () => {
    await lightFeedback()
    setShowEndPicker(false)
    onEndTimeChange(null)
  }, [onEndTimeChange])

  // ---------------------------------------------------------------------------
  // RENDER: EMPTY STATE
  // ---------------------------------------------------------------------------

  if (hasNoVisits) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyStateContainer}>
          <EmptyState
            icon="📍"
            title="No Recent Visits"
            message="Visit a location to post there. You can only create posts at places you've been within the last 3 hours."
            testID={`${testID}-empty-state`}
          />
        </View>

        <View style={styles.actions}>
          <Button
            title="Back"
            onPress={onBack}
            variant="outline"
            style={styles.fullWidthButton as ViewStyle}
            testID={`${testID}-scene-back`}
          />
        </View>
      </View>
    )
  }

  // ---------------------------------------------------------------------------
  // RENDER: MAIN
  // ---------------------------------------------------------------------------

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Location Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Where did you see them?</Text>
            <View style={styles.requiredBadge}>
              <Text style={styles.requiredText}>Required</Text>
            </View>
          </View>

          <LocationPicker
            locations={locations}
            selectedLocationId={selectedLocation?.id ?? null}
            onSelect={handleLocationSelectWithFeedback}
            userCoordinates={userCoordinates}
            loading={loadingLocations}
            showCurrentLocation={false}
            showVisitedAt={true}
            placeholder="Search for a venue..."
            testID={`${testID}-location-picker`}
          />
        </View>

        {/* Divider */}
        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>When?</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Time Section */}
        <View style={styles.section}>
          {hasTime ? (
            <>
              {/* Time pickers row */}
              <View style={styles.timeRow}>
                {/* Start time */}
                <View style={styles.timeColumn}>
                  <View style={styles.fieldLabelRow}>
                    <Text style={styles.fieldLabel}>From</Text>
                    <View style={styles.requiredBadge}>
                      <Text style={styles.requiredText}>Required</Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={[styles.timeButton, showStartPicker && styles.timeButtonActive]}
                    onPress={() => {
                      setShowEndPicker(false)
                      setShowStartPicker(!showStartPicker)
                    }}
                    testID={`${testID}-start-time-button`}
                  >
                    <Text style={styles.timeButtonText}>
                      {formatTime(sightingDate!)}
                    </Text>
                  </TouchableOpacity>
                  {showStartPicker && (
                    <DateTimePicker
                      value={sightingDate!}
                      mode="time"
                      display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                      themeVariant="dark"
                      onChange={handleStartTimeChange}
                      testID={`${testID}-start-time-picker`}
                    />
                  )}
                </View>

                {/* End time */}
                <View style={styles.timeColumn}>
                  <View style={styles.fieldLabelRow}>
                    <Text style={styles.fieldLabel}>To</Text>
                    <Text style={styles.optionalLabel}>(optional)</Text>
                  </View>
                  {sightingEndDate ? (
                    <>
                      <View style={styles.endTimeRow}>
                        <TouchableOpacity
                          style={[styles.timeButton, styles.endTimeButton, showEndPicker && styles.timeButtonActive]}
                          onPress={() => {
                            setShowStartPicker(false)
                            setShowEndPicker(!showEndPicker)
                          }}
                          testID={`${testID}-end-time-button`}
                        >
                          <Text style={styles.timeButtonText}>
                            {formatTime(sightingEndDate)}
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.clearButton}
                          onPress={handleClearEndTime}
                          testID={`${testID}-clear-end-time`}
                        >
                          <Text style={styles.clearButtonText}>✕</Text>
                        </TouchableOpacity>
                      </View>
                      {showEndPicker && (
                        <DateTimePicker
                          value={sightingEndDate}
                          mode="time"
                          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                          themeVariant="dark"
                          onChange={handleEndTimeChange}
                          testID={`${testID}-end-time-picker`}
                        />
                      )}
                    </>
                  ) : (
                    <TouchableOpacity
                      style={styles.addEndTimeButton}
                      onPress={() => {
                        onEndTimeChange(checkoutTime ?? new Date())
                        if (Platform.OS === 'android') setShowEndPicker(true)
                      }}
                      testID={`${testID}-add-end-time`}
                    >
                      <Text style={styles.addEndTimeText}>+ Add end time</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {/* Time range hint */}
              {checkinTime && (
                <Text style={styles.timeHintText}>
                  Based on your check-in{checkoutTime ? ` (${formatTime(checkinTime)} – ${formatTime(checkoutTime)})` : ` at ${formatTime(checkinTime)}`}
                </Text>
              )}
            </>
          ) : (
            <View style={styles.noTimeState}>
              <Text style={styles.noTimeText}>
                {isLocationSelected
                  ? 'Time auto-fills when you pick a location'
                  : 'Select a location first'}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Action buttons */}
      <View style={styles.actions}>
        <OutlineButton
          title="Back"
          onPress={onBack}
          style={styles.backButton as ViewStyle}
          testID={`${testID}-scene-back`}
        />
        <Button
          title="Next"
          onPress={onNext}
          disabled={!canProceed}
          style={styles.nextButton as ViewStyle}
          testID={`${testID}-scene-next`}
        />
      </View>
    </View>
  )
})

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.backgroundSecondary,
  },

  scrollView: {
    flex: 1,
  },

  scrollContent: {
    padding: 16,
    paddingBottom: 24,
  },

  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  section: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },

  requiredBadge: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },

  requiredText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 8,
    paddingHorizontal: 8,
  },

  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.border,
  },

  dividerText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginHorizontal: 12,
  },

  fieldLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },

  fieldLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },

  optionalLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    opacity: 0.7,
  },

  timeRow: {
    flexDirection: 'row',
    gap: 16,
  },

  timeColumn: {
    flex: 1,
  },

  timeButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: COLORS.backgroundSecondary,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },

  timeButtonActive: {
    borderColor: COLORS.primary,
  },

  timeButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.textPrimary,
  },

  endTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  endTimeButton: {
    flex: 1,
  },

  clearButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.backgroundSecondary,
    borderWidth: 1,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
  },

  clearButtonText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },

  addEndTimeButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
    alignItems: 'center',
  },

  addEndTimeText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },

  timeHintText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 12,
    fontStyle: 'italic',
  },

  noTimeState: {
    paddingVertical: 8,
    alignItems: 'center',
  },

  noTimeText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
  },

  actions: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: COLORS.background,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },

  backButton: {
    flex: 1,
    marginRight: 8,
  },

  nextButton: {
    flex: 2,
  },

  fullWidthButton: {
    flex: 1,
  },
})

// ============================================================================
// EXPORTS
// ============================================================================

export default SceneStep
