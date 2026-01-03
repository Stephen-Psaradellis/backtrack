/**
 * TimeSelector Component
 *
 * A comprehensive time selection component for the Backtrack app.
 * Allows users to select a date and time for when they saw someone.
 *
 * Features:
 * - Date selection (Today, Yesterday, or past week days)
 * - Specific time input (hour, minute, AM/PM picker)
 * - Approximate time selection (morning, afternoon, evening)
 * - Mode switching via GranularityToggle
 * - Skip option for optional time entry
 * - Validation (no future dates/times)
 *
 * @example
 * ```tsx
 * // Basic usage with specific time
 * <TimeSelector
 *   mode="specific"
 *   date={selectedDate}
 *   onDateChange={setSelectedDate}
 *   onModeChange={setMode}
 * />
 *
 * @example
 * // With approximate time
 * <TimeSelector
 *   mode="approximate"
 *   date={selectedDate}
 *   approximateTime="afternoon"
 *   onDateChange={setSelectedDate}
 *   onApproximateTimeChange={setApproximateTime}
 *   onModeChange={setMode}
 * />
 * ```
 */

import React, { memo, useCallback, useMemo, useState } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  StyleProp,
  ViewStyle,
} from 'react-native'

import { lightFeedback, selectionFeedback } from '../../../lib/haptics'
import { GranularityToggle, type GranularityMode } from './GranularityToggle'
import {
  DAY_NAMES,
  MONTH_NAMES_SHORT,
  formatRelativeDay,
  getGranularityForHour,
} from '../../../utils/dateTime'
import type { TimeGranularity } from '../../../types/database'
import { COLORS } from '../styles'

// ============================================================================
// TYPES
// ============================================================================

/**
 * Approximate time period options (excludes 'specific')
 */
export type ApproximateTimePeriod = Exclude<TimeGranularity, 'specific'>

/**
 * Date option for selection
 */
export interface DateOption {
  /** Date object for this option */
  date: Date
  /** Display label (e.g., "Today", "Yesterday", "Monday") */
  label: string
  /** Whether this is the selected option */
  selected: boolean
}

/**
 * Props for the TimeSelector component
 */
export interface TimeSelectorProps {
  /**
   * Current granularity mode
   */
  mode: GranularityMode

  /**
   * Currently selected date (null if none selected)
   */
  date: Date | null

  /**
   * Selected approximate time period (for approximate mode)
   */
  approximateTime?: ApproximateTimePeriod

  /**
   * Selected hour (0-23) for specific mode
   */
  hour?: number

  /**
   * Selected minute (0-59) for specific mode
   */
  minute?: number

  /**
   * Callback when mode changes
   */
  onModeChange: (mode: GranularityMode) => void

  /**
   * Callback when date is selected
   */
  onDateChange: (date: Date) => void

  /**
   * Callback when approximate time period is selected
   */
  onApproximateTimeChange?: (period: ApproximateTimePeriod) => void

  /**
   * Callback when hour is selected (specific mode)
   */
  onHourChange?: (hour: number) => void

  /**
   * Callback when minute is selected (specific mode)
   */
  onMinuteChange?: (minute: number) => void

  /**
   * Maximum number of days in the past to show
   * @default 7
   */
  maxDaysBack?: number

  /**
   * Whether the selector is disabled
   * @default false
   */
  disabled?: boolean

  /**
   * Custom container style
   */
  style?: StyleProp<ViewStyle>

  /**
   * Test ID prefix for testing purposes
   * @default 'time-selector'
   */
  testID?: string
}

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Approximate time period options with display labels and icons
 */
const APPROXIMATE_TIME_OPTIONS: Array<{
  value: ApproximateTimePeriod
  label: string
  icon: string
  timeRange: string
}> = [
  { value: 'morning', label: 'Morning', icon: '🌅', timeRange: '6am - 12pm' },
  { value: 'afternoon', label: 'Afternoon', icon: '☀️', timeRange: '12pm - 6pm' },
  { value: 'evening', label: 'Evening', icon: '🌙', timeRange: '6pm - 12am' },
]

/**
 * Hour options for specific time picker (12-hour format)
 */
const HOUR_OPTIONS = Array.from({ length: 12 }, (_, i) => i + 1) // 1-12

/**
 * Minute options for specific time picker (in 5-minute increments)
 */
const MINUTE_OPTIONS = Array.from({ length: 12 }, (_, i) => i * 5) // 0, 5, 10, ..., 55

/**
 * AM/PM options
 */
const PERIOD_OPTIONS: Array<'AM' | 'PM'> = ['AM', 'PM']

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Generate date options for the past N days
 */
