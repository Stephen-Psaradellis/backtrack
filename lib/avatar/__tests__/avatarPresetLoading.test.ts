/**
 * Avatar Preset Loading Tests
 *
 * Comprehensive tests to ensure all avatar presets load correctly
 * and within reasonable time constraints.
 *
 * Tests cover:
 * - All LOCAL_AVATAR_PRESETS are valid and loadable
 * - CDN avatar manifest fetch works within time limits
 * - All preset properties are valid and complete
 * - URL resolution works for all avatar types
 * - GLB files exist for local avatars
 */

import { describe, it, expect, vi, beforeEach, afterEach, beforeAll } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import type { AvatarPreset, AvatarStyle, AvatarGender, AvatarOutfit } from '../../../components/avatar/types';

// =============================================================================
// TIME LIMITS
// =============================================================================

/** Maximum time (ms) for CDN manifest fetch */
const CDN_MANIFEST_FETCH_TIMEOUT = 10000;

/** Maximum time (ms) for individual avatar URL resolution */
const URL_RESOLUTION_TIMEOUT = 100;

/** Maximum time (ms) for all local presets validation */
const LOCAL_PRESETS_VALIDATION_TIMEOUT = 1000;

// =============================================================================
// VALID VALUES
// =============================================================================

const VALID_STYLES: AvatarStyle[] = [
  'Style A',
  'Style B',
  'Style C',
  'Style D',
  'Style E',
  'Style F',
  'Style G',
];

const VALID_GENDERS: AvatarGender[] = ['M', 'F'];

const VALID_OUTFITS: AvatarOutfit[] = [
  'Casual',
  'Business',
  'Medical',
  'Military',
  'Utility',
  'Fantasy',
  'SciFi',
  'Sports',
  'Formal',
  'Unknown',
];

// =============================================================================
// MOCK SETUP
// =============================================================================

const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock Image for React Native
vi.mock('react-native', () => ({
  Image: {
    prefetch: vi.fn().mockResolvedValue(undefined),
  },
}));

let defaults: typeof import('../defaults');

beforeEach(async () => {
  vi.resetModules();
  mockFetch.mockReset();
  defaults = await import('../defaults');
});

// =============================================================================
// LOCAL AVATAR PRESETS TESTS
// =============================================================================

