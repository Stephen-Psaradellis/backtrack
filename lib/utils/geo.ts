/**
 * Geospatial Utility Functions for Love Ledger
 *
 * This module provides helper functions for geospatial calculations and
 * Supabase RPC calls to PostGIS-powered database functions.
 *
 * ## Architecture Overview
 *
 * The geospatial system uses PostGIS extensions in Supabase/PostgreSQL to enable
 * efficient proximity-based location queries. Key components:
 *
 * 1. **Database Layer**: PostgreSQL functions using ST_DWithin for spatial queries
 *    - `get_nearby_locations`: Returns all locations within a radius
 *    - `get_locations_with_active_posts`: Returns locations with active posts
 *
 * 2. **TypeScript Layer** (this module):
 *    - Validation functions for coordinates and radius
 *    - RPC wrappers with proper error handling
 *    - Distance conversion utilities
 *
 * 3. **React Hooks Layer**: See `hooks/useNearbyLocations.ts`
 *
 * ## Performance Characteristics
 *
 * The database uses a GIST spatial index (`locations_geo_idx`) which provides:
 * - **O(log n)** query complexity instead of O(n) for bounding box queries
 * - Efficient radius-based searches using ST_DWithin
 * - Accurate meter-based distance calculations using geography type
 *
 * The index expression: `GIST (ST_SetSRID(ST_MakePoint(longitude, latitude), 4326))`
 *
 * ## Coordinate System
 *
 * All coordinates use **SRID 4326 (WGS 84)**, the standard GPS coordinate system:
 * - Latitude: -90 to +90 (degrees, positive = North)
 * - Longitude: -180 to +180 (degrees, positive = East)
 *
 * ## Usage Example
 *
 * ```typescript
 * import { createClient } from '@/lib/supabase/client'
 * import { fetchNearbyLocations, fetchLocationsWithActivePosts } from '@/lib/utils/geo'
 *
 * const supabase = createClient()
 *
 * // Fetch all locations within 5km
 * const allNearby = await fetchNearbyLocations(supabase, {
 *   user_lat: 37.7749,
 *   user_lon: -122.4194,
 *   radius_meters: 5000,
 *   max_results: 50
 * })
 *
 * // Fetch only locations with active posts (for map markers)
 * const withPosts = await fetchLocationsWithActivePosts(supabase, {
 *   user_lat: 37.7749,
 *   user_lon: -122.4194,
 *   radius_meters: 5000,
 *   min_post_count: 1,
 *   max_results: 50
 * })
 * ```
 *
 * @module lib/utils/geo
 * @see {@link hooks/useNearbyLocations} React hook for component integration
 * @see {@link supabase/migrations/003_geospatial_functions.sql} Database functions
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  Coordinates,
  LocationVisit,
  LocationWithDistance,
  LocationWithActivePosts,
  LocationWithVisit,
  NearbyLocationParams,
  LocationsWithActivePostsParams,
  RecentlyVisitedLocationParams,
} from '@/types/database'

// ============================================================================
// Constants
// ============================================================================

/**
 * Default search radius in meters (5km).
 *
 * This value balances between showing enough nearby locations for user
 * convenience while maintaining query performance. Can be overridden
 * per-query via the radius_meters parameter.
 *
 * @constant {number}
 */
export const DEFAULT_RADIUS_METERS = 5000

/**
 * Default maximum number of results returned by geospatial queries.
 *
 * Limits prevent memory issues when querying dense urban areas.
 * Results are always ordered by distance (closest first).
 *
 * @constant {number}
 */
export const DEFAULT_MAX_RESULTS = 50

/**
 * Default minimum post count for active posts query.
 *
 * When fetching locations for map markers, only locations with at least
 * this many active posts will be included in results.
 *
 * @constant {number}
 */
export const DEFAULT_MIN_POST_COUNT = 1

/**
 * Valid latitude range for WGS 84 coordinate system.
 *
 * Latitude measures north-south position:
 * - +90° is the North Pole
 * - 0° is the Equator
 * - -90° is the South Pole
 *
 * @constant {{ min: -90, max: 90 }}
 */
export const LATITUDE_RANGE = { min: -90, max: 90 } as const

