/**
 * Unit tests for DateTime utility functions
 *
 * These tests cover:
 * - formatRelativeDay: Relative day formatting (Today, Yesterday, weekday, date)
 * - formatSightingTime: Time display with granularity support
 * - isOlderThan30Days: Post deprioritization logic
 * - validateSightingDate: Date validation (no future dates)
 * - Time granularity helpers
 * - Filter cutoff date calculations
 * - Edge cases and constants
 *
 * @example
 * To run these tests:
 * npm test -- __tests__/utils/dateTime.test.ts
 */

import { describe, it, expect } from 'vitest'
import {
  // Constants
  DEPRIORITIZE_AFTER_DAYS,
  RELATIVE_DAY_THRESHOLD,
  WEEKDAY_THRESHOLD,
  DAY_NAMES,
  MONTH_NAMES,
  MONTH_NAMES_SHORT,
  TIME_GRANULARITY_RANGES,
  DATE_TIME_ERRORS,
  DEFAULT_FORMAT_OPTIONS,
  TIME_FILTER_LABELS,
  TIME_FILTER_OPTIONS,
  // Main functions
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
  // Types
  type TimeFilterOption,
  type DateValidationResult,
  type TimeRange,
  type FormatTimeOptions,
} from '@/utils/dateTime'
import type { TimeGranularity } from '@/types/database'

// ============================================================================
// Test Helpers
// ============================================================================

/**
 * Create a date relative to a reference date
 *
 * @param daysAgo - Number of days in the past (negative for future)
 * @param referenceDate - The reference date (defaults to now)
 * @returns Date object
 */
function createDate(daysAgo: number, referenceDate: Date = new Date()): Date {
  const result = new Date(referenceDate)
  result.setDate(result.getDate() - daysAgo)
  return result
}

/**
 * Create a date with specific time
 *
 * @param daysAgo - Number of days in the past
 * @param hours - Hour of day (0-23)
 * @param minutes - Minutes (0-59)
 * @param referenceDate - The reference date
 * @returns Date object with specific time
 */
function createDateWithTime(
  daysAgo: number,
  hours: number,
  minutes: number = 0,
  referenceDate: Date = new Date()
): Date {
  const result = createDate(daysAgo, referenceDate)
  result.setHours(hours, minutes, 0, 0)
  return result
}

// Fixed reference date for consistent testing: December 27, 2024 at 3:00 PM
const REFERENCE_DATE = new Date('2024-12-27T15:00:00')

// ============================================================================
// Constants Tests
// ============================================================================

