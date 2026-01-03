/**
 * useSparkNotificationSettings Hook
 *
 * Custom hook for managing spark notification preferences.
 * Spark notifications alert users when someone posts at a location they frequently visit.
 *
 * Features:
 * - Load spark notification preference
 * - Toggle spark notifications on/off
 * - Automatic sync with Supabase
 * - Loading and error state management
 *
 * @example
 * ```tsx
 * function SparkNotificationSettings() {
 *   const {
 *     sparkNotificationsEnabled,
 *     toggleSparkNotifications,
 *     isLoading,
 *   } = useSparkNotificationSettings()
 *
 *   return (
 *     <Switch
 *       value={sparkNotificationsEnabled}
 *       onValueChange={toggleSparkNotifications}
 *       disabled={isLoading}
 *     />
 *   )
 * }
 * ```
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

// ============================================================================
// Types
// ============================================================================

/**
 * Result from preference update operations
 */
export interface SparkSettingsResult {
  success: boolean
  error: string | null
}

/**
 * Return value from useSparkNotificationSettings hook
 */
export interface UseSparkNotificationSettingsResult {
  /** Whether spark notifications are enabled */
  sparkNotificationsEnabled: boolean
  /** Toggle spark notifications on/off */
  toggleSparkNotifications: () => Promise<SparkSettingsResult>
  /** Set spark notifications to a specific value */
  setSparkNotifications: (enabled: boolean) => Promise<SparkSettingsResult>
  /** Whether preferences are still loading */
  isLoading: boolean
  /** Whether a save operation is in progress */
  isSaving: boolean
  /** Any error that occurred */
  error: string | null
  /** Refresh preferences from the database */
  refresh: () => Promise<void>
}

// ============================================================================
// Constants
// ============================================================================

const ERROR_MESSAGES = {
  NOT_AUTHENTICATED: 'User must be authenticated to manage notification settings.',
  LOAD_FAILED: 'Failed to load spark notification preference.',
  SAVE_FAILED: 'Failed to save spark notification preference.',
  UNKNOWN: 'An unknown error occurred.',
} as const

// ============================================================================
// Hook
// ============================================================================

/**
 * useSparkNotificationSettings - Manage spark notification preferences
 *
 * @returns Spark notification preference state and control functions
 */
export function useSparkNotificationSettings(): UseSparkNotificationSettingsResult {
  // ---------------------------------------------------------------------------
  // Auth State
  // ---------------------------------------------------------------------------

  const { userId, isAuthenticated } = useAuth()

  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------

  const [sparkEnabled, setSparkEnabled] = useState(true) // Default to true
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // ---------------------------------------------------------------------------
  // Supabase Client
  // ---------------------------------------------------------------------------

  // supabase imported from lib/supabase

  // ---------------------------------------------------------------------------
  // Load Preference
  // ---------------------------------------------------------------------------

  const loadPreference = useCallback(async (): Promise<void> => {
    if (!isAuthenticated || !userId) {
      setSparkEnabled(true)
      setIsLoading(false)
      return
    }

    try {
      setError(null)

      // Query the notification_preferences table directly
      const { data, error: queryError } = await supabase
        .from('notification_preferences')
        .select('spark_notifications')
        .eq('user_id', userId)
        .single()

      if (queryError) {
        // If no row exists, default to true
        if (queryError.code === 'PGRST116') {
          setSparkEnabled(true)
        } else {
          setError(`${ERROR_MESSAGES.LOAD_FAILED} ${queryError.message}`)
          setSparkEnabled(true)
        }
        return
      }

      setSparkEnabled(data?.spark_notifications ?? true)
    } catch (err) {
      const message = err instanceof Error ? err.message : ERROR_MESSAGES.UNKNOWN
      setError(`${ERROR_MESSAGES.LOAD_FAILED} ${message}`)
      setSparkEnabled(true)
    } finally {
      setIsLoading(false)
    }
  }, [supabase, isAuthenticated, userId])

  // ---------------------------------------------------------------------------
  // Save Preference
  // ---------------------------------------------------------------------------

  const savePreference = useCallback(
    async (enabled: boolean): Promise<SparkSettingsResult> => {
      if (!isAuthenticated || !userId) {
        return {
          success: false,
          error: ERROR_MESSAGES.NOT_AUTHENTICATED,
        }
      }

      try {
        setIsSaving(true)
        setError(null)

        // Upsert the preference
        const { error: upsertError } = await supabase
          .from('notification_preferences')
          .upsert(
            {
              user_id: userId,
              spark_notifications: enabled,
            },
            {
              onConflict: 'user_id',
            }
          )

        if (upsertError) {
          const errorMessage = `${ERROR_MESSAGES.SAVE_FAILED} ${upsertError.message}`
          setError(errorMessage)
          return {
            success: false,
            error: errorMessage,
          }
        }

        // Update local state on success
        setSparkEnabled(enabled)

        return {
          success: true,
          error: null,
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : ERROR_MESSAGES.UNKNOWN
        const errorMessage = `${ERROR_MESSAGES.SAVE_FAILED} ${message}`
        setError(errorMessage)
        return {
          success: false,
          error: errorMessage,
        }
      } finally {
        setIsSaving(false)
      }
    },
    [supabase, isAuthenticated, userId]
  )

  // ---------------------------------------------------------------------------
  // Toggle Function
  // ---------------------------------------------------------------------------

  const toggleSparkNotifications = useCallback(async (): Promise<SparkSettingsResult> => {
    return savePreference(!sparkEnabled)
  }, [sparkEnabled, savePreference])

  const setSparkNotifications = useCallback(
    async (enabled: boolean): Promise<SparkSettingsResult> => {
      if (sparkEnabled === enabled) {
        return { success: true, error: null }
      }
      return savePreference(enabled)
    },
    [sparkEnabled, savePreference]
  )

  const refresh = useCallback(async (): Promise<void> => {
    setIsLoading(true)
    await loadPreference()
  }, [loadPreference])

  // ---------------------------------------------------------------------------
  // Effects
  // ---------------------------------------------------------------------------

  useEffect(() => {
    loadPreference()
  }, [loadPreference])

  // ---------------------------------------------------------------------------
  // Return
  // ---------------------------------------------------------------------------

  return {
    sparkNotificationsEnabled: sparkEnabled,
    toggleSparkNotifications,
    setSparkNotifications,
    isLoading,
    isSaving,
    error,
    refresh,
  }
}

export default useSparkNotificationSettings