describe('LOCAL_AVATAR_PRESETS Validation', () => {
  it('should have exactly 6 local presets', () => {
    expect(defaults.LOCAL_AVATAR_PRESETS).toHaveLength(6);
  });

  it('should validate all local presets within time limit', async () => {
    const startTime = performance.now();

    for (const preset of defaults.LOCAL_AVATAR_PRESETS) {
      // Validate required fields exist
      expect(preset.id).toBeDefined();
      expect(preset.name).toBeDefined();
      expect(preset.file).toBeDefined();
      expect(preset.style).toBeDefined();
      expect(preset.gender).toBeDefined();
      expect(preset.outfit).toBeDefined();
      expect(preset.isLocal).toBe(true);

      // Validate field types
      expect(typeof preset.id).toBe('string');
      expect(typeof preset.name).toBe('string');
      expect(typeof preset.file).toBe('string');
    }

    const duration = performance.now() - startTime;
    expect(duration).toBeLessThan(LOCAL_PRESETS_VALIDATION_TIMEOUT);
  });

  describe.each([
    ['avatar_asian_m', 'Style B', 'M', 'Casual'],
    ['avatar_asian_f', 'Style B', 'F', 'Casual'],
    ['avatar_black_m', 'Style C', 'M', 'Casual'],
    ['avatar_white_f', 'Style G', 'F', 'Casual'],
    ['avatar_hispanic_m', 'Style D', 'M', 'Casual'],
    ['avatar_mena_f', 'Style E', 'F', 'Casual'],
  ])('Preset: %s', (id, expectedStyle, expectedGender, expectedOutfit) => {
    it('should exist and have correct properties', () => {
      const preset = defaults.LOCAL_AVATAR_PRESETS.find(p => p.id === id);

      expect(preset).toBeDefined();
      expect(preset!.id).toBe(id);
      expect(preset!.style).toBe(expectedStyle);
      expect(preset!.gender).toBe(expectedGender);
      expect(preset!.outfit).toBe(expectedOutfit);
      expect(preset!.isLocal).toBe(true);
    });

    it('should have valid file name ending with .glb', () => {
      const preset = defaults.LOCAL_AVATAR_PRESETS.find(p => p.id === id);

      expect(preset!.file).toMatch(/\.glb$/);
      expect(preset!.file).toBe(`${id}.glb`);
    });

    it('should have sizeKB defined and reasonable', () => {
      const preset = defaults.LOCAL_AVATAR_PRESETS.find(p => p.id === id);

      expect(preset!.sizeKB).toBeDefined();
      expect(preset!.sizeKB).toBeGreaterThan(0);
      expect(preset!.sizeKB).toBeLessThan(10000); // Max 10MB
    });

    it('should resolve URL correctly and quickly', () => {
      const startTime = performance.now();
      const url = defaults.getAvatarUrl(id);
      const duration = performance.now() - startTime;

      expect(url).toBeDefined();
      expect(url).toContain(id);
      expect(duration).toBeLessThan(URL_RESOLUTION_TIMEOUT);
    });

    it('should be retrievable via getAvatarPreset', () => {
      const startTime = performance.now();
      const preset = defaults.getAvatarPreset(id);
      const duration = performance.now() - startTime;

      expect(preset).toBeDefined();
      expect(preset!.id).toBe(id);
      expect(duration).toBeLessThan(URL_RESOLUTION_TIMEOUT);
    });
  });

  it('should have no duplicate IDs', () => {
    const ids = defaults.LOCAL_AVATAR_PRESETS.map(p => p.id);
    const uniqueIds = new Set(ids);

    expect(uniqueIds.size).toBe(ids.length);
  });

  it('should have valid style values for all presets', () => {
    for (const preset of defaults.LOCAL_AVATAR_PRESETS) {
      expect(VALID_STYLES).toContain(preset.style);
    }
  });

  it('should have valid gender values for all presets', () => {
    for (const preset of defaults.LOCAL_AVATAR_PRESETS) {
      expect(VALID_GENDERS).toContain(preset.gender);
    }
  });

  it('should have valid outfit values for all presets', () => {
    for (const preset of defaults.LOCAL_AVATAR_PRESETS) {
      expect(VALID_OUTFITS).toContain(preset.outfit);
    }
  });

  it('should have gender balance (at least 2 of each)', () => {
    const males = defaults.LOCAL_AVATAR_PRESETS.filter(p => p.gender === 'M');
    const females = defaults.LOCAL_AVATAR_PRESETS.filter(p => p.gender === 'F');

    expect(males.length).toBeGreaterThanOrEqual(2);
    expect(females.length).toBeGreaterThanOrEqual(2);
  });

  it('should have style diversity (at least 4 different styles)', () => {
    const styles = new Set(defaults.LOCAL_AVATAR_PRESETS.map(p => p.style));

    expect(styles.size).toBeGreaterThanOrEqual(4);
  });
});

// =============================================================================
// GLB FILE EXISTENCE TESTS
// =============================================================================

