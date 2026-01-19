/**
 * Background Location Service
 *
 * Implements background location tracking and geofencing for automatic check-in prompts.
 * When enabled, tracks user location in background and triggers local notifications
 * when user has been at a location for the configured time.
 *
 * Features:
 * - Background location updates with low power consumption
 * - Location dwell detection (time spent at a location)
 * - Local notification prompts for check-in
 * - Respects user's tracking settings from profile
 *
 * @example
 * ```tsx
 * import { startBackgroundLocationTracking, stopBackgroundLocationTracking } from './backgroundLocation'
 *
 * // Start tracking when user enables always-on tracking
 * await startBackgroundLocationTracking(userId, promptMinutes)
 *
 * // Stop tracking when user disables it
 * await stopBackgroundLocationTracking()
 * ```
 */

import * as Location from 'expo-location'
import * as TaskManager from 'expo-task-manager'
import * as Notifications from 'expo-notifications'
import AsyncStorage from '@react-native-async-storage/async-storage'

import { supabase } from '../lib/supabase'
import { BACKGROUND_GPS_CONFIG } from '../lib/utils/gpsConfig'

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Task name for background location tracking
 */
export const BACKGROUND_LOCATION_TASK = 'BACKTRACK_BACKGROUND_LOCATION'

/**
 * Storage key for dwell tracking state
 */
const DWELL_STATE_KEY = 'backtrack:dwell_state'

/**
 * Storage key for tracking settings
 */
const TRACKING_SETTINGS_KEY = 'backtrack:tracking_settings'

/**
 * Radius in meters to consider user "at" a location
 * Uses centralized config from gpsConfig.ts
 */
const DWELL_RADIUS_METERS = BACKGROUND_GPS_CONFIG.DWELL_RADIUS

/**
 * Minimum distance change to trigger location update (meters)
 * Uses centralized config - 10m in debug mode, 50m in production
 */
const DISTANCE_INTERVAL_METERS = BACKGROUND_GPS_CONFIG.DISTANCE_INTERVAL

/**
 * Time interval between location updates (milliseconds)
 * Uses centralized config - 10s in debug mode, 2 min in production
 */
const TIME_INTERVAL_MS = BACKGROUND_GPS_CONFIG.TIME_INTERVAL_MS

/**
 * Default prompt minutes if not set
 */
const DEFAULT_PROMPT_MINUTES = 5

// Log debug mode status on import
if (BACKGROUND_GPS_CONFIG.DEBUG_MODE) {
  console.log('[BackgroundLocation] DEBUG MODE ENABLED - Using 10-second intervals')
}

// ============================================================================
// TYPES
// ============================================================================

interface DwellState {
  /** Current location user is dwelling at */
  currentLocation: {
    latitude: number
    longitude: number
    locationId?: string
    locationName?: string
  } | null
  /** Timestamp when user arrived at current location */
  arrivedAt: number | null
  /** Whether notification has been sent for current dwell */
  notificationSent: boolean
  /** User ID for tracking */
  userId: string | null
}

interface TrackingSettings {
  enabled: boolean
  promptMinutes: number
  userId: string
}

interface NearbyLocation {
  id: string
  name: string
  latitude: number
  longitude: number
  distance_meters: number
}

// ============================================================================
// DWELL STATE MANAGEMENT
// ============================================================================

/**
 * Get current dwell state from storage
 */
async function getDwellState(): Promise<DwellState> {
  try {
    const stored = await AsyncStorage.getItem(DWELL_STATE_KEY)
    if (stored) {
      return JSON.parse(stored)
    }
  } catch {
    // Ignore errors, return default
  }
  return {
    currentLocation: null,
    arrivedAt: null,
    notificationSent: false,
    userId: null,
  }
}

/**
 * Save dwell state to storage
 */
async function saveDwellState(state: DwellState): Promise<void> {
  try {
    await AsyncStorage.setItem(DWELL_STATE_KEY, JSON.stringify(state))
  } catch {
    // Ignore storage errors
  }
}

/**
 * Get tracking settings from storage
 */
async function getTrackingSettings(): Promise<TrackingSettings | null> {
  try {
    const stored = await AsyncStorage.getItem(TRACKING_SETTINGS_KEY)
    if (stored) {
      return JSON.parse(stored)
    }
  } catch {
    // Ignore errors
  }
  return null
}

/**
 * Save tracking settings to storage
 */
async function saveTrackingSettings(settings: TrackingSettings): Promise<void> {
  try {
    await AsyncStorage.setItem(TRACKING_SETTINGS_KEY, JSON.stringify(settings))
  } catch {
    // Ignore storage errors
  }
}

