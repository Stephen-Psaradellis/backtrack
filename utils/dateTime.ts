/**
 * DateTime Utility
 *
 * Utility functions for handling date/time formatting and validation in the Backtrack app.
 * Supports sighting time display with flexible granularity (specific time vs. approximate periods).
 *
 * Time granularity options:
 * - 'specific': Exact time (e.g., "Yesterday at 3:15 PM")
 * - 'morning': Approximate morning (6am-12pm)
 * - 'afternoon': Approximate afternoon (12pm-6pm)
 * - 'evening': Approximate evening (6pm-12am)
 *
 * @example
 * ```tsx
 * import { formatSightingTime, isOlderThan30Days, validateSightingDate } from 'utils/dateTime'
 *
 * // Format with specific time
 * const formatted = formatSightingTime(new Date(), 'specific')
 * // => "Today at 3:15 PM"
 *
 * // Format with approximate time
 * const formatted = formatSightingTime(yesterday, 'afternoon')
 * // => "Yesterday afternoon"
 *
 * // Check if post should be deprioritized
 * const shouldDeprioritize = isOlderThan30Days(postDate)
 *
 * // Validate date is not in the future
 * const result = validateSightingDate(date)
 * if (result.valid) {
 *   // Date is valid
 * }
 * ```
 */

import type { TimeGranularity } from '../types/database'

// ============================================================================
// TYPES
// ============================================================================

/**
 * Result from date validation
 */
export interface DateValidationResult {
  /** Whether the date is valid */
  valid: boolean
  /** Error message if validation failed */
  error: string | null
}

/**
 * Time range definition with hour boundaries
 */
export interface TimeRange {
  /** Start hour (0-23) */
  startHour: number
  /** End hour (0-23) */
  endHour: number
  /** Display label for the time period */
  label: string
}

/**
 * Options for time formatting
 */
export interface FormatTimeOptions {
  /** Whether to include the day of week for dates within the past week */
  includeDayOfWeek?: boolean
  /** Whether to use 12-hour format (default: true) */
  use12HourFormat?: boolean
  /** Reference date for relative day calculation (defaults to now) */
  referenceDate?: Date
}

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Number of days after which a post should be deprioritized
 */
export const DEPRIORITIZE_AFTER_DAYS = 30

/**
 * Number of days to show relative day names (Today, Yesterday)
 */
export const RELATIVE_DAY_THRESHOLD = 2

/**
 * Number of days within which to show day-of-week (e.g., "Tuesday")
 */
export const WEEKDAY_THRESHOLD = 7

/**
 * Day names for display
 */
export const DAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const

/**
 * Month names for display
 */
export const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const

/**
 * Short month names for compact display
 */
export const MONTH_NAMES_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const

/**
 * Time ranges for each granularity period
 * - Morning: 6:00 AM - 11:59 AM
 * - Afternoon: 12:00 PM - 5:59 PM
 * - Evening: 6:00 PM - 11:59 PM
 */
export const TIME_GRANULARITY_RANGES: Record<'morning' | 'afternoon' | 'evening', TimeRange> = {
  morning: {
    startHour: 6,
    endHour: 12,
    label: 'morning',
  },
  afternoon: {
    startHour: 12,
    endHour: 18,
    label: 'afternoon',
  },
  evening: {
    startHour: 18,
    endHour: 24,
    label: 'evening',
  },
}

/**
 * Error messages for date validation
 */
export const DATE_TIME_ERRORS = {
  FUTURE_DATE: 'Sighting date cannot be in the future.',
  INVALID_DATE: 'Invalid date provided.',
  TOO_OLD: 'Sighting date is too old. Please select a more recent date.',
} as const

/**
 * Default formatting options
 */
export const DEFAULT_FORMAT_OPTIONS: Omit<Required<FormatTimeOptions>, 'referenceDate'> = {
  includeDayOfWeek: true,
  use12HourFormat: true,
}

/**
 * Milliseconds in one day
 */
const MS_PER_DAY = 24 * 60 * 60 * 1000

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get the start of day (midnight) for a given date
 *
 * @param date - The date to get start of day for
 * @returns Date object set to midnight local time
 */
function getStartOfDay(date: Date): Date {
  const result = new Date(date)
  result.setHours(0, 0, 0, 0)
  return result
}

