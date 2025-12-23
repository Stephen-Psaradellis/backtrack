/**
 * Avatar Matching Algorithm
 *
 * Compares avatar configurations to determine if a consumer's avatar
 * matches the target avatar in a producer's post. Uses weighted scoring
 * where primary physical attributes (skin tone, hair style/color, facial hair,
 * accessories) carry more weight than secondary attributes (expressions, clothing).
 *
 * The matching algorithm uses configurable weights and thresholds for flexible
 * quality tier classification (excellent, good, fair, poor).
 *
 * @module lib/matching
 * @see docs/avatar-matching.md for detailed documentation
 */

import type {
  AvatarConfig,
  AvatarAttribute,
  SkinColor,
  HairColor,
  TopType,
  FacialHairType,
  FacialHairColor,
  EyeType,
  MouthType,
  EyebrowType,
  ClotheType,
  ClotheColor,
  AccessoriesType,
  GraphicType,
  PartialAvatarConfig,
  PRIMARY_MATCHING_ATTRIBUTES,
  SECONDARY_MATCHING_ATTRIBUTES,
  AVATAR_OPTIONS,
} from '../types/avatar'
import { DEFAULT_AVATAR_CONFIG } from '../types/avatar'
import type { MatchResult as BaseMatchResult } from './types'

// ============================================================================
// Match Weights Interface
// ============================================================================

/**
 * Configurable weights for each avatar attribute in the matching algorithm.
 *
 * Weights determine how much each attribute contributes to the final match score.
 * All weights should sum to 1.0 (100%) for proper normalization.
 *
 * @remarks
 * The default configuration uses a 60/40 split between primary and secondary
 * attributes:
 * - **Primary attributes** (60%): Physical traits like skin color, hair color,
 *   and hair style that define core appearance
 * - **Secondary attributes** (40%): Expressions, clothing, and accessories
 *   that represent style preferences
 *
 * @example
 * ```typescript
 * // Custom weights focusing on appearance
 * const appearanceWeights: MatchWeights = {
 *   skinColor: 0.35,    // Boost skin color importance
 *   hairColor: 0.20,    // Boost hair color importance
 *   topType: 0.15,
 *   facialHairType: 0.08,
 *   facialHairColor: 0.02,
 *   eyeType: 0.04,
 *   mouthType: 0.04,
 *   eyebrowType: 0.02,
 *   clotheType: 0.04,
 *   clotheColor: 0.02,
 *   accessoriesType: 0.03,
 *   graphicType: 0.01,
 * }
 * ```
 */
export interface MatchWeights {
  // ---- Primary Attributes (recommended total: 0.60) ----

  /**
   * Weight for skin color matching.
   * Core physical identifier, highly visible and permanent.
   * @default 0.25
   */
  skinColor: number

  /**
   * Weight for hair color matching.
   * Major visual trait, immediately noticeable.
   * @default 0.15
   */
  hairColor: number

  /**
   * Weight for top type (hair style/head covering) matching.
   * Significant appearance element.
   * @default 0.12
   */
  topType: number

  /**
   * Weight for facial hair type matching.
   * Notable when present, differentiating for some users.
   * @default 0.05
   */
  facialHairType: number

  /**
   * Weight for facial hair color matching.
   * Only relevant when facial hair is present (conditional weight).
   * @default 0.03
   */
  facialHairColor: number

  // ---- Secondary Attributes (recommended total: 0.40) ----

  /**
   * Weight for eye type matching.
   * Expression preference, affects avatar "mood".
   * @default 0.08
   */
  eyeType: number

  /**
   * Weight for mouth type matching.
   * Expression preference, affects perceived personality.
   * @default 0.07
   */
  mouthType: number

  /**
   * Weight for eyebrow type matching.
   * Minor expression element.
   * @default 0.05
   */
  eyebrowType: number

  /**
   * Weight for clothing type matching.
   * Style preference indicator.
   * @default 0.08
   */
  clotheType: number

  /**
   * Weight for clothing color matching.
   * Color preference in clothing.
   * @default 0.05
   */
  clotheColor: number