describe('Constants', () => {
  describe('Threshold values', () => {
    it('should have correct DEPRIORITIZE_AFTER_DAYS value', () => {
      expect(DEPRIORITIZE_AFTER_DAYS).toBe(30)
    })

    it('should have correct RELATIVE_DAY_THRESHOLD value', () => {
      expect(RELATIVE_DAY_THRESHOLD).toBe(2)
    })

    it('should have correct WEEKDAY_THRESHOLD value', () => {
      expect(WEEKDAY_THRESHOLD).toBe(7)
    })
  })

  describe('Day and month names', () => {
    it('should have all 7 day names', () => {
      expect(DAY_NAMES).toHaveLength(7)
      expect(DAY_NAMES[0]).toBe('Sunday')
      expect(DAY_NAMES[6]).toBe('Saturday')
    })

    it('should have all 12 month names', () => {
      expect(MONTH_NAMES).toHaveLength(12)
      expect(MONTH_NAMES[0]).toBe('January')
      expect(MONTH_NAMES[11]).toBe('December')
    })

    it('should have all 12 short month names', () => {
      expect(MONTH_NAMES_SHORT).toHaveLength(12)
      expect(MONTH_NAMES_SHORT[0]).toBe('Jan')
      expect(MONTH_NAMES_SHORT[11]).toBe('Dec')
    })
  })

  describe('Time granularity ranges', () => {
    it('should have correct morning range (6am-12pm)', () => {
      const morning = TIME_GRANULARITY_RANGES.morning
      expect(morning.startHour).toBe(6)
      expect(morning.endHour).toBe(12)
      expect(morning.label).toBe('morning')
    })

    it('should have correct afternoon range (12pm-6pm)', () => {
      const afternoon = TIME_GRANULARITY_RANGES.afternoon
      expect(afternoon.startHour).toBe(12)
      expect(afternoon.endHour).toBe(18)
      expect(afternoon.label).toBe('afternoon')
    })

    it('should have correct evening range (6pm-12am)', () => {
      const evening = TIME_GRANULARITY_RANGES.evening
      expect(evening.startHour).toBe(18)
      expect(evening.endHour).toBe(24)
      expect(evening.label).toBe('evening')
    })
  })

  describe('Error messages', () => {
    it('should have all required error messages', () => {
      expect(DATE_TIME_ERRORS.FUTURE_DATE).toBeDefined()
      expect(DATE_TIME_ERRORS.INVALID_DATE).toBeDefined()
      expect(DATE_TIME_ERRORS.TOO_OLD).toBeDefined()
    })

    it('should have user-friendly error messages', () => {
      expect(typeof DATE_TIME_ERRORS.FUTURE_DATE).toBe('string')
      expect(DATE_TIME_ERRORS.FUTURE_DATE.length).toBeGreaterThan(10)
    })
  })

  describe('Default format options', () => {
    it('should have correct default options', () => {
      expect(DEFAULT_FORMAT_OPTIONS.includeDayOfWeek).toBe(true)
      expect(DEFAULT_FORMAT_OPTIONS.use12HourFormat).toBe(true)
    })
  })

  describe('Time filter constants', () => {
    it('should have all filter options', () => {
      expect(TIME_FILTER_OPTIONS).toHaveLength(4)
      expect(TIME_FILTER_OPTIONS).toContain('last_24h')
      expect(TIME_FILTER_OPTIONS).toContain('last_week')
      expect(TIME_FILTER_OPTIONS).toContain('last_month')
      expect(TIME_FILTER_OPTIONS).toContain('any_time')
    })

    it('should have labels for all filter options', () => {
      expect(TIME_FILTER_LABELS.last_24h).toBe('Last 24h')
      expect(TIME_FILTER_LABELS.last_week).toBe('Last Week')
      expect(TIME_FILTER_LABELS.last_month).toBe('Last Month')
      expect(TIME_FILTER_LABELS.any_time).toBe('Any Time')
    })
  })
})

// ============================================================================
// formatRelativeDay Tests
// ============================================================================

describe('formatRelativeDay', () => {
  it('should return "Today" for current date', () => {
    const today = createDate(0, REFERENCE_DATE)
    expect(formatRelativeDay(today, REFERENCE_DATE)).toBe('Today')
  })

  it('should return "Yesterday" for one day ago', () => {
    const yesterday = createDate(1, REFERENCE_DATE)
    expect(formatRelativeDay(yesterday, REFERENCE_DATE)).toBe('Yesterday')
  })

  it('should return day name for dates within the past week', () => {
    // 2 days ago should be Wednesday (Dec 25, 2024)
    const twoDaysAgo = createDate(2, REFERENCE_DATE)
    const dayName = DAY_NAMES[twoDaysAgo.getDay()]
    expect(formatRelativeDay(twoDaysAgo, REFERENCE_DATE)).toBe(dayName)

    // 3 days ago should be Tuesday (Dec 24, 2024)
    const threeDaysAgo = createDate(3, REFERENCE_DATE)
    const dayName2 = DAY_NAMES[threeDaysAgo.getDay()]
    expect(formatRelativeDay(threeDaysAgo, REFERENCE_DATE)).toBe(dayName2)

    // 6 days ago should be Saturday (Dec 21, 2024)
    const sixDaysAgo = createDate(6, REFERENCE_DATE)
    const dayName3 = DAY_NAMES[sixDaysAgo.getDay()]
    expect(formatRelativeDay(sixDaysAgo, REFERENCE_DATE)).toBe(dayName3)
  })

  it('should return "Mon DD" format for dates older than a week', () => {
    // 8 days ago should be Dec 19, 2024
    const eightDaysAgo = createDate(8, REFERENCE_DATE)
    expect(formatRelativeDay(eightDaysAgo, REFERENCE_DATE)).toBe('Dec 19')

    // 30 days ago should be Nov 27, 2024
    const thirtyDaysAgo = createDate(30, REFERENCE_DATE)
    expect(formatRelativeDay(thirtyDaysAgo, REFERENCE_DATE)).toBe('Nov 27')
  })

  it('should handle edge case at 7 days boundary', () => {
    // Exactly 7 days ago should use "Mon DD" format
    const sevenDaysAgo = createDate(7, REFERENCE_DATE)
    const result = formatRelativeDay(sevenDaysAgo, REFERENCE_DATE)
    expect(result).toBe('Dec 20')
  })

  it('should default to current date when no reference provided', () => {
    const today = new Date()
    today.setHours(12, 0, 0, 0)
    expect(formatRelativeDay(today)).toBe('Today')
  })
})

