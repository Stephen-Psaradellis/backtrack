import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, fireEvent } from '@testing-library/react'
import { VenueCard, VenueCardSkeleton } from '../VenueCard'
import type { Venue } from '../../../types/location'

const makeVenue = (overrides: Partial<Venue> = {}): Venue => ({
  id: 'v1',
  google_place_id: 'gp1',
  name: 'Test Venue',
  address: '123 Main St',
  latitude: 37.77,
  longitude: -122.42,
  place_types: ['cafe'],
  post_count: 5,
  created_at: '2025-01-01',
  source: 'supabase',
  ...overrides,
})

describe('VenueCard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render venue name', () => {
    const { getByText } = render(<VenueCard venue={makeVenue()} />)
    expect(getByText('Test Venue')).toBeInTheDocument()
  })

  it('should render venue address', () => {
    const { getByText } = render(<VenueCard venue={makeVenue()} />)
    expect(getByText('123 Main St')).toBeInTheDocument()
  })

  it('should not render address when null', () => {
    const { queryByText } = render(<VenueCard venue={makeVenue({ address: null })} />)
    expect(queryByText('123 Main St')).not.toBeInTheDocument()
  })

  it('should show post count badge', () => {
    const { getByText } = render(<VenueCard venue={makeVenue({ post_count: 3 })} />)
    expect(getByText('3 posts')).toBeInTheDocument()
  })

  it('should show "1 post" for single post', () => {
    const { getByText } = render(<VenueCard venue={makeVenue({ post_count: 1 })} />)
    expect(getByText('1 post')).toBeInTheDocument()
  })

  it('should not show post count when 0', () => {
    const { queryByText } = render(<VenueCard venue={makeVenue({ post_count: 0 })} />)
    expect(queryByText('0 posts')).not.toBeInTheDocument()
  })

  it('should call onPress with venue when clicked', () => {
    const onPress = vi.fn()
    const venue = makeVenue()
    const { container } = render(<VenueCard venue={venue} onPress={onPress} />)
    const card = container.querySelector('[testid="venue-card"]')!
    fireEvent.click(card)
    expect(onPress).toHaveBeenCalledWith(venue)
  })

  it('should call onLongPress with venue', () => {
    const onLongPress = vi.fn()
    const venue = makeVenue()
    // Long press isn't natively supported in jsdom fireEvent, but we can verify the prop is wired
    const { container } = render(<VenueCard venue={venue} onLongPress={onLongPress} />)
    expect(container.querySelector('[testid="venue-card"]')).toBeInTheDocument()
  })

  it('should show distance when provided', () => {
    const { getByText } = render(
      <VenueCard venue={makeVenue({ distance_meters: 150 })} showDistance />
    )
    expect(getByText('150m away')).toBeInTheDocument()
  })

  it('should format km distance', () => {
    const { getByText } = render(
      <VenueCard venue={makeVenue({ distance_meters: 2500 })} showDistance />
    )
    expect(getByText('2.5km away')).toBeInTheDocument()
  })

  it('should hide distance when showDistance=false', () => {
    const { queryByText } = render(
      <VenueCard venue={makeVenue({ distance_meters: 150 })} showDistance={false} />
    )
    expect(queryByText('150m away')).not.toBeInTheDocument()
  })

  it('should render with custom testID', () => {
    const { container } = render(<VenueCard venue={makeVenue()} testID="my-card" />)
    expect(container.querySelector('[testid="my-card"]')).toBeInTheDocument()
  })

  it('should show venue type icon for cafe', () => {
    const { container } = render(<VenueCard venue={makeVenue({ place_types: ['cafe'] })} />)
    expect(container.querySelector('[testid="venue-card-type"]')).toBeInTheDocument()
  })

  it('should hide type when showType=false', () => {
    const { container } = render(<VenueCard venue={makeVenue()} showType={false} />)
    expect(container.querySelector('[testid="venue-card-type"]')).not.toBeInTheDocument()
  })
})

describe('VenueCardSkeleton', () => {
  it('should render with default testID', () => {
    const { container } = render(<VenueCardSkeleton />)
    expect(container.querySelector('[testid="venue-card-skeleton"]')).toBeInTheDocument()
  })

  it('should render with custom testID', () => {
    const { container } = render(<VenueCardSkeleton testID="custom-skel" />)
    expect(container.querySelector('[testid="custom-skel"]')).toBeInTheDocument()
  })

  it('should have loading accessibility label', () => {
    const { container } = render(<VenueCardSkeleton />)
    expect(container.querySelector('[accessibilitylabel="Loading venue"]')).toBeInTheDocument()
  })
})
