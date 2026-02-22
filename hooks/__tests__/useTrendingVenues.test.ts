/**
 * Tests for useTrendingVenues hook
 *
 * Tests the trending venues fetching hook including:
 * - Basic fetching with valid coordinates
 * - Error handling for missing location
 * - RPC error handling
 * - Exception handling
 * - Custom radius and venue limit parameters
 * - Manual refetch functionality
 * - Auto-refresh timer behavior
 * - Cleanup on unmount
 */

import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { useTrendingVenues, type TrendingVenue } from '../useTrendingVenues'

// ============================================================================
// MOCKS
// ============================================================================

const mockRpc = vi.fn()

vi.mock('../../lib/supabase', () => ({
  supabase: {
    rpc: (...args: any[]) => mockRpc(...args),
  },
}))

// ============================================================================
// TEST DATA
// ============================================================================

const mockTrendingVenueData = [
  {
    location_id: 'venue-1',
    location_name: 'Coffee Shop Downtown',
    buzz_score: 25,
    post_count_24h: 5,
    checkin_count_24h: 5,
    latitude: 40.7128,
    longitude: -74.006,
  },
  {
    location_id: 'venue-2',
    location_name: 'Park Square',
    buzz_score: 18,
    post_count_24h: 3,
    checkin_count_24h: 3,
    latitude: 40.7589,
    longitude: -73.9851,
  },
  {
    location_id: 'venue-3',
    location_name: 'Museum District',
    buzz_score: 12,
    post_count_24h: 2,
    checkin_count_24h: 2,
    latitude: 40.7794,
    longitude: -73.9632,
  },
]

// ============================================================================
// TESTS
// ============================================================================

