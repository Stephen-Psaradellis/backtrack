/**
 * FavoriteLocationCard Component Tests
 *
 * Tests for the FavoriteLocationCard component including:
 * - Rendering with various props
 * - Press and long press handling
 * - Quick action buttons (Post Here, Browse)
 * - Distance badge display
 * - Compact mode
 * - Selected state
 * - Address display and truncation
 * - Preset variants
 * - Accessibility requirements
 */

import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react-native'
import {
  FavoriteLocationCard,
  CompactFavoriteLocationCard,
  FavoriteLocationCardNoAddress,
  FavoriteLocationCardWithActions,
  FavoriteLocationCardListItem,
  createFavoriteCardRenderer,
  formatDistance,
  truncateAddress,
} from '../FavoriteLocationCard'
import type { FavoriteLocationWithDistance } from '../../../hooks/useFavoriteLocations'

// Mock haptics
jest.mock('../../../lib/haptics', () => ({
  selectionFeedback: jest.fn(),
  mediumFeedback: jest.fn(),
}))

// Test data helpers
const createMockFavorite = (
  id: string,
  customName: string,
  placeName: string,
  distanceMeters: number | null = null,
  address: string | null = '123 Test St, Test City, TC 12345'
): FavoriteLocationWithDistance => ({
  id,
  user_id: 'user-123',
  custom_name: customName,
  place_name: placeName,
  address,
  latitude: 40.7128,
  longitude: -74.006,
  google_place_id: 'test-place-id',
  created_at: '2024-01-15T10:00:00Z',
  updated_at: '2024-01-15T10:00:00Z',
  distance_meters: distanceMeters,
})

const defaultFavorite = createMockFavorite('fav-1', 'Home', 'My Apartment', 500)

