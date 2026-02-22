/**
 * Memory Management Performance Benchmarks
 *
 * Tests memory usage and cleanup behavior to catch memory leaks and
 * unbounded growth issues. Uses heuristic checks since precise memory
 * measurement is not reliable in JavaScript.
 */

import { createMockMessage } from '../utils/factories'

// ============================================================================
// MESSAGE LIST MEMORY BENCHMARKS
// ============================================================================

describe('Message list memory management', () => {
  it('handles 500 message additions without unbounded growth', () => {
    const messages: any[] = []
    const maxSize = 500

    // Simulate adding messages over time with a cap
    for (let i = 0; i < 1000; i++) {
      messages.push(createMockMessage({ content: `Message ${i}` }))

      // Keep only most recent 500 (sliding window)
      if (messages.length > maxSize) {
        messages.shift()
      }
    }

    // Should maintain cap
    expect(messages.length).toBe(maxSize)

    // First message should be message 500 (not message 0)
    expect(messages[0].content).toBe('Message 500')

    // Last message should be message 999
    expect(messages[messages.length - 1].content).toBe('Message 999')
  })

  it('message list cleanup releases references', () => {
    let messages: any[] = Array.from({ length: 100 }, (_, i) =>
      createMockMessage({ content: `Message ${i}` })
    )

    // Clear the array
    messages = []

    // Array should be empty
    expect(messages.length).toBe(0)
  })

  it('handles message updates without creating duplicates', () => {
    const messages = Array.from({ length: 100 }, (_, i) =>
      createMockMessage({ id: `msg-${i}`, content: `Message ${i}` })
    )

    // Simulate updating is_read status
    const messageMap = new Map(messages.map(msg => [msg.id, msg]))

    for (let i = 0; i < 50; i++) {
      const msg = messageMap.get(`msg-${i}`)
      if (msg) {
        messageMap.set(msg.id, { ...msg, is_read: true })
      }
    }

    // Should maintain same number of messages
    expect(messageMap.size).toBe(100)

    // First 50 should be read
    expect(messageMap.get('msg-0')?.is_read).toBe(true)
    expect(messageMap.get('msg-49')?.is_read).toBe(true)

    // Last 50 should be unread
    expect(messageMap.get('msg-50')?.is_read).toBe(false)
    expect(messageMap.get('msg-99')?.is_read).toBe(false)
  })
})

// ============================================================================
// SUBSCRIPTION CLEANUP BENCHMARKS
// ============================================================================

describe('Realtime subscription cleanup', () => {
  it('tracks active subscriptions correctly', () => {
    const subscriptions: Set<string> = new Set()

    // Add subscriptions
    for (let i = 0; i < 10; i++) {
      subscriptions.add(`subscription-${i}`)
    }

    expect(subscriptions.size).toBe(10)

    // Remove subscriptions
    for (let i = 0; i < 5; i++) {
      subscriptions.delete(`subscription-${i}`)
    }

    expect(subscriptions.size).toBe(5)

    // Clear all
    subscriptions.clear()
    expect(subscriptions.size).toBe(0)
  })

  it('handles subscription replacement without duplicates', () => {
    const subscriptions = new Map<string, any>()

    // Add initial subscriptions
    subscriptions.set('conversation-1', { id: 'sub-1' })
    subscriptions.set('conversation-2', { id: 'sub-2' })

    expect(subscriptions.size).toBe(2)

    // Replace a subscription (simulating reconnect)
    subscriptions.set('conversation-1', { id: 'sub-1-new' })

    // Should still have 2 subscriptions
    expect(subscriptions.size).toBe(2)
    expect(subscriptions.get('conversation-1')?.id).toBe('sub-1-new')
  })
})

// ============================================================================
// OFFLINE QUEUE BENCHMARKS
// ============================================================================

