/**
 * useHangouts Hook
 *
 * Manages group hangout data and operations.
 * Fetches nearby hangouts, user's created/attending hangouts, and handles CRUD operations.
 *
 * Features:
 * - Auto-refreshes nearby hangouts every 2 minutes
 * - Real-time updates via Supabase subscriptions
 * - TanStack Query for caching and state management
 *
 * @example
 * ```tsx
 * function HangoutsScreen() {
 *   const { nearbyHangouts, myHangouts, createHangout, joinHangout } = useHangouts()
 *
 *   const handleCreate = async () => {
 *     await createHangout({
 *       location_id: '...',
 *       title: 'Coffee meetup',
 *       scheduled_for: '...',
 *       vibe: 'chill'
 *     })
 *   }
 * }
 * ```
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useLocation } from './useLocation'
import type {
  HangoutWithDetails,
  HangoutInsert,
  HangoutUpdate,
  AttendeeStatus,
} from '../types/database'

// ============================================================================
// TYPES
// ============================================================================

export interface UseHangoutsResult {
  /** Nearby hangouts within radius */
  nearbyHangouts: HangoutWithDetails[]
  /** Hangouts created by or attended by current user */
  myHangouts: HangoutWithDetails[]
  /** Whether nearby hangouts are loading */
  isLoadingNearby: boolean
  /** Whether my hangouts are loading */
  isLoadingMy: boolean
  /** Error loading nearby hangouts */
  nearbyError: string | null
  /** Error loading my hangouts */
  myError: string | null
  /** Create a new hangout */
  createHangout: (data: Omit<HangoutInsert, 'creator_id'>) => Promise<void>
  /** Join a hangout */
  joinHangout: (hangoutId: string, status?: AttendeeStatus) => Promise<void>
  /** Leave a hangout */
  leaveHangout: (hangoutId: string) => Promise<void>
  /** Cancel a hangout (creator only) */
  cancelHangout: (hangoutId: string) => Promise<void>
  /** Update a hangout (creator only) */
  updateHangout: (hangoutId: string, data: HangoutUpdate) => Promise<void>
  /** Refresh nearby hangouts */
  refetchNearby: () => Promise<void>
  /** Refresh my hangouts */
  refetchMy: () => Promise<void>
}

// ============================================================================
// CONSTANTS
// ============================================================================

/** Default search radius in meters (5km) */
const DEFAULT_RADIUS_METERS = 5000

/** Auto-refresh interval in milliseconds (2 minutes) */
const REFRESH_INTERVAL_MS = 2 * 60 * 1000

/** Query key for nearby hangouts */
const NEARBY_HANGOUTS_KEY = 'nearby-hangouts'

/** Query key for my hangouts */
const MY_HANGOUTS_KEY = 'my-hangouts'

// ============================================================================
// HOOK IMPLEMENTATION
// ============================================================================

