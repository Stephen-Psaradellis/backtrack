import React from 'react'
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'

vi.mock('react-native', () => ({
  View: ({ children, style, testID, accessibilityRole, accessibilityLabel, ...props }: any) => (
    <div style={style} data-testid={testID} role={accessibilityRole} aria-label={accessibilityLabel} {...props}>{children}</div>
  ),
  Text: ({ children, style, ...props }: any) => <span style={style} {...props}>{children}</span>,
  StyleSheet: { create: (s: any) => s },
}))

vi.mock('../../../types/streaks', () => ({
  STREAK_TYPE_LABELS: { daily: 'day', weekly: 'week', monthly: 'month' },
  STREAK_TYPE_SHORT_LABELS: { daily: 'd', weekly: 'w', monthly: 'm' },
}))

import { vi } from 'vitest'
import { StreakBadge } from '../StreakBadge'

describe('StreakBadge', () => {
  it('renders with count and short label', () => {
    const { getByText } = render(<StreakBadge count={5} type="daily" />)
    expect(getByText('5d')).toBeInTheDocument()
  })

  it('renders fire emoji', () => {
    const { container } = render(<StreakBadge count={3} type="weekly" />)
    expect(container.textContent).toContain('\u{1F525}')
  })

  it('returns null for count <= 0', () => {
    const { container } = render(<StreakBadge count={0} type="daily" />)
    expect(container.innerHTML).toBe('')
  })

  it('returns null for negative count', () => {
    const { container } = render(<StreakBadge count={-1} type="daily" />)
    expect(container.innerHTML).toBe('')
  })

  it('shows full label when showLabel is true', () => {
    const { getByText } = render(<StreakBadge count={5} type="daily" showLabel />)
    expect(getByText('5 days')).toBeInTheDocument()
  })

  it('shows singular label for count of 1', () => {
    const { getByText } = render(<StreakBadge count={1} type="weekly" showLabel />)
    expect(getByText('1 week')).toBeInTheDocument()
  })

  it('renders weekly short label', () => {
    const { getByText } = render(<StreakBadge count={10} type="weekly" />)
    expect(getByText('10w')).toBeInTheDocument()
  })

  it('renders monthly short label', () => {
    const { getByText } = render(<StreakBadge count={2} type="monthly" />)
    expect(getByText('2m')).toBeInTheDocument()
  })

  it('uses testID prop', () => {
    const { getByTestId } = render(<StreakBadge count={1} type="daily" testID="my-badge" />)
    expect(getByTestId('my-badge')).toBeInTheDocument()
  })

  it('has accessibility label', () => {
    const { getByTestId } = render(<StreakBadge count={5} type="daily" />)
    expect(getByTestId('streak-badge').getAttribute('aria-label')).toBe('5 day streak')
  })
})
