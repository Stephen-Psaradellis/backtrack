/**
 * Location Search Service
 *
 * Handles venue search and discovery using Google Places REST API v1
 * and local Supabase cache. Provides hybrid search combining external
 * API results with cached venue data for optimal performance and cost.
 *
 * KEY CONCEPTS:
 * - Uses Google Places REST API v1 (NOT JavaScript SDK)
 * - X-Goog-FieldMask header is REQUIRED for all API calls
 * - Location bias improves search relevance for nearby venues
 * - Results are cached to Supabase for offline access and reduced API costs
 * - PostGIS-powered proximity queries for popular venues discovery
 *
 * @example
 * ```tsx
 * import { searchGooglePlaces, transformGooglePlace } from 'services/locationService'
 *
 * // Search for venues near user's location
 * const result = await searchGooglePlaces({
 *   query: 'Blue Bottle Coffee',
 *   latitude: 37.7749,
 *   longitude: -122.4194,
 * })
 *
 * if (result.success) {
 *   const venues = result.places.map(transformGooglePlace)
 *   console.log('Found venues:', venues)
 * }
 * ```
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  GooglePlace,
  GooglePlacesSearchResponse,
  GooglePlaceTransformed,
  VenueSearchParams,
  VenueSearchResults,
  Venue,
  LocationError,
  LocationErrorType,
} from '../types/location'
import type { Location, LocationInsert } from '../types/database'
import {
  GOOGLE_PLACES_FIELD_MASK,
  LOCATION_CONSTANTS,
} from '../types/location'
import { calculateDistance } from '../lib/utils/geo'

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Google Places API v1 base URL for searchText endpoint
 */
const GOOGLE_PLACES_API_URL = 'https://places.googleapis.com/v1/places:searchText'

/**
 * Error messages for location service operations
 */
export const LOCATION_SERVICE_ERRORS = {
  API_KEY_MISSING: 'Google Places API key is not configured. Please add NEXT_PUBLIC_GCP_MAPS_API_KEY to environment variables.',
  INVALID_QUERY: 'Search query must be at least 2 characters.',
  INVALID_COORDINATES: 'Latitude and longitude must be valid numbers within range.',
  API_REQUEST_FAILED: 'Failed to fetch venues from Google Places API.',
  API_QUOTA_EXCEEDED: 'Google Places API quota exceeded. Please try again later.',
  NETWORK_ERROR: 'Network error. Please check your connection and try again.',
  DATABASE_ERROR: 'Failed to fetch or save venue data.',
  UNKNOWN_ERROR: 'An unexpected error occurred.',
} as const

/**
 * Default search radius in meters (5km)
 */
export const DEFAULT_SEARCH_RADIUS_METERS = LOCATION_CONSTANTS.DEFAULT_RADIUS_METERS

/**
 * Maximum search results from Google Places API
 */
export const MAX_GOOGLE_RESULTS = LOCATION_CONSTANTS.MAX_SEARCH_RESULTS

// ============================================================================
// TYPES
// ============================================================================

/**
 * Result from Google Places API search
 */
export interface GooglePlacesSearchResult {
  /** Whether the search was successful */
  success: boolean
  /** Array of places returned from API */
  places: GooglePlace[]
  /** Error information if search failed */
  error: LocationError | null
}

/**
 * Result from venue caching operation
 */
export interface VenueCacheResult {
  /** Whether caching was successful */
  success: boolean
  /** Cached location data (if successful) */
  location: Location | null
  /** Error message if caching failed */
  error: string | null
}

/**
 * Result from fetching popular venues
 */
