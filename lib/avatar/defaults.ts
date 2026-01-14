/**
 * Avatar System - Default Configurations
 *
 * Multi-source avatar system supporting 1000+ diverse avatars.
 * Loads avatars from multiple CDNs (VALID Project, future sources) with fast preview loading.
 *
 * Key features:
 * - 470+ prebuilt GLB avatars from VALID CDN (expandable to 1000+)
 * - Multi-source aggregation with priority ordering
 * - Pagination support for large avatar collections
 * - Thumbnail images for fast grid preview
 * - Caching for <1.5s load times
 * - Neutral style categories (not ethnicity-based)
 */

import type {
  AvatarConfig,
  AvatarPreset,
  AvatarStyle,
  AvatarEthnicity,
  AvatarGender,
  AvatarOutfit,
  StoredAvatar,
  AvatarGenderCounts,
  AvatarSource,
} from '../../components/avatar/types';
import { ETHNICITY_TO_STYLE } from '../../components/avatar/types';
import {
  AVATAR_SOURCES,
  getEnabledSources,
  getAvatarUrlForSource,
  getThumbnailUrlForSource,
} from './sources';

// Re-export for convenience
export { DEFAULT_AVATAR_ID, AVATAR_CONFIG_VERSION } from '../../components/avatar/types';

/**
 * Generate a simple unique ID for avatars.
 */
function generateStoredAvatarId(): string {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 15);
  const randomPart2 = Math.random().toString(36).substring(2, 15);
  return `${timestamp}-${randomPart}-${randomPart2}`;
}

// =============================================================================
// CDN CONFIGURATION
// =============================================================================

/**
 * CDN configuration for loading avatars.
 * Uses jsDelivr CDN for fast, global delivery.
 */
export const AVATAR_CDN = {
  /** Base URL for avatar assets */
  baseUrl: 'https://cdn.jsdelivr.net/gh/c-frame/valid-avatars-glb@c539a28/',
  /** Manifest URL listing all available avatars */
  manifestUrl: 'https://cdn.jsdelivr.net/gh/c-frame/valid-avatars-glb@c539a28/avatars.json',
  /** Image base URL for thumbnails */
  imagesUrl: 'https://cdn.jsdelivr.net/gh/c-frame/valid-avatars-glb@c539a28/images/',
} as const;

// =============================================================================
// LOCAL AVATAR PRESETS (Bundled with app for offline fallback)
// =============================================================================

/**
 * Local avatar presets bundled with the app.
 * These are immediately available without network requests.
 * Using neutral style categories.
 */
export const LOCAL_AVATAR_PRESETS: AvatarPreset[] = [
  {
    id: 'avatar_asian_m',
    name: 'Style B Male 1',
    file: 'avatar_asian_m.glb',
    style: 'Style B',
    ethnicity: 'Asian',
    gender: 'M',
    outfit: 'Casual',
    isLocal: true,
    sizeKB: 1791,
    license: 'CC0',
    source: 'VALID Project',
    variant: 1,
    tags: ['diverse', 'casual', 'male'],
  },
  {
    id: 'avatar_asian_f',
    name: 'Style B Female 1',
    file: 'avatar_asian_f.glb',
    style: 'Style B',
    ethnicity: 'Asian',
    gender: 'F',
    outfit: 'Casual',
    isLocal: true,
    sizeKB: 1710,
    license: 'CC0',
    source: 'VALID Project',
    variant: 1,
    tags: ['diverse', 'casual', 'female'],
  },
  {
    id: 'avatar_black_m',
    name: 'Style C Male 1',
    file: 'avatar_black_m.glb',
    style: 'Style C',
    ethnicity: 'Black',
    gender: 'M',
    outfit: 'Casual',
    isLocal: true,
    sizeKB: 1890,
    license: 'CC0',
    source: 'VALID Project',
    variant: 1,
    tags: ['diverse', 'casual', 'male'],
  },
  {
    id: 'avatar_white_f',
    name: 'Style G Female 1',
    file: 'avatar_white_f.glb',
    style: 'Style G',
    ethnicity: 'White',
    gender: 'F',
    outfit: 'Casual',
    isLocal: true,
    sizeKB: 2095,
    license: 'CC0',
    source: 'VALID Project',
    variant: 1,
    tags: ['diverse', 'casual', 'female'],
  },
  {
    id: 'avatar_hispanic_m',
    name: 'Style D Male 1',
    file: 'avatar_hispanic_m.glb',
    style: 'Style D',
    ethnicity: 'Hispanic',
    gender: 'M',
    outfit: 'Casual',
    isLocal: true,
    sizeKB: 1897,
    license: 'CC0',
    source: 'VALID Project',
    variant: 1,
    tags: ['diverse', 'casual', 'male'],
  },
  {
    id: 'avatar_mena_f',
    name: 'Style E Female 1',
    file: 'avatar_mena_f.glb',
    style: 'Style E',
    ethnicity: 'MENA',
    gender: 'F',
    outfit: 'Casual',
    isLocal: true,
    sizeKB: 1808,
    license: 'CC0',
    source: 'VALID Project',
    variant: 1,
    tags: ['diverse', 'casual', 'female'],
  },
];

