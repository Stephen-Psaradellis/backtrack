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

import NetInfo from '@react-native-community/netinfo'
import * as Location from 'expo-location'
import * as TaskManager from 'expo-task-manager'
import * as Notifications from 'expo-notifications'
import AsyncStorage from '@react-native-async-storage/async-storage'
import * as SecureStore from 'expo-secure-store'

import { supabase } from '../lib/supabase'
import { captureException } from '../lib/sentry'
import { BACKGROUND_GPS_CONFIG } from '../lib/utils/gpsConfig'
import { sanitizeLocationName } from '../lib/utils/sanitize'
import { reduceCoordinatePrecision } from '../lib/utils/geoPrivacy'
import { searchNearbyPlaces } from './locationService'
import {
  DwellState,
  createInitialDwellState,
  updateDwellState,
  calculateDistance,
  getDistanceFromDwellLocation,
  DWELL_RADIUS_METERS as DWELL_DETECTION_RADIUS,
} from './dwellDetection'

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
const DWELL_STATE_KEY = 'backtrack.dwell_state'

/**
 * Storage key for tracking settings
 */
const TRACKING_SETTINGS_KEY = 'backtrack.tracking_settings'

/**
 * Storage key for proximity notification rate limiting
 */
const PROXIMITY_RATE_LIMIT_KEY = 'backtrack.proximity_rate_limit'

/**
 * Storage key for background task diagnostics (debug)
 */
const TASK_DIAGNOSTICS_KEY = 'backtrack.task_diagnostics'

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

/**
 * Maximum radar notifications per hour (rate limit)
 */
const MAX_RADAR_NOTIFICATIONS_PER_HOUR = 3

/**
 * Minimum distance moved to trigger radar check (prevents spam when stationary)
 */
const MIN_RADAR_CHECK_DISTANCE = 50 // meters


// ============================================================================
// TYPES
// ============================================================================

// Note: DwellState now imported from dwellDetection.ts

interface TrackingSettings {
  enabled: boolean
  promptMinutes: number
  userId: string
  /** Timestamp when settings were last modified (for race condition detection) */
  lastModified?: number
}

interface NearbyLocation {
  id: string
  name: string
  latitude: number
  longitude: number
  distance_meters: number
}

// ============================================================================
// SECURE STORAGE HELPERS (GDPR 3.4 - Encrypt location data at rest)
// ============================================================================

/**
 * SecureStore options for background-accessible data.
 * AFTER_FIRST_UNLOCK allows reads when the device is locked (after first unlock since boot),
 * which is essential for background location tasks that run while the screen is off.
 */
const BACKGROUND_SECURE_STORE_OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
}

/**
 * Read from SecureStore with AsyncStorage fallback for migration.
 * On first read from AsyncStorage, migrates data to SecureStore.
 */
async function secureGet(key: string): Promise<string | null> {
  try {
    // Try SecureStore first (with AFTER_FIRST_UNLOCK for background access)
    const secure = await SecureStore.getItemAsync(key, BACKGROUND_SECURE_STORE_OPTIONS)
    if (secure) return secure
  } catch (err) {
    captureException(err, { operation: 'secureGet:SecureStore', key })
  }

  try {
    // Fallback: read from AsyncStorage (existing users migration path)
    const legacy = await AsyncStorage.getItem(key)
    if (legacy) {
      // Migrate to SecureStore with background-accessible options, then remove from AsyncStorage
      try {
        await SecureStore.setItemAsync(key, legacy, BACKGROUND_SECURE_STORE_OPTIONS)
        await AsyncStorage.removeItem(key)
      } catch (migrateErr) {
        captureException(migrateErr, { operation: 'secureGet:migrate', key })
      }
      return legacy
    }
  } catch (err) {
    captureException(err, { operation: 'secureGet:AsyncStorage', key })
  }

  return null
}

/**
 * Write to SecureStore (encrypted at rest).
 * Deletes the old item first to ensure the AFTER_FIRST_UNLOCK accessibility
 * attribute is applied — iOS Keychain doesn't update attributes on overwrite.
 */
