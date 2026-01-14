/**
 * Tests for lib/utils/tiers.ts
 *
 * Tests verification tier utilities.
 */

import { describe, it, expect } from 'vitest'

import {
  TIER_CONFIG,
  getTierConfig,
  getTierLabel,
  getTierColor,
  getTierBgColor,
  getTierIcon,
  compareTiers,
  isHigherTier,
  isVerifiedTier,
  isAtLeastRegularTier,
  getTierDescription,
  sortByTier,
  groupByTier,
  getTierCounts,
} from '../tiers'
import type { VerificationTier } from '../../../types/database'

describe('TIER_CONFIG', () => {
  it('should have config for verified_checkin', () => {
    expect(TIER_CONFIG.verified_checkin).toBeDefined()
    expect(TIER_CONFIG.verified_checkin.label).toBe('Verified')
    expect(TIER_CONFIG.verified_checkin.shortLabel).toBe('V')
    expect(TIER_CONFIG.verified_checkin.priority).toBe(1)
  })

  it('should have config for regular_spot', () => {
    expect(TIER_CONFIG.regular_spot).toBeDefined()
    expect(TIER_CONFIG.regular_spot.label).toBe('Regular')
    expect(TIER_CONFIG.regular_spot.shortLabel).toBe('R')
    expect(TIER_CONFIG.regular_spot.priority).toBe(2)
  })

  it('should have config for unverified_claim', () => {
    expect(TIER_CONFIG.unverified_claim).toBeDefined()
    expect(TIER_CONFIG.unverified_claim.label).toBe('Claimed')
    expect(TIER_CONFIG.unverified_claim.shortLabel).toBe('C')
    expect(TIER_CONFIG.unverified_claim.priority).toBe(3)
  })

  it('should have correct colors', () => {
    expect(TIER_CONFIG.verified_checkin.color).toBe('#10B981')
    expect(TIER_CONFIG.regular_spot.color).toBe('#F59E0B')
    expect(TIER_CONFIG.unverified_claim.color).toBe('#6B7280')
  })

  it('should have icons for all tiers', () => {
    expect(TIER_CONFIG.verified_checkin.icon).toBe('checkmark-shield')
    expect(TIER_CONFIG.regular_spot.icon).toBe('heart')
    expect(TIER_CONFIG.unverified_claim.icon).toBe('help-circle')
  })
})

describe('getTierConfig', () => {
  it('should return config for verified_checkin', () => {
    const config = getTierConfig('verified_checkin')
    expect(config.label).toBe('Verified')
    expect(config.priority).toBe(1)
  })

  it('should return config for regular_spot', () => {
    const config = getTierConfig('regular_spot')
    expect(config.label).toBe('Regular')
    expect(config.priority).toBe(2)
  })

  it('should return config for unverified_claim', () => {
    const config = getTierConfig('unverified_claim')
    expect(config.label).toBe('Claimed')
    expect(config.priority).toBe(3)
  })
})

describe('getTierLabel', () => {
  it('should return correct labels', () => {
    expect(getTierLabel('verified_checkin')).toBe('Verified')
    expect(getTierLabel('regular_spot')).toBe('Regular')
    expect(getTierLabel('unverified_claim')).toBe('Claimed')
  })
})

describe('getTierColor', () => {
  it('should return correct colors', () => {
    expect(getTierColor('verified_checkin')).toBe('#10B981')
    expect(getTierColor('regular_spot')).toBe('#F59E0B')
    expect(getTierColor('unverified_claim')).toBe('#6B7280')
  })
})

describe('getTierBgColor', () => {
  it('should return correct background colors', () => {
    expect(getTierBgColor('verified_checkin')).toBe('#D1FAE5')
    expect(getTierBgColor('regular_spot')).toBe('#FEF3C7')
    expect(getTierBgColor('unverified_claim')).toBe('#F3F4F6')
  })
})

describe('getTierIcon', () => {
  it('should return correct icons', () => {
    expect(getTierIcon('verified_checkin')).toBe('checkmark-shield')
    expect(getTierIcon('regular_spot')).toBe('heart')
    expect(getTierIcon('unverified_claim')).toBe('help-circle')
  })
})

describe('compareTiers', () => {
  it('should return negative when first tier is higher priority', () => {
    expect(compareTiers('verified_checkin', 'regular_spot')).toBeLessThan(0)
    expect(compareTiers('verified_checkin', 'unverified_claim')).toBeLessThan(0)
    expect(compareTiers('regular_spot', 'unverified_claim')).toBeLessThan(0)
  })

  it('should return positive when first tier is lower priority', () => {
    expect(compareTiers('regular_spot', 'verified_checkin')).toBeGreaterThan(0)
    expect(compareTiers('unverified_claim', 'verified_checkin')).toBeGreaterThan(0)
    expect(compareTiers('unverified_claim', 'regular_spot')).toBeGreaterThan(0)
  })

  it('should return zero for same tier', () => {
    expect(compareTiers('verified_checkin', 'verified_checkin')).toBe(0)
    expect(compareTiers('regular_spot', 'regular_spot')).toBe(0)
    expect(compareTiers('unverified_claim', 'unverified_claim')).toBe(0)
  })
})

