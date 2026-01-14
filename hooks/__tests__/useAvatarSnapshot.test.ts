/**
 * Tests for hooks/useAvatarSnapshot.ts
 *
 * Tests avatar snapshot hook for managing avatar snapshot URLs.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'

// Mock snapshot service
const mockHashConfigWithOptions = vi.fn()
const mockGetCachedSnapshotUrlWithMemory = vi.fn()
const mockGetOrCreateSnapshot = vi.fn()
const mockUploadPreGeneratedSnapshot = vi.fn()
const mockGetMemoryCachedUrl = vi.fn()
const mockSetMemoryCachedUrl = vi.fn()

vi.mock('../../lib/avatar/snapshotService', () => ({
  hashConfigWithOptions: (...args: unknown[]) => mockHashConfigWithOptions(...args),
  getCachedSnapshotUrlWithMemory: (...args: unknown[]) =>
    mockGetCachedSnapshotUrlWithMemory(...args),
  getOrCreateSnapshot: (...args: unknown[]) => mockGetOrCreateSnapshot(...args),
  uploadPreGeneratedSnapshot: (...args: unknown[]) =>
    mockUploadPreGeneratedSnapshot(...args),
  getMemoryCachedUrl: (...args: unknown[]) => mockGetMemoryCachedUrl(...args),
  setMemoryCachedUrl: (...args: unknown[]) => mockSetMemoryCachedUrl(...args),
}))

import {
  useAvatarSnapshot,
  usePrefetchSnapshots,
  useUploadSnapshot,
} from '../useAvatarSnapshot'
import type { AvatarConfig } from '../../components/avatar/types'

const mockConfig: AvatarConfig = {
  avatarId: 'avatar_asian_m',
  gender: 'M',
  ethnicity: 'Asian',
}

describe('useAvatarSnapshot', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Default: hash returns a deterministic value
    mockHashConfigWithOptions.mockReturnValue('test-hash-123')

    // Default: no memory cache
    mockGetMemoryCachedUrl.mockReturnValue(null)

    // Default: no storage cache
    mockGetCachedSnapshotUrlWithMemory.mockResolvedValue(null)
  })

  describe('initial state', () => {
    it('should start with null url when skip is true', () => {
      const { result } = renderHook(() =>
        useAvatarSnapshot(mockConfig, { skip: true })
      )

      expect(result.current.url).toBeNull()
    })

    it('should start with isLoading false when skip is true', () => {
      const { result } = renderHook(() =>
        useAvatarSnapshot(mockConfig, { skip: true })
      )

      expect(result.current.isLoading).toBe(false)
    })

    it('should start with isGenerating false', () => {
      const { result } = renderHook(() =>
        useAvatarSnapshot(mockConfig, { skip: true })
      )

      expect(result.current.isGenerating).toBe(false)
    })

    it('should start with no error when skip is true', () => {
      const { result } = renderHook(() =>
        useAvatarSnapshot(mockConfig, { skip: true })
      )

      expect(result.current.error).toBeNull()
    })

    it('should start with null hash when skip is true', () => {
      const { result } = renderHook(() =>
        useAvatarSnapshot(mockConfig, { skip: true })
      )

      expect(result.current.hash).toBeNull()
    })

    it('should start with fromCache false', () => {
      const { result } = renderHook(() =>
        useAvatarSnapshot(mockConfig, { skip: true })
      )

      expect(result.current.fromCache).toBe(false)
    })
  })

  describe('null config handling', () => {
    it('should return null url when config is null', () => {
      const { result } = renderHook(() => useAvatarSnapshot(null))

      expect(result.current.url).toBeNull()
      expect(result.current.isLoading).toBe(false)
    })

    it('should return null url when config is undefined', () => {
      const { result } = renderHook(() => useAvatarSnapshot(undefined))

      expect(result.current.url).toBeNull()
      expect(result.current.isLoading).toBe(false)
    })
  })

  describe('memory cache', () => {
    it('should return cached URL from memory cache', async () => {
      mockGetMemoryCachedUrl.mockReturnValue('https://cached-url.com/snapshot.png')

      const { result } = renderHook(() => useAvatarSnapshot(mockConfig))

      expect(result.current.url).toBe('https://cached-url.com/snapshot.png')
      expect(result.current.fromCache).toBe(true)
      expect(result.current.isLoading).toBe(false)
    })
  })

  describe('storage cache', () => {
    it('should fetch from storage when not in memory cache', async () => {
      mockGetCachedSnapshotUrlWithMemory.mockResolvedValue(
        'https://storage-url.com/snapshot.png'
      )

      const { result } = renderHook(() => useAvatarSnapshot(mockConfig))

      await waitFor(() => {
        expect(result.current.url).toBe('https://storage-url.com/snapshot.png')
      })

      expect(result.current.fromCache).toBe(true)
    })

    it('should call onSuccess when cached URL is found', async () => {
      const onSuccess = vi.fn()
      mockGetCachedSnapshotUrlWithMemory.mockResolvedValue(
        'https://storage-url.com/snapshot.png'
      )

      renderHook(() =>
        useAvatarSnapshot(mockConfig, { onSuccess })
      )

      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalledWith({
          url: 'https://storage-url.com/snapshot.png',
          hash: 'test-hash-123',
          cached: true,
        })
      })
    })
  })

  describe('auto generation', () => {
    it('should generate snapshot when no cache and generator provided', async () => {
      const mockGenerator = vi.fn().mockResolvedValue('base64-image-data')
      mockGetOrCreateSnapshot.mockResolvedValue({
        url: 'https://generated-url.com/snapshot.png',
        hash: 'test-hash-123',
        cached: false,
      })

      const { result } = renderHook(() =>
        useAvatarSnapshot(mockConfig, {
          generator: mockGenerator,
          autoGenerate: true,
        })
      )

      await waitFor(() => {
        expect(result.current.url).toBe('https://generated-url.com/snapshot.png')
      })

      expect(mockGetOrCreateSnapshot).toHaveBeenCalled()
    })

    it('should not generate when autoGenerate is false', async () => {
      const mockGenerator = vi.fn()

      const { result } = renderHook(() =>
        useAvatarSnapshot(mockConfig, {
          generator: mockGenerator,
          autoGenerate: false,
        })
      )

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(mockGetOrCreateSnapshot).not.toHaveBeenCalled()
      expect(result.current.url).toBeNull()
    })

    it('should not generate when no generator provided', async () => {
      const { result } = renderHook(() =>
        useAvatarSnapshot(mockConfig, { autoGenerate: true })
      )

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(mockGetOrCreateSnapshot).not.toHaveBeenCalled()
      expect(result.current.url).toBeNull()
    })
  })

  describe('error handling', () => {
    it('should set error on storage fetch failure', async () => {
      mockGetCachedSnapshotUrlWithMemory.mockRejectedValue(
        new Error('Storage error')
      )

      const { result } = renderHook(() => useAvatarSnapshot(mockConfig))

      await waitFor(() => {
        expect(result.current.error).toBe('Storage error')
      })
    })

    it('should call onError callback on failure', async () => {
      const onError = vi.fn()
      mockGetCachedSnapshotUrlWithMemory.mockRejectedValue(
        new Error('Storage error')
      )

      renderHook(() =>
        useAvatarSnapshot(mockConfig, { onError })
      )

      await waitFor(() => {
        expect(onError).toHaveBeenCalled()
      })
    })

    it('should set error on generation failure', async () => {
      const mockGenerator = vi.fn()
      mockGetOrCreateSnapshot.mockRejectedValue(new Error('Generation failed'))

      const { result } = renderHook(() =>
        useAvatarSnapshot(mockConfig, {
          generator: mockGenerator,
          autoGenerate: true,
        })
      )

      await waitFor(() => {
        expect(result.current.error).toBe('Generation failed')
      })
    })
  })

  describe('clearError', () => {
    it('should clear error state', async () => {
      mockGetCachedSnapshotUrlWithMemory.mockRejectedValue(
        new Error('Storage error')
      )

      const { result } = renderHook(() => useAvatarSnapshot(mockConfig))

      await waitFor(() => {
        expect(result.current.error).toBe('Storage error')
      })

      act(() => {
        result.current.clearError()
      })

      expect(result.current.error).toBeNull()
    })
  })

  describe('generate', () => {
    it('should manually generate snapshot', async () => {
      const mockGenerator = vi.fn().mockResolvedValue('base64-image-data')
      mockGetOrCreateSnapshot.mockResolvedValue({
        url: 'https://generated-url.com/snapshot.png',
        hash: 'test-hash-123',
        cached: false,
      })

      const { result } = renderHook(() =>
        useAvatarSnapshot(mockConfig, {
          generator: mockGenerator,
          autoGenerate: false,
        })
      )

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      let generateResult: unknown
      await act(async () => {
        generateResult = await result.current.generate()
      })

      expect(generateResult).toEqual({
        url: 'https://generated-url.com/snapshot.png',
        hash: 'test-hash-123',
        cached: false,
      })
    })

    it('should return null when no generator provided', async () => {
      const { result } = renderHook(() =>
        useAvatarSnapshot(mockConfig, { autoGenerate: false })
      )

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      let generateResult: unknown
      await act(async () => {
        generateResult = await result.current.generate()
      })

      expect(generateResult).toBeNull()
    })

    it('should return null when config is null', async () => {
      const mockGenerator = vi.fn()
      const { result } = renderHook(() =>
        useAvatarSnapshot(null, { generator: mockGenerator })
      )

      let generateResult: unknown
      await act(async () => {
        generateResult = await result.current.generate()
      })

      expect(generateResult).toBeNull()
    })
  })

  describe('refresh', () => {
    it('should refetch snapshot from storage', async () => {
      mockGetCachedSnapshotUrlWithMemory
        .mockResolvedValueOnce('https://old-url.com/snapshot.png')
        .mockResolvedValueOnce('https://new-url.com/snapshot.png')

      const { result } = renderHook(() => useAvatarSnapshot(mockConfig))

      await waitFor(() => {
        expect(result.current.url).toBe('https://old-url.com/snapshot.png')
      })

      await act(async () => {
        await result.current.refresh()
      })

      expect(result.current.url).toBe('https://new-url.com/snapshot.png')
    })

    it('should not refresh when skip is true', async () => {
      const { result } = renderHook(() =>
        useAvatarSnapshot(mockConfig, { skip: true })
      )

      mockGetCachedSnapshotUrlWithMemory.mockClear()

      await act(async () => {
        await result.current.refresh()
      })

      expect(mockGetCachedSnapshotUrlWithMemory).not.toHaveBeenCalled()
    })
  })

  describe('return value structure', () => {
    it('should provide all expected properties', () => {
      const { result } = renderHook(() =>
        useAvatarSnapshot(mockConfig, { skip: true })
      )

      expect(result.current).toHaveProperty('url')
      expect(result.current).toHaveProperty('isLoading')
      expect(result.current).toHaveProperty('isGenerating')
      expect(result.current).toHaveProperty('error')
      expect(result.current).toHaveProperty('hash')
      expect(result.current).toHaveProperty('fromCache')
      expect(result.current).toHaveProperty('generate')
      expect(result.current).toHaveProperty('clearError')
      expect(result.current).toHaveProperty('refresh')
    })
  })
})

describe('usePrefetchSnapshots', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mockHashConfigWithOptions.mockReturnValue('prefetch-hash')
    mockGetMemoryCachedUrl.mockReturnValue(null)
    mockGetCachedSnapshotUrlWithMemory.mockResolvedValue(null)
  })

  it('should prefetch snapshots for valid configs', async () => {
    mockGetCachedSnapshotUrlWithMemory.mockResolvedValue(
      'https://prefetched-url.com/snapshot.png'
    )

    const configs = [mockConfig, { avatarId: 'avatar_black_m' }]

    renderHook(() => usePrefetchSnapshots(configs))

    await waitFor(() => {
      expect(mockGetCachedSnapshotUrlWithMemory).toHaveBeenCalled()
    })
  })

  it('should skip null configs', async () => {
    const configs = [mockConfig, null, undefined]

    renderHook(() => usePrefetchSnapshots(configs))

    await waitFor(() => {
      // Should only be called once for the valid config
      expect(mockGetCachedSnapshotUrlWithMemory).toHaveBeenCalledTimes(1)
    })
  })

  it('should skip configs already in memory cache', async () => {
    mockGetMemoryCachedUrl.mockReturnValue('https://cached.com/snapshot.png')

    const configs = [mockConfig]

    renderHook(() => usePrefetchSnapshots(configs))

    await new Promise((r) => setTimeout(r, 50))

    // Should not call storage fetch if already in memory
    expect(mockGetCachedSnapshotUrlWithMemory).not.toHaveBeenCalled()
  })

  it('should handle empty config array', () => {
    const configs: AvatarConfig[] = []

    renderHook(() => usePrefetchSnapshots(configs))

    expect(mockGetCachedSnapshotUrlWithMemory).not.toHaveBeenCalled()
  })

  it('should set memory cache when URL is found', async () => {
    mockGetCachedSnapshotUrlWithMemory.mockResolvedValue(
      'https://prefetched-url.com/snapshot.png'
    )

    const configs = [mockConfig]

    renderHook(() => usePrefetchSnapshots(configs))

    await waitFor(() => {
      expect(mockSetMemoryCachedUrl).toHaveBeenCalledWith(
        'prefetch-hash',
        'https://prefetched-url.com/snapshot.png'
      )
    })
  })
})

describe('useUploadSnapshot', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mockUploadPreGeneratedSnapshot.mockResolvedValue({
      url: 'https://uploaded-url.com/snapshot.png',
      hash: 'upload-hash-123',
      cached: false,
    })
  })

  describe('initial state', () => {
    it('should start with isUploading false', () => {
      const { result } = renderHook(() => useUploadSnapshot())

      expect(result.current.isUploading).toBe(false)
    })

    it('should start with no error', () => {
      const { result } = renderHook(() => useUploadSnapshot())

      expect(result.current.error).toBeNull()
    })
  })

  describe('upload', () => {
    it('should upload snapshot and return result', async () => {
      const { result } = renderHook(() => useUploadSnapshot())

      let uploadResult: unknown
      await act(async () => {
        uploadResult = await result.current.upload(
          mockConfig,
          'base64-image-data'
        )
      })

      expect(uploadResult).toEqual({
        url: 'https://uploaded-url.com/snapshot.png',
        hash: 'upload-hash-123',
        cached: false,
      })

      expect(mockUploadPreGeneratedSnapshot).toHaveBeenCalledWith(
        mockConfig,
        'base64-image-data',
        {}
      )
    })

    it('should pass options to upload function', async () => {
      const { result } = renderHook(() => useUploadSnapshot())

      await act(async () => {
        await result.current.upload(mockConfig, 'base64-image-data', {
          width: 256,
          height: 256,
          format: 'jpeg',
        })
      })

      expect(mockUploadPreGeneratedSnapshot).toHaveBeenCalledWith(
        mockConfig,
        'base64-image-data',
        { width: 256, height: 256, format: 'jpeg' }
      )
    })

    it('should update memory cache after successful upload', async () => {
      const { result } = renderHook(() => useUploadSnapshot())

      await act(async () => {
        await result.current.upload(mockConfig, 'base64-image-data')
      })

      expect(mockSetMemoryCachedUrl).toHaveBeenCalledWith(
        'upload-hash-123',
        'https://uploaded-url.com/snapshot.png'
      )
    })

    it('should set error on upload failure', async () => {
      mockUploadPreGeneratedSnapshot.mockRejectedValue(
        new Error('Upload failed')
      )

      const { result } = renderHook(() => useUploadSnapshot())

      await act(async () => {
        await result.current.upload(mockConfig, 'base64-image-data')
      })

      expect(result.current.error).toBe('Upload failed')
    })

    it('should return null on upload failure', async () => {
      mockUploadPreGeneratedSnapshot.mockRejectedValue(
        new Error('Upload failed')
      )

      const { result } = renderHook(() => useUploadSnapshot())

      let uploadResult: unknown
      await act(async () => {
        uploadResult = await result.current.upload(
          mockConfig,
          'base64-image-data'
        )
      })

      expect(uploadResult).toBeNull()
    })
  })

  describe('clearError', () => {
    it('should clear error state', async () => {
      mockUploadPreGeneratedSnapshot.mockRejectedValue(
        new Error('Upload failed')
      )

      const { result } = renderHook(() => useUploadSnapshot())

      await act(async () => {
        await result.current.upload(mockConfig, 'base64-image-data')
      })

      expect(result.current.error).toBe('Upload failed')

      act(() => {
        result.current.clearError()
      })

      expect(result.current.error).toBeNull()
    })
  })

  describe('return value structure', () => {
    it('should provide all expected properties', () => {
      const { result } = renderHook(() => useUploadSnapshot())

      expect(result.current).toHaveProperty('upload')
      expect(result.current).toHaveProperty('isUploading')
      expect(result.current).toHaveProperty('error')
      expect(result.current).toHaveProperty('clearError')
    })
  })
})
