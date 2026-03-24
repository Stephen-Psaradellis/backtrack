/**
 * Dwell Detection Module
 *
 * Pure functions for detecting when a user has dwelt (stayed) at a location
 * long enough to trigger check-in prompts or other location-based actions.
 *
 * This module is extracted from backgroundLocation.ts to enable independent testing
 * of the dwell detection logic without side effects.
 *
 * @example
 * ```typescript
 * import { updateDwellState, hasDwellTriggered } from './dwellDetection'
 *
 * const state = createInitialDwellState()
 * const updated = updateDwellState(state, newLocation, nearbyLocations, 5)
 * if (hasDwellTriggered(updated)) {
 *   // Send notification
 * }
 * ```
 */

import { BACKGROUND_GPS_CONFIG } from '../lib/utils/gpsConfig'
import { reduceCoordinatePrecision } from '../lib/utils/geoPrivacy'

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Radius in meters to consider user "at" a location.
 * Uses centralized config from gpsConfig.ts
 */
export const DWELL_RADIUS_METERS = BACKGROUND_GPS_CONFIG.DWELL_RADIUS

/**
 * Multiplier for determining when user has moved away from a location.
 * User is considered to have left when distance > DWELL_RADIUS_METERS * this value
 */
export const DEPARTURE_THRESHOLD_MULTIPLIER = 2

/**
 * Default prompt minutes if not specified
 */
export const DEFAULT_PROMPT_MINUTES = 5

// ============================================================================
// TYPES
// ============================================================================

/**
 * Represents the current dwell state of a user
 */
export interface DwellState {
  /** Current location user is dwelling at */
  currentLocation: {
    latitude: number
    longitude: number
    locationId?: string
    locationName?: string
  } | null
  /** Timestamp (ms) when user arrived at current location */
  arrivedAt: number | null
  /** Whether notification has been sent for current dwell */
  notificationSent: boolean
  /** User ID for tracking */
  userId: string | null
}

/**
 * Represents a nearby location from the database
 */
export interface NearbyLocation {
  id: string
  name: string
  latitude: number
  longitude: number
  distance_meters?: number
}

/**
 * Input location coordinates
 */
export interface LocationCoords {
  latitude: number
  longitude: number
}

/**
 * Result of a dwell state update
 */
export interface DwellUpdateResult {
  state: DwellState
  action: 'arrived' | 'dwelling' | 'departed' | 'idle'
  /** True if dwell threshold was just met (used to trigger notification) */
  shouldNotify: boolean
}

// ============================================================================
// PURE FUNCTIONS
// ============================================================================

/**
 * Create initial dwell state
 */
export function createInitialDwellState(userId?: string): DwellState {
  return {
    currentLocation: null,
    arrivedAt: null,
    notificationSent: false,
    userId: userId || null,
  }
}

/**
 * Calculate distance between two points using Haversine formula
 *
 * @param lat1 - Latitude of first point (degrees)
 * @param lon1 - Longitude of first point (degrees)
 * @param lat2 - Latitude of second point (degrees)
 * @param lon2 - Longitude of second point (degrees)
 * @returns Distance in meters
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3 // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180
  const φ2 = (lat2 * Math.PI) / 180
  const Δφ = ((lat2 - lat1) * Math.PI) / 180
  const Δλ = ((lon2 - lon1) * Math.PI) / 180

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2)

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return R * c
}

/**
 * Find the nearest location from a list of nearby locations
 *
 * @param currentCoords - Current user coordinates
 * @param nearbyLocations - List of nearby locations
 * @returns The nearest location, or null if none found
 */
export function findNearestLocation(
  currentCoords: LocationCoords,
  nearbyLocations: NearbyLocation[]
): NearbyLocation | null {
  if (!nearbyLocations || nearbyLocations.length === 0) {
    return null
  }

  let nearest: NearbyLocation | null = null
  let minDistance = Infinity

  for (const location of nearbyLocations) {
    const distance = calculateDistance(
      currentCoords.latitude,
      currentCoords.longitude,
      location.latitude,
      location.longitude
    )

    if (distance < minDistance) {
      minDistance = distance
      nearest = location
    }
  }

  return nearest
}

/**
 * Calculate dwell time in minutes for the current state
 *
 * @param state - Current dwell state
 * @param currentTimeMs - Current timestamp in milliseconds (defaults to Date.now())
 * @returns Dwell time in minutes, or 0 if not dwelling
 */
export function getDwellTimeMinutes(state: DwellState, currentTimeMs?: number): number {
  if (!state.arrivedAt) {
    return 0
  }

  const now = currentTimeMs || Date.now()
  return (now - state.arrivedAt) / (1000 * 60)
}

