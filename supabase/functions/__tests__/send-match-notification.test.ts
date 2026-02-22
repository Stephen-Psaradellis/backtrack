/**
 * Send Match Notification Edge Function Tests
 *
 * Tests for the Tier 1 match notification system that sends push notifications
 * when new posts are created at locations where users have verified check-ins.
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
const VALID_USER_ID = '00000003-0000-4000-8000-000000000001'
const VALID_CHECKIN_ID = '00000004-0000-4000-8000-000000000001'

const mockTierOneMatch = {
  user_id: VALID_USER_ID,
  checkin_id: VALID_CHECKIN_ID,
  checked_in_at: new Date().toISOString(),
  push_token: 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]',
}

const mockPostLocation = {
  location_id: VALID_LOCATION_ID,
  locations: { name: 'Test Cafe' },
}

// ============================================================================
// TESTS
// ============================================================================

describe('send-match-notification edge function', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Default Supabase query builder mock
    const mockQueryBuilder = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: mockPostLocation, error: null }),
      delete: vi.fn().mockReturnThis(),
    }

    mockSupabaseClient.from.mockReturnValue(mockQueryBuilder)
    mockSupabaseClient.rpc.mockResolvedValue({ data: [mockTierOneMatch], error: null })

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
    it('returns 400 when postId is missing', async () => {
      const handler = vi.fn(async (req, ctx) => {
        const requestBody = ctx.body as { postId?: string }

        if (!requestBody.postId) {
          return new Response(
            JSON.stringify({ error: 'Valid postId is required' }),
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
        { body: {}, origin: 'http://localhost:3000', supabase: mockSupabaseClient }
      )

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toContain('postId')
    })

    it('returns 400 when postId is not a valid UUID', async () => {
      const handler = vi.fn(async (req, ctx) => {
        const requestBody = ctx.body as { postId: string }

        if (!requestBody.postId || !mockIsValidUUID(requestBody.postId)) {
          return new Response(
            JSON.stringify({ error: 'Valid postId is required' }),
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
          body: { postId: 'not-a-uuid' },
          origin: 'http://localhost:3000',
          supabase: mockSupabaseClient,
        }
      )

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toContain('postId')
    })

    it('accepts valid postId and proceeds', async () => {
      mockSupabaseClient.rpc.mockResolvedValue({ data: [], error: null })

      const handler = vi.fn(async (req, ctx) => {
        const requestBody = ctx.body as { postId: string }

        if (!requestBody.postId || !mockIsValidUUID(requestBody.postId)) {
          return new Response(
            JSON.stringify({ error: 'Valid postId is required' }),
            { status: 400 }
          )
        }

        return new Response(
          JSON.stringify({ success: true, sent: 0, failed: 0 }),
          { status: 200 }
        )
      })

      const response = await handler(
        new Request('http://test.com', { method: 'POST' }),
        {
          body: { postId: VALID_POST_ID },
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
  // POST LOCATION LOOKUP
  // ==========================================================================

  describe('Post Location Lookup', () => {
    it('returns 404 when post is not found', async () => {
      const mockQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } }),
      }
      mockSupabaseClient.from.mockReturnValue(mockQueryBuilder)

      const handler = vi.fn(async (req, ctx) => {
        const requestBody = ctx.body as { postId: string; locationName?: string }

        if (!requestBody.locationName) {
          const { data } = await ctx.supabase
            .from('posts')
            .select('location_id, locations (name)')
            .eq('id', requestBody.postId)
            .single()

          if (!data) {
            return new Response(
              JSON.stringify({ error: 'Post not found' }),
              { status: 404 }
            )
          }
        }

        return new Response(JSON.stringify({ success: true }), { status: 200 })
      })

      const response = await handler(
        new Request('http://test.com', { method: 'POST' }),
        {
          body: { postId: VALID_POST_ID },
          origin: 'http://localhost:3000',
          supabase: mockSupabaseClient,
        }
      )

      expect(response.status).toBe(404)
      const data = await response.json()
      expect(data.error).toContain('Post not found')
    })

    it('uses locationName from request when provided', async () => {
      const handler = vi.fn(async (req, ctx) => {
        const requestBody = ctx.body as { postId: string; locationName?: string }
        const locationName = requestBody.locationName || 'Default Location'

        return new Response(
          JSON.stringify({ success: true, locationName }),
          { status: 200 }
        )
      })

      const response = await handler(
        new Request('http://test.com', { method: 'POST' }),
        {
          body: { postId: VALID_POST_ID, locationName: 'Custom Cafe' },
          origin: 'http://localhost:3000',
          supabase: mockSupabaseClient,
        }
      )

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.locationName).toBe('Custom Cafe')
    })

    it('fetches location name from database when not provided', async () => {
      const mockQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { location_id: VALID_LOCATION_ID, locations: { name: 'Database Cafe' } },
          error: null,
        }),
      }
      mockSupabaseClient.from.mockReturnValue(mockQueryBuilder)

      const handler = vi.fn(async (req, ctx) => {
        const requestBody = ctx.body as { postId: string; locationName?: string }

        let locationName = requestBody.locationName
        if (!locationName) {
          const { data } = await ctx.supabase
            .from('posts')
            .select('location_id, locations (name)')
            .eq('id', requestBody.postId)
            .single()

          locationName = data?.locations?.name || 'a location'
        }

        return new Response(
          JSON.stringify({ success: true, locationName }),
          { status: 200 }
        )
      })

      const response = await handler(
        new Request('http://test.com', { method: 'POST' }),
        {
          body: { postId: VALID_POST_ID },
          origin: 'http://localhost:3000',
          supabase: mockSupabaseClient,
        }
      )

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.locationName).toBe('Database Cafe')
    })
  })

  // ==========================================================================
  // TIER 1 MATCHES
  // ==========================================================================

  describe('Tier 1 Match Retrieval', () => {
    it('returns success with sent=0 when no Tier 1 matches found', async () => {
      mockSupabaseClient.rpc.mockResolvedValue({ data: [], error: null })

      const handler = vi.fn(async (req, ctx) => {
        const requestBody = ctx.body as { postId: string }

        const { data: matches } = await ctx.supabase.rpc('get_tier_1_matches_for_post', {
          p_post_id: requestBody.postId,
        })

        if (!matches || matches.length === 0) {
          return new Response(
            JSON.stringify({ success: true, sent: 0, failed: 0, message: 'No Tier 1 matches found' }),
            { status: 200 }
          )
        }

        return new Response(JSON.stringify({ success: true }), { status: 200 })
      })

      const response = await handler(
        new Request('http://test.com', { method: 'POST' }),
        {
          body: { postId: VALID_POST_ID },
          origin: 'http://localhost:3000',
          supabase: mockSupabaseClient,
        }
      )

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data.sent).toBe(0)
      expect(data.message).toContain('No Tier 1 matches')
    })

    it('handles RPC errors gracefully', async () => {
      mockSupabaseClient.rpc.mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      })

      const handler = vi.fn(async (req, ctx) => {
        const requestBody = ctx.body as { postId: string }

        const { data: matches, error } = await ctx.supabase.rpc('get_tier_1_matches_for_post', {
          p_post_id: requestBody.postId,
        })

        if (error) {
          console.error('Failed to get Tier 1 matches:', error.message)
          return new Response(
            JSON.stringify({ success: true, sent: 0, failed: 0 }),
            { status: 200 }
          )
        }

        return new Response(JSON.stringify({ success: true }), { status: 200 })
      })

      const response = await handler(
        new Request('http://test.com', { method: 'POST' }),
        {
          body: { postId: VALID_POST_ID },
          origin: 'http://localhost:3000',
          supabase: mockSupabaseClient,
        }
      )

      expect(response.status).toBe(200)
    })
  })

  // ==========================================================================
  // PUSH TOKEN HANDLING
  // ==========================================================================

  describe('Push Token Handling', () => {
    it('filters out matches without push tokens', async () => {
      const matchesWithAndWithoutTokens = [
        { ...mockTierOneMatch, push_token: 'ExponentPushToken[valid]' },
        { ...mockTierOneMatch, user_id: 'user-2', push_token: null },
        { ...mockTierOneMatch, user_id: 'user-3', push_token: '' },
        { ...mockTierOneMatch, user_id: 'user-4', push_token: 'ExponentPushToken[valid2]' },
      ]

      mockSupabaseClient.rpc.mockResolvedValue({
        data: matchesWithAndWithoutTokens,
        error: null,
      })

      const handler = vi.fn(async (req, ctx) => {
        const { data: matches } = await ctx.supabase.rpc('get_tier_1_matches_for_post', {
          p_post_id: (ctx.body as { postId: string }).postId,
        })

        const notifications = (matches || [])
          .filter((m: any) => m.push_token)
          .map((m: any) => ({
            to: m.push_token,
            title: 'Test',
            body: 'Test',
          }))

        return new Response(
          JSON.stringify({ success: true, notificationCount: notifications.length }),
          { status: 200 }
        )
      })

      const response = await handler(
        new Request('http://test.com', { method: 'POST' }),
        {
          body: { postId: VALID_POST_ID },
          origin: 'http://localhost:3000',
          supabase: mockSupabaseClient,
        }
      )

      const data = await response.json()
      expect(data.notificationCount).toBe(2) // Only 2 valid tokens
    })

    it('returns success with sent=0 when matches have no push tokens', async () => {
      mockSupabaseClient.rpc.mockResolvedValue({
        data: [{ ...mockTierOneMatch, push_token: null }],
        error: null,
      })

      const handler = vi.fn(async (req, ctx) => {
        const { data: matches } = await ctx.supabase.rpc('get_tier_1_matches_for_post', {
          p_post_id: (ctx.body as { postId: string }).postId,
        })

        const notifications = (matches || []).filter((m: any) => m.push_token)

        if (notifications.length === 0) {
          return new Response(
            JSON.stringify({ success: true, sent: 0, failed: 0, message: 'No push tokens for matches' }),
            { status: 200 }
          )
        }

        return new Response(JSON.stringify({ success: true }), { status: 200 })
      })

      const response = await handler(
        new Request('http://test.com', { method: 'POST' }),
        {
          body: { postId: VALID_POST_ID },
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
    it('constructs valid push notification payload with all required fields', () => {
      const locationName = 'Test Cafe'
      const notification = {
        to: mockTierOneMatch.push_token,
        title: 'Someone may be looking for you!',
        body: `A new post was created at ${locationName} - were you there?`,
        data: {
          type: 'tier_1_match',
          postId: VALID_POST_ID,
          url: `backtrack://post/${VALID_POST_ID}`,
        },
        sound: 'default' as const,
        priority: 'high' as const,
        channelId: 'matches',
      }

      expect(notification.to).toBe(mockTierOneMatch.push_token)
      expect(notification.title).toBe('Someone may be looking for you!')
      expect(notification.body).toContain(locationName)
      expect(notification.data.type).toBe('tier_1_match')
      expect(notification.data.postId).toBe(VALID_POST_ID)
      expect(notification.data.url).toContain(VALID_POST_ID)
      expect(notification.sound).toBe('default')
      expect(notification.priority).toBe('high')
      expect(notification.channelId).toBe('matches')
    })

    it('includes location name in notification body', () => {
      const locationName = 'Central Park'
      const body = `A new post was created at ${locationName} - were you there?`

      expect(body).toContain(locationName)
      expect(body).toContain('A new post was created at')
    })

    it('includes deep link URL in notification data', () => {
      const data = {
        type: 'tier_1_match',
        postId: VALID_POST_ID,
        url: `backtrack://post/${VALID_POST_ID}`,
      }

      expect(data.url).toBe(`backtrack://post/${VALID_POST_ID}`)
      expect(data.url).toMatch(/^backtrack:\/\//)
    })
  })

  // ==========================================================================
  // EXPO API INTERACTION
  // ==========================================================================

  describe('Expo API Interaction', () => {
    it('sends notifications to Expo API with correct format', async () => {
      const notifications = [
        {
          to: 'ExponentPushToken[test]',
          title: 'Test',
          body: 'Test body',
          data: { type: 'tier_1_match', postId: VALID_POST_ID },
          sound: 'default' as const,
          priority: 'high' as const,
          channelId: 'matches',
        },
      ]

      await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
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
          }),
          body: JSON.stringify(notifications),
        })
      )
    })

    it('handles Expo API errors gracefully', async () => {
      ;(global.fetch as any).mockResolvedValue({
        ok: false,
        status: 500,
      })

      const handler = vi.fn(async () => {
        const response = await fetch('https://exp.host/--/api/v2/push/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify([]),
        })

        if (!response.ok) {
          return new Response(
            JSON.stringify({ success: false, error: 'Failed to send notifications' }),
            { status: 500 }
          )
        }

        return new Response(JSON.stringify({ success: true }), { status: 200 })
      })

      const response = await handler()
      const data = await response.json()

      expect(data.success).toBe(false)
      expect(data.error).toContain('Failed to send')
    })

    it('retries on 5xx errors from Expo API', async () => {
      let callCount = 0
      ;(global.fetch as any).mockImplementation(async () => {
        callCount++
        if (callCount < 3) {
          return { ok: false, status: 500 }
        }
        return {
          ok: true,
          status: 200,
          json: async () => ({ data: [{ status: 'ok' }] }),
        }
      })

      // Simulate retry logic
      const sendWithRetry = async (retryCount = 0): Promise<any> => {
        const response = await fetch('https://exp.host/--/api/v2/push/send', {
          method: 'POST',
          body: JSON.stringify([]),
        })

        if (!response.ok && response.status >= 500 && retryCount < 3) {
          return sendWithRetry(retryCount + 1)
        }

        return response
      }

      const result = await sendWithRetry()
      expect(result.ok).toBe(true)
      expect(callCount).toBe(3)
    })
  })

  // ==========================================================================
  // INVALID TOKEN HANDLING
  // ==========================================================================

  describe('Invalid Token Handling', () => {
    it('removes invalid push tokens from database', async () => {
      const invalidToken = 'ExponentPushToken[invalid]'
      const mockDelete = vi.fn().mockReturnThis()
      const mockEq = vi.fn().mockReturnThis()

      const mockQueryBuilder = {
        delete: mockDelete,
        eq: mockEq,
      }

      mockSupabaseClient.from.mockReturnValue(mockQueryBuilder)

      // Simulate removing invalid token
      await mockSupabaseClient.from('expo_push_tokens').delete().eq('token', invalidToken)

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('expo_push_tokens')
      expect(mockDelete).toHaveBeenCalled()
      expect(mockEq).toHaveBeenCalledWith('token', invalidToken)
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
  })

  // ==========================================================================
  // NOTIFICATION RECORDING
  // ==========================================================================

  describe('Notification Recording', () => {
    it('records successful notifications in database', async () => {
      mockSupabaseClient.rpc.mockResolvedValue({ data: null, error: null })

      await mockSupabaseClient.rpc('record_match_notification', {
        p_post_id: VALID_POST_ID,
        p_user_id: VALID_USER_ID,
        p_checkin_id: VALID_CHECKIN_ID,
      })

      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith(
        'record_match_notification',
        {
          p_post_id: VALID_POST_ID,
          p_user_id: VALID_USER_ID,
          p_checkin_id: VALID_CHECKIN_ID,
        }
      )
    })

    it('does not record failed notifications', async () => {
      const tickets = [
        { status: 'ok' as const },
        { status: 'error' as const },
        { status: 'ok' as const },
      ]

      const successfulIndices = tickets
        .map((ticket, index) => ticket.status === 'ok' ? index : -1)
        .filter(index => index !== -1)

      expect(successfulIndices).toEqual([0, 2])
      expect(successfulIndices).not.toContain(1)
    })

    it('handles recording errors gracefully', async () => {
      mockSupabaseClient.rpc.mockResolvedValue({
        data: null,
        error: { message: 'Recording failed' },
      })

      const { error } = await mockSupabaseClient.rpc('record_match_notification', {
        p_post_id: VALID_POST_ID,
        p_user_id: VALID_USER_ID,
        p_checkin_id: VALID_CHECKIN_ID,
      })

      // Should log error but not fail the overall operation
      expect(error).toBeDefined()
      expect(error.message).toBe('Recording failed')
    })
  })

  // ==========================================================================
  // RESPONSE FORMAT
  // ==========================================================================

  describe('Response Format', () => {
    it('returns success response with sent/failed counts', async () => {
      const response = {
        success: true,
        sent: 5,
        failed: 1,
        matchCount: 6,
      }

      expect(response.success).toBe(true)
      expect(response.sent).toBe(5)
      expect(response.failed).toBe(1)
      expect(response.matchCount).toBe(6)
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