/**
 * Calculate the number of days between two dates (ignoring time)
 *
 * @param date1 - First date
 * @param date2 - Second date
 * @returns Number of days difference (positive if date2 > date1)
 */
function getDaysDifference(date1: Date, date2: Date): number {
  const start1 = getStartOfDay(date1)
  const start2 = getStartOfDay(date2)
  return Math.round((start2.getTime() - start1.getTime()) / MS_PER_DAY)
}

/**
 * Format time in 12-hour or 24-hour format
 *
 * @param date - Date to format time from
 * @param use12Hour - Whether to use 12-hour format
 * @returns Formatted time string (e.g., "3:15 PM" or "15:15")
 */
function formatTimeOfDay(date: Date, use12Hour: boolean = true): string {
  const hours = date.getHours()
  const minutes = date.getMinutes()
  const paddedMinutes = minutes.toString().padStart(2, '0')

  if (use12Hour) {
    const period = hours >= 12 ? 'PM' : 'AM'
    const hours12 = hours % 12 || 12
    return `${hours12}:${paddedMinutes} ${period}`
  } else {
    const paddedHours = hours.toString().padStart(2, '0')
    return `${paddedHours}:${paddedMinutes}`
  }
}

// ============================================================================
// MAIN FUNCTIONS
// ============================================================================

/**
 * Format a relative day label based on the date
 *
 * Returns:
 * - "Today" for the current date
 * - "Yesterday" for one day ago
 * - Day name (e.g., "Tuesday") for dates within the past week
 * - Full date (e.g., "Dec 24") for older dates
 *
 * @param date - The date to format
 * @param referenceDate - Optional reference date (defaults to now)
 * @returns Formatted relative day string
 *
 * @example
 * formatRelativeDay(new Date()) // "Today"
 * formatRelativeDay(yesterday) // "Yesterday"
 * formatRelativeDay(threeDaysAgo) // "Monday" (if Monday was 3 days ago)
 * formatRelativeDay(twoWeeksAgo) // "Dec 15"
 */
export function formatRelativeDay(date: Date, referenceDate: Date = new Date()): string {
  const daysDiff = getDaysDifference(date, referenceDate)

  if (daysDiff === 0) {
    return 'Today'
  }

  if (daysDiff === 1) {
    return 'Yesterday'
  }

  if (daysDiff > 1 && daysDiff < WEEKDAY_THRESHOLD) {
    const dayIndex = date.getDay()
    return DAY_NAMES[dayIndex]
  }

  // For older dates, show "Mon DD" format
  const month = MONTH_NAMES_SHORT[date.getMonth()]
  const day = date.getDate()
  return `${month} ${day}`
}

/**
 * Format a sighting time for display based on granularity
 *
 * Combines relative day formatting with time or period:
 * - Specific: "Today at 3:15 PM", "Yesterday at 10:30 AM"
 * - Approximate: "Today morning", "Yesterday afternoon", "Tuesday evening"
 *
 * @param date - The sighting date/time
 * @param granularity - Time granularity ('specific', 'morning', 'afternoon', 'evening')
 * @param options - Optional formatting options
 * @returns Formatted sighting time string
 *
 * @example
 * // Specific time
 * formatSightingTime(new Date(), 'specific')
 * // => "Today at 3:15 PM"
 *
 * // Approximate time
 * formatSightingTime(yesterday, 'afternoon')
 * // => "Yesterday afternoon"
 *
 * // Older date with specific time
 * formatSightingTime(lastWeek, 'specific')
 * // => "Dec 20 at 2:30 PM"
 */
export function formatSightingTime(
  date: Date,
  granularity: TimeGranularity,
  options: FormatTimeOptions = {}
): string {
  const config = { ...DEFAULT_FORMAT_OPTIONS, ...options }
  const dayLabel = formatRelativeDay(date, options.referenceDate)

  if (granularity === 'specific') {
    const timeStr = formatTimeOfDay(date, config.use12HourFormat)
    return `${dayLabel} at ${timeStr}`
  }

  // For approximate granularity, append the period label
  return `${dayLabel} ${granularity}`
}

/**
 * Check if a date is older than 30 days
 *
 * Used to determine if a post should be deprioritized in listing order.
 *
 * @param date - The date to check
 * @param referenceDate - Optional reference date (defaults to now)
 * @returns true if the date is more than 30 days old
 *
 * @example
 * isOlderThan30Days(new Date()) // false
 * isOlderThan30Days(thirtyOneDaysAgo) // true
 */
