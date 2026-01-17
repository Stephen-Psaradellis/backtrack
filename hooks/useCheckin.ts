/**
 * useCheckin Hook
 *
 * Custom hook for managing user check-ins at locations.
 * Handles GPS-verified check-ins, check-outs, and active check-in state.
 *
 * Features:
 * - Check in to a location with GPS verification (200m radius)
 * - Auto-checkout from other locations when checking in
 * - Get current active check-in
 * - Check out from a location
 *
 * @example
 * ```tsx
 * function LocationScreen({ locationId, locationName }) {
 *   const { activeCheckin, isCheckingIn, checkIn, checkOut, isCheckedInAt } = useCheckin()
 *
 *   const handlePress = async () => {
 *     if (isCheckedInAt(locationId)) {
 *       await checkOut(locationId)
 *     } else {
 *       await checkIn(locationId)
 *     }
 *   }
 *
 *   return (
 *     <Button onPress={handlePress} disabled={isCheckingIn}>
 *       {isCheckedInAt(locationId) ? 'Checked In' : 'Check In'}
 *     </Button>
 *   )
 * }
 * ```
 */

import { useState, useCallback, useEffect, useRef } from 'react'
import * as Location from 'expo-location'

import { supabase } from '../lib/supabase'
import type { ActiveCheckin } from '../types/database'

// ============================================================================
// TYPES
// ============================================================================

/**
 * GPS accuracy information from dynamic radius verification
 */
export interface AccuracyInfo {
  /** Reported GPS accuracy in meters */
  reported: number
  /** Accuracy status: 'excellent' | 'good' | 'fair' | 'poor' | 'suspicious' | 'defaulted' */
  status: 'excellent' | 'good' | 'fair' | 'poor' | 'suspicious' | 'defaulted' | 'unknown'
  /** Calculated accuracy buffer in meters */
  buffer: number
  /** Formula used for calculation (only on new check-ins) */
  formula?: string
}

/**
 * Result of a check-in operation
 */
export interface CheckinResult {
  success: boolean
  checkinId: string | null
  verified: boolean
  alreadyCheckedIn: boolean
  distanceMeters: number | null
  /** Effective verification radius used (dynamic based on accuracy) */
  effectiveRadius: number | null
  /** GPS accuracy information */
  accuracyInfo: AccuracyInfo | null
  error: string | null
}

/**
 * Result of a check-out operation
 */
export interface CheckoutResult {
  success: boolean
  checkouts: number
  error: string | null
}

/**
 * Return value from useCheckin hook
 */
export interface UseCheckinResult {
  /** Current active check-in (if any) */
  activeCheckin: ActiveCheckin | null
  /** Whether a check-in operation is in progress */
  isCheckingIn: boolean
  /** Whether a check-out operation is in progress */
  isCheckingOut: boolean
  /** Whether the initial fetch is loading */
  isLoading: boolean
  /** Last error message */
  error: string | null
  /** Check in to a location */
  checkIn: (locationId: string) => Promise<CheckinResult>
  /** Check out from a location (or all if no locationId) */
  checkOut: (locationId?: string) => Promise<CheckoutResult>
  /** Fetch the current active check-in */
  getActiveCheckin: () => Promise<void>
  /** Check if user is checked in at a specific location */
  isCheckedInAt: (locationId: string) => boolean
  /** Clear error state */
  clearError: () => void
}

// ============================================================================
// HOOK IMPLEMENTATION
// ============================================================================

/**
 * Hook for managing user check-ins at locations
 */
export function useCheckin(): UseCheckinResult {
  // State
  const [activeCheckin, setActiveCheckin] = useState<ActiveCheckin | null>(null)
  const [isCheckingIn, setIsCheckingIn] = useState(false)
  const [isCheckingOut, setIsCheckingOut] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Refs to prevent state updates after unmount
  const isMountedRef = useRef(true)

  /**
   * Fetch the current active check-in from the database
   */
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

  /**
   * Check in to a location with GPS verification
   */
  const checkIn = useCallback(async (locationId: string): Promise<CheckinResult> => {
    setIsCheckingIn(true)
    setError(null)

    try {
      // Request location permission
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

      // Get current location with high accuracy
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      })

      // Call the RPC function
      const { data, error: rpcError } = await supabase.rpc('checkin_to_location', {
        p_location_id: locationId,
        p_user_lat: location.coords.latitude,
        p_user_lon: location.coords.longitude,
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

      // Refresh active check-in state
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

  /**
   * Check out from a location (or all locations if no locationId)
   */
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
  }, [activeCheckin])

  /**
   * Check if user is checked in at a specific location
   */
  const isCheckedInAt = useCallback((locationId: string): boolean => {
    return activeCheckin?.location_id === locationId
  }, [activeCheckin])

  /**
   * Clear error state
   */
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

  return {
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
}
