/**
 * Avatar Matching Algorithm
 *
 * Matches users based on avatar descriptions with weighted attributes.
 * Used for discovery to show consumers posts where the target avatar
 * matches their own avatar configuration.
 *
 * Matching Strategy:
 * - Primary attributes (60% weight): skinColor, hairColor, topType, facialHairType, facialHairColor
 * - Secondary attributes (40% weight): eyeType, eyebrowType, mouthType, clotheType, clotheColor, accessoriesType, graphicType
 *
 * Thresholds:
 * - Excellent match: ≥85%
 * - Good match: ≥70%
 * - Fair match: ≥50%
 * - Poor match: <50%
 *
 * @example
 * ```tsx
 * import { compareAvatars, quickMatch, filterMatchingPosts } from 'lib/matching'
 *
 * // Compare two avatars
 * const result = compareAvatars(targetAvatar, myAvatar)
 * console.log(result.score) // 0-100
 * console.log(result.quality) // 'excellent' | 'good' | 'fair' | 'poor'
 *
 * // Quick boolean check
 * const matches = quickMatch(targetAvatar, myAvatar)
 *
 * // Filter posts for discovery
 * const matchingPosts = filterMatchingPosts(myAvatar, allPosts, 60)
 * ```
 */

import type { AvatarConfig } from '../types/avatar'
import { DEFAULT_AVATAR_CONFIG } from '../types/avatar'

// ============================================================================
// TYPES
// ============================================================================

/**
 * Match quality rating based on score
 */
export type MatchQuality = 'excellent' | 'good' | 'fair' | 'poor'

/**
 * Result of comparing two avatars
 */
export interface MatchResult {
  /** Match score from 0 to 100 */
  score: number
  /** Quality rating based on score thresholds */
  quality: MatchQuality
  /** Whether it meets the minimum threshold (default 60%) */
  isMatch: boolean
  /** Breakdown of attribute matches */
  breakdown: {
    /** Primary attributes match percentage (0-100) */
    primaryScore: number
    /** Secondary attributes match percentage (0-100) */
    secondaryScore: number
    /** List of matching attribute names */
    matchingAttributes: string[]
    /** List of non-matching attribute names */
    nonMatchingAttributes: string[]
  }
}

/**
 * Configuration for the matching algorithm
 */
export interface MatchingConfig {
  /** Weight for primary attributes (0-1, default 0.6) */
  primaryWeight: number
  /** Weight for secondary attributes (0-1, default 0.4) */
  secondaryWeight: number
  /** Minimum score to be considered a match (0-100, default 60) */
  defaultThreshold: number
}

/**
 * Post with target avatar for filtering
 */
export interface PostWithAvatar {
  id: string
  target_avatar?: AvatarConfig | null
  [key: string]: unknown
}

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Default matching configuration
 */
export const DEFAULT_MATCHING_CONFIG: MatchingConfig = {
  primaryWeight: 0.6,
  secondaryWeight: 0.4,
  defaultThreshold: 60,
}

/**
 * Primary attributes - most important for identification
 * These attributes are the most visually distinctive
 */
export const PRIMARY_ATTRIBUTES: (keyof AvatarConfig)[] = [
  'skinColor',
  'hairColor',
  'topType',
  'facialHairType',
  'facialHairColor',
]

/**
 * Secondary attributes - less distinctive, supplementary
 */
export const SECONDARY_ATTRIBUTES: (keyof AvatarConfig)[] = [
  'eyeType',
  'eyebrowType',
  'mouthType',
  'clotheType',
  'clotheColor',
  'accessoriesType',
  'graphicType',
]

/**
 * All matchable attributes
 */
export const ALL_ATTRIBUTES: (keyof AvatarConfig)[] = [
  ...PRIMARY_ATTRIBUTES,
  ...SECONDARY_ATTRIBUTES,
]

/**
 * Score thresholds for quality ratings
 */
export const QUALITY_THRESHOLDS = {
  excellent: 85,
  good: 70,
  fair: 50,
} as const

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Normalize an avatar config, filling in missing values with defaults
 */
function normalizeAvatar(avatar: AvatarConfig | null | undefined): AvatarConfig {
  if (!avatar) {
    return { ...DEFAULT_AVATAR_CONFIG }
  }
  return {
    ...DEFAULT_AVATAR_CONFIG,
    ...avatar,
  }
}

/**
 * Get the quality rating for a score
 */
function getQualityFromScore(score: number): MatchQuality {
  if (score >= QUALITY_THRESHOLDS.excellent) return 'excellent'
  if (score >= QUALITY_THRESHOLDS.good) return 'good'
  if (score >= QUALITY_THRESHOLDS.fair) return 'fair'
  return 'poor'
}

/**
 * Compare a single attribute between two avatars
 * Returns true if the attributes match (case-insensitive comparison)
 */
function attributeMatches(
  targetValue: string | undefined,
  consumerValue: string | undefined
): boolean {
  // If either is undefined/null, treat as no match
  if (!targetValue || !consumerValue) {
    return false
  }
  // Case-insensitive comparison
  return targetValue.toLowerCase() === consumerValue.toLowerCase()
}

