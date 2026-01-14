/**
 * @vitest-environment jsdom
 */

/**
 * Unit tests for Date & Time Utilities
 *
 * These tests cover:
 * - Date parsing (parseEventDate, safeParseDate)
 * - Time formatting (formatEventTime, formatEventDateRange, formatRelativeTime)
 * - Compact time strings (getCompactTimeString, formatTimeDistance)
 * - Event status detection (getEventStatus, isEventPast, isEventUpcoming, isEventToday)
 * - Reminder scheduling (calculateReminderTime, shouldSendReminder)
 * - Event relevance windows (getEventRelevanceWindow)
 * - Date range filtering (filterEventsByDateRange, getTodaysEvents, getUpcomingEvents)
 * - Timezone utilities (getTimezoneAbbreviation, getUserTimezone, isInLocalTimezone)
 *
 * Tests use date-fns for date manipulation and mocked Date.now() for consistent results.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  parseEventDate,
  safeParseDate,
  formatEventTime,
  formatEventDateRange,
  formatRelativeTime,
  formatTimeDistance,
  getCompactTimeString,
  getEventStatus,
  isEventPast,
  isEventUpcoming,
  isEventToday,
  calculateReminderTime,
  shouldSendReminder,
  getEventRelevanceWindow,
  filterEventsByDateRange,
  getTodaysEvents,
  getUpcomingEvents,
  getTimezoneAbbreviation,
  getUserTimezone,
  isInLocalTimezone,
  TIME_FORMATS,
  DEFAULT_REMINDER_HOURS,
  type EventTime,
  type EventTimeRange,
  type FormatEventTimeOptions,
} from '@/utils/date-helpers'
import { addDays, addHours, subHours, subDays } from 'date-fns'

// ============================================================================
// Test Setup
// ============================================================================

/**
 * Fixed reference date for consistent testing
 * December 15, 2024, 12:00:00 UTC
 */
const FIXED_NOW = new Date('2024-12-15T12:00:00.000Z')

/**
 * Store original Date implementation
 */
let originalDateNow: typeof Date.now

beforeEach(() => {
  // Mock Date.now() for consistent test results
  originalDateNow = Date.now
  vi.spyOn(Date, 'now').mockReturnValue(FIXED_NOW.getTime())
})

afterEach(() => {
  // Restore Date.now()
  vi.restoreAllMocks()
  Date.now = originalDateNow
})

// ============================================================================
// Mock Data
// ============================================================================

/**
 * Mock event time with full timezone info
 */
const mockEventTime: EventTime = {
  timezone: 'America/New_York',
  local: '2024-12-31T19:00:00',
  utc: '2024-12-31T00:00:00Z',
}

/**
 * Mock event time range for a typical event
 */
const mockEventTimeRange: EventTimeRange = {
  start: {
    timezone: 'America/New_York',
    local: '2024-12-31T19:00:00',
    utc: '2024-12-31T00:00:00Z',
  },
  end: {
    timezone: 'America/New_York',
    local: '2024-12-31T23:00:00',
    utc: '2025-01-01T04:00:00Z',
  },
}

/**
 * Create an event time range for testing
 */
function createEventTimeRange(
  startUtc: string,
  endUtc?: string
): EventTimeRange {
  return {
    start: { utc: startUtc },
    end: endUtc ? { utc: endUtc } : undefined,
  }
}

// ============================================================================
// Constants Tests
// ============================================================================

describe('Constants', () => {
  describe('DEFAULT_REMINDER_HOURS', () => {
    it('equals 24 hours', () => {
      expect(DEFAULT_REMINDER_HOURS).toBe(24)
    })
  })

  describe('TIME_FORMATS', () => {
    it('defines time-only format', () => {
      expect(TIME_FORMATS.timeOnly).toBe('h:mm a')
    })

    it('defines 24-hour time format', () => {
      expect(TIME_FORMATS.time24).toBe('HH:mm')
    })

    it('defines short date format', () => {
      expect(TIME_FORMATS.dateShort).toBe('MMM d')
    })

    it('defines full date format', () => {
      expect(TIME_FORMATS.dateFull).toBe('MMMM d, yyyy')
    })

    it('defines date with weekday format', () => {
      expect(TIME_FORMATS.dateWithDay).toBe('EEE, MMM d')
    })

    it('defines full datetime format', () => {
      expect(TIME_FORMATS.datetimeFull).toBe("MMM d, yyyy 'at' h:mm a")
    })

    it('defines compact datetime format', () => {
      expect(TIME_FORMATS.datetimeCompact).toBe('MMM d, h:mm a')
    })

    it('defines ISO date format', () => {
      expect(TIME_FORMATS.isoDate).toBe('yyyy-MM-dd')
    })

    it('defines weekday format', () => {
      expect(TIME_FORMATS.weekday).toBe('EEEE')
    })
  })
})

// ============================================================================
// parseEventDate Tests
// ============================================================================

