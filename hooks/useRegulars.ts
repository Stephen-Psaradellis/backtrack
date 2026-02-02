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
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import type { StoredAvatar } from 'react-native-bitmoji'

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
  // supabase imported from lib/supabase

  const [isEnabled, setIsEnabled] = useState(true)
  const [visibility, setVisibilityState] = useState<RegularsVisibility>('mutual')
  const [isLoading, setIsLoading] = useState(true)
  const [isUpdating, setIsUpdating] = useState(false)
  const [error, setError] = useState<RegularsError | null>(null)

  // Load settings
  const loadSettings = useCallback(async () => {
    if (!isAuthenticated || !userId) {
      setIsEnabled(true)
      setVisibilityState('mutual')
      setIsLoading(false)
      return
    }

    try {
      setError(null)
      const { data, error: queryError } = await supabase
        .from('profiles')
        .select('regulars_mode_enabled, regulars_visibility')
        .eq('id', userId)
        .single()

      if (queryError) {
        setError({ code: 'FETCH_ERROR', message: queryError.message })
        return
      }

      setIsEnabled(data?.regulars_mode_enabled ?? true)
      setVisibilityState(data?.regulars_visibility ?? 'mutual')
    } catch (err) {
      setError({
        code: 'FETCH_ERROR',
        message: err instanceof Error ? err.message : ERROR_MESSAGES.UNKNOWN,
      })
    } finally {
      setIsLoading(false)
    }
  }, [supabase, userId, isAuthenticated])

  // Toggle mode
  const toggleMode = useCallback(async (): Promise<boolean> => {
    if (!isAuthenticated || !userId) return false

    setIsUpdating(true)
    try {
      const { data, error: rpcError } = await supabase.rpc('toggle_regulars_mode', {
        p_user_id: userId,
        p_enabled: null, // Toggle
      })

      if (rpcError) {
        setError({ code: 'UPDATE_ERROR', message: rpcError.message })
        return false
      }

      setIsEnabled(data)
      return true
    } catch (err) {
      setError({
        code: 'UPDATE_ERROR',
        message: err instanceof Error ? err.message : ERROR_MESSAGES.UNKNOWN,
      })
      return false
    } finally {
      setIsUpdating(false)
    }
  }, [supabase, userId, isAuthenticated])

  // Set mode
  const setMode = useCallback(
    async (newEnabled: boolean): Promise<boolean> => {
      if (!isAuthenticated || !userId) return false
      if (newEnabled === isEnabled) return true

      setIsUpdating(true)
      try {
        const { data, error: rpcError } = await supabase.rpc('toggle_regulars_mode', {
          p_user_id: userId,
          p_enabled: newEnabled,
        })

        if (rpcError) {
          setError({ code: 'UPDATE_ERROR', message: rpcError.message })
          return false
        }

        setIsEnabled(data)
        return true
      } catch (err) {
        setError({
          code: 'UPDATE_ERROR',
          message: err instanceof Error ? err.message : ERROR_MESSAGES.UNKNOWN,
        })
        return false
      } finally {
        setIsUpdating(false)
      }
    },
    [supabase, userId, isAuthenticated, isEnabled]
  )

  // Set visibility
  const setVisibility = useCallback(
    async (newVisibility: RegularsVisibility): Promise<boolean> => {
      if (!isAuthenticated || !userId) return false
      if (newVisibility === visibility) return true

      setIsUpdating(true)
      try {
        const { error: rpcError } = await supabase.rpc('set_regulars_visibility', {
          p_user_id: userId,
          p_visibility: newVisibility,
        })

        if (rpcError) {
          setError({ code: 'UPDATE_ERROR', message: rpcError.message })
          return false
        }

        setVisibilityState(newVisibility)
        return true
      } catch (err) {
        setError({
          code: 'UPDATE_ERROR',
          message: err instanceof Error ? err.message : ERROR_MESSAGES.UNKNOWN,
        })
        return false
      } finally {
        setIsUpdating(false)
      }
    },
    [supabase, userId, isAuthenticated, visibility]
  )

  const refresh = useCallback(async () => {
    setIsLoading(true)
    await loadSettings()
  }, [loadSettings])

  useEffect(() => {
    if (enabled) {
      loadSettings()
    }
  }, [enabled, loadSettings])

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
  // supabase imported from lib/supabase

  const [regulars, setRegulars] = useState<FellowRegular[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<RegularsError | null>(null)

  const fetchRegulars = useCallback(async () => {
    if (!isAuthenticated || !userId) {
      setRegulars([])
      setIsLoading(false)
      return
    }

    try {
      setError(null)
      const { data, error: rpcError } = await supabase.rpc('get_fellow_regulars', {
        p_user_id: userId,
        p_location_id: locationId || null,
      })

      if (rpcError) {
        setError({ code: 'FETCH_ERROR', message: rpcError.message })
        return
      }

      setRegulars(data || [])
    } catch (err) {
      setError({
        code: 'FETCH_ERROR',
        message: err instanceof Error ? err.message : ERROR_MESSAGES.UNKNOWN,
      })
    } finally {
      setIsLoading(false)
    }
  }, [supabase, userId, isAuthenticated, locationId])

  useEffect(() => {
    if (enabled) {
      fetchRegulars()
    }
  }, [enabled, fetchRegulars])

  return {
    regulars,
    isLoading,
    error,
    refetch: fetchRegulars,
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
  // supabase imported from lib/supabase

  const [regulars, setRegulars] = useState<LocationRegular[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [isUserRegular, setIsUserRegular] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<RegularsError | null>(null)

  const fetchData = useCallback(async () => {
    if (!locationId) {
      setRegulars([])
      setTotalCount(0)
      setIsLoading(false)
      return
    }

    try {
      setError(null)

      // Get count (always available)
      const { data: countData, error: countError } = await supabase.rpc(
        'get_location_regulars_count',
        { p_location_id: locationId }
      )

      if (countError) {
        setError({ code: 'FETCH_ERROR', message: countError.message })
        return
      }

      setTotalCount(countData || 0)

      // Check if user is a regular
      if (isAuthenticated && userId) {
        const { data: userRegularData } = await supabase
          .from('location_regulars')
          .select('is_regular')
          .eq('location_id', locationId)
          .eq('user_id', userId)
          .single()

        setIsUserRegular(userRegularData?.is_regular ?? false)

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
            setError({ code: 'FETCH_ERROR', message: regularsError.message })
            return
          }

          setRegulars(regularsData || [])
        }
      }
    } catch (err) {
      setError({
        code: 'FETCH_ERROR',
        message: err instanceof Error ? err.message : ERROR_MESSAGES.UNKNOWN,
      })
    } finally {
      setIsLoading(false)
    }
  }, [supabase, locationId, userId, isAuthenticated, limit])

  useEffect(() => {
    if (enabled) {
      fetchData()
    }
  }, [enabled, fetchData])

  return {
    regulars,
    totalCount,
    isUserRegular,
    isLoading,
    error,
    refetch: fetchData,
  }
}

// ============================================================================
// Exports
// ============================================================================

export default useRegularsMode
