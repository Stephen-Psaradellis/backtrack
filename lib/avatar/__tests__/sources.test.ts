/**
 * Tests for lib/avatar/sources.ts
 *
 * Tests avatar sources registry and manifest parsing utilities.
 */

import { describe, it, expect } from 'vitest'
import {
  AVATAR_SOURCES,
  getEnabledSources,
  getSourceById,
  getPrimarySource,
  isSourceEnabled,
  getAvatarUrlForSource,
  getThumbnailUrlForSource,
  normalizeValidEntry,
  normalizePolygonalMindEntry,
  type ValidManifestEntry,
  type PolygonalMindManifestEntry,
} from '../sources'
import type { AvatarSource } from '../../../components/avatar/types'

describe('sources', () => {
  describe('AVATAR_SOURCES', () => {
    it('should be an array', () => {
      expect(Array.isArray(AVATAR_SOURCES)).toBe(true)
    })

    it('should have at least one source', () => {
      expect(AVATAR_SOURCES.length).toBeGreaterThan(0)
    })

    it('should have valid source objects', () => {
      for (const source of AVATAR_SOURCES) {
        expect(source.id).toBeDefined()
        expect(typeof source.id).toBe('string')
        expect(source.name).toBeDefined()
        expect(typeof source.name).toBe('string')
        expect(source.cdnBaseUrl).toBeDefined()
        expect(typeof source.cdnBaseUrl).toBe('string')
        expect(source.manifestUrl).toBeDefined()
        expect(typeof source.manifestUrl).toBe('string')
        expect(typeof source.priority).toBe('number')
        expect(typeof source.enabled).toBe('boolean')
        expect(source.license).toBeDefined()
      }
    })

    it('should include the VALID Project source', () => {
      const validSource = AVATAR_SOURCES.find(s => s.id === 'valid')
      expect(validSource).toBeDefined()
      expect(validSource?.name).toBe('VALID Project')
      expect(validSource?.enabled).toBe(true)
      expect(validSource?.license).toBe('CC0')
    })
  })

  describe('getEnabledSources', () => {
    it('should return only enabled sources', () => {
      const enabled = getEnabledSources()
      for (const source of enabled) {
        expect(source.enabled).toBe(true)
      }
    })

    it('should return sources sorted by priority', () => {
      const enabled = getEnabledSources()
      for (let i = 1; i < enabled.length; i++) {
        expect(enabled[i].priority).toBeGreaterThanOrEqual(enabled[i - 1].priority)
      }
    })

    it('should include the valid source when enabled', () => {
      const enabled = getEnabledSources()
      const validSource = enabled.find(s => s.id === 'valid')
      expect(validSource).toBeDefined()
    })
  })

  describe('getSourceById', () => {
    it('should return a source by its ID', () => {
      const source = getSourceById('valid')
      expect(source).toBeDefined()
      expect(source?.id).toBe('valid')
    })

    it('should return undefined for unknown ID', () => {
      const source = getSourceById('unknown-source')
      expect(source).toBeUndefined()
    })

    it('should return undefined for empty string', () => {
      const source = getSourceById('')
      expect(source).toBeUndefined()
    })
  })

  describe('getPrimarySource', () => {
    it('should return the highest priority enabled source', () => {
      const primary = getPrimarySource()
      expect(primary).toBeDefined()
      expect(primary.enabled).toBe(true)
    })

    it('should return VALID source as primary', () => {
      const primary = getPrimarySource()
      expect(primary.id).toBe('valid')
    })
  })

  describe('isSourceEnabled', () => {
    it('should return true for enabled source', () => {
      expect(isSourceEnabled('valid')).toBe(true)
    })

    it('should return false for unknown source', () => {
      expect(isSourceEnabled('unknown-source')).toBe(false)
    })

    it('should return false for empty string', () => {
      expect(isSourceEnabled('')).toBe(false)
    })
  })

  describe('getAvatarUrlForSource', () => {
    const mockSource: AvatarSource = {
      id: 'test',
      name: 'Test Source',
      cdnBaseUrl: 'https://cdn.example.com/avatars',
      manifestUrl: 'https://cdn.example.com/avatars/manifest.json',
      priority: 1,
      enabled: true,
      license: 'CC0',
    }

    it('should build correct URL without trailing slash on base', () => {
      const url = getAvatarUrlForSource(mockSource, 'models/avatar.glb')
      expect(url).toBe('https://cdn.example.com/avatars/models/avatar.glb')
    })

    it('should handle base URL with trailing slash', () => {
      const sourceWithSlash = { ...mockSource, cdnBaseUrl: 'https://cdn.example.com/avatars/' }
      const url = getAvatarUrlForSource(sourceWithSlash, 'models/avatar.glb')
      expect(url).toBe('https://cdn.example.com/avatars/models/avatar.glb')
    })

    it('should handle file path with leading slash', () => {
      const url = getAvatarUrlForSource(mockSource, '/models/avatar.glb')
      expect(url).toBe('https://cdn.example.com/avatars/models/avatar.glb')
    })

    it('should handle both trailing and leading slashes', () => {
      const sourceWithSlash = { ...mockSource, cdnBaseUrl: 'https://cdn.example.com/avatars/' }
      const url = getAvatarUrlForSource(sourceWithSlash, '/models/avatar.glb')
      expect(url).toBe('https://cdn.example.com/avatars/models/avatar.glb')
    })
  })

  describe('getThumbnailUrlForSource', () => {
    const mockSource: AvatarSource = {
      id: 'test',
      name: 'Test Source',
      cdnBaseUrl: 'https://cdn.example.com/avatars',
      manifestUrl: 'https://cdn.example.com/avatars/manifest.json',
      thumbnailBaseUrl: 'https://cdn.example.com/avatars/images',
      priority: 1,
      enabled: true,
      license: 'CC0',
    }

    it('should build correct thumbnail URL', () => {
      const url = getThumbnailUrlForSource(mockSource, 'avatar1.png')
      expect(url).toBe('https://cdn.example.com/avatars/images/avatar1.png')
    })

    it('should handle thumbnail base URL with trailing slash', () => {
      const sourceWithSlash = { ...mockSource, thumbnailBaseUrl: 'https://cdn.example.com/avatars/images/' }
      const url = getThumbnailUrlForSource(sourceWithSlash, 'avatar1.png')
      expect(url).toBe('https://cdn.example.com/avatars/images/avatar1.png')
    })

    it('should handle image path with leading slash', () => {
      const url = getThumbnailUrlForSource(mockSource, '/avatar1.png')
      expect(url).toBe('https://cdn.example.com/avatars/images/avatar1.png')
    })

    it('should return undefined if no thumbnailBaseUrl', () => {
      const sourceNoThumbnail = { ...mockSource, thumbnailBaseUrl: undefined }
      const url = getThumbnailUrlForSource(sourceNoThumbnail, 'avatar1.png')
      expect(url).toBeUndefined()
    })
  })

  describe('normalizeValidEntry', () => {
    const mockSource: AvatarSource = {
      id: 'valid',
      name: 'VALID Project',
      cdnBaseUrl: 'https://cdn.example.com/',
      manifestUrl: 'https://cdn.example.com/manifest.json',
      priority: 1,
      enabled: true,
      license: 'CC0',
    }

    it('should normalize a basic Asian entry', () => {
      const entry: ValidManifestEntry = {
        text: 'Asian Male 1 Casual',
        image: 'images/asian_m_1_casual.png',
        model: 'models/asian_m_1_casual.glb',
        ethnicity: 'Asian',
        gender: 'M',
        num: 1,
        outfit: 'Casual',
      }

      const normalized = normalizeValidEntry(entry, mockSource)

      expect(normalized.id).toBe('models_asian_m_1_casual')
      expect(normalized.name).toBe('Style B Male 1 Casual')
      expect(normalized.modelPath).toBe('models/asian_m_1_casual.glb')
      expect(normalized.thumbnailPath).toBe('images/asian_m_1_casual.png')
      expect(normalized.gender).toBe('M')
      expect(normalized.style).toBe('Style B')
      expect(normalized.outfit).toBe('Casual')
      expect(normalized.source).toBe('valid')
    })

    it('should normalize a Black female entry', () => {
      const entry: ValidManifestEntry = {
        text: 'Black Female 2 Business',
        image: 'images/black_f_2_busi.png',
        model: 'models/black_f_2_busi.glb',
        ethnicity: 'Black',
        gender: 'F',
        num: 2,
        outfit: 'Busi',
      }

      const normalized = normalizeValidEntry(entry, mockSource)

      expect(normalized.gender).toBe('F')
      expect(normalized.style).toBe('Style C')
      expect(normalized.outfit).toBe('Business')
      expect(normalized.name).toBe('Style C Female 2 Business')
    })

    it('should handle AIAN ethnicity', () => {
      const entry: ValidManifestEntry = {
        text: 'AIAN Male',
        image: 'aian.png',
        model: 'aian.glb',
        ethnicity: 'AIAN',
        gender: 'M',
        num: 1,
        outfit: 'Casual',
      }

      const normalized = normalizeValidEntry(entry, mockSource)
      expect(normalized.style).toBe('Style A')
    })

    it('should handle Hispanic ethnicity', () => {
      const entry: ValidManifestEntry = {
        text: 'Hispanic Female',
        image: 'hispanic.png',
        model: 'hispanic.glb',
        ethnicity: 'Hispanic',
        gender: 'F',
        num: 1,
        outfit: 'Casual',
      }

      const normalized = normalizeValidEntry(entry, mockSource)
      expect(normalized.style).toBe('Style D')
    })

    it('should handle MENA ethnicity', () => {
      const entry: ValidManifestEntry = {
        text: 'MENA Male',
        image: 'mena.png',
        model: 'mena.glb',
        ethnicity: 'MENA',
        gender: 'M',
        num: 1,
        outfit: 'Casual',
      }

      const normalized = normalizeValidEntry(entry, mockSource)
      expect(normalized.style).toBe('Style E')
    })

    it('should handle NHPI ethnicity', () => {
      const entry: ValidManifestEntry = {
        text: 'NHPI Female',
        image: 'nhpi.png',
        model: 'nhpi.glb',
        ethnicity: 'NHPI',
        gender: 'F',
        num: 1,
        outfit: 'Casual',
      }

      const normalized = normalizeValidEntry(entry, mockSource)
      expect(normalized.style).toBe('Style F')
    })

    it('should handle White ethnicity', () => {
      const entry: ValidManifestEntry = {
        text: 'White Male',
        image: 'white.png',
        model: 'white.glb',
        ethnicity: 'White',
        gender: 'M',
        num: 1,
        outfit: 'Casual',
      }

      const normalized = normalizeValidEntry(entry, mockSource)
      expect(normalized.style).toBe('Style G')
    })

    it('should handle X_ prefixed ethnicities', () => {
      const entry: ValidManifestEntry = {
        text: 'X_AIAN Male',
        image: 'x_aian.png',
        model: 'x_aian.glb',
        ethnicity: 'X_AIAN',
        gender: 'M',
        num: 1,
        outfit: 'Casual',
      }

      const normalized = normalizeValidEntry(entry, mockSource)
      expect(normalized.style).toBe('Style A')
    })

    it('should handle X_MENA prefixed ethnicity', () => {
      const entry: ValidManifestEntry = {
        text: 'X_MENA Female',
        image: 'x_mena.png',
        model: 'x_mena.glb',
        ethnicity: 'X_MENA',
        gender: 'F',
        num: 1,
        outfit: 'Casual',
      }

      const normalized = normalizeValidEntry(entry, mockSource)
      expect(normalized.style).toBe('Style E')
    })

    it('should handle X_NHPI prefixed ethnicity', () => {
      const entry: ValidManifestEntry = {
        text: 'X_NHPI Male',
        image: 'x_nhpi.png',
        model: 'x_nhpi.glb',
        ethnicity: 'X_NHPI',
        gender: 'M',
        num: 1,
        outfit: 'Casual',
      }

      const normalized = normalizeValidEntry(entry, mockSource)
      expect(normalized.style).toBe('Style F')
    })

    it('should default to Style B for unknown ethnicity', () => {
      const entry: ValidManifestEntry = {
        text: 'Unknown',
        image: 'unknown.png',
        model: 'unknown.glb',
        ethnicity: 'Unknown',
        gender: 'M',
        num: 1,
        outfit: 'Casual',
      }

      const normalized = normalizeValidEntry(entry, mockSource)
      expect(normalized.style).toBe('Style B')
    })

    it('should handle Medical outfit', () => {
      const entry: ValidManifestEntry = {
        text: 'Medical',
        image: 'med.png',
        model: 'med.glb',
        ethnicity: 'Asian',
        gender: 'F',
        num: 1,
        outfit: 'Medi',
      }

      const normalized = normalizeValidEntry(entry, mockSource)
      expect(normalized.outfit).toBe('Medical')
    })

    it('should handle Military outfit', () => {
      const entry: ValidManifestEntry = {
        text: 'Military',
        image: 'mil.png',
        model: 'mil.glb',
        ethnicity: 'Asian',
        gender: 'M',
        num: 1,
        outfit: 'Milit',
      }

      const normalized = normalizeValidEntry(entry, mockSource)
      expect(normalized.outfit).toBe('Military')
    })

    it('should handle Utility outfit', () => {
      const entry: ValidManifestEntry = {
        text: 'Utility',
        image: 'util.png',
        model: 'util.glb',
        ethnicity: 'Black',
        gender: 'M',
        num: 1,
        outfit: 'Util',
      }

      const normalized = normalizeValidEntry(entry, mockSource)
      expect(normalized.outfit).toBe('Utility')
    })

    it('should default to Casual for unknown outfit', () => {
      const entry: ValidManifestEntry = {
        text: 'Unknown outfit',
        image: 'unknown.png',
        model: 'unknown.glb',
        ethnicity: 'Asian',
        gender: 'M',
        num: 1,
        outfit: 'Unknown',
      }

      const normalized = normalizeValidEntry(entry, mockSource)
      expect(normalized.outfit).toBe('Casual')
    })

    it('should remove slashes from model path in ID', () => {
      const entry: ValidManifestEntry = {
        text: 'Test',
        image: 'test.png',
        model: 'models/subfolder/avatar.glb',
        ethnicity: 'Asian',
        gender: 'M',
        num: 1,
        outfit: 'Casual',
      }

      const normalized = normalizeValidEntry(entry, mockSource)
      expect(normalized.id).toBe('models_subfolder_avatar')
      expect(normalized.id).not.toContain('/')
    })
  })

  describe('normalizePolygonalMindEntry', () => {
    const mockSource: AvatarSource = {
      id: 'polygonal-mind',
      name: 'Polygonal Mind',
      cdnBaseUrl: 'https://cdn.example.com/pm',
      manifestUrl: 'https://cdn.example.com/pm/manifest.json',
      priority: 2,
      enabled: true,
      license: 'CC0',
    }

    it('should normalize a basic entry with gender', () => {
      const entry: PolygonalMindManifestEntry = {
        id: 'avatar_001',
        name: 'Warrior Knight',
        model: 'models/warrior.glb',
        thumbnail: 'thumbnails/warrior.png',
        gender: 'M',
        style: 'Fantasy',
      }

      const normalized = normalizePolygonalMindEntry(entry, mockSource)

      expect(normalized.id).toBe('pm_avatar_001')
      expect(normalized.name).toBe('Warrior Knight')
      expect(normalized.modelPath).toBe('models/warrior.glb')
      expect(normalized.thumbnailPath).toBe('thumbnails/warrior.png')
      expect(normalized.gender).toBe('M')
      expect(normalized.style).toBe('Fantasy')
      expect(normalized.outfit).toBe('Casual')
      expect(normalized.source).toBe('polygonal-mind')
    })

    it('should normalize a female entry', () => {
      const entry: PolygonalMindManifestEntry = {
        id: 'avatar_002',
        name: 'Space Captain',
        model: 'models/captain.glb',
        gender: 'F',
      }

      const normalized = normalizePolygonalMindEntry(entry, mockSource)
      expect(normalized.gender).toBe('F')
    })

    it('should infer female gender from name containing "female"', () => {
      const entry: PolygonalMindManifestEntry = {
        id: 'avatar_003',
        name: 'Female Warrior',
        model: 'models/warrior_f.glb',
      }

      const normalized = normalizePolygonalMindEntry(entry, mockSource)
      expect(normalized.gender).toBe('F')
    })

    it('should infer female gender from name containing "woman"', () => {
      const entry: PolygonalMindManifestEntry = {
        id: 'avatar_004',
        name: 'Business Woman',
        model: 'models/business_w.glb',
      }

      const normalized = normalizePolygonalMindEntry(entry, mockSource)
      expect(normalized.gender).toBe('F')
    })

    it('should infer female gender from name containing "girl"', () => {
      const entry: PolygonalMindManifestEntry = {
        id: 'avatar_005',
        name: 'School Girl',
        model: 'models/school_g.glb',
      }

      const normalized = normalizePolygonalMindEntry(entry, mockSource)
      expect(normalized.gender).toBe('F')
    })

    it('should infer female gender from name containing "lady"', () => {
      const entry: PolygonalMindManifestEntry = {
        id: 'avatar_006',
        name: 'Lady Knight',
        model: 'models/lady_k.glb',
      }

      const normalized = normalizePolygonalMindEntry(entry, mockSource)
      expect(normalized.gender).toBe('F')
    })

    it('should default to male for neutral names', () => {
      const entry: PolygonalMindManifestEntry = {
        id: 'avatar_007',
        name: 'Warrior',
        model: 'models/warrior.glb',
      }

      const normalized = normalizePolygonalMindEntry(entry, mockSource)
      expect(normalized.gender).toBe('M')
    })

    it('should default to Style B when no style provided', () => {
      const entry: PolygonalMindManifestEntry = {
        id: 'avatar_008',
        name: 'Generic Avatar',
        model: 'models/generic.glb',
      }

      const normalized = normalizePolygonalMindEntry(entry, mockSource)
      expect(normalized.style).toBe('Style B')
    })

    it('should handle entry without thumbnail', () => {
      const entry: PolygonalMindManifestEntry = {
        id: 'avatar_009',
        name: 'No Thumbnail',
        model: 'models/no_thumb.glb',
      }

      const normalized = normalizePolygonalMindEntry(entry, mockSource)
      expect(normalized.thumbnailPath).toBeUndefined()
    })

    it('should prefix ID with pm_', () => {
      const entry: PolygonalMindManifestEntry = {
        id: 'test123',
        name: 'Test',
        model: 'test.glb',
      }

      const normalized = normalizePolygonalMindEntry(entry, mockSource)
      expect(normalized.id).toBe('pm_test123')
    })

    it('should use provided style', () => {
      const entry: PolygonalMindManifestEntry = {
        id: 'avatar_010',
        name: 'SciFi Character',
        model: 'models/scifi.glb',
        style: 'Style A',
      }

      const normalized = normalizePolygonalMindEntry(entry, mockSource)
      expect(normalized.style).toBe('Style A')
    })
  })
})
