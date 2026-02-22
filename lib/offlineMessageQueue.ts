/**
 * Offline Message Queue
 *
 * Persists unsent messages to AsyncStorage so they survive app crashes
 * and restarts. Messages are automatically retried when the app starts
 * or when network connectivity is restored.
 *
 * @example
 * ```tsx
 * import {
 *   queueOfflineMessage,
 *   getQueuedMessages,
 *   removeFromQueue,
 *   processOfflineQueue
 * } from 'lib/offlineMessageQueue'
 *
 * // Queue a message when send fails
 * await queueOfflineMessage({
 *   conversationId: 'conv-123',
 *   senderId: 'user-456',
 *   content: 'Hello world',
 * })
 *
 * // Process queue when app starts or network restores
 * await processOfflineQueue(sendFunction)
 * ```
 */

import AsyncStorage from '@react-native-async-storage/async-storage'
import { captureException } from './sentry'

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Storage key for offline message queue
 */
const OFFLINE_QUEUE_KEY = 'backtrack:offline_message_queue'

/**
 * Maximum number of messages to store (prevent unlimited growth)
 */
const MAX_QUEUE_SIZE = 100

/**
 * Maximum age for queued messages (24 hours)
 */
const MAX_MESSAGE_AGE_MS = 24 * 60 * 60 * 1000

/**
 * Maximum retry attempts per message
 */
const MAX_RETRY_ATTEMPTS = 5

// ============================================================================
// TYPES
// ============================================================================

/**
 * Structure of a queued offline message
 */
export interface QueuedMessage {
  /** Unique ID for tracking */
  id: string
  /** Conversation ID */
  conversationId: string
  /** Sender user ID */
  senderId: string
  /** Message content */
  content: string
  /** When the message was queued */
  queuedAt: number
  /** Number of send attempts */
  attempts: number
  /** Last error message if any */
  lastError?: string
}

/**
 * Function signature for sending a message
 */
export type SendMessageFunction = (
  conversationId: string,
  senderId: string,
  content: string
) => Promise<{ success: boolean; error?: string }>

// ============================================================================
// STORAGE OPERATIONS
// ============================================================================

/**
 * Validate that a message object has the required structure
 */
function isValidQueuedMessage(msg: unknown): msg is QueuedMessage {
  if (!msg || typeof msg !== 'object') return false
  const m = msg as Record<string, unknown>
  return (
    typeof m.id === 'string' &&
    typeof m.conversationId === 'string' &&
    typeof m.senderId === 'string' &&
    typeof m.content === 'string' &&
    typeof m.queuedAt === 'number' &&
    typeof m.attempts === 'number'
  )
}

/**
 * Safely parse JSON with structural validation.
 * Returns empty array and clears corrupted data if parsing fails.
 */
async function safeParseQueue(stored: string): Promise<QueuedMessage[]> {
  try {
    const parsed = JSON.parse(stored)

    // Validate it's an array
    if (!Array.isArray(parsed)) {
      throw new Error('Queue data is not an array')
    }

    // Validate each message structure and filter invalid ones
    const validMessages: QueuedMessage[] = []
    const invalidCount = { count: 0 }

    for (const msg of parsed) {
      if (isValidQueuedMessage(msg)) {
        validMessages.push(msg)
      } else {
        invalidCount.count++
      }
    }

    // Log if we found invalid messages (data corruption indicator)
    if (invalidCount.count > 0) {
      captureException(new Error(`Found ${invalidCount.count} invalid messages in queue`), {
        operation: 'safeParseQueue',
        invalidCount: invalidCount.count,
        validCount: validMessages.length,
      })
    }

    return validMessages
  } catch (parseError) {
    // JSON parse failed - data is corrupted
    captureException(parseError, {
      operation: 'safeParseQueue',
      dataLength: stored.length,
      dataPreview: stored.substring(0, 100),
    })

    // Clear corrupted data to prevent repeated failures
    try {
      await AsyncStorage.removeItem(OFFLINE_QUEUE_KEY)
    } catch {
      // Best effort cleanup
    }

    return []
  }
}

/**
 * Get all queued messages from storage
 */
export async function getQueuedMessages(): Promise<QueuedMessage[]> {
  try {
    const stored = await AsyncStorage.getItem(OFFLINE_QUEUE_KEY)
    if (!stored) {
      return []
    }

    // Use safe parsing with validation
    const messages = await safeParseQueue(stored)

    if (messages.length === 0) {
      return []
    }

    // Filter out expired messages
    const now = Date.now()
    const validMessages = messages.filter(
      m => now - m.queuedAt < MAX_MESSAGE_AGE_MS && m.attempts < MAX_RETRY_ATTEMPTS
    )

    // If we filtered some out, save the cleaned list
    if (validMessages.length !== messages.length) {
      await saveQueue(validMessages)
    }

    return validMessages
  } catch (error) {
    captureException(error, { operation: 'getQueuedMessages' })
    return []
  }
}

