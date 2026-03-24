/**
 * useRegulars Hook
 *
 * Custom hooks for managing Regulars Mode - connecting people who
 * frequent the same locations.
 *
 * Features:
 * - Toggle regulars mode on/off
 * - Set visibility preferences
 * - Fetch fellow regulars at locations
 * - View regulars at specific locations
 *
 * @module hooks/useRegulars
 *
 * @example
 * ```tsx
 * function RegularsSettings() {
 *   const { isEnabled, visibility, toggleMode, setVisibility } = useRegularsMode()
 *
 *   return (
 *     <View>
 *       <Switch value={isEnabled} onValueChange={toggleMode} />
 *       <Picker value={visibility} onValueChange={setVisibility}>
 *         <Picker.Item label="Public" value="public" />
 *         <Picker.Item label="Mutual Only" value="mutual" />
 *         <Picker.Item label="Hidden" value="hidden" />
 *       </Picker>
 *     </View>
 *   )
 * }
 * ```
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { queryKeys } from './useQueryConfig'
import type { StoredAvatar } from '../types/avatar'

// ============================================================================
// Types
// ============================================================================

/**
 * Visibility options for regulars mode
 */
export type RegularsVisibility = 'public' | 'mutual' | 'hidden'

/**
 * Fellow regular information
 */
export interface FellowRegular {
  fellow_user_id: string
  display_name: string | null
  avatar: StoredAvatar | null
  is_verified: boolean
  location_id: string
  location_name: string
  shared_weeks: number
  visibility: RegularsVisibility
}

/**
 * Location regular information
 */
export interface LocationRegular {
  user_id: string
  display_name: string | null
  avatar: StoredAvatar | null
  is_verified: boolean
  weekly_visit_count: number
  visibility: RegularsVisibility
}

/**
 * Error type for regulars operations
 */
export interface RegularsError {
  code: 'AUTH_ERROR' | 'FETCH_ERROR' | 'UPDATE_ERROR'
  message: string
}

// ============================================================================
// Constants
// ============================================================================

const ERROR_MESSAGES = {
  NOT_AUTHENTICATED: 'User must be authenticated.',
  FETCH_FAILED: 'Failed to fetch regulars data.',
  UPDATE_FAILED: 'Failed to update settings.',
  UNKNOWN: 'An unknown error occurred.',
} as const

// ============================================================================
// useRegularsMode Hook
// ============================================================================

/**
 * Options for useRegularsMode hook
 */
export interface UseRegularsModeOptions {
  enabled?: boolean
}

/**
 * Return value from useRegularsMode hook
 */
export interface UseRegularsModeResult {
  /** Whether regulars mode is enabled for the user */
  isEnabled: boolean
  /** Current visibility setting */
  visibility: RegularsVisibility
  /** Toggle regulars mode on/off */
  toggleMode: () => Promise<boolean>
  /** Set regulars mode to a specific value */
  setMode: (enabled: boolean) => Promise<boolean>
  /** Set visibility preference */
  setVisibility: (visibility: RegularsVisibility) => Promise<boolean>
  /** Whether settings are loading */
  isLoading: boolean
  /** Whether an update is in progress */
  isUpdating: boolean
  /** Any error that occurred */
  error: RegularsError | null
  /** Refresh settings */
  refresh: () => Promise<void>
}

/**
 * Hook for managing regulars mode settings
 */
