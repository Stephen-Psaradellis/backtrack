/**
 * Favorite Locations Utilities
 *
 * Handles CRUD operations for user's saved favorite locations.
 * Users can save frequently visited venues for quick access to
 * one-tap post creation or ledger browsing.
 *
 * KEY CONCEPTS:
 * - Each user can have multiple favorite locations
 * - Favorites are identified by custom names (max 50 characters)
 * - Favorites store location data (coordinates, place name, address)
 * - RLS policies ensure users can only access their own favorites
 *
 * @example
 * ```tsx
 * import { addFavorite, getUserFavorites, removeFavorite } from 'lib/favorites'
 *
 * // Add a new favorite
 * const result = await addFavorite(userId, {
 *   custom_name: 'My Coffee Spot',
 *   place_name: 'Starbucks',
 *   latitude: 37.7749,
 *   longitude: -122.4194,
 * })
 *
 * // Get all favorites
 * const favorites = await getUserFavorites(userId)
 * ```
 */

import { supabase } from './supabase'
import type {
  FavoriteLocation,
  FavoriteLocationInsert,
  FavoriteLocationUpdate,
  UUID,
} from '../types/database'

// ============================================================================
// TYPES
// ============================================================================

/**
 * Result from adding a favorite location
 */
export interface AddFavoriteResult {
  /** Whether the operation was successful */
  success: boolean
  /** The created favorite location (if successful) */
  favorite: FavoriteLocation | null
  /** Error message if operation failed */
  error: string | null
}

/**
 * Result from removing a favorite location
 */
export interface RemoveFavoriteResult {
  /** Whether the operation was successful */
  success: boolean
  /** Error message if operation failed */
  error: string | null
}

/**
 * Result from updating a favorite location
 */
export interface UpdateFavoriteResult {
  /** Whether the operation was successful */
  success: boolean
  /** The updated favorite location (if successful) */
  favorite: FavoriteLocation | null
  /** Error message if operation failed */
  error: string | null
}

/**
 * Result from getting user's favorites
 */
export interface GetFavoritesResult {
  /** Whether the operation was successful */
  success: boolean
  /** List of favorite locations */
  favorites: FavoriteLocation[]
  /** Error message if operation failed */
  error: string | null
}

/**
 * Result from getting a single favorite
 */
export interface GetFavoriteResult {
  /** Whether the operation was successful */
  success: boolean
  /** The favorite location (if found) */
  favorite: FavoriteLocation | null
  /** Error message if operation failed */
  error: string | null
}

/**
 * Data required to add a new favorite location
 */
export interface AddFavoriteData {
  /** User-defined label for this favorite (max 50 characters) */
  custom_name: string
  /** Actual name of the venue/place */
  place_name: string
  /** GPS latitude coordinate */
  latitude: number
  /** GPS longitude coordinate */
  longitude: number
  /** Full address of the location (optional) */
  address?: string | null
  /** Google Places ID for venue identification (optional) */
  place_id?: string | null
}

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Maximum length for custom name
 */
export const MAX_CUSTOM_NAME_LENGTH = 50

/**
 * Maximum number of favorites per user (soft limit)
 */
export const MAX_FAVORITES_PER_USER = 50

/**
 * Error messages for favorite operations
 */
export const FAVORITES_ERRORS = {
  MISSING_USER_ID: 'User ID is required.',
  MISSING_FAVORITE_ID: 'Favorite ID is required.',
  MISSING_CUSTOM_NAME: 'Custom name is required.',
  CUSTOM_NAME_TOO_LONG: `Custom name must be ${MAX_CUSTOM_NAME_LENGTH} characters or less.`,
  MISSING_PLACE_NAME: 'Place name is required.',
  MISSING_COORDINATES: 'Location coordinates are required.',
  INVALID_COORDINATES: 'Invalid location coordinates.',
  ADD_FAILED: 'Failed to add favorite location. Please try again.',
  REMOVE_FAILED: 'Failed to remove favorite location. Please try again.',
  UPDATE_FAILED: 'Failed to update favorite location. Please try again.',
  FETCH_FAILED: 'Failed to fetch favorite locations. Please try again.',
  NOT_FOUND: 'Favorite location not found.',
  MAX_FAVORITES_REACHED: `Maximum of ${MAX_FAVORITES_PER_USER} favorites allowed.`,
} as const

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Validate custom name for a favorite location
 *
 * @param customName - The custom name to validate
 * @returns Error message if invalid, null if valid
 */
export function validateCustomName(
  customName: string | null | undefined
): string | null {
  if (!customName || customName.trim().length === 0) {
    return FAVORITES_ERRORS.MISSING_CUSTOM_NAME
  }

  if (customName.trim().length > MAX_CUSTOM_NAME_LENGTH) {
    return FAVORITES_ERRORS.CUSTOM_NAME_TOO_LONG
  }

  return null
}