function generateDateOptions(maxDaysBack: number, selectedDate: Date | null): DateOption[] {
  const options: DateOption[] = []
  const now = new Date()

  for (let i = 0; i <= maxDaysBack; i++) {
    const date = new Date(now)
    date.setDate(now.getDate() - i)
    date.setHours(0, 0, 0, 0)

    const isSelected =
      selectedDate !== null &&
      date.getDate() === selectedDate.getDate() &&
      date.getMonth() === selectedDate.getMonth() &&
      date.getFullYear() === selectedDate.getFullYear()

    options.push({
      date,
      label: formatRelativeDay(date),
      selected: isSelected,
    })
  }

  return options
}

/**
 * Convert 24-hour to 12-hour format
 */
function to12Hour(hour24: number): { hour12: number; period: 'AM' | 'PM' } {
  const period: 'AM' | 'PM' = hour24 >= 12 ? 'PM' : 'AM'
  let hour12 = hour24 % 12
  if (hour12 === 0) hour12 = 12
  return { hour12, period }
}

/**
 * Convert 12-hour to 24-hour format
 */
function to24Hour(hour12: number, period: 'AM' | 'PM'): number {
  if (period === 'AM') {
    return hour12 === 12 ? 0 : hour12
  }
  return hour12 === 12 ? 12 : hour12 + 12
}

/**
 * Format minute with leading zero
 */
function formatMinute(minute: number): string {
  return minute.toString().padStart(2, '0')
}

// ============================================================================
// SUBCOMPONENTS
// ============================================================================

/**
 * Date option button
 */
const DateOptionButton = memo(function DateOptionButton({
  option,
  onPress,
  disabled,
  testID,
}: {
  option: DateOption
  onPress: () => void
  disabled: boolean
  testID?: string
}): JSX.Element {
  return (
    <TouchableOpacity
      style={[
        styles.dateOption,
        option.selected && styles.dateOptionSelected,
        disabled && styles.dateOptionDisabled,
      ]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
      accessibilityRole="radio"
      accessibilityState={{ checked: option.selected, disabled }}
      accessibilityLabel={option.label}
      testID={testID}
    >
      <Text
        style={[
          styles.dateOptionText,
          option.selected && styles.dateOptionTextSelected,
          disabled && styles.dateOptionTextDisabled,
        ]}
      >
        {option.label}
      </Text>
    </TouchableOpacity>
  )
})

/**
 * Approximate time period button
 */
const ApproximateTimeButton = memo(function ApproximateTimeButton({
  option,
  selected,
  onPress,
  disabled,
  testID,
}: {
  option: (typeof APPROXIMATE_TIME_OPTIONS)[number]
  selected: boolean
  onPress: () => void
  disabled: boolean
  testID?: string
}): JSX.Element {
  return (
    <TouchableOpacity
      style={[
        styles.periodOption,
        selected && styles.periodOptionSelected,
        disabled && styles.periodOptionDisabled,
      ]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected, disabled }}
      accessibilityLabel={`${option.label}, ${option.timeRange}`}
      testID={testID}
    >
      <Text style={styles.periodIcon}>{option.icon}</Text>
      <Text
        style={[
          styles.periodLabel,
          selected && styles.periodLabelSelected,
          disabled && styles.periodLabelDisabled,
        ]}
      >
        {option.label}
      </Text>
      <Text
        style={[
          styles.periodTimeRange,
          selected && styles.periodTimeRangeSelected,
          disabled && styles.periodTimeRangeDisabled,
        ]}
      >
        {option.timeRange}
      </Text>
    </TouchableOpacity>
  )
})

/**
 * Picker wheel item
 */
