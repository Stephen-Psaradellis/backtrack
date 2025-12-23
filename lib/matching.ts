/**
 * Avatar Matching Algorithm
 *
 * Compares avatar configurations to determine if a consumer's avatar
 * matches the target avatar in a producer's post. Uses weighted scoring
 * where primary physical attributes (skin tone, hair style/color, facial hair,
 * accessories) carry more weight than secondary attributes (expressions, clothing).
 *
 * @module lib/matching
 */

import {
  AvatarConfig,
  AvatarAttribute,
  PartialAvatarConfig,
  PRIMARY_MATCHING_ATTRIBUTES,
  SECONDARY_MATCHING_ATTRIBUTES,
  AVATAR_OPTIONS,
} from '../types/avatar'
import type { MatchResult } from './types'

// ============================================================================
// CONFIGURATION
// ============================================================================

/**
 * Weight applied to primary matching attributes (physical traits)
 * These are the most important for identifying a person
 */
const PRIMARY_ATTRIBUTE_WEIGHT = 2.0

/**
 * Weight applied to secondary matching attributes (expressions, clothing)
 * These are less reliable for identification
 */
const SECONDARY_ATTRIBUTE_WEIGHT = 0.5

/**
 * Default threshold for considering two avatars as a "match"
 * Score must be >= this value to be considered a match
 */
export const DEFAULT_MATCH_THRESHOLD = 60

/**
 * Minimum threshold allowed for matching (prevents too loose matching)
 */
export const MIN_MATCH_THRESHOLD = 30

/**
 * Maximum threshold allowed for matching (prevents too strict matching)
 */
export const MAX_MATCH_THRESHOLD = 95

// ============================================================================
// ATTRIBUTE SIMILARITY FUNCTIONS
// ============================================================================

/**
 * Hair length categories for fuzzy matching
 */
type HairLengthCategory = 'none' | 'short' | 'long' | 'covered'

/**
 * Get the hair length category for a top type
 * Used for fuzzy matching (e.g., two short hair styles are somewhat similar)
 */
function getHairLengthCategory(topType: string): HairLengthCategory {
  if (topType === 'NoHair' || topType === 'Eyepatch') {
    return 'none'
  }
  if (topType.startsWith('LongHair')) {
    return 'long'
  }
  if (topType.startsWith('ShortHair')) {
    return 'short'
  }
  // Hats, hijab, turban, winter hats
  return 'covered'
}

/**
 * Skin color similarity groups
 * Colors within the same group are considered somewhat similar
 */
const SKIN_COLOR_GROUPS: Record<string, string[]> = {
  light: ['Pale', 'Light', 'Yellow'],
  medium: ['Light', 'Tanned', 'Brown'],
  dark: ['Brown', 'DarkBrown', 'Black'],
}

/**
 * Check if two skin colors are in the same or adjacent group
 */
function areSkinColorsSimilar(color1: string, color2: string): boolean {
  if (color1 === color2) return true

  for (const group of Object.values(SKIN_COLOR_GROUPS)) {
    if (group.includes(color1) && group.includes(color2)) {
      return true
    }
  }
  return false
}

/**
 * Hair color similarity groups
 */
const HAIR_COLOR_GROUPS: Record<string, string[]> = {
  light: ['Blonde', 'BlondeGolden', 'Platinum', 'SilverGray'],
  brown: ['Auburn', 'Brown', 'BrownDark'],
  dark: ['Black', 'BrownDark'],
  colorful: ['PastelPink', 'Blue', 'Red'],
}

/**
 * Check if two hair colors are similar
 */
function areHairColorsSimilar(color1: string, color2: string): boolean {
  if (color1 === color2) return true

  for (const group of Object.values(HAIR_COLOR_GROUPS)) {
    if (group.includes(color1) && group.includes(color2)) {
      return true
    }
  }
  return false
}

// ============================================================================
// MATCHING SCORE CALCULATION
// ============================================================================

/**
 * Calculate partial match score for an attribute
 * Returns 0-1 where 1 is exact match, 0 is no match, and values in between for partial matches
 */
