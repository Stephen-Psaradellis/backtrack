/**
 * React hook for location search with debouncing and state management.
 *
 * This hook provides a convenient way to search for venues using Google Places
 * API and local Supabase cache with proper debouncing, loading states,
 * error handling, and GPS permission management via expo-location.
 *
 * @module hooks/useLocationSearch
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import * as Location from 'expo-location'
import NetInfo from '@react-native-community/netinfo'
import { supabase } from '../lib/supabase'
import {
  searchVenues,
  LOCATION_SERVICE_ERRORS,
} from '../services/locationService'
import type { Venue, VenueCategory, GoogleLatLng } from '../types/location'
import { LOCATION_CONSTANTS, VENUE_TYPE_FILTERS } from '../types/location'

// ============================================================================
// Constants
// ============================================================================

/** Default debounce delay in milliseconds for search input */
const DEFAULT_DEBOUNCE_MS = 300

/** Minimum query length to trigger search */
const MIN_QUERY_LENGTH = LOCATION_CONSTANTS.MIN_QUERY_LENGTH

// ============================================================================
// Types
// ============================================================================

/**
 * Permission status for GPS location services
 */
export type LocationPermissionStatus =
  | 'undetermined'
  | 'granted'
  | 'denied'
  | 'restricted'

/**
 * Options for the useLocationSearch hook
 */
export interface UseLocationSearchOptions {
  /** Debounce delay in milliseconds for search input (default: 300ms) */
  debounceMs?: number
  /** User's current location for location-biased search (overrides GPS if provided) */
  userLocation?: GoogleLatLng | null
  /** Whether the device is offline (skip Google Places API) */
  isOffline?: boolean
  /** Search radius in meters (default: 5000 = 5km) */
  radiusMeters?: number
  /** Maximum number of results to return (default: 20) */
  maxResults?: number
  /** Initial venue type filters to apply */
  initialFilters?: VenueCategory[]
  /** Whether to automatically request GPS location on mount (default: false) */
  enableGpsOnMount?: boolean
  /** Whether to use high accuracy GPS (default: true) */
  highAccuracy?: boolean
}

/**
 * Result type for useLocationSearch hook
 */