  /**
   * Weight for accessories type matching.
   * Notable visual element (glasses).
   * @default 0.05
   */
  accessoriesType: number

  /**
   * Weight for graphic type matching.
   * Only applies when clotheType is 'GraphicShirt' (conditional weight).
   * @default 0.02
   */
  graphicType: number
}

// ============================================================================
// Match Thresholds Interface
// ============================================================================

/**
 * Configurable thresholds for match quality tier classification.
 *
 * Thresholds define the minimum score required for each quality tier.
 * Scores are on a 0-100 scale.
 *
 * @remarks
 * Quality tiers help categorize match results into meaningful groups:
 * - **Excellent**: Near-identical avatars, only minor differences
 * - **Good**: Similar appearance, same general look
 * - **Fair**: Some similarities, notable differences
 * - **Poor**: Significantly different avatars (scores below fair threshold)
 *
 * @example
 * ```typescript
 * // Strict thresholds for high-quality matching
 * const strictThresholds: MatchThresholds = {
 *   excellent: 95,  // Only near-perfect matches
 *   good: 85,       // High similarity required
 *   fair: 70,       // Moderate bar for "fair"
 * }
 * ```
 */
export interface MatchThresholds {
  /**
   * Minimum score for an "excellent" match.
   * Scores at or above this threshold indicate near-identical avatars.
   * @default 85
   */
  excellent: number

  /**
   * Minimum score for a "good" match.
   * Scores at or above this threshold indicate similar appearance.
   * @default 70
   */
  good: number

  /**
   * Minimum score for a "fair" match.
   * Scores at or above this threshold indicate some similarities.
   * Scores below this threshold are considered "poor" matches.
   * @default 50
   */
  fair: number
}

// ============================================================================
// Match Quality Type
// ============================================================================

/**
 * Match quality tier classification.
 *
 * Used to categorize match scores into human-readable quality levels.
 */
export type MatchQuality = 'excellent' | 'good' | 'fair' | 'poor'

// ============================================================================
// Match Configuration Interface
// ============================================================================

/**
 * Complete matching configuration combining weights and thresholds.
 *
 * This interface allows full customization of the matching algorithm behavior.
 *
 * @remarks
 * The MatchConfig is passed to the main matching function to control:
 * - How attributes are weighted in the score calculation
 * - How the resulting score is classified into quality tiers
 *
 * @example
 * ```typescript
 * // Custom configuration for appearance-focused matching
 * const config: MatchConfig = {
 *   weights: {
 *     skinColor: 0.35,
 *     hairColor: 0.20,
 *     topType: 0.15,
 *     facialHairType: 0.08,
 *     facialHairColor: 0.02,
 *     eyeType: 0.04,
 *     mouthType: 0.04,
 *     eyebrowType: 0.02,
 *     clotheType: 0.04,
 *     clotheColor: 0.02,
 *     accessoriesType: 0.03,
 *     graphicType: 0.01,
 *   },
 *   thresholds: {
 *     excellent: 85,
 *     good: 70,
 *     fair: 50,
 *   },
 * }
 * ```
 */
export interface MatchConfig {
  /**
   * Attribute weights for score calculation.
   * All weights should sum to 1.0 (100%).
   */
  weights: MatchWeights

  /**
   * Quality tier thresholds for score classification.
   */
  thresholds: MatchThresholds
}

// ============================================================================
// Attribute Score Detail Interface
// ============================================================================

/**
 * Detailed similarity score for a single attribute.
 *
 * Provides transparency into how each attribute contributed to the final score.
 */
export interface AttributeScoreDetail {
  /**
   * Raw similarity score for this attribute (0.0 to 1.0).
   * - 1.0: Perfect match (identical values)
   * - 0.0: No match (completely different)
   * - Intermediate: Partial similarity based on attribute-specific logic
   */
  similarity: number

  /**
   * Weight assigned to this attribute (0.0 to 1.0).
   * Represents the attribute's contribution proportion to the total score.
   */
  weight: number

  /**
   * Actual contribution to the final score (similarity * weight).
   * Sum of all contributions equals the normalized total score.
   */
  contribution: number
}

