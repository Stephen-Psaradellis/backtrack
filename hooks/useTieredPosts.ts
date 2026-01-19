/**
 * useTieredPosts Hook
 *
 * Custom hook for fetching posts with tiered verification information.
 * Groups posts by verification tier for prioritized display.
 *
 * Features:
 * - Fetches posts with tier information via RPC
 * - Groups posts by tier (verified, regular, other)
 * - Supports location filtering
 * - Includes pagination support
 *
 * @example
 * ```tsx
 * function DiscoverScreen() {
 *   const { posts, isLoading, error, refresh } = useTieredPosts()
 *
 *   if (isLoading) return <LoadingSpinner />
 *
 *   return (
 *     <>
 *       {posts.verified.length > 0 && (
 *         <Section title="You were there!">
 *           {posts.verified.map(post => <PostCard key={post.post_id} post={post} />)}
 *         </Section>
 *       )}
 *       {posts.regularSpots.length > 0 && (
 *         <Section title="At your spots">
 *           {posts.regularSpots.map(post => <PostCard key={post.post_id} post={post} />)}
 *         </Section>
 *       )}
 *     </>
 *   )
 * }
 * ```
 */

import { useState, useCallback, useEffect, useRef } from 'react'

import { supabase } from '../lib/supabase'
import type { VerificationTier, UUID, Timestamp } from '../types/database'
import type { StoredAvatar2D } from '../components/avatar2d/types'

// ============================================================================
// TYPES
// ============================================================================

/**
 * Post with tier information from the RPC function
 */
export interface TieredPost {
  post_id: UUID
  location_id: UUID
  location_name: string
  producer_id: UUID
  message: string
  target_avatar_v2: StoredAvatar2D | null
  sighting_date: Timestamp | null
  time_granularity: string | null
  created_at: Timestamp
  expires_at: Timestamp
  matching_tier: VerificationTier
  user_was_there: boolean
  checkin_id: UUID | null
}

/**
 * Posts grouped by verification tier
 */
export interface TieredPostsResult {
  /** Tier 1: Verified check-in matches */
  verified: TieredPost[]
  /** Tier 2: Posts at favorite locations */
  regularSpots: TieredPost[]
  /** Tier 3: All other posts */
  other: TieredPost[]
}

/**
 * Options for useTieredPosts hook
 */
export interface UseTieredPostsOptions {
  /** Filter to specific location */
  locationId?: string
  /** Maximum posts to fetch */
  limit?: number
  /** Enable/disable fetching */
  enabled?: boolean
}

/**
 * Return value from useTieredPosts hook
 */
export interface UseTieredPostsResult {
  /** Posts grouped by tier */
  posts: TieredPostsResult
  /** All posts in a flat array (tier-sorted) */
  allPosts: TieredPost[]
  /** Whether initial fetch is loading */
  isLoading: boolean
  /** Whether refresh is in progress */
  isRefreshing: boolean
  /** Last error message */
  error: string | null
  /** Refresh posts */
  refresh: () => Promise<void>
  /** Load more posts (pagination) */
  loadMore: () => Promise<void>
  /** Whether there are more posts to load */
  hasMore: boolean
  /** Clear error state */
  clearError: () => void
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_LIMIT = 50

// ============================================================================
// HOOK IMPLEMENTATION
// ============================================================================

/**
 * Hook for fetching posts with tiered verification
 */
export function useTieredPosts(options: UseTieredPostsOptions = {}): UseTieredPostsResult {
  const { locationId, limit = DEFAULT_LIMIT, enabled = true } = options

  // State
  const [posts, setPosts] = useState<TieredPostsResult>({
    verified: [],
    regularSpots: [],
    other: [],
  })
  const [allPosts, setAllPosts] = useState<TieredPost[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const [offset, setOffset] = useState(0)

  // Refs
  const isMountedRef = useRef(true)

  /**
   * Group posts by tier
   */
  const groupPostsByTier = useCallback((postList: TieredPost[]): TieredPostsResult => {
    const grouped: TieredPostsResult = {
      verified: [],
      regularSpots: [],
      other: [],
    }

    for (const post of postList) {
      switch (post.matching_tier) {
        case 'verified_checkin':
          grouped.verified.push(post)
          break
        case 'regular_spot':
          grouped.regularSpots.push(post)
          break
        default:
          grouped.other.push(post)
      }
    }

    return grouped
  }, [])

  /**
   * Fetch posts from the database
   */
  const fetchPosts = useCallback(async (reset = false) => {
    if (!enabled || !isMountedRef.current) return

    const currentOffset = reset ? 0 : offset

    if (reset) {
      setIsLoading(true)
    }

    try {
      const { data, error: fetchError } = await supabase.rpc('get_posts_for_user', {
        p_location_id: locationId || null,
        p_limit: limit,
        p_offset: currentOffset,
      })

      if (fetchError) {
        if (isMountedRef.current) {
          setError(fetchError.message)
        }
        return
      }

      if (!isMountedRef.current) return

      const fetchedPosts = (data || []) as TieredPost[]

      if (reset) {
        setAllPosts(fetchedPosts)
        setPosts(groupPostsByTier(fetchedPosts))
        setOffset(fetchedPosts.length)
      } else {
        const newAllPosts = [...allPosts, ...fetchedPosts]
        setAllPosts(newAllPosts)
        setPosts(groupPostsByTier(newAllPosts))
        setOffset(newAllPosts.length)
      }

      setHasMore(fetchedPosts.length >= limit)
      setError(null)
    } catch (err) {
      if (isMountedRef.current) {
        setError(err instanceof Error ? err.message : 'Failed to fetch posts')
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false)
        setIsRefreshing(false)
      }
    }
  }, [enabled, locationId, limit, offset, allPosts, groupPostsByTier])

  /**
   * Refresh posts (reset to first page)
   */
  const refresh = useCallback(async () => {
    setIsRefreshing(true)
    setOffset(0)
    await fetchPosts(true)
  }, [fetchPosts])

  /**
   * Load more posts (pagination)
   */
  const loadMore = useCallback(async () => {
    if (!hasMore || isLoading || isRefreshing) return
    await fetchPosts(false)
  }, [hasMore, isLoading, isRefreshing, fetchPosts])

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setError(null)
  }, [])

  // Initial fetch on mount or when dependencies change
  useEffect(() => {
    isMountedRef.current = true

    if (enabled) {
      fetchPosts(true)
    }

    return () => {
      isMountedRef.current = false
    }
  }, [enabled, locationId]) // Don't include fetchPosts to avoid infinite loop

  return {
    posts,
    allPosts,
    isLoading,
    isRefreshing,
    error,
    refresh,
    loadMore,
    hasMore,
    clearError,
  }
}

/**
 * Hook for fetching only Tier 1 posts (verified check-in matches)
 */
export function useVerifiedPosts(options: Omit<UseTieredPostsOptions, 'locationId'> = {}) {
  const result = useTieredPosts(options)
  return {
    ...result,
    posts: result.posts.verified,
  }
}

/**
 * Hook for fetching posts at favorite spots (Tier 1 + Tier 2)
 */
export function useFavoriteSpotPosts(options: Omit<UseTieredPostsOptions, 'locationId'> = {}) {
  const result = useTieredPosts(options)
  return {
    ...result,
    posts: [...result.posts.verified, ...result.posts.regularSpots],
  }
}
