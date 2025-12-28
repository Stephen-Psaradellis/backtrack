/**
 * Unit tests for Meetup GraphQL API client
 *
 * These tests cover:
 * - OAuth authentication flow (authorization URL, token exchange, token refresh)
 * - GraphQL query execution and response parsing
 * - Error handling for GraphQL errors (returned with 200 status)
 * - Rate limit and expired token detection
 * - Mock mode detection based on environment
 * - Token expiration checking
 * - Event data normalization for database storage
 *
 * Tests use mock fetch responses and environment variable mocking.
 * Note: Meetup returns 200 status even with errors in response.errors field.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  getAuthorizationUrl,
  exchangeCodeForTokens,
  refreshAccessToken,
  searchEvents,
  getEventDetails,
  getCategories,
  MeetupApiError,
  shouldUseMockMeetup,
  isTokenExpired,
  normalizeEvent,
  type MeetupEvent,
  type MeetupSearchParams,
  type MeetupTokens,
} from '@/lib/api/meetup'

// ============================================================================
// Test Setup - Environment Variable and Fetch Mocking
// ============================================================================

/**
 * Store original environment variables to restore after tests
 */
const originalEnv = { ...process.env }

/**
 * Helper to set environment variables for testing
 */
function setEnv(vars: Record<string, string | undefined>): void {
  for (const [key, value] of Object.entries(vars)) {
    if (value === undefined) {
      delete process.env[key]
    } else {
      process.env[key] = value
    }
  }
}

/**
 * Setup environment with Meetup credentials
 */
function setMeetupCredentials(): void {
  setEnv({
    NODE_ENV: 'test',
    MEETUP_CLIENT_ID: 'test-client-id',
    MEETUP_CLIENT_SECRET: 'test-client-secret',
    MEETUP_REDIRECT_URI: 'http://localhost:3000/api/auth/meetup',
  })
}

/**
 * Mock global fetch
 */
const mockFetch = vi.fn()

/**
 * Reset environment and mocks before each test
 */
beforeEach(() => {
  // Clear environment variables
  delete process.env.NODE_ENV
  delete process.env.MEETUP_CLIENT_ID
  delete process.env.MEETUP_CLIENT_SECRET
  delete process.env.MEETUP_REDIRECT_URI

  // Reset fetch mock
  vi.stubGlobal('fetch', mockFetch)
  mockFetch.mockReset()
})

