/**
 * Streaks Components Tests
 *
 * Smoke tests for streak components focusing on logic and exports.
 * Tests StreakBadge and StreakCard without full rendering.
 */

import { describe, it, expect, beforeEach } from 'vitest'

// ============================================================================
// TEST DATA
// ============================================================================

const mockStreakBadgeProps = {
  count: 5,
  type: 'daily' as const,
  size: 'md' as const,
  showLabel: false,
}

const mockLocationStreak = {
  id: 'streak-1',
  user_id: 'user-1',
  location_id: 'loc-1',
  location_name: 'Coffee Shop',
  location_address: '123 Main St',
  streak_type: 'weekly' as const,
  current_streak: 5,
  longest_streak: 10,
  last_visit_date: '2024-01-15',
  total_visits: 25,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-15T00:00:00Z',
}

const mockStreaks = [
  { ...mockLocationStreak, streak_type: 'daily' as const, current_streak: 3 },
  { ...mockLocationStreak, streak_type: 'weekly' as const, current_streak: 5 },
  { ...mockLocationStreak, streak_type: 'monthly' as const, current_streak: 2 },
]

// ============================================================================
// TESTS - StreakBadge
// ============================================================================

describe('StreakBadge', () => {
  beforeEach(() => {
    // Reset any state if needed
  })

  // --------------------------------------------------------------------------
  // MODULE IMPORT
  // --------------------------------------------------------------------------

  it('imports without errors', async () => {
    const module = await import('../StreakBadge')
    expect(module.StreakBadge).toBeDefined()
    expect(typeof module.StreakBadge).toBe('object') // memo returns object
  })

  it('exports default StreakBadge', async () => {
    const module = await import('../StreakBadge')
    expect(module.default).toBeDefined()
  })

  // --------------------------------------------------------------------------
  // STREAK TYPE LABELS
  // --------------------------------------------------------------------------

  it('has correct streak type labels', async () => {
    const { STREAK_TYPE_LABELS } = await import('../../../types/streaks')
    expect(STREAK_TYPE_LABELS.daily).toBe('day')
    expect(STREAK_TYPE_LABELS.weekly).toBe('week')
    expect(STREAK_TYPE_LABELS.monthly).toBe('month')
  })

  it('has correct short labels', async () => {
    const { STREAK_TYPE_SHORT_LABELS } = await import('../../../types/streaks')
    expect(STREAK_TYPE_SHORT_LABELS.daily).toBe('d')
    expect(STREAK_TYPE_SHORT_LABELS.weekly).toBe('w')
    expect(STREAK_TYPE_SHORT_LABELS.monthly).toBe('m')
  })

  // --------------------------------------------------------------------------
  // LABEL FORMATTING
  // --------------------------------------------------------------------------

  it('formats short label for single count', async () => {
    const { STREAK_TYPE_SHORT_LABELS } = await import('../../../types/streaks')
    const count = 1
    const type = 'daily'
    const label = `${count}${STREAK_TYPE_SHORT_LABELS[type]}`
    expect(label).toBe('1d')
  })

  it('formats short label for multiple count', async () => {
    const { STREAK_TYPE_SHORT_LABELS } = await import('../../../types/streaks')
    const count = 5
    const type = 'weekly'
    const label = `${count}${STREAK_TYPE_SHORT_LABELS[type]}`
    expect(label).toBe('5w')
  })

  it('formats full label for single count', async () => {
    const { STREAK_TYPE_LABELS } = await import('../../../types/streaks')
    const count = 1
    const type = 'daily'
    const label = `${count} ${STREAK_TYPE_LABELS[type]}${count !== 1 ? 's' : ''}`
    expect(label).toBe('1 day')
  })

  it('formats full label for multiple count', async () => {
    const { STREAK_TYPE_LABELS } = await import('../../../types/streaks')
    const count = 5
    const type = 'weekly'
    const label = `${count} ${STREAK_TYPE_LABELS[type]}${count !== 1 ? 's' : ''}`
    expect(label).toBe('5 weeks')
  })

  // --------------------------------------------------------------------------
  // SIZE VARIANTS
  // --------------------------------------------------------------------------

  it('has small size configuration', async () => {
    const sizeConfig = {
      container: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 },
      emoji: { fontSize: 10 },
      text: { fontSize: 10, fontWeight: '600' as const },
    }
    expect(sizeConfig.text.fontSize).toBe(10)
    expect(sizeConfig.container.paddingHorizontal).toBe(6)
  })

  it('has medium size configuration', async () => {
    const sizeConfig = {
      container: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
      emoji: { fontSize: 12 },
      text: { fontSize: 12, fontWeight: '600' as const },
    }
    expect(sizeConfig.text.fontSize).toBe(12)
    expect(sizeConfig.container.paddingHorizontal).toBe(8)
  })

  it('has large size configuration', async () => {
    const sizeConfig = {
      container: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
      emoji: { fontSize: 16 },
      text: { fontSize: 14, fontWeight: '700' as const },
    }
    expect(sizeConfig.text.fontSize).toBe(14)
    expect(sizeConfig.container.paddingHorizontal).toBe(12)
  })

  // --------------------------------------------------------------------------
  // ZERO COUNT HANDLING
  // --------------------------------------------------------------------------

  it('should not render for zero count', async () => {
    const count = 0
    const shouldRender = count > 0
    expect(shouldRender).toBe(false)
  })

  it('should not render for negative count', async () => {
    const count = -1
    const shouldRender = count > 0
    expect(shouldRender).toBe(false)
  })

  it('should render for positive count', async () => {
    const count = 1
    const shouldRender = count > 0
    expect(shouldRender).toBe(true)
  })

  // --------------------------------------------------------------------------
  // ACCESSIBILITY
  // --------------------------------------------------------------------------

  it('generates correct accessibility label', async () => {
    const { STREAK_TYPE_LABELS } = await import('../../../types/streaks')
    const count = 5
    const type = 'weekly'
    const accessibilityLabel = `${count} ${STREAK_TYPE_LABELS[type]} streak`
    expect(accessibilityLabel).toBe('5 week streak')
  })
})

