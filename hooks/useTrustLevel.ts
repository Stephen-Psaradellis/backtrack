/**
 * useTrustLevel Hook
 *
 * Custom hook for managing and displaying user trust levels.
 * The trust system is a graduated 5-tier system that rewards user engagement
 * and unlocks progressive features.
 *
 * Trust Tiers:
 * 1. Newcomer (0-49 pts) - Basic access
 * 2. Regular (50-199 pts) - Unlock reactions, see approximate times
 * 3. Trusted (200-499 pts) - See broader radius details, icebreakers
 * 4. Verified (500-999 pts) - Full detail access, priority matching
 * 5. Ambassador (1000+ pts) - All features, special badge
 *
 * @example
 * ```tsx
 * function ProfileSection() {
 *   const { trustLevel, trustPoints, tierName, description, pointsToNext, progressPercent, refresh } = useTrustLevel()
 *
 *   return (
 *     <View>
 *       <Text>{tierName} ({trustPoints} points)</Text>
 *       <Text>{description}</Text>
 *       <Text>{pointsToNext} points to next tier</Text>
 *       <ProgressBar value={progressPercent} />
 *     </View>
 *   )
 * }
 * ```
 */

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

// ============================================================================
// TYPES
// ============================================================================

/**
 * Trust tier definitions with thresholds and descriptions
 */
export interface TrustTier {
  /** Tier level (1-5) */
  level: number
  /** Tier name */
  name: string
  /** Tier description */
  description: string
  /** Minimum points required for this tier */
  minPoints: number
  /** Maximum points for this tier (null for highest tier) */
  maxPoints: number | null
  /** Icon name for tier badge */
  icon: string
  /** Color for tier badge */
  color: string
}

/**
 * Trust level state
 */
export interface TrustLevelState {
  /** Current trust level (1-5) */
  trustLevel: number
  /** Current trust points */
  trustPoints: number
  /** Current tier information */
  tier: TrustTier
  /** Tier name (e.g., "Regular") */
  tierName: string
  /** Tier description */
  description: string
  /** Points needed to reach next tier (0 if at max tier) */
  pointsToNext: number
  /** Progress to next tier as percentage (0-100) */
  progressPercent: number
  /** Whether data is being loaded */
  isLoading: boolean
  /** Error message if any */
  error: string | null
  /** Refresh trust level data */
  refresh: () => Promise<void>
}

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Trust tier definitions
 */
export const TRUST_TIERS: TrustTier[] = [
  {
    level: 1,
    name: 'Newcomer',
    description: 'Basic access',
    minPoints: 0,
    maxPoints: 49,
    icon: 'shield-outline',
    color: '#6B7280', // gray
  },
  {
    level: 2,
    name: 'Regular',
    description: 'Unlock reactions and approximate times',
    minPoints: 50,
    maxPoints: 199,
    icon: 'shield-checkmark-outline',
    color: '#3B82F6', // blue
  },
  {
    level: 3,
    name: 'Trusted',
    description: 'See broader radius details and icebreakers',
    minPoints: 200,
    maxPoints: 499,
    icon: 'shield-checkmark',
    color: '#8B5CF6', // purple
  },
  {
    level: 4,
    name: 'Verified',
    description: 'Full detail access and priority matching',
    minPoints: 500,
    maxPoints: 999,
    icon: 'ribbon',
    color: '#F59E0B', // amber
  },
  {
    level: 5,
    name: 'Ambassador',
    description: 'All features unlocked with special badge',
    minPoints: 1000,
    maxPoints: null,
    icon: 'star',
    color: '#10B981', // green
  },
]

/**
 * Get tier information for a given level
 */
function getTierForLevel(level: number): TrustTier {
  return TRUST_TIERS.find((tier) => tier.level === level) || TRUST_TIERS[0]
}

/**
 * Get tier information for given points
 */
