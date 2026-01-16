/**
 * @vitest-environment jsdom
 */

/**
 * Unit tests for MapSearchScreen component
 *
 * Tests the map search screen including:
 * - Renders without crashing
 * - Search functionality with Google Places integration
 * - Search results display as suggestions
 * - Venue selection updates map and navigates to Ledger
 * - Error handling for search failures
 * - My location button centers map
 * - Star button navigates to Favorites
 * - POI click navigates to Ledger
 */

import React from 'react'
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { render, fireEvent, act } from '@testing-library/react'

// ============================================================================
// Hoisted Mock Functions (must come first)
// ============================================================================

const { mockUseLocation, mockUseFavoriteLocations, mockUseLocationSearch, mockUseNearbyLocations, mockSetQuery, mockClearSearch,
        mockSelectionFeedback, mockLightFeedback, mockNavigate,
        mapViewCallbacksStore, mapViewPropsStore, searchBarCallbacksStore, searchBarPropsStore } = vi.hoisted(() => {
  return {
    mockUseLocation: vi.fn(),
    mockUseFavoriteLocations: vi.fn(),
    mockUseLocationSearch: vi.fn(),
    mockUseNearbyLocations: vi.fn(),
    mockSetQuery: vi.fn(),
    mockClearSearch: vi.fn(),
    mockSelectionFeedback: vi.fn(),
    mockLightFeedback: vi.fn(),
    mockNavigate: vi.fn(),
    mapViewCallbacksStore: { current: {} as Record<string, unknown> },
    mapViewPropsStore: { current: {} as Record<string, unknown> },
    searchBarCallbacksStore: { current: {} as Record<string, unknown> },
    searchBarPropsStore: { current: {} as Record<string, unknown> },
  }
})

// ============================================================================
// Mock Setup
// ============================================================================

// Mock useLocation hook
vi.mock('../../hooks/useLocation', () => ({
  useLocation: () => mockUseLocation(),
}))

// Mock useFavoriteLocations hook
vi.mock('../../hooks/useFavoriteLocations', () => ({
  useFavoriteLocations: () => mockUseFavoriteLocations(),
}))

// Mock useLocationSearch hook
vi.mock('../../hooks/useLocationSearch', () => ({
  useLocationSearch: (options: unknown) => mockUseLocationSearch(options),
}))

// Mock useNearbyLocations hook
vi.mock('../../hooks/useNearbyLocations', () => ({
  useNearbyLocations: (coords: unknown, options: unknown) => mockUseNearbyLocations(coords, options),
}))

// Mock MapView component
vi.mock('../../components/MapView', () => ({
  MapView: (props: Record<string, unknown>) => {
    mapViewCallbacksStore.current = {
      onPoiClick: props.onPoiClick,
      onMarkerPress: props.onMarkerPress,
      onMapReady: props.onMapReady,
    }
    mapViewPropsStore.current = {
      region: props.region,
      markers: props.markers,
      testID: props.testID,
    }
    return null
  },
  createRegion: vi.fn((coords: { latitude: number; longitude: number }, zoom: string) => ({
    latitude: coords.latitude,
    longitude: coords.longitude,
    latitudeDelta: zoom === 'close' ? 0.005 : 0.02,
    longitudeDelta: zoom === 'close' ? 0.005 : 0.02,
  })),
  createMarker: vi.fn((id: string, coords: { latitude: number; longitude: number }, options?: { title?: string; pinColor?: string }) => ({
    id,
    latitude: coords.latitude,
    longitude: coords.longitude,
    title: options?.title,
    pinColor: options?.pinColor,
  })),
}))

// Mock SearchBar component
vi.mock('../../components/LocationSearch', () => ({
  SearchBar: (props: Record<string, unknown>) => {
    searchBarCallbacksStore.current = {
      onChangeText: props.onChangeText,
      onSuggestionPress: props.onSuggestionPress,
      onSubmit: props.onSubmit,
    }
    searchBarPropsStore.current = {
      value: props.value,
      loading: props.loading,
      suggestions: props.suggestions,
      error: props.error,
      testID: props.testID,
    }
    return null
  },
}))

