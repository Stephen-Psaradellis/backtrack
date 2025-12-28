/**
 * React hook for fetching and managing event-specific posts.
 *
 * This hook provides a convenient way to fetch posts associated with
 * a specific event, with proper loading states, error handling,
 * pagination support, and the ability to create new posts.
 *
 * @module hooks/useEventPosts
 */

'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

// ============================================================================
// Constants
// ============================================================================

/** Default page size for post results */
const DEFAULT_PAGE_SIZE = 20

/** Maximum page size allowed by the API */
const MAX_PAGE_SIZE = 50

/** Cache duration in milliseconds (2 minutes) */
const CACHE_DURATION_MS = 2 * 60 * 1000

// ============================================================================
// Types
// ============================================================================

/**
 * Post author information
 */
export interface PostProducer {
  /** User ID */
  id: string
  /** Display name */
  display_name: string | null
  /** Username */
  username: string | null
}

/**
 * Post location information
 */
export interface PostLocation {
  /** Location ID */
  id: string
  /** Location name */
  name: string
  /** Location address */
  address: string | null
}

/**
 * Post associated with an event
 */
export interface EventPost {
  /** Post ID */
  id: string
  /** Producer user ID */
  producer_id: string
  /** Location ID */
  location_id: string
  /** Selfie URL */
  selfie_url: string
  /** Target avatar configuration */
  target_avatar: Record<string, unknown>
  /** Target description */
  target_description: string | null
  /** Post message */
  message: string
  /** Additional note */
  note: string | null
  /** When the person was seen */
  seen_at: string | null
  /** Whether the post is active */
  is_active: boolean
  /** When the post was created */
  created_at: string
  /** When the post expires */
  expires_at: string
  /** Producer information */
  producer?: PostProducer
  /** Location information */
  location?: PostLocation
}

/**
 * Event-post link information
 */
export interface EventPostLink {
  /** Link ID */
  id: string
  /** Event ID */
  event_id: string
  /** Post ID */
  post_id: string
  /** When the link was created */
  created_at: string
}

/**
 * Pagination information for posts
 */
export interface EventPostsPagination {
  /** Current page number */
  page: number
  /** Results per page */
  pageSize: number
  /** Total number of results */
  totalCount: number
  /** Whether there are more pages */
  hasNextPage: boolean
}

/**
 * Parameters for creating a new post
 */
export interface CreatePostParams {
  /** Location ID where the sighting occurred */
  location_id: string
  /** URL to the selfie image */
  selfie_url: string
  /** Target avatar configuration */
  target_avatar: Record<string, unknown>
  /** Description of the target person */
  target_description?: string
  /** Message to the target */
  message: string
  /** Optional private note */
  note?: string
  /** When the person was seen (ISO 8601) */
  seen_at?: string
}

/**
 * Error codes for post fetch failures
 */
export type EventPostsErrorCode =
  | 'NETWORK_ERROR'
  | 'UNAUTHORIZED'
  | 'NOT_FOUND'
  | 'VALIDATION_ERROR'
  | 'SERVER_ERROR'
  | 'UNKNOWN_ERROR'

/**
 * Event posts error with typed error code
 */
export class EventPostsError extends Error {
  readonly code: EventPostsErrorCode
  readonly details?: string

  constructor(code: EventPostsErrorCode, message: string, details?: string) {
    super(message)
    this.name = 'EventPostsError'
    this.code = code
    this.details = details
    Object.setPrototypeOf(this, EventPostsError.prototype)
  }
}

/**
 * Options for the useEventPosts hook
 */
export interface UseEventPostsOptions {
  /**
   * Whether to automatically fetch posts on mount.
   * @default true
   */
  autoFetch?: boolean
  /**
   * Initial page size.
   * @default 20
   */
  pageSize?: number
  /**
   * Whether to use cached results when available.
   * @default true
   */
  useCache?: boolean
}

/**
 * Result of the useEventPosts hook
 */
export interface UseEventPostsResult {
  /** List of posts for the event */
  posts: EventPost[]
  /** Whether a fetch is in progress */
  isLoading: boolean
  /** Whether a post creation is in progress */
  isCreating: boolean
  /** Error object if the fetch failed */
  error: EventPostsError | null
  /** Pagination information */
  pagination: EventPostsPagination | null
  /** Event ID being queried */
  eventId: string | null
  /** Function to fetch posts (or refresh) */
  fetchPosts: () => void
  /** Function to fetch the next page of results */
  fetchNextPage: () => void
  /** Function to create a new post linked to this event */
  createPost: (params: CreatePostParams) => Promise<EventPost | null>
  /** Function to clear posts and reset state */
  clear: () => void
}

