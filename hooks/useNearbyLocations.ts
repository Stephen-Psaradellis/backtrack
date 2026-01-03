/**
 * React hook for fetching nearby locations using PostGIS geospatial queries.
 *
 * This hook provides a convenient way to fetch locations near a given coordinate
 * with automatic loading states, error handling, and debouncing for map pan events.
 *
 * @module hooks/useNearbyLocations
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import {
  fetchNearbyLocations,
  fetchLocationsWithActivePosts,
  fetchRecentlyVisitedLocations,
  DEFAULT_RADIUS_METERS,
  GeoError,
  isValidCoordinates,
} from '../lib/utils/geo'
import type {
  Coordinates,
  LocationWithDistance,
  LocationWithActivePosts,
  LocationWithVisit,
} from '../types/database'

// ============================================================================
// Constants
// ============================================================================

/** Default debounce delay in milliseconds for coordinate updates */
const DEFAULT_DEBOUNCE_MS = 300

// ============================================================================
// Types
// ============================================================================

/**
 * Options for the useNearbyLocations hook
 */
export interface UseNearbyLocationsOptions {
  /** Search radius in meters (default: 5000 = 5km) */
  radiusMeters?: number
  /** Maximum number of results to return (default: 50) */
  maxResults?: number
  /** Debounce delay in milliseconds for coordinate updates (default: 300ms) */
  debounceMs?: number
  /** Whether to fetch automatically when coordinates change (default: true) */
  enabled?: boolean
  /** Only fetch locations with active posts (default: false) */
  withActivePosts?: boolean
  /** Minimum post count when withActivePosts is true (default: 1) */
  minPostCount?: number
}

/**
 * Result type for locations without active posts filter
 */
export interface UseNearbyLocationsResult<T = LocationWithDistance> {
  /** Array of nearby locations with distance information */
  locations: T[]
  /** Whether a fetch is currently in progress */
  isLoading: boolean
  /** Error object if the fetch failed */
  error: GeoError | null
  /** Function to manually trigger a refetch */
  refetch: () => Promise<void>
  /** Timestamp of the last successful fetch */
  lastFetchedAt: number | null
}

// ============================================================================
// Hook Implementation
// ============================================================================

/**
 * React hook for fetching nearby locations with geospatial queries.
 *
 * Features:
 * - Automatic fetching when coordinates change
 * - Debouncing for map pan events to prevent excessive API calls
 * - Loading and error states
 * - Manual refetch capability
 * - Support for filtering by active posts
 *
 * @param coordinates - User's current coordinates, or null if not available
 * @param options - Configuration options for the hook
 * @returns Object containing locations, loading state, error, and refetch function
 *
 * @example
 * // Basic usage
 * const { locations, isLoading, error } = useNearbyLocations({
 *   latitude: 37.7749,
 *   longitude: -122.4194
 * })
 *
 * @example
 * // With custom radius and active posts filter
 * const { locations, refetch } = useNearbyLocations(
 *   { latitude: 37.7749, longitude: -122.4194 },
 *   { radiusMeters: 10000, withActivePosts: true, minPostCount: 2 }
 * )
 */
export function useNearbyLocations(
  coordinates: Coordinates | null,
  options: UseNearbyLocationsOptions & { withActivePosts: true }
): UseNearbyLocationsResult<LocationWithActivePosts>

export function useNearbyLocations(
  coordinates: Coordinates | null,
  options?: UseNearbyLocationsOptions & { withActivePosts?: false }
): UseNearbyLocationsResult<LocationWithDistance>