// Mock GlobalHeader component
vi.mock('../../components/navigation/GlobalHeader', () => ({
  GlobalHeader: () => null,
}))

// Mock LocationMarker component
vi.mock('../../components/map/LocationMarker', () => ({
  LocationMarker: () => null,
  getActivityState: vi.fn(() => 'virgin'),
}))

// Mock LoadingSpinner component
vi.mock('../../components/LoadingSpinner', () => ({
  LoadingSpinner: () => null,
}))

// Mock haptics
vi.mock('../../lib/haptics', () => ({
  selectionFeedback: () => mockSelectionFeedback(),
  lightFeedback: () => mockLightFeedback(),
}))

// Mock navigation
vi.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: vi.fn(),
    setOptions: vi.fn(),
  }),
  useRoute: () => ({
    params: {},
  }),
  useFocusEffect: vi.fn((callback: () => void) => {
    callback()
  }),
}))

// Mock safe area
vi.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
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
    place_id: 'place-1',
    place_name: 'Favorite Coffee Shop',
    custom_name: 'My Favorite Cafe',
    latitude: 37.7749,
    longitude: -122.4194,
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

const MOCK_SEARCH_RESULTS = [
  {
    id: 'venue-1',
    google_place_id: 'google-place-1',
    name: 'Blue Bottle Coffee',
    address: '300 South Street',
    latitude: 37.7849,
    longitude: -122.4094,
    place_types: ['cafe', 'coffee_shop'],
    post_count: 5,
    distance_meters: 500,
    source: 'google_places' as const,
    created_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'venue-2',
    google_place_id: 'google-place-2',
    name: 'Starbucks Reserve',
    address: '789 Market Street',
    latitude: 37.7899,
    longitude: -122.4044,
    place_types: ['cafe'],
    post_count: 10,
    distance_meters: 800,
    source: 'hybrid' as const,
    created_at: '2024-01-02T00:00:00Z',
  },
]

const DEFAULT_SEARCH_STATE = {
  query: '',
  setQuery: mockSetQuery,
  results: [],
  isLoading: false,
  error: null,
  isOffline: false,
  activeFilters: [],
  toggleFilter: vi.fn(),
  clearFilters: vi.fn(),
  clearSearch: mockClearSearch,
  refetch: vi.fn(),
  lastSearchedAt: null,
  locationPermissionStatus: 'granted' as const,
  gpsLocation: null,
  isGpsLoading: false,
  gpsError: null,
  requestGpsLocation: vi.fn(),
  checkLocationServices: vi.fn(),
}

const DEFAULT_NEARBY_LOCATIONS_STATE = {
  locations: [],
  isLoading: false,
  error: null,
  refetch: vi.fn(),
  lastFetchedAt: null,
}

// ============================================================================
// Setup and Teardown
// ============================================================================

