/**
 * Avatar Snapshot Service
 *
 * Handles storage and caching of 3D avatar snapshots in Supabase Storage.
 * Generates deterministic hashes from avatar configs to enable caching.
 *
 * Task 16 of AVATAR_3D_PLAN.md - Snapshot Storage Service
 *
 * @example
 * ```typescript
 * import { getOrCreateSnapshot, hashConfig } from '../lib/avatar/snapshotService';
 *
 * // Get cached snapshot URL or generate new one
 * const url = await getOrCreateSnapshot(avatarConfig, snapshotGenerator);
 *
 * // Just get hash for checking
 * const hash = hashConfig(avatarConfig);
 * ```
 */

import { createClient } from '../supabase/client';
import type { AvatarConfig } from '../../components/avatar/types';

// =============================================================================
// CONSTANTS
// =============================================================================

/** Supabase storage bucket name for avatar snapshots */
export const AVATAR_SNAPSHOTS_BUCKET = 'avatar-snapshots';

/** Default snapshot image format */
export const DEFAULT_SNAPSHOT_FORMAT = 'png';

/** Default snapshot dimensions */
export const DEFAULT_SNAPSHOT_SIZE = {
  width: 512,
  height: 512,
};

/** Snapshot size presets */
export const SNAPSHOT_SIZES = {
  thumbnail: { width: 128, height: 128 },
  small: { width: 256, height: 256 },
  medium: { width: 512, height: 512 },
  large: { width: 1024, height: 1024 },
} as const;

export type SnapshotSizePreset = keyof typeof SNAPSHOT_SIZES;

// =============================================================================
// TYPES
// =============================================================================

export interface SnapshotOptions {
  /** Snapshot width in pixels */
  width?: number;
  /** Snapshot height in pixels */
  height?: number;
  /** Image format ('png' or 'jpeg') */
  format?: 'png' | 'jpeg';
  /** JPEG quality (0-100), only used for jpeg format */
  quality?: number;
  /** Use a size preset instead of custom dimensions */
  preset?: SnapshotSizePreset;
}

export interface SnapshotResult {
  /** Public URL of the snapshot */
  url: string;
  /** Config hash used for caching */
  hash: string;
  /** Whether snapshot was already cached */
  cached: boolean;
}

export interface UploadResult {
  success: boolean;
  path?: string;
  url?: string;
  error?: string;
}

export interface SnapshotExistsResult {
  exists: boolean;
  url?: string;
  path?: string;
}

/**
 * Function type for generating a snapshot from an avatar config.
 * This should be implemented by the 3D renderer (Task 15).
 * Returns base64-encoded image data.
 */
export type SnapshotGenerator = (
  config: AvatarConfig,
  options: SnapshotOptions
) => Promise<string>;

// =============================================================================
// HASH GENERATION
// =============================================================================

/**
 * Generate a deterministic hash from an avatar configuration.
 * The hash is used as the filename/key for caching snapshots.
 *
 * Algorithm:
 * 1. Sort config keys to ensure consistent ordering
 * 2. Create a JSON string
 * 3. Generate a hash using a simple but fast algorithm
 *
 * @param config - The avatar configuration to hash
 * @returns A deterministic hash string
 */
export function hashConfig(config: AvatarConfig): string {
  // Get sorted keys to ensure consistent ordering
  const sortedKeys = Object.keys(config).sort() as (keyof AvatarConfig)[];

  // Create a stable JSON representation
  const values = sortedKeys.map((key) => `${key}:${config[key]}`);
  const configString = values.join('|');

  // Simple hash function (DJB2 variant)
  // Fast and produces good distribution for our use case
  let hash = 5381;
  for (let i = 0; i < configString.length; i++) {
    const char = configString.charCodeAt(i);
    hash = ((hash << 5) + hash) ^ char; // hash * 33 ^ char
  }

  // Convert to hex and ensure positive
  const hashHex = (hash >>> 0).toString(16).padStart(8, '0');

  // Add a short checksum for additional uniqueness
  const checksum = configString.length.toString(16).padStart(4, '0');

  return `${hashHex}${checksum}`;
}

/**
 * Generate a hash that includes snapshot options for variant caching.
 * This allows caching different sizes of the same avatar config.
 *
 * @param config - The avatar configuration
 * @param options - Snapshot options (size, format)
 * @returns A deterministic hash string including options
 */