describe('LOCAL_AVATAR_PRESETS GLB Files', () => {
  const webglBodiesPath = path.resolve(__dirname, '../../../webgl-avatar/public/models/bodies');

  it.each([
    'avatar_asian_m.glb',
    'avatar_asian_f.glb',
    'avatar_black_m.glb',
    'avatar_white_f.glb',
    'avatar_hispanic_m.glb',
    'avatar_mena_f.glb',
  ])('should have GLB file: %s', (filename) => {
    const filePath = path.join(webglBodiesPath, filename);
    const exists = fs.existsSync(filePath);

    expect(exists).toBe(true);
  });

  it('should have all LOCAL_AVATAR_PRESETS GLB files present', () => {
    const missingFiles: string[] = [];

    for (const preset of defaults.LOCAL_AVATAR_PRESETS) {
      const filePath = path.join(webglBodiesPath, preset.file);
      if (!fs.existsSync(filePath)) {
        missingFiles.push(preset.file);
      }
    }

    expect(missingFiles).toHaveLength(0);
    if (missingFiles.length > 0) {
      console.error('Missing GLB files:', missingFiles);
    }
  });

  it('should have non-empty GLB files', () => {
    for (const preset of defaults.LOCAL_AVATAR_PRESETS) {
      const filePath = path.join(webglBodiesPath, preset.file);
      const stats = fs.statSync(filePath);

      expect(stats.size).toBeGreaterThan(0);
      // GLB files should be at least 10KB
      expect(stats.size).toBeGreaterThan(10 * 1024);
    }
  });

  it('should have GLB files with reasonable sizes matching sizeKB', () => {
    for (const preset of defaults.LOCAL_AVATAR_PRESETS) {
      const filePath = path.join(webglBodiesPath, preset.file);
      const stats = fs.statSync(filePath);
      const actualSizeKB = Math.round(stats.size / 1024);

      // Allow 20% variance from declared size
      const declaredSizeKB = preset.sizeKB || 0;
      const tolerance = declaredSizeKB * 0.2;

      expect(actualSizeKB).toBeGreaterThan(declaredSizeKB - tolerance);
      expect(actualSizeKB).toBeLessThan(declaredSizeKB + tolerance);
    }
  });
});

// =============================================================================
// CDN AVATAR MANIFEST TESTS
// =============================================================================

describe('CDN Avatar Manifest Loading', () => {
  const validManifestEntry = {
    text: 'Asian Male 1',
    image: 'Asian_M_1.png',
    model: 'avatars/Asian/Asian_M_1_Casual.glb',
    ethnicity: 'Asian',
    gender: 'M',
    num: 1,
    outfit: 'Casual',
  };

  it('should fetch CDN manifest within time limit', async () => {
    const mockManifest = [validManifestEntry];

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockManifest),
    });

    const startTime = performance.now();
    const avatars = await defaults.fetchCdnAvatars();
    const duration = performance.now() - startTime;

    expect(duration).toBeLessThan(CDN_MANIFEST_FETCH_TIMEOUT);
    expect(avatars.length).toBeGreaterThan(0);
  });

  it('should parse CDN avatar entries correctly', async () => {
    const mockManifest = [validManifestEntry];

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockManifest),
    });

    const avatars = await defaults.fetchCdnAvatars();

    expect(avatars).toHaveLength(1);
    const avatar = avatars[0];

    expect(avatar.id).toBeDefined();
    expect(avatar.name).toBeDefined();
    expect(avatar.file).toBe(validManifestEntry.model);
    expect(avatar.gender).toBe('M');
    expect(avatar.outfit).toBe('Casual');
    expect(avatar.isLocal).toBe(false);
  });

  it('should validate all parsed CDN avatars have required properties', async () => {
    const mockManifest = [
      validManifestEntry,
      { ...validManifestEntry, model: 'avatars/Black/Black_F_2_Business.glb', ethnicity: 'Black', gender: 'F', num: 2, outfit: 'Busi' },
      { ...validManifestEntry, model: 'avatars/White/White_M_3_Medical.glb', ethnicity: 'White', gender: 'M', num: 3, outfit: 'Medi' },
    ];

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockManifest),
    });

    const avatars = await defaults.fetchCdnAvatars();

    for (const avatar of avatars) {
      // Required properties
      expect(avatar.id).toBeDefined();
      expect(typeof avatar.id).toBe('string');
      expect(avatar.id.length).toBeGreaterThan(0);

      expect(avatar.name).toBeDefined();
      expect(typeof avatar.name).toBe('string');

      expect(avatar.file).toBeDefined();
      expect(avatar.file).toMatch(/\.glb$/);

      expect(avatar.gender).toBeDefined();
      expect(['M', 'F']).toContain(avatar.gender);

      expect(avatar.outfit).toBeDefined();
      expect(VALID_OUTFITS).toContain(avatar.outfit);

      expect(avatar.isLocal).toBe(false);
    }
  });

  it('should skip invalid manifest entries', async () => {
    const mockManifest = [
      { text: 'Invalid - missing required fields' },
      { model: 'avatars/test.glb' }, // missing ethnicity and gender
      validManifestEntry, // valid
    ];

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockManifest),
    });

    const avatars = await defaults.fetchCdnAvatars();

    // Only valid entry should be included
    expect(avatars).toHaveLength(1);
  });

  it('should handle network errors gracefully', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    const avatars = await defaults.fetchCdnAvatars();

    expect(avatars).toEqual([]);
  });

  it('should handle HTTP errors gracefully', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    const avatars = await defaults.fetchCdnAvatars();

    expect(avatars).toEqual([]);
  });

  it('should handle malformed JSON gracefully', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.reject(new Error('Invalid JSON')),
    });

    const avatars = await defaults.fetchCdnAvatars();

    expect(avatars).toEqual([]);
  });

  it('should cache CDN manifest results', async () => {
    const mockManifest = [validManifestEntry];

    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockManifest),
    });

    // First fetch
    const avatars1 = await defaults.fetchCdnAvatars();
    expect(avatars1).toHaveLength(1);

    // Second fetch should use cache
    const avatars2 = await defaults.fetchCdnAvatars();
    expect(avatars2).toHaveLength(1);

    // fetch should only be called once due to caching
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });
});

