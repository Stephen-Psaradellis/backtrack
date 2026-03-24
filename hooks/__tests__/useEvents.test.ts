import { renderHook, act, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Must be before hook import so the module-level cache is fresh per test
let useEvents: typeof import('../useEvents').useEvents
let useEvent: typeof import('../useEvents').useEvent
let EventError: typeof import('../useEvents').EventError

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const coords = { latitude: 40.7128, longitude: -74.006 }

function makeEvent(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'evt-1',
    external_id: 'eb-1',
    platform: 'eventbrite',
    title: 'Test Event',
    description: null,
    date_time: '2026-03-10T18:00:00Z',
    end_time: null,
    venue_name: 'Test Venue',
    venue_address: '123 Main St',
    latitude: 40.7128,
    longitude: -74.006,
    image_url: null,
    url: 'https://example.com',
    category: 'music',
    created_at: '2026-01-01T00:00:00Z',
    synced_at: '2026-03-01T00:00:00Z',
    ...overrides,
  }
}

function apiResponse(events: unknown[] = [], page = 1, hasNextPage = false, total = 0) {
  return {
    events,
    pagination: { page, pageSize: 20, totalCount: total || events.length, hasNextPage },
    sources: {
      eventbrite: { searched: true, count: events.length },
      meetup: { searched: true, count: 0 },
    },
  }
}

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

beforeEach(async () => {
  vi.useFakeTimers()
  // Re-import to get a fresh module-level cache each test
  vi.resetModules()
  const mod = await import('../useEvents')
  useEvents = mod.useEvents
  useEvent = mod.useEvent
  EventError = mod.EventError

  // Suppress __DEV__ console logs
  ;(globalThis as any).__DEV__ = false

  // Default fetch mock – succeeds with empty results
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => apiResponse(),
    })
  )
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useEvents', () => {
  // 1. Returns initial empty state
  it('returns initial empty state when no params provided', () => {
    const { result } = renderHook(() => useEvents())

    expect(result.current.events).toEqual([])
    expect(result.current.isLoading).toBe(false)
    expect(result.current.error).toBeNull()
    expect(result.current.pagination).toBeNull()
    expect(result.current.sources).toBeNull()
  })

  // 2. Search returns events
  it('returns events after searching', async () => {
    const event = makeEvent()
    ;(fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => apiResponse([event]),
    })

    const { result } = renderHook(() => useEvents())

    act(() => {
      result.current.searchEvents({ coordinates: coords })
    })

    // Advance past debounce
    act(() => {
      vi.advanceTimersByTime(300)
    })

    await waitFor(() => {
      expect(result.current.events).toHaveLength(1)
      expect(result.current.events[0].title).toBe('Test Event')
    })
  })

  // 3. Debounce delays search
  it('debounces search calls by 300ms', async () => {
    ;(fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => apiResponse([makeEvent()]),
    })

    const { result } = renderHook(() => useEvents())

    act(() => {
      result.current.searchEvents({ coordinates: coords, query: 'a' })
    })
    act(() => {
      vi.advanceTimersByTime(100)
    })
    act(() => {
      result.current.searchEvents({ coordinates: coords, query: 'ab' })
    })
    act(() => {
      vi.advanceTimersByTime(100)
    })

    // fetch should NOT have been called yet (only 200ms since last call)
    expect(fetch).not.toHaveBeenCalled()

    act(() => {
      vi.advanceTimersByTime(300)
    })

    await waitFor(() => {
      // Only one fetch after final debounce
      expect(fetch).toHaveBeenCalledTimes(1)
    })
  })

  // 4. Loading states during fetch
  it('sets isLoading true while fetching', async () => {
    let resolveFetch!: (v: unknown) => void
    ;(fetch as ReturnType<typeof vi.fn>).mockReturnValue(
      new Promise((r) => {
        resolveFetch = r
      })
    )

    const { result } = renderHook(() => useEvents())

    act(() => {
      result.current.searchEvents({ coordinates: coords })
    })
    act(() => {
      vi.advanceTimersByTime(300)
    })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(true)
    })

    await act(async () => {
      resolveFetch({ ok: true, json: async () => apiResponse() })
    })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })
  })

  // 5. Error handling for failed fetch
  it('sets error on fetch failure', async () => {
    ;(fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ error: 'Internal Server Error' }),
    })

    const { result } = renderHook(() => useEvents())

    act(() => {
      result.current.searchEvents({ coordinates: coords })
    })
    act(() => {
      vi.advanceTimersByTime(300)
    })

    await waitFor(() => {
      expect(result.current.error).not.toBeNull()
      expect(result.current.error!.code).toBe('SERVER_ERROR')
    })
  })

  // 6. Pagination fetchNextPage
  it('appends events on fetchNextPage', async () => {
    const event1 = makeEvent({ id: 'evt-1', title: 'Event 1' })
    const event2 = makeEvent({ id: 'evt-2', title: 'Event 2' })

    ;(fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => apiResponse([event1], 1, true, 2),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => apiResponse([event2], 2, false, 2),
      })

    const { result } = renderHook(() =>
      useEvents({ initialParams: { coordinates: coords } })
    )

    // Wait for initial auto-fetch
    await waitFor(() => {
      expect(result.current.events).toHaveLength(1)
    })

    act(() => {
      result.current.fetchNextPage()
    })

    await waitFor(() => {
      expect(result.current.events).toHaveLength(2)
      expect(result.current.events[1].title).toBe('Event 2')
    })
  })

  // 7. Cache hit returns cached results without fetch
  it('returns cached results without fetching again', async () => {
    ;(fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => apiResponse([makeEvent()]),
    })

    const { result } = renderHook(() => useEvents())

    // First search
    act(() => {
      result.current.searchEvents({ coordinates: coords })
    })
    act(() => {
      vi.advanceTimersByTime(300)
    })

    await waitFor(() => {
      expect(result.current.events).toHaveLength(1)
    })

    expect(fetch).toHaveBeenCalledTimes(1)

    // Same search again — should use cache
    act(() => {
      result.current.searchEvents({ coordinates: coords })
    })
    act(() => {
      vi.advanceTimersByTime(300)
    })

    await waitFor(() => {
      expect(result.current.events).toHaveLength(1)
    })

    // Still only 1 fetch call
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  // 9. Empty query / no coordinates returns no results
  it('does not fetch when coordinates are missing', () => {
    const { result } = renderHook(() => useEvents())

    act(() => {
      result.current.searchEvents({ query: 'test' })
    })
    act(() => {
      vi.advanceTimersByTime(300)
    })

    expect(fetch).not.toHaveBeenCalled()
    expect(result.current.events).toEqual([])
  })

  // 10. Network error produces NETWORK_ERROR code
  it('sets NETWORK_ERROR on network failure', async () => {
    ;(fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new TypeError('Failed to fetch'))

    const { result } = renderHook(() => useEvents())

    act(() => {
      result.current.searchEvents({ coordinates: coords })
    })
    act(() => {
      vi.advanceTimersByTime(300)
    })

    await waitFor(() => {
      expect(result.current.error).not.toBeNull()
      expect(result.current.error!.code).toBe('NETWORK_ERROR')
      expect(result.current.error!.message).toBe('Failed to fetch')
    })
  })
})