/**
 * Check if dwell threshold has been met (time to send notification)
 *
 * @param state - Current dwell state
 * @param promptMinutes - Minutes required to trigger notification
 * @param currentTimeMs - Current timestamp in milliseconds (defaults to Date.now())
 * @returns True if dwell time >= promptMinutes and notification not yet sent
 */
export function hasDwellTriggered(
  state: DwellState,
  promptMinutes: number,
  currentTimeMs?: number
): boolean {
  if (state.notificationSent) {
    return false
  }

  const dwellTimeMinutes = getDwellTimeMinutes(state, currentTimeMs)
  return dwellTimeMinutes >= promptMinutes
}

/**
 * Check if user is still at the same location
 *
 * @param state - Current dwell state
 * @param nearbyLocation - Nearby location found (if any)
 * @returns True if user is still at the same location
 */
export function isAtSameLocation(
  state: DwellState,
  nearbyLocation: NearbyLocation | null
): boolean {
  if (!state.currentLocation || !nearbyLocation) {
    return false
  }

  return state.currentLocation.locationId === nearbyLocation.id
}

/**
 * Check if user has moved away from their current location
 *
 * @param state - Current dwell state
 * @param currentCoords - Current user coordinates
 * @returns True if user has moved beyond the departure threshold
 */
export function hasMovedAway(state: DwellState, currentCoords: LocationCoords): boolean {
  if (!state.currentLocation) {
    return false
  }

  const distance = calculateDistance(
    currentCoords.latitude,
    currentCoords.longitude,
    state.currentLocation.latitude,
    state.currentLocation.longitude
  )

  return distance > DWELL_RADIUS_METERS * DEPARTURE_THRESHOLD_MULTIPLIER
}

/**
 * Update dwell state based on new location and nearby locations
 *
 * This is the main state transition function. It handles:
 * - Arrival at new location
 * - Continuing to dwell at same location
 * - Departure from location
 * - Idle (no nearby location)
 *
 * @param currentState - Current dwell state
 * @param newCoords - New user coordinates
 * @param nearbyLocation - Nearby location found (if any)
 * @param promptMinutes - Minutes required to trigger notification
 * @param currentTimeMs - Current timestamp in milliseconds (defaults to Date.now())
 * @returns Updated state with action and notification flag
 */
export function updateDwellState(
  currentState: DwellState,
  newCoords: LocationCoords,
  nearbyLocation: NearbyLocation | null,
  promptMinutes: number = DEFAULT_PROMPT_MINUTES,
  currentTimeMs?: number
): DwellUpdateResult {
  const now = currentTimeMs || Date.now()

  // Case 1: User is near a known location
  if (nearbyLocation) {
    // Case 1a: Still at same location - check if we should notify
    if (isAtSameLocation(currentState, nearbyLocation)) {
      const shouldNotify = hasDwellTriggered(currentState, promptMinutes, now)

      if (shouldNotify) {
        return {
          state: {
            ...currentState,
            notificationSent: true,
          },
          action: 'dwelling',
          shouldNotify: true,
        }
      }

      // Still dwelling but not ready to notify yet
      return {
        state: currentState,
        action: 'dwelling',
        shouldNotify: false,
      }
    }

    // Case 1b: Arrived at a new location
    return {
      state: {
        ...currentState,
        currentLocation: {
          latitude: reduceCoordinatePrecision(nearbyLocation.latitude, 4),
          longitude: reduceCoordinatePrecision(nearbyLocation.longitude, 4),
          locationId: nearbyLocation.id,
          locationName: nearbyLocation.name,
        },
        arrivedAt: now,
        notificationSent: false,
      },
      action: 'arrived',
      shouldNotify: false,
    }
  }

  // Case 2: No nearby location - check if user moved away from previous location
  if (currentState.currentLocation) {
    if (hasMovedAway(currentState, newCoords)) {
      // User has left the location
      return {
        state: {
          ...currentState,
          currentLocation: null,
          arrivedAt: null,
          notificationSent: false,
        },
        action: 'departed',
        shouldNotify: false,
      }
    }

    // Still close to previous location but not at a known venue
    return {
      state: currentState,
      action: 'idle',
      shouldNotify: false,
    }
  }

  // Case 3: No nearby location and no current location - idle state
  return {
    state: currentState,
    action: 'idle',
    shouldNotify: false,
  }
}

/**
 * Reset dwell state (clear current location and arrival time)
 * Used when user disables tracking or manually clears state
 */
export function resetDwellState(state: DwellState): DwellState {
  return {
    ...state,
    currentLocation: null,
    arrivedAt: null,
    notificationSent: false,
  }
}
