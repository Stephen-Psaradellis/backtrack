/**
 * useTrendingVenues Hook
 *
 * Fetches trending venues based on buzz score (recent activity).
 * Buzz score formula: (posts in last 24h × 3) + (check-ins in last 24h × 2) + (unique visitors in last 7d × 1)
 *
 * Features:
 * - Auto-refreshes every 5 minutes
 * - Uses user's current location for radius-based search
 * - Returns top 5 trending venues by default
 *
 * @example
 * ```tsx
 * function TrendingSection() {
 *   const { venues, isLoading, error, refetch } = useTrendingVenues(latitude, longitude)
 *
 *   if (isLoading) return <LoadingSpinner />
 *   if (error) return <ErrorMessage message={error} />
 *
 *   return <TrendingVenues venues={venues} />
 * }
 * ```
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'

// ============================================================================
// TYPES
// ============================================================================

/**
 * Trending venue data returned from the database
 */
export interface TrendingVenue {
  /** Unique identifier for the location */
  location_id: string
  /** Name of the venue */
  location_name: string
  /** Calculated buzz score (weighted activity metric) */
  buzz_score: number
  /** Number of posts in last 24 hours */
  post_count_24h: number
  /** Number of check-ins in last 24 hours */
  checkin_count_24h: number
  /** Venue latitude */
  latitude: number
  /** Venue longitude */
  longitude: number
}

/**
 * Return value from useTrendingVenues hook
 */
export interface UseTrendingVenuesResult {
  /** List of trending venues sorted by buzz score */
  venues: TrendingVenue[]
  /** Whether the initial fetch is in progress */
  isLoading: boolean
  /** Error message if fetch failed */
  error: string | null
  /** Manually trigger a refresh */
  refetch: () => Promise<void>
}

// ============================================================================
// CONSTANTS
// ============================================================================

/** Default search radius in meters (25km for city-wide discovery) */
const DEFAULT_RADIUS_METERS = 25000

/** Default number of venues to return */
const DEFAULT_VENUE_LIMIT = 5

/** Auto-refresh interval in milliseconds (5 minutes) */
const REFRESH_INTERVAL_MS = 5 * 60 * 1000

// ============================================================================
// HOOK IMPLEMENTATION
// ============================================================================

/**
 * Hook for fetching trending venues based on buzz score
 *
 * @param userLatitude - User's current latitude
 * @param userLongitude - User's current longitude
 * @param radiusMeters - Search radius in meters (default: 25km)
 * @param venueLimit - Maximum number of venues to return (default: 5)
 */
export function useTrendingVenues(
  userLatitude: number | null,
  userLongitude: number | null,
  radiusMeters: number = DEFAULT_RADIUS_METERS,
  venueLimit: number = DEFAULT_VENUE_LIMIT
): UseTrendingVenuesResult {
  // State
  const [venues, setVenues] = useState<TrendingVenue[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Refs
  const isMountedRef = useRef(true)
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null)

  /**
   * Fetch trending venues from the database
   */
  const fetchTrendingVenues = useCallback(async () => {
    // Skip if no location available
    if (userLatitude === null || userLongitude === null) {
      if (isMountedRef.current) {
        setVenues([])
        setIsLoading(false)
        setError('Location not available')
      }
      return
    }

    try {
      setError(null)

      const { data, error: rpcError } = await supabase.rpc('get_trending_venues', {
        user_lat: userLatitude,
        user_lng: userLongitude,
        radius_m: radiusMeters,
        venue_limit: venueLimit,
      })

      if (rpcError) {
        if (isMountedRef.current) {
          setError(rpcError.message)
          setVenues([])
        }
        return
      }

      if (isMountedRef.current) {
        // Transform data to match TrendingVenue interface
        const trendingVenues: TrendingVenue[] = (data || []).map((venue: any) => ({
          location_id: venue.location_id,
          location_name: venue.location_name,
          buzz_score: venue.buzz_score,
          post_count_24h: venue.post_count_24h,
          checkin_count_24h: venue.checkin_count_24h,
          latitude: venue.latitude,
          longitude: venue.longitude,
        }))
        setVenues(trendingVenues)
      }
    } catch (err) {
      if (isMountedRef.current) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch trending venues'
        setError(errorMessage)
        setVenues([])
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false)
      }
    }
  }, [userLatitude, userLongitude, radiusMeters, venueLimit])

  /**
   * Manually trigger a refresh
   */
  const refetch = useCallback(async () => {
    setIsLoading(true)
    await fetchTrendingVenues()
  }, [fetchTrendingVenues])

  // Initial fetch and auto-refresh
  useEffect(() => {
    isMountedRef.current = true

    // Initial fetch
    fetchTrendingVenues()

    // Set up auto-refresh every 5 minutes
    refreshTimerRef.current = setInterval(() => {
      fetchTrendingVenues()
    }, REFRESH_INTERVAL_MS)

    return () => {
      isMountedRef.current = false
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current)
      }
    }
  }, [fetchTrendingVenues])

  return {
    venues,
    isLoading,
    error,
    refetch,
  }
}
