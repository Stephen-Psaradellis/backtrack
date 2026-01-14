/**
 * Tests for lib/dev/mock-google-maps.ts
 *
 * Tests mock Google Maps components, hooks, and services for development mode.
 */

import { describe, it, expect, vi } from 'vitest'
import React from 'react'
import {
  MockAPIProvider,
  MockMap,
  MockMarker,
  MockAdvancedMarker,
  MockInfoWindow,
  useMockMap,
  useMockApiIsLoaded,
  useMockMapsLibrary,
  createMockAutocompleteService,
  createMockPlacesService,
  createMockGeocoder,
  createMockLatLng,
  createMockLatLngBounds,
  MockGoogleMaps,
  type MockAPIProviderProps,
  type MockMapProps,
  type MockMarkerProps,
  type MockAdvancedMarkerProps,
  type MockInfoWindowProps,
  type MockMapMouseEvent,
  type MockCameraChangedEvent,
  type MockMapInstance,
  type MockBounds,
  type MockPlace,
  type MockAutocompleteService,
  type MockAutocompletePrediction,
} from '../mock-google-maps'

// ============================================================================
// MOCK COMPONENTS TESTS
// ============================================================================

describe('MockAPIProvider', () => {
  it('should render children', () => {
    const element = MockAPIProvider({ children: React.createElement('div', { id: 'test' }) })
    expect(element).toBeDefined()
    expect(element.type).toBe(React.Fragment)
  })

  it('should accept apiKey prop without error', () => {
    const element = MockAPIProvider({
      apiKey: 'test-api-key',
      children: React.createElement('span'),
    })
    expect(element).toBeDefined()
  })

  it('should work without children', () => {
    const element = MockAPIProvider({})
    expect(element).toBeDefined()
  })
})

describe('MockMap', () => {
  it('should render with default props', () => {
    const element = MockMap({})
    expect(element).toBeDefined()
    expect(element.type).toBe('div')
    expect(element.props['data-testid']).toBe('mock-google-map')
  })

  it('should use center when provided', () => {
    const center = { lat: 40.7128, lng: -74.006 }
    const element = MockMap({ center })
    expect(element).toBeDefined()
    // The center coordinates should be in the rendered output
  })

  it('should use defaultCenter when center is not provided', () => {
    const defaultCenter = { lat: 34.0522, lng: -118.2437 }
    const element = MockMap({ defaultCenter })
    expect(element).toBeDefined()
  })

  it('should prefer center over defaultCenter', () => {
    const center = { lat: 40.7128, lng: -74.006 }
    const defaultCenter = { lat: 34.0522, lng: -118.2437 }
    const element = MockMap({ center, defaultCenter })
    expect(element).toBeDefined()
  })

  it('should use (0, 0) when no center is provided', () => {
    const element = MockMap({})
    expect(element).toBeDefined()
  })

  it('should apply custom style', () => {
    const customStyle = { backgroundColor: 'blue', height: '500px' }
    const element = MockMap({ style: customStyle })
    expect(element.props.style).toMatchObject(customStyle)
  })

  it('should apply className', () => {
    const element = MockMap({ className: 'custom-class' })
    expect(element.props.className).toBe('custom-class')
  })

  it('should render children', () => {
    const child = React.createElement('div', { id: 'child' })
    const element = MockMap({ children: child })
    expect(element).toBeDefined()
  })
})

describe('MockMarker', () => {
  it('should return null', () => {
    const result = MockMarker({ position: { lat: 0, lng: 0 } })
    expect(result).toBeNull()
  })

  it('should accept all props without error', () => {
    const props: MockMarkerProps = {
      position: { lat: 40.7128, lng: -74.006 },
      title: 'Test Marker',
      onClick: vi.fn(),
      draggable: true,
      onDragEnd: vi.fn(),
      children: React.createElement('div'),
    }
    const result = MockMarker(props)
    expect(result).toBeNull()
  })
})

