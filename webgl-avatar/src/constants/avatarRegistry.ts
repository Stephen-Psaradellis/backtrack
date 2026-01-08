/**
 * Avatar Registry - Complete avatar preset management
 *
 * Provides:
 * - Registry of all available complete avatar models
 * - Local avatars bundled with the app
 * - CDN avatars loaded on demand
 * - URL generation for local and CDN avatars
 * - Filtering by ethnicity, gender, outfit
 */

// =============================================================================
// TYPES
// =============================================================================

export interface AvatarPreset {
  id: string;
  name: string;
  file: string;
  ethnicity: string;
  gender: 'M' | 'F' | 'N'; // Male, Female, Neutral
  outfit: string;
  isLocal: boolean;
  sizeKB: number;
  license: string;
  source: string;
  tags: string[];
  thumbnailUrl?: string;
}

export interface CDNSource {
  baseUrl: string;
  manifestUrl: string;
}

// =============================================================================
// CDN CONFIGURATION
// =============================================================================

/**
 * CDN source for additional avatars from VALID project
 */
export const CDN_SOURCE: CDNSource = {
  baseUrl: 'https://cdn.jsdelivr.net/gh/c-frame/valid-avatars-glb@c539a28/',
  manifestUrl: 'https://cdn.jsdelivr.net/gh/c-frame/valid-avatars-glb@c539a28/avatars.json',
};

/**
 * Base path for local avatar models
 * These are bundled with the WebGL build in /models/bodies/
 *
 * NOTE: When running in React Native WebView with inline HTML bundle,
 * relative paths don't work. Use CDN_FALLBACK_ENABLED to load from CDN instead.
 */
export const LOCAL_BASE_PATH = '/models/bodies';

/**
 * When true, use CDN URLs for all avatars instead of local paths.
 * This is necessary when running in a WebView with inline HTML (no server).
 *
 * The WebView cannot resolve relative paths like /models/bodies/avatar.glb
 * when the HTML is loaded as an inline data string.
 */
export const USE_CDN_FOR_ALL_AVATARS = true;

/**
 * Mapping from local avatar IDs to their CDN equivalents.
 * The VALID project CDN uses a different naming convention.
 */
export const LOCAL_TO_CDN_MAP: Record<string, string> = {
  'avatar_asian_m': 'avatars/Asian/Asian_M_1_Casual.glb',
  'avatar_asian_f': 'avatars/Asian/Asian_F_1_Casual.glb',
  'avatar_black_m': 'avatars/Black/Black_M_1_Casual.glb',
  'avatar_white_f': 'avatars/White/White_F_1_Casual.glb',
  'avatar_hispanic_m': 'avatars/Hispanic/Hispanic_M_1_Casual.glb',
  'avatar_mena_f': 'avatars/MENA/MENA_F_1_Casual.glb',
  // Fallback avatars - these need to be hosted elsewhere or use placeholder
  'default': 'avatars/Asian/Asian_M_1_Casual.glb', // Use an available CDN avatar as fallback
  'simple': 'avatars/Asian/Asian_M_1_Casual.glb',  // Use an available CDN avatar as fallback
};

// =============================================================================
// LOCAL AVATAR REGISTRY
// =============================================================================

/**
 * Registry of all locally available complete avatar models.
 * These are bundled with the app for instant access.
 */