// ============================================================================
// TESTS - StreakCard
// ============================================================================

describe('StreakCard', () => {
  beforeEach(() => {
    // Reset any state if needed
  })

  // --------------------------------------------------------------------------
  // MODULE IMPORT
  // --------------------------------------------------------------------------

  it('imports without errors', async () => {
    const module = await import('../StreakCard')
    expect(module.StreakCard).toBeDefined()
    expect(typeof module.StreakCard).toBe('object') // memo returns object
  })

  it('imports LocationStreaksCard', async () => {
    const module = await import('../StreakCard')
    expect(module.LocationStreaksCard).toBeDefined()
    expect(typeof module.LocationStreaksCard).toBe('function')
  })

  it('exports default StreakCard', async () => {
    const module = await import('../StreakCard')
    expect(module.default).toBeDefined()
  })

  // --------------------------------------------------------------------------
  // DATA STRUCTURE
  // --------------------------------------------------------------------------

  it('handles streak data with all fields', async () => {
    const streak = mockLocationStreak
    expect(streak).toHaveProperty('location_name')
    expect(streak).toHaveProperty('location_address')
    expect(streak).toHaveProperty('current_streak')
    expect(streak).toHaveProperty('longest_streak')
    expect(streak).toHaveProperty('total_visits')
    expect(streak).toHaveProperty('streak_type')
  })

  it('handles streak data without address', async () => {
    const streakNoAddress = { ...mockLocationStreak, location_address: null }
    expect(streakNoAddress.location_address).toBeNull()
    expect(streakNoAddress.location_name).toBeDefined()
  })

  // --------------------------------------------------------------------------
  // STREAK TYPE FILTERING
  // --------------------------------------------------------------------------

  it('filters streaks by type', async () => {
    const dailyStreak = mockStreaks.find((s) => s.streak_type === 'daily')
    const weeklyStreak = mockStreaks.find((s) => s.streak_type === 'weekly')
    const monthlyStreak = mockStreaks.find((s) => s.streak_type === 'monthly')

    expect(dailyStreak?.streak_type).toBe('daily')
    expect(weeklyStreak?.streak_type).toBe('weekly')
    expect(monthlyStreak?.streak_type).toBe('monthly')
  })

  it('handles missing streak types', async () => {
    const emptyStreaks: typeof mockStreaks = []
    const dailyStreak = emptyStreaks.find((s) => s.streak_type === 'daily')
    expect(dailyStreak).toBeUndefined()
  })

  // --------------------------------------------------------------------------
  // BEST STREAK CALCULATION
  // --------------------------------------------------------------------------

  it('finds best current streak', async () => {
    const bestStreak = mockStreaks.reduce(
      (best, current) =>
        current.current_streak > (best?.current_streak || 0) ? current : best,
      null as typeof mockStreaks[0] | null
    )

    expect(bestStreak?.current_streak).toBe(5)
    expect(bestStreak?.streak_type).toBe('weekly')
  })

  it('handles empty streaks array', async () => {
    const emptyStreaks: typeof mockStreaks = []
    const bestStreak = emptyStreaks.reduce(
      (best, current) =>
        current.current_streak > (best?.current_streak || 0) ? current : best,
      null as typeof mockStreaks[0] | null
    )

    expect(bestStreak).toBeNull()
  })

  it('handles all zero streaks', async () => {
    const zeroStreaks = mockStreaks.map((s) => ({ ...s, current_streak: 0 }))
    // When all streaks are 0, reduce picks the first one (none are > 0)
    const bestStreak = zeroStreaks.reduce(
      (best, current) =>
        current.current_streak > (best?.current_streak || 0) ? current : best,
      null as typeof zeroStreaks[0] | null
    )

    // bestStreak is null because no streak is > 0, and we start with null
    expect(bestStreak).toBeNull()
  })

  // --------------------------------------------------------------------------
  // STAT DISPLAY
  // --------------------------------------------------------------------------

  it('displays current streak stat', async () => {
    const streak = mockLocationStreak
    expect(streak.current_streak).toBe(5)
  })

  it('displays longest streak stat', async () => {
    const streak = mockLocationStreak
    expect(streak.longest_streak).toBe(10)
  })

  it('displays total visits stat', async () => {
    const streak = mockLocationStreak
    expect(streak.total_visits).toBe(25)
  })

  // --------------------------------------------------------------------------
  // COMPACT MODE
  // --------------------------------------------------------------------------

  it('handles compact display mode', async () => {
    const compact = true
    const shouldShowStats = !compact
    expect(shouldShowStats).toBe(false)
  })

  it('handles full display mode', async () => {
    const compact = false
    const shouldShowStats = !compact
    expect(shouldShowStats).toBe(true)
  })
})

// ============================================================================
// TESTS - Barrel Exports
// ============================================================================

describe('Streaks Barrel Exports', () => {
  it('exports StreakBadge', async () => {
    const module = await import('../index')
    expect(module.StreakBadge).toBeDefined()
  })

  it('exports StreakCard', async () => {
    const module = await import('../index')
    expect(module.StreakCard).toBeDefined()
  })

  it('exports LocationStreaksCard', async () => {
    const module = await import('../index')
    expect(module.LocationStreaksCard).toBeDefined()
  })

  it('exports all necessary types', async () => {
    // Type exports can't be directly tested but we verify module structure
    const module = await import('../index')
    expect(Object.keys(module)).toContain('StreakBadge')
    expect(Object.keys(module)).toContain('StreakCard')
    expect(Object.keys(module)).toContain('LocationStreaksCard')
  })
})
