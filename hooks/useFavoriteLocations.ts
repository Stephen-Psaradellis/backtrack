/**
 * useFavoriteLocations Hook
 *
 * Custom hook for managing user's favorite locations in the Love Ledger app.
 * Provides CRUD operations with optimistic UI updates and error handling.
 *
 * Features:
 * - Fetch user's favorite locations
 * - Add new favorites with validation
 * - Update existing favorites
 * - Remove favorites
 * - Optimistic UI updates for better UX
 * - Loading and error states
 * - Manual refetch capability
 * - Offline support with AsyncStorage caching
 * - Offline queue for add/update/delete operations
 * - Automatic cache loading on mount for instant data display
 * - Automatic queue processing and sync when coming back online
 * - Last-write-wins conflict resolution for offline operations
 * - Graceful fallback to cached data on network errors
 *
 * @module hooks/useFavoriteLocations
 *
 * @example
 * ```tsx
 * function FavoritesScreen() {
 *   const {
 *     favorites,
 *     isLoading,
 *     error,
 *     addFavorite,
 *     removeFavorite,
 *     updateFavorite,
 *   } = useFavoriteLocations()
 *
 *   if (isLoading) return <LoadingSpinner />
 *   if (error) return <ErrorMessage error={error} />
 *
 *   return (
 *     <FavoritesList
 *       favorites={favorites}
 *       onAdd={addFavorite}
 *       onRemove={removeFavorite}
 *       onUpdate={updateFavorite}
 *     />
 *   )
 * }
 * ```
 */

'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { useNetworkStatus } from './useNetworkStatus'
import {
  addFavorite as addFavoriteApi,
  removeFavorite as removeFavoriteApi,
  updateFavorite as updateFavoriteApi,
  getUserFavorites,
  getFavoriteById,
  FAVORITES_ERRORS,
  MAX_FAVORITES_PER_USER,
  type AddFavoriteData,
} from '@/lib/favorites'
import type {
  FavoriteLocation,
  FavoriteLocationUpdate,
  Coordinates,
} from '@/types/database'

// ============================================================================
// Constants
// ============================================================================

/** Error message when user is not authenticated */
const AUTH_ERROR_MESSAGE = 'You must be logged in to manage favorites.'

/** Cache key prefix for AsyncStorage */
const CACHE_KEY_PREFIX = '@love_ledger/favorites'

/** Cache key for user's favorites list */
const getCacheKey = (userId: string) => `${CACHE_KEY_PREFIX}/${userId}`

/** Cache key for last sync timestamp */
const getLastSyncKey = (userId: string) => `${CACHE_KEY_PREFIX}/${userId}/last_sync`

/** Cache expiry time in milliseconds (24 hours) */
const CACHE_EXPIRY_MS = 24 * 60 * 60 * 1000

/** Queue key for offline operations */
const getQueueKey = (userId: string) => `${CACHE_KEY_PREFIX}/${userId}/queue`

// ============================================================================
// Offline Queue Types
// ============================================================================

/**
 * Type of offline queue operation
 */
export type OfflineOperationType = 'add' | 'update' | 'delete'

/**
 * Base interface for all queued operations
 */
interface BaseQueuedOperation {
  /** Unique ID for this operation */
  id: string
  /** When the operation was queued */
  queuedAt: number
  /** Number of retry attempts */
  retryCount: number
}

/**
 * Queued add operation
 */
export interface QueuedAddOperation extends BaseQueuedOperation {
  type: 'add'
  /** Temporary ID assigned while offline */
  tempId: string
  /** The data to add */
  data: AddFavoriteData
}

/**
 * Queued update operation
 */
export interface QueuedUpdateOperation extends BaseQueuedOperation {
  type: 'update'
  /** ID of the favorite to update */
  favoriteId: string
  /** The updates to apply */
  updates: FavoriteLocationUpdate
}

/**
 * Queued delete operation
 */
export interface QueuedDeleteOperation extends BaseQueuedOperation {
  type: 'delete'
  /** ID of the favorite to delete */
  favoriteId: string
}

/**
 * Union type for all queued operations
 */
export type QueuedOperation = QueuedAddOperation | QueuedUpdateOperation | QueuedDeleteOperation

/**
 * Result of processing a single queued operation
 */
interface QueueProcessingResult {
  operationId: string
  success: boolean
  error?: string
  /** For add operations: mapping from tempId to real server ID */
  idMapping?: { tempId: string; realId: string }
}

// ============================================================================
// Types
// ============================================================================

/**
 * Error type for favorite operations
 */
export interface FavoritesError {
  /** Error code for programmatic handling */
  code: 'AUTH_ERROR' | 'FETCH_ERROR' | 'ADD_ERROR' | 'REMOVE_ERROR' | 'UPDATE_ERROR' | 'VALIDATION_ERROR'
  /** Human-readable error message */
  message: string
}

/**
 * Options for the useFavoriteLocations hook
 */
export interface UseFavoriteLocationsOptions {
  /** Whether to fetch automatically on mount (default: true) */
  enabled?: boolean
  /** User's current coordinates for distance calculation (optional) */
  userCoordinates?: Coordinates | null
}

/**
 * Extended favorite location with calculated distance
 */
