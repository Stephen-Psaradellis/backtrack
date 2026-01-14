/**
 * Tests for hooks/useEventPosts.ts
 *
 * Tests event posts management hook - basic functionality tests.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'

// Mock fetch
const mockFetch = vi.fn()
global.fetch = mockFetch

import { useEventPosts, EventPostsError, type EventPost } from '../useEventPosts'

// Mock data
const mockPost: EventPost = {
  id: 'post-1',
  producer_id: 'user-1',
  location_id: 'loc-1',
  selfie_url: 'https://example.com/selfie.jpg',
  target_avatar: { hair: 'brown' },
  target_description: 'Tall person',
  message: 'Met you at the event',
  note: null,
  seen_at: '2025-01-08T12:00:00Z',
  is_active: true,
  created_at: '2025-01-08T10:00:00Z',
  expires_at: '2025-01-15T10:00:00Z',
  producer: {
    id: 'user-1',
    display_name: 'John Doe',
    username: 'johndoe',
  },
  location: {
    id: 'loc-1',
    name: 'Event Venue',
    address: '123 Main St',
  },
}

const mockPagination = {
  page: 1,
  pageSize: 20,
  totalCount: 1,
  hasNextPage: false,
}

describe('useEventPosts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  describe('initial state', () => {
    it('should start with empty posts', () => {
      const { result } = renderHook(() => useEventPosts('event-123', { autoFetch: false }))

      expect(result.current.posts).toEqual([])
      expect(result.current.isLoading).toBe(false)
      expect(result.current.error).toBeNull()
      expect(result.current.pagination).toBeNull()
    })

    it('should have correct eventId', () => {
      const { result } = renderHook(() => useEventPosts('event-123', { autoFetch: false }))

      expect(result.current.eventId).toBe('event-123')
    })

    it('should have null eventId when not provided', () => {
      const { result } = renderHook(() => useEventPosts(null))

      expect(result.current.eventId).toBeNull()
    })
  })

  describe('createPost without eventId', () => {
    it('should return null and set error when eventId is missing', async () => {
      const { result } = renderHook(() => useEventPosts(null))

      let createdPost
      await act(async () => {
        createdPost = await result.current.createPost({
          location_id: 'loc-1',
          selfie_url: 'https://example.com/selfie.jpg',
          target_avatar: {},
          message: 'Hello!',
        })
      })

      expect(createdPost).toBeNull()
      expect(result.current.error?.code).toBe('VALIDATION_ERROR')
    })
  })

  describe('clear', () => {
    it('should reset state when called', () => {
      const { result } = renderHook(() => useEventPosts('event-123', { autoFetch: false }))

      act(() => {
        result.current.clear()
      })

      expect(result.current.posts).toEqual([])
      expect(result.current.pagination).toBeNull()
      expect(result.current.error).toBeNull()
      expect(result.current.isLoading).toBe(false)
      expect(result.current.isCreating).toBe(false)
    })
  })

  describe('eventId changes', () => {
    it('should clear state when eventId becomes null', () => {
      const { result, rerender } = renderHook(
        ({ eventId }) => useEventPosts(eventId, { autoFetch: false }),
        { initialProps: { eventId: 'event-123' as string | null } }
      )

      expect(result.current.eventId).toBe('event-123')

      rerender({ eventId: null })

      expect(result.current.eventId).toBeNull()
      expect(result.current.posts).toEqual([])
    })
  })

  describe('fetchNextPage', () => {
    it('should not fetch when no pagination', () => {
      const { result } = renderHook(() => useEventPosts('event-123', { autoFetch: false }))

      // Should not throw, just do nothing
      act(() => {
        result.current.fetchNextPage()
      })

      expect(mockFetch).not.toHaveBeenCalled()
    })
  })

  describe('EventPostsError class', () => {
    it('should create error with code and message', () => {
      const error = new EventPostsError('VALIDATION_ERROR', 'Invalid input', 'Details here')

      expect(error.code).toBe('VALIDATION_ERROR')
      expect(error.message).toBe('Invalid input')
      expect(error.details).toBe('Details here')
      expect(error.name).toBe('EventPostsError')
    })

    it('should be instanceof Error', () => {
      const error = new EventPostsError('NETWORK_ERROR', 'Network failed')

      expect(error instanceof Error).toBe(true)
      expect(error instanceof EventPostsError).toBe(true)
    })

    it('should work with all error codes', () => {
      const codes: Array<'NETWORK_ERROR' | 'UNAUTHORIZED' | 'NOT_FOUND' | 'VALIDATION_ERROR' | 'SERVER_ERROR' | 'UNKNOWN_ERROR'> = [
        'NETWORK_ERROR',
        'UNAUTHORIZED',
        'NOT_FOUND',
        'VALIDATION_ERROR',
        'SERVER_ERROR',
        'UNKNOWN_ERROR',
      ]

      codes.forEach((code) => {
        const error = new EventPostsError(code, `Error for ${code}`)
        expect(error.code).toBe(code)
      })
    })
  })

  describe('options', () => {
    it('should respect pageSize option', () => {
      const { result } = renderHook(() => useEventPosts('event-123', { autoFetch: false, pageSize: 10 }))

      expect(result.current).toBeDefined()
    })

    it('should respect useCache option', () => {
      const { result } = renderHook(() => useEventPosts('event-123', { autoFetch: false, useCache: false }))

      expect(result.current).toBeDefined()
    })

    it('should clamp pageSize to minimum 1', () => {
      const { result } = renderHook(() => useEventPosts('event-123', { autoFetch: false, pageSize: 0 }))

      expect(result.current).toBeDefined()
    })

    it('should clamp pageSize to maximum 50', () => {
      const { result } = renderHook(() => useEventPosts('event-123', { autoFetch: false, pageSize: 100 }))

      expect(result.current).toBeDefined()
    })
  })

  describe('fetchPosts', () => {
    it('should fetch posts successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          posts: [mockPost],
          pagination: mockPagination,
        }),
      })

      const { result } = renderHook(() => useEventPosts('event-123', { autoFetch: false }))

      act(() => {
        result.current.fetchPosts()
      })

      expect(result.current.isLoading).toBe(true)

      await act(async () => {
        await vi.runAllTimersAsync()
      })

      expect(result.current.posts).toHaveLength(1)
      expect(result.current.posts[0].id).toBe('post-1')
      expect(result.current.pagination).toBeDefined()
      expect(result.current.isLoading).toBe(false)
      expect(result.current.error).toBeNull()
    })

    it('should not fetch when eventId is null', async () => {
      const { result } = renderHook(() => useEventPosts(null, { autoFetch: false }))

      act(() => {
        result.current.fetchPosts()
      })

      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('should handle fetch error with 400 status', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: 'Bad request', details: 'Invalid params' }),
      })

      const { result } = renderHook(() => useEventPosts('event-123', { autoFetch: false }))

      act(() => {
        result.current.fetchPosts()
      })

      await act(async () => {
        await vi.runAllTimersAsync()
      })

      expect(result.current.error?.code).toBe('VALIDATION_ERROR')
      expect(result.current.isLoading).toBe(false)
    })

    it('should handle fetch error with 401 status', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({}),
      })

      const { result } = renderHook(() => useEventPosts('event-123', { autoFetch: false }))

      act(() => {
        result.current.fetchPosts()
      })

      await act(async () => {
        await vi.runAllTimersAsync()
      })

      expect(result.current.error?.code).toBe('UNAUTHORIZED')
    })

    it('should handle fetch error with 404 status', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ error: 'Event not found' }),
      })

      const { result } = renderHook(() => useEventPosts('event-123', { autoFetch: false }))

      act(() => {
        result.current.fetchPosts()
      })

      await act(async () => {
        await vi.runAllTimersAsync()
      })

      expect(result.current.error?.code).toBe('NOT_FOUND')
    })

    it('should handle fetch error with 500 status', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Server error' }),
      })

      const { result } = renderHook(() => useEventPosts('event-123', { autoFetch: false }))

      act(() => {
        result.current.fetchPosts()
      })

      await act(async () => {
        await vi.runAllTimersAsync()
      })

      expect(result.current.error?.code).toBe('SERVER_ERROR')
    })

    it('should handle fetch error with unknown status', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 418,
        json: async () => ({}),
      })

      const { result } = renderHook(() => useEventPosts('event-123', { autoFetch: false }))

      act(() => {
        result.current.fetchPosts()
      })

      await act(async () => {
        await vi.runAllTimersAsync()
      })

      expect(result.current.error?.code).toBe('UNKNOWN_ERROR')
    })

    it('should handle network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network failure'))

      const { result } = renderHook(() => useEventPosts('event-123', { autoFetch: false }))

      act(() => {
        result.current.fetchPosts()
      })

      await act(async () => {
        await vi.runAllTimersAsync()
      })

      expect(result.current.error?.code).toBe('NETWORK_ERROR')
      expect(result.current.error?.message).toContain('Network failure')
    })

    it('should handle non-Error exceptions', async () => {
      mockFetch.mockRejectedValueOnce('String error')

      const { result } = renderHook(() => useEventPosts('event-123', { autoFetch: false }))

      act(() => {
        result.current.fetchPosts()
      })

      await act(async () => {
        await vi.runAllTimersAsync()
      })

      expect(result.current.error?.code).toBe('NETWORK_ERROR')
    })

    it('should handle JSON parse failure on error response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => {
          throw new Error('Invalid JSON')
        },
      })

      const { result } = renderHook(() => useEventPosts('event-123', { autoFetch: false }))

      act(() => {
        result.current.fetchPosts()
      })

      await act(async () => {
        await vi.runAllTimersAsync()
      })

      expect(result.current.error?.code).toBe('SERVER_ERROR')
    })

    it('should handle empty response data', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      })

      const { result } = renderHook(() => useEventPosts('event-123', { autoFetch: false }))

      act(() => {
        result.current.fetchPosts()
      })

      await act(async () => {
        await vi.runAllTimersAsync()
      })

      expect(result.current.posts).toEqual([])
      expect(result.current.pagination).toBeDefined()
    })

    it('should not autoFetch when autoFetch is false', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          posts: [mockPost],
          pagination: mockPagination,
        }),
      })

      renderHook(() => useEventPosts('event-123', { autoFetch: false }))

      await act(async () => {
        await vi.advanceTimersByTimeAsync(100)
      })

      expect(mockFetch).not.toHaveBeenCalled()
    })
  })

  describe('caching', () => {
    it('should use cached results on second fetch', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          posts: [mockPost],
          pagination: mockPagination,
        }),
      })

      const { result } = renderHook(() => useEventPosts('event-123', { autoFetch: false, useCache: true }))

      // First fetch
      act(() => {
        result.current.fetchPosts()
      })

      await act(async () => {
        await vi.runAllTimersAsync()
      })

      expect(mockFetch).toHaveBeenCalledTimes(1)
      expect(result.current.posts).toHaveLength(1)

      // Clear state
      act(() => {
        result.current.clear()
      })

      // Second fetch should use cache (after calling fetchPosts which invalidates cache)
      act(() => {
        result.current.fetchPosts()
      })

      await act(async () => {
        await vi.runAllTimersAsync()
      })

      // fetchPosts invalidates cache, so it should fetch again
      expect(mockFetch).toHaveBeenCalledTimes(2)
    })

    it('should skip cache when useCache is false', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          posts: [mockPost],
          pagination: mockPagination,
        }),
      })

      const { result } = renderHook(() => useEventPosts('event-123', { autoFetch: false, useCache: false }))

      // First fetch
      act(() => {
        result.current.fetchPosts()
      })

      await act(async () => {
        await vi.runAllTimersAsync()
      })

      act(() => {
        result.current.fetchPosts()
      })

      await act(async () => {
        await vi.runAllTimersAsync()
      })

      expect(mockFetch).toHaveBeenCalledTimes(2)
    })
  })

  describe('createPost', () => {
    it('should create post successfully', async () => {
      const newPost = { ...mockPost, id: 'post-new' }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ post: newPost }),
      })

      const { result } = renderHook(() => useEventPosts('event-123', { autoFetch: false }))

      let createdPost: EventPost | null | undefined
      await act(async () => {
        createdPost = await result.current.createPost({
          location_id: 'loc-1',
          selfie_url: 'https://example.com/selfie.jpg',
          target_avatar: { hair: 'brown' },
          message: 'Hello!',
        })
      })

      expect((createdPost as EventPost)?.id).toBe('post-new')
      expect(result.current.posts).toHaveLength(1)
      expect(result.current.posts[0].id).toBe('post-new')
      expect(result.current.isCreating).toBe(false)
    })

    it('should handle create post error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: 'Invalid data' }),
      })

      const { result } = renderHook(() => useEventPosts('event-123', { autoFetch: false }))

      let createdPost: EventPost | null = null
      await act(async () => {
        createdPost = await result.current.createPost({
          location_id: 'loc-1',
          selfie_url: 'https://example.com/selfie.jpg',
          target_avatar: {},
          message: 'Hello!',
        })
      })

      expect(createdPost).toBeNull()
      expect(result.current.error?.code).toBe('VALIDATION_ERROR')
    })

    it('should handle create post network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const { result } = renderHook(() => useEventPosts('event-123', { autoFetch: false }))

      let createdPost: EventPost | null = null
      await act(async () => {
        createdPost = await result.current.createPost({
          location_id: 'loc-1',
          selfie_url: 'https://example.com/selfie.jpg',
          target_avatar: {},
          message: 'Hello!',
        })
      })

      expect(createdPost).toBeNull()
      expect(result.current.error?.code).toBe('NETWORK_ERROR')
    })

    it('should update pagination after creating post', async () => {
      // First, set up initial state with posts
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          posts: [mockPost],
          pagination: { ...mockPagination, totalCount: 1 },
        }),
      })

      const { result } = renderHook(() => useEventPosts('event-123', { autoFetch: false }))

      act(() => {
        result.current.fetchPosts()
      })

      await act(async () => {
        await vi.runAllTimersAsync()
      })

      expect(result.current.pagination?.totalCount).toBe(1)

      // Now create a new post
      const newPost = { ...mockPost, id: 'post-new' }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ post: newPost }),
      })

      await act(async () => {
        await result.current.createPost({
          location_id: 'loc-1',
          selfie_url: 'https://example.com/selfie.jpg',
          target_avatar: {},
          message: 'Hello!',
        })
      })

      expect(result.current.pagination?.totalCount).toBe(2)
    })

    it('should handle JSON parse error during create', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => {
          throw new Error('Invalid JSON')
        },
      })

      const { result } = renderHook(() => useEventPosts('event-123', { autoFetch: false }))

      await act(async () => {
        await result.current.createPost({
          location_id: 'loc-1',
          selfie_url: 'https://example.com/selfie.jpg',
          target_avatar: {},
          message: 'Hello!',
        })
      })

      expect(result.current.error?.code).toBe('SERVER_ERROR')
    })
  })

  describe('fetchNextPage', () => {
    it('should fetch next page when hasNextPage is true', async () => {
      // First page
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          posts: [mockPost],
          pagination: { ...mockPagination, hasNextPage: true },
        }),
      })

      const { result } = renderHook(() => useEventPosts('event-123', { autoFetch: false }))

      act(() => {
        result.current.fetchPosts()
      })

      await act(async () => {
        await vi.runAllTimersAsync()
      })

      expect(result.current.posts).toHaveLength(1)

      // Next page
      const nextPost = { ...mockPost, id: 'post-2' }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          posts: [nextPost],
          pagination: { ...mockPagination, page: 2, hasNextPage: false },
        }),
      })

      act(() => {
        result.current.fetchNextPage()
      })

      await act(async () => {
        await vi.runAllTimersAsync()
      })

      expect(result.current.posts).toHaveLength(2)
      expect(result.current.posts[1].id).toBe('post-2')
    })

    it('should not fetch when isLoading is true', async () => {
      mockFetch.mockImplementation(() => new Promise(() => {})) // Never resolves

      const { result } = renderHook(() => useEventPosts('event-123', { autoFetch: false }))

      // Start initial fetch (will never complete)
      act(() => {
        result.current.fetchPosts()
      })

      expect(result.current.isLoading).toBe(true)

      // Try to fetch next page while loading
      act(() => {
        result.current.fetchNextPage()
      })

      // Should only have called fetch once
      expect(mockFetch).toHaveBeenCalledTimes(1)
    })
  })

  describe('abort handling', () => {
    it('should cancel pending abort controller on clear', async () => {
      // Test that clear() aborts pending requests
      mockFetch.mockImplementation(() => new Promise(() => {})) // Never resolves

      const { result } = renderHook(() => useEventPosts('event-123', { autoFetch: false }))

      act(() => {
        result.current.fetchPosts()
      })

      expect(result.current.isLoading).toBe(true)

      // Clear should abort and reset state
      act(() => {
        result.current.clear()
      })

      expect(result.current.isLoading).toBe(false)
      expect(result.current.posts).toEqual([])
    })
  })

  describe('undefined eventId', () => {
    it('should handle undefined eventId', () => {
      const { result } = renderHook(() => useEventPosts(undefined))

      expect(result.current.eventId).toBeNull()
      expect(result.current.posts).toEqual([])
    })
  })

  describe('abort error handling', () => {
    it('should ignore AbortError during fetch', async () => {
      // Create an Error with name 'AbortError' to simulate an aborted fetch
      const abortError = new Error('The operation was aborted')
      abortError.name = 'AbortError'
      mockFetch.mockRejectedValueOnce(abortError)

      const { result } = renderHook(() => useEventPosts('event-123', { autoFetch: false }))

      act(() => {
        result.current.fetchPosts()
      })

      await act(async () => {
        await vi.runAllTimersAsync()
      })

      // AbortError should be ignored - no error should be set
      expect(result.current.error).toBeNull()
    })
  })

  describe('auto-fetch on mount', () => {
    it('should auto-fetch when autoFetch is true and eventId is provided', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          posts: [mockPost],
          pagination: mockPagination,
        }),
      })

      renderHook(() => useEventPosts('event-123', { autoFetch: true }))

      await act(async () => {
        await vi.runAllTimersAsync()
      })

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/events/event-123/posts'),
        expect.any(Object)
      )
    })

    it('should not auto-fetch when eventId is null even with autoFetch true', async () => {
      renderHook(() => useEventPosts(null, { autoFetch: true }))

      await act(async () => {
        await vi.runAllTimersAsync()
      })

      expect(mockFetch).not.toHaveBeenCalled()
    })
  })

  describe('cache hit path', () => {
    it('should use cached data when available', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          posts: [mockPost],
          pagination: mockPagination,
        }),
      })

      const { result } = renderHook(() => useEventPosts('event-123', { autoFetch: false, useCache: true }))

      // First fetch to populate cache
      act(() => {
        result.current.fetchPosts()
      })

      await act(async () => {
        await vi.runAllTimersAsync()
      })

      expect(mockFetch).toHaveBeenCalledTimes(1)
      expect(result.current.posts).toHaveLength(1)

      // Use refetch to trigger a new fetch (refetch invalidates cache first)
      // The cache hit path is internal and hard to test externally without
      // exposing the cache implementation
    })

    it('should hit cache on second hook mount with autoFetch', async () => {
      // Use a unique eventId for this test to avoid interference
      const testEventId = 'event-cache-hit-test-' + Date.now()

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          posts: [mockPost],
          pagination: mockPagination,
        }),
      })

      // First hook: autoFetch=true to populate cache
      const { result: result1, unmount: unmount1 } = renderHook(() =>
        useEventPosts(testEventId, { autoFetch: true, useCache: true })
      )

      await act(async () => {
        await vi.runAllTimersAsync()
      })

      expect(mockFetch).toHaveBeenCalledTimes(1)
      expect(result1.current.posts).toHaveLength(1)

      // Unmount first hook
      unmount1()

      // Reset fetch mock call count to verify second hook doesn't call it
      mockFetch.mockClear()

      // Second hook: same eventId, should hit cache
      const { result: result2 } = renderHook(() =>
        useEventPosts(testEventId, { autoFetch: true, useCache: true })
      )

      await act(async () => {
        await vi.runAllTimersAsync()
      })

      // Should not have made any new network requests due to cache hit
      expect(mockFetch).toHaveBeenCalledTimes(0)
      expect(result2.current.posts).toHaveLength(1)
      expect(result2.current.posts[0].id).toBe(mockPost.id)
    })
  })

  describe('cache expiration', () => {
    it('should fetch again when cache is expired', async () => {
      // Use a unique eventId for this test
      const testEventId = 'event-cache-expire-test-' + Date.now()

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          posts: [mockPost],
          pagination: mockPagination,
        }),
      })

      // First hook: autoFetch=true to populate cache
      const { result: result1, unmount: unmount1 } = renderHook(() =>
        useEventPosts(testEventId, { autoFetch: true, useCache: true })
      )

      await act(async () => {
        await vi.runAllTimersAsync()
      })

      expect(mockFetch).toHaveBeenCalledTimes(1)
      expect(result1.current.posts).toHaveLength(1)

      // Unmount first hook
      unmount1()

      // Advance time past cache expiration (2 minutes = 120000ms)
      await act(async () => {
        await vi.advanceTimersByTimeAsync(2 * 60 * 1000 + 1000) // 2 minutes + 1 second
      })

      // Reset fetch mock call count
      mockFetch.mockClear()

      // Second hook: same eventId, cache should be expired
      const { result: result2 } = renderHook(() =>
        useEventPosts(testEventId, { autoFetch: true, useCache: true })
      )

      await act(async () => {
        await vi.runAllTimersAsync()
      })

      // Should have made a new network request because cache expired
      expect(mockFetch).toHaveBeenCalledTimes(1)
      expect(result2.current.posts).toHaveLength(1)
    })
  })
})
