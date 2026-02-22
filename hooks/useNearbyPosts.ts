/**
 * useNearbyPosts Hook
 *
 * Custom hook for fetching posts within a specified radius of the user's location.
 * Uses PostGIS geospatial queries via Supabase RPC with tiered radius expansion.
 *
 * Features:
 * - Tiered radius expansion: automatically expands radius if not enough posts
 * - Efficient progressive queries: only queries wider radius if needed
 * - Visual feedback: returns active tier and total posts found
 *
 * @example
 * ```tsx
 * function NearbyFeed() {
 *   const { posts, isLoading, error, refetch, activeTier, effectiveRadius } = useNearbyPosts(500)
 *
 *   if (isLoading) return <LoadingSpinner />
 *   if (error) return <Text>{error}</Text>
 *
 *   return (
 *     <>
 *       <Text>Showing posts within {activeTier.description}</Text>
 *       <FlatList
 *         data={posts}
 *         renderItem={({ item }) => <PostCard post={item} />}
 *       />
 *     </>
 *   )
 * }
 * ```
 */

import { useState, useCallback, useEffect, useRef } from 'react'

import { supabase } from '../lib/supabase'
import { useLocation } from './useLocation'
import type { Post } from '../types/database'

// ============================================================================
// TYPES
// ============================================================================

/**
 * Radius tier for progressive discovery
 */
export interface RadiusTier {
  label: string
  value: number
  description: string
  minPosts: number
}

/**
 * Return value from useNearbyPosts hook
 */
export interface UseNearbyPostsResult {
  /** Array of posts within the radius */
  posts: Post[]
  /** Whether data is loading */
  isLoading: boolean
  /** Any error that occurred */
  error: string | null
  /** Refresh data */
  refetch: () => Promise<void>
  /** Currently active radius tier */
  activeTier: RadiusTier
  /** Effective radius being used (in meters) */
  effectiveRadius: number
  /** Whether tiered expansion is enabled */
  usingTieredExpansion: boolean
}

// ============================================================================
// CONSTANTS
// ============================================================================

/** Default search radius in meters */
const DEFAULT_RADIUS_METERS = 500

/** Maximum number of posts to fetch */
const DEFAULT_LIMIT = 50

/**
 * Tiered radius configuration for progressive discovery
 * Each tier expands if the previous tier has insufficient posts
 */
export const RADIUS_TIERS: RadiusTier[] = [
  { label: 'Nearby', value: 500, description: '500m', minPosts: 5 },
  { label: 'Neighborhood', value: 2000, description: '2km', minPosts: 5 },
  { label: 'City-wide', value: 10000, description: '10km', minPosts: 5 },
  { label: 'Extended', value: 25000, description: '25km', minPosts: 1 },
]

/**
 * Calculate distance between two points using Haversine formula
 * @returns Distance in meters
 */
function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000 // Earth's radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

// ============================================================================
// HOOK IMPLEMENTATION
// ============================================================================

/**
 * Hook for fetching posts within a radius of the user's current location
 * with automatic tiered expansion for better discovery
 *
 * @param radiusMeters - Initial search radius in meters (default: 500)
 * @param enableTieredExpansion - Enable automatic radius expansion (default: true)
 * @returns Posts array, loading state, error, refetch function, and tier info
 */