export function isOlderThan30Days(date: Date, referenceDate: Date = new Date()): boolean {
  const daysDiff = getDaysDifference(date, referenceDate)
  return daysDiff > DEPRIORITIZE_AFTER_DAYS
}

/**
 * Validate that a sighting date is valid and not in the future
 *
 * Checks:
 * - Date is a valid Date object
 * - Date is not in the future (with 1-minute tolerance for edge cases)
 *
 * @param date - The date to validate
 * @param referenceDate - Optional reference date (defaults to now)
 * @returns Validation result with success status and optional error message
 *
 * @example
 * const result = validateSightingDate(new Date())
 * if (result.valid) {
 *   // Date is acceptable
 * } else {
 *   showError(result.error)
 * }
 */
export function validateSightingDate(
  date: Date | null | undefined,
  referenceDate: Date = new Date()
): DateValidationResult {
  // Check for null/undefined
  if (!date) {
    return {
      valid: false,
      error: DATE_TIME_ERRORS.INVALID_DATE,
    }
  }

  // Check for invalid date
  if (isNaN(date.getTime())) {
    return {
      valid: false,
      error: DATE_TIME_ERRORS.INVALID_DATE,
    }
  }

  // Allow 1-minute tolerance for clock differences
  const tolerance = 60 * 1000 // 1 minute in milliseconds
  const futureThreshold = referenceDate.getTime() + tolerance

  if (date.getTime() > futureThreshold) {
    return {
      valid: false,
      error: DATE_TIME_ERRORS.FUTURE_DATE,
    }
  }

  return {
    valid: true,
    error: null,
  }
}

/**
 * Get the time range for a given granularity
 *
 * Returns the hour boundaries for approximate time periods:
 * - morning: 6:00 AM - 11:59 AM
 * - afternoon: 12:00 PM - 5:59 PM
 * - evening: 6:00 PM - 11:59 PM
 *
 * @param granularity - The time granularity (excluding 'specific')
 * @returns TimeRange object with start/end hours and label
 *
 * @example
 * getTimeRangeForGranularity('morning')
 * // => { startHour: 6, endHour: 12, label: 'morning' }
 */
export function getTimeRangeForGranularity(
  granularity: 'morning' | 'afternoon' | 'evening'
): TimeRange {
  return TIME_GRANULARITY_RANGES[granularity]
}

/**
 * Determine the appropriate granularity for a given hour
 *
 * Maps an hour of the day to its corresponding time period:
 * - 0-5: evening (late night)
 * - 6-11: morning
 * - 12-17: afternoon
 * - 18-23: evening
 *
 * @param hour - Hour of day (0-23)
 * @returns The corresponding granularity period
 *
 * @example
 * getGranularityForHour(10) // 'morning'
 * getGranularityForHour(14) // 'afternoon'
 * getGranularityForHour(20) // 'evening'
 */
export function getGranularityForHour(hour: number): Exclude<TimeGranularity, 'specific'> {
  if (hour >= 6 && hour < 12) {
    return 'morning'
  }
  if (hour >= 12 && hour < 18) {
    return 'afternoon'
  }
  return 'evening'
}

/**
 * Parse a date string or timestamp to a Date object
 *
 * Safely handles various input formats including ISO strings and timestamps.
 *
 * @param input - Date string, timestamp, or Date object
 * @returns Parsed Date object or null if invalid
 *
 * @example
 * parseDate('2024-12-24T15:30:00Z') // Date object
 * parseDate(1703433000000) // Date object
 * parseDate(new Date()) // Same Date object
 * parseDate('invalid') // null
 */
export function parseDate(input: string | number | Date | null | undefined): Date | null {
  if (!input) {
    return null
  }

  if (input instanceof Date) {
    return isNaN(input.getTime()) ? null : input
  }

  const date = new Date(input)
  return isNaN(date.getTime()) ? null : date
}

/**
 * Create a Date object for a specific date and approximate time period
 *
 * Sets the time to the middle of the specified period:
 * - morning: 9:00 AM
 * - afternoon: 3:00 PM
 * - evening: 9:00 PM
 *
 * @param date - Base date
 * @param granularity - Time period to set
 * @returns Date object with time set to period midpoint
 *
 * @example
 * createDateWithGranularity(today, 'morning')
 * // => Date set to today at 9:00 AM
 */
