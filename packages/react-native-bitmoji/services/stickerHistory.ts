/**
 * Sticker History Service
 *
 * Manages sticker usage history and favorites using AsyncStorage.
 * Provides hooks and utilities for tracking recently used stickers.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// ============================================================================
// CONSTANTS
// ============================================================================

const STORAGE_KEYS = {
  RECENT_STICKERS: '@stickers/recent',
  FAVORITE_STICKERS: '@stickers/favorites',
  USAGE_STATS: '@stickers/usage_stats',
};

const MAX_RECENT_STICKERS = 50;
const MAX_FAVORITES = 100;

// ============================================================================
// TYPES
// ============================================================================

export interface StickerUsageEntry {
  stickerId: string;
  lastUsed: number;
  useCount: number;
}

export interface StickerStats {
  totalUsed: number;
  favoriteCount: number;
  recentCount: number;
  mostUsed: string[];
}

// ============================================================================
// RECENT STICKERS
// ============================================================================

/**
 * Get recently used sticker IDs
 */
export async function getRecentStickerIds(): Promise<string[]> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.RECENT_STICKERS);
    if (!data) return [];
    return JSON.parse(data) as string[];
  } catch (error) {
    console.error('Error getting recent stickers:', error);
    return [];
  }
}

/**
 * Add a sticker to recent history
 */
export async function addToRecentStickers(stickerId: string): Promise<void> {
  try {
    const recent = await getRecentStickerIds();

    // Remove if already exists (will be re-added at front)
    const filtered = recent.filter(id => id !== stickerId);

    // Add to front
    filtered.unshift(stickerId);

    // Trim to max size
    const trimmed = filtered.slice(0, MAX_RECENT_STICKERS);

    await AsyncStorage.setItem(STORAGE_KEYS.RECENT_STICKERS, JSON.stringify(trimmed));

    // Also update usage stats
    await incrementUsageCount(stickerId);
  } catch (error) {
    console.error('Error adding to recent stickers:', error);
  }
}

/**
 * Clear recent stickers history
 */
export async function clearRecentStickers(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEYS.RECENT_STICKERS);
  } catch (error) {
    console.error('Error clearing recent stickers:', error);
  }
}

// ============================================================================
// FAVORITE STICKERS
// ============================================================================

/**
 * Get favorite sticker IDs
 */
export async function getFavoriteStickerIds(): Promise<string[]> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.FAVORITE_STICKERS);
    if (!data) return [];
    return JSON.parse(data) as string[];
  } catch (error) {
    console.error('Error getting favorite stickers:', error);
    return [];
  }
}

/**
 * Check if a sticker is favorited
 */
export async function isStickerFavorite(stickerId: string): Promise<boolean> {
  const favorites = await getFavoriteStickerIds();
  return favorites.includes(stickerId);
}

/**
 * Toggle favorite status of a sticker
 */
export async function toggleFavoriteSticker(stickerId: string): Promise<boolean> {
  try {
    const favorites = await getFavoriteStickerIds();
    const index = favorites.indexOf(stickerId);

    if (index > -1) {
      // Remove from favorites
      favorites.splice(index, 1);
      await AsyncStorage.setItem(STORAGE_KEYS.FAVORITE_STICKERS, JSON.stringify(favorites));
      return false;
    } else {
      // Add to favorites (at front, limited by max)
      favorites.unshift(stickerId);
      const trimmed = favorites.slice(0, MAX_FAVORITES);
      await AsyncStorage.setItem(STORAGE_KEYS.FAVORITE_STICKERS, JSON.stringify(trimmed));
      return true;
    }
  } catch (error) {
    console.error('Error toggling favorite:', error);
    return false;
  }
}

/**
 * Add a sticker to favorites
 */
export async function addToFavorites(stickerId: string): Promise<void> {
  try {
    const favorites = await getFavoriteStickerIds();
    if (!favorites.includes(stickerId)) {
      favorites.unshift(stickerId);
      const trimmed = favorites.slice(0, MAX_FAVORITES);
      await AsyncStorage.setItem(STORAGE_KEYS.FAVORITE_STICKERS, JSON.stringify(trimmed));
    }
  } catch (error) {
    console.error('Error adding to favorites:', error);
  }
}

/**
 * Remove a sticker from favorites
 */
export async function removeFromFavorites(stickerId: string): Promise<void> {
  try {
    const favorites = await getFavoriteStickerIds();
    const filtered = favorites.filter(id => id !== stickerId);
    await AsyncStorage.setItem(STORAGE_KEYS.FAVORITE_STICKERS, JSON.stringify(filtered));
  } catch (error) {
    console.error('Error removing from favorites:', error);
  }
}

/**
 * Clear all favorites
 */
export async function clearFavorites(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEYS.FAVORITE_STICKERS);
  } catch (error) {
    console.error('Error clearing favorites:', error);
  }
}

// ============================================================================
// USAGE STATISTICS
// ============================================================================

/**
 * Get usage statistics for all stickers
 */
export async function getUsageStats(): Promise<Record<string, StickerUsageEntry>> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.USAGE_STATS);
    if (!data) return {};
    return JSON.parse(data) as Record<string, StickerUsageEntry>;
  } catch (error) {
    console.error('Error getting usage stats:', error);
    return {};
  }
}

