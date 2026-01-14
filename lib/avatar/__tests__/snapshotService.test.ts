/**
 * Tests for lib/avatar/snapshotService.ts
 *
 * Tests avatar snapshot service for storage and caching.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock Supabase client
const mockUpload = vi.fn()
const mockRemove = vi.fn()
const mockList = vi.fn()
const mockGetPublicUrl = vi.fn()
const mockStorageFrom = vi.fn()

vi.mock('../../supabase', () => ({
  supabase: {
    storage: {
      from: (bucket: string) => {
        mockStorageFrom(bucket)
        return {
          upload: (...args: unknown[]) => mockUpload(...args),
          remove: (...args: unknown[]) => mockRemove(...args),
          list: (...args: unknown[]) => mockList(...args),
          getPublicUrl: (...args: unknown[]) => mockGetPublicUrl(...args),
        }
      },
    },
  },
}))

import {
  hashConfig,
  hashConfigWithOptions,
  getSnapshotPath,
  getSnapshotUrl,
  checkSnapshotExists,
  uploadSnapshot,
  deleteSnapshot,
  getOrCreateSnapshot,
  getCachedSnapshotUrl,
  uploadPreGeneratedSnapshot,
  getMemoryCachedUrl,
  setMemoryCachedUrl,
  clearMemoryCache,
  getCachedSnapshotUrlWithMemory,
  AVATAR_SNAPSHOTS_BUCKET,
  DEFAULT_SNAPSHOT_FORMAT,
  DEFAULT_SNAPSHOT_SIZE,
  SNAPSHOT_SIZES,
} from '../snapshotService'
import type { AvatarConfig } from '../../../components/avatar/types'

const mockConfig: AvatarConfig = {
  avatarId: 'avatar_asian_m',
  gender: 'M',
  ethnicity: 'Asian',
}

describe('snapshotService constants', () => {
  it('should export AVATAR_SNAPSHOTS_BUCKET', () => {
    expect(AVATAR_SNAPSHOTS_BUCKET).toBe('avatar-snapshots')
  })

  it('should export DEFAULT_SNAPSHOT_FORMAT', () => {
    expect(DEFAULT_SNAPSHOT_FORMAT).toBe('png')
  })

  it('should export DEFAULT_SNAPSHOT_SIZE', () => {
    expect(DEFAULT_SNAPSHOT_SIZE).toEqual({ width: 512, height: 512 })
  })

  it('should export SNAPSHOT_SIZES with presets', () => {
    expect(SNAPSHOT_SIZES.thumbnail).toEqual({ width: 128, height: 128 })
    expect(SNAPSHOT_SIZES.small).toEqual({ width: 256, height: 256 })
    expect(SNAPSHOT_SIZES.medium).toEqual({ width: 512, height: 512 })
    expect(SNAPSHOT_SIZES.large).toEqual({ width: 1024, height: 1024 })
  })
})

describe('hashConfig', () => {
  it('should return a deterministic hash for the same config', () => {
    const hash1 = hashConfig(mockConfig)
    const hash2 = hashConfig(mockConfig)

    expect(hash1).toBe(hash2)
  })

  it('should return different hashes for different configs', () => {
    const hash1 = hashConfig(mockConfig)
    const hash2 = hashConfig({
      avatarId: 'avatar_black_m',
      gender: 'M',
      ethnicity: 'Black',
    })

    expect(hash1).not.toBe(hash2)
  })

  it('should return consistent hash regardless of key order', () => {
    const config1: AvatarConfig = {
      avatarId: 'avatar_asian_m',
      gender: 'M',
      ethnicity: 'Asian',
    }
    const config2: AvatarConfig = {
      ethnicity: 'Asian',
      avatarId: 'avatar_asian_m',
      gender: 'M',
    }

    expect(hashConfig(config1)).toBe(hashConfig(config2))
  })

  it('should return a hex string with checksum', () => {
    const hash = hashConfig(mockConfig)

    // Hash should be hex characters (0-9, a-f)
    expect(hash).toMatch(/^[0-9a-f]+$/)
    // Should be at least 12 characters (8 hash + 4 checksum)
    expect(hash.length).toBeGreaterThanOrEqual(12)
  })
})

describe('hashConfigWithOptions', () => {
  it('should include base hash', () => {
    const baseHash = hashConfig(mockConfig)
    const optionsHash = hashConfigWithOptions(mockConfig, {})

    expect(optionsHash).toContain(baseHash)
  })

  it('should return different hashes for different sizes', () => {
    const hash1 = hashConfigWithOptions(mockConfig, { width: 256, height: 256 })
    const hash2 = hashConfigWithOptions(mockConfig, { width: 512, height: 512 })

    expect(hash1).not.toBe(hash2)
  })

  it('should return different hashes for different formats', () => {
    const hash1 = hashConfigWithOptions(mockConfig, { format: 'png' })
    const hash2 = hashConfigWithOptions(mockConfig, { format: 'jpeg' })

    expect(hash1).not.toBe(hash2)
  })

  it('should use preset size when specified', () => {
    const presetHash = hashConfigWithOptions(mockConfig, { preset: 'thumbnail' })
    const manualHash = hashConfigWithOptions(mockConfig, { width: 128, height: 128 })

    expect(presetHash).toBe(manualHash)
  })
})

describe('getSnapshotPath', () => {
  it('should return path with subdirectory based on hash prefix', () => {
    const hash = 'abc12345'
    const path = getSnapshotPath(hash)

    expect(path).toBe('avatars/ab/abc12345.png')
  })

  it('should use correct extension for png', () => {
    const path = getSnapshotPath('abc12345', 'png')

    expect(path).toContain('.png')
  })

  it('should use jpg extension for jpeg format', () => {
    const path = getSnapshotPath('abc12345', 'jpeg')

    expect(path).toContain('.jpg')
  })
})

describe('getSnapshotUrl', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetPublicUrl.mockReturnValue({
      data: { publicUrl: 'https://storage.test/avatars/ab/abc12345.png' },
    })
  })

  it('should return public URL from Supabase', () => {
    const url = getSnapshotUrl('abc12345')

    expect(url).toBe('https://storage.test/avatars/ab/abc12345.png')
    expect(mockStorageFrom).toHaveBeenCalledWith(AVATAR_SNAPSHOTS_BUCKET)
  })
})

describe('checkSnapshotExists', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetPublicUrl.mockReturnValue({
      data: { publicUrl: 'https://storage.test/avatars/ab/abc12345.png' },
    })
  })

  it('should return exists: true when file is found', async () => {
    mockList.mockResolvedValue({
      data: [{ name: 'abc12345.png' }],
      error: null,
    })

    const result = await checkSnapshotExists('abc12345')

    expect(result.exists).toBe(true)
    expect(result.url).toBe('https://storage.test/avatars/ab/abc12345.png')
  })

  it('should return exists: false when file is not found', async () => {
    mockList.mockResolvedValue({
      data: [],
      error: null,
    })

    const result = await checkSnapshotExists('abc12345')

    expect(result.exists).toBe(false)
  })

  it('should return exists: false on error', async () => {
    mockList.mockResolvedValue({
      data: null,
      error: { message: 'Storage error' },
    })

    const result = await checkSnapshotExists('abc12345')

    expect(result.exists).toBe(false)
  })

  it('should handle exceptions gracefully', async () => {
    mockList.mockRejectedValue(new Error('Network error'))

    const result = await checkSnapshotExists('abc12345')

    expect(result.exists).toBe(false)
  })
})

describe('uploadSnapshot', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetPublicUrl.mockReturnValue({
      data: { publicUrl: 'https://storage.test/avatars/ab/abc12345.png' },
    })
  })

  it('should upload successfully', async () => {
    mockUpload.mockResolvedValue({
      data: { path: 'avatars/ab/abc12345.png' },
      error: null,
    })

    const result = await uploadSnapshot('abc12345', 'base64imagedata')

    expect(result.success).toBe(true)
    expect(result.url).toBe('https://storage.test/avatars/ab/abc12345.png')
  })

  it('should remove data URL prefix if present', async () => {
    mockUpload.mockResolvedValue({
      data: { path: 'avatars/ab/abc12345.png' },
      error: null,
    })

    await uploadSnapshot('abc12345', 'data:image/png;base64,SGVsbG8=')

    expect(mockUpload).toHaveBeenCalled()
  })

  it('should return error on upload failure', async () => {
    mockUpload.mockResolvedValue({
      data: null,
      error: { message: 'Upload failed' },
    })

    const result = await uploadSnapshot('abc12345', 'base64data')

    expect(result.success).toBe(false)
    expect(result.error).toBe('Upload failed')
  })

  it('should handle exceptions', async () => {
    mockUpload.mockRejectedValue(new Error('Network error'))

    const result = await uploadSnapshot('abc12345', 'base64data')

    expect(result.success).toBe(false)
    expect(result.error).toBe('Network error')
  })
})

describe('deleteSnapshot', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should delete successfully', async () => {
    mockRemove.mockResolvedValue({ error: null })

    const result = await deleteSnapshot('abc12345')

    expect(result).toBe(true)
    expect(mockRemove).toHaveBeenCalledWith(['avatars/ab/abc12345.png'])
  })

  it('should return false on error', async () => {
    mockRemove.mockResolvedValue({ error: { message: 'Delete failed' } })

    const result = await deleteSnapshot('abc12345')

    expect(result).toBe(false)
  })

  it('should handle exceptions', async () => {
    mockRemove.mockRejectedValue(new Error('Network error'))

    const result = await deleteSnapshot('abc12345')

    expect(result).toBe(false)
  })
})

describe('getOrCreateSnapshot', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetPublicUrl.mockReturnValue({
      data: { publicUrl: 'https://storage.test/snapshot.png' },
    })
  })

  it('should return cached snapshot if exists', async () => {
    // Need to match the actual filename that will be generated
    const hash = hashConfigWithOptions(mockConfig, {})
    const filename = `${hash}.png`
    mockList.mockResolvedValue({
      data: [{ name: filename }],
      error: null,
    })

    const generator = vi.fn()
    const result = await getOrCreateSnapshot(mockConfig, generator)

    expect(result.cached).toBe(true)
    expect(result.url).toBeDefined()
    expect(generator).not.toHaveBeenCalled()
  })

  it('should generate and upload new snapshot if not cached', async () => {
    mockList.mockResolvedValue({ data: [], error: null })
    mockUpload.mockResolvedValue({
      data: { path: 'avatars/ab/hash.png' },
      error: null,
    })

    const generator = vi.fn().mockResolvedValue('base64imagedata')
    const result = await getOrCreateSnapshot(mockConfig, generator)

    expect(result.cached).toBe(false)
    expect(generator).toHaveBeenCalled()
    expect(mockUpload).toHaveBeenCalled()
  })

  it('should throw error on upload failure', async () => {
    mockList.mockResolvedValue({ data: [], error: null })
    mockUpload.mockResolvedValue({
      data: null,
      error: { message: 'Upload failed' },
    })

    const generator = vi.fn().mockResolvedValue('base64data')

    await expect(getOrCreateSnapshot(mockConfig, generator)).rejects.toThrow(
      'Upload failed'
    )
  })
})

describe('getCachedSnapshotUrl', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetPublicUrl.mockReturnValue({
      data: { publicUrl: 'https://storage.test/snapshot.png' },
    })
  })

  it('should return URL if snapshot exists', async () => {
    const hash = hashConfigWithOptions(mockConfig, {})
    const filename = `${hash}.png`
    mockList.mockResolvedValue({
      data: [{ name: filename }],
      error: null,
    })

    const url = await getCachedSnapshotUrl(mockConfig)

    expect(url).toBe('https://storage.test/snapshot.png')
  })

  it('should return null if snapshot does not exist', async () => {
    mockList.mockResolvedValue({ data: [], error: null })

    const url = await getCachedSnapshotUrl(mockConfig)

    expect(url).toBeNull()
  })
})

describe('uploadPreGeneratedSnapshot', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetPublicUrl.mockReturnValue({
      data: { publicUrl: 'https://storage.test/snapshot.png' },
    })
  })

  it('should upload pre-generated snapshot', async () => {
    mockUpload.mockResolvedValue({
      data: { path: 'avatars/ab/hash.png' },
      error: null,
    })

    const result = await uploadPreGeneratedSnapshot(mockConfig, 'base64data')

    expect(result.url).toBe('https://storage.test/snapshot.png')
    expect(result.cached).toBe(false)
  })

  it('should throw error on upload failure', async () => {
    mockUpload.mockResolvedValue({
      data: null,
      error: { message: 'Upload failed' },
    })

    await expect(
      uploadPreGeneratedSnapshot(mockConfig, 'base64data')
    ).rejects.toThrow('Upload failed')
  })
})

describe('memory cache', () => {
  beforeEach(() => {
    clearMemoryCache()
  })

  afterEach(() => {
    clearMemoryCache()
  })

  describe('getMemoryCachedUrl', () => {
    it('should return null for uncached hash', () => {
      const url = getMemoryCachedUrl('uncached-hash')

      expect(url).toBeNull()
    })

    it('should return cached URL', () => {
      setMemoryCachedUrl('test-hash', 'https://cached-url.com/snapshot.png')

      const url = getMemoryCachedUrl('test-hash')

      expect(url).toBe('https://cached-url.com/snapshot.png')
    })
  })

  describe('setMemoryCachedUrl', () => {
    it('should cache URL for hash', () => {
      setMemoryCachedUrl('new-hash', 'https://new-url.com/snapshot.png')

      expect(getMemoryCachedUrl('new-hash')).toBe(
        'https://new-url.com/snapshot.png'
      )
    })

    it('should overwrite existing cache', () => {
      setMemoryCachedUrl('hash', 'https://old-url.com')
      setMemoryCachedUrl('hash', 'https://new-url.com')

      expect(getMemoryCachedUrl('hash')).toBe('https://new-url.com')
    })
  })

  describe('clearMemoryCache', () => {
    it('should clear all cached URLs', () => {
      setMemoryCachedUrl('hash1', 'url1')
      setMemoryCachedUrl('hash2', 'url2')

      clearMemoryCache()

      expect(getMemoryCachedUrl('hash1')).toBeNull()
      expect(getMemoryCachedUrl('hash2')).toBeNull()
    })
  })
})

describe('getCachedSnapshotUrlWithMemory', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    clearMemoryCache()
    mockGetPublicUrl.mockReturnValue({
      data: { publicUrl: 'https://storage.test/snapshot.png' },
    })
  })

  afterEach(() => {
    clearMemoryCache()
  })

  it('should return memory cached URL without storage check', async () => {
    const hash = hashConfigWithOptions(mockConfig, {})
    setMemoryCachedUrl(hash, 'https://memory-cached.com/snapshot.png')

    const url = await getCachedSnapshotUrlWithMemory(mockConfig)

    expect(url).toBe('https://memory-cached.com/snapshot.png')
    expect(mockList).not.toHaveBeenCalled()
  })

  it('should check storage if not in memory cache', async () => {
    const hash = hashConfigWithOptions(mockConfig, {})
    const filename = `${hash}.png`
    mockList.mockResolvedValue({
      data: [{ name: filename }],
      error: null,
    })

    const url = await getCachedSnapshotUrlWithMemory(mockConfig)

    expect(url).toBe('https://storage.test/snapshot.png')
    expect(mockList).toHaveBeenCalled()
  })

  it('should add storage URL to memory cache', async () => {
    const hash = hashConfigWithOptions(mockConfig, {})
    const filename = `${hash}.png`
    mockList.mockResolvedValue({
      data: [{ name: filename }],
      error: null,
    })

    await getCachedSnapshotUrlWithMemory(mockConfig)

    expect(getMemoryCachedUrl(hash)).toBe('https://storage.test/snapshot.png')
  })

  it('should return null if not found anywhere', async () => {
    mockList.mockResolvedValue({ data: [], error: null })

    const url = await getCachedSnapshotUrlWithMemory(mockConfig)

    expect(url).toBeNull()
  })
})
