/**
 * Tests for lib/avatar/avatarLoader.ts
 *
 * Tests the avatar preloading and caching system.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import {
  avatarLoader,
  useAvatarLoadingState,
  usePreloadingStatus,
  usePreloadAvatar,
  type AvatarLoadingStatus,
  type AvatarLoadingState,
  type CacheStats,
} from '../avatarLoader'

// Mock react-native Image
vi.mock('react-native', () => ({
  Image: {
    prefetch: vi.fn().mockResolvedValue(true),
  },
}))

// Mock dependencies
vi.mock('../defaults', () => ({
  LOCAL_AVATAR_PRESETS: [
    { id: 'avatar_asian_m', name: 'Asian Male', gender: 'M', isLocal: true },
    { id: 'avatar_asian_f', name: 'Asian Female', gender: 'F', isLocal: true },
    { id: 'avatar_black_m', name: 'Black Male', gender: 'M', isLocal: true },
  ],
  AVATAR_CDN: {
    manifestUrl: 'https://example.com/manifest.json',
    baseUrl: 'https://example.com/avatars/',
  },
  getAvatarPreset: vi.fn((id: string) => {
    const presets: Record<string, object> = {
      avatar_asian_m: { id: 'avatar_asian_m', name: 'Asian Male', isLocal: true },
      avatar_asian_f: { id: 'avatar_asian_f', name: 'Asian Female', isLocal: true },
      avatar_black_m: { id: 'avatar_black_m', name: 'Black Male', isLocal: true },
    }
    return presets[id] || null
  }),
  getAvatarUrl: vi.fn((id: string) => `https://example.com/avatars/${id}.glb`),
  getAvatarThumbnailUrl: vi.fn((id: string) => `https://example.com/thumbnails/${id}.jpg`),
  fetchCdnAvatars: vi.fn().mockResolvedValue([
    { id: 'cdn_avatar_1', name: 'CDN Avatar 1', gender: 'M', isLocal: false },
    { id: 'cdn_avatar_2', name: 'CDN Avatar 2', gender: 'F', isLocal: false },
  ]),
}))

describe('avatarLoader', () => {
  beforeEach(() => {
    avatarLoader.clearCache()
    vi.clearAllMocks()
  })

  describe('initializeLocalAvatars', () => {
    it('should initialize loading state for all local avatars', () => {
      avatarLoader.initializeLocalAvatars()

      expect(avatarLoader.getLoadingState('avatar_asian_m')).toBeDefined()
      expect(avatarLoader.getLoadingState('avatar_asian_f')).toBeDefined()
      expect(avatarLoader.getLoadingState('avatar_black_m')).toBeDefined()
    })

    it('should set initial status to idle', () => {
      avatarLoader.initializeLocalAvatars()

      const state = avatarLoader.getLoadingState('avatar_asian_m')
      expect(state?.status).toBe('idle')
      expect(state?.progress).toBe(0)
      expect(state?.isLocal).toBe(true)
    })
  })

  describe('markAvatarLoading', () => {
    it('should mark avatar as loading', () => {
      avatarLoader.markAvatarLoading('avatar_asian_m')

      const state = avatarLoader.getLoadingState('avatar_asian_m')
      expect(state?.status).toBe('loading')
      expect(state?.progress).toBe(0)
      expect(state?.startedAt).toBeDefined()
    })
  })

  describe('markAvatarLoaded', () => {
    it('should mark avatar as loaded', () => {
      avatarLoader.markAvatarLoading('avatar_asian_m')
      avatarLoader.markAvatarLoaded('avatar_asian_m')

      const state = avatarLoader.getLoadingState('avatar_asian_m')
      expect(state?.status).toBe('loaded')
      expect(state?.progress).toBe(100)
      expect(state?.completedAt).toBeDefined()
    })
  })

  describe('updateAvatarProgress', () => {
    it('should update progress for loading avatar', () => {
      avatarLoader.markAvatarLoading('avatar_asian_m')
      avatarLoader.updateAvatarProgress('avatar_asian_m', 50)

      const state = avatarLoader.getLoadingState('avatar_asian_m')
      expect(state?.progress).toBe(50)
    })

    it('should not update progress for non-loading avatar', () => {
      avatarLoader.initializeLocalAvatars()
      avatarLoader.updateAvatarProgress('avatar_asian_m', 50)

      const state = avatarLoader.getLoadingState('avatar_asian_m')
      expect(state?.progress).toBe(0) // Still idle
    })
  })

  describe('markAvatarError', () => {
    it('should mark avatar as errored with message', () => {
      avatarLoader.markAvatarLoading('avatar_asian_m')
      avatarLoader.markAvatarError('avatar_asian_m', 'Failed to load')

      const state = avatarLoader.getLoadingState('avatar_asian_m')
      expect(state?.status).toBe('error')
      expect(state?.error).toBe('Failed to load')
      expect(state?.completedAt).toBeDefined()
    })
  })

  describe('isAvatarLoaded', () => {
    it('should return true for loaded avatar', () => {
      avatarLoader.markAvatarLoading('avatar_asian_m')
      avatarLoader.markAvatarLoaded('avatar_asian_m')

      expect(avatarLoader.isAvatarLoaded('avatar_asian_m')).toBe(true)
    })

    it('should return false for non-loaded avatar', () => {
      avatarLoader.initializeLocalAvatars()

      expect(avatarLoader.isAvatarLoaded('avatar_asian_m')).toBe(false)
    })

    it('should return false for unknown avatar', () => {
      expect(avatarLoader.isAvatarLoaded('unknown_avatar')).toBe(false)
    })
  })

  describe('isAvatarLoading', () => {
    it('should return true for loading avatar', () => {
      avatarLoader.markAvatarLoading('avatar_asian_m')

      expect(avatarLoader.isAvatarLoading('avatar_asian_m')).toBe(true)
    })

    it('should return false for idle avatar', () => {
      avatarLoader.initializeLocalAvatars()

      expect(avatarLoader.isAvatarLoading('avatar_asian_m')).toBe(false)
    })

    it('should return false for loaded avatar', () => {
      avatarLoader.markAvatarLoading('avatar_asian_m')
      avatarLoader.markAvatarLoaded('avatar_asian_m')

      expect(avatarLoader.isAvatarLoading('avatar_asian_m')).toBe(false)
    })
  })

  describe('getCacheStats', () => {
    it('should return correct stats for empty cache', () => {
      const stats = avatarLoader.getCacheStats()

      expect(stats.total).toBe(0)
      expect(stats.loaded).toBe(0)
      expect(stats.loading).toBe(0)
      expect(stats.errored).toBe(0)
    })

    it('should track loaded avatars', () => {
      avatarLoader.markAvatarLoading('avatar_asian_m')
      avatarLoader.markAvatarLoaded('avatar_asian_m')
      avatarLoader.markAvatarLoading('avatar_asian_f')

      const stats = avatarLoader.getCacheStats()

      expect(stats.total).toBe(2)
      expect(stats.loaded).toBe(1)
      expect(stats.loading).toBe(1)
    })

    it('should track errored avatars', () => {
      avatarLoader.markAvatarLoading('avatar_asian_m')
      avatarLoader.markAvatarError('avatar_asian_m', 'Error')

      const stats = avatarLoader.getCacheStats()

      expect(stats.errored).toBe(1)
    })

    it('should track CDN (non-local) avatars', () => {
      // cdn_unknown is not in the preset mock so isLocal will be false
      avatarLoader.markAvatarLoading('cdn_unknown_avatar')
      avatarLoader.markAvatarLoaded('cdn_unknown_avatar')

      const stats = avatarLoader.getCacheStats()

      expect(stats.total).toBe(1)
      expect(stats.loaded).toBe(1)
      expect(stats.cdn).toBe(1)
      expect(stats.local).toBe(0)
    })
  })

  describe('clearCache', () => {
    it('should clear all cached states', () => {
      avatarLoader.initializeLocalAvatars()
      avatarLoader.markAvatarLoading('avatar_asian_m')

      avatarLoader.clearCache()

      const stats = avatarLoader.getCacheStats()
      expect(stats.total).toBe(0)
      expect(avatarLoader.getLoadingState('avatar_asian_m')).toBeUndefined()
    })
  })

  describe('clearErrors', () => {
    it('should clear errored states', () => {
      avatarLoader.markAvatarLoading('avatar_asian_m')
      avatarLoader.markAvatarError('avatar_asian_m', 'Error')

      avatarLoader.clearErrors()

      const state = avatarLoader.getLoadingState('avatar_asian_m')
      expect(state?.status).toBe('idle')
      expect(state?.error).toBeUndefined()
    })

    it('should not affect loaded avatars', () => {
      avatarLoader.markAvatarLoading('avatar_asian_m')
      avatarLoader.markAvatarLoaded('avatar_asian_m')

      avatarLoader.clearErrors()

      expect(avatarLoader.isAvatarLoaded('avatar_asian_m')).toBe(true)
    })
  })

  describe('subscribe', () => {
    it('should notify on state changes', () => {
      const listener = vi.fn()
      const unsubscribe = avatarLoader.subscribe(listener)

      avatarLoader.markAvatarLoading('avatar_asian_m')

      expect(listener).toHaveBeenCalled()
      unsubscribe()
    })

    it('should not notify after unsubscribe', () => {
      const listener = vi.fn()
      const unsubscribe = avatarLoader.subscribe(listener)

      unsubscribe()
      listener.mockClear()

      avatarLoader.markAvatarLoading('avatar_asian_m')

      expect(listener).not.toHaveBeenCalled()
    })
  })

  describe('preloadAvatar', () => {
    it('should resolve immediately for already loaded avatar', async () => {
      avatarLoader.markAvatarLoading('avatar_asian_m')
      avatarLoader.markAvatarLoaded('avatar_asian_m')

      const onLoad = vi.fn()
      const result = await avatarLoader.preloadAvatar('avatar_asian_m', { onLoad })

      expect(result).toBe(true)
      expect(onLoad).toHaveBeenCalledWith('avatar_asian_m')
    })

    it('should add to queue and return promise', async () => {
      // Start preloading
      const promise = avatarLoader.preloadAvatar('avatar_asian_m')

      // Manually complete the loading
      setTimeout(() => {
        avatarLoader.markAvatarLoaded('avatar_asian_m')
      }, 10)

      const result = await promise
      expect(result).toBe(true)
    })

    it('should handle priority option', () => {
      avatarLoader.preloadAvatar('avatar_asian_m', { priority: 5 })
      avatarLoader.preloadAvatar('avatar_asian_f', { priority: 10 })

      // Higher priority should be pending
      const stateF = avatarLoader.getLoadingState('avatar_asian_f')
      expect(stateF?.status).toBe('pending')
    })
  })

  describe('processPreloadQueue', () => {
    it('should process queued avatars', async () => {
      const mockLoadFn = vi.fn().mockResolvedValue(true)

      // Queue some avatars
      avatarLoader.preloadAvatar('avatar_asian_m')
      avatarLoader.preloadAvatar('avatar_asian_f')

      // Process queue
      await avatarLoader.processPreloadQueue(mockLoadFn)

      expect(mockLoadFn).toHaveBeenCalled()
    })

    it('should handle load errors', async () => {
      const mockLoadFn = vi.fn().mockRejectedValue(new Error('Load failed'))

      // Queue an avatar
      avatarLoader.preloadAvatar('avatar_asian_m')

      // Process queue
      await avatarLoader.processPreloadQueue(mockLoadFn)

      const state = avatarLoader.getLoadingState('avatar_asian_m')
      expect(state?.status).toBe('error')
      expect(state?.error).toBe('Load failed')
    })

    it('should handle load function returning false', async () => {
      const mockLoadFn = vi.fn().mockResolvedValue(false)

      // Queue an avatar
      avatarLoader.preloadAvatar('avatar_asian_m')

      // Process queue
      await avatarLoader.processPreloadQueue(mockLoadFn)

      const state = avatarLoader.getLoadingState('avatar_asian_m')
      expect(state?.status).toBe('error')
      expect(state?.error).toBe('Load function returned false')
    })

    it('should skip already loaded avatars', async () => {
      const mockLoadFn = vi.fn().mockResolvedValue(true)

      // Mark as loaded before queuing
      avatarLoader.markAvatarLoading('avatar_asian_m')
      avatarLoader.markAvatarLoaded('avatar_asian_m')

      // Queue the same avatar
      avatarLoader.preloadAvatar('avatar_asian_m')

      // Process queue
      await avatarLoader.processPreloadQueue(mockLoadFn)

      // Load function should not be called for already loaded avatar
      expect(mockLoadFn).not.toHaveBeenCalled()
    })
  })

  describe('preloadLocalAvatars', () => {
    it('should queue all local avatars', async () => {
      // Start preloading in background
      const promise = avatarLoader.preloadLocalAvatars()

      // Complete loading for all
      setTimeout(() => {
        avatarLoader.markAvatarLoaded('avatar_asian_m')
        avatarLoader.markAvatarLoaded('avatar_asian_f')
        avatarLoader.markAvatarLoaded('avatar_black_m')
      }, 10)

      const result = await promise
      expect(result.total).toBe(3)
    })
  })

  describe('preloadThumbnails', () => {
    it('should prefetch thumbnail images', async () => {
      const { Image } = await import('react-native')

      await avatarLoader.preloadThumbnails(['avatar_asian_m', 'avatar_asian_f'])

      expect(Image.prefetch).toHaveBeenCalled()
    })
  })

  describe('preloadAdjacentThumbnails', () => {
    it('should preload adjacent avatar thumbnails', async () => {
      const presets = [
        { id: 'avatar_1', name: 'Avatar 1', gender: 'M' as const, isLocal: true },
        { id: 'avatar_2', name: 'Avatar 2', gender: 'F' as const, isLocal: true },
        { id: 'avatar_3', name: 'Avatar 3', gender: 'M' as const, isLocal: true },
        { id: 'avatar_4', name: 'Avatar 4', gender: 'F' as const, isLocal: true },
      ]

      // This should not throw
      avatarLoader.preloadAdjacentThumbnails(1, presets as never, 1)

      // Wait a tick for async operation
      await new Promise(resolve => setTimeout(resolve, 10))
    })

    it('should handle empty presets array', () => {
      // Should not throw
      avatarLoader.preloadAdjacentThumbnails(0, [], 2)
    })
  })

  describe('preloadInitialThumbnails', () => {
    it('should complete without errors', async () => {
      // This exercises the function path, checking it doesn't throw
      await avatarLoader.preloadInitialThumbnails(2)

      // Function completed successfully (didn't throw)
      expect(true).toBe(true)
    })

    it('should handle fetch errors gracefully', async () => {
      // Mock fetchCdnAvatars to throw
      const { fetchCdnAvatars } = await import('../defaults')
      vi.mocked(fetchCdnAvatars).mockRejectedValueOnce(new Error('Network error'))

      // Should not throw - exercises the catch block
      await expect(avatarLoader.preloadInitialThumbnails(2)).resolves.not.toThrow()
    })
  })
})

describe('useAvatarLoadingState hook', () => {
  beforeEach(() => {
    avatarLoader.clearCache()
  })

  it('should return initial state', () => {
    avatarLoader.initializeLocalAvatars()

    const { result } = renderHook(() => useAvatarLoadingState('avatar_asian_m'))

    expect(result.current.state).toBeDefined()
    expect(result.current.isLoading).toBe(false)
    expect(result.current.isLoaded).toBe(false)
    expect(result.current.progress).toBe(0)
  })

  it('should update when loading state changes', async () => {
    avatarLoader.initializeLocalAvatars()

    const { result } = renderHook(() => useAvatarLoadingState('avatar_asian_m'))

    expect(result.current.isLoading).toBe(false)

    act(() => {
      avatarLoader.markAvatarLoading('avatar_asian_m')
    })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(true)
    })
  })

  it('should show loaded state', async () => {
    const { result } = renderHook(() => useAvatarLoadingState('avatar_asian_m'))

    act(() => {
      avatarLoader.markAvatarLoading('avatar_asian_m')
      avatarLoader.markAvatarLoaded('avatar_asian_m')
    })

    await waitFor(() => {
      expect(result.current.isLoaded).toBe(true)
      expect(result.current.progress).toBe(100)
    })
  })

  it('should show error state', async () => {
    const { result } = renderHook(() => useAvatarLoadingState('avatar_asian_m'))

    act(() => {
      avatarLoader.markAvatarLoading('avatar_asian_m')
      avatarLoader.markAvatarError('avatar_asian_m', 'Test error')
    })

    await waitFor(() => {
      expect(result.current.error).toBe('Test error')
    })
  })

  it('should update when avatarId changes', async () => {
    avatarLoader.initializeLocalAvatars()
    avatarLoader.markAvatarLoading('avatar_asian_m')
    avatarLoader.markAvatarLoaded('avatar_asian_m')

    const { result, rerender } = renderHook(
      ({ id }) => useAvatarLoadingState(id),
      { initialProps: { id: 'avatar_asian_m' } }
    )

    expect(result.current.isLoaded).toBe(true)

    rerender({ id: 'avatar_asian_f' })

    await waitFor(() => {
      expect(result.current.isLoaded).toBe(false)
    })
  })
})

describe('usePreloadingStatus hook', () => {
  beforeEach(() => {
    avatarLoader.clearCache()
  })

  it('should return initial stats', () => {
    const { result } = renderHook(() => usePreloadingStatus())

    expect(result.current.isPreloading).toBe(false)
    expect(result.current.progress).toBe(0)
    expect(result.current.stats.total).toBe(0)
  })

  it('should show preloading in progress', async () => {
    const { result } = renderHook(() => usePreloadingStatus())

    act(() => {
      avatarLoader.markAvatarLoading('avatar_asian_m')
    })

    await waitFor(() => {
      expect(result.current.isPreloading).toBe(true)
      expect(result.current.stats.loading).toBe(1)
    })
  })

  it('should calculate progress correctly', async () => {
    const { result } = renderHook(() => usePreloadingStatus())

    act(() => {
      avatarLoader.markAvatarLoading('avatar_asian_m')
      avatarLoader.markAvatarLoaded('avatar_asian_m')
      avatarLoader.markAvatarLoading('avatar_asian_f')
    })

    await waitFor(() => {
      // 1 loaded out of 2 total = 50%
      expect(result.current.progress).toBe(50)
    })
  })
})

describe('usePreloadAvatar hook', () => {
  beforeEach(() => {
    avatarLoader.clearCache()
  })

  it('should trigger preload on mount', async () => {
    avatarLoader.initializeLocalAvatars()

    const { result } = renderHook(() => usePreloadAvatar('avatar_asian_m'))

    // Should have queued the avatar
    const state = avatarLoader.getLoadingState('avatar_asian_m')
    expect(state?.status).toBe('pending')
  })

  it('should not re-trigger if already loaded', async () => {
    avatarLoader.markAvatarLoading('avatar_asian_m')
    avatarLoader.markAvatarLoaded('avatar_asian_m')

    const { result } = renderHook(() => usePreloadAvatar('avatar_asian_m'))

    expect(result.current.isLoaded).toBe(true)
  })

  it('should provide preload function for retry', async () => {
    avatarLoader.markAvatarLoading('avatar_asian_m')
    avatarLoader.markAvatarError('avatar_asian_m', 'Error')

    const { result } = renderHook(() => usePreloadAvatar('avatar_asian_m'))

    expect(result.current.error).toBe('Error')
    expect(typeof result.current.preload).toBe('function')
  })
})
