/**
 * useNotificationSettings Hook
 *
 * Custom hook for managing user notification preferences in the Backtrack app.
 * Syncs notification settings with the Supabase database and provides toggle functionality.
 *
 * Features:
 * - Load notification preferences from database
 * - Toggle match notifications on/off
 * - Toggle message notifications on/off
 * - Automatic sync with Supabase
 * - Loading and error state management
 * - Requires user authentication
 *
 * @example
 * ```tsx
 * function NotificationSettings() {
 *   const {
 *     matchNotificationsEnabled,
 *     messageNotificationsEnabled,
 *     toggleMatchNotifications,
 *     toggleMessageNotifications,
 *     isLoading,
 *   } = useNotificationSettings()
 *
 *   if (isLoading) {
 *     return <LoadingIndicator />
 *   }
 *
 *   return (
 *     <View>
 *       <Switch
 *         value={matchNotificationsEnabled}
 *         onValueChange={toggleMatchNotifications}
 *       />
 *       <Switch
 *         value={messageNotificationsEnabled}
 *         onValueChange={toggleMessageNotifications}
 *       />
 *     </View>
 *   )
 * }
 * ```
 */

import { useState, useEffect, useCallback } from 'react'

import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

// ============================================================================
// TYPES
// ============================================================================

/**
 * Notification preferences state
 */
export interface NotificationPreferences {
  /** Whether match notifications are enabled */
  matchNotifications: boolean
  /** Whether message notifications are enabled */
  messageNotifications: boolean
}

/**
 * Result from preference update operations
 */
export interface NotificationSettingsResult {
  /** Whether the operation was successful */
  success: boolean
  /** Error message if operation failed */
  error: string | null
}

/**
 * Return value from useNotificationSettings hook
 */