// =============================================================================
// COMBINED AVATAR LOADING TESTS
// =============================================================================

describe('Combined Avatar Loading (Local + CDN)', () => {
  it('should getAllAvatarPresets return both local and CDN avatars', async () => {
    const mockManifest = [
      {
        text: 'CDN Avatar',
        image: 'cdn.png',
        model: 'avatars/CDN/CDN_M_1.glb',
        ethnicity: 'Asian',
        gender: 'M',
        num: 1,
        outfit: 'Casual',
      },
    ];

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockManifest),
    });

    const allPresets = await defaults.getAllAvatarPresets();

    // Should include local presets
    const localPresets = allPresets.filter(p => p.isLocal);
    expect(localPresets.length).toBe(6);

    // Should include CDN preset
    const cdnPresets = allPresets.filter(p => !p.isLocal);
    expect(cdnPresets.length).toBeGreaterThanOrEqual(1);

    // Total should be local + CDN
    expect(allPresets.length).toBe(localPresets.length + cdnPresets.length);
  });

  it('should deduplicate avatars with same ID', async () => {
    // Mock CDN returning same ID as local
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
    ];

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockManifest),
    });

    const allPresets = await defaults.getAllAvatarPresets();

    // Count occurrences
    const asianMaleCount = allPresets.filter(p => p.id === 'avatar_asian_m').length;
    expect(asianMaleCount).toBe(1);
  });

  it('should prioritize local presets over CDN duplicates', async () => {
    const mockManifest = [
      {
        text: 'CDN Asian Male',
        image: 'cdn.png',
        model: 'avatar_asian_m.glb',
        ethnicity: 'Asian',
        gender: 'M',
        num: 1,
        outfit: 'Business', // Different outfit from local
      },
    ];

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockManifest),
    });

    const allPresets = await defaults.getAllAvatarPresets();
    const asianMale = allPresets.find(p => p.id === 'avatar_asian_m');

    // Should use local version (Casual outfit, not CDN Business)
    expect(asianMale!.isLocal).toBe(true);
    expect(asianMale!.outfit).toBe('Casual');
  });
});