describe('parseEventDate', () => {
  describe('with ISO string input', () => {
    it('parses UTC ISO 8601 string', () => {
      const result = parseEventDate('2024-12-31T19:00:00Z')

      expect(result).toBeInstanceOf(Date)
      expect(result.getTime()).toBe(new Date('2024-12-31T19:00:00Z').getTime())
    })

    it('parses ISO string with timezone offset', () => {
      const result = parseEventDate('2024-12-31T19:00:00-05:00')

      expect(result).toBeInstanceOf(Date)
      expect(result.getUTCHours()).toBe(0) // 19:00 EST = 00:00 UTC next day
    })

    it('parses ISO string without timezone', () => {
      const result = parseEventDate('2024-12-31T19:00:00')

      expect(result).toBeInstanceOf(Date)
    })

    it('parses date-only ISO string', () => {
      const result = parseEventDate('2024-12-31')

      expect(result).toBeInstanceOf(Date)
      expect(result.getFullYear()).toBe(2024)
      expect(result.getMonth()).toBe(11) // December
      expect(result.getDate()).toBe(31)
    })
  })

  describe('with Date object input', () => {
    it('returns the same Date object', () => {
      const input = new Date('2024-12-31T19:00:00Z')
      const result = parseEventDate(input)

      expect(result).toBe(input)
    })

    it('throws for invalid Date object', () => {
      const invalidDate = new Date('invalid')

      expect(() => parseEventDate(invalidDate)).toThrow('Invalid Date object provided')
    })
  })

  describe('with timestamp input', () => {
    it('parses valid Unix timestamp in milliseconds', () => {
      const timestamp = new Date('2024-12-31T19:00:00Z').getTime()
      const result = parseEventDate(timestamp)

      expect(result).toBeInstanceOf(Date)
      expect(result.getTime()).toBe(timestamp)
    })

    it('handles zero timestamp', () => {
      const result = parseEventDate(0)

      expect(result).toBeInstanceOf(Date)
      expect(result.getTime()).toBe(0)
    })
  })

  describe('error handling', () => {
    it('throws for invalid date string', () => {
      expect(() => parseEventDate('not-a-date')).toThrow('Invalid date string')
    })

    it('throws for empty string', () => {
      expect(() => parseEventDate('')).toThrow('Invalid date string')
    })
  })
})

// ============================================================================
// safeParseDate Tests
// ============================================================================

describe('safeParseDate', () => {
  describe('with valid input', () => {
    it('parses valid ISO string', () => {
      const result = safeParseDate('2024-12-31T19:00:00Z')

      expect(result).toBeInstanceOf(Date)
      expect(result?.getTime()).toBe(new Date('2024-12-31T19:00:00Z').getTime())
    })

    it('parses valid Date object', () => {
      const input = new Date('2024-12-31T19:00:00Z')
      const result = safeParseDate(input)

      expect(result).toBe(input)
    })

    it('parses valid timestamp', () => {
      const timestamp = new Date('2024-12-31T19:00:00Z').getTime()
      const result = safeParseDate(timestamp)

      expect(result).toBeInstanceOf(Date)
    })
  })

  describe('with invalid input', () => {
    it('returns null for invalid string', () => {
      expect(safeParseDate('not-a-date')).toBeNull()
    })

    it('returns null for null input', () => {
      expect(safeParseDate(null)).toBeNull()
    })

    it('returns null for undefined input', () => {
      expect(safeParseDate(undefined)).toBeNull()
    })

    it('returns null for empty string', () => {
      expect(safeParseDate('')).toBeNull()
    })

    it('returns null for invalid Date object', () => {
      const invalidDate = new Date('invalid')
      expect(safeParseDate(invalidDate)).toBeNull()
    })
  })
})

// ============================================================================
// formatEventTime Tests
// ============================================================================

describe('formatEventTime', () => {
  describe('with EventTime object', () => {
    it('formats with default options (date and time)', () => {
      const result = formatEventTime(mockEventTime)

      expect(result).toContain('Dec 31')
      expect(result).toContain('7:00 PM')
    })

    it('uses local time for display when available', () => {
      const eventTime: EventTime = {
        utc: '2024-12-31T00:00:00Z',
        local: '2024-12-31T19:00:00',
        timezone: 'America/New_York',
      }

      const result = formatEventTime(eventTime)

      // Should use local time (7:00 PM), not UTC (midnight)
      expect(result).toContain('7:00 PM')
    })

    it('falls back to UTC when local is not available', () => {
      const eventTime: EventTime = {
        utc: '2024-12-31T12:00:00Z',
      }

      const result = formatEventTime(eventTime)

      // When no local time, UTC time is parsed and formatted in local timezone
      // The result contains the date, so just verify it has the date portion
      expect(result).toContain('Dec 31')
    })
  })

  describe('with ISO string input', () => {
    it('formats ISO string directly', () => {
      const result = formatEventTime('2024-12-31T19:00:00Z')

      expect(result).toContain('Dec 31')
    })
  })

  describe('with formatting options', () => {
    it('includes date only when includeTime is false', () => {
      const result = formatEventTime(mockEventTime, { includeTime: false })

      // Format includes year if different from current year, or uses short format
      expect(result).toMatch(/Dec 31(, 2024)?/)
      expect(result).not.toContain('PM')
    })

    it('includes time only when includeDate is false', () => {
      const result = formatEventTime(mockEventTime, { includeDate: false })

      expect(result).toBe('7:00 PM')
      expect(result).not.toContain('Dec')
    })

    it('uses 24-hour format when use24Hour is true', () => {
      const result = formatEventTime(mockEventTime, { use24Hour: true })

      expect(result).toContain('19:00')
      expect(result).not.toContain('PM')
    })

    it('includes year when includeYear is true', () => {
      const result = formatEventTime(mockEventTime, { includeYear: true })

      expect(result).toContain('2024')
    })

    it('includes year automatically for different year', () => {
      // Mock current year as 2025
      vi.spyOn(Date, 'now').mockReturnValue(new Date('2025-06-15T12:00:00Z').getTime())

      const eventTime: EventTime = {
        utc: '2024-12-31T19:00:00Z',
      }

      const result = formatEventTime(eventTime)

      expect(result).toContain('2024')
    })

    it('includes timezone abbreviation when includeTimezone is true', () => {
      const result = formatEventTime(mockEventTime, { includeTimezone: true })

      expect(result).toContain('ET')
    })

    it('does not include timezone for string input even if requested', () => {
      const result = formatEventTime('2024-12-31T19:00:00Z', { includeTimezone: true })

      // Timezone abbreviation requires EventTime object with timezone field
      // The result should be a date/time string without a timezone suffix
      expect(result).toContain('Dec 31')
      // Check that it doesn't end with standard timezone abbreviations like ET, PT, GMT
      expect(result).not.toMatch(/\s(ET|PT|CT|MT|GMT|UTC|CET|JST|AEST)$/)
    })
  })

  describe('combined options', () => {
    it('handles all options at once', () => {
      const options: FormatEventTimeOptions = {
        includeDate: true,
        includeTime: true,
        includeTimezone: true,
        use24Hour: true,
        includeYear: true,
      }

      const result = formatEventTime(mockEventTime, options)

      expect(result).toContain('Dec 31, 2024')
      expect(result).toContain('19:00')
      expect(result).toContain('ET')
    })
  })
})