// ============================================================================
// LOCATION HELPERS
// ============================================================================

/**
 * Calculate distance between two points using Haversine formula
 */
function calculateDistance(
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
 * Find nearest location from database
 */
async function findNearbyLocation(
  lat: number,
  lon: number
): Promise<NearbyLocation | null> {
  try {
    const { data, error } = await supabase.rpc('get_locations_near_point', {
      p_lat: lat,
      p_lon: lon,
      p_radius_meters: 200, // Search within 200m
      p_limit: 1,
    })

    if (error || !data || data.length === 0) {
      return null
    }

    return data[0] as NearbyLocation
  } catch {
    return null
  }
}

// ============================================================================
// NOTIFICATION HELPERS
// ============================================================================

/**
 * Send a local notification prompting user to check in
 */
async function sendCheckinPromptNotification(locationName: string, locationId: string): Promise<void> {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Check In?',
        body: `You've been at ${locationName} for a while. Tap to check in and see who else is here!`,
        data: {
          type: 'checkin_prompt',
          locationId,
          locationName,
        },
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
      },
      trigger: null, // Send immediately
    })
  } catch (error) {
    console.error('[BackgroundLocation] Failed to send notification:', error)
  }
}

// ============================================================================
// BACKGROUND TASK DEFINITION
// ============================================================================

/**
 * Define the background location task
 * This runs when app is in background and receives location updates
 */
TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }) => {
  if (error) {
    console.error('[BackgroundLocation] Task error:', error)
    return
  }

  if (!data) {
    return
  }

  const { locations } = data as { locations: Location.LocationObject[] }

  if (!locations || locations.length === 0) {
    return
  }

  // Get the most recent location
  const location = locations[locations.length - 1]
  const { latitude, longitude } = location.coords
  const now = Date.now()

  // Get current tracking settings and dwell state
  const settings = await getTrackingSettings()
  if (!settings?.enabled) {
    return
  }

  const dwellState = await getDwellState()
  const promptMinutes = settings.promptMinutes || DEFAULT_PROMPT_MINUTES

  // Find if there's a known location nearby
  const nearbyLocation = await findNearbyLocation(latitude, longitude)

  if (nearbyLocation) {
    // User is near a known location
    if (dwellState.currentLocation?.locationId === nearbyLocation.id) {
      // Still at same location - check if we should prompt
      const dwellTimeMinutes = dwellState.arrivedAt
        ? (now - dwellState.arrivedAt) / (1000 * 60)
        : 0

      if (
        dwellTimeMinutes >= promptMinutes &&
        !dwellState.notificationSent
      ) {
        // Time to prompt!
        await sendCheckinPromptNotification(
          nearbyLocation.name,
          nearbyLocation.id
        )

        // Mark notification as sent
        await saveDwellState({
          ...dwellState,
          notificationSent: true,
        })
      }
    } else {
      // Arrived at a new location
      await saveDwellState({
        currentLocation: {
          latitude: nearbyLocation.latitude,
          longitude: nearbyLocation.longitude,
          locationId: nearbyLocation.id,
          locationName: nearbyLocation.name,
        },
        arrivedAt: now,
        notificationSent: false,
        userId: settings.userId,
      })
    }
  } else if (dwellState.currentLocation) {
    // Check if user moved away from previous location
    const distance = calculateDistance(
      latitude,
      longitude,
      dwellState.currentLocation.latitude,
      dwellState.currentLocation.longitude
    )

    if (distance > DWELL_RADIUS_METERS * 2) {
      // User has left the location
      await saveDwellState({
        currentLocation: null,
        arrivedAt: null,
        notificationSent: false,
        userId: settings.userId,
      })
    }
  }
})

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Check if background location tracking is available on this device
 */
export async function isBackgroundLocationAvailable(): Promise<boolean> {
  try {
    const isTaskDefined = TaskManager.isTaskDefined(BACKGROUND_LOCATION_TASK)
    const { status: foregroundStatus } = await Location.getForegroundPermissionsAsync()
    const { status: backgroundStatus } = await Location.getBackgroundPermissionsAsync()

    return (
      isTaskDefined &&
      foregroundStatus === 'granted' &&
      backgroundStatus === 'granted'
    )
  } catch {
    return false
  }
}

/**
 * Check if background location permissions are already granted
 */
export async function hasBackgroundLocationPermission(): Promise<boolean> {
  try {
    const { status: foregroundStatus } = await Location.getForegroundPermissionsAsync()
    const { status: backgroundStatus } = await Location.getBackgroundPermissionsAsync()
    return foregroundStatus === 'granted' && backgroundStatus === 'granted'
  } catch {
    return false
  }
}