export const LOCAL_AVATARS: AvatarPreset[] = [
  {
    id: 'default',
    name: 'Default Avatar',
    file: 'default.glb',
    ethnicity: 'Neutral',
    gender: 'N',
    outfit: 'Casual',
    isLocal: true,
    sizeKB: 428,
    license: 'CC0',
    source: 'Khronos glTF-Sample-Assets (CesiumMan)',
    tags: ['animated', 'textured', 'default'],
  },
  {
    id: 'simple',
    name: 'Simple Figure',
    file: 'simple.glb',
    ethnicity: 'Neutral',
    gender: 'N',
    outfit: 'None',
    isLocal: true,
    sizeKB: 49,
    license: 'CC0',
    source: 'Khronos glTF-Sample-Assets (RiggedFigure)',
    tags: ['simple', 'lightweight', 'rigged'],
  },
  {
    id: 'avatar_asian_m',
    name: 'Asian Male',
    file: 'avatar_asian_m.glb',
    ethnicity: 'Asian',
    gender: 'M',
    outfit: 'Casual',
    isLocal: true,
    sizeKB: 1791,
    license: 'CC0',
    source: 'VALID Project (c-frame/valid-avatars-glb)',
    tags: ['diverse', 'casual', 'male', 'asian'],
  },
  {
    id: 'avatar_asian_f',
    name: 'Asian Female',
    file: 'avatar_asian_f.glb',
    ethnicity: 'Asian',
    gender: 'F',
    outfit: 'Casual',
    isLocal: true,
    sizeKB: 1710,
    license: 'CC0',
    source: 'VALID Project (c-frame/valid-avatars-glb)',
    tags: ['diverse', 'casual', 'female', 'asian'],
  },
  {
    id: 'avatar_black_m',
    name: 'Black Male',
    file: 'avatar_black_m.glb',
    ethnicity: 'Black',
    gender: 'M',
    outfit: 'Casual',
    isLocal: true,
    sizeKB: 1890,
    license: 'CC0',
    source: 'VALID Project (c-frame/valid-avatars-glb)',
    tags: ['diverse', 'casual', 'male', 'black'],
  },
  {
    id: 'avatar_white_f',
    name: 'White Female',
    file: 'avatar_white_f.glb',
    ethnicity: 'White',
    gender: 'F',
    outfit: 'Casual',
    isLocal: true,
    sizeKB: 2095,
    license: 'CC0',
    source: 'VALID Project (c-frame/valid-avatars-glb)',
    tags: ['diverse', 'casual', 'female', 'white'],
  },
  {
    id: 'avatar_hispanic_m',
    name: 'Hispanic Male',
    file: 'avatar_hispanic_m.glb',
    ethnicity: 'Hispanic',
    gender: 'M',
    outfit: 'Casual',
    isLocal: true,
    sizeKB: 1897,
    license: 'CC0',
    source: 'VALID Project (c-frame/valid-avatars-glb)',
    tags: ['diverse', 'casual', 'male', 'hispanic'],
  },
  {
    id: 'avatar_mena_f',
    name: 'MENA Female',
    file: 'avatar_mena_f.glb',
    ethnicity: 'MENA',
    gender: 'F',
    outfit: 'Casual',
    isLocal: true,
    sizeKB: 1808,
    license: 'CC0',
    source: 'VALID Project (c-frame/valid-avatars-glb)',
    tags: ['diverse', 'casual', 'female', 'mena'],
  },
];

/**
 * Default avatar ID used when no avatar is selected
 */
export const DEFAULT_AVATAR_ID = 'avatar_asian_m';

/**
 * Fallback avatar ID used when requested avatar fails to load
 */
export const FALLBACK_AVATAR_ID = 'default';

// =============================================================================
// AVATAR LOOKUP FUNCTIONS
// =============================================================================

/**
 * Get avatar preset by ID
 * @param id - Avatar ID to look up
 * @returns Avatar preset or undefined if not found
 */
export function getAvatarById(id: string): AvatarPreset | undefined {
  return LOCAL_AVATARS.find((avatar) => avatar.id === id);
}

/**
 * Get the URL for an avatar model
 * @param avatarId - Avatar ID or preset object
 * @returns Full URL to the GLB file
 */
export function getAvatarUrl(avatarId: string | AvatarPreset): string {
  // If preset object passed, extract ID
  const id = typeof avatarId === 'string' ? avatarId : avatarId.id;

  // Look up avatar in local registry
  const avatar = getAvatarById(id);

  // When USE_CDN_FOR_ALL_AVATARS is enabled, always use CDN URLs
  // This is necessary for React Native WebView where relative paths don't work
  if (USE_CDN_FOR_ALL_AVATARS) {
    // Check if we have a CDN mapping for this avatar
    const cdnPath = LOCAL_TO_CDN_MAP[id];
    if (cdnPath) {
      return `${CDN_SOURCE.baseUrl}${cdnPath}`;
    }

    // For unknown avatars, try constructing a CDN path
    // This handles dynamically loaded CDN avatars
    if (id.includes('/') || id.includes('_')) {
      // Already looks like a path or follows CDN naming convention
      return `${CDN_SOURCE.baseUrl}${id}${id.endsWith('.glb') ? '' : '.glb'}`;
    }

    // Fallback to default avatar from CDN
    const defaultCdnPath = LOCAL_TO_CDN_MAP[DEFAULT_AVATAR_ID];
    console.warn(`[AvatarRegistry] Unknown avatar ID: ${id}, using default`);
    return `${CDN_SOURCE.baseUrl}${defaultCdnPath || 'avatars/Asian/Asian_M_1_Casual.glb'}`;
  }

  // Original logic for when local paths work (e.g., Vite dev server)
  if (avatar && avatar.isLocal) {
    // Local avatar - use local path
    return `${LOCAL_BASE_PATH}/${avatar.file}`;
  }

  // Check if it's a CDN avatar (ID contains CDN marker or not found locally)
  if (!avatar || !avatar.isLocal) {
    // Assume it's a CDN avatar - construct CDN URL
    // CDN avatars follow naming pattern: {ethnicity}/{gender}/{outfit}/avatar.glb
    return `${CDN_SOURCE.baseUrl}${id}.glb`;
  }

  // Fallback to default
  const defaultAvatar = getAvatarById(DEFAULT_AVATAR_ID);
  return `${LOCAL_BASE_PATH}/${defaultAvatar?.file || 'default.glb'}`;
}