/**
 * Extended attribute score detail for conditional attributes.
 *
 * Some attributes (facialHairColor, graphicType) are only applicable
 * in certain contexts and may be excluded from the calculation.
 */
export interface ConditionalAttributeScoreDetail extends AttributeScoreDetail {
  /**
   * Whether this attribute was included in the score calculation.
   * - `true`: Attribute was applicable and included
   * - `false`: Attribute was excluded (e.g., no facial hair, no graphic shirt)
   */
  applicable: boolean
}

// ============================================================================
// Attribute Breakdown Interface
// ============================================================================

/**
 * Complete breakdown of similarity scores by attribute.
 *
 * Provides detailed information about how each avatar attribute
 * contributed to the final match score, useful for debugging and display.
 *
 * @remarks
 * The breakdown includes all 12 matchable attributes:
 * - 5 primary attributes: skinColor, hairColor, topType, facialHairType, facialHairColor
 * - 7 secondary attributes: eyeType, eyebrowType, mouthType, clotheType, clotheColor, accessoriesType, graphicType
 *
 * Conditional attributes (facialHairColor, graphicType) include an `applicable` flag
 * indicating whether they were included in the score calculation.
 */
export interface AttributeBreakdown {
  // ---- Primary Attributes ----
  skinColor: AttributeScoreDetail
  hairColor: AttributeScoreDetail
  topType: AttributeScoreDetail
  facialHairType: AttributeScoreDetail
  facialHairColor: ConditionalAttributeScoreDetail

  // ---- Secondary Attributes ----
  eyeType: AttributeScoreDetail
  eyebrowType: AttributeScoreDetail
  mouthType: AttributeScoreDetail
  clotheType: AttributeScoreDetail
  clotheColor: AttributeScoreDetail
  accessoriesType: AttributeScoreDetail
  graphicType: ConditionalAttributeScoreDetail
}

// ============================================================================
// Match Result Interface
// ============================================================================

/**
 * Complete result from an avatar matching calculation.
 *
 * Contains the final score, quality classification, and detailed breakdown
 * of how each attribute contributed to the match.
 *
 * @remarks
 * The MatchResult provides:
 * - **score**: The overall match score (0-100)
 * - **quality**: Human-readable tier classification
 * - **breakdown**: Per-attribute contribution details
 * - **isMatch**: Boolean helper based on a minimum threshold
 *
 * @example
 * ```typescript
 * const result: MatchResult = calculateAvatarMatchScore(avatarA, avatarB)
 *
 * console.log(`Match Score: ${result.score}%`)
 * console.log(`Quality: ${result.quality}`)
 *
 * if (result.isMatch) {
 *   console.log('These avatars are considered a match!')
 * }
 *
 * // Inspect specific attribute contributions
 * console.log(`Skin color contributed: ${result.breakdown.skinColor.contribution}`)
 * ```
 */
export interface MatchResult extends BaseMatchResult {
  /**
   * Overall match score on a 0-100 scale.
   * - 100: Identical avatars
   * - 0: Completely different avatars
   */
  score: number

  /**
   * Match quality tier based on configured thresholds.
   */
  quality: MatchQuality

  /**
   * Detailed breakdown of similarity scores by attribute.
   * Useful for understanding which attributes matched well or poorly.
   */
  breakdown: AttributeBreakdown

  /**
   * Whether the match meets the minimum threshold.
   * Convenience field for quick pass/fail determination.
   */
  isMatch: boolean

  /**
   * The minimum threshold used for the isMatch determination.
   * Typically corresponds to the "fair" threshold from MatchThresholds.
   */
  minThreshold: number
}

// ============================================================================
// Type Guards and Utilities
// ============================================================================

/**
 * Type guard to check if a value is a valid MatchQuality.
 */
export function isMatchQuality(value: unknown): value is MatchQuality {
  return (
    typeof value === 'string' &&
    ['excellent', 'good', 'fair', 'poor'].includes(value)
  )
}

/**
 * Validates that weights sum to approximately 1.0 (within tolerance).
 *
 * @param weights - The weights to validate
 * @param tolerance - Acceptable deviation from 1.0 (default: 0.01)
 * @returns true if weights sum to 1.0 within tolerance
 */
