/**
 * useLocation Hook
 *
 * Custom hook for managing device location services in the Love Ledger app.
 * Handles permission requests, location fetching, and error states.
 *
 * Features:
 * - Foreground location permission handling
 * - One-time location fetch
 * - Continuous location watching
 * - Comprehensive error handling
 * - Retry functionality
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { location, loading, error, refresh } = useLocation()
 *
 *   if (loading) return <LoadingSpinner message="Getting location..." />
 *   if (error) return <Text>Error: {error}</Text>
 *
 *   return <Text>Lat: {location.latitude}, Lng: {location.longitude}</Text>
 * }
 * ```
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import * as Location from 'expo-location'

import type { LocationState, Coordinates } from '../lib/types'

// ============================================================================
// TYPES
// ============================================================================

/**
 * Permission status for location services
 */
export type LocationPermissionStatus =
  | 'undetermined'
  | 'granted'
  | 'denied'
  | 'restricted'

/**
 * Extended location state with additional metadata
 */
export interface ExtendedLocationState extends LocationState {
  /** Current permission status */
  permissionStatus: LocationPermissionStatus
  /** Timestamp when location was last updated */
  timestamp: number | null
  /** Accuracy of the location in meters */
  accuracy: number | null
  /** Altitude in meters (if available) */
  altitude: number | null
  /** Heading/bearing in degrees (if available) */
  heading: number | null
  /** Speed in m/s (if available) */
  speed: number | null
}

/**
 * Options for the useLocation hook
 */
export interface UseLocationOptions {
  /** Whether to start watching immediately (default: true) */
  enableOnMount?: boolean
  /** Whether to use high accuracy (default: true) */
  highAccuracy?: boolean
  /** Time interval for location updates in ms (default: 10000 - 10 seconds) */
  timeInterval?: number
  /** Distance interval for location updates in meters (default: 100) */
  distanceInterval?: number
  /** Whether to enable background updates (default: false) */
  enableBackground?: boolean
}

/**
 * Return value from useLocation hook
 */
export interface UseLocationResult extends ExtendedLocationState {
  /** Manually refresh location */
  refresh: () => Promise<void>
  /** Start watching location updates */
  startWatching: () => Promise<void>
  /** Stop watching location updates */
  stopWatching: () => void
  /** Request permissions manually */
  requestPermission: () => Promise<boolean>
  /** Check if location services are enabled */
  checkLocationServices: () => Promise<boolean>
  /** Whether currently watching location */
  isWatching: boolean
}

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Default options for location hook
 */
const DEFAULT_OPTIONS: Required<UseLocationOptions> = {
  enableOnMount: true,
  highAccuracy: true,
  timeInterval: 10000, // 10 seconds
  distanceInterval: 100, // 100 meters
  enableBackground: false,
}

/**
 * Initial location state
 */
const INITIAL_STATE: ExtendedLocationState = {
  latitude: 0,
  longitude: 0,
  loading: true,
  error: null,
  permissionStatus: 'undetermined',
  timestamp: null,
  accuracy: null,
  altitude: null,
  heading: null,
  speed: null,
}

/**
 * Error messages for location failures
 */
const ERROR_MESSAGES = {
  PERMISSION_DENIED: 'Location permission denied. Please enable location access in your device settings.',
  SERVICES_DISABLED: 'Location services are disabled. Please enable location services in your device settings.',
  TIMEOUT: 'Location request timed out. Please try again.',
  UNAVAILABLE: 'Unable to get current location. Please check your connection and try again.',
  UNKNOWN: 'An unknown error occurred while fetching location.',
} as const

// ============================================================================
// HOOK
// ============================================================================

/**
 * useLocation - Custom hook for device location services
 *
 * @param options - Configuration options for location behavior
 * @returns Location state and control functions
 *
 * @example
 * // Basic usage - fetches location on mount
 * const { latitude, longitude, loading, error } = useLocation()
 *
 * @example
 * // With options
 * const location = useLocation({
 *   highAccuracy: false,
 *   enableOnMount: false,
 * })
 *
 * // Manually trigger location fetch
 * await location.refresh()
 *
 * @example
 * // Watch location continuously
 * const { startWatching, stopWatching, isWatching } = useLocation({
 *   enableOnMount: false,
 * })
 *
 * // Start watching when needed
 * await startWatching()
 *
 * // Stop when done
 * stopWatching()
 */
