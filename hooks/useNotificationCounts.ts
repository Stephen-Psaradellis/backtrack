/**
 * useNotificationCounts Hook
 *
 * Custom hook for fetching notification counts for the current user.
 * Tracks unread messages, new matches, and posts at favorite/regular locations.
 *
 * @example
 * ```tsx
 * function NotificationBadge() {
 *   const { counts, isLoading, markAsSeen } = useNotificationCounts()
 *
 *   if (isLoading) return null
 *
 *   return (
 *     <View>
 *       {counts.total > 0 && <Badge count={counts.total} />}
 *       <Button onPress={markAsSeen} title="Clear" />
 *     </View>
 *   )
 * }
 * ```
 */

import { useState, useCallback, useEffect, useRef } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'

import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

// ============================================================================
// TYPES
// ============================================================================

/**
 * Notification counts breakdown
 */
export interface NotificationCounts {
  /** Count of unread messages */
  unreadMessages: number
  /** Count of new matches */
  newMatches: number
  /** Count of new posts at regular locations */
  newPostsAtRegulars: number
  /** Count of new posts at favorite locations */
  newPostsAtFavorites: number
  /** Total notification count */
  total: number
}

/**
 * Return value from useNotificationCounts hook
 */
export interface UseNotificationCountsResult {
  /** Notification counts */
  counts: NotificationCounts
  /** Whether data is loading */
  isLoading: boolean
  /** Mark notifications as seen */
  markAsSeen: () => Promise<void>
}

// ============================================================================
// CONSTANTS
// ============================================================================

/** AsyncStorage key for last seen timestamp */
const LAST_SEEN_KEY = 'notification_last_seen_at'

/** Default notification counts */
const DEFAULT_COUNTS: NotificationCounts = {
  unreadMessages: 0,
  newMatches: 0,
  newPostsAtRegulars: 0,
  newPostsAtFavorites: 0,
  total: 0,
}

// ============================================================================
// HOOK IMPLEMENTATION
// ============================================================================

/**
 * Hook for fetching and managing notification counts
 *
 * @returns Notification counts, loading state, and markAsSeen function
 */
export function useNotificationCounts(): UseNotificationCountsResult {
  const { userId, isAuthenticated } = useAuth()

  // State
  const [counts, setCounts] = useState<NotificationCounts>(DEFAULT_COUNTS)
  const [isLoading, setIsLoading] = useState(true)

  // Refs
  const isMountedRef = useRef(true)

  /**
   * Fetch notification counts from the database
   */
  const fetchData = useCallback(async () => {
    if (!isAuthenticated || !userId) {
      if (isMountedRef.current) {
        setCounts(DEFAULT_COUNTS)
        setIsLoading(false)
      }
      return
    }

    try {
      const { data, error: rpcError } = await supabase.rpc('get_notification_counts', {
        p_user_id: userId,
      })

      if (rpcError) {
        // If RPC doesn't exist yet, use default counts
        if (isMountedRef.current) {
          setCounts(DEFAULT_COUNTS)
        }
        return
      }

      if (isMountedRef.current && data) {
        const mappedCounts: NotificationCounts = {
          unreadMessages: data.unread_messages ?? 0,
          newMatches: data.new_matches ?? 0,
          newPostsAtRegulars: data.new_posts_at_regulars ?? 0,
          newPostsAtFavorites: data.new_posts_at_favorites ?? 0,
          total:
            (data.unread_messages ?? 0) +
            (data.new_matches ?? 0) +
            (data.new_posts_at_regulars ?? 0) +
            (data.new_posts_at_favorites ?? 0),
        }
        setCounts(mappedCounts)
      }
    } catch (err) {
      if (isMountedRef.current) {
        // On error, use default counts
        setCounts(DEFAULT_COUNTS)
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false)
      }
    }
  }, [userId, isAuthenticated])

  /**
   * Mark notifications as seen by updating the last seen timestamp
   */
  const markAsSeen = useCallback(async () => {
    try {
      const now = new Date().toISOString()
      await AsyncStorage.setItem(LAST_SEEN_KEY, now)

      // Reset counts to zero
      if (isMountedRef.current) {
        setCounts(DEFAULT_COUNTS)
      }
    } catch (err) {
      // Silently fail - not critical
      console.warn('Failed to mark notifications as seen:', err)
    }
  }, [])

  // Fetch data on mount and when dependencies change
  useEffect(() => {
    isMountedRef.current = true

    fetchData()

    return () => {
      isMountedRef.current = false
    }
  }, [fetchData])

  return {
    counts,
    isLoading,
    markAsSeen,
  }
}

export default useNotificationCounts
