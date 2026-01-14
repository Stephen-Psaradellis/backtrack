/**
 * Avatar Sources Registry
 *
 * Multi-source configuration for loading avatars from multiple CDNs.
 * Supports 1000+ avatars from VALID Project, Polygonal Mind, and future sources.
 *
 * @example
 * ```typescript
 * import { AVATAR_SOURCES, getEnabledSources } from 'lib/avatar/sources';
 *
 * const sources = getEnabledSources();
 * // Fetch manifests from each source in priority order
 * ```
 */

import type { AvatarSource } from '../../components/avatar/types';

// =============================================================================
// SOURCE REGISTRY
// =============================================================================

/**
 * All available avatar sources.
 * Sources are loaded in priority order (lower number = higher priority).
 */
export const AVATAR_SOURCES: AvatarSource[] = [
  {
    id: 'valid',
    name: 'VALID Project',
    cdnBaseUrl: 'https://cdn.jsdelivr.net/gh/c-frame/valid-avatars-glb@c539a28/',
    manifestUrl: 'https://cdn.jsdelivr.net/gh/c-frame/valid-avatars-glb@c539a28/avatars.json',
    // Note: manifest image paths include 'images/' prefix (e.g., 'images/AIAN_M_1_Casual.jpg')
    thumbnailBaseUrl: 'https://cdn.jsdelivr.net/gh/c-frame/valid-avatars-glb@c539a28/',
    priority: 1,
    enabled: true,
    license: 'CC0',
  },
  // Future source: Polygonal Mind 100Avatars
  // This will be enabled once we have the converted GLB files hosted
  // {
  //   id: 'polygonal-mind',
  //   name: 'Polygonal Mind 100Avatars',
  //   cdnBaseUrl: 'https://cdn.jsdelivr.net/gh/backtrack-app/avatars-pm@v1.0.0/',
  //   manifestUrl: 'https://cdn.jsdelivr.net/gh/backtrack-app/avatars-pm@v1.0.0/avatars.json',
  //   thumbnailBaseUrl: 'https://cdn.jsdelivr.net/gh/backtrack-app/avatars-pm@v1.0.0/thumbnails/',
  //   priority: 2,
  //   enabled: false,
  //   license: 'CC0',
  // },
];

// =============================================================================
// SOURCE UTILITIES
// =============================================================================

/**
 * Get all enabled sources sorted by priority
 */
export function getEnabledSources(): AvatarSource[] {
  return AVATAR_SOURCES
    .filter(source => source.enabled)
    .sort((a, b) => a.priority - b.priority);
}

/**
 * Get a source by ID
 */
export function getSourceById(id: string): AvatarSource | undefined {
  return AVATAR_SOURCES.find(source => source.id === id);
}

/**
 * Get the primary (highest priority) source
 */
export function getPrimarySource(): AvatarSource {
  const enabled = getEnabledSources();
  return enabled[0] || AVATAR_SOURCES[0];
}

/**
 * Check if a source is enabled
 */
export function isSourceEnabled(id: string): boolean {
  const source = getSourceById(id);
  return source?.enabled ?? false;
}

/**
 * Get full avatar URL for a source
 */
export function getAvatarUrlForSource(source: AvatarSource, filePath: string): string {
  // Ensure no double slashes
  const baseUrl = source.cdnBaseUrl.endsWith('/')
    ? source.cdnBaseUrl.slice(0, -1)
    : source.cdnBaseUrl;
  const path = filePath.startsWith('/') ? filePath.slice(1) : filePath;
  return `${baseUrl}/${path}`;
}

/**
 * Get thumbnail URL for a source
 */
export function getThumbnailUrlForSource(
  source: AvatarSource,
  imagePath: string
): string | undefined {
  if (!source.thumbnailBaseUrl) return undefined;

  const baseUrl = source.thumbnailBaseUrl.endsWith('/')
    ? source.thumbnailBaseUrl.slice(0, -1)
    : source.thumbnailBaseUrl;
  const path = imagePath.startsWith('/') ? imagePath.slice(1) : imagePath;
  return `${baseUrl}/${path}`;
}

