/**
 * React hook for fetching and managing event data.
 *
 * This hook provides a convenient way to search for events from
 * Eventbrite and Meetup APIs with proper caching, loading states,
 * and error handling.
 *
 * @module hooks/useEvents
 */

'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import type { Coordinates } from '@/types/database'

// ============================================================================
// Constants
// ============================================================================

/** Default search radius in kilometers */
const DEFAULT_RADIUS_KM = 50

/** Default page size for event results */
const DEFAULT_PAGE_SIZE = 20

/** Maximum page size allowed by the API */
const MAX_PAGE_SIZE = 50

/** Cache duration in milliseconds (5 minutes) */
const CACHE_DURATION_MS = 5 * 60 * 1000

/** Debounce delay for search in milliseconds */
const SEARCH_DEBOUNCE_MS = 300

// ============================================================================
// Types
// ============================================================================

/**
 * Event platform source
 */
export type EventPlatform = 'eventbrite' | 'meetup'

/**
 * Event data from API
 */
export interface Event {
  /** Database UUID */
  id: string
  /** External ID from the platform */
  external_id: string
  /** Source platform */
  platform: EventPlatform
  /** Event title */
  title: string
  /** Event description */
  description: string | null
  /** Event start date/time (ISO 8601) */
  date_time: string
  /** Event end date/time (ISO 8601) */
  end_time: string | null
  /** Venue name */
  venue_name: string | null
  /** Venue address */
  venue_address: string | null
  /** Venue latitude */
  latitude: number | null
  /** Venue longitude */
  longitude: number | null
  /** Event image URL */
  image_url: string | null
  /** Event URL */
  url: string | null
  /** Event category */
  category: string | null
  /** When the event was first cached */
  created_at: string
  /** When the event was last synced */
  synced_at: string
  /** Number of posts associated with this event */
  post_count?: number
}

/**
 * Pagination information
 */
export interface EventPagination {
  /** Current page number */
  page: number
  /** Results per page */
  pageSize: number
  /** Total number of results across all pages */
  totalCount: number
  /** Whether there are more pages */
  hasNextPage: boolean
}

/**
 * Source information for each platform
 */
export interface EventSourceInfo {
  /** Whether this platform was searched */
  searched: boolean
  /** Number of results from this platform */
  count: number
  /** Error message if search failed */
  error?: string
}

/**
 * Search parameters for events
 */
export interface EventSearchParams {
  /** Center point coordinates */
  coordinates?: Coordinates | null
  /** Search radius (e.g., "10km", "25mi") */
  radius?: string
  /** Category IDs to filter by */
  categories?: string[]
  /** Start date filter (ISO 8601) */
  startDate?: string
  /** End date filter (ISO 8601) */
  endDate?: string
  /** Search query string */
  query?: string
  /** Page number */
  page?: number
  /** Results per page */
  pageSize?: number
  /** Platforms to search */
  platforms?: EventPlatform[]
}

/**
 * Error codes for event fetch failures
 */
export type EventErrorCode =
  | 'NETWORK_ERROR'
  | 'INVALID_PARAMS'
  | 'SERVER_ERROR'
  | 'RATE_LIMITED'
  | 'UNKNOWN_ERROR'

/**
 * Event fetch error with typed error code
 */
export class EventError extends Error {
  readonly code: EventErrorCode
  readonly details?: string

  constructor(code: EventErrorCode, message: string, details?: string) {
    super(message)
    this.name = 'EventError'
    this.code = code
    this.details = details
    Object.setPrototypeOf(this, EventError.prototype)
  }
}

/**
 * Options for the useEvents hook
 */
export interface UseEventsOptions {
  /**
   * Initial search parameters.
   * If provided with coordinates, will fetch events on mount.
   */
  initialParams?: EventSearchParams
  /**
   * Whether to automatically fetch events when coordinates change.
   * @default true
   */
  autoFetch?: boolean
  /**
   * Whether to use cached results when available.
   * @default true
   */
  useCache?: boolean
  /**
   * Debounce delay for search in milliseconds.
   * @default 300
   */
  debounceMs?: number
}

/**
 * Result of the useEvents hook
 */
