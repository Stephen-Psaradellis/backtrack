/**
 * Tests for components/events/EventCard.tsx
 *
 * Tests the EventCard component and its variants.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'

// Mock date-helpers
vi.mock('../../../utils/date-helpers', () => ({
  formatEventTime: vi.fn((date: string) => '7:00 PM'),
  formatEventDateRange: vi.fn((start: string, end?: string) => {
    if (end) {
      return 'Jan 15, 2024, 7:00 PM - 10:00 PM'
    }
    return 'Jan 15, 2024, 7:00 PM'
  }),
  isEventPast: vi.fn((date: string) => {
    // Simple mock: dates before 2024 are past
    return new Date(date) < new Date('2024-01-01')
  }),
  getEventStatus: vi.fn((event: { start: { utc: string }; end?: { utc: string } }) => {
    const start = new Date(event.start.utc)
    const end = event.end ? new Date(event.end.utc) : null
    const now = new Date()

    if (end && now > end) return 'ended'
    if (now >= start && (!end || now <= end)) return 'ongoing'
    return 'upcoming'
  }),
}))

import {
  EventCard,
  CompactEventCard,
  FeaturedEventCard,
  EventCardListItem,
  createEventCardRenderer,
} from '../EventCard'
import type { Event } from '../../../hooks/useEvents'

// Helper to create mock event
function createMockEvent(overrides: Partial<Event> = {}): Event {
  return {
    id: 'event-123',
    title: 'Tech Meetup',
    description: 'A meetup for tech enthusiasts',
    date_time: '2024-01-15T19:00:00Z',
    end_time: '2024-01-15T22:00:00Z',
    venue_name: 'Tech Hub',
    venue_address: '123 Main Street, San Francisco, CA 94102',
    venue_latitude: 37.7749,
    venue_longitude: -122.4194,
    platform: 'meetup',
    source_url: 'https://meetup.com/event-123',
    image_url: 'https://example.com/image.jpg',
    category: 'technology',
    post_count: 5,
    ...overrides,
  }
}

describe('EventCard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('rendering', () => {
    it('should render event title', () => {
      const event = createMockEvent()
      render(<EventCard event={event} />)

      expect(screen.getByTestId('event-card-title')).toHaveTextContent('Tech Meetup')
    })

    it('should render platform badge', () => {
      const event = createMockEvent()
      render(<EventCard event={event} />)

      expect(screen.getByTestId('event-card-platform')).toHaveTextContent('Meetup')
    })

    it('should render Eventbrite platform', () => {
      const event = createMockEvent({ platform: 'eventbrite' })
      render(<EventCard event={event} />)

      expect(screen.getByTestId('event-card-platform')).toHaveTextContent('Eventbrite')
    })

    it('should render formatted date/time', () => {
      const event = createMockEvent()
      render(<EventCard event={event} />)

      expect(screen.getByTestId('event-card-datetime')).toBeInTheDocument()
    })

    it('should render venue name', () => {
      const event = createMockEvent()
      render(<EventCard event={event} />)

      expect(screen.getByTestId('event-card-venue-name')).toHaveTextContent('Tech Hub')
    })

    it('should render venue address in full mode', () => {
      const event = createMockEvent()
      render(<EventCard event={event} />)

      expect(screen.getByTestId('event-card-venue-address')).toBeInTheDocument()
    })

    it('should not render venue when not provided', () => {
      const event = createMockEvent({ venue_name: undefined, venue_address: undefined })
      render(<EventCard event={event} />)

      expect(screen.queryByTestId('event-card-venue-name')).not.toBeInTheDocument()
    })

    it('should render post count when available', () => {
      const event = createMockEvent({ post_count: 5 })
      render(<EventCard event={event} />)

      expect(screen.getByTestId('event-card-post-count')).toHaveTextContent('5 posts')
    })

    it('should render singular "post" when count is 1', () => {
      const event = createMockEvent({ post_count: 1 })
      render(<EventCard event={event} />)

      expect(screen.getByTestId('event-card-post-count')).toHaveTextContent('1 post')
    })

    it('should not render post count when zero', () => {
      const event = createMockEvent({ post_count: 0 })
      render(<EventCard event={event} />)

      expect(screen.queryByTestId('event-card-post-count')).not.toBeInTheDocument()
    })

    it('should not render post count when undefined', () => {
      const event = createMockEvent({ post_count: undefined })
      render(<EventCard event={event} />)

      expect(screen.queryByTestId('event-card-post-count')).not.toBeInTheDocument()
    })

    it('should render image when available', () => {
      const event = createMockEvent()
      render(<EventCard event={event} />)

      expect(screen.getByTestId('event-card-image')).toBeInTheDocument()
    })

    it('should not render image when not available', () => {
      const event = createMockEvent({ image_url: undefined })
      render(<EventCard event={event} />)

      expect(screen.queryByTestId('event-card-image')).not.toBeInTheDocument()
    })

    it('should render category when available', () => {
      const event = createMockEvent()
      render(<EventCard event={event} />)

      expect(screen.getByTestId('event-card-category')).toHaveTextContent('technology')
    })

    it('should not render category when not available', () => {
      const event = createMockEvent({ category: undefined })
      render(<EventCard event={event} />)

      expect(screen.queryByTestId('event-card-category')).not.toBeInTheDocument()
    })
  })

  describe('compact mode', () => {
    it('should not render image in compact mode', () => {
      const event = createMockEvent()
      render(<EventCard event={event} compact />)

      expect(screen.queryByTestId('event-card-image')).not.toBeInTheDocument()
    })

    it('should not render category in compact mode', () => {
      const event = createMockEvent()
      render(<EventCard event={event} compact />)

      expect(screen.queryByTestId('event-card-category')).not.toBeInTheDocument()
    })

    it('should not render venue address in compact mode', () => {
      const event = createMockEvent()
      render(<EventCard event={event} compact />)

      expect(screen.queryByTestId('event-card-venue-address')).not.toBeInTheDocument()
    })
  })

  describe('interactions', () => {
    it('should call onPress when clicked', () => {
      const onPress = vi.fn()
      const event = createMockEvent()
      render(<EventCard event={event} onPress={onPress} />)

      fireEvent.click(screen.getByTestId('event-card'))

      expect(onPress).toHaveBeenCalledWith(event)
    })

    it('should not call onPress when not provided', () => {
      const event = createMockEvent()
      render(<EventCard event={event} />)

      // Should not throw when clicking
      fireEvent.click(screen.getByTestId('event-card'))
    })

    it('should handle Enter key press', () => {
      const onPress = vi.fn()
      const event = createMockEvent()
      render(<EventCard event={event} onPress={onPress} />)

      fireEvent.keyDown(screen.getByTestId('event-card'), { key: 'Enter' })

      expect(onPress).toHaveBeenCalledWith(event)
    })

    it('should handle Space key press', () => {
      const onPress = vi.fn()
      const event = createMockEvent()
      render(<EventCard event={event} onPress={onPress} />)

      fireEvent.keyDown(screen.getByTestId('event-card'), { key: ' ' })

      expect(onPress).toHaveBeenCalledWith(event)
    })

    it('should not handle other key presses', () => {
      const onPress = vi.fn()
      const event = createMockEvent()
      render(<EventCard event={event} onPress={onPress} />)

      fireEvent.keyDown(screen.getByTestId('event-card'), { key: 'Escape' })

      expect(onPress).not.toHaveBeenCalled()
    })

    it('should have button role when onPress provided', () => {
      const event = createMockEvent()
      render(<EventCard event={event} onPress={() => {}} />)

      expect(screen.getByTestId('event-card')).toHaveAttribute('role', 'button')
    })

    it('should not have button role when no onPress', () => {
      const event = createMockEvent()
      render(<EventCard event={event} />)

      expect(screen.getByTestId('event-card')).not.toHaveAttribute('role')
    })
  })

  describe('title truncation', () => {
    it('should truncate long titles', () => {
      const longTitle = 'This is a very long event title that should definitely be truncated because it exceeds the maximum character limit'
      const event = createMockEvent({ title: longTitle })
      render(<EventCard event={event} />)

      const title = screen.getByTestId('event-card-title').textContent
      expect(title?.length).toBeLessThan(longTitle.length)
      expect(title).toContain('...')
    })

    it('should not truncate short titles', () => {
      const shortTitle = 'Short Title'
      const event = createMockEvent({ title: shortTitle })
      render(<EventCard event={event} />)

      expect(screen.getByTestId('event-card-title')).toHaveTextContent(shortTitle)
    })
  })

  describe('showPostCount option', () => {
    it('should hide post count when showPostCount is false', () => {
      const event = createMockEvent({ post_count: 5 })
      render(<EventCard event={event} showPostCount={false} />)

      expect(screen.queryByTestId('event-card-post-count')).not.toBeInTheDocument()
    })
  })

  describe('className', () => {
    it('should apply custom className', () => {
      const event = createMockEvent()
      render(<EventCard event={event} className="custom-class" />)

      expect(screen.getByTestId('event-card')).toHaveClass('custom-class')
    })
  })

  describe('testID', () => {
    it('should use custom testID', () => {
      const event = createMockEvent()
      render(<EventCard event={event} testID="custom-test-id" />)

      expect(screen.getByTestId('custom-test-id')).toBeInTheDocument()
    })
  })

  describe('aria-label', () => {
    it('should have descriptive aria-label', () => {
      const event = createMockEvent()
      render(<EventCard event={event} onPress={() => {}} />)

      const card = screen.getByTestId('event-card')
      expect(card).toHaveAttribute('aria-label')
      expect(card.getAttribute('aria-label')).toContain('Tech Meetup')
    })
  })
})

describe('CompactEventCard', () => {
  it('should render in compact mode', () => {
    const event = createMockEvent()
    render(<CompactEventCard event={event} />)

    // Compact mode doesn't show image
    expect(screen.queryByTestId('event-card-compact-image')).not.toBeInTheDocument()
  })

  it('should use default testID', () => {
    const event = createMockEvent()
    render(<CompactEventCard event={event} />)

    expect(screen.getByTestId('event-card-compact')).toBeInTheDocument()
  })

  it('should allow custom testID', () => {
    const event = createMockEvent()
    render(<CompactEventCard event={event} testID="custom-compact" />)

    expect(screen.getByTestId('custom-compact')).toBeInTheDocument()
  })
})

describe('FeaturedEventCard', () => {
  it('should render with featured styling', () => {
    const event = createMockEvent()
    render(<FeaturedEventCard event={event} />)

    const card = screen.getByTestId('event-card-featured')
    expect(card).toHaveClass('ring-2')
    expect(card).toHaveClass('ring-primary-500')
  })

  it('should allow custom className', () => {
    const event = createMockEvent()
    render(<FeaturedEventCard event={event} className="extra-class" />)

    expect(screen.getByTestId('event-card-featured')).toHaveClass('extra-class')
  })
})

describe('EventCardListItem', () => {
  it('should render event card', () => {
    const event = createMockEvent()
    render(<EventCardListItem event={event} />)

    expect(screen.getByTestId('event-card')).toBeInTheDocument()
  })

  it('should include index in testID', () => {
    const event = createMockEvent()
    render(<EventCardListItem event={event} index={5} testID="list-item" />)

    expect(screen.getByTestId('list-item-5')).toBeInTheDocument()
  })

  it('should show separator by default', () => {
    const event = createMockEvent()
    const { container } = render(<EventCardListItem event={event} />)

    // Look for separator div with border class
    const separator = container.querySelector('.bg-gray-200')
    expect(separator).toBeInTheDocument()
  })

  it('should hide separator when showSeparator is false', () => {
    const event = createMockEvent()
    const { container } = render(<EventCardListItem event={event} showSeparator={false} />)

    // No separator div
    const separator = container.querySelector('.h-px.bg-gray-200')
    expect(separator).not.toBeInTheDocument()
  })
})

describe('createEventCardRenderer', () => {
  it('should create a render function', () => {
    const onPress = vi.fn()
    const renderItem = createEventCardRenderer(onPress)

    expect(typeof renderItem).toBe('function')
  })

  it('should render EventCardListItem', () => {
    const onPress = vi.fn()
    const renderItem = createEventCardRenderer(onPress)
    const event = createMockEvent()

    render(renderItem({ item: event, index: 0 }))

    expect(screen.getByTestId(`event-card-${event.id}`)).toBeInTheDocument()
  })

  it('should pass onPress to rendered cards', () => {
    const onPress = vi.fn()
    const renderItem = createEventCardRenderer(onPress)
    const event = createMockEvent()

    render(renderItem({ item: event, index: 0 }))

    // testID is dynamic based on event id
    fireEvent.click(screen.getByTestId(`event-card-${event.id}`))

    expect(onPress).toHaveBeenCalledWith(event)
  })

  it('should have displayName', () => {
    const renderItem = createEventCardRenderer(() => {})
    expect(renderItem.displayName).toBe('EventCardRenderer')
  })
})