afterEach(() => {
  // Restore original environment
  process.env = { ...originalEnv }
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

// ============================================================================
// Mock Data
// ============================================================================

/**
 * Mock Meetup event response
 */
const mockMeetupEvent: MeetupEvent = {
  id: 'event-123',
  title: 'JavaScript Developers Meetup',
  description: 'A great meetup for JS developers',
  eventUrl: 'https://www.meetup.com/js-meetup/events/event-123',
  dateTime: '2024-12-31T19:00:00-05:00',
  endTime: '2024-12-31T22:00:00-05:00',
  duration: 'PT3H',
  timezone: 'America/New_York',
  status: 'PUBLISHED',
  going: 42,
  maxTickets: 100,
  isOnline: false,
  eventType: 'PHYSICAL',
  venue: {
    id: 'venue-1',
    name: 'Tech Hub',
    address: '123 Tech Street',
    city: 'San Francisco',
    state: 'CA',
    country: 'US',
    postalCode: '94102',
    lat: 37.7749,
    lon: -122.4194,
  },
  group: {
    id: 'group-1',
    name: 'JS Enthusiasts',
    urlname: 'js-enthusiasts',
    description: 'A group for JavaScript developers',
    city: 'San Francisco',
    state: 'CA',
    country: 'US',
  },
  topics: [
    { id: 'topic-1', name: 'JavaScript' },
    { id: 'topic-2', name: 'Web Development' },
  ],
}

/**
 * Mock token response from Meetup OAuth
 */
const mockTokenResponse = {
  access_token: 'mock-access-token-12345',
  refresh_token: 'mock-refresh-token-67890',
  token_type: 'Bearer',
  expires_in: 3600,
}

/**
 * Mock GraphQL search response from Meetup API
 */
const mockGraphQLSearchResponse = {
  data: {
    rankedEvents: {
      count: 1,
      pageInfo: {
        hasNextPage: false,
        endCursor: null,
      },
      edges: [
        { node: mockMeetupEvent },
      ],
    },
  },
}

/**
 * Mock GraphQL event details response
 */
const mockGraphQLEventResponse = {
  data: {
    event: mockMeetupEvent,
  },
}

/**
 * Mock GraphQL categories response
 */
const mockGraphQLCategoriesResponse = {
  data: {
    topicCategories: [
      { id: '546', name: 'Arts & Entertainment', shortName: 'arts' },
      { id: '553', name: 'Business & Professional', shortName: 'business' },
      { id: '546', name: 'Tech', shortName: 'tech' },
    ],
  },
}

// ============================================================================
// shouldUseMockMeetup Tests
// ============================================================================

describe('shouldUseMockMeetup', () => {
  describe('in development mode with missing credentials', () => {
    it('returns true when client ID is missing', () => {
      setEnv({
        NODE_ENV: 'development',
        MEETUP_CLIENT_ID: undefined,
        MEETUP_CLIENT_SECRET: 'test-secret',
      })
      expect(shouldUseMockMeetup()).toBe(true)
    })

    it('returns true when client secret is missing', () => {
      setEnv({
        NODE_ENV: 'development',
        MEETUP_CLIENT_ID: 'test-id',
        MEETUP_CLIENT_SECRET: undefined,
      })
      expect(shouldUseMockMeetup()).toBe(true)
    })

    it('returns true when both credentials are missing', () => {
      setEnv({
        NODE_ENV: 'development',
        MEETUP_CLIENT_ID: undefined,
        MEETUP_CLIENT_SECRET: undefined,
      })
      expect(shouldUseMockMeetup()).toBe(true)
    })
  })

  describe('in development mode with credentials present', () => {
    it('returns false', () => {
      setEnv({
        NODE_ENV: 'development',
        MEETUP_CLIENT_ID: 'test-id',
        MEETUP_CLIENT_SECRET: 'test-secret',
      })
      expect(shouldUseMockMeetup()).toBe(false)
    })
  })

  describe('in production mode', () => {
    it('returns false even with missing credentials', () => {
      setEnv({
        NODE_ENV: 'production',
        MEETUP_CLIENT_ID: undefined,
        MEETUP_CLIENT_SECRET: undefined,
      })
      expect(shouldUseMockMeetup()).toBe(false)
    })
  })

  describe('in test mode', () => {
    it('returns false even with missing credentials', () => {
      setEnv({
        NODE_ENV: 'test',
        MEETUP_CLIENT_ID: undefined,
        MEETUP_CLIENT_SECRET: undefined,
      })
      expect(shouldUseMockMeetup()).toBe(false)
    })
  })
})

// ============================================================================
// getAuthorizationUrl Tests
// ============================================================================

describe('getAuthorizationUrl', () => {
  beforeEach(() => {
    setMeetupCredentials()
  })

  describe('URL construction', () => {
    it('generates a valid authorization URL', () => {
      const url = getAuthorizationUrl()

      expect(url).toContain('https://secure.meetup.com/oauth2/authorize')
      expect(url).toContain('client_id=test-client-id')
      expect(url).toContain('redirect_uri=')
      expect(url).toContain('response_type=code')
    })

    it('includes state parameter when provided', () => {
      const state = 'random-state-123'
      const url = getAuthorizationUrl(state)

      expect(url).toContain(`state=${state}`)
    })

    it('does not include state parameter when not provided', () => {
      const url = getAuthorizationUrl()

      expect(url).not.toContain('state=')
    })

    it('properly encodes the redirect URI', () => {
      const url = getAuthorizationUrl()
      const urlObj = new URL(url)
      const redirectUri = urlObj.searchParams.get('redirect_uri')

      expect(redirectUri).toBe('http://localhost:3000/api/auth/meetup')
    })

    it('includes required scopes', () => {
      const url = getAuthorizationUrl()

      expect(url).toContain('scope=')
      expect(url).toContain('basic')
      expect(url).toContain('event_management')
    })
  })
})

// ============================================================================
// exchangeCodeForTokens Tests
// ============================================================================

describe('exchangeCodeForTokens', () => {
  describe('successful token exchange', () => {
    beforeEach(() => {
      setMeetupCredentials()
    })

    it('exchanges authorization code for tokens', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockTokenResponse,
      })

      const tokens = await exchangeCodeForTokens('auth-code-123')

      expect(tokens.accessToken).toBe('mock-access-token-12345')
      expect(tokens.refreshToken).toBe('mock-refresh-token-67890')
      expect(tokens.tokenType).toBe('Bearer')
    })

    it('calculates expiration date when expires_in is provided', async () => {
      const now = Date.now()
      vi.spyOn(Date, 'now').mockReturnValue(now)

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockTokenResponse,
      })

      const tokens = await exchangeCodeForTokens('auth-code-123')

      expect(tokens.expiresAt).toBeInstanceOf(Date)
      expect(tokens.expiresAt?.getTime()).toBe(now + 3600 * 1000)
    })

    it('sends correct request parameters', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockTokenResponse,
      })

      await exchangeCodeForTokens('auth-code-123')

      expect(mockFetch).toHaveBeenCalledTimes(1)
      const [url, options] = mockFetch.mock.calls[0]

      expect(url).toBe('https://secure.meetup.com/oauth2/access')
      expect(options.method).toBe('POST')
      expect(options.headers['Content-Type']).toBe('application/x-www-form-urlencoded')

      const body = options.body as URLSearchParams
      expect(body.get('grant_type')).toBe('authorization_code')
      expect(body.get('code')).toBe('auth-code-123')
      expect(body.get('client_id')).toBe('test-client-id')
      expect(body.get('client_secret')).toBe('test-client-secret')
    })
  })

  describe('mock mode', () => {
    it('returns mock tokens in development mode without credentials', async () => {
      setEnv({
        NODE_ENV: 'development',
        MEETUP_CLIENT_ID: undefined,
        MEETUP_CLIENT_SECRET: undefined,
      })

      const tokens = await exchangeCodeForTokens('any-code')

      expect(tokens.accessToken).toBe('mock_meetup_access_token')
      expect(tokens.refreshToken).toBe('mock_meetup_refresh_token')
      expect(tokens.tokenType).toBe('Bearer')
      expect(mockFetch).not.toHaveBeenCalled()
    })
  })

  describe('error handling', () => {
    beforeEach(() => {
      setMeetupCredentials()
    })

    it('throws MeetupApiError on failed request', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: async () => ({
          error: 'invalid_grant',
          error_description: 'The authorization code has expired',
        }),
      })

      await expect(exchangeCodeForTokens('expired-code')).rejects.toThrow(MeetupApiError)
    })

    it('includes error details in the exception', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: async () => ({
          error: 'invalid_grant',
          error_description: 'The authorization code has expired',
        }),
      })

      try {
        await exchangeCodeForTokens('expired-code')
        expect.fail('Should have thrown an error')
      } catch (error) {
        expect(error).toBeInstanceOf(MeetupApiError)
        const apiError = error as MeetupApiError
        expect(apiError.status).toBe(400)
        expect(apiError.errorCode).toBe('invalid_grant')
        expect(apiError.message).toBe('The authorization code has expired')
      }
    })
  })
})