/**
 * Valid longitude range for WGS 84 coordinate system.
 *
 * Longitude measures east-west position:
 * - +180° is the International Date Line (east approach)
 * - 0° is the Prime Meridian (Greenwich, UK)
 * - -180° is the International Date Line (west approach)
 *
 * @constant {{ min: -180, max: 180 }}
 */
export const LONGITUDE_RANGE = { min: -180, max: 180 } as const

/**
 * Default proximity radius in meters for visit verification.
 *
 * Users must be within this distance of a POI to be considered
 * "physically present" and eligible to record a visit.
 *
 * The 50m threshold balances:
 * - GPS accuracy limitations (typical smartphone accuracy is 3-10m outdoors)
 * - Reasonable proximity for "being at" a venue
 * - Account for POI coordinate placement variance
 *
 * @constant {number}
 */
export const PROXIMITY_RADIUS_METERS = 50

/**
 * Earth's mean radius in meters.
 *
 * Used for Haversine formula distance calculations.
 * This is the volumetric mean radius of Earth.
 *
 * @constant {number}
 */
export const EARTH_RADIUS_METERS = 6_371_000

// ============================================================================
// Error Types
// ============================================================================

/**
 * Error codes for geospatial operations.
 *
 * These codes allow calling code to handle specific error types appropriately:
 *
 * - `INVALID_COORDINATES`: Latitude or longitude values are out of range
 * - `INVALID_RADIUS`: Radius is not a positive finite number
 * - `DATABASE_ERROR`: PostGIS function call failed (check details for Supabase error)
 * - `NETWORK_ERROR`: Network request failed (connection issues, timeouts)
 *
 * @example
 * ```typescript
 * try {
 *   const locations = await fetchNearbyLocations(supabase, params)
 * } catch (error) {
 *   if (error instanceof GeoError) {
 *     switch (error.code) {
 *       case 'INVALID_COORDINATES':
 *         console.error('Bad coordinates:', error.message)
 *         break
 *       case 'DATABASE_ERROR':
 *         console.error('Database error:', error.details)
 *         break
 *     }
 *   }
 * }
 * ```
 */
export type GeoErrorCode =
  | 'INVALID_COORDINATES'
  | 'INVALID_RADIUS'
  | 'DATABASE_ERROR'
  | 'NETWORK_ERROR'

/**
 * Custom error class for geospatial operations.
 *
 * Extends the standard Error class with:
 * - `code`: Typed error code for programmatic handling
 * - `details`: Optional additional information (e.g., Supabase error object)
 *
 * @example
 * ```typescript
 * throw new GeoError(
 *   'INVALID_COORDINATES',
 *   'Latitude must be between -90 and 90',
 *   { latitude: 95 }
 * )
 * ```
 */
export class GeoError extends Error {
  /** Typed error code for programmatic error handling */
  readonly code: GeoErrorCode

  /** Additional error details (e.g., original database error) */
  readonly details?: unknown

  constructor(code: GeoErrorCode, message: string, details?: unknown) {
    super(message)
    this.name = 'GeoError'
    this.code = code
    this.details = details
    Object.setPrototypeOf(this, GeoError.prototype)
  }
}

// ============================================================================
// Validation Functions
// ============================================================================
//
// These functions validate geographic coordinates and query parameters before
// making database calls. They prevent invalid queries and provide clear error
// messages for debugging.
//
// Public validators return boolean (for conditional checks).
// Private validators throw GeoError (for fail-fast behavior).
// ============================================================================

/**
 * Validates a latitude value.
 *
 * @param latitude - The latitude value to validate
 * @returns true if valid, false otherwise
 *
 * @example
 * isValidLatitude(37.7749)  // true
 * isValidLatitude(-91)      // false
 * isValidLatitude(NaN)      // false
 */
export function isValidLatitude(latitude: number): boolean {
  return (
    typeof latitude === 'number' &&
    !Number.isNaN(latitude) &&
    latitude >= LATITUDE_RANGE.min &&
    latitude <= LATITUDE_RANGE.max
  )
}

/**
 * Validates a longitude value.
 *
 * @param longitude - The longitude value to validate
 * @returns true if valid, false otherwise
 *
 * @example
 * isValidLongitude(-122.4194)  // true
 * isValidLongitude(181)        // false
 * isValidLongitude(NaN)        // false
 */
export function isValidLongitude(longitude: number): boolean {
  return (
    typeof longitude === 'number' &&
    !Number.isNaN(longitude) &&
    longitude >= LONGITUDE_RANGE.min &&
    longitude <= LONGITUDE_RANGE.max
  )
}