function calculateAttributeSimilarity(
  attribute: AvatarAttribute,
  value1: string,
  value2: string
): number {
  // Exact match
  if (value1 === value2) {
    return 1.0
  }

  // Special handling for different attribute types
  switch (attribute) {
    case 'skinColor':
      return areSkinColorsSimilar(value1, value2) ? 0.7 : 0
    case 'hairColor':
    case 'facialHairColor':
      return areHairColorsSimilar(value1, value2) ? 0.6 : 0
    case 'topType': {
      const cat1 = getHairLengthCategory(value1)
      const cat2 = getHairLengthCategory(value2)
      if (cat1 === cat2) return 0.5
      // Adjacent categories (e.g., short and none) get partial credit
      if (
        (cat1 === 'short' && cat2 === 'none') ||
        (cat1 === 'none' && cat2 === 'short')
      ) {
        return 0.3
      }
      return 0
    }
    case 'facialHairType':
      // "Blank" (no facial hair) vs any facial hair is important distinction
      if (value1 === 'Blank' || value2 === 'Blank') {
        return value1 === value2 ? 1.0 : 0
      }
      // Any two types of facial hair get partial credit
      return 0.5
    case 'accessoriesType':
      // "Blank" (no glasses) vs any glasses is important
      if (value1 === 'Blank' || value2 === 'Blank') {
        return value1 === value2 ? 1.0 : 0
      }
      // Prescription glasses are similar to each other
      if (
        (value1.startsWith('Prescription') && value2.startsWith('Prescription')) ||
        (value1 === 'Sunglasses' && value2 === 'Wayfarers') ||
        (value1 === 'Wayfarers' && value2 === 'Sunglasses')
      ) {
        return 0.7
      }
      return 0.3
    default:
      // For expression attributes (eyes, mouth, eyebrows) and clothing
      // these are less reliable for identification, no partial match
      return 0
  }
}

/**
 * Get the weight for a given attribute based on whether it's primary or secondary
 */
function getAttributeWeight(attribute: AvatarAttribute): number {
  if (PRIMARY_MATCHING_ATTRIBUTES.includes(attribute)) {
    return PRIMARY_ATTRIBUTE_WEIGHT
  }
  if (SECONDARY_MATCHING_ATTRIBUTES.includes(attribute)) {
    return SECONDARY_ATTRIBUTE_WEIGHT
  }
  return 1.0
}

// ============================================================================
// MAIN MATCHING FUNCTIONS
// ============================================================================

/**
 * Detailed attribute match information
 */
export interface AttributeMatchDetail {
  /** The attribute being compared */
  attribute: AvatarAttribute
  /** Whether this attribute matches (considering similarity) */
  matches: boolean
  /** The weight applied to this attribute */
  weight: number
  /** The similarity score (0-1) */
  similarity: number
  /** Value from the target avatar (what the producer is looking for) */
  targetValue: string
  /** Value from the consumer's avatar */
  consumerValue: string
}

/**
 * Extended match result with detailed information
 */
export interface DetailedMatchResult extends MatchResult {
  /** Detailed information for each attribute */
  details: AttributeMatchDetail[]
  /** Total possible score (for reference) */
  maxPossibleScore: number
  /** Actual weighted score achieved */
  weightedScore: number
}

/**
 * Compare two avatar configurations and calculate match score
 *
 * @param targetAvatar - The avatar in the post (describing person of interest)
 * @param consumerAvatar - The consumer's own avatar (self-description)
 * @param threshold - Score threshold for considering it a match (default: 60)
 * @returns MatchResult with score, isMatch flag, and attribute details
 *
 * @example
 * ```typescript
 * const result = compareAvatars(post.targetAvatar, user.ownAvatar)
 * if (result.isMatch) {
 *   console.log(`Match found with ${result.score}% confidence`)
 * }
 * ```
 */
