/**
 * Avatar Storage Utilities
 *
 * Functions for persisting and retrieving avatar configurations
 * using AsyncStorage.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { AvatarConfig, StoredAvatar, isStoredAvatar, DEFAULT_MALE_CONFIG } from './types';

// Storage keys
const STORAGE_KEYS = {
  CURRENT_AVATAR: '@avatar/current',
  AVATAR_LIST: '@avatar/list',
  AVATAR_PREFIX: '@avatar/saved/',
  FAVORITES: '@avatar/favorites',
} as const;

// Favorites type: maps category.optionId to boolean
export type FavoritesMap = Record<string, boolean>;

/**
 * Generate a unique ID for a new avatar
 */
function generateAvatarId(): string {
  const now = Date.now();
  return `avatar_${now}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Create a StoredAvatar object from an AvatarConfig
 */
export function createStoredAvatar(
  config: AvatarConfig,
  name?: string
): StoredAvatar {
  const now = Date.now();
  return {
    id: generateAvatarId(),
    config,
    name,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Save the current/active avatar configuration
 */
export async function saveCurrentAvatar(config: AvatarConfig): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.CURRENT_AVATAR, JSON.stringify(config));
  } catch (error) {
    console.error('Failed to save current avatar:', error);
    throw error;
  }
}

/**
 * Load the current/active avatar configuration
 */
export async function loadCurrentAvatar(): Promise<AvatarConfig> {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEYS.CURRENT_AVATAR);
    if (stored) {
      const parsed = JSON.parse(stored);
      return { ...DEFAULT_MALE_CONFIG, ...parsed };
    }
    return DEFAULT_MALE_CONFIG;
  } catch (error) {
    console.error('Failed to load current avatar:', error);
    return DEFAULT_MALE_CONFIG;
  }
}

/**
 * Save an avatar to the saved avatars list
 */
export async function saveAvatar(
  config: AvatarConfig,
  name?: string
): Promise<StoredAvatar> {
  try {
    const storedAvatar = createStoredAvatar(config, name);

    // Save the avatar data
    await AsyncStorage.setItem(
      `${STORAGE_KEYS.AVATAR_PREFIX}${storedAvatar.id}`,
      JSON.stringify(storedAvatar)
    );

    // Update the list of avatar IDs
    const listStr = await AsyncStorage.getItem(STORAGE_KEYS.AVATAR_LIST);
    const list: string[] = listStr ? JSON.parse(listStr) : [];
    list.push(storedAvatar.id);
    await AsyncStorage.setItem(STORAGE_KEYS.AVATAR_LIST, JSON.stringify(list));

    return storedAvatar;
  } catch (error) {
    console.error('Failed to save avatar:', error);
    throw error;
  }
}

/**
 * Load all saved avatars
 */
export async function loadAllAvatars(): Promise<StoredAvatar[]> {
  try {
    const listStr = await AsyncStorage.getItem(STORAGE_KEYS.AVATAR_LIST);
    if (!listStr) return [];

    const list: string[] = JSON.parse(listStr);
    const avatars: StoredAvatar[] = [];

    for (const id of list) {
      const avatarStr = await AsyncStorage.getItem(`${STORAGE_KEYS.AVATAR_PREFIX}${id}`);
      if (avatarStr) {
        const avatar = JSON.parse(avatarStr);
        if (isStoredAvatar(avatar)) {
          avatars.push(avatar);
        }
      }
    }

    // Sort by updatedAt descending (newest first)
    return avatars.sort((a, b) => (b.updatedAt as number) - (a.updatedAt as number));
  } catch (error) {
    console.error('Failed to load avatars:', error);
    return [];
  }
}

/**
 * Load a specific avatar by ID
 */
export async function loadAvatar(id: string): Promise<StoredAvatar | null> {
  try {
    const avatarStr = await AsyncStorage.getItem(`${STORAGE_KEYS.AVATAR_PREFIX}${id}`);
    if (avatarStr) {
      const avatar = JSON.parse(avatarStr);
      if (isStoredAvatar(avatar)) {
        return avatar;
      }
    }
    return null;
  } catch (error) {
    console.error('Failed to load avatar:', error);
    return null;
  }
}

/**
 * Update an existing saved avatar
 */
export async function updateAvatar(
  id: string,
  updates: Partial<AvatarConfig>,
  name?: string
): Promise<StoredAvatar | null> {
  try {
    const existing = await loadAvatar(id);
    if (!existing) return null;

    const now = Date.now();
    const updated: StoredAvatar = {
      ...existing,
      config: { ...existing.config, ...updates },
      name: name !== undefined ? name : existing.name,
      updatedAt: now,
    };

    await AsyncStorage.setItem(
      `${STORAGE_KEYS.AVATAR_PREFIX}${id}`,
      JSON.stringify(updated)
    );

    return updated;
  } catch (error) {
    console.error('Failed to update avatar:', error);
    throw error;
  }
}

/**
 * Delete a saved avatar
 */
export async function deleteAvatar(id: string): Promise<boolean> {
  try {
    // Remove the avatar data
    await AsyncStorage.removeItem(`${STORAGE_KEYS.AVATAR_PREFIX}${id}`);

    // Update the list
    const listStr = await AsyncStorage.getItem(STORAGE_KEYS.AVATAR_LIST);
    if (listStr) {
      const list: string[] = JSON.parse(listStr);
      const updatedList = list.filter((avatarId) => avatarId !== id);
      await AsyncStorage.setItem(STORAGE_KEYS.AVATAR_LIST, JSON.stringify(updatedList));
    }

    return true;
  } catch (error) {
    console.error('Failed to delete avatar:', error);
    return false;
  }
}

/**
 * Clear all saved avatars
 */
export async function clearAllAvatars(): Promise<void> {
  try {
    const listStr = await AsyncStorage.getItem(STORAGE_KEYS.AVATAR_LIST);
    if (listStr) {
      const list: string[] = JSON.parse(listStr);
      for (const id of list) {
        await AsyncStorage.removeItem(`${STORAGE_KEYS.AVATAR_PREFIX}${id}`);
      }
    }
    await AsyncStorage.removeItem(STORAGE_KEYS.AVATAR_LIST);
    await AsyncStorage.removeItem(STORAGE_KEYS.CURRENT_AVATAR);
  } catch (error) {
    console.error('Failed to clear avatars:', error);
    throw error;
  }
}

/**
 * Export avatar as JSON string (for sharing/backup)
 */
export function exportAvatarAsJson(avatar: StoredAvatar): string {
  return JSON.stringify(avatar, null, 2);
}

/**
 * Import avatar from JSON string
 */
export function importAvatarFromJson(json: string): StoredAvatar | null {
  try {
    const parsed = JSON.parse(json);
    if (isStoredAvatar(parsed)) {
      const now = Date.now();
      return {
        ...parsed,
        id: generateAvatarId(), // Generate new ID for imported avatar
        createdAt: now,
        updatedAt: now,
      };
    }
    return null;
  } catch (error) {
    console.error('Failed to import avatar:', error);
    return null;
  }
}

// Aliases for backwards compatibility
export const saveAvatarConfig = saveCurrentAvatar;
export const loadAvatarConfig = async (key?: string): Promise<AvatarConfig | null> => {
  if (key === 'current') {
    return loadCurrentAvatar();
  }
  const avatar = key ? await loadAvatar(key) : null;
  return avatar?.config || null;
};

// =============================================================================
// FAVORITES SYSTEM
// =============================================================================

/**
 * Create a favorite key from category and option ID
 */
export function createFavoriteKey(category: string, optionId: string): string {
  return `${category}:${optionId}`;
}

/**
 * Parse a favorite key into category and option ID
 */
export function parseFavoriteKey(key: string): { category: string; optionId: string } | null {
  const parts = key.split(':');
  if (parts.length !== 2) return null;
  return { category: parts[0], optionId: parts[1] };
}

/**
 * Load all favorites from storage
 */
export async function loadFavorites(): Promise<FavoritesMap> {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEYS.FAVORITES);
    if (stored) {
      return JSON.parse(stored);
    }
    return {};
  } catch (error) {
    console.error('Failed to load favorites:', error);
    return {};
  }
}

/**
 * Save all favorites to storage
 */
export async function saveFavorites(favorites: FavoritesMap): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(favorites));
  } catch (error) {
    console.error('Failed to save favorites:', error);
    throw error;
  }
}

/**
 * Toggle a favorite item
 */
export async function toggleFavorite(
  category: string,
  optionId: string
): Promise<boolean> {
  try {
    const favorites = await loadFavorites();
    const key = createFavoriteKey(category, optionId);
    const newValue = !favorites[key];

    if (newValue) {
      favorites[key] = true;
    } else {
      delete favorites[key];
    }

    await saveFavorites(favorites);
    return newValue;
  } catch (error) {
    console.error('Failed to toggle favorite:', error);
    throw error;
  }
}

/**
 * Check if an item is favorited
 */
export async function isFavorite(
  category: string,
  optionId: string
): Promise<boolean> {
  try {
    const favorites = await loadFavorites();
    const key = createFavoriteKey(category, optionId);
    return favorites[key] === true;
  } catch (error) {
    console.error('Failed to check favorite:', error);
    return false;
  }
}

/**
 * Get all favorites for a specific category
 */
export async function getFavoritesForCategory(
  category: string
): Promise<string[]> {
  try {
    const favorites = await loadFavorites();
    const categoryPrefix = `${category}:`;
    return Object.keys(favorites)
      .filter(key => key.startsWith(categoryPrefix) && favorites[key])
      .map(key => key.replace(categoryPrefix, ''));
  } catch (error) {
    console.error('Failed to get favorites for category:', error);
    return [];
  }
}

/**
 * Clear all favorites
 */
export async function clearAllFavorites(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEYS.FAVORITES);
  } catch (error) {
    console.error('Failed to clear favorites:', error);
    throw error;
  }
}