async function secureSet(key: string, value: string): Promise<void> {
  try {
    // Delete first to ensure accessibility attribute is re-created (not just value updated)
    try { await SecureStore.deleteItemAsync(key) } catch { /* may not exist */ }
    await SecureStore.setItemAsync(key, value, BACKGROUND_SECURE_STORE_OPTIONS)
  } catch (err) {
    captureException(err, { operation: 'secureSet', key })
    // Fallback to AsyncStorage so background task state is not lost
    try {
      await AsyncStorage.setItem(key, value)
    } catch { /* last resort failed */ }
  }
}

/**
 * Delete from both SecureStore and AsyncStorage.
 */
async function secureDelete(key: string): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(key, BACKGROUND_SECURE_STORE_OPTIONS)
  } catch { /* ignore */ }
  try {
    await AsyncStorage.removeItem(key)
  } catch { /* ignore */ }
}

// ============================================================================
// DWELL STATE MANAGEMENT
// ============================================================================

/**
 * Get current dwell state from AsyncStorage.
 * Uses AsyncStorage instead of SecureStore because dwell state (coordinates/timestamps)
 * is not sensitive, and AsyncStorage is more reliable in iOS background tasks.
 */
async function getDwellState(): Promise<DwellState> {
  try {
    const stored = await AsyncStorage.getItem(DWELL_STATE_KEY)
    if (stored) {
      return JSON.parse(stored)
    }
  } catch (err) {
    captureException(err, { operation: 'getDwellState', key: DWELL_STATE_KEY })
  }
  return createInitialDwellState()
}

/**
 * Save dwell state to AsyncStorage.
 */
async function saveDwellState(state: DwellState): Promise<void> {
  try {
    await AsyncStorage.setItem(DWELL_STATE_KEY, JSON.stringify(state))
  } catch (err) {
    captureException(err, { operation: 'saveDwellState' })
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
  } catch (err) {
    captureException(err, { operation: 'getTrackingSettings' })
  }
  return null
}

/**
 * Verify that tracking settings haven't changed since the initial check.
 * This prevents race conditions where user disables tracking during async operations.
 *
 * @param initialSettings The settings captured at the start of an operation
 * @returns true if settings are unchanged and tracking is still enabled, false otherwise
 */
async function verifySettingsUnchanged(initialSettings: TrackingSettings): Promise<boolean> {
  try {
    const currentSettings = await getTrackingSettings()

    // If tracking is now disabled, abort
    if (!currentSettings?.enabled) {
      return false
    }

    // If settings were modified after we started (timestamp changed), abort
    if (initialSettings.lastModified && currentSettings.lastModified) {
      if (currentSettings.lastModified > initialSettings.lastModified) {
        return false
      }
    }

    return true
  } catch (err) {
    captureException(err, { operation: 'verifySettingsUnchanged' })
    // On error, fail safe - don't proceed with state changes
    return false
  }
}

/**
 * Save tracking settings to storage
 */
async function saveTrackingSettings(settings: TrackingSettings): Promise<void> {
  try {
    // Always update lastModified timestamp to detect concurrent changes
    const settingsWithTimestamp = {
      ...settings,
      lastModified: Date.now(),
    }
    await AsyncStorage.setItem(TRACKING_SETTINGS_KEY, JSON.stringify(settingsWithTimestamp))
  } catch (err) {
    captureException(err, { operation: 'saveTrackingSettings' })
  }
}

// ============================================================================
// LOCATION HELPERS
// ============================================================================

// Note: reduceCoordinatePrecision moved to lib/utils/geoPrivacy.ts for reuse
// Note: calculateDistance moved to dwellDetection.ts for reuse
// Using 2 decimal places (~1.1km) for background location privacy

/**
 * Find nearest location from database
 */
