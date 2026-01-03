/**
 * Verification Tier Utilities
 *
 * Configuration and utility functions for the tiered verification system.
 * Used for styling badges, sorting responses, and displaying tier information.
 */

import type { VerificationTier } from '../../types/database'

/**
 * Configuration for each verification tier
 */
export interface TierConfig {
  /** Display label */
  label: string
  /** Short label for compact display */
  shortLabel: string
  /** Primary color (hex) */
  color: string
  /** Background color for badges (hex) */
  bgColor: string
  /** Ionicons icon name */
  icon: string
  /** Priority for sorting (lower = higher priority) */
  priority: number
  /** Description for tooltips/help text */
  description: string
}

/**
 * Configuration for all verification tiers
 */
export const TIER_CONFIG: Record<VerificationTier, TierConfig> = {
  verified_checkin: {
    label: 'Verified',
    shortLabel: 'V',
    color: '#10B981', // Emerald-500
    bgColor: '#D1FAE5', // Emerald-100
    icon: 'checkmark-shield',
    priority: 1,
    description: 'GPS-verified check-in at this location during the time window',
  },
  regular_spot: {
    label: 'Regular',
    shortLabel: 'R',
    color: '#F59E0B', // Amber-500
    bgColor: '#FEF3C7', // Amber-100
    icon: 'heart',
    priority: 2,
    description: 'This is one of their saved favorite locations',
  },
  unverified_claim: {
    label: 'Claimed',
    shortLabel: 'C',
    color: '#6B7280', // Gray-500
    bgColor: '#F3F4F6', // Gray-100
    icon: 'help-circle',
    priority: 3,
    description: 'Claims to have been at this location (unverified)',
  },
} as const

/**
 * Get configuration for a specific tier
 */
export function getTierConfig(tier: VerificationTier): TierConfig {
  return TIER_CONFIG[tier]
}

/**
 * Get the label for a tier
 */
export function getTierLabel(tier: VerificationTier): string {
  return TIER_CONFIG[tier].label
}

/**
 * Get the color for a tier
 */
export function getTierColor(tier: VerificationTier): string {
  return TIER_CONFIG[tier].color
}

/**
 * Get the background color for a tier
 */
export function getTierBgColor(tier: VerificationTier): string {
  return TIER_CONFIG[tier].bgColor
}

/**
 * Get the icon name for a tier
 */
export function getTierIcon(tier: VerificationTier): string {
  return TIER_CONFIG[tier].icon
}

/**
 * Compare two tiers for sorting (Tier 1 < Tier 2 < Tier 3)
 * Returns negative if a should come before b
 */
export function compareTiers(a: VerificationTier, b: VerificationTier): number {
  return TIER_CONFIG[a].priority - TIER_CONFIG[b].priority
}

/**
 * Check if tier a is higher priority than tier b
 */
export function isHigherTier(a: VerificationTier, b: VerificationTier): boolean {
  return TIER_CONFIG[a].priority < TIER_CONFIG[b].priority
}

/**
 * Check if a tier is verified (Tier 1)
 */
export function isVerifiedTier(tier: VerificationTier): boolean {
  return tier === 'verified_checkin'
}

/**
 * Check if a tier is at least regular (Tier 1 or 2)
 */
export function isAtLeastRegularTier(tier: VerificationTier): boolean {
  return tier === 'verified_checkin' || tier === 'regular_spot'
}

/**
 * Get a human-readable description of the tier for UI display
 */
export function getTierDescription(tier: VerificationTier): string {
  return TIER_CONFIG[tier].description
}

/**
 * Sort items by their verification tier (verified first)
 */
export function sortByTier<T extends { verification_tier: VerificationTier }>(
  items: T[]
): T[] {
  return [...items].sort((a, b) => compareTiers(a.verification_tier, b.verification_tier))
}

/**
 * Group items by their verification tier
 */
export function groupByTier<T extends { verification_tier: VerificationTier }>(
  items: T[]
): Record<VerificationTier, T[]> {
  const grouped: Record<VerificationTier, T[]> = {
    verified_checkin: [],
    regular_spot: [],
    unverified_claim: [],
  }

  for (const item of items) {
    grouped[item.verification_tier].push(item)
  }

  return grouped
}

/**
 * Get tier counts for display (e.g., "3 verified, 5 other")
 */
export function getTierCounts<T extends { verification_tier: VerificationTier }>(
  items: T[]
): { verified: number; regular: number; unverified: number; total: number } {
  const grouped = groupByTier(items)
  return {
    verified: grouped.verified_checkin.length,
    regular: grouped.regular_spot.length,
    unverified: grouped.unverified_claim.length,
    total: items.length,
  }
}
