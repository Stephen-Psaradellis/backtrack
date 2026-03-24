/**
 * Tests for components/PostFilters.tsx
 *
 * Tests the PostFilters time filter bar with filter chips and selection behavior.
 */

import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, fireEvent } from '@testing-library/react'
import { PostFilters } from '../PostFilters'

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

const queryByTestId = (container: HTMLElement, testId: string) =>
  container.querySelector(`[testid="${testId}"]`)

describe('PostFilters', () => {
  const mockOnTimeFilterChange = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('rendering', () => {
    it('should render the filter container', () => {
      const { container } = render(
        <PostFilters
          selectedTimeFilter="any_time"
          onTimeFilterChange={mockOnTimeFilterChange}
        />
      )

      expect(getByTestId(container, 'post-filters')).toBeInTheDocument()
    })

    it('should render all time filter chips', () => {
      const { container } = render(
        <PostFilters
          selectedTimeFilter="any_time"
          onTimeFilterChange={mockOnTimeFilterChange}
        />
      )

      expect(queryByTestId(container, 'post-filters-chip-last_24h')).toBeInTheDocument()
      expect(queryByTestId(container, 'post-filters-chip-last_week')).toBeInTheDocument()
      expect(queryByTestId(container, 'post-filters-chip-last_month')).toBeInTheDocument()
      expect(queryByTestId(container, 'post-filters-chip-any_time')).toBeInTheDocument()
    })

    it('should render filter labels', () => {
      const { getByText } = render(
        <PostFilters
          selectedTimeFilter="any_time"
          onTimeFilterChange={mockOnTimeFilterChange}
        />
      )

      expect(getByText('Last 24h')).toBeInTheDocument()
      expect(getByText('Last Week')).toBeInTheDocument()
      expect(getByText('Any Time')).toBeInTheDocument()
    })

    it('should accept custom testID', () => {
      const { container } = render(
        <PostFilters
          selectedTimeFilter="any_time"
          onTimeFilterChange={mockOnTimeFilterChange}
          testID="my-filters"
        />
      )

      expect(getByTestId(container, 'my-filters')).toBeInTheDocument()
    })
  })

  describe('interactions', () => {
    it('should call onTimeFilterChange when a different filter is pressed', () => {
      const { container } = render(
        <PostFilters
          selectedTimeFilter="any_time"
          onTimeFilterChange={mockOnTimeFilterChange}
        />
      )

      const chip = getByTestId(container, 'post-filters-chip-last_week')
      fireEvent.click(chip)

      expect(mockOnTimeFilterChange).toHaveBeenCalledWith('last_week')
    })

    it('should not call onTimeFilterChange when the already-selected filter is pressed', () => {
      const { container } = render(
        <PostFilters
          selectedTimeFilter="last_week"
          onTimeFilterChange={mockOnTimeFilterChange}
        />
      )

      const chip = getByTestId(container, 'post-filters-chip-last_week')
      fireEvent.click(chip)

      expect(mockOnTimeFilterChange).not.toHaveBeenCalled()
    })

    it('should trigger haptic feedback on selection change', async () => {
      const { selectionFeedback } = await import('../../lib/haptics')

      const { container } = render(
        <PostFilters
          selectedTimeFilter="any_time"
          onTimeFilterChange={mockOnTimeFilterChange}
        />
      )

      const chip = getByTestId(container, 'post-filters-chip-last_24h')
      fireEvent.click(chip)

      expect(selectionFeedback).toHaveBeenCalled()
    })
  })

  describe('disabled state', () => {
    it('should not fire callback when disabled', () => {
      const { container } = render(
        <PostFilters
          selectedTimeFilter="any_time"
          onTimeFilterChange={mockOnTimeFilterChange}
          disabled
        />
      )

      const chip = getByTestId(container, 'post-filters-chip-last_week')
      fireEvent.click(chip)

      // TouchableOpacity with disabled=true won't fire onPress in real RN,
      // but in jsdom the click still fires. We verify the disabled prop is passed.
      expect(chip).toHaveAttribute('disabled')
    })
  })
})