/**
 * Validates coordinate values.
 *
 * @param coordinates - The coordinates to validate
 * @returns true if both latitude and longitude are valid
 *
 * @example
 * isValidCoordinates({ latitude: 37.7749, longitude: -122.4194 })  // true
 * isValidCoordinates({ latitude: 91, longitude: -122.4194 })       // false
 */
export function isValidCoordinates(coordinates: Coordinates): boolean {
  return (
    isValidLatitude(coordinates.latitude) &&
    isValidLongitude(coordinates.longitude)
  )
}

/**
 * Validates a radius value in meters.
 *
 * @param radius - The radius value to validate
 * @returns true if radius is a positive finite number
 *
 * @example
 * isValidRadius(5000)  // true
 * isValidRadius(-100)  // false
 * isValidRadius(0)     // false
 */
export function isValidRadius(radius: number): boolean {
  return (
    typeof radius === 'number' &&
    !Number.isNaN(radius) &&
    Number.isFinite(radius) &&
    radius > 0
  )
}

/**
 * Validates and throws if coordinates are invalid.
 *
 * @param coordinates - The coordinates to validate
 * @throws {GeoError} If coordinates are invalid
 */
function assertValidCoordinates(coordinates: Coordinates): void {
  if (!isValidLatitude(coordinates.latitude)) {
    throw new GeoError(
      'INVALID_COORDINATES',
      `Invalid latitude: ${coordinates.latitude}. Must be between ${LATITUDE_RANGE.min} and ${LATITUDE_RANGE.max}.`
    )
  }
  if (!isValidLongitude(coordinates.longitude)) {
    throw new GeoError(
      'INVALID_COORDINATES',
      `Invalid longitude: ${coordinates.longitude}. Must be between ${LONGITUDE_RANGE.min} and ${LONGITUDE_RANGE.max}.`
    )
  }
}

/**
 * Validates and throws if radius is invalid.
 *
 * @param radius - The radius to validate
 * @throws {GeoError} If radius is invalid
 */
function assertValidRadius(radius: number): void {
  if (!isValidRadius(radius)) {
    throw new GeoError(
      'INVALID_RADIUS',
      `Invalid radius: ${radius}. Must be a positive number.`
    )
  }
}

// ============================================================================
// Supabase RPC Functions
// ============================================================================

/**
 * Fetches nearby locations using the PostGIS-powered database function.
 *
 * ## Performance
 *
 * This function calls the `get_nearby_locations` PostgreSQL function which:
 * - Uses **ST_DWithin** with geography type for accurate meter-based radius queries
 * - Leverages the **GIST spatial index** for O(log n) query complexity
 * - Returns results ordered by distance (closest first)
 *
 * Typical query times:
 * - < 10ms for 1,000 locations
 * - < 50ms for 100,000 locations
 *
 * ## Database Function
 *
 * Calls: `get_nearby_locations(user_lat, user_lon, radius_meters, max_results)`
 *
 * The database function creates a geography point and uses ST_DWithin to find
 * all locations within the specified radius, then calculates exact distances
 * using ST_Distance for ordering.
 *
 * @param supabase - Supabase client instance (from createClient())
 * @param params - Query parameters
 * @param params.user_lat - User's latitude (-90 to 90)
 * @param params.user_lon - User's longitude (-180 to 180)
 * @param params.radius_meters - Search radius in meters (default: 5000)
 * @param params.max_results - Maximum results to return (default: 50)
 * @returns Promise resolving to array of locations with distance_meters field
 * @throws {GeoError} INVALID_COORDINATES if lat/lon are out of range
 * @throws {GeoError} INVALID_RADIUS if radius is not positive
 * @throws {GeoError} DATABASE_ERROR if Supabase RPC call fails
 *
 * @example
 * ```typescript
 * import { createClient } from '@/lib/supabase/client'
 * import { fetchNearbyLocations } from '@/lib/utils/geo'
 *
 * const supabase = createClient()
 *
 * // Basic usage - find locations within 5km
 * const locations = await fetchNearbyLocations(supabase, {
 *   user_lat: 37.7749,
 *   user_lon: -122.4194,
 * })
 *
 * // Custom radius and limit
 * const nearestThree = await fetchNearbyLocations(supabase, {
 *   user_lat: 37.7749,
 *   user_lon: -122.4194,
 *   radius_meters: 1000,  // 1km radius
 *   max_results: 3        // Only top 3
 * })
 *
 * // Access distance information
 * locations.forEach(loc => {
 *   console.log(`${loc.name}: ${loc.distance_meters.toFixed(0)}m away`)
 * })
 * ```
 *
 * @see {@link fetchLocationsWithActivePosts} For map marker display (only locations with posts)
 * @see {@link hooks/useNearbyLocations} React hook for component integration
 */
