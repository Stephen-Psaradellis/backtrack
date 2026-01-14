/**
 * Tests for hooks/useNearbyLocations.ts
 *
 * Tests nearby locations hook with geospatial queries.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'

// Mock geo utilities
const mockFetchNearbyLocations = vi.fn()
const mockFetchLocationsWithActivePosts = vi.fn()
const mockFetchRecentlyVisitedLocations = vi.fn()

vi.mock('../../lib/utils/geo', () => ({
  fetchNearbyLocations: (...args: unknown[]) => mockFetchNearbyLocations(...args),
  fetchLocationsWithActivePosts: (...args: unknown[]) => mockFetchLocationsWithActivePosts(...args),
  fetchRecentlyVisitedLocations: (...args: unknown[]) => mockFetchRecentlyVisitedLocations(...args),
  DEFAULT_RADIUS_METERS: 5000,
  GeoError: class GeoError extends Error {
    code: 'INVALID_COORDINATES' | 'INVALID_RADIUS' | 'DATABASE_ERROR' | 'NETWORK_ERROR'
    constructor(code: 'INVALID_COORDINATES' | 'INVALID_RADIUS' | 'DATABASE_ERROR' | 'NETWORK_ERROR', message: string) {
      super(message)
      this.code = code
      this.name = 'GeoError'
    }
  },
  isValidCoordinates: (coords: { latitude: number; longitude: number }) => {
    if (!coords) return false
    const { latitude, longitude } = coords
    return (
      typeof latitude === 'number' &&
      typeof longitude === 'number' &&
      latitude >= -90 &&
      latitude <= 90 &&
      longitude >= -180 &&
      longitude <= 180
    )
  },
}))

// Mock supabase
vi.mock('../../lib/supabase', () => ({
  supabase: {},
}))

import { useNearbyLocations, useVisitedLocations } from '../useNearbyLocations'

describe('useNearbyLocations', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Default: empty locations
    mockFetchNearbyLocations.mockResolvedValue([])
    mockFetchLocationsWithActivePosts.mockResolvedValue([])
  })

  describe('initial state', () => {
    it('should start with empty locations', () => {
      const { result } = renderHook(() =>
        useNearbyLocations(null, { enabled: false })
      )

      expect(result.current.locations).toEqual([])
    })

    it('should start with isLoading false when disabled', () => {
      const { result } = renderHook(() =>
        useNearbyLocations(null, { enabled: false })
      )

      expect(result.current.isLoading).toBe(false)
    })

    it('should start with no error', () => {
      const { result } = renderHook(() =>
        useNearbyLocations(null, { enabled: false })
      )

      expect(result.current.error).toBeNull()
    })

    it('should start with lastFetchedAt null', () => {
      const { result } = renderHook(() =>
        useNearbyLocations(null, { enabled: false })
      )

      expect(result.current.lastFetchedAt).toBeNull()
    })
  })

  describe('coordinates handling', () => {
    it('should not fetch when coordinates are null', async () => {
      renderHook(() => useNearbyLocations(null))

      await new Promise((r) => setTimeout(r, 50))

      expect(mockFetchNearbyLocations).not.toHaveBeenCalled()
    })

    it('should not fetch when coordinates are invalid', async () => {
      renderHook(() =>
        useNearbyLocations({ latitude: 95, longitude: -122 })
      )

      await new Promise((r) => setTimeout(r, 50))

      expect(mockFetchNearbyLocations).not.toHaveBeenCalled()
    })

    it('should accept valid coordinates', () => {
      // This test just verifies the hook accepts valid coordinates
      // The actual fetch happens after debounce, which is hard to test synchronously
      const { result } = renderHook(() =>
        useNearbyLocations({ latitude: 37.7749, longitude: -122.4194 })
      )

      // Valid coordinates should allow the hook to function
      expect(result.current.locations).toEqual([])
      expect(result.current.error).toBeNull()
    })
  })

  describe('options', () => {
    it('should not fetch when enabled is false', async () => {
      renderHook(() =>
        useNearbyLocations(
          { latitude: 37.7749, longitude: -122.4194 },
          { enabled: false }
        )
      )

      await new Promise((r) => setTimeout(r, 50))

      expect(mockFetchNearbyLocations).not.toHaveBeenCalled()
    })

    it('should accept withActivePosts option', () => {
      // This test verifies the option is accepted
      // The actual fetch happens after debounce, which is hard to test synchronously
      const { result } = renderHook(() =>
        useNearbyLocations(
          { latitude: 37.7749, longitude: -122.4194 },
          { withActivePosts: true }
        )
      )

      // Hook should initialize properly with the option
      expect(result.current.locations).toEqual([])
      expect(result.current.error).toBeNull()
    })
  })

  describe('return value structure', () => {
    it('should provide all expected properties', () => {
      const { result } = renderHook(() =>
        useNearbyLocations(null, { enabled: false })
      )

      expect(result.current).toHaveProperty('locations')
      expect(result.current).toHaveProperty('isLoading')
      expect(result.current).toHaveProperty('error')
      expect(result.current).toHaveProperty('refetch')
      expect(result.current).toHaveProperty('lastFetchedAt')
    })
  })
})

describe('useVisitedLocations', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Default: empty locations
    mockFetchRecentlyVisitedLocations.mockResolvedValue([])
  })

  describe('initial state', () => {
    it('should start with empty locations when disabled', () => {
      const { result } = renderHook(() =>
        useVisitedLocations({ enabled: false })
      )

      expect(result.current.locations).toEqual([])
    })

    it('should start with isLoading false when disabled', () => {
      const { result } = renderHook(() =>
        useVisitedLocations({ enabled: false })
      )

      expect(result.current.isLoading).toBe(false)
    })

    it('should start with no error', () => {
      const { result } = renderHook(() =>
        useVisitedLocations({ enabled: false })
      )

      expect(result.current.error).toBeNull()
    })

    it('should start with lastFetchedAt null', () => {
      const { result } = renderHook(() =>
        useVisitedLocations({ enabled: false })
      )

      expect(result.current.lastFetchedAt).toBeNull()
    })
  })

  describe('fetching', () => {
    it('should not fetch when disabled', async () => {
      renderHook(() => useVisitedLocations({ enabled: false }))

      await new Promise((r) => setTimeout(r, 50))

      expect(mockFetchRecentlyVisitedLocations).not.toHaveBeenCalled()
    })

    it('should fetch on mount when enabled', async () => {
      mockFetchRecentlyVisitedLocations.mockResolvedValue([
        { id: 'loc-1', name: 'Test', visited_at: '2024-01-01' },
      ])

      const { result } = renderHook(() => useVisitedLocations())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(mockFetchRecentlyVisitedLocations).toHaveBeenCalled()
    })
  })

  describe('return value structure', () => {
    it('should provide all expected properties', () => {
      const { result } = renderHook(() =>
        useVisitedLocations({ enabled: false })
      )

      expect(result.current).toHaveProperty('locations')
      expect(result.current).toHaveProperty('isLoading')
      expect(result.current).toHaveProperty('error')
      expect(result.current).toHaveProperty('refetch')
      expect(result.current).toHaveProperty('lastFetchedAt')
    })
  })

  describe('error handling', () => {
    it('should handle GeoError', async () => {
      const GeoError = (await import('../../lib/utils/geo')).GeoError
      mockFetchRecentlyVisitedLocations.mockRejectedValue(
        new GeoError('DATABASE_ERROR', 'RPC call failed')
      )

      const { result } = renderHook(() => useVisitedLocations())

      await waitFor(() => {
        expect(result.current.error).not.toBeNull()
      })

      expect(result.current.error?.code).toBe('DATABASE_ERROR')
    })

    it('should wrap non-GeoError errors', async () => {
      mockFetchRecentlyVisitedLocations.mockRejectedValue(
        new Error('Network error')
      )

      const { result } = renderHook(() => useVisitedLocations())

      await waitFor(() => {
        expect(result.current.error).not.toBeNull()
      })

      expect(result.current.error?.code).toBe('NETWORK_ERROR')
      expect(result.current.error?.message).toBe('Network error')
    })

    it('should handle non-Error exceptions', async () => {
      mockFetchRecentlyVisitedLocations.mockRejectedValue('String error')

      const { result } = renderHook(() => useVisitedLocations())

      await waitFor(() => {
        expect(result.current.error).not.toBeNull()
      })

      expect(result.current.error?.code).toBe('NETWORK_ERROR')
    })
  })

  describe('refetch', () => {
    it('should allow manual refetch', async () => {
      mockFetchRecentlyVisitedLocations.mockResolvedValue([])

      const { result } = renderHook(() => useVisitedLocations())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      mockFetchRecentlyVisitedLocations.mockClear()
      mockFetchRecentlyVisitedLocations.mockResolvedValue([
        { id: 'loc-2', name: 'Refetched', visited_at: '2024-01-02' },
      ])

      await result.current.refetch()

      expect(mockFetchRecentlyVisitedLocations).toHaveBeenCalled()
    })
  })

  describe('success', () => {
    it('should set locations on success', async () => {
      const mockLocations = [
        { id: 'loc-1', name: 'Place 1', visited_at: '2024-01-01' },
        { id: 'loc-2', name: 'Place 2', visited_at: '2024-01-02' },
      ]
      mockFetchRecentlyVisitedLocations.mockResolvedValue(mockLocations)

      const { result } = renderHook(() => useVisitedLocations())

      await waitFor(() => {
        expect(result.current.locations).toHaveLength(2)
      })

      expect(result.current.lastFetchedAt).not.toBeNull()
    })

    it('should set empty locations array on error', async () => {
      mockFetchRecentlyVisitedLocations.mockRejectedValue(new Error('Failed'))

      const { result } = renderHook(() => useVisitedLocations())

      await waitFor(() => {
        expect(result.current.error).not.toBeNull()
      })

      expect(result.current.locations).toEqual([])
    })
  })
})

describe('useNearbyLocations - fetching', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    mockFetchNearbyLocations.mockResolvedValue([])
    mockFetchLocationsWithActivePosts.mockResolvedValue([])
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should fetch after debounce delay', async () => {
    const mockLocations = [
      { id: 'loc-1', name: 'Place 1', distance_meters: 100 },
    ]
    mockFetchNearbyLocations.mockResolvedValue(mockLocations)

    const { result } = renderHook(() =>
      useNearbyLocations({ latitude: 37.7749, longitude: -122.4194 })
    )

    // Initially not called
    expect(mockFetchNearbyLocations).not.toHaveBeenCalled()

    // Advance past debounce delay
    await vi.advanceTimersByTimeAsync(350)

    expect(mockFetchNearbyLocations).toHaveBeenCalled()
  })

  it('should fetch with active posts when withActivePosts is true', async () => {
    const mockLocations = [
      { id: 'loc-1', name: 'Place 1', distance_meters: 100, post_count: 5 },
    ]
    mockFetchLocationsWithActivePosts.mockResolvedValue(mockLocations)

    renderHook(() =>
      useNearbyLocations(
        { latitude: 37.7749, longitude: -122.4194 },
        { withActivePosts: true }
      )
    )

    await vi.advanceTimersByTimeAsync(350)

    expect(mockFetchLocationsWithActivePosts).toHaveBeenCalled()
    expect(mockFetchNearbyLocations).not.toHaveBeenCalled()
  })

  it('should use custom radius and maxResults', async () => {
    mockFetchNearbyLocations.mockResolvedValue([])

    renderHook(() =>
      useNearbyLocations(
        { latitude: 37.7749, longitude: -122.4194 },
        { radiusMeters: 10000, maxResults: 25 }
      )
    )

    await vi.advanceTimersByTimeAsync(350)

    expect(mockFetchNearbyLocations).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        radius_meters: 10000,
        max_results: 25,
      })
    )
  })

  it('should handle GeoError', async () => {
    const GeoError = (await import('../../lib/utils/geo')).GeoError
    mockFetchNearbyLocations.mockRejectedValue(
      new GeoError('DATABASE_ERROR', 'RPC call failed')
    )

    const { result } = renderHook(() =>
      useNearbyLocations({ latitude: 37.7749, longitude: -122.4194 })
    )

    await vi.advanceTimersByTimeAsync(350)

    await waitFor(() => {
      expect(result.current.error).not.toBeNull()
    })

    expect(result.current.error?.code).toBe('DATABASE_ERROR')
  })

  it('should wrap non-GeoError errors', async () => {
    mockFetchNearbyLocations.mockRejectedValue(new Error('Network error'))

    const { result } = renderHook(() =>
      useNearbyLocations({ latitude: 37.7749, longitude: -122.4194 })
    )

    await vi.advanceTimersByTimeAsync(350)

    await waitFor(() => {
      expect(result.current.error).not.toBeNull()
    })

    expect(result.current.error?.code).toBe('NETWORK_ERROR')
  })

  it('should handle non-Error exceptions', async () => {
    mockFetchNearbyLocations.mockRejectedValue('String error')

    const { result } = renderHook(() =>
      useNearbyLocations({ latitude: 37.7749, longitude: -122.4194 })
    )

    await vi.advanceTimersByTimeAsync(350)

    await waitFor(() => {
      expect(result.current.error).not.toBeNull()
    })

    expect(result.current.error?.code).toBe('NETWORK_ERROR')
  })

  it('should set locations on success', async () => {
    const mockLocations = [
      { id: 'loc-1', name: 'Place 1', distance_meters: 100 },
      { id: 'loc-2', name: 'Place 2', distance_meters: 200 },
    ]
    mockFetchNearbyLocations.mockResolvedValue(mockLocations)

    const { result } = renderHook(() =>
      useNearbyLocations({ latitude: 37.7749, longitude: -122.4194 })
    )

    await vi.advanceTimersByTimeAsync(350)

    await waitFor(() => {
      expect(result.current.locations).toHaveLength(2)
    })

    expect(result.current.lastFetchedAt).not.toBeNull()
  })

  it('should clear locations when coordinates become null', async () => {
    mockFetchNearbyLocations.mockResolvedValue([
      { id: 'loc-1', name: 'Place 1', distance_meters: 100 },
    ])

    const { result, rerender } = renderHook(
      ({ coords }: { coords: { latitude: number; longitude: number } | null }) => useNearbyLocations(coords),
      { initialProps: { coords: { latitude: 37.7749, longitude: -122.4194 } as { latitude: number; longitude: number } | null } }
    )

    await vi.advanceTimersByTimeAsync(350)

    await waitFor(() => {
      expect(result.current.locations).toHaveLength(1)
    })

    // Set coordinates to null
    rerender({ coords: null })

    expect(result.current.locations).toEqual([])
  })

  it('should call refetch immediately without debounce', async () => {
    mockFetchNearbyLocations.mockResolvedValue([])

    const { result } = renderHook(() =>
      useNearbyLocations({ latitude: 37.7749, longitude: -122.4194 })
    )

    await vi.advanceTimersByTimeAsync(350)

    mockFetchNearbyLocations.mockClear()
    mockFetchNearbyLocations.mockResolvedValue([
      { id: 'loc-new', name: 'New Place', distance_meters: 50 },
    ])

    await result.current.refetch()

    expect(mockFetchNearbyLocations).toHaveBeenCalled()
  })

  it('should use minPostCount when withActivePosts is true', async () => {
    mockFetchLocationsWithActivePosts.mockResolvedValue([])

    renderHook(() =>
      useNearbyLocations(
        { latitude: 37.7749, longitude: -122.4194 },
        { withActivePosts: true, minPostCount: 3 }
      )
    )

    await vi.advanceTimersByTimeAsync(350)

    expect(mockFetchLocationsWithActivePosts).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        min_post_count: 3,
      })
    )
  })
})