// =============================================================================
// URL RESOLUTION TESTS
// =============================================================================

describe('Avatar URL Resolution', () => {
  describe('Local avatar URLs', () => {
    it.each([
      'avatar_asian_m',
      'avatar_asian_f',
      'avatar_black_m',
      'avatar_white_f',
      'avatar_hispanic_m',
      'avatar_mena_f',
    ])('should resolve URL for %s', (avatarId) => {
      const url = defaults.getAvatarUrl(avatarId);

      expect(url).toBeDefined();
      expect(url).toContain(avatarId);
      expect(url).toContain('.glb');
    });

    it('should return local path format for local avatars', () => {
      const url = defaults.getAvatarUrl('avatar_asian_m');

      expect(url).toMatch(/^models\/bodies\/avatar_asian_m\.glb$/);
    });
  });

  describe('CDN avatar URLs', () => {
    it('should return CDN URL for unknown avatars', () => {
      const url = defaults.getAvatarUrl('unknown_cdn_avatar');

      expect(url).toContain(defaults.AVATAR_CDN.baseUrl);
    });

    it('should handle getFullAvatarUrl with preset object', () => {
      const preset = defaults.getAvatarPreset('avatar_asian_m');
      const url = defaults.getFullAvatarUrl(preset!);

      expect(url).toBe('models/bodies/avatar_asian_m.glb');
    });

    it('should handle CDN preset with sourceBaseUrl', () => {
      const cdnPreset: AvatarPreset = {
        id: 'test_cdn',
        name: 'Test CDN',
        file: 'test.glb',
        style: 'Style B',
        gender: 'M',
        outfit: 'Casual',
        isLocal: false,
        sourceBaseUrl: 'https://example.cdn.com/avatars',
      };

      const url = defaults.getFullAvatarUrl(cdnPreset);

      expect(url).toBe('https://example.cdn.com/avatars/test.glb');
    });

    it('should handle sourceBaseUrl with trailing slash', () => {
      const cdnPreset: AvatarPreset = {
        id: 'test_cdn_slash',
        name: 'Test CDN Slash',
        file: 'test.glb',
        style: 'Style C',
        gender: 'F',
        outfit: 'Business',
        isLocal: false,
        sourceBaseUrl: 'https://example.cdn.com/avatars/',
      };

      const url = defaults.getFullAvatarUrl(cdnPreset);

      // Should not have double slash
      expect(url).toBe('https://example.cdn.com/avatars/test.glb');
      expect(url).not.toContain('//test.glb');
    });
  });

  describe('URL resolution performance', () => {
    it('should resolve all local URLs within time limit', () => {
      const startTime = performance.now();

      for (const preset of defaults.LOCAL_AVATAR_PRESETS) {
        defaults.getAvatarUrl(preset.id);
      }

      const duration = performance.now() - startTime;
      expect(duration).toBeLessThan(URL_RESOLUTION_TIMEOUT * defaults.LOCAL_AVATAR_PRESETS.length);
    });

    it('should resolve URLs synchronously', () => {
      // Ensure URL resolution doesn't return a promise
      const result = defaults.getAvatarUrl('avatar_asian_m');

      expect(result).not.toBeInstanceOf(Promise);
      expect(typeof result).toBe('string');
    });
  });
});

// =============================================================================
// AVATAR FILTERING TESTS
// =============================================================================

describe('Avatar Filtering Performance', () => {
  it('should filter by gender quickly', () => {
    const startTime = performance.now();
    const males = defaults.filterAvatarPresets({ gender: 'M' });
    const females = defaults.filterAvatarPresets({ gender: 'F' });
    const duration = performance.now() - startTime;

    expect(males.length).toBeGreaterThan(0);
    expect(females.length).toBeGreaterThan(0);
    expect(duration).toBeLessThan(100);
  });

  it('should filter by style quickly', () => {
    const startTime = performance.now();

    for (const style of VALID_STYLES) {
      defaults.filterAvatarPresets({ style });
    }

    const duration = performance.now() - startTime;
    expect(duration).toBeLessThan(200);
  });

  it('should apply multiple filters quickly', () => {
    const startTime = performance.now();

    defaults.filterAvatarPresets({
      gender: 'M',
      style: 'Style B',
      outfit: 'Casual',
    });

    const duration = performance.now() - startTime;
    expect(duration).toBeLessThan(50);
  });
});

