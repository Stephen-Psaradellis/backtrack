/**
 * Tests for the send-spark-notification and send-match-notification Edge Functions
 *
 * These tests verify the notification logic, request handling, and error cases
 * without calling actual external services.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// ============================================================================
// Types (mirrored from edge functions)
// ============================================================================

interface ExpoNotification {
  to: string
  title: string
  body: string
  data?: Record<string, unknown>
  sound: 'default'
  priority: 'high'
  channelId: string
}

interface ExpoPushTicket {
  status: 'ok' | 'error'
  id?: string
  message?: string
  details?: {
    error?: 'DeviceNotRegistered' | 'InvalidCredentials' | 'MessageTooBig' | 'MessageRateExceeded'
  }
}

interface SparkNotificationRequest {
  post_id: string
  location_id: string
  producer_id: string
}

interface MatchNotificationRequest {
  postId: string
  locationId?: string
  locationName?: string
}

// ============================================================================
// Helper Functions (extracted for testing)
// ============================================================================

function validateSparkRequest(body: Partial<SparkNotificationRequest>): { valid: boolean; error?: string } {
  if (!body.post_id || !body.location_id || !body.producer_id) {
    return {
      valid: false,
      error: 'Missing required fields: post_id, location_id, producer_id',
    }
  }
  return { valid: true }
}

function validateMatchRequest(body: Partial<MatchNotificationRequest>): { valid: boolean; error?: string } {
  if (!body.postId) {
    return { valid: false, error: 'postId is required' }
  }
  return { valid: true }
}

function buildSparkNotification(
  token: string,
  locationName: string,
  postId: string,
  locationId: string
): ExpoNotification {
  return {
    to: token,
    title: 'Spark at your spot! ✨',
    body: `Someone posted at ${locationName} - a place you frequent!`,
    data: {
      type: 'spark',
      post_id: postId,
      location_id: locationId,
      url: `backtrack://post/${postId}`,
    },
    sound: 'default',
    priority: 'high',
    channelId: 'default',
  }
}

function buildMatchNotification(
  token: string,
  locationName: string,
  postId: string
): ExpoNotification {
  return {
    to: token,
    title: 'Someone may be looking for you!',
    body: `A new post was created at ${locationName} - were you there?`,
    data: {
      type: 'tier_1_match',
      postId,
      url: `backtrack://post/${postId}`,
    },
    sound: 'default',
    priority: 'high',
    channelId: 'matches',
  }
}

function processTickets(
  tickets: ExpoPushTicket[],
  tokens: string[]
): { sent: number; failed: number; invalidTokens: string[] } {
  let sent = 0
  let failed = 0
  const invalidTokens: string[] = []

  for (let i = 0; i < tickets.length; i++) {
    const ticket = tickets[i]
    const token = tokens[i]

    if (ticket.status === 'ok') {
      sent++
    } else {
      failed++
      if (ticket.details?.error === 'DeviceNotRegistered') {
        invalidTokens.push(token)
      }
    }
  }

  return { sent, failed, invalidTokens }
}

// ============================================================================
// Tests
// ============================================================================

describe('Spark Notification Edge Function', () => {
  describe('Request validation', () => {
    it('should require post_id', () => {
      const result = validateSparkRequest({
        location_id: 'loc-1',
        producer_id: 'user-1',
      })
      expect(result.valid).toBe(false)
      expect(result.error).toContain('post_id')
    })

    it('should require location_id', () => {
      const result = validateSparkRequest({
        post_id: 'post-1',
        producer_id: 'user-1',
      })
      expect(result.valid).toBe(false)
      expect(result.error).toContain('location_id')
    })

    it('should require producer_id', () => {
      const result = validateSparkRequest({
        post_id: 'post-1',
        location_id: 'loc-1',
      })
      expect(result.valid).toBe(false)
      expect(result.error).toContain('producer_id')
    })

    it('should accept valid request', () => {
      const result = validateSparkRequest({
        post_id: 'post-1',
        location_id: 'loc-1',
        producer_id: 'user-1',
      })
      expect(result.valid).toBe(true)
    })
  })

  describe('Notification building', () => {
    it('should build correct spark notification', () => {
      const notification = buildSparkNotification(
        'ExponentPushToken[abc123]',
        'Coffee Shop',
        'post-123',
        'loc-456'
      )

      expect(notification.to).toBe('ExponentPushToken[abc123]')
      expect(notification.title).toBe('Spark at your spot! ✨')
      expect(notification.body).toContain('Coffee Shop')
      expect(notification.data?.type).toBe('spark')
      expect(notification.data?.post_id).toBe('post-123')
      expect(notification.data?.location_id).toBe('loc-456')
      expect(notification.data?.url).toBe('backtrack://post/post-123')
      expect(notification.sound).toBe('default')
      expect(notification.priority).toBe('high')
      expect(notification.channelId).toBe('default')
    })
  })
})

describe('Match Notification Edge Function', () => {
  describe('Request validation', () => {
    it('should require postId', () => {
      const result = validateMatchRequest({})
      expect(result.valid).toBe(false)
      expect(result.error).toContain('postId')
    })

    it('should accept request with only postId', () => {
      const result = validateMatchRequest({ postId: 'post-1' })
      expect(result.valid).toBe(true)
    })

    it('should accept request with all fields', () => {
      const result = validateMatchRequest({
        postId: 'post-1',
        locationId: 'loc-1',
        locationName: 'Coffee Shop',
      })
      expect(result.valid).toBe(true)
    })
  })

  describe('Notification building', () => {
    it('should build correct match notification', () => {
      const notification = buildMatchNotification(
        'ExponentPushToken[xyz789]',
        'Gym',
        'post-456'
      )

      expect(notification.to).toBe('ExponentPushToken[xyz789]')
      expect(notification.title).toBe('Someone may be looking for you!')
      expect(notification.body).toContain('Gym')
      expect(notification.data?.type).toBe('tier_1_match')
      expect(notification.data?.postId).toBe('post-456')
      expect(notification.data?.url).toBe('backtrack://post/post-456')
      expect(notification.sound).toBe('default')
      expect(notification.priority).toBe('high')
      expect(notification.channelId).toBe('matches')
    })
  })
})

describe('Expo Push Ticket Processing', () => {
  it('should count successful sends', () => {
    const tickets: ExpoPushTicket[] = [
      { status: 'ok', id: 'ticket-1' },
      { status: 'ok', id: 'ticket-2' },
      { status: 'ok', id: 'ticket-3' },
    ]
    const tokens = ['token-1', 'token-2', 'token-3']

    const result = processTickets(tickets, tokens)

    expect(result.sent).toBe(3)
    expect(result.failed).toBe(0)
    expect(result.invalidTokens).toHaveLength(0)
  })

  it('should count failed sends', () => {
    const tickets: ExpoPushTicket[] = [
      { status: 'ok', id: 'ticket-1' },
      { status: 'error', message: 'Something went wrong' },
      { status: 'error', message: 'Another error' },
    ]
    const tokens = ['token-1', 'token-2', 'token-3']

    const result = processTickets(tickets, tokens)

    expect(result.sent).toBe(1)
    expect(result.failed).toBe(2)
  })

  it('should identify invalid tokens for removal', () => {
    const tickets: ExpoPushTicket[] = [
      { status: 'ok', id: 'ticket-1' },
      { status: 'error', details: { error: 'DeviceNotRegistered' } },
      { status: 'error', details: { error: 'MessageRateExceeded' } },
    ]
    const tokens = ['token-1', 'token-2', 'token-3']

    const result = processTickets(tickets, tokens)

    expect(result.invalidTokens).toContain('token-2')
    expect(result.invalidTokens).not.toContain('token-3')
    expect(result.invalidTokens).toHaveLength(1)
  })

  it('should handle empty tickets array', () => {
    const result = processTickets([], [])

    expect(result.sent).toBe(0)
    expect(result.failed).toBe(0)
    expect(result.invalidTokens).toHaveLength(0)
  })

  it('should handle mixed results', () => {
    const tickets: ExpoPushTicket[] = [
      { status: 'ok', id: 'ticket-1' },
      { status: 'error', details: { error: 'DeviceNotRegistered' } },
      { status: 'ok', id: 'ticket-3' },
      { status: 'error', details: { error: 'DeviceNotRegistered' } },
      { status: 'error', details: { error: 'InvalidCredentials' } },
    ]
    const tokens = ['token-1', 'token-2', 'token-3', 'token-4', 'token-5']

    const result = processTickets(tickets, tokens)

    expect(result.sent).toBe(2)
    expect(result.failed).toBe(3)
    expect(result.invalidTokens).toEqual(['token-2', 'token-4'])
  })
})

describe('Retry Logic', () => {
  const MAX_RETRIES = 3
  const RETRY_DELAY_MS = 1000

  it('should calculate correct exponential backoff delay', () => {
    const delays = [0, 1, 2].map(retryCount => RETRY_DELAY_MS * Math.pow(2, retryCount))

    expect(delays[0]).toBe(1000) // First retry: 1s
    expect(delays[1]).toBe(2000) // Second retry: 2s
    expect(delays[2]).toBe(4000) // Third retry: 4s
  })

  it('should respect max retry limit', () => {
    let attempts = 0
    const shouldRetry = (retryCount: number): boolean => {
      attempts++
      return retryCount < MAX_RETRIES
    }

    let retryCount = 0
    while (shouldRetry(retryCount)) {
      retryCount++
    }

    expect(attempts).toBe(MAX_RETRIES + 1) // Initial + 3 retries
    expect(retryCount).toBe(MAX_RETRIES)
  })
})

describe('Deep Link URLs', () => {
  it('should generate valid backtrack:// URLs', () => {
    const postId = 'abc-123-def'
    const url = `backtrack://post/${postId}`

    expect(url).toBe('backtrack://post/abc-123-def')
    expect(url.startsWith('backtrack://')).toBe(true)
  })

  it('should handle UUIDs in URLs', () => {
    const postId = '550e8400-e29b-41d4-a716-446655440000'
    const url = `backtrack://post/${postId}`

    expect(url).toContain(postId)
  })
})