export function validateWeightsSum(
  weights: MatchWeights,
  tolerance: number = 0.01
): boolean {
  const sum = Object.values(weights).reduce((acc, val) => acc + val, 0)
  return Math.abs(sum - 1.0) <= tolerance
}

/**
 * Validates that thresholds are in descending order.
 *
 * @param thresholds - The thresholds to validate
 * @returns true if excellent > good > fair
 */
export function validateThresholdsOrder(thresholds: MatchThresholds): boolean {
  return (
    thresholds.excellent > thresholds.good &&
    thresholds.good > thresholds.fair &&
    thresholds.fair >= 0 &&
    thresholds.excellent <= 100
  )
}

// ============================================================================
// DEFAULT CONFIGURATION
// ============================================================================

/**
 * Default weight configuration with 60/40 split between primary and secondary
 */
export const DEFAULT_WEIGHTS: MatchWeights = {
  skinColor: 0.25,
  hairColor: 0.15,
  topType: 0.12,
  facialHairType: 0.05,
  facialHairColor: 0.03,
  eyeType: 0.08,
  mouthType: 0.07,
  eyebrowType: 0.05,
  clotheType: 0.08,
  clotheColor: 0.05,
  accessoriesType: 0.05,
  graphicType: 0.02,
}

/**
 * Default threshold configuration
 */
export const DEFAULT_THRESHOLDS: MatchThresholds = {
  excellent: 85,
  good: 70,
  fair: 50,
}

/**
 * Default matching configuration
 */
export const DEFAULT_MATCH_CONFIG: MatchConfig = {
  weights: DEFAULT_WEIGHTS,
  thresholds: DEFAULT_THRESHOLDS,
}

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

// ============================================================================
// Skin Color Similarity
// ============================================================================

/**
 * Skin color groupings by tone family.
 *
 * Groups are used to calculate proximity-based similarity when
 * colors don't match exactly.
 */
const SKIN_COLOR_GROUPS: Record<SkinColor, 'light' | 'medium' | 'dark'> = {
  Pale: 'light',
  Light: 'light',
  Tanned: 'medium',
  Yellow: 'medium',
  Brown: 'medium',
  DarkBrown: 'dark',
  Black: 'dark',
}

/**
 * Calculates similarity between two skin colors.
 *
 * Uses grouped proximity matching where colors in the same tone family
 * score higher than colors in different families.
 *
 * @param a - First skin color
 * @param b - Second skin color
 * @returns Similarity score between 0.0 and 1.0
 *
 * @example
 * ```typescript
 * calculateSkinColorSimilarity('Light', 'Light')   // Returns 1.0 (exact)
 * calculateSkinColorSimilarity('Light', 'Pale')    // Returns 0.7 (same group)
 * calculateSkinColorSimilarity('Light', 'Brown')   // Returns 0.3 (adjacent)
 * calculateSkinColorSimilarity('Pale', 'Black')    // Returns 0.0 (opposite)
 * ```
 */