describe('MockAdvancedMarker', () => {
  it('should return null when no children', () => {
    const result = MockAdvancedMarker({ position: { lat: 0, lng: 0 } })
    expect(result).toBeNull()
  })

  it('should render children when provided', () => {
    const child = React.createElement('span', null, 'Custom Marker')
    const result = MockAdvancedMarker({
      position: { lat: 0, lng: 0 },
      children: child,
    })
    expect(result).toBeDefined()
    expect(result?.type).toBe(React.Fragment)
  })

  it('should accept all props', () => {
    const props: MockAdvancedMarkerProps = {
      position: { lat: 40.7128, lng: -74.006 },
      title: 'Advanced Marker',
      onClick: vi.fn(),
      children: React.createElement('div'),
    }
    const result = MockAdvancedMarker(props)
    expect(result).toBeDefined()
  })
})

describe('MockInfoWindow', () => {
  it('should return null when no children', () => {
    const result = MockInfoWindow({})
    expect(result).toBeNull()
  })

  it('should render children when provided', () => {
    const child = React.createElement('div', null, 'Info content')
    const result = MockInfoWindow({ children: child })
    expect(result).toBeDefined()
    expect(result?.type).toBe('div')
    expect(result?.props['data-testid']).toBe('mock-info-window')
  })

  it('should render close button when onCloseClick is provided', () => {
    const onCloseClick = vi.fn()
    const child = React.createElement('div', null, 'Info content')
    const result = MockInfoWindow({ children: child, onCloseClick })
    expect(result).toBeDefined()
    // The result should contain a button element
  })

  it('should accept position prop', () => {
    const result = MockInfoWindow({
      position: { lat: 40.7128, lng: -74.006 },
      children: React.createElement('span'),
    })
    expect(result).toBeDefined()
  })

  it('should accept anchor prop', () => {
    const result = MockInfoWindow({
      anchor: { someMarker: true },
      children: React.createElement('span'),
    })
    expect(result).toBeDefined()
  })
})

// ============================================================================
// MOCK HOOKS TESTS
// ============================================================================

describe('useMockMap', () => {
  it('should return a mock map instance', () => {
    const map = useMockMap()
    expect(map).toBeDefined()
  })

  it('should have panTo method', () => {
    const map = useMockMap()
    expect(map?.panTo).toBeInstanceOf(Function)
    // Should not throw
    map?.panTo({ lat: 40, lng: -74 })
  })

  it('should have setZoom method', () => {
    const map = useMockMap()
    expect(map?.setZoom).toBeInstanceOf(Function)
    // Should not throw
    map?.setZoom(15)
  })

  it('should have setCenter method', () => {
    const map = useMockMap()
    expect(map?.setCenter).toBeInstanceOf(Function)
    // Should not throw
    map?.setCenter({ lat: 40, lng: -74 })
  })

  it('should have getZoom method returning 12', () => {
    const map = useMockMap()
    expect(map?.getZoom()).toBe(12)
  })

  it('should have getCenter method returning SF coordinates', () => {
    const map = useMockMap()
    const center = map?.getCenter()
    expect(center?.lat()).toBe(37.7749)
    expect(center?.lng()).toBe(-122.4194)
  })

  it('should have getBounds method returning mock bounds', () => {
    const map = useMockMap()
    const bounds = map?.getBounds()
    expect(bounds).toBeDefined()
    expect(bounds?.north).toBe(37.8)
    expect(bounds?.south).toBe(37.7)
    expect(bounds?.east).toBe(-122.3)
    expect(bounds?.west).toBe(-122.5)
  })

  it('should have fitBounds method', () => {
    const map = useMockMap()
    const bounds: MockBounds = {
      north: 38,
      south: 37,
      east: -122,
      west: -123,
      extend: vi.fn(),
    }
    expect(map?.fitBounds).toBeInstanceOf(Function)
    // Should not throw
    map?.fitBounds(bounds)
  })
})

