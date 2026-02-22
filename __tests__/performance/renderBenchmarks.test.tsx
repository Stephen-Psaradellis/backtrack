/**
 * Component Render Performance Benchmarks
 *
 * Tests rendering performance of critical UI components to catch regressions.
 * Generous budgets are set at 2-3x expected values to avoid flaky failures.
 *
 * NOTE: Due to Vitest/React Native compatibility issues with Flow types,
 * we test render performance by measuring function execution time rather
 * than actual component mounting. This still catches performance regressions
 * in component logic.
 */

import { createMockPost, createMockMessage, createMockLocation } from '../utils/factories'
import { formatRelativeTime, truncateText, getMatchColor, getMatchLabel } from '../../components/PostCard'
import { formatMessageTime, formatMessageDate, getBubblePosition } from '../../components/ChatBubble'

// ============================================================================
// POSTCARD UTILITY FUNCTION BENCHMARKS
// ============================================================================

describe('PostCard utility function performance', () => {
  it('formatRelativeTime handles 1000 calls efficiently (<100ms)', () => {
    const timestamp = new Date().toISOString()

    const start = performance.now()
    for (let i = 0; i < 1000; i++) {
      formatRelativeTime(timestamp)
    }
    const duration = performance.now() - start

    expect(duration).toBeLessThan(100)
  })

  it('truncateText handles 1000 calls efficiently (<50ms)', () => {
    const longText = 'This is a very long text that needs to be truncated at some point because it exceeds the maximum length allowed for display in the UI component.'

    const start = performance.now()
    for (let i = 0; i < 1000; i++) {
      truncateText(longText, 120)
    }
    const duration = performance.now() - start

    expect(duration).toBeLessThan(50)
  })

  it('getMatchColor handles 10000 calls efficiently (<50ms)', () => {
    const start = performance.now()
    for (let i = 0; i < 10000; i++) {
      getMatchColor(Math.floor(Math.random() * 100))
    }
    const duration = performance.now() - start

    expect(duration).toBeLessThan(50)
  })

  it('getMatchLabel handles 10000 calls efficiently (<50ms)', () => {
    const start = performance.now()
    for (let i = 0; i < 10000; i++) {
      getMatchLabel(Math.floor(Math.random() * 100))
    }
    const duration = performance.now() - start

    expect(duration).toBeLessThan(50)
  })

  it('processes 100 posts efficiently (<200ms)', () => {
    const posts = Array.from({ length: 100 }, () => createMockPost())
    const location = createMockLocation()

    const start = performance.now()
    posts.forEach(post => {
      formatRelativeTime(post.created_at)
      truncateText(post.message, 120)
      getMatchColor(75)
    })
    const duration = performance.now() - start

    expect(duration).toBeLessThan(200)
  })
})

// ============================================================================
// CHATBUBBLE UTILITY FUNCTION BENCHMARKS
// ============================================================================

describe('ChatBubble utility function performance', () => {
  it('formatMessageTime handles 1000 calls efficiently (<300ms)', () => {
    const timestamp = new Date().toISOString()

    const start = performance.now()
    for (let i = 0; i < 1000; i++) {
      formatMessageTime(timestamp)
    }
    const duration = performance.now() - start

    // Generous budget - toLocaleTimeString can be slow in test environments
    expect(duration).toBeLessThan(300)
  })

  it('formatMessageDate handles 1000 calls efficiently (<100ms)', () => {
    const timestamp = new Date().toISOString()

    const start = performance.now()
    for (let i = 0; i < 1000; i++) {
      formatMessageDate(timestamp)
    }
    const duration = performance.now() - start

    expect(duration).toBeLessThan(100)
  })

  it('getBubblePosition handles 1000 calls efficiently (<100ms)', () => {
    const messages = Array.from({ length: 100 }, () => createMockMessage())
    const userId = 'test-user-id'

    const start = performance.now()
    for (let i = 0; i < 10; i++) {
      messages.forEach((_, index) => {
        getBubblePosition(messages, index, userId)
      })
    }
    const duration = performance.now() - start

    expect(duration).toBeLessThan(100)
  })

  it('processes 100 messages efficiently (<200ms)', () => {
    const messages = Array.from({ length: 100 }, () => createMockMessage())
    const userId = 'test-user-id'

    const start = performance.now()
    messages.forEach((msg, index) => {
      formatMessageTime(msg.created_at)
      formatMessageDate(msg.created_at)
      getBubblePosition(messages, index, userId)
    })
    const duration = performance.now() - start

    expect(duration).toBeLessThan(200)
  })
})

// ============================================================================
// DATE/TIME PROCESSING BENCHMARKS
// ============================================================================

describe('Date/time processing performance', () => {
  it('handles 1000 relative time calculations efficiently (<400ms)', () => {
    const timestamps = Array.from({ length: 1000 }, (_, i) => {
      const date = new Date()
      date.setMinutes(date.getMinutes() - i)
      return date.toISOString()
    })

    const start = performance.now()
    timestamps.forEach(ts => {
      formatRelativeTime(ts)
    })
    const duration = performance.now() - start

    // Generous budget to avoid flakiness under load
    expect(duration).toBeLessThan(400)
  })

  it('handles 1000 date formatting operations efficiently (<400ms)', () => {
    const timestamps = Array.from({ length: 1000 }, (_, i) => {
      const date = new Date()
      date.setDate(date.getDate() - i)
      return date.toISOString()
    })

    const start = performance.now()
    timestamps.forEach(ts => {
      formatMessageDate(ts)
    })
    const duration = performance.now() - start

    // Generous budget - locale date formatting can be slow in test environments
    expect(duration).toBeLessThan(400)
  })
})

// ============================================================================
// TEXT PROCESSING BENCHMARKS
// ============================================================================

describe('Text processing performance', () => {
  it('handles 1000 text truncations efficiently (<100ms)', () => {
    const texts = Array.from({ length: 1000 }, (_, i) =>
      `Message ${i}: Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.`
    )

    const start = performance.now()
    texts.forEach(text => {
      truncateText(text, 120)
    })
    const duration = performance.now() - start

    expect(duration).toBeLessThan(100)
  })

  it('handles varying text lengths efficiently', () => {
    const texts = Array.from({ length: 1000 }, (_, i) =>
      'x'.repeat(Math.floor(Math.random() * 500))
    )

    const start = performance.now()
    texts.forEach(text => {
      truncateText(text, 120)
    })
    const duration = performance.now() - start

    expect(duration).toBeLessThan(100)
  })
})

// ============================================================================
// BATCH PROCESSING BENCHMARKS
// ============================================================================

describe('Batch processing performance', () => {
  it('processes 500 mixed operations efficiently (<500ms)', () => {
    const posts = Array.from({ length: 250 }, () => createMockPost())
    const messages = Array.from({ length: 250 }, () => createMockMessage())

    const start = performance.now()

    // Process posts
    posts.forEach(post => {
      formatRelativeTime(post.created_at)
      truncateText(post.message, 120)
      getMatchColor(Math.floor(Math.random() * 100))
    })

    // Process messages
    messages.forEach(msg => {
      formatMessageTime(msg.created_at)
      formatMessageDate(msg.created_at)
    })

    const duration = performance.now() - start

    expect(duration).toBeLessThan(500)
  })
})
