/**
 * useCanPost Hook
 *
 * Custom hook for checking if a user can create a post at a location.
 * User must be either a Regular at the location OR have checked in within 12 hours.
 *
 * @example
 * ```tsx
 * function PostButton({ locationId }: { locationId: string }) {
 *   const { canPost, reason, isLoading, checkPermission } = useCanPost(locationId)
 *
 *   const handlePress = async () => {
 *     const result = await checkPermission()
 *     if (result.canPost) {
 *       navigation.navigate('CreatePost', { locationId })
 *     } else {
 *       Alert.alert('Cannot Post', result.reason)
 *     }
 *   }
 *
 *   return (
 *     <Button onPress={handlePress} disabled={isLoading}>
 *       Create Post
 *     </Button>
 *   )
 * }
 * ```
 */

import { useState, useCallback, useEffect, useRef } from 'react'

import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import type { CanPostResult } from '../types/database'

// ============================================================================
// TYPES
// ============================================================================

/**
 * Options for useCanPost hook
 */
export interface UseCanPostOptions {
  /** Whether to check permission on mount (default: true) */
  autoCheck?: boolean
}

/**
 * Return value from useCanPost hook
 */
export interface UseCanPostResult {
  /** Whether user can post at this location */
  canPost: boolean
  /** Human-readable reason if cannot post */
  reason: string | null
  /** Whether user is a Regular at this location */
  isRegular: boolean
  /** Whether user has a recent check-in */
  hasRecentCheckin: boolean
  /** Name of the location */
  locationName: string | null
  /** Whether check is in progress */
  isLoading: boolean
  /** Whether check is being performed */
  isChecking: boolean
  /** Any error that occurred */
  error: string | null
  /** Check permission (can be called manually) */
  checkPermission: () => Promise<CanPostResult>
  /** Refresh (alias for checkPermission) */
  refetch: () => Promise<void>
}

// ============================================================================
// HOOK IMPLEMENTATION
// ============================================================================

/**
 * Hook for checking if user can post at a location
 */
export function useCanPost(
  locationId: string | null,
  options: UseCanPostOptions = {}
): UseCanPostResult {
  const { autoCheck = true } = options
  const { userId, isAuthenticated } = useAuth()

  // State
  const [canPost, setCanPost] = useState(false)
  const [reason, setReason] = useState<string | null>(null)
  const [isRegular, setIsRegular] = useState(false)
  const [hasRecentCheckin, setHasRecentCheckin] = useState(false)
  const [locationName, setLocationName] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isChecking, setIsChecking] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Refs
  const isMountedRef = useRef(true)

  /**
   * Check if user can post at location
   */
  const checkPermission = useCallback(async (): Promise<CanPostResult> => {
    const defaultResult: CanPostResult = {
      can_post: false,
      reason: 'Location not specified',
      is_regular: false,
      has_recent_checkin: false,
    }

    if (!locationId) {
      setCanPost(false)
      setReason('Location not specified')
      setIsRegular(false)
      setHasRecentCheckin(false)
      setIsLoading(false)
      return defaultResult
    }

    if (!isAuthenticated || !userId) {
      const result: CanPostResult = {
        can_post: false,
        reason: 'You must be logged in to create a post',
        is_regular: false,
        has_recent_checkin: false,
      }
      setCanPost(false)
      setReason(result.reason)
      setIsRegular(false)
      setHasRecentCheckin(false)
      setIsLoading(false)
      return result
    }

    setIsChecking(true)
    setError(null)

    try {
      const { data, error: rpcError } = await supabase.rpc('can_post_to_location', {
        p_user_id: userId,
        p_location_id: locationId,
      })

      if (rpcError) {
        const result: CanPostResult = {
          can_post: false,
          reason: rpcError.message,
          is_regular: false,
          has_recent_checkin: false,
        }
        if (isMountedRef.current) {
          setError(rpcError.message)
          setCanPost(false)
          setReason(rpcError.message)
        }
        return result
      }

      const result: CanPostResult = {
        can_post: data?.can_post ?? false,
        reason: data?.reason ?? null,
        is_regular: data?.is_regular ?? false,
        has_recent_checkin: data?.has_recent_checkin ?? false,
        location_name: data?.location_name ?? null,
      }

      if (isMountedRef.current) {
        setCanPost(result.can_post)
        setReason(result.reason)
        setIsRegular(result.is_regular)
        setHasRecentCheckin(result.has_recent_checkin)
        setLocationName(result.location_name ?? null)
      }

      return result
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to check permission'
      const result: CanPostResult = {
        can_post: false,
        reason: errorMessage,
        is_regular: false,
        has_recent_checkin: false,
      }
      if (isMountedRef.current) {
        setError(errorMessage)
        setCanPost(false)
        setReason(errorMessage)
      }
      return result
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false)
        setIsChecking(false)
      }
    }
  }, [locationId, isAuthenticated, userId])

  /**
   * Refresh alias
   */
  const refetch = useCallback(async () => {
    setIsLoading(true)
    await checkPermission()
  }, [checkPermission])

  // Auto-check on mount/change
  useEffect(() => {
    isMountedRef.current = true

    if (autoCheck) {
      checkPermission()
    } else {
      setIsLoading(false)
    }

    return () => {
      isMountedRef.current = false
    }
  }, [autoCheck, checkPermission])

  return {
    canPost,
    reason,
    isRegular,
    hasRecentCheckin,
    locationName,
    isLoading,
    isChecking,
    error,
    checkPermission,
    refetch,
  }
}

export default useCanPost