// =============================================================================
// PAGINATION TESTS
// =============================================================================

describe('Avatar Pagination', () => {
  it('should paginate correctly', () => {
    const pageSize = 2;
    const page0 = defaults.getAvatarsByPage(0, pageSize);
    const page1 = defaults.getAvatarsByPage(1, pageSize);
    const page2 = defaults.getAvatarsByPage(2, pageSize);

    expect(page0.length).toBeLessThanOrEqual(pageSize);
    expect(page1.length).toBeLessThanOrEqual(pageSize);
    expect(page2.length).toBeLessThanOrEqual(pageSize);

    // Pages should have different avatars
    if (page0.length > 0 && page1.length > 0) {
      expect(page0[0].id).not.toBe(page1[0].id);
    }
  });

  it('should return correct total count', () => {
    const totalCount = defaults.getFilteredAvatarCount();

    expect(totalCount).toBeGreaterThanOrEqual(6);
  });

  it('should hasMorePages work correctly', () => {
    const totalCount = defaults.getFilteredAvatarCount();

    // First page with small page size should have more
    if (totalCount > 2) {
      expect(defaults.hasMorePages(0, 2)).toBe(true);
    }

    // Loading all in one page should have no more
    expect(defaults.hasMorePages(0, totalCount)).toBe(false);
  });
});

// =============================================================================
// CDN AVATAR URL RESOLUTION TESTS
// =============================================================================

