/**
 * useLocationStreaks Hook
 *
 * Custom hook for fetching and managing location visit streaks.
 * Provides access to user's streak data across all locations.
 *
 * Features:
 * - Fetch all streaks for the current user
 * - Get streaks for a specific location
 * - Get recent milestone achievements
 * - Loading and error states
 * - Auto-refresh capability
 *
 * @module hooks/useLocationStreaks
 *
 * @example
 * ```tsx
 * function ProfileScreen() {
 *   const { streaks, isLoading, topStreaks } = useLocationStreaks()
 *
 *   return (
 *     <View>
 *       <Text>Your Top Streaks</Text>
 *       {topStreaks.map(streak => (
 *         <StreakCard key={streak.id} streak={streak} />
 *       ))}
 *     </View>
 *   )
 * }
 * ```
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import type {
  LocationStreakWithDetails,
  StreakMilestoneRecord,
  StreakType,
  LocationStreakSummary,
} from '../types/streaks'

// ============================================================================
// Types
// ============================================================================

/**
 * Error type for streak operations
 */
export interface StreaksError {
  /** Error code for programmatic handling */
  code: 'AUTH_ERROR' | 'FETCH_ERROR'
  /** Human-readable error message */
  message: string
}

/**
 * Options for the useLocationStreaks hook
 */
export interface UseLocationStreaksOptions {
  /** Whether to fetch automatically on mount (default: true) */
  enabled?: boolean
  /** Filter by specific location ID */
  locationId?: string
  /** Filter by specific streak type */
  streakType?: StreakType
  /** Limit number of results */
  limit?: number
}

/**
 * Return value from useLocationStreaks hook
 */
export interface UseLocationStreaksResult {
  /** All streaks for the user */
  streaks: LocationStreakWithDetails[]
  /** Top streaks (sorted by current streak count) */
  topStreaks: LocationStreakWithDetails[]
  /** Recent milestone achievements */
  milestones: StreakMilestoneRecord[]
  /** Whether initial fetch is in progress */
  isLoading: boolean
  /** Error object if fetch failed */
  error: StreaksError | null
  /** Function to manually trigger a refetch */
  refetch: () => Promise<void>
  /** Timestamp of the last successful fetch */
  lastFetchedAt: number | null
  /** Get streak summary for a specific location */
  getLocationStreakSummary: (locationId: string) => LocationStreakSummary | null
  /** Get the best streak for a location */
  getBestStreak: (locationId: string) => LocationStreakWithDetails | null
}

// ============================================================================
// Constants
// ============================================================================

const AUTH_ERROR_MESSAGE = 'You must be logged in to view streaks.'

// ============================================================================
// Hook Implementation
// ============================================================================

/**
 * React hook for fetching and managing location streaks.
 *
 * @param options - Configuration options for the hook
 * @returns Object containing streaks, milestones, state, and helper functions
 */