export function useRegularsMode(
  options: UseRegularsModeOptions = {}
): UseRegularsModeResult {
  const { enabled = true } = options
  const { userId, isAuthenticated } = useAuth()
  const queryClient = useQueryClient()

  // Fetch settings with TanStack Query
  const {
    data: settings,
    isLoading,
    error: queryError,
    refetch,
  } = useQuery({
    queryKey: queryKeys.regulars.mode(userId || ''),
    queryFn: async () => {
      if (!isAuthenticated || !userId) {
        return { regulars_mode_enabled: true, regulars_visibility: 'mutual' as RegularsVisibility }
      }

      const { data, error: fetchError } = await supabase
        .from('profiles')
        .select('regulars_mode_enabled, regulars_visibility')
        .eq('id', userId)
        .single()

      if (fetchError) {
        throw new Error(fetchError.message)
      }

      return {
        regulars_mode_enabled: data?.regulars_mode_enabled ?? true,
        regulars_visibility: (data?.regulars_visibility ?? 'mutual') as RegularsVisibility,
      }
    },
    enabled: enabled && !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes - settings don't change frequently
    gcTime: 10 * 60 * 1000,
  })

  const isEnabled = settings?.regulars_mode_enabled ?? true
  const visibility = settings?.regulars_visibility ?? 'mutual'
  const error: RegularsError | null = queryError
    ? { code: 'FETCH_ERROR', message: queryError.message }
    : null

  // Toggle mode mutation
  const toggleModeMutation = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error('Not authenticated')

      const { data, error: rpcError } = await supabase.rpc('toggle_regulars_mode', {
        p_user_id: userId,
        p_enabled: null, // Toggle
      })

      if (rpcError) throw new Error(rpcError.message)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.regulars.mode(userId || '') })
    },
  })

  const toggleMode = useCallback(async (): Promise<boolean> => {
    if (!isAuthenticated || !userId) return false
    try {
      await toggleModeMutation.mutateAsync()
      return true
    } catch {
      return false
    }
  }, [isAuthenticated, userId, toggleModeMutation])

  // Set mode mutation
  const setModeMutation = useMutation({
    mutationFn: async (newEnabled: boolean) => {
      if (!userId) throw new Error('Not authenticated')

      const { data, error: rpcError } = await supabase.rpc('toggle_regulars_mode', {
        p_user_id: userId,
        p_enabled: newEnabled,
      })

      if (rpcError) throw new Error(rpcError.message)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.regulars.mode(userId || '') })
    },
  })

  const setMode = useCallback(
    async (newEnabled: boolean): Promise<boolean> => {
      if (!isAuthenticated || !userId) return false
      if (newEnabled === isEnabled) return true

      try {
        await setModeMutation.mutateAsync(newEnabled)
        return true
      } catch {
        return false
      }
    },
    [isAuthenticated, userId, isEnabled, setModeMutation]
  )

  // Set visibility mutation
  const setVisibilityMutation = useMutation({
    mutationFn: async (newVisibility: RegularsVisibility) => {
      if (!userId) throw new Error('Not authenticated')

      const { error: rpcError } = await supabase.rpc('set_regulars_visibility', {
        p_user_id: userId,
        p_visibility: newVisibility,
      })

      if (rpcError) throw new Error(rpcError.message)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.regulars.mode(userId || '') })
    },
  })

  const setVisibility = useCallback(
    async (newVisibility: RegularsVisibility): Promise<boolean> => {
      if (!isAuthenticated || !userId) return false
      if (newVisibility === visibility) return true

      try {
        await setVisibilityMutation.mutateAsync(newVisibility)
        return true
      } catch {
        return false
      }
    },
    [isAuthenticated, userId, visibility, setVisibilityMutation]
  )

  const refresh = useCallback(async () => {
    await refetch()
  }, [refetch])

  const isUpdating =
    toggleModeMutation.isPending || setModeMutation.isPending || setVisibilityMutation.isPending

  return {
    isEnabled,
    visibility,
    toggleMode,
    setMode,
    setVisibility,
    isLoading,
    isUpdating,
    error,
    refresh,
  }
}

// ============================================================================
// useFellowRegulars Hook
// ============================================================================

/**
 * Options for useFellowRegulars hook
 */
export interface UseFellowRegularsOptions {
  enabled?: boolean
  locationId?: string
}

/**
 * Return value from useFellowRegulars hook
 */
export interface UseFellowRegularsResult {
  /** List of fellow regulars */
  regulars: FellowRegular[]
  /** Whether data is loading */
  isLoading: boolean
  /** Any error that occurred */
  error: RegularsError | null
  /** Refresh data */
  refetch: () => Promise<void>
}

/**
 * Hook for fetching fellow regulars
 */
export function useFellowRegulars(
  options: UseFellowRegularsOptions = {}
): UseFellowRegularsResult {
  const { enabled = true, locationId } = options
  const { userId, isAuthenticated } = useAuth()

  const {
    data: regulars = [],
    isLoading,
    error: queryError,
    refetch,
  } = useQuery({
    queryKey: queryKeys.regulars.fellows(userId || '', locationId),
    queryFn: async () => {
      if (!isAuthenticated || !userId) {
        return []
      }

      const { data, error: rpcError } = await supabase.rpc('get_fellow_regulars', {
        p_user_id: userId,
        p_location_id: locationId || null,
      })

      if (rpcError) {
        throw new Error(rpcError.message)
      }

      return (data || []) as FellowRegular[]
    },
    enabled: enabled && !!userId && isAuthenticated,
    staleTime: 60 * 1000, // 1 minute - fairly dynamic data
    gcTime: 10 * 60 * 1000,
  })

  const error: RegularsError | null = queryError
    ? { code: 'FETCH_ERROR', message: queryError.message }
    : null

  return {
    regulars,
    isLoading,
    error,
    refetch,
  }
}

