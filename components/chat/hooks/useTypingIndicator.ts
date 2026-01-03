'use client'

/**
 * useTypingIndicator Hook
 *
 * Custom hook for managing typing indicator state including:
 * - Broadcasting typing state to the channel
 * - Debouncing typing events to avoid spam
 * - Listening for other user's typing state
 * - Auto-clearing typing indicator after timeout
 *
 * This hook extracts the typing indicator logic from ChatScreen
 * for better separation of concerns and reusability.
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../../../lib/supabase'
import type { UUID } from '../../../types/database'
import type { UseTypingIndicatorReturn } from '../../../types/chat'
import { CHAT_CONSTANTS } from '../../../types/chat'

/**
 * Payload structure for typing broadcast events
 */
interface TypingPayload {
  userId: UUID
  isTyping: boolean
}

/**
 * Options for the useTypingIndicator hook
 */
export interface UseTypingIndicatorOptions {
  /** The conversation ID for the typing channel */
  conversationId: UUID
  /** The current user's ID (used for filtering own events) */
  currentUserId: UUID
  /** Optional callback when typing state changes */
  onTypingChange?: (isTyping: boolean) => void
}

/**
 * useTypingIndicator - Hook for managing typing indicator state and broadcasts
 *
 * @param options - Configuration options for the hook
 * @returns Object containing typing state and broadcast function
 *
 * @example
 * ```tsx
 * const { isOtherUserTyping, broadcastTyping } = useTypingIndicator({
 *   conversationId: 'conv-123',
 *   currentUserId: 'user-456',
 * })
 *
 * // Call broadcastTyping when user is typing
 * const handleInputChange = (e) => {
 *   setMessageInput(e.target.value)
 *   broadcastTyping()
 * }
 *
 * // Display typing indicator based on isOtherUserTyping
 * {isOtherUserTyping && <TypingIndicator isTyping={true} />}
 * ```
 */
export function useTypingIndicator({
  conversationId,
  currentUserId,
  onTypingChange,
}: UseTypingIndicatorOptions): UseTypingIndicatorReturn {
  // supabase imported from lib/supabase

  // ============================================================================
  // State
  // ============================================================================

  /** Whether the other user is currently typing */
  const [isOtherUserTyping, setIsOtherUserTyping] = useState(false)

  // ============================================================================
  // Refs
  // ============================================================================

  /** Timestamp of last typing broadcast (for debouncing) */
  const lastTypingBroadcastRef = useRef<number>(0)

  /** Timeout for auto-clearing typing indicator */
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  /** Reference to the Supabase channel for broadcasting */
  const broadcastChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  // ============================================================================
  // Internal Helpers
  // ============================================================================

  /**
   * Update typing state and notify via callback
   */
  const updateTypingState = useCallback(
    (isTyping: boolean) => {
      setIsOtherUserTyping(isTyping)
      if (onTypingChange) {
        onTypingChange(isTyping)
      }
    },
    [onTypingChange]
  )

  /**
   * Clear the typing timeout
   */
  const clearTypingTimeout = useCallback(() => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
      typingTimeoutRef.current = null
    }
  }, [])

  /**
   * Reset the auto-clear timeout
   * Clears typing indicator after TYPING_TIMEOUT_MS of inactivity
   */
  const resetTypingTimeout = useCallback(() => {
    clearTypingTimeout()
    typingTimeoutRef.current = setTimeout(() => {
      updateTypingState(false)
    }, CHAT_CONSTANTS.TYPING_TIMEOUT_MS)
  }, [clearTypingTimeout, updateTypingState])

  // ============================================================================
  // Public API
  // ============================================================================

  /**
   * Broadcast that the current user is typing
   * Debounced to avoid flooding the channel with events
   */
  const broadcastTyping = useCallback(() => {
    const now = Date.now()

    // Debounce: only broadcast if enough time has passed since last broadcast
    if (now - lastTypingBroadcastRef.current < CHAT_CONSTANTS.TYPING_DEBOUNCE_MS) {
      return
    }

    lastTypingBroadcastRef.current = now

    // Get or create the broadcast channel
    if (!broadcastChannelRef.current) {
      broadcastChannelRef.current = supabase.channel(`typing:${conversationId}`)
    }

    // Send typing broadcast
    broadcastChannelRef.current.send({
      type: 'broadcast',
      event: 'typing',
      payload: {
        userId: currentUserId,
        isTyping: true,
      } as TypingPayload,
    })
  }, [conversationId, currentUserId, supabase])

  // ============================================================================
  // Effects
  // ============================================================================

  /**
   * Effect: Subscribe to typing events from other users
   */
  useEffect(() => {
    const channel = supabase
      .channel(`typing:${conversationId}`)
      .on('broadcast', { event: 'typing' }, (payload) => {
        const typingPayload = payload.payload as TypingPayload

        // Ignore our own typing events
        if (typingPayload.userId === currentUserId) {
          return
        }

        // Update typing state based on received event
        if (typingPayload.isTyping) {
          updateTypingState(true)
          resetTypingTimeout()
        } else {
          updateTypingState(false)
          clearTypingTimeout()
        }
      })
      .subscribe()

    // Store channel reference for broadcasting
    broadcastChannelRef.current = channel

    return () => {
      supabase.removeChannel(channel)
      clearTypingTimeout()
      broadcastChannelRef.current = null
    }
  }, [
    conversationId,
    currentUserId,
    supabase,
    updateTypingState,
    resetTypingTimeout,
    clearTypingTimeout,
  ])

  /**
   * Effect: Cleanup typing timeout on unmount
   */
  useEffect(() => {
    return () => {
      clearTypingTimeout()
    }
  }, [clearTypingTimeout])

  // ============================================================================
  // Return
  // ============================================================================

  return {
    isOtherUserTyping,
    broadcastTyping,
  }
}

export default useTypingIndicator