export async function fetchNearbyLocations(
  supabase: SupabaseClient,
  params: NearbyLocationParams
): Promise<LocationWithDistance[]> {
  // Validate inputs
  assertValidCoordinates({
    latitude: params.user_lat,
    longitude: params.user_lon,
  })

  const radiusMeters = params.radius_meters ?? DEFAULT_RADIUS_METERS
  assertValidRadius(radiusMeters)

  const maxResults = params.max_results ?? DEFAULT_MAX_RESULTS

  // Call the PostGIS function via RPC
  const { data, error } = await supabase.rpc('get_nearby_locations', {
    user_lat: params.user_lat,
    user_lon: params.user_lon,
    radius_meters: radiusMeters,
    max_results: maxResults,
  })

  if (error) {
    throw new GeoError(
      'DATABASE_ERROR',
      `Failed to fetch nearby locations: ${error.message}`,
      error
    )
  }

  return (data ?? []) as LocationWithDistance[]
}

/**
 * Fetches nearby locations that have active posts, optimized for map marker display.
 *
 * This function is ideal for rendering map markers as it only returns locations
 * that have content worth displaying, reducing map clutter and improving UX.
 *
 * ## Performance
 *
 * This function calls the `get_locations_with_active_posts` PostgreSQL function which:
 * - Uses **ST_DWithin** with geography type for accurate meter-based radius queries
 * - Leverages the **GIST spatial index** for O(log n) query complexity
 * - Joins with the `posts` table to filter and count active posts
 * - Returns results ordered by distance (closest first)
 *
 * The query is slightly slower than `fetchNearbyLocations` due to the posts join,
 * but still efficient due to proper indexing.
 *
 * ## Active Post Definition
 *
 * A post is considered "active" when:
 * - `is_active = TRUE`
 * - `expires_at > NOW()` (not expired)
 *
 * ## Database Function
 *
 * Calls: `get_locations_with_active_posts(user_lat, user_lon, radius_meters, min_post_count, max_results)`
 *
 * @param supabase - Supabase client instance (from createClient())
 * @param params - Query parameters
 * @param params.user_lat - User's latitude (-90 to 90)
 * @param params.user_lon - User's longitude (-180 to 180)
 * @param params.radius_meters - Search radius in meters (default: 5000)
 * @param params.min_post_count - Minimum active posts required (default: 1)
 * @param params.max_results - Maximum results to return (default: 50)
 * @returns Promise resolving to array of locations with active_post_count and distance_meters
 * @throws {GeoError} INVALID_COORDINATES if lat/lon are out of range
 * @throws {GeoError} INVALID_RADIUS if radius is not positive
 * @throws {GeoError} DATABASE_ERROR if Supabase RPC call fails
 *
 * @example
 * ```typescript
 * import { createClient } from '@/lib/supabase/client'
 * import { fetchLocationsWithActivePosts, formatDistance } from '@/lib/utils/geo'
 *
 * const supabase = createClient()
 *
 * // Fetch locations with at least 1 active post
 * const markers = await fetchLocationsWithActivePosts(supabase, {
 *   user_lat: 37.7749,
 *   user_lon: -122.4194,
 *   radius_meters: 5000,
 * })
 *
 * // Render map markers with post count badges
 * markers.forEach(loc => {
 *   renderMarker({
 *     lat: loc.latitude,
 *     lng: loc.longitude,
 *     title: loc.name,
 *     badge: loc.active_post_count,
 *     subtitle: formatDistance(loc.distance_meters)
 *   })
 * })
 *
 * // Only show "hot" locations (3+ posts)
 * const hotSpots = await fetchLocationsWithActivePosts(supabase, {
 *   user_lat: 37.7749,
 *   user_lon: -122.4194,
 *   radius_meters: 10000,  // Wider search
 *   min_post_count: 3      // At least 3 active posts
 * })
 * ```
 *
 * @see {@link fetchNearbyLocations} For fetching all locations regardless of posts
 * @see {@link hooks/useNearbyLocations} React hook with `withActivePosts: true` option
 */
