/**
 * Location Search & Discovery Type Definitions
 *
 * TypeScript interfaces for Google Places API responses, venue data,
 * and location search functionality in the Backtrack app.
 */

import type { Location, UUID } from './database'

// ============================================================================
// GOOGLE PLACES API RESPONSE TYPES
// ============================================================================

/**
 * Localized text from Google Places API
 *
 * Google Places API v1 returns text in a nested format with language code.
 */
export interface GoogleLocalizedText {
  /** The localized text content */
  text: string
  /** The language code (e.g., 'en') */
  languageCode?: string
}

/**
 * Geographic coordinates from Google Places API
 */
export interface GoogleLatLng {
  /** Latitude coordinate */
  latitude: number
  /** Longitude coordinate */
  longitude: number
}

/**
 * Individual place from Google Places API searchText response
 *
 * Represents a single venue returned from the Google Places REST API v1.
 * Uses nested format for display name and location coordinates.
 */
export interface GooglePlace {
  /** Unique Google Place ID for the venue */
  id: string
  /** Display name in localized text format */
  displayName: GoogleLocalizedText
  /** Formatted address string */
  formattedAddress?: string
  /** Geographic coordinates */
  location?: GoogleLatLng
  /** Array of place type strings (e.g., 'cafe', 'restaurant', 'gym') */
  types?: string[]
  /** Primary type of the place */
  primaryType?: string
  /** Whether the place is currently open */
  currentOpeningHours?: {
    openNow?: boolean
  }
}

/**
 * Google Places API searchText response wrapper
 *
 * The full response body from the Places API searchText endpoint.
 */
export interface GooglePlacesSearchResponse {
  /** Array of matching places */
  places?: GooglePlace[]
}

/**
 * Location bias for Google Places API search
 *
 * Used to prioritize results near the user's current location.
 */
export interface GoogleLocationBias {
  /** Circular area to bias results toward */
  circle: {
    /** Center point of the bias circle */
    center: GoogleLatLng
    /** Radius in meters (e.g., 5000 for 5km) */
    radius: number
  }
}

/**
 * Request body for Google Places searchText API
 */
export interface GooglePlacesSearchRequest {
  /** Text query to search for (e.g., 'Blue Bottle Coffee') */
  textQuery: string
  /** Optional location bias to prioritize nearby results */
  locationBias?: GoogleLocationBias
  /** Maximum number of results to return */
  maxResultCount?: number
  /** Included place types to filter by */
  includedType?: string
}

// ============================================================================
// VENUE DATA TYPES
// ============================================================================

/**
 * Venue with search metadata
 *
 * Combines location data with additional context for search results.
 * Extends the base Location type from the database.
 */
export interface Venue extends Location {
  /** Distance from user in meters (calculated at query time) */
  distance_meters?: number
  /** Whether venue is currently open (from Google Places if available) */
  is_open?: boolean
  /** Source of the venue data */
  source: 'google_places' | 'supabase' | 'hybrid'
}

/**
 * Simplified venue for display in lists and cards
 */
export interface VenuePreview {
  /** Unique identifier */
  id: UUID
  /** Google Place ID for linking */
  google_place_id: string
  /** Venue name */
  name: string
  /** Full address */
  address: string | null
  /** Primary venue type for display (e.g., 'Cafe', 'Gym') */
  primary_type: string | null
  /** Count of active posts at this venue */
  post_count: number
  /** Distance from user in meters */
  distance_meters?: number
}

/**
 * Venue transformed from Google Places API response
 *
 * Intermediate type for converting Google's nested format to flat schema.
 */
export interface GooglePlaceTransformed {
  /** Google Place ID */
  google_place_id: string
  /** Venue name (extracted from displayName.text) */
  name: string
  /** Full address */
  address: string | null
  /** GPS latitude */
  latitude: number
  /** GPS longitude */
  longitude: number
  /** Place types array */
  place_types: string[]
}

// ============================================================================
// SEARCH PARAMETERS
// ============================================================================

/**
 * Parameters for venue search
 */
export interface VenueSearchParams {
  /** Search query text */
  query: string
  /** User's latitude for location bias */
  latitude?: number
  /** User's longitude for location bias */
  longitude?: number
  /** Search radius in meters (default: 5000) */
  radius_meters?: number
  /** Maximum number of results (default: 20) */
  max_results?: number
  /** Filter by venue types */
  place_types?: string[]
}

/**
 * Parameters for fetching popular venues
 */
export interface PopularVenuesParams {
  /** User's latitude */
  latitude: number
  /** User's longitude */
  longitude: number
  /** Search radius in meters (default: 5000) */
  radius_meters?: number
  /** Maximum number of results (default: 10) */
  max_results?: number
  /** Minimum post count to be considered popular (default: 1) */
  min_post_count?: number
  /** Filter by venue types */
  place_types?: string[]
}

// ============================================================================
// SEARCH RESULTS
// ============================================================================

/**
 * Combined search results from Google Places and Supabase
 */