export function hashConfigWithOptions(
  config: AvatarConfig,
  options: SnapshotOptions = {}
): string {
  const baseHash = hashConfig(config);

  // Apply preset if specified
  const size = options.preset
    ? SNAPSHOT_SIZES[options.preset]
    : { width: options.width || DEFAULT_SNAPSHOT_SIZE.width, height: options.height || DEFAULT_SNAPSHOT_SIZE.height };

  const format = options.format || DEFAULT_SNAPSHOT_FORMAT;

  // Append options to hash
  const optionsString = `${size.width}x${size.height}_${format}`;
  let optionsHash = 0;
  for (let i = 0; i < optionsString.length; i++) {
    optionsHash = ((optionsHash << 5) + optionsHash) ^ optionsString.charCodeAt(i);
  }

  return `${baseHash}_${(optionsHash >>> 0).toString(16).padStart(4, '0')}`;
}

// =============================================================================
// STORAGE PATH HELPERS
// =============================================================================

/**
 * Get the storage path for a snapshot hash.
 *
 * @param hash - The config hash
 * @param format - Image format
 * @returns Storage path string
 */
export function getSnapshotPath(hash: string, format: 'png' | 'jpeg' = 'png'): string {
  // Use first 2 characters as subdirectory for better organization
  const subdir = hash.substring(0, 2);
  const ext = format === 'jpeg' ? 'jpg' : 'png';
  return `avatars/${subdir}/${hash}.${ext}`;
}

// =============================================================================
// SNAPSHOT STORAGE OPERATIONS
// =============================================================================

/**
 * Check if a snapshot exists in storage.
 *
 * @param hash - The config hash to check
 * @param format - Image format
 * @returns Object indicating existence and URL if found
 */
export async function checkSnapshotExists(
  hash: string,
  format: 'png' | 'jpeg' = 'png'
): Promise<SnapshotExistsResult> {
  try {
    const supabase = createClient();
    const path = getSnapshotPath(hash, format);

    // Try to get public URL - this will return a URL even if file doesn't exist
    // So we need to do a HEAD request or list to verify
    const { data, error } = await supabase.storage
      .from(AVATAR_SNAPSHOTS_BUCKET)
      .list(path.split('/').slice(0, -1).join('/'), {
        search: path.split('/').pop(),
      });

    if (error) {
      console.error('[snapshotService] Error checking snapshot:', error);
      return { exists: false };
    }

    const fileName = path.split('/').pop();
    const fileExists = data?.some((file) => file.name === fileName) ?? false;

    if (fileExists) {
      const { data: urlData } = supabase.storage
        .from(AVATAR_SNAPSHOTS_BUCKET)
        .getPublicUrl(path);

      return {
        exists: true,
        url: urlData.publicUrl,
        path,
      };
    }

    return { exists: false, path };
  } catch (err) {
    console.error('[snapshotService] Error checking snapshot:', err);
    return { exists: false };
  }
}

/**
 * Get the public URL for a snapshot hash.
 * Does not verify the file exists.
 *
 * @param hash - The config hash
 * @param format - Image format
 * @returns Public URL string
 */
export function getSnapshotUrl(hash: string, format: 'png' | 'jpeg' = 'png'): string {
  const supabase = createClient();
  const path = getSnapshotPath(hash, format);

  const { data } = supabase.storage
    .from(AVATAR_SNAPSHOTS_BUCKET)
    .getPublicUrl(path);

  return data.publicUrl;
}

/**
 * Upload a snapshot to storage.
 *
 * @param hash - The config hash (used as filename)
 * @param base64Data - Base64-encoded image data
 * @param format - Image format
 * @returns Upload result with URL if successful
 */
