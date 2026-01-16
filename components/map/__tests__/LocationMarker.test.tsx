/**
 * Tests for components/map/LocationMarker.tsx
 *
 * Tests the LocationMarker component and its helper functions.
 * LocationMarker displays activity-based map markers with visual states
 * for hot, active, historical, and virgin locations.
 */

import React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { LocationMarker, getActivityState } from '../LocationMarker'
import type { LocationActivityState } from '../LocationMarker'

// ============================================================================
// Test Constants
// ============================================================================

const TWO_HOURS_MS = 2 * 60 * 60 * 1000
const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000

// ============================================================================
// getActivityState Tests
// ============================================================================

describe('getActivityState', () => {
  describe('virgin state', () => {
    it('should return "virgin" when postCount is 0', () => {
      const result = getActivityState(0, new Date())
      expect(result).toBe('virgin')
    })

    it('should return "virgin" when postCount is 0 and latestPostAt is null', () => {
      const result = getActivityState(0, null)
      expect(result).toBe('virgin')
    })

    it('should return "virgin" when latestPostAt is null regardless of postCount', () => {
      const result = getActivityState(10, null)
      expect(result).toBe('virgin')
    })
  })

  describe('hot state', () => {
    it('should return "hot" when latestPostAt is less than 2 hours ago', () => {
      const recentPost = new Date(Date.now() - 30 * 60 * 1000) // 30 minutes ago
      const result = getActivityState(5, recentPost)
      expect(result).toBe('hot')
    })

    it('should return "hot" when latestPostAt is exactly now', () => {
      const result = getActivityState(1, new Date())
      expect(result).toBe('hot')
    })

    it('should return "hot" when latestPostAt is 1 hour 59 minutes ago', () => {
      const almostTwoHours = new Date(Date.now() - (TWO_HOURS_MS - 60000)) // 1h 59m ago
      const result = getActivityState(3, almostTwoHours)
      expect(result).toBe('hot')
    })
  })

  describe('active state', () => {
    it('should return "active" when latestPostAt is between 2 and 24 hours ago', () => {
      const post = new Date(Date.now() - 12 * 60 * 60 * 1000) // 12 hours ago
      const result = getActivityState(3, post)
      expect(result).toBe('active')
    })

    it('should return "active" when latestPostAt is exactly 2 hours ago', () => {
      const exactlyTwoHours = new Date(Date.now() - TWO_HOURS_MS)
      const result = getActivityState(2, exactlyTwoHours)
      expect(result).toBe('active')
    })

    it('should return "active" when latestPostAt is 23 hours 59 minutes ago', () => {
      const almostDay = new Date(Date.now() - (TWENTY_FOUR_HOURS_MS - 60000))
      const result = getActivityState(5, almostDay)
      expect(result).toBe('active')
    })
  })

  describe('historical state', () => {
    it('should return "historical" when latestPostAt is more than 24 hours ago', () => {
      const oldPost = new Date(Date.now() - 48 * 60 * 60 * 1000) // 48 hours ago
      const result = getActivityState(10, oldPost)
      expect(result).toBe('historical')
    })

    it('should return "historical" when latestPostAt is exactly 24 hours ago', () => {
      const exactlyOneDay = new Date(Date.now() - TWENTY_FOUR_HOURS_MS)
      const result = getActivityState(7, exactlyOneDay)
      expect(result).toBe('historical')
    })

    it('should return "historical" when latestPostAt is a week ago', () => {
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      const result = getActivityState(20, weekAgo)
      expect(result).toBe('historical')
    })
  })

  describe('edge cases', () => {
    it('should handle negative post counts gracefully', () => {
      const result = getActivityState(-1, new Date())
      // Function only checks for exactly 0, so -1 with a valid date returns hot
      // This is acceptable edge case behavior - negative counts shouldn't occur in practice
      expect(result).toBe('hot')
    })

    it('should handle very large post counts', () => {
      const result = getActivityState(1000000, new Date())
      expect(result).toBe('hot')
    })

    it('should handle future dates as hot', () => {
      const futureDate = new Date(Date.now() + 60000) // 1 minute in future
      const result = getActivityState(1, futureDate)
      expect(result).toBe('hot')
    })
  })
})

// ============================================================================
// LocationMarker Component Tests
// ============================================================================