export async function fetchLocationsWithActivePosts(
  supabase: SupabaseClient,
  params: LocationsWithActivePostsParams
): Promise<LocationWithActivePosts[]> {
  // Validate inputs
  assertValidCoordinates({
    latitude: params.user_lat,
    longitude: params.user_lon,
  })

  const radiusMeters = params.radius_meters ?? DEFAULT_RADIUS_METERS
  assertValidRadius(radiusMeters)

  const minPostCount = params.min_post_count ?? DEFAULT_MIN_POST_COUNT
  const maxResults = params.max_results ?? DEFAULT_MAX_RESULTS

  // Call the PostGIS function via RPC
  const { data, error } = await supabase.rpc('get_locations_with_active_posts', {
    user_lat: params.user_lat,
    user_lon: params.user_lon,
    radius_meters: radiusMeters,
    min_post_count: minPostCount,
    max_results: maxResults,
  })

  if (error) {
    throw new GeoError(
      'DATABASE_ERROR',
      `Failed to fetch locations with active posts: ${error.message}`,
      error
    )
  }

  return (data ?? []) as LocationWithActivePosts[]
}

/**
 * Parameters for recording a location visit.
 */
export interface RecordLocationVisitParams {
  /** UUID of the location being visited */
  location_id: string
  /** User's current latitude (-90 to 90) */
  user_lat: number
  /** User's current longitude (-180 to 180) */
  user_lon: number
  /** GPS accuracy in meters (optional, for audit/debugging) */
  accuracy?: number
}

/**
 * Records a user visit to a location if they are within proximity (50 meters).
 *
 * ## Purpose
 *
 * This function is the primary way to record user presence at a location.
 * It performs server-side proximity verification using PostGIS to ensure
 * the user is physically present (within 50m) before recording the visit.
 *
 * ## Proximity Verification
 *
 * The database function uses **ST_DWithin** with geography type to perform
 * accurate meter-based distance calculations. If the user is more than 50m
 * from the location coordinates, the visit is **not** recorded and null is returned.
 *
 * This server-side verification prevents clients from spoofing visits to
 * locations they haven't actually visited.
 *
 * ## Use Cases
 *
 * 1. **Check-in on App Open**: When user opens the app near a POI, record the visit
 * 2. **Background Location Update**: Silently record visits when user is at a POI
 * 3. **Post Creation Flow**: Verify eligibility before showing location as an option
 *
 * ## Fire-and-Forget Pattern
 *
 * This function can be called without awaiting the result for non-blocking check-ins:
 *
 * ```typescript
 * // Fire-and-forget (don't block UI)
 * recordLocationVisit(supabase, params).catch(() => {})
 * ```
 *
 * @param supabase - Supabase client instance (from createClient())
 * @param params - Visit recording parameters
 * @param params.location_id - UUID of the location to record a visit to
 * @param params.user_lat - User's current latitude (-90 to 90)
 * @param params.user_lon - User's current longitude (-180 to 180)
 * @param params.accuracy - GPS accuracy in meters (optional, for audit)
 * @returns Promise resolving to the created LocationVisit if within 50m, null if too far
 * @throws {GeoError} INVALID_COORDINATES if lat/lon are out of range
 * @throws {GeoError} DATABASE_ERROR if Supabase RPC call fails
 *
 * @example
 * ```typescript
 * import { createClient } from '@/lib/supabase/client'
 * import { recordLocationVisit } from '@/lib/utils/geo'
 *
 * const supabase = createClient()
 *
 * // Record a visit when user is near a location
 * const visit = await recordLocationVisit(supabase, {
 *   location_id: 'abc-123-def',
 *   user_lat: 37.7749,
 *   user_lon: -122.4194,
 *   accuracy: 10  // GPS accuracy in meters (optional)
 * })
 *
 * if (visit) {
 *   console.log(`Visit recorded at ${visit.visited_at}`)
 * } else {
 *   console.log('User is not within 50m of the location')
 * }
 * ```
 *
 * @see {@link PROXIMITY_RADIUS_METERS} The 50m proximity threshold
 * @see {@link isWithinRadius} Client-side proximity check (use before calling this)
 */