describe('useMockApiIsLoaded', () => {
  it('should return true', () => {
    const isLoaded = useMockApiIsLoaded()
    expect(isLoaded).toBe(true)
  })
})

describe('useMockMapsLibrary', () => {
  it('should return null for any library', () => {
    expect(useMockMapsLibrary('places')).toBeNull()
    expect(useMockMapsLibrary('geometry')).toBeNull()
    expect(useMockMapsLibrary('drawing')).toBeNull()
  })
})

// ============================================================================
// MOCK SERVICES TESTS
// ============================================================================

describe('createMockAutocompleteService', () => {
  it('should create an autocomplete service', () => {
    const service = createMockAutocompleteService()
    expect(service).toBeDefined()
    expect(service.getPlacePredictions).toBeInstanceOf(Function)
  })

  it('should return mock predictions', () => {
    const service = createMockAutocompleteService()
    const callback = vi.fn()

    service.getPlacePredictions({ input: 'coffee' }, callback)

    expect(callback).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          place_id: 'mock-place-1',
          description: 'Mock Coffee Shop, 123 Dev Street',
        }),
        expect.objectContaining({
          place_id: 'mock-place-2',
          description: 'Mock Restaurant, 456 Test Avenue',
        }),
      ]),
      'OK'
    )
  })

  it('should return predictions with structured formatting', () => {
    const service = createMockAutocompleteService()
    const callback = vi.fn()

    service.getPlacePredictions({ input: 'test', types: ['establishment'] }, callback)

    const predictions = callback.mock.calls[0][0] as MockAutocompletePrediction[]
    expect(predictions[0].structured_formatting).toEqual({
      main_text: 'Mock Coffee Shop',
      secondary_text: '123 Dev Street, Mock City',
    })
  })
})

describe('createMockPlacesService', () => {
  it('should create a places service', () => {
    const service = createMockPlacesService()
    expect(service).toBeDefined()
    expect(service.getDetails).toBeInstanceOf(Function)
  })

  it('should return mock place details', () => {
    const service = createMockPlacesService()
    const callback = vi.fn()

    service.getDetails({ placeId: 'test-place-id' }, callback)

    expect(callback).toHaveBeenCalledWith(
      expect.objectContaining({
        place_id: 'test-place-id',
        name: 'Mock Location',
        formatted_address: '123 Development Street, Mock City, MC 12345',
      }),
      'OK'
    )
  })

  it('should return place with geometry', () => {
    const service = createMockPlacesService()
    const callback = vi.fn()

    service.getDetails({ placeId: 'test' }, callback)

    const place = callback.mock.calls[0][0] as MockPlace
    expect(place.geometry.location.lat()).toBe(37.7749)
    expect(place.geometry.location.lng()).toBe(-122.4194)
  })

  it('should return place with types', () => {
    const service = createMockPlacesService()
    const callback = vi.fn()

    service.getDetails({ placeId: 'test' }, callback)

    const place = callback.mock.calls[0][0] as MockPlace
    expect(place.types).toContain('establishment')
    expect(place.types).toContain('point_of_interest')
  })
})

describe('createMockGeocoder', () => {
  it('should create a geocoder', () => {
    const geocoder = createMockGeocoder()
    expect(geocoder).toBeDefined()
    expect(geocoder.geocode).toBeInstanceOf(Function)
  })

  it('should geocode by address', () => {
    const geocoder = createMockGeocoder()
    const callback = vi.fn()

    geocoder.geocode({ address: '123 Main St' }, callback)

    expect(callback).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          name: '123 Main St',
          formatted_address: '123 Main St',
        }),
      ]),
      'OK'
    )
  })

  it('should geocode by location', () => {
    const geocoder = createMockGeocoder()
    const callback = vi.fn()
    const location = { lat: 40.7128, lng: -74.006 }

    geocoder.geocode({ location }, callback)

    const results = callback.mock.calls[0][0] as MockPlace[]
    expect(results[0].geometry.location.lat()).toBe(40.7128)
    expect(results[0].geometry.location.lng()).toBe(-74.006)
  })

  it('should use default coordinates when location not provided', () => {
    const geocoder = createMockGeocoder()
    const callback = vi.fn()

    geocoder.geocode({ address: 'test' }, callback)

    const results = callback.mock.calls[0][0] as MockPlace[]
    expect(results[0].geometry.location.lat()).toBe(37.7749)
    expect(results[0].geometry.location.lng()).toBe(-122.4194)
  })

  it('should return street_address type', () => {
    const geocoder = createMockGeocoder()
    const callback = vi.fn()

    geocoder.geocode({ address: 'test' }, callback)

    const results = callback.mock.calls[0][0] as MockPlace[]
    expect(results[0].types).toContain('street_address')
  })
})

