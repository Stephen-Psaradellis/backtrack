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
import { useQuery, useQueryClient } from '@tanstack/react-query'

import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { queryKeys } from './useQueryConfig'
import type { LiveCheckinUser } from '../types/database'

// P-018: Debounce constant for realtime updates (500ms)
const REALTIME_DEBOUNCE_MS = 500

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
  const queryClient = useQueryClient()

  // Refs
  const subscriptionRef = useRef<ReturnType<typeof supabase.channel> | null>(null)
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)

  /**
   * Fetch live check-in data with TanStack Query
   */
  const {
    data,
    isLoading,
    error: queryError,
    refetch,
  } = useQuery({
    queryKey: queryKeys.checkins.live(locationId || '', userId),
    queryFn: async () => {
      if (!locationId) {
        return {
          checkins: [],
          count: 0,
          hasAccess: false,
          accessReason: 'loading' as LiveCheckinAccessReason,
        }
      }

      if (!isAuthenticated) {
        return {
          checkins: [],
          count: 0,
          hasAccess: false,
          accessReason: 'not_authenticated' as LiveCheckinAccessReason,
        }
      }

      // Run the count RPC and the list RPC in parallel to halve network latency
      const [countResult, listResult] = await Promise.all([
        supabase.rpc('get_active_checkin_count_at_location', { p_location_id: locationId }),
        supabase.rpc('get_active_checkins_at_location', { p_location_id: locationId }),
      ])

      if (countResult.error) {
        throw new Error(countResult.error.message)
      }

      if (listResult.error) {
        throw new Error(listResult.error.message)
      }

      const count = countResult.data ?? 0
      const listData = listResult.data

      // If we got data, user has access
      if (listData && listData.length >= 0) {
        // Check regular status in parallel — no need to wait for the list result
        // before kicking off this query since we already have listData at this point.
        const { data: regularData } = await supabase
          .from('location_regulars')
          .select('is_regular')
          .eq('location_id', locationId)
          .eq('user_id', userId)
          .single()

        const accessReason: LiveCheckinAccessReason = regularData?.is_regular
          ? 'regular'
          : 'checked_in'

        return {
          checkins: listData as LiveCheckinUser[],
          count,
          hasAccess: true,
          accessReason,
        }
      }

      return {
        checkins: [],
        count,
        hasAccess: false,
        accessReason: 'not_checked_in' as LiveCheckinAccessReason,
      }
    },
    enabled: enabled && !!locationId,
    staleTime: 30 * 1000, // 30 seconds - frequently changing data
    gcTime: 5 * 60 * 1000,
  })

  /**
   * Set up real-time subscription
   */
  useEffect(() => {
    if (!locationId || !realtime || !isAuthenticated || !enabled) {
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
          // P-018: Debounce realtime updates to prevent burst queries
          if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current)
          }
          debounceTimerRef.current = setTimeout(() => {
            // Invalidate and refetch the query
            queryClient.invalidateQueries({
              queryKey: queryKeys.checkins.live(locationId, userId),
            })
          }, REALTIME_DEBOUNCE_MS)
        }
      )
      .subscribe()

    subscriptionRef.current = channel

    return () => {
      // P-018: Clear debounce timer on unmount
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
        debounceTimerRef.current = null
      }

      // Clean up subscription
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe()
        subscriptionRef.current = null
      }
    }
  }, [locationId, realtime, isAuthenticated, enabled, userId, queryClient])

  return {
    checkins: data?.checkins || [],
    count: data?.count || 0,
    hasAccess: data?.hasAccess || false,
    accessReason: data?.accessReason || 'loading',
    isLoading,
    error: queryError?.message || null,
    refetch,
  }
}

export default useLiveCheckins
