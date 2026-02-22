/**
 * Geo-Privacy Utilities
 *
 * Centralized utilities for GPS coordinate precision reduction.
 * Used across the app to ensure GDPR-compliant location privacy.
 *
 * Precision levels:
 * - 2 decimal places (~1.1km resolution) - For general proximity, prevents exact building identification
 * - 4 decimal places (~11m resolution) - For check-in verification, balances privacy with accuracy
 *
 * @example
 * ```typescript
 * import { reduceCoordinatePrecision } from './geoPrivacy'
 *
 * const safeLat = reduceCoordinatePrecision(37.7749295, 4) // 37.7749
 * const safeLon = reduceCoordinatePrecision(-122.4194155, 4) // -122.4194
 * ```
 */

/**
 * Reduce GPS coordinate precision for privacy (GDPR-compliant).
 *
 * Rounds coordinates to a specified number of decimal places to prevent
 * identifying exact buildings while enabling general proximity detection.
 * Complies with data minimization principles for location privacy.
 *
 * @param coord - The coordinate value (latitude or longitude)
 * @param decimalPlaces - Number of decimal places (default: 4 for ~11m precision)
 * @returns Coordinate rounded to specified precision
 *
 * @example
 * ```typescript
 * // For check-in verification (~11m precision)
 * const lat = reduceCoordinatePrecision(37.7749295, 4) // 37.7749
 *
 * // For general proximity (~1.1km precision)
 * const lat = reduceCoordinatePrecision(37.7749295, 2) // 37.77
 * ```
 */
export function reduceCoordinatePrecision(
  coord: number,
  decimalPlaces: number = 4
): number {
  const multiplier = Math.pow(10, decimalPlaces)
  return Math.round(coord * multiplier) / multiplier
}