/**
 * Calculate match percentage for a set of attributes
 * Returns a score from 0-100
 */
function calculateAttributeGroupScore(
  targetAvatar: AvatarConfig,
  consumerAvatar: AvatarConfig,
  attributes: (keyof AvatarConfig)[]
): { score: number; matching: string[]; nonMatching: string[] } {
  const matching: string[] = []
  const nonMatching: string[] = []

  for (const attr of attributes) {
    const targetVal = targetAvatar[attr]
    const consumerVal = consumerAvatar[attr]

    if (attributeMatches(targetVal, consumerVal)) {
      matching.push(attr)
    } else {
      nonMatching.push(attr)
    }
  }

  const score = attributes.length > 0
    ? (matching.length / attributes.length) * 100
    : 0

  return { score, matching, nonMatching }
}

// ============================================================================
// MAIN FUNCTIONS
// ============================================================================

/**
 * Compare two avatars and calculate a match score
 *
 * The target avatar is the description of the person the producer saw.
 * The consumer avatar is the consumer's own avatar (self-description).
 *
 * A high match score means "the person described in the post looks like me"
 *
 * @param targetAvatar - The avatar from the post's target_avatar field
 * @param consumerAvatar - The consumer's own_avatar from their profile
 * @param threshold - Minimum score to be considered a match (default: 60)
 * @returns Detailed match result with score, quality, and breakdown
 *
 * @example
 * ```tsx
 * const result = compareAvatars(post.target_avatar, myProfile.own_avatar)
 *
 * if (result.isMatch) {
 *   console.log(`${result.score}% match - ${result.quality}`)
 * }
 * ```
 */
export function compareAvatars(
  targetAvatar: AvatarConfig | null | undefined,
  consumerAvatar: AvatarConfig | null | undefined,
  threshold: number = DEFAULT_MATCHING_CONFIG.defaultThreshold
): MatchResult {
  // Normalize both avatars to ensure all fields have values
  const normalizedTarget = normalizeAvatar(targetAvatar)
  const normalizedConsumer = normalizeAvatar(consumerAvatar)

  // Calculate primary attributes score
  const primaryResult = calculateAttributeGroupScore(
    normalizedTarget,
    normalizedConsumer,
    PRIMARY_ATTRIBUTES
  )

  // Calculate secondary attributes score
  const secondaryResult = calculateAttributeGroupScore(
    normalizedTarget,
    normalizedConsumer,
    SECONDARY_ATTRIBUTES
  )

  // Calculate weighted final score
  const finalScore = Math.round(
    (primaryResult.score * DEFAULT_MATCHING_CONFIG.primaryWeight) +
    (secondaryResult.score * DEFAULT_MATCHING_CONFIG.secondaryWeight)
  )

  return {
    score: finalScore,
    quality: getQualityFromScore(finalScore),
    isMatch: finalScore >= threshold,
    breakdown: {
      primaryScore: Math.round(primaryResult.score),
      secondaryScore: Math.round(secondaryResult.score),
      matchingAttributes: [...primaryResult.matching, ...secondaryResult.matching],
      nonMatchingAttributes: [...primaryResult.nonMatching, ...secondaryResult.nonMatching],
    },
  }
}

/**
 * Quick boolean check if two avatars match
 *
 * Uses a fast path that only checks primary attributes first.
 * If primary attributes score high enough, returns true early.
 *
 * @param targetAvatar - The avatar from the post
 * @param consumerAvatar - The consumer's own avatar
 * @param threshold - Minimum score to be considered a match (default: 60)
 * @returns true if the avatars match the threshold
 *
 * @example
 * ```tsx
 * if (quickMatch(post.target_avatar, myAvatar)) {
 *   // Show this post in discovery
 * }
 * ```
 */
export function quickMatch(
  targetAvatar: AvatarConfig | null | undefined,
  consumerAvatar: AvatarConfig | null | undefined,
  threshold: number = DEFAULT_MATCHING_CONFIG.defaultThreshold
): boolean {
  const normalizedTarget = normalizeAvatar(targetAvatar)
  const normalizedConsumer = normalizeAvatar(consumerAvatar)

  // Quick check: if primary attributes alone score high enough, it's a match
  const primaryResult = calculateAttributeGroupScore(
    normalizedTarget,
    normalizedConsumer,
    PRIMARY_ATTRIBUTES
  )

  // If primary score is excellent (85%+), it's definitely a match
  if (primaryResult.score >= QUALITY_THRESHOLDS.excellent) {
    return true
  }

  // If primary score is very low, it's definitely not a match
  if (primaryResult.score < 30) {
    return false
  }

  // For borderline cases, do the full calculation
  const result = compareAvatars(targetAvatar, consumerAvatar, threshold)
  return result.isMatch
}

/**
 * Filter an array of posts to only those matching the consumer's avatar
 *
 * @param consumerAvatar - The consumer's own avatar
 * @param posts - Array of posts with target_avatar
 * @param threshold - Minimum match score (default: 60)
 * @returns Posts that match, sorted by match score (highest first)
 *
 * @example
 * ```tsx
 * const { data: posts } = await supabase.from('posts').select('*')
 * const matchingPosts = filterMatchingPosts(myAvatar, posts, 50)
 * ```
 */