// ============================================================================
// refreshAccessToken Tests
// ============================================================================

describe('refreshAccessToken', () => {
  describe('successful token refresh', () => {
    beforeEach(() => {
      setMeetupCredentials()
    })

    it('refreshes the access token', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: 'new-access-token',
          refresh_token: 'new-refresh-token',
          token_type: 'Bearer',
          expires_in: 7200,
        }),
      })

      const tokens = await refreshAccessToken('old-refresh-token')

      expect(tokens.accessToken).toBe('new-access-token')
      expect(tokens.refreshToken).toBe('new-refresh-token')
    })

    it('preserves original refresh token if new one is not provided', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: 'new-access-token',
          token_type: 'Bearer',
        }),
      })

      const tokens = await refreshAccessToken('original-refresh-token')

      expect(tokens.refreshToken).toBe('original-refresh-token')
    })

    it('sends correct request parameters', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockTokenResponse,
      })

      await refreshAccessToken('refresh-token-xyz')

      const [url, options] = mockFetch.mock.calls[0]
      const body = options.body as URLSearchParams

      expect(url).toBe('https://secure.meetup.com/oauth2/access')
      expect(body.get('grant_type')).toBe('refresh_token')
      expect(body.get('refresh_token')).toBe('refresh-token-xyz')
    })
  })

  describe('mock mode', () => {
    it('returns mock tokens in development mode without credentials', async () => {
      setEnv({
        NODE_ENV: 'development',
        MEETUP_CLIENT_ID: undefined,
        MEETUP_CLIENT_SECRET: undefined,
      })

      const tokens = await refreshAccessToken('any-token')

      expect(tokens.accessToken).toBe('mock_meetup_access_token')
      expect(mockFetch).not.toHaveBeenCalled()
    })
  })

  describe('error handling', () => {
    beforeEach(() => {
      setMeetupCredentials()
    })

    it('throws MeetupApiError on invalid refresh token', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: async () => ({
          error: 'invalid_grant',
          error_description: 'The refresh token is invalid or expired',
        }),
      })

      await expect(refreshAccessToken('invalid-token')).rejects.toThrow(MeetupApiError)
    })

    it('marks token-related errors with isTokenExpired flag', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: async () => ({
          error: 'invalid_grant',
          error_description: 'Token expired',
        }),
      })

      try {
        await refreshAccessToken('expired-token')
        expect.fail('Should have thrown an error')
      } catch (error) {
        expect(error).toBeInstanceOf(MeetupApiError)
        const apiError = error as MeetupApiError
        expect(apiError.isTokenExpired).toBe(true)
      }
    })
  })
})