export interface FavoriteLocationWithDistance extends FavoriteLocation {
  /** Distance from user's current location in meters (null if coordinates not provided) */
  distance_meters: number | null
}

/**
 * Result of an add/update/remove operation
 */
export interface FavoriteOperationResult {
  /** Whether the operation was successful */
  success: boolean
  /** The affected favorite (if applicable) */
  favorite: FavoriteLocation | null
  /** Error message if operation failed */
  error: string | null
}

/**
 * Return value from useFavoriteLocations hook
 */
export interface UseFavoriteLocationsResult {
  /** Array of user's favorite locations */
  favorites: FavoriteLocationWithDistance[]
  /** Whether initial fetch or operation is in progress */
  isLoading: boolean
  /** Whether a mutation (add/update/remove) is in progress */
  isMutating: boolean
  /** Error object if any operation failed */
  error: FavoritesError | null
  /** Function to manually trigger a refetch */
  refetch: () => Promise<void>
  /** Timestamp of the last successful fetch */
  lastFetchedAt: number | null
  /** Add a new favorite location */
  addFavorite: (data: AddFavoriteData) => Promise<FavoriteOperationResult>
  /** Remove a favorite location by ID */
  removeFavorite: (favoriteId: string) => Promise<FavoriteOperationResult>
  /** Update an existing favorite location */
  updateFavorite: (favoriteId: string, updates: FavoriteLocationUpdate) => Promise<FavoriteOperationResult>
  /** Get a single favorite by ID from the current list */
  getFavoriteById: (favoriteId: string) => FavoriteLocationWithDistance | undefined
  /** Current count of favorites */
  count: number
  /** Maximum allowed favorites */
  maxFavorites: number
  /** Whether user has reached the maximum favorites limit */
  isAtLimit: boolean
  /** Whether the device is currently offline */
  isOffline: boolean
  /** Whether the current data is from cache (not fresh from server) */
  isCached: boolean
  /** Number of pending operations in the offline queue */
  pendingOperationsCount: number
  /** Whether there are pending operations to sync */
  hasPendingOperations: boolean
  /** Whether the queue is currently being processed */
  isSyncing: boolean
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Calculate distance between two coordinates in meters using Haversine formula
 *
 * @param coord1 - First coordinate
 * @param coord2 - Second coordinate
 * @returns Distance in meters
 */
function calculateDistanceMeters(
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
 * Add distance information to favorites based on user coordinates
 *
 * @param favorites - Array of favorite locations
 * @param userCoordinates - User's current coordinates (optional)
 * @returns Favorites with distance information
 */
function addDistanceToFavorites(
  favorites: FavoriteLocation[],
  userCoordinates: Coordinates | null | undefined
): FavoriteLocationWithDistance[] {
  return favorites.map((favorite) => ({
    ...favorite,
    distance_meters: userCoordinates
      ? calculateDistanceMeters(userCoordinates, {
          latitude: favorite.latitude,
          longitude: favorite.longitude,
        })
      : null,
  }))
}

// ============================================================================
// Cache Helper Functions
// ============================================================================

/**
 * Cache structure stored in AsyncStorage
 */
interface CachedFavorites {
  /** Array of cached favorite locations */
  favorites: FavoriteLocation[]
  /** Timestamp when cache was last updated */
  cachedAt: number
}

/**
 * Load favorites from AsyncStorage cache
 *
 * @param userId - The user's ID
 * @returns Cached favorites or null if not found or expired
 */
async function loadFromCache(userId: string): Promise<FavoriteLocation[] | null> {
  try {
    const cacheKey = getCacheKey(userId)
    const cached = await AsyncStorage.getItem(cacheKey)

    if (!cached) {
      return null
    }

    const parsed: CachedFavorites = JSON.parse(cached)

    // Check if cache is expired
    const now = Date.now()
    if (now - parsed.cachedAt > CACHE_EXPIRY_MS) {
      // Cache expired, remove it
      await AsyncStorage.removeItem(cacheKey)
      return null
    }

    return parsed.favorites
  } catch {
    // Error reading cache, return null
    return null
  }
}

/**
 * Save favorites to AsyncStorage cache
 *
 * @param userId - The user's ID
 * @param favorites - Array of favorites to cache
 */
async function saveToCache(userId: string, favorites: FavoriteLocation[]): Promise<void> {
  try {
    const cacheKey = getCacheKey(userId)
    const cacheData: CachedFavorites = {
      favorites,
      cachedAt: Date.now(),
    }
    await AsyncStorage.setItem(cacheKey, JSON.stringify(cacheData))
  } catch {
    // Silently fail - caching is best-effort
  }
}

/**
 * Update a single favorite in the cache
 *
 * @param userId - The user's ID
 * @param favoriteId - ID of the favorite to update
 * @param updates - Partial updates to apply
 */
async function updateCacheItem(
  userId: string,
  favoriteId: string,
  updates: Partial<FavoriteLocation>
): Promise<void> {
  try {
    const cached = await loadFromCache(userId)
    if (!cached) return

    const updatedFavorites = cached.map((f) =>
      f.id === favoriteId ? { ...f, ...updates } : f
    )
    await saveToCache(userId, updatedFavorites)
  } catch {
    // Silently fail
  }
}

/**
 * Remove a favorite from the cache
 *
 * @param userId - The user's ID
 * @param favoriteId - ID of the favorite to remove
 */
async function removeCacheItem(userId: string, favoriteId: string): Promise<void> {
  try {
    const cached = await loadFromCache(userId)
    if (!cached) return

    const filteredFavorites = cached.filter((f) => f.id !== favoriteId)
    await saveToCache(userId, filteredFavorites)
  } catch {
    // Silently fail
  }
}

/**
 * Add a favorite to the cache
 *
 * @param userId - The user's ID
 * @param favorite - The favorite to add
 */
async function addCacheItem(userId: string, favorite: FavoriteLocation): Promise<void> {
  try {
    const cached = await loadFromCache(userId) || []
    const updatedFavorites = [favorite, ...cached]
    await saveToCache(userId, updatedFavorites)
  } catch {
    // Silently fail
  }
}

/**
 * Clear the cache for a user
 *
 * @param userId - The user's ID
 */
async function clearCache(userId: string): Promise<void> {
  try {
    const cacheKey = getCacheKey(userId)
    await AsyncStorage.removeItem(cacheKey)
  } catch {
    // Silently fail
  }
}

// ============================================================================
// Offline Queue Helper Functions
// ============================================================================

/**
 * Generate a unique ID for temporary offline items
 */
function generateTempId(): string {
  return `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Generate a unique operation ID
 */
function generateOperationId(): string {
  return `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Load the offline operations queue from AsyncStorage
 *
 * @param userId - The user's ID
 * @returns Array of queued operations or empty array
 */
async function loadQueue(userId: string): Promise<QueuedOperation[]> {
  try {
    const queueKey = getQueueKey(userId)
    const queueData = await AsyncStorage.getItem(queueKey)

    if (!queueData) {
      return []
    }

    return JSON.parse(queueData)
  } catch {
    return []
  }
}

/**
 * Save the offline operations queue to AsyncStorage
 *
 * @param userId - The user's ID
 * @param queue - Array of queued operations
 */
async function saveQueue(userId: string, queue: QueuedOperation[]): Promise<void> {
  try {
    const queueKey = getQueueKey(userId)
    await AsyncStorage.setItem(queueKey, JSON.stringify(queue))
  } catch {
    // Silently fail - we'll retry on next operation
  }
}

/**
 * Add an operation to the offline queue
 *
 * @param userId - The user's ID
 * @param operation - The operation to queue
 */
async function addToQueue(userId: string, operation: QueuedOperation): Promise<void> {
  const queue = await loadQueue(userId)

  // Optimize queue: if there are conflicting operations, merge them
  const optimizedQueue = optimizeQueueWithNewOperation(queue, operation)

  await saveQueue(userId, optimizedQueue)
}

/**
 * Remove an operation from the queue
 *
 * @param userId - The user's ID
 * @param operationId - The operation ID to remove
 */
async function removeFromQueue(userId: string, operationId: string): Promise<void> {
  const queue = await loadQueue(userId)
  const filteredQueue = queue.filter((op) => op.id !== operationId)
  await saveQueue(userId, filteredQueue)
}

/**
 * Clear the entire queue for a user
 *
 * @param userId - The user's ID
 */
async function clearQueue(userId: string): Promise<void> {
  try {
    const queueKey = getQueueKey(userId)
    await AsyncStorage.removeItem(queueKey)
  } catch {
    // Silently fail
  }
}

/**
 * Optimize the queue when adding a new operation
 * Implements last-write-wins strategy for conflicts
 *
 * @param queue - Current queue
 * @param newOperation - New operation to add
 * @returns Optimized queue
 */
function optimizeQueueWithNewOperation(
  queue: QueuedOperation[],
  newOperation: QueuedOperation
): QueuedOperation[] {
  // For add operations, just append to the queue
  if (newOperation.type === 'add') {
    return [...queue, newOperation]
  }

  // For update operations, check if there's an existing operation for the same favorite
  if (newOperation.type === 'update') {
    const existingIndex = queue.findIndex(
      (op) =>
        (op.type === 'update' && op.favoriteId === newOperation.favoriteId) ||
        (op.type === 'add' && op.tempId === newOperation.favoriteId)
    )

    if (existingIndex !== -1) {
      const existingOp = queue[existingIndex]

      // If updating a temp item (queued add), merge the updates into the add operation
      if (existingOp.type === 'add') {
        const mergedOp: QueuedAddOperation = {
          ...existingOp,
          data: {
            ...existingOp.data,
            custom_name: newOperation.updates.custom_name ?? existingOp.data.custom_name,
          },
        }
        return [...queue.slice(0, existingIndex), mergedOp, ...queue.slice(existingIndex + 1)]
      }

      // If there's an existing update for this favorite, replace it (last-write-wins)
      if (existingOp.type === 'update') {
        const mergedOp: QueuedUpdateOperation = {
          ...existingOp,
          updates: { ...existingOp.updates, ...newOperation.updates },
          queuedAt: newOperation.queuedAt, // Update timestamp to latest
        }
        return [...queue.slice(0, existingIndex), mergedOp, ...queue.slice(existingIndex + 1)]
      }
    }

    return [...queue, newOperation]
  }

  // For delete operations
  if (newOperation.type === 'delete') {
    // Remove any pending add/update operations for this favorite
    const filteredQueue = queue.filter((op) => {
      if (op.type === 'add' && op.tempId === newOperation.favoriteId) {
        return false // Remove the add since we're deleting it anyway
      }
      if (op.type === 'update' && op.favoriteId === newOperation.favoriteId) {
        return false // Remove updates since we're deleting
      }
      return true
    })

    // Check if we removed an add operation - if so, don't need to add delete
    const hadPendingAdd = queue.some(
      (op) => op.type === 'add' && op.tempId === newOperation.favoriteId
    )

    if (hadPendingAdd) {
      // Item was never synced to server, just remove from queue
      return filteredQueue
    }

    // Check if there's already a delete for this item
    const hasExistingDelete = filteredQueue.some(
      (op) => op.type === 'delete' && op.favoriteId === newOperation.favoriteId
    )

    if (hasExistingDelete) {
      return filteredQueue // Already have a delete queued
    }

    return [...filteredQueue, newOperation]
  }

  return [...queue, newOperation]
}

/**
 * Create a temporary favorite from add data
 * Used for optimistic updates when adding offline
 *
 * @param tempId - Temporary ID for the favorite
 * @param userId - User's ID
 * @param data - The add favorite data
 * @returns A FavoriteLocation object
 */
function createTempFavorite(
  tempId: string,
  userId: string,
  data: AddFavoriteData
): FavoriteLocation {
  const now = new Date().toISOString()
  return {
    id: tempId,
    user_id: userId,
    custom_name: data.custom_name,
    place_name: data.place_name,
    latitude: data.latitude,
    longitude: data.longitude,
    address: data.address ?? null,
    place_id: data.place_id ?? null,
    created_at: now,
    updated_at: now,
  }
}

// ============================================================================
// Hook Implementation
// ============================================================================

/**
 * React hook for managing favorite locations with CRUD operations.
 *
 * Features:
 * - Automatic fetching on mount (unless disabled)
 * - Optimistic UI updates for add/remove/update operations
 * - Loading and error states
 * - Distance calculation from user's current location
 * - Maximum favorites limit enforcement
 * - Offline support with AsyncStorage caching
 * - Offline queue for add/update/delete operations
 * - Automatic queue processing when coming back online
 * - Last-write-wins conflict resolution
 * - Cache fallback on network errors
 *
 * @param options - Configuration options for the hook
 * @returns Object containing favorites, state, and CRUD functions
 *
 * @example
 * // Basic usage
 * const { favorites, isLoading, addFavorite } = useFavoriteLocations()
 *
 * @example
 * // With user coordinates for distance calculation
 * const { favorites } = useFavoriteLocations({
 *   userCoordinates: { latitude: 37.7749, longitude: -122.4194 }
 * })
 * // favorites[0].distance_meters will contain the distance
 *
 * @example
 * // Offline-aware usage with queue
 * const {
 *   favorites,
 *   isOffline,
 *   isCached,
 *   hasPendingOperations,
 *   pendingOperationsCount,
 *   isSyncing,
 *   addFavorite
 * } = useFavoriteLocations()
 *
 * if (isOffline) {
 *   // Show offline indicator - operations will be queued
 * }
 * if (isCached) {
 *   // Data is from cache, may be stale
 * }
 * if (hasPendingOperations) {
 *   // Show pending sync indicator
 * }
 * if (isSyncing) {
 *   // Show syncing indicator
 * }
 *
 * @example
 * // Add a new favorite
 * const result = await addFavorite({
 *   custom_name: 'My Coffee Shop',
 *   place_name: 'Starbucks',
 *   latitude: 37.7749,
 *   longitude: -122.4194,
 * })
 * if (result.success) {
 *   console.log('Added:', result.favorite?.custom_name)
 * }
 */
export function useFavoriteLocations(
  options: UseFavoriteLocationsOptions = {}
): UseFavoriteLocationsResult {
  const { enabled = true, userCoordinates } = options

  // ---------------------------------------------------------------------------
  // Auth Context
  // ---------------------------------------------------------------------------

  const { userId, isAuthenticated } = useAuth()

  // ---------------------------------------------------------------------------
  // Network Status
  // ---------------------------------------------------------------------------

  const { isConnected } = useNetworkStatus()
  const isOffline = !isConnected

  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------

  const [favorites, setFavorites] = useState<FavoriteLocation[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isMutating, setIsMutating] = useState(false)
  const [error, setError] = useState<FavoritesError | null>(null)
  const [lastFetchedAt, setLastFetchedAt] = useState<number | null>(null)
  /** Whether current data is from cache (not fresh from server) */
  const [isCached, setIsCached] = useState(false)
  /** Track if we've already loaded from cache to prevent duplicate loads */
  const [cacheLoaded, setCacheLoaded] = useState(false)
  /** Number of pending operations in the offline queue */
  const [pendingOperationsCount, setPendingOperationsCount] = useState(0)
  /** Whether the queue is currently being processed */
  const [isSyncing, setIsSyncing] = useState(false)

  // ---------------------------------------------------------------------------
  // Refs
  // ---------------------------------------------------------------------------

  const abortControllerRef = useRef<AbortController | null>(null)
  const supabaseRef = useRef(createClient())
  /** Track previous network state to detect reconnection */
  const wasOfflineRef = useRef(isOffline)
  /** Prevent concurrent queue processing */
  const isProcessingQueueRef = useRef(false)

  // ---------------------------------------------------------------------------
  // Computed Values
  // ---------------------------------------------------------------------------

  /**
   * Favorites with distance information calculated from user coordinates
   */
  const favoritesWithDistance = useMemo(
    () => addDistanceToFavorites(favorites, userCoordinates),
    [favorites, userCoordinates]
  )

  /**
   * Current count of favorites
   */
  const count = favorites.length

  /**
   * Whether user has reached the maximum favorites limit
   */
  const isAtLimit = count >= MAX_FAVORITES_PER_USER

  // ---------------------------------------------------------------------------
  // Fetch Operations
  // ---------------------------------------------------------------------------

  /**
   * Load favorites from cache (used on mount and when offline)
   */
  const loadCachedFavorites = useCallback(async () => {
    if (!userId) return false

    const cached = await loadFromCache(userId)
    if (cached && cached.length > 0) {
      setFavorites(cached)
      setIsCached(true)
      return true
    }
    return false
  }, [userId])

  /**
   * Fetch all favorites for the current user
   */
  const fetchFavorites = useCallback(async () => {
    if (!isAuthenticated || !userId) {
      setFavorites([])
      setError({
        code: 'AUTH_ERROR',
        message: AUTH_ERROR_MESSAGE,
      })
      return
    }

    // If offline, try to load from cache only
    if (isOffline) {
      const hasCache = await loadCachedFavorites()
      if (!hasCache) {
        setError({
          code: 'FETCH_ERROR',
          message: 'Unable to load favorites while offline.',
        })
      }
      return
    }

    // Cancel any in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    abortControllerRef.current = new AbortController()

    setIsLoading(true)
    setError(null)

    try {
      const result = await getUserFavorites(userId)

      // Only update state if request wasn't aborted
      if (!abortControllerRef.current?.signal.aborted) {
        if (result.success) {
          setFavorites(result.favorites)
          setLastFetchedAt(Date.now())
          setIsCached(false) // Data is fresh from server

          // Save to cache for offline access
          await saveToCache(userId, result.favorites)
        } else {
          setError({
            code: 'FETCH_ERROR',
            message: result.error || FAVORITES_ERRORS.FETCH_FAILED,
          })
          // On fetch error, try to load from cache as fallback
          await loadCachedFavorites()
        }
      }
    } catch (err) {
      // Don't update state if request was aborted
      if (abortControllerRef.current?.signal.aborted) {
        return
      }

      setError({
        code: 'FETCH_ERROR',
        message: err instanceof Error ? err.message : FAVORITES_ERRORS.FETCH_FAILED,
      })
      // On fetch error, try to load from cache as fallback
      await loadCachedFavorites()
    } finally {
      if (!abortControllerRef.current?.signal.aborted) {
        setIsLoading(false)
      }
    }
  }, [userId, isAuthenticated, isOffline, loadCachedFavorites])

  /**
   * Manual refetch function
   */
  const refetch = useCallback(async () => {
    await fetchFavorites()
  }, [fetchFavorites])

  // ---------------------------------------------------------------------------
  // CRUD Operations
  // ---------------------------------------------------------------------------

  /**
   * Add a new favorite location
   *
   * Uses optimistic update: adds to local state immediately, then syncs with server.
   * When offline, queues the operation for later sync.
   */
  const addFavorite = useCallback(
    async (data: AddFavoriteData): Promise<FavoriteOperationResult> => {
      if (!isAuthenticated || !userId) {
        return {
          success: false,
          favorite: null,
          error: AUTH_ERROR_MESSAGE,
        }
      }

      // Check limit before attempting
      if (isAtLimit) {
        return {
          success: false,
          favorite: null,
          error: FAVORITES_ERRORS.MAX_FAVORITES_REACHED,
        }
      }

      setIsMutating(true)
      setError(null)

      // When offline, queue the operation and apply optimistic update
      if (isOffline) {
        try {
          const tempId = generateTempId()
          const tempFavorite = createTempFavorite(tempId, userId, data)

          // Create and queue the add operation
          const operation: QueuedAddOperation = {
            id: generateOperationId(),
            type: 'add',
            tempId,
            data,
            queuedAt: Date.now(),
            retryCount: 0,
          }

          await addToQueue(userId, operation)

          // Optimistic update: add to local state
          setFavorites((prev) => [tempFavorite, ...prev])

          // Update cache with the temp favorite
          await addCacheItem(userId, tempFavorite)

          // Update pending operations count
          const queue = await loadQueue(userId)
          setPendingOperationsCount(queue.length)

          return {
            success: true,
            favorite: tempFavorite,
            error: null,
          }
        } catch (err) {
          const errorMessage = 'Failed to queue offline operation. Please try again.'
          setError({
            code: 'ADD_ERROR',
            message: errorMessage,
          })

          return {
            success: false,
            favorite: null,
            error: errorMessage,
          }
        } finally {
          setIsMutating(false)
        }
      }

      // Online: proceed with server sync
      try {
        const result = await addFavoriteApi(userId, data)

        if (result.success && result.favorite) {
          // Update local state with the new favorite
          setFavorites((prev) => [result.favorite!, ...prev])
          setLastFetchedAt(Date.now())

          // Update cache with the new favorite
          await addCacheItem(userId, result.favorite)

          return {
            success: true,
            favorite: result.favorite,
            error: null,
          }
        } else {
          setError({
            code: 'ADD_ERROR',
            message: result.error || FAVORITES_ERRORS.ADD_FAILED,
          })

          return {
            success: false,
            favorite: null,
            error: result.error,
          }
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : FAVORITES_ERRORS.ADD_FAILED
        setError({
          code: 'ADD_ERROR',
          message: errorMessage,
        })

        return {
          success: false,
          favorite: null,
          error: errorMessage,
        }
      } finally {
        setIsMutating(false)
      }
    },
    [userId, isAuthenticated, isAtLimit, isOffline]
  )

  /**
   * Remove a favorite location
   *
   * Uses optimistic update: removes from local state immediately, then syncs with server.
   * When offline, queues the operation for later sync.
   */
  const removeFavorite = useCallback(
    async (favoriteId: string): Promise<FavoriteOperationResult> => {
      if (!isAuthenticated || !userId) {
        return {
          success: false,
          favorite: null,
          error: AUTH_ERROR_MESSAGE,
        }
      }

      // Store the favorite for potential rollback
      const removedFavorite = favorites.find((f) => f.id === favoriteId)
      if (!removedFavorite) {
        return {
          success: false,
          favorite: null,
          error: FAVORITES_ERRORS.NOT_FOUND,
        }
      }

      setIsMutating(true)
      setError(null)

      // Optimistic update: remove immediately
      setFavorites((prev) => prev.filter((f) => f.id !== favoriteId))

      // When offline, queue the operation
      if (isOffline) {
        try {
          // Create and queue the delete operation
          const operation: QueuedDeleteOperation = {
            id: generateOperationId(),
            type: 'delete',
            favoriteId,
            queuedAt: Date.now(),
            retryCount: 0,
          }

          await addToQueue(userId, operation)

          // Update cache to remove the favorite
          await removeCacheItem(userId, favoriteId)

          // Update pending operations count
          const queue = await loadQueue(userId)
          setPendingOperationsCount(queue.length)

          return {
            success: true,
            favorite: removedFavorite,
            error: null,
          }
        } catch (err) {
          // Rollback on error
          setFavorites((prev) => [removedFavorite, ...prev])
          const errorMessage = 'Failed to queue offline operation. Please try again.'
          setError({
            code: 'REMOVE_ERROR',
            message: errorMessage,
          })

          return {
            success: false,
            favorite: null,
            error: errorMessage,
          }
        } finally {
          setIsMutating(false)
        }
      }

      // Online: proceed with server sync
      try {
        const result = await removeFavoriteApi(userId, favoriteId)

        if (result.success) {
          setLastFetchedAt(Date.now())

          // Update cache to remove the favorite
          await removeCacheItem(userId, favoriteId)

          return {
            success: true,
            favorite: removedFavorite,
            error: null,
          }
        } else {
          // Rollback on failure
          setFavorites((prev) => [removedFavorite, ...prev])
          setError({
            code: 'REMOVE_ERROR',
            message: result.error || FAVORITES_ERRORS.REMOVE_FAILED,
          })

          return {
            success: false,
            favorite: null,
            error: result.error,
          }
        }
      } catch (err) {
        // Rollback on error
        setFavorites((prev) => [removedFavorite, ...prev])
        const errorMessage = err instanceof Error ? err.message : FAVORITES_ERRORS.REMOVE_FAILED
        setError({
          code: 'REMOVE_ERROR',
          message: errorMessage,
        })

        return {
          success: false,
          favorite: null,
          error: errorMessage,
        }
      } finally {
        setIsMutating(false)
      }
    },
    [userId, isAuthenticated, favorites, isOffline]
  )

  /**
   * Update an existing favorite location
   *
   * Uses optimistic update: updates local state immediately, then syncs with server.
   * When offline, queues the operation for later sync.
   */
  const updateFavorite = useCallback(
    async (favoriteId: string, updates: FavoriteLocationUpdate): Promise<FavoriteOperationResult> => {
      if (!isAuthenticated || !userId) {
        return {
          success: false,
          favorite: null,
          error: AUTH_ERROR_MESSAGE,
        }
      }

      // Store the original for potential rollback
      const originalFavorite = favorites.find((f) => f.id === favoriteId)
      if (!originalFavorite) {
        return {
          success: false,
          favorite: null,
          error: FAVORITES_ERRORS.NOT_FOUND,
        }
      }

      setIsMutating(true)
      setError(null)

      // Optimistic update: apply changes immediately
      const updatedFavorite = {
        ...originalFavorite,
        ...updates,
        updated_at: new Date().toISOString(),
      }
      setFavorites((prev) =>
        prev.map((f) => (f.id === favoriteId ? updatedFavorite : f))
      )

      // When offline, queue the operation
      if (isOffline) {
        try {
          // Create and queue the update operation
          const operation: QueuedUpdateOperation = {
            id: generateOperationId(),
            type: 'update',
            favoriteId,
            updates,
            queuedAt: Date.now(),
            retryCount: 0,
          }

          await addToQueue(userId, operation)

          // Update cache with the updated favorite
          await updateCacheItem(userId, favoriteId, updatedFavorite)

          // Update pending operations count
          const queue = await loadQueue(userId)
          setPendingOperationsCount(queue.length)

          return {
            success: true,
            favorite: updatedFavorite,
            error: null,
          }
        } catch (err) {
          // Rollback on error
          setFavorites((prev) =>
            prev.map((f) => (f.id === favoriteId ? originalFavorite : f))
          )
          const errorMessage = 'Failed to queue offline operation. Please try again.'
          setError({
            code: 'UPDATE_ERROR',
            message: errorMessage,
          })

          return {
            success: false,
            favorite: null,
            error: errorMessage,
          }
        } finally {
          setIsMutating(false)
        }
      }

      // Online: proceed with server sync
      try {
        const result = await updateFavoriteApi(userId, favoriteId, updates)

        if (result.success && result.favorite) {
          // Update with actual server response
          setFavorites((prev) =>
            prev.map((f) => (f.id === favoriteId ? result.favorite! : f))
          )
          setLastFetchedAt(Date.now())

          // Update cache with the updated favorite
          await updateCacheItem(userId, favoriteId, result.favorite)

          return {
            success: true,
            favorite: result.favorite,
            error: null,
          }
        } else {
          // Rollback on failure
          setFavorites((prev) =>
            prev.map((f) => (f.id === favoriteId ? originalFavorite : f))
          )
          setError({
            code: 'UPDATE_ERROR',
            message: result.error || FAVORITES_ERRORS.UPDATE_FAILED,
          })

          return {
            success: false,
            favorite: null,
            error: result.error,
          }
        }
      } catch (err) {
        // Rollback on error
        setFavorites((prev) =>
          prev.map((f) => (f.id === favoriteId ? originalFavorite : f))
        )
        const errorMessage = err instanceof Error ? err.message : FAVORITES_ERRORS.UPDATE_FAILED
        setError({
          code: 'UPDATE_ERROR',
          message: errorMessage,
        })

        return {
          success: false,
          favorite: null,
          error: errorMessage,
        }
      } finally {
        setIsMutating(false)
      }
    },
    [userId, isAuthenticated, favorites, isOffline]
  )

  /**
   * Get a single favorite by ID from the current list
   */
  const getFavoriteByIdLocal = useCallback(
    (favoriteId: string): FavoriteLocationWithDistance | undefined => {
      return favoritesWithDistance.find((f) => f.id === favoriteId)
    },
    [favoritesWithDistance]
  )

  // ---------------------------------------------------------------------------
  // Queue Processing
  // ---------------------------------------------------------------------------

  /**
   * Process a single add operation from the queue
   */
  const processAddOperation = useCallback(
    async (operation: QueuedAddOperation): Promise<QueueProcessingResult> => {
      try {
        const result = await addFavoriteApi(userId!, operation.data)

        if (result.success && result.favorite) {
          // Replace temp favorite with real one in state
          setFavorites((prev) =>
            prev.map((f) =>
              f.id === operation.tempId ? result.favorite! : f
            )
          )

          // Update cache with the real favorite
          await removeCacheItem(userId!, operation.tempId)
          await addCacheItem(userId!, result.favorite)

          return {
            operationId: operation.id,
            success: true,
            idMapping: { tempId: operation.tempId, realId: result.favorite.id },
          }
        }

        return {
          operationId: operation.id,
          success: false,
          error: result.error || 'Failed to sync add operation',
        }
      } catch (err) {
        return {
          operationId: operation.id,
          success: false,
          error: err instanceof Error ? err.message : 'Failed to sync add operation',
        }
      }
    },
    [userId]
  )

  /**
   * Process a single update operation from the queue
   */
  const processUpdateOperation = useCallback(
    async (
      operation: QueuedUpdateOperation,
      idMappings: Map<string, string>
    ): Promise<QueueProcessingResult> => {
      try {
        // Check if the favorite ID was a temp ID that's been mapped
        const realFavoriteId = idMappings.get(operation.favoriteId) || operation.favoriteId

        // Skip if this is a temp ID that doesn't have a mapping (add operation failed)
        if (operation.favoriteId.startsWith('temp_') && !idMappings.has(operation.favoriteId)) {
          return {
            operationId: operation.id,
            success: false,
            error: 'Cannot update: original add operation failed',
          }
        }

        const result = await updateFavoriteApi(userId!, realFavoriteId, operation.updates)

        if (result.success && result.favorite) {
          // Update state with server response
          setFavorites((prev) =>
            prev.map((f) =>
              f.id === operation.favoriteId || f.id === realFavoriteId ? result.favorite! : f
            )
          )

          // Update cache
          await updateCacheItem(userId!, realFavoriteId, result.favorite)

          return {
            operationId: operation.id,
            success: true,
          }
        }

        return {
          operationId: operation.id,
          success: false,
          error: result.error || 'Failed to sync update operation',
        }
      } catch (err) {
        return {
          operationId: operation.id,
          success: false,
          error: err instanceof Error ? err.message : 'Failed to sync update operation',
        }
      }
    },
    [userId]
  )

  /**
   * Process a single delete operation from the queue
   */
  const processDeleteOperation = useCallback(
    async (
      operation: QueuedDeleteOperation,
      idMappings: Map<string, string>
    ): Promise<QueueProcessingResult> => {
      try {
        // Check if the favorite ID was a temp ID that's been mapped
        const realFavoriteId = idMappings.get(operation.favoriteId) || operation.favoriteId

        // Skip if this is a temp ID that doesn't have a mapping (add operation failed)
        // The item was already removed from local state, so no action needed
        if (operation.favoriteId.startsWith('temp_') && !idMappings.has(operation.favoriteId)) {
          return {
            operationId: operation.id,
            success: true, // Consider it successful since the item doesn't exist on server
          }
        }

        const result = await removeFavoriteApi(userId!, realFavoriteId)

        if (result.success) {
          return {
            operationId: operation.id,
            success: true,
          }
        }

        return {
          operationId: operation.id,
          success: false,
          error: result.error || 'Failed to sync delete operation',
        }
      } catch (err) {
        return {
          operationId: operation.id,
          success: false,
          error: err instanceof Error ? err.message : 'Failed to sync delete operation',
        }
      }
    },
    [userId]
  )

  /**
   * Process all pending operations in the queue
   * Called when coming back online
   */
  const processQueue = useCallback(async (): Promise<void> => {
    if (!userId || isProcessingQueueRef.current) {
      return
    }

    const queue = await loadQueue(userId)
    if (queue.length === 0) {
      setPendingOperationsCount(0)
      return
    }

    isProcessingQueueRef.current = true
    setIsSyncing(true)

    // Track ID mappings for temp IDs -> real IDs
    const idMappings = new Map<string, string>()
    const processedOperations: string[] = []

    try {
      // Process operations in order (FIFO)
      for (const operation of queue) {
        let result: QueueProcessingResult

        switch (operation.type) {
          case 'add':
            result = await processAddOperation(operation)
            if (result.success && result.idMapping) {
              idMappings.set(result.idMapping.tempId, result.idMapping.realId)
            }
            break

          case 'update':
            result = await processUpdateOperation(operation, idMappings)
            break

          case 'delete':
            result = await processDeleteOperation(operation, idMappings)
            break

          default:
            result = { operationId: operation.id, success: false, error: 'Unknown operation type' }
        }

        if (result.success) {
          processedOperations.push(result.operationId)
        }
        // Note: Failed operations stay in queue for retry on next online event
      }

      // Remove successfully processed operations from queue
      const remainingQueue = queue.filter((op) => !processedOperations.includes(op.id))
      await saveQueue(userId, remainingQueue)
      setPendingOperationsCount(remainingQueue.length)
    } finally {
      isProcessingQueueRef.current = false
      setIsSyncing(false)
    }
  }, [userId, processAddOperation, processUpdateOperation, processDeleteOperation])

  // ---------------------------------------------------------------------------
  // Effects
  // ---------------------------------------------------------------------------

  /**
   * Load from cache on mount for instant data display
   */
  useEffect(() => {
    if (!enabled || !isAuthenticated || !userId || cacheLoaded) {
      return
    }

    const loadCache = async () => {
      const cached = await loadFromCache(userId)
      if (cached && cached.length > 0) {
        setFavorites(cached)
        setIsCached(true)
      }
      setCacheLoaded(true)
    }

    loadCache()
  }, [enabled, isAuthenticated, userId, cacheLoaded])

  /**
   * Fetch favorites on mount when enabled and authenticated
   */
  useEffect(() => {
    if (!enabled) {
      return
    }

    if (!isAuthenticated) {
      setFavorites([])
      return
    }

    fetchFavorites()

    // Cleanup: abort any in-flight request
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [enabled, isAuthenticated, fetchFavorites])

  /**
   * Load pending operations count on mount
   */
  useEffect(() => {
    if (!userId) {
      setPendingOperationsCount(0)
      return
    }

    const loadPendingCount = async () => {
      const queue = await loadQueue(userId)
      setPendingOperationsCount(queue.length)
    }

    loadPendingCount()
  }, [userId])

  /**
   * Process queue and refetch when coming back online
   */
  useEffect(() => {
    // Detect transition from offline to online
    if (wasOfflineRef.current && !isOffline && isAuthenticated && userId) {
      // User came back online, process queue first, then refetch
      const syncOnReconnect = async () => {
        await processQueue()
        await fetchFavorites()
      }
      syncOnReconnect()
    }

    // Update the ref for next render
    wasOfflineRef.current = isOffline
  }, [isOffline, isAuthenticated, userId, processQueue, fetchFavorites])

  /**
   * Clear cache and queue when user signs out
   */
  useEffect(() => {
    if (!isAuthenticated && userId) {
      // User signed out, clear their cache and queue
      clearCache(userId)
      clearQueue(userId)
      setPendingOperationsCount(0)
    }
  }, [isAuthenticated, userId])

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  // ---------------------------------------------------------------------------
  // Return
  // ---------------------------------------------------------------------------

  return {
    favorites: favoritesWithDistance,
    isLoading,
    isMutating,
    error,
    refetch,
    lastFetchedAt,
    addFavorite,
    removeFavorite,
    updateFavorite,
    getFavoriteById: getFavoriteByIdLocal,
    count,
    maxFavorites: MAX_FAVORITES_PER_USER,
    isAtLimit,
    isOffline,
    isCached,
    pendingOperationsCount,
    hasPendingOperations: pendingOperationsCount > 0,
    isSyncing,
  }
}

// ============================================================================
// Exports
// ============================================================================

export default useFavoriteLocations
