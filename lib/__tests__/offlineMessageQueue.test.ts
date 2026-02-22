/**
 * Offline Message Queue Tests
 *
 * Tests corruption recovery, queue size limits, retry logic,
 * and edge cases for the offline message queue system.
 */

import AsyncStorage from '@react-native-async-storage/async-storage'
import {
  queueOfflineMessage,
  getQueuedMessages,
  removeFromQueue,
  updateQueuedMessage,
  clearOfflineQueue,
  processOfflineQueue,
  hasQueuedMessages,
  getQueuedMessageCount,
  getQueuedMessagesForConversation,
  type QueuedMessage,
  type SendMessageFunction,
} from '../offlineMessageQueue'
import { captureException } from '../sentry'
import { vi } from 'vitest'

// Mock dependencies
vi.mock('../sentry', () => ({
  captureException: vi.fn(),
}))

// Override the global AsyncStorage mock with an in-memory implementation
// so that setItem/getItem/removeItem/clear actually store data for these tests
const inMemoryStore: Record<string, string> = {}
vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: vi.fn((key: string) => Promise.resolve(inMemoryStore[key] ?? null)),
    setItem: vi.fn((key: string, value: string) => {
      inMemoryStore[key] = value
      return Promise.resolve()
    }),
    removeItem: vi.fn((key: string) => {
      delete inMemoryStore[key]
      return Promise.resolve()
    }),
    clear: vi.fn(() => {
      Object.keys(inMemoryStore).forEach((k) => delete inMemoryStore[k])
      return Promise.resolve()
    }),
    getAllKeys: vi.fn(() => Promise.resolve(Object.keys(inMemoryStore))),
    multiGet: vi.fn((keys: string[]) =>
      Promise.resolve(keys.map((k) => [k, inMemoryStore[k] ?? null]))
    ),
    multiSet: vi.fn((pairs: [string, string][]) => {
      pairs.forEach(([k, v]) => (inMemoryStore[k] = v))
      return Promise.resolve()
    }),
    multiRemove: vi.fn((keys: string[]) => {
      keys.forEach((k) => delete inMemoryStore[k])
      return Promise.resolve()
    }),
  },
}))

const OFFLINE_QUEUE_KEY = 'backtrack:offline_message_queue'
const MAX_QUEUE_SIZE = 100
const MAX_MESSAGE_AGE_MS = 24 * 60 * 60 * 1000 // 24 hours
const MAX_RETRY_ATTEMPTS = 5