export interface PopularVenuesResult {
  /** Whether fetch was successful */
  success: boolean
  /** Array of popular venues */
  venues: Location[]
  /** Error information if fetch failed */
  error: LocationError | null
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get the Google Places API key from environment variables
 *
 * @returns The API key or null if not configured
 */
function getGooglePlacesApiKey(): string | null {
  // Check for server-side API key first (for Places API calls)
  const serverKey = process.env.NEXT_PUBLIC_GCP_MAPS_API_KEY
  if (serverKey) {
    return serverKey
  }

  // Fall back to the public Google Maps key (may have Places API enabled)
  const publicKey = process.env.EXPO_PUBLIC_GCP_MAPS_API_KEY
  if (publicKey) {
    return publicKey
  }

  return null
}

/**
 * Validates that latitude is within valid range (-90 to 90)
 *
 * @param latitude - Latitude value to validate
 * @returns true if valid, false otherwise
 */
export function isValidLatitude(latitude: number): boolean {
  return (
    typeof latitude === 'number' &&
    !Number.isNaN(latitude) &&
    latitude >= -90 &&
    latitude <= 90
  )
}

/**
 * Validates that longitude is within valid range (-180 to 180)
 *
 * @param longitude - Longitude value to validate
 * @returns true if valid, false otherwise
 */
export function isValidLongitude(longitude: number): boolean {
  return (
    typeof longitude === 'number' &&
    !Number.isNaN(longitude) &&
    longitude >= -180 &&
    longitude <= 180
  )
}

/**
 * Validates that coordinates are within valid ranges
 *
 * @param latitude - Latitude value
 * @param longitude - Longitude value
 * @returns true if both are valid, false otherwise
 */
export function isValidCoordinates(latitude: number, longitude: number): boolean {
  return isValidLatitude(latitude) && isValidLongitude(longitude)
}

/**
 * Creates a LocationError object with consistent structure
 *
 * @param type - Error type for handling
 * @param message - Human-readable error message
 * @param originalError - Optional original error for debugging
 * @returns LocationError object
 */
function createLocationError(
  type: LocationErrorType,
  message: string,
  originalError?: unknown
): LocationError {
  return {
    type,
    message,
    originalError,
  }
}

/**
 * Determines error type from HTTP response or error object
 *
 * @param error - The error to analyze
 * @param status - HTTP status code (optional)
 * @returns Appropriate error type
 */
function getErrorType(error: unknown, status?: number): LocationErrorType {
  if (status === 429 || (error instanceof Error && error.message.includes('quota'))) {
    return 'quota_exceeded'
  }

  if (status === 400 || status === 422) {
    return 'invalid_request'
  }

  if (status && status >= 500) {
    return 'api_error'
  }

  if (error instanceof TypeError && error.message.includes('fetch')) {
    return 'network_error'
  }

  return 'unknown'
}

// ============================================================================
// GOOGLE PLACES API FUNCTIONS
// ============================================================================

/**
 * Search for venues using Google Places REST API v1 searchText endpoint
 *
 * This function calls the Google Places API directly using fetch,
 * without requiring a Map instance. The X-Goog-FieldMask header is required
 * and specifies which fields to return.
 *
 * ## API Requirements
 *
 * - Requires NEXT_PUBLIC_GCP_MAPS_API_KEY environment variable
 * - "Places API (New)" must be enabled in Google Cloud Console
 * - X-Goog-FieldMask header is REQUIRED
 *
 * ## Location Bias
 *
 * When latitude and longitude are provided, results are biased toward
 * venues near that location. This improves relevance for local search.
 *
 * @param params - Search parameters
 * @param params.query - Text query to search for (e.g., 'Blue Bottle Coffee')
 * @param params.latitude - Optional latitude for location bias
 * @param params.longitude - Optional longitude for location bias
 * @param params.radius_meters - Search radius in meters (default: 5000)
 * @param params.max_results - Maximum results to return (default: 20)
 * @returns Promise with search result including places array or error
 *
 * @example
 * ```typescript
 * const result = await searchGooglePlaces({
 *   query: 'coffee shop',
 *   latitude: 37.7749,
 *   longitude: -122.4194,
 * })
 *
 * if (result.success) {
 *   result.places.forEach(place => {
 *     console.log(place.displayName.text, place.formattedAddress)
 *   })
 * }
 * ```
 */
export async function searchGooglePlaces(
  params: VenueSearchParams
): Promise<GooglePlacesSearchResult> {
  const { query, latitude, longitude, radius_meters, max_results } = params

  // Validate query
  if (!query || query.trim().length < LOCATION_CONSTANTS.MIN_QUERY_LENGTH) {
    return {
      success: false,
      places: [],
      error: createLocationError('invalid_request', LOCATION_SERVICE_ERRORS.INVALID_QUERY),
    }
  }

  // Validate coordinates if provided
  if (latitude !== undefined && longitude !== undefined) {
    if (!isValidCoordinates(latitude, longitude)) {
      return {
        success: false,
        places: [],
        error: createLocationError('invalid_request', LOCATION_SERVICE_ERRORS.INVALID_COORDINATES),
      }
    }
  }

  // Get API key
  const apiKey = getGooglePlacesApiKey()
  if (!apiKey) {
    return {
      success: false,
      places: [],
      error: createLocationError('api_error', LOCATION_SERVICE_ERRORS.API_KEY_MISSING),
    }
  }

  // Build request body
  const requestBody: Record<string, unknown> = {
    textQuery: query.trim(),
    maxResultCount: max_results ?? MAX_GOOGLE_RESULTS,
  }

  // Add location bias if coordinates are provided
  if (latitude !== undefined && longitude !== undefined) {
    requestBody.locationBias = {
      circle: {
        center: {
          latitude,
          longitude,
        },
        radius: radius_meters ?? DEFAULT_SEARCH_RADIUS_METERS,
      },
    }
  }

  try {
    const response = await fetch(GOOGLE_PLACES_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': GOOGLE_PLACES_FIELD_MASK,
      },
      body: JSON.stringify(requestBody),
    })

