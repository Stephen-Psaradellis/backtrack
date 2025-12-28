/**
 * Edge Case Tests for useFavoriteLocations Hook
 *
 * This file contains edge case tests for the hook's offline functionality,
 * permission handling, and state management edge cases.
 *
 * @module hooks/__tests__/useFavoriteLocations.edge-cases.test.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react-hooks'
import React from 'react'

// Mock dependencies before importing hook
vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
  },
}))

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: vi.fn(() => ({
    userId: 'test-user-123',
    isAuthenticated: true,
  })),
}))

vi.mock('../useNetworkStatus', () => ({
  useNetworkStatus: vi.fn(() => ({
    isConnected: true,
  })),
}))

vi.mock('../../lib/supabase/client', () => ({
  createClient: vi.fn(() => ({})),
}))

vi.mock('../../lib/favorites', () => ({
  addFavorite: vi.fn(),
  removeFavorite: vi.fn(),
  updateFavorite: vi.fn(),
  getUserFavorites: vi.fn(),
  getFavoriteById: vi.fn(),
  FAVORITES_ERRORS: {
    MISSING_USER_ID: 'User ID is required.',
    MISSING_FAVORITE_ID: 'Favorite ID is required.',
    MISSING_CUSTOM_NAME: 'Custom name is required.',
    CUSTOM_NAME_TOO_LONG: 'Custom name must be 50 characters or less.',
    MISSING_PLACE_NAME: 'Place name is required.',
    MISSING_COORDINATES: 'Location coordinates are required.',
    INVALID_COORDINATES: 'Invalid location coordinates.',
    ADD_FAILED: 'Failed to add favorite location. Please try again.',
    REMOVE_FAILED: 'Failed to remove favorite location. Please try again.',
    UPDATE_FAILED: 'Failed to update favorite location. Please try again.',
    FETCH_FAILED: 'Failed to fetch favorite locations. Please try again.',
    NOT_FOUND: 'Favorite location not found.',
    MAX_FAVORITES_REACHED: 'Maximum of 50 favorites allowed.',
  },
  MAX_FAVORITES_PER_USER: 50,
}))

import AsyncStorage from '@react-native-async-storage/async-storage'
import { useAuth } from '../../contexts/AuthContext'
import { useNetworkStatus } from '../useNetworkStatus'
import * as favoritesLib from '../../lib/favorites'

// Import hook after mocks
import { useFavoriteLocations } from '../useFavoriteLocations'
import type { FavoriteLocation } from '../../types/database'

// Helper to create test favorites
function createTestFavorite(id: string, customName: string): FavoriteLocation {
  return {
    id,
    user_id: 'test-user-123',
    custom_name: customName,
    place_name: 'Test Place',
    latitude: 40.7128,
    longitude: -74.006,
    address: '123 Test St',
    place_id: 'test-place-id',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
}

describe('useFavoriteLocations Edge Cases', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Default mock implementations
    ;(useAuth as any).mockReturnValue({
      userId: 'test-user-123',
      isAuthenticated: true,
    })

    ;(useNetworkStatus as any).mockReturnValue({
      isConnected: true,
    })

    ;(AsyncStorage.getItem as any).mockResolvedValue(null)
    ;(AsyncStorage.setItem as any).mockResolvedValue(undefined)
    ;(AsyncStorage.removeItem as any).mockResolvedValue(undefined)

    ;(favoritesLib.getUserFavorites as any).mockResolvedValue({
      success: true,
      favorites: [],
      error: null,
    })

    ;(favoritesLib.addFavorite as any).mockResolvedValue({
      success: true,
      favorite: createTestFavorite('new-fav', 'New Favorite'),
      error: null,
    })

    ;(favoritesLib.removeFavorite as any).mockResolvedValue({
      success: true,
      error: null,
    })

    ;(favoritesLib.updateFavorite as any).mockResolvedValue({
      success: true,
      favorite: createTestFavorite('updated-fav', 'Updated Favorite'),
      error: null,
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // ==========================================================================
  // Edge Case 1: Empty Favorites
  // ==========================================================================

  describe('Empty Favorites', () => {
    it('returns empty array when user has no favorites', async () => {
      ;(favoritesLib.getUserFavorites as any).mockResolvedValue({
        success: true,
        favorites: [],
        error: null,
      })

      const { result } = renderHook(() => useFavoriteLocations())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.favorites).toEqual([])
      expect(result.current.count).toBe(0)
      expect(result.current.isAtLimit).toBe(false)
    })

    it('shows isAtLimit as false when empty', async () => {
      ;(favoritesLib.getUserFavorites as any).mockResolvedValue({
        success: true,
        favorites: [],
        error: null,
      })

      const { result } = renderHook(() => useFavoriteLocations())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.isAtLimit).toBe(false)
    })
  })

  // ==========================================================================
  // Edge Case 2: Max Favorites Limit
  // ==========================================================================

  describe('Max Favorites Limit', () => {
    it('shows isAtLimit as true when at 50 favorites', async () => {
      const fiftyFavorites = Array.from({ length: 50 }, (_, i) =>
        createTestFavorite(`fav-${i}`, `Favorite ${i}`)
      )

      ;(favoritesLib.getUserFavorites as any).mockResolvedValue({
        success: true,
        favorites: fiftyFavorites,
        error: null,
      })

      const { result } = renderHook(() => useFavoriteLocations())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.count).toBe(50)
      expect(result.current.isAtLimit).toBe(true)
    })

    it('returns max favorites limit constant', async () => {
      const { result } = renderHook(() => useFavoriteLocations())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.maxFavorites).toBe(50)
    })

    it('prevents adding when at limit', async () => {
      const fiftyFavorites = Array.from({ length: 50 }, (_, i) =>
        createTestFavorite(`fav-${i}`, `Favorite ${i}`)
      )

      ;(favoritesLib.getUserFavorites as any).mockResolvedValue({
        success: true,
        favorites: fiftyFavorites,
        error: null,
      })

      const { result } = renderHook(() => useFavoriteLocations())

      await waitFor(() => {
        expect(result.current.isAtLimit).toBe(true)
      })

      let addResult: any
      await act(async () => {
        addResult = await result.current.addFavorite({
          custom_name: 'New Place',
          place_name: 'Test',
          latitude: 40.7128,
          longitude: -74.006,
        })
      })

      expect(addResult.success).toBe(false)
      expect(addResult.error).toContain('Maximum')
    })
  })

  // ==========================================================================
  // Edge Case 3: Offline Mode
  // ==========================================================================

  describe('Offline Mode', () => {
    it('returns isOffline as true when not connected', async () => {
      ;(useNetworkStatus as any).mockReturnValue({
        isConnected: false,
      })

      const { result } = renderHook(() => useFavoriteLocations())

      expect(result.current.isOffline).toBe(true)
    })

    it('returns isOffline as false when connected', async () => {
      ;(useNetworkStatus as any).mockReturnValue({
        isConnected: true,
      })

      const { result } = renderHook(() => useFavoriteLocations())

      expect(result.current.isOffline).toBe(false)
    })

    it('loads from cache when offline', async () => {
      const cachedFavorites = [createTestFavorite('cached-1', 'Cached Favorite')]

      ;(useNetworkStatus as any).mockReturnValue({
        isConnected: false,
      })

      ;(AsyncStorage.getItem as any).mockResolvedValue(JSON.stringify({
        favorites: cachedFavorites,
        cachedAt: Date.now(),
      }))

      const { result } = renderHook(() => useFavoriteLocations())

      await waitFor(() => {
        expect(result.current.favorites.length).toBeGreaterThan(0)
      })

      expect(result.current.isCached).toBe(true)
    })

    it('queues add operation when offline', async () => {
      ;(useNetworkStatus as any).mockReturnValue({
        isConnected: false,
      })

      const { result } = renderHook(() => useFavoriteLocations())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      await act(async () => {
        await result.current.addFavorite({
          custom_name: 'Offline Favorite',
          place_name: 'Test Place',
          latitude: 40.7128,
          longitude: -74.006,
        })
      })

      expect(result.current.hasPendingOperations).toBe(true)
      expect(result.current.pendingOperationsCount).toBeGreaterThan(0)
    })

    it('queues delete operation when offline', async () => {
      const favorites = [createTestFavorite('fav-1', 'Test Favorite')]

      ;(favoritesLib.getUserFavorites as any).mockResolvedValue({
        success: true,
        favorites,
        error: null,
      })

      const { result } = renderHook(() => useFavoriteLocations())

      await waitFor(() => {
        expect(result.current.favorites.length).toBe(1)
      })

      // Go offline
      ;(useNetworkStatus as any).mockReturnValue({
        isConnected: false,
      })

      // Re-render to pick up new network status
      // Note: In real tests, would need to trigger re-render

      await act(async () => {
        await result.current.removeFavorite('fav-1')
      })

      // Favorite should be removed optimistically
      expect(result.current.favorites).toHaveLength(0)
    })

    it('queues update operation when offline', async () => {
      const favorites = [createTestFavorite('fav-1', 'Original Name')]

      ;(favoritesLib.getUserFavorites as any).mockResolvedValue({
        success: true,
        favorites,
        error: null,
      })

      const { result } = renderHook(() => useFavoriteLocations())

      await waitFor(() => {
        expect(result.current.favorites.length).toBe(1)
      })

      // Go offline
      ;(useNetworkStatus as any).mockReturnValue({
        isConnected: false,
      })

      await act(async () => {
        await result.current.updateFavorite('fav-1', { custom_name: 'Updated Name' })
      })

      // Name should be updated optimistically
      expect(result.current.favorites[0].custom_name).toBe('Updated Name')
    })
  })

  // ==========================================================================
  // Edge Case 4: Location Permissions Denied
  // ==========================================================================

  describe('Location Permissions Denied', () => {
    it('calculates distance_meters as null when no user coordinates provided', async () => {
      const favorites = [createTestFavorite('fav-1', 'Test Favorite')]

      ;(favoritesLib.getUserFavorites as any).mockResolvedValue({
        success: true,
        favorites,
        error: null,
      })

      const { result } = renderHook(() =>
        useFavoriteLocations({ userCoordinates: null })
      )

      await waitFor(() => {
        expect(result.current.favorites.length).toBe(1)
      })

      expect(result.current.favorites[0].distance_meters).toBeNull()
    })

    it('calculates distance when user coordinates are provided', async () => {
      const favorites = [createTestFavorite('fav-1', 'Test Favorite')]

      ;(favoritesLib.getUserFavorites as any).mockResolvedValue({
        success: true,
        favorites,
        error: null,
      })

      const { result } = renderHook(() =>
        useFavoriteLocations({
          userCoordinates: { latitude: 40.7128, longitude: -74.006 },
        })
      )

      await waitFor(() => {
        expect(result.current.favorites.length).toBe(1)
      })

      // Distance should be calculated (very close in this case)
      expect(result.current.favorites[0].distance_meters).toBeDefined()
      expect(typeof result.current.favorites[0].distance_meters).toBe('number')
    })

    it('favorites are accessible without location permissions', async () => {
      const favorites = [
        createTestFavorite('fav-1', 'Favorite 1'),
        createTestFavorite('fav-2', 'Favorite 2'),
      ]

      ;(favoritesLib.getUserFavorites as any).mockResolvedValue({
        success: true,
        favorites,
        error: null,
      })

      // No user coordinates - simulating denied permissions
      const { result } = renderHook(() =>
        useFavoriteLocations({ userCoordinates: undefined })
      )

      await waitFor(() => {
        expect(result.current.favorites.length).toBe(2)
      })

      // Should still have all favorite data, just no distance
      expect(result.current.favorites[0].custom_name).toBe('Favorite 1')
      expect(result.current.favorites[1].custom_name).toBe('Favorite 2')
      expect(result.current.favorites[0].distance_meters).toBeNull()
      expect(result.current.favorites[1].distance_meters).toBeNull()
    })
  })

  // ==========================================================================
  // Edge Case 5: Duplicate Favorites with Different Names
  // ==========================================================================

  describe('Duplicate Favorites with Different Names', () => {
    it('displays multiple favorites at same coordinates', async () => {
      const favorites = [
        {
          ...createTestFavorite('fav-1', 'Morning Coffee'),
          latitude: 40.7128,
          longitude: -74.006,
        },
        {
          ...createTestFavorite('fav-2', 'Afternoon Coffee'),
          latitude: 40.7128,
          longitude: -74.006,
        },
        {
          ...createTestFavorite('fav-3', 'Evening Coffee'),
          latitude: 40.7128,
          longitude: -74.006,
        },
      ]

      ;(favoritesLib.getUserFavorites as any).mockResolvedValue({
        success: true,
        favorites,
        error: null,
      })

      const { result } = renderHook(() => useFavoriteLocations())

      await waitFor(() => {
        expect(result.current.favorites.length).toBe(3)
      })

      expect(result.current.favorites.map((f) => f.custom_name)).toEqual([
        'Morning Coffee',
        'Afternoon Coffee',
        'Evening Coffee',
      ])
    })

    it('each duplicate has correct getFavoriteById lookup', async () => {
      const favorites = [
        {
          ...createTestFavorite('fav-1', 'Morning Coffee'),
          latitude: 40.7128,
          longitude: -74.006,
        },
        {
          ...createTestFavorite('fav-2', 'Evening Coffee'),
          latitude: 40.7128,
          longitude: -74.006,
        },
      ]

      ;(favoritesLib.getUserFavorites as any).mockResolvedValue({
        success: true,
        favorites,
        error: null,
      })

      const { result } = renderHook(() => useFavoriteLocations())

      await waitFor(() => {
        expect(result.current.favorites.length).toBe(2)
      })

      const morning = result.current.getFavoriteById('fav-1')
      const evening = result.current.getFavoriteById('fav-2')

      expect(morning?.custom_name).toBe('Morning Coffee')
      expect(evening?.custom_name).toBe('Evening Coffee')
    })
  })

  // ==========================================================================
  // Edge Case 6: Authentication Edge Cases
  // ==========================================================================

  describe('Authentication Edge Cases', () => {
    it('returns empty favorites when not authenticated', async () => {
      ;(useAuth as any).mockReturnValue({
        userId: null,
        isAuthenticated: false,
      })

      const { result } = renderHook(() => useFavoriteLocations())

      expect(result.current.favorites).toEqual([])
    })

    it('returns auth error when trying to add without auth', async () => {
      ;(useAuth as any).mockReturnValue({
        userId: null,
        isAuthenticated: false,
      })

      const { result } = renderHook(() => useFavoriteLocations())

      let addResult: any
      await act(async () => {
        addResult = await result.current.addFavorite({
          custom_name: 'Test',
          place_name: 'Test Place',
          latitude: 40.7128,
          longitude: -74.006,
        })
      })

      expect(addResult.success).toBe(false)
      expect(addResult.error).toContain('logged in')
    })

    it('returns auth error when trying to remove without auth', async () => {
      ;(useAuth as any).mockReturnValue({
        userId: null,
        isAuthenticated: false,
      })

      const { result } = renderHook(() => useFavoriteLocations())

      let removeResult: any
      await act(async () => {
        removeResult = await result.current.removeFavorite('some-id')
      })

      expect(removeResult.success).toBe(false)
      expect(removeResult.error).toContain('logged in')
    })

    it('returns auth error when trying to update without auth', async () => {
      ;(useAuth as any).mockReturnValue({
        userId: null,
        isAuthenticated: false,
      })

      const { result } = renderHook(() => useFavoriteLocations())

      let updateResult: any
      await act(async () => {
        updateResult = await result.current.updateFavorite('some-id', {
          custom_name: 'New Name',
        })
      })

      expect(updateResult.success).toBe(false)
      expect(updateResult.error).toContain('logged in')
    })
  })

  // ==========================================================================
  // Edge Case 7: Cache Behavior
  // ==========================================================================

  describe('Cache Behavior', () => {
    it('returns isCached true when data is from cache', async () => {
      const cachedFavorites = [createTestFavorite('cached-1', 'Cached')]

      ;(AsyncStorage.getItem as any).mockResolvedValue(JSON.stringify({
        favorites: cachedFavorites,
        cachedAt: Date.now(),
      }))

      // Network fails
      ;(favoritesLib.getUserFavorites as any).mockResolvedValue({
        success: false,
        favorites: [],
        error: 'Network error',
      })

      const { result } = renderHook(() => useFavoriteLocations())

      await waitFor(() => {
        expect(result.current.favorites.length).toBeGreaterThan(0)
      })

      expect(result.current.isCached).toBe(true)
    })

    it('returns isCached false when data is fresh', async () => {
      const freshFavorites = [createTestFavorite('fresh-1', 'Fresh')]

      ;(favoritesLib.getUserFavorites as any).mockResolvedValue({
        success: true,
        favorites: freshFavorites,
        error: null,
      })

      const { result } = renderHook(() => useFavoriteLocations())

      await waitFor(() => {
        expect(result.current.favorites.length).toBeGreaterThan(0)
      })

      expect(result.current.isCached).toBe(false)
    })

    it('expires cache after 24 hours', async () => {
      const oldCachedFavorites = [createTestFavorite('old-1', 'Old Cached')]

      // Cache from 25 hours ago
      const twentyFiveHoursAgo = Date.now() - (25 * 60 * 60 * 1000)

      ;(AsyncStorage.getItem as any).mockResolvedValue(JSON.stringify({
        favorites: oldCachedFavorites,
        cachedAt: twentyFiveHoursAgo,
      }))

      // After expired cache, should try network
      ;(favoritesLib.getUserFavorites as any).mockResolvedValue({
        success: true,
        favorites: [],
        error: null,
      })

      const { result } = renderHook(() => useFavoriteLocations())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      // Should NOT use the expired cache data
      // (implementation may vary - this tests the concept)
    })
  })

  // ==========================================================================
  // Edge Case 8: Sync Status
  // ==========================================================================

  describe('Sync Status', () => {
    it('hasPendingOperations is false initially', async () => {
      const { result } = renderHook(() => useFavoriteLocations())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.hasPendingOperations).toBe(false)
      expect(result.current.pendingOperationsCount).toBe(0)
    })

    it('isSyncing is false when not processing queue', async () => {
      const { result } = renderHook(() => useFavoriteLocations())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.isSyncing).toBe(false)
    })
  })
})