export function createDateWithGranularity(
  date: Date,
  granularity: 'morning' | 'afternoon' | 'evening'
): Date {
  const result = new Date(date)
  const range = getTimeRangeForGranularity(granularity)

  // Set to middle of the time range
  const midHour = Math.floor((range.startHour + range.endHour) / 2)
  result.setHours(midHour, 0, 0, 0)

  return result
}

/**
 * Get a date relative to today
 *
 * @param daysAgo - Number of days in the past (0 = today)
 * @returns Date object for that day at midnight
 *
 * @example
 * getRelativeDate(0) // Today at midnight
 * getRelativeDate(1) // Yesterday at midnight
 * getRelativeDate(7) // One week ago at midnight
 */
export function getRelativeDate(daysAgo: number): Date {
  const date = new Date()
  date.setDate(date.getDate() - daysAgo)
  return getStartOfDay(date)
}

/**
 * Format a compact date string for display
 *
 * @param date - Date to format
 * @returns Compact date string (e.g., "Dec 24, 2024")
 */
export function formatCompactDate(date: Date): string {
  const month = MONTH_NAMES_SHORT[date.getMonth()]
  const day = date.getDate()
  const year = date.getFullYear()
  return `${month} ${day}, ${year}`
}

/**
 * Check if a date is today
 *
 * @param date - Date to check
 * @param referenceDate - Optional reference date (defaults to now)
 * @returns true if the date is today
 */
export function isToday(date: Date, referenceDate: Date = new Date()): boolean {
  return getDaysDifference(date, referenceDate) === 0
}

/**
 * Check if a date is yesterday
 *
 * @param date - Date to check
 * @param referenceDate - Optional reference date (defaults to now)
 * @returns true if the date is yesterday
 */
export function isYesterday(date: Date, referenceDate: Date = new Date()): boolean {
  return getDaysDifference(date, referenceDate) === 1
}

/**
 * Check if a date is within the past week
 *
 * @param date - Date to check
 * @param referenceDate - Optional reference date (defaults to now)
 * @returns true if the date is within the past 7 days
 */
export function isWithinPastWeek(date: Date, referenceDate: Date = new Date()): boolean {
  const daysDiff = getDaysDifference(date, referenceDate)
  return daysDiff >= 0 && daysDiff < WEEKDAY_THRESHOLD
}

// ============================================================================
// FILTER HELPERS
// ============================================================================

/**
 * Time filter options for post browsing
 */
export type TimeFilterOption = 'last_24h' | 'last_week' | 'last_month' | 'any_time'

/**
 * Get the cutoff date for a time filter option
 *
 * @param filter - Time filter option
 * @param referenceDate - Optional reference date (defaults to now)
 * @returns Cutoff date or null for 'any_time'
 *
 * @example
 * getFilterCutoffDate('last_24h') // Date 24 hours ago
 * getFilterCutoffDate('last_week') // Date 7 days ago
 * getFilterCutoffDate('any_time') // null
 */
export function getFilterCutoffDate(
  filter: TimeFilterOption,
  referenceDate: Date = new Date()
): Date | null {
  const now = referenceDate.getTime()

  switch (filter) {
    case 'last_24h':
      return new Date(now - 24 * 60 * 60 * 1000)
    case 'last_week':
      return new Date(now - 7 * 24 * 60 * 60 * 1000)
    case 'last_month':
      return new Date(now - 30 * 24 * 60 * 60 * 1000)
    case 'any_time':
      return null
  }
}

/**
 * Time filter display labels
 */
export const TIME_FILTER_LABELS: Record<TimeFilterOption, string> = {
  last_24h: 'Last 24h',
  last_week: 'Last Week',
  last_month: 'Last Month',
  any_time: 'Any Time',
}

/**
 * All available time filter options in display order
 */
export const TIME_FILTER_OPTIONS: TimeFilterOption[] = [
  'last_24h',
  'last_week',
  'last_month',
  'any_time',
]

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  formatRelativeDay,
  formatSightingTime,
  isOlderThan30Days,
  validateSightingDate,
  getTimeRangeForGranularity,
  getGranularityForHour,
  parseDate,
  createDateWithGranularity,
  getRelativeDate,
  formatCompactDate,
  isToday,
  isYesterday,
  isWithinPastWeek,
  getFilterCutoffDate,
}