// ============================================================================
// formatSightingTime Tests
// ============================================================================

describe('formatSightingTime', () => {
  describe('with specific granularity', () => {
    it('should format "Today at HH:MM AM/PM"', () => {
      const today = createDateWithTime(0, 15, 30, REFERENCE_DATE)
      const result = formatSightingTime(today, 'specific', { use12HourFormat: true, referenceDate: REFERENCE_DATE })
      expect(result).toBe('Today at 3:30 PM')
    })

    it('should format "Yesterday at HH:MM AM/PM"', () => {
      const yesterday = createDateWithTime(1, 10, 15, REFERENCE_DATE)
      const result = formatSightingTime(yesterday, 'specific', { referenceDate: REFERENCE_DATE })
      expect(result).toBe('Yesterday at 10:15 AM')
    })

    it('should format day name with time for dates within week', () => {
      const threeDaysAgo = createDateWithTime(3, 14, 0, REFERENCE_DATE)
      const dayName = DAY_NAMES[threeDaysAgo.getDay()]
      const result = formatSightingTime(threeDaysAgo, 'specific', { referenceDate: REFERENCE_DATE })
      expect(result).toBe(`${dayName} at 2:00 PM`)
    })

    it('should format "Mon DD at HH:MM" for older dates', () => {
      const oldDate = createDateWithTime(10, 9, 45, REFERENCE_DATE)
      const result = formatSightingTime(oldDate, 'specific', { referenceDate: REFERENCE_DATE })
      expect(result).toBe('Dec 17 at 9:45 AM')
    })

    it('should handle midnight correctly', () => {
      const midnight = createDateWithTime(1, 0, 0, REFERENCE_DATE)
      const result = formatSightingTime(midnight, 'specific', { referenceDate: REFERENCE_DATE })
      expect(result).toBe('Yesterday at 12:00 AM')
    })

    it('should handle noon correctly', () => {
      const noon = createDateWithTime(0, 12, 0, REFERENCE_DATE)
      const result = formatSightingTime(noon, 'specific', { use12HourFormat: true, referenceDate: REFERENCE_DATE })
      expect(result).toBe('Today at 12:00 PM')
    })
  })

  describe('with morning granularity', () => {
    it('should format "Today morning"', () => {
      const today = createDateWithTime(0, 9, 0, REFERENCE_DATE)
      const result = formatSightingTime(today, 'morning', { referenceDate: REFERENCE_DATE })
      expect(result).toBe('Today morning')
    })

    it('should format "Yesterday morning"', () => {
      const yesterday = createDate(1, REFERENCE_DATE)
      const result = formatSightingTime(yesterday, 'morning', { referenceDate: REFERENCE_DATE })
      expect(result).toBe('Yesterday morning')
    })

    it('should format day name with morning for dates within week', () => {
      const threeDaysAgo = createDate(3, REFERENCE_DATE)
      const dayName = DAY_NAMES[threeDaysAgo.getDay()]
      const result = formatSightingTime(threeDaysAgo, 'morning', { referenceDate: REFERENCE_DATE })
      expect(result).toBe(`${dayName} morning`)
    })

    it('should format "Mon DD morning" for older dates', () => {
      const oldDate = createDate(10, REFERENCE_DATE)
      const result = formatSightingTime(oldDate, 'morning', { referenceDate: REFERENCE_DATE })
      expect(result).toBe('Dec 17 morning')
    })
  })

  describe('with afternoon granularity', () => {
    it('should format "Today afternoon"', () => {
      const today = createDate(0, REFERENCE_DATE)
      const result = formatSightingTime(today, 'afternoon', { referenceDate: REFERENCE_DATE })
      expect(result).toBe('Today afternoon')
    })

    it('should format "Yesterday afternoon"', () => {
      const yesterday = createDate(1, REFERENCE_DATE)
      const result = formatSightingTime(yesterday, 'afternoon', { referenceDate: REFERENCE_DATE })
      expect(result).toBe('Yesterday afternoon')
    })
  })

  describe('with evening granularity', () => {
    it('should format "Today evening"', () => {
      const today = createDate(0, REFERENCE_DATE)
      const result = formatSightingTime(today, 'evening', { referenceDate: REFERENCE_DATE })
      expect(result).toBe('Today evening')
    })

    it('should format "Tuesday evening" for day within week', () => {
      const threeDaysAgo = createDate(3, REFERENCE_DATE)
      const dayName = DAY_NAMES[threeDaysAgo.getDay()]
      const result = formatSightingTime(threeDaysAgo, 'evening', { referenceDate: REFERENCE_DATE })
      expect(result).toBe(`${dayName} evening`)
    })
  })

  describe('format options', () => {
    it('should respect use12HourFormat option when false', () => {
      const date = createDateWithTime(0, 14, 30, REFERENCE_DATE)
      const result = formatSightingTime(date, 'specific', { use12HourFormat: false, referenceDate: REFERENCE_DATE })
      expect(result).toBe('Today at 14:30')
    })
  })
})