export async function uploadSnapshot(
  hash: string,
  base64Data: string,
  format: 'png' | 'jpeg' = 'png'
): Promise<UploadResult> {
  try {
    const supabase = createClient();
    const path = getSnapshotPath(hash, format);

    // Remove data URL prefix if present
    const base64Clean = base64Data.replace(/^data:image\/\w+;base64,/, '');

    // Convert base64 to Uint8Array for upload
    // In React Native, we use base64 encoding directly
    const contentType = format === 'jpeg' ? 'image/jpeg' : 'image/png';

    // Decode base64 to binary
    // Note: Use Buffer for React Native or a polyfill since atob isn't available
    // Use a simple base64 decoder that works in both environments
    const base64Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    const lookup = new Uint8Array(256);
    for (let i = 0; i < base64Chars.length; i++) {
      lookup[base64Chars.charCodeAt(i)] = i;
    }

    const len = base64Clean.length;
    let bufferLength = Math.floor(len * 0.75);
    if (base64Clean[len - 1] === '=') bufferLength--;
    if (base64Clean[len - 2] === '=') bufferLength--;

    const bytes = new Uint8Array(bufferLength);
    let p = 0;
    for (let i = 0; i < len; i += 4) {
      const encoded1 = lookup[base64Clean.charCodeAt(i)];
      const encoded2 = lookup[base64Clean.charCodeAt(i + 1)];
      const encoded3 = lookup[base64Clean.charCodeAt(i + 2)];
      const encoded4 = lookup[base64Clean.charCodeAt(i + 3)];

      bytes[p++] = (encoded1 << 2) | (encoded2 >> 4);
      if (p < bufferLength) bytes[p++] = ((encoded2 & 15) << 4) | (encoded3 >> 2);
      if (p < bufferLength) bytes[p++] = ((encoded3 & 3) << 6) | (encoded4 & 63);
    }

    const { data, error } = await supabase.storage
      .from(AVATAR_SNAPSHOTS_BUCKET)
      .upload(path, bytes, {
        contentType,
        cacheControl: '31536000', // Cache for 1 year (immutable based on hash)
        upsert: true, // Overwrite if exists (same hash = same content)
      });

    if (error) {
      console.error('[snapshotService] Upload error:', error);
      return { success: false, error: error.message };
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(AVATAR_SNAPSHOTS_BUCKET)
      .getPublicUrl(path);

    console.log('[snapshotService] Snapshot uploaded:', path);

    return {
      success: true,
      path: data.path,
      url: urlData.publicUrl,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[snapshotService] Upload error:', message);
    return { success: false, error: message };
  }
}

/**
 * Delete a snapshot from storage.
 *
 * @param hash - The config hash
 * @param format - Image format
 * @returns Success boolean
 */
export async function deleteSnapshot(
  hash: string,
  format: 'png' | 'jpeg' = 'png'
): Promise<boolean> {
  try {
    const supabase = createClient();
    const path = getSnapshotPath(hash, format);

    const { error } = await supabase.storage
      .from(AVATAR_SNAPSHOTS_BUCKET)
      .remove([path]);

    if (error) {
      console.error('[snapshotService] Delete error:', error);
      return false;
    }

    console.log('[snapshotService] Snapshot deleted:', path);
    return true;
  } catch (err) {
    console.error('[snapshotService] Delete error:', err);
    return false;
  }
}

// =============================================================================
// MAIN API
// =============================================================================

/**
 * Get or create a snapshot for an avatar configuration.
 *
 * This is the main entry point for snapshot management:
 * 1. Generate a hash from the config
 * 2. Check if snapshot already exists in storage
 * 3. If exists, return cached URL
 * 4. If not, generate snapshot using provided generator function
 * 5. Upload to storage
 * 6. Return URL
 *
 * @param config - The avatar configuration
 * @param generator - Function to generate snapshot (from Task 15)
 * @param options - Snapshot options
 * @returns Snapshot result with URL and cache status
 */
export async function getOrCreateSnapshot(
  config: AvatarConfig,
  generator: SnapshotGenerator,
  options: SnapshotOptions = {}
): Promise<SnapshotResult> {
  const format = options.format || DEFAULT_SNAPSHOT_FORMAT;

  // Generate hash including options for proper cache keying
  const hash = hashConfigWithOptions(config, options);

  // Check if snapshot already exists
  const existsResult = await checkSnapshotExists(hash, format);

  if (existsResult.exists && existsResult.url) {
    console.log('[snapshotService] Using cached snapshot:', hash);
    return {
      url: existsResult.url,
      hash,
      cached: true,
    };
  }

  // Generate new snapshot
  console.log('[snapshotService] Generating new snapshot:', hash);

  // Resolve size from preset or options
  const size = options.preset
    ? SNAPSHOT_SIZES[options.preset]
    : {
        width: options.width || DEFAULT_SNAPSHOT_SIZE.width,
        height: options.height || DEFAULT_SNAPSHOT_SIZE.height,
      };

  const generatorOptions: SnapshotOptions = {
    ...options,
    width: size.width,
    height: size.height,
  };

  const base64 = await generator(config, generatorOptions);

  // Upload to storage
  const uploadResult = await uploadSnapshot(hash, base64, format);

  if (!uploadResult.success || !uploadResult.url) {
    throw new Error(uploadResult.error || 'Failed to upload snapshot');
  }

  return {
    url: uploadResult.url,
    hash,
    cached: false,
  };
}

/**
 * Get snapshot URL for a config if it exists (cached only).
 * Does not generate a new snapshot if not found.
 *
 * @param config - The avatar configuration
 * @param options - Snapshot options
 * @returns URL if cached, null otherwise
 */
export async function getCachedSnapshotUrl(
  config: AvatarConfig,
  options: SnapshotOptions = {}
): Promise<string | null> {
  const format = options.format || DEFAULT_SNAPSHOT_FORMAT;
  const hash = hashConfigWithOptions(config, options);

  const existsResult = await checkSnapshotExists(hash, format);

  return existsResult.exists && existsResult.url ? existsResult.url : null;
}

/**
 * Upload a pre-generated snapshot directly.
 * Useful when snapshot generation happens externally.
 *
 * @param config - The avatar configuration (for hash generation)
 * @param base64Data - Pre-generated base64 image data
 * @param options - Snapshot options
 * @returns Snapshot result
 */
export async function uploadPreGeneratedSnapshot(
  config: AvatarConfig,
  base64Data: string,
  options: SnapshotOptions = {}
): Promise<SnapshotResult> {
  const format = options.format || DEFAULT_SNAPSHOT_FORMAT;
  const hash = hashConfigWithOptions(config, options);

  const uploadResult = await uploadSnapshot(hash, base64Data, format);

  if (!uploadResult.success || !uploadResult.url) {
    throw new Error(uploadResult.error || 'Failed to upload snapshot');
  }

  return {
    url: uploadResult.url,
    hash,
    cached: false,
  };
}

// =============================================================================
// IN-MEMORY URL CACHE
// =============================================================================

/** In-memory cache for snapshot URLs to avoid redundant storage checks */
const urlCache = new Map<string, string>();

/** Maximum number of entries in URL cache */
const URL_CACHE_MAX_SIZE = 500;

/**
 * Get a cached URL from memory (avoids storage check).
 *
 * @param hash - The config hash
 * @returns Cached URL or null
 */
export function getMemoryCachedUrl(hash: string): string | null {
  return urlCache.get(hash) || null;
}

/**
 * Add a URL to the memory cache.
 *
 * @param hash - The config hash
 * @param url - The snapshot URL
 */
export function setMemoryCachedUrl(hash: string, url: string): void {
  // Simple LRU-like behavior: clear oldest entries if cache is full
  if (urlCache.size >= URL_CACHE_MAX_SIZE) {
    const firstKey = urlCache.keys().next().value;
    if (firstKey) {
      urlCache.delete(firstKey);
    }
  }
  urlCache.set(hash, url);
}

/**
 * Clear the in-memory URL cache.
 */
export function clearMemoryCache(): void {
  urlCache.clear();
}

/**
 * Get snapshot URL with memory caching layer.
 * Checks memory cache first, then storage.
 *
 * @param config - The avatar configuration
 * @param options - Snapshot options
 * @returns URL if found (memory or storage), null otherwise
 */
export async function getCachedSnapshotUrlWithMemory(
  config: AvatarConfig,
  options: SnapshotOptions = {}
): Promise<string | null> {
  const hash = hashConfigWithOptions(config, options);

  // Check memory cache first
  const memoryCached = getMemoryCachedUrl(hash);
  if (memoryCached) {
    return memoryCached;
  }

  // Check storage
  const url = await getCachedSnapshotUrl(config, options);

  // Add to memory cache if found
  if (url) {
    setMemoryCachedUrl(hash, url);
  }

  return url;
}

// =============================================================================
// EXPORTS
// =============================================================================

export const snapshotService = {
  // Hash functions
  hashConfig,
  hashConfigWithOptions,

  // Path helpers
  getSnapshotPath,
  getSnapshotUrl,

  // Storage operations
  checkSnapshotExists,
  uploadSnapshot,
  deleteSnapshot,

  // Main API
  getOrCreateSnapshot,
  getCachedSnapshotUrl,
  uploadPreGeneratedSnapshot,

  // Memory cache
  getMemoryCachedUrl,
  setMemoryCachedUrl,
  clearMemoryCache,
  getCachedSnapshotUrlWithMemory,

  // Constants
  BUCKET: AVATAR_SNAPSHOTS_BUCKET,
  SIZES: SNAPSHOT_SIZES,
};

export default snapshotService;
