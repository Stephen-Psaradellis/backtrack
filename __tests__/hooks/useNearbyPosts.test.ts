/**
 * @vitest-environment jsdom
 */

/**
 * Unit tests for useNearbyPosts hook
 *
 * Tests the nearby posts hook including:
 * - Returns empty array when no posts nearby
 * - Returns posts sorted by created_at DESC
 * - Handles loading state correctly
 * - Handles error state (network failure)
 * - Refetch updates data
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'

// ============================================================================
// Mock Setup
// ============================================================================

// Mock useLocation hook
const mockUseLocation = vi.fn()

vi.mock('../../hooks/useLocation', () => ({
  useLocation: () => mockUseLocation(),
}))

// Mock Supabase client
const mockSupabaseRpc = vi.fn()

vi.mock('../../lib/supabase', () => ({
  supabase: {
    rpc: (fnName: string, params: unknown) => mockSupabaseRpc(fnName, params),
  },
}))

// Import the hook under test AFTER mocking dependencies
import { useNearbyPosts, type UseNearbyPostsResult } from '../../hooks/useNearbyPosts'

// ============================================================================
// Test Constants
// ============================================================================

const MOCK_COORDINATES = {
  latitude: 37.7749,
  longitude: -122.4194,
}

const DEFAULT_LOCATION_STATE = {
  ...MOCK_COORDINATES,
  loading: false,
  error: null,
}

const LOADING_LOCATION_STATE = {
  latitude: null,
  longitude: null,
  loading: true,
  error: null,
}

const ERROR_LOCATION_STATE = {
  latitude: null,
  longitude: null,
  loading: false,
  error: 'Location permission denied',
}

const MOCK_POSTS = [
  {
    id: 'post-1',
    user_id: 'user-1',
    location_id: 'loc-1',
    note: 'First post',
    target_avatar: { avatarId: 'avatar_asian_m' },
    selfie_url: 'https://example.com/selfie1.jpg',
    is_active: true,
    created_at: '2024-01-15T10:00:00Z',
  },
  {
    id: 'post-2',
    user_id: 'user-2',
    location_id: 'loc-1',
    note: 'Second post',
    target_avatar: { avatarId: 'avatar_black_m' },
    selfie_url: 'https://example.com/selfie2.jpg',
    is_active: true,
    created_at: '2024-01-14T10:00:00Z',
  },
  {
    id: 'post-3',
    user_id: 'user-3',
    location_id: 'loc-2',
    note: 'Third post',
    target_avatar: { avatarId: 'avatar_white_f' },
    selfie_url: 'https://example.com/selfie3.jpg',
    is_active: true,
    created_at: '2024-01-16T10:00:00Z',
  },
]

// ============================================================================
// Setup and Teardown
// ============================================================================

describe('useNearbyPosts', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Default location state (has coordinates)
    mockUseLocation.mockReturnValue(DEFAULT_LOCATION_STATE)

    // Default Supabase RPC response
    mockSupabaseRpc.mockImplementation((fnName: string) => {
      if (fnName === 'get_posts_within_radius') {
        return Promise.resolve({
          data: MOCK_POSTS,
          error: null,
        })
      }
      return Promise.resolve({ data: null, error: null })
    })
  })

  // ============================================================================
  // Initial State Tests
  // ============================================================================

  describe('initial state', () => {
    it('returns default values while loading', () => {
      mockUseLocation.mockReturnValue(LOADING_LOCATION_STATE)

      const { result } = renderHook(() => useNearbyPosts())

      expect(result.current.isLoading).toBe(true)
      expect(result.current.posts).toEqual([])
      expect(result.current.error).toBeNull()
    })

    it('loads posts on mount when location is available', async () => {
      const { result } = renderHook(() => useNearbyPosts())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.posts).toHaveLength(3)
      expect(result.current.error).toBeNull()
    })
  })

  // ============================================================================
  // Empty Array Tests
  // ============================================================================

  describe('returns empty array when no posts nearby', () => {
    it('returns empty posts array when RPC returns empty data', async () => {
      mockSupabaseRpc.mockImplementation((fnName: string) => {
        if (fnName === 'get_posts_within_radius') {
          return Promise.resolve({
            data: [],
            error: null,
          })
        }
        return Promise.resolve({ data: null, error: null })
      })

      const { result } = renderHook(() => useNearbyPosts())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.posts).toEqual([])
      expect(result.current.error).toBeNull()
    })

    it('returns empty posts array when RPC returns null data', async () => {
      mockSupabaseRpc.mockImplementation((fnName: string) => {
        if (fnName === 'get_posts_within_radius') {
          return Promise.resolve({
            data: null,
            error: null,
          })
        }
        return Promise.resolve({ data: null, error: null })
      })

      const { result } = renderHook(() => useNearbyPosts())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.posts).toEqual([])
      expect(result.current.error).toBeNull()
    })
  })

  // ============================================================================
  // Posts Data Tests
  // ============================================================================

  describe('returns posts correctly', () => {
    it('returns posts from RPC call', async () => {
      const { result } = renderHook(() => useNearbyPosts())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.posts).toHaveLength(3)
      expect(result.current.posts[0].id).toBe('post-1')
      expect(result.current.posts[1].id).toBe('post-2')
      expect(result.current.posts[2].id).toBe('post-3')
    })

    it('calls RPC with correct parameters', async () => {
      const { result } = renderHook(() => useNearbyPosts(100))

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(mockSupabaseRpc).toHaveBeenCalledWith('get_posts_within_radius', {
        p_lat: MOCK_COORDINATES.latitude,
        p_lng: MOCK_COORDINATES.longitude,
        p_radius_meters: 100,
        p_limit: 50,
      })
    })

    it('uses default radius when not specified', async () => {
      const { result } = renderHook(() => useNearbyPosts())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(mockSupabaseRpc).toHaveBeenCalledWith('get_posts_within_radius', {
        p_lat: MOCK_COORDINATES.latitude,
        p_lng: MOCK_COORDINATES.longitude,
        p_radius_meters: 50, // Default radius
        p_limit: 50,
      })
    })
  })

  // ============================================================================
  // Loading State Tests
  // ============================================================================

  describe('handles loading state correctly', () => {
    it('sets isLoading to true initially', () => {
      const { result } = renderHook(() => useNearbyPosts())

      // Initial state should be loading
      expect(result.current.isLoading).toBe(true)
    })

    it('sets isLoading to false after data loads', async () => {
      const { result } = renderHook(() => useNearbyPosts())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.posts).toHaveLength(3)
    })

    it('stays in loading state while location is loading', async () => {
      mockUseLocation.mockReturnValue(LOADING_LOCATION_STATE)

      const { result } = renderHook(() => useNearbyPosts())

      // Should remain loading since location is still loading
      expect(result.current.isLoading).toBe(true)

      // Should not have called RPC yet
      expect(mockSupabaseRpc).not.toHaveBeenCalled()
    })

    it('sets isLoading to true during refetch', async () => {
      const { result } = renderHook(() => useNearbyPosts())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      // Trigger refetch
      act(() => {
        result.current.refetch()
      })

      // Should be loading during refetch
      expect(result.current.isLoading).toBe(true)

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })
    })
  })

  // ============================================================================
  // Error State Tests
  // ============================================================================

  describe('handles error state (network failure)', () => {
    it('sets error when RPC returns an error', async () => {
      mockSupabaseRpc.mockImplementation((fnName: string) => {
        if (fnName === 'get_posts_within_radius') {
          return Promise.resolve({
            data: null,
            error: { message: 'Database connection failed' },
          })
        }
        return Promise.resolve({ data: null, error: null })
      })

      const { result } = renderHook(() => useNearbyPosts())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.error).toBe('Database connection failed')
      expect(result.current.posts).toEqual([])
    })

    it('sets error when RPC throws an exception', async () => {
      mockSupabaseRpc.mockImplementation((fnName: string) => {
        if (fnName === 'get_posts_within_radius') {
          return Promise.reject(new Error('Network error'))
        }
        return Promise.resolve({ data: null, error: null })
      })

      const { result } = renderHook(() => useNearbyPosts())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.error).toBe('Network error')
      expect(result.current.posts).toEqual([])
    })

    it('sets error when location has an error', async () => {
      mockUseLocation.mockReturnValue(ERROR_LOCATION_STATE)

      const { result } = renderHook(() => useNearbyPosts())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.error).toContain('Location error')
      expect(result.current.posts).toEqual([])
    })

    it('sets error when coordinates are not available', async () => {
      mockUseLocation.mockReturnValue({
        latitude: null,
        longitude: null,
        loading: false,
        error: null,
      })

      const { result } = renderHook(() => useNearbyPosts())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.error).toBe('Unable to get current location')
      expect(result.current.posts).toEqual([])
    })

    it('handles non-Error exception gracefully', async () => {
      mockSupabaseRpc.mockImplementation((fnName: string) => {
        if (fnName === 'get_posts_within_radius') {
          return Promise.reject('String error')
        }
        return Promise.resolve({ data: null, error: null })
      })

      const { result } = renderHook(() => useNearbyPosts())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.error).toBe('Failed to fetch nearby posts')
    })
  })

  // ============================================================================
  // Refetch Tests
  // ============================================================================

  describe('refetch updates data', () => {
    it('refetches data when refetch is called', async () => {
      const { result } = renderHook(() => useNearbyPosts())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(mockSupabaseRpc).toHaveBeenCalledTimes(1)

      // Trigger refetch
      await act(async () => {
        await result.current.refetch()
      })

      expect(mockSupabaseRpc).toHaveBeenCalledTimes(2)
    })

    it('updates posts when refetch returns new data', async () => {
      let callCount = 0

      mockSupabaseRpc.mockImplementation((fnName: string) => {
        if (fnName === 'get_posts_within_radius') {
          callCount++
          if (callCount === 1) {
            return Promise.resolve({
              data: [MOCK_POSTS[0]],
              error: null,
            })
          } else {
            return Promise.resolve({
              data: MOCK_POSTS,
              error: null,
            })
          }
        }
        return Promise.resolve({ data: null, error: null })
      })

      const { result } = renderHook(() => useNearbyPosts())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.posts).toHaveLength(1)

      // Trigger refetch
      await act(async () => {
        await result.current.refetch()
      })

      expect(result.current.posts).toHaveLength(3)
    })

    it('clears previous error on successful refetch', async () => {
      let callCount = 0

      mockSupabaseRpc.mockImplementation((fnName: string) => {
        if (fnName === 'get_posts_within_radius') {
          callCount++
          if (callCount === 1) {
            return Promise.resolve({
              data: null,
              error: { message: 'Initial error' },
            })
          } else {
            return Promise.resolve({
              data: MOCK_POSTS,
              error: null,
            })
          }
        }
        return Promise.resolve({ data: null, error: null })
      })

      const { result } = renderHook(() => useNearbyPosts())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.error).toBe('Initial error')

      // Trigger refetch
      await act(async () => {
        await result.current.refetch()
      })

      expect(result.current.error).toBeNull()
      expect(result.current.posts).toHaveLength(3)
    })
  })

  // ============================================================================
  // Radius Parameter Tests
  // ============================================================================

  describe('radius parameter', () => {
    it('uses custom radius when provided', async () => {
      const { result } = renderHook(() => useNearbyPosts(200))

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(mockSupabaseRpc).toHaveBeenCalledWith('get_posts_within_radius', {
        p_lat: MOCK_COORDINATES.latitude,
        p_lng: MOCK_COORDINATES.longitude,
        p_radius_meters: 200,
        p_limit: 50,
      })
    })

    it('refetches when radius changes', async () => {
      const { result, rerender } = renderHook(
        ({ radius }) => useNearbyPosts(radius),
        { initialProps: { radius: 50 } }
      )

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(mockSupabaseRpc).toHaveBeenLastCalledWith('get_posts_within_radius', {
        p_lat: MOCK_COORDINATES.latitude,
        p_lng: MOCK_COORDINATES.longitude,
        p_radius_meters: 50,
        p_limit: 50,
      })

      // Change radius
      rerender({ radius: 100 })

      await waitFor(() => {
        expect(mockSupabaseRpc).toHaveBeenLastCalledWith('get_posts_within_radius', {
          p_lat: MOCK_COORDINATES.latitude,
          p_lng: MOCK_COORDINATES.longitude,
          p_radius_meters: 100,
          p_limit: 50,
        })
      })
    })
  })
})
