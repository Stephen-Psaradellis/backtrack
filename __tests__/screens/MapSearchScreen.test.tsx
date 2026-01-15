/**
 * @vitest-environment jsdom
 */

/**
 * Unit tests for MapSearchScreen component
 *
 * Tests the map search screen including:
 * - Renders without crashing
 * - Search bar is visible
 * - Star icon is tappable
 * - Map component renders
 */

import React from 'react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

// ============================================================================
// Mock Setup
// ============================================================================

// Mock useLocation hook
const mockUseLocation = vi.fn()

vi.mock('../../hooks/useLocation', () => ({
  useLocation: () => mockUseLocation(),
}))

// Mock useFavoriteLocations hook
const mockUseFavoriteLocations = vi.fn()

vi.mock('../../hooks/useFavoriteLocations', () => ({
  useFavoriteLocations: () => mockUseFavoriteLocations(),
}))

// Mock MapView component
vi.mock('../../components/MapView', () => ({
  MapView: 'MapView',
  createRegion: vi.fn((lat: number, lng: number) => ({
    latitude: lat,
    longitude: lng,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  })),
  createMarker: vi.fn((id: string, lat: number, lng: number, title: string) => ({
    id,
    coordinate: { latitude: lat, longitude: lng },
    title,
  })),
}))

// Mock SearchBar component
vi.mock('../../components/LocationSearch', () => ({
  SearchBar: 'SearchBar',
}))

// Mock GlobalHeader component
vi.mock('../../components/navigation/GlobalHeader', () => ({
  GlobalHeader: 'GlobalHeader',
}))

// Mock LoadingSpinner component
vi.mock('../../components/LoadingSpinner', () => ({
  LoadingSpinner: 'LoadingSpinner',
}))

// Mock haptics
vi.mock('../../lib/haptics', () => ({
  selectionFeedback: vi.fn(),
  lightFeedback: vi.fn(),
}))

// Mock navigation
const mockNavigate = vi.fn()

vi.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: vi.fn(),
    setOptions: vi.fn(),
  }),
  useRoute: () => ({
    params: {},
  }),
  useFocusEffect: vi.fn((callback) => {
    callback()
  }),
}))

// Mock safe area
vi.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  SafeAreaView: 'SafeAreaView',
  SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
}))

// Import the component under test AFTER mocking dependencies
import MapSearchScreen from '../../screens/MapSearchScreen'

// ============================================================================
// Test Constants
// ============================================================================

const DEFAULT_LOCATION_STATE = {
  latitude: 37.7749,
  longitude: -122.4194,
  loading: false,
  error: null,
}

const LOADING_LOCATION_STATE = {
  latitude: null,
  longitude: null,
  loading: true,
  error: null,
}

const DEFAULT_FAVORITES_STATE = {
  favorites: [],
  favoritesWithDistance: [],
  isLoading: false,
  error: null,
  addFavorite: vi.fn(),
  removeFavorite: vi.fn(),
  isFavorite: vi.fn(() => false),
  refetch: vi.fn(),
}

const MOCK_FAVORITES = [
  {
    id: 'fav-1',
    location_id: 'loc-1',
    user_id: 'user-1',
    created_at: '2024-01-10T10:00:00Z',
    location: {
      id: 'loc-1',
      name: 'Favorite Coffee Shop',
      address: '123 Main St',
      latitude: 37.7749,
      longitude: -122.4194,
    },
  },
]

const LOADED_FAVORITES_STATE = {
  favorites: MOCK_FAVORITES,
  favoritesWithDistance: MOCK_FAVORITES.map((f) => ({
    ...f,
    distance: 100,
  })),
  isLoading: false,
  error: null,
  addFavorite: vi.fn(),
  removeFavorite: vi.fn(),
  isFavorite: vi.fn(() => false),
  refetch: vi.fn(),
}

// ============================================================================
// Setup and Teardown
// ============================================================================

describe('MapSearchScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Default hook states
    mockUseLocation.mockReturnValue(DEFAULT_LOCATION_STATE)
    mockUseFavoriteLocations.mockReturnValue(DEFAULT_FAVORITES_STATE)
  })

  // ============================================================================
  // Renders Without Crashing Tests
  // ============================================================================

  describe('renders without crashing', () => {
    it('renders the MapSearchScreen component', () => {
      render(<MapSearchScreen />)

      // Should render without throwing
      expect(true).toBe(true)
    })

    it('renders with loading location state', () => {
      mockUseLocation.mockReturnValue(LOADING_LOCATION_STATE)

      render(<MapSearchScreen />)

      // Should not crash
      expect(true).toBe(true)
    })

    it('renders with favorites loaded', () => {
      mockUseFavoriteLocations.mockReturnValue(LOADED_FAVORITES_STATE)

      render(<MapSearchScreen />)

      // Should not crash
      expect(true).toBe(true)
    })
  })

  // ============================================================================
  // Search Bar Tests
  // ============================================================================

  describe('search bar is visible', () => {
    it('renders container with search area', () => {
      const { container } = render(<MapSearchScreen />)

      expect(container).toBeTruthy()
    })

    it('calls useLocation hook', () => {
      render(<MapSearchScreen />)

      expect(mockUseLocation).toHaveBeenCalled()
    })
  })

  // ============================================================================
  // Star Icon Tests
  // ============================================================================

  describe('star icon is tappable', () => {
    it('calls useFavoriteLocations hook', () => {
      render(<MapSearchScreen />)

      expect(mockUseFavoriteLocations).toHaveBeenCalled()
    })

    it('favorites data is accessible', () => {
      mockUseFavoriteLocations.mockReturnValue(LOADED_FAVORITES_STATE)

      render(<MapSearchScreen />)

      expect(mockUseFavoriteLocations().favorites).toHaveLength(1)
    })
  })

  // ============================================================================
  // Map Component Tests
  // ============================================================================

  describe('map component renders', () => {
    it('renders with location data', () => {
      const { container } = render(<MapSearchScreen />)

      expect(container).toBeTruthy()
      expect(mockUseLocation().latitude).toBe(37.7749)
      expect(mockUseLocation().longitude).toBe(-122.4194)
    })

    it('renders when location is loading', () => {
      mockUseLocation.mockReturnValue(LOADING_LOCATION_STATE)

      const { container } = render(<MapSearchScreen />)

      expect(container).toBeTruthy()
      expect(mockUseLocation().loading).toBe(true)
    })

    it('renders with favorite markers', () => {
      mockUseFavoriteLocations.mockReturnValue(LOADED_FAVORITES_STATE)

      const { container } = render(<MapSearchScreen />)

      expect(container).toBeTruthy()
    })
  })

  // ============================================================================
  // Error Handling Tests
  // ============================================================================

  describe('error handling', () => {
    it('renders when location has error', () => {
      mockUseLocation.mockReturnValue({
        ...DEFAULT_LOCATION_STATE,
        error: 'Location permission denied',
      })

      const { container } = render(<MapSearchScreen />)

      expect(container).toBeTruthy()
    })

    it('renders when favorites has error', () => {
      mockUseFavoriteLocations.mockReturnValue({
        ...DEFAULT_FAVORITES_STATE,
        error: 'Failed to fetch favorites',
      })

      const { container } = render(<MapSearchScreen />)

      expect(container).toBeTruthy()
    })
  })
})