export function useNearbyPosts(
  radiusMeters: number = DEFAULT_RADIUS_METERS,
  enableTieredExpansion: boolean = true
): UseNearbyPostsResult {
  const { latitude, longitude, loading: locationLoading, error: locationError } = useLocation()

  // State
  const [posts, setPosts] = useState<Post[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTier, setActiveTier] = useState<RadiusTier>(
    RADIUS_TIERS.find(t => t.value >= radiusMeters) ?? RADIUS_TIERS[0]
  )
  const [effectiveRadius, setEffectiveRadius] = useState<number>(radiusMeters)

  // Refs
  const isMountedRef = useRef(true)

  /**
   * Fetch posts at a specific radius
   */
  const fetchPostsAtRadius = useCallback(async (radius: number): Promise<Post[]> => {
    // Try RPC first
    const { data, error: rpcError } = await supabase.rpc('get_posts_within_radius', {
      p_lat: latitude!,
      p_lng: longitude!,
      p_radius_meters: radius,
      p_limit: DEFAULT_LIMIT,
    })

    // If RPC succeeds, use the data
    if (!rpcError) {
      return data ?? []
    }

    // If RPC function doesn't exist, use fallback query
    const isFunctionNotFound = rpcError.message.includes('Could not find the function') ||
      rpcError.message.includes('function') && rpcError.message.includes('does not exist')

    if (!isFunctionNotFound) {
      throw new Error(rpcError.message)
    }

    // Fallback: Use regular query with client-side distance filtering
    const latDelta = radius / 111000 // ~111km per degree latitude
    const lngDelta = radius / (111000 * Math.cos((latitude! * Math.PI) / 180))

    const { data: fallbackData, error: fallbackError } = await supabase
      .from('posts')
      .select(`
        *,
        locations!inner (
          id,
          name,
          address,
          latitude,
          longitude,
          google_place_id
        )
      `)
      .eq('is_active', true)
      .gte('expires_at', new Date().toISOString())
      .gte('locations.latitude', latitude! - latDelta)
      .lte('locations.latitude', latitude! + latDelta)
      .gte('locations.longitude', longitude! - lngDelta)
      .lte('locations.longitude', longitude! + lngDelta)
      .order('created_at', { ascending: false })
      .limit(DEFAULT_LIMIT * 2) // Fetch extra to account for filtering

    if (fallbackError) {
      throw new Error(fallbackError.message)
    }

    // Filter by exact distance using Haversine formula
    const filteredPosts = (fallbackData ?? [])
      .filter((post) => {
        const loc = post.locations as { latitude: number; longitude: number } | null
        if (!loc?.latitude || !loc?.longitude) return false
        const distance = haversineDistance(latitude!, longitude!, loc.latitude, loc.longitude)
        return distance <= radius
      })
      .slice(0, DEFAULT_LIMIT)

    return filteredPosts
  }, [latitude, longitude])

  /**
   * Fetch nearby posts with tiered expansion
   */
  const fetchData = useCallback(async () => {
    // Wait for location to be available
    if (locationLoading) {
      return
    }

    // Handle location errors
    if (locationError) {
      if (isMountedRef.current) {
        setError(`Location error: ${locationError}`)
        setIsLoading(false)
      }
      return
    }

    // Validate coordinates
    if (!latitude || !longitude) {
      if (isMountedRef.current) {
        setError('Unable to get current location')
        setIsLoading(false)
      }
      return
    }

    try {
      setError(null)

      // If tiered expansion is disabled, just fetch at the requested radius
      if (!enableTieredExpansion) {
        const posts = await fetchPostsAtRadius(radiusMeters)
        if (isMountedRef.current) {
          setPosts(posts)
          setEffectiveRadius(radiusMeters)
          // Find the tier that matches or exceeds the radius
          const tier = RADIUS_TIERS.find(t => t.value >= radiusMeters) ?? RADIUS_TIERS[RADIUS_TIERS.length - 1]
          setActiveTier(tier)
        }
        return
      }

      // Tiered expansion: progressively expand radius until we have enough posts
      let foundPosts: Post[] = []
      let usedTier = RADIUS_TIERS[0]
      let usedRadius = radiusMeters

      // Start with the tier that matches the requested radius
      const startTierIndex = RADIUS_TIERS.findIndex(t => t.value >= radiusMeters)
      const tiersToTry = startTierIndex >= 0 ? RADIUS_TIERS.slice(startTierIndex) : RADIUS_TIERS

      for (const tier of tiersToTry) {
        // Fetch posts at this tier's radius
        foundPosts = await fetchPostsAtRadius(tier.value)

        usedTier = tier
        usedRadius = tier.value

        // Stop if we have enough posts or this is the last tier
        if (foundPosts.length >= tier.minPosts || tier === RADIUS_TIERS[RADIUS_TIERS.length - 1]) {
          break
        }

        // Otherwise, continue to next tier
      }

      if (isMountedRef.current) {
        setPosts(foundPosts)
        setActiveTier(usedTier)
        setEffectiveRadius(usedRadius)
      }
    } catch (err) {
      if (isMountedRef.current) {
        setError(err instanceof Error ? err.message : 'Failed to fetch nearby posts')
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false)
      }
    }
  }, [latitude, longitude, locationLoading, locationError, radiusMeters, enableTieredExpansion, fetchPostsAtRadius])

  /**
   * Refresh data
   */
  const refetch = useCallback(async () => {
    setIsLoading(true)
    await fetchData()
  }, [fetchData])

  // Fetch data on mount and when dependencies change
  useEffect(() => {
    isMountedRef.current = true

    fetchData()

    return () => {
      isMountedRef.current = false
    }
  }, [fetchData])

  return {
    posts,
    isLoading,
    error,
    refetch,
    activeTier,
    effectiveRadius,
    usingTieredExpansion: enableTieredExpansion,
  }
}

export default useNearbyPosts
