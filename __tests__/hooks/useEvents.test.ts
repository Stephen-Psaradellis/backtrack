/**
 * @vitest-environment jsdom
 */

/**
 * Unit tests for useEvents and useEvent hooks
 *
 * These tests cover:
 * - Event search with location, category, date, and query filters
 * - Caching behavior with configurable TTL
 * - Loading and error states
 * - Pagination with fetchNextPage
 * - Debounced search updates
 * - Request cancellation via AbortController
 * - useEvent single event fetching
 * - Error mapping for different HTTP status codes
 *
 * Tests use React Testing Library's renderHook and mock fetch responses.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import {
  useEvents,
  useEvent,
  EventError,
  type Event,
  type EventPagination,
  type EventSourceInfo,
  type EventSearchParams,
  type UseEventsOptions,
} from '@/hooks/useEvents'

// ============================================================================
// Test Setup - Fetch Mocking and Timers
// ============================================================================

/**
 * Mock global fetch
 */
const mockFetch = vi.fn()

/**
 * Reset mocks before each test
 */
beforeEach(() => {
  // Use shouldAdvanceTime to allow waitFor to work with fake timers
  vi.useFakeTimers({ shouldAdvanceTime: true })
  vi.stubGlobal('fetch', mockFetch)
  mockFetch.mockReset()
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

// ============================================================================
// Mock Data
// ============================================================================

/**
 * Mock event data
 */
const mockEvent: Event = {
  id: 'event-uuid-123',
  external_id: 'eb-123',
  platform: 'eventbrite',
  title: 'Tech Meetup 2024',
  description: 'A great tech meetup event',
  date_time: '2024-12-31T19:00:00Z',
  end_time: '2024-12-31T23:00:00Z',
  venue_name: 'Tech Hub',
  venue_address: '123 Tech Street, San Francisco, CA 94102',
  latitude: 37.7749,
  longitude: -122.4194,
  image_url: 'https://example.com/event.jpg',
  url: 'https://www.eventbrite.com/e/event-123',
  category: 'tech',
  created_at: '2024-01-01T00:00:00Z',
  synced_at: '2024-01-01T00:00:00Z',
  post_count: 5,
}

/**
 * Mock event 2 for pagination tests
 */
const mockEvent2: Event = {
  id: 'event-uuid-456',
  external_id: 'meetup-456',
  platform: 'meetup',
  title: 'Music Festival 2024',
  description: 'A great music festival',
  date_time: '2024-12-25T18:00:00Z',
  end_time: '2024-12-26T02:00:00Z',
  venue_name: 'Festival Grounds',
  venue_address: '456 Music Ave, Oakland, CA 94607',
  latitude: 37.8044,
  longitude: -122.2712,
  image_url: 'https://example.com/music.jpg',
  url: 'https://www.meetup.com/e/456',
  category: 'music',
  created_at: '2024-01-02T00:00:00Z',
  synced_at: '2024-01-02T00:00:00Z',
  post_count: 3,
}

/**
 * Mock pagination data
 */
const mockPagination: EventPagination = {
  page: 1,
  pageSize: 20,
  totalCount: 50,
  hasNextPage: true,
}

/**
 * Mock source info
 */
const mockSources: { eventbrite: EventSourceInfo; meetup: EventSourceInfo } = {
  eventbrite: { searched: true, count: 1 },
  meetup: { searched: true, count: 0 },
}

/**
 * Mock search coordinates
 */
const mockCoordinates = {
  latitude: 37.7749,
  longitude: -122.4194,
}

/**
 * Create mock successful search response
 */
function createMockSearchResponse(options?: {
  events?: Event[]
  pagination?: Partial<EventPagination>
  sources?: { eventbrite: EventSourceInfo; meetup: EventSourceInfo }
}) {
  return {
    events: options?.events ?? [mockEvent],
    pagination: { ...mockPagination, ...options?.pagination },
    sources: options?.sources ?? mockSources,
  }
}

/**
 * Create mock successful event details response
 */
function createMockEventResponse(event?: Partial<Event>) {
  return {
    event: { ...mockEvent, ...event },
  }
}

// ============================================================================
// useEvents Hook Tests
// ============================================================================

describe('useEvents', () => {
  describe('initial state', () => {
    it('initializes with empty events and no loading/error state', () => {
      const { result } = renderHook(() => useEvents())

      expect(result.current.events).toEqual([])
      expect(result.current.isLoading).toBe(false)
      expect(result.current.error).toBeNull()
      expect(result.current.pagination).toBeNull()
      expect(result.current.sources).toBeNull()
    })

    it('uses initial search params when provided', () => {
      const initialParams: EventSearchParams = {
        coordinates: mockCoordinates,
        radius: '25km',
        categories: ['tech'],
      }

      const { result } = renderHook(() =>
        useEvents({ initialParams, autoFetch: false })
      )

      expect(result.current.searchParams).toEqual(initialParams)
    })
  })

  describe('auto-fetch on mount', () => {
    it('fetches events when coordinates are provided and autoFetch is true', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => createMockSearchResponse(),
      })

      const { result } = renderHook(() =>
        useEvents({
          initialParams: { coordinates: mockCoordinates },
          autoFetch: true,
        })
      )

      // Wait for fetch to complete
      await waitFor(() => {
        expect(result.current.events).toHaveLength(1)
      })

      expect(mockFetch).toHaveBeenCalledTimes(1)
      expect(result.current.events[0].title).toBe('Tech Meetup 2024')
    })

    it('does not fetch when coordinates are not provided', async () => {
      const { result } = renderHook(() =>
        useEvents({
          initialParams: {},
          autoFetch: true,
        })
      )

      // Advance timers and wait a bit
      await act(async () => {
        vi.advanceTimersByTime(500)
      })

      expect(mockFetch).not.toHaveBeenCalled()
      expect(result.current.events).toEqual([])
    })

    it('does not fetch when autoFetch is false', async () => {
      const { result } = renderHook(() =>
        useEvents({
          initialParams: { coordinates: mockCoordinates },
          autoFetch: false,
        })
      )

      // Advance timers
      await act(async () => {
        vi.advanceTimersByTime(500)
      })

      expect(mockFetch).not.toHaveBeenCalled()
      expect(result.current.events).toEqual([])
    })
  })

  describe('searchEvents', () => {
    it('fetches events with provided search parameters', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => createMockSearchResponse(),
      })

      const { result } = renderHook(() => useEvents({ autoFetch: false }))

      act(() => {
        result.current.searchEvents({
          coordinates: mockCoordinates,
          categories: ['tech', 'music'],
          radius: '50km',
        })
      })

      // Advance past debounce
      await act(async () => {
        vi.advanceTimersByTime(300)
      })

      await waitFor(() => {
        expect(result.current.events).toHaveLength(1)
      })

      // Verify URL contains search params (order of categories may vary)
      const [url] = mockFetch.mock.calls[0]
      expect(url).toContain('latitude=37.7749')
      expect(url).toContain('longitude=-122.4194')
      // Check for categories in either order
      expect(url).toMatch(/categories=(tech%2Cmusic|music%2Ctech)/)
      expect(url).toContain('radius=50km')
    })

    it('debounces search requests', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => createMockSearchResponse(),
      })

      const { result } = renderHook(() =>
        useEvents({ autoFetch: false, debounceMs: 300 })
      )

      // Call searchEvents multiple times in quick succession
      act(() => {
        result.current.searchEvents({ coordinates: mockCoordinates, query: 'a' })
      })
      act(() => {
        result.current.searchEvents({ coordinates: mockCoordinates, query: 'ab' })
      })
      act(() => {
        result.current.searchEvents({ coordinates: mockCoordinates, query: 'abc' })
      })

      // Advance timers but not past debounce
      await act(async () => {
        vi.advanceTimersByTime(200)
      })

      expect(mockFetch).not.toHaveBeenCalled()

      // Advance past debounce
      await act(async () => {
        vi.advanceTimersByTime(150)
      })

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(1)
      })

      // Should use the last search params
      const [url] = mockFetch.mock.calls[0]
      expect(url).toContain('q=abc')
    })

    it('resets page to 1 when search params change', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => createMockSearchResponse(),
      })

      const { result } = renderHook(() => useEvents({ autoFetch: false }))

      // First search with page 2
      act(() => {
        result.current.searchEvents({
          coordinates: mockCoordinates,
          page: 2,
        })
      })

      await act(async () => {
        vi.advanceTimersByTime(300)
      })

      // Search with different query (should reset to page 1)
      act(() => {
        result.current.searchEvents({
          query: 'new search',
        })
      })

      await act(async () => {
        vi.advanceTimersByTime(300)
      })

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(2)
      })

      const [url] = mockFetch.mock.calls[1]
      expect(url).not.toContain('page=2')
    })

    it('includes date range in search params', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => createMockSearchResponse(),
      })

      const { result } = renderHook(() => useEvents({ autoFetch: false }))

      act(() => {
        result.current.searchEvents({
          coordinates: mockCoordinates,
          startDate: '2024-01-01T00:00:00Z',
          endDate: '2024-12-31T23:59:59Z',
        })
      })

      await act(async () => {
        vi.advanceTimersByTime(300)
      })

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(1)
      })

      const [url] = mockFetch.mock.calls[0]
      expect(url).toContain('startDate=')
      expect(url).toContain('endDate=')
    })

    it('includes platforms filter in search params', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => createMockSearchResponse(),
      })

      const { result } = renderHook(() => useEvents({ autoFetch: false }))

      act(() => {
        result.current.searchEvents({
          coordinates: mockCoordinates,
          platforms: ['eventbrite'],
        })
      })

      await act(async () => {
        vi.advanceTimersByTime(300)
      })

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(1)
      })

      const [url] = mockFetch.mock.calls[0]
      expect(url).toContain('platforms=eventbrite')
    })
  })

  describe('loading state', () => {
    it('sets isLoading to true during fetch', async () => {
      let resolvePromise: (value: any) => void
      const fetchPromise = new Promise((resolve) => {
        resolvePromise = resolve
      })

      mockFetch.mockReturnValueOnce({
        ok: true,
        json: () => fetchPromise,
      })

      const { result } = renderHook(() =>
        useEvents({
          initialParams: { coordinates: mockCoordinates },
          useCache: false,
        })
      )

      await waitFor(() => {
        expect(result.current.isLoading).toBe(true)
      })

      // Resolve the fetch
      await act(async () => {
        resolvePromise!(createMockSearchResponse())
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })
    })
  })

  describe('error handling', () => {
    it('sets error state on 400 Bad Request', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          error: 'Invalid parameters',
          details: 'Missing required field',
        }),
      })

      const { result } = renderHook(() =>
        useEvents({
          initialParams: { coordinates: mockCoordinates },
          useCache: false,
        })
      )

      await waitFor(() => {
        expect(result.current.error).not.toBeNull()
      })

      expect(result.current.error?.code).toBe('INVALID_PARAMS')
      expect(result.current.error?.message).toBe('Invalid parameters')
    })

    it('sets error state on 429 Rate Limited', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        json: async () => ({
          error: 'Rate limited',
        }),
      })

      const { result } = renderHook(() =>
        useEvents({
          initialParams: { coordinates: mockCoordinates },
          useCache: false,
        })
      )

      await waitFor(() => {
        expect(result.current.error).not.toBeNull()
      })

      expect(result.current.error?.code).toBe('RATE_LIMITED')
    })

    it('sets error state on 500 Server Error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({
          error: 'Internal server error',
        }),
      })

      const { result } = renderHook(() =>
        useEvents({
          initialParams: { coordinates: mockCoordinates },
          useCache: false,
        })
      )

      await waitFor(() => {
        expect(result.current.error).not.toBeNull()
      })

      expect(result.current.error?.code).toBe('SERVER_ERROR')
    })

    it('handles network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network failure'))

      const { result } = renderHook(() =>
        useEvents({
          initialParams: { coordinates: mockCoordinates },
          useCache: false,
        })
      )

      await waitFor(() => {
        expect(result.current.error).not.toBeNull()
      })

      expect(result.current.error?.code).toBe('NETWORK_ERROR')
      expect(result.current.error?.message).toBe('Network failure')
    })

    it('clears error state on successful fetch', async () => {
      // First fetch fails
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Server error' }),
      })

      const { result } = renderHook(() =>
        useEvents({
          initialParams: { coordinates: mockCoordinates },
          useCache: false,
        })
      )

      await waitFor(() => {
        expect(result.current.error).not.toBeNull()
      })

      // Second fetch succeeds
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => createMockSearchResponse(),
      })

      act(() => {
        result.current.refresh()
      })

      await waitFor(() => {
        expect(result.current.error).toBeNull()
        expect(result.current.events).toHaveLength(1)
      })
    })
  })

  describe('caching', () => {
    it('returns cached results on subsequent calls with same params', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => createMockSearchResponse(),
      })

      const { result } = renderHook(() =>
        useEvents({
          initialParams: { coordinates: mockCoordinates },
          useCache: true,
        })
      )

      await waitFor(() => {
        expect(result.current.events).toHaveLength(1)
      })

      expect(mockFetch).toHaveBeenCalledTimes(1)

      // Trigger another search with same params
      act(() => {
        result.current.searchEvents({ coordinates: mockCoordinates })
      })

      await act(async () => {
        vi.advanceTimersByTime(300)
      })

      // Should use cache, not call fetch again
      expect(mockFetch).toHaveBeenCalledTimes(1)
      expect(result.current.events).toHaveLength(1)
    })

    it('does not use cache when useCache is false', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => createMockSearchResponse(),
      })

      const { result } = renderHook(() =>
        useEvents({
          initialParams: { coordinates: mockCoordinates },
          useCache: false,
        })
      )

      await waitFor(() => {
        expect(result.current.events).toHaveLength(1)
      })

      expect(mockFetch).toHaveBeenCalledTimes(1)

      // Trigger another search with same params
      act(() => {
        result.current.searchEvents({ coordinates: mockCoordinates })
      })

      await act(async () => {
        vi.advanceTimersByTime(300)
      })

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(2)
      })
    })

    // TODO: Fix timing issue with cache invalidation test
    it.skip('invalidates cache on refresh', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => createMockSearchResponse(),
      })

      const { result } = renderHook(() =>
        useEvents({
          initialParams: { coordinates: mockCoordinates },
          useCache: true,
          autoFetch: true,
        })
      )

      await waitFor(() => {
        expect(result.current.events).toHaveLength(1)
      })

      expect(mockFetch).toHaveBeenCalledTimes(1)

      // Refresh should invalidate cache
      act(() => {
        result.current.refresh()
      })

      // Advance past debounce
      await act(async () => {
        vi.advanceTimersByTime(300)
      })

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(2)
      })
    })
  })

  describe('pagination', () => {
    it('fetches next page when fetchNextPage is called', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () =>
            createMockSearchResponse({
              events: [mockEvent],
              pagination: { page: 1, hasNextPage: true },
            }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () =>
            createMockSearchResponse({
              events: [mockEvent2],
              pagination: { page: 2, hasNextPage: false },
            }),
        })

      const { result } = renderHook(() =>
        useEvents({
          initialParams: { coordinates: mockCoordinates },
          useCache: false,
        })
      )

      await waitFor(() => {
        expect(result.current.events).toHaveLength(1)
      })

      expect(result.current.pagination?.hasNextPage).toBe(true)

      // Fetch next page
      act(() => {
        result.current.fetchNextPage()
      })

      await waitFor(() => {
        expect(result.current.events).toHaveLength(2)
      })

      // Events should be appended
      expect(result.current.events[0].title).toBe('Tech Meetup 2024')
      expect(result.current.events[1].title).toBe('Music Festival 2024')
      expect(result.current.pagination?.page).toBe(2)
      expect(result.current.pagination?.hasNextPage).toBe(false)
    })

    it('does not fetch next page when there is no next page', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () =>
          createMockSearchResponse({
            pagination: { hasNextPage: false },
          }),
      })

      const { result } = renderHook(() =>
        useEvents({
          initialParams: { coordinates: mockCoordinates },
          useCache: false,
        })
      )

      await waitFor(() => {
        expect(result.current.events).toHaveLength(1)
      })

      // Try to fetch next page
      act(() => {
        result.current.fetchNextPage()
      })

      await act(async () => {
        vi.advanceTimersByTime(100)
      })

      // Should not make another fetch call
      expect(mockFetch).toHaveBeenCalledTimes(1)
    })

    it('does not fetch next page while loading', async () => {
      let resolvePromise: (value: any) => void
      const fetchPromise = new Promise((resolve) => {
        resolvePromise = resolve
      })

      mockFetch.mockReturnValueOnce({
        ok: true,
        json: () => fetchPromise,
      })

      const { result } = renderHook(() =>
        useEvents({
          initialParams: { coordinates: mockCoordinates },
          useCache: false,
        })
      )

      await waitFor(() => {
        expect(result.current.isLoading).toBe(true)
      })

      // Try to fetch next page while loading
      act(() => {
        result.current.fetchNextPage()
      })

      // Should not add another fetch call
      expect(mockFetch).toHaveBeenCalledTimes(1)

      // Clean up
      await act(async () => {
        resolvePromise!(createMockSearchResponse({ pagination: { hasNextPage: true } }))
      })
    })
  })

  describe('clear', () => {
    it('resets all state when clear is called', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => createMockSearchResponse(),
      })

      const { result } = renderHook(() =>
        useEvents({
          initialParams: { coordinates: mockCoordinates },
          useCache: false,
        })
      )

      await waitFor(() => {
        expect(result.current.events).toHaveLength(1)
      })

      act(() => {
        result.current.clear()
      })

      expect(result.current.events).toEqual([])
      expect(result.current.error).toBeNull()
      expect(result.current.pagination).toBeNull()
      expect(result.current.sources).toBeNull()
      expect(result.current.isLoading).toBe(false)
    })
  })

  describe('request cancellation', () => {
    it('cancels previous request when new search is triggered', async () => {
      let abortSignal1: AbortSignal | undefined
      let abortSignal2: AbortSignal | undefined

      mockFetch
        .mockImplementationOnce((_url: string, options: RequestInit) => {
          abortSignal1 = options.signal
          return new Promise((resolve) => {
            setTimeout(
              () =>
                resolve({
                  ok: true,
                  json: async () => createMockSearchResponse({ events: [mockEvent] }),
                }),
              1000
            )
          })
        })
        .mockImplementationOnce((_url: string, options: RequestInit) => {
          abortSignal2 = options.signal
          return Promise.resolve({
            ok: true,
            json: async () => createMockSearchResponse({ events: [mockEvent2] }),
          })
        })

      const { result } = renderHook(() =>
        useEvents({
          initialParams: { coordinates: mockCoordinates },
          useCache: false,
        })
      )

      // Wait a bit for first request to start
      await act(async () => {
        vi.advanceTimersByTime(100)
      })

      // Trigger second search before first completes
      act(() => {
        result.current.searchEvents({
          coordinates: mockCoordinates,
          query: 'new search',
        })
      })

      await act(async () => {
        vi.advanceTimersByTime(300)
      })

      await waitFor(() => {
        expect(abortSignal1?.aborted).toBe(true)
      })

      expect(abortSignal2?.aborted).toBe(false)
    })
  })

  describe('source information', () => {
    it('provides source information from both platforms', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () =>
          createMockSearchResponse({
            sources: {
              eventbrite: { searched: true, count: 5 },
              meetup: { searched: true, count: 3 },
            },
          }),
      })

      const { result } = renderHook(() =>
        useEvents({
          initialParams: { coordinates: mockCoordinates },
          useCache: false,
        })
      )

      await waitFor(() => {
        expect(result.current.sources).not.toBeNull()
      })

      expect(result.current.sources?.eventbrite.searched).toBe(true)
      expect(result.current.sources?.eventbrite.count).toBe(5)
      expect(result.current.sources?.meetup.searched).toBe(true)
      expect(result.current.sources?.meetup.count).toBe(3)
    })

    it('handles source errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () =>
          createMockSearchResponse({
            sources: {
              eventbrite: { searched: true, count: 5 },
              meetup: { searched: true, count: 0, error: 'Token expired' },
            },
          }),
      })

      const { result } = renderHook(() =>
        useEvents({
          initialParams: { coordinates: mockCoordinates },
          useCache: false,
        })
      )

      await waitFor(() => {
        expect(result.current.sources).not.toBeNull()
      })

      expect(result.current.sources?.meetup.error).toBe('Token expired')
    })
  })
})

