/**
 * useAchievements Hook
 *
 * React hook for managing user achievements and trophies.
 * Provides access to earned achievements, progress tracking, and award checking.
 *
 * @example
 * ```tsx
 * function ProfileScreen() {
 *   const {
 *     achievements,
 *     earnedAchievements,
 *     allDefinitions,
 *     loading,
 *     progress,
 *     checkAndAward,
 *   } = useAchievements()
 *
 *   return (
 *     <View>
 *       <Text>Earned: {earnedAchievements.length}/{allDefinitions.length}</Text>
 *       {achievements.map(achievement => (
 *         <AchievementBadge key={achievement.id} achievement={achievement} />
 *       ))}
 *     </View>
 *   )
 * }
 * ```
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

// ============================================================================
// TYPES
// ============================================================================

export interface AchievementDefinition {
  id: string
  category: 'explorer' | 'social' | 'streak' | 'creator' | 'safety'
  name: string
  description: string
  icon: string
  tier: 'bronze' | 'silver' | 'gold'
  requirement_type: string
  requirement_value: number
}

export interface UserAchievement {
  id: string
  user_id: string
  achievement_id: string
  earned_at: string
}

export interface AchievementWithStatus extends AchievementDefinition {
  earned: boolean
  earned_at?: string
  progress?: number
}

export interface AchievementProgress {
  visit_locations: number
  start_conversations: number
  matches: number
  check_in_streak: number
  create_posts: number
  verified: boolean
  reports: number
  trust_days: number
}

export interface StreakLeaderboardEntry {
  user_id: string
  display_name: string | null
  current_streak: number
  max_streak: number
  location_id: string | null
  location_name: string | null
}

export interface UseAchievementsResult {
  /** All achievements with earned status */
  achievements: AchievementWithStatus[]
  /** Only earned achievements */
  earnedAchievements: AchievementWithStatus[]
  /** Only locked (unearned) achievements */
  lockedAchievements: AchievementWithStatus[]
  /** All achievement definitions */
  allDefinitions: AchievementDefinition[]
  /** Whether data is loading */
  loading: boolean
  /** Whether checking/awarding is in progress */
  checking: boolean
  /** Error message if any */
  error: string | null
  /** Current user progress toward achievements */
  progress: AchievementProgress | null
  /** Total earned count */
  earnedCount: number
  /** Total achievement count */
  totalCount: number
  /** Percentage complete (0-100) */
  percentComplete: number
  /** Streak leaderboard entries */
  leaderboard: StreakLeaderboardEntry[]
  /** Whether leaderboard is loading */
  leaderboardLoading: boolean
  /** Current user's streak */
  currentStreak: number

  // Actions
  /** Refresh achievements from server */
  refresh: () => Promise<void>
  /** Check progress and award any new achievements */
  checkAndAward: () => Promise<string[]>
  /** Clear error */
  clearError: () => void
  /** Load streak leaderboard */
  loadLeaderboard: (locationId?: string) => Promise<void>
}

// ============================================================================
// HOOK
// ============================================================================