// ============================================================================
// searchEvents Tests (GraphQL)
// ============================================================================

describe('searchEvents', () => {
  describe('GraphQL query execution', () => {
    beforeEach(() => {
      setMeetupCredentials()
    })

    it('sends GraphQL request to correct endpoint', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockGraphQLSearchResponse,
      })

      const params: MeetupSearchParams = {
        latitude: 37.7749,
        longitude: -122.4194,
      }

      await searchEvents('access-token', params)

      expect(mockFetch).toHaveBeenCalledTimes(1)
      const [url] = mockFetch.mock.calls[0]
      expect(url).toBe('https://api.meetup.com/gql')
    })

    it('includes Bearer token in Authorization header', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockGraphQLSearchResponse,
      })

      await searchEvents('my-access-token', {
        latitude: 37.7749,
        longitude: -122.4194,
      })

      const [, options] = mockFetch.mock.calls[0]
      expect(options.headers.Authorization).toBe('Bearer my-access-token')
    })

    it('returns events from GraphQL response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockGraphQLSearchResponse,
      })

      const result = await searchEvents('access-token', {
        latitude: 37.7749,
        longitude: -122.4194,
      })

      expect(result.events).toHaveLength(1)
      expect(result.events[0].id).toBe('event-123')
      expect(result.events[0].title).toBe('JavaScript Developers Meetup')
      expect(result.totalCount).toBe(1)
      expect(result.pageInfo.hasNextPage).toBe(false)
    })

    it('handles empty events array', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            rankedEvents: {
              count: 0,
              pageInfo: {
                hasNextPage: false,
                endCursor: null,
              },
              edges: [],
            },
          },
        }),
      })

      const result = await searchEvents('access-token', {
        latitude: 37.7749,
        longitude: -122.4194,
      })

      expect(result.events).toEqual([])
      expect(result.totalCount).toBe(0)
    })
  })

  describe('query parameters', () => {
    beforeEach(() => {
      setMeetupCredentials()
    })

    it('includes location parameters in GraphQL variables', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockGraphQLSearchResponse,
      })

      await searchEvents('access-token', {
        latitude: 37.7749,
        longitude: -122.4194,
      })

      const [, options] = mockFetch.mock.calls[0]
      const body = JSON.parse(options.body)

      expect(body.variables.lat).toBe(37.7749)
      expect(body.variables.lon).toBe(-122.4194)
    })

    it('includes radius when provided', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockGraphQLSearchResponse,
      })

      await searchEvents('access-token', {
        latitude: 37.7749,
        longitude: -122.4194,
        radius: 25,
      })

      const [, options] = mockFetch.mock.calls[0]
      const body = JSON.parse(options.body)

      expect(body.variables.radius).toBe(25)
    })

    it('includes topicCategoryId when provided', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockGraphQLSearchResponse,
      })

      await searchEvents('access-token', {
        latitude: 37.7749,
        longitude: -122.4194,
        topicCategoryId: '546',
      })

      const [, options] = mockFetch.mock.calls[0]
      const body = JSON.parse(options.body)

      expect(body.variables.topicCategoryId).toBe('546')
    })

    it('includes date range when provided', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockGraphQLSearchResponse,
      })

      await searchEvents('access-token', {
        latitude: 37.7749,
        longitude: -122.4194,
        startDate: '2024-01-01T00:00:00Z',
        endDate: '2024-12-31T23:59:59Z',
      })

      const [, options] = mockFetch.mock.calls[0]
      const body = JSON.parse(options.body)

      expect(body.variables.startDateRange).toBe('2024-01-01T00:00:00Z')
      expect(body.variables.endDateRange).toBe('2024-12-31T23:59:59Z')
    })

    it('includes search query when provided', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockGraphQLSearchResponse,
      })

      await searchEvents('access-token', {
        latitude: 37.7749,
        longitude: -122.4194,
        query: 'javascript',
      })

      const [, options] = mockFetch.mock.calls[0]
      const body = JSON.parse(options.body)

      expect(body.variables.query).toBe('javascript')
    })

    it('includes pagination parameters', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockGraphQLSearchResponse,
      })

      await searchEvents('access-token', {
        latitude: 37.7749,
        longitude: -122.4194,
        first: 10,
        after: 'cursor-123',
      })

      const [, options] = mockFetch.mock.calls[0]
      const body = JSON.parse(options.body)

      expect(body.variables.first).toBe(10)
      expect(body.variables.after).toBe('cursor-123')
    })

    it('defaults first to 20 when not provided', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockGraphQLSearchResponse,
      })

      await searchEvents('access-token', {
        latitude: 37.7749,
        longitude: -122.4194,
      })

      const [, options] = mockFetch.mock.calls[0]
      const body = JSON.parse(options.body)

      expect(body.variables.first).toBe(20)
    })
  })

  describe('mock mode', () => {
    it('returns mock events in development mode without credentials', async () => {
      setEnv({
        NODE_ENV: 'development',
        MEETUP_CLIENT_ID: undefined,
        MEETUP_CLIENT_SECRET: undefined,
      })

      const result = await searchEvents('any-token', {
        latitude: 37.7749,
        longitude: -122.4194,
      })

      expect(result.events.length).toBeGreaterThan(0)
      expect(result.events[0].title).toBeDefined()
      expect(mockFetch).not.toHaveBeenCalled()
    })
  })

  describe('error handling', () => {
    beforeEach(() => {
      setMeetupCredentials()
    })

    it('throws MeetupApiError on HTTP error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: async () => ({
          error: 'INTERNAL_ERROR',
          error_description: 'Something went wrong',
        }),
      })

      await expect(
        searchEvents('access-token', {
          latitude: 37.7749,
          longitude: -122.4194,
        })
      ).rejects.toThrow(MeetupApiError)
    })

    it('handles GraphQL errors returned with 200 status', async () => {
      // Meetup returns 200 status even with GraphQL errors
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          errors: [
            {
              message: 'Not authenticated',
              extensions: { code: 'UNAUTHENTICATED' },
            },
          ],
        }),
      })

      try {
        await searchEvents('invalid-token', {
          latitude: 37.7749,
          longitude: -122.4194,
        })
        expect.fail('Should have thrown an error')
      } catch (error) {
        expect(error).toBeInstanceOf(MeetupApiError)
        const apiError = error as MeetupApiError
        expect(apiError.graphqlErrors).toBeDefined()
        expect(apiError.graphqlErrors?.[0].message).toBe('Not authenticated')
      }
    })

    it('identifies rate limit errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
        json: async () => ({
          error: 'RATE_LIMIT_EXCEEDED',
          error_description: 'Too many requests',
        }),
      })

      try {
        await searchEvents('access-token', {
          latitude: 37.7749,
          longitude: -122.4194,
        })
        expect.fail('Should have thrown an error')
      } catch (error) {
        expect(error).toBeInstanceOf(MeetupApiError)
        const apiError = error as MeetupApiError
        expect(apiError.isRateLimit).toBe(true)
        expect(apiError.status).toBe(429)
      }
    })

    it('identifies token expired errors from HTTP 401', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: async () => ({
          error: 'INVALID_AUTH',
          error_description: 'Access token is invalid',
        }),
      })

      try {
        await searchEvents('expired-token', {
          latitude: 37.7749,
          longitude: -122.4194,
        })
        expect.fail('Should have thrown an error')
      } catch (error) {
        expect(error).toBeInstanceOf(MeetupApiError)
        const apiError = error as MeetupApiError
        expect(apiError.isTokenExpired).toBe(true)
      }
    })

    it('identifies token expired from GraphQL UNAUTHENTICATED error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          errors: [
            {
              message: 'Access denied',
              extensions: { code: 'UNAUTHENTICATED' },
            },
          ],
        }),
      })

      try {
        await searchEvents('expired-token', {
          latitude: 37.7749,
          longitude: -122.4194,
        })
        expect.fail('Should have thrown an error')
      } catch (error) {
        expect(error).toBeInstanceOf(MeetupApiError)
        const apiError = error as MeetupApiError
        expect(apiError.isTokenExpired).toBe(true)
      }
    })
  })
})

