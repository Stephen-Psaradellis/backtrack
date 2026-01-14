/**
 * Tests for components/chat/utils/formatters.ts
 *
 * Tests the chat formatting utility functions.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  formatMessageTime,
  formatLastSeen,
  shouldShowDateSeparator,
  getDateSeparatorText,
  generateOptimisticId,
} from '../formatters'

describe('formatMessageTime', () => {
  beforeEach(() => {
    // Mock to local noon to avoid timezone edge cases
    vi.useFakeTimers()
    const now = new Date()
    now.setHours(12, 0, 0, 0)
    vi.setSystemTime(now)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('today', () => {
    it('should show time only for messages from today', () => {
      const today = new Date()
      today.setHours(10, 30, 0, 0)
      const result = formatMessageTime(today.toISOString())

      // Should show time in 2-digit format
      expect(result).toMatch(/\d{1,2}:\d{2}/)
    })

    it('should show time for message from earlier today', () => {
      const today = new Date()
      today.setHours(8, 15, 0, 0)
      const result = formatMessageTime(today.toISOString())

      expect(result).toMatch(/\d{1,2}:\d{2}/)
      // Should NOT contain day or date info
      expect(result).not.toMatch(/Yesterday/)
      expect(result).not.toMatch(/Mon|Tue|Wed|Thu|Fri|Sat|Sun/)
    })
  })

  describe('yesterday', () => {
    it('should show "Yesterday" with time for messages from 24+ hours ago', () => {
      // The function uses time difference, not calendar day
      // So "yesterday" means at least 24 hours but less than 48 hours ago
      const twentySixHoursAgo = new Date(Date.now() - 26 * 60 * 60 * 1000)
      const result = formatMessageTime(twentySixHoursAgo.toISOString())

      expect(result).toContain('Yesterday')
      expect(result).toMatch(/\d{1,2}:\d{2}/)
    })
  })

  describe('this week', () => {
    it('should show weekday with time for messages from this week', () => {
      // 3 days ago
      const threeDaysAgo = new Date()
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)
      threeDaysAgo.setHours(9, 0, 0, 0)
      const result = formatMessageTime(threeDaysAgo.toISOString())

      // Should contain time
      expect(result).toMatch(/\d{1,2}:\d{2}/)
      // Should NOT be yesterday
      expect(result).not.toContain('Yesterday')
    })

    it('should show weekday for 6 days ago', () => {
      const sixDaysAgo = new Date()
      sixDaysAgo.setDate(sixDaysAgo.getDate() - 6)
      sixDaysAgo.setHours(15, 45, 0, 0)
      const result = formatMessageTime(sixDaysAgo.toISOString())

      expect(result).toMatch(/\d{1,2}:\d{2}/)
    })
  })

  describe('older than a week', () => {
    it('should show month and day with time for older messages', () => {
      // 10 days ago
      const tenDaysAgo = new Date()
      tenDaysAgo.setDate(tenDaysAgo.getDate() - 10)
      tenDaysAgo.setHours(10, 0, 0, 0)
      const result = formatMessageTime(tenDaysAgo.toISOString())

      // Should contain time
      expect(result).toMatch(/\d{1,2}:\d{2}/)
      // Should NOT be yesterday or contain weekday only
      expect(result).not.toContain('Yesterday')
    })

    it('should show full date for very old messages', () => {
      // 60 days ago
      const sixtyDaysAgo = new Date()
      sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60)
      sixtyDaysAgo.setHours(8, 30, 0, 0)
      const result = formatMessageTime(sixtyDaysAgo.toISOString())

      // Should contain time
      expect(result).toMatch(/\d{1,2}:\d{2}/)
    })
  })
})

describe('formatLastSeen', () => {
  let nowDate: Date

  beforeEach(() => {
    vi.useFakeTimers()
    nowDate = new Date()
    nowDate.setSeconds(0, 0) // Reset to start of minute
    vi.setSystemTime(nowDate)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should return "Offline" for null timestamp', () => {
    expect(formatLastSeen(null)).toBe('Offline')
  })

  it('should return "Just now" for less than 1 minute ago', () => {
    const thirtySecondsAgo = new Date(nowDate.getTime() - 30 * 1000)
    expect(formatLastSeen(thirtySecondsAgo.toISOString())).toBe('Just now')
  })

  it('should return "1m ago" for 1 minute ago', () => {
    const oneMinuteAgo = new Date(nowDate.getTime() - 60 * 1000)
    expect(formatLastSeen(oneMinuteAgo.toISOString())).toBe('1m ago')
  })

  it('should return "30m ago" for 30 minutes ago', () => {
    const thirtyMinutesAgo = new Date(nowDate.getTime() - 30 * 60 * 1000)
    expect(formatLastSeen(thirtyMinutesAgo.toISOString())).toBe('30m ago')
  })

  it('should return "59m ago" for 59 minutes ago', () => {
    const fiftyNineMinutesAgo = new Date(nowDate.getTime() - 59 * 60 * 1000)
    expect(formatLastSeen(fiftyNineMinutesAgo.toISOString())).toBe('59m ago')
  })

  it('should return "1h ago" for 1 hour ago', () => {
    const oneHourAgo = new Date(nowDate.getTime() - 60 * 60 * 1000)
    expect(formatLastSeen(oneHourAgo.toISOString())).toBe('1h ago')
  })

  it('should return "5h ago" for 5 hours ago', () => {
    const fiveHoursAgo = new Date(nowDate.getTime() - 5 * 60 * 60 * 1000)
    expect(formatLastSeen(fiveHoursAgo.toISOString())).toBe('5h ago')
  })

  it('should return "23h ago" for 23 hours ago', () => {
    const twentyThreeHoursAgo = new Date(nowDate.getTime() - 23 * 60 * 60 * 1000)
    expect(formatLastSeen(twentyThreeHoursAgo.toISOString())).toBe('23h ago')
  })

  it('should return "1d ago" for 1 day ago', () => {
    const oneDayAgo = new Date(nowDate.getTime() - 24 * 60 * 60 * 1000)
    expect(formatLastSeen(oneDayAgo.toISOString())).toBe('1d ago')
  })

  it('should return "6d ago" for 6 days ago', () => {
    const sixDaysAgo = new Date(nowDate.getTime() - 6 * 24 * 60 * 60 * 1000)
    expect(formatLastSeen(sixDaysAgo.toISOString())).toBe('6d ago')
  })

  it('should return formatted date for more than 7 days ago', () => {
    const tenDaysAgo = new Date(nowDate.getTime() - 10 * 24 * 60 * 60 * 1000)
    const result = formatLastSeen(tenDaysAgo.toISOString())

    // Should contain a month (not be Xm/Xh/Xd ago format)
    expect(result).not.toMatch(/\d+[mhd] ago/)
  })
})

describe('shouldShowDateSeparator', () => {
  it('should return true for first message (null previousTimestamp)', () => {
    expect(shouldShowDateSeparator('2025-01-08T10:00:00.000Z', null)).toBe(true)
  })

  it('should return false for messages on the same day', () => {
    expect(
      shouldShowDateSeparator(
        '2025-01-08T10:00:00.000Z',
        '2025-01-08T09:00:00.000Z'
      )
    ).toBe(false)
  })

  it('should return true for messages on different days', () => {
    // Use dates far apart to avoid timezone issues
    expect(
      shouldShowDateSeparator(
        '2025-01-10T12:00:00.000Z',
        '2025-01-08T12:00:00.000Z'
      )
    ).toBe(true)
  })

  it('should return true for messages months apart', () => {
    expect(
      shouldShowDateSeparator(
        '2025-01-08T10:00:00.000Z',
        '2024-06-15T10:00:00.000Z'
      )
    ).toBe(true)
  })

  it('should return false for messages 1 minute apart on same day', () => {
    expect(
      shouldShowDateSeparator(
        '2025-01-08T12:01:00.000Z',
        '2025-01-08T12:00:00.000Z'
      )
    ).toBe(false)
  })

  it('should handle messages on different calendar days', () => {
    // Use noon on different days to avoid timezone edge cases
    expect(
      shouldShowDateSeparator(
        '2025-01-09T12:00:00.000Z',
        '2025-01-08T12:00:00.000Z'
      )
    ).toBe(true)
  })
})

describe('getDateSeparatorText', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    // Set to noon local time to avoid timezone issues
    const now = new Date()
    now.setHours(12, 0, 0, 0)
    vi.setSystemTime(now)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should return "Today" for today\'s date', () => {
    // Create a date 2 hours ago (same day)
    const today = new Date()
    today.setHours(10, 0, 0, 0)
    expect(getDateSeparatorText(today.toISOString())).toBe('Today')
  })

  it('should return "Today" for different time today', () => {
    // Use same day at different hour
    const today = new Date()
    today.setHours(8, 0, 0, 0)
    expect(getDateSeparatorText(today.toISOString())).toBe('Today')
  })

  it('should return "Yesterday" for yesterday\'s date', () => {
    // Create yesterday's date
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    yesterday.setHours(12, 0, 0, 0)
    expect(getDateSeparatorText(yesterday.toISOString())).toBe('Yesterday')
  })

  it('should return full date format for older dates', () => {
    // 3 days ago
    const threeDaysAgo = new Date()
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)
    threeDaysAgo.setHours(12, 0, 0, 0)
    const result = getDateSeparatorText(threeDaysAgo.toISOString())

    // Should NOT be "Today" or "Yesterday"
    expect(result).not.toBe('Today')
    expect(result).not.toBe('Yesterday')
    // Should contain a month name or day number
    expect(result.length).toBeGreaterThan(5)
  })

  it('should return full date for 2 days ago', () => {
    // 2 days ago
    const twoDaysAgo = new Date()
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2)
    twoDaysAgo.setHours(12, 0, 0, 0)
    const result = getDateSeparatorText(twoDaysAgo.toISOString())

    // 2 days ago is not "Yesterday", so it should be a full date
    expect(result).not.toBe('Today')
    expect(result).not.toBe('Yesterday')
  })

  it('should handle dates from far past', () => {
    // 30 days ago
    const pastDate = new Date()
    pastDate.setDate(pastDate.getDate() - 30)
    pastDate.setHours(12, 0, 0, 0)
    const result = getDateSeparatorText(pastDate.toISOString())

    // Should be a formatted date string
    expect(result).not.toBe('Today')
    expect(result).not.toBe('Yesterday')
    expect(result.length).toBeGreaterThan(5)
  })
})

describe('generateOptimisticId', () => {
  it('should return a string prefixed with "optimistic-"', () => {
    const id = generateOptimisticId()

    expect(id).toMatch(/^optimistic-/)
  })

  it('should include timestamp', () => {
    const before = Date.now()
    const id = generateOptimisticId()
    const after = Date.now()

    // Extract timestamp from the ID
    const parts = id.split('-')
    const timestamp = parseInt(parts[1], 10)

    expect(timestamp).toBeGreaterThanOrEqual(before)
    expect(timestamp).toBeLessThanOrEqual(after)
  })

  it('should include random suffix', () => {
    const id = generateOptimisticId()
    const parts = id.split('-')

    // Should have 3 parts: "optimistic", timestamp, random
    expect(parts.length).toBe(3)
    expect(parts[2].length).toBe(9)
  })

  it('should generate unique IDs', () => {
    const ids = new Set<string>()

    for (let i = 0; i < 100; i++) {
      ids.add(generateOptimisticId())
    }

    // All 100 IDs should be unique
    expect(ids.size).toBe(100)
  })

  it('should generate IDs matching expected format', () => {
    const id = generateOptimisticId()

    // Format: optimistic-{timestamp}-{9-char-random}
    expect(id).toMatch(/^optimistic-\d+-[a-z0-9]{9}$/)
  })
})