export function compareAvatars(
  targetAvatar: AvatarConfig,
  consumerAvatar: AvatarConfig,
  threshold: number = DEFAULT_MATCH_THRESHOLD
): MatchResult {
  const details: AttributeMatchDetail[] = []
  let totalWeightedScore = 0
  let maxPossibleScore = 0

  // All attributes to compare
  const allAttributes: AvatarAttribute[] = [
    ...PRIMARY_MATCHING_ATTRIBUTES,
    ...SECONDARY_MATCHING_ATTRIBUTES,
  ]

  for (const attribute of allAttributes) {
    const targetValue = targetAvatar[attribute]
    const consumerValue = consumerAvatar[attribute]
    const weight = getAttributeWeight(attribute)
    const similarity = calculateAttributeSimilarity(
      attribute,
      targetValue,
      consumerValue
    )

    const weightedAttributeScore = similarity * weight
    totalWeightedScore += weightedAttributeScore
    maxPossibleScore += weight

    details.push({
      attribute,
      matches: similarity >= 0.5, // Consider 50%+ similarity as a "match" for this attribute
      weight,
      similarity,
      targetValue,
      consumerValue,
    })
  }

  // Calculate percentage score (0-100)
  const score = Math.round((totalWeightedScore / maxPossibleScore) * 100)

  // Clamp threshold to valid range
  const clampedThreshold = Math.max(
    MIN_MATCH_THRESHOLD,
    Math.min(MAX_MATCH_THRESHOLD, threshold)
  )

  // Build simplified attribute matches for MatchResult interface
  const attributeMatches = details.map((d) => ({
    attribute: d.attribute,
    matches: d.matches,
    weight: d.weight,
  }))

  return {
    score,
    isMatch: score >= clampedThreshold,
    attributeMatches,
  }
}

/**
 * Compare avatars with detailed result information
 *
 * @param targetAvatar - The avatar in the post (describing person of interest)
 * @param consumerAvatar - The consumer's own avatar (self-description)
 * @param threshold - Score threshold for considering it a match (default: 60)
 * @returns DetailedMatchResult with full comparison details
 *
 * @example
 * ```typescript
 * const result = compareAvatarsDetailed(post.targetAvatar, user.ownAvatar)
 * console.log(`Score: ${result.score}/${result.maxPossibleScore}`)
 * for (const detail of result.details) {
 *   if (!detail.matches) {
 *     console.log(`Mismatch on ${detail.attribute}: ${detail.targetValue} vs ${detail.consumerValue}`)
 *   }
 * }
 * ```
 */
export function compareAvatarsDetailed(
  targetAvatar: AvatarConfig,
  consumerAvatar: AvatarConfig,
  threshold: number = DEFAULT_MATCH_THRESHOLD
): DetailedMatchResult {
  const details: AttributeMatchDetail[] = []
  let totalWeightedScore = 0
  let maxPossibleScore = 0

  const allAttributes: AvatarAttribute[] = [
    ...PRIMARY_MATCHING_ATTRIBUTES,
    ...SECONDARY_MATCHING_ATTRIBUTES,
  ]

  for (const attribute of allAttributes) {
    const targetValue = targetAvatar[attribute]
    const consumerValue = consumerAvatar[attribute]
    const weight = getAttributeWeight(attribute)
    const similarity = calculateAttributeSimilarity(
      attribute,
      targetValue,
      consumerValue
    )

    const weightedAttributeScore = similarity * weight
    totalWeightedScore += weightedAttributeScore
    maxPossibleScore += weight

    details.push({
      attribute,
      matches: similarity >= 0.5,
      weight,
      similarity,
      targetValue,
      consumerValue,
    })
  }

  const score = Math.round((totalWeightedScore / maxPossibleScore) * 100)
  const clampedThreshold = Math.max(
    MIN_MATCH_THRESHOLD,
    Math.min(MAX_MATCH_THRESHOLD, threshold)
  )

  const attributeMatches = details.map((d) => ({
    attribute: d.attribute,
    matches: d.matches,
    weight: d.weight,
  }))

  return {
    score,
    isMatch: score >= clampedThreshold,
    attributeMatches,
    details,
    maxPossibleScore,
    weightedScore: totalWeightedScore,
  }
}

/**
 * Check if a consumer potentially matches a target avatar (quick check)
 * Uses only primary attributes for a fast preliminary match
 *
 * @param targetAvatar - The avatar in the post
 * @param consumerAvatar - The consumer's avatar
 * @returns true if primary attributes have some match
 */
export function quickMatch(
  targetAvatar: AvatarConfig,
  consumerAvatar: AvatarConfig
): boolean {
  let matchingPrimary = 0

  for (const attribute of PRIMARY_MATCHING_ATTRIBUTES) {
    const similarity = calculateAttributeSimilarity(
      attribute,
      targetAvatar[attribute],
      consumerAvatar[attribute]
    )
    if (similarity >= 0.5) {
      matchingPrimary++
    }
  }

  // Require at least 3 of 5 primary attributes to match for quick match
  return matchingPrimary >= 3
}