export interface UseLocationSearchResult {
  /** Current search query */
  query: string
  /** Set the search query (triggers debounced search) */
  setQuery: (query: string) => void
  /** Search results */
  results: Venue[]
  /** Whether search is in progress */
  isLoading: boolean
  /** Error message if search failed */
  error: string | null
  /** Whether results are from offline cache only */
  isOffline: boolean
  /** Active venue type filters */
  activeFilters: VenueCategory[]
  /** Toggle a venue type filter on/off */
  toggleFilter: (category: VenueCategory) => void
  /** Clear all active filters */
  clearFilters: () => void
  /** Clear search query and results */
  clearSearch: () => void
  /** Manually trigger a search with current query */
  refetch: () => Promise<void>
  /** Timestamp of last successful search */
  lastSearchedAt: number | null
  /** Current GPS location permission status */
  locationPermissionStatus: LocationPermissionStatus
  /** GPS coordinates from device (null if not available or permission denied) */
  gpsLocation: GoogleLatLng | null
  /** Whether GPS location is currently being fetched */
  isGpsLoading: boolean
  /** Error message from GPS location fetch (if any) */
  gpsError: string | null
  /** Manually request GPS permission and fetch location */
  requestGpsLocation: () => Promise<GoogleLatLng | null>
  /** Check if location services are enabled on device */
  checkLocationServices: () => Promise<boolean>
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get Google Places type strings for a venue category
 *
 * @param category - Venue category to get types for
 * @returns Array of Google Places type strings
 */
function getGoogleTypesForCategory(category: VenueCategory): string[] {
  const filter = VENUE_TYPE_FILTERS.find(f => f.category === category)
  return filter?.google_types ?? []
}

/**
 * Get all Google Places type strings for multiple categories
 *
 * @param categories - Array of venue categories
 * @returns Combined array of unique Google Places type strings
 */
function getGoogleTypesForCategories(categories: VenueCategory[]): string[] {
  const allTypes = new Set<string>()
  for (const category of categories) {
    for (const type of getGoogleTypesForCategory(category)) {
      allTypes.add(type)
    }
  }
  return Array.from(allTypes)
}

/**
 * Maps expo-location permission status to our LocationPermissionStatus type
 *
 * @param status - Permission status from expo-location
 * @returns Mapped LocationPermissionStatus
 */
function mapPermissionStatus(
  status: Location.PermissionStatus
): LocationPermissionStatus {
  switch (status) {
    case Location.PermissionStatus.GRANTED:
      return 'granted'
    case Location.PermissionStatus.DENIED:
      return 'denied'
    case Location.PermissionStatus.UNDETERMINED:
      return 'undetermined'
    default:
      return 'restricted'
  }
}

/**
 * GPS error messages for location failures
 */
const GPS_ERROR_MESSAGES = {
  PERMISSION_DENIED:
    'Location permission denied. Please enable location access in your device settings.',
  SERVICES_DISABLED:
    'Location services are disabled. Please enable location services in your device settings.',
  TIMEOUT: 'Location request timed out. Please try again.',
  UNAVAILABLE:
    'Unable to get current location. Please check your connection and try again.',
  UNKNOWN: 'An unknown error occurred while fetching location.',
} as const

/**
 * Check if the device has an active network connection using NetInfo.
 * This is a one-time check, not a subscription.
 *
 * @returns Promise resolving to true if connected to network
 */
async function checkNetworkConnection(): Promise<boolean> {
  try {
    const state = await NetInfo.fetch()
    return state.isConnected ?? false
  } catch {
    // If NetInfo fails, assume connected and let the API call determine status
    return true
  }
}

// ============================================================================
// Hook Implementation
// ============================================================================

/**
 * React hook for location search with debouncing and GPS integration.
 *
 * Features:
 * - Automatic debouncing (300ms default) to prevent excessive API calls
 * - Loading and error states
 * - Venue type filtering
 * - Hybrid search (Google Places + Supabase cache)
 * - Offline mode support
 * - Manual refetch capability
 * - GPS permission handling via expo-location
 * - Automatic or manual GPS location fetching
 *
 * @param options - Configuration options for the hook
 * @returns Object containing search state, results, GPS state, and control functions
 *
 * @example
 * // Basic usage
 * const {
 *   query,
 *   setQuery,
 *   results,
 *   isLoading,
 *   error,
 * } = useLocationSearch()
 *
 * // With location bias
 * const { results } = useLocationSearch({
 *   userLocation: { latitude: 37.7749, longitude: -122.4194 },
 * })
 *
 * @example
 * // With GPS auto-fetch on mount
 * const {
 *   results,
 *   gpsLocation,
 *   locationPermissionStatus,
 *   requestGpsLocation,
 * } = useLocationSearch({
 *   enableGpsOnMount: true,
 * })
 *
 * @example
 * // With filters and custom debounce
 * const {
 *   results,
 *   activeFilters,
 *   toggleFilter,
 * } = useLocationSearch({
 *   debounceMs: 500,
 *   initialFilters: ['cafe'],
 * })
 */
export function useLocationSearch(
  options: UseLocationSearchOptions = {}
): UseLocationSearchResult {
  const {
    debounceMs = DEFAULT_DEBOUNCE_MS,
    userLocation = null,
    isOffline: isOfflineProp = false,
    radiusMeters = LOCATION_CONSTANTS.DEFAULT_RADIUS_METERS,
    maxResults = LOCATION_CONSTANTS.MAX_SEARCH_RESULTS,
    initialFilters = [],
    enableGpsOnMount = false,
    highAccuracy = true,
  } = options

  // Search state
  const [query, setQueryState] = useState('')
  const [results, setResults] = useState<Venue[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isOffline, setIsOffline] = useState(isOfflineProp)
  const [activeFilters, setActiveFilters] = useState<VenueCategory[]>(initialFilters)
  const [lastSearchedAt, setLastSearchedAt] = useState<number | null>(null)

  // GPS state
  const [gpsLocation, setGpsLocation] = useState<GoogleLatLng | null>(null)
  const [isGpsLoading, setIsGpsLoading] = useState(false)
  const [gpsError, setGpsError] = useState<string | null>(null)
  const [locationPermissionStatus, setLocationPermissionStatus] =
    useState<LocationPermissionStatus>('undetermined')

  // Refs for cleanup and debouncing
  const abortControllerRef = useRef<AbortController | null>(null)
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const supabaseRef = useRef(supabase)
  const isMountedRef = useRef(true)

  // Memoize effective location: prefer userLocation prop, fall back to GPS
  const memoizedLocation = useMemo(() => {
    // Prefer explicitly provided location
    if (userLocation) {
      return {
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
      }
    }
    // Fall back to GPS location
    if (gpsLocation) {
      return {
        latitude: gpsLocation.latitude,
        longitude: gpsLocation.longitude,
      }
    }
    return null
  }, [userLocation?.latitude, userLocation?.longitude, gpsLocation?.latitude, gpsLocation?.longitude])

  // Update isOffline when prop changes
  useEffect(() => {
    setIsOffline(isOfflineProp)
  }, [isOfflineProp])

  /**
   * Core search function that calls the location service
   */
  const executeSearch = useCallback(async (searchQuery: string) => {
    // Don't search if query is too short
    if (!searchQuery || searchQuery.trim().length < MIN_QUERY_LENGTH) {
      setResults([])
      setError(null)
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
      // Check network connectivity before making API calls
      const isNetworkConnected = await checkNetworkConnection()
      const effectiveOfflineMode = isOffline || !isNetworkConnected

      // Update offline state if network check determined we're offline
      if (!isNetworkConnected && !isOffline) {
        setIsOffline(true)
      }

      // Get place types from active filters
      const placeTypes = getGoogleTypesForCategories(activeFilters)

      // Build search params
      const searchParams = {
        query: searchQuery.trim(),
        latitude: memoizedLocation?.latitude,
        longitude: memoizedLocation?.longitude,
        radius_meters: radiusMeters,
        max_results: maxResults,
        place_types: placeTypes.length > 0 ? placeTypes : undefined,
      }

      // Execute hybrid search with detected offline status
      const searchResult = await searchVenues(
        supabaseRef.current,
        searchParams,
        effectiveOfflineMode
      )

      // Only update state if this request wasn't aborted
      if (!abortControllerRef.current?.signal.aborted) {
        setResults(searchResult.combined_results)
        setIsOffline(searchResult.is_offline)
        setLastSearchedAt(Date.now())
      }
    } catch (err) {
      // Don't update state if request was aborted
      if (abortControllerRef.current?.signal.aborted) {
        return
      }

      const errorMessage = err instanceof Error
        ? err.message
        : LOCATION_SERVICE_ERRORS.UNKNOWN_ERROR

      setError(errorMessage)
      setResults([])
    } finally {
      if (!abortControllerRef.current?.signal.aborted) {
        setIsLoading(false)
      }
    }
  }, [memoizedLocation, radiusMeters, maxResults, isOffline, activeFilters])

  /**
   * Debounced search handler - waits for input to settle before searching
   */
  const debouncedSearch = useCallback((searchQuery: string) => {
    // Clear any pending debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    // If query is too short, clear results immediately
    if (!searchQuery || searchQuery.trim().length < MIN_QUERY_LENGTH) {
      setResults([])
      setError(null)
      setIsLoading(false)
      return
    }

    // Set loading state immediately for responsive UI
    setIsLoading(true)

    // Set a new debounce timer
    debounceTimerRef.current = setTimeout(() => {
      executeSearch(searchQuery)
    }, debounceMs)
  }, [executeSearch, debounceMs])

  /**
   * Set query and trigger debounced search
   */
  const setQuery = useCallback((newQuery: string) => {
    setQueryState(newQuery)
    debouncedSearch(newQuery)
  }, [debouncedSearch])

  /**
   * Manual refetch function - bypasses debouncing
   */
  const refetch = useCallback(async () => {
    // Clear any pending debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }
    await executeSearch(query)
  }, [executeSearch, query])

  /**
   * Toggle a venue type filter on/off
   */
  const toggleFilter = useCallback((category: VenueCategory) => {
    setActiveFilters(prev => {
      if (prev.includes(category)) {
        return prev.filter(c => c !== category)
      }
      return [...prev, category]
    })
  }, [])

  /**
   * Clear all active filters
   */
  const clearFilters = useCallback(() => {
    setActiveFilters([])
  }, [])

  // ===========================================================================
  // GPS Location Functions
  // ===========================================================================

  /**
   * Check if location services are enabled on the device
   */
  const checkLocationServices = useCallback(async (): Promise<boolean> => {
    try {
      const enabled = await Location.hasServicesEnabledAsync()
      return enabled
    } catch {
      return false
    }
  }, [])

  /**
   * Request GPS permission and fetch current location
   *
   * @returns GPS coordinates or null if permission denied or unavailable
   */
  const requestGpsLocation = useCallback(async (): Promise<GoogleLatLng | null> => {
    if (!isMountedRef.current) return null

    setIsGpsLoading(true)
    setGpsError(null)

    try {
      // Check if location services are enabled first
      const servicesEnabled = await checkLocationServices()
      if (!servicesEnabled) {
        if (!isMountedRef.current) return null
        setLocationPermissionStatus('restricted')
        setGpsError(GPS_ERROR_MESSAGES.SERVICES_DISABLED)
        setIsGpsLoading(false)
        return null
      }

      // Request foreground permission
      const { status } = await Location.requestForegroundPermissionsAsync()
      const mappedStatus = mapPermissionStatus(status)

      if (!isMountedRef.current) return null
      setLocationPermissionStatus(mappedStatus)

      if (status !== Location.PermissionStatus.GRANTED) {
        setGpsError(GPS_ERROR_MESSAGES.PERMISSION_DENIED)
        setIsGpsLoading(false)
        return null
      }

      // Get current position
      const position = await Location.getCurrentPositionAsync({
        accuracy: highAccuracy
          ? Location.Accuracy.High
          : Location.Accuracy.Balanced,
      })

      if (!isMountedRef.current) return null

      const location: GoogleLatLng = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      }

      setGpsLocation(location)
      setGpsError(null)
      setIsGpsLoading(false)

      return location
    } catch (err) {
      if (!isMountedRef.current) return null

      const errorMessage =
        err instanceof Error
          ? err.message.includes('timeout')
            ? GPS_ERROR_MESSAGES.TIMEOUT
            : GPS_ERROR_MESSAGES.UNAVAILABLE
          : GPS_ERROR_MESSAGES.UNKNOWN

      setGpsError(errorMessage)
      setIsGpsLoading(false)
      return null
    }
  }, [checkLocationServices, highAccuracy])

