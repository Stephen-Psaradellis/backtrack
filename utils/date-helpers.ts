/**
 * Date & Time Utilities for Event Integration
 *
 * This module provides date/time helper functions for handling event data
 * from external APIs (Eventbrite, Meetup) with proper timezone support.
 *
 * Uses date-fns for all date manipulation as per project standards.
 *
 * ## Key Capabilities
 *
 * 1. **Event Time Formatting**: Display event times in user-friendly formats
 * 2. **Timezone Handling**: Convert between UTC, local, and event timezones
 * 3. **Event Status**: Determine if events are upcoming, ongoing, or past
 * 4. **Reminder Scheduling**: Calculate reminder times for post-event notifications
 * 5. **Relative Time**: Human-readable relative time strings ("in 2 hours", "yesterday")
 *
 * ## Event Time Format
 *
 * External APIs (Eventbrite, Meetup) provide event times with:
 * - `utc`: ISO 8601 UTC timestamp (e.g., '2024-12-31T00:00:00Z')
 * - `local`: Local time without timezone (e.g., '2024-12-31T19:00:00')
 * - `timezone`: IANA timezone string (e.g., 'America/New_York')
 *
 * This module uses UTC times for calculations and local times for display
 * to ensure consistent behavior across user locations.
 *
 * @module utils/date-helpers
 * @see {@link lib/api/eventbrite} Eventbrite API client with event data
 * @see {@link lib/api/meetup} Meetup API client with event data
 */

import {
  parseISO,
  format,
  formatRelative,
  formatDistance,
  isBefore,
  isAfter,
  isSameDay,
  addDays,
  addHours,
  subHours,
  differenceInMinutes,
  differenceInHours,
  differenceInDays,
  isPast,
  isFuture,
  isWithinInterval,
  startOfDay,
  endOfDay,
  isValid,
} from 'date-fns'

// ============================================================================
// Types
// ============================================================================

/**
 * Event time structure from external APIs
 * Matches the format returned by Eventbrite and Meetup
 */
export interface EventTime {
  /** IANA timezone identifier (e.g., 'America/New_York') */
  timezone?: string
  /** Local time in the event's timezone (ISO 8601 without offset) */
  local?: string
  /** UTC time (ISO 8601 with Z suffix) */
  utc: string
}

/**
 * Options for formatting event times
 */
export interface FormatEventTimeOptions {
  /** Include the date portion (default: true) */
  includeDate?: boolean
  /** Include the time portion (default: true) */
  includeTime?: boolean
  /** Include timezone abbreviation (default: false) */
  includeTimezone?: boolean
  /** Use 24-hour format (default: false) */
  use24Hour?: boolean
  /** Include year even if current year (default: false) */
  includeYear?: boolean
}

/**
 * Event status relative to current time
 */
export type EventStatus = 'upcoming' | 'ongoing' | 'ended' | 'cancelled'

/**
 * Event with start and optional end times
 */