// ============================================================================
// formatEventDateRange Tests
// ============================================================================

describe('formatEventDateRange', () => {
  describe('with end time on same day', () => {
    it('shows time only for end when on same day', () => {
      const start: EventTime = {
        utc: '2024-12-31T19:00:00Z',
        local: '2024-12-31T19:00:00',
      }
      const end: EventTime = {
        utc: '2024-12-31T23:00:00Z',
        local: '2024-12-31T23:00:00',
      }

      const result = formatEventDateRange(start, end)

      expect(result).toContain('Dec 31')
      expect(result).toContain('7:00 PM')
      expect(result).toContain(' - ')
      expect(result).toContain('11:00 PM')
      // Should not repeat "Dec 31" for end time
      expect(result.match(/Dec 31/g)?.length).toBe(1)
    })
  })

  describe('with end time on different day', () => {
    it('shows full date for both start and end', () => {
      const start: EventTime = {
        utc: '2024-12-31T19:00:00Z',
        local: '2024-12-31T19:00:00',
      }
      const end: EventTime = {
        utc: '2025-01-01T02:00:00Z',
        local: '2025-01-01T02:00:00',
      }

      const result = formatEventDateRange(start, end)

      expect(result).toContain('Dec 31')
      expect(result).toContain('Jan 1')
      expect(result).toContain(' - ')
    })
  })

  describe('without end time', () => {
    it('shows only start time', () => {
      const start: EventTime = {
        utc: '2024-12-31T19:00:00Z',
        local: '2024-12-31T19:00:00',
      }

      const result = formatEventDateRange(start)

      expect(result).toContain('Dec 31')
      expect(result).toContain('7:00 PM')
      expect(result).not.toContain(' - ')
    })
  })

  describe('with string inputs', () => {
    it('handles ISO string inputs', () => {
      const result = formatEventDateRange(
        '2024-12-31T19:00:00Z',
        '2024-12-31T23:00:00Z'
      )

      expect(result).toContain(' - ')
    })
  })
})

// ============================================================================
// formatRelativeTime Tests
// ============================================================================

describe('formatRelativeTime', () => {
  it('formats future date as relative', () => {
    // Tomorrow at noon from FIXED_NOW
    const tomorrow = addDays(FIXED_NOW, 1)
    const result = formatRelativeTime(tomorrow, FIXED_NOW)

    expect(result).toMatch(/tomorrow/i)
  })

  it('formats past date as relative', () => {
    // Yesterday at noon from FIXED_NOW
    const yesterday = subDays(FIXED_NOW, 1)
    const result = formatRelativeTime(yesterday, FIXED_NOW)

    expect(result).toMatch(/yesterday/i)
  })

  it('handles string date input', () => {
    const result = formatRelativeTime('2024-12-16T12:00:00Z', FIXED_NOW)

    expect(result).toMatch(/tomorrow/i)
  })

  it('uses current time as default base', () => {
    const tomorrow = addDays(FIXED_NOW, 1)
    const result = formatRelativeTime(tomorrow)

    // The result should be some relative time format
    // (exact format depends on locale and time difference)
    expect(typeof result).toBe('string')
    expect(result.length).toBeGreaterThan(0)
  })
})

// ============================================================================
// formatTimeDistance Tests
// ============================================================================

