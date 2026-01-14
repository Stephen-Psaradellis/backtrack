/**
 * Tests for lib/avatar/defaults.ts
 *
 * Tests avatar default configurations and preset utilities.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { AvatarPreset, AvatarConfig } from '../../../components/avatar/types'

// Mock fetch for CDN tests
const mockFetch = vi.fn()
global.fetch = mockFetch

// Re-import after mocking
let defaults: typeof import('../defaults')

beforeEach(async () => {
  vi.resetModules()
  mockFetch.mockReset()
  defaults = await import('../defaults')
})

describe('LOCAL_AVATAR_PRESETS', () => {
  it('should have 6 local presets', () => {
    expect(defaults.LOCAL_AVATAR_PRESETS).toHaveLength(6)
  })

  it('should have required properties for each preset', () => {
    for (const preset of defaults.LOCAL_AVATAR_PRESETS) {
      expect(preset).toHaveProperty('id')
      expect(preset).toHaveProperty('name')
      expect(preset).toHaveProperty('file')
      expect(preset).toHaveProperty('style')
      expect(preset).toHaveProperty('ethnicity')
      expect(preset).toHaveProperty('gender')
      expect(preset).toHaveProperty('outfit')
      expect(preset.isLocal).toBe(true)
    }
  })

  it('should have correct preset IDs', () => {
    const ids = defaults.LOCAL_AVATAR_PRESETS.map((p) => p.id)
    expect(ids).toContain('avatar_asian_m')
    expect(ids).toContain('avatar_asian_f')
    expect(ids).toContain('avatar_black_m')
    expect(ids).toContain('avatar_white_f')
    expect(ids).toContain('avatar_hispanic_m')
    expect(ids).toContain('avatar_mena_f')
  })

  it('should have valid gender values', () => {
    for (const preset of defaults.LOCAL_AVATAR_PRESETS) {
      expect(['M', 'F']).toContain(preset.gender)
    }
  })

  it('should have valid outfit values', () => {
    for (const preset of defaults.LOCAL_AVATAR_PRESETS) {
      expect(['Casual', 'Business', 'Medical', 'Military', 'Utility']).toContain(preset.outfit)
    }
  })
})

describe('getAvatarPreset', () => {
  it('should return local preset by ID', () => {
    const preset = defaults.getAvatarPreset('avatar_asian_m')

    expect(preset).toBeDefined()
    expect(preset?.id).toBe('avatar_asian_m')
    expect(preset?.isLocal).toBe(true)
  })

  it('should return undefined for unknown ID', () => {
    const preset = defaults.getAvatarPreset('unknown_avatar')

    expect(preset).toBeUndefined()
  })
})

describe('getAllAvatarPresetsSync', () => {
  it('should return local presets synchronously', () => {
    const presets = defaults.getAllAvatarPresetsSync()

    expect(presets.length).toBeGreaterThanOrEqual(6)
    expect(presets.some((p) => p.id === 'avatar_asian_m')).toBe(true)
  })
})

describe('createAvatarConfig', () => {
  it('should create config from preset ID', () => {
    const config = defaults.createAvatarConfig('avatar_asian_m')

    expect(config.avatarId).toBe('avatar_asian_m')
    expect(config.style).toBe('Style B')
    expect(config.gender).toBe('M')
    expect(config.outfit).toBe('Casual')
  })

  it('should return default config for unknown ID', () => {
    const config = defaults.createAvatarConfig('unknown_avatar')

    expect(config.avatarId).toBe('avatar_asian_m')
    expect(config).toEqual(defaults.DEFAULT_AVATAR_CONFIG)
  })
})

describe('createStoredAvatar', () => {
  it('should create stored avatar with config', () => {
    const stored = defaults.createStoredAvatar('avatar_asian_f')

    expect(stored.id).toBeDefined()
    expect(stored.config.avatarId).toBe('avatar_asian_f')
    expect(stored.version).toBe(2)
    expect(stored.createdAt).toBeDefined()
    expect(stored.updatedAt).toBeDefined()
  })

  it('should use provided ID if given', () => {
    const stored = defaults.createStoredAvatar('avatar_asian_m', 'custom-id')

    expect(stored.id).toBe('custom-id')
  })
})

describe('createDefaultStoredAvatar', () => {
  it('should create stored avatar with default config', () => {
    const stored = defaults.createDefaultStoredAvatar()

    expect(stored.config.avatarId).toBe('avatar_asian_m')
  })
})

describe('getRandomAvatarId', () => {
  it('should return a valid avatar ID', () => {
    const id = defaults.getRandomAvatarId()

    expect(id).toBeDefined()
    // Should be from local presets
    const preset = defaults.getAvatarPreset(id)
    expect(preset || id === 'avatar_asian_m').toBeTruthy()
  })
})

describe('createRandomStoredAvatar', () => {
  it('should create a valid stored avatar', () => {
    const stored = defaults.createRandomStoredAvatar()

    expect(stored.id).toBeDefined()
    expect(stored.config.avatarId).toBeDefined()
    expect(stored.version).toBe(2)
  })
})

describe('normalizeAvatarConfig', () => {
  it('should return config from avatarId if present', () => {
    const config = defaults.normalizeAvatarConfig({
      avatarId: 'avatar_black_m',
    })

    expect(config.avatarId).toBe('avatar_black_m')
    expect(config.style).toBe('Style C')
    expect(config.gender).toBe('M')
  })

  it('should merge partial with defaults', () => {
    const config = defaults.normalizeAvatarConfig({
      gender: 'F',
    })

    expect(config.avatarId).toBe(defaults.DEFAULT_AVATAR_CONFIG.avatarId)
    expect(config.gender).toBe('F')
  })

  it('should return defaults for empty partial', () => {
    const config = defaults.normalizeAvatarConfig({})

    expect(config).toEqual(defaults.DEFAULT_AVATAR_CONFIG)
  })
})

describe('normalizeStoredAvatar', () => {
  it('should normalize partial stored avatar', () => {
    const stored = defaults.normalizeStoredAvatar({
      config: { avatarId: 'avatar_white_f' },
    })

    expect(stored.id).toBeDefined()
    expect(stored.config.avatarId).toBe('avatar_white_f')
    expect(stored.version).toBe(2)
    expect(stored.createdAt).toBeDefined()
    expect(stored.updatedAt).toBeDefined()
  })

  it('should preserve existing values', () => {
    const stored = defaults.normalizeStoredAvatar({
      id: 'existing-id',
      config: { avatarId: 'avatar_asian_m' },
      version: 3,
      createdAt: '2023-01-01',
      updatedAt: '2023-06-01',
      snapshotUrl: 'https://example.com/snapshot.png',
    })

    expect(stored.id).toBe('existing-id')
    expect(stored.version).toBe(3)
    expect(stored.createdAt).toBe('2023-01-01')
    expect(stored.snapshotUrl).toBe('https://example.com/snapshot.png')
  })

  it('should use defaults for empty config', () => {
    const stored = defaults.normalizeStoredAvatar({})

    expect(stored.config).toEqual(defaults.DEFAULT_AVATAR_CONFIG)
  })
})

describe('filterAvatarPresets', () => {
  it('should filter by gender', () => {
    const males = defaults.filterAvatarPresets({ gender: 'M' })
    const females = defaults.filterAvatarPresets({ gender: 'F' })

    expect(males.every((p) => p.gender === 'M')).toBe(true)
    expect(females.every((p) => p.gender === 'F')).toBe(true)
  })

  it('should filter by style', () => {
    const styleB = defaults.filterAvatarPresets({ style: 'Style B' })

    expect(styleB.every((p) => p.style === 'Style B')).toBe(true)
  })

  it('should filter by outfit', () => {
    const casual = defaults.filterAvatarPresets({ outfit: 'Casual' })

    expect(casual.every((p) => p.outfit === 'Casual')).toBe(true)
  })

  it('should filter by isLocal', () => {
    const localOnly = defaults.filterAvatarPresets({ isLocal: true })

    expect(localOnly.every((p) => p.isLocal === true)).toBe(true)
  })

  it('should combine multiple filters', () => {
    const result = defaults.filterAvatarPresets({
      gender: 'M',
      outfit: 'Casual',
    })

    expect(result.every((p) => p.gender === 'M' && p.outfit === 'Casual')).toBe(true)
  })
})

describe('filterAllAvatarPresets', () => {
  it('should filter provided presets', () => {
    const presets = defaults.LOCAL_AVATAR_PRESETS
    const result = defaults.filterAllAvatarPresets(presets, { gender: 'F' })

    expect(result.every((p) => p.gender === 'F')).toBe(true)
    expect(result.length).toBeLessThan(presets.length)
  })

  it('should support legacy ethnicity filter', () => {
    const presets = defaults.LOCAL_AVATAR_PRESETS
    const result = defaults.filterAllAvatarPresets(presets, { ethnicity: 'Asian' })

    // Should match Style B (Asian maps to Style B)
    expect(result.every((p) => p.style === 'Style B')).toBe(true)
  })
})

describe('getStylesFromPresets', () => {
  it('should return unique styles', () => {
    const styles = defaults.getStylesFromPresets(defaults.LOCAL_AVATAR_PRESETS)

    expect(styles.length).toBeGreaterThan(0)
    expect(new Set(styles).size).toBe(styles.length)
  })
})

describe('getEthnicitiesFromPresets', () => {
  it('should return unique ethnicities', () => {
    const ethnicities = defaults.getEthnicitiesFromPresets(defaults.LOCAL_AVATAR_PRESETS)

    expect(ethnicities.length).toBeGreaterThan(0)
    expect(new Set(ethnicities).size).toBe(ethnicities.length)
  })
})

describe('getOutfitsFromPresets', () => {
  it('should return unique outfits', () => {
    const outfits = defaults.getOutfitsFromPresets(defaults.LOCAL_AVATAR_PRESETS)

    expect(outfits).toContain('Casual')
  })
})

describe('getAvailableStyles', () => {
  it('should return styles from loaded presets', () => {
    const styles = defaults.getAvailableStyles()

    expect(styles.length).toBeGreaterThan(0)
  })
})

describe('getAvailableEthnicities', () => {
  it('should return ethnicities from loaded presets', () => {
    const ethnicities = defaults.getAvailableEthnicities()

    expect(ethnicities).toContain('Asian')
  })
})

describe('getAvailableOutfits', () => {
  it('should return outfits from loaded presets', () => {
    const outfits = defaults.getAvailableOutfits()

    expect(outfits).toContain('Casual')
  })
})

describe('getAvatarUrl', () => {
  it('should return local path for local avatar', () => {
    const url = defaults.getAvatarUrl('avatar_asian_m')

    expect(url).toBe('models/bodies/avatar_asian_m.glb')
  })

  it('should return CDN path for unknown avatar', () => {
    const url = defaults.getAvatarUrl('unknown_avatar')

    expect(url).toContain(defaults.AVATAR_CDN.baseUrl)
    expect(url).toContain('unknown_avatar.glb')
  })
})

describe('getAvatarThumbnailUrl', () => {
  it('should return undefined for local avatar without thumbnail', () => {
    // Local avatars don't have thumbnailUrl by default
    const url = defaults.getAvatarThumbnailUrl('avatar_asian_m')

    expect(url).toBeUndefined()
  })

  it('should return undefined for unknown avatar', () => {
    const url = defaults.getAvatarThumbnailUrl('unknown_avatar')

    expect(url).toBeUndefined()
  })
})

describe('areCdnAvatarsLoaded', () => {
  it('should return false before CDN fetch', () => {
    // Fresh module, no CDN fetch yet
    expect(defaults.areCdnAvatarsLoaded()).toBe(false)
  })
})

describe('getCdnAvatarCount', () => {
  it('should return 0 before CDN fetch', () => {
    expect(defaults.getCdnAvatarCount()).toBe(0)
  })
})

describe('DEFAULT_AVATAR_CONFIG', () => {
  it('should have all required fields', () => {
    expect(defaults.DEFAULT_AVATAR_CONFIG.avatarId).toBe('avatar_asian_m')
    expect(defaults.DEFAULT_AVATAR_CONFIG.style).toBe('Style B')
    expect(defaults.DEFAULT_AVATAR_CONFIG.ethnicity).toBe('Asian')
    expect(defaults.DEFAULT_AVATAR_CONFIG.gender).toBe('M')
    expect(defaults.DEFAULT_AVATAR_CONFIG.outfit).toBe('Casual')
  })
})

describe('AVATAR_CDN', () => {
  it('should have valid URLs', () => {
    expect(defaults.AVATAR_CDN.baseUrl).toContain('cdn.jsdelivr.net')
    expect(defaults.AVATAR_CDN.manifestUrl).toContain('avatars.json')
    expect(defaults.AVATAR_CDN.imagesUrl).toContain('images/')
  })
})

describe('fetchCdnAvatars', () => {
  it('should fetch and parse CDN manifest', async () => {
    const mockManifest = [
      {
        text: 'Asian Male 1',
        image: 'Asian_M_1.png',
        model: 'avatars/Asian_M_1.glb',
        ethnicity: 'Asian',
        gender: 'M',
        num: 1,
        outfit: 'Casual',
      },
    ]

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockManifest),
    })

    const avatars = await defaults.fetchCdnAvatars()

    expect(mockFetch).toHaveBeenCalledWith(
      defaults.AVATAR_CDN.manifestUrl,
      expect.objectContaining({
        headers: { Accept: 'application/json' },
      })
    )
    expect(avatars.length).toBeGreaterThan(0)
  })

  it('should return empty array on fetch error', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'))

    const avatars = await defaults.fetchCdnAvatars()

    expect(avatars).toEqual([])
  })

  it('should return empty array on non-ok response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
    })

    const avatars = await defaults.fetchCdnAvatars()

    expect(avatars).toEqual([])
  })

  it('should skip invalid manifest entries', async () => {
    const mockManifest = [
      { text: 'Invalid', image: 'test.png' }, // Missing required fields
      {
        text: 'Valid',
        image: 'test.png',
        model: 'avatars/test.glb',
        ethnicity: 'Asian',
        gender: 'M',
        num: 1,
        outfit: 'Casual',
      },
    ]

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockManifest),
    })

    const avatars = await defaults.fetchCdnAvatars()

    expect(avatars.length).toBe(1)
  })

  it('should include X_ prefixed ethnicities but set ethnicity to undefined', async () => {
    const mockManifest = [
      {
        text: 'Excluded',
        image: 'test.png',
        model: 'avatars/test.glb',
        ethnicity: 'X_Test',
        gender: 'M',
        num: 1,
        outfit: 'Casual',
      },
    ]

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockManifest),
    })

    const avatars = await defaults.fetchCdnAvatars()

    // X_ prefixed avatars are included but with ethnicity set to undefined
    expect(avatars.length).toBe(1)
    expect(avatars[0].ethnicity).toBeUndefined()
  })
})

describe('prefetchCdnAvatars', () => {
  it('should not throw on prefetch', () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([]),
    })

    expect(() => defaults.prefetchCdnAvatars()).not.toThrow()
  })

  it('should silently handle errors', () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'))

    expect(() => defaults.prefetchCdnAvatars()).not.toThrow()
  })
})

describe('getAllAvatarPresets', () => {
  it('should fetch CDN avatars and combine with local', async () => {
    const mockManifest = [
      {
        text: 'CDN Avatar',
        image: 'cdn.png',
        model: 'avatars/cdn_avatar.glb',
        ethnicity: 'White',
        gender: 'M',
        num: 1,
        outfit: 'Business',
      },
    ]

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockManifest),
    })

    const presets = await defaults.getAllAvatarPresets()

    // Should include local presets
    expect(presets.some((p) => p.id === 'avatar_asian_m')).toBe(true)
    // Should include CDN preset
    expect(presets.some((p) => p.id === 'avatars_cdn_avatar')).toBe(true)
  })

  it('should deduplicate by ID', async () => {
    // CDN has same ID as local
    const mockManifest = [
      {
        text: 'Duplicate',
        image: 'dup.png',
        model: 'avatar_asian_m.glb', // Same as local
        ethnicity: 'Asian',
        gender: 'M',
        num: 1,
        outfit: 'Casual',
      },
    ]

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockManifest),
    })

    const presets = await defaults.getAllAvatarPresets()

    // Count occurrences of the ID
    const count = presets.filter((p) => p.id === 'avatar_asian_m').length
    expect(count).toBe(1)
  })
})

describe('getAvatarsByPage', () => {
  it('should return avatars for requested page', () => {
    const page0 = defaults.getAvatarsByPage(0, 3)
    const page1 = defaults.getAvatarsByPage(1, 3)

    expect(page0.length).toBeLessThanOrEqual(3)
    expect(page1.length).toBeLessThanOrEqual(3)
    // Different pages should have different results (if enough data)
    if (page0.length === 3 && page1.length > 0) {
      expect(page0[0].id).not.toBe(page1[0].id)
    }
  })

  it('should apply filters', () => {
    const result = defaults.getAvatarsByPage(0, 10, { gender: 'M' })

    expect(result.every((p) => p.gender === 'M')).toBe(true)
  })

  it('should return empty array for out of range page', () => {
    const result = defaults.getAvatarsByPage(1000, 10)

    expect(result).toHaveLength(0)
  })
})

describe('getFilteredAvatarCount', () => {
  it('should return total count without filters', () => {
    const count = defaults.getFilteredAvatarCount()

    expect(count).toBeGreaterThanOrEqual(6) // At least local presets
  })

  it('should return filtered count with gender filter', () => {
    const maleCount = defaults.getFilteredAvatarCount({ gender: 'M' })
    const femaleCount = defaults.getFilteredAvatarCount({ gender: 'F' })
    const totalCount = defaults.getFilteredAvatarCount()

    expect(maleCount + femaleCount).toBe(totalCount)
    expect(maleCount).toBeGreaterThan(0)
    expect(femaleCount).toBeGreaterThan(0)
  })

  it('should return filtered count with style filter', () => {
    const count = defaults.getFilteredAvatarCount({ style: 'Style B' })

    expect(count).toBeGreaterThan(0)
    expect(count).toBeLessThanOrEqual(defaults.getFilteredAvatarCount())
  })
})

describe('getGenderCounts', () => {
  it('should return correct gender counts', () => {
    const counts = defaults.getGenderCounts()

    expect(counts.male).toBeGreaterThan(0)
    expect(counts.female).toBeGreaterThan(0)
    expect(counts.total).toBe(counts.male + counts.female)
  })

  it('should apply non-gender filters', () => {
    const allCounts = defaults.getGenderCounts()
    const styleBCounts = defaults.getGenderCounts({ style: 'Style B' })

    // Style B filter should reduce total or stay same
    expect(styleBCounts.total).toBeLessThanOrEqual(allCounts.total)
  })

  it('should apply outfit filter', () => {
    const casualCounts = defaults.getGenderCounts({ outfit: 'Casual' })

    expect(casualCounts.male + casualCounts.female).toBe(casualCounts.total)
  })
})

describe('hasMorePages', () => {
  it('should return true when more pages available', () => {
    const totalCount = defaults.getFilteredAvatarCount()
    if (totalCount > 2) {
      const hasMore = defaults.hasMorePages(0, 2)
      expect(hasMore).toBe(true)
    }
  })

  it('should return false when on last page', () => {
    const totalCount = defaults.getFilteredAvatarCount()
    const pageSize = totalCount // Load all in one page
    const hasMore = defaults.hasMorePages(0, pageSize)

    expect(hasMore).toBe(false)
  })

  it('should apply filters when checking', () => {
    const maleCount = defaults.getFilteredAvatarCount({ gender: 'M' })
    if (maleCount > 1) {
      const hasMore = defaults.hasMorePages(0, 1, { gender: 'M' })
      expect(hasMore).toBe(true)
    }
  })
})

describe('getFullAvatarUrl', () => {
  it('should return local path for local avatar', () => {
    const url = defaults.getFullAvatarUrl('avatar_asian_m')

    expect(url).toBe('models/bodies/avatar_asian_m.glb')
  })

  it('should accept preset object', () => {
    const preset = defaults.getAvatarPreset('avatar_asian_m')
    if (preset) {
      const url = defaults.getFullAvatarUrl(preset)
      expect(url).toBe('models/bodies/avatar_asian_m.glb')
    }
  })

  it('should return fallback URL for unknown avatar', () => {
    const url = defaults.getFullAvatarUrl('unknown_avatar_xyz')

    expect(url).toContain('avatars/unknown_avatar_xyz')
  })

  it('should use sourceBaseUrl when preset has it', () => {
    const presetWithSource: AvatarPreset = {
      id: 'test_cdn_avatar',
      name: 'Test CDN Avatar',
      file: 'test.glb',
      style: 'Style B',
      gender: 'M',
      outfit: 'Casual',
      isLocal: false,
      sourceBaseUrl: 'https://cdn.example.com/avatars',
    }

    const url = defaults.getFullAvatarUrl(presetWithSource)
    expect(url).toBe('https://cdn.example.com/avatars/test.glb')
  })

  it('should handle sourceBaseUrl with trailing slash', () => {
    const presetWithSlash: AvatarPreset = {
      id: 'test_avatar_slash',
      name: 'Test Slash',
      file: 'test.glb',
      style: 'Style B',
      gender: 'F',
      outfit: 'Business',
      isLocal: false,
      sourceBaseUrl: 'https://cdn.example.com/avatars/',
    }

    const url = defaults.getFullAvatarUrl(presetWithSlash)
    expect(url).toBe('https://cdn.example.com/avatars/test.glb')
  })

  it('should use AVATAR_CDN fallback for non-local preset without sourceBaseUrl', () => {
    const presetNoSource: AvatarPreset = {
      id: 'test_no_source',
      name: 'No Source',
      file: 'nosource.glb',
      style: 'Style C',
      gender: 'M',
      outfit: 'Casual',
      isLocal: false,
    }

    const url = defaults.getFullAvatarUrl(presetNoSource)
    expect(url).toContain(defaults.AVATAR_CDN.baseUrl)
    expect(url).toContain('nosource.glb')
  })
})