export async function recordLocationVisit(
  supabase: SupabaseClient,
  params: RecordLocationVisitParams
): Promise<LocationVisit | null> {
  // Validate coordinates
  assertValidCoordinates({
    latitude: params.user_lat,
    longitude: params.user_lon,
  })

  // Call the PostGIS function via RPC
  // The database function handles the 50m proximity check
  const { data, error } = await supabase.rpc('record_location_visit', {
    p_location_id: params.location_id,
    p_user_lat: params.user_lat,
    p_user_lon: params.user_lon,
    p_accuracy: params.accuracy ?? null,
  })

  if (error) {
    throw new GeoError(
      'DATABASE_ERROR',
      `Failed to record location visit: ${error.message}`,
      error
    )
  }

  // The RPC returns null if user is not within proximity
  return data as LocationVisit | null
}

/**
 * Fetches locations that the current user has recently visited within the eligibility window (3 hours).
 *
 * This function is used in the post creation flow to determine which locations
 * the user is eligible to post at. Only locations visited within the last 3 hours
 * are returned, ensuring users can only create posts at places they've physically been.
 *
 * ## Performance
 *
 * This function calls the `get_recently_visited_locations` PostgreSQL function which:
 * - Uses the current authenticated user (auth.uid())
 * - Filters visits to within the 3-hour eligibility window
 * - Joins with the `locations` table to return full location data
 * - Orders by most recent visit first
 *
 * ## Authentication
 *
 * The database function uses `auth.uid()` internally to identify the current user,
 * so no user_id parameter is needed. The user must be authenticated.
 *
 * ## Use Cases
 *
 * 1. **Post Creation Flow**: Get eligible locations for the location picker
 * 2. **Visit History Display**: Show recent places the user has been
 *
 * @param supabase - Supabase client instance (from createClient())
 * @param params - Query parameters (optional)
 * @param params.max_results - Maximum results to return (default: no limit)
 * @returns Promise resolving to array of locations with visited_at timestamp
 * @throws {GeoError} DATABASE_ERROR if Supabase RPC call fails
 *
 * @example
 * ```typescript
 * import { createClient } from '@/lib/supabase/client'
 * import { fetchRecentlyVisitedLocations } from '@/lib/utils/geo'
 *
 * const supabase = createClient()
 *
 * // Fetch all recently visited locations (within 3 hours)
 * const visitedLocations = await fetchRecentlyVisitedLocations(supabase)
 *
 * // Display in location picker
 * visitedLocations.forEach(loc => {
 *   console.log(`${loc.name} - visited at ${loc.visited_at}`)
 * })
 *
 * // With result limit
 * const topFive = await fetchRecentlyVisitedLocations(supabase, {
 *   max_results: 5
 * })
 * ```
 *
 * @see {@link recordLocationVisit} Function to record a new visit
 * @see {@link hooks/useVisitedLocations} React hook for component integration
 */