describe('formatTimeDistance', () => {
  it('formats future time with "in" prefix by default', () => {
    const now = new Date()
    const future = addHours(now, 2)
    const result = formatTimeDistance(future)

    // formatDistance uses actual Date.now(), so result may vary
    // Just check it contains "in" prefix and "hour"
    expect(result).toMatch(/in.*hour/i)
  })

  it('formats past time with "ago" suffix by default', () => {
    const now = new Date()
    const past = subHours(now, 3)
    const result = formatTimeDistance(past)

    // formatDistance uses actual Date.now(), so result may vary
    // Just check it contains "ago" suffix and "hour"
    expect(result).toMatch(/hour.*ago/i)
  })

  it('respects addSuffix option', () => {
    const now = new Date()
    const future = addHours(now, 2)
    const result = formatTimeDistance(future, { addSuffix: false })

    // Without suffix, should not start with "in"
    expect(result).toMatch(/hour/i)
    expect(result).not.toMatch(/^in /i)
  })

  it('handles string date input', () => {
    const future = addHours(new Date(), 2) // Use actual current time
    const result = formatTimeDistance(future.toISOString())

    expect(result).toMatch(/hour/i)
  })

  it('formats days correctly', () => {
    const future = addDays(new Date(), 5) // Use actual current time
    const result = formatTimeDistance(future)

    expect(result).toMatch(/day/i)
  })
})

// ============================================================================
// getCompactTimeString Tests
// ============================================================================

describe('getCompactTimeString', () => {
  describe('minutes', () => {
    it('returns minutes format for < 60 minutes', () => {
      const now = new Date()
      const date = addHours(now, 0.5) // 30 minutes
      const result = getCompactTimeString(date)

      expect(result).toMatch(/\d+min/)
    })

    it('handles 0 minutes', () => {
      const now = new Date()
      const result = getCompactTimeString(now)

      expect(result).toMatch(/\d+min/)
    })

    it('handles 59 minutes', () => {
      const now = new Date()
      const date = new Date(now.getTime() + 59 * 60 * 1000)
      const result = getCompactTimeString(date)

      expect(result).toMatch(/\d+min/)
    })
  })

  describe('hours', () => {
    it('returns hours format for 1-23 hours', () => {
      const now = new Date()
      const date = addHours(now, 5)
      const result = getCompactTimeString(date)

      expect(result).toMatch(/\d+h/)
    })

    it('handles exactly 1 hour', () => {
      const now = new Date()
      // Add slightly more than 1 hour to account for execution time
      const date = new Date(now.getTime() + 61 * 60 * 1000) // 61 minutes
      const result = getCompactTimeString(date)

      expect(result).toMatch(/\d+h/)
    })

    it('handles 23 hours', () => {
      const now = new Date()
      const date = addHours(now, 23)
      const result = getCompactTimeString(date)

      expect(result).toMatch(/\d+h/)
    })
  })

  describe('days', () => {
    it('returns days format for >= 24 hours', () => {
      const now = new Date()
      const date = addDays(now, 3)
      const result = getCompactTimeString(date)

      expect(result).toMatch(/\d+d/)
    })

    it('handles exactly 1 day', () => {
      const now = new Date()
      const date = addDays(now, 1)
      const result = getCompactTimeString(date)

      expect(result).toMatch(/\d+d/)
    })
  })

  describe('past times', () => {
    it('returns absolute value for past times', () => {
      const now = new Date()
      const past = subHours(now, 5)
      const result = getCompactTimeString(past)

      expect(result).toMatch(/\d+h/)
    })
  })

  describe('string input', () => {
    it('handles ISO string input', () => {
      const now = new Date()
      const futureDate = addHours(now, 2)
      const result = getCompactTimeString(futureDate.toISOString())

      expect(result).toMatch(/\d+h/)
    })
  })
})

// ============================================================================
// getEventStatus Tests
// ============================================================================

describe('getEventStatus', () => {
  describe('upcoming events', () => {
    it('returns "upcoming" for future event', () => {
      const now = new Date()
      const event = createEventTimeRange(
        addDays(now, 7).toISOString(),
        addDays(now, 7.25).toISOString()
      )

      expect(getEventStatus(event)).toBe('upcoming')
    })

    it('returns "upcoming" for event starting in 1 hour', () => {
      const now = new Date()
      const event = createEventTimeRange(
        addHours(now, 1).toISOString(),
        addHours(now, 4).toISOString()
      )

      expect(getEventStatus(event)).toBe('upcoming')
    })
  })

  describe('ongoing events', () => {
    it('returns "ongoing" when between start and end', () => {
      const now = new Date()
      const event = createEventTimeRange(
        subHours(now, 1).toISOString(),
        addHours(now, 2).toISOString()
      )

      expect(getEventStatus(event)).toBe('ongoing')
    })

    it('returns "ongoing" when no end time and within 4 hours of start', () => {
      const now = new Date()
      const event = createEventTimeRange(
        subHours(now, 2).toISOString()
      )

      expect(getEventStatus(event)).toBe('ongoing')
    })
  })

  describe('ended events', () => {
    it('returns "ended" when past end time', () => {
      const event = createEventTimeRange(
        subHours(FIXED_NOW, 5).toISOString(),
        subHours(FIXED_NOW, 1).toISOString()
      )

      expect(getEventStatus(event)).toBe('ended')
    })

    it('returns "ended" when no end time and > 4 hours past start', () => {
      const event = createEventTimeRange(
        subHours(FIXED_NOW, 6).toISOString()
      )

      expect(getEventStatus(event)).toBe('ended')
    })
  })

  describe('edge cases', () => {
    it('handles event starting exactly now', () => {
      const now = new Date()
      const event = createEventTimeRange(
        now.toISOString(),
        addHours(now, 2).toISOString()
      )

      // At the exact start time, it's ongoing
      expect(getEventStatus(event)).toBe('ongoing')
    })

    it('handles event ending exactly now', () => {
      const now = new Date()
      const event = createEventTimeRange(
        subHours(now, 2).toISOString(),
        now.toISOString()
      )

      // At the exact end time, it's still ongoing (within interval)
      expect(getEventStatus(event)).toBe('ongoing')
    })
  })
})