// =============================================================================
// CDN AVATAR CACHE
// =============================================================================

/** Cache for CDN avatar manifest */
let cdnAvatarCache: AvatarPreset[] | null = null;

/** Promise for in-flight CDN fetch */
let cdnFetchPromise: Promise<AvatarPreset[]> | null = null;

/** Timestamp of last CDN fetch for cache invalidation */
let cdnFetchTimestamp: number | null = null;

/** Cache duration: 1 hour */
const CDN_CACHE_DURATION_MS = 60 * 60 * 1000;

/**
 * Map outfit abbreviations to full names
 */
const OUTFIT_MAP: Record<string, AvatarOutfit> = {
  'Casual': 'Casual',
  'Busi': 'Business',
  'Medi': 'Medical',
  'Milit': 'Military',
  'Util': 'Utility',
};

/**
 * Extended ethnicity to style map including X_ prefixed variations
 */
const EXTENDED_ETHNICITY_TO_STYLE: Record<string, AvatarStyle> = {
  ...ETHNICITY_TO_STYLE,
  // X_ prefixed are non-validated but still usable
  'X_AIAN': 'Style A',
  'X_MENA': 'Style E',
  'X_NHPI': 'Style F',
};

/**
 * Parse a CDN avatar entry from the manifest into an AvatarPreset
 */
