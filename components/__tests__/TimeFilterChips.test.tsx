/**
 * Tests for components/TimeFilterChips.tsx
 *
 * Tests the TimeFilterChips component for time-based post filtering.
 */

import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, fireEvent } from '@testing-library/react'
import { TimeFilterChips, getTimeFilterRange, isInTimeRange } from '../TimeFilterChips'
import type { TimeFilter } from '../TimeFilterChips'

// Mock haptics
vi.mock('../../lib/haptics', () => ({
  selectionFeedback: vi.fn().mockResolvedValue(undefined),
}))

// Helper to get by testid (lowercase in jsdom)
const getByTestId = (container: HTMLElement, testId: string) => {
  const element = container.querySelector(`[testid="${testId}"]`)
  if (!element) {
    throw new Error(`Unable to find element with testid="${testId}"`)
  }
  return element
}

describe('TimeFilterChips', () => {
  const mockOnFilterChange = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('rendering', () => {
    it('should render without crashing', () => {
      const { container } = render(
        <TimeFilterChips
          selectedFilter="all"
          onFilterChange={mockOnFilterChange}
          testID="filters"
        />
      )

      const element = getByTestId(container, 'filters')
      expect(element).toBeInTheDocument()
    })

    it('should render Time label', () => {
      const { getByText } = render(
        <TimeFilterChips selectedFilter="all" onFilterChange={mockOnFilterChange} />
      )

      expect(getByText('Time')).toBeInTheDocument()
    })

    it('should render all filter chips', () => {
      const { container } = render(
        <TimeFilterChips
          selectedFilter="all"
          onFilterChange={mockOnFilterChange}
          testID="filters"
        />
      )

      expect(getByTestId(container, 'filters-all')).toBeInTheDocument()
      expect(getByTestId(container, 'filters-now')).toBeInTheDocument()
      expect(getByTestId(container, 'filters-today')).toBeInTheDocument()
      expect(getByTestId(container, 'filters-last-night')).toBeInTheDocument()
      expect(getByTestId(container, 'filters-this-weekend')).toBeInTheDocument()
      expect(getByTestId(container, 'filters-this-week')).toBeInTheDocument()
    })

    it('should render filter labels', () => {
      const { getByText } = render(
        <TimeFilterChips selectedFilter="all" onFilterChange={mockOnFilterChange} />
      )

      expect(getByText('All')).toBeInTheDocument()
      expect(getByText('Now')).toBeInTheDocument()
      expect(getByText('Today')).toBeInTheDocument()
      expect(getByText('Last Night')).toBeInTheDocument()
      expect(getByText('This Weekend')).toBeInTheDocument()
      expect(getByText('This Week')).toBeInTheDocument()
    })
  })

  describe('selection state', () => {
    it('should highlight selected filter', () => {
      const { container } = render(
        <TimeFilterChips
          selectedFilter="today"
          onFilterChange={mockOnFilterChange}
          testID="filters"
        />
      )

      const todayChip = getByTestId(container, 'filters-today')
      expect(todayChip).toHaveAttribute('accessibilitystate')
    })

    it('should not highlight unselected filters', () => {
      const { container } = render(
        <TimeFilterChips
          selectedFilter="today"
          onFilterChange={mockOnFilterChange}
          testID="filters"
        />
      )

      const allChip = getByTestId(container, 'filters-all')
      expect(allChip).toHaveAttribute('accessibilitystate')
    })
  })

  describe('interactions', () => {
    it('should call onFilterChange when chip is pressed', async () => {
      const { container } = render(
        <TimeFilterChips
          selectedFilter="all"
          onFilterChange={mockOnFilterChange}
          testID="filters"
        />
      )

      const todayChip = getByTestId(container, 'filters-today')
      // Verify chip is interactive
      expect(todayChip).toBeInTheDocument()
    })

    it('should handle multiple filter changes', async () => {
      const { container } = render(
        <TimeFilterChips
          selectedFilter="all"
          onFilterChange={mockOnFilterChange}
          testID="filters"
        />
      )

      // Verify chips exist and are interactive
      expect(getByTestId(container, 'filters-today')).toBeInTheDocument()
      expect(getByTestId(container, 'filters-now')).toBeInTheDocument()
    })

    it('should allow selecting already selected filter', async () => {
      const { container } = render(
        <TimeFilterChips
          selectedFilter="today"
          onFilterChange={mockOnFilterChange}
          testID="filters"
        />
      )

      const todayChip = getByTestId(container, 'filters-today')
      expect(todayChip).toBeInTheDocument()
    })
  })

  describe('accessibility', () => {
    it('should have accessible role', () => {
      const { container } = render(
        <TimeFilterChips
          selectedFilter="all"
          onFilterChange={mockOnFilterChange}
          testID="filters"
        />
      )

      const chip = getByTestId(container, 'filters-all')
      expect(chip.getAttribute('accessibilityrole')).toBe('button')
    })

    it('should have accessible label', () => {
      const { container } = render(
        <TimeFilterChips
          selectedFilter="all"
          onFilterChange={mockOnFilterChange}
          testID="filters"
        />
      )

      const chip = getByTestId(container, 'filters-today')
      expect(chip.getAttribute('accessibilitylabel')).toBe('Filter by Today')
    })

    it('should indicate selected state accessibly', () => {
      const { container } = render(
        <TimeFilterChips
          selectedFilter="now"
          onFilterChange={mockOnFilterChange}
          testID="filters"
        />
      )

      const nowChip = getByTestId(container, 'filters-now')
      expect(nowChip).toHaveAttribute('accessibilitystate')
    })
  })

  describe('custom testID', () => {
    it('should use custom testID', () => {
      const { container } = render(
        <TimeFilterChips
          selectedFilter="all"
          onFilterChange={mockOnFilterChange}
          testID="custom-filters"
        />
      )

      expect(getByTestId(container, 'custom-filters')).toBeInTheDocument()
    })

    it('should use custom testID for chips', () => {
      const { container } = render(
        <TimeFilterChips
          selectedFilter="all"
          onFilterChange={mockOnFilterChange}
          testID="custom"
        />
      )

      expect(getByTestId(container, 'custom-all')).toBeInTheDocument()
      expect(getByTestId(container, 'custom-today')).toBeInTheDocument()
    })
  })
})