    if (!response.ok) {
      const errorType = getErrorType(null, response.status)
      const errorMessage = response.status === 429
        ? LOCATION_SERVICE_ERRORS.API_QUOTA_EXCEEDED
        : LOCATION_SERVICE_ERRORS.API_REQUEST_FAILED

      return {
        success: false,
        places: [],
        error: createLocationError(errorType, `${errorMessage} (Status: ${response.status})`),
      }
    }

    const data: GooglePlacesSearchResponse = await response.json()

    return {
      success: true,
      places: data.places ?? [],
      error: null,
    }
  } catch (err) {
    const errorType = getErrorType(err)
    const errorMessage = errorType === 'network_error'
      ? LOCATION_SERVICE_ERRORS.NETWORK_ERROR
      : LOCATION_SERVICE_ERRORS.API_REQUEST_FAILED

    return {
      success: false,
      places: [],
      error: createLocationError(errorType, errorMessage, err),
    }
  }
}

// ============================================================================
// TRANSFORMATION FUNCTIONS
// ============================================================================

/**
 * Transform a Google Place response to flat schema for database storage
 *
 * Google Places API v1 returns nested objects (e.g., displayName.text).
 * This function extracts and flattens the data to match our Location schema.
 *
 * @param place - Raw Google Place object from API response
 * @returns Transformed place with flat schema
 * @throws Error if place is missing required fields (id, displayName)
 *
 * @example
 * ```typescript
 * const googlePlace = {
 *   id: 'ChIJ...',
 *   displayName: { text: 'Blue Bottle Coffee' },
 *   formattedAddress: '123 Main St',
 *   location: { latitude: 37.7749, longitude: -122.4194 },
 *   types: ['cafe', 'food'],
 * }
 *
 * const transformed = transformGooglePlace(googlePlace)
 * // {
 * //   google_place_id: 'ChIJ...',
 * //   name: 'Blue Bottle Coffee',
 * //   address: '123 Main St',
 * //   latitude: 37.7749,
 * //   longitude: -122.4194,
 * //   place_types: ['cafe', 'food'],
 * // }
 * ```
 */
export function transformGooglePlace(place: GooglePlace): GooglePlaceTransformed {
  if (!place.id) {
    throw new Error('Google Place is missing required id field')
  }

  if (!place.displayName?.text) {
    throw new Error('Google Place is missing required displayName.text field')
  }

  return {
    google_place_id: place.id,
    name: place.displayName.text,
    address: place.formattedAddress ?? null,
    latitude: place.location?.latitude ?? 0,
    longitude: place.location?.longitude ?? 0,
    place_types: place.types ?? [],
  }
}

/**
 * Transform multiple Google Places to flat schema
 *
 * @param places - Array of Google Place objects
 * @returns Array of transformed places (skips invalid places)
 */
export function transformGooglePlaces(places: GooglePlace[]): GooglePlaceTransformed[] {
  const transformed: GooglePlaceTransformed[] = []

  for (const place of places) {
    try {
      transformed.push(transformGooglePlace(place))
    } catch {
      // Skip invalid places silently
      continue
    }
  }

  return transformed
}

/**
 * Convert transformed Google Place to LocationInsert for database storage
 *
 * @param place - Transformed Google Place data
 * @returns LocationInsert object ready for Supabase upsert
 */
export function toLocationInsert(place: GooglePlaceTransformed): LocationInsert {
  return {
    google_place_id: place.google_place_id,
    name: place.name,
    address: place.address,
    latitude: place.latitude,
    longitude: place.longitude,
    place_types: place.place_types,
    post_count: 0, // Initialize with zero posts for new venues
  }
}

// ============================================================================
// VENUE CACHING (UPSERT)
// ============================================================================

/**
 * Cache a single Google Place result to Supabase locations table
 *
 * Uses upsert with `google_place_id` as the conflict column to ensure
 * we don't create duplicate venue records. If a venue with the same
 * google_place_id already exists, it updates the record with fresh data
 * from Google Places (except for post_count which is managed separately).
 *
 * @param supabase - Supabase client instance
 * @param place - Transformed Google Place data to cache
 * @returns Promise resolving to VenueCacheResult with cached location or error
 *
 * @example
 * ```typescript
 * const place = transformGooglePlace(googlePlaceResponse)
 * const result = await cacheVenueToSupabase(supabase, place)
 *
 * if (result.success) {
 *   console.log('Cached venue:', result.location?.name)
 * }
 * ```
 */
