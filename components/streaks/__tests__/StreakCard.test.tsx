import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, fireEvent } from '@testing-library/react'

vi.mock('react-native', () => ({
  View: ({ children, style, testID, accessibilityRole, ...props }: any) => (
    <div style={style} data-testid={testID} role={accessibilityRole} {...props}>{children}</div>
  ),
  Text: ({ children, style, numberOfLines, ...props }: any) => <span style={style} {...props}>{children}</span>,
  StyleSheet: { create: (s: any) => s },
  TouchableOpacity: ({ children, onPress, activeOpacity, testID, accessibilityRole, style, ...props }: any) => (
    <button onClick={onPress} data-testid={testID} role={accessibilityRole} {...props}>{children}</button>
  ),
}))

vi.mock('../../../types/streaks', () => ({
  STREAK_TYPE_LABELS: { daily: 'day', weekly: 'week', monthly: 'month' },
  STREAK_TYPE_SHORT_LABELS: { daily: 'd', weekly: 'w', monthly: 'm' },
}))

vi.mock('../../../constants/glassStyles', () => ({
  darkTheme: { textPrimary: '#fff', textSecondary: '#aaa', textMuted: '#666' },
}))

import { StreakCard, LocationStreaksCard } from '../StreakCard'
import type { LocationStreakWithDetails } from '../../../types/streaks'

const makeStreak = (overrides?: Partial<LocationStreakWithDetails>): LocationStreakWithDetails => ({
  id: 's1',
  user_id: 'u1',
  location_id: 'loc1',
  streak_type: 'weekly',
  current_streak: 5,
  longest_streak: 10,
  last_visit_period: '2026-W09',
  total_visits: 20,
  started_at: '2026-01-01',
  updated_at: '2026-03-01',
  location_name: 'Coffee House',
  location_address: '123 Main St',
  ...overrides,
})

describe('StreakCard', () => {
  it('renders location name', () => {
    const { getByText } = render(<StreakCard streak={makeStreak()} />)
    expect(getByText('Coffee House')).toBeInTheDocument()
  })

  it('renders location address in non-compact mode', () => {
    const { getByText } = render(<StreakCard streak={makeStreak()} />)
    expect(getByText('123 Main St')).toBeInTheDocument()
  })

  it('hides address in compact mode', () => {
    const { queryByText } = render(<StreakCard streak={makeStreak()} compact />)
    expect(queryByText('123 Main St')).not.toBeInTheDocument()
  })

  it('shows stats in non-compact mode', () => {
    const { getByText } = render(<StreakCard streak={makeStreak()} />)
    expect(getByText('Current')).toBeInTheDocument()
    expect(getByText('Best')).toBeInTheDocument()
    expect(getByText('Total')).toBeInTheDocument()
  })

  it('hides stats in compact mode', () => {
    const { queryByText } = render(<StreakCard streak={makeStreak()} compact />)
    expect(queryByText('Current')).not.toBeInTheDocument()
  })

  it('calls onPress when pressed', () => {
    const onPress = vi.fn()
    const { getByTestId } = render(<StreakCard streak={makeStreak()} onPress={onPress} />)
    fireEvent.click(getByTestId('streak-card'))
    expect(onPress).toHaveBeenCalled()
  })

  it('uses custom testID', () => {
    const { getByTestId } = render(<StreakCard streak={makeStreak()} testID="custom" />)
    expect(getByTestId('custom')).toBeInTheDocument()
  })

  it('renders stat values', () => {
    const streak = makeStreak({ current_streak: 5, longest_streak: 10, total_visits: 20 })
    const { getAllByText } = render(<StreakCard streak={streak} />)
    // current_streak appears in both header badge and stats
    expect(getAllByText('5').length).toBeGreaterThanOrEqual(1)
    expect(getByText('10')).toBeInTheDocument()
    expect(getByText('20')).toBeInTheDocument()

    function getByText(text: string) {
      return getAllByText(text)[0]
    }
  })
})

describe('LocationStreaksCard', () => {
  it('renders location name', () => {
    const { getByText } = render(
      <LocationStreaksCard locationName="Gym" streaks={[makeStreak()]} />
    )
    expect(getByText('Gym')).toBeInTheDocument()
  })

  it('renders address when provided', () => {
    const { getByText } = render(
      <LocationStreaksCard locationName="Gym" locationAddress="456 Oak Ave" streaks={[makeStreak()]} />
    )
    expect(getByText('456 Oak Ave')).toBeInTheDocument()
  })

  it('hides address in compact mode', () => {
    const { queryByText } = render(
      <LocationStreaksCard locationName="Gym" locationAddress="456 Oak Ave" streaks={[makeStreak()]} compact />
    )
    expect(queryByText('456 Oak Ave')).not.toBeInTheDocument()
  })

  it('renders streak rows in non-compact mode', () => {
    const streaks = [
      makeStreak({ streak_type: 'daily', current_streak: 3, longest_streak: 7, total_visits: 15 }),
      makeStreak({ streak_type: 'weekly', current_streak: 5, longest_streak: 10, total_visits: 20 }),
    ]
    const { getByText } = render(
      <LocationStreaksCard locationName="Gym" streaks={streaks} />
    )
    expect(getByText('Day')).toBeInTheDocument()
    expect(getByText('Week')).toBeInTheDocument()
  })

  it('calls onPress', () => {
    const onPress = vi.fn()
    const { getByTestId } = render(
      <LocationStreaksCard locationName="Gym" streaks={[makeStreak()]} onPress={onPress} />
    )
    fireEvent.click(getByTestId('location-streaks-card'))
    expect(onPress).toHaveBeenCalled()
  })
})