// ============================================================================
// UTILITY FUNCTIONS TESTS
// ============================================================================

describe('createMockLatLng', () => {
  it('should create a LatLng object with getter functions', () => {
    const latLng = createMockLatLng(40.7128, -74.006)
    expect(latLng.lat()).toBe(40.7128)
    expect(latLng.lng()).toBe(-74.006)
  })

  it('should work with various coordinates', () => {
    const equator = createMockLatLng(0, 0)
    expect(equator.lat()).toBe(0)
    expect(equator.lng()).toBe(0)

    const northPole = createMockLatLng(90, 0)
    expect(northPole.lat()).toBe(90)

    const negative = createMockLatLng(-33.8688, 151.2093)
    expect(negative.lat()).toBe(-33.8688)
    expect(negative.lng()).toBe(151.2093)
  })
})

describe('createMockLatLngBounds', () => {
  it('should create an empty bounds object', () => {
    const bounds = createMockLatLngBounds()
    expect(bounds).toBeDefined()
    expect(bounds.extend).toBeInstanceOf(Function)
  })

  it('should extend bounds with single point', () => {
    const bounds = createMockLatLngBounds()
    bounds.extend({ lat: 40.7128, lng: -74.006 })

    expect(bounds.north).toBe(40.7128)
    expect(bounds.south).toBe(40.7128)
    expect(bounds.east).toBe(-74.006)
    expect(bounds.west).toBe(-74.006)
  })

  it('should extend bounds with multiple points', () => {
    const bounds = createMockLatLngBounds()
    bounds.extend({ lat: 40.7128, lng: -74.006 }) // NYC
    bounds.extend({ lat: 34.0522, lng: -118.2437 }) // LA

    expect(bounds.north).toBe(40.7128)
    expect(bounds.south).toBe(34.0522)
    expect(bounds.east).toBe(-74.006)
    expect(bounds.west).toBe(-118.2437)
  })

  it('should track northernmost and southernmost points', () => {
    const bounds = createMockLatLngBounds()
    bounds.extend({ lat: 10, lng: 0 })
    bounds.extend({ lat: 50, lng: 0 })
    bounds.extend({ lat: 30, lng: 0 })

    expect(bounds.north).toBe(50)
    expect(bounds.south).toBe(10)
  })

  it('should track easternmost and westernmost points', () => {
    const bounds = createMockLatLngBounds()
    bounds.extend({ lat: 0, lng: -120 })
    bounds.extend({ lat: 0, lng: -70 })
    bounds.extend({ lat: 0, lng: -100 })

    expect(bounds.east).toBe(-70)
    expect(bounds.west).toBe(-120)
  })
})

// ============================================================================
// DEFAULT EXPORT TESTS
// ============================================================================

