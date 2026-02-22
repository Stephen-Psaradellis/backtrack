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

import { useState, useCallback, useRef, useEffect } from 'react'
import { supabase } from '../../../lib/supabase'
import { captureException } from '../../../lib/sentry'
import { trackEvent, AnalyticsEvent } from '../../../lib/analytics'
import {
  queueOfflineMessage,
  getQueuedMessagesForConversation,
  removeFromQueue,
  updateQueuedMessage,
  type QueuedMessage,
} from '../../../lib/offlineMessageQueue'
import type { UUID } from '../../../types/database'
import type {
  OptimisticMessage,
  UseSendMessageReturn,
  MessageWithSender,
} from '../../../types/chat'
import { generateOptimisticId } from '../utils/formatters'

// Message validation constants
const MAX_MESSAGE_LENGTH = 5000 // 5KB limit to prevent abuse
const MIN_MESSAGE_LENGTH = 1

// Rate limiting constants (client-side throttling)
const RATE_LIMIT_WINDOW_MS = 60 * 1000 // 1 minute
const RATE_LIMIT_MAX_PER_MINUTE = 20 // Max 20 messages per minute
const RATE_LIMIT_HOUR_WINDOW_MS = 60 * 60 * 1000 // 1 hour
const RATE_LIMIT_MAX_PER_HOUR = 200 // Max 200 messages per hour

// Network resilience constants
const REQUEST_TIMEOUT_MS = 15000 // 15 second timeout for API calls
const MAX_RETRY_ATTEMPTS = 3
const INITIAL_RETRY_DELAY_MS = 1000 // 1 second, doubles each retry

/**
 * Execute a promise with a timeout.
 * Rejects with TimeoutError if the promise doesn't resolve within timeoutMs.
 */
async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  operationName: string = 'Operation'
): Promise<T> {
  let timeoutId: NodeJS.Timeout | undefined

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`${operationName} timed out after ${timeoutMs}ms`))
    }, timeoutMs)
  })

  try {
    const result = await Promise.race([promise, timeoutPromise])
    if (timeoutId) clearTimeout(timeoutId)
    return result
  } catch (error) {
    if (timeoutId) clearTimeout(timeoutId)
    throw error
  }
}

/**
 * Execute a function with exponential backoff retry.
 */