export function useHangouts(radiusMeters: number = DEFAULT_RADIUS_METERS): UseHangoutsResult {
  const { user } = useAuth()
  const { latitude, longitude } = useLocation()
  const queryClient = useQueryClient()

  // ---------------------------------------------------------------------------
  // Fetch Nearby Hangouts
  // ---------------------------------------------------------------------------

  const fetchNearbyHangouts = useCallback(async (): Promise<HangoutWithDetails[]> => {
    if (!latitude || !longitude) {
      return []
    }

    const { data, error } = await supabase.rpc('get_nearby_hangouts', {
      p_lat: latitude,
      p_lng: longitude,
      p_radius_meters: radiusMeters,
    })

    if (error) {
      throw new Error(error.message)
    }

    return (data || []) as HangoutWithDetails[]
  }, [latitude, longitude, radiusMeters])

  const {
    data: nearbyHangouts = [],
    isLoading: isLoadingNearby,
    error: nearbyQueryError,
    refetch: refetchNearbyQuery,
  } = useQuery({
    queryKey: [NEARBY_HANGOUTS_KEY, latitude, longitude, radiusMeters],
    queryFn: fetchNearbyHangouts,
    enabled: !!latitude && !!longitude,
    staleTime: REFRESH_INTERVAL_MS,
    refetchInterval: REFRESH_INTERVAL_MS,
  })

  const nearbyError = nearbyQueryError ? String(nearbyQueryError) : null

  // ---------------------------------------------------------------------------
  // Fetch My Hangouts (created or attending)
  // ---------------------------------------------------------------------------

  const fetchMyHangouts = useCallback(async (): Promise<HangoutWithDetails[]> => {
    if (!user?.id || !latitude || !longitude) {
      return []
    }

    // Get hangouts I created
    const { data: createdData, error: createdError } = await supabase
      .from('hangouts')
      .select(`
        *,
        locations!inner(name)
      `)
      .eq('creator_id', user.id)
      .eq('is_active', true)
      .gte('scheduled_for', new Date().toISOString())
      .order('scheduled_for', { ascending: true })

    if (createdError) {
      throw new Error(createdError.message)
    }

    // Get hangouts I'm attending
    const { data: attendingData, error: attendingError } = await supabase
      .from('hangout_attendees')
      .select(`
        hangout_id,
        hangouts!inner(
          *,
          locations!inner(name)
        )
      `)
      .eq('user_id', user.id)
      .in('status', ['going', 'maybe'])

    if (attendingError) {
      throw new Error(attendingError.message)
    }

    // Combine and deduplicate
    const created = (createdData || []) as any[]
    const attending = (attendingData || []).map((a: any) => a.hangouts) as any[]
    const combined = [...created, ...attending]
    const uniqueMap = new Map<string, any>()

    combined.forEach((h) => {
      if (!uniqueMap.has(h.id)) {
        uniqueMap.set(h.id, {
          ...h,
          location_name: h.locations?.name || 'Unknown',
          attendee_count: 0,
          creator_avatar: null,
          attendee_avatars: [],
        })
      }
    })

    // Get attendee counts for each hangout
    const hangoutIds = Array.from(uniqueMap.keys())
    if (hangoutIds.length > 0) {
      const { data: attendeeCounts } = await supabase
        .from('hangout_attendees')
        .select('hangout_id')
        .in('hangout_id', hangoutIds)
        .in('status', ['going', 'maybe'])

      if (attendeeCounts) {
        const countMap = new Map<string, number>()
        attendeeCounts.forEach((a: any) => {
          countMap.set(a.hangout_id, (countMap.get(a.hangout_id) || 0) + 1)
        })

        uniqueMap.forEach((hangout, id) => {
          hangout.attendee_count = countMap.get(id) || 0
        })
      }
    }

    return Array.from(uniqueMap.values()).sort((a, b) => {
      return new Date(a.scheduled_for).getTime() - new Date(b.scheduled_for).getTime()
    })
  }, [user?.id, latitude, longitude])

  const {
    data: myHangouts = [],
    isLoading: isLoadingMy,
    error: myQueryError,
    refetch: refetchMyQuery,
  } = useQuery({
    queryKey: [MY_HANGOUTS_KEY, user?.id],
    queryFn: fetchMyHangouts,
    enabled: !!user?.id,
    staleTime: REFRESH_INTERVAL_MS,
  })

  const myError = myQueryError ? String(myQueryError) : null

  // ---------------------------------------------------------------------------
  // Create Hangout Mutation
  // ---------------------------------------------------------------------------

  const createMutation = useMutation({
    mutationFn: async (data: Omit<HangoutInsert, 'creator_id'>) => {
      if (!user?.id) {
        throw new Error('Not authenticated')
      }

      const { error } = await supabase.from('hangouts').insert({
        ...data,
        creator_id: user.id,
      })

      if (error) {
        throw new Error(error.message)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [NEARBY_HANGOUTS_KEY] })
      queryClient.invalidateQueries({ queryKey: [MY_HANGOUTS_KEY] })
    },
  })

  // ---------------------------------------------------------------------------
  // Join Hangout Mutation
  // ---------------------------------------------------------------------------

  const joinMutation = useMutation({
    mutationFn: async ({ hangoutId, status }: { hangoutId: string; status: AttendeeStatus }) => {
      const { data, error } = await supabase.rpc('join_hangout', {
        p_hangout_id: hangoutId,
        p_status: status,
      })

      if (error) {
        throw new Error(error.message)
      }

      const result = data as any
      if (!result.success) {
        throw new Error(result.error || 'Failed to join hangout')
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [NEARBY_HANGOUTS_KEY] })
      queryClient.invalidateQueries({ queryKey: [MY_HANGOUTS_KEY] })
    },
  })

  // ---------------------------------------------------------------------------
  // Leave Hangout Mutation
  // ---------------------------------------------------------------------------

  const leaveMutation = useMutation({
    mutationFn: async (hangoutId: string) => {
      const { data, error } = await supabase.rpc('leave_hangout', {
        p_hangout_id: hangoutId,
      })

      if (error) {
        throw new Error(error.message)
      }

      const result = data as any
      if (!result.success) {
        throw new Error(result.error || 'Failed to leave hangout')
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [NEARBY_HANGOUTS_KEY] })
      queryClient.invalidateQueries({ queryKey: [MY_HANGOUTS_KEY] })
    },
  })

  // ---------------------------------------------------------------------------
  // Cancel Hangout Mutation (soft delete)
  // ---------------------------------------------------------------------------

  const cancelMutation = useMutation({
    mutationFn: async (hangoutId: string) => {
      if (!user?.id) {
        throw new Error('Not authenticated')
      }

      const { error } = await supabase
        .from('hangouts')
        .update({ status: 'cancelled', is_active: false })
        .eq('id', hangoutId)
        .eq('creator_id', user.id)

      if (error) {
        throw new Error(error.message)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [NEARBY_HANGOUTS_KEY] })
      queryClient.invalidateQueries({ queryKey: [MY_HANGOUTS_KEY] })
    },
  })

  // ---------------------------------------------------------------------------
  // Update Hangout Mutation
  // ---------------------------------------------------------------------------

  const updateMutation = useMutation({
    mutationFn: async ({ hangoutId, data }: { hangoutId: string; data: HangoutUpdate }) => {
      if (!user?.id) {
        throw new Error('Not authenticated')
      }

      const { error } = await supabase
        .from('hangouts')
        .update(data)
        .eq('id', hangoutId)
        .eq('creator_id', user.id)

      if (error) {
        throw new Error(error.message)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [NEARBY_HANGOUTS_KEY] })
      queryClient.invalidateQueries({ queryKey: [MY_HANGOUTS_KEY] })
    },
  })

  // ---------------------------------------------------------------------------
  // Real-time Subscriptions
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (!user?.id) return

    // Subscribe to hangouts table changes
    const hangoutsChannel = supabase
      .channel('hangouts-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'hangouts',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: [NEARBY_HANGOUTS_KEY] })
          queryClient.invalidateQueries({ queryKey: [MY_HANGOUTS_KEY] })
        }
      )
      .subscribe()

    // Subscribe to attendees table changes
    const attendeesChannel = supabase
      .channel('hangout-attendees-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'hangout_attendees',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: [NEARBY_HANGOUTS_KEY] })
          queryClient.invalidateQueries({ queryKey: [MY_HANGOUTS_KEY] })
        }
      )
      .subscribe()

    return () => {
      hangoutsChannel.unsubscribe()
      attendeesChannel.unsubscribe()
    }
  }, [user?.id, queryClient])

  // ---------------------------------------------------------------------------
  // Return API
  // ---------------------------------------------------------------------------

  return {
    nearbyHangouts,
    myHangouts,
    isLoadingNearby,
    isLoadingMy,
    nearbyError,
    myError,
    createHangout: useCallback(
      async (data: Omit<HangoutInsert, 'creator_id'>) => {
        await createMutation.mutateAsync(data)
      },
      [createMutation]
    ),
    joinHangout: useCallback(
      async (hangoutId: string, status: AttendeeStatus = 'going') => {
        await joinMutation.mutateAsync({ hangoutId, status })
      },
      [joinMutation]
    ),
    leaveHangout: useCallback(
      async (hangoutId: string) => {
        await leaveMutation.mutateAsync(hangoutId)
      },
      [leaveMutation]
    ),
    cancelHangout: useCallback(
      async (hangoutId: string) => {
        await cancelMutation.mutateAsync(hangoutId)
      },
      [cancelMutation]
    ),
    updateHangout: useCallback(
      async (hangoutId: string, data: HangoutUpdate) => {
        await updateMutation.mutateAsync({ hangoutId, data })
      },
      [updateMutation]
    ),
    refetchNearby: useCallback(async () => {
      await refetchNearbyQuery()
    }, [refetchNearbyQuery]),
    refetchMy: useCallback(async () => {
      await refetchMyQuery()
    }, [refetchMyQuery]),
  }
}