// ============================================================================
// isEventPast Tests
// ============================================================================

describe('isEventPast', () => {
  describe('with EventTime object', () => {
    it('returns true for past event', () => {
      const eventTime: EventTime = {
        utc: '2024-01-01T00:00:00Z',
      }

      expect(isEventPast(eventTime)).toBe(true)
    })

    it('returns false for future event', () => {
      const eventTime: EventTime = {
        utc: '2099-01-01T00:00:00Z',
      }

      expect(isEventPast(eventTime)).toBe(false)
    })
  })

  describe('with string input', () => {
    it('returns true for past date string', () => {
      expect(isEventPast('2020-01-01T00:00:00Z')).toBe(true)
    })

    it('returns false for future date string', () => {
      expect(isEventPast('2099-01-01T00:00:00Z')).toBe(false)
    })
  })
})

// ============================================================================
// isEventUpcoming Tests
// ============================================================================

describe('isEventUpcoming', () => {
  describe('with EventTime object', () => {
    it('returns true for future event', () => {
      const eventTime: EventTime = {
        utc: '2099-01-01T00:00:00Z',
      }

      expect(isEventUpcoming(eventTime)).toBe(true)
    })

    it('returns false for past event', () => {
      const eventTime: EventTime = {
        utc: '2020-01-01T00:00:00Z',
      }

      expect(isEventUpcoming(eventTime)).toBe(false)
    })
  })

  describe('with string input', () => {
    it('returns true for future date string', () => {
      expect(isEventUpcoming('2099-01-01T00:00:00Z')).toBe(true)
    })

    it('returns false for past date string', () => {
      expect(isEventUpcoming('2020-01-01T00:00:00Z')).toBe(false)
    })
  })
})

// ============================================================================
// isEventToday Tests
// ============================================================================

describe('isEventToday', () => {
  describe('with EventTime object', () => {
    it('returns true for event today', () => {
      // Create a local time string for today at noon
      const now = new Date()
      const localNoon = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0)
      const localString = `${localNoon.getFullYear()}-${String(localNoon.getMonth() + 1).padStart(2, '0')}-${String(localNoon.getDate()).padStart(2, '0')}T12:00:00`

      const eventTime: EventTime = {
        utc: localNoon.toISOString(),
        local: localString,
      }

      expect(isEventToday(eventTime)).toBe(true)
    })

    it('returns false for event tomorrow', () => {
      const now = new Date()
      const tomorrow = addDays(now, 1)
      const eventTime: EventTime = {
        utc: tomorrow.toISOString(),
      }

      expect(isEventToday(eventTime)).toBe(false)
    })

    it('returns false for event yesterday', () => {
      const now = new Date()
      const yesterday = subDays(now, 1)
      const eventTime: EventTime = {
        utc: yesterday.toISOString(),
      }

      expect(isEventToday(eventTime)).toBe(false)
    })

    it('prefers local time when available', () => {
      // Create a local time string for today
      const now = new Date()
      const localNoon = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0)
      const localString = `${localNoon.getFullYear()}-${String(localNoon.getMonth() + 1).padStart(2, '0')}-${String(localNoon.getDate()).padStart(2, '0')}T12:00:00`

      const eventTime: EventTime = {
        utc: subDays(now, 1).toISOString(), // Yesterday in UTC
        local: localString, // Today in local time
      }

      expect(isEventToday(eventTime)).toBe(true)
    })
  })

  describe('with string input', () => {
    it('returns true for today date string', () => {
      // Use a local time at noon to avoid timezone edge cases
      const now = new Date()
      const localNoon = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0)
      expect(isEventToday(localNoon.toISOString())).toBe(true)
    })
  })
})

// ============================================================================
// calculateReminderTime Tests
// ============================================================================

describe('calculateReminderTime', () => {
  describe('with default hours (24)', () => {
    it('returns date 24 hours after event end', () => {
      const eventEnd: EventTime = {
        utc: '2024-12-31T04:00:00Z',
      }

      const result = calculateReminderTime(eventEnd)

      expect(result.getTime()).toBe(
        new Date('2025-01-01T04:00:00Z').getTime()
      )
    })
  })

  describe('with custom hours', () => {
    it('returns date with custom hours offset', () => {
      const eventEnd: EventTime = {
        utc: '2024-12-31T04:00:00Z',
      }

      const result = calculateReminderTime(eventEnd, 48)

      expect(result.getTime()).toBe(
        new Date('2025-01-02T04:00:00Z').getTime()
      )
    })

    it('handles 0 hours (immediate reminder)', () => {
      const eventEnd: EventTime = {
        utc: '2024-12-31T04:00:00Z',
      }

      const result = calculateReminderTime(eventEnd, 0)

      expect(result.getTime()).toBe(
        new Date('2024-12-31T04:00:00Z').getTime()
      )
    })
  })

  describe('with string input', () => {
    it('parses string and calculates reminder time', () => {
      const result = calculateReminderTime('2024-12-31T04:00:00Z', 24)

      expect(result.getTime()).toBe(
        new Date('2025-01-01T04:00:00Z').getTime()
      )
    })
  })
})