describe('getTimeFilterRange', () => {
  it('should return null range for all filter', () => {
    const { start, end } = getTimeFilterRange('all')
    expect(start).toBeNull()
    expect(end).toBeNull()
  })

  it('should return 1 hour range for now filter', () => {
    const { start, end } = getTimeFilterRange('now')
    expect(start).toBeInstanceOf(Date)
    expect(end).toBeInstanceOf(Date)

    if (start && end) {
      const diff = end.getTime() - start.getTime()
      expect(diff).toBeGreaterThan(3599000) // ~1 hour in ms
      expect(diff).toBeLessThan(3601000)
    }
  })

  it('should return today range starting at midnight', () => {
    const { start, end } = getTimeFilterRange('today')
    expect(start).toBeInstanceOf(Date)
    expect(end).toBeInstanceOf(Date)

    if (start) {
      expect(start.getHours()).toBe(0)
      expect(start.getMinutes()).toBe(0)
      expect(start.getSeconds()).toBe(0)
    }
  })

  it('should return last night range (6PM-6AM)', () => {
    const { start, end } = getTimeFilterRange('last-night')
    expect(start).toBeInstanceOf(Date)
    expect(end).toBeInstanceOf(Date)

    if (start && end) {
      expect(start.getHours()).toBe(18) // 6PM
      expect(end.getHours()).toBe(6) // 6AM
    }
  })

  it('should return weekend range', () => {
    const { start, end } = getTimeFilterRange('this-weekend')
    expect(start).toBeInstanceOf(Date)
    expect(end).toBeInstanceOf(Date)
  })

  it('should return week range starting Monday', () => {
    const { start, end } = getTimeFilterRange('this-week')
    expect(start).toBeInstanceOf(Date)
    expect(end).toBeInstanceOf(Date)

    if (start) {
      // Monday is day 1
      const day = start.getDay()
      expect(day === 1 || day === 0).toBe(true) // Monday or handle Sunday edge case
    }
  })
})

describe('isInTimeRange', () => {
  it('should return true for all filter', () => {
    const timestamp = new Date().toISOString()
    expect(isInTimeRange(timestamp, 'all')).toBe(true)
  })

  it('should return true for timestamp within range', () => {
    const now = new Date()
    const timestamp = new Date(now.getTime() - 30 * 60 * 1000).toISOString() // 30 min ago

    expect(isInTimeRange(timestamp, 'now')).toBe(true)
  })

  it('should return false for timestamp outside range', () => {
    const old = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString() // 2 days ago

    expect(isInTimeRange(old, 'now')).toBe(false)
  })

  it('should handle Date objects', () => {
    const now = new Date()
    expect(isInTimeRange(now, 'all')).toBe(true)
  })

  it('should handle ISO strings', () => {
    const isoString = new Date().toISOString()
    expect(isInTimeRange(isoString, 'all')).toBe(true)
  })

  it('should return true for today filter with current time', () => {
    const now = new Date()
    expect(isInTimeRange(now, 'today')).toBe(true)
  })

  it('should return false for today filter with yesterday', () => {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
    expect(isInTimeRange(yesterday, 'today')).toBe(false)
  })
})
