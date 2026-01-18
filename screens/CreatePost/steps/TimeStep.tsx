/**
 * TimeStep Component
 *
 * Fifth step in the CreatePost wizard flow. Allows the user to optionally
 * specify when they saw their missed connection. Supports both specific
 * times (e.g., "3:15 PM") and approximate periods (morning/afternoon/evening).
 *
 * Features:
 * - Optional time specification (can be skipped)
 * - Granularity toggle (specific vs. approximate)
 * - Date selection (Today, Yesterday, past week days)
 * - Time/period selection based on mode
 * - Future date validation
 * - Clear "Optional" label
 * - Back/Skip/Next navigation buttons
 *
 * @example
 * ```tsx
 * <TimeStep
 *   date={formData.sightingDate}
 *   granularity={formData.timeGranularity}
 *   onDateChange={handleDateChange}
 *   onGranularityChange={handleGranularityChange}
 *   onHourChange={handleHourChange}
 *   onMinuteChange={handleMinuteChange}
 *   onApproximateTimeChange={handleApproximateTimeChange}
 *   onNext={handleNext}
 *   onSkip={handleSkip}
 *   onBack={handleBack}
 * />
 * ```
 */

import React, { memo, useCallback, useMemo, useState } from 'react'
import { View, Text, ScrollView, StyleSheet, ViewStyle } from 'react-native'

import { TimeSelector, type ApproximateTimePeriod } from '../components/TimeSelector'
import { type GranularityMode } from '../components/GranularityToggle'
import { Button, OutlineButton } from '../../../components/Button'
import { validateSightingDate, formatSightingTime } from '../../../utils/dateTime'
import type { TimeGranularity } from '../../../types/database'
import { COLORS, sharedStyles } from '../styles'

// ============================================================================
// TYPES
// ============================================================================

/**
 * Props for the TimeStep component
 */
export interface TimeStepProps {
  /**
   * Currently selected date (null if none selected)
   */
  date: Date | null

  /**
   * Selected time granularity ('specific', 'morning', 'afternoon', 'evening')
   * or null if not yet set
   */
  granularity: TimeGranularity | null

  /**
   * Selected hour (0-23) for specific time mode
   * @default 12
   */
  hour?: number

  /**
   * Selected minute (0-59) for specific time mode
   * @default 0
   */
  minute?: number

  /**
   * Selected approximate time period for approximate mode
   * @default 'afternoon'
   */
  approximateTime?: ApproximateTimePeriod

  /**
   * Callback when date is selected
   * @param date - The selected date
   */
  onDateChange: (date: Date) => void

  /**
   * Callback when granularity is changed
   * @param granularity - The new granularity ('specific' or approximate period)
   */
  onGranularityChange: (granularity: TimeGranularity) => void

  /**
   * Callback when hour is changed (specific mode)
   * @param hour - The selected hour (0-23)
   */
  onHourChange?: (hour: number) => void

  /**
   * Callback when minute is changed (specific mode)
   * @param minute - The selected minute (0-59)
   */
  onMinuteChange?: (minute: number) => void

  /**
   * Callback when approximate time period is changed
   * @param period - The selected period ('morning', 'afternoon', 'evening')
   */
  onApproximateTimeChange?: (period: ApproximateTimePeriod) => void

  /**
   * Callback when user wants to proceed to next step
   */
  onNext: () => void

  /**
   * Callback when user wants to skip this step
   */
  onSkip: () => void

  /**
   * Callback when user wants to go back to previous step
   */
  onBack: () => void

  /**
   * Test ID prefix for testing purposes
   * @default 'create-post'
   */
  testID?: string
}

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * TimeStep - Time selection step in the CreatePost wizard
 *
 * Displays:
 * 1. Optional label indicating time is not required
 * 2. TimeSelector with date and time/period selection
 * 3. Preview of the formatted time
 * 4. Validation message if date is in the future
 * 5. Back/Skip/Next navigation buttons
 *
 * The step is optional - users can skip it entirely.
 * If a date is selected, Next requires valid (non-future) date.
 */