/**
 * Calculate match scores for multiple posts at once
 * Useful for filtering and sorting a ledger by match score
 *
 * @param consumerAvatar - The consumer's avatar
 * @param posts - Array of posts with targetAvatar
 * @param threshold - Match threshold (default: 60)
 * @returns Array of {postId, score, isMatch} sorted by score descending
 *
 * @example
 * ```typescript
 * const posts = await fetchPostsForLocation(locationId)
 * const matches = calculateBatchMatches(userAvatar, posts)
 * const topMatches = matches.filter(m => m.isMatch)
 * ```
 */
export function calculateBatchMatches<T extends { id: string; target_avatar: AvatarConfig }>(
  consumerAvatar: AvatarConfig,
  posts: T[],
  threshold: number = DEFAULT_MATCH_THRESHOLD
): Array<{ postId: string; score: number; isMatch: boolean }> {
  const results = posts.map((post) => {
    const { score, isMatch } = compareAvatars(
      post.target_avatar,
      consumerAvatar,
      threshold
    )
    return {
      postId: post.id,
      score,
      isMatch,
    }
  })

  // Sort by score descending (best matches first)
  return results.sort((a, b) => b.score - a.score)
}

/**
 * Filter posts to only those that match the consumer's avatar
 *
 * @param consumerAvatar - The consumer's avatar
 * @param posts - Array of posts with targetAvatar
 * @param threshold - Match threshold (default: 60)
 * @returns Filtered array of posts that match
 */
export function filterMatchingPosts<T extends { id: string; target_avatar: AvatarConfig }>(
  consumerAvatar: AvatarConfig,
  posts: T[],
  threshold: number = DEFAULT_MATCH_THRESHOLD
): T[] {
  return posts.filter((post) => {
    const { isMatch } = compareAvatars(post.target_avatar, consumerAvatar, threshold)
    return isMatch
  })
}

/**
 * Get the count of matching primary attributes
 * Useful for displaying "3 of 5 key features match"
 *
 * @param targetAvatar - The target avatar
 * @param consumerAvatar - The consumer's avatar
 * @returns Object with matchCount and total
 */
export function getPrimaryMatchCount(
  targetAvatar: AvatarConfig,
  consumerAvatar: AvatarConfig
): { matchCount: number; total: number } {
  let matchCount = 0
  const total = PRIMARY_MATCHING_ATTRIBUTES.length

  for (const attribute of PRIMARY_MATCHING_ATTRIBUTES) {
    const similarity = calculateAttributeSimilarity(
      attribute,
      targetAvatar[attribute],
      consumerAvatar[attribute]
    )
    if (similarity >= 0.5) {
      matchCount++
    }
  }

  return { matchCount, total }
}

/**
 * Get human-readable match summary
 *
 * @param result - Match result from compareAvatars
 * @returns Human-readable string describing the match
 */
export function getMatchSummary(result: MatchResult): string {
  if (result.score >= 90) {
    return 'Excellent match!'
  }
  if (result.score >= 75) {
    return 'Strong match'
  }
  if (result.score >= 60) {
    return 'Good match'
  }
  if (result.score >= 40) {
    return 'Partial match'
  }
  return 'Low match'
}

/**
 * Check if avatar configuration is valid for matching
 *
 * @param avatar - Avatar configuration to validate
 * @returns true if avatar has all required fields with valid values
 */
export function isValidForMatching(avatar: PartialAvatarConfig | null | undefined): boolean {
  if (!avatar || typeof avatar !== 'object') {
    return false
  }

  // Check that all primary attributes are present and valid
  for (const attribute of PRIMARY_MATCHING_ATTRIBUTES) {
    const value = avatar[attribute]
    if (!value || typeof value !== 'string') {
      return false
    }

    // Validate against known options
    const options = AVATAR_OPTIONS[attribute] as readonly string[]
    if (!options.includes(value)) {
      return false
    }
  }

  return true
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  PRIMARY_ATTRIBUTE_WEIGHT,
  SECONDARY_ATTRIBUTE_WEIGHT,
}