describe('Offline Message Queue', () => {
  beforeEach(async () => {
    await AsyncStorage.clear()
    vi.clearAllMocks()
    // Re-initialize in-memory mock functions after clearAllMocks
    vi.mocked(AsyncStorage.getItem).mockImplementation((key: string) =>
      Promise.resolve(inMemoryStore[key] ?? null)
    )
    vi.mocked(AsyncStorage.setItem).mockImplementation((key: string, value: string) => {
      inMemoryStore[key] = value
      return Promise.resolve()
    })
    vi.mocked(AsyncStorage.removeItem).mockImplementation((key: string) => {
      delete inMemoryStore[key]
      return Promise.resolve()
    })
    vi.mocked(AsyncStorage.clear).mockImplementation(() => {
      Object.keys(inMemoryStore).forEach((k) => delete inMemoryStore[k])
      return Promise.resolve()
    })
    vi.mocked(AsyncStorage.getAllKeys).mockImplementation(() =>
      Promise.resolve(Object.keys(inMemoryStore))
    )
    vi.mocked(AsyncStorage.multiRemove).mockImplementation((keys: readonly string[]) => {
      ;(keys as string[]).forEach((k) => delete inMemoryStore[k])
      return Promise.resolve()
    })
  })

  afterEach(async () => {
    await AsyncStorage.clear()
  })

  // ============================================================================
  // CORRUPTION RECOVERY TESTS
  // ============================================================================

  describe('Corruption Recovery', () => {
    it('handles corrupted JSON gracefully without crashing', async () => {
      // Simulate corrupted AsyncStorage data
      await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, 'corrupted{invalid:json')

      const messages = await getQueuedMessages()

      expect(messages).toEqual([])
      expect(captureException).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          operation: 'safeParseQueue',
        })
      )
    })

    it('handles non-array JSON gracefully', async () => {
      // Store valid JSON but not an array
      await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify({ invalid: 'structure' }))

      const messages = await getQueuedMessages()

      expect(messages).toEqual([])
      expect(captureException).toHaveBeenCalled()
    })

    it('filters out invalid message structures', async () => {
      const validMessage: QueuedMessage = {
        id: 'msg-1',
        conversationId: 'conv-1',
        senderId: 'user-1',
        content: 'Valid message',
        queuedAt: Date.now(),
        attempts: 0,
      }

      const invalidMessages = [
        validMessage,
        { invalid: 'missing required fields' },
        { id: 123, content: 'wrong types' }, // id should be string
        null,
        undefined,
        'not an object',
      ]

      await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(invalidMessages))

      const messages = await getQueuedMessages()

      // Should only return the valid message
      expect(messages).toHaveLength(1)
      expect(messages[0]).toMatchObject({
        id: 'msg-1',
        content: 'Valid message',
      })
      expect(captureException).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('invalid messages'),
        }),
        expect.any(Object)
      )
    })

    it('clears corrupted data to prevent repeated failures', async () => {
      await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, 'totally-corrupted')

      await getQueuedMessages()

      // Verify corrupted data was cleared
      const stored = await AsyncStorage.getItem(OFFLINE_QUEUE_KEY)
      expect(stored).toBeNull()
    })
  })

  // ============================================================================
  // QUEUE SIZE LIMIT TESTS
  // ============================================================================

  describe('Queue Size Limits', () => {
    it('respects MAX_QUEUE_SIZE limit by removing oldest messages', async () => {
      // Fill queue to max capacity sequentially to avoid race conditions
      // (concurrent writes would overwrite each other in the in-memory mock)
      for (let i = 0; i < MAX_QUEUE_SIZE; i++) {
        await queueOfflineMessage({
          conversationId: 'conv-1',
          senderId: 'user-1',
          content: `Message ${i}`,
        })
      }

      let queue = await getQueuedMessages()
      expect(queue).toHaveLength(MAX_QUEUE_SIZE)

      // Add one more message (should remove oldest)
      await queueOfflineMessage({
        conversationId: 'conv-1',
        senderId: 'user-1',
        content: 'Message 100',
      })

      queue = await getQueuedMessages()
      expect(queue).toHaveLength(MAX_QUEUE_SIZE)

      // Verify newest message is in queue
      expect(queue.some((m) => m.content === 'Message 100')).toBe(true)

      // Verify oldest message was removed (Message 0 should be gone)
      expect(queue.some((m) => m.content === 'Message 0')).toBe(false)
    })

    it('handles queue size limit with concurrent additions', async () => {
      // Pre-fill queue to near capacity
      for (let i = 0; i < MAX_QUEUE_SIZE - 2; i++) {
        await queueOfflineMessage({
          conversationId: 'conv-1',
          senderId: 'user-1',
          content: `Pre-fill ${i}`,
        })
      }

      // Try to add 5 messages concurrently
      await Promise.all([
        queueOfflineMessage({
          conversationId: 'conv-1',
          senderId: 'user-1',
          content: 'Concurrent 1',
        }),
        queueOfflineMessage({
          conversationId: 'conv-1',
          senderId: 'user-1',
          content: 'Concurrent 2',
        }),
        queueOfflineMessage({
          conversationId: 'conv-1',
          senderId: 'user-1',
          content: 'Concurrent 3',
        }),
      ])

      const queue = await getQueuedMessages()
      expect(queue.length).toBeLessThanOrEqual(MAX_QUEUE_SIZE)
    })
  })

  // ============================================================================
  // EXPIRATION AND RETRY LIMIT TESTS
  // ============================================================================

  describe('Message Expiration', () => {
    it('filters out expired messages (older than 24 hours)', async () => {
      const now = Date.now()
      const expiredTime = now - MAX_MESSAGE_AGE_MS - 1000 // 1 second past expiry

      const messages = [
        {
          id: 'msg-old',
          conversationId: 'conv-1',
          senderId: 'user-1',
          content: 'Old message',
          queuedAt: expiredTime,
          attempts: 0,
        },
        {
          id: 'msg-new',
          conversationId: 'conv-1',
          senderId: 'user-1',
          content: 'New message',
          queuedAt: now - 1000, // 1 second ago
          attempts: 0,
        },
      ]

      await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(messages))

      const queue = await getQueuedMessages()

      expect(queue).toHaveLength(1)
      expect(queue[0].id).toBe('msg-new')
    })

    it('filters out messages that exceeded max retry attempts', async () => {
      const messages = [
        {
          id: 'msg-exhausted',
          conversationId: 'conv-1',
          senderId: 'user-1',
          content: 'Exhausted retries',
          queuedAt: Date.now(),
          attempts: MAX_RETRY_ATTEMPTS, // At max attempts
        },
        {
          id: 'msg-ok',
          conversationId: 'conv-1',
          senderId: 'user-1',
          content: 'Still has retries',
          queuedAt: Date.now(),
          attempts: MAX_RETRY_ATTEMPTS - 1,
        },
      ]

      await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(messages))

      const queue = await getQueuedMessages()

      expect(queue).toHaveLength(1)
      expect(queue[0].id).toBe('msg-ok')
    })

    it('automatically cleans expired and exhausted messages', async () => {
      const now = Date.now()
      const messages = [
        {
          id: 'msg-expired',
          conversationId: 'conv-1',
          senderId: 'user-1',
          content: 'Expired',
          queuedAt: now - MAX_MESSAGE_AGE_MS - 1,
          attempts: 0,
        },
        {
          id: 'msg-exhausted',
          conversationId: 'conv-1',
          senderId: 'user-1',
          content: 'Exhausted',
          queuedAt: now,
          attempts: MAX_RETRY_ATTEMPTS,
        },
        {
          id: 'msg-valid',
          conversationId: 'conv-1',
          senderId: 'user-1',
          content: 'Valid',
          queuedAt: now,
          attempts: 1,
        },
      ]

      await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(messages))

      await getQueuedMessages()

      // Check storage was updated with cleaned list
      const stored = await AsyncStorage.getItem(OFFLINE_QUEUE_KEY)
      const parsedQueue = JSON.parse(stored!)

      expect(parsedQueue).toHaveLength(1)
      expect(parsedQueue[0].id).toBe('msg-valid')
    })
  })

  // ============================================================================
  // QUEUE PROCESSING TESTS
  // ============================================================================

  describe('Queue Processing', () => {
    it('processes messages in chronological order (oldest first)', async () => {
      const processedOrder: string[] = []

      const sendFn: SendMessageFunction = async (_convId, _senderId, content) => {
        processedOrder.push(content)
        return { success: true }
      }

      // Queue messages with specific timestamps
      await AsyncStorage.setItem(
        OFFLINE_QUEUE_KEY,
        JSON.stringify([
          {
            id: 'msg-3',
            conversationId: 'conv-1',
            senderId: 'user-1',
            content: 'Third',
            queuedAt: Date.now() - 1000,
            attempts: 0,
          },
          {
            id: 'msg-1',
            conversationId: 'conv-1',
            senderId: 'user-1',
            content: 'First',
            queuedAt: Date.now() - 3000,
            attempts: 0,
          },
          {
            id: 'msg-2',
            conversationId: 'conv-1',
            senderId: 'user-1',
            content: 'Second',
            queuedAt: Date.now() - 2000,
            attempts: 0,
          },
        ])
      )

      await processOfflineQueue(sendFn)

      expect(processedOrder).toEqual(['First', 'Second', 'Third'])
    })

    it('removes successfully sent messages from queue', async () => {
      const sendFn: SendMessageFunction = async () => ({ success: true })

      await queueOfflineMessage({
        conversationId: 'conv-1',
        senderId: 'user-1',
        content: 'Test message',
      })

      const result = await processOfflineQueue(sendFn)

      expect(result.succeeded).toBe(1)
      expect(result.remaining).toBe(0)

      const queue = await getQueuedMessages()
      expect(queue).toHaveLength(0)
    })

    it('increments attempt count on failed messages', async () => {
      let attemptCount = 0
      const sendFn: SendMessageFunction = async () => {
        attemptCount++
        return { success: false, error: 'Network error' }
      }

      await queueOfflineMessage({
        conversationId: 'conv-1',
        senderId: 'user-1',
        content: 'Test message',
      })

      await processOfflineQueue(sendFn)

      const queue = await getQueuedMessages()
      expect(queue).toHaveLength(1)
      expect(queue[0].attempts).toBe(1)
      expect(queue[0].lastError).toBe('Network error')
    })

    it('returns accurate processing statistics', async () => {
      let callCount = 0
      const sendFn: SendMessageFunction = async (_convId, _senderId, content) => {
        callCount++
        // Fail every other message
        return { success: callCount % 2 === 0 }
      }

      // Queue 5 messages
      for (let i = 0; i < 5; i++) {
        await queueOfflineMessage({
          conversationId: 'conv-1',
          senderId: 'user-1',
          content: `Message ${i}`,
        })
      }

      const result = await processOfflineQueue(sendFn)

      expect(result.processed).toBe(5)
      expect(result.succeeded).toBe(2) // Even-indexed (0, 2, 4) succeed in our test
      expect(result.failed).toBe(3)
      expect(result.remaining).toBe(3) // Failed messages remain
    })
  })

  // ============================================================================
  // CONVERSATION FILTERING TESTS
  // ============================================================================

  describe('Conversation Filtering', () => {
    it('returns only messages for specific conversation', async () => {
      await queueOfflineMessage({
        conversationId: 'conv-1',
        senderId: 'user-1',
        content: 'Conv 1 Message 1',
      })
      await queueOfflineMessage({
        conversationId: 'conv-2',
        senderId: 'user-1',
        content: 'Conv 2 Message',
      })
      await queueOfflineMessage({
        conversationId: 'conv-1',
        senderId: 'user-1',
        content: 'Conv 1 Message 2',
      })

      const conv1Messages = await getQueuedMessagesForConversation('conv-1')

      expect(conv1Messages).toHaveLength(2)
      expect(conv1Messages.every((m) => m.conversationId === 'conv-1')).toBe(true)
    })
  })

  // ============================================================================
  // UTILITY FUNCTION TESTS
  // ============================================================================

  describe('Utility Functions', () => {
    it('hasQueuedMessages returns correct boolean', async () => {
      expect(await hasQueuedMessages()).toBe(false)

      await queueOfflineMessage({
        conversationId: 'conv-1',
        senderId: 'user-1',
        content: 'Test',
      })

      expect(await hasQueuedMessages()).toBe(true)
    })

    it('getQueuedMessageCount returns accurate count', async () => {
      expect(await getQueuedMessageCount()).toBe(0)

      await queueOfflineMessage({
        conversationId: 'conv-1',
        senderId: 'user-1',
        content: 'Test 1',
      })
      await queueOfflineMessage({
        conversationId: 'conv-1',
        senderId: 'user-1',
        content: 'Test 2',
      })

      expect(await getQueuedMessageCount()).toBe(2)
    })

    it('clearOfflineQueue removes all messages', async () => {
      await queueOfflineMessage({
        conversationId: 'conv-1',
        senderId: 'user-1',
        content: 'Test 1',
      })
      await queueOfflineMessage({
        conversationId: 'conv-1',
        senderId: 'user-1',
        content: 'Test 2',
      })

      await clearOfflineQueue()

      expect(await getQueuedMessageCount()).toBe(0)
      expect(await hasQueuedMessages()).toBe(false)
    })

    it('updateQueuedMessage updates message properties', async () => {
      const id = await queueOfflineMessage({
        conversationId: 'conv-1',
        senderId: 'user-1',
        content: 'Test',
      })

      await updateQueuedMessage(id, {
        attempts: 3,
        lastError: 'Network timeout',
      })

      const queue = await getQueuedMessages()
      expect(queue[0].attempts).toBe(3)
      expect(queue[0].lastError).toBe('Network timeout')
    })

    it('removeFromQueue removes specific message', async () => {
      const id1 = await queueOfflineMessage({
        conversationId: 'conv-1',
        senderId: 'user-1',
        content: 'Test 1',
      })
      const id2 = await queueOfflineMessage({
        conversationId: 'conv-1',
        senderId: 'user-1',
        content: 'Test 2',
      })

      await removeFromQueue(id1)

      const queue = await getQueuedMessages()
      expect(queue).toHaveLength(1)
      expect(queue[0].id).toBe(id2)
    })
  })

  // ============================================================================
  // EDGE CASE TESTS
  // ============================================================================

  describe('Edge Cases', () => {
    it('handles empty queue gracefully', async () => {
      const sendFn: SendMessageFunction = async () => ({ success: true })

      const result = await processOfflineQueue(sendFn)

      expect(result.processed).toBe(0)
      expect(result.succeeded).toBe(0)
      expect(result.failed).toBe(0)
      expect(result.remaining).toBe(0)
    })

    it('handles AsyncStorage errors gracefully', async () => {
      // Mock AsyncStorage to throw error
      vi.spyOn(AsyncStorage, 'getItem').mockRejectedValueOnce(new Error('Storage error'))

      const messages = await getQueuedMessages()

      expect(messages).toEqual([])
      expect(captureException).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Storage error' }),
        expect.any(Object)
      )
    })

    it('generates unique message IDs', async () => {
      const id1 = await queueOfflineMessage({
        conversationId: 'conv-1',
        senderId: 'user-1',
        content: 'Test 1',
      })
      const id2 = await queueOfflineMessage({
        conversationId: 'conv-1',
        senderId: 'user-1',
        content: 'Test 2',
      })

      expect(id1).not.toBe(id2)
      expect(id1).toMatch(/^offline-\d+-[a-z0-9]+$/)
      expect(id2).toMatch(/^offline-\d+-[a-z0-9]+$/)
    })

    it('handles send function exceptions without crashing', async () => {
      const sendFn: SendMessageFunction = async () => {
        throw new Error('Network crashed')
      }

      await queueOfflineMessage({
        conversationId: 'conv-1',
        senderId: 'user-1',
        content: 'Test',
      })

      const result = await processOfflineQueue(sendFn)

      expect(result.failed).toBe(1)
      expect(result.succeeded).toBe(0)

      const queue = await getQueuedMessages()
      expect(queue[0].lastError).toBe('Network crashed')
      expect(queue[0].attempts).toBe(1)
    })
  })
})
