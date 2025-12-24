/**
 * Mock Google Maps Provider for Development Mode
 *
 * Provides placeholder components for @vis.gl/react-google-maps when
 * the Google Maps API key is not configured. This allows development
 * without requiring a valid API key.
 *
 * Key features:
 * - Mock APIProvider that doesn't require a real API key
 * - Mock Map component that renders a placeholder
 * - Mock Marker and other components for basic functionality
 * - Compatible with the @vis.gl/react-google-maps API
 */

import React from 'react'

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Props for the mock APIProvider
 */
export interface MockAPIProviderProps {
  apiKey?: string
  children?: React.ReactNode
}

/**
 * Props for the mock Map component
 */
export interface MockMapProps {
  center?: { lat: number; lng: number }
  zoom?: number
  style?: React.CSSProperties
  className?: string
  children?: React.ReactNode
  onClick?: (event: MockMapMouseEvent) => void
  onCameraChanged?: (event: MockCameraChangedEvent) => void
  defaultCenter?: { lat: number; lng: number }
  defaultZoom?: number
  mapId?: string
  gestureHandling?: string
  disableDefaultUI?: boolean
}

/**
 * Props for the mock Marker component
 */
export interface MockMarkerProps {
  position: { lat: number; lng: number }
  title?: string
  onClick?: () => void
  draggable?: boolean
  onDragEnd?: (event: MockMapMouseEvent) => void
  children?: React.ReactNode
}

/**
 * Props for the mock AdvancedMarker component
 */
export interface MockAdvancedMarkerProps {
  position: { lat: number; lng: number }
  title?: string
  onClick?: () => void
  children?: React.ReactNode
}

/**
 * Props for the mock InfoWindow component
 */
export interface MockInfoWindowProps {
  position?: { lat: number; lng: number }
  anchor?: unknown
  onCloseClick?: () => void
  children?: React.ReactNode
}

/**
 * Mock map mouse event
 */
export interface MockMapMouseEvent {
  latLng: {
    lat: () => number
    lng: () => number
  } | null
  domEvent?: MouseEvent
}

/**
 * Mock camera changed event
 */
export interface MockCameraChangedEvent {
  detail: {
    center: { lat: number; lng: number }
    zoom: number
    heading: number
    tilt: number
    bounds: {
      north: number
      south: number
      east: number
      west: number
    }
  }
}

/**
 * Mock map instance returned by useMap
 */
export interface MockMapInstance {
  panTo: (latLng: { lat: number; lng: number }) => void
  setZoom: (zoom: number) => void
  setCenter: (center: { lat: number; lng: number }) => void
  getZoom: () => number
  getCenter: () => { lat: () => number; lng: () => number }
  getBounds: () => MockBounds | null
  fitBounds: (bounds: MockBounds) => void
}

/**
 * Mock bounds object
 */
export interface MockBounds {
  north: number
  south: number
  east: number
  west: number
  extend: (point: { lat: number; lng: number }) => void
}

/**
 * Mock places library types
 */
export interface MockPlace {
  place_id: string
  name: string
  formatted_address: string
  geometry: {
    location: {
      lat: () => number
      lng: () => number
    }
  }
  types: string[]
}

export interface MockAutocompleteService {
  getPlacePredictions: (
    request: { input: string; types?: string[] },
    callback: (predictions: MockAutocompletePrediction[] | null, status: string) => void
  ) => void
}

export interface MockAutocompletePrediction {
  place_id: string
  description: string
  structured_formatting: {
    main_text: string
    secondary_text: string
  }
}

// ============================================================================
// MOCK COMPONENTS
// ============================================================================

/**
 * Mock APIProvider component
 *
 * Wraps children without requiring a real Google Maps API key.
 * In production, use the real APIProvider from @vis.gl/react-google-maps.
 */
export function MockAPIProvider({ children }: MockAPIProviderProps): JSX.Element {
  return React.createElement(React.Fragment, null, children)
}

/**
 * Default styles for the mock map placeholder
 */
