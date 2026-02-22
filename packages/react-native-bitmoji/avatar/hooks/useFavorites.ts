/**
 * useFavorites Hook
 *
 * Provides favorites management functionality for the Avatar Editor.
 * Allows users to favorite/unfavorite style options for quick access.
 */

import { useState, useCallback, useEffect } from 'react';
import {
  loadFavorites,
  saveFavorites,
  createFavoriteKey,
  FavoritesMap,
} from '../storage';

// =============================================================================
// TYPES
// =============================================================================

export interface UseFavoritesReturn {
  /** Map of all favorites (key -> boolean) */
  favorites: FavoritesMap;
  /** Whether favorites are being loaded */
  isLoading: boolean;
  /** Check if an item is favorited */
  isFavorited: (category: string, optionId: string) => boolean;
  /** Toggle favorite status for an item */
  toggleFavorite: (category: string, optionId: string) => Promise<void>;
  /** Get all favorited option IDs for a category */
  getFavoritesForCategory: (category: string) => string[];
  /** Whether to show only favorites */
  showOnlyFavorites: boolean;
  /** Toggle show only favorites mode */
  setShowOnlyFavorites: (value: boolean) => void;
  /** Total count of favorites */
  favoritesCount: number;
}

// =============================================================================
// HOOK
// =============================================================================

export function useFavorites(): UseFavoritesReturn {
  const [favorites, setFavorites] = useState<FavoritesMap>({});
  const [isLoading, setIsLoading] = useState(true);
  const [showOnlyFavorites, setShowOnlyFavorites] = useState(false);

  // Load favorites on mount
  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        const loaded = await loadFavorites();
        if (mounted) {
          setFavorites(loaded);
        }
      } catch (error) {
        console.error('Failed to load favorites:', error);
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    load();

    return () => {
      mounted = false;
    };
  }, []);

  // Check if an item is favorited
  const isFavorited = useCallback(
    (category: string, optionId: string): boolean => {
      const key = createFavoriteKey(category, optionId);
      return favorites[key] === true;
    },
    [favorites]
  );

  // Toggle favorite status
  const toggleFavorite = useCallback(
    async (category: string, optionId: string): Promise<void> => {
      const key = createFavoriteKey(category, optionId);
      const newFavorites = { ...favorites };

      if (newFavorites[key]) {
        delete newFavorites[key];
      } else {
        newFavorites[key] = true;
      }

      setFavorites(newFavorites);

      try {
        await saveFavorites(newFavorites);
      } catch (error) {
        // Revert on error
        setFavorites(favorites);
        console.error('Failed to save favorites:', error);
      }
    },
    [favorites]
  );

  // Get all favorited option IDs for a category
  const getFavoritesForCategory = useCallback(
    (category: string): string[] => {
      const categoryPrefix = `${category}:`;
      return Object.keys(favorites)
        .filter(key => key.startsWith(categoryPrefix) && favorites[key])
        .map(key => key.replace(categoryPrefix, ''));
    },
    [favorites]
  );

  // Total count of favorites
  const favoritesCount = Object.values(favorites).filter(Boolean).length;

  return {
    favorites,
    isLoading,
    isFavorited,
    toggleFavorite,
    getFavoritesForCategory,
    showOnlyFavorites,
    setShowOnlyFavorites,
    favoritesCount,
  };
}

export default useFavorites;
