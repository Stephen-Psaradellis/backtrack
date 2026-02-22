/**
 * useGhostMode Hook
 *
 * Custom hook for managing Ghost Mode - temporary privacy feature that hides
 * users from location-based features.
 *
 * Features:
 * - Activate ghost mode with preset durations (1h, 2h, 4h, session)
 * - Deactivate ghost mode immediately
 * - Check if currently in ghost mode
 * - Display time remaining
 *
 * @example
 * ```tsx
 * function SettingsScreen() {
 *   const { isGhostMode, timeRemaining, activate, deactivate } = useGhostMode()
 *
 *   return (
 *     <View>
 *       {isGhostMode ? (
 *         <>
 *           <Text>Ghost Mode Active - {timeRemaining}</Text>
 *           <Button onPress={deactivate}>Deactivate</Button>
 *         </>
 *       ) : (
 *         <Button onPress={() => activate('2h')}>Activate for 2h</Button>
 *       )}
 *     </View>
 *   )
 * }
 * ```
 */

import { useState, useCallback, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

// ============================================================================
// TYPES
// ============================================================================

/**
 * Ghost mode duration presets
 */
export type GhostModeDuration = '1h' | '2h' | '4h' | 'session'

/**
 * Result of ghost mode activation/deactivation
 */
export interface GhostModeResult {
  success: boolean
  ghost_mode_until: string | null
  duration_minutes?: number
  error?: string
}

/**
 * Return value from useGhostMode hook
 */
export interface UseGhostModeResult {
  /** Whether ghost mode is currently active */
  isGhostMode: boolean
  /** Timestamp when ghost mode expires (null if inactive) */
  ghostModeUntil: Date | null
  /** Human-readable time remaining (e.g., "1h 23m" or null if inactive) */
  timeRemaining: string | null
  /** Whether an operation is in progress */
  isLoading: boolean
  /** Last error message */
  error: string | null
  /** Activate ghost mode with duration */
  activate: (duration: GhostModeDuration) => Promise<GhostModeResult>
  /** Deactivate ghost mode immediately */
  deactivate: () => Promise<GhostModeResult>
  /** Manually refresh ghost mode state */
  refresh: () => Promise<void>
  /** Clear error state */
  clearError: () => void
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Convert duration preset to interval string
 */
function durationToInterval(duration: GhostModeDuration): string {
  switch (duration) {
    case '1h':
      return '1 hour'
    case '2h':
      return '2 hours'
    case '4h':
      return '4 hours'
    case 'session':
      return '4 hours' // Default session length
    default:
      return '1 hour'
  }
}

/**
 * Format time remaining as human-readable string
 */
function formatTimeRemaining(until: Date): string {
  const now = new Date()
  const diff = until.getTime() - now.getTime()

  if (diff <= 0) {
    return 'Expired'
  }

  const hours = Math.floor(diff / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

  if (hours > 0) {
    return `${hours}h ${minutes}m`
  } else {
    return `${minutes}m`
  }
}

// ============================================================================
// HOOK IMPLEMENTATION
// ============================================================================

/**
 * Hook for managing Ghost Mode
 */
export function useGhostMode(): UseGhostModeResult {
  const { profile, refreshProfile } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [timeRemaining, setTimeRemaining] = useState<string | null>(null)

  // Timer ref for updating time remaining
  const timerRef = useRef<NodeJS.Timeout>()

  // Computed values
  const ghostModeUntil = profile?.ghost_mode_until
    ? new Date(profile.ghost_mode_until)
    : null

  const isGhostMode =
    ghostModeUntil !== null && ghostModeUntil.getTime() > Date.now()

  /**
   * Activate ghost mode with specified duration
   */
  const activate = useCallback(
    async (duration: GhostModeDuration): Promise<GhostModeResult> => {
      if (!profile?.id) {
        const result: GhostModeResult = {
          success: false,
          ghost_mode_until: null,
          error: 'Not authenticated',
        }
        setError(result.error!)
        return result
      }

      setIsLoading(true)
      setError(null)

      try {
        const interval = durationToInterval(duration)

        const { data, error: rpcError } = await supabase.rpc(
          'activate_ghost_mode',
          {
            p_user_id: profile.id,
            p_duration: interval,
          }
        )

        if (rpcError) {
          const result: GhostModeResult = {
            success: false,
            ghost_mode_until: null,
            error: rpcError.message,
          }
          setError(result.error!)
          return result
        }

        if (!data.success) {
          const result: GhostModeResult = {
            success: false,
            ghost_mode_until: null,
            error: data.error || 'Failed to activate ghost mode',
          }
          setError(result.error!)
          return result
        }

        // Refresh profile to get updated ghost_mode_until
        await refreshProfile()

        return {
          success: true,
          ghost_mode_until: data.ghost_mode_until,
          duration_minutes: data.duration_minutes,
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to activate ghost mode'
        setError(errorMessage)
        return {
          success: false,
          ghost_mode_until: null,
          error: errorMessage,
        }
      } finally {
        setIsLoading(false)
      }
    },
    [profile?.id, refreshProfile]
  )

  /**
   * Deactivate ghost mode immediately
   */
  const deactivate = useCallback(async (): Promise<GhostModeResult> => {
    if (!profile?.id) {
      const result: GhostModeResult = {
        success: false,
        ghost_mode_until: null,
        error: 'Not authenticated',
      }
      setError(result.error!)
      return result
    }

    setIsLoading(true)
    setError(null)

    try {
      const { data, error: rpcError } = await supabase.rpc(
        'deactivate_ghost_mode',
        {
          p_user_id: profile.id,
        }
      )

      if (rpcError) {
        const result: GhostModeResult = {
          success: false,
          ghost_mode_until: null,
          error: rpcError.message,
        }
        setError(result.error!)
        return result
      }

      if (!data.success) {
        const result: GhostModeResult = {
          success: false,
          ghost_mode_until: null,
          error: data.error || 'Failed to deactivate ghost mode',
        }
        setError(result.error!)
        return result
      }

      // Refresh profile to get updated ghost_mode_until
      await refreshProfile()

      return {
        success: true,
        ghost_mode_until: null,
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to deactivate ghost mode'
      setError(errorMessage)
      return {
        success: false,
        ghost_mode_until: null,
        error: errorMessage,
      }
    } finally {
      setIsLoading(false)
    }
  }, [profile?.id, refreshProfile])

  /**
   * Manually refresh ghost mode state
   */
  const refresh = useCallback(async () => {
    await refreshProfile()
  }, [refreshProfile])

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setError(null)
  }, [])

  // Update time remaining every minute when ghost mode is active
  useEffect(() => {
    if (isGhostMode && ghostModeUntil) {
      // Update immediately
      setTimeRemaining(formatTimeRemaining(ghostModeUntil))

      // Update every minute
      timerRef.current = setInterval(() => {
        const remaining = formatTimeRemaining(ghostModeUntil)
        setTimeRemaining(remaining)

        // Auto-refresh profile when expired
        if (remaining === 'Expired') {
          refreshProfile()
        }
      }, 60000) // Update every 60 seconds

      return () => {
        if (timerRef.current) {
          clearInterval(timerRef.current)
        }
      }
    } else {
      setTimeRemaining(null)
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [isGhostMode, ghostModeUntil, refreshProfile])

  return {
    isGhostMode,
    ghostModeUntil,
    timeRemaining,
    isLoading,
    error,
    activate,
    deactivate,
    refresh,
    clearError,
  }
}