async function findNearbyLocation(
  lat: number,
  lon: number
): Promise<NearbyLocation | null> {
  // 1. Try local database first (cheaper, faster)
  try {
    const reducedLat = reduceCoordinatePrecision(lat, 4)
    const reducedLon = reduceCoordinatePrecision(lon, 4)

    const { data, error } = await supabase.rpc('get_locations_near_point_optimized', {
      p_lat: reducedLat,
      p_lon: reducedLon,
      p_radius_meters: 500,
      p_limit: 1,
    })

    if (!error && data && data.length > 0) {
      return data[0] as NearbyLocation
    }
  } catch (err) {
    // DB failed, fall through to Google Places
    if (__DEV__) console.warn('[backgroundLocation] DB lookup failed, trying Google Places', err)
  }

  // 2. Fall back to Google Places API
  try {
    const result = await searchNearbyPlaces({
      latitude: lat,
      longitude: lon,
      radius_meters: 500,
      max_results: 1,
    })

    if (!result.success || result.places.length === 0) {
      return null
    }

    const place = result.places[0]
    if (!place.location?.latitude || !place.location?.longitude) {
      return null
    }

    return {
      id: place.id,
      name: place.displayName?.text || 'Unknown venue',
      latitude: place.location.latitude,
      longitude: place.location.longitude,
    }
  } catch (err) {
    captureException(err, { operation: 'findNearbyLocation' })
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
    // Sanitize location name to prevent notification injection attacks
    const safeName = sanitizeLocationName(locationName)

    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Check In?',
        body: `You've been at ${safeName} for a while. Tap to check in and see who else is here!`,
        data: {
          type: 'checkin_prompt',
          locationId,
          locationName: safeName,
        },
        sound: 'default',
        priority: Notifications.AndroidNotificationPriority.HIGH,
        interruptionLevel: 'active',
      },
      trigger: null, // Send immediately
    })
  } catch (error) {
    captureException(error, { operation: 'sendCheckinPromptNotification', locationName, locationId })
  }
}

// ============================================================================
// PROXIMITY RADAR HELPERS
// ============================================================================

/**
 * Rate limiting for proximity notifications
 */
interface ProximityRateLimit {
  lastCheckLocation: { latitude: number; longitude: number } | null
  notificationTimestamps: number[]
}

/**
 * Get proximity rate limit state
 */
async function getProximityRateLimit(): Promise<ProximityRateLimit> {
  try {
    const stored = await AsyncStorage.getItem(PROXIMITY_RATE_LIMIT_KEY)
    if (stored) {
      return JSON.parse(stored)
    }
  } catch (err) {
    captureException(err, { operation: 'getProximityRateLimit' })
  }
  return {
    lastCheckLocation: null,
    notificationTimestamps: [],
  }
}

/**
 * Save proximity rate limit state
 */
async function saveProximityRateLimit(state: ProximityRateLimit): Promise<void> {
  try {
    await AsyncStorage.setItem(PROXIMITY_RATE_LIMIT_KEY, JSON.stringify(state))
  } catch (err) {
    captureException(err, { operation: 'saveProximityRateLimit' })
  }
}

/**
 * Check if rate limit allows sending another radar notification
 */
function canSendRadarNotification(timestamps: number[]): boolean {
  const now = Date.now()
  const oneHourAgo = now - 60 * 60 * 1000

  // Filter to only recent timestamps
  const recentNotifications = timestamps.filter((ts) => ts >= oneHourAgo)

  return recentNotifications.length < MAX_RADAR_NOTIFICATIONS_PER_HOUR
}

/**
 * Send proximity radar notification
 */
async function sendRadarProximityNotification(): Promise<void> {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Someone nearby!',
        body: 'Someone you might click with is nearby!',
        data: {
          type: 'proximity_radar',
        },
        sound: 'default',
        priority: Notifications.AndroidNotificationPriority.DEFAULT,
        interruptionLevel: 'active',
      },
      trigger: null, // Send immediately
    })
  } catch (error) {
    captureException(error, { operation: 'sendRadarProximityNotification' })
  }
}

/**
 * Check for nearby users and record encounters
 */
