/**
 * useCanMatch Hook
 *
 * Custom hook for checking if a user can respond to/match with a post.
 * User must be either a Regular at the post's location OR have checked in
 * within 24 hours of the post's sighting time.
 *
 * @example
 * ```tsx
 * function MatchButton({ postId }: { postId: string }) {
 *   const { canMatch, reason, isLoading, checkPermission } = useCanMatch(postId)
 *
 *   const handlePress = async () => {
 *     const result = await checkPermission()
 *     if (result.canMatch) {
 *       navigation.navigate('Match', { postId })
 *     } else {
 *       Alert.alert('Cannot Match', result.reason)
 *     }
 *   }
 *
 *   return (
 *     <Button onPress={handlePress} disabled={isLoading}>
 *       That's Me!
 *     </Button>
 *   )
 * }
 * ```
 */

import { useState, useCallback, useEffect, useRef } from 'react'

import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import type { CanMatchResult } from '../types/database'

// ============================================================================
// TYPES
// ============================================================================

/**
 * Options for useCanMatch hook
 */
export interface UseCanMatchOptions {
  /** Whether to check permission on mount (default: true) */
  autoCheck?: boolean
}

/**
 * Return value from useCanMatch hook
 */
export interface UseCanMatchResult {
  /** Whether user can match/respond to this post */
  canMatch: boolean
  /** Human-readable reason if cannot match */
  reason: string | null
  /** Whether user is a Regular at the post's location */
  isRegular: boolean
  /** Whether user has a matching check-in */
  hasMatchingCheckin: boolean
  /** Name of the location */
  locationName: string | null
  /** Whether check is in progress */
  isLoading: boolean
  /** Whether check is being performed */
  isChecking: boolean
  /** Any error that occurred */
  error: string | null
  /** Check permission (can be called manually) */
  checkPermission: () => Promise<CanMatchResult>
  /** Refresh (alias for checkPermission) */
  refetch: () => Promise<void>
}

// ============================================================================
// HOOK IMPLEMENTATION
// ============================================================================

/**
 * Hook for checking if user can match/respond to a post
 */
export function useCanMatch(
  postId: string | null,
  options: UseCanMatchOptions = {}
): UseCanMatchResult {
  const { autoCheck = true } = options
  const { userId, isAuthenticated } = useAuth()

  // State
  const [canMatch, setCanMatch] = useState(false)
  const [reason, setReason] = useState<string | null>(null)
  const [isRegular, setIsRegular] = useState(false)
  const [hasMatchingCheckin, setHasMatchingCheckin] = useState(false)
  const [locationName, setLocationName] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isChecking, setIsChecking] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Refs
  const isMountedRef = useRef(true)

  /**
   * Check if user can match the post
   */
  const checkPermission = useCallback(async (): Promise<CanMatchResult> => {
    const defaultResult: CanMatchResult = {
      can_match: false,
      reason: 'Post not specified',
      is_regular: false,
      has_matching_checkin: false,
    }

    if (!postId) {
      setCanMatch(false)
      setReason('Post not specified')
      setIsRegular(false)
      setHasMatchingCheckin(false)
      setIsLoading(false)
      return defaultResult
    }

    if (!isAuthenticated || !userId) {
      const result: CanMatchResult = {
        can_match: false,
        reason: 'You must be logged in to respond to a post',
        is_regular: false,
        has_matching_checkin: false,
      }
      setCanMatch(false)
      setReason(result.reason)
      setIsRegular(false)
      setHasMatchingCheckin(false)
      setIsLoading(false)
      return result
    }

    setIsChecking(true)
    setError(null)

    try {
      const { data, error: rpcError } = await supabase.rpc('can_match_post', {
        p_user_id: userId,
        p_post_id: postId,
      })

      if (rpcError) {
        const result: CanMatchResult = {
          can_match: false,
          reason: rpcError.message,
          is_regular: false,
          has_matching_checkin: false,
        }
        if (isMountedRef.current) {
          setError(rpcError.message)
          setCanMatch(false)
          setReason(rpcError.message)
        }
        return result
      }

      const result: CanMatchResult = {
        can_match: data?.can_match ?? false,
        reason: data?.reason ?? null,
        is_regular: data?.is_regular ?? false,
        has_matching_checkin: data?.has_matching_checkin ?? false,
        location_name: data?.location_name ?? null,
      }

      if (isMountedRef.current) {
        setCanMatch(result.can_match)
        setReason(result.reason)
        setIsRegular(result.is_regular)
        setHasMatchingCheckin(result.has_matching_checkin)
        setLocationName(result.location_name ?? null)
      }

      return result
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to check permission'
      const result: CanMatchResult = {
        can_match: false,
        reason: errorMessage,
        is_regular: false,
        has_matching_checkin: false,
      }
      if (isMountedRef.current) {
        setError(errorMessage)
        setCanMatch(false)
        setReason(errorMessage)
      }
      return result
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false)
        setIsChecking(false)
      }
    }
  }, [postId, isAuthenticated, userId])

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
    canMatch,
    reason,
    isRegular,
    hasMatchingCheckin,
    locationName,
    isLoading,
    isChecking,
    error,
    checkPermission,
    refetch,
  }
}

export default useCanMatch
