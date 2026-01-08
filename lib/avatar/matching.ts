/**
 * Avatar Matching Algorithm
 *
 * Preset-based matching using avatar appearance attributes:
 * - Style: 40% weight (visual appearance category)
 * - Gender: 30% weight (very visible)
 * - Outfit: 30% weight (clothing style)
 *
 * NOTE: This algorithm uses neutral "style" categories instead of
 * ethnicity-based categorization. The style categories represent
 * visual appearance diversity without ethnic labeling.
 *
 * @example
 * ```tsx
 * import { compareAvatars, quickMatch } from 'lib/avatar/matching'
 *
 * const result = compareAvatars(targetAvatar, myAvatar)
 * console.log(result.score) // 0-100
 * console.log(result.quality) // 'excellent' | 'good' | 'fair' | 'poor'
 * ```
 */

import type {
  AvatarConfig,
  AvatarPreset,
  AvatarStyle,
  AvatarGender,
  AvatarOutfit,
  StoredAvatar,
} from '../../components/avatar/types';
import { MATCHING_WEIGHTS, ETHNICITY_TO_STYLE } from '../../components/avatar/types';
import { getAvatarPreset } from './defaults';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Match quality rating based on score
 */
export type MatchQuality = 'excellent' | 'good' | 'fair' | 'poor';

/**
 * Result of comparing two avatars
 */
export interface MatchResult {
  /** Match score from 0 to 100 */
  score: number;
  /** Quality rating based on score thresholds */
  quality: MatchQuality;
  /** Whether it meets the minimum threshold (default 60%) */
  isMatch: boolean;
  /** Breakdown of attribute matches */
  breakdown: {
    /** Primary attributes match percentage (0-100) */
    primaryScore: number;
    /** Secondary attributes match percentage (0-100) */
    secondaryScore: number;
    /** List of matching attribute names */
    matchingAttributes: string[];
    /** List of partially matching attribute names (fuzzy) */
    partialMatchAttributes: string[];
    /** List of non-matching attribute names */
    nonMatchingAttributes: string[];
  };
}

/**
 * Configuration for the matching algorithm
 */
export interface MatchingConfig {
  /** Minimum score to be considered a match (0-100, default 60) */
  defaultThreshold: number;
  /** Enable fuzzy matching for similar values (default true) */
  useFuzzyMatching: boolean;
}

/**
 * Post with target avatar for filtering
 */
export interface PostWithAvatar {
  id: string;
  /** Avatar config or stored avatar */
  target_avatar?: StoredAvatar | AvatarConfig | null;
  [key: string]: unknown;
}

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Default matching configuration
 */
export const DEFAULT_MATCHING_CONFIG: MatchingConfig = {
  defaultThreshold: 60,
  useFuzzyMatching: true,
};

/**
 * Score thresholds for quality ratings
 */
export const QUALITY_THRESHOLDS = {
  excellent: 85,
  good: 70,
  fair: 50,
} as const;

/**
 * Similar outfits for fuzzy matching
 */