export function calculateSkinColorSimilarity(a: SkinColor, b: SkinColor): number {
  // Exact match
  if (a === b) return 1.0

  const groupA = SKIN_COLOR_GROUPS[a]
  const groupB = SKIN_COLOR_GROUPS[b]

  // Same group (e.g., Light and Pale both in 'light')
  if (groupA === groupB) return 0.7

  // Adjacent groups (light↔medium or medium↔dark)
  const isAdjacent =
(groupA === 'light' && groupB === 'medium') ||
    (groupA === 'medium' && groupB === 'light') ||
    (groupA === 'medium' && groupB === 'dark') ||
    (groupA === 'dark' && groupB === 'medium')

  if (isAdjacent) return 0.3

  // Opposite groups
  return 0
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
      return calculateSkinColorSimilarity(value1 as SkinColor, value2 as SkinColor)
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
 * Get the weight for a given attribute from the weights configuration
 */
function getAttributeWeight(attribute: AvatarAttribute, weights: MatchWeights): number {
  const weightKey = attribute as keyof MatchWeights
  return weights[weightKey] ?? 1.0
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
 * @param config - Matching configuration with weights and thresholds
 * @returns MatchResult with score, isMatch flag, and attribute breakdown
 *
 * @example
 * ```typescript
 * const result = compareAvatars(post.targetAvatar, user.ownAvatar)
 * if (result.isMatch) {
 *   console.log(`Match found with ${result.score}% confidence (${result.quality})`)
 * }
 * ```
 */
export function compareAvatars(
  targetAvatar: AvatarConfig,
  consumerAvatar: AvatarConfig,
  config: MatchConfig = DEFAULT_MATCH_CONFIG
): MatchResult {
  const details: AttributeMatchDetail[] = []
  const breakdown: Partial<AttributeBreakdown> = {}
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
    const weight = getAttributeWeight(attribute, config.weights)
    const similarity = calculateAttributeSimilarity(
      attribute,
      targetValue,
      consumerValue
    )

    const weightedAttributeScore = similarity * weight
    const contribution = weightedAttributeScore
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

    // Add to breakdown
    const scoreDetail: AttributeScoreDetail = {
      similarity,
      weight,
      contribution,
    }

    if (attribute === 'facialHairColor' || attribute === 'graphicType') {
      const applicable = attribute === 'facialHairColor' 
        ? targetAvatar.facialHairType !== 'Blank' && consumerAvatar.facialHairType !== 'Blank'
        : targetAvatar.clotheType === 'GraphicShirt' && consumerAvatar.clotheType === 'GraphicShirt'
      
      breakdown[attribute as keyof AttributeBreakdown] = {
        ...scoreDetail,
        applicable,
      } as ConditionalAttributeScoreDetail
    } else {
      breakdown[attribute as keyof AttributeBreakdown] = scoreDetail
    }
  }

  // Calculate percentage score (0-100)
  const score = Math.round((totalWeightedScore / maxPossibleScore) * 100)

  // Determine quality tier
  const quality: MatchQuality =
    score >= config.thresholds.excellent
      ? 'excellent'
      : score >= config.thresholds.good
      ? 'good'
      : score >= config.thresholds.fair
      ? 'fair'
      : 'poor'

  // Build simplified attribute matches for MatchResult interface
  const attributeMatches = details.map((d) => ({
    attribute: d.attribute,
    matches: d.matches,
    weight: d.weight,
  }))

  return {
    score,
    quality,
    isMatch: score >= config.thresholds.fair,
    minThreshold: config.thresholds.fair,
    breakdown: breakdown as AttributeBreakdown,
    attributeMatches,
  }
}

/**
 * Compare avatars with detailed result information
 *
 * @param targetAvatar - The avatar in the post (describing person of interest)
 * @param consumerAvatar - The consumer's own avatar (self-description)
 * @param config - Matching configuration with weights and thresholds
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
  config: MatchConfig = DEFAULT_MATCH_CONFIG
): DetailedMatchResult {
  const baseResult = compareAvatars(targetAvatar, consumerAvatar, config)
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
    const weight = getAttributeWeight(attribute, config.weights)
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

  return {
    ...baseResult,
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
 * @param config - Matching configuration
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
  config: MatchConfig = DEFAULT_MATCH_CONFIG
): Array<{ postId: string; score: number; isMatch: boolean }> {
  const results = posts.map((post) => {
    const result = compareAvatars(post.target_avatar, consumerAvatar, config)
    return {
      postId: post.id,
      score: result.score,
      isMatch: result.isMatch,
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
 * @param config - Matching configuration
 * @returns Filtered array of posts that match
 */
export function filterMatchingPosts<T extends { id: string; target_avatar: AvatarConfig }>(
  consumerAvatar: AvatarConfig,
  posts: T[],
  config: MatchConfig = DEFAULT_MATCH_CONFIG
): T[] {
  return posts.filter((post) => {
    const result = compareAvatars(post.target_avatar, consumerAvatar, config)
    return result.isMatch
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
  const qualityDescriptions: Record<MatchQuality, string> = {
    excellent: 'Excellent match',
    good: 'Good match',
    fair: 'Fair match',
    poor: 'Poor match',
  }

  return `${qualityDescriptions[result.quality]} (${result.score}%)`
}