export async function cacheVenueToSupabase(
  supabase: SupabaseClient,
  place: GooglePlaceTransformed
): Promise<VenueCacheResult> {
  try {
    // Convert to database insert format
    const locationInsert = toLocationInsert(place)

    // Upsert to locations table with google_place_id as conflict column
    // Note: We don't update post_count on conflict as it's managed by triggers
    const { data, error } = await supabase
      .from('locations')
      .upsert(locationInsert, {
        onConflict: 'google_place_id',
        ignoreDuplicates: false,
      })
      .select()
      .single()

    if (error) {
      return {
        success: false,
        location: null,
        error: `Failed to cache venue: ${error.message}`,
      }
    }

    return {
      success: true,
      location: data as Location,
      error: null,
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'An unexpected error occurred'
    return {
      success: false,
      location: null,
      error: `Failed to cache venue: ${message}`,
    }
  }
}

/**
 * Cache multiple Google Place results to Supabase locations table in batch
 *
 * Uses upsert with `google_place_id` as the conflict column to efficiently
 * cache multiple venues at once. Venues that already exist are updated
 * with fresh data from Google Places.
 *
 * This is more efficient than calling cacheVenueToSupabase multiple times
 * as it performs a single database operation.
 *
 * @param supabase - Supabase client instance
 * @param places - Array of transformed Google Place data to cache
 * @returns Promise resolving to array of VenueCacheResult (one per place)
 *
 * @example
 * ```typescript
 * const places = transformGooglePlaces(googlePlacesResponse)
 * const results = await cacheVenuesToSupabase(supabase, places)
 *
 * const successCount = results.filter(r => r.success).length
 * console.log(`Cached ${successCount} of ${places.length} venues`)
 * ```
 */
export async function cacheVenuesToSupabase(
  supabase: SupabaseClient,
  places: GooglePlaceTransformed[]
): Promise<VenueCacheResult[]> {
  // Handle empty array
  if (places.length === 0) {
    return []
  }

  try {
    // Convert all places to database insert format
    const locationInserts = places.map(toLocationInsert)

    // Batch upsert to locations table with google_place_id as conflict column
    const { data, error } = await supabase
      .from('locations')
      .upsert(locationInserts, {
        onConflict: 'google_place_id',
        ignoreDuplicates: false,
      })
      .select()

    if (error) {
      // Return error result for all places
      return places.map(place => ({
        success: false,
        location: null,
        error: `Failed to cache venues: ${error.message}`,
      }))
    }

    // Map results back to places by google_place_id
    const locationsByPlaceId = new Map<string, Location>()
    for (const location of (data ?? []) as Location[]) {
      locationsByPlaceId.set(location.google_place_id, location)
    }

    // Build result array matching input order
    return places.map(place => {
      const location = locationsByPlaceId.get(place.google_place_id)
      if (location) {
        return {
          success: true,
          location,
          error: null,
        }
      }
      // This shouldn't happen, but handle gracefully
      return {
        success: false,
        location: null,
        error: `Venue not found in upsert results: ${place.google_place_id}`,
      }
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'An unexpected error occurred'
    // Return error result for all places
    return places.map(() => ({
      success: false,
      location: null,
      error: `Failed to cache venues: ${message}`,
    }))
  }
}

/**
 * Search Google Places and cache results to Supabase in a single operation
 *
 * This is a convenience function that combines searchGooglePlaces with
 * caching. It's useful when you want to ensure fresh Google results are
 * always persisted to the local database.
 *
 * @param supabase - Supabase client instance
 * @param params - Search parameters for Google Places API
 * @returns Promise resolving to GooglePlacesSearchResult with cached venues
 *
 * @example
 * ```typescript
 * const result = await searchAndCacheVenues(supabase, {
 *   query: 'Blue Bottle Coffee',
 *   latitude: 37.7749,
 *   longitude: -122.4194,
 * })
 *
 * if (result.success) {
 *   // Venues are now cached in Supabase
 *   console.log(`Found and cached ${result.places.length} venues`)
 * }
 * ```
 */
export async function searchAndCacheVenues(
  supabase: SupabaseClient,
  params: VenueSearchParams
): Promise<GooglePlacesSearchResult> {
  // First, search Google Places
  const searchResult = await searchGooglePlaces(params)

  // If search failed or no results, return as-is
  if (!searchResult.success || searchResult.places.length === 0) {
    return searchResult
  }

  // Transform and cache the results
  const transformedPlaces = transformGooglePlaces(searchResult.places)

  if (transformedPlaces.length > 0) {
    // Cache in background - don't await to avoid blocking search results
    // Errors are silently ignored as caching is best-effort
    cacheVenuesToSupabase(supabase, transformedPlaces).catch(() => {
      // Silently ignore caching errors
    })
  }

  return searchResult
}

// ============================================================================
// VENUE FILTERING
// ============================================================================

/**
 * Filter venues by place types
 *
 * Checks if any of the venue's place_types match the filter types.
 * This is used for category filtering (cafe, gym, bar, etc.).
 *
 * @param venues - Array of venues to filter
 * @param types - Array of place types to filter by
 * @returns Filtered array of venues
 *
 * @example
 * ```typescript
 * const allVenues = [...]
 * const cafes = filterVenuesByType(allVenues, ['cafe', 'coffee_shop'])
 * ```
 */
export function filterVenuesByType<T extends { place_types?: string[] }>(
  venues: T[],
  types: string[]
): T[] {
  if (!types.length) {
    return venues
  }

  return venues.filter(venue => {
    const venueTypes = venue.place_types ?? []
    return venueTypes.some(type => types.includes(type))
  })
}

// ============================================================================
// HYBRID SEARCH FUNCTIONS
// ============================================================================

/**
 * Search for venues in Supabase using ilike pattern matching on name
 *
 * This function queries the local Supabase database for venues that match
 * the search query. Used as a fallback when Google Places API is unavailable
 * or to augment Google results with cached local data.
 *
 * ## Query Strategy
 *
 * Uses PostgreSQL `ilike` for case-insensitive pattern matching:
 * - `%query%` matches any name containing the query
 * - Results are ordered by post_count (most popular first), then name
 *
 * ## Performance
 *
 * The query uses the `name` column which should be indexed for fast lookups.
 * Results are limited to prevent memory issues.
 *
 * @param supabase - Supabase client instance (from createClient())
 * @param params - Search parameters
 * @param params.query - Text query to search for (minimum 2 characters)
 * @param params.latitude - Optional user latitude for distance calculation
 * @param params.longitude - Optional user longitude for distance calculation
 * @param params.max_results - Maximum results to return (default: 20)
 * @returns Promise resolving to array of Location objects
 *
 * @example
 * ```typescript
 * const supabase = createClient()
 * const venues = await searchSupabaseVenues(supabase, {
 *   query: 'Blue Bottle',
 *   latitude: 37.7749,
 *   longitude: -122.4194,
 * })
 * ```
 */
export async function searchSupabaseVenues(
  supabase: SupabaseClient,
  params: VenueSearchParams
): Promise<Location[]> {
  const { query, max_results } = params
  const limit = max_results ?? MAX_GOOGLE_RESULTS

  // Validate query length
  if (!query || query.trim().length < LOCATION_CONSTANTS.MIN_QUERY_LENGTH) {
    return []
  }

  const { data, error } = await supabase
    .from('locations')
    .select('*')
    .ilike('name', `%${query.trim()}%`)
    .order('post_count', { ascending: false })
    .order('name', { ascending: true })
    .limit(limit)

  if (error) {
    throw createLocationError('api_error', LOCATION_SERVICE_ERRORS.DATABASE_ERROR, error)
  }

  return (data ?? []) as Location[]
}

/**
 * Converts a Location (from Supabase) to a Venue with source metadata
 *
 * @param location - Location record from Supabase
 * @param userLatitude - Optional user latitude for distance calculation
 * @param userLongitude - Optional user longitude for distance calculation
 * @param source - Source of the venue data
 * @returns Venue object with source and optional distance
 */
function locationToVenue(
  location: Location,
  userLatitude?: number,
  userLongitude?: number,
  source: Venue['source'] = 'supabase'
): Venue {
  let distanceMeters: number | undefined

  if (
    userLatitude !== undefined &&
    userLongitude !== undefined &&
    isValidCoordinates(userLatitude, userLongitude)
  ) {
    try {
      distanceMeters = calculateDistance(
        { latitude: userLatitude, longitude: userLongitude },
        { latitude: location.latitude, longitude: location.longitude }
      )
    } catch {
      // Distance calculation failed, leave undefined
    }
  }

  return {
    ...location,
    distance_meters: distanceMeters,
    source,
  }
}

/**
 * Converts a Google Place (transformed) to a Venue with source metadata
 *
 * @param place - Transformed Google Place data
 * @param userLatitude - Optional user latitude for distance calculation
 * @param userLongitude - Optional user longitude for distance calculation
 * @returns Venue object with source and optional distance
 */
function googlePlaceToVenue(
  place: GooglePlaceTransformed,
  userLatitude?: number,
  userLongitude?: number
): Venue {
  let distanceMeters: number | undefined

  if (
    userLatitude !== undefined &&
    userLongitude !== undefined &&
    isValidCoordinates(userLatitude, userLongitude)
  ) {
    try {
      distanceMeters = calculateDistance(
        { latitude: userLatitude, longitude: userLongitude },
        { latitude: place.latitude, longitude: place.longitude }
      )
    } catch {
      // Distance calculation failed, leave undefined
    }
  }

  // Create a Venue from transformed Google Place
  // Note: id will be empty string since Google Places don't have our DB ID yet
  return {
    id: '', // Will be populated after caching to Supabase
    google_place_id: place.google_place_id,
    name: place.name,
    address: place.address,
    latitude: place.latitude,
    longitude: place.longitude,
    place_types: place.place_types,
    post_count: 0, // New venues start with 0 posts
    created_at: new Date().toISOString(),
    distance_meters: distanceMeters,
    source: 'google_places',
  }
}

/**
 * Hybrid venue search combining Google Places API with Supabase cached results
 *
 * This function provides a comprehensive venue search by:
 * 1. Fetching results from Google Places API (if online and API key configured)
 * 2. Fetching cached results from Supabase using ilike pattern matching
 * 3. Merging and deduplicating results based on google_place_id
 * 4. Adding distance information if user coordinates are provided
 * 5. Returning combined results sorted by distance or relevance
 *
 * ## Hybrid Search Strategy
 *
 * The hybrid approach ensures:
 * - Fresh results from Google Places for new venues
 * - Fallback to cached data when offline or API unavailable
 * - Preservation of local post counts and metadata
 * - Deduplication to prevent showing the same venue twice
 *
 * ## Offline Mode
 *
 * When `isOffline` is true or Google Places API fails:
 * - Only Supabase results are returned
 * - `is_offline` flag is set to true in results
 *
 * ## Performance
 *
 * Both queries run in parallel for optimal response time.
 * Deduplication is O(n) using a Map keyed by google_place_id.
 *
 * @param supabase - Supabase client instance (from createClient())
 * @param params - Search parameters
 * @param params.query - Text query to search for (minimum 2 characters)
 * @param params.latitude - Optional user latitude for location bias and distance
 * @param params.longitude - Optional user longitude for location bias and distance
 * @param params.radius_meters - Search radius in meters (default: 5000)
 * @param params.max_results - Maximum results per source (default: 20)
 * @param params.place_types - Optional array of venue types to filter by
 * @param isOffline - Whether device is offline (skip Google Places API)
 * @returns Promise resolving to VenueSearchResults with combined results
 *
 * @example
 * ```typescript
 * import { createClient } from '../lib/supabase/client'
 * import { searchVenues } from './locationService'
 *
 * const supabase = createClient()
 *
 * // Search for coffee shops near user location
 * const results = await searchVenues(supabase, {
 *   query: 'Blue Bottle Coffee',
 *   latitude: 37.7749,
 *   longitude: -122.4194,
 *   radius_meters: 5000,
 * })
 *
 * console.log('Total results:', results.total_count)
 * console.log('Is offline:', results.is_offline)
 * results.combined_results.forEach(venue => {
 *   console.log(`${venue.name} (${venue.source}): ${venue.distance_meters}m`)
 * })
 * ```
 *
 * @see {@link searchGooglePlaces} Google Places API search
 * @see {@link searchSupabaseVenues} Supabase ilike search
 */
export async function searchVenues(
  supabase: SupabaseClient,
  params: VenueSearchParams,
  isOffline: boolean = false
): Promise<VenueSearchResults> {
  const { query, latitude, longitude, place_types } = params

  // Validate query
  if (!query || query.trim().length < LOCATION_CONSTANTS.MIN_QUERY_LENGTH) {
    return {
      google_results: [],
      cached_results: [],
      combined_results: [],
      is_offline: isOffline,
      total_count: 0,
    }
  }

  // Initialize results arrays
  let googleVenues: Venue[] = []
  let cachedVenues: Venue[] = []
  let effectiveIsOffline = isOffline

  // Fetch from both sources in parallel
  const [googleResult, supabaseResult] = await Promise.allSettled([
    // Only call Google Places API if not offline
    isOffline
      ? Promise.resolve({ success: false, places: [], error: null })
      : searchGooglePlaces(params),
    // Always query Supabase for cached venues
    searchSupabaseVenues(supabase, params),
  ])

  // Process Google Places results
  if (googleResult.status === 'fulfilled' && googleResult.value.success) {
    const transformedPlaces = transformGooglePlaces(googleResult.value.places)
    googleVenues = transformedPlaces.map(place =>
      googlePlaceToVenue(place, latitude, longitude)
    )
  } else if (googleResult.status === 'rejected' || !isOffline) {
    // If Google API failed (not explicitly offline), mark as effective offline
    if (googleResult.status === 'rejected') {
      effectiveIsOffline = true
    }
  }

  // Process Supabase results
  if (supabaseResult.status === 'fulfilled') {
    cachedVenues = supabaseResult.value.map(location =>
      locationToVenue(location, latitude, longitude, 'supabase')
    )
  }

  // Apply venue type filtering if specified
  if (place_types && place_types.length > 0) {
    googleVenues = filterVenuesByType(googleVenues, place_types)
    cachedVenues = filterVenuesByType(cachedVenues, place_types)
  }

  // Merge and deduplicate results
  // Use a Map keyed by google_place_id for O(1) lookups
  const seenPlaceIds = new Map<string, Venue>()

  // Add Google results first (fresher data)
  for (const venue of googleVenues) {
    seenPlaceIds.set(venue.google_place_id, venue)
  }

  // Add Supabase results, preferring cached data for existing venues
  // (cached venues have accurate post_count)
  for (const venue of cachedVenues) {
    const existing = seenPlaceIds.get(venue.google_place_id)
    if (existing) {
      // Merge: keep Google's freshness but use cached post_count and ID
      seenPlaceIds.set(venue.google_place_id, {
        ...existing,
        id: venue.id, // Use actual database ID
        post_count: venue.post_count, // Use cached post count
        source: 'hybrid', // Mark as hybrid since we have both sources
      })
    } else {
      seenPlaceIds.set(venue.google_place_id, venue)
    }
  }

  // Convert to array and sort
  let combinedResults = Array.from(seenPlaceIds.values())

  // Sort by distance if coordinates provided, otherwise by post_count
  if (latitude !== undefined && longitude !== undefined) {
    combinedResults.sort((a, b) => {
      // Venues with distance come first
      if (a.distance_meters !== undefined && b.distance_meters !== undefined) {
        return a.distance_meters - b.distance_meters
      }
      if (a.distance_meters !== undefined) return -1
      if (b.distance_meters !== undefined) return 1
      // Fall back to post_count for venues without distance
      return (b.post_count ?? 0) - (a.post_count ?? 0)
    })
  } else {
    // Sort by post_count (popularity) when no location
    combinedResults.sort((a, b) => (b.post_count ?? 0) - (a.post_count ?? 0))
  }

  return {
    google_results: googleVenues,
    cached_results: cachedVenues,
    combined_results: combinedResults,
    is_offline: effectiveIsOffline,
    total_count: combinedResults.length,
  }
}

// ============================================================================
// POPULAR VENUES DISCOVERY
// ============================================================================

/**
 * Parameters for fetching popular venues with proximity filtering
 */
export interface PopularVenuesParams {
  /** User's latitude coordinate (WGS 84) */
  latitude: number
  /** User's longitude coordinate (WGS 84) */
  longitude: number
  /** Search radius in meters (default: 5000 = 5km) */
  radius_meters?: number
  /** Maximum number of results to return (default: 10) */
  max_results?: number
  /** Minimum post count to be considered popular (default: 1) */
  min_post_count?: number
  /** Filter by venue types (optional) */
  place_types?: string[]
}

/**
 * Default number of popular venues to return
 */
export const DEFAULT_POPULAR_VENUES_COUNT = LOCATION_CONSTANTS.DEFAULT_POPULAR_VENUES_COUNT

/**
 * Default minimum post count for popular venues
 */
export const DEFAULT_MIN_POST_COUNT = 1

/**
 * Fetches popular venues near the user's location using PostGIS proximity queries.
 *
 * This function retrieves venues from the Supabase locations table that:
 * - Are within the specified radius from the user's coordinates
 * - Have at least the minimum number of posts (post_count >= min_post_count)
 * - Are ordered by post_count DESC (most popular first), then by name ASC
 *
 * ## Performance
 *
 * This function uses the `get_locations_with_active_posts` PostGIS function which:
 * - Uses **ST_DWithin** with geography type for accurate meter-based radius queries
 * - Leverages the **GIST spatial index** for O(log n) query complexity
 * - Returns results ordered by distance initially, then reordered by popularity
 *
 * ## Use Cases
 *
 * 1. **Discovery Feed**: Show trending venues in the user's area
 * 2. **Home Screen**: Display popular spots with active posts nearby
 * 3. **Explore Mode**: Help users find venues with missed connection activity
 *
 * @param supabase - Supabase client instance (from createClient())
 * @param params - Query parameters for popular venues
 * @param params.latitude - User's latitude (-90 to 90)
 * @param params.longitude - User's longitude (-180 to 180)
 * @param params.radius_meters - Search radius in meters (default: 5000)
 * @param params.max_results - Maximum results to return (default: 10)
 * @param params.min_post_count - Minimum posts to be popular (default: 1)
 * @param params.place_types - Optional venue type filter
 * @returns Promise resolving to PopularVenuesResult with venues array
 *
 * @example
 * ```typescript
 * import { createClient } from '../lib/supabase/client'
 * import { fetchPopularVenues } from './locationService'
 *
 * const supabase = createClient()
 *
 * // Fetch top 10 popular venues within 5km
 * const result = await fetchPopularVenues(supabase, {
 *   latitude: 37.7749,
 *   longitude: -122.4194,
 * })
 *
 * if (result.success) {
 *   result.venues.forEach(venue => {
 *     console.log(`${venue.name}: ${venue.post_count} posts`)
 *   })
 * }
 *
 * // Fetch popular cafes with at least 3 posts
 * const cafes = await fetchPopularVenues(supabase, {
 *   latitude: 37.7749,
 *   longitude: -122.4194,
 *   radius_meters: 10000,
 *   min_post_count: 3,
 *   place_types: ['cafe', 'coffee_shop'],
 * })
 * ```
 *
 * @see {@link searchVenues} For text-based venue search
 * @see {@link lib/utils/geo.fetchLocationsWithActivePosts} Lower-level RPC function
 */
export async function fetchPopularVenues(
  supabase: SupabaseClient,
  params: PopularVenuesParams
): Promise<PopularVenuesResult> {
  const {
    latitude,
    longitude,
    radius_meters = DEFAULT_SEARCH_RADIUS_METERS,
    max_results = DEFAULT_POPULAR_VENUES_COUNT,
    min_post_count = DEFAULT_MIN_POST_COUNT,
    place_types,
  } = params

  // Validate coordinates
  if (!isValidCoordinates(latitude, longitude)) {
    return {
      success: false,
      venues: [],
      error: createLocationError('invalid_request', LOCATION_SERVICE_ERRORS.INVALID_COORDINATES),
    }
  }

  try {
    // Call the PostGIS function to get locations with active posts
    // This function uses ST_DWithin for efficient spatial queries
    const { data, error } = await supabase.rpc('get_locations_with_active_posts', {
      user_lat: latitude,
      user_lon: longitude,
      radius_meters: radius_meters,
      min_post_count: min_post_count,
      max_results: max_results * 2, // Fetch extra to allow for filtering
    })

    if (error) {
      return {
        success: false,
        venues: [],
        error: createLocationError('api_error', `${LOCATION_SERVICE_ERRORS.DATABASE_ERROR}: ${error.message}`, error),
      }
    }

    // Transform RPC results to Location array
    let venues: Location[] = (data ?? []) as Location[]

    // Apply place_types filtering if specified
    if (place_types && place_types.length > 0) {
      venues = filterVenuesByType(venues, place_types)
    }

    // Sort by post_count DESC (most popular first), then by name ASC for consistency
    venues.sort((a, b) => {
      const countDiff = (b.post_count ?? 0) - (a.post_count ?? 0)
      if (countDiff !== 0) return countDiff
      return (a.name ?? '').localeCompare(b.name ?? '')
    })

    // Apply max_results limit after filtering and sorting
    venues = venues.slice(0, max_results)

    return {
      success: true,
      venues,
      error: null,
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'An unexpected error occurred'
    return {
      success: false,
      venues: [],
      error: createLocationError('unknown', `${LOCATION_SERVICE_ERRORS.DATABASE_ERROR}: ${message}`, err),
    }
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  // Google Places API functions
  searchGooglePlaces,
  // Hybrid search functions
  searchVenues,
  searchSupabaseVenues,
  // Popular venues discovery
  fetchPopularVenues,
  // Caching functions
  cacheVenueToSupabase,
  cacheVenuesToSupabase,
  searchAndCacheVenues,
  // Transformation functions
  transformGooglePlace,
  transformGooglePlaces,
  toLocationInsert,
  // Filtering functions
  filterVenuesByType,
  // Validation functions
  isValidLatitude,
  isValidLongitude,
  isValidCoordinates,
  // Constants
  LOCATION_SERVICE_ERRORS,
  DEFAULT_SEARCH_RADIUS_METERS,
  DEFAULT_POPULAR_VENUES_COUNT,
  DEFAULT_MIN_POST_COUNT,
  MAX_GOOGLE_RESULTS,
}