async function checkProximityRadar(
  userId: string,
  latitude: number,
  longitude: number
): Promise<void> {
  try {
    // Get user's radar settings from profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('radar_enabled, radar_radius_meters')
      .eq('id', userId)
      .single()

    if (profileError || !profile?.radar_enabled) {
      return // Radar disabled or error
    }

    const radius = profile.radar_radius_meters || 200

    // Get rate limit state
    const rateLimit = await getProximityRateLimit()

    // Check if user moved enough distance since last check
    if (rateLimit.lastCheckLocation) {
      const distanceMoved = calculateDistance(
        latitude,
        longitude,
        rateLimit.lastCheckLocation.latitude,
        rateLimit.lastCheckLocation.longitude
      )

      if (distanceMoved < MIN_RADAR_CHECK_DISTANCE) {
        return // Not moved enough, skip check
      }
    }

    // Check if we can send more notifications this hour
    if (!canSendRadarNotification(rateLimit.notificationTimestamps)) {
      return // Rate limit reached
    }

    // Call RPC to find nearby users
    const { data: nearbyUsers, error: nearbyError } = await supabase.rpc(
      'check_nearby_users',
      {
        p_user_id: userId,
        p_lat: latitude,
        p_lng: longitude,
        p_radius: radius,
      }
    )

    if (nearbyError || !nearbyUsers || nearbyUsers.length === 0) {
      // Update last check location even if no users found
      await saveProximityRateLimit({
        ...rateLimit,
        lastCheckLocation: { latitude, longitude },
      })
      return
    }

    // Record encounters for each nearby user
    let encountersRecorded = 0
    for (const nearby of nearbyUsers) {
      const { data: result } = await supabase.rpc('record_proximity_encounter', {
        p_user_id: userId,
        p_encountered_user_id: nearby.user_id,
        p_lat: latitude,
        p_lng: longitude,
        p_distance: nearby.distance,
        p_location_id: nearby.location_id,
        p_encounter_type: nearby.location_id ? 'same_venue' : 'walkby',
      })

      if (result?.success && !result?.already_recorded) {
        encountersRecorded++
      }
    }

    // Send notification if we recorded at least one new encounter
    if (encountersRecorded > 0) {
      await sendRadarProximityNotification()

      // Update rate limit state
      const now = Date.now()
      const oneHourAgo = now - 60 * 60 * 1000
      const recentTimestamps = rateLimit.notificationTimestamps.filter(
        (ts) => ts >= oneHourAgo
      )

      await saveProximityRateLimit({
        lastCheckLocation: { latitude, longitude },
        notificationTimestamps: [...recentTimestamps, now],
      })
    } else {
      // No new encounters, just update last check location
      await saveProximityRateLimit({
        ...rateLimit,
        lastCheckLocation: { latitude, longitude },
      })
    }
  } catch (err) {
    captureException(err, { operation: 'checkProximityRadar' })
  }
}

// ============================================================================
// BACKGROUND TASK DEFINITION
// ============================================================================

/**
 * Validate that a nearby location has required fields.
 * Protects against corrupted database responses.
 */
function isValidNearbyLocation(loc: unknown): loc is NearbyLocation {
  if (!loc || typeof loc !== 'object') return false
  const l = loc as Record<string, unknown>
  return (
    typeof l.id === 'string' &&
    l.id.length > 0 &&
    typeof l.name === 'string' &&
    typeof l.latitude === 'number' &&
    typeof l.longitude === 'number'
  )
}

/**
 * Define the background location task
 * This runs when app is in background and receives location updates
 */
TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }) => {
  if (error) {
    captureException(error, { operation: 'backgroundLocationTask' })
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

  // Retry any pending checkout from a previous failed attempt
  if (dwellState.pendingCheckout && dwellState.currentLocation?.locationId) {
    try {
      const { data: retryResult } = await supabase.rpc('checkout_from_location', {
        p_location_id: dwellState.currentLocation.locationId,
      })
      if (retryResult?.success) {
        // Checkout succeeded — clear state and continue
        await saveDwellState({
          ...createInitialDwellState(settings.userId),
          userId: settings.userId,
        })
        // Re-read cleared state for the rest of this tick
        const clearedState = await getDwellState()
        Object.assign(dwellState, clearedState)
      }
      // If retry also failed, we'll try again next tick
    } catch (err) {
      captureException(err, {
        operation: 'pendingCheckoutRetry',
        locationId: dwellState.currentLocation.locationId,
      })
    }
  }

  // 3-zone departure detection:
  //   Zone 1 (< DWELL_RADIUS): At venue — reuse cached location, skip network
  //   Zone 2 (DWELL_RADIUS .. 2*DWELL_RADIUS): Ambiguous — ask server
  //   Zone 3 (> 2*DWELL_RADIUS): Departed — force null, guaranteed departure
  let nearbyLocation: NearbyLocation | null = null
  const distFromDwell = getDistanceFromDwellLocation(dwellState, { latitude, longitude })
  const isStationaryAtLocation = distFromDwell !== null && distFromDwell < DWELL_DETECTION_RADIUS

  if (isStationaryAtLocation) {
    // Zone 1: At venue — reuse existing location, skip network call
    nearbyLocation = {
      id: dwellState.currentLocation!.locationId!,
      name: dwellState.currentLocation!.locationName!,
      latitude: dwellState.currentLocation!.latitude,
      longitude: dwellState.currentLocation!.longitude,
    }
  } else if (distFromDwell !== null && distFromDwell > DWELL_DETECTION_RADIUS * 2) {
    // Zone 3: Clearly departed — force null so updateDwellState produces 'departed'
    nearbyLocation = null
  } else {
    // Zone 2 (ambiguous) or no current dwell location — ask the network
    const netState = await NetInfo.fetch()
    if (!netState.isConnected) {
      return
    }

    nearbyLocation = await findNearbyLocation(latitude, longitude)

    // Validate location data to prevent crashes from corrupted DB data
    if (nearbyLocation && !isValidNearbyLocation(nearbyLocation)) {
      captureException(new Error('Invalid location data from database'), {
        operation: 'backgroundLocationTask',
        locationData: JSON.stringify(nearbyLocation),
      })
      return
    }
  }

  // Calculate dwell time for diagnostics
  const dwellElapsedMin = dwellState.arrivedAt
    ? ((now - dwellState.arrivedAt) / 60000).toFixed(1)
    : '0'
  const distToVenue = nearbyLocation
    ? calculateDistance(latitude, longitude, nearbyLocation.latitude, nearbyLocation.longitude).toFixed(0)
    : null
  const sameAsCurrentId = dwellState.currentLocation?.locationId && nearbyLocation
    ? dwellState.currentLocation.locationId === nearbyLocation.id
    : null

  // Save diagnostics for debug button
  try {
    await AsyncStorage.setItem(TASK_DIAGNOSTICS_KEY, JSON.stringify({
      lastFired: new Date(now).toISOString(),
      lat: latitude.toFixed(5),
      lon: longitude.toFixed(5),
      nearbyLocationName: nearbyLocation?.name || null,
      nearbyLocationId: nearbyLocation?.id || null,
      distToVenueM: distToVenue,
      dwellAction: null, // updated below
      dwellCurrentLocation: dwellState.currentLocation?.locationName || null,
      dwellCurrentId: dwellState.currentLocation?.locationId || null,
      arrivedAt: dwellState.arrivedAt ? new Date(dwellState.arrivedAt).toISOString() : null,
      dwellElapsedMin,
      notificationSent: dwellState.notificationSent,
      promptMinutes,
      isStationaryAtLocation,
      sameVenueId: sameAsCurrentId,
    }))
  } catch { /* non-critical */ }

  // Update dwell state using pure function
  const updateResult = updateDwellState(
    dwellState,
    { latitude, longitude },
    nearbyLocation,
    promptMinutes,
    now
  )

  // Update diagnostics with action result
  try {
    const diag = JSON.parse(await AsyncStorage.getItem(TASK_DIAGNOSTICS_KEY) || '{}')
    diag.dwellAction = updateResult.action
    diag.shouldNotify = updateResult.shouldNotify
    await AsyncStorage.setItem(TASK_DIAGNOSTICS_KEY, JSON.stringify(diag))
  } catch { /* non-critical */ }

  // Handle notifications and side effects based on the update result
  if (updateResult.shouldNotify && nearbyLocation) {
    // Time to prompt!
    await sendCheckinPromptNotification(
      nearbyLocation.name,
      nearbyLocation.id
    )

    // BEST-EFFORT CHECK: AsyncStorage doesn't support CAS (compare-and-swap).
    // This is adequate for serial background task execution but is not truly atomic.
    if (!(await verifySettingsUnchanged(settings))) {
      return // Settings changed, don't save location data
    }

    // Save the updated state (notification sent)
    await saveDwellState(updateResult.state)
  } else if (updateResult.action === 'arrived') {
    // BEST-EFFORT CHECK: AsyncStorage doesn't support CAS (compare-and-swap).
    // This is adequate for serial background task execution but is not truly atomic.
    if (!(await verifySettingsUnchanged(settings))) {
      return // Settings changed, don't save location data
    }

    // Save arrival state and check for proximity encounters
    await saveDwellState({ ...updateResult.state, userId: settings.userId })
    await checkProximityRadar(settings.userId, latitude, longitude)
  } else if (updateResult.action === 'departed') {
    // BEST-EFFORT CHECK: AsyncStorage doesn't support CAS (compare-and-swap).
    // This is adequate for serial background task execution but is not truly atomic.
    if (!(await verifySettingsUnchanged(settings))) {
      return // Settings changed, don't modify state
    }

    // Auto-checkout: user has left the location they were checked into
    if (dwellState.currentLocation?.locationId) {
      let checkoutSucceeded = false
      try {
        const { data: checkoutResult, error: checkoutError } = await supabase.rpc('checkout_from_location', {
          p_location_id: dwellState.currentLocation.locationId,
        })
        checkoutSucceeded = !checkoutError && checkoutResult?.success
        if (checkoutError) {
          captureException(new Error(checkoutError.message), {
            operation: 'autoCheckoutOnDeparture',
            locationId: dwellState.currentLocation.locationId,
          })
        }
      } catch (err) {
        captureException(err, {
          operation: 'autoCheckoutOnDeparture',
          locationId: dwellState.currentLocation.locationId,
        })
      }

      if (checkoutSucceeded) {
        // Save departed state — clear everything
        await saveDwellState({ ...updateResult.state, userId: settings.userId })
      } else {
        // Preserve dwell state with pendingCheckout so next tick retries
        await saveDwellState({
          ...dwellState,
          pendingCheckout: true,
        })
      }
    } else {
      // No locationId to checkout from — just clear state
      await saveDwellState({ ...updateResult.state, userId: settings.userId })
    }
  }
  // For 'dwelling' (no notification yet) and 'idle' actions, state unchanged
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
  } catch (err) {
    captureException(err, { operation: 'isBackgroundLocationAvailable' })
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
  } catch (err) {
    captureException(err, { operation: 'hasBackgroundLocationPermission' })
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
        return false
      }
    }

    // Check current background status
    const { status: currentBackground } = await Location.getBackgroundPermissionsAsync()

    // Only request background if not already granted
    if (currentBackground !== 'granted') {
      const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync()
      if (backgroundStatus !== 'granted') {
        return false
      }
    }

    return true
  } catch (error) {
    captureException(error, { operation: 'requestBackgroundLocationPermission' })
    return false
  }
}