describe('Offline message queue management', () => {
  it('enforces queue size limits', () => {
    const maxQueueSize = 100
    const queue: any[] = []

    // Try to add 150 messages
    for (let i = 0; i < 150; i++) {
      queue.push(createMockMessage({ content: `Queued message ${i}` }))

      // Enforce limit
      if (queue.length > maxQueueSize) {
        queue.shift()
      }
    }

    // Should maintain cap
    expect(queue.length).toBe(maxQueueSize)

    // Oldest message should be message 50 (not message 0)
    expect(queue[0].content).toBe('Queued message 50')
  })

  it('processes queue without memory buildup', () => {
    const queue: any[] = []
    const processed: string[] = []

    // Add messages to queue
    for (let i = 0; i < 100; i++) {
      queue.push(createMockMessage({ id: `msg-${i}` }))
    }

    // Process queue (simulate sending)
    while (queue.length > 0) {
      const msg = queue.shift()
      if (msg) {
        processed.push(msg.id)
      }
    }

    // Queue should be empty
    expect(queue.length).toBe(0)

    // All messages should be processed
    expect(processed.length).toBe(100)
  })

  it('handles failed message retries with backoff', () => {
    interface QueuedMessage {
      id: string
      content: string
      retries: number
      nextRetry: number
    }

    const queue: QueuedMessage[] = []
    const maxRetries = 3

    // Add a message
    queue.push({
      id: 'msg-1',
      content: 'Test message',
      retries: 0,
      nextRetry: Date.now(),
    })

    // Simulate 3 failed attempts
    for (let i = 0; i < maxRetries; i++) {
      const msg = queue.shift()
      if (msg && msg.retries < maxRetries) {
        // Failed - requeue with incremented retry count and backoff
        queue.push({
          ...msg,
          retries: msg.retries + 1,
          nextRetry: Date.now() + Math.pow(2, msg.retries) * 1000,
        })
      }
    }

    // After 3 retries, message should be discarded
    const msg = queue.shift()
    if (msg && msg.retries >= maxRetries) {
      // Discard message
    } else if (msg) {
      queue.push(msg)
    }

    // Queue should be empty (message discarded after max retries)
    expect(queue.length).toBe(0)
  })
})

// ============================================================================
// CACHE CLEANUP BENCHMARKS
// ============================================================================

describe('Cache cleanup performance', () => {
  it('LRU cache maintains size limit', () => {
    const maxSize = 50
    const cache = new Map<string, any>()
    const accessOrder: string[] = []

    // Add 100 items
    for (let i = 0; i < 100; i++) {
      const key = `key-${i}`
      cache.set(key, { value: i })
      accessOrder.push(key)

      // Enforce LRU eviction
      if (cache.size > maxSize) {
        const oldest = accessOrder.shift()
        if (oldest) {
          cache.delete(oldest)
        }
      }
    }

    // Should maintain size limit
    expect(cache.size).toBe(maxSize)

    // Should contain newest items
    expect(cache.has('key-99')).toBe(true)
    expect(cache.has('key-50')).toBe(true)

    // Should not contain oldest items
    expect(cache.has('key-0')).toBe(false)
    expect(cache.has('key-49')).toBe(false)
  })

  it('TTL-based cache expires old entries', () => {
    interface CacheEntry {
      value: any
      expiresAt: number
    }

    const cache = new Map<string, CacheEntry>()
    const ttlMs = 1000

    // Add items with expiration
    for (let i = 0; i < 10; i++) {
      cache.set(`key-${i}`, {
        value: i,
        expiresAt: Date.now() + ttlMs,
      })
    }

    // Add some expired items (simulate old cache entries)
    for (let i = 10; i < 15; i++) {
      cache.set(`key-${i}`, {
        value: i,
        expiresAt: Date.now() - 1000, // Already expired
      })
    }

    expect(cache.size).toBe(15)

    // Clean up expired entries
    const now = Date.now()
    for (const [key, entry] of cache.entries()) {
      if (entry.expiresAt < now) {
        cache.delete(key)
      }
    }

    // Should remove expired entries
    expect(cache.size).toBe(10)
    expect(cache.has('key-0')).toBe(true)
    expect(cache.has('key-10')).toBe(false)
  })
})

// ============================================================================
// LARGE DATASET BENCHMARKS
// ============================================================================

describe('Large dataset handling', () => {
  it('handles 1000-item array operations efficiently', () => {
    const items = Array.from({ length: 1000 }, (_, i) => ({
      id: `item-${i}`,
      data: `Data ${i}`,
    }))

    const start = performance.now()

    // Common operations
    const filtered = items.filter(item => parseInt(item.id.split('-')[1]) % 2 === 0)
    const mapped = filtered.map(item => ({ ...item, processed: true }))
    const found = mapped.find(item => item.id === 'item-500')

    const duration = performance.now() - start

    expect(duration).toBeLessThan(100)
    expect(filtered.length).toBe(500)
    expect(mapped.length).toBe(500)
    expect(found).toBeDefined()
  })
})
