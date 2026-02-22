/**
 * Data Processing Performance Benchmarks
 *
 * Tests performance of data transformation and processing functions.
 * These are hot paths called frequently during normal app operation.
 */

import { reduceCoordinatePrecision } from '../../lib/utils/geoPrivacy'
import { redactSensitiveData } from '../../lib/sentry'
import { createMockMessage } from '../utils/factories'

// ============================================================================
// COORDINATE PRECISION BENCHMARKS
// ============================================================================

describe('reduceCoordinatePrecision performance', () => {
  it('handles 10,000 calls efficiently (<150ms)', () => {
    const testCoordinate = 40.712776

    const start = performance.now()
    for (let i = 0; i < 10000; i++) {
      reduceCoordinatePrecision(testCoordinate + Math.random() * 0.01, 4)
    }
    const duration = performance.now() - start

    // Generous budget: 3x expected 50ms for 10k calls
    expect(duration).toBeLessThan(150)
  })

  it('handles various precision levels efficiently', () => {
    const testCoordinate = 40.712776
    const precisions = [2, 4, 6, 8]

    const start = performance.now()
    for (let i = 0; i < 1000; i++) {
      precisions.forEach(precision => {
        reduceCoordinatePrecision(testCoordinate, precision)
      })
    }
    const duration = performance.now() - start

    // 4000 calls total
    expect(duration).toBeLessThan(100)
  })
})

// ============================================================================
// SENSITIVE DATA REDACTION BENCHMARKS
// ============================================================================

describe('redactSensitiveData performance', () => {
  it('handles simple objects efficiently (<30ms per call)', () => {
    const testObject = {
      username: 'testuser',
      email: 'test@example.com',
      message: 'Hello world',
      timestamp: new Date().toISOString(),
    }

    const start = performance.now()
    for (let i = 0; i < 100; i++) {
      redactSensitiveData(testObject)
    }
    const duration = performance.now() - start

    // Average should be well under budget
    expect(duration / 100).toBeLessThan(30)
  })

  it('handles sensitive keys efficiently (<30ms per call)', () => {
    const testObject = {
      username: 'testuser',
      password: 'super-secret-password',
      accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
      refreshToken: 'refresh-token-value',
      message: 'Hello world',
    }

    const start = performance.now()
    for (let i = 0; i < 100; i++) {
      redactSensitiveData(testObject)
    }
    const duration = performance.now() - start

    expect(duration / 100).toBeLessThan(30)
  })

  it('handles nested objects efficiently (<50ms per call)', () => {
    const testObject = {
      user: {
        id: 'user-123',
        profile: {
          name: 'Test User',
          email: 'test@example.com',
          settings: {
            password: 'secret',
            apiKey: 'api-key-value',
          },
        },
      },
      metadata: {
        timestamp: new Date().toISOString(),
        version: '1.0.0',
      },
    }

    const start = performance.now()
    for (let i = 0; i < 100; i++) {
      redactSensitiveData(testObject)
    }
    const duration = performance.now() - start

    expect(duration / 100).toBeLessThan(50)
  })

  it('handles arrays efficiently (<50ms per call)', () => {
    const testArray = Array.from({ length: 10 }, (_, i) => ({
      id: `user-${i}`,
      password: `password-${i}`,
      message: `Message ${i}`,
    }))

    const start = performance.now()
    for (let i = 0; i < 100; i++) {
      redactSensitiveData(testArray)
    }
    const duration = performance.now() - start

    expect(duration / 100).toBeLessThan(50)
  })

  it('prevents stack overflow on deep nesting', () => {
    // Create deeply nested object
    let deepObject: any = { value: 'test' }
    for (let i = 0; i < 15; i++) {
      deepObject = { nested: deepObject }
    }

    const start = performance.now()
    const result = redactSensitiveData(deepObject)
    const duration = performance.now() - start

    // Should handle gracefully and quickly
    expect(duration).toBeLessThan(10)
    expect(result).toBeDefined()
  })
})

// ============================================================================
// MESSAGE PROCESSING BENCHMARKS
// ============================================================================

describe('Message processing performance', () => {
  it('sorts 1000 messages efficiently (<300ms)', () => {
    const messages = Array.from({ length: 1000 }, (_, i) => {
      const msg = createMockMessage()
      // Create random timestamps over last 7 days
      const daysAgo = Math.floor(Math.random() * 7)
      const date = new Date()
      date.setDate(date.getDate() - daysAgo)
      msg.created_at = date.toISOString()
      return msg
    })

    const start = performance.now()
    const sorted = [...messages].sort((a, b) => {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })
    const duration = performance.now() - start

    expect(duration).toBeLessThan(300)
    expect(sorted).toHaveLength(1000)
  })

  it('filters 1000 messages efficiently (<100ms)', () => {
    const messages = Array.from({ length: 1000 }, (_, i) =>
      createMockMessage({
        is_read: i % 2 === 0,
      })
    )

    const start = performance.now()
    const unread = messages.filter(msg => !msg.is_read)
    const duration = performance.now() - start

    expect(duration).toBeLessThan(100)
    expect(unread.length).toBe(500)
  })

  it('maps 1000 messages efficiently (<100ms)', () => {
    const messages = Array.from({ length: 1000 }, (_, i) =>
      createMockMessage({
        content: `Message ${i}`,
      })
    )

    const start = performance.now()
    const transformed = messages.map(msg => ({
      id: msg.id,
      preview: msg.content.substring(0, 50),
      timestamp: new Date(msg.created_at).getTime(),
    }))
    const duration = performance.now() - start

    expect(duration).toBeLessThan(100)
    expect(transformed).toHaveLength(1000)
  })
})

// ============================================================================
// JSON SERIALIZATION BENCHMARKS
// ============================================================================

describe('JSON serialization performance', () => {
  it('serializes 100 messages efficiently (<100ms)', () => {
    const messages = Array.from({ length: 100 }, () => createMockMessage())

    const start = performance.now()
    const json = JSON.stringify(messages)
    const duration = performance.now() - start

    expect(duration).toBeLessThan(100)
    expect(json).toBeDefined()
    expect(json.length).toBeGreaterThan(0)
  })

  it('deserializes 100 messages efficiently (<100ms)', () => {
    const messages = Array.from({ length: 100 }, () => createMockMessage())
    const json = JSON.stringify(messages)

    const start = performance.now()
    const parsed = JSON.parse(json)
    const duration = performance.now() - start

    expect(duration).toBeLessThan(100)
    expect(parsed).toHaveLength(100)
  })

  it('handles large export payload efficiently (<500ms)', () => {
    const exportData = {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      messages: Array.from({ length: 500 }, () => createMockMessage()),
      metadata: {
        totalMessages: 500,
        dateRange: {
          start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          end: new Date().toISOString(),
        },
      },
    }

    const start = performance.now()
    const json = JSON.stringify(exportData)
    const parsed = JSON.parse(json)
    const duration = performance.now() - start

    expect(duration).toBeLessThan(500)
    expect(parsed.messages).toHaveLength(500)
  })
})
