/**
 * Tests for components/LocationPicker.tsx
 */

import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, fireEvent } from '@testing-library/react'
import { LocationPicker, locationToItem, type LocationItem } from '../LocationPicker'

vi.mock('../../lib/haptics', () => ({
  selectionFeedback: vi.fn(),
}))

vi.mock('../../hooks/useLocation', () => ({
  calculateDistance: vi.fn(() => 500),
}))

vi.mock('../../lib/utils/geo', () => ({
  formatVisitedAgo: vi.fn(() => 'Visited 2h ago'),
}))

vi.mock('../LoadingSpinner', () => ({
  LoadingSpinner: (props: any) => React.createElement('div', { testid: 'loading-spinner' }, props.message || 'Loading'),
}))

vi.mock('../EmptyState', () => ({
  EmptyState: (props: any) => React.createElement('div', null, props.title, props.message),
  NoSearchResults: () => React.createElement('div', null, 'No results'),
}))

const getByTestId = (container: HTMLElement, testId: string) => {
  const element = container.querySelector(`[testid="${testId}"]`)
  if (!element) {
    throw new Error(`Unable to find element with testid="${testId}"\n\n${container.innerHTML}`)
  }
  return element
}

describe('LocationPicker', () => {
  const mockLocations: LocationItem[] = [
    { id: 'loc-1', name: 'Coffee Shop', address: '123 Main St', latitude: 37.78, longitude: -122.41 },
    { id: 'loc-2', name: 'Park Place', address: '456 Oak Ave', latitude: 37.79, longitude: -122.42 },
  ]

  const defaultProps = {
    onSelect: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('rendering', () => {
    it('should render the picker container', () => {
      const { container } = render(<LocationPicker {...defaultProps} />)
      expect(getByTestId(container, 'location-picker')).toBeInTheDocument()
    })

    it('should render search input', () => {
      const { container } = render(<LocationPicker {...defaultProps} />)
      expect(getByTestId(container, 'location-picker-search')).toBeInTheDocument()
    })

    it('should render location items', () => {
      const { container } = render(
        <LocationPicker {...defaultProps} locations={mockLocations} />
      )
      expect(getByTestId(container, 'location-picker-item-loc-1')).toBeInTheDocument()
      expect(getByTestId(container, 'location-picker-item-loc-2')).toBeInTheDocument()
    })

    it('should show location names', () => {
      const { getByText } = render(
        <LocationPicker {...defaultProps} locations={mockLocations} />
      )
      expect(getByText('Coffee Shop')).toBeInTheDocument()
      expect(getByText('Park Place')).toBeInTheDocument()
    })
  })

  describe('loading state', () => {
    it('should show loading state when loading with no locations', () => {
      const { container } = render(
        <LocationPicker {...defaultProps} loading={true} />
      )
      expect(getByTestId(container, 'location-picker-loading')).toBeInTheDocument()
    })
  })

  describe('error state', () => {
    it('should show error state when error with no locations', () => {
      const { container } = render(
        <LocationPicker {...defaultProps} error="Failed to load" />
      )
      expect(getByTestId(container, 'location-picker-error')).toBeInTheDocument()
    })
  })

  describe('interactions', () => {
    it('should call onSelect when a location is pressed', () => {
      const { container } = render(
        <LocationPicker {...defaultProps} locations={mockLocations} />
      )
      fireEvent.click(getByTestId(container, 'location-picker-item-loc-1'))
      expect(defaultProps.onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: 'loc-1' }))
    })

    it('should show current location button when enabled', () => {
      const onUseCurrentLocation = vi.fn()
      const { container } = render(
        <LocationPicker
          {...defaultProps}
          showCurrentLocation={true}
          onUseCurrentLocation={onUseCurrentLocation}
        />
      )
      expect(getByTestId(container, 'location-picker-current-location')).toBeInTheDocument()
    })
  })

  describe('selection', () => {
    it('should highlight selected location', () => {
      const { container } = render(
        <LocationPicker {...defaultProps} locations={mockLocations} selectedLocationId="loc-1" />
      )
      expect(getByTestId(container, 'location-picker-item-loc-1')).toBeInTheDocument()
    })
  })

  describe('locationToItem', () => {
    it('should convert a location entity to LocationItem', () => {
      const result = locationToItem({
        id: 'x',
        name: 'Test',
        address: '123 St',
        latitude: 1,
        longitude: 2,
        google_place_id: 'gp-1',
        visited_at: '2024-01-01',
      })
      expect(result).toEqual({
        id: 'x',
        name: 'Test',
        address: '123 St',
        latitude: 1,
        longitude: 2,
        place_id: 'gp-1',
        visited_at: '2024-01-01',
      })
    })

    it('should handle missing optional fields', () => {
      const result = locationToItem({ id: 'x', name: 'Test', latitude: 1, longitude: 2 })
      expect(result.address).toBeNull()
      expect(result.place_id).toBeNull()
      expect(result.visited_at).toBeNull()
    })
  })
})