export function filterMatchingPosts<T extends PostWithAvatar>(
  consumerAvatar: AvatarConfig | null | undefined,
  posts: T[],
  threshold: number = DEFAULT_MATCHING_CONFIG.defaultThreshold
): T[] {
  if (!posts || posts.length === 0) {
    return []
  }

  // Calculate match scores and filter
  const postsWithScores = posts
    .map(post => {
      const result = compareAvatars(post.target_avatar, consumerAvatar, threshold)
      return { post, result }
    })
    .filter(({ result }) => result.isMatch)
    .sort((a, b) => b.result.score - a.result.score)

  return postsWithScores.map(({ post }) => post)
}

/**
 * Get posts with their match scores
 *
 * Returns all posts with their match information, useful for displaying
 * match percentages in the UI.
 *
 * @param consumerAvatar - The consumer's own avatar
 * @param posts - Array of posts with target_avatar
 * @returns Posts with match results, sorted by score (highest first)
 *
 * @example
 * ```tsx
 * const postsWithScores = getPostsWithMatchScores(myAvatar, posts)
 *
 * postsWithScores.forEach(({ post, match }) => {
 *   console.log(`${post.id}: ${match.score}% ${match.quality}`)
 * })
 * ```
 */
export function getPostsWithMatchScores<T extends PostWithAvatar>(
  consumerAvatar: AvatarConfig | null | undefined,
  posts: T[]
): Array<{ post: T; match: MatchResult }> {
  if (!posts || posts.length === 0) {
    return []
  }

  return posts
    .map(post => ({
      post,
      match: compareAvatars(post.target_avatar, consumerAvatar),
    }))
    .sort((a, b) => b.match.score - a.match.score)
}

/**
 * Get a human-readable match description
 *
 * @param result - Match result from compareAvatars
 * @returns Description like "85% match - Excellent"
 */
export function getMatchDescription(result: MatchResult): string {
  const qualityLabel = {
    excellent: 'Excellent',
    good: 'Good',
    fair: 'Fair',
    poor: 'Poor',
  }[result.quality]

  return `${result.score}% match - ${qualityLabel}`
}

/**
 * Get matching attributes as a human-readable string
 *
 * @param result - Match result from compareAvatars
 * @returns Description like "Hair color, skin tone, and clothing match"
 *
 * @example
 * ```tsx
 * const result = compareAvatars(target, consumer)
 * const explanation = explainMatch(result)
 * // "Skin color, hair color, and top style match"
 * ```
 */
export function explainMatch(result: MatchResult): string {
  const { matchingAttributes } = result.breakdown

  if (matchingAttributes.length === 0) {
    return 'No matching features'
  }

  // Convert attribute names to human-readable format
  const humanReadable: Record<string, string> = {
    skinColor: 'skin tone',
    hairColor: 'hair color',
    topType: 'hairstyle',
    facialHairType: 'facial hair',
    facialHairColor: 'facial hair color',
    eyeType: 'eye style',
    eyebrowType: 'eyebrow style',
    mouthType: 'expression',
    clotheType: 'clothing style',
    clotheColor: 'clothing color',
    accessoriesType: 'accessories',
    graphicType: 'shirt graphic',
  }

  const readableAttrs = matchingAttributes
    .map(attr => humanReadable[attr] || attr)
    .slice(0, 3) // Show max 3 attributes

  if (readableAttrs.length === 1) {
    return `${readableAttrs[0]} matches`
  }

  if (readableAttrs.length === 2) {
    return `${readableAttrs[0]} and ${readableAttrs[1]} match`
  }

  const lastAttr = readableAttrs.pop()
  return `${readableAttrs.join(', ')}, and ${lastAttr} match`
}

// ============================================================================
// COLOR UTILITIES
// ============================================================================

/**
 * Get a color code for displaying match quality
 *
 * @param quality - Match quality rating
 * @returns Hex color code
 */
export function getMatchQualityColor(quality: MatchQuality): string {
  const colors: Record<MatchQuality, string> = {
    excellent: '#34C759', // Green
    good: '#FF6B47',      // Coral
    fair: '#FF9500',      // Orange
    poor: '#8E8E93',      // Gray
  }
  return colors[quality]
}

/**
 * Get a color code for a match score
 *
 * @param score - Match score (0-100)
 * @returns Hex color code
 */
export function getMatchScoreColor(score: number): string {
  return getMatchQualityColor(getQualityFromScore(score))
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  // Main functions
  compareAvatars,
  quickMatch,
  filterMatchingPosts,
  getPostsWithMatchScores,
  // Utilities
  getMatchDescription,
  explainMatch,
  getMatchQualityColor,
  getMatchScoreColor,
  // Constants
  DEFAULT_MATCHING_CONFIG,
  PRIMARY_ATTRIBUTES,
  SECONDARY_ATTRIBUTES,
  ALL_ATTRIBUTES,
  QUALITY_THRESHOLDS,
}
