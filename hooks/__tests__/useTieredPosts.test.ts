/**
 * Tests for hooks/useTieredPosts.ts
 *
 * Tests tiered posts hook with RPC-based data fetching.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'

// Mock supabase
const mockRpc = vi.fn()

vi.mock('../../lib/supabase', () => ({
  supabase: {
    rpc: (...args: unknown[]) => mockRpc(...args),
  },
}))

import { useTieredPosts, useVerifiedPosts, useFavoriteSpotPosts } from '../useTieredPosts'

describe('useTieredPosts', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Default: empty posts
    mockRpc.mockResolvedValue({
      data: [],
      error: null,
    })
  })

  describe('initial state', () => {
    it('should start with loading true', () => {
      const { result } = renderHook(() => useTieredPosts())

      expect(result.current.isLoading).toBe(true)
    })

    it('should start with empty posts groups', () => {
      const { result } = renderHook(() => useTieredPosts({ enabled: false }))

      expect(result.current.posts.verified).toEqual([])
      expect(result.current.posts.regularSpots).toEqual([])
      expect(result.current.posts.other).toEqual([])
    })

    it('should start with empty allPosts', () => {
      const { result } = renderHook(() => useTieredPosts({ enabled: false }))

      expect(result.current.allPosts).toEqual([])
    })

    it('should start with hasMore true', () => {
      const { result } = renderHook(() => useTieredPosts({ enabled: false }))

      expect(result.current.hasMore).toBe(true)
    })

    it('should start with no error', () => {
      const { result } = renderHook(() => useTieredPosts({ enabled: false }))

      expect(result.current.error).toBeNull()
    })
  })

  describe('fetching posts', () => {
    it('should fetch posts on mount when enabled', async () => {
      renderHook(() => useTieredPosts())

      await waitFor(() => {
        expect(mockRpc).toHaveBeenCalledWith('get_posts_for_user', {
          p_location_id: null,
          p_limit: 50,
          p_offset: 0,
        })
      })
    })

    it('should not fetch when enabled is false', async () => {
      renderHook(() => useTieredPosts({ enabled: false }))

      await new Promise((r) => setTimeout(r, 50))

      expect(mockRpc).not.toHaveBeenCalled()
    })

    it('should pass locationId to RPC', async () => {
      renderHook(() => useTieredPosts({ locationId: 'loc-123' }))

      await waitFor(() => {
        expect(mockRpc).toHaveBeenCalledWith('get_posts_for_user', {
          p_location_id: 'loc-123',
          p_limit: 50,
          p_offset: 0,
        })
      })
    })

    it('should use custom limit', async () => {
      renderHook(() => useTieredPosts({ limit: 25 }))

      await waitFor(() => {
        expect(mockRpc).toHaveBeenCalledWith('get_posts_for_user', {
          p_location_id: null,
          p_limit: 25,
          p_offset: 0,
        })
      })
    })
  })

  describe('grouping posts by tier', () => {
    it('should group verified posts correctly', async () => {
      const mockPosts = [
        {
          post_id: 'post-1',
          location_id: 'loc-1',
          location_name: 'Test Location',
          producer_id: 'user-1',
          message: 'Hello',
          target_avatar_v2: null,
          sighting_date: null,
          time_granularity: null,
          created_at: '2024-01-01T12:00:00Z',
          expires_at: '2024-01-08T12:00:00Z',
          matching_tier: 'verified_checkin',
          user_was_there: true,
          checkin_id: 'checkin-1',
        },
      ]

      mockRpc.mockResolvedValue({ data: mockPosts, error: null })

      const { result } = renderHook(() => useTieredPosts())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.posts.verified).toHaveLength(1)
      expect(result.current.posts.regularSpots).toHaveLength(0)
      expect(result.current.posts.other).toHaveLength(0)
    })

    it('should group regular spots correctly', async () => {
      const mockPosts = [
        {
          post_id: 'post-1',
          location_id: 'loc-1',
          location_name: 'Test Location',
          producer_id: 'user-1',
          message: 'Hello',
          target_avatar_v2: null,
          sighting_date: null,
          time_granularity: null,
          created_at: '2024-01-01T12:00:00Z',
          expires_at: '2024-01-08T12:00:00Z',
          matching_tier: 'regular_spot',
          user_was_there: false,
          checkin_id: null,
        },
      ]

      mockRpc.mockResolvedValue({ data: mockPosts, error: null })

      const { result } = renderHook(() => useTieredPosts())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.posts.verified).toHaveLength(0)
      expect(result.current.posts.regularSpots).toHaveLength(1)
      expect(result.current.posts.other).toHaveLength(0)
    })

    it('should group other posts correctly', async () => {
      const mockPosts = [
        {
          post_id: 'post-1',
          location_id: 'loc-1',
          location_name: 'Test Location',
          producer_id: 'user-1',
          message: 'Hello',
          target_avatar_v2: null,
          sighting_date: null,
          time_granularity: null,
          created_at: '2024-01-01T12:00:00Z',
          expires_at: '2024-01-08T12:00:00Z',
          matching_tier: 'other',
          user_was_there: false,
          checkin_id: null,
        },
      ]

      mockRpc.mockResolvedValue({ data: mockPosts, error: null })

      const { result } = renderHook(() => useTieredPosts())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.posts.verified).toHaveLength(0)
      expect(result.current.posts.regularSpots).toHaveLength(0)
      expect(result.current.posts.other).toHaveLength(1)
    })

    it('should set allPosts as flat array', async () => {
      const mockPosts = [
        { post_id: 'post-1', matching_tier: 'verified_checkin' },
        { post_id: 'post-2', matching_tier: 'regular_spot' },
        { post_id: 'post-3', matching_tier: 'other' },
      ]

      mockRpc.mockResolvedValue({ data: mockPosts, error: null })

      const { result } = renderHook(() => useTieredPosts())

      await waitFor(() => {
        expect(result.current.allPosts).toHaveLength(3)
      })
    })
  })

  describe('error handling', () => {
    it('should set error when fetch fails', async () => {
      mockRpc.mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      })

      const { result } = renderHook(() => useTieredPosts())

      await waitFor(() => {
        expect(result.current.error).toBe('Database error')
      })
    })

    it('should handle exception during fetch', async () => {
      mockRpc.mockRejectedValue(new Error('Network error'))

      const { result } = renderHook(() => useTieredPosts())

      await waitFor(() => {
        expect(result.current.error).toBe('Network error')
      })
    })

    it('should handle non-Error exception', async () => {
      mockRpc.mockRejectedValue('string error')

      const { result } = renderHook(() => useTieredPosts())

      await waitFor(() => {
        expect(result.current.error).toBe('Failed to fetch posts')
      })
    })
  })

  describe('refresh', () => {
    it('should refresh posts', async () => {
      const { result } = renderHook(() => useTieredPosts())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      mockRpc.mockClear()
      mockRpc.mockResolvedValue({
        data: [{ post_id: 'refreshed', matching_tier: 'other' }],
        error: null,
      })

      await act(async () => {
        await result.current.refresh()
      })

      expect(mockRpc).toHaveBeenCalled()
      expect(result.current.allPosts[0].post_id).toBe('refreshed')
    })

    it('should set isRefreshing during refresh', async () => {
      let resolveRpc: (value: unknown) => void
      mockRpc.mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveRpc = resolve
          })
      )

      const { result } = renderHook(() => useTieredPosts())

      // Resolve initial fetch
      await act(async () => {
        resolveRpc!({ data: [], error: null })
      })

      // Start refresh
      act(() => {
        result.current.refresh()
      })

      expect(result.current.isRefreshing).toBe(true)

      await act(async () => {
        resolveRpc!({ data: [], error: null })
      })

      expect(result.current.isRefreshing).toBe(false)
    })
  })

  describe('pagination', () => {
    it('should load more posts', async () => {
      const initialPosts = Array.from({ length: 50 }, (_, i) => ({
        post_id: `post-${i}`,
        matching_tier: 'other',
      }))

      mockRpc.mockResolvedValueOnce({ data: initialPosts, error: null })

      const { result } = renderHook(() => useTieredPosts())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.hasMore).toBe(true)

      const morePosts = Array.from({ length: 25 }, (_, i) => ({
        post_id: `post-more-${i}`,
        matching_tier: 'other',
      }))

      mockRpc.mockResolvedValueOnce({ data: morePosts, error: null })

      await act(async () => {
        await result.current.loadMore()
      })

      expect(result.current.allPosts).toHaveLength(75)
    })

    it('should set hasMore to false when fewer posts returned', async () => {
      const posts = Array.from({ length: 10 }, (_, i) => ({
        post_id: `post-${i}`,
        matching_tier: 'other',
      }))

      mockRpc.mockResolvedValue({ data: posts, error: null })

      const { result } = renderHook(() => useTieredPosts({ limit: 50 }))

      await waitFor(() => {
        expect(result.current.hasMore).toBe(false)
      })
    })

    it('should not load more when hasMore is false', async () => {
      mockRpc.mockResolvedValue({ data: [], error: null })

      const { result } = renderHook(() => useTieredPosts())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      mockRpc.mockClear()

      await act(async () => {
        await result.current.loadMore()
      })

      expect(mockRpc).not.toHaveBeenCalled()
    })

    it('should not load more while loading', async () => {
      let resolveRpc: (value: unknown) => void
      mockRpc.mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveRpc = resolve
          })
      )

      const { result } = renderHook(() => useTieredPosts())

      // Try to load more while initial is loading
      await act(async () => {
        await result.current.loadMore()
      })

      // Should only have 1 call (initial)
      expect(mockRpc).toHaveBeenCalledTimes(1)

      await act(async () => {
        resolveRpc!({ data: [], error: null })
      })
    })
  })

  describe('clearError', () => {
    it('should clear error state', async () => {
      mockRpc.mockResolvedValue({
        data: null,
        error: { message: 'Error' },
      })

      const { result } = renderHook(() => useTieredPosts())

      await waitFor(() => {
        expect(result.current.error).toBe('Error')
      })

      act(() => {
        result.current.clearError()
      })

      expect(result.current.error).toBeNull()
    })
  })

  describe('locationId changes', () => {
    it('should refetch when locationId changes', async () => {
      const { result, rerender } = renderHook(
        ({ locationId }) => useTieredPosts({ locationId }),
        { initialProps: { locationId: 'loc-1' } }
      )

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      mockRpc.mockClear()

      rerender({ locationId: 'loc-2' })

      await waitFor(() => {
        expect(mockRpc).toHaveBeenCalledWith('get_posts_for_user', {
          p_location_id: 'loc-2',
          p_limit: 50,
          p_offset: 0,
        })
      })
    })
  })
})

describe('useVerifiedPosts', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mockRpc.mockResolvedValue({
      data: [
        { post_id: 'verified-1', matching_tier: 'verified_checkin' },
        { post_id: 'regular-1', matching_tier: 'regular_spot' },
        { post_id: 'other-1', matching_tier: 'other' },
      ],
      error: null,
    })
  })

  it('should return only verified posts', async () => {
    const { result } = renderHook(() => useVerifiedPosts())

    await waitFor(() => {
      expect(result.current.posts).toHaveLength(1)
    })

    expect(result.current.posts[0].post_id).toBe('verified-1')
  })
})

describe('useFavoriteSpotPosts', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mockRpc.mockResolvedValue({
      data: [
        { post_id: 'verified-1', matching_tier: 'verified_checkin' },
        { post_id: 'regular-1', matching_tier: 'regular_spot' },
        { post_id: 'other-1', matching_tier: 'other' },
      ],
      error: null,
    })
  })

  it('should return verified and regular spot posts', async () => {
    const { result } = renderHook(() => useFavoriteSpotPosts())

    await waitFor(() => {
      expect(result.current.posts).toHaveLength(2)
    })

    const ids = result.current.posts.map((p) => p.post_id)
    expect(ids).toContain('verified-1')
    expect(ids).toContain('regular-1')
    expect(ids).not.toContain('other-1')
  })
})
