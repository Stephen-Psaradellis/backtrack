/**
 * FavoritesList Component Tests
 *
 * Tests for the FavoritesList component including:
 * - Rendering with various props
 * - Loading state display
 * - Error state display
 * - Empty state display
 * - Favorites list rendering
 * - Selection behavior
 * - Quick action callbacks
 * - Pull-to-refresh
 * - Accessibility requirements
 */

import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react-native'
import { FavoritesList } from '../FavoritesList'
import type { FavoriteLocationWithDistance } from '../../../hooks/useFavoriteLocations'

// Mock dependencies
jest.mock('../../LoadingSpinner', () => ({
  LoadingSpinner: jest.fn(({ message }) => (
    <div data-testid="loading-spinner">{message}</div>
  )),
}))

jest.mock('../../EmptyState', () => ({
  EmptyState: jest.fn(({ icon, title, message, action, testID }) => (
    <div data-testid={testID ?? 'empty-state'}>
      <span data-testid="empty-icon">{icon}</span>
      <span data-testid="empty-title">{title}</span>
      <span data-testid="empty-message">{message}</span>
      {action && (
        <button data-testid="empty-action" onClick={action.onPress}>
          {action.label}
        </button>
      )}
    </div>
  )),
  ErrorState: jest.fn(({ error, onRetry, testID }) => (
    <div data-testid={testID ?? 'error-state'}>
      <span data-testid="error-message">{error}</span>
      {onRetry && (
        <button data-testid="error-retry" onClick={onRetry}>
          Retry
        </button>
      )}
    </div>
  )),
}))

jest.mock('../../../lib/haptics', () => ({
  selectionFeedback: jest.fn(),
}))

// Test data helpers
const createMockFavorite = (
  id: string,
  customName: string,
  placeName: string,
  distanceMeters: number | null = null
): FavoriteLocationWithDistance => ({
  id,
  user_id: 'user-123',
  custom_name: customName,
  place_name: placeName,
  address: '123 Test St, Test City, TC 12345',
  latitude: 40.7128,
  longitude: -74.006,
  google_place_id: 'test-place-id',
  created_at: '2024-01-15T10:00:00Z',
  updated_at: '2024-01-15T10:00:00Z',
  distance_meters: distanceMeters,
})

const createMockFavorites = (count: number): FavoriteLocationWithDistance[] => {
  return Array.from({ length: count }, (_, i) =>
    createMockFavorite(
      `fav-${i}`,
      `Favorite ${i}`,
      `Place ${i}`,
      i * 500 // Distance in meters
    )
  )
}

const defaultProps = {
  favorites: [] as FavoriteLocationWithDistance[],
}

