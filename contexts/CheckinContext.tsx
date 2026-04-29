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
  useMemo,
  type ReactNode,
} from 'react'
import { AppState, type AppStateStatus } from 'react-native'
import * as Location from 'expo-location'
import AsyncStorage from '@react-native-async-storage/async-storage'

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

/** AsyncStorage key for scheduled checkout time */
const SCHEDULED_CHECKOUT_KEY = 'backtrack.scheduled_checkout_at'

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
  const [scheduledCheckoutAt, setScheduledCheckoutAt] = useState<string | null>(null)
  const [hasAlwaysOnTracking, setHasAlwaysOnTracking] = useState(false)

  const isMountedRef = useRef(true)
  const scheduledTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

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

      // Sync dwell state so departure detection monitors this location
      // (important for always-on tracking users who check in manually)
      try {
        const dwellStateKey = 'backtrack.dwell_state'
        const dwellState = {
          currentLocation: {
            latitude: reducedLat,
            longitude: reducedLon,
            locationId,
          },
          arrivedAt: Date.now(),
          notificationSent: true, // Already checked in, don't re-prompt
          userId,
        }
        await AsyncStorage.setItem(dwellStateKey, JSON.stringify(dwellState))
      } catch {
        // Non-critical — departure detection may not work but check-in still succeeded
      }

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

  /**
   * Schedule an auto-checkout after the given number of minutes.
   * Persists the scheduled time to AsyncStorage for app restart recovery.
   */
  const scheduleCheckout = useCallback((minutes: number) => {
    const checkoutTime = new Date(Date.now() + minutes * 60 * 1000).toISOString()
    setScheduledCheckoutAt(checkoutTime)
    AsyncStorage.setItem(SCHEDULED_CHECKOUT_KEY, checkoutTime).catch(() => {})

    // Clear any existing timer
    if (scheduledTimerRef.current) {
      clearTimeout(scheduledTimerRef.current)
    }

    // Set timer
    scheduledTimerRef.current = setTimeout(async () => {
      if (isMountedRef.current) {
        await checkOut()
        setScheduledCheckoutAt(null)
        AsyncStorage.removeItem(SCHEDULED_CHECKOUT_KEY).catch(() => {})
      }
    }, minutes * 60 * 1000)
  }, [checkOut])

  /**
   * Clear scheduled checkout (on manual checkout or expiry)
   */
  const clearScheduledCheckout = useCallback(() => {
    if (scheduledTimerRef.current) {
      clearTimeout(scheduledTimerRef.current)
      scheduledTimerRef.current = null
    }
    setScheduledCheckoutAt(null)
    AsyncStorage.removeItem(SCHEDULED_CHECKOUT_KEY).catch(() => {})
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

  // Subscribe to realtime checkin changes so the header updates live
  useEffect(() => {
    if (!userId) return

    const channel = supabase
      .channel(`my-checkins-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_checkins',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          if (isMountedRef.current) {
            getActiveCheckin()
          }
        }
      )
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [userId, getActiveCheckin])

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

  // Fetch always-on tracking setting
  useEffect(() => {
    if (!userId) return
    const fetchTracking = async () => {
      try {
        const { data } = await supabase.rpc('get_tracking_settings')
        if (isMountedRef.current) {
          setHasAlwaysOnTracking(data?.always_on_tracking_enabled ?? false)
        }
      } catch {
        // Non-critical
      }
    }
    fetchTracking()
  }, [userId])

  // Restore scheduled checkout from AsyncStorage on mount and foreground
  useEffect(() => {
    const restoreScheduledCheckout = async () => {
      try {
        const stored = await AsyncStorage.getItem(SCHEDULED_CHECKOUT_KEY)
        if (!stored || !isMountedRef.current) return

        const checkoutTime = new Date(stored).getTime()
        const remaining = checkoutTime - Date.now()

        if (remaining <= 0) {
          // Already expired while app was closed — auto-checkout now
          await checkOut()
          await AsyncStorage.removeItem(SCHEDULED_CHECKOUT_KEY)
          setScheduledCheckoutAt(null)
        } else {
          setScheduledCheckoutAt(stored)
          if (scheduledTimerRef.current) clearTimeout(scheduledTimerRef.current)
          scheduledTimerRef.current = setTimeout(async () => {
            if (isMountedRef.current) {
              await checkOut()
              setScheduledCheckoutAt(null)
              AsyncStorage.removeItem(SCHEDULED_CHECKOUT_KEY).catch(() => {})
            }
          }, remaining)
        }
      } catch {
        // Non-critical
      }
    }

    restoreScheduledCheckout()

    // Also restore on foreground
    const handleAppState = (nextState: AppStateStatus) => {
      if (nextState === 'active') restoreScheduledCheckout()
    }
    const sub = AppState.addEventListener('change', handleAppState)
    return () => {
      sub.remove()
      if (scheduledTimerRef.current) clearTimeout(scheduledTimerRef.current)
    }
  }, [checkOut])

  // Clear scheduled checkout when user is no longer checked in
  useEffect(() => {
    if (!activeCheckin && scheduledCheckoutAt) {
      clearScheduledCheckout()
    }
  }, [activeCheckin, scheduledCheckoutAt, clearScheduledCheckout])

  const value: UseCheckinResult = useMemo(() => ({
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
    scheduledCheckoutAt,
    scheduleCheckout,
    hasAlwaysOnTracking,
  }), [activeCheckin, isCheckingIn, isCheckingOut, isLoading, error, checkIn, checkOut, getActiveCheckin, isCheckedInAt, clearError, scheduledCheckoutAt, scheduleCheckout, hasAlwaysOnTracking])

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
