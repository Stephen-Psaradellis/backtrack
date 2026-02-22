/**
 * useRadar Hook
 *
 * Custom hook for managing Walk-by Radar - proximity notifications when users
 * pass near others who have recent location visits.
 *
 * Features:
 * - Enable/disable radar detection
 * - Configure detection radius
 * - View recent proximity encounters
 * - Realtime updates via subscriptions
 * - TanStack Query for caching
 *
 * @example
 * ```tsx
 * function RadarSettings() {
 *   const {
 *     radarEnabled,
 *     radarRadius,
 *     toggleRadar,
 *     setRadarRadius,
 *     recentEncounters,
 *     encounterCount
 *   } = useRadar()
 *
 *   return (
 *     <View>
 *       <Switch value={radarEnabled} onValueChange={toggleRadar} />
 *       <Slider value={radarRadius} onChange={setRadarRadius} />
 *       <Text>Encounters: {encounterCount}</Text>
 *     </View>
 *   )
 * }
 * ```
 */

import { useState, useCallback, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { captureException } from '../lib/sentry'

// ============================================================================
// TYPES
// ============================================================================

/**
 * Proximity encounter record
 */
export interface ProximityEncounter {
  id: string
  user_id: string
  encountered_user_id: string
  location_id: string | null
  location_name?: string
  latitude: number
  longitude: number
  distance_meters: number
  encounter_type: 'walkby' | 'same_venue' | 'repeated'
  notified: boolean
  created_at: string
}

/**
 * Radar settings from user profile
 */
export interface RadarSettings {
  radar_enabled: boolean
  radar_radius_meters: number
}

/**
 * Result of radar toggle/update operation
 */
export interface RadarUpdateResult {
  success: boolean
  error?: string
}

/**
 * Return value from useRadar hook
 */
export interface UseRadarResult {
  /** Whether radar is currently enabled */
  radarEnabled: boolean
  /** Current detection radius in meters */
  radarRadius: number
  /** Recent encounters (last 24 hours) */
  recentEncounters: ProximityEncounter[]
  /** Total count of recent encounters */
  encounterCount: number
  /** Whether data is loading */
  isLoading: boolean
  /** Error message if any */
  error: string | null
  /** Toggle radar on/off */
  toggleRadar: () => Promise<RadarUpdateResult>
  /** Update detection radius */
  setRadarRadius: (meters: number) => Promise<RadarUpdateResult>
  /** Manually refresh encounters */
  refreshEncounters: () => Promise<void>
}

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Valid radar radius options (in meters)
 */
export const RADAR_RADIUS_OPTIONS = [50, 100, 200, 500] as const

/**
 * Default radius if not set
 */
const DEFAULT_RADIUS = 200

/**
 * Time window for recent encounters (24 hours)
 */
const ENCOUNTER_TIME_WINDOW_HOURS = 24

// ============================================================================
// QUERY KEYS
// ============================================================================

const QUERY_KEYS = {
  radarSettings: (userId: string) => ['radar', 'settings', userId],
  recentEncounters: (userId: string) => ['radar', 'encounters', userId],
} as const

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Fetch radar settings from profile
 */
async function fetchRadarSettings(userId: string): Promise<RadarSettings> {
  const { data, error } = await supabase
    .from('profiles')
    .select('radar_enabled, radar_radius_meters')
    .eq('id', userId)
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return {
    radar_enabled: data?.radar_enabled ?? true,
    radar_radius_meters: data?.radar_radius_meters ?? DEFAULT_RADIUS,
  }
}

/**
 * Fetch recent proximity encounters
 */
async function fetchRecentEncounters(
  userId: string
): Promise<ProximityEncounter[]> {
  const cutoffTime = new Date()
  cutoffTime.setHours(cutoffTime.getHours() - ENCOUNTER_TIME_WINDOW_HOURS)

  const { data, error } = await supabase
    .from('proximity_encounters')
    .select(
      `
      id,
      user_id,
      encountered_user_id,
      location_id,
      latitude,
      longitude,
      distance_meters,
      encounter_type,
      notified,
      created_at
    `
    )
    .eq('user_id', userId)
    .gte('created_at', cutoffTime.toISOString())
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) {
    throw new Error(error.message)
  }

  return data || []
}

/**
 * Update radar enabled status
 */
async function updateRadarEnabled(
  userId: string,
  enabled: boolean
): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({ radar_enabled: enabled, updated_at: new Date().toISOString() })
    .eq('id', userId)

  if (error) {
    throw new Error(error.message)
  }
}