/**
 * Validate coordinates for a favorite location
 *
 * @param latitude - The latitude to validate
 * @param longitude - The longitude to validate
 * @returns Error message if invalid, null if valid
 */
export function validateCoordinates(
  latitude: number | null | undefined,
  longitude: number | null | undefined
): string | null {
  if (latitude === null || latitude === undefined || longitude === null || longitude === undefined) {
    return FAVORITES_ERRORS.MISSING_COORDINATES
  }

  // Validate latitude range (-90 to 90)
  if (latitude < -90 || latitude > 90) {
    return FAVORITES_ERRORS.INVALID_COORDINATES
  }

  // Validate longitude range (-180 to 180)
  if (longitude < -180 || longitude > 180) {
    return FAVORITES_ERRORS.INVALID_COORDINATES
  }

  return null
}

/**
 * Validate add favorite request parameters
 *
 * @param userId - The user adding the favorite
 * @param data - The favorite data
 * @returns Error message if invalid, null if valid
 */
export function validateAddFavoriteRequest(
  userId: string | null | undefined,
  data: AddFavoriteData | null | undefined
): string | null {
  if (!userId) {
    return FAVORITES_ERRORS.MISSING_USER_ID
  }

  if (!data) {
    return FAVORITES_ERRORS.MISSING_CUSTOM_NAME
  }

  const customNameError = validateCustomName(data.custom_name)
  if (customNameError) {
    return customNameError
  }

  if (!data.place_name || data.place_name.trim().length === 0) {
    return FAVORITES_ERRORS.MISSING_PLACE_NAME
  }

  const coordinatesError = validateCoordinates(data.latitude, data.longitude)
  if (coordinatesError) {
    return coordinatesError
  }

  return null
}

/**
 * Validate update favorite request parameters
 *
 * @param userId - The user updating the favorite
 * @param favoriteId - The favorite to update
 * @param updates - The updates to apply
 * @returns Error message if invalid, null if valid
 */
export function validateUpdateFavoriteRequest(
  userId: string | null | undefined,
  favoriteId: string | null | undefined,
  updates: FavoriteLocationUpdate | null | undefined
): string | null {
  if (!userId) {
    return FAVORITES_ERRORS.MISSING_USER_ID
  }

  if (!favoriteId) {
    return FAVORITES_ERRORS.MISSING_FAVORITE_ID
  }

  if (!updates) {
    return null // No updates means nothing to validate
  }

  // Validate custom_name if being updated
  if (updates.custom_name !== undefined) {
    const customNameError = validateCustomName(updates.custom_name)
    if (customNameError) {
      return customNameError
    }
  }

  // Validate coordinates if being updated
  if (updates.latitude !== undefined || updates.longitude !== undefined) {
    const lat = updates.latitude ?? 0 // Placeholder for partial update check
    const lng = updates.longitude ?? 0

    // Only validate if both are being updated, or check individual validity
    if (updates.latitude !== undefined) {
      if (updates.latitude < -90 || updates.latitude > 90) {
        return FAVORITES_ERRORS.INVALID_COORDINATES
      }
    }
    if (updates.longitude !== undefined) {
      if (updates.longitude < -180 || updates.longitude > 180) {
        return FAVORITES_ERRORS.INVALID_COORDINATES
      }
    }
  }

  return null
}

// ============================================================================
// MAIN FUNCTIONS
// ============================================================================

/**
 * Add a new favorite location for a user
 *
 * Creates a favorite location record in the database.
 * RLS policies ensure the user can only add favorites for themselves.
 *
 * @param userId - The user ID adding the favorite
 * @param data - The favorite location data
 * @returns Result indicating success or failure with the created favorite
 *
 * @example
 * const result = await addFavorite(userId, {
 *   custom_name: 'My Gym',
 *   place_name: 'Planet Fitness',
 *   latitude: 40.7128,
 *   longitude: -74.0060,
 *   address: '123 Main St, New York, NY',
 * })
 * if (result.success) {
 *   console.log('Favorite added:', result.favorite?.custom_name)
 * }
 */