// ============================================================================
// isOlderThan30Days Tests
// ============================================================================

describe('isOlderThan30Days', () => {
  it('should return false for today', () => {
    const today = createDate(0, REFERENCE_DATE)
    expect(isOlderThan30Days(today, REFERENCE_DATE)).toBe(false)
  })

  it('should return false for yesterday', () => {
    const yesterday = createDate(1, REFERENCE_DATE)
    expect(isOlderThan30Days(yesterday, REFERENCE_DATE)).toBe(false)
  })

  it('should return false for exactly 30 days ago', () => {
    const thirtyDaysAgo = createDate(30, REFERENCE_DATE)
    expect(isOlderThan30Days(thirtyDaysAgo, REFERENCE_DATE)).toBe(false)
  })

  it('should return true for 31 days ago', () => {
    const thirtyOneDaysAgo = createDate(31, REFERENCE_DATE)
    expect(isOlderThan30Days(thirtyOneDaysAgo, REFERENCE_DATE)).toBe(true)
  })

  it('should return true for 60 days ago', () => {
    const sixtyDaysAgo = createDate(60, REFERENCE_DATE)
    expect(isOlderThan30Days(sixtyDaysAgo, REFERENCE_DATE)).toBe(true)
  })

  it('should return true for 365 days ago', () => {
    const oneYearAgo = createDate(365, REFERENCE_DATE)
    expect(isOlderThan30Days(oneYearAgo, REFERENCE_DATE)).toBe(true)
  })

  it('should handle boundary correctly at 30/31 day threshold', () => {
    const exactly30Days = createDate(30, REFERENCE_DATE)
    const slightly31Days = createDate(31, REFERENCE_DATE)

    expect(isOlderThan30Days(exactly30Days, REFERENCE_DATE)).toBe(false)
    expect(isOlderThan30Days(slightly31Days, REFERENCE_DATE)).toBe(true)
  })

  it('should use current date when no reference provided', () => {
    const recent = new Date()
    recent.setDate(recent.getDate() - 5)
    expect(isOlderThan30Days(recent)).toBe(false)

    const old = new Date()
    old.setDate(old.getDate() - 35)
    expect(isOlderThan30Days(old)).toBe(true)
  })
})

// ============================================================================
// validateSightingDate Tests
// ============================================================================