describe('CDN Avatar URL Resolution', () => {
  const VALID_CDN_BASE = 'https://cdn.jsdelivr.net/gh/c-frame/valid-avatars-glb@c539a28/';

  describe('CDN avatar ID to URL conversion', () => {
    const testCases = [
      {
        id: 'avatars_Asian_Asian_M_1_Casual',
        expectedUrl: `${VALID_CDN_BASE}avatars/Asian/Asian_M_1_Casual.glb`,
        description: 'Asian Male Casual',
      },
      {
        id: 'avatars_Black_Black_F_2_Busi',
        expectedUrl: `${VALID_CDN_BASE}avatars/Black/Black_F_2_Busi.glb`,
        description: 'Black Female Business',
      },
      {
        id: 'avatars_Hispanic_Hispanic_M_3_Medi',
        expectedUrl: `${VALID_CDN_BASE}avatars/Hispanic/Hispanic_M_3_Medi.glb`,
        description: 'Hispanic Male Medical',
      },
      {
        id: 'avatars_White_White_F_1_Milit',
        expectedUrl: `${VALID_CDN_BASE}avatars/White/White_F_1_Milit.glb`,
        description: 'White Female Military',
      },
      {
        id: 'avatars_MENA_MENA_M_2_Util',
        expectedUrl: `${VALID_CDN_BASE}avatars/MENA/MENA_M_2_Util.glb`,
        description: 'MENA Male Utility',
      },
      {
        id: 'avatars_AIAN_AIAN_F_1_Casual',
        expectedUrl: `${VALID_CDN_BASE}avatars/AIAN/AIAN_F_1_Casual.glb`,
        description: 'AIAN Female Casual',
      },
      {
        id: 'avatars_NHPI_NHPI_M_1_Casual',
        expectedUrl: `${VALID_CDN_BASE}avatars/NHPI/NHPI_M_1_Casual.glb`,
        description: 'NHPI Male Casual',
      },
    ];

    it.each(testCases)('should resolve URL for $description ($id)', async ({ id, expectedUrl }) => {
      // Mock the CDN response with a matching entry
      const ethnicity = id.split('_')[1];
      const mockManifest = [{
        text: id,
        image: `${id}.png`,
        model: `avatars/${ethnicity}/${id.split('_').slice(2).join('_')}.glb`,
        ethnicity,
        gender: id.includes('_M_') ? 'M' : 'F',
        num: parseInt(id.match(/_(\d)_/)?.[1] || '1'),
        outfit: id.split('_').pop(),
      }];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockManifest),
      });

      // Fetch CDN avatars to populate cache
      await defaults.fetchCdnAvatars();

      // Get URL for the avatar
      const url = defaults.getFullAvatarUrl(id);

      // Verify the URL matches expected pattern
      expect(url).toContain(VALID_CDN_BASE);
      expect(url).toContain('.glb');
      expect(url).toContain(ethnicity);
    });
  });

  describe('X_Non-validated avatar URL resolution', () => {
    it('should handle X_ prefixed ethnicity avatars', async () => {
      const mockManifest = [{
        text: 'X_AIAN_M_1_Casual',
        image: 'X_AIAN_M_1_Casual.png',
        model: 'avatars/X_Non-validated/X_AIAN_M_1_Casual.glb',
        ethnicity: 'X_AIAN',
        gender: 'M',
        num: 1,
        outfit: 'Casual',
      }];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockManifest),
      });

      const avatars = await defaults.fetchCdnAvatars();
      expect(avatars).toHaveLength(1);

      const avatar = avatars[0];
      expect(avatar.id).toContain('X_Non-validated');
      expect(avatar.file).toContain('X_Non-validated');
    });
  });

  describe('Outfit abbreviation mapping', () => {
    const outfitTestCases = [
      { input: 'Casual', expected: 'Casual' },
      { input: 'Busi', expected: 'Business' },
      { input: 'Medi', expected: 'Medical' },
      { input: 'Milit', expected: 'Military' },
      { input: 'Util', expected: 'Utility' },
    ];

    it.each(outfitTestCases)('should map $input to $expected', async ({ input, expected }) => {
      const mockManifest = [{
        text: `Asian_M_1_${input}`,
        image: `Asian_M_1_${input}.png`,
        model: `avatars/Asian/Asian_M_1_${input}.glb`,
        ethnicity: 'Asian',
        gender: 'M',
        num: 1,
        outfit: input,
      }];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockManifest),
      });

      const avatars = await defaults.fetchCdnAvatars();
      expect(avatars[0].outfit).toBe(expected);
    });
  });

  describe('Ethnicity to style mapping', () => {
    const ethnicityStyleMap = [
      { ethnicity: 'AIAN', expectedStyle: 'Style A' },
      { ethnicity: 'Asian', expectedStyle: 'Style B' },
      { ethnicity: 'Black', expectedStyle: 'Style C' },
      { ethnicity: 'Hispanic', expectedStyle: 'Style D' },
      { ethnicity: 'MENA', expectedStyle: 'Style E' },
      { ethnicity: 'NHPI', expectedStyle: 'Style F' },
      { ethnicity: 'White', expectedStyle: 'Style G' },
    ];

    it.each(ethnicityStyleMap)('should map $ethnicity to $expectedStyle', async ({ ethnicity, expectedStyle }) => {
      const mockManifest = [{
        text: `${ethnicity}_M_1_Casual`,
        image: `${ethnicity}_M_1_Casual.png`,
        model: `avatars/${ethnicity}/${ethnicity}_M_1_Casual.glb`,
        ethnicity,
        gender: 'M',
        num: 1,
        outfit: 'Casual',
      }];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockManifest),
      });

      const avatars = await defaults.fetchCdnAvatars();
      expect(avatars[0].style).toBe(expectedStyle);
    });
  });

  describe('CDN avatar ID generation', () => {
    it('should generate correct ID from model path', async () => {
      const mockManifest = [{
        text: 'Asian Male 1',
        image: 'Asian_M_1.png',
        model: 'avatars/Asian/Asian_M_1_Casual.glb',
        ethnicity: 'Asian',
        gender: 'M',
        num: 1,
        outfit: 'Casual',
      }];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockManifest),
      });

      const avatars = await defaults.fetchCdnAvatars();

      // ID should be model path with / → _ and without .glb
      expect(avatars[0].id).toBe('avatars_Asian_Asian_M_1_Casual');
    });

    it('should handle nested paths in model', async () => {
      const mockManifest = [{
        text: 'X Non-validated Male',
        image: 'X_AIAN_M_1.png',
        model: 'avatars/X_Non-validated/X_AIAN_M_1_Casual.glb',
        ethnicity: 'X_AIAN',
        gender: 'M',
        num: 1,
        outfit: 'Casual',
      }];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockManifest),
      });

      const avatars = await defaults.fetchCdnAvatars();

      expect(avatars[0].id).toBe('avatars_X_Non-validated_X_AIAN_M_1_Casual');
    });
  });

  describe('Thumbnail URL generation', () => {
    it('should generate thumbnail URL for CDN avatars', async () => {
      const mockManifest = [{
        text: 'Asian Male 1',
        image: 'images/Asian_M_1_Casual.jpg',
        model: 'avatars/Asian/Asian_M_1_Casual.glb',
        ethnicity: 'Asian',
        gender: 'M',
        num: 1,
        outfit: 'Casual',
      }];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockManifest),
      });

      const avatars = await defaults.fetchCdnAvatars();

      expect(avatars[0].thumbnailUrl).toBeDefined();
      expect(avatars[0].thumbnailUrl).toContain('.jpg');
    });
  });
});