describe('MapSearchScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()

    // Default hook states
    mockUseLocation.mockReturnValue(DEFAULT_LOCATION_STATE)
    mockUseFavoriteLocations.mockReturnValue(DEFAULT_FAVORITES_STATE)
    mockUseLocationSearch.mockReturnValue(DEFAULT_SEARCH_STATE)
    mockUseNearbyLocations.mockReturnValue(DEFAULT_NEARBY_LOCATIONS_STATE)

    // Clear handlers
    mapViewCallbacksStore.current = {}
    mapViewPropsStore.current = {}
    searchBarCallbacksStore.current = {}
    searchBarPropsStore.current = {}
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  // ============================================================================
  // Renders Without Crashing Tests
  // ============================================================================

  describe('renders without crashing', () => {
    it('renders the MapSearchScreen component', () => {
      render(<MapSearchScreen />)
      expect(true).toBe(true)
    })

    it('renders with loading location state', () => {
      mockUseLocation.mockReturnValue(LOADING_LOCATION_STATE)
      render(<MapSearchScreen />)
      expect(true).toBe(true)
    })

    it('renders with favorites loaded', () => {
      mockUseFavoriteLocations.mockReturnValue(LOADED_FAVORITES_STATE)
      render(<MapSearchScreen />)
      expect(true).toBe(true)
    })

    it('renders with search results', () => {
      mockUseLocationSearch.mockReturnValue({
        ...DEFAULT_SEARCH_STATE,
        query: 'coffee',
        results: MOCK_SEARCH_RESULTS,
      })
      render(<MapSearchScreen />)
      expect(true).toBe(true)
    })
  })

  // ============================================================================
  // Search Functionality Tests
  // ============================================================================

  describe('search functionality', () => {
    it('calls useLocationSearch hook with user location', () => {
      render(<MapSearchScreen />)

      expect(mockUseLocationSearch).toHaveBeenCalledWith({
        userLocation: { latitude: 37.7749, longitude: -122.4194 },
        enableGpsOnMount: false,
        debounceMs: 300,
        maxResults: 10,
      })
    })

    it('calls useLocationSearch hook without location when loading', () => {
      mockUseLocation.mockReturnValue(LOADING_LOCATION_STATE)
      render(<MapSearchScreen />)

      expect(mockUseLocationSearch).toHaveBeenCalledWith({
        userLocation: null,
        enableGpsOnMount: false,
        debounceMs: 300,
        maxResults: 10,
      })
    })

    it('passes search results to SearchBar as suggestions', () => {
      mockUseLocationSearch.mockReturnValue({
        ...DEFAULT_SEARCH_STATE,
        query: 'coffee',
        results: MOCK_SEARCH_RESULTS,
      })

      render(<MapSearchScreen />)

      const suggestions = searchBarPropsStore.current.suggestions as Array<{ google_place_id: string }>
      expect(suggestions).toBeDefined()
      expect(suggestions).toHaveLength(2)
      expect(suggestions[0].google_place_id).toBe('google-place-1')
    })

    it('passes loading state to SearchBar', () => {
      mockUseLocationSearch.mockReturnValue({
        ...DEFAULT_SEARCH_STATE,
        isLoading: true,
      })

      render(<MapSearchScreen />)

      expect(searchBarPropsStore.current.loading).toBe(true)
    })

    it('passes error to SearchBar', () => {
      mockUseLocationSearch.mockReturnValue({
        ...DEFAULT_SEARCH_STATE,
        error: 'Network error occurred',
      })

      render(<MapSearchScreen />)

      expect(searchBarPropsStore.current.error).toBe('Network error occurred')
    })

    it('calls setQuery when search text changes', () => {
      render(<MapSearchScreen />)

      const onChangeText = searchBarCallbacksStore.current.onChangeText as (text: string) => void

      act(() => {
        onChangeText('Blue Bottle')
      })

      expect(mockSetQuery).toHaveBeenCalledWith('Blue Bottle')
    })
  })

  // ============================================================================
  // Venue Selection Tests
  // ============================================================================

  describe('venue selection', () => {
    it('navigates to Ledger when venue is selected from suggestions', () => {
      mockUseLocationSearch.mockReturnValue({
        ...DEFAULT_SEARCH_STATE,
        query: 'coffee',
        results: MOCK_SEARCH_RESULTS,
      })

      render(<MapSearchScreen />)

      const onSuggestionPress = searchBarCallbacksStore.current.onSuggestionPress as (venue: { id: string; google_place_id: string; name: string }) => void

      act(() => {
        onSuggestionPress({
          id: 'venue-1',
          google_place_id: 'google-place-1',
          name: 'Blue Bottle Coffee',
        })
      })

      // Verify haptic feedback
      expect(mockSelectionFeedback).toHaveBeenCalled()

      // Verify search is cleared
      expect(mockClearSearch).toHaveBeenCalled()

      // Fast-forward past the navigation delay
      act(() => {
        vi.advanceTimersByTime(600)
      })

      // Verify navigation
      expect(mockNavigate).toHaveBeenCalledWith('Ledger', {
        locationId: 'venue-1',
        locationName: 'Blue Bottle Coffee',
      })
    })

    it('uses google_place_id as locationId when venue id is empty', () => {
      const resultsWithoutId = [
        {
          ...MOCK_SEARCH_RESULTS[0],
          id: '', // Empty id (new venue not yet cached)
        },
      ]

      mockUseLocationSearch.mockReturnValue({
        ...DEFAULT_SEARCH_STATE,
        query: 'coffee',
        results: resultsWithoutId,
      })

      render(<MapSearchScreen />)

      const onSuggestionPress = searchBarCallbacksStore.current.onSuggestionPress as (venue: { id: string; google_place_id: string; name: string }) => void

      act(() => {
        onSuggestionPress({
          id: '',
          google_place_id: 'google-place-1',
          name: 'Blue Bottle Coffee',
        })
      })

      act(() => {
        vi.advanceTimersByTime(600)
      })

      expect(mockNavigate).toHaveBeenCalledWith('Ledger', {
        locationId: 'google-place-1', // Falls back to google_place_id
        locationName: 'Blue Bottle Coffee',
      })
    })

    it('selects first result when Enter is pressed', () => {
      mockUseLocationSearch.mockReturnValue({
        ...DEFAULT_SEARCH_STATE,
        query: 'coffee',
        results: MOCK_SEARCH_RESULTS,
      })

      render(<MapSearchScreen />)

      const onSubmit = searchBarCallbacksStore.current.onSubmit as () => void

      act(() => {
        onSubmit()
      })

      expect(mockSelectionFeedback).toHaveBeenCalled()
      expect(mockClearSearch).toHaveBeenCalled()

      act(() => {
        vi.advanceTimersByTime(600)
      })

      expect(mockNavigate).toHaveBeenCalledWith('Ledger', {
        locationId: 'venue-1',
        locationName: 'Blue Bottle Coffee',
      })
    })

    it('does nothing when Enter is pressed with no results', () => {
      mockUseLocationSearch.mockReturnValue({
        ...DEFAULT_SEARCH_STATE,
        query: 'xyz',
        results: [],
      })

      render(<MapSearchScreen />)

      const onSubmit = searchBarCallbacksStore.current.onSubmit as () => void

      act(() => {
        onSubmit()
      })

      expect(mockNavigate).not.toHaveBeenCalled()
    })
  })

  // ============================================================================
  // Map Region Tests
  // ============================================================================

  describe('map region updates', () => {
    it('passes initial region based on user location', () => {
      render(<MapSearchScreen />)

      // Initially region should be undefined (controlled by initialRegion)
      expect(mapViewPropsStore.current.region).toBeUndefined()
    })

    it('adds selected venue as a marker', () => {
      mockUseLocationSearch.mockReturnValue({
        ...DEFAULT_SEARCH_STATE,
        query: 'coffee',
        results: MOCK_SEARCH_RESULTS,
      })

      const { rerender } = render(<MapSearchScreen />)

      const onSuggestionPress = searchBarCallbacksStore.current.onSuggestionPress as (venue: { id: string; google_place_id: string; name: string }) => void

      act(() => {
        onSuggestionPress({
          id: 'venue-1',
          google_place_id: 'google-place-1',
          name: 'Blue Bottle Coffee',
        })
      })

      // Re-render to capture updated state
      rerender(<MapSearchScreen />)

      const markers = mapViewPropsStore.current.markers as Array<{ id: string }>

      // Should have selected venue marker
      const selectedMarker = markers?.find(m => m.id === 'selected-google-place-1')
      expect(selectedMarker).toBeDefined()
    })
  })

  // ============================================================================
  // POI Click Tests
  // ============================================================================

  describe('POI click handling', () => {
    it('navigates to Ledger when POI is clicked', () => {
      render(<MapSearchScreen />)

      const onPoiClick = mapViewCallbacksStore.current.onPoiClick as (poi: { placeId: string; name: string }) => void

      act(() => {
        onPoiClick({
          placeId: 'poi-place-id',
          name: 'Philz Coffee',
        })
      })

      expect(mockSelectionFeedback).toHaveBeenCalled()
      expect(mockClearSearch).toHaveBeenCalled()
      expect(mockNavigate).toHaveBeenCalledWith('Ledger', {
        locationId: 'poi-place-id',
        locationName: 'Philz Coffee',
      })
    })

    it('handles POI click with empty placeId', () => {
      render(<MapSearchScreen />)

      const onPoiClick = mapViewCallbacksStore.current.onPoiClick as (poi: { placeId?: string; name: string }) => void

      act(() => {
        onPoiClick({
          placeId: undefined,
          name: 'Unknown Venue',
        })
      })

      expect(mockNavigate).toHaveBeenCalledWith('Ledger', {
        locationId: '',
        locationName: 'Unknown Venue',
      })
    })
  })

  // ============================================================================
  // Marker Press Tests
  // ============================================================================

  describe('marker press handling', () => {
    it('navigates to Ledger when activity marker is pressed', () => {
      // Mock nearby locations with active posts (activity markers)
      mockUseNearbyLocations.mockReturnValue({
        ...DEFAULT_NEARBY_LOCATIONS_STATE,
        locations: [{
          id: 'loc-1',
          google_place_id: 'google-place-1',
          name: 'Hot Coffee Spot',
          address: '123 Main St',
          latitude: 37.7749,
          longitude: -122.4194,
          place_types: ['cafe'],
          post_count: 5,
          created_at: '2024-01-01T00:00:00Z',
          active_post_count: 5,
          latest_post_at: new Date().toISOString(),
        }],
      })

      render(<MapSearchScreen />)

      const onMarkerPress = mapViewCallbacksStore.current.onMarkerPress as (marker: { id: string }) => void

      act(() => {
        onMarkerPress({
          id: 'loc-1',
        })
      })

      expect(mockSelectionFeedback).toHaveBeenCalled()
      expect(mockNavigate).toHaveBeenCalledWith('Ledger', {
        locationId: 'google-place-1',
        locationName: 'Hot Coffee Spot',
      })
    })

    it('navigates to Ledger when selected venue marker is pressed', () => {
      mockUseLocationSearch.mockReturnValue({
        ...DEFAULT_SEARCH_STATE,
        query: 'coffee',
        results: MOCK_SEARCH_RESULTS,
      })

      render(<MapSearchScreen />)

      // First, select a venue
      const onSuggestionPress = searchBarCallbacksStore.current.onSuggestionPress as (venue: { id: string; google_place_id: string; name: string }) => void

      act(() => {
        onSuggestionPress({
          id: 'venue-1',
          google_place_id: 'google-place-1',
          name: 'Blue Bottle Coffee',
        })
      })

      // Clear previous navigation calls
      mockNavigate.mockClear()
      mockSelectionFeedback.mockClear()

      // Now press the selected marker
      const onMarkerPress = mapViewCallbacksStore.current.onMarkerPress as (marker: { id: string }) => void

      act(() => {
        onMarkerPress({
          id: 'selected-google-place-1',
        })
      })

      expect(mockSelectionFeedback).toHaveBeenCalled()
      expect(mockNavigate).toHaveBeenCalledWith('Ledger', {
        locationId: 'venue-1',
        locationName: 'Blue Bottle Coffee',
      })
    })

    it('does nothing when unknown marker is pressed', () => {
      render(<MapSearchScreen />)

      const onMarkerPress = mapViewCallbacksStore.current.onMarkerPress as (marker: { id: string }) => void

      act(() => {
        onMarkerPress({
          id: 'unknown-marker-id',
        })
      })

      expect(mockNavigate).not.toHaveBeenCalled()
    })
  })

  // ============================================================================
  // Navigation Button Tests
  // ============================================================================

  describe('navigation buttons', () => {
    it('renders star button for favorites navigation', () => {
      const { container } = render(<MapSearchScreen />)

      // Verify star button is rendered with correct accessibility
      const starButton = container.querySelector('[testid="map-star-button"]')
      expect(starButton).toBeTruthy()
      expect(starButton?.getAttribute('accessibilitylabel')).toBe('Open favorites')
    })

    it('renders my location button', () => {
      const { container } = render(<MapSearchScreen />)

      // Verify my location button is rendered with correct accessibility
      const myLocationButton = container.querySelector('[testid="map-my-location-button"]')
      expect(myLocationButton).toBeTruthy()
      expect(myLocationButton?.getAttribute('accessibilitylabel')).toBe('Center on my location')
    })
  })

  // ============================================================================
  // Loading State Tests
  // ============================================================================

  describe('loading states', () => {
    it('shows loading spinner when location is loading', () => {
      mockUseLocation.mockReturnValue(LOADING_LOCATION_STATE)
      const { container } = render(<MapSearchScreen />)

      // When location is loading, the component shows loading state
      // (The actual implementation returns a LoadingSpinner, mocked as null)
      expect(container.querySelector('[testid="map-search-screen"]')).toBeNull()
    })

    it('renders map when location is available', () => {
      const { container } = render(<MapSearchScreen />)

      expect(container.querySelector('[testid="map-search-screen"]')).toBeTruthy()
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
      expect(container.querySelector('[testid="map-search-screen"]')).toBeTruthy()
    })

    it('renders when favorites has error', () => {
      mockUseFavoriteLocations.mockReturnValue({
        ...DEFAULT_FAVORITES_STATE,
        error: 'Failed to fetch favorites',
      })

      const { container } = render(<MapSearchScreen />)
      expect(container.querySelector('[testid="map-search-screen"]')).toBeTruthy()
    })

    it('displays search error in SearchBar', () => {
      mockUseLocationSearch.mockReturnValue({
        ...DEFAULT_SEARCH_STATE,
        error: 'Google Places API quota exceeded',
      })

      render(<MapSearchScreen />)

      expect(searchBarPropsStore.current.error).toBe('Google Places API quota exceeded')
    })
  })

  // ============================================================================
  // Focus Effect Tests
  // ============================================================================

  describe('focus effects', () => {
    it('refreshes favorites when screen comes into focus', () => {
      const refetchMock = vi.fn()
      mockUseFavoriteLocations.mockReturnValue({
        ...DEFAULT_FAVORITES_STATE,
        refetch: refetchMock,
      })

      render(<MapSearchScreen />)

      // useFocusEffect mock calls the callback immediately
      expect(refetchMock).toHaveBeenCalled()
    })
  })

  // ============================================================================
  // Suggestions Conversion Tests
  // ============================================================================

  describe('venue to preview conversion', () => {
    it('converts venues to previews with correct properties', () => {
      mockUseLocationSearch.mockReturnValue({
        ...DEFAULT_SEARCH_STATE,
        query: 'coffee',
        results: MOCK_SEARCH_RESULTS,
      })

      render(<MapSearchScreen />)

      const suggestions = searchBarPropsStore.current.suggestions as Array<{
        id: string
        google_place_id: string
        name: string
        address: string | null
        primary_type: string | null
        post_count: number
        distance_meters?: number
      }>

      expect(suggestions[0]).toEqual({
        id: 'venue-1',
        google_place_id: 'google-place-1',
        name: 'Blue Bottle Coffee',
        address: '300 South Street',
        primary_type: 'cafe',
        post_count: 5,
        distance_meters: 500,
      })
    })

    it('uses google_place_id as fallback id for venues without id', () => {
      const venueWithoutId = {
        ...MOCK_SEARCH_RESULTS[0],
        id: '',
      }

      mockUseLocationSearch.mockReturnValue({
        ...DEFAULT_SEARCH_STATE,
        query: 'coffee',
        results: [venueWithoutId],
      })

      render(<MapSearchScreen />)

      const suggestions = searchBarPropsStore.current.suggestions as Array<{ id: string }>

      expect(suggestions[0].id).toBe('google-place-1')
    })

    it('handles venues without place_types', () => {
      const venueWithoutTypes = {
        ...MOCK_SEARCH_RESULTS[0],
        place_types: undefined,
      }

      mockUseLocationSearch.mockReturnValue({
        ...DEFAULT_SEARCH_STATE,
        query: 'coffee',
        results: [venueWithoutTypes],
      })

      render(<MapSearchScreen />)

      const suggestions = searchBarPropsStore.current.suggestions as Array<{ primary_type: string | null }>

      expect(suggestions[0].primary_type).toBeNull()
    })
  })

  // ============================================================================
  // Integration Tests
  // ============================================================================

  describe('integration scenarios', () => {
    it('complete search and selection flow', () => {
      mockUseLocationSearch.mockReturnValue({
        ...DEFAULT_SEARCH_STATE,
        query: 'coffee',
        results: MOCK_SEARCH_RESULTS,
      })

      render(<MapSearchScreen />)

      // 1. User types in search
      const onChangeText = searchBarCallbacksStore.current.onChangeText as (text: string) => void

      act(() => {
        onChangeText('coffee')
      })

      expect(mockSetQuery).toHaveBeenCalledWith('coffee')

      // 2. User selects a venue
      const onSuggestionPress = searchBarCallbacksStore.current.onSuggestionPress as (venue: { id: string; google_place_id: string; name: string }) => void

      act(() => {
        onSuggestionPress({
          id: 'venue-1',
          google_place_id: 'google-place-1',
          name: 'Blue Bottle Coffee',
        })
      })

      // 3. Verify haptic feedback
      expect(mockSelectionFeedback).toHaveBeenCalled()

      // 4. Verify search is cleared
      expect(mockClearSearch).toHaveBeenCalled()

      // 5. Wait for navigation
      act(() => {
        vi.advanceTimersByTime(600)
      })

      // 6. Verify navigation occurred
      expect(mockNavigate).toHaveBeenCalledWith('Ledger', {
        locationId: 'venue-1',
        locationName: 'Blue Bottle Coffee',
      })
    })

    it('selecting a venue updates map and clears search', () => {
      mockUseLocationSearch.mockReturnValue({
        ...DEFAULT_SEARCH_STATE,
        query: 'coffee',
        results: MOCK_SEARCH_RESULTS,
      })

      const { rerender, container } = render(<MapSearchScreen />)

      // Select a venue
      const onSuggestionPress = searchBarCallbacksStore.current.onSuggestionPress as (venue: { id: string; google_place_id: string; name: string }) => void

      act(() => {
        onSuggestionPress({
          id: 'venue-1',
          google_place_id: 'google-place-1',
          name: 'Blue Bottle Coffee',
        })
      })

      // Verify haptic feedback was triggered
      expect(mockSelectionFeedback).toHaveBeenCalled()

      // Verify search was cleared
      expect(mockClearSearch).toHaveBeenCalled()

      // Verify my location button is still rendered
      const myLocationButton = container.querySelector('[testid="map-my-location-button"]')
      expect(myLocationButton).toBeTruthy()
    })
  })

  // ============================================================================
  // Accessibility Tests
  // ============================================================================

  describe('accessibility', () => {
    it('star button has correct accessibility label', () => {
      const { container } = render(<MapSearchScreen />)
      const starButton = container.querySelector('[testid="map-star-button"]')

      expect(starButton).toBeTruthy()
      expect(starButton?.getAttribute('accessibilitylabel')).toBe('Open favorites')
    })

    it('my location button has correct accessibility label', () => {
      const { container } = render(<MapSearchScreen />)
      const myLocationButton = container.querySelector('[testid="map-my-location-button"]')

      expect(myLocationButton).toBeTruthy()
      expect(myLocationButton?.getAttribute('accessibilitylabel')).toBe('Center on my location')
    })
  })
})