async function withRetry<T>(
  fn: () => Promise<T>,
  maxAttempts: number = MAX_RETRY_ATTEMPTS,
  initialDelayMs: number = INITIAL_RETRY_DELAY_MS
): Promise<T> {
  let lastError: Error | undefined

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))

      // Don't retry on the last attempt
      if (attempt < maxAttempts - 1) {
        // Exponential backoff: 1s, 2s, 4s...
        const delayMs = initialDelayMs * Math.pow(2, attempt)
        await new Promise(resolve => setTimeout(resolve, delayMs))
      }
    }
  }

  throw lastError ?? new Error('All retry attempts failed')
}

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
  // supabase imported from lib/supabase

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

  /** Track if we've loaded queued messages */
  const hasLoadedQueueRef = useRef(false)

  /** Track message send timestamps for rate limiting */
  const sendTimestampsRef = useRef<number[]>([])

  // ============================================================================
  // Offline Queue Integration
  // ============================================================================

  /**
   * Load any previously queued messages for this conversation on mount
   */
  useEffect(() => {
    if (hasLoadedQueueRef.current || !conversationId || !currentUserId) {
      return
    }

    const loadQueuedMessages = async () => {
      try {
        const queued = await getQueuedMessagesForConversation(conversationId)
        if (queued.length > 0) {
          // Convert queued messages to optimistic messages with 'failed' status
          const restoredMessages: OptimisticMessage[] = queued.map((q) => ({
            id: q.id,
            content: q.content,
            sender_id: q.senderId,
            created_at: new Date(q.queuedAt).toISOString(),
            status: 'failed' as const,
          }))

          setOptimisticMessages((prev) => [...prev, ...restoredMessages])
        }
        hasLoadedQueueRef.current = true
      } catch (error) {
        // Non-critical: failed to load queued messages from offline storage
        if (__DEV__) {
          console.warn('[useSendMessage] Failed to load queued messages', error)
        }
      }
    }

    loadQueuedMessages()
  }, [conversationId, currentUserId])

  // ============================================================================
  // Internal Helpers
  // ============================================================================

  /**
   * Check database-side rate limit to prevent RLS policy blocks.
   * This provides better UX by catching limits before Supabase rejects the insert.
   */
  const checkDatabaseRateLimit = useCallback(async (): Promise<{
    allowed: boolean
    remaining: number
    resetIn: number
    message?: string
  }> => {
    try {
      const now = new Date()
      const oneMinuteAgo = new Date(now.getTime() - 60000)
      const oneHourAgo = new Date(now.getTime() - 3600000)

      // Check last minute (20 msg/min limit)
      const { count: minuteCount, error: minuteError } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('sender_id', currentUserId)
        .gte('created_at', oneMinuteAgo.toISOString())

      if (minuteError) throw minuteError

      if (minuteCount !== null && minuteCount >= RATE_LIMIT_MAX_PER_MINUTE) {
        return {
          allowed: false,
          remaining: 0,
          resetIn: 60 - Math.floor((now.getTime() - oneMinuteAgo.getTime()) / 1000),
          message: `Sending too fast! Please wait ${Math.ceil((60 - (now.getTime() - oneMinuteAgo.getTime()) / 1000))} seconds. (Limit: 20 messages/minute)`,
        }
      }

      // Check last hour (200 msg/hour limit)
      const { count: hourCount, error: hourError } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('sender_id', currentUserId)
        .gte('created_at', oneHourAgo.toISOString())

      if (hourError) throw hourError

      if (hourCount !== null && hourCount >= RATE_LIMIT_MAX_PER_HOUR) {
        const minutesRemaining = Math.ceil((60 - (now.getTime() - oneHourAgo.getTime()) / 60000))
        return {
          allowed: false,
          remaining: 0,
          resetIn: minutesRemaining * 60,
          message: `Hourly message limit reached. Please wait ${minutesRemaining} minutes. (Limit: 200 messages/hour)`,
        }
      }

      return {
        allowed: true,
        remaining: RATE_LIMIT_MAX_PER_MINUTE - (minuteCount ?? 0),
        resetIn: 0,
      }
    } catch (error) {
      // On error, allow (fail open) but track client-side and log
      captureException(error, { context: 'checkDatabaseRateLimit' })
      return {
        allowed: true,
        remaining: 0,
        resetIn: 0,
      }
    }
  }, [currentUserId, supabase])

  /**
   * Check if user has exceeded rate limit (client-side)
   * Returns { allowed: boolean, remaining: number, resetIn: number }
   */
  const checkRateLimit = useCallback((): {
    allowed: boolean
    remaining: number
    resetIn: number
    message?: string
  } => {
    const now = Date.now()
    const timestamps = sendTimestampsRef.current

    // Remove timestamps older than 1 hour
    sendTimestampsRef.current = timestamps.filter(
      (ts) => now - ts < RATE_LIMIT_HOUR_WINDOW_MS
    )

    // Check hourly limit
    const hourlyCount = sendTimestampsRef.current.length
    if (hourlyCount >= RATE_LIMIT_MAX_PER_HOUR) {
      const oldestTimestamp = Math.min(...sendTimestampsRef.current)
      const resetIn = RATE_LIMIT_HOUR_WINDOW_MS - (now - oldestTimestamp)
      return {
        allowed: false,
        remaining: 0,
        resetIn,
        message: `Rate limit exceeded. You can send ${RATE_LIMIT_MAX_PER_HOUR} messages per hour. Try again in ${Math.ceil(resetIn / 60000)} minutes.`,
      }
    }

    // Check per-minute limit
    const oneMinuteAgo = now - RATE_LIMIT_WINDOW_MS
    const recentCount = sendTimestampsRef.current.filter(
      (ts) => ts > oneMinuteAgo
    ).length

    if (recentCount >= RATE_LIMIT_MAX_PER_MINUTE) {
      const oldestInWindow = Math.min(
        ...sendTimestampsRef.current.filter((ts) => ts > oneMinuteAgo)
      )
      const resetIn = RATE_LIMIT_WINDOW_MS - (now - oldestInWindow)
      return {
        allowed: false,
        remaining: 0,
        resetIn,
        message: `Rate limit exceeded. You can send ${RATE_LIMIT_MAX_PER_MINUTE} messages per minute. Try again in ${Math.ceil(resetIn / 1000)} seconds.`,
      }
    }

    return {
      allowed: true,
      remaining: RATE_LIMIT_MAX_PER_MINUTE - recentCount,
      resetIn: 0,
    }
  }, [])

  /**
   * Record a message send for rate limiting
   */
  const recordMessageSend = useCallback(() => {
    sendTimestampsRef.current.push(Date.now())
  }, [])

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
   * Send a message to Supabase and handle the result.
   * Includes timeout protection and automatic retry with exponential backoff.
   */
  const sendToSupabase = useCallback(
    async (content: string, optimisticId: string): Promise<MessageWithSender | null> => {
      // Wrap the entire operation in retry logic
      return withRetry(
        async () => {
          // Add timeout to prevent hanging on poor network
          const result = await withTimeout(
            supabase
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
              .single(),
            REQUEST_TIMEOUT_MS,
            'Send message'
          )

          if (result.error) {
            throw result.error
          }

          return result.data as MessageWithSender
        },
        MAX_RETRY_ATTEMPTS,
        INITIAL_RETRY_DELAY_MS
      )
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
      if (!trimmedContent || trimmedContent.length < MIN_MESSAGE_LENGTH) {
        return
      }

      // Validate message length to prevent abuse
      if (trimmedContent.length > MAX_MESSAGE_LENGTH) {
        if (onError) {
          onError(`Message too long. Maximum ${MAX_MESSAGE_LENGTH} characters allowed.`, '')
        }
        return
      }

      // Check client-side rate limit first (fast)
      const clientRateLimitCheck = checkRateLimit()
      if (!clientRateLimitCheck.allowed) {
        if (onError && clientRateLimitCheck.message) {
          onError(clientRateLimitCheck.message, '')
        }
        return
      }

      // Check database rate limit to prevent RLS policy block (provides better error message)
      const dbRateLimitCheck = await checkDatabaseRateLimit()
      if (!dbRateLimitCheck.allowed) {
        if (onError && dbRateLimitCheck.message) {
          onError(dbRateLimitCheck.message, '')
        }
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
          // Record successful send for rate limiting
          recordMessageSend()

          // Track message sent (no content, just type)
          trackEvent(AnalyticsEvent.MESSAGE_SENT, { message_type: 'text' })

          // Remove optimistic message and notify about the real message
          removeOptimisticMessage(optimisticId)

          if (onMessageSent) {
            onMessageSent(sentMessage)
          }
        }
      } catch (err) {
        // Mark optimistic message as failed
        updateOptimisticStatus(optimisticId, 'failed')

        // Queue the message for offline persistence so it survives app crashes
        try {
          await queueOfflineMessage({
            conversationId,
            senderId: currentUserId,
            content: trimmedContent,
          })
        } catch (queueError) {
          // Non-critical: message is still in optimistic state for retry
          captureException(queueError, { context: 'queueOfflineMessage', optimisticId })
        }

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
    [
      addOptimisticMessage,
      checkRateLimit,
      checkDatabaseRateLimit,
      onError,
      onMessageSent,
      recordMessageSend,
      removeOptimisticMessage,
      sendToSupabase,
      updateOptimisticStatus,
    ]
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

          // Remove from offline queue if it was persisted
          try {
            await removeFromQueue(messageId)
          } catch (queueError) {
            // Non-critical: message was successfully sent to server
            if (__DEV__) {
              console.warn('[useSendMessage] Failed to remove from offline queue', queueError)
            }
          }

          if (onMessageSent) {
            onMessageSent(sentMessage)
          }
        }
      } catch (err) {
        // Mark as failed again
        updateOptimisticStatus(messageId, 'failed')

        // Update retry count in offline queue
        try {
          await updateQueuedMessage(messageId, {
            attempts: (failedMessage as OptimisticMessage & { attempts?: number }).attempts ?? 0 + 1,
          })
        } catch (queueError) {
          // Non-critical: offline queue update failed, retry still tracked in state
          if (__DEV__) {
            console.warn('[useSendMessage] Failed to update offline queue', queueError)
          }
        }

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
   * Delete a failed message from the optimistic list and offline queue
   *
   * @param messageId - The optimistic message ID to delete
   */
  const deleteFailedMessage = useCallback(
    async (messageId: string): Promise<void> => {
      // Only allow deleting failed messages
      const message = optimisticMessages.find((m) => m.id === messageId)
      if (message && message.status === 'failed') {
        removeOptimisticMessage(messageId)

        // Also remove from offline queue if persisted
        try {
          await removeFromQueue(messageId)
        } catch (queueError) {
          // Non-critical: message was deleted from UI, queue cleanup is secondary
          if (__DEV__) {
            console.warn('[useSendMessage] Failed to remove from offline queue', queueError)
          }
        }
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