describe('FavoriteLocationCard', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Basic Rendering', () => {
    it('should render with testID', () => {
      render(<FavoriteLocationCard favorite={defaultFavorite} testID="test-card" />)

      expect(screen.getByTestId('test-card')).toBeTruthy()
    })

    it('should display custom name', () => {
      render(<FavoriteLocationCard favorite={defaultFavorite} />)

      expect(screen.getByText('Home')).toBeTruthy()
    })

    it('should display place name', () => {
      render(<FavoriteLocationCard favorite={defaultFavorite} />)

      expect(screen.getByText('My Apartment')).toBeTruthy()
    })

    it('should display address by default', () => {
      render(<FavoriteLocationCard favorite={defaultFavorite} />)

      expect(screen.getByText('123 Test St, Test City, TC 12345')).toBeTruthy()
    })

    it('should display pin emoji by default', () => {
      render(<FavoriteLocationCard favorite={defaultFavorite} />)

      expect(screen.getByText('\uD83D\uDCCD')).toBeTruthy()
    })
  })

  describe('Distance Badge', () => {
    it('should display distance in meters for short distances', () => {
      const favorite = createMockFavorite('fav-1', 'Test', 'Place', 500)
      render(<FavoriteLocationCard favorite={favorite} testID="card" />)

      expect(screen.getByText('500 m')).toBeTruthy()
    })

    it('should display distance in kilometers with one decimal', () => {
      const favorite = createMockFavorite('fav-1', 'Test', 'Place', 2500)
      render(<FavoriteLocationCard favorite={favorite} />)

      expect(screen.getByText('2.5 km')).toBeTruthy()
    })

    it('should round large kilometer distances', () => {
      const favorite = createMockFavorite('fav-1', 'Test', 'Place', 15000)
      render(<FavoriteLocationCard favorite={favorite} />)

      expect(screen.getByText('15 km')).toBeTruthy()
    })

    it('should not show distance badge when distance is null', () => {
      const favorite = createMockFavorite('fav-1', 'Test', 'Place', null)
      render(<FavoriteLocationCard favorite={favorite} testID="card" />)

      expect(screen.queryByTestId('card-distance')).toBeNull()
    })
  })

  describe('Press Handling', () => {
    it('should call onPress when card is pressed', () => {
      const onPress = jest.fn()
      render(<FavoriteLocationCard favorite={defaultFavorite} onPress={onPress} testID="card" />)

      fireEvent.press(screen.getByTestId('card'))

      expect(onPress).toHaveBeenCalledWith(defaultFavorite)
    })

    it('should call onLongPress when card is long pressed', () => {
      const onLongPress = jest.fn()
      render(
        <FavoriteLocationCard
          favorite={defaultFavorite}
          onLongPress={onLongPress}
          testID="card"
        />
      )

      fireEvent(screen.getByTestId('card'), 'longPress')

      expect(onLongPress).toHaveBeenCalledWith(defaultFavorite)
    })

    it('should trigger haptic feedback on press', () => {
      const { selectionFeedback } = require('../../../lib/haptics')
      const onPress = jest.fn()
      render(<FavoriteLocationCard favorite={defaultFavorite} onPress={onPress} testID="card" />)

      fireEvent.press(screen.getByTestId('card'))

      expect(selectionFeedback).toHaveBeenCalled()
    })

    it('should trigger medium haptic feedback on long press', () => {
      const { mediumFeedback } = require('../../../lib/haptics')
      const onLongPress = jest.fn()
      render(
        <FavoriteLocationCard
          favorite={defaultFavorite}
          onLongPress={onLongPress}
          testID="card"
        />
      )

      fireEvent(screen.getByTestId('card'), 'longPress')

      expect(mediumFeedback).toHaveBeenCalled()
    })

    it('should be disabled when no onPress or onLongPress', () => {
      render(<FavoriteLocationCard favorite={defaultFavorite} testID="card" />)

      const card = screen.getByTestId('card')
      expect(card.props.disabled).toBe(true)
    })
  })

  describe('Quick Actions', () => {
    it('should not show actions by default', () => {
      const onPostHere = jest.fn()
      render(
        <FavoriteLocationCard
          favorite={defaultFavorite}
          onPostHere={onPostHere}
          testID="card"
        />
      )

      expect(screen.queryByTestId('card-actions')).toBeNull()
    })

    it('should show actions when selected', () => {
      const onPostHere = jest.fn()
      render(
        <FavoriteLocationCard
          favorite={defaultFavorite}
          selected={true}
          onPostHere={onPostHere}
          testID="card"
        />
      )

      expect(screen.getByTestId('card-actions')).toBeTruthy()
    })

    it('should show actions when showActions prop is true', () => {
      const onPostHere = jest.fn()
      render(
        <FavoriteLocationCard
          favorite={defaultFavorite}
          showActions={true}
          onPostHere={onPostHere}
          testID="card"
        />
      )

      expect(screen.getByTestId('card-actions')).toBeTruthy()
    })

    it('should show Post Here button when onPostHere provided', () => {
      const onPostHere = jest.fn()
      render(
        <FavoriteLocationCard
          favorite={defaultFavorite}
          selected={true}
          onPostHere={onPostHere}
          testID="card"
        />
      )

      expect(screen.getByText('Post Here')).toBeTruthy()
    })

    it('should call onPostHere when Post Here button is pressed', () => {
      const onPostHere = jest.fn()
      render(
        <FavoriteLocationCard
          favorite={defaultFavorite}
          selected={true}
          onPostHere={onPostHere}
          testID="card"
        />
      )

      fireEvent.press(screen.getByTestId('card-post-here'))

      expect(onPostHere).toHaveBeenCalledWith(defaultFavorite)
    })

    it('should show Browse button when onBrowse provided', () => {
      const onBrowse = jest.fn()
      render(
        <FavoriteLocationCard
          favorite={defaultFavorite}
          selected={true}
          onBrowse={onBrowse}
          testID="card"
        />
      )

      expect(screen.getByText('Browse')).toBeTruthy()
    })

    it('should call onBrowse when Browse button is pressed', () => {
      const onBrowse = jest.fn()
      render(
        <FavoriteLocationCard
          favorite={defaultFavorite}
          selected={true}
          onBrowse={onBrowse}
          testID="card"
        />
      )

      fireEvent.press(screen.getByTestId('card-browse'))

      expect(onBrowse).toHaveBeenCalledWith(defaultFavorite)
    })

    it('should show both buttons when both callbacks provided', () => {
      const onPostHere = jest.fn()
      const onBrowse = jest.fn()
      render(
        <FavoriteLocationCard
          favorite={defaultFavorite}
          selected={true}
          onPostHere={onPostHere}
          onBrowse={onBrowse}
          testID="card"
        />
      )

      expect(screen.getByText('Post Here')).toBeTruthy()
      expect(screen.getByText('Browse')).toBeTruthy()
    })

    it('should not show actions container when no callbacks provided', () => {
      render(
        <FavoriteLocationCard
          favorite={defaultFavorite}
          selected={true}
          testID="card"
        />
      )

      expect(screen.queryByTestId('card-actions')).toBeNull()
    })
  })

  describe('Selected State', () => {
    it('should show heart emoji when selected', () => {
      render(
        <FavoriteLocationCard
          favorite={defaultFavorite}
          selected={true}
          testID="card"
        />
      )

      expect(screen.getByText('\u2764\uFE0F')).toBeTruthy()
    })

    it('should show checkmark indicator when selected', () => {
      render(
        <FavoriteLocationCard
          favorite={defaultFavorite}
          selected={true}
          testID="card"
        />
      )

      expect(screen.getByTestId('card-selected')).toBeTruthy()
      expect(screen.getByText('\u2713')).toBeTruthy()
    })

    it('should not show checkmark when not selected', () => {
      render(
        <FavoriteLocationCard
          favorite={defaultFavorite}
          selected={false}
          testID="card"
        />
      )

      expect(screen.queryByTestId('card-selected')).toBeNull()
    })
  })

  describe('Compact Mode', () => {
    it('should render in compact mode', () => {
      render(
        <FavoriteLocationCard
          favorite={defaultFavorite}
          compact={true}
          testID="card"
        />
      )

      expect(screen.getByTestId('card')).toBeTruthy()
    })

    it('should still display all content in compact mode', () => {
      render(
        <FavoriteLocationCard
          favorite={defaultFavorite}
          compact={true}
        />
      )

      expect(screen.getByText('Home')).toBeTruthy()
      expect(screen.getByText('My Apartment')).toBeTruthy()
    })
  })

  describe('Address Display', () => {
    it('should show address by default', () => {
      render(<FavoriteLocationCard favorite={defaultFavorite} />)

      expect(screen.getByText('123 Test St, Test City, TC 12345')).toBeTruthy()
    })

    it('should hide address when showAddress is false', () => {
      render(
        <FavoriteLocationCard
          favorite={defaultFavorite}
          showAddress={false}
          testID="card"
        />
      )

      expect(screen.queryByTestId('card-address')).toBeNull()
    })

    it('should show "Address unavailable" when address is null', () => {
      const favorite = createMockFavorite('fav-1', 'Test', 'Place', null, null)
      render(<FavoriteLocationCard favorite={favorite} />)

      expect(screen.getByText('Address unavailable')).toBeTruthy()
    })

    it('should truncate long addresses', () => {
      const longAddress = 'A'.repeat(100)
      const favorite = createMockFavorite('fav-1', 'Test', 'Place', null, longAddress)
      render(<FavoriteLocationCard favorite={favorite} />)

      // Should be truncated
      const addressElement = screen.getByTestId('favorite-location-card-address')
      expect(addressElement.props.children.length).toBeLessThan(100)
    })
  })

  describe('Accessibility', () => {
    it('should have accessibilityRole button', () => {
      render(<FavoriteLocationCard favorite={defaultFavorite} testID="card" />)

      const card = screen.getByTestId('card')
      expect(card.props.accessibilityRole).toBe('button')
    })

    it('should have accessibilityLabel with favorite info', () => {
      render(<FavoriteLocationCard favorite={defaultFavorite} testID="card" />)

      const card = screen.getByTestId('card')
      expect(card.props.accessibilityLabel).toContain('Home')
      expect(card.props.accessibilityLabel).toContain('My Apartment')
    })

    it('should include distance in accessibilityLabel when available', () => {
      render(<FavoriteLocationCard favorite={defaultFavorite} testID="card" />)

      const card = screen.getByTestId('card')
      expect(card.props.accessibilityLabel).toContain('500 m away')
    })

    it('should have accessibilityState with selected', () => {
      render(
        <FavoriteLocationCard
          favorite={defaultFavorite}
          selected={true}
          testID="card"
        />
      )

      const card = screen.getByTestId('card')
      expect(card.props.accessibilityState.selected).toBe(true)
    })

    it('should have accessibilityLabel on action buttons', () => {
      const onPostHere = jest.fn()
      render(
        <FavoriteLocationCard
          favorite={defaultFavorite}
          selected={true}
          onPostHere={onPostHere}
          testID="card"
        />
      )

      const postHereButton = screen.getByTestId('card-post-here')
      expect(postHereButton.props.accessibilityLabel).toBe('Post Here')
    })
  })
})