export interface VenueSearchResults {
  /** Search results from Google Places API */
  google_results: Venue[]
  /** Search results from Supabase cache */
  cached_results: Venue[]
  /** Combined and deduplicated results */
  combined_results: Venue[]
  /** Whether the search is from offline cache only */
  is_offline: boolean
  /** Total count of results before pagination */
  total_count: number
}

/**
 * Popular venues discovery results
 */
export interface PopularVenuesResults {
  /** List of popular venues ordered by post_count */
  venues: Venue[]
  /** Whether results are from offline cache */
  is_offline: boolean
  /** User's search location */
  search_location: GoogleLatLng
  /** Search radius used */
  radius_meters: number
}

// ============================================================================
// FILTER TYPES
// ============================================================================

/**
 * Predefined venue type categories for filtering
 */
export type VenueCategory =
  | 'cafe'
  | 'gym'
  | 'bar'
  | 'restaurant'
  | 'bookstore'
  | 'park'
  | 'museum'
  | 'library'

/**
 * Venue type filter option for UI
 */
export interface VenueTypeFilter {
  /** Category identifier */
  category: VenueCategory
  /** Display label */
  label: string
  /** Google Places types that match this category */
  google_types: string[]
  /** Whether the filter is currently active */
  is_active: boolean
}

// ============================================================================
// HOOK RETURN TYPES
// ============================================================================

/**
 * Return type for useLocationSearch hook
 */
export interface UseLocationSearchReturn {
  /** Current search query */
  query: string
  /** Set the search query */
  setQuery: (query: string) => void
  /** Search results */
  results: Venue[]
  /** Whether search is in progress */
  isLoading: boolean
  /** Error message if search failed */
  error: string | null
  /** Whether device is offline */
  isOffline: boolean
  /** Active venue type filters */
  activeFilters: VenueCategory[]
  /** Toggle a venue type filter */
  toggleFilter: (category: VenueCategory) => void
  /** Clear all filters */
  clearFilters: () => void
  /** Clear search and results */
  clearSearch: () => void
  /** User's current location */
  userLocation: GoogleLatLng | null
  /** Whether location permission is denied */
  isLocationDenied: boolean
  /** Request location permission */
  requestLocationPermission: () => Promise<void>
}

/**
 * Return type for usePopularVenues hook
 */
export interface UsePopularVenuesReturn {
  /** List of popular venues */
  venues: Venue[]
  /** Whether loading is in progress */
  isLoading: boolean
  /** Error message if fetch failed */
  error: string | null
  /** Whether device is offline */
  isOffline: boolean
  /** Refresh the popular venues list */
  refresh: () => Promise<void>
  /** User's current location */
  userLocation: GoogleLatLng | null
}

// ============================================================================
// ERROR TYPES
// ============================================================================

/**
 * Location service error types
 */
export type LocationErrorType =
  | 'permission_denied'
  | 'location_unavailable'
  | 'api_error'
  | 'network_error'
  | 'quota_exceeded'
  | 'invalid_request'
  | 'unknown'

/**
 * Location service error with type and context
 */
export interface LocationError {
  /** Error type for handling */
  type: LocationErrorType
  /** Human-readable error message */
  message: string
  /** Original error for debugging */
  originalError?: unknown
}

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Location search configuration constants
 */
export const LOCATION_CONSTANTS = {
  /** Default search radius in meters (5km) */
  DEFAULT_RADIUS_METERS: 5000,
  /** Maximum search radius in meters (50km) */
  MAX_RADIUS_METERS: 50000,
  /** Default number of popular venues to fetch */
  DEFAULT_POPULAR_VENUES_COUNT: 10,
  /** Maximum number of search results */
  MAX_SEARCH_RESULTS: 20,
  /** Search debounce delay in milliseconds */
  SEARCH_DEBOUNCE_MS: 300,
  /** Minimum query length to trigger search */
  MIN_QUERY_LENGTH: 2,
  /** Cache expiry time in milliseconds (1 hour) */
  CACHE_EXPIRY_MS: 3600000,
} as const

/**
 * Google Places API field mask for searchText requests
 *
 * Must be included in X-Goog-FieldMask header for API calls.
 */
export const GOOGLE_PLACES_FIELD_MASK = [
  'places.id',
  'places.displayName',
  'places.formattedAddress',
  'places.location',
  'places.types',
  'places.primaryType',
  'places.currentOpeningHours',
].join(',')

/**
 * Predefined venue type filters for the UI
 */
export const VENUE_TYPE_FILTERS: readonly Omit<VenueTypeFilter, 'is_active'>[] = [
  {
    category: 'cafe',
    label: 'Cafe',
    google_types: ['cafe', 'coffee_shop'],
  },
  {
    category: 'gym',
    label: 'Gym',
    google_types: ['gym', 'fitness_center'],
  },
  {
    category: 'bar',
    label: 'Bar',
    google_types: ['bar', 'night_club'],
  },
  {
    category: 'restaurant',
    label: 'Restaurant',
    google_types: ['restaurant', 'food'],
  },
  {
    category: 'bookstore',
    label: 'Bookstore',
    google_types: ['book_store', 'library'],
  },
  {
    category: 'park',
    label: 'Park',
    google_types: ['park', 'hiking_area'],
  },
] as const