describe('LocationMarker', () => {
  describe('rendering', () => {
    it('should render without crashing', () => {
      const { container } = render(
        <LocationMarker postCount={0} latestPostAt={null} />
      )
      expect(container.firstChild).toBeTruthy()
    })

    it('should render with postCount and latestPostAt', () => {
      const { container } = render(
        <LocationMarker postCount={5} latestPostAt={new Date()} />
      )
      expect(container.firstChild).toBeTruthy()
    })
  })

  describe('post count badge', () => {
    it('should show post count badge for hot locations', () => {
      render(
        <LocationMarker postCount={5} latestPostAt={new Date()} />
      )
      expect(screen.getByText('5')).toBeTruthy()
    })

    it('should show post count badge for active locations', () => {
      const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000)
      render(
        <LocationMarker postCount={10} latestPostAt={twelveHoursAgo} />
      )
      expect(screen.getByText('10')).toBeTruthy()
    })

    it('should display "99+" for counts greater than 99', () => {
      render(
        <LocationMarker postCount={150} latestPostAt={new Date()} />
      )
      expect(screen.getByText('99+')).toBeTruthy()
    })

    it('should display exact count at boundary (99)', () => {
      render(
        <LocationMarker postCount={99} latestPostAt={new Date()} />
      )
      expect(screen.getByText('99')).toBeTruthy()
    })

    it('should display "99+" at 100 posts', () => {
      render(
        <LocationMarker postCount={100} latestPostAt={new Date()} />
      )
      expect(screen.getByText('99+')).toBeTruthy()
    })

    it('should not show badge for virgin locations (0 posts)', () => {
      render(
        <LocationMarker postCount={0} latestPostAt={null} />
      )
      expect(screen.queryByText('0')).toBeNull()
    })

    it('should not show badge for historical locations', () => {
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      render(
        <LocationMarker postCount={5} latestPostAt={weekAgo} />
      )
      // Historical locations don't show badge
      expect(screen.queryByText('5')).toBeNull()
    })
  })

  describe('sizes', () => {
    it('should render with default medium size', () => {
      const { container } = render(
        <LocationMarker postCount={0} latestPostAt={null} />
      )
      expect(container.firstChild).toBeTruthy()
    })

    it('should render with small size', () => {
      const { container } = render(
        <LocationMarker postCount={0} latestPostAt={null} size="small" />
      )
      expect(container.firstChild).toBeTruthy()
    })

    it('should render with large size', () => {
      const { container } = render(
        <LocationMarker postCount={0} latestPostAt={null} size="large" />
      )
      expect(container.firstChild).toBeTruthy()
    })
  })

  describe('selected state', () => {
    it('should render with selected styling when selected is true', () => {
      const { container } = render(
        <LocationMarker postCount={5} latestPostAt={new Date()} selected />
      )
      expect(container.firstChild).toBeTruthy()
    })

    it('should render without selected styling when selected is false', () => {
      const { container } = render(
        <LocationMarker postCount={5} latestPostAt={new Date()} selected={false} />
      )
      expect(container.firstChild).toBeTruthy()
    })
  })

  describe('activity states', () => {
    it('should render hot state marker', () => {
      const { container } = render(
        <LocationMarker postCount={5} latestPostAt={new Date()} />
      )
      // Hot state should render (we can't easily test animation, just that it renders)
      expect(container.firstChild).toBeTruthy()
    })

    it('should render active state marker', () => {
      const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000)
      const { container } = render(
        <LocationMarker postCount={5} latestPostAt={twelveHoursAgo} />
      )
      expect(container.firstChild).toBeTruthy()
    })

    it('should render historical state marker', () => {
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      const { container } = render(
        <LocationMarker postCount={5} latestPostAt={weekAgo} />
      )
      expect(container.firstChild).toBeTruthy()
    })

    it('should render virgin state marker', () => {
      const { container } = render(
        <LocationMarker postCount={0} latestPostAt={null} />
      )
      expect(container.firstChild).toBeTruthy()
    })
  })

  describe('onPress callback', () => {
    it('should accept onPress prop', () => {
      const handlePress = vi.fn()
      const { container } = render(
        <LocationMarker
          postCount={5}
          latestPostAt={new Date()}
          onPress={handlePress}
        />
      )
      // Component should render with onPress prop (testing actual press requires native)
      expect(container.firstChild).toBeTruthy()
    })
  })

  describe('memoization', () => {
    it('should be a memoized component', () => {
      // LocationMarker is wrapped in memo() for performance
      // We verify it's a valid React component that can be rendered multiple times
      const { rerender, container } = render(
        <LocationMarker postCount={5} latestPostAt={new Date()} />
      )
      expect(container.firstChild).toBeTruthy()

      // Re-render with same props should work
      rerender(<LocationMarker postCount={5} latestPostAt={new Date()} />)
      expect(container.firstChild).toBeTruthy()
    })
  })
})

// ============================================================================
// Integration Scenario Tests
// ============================================================================

describe('LocationMarker Integration Scenarios', () => {
  describe('typical use cases', () => {
    it('should display correctly for a brand new location', () => {
      const { container } = render(
        <LocationMarker postCount={0} latestPostAt={null} size="medium" />
      )
      expect(container.firstChild).toBeTruthy()
      expect(screen.queryByText('0')).toBeNull() // No badge for virgin
    })

    it('should display correctly for a busy location', () => {
      render(
        <LocationMarker postCount={50} latestPostAt={new Date()} size="medium" />
      )
      expect(screen.getByText('50')).toBeTruthy()
    })

    it('should display correctly for a super popular location', () => {
      render(
        <LocationMarker postCount={500} latestPostAt={new Date()} size="large" />
      )
      expect(screen.getByText('99+')).toBeTruthy()
    })

    it('should display correctly for an old but active location', () => {
      const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)
      const { container } = render(
        <LocationMarker postCount={100} latestPostAt={twoWeeksAgo} size="medium" />
      )
      expect(container.firstChild).toBeTruthy()
      // Historical locations don't show badge
      expect(screen.queryByText('99+')).toBeNull()
    })
  })
})