const defaultMapStyle: React.CSSProperties = {
  width: '100%',
  height: '100%',
  minHeight: '200px',
  backgroundColor: '#e5e3df',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: '8px',
  border: '2px dashed #9ca3af',
  color: '#6b7280',
  fontFamily: 'system-ui, -apple-system, sans-serif',
}

/**
 * Mock Map component
 *
 * Renders a placeholder div instead of a real Google Map.
 * Shows a message indicating that the map is in development mode.
 */
export function MockMap({
  style,
  className,
  children,
  center,
  defaultCenter,
}: MockMapProps): JSX.Element {
  const displayCenter = center || defaultCenter || { lat: 0, lng: 0 }

  return React.createElement(
    'div',
    {
      style: { ...defaultMapStyle, ...style },
      className,
      'data-testid': 'mock-google-map',
    },
    React.createElement(
      'div',
      { style: { textAlign: 'center', padding: '20px' } },
      React.createElement(
        'div',
        { style: { fontSize: '48px', marginBottom: '12px' } },
        '🗺️'
      ),
      React.createElement(
        'div',
        { style: { fontSize: '16px', fontWeight: '600', marginBottom: '8px' } },
        'Map Placeholder'
      ),
      React.createElement(
        'div',
        { style: { fontSize: '14px', marginBottom: '4px' } },
        'Development Mode - No API Key'
      ),
      React.createElement(
        'div',
        { style: { fontSize: '12px', opacity: 0.7 } },
        `Center: ${displayCenter.lat.toFixed(4)}, ${displayCenter.lng.toFixed(4)}`
      )
    ),
    children
  )
}

/**
 * Mock Marker component
 *
 * Renders nothing visible but accepts the same props as the real Marker.
 * Useful for maintaining component structure without errors.
 */
export function MockMarker(_props: MockMarkerProps): JSX.Element | null {
  // Markers don't render anything in mock mode
  return null
}

/**
 * Mock AdvancedMarker component
 *
 * Renders nothing visible but accepts the same props as the real AdvancedMarker.
 */
export function MockAdvancedMarker({ children }: MockAdvancedMarkerProps): JSX.Element | null {
  // In mock mode, just return children if any (for custom marker content)
  return children ? React.createElement(React.Fragment, null, children) : null
}

/**
 * Mock InfoWindow component
 *
 * Renders children in a simple styled div when provided.
 */
export function MockInfoWindow({ children, onCloseClick }: MockInfoWindowProps): JSX.Element | null {
  if (!children) return null

  const infoWindowStyle: React.CSSProperties = {
    position: 'absolute',
    backgroundColor: 'white',
    padding: '12px',
    borderRadius: '8px',
    boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
    maxWidth: '300px',
    zIndex: 1000,
  }

  return React.createElement(
    'div',
    {
      style: infoWindowStyle,
      'data-testid': 'mock-info-window',
    },
    onCloseClick &&
      React.createElement(
        'button',
        {
          onClick: onCloseClick,
          style: {
            position: 'absolute',
            top: '4px',
            right: '4px',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: '16px',
          },
          'aria-label': 'Close',
        },
        '×'
      ),
    children
  )
}

// ============================================================================
// MOCK HOOKS
// ============================================================================

/**
 * Mock useMap hook
 *
 * Returns a mock map instance with no-op methods.
 */
export function useMockMap(): MockMapInstance | null {
  const mockBounds: MockBounds = {
    north: 37.8,
    south: 37.7,
    east: -122.3,
    west: -122.5,
    extend: () => {},
  }

  return {
    panTo: () => {},
    setZoom: () => {},
    setCenter: () => {},
    getZoom: () => 12,
    getCenter: () => ({
      lat: () => 37.7749,
      lng: () => -122.4194,
    }),
    getBounds: () => mockBounds,
    fitBounds: () => {},
  }
}

/**
 * Mock useApiIsLoaded hook
 *
 * Always returns true in mock mode since there's no API to load.
 */
export function useMockApiIsLoaded(): boolean {
  return true
}

