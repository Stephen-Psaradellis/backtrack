/**
 * Tests for types/streaks.ts
 *
 * Tests the streak constants and type exports.
 */

import { describe, it, expect } from 'vitest'
import {
  STREAK_MILESTONES,
  STREAK_TYPE_LABELS,
  STREAK_TYPE_SHORT_LABELS,
  type StreakType,
  type StreakMilestone,
  type LocationStreak,
} from '../streaks'

describe('STREAK_MILESTONES', () => {
  it('should contain milestone values 5, 10, 25, 50, 100', () => {
    expect(STREAK_MILESTONES).toContain(5)
    expect(STREAK_MILESTONES).toContain(10)
    expect(STREAK_MILESTONES).toContain(25)
    expect(STREAK_MILESTONES).toContain(50)
    expect(STREAK_MILESTONES).toContain(100)
  })

  it('should have exactly 5 milestones', () => {
    expect(STREAK_MILESTONES).toHaveLength(5)
  })

  it('should be in ascending order', () => {
    for (let i = 0; i < STREAK_MILESTONES.length - 1; i++) {
      expect(STREAK_MILESTONES[i]).toBeLessThan(STREAK_MILESTONES[i + 1])
    }
  })
})

describe('STREAK_TYPE_LABELS', () => {
  it('should have daily label', () => {
    expect(STREAK_TYPE_LABELS.daily).toBe('day')
  })

  it('should have weekly label', () => {
    expect(STREAK_TYPE_LABELS.weekly).toBe('week')
  })

  it('should have monthly label', () => {
    expect(STREAK_TYPE_LABELS.monthly).toBe('month')
  })

  it('should have all streak types', () => {
    const types: StreakType[] = ['daily', 'weekly', 'monthly']
    types.forEach((type) => {
      expect(STREAK_TYPE_LABELS).toHaveProperty(type)
    })
  })
})

describe('STREAK_TYPE_SHORT_LABELS', () => {
  it('should have daily short label', () => {
    expect(STREAK_TYPE_SHORT_LABELS.daily).toBe('d')
  })

  it('should have weekly short label', () => {
    expect(STREAK_TYPE_SHORT_LABELS.weekly).toBe('w')
  })

  it('should have monthly short label', () => {
    expect(STREAK_TYPE_SHORT_LABELS.monthly).toBe('m')
  })

  it('should have all streak types', () => {
    const types: StreakType[] = ['daily', 'weekly', 'monthly']
    types.forEach((type) => {
      expect(STREAK_TYPE_SHORT_LABELS).toHaveProperty(type)
    })
  })
})

describe('Type exports', () => {
  it('should allow valid StreakType values', () => {
    const daily: StreakType = 'daily'
    const weekly: StreakType = 'weekly'
    const monthly: StreakType = 'monthly'

    expect(daily).toBe('daily')
    expect(weekly).toBe('weekly')
    expect(monthly).toBe('monthly')
  })

  it('should allow valid StreakMilestone values', () => {
    const milestones: StreakMilestone[] = [5, 10, 25, 50, 100]

    milestones.forEach((m) => {
      expect(typeof m).toBe('number')
    })
  })

  it('should allow valid LocationStreak interface', () => {
    const streak: LocationStreak = {
      id: 'streak-1',
      user_id: 'user-1',
      location_id: 'loc-1',
      streak_type: 'daily',
      current_streak: 5,
      longest_streak: 10,
      last_visit_period: '2025-01-08',
      total_visits: 15,
      started_at: '2025-01-01T00:00:00.000Z',
      updated_at: '2025-01-08T12:00:00.000Z',
    }

    expect(streak.id).toBe('streak-1')
    expect(streak.current_streak).toBe(5)
    expect(streak.longest_streak).toBe(10)
    expect(streak.total_visits).toBe(15)
  })
})
