'use client'

/**
 * useSendMessage Hook
 *
 * Custom hook for sending chat messages with optimistic updates including:
 * - Optimistically adding messages to the UI immediately
 * - Sending messages to Supabase
 * - Handling success confirmation
 * - Rolling back on error with user feedback
 * - Tracking sending state for UI feedback
 * - Retry functionality for failed messages
 * - Delete functionality for failed messages
 *
 * This hook extracts the message sending logic from ChatScreen
 * for better separation of concerns and reusability.
 */

import { useState, useCallback, useRef } from 'react'
import { createClient } from '../../../lib/supabase/client'
import type { UUID } from '../../../types/database'
import type {
  OptimisticMessage,
  UseSendMessageReturn,
  MessageWithSender,
} from '../../../types/chat'
import { generateOptimisticId } from '../utils/formatters'

/**
 * Options for the useSendMessage hook
 */
export interface UseSendMessageOptions {
  /** The conversation ID to send messages to */
  conversationId: UUID
  /** The current user's ID (sender) */
  currentUserId: UUID
  /** Callback when a message is successfully sent (for adding to message list) */
  onMessageSent?: (message: MessageWithSender) => void
  /** Callback when a message send fails */
  onError?: (error: string, messageId: string) => void
}

/**
 * useSendMessage - Hook for sending messages with optimistic updates
 *
 * @param options - Configuration options for the hook
 * @returns Object containing sending state, optimistic messages, and control functions
 *
 * @example
 * ```tsx
 * const {
 *   isSending,
 *   optimisticMessages,
 *   sendMessage,
 *   retryMessage,
 *   deleteFailedMessage,
 * } = useSendMessage({
 *   conversationId: 'conv-123',
 *   currentUserId: 'user-456',
 *   onMessageSent: (message) => addMessage(message),
 * })
 * ```
 */