/**
 * Mock useMapsLibrary hook
 *
 * Returns null since no actual library is loaded in mock mode.
 */
export function useMockMapsLibrary(_libraryName: string): unknown | null {
  return null
}

// ============================================================================
// MOCK SERVICES
// ============================================================================

/**
 * Creates a mock Autocomplete service for place searches
 */
export function createMockAutocompleteService(): MockAutocompleteService {
  return {
    getPlacePredictions: (_request, callback) => {
      // Return mock predictions for development
      const mockPredictions: MockAutocompletePrediction[] = [
        {
          place_id: 'mock-place-1',
          description: 'Mock Coffee Shop, 123 Dev Street',
          structured_formatting: {
            main_text: 'Mock Coffee Shop',
            secondary_text: '123 Dev Street, Mock City',
          },
        },
        {
          place_id: 'mock-place-2',
          description: 'Mock Restaurant, 456 Test Avenue',
          structured_formatting: {
            main_text: 'Mock Restaurant',
            secondary_text: '456 Test Avenue, Mock City',
          },
        },
      ]
      callback(mockPredictions, 'OK')
    },
  }
}

/**
 * Creates a mock Places service for place details
 */
export function createMockPlacesService(): {
  getDetails: (
    request: { placeId: string },
    callback: (place: MockPlace | null, status: string) => void
  ) => void
} {
  return {
    getDetails: (request, callback) => {
      const mockPlace: MockPlace = {
        place_id: request.placeId,
        name: 'Mock Location',
        formatted_address: '123 Development Street, Mock City, MC 12345',
        geometry: {
          location: {
            lat: () => 37.7749,
            lng: () => -122.4194,
          },
        },
        types: ['establishment', 'point_of_interest'],
      }
      callback(mockPlace, 'OK')
    },
  }
}

/**
 * Creates a mock Geocoder service
 */
export function createMockGeocoder(): {
  geocode: (
    request: { address?: string; location?: { lat: number; lng: number } },
    callback: (results: MockPlace[] | null, status: string) => void
  ) => void
} {
  return {
    geocode: (request, callback) => {
      const mockResult: MockPlace = {
        place_id: 'mock-geocode-result',
        name: request.address || 'Mock Location',
        formatted_address:
          request.address || '123 Development Street, Mock City, MC 12345',
        geometry: {
          location: {
            lat: () => request.location?.lat || 37.7749,
            lng: () => request.location?.lng || -122.4194,
          },
        },
        types: ['street_address'],
      }
      callback([mockResult], 'OK')
    },
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Creates a mock LatLng object
 */
export function createMockLatLng(lat: number, lng: number): { lat: () => number; lng: () => number } {
  return {
    lat: () => lat,
    lng: () => lng,
  }
}

/**
 * Creates a mock LatLngBounds object
 */
export function createMockLatLngBounds(): MockBounds {
  let north = -Infinity
  let south = Infinity
  let east = -Infinity
  let west = Infinity

  return {
    get north() {
      return north
    },
    get south() {
      return south
    },
    get east() {
      return east
    },
    get west() {
      return west
    },
    extend(point: { lat: number; lng: number }) {
      north = Math.max(north, point.lat)
      south = Math.min(south, point.lat)
      east = Math.max(east, point.lng)
      west = Math.min(west, point.lng)
    },
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

/**
 * Default export for convenient importing
 */
export const MockGoogleMaps = {
  APIProvider: MockAPIProvider,
  Map: MockMap,
  Marker: MockMarker,
  AdvancedMarker: MockAdvancedMarker,
  InfoWindow: MockInfoWindow,
  useMap: useMockMap,
  useApiIsLoaded: useMockApiIsLoaded,
  useMapsLibrary: useMockMapsLibrary,
  createAutocompleteService: createMockAutocompleteService,
  createPlacesService: createMockPlacesService,
  createGeocoder: createMockGeocoder,
  createLatLng: createMockLatLng,
  createLatLngBounds: createMockLatLngBounds,
}

export default MockGoogleMaps