export function useLocation(options: UseLocationOptions = {}): UseLocationResult {
  // Merge options with defaults
  const config = { ...DEFAULT_OPTIONS, ...options }

  // ---------------------------------------------------------------------------
  // STATE
  // ---------------------------------------------------------------------------

  const [state, setState] = useState<ExtendedLocationState>(INITIAL_STATE)
  const [isWatching, setIsWatching] = useState(false)

  // Ref to store the location subscription
  const watchSubscriptionRef = useRef<Location.LocationSubscription | null>(null)

  // ---------------------------------------------------------------------------
  // HELPER FUNCTIONS
  // ---------------------------------------------------------------------------

  /**
   * Map expo permission status to our status type
   */
  const mapPermissionStatus = (
    status: Location.PermissionStatus
  ): LocationPermissionStatus => {
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
   * Update state with new location data
   */
  const updateLocationState = useCallback(
    (location: Location.LocationObject) => {
      setState((prev) => ({
        ...prev,
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy,
        altitude: location.coords.altitude,
        heading: location.coords.heading,
        speed: location.coords.speed,
        timestamp: location.timestamp,
        loading: false,
        error: null,
      }))
    },
    []
  )

  /**
   * Set error state
   */
  const setError = useCallback((error: string) => {
    setState((prev) => ({
      ...prev,
      loading: false,
      error,
    }))
  }, [])

  // ---------------------------------------------------------------------------
  // PERMISSION HANDLING
  // ---------------------------------------------------------------------------

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
   * Request foreground location permission
   */
  const requestPermission = useCallback(async (): Promise<boolean> => {
    try {
      // Check if location services are enabled first
      const servicesEnabled = await checkLocationServices()
      if (!servicesEnabled) {
        setState((prev) => ({
          ...prev,
          loading: false,
          error: ERROR_MESSAGES.SERVICES_DISABLED,
          permissionStatus: 'restricted',
        }))
        return false
      }

      // Request foreground permission
      const { status } = await Location.requestForegroundPermissionsAsync()
      const mappedStatus = mapPermissionStatus(status)

      setState((prev) => ({
        ...prev,
        permissionStatus: mappedStatus,
      }))

      if (status !== Location.PermissionStatus.GRANTED) {
        setState((prev) => ({
          ...prev,
          loading: false,
          error: ERROR_MESSAGES.PERMISSION_DENIED,
        }))
        return false
      }

      return true
    } catch {
      setError(ERROR_MESSAGES.UNKNOWN)
      return false
    }
  }, [checkLocationServices, setError])

  // ---------------------------------------------------------------------------
  // LOCATION FETCHING
  // ---------------------------------------------------------------------------

  /**
   * Get current location once
   */
  const getCurrentLocation = useCallback(async (): Promise<Coordinates | null> => {
    try {
      setState((prev) => ({ ...prev, loading: true, error: null }))

      // Request permission if needed
      const hasPermission = await requestPermission()
      if (!hasPermission) {
        return null
      }

      // Get current position
      const location = await Location.getCurrentPositionAsync({
        accuracy: config.highAccuracy
          ? Location.Accuracy.High
          : Location.Accuracy.Balanced,
      })

      updateLocationState(location)

      return {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message.includes('timeout')
            ? ERROR_MESSAGES.TIMEOUT
            : ERROR_MESSAGES.UNAVAILABLE
          : ERROR_MESSAGES.UNKNOWN

      setError(errorMessage)
      return null
    }
  }, [config.highAccuracy, requestPermission, updateLocationState, setError])

  /**
   * Refresh location (alias for getCurrentLocation)
   */
  const refresh = useCallback(async (): Promise<void> => {
    await getCurrentLocation()
  }, [getCurrentLocation])

  // ---------------------------------------------------------------------------
  // LOCATION WATCHING
  // ---------------------------------------------------------------------------

  /**
   * Start watching location updates
   */
  const startWatching = useCallback(async (): Promise<void> => {
    // Stop any existing subscription
    if (watchSubscriptionRef.current) {
      watchSubscriptionRef.current.remove()
      watchSubscriptionRef.current = null
    }

    setState((prev) => ({ ...prev, loading: true, error: null }))

    // Request permission if needed
    const hasPermission = await requestPermission()
    if (!hasPermission) {
      return
    }

    try {
      // Start watching position
      const subscription = await Location.watchPositionAsync(
        {
          accuracy: config.highAccuracy
            ? Location.Accuracy.High
            : Location.Accuracy.Balanced,
          timeInterval: config.timeInterval,
          distanceInterval: config.distanceInterval,
        },
        (location) => {
          updateLocationState(location)
        }
      )

      watchSubscriptionRef.current = subscription
      setIsWatching(true)
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : ERROR_MESSAGES.UNKNOWN

      setError(errorMessage)
      setIsWatching(false)
    }
  }, [
    config.highAccuracy,
    config.timeInterval,
    config.distanceInterval,
    requestPermission,
    updateLocationState,
    setError,
  ])

  /**
   * Stop watching location updates
   */
  const stopWatching = useCallback((): void => {
    if (watchSubscriptionRef.current) {
      watchSubscriptionRef.current.remove()
      watchSubscriptionRef.current = null
    }
    setIsWatching(false)
  }, [])

  // ---------------------------------------------------------------------------
  // EFFECTS
  // ---------------------------------------------------------------------------

  /**
   * Initialize location on mount if enabled
   */
  useEffect(() => {
    if (config.enableOnMount) {
      getCurrentLocation()
    }

    // Cleanup on unmount
    return () => {
      if (watchSubscriptionRef.current) {
        watchSubscriptionRef.current.remove()
        watchSubscriptionRef.current = null
      }
    }
    // Only run on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ---------------------------------------------------------------------------
  // RETURN
  // ---------------------------------------------------------------------------

  return {
    // Location state
    ...state,

    // Control functions
    refresh,
    startWatching,
    stopWatching,
    requestPermission,
    checkLocationServices,

    // Status
    isWatching,
  }
}

// ============================================================================
// ADDITIONAL UTILITIES
// ============================================================================

/**
 * Calculate distance between two coordinates in meters
 * Uses Haversine formula
 *
 * @param coord1 - First coordinate
 * @param coord2 - Second coordinate
 * @returns Distance in meters
 */
export function calculateDistance(
  coord1: Coordinates,
  coord2: Coordinates
): number {
  const R = 6371e3 // Earth's radius in meters
  const φ1 = (coord1.latitude * Math.PI) / 180
  const φ2 = (coord2.latitude * Math.PI) / 180
  const Δφ = ((coord2.latitude - coord1.latitude) * Math.PI) / 180
  const Δλ = ((coord2.longitude - coord1.longitude) * Math.PI) / 180

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2)

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return R * c
}

/**
 * Check if a coordinate is within a radius of another coordinate
 *
 * @param center - Center coordinate
 * @param point - Point to check
 * @param radiusMeters - Radius in meters
 * @returns Whether point is within radius
 */
export function isWithinRadius(
  center: Coordinates,
  point: Coordinates,
  radiusMeters: number
): boolean {
  const distance = calculateDistance(center, point)
  return distance <= radiusMeters
}

/**
 * Format coordinates for display
 *
 * @param coords - Coordinates to format
 * @param precision - Decimal precision (default: 6)
 * @returns Formatted string
 */
export function formatCoordinates(
  coords: Coordinates,
  precision = 6
): string {
  return `${coords.latitude.toFixed(precision)}, ${coords.longitude.toFixed(precision)}`
}

// ============================================================================
// EXPORTS
// ============================================================================

export default useLocation
export type {
  LocationPermissionStatus,
  ExtendedLocationState,
  UseLocationOptions,
  UseLocationResult,
}