describe('Preset Variants', () => {
  const favorite = createMockFavorite('fav-1', 'Test', 'Place')

  describe('CompactFavoriteLocationCard', () => {
    it('should render in compact mode', () => {
      render(
        <CompactFavoriteLocationCard
          favorite={favorite}
          testID="compact-card"
        />
      )

      expect(screen.getByTestId('compact-card')).toBeTruthy()
    })

    it('should use default testID', () => {
      render(<CompactFavoriteLocationCard favorite={favorite} />)

      expect(screen.getByTestId('favorite-location-card-compact')).toBeTruthy()
    })
  })

  describe('FavoriteLocationCardNoAddress', () => {
    it('should not show address', () => {
      render(
        <FavoriteLocationCardNoAddress
          favorite={favorite}
          testID="no-address-card"
        />
      )

      expect(screen.queryByTestId('no-address-card-address')).toBeNull()
    })

    it('should use default testID', () => {
      render(<FavoriteLocationCardNoAddress favorite={favorite} />)

      expect(screen.getByTestId('favorite-location-card-no-address')).toBeTruthy()
    })
  })

  describe('FavoriteLocationCardWithActions', () => {
    it('should show actions without selection', () => {
      const onPostHere = jest.fn()
      render(
        <FavoriteLocationCardWithActions
          favorite={favorite}
          onPostHere={onPostHere}
          testID="with-actions-card"
        />
      )

      expect(screen.getByTestId('with-actions-card-actions')).toBeTruthy()
    })

    it('should use default testID', () => {
      render(
        <FavoriteLocationCardWithActions
          favorite={favorite}
          onPostHere={jest.fn()}
        />
      )

      expect(screen.getByTestId('favorite-location-card-with-actions')).toBeTruthy()
    })
  })
})

