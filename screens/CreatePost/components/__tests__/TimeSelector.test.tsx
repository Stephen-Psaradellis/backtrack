/**
 * Tests for screens/CreatePost/components/TimeSelector.tsx
 *
 * Tests the TimeSelector component for date and time selection
 * in both specific and approximate modes.
 */

import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, fireEvent } from '@testing-library/react'
import { TimeSelector } from '../TimeSelector'

// Mock haptics
vi.mock('../../../../lib/haptics', () => ({
  lightFeedback: vi.fn().mockResolvedValue(undefined),
  selectionFeedback: vi.fn().mockResolvedValue(undefined),
}))

// Mock styles
vi.mock('../../styles', () => ({
  COLORS: {
    textSecondary: '#999',
    background: '#fff',
    border: '#eee',
    primary: '#007AFF',
    textPrimary: '#000',
  },
}))

// Mock datetime utilities
vi.mock('../../../../utils/dateTime', () => ({
  formatRelativeDay: vi.fn((date) => {
    const now = new Date()
    if (date.getDate() === now.getDate()) return 'Today'
    return 'Yesterday'
  }),
  DAY_NAMES: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
  MONTH_NAMES_SHORT: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  getGranularityForHour: vi.fn(() => 'morning'),
}))

// Mock GranularityToggle component
vi.mock('../GranularityToggle', () => ({
  GranularityToggle: ({ mode, onModeChange, disabled, testID }: any) => (
    <div
      data-testid={testID || 'granularity-toggle'}
      onClick={() => !disabled && onModeChange(mode === 'specific' ? 'approximate' : 'specific')}
    >
      {mode}
    </div>
  ),
}))

// Mock database types
vi.mock('../../../../types/database', () => ({}))