/**
 * Increment usage count for a sticker
 */
export async function incrementUsageCount(stickerId: string): Promise<void> {
  try {
    const stats = await getUsageStats();
    const now = Date.now();

    if (stats[stickerId]) {
      stats[stickerId].useCount += 1;
      stats[stickerId].lastUsed = now;
    } else {
      stats[stickerId] = {
        stickerId,
        lastUsed: now,
        useCount: 1,
      };
    }

    await AsyncStorage.setItem(STORAGE_KEYS.USAGE_STATS, JSON.stringify(stats));
  } catch (error) {
    console.error('Error incrementing usage count:', error);
  }
}

/**
 * Get most used sticker IDs
 */
export async function getMostUsedStickerIds(limit: number = 20): Promise<string[]> {
  try {
    const stats = await getUsageStats();
    const entries = Object.values(stats);

    return entries
      .sort((a, b) => b.useCount - a.useCount)
      .slice(0, limit)
      .map(entry => entry.stickerId);
  } catch (error) {
    console.error('Error getting most used stickers:', error);
    return [];
  }
}

/**
 * Get sticker stats summary
 */
export async function getStickerStatsSummary(): Promise<StickerStats> {
  try {
    const [recent, favorites, stats] = await Promise.all([
      getRecentStickerIds(),
      getFavoriteStickerIds(),
      getUsageStats(),
    ]);

    const entries = Object.values(stats);
    const totalUsed = entries.reduce((sum, entry) => sum + entry.useCount, 0);
    const mostUsed = entries
      .sort((a, b) => b.useCount - a.useCount)
      .slice(0, 10)
      .map(entry => entry.stickerId);

    return {
      totalUsed,
      favoriteCount: favorites.length,
      recentCount: recent.length,
      mostUsed,
    };
  } catch (error) {
    console.error('Error getting stats summary:', error);
    return {
      totalUsed: 0,
      favoriteCount: 0,
      recentCount: 0,
      mostUsed: [],
    };
  }
}

/**
 * Clear all sticker data
 */
export async function clearAllStickerData(): Promise<void> {
  try {
    await AsyncStorage.multiRemove([
      STORAGE_KEYS.RECENT_STICKERS,
      STORAGE_KEYS.FAVORITE_STICKERS,
      STORAGE_KEYS.USAGE_STATS,
    ]);
  } catch (error) {
    console.error('Error clearing all sticker data:', error);
  }
}

// ============================================================================
// REACT HOOKS
// ============================================================================

import { useState, useEffect, useCallback } from 'react';

/**
 * Hook to manage recent stickers
 */
export function useRecentStickers() {
  const [recentIds, setRecentIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load recent stickers on mount
  useEffect(() => {
    loadRecent();
  }, []);

  const loadRecent = useCallback(async () => {
    setIsLoading(true);
    const ids = await getRecentStickerIds();
    setRecentIds(ids);
    setIsLoading(false);
  }, []);

  const addRecent = useCallback(async (stickerId: string) => {
    await addToRecentStickers(stickerId);
    await loadRecent();
  }, [loadRecent]);

  const clearRecent = useCallback(async () => {
    await clearRecentStickers();
    setRecentIds([]);
  }, []);

  return {
    recentIds,
    isLoading,
    addRecent,
    clearRecent,
    refresh: loadRecent,
  };
}

/**
 * Hook to manage favorite stickers
 */
export function useFavoriteStickers() {
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load favorites on mount
  useEffect(() => {
    loadFavorites();
  }, []);

  const loadFavorites = useCallback(async () => {
    setIsLoading(true);
    const ids = await getFavoriteStickerIds();
    setFavoriteIds(ids);
    setIsLoading(false);
  }, []);

  const toggleFavorite = useCallback(async (stickerId: string) => {
    const isFavorite = await toggleFavoriteSticker(stickerId);
    await loadFavorites();
    return isFavorite;
  }, [loadFavorites]);

  const isFavorite = useCallback(
    (stickerId: string) => favoriteIds.includes(stickerId),
    [favoriteIds]
  );

  const clearAllFavorites = useCallback(async () => {
    await clearFavorites();
    setFavoriteIds([]);
  }, []);

  return {
    favoriteIds,
    favoriteSet: new Set(favoriteIds),
    isLoading,
    toggleFavorite,
    isFavorite,
    clearAll: clearAllFavorites,
    refresh: loadFavorites,
  };
}

/**
 * Combined hook for sticker history (recent + favorites)
 */
export function useStickerHistory() {
  const recent = useRecentStickers();
  const favorites = useFavoriteStickers();

  const isLoading = recent.isLoading || favorites.isLoading;

  const refresh = useCallback(async () => {
    await Promise.all([recent.refresh(), favorites.refresh()]);
  }, [recent, favorites]);

  return {
    recentIds: recent.recentIds,
    favoriteIds: favorites.favoriteIds,
    favoriteSet: favorites.favoriteSet,
    isLoading,
    addRecent: recent.addRecent,
    toggleFavorite: favorites.toggleFavorite,
    isFavorite: favorites.isFavorite,
    clearRecent: recent.clearRecent,
    clearFavorites: favorites.clearAll,
    refresh,
  };
}