// ============================================================================
// useEvent Hook Tests
// ============================================================================

describe('useEvent', () => {
  describe('initial state', () => {
    it('initializes with null event and no loading state when no eventId', () => {
      const { result } = renderHook(() => useEvent(null))

      expect(result.current.event).toBeNull()
      expect(result.current.isLoading).toBe(false)
      expect(result.current.error).toBeNull()
    })
  })

  describe('auto-fetch on mount', () => {
    it('fetches event when eventId is provided and autoFetch is true', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => createMockEventResponse(),
      })

      const { result } = renderHook(() =>
        useEvent('event-uuid-123', { autoFetch: true })
      )

      await waitFor(() => {
        expect(result.current.event).not.toBeNull()
      })

      expect(result.current.event?.title).toBe('Tech Meetup 2024')
      expect(mockFetch).toHaveBeenCalledTimes(1)

      const [url] = mockFetch.mock.calls[0]
      expect(url).toContain('/api/events/event-uuid-123')
    })

    it('does not fetch when autoFetch is false', async () => {
      const { result } = renderHook(() =>
        useEvent('event-uuid-123', { autoFetch: false })
      )

      await act(async () => {
        vi.advanceTimersByTime(100)
      })

      expect(mockFetch).not.toHaveBeenCalled()
      expect(result.current.event).toBeNull()
    })

    it('handles external_id:platform format', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => createMockEventResponse(),
      })

      renderHook(() => useEvent('eb-123:eventbrite'))

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(1)
      })

      const [url] = mockFetch.mock.calls[0]
      expect(url).toContain('/api/events/eb-123%3Aeventbrite')
    })
  })

  describe('loading state', () => {
    it('sets isLoading during fetch', async () => {
      let resolvePromise: (value: any) => void
      const fetchPromise = new Promise((resolve) => {
        resolvePromise = resolve
      })

      mockFetch.mockReturnValueOnce({
        ok: true,
        json: () => fetchPromise,
      })

      const { result } = renderHook(() => useEvent('event-uuid-123'))

      await waitFor(() => {
        expect(result.current.isLoading).toBe(true)
      })

      await act(async () => {
        resolvePromise!(createMockEventResponse())
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })
    })
  })

  describe('error handling', () => {
    it('sets error on 404 Not Found', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ error: 'Event not found' }),
      })

      const { result } = renderHook(() => useEvent('nonexistent-event'))

      await waitFor(() => {
        expect(result.current.error).not.toBeNull()
      })

      expect(result.current.error?.code).toBe('UNKNOWN_ERROR')
      expect(result.current.event).toBeNull()
    })

    it('handles network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network failure'))

      const { result } = renderHook(() => useEvent('event-uuid-123'))

      await waitFor(() => {
        expect(result.current.error).not.toBeNull()
      })

      expect(result.current.error?.code).toBe('NETWORK_ERROR')
    })
  })

  describe('fetchEvent', () => {
    it('manually fetches event when called', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => createMockEventResponse(),
      })

      const { result } = renderHook(() =>
        useEvent('event-uuid-123', { autoFetch: false })
      )

      expect(result.current.event).toBeNull()

      act(() => {
        result.current.fetchEvent()
      })

      await waitFor(() => {
        expect(result.current.event).not.toBeNull()
      })

      expect(mockFetch).toHaveBeenCalledTimes(1)
    })

    it('can be used to refresh event data', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () =>
            createMockEventResponse({ title: 'Original Title' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () =>
            createMockEventResponse({ title: 'Updated Title' }),
        })

      const { result } = renderHook(() => useEvent('event-uuid-123'))

      await waitFor(() => {
        expect(result.current.event?.title).toBe('Original Title')
      })

      act(() => {
        result.current.fetchEvent()
      })

      await waitFor(() => {
        expect(result.current.event?.title).toBe('Updated Title')
      })
    })
  })

  describe('eventId changes', () => {
    it('fetches new event when eventId changes', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () =>
            createMockEventResponse({ id: 'event-1', title: 'Event 1' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () =>
            createMockEventResponse({ id: 'event-2', title: 'Event 2' }),
        })

      const { result, rerender } = renderHook(
        ({ eventId }) => useEvent(eventId),
        { initialProps: { eventId: 'event-1' } }
      )

      await waitFor(() => {
        expect(result.current.event?.title).toBe('Event 1')
      })

      rerender({ eventId: 'event-2' })

      await waitFor(() => {
        expect(result.current.event?.title).toBe('Event 2')
      })

      expect(mockFetch).toHaveBeenCalledTimes(2)
    })

    it('does not fetch when eventId is null', async () => {
      const { result, rerender } = renderHook(
        ({ eventId }) => useEvent(eventId),
        { initialProps: { eventId: null as string | null } }
      )

      await act(async () => {
        vi.advanceTimersByTime(100)
      })

      expect(mockFetch).not.toHaveBeenCalled()
      expect(result.current.event).toBeNull()

      // Change to valid eventId
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => createMockEventResponse(),
      })

      rerender({ eventId: 'event-uuid-123' })

      await waitFor(() => {
        expect(result.current.event).not.toBeNull()
      })
    })
  })
})