describe('isHigherTier', () => {
  it('should return true when first tier is higher priority', () => {
    expect(isHigherTier('verified_checkin', 'regular_spot')).toBe(true)
    expect(isHigherTier('verified_checkin', 'unverified_claim')).toBe(true)
    expect(isHigherTier('regular_spot', 'unverified_claim')).toBe(true)
  })

  it('should return false when first tier is lower priority', () => {
    expect(isHigherTier('regular_spot', 'verified_checkin')).toBe(false)
    expect(isHigherTier('unverified_claim', 'verified_checkin')).toBe(false)
    expect(isHigherTier('unverified_claim', 'regular_spot')).toBe(false)
  })

  it('should return false for same tier', () => {
    expect(isHigherTier('verified_checkin', 'verified_checkin')).toBe(false)
    expect(isHigherTier('regular_spot', 'regular_spot')).toBe(false)
    expect(isHigherTier('unverified_claim', 'unverified_claim')).toBe(false)
  })
})

describe('isVerifiedTier', () => {
  it('should return true only for verified_checkin', () => {
    expect(isVerifiedTier('verified_checkin')).toBe(true)
    expect(isVerifiedTier('regular_spot')).toBe(false)
    expect(isVerifiedTier('unverified_claim')).toBe(false)
  })
})

describe('isAtLeastRegularTier', () => {
  it('should return true for verified_checkin and regular_spot', () => {
    expect(isAtLeastRegularTier('verified_checkin')).toBe(true)
    expect(isAtLeastRegularTier('regular_spot')).toBe(true)
    expect(isAtLeastRegularTier('unverified_claim')).toBe(false)
  })
})

describe('getTierDescription', () => {
  it('should return descriptions for all tiers', () => {
    expect(getTierDescription('verified_checkin')).toContain('GPS-verified')
    expect(getTierDescription('regular_spot')).toContain('favorite')
    expect(getTierDescription('unverified_claim')).toContain('unverified')
  })
})

describe('sortByTier', () => {
  it('should sort items by tier priority', () => {
    const items: { verification_tier: VerificationTier }[] = [
      { verification_tier: 'unverified_claim' },
      { verification_tier: 'verified_checkin' },
      { verification_tier: 'regular_spot' },
    ]

    const sorted = sortByTier(items)

    expect(sorted[0].verification_tier).toBe('verified_checkin')
    expect(sorted[1].verification_tier).toBe('regular_spot')
    expect(sorted[2].verification_tier).toBe('unverified_claim')
  })

  it('should not mutate original array', () => {
    const items: { verification_tier: VerificationTier }[] = [
      { verification_tier: 'unverified_claim' },
      { verification_tier: 'verified_checkin' },
    ]

    sortByTier(items)

    expect(items[0].verification_tier).toBe('unverified_claim')
    expect(items[1].verification_tier).toBe('verified_checkin')
  })

  it('should handle empty array', () => {
    const sorted = sortByTier([])
    expect(sorted).toEqual([])
  })

  it('should handle array with same tier', () => {
    const items: { verification_tier: VerificationTier }[] = [
      { verification_tier: 'regular_spot' },
      { verification_tier: 'regular_spot' },
    ]

    const sorted = sortByTier(items)
    expect(sorted).toHaveLength(2)
  })
})

describe('groupByTier', () => {
  it('should group items by tier', () => {
    const items: { verification_tier: VerificationTier; id: string }[] = [
      { verification_tier: 'verified_checkin', id: 'a' },
      { verification_tier: 'regular_spot', id: 'b' },
      { verification_tier: 'verified_checkin', id: 'c' },
      { verification_tier: 'unverified_claim', id: 'd' },
    ]

    const grouped = groupByTier(items)

    expect(grouped.verified_checkin).toHaveLength(2)
    expect(grouped.regular_spot).toHaveLength(1)
    expect(grouped.unverified_claim).toHaveLength(1)
  })

  it('should return empty arrays for missing tiers', () => {
    const items: { verification_tier: VerificationTier }[] = [
      { verification_tier: 'verified_checkin' },
    ]

    const grouped = groupByTier(items)

    expect(grouped.verified_checkin).toHaveLength(1)
    expect(grouped.regular_spot).toHaveLength(0)
    expect(grouped.unverified_claim).toHaveLength(0)
  })

  it('should handle empty array', () => {
    const grouped = groupByTier([])

    expect(grouped.verified_checkin).toEqual([])
    expect(grouped.regular_spot).toEqual([])
    expect(grouped.unverified_claim).toEqual([])
  })
})

describe('getTierCounts', () => {
  it('should count items by tier', () => {
    const items: { verification_tier: VerificationTier }[] = [
      { verification_tier: 'verified_checkin' },
      { verification_tier: 'verified_checkin' },
      { verification_tier: 'regular_spot' },
      { verification_tier: 'unverified_claim' },
      { verification_tier: 'unverified_claim' },
      { verification_tier: 'unverified_claim' },
    ]

    const counts = getTierCounts(items)

    expect(counts.verified).toBe(2)
    expect(counts.regular).toBe(1)
    expect(counts.unverified).toBe(3)
    expect(counts.total).toBe(6)
  })

  it('should handle empty array', () => {
    const counts = getTierCounts([])

    expect(counts.verified).toBe(0)
    expect(counts.regular).toBe(0)
    expect(counts.unverified).toBe(0)
    expect(counts.total).toBe(0)
  })

  it('should handle array with only one tier', () => {
    const items: { verification_tier: VerificationTier }[] = [
      { verification_tier: 'verified_checkin' },
      { verification_tier: 'verified_checkin' },
    ]

    const counts = getTierCounts(items)

    expect(counts.verified).toBe(2)
    expect(counts.regular).toBe(0)
    expect(counts.unverified).toBe(0)
    expect(counts.total).toBe(2)
  })
})