describe('validateSightingDate', () => {
  describe('valid dates', () => {
    it('should accept today', () => {
      const today = createDate(0, REFERENCE_DATE)
      const result = validateSightingDate(today, REFERENCE_DATE)
      expect(result.valid).toBe(true)
      expect(result.error).toBeNull()
    })

    it('should accept yesterday', () => {
      const yesterday = createDate(1, REFERENCE_DATE)
      const result = validateSightingDate(yesterday, REFERENCE_DATE)
      expect(result.valid).toBe(true)
      expect(result.error).toBeNull()
    })

    it('should accept dates far in the past', () => {
      const oldDate = createDate(365, REFERENCE_DATE)
      const result = validateSightingDate(oldDate, REFERENCE_DATE)
      expect(result.valid).toBe(true)
      expect(result.error).toBeNull()
    })

    it('should accept dates within 1-minute tolerance of now', () => {
      // Create a date 30 seconds in the future - should still be valid
      const nearFuture = new Date(REFERENCE_DATE.getTime() + 30 * 1000)
      const result = validateSightingDate(nearFuture, REFERENCE_DATE)
      expect(result.valid).toBe(true)
    })
  })

  describe('invalid dates - future', () => {
    it('should reject dates more than 1 minute in the future', () => {
      const future = new Date(REFERENCE_DATE.getTime() + 5 * 60 * 1000) // 5 minutes in future
      const result = validateSightingDate(future, REFERENCE_DATE)
      expect(result.valid).toBe(false)
      expect(result.error).toBe(DATE_TIME_ERRORS.FUTURE_DATE)
    })

    it('should reject tomorrow', () => {
      const tomorrow = createDate(-1, REFERENCE_DATE)
      const result = validateSightingDate(tomorrow, REFERENCE_DATE)
      expect(result.valid).toBe(false)
      expect(result.error).toBe(DATE_TIME_ERRORS.FUTURE_DATE)
    })

    it('should reject dates far in the future', () => {
      const farFuture = createDate(-100, REFERENCE_DATE)
      const result = validateSightingDate(farFuture, REFERENCE_DATE)
      expect(result.valid).toBe(false)
      expect(result.error).toBe(DATE_TIME_ERRORS.FUTURE_DATE)
    })
  })

  describe('invalid dates - null/undefined/invalid', () => {
    it('should reject null', () => {
      const result = validateSightingDate(null, REFERENCE_DATE)
      expect(result.valid).toBe(false)
      expect(result.error).toBe(DATE_TIME_ERRORS.INVALID_DATE)
    })

    it('should reject undefined', () => {
      const result = validateSightingDate(undefined, REFERENCE_DATE)
      expect(result.valid).toBe(false)
      expect(result.error).toBe(DATE_TIME_ERRORS.INVALID_DATE)
    })

    it('should reject invalid Date object', () => {
      const invalidDate = new Date('invalid-date-string')
      const result = validateSightingDate(invalidDate, REFERENCE_DATE)
      expect(result.valid).toBe(false)
      expect(result.error).toBe(DATE_TIME_ERRORS.INVALID_DATE)
    })
  })
})

// ============================================================================
// getTimeRangeForGranularity Tests
// ============================================================================

describe('getTimeRangeForGranularity', () => {
  it('should return correct range for morning', () => {
    const range = getTimeRangeForGranularity('morning')
    expect(range.startHour).toBe(6)
    expect(range.endHour).toBe(12)
    expect(range.label).toBe('morning')
  })

  it('should return correct range for afternoon', () => {
    const range = getTimeRangeForGranularity('afternoon')
    expect(range.startHour).toBe(12)
    expect(range.endHour).toBe(18)
    expect(range.label).toBe('afternoon')
  })

  it('should return correct range for evening', () => {
    const range = getTimeRangeForGranularity('evening')
    expect(range.startHour).toBe(18)
    expect(range.endHour).toBe(24)
    expect(range.label).toBe('evening')
  })
})

// ============================================================================
// getGranularityForHour Tests
// ============================================================================

describe('getGranularityForHour', () => {
  describe('morning hours (6am-12pm)', () => {
    it('should return morning for 6am', () => {
      expect(getGranularityForHour(6)).toBe('morning')
    })

    it('should return morning for 9am', () => {
      expect(getGranularityForHour(9)).toBe('morning')
    })

    it('should return morning for 11am', () => {
      expect(getGranularityForHour(11)).toBe('morning')
    })
  })

  describe('afternoon hours (12pm-6pm)', () => {
    it('should return afternoon for 12pm', () => {
      expect(getGranularityForHour(12)).toBe('afternoon')
    })

    it('should return afternoon for 3pm', () => {
      expect(getGranularityForHour(15)).toBe('afternoon')
    })

    it('should return afternoon for 5pm', () => {
      expect(getGranularityForHour(17)).toBe('afternoon')
    })
  })

  describe('evening hours (6pm-12am)', () => {
    it('should return evening for 6pm', () => {
      expect(getGranularityForHour(18)).toBe('evening')
    })

    it('should return evening for 9pm', () => {
      expect(getGranularityForHour(21)).toBe('evening')
    })

    it('should return evening for 11pm', () => {
      expect(getGranularityForHour(23)).toBe('evening')
    })
  })

  describe('late night hours (12am-6am)', () => {
    it('should return evening for midnight', () => {
      expect(getGranularityForHour(0)).toBe('evening')
    })

    it('should return evening for 3am', () => {
      expect(getGranularityForHour(3)).toBe('evening')
    })

    it('should return evening for 5am', () => {
      expect(getGranularityForHour(5)).toBe('evening')
    })
  })

  describe('boundary cases', () => {
    it('should return morning at exactly 6am', () => {
      expect(getGranularityForHour(6)).toBe('morning')
    })

    it('should return afternoon at exactly 12pm', () => {
      expect(getGranularityForHour(12)).toBe('afternoon')
    })

    it('should return evening at exactly 6pm', () => {
      expect(getGranularityForHour(18)).toBe('evening')
    })
  })
})