// ============================================================================
// getEventDetails Tests
// ============================================================================

describe('getEventDetails', () => {
  describe('successful retrieval', () => {
    beforeEach(() => {
      setMeetupCredentials()
    })

    it('fetches event details by ID via GraphQL', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockGraphQLEventResponse,
      })

      const event = await getEventDetails('access-token', 'event-123')

      expect(event.id).toBe('event-123')
      expect(event.title).toBe('JavaScript Developers Meetup')
    })

    it('sends correct GraphQL query', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockGraphQLEventResponse,
      })

      await getEventDetails('access-token', 'event-456')

      const [url, options] = mockFetch.mock.calls[0]
      expect(url).toBe('https://api.meetup.com/gql')

      const body = JSON.parse(options.body)
      expect(body.variables.id).toBe('event-456')
    })
  })

  describe('mock mode', () => {
    it('returns mock event in development mode without credentials', async () => {
      setEnv({
        NODE_ENV: 'development',
        MEETUP_CLIENT_ID: undefined,
        MEETUP_CLIENT_SECRET: undefined,
      })

      const event = await getEventDetails('any-token', 'any-event-id')

      expect(event.id).toBe('any-event-id')
      expect(event.title).toBeDefined()
      expect(mockFetch).not.toHaveBeenCalled()
    })
  })

  describe('error handling', () => {
    beforeEach(() => {
      setMeetupCredentials()
    })

    it('throws MeetupApiError when event not found', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            event: null,
          },
        }),
      })

      await expect(
        getEventDetails('access-token', 'nonexistent-event')
      ).rejects.toThrow(MeetupApiError)
    })

    it('throws 404 error for null event response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            event: null,
          },
        }),
      })

      try {
        await getEventDetails('access-token', 'nonexistent-event')
        expect.fail('Should have thrown an error')
      } catch (error) {
        expect(error).toBeInstanceOf(MeetupApiError)
        const apiError = error as MeetupApiError
        expect(apiError.status).toBe(404)
        expect(apiError.errorCode).toBe('EVENT_NOT_FOUND')
      }
    })
  })
})