export const TimeStep = memo(function TimeStep({
  date,
  granularity,
  hour = 12,
  minute = 0,
  approximateTime = 'afternoon',
  onDateChange,
  onGranularityChange,
  onHourChange,
  onMinuteChange,
  onApproximateTimeChange,
  onNext,
  onSkip,
  onBack,
  testID = 'create-post',
}: TimeStepProps): JSX.Element {
  // ---------------------------------------------------------------------------
  // STATE
  // ---------------------------------------------------------------------------

  // Track the current mode for TimeSelector
  const [mode, setMode] = useState<GranularityMode>('approximate')

  // ---------------------------------------------------------------------------
  // COMPUTED VALUES
  // ---------------------------------------------------------------------------

  /**
   * Determine the effective granularity value based on mode and selections
   */
  const effectiveGranularity: TimeGranularity = useMemo(() => {
    if (mode === 'specific') {
      return 'specific'
    }
    return approximateTime
  }, [mode, approximateTime])

  /**
   * Validate the selected date (if any)
   */
  const validation = useMemo(() => {
    if (!date) {
      return { valid: true, error: null }
    }
    return validateSightingDate(date)
  }, [date])

  /**
   * Check if the user has selected a valid date to proceed with Next
   */
  const hasValidSelection = date !== null && validation.valid

  /**
   * Create a complete date with time for preview
   */
  const previewDate = useMemo(() => {
    if (!date) return null

    const previewDate = new Date(date)
    if (mode === 'specific') {
      previewDate.setHours(hour, minute, 0, 0)
    }
    return previewDate
  }, [date, mode, hour, minute])

  /**
   * Format the selected time for preview
   */
  const formattedPreview = useMemo(() => {
    if (!previewDate) return null
    return formatSightingTime(previewDate, effectiveGranularity)
  }, [previewDate, effectiveGranularity])

  // ---------------------------------------------------------------------------
  // HANDLERS
  // ---------------------------------------------------------------------------

  /**
   * Handle mode change from GranularityToggle
   */
  const handleModeChange = useCallback(
    (newMode: GranularityMode) => {
      setMode(newMode)
      // Update granularity based on new mode
      if (newMode === 'specific') {
        onGranularityChange('specific')
      } else {
        onGranularityChange(approximateTime)
      }
    },
    [approximateTime, onGranularityChange]
  )

  /**
   * Handle approximate time period selection
   */
  const handleApproximateTimeChange = useCallback(
    (period: ApproximateTimePeriod) => {
      onApproximateTimeChange?.(period)
      onGranularityChange(period)
    },
    [onApproximateTimeChange, onGranularityChange]
  )

  /**
   * Handle Next button - proceed with selected time
   */
  const handleNext = useCallback(() => {
    if (hasValidSelection) {
      onNext()
    }
  }, [hasValidSelection, onNext])

  // ---------------------------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------------------------

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Optional indicator */}
        <View style={styles.optionalBadge}>
          <Text style={styles.optionalText}>Optional</Text>
        </View>

        {/* Instruction text */}
        <Text style={styles.instructionText}>
          When did you see them? Adding a time helps others identify the
          encounter more easily.
        </Text>

        {/* Time selector */}
        <TimeSelector
          mode={mode}
          date={date}
          approximateTime={approximateTime}
          hour={hour}
          minute={minute}
          onModeChange={handleModeChange}
          onDateChange={onDateChange}
          onApproximateTimeChange={handleApproximateTimeChange}
          onHourChange={onHourChange}
          onMinuteChange={onMinuteChange}
          testID={`${testID}-time-selector`}
        />

        {/* Preview of formatted time */}
        {formattedPreview && (
          <View style={styles.previewContainer}>
            <Text style={styles.previewLabel}>Will display as:</Text>
            <Text style={styles.previewText}>{formattedPreview}</Text>
          </View>
        )}

        {/* Validation error */}
        {validation.error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{validation.error}</Text>
          </View>
        )}
      </ScrollView>

      {/* Action buttons */}
      <View style={styles.actions}>
        <OutlineButton
          title="Back"
          onPress={onBack}
          style={styles.backButton as ViewStyle}
          testID={`${testID}-time-back`}
        />
        <OutlineButton
          title="Skip"
          onPress={onSkip}
          style={styles.skipButton as ViewStyle}
          testID={`${testID}-time-skip`}
        />
        <Button
          title="Next"
          onPress={handleNext}
          disabled={!hasValidSelection}
          style={styles.nextButton as ViewStyle}
          testID={`${testID}-time-next`}
        />
      </View>
    </View>
  )
})

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  /**
   * Main container for the time step
   */
  container: {
    flex: 1,
    backgroundColor: COLORS.backgroundSecondary,
  },

  /**
   * Scrollable content area
   */
  scrollView: {
    flex: 1,
  },

  /**
   * Scroll content with padding
   */
  scrollContent: {
    padding: 16,
    paddingBottom: 24,
  },

  /**
   * Optional badge at the top
   */
  optionalBadge: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.background,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 16,
  },

  /**
   * Optional badge text
   */
  optionalText: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },

  /**
   * Instruction text below optional badge
   */
  instructionText: {
    fontSize: 15,
    color: COLORS.textSecondary,
    lineHeight: 22,
    marginBottom: 24,
  },

  /**
   * Preview container showing formatted time
   */
  previewContainer: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
    alignItems: 'center',
  },

  /**
   * Preview label text
   */
  previewLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },

  /**
   * Formatted time preview text
   */
  previewText: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.primary,
  },

  /**
   * Error message container
   */
  errorContainer: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 8,
    padding: 12,
    marginTop: 16,
    borderWidth: 1,
    borderColor: COLORS.error,
  },

  /**
   * Error message text
   */
  errorText: {
    fontSize: 14,
    color: COLORS.error,
    textAlign: 'center',
  },

  /**
   * Container for Back/Skip/Next action buttons
   */
  actions: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: COLORS.background,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: 8,
  },

  /**
   * Back button styling
   */
  backButton: {
    flex: 1,
  },

  /**
   * Skip button styling
   */
  skipButton: {
    flex: 1,
  },

  /**
   * Next button styling (larger)
   */
  nextButton: {
    flex: 1.5,
  },
})

// ============================================================================
// EXPORTS
// ============================================================================

export default TimeStep
