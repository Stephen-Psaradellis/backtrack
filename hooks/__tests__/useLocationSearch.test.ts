/**
 * Tests for hooks/useLocationSearch.ts
 *
 * Tests location search hook with debouncing and GPS integration.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'

// Mock expo-location
const mockRequestForegroundPermissionsAsync = vi.fn()
const mockGetCurrentPositionAsync = vi.fn()
const mockHasServicesEnabledAsync = vi.fn()

vi.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: () => mockRequestForegroundPermissionsAsync(),
  getCurrentPositionAsync: (...args: unknown[]) => mockGetCurrentPositionAsync(...args),
  hasServicesEnabledAsync: () => mockHasServicesEnabledAsync(),
  PermissionStatus: {
    GRANTED: 'granted',
    DENIED: 'denied',
    UNDETERMINED: 'undetermined',
  },
  Accuracy: {
    High: 6,
    Balanced: 3,
  },
}))

// Mock NetInfo
vi.mock('@react-native-community/netinfo', () => ({
  default: {
    fetch: vi.fn().mockResolvedValue({ isConnected: true }),
  },
}))

// Mock supabase
vi.mock('../../lib/supabase', () => ({
  supabase: {},
}))

// Mock searchVenues
vi.mock('../../services/locationService', () => ({
  searchVenues: vi.fn().mockResolvedValue({
    combined_results: [],
    is_offline: false,
  }),
  LOCATION_SERVICE_ERRORS: {
    UNKNOWN_ERROR: 'Unknown error',
  },
}))

import { useLocationSearch } from '../useLocationSearch'

describe('useLocationSearch', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Default: services enabled
    mockHasServicesEnabledAsync.mockResolvedValue(true)

    // Default: permission granted
    mockRequestForegroundPermissionsAsync.mockResolvedValue({ status: 'granted' })

    // Default location
    mockGetCurrentPositionAsync.mockResolvedValue({
      coords: {
        latitude: 40.7128,
        longitude: -74.006,
        accuracy: 10,
      },
      timestamp: Date.now(),
    })
  })

  describe('initial state', () => {
    it('should start with empty query', () => {
      const { result } = renderHook(() => useLocationSearch())

      expect(result.current.query).toBe('')
    })

    it('should start with empty results', () => {
      const { result } = renderHook(() => useLocationSearch())

      expect(result.current.results).toEqual([])
    })

    it('should start with loading false', () => {
      const { result } = renderHook(() => useLocationSearch())

      expect(result.current.isLoading).toBe(false)
    })

    it('should start with no error', () => {
      const { result } = renderHook(() => useLocationSearch())

      expect(result.current.error).toBeNull()
    })

    it('should start with isOffline false by default', () => {
      const { result } = renderHook(() => useLocationSearch())

      expect(result.current.isOffline).toBe(false)
    })

    it('should start with empty activeFilters', () => {
      const { result } = renderHook(() => useLocationSearch())

      expect(result.current.activeFilters).toEqual([])
    })

    it('should start with lastSearchedAt null', () => {
      const { result } = renderHook(() => useLocationSearch())

      expect(result.current.lastSearchedAt).toBeNull()
    })

    it('should start with undetermined permission status', () => {
      const { result } = renderHook(() => useLocationSearch())

      expect(result.current.locationPermissionStatus).toBe('undetermined')
    })

    it('should start with null gpsLocation', () => {
      const { result } = renderHook(() => useLocationSearch())

      expect(result.current.gpsLocation).toBeNull()
    })

    it('should start with isGpsLoading false', () => {
      const { result } = renderHook(() => useLocationSearch())

      expect(result.current.isGpsLoading).toBe(false)
    })

    it('should start with null gpsError', () => {
      const { result } = renderHook(() => useLocationSearch())

      expect(result.current.gpsError).toBeNull()
    })
  })

  describe('options', () => {
    it('should accept userLocation prop', () => {
      const { result } = renderHook(() =>
        useLocationSearch({
          userLocation: { latitude: 37.7749, longitude: -122.4194 },
        })
      )

      expect(result.current.gpsLocation).toBeNull()
    })

    it('should accept isOffline prop', () => {
      const { result } = renderHook(() =>
        useLocationSearch({ isOffline: true })
      )

      expect(result.current.isOffline).toBe(true)
    })

    it('should accept initialFilters prop', () => {
      const { result } = renderHook(() =>
        useLocationSearch({ initialFilters: ['cafe', 'bar'] })
      )

      expect(result.current.activeFilters).toEqual(['cafe', 'bar'])
    })
  })

  describe('setQuery', () => {
    it('should update query state', () => {
      const { result } = renderHook(() => useLocationSearch())

      act(() => {
        result.current.setQuery('coffee')
      })

      expect(result.current.query).toBe('coffee')
    })

    it('should set loading true for valid queries', () => {
      const { result } = renderHook(() => useLocationSearch())

      act(() => {
        result.current.setQuery('coffee shop')
      })

      expect(result.current.isLoading).toBe(true)
    })

    it('should clear results for short queries', () => {
      const { result } = renderHook(() => useLocationSearch())

      act(() => {
        result.current.setQuery('ab')
      })

      // Short queries clear results (loading may be set briefly then cleared)
      expect(result.current.results).toEqual([])
    })
  })

  describe('clearSearch', () => {
    it('should clear query and results', () => {
      const { result } = renderHook(() => useLocationSearch())

      act(() => {
        result.current.setQuery('coffee')
      })

      act(() => {
        result.current.clearSearch()
      })

      expect(result.current.query).toBe('')
      expect(result.current.results).toEqual([])
      expect(result.current.isLoading).toBe(false)
    })
  })

  describe('toggleFilter', () => {
    it('should add filter when not present', () => {
      const { result } = renderHook(() => useLocationSearch())

      act(() => {
        result.current.toggleFilter('cafe')
      })

      expect(result.current.activeFilters).toContain('cafe')
    })

    it('should remove filter when present', () => {
      const { result } = renderHook(() =>
        useLocationSearch({ initialFilters: ['cafe'] })
      )

      act(() => {
        result.current.toggleFilter('cafe')
      })

      expect(result.current.activeFilters).not.toContain('cafe')
    })
  })

  describe('clearFilters', () => {
    it('should clear all filters', () => {
      const { result } = renderHook(() =>
        useLocationSearch({ initialFilters: ['cafe', 'bar', 'restaurant'] })
      )

      act(() => {
        result.current.clearFilters()
      })

      expect(result.current.activeFilters).toEqual([])
    })
  })

  describe('checkLocationServices', () => {
    it('should return true when services enabled', async () => {
      mockHasServicesEnabledAsync.mockResolvedValue(true)

      const { result } = renderHook(() => useLocationSearch())

      let enabled: boolean
      await act(async () => {
        enabled = await result.current.checkLocationServices()
      })

      expect(enabled!).toBe(true)
    })

    it('should return false when services disabled', async () => {
      mockHasServicesEnabledAsync.mockResolvedValue(false)

      const { result } = renderHook(() => useLocationSearch())

      let enabled: boolean
      await act(async () => {
        enabled = await result.current.checkLocationServices()
      })

      expect(enabled!).toBe(false)
    })

    it('should return false when check fails', async () => {
      mockHasServicesEnabledAsync.mockRejectedValue(new Error('Failed'))

      const { result } = renderHook(() => useLocationSearch())

      let enabled: boolean
      await act(async () => {
        enabled = await result.current.checkLocationServices()
      })

      expect(enabled!).toBe(false)
    })
  })

  describe('return value structure', () => {
    it('should provide all expected properties', () => {
      const { result } = renderHook(() => useLocationSearch())

      expect(result.current).toHaveProperty('query')
      expect(result.current).toHaveProperty('setQuery')
      expect(result.current).toHaveProperty('results')
      expect(result.current).toHaveProperty('isLoading')
      expect(result.current).toHaveProperty('error')
      expect(result.current).toHaveProperty('isOffline')
      expect(result.current).toHaveProperty('activeFilters')
      expect(result.current).toHaveProperty('toggleFilter')
      expect(result.current).toHaveProperty('clearFilters')
      expect(result.current).toHaveProperty('clearSearch')
      expect(result.current).toHaveProperty('refetch')
      expect(result.current).toHaveProperty('lastSearchedAt')
      expect(result.current).toHaveProperty('locationPermissionStatus')
      expect(result.current).toHaveProperty('gpsLocation')
      expect(result.current).toHaveProperty('isGpsLoading')
      expect(result.current).toHaveProperty('gpsError')
      expect(result.current).toHaveProperty('requestGpsLocation')
      expect(result.current).toHaveProperty('checkLocationServices')
    })
  })

  describe('requestGpsLocation', () => {
    it('should return location when permission granted', async () => {
      mockHasServicesEnabledAsync.mockResolvedValue(true)
      mockRequestForegroundPermissionsAsync.mockResolvedValue({ status: 'granted' })
      mockGetCurrentPositionAsync.mockResolvedValue({
        coords: {
          latitude: 37.7749,
          longitude: -122.4194,
          accuracy: 10,
        },
        timestamp: Date.now(),
      })

      const { result } = renderHook(() => useLocationSearch())

      let location
      await act(async () => {
        location = await result.current.requestGpsLocation()
      })

      expect(location).toEqual({
        latitude: 37.7749,
        longitude: -122.4194,
      })
      expect(result.current.gpsLocation).toEqual({
        latitude: 37.7749,
        longitude: -122.4194,
      })
      expect(result.current.locationPermissionStatus).toBe('granted')
      expect(result.current.gpsError).toBeNull()
    })

    it('should set error when permission denied', async () => {
      mockHasServicesEnabledAsync.mockResolvedValue(true)
      mockRequestForegroundPermissionsAsync.mockResolvedValue({ status: 'denied' })

      const { result } = renderHook(() => useLocationSearch())

      let location
      await act(async () => {
        location = await result.current.requestGpsLocation()
      })

      expect(location).toBeNull()
      expect(result.current.locationPermissionStatus).toBe('denied')
      expect(result.current.gpsError).toContain('permission denied')
    })

    it('should set error when services disabled', async () => {
      mockHasServicesEnabledAsync.mockResolvedValue(false)

      const { result } = renderHook(() => useLocationSearch())

      let location
      await act(async () => {
        location = await result.current.requestGpsLocation()
      })

      expect(location).toBeNull()
      expect(result.current.locationPermissionStatus).toBe('restricted')
      expect(result.current.gpsError).toContain('Location services are disabled')
    })

    it('should handle timeout error', async () => {
      mockHasServicesEnabledAsync.mockResolvedValue(true)
      mockRequestForegroundPermissionsAsync.mockResolvedValue({ status: 'granted' })
      mockGetCurrentPositionAsync.mockRejectedValue(new Error('timeout'))

      const { result } = renderHook(() => useLocationSearch())

      let location
      await act(async () => {
        location = await result.current.requestGpsLocation()
      })

      expect(location).toBeNull()
      expect(result.current.gpsError).toContain('timed out')
    })

    it('should handle unavailable error', async () => {
      mockHasServicesEnabledAsync.mockResolvedValue(true)
      mockRequestForegroundPermissionsAsync.mockResolvedValue({ status: 'granted' })
      mockGetCurrentPositionAsync.mockRejectedValue(new Error('Location unavailable'))

      const { result } = renderHook(() => useLocationSearch())

      let location
      await act(async () => {
        location = await result.current.requestGpsLocation()
      })

      expect(location).toBeNull()
      expect(result.current.gpsError).toContain('Unable to get current location')
    })

    it('should handle unknown error', async () => {
      mockHasServicesEnabledAsync.mockResolvedValue(true)
      mockRequestForegroundPermissionsAsync.mockResolvedValue({ status: 'granted' })
      mockGetCurrentPositionAsync.mockRejectedValue('String error')

      const { result } = renderHook(() => useLocationSearch())

      let location
      await act(async () => {
        location = await result.current.requestGpsLocation()
      })

      expect(location).toBeNull()
      expect(result.current.gpsError).toContain('unknown error')
    })

    it('should set isGpsLoading during fetch', async () => {
      mockHasServicesEnabledAsync.mockResolvedValue(true)
      mockRequestForegroundPermissionsAsync.mockResolvedValue({ status: 'granted' })

      let resolvePosition: (value: unknown) => void
      const positionPromise = new Promise((resolve) => {
        resolvePosition = resolve
      })
      mockGetCurrentPositionAsync.mockReturnValue(positionPromise)

      const { result } = renderHook(() => useLocationSearch())

      // Start the GPS request
      const gpsPromise = result.current.requestGpsLocation()

      // Wait for the async setState to process
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 10))
      })

      expect(result.current.isGpsLoading).toBe(true)

      // Resolve the position
      await act(async () => {
        resolvePosition!({
          coords: { latitude: 40, longitude: -74, accuracy: 10 },
          timestamp: Date.now(),
        })
        await gpsPromise
      })

      expect(result.current.isGpsLoading).toBe(false)
    })
  })

  describe('search execution', () => {
    it('should search with refetch', async () => {
      const { searchVenues } = await import('../../services/locationService')
      const mockSearchVenues = vi.mocked(searchVenues)

      mockSearchVenues.mockResolvedValue({
        google_results: [],
        cached_results: [],
        combined_results: [
          { id: '1', name: 'Coffee Shop', address: '123 Main St' },
        ] as never,
        is_offline: false,
        total_count: 1,
      })

      const { result } = renderHook(() => useLocationSearch())

      act(() => {
        result.current.setQuery('coffee')
      })

      await act(async () => {
        await result.current.refetch()
      })

      expect(mockSearchVenues).toHaveBeenCalled()
    })
  })

  describe('enableGpsOnMount', () => {
    it('should auto-fetch GPS when enableGpsOnMount is true', async () => {
      mockHasServicesEnabledAsync.mockResolvedValue(true)
      mockRequestForegroundPermissionsAsync.mockResolvedValue({ status: 'granted' })

      const { result } = renderHook(() =>
        useLocationSearch({ enableGpsOnMount: true })
      )

      // Wait for GPS to be fetched
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100))
      })

      expect(mockGetCurrentPositionAsync).toHaveBeenCalled()
      expect(result.current.gpsLocation).toBeDefined()
    })

    it('should not auto-fetch GPS when userLocation is provided', async () => {
      const { result } = renderHook(() =>
        useLocationSearch({
          enableGpsOnMount: true,
          userLocation: { latitude: 40, longitude: -74 },
        })
      )

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100))
      })

      // When userLocation is provided, GPS shouldn't be auto-fetched
      expect(mockGetCurrentPositionAsync).not.toHaveBeenCalled()
    })
  })

  describe('highAccuracy option', () => {
    it('should use high accuracy when true', async () => {
      const { result } = renderHook(() =>
        useLocationSearch({ highAccuracy: true })
      )

      await act(async () => {
        await result.current.requestGpsLocation()
      })

      expect(mockGetCurrentPositionAsync).toHaveBeenCalledWith(
        expect.objectContaining({ accuracy: 6 }) // High accuracy
      )
    })

    it('should use balanced accuracy when false', async () => {
      const { result } = renderHook(() =>
        useLocationSearch({ highAccuracy: false })
      )

      await act(async () => {
        await result.current.requestGpsLocation()
      })

      expect(mockGetCurrentPositionAsync).toHaveBeenCalledWith(
        expect.objectContaining({ accuracy: 3 }) // Balanced accuracy
      )
    })
  })

  describe('permission status mapping', () => {
    it('should map undetermined status', async () => {
      mockHasServicesEnabledAsync.mockResolvedValue(true)
      mockRequestForegroundPermissionsAsync.mockResolvedValue({ status: 'undetermined' })

      const { result } = renderHook(() => useLocationSearch())

      await act(async () => {
        await result.current.requestGpsLocation()
      })

      expect(result.current.locationPermissionStatus).toBe('undetermined')
    })

    it('should map unknown status to restricted', async () => {
      mockHasServicesEnabledAsync.mockResolvedValue(true)
      mockRequestForegroundPermissionsAsync.mockResolvedValue({ status: 'unknown_status' })

      const { result } = renderHook(() => useLocationSearch())

      await act(async () => {
        await result.current.requestGpsLocation()
      })

      expect(result.current.locationPermissionStatus).toBe('restricted')
    })
  })

  describe('offline mode', () => {
    it('should update isOffline when prop changes', () => {
      const { result, rerender } = renderHook(
        ({ isOffline }) => useLocationSearch({ isOffline }),
        { initialProps: { isOffline: false } }
      )

      expect(result.current.isOffline).toBe(false)

      rerender({ isOffline: true })

      expect(result.current.isOffline).toBe(true)
    })
  })

  describe('debouncing', () => {
    it('should respect custom debounceMs', async () => {
      vi.useFakeTimers()

      const { result } = renderHook(() =>
        useLocationSearch({ debounceMs: 500 })
      )

      act(() => {
        result.current.setQuery('coffee shop test')
      })

      // Loading starts immediately
      expect(result.current.isLoading).toBe(true)

      // Advance less than debounce time
      await act(async () => {
        vi.advanceTimersByTime(200)
      })

      // Should still be loading (debounce not yet triggered)
      expect(result.current.isLoading).toBe(true)

      vi.useRealTimers()
    })
  })
})