/**
 * Get URL for avatar thumbnail image
 * @param avatarId - Avatar ID
 * @returns Thumbnail URL or undefined
 */
export function getAvatarThumbnailUrl(avatarId: string): string | undefined {
  const avatar = getAvatarById(avatarId);
  if (avatar?.thumbnailUrl) {
    return avatar.thumbnailUrl;
  }
  // Could generate thumbnail URL from avatar file
  // For now, return undefined - thumbnails can be rendered on demand
  return undefined;
}

// =============================================================================
// FILTERING FUNCTIONS
// =============================================================================

/**
 * Filter avatars by criteria
 * @param options - Filter options
 * @returns Filtered array of avatar presets
 */
export function filterAvatars(options: {
  ethnicity?: string;
  gender?: 'M' | 'F' | 'N';
  outfit?: string;
  localOnly?: boolean;
  tags?: string[];
}): AvatarPreset[] {
  let result = [...LOCAL_AVATARS];

  if (options.ethnicity) {
    result = result.filter(
      (a) => a.ethnicity.toLowerCase() === options.ethnicity!.toLowerCase()
    );
  }

  if (options.gender) {
    result = result.filter((a) => a.gender === options.gender);
  }

  if (options.outfit) {
    result = result.filter(
      (a) => a.outfit.toLowerCase() === options.outfit!.toLowerCase()
    );
  }

  if (options.localOnly) {
    result = result.filter((a) => a.isLocal);
  }

  if (options.tags && options.tags.length > 0) {
    result = result.filter((a) =>
      options.tags!.some((tag) => a.tags.includes(tag.toLowerCase()))
    );
  }

  return result;
}

/**
 * Get unique ethnicities available in the registry
 */
export function getAvailableEthnicities(): string[] {
  const ethnicities = new Set(LOCAL_AVATARS.map((a) => a.ethnicity));
  return Array.from(ethnicities).sort();
}

/**
 * Get unique outfits available in the registry
 */
export function getAvailableOutfits(): string[] {
  const outfits = new Set(LOCAL_AVATARS.map((a) => a.outfit));
  return Array.from(outfits).sort();
}

// =============================================================================
// CDN AVATAR LOADING
// =============================================================================

/**
 * Cache for CDN manifest data
 */
let cdnManifestCache: AvatarPreset[] | null = null;

/**
 * Fetch available avatars from CDN
 * @returns Promise resolving to array of CDN avatar presets
 */
export async function fetchCDNAvatars(): Promise<AvatarPreset[]> {
  if (cdnManifestCache) {
    return cdnManifestCache;
  }

  try {
    const response = await fetch(CDN_SOURCE.manifestUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch CDN manifest: ${response.status}`);
    }

    const manifest = await response.json();

    // Transform manifest to AvatarPreset format
    // The VALID project manifest has a specific format
    const avatars: AvatarPreset[] = [];

    if (Array.isArray(manifest.avatars)) {
      manifest.avatars.forEach((item: any) => {
        avatars.push({
          id: item.id || item.file?.replace('.glb', ''),
          name: item.name || item.id,
          file: item.file || `${item.id}.glb`,
          ethnicity: item.ethnicity || 'Unknown',
          gender: item.gender || 'N',
          outfit: item.outfit || 'Unknown',
          isLocal: false,
          sizeKB: item.sizeKB || 2000,
          license: 'CC0',
          source: 'VALID Project CDN',
          tags: item.tags || [],
        });
      });
    }

    cdnManifestCache = avatars;
    return avatars;
  } catch (error) {
    console.warn('[AvatarRegistry] Failed to fetch CDN avatars:', error);
    return [];
  }
}

/**
 * Get all avatars (local + CDN)
 * @param includeCDN - Whether to include CDN avatars (async)
 * @returns Promise resolving to all available avatars
 */
export async function getAllAvatars(includeCDN = false): Promise<AvatarPreset[]> {
  if (!includeCDN) {
    return LOCAL_AVATARS;
  }

  const cdnAvatars = await fetchCDNAvatars();
  return [...LOCAL_AVATARS, ...cdnAvatars];
}

// =============================================================================
// EXPORTS
// =============================================================================

export default {
  LOCAL_AVATARS,
  DEFAULT_AVATAR_ID,
  FALLBACK_AVATAR_ID,
  CDN_SOURCE,
  LOCAL_BASE_PATH,
  getAvatarById,
  getAvatarUrl,
  getAvatarThumbnailUrl,
  filterAvatars,
  getAvailableEthnicities,
  getAvailableOutfits,
  fetchCDNAvatars,
  getAllAvatars,
};