// ============================================================================
// parseDate Tests
// ============================================================================

describe('parseDate', () => {
  it('should parse ISO date string', () => {
    const result = parseDate('2024-12-27T15:00:00Z')
    expect(result).toBeInstanceOf(Date)
    expect(result?.getFullYear()).toBe(2024)
  })

  it('should parse timestamp number', () => {
    const timestamp = new Date('2024-12-27T15:00:00Z').getTime()
    const result = parseDate(timestamp)
    expect(result).toBeInstanceOf(Date)
    expect(result?.getFullYear()).toBe(2024)
  })

  it('should return same Date object when passed a Date', () => {
    const date = new Date('2024-12-27T15:00:00Z')
    const result = parseDate(date)
    expect(result).toBe(date)
  })

  it('should return null for null input', () => {
    expect(parseDate(null)).toBeNull()
  })

  it('should return null for undefined input', () => {
    expect(parseDate(undefined)).toBeNull()
  })

  it('should return null for invalid date string', () => {
    expect(parseDate('invalid-date')).toBeNull()
  })

  it('should return null for invalid Date object', () => {
    const invalidDate = new Date('invalid')
    expect(parseDate(invalidDate)).toBeNull()
  })

  it('should return null for empty string', () => {
    expect(parseDate('')).toBeNull()
  })
})

// ============================================================================
// createDateWithGranularity Tests
// ============================================================================

describe('createDateWithGranularity', () => {
  it('should set time to 9am for morning granularity', () => {
    const date = new Date('2024-12-27T15:00:00')
    const result = createDateWithGranularity(date, 'morning')
    expect(result.getHours()).toBe(9)
    expect(result.getMinutes()).toBe(0)
  })

  it('should set time to 3pm for afternoon granularity', () => {
    const date = new Date('2024-12-27T10:00:00')
    const result = createDateWithGranularity(date, 'afternoon')
    expect(result.getHours()).toBe(15)
    expect(result.getMinutes()).toBe(0)
  })

  it('should set time to 9pm for evening granularity', () => {
    const date = new Date('2024-12-27T10:00:00')
    const result = createDateWithGranularity(date, 'evening')
    expect(result.getHours()).toBe(21)
    expect(result.getMinutes()).toBe(0)
  })

  it('should preserve the original date', () => {
    const date = new Date('2024-12-27T15:30:00')
    const result = createDateWithGranularity(date, 'morning')
    expect(result.getFullYear()).toBe(2024)
    expect(result.getMonth()).toBe(11) // December is 11
    expect(result.getDate()).toBe(27)
  })

  it('should not modify the original date', () => {
    const original = new Date('2024-12-27T15:30:00')
    const originalTime = original.getTime()
    createDateWithGranularity(original, 'morning')
    expect(original.getTime()).toBe(originalTime)
  })
})

// ============================================================================
// getRelativeDate Tests
// ============================================================================

describe('getRelativeDate', () => {
  it('should return today at midnight for 0 days ago', () => {
    const result = getRelativeDate(0)
    const today = new Date()
    expect(result.getFullYear()).toBe(today.getFullYear())
    expect(result.getMonth()).toBe(today.getMonth())
    expect(result.getDate()).toBe(today.getDate())
    expect(result.getHours()).toBe(0)
    expect(result.getMinutes()).toBe(0)
  })

  it('should return yesterday at midnight for 1 day ago', () => {
    const result = getRelativeDate(1)
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    expect(result.getFullYear()).toBe(yesterday.getFullYear())
    expect(result.getMonth()).toBe(yesterday.getMonth())
    expect(result.getDate()).toBe(yesterday.getDate())
    expect(result.getHours()).toBe(0)
  })

  it('should return one week ago for 7 days ago', () => {
    const result = getRelativeDate(7)
    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)
    expect(result.getDate()).toBe(weekAgo.getDate())
  })
})

// ============================================================================
// formatCompactDate Tests
// ============================================================================

describe('formatCompactDate', () => {
  it('should format date as "Mon DD, YYYY"', () => {
    const date = new Date('2024-12-27T15:00:00')
    expect(formatCompactDate(date)).toBe('Dec 27, 2024')
  })

  it('should handle single-digit day', () => {
    const date = new Date('2024-12-05T15:00:00')
    expect(formatCompactDate(date)).toBe('Dec 5, 2024')
  })

  it('should handle January correctly', () => {
    const date = new Date('2024-01-15T15:00:00')
    expect(formatCompactDate(date)).toBe('Jan 15, 2024')
  })
})