export const OUTFIT_SIMILARITY: AvatarOutfit[][] = [
  ['Casual', 'Utility'], // Informal clothing
  ['Business', 'Medical'], // Professional attire
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Extract AvatarConfig from various input types
 */
function extractConfig(
  avatar: StoredAvatar | AvatarConfig | AvatarPreset | null | undefined
): AvatarConfig | null {
  if (!avatar) return null;

  // StoredAvatar has a config property
  if ('config' in avatar && avatar.config && 'avatarId' in avatar.config) {
    return avatar.config as AvatarConfig;
  }

  // AvatarConfig has avatarId directly
  if ('avatarId' in avatar) {
    return avatar as AvatarConfig;
  }

  // AvatarPreset - convert to AvatarConfig
  if ('id' in avatar && ('style' in avatar || 'ethnicity' in avatar)) {
    const preset = avatar as AvatarPreset;
    return {
      avatarId: preset.id,
      style: preset.style,
      ethnicity: preset.ethnicity,
      gender: preset.gender as AvatarGender,
      outfit: preset.outfit as AvatarOutfit,
    };
  }

  return null;
}

/**
 * Get full preset info for an avatar config
 */
function getPresetInfo(config: AvatarConfig): AvatarPreset | null {
  return getAvatarPreset(config.avatarId) || null;
}

/**
 * Get the quality rating for a score
 */
function getQualityFromScore(score: number): MatchQuality {
  if (score >= QUALITY_THRESHOLDS.excellent) return 'excellent';
  if (score >= QUALITY_THRESHOLDS.good) return 'good';
  if (score >= QUALITY_THRESHOLDS.fair) return 'fair';
  return 'poor';
}

/**
 * Check if two outfits are similar (for fuzzy matching)
 */
function areOutfitsSimilar(
  outfit1: AvatarOutfit | undefined,
  outfit2: AvatarOutfit | undefined
): boolean {
  if (!outfit1 || !outfit2) return false;
  if (outfit1 === outfit2) return true;

  for (const group of OUTFIT_SIMILARITY) {
    if (group.includes(outfit1) && group.includes(outfit2)) {
      return true;
    }
  }
  return false;
}

/**
 * Get style from config, converting from ethnicity if needed for backward compatibility
 */
function getStyleFromConfig(config: AvatarConfig, preset: AvatarPreset | null): AvatarStyle | undefined {
  // Prefer style if available
  if (config.style) return config.style;

  // Check preset for style
  if (preset?.style) return preset.style;

  // Fall back to converting ethnicity to style (backward compatibility)
  if (config.ethnicity) {
    return ETHNICITY_TO_STYLE[config.ethnicity];
  }

  if (preset?.ethnicity) {
    return ETHNICITY_TO_STYLE[preset.ethnicity];
  }

  return undefined;
}

// ============================================================================
// MATCHING FUNCTIONS
// ============================================================================

/**
 * Compare two avatars and calculate a match score
 *
 * Matching weights:
 * - Style: 40% (visual appearance category - neutral descriptor)
 * - Gender: 30% (very visible)
 * - Outfit: 30% (clothing style)
 *
 * @param targetAvatar - The avatar from the post's target_avatar field
 * @param consumerAvatar - The consumer's own avatar from their profile
 * @param threshold - Minimum score to be considered a match (default: 60)
 * @param useFuzzy - Enable fuzzy matching for similar values (default: true)
 * @returns Detailed match result with score, quality, and breakdown
 */
export function compareAvatars(
  targetAvatar: StoredAvatar | AvatarConfig | AvatarPreset | null | undefined,
  consumerAvatar: StoredAvatar | AvatarConfig | AvatarPreset | null | undefined,
  threshold: number = DEFAULT_MATCHING_CONFIG.defaultThreshold,
  useFuzzy: boolean = true
): MatchResult {
  const target = extractConfig(targetAvatar);
  const consumer = extractConfig(consumerAvatar);

  // If either avatar is missing, return no match
  if (!target || !consumer) {
    return {
      score: 0,
      quality: 'poor',
      isMatch: false,
      breakdown: {
        primaryScore: 0,
        secondaryScore: 0,
        matchingAttributes: [],
        partialMatchAttributes: [],
        nonMatchingAttributes: ['style', 'gender', 'outfit'],
      },
    };
  }

  // Get preset info to fill in any missing attributes
  const targetPreset = getPresetInfo(target);
  const consumerPreset = getPresetInfo(consumer);

  // Get attribute values (from config or preset)
  const targetStyle = getStyleFromConfig(target, targetPreset);
  const targetGender = target.gender || targetPreset?.gender;
  const targetOutfit = target.outfit || targetPreset?.outfit;

  const consumerStyle = getStyleFromConfig(consumer, consumerPreset);
  const consumerGender = consumer.gender || consumerPreset?.gender;
  const consumerOutfit = consumer.outfit || consumerPreset?.outfit;

  // Track matches
  const matchingAttributes: string[] = [];
  const partialMatchAttributes: string[] = [];
  const nonMatchingAttributes: string[] = [];

  // Calculate style score (40%)
  let styleScore = 0;
  if (targetStyle && consumerStyle) {
    if (targetStyle === consumerStyle) {
      styleScore = 1;
      matchingAttributes.push('style');
    } else {
      nonMatchingAttributes.push('style');
    }
  }

  // Calculate gender score (30%)
  let genderScore = 0;
  if (targetGender && consumerGender) {
    if (targetGender === consumerGender) {
      genderScore = 1;
      matchingAttributes.push('gender');
    } else {
      nonMatchingAttributes.push('gender');
    }
  }

  // Calculate outfit score (30%)
  let outfitScore = 0;
  if (targetOutfit && consumerOutfit) {
    if (targetOutfit === consumerOutfit) {
      outfitScore = 1;
      matchingAttributes.push('outfit');
    } else if (useFuzzy && areOutfitsSimilar(targetOutfit, consumerOutfit)) {
      outfitScore = 0.7;
      partialMatchAttributes.push('outfit');
    } else {
      nonMatchingAttributes.push('outfit');
    }
  }

  // Calculate weighted final score
  const finalScore = Math.round(
    styleScore * MATCHING_WEIGHTS.style * 100 +
    genderScore * MATCHING_WEIGHTS.gender * 100 +
    outfitScore * MATCHING_WEIGHTS.outfit * 100
  );

  // Primary score is style + gender (most important)
  const primaryScore = Math.round(
    (styleScore * 0.57 + genderScore * 0.43) * 100
  );

  // Secondary score is outfit
  const secondaryScore = Math.round(outfitScore * 100);

  return {
    score: finalScore,
    quality: getQualityFromScore(finalScore),
    isMatch: finalScore >= threshold,
    breakdown: {
      primaryScore,
      secondaryScore,
      matchingAttributes,
      partialMatchAttributes,
      nonMatchingAttributes,
    },
  };
}

/**
 * Quick boolean check if two avatars match
 */
export function quickMatch(
  targetAvatar: StoredAvatar | AvatarConfig | AvatarPreset | null | undefined,
  consumerAvatar: StoredAvatar | AvatarConfig | AvatarPreset | null | undefined,
  threshold: number = DEFAULT_MATCHING_CONFIG.defaultThreshold
): boolean {
  const result = compareAvatars(targetAvatar, consumerAvatar, threshold);
  return result.isMatch;
}

/**
 * Filter posts to only those matching the consumer's avatar
 */
export function filterMatchingPosts<T extends PostWithAvatar>(
  consumerAvatar: StoredAvatar | AvatarConfig | null | undefined,
  posts: T[],
  threshold: number = DEFAULT_MATCHING_CONFIG.defaultThreshold
): T[] {
  if (!posts || posts.length === 0) {
    return [];
  }

  return posts
    .map((post) => ({
      post,
      result: compareAvatars(
        post.target_avatar as StoredAvatar | AvatarConfig | null | undefined,
        consumerAvatar,
        threshold
      ),
    }))
    .filter(({ result }) => result.isMatch)
    .sort((a, b) => b.result.score - a.result.score)
    .map(({ post }) => post);
}

/**
 * Get posts with their match scores
 */
export function getPostsWithMatchScores<T extends PostWithAvatar>(
  consumerAvatar: StoredAvatar | AvatarConfig | null | undefined,
  posts: T[]
): Array<{ post: T; match: MatchResult }> {
  if (!posts || posts.length === 0) {
    return [];
  }

  return posts
    .map((post) => ({
      post,
      match: compareAvatars(
        post.target_avatar as StoredAvatar | AvatarConfig | null | undefined,
        consumerAvatar
      ),
    }))
    .sort((a, b) => b.match.score - a.match.score);
}

// ============================================================================
// DISPLAY HELPERS
// ============================================================================

/**
 * Get a human-readable match description
 */
export function getMatchDescription(result: MatchResult): string {
  const qualityLabel = {
    excellent: 'Excellent',
    good: 'Good',
    fair: 'Fair',
    poor: 'Poor',
  }[result.quality];

  return `${result.score}% match - ${qualityLabel}`;
}

/**
 * Human-readable attribute names
 */
const ATTRIBUTE_LABELS: Record<string, string> = {
  style: 'appearance',
  gender: 'gender',
  outfit: 'clothing',
  // Legacy support
  ethnicity: 'appearance',
};

/**
 * Get matching attributes as a human-readable string
 */
export function explainMatch(result: MatchResult): string {
  const { matchingAttributes, partialMatchAttributes } = result.breakdown;

  if (matchingAttributes.length === 0 && partialMatchAttributes.length === 0) {
    return 'No matching features';
  }

  // Get labels for attributes
  const getLabel = (attr: string): string => {
    return ATTRIBUTE_LABELS[attr] || attr;
  };

  // Combine exact and partial matches, prioritizing exact
  const allMatches = [
    ...matchingAttributes.map((attr) => getLabel(attr)),
    ...partialMatchAttributes
      .slice(0, 2)
      .map((attr) => `similar ${getLabel(attr)}`),
  ].slice(0, 3);

  if (allMatches.length === 1) {
    return `${allMatches[0]} matches`;
  }

  if (allMatches.length === 2) {
    return `${allMatches[0]} and ${allMatches[1]} match`;
  }

  const lastAttr = allMatches.pop();
  return `${allMatches.join(', ')}, and ${lastAttr} match`;
}

/**
 * Get a color code for displaying match quality
 */
export function getMatchQualityColor(quality: MatchQuality): string {
  const colors: Record<MatchQuality, string> = {
    excellent: '#34C759',
    good: '#FF6B47',
    fair: '#FF9500',
    poor: '#8E8E93',
  };
  return colors[quality];
}

/**
 * Get a color code for a match score
 */
export function getMatchScoreColor(score: number): string {
  return getMatchQualityColor(getQualityFromScore(score));
}
