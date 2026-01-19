/**
 * 2D Avatar Storage Utilities
 *
 * Provides functions for saving/loading 2D avatars to AsyncStorage
 * and preparing avatar data for Supabase.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { StoredAvatar2D, Avatar2DConfig, DEFAULT_AVATAR_CONFIG } from '@/components/avatar2d/types';

const AVATAR_STORAGE_KEY = '@avatar2d_user';
const AVATAR_VERSION = '2d_v1';

/**
 * Generate a unique avatar ID
 */
export function generateAvatarId(): string {
  return `avatar_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Create a new StoredAvatar2D from config
 */
export function createStoredAvatar(config: Avatar2DConfig): StoredAvatar2D {
  const now = new Date().toISOString();
  return {
    id: generateAvatarId(),
    type: '2d',
    config,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Save avatar to local storage for current user
 */
export async function saveCurrentUserAvatar(avatar: StoredAvatar2D): Promise<void> {
  try {
    await AsyncStorage.setItem(AVATAR_STORAGE_KEY, JSON.stringify(avatar));
  } catch (error) {
    console.error('Failed to save avatar:', error);
    throw error;
  }
}

/**
 * Load avatar from local storage for current user
 */
export async function loadCurrentUserAvatar(): Promise<StoredAvatar2D | null> {
  try {
    const data = await AsyncStorage.getItem(AVATAR_STORAGE_KEY);
    if (!data) return null;
    return JSON.parse(data) as StoredAvatar2D;
  } catch (error) {
    console.error('Failed to load avatar:', error);
    return null;
  }
}

/**
 * Clear local avatar cache
 */
export async function clearLocalAvatarCache(): Promise<void> {
  try {
    await AsyncStorage.removeItem(AVATAR_STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear avatar cache:', error);
  }
}

/**
 * Update avatar config and refresh timestamps
 */
export function updateAvatarConfig(
  avatar: StoredAvatar2D,
  newConfig: Partial<Avatar2DConfig>
): StoredAvatar2D {
  return {
    ...avatar,
    config: { ...avatar.config, ...newConfig },
    updatedAt: new Date().toISOString(),
    base64: undefined, // Clear cached render when config changes
  };
}

/**
 * Create a default avatar for new users
 */
export function createDefaultAvatar(): StoredAvatar2D {
  return createStoredAvatar(DEFAULT_AVATAR_CONFIG);
}

/**
 * Serialize avatar for database storage
 */
export function serializeAvatarForDb(avatar: StoredAvatar2D): string {
  return JSON.stringify({
    ...avatar,
    base64: undefined, // Don't store cached render in DB
  });
}

/**
 * Deserialize avatar from database
 */
export function deserializeAvatarFromDb(data: string | null): StoredAvatar2D | null {
  if (!data) return null;
  try {
    const parsed = JSON.parse(data);
    // Validate it's a 2D avatar
    if (parsed.type !== '2d' || !parsed.config) {
      return null;
    }
    return parsed as StoredAvatar2D;
  } catch {
    return null;
  }
}

/**
 * Migrate old avatar format to new 2D format (returns null to signal fresh start)
 * Per the migration plan, we don't migrate - users create new avatars
 */
export function migrateOldAvatar(_oldAvatar: unknown): StoredAvatar2D | null {
  // Fresh start - no migration
  return null;
}

/**
 * Check if avatar needs to be created (null or invalid)
 */
export function needsAvatarCreation(avatar: unknown): boolean {
  if (!avatar) return true;
  if (typeof avatar !== 'object') return true;
  const obj = avatar as { type?: string };
  return obj.type !== '2d';
}

/**
 * Cache avatar render as base64
 */
export async function cacheAvatarRender(
  avatar: StoredAvatar2D,
  base64: string
): Promise<StoredAvatar2D> {
  const updated = {
    ...avatar,
    base64,
    updatedAt: new Date().toISOString(),
  };
  await saveCurrentUserAvatar(updated);
  return updated;
}
