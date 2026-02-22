/**
 * Sticker Packs Module
 *
 * Exports all pre-built sticker packs and provides utility functions
 * for searching and filtering stickers.
 */

import { Sticker, StickerPack, StickerCategory, StickerFilter } from '../types';

// Import all sticker packs
export { GREETINGS_STICKERS, GREETINGS_PACK } from './greetings';
export { REACTIONS_STICKERS, REACTIONS_PACK } from './reactions';
export { EMOTIONS_STICKERS, EMOTIONS_PACK } from './emotions';
export { ACTIVITIES_STICKERS, ACTIVITIES_PACK } from './activities';
export { CELEBRATIONS_STICKERS, CELEBRATIONS_PACK } from './celebrations';

import { GREETINGS_PACK } from './greetings';
import { REACTIONS_PACK } from './reactions';
import { EMOTIONS_PACK } from './emotions';
import { ACTIVITIES_PACK } from './activities';
import { CELEBRATIONS_PACK } from './celebrations';

// ============================================================================
// ALL PACKS
// ============================================================================

/**
 * All available sticker packs
 */
export const ALL_STICKER_PACKS: StickerPack[] = [
  GREETINGS_PACK,
  REACTIONS_PACK,
  EMOTIONS_PACK,
  ACTIVITIES_PACK,
  CELEBRATIONS_PACK,
];

/**
 * All stickers from all packs combined
 */
export const ALL_STICKERS: Sticker[] = ALL_STICKER_PACKS.flatMap(pack => pack.stickers);

/**
 * Total number of stickers available
 */
export const TOTAL_STICKER_COUNT = ALL_STICKERS.length;

// ============================================================================
// SEARCH & FILTER UTILITIES
// ============================================================================

/**
 * Search stickers by query string
 * Searches name, tags, and text overlay
 */
export function searchStickers(query: string, stickers: Sticker[] = ALL_STICKERS): Sticker[] {
  const lowerQuery = query.toLowerCase().trim();
  if (!lowerQuery) return stickers;

  return stickers.filter(sticker => {
    // Search in name
    if (sticker.name.toLowerCase().includes(lowerQuery)) return true;

    // Search in tags
    if (sticker.tags.some(tag => tag.toLowerCase().includes(lowerQuery))) return true;

    // Search in text overlay
    if (sticker.textOverlay?.toLowerCase().includes(lowerQuery)) return true;

    return false;
  });
}

/**
 * Filter stickers by category
 */
export function filterByCategory(category: StickerCategory, stickers: Sticker[] = ALL_STICKERS): Sticker[] {
  return stickers.filter(sticker => sticker.category === category);
}

/**
 * Filter stickers by multiple criteria
 */
export function filterStickers(filter: StickerFilter, stickers: Sticker[] = ALL_STICKERS): Sticker[] {
  let results = stickers;

  // Filter by query
  if (filter.query) {
    results = searchStickers(filter.query, results);
  }

  // Filter by category
  if (filter.category) {
    results = results.filter(s => s.category === filter.category);
  }

  // Filter by emotion
  if (filter.emotion) {
    results = results.filter(s => s.emotion === filter.emotion);
  }

  // Filter by pose
  if (filter.pose) {
    results = results.filter(s => s.pose === filter.pose);
  }

  // Filter by tags (match any)
  if (filter.tags && filter.tags.length > 0) {
    results = results.filter(sticker =>
      filter.tags!.some(tag =>
        sticker.tags.some(stickerTag =>
          stickerTag.toLowerCase().includes(tag.toLowerCase())
        )
      )
    );
  }

  return results;
}

/**
 * Get stickers by pack ID
 */
export function getStickersByPackId(packId: string): Sticker[] {
  const pack = ALL_STICKER_PACKS.find(p => p.id === packId);
  return pack?.stickers ?? [];
}

/**
 * Get a sticker by its ID
 */
export function getStickerById(stickerId: string): Sticker | undefined {
  return ALL_STICKERS.find(s => s.id === stickerId);
}

/**
 * Get sticker pack by ID
 */
export function getPackById(packId: string): StickerPack | undefined {
  return ALL_STICKER_PACKS.find(p => p.id === packId);
}

/**
 * Get all unique tags from all stickers
 */
export function getAllTags(): string[] {
  const tagSet = new Set<string>();
  ALL_STICKERS.forEach(sticker => {
    sticker.tags.forEach(tag => tagSet.add(tag));
  });
  return Array.from(tagSet).sort();
}

/**
 * Get popular/trending stickers (first 20 for now)
 */
export function getPopularStickers(limit: number = 20): Sticker[] {
  // In a real app, this would be based on usage analytics
  // For now, return a curated selection
  return ALL_STICKERS.slice(0, limit);
}

/**
 * Get recently added stickers (last pack's stickers)
 */
export function getRecentStickers(limit: number = 20): Sticker[] {
  return ALL_STICKERS.slice(-limit);
}

// ============================================================================
// CATEGORY HELPERS
// ============================================================================

/**
 * Get count of stickers per category
 */
export function getStickerCountByCategory(): Record<StickerCategory, number> {
  const counts = {} as Record<StickerCategory, number>;

  Object.values(StickerCategory).forEach(category => {
    counts[category] = filterByCategory(category).length;
  });

  return counts;
}

/**
 * Get pack for a specific category
 */
export function getPackForCategory(category: StickerCategory): StickerPack | undefined {
  return ALL_STICKER_PACKS.find(pack => pack.category === category);
}