// ============================================================================
// getCategories Tests
// ============================================================================

describe('getCategories', () => {
  describe('successful retrieval', () => {
    beforeEach(() => {
      setMeetupCredentials()
    })

    it('fetches all topic categories', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockGraphQLCategoriesResponse,
      })

      const categories = await getCategories('access-token')

      expect(categories).toHaveLength(3)
      expect(categories[0].id).toBe('546')
      expect(categories[0].name).toBe('Arts & Entertainment')
    })

    it('returns empty array when no categories returned', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            topicCategories: null,
          },
        }),
      })

      const categories = await getCategories('access-token')

      expect(categories).toEqual([])
    })
  })

  describe('mock mode', () => {
    it('returns mock categories in development mode without credentials', async () => {
      setEnv({
        NODE_ENV: 'development',
        MEETUP_CLIENT_ID: undefined,
        MEETUP_CLIENT_SECRET: undefined,
      })

      const categories = await getCategories('any-token')

      expect(categories.length).toBeGreaterThan(0)
      expect(categories[0].id).toBeDefined()
      expect(categories[0].name).toBeDefined()
      expect(mockFetch).not.toHaveBeenCalled()
    })
  })
})

// ============================================================================
// isTokenExpired Tests
// ============================================================================

describe('isTokenExpired', () => {
  describe('when expiresAt is undefined', () => {
    it('returns false (assume token is valid)', () => {
      expect(isTokenExpired(undefined)).toBe(false)
    })
  })

  describe('when token is expired', () => {
    it('returns true for past date', () => {
      const pastDate = new Date(Date.now() - 1000 * 60 * 60) // 1 hour ago
      expect(isTokenExpired(pastDate)).toBe(true)
    })
  })

  describe('when token is within buffer period', () => {
    it('returns true when expiring within default 5 minute buffer', () => {
      const nearFuture = new Date(Date.now() + 1000 * 60 * 3) // 3 minutes from now
      expect(isTokenExpired(nearFuture)).toBe(true)
    })

    it('respects custom buffer time', () => {
      const nearFuture = new Date(Date.now() + 1000 * 60 * 3) // 3 minutes from now
      expect(isTokenExpired(nearFuture, 2)).toBe(false) // 2 minute buffer - not expired
      expect(isTokenExpired(nearFuture, 5)).toBe(true) // 5 minute buffer - expired
    })
  })

  describe('when token is not expired', () => {
    it('returns false for future date outside buffer', () => {
      const futureDate = new Date(Date.now() + 1000 * 60 * 60) // 1 hour from now
      expect(isTokenExpired(futureDate)).toBe(false)
    })
  })
})

// ============================================================================
// normalizeEvent Tests
// ============================================================================