describe('MockGoogleMaps default export', () => {
  it('should export all components', () => {
    expect(MockGoogleMaps.APIProvider).toBe(MockAPIProvider)
    expect(MockGoogleMaps.Map).toBe(MockMap)
    expect(MockGoogleMaps.Marker).toBe(MockMarker)
    expect(MockGoogleMaps.AdvancedMarker).toBe(MockAdvancedMarker)
    expect(MockGoogleMaps.InfoWindow).toBe(MockInfoWindow)
  })

  it('should export all hooks', () => {
    expect(MockGoogleMaps.useMap).toBe(useMockMap)
    expect(MockGoogleMaps.useApiIsLoaded).toBe(useMockApiIsLoaded)
    expect(MockGoogleMaps.useMapsLibrary).toBe(useMockMapsLibrary)
  })

  it('should export all service creators', () => {
    expect(MockGoogleMaps.createAutocompleteService).toBe(createMockAutocompleteService)
    expect(MockGoogleMaps.createPlacesService).toBe(createMockPlacesService)
    expect(MockGoogleMaps.createGeocoder).toBe(createMockGeocoder)
  })

  it('should export utility functions', () => {
    expect(MockGoogleMaps.createLatLng).toBe(createMockLatLng)
    expect(MockGoogleMaps.createLatLngBounds).toBe(createMockLatLngBounds)
  })
})

// ============================================================================
// TYPE INTERFACE TESTS
// ============================================================================

describe('Type interfaces', () => {
  it('should allow valid MockMapMouseEvent', () => {
    const event: MockMapMouseEvent = {
      latLng: {
        lat: () => 40.7128,
        lng: () => -74.006,
      },
      domEvent: new MouseEvent('click'),
    }
    expect(event.latLng?.lat()).toBe(40.7128)
    expect(event.latLng?.lng()).toBe(-74.006)
  })

  it('should allow null latLng in MockMapMouseEvent', () => {
    const event: MockMapMouseEvent = {
      latLng: null,
    }
    expect(event.latLng).toBeNull()
  })

  it('should allow valid MockCameraChangedEvent', () => {
    const event: MockCameraChangedEvent = {
      detail: {
        center: { lat: 40.7128, lng: -74.006 },
        zoom: 15,
        heading: 0,
        tilt: 0,
        bounds: {
          north: 40.8,
          south: 40.6,
          east: -73.9,
          west: -74.1,
        },
      },
    }
    expect(event.detail.center.lat).toBe(40.7128)
    expect(event.detail.zoom).toBe(15)
  })

  it('should allow valid MockMapInstance', () => {
    const instance: MockMapInstance = {
      panTo: vi.fn(),
      setZoom: vi.fn(),
      setCenter: vi.fn(),
      getZoom: () => 12,
      getCenter: () => ({ lat: () => 40, lng: () => -74 }),
      getBounds: () => ({
        north: 41,
        south: 39,
        east: -73,
        west: -75,
        extend: vi.fn(),
      }),
      fitBounds: vi.fn(),
    }
    expect(instance.getZoom()).toBe(12)
  })

  it('should allow valid MockBounds', () => {
    const bounds: MockBounds = {
      north: 40.8,
      south: 40.6,
      east: -73.9,
      west: -74.1,
      extend: vi.fn(),
    }
    expect(bounds.north).toBe(40.8)
    expect(bounds.south).toBe(40.6)
  })

  it('should allow valid MockPlace', () => {
    const place: MockPlace = {
      place_id: 'test-123',
      name: 'Test Place',
      formatted_address: '123 Test St, Test City',
      geometry: {
        location: {
          lat: () => 40.7128,
          lng: () => -74.006,
        },
      },
      types: ['establishment', 'cafe'],
    }
    expect(place.name).toBe('Test Place')
    expect(place.geometry.location.lat()).toBe(40.7128)
  })

  it('should allow valid MockAutocompletePrediction', () => {
    const prediction: MockAutocompletePrediction = {
      place_id: 'pred-123',
      description: 'Test Place, Test Street',
      structured_formatting: {
        main_text: 'Test Place',
        secondary_text: 'Test Street',
      },
    }
    expect(prediction.structured_formatting.main_text).toBe('Test Place')
  })

  it('should allow valid MockAutocompleteService', () => {
    const service: MockAutocompleteService = {
      getPlacePredictions: vi.fn(),
    }
    expect(service.getPlacePredictions).toBeInstanceOf(Function)
  })
})
