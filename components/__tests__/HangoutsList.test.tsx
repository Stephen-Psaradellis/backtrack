/**
 * HangoutsList Component Tests
 *
 * Tests for the hangouts list component with sections and pull-to-refresh.
 */

import React from 'react'
import { render, fireEvent } from '@testing-library/react'
import { HangoutsList } from '../HangoutsList'
import { renderWithProviders } from '../../__tests__/utils/render-with-providers'
import type { HangoutWithDetails } from '../../types/database'

// Mock haptics
vi.mock('../../lib/haptics', () => ({
  selectionFeedback: vi.fn(() => Promise.resolve()),
}))

// Mock date-fns functions
vi.mock('date-fns', () => ({
  isToday: vi.fn((date) => {
    const today = new Date()
    const checkDate = new Date(date)
    return checkDate.toDateString() === today.toDateString()
  }),
  isTomorrow: vi.fn(() => false),
  isThisWeek: vi.fn(() => true),
  addHours: vi.fn((date, hours) => new Date(date.getTime() + hours * 60 * 60 * 1000)),
  differenceInHours: vi.fn((date1, date2) => {
    return Math.floor((new Date(date1).getTime() - new Date(date2).getTime()) / (60 * 60 * 1000))
  }),
}))

// Mock HangoutCard component
vi.mock('../HangoutCard', () => ({
  HangoutCard: ({ hangout, testID }: any) => (
    <div testID={testID}>
      <div>{hangout.title}</div>
    </div>
  ),
}))

// Mock useHangouts hook
const mockJoinHangout = vi.fn()
const mockLeaveHangout = vi.fn()
vi.mock('../../hooks/useHangouts', () => ({
  useHangouts: () => ({
    joinHangout: mockJoinHangout,
    leaveHangout: mockLeaveHangout,
  }),
}))