describe('normalizeEvent', () => {
  describe('complete event data', () => {
    it('normalizes event with all fields', () => {
      const normalized = normalizeEvent(mockMeetupEvent)

      expect(normalized.externalId).toBe('event-123')
      expect(normalized.platform).toBe('meetup')
      expect(normalized.title).toBe('JavaScript Developers Meetup')
      expect(normalized.description).toBe('A great meetup for JS developers')
      expect(normalized.dateTime).toBe('2024-12-31T19:00:00-05:00')
      expect(normalized.endTime).toBe('2024-12-31T22:00:00-05:00')
      expect(normalized.venueName).toBe('Tech Hub')
      expect(normalized.venueAddress).toContain('123 Tech Street')
      expect(normalized.venueAddress).toContain('San Francisco')
      expect(normalized.latitude).toBe(37.7749)
      expect(normalized.longitude).toBe(-122.4194)
      expect(normalized.url).toBe('https://www.meetup.com/js-meetup/events/event-123')
    })
  })

  describe('partial event data', () => {
    it('handles missing description', () => {
      const eventWithoutDescription: MeetupEvent = {
        ...mockMeetupEvent,
        description: undefined,
      }

      const normalized = normalizeEvent(eventWithoutDescription)

      expect(normalized.description).toBeNull()
    })

    it('handles missing venue', () => {
      const eventWithoutVenue: MeetupEvent = {
        ...mockMeetupEvent,
        venue: undefined,
      }

      const normalized = normalizeEvent(eventWithoutVenue)

      expect(normalized.venueName).toBeNull()
      expect(normalized.venueAddress).toBeNull()
      expect(normalized.latitude).toBeNull()
      expect(normalized.longitude).toBeNull()
    })

    it('handles missing end time', () => {
      const eventWithoutEnd: MeetupEvent = {
        ...mockMeetupEvent,
        endTime: undefined,
      }

      const normalized = normalizeEvent(eventWithoutEnd)

      expect(normalized.endTime).toBeNull()
    })

    it('handles venue without coordinates', () => {
      const eventWithPartialVenue: MeetupEvent = {
        ...mockMeetupEvent,
        venue: {
          id: 'venue-1',
          name: 'Somewhere',
        },
      }

      const normalized = normalizeEvent(eventWithPartialVenue)

      expect(normalized.venueName).toBe('Somewhere')
      expect(normalized.latitude).toBeNull()
      expect(normalized.longitude).toBeNull()
    })

    it('handles online events without venue', () => {
      const onlineEvent: MeetupEvent = {
        ...mockMeetupEvent,
        isOnline: true,
        eventType: 'ONLINE',
        venue: undefined,
      }

      const normalized = normalizeEvent(onlineEvent)

      expect(normalized.venueName).toBeNull()
      expect(normalized.venueAddress).toBeNull()
    })
  })

  describe('venue address construction', () => {
    it('builds full address from venue parts', () => {
      const normalized = normalizeEvent(mockMeetupEvent)

      expect(normalized.venueAddress).toContain('123 Tech Street')
      expect(normalized.venueAddress).toContain('San Francisco')
      expect(normalized.venueAddress).toContain('CA')
      expect(normalized.venueAddress).toContain('94102')
      expect(normalized.venueAddress).toContain('US')
    })

    it('handles partial venue address', () => {
      const eventWithPartialAddress: MeetupEvent = {
        ...mockMeetupEvent,
        venue: {
          id: 'venue-1',
          name: 'Some Place',
          city: 'Oakland',
          country: 'US',
        },
      }

      const normalized = normalizeEvent(eventWithPartialAddress)

      expect(normalized.venueAddress).toBe('Oakland, US')
    })
  })
})

// ============================================================================
// MeetupApiError Tests
// ============================================================================

describe('MeetupApiError', () => {
  describe('error construction', () => {
    it('creates error with all properties', () => {
      const error = new MeetupApiError({
        status: 401,
        error: 'UNAUTHENTICATED',
        errorDescription: 'Token is invalid',
        isRateLimit: false,
        isTokenExpired: true,
      })

      expect(error.name).toBe('MeetupApiError')
      expect(error.status).toBe(401)
      expect(error.errorCode).toBe('UNAUTHENTICATED')
      expect(error.message).toBe('Token is invalid')
      expect(error.isRateLimit).toBe(false)
      expect(error.isTokenExpired).toBe(true)
    })

    it('uses error code as message when description is missing', () => {
      const error = new MeetupApiError({
        status: 500,
        error: 'INTERNAL_ERROR',
      })

      expect(error.message).toBe('INTERNAL_ERROR')
    })

    it('defaults boolean flags to false', () => {
      const error = new MeetupApiError({
        status: 400,
        error: 'BAD_REQUEST',
      })

      expect(error.isRateLimit).toBe(false)
      expect(error.isTokenExpired).toBe(false)
    })

    it('stores GraphQL errors when provided', () => {
      const graphqlErrors = [
        { message: 'Field error', extensions: { code: 'FIELD_ERROR' } },
      ]

      const error = new MeetupApiError({
        status: 400,
        error: 'GRAPHQL_ERROR',
        graphqlErrors,
      })

      expect(error.graphqlErrors).toEqual(graphqlErrors)
    })
  })

  describe('error inheritance', () => {
    it('extends Error class', () => {
      const error = new MeetupApiError({
        status: 400,
        error: 'TEST_ERROR',
      })

      expect(error).toBeInstanceOf(Error)
      expect(error).toBeInstanceOf(MeetupApiError)
    })
  })
})

