/**
 * HangoutCard Component Tests
 *
 * Tests for the hangout card display component.
 */

import React from 'react'
import { render, fireEvent } from '@testing-library/react'
import { HangoutCard } from '../HangoutCard'
import type { HangoutWithDetails } from '../../types/database'

// Mock haptics
vi.mock('../../lib/haptics', () => ({
  selectionFeedback: vi.fn(() => Promise.resolve()),
}))

// Mock PressableScale component
vi.mock('../native/PressableScale', () => ({
  PressableScale: ({ children, testID, onPress }: any) => (
    <div testID={testID} onClick={onPress}>
      {children}
    </div>
  ),
}))

// Mock date-fns functions
vi.mock('date-fns', () => ({
  formatDistanceToNow: vi.fn(() => 'in 2 hours'),
  format: vi.fn(() => '7:00 PM'),
  isTomorrow: vi.fn(() => false),
  isToday: vi.fn(() => true),
}))

describe('HangoutCard', () => {
  const mockHangout: HangoutWithDetails = {
    id: 'hangout-1',
    location_id: 'loc-1',
    location_name: 'Coffee Shop',
    creator_id: 'user-1',
    title: 'Coffee & Code',
    description: 'Let\'s work on projects together',
    vibe: 'chill',
    scheduled_for: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
    max_attendees: 8,
    attendee_count: 3,
    status: 'active',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  const defaultProps = {
    hangout: mockHangout,
    isAttending: false,
    onJoin: vi.fn(),
    onLeave: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('renders without crashing', () => {
      const { container } = render(<HangoutCard {...defaultProps} />)
      expect(container).toBeTruthy()
    })

    it('renders the card container', () => {
      const { container } = render(<HangoutCard {...defaultProps} />)
      expect(container.querySelector('[testid="hangout-card"]')).toBeTruthy()
    })

    it('displays the hangout title', () => {
      const { getByText } = render(<HangoutCard {...defaultProps} />)
      expect(getByText('Coffee & Code')).toBeTruthy()
    })

    it('displays the location name', () => {
      const { getByText } = render(<HangoutCard {...defaultProps} />)
      expect(getByText('Coffee Shop')).toBeTruthy()
    })

    it('displays the vibe emoji for chill', () => {
      const { getByText } = render(<HangoutCard {...defaultProps} />)
      expect(getByText('🧊')).toBeTruthy()
    })

    it('displays the vibe emoji for party', () => {
      const hangout = { ...mockHangout, vibe: 'party' as const }
      const { getByText } = render(<HangoutCard {...defaultProps} hangout={hangout} />)
      expect(getByText('🎉')).toBeTruthy()
    })

    it('displays the vibe emoji for adventure', () => {
      const hangout = { ...mockHangout, vibe: 'adventure' as const }
      const { getByText } = render(<HangoutCard {...defaultProps} hangout={hangout} />)
      expect(getByText('🏔️')).toBeTruthy()
    })

    it('displays the vibe emoji for food', () => {
      const hangout = { ...mockHangout, vibe: 'food' as const }
      const { getByText } = render(<HangoutCard {...defaultProps} hangout={hangout} />)
      expect(getByText('🍕')).toBeTruthy()
    })

    it('displays attendee count', () => {
      const { getByText } = render(<HangoutCard {...defaultProps} />)
      expect(getByText('3/8')).toBeTruthy()
    })

    it('displays action button', () => {
      const { container } = render(<HangoutCard {...defaultProps} />)
      expect(container.querySelector('[testid="hangout-card-action-button"]')).toBeTruthy()
    })

    it('uses custom testID when provided', () => {
      const { container } = render(
        <HangoutCard {...defaultProps} testID="custom-card" />
      )
      expect(container.querySelector('[testid="custom-card"]')).toBeTruthy()
    })
  })

  describe('Action Button States', () => {
    it('shows "Join" button when not attending', () => {
      const { getByText } = render(<HangoutCard {...defaultProps} isAttending={false} />)
      expect(getByText(/Join/)).toBeTruthy()
    })

    it('shows "Going" button when attending', () => {
      const { getByText } = render(<HangoutCard {...defaultProps} isAttending={true} />)
      expect(getByText('Going')).toBeTruthy()
    })

    it('shows spots remaining when less than 3 spots left', () => {
      const hangout = { ...mockHangout, attendee_count: 7, max_attendees: 8 }
      const { getByText } = render(<HangoutCard {...defaultProps} hangout={hangout} />)
      expect(getByText(/1 left/)).toBeTruthy()
    })

    it('shows "Full" when hangout is full', () => {
      const hangout = { ...mockHangout, attendee_count: 8, max_attendees: 8 }
      const { getAllByText } = render(<HangoutCard {...defaultProps} hangout={hangout} />)
      expect(getAllByText('Full').length).toBeGreaterThan(0)
    })

    it('shows "Full" when status is full', () => {
      const hangout = { ...mockHangout, status: 'full' as const }
      const { getAllByText } = render(<HangoutCard {...defaultProps} hangout={hangout} />)
      expect(getAllByText('Full').length).toBeGreaterThan(0)
    })
  })

  describe('Full Badge', () => {
    it('shows full badge when hangout is full', () => {
      const hangout = { ...mockHangout, attendee_count: 8, max_attendees: 8 }
      const { getAllByText } = render(<HangoutCard {...defaultProps} hangout={hangout} />)
      expect(getAllByText('Full').length).toBeGreaterThan(0)
    })

    it('does not show full badge when not full', () => {
      const { queryAllByText } = render(<HangoutCard {...defaultProps} />)
      const badges = queryAllByText('Full')
      // The non-full hangout should NOT have Full text anywhere
      expect(badges.length).toBe(0)
    })
  })

  describe('Interactions', () => {
    it('calls onJoin when join button is pressed and not attending', async () => {
      const { container } = render(<HangoutCard {...defaultProps} isAttending={false} />)

      const button = container.querySelector('[testid="hangout-card-action-button"]')
      fireEvent.click(button!)
      // handleActionPress is async, wait for promises to resolve
      await new Promise(resolve => setTimeout(resolve, 0))
      expect(defaultProps.onJoin).toHaveBeenCalledTimes(1)
      expect(defaultProps.onLeave).not.toHaveBeenCalled()
    })

    it('calls onLeave when button is pressed and attending', async () => {
      const { container } = render(<HangoutCard {...defaultProps} isAttending={true} />)

      const button = container.querySelector('[testid="hangout-card-action-button"]')
      fireEvent.click(button!)
      // handleActionPress is async, wait for promises to resolve
      await new Promise(resolve => setTimeout(resolve, 0))
      expect(defaultProps.onLeave).toHaveBeenCalledTimes(1)
      expect(defaultProps.onJoin).not.toHaveBeenCalled()
    })

    it('disables button when hangout is full and not attending', () => {
      const hangout = { ...mockHangout, attendee_count: 8, max_attendees: 8 }
      const { container } = render(
        <HangoutCard {...defaultProps} hangout={hangout} isAttending={false} />
      )

      const button = container.querySelector('[testid="hangout-card-action-button"]')
      // When disabled, our mock doesn't attach onClick, check button exists
      expect(button).toBeTruthy()
      expect(button?.hasAttribute('disabled')).toBe(true)
    })

    it('does not disable button when full but user is attending', () => {
      const hangout = { ...mockHangout, attendee_count: 8, max_attendees: 8 }
      const { container } = render(
        <HangoutCard {...defaultProps} hangout={hangout} isAttending={true} />
      )

      const button = container.querySelector('[testid="hangout-card-action-button"]')
      expect(button).toBeTruthy()
      expect(button?.hasAttribute('disabled')).toBe(false)
    })
  })

  describe('Time Display', () => {
    it('displays formatted time', () => {
      const { getByText } = render(<HangoutCard {...defaultProps} />)
      // Using mocked formatDistanceToNow
      expect(getByText('in 2 hours')).toBeTruthy()
    })
  })

  describe('Different Vibes', () => {
    const vibes: Array<{ vibe: any; emoji: string }> = [
      { vibe: 'chill', emoji: '🧊' },
      { vibe: 'party', emoji: '🎉' },
      { vibe: 'adventure', emoji: '🏔️' },
      { vibe: 'food', emoji: '🍕' },
      { vibe: 'creative', emoji: '🎨' },
      { vibe: 'active', emoji: '⚡' },
    ]

    vibes.forEach(({ vibe, emoji }) => {
      it(`displays correct emoji for ${vibe} vibe`, () => {
        const hangout = { ...mockHangout, vibe }
        const { getByText } = render(<HangoutCard {...defaultProps} hangout={hangout} />)
        expect(getByText(emoji)).toBeTruthy()
      })
    })

    it('displays default emoji when vibe is null', () => {
      const hangout = { ...mockHangout, vibe: null }
      const { getByText } = render(<HangoutCard {...defaultProps} hangout={hangout} />)
      expect(getByText('📍')).toBeTruthy()
    })
  })

  describe('Attendee Count Display', () => {
    it('displays correct attendee ratio', () => {
      const { getByText } = render(<HangoutCard {...defaultProps} />)
      expect(getByText('3/8')).toBeTruthy()
    })

    it('updates when attendee count changes', () => {
      const hangout = { ...mockHangout, attendee_count: 5 }
      const { getByText } = render(<HangoutCard {...defaultProps} hangout={hangout} />)
      expect(getByText('5/8')).toBeTruthy()
    })
  })
})