describe('TimeSelector', () => {
  const mockOnDateChange = vi.fn()
  const mockOnModeChange = vi.fn()
  const mockOnApproximateTimeChange = vi.fn()
  const mockOnHourChange = vi.fn()
  const mockOnMinuteChange = vi.fn()
  const testDate = new Date('2024-01-15')

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('rendering', () => {
    it('should render the component', () => {
      const { container } = render(
        <TimeSelector
          mode="specific"
          date={testDate}
          onDateChange={mockOnDateChange}
          onModeChange={mockOnModeChange}
        />
      )
      expect(container.firstChild).toBeInTheDocument()
    })

    it('should render the main container', () => {
      const { container } = render(
        <TimeSelector
          mode="specific"
          date={testDate}
          onDateChange={mockOnDateChange}
          onModeChange={mockOnModeChange}
        />
      )
      expect(container.querySelector('[testid="time-selector"]')).toBeInTheDocument()
    })
  })

  describe('date selector', () => {
    it('should render date options section', () => {
      const { getByText } = render(
        <TimeSelector
          mode="specific"
          date={testDate}
          onDateChange={mockOnDateChange}
          onModeChange={mockOnModeChange}
        />
      )
      expect(getByText('When did you see them?')).toBeInTheDocument()
    })

    it('should render date option buttons', () => {
      const { container } = render(
        <TimeSelector
          mode="specific"
          date={testDate}
          onDateChange={mockOnDateChange}
          onModeChange={mockOnModeChange}
        />
      )
      expect(container.querySelector('[testid="time-selector-date-0"]')).toBeInTheDocument()
    })

    it('should call onDateChange when date is selected', async () => {
      const { container } = render(
        <TimeSelector
          mode="specific"
          date={testDate}
          onDateChange={mockOnDateChange}
          onModeChange={mockOnModeChange}
        />
      )
      const dateButton = container.querySelector('[testid="time-selector-date-0"]')
      if (dateButton) {
        fireEvent.click(dateButton)
      }

      await vi.waitFor(() => {
        expect(mockOnDateChange).toHaveBeenCalled()
      })
    })

    it('should generate date options based on maxDaysBack', () => {
      const { container } = render(
        <TimeSelector
          mode="specific"
          date={testDate}
          onDateChange={mockOnDateChange}
          onModeChange={mockOnModeChange}
          maxDaysBack={3}
        />
      )
      // Should have at least 3 date buttons (today, yesterday, 2 days ago, 3 days ago = 4)
      expect(container.querySelector('[testid="time-selector-date-0"]')).toBeInTheDocument()
      expect(container.querySelector('[testid="time-selector-date-1"]')).toBeInTheDocument()
    })
  })

  describe('granularity toggle', () => {
    it('should render granularity toggle', () => {
      const { container } = render(
        <TimeSelector
          mode="specific"
          date={testDate}
          onDateChange={mockOnDateChange}
          onModeChange={mockOnModeChange}
        />
      )
      expect(container.querySelector('[data-testid="time-selector-granularity"]')).toBeInTheDocument()
    })

    it('should pass current mode to granularity toggle', () => {
      const { container } = render(
        <TimeSelector
          mode="specific"
          date={testDate}
          onDateChange={mockOnDateChange}
          onModeChange={mockOnModeChange}
        />
      )
      const toggle = container.querySelector('[data-testid="time-selector-granularity"]')
      expect(toggle?.textContent).toContain('specific')
    })

    it('should call onModeChange when toggle is pressed', async () => {
      const { container } = render(
        <TimeSelector
          mode="specific"
          date={testDate}
          onDateChange={mockOnDateChange}
          onModeChange={mockOnModeChange}
        />
      )
      const toggle = container.querySelector('[data-testid="time-selector-granularity"]')
      if (toggle) {
        fireEvent.click(toggle)
      }

      await vi.waitFor(() => {
        expect(mockOnModeChange).toHaveBeenCalledWith('approximate')
      })
    })
  })

  describe('approximate time mode', () => {
    it('should render approximate time options in approximate mode', () => {
      const { getByText } = render(
        <TimeSelector
          mode="approximate"
          date={testDate}
          approximateTime="morning"
          onDateChange={mockOnDateChange}
          onModeChange={mockOnModeChange}
          onApproximateTimeChange={mockOnApproximateTimeChange}
        />
      )
      expect(getByText('What time of day?')).toBeInTheDocument()
      expect(getByText('Morning')).toBeInTheDocument()
      expect(getByText('Afternoon')).toBeInTheDocument()
      expect(getByText('Evening')).toBeInTheDocument()
    })

    it('should render period icons in approximate mode', () => {
      const { getByText } = render(
        <TimeSelector
          mode="approximate"
          date={testDate}
          approximateTime="morning"
          onDateChange={mockOnDateChange}
          onModeChange={mockOnModeChange}
          onApproximateTimeChange={mockOnApproximateTimeChange}
        />
      )
      expect(getByText('🌅')).toBeInTheDocument()
      expect(getByText('☀️')).toBeInTheDocument()
      expect(getByText('🌙')).toBeInTheDocument()
    })

    it('should call onApproximateTimeChange when period is selected', async () => {
      const { container } = render(
        <TimeSelector
          mode="approximate"
          date={testDate}
          approximateTime="morning"
          onDateChange={mockOnDateChange}
          onModeChange={mockOnModeChange}
          onApproximateTimeChange={mockOnApproximateTimeChange}
        />
      )
      const afternoonButton = container.querySelector('[testid="time-selector-period-afternoon"]')
      if (afternoonButton) {
        fireEvent.click(afternoonButton)
      }

      await vi.waitFor(() => {
        expect(mockOnApproximateTimeChange).toHaveBeenCalledWith('afternoon')
      })
    })

    it('should not render specific time picker in approximate mode', () => {
      const { queryByText } = render(
        <TimeSelector
          mode="approximate"
          date={testDate}
          approximateTime="morning"
          onDateChange={mockOnDateChange}
          onModeChange={mockOnModeChange}
          onApproximateTimeChange={mockOnApproximateTimeChange}
        />
      )
      expect(queryByText('What time?')).not.toBeInTheDocument()
    })
  })

  describe('specific time mode', () => {
    it('should render specific time picker in specific mode', () => {
      const { getByText } = render(
        <TimeSelector
          mode="specific"
          date={testDate}
          hour={14}
          minute={30}
          onDateChange={mockOnDateChange}
          onModeChange={mockOnModeChange}
          onHourChange={mockOnHourChange}
          onMinuteChange={mockOnMinuteChange}
        />
      )
      expect(getByText('What time?')).toBeInTheDocument()
    })

    it('should render hour picker in specific mode', () => {
      const { container } = render(
        <TimeSelector
          mode="specific"
          date={testDate}
          hour={14}
          minute={30}
          onDateChange={mockOnDateChange}
          onModeChange={mockOnModeChange}
          onHourChange={mockOnHourChange}
          onMinuteChange={mockOnMinuteChange}
        />
      )
      expect(container.querySelector('[testid="time-selector-hour-scroll"]')).toBeInTheDocument()
    })

    it('should render minute picker in specific mode', () => {
      const { container } = render(
        <TimeSelector
          mode="specific"
          date={testDate}
          hour={14}
          minute={30}
          onDateChange={mockOnDateChange}
          onModeChange={mockOnModeChange}
          onHourChange={mockOnHourChange}
          onMinuteChange={mockOnMinuteChange}
        />
      )
      expect(container.querySelector('[testid="time-selector-minute-scroll"]')).toBeInTheDocument()
    })

    it('should render AM/PM period picker in specific mode', () => {
      const { getByText } = render(
        <TimeSelector
          mode="specific"
          date={testDate}
          hour={14}
          minute={30}
          onDateChange={mockOnDateChange}
          onModeChange={mockOnModeChange}
          onHourChange={mockOnHourChange}
          onMinuteChange={mockOnMinuteChange}
        />
      )
      expect(getByText('Period')).toBeInTheDocument()
    })

    it('should not render approximate time options in specific mode', () => {
      const { queryByText } = render(
        <TimeSelector
          mode="specific"
          date={testDate}
          hour={14}
          minute={30}
          onDateChange={mockOnDateChange}
          onModeChange={mockOnModeChange}
          onHourChange={mockOnHourChange}
          onMinuteChange={mockOnMinuteChange}
        />
      )
      expect(queryByText('What time of day?')).not.toBeInTheDocument()
    })

    it('should call onHourChange when hour is selected', async () => {
      const { container } = render(
        <TimeSelector
          mode="specific"
          date={testDate}
          hour={2}
          minute={0}
          onDateChange={mockOnDateChange}
          onModeChange={mockOnModeChange}
          onHourChange={mockOnHourChange}
          onMinuteChange={mockOnMinuteChange}
        />
      )
      const hourButton = container.querySelector('[testid="time-selector-hour-3"]')
      if (hourButton) {
        fireEvent.click(hourButton)
      }

      await vi.waitFor(() => {
        expect(mockOnHourChange).toHaveBeenCalled()
      })
    })

    it('should call onMinuteChange when minute is selected', async () => {
      const { container } = render(
        <TimeSelector
          mode="specific"
          date={testDate}
          hour={14}
          minute={0}
          onDateChange={mockOnDateChange}
          onModeChange={mockOnModeChange}
          onHourChange={mockOnHourChange}
          onMinuteChange={mockOnMinuteChange}
        />
      )
      const minuteButton = container.querySelector('[testid="time-selector-minute-15"]')
      if (minuteButton) {
        fireEvent.click(minuteButton)
      }

      await vi.waitFor(() => {
        expect(mockOnMinuteChange).toHaveBeenCalledWith(15)
      })
    })
  })

  describe('disabled state', () => {
    it('should not call onDateChange when disabled', () => {
      const { container } = render(
        <TimeSelector
          mode="specific"
          date={testDate}
          onDateChange={mockOnDateChange}
          onModeChange={mockOnModeChange}
          disabled
        />
      )
      const dateButton = container.querySelector('[testid="time-selector-date-0"]')
      if (dateButton) {
        fireEvent.click(dateButton)
      }

      expect(mockOnDateChange).not.toHaveBeenCalled()
    })

    it('should not call onApproximateTimeChange when disabled', () => {
      const { container } = render(
        <TimeSelector
          mode="approximate"
          date={testDate}
          approximateTime="morning"
          onDateChange={mockOnDateChange}
          onModeChange={mockOnModeChange}
          onApproximateTimeChange={mockOnApproximateTimeChange}
          disabled
        />
      )
      const periodButton = container.querySelector('[testid="time-selector-period-afternoon"]')
      if (periodButton) {
        fireEvent.click(periodButton)
      }

      expect(mockOnApproximateTimeChange).not.toHaveBeenCalled()
    })
  })

  describe('testID prop', () => {
    it('should use custom testID prefix', () => {
      const { container } = render(
        <TimeSelector
          mode="specific"
          date={testDate}
          onDateChange={mockOnDateChange}
          onModeChange={mockOnModeChange}
          testID="custom-selector"
        />
      )
      expect(container.querySelector('[testid="custom-selector"]')).toBeInTheDocument()
      expect(container.querySelector('[testid="custom-selector-date-scroll"]')).toBeInTheDocument()
      expect(container.querySelector('[data-testid="custom-selector-granularity"]')).toBeInTheDocument()
    })
  })

  describe('switching between modes', () => {
    it('should render different content when switching from specific to approximate', () => {
      const { rerender, getByText, queryByText } = render(
        <TimeSelector
          mode="specific"
          date={testDate}
          hour={14}
          minute={30}
          onDateChange={mockOnDateChange}
          onModeChange={mockOnModeChange}
          onHourChange={mockOnHourChange}
          onMinuteChange={mockOnMinuteChange}
        />
      )
      expect(getByText('What time?')).toBeInTheDocument()

      rerender(
        <TimeSelector
          mode="approximate"
          date={testDate}
          approximateTime="afternoon"
          onDateChange={mockOnDateChange}
          onModeChange={mockOnModeChange}
          onApproximateTimeChange={mockOnApproximateTimeChange}
        />
      )
      expect(queryByText('What time?')).not.toBeInTheDocument()
      expect(getByText('What time of day?')).toBeInTheDocument()
    })
  })
})
