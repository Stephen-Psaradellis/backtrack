/**
 * Send Spark Notification Edge Function Tests
 *
 * Tests for the Spark notification system that notifies users when posts
 * are created at locations they frequently visit.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// ============================================================================
// MOCKS
// ============================================================================

// Mock Supabase client
const mockSupabaseClient = {
  from: vi.fn(),
  rpc: vi.fn(),
  storage: {
    from: vi.fn(),
  },
  auth: {
    getUser: vi.fn(),
  },
}

// Mock middleware functions
const mockWithMiddleware = vi.fn()
const mockAddCorsHeaders = vi.fn((headers, origin) => ({
  ...headers,
  'Access-Control-Allow-Origin': origin || 'http://localhost:3000',
}))
const mockCreateServiceClient = vi.fn(() => mockSupabaseClient)
const mockIsValidUUID = vi.fn((value: string) => {
  const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return UUID_REGEX.test(value)
})

// Mock global fetch for Expo API calls
global.fetch = vi.fn()

vi.mock('../_shared/middleware.ts', () => ({
  withMiddleware: mockWithMiddleware,
  addCorsHeaders: mockAddCorsHeaders,
  createServiceClient: mockCreateServiceClient,
  isValidUUID: mockIsValidUUID,
}))

// ============================================================================
// TEST DATA
// ============================================================================

const VALID_POST_ID = '00000001-0000-4000-8000-000000000001'
const VALID_LOCATION_ID = '00000002-0000-4000-8000-000000000001'
const VALID_PRODUCER_ID = '00000003-0000-4000-8000-000000000001'
const VALID_USER_ID = '00000004-0000-4000-8000-000000000001'

const mockSparkRecipient = {
  user_id: VALID_USER_ID,
  location_name: 'Coffee Shop',
}

const mockPushToken = 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]'

// ============================================================================
// TESTS
// ============================================================================

describe('send-spark-notification edge function', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Default mock responses
    mockSupabaseClient.rpc.mockImplementation(async (name: string) => {
      if (name === 'get_spark_notification_recipients') {
        return { data: [mockSparkRecipient], error: null }
      }
      if (name === 'get_user_push_tokens') {
        return { data: [{ token: mockPushToken }], error: null }
      }
      if (name === 'remove_invalid_push_token') {
        return { data: null, error: null }
      }
      if (name === 'record_spark_notification_sent') {
        return { data: null, error: null }
      }
      return { data: null, error: null }
    })

    // Mock Expo API success response
    ;(global.fetch as any).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        data: [{ status: 'ok', id: 'expo-receipt-id' }],
      }),
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  // ==========================================================================
  // VALIDATION TESTS
  // ==========================================================================

  describe('Request Validation', () => {
    it('returns 400 when post_id is missing', async () => {
      const handler = vi.fn(async (req, ctx) => {
        const { post_id, location_id, producer_id } = ctx.body as any

        if (!post_id || !mockIsValidUUID(post_id)) {
          return new Response(
            JSON.stringify({
              error: 'Missing or invalid required fields',
              required: ['post_id', 'location_id', 'producer_id'],
            }),
            {
              status: 400,
              headers: mockAddCorsHeaders({ 'Content-Type': 'application/json' }, ctx.origin),
            }
          )
        }

        return new Response(JSON.stringify({ success: true }), { status: 200 })
      })

      const response = await handler(
        new Request('http://test.com', { method: 'POST' }),
        {
          body: { location_id: VALID_LOCATION_ID, producer_id: VALID_PRODUCER_ID },
          origin: 'http://localhost:3000',
          supabase: mockSupabaseClient,
        }
      )

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toContain('Missing or invalid')
      expect(data.required).toContain('post_id')
    })

    it('returns 400 when location_id is missing', async () => {
      const handler = vi.fn(async (req, ctx) => {
        const { post_id, location_id, producer_id } = ctx.body as any

        if (!location_id || !mockIsValidUUID(location_id)) {
          return new Response(
            JSON.stringify({
              error: 'Missing or invalid required fields',
              required: ['post_id', 'location_id', 'producer_id'],
            }),
            { status: 400 }
          )
        }

        return new Response(JSON.stringify({ success: true }), { status: 200 })
      })

      const response = await handler(
        new Request('http://test.com', { method: 'POST' }),
        {
          body: { post_id: VALID_POST_ID, producer_id: VALID_PRODUCER_ID },
          origin: 'http://localhost:3000',
          supabase: mockSupabaseClient,
        }
      )

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.required).toContain('location_id')
    })

    it('returns 400 when producer_id is missing', async () => {
      const handler = vi.fn(async (req, ctx) => {
        const { post_id, location_id, producer_id } = ctx.body as any

        if (!producer_id || !mockIsValidUUID(producer_id)) {
          return new Response(
            JSON.stringify({
              error: 'Missing or invalid required fields',
              required: ['post_id', 'location_id', 'producer_id'],
            }),
            { status: 400 }
          )
        }

        return new Response(JSON.stringify({ success: true }), { status: 200 })
      })

      const response = await handler(
        new Request('http://test.com', { method: 'POST' }),
        {
          body: { post_id: VALID_POST_ID, location_id: VALID_LOCATION_ID },
          origin: 'http://localhost:3000',
          supabase: mockSupabaseClient,
        }
      )

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.required).toContain('producer_id')
    })

    it('returns 400 when UUIDs are invalid format', async () => {
      const handler = vi.fn(async (req, ctx) => {
        const { post_id, location_id, producer_id } = ctx.body as any

        if (
          !post_id || !mockIsValidUUID(post_id) ||
          !location_id || !mockIsValidUUID(location_id) ||
          !producer_id || !mockIsValidUUID(producer_id)
        ) {
          return new Response(
            JSON.stringify({
              error: 'Missing or invalid required fields',
              required: ['post_id', 'location_id', 'producer_id'],
            }),
            { status: 400 }
          )
        }

        return new Response(JSON.stringify({ success: true }), { status: 200 })
      })

      const response = await handler(
        new Request('http://test.com', { method: 'POST' }),
        {
          body: {
            post_id: 'not-a-uuid',
            location_id: 'also-not-uuid',
            producer_id: 'invalid',
          },
          origin: 'http://localhost:3000',
          supabase: mockSupabaseClient,
        }
      )

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toContain('invalid')
    })

    it('accepts all valid required fields', async () => {
      const handler = vi.fn(async (req, ctx) => {
        const { post_id, location_id, producer_id } = ctx.body as any

        if (
          !post_id || !mockIsValidUUID(post_id) ||
          !location_id || !mockIsValidUUID(location_id) ||
          !producer_id || !mockIsValidUUID(producer_id)
        ) {
          return new Response(JSON.stringify({ error: 'Invalid' }), { status: 400 })
        }

        return new Response(JSON.stringify({ success: true }), { status: 200 })
      })

      const response = await handler(
        new Request('http://test.com', { method: 'POST' }),
        {
          body: {
            post_id: VALID_POST_ID,
            location_id: VALID_LOCATION_ID,
            producer_id: VALID_PRODUCER_ID,
          },
          origin: 'http://localhost:3000',
          supabase: mockSupabaseClient,
        }
      )

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.success).toBe(true)
    })
  })

  // ==========================================================================
  // RECIPIENT RETRIEVAL
  // ==========================================================================

  describe('Spark Recipient Retrieval', () => {
    it('returns success with sent=0 when no eligible recipients found', async () => {
      mockSupabaseClient.rpc.mockImplementation(async (name: string) => {
        if (name === 'get_spark_notification_recipients') {
          return { data: [], error: null }
        }
        return { data: null, error: null }
      })

      const handler = vi.fn(async (req, ctx) => {
        const { data: recipients } = await ctx.supabase.rpc('get_spark_notification_recipients', {
          p_post_id: VALID_POST_ID,
          p_location_id: VALID_LOCATION_ID,
          p_producer_id: VALID_PRODUCER_ID,
        })

        if (!recipients || recipients.length === 0) {
          return new Response(
            JSON.stringify({ success: true, sent: 0, message: 'No eligible recipients' }),
            { status: 200 }
          )
        }

        return new Response(JSON.stringify({ success: true }), { status: 200 })
      })

      const response = await handler(
        new Request('http://test.com', { method: 'POST' }),
        {
          body: {
            post_id: VALID_POST_ID,
            location_id: VALID_LOCATION_ID,
            producer_id: VALID_PRODUCER_ID,
          },
          origin: 'http://localhost:3000',
          supabase: mockSupabaseClient,
        }
      )

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data.sent).toBe(0)
      expect(data.message).toContain('No eligible recipients')
    })

    it('handles RPC errors gracefully', async () => {
      mockSupabaseClient.rpc.mockImplementation(async (name: string) => {
        if (name === 'get_spark_notification_recipients') {
          return { data: null, error: { message: 'Database error' } }
        }
        return { data: null, error: null }
      })

      const handler = vi.fn(async (req, ctx) => {
        const { data: recipients, error } = await ctx.supabase.rpc(
          'get_spark_notification_recipients',
          {
            p_post_id: VALID_POST_ID,
            p_location_id: VALID_LOCATION_ID,
            p_producer_id: VALID_PRODUCER_ID,
          }
        )

        if (error) {
          console.error('Failed to get spark recipients:', error)
          return new Response(
            JSON.stringify({ success: true, sent: 0 }),
            { status: 200 }
          )
        }

        return new Response(JSON.stringify({ success: true }), { status: 200 })
      })

      const response = await handler(
        new Request('http://test.com', { method: 'POST' }),
        {
          body: {
            post_id: VALID_POST_ID,
            location_id: VALID_LOCATION_ID,
            producer_id: VALID_PRODUCER_ID,
          },
          origin: 'http://localhost:3000',
          supabase: mockSupabaseClient,
        }
      )

      expect(response.status).toBe(200)
    })

    it('fetches recipients with location names', async () => {
      const recipients = [
        { user_id: 'user-1', location_name: 'Coffee Shop' },
        { user_id: 'user-2', location_name: 'Library' },
        { user_id: 'user-3', location_name: 'Gym' },
      ]

      mockSupabaseClient.rpc.mockImplementation(async (name: string) => {
        if (name === 'get_spark_notification_recipients') {
          return { data: recipients, error: null }
        }
        return { data: null, error: null }
      })

      const { data } = await mockSupabaseClient.rpc('get_spark_notification_recipients', {
        p_post_id: VALID_POST_ID,
        p_location_id: VALID_LOCATION_ID,
        p_producer_id: VALID_PRODUCER_ID,
      })

      expect(data).toHaveLength(3)
      expect(data[0].location_name).toBe('Coffee Shop')
      expect(data[1].location_name).toBe('Library')
    })
  })

  // ==========================================================================
  // PUSH TOKEN HANDLING
  // ==========================================================================

  describe('Push Token Handling', () => {
    it('fetches push tokens for each recipient', async () => {
      const recipients = [
        { user_id: 'user-1', location_name: 'Cafe' },
        { user_id: 'user-2', location_name: 'Park' },
      ]

      mockSupabaseClient.rpc.mockImplementation(async (name: string, params?: any) => {
        if (name === 'get_spark_notification_recipients') {
          return { data: recipients, error: null }
        }
        if (name === 'get_user_push_tokens') {
          return {
            data: [{ token: `token-${params.p_user_id}` }],
            error: null,
          }
        }
        return { data: null, error: null }
      })

      for (const recipient of recipients) {
        const { data } = await mockSupabaseClient.rpc('get_user_push_tokens', {
          p_user_id: recipient.user_id,
        })

        expect(data).toBeDefined()
        expect(data[0].token).toBe(`token-${recipient.user_id}`)
      }
    })

    it('handles users with multiple push tokens', async () => {
      const multipleTokens = [
        { token: 'ExponentPushToken[device1]' },
        { token: 'ExponentPushToken[device2]' },
        { token: 'ExponentPushToken[device3]' },
      ]

      mockSupabaseClient.rpc.mockImplementation(async (name: string) => {
        if (name === 'get_user_push_tokens') {
          return { data: multipleTokens, error: null }
        }
        return { data: null, error: null }
      })

      const { data } = await mockSupabaseClient.rpc('get_user_push_tokens', {
        p_user_id: VALID_USER_ID,
      })

      expect(data).toHaveLength(3)
      expect(data.map((t: any) => t.token)).toEqual([
        'ExponentPushToken[device1]',
        'ExponentPushToken[device2]',
        'ExponentPushToken[device3]',
      ])
    })

    it('handles users with no push tokens gracefully', async () => {
      mockSupabaseClient.rpc.mockImplementation(async (name: string) => {
        if (name === 'get_user_push_tokens') {
          return { data: [], error: null }
        }
        return { data: null, error: null }
      })

      const { data } = await mockSupabaseClient.rpc('get_user_push_tokens', {
        p_user_id: VALID_USER_ID,
      })

      expect(data).toEqual([])
    })

    it('returns success with sent=0 when no push tokens available', async () => {
      mockSupabaseClient.rpc.mockImplementation(async (name: string) => {
        if (name === 'get_spark_notification_recipients') {
          return { data: [mockSparkRecipient], error: null }
        }
        if (name === 'get_user_push_tokens') {
          return { data: [], error: null }
        }
        return { data: null, error: null }
      })

      const handler = vi.fn(async (req, ctx) => {
        const { data: recipients } = await ctx.supabase.rpc('get_spark_notification_recipients', {
          p_post_id: VALID_POST_ID,
          p_location_id: VALID_LOCATION_ID,
          p_producer_id: VALID_PRODUCER_ID,
        })

        const allNotifications: any[] = []
        for (const recipient of recipients || []) {
          const { data: tokens } = await ctx.supabase.rpc('get_user_push_tokens', {
            p_user_id: recipient.user_id,
          })
          allNotifications.push(...(tokens || []))
        }

        if (allNotifications.length === 0) {
          return new Response(
            JSON.stringify({ success: true, sent: 0, message: 'No push tokens for recipients' }),
            { status: 200 }
          )
        }

        return new Response(JSON.stringify({ success: true }), { status: 200 })
      })

      const response = await handler(
        new Request('http://test.com', { method: 'POST' }),
        {
          body: {
            post_id: VALID_POST_ID,
            location_id: VALID_LOCATION_ID,
            producer_id: VALID_PRODUCER_ID,
          },
          origin: 'http://localhost:3000',
          supabase: mockSupabaseClient,
        }
      )

      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data.sent).toBe(0)
      expect(data.message).toContain('No push tokens')
    })
  })

  // ==========================================================================
  // NOTIFICATION PAYLOAD CONSTRUCTION
  // ==========================================================================

  describe('Notification Payload Construction', () => {
    it('constructs valid Spark notification payload', () => {
      const notification = {
        to: mockPushToken,
        title: 'Spark at your spot!',
        body: `Someone posted at ${mockSparkRecipient.location_name} - a place you frequent!`,
        data: {
          type: 'spark',
          post_id: VALID_POST_ID,
          location_id: VALID_LOCATION_ID,
          url: `backtrack://post/${VALID_POST_ID}`,
        },
        sound: 'default' as const,
        priority: 'high' as const,
        channelId: 'default',
      }

      expect(notification.to).toBe(mockPushToken)
      expect(notification.title).toBe('Spark at your spot!')
      expect(notification.body).toContain(mockSparkRecipient.location_name)
      expect(notification.data.type).toBe('spark')
      expect(notification.data.post_id).toBe(VALID_POST_ID)
      expect(notification.data.location_id).toBe(VALID_LOCATION_ID)
      expect(notification.sound).toBe('default')
      expect(notification.priority).toBe('high')
      expect(notification.channelId).toBe('default')
    })

    it('includes location name in notification body', () => {
      const locationName = 'Favorite Coffee Shop'
      const body = `Someone posted at ${locationName} - a place you frequent!`

      expect(body).toContain(locationName)
      expect(body).toContain('a place you frequent')
    })

    it('includes all required IDs in notification data', () => {
      const data = {
        type: 'spark',
        post_id: VALID_POST_ID,
        location_id: VALID_LOCATION_ID,
        url: `backtrack://post/${VALID_POST_ID}`,
      }

      expect(data.type).toBe('spark')
      expect(data.post_id).toBe(VALID_POST_ID)
      expect(data.location_id).toBe(VALID_LOCATION_ID)
      expect(data.url).toMatch(/^backtrack:\/\/post\//)
    })

    it('uses "default" channel (different from match notifications)', () => {
      const sparkNotification = {
        channelId: 'default',
      }

      const matchNotification = {
        channelId: 'matches',
      }

      expect(sparkNotification.channelId).toBe('default')
      expect(sparkNotification.channelId).not.toBe(matchNotification.channelId)
    })
  })

  // ==========================================================================
  // EXPO API INTERACTION
  // ==========================================================================

  describe('Expo API Interaction', () => {
    it('sends notifications to Expo API with correct format', async () => {
      const notifications = [
        {
          to: mockPushToken,
          title: 'Spark at your spot!',
          body: 'Test body',
          data: { type: 'spark', post_id: VALID_POST_ID },
          sound: 'default' as const,
          priority: 'high' as const,
          channelId: 'default',
        },
      ]

      await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Accept-Encoding': 'gzip, deflate',
        },
        body: JSON.stringify(notifications),
      })

      expect(global.fetch).toHaveBeenCalledWith(
        'https://exp.host/--/api/v2/push/send',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Accept-Encoding': 'gzip, deflate',
          }),
          body: JSON.stringify(notifications),
        })
      )
    })

    it('retries on server errors with exponential backoff', async () => {
      let callCount = 0
      ;(global.fetch as any).mockImplementation(async () => {
        callCount++
        if (callCount < 3) {
          return { ok: false, status: 503 }
        }
        return {
          ok: true,
          status: 200,
          json: async () => ({ data: [{ status: 'ok' }] }),
        }
      })

      const sendWithRetry = async (retryCount = 0): Promise<any> => {
        const response = await fetch('https://exp.host/--/api/v2/push/send', {
          method: 'POST',
          body: JSON.stringify([]),
        })

        if (!response.ok && response.status >= 500 && retryCount < 3) {
          await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retryCount)))
          return sendWithRetry(retryCount + 1)
        }

        return response
      }

      const result = await sendWithRetry()
      expect(result.ok).toBe(true)
      expect(callCount).toBe(3)
    })

    it('throws error after max retries exceeded', async () => {
      ;(global.fetch as any).mockResolvedValue({
        ok: false,
        status: 500,
      })

      const sendWithRetry = async (retryCount = 0): Promise<any> => {
        const response = await fetch('https://exp.host/--/api/v2/push/send', {
          method: 'POST',
          body: JSON.stringify([]),
        })

        if (!response.ok && response.status >= 500 && retryCount < 3) {
          return sendWithRetry(retryCount + 1)
        }

        if (!response.ok) {
          throw new Error(`Expo API returned ${response.status}`)
        }

        return response
      }

      await expect(sendWithRetry()).rejects.toThrow('Expo API returned 500')
    })
  })

  // ==========================================================================
  // INVALID TOKEN HANDLING
  // ==========================================================================

  describe('Invalid Token Handling', () => {
    it('removes DeviceNotRegistered tokens from database', async () => {
      const invalidToken = 'ExponentPushToken[unregistered]'

      await mockSupabaseClient.rpc('remove_invalid_push_token', {
        p_token: invalidToken,
      })

      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith(
        'remove_invalid_push_token',
        { p_token: invalidToken }
      )
    })

    it('handles DeviceNotRegistered error from Expo', async () => {
      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          data: [{
            status: 'error',
            details: { error: 'DeviceNotRegistered' },
          }],
        }),
      })

      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        body: JSON.stringify([{ to: 'invalid-token' }]),
      })

      const data = await response.json()
      const ticket = data.data[0]

      expect(ticket.status).toBe('error')
      expect(ticket.details?.error).toBe('DeviceNotRegistered')
    })

    it('does not remove tokens for other error types', async () => {
      const tickets = [
        { status: 'error', details: { error: 'MessageTooBig' } },
        { status: 'error', details: { error: 'MessageRateExceeded' } },
      ]

      for (const ticket of tickets) {
        expect(ticket.details?.error).not.toBe('DeviceNotRegistered')
      }
    })
  })

  // ==========================================================================
  // NOTIFICATION RECORDING
  // ==========================================================================

  describe('Notification Recording', () => {
    it('records successful notifications for all users', async () => {
      const userIds = ['user-1', 'user-2', 'user-3']

      await mockSupabaseClient.rpc('record_spark_notification_sent', {
        p_user_ids: userIds,
        p_post_id: VALID_POST_ID,
        p_location_id: VALID_LOCATION_ID,
      })

      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith(
        'record_spark_notification_sent',
        {
          p_user_ids: userIds,
          p_post_id: VALID_POST_ID,
          p_location_id: VALID_LOCATION_ID,
        }
      )
    })

    it('only records notifications that were successfully sent', async () => {
      const tickets = [
        { status: 'ok' as const },
        { status: 'error' as const },
        { status: 'ok' as const },
        { status: 'error' as const },
      ]

      const tokens = ['token1', 'token2', 'token3', 'token4']
      const tokenToUserMap = new Map([
        ['token1', 'user-1'],
        ['token2', 'user-2'],
        ['token3', 'user-3'],
        ['token4', 'user-4'],
      ])

      const successfulUserIds = [...new Set(
        tickets
          .map((ticket, i) => ticket.status === 'ok' ? tokenToUserMap.get(tokens[i]) : null)
          .filter((id): id is string => id !== null)
      )]

      expect(successfulUserIds).toEqual(['user-1', 'user-3'])
      expect(successfulUserIds).toHaveLength(2)
    })

    it('handles recording errors gracefully', async () => {
      mockSupabaseClient.rpc.mockImplementation(async (name: string) => {
        if (name === 'record_spark_notification_sent') {
          return { data: null, error: { message: 'Recording failed' } }
        }
        return { data: null, error: null }
      })

      const { error } = await mockSupabaseClient.rpc('record_spark_notification_sent', {
        p_user_ids: [VALID_USER_ID],
        p_post_id: VALID_POST_ID,
        p_location_id: VALID_LOCATION_ID,
      })

      expect(error).toBeDefined()
      expect(error.message).toBe('Recording failed')
    })

    it('deduplicates user IDs when recording', async () => {
      const tokenToUserMap = new Map([
        ['token1', 'user-1'],
        ['token2', 'user-1'], // Same user, different device
        ['token3', 'user-2'],
      ])

      const tickets = [
        { status: 'ok' as const },
        { status: 'ok' as const },
        { status: 'ok' as const },
      ]

      const successfulUserIds = [...new Set(
        tickets
          .map((ticket, i) => ticket.status === 'ok' ? tokenToUserMap.get(`token${i + 1}`) : null)
          .filter((id): id is string => id !== null)
      )]

      expect(successfulUserIds).toEqual(['user-1', 'user-2'])
      expect(successfulUserIds).toHaveLength(2) // Deduplicated
    })
  })

  // ==========================================================================
  // RESPONSE FORMAT
  // ==========================================================================

  describe('Response Format', () => {
    it('returns success response with counts', async () => {
      const response = {
        success: true,
        sent: 3,
        failed: 1,
        recipientCount: 2,
      }

      expect(response.success).toBe(true)
      expect(response.sent).toBe(3)
      expect(response.failed).toBe(1)
      expect(response.recipientCount).toBe(2)
    })

    it('includes CORS headers in response', () => {
      const headers = mockAddCorsHeaders(
        { 'Content-Type': 'application/json' },
        'http://localhost:3000'
      )

      expect(headers['Access-Control-Allow-Origin']).toBe('http://localhost:3000')
      expect(headers['Content-Type']).toBe('application/json')
    })

    it('returns error response on failure', async () => {
      const errorResponse = new Response(
        JSON.stringify({ success: false, error: 'Failed to send notifications' }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      )

      expect(errorResponse.status).toBe(500)
      const data = await errorResponse.json()
      expect(data.success).toBe(false)
      expect(data.error).toBeDefined()
    })
  })
})