// ============================================================================
// shouldSendReminder Tests
// ============================================================================

describe('shouldSendReminder', () => {
  describe('when reminder time is past', () => {
    it('returns true', () => {
      const pastReminder = subHours(FIXED_NOW, 1)

      expect(shouldSendReminder(pastReminder, FIXED_NOW)).toBe(true)
    })
  })

  describe('when reminder time is today', () => {
    it('returns true for same day', () => {
      // Same day, different time
      const todayReminder = addHours(FIXED_NOW, 2)

      expect(shouldSendReminder(todayReminder, FIXED_NOW)).toBe(true)
    })
  })

  describe('when reminder time is future', () => {
    it('returns false for tomorrow', () => {
      const futureReminder = addDays(FIXED_NOW, 1)

      expect(shouldSendReminder(futureReminder, FIXED_NOW)).toBe(false)
    })
  })

  describe('with string input', () => {
    it('parses string and checks', () => {
      const pastReminder = subHours(FIXED_NOW, 1).toISOString()

      expect(shouldSendReminder(pastReminder, FIXED_NOW)).toBe(true)
    })
  })

  describe('with default now', () => {
    it('uses current time when now not provided', () => {
      const pastReminder = subHours(FIXED_NOW, 1)

      expect(shouldSendReminder(pastReminder)).toBe(true)
    })
  })
})

// ============================================================================
// getEventRelevanceWindow Tests
// ============================================================================

describe('getEventRelevanceWindow', () => {
  describe('with end time', () => {
    it('returns window from start to 48 hours after end', () => {
      const event = createEventTimeRange(
        '2024-12-31T19:00:00Z',
        '2024-12-31T23:00:00Z'
      )

      const result = getEventRelevanceWindow(event)

      expect(result.start.getTime()).toBe(
        new Date('2024-12-31T19:00:00Z').getTime()
      )
      expect(result.end.getTime()).toBe(
        new Date('2025-01-02T23:00:00Z').getTime() // 48h after event end
      )
    })
  })

  describe('without end time', () => {
    it('assumes 4-hour event duration', () => {
      const event = createEventTimeRange('2024-12-31T19:00:00Z')

      const result = getEventRelevanceWindow(event)

      expect(result.start.getTime()).toBe(
        new Date('2024-12-31T19:00:00Z').getTime()
      )
      // Assumes end at 23:00, then 48h later = Jan 2 at 23:00
      expect(result.end.getTime()).toBe(
        new Date('2025-01-02T23:00:00Z').getTime()
      )
    })
  })
})

// ============================================================================
// filterEventsByDateRange Tests
// ============================================================================

describe('filterEventsByDateRange', () => {
  const testEvents: EventTimeRange[] = [
    createEventTimeRange('2024-12-10T19:00:00Z'),
    createEventTimeRange('2024-12-15T19:00:00Z'),
    createEventTimeRange('2024-12-20T19:00:00Z'),
    createEventTimeRange('2024-12-25T19:00:00Z'),
  ]

  it('filters events within date range', () => {
    const start = new Date('2024-12-14T00:00:00Z')
    const end = new Date('2024-12-21T00:00:00Z')

    const result = filterEventsByDateRange(testEvents, start, end)

    expect(result).toHaveLength(2)
    expect(result[0].start.utc).toBe('2024-12-15T19:00:00Z')
    expect(result[1].start.utc).toBe('2024-12-20T19:00:00Z')
  })

  it('includes events at range boundaries', () => {
    const start = new Date('2024-12-15T00:00:00Z')
    const end = new Date('2024-12-15T23:59:59Z')

    const result = filterEventsByDateRange(testEvents, start, end)

    expect(result).toHaveLength(1)
    expect(result[0].start.utc).toBe('2024-12-15T19:00:00Z')
  })

  it('returns empty array when no events match', () => {
    const start = new Date('2025-01-01T00:00:00Z')
    const end = new Date('2025-01-31T00:00:00Z')

    const result = filterEventsByDateRange(testEvents, start, end)

    expect(result).toEqual([])
  })

  it('handles empty events array', () => {
    const start = new Date('2024-12-01T00:00:00Z')
    const end = new Date('2024-12-31T00:00:00Z')

    const result = filterEventsByDateRange([], start, end)

    expect(result).toEqual([])
  })
})

// ============================================================================
// getTodaysEvents Tests
// ============================================================================