export interface UseEventsResult {
  /** List of events matching the search criteria */
  events: Event[]
  /** Whether a fetch is in progress */
  isLoading: boolean
  /** Error object if the fetch failed */
  error: EventError | null
  /** Pagination information */
  pagination: EventPagination | null
  /** Source information for each platform */
  sources: {
    eventbrite: EventSourceInfo
    meetup: EventSourceInfo
  } | null
  /** Current search parameters */
  searchParams: EventSearchParams
  /** Function to update search parameters and fetch events */
  searchEvents: (params: Partial<EventSearchParams>) => void
  /** Function to fetch the next page of results */
  fetchNextPage: () => void
  /** Function to refresh the current search */
  refresh: () => void
  /** Function to clear events and reset state */
  clear: () => void
}

// ============================================================================
// Cache Implementation
// ============================================================================

interface CacheEntry {
  events: Event[]
  pagination: EventPagination
  sources: { eventbrite: EventSourceInfo; meetup: EventSourceInfo }
  timestamp: number
}

const eventCache = new Map<string, CacheEntry>()

/**
 * Generate a cache key from search parameters
 */
function getCacheKey(params: EventSearchParams): string {
  const normalized = {
    lat: params.coordinates?.latitude?.toFixed(4),
    lng: params.coordinates?.longitude?.toFixed(4),
    radius: params.radius || `${DEFAULT_RADIUS_KM}km`,
    categories: params.categories?.sort().join(',') || '',
    startDate: params.startDate || '',
    endDate: params.endDate || '',
    query: params.query || '',
    page: params.page || 1,
    pageSize: params.pageSize || DEFAULT_PAGE_SIZE,
    platforms: params.platforms?.sort().join(',') || 'eventbrite,meetup',
  }
  return JSON.stringify(normalized)
}

/**
 * Get cached entry if valid
 */
function getCachedEntry(key: string): CacheEntry | null {
  const entry = eventCache.get(key)
  if (!entry) return null

  const now = Date.now()
  if (now - entry.timestamp > CACHE_DURATION_MS) {
    eventCache.delete(key)
    return null
  }

  return entry
}

/**
 * Store entry in cache
 */
