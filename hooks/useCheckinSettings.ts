/**
 * useCheckinSettings Hook
 *
 * Custom hook for managing user check-in/tracking settings.
 * Integrates with background location tracking service.
 */

import { useState, useCallback, useEffect, useRef } from "react"

import { supabase } from "../lib/supabase"
import { captureException } from "../lib/sentry"
import { useAuth } from "../contexts/AuthContext"
import {
  startBackgroundLocationTracking,
  stopBackgroundLocationTracking,
  updateTrackingSettings as updateBackgroundSettings,
  isBackgroundLocationRunning,
  type StartTrackingResult,
} from "../services/backgroundLocation"
import type { TrackingSettings } from "../types/database"

export interface TrackingSettingsError {
  code: "AUTH_ERROR" | "FETCH_ERROR" | "UPDATE_ERROR" | "BACKGROUND_ERROR"
  message: string
}

export interface UseCheckinSettingsOptions {
  enabled?: boolean
}

export interface UseCheckinSettingsResult {
  settings: TrackingSettings
  isLoading: boolean
  isUpdating: boolean
  error: TrackingSettingsError | null
  isBackgroundTrackingActive: boolean
  updateSettings: (updates: Partial<TrackingSettings>) => Promise<boolean>
  toggleAlwaysOn: () => Promise<boolean>
  refresh: () => Promise<void>
  clearError: () => void
}

const DEFAULT_SETTINGS: TrackingSettings = {
  always_on_tracking_enabled: false,
  checkin_prompt_minutes: 5,
}

export function useCheckinSettings(
  options: UseCheckinSettingsOptions = {}
): UseCheckinSettingsResult {
  const { enabled = true } = options
  const { userId, isAuthenticated } = useAuth()

  const [settings, setSettings] = useState<TrackingSettings>(DEFAULT_SETTINGS)
  const [isLoading, setIsLoading] = useState(true)
  const [isUpdating, setIsUpdating] = useState(false)
  const [error, setError] = useState<TrackingSettingsError | null>(null)
  const [isBackgroundTrackingActive, setIsBackgroundTrackingActive] = useState(false)

  const isMountedRef = useRef(true)

  const checkBackgroundStatus = useCallback(async () => {
    try {
      const isRunning = await isBackgroundLocationRunning()
      if (isMountedRef.current) {
        setIsBackgroundTrackingActive(isRunning)
      }
    } catch (error) {
      // Non-critical: background status check failed, just log in dev
      if (__DEV__) {
        console.warn('[useCheckinSettings] Background status check failed', error)
      }
    }
  }, [])

  const fetchSettings = useCallback(async () => {
    if (!isAuthenticated || !userId) {
      setSettings(DEFAULT_SETTINGS)
      setIsLoading(false)
      return
    }

    try {
      setError(null)
      const { data, error: rpcError } = await supabase.rpc("get_tracking_settings")

      if (rpcError) {
        if (isMountedRef.current) {
          setError({ code: "FETCH_ERROR", message: rpcError.message })
        }
        return
      }

      if (isMountedRef.current && data?.success) {
        const newSettings = {
          always_on_tracking_enabled: data.always_on_tracking_enabled ?? false,
          checkin_prompt_minutes: data.checkin_prompt_minutes ?? 5,
        }
        setSettings(newSettings)

        // Sync background tracking state with settings
        if (newSettings.always_on_tracking_enabled) {
          const isRunning = await isBackgroundLocationRunning()
          if (!isRunning) {
            const result = await startBackgroundLocationTracking(userId, newSettings.checkin_prompt_minutes)
            if (!result.success && result.error) {
              // Log but don't block settings fetch - user can retry via UI
              console.warn('[useCheckinSettings] Background tracking sync failed:', result.error)
            }
          }
        }
      }

      await checkBackgroundStatus()
    } catch (err) {
      if (isMountedRef.current) {
        setError({
          code: "FETCH_ERROR",
          message: err instanceof Error ? err.message : "Failed to fetch settings",
        })
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false)
      }
    }
  }, [isAuthenticated, userId, checkBackgroundStatus])

  const updateSettings = useCallback(
    async (updates: Partial<TrackingSettings>): Promise<boolean> => {
      if (!isAuthenticated || !userId) {
        setError({ code: "AUTH_ERROR", message: "Not authenticated" })
        return false
      }

      setIsUpdating(true)
      setError(null)

      try {
        const newSettings = { ...settings, ...updates }

        const { data, error: rpcError } = await supabase.rpc("update_tracking_settings", {
          p_always_on_enabled: newSettings.always_on_tracking_enabled,
          p_prompt_minutes: newSettings.checkin_prompt_minutes,
        })

        if (rpcError) {
          setError({ code: "UPDATE_ERROR", message: rpcError.message })
          return false
        }

        if (!data?.success) {
          setError({ code: "UPDATE_ERROR", message: data?.error ?? "Update failed" })
          return false
        }

        const wasEnabled = settings.always_on_tracking_enabled
        const isNowEnabled = data.always_on_tracking_enabled

        if (isNowEnabled && !wasEnabled) {
          const result = await startBackgroundLocationTracking(
            userId,
            data.checkin_prompt_minutes
          )
          if (!result.success) {
            // Show error but keep setting enabled so user can configure timer
            // and grant permissions later
            setError({
              code: "BACKGROUND_ERROR",
              message: result.error || "Could not start background tracking. Please grant location permissions.",
            })
          }
        } else if (!isNowEnabled && wasEnabled) {
          await stopBackgroundLocationTracking()
        } else if (isNowEnabled && updates.checkin_prompt_minutes !== undefined) {
          await updateBackgroundSettings(data.checkin_prompt_minutes)
        }

        if (isMountedRef.current) {
          setSettings({
            always_on_tracking_enabled: data.always_on_tracking_enabled,
            checkin_prompt_minutes: data.checkin_prompt_minutes,
          })
        }

        await checkBackgroundStatus()
        return true
      } catch (err) {
        setError({
          code: "UPDATE_ERROR",
          message: err instanceof Error ? err.message : "Failed to update settings",
        })
        return false
      } finally {
        if (isMountedRef.current) {
          setIsUpdating(false)
        }
      }
    },
    [isAuthenticated, userId, settings, checkBackgroundStatus]
  )

  const toggleAlwaysOn = useCallback(async (): Promise<boolean> => {
    return updateSettings({
      always_on_tracking_enabled: !settings.always_on_tracking_enabled,
    })
  }, [settings.always_on_tracking_enabled, updateSettings])

  const refresh = useCallback(async () => {
    setIsLoading(true)
    await fetchSettings()
  }, [fetchSettings])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

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
    isBackgroundTrackingActive,
    updateSettings,
    toggleAlwaysOn,
    refresh,
    clearError,
  }
}

export default useCheckinSettings
