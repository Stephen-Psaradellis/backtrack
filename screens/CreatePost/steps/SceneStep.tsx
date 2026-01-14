/**
 * SceneStep Component (Moment 1: Where & When)
 *
 * First step in the new 3-moment CreatePost wizard flow.
 * Combines location selection and time specification into a single screen.
 *
 * Features:
 * - Location picker at top (required)
 * - Simplified time selector with day dropdown + fuzzy period
 * - Skip button for time (optional)
 * - Back/Next navigation buttons
 *
 * @example
 * ```tsx
 * <SceneStep
 *   locations={visitedLocations}
 *   selectedLocation={formData.location}
 *   onLocationSelect={handleLocationSelect}
 *   userCoordinates={{ latitude: 37.78, longitude: -122.41 }}
 *   sightingDate={formData.sightingDate}
 *   timeGranularity={formData.timeGranularity}
 *   onDateChange={handleDateChange}
 *   onGranularityChange={handleGranularityChange}
 *   onNext={handleNext}
 *   onBack={handleBack}
 * />
 * ```
 */

import React, { memo, useCallback, useMemo, useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
} from 'react-native'

import { LocationPicker, type LocationItem } from '../../../components/LocationPicker'
import { Button, OutlineButton } from '../../../components/Button'
import { EmptyState } from '../../../components/EmptyState'
import { lightFeedback } from '../../../lib/haptics'
import type { TimeGranularity } from '../../../types/database'
import { COLORS } from '../styles'

// ============================================================================
// TYPES
// ============================================================================

/**
 * User coordinates for distance calculation
 */
interface Coordinates {
  latitude: number
  longitude: number
}

/**
 * Day option for simplified time selection
 */
type DayOption = 'today' | 'yesterday' | 'this-week' | 'earlier'

/**
 * Fuzzy time period option - matches TimeGranularity values
 */
type FuzzyPeriod = 'morning' | 'afternoon' | 'evening'

/**
 * Props for the SceneStep component
 */
export interface SceneStepProps {
  /**
   * Array of recently visited locations to display
   */
  locations: LocationItem[]

  /**
   * Currently selected location (null if none selected)
   */
  selectedLocation: LocationItem | null

  /**
   * Callback when a location is selected
   */
  onLocationSelect: (location: LocationItem) => void

  /**
   * User's current coordinates for distance calculation
   */
  userCoordinates: Coordinates | null

  /**
   * Whether locations are being loaded
   */
  loadingLocations?: boolean

  /**
   * Whether the selected location was pre-filled from navigation params
   */
  isPreselected?: boolean

  /**
   * Currently selected sighting date (null if none)
   */
  sightingDate: Date | null

  /**
   * Selected time granularity
   */
  timeGranularity: TimeGranularity | null

  /**
   * Callback when date is changed
   */
  onDateChange: (date: Date | null) => void

  /**
   * Callback when granularity is changed
   */
  onGranularityChange: (granularity: TimeGranularity | null) => void

  /**
   * Callback when user wants to proceed to next step
   */
  onNext: () => void

  /**
   * Callback when user wants to go back
   */
  onBack: () => void

  /**
   * Test ID prefix for testing purposes
   */
  testID?: string
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DAY_OPTIONS: { value: DayOption; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'this-week', label: 'This week' },
  { value: 'earlier', label: 'Earlier' },
]

const PERIOD_OPTIONS: { value: FuzzyPeriod; label: string }[] = [
  { value: 'morning', label: 'Morning' },
  { value: 'afternoon', label: 'Afternoon' },
  { value: 'evening', label: 'Evening/Night' },
]

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Calculate date from day option
 */
function getDateFromDayOption(dayOption: DayOption): Date {
  const now = new Date()
  switch (dayOption) {
    case 'today':
      return now
    case 'yesterday':
      const yesterday = new Date(now)
      yesterday.setDate(yesterday.getDate() - 1)
      return yesterday
    case 'this-week':
      // Use 3 days ago as a middle point
      const thisWeek = new Date(now)
      thisWeek.setDate(thisWeek.getDate() - 3)
      return thisWeek
    case 'earlier':
      // Use 7 days ago
      const earlier = new Date(now)
      earlier.setDate(earlier.getDate() - 7)
      return earlier
    default:
      return now
  }
}

/**
 * Get day option from date
 */