  /**
   * Clear search query and results
   */
  const clearSearch = useCallback(() => {
    // Clear pending debounce
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }
    // Cancel in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    setQueryState('')
    setResults([])
    setError(null)
    setIsLoading(false)
  }, [])

  // Effect: Re-run search when filters change (if query exists)
  useEffect(() => {
    if (query && query.trim().length >= MIN_QUERY_LENGTH) {
      debouncedSearch(query)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFilters])

  // Effect: Re-run search when location changes (if query exists)
  useEffect(() => {
    if (query && query.trim().length >= MIN_QUERY_LENGTH && memoizedLocation) {
      debouncedSearch(query)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [memoizedLocation])

  // Effect: Auto-fetch GPS location on mount if enabled
  useEffect(() => {
    isMountedRef.current = true

    if (enableGpsOnMount && !userLocation) {
      requestGpsLocation()
    }

    // Cleanup on unmount
    return () => {
      isMountedRef.current = false
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
    // Only run on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return {
    // Search state
    query,
    setQuery,
    results,
    isLoading,
    error,
    isOffline,
    activeFilters,
    toggleFilter,
    clearFilters,
    clearSearch,
    refetch,
    lastSearchedAt,
    // GPS state and functions
    locationPermissionStatus,
    gpsLocation,
    isGpsLoading,
    gpsError,
    requestGpsLocation,
    checkLocationServices,
  }
}

export default useLocationSearch
