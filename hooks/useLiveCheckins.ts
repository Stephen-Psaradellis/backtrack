/**
 * useLiveCheckins Hook
 *
 * Custom hook for subscribing to live check-ins at a location.
 * Shows users currently checked in, with real-time updates via Supabase.
 *
 * Access is restricted to:
 * - Users who are checked in at the location (and within 200m), OR
 * - Users who are Regulars at the location
 *
 * @example
 * ```tsx
 * function LiveView({ locationId }: { locationId: string }) {
 *   const {
 *     checkins,
 *     count,
 *     hasAccess,
 *     accessReason,
 *     isLoading,
 *   } = useLiveCheckins(locationId)
 *
 *   if (!hasAccess) {
 *     return <Text>{accessReason}</Text>
 *   }
 *
 *   return (
 *     <View>
 *       <Text>{count} people checked in</Text>
 *       {checkins.map(c => (
 *         <Avatar key={c.user_id} avatar={c.avatar} />
 *       ))}
 *     </View>
 *   )
 * }
 * ```
 */

import { useState, useCallback, useEffect, useRef } from 'react'

import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import type { LiveCheckinUser } from '../types/database'

// ============================================================================
// TYPES
// ============================================================================

/**
 * Reason for access/no access to live view
 */
export type LiveCheckinAccessReason =
  | 'checked_in'
  | 'regular'
  | 'not_checked_in'
  | 'not_authenticated'
  | 'loading'

/**
 * Options for useLiveCheckins hook
 */
export interface UseLiveCheckinsOptions {
  /** Whether to enable the hook (default: true) */
  enabled?: boolean
  /** Whether to subscribe to real-time updates (default: true) */
  realtime?: boolean
}

/**
 * Return value from useLiveCheckins hook
 */
export interface UseLiveCheckinsResult {
  /** List of users currently checked in (empty if no access) */
  checkins: LiveCheckinUser[]
  /** Count of users checked in (always available) */
  count: number
  /** Whether current user has access to view the live list */
  hasAccess: boolean
  /** Reason for access or lack thereof */
  accessReason: LiveCheckinAccessReason
  /** Whether data is loading */
  isLoading: boolean
  /** Any error that occurred */
  error: string | null
  /** Refresh data */
  refetch: () => Promise<void>
}

// ============================================================================
// HOOK IMPLEMENTATION
// ============================================================================

/**
 * Hook for subscribing to live check-ins at a location
 */
export function useLiveCheckins(
  locationId: string | null,
  options: UseLiveCheckinsOptions = {}
): UseLiveCheckinsResult {
  const { enabled = true, realtime = true } = options
  const { userId, isAuthenticated } = useAuth()

  // State
  const [checkins, setCheckins] = useState<LiveCheckinUser[]>([])
  const [count, setCount] = useState(0)
  const [hasAccess, setHasAccess] = useState(false)
  const [accessReason, setAccessReason] = useState<LiveCheckinAccessReason>('loading')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Refs
  const isMountedRef = useRef(true)
  const subscriptionRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  /**
   * Fetch live check-in data
   */
  const fetchData = useCallback(async () => {
    if (!locationId) {
      setCheckins([])
      setCount(0)
      setHasAccess(false)
      setAccessReason('loading')
      setIsLoading(false)
      return
    }

    if (!isAuthenticated) {
      setCheckins([])
      setCount(0)
      setHasAccess(false)
      setAccessReason('not_authenticated')
      setIsLoading(false)
      return
    }

    try {
      setError(null)

      // Get count (always available)
      const { data: countData, error: countError } = await supabase.rpc(
        'get_active_checkin_count_at_location',
        { p_location_id: locationId }
      )

      if (countError) {
        if (isMountedRef.current) {
          setError(countError.message)
        }
        return
      }

      if (isMountedRef.current) {
        setCount(countData ?? 0)
      }

      // Get list (restricted by access)
      const { data: listData, error: listError } = await supabase.rpc(
        'get_active_checkins_at_location',
        { p_location_id: locationId }
      )

      if (listError) {
        if (isMountedRef.current) {
          setError(listError.message)
        }
        return
      }

      if (isMountedRef.current) {
        // If we got data, user has access
        if (listData && listData.length >= 0) {
          setCheckins(listData)
          setHasAccess(true)

          // Determine access reason
          // Check if user is a regular
          const { data: regularData } = await supabase
            .from('location_regulars')
            .select('is_regular')
            .eq('location_id', locationId)
            .eq('user_id', userId)
            .single()

          if (regularData?.is_regular) {
            setAccessReason('regular')
          } else {
            setAccessReason('checked_in')
          }
        } else {
          setCheckins([])
          setHasAccess(false)
          setAccessReason('not_checked_in')
        }
      }
    } catch (err) {
      if (isMountedRef.current) {
        setError(err instanceof Error ? err.message : 'Failed to fetch live check-ins')
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false)
      }
    }
  }, [locationId, isAuthenticated, userId])

  /**
   * Set up real-time subscription
   */
  const setupSubscription = useCallback(() => {
    if (!locationId || !realtime || !isAuthenticated) {
      return
    }

    // Clean up existing subscription
    if (subscriptionRef.current) {
      subscriptionRef.current.unsubscribe()
      subscriptionRef.current = null
    }

    // Subscribe to check-in changes at this location
    const channel = supabase
      .channel(`live-checkins-${locationId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_checkins',
          filter: `location_id=eq.${locationId}`,
        },
        () => {
          // Refetch on any change
          fetchData()
        }
      )
      .subscribe()

    subscriptionRef.current = channel
  }, [locationId, realtime, isAuthenticated, fetchData])

  /**
   * Refresh data
   */
  const refetch = useCallback(async () => {
    setIsLoading(true)
    await fetchData()
  }, [fetchData])

  // Fetch data and set up subscription on mount/change
  useEffect(() => {
    isMountedRef.current = true

    if (enabled) {
      fetchData()
      setupSubscription()
    }

    return () => {
      isMountedRef.current = false

      // Clean up subscription
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe()
        subscriptionRef.current = null
      }
    }
  }, [enabled, fetchData, setupSubscription])

  return {
    checkins,
    count,
    hasAccess,
    accessReason,
    isLoading,
    error,
    refetch,
  }
}

export default useLiveCheckins