// =============================================================================
// MANIFEST PARSING
// =============================================================================

/**
 * Parse VALID Project manifest format
 */
export interface ValidManifestEntry {
  text: string;
  image: string;
  model: string;
  ethnicity: string;
  gender: string;
  num: number;
  outfit: string;
}

/**
 * Parse Polygonal Mind manifest format (future)
 */
export interface PolygonalMindManifestEntry {
  id: string;
  name: string;
  model: string;
  thumbnail?: string;
  gender?: 'M' | 'F';
  style?: string;
}

/**
 * Generic manifest entry that all sources are normalized to
 */
export interface NormalizedManifestEntry {
  id: string;
  name: string;
  modelPath: string;
  thumbnailPath?: string;
  gender: 'M' | 'F';
  style: string;
  outfit: string;
  source: string;
}

/**
 * Normalize a VALID Project manifest entry
 */
export function normalizeValidEntry(
  entry: ValidManifestEntry,
  source: AvatarSource
): NormalizedManifestEntry {
  // Build unique ID from model path (remove .glb extension)
  const id = entry.model.replace('.glb', '').replace(/\//g, '_');

  // Map ethnicity to style
  const ETHNICITY_TO_STYLE: Record<string, string> = {
    'AIAN': 'Style A',
    'Asian': 'Style B',
    'Black': 'Style C',
    'Hispanic': 'Style D',
    'MENA': 'Style E',
    'NHPI': 'Style F',
    'White': 'Style G',
    // X_ prefixed are non-validated but still usable
    'X_AIAN': 'Style A',
    'X_MENA': 'Style E',
    'X_NHPI': 'Style F',
  };

  // Map outfit abbreviation to full name
  const OUTFIT_MAP: Record<string, string> = {
    'Casual': 'Casual',
    'Busi': 'Business',
    'Medi': 'Medical',
    'Milit': 'Military',
    'Util': 'Utility',
  };

  const style = ETHNICITY_TO_STYLE[entry.ethnicity] || 'Style B';
  const outfit = OUTFIT_MAP[entry.outfit] || 'Casual';
  const genderLabel = entry.gender === 'M' ? 'Male' : 'Female';
  const name = `${style} ${genderLabel} ${entry.num} ${outfit}`;

  return {
    id,
    name,
    modelPath: entry.model,
    thumbnailPath: entry.image,
    gender: entry.gender as 'M' | 'F',
    style,
    outfit,
    source: source.id,
  };
}

/**
 * Normalize a Polygonal Mind manifest entry (future)
 */
export function normalizePolygonalMindEntry(
  entry: PolygonalMindManifestEntry,
  source: AvatarSource
): NormalizedManifestEntry {
  // Infer gender from name if not provided
  let gender: 'M' | 'F' = 'M';
  if (entry.gender) {
    gender = entry.gender;
  } else {
    // Simple heuristic: check for female indicators in name
    const nameLower = entry.name.toLowerCase();
    if (
      nameLower.includes('female') ||
      nameLower.includes('woman') ||
      nameLower.includes('girl') ||
      nameLower.includes('lady')
    ) {
      gender = 'F';
    }
  }

  return {
    id: `pm_${entry.id}`,
    name: entry.name,
    modelPath: entry.model,
    thumbnailPath: entry.thumbnail,
    gender,
    style: entry.style || 'Style B',
    outfit: 'Casual',
    source: source.id,
  };
}

// =============================================================================
// EXPORTS
// =============================================================================

export default {
  AVATAR_SOURCES,
  getEnabledSources,
  getSourceById,
  getPrimarySource,
  isSourceEnabled,
  getAvatarUrlForSource,
  getThumbnailUrlForSource,
  normalizeValidEntry,
  normalizePolygonalMindEntry,
};