describe('getTodaysEvents', () => {
  it('returns events happening today', () => {
    const now = new Date()
    const yesterday = subDays(now, 1)
    const tomorrow = addDays(now, 1)
    const todayMorning = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 10, 0, 0)
    const todayEvening = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 20, 0, 0)

    const events: EventTimeRange[] = [
      createEventTimeRange(yesterday.toISOString()), // Yesterday
      createEventTimeRange(todayMorning.toISOString()), // Today
      createEventTimeRange(todayEvening.toISOString()), // Today
      createEventTimeRange(tomorrow.toISOString()), // Tomorrow
    ]

    const result = getTodaysEvents(events)

    expect(result).toHaveLength(2)
  })

  it('returns empty array when no events today', () => {
    const events: EventTimeRange[] = [
      createEventTimeRange('2024-12-14T19:00:00Z'),
      createEventTimeRange('2024-12-16T19:00:00Z'),
    ]

    const result = getTodaysEvents(events)

    expect(result).toEqual([])
  })
})

// ============================================================================
// getUpcomingEvents Tests
// ============================================================================

describe('getUpcomingEvents', () => {
  const testEvents: EventTimeRange[] = [
    createEventTimeRange('2024-12-10T19:00:00Z'), // Past
    createEventTimeRange('2024-12-14T19:00:00Z'), // Past
    createEventTimeRange('2024-12-20T19:00:00Z'), // Future
    createEventTimeRange('2024-12-25T19:00:00Z'), // Future
    createEventTimeRange('2024-12-18T19:00:00Z'), // Future (earlier)
  ]

  it('returns only future events', () => {
    const result = getUpcomingEvents(testEvents)

    expect(result).toHaveLength(3)
    // All should be in the future
    result.forEach(event => {
      expect(new Date(event.start.utc).getTime()).toBeGreaterThan(FIXED_NOW.getTime())
    })
  })

  it('sorts by start time (earliest first)', () => {
    const result = getUpcomingEvents(testEvents)

    expect(result[0].start.utc).toBe('2024-12-18T19:00:00Z')
    expect(result[1].start.utc).toBe('2024-12-20T19:00:00Z')
    expect(result[2].start.utc).toBe('2024-12-25T19:00:00Z')
  })

  it('respects limit parameter', () => {
    const result = getUpcomingEvents(testEvents, 2)

    expect(result).toHaveLength(2)
    expect(result[0].start.utc).toBe('2024-12-18T19:00:00Z')
    expect(result[1].start.utc).toBe('2024-12-20T19:00:00Z')
  })

  it('returns all events when limit exceeds count', () => {
    const result = getUpcomingEvents(testEvents, 10)

    expect(result).toHaveLength(3)
  })

  it('returns empty array when no upcoming events', () => {
    const pastEvents: EventTimeRange[] = [
      createEventTimeRange('2024-12-01T19:00:00Z'),
      createEventTimeRange('2024-12-10T19:00:00Z'),
    ]

    const result = getUpcomingEvents(pastEvents)

    expect(result).toEqual([])
  })
})

// ============================================================================
// getTimezoneAbbreviation Tests
// ============================================================================

describe('getTimezoneAbbreviation', () => {
  describe('known timezones', () => {
    it('returns ET for America/New_York', () => {
      expect(getTimezoneAbbreviation('America/New_York')).toBe('ET')
    })

    it('returns CT for America/Chicago', () => {
      expect(getTimezoneAbbreviation('America/Chicago')).toBe('CT')
    })

    it('returns MT for America/Denver', () => {
      expect(getTimezoneAbbreviation('America/Denver')).toBe('MT')
    })

    it('returns PT for America/Los_Angeles', () => {
      expect(getTimezoneAbbreviation('America/Los_Angeles')).toBe('PT')
    })

    it('returns MST for America/Phoenix', () => {
      expect(getTimezoneAbbreviation('America/Phoenix')).toBe('MST')
    })

    it('returns GMT for Europe/London', () => {
      expect(getTimezoneAbbreviation('Europe/London')).toBe('GMT')
    })

    it('returns CET for Europe/Paris', () => {
      expect(getTimezoneAbbreviation('Europe/Paris')).toBe('CET')
    })

    it('returns CET for Europe/Berlin', () => {
      expect(getTimezoneAbbreviation('Europe/Berlin')).toBe('CET')
    })

    it('returns JST for Asia/Tokyo', () => {
      expect(getTimezoneAbbreviation('Asia/Tokyo')).toBe('JST')
    })

    it('returns CST for Asia/Shanghai', () => {
      expect(getTimezoneAbbreviation('Asia/Shanghai')).toBe('CST')
    })

    it('returns AEST for Australia/Sydney', () => {
      expect(getTimezoneAbbreviation('Australia/Sydney')).toBe('AEST')
    })

    it('returns NZST for Pacific/Auckland', () => {
      expect(getTimezoneAbbreviation('Pacific/Auckland')).toBe('NZST')
    })

    it('returns UTC for UTC', () => {
      expect(getTimezoneAbbreviation('UTC')).toBe('UTC')
    })
  })

  describe('unknown timezones', () => {
    it('extracts city name from IANA format', () => {
      expect(getTimezoneAbbreviation('America/Boise')).toBe('Boise')
    })

    it('returns original string if no slash', () => {
      expect(getTimezoneAbbreviation('EST')).toBe('EST')
    })
  })
})

// ============================================================================
// getUserTimezone Tests
// ============================================================================