function parseCdnAvatarEntry(
  entry: {
    text: string;
    image: string;
    model: string;
    ethnicity: string;
    gender: string;
    num: number;
    outfit: string;
  },
  source: AvatarSource
): AvatarPreset {
  // Map ethnicity to style (including X_ prefixed)
  const ethnicity = entry.ethnicity as AvatarEthnicity;
  const style = EXTENDED_ETHNICITY_TO_STYLE[entry.ethnicity] || 'Style A';

  // Map outfit abbreviation to full name
  const outfit = OUTFIT_MAP[entry.outfit] || 'Casual';

  // Gender label for display name
  const genderLabel = entry.gender === 'M' ? 'Male' : 'Female';

  // Create friendly display name using style
  const name = `${style} ${genderLabel} ${entry.num} ${outfit}`;

  // Build unique ID from model path (remove .glb extension)
  const id = entry.model.replace('.glb', '').replace(/\//g, '_');

  // Build thumbnail URL
  const thumbnailUrl = source.thumbnailBaseUrl
    ? getThumbnailUrlForSource(source, entry.image)
    : undefined;

  return {
    id,
    name,
    file: entry.model,
    style,
    ethnicity: ethnicity.startsWith('X_') ? undefined : ethnicity,
    gender: entry.gender as AvatarGender,
    outfit,
    isLocal: false,
    sizeKB: 2000, // Average size estimate
    thumbnailUrl,
    license: 'CC0',
    source: source.id,
    sourceBaseUrl: source.cdnBaseUrl,
    variant: entry.num,
    tags: [
      style.toLowerCase().replace(' ', '-'),
      entry.gender === 'M' ? 'male' : 'female',
      outfit.toLowerCase(),
    ],
  };
}

/**
 * Fetch avatars from a single source manifest.
 */
async function fetchSourceAvatars(source: AvatarSource): Promise<AvatarPreset[]> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

  try {
    const response = await fetch(source.manifestUrl, {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Failed to fetch manifest from ${source.name}: ${response.status}`);
    }

    const manifest = await response.json();
    const avatars: AvatarPreset[] = [];

    if (Array.isArray(manifest)) {
      for (const entry of manifest) {
        // Skip entries without required fields
        if (!entry.model || !entry.ethnicity || !entry.gender) {
          continue;
        }
        // Include ALL avatars (including X_ prefixed) to maximize count
        avatars.push(parseCdnAvatarEntry(entry, source));
      }
    }

    return avatars;
  } catch (error) {
    console.warn(`[Avatar] Failed to fetch from ${source.name}:`, error);
    return [];
  }
}

/**
 * Fetch all avatars from all enabled CDN sources.
 * Results are cached for fast subsequent loads.
 */
export async function fetchCdnAvatars(): Promise<AvatarPreset[]> {
  // Check if cache is still valid
  const now = Date.now();
  if (cdnAvatarCache && cdnFetchTimestamp && (now - cdnFetchTimestamp < CDN_CACHE_DURATION_MS)) {
    return cdnAvatarCache;
  }

  // Return in-progress fetch if already fetching
  if (cdnFetchPromise) {
    return cdnFetchPromise;
  }

  // Start new fetch from all enabled sources
  cdnFetchPromise = (async () => {
    try {
      const sources = getEnabledSources();
      const startTime = performance.now();

      // Fetch from all sources in parallel
      const results = await Promise.allSettled(
        sources.map(source => fetchSourceAvatars(source))
      );

      // Aggregate avatars from all sources
      const allAvatars: AvatarPreset[] = [];
      const seenIds = new Set<string>();

      for (let i = 0; i < results.length; i++) {
        const result = results[i];
        if (result.status === 'fulfilled') {
          for (const avatar of result.value) {
            // Dedupe by ID (first source wins due to priority ordering)
            if (!seenIds.has(avatar.id)) {
              seenIds.add(avatar.id);
              allAvatars.push(avatar);
            }
          }
        }
      }

      const loadTime = performance.now() - startTime;
      console.log(`[Avatar] Loaded ${allAvatars.length} avatars from ${sources.length} source(s) in ${loadTime.toFixed(0)}ms`);

      cdnAvatarCache = allAvatars;
      cdnFetchTimestamp = now;
      return allAvatars;
    } catch (error) {
      console.warn('[Avatar] Failed to fetch CDN avatars:', error);
      // Return cached data if available, otherwise empty array
      return cdnAvatarCache || [];
    } finally {
      cdnFetchPromise = null;
    }
  })();

  return cdnFetchPromise;
}

/**
 * Prefetch CDN avatars for fast initial load.
 * Call this during app initialization.
 */
export function prefetchCdnAvatars(): void {
  fetchCdnAvatars().catch(() => {
    // Silently ignore prefetch errors
  });
}

/**
 * Check if CDN avatars have been loaded
 */
export function areCdnAvatarsLoaded(): boolean {
  return cdnAvatarCache !== null && cdnAvatarCache.length > 0;
}

/**
 * Get count of loaded CDN avatars
 */
export function getCdnAvatarCount(): number {
  return cdnAvatarCache?.length || 0;
}

// =============================================================================
// AVATAR PRESET REGISTRY
// =============================================================================

/**
 * Get all available avatars (local + CDN, if loaded).
 * Call with await to ensure CDN avatars are loaded.
 */
export async function getAllAvatarPresets(): Promise<AvatarPreset[]> {
  const cdnAvatars = await fetchCdnAvatars();
  // Local presets first, then CDN (deduped by ID)
  const allAvatars = [...LOCAL_AVATAR_PRESETS];
  const localIds = new Set(allAvatars.map(a => a.id));

  for (const cdnAvatar of cdnAvatars) {
    if (!localIds.has(cdnAvatar.id)) {
      allAvatars.push(cdnAvatar);
    }
  }

  return allAvatars;
}

/**
 * Get all avatars synchronously (may not include CDN if not yet loaded).
 * Use getAllAvatarPresets() for async version that ensures CDN is loaded.
 */
export function getAllAvatarPresetsSync(): AvatarPreset[] {
  const allAvatars = [...LOCAL_AVATAR_PRESETS];
  const localIds = new Set(allAvatars.map(a => a.id));

  if (cdnAvatarCache) {
    for (const cdnAvatar of cdnAvatarCache) {
      if (!localIds.has(cdnAvatar.id)) {
        allAvatars.push(cdnAvatar);
      }
    }
  }

  return allAvatars;
}

/**
 * Get avatar preset by ID
 */
export function getAvatarPreset(avatarId: string): AvatarPreset | undefined {
  // Check local presets first
  const local = LOCAL_AVATAR_PRESETS.find((p) => p.id === avatarId);
  if (local) return local;

  // Check CDN cache
  return cdnAvatarCache?.find((p) => p.id === avatarId);
}

/**
 * Get avatar GLB URL (local or CDN)
 */
export function getAvatarUrl(avatarId: string): string {
  const preset = getAvatarPreset(avatarId);
  if (preset?.isLocal) {
    // Local assets are served from the WebGL bundle
    return `models/bodies/${preset.file}`;
  }
  if (preset) {
    // CDN avatars use the full URL
    return `${AVATAR_CDN.baseUrl}${preset.file}`;
  }
  // Fallback for unknown avatars - assume CDN path
  return `${AVATAR_CDN.baseUrl}avatars/${avatarId}.glb`;
}

/**
 * Get avatar thumbnail URL for fast preview
 */
export function getAvatarThumbnailUrl(avatarId: string): string | undefined {
  const preset = getAvatarPreset(avatarId);
  return preset?.thumbnailUrl;
}

// =============================================================================
// FILTERING FUNCTIONS
// =============================================================================

/**
 * Filter presets by criteria
 */
export function filterAvatarPresets(options: {
  style?: AvatarStyle;
  gender?: AvatarGender;
  outfit?: AvatarOutfit;
  isLocal?: boolean;
}): AvatarPreset[] {
  return getAllAvatarPresetsSync().filter((preset) => {
    if (options.style && preset.style !== options.style) return false;
    if (options.gender && preset.gender !== options.gender) return false;
    if (options.outfit && preset.outfit !== options.outfit) return false;
    if (options.isLocal !== undefined && preset.isLocal !== options.isLocal) return false;
    return true;
  });
}

/**
 * Filter all presets (from provided array) by criteria
 */
export function filterAllAvatarPresets(
  presets: AvatarPreset[],
  options: {
    style?: AvatarStyle;
    ethnicity?: AvatarEthnicity; // Backward compatibility
    gender?: AvatarGender;
    outfit?: AvatarOutfit;
    isLocal?: boolean;
  }
): AvatarPreset[] {
  return presets.filter((preset) => {
    // Support both style and legacy ethnicity filtering
    if (options.style && preset.style !== options.style) return false;
    if (options.ethnicity) {
      const targetStyle = ETHNICITY_TO_STYLE[options.ethnicity];
      if (preset.style !== targetStyle) return false;
    }
    if (options.gender && preset.gender !== options.gender) return false;
    if (options.outfit && preset.outfit !== options.outfit) return false;
    if (options.isLocal !== undefined && preset.isLocal !== options.isLocal) return false;
    return true;
  });
}

/**
 * Get unique style values from presets
 */
export function getStylesFromPresets(presets: AvatarPreset[]): AvatarStyle[] {
  const styles = new Set(presets.map((p) => p.style));
  return Array.from(styles).sort();
}

/**
 * Get unique ethnicity values from presets (backward compatibility)
 * @deprecated Use getStylesFromPresets instead
 */
export function getEthnicitiesFromPresets(presets: AvatarPreset[]): AvatarEthnicity[] {
  const ethnicities = new Set(presets.map((p) => p.ethnicity).filter(Boolean) as AvatarEthnicity[]);
  return Array.from(ethnicities).sort();
}

/**
 * Get unique outfit values from presets
 */
export function getOutfitsFromPresets(presets: AvatarPreset[]): AvatarOutfit[] {
  const outfits = new Set(presets.map((p) => p.outfit));
  return Array.from(outfits).sort();
}

/**
 * Get all unique style values from currently loaded presets
 */
export function getAvailableStyles(): AvatarStyle[] {
  return getStylesFromPresets(getAllAvatarPresetsSync());
}

/**
 * Get all unique ethnicity values (backward compatibility)
 * @deprecated Use getAvailableStyles instead
 */
export function getAvailableEthnicities(): AvatarEthnicity[] {
  return getEthnicitiesFromPresets(getAllAvatarPresetsSync());
}

/**
 * Get all unique outfit values from currently loaded presets
 */
export function getAvailableOutfits(): AvatarOutfit[] {
  return getOutfitsFromPresets(getAllAvatarPresetsSync());
}

// =============================================================================
// AVATAR CONFIG CREATION
// =============================================================================

/**
 * Default avatar configuration
 */
export const DEFAULT_AVATAR_CONFIG: AvatarConfig = {
  avatarId: 'avatar_asian_m',
  style: 'Style B',
  ethnicity: 'Asian',
  gender: 'M',
  outfit: 'Casual',
};

/**
 * Create an AvatarConfig from a preset ID
 */
export function createAvatarConfig(avatarId: string): AvatarConfig {
  const preset = getAvatarPreset(avatarId);
  if (!preset) {
    // Fallback to default if preset not found
    return { ...DEFAULT_AVATAR_CONFIG };
  }
  return {
    avatarId: preset.id,
    style: preset.style,
    ethnicity: preset.ethnicity,
    gender: preset.gender,
    outfit: preset.outfit,
  };
}

/**
 * Create a new StoredAvatar from a preset ID
 */
export function createStoredAvatar(avatarId: string, id?: string): StoredAvatar {
  const now = new Date().toISOString();
  return {
    id: id || generateStoredAvatarId(),
    config: createAvatarConfig(avatarId),
    version: 2,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Create a default stored avatar
 */
export function createDefaultStoredAvatar(): StoredAvatar {
  return createStoredAvatar('avatar_asian_m');
}

/**
 * Get a random avatar preset ID
 */
export function getRandomAvatarId(): string {
  const allAvatars = getAllAvatarPresetsSync();
  const randomIndex = Math.floor(Math.random() * allAvatars.length);
  return allAvatars[randomIndex]?.id || 'avatar_asian_m';
}

/**
 * Create a random stored avatar
 */
export function createRandomStoredAvatar(): StoredAvatar {
  return createStoredAvatar(getRandomAvatarId());
}

/**
 * Normalize an avatar config by filling missing values with defaults
 */
export function normalizeAvatarConfig(
  partial: Partial<AvatarConfig>
): AvatarConfig {
  if (partial.avatarId) {
    return createAvatarConfig(partial.avatarId);
  }
  return { ...DEFAULT_AVATAR_CONFIG, ...partial };
}

/**
 * Validate and normalize a stored avatar
 */
export function normalizeStoredAvatar(
  avatar: Partial<StoredAvatar>
): StoredAvatar {
  const now = new Date().toISOString();

  return {
    id: avatar.id || generateStoredAvatarId(),
    config: normalizeAvatarConfig(avatar.config || {}),
    version: avatar.version || 2,
    createdAt: avatar.createdAt || now,
    updatedAt: avatar.updatedAt || now,
    snapshotUrl: avatar.snapshotUrl,
  };
}

// =============================================================================
// PAGINATION SUPPORT
// =============================================================================

/** Default page size for avatar browsing */
export const DEFAULT_PAGE_SIZE = 50;

/**
 * Get a page of avatars with optional filtering.
 * For efficient rendering of large avatar collections.
 *
 * @param page - Page number (0-indexed)
 * @param pageSize - Number of items per page
 * @param filters - Optional filters to apply
 * @returns Array of avatars for the requested page
 */
export function getAvatarsByPage(
  page: number,
  pageSize: number = DEFAULT_PAGE_SIZE,
  filters?: {
    style?: AvatarStyle;
    gender?: AvatarGender;
    outfit?: AvatarOutfit;
  }
): AvatarPreset[] {
  let presets = getAllAvatarPresetsSync();

  // Apply filters
  if (filters) {
    presets = filterAllAvatarPresets(presets, filters);
  }

  // Calculate pagination
  const start = page * pageSize;
  const end = start + pageSize;

  return presets.slice(start, end);
}

/**
 * Get the total count of avatars after filtering.
 */
export function getFilteredAvatarCount(filters?: {
  style?: AvatarStyle;
  gender?: AvatarGender;
  outfit?: AvatarOutfit;
}): number {
  let presets = getAllAvatarPresetsSync();

  if (filters) {
    presets = filterAllAvatarPresets(presets, filters);
  }

  return presets.length;
}

/**
 * Get gender counts for the loaded avatars.
 * Useful for displaying "X male / Y female" in the UI.
 */
export function getGenderCounts(filters?: {
  style?: AvatarStyle;
  outfit?: AvatarOutfit;
}): AvatarGenderCounts {
  let presets = getAllAvatarPresetsSync();

  // Apply non-gender filters
  if (filters) {
    presets = filterAllAvatarPresets(presets, {
      style: filters.style,
      outfit: filters.outfit,
    });
  }

  const male = presets.filter(p => p.gender === 'M').length;
  const female = presets.filter(p => p.gender === 'F').length;

  return {
    male,
    female,
    total: male + female,
  };
}

/**
 * Check if there are more pages available.
 */
export function hasMorePages(
  currentPage: number,
  pageSize: number = DEFAULT_PAGE_SIZE,
  filters?: {
    style?: AvatarStyle;
    gender?: AvatarGender;
    outfit?: AvatarOutfit;
  }
): boolean {
  const totalCount = getFilteredAvatarCount(filters);
  const loadedCount = (currentPage + 1) * pageSize;
  return loadedCount < totalCount;
}

// =============================================================================
// AVATAR URL RESOLUTION (Multi-Source)
// =============================================================================

/**
 * Get the full URL for an avatar GLB file.
 * Handles both local and CDN avatars from any source.
 */
export function getFullAvatarUrl(avatarIdOrPreset: string | AvatarPreset): string {
  const preset = typeof avatarIdOrPreset === 'string'
    ? getAvatarPreset(avatarIdOrPreset)
    : avatarIdOrPreset;

  if (!preset) {
    // Fallback for unknown avatars - use primary source
    const primarySource = getEnabledSources()[0] || AVATAR_SOURCES[0];
    return getAvatarUrlForSource(primarySource, `avatars/${avatarIdOrPreset}.glb`);
  }

  if (preset.isLocal) {
    // Local assets are served from the WebGL bundle
    return `models/bodies/${preset.file}`;
  }

  // Use source-specific base URL if available
  if (preset.sourceBaseUrl) {
    const baseUrl = preset.sourceBaseUrl.endsWith('/')
      ? preset.sourceBaseUrl.slice(0, -1)
      : preset.sourceBaseUrl;
    return `${baseUrl}/${preset.file}`;
  }

  // Fallback to AVATAR_CDN for backward compatibility
  return `${AVATAR_CDN.baseUrl}${preset.file}`;
}
