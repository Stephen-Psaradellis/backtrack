/**
 * 2D Avatar Matching Utilities
 *
 * Simplified matching algorithm that uses:
 * - 50% weight on gender match
 * - 50% weight on skin tone match
 */

import { Avatar2DConfig, AvatarMatchCriteria } from '@/components/avatar2d/types';

/**
 * Categorize a hex skin tone color into light/medium/dark
 * Uses luminance calculation for accurate categorization
 */
export function categorizeSkinTone(hexColor: string): 'light' | 'medium' | 'dark' {
  // Remove # if present and validate
  const hex = hexColor.replace('#', '');
  if (hex.length !== 6) return 'medium';

  // Convert hex to RGB
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);

  // Calculate luminance using standard formula
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  if (luminance > 0.7) return 'light';
  if (luminance > 0.4) return 'medium';
  return 'dark';
}

/**
 * Extract match criteria from full avatar config
 */
export function extractMatchCriteria(config: Avatar2DConfig): AvatarMatchCriteria {
  return {
    gender: config.gender,
    skinTone: categorizeSkinTone(config.skinTone),
  };
}

/**
 * Compare two avatar match criteria and return a match score (0-100)
 *
 * Scoring:
 * - Gender match: 50 points
 * - Skin tone exact match: 50 points
 * - Skin tone adjacent match (light-medium or medium-dark): 25 points
 */
export function compareAvatars(a: AvatarMatchCriteria, b: AvatarMatchCriteria): number {
  let score = 0;

  // Gender match (50% of score)
  if (a.gender === b.gender) {
    score += 50;
  }

  // Skin tone match (50% of score)
  if (a.skinTone === b.skinTone) {
    score += 50;
  } else {
    // Partial match for adjacent categories
    const tones: Array<'light' | 'medium' | 'dark'> = ['light', 'medium', 'dark'];
    const aIndex = tones.indexOf(a.skinTone);
    const bIndex = tones.indexOf(b.skinTone);
    if (Math.abs(aIndex - bIndex) === 1) {
      score += 25; // Adjacent category gets partial credit
    }
  }

  return score;
}

/**
 * Calculate match score between two avatar configs
 */
export function calculateMatchScore(configA: Avatar2DConfig, configB: Avatar2DConfig): number {
  const criteriaA = extractMatchCriteria(configA);
  const criteriaB = extractMatchCriteria(configB);
  return compareAvatars(criteriaA, criteriaB);
}

/**
 * Get a human-readable match description
 */
export function getMatchDescription(score: number): string {
  if (score >= 100) return 'Perfect match!';
  if (score >= 75) return 'Great match';
  if (score >= 50) return 'Good match';
  if (score >= 25) return 'Partial match';
  return 'Low match';
}

/**
 * Get match level for UI display
 */
export function getMatchLevel(score: number): 'perfect' | 'high' | 'medium' | 'low' {
  if (score >= 100) return 'perfect';
  if (score >= 75) return 'high';
  if (score >= 50) return 'medium';
  return 'low';
}

/**
 * Get match color for UI display
 */
export function getMatchColor(score: number): string {
  if (score >= 100) return '#10b981'; // green
  if (score >= 75) return '#3b82f6'; // blue
  if (score >= 50) return '#f59e0b'; // amber
  return '#ef4444'; // red
}
