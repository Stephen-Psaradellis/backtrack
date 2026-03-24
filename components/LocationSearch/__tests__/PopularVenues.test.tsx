import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render } from '@testing-library/react'

vi.mock('../../../lib/supabase', () => ({
  supabase: {},
}))

const mockFetchPopularVenues = vi.fn()
vi.mock('../../../services/locationService', () => ({
  fetchPopularVenues: (...args: unknown[]) => mockFetchPopularVenues(...args),
}))

vi.mock('../../../types/location', () => ({
  LOCATION_CONSTANTS: {
    DEFAULT_POPULAR_VENUES_COUNT: 10,
    DEFAULT_RADIUS_METERS: 5000,
  },
  VENUE_TYPE_FILTERS: [],
}))

vi.mock('../VenueCard', () => ({
  VenueCard: (props: any) => React.createElement('div', { 'data-testid': props.testID }, props.venue?.name),
  VenueCardSkeleton: (props: any) => React.createElement('div', { 'data-testid': props.testID }, 'skeleton'),
}))

describe('PopularVenues', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  async function renderComponent(props = {}) {
    const { PopularVenues } = await import('../PopularVenues')
    return render(
      <PopularVenues
        latitude={37.7749}
        longitude={-122.4194}
        {...props}
      />
    )
  }

  it('should render skeleton while loading', async () => {
    mockFetchPopularVenues.mockReturnValue(new Promise(() => {})) // never resolves
    const { container } = await renderComponent()
    expect(container.querySelector('[testid="popular-venues-skeleton"]')).toBeInTheDocument()
  })

  it('should render with default testID', async () => {
    mockFetchPopularVenues.mockReturnValue(new Promise(() => {}))
    const { container } = await renderComponent()
    expect(container.querySelector('[testid="popular-venues"]')).toBeInTheDocument()
  })

  it('should show header by default', async () => {
    mockFetchPopularVenues.mockReturnValue(new Promise(() => {}))
    const { getByText } = await renderComponent()
    expect(getByText('Popular Venues')).toBeInTheDocument()
  })

  it('should show custom header title', async () => {
    mockFetchPopularVenues.mockReturnValue(new Promise(() => {}))
    const { getByText } = await renderComponent({ headerTitle: 'Hot Spots' })
    expect(getByText('Hot Spots')).toBeInTheDocument()
  })

  it('should hide header when showHeader=false', async () => {
    mockFetchPopularVenues.mockReturnValue(new Promise(() => {}))
    const { queryByText } = await renderComponent({ showHeader: false })
    expect(queryByText('Popular Venues')).not.toBeInTheDocument()
  })

  it('should show error state on fetch failure', async () => {
    mockFetchPopularVenues.mockResolvedValue({
      success: false,
      error: { message: 'Network error' },
      venues: [],
    })
    const { findByText } = await renderComponent()
    expect(await findByText('Unable to Load')).toBeInTheDocument()
    expect(await findByText('Network error')).toBeInTheDocument()
  })

  it('should show empty state when no venues', async () => {
    mockFetchPopularVenues.mockResolvedValue({
      success: true,
      venues: [],
    })
    const { findByText } = await renderComponent()
    expect(await findByText('No Popular Venues')).toBeInTheDocument()
  })

  it('should render venue cards when data loads', async () => {
    mockFetchPopularVenues.mockResolvedValue({
      success: true,
      venues: [
        {
          id: 'v1',
          google_place_id: 'gp1',
          name: 'Cool Bar',
          address: '123 Main St',
          latitude: 37.77,
          longitude: -122.42,
          place_types: ['bar'],
          post_count: 5,
          created_at: '2025-01-01',
        },
      ],
    })
    const { findByText } = await renderComponent()
    expect(await findByText('Cool Bar')).toBeInTheDocument()
  })
})