// ============================================================================
// useLocationRegulars Hook
// ============================================================================

/**
 * Options for useLocationRegulars hook
 */
export interface UseLocationRegularsOptions {
  enabled?: boolean
  limit?: number
}

/**
 * Return value from useLocationRegulars hook
 */
export interface UseLocationRegularsResult {
  /** List of regulars at the location */
  regulars: LocationRegular[]
  /** Total count of regulars (even if user can't see details) */
  totalCount: number
  /** Whether current user is a regular at this location */
  isUserRegular: boolean
  /** Whether data is loading */
  isLoading: boolean
  /** Any error that occurred */
  error: RegularsError | null
  /** Refresh data */
  refetch: () => Promise<void>
}

/**
 * Hook for fetching regulars at a specific location
 */
export function useLocationRegulars(
  locationId: string,
  options: UseLocationRegularsOptions = {}
): UseLocationRegularsResult {
  const { enabled = true, limit = 20 } = options
  const { userId, isAuthenticated } = useAuth()

  const {
    data,
    isLoading,
    error: queryError,
    refetch,
  } = useQuery({
    queryKey: queryKeys.regulars.location(locationId, userId),
    queryFn: async () => {
      if (!locationId) {
        return { regulars: [], totalCount: 0, isUserRegular: false }
      }

      // P-017: Combine 3 round-trips into single RPC
      // Try optimized RPC first (combines count, is_regular check, and regulars list)
      const { data: combinedData, error: combinedError } = await supabase.rpc(
        'get_location_regulars_with_status',
        {
          p_location_id: locationId,
          p_user_id: userId || null,
          p_limit: limit,
        }
      )

      if (combinedError) {
        // If RPC doesn't exist yet, fall back to legacy approach
        if (combinedError.code === 'PGRST202') {
          // Legacy: Get count (always available)
          const { data: countData, error: countError } = await supabase.rpc(
            'get_location_regulars_count',
            { p_location_id: locationId }
          )

          if (countError) {
            throw new Error(countError.message)
          }

          const totalCount = countData || 0
          let isUserRegular = false
          let regulars: LocationRegular[] = []

          // Check if user is a regular
          if (isAuthenticated && userId) {
            const { data: userRegularData } = await supabase
              .from('location_regulars')
              .select('is_regular')
              .eq('location_id', locationId)
              .eq('user_id', userId)
              .single()

            isUserRegular = userRegularData?.is_regular ?? false

            // If user is a regular, get the list
            if (userRegularData?.is_regular) {
              const { data: regularsData, error: regularsError } = await supabase.rpc(
                'get_location_regulars',
                {
                  p_location_id: locationId,
                  p_limit: limit,
                }
              )

              if (regularsError) {
                throw new Error(regularsError.message)
              }

              regulars = regularsData || []
            }
          }

          return { regulars, totalCount, isUserRegular }
        } else {
          throw new Error(combinedError.message)
        }
      }

      // Optimized path: single RPC returns all data
      if (combinedData && combinedData.length > 0) {
        const result = combinedData[0]
        return {
          regulars: (result.regulars || []) as LocationRegular[],
          totalCount: result.total_count ?? 0,
          isUserRegular: result.is_user_regular ?? false,
        }
      }

      return { regulars: [], totalCount: 0, isUserRegular: false }
    },
    enabled: enabled && !!locationId,
    staleTime: 60 * 1000, // 1 minute
    gcTime: 10 * 60 * 1000,
  })

  const error: RegularsError | null = queryError
    ? { code: 'FETCH_ERROR', message: queryError.message }
    : null

  return {
    regulars: data?.regulars || [],
    totalCount: data?.totalCount || 0,
    isUserRegular: data?.isUserRegular || false,
    isLoading,
    error,
    refetch,
  }
}

// ============================================================================
// Exports
// ============================================================================

export default useRegularsMode