/**
 * Update radar radius
 */
async function updateRadarRadius(
  userId: string,
  radius: number
): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({
      radar_radius_meters: radius,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId)

  if (error) {
    throw new Error(error.message)
  }
}

// ============================================================================
// HOOK IMPLEMENTATION
// ============================================================================

/**
 * Hook for managing Walk-by Radar settings and encounters
 */
export function useRadar(): UseRadarResult {
  const { profile } = useAuth()
  const queryClient = useQueryClient()
  const [error, setError] = useState<string | null>(null)

  // ---------------------------------------------------------------------------
  // Queries
  // ---------------------------------------------------------------------------

  // Fetch radar settings
  const {
    data: radarSettings,
    isLoading: isLoadingSettings,
  } = useQuery({
    queryKey: QUERY_KEYS.radarSettings(profile?.id || ''),
    queryFn: () => fetchRadarSettings(profile!.id),
    enabled: !!profile?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  // Fetch recent encounters
  const {
    data: recentEncounters = [],
    isLoading: isLoadingEncounters,
    refetch: refetchEncounters,
  } = useQuery({
    queryKey: QUERY_KEYS.recentEncounters(profile?.id || ''),
    queryFn: () => fetchRecentEncounters(profile!.id),
    enabled: !!profile?.id && (radarSettings?.radar_enabled ?? false),
    staleTime: 2 * 60 * 1000, // 2 minutes
  })

  // ---------------------------------------------------------------------------
  // Mutations
  // ---------------------------------------------------------------------------

  // Toggle radar mutation
  const toggleRadarMutation = useMutation({
    mutationFn: async () => {
      if (!profile?.id) throw new Error('Not authenticated')
      const newState = !(radarSettings?.radar_enabled ?? true)
      await updateRadarEnabled(profile.id, newState)
      return newState
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.radarSettings(profile!.id),
      })
    },
  })

  // Update radius mutation
  const updateRadiusMutation = useMutation({
    mutationFn: async (radius: number) => {
      if (!profile?.id) throw new Error('Not authenticated')
      await updateRadarRadius(profile.id, radius)
      return radius
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.radarSettings(profile!.id),
      })
    },
  })

  // ---------------------------------------------------------------------------
  // Realtime Subscription
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (!profile?.id) return

    // Subscribe to new proximity encounters
    const channel = supabase
      .channel(`proximity_encounters:${profile.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'proximity_encounters',
          filter: `user_id=eq.${profile.id}`,
        },
        () => {
          // Invalidate encounters query to refetch
          queryClient.invalidateQueries({
            queryKey: QUERY_KEYS.recentEncounters(profile.id),
          })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [profile?.id, queryClient])

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  const toggleRadar = useCallback(async (): Promise<RadarUpdateResult> => {
    setError(null)
    try {
      await toggleRadarMutation.mutateAsync()
      return { success: true }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to toggle radar'
      setError(message)
      captureException(err, { operation: 'toggleRadar' })
      return { success: false, error: message }
    }
  }, [toggleRadarMutation])

  const setRadarRadius = useCallback(
    async (meters: number): Promise<RadarUpdateResult> => {
      // Validate radius
      if (!RADAR_RADIUS_OPTIONS.includes(meters as any)) {
        const message = `Invalid radius. Must be one of: ${RADAR_RADIUS_OPTIONS.join(', ')}`
        setError(message)
        return { success: false, error: message }
      }

      setError(null)
      try {
        await updateRadiusMutation.mutateAsync(meters)
        return { success: true }
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to update radius'
        setError(message)
        captureException(err, { operation: 'setRadarRadius' })
        return { success: false, error: message }
      }
    },
    [updateRadiusMutation]
  )

  const refreshEncounters = useCallback(async () => {
    await refetchEncounters()
  }, [refetchEncounters])

  // ---------------------------------------------------------------------------
  // Return Value
  // ---------------------------------------------------------------------------

  return {
    radarEnabled: radarSettings?.radar_enabled ?? true,
    radarRadius: radarSettings?.radar_radius_meters ?? DEFAULT_RADIUS,
    recentEncounters,
    encounterCount: recentEncounters.length,
    isLoading: isLoadingSettings || isLoadingEncounters,
    error,
    toggleRadar,
    setRadarRadius,
    refreshEncounters,
  }
}