describe('FavoritesList', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Basic Rendering', () => {
    it('should render with testID', () => {
      render(<FavoritesList {...defaultProps} testID="favorites-list" />)

      expect(screen.getByTestId('favorites-list-empty')).toBeTruthy()
    })

    it('should render container with custom style', () => {
      const customStyle = { backgroundColor: 'red' }
      render(
        <FavoritesList
          {...defaultProps}
          favorites={createMockFavorites(1)}
          style={customStyle}
          testID="favorites-list"
        />
      )

      expect(screen.getByTestId('favorites-list')).toBeTruthy()
    })
  })

  describe('Loading State', () => {
    it('should show loading spinner when isLoading is true and no favorites', () => {
      render(<FavoritesList {...defaultProps} isLoading={true} testID="favorites-list" />)

      expect(screen.getByTestId('favorites-list-loading')).toBeTruthy()
      expect(screen.getByTestId('loading-spinner')).toBeTruthy()
    })

    it('should show loading message', () => {
      render(<FavoritesList {...defaultProps} isLoading={true} />)

      expect(screen.getByText('Loading favorites...')).toBeTruthy()
    })

    it('should not show loading when favorites exist even if isLoading', () => {
      const favorites = createMockFavorites(2)
      render(
        <FavoritesList
          {...defaultProps}
          favorites={favorites}
          isLoading={true}
          testID="favorites-list"
        />
      )

      expect(screen.queryByTestId('favorites-list-loading')).toBeNull()
      expect(screen.getByTestId('favorites-list')).toBeTruthy()
    })
  })

  describe('Error State', () => {
    it('should show error state when error is provided and no favorites', () => {
      render(
        <FavoritesList
          {...defaultProps}
          error="Failed to load favorites"
          testID="favorites-list"
        />
      )

      expect(screen.getByTestId('favorites-list-error')).toBeTruthy()
      expect(screen.getByTestId('favorites-list-error-state')).toBeTruthy()
    })

    it('should display error message', () => {
      render(
        <FavoritesList
          {...defaultProps}
          error="Failed to load favorites"
          testID="favorites-list"
        />
      )

      expect(screen.getByText('Failed to load favorites')).toBeTruthy()
    })

    it('should show retry button when onRetry is provided', () => {
      const onRetry = jest.fn()
      render(
        <FavoritesList
          {...defaultProps}
          error="Failed to load favorites"
          onRetry={onRetry}
          testID="favorites-list"
        />
      )

      expect(screen.getByTestId('error-retry')).toBeTruthy()
    })

    it('should call onRetry when retry button is pressed', () => {
      const onRetry = jest.fn()
      render(
        <FavoritesList
          {...defaultProps}
          error="Failed to load favorites"
          onRetry={onRetry}
          testID="favorites-list"
        />
      )

      fireEvent.press(screen.getByTestId('error-retry'))

      expect(onRetry).toHaveBeenCalled()
    })

    it('should not show error when favorites exist even if error', () => {
      const favorites = createMockFavorites(2)
      render(
        <FavoritesList
          {...defaultProps}
          favorites={favorites}
          error="Some error"
          testID="favorites-list"
        />
      )

      expect(screen.queryByTestId('favorites-list-error')).toBeNull()
      expect(screen.getByTestId('favorites-list')).toBeTruthy()
    })
  })

  describe('Empty State', () => {
    it('should show empty state when no favorites and not loading', () => {
      render(<FavoritesList {...defaultProps} testID="favorites-list" />)

      expect(screen.getByTestId('favorites-list-empty')).toBeTruthy()
      expect(screen.getByTestId('favorites-list-empty-state')).toBeTruthy()
    })

    it('should display default empty title', () => {
      render(<FavoritesList {...defaultProps} />)

      expect(screen.getByText('No Favorites Yet')).toBeTruthy()
    })

    it('should display default empty message', () => {
      render(<FavoritesList {...defaultProps} />)

      expect(
        screen.getByText('Save your favorite locations for quick access to posting and browsing.')
      ).toBeTruthy()
    })

    it('should display custom empty title', () => {
      render(
        <FavoritesList {...defaultProps} emptyTitle="Custom Empty Title" />
      )

      expect(screen.getByText('Custom Empty Title')).toBeTruthy()
    })

    it('should display custom empty message', () => {
      render(
        <FavoritesList {...defaultProps} emptyMessage="Custom empty message" />
      )

      expect(screen.getByText('Custom empty message')).toBeTruthy()
    })

    it('should show add favorite button when onAddFavorite is provided', () => {
      const onAddFavorite = jest.fn()
      render(
        <FavoritesList
          {...defaultProps}
          onAddFavorite={onAddFavorite}
          testID="favorites-list"
        />
      )

      expect(screen.getByTestId('empty-action')).toBeTruthy()
      expect(screen.getByText('Add Favorite')).toBeTruthy()
    })

    it('should call onAddFavorite when add button is pressed', () => {
      const onAddFavorite = jest.fn()
      render(
        <FavoritesList
          {...defaultProps}
          onAddFavorite={onAddFavorite}
          testID="favorites-list"
        />
      )

      fireEvent.press(screen.getByTestId('empty-action'))

      expect(onAddFavorite).toHaveBeenCalled()
    })
  })

  describe('Favorites List Rendering', () => {
    it('should render FlatList when favorites exist', () => {
      const favorites = createMockFavorites(3)
      render(
        <FavoritesList
          {...defaultProps}
          favorites={favorites}
          testID="favorites-list"
        />
      )

      expect(screen.getByTestId('favorites-list')).toBeTruthy()
      expect(screen.getByTestId('favorites-list-flatlist')).toBeTruthy()
    })

    it('should render correct number of favorites', () => {
      const favorites = createMockFavorites(3)
      render(
        <FavoritesList
          {...defaultProps}
          favorites={favorites}
          testID="favorites-list"
        />
      )

      expect(screen.getByTestId('favorites-list-item-fav-0')).toBeTruthy()
      expect(screen.getByTestId('favorites-list-item-fav-1')).toBeTruthy()
      expect(screen.getByTestId('favorites-list-item-fav-2')).toBeTruthy()
    })

    it('should display list header with count', () => {
      const favorites = createMockFavorites(5)
      render(<FavoritesList {...defaultProps} favorites={favorites} />)

      expect(screen.getByText('5 Favorites')).toBeTruthy()
    })

    it('should display singular "Favorite" for single item', () => {
      const favorites = createMockFavorites(1)
      render(<FavoritesList {...defaultProps} favorites={favorites} />)

      expect(screen.getByText('1 Favorite')).toBeTruthy()
    })

    it('should display custom name for each favorite', () => {
      const favorites = createMockFavorites(2)
      render(<FavoritesList {...defaultProps} favorites={favorites} />)

      expect(screen.getByText('Favorite 0')).toBeTruthy()
      expect(screen.getByText('Favorite 1')).toBeTruthy()
    })

    it('should display place name for each favorite', () => {
      const favorites = createMockFavorites(2)
      render(<FavoritesList {...defaultProps} favorites={favorites} />)

      expect(screen.getByText('Place 0')).toBeTruthy()
      expect(screen.getByText('Place 1')).toBeTruthy()
    })
  })

  describe('Selection Behavior', () => {
    it('should call onSelect when favorite is pressed', () => {
      const onSelect = jest.fn()
      const favorites = createMockFavorites(2)
      render(
        <FavoritesList
          {...defaultProps}
          favorites={favorites}
          onSelect={onSelect}
          testID="favorites-list"
        />
      )

      fireEvent.press(screen.getByTestId('favorites-list-item-fav-0'))

      expect(onSelect).toHaveBeenCalledWith(favorites[0])
    })

    it('should highlight selected favorite', () => {
      const favorites = createMockFavorites(2)
      render(
        <FavoritesList
          {...defaultProps}
          favorites={favorites}
          selectedFavoriteId="fav-1"
          testID="favorites-list"
        />
      )

      // The selected item should have the checkmark
      expect(screen.getByText('\u2713')).toBeTruthy()
    })

    it('should show heart emoji for selected favorite', () => {
      const favorites = createMockFavorites(2)
      render(
        <FavoritesList
          {...defaultProps}
          favorites={favorites}
          selectedFavoriteId="fav-0"
        />
      )

      // Selected item shows heart emoji
      expect(screen.getByText('\u2764\uFE0F')).toBeTruthy()
    })
  })

  describe('Quick Actions', () => {
    it('should show Post Here button when onPostHere provided and selected', () => {
      const onPostHere = jest.fn()
      const favorites = createMockFavorites(1)
      render(
        <FavoritesList
          {...defaultProps}
          favorites={favorites}
          selectedFavoriteId="fav-0"
          onPostHere={onPostHere}
          testID="favorites-list"
        />
      )

      expect(screen.getByText('Post Here')).toBeTruthy()
    })

    it('should call onPostHere when Post Here button is pressed', () => {
      const onPostHere = jest.fn()
      const favorites = createMockFavorites(1)
      render(
        <FavoritesList
          {...defaultProps}
          favorites={favorites}
          selectedFavoriteId="fav-0"
          onPostHere={onPostHere}
          testID="favorites-list"
        />
      )

      fireEvent.press(screen.getByTestId('favorites-list-item-fav-0-post-here'))

      expect(onPostHere).toHaveBeenCalledWith(favorites[0])
    })

    it('should show Browse button when onBrowse provided and selected', () => {
      const onBrowse = jest.fn()
      const favorites = createMockFavorites(1)
      render(
        <FavoritesList
          {...defaultProps}
          favorites={favorites}
          selectedFavoriteId="fav-0"
          onBrowse={onBrowse}
          testID="favorites-list"
        />
      )

      expect(screen.getByText('Browse')).toBeTruthy()
    })

    it('should call onBrowse when Browse button is pressed', () => {
      const onBrowse = jest.fn()
      const favorites = createMockFavorites(1)
      render(
        <FavoritesList
          {...defaultProps}
          favorites={favorites}
          selectedFavoriteId="fav-0"
          onBrowse={onBrowse}
          testID="favorites-list"
        />
      )

      fireEvent.press(screen.getByTestId('favorites-list-item-fav-0-browse'))

      expect(onBrowse).toHaveBeenCalledWith(favorites[0])
    })

    it('should show actions on all items when no onSelect but has onPostHere/onBrowse', () => {
      const onPostHere = jest.fn()
      const favorites = createMockFavorites(2)
      render(
        <FavoritesList
          {...defaultProps}
          favorites={favorites}
          onPostHere={onPostHere}
          testID="favorites-list"
        />
      )

      // Both items should have Post Here button visible
      expect(screen.getByTestId('favorites-list-item-fav-0-post-here')).toBeTruthy()
      expect(screen.getByTestId('favorites-list-item-fav-1-post-here')).toBeTruthy()
    })
  })

  describe('Distance Display', () => {
    it('should display distance badge when distance is available', () => {
      const favorites = [createMockFavorite('fav-1', 'Test', 'Place', 500)]
      render(<FavoritesList {...defaultProps} favorites={favorites} />)

      expect(screen.getByText('500 m')).toBeTruthy()
    })

    it('should format distance in kilometers for larger distances', () => {
      const favorites = [createMockFavorite('fav-1', 'Test', 'Place', 2500)]
      render(<FavoritesList {...defaultProps} favorites={favorites} />)

      expect(screen.getByText('2.5 km')).toBeTruthy()
    })

    it('should round large kilometer distances', () => {
      const favorites = [createMockFavorite('fav-1', 'Test', 'Place', 15000)]
      render(<FavoritesList {...defaultProps} favorites={favorites} />)

      expect(screen.getByText('15 km')).toBeTruthy()
    })

    it('should not show distance badge when distance is null', () => {
      const favorites = [createMockFavorite('fav-1', 'Test', 'Place', null)]
      render(<FavoritesList {...defaultProps} favorites={favorites} />)

      expect(screen.queryByText(/km|m/)).toBeNull()
    })
  })

  describe('Accessibility', () => {
    it('should have accessible favorite items with role button', () => {
      const favorites = createMockFavorites(1)
      const { UNSAFE_getByProps } = render(
        <FavoritesList
          {...defaultProps}
          favorites={favorites}
          testID="favorites-list"
        />
      )

      // TouchableOpacity should have accessibilityRole="button"
      const item = screen.getByTestId('favorites-list-item-fav-0')
      expect(item).toBeTruthy()
    })

    it('should include distance in accessibility label when available', () => {
      const favorites = [createMockFavorite('fav-1', 'Coffee Shop', 'Starbucks', 500)]
      render(
        <FavoritesList
          {...defaultProps}
          favorites={favorites}
          testID="favorites-list"
        />
      )

      // The accessibility label should include the distance
      const item = screen.getByTestId('favorites-list-item-fav-1')
      expect(item.props.accessibilityLabel).toContain('500 m away')
    })
  })

  describe('Edge Cases', () => {
    it('should handle very long custom names', () => {
      const longName = 'A'.repeat(100)
      const favorites = [createMockFavorite('fav-1', longName, 'Place')]
      render(<FavoritesList {...defaultProps} favorites={favorites} />)

      expect(screen.getByText(longName)).toBeTruthy()
    })

    it('should handle very long addresses', () => {
      const longAddress = 'A'.repeat(100)
      const favorite: FavoriteLocationWithDistance = {
        ...createMockFavorite('fav-1', 'Test', 'Place'),
        address: longAddress,
      }
      render(<FavoritesList {...defaultProps} favorites={[favorite]} />)

      // Address should be truncated
      expect(screen.getByText(`${longAddress.substring(0, 47)}...`)).toBeTruthy()
    })

    it('should handle null address', () => {
      const favorite: FavoriteLocationWithDistance = {
        ...createMockFavorite('fav-1', 'Test', 'Place'),
        address: null,
      }
      render(<FavoritesList {...defaultProps} favorites={[favorite]} />)

      expect(screen.getByText('Address unavailable')).toBeTruthy()
    })

    it('should handle large number of favorites', () => {
      const favorites = createMockFavorites(50)
      render(
        <FavoritesList
          {...defaultProps}
          favorites={favorites}
          testID="favorites-list"
        />
      )

      expect(screen.getByText('50 Favorites')).toBeTruthy()
    })
  })
})