function getDayOptionFromDate(date: Date | null): DayOption | null {
  if (!date) return null

  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const dateDay = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const diffDays = Math.floor((today.getTime() - dateDay.getTime()) / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return 'today'
  if (diffDays === 1) return 'yesterday'
  if (diffDays <= 7) return 'this-week'
  return 'earlier'
}

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * SceneStep - Combined location and time step (Moment 1)
 *
 * Layout:
 * 1. Location picker (required)
 * 2. Divider with "When? (optional)" label
 * 3. Simplified time selector with day + period dropdowns
 * 4. Skip button for time
 * 5. Back/Next navigation
 */
export const SceneStep = memo(function SceneStep({
  locations,
  selectedLocation,
  onLocationSelect,
  userCoordinates,
  loadingLocations = false,
  isPreselected = false,
  sightingDate,
  timeGranularity,
  onDateChange,
  onGranularityChange,
  onNext,
  onBack,
  testID = 'create-post',
}: SceneStepProps): JSX.Element {
  // ---------------------------------------------------------------------------
  // STATE
  // ---------------------------------------------------------------------------

  const [selectedDay, setSelectedDay] = useState<DayOption | null>(
    getDayOptionFromDate(sightingDate)
  )
  const [selectedPeriod, setSelectedPeriod] = useState<FuzzyPeriod | null>(
    (timeGranularity as FuzzyPeriod) || null
  )
  const [showTimeSelector, setShowTimeSelector] = useState(!!sightingDate)

  // ---------------------------------------------------------------------------
  // COMPUTED VALUES
  // ---------------------------------------------------------------------------

  const isLocationSelected = selectedLocation !== null
  const hasNoVisits = !loadingLocations && locations.length === 0 && !isPreselected
  const canProceed = isLocationSelected

  // ---------------------------------------------------------------------------
  // HANDLERS
  // ---------------------------------------------------------------------------

  const handleDaySelect = useCallback(async (day: DayOption) => {
    await lightFeedback()
    setSelectedDay(day)
    const newDate = getDateFromDayOption(day)
    onDateChange(newDate)

    // Auto-show period selector if not already visible
    if (!selectedPeriod) {
      setSelectedPeriod('afternoon')
      onGranularityChange('afternoon')
    }
  }, [onDateChange, onGranularityChange, selectedPeriod])

  const handlePeriodSelect = useCallback(async (period: FuzzyPeriod) => {
    await lightFeedback()
    setSelectedPeriod(period)
    onGranularityChange(period)

    // Set a default date if none selected
    if (!selectedDay) {
      setSelectedDay('today')
      onDateChange(new Date())
    }
  }, [onGranularityChange, selectedDay, onDateChange])

  const handleSkipTime = useCallback(async () => {
    await lightFeedback()
    setSelectedDay(null)
    setSelectedPeriod(null)
    setShowTimeSelector(false)
    onDateChange(null)
    onGranularityChange(null)
  }, [onDateChange, onGranularityChange])

  const handleAddTime = useCallback(async () => {
    await lightFeedback()
    setShowTimeSelector(true)
  }, [])

  const handleLocationSelectWithFeedback = useCallback(async (location: LocationItem) => {
    await lightFeedback()
    onLocationSelect(location)
  }, [onLocationSelect])

  // ---------------------------------------------------------------------------
  // RENDER: EMPTY STATE (no locations)
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
  // RENDER: MAIN CONTENT
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
          <Text style={styles.dividerText}>When? (optional)</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Time Section */}
        {showTimeSelector ? (
          <View style={styles.section}>
            {/* Day Selection */}
            <Text style={styles.fieldLabel}>What day?</Text>
            <View style={styles.chipRow}>
              {DAY_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.chip,
                    selectedDay === option.value && styles.chipSelected,
                  ]}
                  onPress={() => handleDaySelect(option.value)}
                  testID={`${testID}-day-${option.value}`}
                >
                  <Text
                    style={[
                      styles.chipText,
                      selectedDay === option.value && styles.chipTextSelected,
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Period Selection */}
            <Text style={styles.fieldLabel}>What time of day?</Text>
            <View style={styles.chipRow}>
              {PERIOD_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.chip,
                    selectedPeriod === option.value && styles.chipSelected,
                  ]}
                  onPress={() => handlePeriodSelect(option.value)}
                  testID={`${testID}-period-${option.value}`}
                >
                  <Text
                    style={[
                      styles.chipText,
                      selectedPeriod === option.value && styles.chipTextSelected,
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Skip Time Button */}
            <TouchableOpacity
              style={styles.skipButton}
              onPress={handleSkipTime}
              testID={`${testID}-skip-time`}
            >
              <Text style={styles.skipButtonText}>Skip – I don't remember exactly</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.addTimeButton}
            onPress={handleAddTime}
            testID={`${testID}-add-time`}
          >
            <Text style={styles.addTimeIcon}>🕐</Text>
            <Text style={styles.addTimeText}>Add when you saw them</Text>
          </TouchableOpacity>
        )}
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
    paddingVertical: 4,
    borderRadius: 10,
  },

  requiredText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.background,
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

  fieldLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textSecondary,
    marginBottom: 8,
  },

  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },

  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: COLORS.backgroundSecondary,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  chipSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },

  chipText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textPrimary,
  },

  chipTextSelected: {
    color: COLORS.background,
  },

  skipButton: {
    alignSelf: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },

  skipButtonText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },

  addTimeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
  },

  addTimeIcon: {
    fontSize: 20,
    marginRight: 8,
  },

  addTimeText: {
    fontSize: 14,
    color: COLORS.textSecondary,
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