// =============================================================================
// AVATAR CONFIG CREATION TESTS
// =============================================================================

describe('Avatar Config Creation', () => {
  it.each([
    'avatar_asian_m',
    'avatar_asian_f',
    'avatar_black_m',
    'avatar_white_f',
    'avatar_hispanic_m',
    'avatar_mena_f',
  ])('should create valid config for %s', (avatarId) => {
    const config = defaults.createAvatarConfig(avatarId);

    expect(config.avatarId).toBe(avatarId);
    expect(config.style).toBeDefined();
    expect(VALID_STYLES).toContain(config.style);
    expect(config.gender).toBeDefined();
    expect(VALID_GENDERS).toContain(config.gender);
    expect(config.outfit).toBeDefined();
    expect(VALID_OUTFITS).toContain(config.outfit);
  });

  it('should create stored avatar correctly', () => {
    const stored = defaults.createStoredAvatar('avatar_asian_m');

    expect(stored.id).toBeDefined();
    expect(stored.config.avatarId).toBe('avatar_asian_m');
    expect(stored.version).toBe(2);
    expect(stored.createdAt).toBeDefined();
    expect(stored.updatedAt).toBeDefined();
  });

  it('should use default for unknown avatar ID', () => {
    const config = defaults.createAvatarConfig('nonexistent_avatar');

    expect(config.avatarId).toBe(defaults.DEFAULT_AVATAR_CONFIG.avatarId);
  });
});

// =============================================================================
// GENDER COUNTS TESTS
// =============================================================================

describe('Gender Counts', () => {
  it('should return correct gender counts', () => {
    const counts = defaults.getGenderCounts();

    expect(counts.male).toBeGreaterThan(0);
    expect(counts.female).toBeGreaterThan(0);
    expect(counts.total).toBe(counts.male + counts.female);
  });

  it('should apply filters to gender counts', () => {
    const allCounts = defaults.getGenderCounts();
    const styleBCounts = defaults.getGenderCounts({ style: 'Style B' });

    // Filtered counts should be less than or equal to total
    expect(styleBCounts.total).toBeLessThanOrEqual(allCounts.total);
  });
});