export function useNearbyLocations(
  coordinates: Coordinates | null,
  options: UseNearbyLocationsOptions = {}
): UseNearbyLocationsResult<LocationWithDistance | LocationWithActivePosts> {
  const {
    radiusMeters = DEFAULT_RADIUS_METERS,
    maxResults = 50,
    debounceMs = DEFAULT_DEBOUNCE_MS,
    enabled = true,
    withActivePosts = false,
    minPostCount = 1,
  } = options

  // State
  const [locations, setLocations] = useState<
    (LocationWithDistance | LocationWithActivePosts)[]
  >([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<GeoError | null>(null)
  const [lastFetchedAt, setLastFetchedAt] = useState<number | null>(null)

  // Refs for cleanup and debouncing
  const abortControllerRef = useRef<AbortController | null>(null)
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const supabaseRef = useRef(supabase)

  // Memoize the coordinate values to prevent unnecessary effect triggers
  const memoizedCoordinates = useMemo(() => {
    if (!coordinates) return null
    if (!isValidCoordinates(coordinates)) return null
    return {
      latitude: coordinates.latitude,
      longitude: coordinates.longitude,
    }
  }, [coordinates?.latitude, coordinates?.longitude])

  /**
   * Core fetch function that calls the geospatial API
   */
  const fetchLocations = useCallback(async () => {
    if (!memoizedCoordinates) {
      setLocations([])
      return
    }

    // Cancel any in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    abortControllerRef.current = new AbortController()

    setIsLoading(true)
    setError(null)

    try {
      const params = {
        user_lat: memoizedCoordinates.latitude,
        user_lon: memoizedCoordinates.longitude,
        radius_meters: radiusMeters,
        max_results: maxResults,
      }

      let result: (LocationWithDistance | LocationWithActivePosts)[]

      if (withActivePosts) {
        result = await fetchLocationsWithActivePosts(supabaseRef.current, {
          ...params,
          min_post_count: minPostCount,
        })
      } else {
        result = await fetchNearbyLocations(supabaseRef.current, params)
      }

      // Only update state if this request wasn't aborted
      if (!abortControllerRef.current?.signal.aborted) {
        setLocations(result)
        setLastFetchedAt(Date.now())
      }
    } catch (err) {
      // Don't update state if request was aborted
      if (abortControllerRef.current?.signal.aborted) {
        return
      }

      if (err instanceof GeoError) {
        setError(err)
      } else {
        setError(
          new GeoError(
            'NETWORK_ERROR',
            err instanceof Error ? err.message : 'An unknown error occurred',
            err
          )
        )
      }
      setLocations([])
    } finally {
      if (!abortControllerRef.current?.signal.aborted) {
        setIsLoading(false)
      }
    }
  }, [
    memoizedCoordinates,
    radiusMeters,
    maxResults,
    withActivePosts,
    minPostCount,
  ])

  /**
   * Debounced fetch handler - waits for coordinate changes to settle
   * before triggering a fetch (useful for map pan events)
   */
  const debouncedFetch = useCallback(() => {
    // Clear any pending debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    // Set a new debounce timer
    debounceTimerRef.current = setTimeout(() => {
      fetchLocations()
    }, debounceMs)
  }, [fetchLocations, debounceMs])

  /**
   * Manual refetch function - bypasses debouncing
   */
  const refetch = useCallback(async () => {
    // Clear any pending debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }
    await fetchLocations()
  }, [fetchLocations])

  // Effect: Fetch when coordinates or options change (debounced)
  useEffect(() => {
    if (!enabled) {
      return
    }

    if (!memoizedCoordinates) {
      setLocations([])
      setError(null)
      return
    }

    debouncedFetch()

    // Cleanup: cancel debounce timer and abort any in-flight request
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [memoizedCoordinates, enabled, debouncedFetch])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  return {
    locations,
    isLoading,
    error,
    refetch,
    lastFetchedAt,
  }
}

// ============================================================================
// useVisitedLocations Hook
// ============================================================================

/**
 * Options for the useVisitedLocations hook
 */
export interface UseVisitedLocationsOptions {
  /** Maximum number of results to return (default: 50) */
  maxResults?: number
  /** Whether to fetch automatically on mount (default: true) */
  enabled?: boolean
}

/**
 * Result type for useVisitedLocations hook
 */
export interface UseVisitedLocationsResult {
  /** Array of recently visited locations with visit timestamps */
  locations: LocationWithVisit[]
  /** Whether a fetch is currently in progress */
  isLoading: boolean
  /** Error object if the fetch failed */
  error: GeoError | null
  /** Function to manually trigger a refetch */
  refetch: () => Promise<void>
  /** Timestamp of the last successful fetch */
  lastFetchedAt: number | null
}

/**
 * React hook for fetching locations the user has recently visited.
 *
 * This hook is designed for the post creation flow, returning only locations
 * that the user has physically visited within the last 3 hours.
 *
 * Features:
 * - Automatic fetching on mount (unless disabled)
 * - Loading and error states
 * - Manual refetch capability
 * - Uses server-side auth.uid() for user identification
 *
 * @param options - Configuration options for the hook
 * @returns Object containing visited locations, loading state, error, and refetch function
 *
 * @example
 * // Basic usage in CreatePost flow
 * const { locations, isLoading, error } = useVisitedLocations()
 *
 * if (isLoading) return <LoadingSpinner />
 * if (error) return <ErrorMessage error={error} />
 * if (locations.length === 0) return <EmptyState message="Visit a location first" />
 *
 * return <LocationPicker locations={locations} />
 *
 * @example
 * // With custom options
 * const { locations, refetch } = useVisitedLocations({
 *   maxResults: 10,
 *   enabled: isAuthenticated
 * })
 *
 * @see {@link fetchRecentlyVisitedLocations} The underlying fetch function
 * @see {@link useNearbyLocations} Similar hook for proximity-based queries
 */
export function useVisitedLocations(
  options: UseVisitedLocationsOptions = {}
): UseVisitedLocationsResult {
  const { maxResults = 50, enabled = true } = options

  // State
  const [locations, setLocations] = useState<LocationWithVisit[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<GeoError | null>(null)
  const [lastFetchedAt, setLastFetchedAt] = useState<number | null>(null)

  // Refs for cleanup
  const abortControllerRef = useRef<AbortController | null>(null)
  const supabaseRef = useRef(supabase)

  /**
   * Core fetch function that calls the geospatial API
   */
  const fetchLocations = useCallback(async () => {
    // Cancel any in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    abortControllerRef.current = new AbortController()

    setIsLoading(true)
    setError(null)

    try {
      const result = await fetchRecentlyVisitedLocations(supabaseRef.current, {
        max_results: maxResults,
      })

      // Only update state if this request wasn't aborted
      if (!abortControllerRef.current?.signal.aborted) {
        setLocations(result)
        setLastFetchedAt(Date.now())
      }
    } catch (err) {
      // Don't update state if request was aborted
      if (abortControllerRef.current?.signal.aborted) {
        return
      }

      if (err instanceof GeoError) {
        setError(err)
      } else {
        setError(
          new GeoError(
            'NETWORK_ERROR',
            err instanceof Error ? err.message : 'An unknown error occurred',
            err
          )
        )
      }
      setLocations([])
    } finally {
      if (!abortControllerRef.current?.signal.aborted) {
        setIsLoading(false)
      }
    }
  }, [maxResults])

  /**
   * Manual refetch function
   */
  const refetch = useCallback(async () => {
    await fetchLocations()
  }, [fetchLocations])

  // Effect: Fetch on mount when enabled
  useEffect(() => {
    if (!enabled) {
      return
    }

    fetchLocations()

    // Cleanup: abort any in-flight request
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [enabled, fetchLocations])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  return {
    locations,
    isLoading,
    error,
    refetch,
    lastFetchedAt,
  }
}

export default useNearbyLocations