/**
 * Result of starting background location tracking
 */
export interface StartTrackingResult {
  success: boolean
  error?: string
  errorCode?: 'PERMISSION_DENIED' | 'PERMISSION_UNDETERMINED' | 'TASK_FAILED' | 'UNKNOWN'
}

/**
 * Start background location tracking
 *
 * @param userId - User ID for tracking
 * @param promptMinutes - Minutes before prompting for check-in
 * @returns Result object with success status and error details for user feedback
 */
export async function startBackgroundLocationTracking(
  userId: string,
  promptMinutes: number = DEFAULT_PROMPT_MINUTES
): Promise<StartTrackingResult> {
  try {
    // Check permission status before requesting
    const { status: currentBgStatus } = await Location.getBackgroundPermissionsAsync()

    // Request permissions
    const hasPermission = await requestBackgroundLocationPermission()
    if (!hasPermission) {
      // Determine if permission was denied or just not granted yet
      const { status: bgStatus } = await Location.getBackgroundPermissionsAsync()
      if (bgStatus === 'denied') {
        return {
          success: false,
          error: 'Location permission denied. Please enable "Always Allow" location access in your device settings.',
          errorCode: 'PERMISSION_DENIED',
        }
      }
      return {
        success: false,
        error: 'Background location permission is required. Please grant "Always Allow" location access.',
        errorCode: 'PERMISSION_UNDETERMINED',
      }
    }

    // Ensure notification permission is granted (needed for check-in prompts)
    const { status: notifStatus } = await Notifications.getPermissionsAsync()
    if (notifStatus !== 'granted') {
      const { status: newNotifStatus } = await Notifications.requestPermissionsAsync()
      if (newNotifStatus !== 'granted') {
        return {
          success: false,
          error: 'Notification permission is required for check-in prompts. Please enable notifications in Settings.',
          errorCode: 'PERMISSION_DENIED',
        }
      }
    }

    // Check if already running
    const isRunning = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK)
    if (isRunning) {
      // Update settings
      await saveTrackingSettings({ enabled: true, promptMinutes, userId })
      return { success: true }
    }

    // Save settings
    await saveTrackingSettings({ enabled: true, promptMinutes, userId })

    // SECURITY: Alert if debug mode is active in production builds
    if (BACKGROUND_GPS_CONFIG.DEBUG_MODE && !__DEV__) {
      captureException(
        new Error('GPS_DEBUG_MODE_IN_PRODUCTION'),
        {
          level: 'warning',
          tags: {
            component: 'backgroundLocation',
            severity: 'high',
            impact: 'battery_drain',
          },
          extra: {
            userId,
            timeInterval: TIME_INTERVAL_MS,
            distanceInterval: DISTANCE_INTERVAL_METERS,
            message: 'Background GPS debug mode is active in production build! This causes 12x battery drain (10s vs 2min intervals).',
          },
        }
      )
    }

    // Initialize dwell state
    await saveDwellState(createInitialDwellState(userId))

    // Start background location updates
    // distanceInterval must be 0 so iOS delivers time-based updates even when
    // the user is stationary - which is exactly when dwell check-ins should fire.
    await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
      accuracy: Location.Accuracy.High,
      timeInterval: TIME_INTERVAL_MS,
      distanceInterval: 0,
      deferredUpdatesInterval: TIME_INTERVAL_MS,
      deferredUpdatesDistance: 0,
      showsBackgroundLocationIndicator: true,
      foregroundService: {
        notificationTitle: 'Backtrack',
        notificationBody: 'Location tracking is active for check-in prompts',
        notificationColor: '#FF6B47',
      },
      pausesUpdatesAutomatically: false,
      activityType: Location.ActivityType.Other,
    })

    return { success: true }
  } catch (error) {
    captureException(error, { operation: 'startBackgroundLocationTracking', userId })
    return {
      success: false,
      error: 'Failed to start location tracking. Please try again or restart the app.',
      errorCode: 'TASK_FAILED',
    }
  }
}