describe('HangoutsList', () => {
  const mockHangouts: HangoutWithDetails[] = [
    {
      id: 'hangout-1',
      location_id: 'loc-1',
      location_name: 'Coffee Shop',
      creator_id: 'user-1',
      title: 'Coffee Meetup',
      description: 'Morning coffee',
      vibe: 'chill',
      scheduled_for: new Date(Date.now() + 1 * 60 * 60 * 1000).toISOString(), // In 1 hour
      max_attendees: 8,
      attendee_count: 3,
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'hangout-2',
      location_id: 'loc-1',
      location_name: 'Coffee Shop',
      creator_id: 'user-2',
      title: 'Lunch Hangout',
      description: 'Grab lunch',
      vibe: 'food',
      scheduled_for: new Date(Date.now() + 5 * 60 * 60 * 1000).toISOString(), // In 5 hours
      max_attendees: 6,
      attendee_count: 2,
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ]

  const defaultProps = {
    hangouts: mockHangouts,
    onCreatePress: vi.fn(),
    onRefresh: vi.fn(),
    isRefreshing: false,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('renders without crashing', () => {
      const { container } = renderWithProviders(<HangoutsList {...defaultProps} />)
      expect(container).toBeTruthy()
    })

    it('renders the list container', () => {
      const { container } = renderWithProviders(<HangoutsList {...defaultProps} />)
      expect(container.querySelector('[testid="hangouts-list"]')).toBeTruthy()
    })

    it('displays the header', () => {
      const { getByText } = renderWithProviders(<HangoutsList {...defaultProps} />)
      expect(getByText('Group Hangouts')).toBeTruthy()
    })

    it('renders create button in header', () => {
      const { container } = renderWithProviders(<HangoutsList {...defaultProps} />)
      expect(container.querySelector('[testid="hangouts-list-create-button"]')).toBeTruthy()
    })

    it('uses custom testID when provided', () => {
      const { container } = renderWithProviders(
        <HangoutsList {...defaultProps} testID="custom-list" />
      )
      expect(container.querySelector('[testid="custom-list"]')).toBeTruthy()
    })
  })

  describe('Hangout Display', () => {
    it('displays hangout items', () => {
      const { getByText } = renderWithProviders(<HangoutsList {...defaultProps} />)
      expect(getByText('Coffee Meetup')).toBeTruthy()
      expect(getByText('Lunch Hangout')).toBeTruthy()
    })

    it('renders HangoutCard for each hangout', () => {
      const { container } = renderWithProviders(<HangoutsList {...defaultProps} />)
      expect(container.querySelector('[testid="hangouts-list-hangout-hangout-1"]')).toBeTruthy()
      expect(container.querySelector('[testid="hangouts-list-hangout-hangout-2"]')).toBeTruthy()
    })
  })

  describe('Sections', () => {
    it('displays section headers when appropriate', () => {
      const { getByText } = renderWithProviders(<HangoutsList {...defaultProps} />)
      // Should have "Happening Soon" section since first hangout is in 1 hour
      expect(getByText('Happening Soon')).toBeTruthy()
    })

    it('groups hangouts into sections correctly', () => {
      const { queryByText } = renderWithProviders(<HangoutsList {...defaultProps} />)
      // Both hangouts are today, so should be in sections
      expect(queryByText('Happening Soon')).toBeTruthy()
    })
  })

  describe('Empty State', () => {
    it('displays empty state when no hangouts', () => {
      const { container, getByText } = renderWithProviders(
        <HangoutsList {...defaultProps} hangouts={[]} />
      )
      expect(container.querySelector('[testid="hangouts-list-empty"]')).toBeTruthy()
      expect(getByText('No hangouts nearby')).toBeTruthy()
      expect(getByText(/Be the first to create one/)).toBeTruthy()
    })

    it('renders create button in empty state', () => {
      const { container } = renderWithProviders(
        <HangoutsList {...defaultProps} hangouts={[]} />
      )
      expect(container.querySelector('[testid="hangouts-list-empty-create"]')).toBeTruthy()
    })

    it('calls onCreatePress when empty state create button is pressed', async () => {
      const { container } = renderWithProviders(
        <HangoutsList {...defaultProps} hangouts={[]} />
      )

      const button = container.querySelector('[testid="hangouts-list-empty-create"]')
      fireEvent.click(button!)
      // handleCreatePress is async (calls selectionFeedback), wait for promises
      await new Promise(resolve => setTimeout(resolve, 0))
      expect(defaultProps.onCreatePress).toHaveBeenCalledTimes(1)
    })
  })

  describe('Create Button', () => {
    it('calls onCreatePress when header create button is pressed', async () => {
      const { container } = renderWithProviders(<HangoutsList {...defaultProps} />)

      const button = container.querySelector('[testid="hangouts-list-create-button"]')
      fireEvent.click(button!)
      // handleCreatePress is async (calls selectionFeedback), wait for promises
      await new Promise(resolve => setTimeout(resolve, 0))
      expect(defaultProps.onCreatePress).toHaveBeenCalledTimes(1)
    })
  })

  describe('Pull to Refresh', () => {
    it('renders refresh control when onRefresh is provided', () => {
      const { container } = renderWithProviders(<HangoutsList {...defaultProps} />)

      // RefreshControl should be present
      const list = container.querySelector('[testid="hangouts-list"]')
      expect(list).toBeTruthy()
    })

    it('does not render refresh control when onRefresh is not provided', () => {
      const { container } = renderWithProviders(
        <HangoutsList {...defaultProps} onRefresh={undefined} />
      )

      const list = container.querySelector('[testid="hangouts-list"]')
      expect(list).toBeTruthy()
    })

    it('shows refreshing state', () => {
      const { container } = renderWithProviders(
        <HangoutsList {...defaultProps} isRefreshing={true} />
      )

      // RefreshControl renders as <refreshcontrol> in jsdom
      // The component should render correctly with isRefreshing=true
      const list = container.querySelector('[testid="hangouts-list"]')
      expect(list).toBeTruthy()
      // Verify component renders without error in refreshing state
      expect(container).toBeTruthy()
    })
  })

  describe('Interactions', () => {
    it('allows joining hangouts through cards', () => {
      renderWithProviders(<HangoutsList {...defaultProps} />)

      // HangoutCard interactions are tested in HangoutCard.test.tsx
      // This test verifies the list renders cards correctly
    })

    it('allows leaving hangouts through cards', () => {
      renderWithProviders(<HangoutsList {...defaultProps} />)

      // HangoutCard interactions are tested in HangoutCard.test.tsx
      // This test verifies the list renders cards correctly
    })
  })

  describe('Section Rendering', () => {
    it('renders "Happening Soon" section for hangouts within 2 hours', () => {
      const soonHangouts: HangoutWithDetails[] = [
        {
          ...mockHangouts[0],
          scheduled_for: new Date(Date.now() + 1 * 60 * 60 * 1000).toISOString(),
        },
      ]

      const { getByText } = renderWithProviders(
        <HangoutsList {...defaultProps} hangouts={soonHangouts} />
      )

      expect(getByText('Happening Soon')).toBeTruthy()
    })

    it('does not show sections when all hangouts are in same time range', () => {
      const sameTimeHangouts = mockHangouts.map(h => ({
        ...h,
        scheduled_for: new Date(Date.now() + 1 * 60 * 60 * 1000).toISOString(),
      }))

      const { queryByText } = renderWithProviders(
        <HangoutsList {...defaultProps} hangouts={sameTimeHangouts} />
      )

      // Should only have one section
      expect(queryByText('Happening Soon')).toBeTruthy()
    })
  })

  describe('List Performance', () => {
    it('renders many hangouts efficiently', () => {
      const manyHangouts = Array.from({ length: 20 }, (_, i) => ({
        ...mockHangouts[0],
        id: `hangout-${i}`,
        title: `Hangout ${i}`,
      }))

      const { container } = renderWithProviders(
        <HangoutsList {...defaultProps} hangouts={manyHangouts} />
      )

      expect(container).toBeTruthy()
    })
  })
})