/**
 * Save the message queue to storage
 */
async function saveQueue(messages: QueuedMessage[]): Promise<void> {
  try {
    await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(messages))
  } catch (error) {
    captureException(error, { operation: 'saveOfflineQueue' })
  }
}

/**
 * Queue a message for later sending
 */
export async function queueOfflineMessage(message: Omit<QueuedMessage, 'id' | 'queuedAt' | 'attempts'>): Promise<string> {
  try {
    const queue = await getQueuedMessages()

    // Check queue size limit
    if (queue.length >= MAX_QUEUE_SIZE) {
      // Remove oldest messages to make room
      queue.sort((a, b) => a.queuedAt - b.queuedAt)
      queue.splice(0, queue.length - MAX_QUEUE_SIZE + 1)
    }

    const id = `offline-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
    const queuedMessage: QueuedMessage = {
      ...message,
      id,
      queuedAt: Date.now(),
      attempts: 0,
    }

    queue.push(queuedMessage)
    await saveQueue(queue)

    return id
  } catch (error) {
    captureException(error, { operation: 'queueOfflineMessage' })
    throw error
  }
}

/**
 * Remove a message from the queue (after successful send or abandoning)
 */
export async function removeFromQueue(messageId: string): Promise<void> {
  try {
    const queue = await getQueuedMessages()
    const filtered = queue.filter(m => m.id !== messageId)
    await saveQueue(filtered)
  } catch (error) {
    captureException(error, { operation: 'removeFromQueue' })
  }
}

/**
 * Update a queued message (e.g., increment attempts, record error)
 */
export async function updateQueuedMessage(
  messageId: string,
  updates: Partial<Pick<QueuedMessage, 'attempts' | 'lastError'>>
): Promise<void> {
  try {
    const queue = await getQueuedMessages()
    const index = queue.findIndex(m => m.id === messageId)

    if (index !== -1) {
      queue[index] = { ...queue[index], ...updates }
      await saveQueue(queue)
    }
  } catch (error) {
    captureException(error, { operation: 'updateQueuedMessage' })
  }
}

/**
 * Get messages queued for a specific conversation
 */
export async function getQueuedMessagesForConversation(conversationId: string): Promise<QueuedMessage[]> {
  const queue = await getQueuedMessages()
  return queue.filter(m => m.conversationId === conversationId)
}

/**
 * Clear all queued messages
 */
export async function clearOfflineQueue(): Promise<void> {
  try {
    await AsyncStorage.removeItem(OFFLINE_QUEUE_KEY)
  } catch (error) {
    captureException(error, { operation: 'clearOfflineQueue' })
  }
}

// ============================================================================
// QUEUE PROCESSING
// ============================================================================

/**
 * Process the offline message queue
 *
 * Attempts to send all queued messages. Successfully sent messages
 * are removed from the queue. Failed messages have their attempt
 * count incremented.
 *
 * @param sendFn - Function to use for sending messages
 * @returns Object with counts of processed, successful, and failed messages
 */
export async function processOfflineQueue(
  sendFn: SendMessageFunction
): Promise<{
  processed: number
  succeeded: number
  failed: number
  remaining: number
}> {
  const queue = await getQueuedMessages()

  if (queue.length === 0) {
    return { processed: 0, succeeded: 0, failed: 0, remaining: 0 }
  }

  let succeeded = 0
  let failed = 0

  // Process messages in order (oldest first)
  const sortedQueue = [...queue].sort((a, b) => a.queuedAt - b.queuedAt)

  for (const message of sortedQueue) {
    try {
      const result = await sendFn(
        message.conversationId,
        message.senderId,
        message.content
      )

      if (result.success) {
        await removeFromQueue(message.id)
        succeeded++
      } else {
        await updateQueuedMessage(message.id, {
          attempts: message.attempts + 1,
          lastError: result.error || 'Send failed',
        })
        failed++
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      await updateQueuedMessage(message.id, {
        attempts: message.attempts + 1,
        lastError: errorMessage,
      })
      failed++
    }
  }

  // Get remaining count
  const remaining = await getQueuedMessages()

  return {
    processed: sortedQueue.length,
    succeeded,
    failed,
    remaining: remaining.length,
  }
}

/**
 * Check if there are any queued messages
 */
export async function hasQueuedMessages(): Promise<boolean> {
  const queue = await getQueuedMessages()
  return queue.length > 0
}

/**
 * Get count of queued messages
 */
export async function getQueuedMessageCount(): Promise<number> {
  const queue = await getQueuedMessages()
  return queue.length
}

export default {
  queueOfflineMessage,
  getQueuedMessages,
  getQueuedMessagesForConversation,
  removeFromQueue,
  updateQueuedMessage,
  clearOfflineQueue,
  processOfflineQueue,
  hasQueuedMessages,
  getQueuedMessageCount,
}