// ============================================================================
// isToday / isYesterday / isWithinPastWeek Tests
// ============================================================================

describe('isToday', () => {
  it('should return true for current date', () => {
    const today = createDate(0, REFERENCE_DATE)
    expect(isToday(today, REFERENCE_DATE)).toBe(true)
  })

  it('should return false for yesterday', () => {
    const yesterday = createDate(1, REFERENCE_DATE)
    expect(isToday(yesterday, REFERENCE_DATE)).toBe(false)
  })

  it('should return false for tomorrow', () => {
    const tomorrow = createDate(-1, REFERENCE_DATE)
    expect(isToday(tomorrow, REFERENCE_DATE)).toBe(false)
  })

  it('should work with same day different times', () => {
    const morning = createDateWithTime(0, 9, 0, REFERENCE_DATE)
    const evening = createDateWithTime(0, 21, 0, REFERENCE_DATE)
    expect(isToday(morning, REFERENCE_DATE)).toBe(true)
    expect(isToday(evening, REFERENCE_DATE)).toBe(true)
  })
})

describe('isYesterday', () => {
  it('should return true for one day ago', () => {
    const yesterday = createDate(1, REFERENCE_DATE)
    expect(isYesterday(yesterday, REFERENCE_DATE)).toBe(true)
  })

  it('should return false for today', () => {
    const today = createDate(0, REFERENCE_DATE)
    expect(isYesterday(today, REFERENCE_DATE)).toBe(false)
  })

  it('should return false for two days ago', () => {
    const twoDaysAgo = createDate(2, REFERENCE_DATE)
    expect(isYesterday(twoDaysAgo, REFERENCE_DATE)).toBe(false)
  })
})

describe('isWithinPastWeek', () => {
  it('should return true for today', () => {
    const today = createDate(0, REFERENCE_DATE)
    expect(isWithinPastWeek(today, REFERENCE_DATE)).toBe(true)
  })

  it('should return true for 3 days ago', () => {
    const threeDaysAgo = createDate(3, REFERENCE_DATE)
    expect(isWithinPastWeek(threeDaysAgo, REFERENCE_DATE)).toBe(true)
  })

  it('should return true for 6 days ago', () => {
    const sixDaysAgo = createDate(6, REFERENCE_DATE)
    expect(isWithinPastWeek(sixDaysAgo, REFERENCE_DATE)).toBe(true)
  })

  it('should return false for exactly 7 days ago', () => {
    const sevenDaysAgo = createDate(7, REFERENCE_DATE)
    expect(isWithinPastWeek(sevenDaysAgo, REFERENCE_DATE)).toBe(false)
  })

  it('should return false for 10 days ago', () => {
    const tenDaysAgo = createDate(10, REFERENCE_DATE)
    expect(isWithinPastWeek(tenDaysAgo, REFERENCE_DATE)).toBe(false)
  })

  it('should return false for future dates', () => {
    const tomorrow = createDate(-1, REFERENCE_DATE)
    expect(isWithinPastWeek(tomorrow, REFERENCE_DATE)).toBe(false)
  })
})

// ============================================================================
// getFilterCutoffDate Tests
// ============================================================================

describe('getFilterCutoffDate', () => {
  describe('last_24h filter', () => {
    it('should return date 24 hours ago', () => {
      const result = getFilterCutoffDate('last_24h', REFERENCE_DATE)
      expect(result).toBeInstanceOf(Date)

      const expectedTime = REFERENCE_DATE.getTime() - 24 * 60 * 60 * 1000
      expect(result?.getTime()).toBe(expectedTime)
    })

    it('should be exactly 24 hours, not end of previous day', () => {
      const now = new Date('2024-12-27T10:30:00')
      const result = getFilterCutoffDate('last_24h', now)

      // Should be 10:30 yesterday, not midnight
      expect(result?.getHours()).toBe(10)
      expect(result?.getMinutes()).toBe(30)
    })
  })

  describe('last_week filter', () => {
    it('should return date 7 days ago', () => {
      const result = getFilterCutoffDate('last_week', REFERENCE_DATE)
      expect(result).toBeInstanceOf(Date)

      const expectedTime = REFERENCE_DATE.getTime() - 7 * 24 * 60 * 60 * 1000
      expect(result?.getTime()).toBe(expectedTime)
    })
  })

  describe('last_month filter', () => {
    it('should return date 30 days ago', () => {
      const result = getFilterCutoffDate('last_month', REFERENCE_DATE)
      expect(result).toBeInstanceOf(Date)

      const expectedTime = REFERENCE_DATE.getTime() - 30 * 24 * 60 * 60 * 1000
      expect(result?.getTime()).toBe(expectedTime)
    })
  })

  describe('any_time filter', () => {
    it('should return null', () => {
      const result = getFilterCutoffDate('any_time', REFERENCE_DATE)
      expect(result).toBeNull()
    })
  })

  it('should default to current date when no reference provided', () => {
    const result = getFilterCutoffDate('last_24h')
    expect(result).toBeInstanceOf(Date)

    const now = new Date()
    const expected = now.getTime() - 24 * 60 * 60 * 1000

    // Allow 1 second tolerance for test execution time
    expect(Math.abs((result?.getTime() ?? 0) - expected)).toBeLessThan(1000)
  })
})

