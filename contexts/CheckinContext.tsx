/**
 * CheckinContext
 *
 * Shared context that holds the single source of truth for active check-in state.
 * Solves the problem where multiple useCheckin() consumers each had independent
 * useState instances — GlobalHeader and CheckInButton now share the same state.
 *
 * Also handles restarting background location tracking after checkout when
 * always-on tracking is enabled.
 */

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
} from 'react'
import { AppState, type AppStateStatus } from 'react-native'
import * as Location from 'expo-location'

import { supabase } from '../lib/supabase'
import { reduceCoordinatePrecision } from '../lib/utils/geoPrivacy'
import {
  isBackgroundLocationRunning,
  startBackgroundLocationTracking,
} from '../services/backgroundLocation'
import { useAuth } from './AuthContext'
import type { ActiveCheckin } from '../types/database'
import type {
  AccuracyInfo,
  CheckinResult,
  CheckoutResult,
  UseCheckinResult,
} from '../hooks/useCheckin'

/** Check-ins expire after 3 hours for users without background tracking */
const CHECKIN_EXPIRY_MS = 3 * 60 * 60 * 1000

// ============================================================================
// CONTEXT
// ============================================================================

const CheckinContext = createContext<UseCheckinResult | null>(null)

// ============================================================================
// PROVIDER
// ============================================================================

