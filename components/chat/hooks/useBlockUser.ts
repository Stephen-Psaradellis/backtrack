'use client'

/**
 * useBlockUser Hook
 *
 * Custom hook for blocking a user in a chat conversation including:
 * - Calling the block API endpoint (blocked_users table)
 * - Updating the conversation status to 'blocked'
 * - Handling loading and error states
 * - Providing callbacks for success and navigation
 *
 * This hook extracts the user blocking logic from ChatScreen
 * for better separation of concerns and reusability.
 */

import { useState, useCallback, useRef } from 'react'
import { createClient } from '../../../lib/supabase/client'
import type { UUID } from '../../../types/database'
import type { UseBlockUserReturn } from '../../../types/chat'

/**
 * Options for the useBlockUser hook
 */
export interface UseBlockUserOptions {
  /** The ID of the user performing the block (blocker) */
  currentUserId: UUID
  /** The ID of the user being blocked */
  targetUserId: UUID
  /** The conversation ID to update status on */
  conversationId: UUID
  /** Callback when user is successfully blocked */
  onSuccess?: (blockedUserId: UUID) => void
  /** Callback to navigate away after blocking */
  onNavigateAway?: () => void
  /** Callback when an error occurs */
  onError?: (error: string) => void
}

/**
 * useBlockUser - Hook for blocking users with API integration
 *
 * @param options - Configuration options for the hook
 * @returns Object containing blocking state and control function
 *
 * @example
 * ```tsx
 * const { isBlocking, error, blockUser } = useBlockUser({
 *   currentUserId: 'user-123',
 *   targetUserId: 'user-456',
 *   conversationId: 'conv-789',
 *   onSuccess: (blockedUserId) => {
 *     console.log(`User ${blockedUserId} has been blocked`)
 *   },
 *   onNavigateAway: () => navigation.goBack(),
 * })
 *
 * // Call blockUser when user confirms the block action
 * <button onClick={blockUser} disabled={isBlocking}>
 *   {isBlocking ? 'Blocking...' : 'Block User'}
 * </button>
 *
 * // Display error if any
 * {error && <p className="error">{error}</p>}
 * ```
 */
export function useBlockUser({
  currentUserId,
  targetUserId,
  conversationId,
  onSuccess,
  onNavigateAway,
  onError,
}: UseBlockUserOptions): UseBlockUserReturn {
  const supabase = createClient()

  // ============================================================================
  // State
  // ============================================================================

  /** Whether a block operation is in progress */
  const [isBlocking, setIsBlocking] = useState(false)

  /** Error message if the block operation fails */
  const [error, setError] = useState<string | null>(null)

  // ============================================================================
  // Refs
  // ============================================================================

  /** Prevent duplicate block operations */
  const isBlockingRef = useRef(false)

  // ============================================================================
  // Public API
  // ============================================================================

  /**
   * Block the target user
   *
   * This function:
   * 1. Inserts a record into the blocked_users table
   * 2. Updates the conversation status to 'blocked'
   * 3. Calls success/navigation callbacks on completion
   * 4. Sets error state if the operation fails
   */
  const blockUser = useCallback(async (): Promise<void> => {
    // Prevent duplicate block operations
    if (isBlockingRef.current || !targetUserId) {
      return
    }

    try {
      isBlockingRef.current = true
      setIsBlocking(true)
      setError(null)

      // Step 1: Insert into blocked_users table
      const { error: blockError } = await supabase
        .from('blocked_users')
        .insert({
          blocker_id: currentUserId,
          blocked_id: targetUserId,
        })

      if (blockError) {
        // Check for duplicate block attempt
        if (blockError.code === '23505') {
          // Unique constraint violation - user already blocked
          throw new Error('You have already blocked this user')
        }
        throw blockError
      }

      // Step 2: Update conversation status to 'blocked'
      const { error: updateError } = await supabase
        .from('conversations')
        .update({ status: 'blocked' })
        .eq('id', conversationId)

      if (updateError) {
        // Log but don't fail - the user is blocked even if conversation update fails
        console.warn('Failed to update conversation status:', updateError)
      }

      // Step 3: Call success callback
      if (onSuccess) {
        onSuccess(targetUserId)
      }

      // Step 4: Navigate away
      if (onNavigateAway) {
        onNavigateAway()
      }
    } catch (err) {
      const errorMessage = err instanceof Error
        ? err.message
        : 'Failed to block user. Please try again.'

      setError(errorMessage)

      if (onError) {
        onError(errorMessage)
      }
    } finally {
      isBlockingRef.current = false
      setIsBlocking(false)
    }
  }, [
    conversationId,
    currentUserId,
    onError,
    onNavigateAway,
    onSuccess,
    supabase,
    targetUserId,
  ])

  /**
   * Clear any existing error
   */
  const clearError = useCallback(() => {
    setError(null)
  }, [])

  // ============================================================================
  // Return
  // ============================================================================

  return {
    isBlocking,
    error,
    blockUser,
    clearError,
  }
}

export default useBlockUser