export function useAchievements(): UseAchievementsResult {
  // Auth context
  const { user } = useAuth()

  // State
  const [allDefinitions, setAllDefinitions] = useState<AchievementDefinition[]>([])
  const [userAchievements, setUserAchievements] = useState<UserAchievement[]>([])
  const [progress, setProgress] = useState<AchievementProgress | null>(null)
  const [loading, setLoading] = useState(true)
  const [checking, setChecking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [leaderboard, setLeaderboard] = useState<StreakLeaderboardEntry[]>([])
  const [leaderboardLoading, setLeaderboardLoading] = useState(false)
  const [currentStreak, setCurrentStreak] = useState(0)

  // Load achievement definitions
  const loadDefinitions = useCallback(async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('achievement_definitions')
        .select('*')
        .order('category', { ascending: true })
        .order('requirement_value', { ascending: true })

      if (fetchError) {
        throw fetchError
      }

      setAllDefinitions(data || [])
    } catch (err) {
      if (__DEV__) console.error('Error loading achievement definitions:', err)
      setError('Failed to load achievements')
    }
  }, [])

  // Load user's earned achievements
  const loadUserAchievements = useCallback(async () => {
    if (!user?.id) {
      setUserAchievements([])
      return
    }

    try {
      const { data, error: fetchError } = await supabase
        .from('user_achievements')
        .select('*')
        .eq('user_id', user.id)
        .order('earned_at', { ascending: false })

      if (fetchError) {
        throw fetchError
      }

      setUserAchievements(data || [])
    } catch (err) {
      if (__DEV__) console.error('Error loading user achievements:', err)
      setError('Failed to load your achievements')
    }
  }, [user?.id])

  // Calculate current progress
  const calculateProgress = useCallback(async () => {
    if (!user?.id) {
      setProgress(null)
      return
    }

    try {
      // Fetch user stats from various tables
      const [
        checkinsResult,
        conversationsResult,
        matchesResult,
        postsResult,
        profileResult,
      ] = await Promise.all([
        // Unique locations visited
        supabase
          .from('checkins')
          .select('location_id')
          .eq('user_id', user.id),

        // Conversations started
        supabase
          .from('conversations')
          .select('id')
          .eq('producer_id', user.id),

        // Matches (conversations with messages)
        supabase
          .from('conversations')
          .select('id, chat_messages(id)')
          .or(`producer_id.eq.${user.id},consumer_id.eq.${user.id}`),

        // Posts created
        supabase
          .from('posts')
          .select('id')
          .eq('user_id', user.id),

        // Profile data
        supabase
          .from('profiles')
          .select('is_verified, created_at')
          .eq('id', user.id)
          .single(),
      ])

      // Calculate unique locations
      const uniqueLocations = new Set(
        checkinsResult.data?.map((c: any) => c.location_id) || []
      ).size

      // Conversations count
      const conversationsCount = conversationsResult.data?.length || 0

      // Matches (conversations with at least one message)
      const matchesCount = matchesResult.data?.filter(
        (c: any) => c.chat_messages && c.chat_messages.length > 0
      ).length || 0

      // Posts count
      const postsCount = postsResult.data?.length || 0

      // Verification status
      const isVerified = profileResult.data?.is_verified || false

      // Account age in days
      const accountAgeDays = profileResult.data?.created_at
        ? Math.floor(
            (Date.now() - new Date(profileResult.data.created_at).getTime()) /
              (1000 * 60 * 60 * 24)
          )
        : 0

      // Calculate streak using the same logic as the RPC function
      const { data: streakData } = await supabase.rpc('calculate_user_streak', {
        p_user_id: user.id,
      })

      const calculatedStreak = streakData || 0
      setCurrentStreak(calculatedStreak)

      setProgress({
        visit_locations: uniqueLocations,
        start_conversations: conversationsCount,
        matches: matchesCount,
        check_in_streak: calculatedStreak,
        create_posts: postsCount,
        verified: isVerified,
        reports: 0, // Would need reports table
        trust_days: accountAgeDays,
      })
    } catch (err) {
      if (__DEV__) console.error('Error calculating progress:', err)
    }
  }, [user?.id])

  // Initial load
  useEffect(() => {
    let isMounted = true

    const load = async () => {
      setLoading(true)
      try {
        await Promise.all([
          loadDefinitions(),
          loadUserAchievements(),
          calculateProgress(),
        ])
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    load()

    return () => {
      isMounted = false
    }
  }, [loadDefinitions, loadUserAchievements, calculateProgress])

  // Computed: Achievements with status
  const achievements = useMemo<AchievementWithStatus[]>(() => {
    return allDefinitions.map((def) => {
      const earned = userAchievements.find((ua) => ua.achievement_id === def.id)

      // Calculate progress percentage if not earned
      let progressPercent = 0
      if (!earned && progress) {
        const currentValue = (progress as any)[def.requirement_type] || 0
        progressPercent = Math.min(
          100,
          Math.floor((currentValue / def.requirement_value) * 100)
        )
      }

      return {
        ...def,
        earned: !!earned,
        earned_at: earned?.earned_at,
        progress: earned ? 100 : progressPercent,
      }
    })
  }, [allDefinitions, userAchievements, progress])

  // Computed: Earned achievements
  const earnedAchievements = useMemo(
    () => achievements.filter((a) => a.earned),
    [achievements]
  )

  // Computed: Locked achievements
  const lockedAchievements = useMemo(
    () => achievements.filter((a) => !a.earned),
    [achievements]
  )

  // Computed: Counts and percentage
  const earnedCount = earnedAchievements.length
  const totalCount = allDefinitions.length
  const percentComplete = totalCount > 0
    ? Math.floor((earnedCount / totalCount) * 100)
    : 0

  // Actions
  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      await Promise.all([
        loadDefinitions(),
        loadUserAchievements(),
        calculateProgress(),
      ])
    } finally {
      setLoading(false)
    }
  }, [loadDefinitions, loadUserAchievements, calculateProgress])

  const checkAndAward = useCallback(async (): Promise<string[]> => {
    if (!user?.id) {
      return []
    }

    setChecking(true)
    setError(null)

    try {
      // Call the RPC function to check and award achievements
      const { data, error: rpcError } = await supabase.rpc(
        'check_and_award_achievements',
        { p_user_id: user.id }
      )

      if (rpcError) {
        throw rpcError
      }

      // Refresh data to show newly awarded achievements
      await Promise.all([loadUserAchievements(), calculateProgress()])

      // Return array of newly awarded achievement IDs
      return (data || []).map((a: any) => a.achievement_id)
    } catch (err) {
      if (__DEV__) console.error('Error checking achievements:', err)
      setError('Failed to check achievements')
      return []
    } finally {
      setChecking(false)
    }
  }, [user?.id, loadUserAchievements, calculateProgress])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  const loadLeaderboard = useCallback(async (locationId?: string) => {
    setLeaderboardLoading(true)
    try {
      const { data, error: fetchError } = await supabase.rpc(
        'get_streak_leaderboard',
        locationId ? { p_location_id: locationId, p_limit: 10 } : { p_limit: 10 }
      )

      if (fetchError) {
        throw fetchError
      }

      setLeaderboard(data || [])
    } catch (err) {
      if (__DEV__) console.error('Error loading leaderboard:', err)
      setError('Failed to load leaderboard')
    } finally {
      setLeaderboardLoading(false)
    }
  }, [])

  return {
    achievements,
    earnedAchievements,
    lockedAchievements,
    allDefinitions,
    loading,
    checking,
    error,
    progress,
    earnedCount,
    totalCount,
    percentComplete,
    leaderboard,
    leaderboardLoading,
    currentStreak,
    refresh,
    checkAndAward,
    clearError,
    loadLeaderboard,
  }
}

export default useAchievements
