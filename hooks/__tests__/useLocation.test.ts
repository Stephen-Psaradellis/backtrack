/**
 * Tests for hooks/useLocation.ts
 *
 * Tests device location hook with permission handling.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'

// Mock expo-location
const mockRequestForegroundPermissionsAsync = vi.fn()
const mockGetCurrentPositionAsync = vi.fn()
const mockWatchPositionAsync = vi.fn()
const mockHasServicesEnabledAsync = vi.fn()

vi.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: () => mockRequestForegroundPermissionsAsync(),
  getCurrentPositionAsync: (...args: unknown[]) => mockGetCurrentPositionAsync(...args),
  watchPositionAsync: (...args: unknown[]) => mockWatchPositionAsync(...args),
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

import {
  useLocation,
  calculateDistance,
  isWithinRadius,
  formatCoordinates,
} from '../useLocation'

describe('useLocation', () => {
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
        altitude: 50,
        heading: 90,
        speed: 5,
      },
      timestamp: Date.now(),
    })

    // Mock watch subscription
    mockWatchPositionAsync.mockResolvedValue({
      remove: vi.fn(),
    })
  })

  describe('initial state', () => {
    it('should start with loading true when enableOnMount is true', () => {
      const { result } = renderHook(() => useLocation())

      expect(result.current.loading).toBe(true)
    })

    it('should start with loading true when enableOnMount is default', () => {
      const { result } = renderHook(() => useLocation())

      expect(result.current.loading).toBe(true)
    })

    it('should start with default coordinates', async () => {
      const { result } = renderHook(() => useLocation({ enableOnMount: false }))

      expect(result.current.latitude).toBe(0)
      expect(result.current.longitude).toBe(0)
    })

    it('should start with permissionStatus undetermined', () => {
      const { result } = renderHook(() => useLocation({ enableOnMount: false }))

      expect(result.current.permissionStatus).toBe('undetermined')
    })

    it('should start with isWatching false', () => {
      const { result } = renderHook(() => useLocation({ enableOnMount: false }))

      expect(result.current.isWatching).toBe(false)
    })
  })

  describe('getting location', () => {
    it('should get current location on mount when enableOnMount is true', async () => {
      const { result } = renderHook(() => useLocation())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.latitude).toBe(40.7128)
      expect(result.current.longitude).toBe(-74.006)
      expect(result.current.error).toBeNull()
    })

    it('should not get location on mount when enableOnMount is false', async () => {
      const { result } = renderHook(() => useLocation({ enableOnMount: false }))

      // Wait a bit
      await new Promise((r) => setTimeout(r, 50))

      expect(mockGetCurrentPositionAsync).not.toHaveBeenCalled()
      expect(result.current.latitude).toBe(0)
    })

    it('should set location metadata', async () => {
      const { result } = renderHook(() => useLocation())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.accuracy).toBe(10)
      expect(result.current.altitude).toBe(50)
      expect(result.current.heading).toBe(90)
      expect(result.current.speed).toBe(5)
      expect(result.current.timestamp).not.toBeNull()
    })

    it('should refresh location when refresh is called', async () => {
      const { result } = renderHook(() => useLocation({ enableOnMount: false }))

      await act(async () => {
        await result.current.refresh()
      })

      expect(result.current.latitude).toBe(40.7128)
      expect(result.current.longitude).toBe(-74.006)
    })

    it('should use high accuracy when highAccuracy is true', async () => {
      renderHook(() => useLocation())

      await waitFor(() => {
        expect(mockGetCurrentPositionAsync).toHaveBeenCalled()
      })

      expect(mockGetCurrentPositionAsync).toHaveBeenCalledWith({
        accuracy: 6, // High
      })
    })

    it('should use balanced accuracy when highAccuracy is false', async () => {
      renderHook(() => useLocation({ highAccuracy: false }))

      await waitFor(() => {
        expect(mockGetCurrentPositionAsync).toHaveBeenCalled()
      })

      expect(mockGetCurrentPositionAsync).toHaveBeenCalledWith({
        accuracy: 3, // Balanced
      })
    })
  })

  describe('permission handling', () => {
    it('should request permission and set status to granted', async () => {
      const { result } = renderHook(() => useLocation())

      await waitFor(() => {
        expect(result.current.permissionStatus).toBe('granted')
      })
    })

    it('should set error when permission denied', async () => {
      mockRequestForegroundPermissionsAsync.mockResolvedValue({ status: 'denied' })

      const { result } = renderHook(() => useLocation())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.permissionStatus).toBe('denied')
      expect(result.current.error).toContain('permission')
    })

    it('should set error when location services disabled', async () => {
      mockHasServicesEnabledAsync.mockResolvedValue(false)

      const { result } = renderHook(() => useLocation())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.permissionStatus).toBe('restricted')
      expect(result.current.error).toContain('services')
    })

    it('should request permission manually', async () => {
      const { result } = renderHook(() => useLocation({ enableOnMount: false }))

      let granted: boolean
      await act(async () => {
        granted = await result.current.requestPermission()
      })

      expect(granted!).toBe(true)
      expect(result.current.permissionStatus).toBe('granted')
    })

    it('should return false from requestPermission when denied', async () => {
      mockRequestForegroundPermissionsAsync.mockResolvedValue({ status: 'denied' })

      const { result } = renderHook(() => useLocation({ enableOnMount: false }))

      let granted: boolean
      await act(async () => {
        granted = await result.current.requestPermission()
      })

      expect(granted!).toBe(false)
    })
  })

  describe('error handling', () => {
    it('should set timeout error', async () => {
      mockGetCurrentPositionAsync.mockRejectedValue(new Error('Location request timeout'))

      const { result } = renderHook(() => useLocation())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.error).toContain('timed out')
    })

    it('should set unavailable error for other errors', async () => {
      mockGetCurrentPositionAsync.mockRejectedValue(new Error('Some error'))

      const { result } = renderHook(() => useLocation())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.error).toContain('Unable to get')
    })

    it('should set unknown error for non-Error throws', async () => {
      mockGetCurrentPositionAsync.mockRejectedValue('string error')

      const { result } = renderHook(() => useLocation())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.error).toContain('unknown')
    })
  })

  describe('location watching', () => {
    it('should start watching location', async () => {
      const mockRemove = vi.fn()
      mockWatchPositionAsync.mockResolvedValue({ remove: mockRemove })

      const { result } = renderHook(() => useLocation({ enableOnMount: false }))

      await act(async () => {
        await result.current.startWatching()
      })

      expect(result.current.isWatching).toBe(true)
      expect(mockWatchPositionAsync).toHaveBeenCalled()
    })

    it('should stop watching location', async () => {
      const mockRemove = vi.fn()
      mockWatchPositionAsync.mockResolvedValue({ remove: mockRemove })

      const { result } = renderHook(() => useLocation({ enableOnMount: false }))

      await act(async () => {
        await result.current.startWatching()
      })

      expect(result.current.isWatching).toBe(true)

      act(() => {
        result.current.stopWatching()
      })

      expect(result.current.isWatching).toBe(false)
      expect(mockRemove).toHaveBeenCalled()
    })

    it('should use custom intervals for watching', async () => {
      renderHook(() =>
        useLocation({
          enableOnMount: false,
          timeInterval: 5000,
          distanceInterval: 50,
        })
      )

      const { result } = renderHook(() =>
        useLocation({
          enableOnMount: false,
          timeInterval: 5000,
          distanceInterval: 50,
        })
      )

      await act(async () => {
        await result.current.startWatching()
      })

      expect(mockWatchPositionAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          timeInterval: 5000,
          distanceInterval: 50,
        }),
        expect.any(Function)
      )
    })

    it('should handle watch error', async () => {
      mockWatchPositionAsync.mockRejectedValue(new Error('Watch failed'))

      const { result } = renderHook(() => useLocation({ enableOnMount: false }))

      await act(async () => {
        await result.current.startWatching()
      })

      expect(result.current.isWatching).toBe(false)
      expect(result.current.error).toBe('Watch failed')
    })
  })

  describe('checkLocationServices', () => {
    it('should return true when services enabled', async () => {
      mockHasServicesEnabledAsync.mockResolvedValue(true)

      const { result } = renderHook(() => useLocation({ enableOnMount: false }))

      let enabled: boolean
      await act(async () => {
        enabled = await result.current.checkLocationServices()
      })

      expect(enabled!).toBe(true)
    })

    it('should return false when services disabled', async () => {
      mockHasServicesEnabledAsync.mockResolvedValue(false)

      const { result } = renderHook(() => useLocation({ enableOnMount: false }))

      let enabled: boolean
      await act(async () => {
        enabled = await result.current.checkLocationServices()
      })

      expect(enabled!).toBe(false)
    })

    it('should return false when check fails', async () => {
      mockHasServicesEnabledAsync.mockRejectedValue(new Error('Check failed'))

      const { result } = renderHook(() => useLocation({ enableOnMount: false }))

      let enabled: boolean
      await act(async () => {
        enabled = await result.current.checkLocationServices()
      })

      expect(enabled!).toBe(false)
    })
  })
})

describe('calculateDistance', () => {
  it('should calculate distance between two points', () => {
    const coord1 = { latitude: 40.7128, longitude: -74.006 }
    const coord2 = { latitude: 40.7138, longitude: -74.006 }

    const distance = calculateDistance(coord1, coord2)

    // About 111 meters per 0.001 degree of latitude
    expect(distance).toBeGreaterThan(100)
    expect(distance).toBeLessThan(150)
  })

  it('should return 0 for same coordinates', () => {
    const coord = { latitude: 40.7128, longitude: -74.006 }

    const distance = calculateDistance(coord, coord)

    expect(distance).toBe(0)
  })

  it('should handle large distances', () => {
    // New York to London approximately
    const newYork = { latitude: 40.7128, longitude: -74.006 }
    const london = { latitude: 51.5074, longitude: -0.1278 }

    const distance = calculateDistance(newYork, london)

    // About 5,570 km
    expect(distance).toBeGreaterThan(5500000)
    expect(distance).toBeLessThan(5700000)
  })
})

describe('isWithinRadius', () => {
  it('should return true when point is within radius', () => {
    const center = { latitude: 40.7128, longitude: -74.006 }
    const point = { latitude: 40.7129, longitude: -74.006 }

    const result = isWithinRadius(center, point, 100)

    expect(result).toBe(true)
  })

  it('should return false when point is outside radius', () => {
    const center = { latitude: 40.7128, longitude: -74.006 }
    const point = { latitude: 40.72, longitude: -74.006 }

    const result = isWithinRadius(center, point, 100)

    expect(result).toBe(false)
  })

  it('should return true when point is exactly at radius', () => {
    const center = { latitude: 40.7128, longitude: -74.006 }
    const point = { latitude: 40.7128, longitude: -74.006 }

    const result = isWithinRadius(center, point, 0)

    expect(result).toBe(true)
  })
})

describe('formatCoordinates', () => {
  it('should format coordinates with default precision', () => {
    const coords = { latitude: 40.7128, longitude: -74.006 }

    const result = formatCoordinates(coords)

    expect(result).toBe('40.712800, -74.006000')
  })

  it('should format coordinates with custom precision', () => {
    const coords = { latitude: 40.7128, longitude: -74.006 }

    const result = formatCoordinates(coords, 2)

    expect(result).toBe('40.71, -74.01')
  })

  it('should handle negative coordinates', () => {
    const coords = { latitude: -33.8688, longitude: 151.2093 }

    const result = formatCoordinates(coords, 4)

    expect(result).toBe('-33.8688, 151.2093')
  })
})
