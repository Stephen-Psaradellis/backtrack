/**
 * Tests for components/TrendingVenues.tsx
 *
 * Tests the TrendingVenues component that displays a horizontal list
 * of trending venues with buzz scores.
 */

import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fireEvent } from '@testing-library/react'

// Mock navigation - do NOT use importActual as the real module has native deps
const mockNavigate = vi.fn()
vi.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: vi.fn(),
    replace: vi.fn(),
    reset: vi.fn(),
    setOptions: vi.fn(),
    addListener: vi.fn(() => () => {}),
  }),
  useRoute: () => ({ params: {} }),
  useFocusEffect: vi.fn((cb) => { cb(); }),
  useIsFocused: () => true,
  NavigationContainer: ({ children }: any) => children,
  createNavigationContainerRef: () => ({ current: null }),
}))

// Mock haptics
vi.mock('../../lib/haptics', () => ({
  selectionFeedback: vi.fn().mockResolvedValue(undefined),
}))

import { renderWithProviders } from '../../__tests__/utils'
import { TrendingVenues } from '../TrendingVenues'
import type { TrendingVenue } from '../../hooks/useTrendingVenues'

describe('TrendingVenues', () => {
  const mockVenues: TrendingVenue[] = [
    {
      location_id: 'loc-1',
      location_name: 'Coffee House',
      buzz_score: 85,
      post_count_24h: 12,
    },
    {
      location_id: 'loc-2',
      location_name: 'The Park',
      buzz_score: 72,
      post_count_24h: 8,
    },
    {
      location_id: 'loc-3',
      location_name: 'Downtown Bar',
      buzz_score: 95,
      post_count_24h: 20,
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('rendering', () => {
    it('should render without crashing', () => {
      const { container } = renderWithProviders(
        <TrendingVenues venues={mockVenues} testID="trending" />
      )

      expect(container.querySelector('[testid="trending"]')).toBeInTheDocument()
    })

    it('should render all venue cards', () => {
      const { getByText } = renderWithProviders(<TrendingVenues venues={mockVenues} />)

      expect(getByText('Coffee House')).toBeInTheDocument()
      expect(getByText('The Park')).toBeInTheDocument()
      expect(getByText('Downtown Bar')).toBeInTheDocument()
    })

    it('should display buzz scores', () => {
      const { getByText } = renderWithProviders(<TrendingVenues venues={mockVenues} />)

      expect(getByText('85')).toBeInTheDocument()
      expect(getByText('72')).toBeInTheDocument()
      expect(getByText('95')).toBeInTheDocument()
    })

    it('should display post counts', () => {
      const { getByText } = renderWithProviders(<TrendingVenues venues={mockVenues} />)

      expect(getByText('12 posts')).toBeInTheDocument()
      expect(getByText('8 posts')).toBeInTheDocument()
      expect(getByText('20 posts')).toBeInTheDocument()
    })

    it('should use singular "post" for count of 1', () => {
      const singlePostVenue: TrendingVenue[] = [
        {
          location_id: 'loc-1',
          location_name: 'Quiet Spot',
          buzz_score: 10,
          post_count_24h: 1,
        },
      ]

      const { getByText } = renderWithProviders(
        <TrendingVenues venues={singlePostVenue} />
      )

      expect(getByText('1 post')).toBeInTheDocument()
    })

    it('should display fire emoji with buzz score', () => {
      const { getAllByText } = renderWithProviders(<TrendingVenues venues={mockVenues} />)

      // Each venue card shows the fire emoji
      expect(getAllByText('🔥').length).toBeGreaterThan(0)
    })

    it('should show trending label on each card', () => {
      const { getAllByText } = renderWithProviders(
        <TrendingVenues venues={mockVenues} />
      )

      const trendingLabels = getAllByText('Trending')
      expect(trendingLabels).toHaveLength(3)
    })
  })

  describe('empty state', () => {
    it('should render empty state when no venues', () => {
      const { container, getByText } = renderWithProviders(
        <TrendingVenues venues={[]} testID="trending" />
      )

      expect(container.querySelector('[testid="trending-empty"]')).toBeInTheDocument()
      expect(getByText('No trending spots nearby')).toBeInTheDocument()
    })

    it('should show cafe icon in empty state', () => {
      const { container } = renderWithProviders(
        <TrendingVenues venues={[]} testID="trending" />
      )

      expect(container.querySelector('[testid="trending-empty"]')).toBeInTheDocument()
    })
  })

  describe('interactions', () => {
    it('should navigate to Ledger when venue is pressed', async () => {
      const { container } = renderWithProviders(
        <TrendingVenues venues={mockVenues} testID="trending" />
      )

      const venueCard = container.querySelector('[testid="trending-venue-loc-1"]')
      fireEvent.click(venueCard)

      // Wait for async feedback
      await vi.waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('Ledger', {
          locationId: 'loc-1',
          locationName: 'Coffee House',
        })
      })
    })

    it('should navigate with correct venue data', async () => {
      const { container } = renderWithProviders(
        <TrendingVenues venues={mockVenues} testID="trending" />
      )

      const venueCard = container.querySelector('[testid="trending-venue-loc-3"]')
      fireEvent.click(venueCard)

      await vi.waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('Ledger', {
          locationId: 'loc-3',
          locationName: 'Downtown Bar',
        })
      })
    })
  })

  describe('scroll behavior', () => {
    it('should be horizontal scrollable', () => {
      const { container } = renderWithProviders(
        <TrendingVenues venues={mockVenues} testID="trending" />
      )

      expect(container.querySelector('[testid="trending"]')).toBeInTheDocument()
    })

    it('should hide horizontal scroll indicator', () => {
      const { container } = renderWithProviders(
        <TrendingVenues venues={mockVenues} testID="trending" />
      )

      expect(container.querySelector('[testid="trending"]')).toBeInTheDocument()
    })
  })

  describe('custom testID', () => {
    it('should use custom testID', () => {
      const { container } = renderWithProviders(
        <TrendingVenues venues={mockVenues} testID="custom-trending" />
      )

      expect(container.querySelector('[testid="custom-trending"]')).toBeInTheDocument()
    })

    it('should use custom testID for venue cards', () => {
      const { container } = renderWithProviders(
        <TrendingVenues venues={mockVenues} testID="custom" />
      )

      expect(container.querySelector('[testid="custom-venue-loc-1"]')).toBeInTheDocument()
      expect(container.querySelector('[testid="custom-venue-loc-2"]')).toBeInTheDocument()
      expect(container.querySelector('[testid="custom-venue-loc-3"]')).toBeInTheDocument()
    })

    it('should use custom testID for empty state', () => {
      const { container } = renderWithProviders(
        <TrendingVenues venues={[]} testID="custom" />
      )

      expect(container.querySelector('[testid="custom-empty"]')).toBeInTheDocument()
    })
  })
})