export function useSendMessage({
  conversationId,
  currentUserId,
  onMessageSent,
  onError,
}: UseSendMessageOptions): UseSendMessageReturn {
  const supabase = createClient()

  // ============================================================================
  // State
  // ============================================================================

  /** Whether a message is currently being sent */
  const [isSending, setIsSending] = useState(false)

  /** Array of optimistic messages (messages being sent or failed) */
  const [optimisticMessages, setOptimisticMessages] = useState<OptimisticMessage[]>([])

  // ============================================================================
  // Refs
  // ============================================================================

  /** Track ongoing send operations to prevent duplicate sends */
  const pendingOperationsRef = useRef<Set<string>>(new Set())

  // ============================================================================
  // Internal Helpers
  // ============================================================================

  /**
   * Add an optimistic message to the list
   */
  const addOptimisticMessage = useCallback(
    (content: string): OptimisticMessage => {
      const optimisticId = generateOptimisticId()
      const optimisticMessage: OptimisticMessage = {
        id: optimisticId,
        content,
        sender_id: currentUserId,
        created_at: new Date().toISOString(),
        status: 'sending',
      }

      setOptimisticMessages((prev) => [...prev, optimisticMessage])
      return optimisticMessage
    },
    [currentUserId]
  )

  /**
   * Update the status of an optimistic message
   */
  const updateOptimisticStatus = useCallback(
    (messageId: string, status: OptimisticMessage['status']) => {
      setOptimisticMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, status } : m))
      )
    },
    []
  )

  /**
   * Remove an optimistic message from the list
   */
  const removeOptimisticMessage = useCallback((messageId: string) => {
    setOptimisticMessages((prev) => prev.filter((m) => m.id !== messageId))
  }, [])

  /**
   * Send a message to Supabase and handle the result
   */
  const sendToSupabase = useCallback(
    async (content: string, optimisticId: string): Promise<MessageWithSender | null> => {
      try {
        const { data, error: sendError } = await supabase
          .from('messages')
          .insert({
            conversation_id: conversationId,
            sender_id: currentUserId,
            content,
          })
          .select(
            `
            *,
            sender:profiles!sender_id(*)
          `
          )
          .single()

        if (sendError) {
          throw sendError
        }

        return data as MessageWithSender
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to send message'
        throw new Error(errorMessage)
      }
    },
    [conversationId, currentUserId, supabase]
  )

  // ============================================================================
  // Public API
  // ============================================================================

  /**
   * Send a new message
   * - Optimistically adds the message to the UI
   * - Sends to Supabase
   * - Updates status on success/failure
   *
   * @param content - The message content to send
   */
  const sendMessage = useCallback(
    async (content: string): Promise<void> => {
      // Validate content
      const trimmedContent = content.trim()
      if (!trimmedContent) {
        return
      }

      // Create optimistic message
      const optimisticMessage = addOptimisticMessage(trimmedContent)
      const optimisticId = optimisticMessage.id

      // Track that we're sending
      setIsSending(true)
      pendingOperationsRef.current.add(optimisticId)

      try {
        // Send to Supabase
        const sentMessage = await sendToSupabase(trimmedContent, optimisticId)

        if (sentMessage) {
          // Remove optimistic message and notify about the real message
          removeOptimisticMessage(optimisticId)

          if (onMessageSent) {
            onMessageSent(sentMessage)
          }
        }
      } catch (err) {
        // Mark optimistic message as failed
        updateOptimisticStatus(optimisticId, 'failed')

        const errorMessage = err instanceof Error ? err.message : 'Failed to send message'
        if (onError) {
          onError(errorMessage, optimisticId)
        }
      } finally {
        pendingOperationsRef.current.delete(optimisticId)

        // Only set isSending to false if no other operations are pending
        if (pendingOperationsRef.current.size === 0) {
          setIsSending(false)
        }
      }
    },
    [addOptimisticMessage, onError, onMessageSent, removeOptimisticMessage, sendToSupabase, updateOptimisticStatus]
  )

  /**
   * Retry sending a failed message
   *
   * @param messageId - The optimistic message ID to retry
   */
  const retryMessage = useCallback(
    async (messageId: string): Promise<void> => {
      // Find the failed message
      const failedMessage = optimisticMessages.find(
        (m) => m.id === messageId && m.status === 'failed'
      )

      if (!failedMessage) {
        return
      }

      // Prevent duplicate retry attempts
      if (pendingOperationsRef.current.has(messageId)) {
        return
      }

      // Update status to sending
      updateOptimisticStatus(messageId, 'sending')
      pendingOperationsRef.current.add(messageId)
      setIsSending(true)

      try {
        // Send to Supabase
        const sentMessage = await sendToSupabase(failedMessage.content, messageId)

        if (sentMessage) {
          // Remove optimistic message and notify about the real message
          removeOptimisticMessage(messageId)

          if (onMessageSent) {
            onMessageSent(sentMessage)
          }
        }
      } catch (err) {
        // Mark as failed again
        updateOptimisticStatus(messageId, 'failed')

        const errorMessage = err instanceof Error ? err.message : 'Failed to send message'
        if (onError) {
          onError(errorMessage, messageId)
        }
      } finally {
        pendingOperationsRef.current.delete(messageId)

        // Only set isSending to false if no other operations are pending
        if (pendingOperationsRef.current.size === 0) {
          setIsSending(false)
        }
      }
    },
    [onError, onMessageSent, optimisticMessages, removeOptimisticMessage, sendToSupabase, updateOptimisticStatus]
  )

  /**
   * Delete a failed message from the optimistic list
   *
   * @param messageId - The optimistic message ID to delete
   */
  const deleteFailedMessage = useCallback(
    (messageId: string): void => {
      // Only allow deleting failed messages
      const message = optimisticMessages.find((m) => m.id === messageId)
      if (message && message.status === 'failed') {
        removeOptimisticMessage(messageId)
      }
    },
    [optimisticMessages, removeOptimisticMessage]
  )

  // ============================================================================
  // Return
  // ============================================================================

  return {
    isSending,
    optimisticMessages,
    sendMessage,
    retryMessage,
    deleteFailedMessage,
  }
}

export default useSendMessage