export interface UseNotificationSettingsResult {
  /** Whether match notifications are enabled */
  matchNotificationsEnabled: boolean
  /** Whether message notifications are enabled */
  messageNotificationsEnabled: boolean
  /** Toggle match notifications on/off */
  toggleMatchNotifications: () => Promise<NotificationSettingsResult>
  /** Toggle message notifications on/off */
  toggleMessageNotifications: () => Promise<NotificationSettingsResult>
  /** Set match notifications to a specific value */
  setMatchNotifications: (enabled: boolean) => Promise<NotificationSettingsResult>
  /** Set message notifications to a specific value */
  setMessageNotifications: (enabled: boolean) => Promise<NotificationSettingsResult>
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
// CONSTANTS
// ============================================================================

/**
 * Default notification preferences
 * Both types are enabled by default
 */
const DEFAULT_PREFERENCES: NotificationPreferences = {
  matchNotifications: true,
  messageNotifications: true,
}

/**
 * Error messages for notification settings operations
 */
const ERROR_MESSAGES = {
  NOT_AUTHENTICATED: 'User must be authenticated to manage notification settings.',
  LOAD_FAILED: 'Failed to load notification preferences.',
  SAVE_FAILED: 'Failed to save notification preferences.',
  UNKNOWN: 'An unknown error occurred.',
} as const

// ============================================================================
// HOOK
// ============================================================================

/**
 * useNotificationSettings - Custom hook for notification preferences management
 *
 * Loads and saves notification preferences to the Supabase database.
 * Provides toggle functions for easy UI integration.
 *
 * @returns Notification preferences state and control functions
 *
 * @example
 * // Basic usage with Switch components
 * const { matchNotificationsEnabled, toggleMatchNotifications } = useNotificationSettings()
 *
 * <Switch value={matchNotificationsEnabled} onValueChange={toggleMatchNotifications} />
 *
 * @example
 * // With loading state
 * const { isLoading, matchNotificationsEnabled } = useNotificationSettings()
 *
 * if (isLoading) return <ActivityIndicator />
 * return <Text>{matchNotificationsEnabled ? 'Enabled' : 'Disabled'}</Text>
 */
export function useNotificationSettings(): UseNotificationSettingsResult {
  // ---------------------------------------------------------------------------
  // AUTH STATE
  // ---------------------------------------------------------------------------

  const { userId, isAuthenticated } = useAuth()

  // ---------------------------------------------------------------------------
  // STATE
  // ---------------------------------------------------------------------------

  const [preferences, setPreferences] = useState<NotificationPreferences>(DEFAULT_PREFERENCES)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // ---------------------------------------------------------------------------
  // LOAD PREFERENCES
  // ---------------------------------------------------------------------------

  /**
   * Load notification preferences from the database
   */
  const loadPreferences = useCallback(async (): Promise<void> => {
    if (!isAuthenticated || !userId) {
      setPreferences(DEFAULT_PREFERENCES)
      setIsLoading(false)
      return
    }

    try {
      setError(null)

      // Call the get_notification_preferences RPC function
      const { data, error: rpcError } = await supabase.rpc('get_notification_preferences', {
        p_user_id: userId,
      })

      if (rpcError) {
        setError(`${ERROR_MESSAGES.LOAD_FAILED} ${rpcError.message}`)
        // Use defaults on error
        setPreferences(DEFAULT_PREFERENCES)
        return
      }

      // RPC returns an array with one row, or empty if no preferences
      if (data && data.length > 0) {
        const prefs = data[0]
        setPreferences({
          matchNotifications: prefs.match_notifications ?? true,
          messageNotifications: prefs.message_notifications ?? true,
        })
      } else {
        // No preferences found, use defaults
        setPreferences(DEFAULT_PREFERENCES)
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : ERROR_MESSAGES.UNKNOWN
      setError(`${ERROR_MESSAGES.LOAD_FAILED} ${message}`)
      setPreferences(DEFAULT_PREFERENCES)
    } finally {
      setIsLoading(false)
    }
  }, [isAuthenticated, userId])

  // ---------------------------------------------------------------------------
  // SAVE PREFERENCES
  // ---------------------------------------------------------------------------

  /**
   * Save notification preferences to the database
   */
  const savePreferences = useCallback(
    async (newPreferences: NotificationPreferences): Promise<NotificationSettingsResult> => {
      if (!isAuthenticated || !userId) {
        return {
          success: false,
          error: ERROR_MESSAGES.NOT_AUTHENTICATED,
        }
      }

      try {
        setIsSaving(true)
        setError(null)

        // Call the upsert_notification_preferences RPC function
        const { error: rpcError } = await supabase.rpc('upsert_notification_preferences', {
          p_user_id: userId,
          p_match_notifications: newPreferences.matchNotifications,
          p_message_notifications: newPreferences.messageNotifications,
        })

        if (rpcError) {
          const errorMessage = `${ERROR_MESSAGES.SAVE_FAILED} ${rpcError.message}`
          setError(errorMessage)
          return {
            success: false,
            error: errorMessage,
          }
        }

        // Update local state on success
        setPreferences(newPreferences)

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
    [isAuthenticated, userId]
  )

  // ---------------------------------------------------------------------------
  // TOGGLE FUNCTIONS
  // ---------------------------------------------------------------------------

  /**
   * Toggle match notifications on/off
   */
  const toggleMatchNotifications = useCallback(async (): Promise<NotificationSettingsResult> => {
    const newPreferences = {
      ...preferences,
      matchNotifications: !preferences.matchNotifications,
    }
    return savePreferences(newPreferences)
  }, [preferences, savePreferences])

  /**
   * Toggle message notifications on/off
   */
  const toggleMessageNotifications = useCallback(async (): Promise<NotificationSettingsResult> => {
    const newPreferences = {
      ...preferences,
      messageNotifications: !preferences.messageNotifications,
    }
    return savePreferences(newPreferences)
  }, [preferences, savePreferences])

  /**
   * Set match notifications to a specific value
   */
  const setMatchNotifications = useCallback(
    async (enabled: boolean): Promise<NotificationSettingsResult> => {
      if (preferences.matchNotifications === enabled) {
        return { success: true, error: null }
      }
      const newPreferences = {
        ...preferences,
        matchNotifications: enabled,
      }
      return savePreferences(newPreferences)
    },
    [preferences, savePreferences]
  )

  /**
   * Set message notifications to a specific value
   */
  const setMessageNotifications = useCallback(
    async (enabled: boolean): Promise<NotificationSettingsResult> => {
      if (preferences.messageNotifications === enabled) {
        return { success: true, error: null }
      }
      const newPreferences = {
        ...preferences,
        messageNotifications: enabled,
      }
      return savePreferences(newPreferences)
    },
    [preferences, savePreferences]
  )

  /**
   * Refresh preferences from the database
   */
  const refresh = useCallback(async (): Promise<void> => {
    setIsLoading(true)
    await loadPreferences()
  }, [loadPreferences])

  // ---------------------------------------------------------------------------
  // EFFECTS
  // ---------------------------------------------------------------------------

  /**
   * Load preferences when authentication state changes
   */
  useEffect(() => {
    loadPreferences()
  }, [loadPreferences])

  // ---------------------------------------------------------------------------
  // RETURN
  // ---------------------------------------------------------------------------

  return {
    // Preference values
    matchNotificationsEnabled: preferences.matchNotifications,
    messageNotificationsEnabled: preferences.messageNotifications,

    // Toggle functions
    toggleMatchNotifications,
    toggleMessageNotifications,

    // Set functions
    setMatchNotifications,
    setMessageNotifications,

    // State
    isLoading,
    isSaving,
    error,

    // Actions
    refresh,
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export default useNotificationSettings