/**
 * Request background location permissions
 * First checks if already granted to avoid re-request issues on iOS
 */
export async function requestBackgroundLocationPermission(): Promise<boolean> {
  try {
    // First check if permissions are already granted
    const alreadyGranted = await hasBackgroundLocationPermission()
    if (alreadyGranted) {
      return true
    }

    // Check current foreground status
    const { status: currentForeground } = await Location.getForegroundPermissionsAsync()

    // Only request foreground if not already granted
    if (currentForeground !== 'granted') {
      const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync()
      if (foregroundStatus !== 'granted') {
        console.warn('[BackgroundLocation] Foreground permission denied')
        return false
      }
    }

    // Check current background status
    const { status: currentBackground } = await Location.getBackgroundPermissionsAsync()

    // Only request background if not already granted
    if (currentBackground !== 'granted') {
      const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync()
      if (backgroundStatus !== 'granted') {
        console.warn('[BackgroundLocation] Background permission denied')
        return false
      }
    }

    return true
  } catch (error) {
    console.error('[BackgroundLocation] Permission request error:', error)
    return false
  }
}

/**
 * Start background location tracking
 *
 * @param userId - User ID for tracking
 * @param promptMinutes - Minutes before prompting for check-in
 */
export async function startBackgroundLocationTracking(
  userId: string,
  promptMinutes: number = DEFAULT_PROMPT_MINUTES
): Promise<boolean> {
  try {
    // Request permissions
    const hasPermission = await requestBackgroundLocationPermission()
    if (!hasPermission) {
      console.warn('[BackgroundLocation] Background location permission not granted')
      return false
    }

    // Check if already running
    const isRunning = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK)
    if (isRunning) {
      // Update settings
      await saveTrackingSettings({ enabled: true, promptMinutes, userId })
      return true
    }

    // Save settings
    await saveTrackingSettings({ enabled: true, promptMinutes, userId })

    // Initialize dwell state
    await saveDwellState({
      currentLocation: null,
      arrivedAt: null,
      notificationSent: false,
      userId,
    })

    // Start background location updates
    await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
      accuracy: Location.Accuracy.Balanced,
      timeInterval: TIME_INTERVAL_MS,
      distanceInterval: DISTANCE_INTERVAL_METERS,
      deferredUpdatesInterval: TIME_INTERVAL_MS,
      deferredUpdatesDistance: DISTANCE_INTERVAL_METERS,
      showsBackgroundLocationIndicator: true,
      foregroundService: {
        notificationTitle: 'Backtrack',
        notificationBody: 'Location tracking is active for check-in prompts',
        notificationColor: '#FF6B47',
      },
      pausesUpdatesAutomatically: false,
      activityType: Location.ActivityType.Other,
    })

    console.log('[BackgroundLocation] Started background location tracking')
    return true
  } catch (error) {
    console.error('[BackgroundLocation] Failed to start tracking:', error)
    return false
  }
}

/**
 * Stop background location tracking
 */
export async function stopBackgroundLocationTracking(): Promise<void> {
  try {
    // Update settings
    const settings = await getTrackingSettings()
    if (settings) {
      await saveTrackingSettings({ ...settings, enabled: false })
    }

    // Check if running
    const isRunning = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK)
    if (!isRunning) {
      return
    }

    // Stop updates
    await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK)

    // Clear dwell state
    await saveDwellState({
      currentLocation: null,
      arrivedAt: null,
      notificationSent: false,
      userId: null,
    })

    console.log('[BackgroundLocation] Stopped background location tracking')
  } catch (error) {
    console.error('[BackgroundLocation] Failed to stop tracking:', error)
  }
}

/**
 * Check if background location tracking is currently running
 */
export async function isBackgroundLocationRunning(): Promise<boolean> {
  try {
    return await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK)
  } catch {
    return false
  }
}

/**
 * Update tracking settings (prompt minutes) without restarting
 */
export async function updateTrackingSettings(promptMinutes: number): Promise<void> {
  const settings = await getTrackingSettings()
  if (settings) {
    await saveTrackingSettings({ ...settings, promptMinutes })
  }
}

export default {
  BACKGROUND_LOCATION_TASK,
  isBackgroundLocationAvailable,
  hasBackgroundLocationPermission,
  requestBackgroundLocationPermission,
  startBackgroundLocationTracking,
  stopBackgroundLocationTracking,
  isBackgroundLocationRunning,
  updateTrackingSettings,
}
