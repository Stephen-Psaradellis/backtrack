/**
 * Tests for hooks/useUserLocation.ts
 *
 * Tests user location hook for browser geolocation API.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'

// Mock browser geolocation API
const mockGetCurrentPosition = vi.fn()
const mockWatchPosition = vi.fn()
const mockClearWatch = vi.fn()

// Mock navigator.geolocation
const mockGeolocation = {
  getCurrentPosition: mockGetCurrentPosition,
  watchPosition: mockWatchPosition,
  clearWatch: mockClearWatch,
}

// Mock navigator.permissions
const mockPermissionsQuery = vi.fn()

// Mock lib/utils/geo
const mockRecordLocationVisit = vi.fn()

vi.mock('../../lib/utils/geo', () => ({
  recordLocationVisit: (...args: unknown[]) => mockRecordLocationVisit(...args),
  GeoError: class GeoError extends Error {
    code: string
    constructor(code: string, message: string) {
      super(message)
      this.code = code
      this.name = 'GeoError'
    }
  },
}))

// Mock supabase
vi.mock('../../lib/supabase', () => ({
  supabase: {},
}))

import {
  useUserLocation,
  useRecordVisit,
  GeolocationError,
} from '../useUserLocation'

describe('GeolocationError', () => {
  it('should create error with code and message', () => {
    const error = new GeolocationError('PERMISSION_DENIED', 'Permission denied')

    expect(error.code).toBe('PERMISSION_DENIED')
    expect(error.message).toBe('Permission denied')
    expect(error.name).toBe('GeolocationError')
  })

  it('should store original error', () => {
    const originalError = { code: 1 } as GeolocationPositionError
    const error = new GeolocationError(
      'PERMISSION_DENIED',
      'Permission denied',
      originalError
    )

    expect(error.originalError).toBe(originalError)
  })

  it('should be instanceof Error', () => {
    const error = new GeolocationError('TIMEOUT', 'Request timed out')

    expect(error instanceof Error).toBe(true)
    expect(error instanceof GeolocationError).toBe(true)
  })
})

describe('useUserLocation', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Setup navigator mocks
    Object.defineProperty(globalThis, 'navigator', {
      value: {
        geolocation: mockGeolocation,
        permissions: {
          query: mockPermissionsQuery,
        },
      },
      writable: true,
    })

    // Default: return prompt permission state
    mockPermissionsQuery.mockResolvedValue({
      state: 'prompt',
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })

    // Default: successful position
    mockGetCurrentPosition.mockImplementation((success) => {
      success({
        coords: {
          latitude: 40.7128,
          longitude: -74.006,
          accuracy: 10,
        },
        timestamp: Date.now(),
      })
    })

    mockWatchPosition.mockReturnValue(1) // watch ID
  })

  describe('initial state', () => {
    it('should start with null coordinates when enableOnMount is false', () => {
      const { result } = renderHook(() =>
        useUserLocation({ enableOnMount: false })
      )

      expect(result.current.coordinates).toBeNull()
    })

    it('should start with null accuracy', () => {
      const { result } = renderHook(() =>
        useUserLocation({ enableOnMount: false })
      )

      expect(result.current.accuracy).toBeNull()
    })

    it('should start with null timestamp', () => {
      const { result } = renderHook(() =>
        useUserLocation({ enableOnMount: false })
      )

      expect(result.current.timestamp).toBeNull()
    })

    it('should start with isLoading false when enableOnMount is false', () => {
      const { result } = renderHook(() =>
        useUserLocation({ enableOnMount: false })
      )

      expect(result.current.isLoading).toBe(false)
    })

    it('should start with no error', () => {
      const { result } = renderHook(() =>
        useUserLocation({ enableOnMount: false })
      )

      expect(result.current.error).toBeNull()
    })

    it('should start with unknown permission state', () => {
      const { result } = renderHook(() =>
        useUserLocation({ enableOnMount: false })
      )

      // Initially unknown before permissions are queried
      expect(result.current.permissionState).toBe('unknown')
    })
  })

  describe('requestLocation', () => {
    it('should call geolocation API when requested', async () => {
      const { result } = renderHook(() =>
        useUserLocation({ enableOnMount: false })
      )

      act(() => {
        result.current.requestLocation()
      })

      expect(mockGetCurrentPosition).toHaveBeenCalled()
    })

    it('should update coordinates on success', async () => {
      const { result } = renderHook(() =>
        useUserLocation({ enableOnMount: false })
      )

      act(() => {
        result.current.requestLocation()
      })

      await waitFor(() => {
        expect(result.current.coordinates).not.toBeNull()
      })

      expect(result.current.coordinates?.latitude).toBe(40.7128)
      expect(result.current.coordinates?.longitude).toBe(-74.006)
    })

    it('should update accuracy on success', async () => {
      const { result } = renderHook(() =>
        useUserLocation({ enableOnMount: false })
      )

      act(() => {
        result.current.requestLocation()
      })

      await waitFor(() => {
        expect(result.current.accuracy).toBe(10)
      })
    })

    it('should set error when geolocation not supported', async () => {
      // Remove geolocation from navigator
      Object.defineProperty(globalThis, 'navigator', {
        value: {},
        writable: true,
      })

      const { result } = renderHook(() =>
        useUserLocation({ enableOnMount: false })
      )

      act(() => {
        result.current.requestLocation()
      })

      expect(result.current.error?.code).toBe('NOT_SUPPORTED')
    })

    it('should set error on permission denied', async () => {
      mockGetCurrentPosition.mockImplementation((_success, error) => {
        error({
          code: 1, // PERMISSION_DENIED
          message: 'Permission denied',
          PERMISSION_DENIED: 1,
          POSITION_UNAVAILABLE: 2,
          TIMEOUT: 3,
        })
      })

      const { result } = renderHook(() =>
        useUserLocation({ enableOnMount: false })
      )

      act(() => {
        result.current.requestLocation()
      })

      await waitFor(() => {
        expect(result.current.error?.code).toBe('PERMISSION_DENIED')
      })
    })

    it('should set error on timeout', async () => {
      mockGetCurrentPosition.mockImplementation((_success, error) => {
        error({
          code: 3, // TIMEOUT
          message: 'Timeout',
          PERMISSION_DENIED: 1,
          POSITION_UNAVAILABLE: 2,
          TIMEOUT: 3,
        })
      })

      const { result } = renderHook(() =>
        useUserLocation({ enableOnMount: false })
      )

      act(() => {
        result.current.requestLocation()
      })

      await waitFor(() => {
        expect(result.current.error?.code).toBe('TIMEOUT')
      })
    })
  })

  describe('clearLocation', () => {
    it('should clear coordinates and error', async () => {
      const { result } = renderHook(() =>
        useUserLocation({ enableOnMount: false })
      )

      // First get location
      act(() => {
        result.current.requestLocation()
      })

      await waitFor(() => {
        expect(result.current.coordinates).not.toBeNull()
      })

      // Then clear
      act(() => {
        result.current.clearLocation()
      })

      expect(result.current.coordinates).toBeNull()
      expect(result.current.accuracy).toBeNull()
      expect(result.current.timestamp).toBeNull()
      expect(result.current.error).toBeNull()
    })
  })

  describe('return value structure', () => {
    it('should provide all expected properties', () => {
      const { result } = renderHook(() =>
        useUserLocation({ enableOnMount: false })
      )

      expect(result.current).toHaveProperty('coordinates')
      expect(result.current).toHaveProperty('accuracy')
      expect(result.current).toHaveProperty('timestamp')
      expect(result.current).toHaveProperty('isLoading')
      expect(result.current).toHaveProperty('error')
      expect(result.current).toHaveProperty('permissionState')
      expect(result.current).toHaveProperty('requestLocation')
      expect(result.current).toHaveProperty('clearLocation')
    })
  })

  describe('watch mode', () => {
    it('should call watchPosition when watch is true', async () => {
      const { result } = renderHook(() =>
        useUserLocation({ enableOnMount: true, watch: true })
      )

      expect(mockWatchPosition).toHaveBeenCalled()
      expect(result.current.isLoading).toBe(true)
    })

    it('should clear watch on unmount', async () => {
      const { unmount } = renderHook(() =>
        useUserLocation({ enableOnMount: true, watch: true })
      )

      unmount()

      expect(mockClearWatch).toHaveBeenCalledWith(1)
    })

    it('should clear existing watch before starting new one', async () => {
      // Setup to return different watch IDs
      mockWatchPosition.mockReturnValue(1)

      const { rerender } = renderHook(
        ({ watch }) => useUserLocation({ enableOnMount: true, watch }),
        { initialProps: { watch: true } }
      )

      // Initial watch
      expect(mockWatchPosition).toHaveBeenCalled()
      const initialCallCount = mockWatchPosition.mock.calls.length

      // Change watch to false then back to true to trigger re-watch
      rerender({ watch: false })
      rerender({ watch: true })

      // Should have cleared and started a new watch
      expect(mockClearWatch).toHaveBeenCalledWith(1)
      expect(mockWatchPosition.mock.calls.length).toBeGreaterThan(initialCallCount)
    })

    it('should not call watchPosition when geolocation not supported', async () => {
      // Remove geolocation from navigator
      Object.defineProperty(globalThis, 'navigator', {
        value: {},
        writable: true,
      })

      const { result } = renderHook(() =>
        useUserLocation({ enableOnMount: true, watch: true })
      )

      expect(result.current.error?.code).toBe('NOT_SUPPORTED')
    })

    it('should stop watching when watch prop changes from true to false', async () => {
      mockWatchPosition.mockReturnValue(42)

      const { rerender } = renderHook(
        ({ watch }) => useUserLocation({ enableOnMount: true, watch }),
        { initialProps: { watch: true } }
      )

      expect(mockWatchPosition).toHaveBeenCalled()

      rerender({ watch: false })

      expect(mockClearWatch).toHaveBeenCalledWith(42)
    })
  })

  describe('enableOnMount', () => {
    it('should request location when enableOnMount is true (default)', async () => {
      renderHook(() => useUserLocation())

      expect(mockGetCurrentPosition).toHaveBeenCalled()
    })

    it('should not make requests when enableOnMount is false', () => {
      renderHook(() => useUserLocation({ enableOnMount: false }))

      expect(mockGetCurrentPosition).not.toHaveBeenCalled()
      expect(mockWatchPosition).not.toHaveBeenCalled()
    })

    it('should start watching when watch is true and enableOnMount is true', () => {
      renderHook(() => useUserLocation({ enableOnMount: true, watch: true }))

      expect(mockWatchPosition).toHaveBeenCalled()
    })
  })

  describe('error cases', () => {
    it('should set error on position unavailable', async () => {
      mockGetCurrentPosition.mockImplementation((_success, error) => {
        error({
          code: 2, // POSITION_UNAVAILABLE
          message: 'Position unavailable',
          PERMISSION_DENIED: 1,
          POSITION_UNAVAILABLE: 2,
          TIMEOUT: 3,
        })
      })

      const { result } = renderHook(() =>
        useUserLocation({ enableOnMount: false })
      )

      act(() => {
        result.current.requestLocation()
      })

      await waitFor(() => {
        expect(result.current.error?.code).toBe('POSITION_UNAVAILABLE')
      })
    })

    it('should set error with unknown code', async () => {
      mockGetCurrentPosition.mockImplementation((_success, error) => {
        error({
          code: 99, // Unknown error code
          message: 'Unknown error',
          PERMISSION_DENIED: 1,
          POSITION_UNAVAILABLE: 2,
          TIMEOUT: 3,
        })
      })

      const { result } = renderHook(() =>
        useUserLocation({ enableOnMount: false })
      )

      act(() => {
        result.current.requestLocation()
      })

      await waitFor(() => {
        expect(result.current.error?.code).toBe('UNKNOWN_ERROR')
      })
    })

    it('should update permissionState to denied on permission error', async () => {
      mockGetCurrentPosition.mockImplementation((_success, error) => {
        error({
          code: 1, // PERMISSION_DENIED
          message: 'Permission denied',
          PERMISSION_DENIED: 1,
          POSITION_UNAVAILABLE: 2,
          TIMEOUT: 3,
        })
      })

      const { result } = renderHook(() =>
        useUserLocation({ enableOnMount: false })
      )

      act(() => {
        result.current.requestLocation()
      })

      await waitFor(() => {
        expect(result.current.permissionState).toBe('denied')
      })
    })
  })

  describe('permission state', () => {
    it('should query permission state on mount', async () => {
      renderHook(() => useUserLocation({ enableOnMount: false }))

      await waitFor(() => {
        expect(mockPermissionsQuery).toHaveBeenCalledWith({ name: 'geolocation' })
      })
    })

    it('should update permission state from query result', async () => {
      mockPermissionsQuery.mockResolvedValue({
        state: 'granted',
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })

      const { result } = renderHook(() =>
        useUserLocation({ enableOnMount: false })
      )

      await waitFor(() => {
        expect(result.current.permissionState).toBe('granted')
      })
    })

    it('should listen for permission state changes', async () => {
      const mockAddEventListener = vi.fn()
      mockPermissionsQuery.mockResolvedValue({
        state: 'prompt',
        addEventListener: mockAddEventListener,
        removeEventListener: vi.fn(),
      })

      renderHook(() => useUserLocation({ enableOnMount: false }))

      await waitFor(() => {
        expect(mockAddEventListener).toHaveBeenCalledWith('change', expect.any(Function))
      })
    })

    it('should handle permissions query rejection', async () => {
      mockPermissionsQuery.mockRejectedValue(new Error('Permissions not supported'))

      const { result } = renderHook(() =>
        useUserLocation({ enableOnMount: false })
      )

      // Should not throw, should keep 'unknown' state
      await waitFor(() => {
        expect(result.current.permissionState).toBe('unknown')
      })
    })

    it('should handle missing permissions API', async () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: {
          geolocation: mockGeolocation,
          // No permissions property
        },
        writable: true,
      })

      const { result } = renderHook(() =>
        useUserLocation({ enableOnMount: false })
      )

      // Should stay unknown when permissions API is not available
      expect(result.current.permissionState).toBe('unknown')
    })
  })

  describe('options', () => {
    it('should pass enableHighAccuracy option', async () => {
      renderHook(() =>
        useUserLocation({ enableOnMount: false, enableHighAccuracy: false })
      )

      const { result } = renderHook(() =>
        useUserLocation({ enableOnMount: false, enableHighAccuracy: false })
      )

      act(() => {
        result.current.requestLocation()
      })

      expect(mockGetCurrentPosition).toHaveBeenCalledWith(
        expect.any(Function),
        expect.any(Function),
        expect.objectContaining({ enableHighAccuracy: false })
      )
    })

    it('should pass timeout option', async () => {
      const { result } = renderHook(() =>
        useUserLocation({ enableOnMount: false, timeout: 5000 })
      )

      act(() => {
        result.current.requestLocation()
      })

      expect(mockGetCurrentPosition).toHaveBeenCalledWith(
        expect.any(Function),
        expect.any(Function),
        expect.objectContaining({ timeout: 5000 })
      )
    })

    it('should pass maximumAge option', async () => {
      const { result } = renderHook(() =>
        useUserLocation({ enableOnMount: false, maximumAge: 30000 })
      )

      act(() => {
        result.current.requestLocation()
      })

      expect(mockGetCurrentPosition).toHaveBeenCalledWith(
        expect.any(Function),
        expect.any(Function),
        expect.objectContaining({ maximumAge: 30000 })
      )
    })
  })
})

describe('useRecordVisit', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Default: successful visit
    mockRecordLocationVisit.mockResolvedValue({
      id: 'visit-123',
      visited_at: '2024-01-01T12:00:00Z',
    })
  })

  describe('initial state', () => {
    it('should start with null lastVisit', () => {
      const { result } = renderHook(() => useRecordVisit())

      expect(result.current.lastVisit).toBeNull()
    })

    it('should start with isRecording false', () => {
      const { result } = renderHook(() => useRecordVisit())

      expect(result.current.isRecording).toBe(false)
    })

    it('should start with no error', () => {
      const { result } = renderHook(() => useRecordVisit())

      expect(result.current.error).toBeNull()
    })
  })

  describe('recordVisit', () => {
    it('should call recordLocationVisit', async () => {
      const { result } = renderHook(() => useRecordVisit())

      await act(async () => {
        await result.current.recordVisit(
          'loc-123',
          { latitude: 40.7128, longitude: -74.006 },
          10
        )
      })

      expect(mockRecordLocationVisit).toHaveBeenCalled()
    })

    it('should return visit on success', async () => {
      const { result } = renderHook(() => useRecordVisit())

      let visit: unknown
      await act(async () => {
        visit = await result.current.recordVisit(
          'loc-123',
          { latitude: 40.7128, longitude: -74.006 }
        )
      })

      expect(visit).toEqual({
        id: 'visit-123',
        visited_at: '2024-01-01T12:00:00Z',
      })
    })

    it('should update lastVisit on success', async () => {
      const { result } = renderHook(() => useRecordVisit())

      await act(async () => {
        await result.current.recordVisit(
          'loc-123',
          { latitude: 40.7128, longitude: -74.006 }
        )
      })

      expect(result.current.lastVisit).toEqual({
        id: 'visit-123',
        visited_at: '2024-01-01T12:00:00Z',
      })
    })

    it('should call onVisitRecorded callback', async () => {
      const onVisitRecorded = vi.fn()
      const { result } = renderHook(() => useRecordVisit({ onVisitRecorded }))

      await act(async () => {
        await result.current.recordVisit(
          'loc-123',
          { latitude: 40.7128, longitude: -74.006 }
        )
      })

      expect(onVisitRecorded).toHaveBeenCalledWith({
        id: 'visit-123',
        visited_at: '2024-01-01T12:00:00Z',
      })
    })

    it('should set error on failure', async () => {
      mockRecordLocationVisit.mockRejectedValue(new Error('Network error'))

      const { result } = renderHook(() => useRecordVisit())

      await act(async () => {
        await result.current.recordVisit(
          'loc-123',
          { latitude: 40.7128, longitude: -74.006 }
        )
      })

      expect(result.current.error).not.toBeNull()
    })

    it('should call onError callback on failure', async () => {
      mockRecordLocationVisit.mockRejectedValue(new Error('Network error'))
      const onError = vi.fn()

      const { result } = renderHook(() => useRecordVisit({ onError }))

      await act(async () => {
        await result.current.recordVisit(
          'loc-123',
          { latitude: 40.7128, longitude: -74.006 }
        )
      })

      expect(onError).toHaveBeenCalled()
    })
  })

  describe('clearState', () => {
    it('should clear lastVisit and error', async () => {
      const { result } = renderHook(() => useRecordVisit())

      await act(async () => {
        await result.current.recordVisit(
          'loc-123',
          { latitude: 40.7128, longitude: -74.006 }
        )
      })

      expect(result.current.lastVisit).not.toBeNull()

      act(() => {
        result.current.clearState()
      })

      expect(result.current.lastVisit).toBeNull()
      expect(result.current.error).toBeNull()
    })
  })

  describe('return value structure', () => {
    it('should provide all expected properties', () => {
      const { result } = renderHook(() => useRecordVisit())

      expect(result.current).toHaveProperty('lastVisit')
      expect(result.current).toHaveProperty('isRecording')
      expect(result.current).toHaveProperty('error')
      expect(result.current).toHaveProperty('recordVisit')
      expect(result.current).toHaveProperty('clearState')
    })
  })

  describe('GeoError handling', () => {
    it('should preserve GeoError when thrown', async () => {
      const GeoError = (await import('../../lib/utils/geo')).GeoError
      mockRecordLocationVisit.mockRejectedValue(
        new GeoError('DATABASE_ERROR', 'Database failed')
      )

      const { result } = renderHook(() => useRecordVisit())

      await act(async () => {
        await result.current.recordVisit(
          'loc-123',
          { latitude: 40.7128, longitude: -74.006 }
        )
      })

      expect(result.current.error?.code).toBe('DATABASE_ERROR')
      expect(result.current.error?.message).toBe('Database failed')
    })

    it('should wrap non-GeoError in NETWORK_ERROR', async () => {
      mockRecordLocationVisit.mockRejectedValue(new Error('Connection failed'))

      const { result } = renderHook(() => useRecordVisit())

      await act(async () => {
        await result.current.recordVisit(
          'loc-123',
          { latitude: 40.7128, longitude: -74.006 }
        )
      })

      expect(result.current.error?.code).toBe('NETWORK_ERROR')
      expect(result.current.error?.message).toBe('Connection failed')
    })

    it('should return null when visit is null (user too far)', async () => {
      mockRecordLocationVisit.mockResolvedValue(null)

      const { result } = renderHook(() => useRecordVisit())

      let visit: unknown
      await act(async () => {
        visit = await result.current.recordVisit(
          'loc-123',
          { latitude: 40.7128, longitude: -74.006 }
        )
      })

      expect(visit).toBeNull()
      // lastVisit should NOT be updated when null
      expect(result.current.lastVisit).toBeNull()
    })

    it('should not call onVisitRecorded when visit is null', async () => {
      mockRecordLocationVisit.mockResolvedValue(null)
      const onVisitRecorded = vi.fn()

      const { result } = renderHook(() => useRecordVisit({ onVisitRecorded }))

      await act(async () => {
        await result.current.recordVisit(
          'loc-123',
          { latitude: 40.7128, longitude: -74.006 }
        )
      })

      expect(onVisitRecorded).not.toHaveBeenCalled()
    })

    it('should pass accuracy to recordLocationVisit', async () => {
      const { result } = renderHook(() => useRecordVisit())

      await act(async () => {
        await result.current.recordVisit(
          'loc-123',
          { latitude: 40.7128, longitude: -74.006 },
          15
        )
      })

      expect(mockRecordLocationVisit).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          location_id: 'loc-123',
          user_lat: 40.7128,
          user_lon: -74.006,
          accuracy: 15,
        })
      )
    })
  })
})