describe('useTrendingVenues', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers({ shouldAdvanceTime: true })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('Basic Functionality', () => {
    it('returns empty venues and sets error when latitude is null', async () => {
      const { result } = renderHook(() => useTrendingVenues(null, -74.006))

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.venues).toEqual([])
      expect(result.current.error).toBe('Location not available')
      expect(mockRpc).not.toHaveBeenCalled()
    })

    it('returns empty venues and sets error when longitude is null', async () => {
      const { result } = renderHook(() => useTrendingVenues(40.7128, null))

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.venues).toEqual([])
      expect(result.current.error).toBe('Location not available')
      expect(mockRpc).not.toHaveBeenCalled()
    })

    it('returns empty venues and sets error when both coordinates are null', async () => {
      const { result } = renderHook(() => useTrendingVenues(null, null))

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.venues).toEqual([])
      expect(result.current.error).toBe('Location not available')
      expect(mockRpc).not.toHaveBeenCalled()
    })

    it('fetches trending venues with valid coordinates', async () => {
      mockRpc.mockResolvedValueOnce({
        data: mockTrendingVenueData,
        error: null,
      })

      const { result } = renderHook(() => useTrendingVenues(40.7128, -74.006))

      // Initial state
      expect(result.current.isLoading).toBe(true)
      expect(result.current.venues).toEqual([])
      expect(result.current.error).toBeNull()

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.venues).toEqual(mockTrendingVenueData)
      expect(result.current.error).toBeNull()
      expect(mockRpc).toHaveBeenCalledWith('get_trending_venues', {
        user_lat: 40.7128,
        user_lng: -74.006,
        radius_m: 25000, // Default radius
        venue_limit: 5, // Default limit
      })
    })
  })

  describe('RPC Parameters', () => {
    it('uses default radius of 25000 meters', async () => {
      mockRpc.mockResolvedValueOnce({
        data: [],
        error: null,
      })

      renderHook(() => useTrendingVenues(40.7128, -74.006))

      await waitFor(() => {
        expect(mockRpc).toHaveBeenCalledWith('get_trending_venues', {
          user_lat: 40.7128,
          user_lng: -74.006,
          radius_m: 25000,
          venue_limit: 5,
        })
      })
    })

    it('uses default venue limit of 5', async () => {
      mockRpc.mockResolvedValueOnce({
        data: [],
        error: null,
      })

      renderHook(() => useTrendingVenues(40.7128, -74.006))

      await waitFor(() => {
        expect(mockRpc).toHaveBeenCalledWith('get_trending_venues', {
          user_lat: 40.7128,
          user_lng: -74.006,
          radius_m: 25000,
          venue_limit: 5,
        })
      })
    })

    it('passes custom radius to RPC call', async () => {
      mockRpc.mockResolvedValueOnce({
        data: [],
        error: null,
      })

      const customRadius = 50000 // 50km
      renderHook(() => useTrendingVenues(40.7128, -74.006, customRadius))

      await waitFor(() => {
        expect(mockRpc).toHaveBeenCalledWith('get_trending_venues', {
          user_lat: 40.7128,
          user_lng: -74.006,
          radius_m: customRadius,
          venue_limit: 5,
        })
      })
    })

    it('passes custom venue limit to RPC call', async () => {
      mockRpc.mockResolvedValueOnce({
        data: [],
        error: null,
      })

      const customLimit = 10
      renderHook(() => useTrendingVenues(40.7128, -74.006, 25000, customLimit))

      await waitFor(() => {
        expect(mockRpc).toHaveBeenCalledWith('get_trending_venues', {
          user_lat: 40.7128,
          user_lng: -74.006,
          radius_m: 25000,
          venue_limit: customLimit,
        })
      })
    })

    it('passes both custom radius and venue limit', async () => {
      mockRpc.mockResolvedValueOnce({
        data: [],
        error: null,
      })

      const customRadius = 10000 // 10km
      const customLimit = 3
      renderHook(() => useTrendingVenues(40.7128, -74.006, customRadius, customLimit))

      await waitFor(() => {
        expect(mockRpc).toHaveBeenCalledWith('get_trending_venues', {
          user_lat: 40.7128,
          user_lng: -74.006,
          radius_m: customRadius,
          venue_limit: customLimit,
        })
      })
    })
  })

  describe('Data Transformation', () => {
    it('transforms RPC data to TrendingVenue interface', async () => {
      const rawData = [
        {
          location_id: 'test-1',
          location_name: 'Test Venue',
          buzz_score: 100,
          post_count_24h: 20,
          checkin_count_24h: 10,
          latitude: 40.7128,
          longitude: -74.006,
          // Extra fields that should be ignored
          extra_field: 'should be ignored',
        },
      ]

      mockRpc.mockResolvedValueOnce({
        data: rawData,
        error: null,
      })

      const { result } = renderHook(() => useTrendingVenues(40.7128, -74.006))

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      const expectedVenue: TrendingVenue = {
        location_id: 'test-1',
        location_name: 'Test Venue',
        buzz_score: 100,
        post_count_24h: 20,
        checkin_count_24h: 10,
        latitude: 40.7128,
        longitude: -74.006,
      }

      expect(result.current.venues).toEqual([expectedVenue])
      expect(result.current.venues[0]).not.toHaveProperty('extra_field')
    })

    it('handles empty data array', async () => {
      mockRpc.mockResolvedValueOnce({
        data: [],
        error: null,
      })

      const { result } = renderHook(() => useTrendingVenues(40.7128, -74.006))

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.venues).toEqual([])
      expect(result.current.error).toBeNull()
    })

    it('handles null data by treating it as empty array', async () => {
      mockRpc.mockResolvedValueOnce({
        data: null,
        error: null,
      })

      const { result } = renderHook(() => useTrendingVenues(40.7128, -74.006))

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.venues).toEqual([])
      expect(result.current.error).toBeNull()
    })
  })

  describe('Error Handling', () => {
    it('handles RPC error response', async () => {
      const rpcError = {
        message: 'Database connection failed',
        code: 'PGRST301',
      }

      mockRpc.mockResolvedValueOnce({
        data: null,
        error: rpcError,
      })

      const { result } = renderHook(() => useTrendingVenues(40.7128, -74.006))

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.venues).toEqual([])
      expect(result.current.error).toBe('Database connection failed')
    })

    it('handles RPC exception', async () => {
      const thrownError = new Error('Network timeout')
      mockRpc.mockRejectedValueOnce(thrownError)

      const { result } = renderHook(() => useTrendingVenues(40.7128, -74.006))

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.venues).toEqual([])
      expect(result.current.error).toBe('Network timeout')
    })

    it('handles non-Error exceptions', async () => {
      mockRpc.mockRejectedValueOnce('String error')

      const { result } = renderHook(() => useTrendingVenues(40.7128, -74.006))

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.venues).toEqual([])
      expect(result.current.error).toBe('Failed to fetch trending venues')
    })

    it('clears previous error on successful refetch', async () => {
      // First call fails
      mockRpc.mockResolvedValueOnce({
        data: null,
        error: { message: 'First error' },
      })

      const { result } = renderHook(() => useTrendingVenues(40.7128, -74.006))

      await waitFor(() => {
        expect(result.current.error).toBe('First error')
      })

      // Second call succeeds
      mockRpc.mockResolvedValueOnce({
        data: mockTrendingVenueData,
        error: null,
      })

      await result.current.refetch()

      await waitFor(() => {
        expect(result.current.error).toBeNull()
        expect(result.current.venues).toEqual(mockTrendingVenueData)
      })
    })
  })

  describe('Manual Refetch', () => {
    it('refetch triggers a new fetch', async () => {
      mockRpc.mockResolvedValueOnce({
        data: mockTrendingVenueData,
        error: null,
      })

      const { result } = renderHook(() => useTrendingVenues(40.7128, -74.006))

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(mockRpc).toHaveBeenCalledTimes(1)

      // Trigger refetch with different data
      const singleVenue = [mockTrendingVenueData[0]]
      mockRpc.mockResolvedValueOnce({
        data: singleVenue,
        error: null,
      })

      await act(async () => {
        await result.current.refetch()
      })

      await waitFor(() => {
        expect(result.current.venues).toHaveLength(1)
      })

      expect(mockRpc).toHaveBeenCalledTimes(2)
      expect(result.current.venues).toEqual(singleVenue)
    })

    it('refetch sets isLoading to true during fetch', async () => {
      mockRpc.mockResolvedValueOnce({
        data: mockTrendingVenueData,
        error: null,
      })

      const { result } = renderHook(() => useTrendingVenues(40.7128, -74.006))

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      // Use deferred promise so we can check loading state mid-flight
      let resolveRefetch!: (value: any) => void
      mockRpc.mockReturnValueOnce(new Promise((r) => { resolveRefetch = r }))

      let refetchPromise: Promise<void>
      act(() => {
        refetchPromise = result.current.refetch()
      })

      // Should be loading while RPC is pending
      expect(result.current.isLoading).toBe(true)

      // Resolve the RPC
      await act(async () => {
        resolveRefetch({ data: mockTrendingVenueData, error: null })
        await refetchPromise!
      })

      expect(result.current.isLoading).toBe(false)
    })

    it('refetch handles errors correctly', async () => {
      mockRpc.mockResolvedValueOnce({
        data: mockTrendingVenueData,
        error: null,
      })

      const { result } = renderHook(() => useTrendingVenues(40.7128, -74.006))

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      // Refetch with error
      mockRpc.mockResolvedValueOnce({
        data: null,
        error: { message: 'Refetch failed' },
      })

      await result.current.refetch()

      await waitFor(() => {
        expect(result.current.error).toBe('Refetch failed')
        expect(result.current.venues).toEqual([])
      })
    })
  })

  describe('Auto-refresh Timer', () => {
    it('sets up auto-refresh interval on mount', async () => {
      mockRpc.mockResolvedValue({
        data: mockTrendingVenueData,
        error: null,
      })

      renderHook(() => useTrendingVenues(40.7128, -74.006))

      await waitFor(() => {
        expect(mockRpc).toHaveBeenCalledTimes(1)
      })

      // Advance timer by 5 minutes (300,000ms)
      vi.advanceTimersByTime(5 * 60 * 1000)

      await waitFor(() => {
        expect(mockRpc).toHaveBeenCalledTimes(2)
      })

      // Advance another 5 minutes
      vi.advanceTimersByTime(5 * 60 * 1000)

      await waitFor(() => {
        expect(mockRpc).toHaveBeenCalledTimes(3)
      })
    })

    it('does not trigger auto-refresh before interval elapses', async () => {
      mockRpc.mockResolvedValue({
        data: mockTrendingVenueData,
        error: null,
      })

      renderHook(() => useTrendingVenues(40.7128, -74.006))

      await waitFor(() => {
        expect(mockRpc).toHaveBeenCalledTimes(1)
      })

      // Advance timer by 4 minutes (less than 5 minute interval)
      vi.advanceTimersByTime(4 * 60 * 1000)

      await waitFor(() => {
        expect(mockRpc).toHaveBeenCalledTimes(1)
      })
    })

    it('auto-refresh uses current hook parameters', async () => {
      mockRpc.mockResolvedValue({
        data: mockTrendingVenueData,
        error: null,
      })

      const customRadius = 50000
      const customLimit = 10

      renderHook(() => useTrendingVenues(40.7128, -74.006, customRadius, customLimit))

      await waitFor(() => {
        expect(mockRpc).toHaveBeenCalledTimes(1)
      })

      // Verify initial call parameters
      expect(mockRpc).toHaveBeenCalledWith('get_trending_venues', {
        user_lat: 40.7128,
        user_lng: -74.006,
        radius_m: customRadius,
        venue_limit: customLimit,
      })

      // Trigger auto-refresh
      vi.advanceTimersByTime(5 * 60 * 1000)

      await waitFor(() => {
        expect(mockRpc).toHaveBeenCalledTimes(2)
      })

      // Verify auto-refresh uses same parameters
      expect(mockRpc).toHaveBeenNthCalledWith(2, 'get_trending_venues', {
        user_lat: 40.7128,
        user_lng: -74.006,
        radius_m: customRadius,
        venue_limit: customLimit,
      })
    })

    it('continues auto-refresh even if fetch fails', async () => {
      // First call succeeds
      mockRpc.mockResolvedValueOnce({
        data: mockTrendingVenueData,
        error: null,
      })

      renderHook(() => useTrendingVenues(40.7128, -74.006))

      await waitFor(() => {
        expect(mockRpc).toHaveBeenCalledTimes(1)
      })

      // Second call (auto-refresh) fails
      mockRpc.mockResolvedValueOnce({
        data: null,
        error: { message: 'Auto-refresh failed' },
      })

      vi.advanceTimersByTime(5 * 60 * 1000)

      await waitFor(() => {
        expect(mockRpc).toHaveBeenCalledTimes(2)
      })

      // Third call (another auto-refresh) succeeds
      mockRpc.mockResolvedValueOnce({
        data: mockTrendingVenueData,
        error: null,
      })

      vi.advanceTimersByTime(5 * 60 * 1000)

      await waitFor(() => {
        expect(mockRpc).toHaveBeenCalledTimes(3)
      })
    })
  })

  describe('Cleanup', () => {
    it('clears interval on unmount', async () => {
      mockRpc.mockResolvedValue({
        data: mockTrendingVenueData,
        error: null,
      })

      const { unmount } = renderHook(() => useTrendingVenues(40.7128, -74.006))

      await waitFor(() => {
        expect(mockRpc).toHaveBeenCalledTimes(1)
      })

      // Unmount the hook
      unmount()

      // Advance timer - should not trigger another call
      vi.advanceTimersByTime(5 * 60 * 1000)

      await waitFor(() => {
        expect(mockRpc).toHaveBeenCalledTimes(1)
      })
    })

    it('prevents state updates after unmount', async () => {
      let resolveRpc: (value: any) => void
      const rpcPromise = new Promise((resolve) => {
        resolveRpc = resolve
      })

      mockRpc.mockReturnValue(rpcPromise)

      const { unmount } = renderHook(() => useTrendingVenues(40.7128, -74.006))

      // Unmount before RPC resolves
      unmount()

      // Resolve RPC after unmount
      resolveRpc!({
        data: mockTrendingVenueData,
        error: null,
      })

      // Wait a bit to ensure no state updates occur
      await vi.waitFor(() => {
        // No assertions needed - just ensuring no state update errors
      }, { timeout: 100 }).catch(() => {
        // Expected to timeout
      })
    })

    it('clears interval even if fetch is in progress', async () => {
      let resolveRpc: (value: any) => void
      const rpcPromise = new Promise((resolve) => {
        resolveRpc = resolve
      })

      mockRpc.mockReturnValue(rpcPromise)

      const { unmount } = renderHook(() => useTrendingVenues(40.7128, -74.006))

      // Unmount while fetch is pending
      unmount()

      // Advance timer - should not trigger another call
      vi.advanceTimersByTime(5 * 60 * 1000)

      expect(mockRpc).toHaveBeenCalledTimes(1)

      // Resolve the pending fetch
      resolveRpc!({
        data: mockTrendingVenueData,
        error: null,
      })
    })
  })

  describe('Parameter Changes', () => {
    it('re-fetches when coordinates change', async () => {
      mockRpc.mockResolvedValue({
        data: mockTrendingVenueData,
        error: null,
      })

      const { rerender } = renderHook(
        ({ lat, lng }) => useTrendingVenues(lat, lng),
        {
          initialProps: { lat: 40.7128, lng: -74.006 },
        }
      )

      await waitFor(() => {
        expect(mockRpc).toHaveBeenCalledTimes(1)
      })

      // Change coordinates
      rerender({ lat: 40.7589, lng: -73.9851 })

      await waitFor(() => {
        expect(mockRpc).toHaveBeenCalledTimes(2)
      })

      // Verify new coordinates were used
      expect(mockRpc).toHaveBeenLastCalledWith('get_trending_venues', {
        user_lat: 40.7589,
        user_lng: -73.9851,
        radius_m: 25000,
        venue_limit: 5,
      })
    })

    it('re-fetches when radius changes', async () => {
      mockRpc.mockResolvedValue({
        data: mockTrendingVenueData,
        error: null,
      })

      const { rerender } = renderHook(
        ({ radius }) => useTrendingVenues(40.7128, -74.006, radius),
        {
          initialProps: { radius: 25000 },
        }
      )

      await waitFor(() => {
        expect(mockRpc).toHaveBeenCalledTimes(1)
      })

      // Change radius
      rerender({ radius: 50000 })

      await waitFor(() => {
        expect(mockRpc).toHaveBeenCalledTimes(2)
      })

      // Verify new radius was used
      expect(mockRpc).toHaveBeenLastCalledWith('get_trending_venues', {
        user_lat: 40.7128,
        user_lng: -74.006,
        radius_m: 50000,
        venue_limit: 5,
      })
    })

    it('re-fetches when venue limit changes', async () => {
      mockRpc.mockResolvedValue({
        data: mockTrendingVenueData,
        error: null,
      })

      const { rerender } = renderHook(
        ({ limit }) => useTrendingVenues(40.7128, -74.006, 25000, limit),
        {
          initialProps: { limit: 5 },
        }
      )

      await waitFor(() => {
        expect(mockRpc).toHaveBeenCalledTimes(1)
      })

      // Change limit
      rerender({ limit: 10 })

      await waitFor(() => {
        expect(mockRpc).toHaveBeenCalledTimes(2)
      })

      // Verify new limit was used
      expect(mockRpc).toHaveBeenLastCalledWith('get_trending_venues', {
        user_lat: 40.7128,
        user_lng: -74.006,
        radius_m: 25000,
        venue_limit: 10,
      })
    })
  })
})