// ============================================================================
// Cache Implementation
// ============================================================================

interface CacheEntry {
  posts: EventPost[]
  pagination: EventPostsPagination
  timestamp: number
}

const postsCache = new Map<string, CacheEntry>()

/**
 * Generate a cache key from event ID and page
 */
function getCacheKey(eventId: string, page: number, pageSize: number): string {
  return `${eventId}:${page}:${pageSize}`
}

/**
 * Get cached entry if valid
 */
function getCachedEntry(key: string): CacheEntry | null {
  const entry = postsCache.get(key)
  if (!entry) return null

  const now = Date.now()
  if (now - entry.timestamp > CACHE_DURATION_MS) {
    postsCache.delete(key)
    return null
  }

  return entry
}

/**
 * Store entry in cache
 */
function setCachedEntry(key: string, entry: Omit<CacheEntry, 'timestamp'>): void {
  postsCache.set(key, { ...entry, timestamp: Date.now() })
}

/**
 * Invalidate all cache entries for an event
 */
function invalidateEventCache(eventId: string): void {
  for (const key of postsCache.keys()) {
    if (key.startsWith(`${eventId}:`)) {
      postsCache.delete(key)
    }
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Map API error response to EventPostsError
 */
function mapApiError(
  status: number,
  data: { error?: string; details?: string }
): EventPostsError {
  switch (status) {
    case 400:
      return new EventPostsError(
        'VALIDATION_ERROR',
        data.error || 'Invalid request parameters',
        data.details
      )
    case 401:
      return new EventPostsError(
        'UNAUTHORIZED',
        'Authentication required to perform this action',
        data.details
      )
    case 404:
      return new EventPostsError(
        'NOT_FOUND',
        data.error || 'Event or resource not found',
        data.details
      )
    case 500:
      return new EventPostsError(
        'SERVER_ERROR',
        data.error || 'Failed to process request',
        data.details
      )
    default:
      return new EventPostsError(
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
 * React hook for fetching and managing event-specific posts.
 *
 * Features:
 * - Fetch posts associated with a specific event
 * - Automatic caching with configurable duration
 * - Pagination support with next page fetching
 * - Loading and error states
 * - Create new posts linked to the event
 *
 * @param eventId - The event ID (database UUID) to fetch posts for
 * @param options - Configuration options for the hook
 * @returns Object containing posts data, loading state, error, and control functions
 *
 * @example
 * // Basic usage
 * const { posts, isLoading, error } = useEventPosts('123e4567-e89b-12d3-a456-426614174000')
 *
 * @example
 * // With pagination
 * const { posts, pagination, fetchNextPage } = useEventPosts(eventId)
 * if (pagination?.hasNextPage) {
 *   fetchNextPage()
 * }
 *
 * @example
 * // Create a new post
 * const { createPost, isCreating } = useEventPosts(eventId)
 * const newPost = await createPost({
 *   location_id: 'location-uuid',
 *   selfie_url: 'https://example.com/selfie.jpg',
 *   target_avatar: { hairColor: 'brown' },
 *   message: 'We met at the concert!'
 * })
 */
export function useEventPosts(
  eventId: string | null | undefined,
  options: UseEventPostsOptions = {}
): UseEventPostsResult {
  const {
    autoFetch = true,
    pageSize: initialPageSize = DEFAULT_PAGE_SIZE,
    useCache = true,
  } = options

  // Clamp page size
  const pageSize = Math.min(Math.max(1, initialPageSize), MAX_PAGE_SIZE)

  // State
  const [posts, setPosts] = useState<EventPost[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<EventPostsError | null>(null)
  const [pagination, setPagination] = useState<EventPostsPagination | null>(null)
  const [currentPage, setCurrentPage] = useState(1)

  // Refs
  const isMountedRef = useRef(true)
  const abortControllerRef = useRef<AbortController | null>(null)

  /**
   * Fetch posts for the event
   */
  const fetchPosts = useCallback(
    async (page = 1, append = false) => {
      if (!eventId) return

      // Cancel previous request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }

      // Check cache first (only for page 1 and non-append operations)
      if (useCache && page === 1 && !append) {
        const cacheKey = getCacheKey(eventId, page, pageSize)
        const cached = getCachedEntry(cacheKey)
        if (cached) {
          if (isMountedRef.current) {
            setPosts(cached.posts)
            setPagination(cached.pagination)
            setError(null)
            setIsLoading(false)
            setCurrentPage(1)
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
        const params = new URLSearchParams({
          page: page.toString(),
          pageSize: pageSize.toString(),
        })

        const response = await fetch(
          `/api/events/${encodeURIComponent(eventId)}/posts?${params.toString()}`,
          {
            signal: abortControllerRef.current.signal,
            headers: {
              'Content-Type': 'application/json',
            },
          }
        )

        if (!isMountedRef.current) return

        if (!response.ok) {
          const data = await response.json().catch(() => ({}))
          throw mapApiError(response.status, data)
        }

        const data = await response.json()

        if (!isMountedRef.current) return

        const newPosts: EventPost[] = data.posts || []
        const newPagination: EventPostsPagination = data.pagination || {
          page: 1,
          pageSize,
          totalCount: 0,
          hasNextPage: false,
        }

        // Cache the result (only for page 1)
        if (useCache && page === 1 && !append) {
          const cacheKey = getCacheKey(eventId, page, pageSize)
          setCachedEntry(cacheKey, {
            posts: newPosts,
            pagination: newPagination,
          })
        }

        // Update state
        if (append) {
          setPosts((prev) => [...prev, ...newPosts])
        } else {
          setPosts(newPosts)
        }
        setPagination(newPagination)
        setCurrentPage(page)
        setError(null)
      } catch (err) {
        if (!isMountedRef.current) return

        // Ignore abort errors
        if (err instanceof Error && err.name === 'AbortError') {
          return
        }

        const postsError =
          err instanceof EventPostsError
            ? err
            : new EventPostsError(
                'NETWORK_ERROR',
                err instanceof Error ? err.message : 'Failed to fetch posts'
              )

        setError(postsError)
      } finally {
        if (isMountedRef.current) {
          setIsLoading(false)
        }
      }
    },
    [eventId, pageSize, useCache]
  )

  /**
   * Fetch the next page of results
   */
  const fetchNextPage = useCallback(() => {
    if (!pagination?.hasNextPage || isLoading) return

    fetchPosts(currentPage + 1, true)
  }, [pagination, isLoading, currentPage, fetchPosts])

  /**
   * Create a new post linked to this event
   */
  const createPost = useCallback(
    async (params: CreatePostParams): Promise<EventPost | null> => {
      if (!eventId) {
        setError(
          new EventPostsError('VALIDATION_ERROR', 'Event ID is required to create a post')
        )
        return null
      }

      if (isMountedRef.current) {
        setIsCreating(true)
        setError(null)
      }

      try {
        const response = await fetch(`/api/events/${encodeURIComponent(eventId)}/posts`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(params),
        })

        if (!isMountedRef.current) return null

        if (!response.ok) {
          const data = await response.json().catch(() => ({}))
          throw mapApiError(response.status, data)
        }

        const data = await response.json()

        if (!isMountedRef.current) return null

        const newPost: EventPost = data.post

        // Invalidate cache for this event
        if (useCache) {
          invalidateEventCache(eventId)
        }

        // Add the new post to the beginning of the list
        setPosts((prev) => [newPost, ...prev])

        // Update pagination count
        setPagination((prev) =>
          prev
            ? {
                ...prev,
                totalCount: prev.totalCount + 1,
              }
            : null
        )

        return newPost
      } catch (err) {
        if (!isMountedRef.current) return null

        const postsError =
          err instanceof EventPostsError
            ? err
            : new EventPostsError(
                'NETWORK_ERROR',
                err instanceof Error ? err.message : 'Failed to create post'
              )

        setError(postsError)
        return null
      } finally {
        if (isMountedRef.current) {
          setIsCreating(false)
        }
      }
    },
    [eventId, useCache]
  )

  /**
   * Clear posts and reset state
   */
  const clear = useCallback(() => {
    // Cancel any pending request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    setPosts([])
    setError(null)
    setPagination(null)
    setIsLoading(false)
    setIsCreating(false)
    setCurrentPage(1)
  }, [])

  /**
   * Wrapper to call fetchPosts without arguments for external use
   */
  const fetchPostsExternal = useCallback(() => {
    // Invalidate cache to force refresh
    if (eventId && useCache) {
      invalidateEventCache(eventId)
    }
    fetchPosts(1, false)
  }, [eventId, useCache, fetchPosts])

  // Fetch on mount if event ID is provided and autoFetch is enabled
  useEffect(() => {
    isMountedRef.current = true

    if (autoFetch && eventId) {
      fetchPosts(1, false)
    }

    return () => {
      isMountedRef.current = false
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [eventId, autoFetch]) // eslint-disable-line react-hooks/exhaustive-deps

  // Reset state when event ID changes
  useEffect(() => {
    if (!eventId) {
      clear()
    }
  }, [eventId, clear])

  return {
    posts,
    isLoading,
    isCreating,
    error,
    pagination,
    eventId: eventId || null,
    fetchPosts: fetchPostsExternal,
    fetchNextPage,
    createPost,
    clear,
  }
}

export default useEventPosts