export async function addFavorite(
  userId: string | null | undefined,
  data: AddFavoriteData | null | undefined
): Promise<AddFavoriteResult> {
  // Validate inputs
  const validationError = validateAddFavoriteRequest(userId, data)
  if (validationError) {
    return {
      success: false,
      favorite: null,
      error: validationError,
    }
  }

  // TypeScript now knows these are defined
  const validUserId = userId as string
  const validData = data as AddFavoriteData

  try {
    // Check if user has reached max favorites limit
    const { count, error: countError } = await supabase
      .from('favorite_locations')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', validUserId)

    if (countError) {
      return {
        success: false,
        favorite: null,
        error: countError.message || FAVORITES_ERRORS.ADD_FAILED,
      }
    }

    if (count !== null && count >= MAX_FAVORITES_PER_USER) {
      return {
        success: false,
        favorite: null,
        error: FAVORITES_ERRORS.MAX_FAVORITES_REACHED,
      }
    }

    // Insert the new favorite
    const insertData: FavoriteLocationInsert = {
      user_id: validUserId,
      custom_name: validData.custom_name.trim(),
      place_name: validData.place_name.trim(),
      latitude: validData.latitude,
      longitude: validData.longitude,
      address: validData.address?.trim() || null,
      place_id: validData.place_id || null,
    }

    const { data: favorite, error } = await supabase
      .from('favorite_locations')
      .insert(insertData)
      .select()
      .single()

    if (error) {
      return {
        success: false,
        favorite: null,
        error: error.message || FAVORITES_ERRORS.ADD_FAILED,
      }
    }

    return {
      success: true,
      favorite: favorite as FavoriteLocation,
      error: null,
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : FAVORITES_ERRORS.ADD_FAILED
    return {
      success: false,
      favorite: null,
      error: message,
    }
  }
}

/**
 * Remove a favorite location
 *
 * Deletes a favorite location record from the database.
 * RLS policies ensure users can only delete their own favorites.
 *
 * @param userId - The user ID removing the favorite
 * @param favoriteId - The ID of the favorite to remove
 * @returns Result indicating success or failure
 *
 * @example
 * const result = await removeFavorite(userId, favoriteId)
 * if (result.success) {
 *   console.log('Favorite removed successfully')
 * }
 */
export async function removeFavorite(
  userId: string | null | undefined,
  favoriteId: string | null | undefined
): Promise<RemoveFavoriteResult> {
  // Validate inputs
  if (!userId) {
    return {
      success: false,
      error: FAVORITES_ERRORS.MISSING_USER_ID,
    }
  }

  if (!favoriteId) {
    return {
      success: false,
      error: FAVORITES_ERRORS.MISSING_FAVORITE_ID,
    }
  }

  try {
    const { error } = await supabase
      .from('favorite_locations')
      .delete()
      .eq('id', favoriteId)
      .eq('user_id', userId) // RLS backup - ensure user owns this favorite

    if (error) {
      return {
        success: false,
        error: error.message || FAVORITES_ERRORS.REMOVE_FAILED,
      }
    }

    return {
      success: true,
      error: null,
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : FAVORITES_ERRORS.REMOVE_FAILED
    return {
      success: false,
      error: message,
    }
  }
}

/**
 * Update a favorite location
 *
 * Updates an existing favorite location record.
 * RLS policies ensure users can only update their own favorites.
 *
 * @param userId - The user ID updating the favorite
 * @param favoriteId - The ID of the favorite to update
 * @param updates - The fields to update
 * @returns Result indicating success or failure with the updated favorite
 *
 * @example
 * const result = await updateFavorite(userId, favoriteId, {
 *   custom_name: 'New Name',
 * })
 * if (result.success) {
 *   console.log('Favorite updated:', result.favorite?.custom_name)
 * }
 */
export async function updateFavorite(
  userId: string | null | undefined,
  favoriteId: string | null | undefined,
  updates: FavoriteLocationUpdate | null | undefined
): Promise<UpdateFavoriteResult> {
  // Validate inputs
  const validationError = validateUpdateFavoriteRequest(userId, favoriteId, updates)
  if (validationError) {
    return {
      success: false,
      favorite: null,
      error: validationError,
    }
  }

  // TypeScript now knows these are defined
  const validUserId = userId as string
  const validFavoriteId = favoriteId as string

  // If no updates provided, just return success (no-op)
  if (!updates || Object.keys(updates).length === 0) {
    // Fetch and return the current favorite
    const existingResult = await getFavoriteById(validUserId, validFavoriteId)
    return {
      success: existingResult.success,
      favorite: existingResult.favorite,
      error: existingResult.error,
    }
  }

  try {
    // Build the update object with trimmed strings
    const updateData: FavoriteLocationUpdate = {
      ...updates,
      updated_at: new Date().toISOString(),
    }

    if (updates.custom_name !== undefined) {
      updateData.custom_name = updates.custom_name.trim()
    }

    if (updates.place_name !== undefined) {
      updateData.place_name = updates.place_name.trim()
    }

    if (updates.address !== undefined) {
      updateData.address = updates.address?.trim() || null
    }

    const { data: favorite, error } = await supabase
      .from('favorite_locations')
      .update(updateData)
      .eq('id', validFavoriteId)
      .eq('user_id', validUserId) // RLS backup - ensure user owns this favorite
      .select()
      .single()

    if (error) {
      // PGRST116 means no rows returned - favorite not found or not owned
      if (error.code === 'PGRST116') {
        return {
          success: false,
          favorite: null,
          error: FAVORITES_ERRORS.NOT_FOUND,
        }
      }
      return {
        success: false,
        favorite: null,
        error: error.message || FAVORITES_ERRORS.UPDATE_FAILED,
      }
    }

    return {
      success: true,
      favorite: favorite as FavoriteLocation,
      error: null,
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : FAVORITES_ERRORS.UPDATE_FAILED
    return {
      success: false,
      favorite: null,
      error: message,
    }
  }
}

/**
 * Get all favorite locations for a user
 *
 * Fetches all favorite locations belonging to the user.
 * Results are ordered by most recently updated first.
 *
 * @param userId - The user ID to fetch favorites for
 * @returns Result with array of favorite locations
 *
 * @example
 * const result = await getUserFavorites(userId)
 * if (result.success) {
 *   result.favorites.forEach(fav => {
 *     console.log(fav.custom_name, fav.place_name)
 *   })
 * }
 */
export async function getUserFavorites(
  userId: string | null | undefined
): Promise<GetFavoritesResult> {
  if (!userId) {
    return {
      success: false,
      favorites: [],
      error: FAVORITES_ERRORS.MISSING_USER_ID,
    }
  }

  try {
    const { data, error } = await supabase
      .from('favorite_locations')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })

    if (error) {
      return {
        success: false,
        favorites: [],
        error: error.message || FAVORITES_ERRORS.FETCH_FAILED,
      }
    }

    return {
      success: true,
      favorites: (data as FavoriteLocation[]) || [],
      error: null,
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : FAVORITES_ERRORS.FETCH_FAILED
    return {
      success: false,
      favorites: [],
      error: message,
    }
  }
}

/**
 * Get a single favorite location by ID
 *
 * @param userId - The user ID (for ownership verification)
 * @param favoriteId - The favorite ID to fetch
 * @returns Result with the favorite location if found
 *
 * @example
 * const result = await getFavoriteById(userId, favoriteId)
 * if (result.success && result.favorite) {
 *   console.log('Found:', result.favorite.custom_name)
 * }
 */
export async function getFavoriteById(
  userId: string | null | undefined,
  favoriteId: string | null | undefined
): Promise<GetFavoriteResult> {
  if (!userId) {
    return {
      success: false,
      favorite: null,
      error: FAVORITES_ERRORS.MISSING_USER_ID,
    }
  }

  if (!favoriteId) {
    return {
      success: false,
      favorite: null,
      error: FAVORITES_ERRORS.MISSING_FAVORITE_ID,
    }
  }

  try {
    const { data, error } = await supabase
      .from('favorite_locations')
      .select('*')
      .eq('id', favoriteId)
      .eq('user_id', userId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return {
          success: false,
          favorite: null,
          error: FAVORITES_ERRORS.NOT_FOUND,
        }
      }
      return {
        success: false,
        favorite: null,
        error: error.message || FAVORITES_ERRORS.FETCH_FAILED,
      }
    }

    return {
      success: true,
      favorite: data as FavoriteLocation,
      error: null,
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : FAVORITES_ERRORS.FETCH_FAILED
    return {
      success: false,
      favorite: null,
      error: message,
    }
  }
}

/**
 * Get the count of favorites for a user
 *
 * Useful for checking if user is approaching the favorites limit.
 *
 * @param userId - The user ID to count favorites for
 * @returns Result with the count
 *
 * @example
 * const result = await getFavoritesCount(userId)
 * if (result.success) {
 *   console.log(`You have ${result.count} of ${MAX_FAVORITES_PER_USER} favorites`)
 * }
 */
export async function getFavoritesCount(
  userId: string | null | undefined
): Promise<{
  success: boolean
  count: number
  error: string | null
}> {
  if (!userId) {
    return {
      success: false,
      count: 0,
      error: FAVORITES_ERRORS.MISSING_USER_ID,
    }
  }

  try {
    const { count, error } = await supabase
      .from('favorite_locations')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)

    if (error) {
      return {
        success: false,
        count: 0,
        error: error.message || FAVORITES_ERRORS.FETCH_FAILED,
      }
    }

    return {
      success: true,
      count: count || 0,
      error: null,
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : FAVORITES_ERRORS.FETCH_FAILED
    return {
      success: false,
      count: 0,
      error: message,
    }
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  addFavorite,
  removeFavorite,
  updateFavorite,
  getUserFavorites,
  getFavoriteById,
  getFavoritesCount,
  validateCustomName,
  validateCoordinates,
  validateAddFavoriteRequest,
  validateUpdateFavoriteRequest,
  FAVORITES_ERRORS,
  MAX_CUSTOM_NAME_LENGTH,
  MAX_FAVORITES_PER_USER,
}