// ============================================================================
// Edge Cases and Integration Tests
// ============================================================================

describe('Edge Cases', () => {
  describe('environment variable handling', () => {
    it('handles empty string credentials as missing', () => {
      setEnv({
        NODE_ENV: 'development',
        MEETUP_CLIENT_ID: '',
        MEETUP_CLIENT_SECRET: '',
      })
      expect(shouldUseMockMeetup()).toBe(true)
    })
  })

  describe('API response edge cases', () => {
    beforeEach(() => {
      setMeetupCredentials()
    })

    it('handles non-JSON error response gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: async () => {
          throw new Error('Not JSON')
        },
      })

      try {
        await searchEvents('access-token', {
          latitude: 37.7749,
          longitude: -122.4194,
        })
        expect.fail('Should have thrown an error')
      } catch (error) {
        expect(error).toBeInstanceOf(MeetupApiError)
        const apiError = error as MeetupApiError
        expect(apiError.status).toBe(500)
      }
    })

    it('handles missing data in GraphQL response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: null,
        }),
      })

      try {
        await searchEvents('access-token', {
          latitude: 37.7749,
          longitude: -122.4194,
        })
        expect.fail('Should have thrown an error')
      } catch (error) {
        expect(error).toBeInstanceOf(MeetupApiError)
      }
    })

    it('handles rate limit error from GraphQL', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          errors: [
            {
              message: 'Rate limit exceeded',
              extensions: { code: 'RATE_LIMITED' },
            },
          ],
        }),
      })

      try {
        await searchEvents('access-token', {
          latitude: 37.7749,
          longitude: -122.4194,
        })
        expect.fail('Should have thrown an error')
      } catch (error) {
        expect(error).toBeInstanceOf(MeetupApiError)
        const apiError = error as MeetupApiError
        expect(apiError.isRateLimit).toBe(true)
      }
    })

    it('handles network errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      try {
        await searchEvents('access-token', {
          latitude: 37.7749,
          longitude: -122.4194,
        })
        expect.fail('Should have thrown an error')
      } catch (error) {
        expect(error).toBeInstanceOf(MeetupApiError)
        const apiError = error as MeetupApiError
        expect(apiError.message).toContain('Network error')
      }
    })
  })

  describe('GraphQL error parsing', () => {
    beforeEach(() => {
      setMeetupCredentials()
    })

    it('extracts error code from extensions', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          errors: [
            {
              message: 'Some GraphQL error',
              extensions: { code: 'CUSTOM_ERROR_CODE' },
            },
          ],
        }),
      })

      try {
        await searchEvents('access-token', {
          latitude: 37.7749,
          longitude: -122.4194,
        })
        expect.fail('Should have thrown an error')
      } catch (error) {
        expect(error).toBeInstanceOf(MeetupApiError)
        const apiError = error as MeetupApiError
        expect(apiError.errorCode).toBe('CUSTOM_ERROR_CODE')
      }
    })

    it('handles multiple GraphQL errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          errors: [
            { message: 'First error', extensions: { code: 'ERROR_1' } },
            { message: 'Second error', extensions: { code: 'ERROR_2' } },
          ],
        }),
      })

      try {
        await searchEvents('access-token', {
          latitude: 37.7749,
          longitude: -122.4194,
        })
        expect.fail('Should have thrown an error')
      } catch (error) {
        expect(error).toBeInstanceOf(MeetupApiError)
        const apiError = error as MeetupApiError
        // Uses first error's message
        expect(apiError.message).toBe('First error')
        // Stores all errors
        expect(apiError.graphqlErrors).toHaveLength(2)
      }
    })

    it('detects authentication errors from message content', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          errors: [
            {
              message: 'You must be authenticated to perform this action',
              extensions: { code: 'FORBIDDEN' },
            },
          ],
        }),
      })

      try {
        await searchEvents('access-token', {
          latitude: 37.7749,
          longitude: -122.4194,
        })
        expect.fail('Should have thrown an error')
      } catch (error) {
        expect(error).toBeInstanceOf(MeetupApiError)
        const apiError = error as MeetupApiError
        expect(apiError.isTokenExpired).toBe(true)
      }
    })
  })
})