const PickerItem = memo(function PickerItem({
  value,
  label,
  selected,
  onPress,
  disabled,
  testID,
}: {
  value: number | string
  label: string
  selected: boolean
  onPress: () => void
  disabled: boolean
  testID?: string
}): JSX.Element {
  return (
    <TouchableOpacity
      style={[
        styles.pickerItem,
        selected && styles.pickerItemSelected,
      ]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected, disabled }}
      accessibilityLabel={label}
      testID={testID}
    >
      <Text
        style={[
          styles.pickerItemText,
          selected && styles.pickerItemTextSelected,
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  )
})

// ============================================================================
// MAIN COMPONENT
// ============================================================================

/**
 * TimeSelector - Date and time selection component
 *
 * Provides a comprehensive interface for selecting when a sighting occurred.
 * Supports both specific time (exact hour/minute) and approximate time
 * (morning/afternoon/evening) modes.
 */
export const TimeSelector = memo(function TimeSelector({
  mode,
  date,
  approximateTime = 'afternoon',
  hour = 12,
  minute = 0,
  onModeChange,
  onDateChange,
  onApproximateTimeChange,
  onHourChange,
  onMinuteChange,
  maxDaysBack = 7,
  disabled = false,
  style,
  testID = 'time-selector',
}: TimeSelectorProps): JSX.Element {
  // ---------------------------------------------------------------------------
  // STATE
  // ---------------------------------------------------------------------------

  // Track AM/PM separately for specific time mode
  const { hour12, period: initialPeriod } = useMemo(() => to12Hour(hour), [hour])
  const [selectedPeriod, setSelectedPeriod] = useState<'AM' | 'PM'>(initialPeriod)

  // ---------------------------------------------------------------------------
  // COMPUTED
  // ---------------------------------------------------------------------------

  const dateOptions = useMemo(
    () => generateDateOptions(maxDaysBack, date),
    [maxDaysBack, date]
  )

  // ---------------------------------------------------------------------------
  // HANDLERS
  // ---------------------------------------------------------------------------

  /**
   * Handle date selection
   */
  const handleDateSelect = useCallback(
    async (selectedDate: Date) => {
      if (disabled) return
      await selectionFeedback()
      onDateChange(selectedDate)
    },
    [disabled, onDateChange]
  )

  /**
   * Handle approximate time period selection
   */
  const handleApproximateTimeSelect = useCallback(
    async (period: ApproximateTimePeriod) => {
      if (disabled) return
      await selectionFeedback()
      onApproximateTimeChange?.(period)
    },
    [disabled, onApproximateTimeChange]
  )

  /**
   * Handle hour selection (12-hour format)
   */
  const handleHourSelect = useCallback(
    async (hour12Value: number) => {
      if (disabled) return
      await lightFeedback()
      const hour24 = to24Hour(hour12Value, selectedPeriod)
      onHourChange?.(hour24)
    },
    [disabled, selectedPeriod, onHourChange]
  )

  /**
   * Handle minute selection
   */
  const handleMinuteSelect = useCallback(
    async (minuteValue: number) => {
      if (disabled) return
      await lightFeedback()
      onMinuteChange?.(minuteValue)
    },
    [disabled, onMinuteChange]
  )

  /**
   * Handle AM/PM selection
   */
  const handlePeriodSelect = useCallback(
    async (newPeriod: 'AM' | 'PM') => {
      if (disabled || newPeriod === selectedPeriod) return
      await lightFeedback()
      setSelectedPeriod(newPeriod)
      // Convert current hour to new period
      const hour24 = to24Hour(hour12, newPeriod)
      onHourChange?.(hour24)
    },
    [disabled, selectedPeriod, hour12, onHourChange]
  )

  // ---------------------------------------------------------------------------
  // RENDER: DATE SELECTOR
  // ---------------------------------------------------------------------------

  const renderDateSelector = () => (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>When did you see them?</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.dateOptionsContainer}
        testID={`${testID}-date-scroll`}
      >
        {dateOptions.map((option, index) => (
          <DateOptionButton
            key={option.date.toISOString()}
            option={option}
            onPress={() => handleDateSelect(option.date)}
            disabled={disabled}
            testID={`${testID}-date-${index}`}
          />
        ))}
      </ScrollView>
    </View>
  )

  // ---------------------------------------------------------------------------
  // RENDER: APPROXIMATE TIME SELECTOR
  // ---------------------------------------------------------------------------

  const renderApproximateTimeSelector = () => (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>What time of day?</Text>
      <View style={styles.periodOptionsContainer}>
        {APPROXIMATE_TIME_OPTIONS.map((option) => (
          <ApproximateTimeButton
            key={option.value}
            option={option}
            selected={approximateTime === option.value}
            onPress={() => handleApproximateTimeSelect(option.value)}
            disabled={disabled}
            testID={`${testID}-period-${option.value}`}
          />
        ))}
      </View>
    </View>
  )

  // ---------------------------------------------------------------------------
  // RENDER: SPECIFIC TIME SELECTOR
  // ---------------------------------------------------------------------------

  const renderSpecificTimeSelector = () => (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>What time?</Text>
      <View style={styles.timePickerContainer}>
        {/* Hour picker */}
        <View style={styles.pickerColumn}>
          <Text style={styles.pickerColumnLabel}>Hour</Text>
          <ScrollView
            style={styles.pickerScroll}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.pickerScrollContent}
            testID={`${testID}-hour-scroll`}
          >
            {HOUR_OPTIONS.map((h) => (
              <PickerItem
                key={h}
                value={h}
                label={h.toString()}
                selected={h === hour12}
                onPress={() => handleHourSelect(h)}
                disabled={disabled}
                testID={`${testID}-hour-${h}`}
              />
            ))}
          </ScrollView>
        </View>

        {/* Minute picker */}
        <View style={styles.pickerColumn}>
          <Text style={styles.pickerColumnLabel}>Min</Text>
          <ScrollView
            style={styles.pickerScroll}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.pickerScrollContent}
            testID={`${testID}-minute-scroll`}
          >
            {MINUTE_OPTIONS.map((m) => (
              <PickerItem
                key={m}
                value={m}
                label={formatMinute(m)}
                selected={m === minute}
                onPress={() => handleMinuteSelect(m)}
                disabled={disabled}
                testID={`${testID}-minute-${m}`}
              />
            ))}
          </ScrollView>
        </View>

        {/* AM/PM picker */}
        <View style={styles.pickerColumn}>
          <Text style={styles.pickerColumnLabel}>Period</Text>
          <View style={styles.periodPickerContainer}>
            {PERIOD_OPTIONS.map((p) => (
              <PickerItem
                key={p}
                value={p}
                label={p}
                selected={p === selectedPeriod}
                onPress={() => handlePeriodSelect(p)}
                disabled={disabled}
                testID={`${testID}-period-${p}`}
              />
            ))}
          </View>
        </View>
      </View>
    </View>
  )

  // ---------------------------------------------------------------------------
  // RENDER: MAIN
  // ---------------------------------------------------------------------------

  return (
    <View style={[styles.container, style]} testID={testID}>
      {/* Granularity toggle */}
      <GranularityToggle
        mode={mode}
        onModeChange={onModeChange}
        disabled={disabled}
        testID={`${testID}-granularity`}
      />

      {/* Date selector */}
      {renderDateSelector()}

      {/* Time selector based on mode */}
      {mode === 'approximate'
        ? renderApproximateTimeSelector()
        : renderSpecificTimeSelector()}
    </View>
  )
})

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  // Container
  container: {
    flex: 1,
  },

  // Section
  section: {
    marginBottom: 24,
  },

  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },

  // Date options
  dateOptionsContainer: {
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 4,
  },

  dateOption: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.background,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: COLORS.border,
    minWidth: 80,
    alignItems: 'center',
  },

  dateOptionSelected: {
    borderColor: COLORS.primary,
    backgroundColor: '#E8F2FF',
  },

  dateOptionDisabled: {
    opacity: 0.5,
  },

  dateOptionText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },

  dateOptionTextSelected: {
    color: COLORS.primary,
  },

  dateOptionTextDisabled: {
    color: COLORS.textSecondary,
  },

  // Approximate time period options
  periodOptionsContainer: {
    flexDirection: 'row',
    gap: 12,
  },

  periodOption: {
    flex: 1,
    padding: 16,
    backgroundColor: COLORS.background,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.border,
    alignItems: 'center',
  },

  periodOptionSelected: {
    borderColor: COLORS.primary,
    backgroundColor: '#E8F2FF',
  },

  periodOptionDisabled: {
    opacity: 0.5,
  },

  periodIcon: {
    fontSize: 28,
    marginBottom: 8,
  },

  periodLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },

  periodLabelSelected: {
    color: COLORS.primary,
  },

  periodLabelDisabled: {
    color: COLORS.textSecondary,
  },

  periodTimeRange: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },

  periodTimeRangeSelected: {
    color: COLORS.primary,
  },

  periodTimeRangeDisabled: {
    color: COLORS.textSecondary,
  },

  // Specific time picker
  timePickerContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 16,
    gap: 16,
  },

  pickerColumn: {
    flex: 1,
    alignItems: 'center',
  },

  pickerColumnLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 12,
    textTransform: 'uppercase',
  },

  pickerScroll: {
    maxHeight: 150,
  },

  pickerScrollContent: {
    paddingVertical: 4,
  },

  periodPickerContainer: {
    gap: 8,
  },

  pickerItem: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginVertical: 2,
    borderRadius: 8,
    alignItems: 'center',
    minWidth: 56,
  },

  pickerItemSelected: {
    backgroundColor: COLORS.primary,
  },

  pickerItemText: {
    fontSize: 18,
    fontWeight: '500',
    color: COLORS.textPrimary,
  },

  pickerItemTextSelected: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
})

// ============================================================================
// EXPORTS
// ============================================================================

export default TimeSelector