describe('getUserTimezone', () => {
  it('returns a valid IANA timezone string', () => {
    const result = getUserTimezone()

    // Should return a string (exact value depends on test environment)
    expect(typeof result).toBe('string')
    expect(result.length).toBeGreaterThan(0)
  })

  it('returns UTC when Intl is not available', () => {
    // Mock Intl.DateTimeFormat to throw
    const originalIntl = global.Intl
    // @ts-expect-error - Testing Intl unavailability
    global.Intl = {
      DateTimeFormat: () => {
        throw new Error('Not available')
      },
    }

    const result = getUserTimezone()

    expect(result).toBe('UTC')

    // Restore
    global.Intl = originalIntl
  })
})

// ============================================================================
// isInLocalTimezone Tests
// ============================================================================

describe('isInLocalTimezone', () => {
  it('returns true when timezone matches user timezone', () => {
    const userTz = getUserTimezone()

    expect(isInLocalTimezone(userTz)).toBe(true)
  })

  it('returns false when timezone differs from user timezone', () => {
    // Use a timezone unlikely to be the test environment's timezone
    const differentTz = 'Pacific/Fiji'

    // Only test if we're not actually in that timezone
    if (getUserTimezone() !== differentTz) {
      expect(isInLocalTimezone(differentTz)).toBe(false)
    }
  })
})

// ============================================================================
// Integration Tests
// ============================================================================

describe('Integration', () => {
  describe('full event workflow', () => {
    it('handles complete event lifecycle', () => {
      const now = new Date()
      // Create an event happening now
      const event = createEventTimeRange(
        subHours(now, 1).toISOString(),
        addHours(now, 2).toISOString()
      )

      // Check status
      expect(getEventStatus(event)).toBe('ongoing')

      // Format the time range
      const timeRange = formatEventDateRange(event.start, event.end)
      expect(timeRange).toContain(' - ')

      // Calculate reminder time
      const reminderTime = calculateReminderTime(event.end!)
      expect(reminderTime.getTime()).toBeGreaterThan(now.getTime())

      // Check relevance window
      const window = getEventRelevanceWindow(event)
      expect(window.start.getTime()).toBeLessThan(now.getTime())
      expect(window.end.getTime()).toBeGreaterThan(now.getTime())
    })
  })

  describe('mixed event types filtering', () => {
    it('correctly categorizes events by status', () => {
      const now = new Date()
      const todayMorning = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 10, 0, 0)

      const events: EventTimeRange[] = [
        // Past event
        createEventTimeRange(
          subDays(now, 2).toISOString(),
          subDays(now, 2).toISOString()
        ),
        // Today's event (in the future part of today)
        createEventTimeRange(
          addHours(now, 2).toISOString(),
          addHours(now, 5).toISOString()
        ),
        // Future event
        createEventTimeRange(
          addDays(now, 5).toISOString()
        ),
      ]

      const upcomingEvents = getUpcomingEvents(events)

      // Future events should include today's upcoming and future ones
      expect(upcomingEvents.length).toBeGreaterThanOrEqual(2)
    })
  })
})

// ============================================================================
// Edge Cases
// ============================================================================

describe('Edge Cases', () => {
  describe('daylight saving time', () => {
    it('handles dates across DST transition', () => {
      // March 10, 2024 is DST transition in US
      const beforeDST = '2024-03-10T01:00:00-05:00'
      const afterDST = '2024-03-10T03:00:00-04:00'

      // Should parse without error
      expect(() => parseEventDate(beforeDST)).not.toThrow()
      expect(() => parseEventDate(afterDST)).not.toThrow()
    })
  })

  describe('year boundary', () => {
    it('handles events across year boundary', () => {
      const newYearsEve: EventTime = {
        utc: '2024-12-31T23:00:00Z',
        local: '2024-12-31T23:00:00',
      }
      const newYearsDay: EventTime = {
        utc: '2025-01-01T02:00:00Z',
        local: '2025-01-01T02:00:00',
      }

      const range = formatEventDateRange(newYearsEve, newYearsDay)

      expect(range).toContain('Dec 31')
      expect(range).toContain('Jan 1')
    })
  })

  describe('midnight edge cases', () => {
    it('handles event at midnight', () => {
      const midnightEvent: EventTime = {
        utc: '2024-12-15T00:00:00Z',
        local: '2024-12-15T00:00:00',
      }

      const result = formatEventTime(midnightEvent)

      // Local time is midnight
      expect(result).toContain('12:00 AM')
    })

    it('handles event at noon', () => {
      const noonEvent: EventTime = {
        utc: '2024-12-15T12:00:00Z',
        local: '2024-12-15T12:00:00',
      }

      const result = formatEventTime(noonEvent)

      // Local time is noon
      expect(result).toContain('12:00 PM')
    })
  })

  describe('very long duration events', () => {
    it('handles multi-day events', () => {
      const now = new Date()
      const multiDayEvent = createEventTimeRange(
        subDays(now, 1).toISOString(),
        addDays(now, 2).toISOString()
      )

      const status = getEventStatus(multiDayEvent)
      expect(status).toBe('ongoing')

      const window = getEventRelevanceWindow(multiDayEvent)
      expect(window.end.getTime()).toBeGreaterThan(
        addDays(now, 2).getTime()
      )
    })
  })

  describe('events starting now', () => {
    it('event starting exactly now is ongoing', () => {
      const now = new Date()
      const event = createEventTimeRange(
        now.toISOString(),
        addHours(now, 2).toISOString()
      )

      expect(getEventStatus(event)).toBe('ongoing')
    })
  })
})