// ============================================================================
// Edge Cases Tests
// ============================================================================

describe('Edge cases', () => {
  describe('Timezone considerations', () => {
    it('should handle dates consistently regardless of time of day', () => {
      const morningRef = new Date('2024-12-27T06:00:00')
      const eveningRef = new Date('2024-12-27T22:00:00')

      const yesterday = createDate(1, morningRef)
      expect(formatRelativeDay(yesterday, morningRef)).toBe('Yesterday')

      const yesterday2 = createDate(1, eveningRef)
      expect(formatRelativeDay(yesterday2, eveningRef)).toBe('Yesterday')
    })
  })

  describe('Month boundaries', () => {
    it('should handle month transitions correctly', () => {
      const jan1 = new Date('2024-01-01T12:00:00')
      const dec31 = new Date('2023-12-31T12:00:00')

      expect(formatRelativeDay(dec31, jan1)).toBe('Yesterday')
    })

    it('should format dates from previous month correctly', () => {
      const jan5 = new Date('2024-01-05T12:00:00')
      const dec25 = new Date('2023-12-25T12:00:00')

      // 11 days difference, should show "Mon DD"
      expect(formatRelativeDay(dec25, jan5)).toBe('Dec 25')
    })
  })

  describe('Year boundaries', () => {
    it('should handle year transitions correctly', () => {
      const jan1_2024 = new Date('2024-01-01T12:00:00')
      const dec31_2023 = new Date('2023-12-31T12:00:00')

      expect(isOlderThan30Days(dec31_2023, jan1_2024)).toBe(false)
    })

    it('should correctly identify old posts across years', () => {
      const jan1_2024 = new Date('2024-01-01T12:00:00')
      const nov1_2023 = new Date('2023-11-01T12:00:00')

      expect(isOlderThan30Days(nov1_2023, jan1_2024)).toBe(true)
    })
  })

  describe('Leap year handling', () => {
    it('should handle Feb 29 correctly', () => {
      const feb29 = new Date('2024-02-29T12:00:00')
      const mar1 = new Date('2024-03-01T12:00:00')

      expect(formatRelativeDay(feb29, mar1)).toBe('Yesterday')
    })
  })

  describe('Time formatting edge cases', () => {
    it('should format single-digit minutes with leading zero', () => {
      const date = createDateWithTime(0, 9, 5, REFERENCE_DATE)
      const result = formatSightingTime(date, 'specific')
      expect(result).toContain('9:05 AM')
    })

    it('should handle 11pm correctly', () => {
      const date = createDateWithTime(0, 23, 0, REFERENCE_DATE)
      const result = formatSightingTime(date, 'specific')
      expect(result).toContain('11:00 PM')
    })
  })
})

// ============================================================================
// Type Export Tests
// ============================================================================

describe('Type exports', () => {
  it('TimeFilterOption type is usable', () => {
    const filter: TimeFilterOption = 'last_24h'
    expect(TIME_FILTER_OPTIONS).toContain(filter)
  })

  it('DateValidationResult type is usable', () => {
    const result: DateValidationResult = {
      valid: true,
      error: null,
    }
    expect(result.valid).toBe(true)
  })

  it('TimeRange type is usable', () => {
    const range: TimeRange = {
      startHour: 6,
      endHour: 12,
      label: 'morning',
    }
    expect(range.startHour).toBe(6)
  })

  it('FormatTimeOptions type is usable', () => {
    const options: FormatTimeOptions = {
      includeDayOfWeek: true,
      use12HourFormat: false,
    }
    expect(options.use12HourFormat).toBe(false)
  })
})