function setCachedEntry(key: string, entry: Omit<CacheEntry, 'timestamp'>): void {
  eventCache.set(key, { ...entry, timestamp: Date.now() })
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Build URL search params from search parameters
 */
function buildSearchParams(params: EventSearchParams): URLSearchParams {
  const searchParams = new URLSearchParams()

  if (params.coordinates) {
    searchParams.set('latitude', params.coordinates.latitude.toString())
    searchParams.set('longitude', params.coordinates.longitude.toString())
  }

  if (params.radius) {
    searchParams.set('radius', params.radius)
  }

  if (params.categories && params.categories.length > 0) {
    searchParams.set('categories', params.categories.join(','))
  }

  if (params.startDate) {
    searchParams.set('startDate', params.startDate)
  }

  if (params.endDate) {
    searchParams.set('endDate', params.endDate)
  }

  if (params.query) {
    searchParams.set('q', params.query)
  }

  if (params.page && params.page > 1) {
    searchParams.set('page', params.page.toString())
  }

  if (params.pageSize && params.pageSize !== DEFAULT_PAGE_SIZE) {
    searchParams.set('pageSize', Math.min(params.pageSize, MAX_PAGE_SIZE).toString())
  }

  if (params.platforms && params.platforms.length > 0) {
    searchParams.set('platforms', params.platforms.join(','))
  }

  return searchParams
}

/**
 * Map API error response to EventError
 */
function mapApiError(status: number, data: { error?: string; details?: string }): EventError {
  switch (status) {
    case 400:
      return new EventError(
        'INVALID_PARAMS',
        data.error || 'Invalid search parameters',
        data.details
      )
    case 429:
      return new EventError(
        'RATE_LIMITED',
        'Too many requests. Please try again later.',
        data.details
      )
    case 500:
      return new EventError(
        'SERVER_ERROR',
        data.error || 'Failed to search events',
        data.details
      )
    default:
      return new EventError(
        'UNKNOWN_ERROR',
        data.error || 'An unexpected error occurred',
        data.details
      )
  }
}

// ============================================================================
// Hook Implementation
// ============================================================================

/**
 * React hook for fetching and managing event data.
 *
 * Features:
 * - Search events by location, category, date, and query
 * - Automatic caching with configurable duration
 * - Pagination support with next page fetching
 * - Loading and error states
 * - Debounced search updates
 * - Platform-specific source information
 *
 * @param options - Configuration options for the hook
 * @returns Object containing event data, loading state, error, and control functions
 *
 * @example
 * // Basic usage with user location
 * const { events, isLoading, error, searchEvents } = useEvents({
 *   initialParams: { coordinates: { latitude: 40.7128, longitude: -74.006 } }
 * })
 *
 * @example
 * // Search with filters
 * const { events, searchEvents } = useEvents()
 * searchEvents({
 *   coordinates: userLocation,
 *   categories: ['music', 'tech'],
 *   startDate: '2024-01-01',
 *   radius: '25km'
 * })
 *
 * @example
 * // Pagination
 * const { events, pagination, fetchNextPage } = useEvents()
 * if (pagination?.hasNextPage) {
 *   fetchNextPage()
 * }
 */
export function useEvents(options: UseEventsOptions = {}): UseEventsResult {
  const {
    initialParams = {},
    autoFetch = true,
    useCache = true,
    debounceMs = SEARCH_DEBOUNCE_MS,
  } = options

  // State
  const [events, setEvents] = useState<Event[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<EventError | null>(null)
  const [pagination, setPagination] = useState<EventPagination | null>(null)
  const [sources, setSources] = useState<{
    eventbrite: EventSourceInfo
    meetup: EventSourceInfo
  } | null>(null)
  const [searchParams, setSearchParams] = useState<EventSearchParams>(initialParams)

  // Refs
  const isMountedRef = useRef(true)
  const abortControllerRef = useRef<AbortController | null>(null)
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Memoize initial params to avoid infinite loops
  const initialParamsRef = useRef(initialParams)

  /**
   * Fetch events from API
   */
  const fetchEvents = useCallback(
    async (params: EventSearchParams, append = false) => {
      // Validate coordinates
      if (!params.coordinates) {
        return
      }

      // Cancel previous request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }

      // Check cache first
      if (useCache && !append) {
        const cacheKey = getCacheKey(params)
        const cached = getCachedEntry(cacheKey)
        if (cached) {
          if (isMountedRef.current) {
            setEvents(cached.events)
            setPagination(cached.pagination)
            setSources(cached.sources)
            setError(null)
            setIsLoading(false)
          }
          return
        }
      }

      // Create new abort controller
      abortControllerRef.current = new AbortController()

      if (isMountedRef.current) {
        setIsLoading(true)
        setError(null)
      }

      try {
        const urlParams = buildSearchParams(params)
        const response = await fetch(`/api/events/search?${urlParams.toString()}`, {
          signal: abortControllerRef.current.signal,
          headers: {
            'Content-Type': 'application/json',
          },
        })

        if (!isMountedRef.current) return

        if (!response.ok) {
          const data = await response.json().catch(() => ({}))
          throw mapApiError(response.status, data)
        }

        const data = await response.json()

        if (!isMountedRef.current) return

        const newEvents: Event[] = data.events || []
        const newPagination: EventPagination = data.pagination || {
          page: 1,
          pageSize: DEFAULT_PAGE_SIZE,
          totalCount: 0,
          hasNextPage: false,
        }
        const newSources = data.sources || {
          eventbrite: { searched: false, count: 0 },
          meetup: { searched: false, count: 0 },
        }

        // Cache the result
        if (useCache && !append) {
          const cacheKey = getCacheKey(params)
          setCachedEntry(cacheKey, {
            events: newEvents,
            pagination: newPagination,
            sources: newSources,
          })
        }

        // Update state
        if (append) {
          setEvents((prev) => [...prev, ...newEvents])
        } else {
          setEvents(newEvents)
        }
        setPagination(newPagination)
        setSources(newSources)
        setError(null)
      } catch (err) {
        if (!isMountedRef.current) return

        // Ignore abort errors
        if (err instanceof Error && err.name === 'AbortError') {
          return
        }

        const eventError =
          err instanceof EventError
            ? err
            : new EventError(
                'NETWORK_ERROR',
                err instanceof Error ? err.message : 'Failed to fetch events'
              )

        setError(eventError)
      } finally {
        if (isMountedRef.current) {
          setIsLoading(false)
        }
      }
    },
    [useCache]
  )

  /**
   * Search events with debouncing
   */
  const searchEvents = useCallback(
    (params: Partial<EventSearchParams>) => {
      // Clear existing debounce timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }

      // Merge with current params
      const newParams = { ...searchParams, ...params, page: params.page || 1 }
      setSearchParams(newParams)

      // Debounce the fetch
      debounceTimerRef.current = setTimeout(() => {
        fetchEvents(newParams)
      }, debounceMs)
    },
    [searchParams, fetchEvents, debounceMs]
  )

  /**
   * Fetch the next page of results
   */
  const fetchNextPage = useCallback(() => {
    if (!pagination?.hasNextPage || isLoading) return

    const newParams = { ...searchParams, page: pagination.page + 1 }
    setSearchParams(newParams)
    fetchEvents(newParams, true)
  }, [pagination, isLoading, searchParams, fetchEvents])

  /**
   * Refresh the current search
   */
  const refresh = useCallback(() => {
    // Invalidate cache for current params
    if (searchParams.coordinates) {
      const cacheKey = getCacheKey(searchParams)
      eventCache.delete(cacheKey)
    }
    fetchEvents(searchParams)
  }, [searchParams, fetchEvents])

  /**
   * Clear events and reset state
   */
  const clear = useCallback(() => {
    // Cancel any pending request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    setEvents([])
    setError(null)
    setPagination(null)
    setSources(null)
    setIsLoading(false)
  }, [])

  // Fetch on mount if initial params include coordinates and autoFetch is enabled
  useEffect(() => {
    isMountedRef.current = true

    if (autoFetch && initialParamsRef.current.coordinates) {
      fetchEvents(initialParamsRef.current)
    }

    return () => {
      isMountedRef.current = false
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return {
    events,
    isLoading,
    error,
    pagination,
    sources,
    searchParams,
    searchEvents,
    fetchNextPage,
    refresh,
    clear,
  }
}

/**
 * Hook for fetching a single event by ID
 */
export interface UseEventOptions {
  /**
   * Whether to automatically fetch the event on mount.
   * @default true
   */
  autoFetch?: boolean
}

export interface UseEventResult {
  /** The event data, or null if not loaded */
  event: Event | null
  /** Whether a fetch is in progress */
  isLoading: boolean
  /** Error object if the fetch failed */
  error: EventError | null
  /** Function to fetch or refresh the event */
  fetchEvent: () => void
}

/**
 * React hook for fetching a single event by ID.
 *
 * @param eventId - The event ID (database UUID or external_id:platform format)
 * @param options - Configuration options
 * @returns Object containing event data, loading state, and control functions
 *
 * @example
 * const { event, isLoading, error } = useEvent('123e4567-e89b-12d3-a456-426614174000')
 *
 * @example
 * // External ID format
 * const { event } = useEvent('eb-12345:eventbrite')
 */
export function useEvent(
  eventId: string | null | undefined,
  options: UseEventOptions = {}
): UseEventResult {
  const { autoFetch = true } = options

  const [event, setEvent] = useState<Event | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<EventError | null>(null)

  const isMountedRef = useRef(true)
  const abortControllerRef = useRef<AbortController | null>(null)

  const fetchEvent = useCallback(async () => {
    if (!eventId) return

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    abortControllerRef.current = new AbortController()

    if (isMountedRef.current) {
      setIsLoading(true)
      setError(null)
    }

    try {
      const response = await fetch(`/api/events/${encodeURIComponent(eventId)}`, {
        signal: abortControllerRef.current.signal,
      })

      if (!isMountedRef.current) return

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw mapApiError(response.status, data)
      }

      const data = await response.json()

      if (!isMountedRef.current) return

      setEvent(data.event || null)
      setError(null)
    } catch (err) {
      if (!isMountedRef.current) return

      if (err instanceof Error && err.name === 'AbortError') {
        return
      }

      const eventError =
        err instanceof EventError
          ? err
          : new EventError(
              'NETWORK_ERROR',
              err instanceof Error ? err.message : 'Failed to fetch event'
            )

      setError(eventError)
      setEvent(null)
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false)
      }
    }
  }, [eventId])

  useEffect(() => {
    isMountedRef.current = true

    if (autoFetch && eventId) {
      fetchEvent()
    }

    return () => {
      isMountedRef.current = false
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [eventId, autoFetch, fetchEvent])

  return {
    event,
    isLoading,
    error,
    fetchEvent,
  }
}

export default useEvents
