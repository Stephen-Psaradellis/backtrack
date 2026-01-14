/**
 * Tests for hooks/useFavoriteLocations.ts
 *
 * Tests favorite locations management hook with offline support.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'

// Mock AsyncStorage
const mockAsyncStorage: Record<string, string> = {}
const mockAsyncStorageGetItem = vi.fn((key: string) => Promise.resolve(mockAsyncStorage[key] || null))
const mockAsyncStorageSetItem = vi.fn((key: string, value: string) => {
  mockAsyncStorage[key] = value
  return Promise.resolve()
})
const mockAsyncStorageRemoveItem = vi.fn((key: string) => {
  delete mockAsyncStorage[key]
  return Promise.resolve()
})

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: (...args: unknown[]) => mockAsyncStorageGetItem(...(args as [string])),
    setItem: (...args: unknown[]) => mockAsyncStorageSetItem(...(args as [string, string])),
    removeItem: (...args: unknown[]) => mockAsyncStorageRemoveItem(...(args as [string])),
  },
}))

// Mock supabase
vi.mock('../../lib/supabase', () => ({
  supabase: {},
}))

// Mock useAuth
const mockUseAuth = vi.fn()
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}))

// Mock useNetworkStatus
const mockUseNetworkStatus = vi.fn()
vi.mock('../useNetworkStatus', () => ({
  useNetworkStatus: () => mockUseNetworkStatus(),
}))

// Mock favorites lib
const mockAddFavoriteApi = vi.fn()
const mockRemoveFavoriteApi = vi.fn()
const mockUpdateFavoriteApi = vi.fn()
const mockGetUserFavorites = vi.fn()

vi.mock('../../lib/favorites', () => ({
  addFavorite: (...args: unknown[]) => mockAddFavoriteApi(...args),
  removeFavorite: (...args: unknown[]) => mockRemoveFavoriteApi(...args),
  updateFavorite: (...args: unknown[]) => mockUpdateFavoriteApi(...args),
  getUserFavorites: (...args: unknown[]) => mockGetUserFavorites(...args),
  getFavoriteById: vi.fn(),
  FAVORITES_ERRORS: {
    FETCH_FAILED: 'Failed to fetch favorites',
    ADD_FAILED: 'Failed to add favorite',
    REMOVE_FAILED: 'Failed to remove favorite',
    UPDATE_FAILED: 'Failed to update favorite',
    NOT_FOUND: 'Favorite not found',
    MAX_FAVORITES_REACHED: 'Maximum favorites reached',
  },
  MAX_FAVORITES_PER_USER: 10,
}))

import { useFavoriteLocations } from '../useFavoriteLocations'

describe('useFavoriteLocations', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Clear mock storage
    Object.keys(mockAsyncStorage).forEach((key) => delete mockAsyncStorage[key])

    // Default: authenticated user
    mockUseAuth.mockReturnValue({
      userId: 'user-123',
      isAuthenticated: true,
    })

    // Default: online
    mockUseNetworkStatus.mockReturnValue({
      isConnected: true,
    })

    // Default: empty favorites
    mockGetUserFavorites.mockResolvedValue({
      success: true,
      favorites: [],
      error: null,
    })
  })

  describe('initial state', () => {
    it('should start with empty favorites', async () => {
      const { result } = renderHook(() => useFavoriteLocations())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.favorites).toEqual([])
    })

    it('should fetch favorites on mount', async () => {
      renderHook(() => useFavoriteLocations())

      await waitFor(() => {
        expect(mockGetUserFavorites).toHaveBeenCalledWith('user-123')
      })
    })

    it('should not fetch when disabled', async () => {
      renderHook(() => useFavoriteLocations({ enabled: false }))

      await new Promise((r) => setTimeout(r, 50))

      expect(mockGetUserFavorites).not.toHaveBeenCalled()
    })

    it('should not fetch when not authenticated', async () => {
      mockUseAuth.mockReturnValue({
        userId: null,
        isAuthenticated: false,
      })

      const { result } = renderHook(() => useFavoriteLocations())

      // When not authenticated, favorites should be empty
      expect(result.current.favorites).toEqual([])
      expect(mockGetUserFavorites).not.toHaveBeenCalled()
    })
  })

  describe('fetching favorites', () => {
    it('should set favorites from response', async () => {
      const mockFavorites = [
        {
          id: 'fav-1',
          user_id: 'user-123',
          custom_name: 'Home',
          place_name: 'My House',
          latitude: 40.7128,
          longitude: -74.006,
          address: '123 Main St',
          place_id: 'place-123',
          created_at: '2024-01-01T12:00:00Z',
          updated_at: '2024-01-01T12:00:00Z',
        },
      ]

      mockGetUserFavorites.mockResolvedValue({
        success: true,
        favorites: mockFavorites,
        error: null,
      })

      const { result } = renderHook(() => useFavoriteLocations())

      await waitFor(() => {
        expect(result.current.favorites).toHaveLength(1)
      })

      expect(result.current.favorites[0].custom_name).toBe('Home')
      expect(result.current.count).toBe(1)
    })

    it('should calculate distance when userCoordinates provided', async () => {
      const mockFavorites = [
        {
          id: 'fav-1',
          user_id: 'user-123',
          custom_name: 'Home',
          place_name: 'My House',
          latitude: 40.7128,
          longitude: -74.006,
          address: '123 Main St',
          place_id: 'place-123',
          created_at: '2024-01-01T12:00:00Z',
          updated_at: '2024-01-01T12:00:00Z',
        },
      ]

      mockGetUserFavorites.mockResolvedValue({
        success: true,
        favorites: mockFavorites,
        error: null,
      })

      const { result } = renderHook(() =>
        useFavoriteLocations({
          userCoordinates: { latitude: 40.7, longitude: -74.0 },
        })
      )

      await waitFor(() => {
        expect(result.current.favorites).toHaveLength(1)
      })

      expect(result.current.favorites[0].distance_meters).toBeGreaterThan(0)
    })

    it('should set distance_meters to null when no userCoordinates', async () => {
      const mockFavorites = [
        {
          id: 'fav-1',
          user_id: 'user-123',
          custom_name: 'Home',
          place_name: 'My House',
          latitude: 40.7128,
          longitude: -74.006,
          address: null,
          place_id: null,
          created_at: '2024-01-01T12:00:00Z',
          updated_at: '2024-01-01T12:00:00Z',
        },
      ]

      mockGetUserFavorites.mockResolvedValue({
        success: true,
        favorites: mockFavorites,
        error: null,
      })

      const { result } = renderHook(() => useFavoriteLocations())

      await waitFor(() => {
        expect(result.current.favorites).toHaveLength(1)
      })

      expect(result.current.favorites[0].distance_meters).toBeNull()
    })

    it('should set error when fetch fails', async () => {
      mockGetUserFavorites.mockResolvedValue({
        success: false,
        favorites: [],
        error: 'Database error',
      })

      const { result } = renderHook(() => useFavoriteLocations())

      await waitFor(() => {
        expect(result.current.error?.code).toBe('FETCH_ERROR')
      })
    })
  })

  describe('addFavorite', () => {
    it('should add a favorite successfully', async () => {
      const newFavorite = {
        id: 'fav-new',
        user_id: 'user-123',
        custom_name: 'New Place',
        place_name: 'Coffee Shop',
        latitude: 40.75,
        longitude: -74.01,
        address: '456 Oak St',
        place_id: 'place-456',
        created_at: '2024-01-02T12:00:00Z',
        updated_at: '2024-01-02T12:00:00Z',
      }

      mockAddFavoriteApi.mockResolvedValue({
        success: true,
        favorite: newFavorite,
        error: null,
      })

      const { result } = renderHook(() => useFavoriteLocations())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      let addResult: { success: boolean; favorite?: unknown; error?: string | null } | undefined
      await act(async () => {
        addResult = await result.current.addFavorite({
          custom_name: 'New Place',
          place_name: 'Coffee Shop',
          latitude: 40.75,
          longitude: -74.01,
        })
      })

      expect(addResult!.success).toBe(true)
      expect(addResult!.favorite).toEqual(newFavorite)
      expect(result.current.favorites).toContainEqual(expect.objectContaining({ id: 'fav-new' }))
    })

    it('should fail when not authenticated', async () => {
      mockUseAuth.mockReturnValue({
        userId: null,
        isAuthenticated: false,
      })

      const { result } = renderHook(() => useFavoriteLocations())

      let addResult: { success: boolean; error?: string | null } | undefined
      await act(async () => {
        addResult = await result.current.addFavorite({
          custom_name: 'Test',
          place_name: 'Test',
          latitude: 0,
          longitude: 0,
        })
      })

      expect(addResult!.success).toBe(false)
      expect(addResult!.error).toContain('logged in')
    })

    it('should fail when at limit', async () => {
      // Create 10 favorites to reach limit
      const mockFavorites = Array.from({ length: 10 }, (_, i) => ({
        id: `fav-${i}`,
        user_id: 'user-123',
        custom_name: `Favorite ${i}`,
        place_name: `Place ${i}`,
        latitude: 40 + i * 0.01,
        longitude: -74 - i * 0.01,
        address: null,
        place_id: null,
        created_at: '2024-01-01T12:00:00Z',
        updated_at: '2024-01-01T12:00:00Z',
      }))

      mockGetUserFavorites.mockResolvedValue({
        success: true,
        favorites: mockFavorites,
        error: null,
      })

      const { result } = renderHook(() => useFavoriteLocations())

      await waitFor(() => {
        expect(result.current.isAtLimit).toBe(true)
      })

      let addResult: { success: boolean; error?: string | null } | undefined
      await act(async () => {
        addResult = await result.current.addFavorite({
          custom_name: 'Test',
          place_name: 'Test',
          latitude: 0,
          longitude: 0,
        })
      })

      expect(addResult!.success).toBe(false)
      expect(addResult!.error).toContain('Maximum')
    })

    it('should handle add API error', async () => {
      mockAddFavoriteApi.mockResolvedValue({
        success: false,
        favorite: null,
        error: 'Failed to add',
      })

      const { result } = renderHook(() => useFavoriteLocations())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      let addResult: { success: boolean } | undefined
      await act(async () => {
        addResult = await result.current.addFavorite({
          custom_name: 'Test',
          place_name: 'Test',
          latitude: 0,
          longitude: 0,
        })
      })

      expect(addResult!.success).toBe(false)
      expect(result.current.error?.code).toBe('ADD_ERROR')
    })
  })

  describe('removeFavorite', () => {
    it('should remove a favorite successfully', async () => {
      const mockFavorites = [
        {
          id: 'fav-1',
          user_id: 'user-123',
          custom_name: 'Home',
          place_name: 'My House',
          latitude: 40.7128,
          longitude: -74.006,
          address: null,
          place_id: null,
          created_at: '2024-01-01T12:00:00Z',
          updated_at: '2024-01-01T12:00:00Z',
        },
      ]

      mockGetUserFavorites.mockResolvedValue({
        success: true,
        favorites: mockFavorites,
        error: null,
      })

      mockRemoveFavoriteApi.mockResolvedValue({
        success: true,
        error: null,
      })

      const { result } = renderHook(() => useFavoriteLocations())

      await waitFor(() => {
        expect(result.current.favorites).toHaveLength(1)
      })

      let removeResult: { success: boolean; error?: string | null } | undefined
      await act(async () => {
        removeResult = await result.current.removeFavorite('fav-1')
      })

      expect(removeResult!.success).toBe(true)
      expect(result.current.favorites).toHaveLength(0)
    })

    it('should fail when favorite not found', async () => {
      const { result } = renderHook(() => useFavoriteLocations())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      let removeResult: { success: boolean; error?: string | null } | undefined
      await act(async () => {
        removeResult = await result.current.removeFavorite('non-existent')
      })

      expect(removeResult!.success).toBe(false)
      expect(removeResult!.error).toContain('not found')
    })

    it('should rollback on API error', async () => {
      const mockFavorites = [
        {
          id: 'fav-1',
          user_id: 'user-123',
          custom_name: 'Home',
          place_name: 'My House',
          latitude: 40.7128,
          longitude: -74.006,
          address: null,
          place_id: null,
          created_at: '2024-01-01T12:00:00Z',
          updated_at: '2024-01-01T12:00:00Z',
        },
      ]

      mockGetUserFavorites.mockResolvedValue({
        success: true,
        favorites: mockFavorites,
        error: null,
      })

      mockRemoveFavoriteApi.mockResolvedValue({
        success: false,
        error: 'Failed to remove',
      })

      const { result } = renderHook(() => useFavoriteLocations())

      await waitFor(() => {
        expect(result.current.favorites).toHaveLength(1)
      })

      await act(async () => {
        await result.current.removeFavorite('fav-1')
      })

      // Should rollback - favorite should still be there
      expect(result.current.favorites).toHaveLength(1)
      expect(result.current.error?.code).toBe('REMOVE_ERROR')
    })
  })

  describe('updateFavorite', () => {
    it('should update a favorite successfully', async () => {
      const mockFavorites = [
        {
          id: 'fav-1',
          user_id: 'user-123',
          custom_name: 'Home',
          place_name: 'My House',
          latitude: 40.7128,
          longitude: -74.006,
          address: null,
          place_id: null,
          created_at: '2024-01-01T12:00:00Z',
          updated_at: '2024-01-01T12:00:00Z',
        },
      ]

      const updatedFavorite = {
        ...mockFavorites[0],
        custom_name: 'Updated Home',
        updated_at: '2024-01-02T12:00:00Z',
      }

      mockGetUserFavorites.mockResolvedValue({
        success: true,
        favorites: mockFavorites,
        error: null,
      })

      mockUpdateFavoriteApi.mockResolvedValue({
        success: true,
        favorite: updatedFavorite,
        error: null,
      })

      const { result } = renderHook(() => useFavoriteLocations())

      await waitFor(() => {
        expect(result.current.favorites).toHaveLength(1)
      })

      let updateResult: { success: boolean } | undefined
      await act(async () => {
        updateResult = await result.current.updateFavorite('fav-1', { custom_name: 'Updated Home' })
      })

      expect(updateResult!.success).toBe(true)
      expect(result.current.favorites[0].custom_name).toBe('Updated Home')
    })

    it('should fail when favorite not found', async () => {
      const { result } = renderHook(() => useFavoriteLocations())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      let updateResult: { success: boolean; error: string | null } | undefined
      await act(async () => {
        updateResult = await result.current.updateFavorite('non-existent', { custom_name: 'Test' })
      })

      expect(updateResult!.success).toBe(false)
      expect(updateResult!.error).toContain('not found')
    })

    it('should rollback on API error', async () => {
      const mockFavorites = [
        {
          id: 'fav-1',
          user_id: 'user-123',
          custom_name: 'Home',
          place_name: 'My House',
          latitude: 40.7128,
          longitude: -74.006,
          address: null,
          place_id: null,
          created_at: '2024-01-01T12:00:00Z',
          updated_at: '2024-01-01T12:00:00Z',
        },
      ]

      mockGetUserFavorites.mockResolvedValue({
        success: true,
        favorites: mockFavorites,
        error: null,
      })

      mockUpdateFavoriteApi.mockResolvedValue({
        success: false,
        favorite: null,
        error: 'Failed to update',
      })

      const { result } = renderHook(() => useFavoriteLocations())

      await waitFor(() => {
        expect(result.current.favorites).toHaveLength(1)
      })

      await act(async () => {
        await result.current.updateFavorite('fav-1', { custom_name: 'New Name' })
      })

      // Should rollback
      expect(result.current.favorites[0].custom_name).toBe('Home')
      expect(result.current.error?.code).toBe('UPDATE_ERROR')
    })
  })

  describe('getFavoriteById', () => {
    it('should return favorite by id', async () => {
      const mockFavorites = [
        {
          id: 'fav-1',
          user_id: 'user-123',
          custom_name: 'Home',
          place_name: 'My House',
          latitude: 40.7128,
          longitude: -74.006,
          address: null,
          place_id: null,
          created_at: '2024-01-01T12:00:00Z',
          updated_at: '2024-01-01T12:00:00Z',
        },
      ]

      mockGetUserFavorites.mockResolvedValue({
        success: true,
        favorites: mockFavorites,
        error: null,
      })

      const { result } = renderHook(() => useFavoriteLocations())

      await waitFor(() => {
        expect(result.current.favorites).toHaveLength(1)
      })

      const favorite = result.current.getFavoriteById('fav-1')
      expect(favorite?.custom_name).toBe('Home')
    })

    it('should return undefined for non-existent id', async () => {
      const { result } = renderHook(() => useFavoriteLocations())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      const favorite = result.current.getFavoriteById('non-existent')
      expect(favorite).toBeUndefined()
    })
  })

  describe('offline mode', () => {
    it('should queue add operation when offline', async () => {
      mockUseNetworkStatus.mockReturnValue({
        isConnected: false,
      })

      const { result } = renderHook(() => useFavoriteLocations())

      await waitFor(() => {
        expect(result.current.isOffline).toBe(true)
      })

      let addResult: { success: boolean } | undefined
      await act(async () => {
        addResult = await result.current.addFavorite({
          custom_name: 'Offline Place',
          place_name: 'Test Place',
          latitude: 40.75,
          longitude: -74.01,
        })
      })

      expect(addResult!.success).toBe(true)
      // Offline add creates optimistic entry and queues operation
      expect(result.current.favorites).toHaveLength(1)
    })

    it('should show isOffline correctly', async () => {
      mockUseNetworkStatus.mockReturnValue({
        isConnected: false,
      })

      const { result } = renderHook(() => useFavoriteLocations())

      expect(result.current.isOffline).toBe(true)
    })

    it('should show isCached when data is from cache', async () => {
      mockUseNetworkStatus.mockReturnValue({
        isConnected: false,
      })

      // Put some cached data
      const cachedData = {
        favorites: [
          {
            id: 'cached-1',
            user_id: 'user-123',
            custom_name: 'Cached',
            place_name: 'Cached Place',
            latitude: 40.7,
            longitude: -74.0,
            address: null,
            place_id: null,
            created_at: '2024-01-01T12:00:00Z',
            updated_at: '2024-01-01T12:00:00Z',
          },
        ],
        cachedAt: Date.now(),
      }
      mockAsyncStorage['@backtrack/favorites/user-123'] = JSON.stringify(cachedData)

      const { result } = renderHook(() => useFavoriteLocations())

      await waitFor(() => {
        expect(result.current.favorites).toHaveLength(1)
      })

      expect(result.current.isCached).toBe(true)
    })
  })

  describe('refetch', () => {
    it('should refetch favorites', async () => {
      const { result } = renderHook(() => useFavoriteLocations())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      mockGetUserFavorites.mockClear()
      mockGetUserFavorites.mockResolvedValue({
        success: true,
        favorites: [
          {
            id: 'refreshed',
            user_id: 'user-123',
            custom_name: 'Refreshed',
            place_name: 'Place',
            latitude: 40,
            longitude: -74,
            address: null,
            place_id: null,
            created_at: '2024-01-01T12:00:00Z',
            updated_at: '2024-01-01T12:00:00Z',
          },
        ],
        error: null,
      })

      await act(async () => {
        await result.current.refetch()
      })

      expect(mockGetUserFavorites).toHaveBeenCalled()
      expect(result.current.favorites[0].id).toBe('refreshed')
    })
  })

  describe('computed values', () => {
    it('should calculate maxFavorites correctly', async () => {
      const { result } = renderHook(() => useFavoriteLocations())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.maxFavorites).toBe(10)
    })

    it('should calculate isAtLimit correctly', async () => {
      const mockFavorites = Array.from({ length: 10 }, (_, i) => ({
        id: `fav-${i}`,
        user_id: 'user-123',
        custom_name: `Favorite ${i}`,
        place_name: `Place ${i}`,
        latitude: 40 + i * 0.01,
        longitude: -74 - i * 0.01,
        address: null,
        place_id: null,
        created_at: '2024-01-01T12:00:00Z',
        updated_at: '2024-01-01T12:00:00Z',
      }))

      mockGetUserFavorites.mockResolvedValue({
        success: true,
        favorites: mockFavorites,
        error: null,
      })

      const { result } = renderHook(() => useFavoriteLocations())

      await waitFor(() => {
        expect(result.current.isAtLimit).toBe(true)
      })
    })

    it('should calculate count correctly', async () => {
      const mockFavorites = [
        {
          id: 'fav-1',
          user_id: 'user-123',
          custom_name: 'Home',
          place_name: 'My House',
          latitude: 40.7128,
          longitude: -74.006,
          address: null,
          place_id: null,
          created_at: '2024-01-01T12:00:00Z',
          updated_at: '2024-01-01T12:00:00Z',
        },
        {
          id: 'fav-2',
          user_id: 'user-123',
          custom_name: 'Work',
          place_name: 'Office',
          latitude: 40.75,
          longitude: -74.01,
          address: null,
          place_id: null,
          created_at: '2024-01-01T12:00:00Z',
          updated_at: '2024-01-01T12:00:00Z',
        },
      ]

      mockGetUserFavorites.mockResolvedValue({
        success: true,
        favorites: mockFavorites,
        error: null,
      })

      const { result } = renderHook(() => useFavoriteLocations())

      await waitFor(() => {
        expect(result.current.count).toBe(2)
      })
    })
  })

  describe('isMutating state', () => {
    it('should set isMutating during add operation', async () => {
      let resolveAdd: (value: unknown) => void
      mockAddFavoriteApi.mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveAdd = resolve
          })
      )

      const { result } = renderHook(() => useFavoriteLocations())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      act(() => {
        result.current.addFavorite({
          custom_name: 'Test',
          place_name: 'Test',
          latitude: 0,
          longitude: 0,
        })
      })

      expect(result.current.isMutating).toBe(true)

      await act(async () => {
        resolveAdd!({ success: true, favorite: { id: 'new' }, error: null })
      })

      expect(result.current.isMutating).toBe(false)
    })
  })

  describe('lastFetchedAt', () => {
    it('should update lastFetchedAt after successful fetch', async () => {
      const { result } = renderHook(() => useFavoriteLocations())

      await waitFor(() => {
        expect(result.current.lastFetchedAt).not.toBeNull()
      })
    })

    it('should be null initially', () => {
      mockGetUserFavorites.mockImplementation(
        () =>
          new Promise(() => {
            // Never resolves
          })
      )

      const { result } = renderHook(() => useFavoriteLocations())

      expect(result.current.lastFetchedAt).toBeNull()
    })
  })

  describe('offline removeFavorite', () => {
    it('should queue remove operation when offline', async () => {
      // Start offline
      mockUseNetworkStatus.mockReturnValue({
        isConnected: false,
      })

      // Put cached favorites first
      const cachedData = {
        favorites: [
          {
            id: 'fav-1',
            user_id: 'user-123',
            custom_name: 'Home',
            place_name: 'My House',
            latitude: 40.7128,
            longitude: -74.006,
            address: null,
            place_id: null,
            created_at: '2024-01-01T12:00:00Z',
            updated_at: '2024-01-01T12:00:00Z',
          },
        ],
        cachedAt: Date.now(),
      }
      mockAsyncStorage['@backtrack/favorites/user-123'] = JSON.stringify(cachedData)

      const { result } = renderHook(() => useFavoriteLocations())

      await waitFor(() => {
        expect(result.current.favorites).toHaveLength(1)
      })

      let removeResult: { success: boolean } | undefined
      await act(async () => {
        removeResult = await result.current.removeFavorite('fav-1')
      })

      expect(removeResult!.success).toBe(true)
      expect(result.current.favorites).toHaveLength(0)
      expect(result.current.hasPendingOperations).toBe(true)
    })

    it('should fail when not authenticated', async () => {
      mockUseAuth.mockReturnValue({
        userId: null,
        isAuthenticated: false,
      })

      const { result } = renderHook(() => useFavoriteLocations())

      let removeResult: { success: boolean; error: string | null } | undefined
      await act(async () => {
        removeResult = await result.current.removeFavorite('fav-1')
      })

      expect(removeResult!.success).toBe(false)
      expect(removeResult!.error).toContain('logged in')
    })
  })

  describe('offline updateFavorite', () => {
    it('should queue update operation when offline', async () => {
      // Start offline
      mockUseNetworkStatus.mockReturnValue({
        isConnected: false,
      })

      // Put cached favorites first
      const cachedData = {
        favorites: [
          {
            id: 'fav-1',
            user_id: 'user-123',
            custom_name: 'Home',
            place_name: 'My House',
            latitude: 40.7128,
            longitude: -74.006,
            address: null,
            place_id: null,
            created_at: '2024-01-01T12:00:00Z',
            updated_at: '2024-01-01T12:00:00Z',
          },
        ],
        cachedAt: Date.now(),
      }
      mockAsyncStorage['@backtrack/favorites/user-123'] = JSON.stringify(cachedData)

      const { result } = renderHook(() => useFavoriteLocations())

      await waitFor(() => {
        expect(result.current.favorites).toHaveLength(1)
      })

      let updateResult: { success: boolean } | undefined
      await act(async () => {
        updateResult = await result.current.updateFavorite('fav-1', { custom_name: 'Updated Home' })
      })

      expect(updateResult!.success).toBe(true)
      expect(result.current.favorites[0].custom_name).toBe('Updated Home')
      expect(result.current.pendingOperationsCount).toBeGreaterThan(0)
    })

    it('should fail when not authenticated', async () => {
      mockUseAuth.mockReturnValue({
        userId: null,
        isAuthenticated: false,
      })

      const { result } = renderHook(() => useFavoriteLocations())

      let updateResult: { success: boolean; error: string | null } | undefined
      await act(async () => {
        updateResult = await result.current.updateFavorite('fav-1', { custom_name: 'Test' })
      })

      expect(updateResult!.success).toBe(false)
      expect(updateResult!.error).toContain('logged in')
    })
  })

  describe('cache expiry', () => {
    it('should not use expired cache', async () => {
      mockUseNetworkStatus.mockReturnValue({
        isConnected: false,
      })

      // Put expired cached data (more than 24 hours old)
      const expiredCacheData = {
        favorites: [
          {
            id: 'expired-1',
            user_id: 'user-123',
            custom_name: 'Expired',
            place_name: 'Expired Place',
            latitude: 40.7,
            longitude: -74.0,
            address: null,
            place_id: null,
            created_at: '2024-01-01T12:00:00Z',
            updated_at: '2024-01-01T12:00:00Z',
          },
        ],
        cachedAt: Date.now() - 25 * 60 * 60 * 1000, // 25 hours ago
      }
      mockAsyncStorage['@backtrack/favorites/user-123'] = JSON.stringify(expiredCacheData)

      const { result } = renderHook(() => useFavoriteLocations())

      await waitFor(() => {
        // Should have error because cache is expired and we're offline
        expect(result.current.error?.code).toBe('FETCH_ERROR')
      })
    })
  })

  describe('add exception handling', () => {
    it('should handle exception during add', async () => {
      mockAddFavoriteApi.mockRejectedValue(new Error('Network error'))

      const { result } = renderHook(() => useFavoriteLocations())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      let addResult: { success: boolean; error: string | null } | undefined
      await act(async () => {
        addResult = await result.current.addFavorite({
          custom_name: 'Test',
          place_name: 'Test',
          latitude: 0,
          longitude: 0,
        })
      })

      expect(addResult!.success).toBe(false)
      expect(addResult!.error).toBe('Network error')
    })
  })

  describe('remove exception handling', () => {
    it('should handle exception during remove and rollback', async () => {
      const mockFavorites = [
        {
          id: 'fav-1',
          user_id: 'user-123',
          custom_name: 'Home',
          place_name: 'My House',
          latitude: 40.7128,
          longitude: -74.006,
          address: null,
          place_id: null,
          created_at: '2024-01-01T12:00:00Z',
          updated_at: '2024-01-01T12:00:00Z',
        },
      ]

      mockGetUserFavorites.mockResolvedValue({
        success: true,
        favorites: mockFavorites,
        error: null,
      })

      mockRemoveFavoriteApi.mockRejectedValue(new Error('Network error'))

      const { result } = renderHook(() => useFavoriteLocations())

      await waitFor(() => {
        expect(result.current.favorites).toHaveLength(1)
      })

      await act(async () => {
        await result.current.removeFavorite('fav-1')
      })

      // Should rollback
      expect(result.current.favorites).toHaveLength(1)
      expect(result.current.error?.code).toBe('REMOVE_ERROR')
    })
  })

  describe('update exception handling', () => {
    it('should handle exception during update and rollback', async () => {
      const mockFavorites = [
        {
          id: 'fav-1',
          user_id: 'user-123',
          custom_name: 'Home',
          place_name: 'My House',
          latitude: 40.7128,
          longitude: -74.006,
          address: null,
          place_id: null,
          created_at: '2024-01-01T12:00:00Z',
          updated_at: '2024-01-01T12:00:00Z',
        },
      ]

      mockGetUserFavorites.mockResolvedValue({
        success: true,
        favorites: mockFavorites,
        error: null,
      })

      mockUpdateFavoriteApi.mockRejectedValue(new Error('Network error'))

      const { result } = renderHook(() => useFavoriteLocations())

      await waitFor(() => {
        expect(result.current.favorites).toHaveLength(1)
      })

      await act(async () => {
        await result.current.updateFavorite('fav-1', { custom_name: 'New Name' })
      })

      // Should rollback
      expect(result.current.favorites[0].custom_name).toBe('Home')
      expect(result.current.error?.code).toBe('UPDATE_ERROR')
    })
  })

  describe('fetch exception handling', () => {
    it('should handle exception during fetch', async () => {
      mockGetUserFavorites.mockRejectedValue(new Error('Database error'))

      const { result } = renderHook(() => useFavoriteLocations())

      await waitFor(() => {
        expect(result.current.error?.code).toBe('FETCH_ERROR')
      })

      expect(result.current.error?.message).toBe('Database error')
    })
  })

  describe('pendingOperationsCount', () => {
    it('should track pending operations count', async () => {
      mockUseNetworkStatus.mockReturnValue({
        isConnected: false,
      })

      const { result } = renderHook(() => useFavoriteLocations())

      await waitFor(() => {
        expect(result.current.isOffline).toBe(true)
      })

      // Initial count should be 0
      expect(result.current.pendingOperationsCount).toBe(0)
      expect(result.current.hasPendingOperations).toBe(false)

      // Add a favorite offline
      await act(async () => {
        await result.current.addFavorite({
          custom_name: 'Test',
          place_name: 'Test',
          latitude: 0,
          longitude: 0,
        })
      })

      expect(result.current.pendingOperationsCount).toBe(1)
      expect(result.current.hasPendingOperations).toBe(true)
    })
  })

  describe('isSyncing', () => {
    it('should initially be false', async () => {
      const { result } = renderHook(() => useFavoriteLocations())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.isSyncing).toBe(false)
    })
  })

  describe('cache fallback on fetch error', () => {
    it('should use cache when fetch fails', async () => {
      // Set up cache first
      const cachedData = {
        favorites: [
          {
            id: 'cached-1',
            user_id: 'user-123',
            custom_name: 'Cached Favorite',
            place_name: 'Cached Place',
            latitude: 40.7,
            longitude: -74.0,
            address: null,
            place_id: null,
            created_at: '2024-01-01T12:00:00Z',
            updated_at: '2024-01-01T12:00:00Z',
          },
        ],
        cachedAt: Date.now(),
      }
      mockAsyncStorage['@backtrack/favorites/user-123'] = JSON.stringify(cachedData)

      // Make API fail
      mockGetUserFavorites.mockResolvedValue({
        success: false,
        favorites: [],
        error: 'API error',
      })

      const { result } = renderHook(() => useFavoriteLocations())

      await waitFor(() => {
        expect(result.current.favorites).toHaveLength(1)
      })

      // Should have loaded from cache as fallback
      expect(result.current.favorites[0].custom_name).toBe('Cached Favorite')
      expect(result.current.isCached).toBe(true)
    })
  })
})
