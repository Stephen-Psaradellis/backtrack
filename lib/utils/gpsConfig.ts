/**
 * GPS Configuration Constants
 *
 * Centralized configuration for GPS verification, dynamic radius calculation,
 * and accuracy thresholds used throughout the check-in system.
 *
 * ## Dynamic Radius Formula
 * ```
 * effective_radius = BASE_RADIUS + min(accuracy * BUFFER_FACTOR, MAX_BUFFER)
 * ```
 *
 * ## Example Calculations
 * | GPS Accuracy | Buffer | Effective Radius |
 * |--------------|--------|------------------|
 * | 5m (excellent) | 7.5m | 57.5m |
 * | 15m (good) | 22.5m | 72.5m |
 * | 30m (fair) | 45m | 95m |
 * | 50m (poor) | 75m | 125m |
 * | 75m (max) | 100m | 150m |
 * | >75m | REJECTED | - |
 */

// ============================================================================
// CHECK-IN VERIFICATION CONFIG
// ============================================================================

/**
 * Configuration for check-in GPS verification with dynamic radius
 */
export const CHECKIN_GPS_CONFIG = {
  /** Base verification radius in meters (minimum) */
  BASE_RADIUS: 50,

  /** Multiplier for GPS accuracy to calculate buffer */
  BUFFER_FACTOR: 1.5,

  /** Maximum buffer cap in meters (prevents excessive radius) */
  MAX_BUFFER: 100,

  /** Maximum acceptable GPS accuracy in meters (reject if worse) */
  MAX_ACCEPTABLE_ACCURACY: 75,

  /** Minimum acceptable GPS accuracy in meters (flag if suspiciously precise) */
  MIN_ACCEPTABLE_ACCURACY: 1,

  /** Default accuracy to use when not provided */
  DEFAULT_ACCURACY: 50,
} as const

// ============================================================================
// LOCATION VISIT CONFIG (stricter for posts)
// ============================================================================

/**
 * Configuration for location visits (post creation eligibility)
 */
export const VISIT_GPS_CONFIG = {
  /** Base verification radius in meters */
  BASE_RADIUS: 30,

  /** Multiplier for GPS accuracy */
  BUFFER_FACTOR: 1.0,

  /** Maximum buffer cap in meters */
  MAX_BUFFER: 50,

  /** Maximum acceptable GPS accuracy */
  MAX_ACCEPTABLE_ACCURACY: 50,

  /** Default accuracy */
  DEFAULT_ACCURACY: 30,
} as const

// ============================================================================
// BACKGROUND TRACKING CONFIG
// ============================================================================

/**
 * Enable debug mode for faster testing of background location features
 * Set to true to use 10-second intervals instead of 2 minutes
 */
export const BACKGROUND_DEBUG_MODE = __DEV__ && true // TESTING: Debug mode enabled for faster check-in prompts

/**
 * Configuration for background location tracking dwell detection
 */
export const BACKGROUND_GPS_CONFIG = {
  /** Dwell detection radius in meters */
  DWELL_RADIUS: 100,

  /** Distance threshold for location updates */
  DISTANCE_INTERVAL: BACKGROUND_DEBUG_MODE ? 10 : 50,

  /** Time interval between updates in milliseconds */
  TIME_INTERVAL_MS: BACKGROUND_DEBUG_MODE ? 10 * 1000 : 2 * 60 * 1000, // Debug: 10s, Prod: 2 min

  /** Leave threshold (hysteresis to prevent flip-flopping) */
  LEAVE_THRESHOLD: 200,

  /** Maximum acceptable accuracy for dwell detection */
  MAX_ACCEPTABLE_ACCURACY: 60,

  /** Debug mode indicator */
  DEBUG_MODE: BACKGROUND_DEBUG_MODE,
} as const

// ============================================================================
// LOCATION DISCOVERY CONFIG
// ============================================================================

/**
 * Configuration for finding nearby locations
 */
export const DISCOVERY_CONFIG = {
  /** Database search radius in meters */
  DATABASE_SEARCH_RADIUS: 500,

  /** Google Places search radius in meters */
  GOOGLE_PLACES_RADIUS: 1000,

  /** Maximum results from database */
  DATABASE_MAX_RESULTS: 10,

  /** Maximum results from Google Places */
  GOOGLE_MAX_RESULTS: 10,
} as const

// ============================================================================
// ACCURACY STATUS HELPERS
// ============================================================================

/**
 * Accuracy status levels
 */
export type AccuracyStatus =
  | 'excellent'  // ≤ 10m
  | 'good'       // ≤ 25m
  | 'fair'       // ≤ 50m
  | 'poor'       // ≤ 75m
  | 'rejected'   // > 75m
  | 'suspicious' // < 1m (potential spoofing)
  | 'defaulted'  // accuracy not provided
  | 'unknown'

/**
 * Get accuracy status based on reported accuracy
 */
export function getAccuracyStatus(accuracy: number | null | undefined): AccuracyStatus {
  if (accuracy === null || accuracy === undefined) {
    return 'defaulted'
  }

  if (accuracy < CHECKIN_GPS_CONFIG.MIN_ACCEPTABLE_ACCURACY) {
    return 'suspicious'
  }

  if (accuracy > CHECKIN_GPS_CONFIG.MAX_ACCEPTABLE_ACCURACY) {
    return 'rejected'
  }

  if (accuracy <= 10) return 'excellent'
  if (accuracy <= 25) return 'good'
  if (accuracy <= 50) return 'fair'
  return 'poor'
}

/**
 * Calculate effective verification radius based on accuracy
 */
export function calculateEffectiveRadius(
  accuracy: number | null | undefined,
  config = CHECKIN_GPS_CONFIG
): number {
  const effectiveAccuracy = accuracy ?? config.DEFAULT_ACCURACY

  if (effectiveAccuracy > config.MAX_ACCEPTABLE_ACCURACY) {
    // Return max possible radius for rejected accuracy (for display purposes)
    return config.BASE_RADIUS + config.MAX_BUFFER
  }

  const buffer = Math.min(effectiveAccuracy * config.BUFFER_FACTOR, config.MAX_BUFFER)
  return config.BASE_RADIUS + buffer
}

/**
 * Check if accuracy is acceptable for check-in
 */
export function isAccuracyAcceptable(
  accuracy: number | null | undefined,
  config = CHECKIN_GPS_CONFIG
): boolean {
  if (accuracy === null || accuracy === undefined) {
    return true // Allow with default accuracy
  }

  return accuracy <= config.MAX_ACCEPTABLE_ACCURACY
}

/**
 * Get user-friendly message for accuracy status
 */
export function getAccuracyMessage(status: AccuracyStatus): string {
  switch (status) {
    case 'excellent':
      return 'Excellent GPS signal'
    case 'good':
      return 'Good GPS signal'
    case 'fair':
      return 'Fair GPS signal'
    case 'poor':
      return 'Poor GPS signal - verification may be less precise'
    case 'rejected':
      return 'GPS signal too weak. Please move to an area with better reception.'
    case 'suspicious':
      return 'GPS signal unusually precise'
    case 'defaulted':
      return 'GPS accuracy unknown'
    default:
      return 'GPS status unknown'
  }
}