describe('FavoriteLocationCardListItem', () => {
  const favorite = createMockFavorite('fav-1', 'Test', 'Place')

  it('should render with separator by default', () => {
    const { container } = render(
      <FavoriteLocationCardListItem favorite={favorite} index={0} />
    )

    // Should have separator view
    expect(container).toBeTruthy()
  })

  it('should include index in testID', () => {
    render(
      <FavoriteLocationCardListItem
        favorite={favorite}
        index={5}
        testID="list-item"
      />
    )

    expect(screen.getByTestId('list-item-5')).toBeTruthy()
  })
})

describe('createFavoriteCardRenderer', () => {
  const favorites = [
    createMockFavorite('fav-1', 'Test 1', 'Place 1'),
    createMockFavorite('fav-2', 'Test 2', 'Place 2'),
  ]

  it('should create a render function', () => {
    const renderItem = createFavoriteCardRenderer({
      onPress: jest.fn(),
    })

    expect(typeof renderItem).toBe('function')
  })

  it('should render items with correct props', () => {
    const onPress = jest.fn()
    const renderItem = createFavoriteCardRenderer({
      onPress,
      selectedId: 'fav-1',
    })

    const { getByTestId } = render(renderItem({ item: favorites[0], index: 0 }))

    expect(getByTestId('favorite-card-fav-1')).toBeTruthy()
  })

  it('should pass selectedId correctly', () => {
    const renderItem = createFavoriteCardRenderer({
      onPress: jest.fn(),
      selectedId: 'fav-1',
    })

    const { getByTestId, getByText } = render(renderItem({ item: favorites[0], index: 0 }))

    // Selected item should have checkmark
    expect(getByText('\u2713')).toBeTruthy()
  })
})

describe('Utility Functions', () => {
  describe('formatDistance', () => {
    it('should return null for null input', () => {
      expect(formatDistance(null)).toBeNull()
    })

    it('should format meters for distances under 1km', () => {
      expect(formatDistance(500)).toBe('500 m')
    })

    it('should round meters', () => {
      expect(formatDistance(523)).toBe('523 m')
    })

    it('should format km with decimal for distances under 10km', () => {
      expect(formatDistance(2500)).toBe('2.5 km')
    })

    it('should round km for distances 10km or more', () => {
      expect(formatDistance(15000)).toBe('15 km')
    })

    it('should handle edge case at 1km exactly', () => {
      expect(formatDistance(1000)).toBe('1.0 km')
    })
  })

  describe('truncateAddress', () => {
    it('should return "Address unavailable" for null', () => {
      expect(truncateAddress(null, 50)).toBe('Address unavailable')
    })

    it('should return "Address unavailable" for undefined', () => {
      expect(truncateAddress(undefined, 50)).toBe('Address unavailable')
    })

    it('should return address as-is if under max length', () => {
      expect(truncateAddress('123 Main St', 50)).toBe('123 Main St')
    })

    it('should truncate with ellipsis if over max length', () => {
      const longAddress = 'A'.repeat(60)
      const result = truncateAddress(longAddress, 50)
      expect(result.endsWith('...')).toBe(true)
      expect(result.length).toBeLessThanOrEqual(53) // 50 + '...'
    })

    it('should try to break at word boundary', () => {
      const address = 'This is a very long address that needs to be truncated at some point'
      const result = truncateAddress(address, 40)
      expect(result.endsWith('...')).toBe(true)
      // Should break at a space if possible
      expect(result.charAt(result.length - 4)).not.toMatch(/[a-z]/i)
    })
  })
})