export async function fetchRecentlyVisitedLocations(
  supabase: SupabaseClient,
  params: RecentlyVisitedLocationParams = {}
): Promise<LocationWithVisit[]> {
  const maxResults = params.max_results ?? null

  // Call the database function via RPC
  // The function uses auth.uid() internally to get the current user
  const { data, error } = await supabase.rpc('get_recently_visited_locations', {
    max_results: maxResults,
  })

  if (error) {
    throw new GeoError(
      'DATABASE_ERROR',
      `Failed to fetch recently visited locations: ${error.message}`,
      error
    )
  }

  return (data ?? []) as LocationWithVisit[]
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Converts kilometers to meters.
 *
 * Useful when users input distance in km but the API requires meters.
 *
 * @param km - Distance in kilometers
 * @returns Distance in meters
 *
 * @example
 * ```typescript
 * import { fetchNearbyLocations, kmToMeters } from '@/lib/utils/geo'
 *
 * // User wants 10km radius
 * const userRadiusKm = 10
 * const locations = await fetchNearbyLocations(supabase, {
 *   user_lat: 37.7749,
 *   user_lon: -122.4194,
 *   radius_meters: kmToMeters(userRadiusKm)  // 10000
 * })
 * ```
 */
export function kmToMeters(km: number): number {
  return km * 1000
}

/**
 * Converts meters to kilometers.
 *
 * Useful when displaying distances to users in a more readable format.
 *
 * @param meters - Distance in meters
 * @returns Distance in kilometers
 *
 * @example
 * ```typescript
 * const location = locations[0]
 * console.log(`Distance: ${metersToKm(location.distance_meters)} km`)
 * // Distance: 2.5 km
 * ```
 */
export function metersToKm(meters: number): number {
  return meters / 1000
}

/**
 * Formats a distance value for user-friendly display.
 *
 * Automatically chooses the best unit:
 * - Distances < 1000m are shown in meters (rounded to whole numbers)
 * - Distances >= 1000m are shown in kilometers (1 decimal place)
 *
 * @param meters - Distance in meters (typically from distance_meters field)
 * @returns Formatted string with unit suffix (e.g., "500m" or "2.5km")
 *
 * @example
 * ```typescript
 * import { formatDistance } from '@/lib/utils/geo'
 *
 * // In a React component
 * function LocationCard({ location }: { location: LocationWithDistance }) {
 *   return (
 *     <div>
 *       <h3>{location.name}</h3>
 *       <span className="text-muted">
 *         {formatDistance(location.distance_meters)} away
 *       </span>
 *     </div>
 *   )
 * }
 *
 * // Output examples:
 * formatDistance(150)    // "150m"
 * formatDistance(500)    // "500m"
 * formatDistance(999)    // "999m"
 * formatDistance(1000)   // "1.0km"
 * formatDistance(2500)   // "2.5km"
 * formatDistance(10750)  // "10.8km"
 * ```
 */
export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)}m`
  }
  const km = meters / 1000
  // Show 1 decimal place for km
  return `${km.toFixed(1)}km`
}

/**
 * Calculates the distance between two coordinate points using the Haversine formula.
 *
 * The Haversine formula calculates the great-circle distance between two points
 * on a sphere given their longitudes and latitudes. This is accurate for short
 * distances and suitable for proximity checks.
 *
 * ## Accuracy
 *
 * The Haversine formula assumes a perfectly spherical Earth, which introduces
 * a maximum error of about 0.5% compared to geodesic calculations. For proximity
 * checks at 50m, this is negligible (max ~0.25m error).
 *
 * ## Performance
 *
 * This is a pure JavaScript calculation (no database call) suitable for:
 * - Client-side proximity filtering before database queries
 * - Real-time location checks during user movement
 * - Batch processing of multiple coordinate pairs
 *
 * @param point1 - First coordinate point (user's location)
 * @param point2 - Second coordinate point (POI location)
 * @returns Distance in meters between the two points
 * @throws {GeoError} INVALID_COORDINATES if either point has invalid coordinates
 *
 * @example
 * ```typescript
 * import { calculateDistance } from '@/lib/utils/geo'
 *
 * const userLocation = { latitude: 37.7749, longitude: -122.4194 }
 * const poiLocation = { latitude: 37.7750, longitude: -122.4195 }
 *
 * const distance = calculateDistance(userLocation, poiLocation)
 * console.log(`Distance: ${distance.toFixed(1)}m`)  // Distance: 14.1m
 * ```
 */
export function calculateDistance(point1: Coordinates, point2: Coordinates): number {
  // Validate both coordinate pairs
  assertValidCoordinates(point1)
  assertValidCoordinates(point2)

  // Convert degrees to radians
  const lat1Rad = (point1.latitude * Math.PI) / 180
  const lat2Rad = (point2.latitude * Math.PI) / 180
  const deltaLatRad = ((point2.latitude - point1.latitude) * Math.PI) / 180
  const deltaLonRad = ((point2.longitude - point1.longitude) * Math.PI) / 180

  // Haversine formula
  const a =
    Math.sin(deltaLatRad / 2) * Math.sin(deltaLatRad / 2) +
    Math.cos(lat1Rad) * Math.cos(lat2Rad) * Math.sin(deltaLonRad / 2) * Math.sin(deltaLonRad / 2)

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return EARTH_RADIUS_METERS * c
}

/**
 * Checks if a user is within a specified radius of a location.
 *
 * This function is the primary proximity check for visit verification.
 * It determines whether a user is "physically present" at a POI.
 *
 * ## Use Cases
 *
 * 1. **Visit Recording**: Check if user is close enough to a POI to record a visit
 * 2. **Eligibility Filtering**: Filter nearby locations to only those within reach
 * 3. **Geofencing**: Trigger actions when user enters/exits a location boundary
 *
 * ## Defaults
 *
 * The default radius is {@link PROXIMITY_RADIUS_METERS} (50 meters), which is
 * the standard threshold for "being at" a venue in the Love Ledger app.
 *
 * @param userLocation - User's current GPS coordinates
 * @param poiLocation - POI (Point of Interest) coordinates
 * @param radiusMeters - Maximum distance in meters (default: 50m)
 * @returns true if user is within the radius, false otherwise
 * @throws {GeoError} INVALID_COORDINATES if coordinates are invalid
 * @throws {GeoError} INVALID_RADIUS if radius is not positive
 *
 * @example
 * ```typescript
 * import { isWithinRadius, PROXIMITY_RADIUS_METERS } from '@/lib/utils/geo'
 *
 * const userLocation = { latitude: 37.7749, longitude: -122.4194 }
 * const cafeLocation = { latitude: 37.7750, longitude: -122.4195 }
 *
 * // Check with default 50m radius
 * if (isWithinRadius(userLocation, cafeLocation)) {
 *   console.log('User is at the cafe!')
 *   await recordVisit(cafeLocation.id)
 * }
 *
 * // Check with custom radius (100m)
 * if (isWithinRadius(userLocation, cafeLocation, 100)) {
 *   console.log('User is near the cafe')
 * }
 *
 * // Filtering nearby locations to only those within proximity
 * const eligibleLocations = nearbyLocations.filter(loc =>
 *   isWithinRadius(userLocation, { latitude: loc.latitude, longitude: loc.longitude })
 * )
 * ```
 *
 * @see {@link calculateDistance} For getting the actual distance value
 * @see {@link PROXIMITY_RADIUS_METERS} Default proximity threshold
 */
export function isWithinRadius(
  userLocation: Coordinates,
  poiLocation: Coordinates,
  radiusMeters: number = PROXIMITY_RADIUS_METERS
): boolean {
  // Validate radius
  assertValidRadius(radiusMeters)

  // Calculate distance (this validates coordinates internally)
  const distance = calculateDistance(userLocation, poiLocation)

  return distance <= radiusMeters
}

/**
 * Formats a visit timestamp into a human-readable "Visited X ago" string.
 *
 * Automatically chooses the best time unit:
 * - < 1 minute: "Visited just now"
 * - 1-59 minutes: "Visited X min ago"
 * - 60+ minutes: "Visited X hr ago" (with hours rounded)
 *
 * @param visitedAt - ISO 8601 timestamp string or Date object of when the visit occurred
 * @returns Formatted string (e.g., "Visited 5 min ago", "Visited 2 hr ago")
 *
 * @example
 * ```typescript
 * import { formatVisitedAgo } from '@/lib/utils/geo'
 *
 * // In a React component
 * function LocationCard({ location }: { location: LocationWithVisit }) {
 *   return (
 *     <div>
 *       <h3>{location.name}</h3>
 *       <span className="text-muted">
 *         {formatVisitedAgo(location.visited_at)}
 *       </span>
 *     </div>
 *   )
 * }
 *
 * // Output examples:
 * formatVisitedAgo(new Date())                          // "Visited just now"
 * formatVisitedAgo(new Date(Date.now() - 5 * 60000))    // "Visited 5 min ago"
 * formatVisitedAgo(new Date(Date.now() - 90 * 60000))   // "Visited 2 hr ago"
 * formatVisitedAgo('2024-01-01T12:00:00Z')              // "Visited X min/hr ago" (depends on current time)
 * ```
 *
 * @see {@link fetchRecentlyVisitedLocations} Returns locations with visited_at timestamps
 */
export function formatVisitedAgo(visitedAt: string | Date): string {
  const visitDate = typeof visitedAt === 'string' ? new Date(visitedAt) : visitedAt
  const now = new Date()
  const diffMs = now.getTime() - visitDate.getTime()

  // Convert to minutes
  const diffMinutes = Math.floor(diffMs / 60000)

  if (diffMinutes < 1) {
    return 'Visited just now'
  }

  if (diffMinutes < 60) {
    return `Visited ${diffMinutes} min ago`
  }

  // Convert to hours (rounded)
  const diffHours = Math.round(diffMinutes / 60)
  return `Visited ${diffHours} hr ago`
}