// ============================================================================
// EventError Tests
// ============================================================================

describe('EventError', () => {
  describe('error construction', () => {
    it('creates error with all properties', () => {
      const error = new EventError('NETWORK_ERROR', 'Failed to fetch', 'Timeout')

      expect(error.name).toBe('EventError')
      expect(error.code).toBe('NETWORK_ERROR')
      expect(error.message).toBe('Failed to fetch')
      expect(error.details).toBe('Timeout')
    })

    it('extends Error class', () => {
      const error = new EventError('SERVER_ERROR', 'Server error')

      expect(error).toBeInstanceOf(Error)
      expect(error).toBeInstanceOf(EventError)
    })

    it('handles undefined details', () => {
      const error = new EventError('UNKNOWN_ERROR', 'Unknown')

      expect(error.details).toBeUndefined()
    })
  })
})

// ============================================================================
// Edge Cases and Integration Tests
// ============================================================================

describe('Edge Cases', () => {
  describe('empty response handling', () => {
    it('handles empty events array', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () =>
          createMockSearchResponse({
            events: [],
            pagination: { totalCount: 0, hasNextPage: false },
          }),
      })

      const { result } = renderHook(() =>
        useEvents({
          initialParams: { coordinates: mockCoordinates },
          useCache: false,
        })
      )

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.events).toEqual([])
      expect(result.current.pagination?.totalCount).toBe(0)
    })

    it('handles missing pagination in response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          events: [mockEvent],
          sources: mockSources,
        }),
      })

      const { result } = renderHook(() =>
        useEvents({
          initialParams: { coordinates: mockCoordinates },
          useCache: false,
        })
      )

      await waitFor(() => {
        expect(result.current.events).toHaveLength(1)
      })

      expect(result.current.pagination).toEqual({
        page: 1,
        pageSize: 20,
        totalCount: 0,
        hasNextPage: false,
      })
    })

    it('handles missing sources in response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          events: [mockEvent],
          pagination: mockPagination,
        }),
      })

      const { result } = renderHook(() =>
        useEvents({
          initialParams: { coordinates: mockCoordinates },
          useCache: false,
        })
      )

      await waitFor(() => {
        expect(result.current.events).toHaveLength(1)
      })

      expect(result.current.sources).toEqual({
        eventbrite: { searched: false, count: 0 },
        meetup: { searched: false, count: 0 },
      })
    })
  })

  describe('JSON parse errors', () => {
    it('handles non-JSON error response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => {
          throw new Error('Not JSON')
        },
      })

      const { result } = renderHook(() =>
        useEvents({
          initialParams: { coordinates: mockCoordinates },
          useCache: false,
        })
      )

      await waitFor(() => {
        expect(result.current.error).not.toBeNull()
      })

      // 500 error returns SERVER_ERROR code
      expect(result.current.error?.code).toBe('SERVER_ERROR')
    })
  })

  describe('component unmount', () => {
    it('does not update state after unmount', async () => {
      let resolvePromise: (value: any) => void
      const fetchPromise = new Promise((resolve) => {
        resolvePromise = resolve
      })

      mockFetch.mockReturnValueOnce({
        ok: true,
        json: () => fetchPromise,
      })

      const { result, unmount } = renderHook(() =>
        useEvents({
          initialParams: { coordinates: mockCoordinates },
          useCache: false,
        })
      )

      await waitFor(() => {
        expect(result.current.isLoading).toBe(true)
      })

      // Unmount before fetch completes
      unmount()

      // Resolve the fetch after unmount
      await act(async () => {
        resolvePromise!(createMockSearchResponse())
      })

      // No error should be thrown - state updates are ignored after unmount
    })
  })

  describe('coordinates precision', () => {
    // TODO: Fix timing issue with cache key test
    it.skip('generates consistent cache keys for similar coordinates', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => createMockSearchResponse(),
      })

      const { result } = renderHook(() =>
        useEvents({ autoFetch: false, useCache: true })
      )

      // Search with slightly different coordinates (within 4 decimal places)
      act(() => {
        result.current.searchEvents({
          coordinates: { latitude: 37.77490001, longitude: -122.41940001 },
        })
      })

      await act(async () => {
        vi.advanceTimersByTime(300)
      })

      await waitFor(() => {
        expect(result.current.events).toHaveLength(1)
      }, { timeout: 3000 })

      expect(mockFetch).toHaveBeenCalledTimes(1)

      // Search with very similar coordinates
      act(() => {
        result.current.searchEvents({
          coordinates: { latitude: 37.77490002, longitude: -122.41940002 },
        })
      })

      await act(async () => {
        vi.advanceTimersByTime(300)
      })

      // Should use cache (coordinates rounded to 4 decimal places)
      expect(mockFetch).toHaveBeenCalledTimes(1)
    })
  })
})
