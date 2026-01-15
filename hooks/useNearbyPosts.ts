/**
 * useNearbyPosts Hook
 *
 * Custom hook for fetching posts within a specified radius of the user's location.
 * Uses PostGIS geospatial queries via Supabase RPC.
 *
 * @example
 * ```tsx
 * function NearbyFeed() {
 *   const { posts, isLoading, error, refetch } = useNearbyPosts(100) // 100 meters
 *
 *   if (isLoading) return <LoadingSpinner />
 *   if (error) return <Text>{error}</Text>
 *
 *   return (
 *     <FlatList
 *       data={posts}
 *       renderItem={({ item }) => <PostCard post={item} />}
 *     />
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
}

// ============================================================================
// CONSTANTS
// ============================================================================

/** Default search radius in meters */
const DEFAULT_RADIUS_METERS = 50

/** Maximum number of posts to fetch */
const DEFAULT_LIMIT = 50

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
 *
 * @param radiusMeters - Search radius in meters (default: 50)
 * @returns Posts array, loading state, error, and refetch function
 */
export function useNearbyPosts(
  radiusMeters: number = DEFAULT_RADIUS_METERS
): UseNearbyPostsResult {
  const { latitude, longitude, loading: locationLoading, error: locationError } = useLocation()

  // State
  const [posts, setPosts] = useState<Post[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Refs
  const isMountedRef = useRef(true)

  /**
   * Fetch nearby posts from the database
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

      // Try RPC first
      const { data, error: rpcError } = await supabase.rpc('get_posts_within_radius', {
        p_lat: latitude,
        p_lng: longitude,
        p_radius_meters: radiusMeters,
        p_limit: DEFAULT_LIMIT,
      })

      // If RPC succeeds, use the data
      if (!rpcError) {
        if (isMountedRef.current) {
          setPosts(data ?? [])
        }
        return
      }

      // If RPC function doesn't exist, use fallback query
      const isFunctionNotFound = rpcError.message.includes('Could not find the function') ||
        rpcError.message.includes('function') && rpcError.message.includes('does not exist')

      if (!isFunctionNotFound) {
        // Some other RPC error - report it
        if (isMountedRef.current) {
          setError(rpcError.message)
        }
        return
      }

      // Fallback: Use regular query with client-side distance filtering
      // Calculate bounding box for initial filter (rough approximation)
      const latDelta = radiusMeters / 111000 // ~111km per degree latitude
      const lngDelta = radiusMeters / (111000 * Math.cos((latitude * Math.PI) / 180))

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
        .gte('locations.latitude', latitude - latDelta)
        .lte('locations.latitude', latitude + latDelta)
        .gte('locations.longitude', longitude - lngDelta)
        .lte('locations.longitude', longitude + lngDelta)
        .order('created_at', { ascending: false })
        .limit(DEFAULT_LIMIT * 2) // Fetch extra to account for filtering

      if (fallbackError) {
        if (isMountedRef.current) {
          setError(fallbackError.message)
        }
        return
      }

      // Filter by exact distance using Haversine formula
      const filteredPosts = (fallbackData ?? [])
        .filter((post) => {
          const loc = post.locations as { latitude: number; longitude: number } | null
          if (!loc?.latitude || !loc?.longitude) return false
          const distance = haversineDistance(latitude, longitude, loc.latitude, loc.longitude)
          return distance <= radiusMeters
        })
        .slice(0, DEFAULT_LIMIT)

      if (isMountedRef.current) {
        setPosts(filteredPosts)
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
  }, [latitude, longitude, locationLoading, locationError, radiusMeters])

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
  }
}

export default useNearbyPosts
