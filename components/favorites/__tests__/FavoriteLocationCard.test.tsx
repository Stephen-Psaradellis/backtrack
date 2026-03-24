import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, fireEvent } from '@testing-library/react'
import { FavoriteLocationCard, formatDistance, truncateAddress } from '../FavoriteLocationCard'
import type { FavoriteLocationWithDistance } from '../../../hooks/useFavoriteLocations'

vi.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: vi.fn(),
  }),
}))

vi.mock('../../../lib/haptics', () => ({
  selectionFeedback: vi.fn(),
  mediumFeedback: vi.fn(),
  lightFeedback: vi.fn(),
  warningFeedback: vi.fn(),
}))

function createFavorite(overrides: Partial<FavoriteLocationWithDistance> = {}): FavoriteLocationWithDistance {
  return {
    id: 'fav-1',
    user_id: 'user-1',
    custom_name: 'My Coffee Shop',
    place_name: 'Starbucks Reserve',
    latitude: 40.7128,
    longitude: -74.006,
    address: '123 Main Street, New York, NY 10001',
    place_id: 'ChIJ123',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    distance_meters: 500,
    ...overrides,
  }
}

// Helper to query by RN testID attribute
function queryByTestID(container: HTMLElement, testId: string) {
  return container.querySelector(`[testid="${testId}"]`)
}

describe('FavoriteLocationCard', () => {
  describe('formatDistance', () => {
    it('returns null for null input', () => {
      expect(formatDistance(null)).toBeNull()
    })

    it('formats meters under 1000', () => {
      expect(formatDistance(500)).toBe('500 m')
    })

    it('formats km under 10 with one decimal', () => {
      expect(formatDistance(2500)).toBe('2.5 km')
    })

    it('formats km >= 10 as integer', () => {
      expect(formatDistance(15000)).toBe('15 km')
    })
  })

  describe('truncateAddress', () => {
    it('returns placeholder for null address', () => {
      expect(truncateAddress(null, 50)).toBe('Address unavailable')
    })

    it('returns short address as-is', () => {
      expect(truncateAddress('123 Main St', 50)).toBe('123 Main St')
    })

    it('truncates long address with ellipsis', () => {
      const long = 'A very long address that is definitely going to be longer than fifty characters total'
      const result = truncateAddress(long, 50)
      expect(result.length).toBeLessThanOrEqual(53)
      expect(result).toContain('...')
    })
  })

  describe('rendering', () => {
    it('renders custom name and place name', () => {
      const fav = createFavorite()
      const { getByText } = render(<FavoriteLocationCard favorite={fav} />)

      expect(getByText('My Coffee Shop')).toBeInTheDocument()
      expect(getByText('Starbucks Reserve')).toBeInTheDocument()
    })

    it('shows distance badge when distance is available', () => {
      const fav = createFavorite({ distance_meters: 500 })
      const { getByText } = render(<FavoriteLocationCard favorite={fav} />)

      expect(getByText('500 m')).toBeInTheDocument()
    })

    it('does not show distance badge when distance is null', () => {
      const fav = createFavorite({ distance_meters: null })
      const { container } = render(<FavoriteLocationCard favorite={fav} />)

      expect(queryByTestID(container, 'favorite-location-card-distance')).toBeNull()
    })

    it('shows address by default', () => {
      const fav = createFavorite({ address: '123 Main Street' })
      const { getByText } = render(<FavoriteLocationCard favorite={fav} />)

      expect(getByText('123 Main Street')).toBeInTheDocument()
    })

    it('hides address when showAddress is false', () => {
      const fav = createFavorite()
      const { container } = render(<FavoriteLocationCard favorite={fav} showAddress={false} />)

      expect(queryByTestID(container, 'favorite-location-card-address')).toBeNull()
    })

    it('shows selection indicator when selected', () => {
      const fav = createFavorite()
      const { container } = render(<FavoriteLocationCard favorite={fav} selected={true} />)

      expect(queryByTestID(container, 'favorite-location-card-selected')).not.toBeNull()
    })

    it('does not show selection indicator when not selected', () => {
      const fav = createFavorite()
      const { container } = render(<FavoriteLocationCard favorite={fav} selected={false} />)

      expect(queryByTestID(container, 'favorite-location-card-selected')).toBeNull()
    })
  })

  describe('actions', () => {
    it('shows action buttons when selected', () => {
      const fav = createFavorite()
      const { container } = render(
        <FavoriteLocationCard favorite={fav} selected={true} onPress={vi.fn()} />
      )

      expect(queryByTestID(container, 'favorite-location-card-actions')).not.toBeNull()
    })

    it('shows action buttons when showActions is true', () => {
      const fav = createFavorite()
      const { container } = render(
        <FavoriteLocationCard favorite={fav} showActions={true} />
      )

      expect(queryByTestID(container, 'favorite-location-card-actions')).not.toBeNull()
    })

    it('hides action buttons when not selected and showActions is false', () => {
      const fav = createFavorite()
      const { container } = render(
        <FavoriteLocationCard favorite={fav} selected={false} showActions={false} />
      )

      expect(queryByTestID(container, 'favorite-location-card-actions')).toBeNull()
    })
  })

  describe('callbacks', () => {
    it('calls onPress when card is pressed', () => {
      const onPress = vi.fn()
      const fav = createFavorite()
      const { container } = render(<FavoriteLocationCard favorite={fav} onPress={onPress} />)

      const card = queryByTestID(container, 'favorite-location-card')!
      fireEvent.click(card)
      expect(onPress).toHaveBeenCalledWith(fav)
    })

    it('calls onPostHere when Post Here button is pressed', () => {
      const onPostHere = vi.fn()
      const fav = createFavorite()
      const { getByText } = render(
        <FavoriteLocationCard favorite={fav} showActions={true} onPostHere={onPostHere} />
      )

      fireEvent.click(getByText('Post Here'))
      expect(onPostHere).toHaveBeenCalledWith(fav)
    })

    it('calls onBrowse when Browse button is pressed', () => {
      const onBrowse = vi.fn()
      const fav = createFavorite()
      const { getByText } = render(
        <FavoriteLocationCard favorite={fav} showActions={true} onBrowse={onBrowse} />
      )

      fireEvent.click(getByText('Browse'))
      expect(onBrowse).toHaveBeenCalledWith(fav)
    })
  })
})