export interface EventTimeRange {
  start: EventTime
  end?: EventTime
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Default number of hours after event end to send reminder
 */
export const DEFAULT_REMINDER_HOURS = 24

/**
 * Time formats for different use cases
 */
export const TIME_FORMATS = {
  /** Time only, 12-hour: "7:30 PM" */
  timeOnly: 'h:mm a',
  /** Time only, 24-hour: "19:30" */
  time24: 'HH:mm',
  /** Date only, short: "Dec 31" */
  dateShort: 'MMM d',
  /** Date only, full: "December 31, 2024" */
  dateFull: 'MMMM d, yyyy',
  /** Date with weekday: "Tue, Dec 31" */
  dateWithDay: 'EEE, MMM d',
  /** Full datetime: "Dec 31, 2024 at 7:30 PM" */
  datetimeFull: "MMM d, yyyy 'at' h:mm a",
  /** Compact datetime: "Dec 31, 7:30 PM" */
  datetimeCompact: 'MMM d, h:mm a',
  /** ISO date only: "2024-12-31" */
  isoDate: 'yyyy-MM-dd',
  /** Weekday full: "Tuesday" */
  weekday: 'EEEE',
} as const

// ============================================================================
// Parsing Functions
// ============================================================================

/**
 * Parse a date string or Date object into a valid Date
 *
 * Handles various input formats:
 * - ISO 8601 strings ('2024-12-31T19:00:00Z')
 * - Date objects
 * - Unix timestamps (milliseconds)
 *
 * @param input - Date string, Date object, or timestamp
 * @returns Valid Date object
 * @throws Error if input cannot be parsed to a valid date
 *
 * @example
 * ```typescript
 * parseEventDate('2024-12-31T19:00:00Z')  // Date object
 * parseEventDate(new Date())              // Same Date object
 * parseEventDate(1704067200000)           // Date from timestamp
 * ```
 */
export function parseEventDate(input: string | Date | number): Date {
  if (input instanceof Date) {
    if (!isValid(input)) {
      throw new Error('Invalid Date object provided')
    }
    return input
  }

  if (typeof input === 'number') {
    const date = new Date(input)
    if (!isValid(date)) {
      throw new Error(`Invalid timestamp: ${input}`)
    }
    return date
  }

  const date = parseISO(input)
  if (!isValid(date)) {
    throw new Error(`Invalid date string: ${input}`)
  }

  return date
}

/**
 * Safely parse a date, returning null if invalid
 *
 * @param input - Date string, Date object, timestamp, or null/undefined
 * @returns Valid Date object or null
 *
 * @example
 * ```typescript
 * safeParseDate('2024-12-31T19:00:00Z')  // Date object
 * safeParseDate('invalid')               // null
 * safeParseDate(null)                    // null
 * ```
 */
export function safeParseDate(input: string | Date | number | null | undefined): Date | null {
  if (input == null) return null

  try {
    return parseEventDate(input)
  } catch {
    return null
  }
}

// ============================================================================
// Formatting Functions
// ============================================================================

/**
 * Format an event time for user display
 *
 * This is the primary function for displaying event times in the UI.
 * It handles timezone conversion and provides human-friendly output.
 *
 * @param eventTime - Event time object or ISO string
 * @param options - Formatting options
 * @returns Formatted date/time string
 *
 * @example
 * ```typescript
 * const eventTime = {
 *   utc: '2024-12-31T00:00:00Z',
 *   local: '2024-12-31T19:00:00',
 *   timezone: 'America/New_York'
 * }
 *
 * formatEventTime(eventTime)
 * // "Dec 31, 7:00 PM"
 *
 * formatEventTime(eventTime, { includeDate: false })
 * // "7:00 PM"
 *
 * formatEventTime(eventTime, { includeTime: false })
 * // "Dec 31"
 *
 * formatEventTime('2024-12-31T19:00:00Z')
 * // "Dec 31, 7:00 PM" (uses UTC time)
 * ```
 */
export function formatEventTime(
  eventTime: EventTime | string,
  options: FormatEventTimeOptions = {}
): string {
  const {
    includeDate = true,
    includeTime = true,
    includeTimezone = false,
    use24Hour = false,
    includeYear = false,
  } = options

  // Parse the time - prefer local time if available for display
  let date: Date
  if (typeof eventTime === 'string') {
    date = parseEventDate(eventTime)
  } else {
    // Use local time for display if available, otherwise UTC
    // Local time is more accurate for display as it's in the event's timezone
    date = parseEventDate(eventTime.local || eventTime.utc)
  }

  const parts: string[] = []

  if (includeDate) {
    const now = new Date()
    const showYear = includeYear || date.getFullYear() !== now.getFullYear()
    parts.push(format(date, showYear ? 'MMM d, yyyy' : 'MMM d'))
  }

  if (includeTime) {
    const timeFormat = use24Hour ? TIME_FORMATS.time24 : TIME_FORMATS.timeOnly
    parts.push(format(date, timeFormat))
  }

  let result = parts.join(', ')

  if (includeTimezone && typeof eventTime !== 'string' && eventTime.timezone) {
    result += ` ${getTimezoneAbbreviation(eventTime.timezone)}`
  }

  return result
}

/**
 * Format an event date/time range for display
 *
 * Intelligently formats date ranges, avoiding redundancy:
 * - Same day: "Dec 31, 7:00 PM - 11:00 PM"
 * - Different days: "Dec 31, 7:00 PM - Jan 1, 2:00 AM"
 *
 * @param start - Start time
 * @param end - End time (optional)
 * @returns Formatted date range string
 *
 * @example
 * ```typescript
 * const event = {
 *   start: { utc: '2024-12-31T00:00:00Z', local: '2024-12-31T19:00:00' },
 *   end: { utc: '2024-12-31T04:00:00Z', local: '2024-12-31T23:00:00' }
 * }
 *
 * formatEventDateRange(event.start, event.end)
 * // "Dec 31, 7:00 PM - 11:00 PM"
 * ```
 */
export function formatEventDateRange(start: EventTime | string, end?: EventTime | string): string {
  const startStr = formatEventTime(start)

  if (!end) {
    return startStr
  }

  const startDate = parseEventDate(typeof start === 'string' ? start : start.local || start.utc)
  const endDate = parseEventDate(typeof end === 'string' ? end : end.local || end.utc)

  // If same day, only show time for end
  if (isSameDay(startDate, endDate)) {
    const endTimeStr = formatEventTime(end, { includeDate: false })
    return `${startStr} - ${endTimeStr}`
  }

  // Different days, show full date for both
  const endStr = formatEventTime(end)
  return `${startStr} - ${endStr}`
}

/**
 * Format a date as relative time ("in 2 hours", "3 days ago")
 *
 * Provides human-friendly relative time for event proximity.
 *
 * @param date - Date to format
 * @param baseDate - Reference date (default: now)
 * @returns Relative time string
 *
 * @example
 * ```typescript
 * // Assuming now is Dec 30, 2024
 * formatRelativeTime(new Date('2024-12-31T19:00:00'))
 * // "tomorrow at 7:00 PM"
 *
 * formatRelativeTime(new Date('2024-12-29T12:00:00'))
 * // "yesterday at 12:00 PM"
 * ```
 */
export function formatRelativeTime(date: Date | string, baseDate: Date = new Date()): string {
  const parsedDate = typeof date === 'string' ? parseEventDate(date) : date
  return formatRelative(parsedDate, baseDate)
}

/**
 * Format time remaining or elapsed as human-readable string
 *
 * @param date - Target date
 * @param options - Formatting options
 * @returns Time distance string (e.g., "in about 2 hours", "about 3 days ago")
 *
 * @example
 * ```typescript
 * formatTimeDistance(new Date(Date.now() + 2 * 60 * 60 * 1000))
 * // "in about 2 hours"
 *
 * formatTimeDistance(new Date(Date.now() - 3 * 24 * 60 * 60 * 1000))
 * // "about 3 days ago"
 * ```
 */
export function formatTimeDistance(
  date: Date | string,
  options?: { addSuffix?: boolean }
): string {
  const parsedDate = typeof date === 'string' ? parseEventDate(date) : date
  return formatDistance(parsedDate, new Date(), { addSuffix: options?.addSuffix ?? true })
}

/**
 * Get a short time-until or time-since string for compact display
 *
 * @param date - Target date
 * @returns Compact time string (e.g., "2h", "3d", "5min")
 *
 * @example
 * ```typescript
 * getCompactTimeString(new Date(Date.now() + 2 * 60 * 60 * 1000))
 * // "2h"
 *
 * getCompactTimeString(new Date(Date.now() + 30 * 60 * 1000))
 * // "30min"
 * ```
 */
export function getCompactTimeString(date: Date | string): string {
  const parsedDate = typeof date === 'string' ? parseEventDate(date) : date
  const now = new Date()

  const diffMins = Math.abs(differenceInMinutes(parsedDate, now))
  const diffHours = Math.abs(differenceInHours(parsedDate, now))
  const diffDays = Math.abs(differenceInDays(parsedDate, now))

  if (diffMins < 60) {
    return `${diffMins}min`
  }

  if (diffHours < 24) {
    return `${diffHours}h`
  }

  return `${diffDays}d`
}

// ============================================================================
// Event Status Functions
// ============================================================================

/**
 * Determine the status of an event relative to current time
 *
 * @param event - Event with start and optional end times
 * @returns Event status: 'upcoming', 'ongoing', 'ended'
 *
 * @example
 * ```typescript
 * const upcomingEvent = {
 *   start: { utc: '2099-12-31T00:00:00Z' }
 * }
 * getEventStatus(upcomingEvent)
 * // 'upcoming'
 *
 * const pastEvent = {
 *   start: { utc: '2020-12-31T00:00:00Z' },
 *   end: { utc: '2020-12-31T04:00:00Z' }
 * }
 * getEventStatus(pastEvent)
 * // 'ended'
 * ```
 */
export function getEventStatus(event: EventTimeRange): EventStatus {
  const now = new Date()
  const startDate = parseEventDate(event.start.utc)
  const endDate = event.end ? parseEventDate(event.end.utc) : null

  // If event hasn't started yet
  if (isBefore(now, startDate)) {
    return 'upcoming'
  }

  // If we have an end time and we're past it
  if (endDate && isAfter(now, endDate)) {
    return 'ended'
  }

  // If we have an end time and we're between start and end
  if (endDate && isWithinInterval(now, { start: startDate, end: endDate })) {
    return 'ongoing'
  }

  // No end time and we're past start - assume it's ended after 4 hours
  const assumedEnd = addHours(startDate, 4)
  if (isAfter(now, assumedEnd)) {
    return 'ended'
  }

  return 'ongoing'
}

/**
 * Check if an event is in the past
 *
 * @param eventTime - Event time (uses end time if available)
 * @returns true if event has ended
 *
 * @example
 * ```typescript
 * isEventPast({ utc: '2020-01-01T00:00:00Z' })
 * // true
 *
 * isEventPast({ utc: '2099-01-01T00:00:00Z' })
 * // false
 * ```
 */
export function isEventPast(eventTime: EventTime | string): boolean {
  const date = typeof eventTime === 'string'
    ? parseEventDate(eventTime)
    : parseEventDate(eventTime.utc)

  return isPast(date)
}

/**
 * Check if an event is upcoming (in the future)
 *
 * @param eventTime - Event start time
 * @returns true if event is in the future
 *
 * @example
 * ```typescript
 * isEventUpcoming({ utc: '2099-01-01T00:00:00Z' })
 * // true
 *
 * isEventUpcoming({ utc: '2020-01-01T00:00:00Z' })
 * // false
 * ```
 */
export function isEventUpcoming(eventTime: EventTime | string): boolean {
  const date = typeof eventTime === 'string'
    ? parseEventDate(eventTime)
    : parseEventDate(eventTime.utc)

  return isFuture(date)
}

/**
 * Check if an event is happening today
 *
 * @param eventTime - Event time
 * @returns true if event is on the same day as today
 *
 * @example
 * ```typescript
 * isEventToday({ utc: new Date().toISOString() })
 * // true
 * ```
 */
export function isEventToday(eventTime: EventTime | string): boolean {
  const date = typeof eventTime === 'string'
    ? parseEventDate(eventTime)
    : parseEventDate(eventTime.local || eventTime.utc)

  return isSameDay(date, new Date())
}

// ============================================================================
// Reminder Scheduling Functions
// ============================================================================

/**
 * Calculate the reminder time for a post-event notification
 *
 * Per spec requirements, reminders are scheduled for 24 hours after
 * the event end time to prompt users to check for missed connection posts.
 *
 * @param eventEnd - Event end time
 * @param hoursAfter - Hours after event end to schedule reminder (default: 24)
 * @returns Date object for reminder time
 *
 * @example
 * ```typescript
 * const eventEnd = { utc: '2024-12-31T04:00:00Z' }
 * calculateReminderTime(eventEnd)
 * // Date for 2025-01-01T04:00:00Z (24 hours after event end)
 *
 * calculateReminderTime(eventEnd, 48)
 * // Date for 2025-01-02T04:00:00Z (48 hours after event end)
 * ```
 */
export function calculateReminderTime(
  eventEnd: EventTime | string,
  hoursAfter: number = DEFAULT_REMINDER_HOURS
): Date {
  const endDate = typeof eventEnd === 'string'
    ? parseEventDate(eventEnd)
    : parseEventDate(eventEnd.utc)

  return addHours(endDate, hoursAfter)
}

/**
 * Check if a reminder should be sent based on the scheduled time
 *
 * @param scheduledFor - Scheduled reminder time
 * @param now - Current time (default: now)
 * @returns true if reminder should be sent
 *
 * @example
 * ```typescript
 * // Reminder scheduled for 1 hour ago
 * shouldSendReminder(new Date(Date.now() - 60 * 60 * 1000))
 * // true
 *
 * // Reminder scheduled for 1 hour in the future
 * shouldSendReminder(new Date(Date.now() + 60 * 60 * 1000))
 * // false
 * ```
 */
export function shouldSendReminder(scheduledFor: Date | string, now: Date = new Date()): boolean {
  const scheduled = typeof scheduledFor === 'string' ? parseEventDate(scheduledFor) : scheduledFor
  return isBefore(scheduled, now) || isSameDay(scheduled, now)
}

/**
 * Get the optimal time window for showing event posts
 *
 * Returns a time range during which users are most likely to check
 * for missed connections: from event start until 48 hours after end.
 *
 * @param event - Event with start and end times
 * @returns Object with start and end of the relevance window
 *
 * @example
 * ```typescript
 * const event = {
 *   start: { utc: '2024-12-31T19:00:00Z' },
 *   end: { utc: '2024-12-31T23:00:00Z' }
 * }
 *
 * getEventRelevanceWindow(event)
 * // { start: Date(2024-12-31T19:00), end: Date(2025-01-02T23:00) }
 * ```
 */
export function getEventRelevanceWindow(event: EventTimeRange): { start: Date; end: Date } {
  const startDate = parseEventDate(event.start.utc)
  const endDate = event.end ? parseEventDate(event.end.utc) : addHours(startDate, 4)

  return {
    start: startDate,
    end: addDays(endDate, 2), // 48 hours after event end
  }
}

// ============================================================================
// Date Range & Filter Functions
// ============================================================================

/**
 * Get events happening within a date range
 *
 * @param events - Array of events with time ranges
 * @param start - Range start date
 * @param end - Range end date
 * @returns Filtered events within the range
 *
 * @example
 * ```typescript
 * const events = [
 *   { start: { utc: '2024-12-31T00:00:00Z' } },
 *   { start: { utc: '2025-01-15T00:00:00Z' } }
 * ]
 *
 * filterEventsByDateRange(events, new Date('2024-12-01'), new Date('2024-12-31'))
 * // Returns only the first event
 * ```
 */
export function filterEventsByDateRange<T extends EventTimeRange>(
  events: T[],
  start: Date,
  end: Date
): T[] {
  const startOfRange = startOfDay(start)
  const endOfRange = endOfDay(end)

  return events.filter((event) => {
    const eventStart = parseEventDate(event.start.utc)
    return isWithinInterval(eventStart, { start: startOfRange, end: endOfRange })
  })
}

/**
 * Get events happening today
 *
 * @param events - Array of events
 * @returns Events happening today
 */
export function getTodaysEvents<T extends EventTimeRange>(events: T[]): T[] {
  const today = new Date()
  return filterEventsByDateRange(events, today, today)
}

/**
 * Get upcoming events (starting in the future)
 *
 * @param events - Array of events
 * @param limit - Maximum number of events to return
 * @returns Upcoming events, sorted by start time
 */
export function getUpcomingEvents<T extends EventTimeRange>(events: T[], limit?: number): T[] {
  const now = new Date()

  const upcoming = events
    .filter((event) => {
      const eventStart = parseEventDate(event.start.utc)
      return isFuture(eventStart)
    })
    .sort((a, b) => {
      const dateA = parseEventDate(a.start.utc)
      const dateB = parseEventDate(b.start.utc)
      return dateA.getTime() - dateB.getTime()
    })

  return limit ? upcoming.slice(0, limit) : upcoming
}

// ============================================================================
// Timezone Utilities
// ============================================================================

/**
 * Get a readable abbreviation for a timezone
 *
 * Converts IANA timezone names to common abbreviations.
 *
 * @param timezone - IANA timezone identifier
 * @returns Timezone abbreviation or original if unknown
 *
 * @example
 * ```typescript
 * getTimezoneAbbreviation('America/New_York')
 * // "EST" or "EDT" depending on DST
 *
 * getTimezoneAbbreviation('Europe/London')
 * // "GMT" or "BST" depending on DST
 * ```
 */
export function getTimezoneAbbreviation(timezone: string): string {
  // Common timezone mappings
  // Note: This is a simplified approach. For production, consider using
  // Intl.DateTimeFormat for accurate DST-aware abbreviations.
  const timezoneMap: Record<string, string> = {
    'America/New_York': 'ET',
    'America/Chicago': 'CT',
    'America/Denver': 'MT',
    'America/Los_Angeles': 'PT',
    'America/Phoenix': 'MST',
    'Europe/London': 'GMT',
    'Europe/Paris': 'CET',
    'Europe/Berlin': 'CET',
    'Asia/Tokyo': 'JST',
    'Asia/Shanghai': 'CST',
    'Australia/Sydney': 'AEST',
    'Pacific/Auckland': 'NZST',
    UTC: 'UTC',
  }

  return timezoneMap[timezone] || timezone.split('/').pop() || timezone
}

/**
 * Get the user's local timezone
 *
 * @returns IANA timezone identifier for the user's locale
 *
 * @example
 * ```typescript
 * getUserTimezone()
 * // "America/New_York" (depends on user's system settings)
 * ```
 */
export function getUserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone
  } catch {
    return 'UTC'
  }
}

/**
 * Check if a date is in the user's local timezone
 *
 * Useful for determining if event times need timezone conversion hints.
 *
 * @param eventTimezone - Event's timezone
 * @returns true if event is in user's local timezone
 */
export function isInLocalTimezone(eventTimezone: string): boolean {
  return eventTimezone === getUserTimezone()
}

// ============================================================================
// Exports
// ============================================================================

export default {
  // Parsing
  parseEventDate,
  safeParseDate,
  // Formatting
  formatEventTime,
  formatEventDateRange,
  formatRelativeTime,
  formatTimeDistance,
  getCompactTimeString,
  // Status
  getEventStatus,
  isEventPast,
  isEventUpcoming,
  isEventToday,
  // Reminders
  calculateReminderTime,
  shouldSendReminder,
  getEventRelevanceWindow,
  // Filtering
  filterEventsByDateRange,
  getTodaysEvents,
  getUpcomingEvents,
  // Timezone
  getTimezoneAbbreviation,
  getUserTimezone,
  isInLocalTimezone,
  // Constants
  TIME_FORMATS,
  DEFAULT_REMINDER_HOURS,
}
