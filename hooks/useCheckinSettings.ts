/**
 * useCheckinSettings Hook
 *
 * Custom hook for managing user's check-in/tracking settings.
 * Handles always-on location tracking toggle and check-in prompt timing.
 *
 * @example
 * ```tsx
 * function TrackingSettings() {
 *   const {
 *     settings,
 *     isLoading,
 *     updateSettings,
 *     toggleAlwaysOn,
 *   } = useCheckinSettings()
 *
 *   return (
 *     <View>
 *       <Switch
 *         value={settings.always_on_tracking_enabled}
 *         onValueChange={toggleAlwaysOn}
 *       />
 *       <Picker
 *         selectedValue={settings.checkin_prompt_minutes}
 *         onValueChange={(mins) => updateSettings({ checkin_prompt_minutes: mins })}
 *       >
 *         {[1, 5, 10, 15, 30, 60].map(m => (
 *           <Picker.Item key={m} label={`${m} min`} value={m} />
 *         ))}
 *       </Picker>
 *     </View>
 *   )
 * }
 * ```
 */

import { useState, useCallback, useEffect, useRef } from 'react'

import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import type { TrackingSettings } from '../types/database'

// ============================================================================
// TYPES
// ============================================================================

/**
 * Error type for tracking settings operations
 */
export interface TrackingSettingsError {
  code: 'AUTH_ERROR' | 'FETCH_ERROR' | 'UPDATE_ERROR'
  message: string
}

/**
 * Options for useCheckinSettings hook
 */
export interface UseCheckinSettingsOptions {
  /** Whether to fetch settings on mount (default: true) */
  enabled?: boolean
}

/**
 * Return value from useCheckinSettings hook
 */
export interface UseCheckinSettingsResult {
  /** Current tracking settings */
  settings: TrackingSettings
  /** Whether settings are loading */
  isLoading: boolean
  /** Whether an update is in progress */
  isUpdating: boolean
  /** Any error that occurred */
  error: TrackingSettingsError | null
  /** Update tracking settings */
  updateSettings: (updates: Partial<TrackingSettings>) => Promise<boolean>
  /** Toggle always-on tracking */
  toggleAlwaysOn: () => Promise<boolean>
  /** Refresh settings from server */
  refresh: () => Promise<void>
  /** Clear any error */
  clearError: () => void
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_SETTINGS: TrackingSettings = {
  always_on_tracking_enabled: false,
  checkin_prompt_minutes: 5,
}

// ============================================================================
// HOOK IMPLEMENTATION
// ============================================================================

/**
 * Hook for managing user's check-in/tracking settings
 */
export function useCheckinSettings(
  options: UseCheckinSettingsOptions = {}
): UseCheckinSettingsResult {
  const { enabled = true } = options
  const { userId, isAuthenticated } = useAuth()

  // State
  const [settings, setSettings] = useState<TrackingSettings>(DEFAULT_SETTINGS)
  const [isLoading, setIsLoading] = useState(true)
  const [isUpdating, setIsUpdating] = useState(false)
  const [error, setError] = useState<TrackingSettingsError | null>(null)

  // Refs to prevent state updates after unmount
  const isMountedRef = useRef(true)

  /**
   * Fetch settings from server
   */
  const fetchSettings = useCallback(async () => {
    if (!isAuthenticated || !userId) {
      setSettings(DEFAULT_SETTINGS)
      setIsLoading(false)
      return
    }

    try {
      setError(null)

      const { data, error: rpcError } = await supabase.rpc('get_tracking_settings')

      if (rpcError) {
        if (isMountedRef.current) {
          setError({ code: 'FETCH_ERROR', message: rpcError.message })
        }
        return
      }

      if (isMountedRef.current && data?.success) {
        setSettings({
          always_on_tracking_enabled: data.always_on_tracking_enabled ?? false,
          checkin_prompt_minutes: data.checkin_prompt_minutes ?? 5,
        })
      }
    } catch (err) {
      if (isMountedRef.current) {
        setError({
          code: 'FETCH_ERROR',
          message: err instanceof Error ? err.message : 'Failed to fetch settings',
        })
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false)
      }
    }
  }, [isAuthenticated, userId])

  /**
   * Update tracking settings
   */
  const updateSettings = useCallback(
    async (updates: Partial<TrackingSettings>): Promise<boolean> => {
      if (!isAuthenticated || !userId) {
        setError({ code: 'AUTH_ERROR', message: 'Not authenticated' })
        return false
      }

      setIsUpdating(true)
      setError(null)

      try {
        const newSettings = { ...settings, ...updates }

        const { data, error: rpcError } = await supabase.rpc('update_tracking_settings', {
          p_always_on_enabled: newSettings.always_on_tracking_enabled,
          p_prompt_minutes: newSettings.checkin_prompt_minutes,
        })

        if (rpcError) {
          setError({ code: 'UPDATE_ERROR', message: rpcError.message })
          return false
        }

        if (!data?.success) {
          setError({ code: 'UPDATE_ERROR', message: data?.error ?? 'Update failed' })
          return false
        }

        if (isMountedRef.current) {
          setSettings({
            always_on_tracking_enabled: data.always_on_tracking_enabled,
            checkin_prompt_minutes: data.checkin_prompt_minutes,
          })
        }

        return true
      } catch (err) {
        setError({
          code: 'UPDATE_ERROR',
          message: err instanceof Error ? err.message : 'Failed to update settings',
        })
        return false
      } finally {
        if (isMountedRef.current) {
          setIsUpdating(false)
        }
      }
    },
    [isAuthenticated, userId, settings]
  )

  /**
   * Toggle always-on tracking
   */
  const toggleAlwaysOn = useCallback(async (): Promise<boolean> => {
    return updateSettings({
      always_on_tracking_enabled: !settings.always_on_tracking_enabled,
    })
  }, [settings.always_on_tracking_enabled, updateSettings])

  /**
   * Refresh settings from server
   */
  const refresh = useCallback(async () => {
    setIsLoading(true)
    await fetchSettings()
  }, [fetchSettings])

  /**
   * Clear error
   */
  const clearError = useCallback(() => {
    setError(null)
  }, [])

  // Fetch settings on mount
  useEffect(() => {
    isMountedRef.current = true

    if (enabled) {
      fetchSettings()
    }

    return () => {
      isMountedRef.current = false
    }
  }, [enabled, fetchSettings])

  return {
    settings,
    isLoading,
    isUpdating,
    error,
    updateSettings,
    toggleAlwaysOn,
    refresh,
    clearError,
  }
}

export default useCheckinSettings