/**
 * Stop background location tracking
 */
export async function stopBackgroundLocationTracking(): Promise<void> {
  try {
    // Check if running
    const isRunning = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK)
    if (isRunning) {
      // Stop updates
      await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK)
    }

    // Purge all stored location data
    await AsyncStorage.removeItem(DWELL_STATE_KEY)
    await AsyncStorage.removeItem(TRACKING_SETTINGS_KEY)
    // Also clean up any legacy SecureStore entries
    await secureDelete(DWELL_STATE_KEY)
  } catch (error) {
    captureException(error, { operation: 'stopBackgroundLocationTracking' })
  }
}

/**
 * Check if background location tracking is currently running
 */
export async function isBackgroundLocationRunning(): Promise<boolean> {
  try {
    return await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK)
  } catch (err) {
    captureException(err, { operation: 'isBackgroundLocationRunning' })
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

// ============================================================================
// ERROR RECOVERY MECHANISM
// ============================================================================

export interface LocationHealthStatus {
  isRunning: boolean
  hasPermission: boolean
  permissionStatus: 'granted' | 'denied' | 'undetermined'
  needsRecovery: boolean
  recoveryReason?: string
}

/**
 * Check the health status of background location tracking.
 * Returns detailed status to help diagnose and recover from issues.
 */
export async function getLocationHealthStatus(): Promise<LocationHealthStatus> {
  try {
    const isRunning = await isBackgroundLocationRunning()
    const settings = await getTrackingSettings()
    const { status: foregroundStatus } = await Location.getForegroundPermissionsAsync()
    const { status: backgroundStatus } = await Location.getBackgroundPermissionsAsync()

    const hasPermission = foregroundStatus === 'granted' && backgroundStatus === 'granted'
    const permissionStatus = !hasPermission
      ? (backgroundStatus === 'denied' ? 'denied' : 'undetermined')
      : 'granted'

    let needsRecovery = false
    let recoveryReason: string | undefined

    if (settings?.enabled && !isRunning) {
      needsRecovery = true
      recoveryReason = 'Tracking enabled but not running'
    } else if (settings?.enabled && !hasPermission) {
      needsRecovery = true
      recoveryReason = 'Permissions revoked while tracking enabled'
    }

    return { isRunning, hasPermission, permissionStatus, needsRecovery, recoveryReason }
  } catch (err) {
    captureException(err, { operation: 'getLocationHealthStatus' })
    return {
      isRunning: false,
      hasPermission: false,
      permissionStatus: 'undetermined',
      needsRecovery: true,
      recoveryReason: 'Health check failed',
    }
  }
}

/**
 * Attempt to recover background location tracking.
 * Call this when the app comes to foreground or on a periodic basis.
 */
export async function recoverLocationTracking(): Promise<{
  success: boolean
  action?: 'none' | 'request_permission' | 'open_settings' | 'restart_tracking'
  message?: string
}> {
  try {
    const health = await getLocationHealthStatus()

    if (!health.needsRecovery) {
      return { success: true, action: 'none' }
    }

    const settings = await getTrackingSettings()
    if (!settings?.enabled) {
      return { success: true, action: 'none', message: 'Tracking not enabled' }
    }

    if (!health.hasPermission) {
      if (health.permissionStatus === 'denied') {
        return {
          success: false,
          action: 'open_settings',
          message: 'Location permission was denied. Please enable it in Settings.',
        }
      }
      const granted = await requestBackgroundLocationPermission()
      if (!granted) {
        return {
          success: false,
          action: 'request_permission',
          message: 'Location permission is required for background tracking.',
        }
      }
    }

    const started = await startBackgroundLocationTracking(settings.userId, settings.promptMinutes)
    return started
      ? { success: true, action: 'restart_tracking', message: 'Background location tracking restored.' }
      : { success: false, action: 'restart_tracking', message: 'Failed to restart location tracking.' }
  } catch (err) {
    captureException(err, { operation: 'recoverLocationTracking' })
    return { success: false, message: 'Recovery failed due to an unexpected error.' }
  }
}

/**
 * Get background task diagnostics for debugging
 */
export async function getTaskDiagnostics(): Promise<Record<string, unknown> | null> {
  try {
    const stored = await AsyncStorage.getItem(TASK_DIAGNOSTICS_KEY)
    return stored ? JSON.parse(stored) : null
  } catch {
    return null
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
  getLocationHealthStatus,
  recoverLocationTracking,
}