// ---------------------------------------------------------------------------
// useEvent (single event)
// ---------------------------------------------------------------------------

describe('useEvent', () => {
  // 8. useEvent fetches single event
  it('fetches a single event by ID', async () => {
    const event = makeEvent()
    ;(fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ event }),
    })

    const { result } = renderHook(() => useEvent('evt-1'))

    await waitFor(() => {
      expect(result.current.event).not.toBeNull()
      expect(result.current.event!.title).toBe('Test Event')
    })

    expect(fetch).toHaveBeenCalledWith(
      '/api/events/evt-1',
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    )
  })

  it('does not fetch when eventId is null', () => {
    renderHook(() => useEvent(null))
    expect(fetch).not.toHaveBeenCalled()
  })

  it('sets error on failed single event fetch', async () => {
    ;(fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ error: 'Bad request' }),
    })

    const { result } = renderHook(() => useEvent('bad-id'))

    await waitFor(() => {
      expect(result.current.error).not.toBeNull()
      expect(result.current.error!.code).toBe('INVALID_PARAMS')
      expect(result.current.event).toBeNull()
    })
  })
})

// ---------------------------------------------------------------------------
// EventError
// ---------------------------------------------------------------------------

describe('EventError', () => {
  it('creates error with code and details', () => {
    const err = new EventError('RATE_LIMITED', 'Too many requests', 'Retry after 60s')
    expect(err.code).toBe('RATE_LIMITED')
    expect(err.message).toBe('Too many requests')
    expect(err.details).toBe('Retry after 60s')
    expect(err.name).toBe('EventError')
    expect(err).toBeInstanceOf(Error)
    expect(err).toBeInstanceOf(EventError)
  })
})