export function CheckinProvider({ children }: { children: ReactNode }) {
  const { userId } = useAuth()

  const [activeCheckin, setActiveCheckin] = useState<ActiveCheckin | null>(null)
  const [isCheckingIn, setIsCheckingIn] = useState(false)
  const [isCheckingOut, setIsCheckingOut] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const isMountedRef = useRef(true)

  const getActiveCheckin = useCallback(async () => {
    if (!isMountedRef.current) return

    try {
      const { data, error: fetchError } = await supabase.rpc('get_active_checkin')

      if (fetchError) {
        if (isMountedRef.current) {
          setError(fetchError.message)
        }
        return
      }

      if (isMountedRef.current) {
        if (data?.success && data?.checkin) {
          setActiveCheckin(data.checkin as ActiveCheckin)
        } else {
          setActiveCheckin(null)
        }
        setError(null)
      }
    } catch (err) {
      if (isMountedRef.current) {
        setError('Failed to fetch active check-in')
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false)
      }
    }
  }, [])

  const checkIn = useCallback(async (locationId: string): Promise<CheckinResult> => {
    setIsCheckingIn(true)
    setError(null)

    try {
      const { status } = await Location.requestForegroundPermissionsAsync()
      if (status !== 'granted') {
        const result: CheckinResult = {
          success: false,
          checkinId: null,
          verified: false,
          alreadyCheckedIn: false,
          distanceMeters: null,
          effectiveRadius: null,
          accuracyInfo: null,
          error: 'Location permission required to check in',
        }
        setError(result.error)
        return result
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      })

      const reducedLat = reduceCoordinatePrecision(location.coords.latitude, 4)
      const reducedLon = reduceCoordinatePrecision(location.coords.longitude, 4)

      const { data, error: rpcError } = await supabase.rpc('checkin_to_location', {
        p_location_id: locationId,
        p_user_lat: reducedLat,
        p_user_lon: reducedLon,
        p_accuracy: location.coords.accuracy,
      })

      if (rpcError) {
        const result: CheckinResult = {
          success: false,
          checkinId: null,
          verified: false,
          alreadyCheckedIn: false,
          distanceMeters: null,
          effectiveRadius: null,
          accuracyInfo: null,
          error: rpcError.message,
        }
        setError(result.error)
        return result
      }

      if (!data.success) {
        const result: CheckinResult = {
          success: false,
          checkinId: null,
          verified: false,
          alreadyCheckedIn: false,
          distanceMeters: null,
          effectiveRadius: null,
          accuracyInfo: data.accuracy_info || null,
          error: data.error || 'Check-in failed',
        }
        setError(result.error)
        return result
      }

      await getActiveCheckin()

      return {
        success: true,
        checkinId: data.checkin_id,
        verified: data.verified,
        alreadyCheckedIn: data.already_checked_in || false,
        distanceMeters: data.distance_meters,
        effectiveRadius: data.effective_radius || null,
        accuracyInfo: data.accuracy_info || null,
        error: null,
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Check-in failed'
      setError(errorMessage)
      return {
        success: false,
        checkinId: null,
        verified: false,
        alreadyCheckedIn: false,
        distanceMeters: null,
        effectiveRadius: null,
        accuracyInfo: null,
        error: errorMessage,
      }
    } finally {
      setIsCheckingIn(false)
    }
  }, [getActiveCheckin])

  const checkOut = useCallback(async (locationId?: string): Promise<CheckoutResult> => {
    setIsCheckingOut(true)
    setError(null)

    try {
      const { data, error: rpcError } = await supabase.rpc('checkout_from_location', {
        p_location_id: locationId || null,
      })

      if (rpcError) {
        const result: CheckoutResult = {
          success: false,
          checkouts: 0,
          error: rpcError.message,
        }
        setError(result.error)
        return result
      }

      if (!data.success) {
        const result: CheckoutResult = {
          success: false,
          checkouts: 0,
          error: data.error || 'Check-out failed',
        }
        setError(result.error)
        return result
      }

      // Clear active check-in if checking out from current location
      if (!locationId || activeCheckin?.location_id === locationId) {
        setActiveCheckin(null)
      }

      // Restart background location tracking if always-on is enabled
      if (userId) {
        try {
          const { data: trackingData } = await supabase.rpc('get_tracking_settings')
          if (trackingData?.always_on_tracking_enabled) {
            const isRunning = await isBackgroundLocationRunning()
            if (!isRunning) {
              await startBackgroundLocationTracking(
                userId,
                trackingData.checkin_prompt_minutes
              )
            }
          }
        } catch {
          // Non-critical — don't fail the checkout for this
          if (__DEV__) {
            console.warn('[CheckinContext] Failed to restart background tracking after checkout')
          }
        }
      }

      return {
        success: true,
        checkouts: data.checkouts,
        error: null,
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Check-out failed'
      setError(errorMessage)
      return {
        success: false,
        checkouts: 0,
        error: errorMessage,
      }
    } finally {
      setIsCheckingOut(false)
    }
  }, [activeCheckin, userId])

  const isCheckedInAt = useCallback((locationId: string): boolean => {
    return activeCheckin?.location_id === locationId
  }, [activeCheckin])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  // Fetch active check-in on mount
  useEffect(() => {
    isMountedRef.current = true
    getActiveCheckin()

    return () => {
      isMountedRef.current = false
    }
  }, [getActiveCheckin])

  // Re-fetch active check-in when app returns to foreground
  useEffect(() => {
    const handleAppState = (nextState: AppStateStatus) => {
      if (nextState === 'active' && isMountedRef.current) {
        getActiveCheckin()
      }
    }

    const subscription = AppState.addEventListener('change', handleAppState)
    return () => subscription.remove()
  }, [getActiveCheckin])

  // Auto-expire client-side checkin after 3 hours
  useEffect(() => {
    if (!activeCheckin?.checked_in_at) return

    const checkedInTime = new Date(activeCheckin.checked_in_at).getTime()
    const expiresAt = checkedInTime + CHECKIN_EXPIRY_MS
    const timeUntilExpiry = expiresAt - Date.now()

    if (timeUntilExpiry <= 0) {
      getActiveCheckin()
      return
    }

    const timer = setTimeout(() => {
      if (isMountedRef.current) {
        getActiveCheckin()
      }
    }, timeUntilExpiry)

    return () => clearTimeout(timer)
  }, [activeCheckin?.checked_in_at, getActiveCheckin])

  const value: UseCheckinResult = {
    activeCheckin,
    isCheckingIn,
    isCheckingOut,
    isLoading,
    error,
    checkIn,
    checkOut,
    getActiveCheckin,
    isCheckedInAt,
    clearError,
  }

  return (
    <CheckinContext.Provider value={value}>
      {children}
    </CheckinContext.Provider>
  )
}

// ============================================================================
// HOOK
// ============================================================================

export function useCheckinContext(): UseCheckinResult {
  const context = useContext(CheckinContext)
  if (!context) {
    throw new Error('useCheckinContext must be used within a CheckinProvider')
  }
  return context
}