export function useLocationStreaks(
  options: UseLocationStreaksOptions = {}
): UseLocationStreaksResult {
  const { enabled = true, locationId, streakType, limit = 50 } = options

  // ---------------------------------------------------------------------------
  // Auth Context
  // ---------------------------------------------------------------------------

  const { userId, isAuthenticated } = useAuth()

  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------

  const [streaks, setStreaks] = useState<LocationStreakWithDetails[]>([])
  const [milestones, setMilestones] = useState<StreakMilestoneRecord[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<StreaksError | null>(null)
  const [lastFetchedAt, setLastFetchedAt] = useState<number | null>(null)

  // ---------------------------------------------------------------------------
  // Supabase Client
  // ---------------------------------------------------------------------------

  // supabase imported from lib/supabase

  // ---------------------------------------------------------------------------
  // Fetch Operations
  // ---------------------------------------------------------------------------

  /**
   * Fetch all streaks for the current user
   */
  const fetchStreaks = useCallback(async () => {
    if (!isAuthenticated || !userId) {
      setStreaks([])
      setError({
        code: 'AUTH_ERROR',
        message: AUTH_ERROR_MESSAGE,
      })
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // Call the RPC function to get streaks with location details
      const { data, error: rpcError } = await supabase.rpc('get_user_streaks', {
        p_user_id: userId,
        p_location_id: locationId || null,
        p_streak_type: streakType || null,
      })

      if (rpcError) {
        console.error('Error fetching streaks:', rpcError)
        setError({
          code: 'FETCH_ERROR',
          message: rpcError.message || 'Failed to fetch streaks',
        })
        return
      }

      // Map the response to our type
      const streakData: LocationStreakWithDetails[] = (data || []).map((row: Record<string, unknown>) => ({
        id: row.id as string,
        user_id: row.user_id as string,
        location_id: row.location_id as string,
        streak_type: row.streak_type as StreakType,
        current_streak: row.current_streak as number,
        longest_streak: row.longest_streak as number,
        last_visit_period: row.last_visit_period as string | null,
        total_visits: row.total_visits as number,
        started_at: row.started_at as string | null,
        updated_at: row.updated_at as string || new Date().toISOString(),
        location_name: row.location_name as string,
        location_address: row.location_address as string | null,
      }))

      setStreaks(streakData)
      setLastFetchedAt(Date.now())
    } catch (err) {
      console.error('Error fetching streaks:', err)
      setError({
        code: 'FETCH_ERROR',
        message: err instanceof Error ? err.message : 'Failed to fetch streaks',
      })
    } finally {
      setIsLoading(false)
    }
  }, [supabase, userId, isAuthenticated, locationId, streakType])

  /**
   * Fetch recent milestones for the current user
   */
  const fetchMilestones = useCallback(async () => {
    if (!isAuthenticated || !userId) {
      setMilestones([])
      return
    }

    try {
      const { data, error: rpcError } = await supabase.rpc('get_user_milestones', {
        p_user_id: userId,
        p_limit: 20,
      })

      if (rpcError) {
        console.error('Error fetching milestones:', rpcError)
        return
      }

      const milestoneData: StreakMilestoneRecord[] = (data || []).map((row: Record<string, unknown>) => ({
        id: row.id as string,
        user_id: userId,
        location_id: row.location_id as string,
        streak_type: row.streak_type as StreakType,
        milestone: row.milestone as number,
        achieved_at: row.achieved_at as string,
        location_name: row.location_name as string,
      }))

      setMilestones(milestoneData)
    } catch (err) {
      console.error('Error fetching milestones:', err)
    }
  }, [supabase, userId, isAuthenticated])

  /**
   * Manual refetch function
   */
  const refetch = useCallback(async () => {
    await Promise.all([fetchStreaks(), fetchMilestones()])
  }, [fetchStreaks, fetchMilestones])

  // ---------------------------------------------------------------------------
  // Computed Values
  // ---------------------------------------------------------------------------

  /**
   * Top streaks sorted by current streak count
   */
  const topStreaks = useMemo(() => {
    return [...streaks]
      .filter((s) => s.current_streak > 0)
      .sort((a, b) => b.current_streak - a.current_streak)
      .slice(0, limit)
  }, [streaks, limit])

  /**
   * Get streak summary for a specific location
   */
  const getLocationStreakSummary = useCallback(
    (locId: string): LocationStreakSummary | null => {
      const locationStreaks = streaks.filter((s) => s.location_id === locId)

      if (locationStreaks.length === 0) {
        return null
      }

      const summary: LocationStreakSummary = {}

      for (const streak of locationStreaks) {
        summary[streak.streak_type] = {
          current: streak.current_streak,
          longest: streak.longest_streak,
          total: streak.total_visits,
        }
      }

      return summary
    },
    [streaks]
  )

  /**
   * Get the best (highest current) streak for a location
   */
  const getBestStreak = useCallback(
    (locId: string): LocationStreakWithDetails | null => {
      const locationStreaks = streaks.filter(
        (s) => s.location_id === locId && s.current_streak > 0
      )

      if (locationStreaks.length === 0) {
        return null
      }

      return locationStreaks.reduce((best, current) =>
        current.current_streak > best.current_streak ? current : best
      )
    },
    [streaks]
  )

  // ---------------------------------------------------------------------------
  // Effects
  // ---------------------------------------------------------------------------

  /**
   * Fetch streaks on mount when enabled and authenticated
   */
  useEffect(() => {
    if (!enabled) {
      return
    }

    if (!isAuthenticated) {
      setStreaks([])
      setMilestones([])
      return
    }

    fetchStreaks()
    fetchMilestones()
  }, [enabled, isAuthenticated, fetchStreaks, fetchMilestones])

  // ---------------------------------------------------------------------------
  // Return
  // ---------------------------------------------------------------------------

  return {
    streaks,
    topStreaks,
    milestones,
    isLoading,
    error,
    refetch,
    lastFetchedAt,
    getLocationStreakSummary,
    getBestStreak,
  }
}

// ============================================================================
// Additional Hooks
// ============================================================================

/**
 * Hook to get streak data for a single location
 */
export function useLocationStreak(locationId: string) {
  const { streaks, isLoading, error, getLocationStreakSummary, getBestStreak, refetch } =
    useLocationStreaks({ locationId })

  const summary = useMemo(
    () => getLocationStreakSummary(locationId),
    [getLocationStreakSummary, locationId]
  )

  const bestStreak = useMemo(
    () => getBestStreak(locationId),
    [getBestStreak, locationId]
  )

  return {
    streaks: streaks.filter((s) => s.location_id === locationId),
    summary,
    bestStreak,
    isLoading,
    error,
    refetch,
  }
}

// ============================================================================
// Exports
// ============================================================================

export default useLocationStreaks