function getTierForPoints(points: number): TrustTier {
  // Find the highest tier whose minPoints is <= points
  for (let i = TRUST_TIERS.length - 1; i >= 0; i--) {
    if (points >= TRUST_TIERS[i].minPoints) {
      return TRUST_TIERS[i]
    }
  }
  return TRUST_TIERS[0]
}

/**
 * Calculate points needed to reach next tier
 */
function getPointsToNextTier(currentPoints: number, currentTier: TrustTier): number {
  // If at max tier, return 0
  if (currentTier.maxPoints === null) {
    return 0
  }

  // Find next tier
  const nextTier = TRUST_TIERS.find((tier) => tier.level === currentTier.level + 1)
  if (!nextTier) {
    return 0
  }

  return nextTier.minPoints - currentPoints
}

/**
 * Calculate progress percentage to next tier
 */
function getProgressPercent(currentPoints: number, currentTier: TrustTier): number {
  // If at max tier, return 100%
  if (currentTier.maxPoints === null) {
    return 100
  }

  // Calculate progress within current tier
  const tierRange = currentTier.maxPoints - currentTier.minPoints + 1
  const progressInTier = currentPoints - currentTier.minPoints
  return Math.floor((progressInTier / tierRange) * 100)
}

// ============================================================================
// HOOK
// ============================================================================

/**
 * useTrustLevel hook
 *
 * Manages user trust level state and provides utilities for displaying
 * trust information and progress.
 */
export function useTrustLevel(): TrustLevelState {
  const { user, profile } = useAuth()

  const [trustLevel, setTrustLevel] = useState<number>(profile?.trust_level ?? 1)
  const [trustPoints, setTrustPoints] = useState<number>(profile?.trust_points ?? 0)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /**
   * Fetch latest trust level data from database
   */
  const fetchTrustLevel = useCallback(async () => {
    if (!user?.id) return

    setIsLoading(true)
    setError(null)

    try {
      // Update trust level (calculates points and updates profile)
      const { error: updateError } = await supabase.rpc('update_user_trust_level', {
        p_user_id: user.id,
      })

      if (updateError) {
        throw updateError
      }

      // Fetch updated profile
      const { data: profileData, error: fetchError } = await supabase
        .from('profiles')
        .select('trust_level, trust_points')
        .eq('id', user.id)
        .single()

      if (fetchError) {
        throw fetchError
      }

      if (profileData) {
        setTrustLevel(profileData.trust_level ?? 1)
        setTrustPoints(profileData.trust_points ?? 0)
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch trust level'
      setError(message)
      if (__DEV__) console.error('[useTrustLevel] Error fetching trust level:', err)
    } finally {
      setIsLoading(false)
    }
  }, [user?.id])

  /**
   * Initialize trust level from profile on mount
   */
  useEffect(() => {
    if (profile?.trust_level !== undefined && profile?.trust_points !== undefined) {
      setTrustLevel(profile.trust_level)
      setTrustPoints(profile.trust_points)
    }
  }, [profile?.trust_level, profile?.trust_points])

  /**
   * Subscribe to profile changes for real-time updates
   */
  useEffect(() => {
    if (!user?.id) return

    const channel = supabase
      .channel(`trust-level-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${user.id}`,
        },
        (payload) => {
          const newProfile = payload.new as { trust_level?: number; trust_points?: number }
          if (newProfile.trust_level !== undefined) {
            setTrustLevel(newProfile.trust_level)
          }
          if (newProfile.trust_points !== undefined) {
            setTrustPoints(newProfile.trust_points)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user?.id])

  // Calculate derived values
  const tier = getTierForLevel(trustLevel)
  const pointsToNext = getPointsToNextTier(trustPoints, tier)
  const progressPercent = getProgressPercent(trustPoints, tier)

  return {
    trustLevel,
    trustPoints,
    tier,
    tierName: tier.name,
    description: tier.description,
    pointsToNext,
    progressPercent,
    isLoading,
    error,
    refresh: fetchTrustLevel,
  }
}
