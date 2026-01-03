/**
 * Unit tests for Eventbrite API client
 *
 * These tests cover:
 * - OAuth authentication flow (authorization URL, token exchange, token refresh)
 * - Event search query construction with various filters
 * - Event details retrieval
 * - Error handling for rate limits and expired tokens
 * - Mock mode detection based on environment
 * - Token expiration checking
 * - Event data normalization for database storage
 *
 * Tests use mock fetch responses and environment variable mocking.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  getAuthorizationUrl,
  exchangeCodeForTokens,
  refreshAccessToken,
  searchEvents,
  getEventDetails,
  getCategories,
  EventbriteApiError,
  shouldUseMockEventbrite,
  isTokenExpired,
  normalizeEvent,
  type EventbriteEvent,
  type EventbriteSearchParams,
  type EventbriteTokens,
} from '@/lib/api/eventbrite'

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
 * Setup environment with Eventbrite credentials
 */
function setEventbriteCredentials(): void {
  setEnv({
    NODE_ENV: 'test',
    EVENTBRITE_CLIENT_ID: 'test-client-id',
    EVENTBRITE_CLIENT_SECRET: 'test-client-secret',
    EVENTBRITE_REDIRECT_URI: 'http://localhost:3000/api/auth/eventbrite',
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
  delete process.env.EVENTBRITE_CLIENT_ID
  delete process.env.EVENTBRITE_CLIENT_SECRET
  delete process.env.EVENTBRITE_REDIRECT_URI

  // Reset __DEV__ to match the default test environment
  globalThis.__DEV__ = true

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
 * Mock Eventbrite event response
 */
const mockEventbriteEvent: EventbriteEvent = {
  id: 'event-123',
  name: {
    text: 'Tech Meetup 2024',
    html: '<p>Tech Meetup 2024</p>',
  },
  description: {
    text: 'A great tech meetup event',
    html: '<p>A great tech meetup event</p>',
  },
  url: 'https://www.eventbrite.com/e/event-123',
  start: {
    timezone: 'America/New_York',
    local: '2024-12-31T19:00:00',
    utc: '2024-12-31T00:00:00Z',
  },
  end: {
    timezone: 'America/New_York',
    local: '2024-12-31T23:00:00',
    utc: '2025-01-01T04:00:00Z',
  },
  created: '2024-01-01T00:00:00Z',
  changed: '2024-01-01T00:00:00Z',
  published: '2024-01-01T00:00:00Z',
  status: 'live',
  online_event: false,
  is_free: false,
  capacity: 500,
  venue: {
    id: 'venue-1',
    name: 'Tech Hub',
    address: {
      address_1: '123 Tech Street',
      city: 'San Francisco',
      region: 'CA',
      postal_code: '94102',
      country: 'US',
      localized_address_display: '123 Tech Street, San Francisco, CA 94102',
    },
    latitude: '37.7749',
    longitude: '-122.4194',
  },
  organizer: {
    id: 'organizer-1',
    name: 'Tech Events Inc',
  },
  category: {
    id: '102',
    name: 'Science & Technology',
    short_name: 'tech',
  },
}

/**
 * Mock token response from Eventbrite OAuth
 */
const mockTokenResponse = {
  access_token: 'mock-access-token-12345',
  refresh_token: 'mock-refresh-token-67890',
  token_type: 'Bearer',
  expires_in: 3600,
}

/**
 * Mock search response from Eventbrite API
 */
const mockSearchResponse = {
  events: [mockEventbriteEvent],
  pagination: {
    page_number: 1,
    page_size: 50,
    page_count: 1,
    object_count: 1,
    has_more_items: false,
  },
}

/**
 * Mock categories response
 */
const mockCategoriesResponse = {
  categories: [
    { id: '103', name: 'Music', short_name: 'music' },
    { id: '102', name: 'Science & Technology', short_name: 'tech' },
    { id: '110', name: 'Food & Drink', short_name: 'food' },
  ],
}

// ============================================================================
// shouldUseMockEventbrite Tests
// ============================================================================

describe('shouldUseMockEventbrite', () => {
  describe('in development mode with missing credentials', () => {
    it('returns true when client ID is missing', () => {
      setEnv({
        NODE_ENV: 'development',
        EVENTBRITE_CLIENT_ID: undefined,
        EVENTBRITE_CLIENT_SECRET: 'test-secret',
      })
      expect(shouldUseMockEventbrite()).toBe(true)
    })

    it('returns true when client secret is missing', () => {
      setEnv({
        NODE_ENV: 'development',
        EVENTBRITE_CLIENT_ID: 'test-id',
        EVENTBRITE_CLIENT_SECRET: undefined,
      })
      expect(shouldUseMockEventbrite()).toBe(true)
    })

    it('returns true when both credentials are missing', () => {
      setEnv({
        NODE_ENV: 'development',
        EVENTBRITE_CLIENT_ID: undefined,
        EVENTBRITE_CLIENT_SECRET: undefined,
      })
      expect(shouldUseMockEventbrite()).toBe(true)
    })
  })

  describe('in development mode with credentials present', () => {
    it('returns false', () => {
      setEnv({
        NODE_ENV: 'development',
        EVENTBRITE_CLIENT_ID: 'test-id',
        EVENTBRITE_CLIENT_SECRET: 'test-secret',
      })
      expect(shouldUseMockEventbrite()).toBe(false)
    })
  })

  describe('in production mode', () => {
    it('returns false even with missing credentials', () => {
      // __DEV__ takes precedence over NODE_ENV in isDevMode()
      globalThis.__DEV__ = false
      setEnv({
        NODE_ENV: 'production',
        EVENTBRITE_CLIENT_ID: undefined,
        EVENTBRITE_CLIENT_SECRET: undefined,
      })
      expect(shouldUseMockEventbrite()).toBe(false)
    })
  })

  describe('in test mode', () => {
    it('returns false even with missing credentials', () => {
      // When __DEV__ is false, it's not dev mode regardless of NODE_ENV
      globalThis.__DEV__ = false
      setEnv({
        NODE_ENV: 'test',
        EVENTBRITE_CLIENT_ID: undefined,
        EVENTBRITE_CLIENT_SECRET: undefined,
      })
      expect(shouldUseMockEventbrite()).toBe(false)
    })
  })
})

// ============================================================================
// getAuthorizationUrl Tests
// ============================================================================

describe('getAuthorizationUrl', () => {
  beforeEach(() => {
    setEventbriteCredentials()
  })

  describe('URL construction', () => {
    it('generates a valid authorization URL', () => {
      const url = getAuthorizationUrl()

      expect(url).toContain('https://www.eventbrite.com/oauth/authorize')
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

      expect(redirectUri).toBe('http://localhost:3000/api/auth/eventbrite')
    })
  })
})

// ============================================================================
// exchangeCodeForTokens Tests
// ============================================================================

describe('exchangeCodeForTokens', () => {
  describe('successful token exchange', () => {
    beforeEach(() => {
      setEventbriteCredentials()
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

      expect(url).toBe('https://www.eventbrite.com/oauth/token')
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
        EVENTBRITE_CLIENT_ID: undefined,
        EVENTBRITE_CLIENT_SECRET: undefined,
      })

      const tokens = await exchangeCodeForTokens('any-code')

      expect(tokens.accessToken).toBe('mock_eventbrite_access_token')
      expect(tokens.refreshToken).toBe('mock_eventbrite_refresh_token')
      expect(tokens.tokenType).toBe('Bearer')
      expect(mockFetch).not.toHaveBeenCalled()
    })
  })

  describe('error handling', () => {
    beforeEach(() => {
      setEventbriteCredentials()
    })

    it('throws EventbriteApiError on failed request', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: async () => ({
          error: 'invalid_grant',
          error_description: 'The authorization code has expired',
        }),
      })

      await expect(exchangeCodeForTokens('expired-code')).rejects.toThrow(EventbriteApiError)
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
        expect(error).toBeInstanceOf(EventbriteApiError)
        const apiError = error as EventbriteApiError
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
      setEventbriteCredentials()
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

      expect(body.get('grant_type')).toBe('refresh_token')
      expect(body.get('refresh_token')).toBe('refresh-token-xyz')
    })
  })

  describe('mock mode', () => {
    it('returns mock tokens in development mode without credentials', async () => {
      setEnv({
        NODE_ENV: 'development',
        EVENTBRITE_CLIENT_ID: undefined,
        EVENTBRITE_CLIENT_SECRET: undefined,
      })

      const tokens = await refreshAccessToken('any-token')

      expect(tokens.accessToken).toBe('mock_eventbrite_access_token')
      expect(mockFetch).not.toHaveBeenCalled()
    })
  })

  describe('error handling', () => {
    beforeEach(() => {
      setEventbriteCredentials()
    })

    it('throws EventbriteApiError on invalid refresh token', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: async () => ({
          error: 'INVALID_AUTH',
          error_description: 'The refresh token is invalid or expired',
        }),
      })

      await expect(refreshAccessToken('invalid-token')).rejects.toThrow(EventbriteApiError)
    })

    it('marks token-related errors with isTokenExpired flag', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: async () => ({
          error: 'INVALID_AUTH',
          error_description: 'Token expired',
        }),
      })

      try {
        await refreshAccessToken('expired-token')
        expect.fail('Should have thrown an error')
      } catch (error) {
        expect(error).toBeInstanceOf(EventbriteApiError)
        const apiError = error as EventbriteApiError
        expect(apiError.isTokenExpired).toBe(true)
      }
    })
  })
})

// ============================================================================
// searchEvents Tests
// ============================================================================

describe('searchEvents', () => {
  describe('query construction', () => {
    beforeEach(() => {
      setEventbriteCredentials()
    })

    it('constructs URL with location parameters', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockSearchResponse,
      })

      const params: EventbriteSearchParams = {
        latitude: 37.7749,
        longitude: -122.4194,
      }

      await searchEvents('access-token', params)

      const [url] = mockFetch.mock.calls[0]
      expect(url).toContain('location.latitude=37.7749')
      expect(url).toContain('location.longitude=-122.4194')
    })

    it('includes radius in query when provided', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockSearchResponse,
      })

      const params: EventbriteSearchParams = {
        latitude: 37.7749,
        longitude: -122.4194,
        radius: '25km',
      }

      await searchEvents('access-token', params)

      const [url] = mockFetch.mock.calls[0]
      expect(url).toContain('location.within=25km')
    })

    it('includes categories when provided', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockSearchResponse,
      })

      const params: EventbriteSearchParams = {
        latitude: 37.7749,
        longitude: -122.4194,
        categories: ['102', '103'],
      }

      await searchEvents('access-token', params)

      const [url] = mockFetch.mock.calls[0]
      expect(url).toContain('categories=102%2C103')
    })

    it('includes date range when provided', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockSearchResponse,
      })

      const params: EventbriteSearchParams = {
        latitude: 37.7749,
        longitude: -122.4194,
        startDate: '2024-01-01T00:00:00Z',
        endDate: '2024-12-31T23:59:59Z',
      }

      await searchEvents('access-token', params)

      const [url] = mockFetch.mock.calls[0]
      expect(url).toContain('start_date.range_start=')
      expect(url).toContain('start_date.range_end=')
    })

    it('includes search query when provided', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockSearchResponse,
      })

      const params: EventbriteSearchParams = {
        latitude: 37.7749,
        longitude: -122.4194,
        q: 'tech meetup',
      }

      await searchEvents('access-token', params)

      const [url] = mockFetch.mock.calls[0]
      expect(url).toContain('q=tech+meetup')
    })

    it('includes pagination parameters', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockSearchResponse,
      })

      const params: EventbriteSearchParams = {
        latitude: 37.7749,
        longitude: -122.4194,
        page: 2,
        pageSize: 25,
      }

      await searchEvents('access-token', params)

      const [url] = mockFetch.mock.calls[0]
      expect(url).toContain('page=2')
      expect(url).toContain('page_size=25')
    })

    it('limits page size to maximum of 50', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockSearchResponse,
      })

      const params: EventbriteSearchParams = {
        latitude: 37.7749,
        longitude: -122.4194,
        pageSize: 100,
      }

      await searchEvents('access-token', params)

      const [url] = mockFetch.mock.calls[0]
      expect(url).toContain('page_size=50')
    })

    it('requests expanded venue, organizer, and category data', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockSearchResponse,
      })

      const params: EventbriteSearchParams = {
        latitude: 37.7749,
        longitude: -122.4194,
      }

      await searchEvents('access-token', params)

      const [url] = mockFetch.mock.calls[0]
      expect(url).toContain('expand=venue%2Corganizer%2Ccategory')
    })
  })

  describe('response parsing', () => {
    beforeEach(() => {
      setEventbriteCredentials()
    })

    it('returns events and pagination from response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockSearchResponse,
      })

      const result = await searchEvents('access-token', {
        latitude: 37.7749,
        longitude: -122.4194,
      })

      expect(result.events).toHaveLength(1)
      expect(result.events[0].id).toBe('event-123')
      expect(result.pagination.pageNumber).toBe(1)
      expect(result.pagination.hasMoreItems).toBe(false)
    })

    it('handles empty events array', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          events: [],
          pagination: {
            page_number: 1,
            page_size: 50,
            page_count: 0,
            object_count: 0,
            has_more_items: false,
          },
        }),
      })

      const result = await searchEvents('access-token', {
        latitude: 37.7749,
        longitude: -122.4194,
      })

      expect(result.events).toEqual([])
      expect(result.pagination.objectCount).toBe(0)
    })
  })

  describe('authentication', () => {
    beforeEach(() => {
      setEventbriteCredentials()
    })

    it('includes Bearer token in Authorization header', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockSearchResponse,
      })

      await searchEvents('my-access-token', {
        latitude: 37.7749,
        longitude: -122.4194,
      })

      const [, options] = mockFetch.mock.calls[0]
      expect(options.headers.Authorization).toBe('Bearer my-access-token')
    })
  })

  describe('mock mode', () => {
    it('returns mock events in development mode without credentials', async () => {
      setEnv({
        NODE_ENV: 'development',
        EVENTBRITE_CLIENT_ID: undefined,
        EVENTBRITE_CLIENT_SECRET: undefined,
      })

      const result = await searchEvents('any-token', {
        latitude: 37.7749,
        longitude: -122.4194,
      })

      expect(result.events.length).toBeGreaterThan(0)
      expect(result.events[0].name.text).toBeDefined()
      expect(mockFetch).not.toHaveBeenCalled()
    })
  })

  describe('error handling', () => {
    beforeEach(() => {
      setEventbriteCredentials()
    })

    it('throws EventbriteApiError on API error', async () => {
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
      ).rejects.toThrow(EventbriteApiError)
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
        expect(error).toBeInstanceOf(EventbriteApiError)
        const apiError = error as EventbriteApiError
        expect(apiError.isRateLimit).toBe(true)
        expect(apiError.status).toBe(429)
      }
    })

    it('identifies token expired errors', async () => {
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
        expect(error).toBeInstanceOf(EventbriteApiError)
        const apiError = error as EventbriteApiError
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
      setEventbriteCredentials()
    })

    it('fetches event details by ID', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockEventbriteEvent,
      })

      const event = await getEventDetails('access-token', 'event-123')

      expect(event.id).toBe('event-123')
      expect(event.name.text).toBe('Tech Meetup 2024')
    })

    it('constructs correct API URL', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockEventbriteEvent,
      })

      await getEventDetails('access-token', 'event-456')

      const [url] = mockFetch.mock.calls[0]
      expect(url).toContain('/events/event-456/')
      expect(url).toContain('expand=venue%2Corganizer%2Ccategory')
    })
  })

  describe('mock mode', () => {
    it('returns mock event in development mode without credentials', async () => {
      setEnv({
        NODE_ENV: 'development',
        EVENTBRITE_CLIENT_ID: undefined,
        EVENTBRITE_CLIENT_SECRET: undefined,
      })

      const event = await getEventDetails('any-token', 'any-event-id')

      expect(event.id).toBe('any-event-id')
      expect(event.name.text).toBeDefined()
      expect(mockFetch).not.toHaveBeenCalled()
    })
  })

  describe('error handling', () => {
    beforeEach(() => {
      setEventbriteCredentials()
    })

    it('throws EventbriteApiError when event not found', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: async () => ({
          error: 'NOT_FOUND',
          error_description: 'Event not found',
        }),
      })

      await expect(
        getEventDetails('access-token', 'nonexistent-event')
      ).rejects.toThrow(EventbriteApiError)
    })
  })
})

// ============================================================================
// getCategories Tests
// ============================================================================

describe('getCategories', () => {
  describe('successful retrieval', () => {
    beforeEach(() => {
      setEventbriteCredentials()
    })

    it('fetches all categories', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockCategoriesResponse,
      })

      const categories = await getCategories('access-token')

      expect(categories).toHaveLength(3)
      expect(categories[0].id).toBe('103')
      expect(categories[0].name).toBe('Music')
    })

    it('returns empty array when no categories returned', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      })

      const categories = await getCategories('access-token')

      expect(categories).toEqual([])
    })
  })

  describe('mock mode', () => {
    it('returns mock categories in development mode without credentials', async () => {
      setEnv({
        NODE_ENV: 'development',
        EVENTBRITE_CLIENT_ID: undefined,
        EVENTBRITE_CLIENT_SECRET: undefined,
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
    it('returns false (Eventbrite tokens typically do not expire)', () => {
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
      const normalized = normalizeEvent(mockEventbriteEvent)

      expect(normalized.externalId).toBe('event-123')
      expect(normalized.platform).toBe('eventbrite')
      expect(normalized.title).toBe('Tech Meetup 2024')
      expect(normalized.description).toBe('A great tech meetup event')
      expect(normalized.dateTime).toBe('2024-12-31T00:00:00Z')
      expect(normalized.endTime).toBe('2025-01-01T04:00:00Z')
      expect(normalized.venueName).toBe('Tech Hub')
      expect(normalized.venueAddress).toBe('123 Tech Street, San Francisco, CA 94102')
      expect(normalized.latitude).toBe(37.7749)
      expect(normalized.longitude).toBe(-122.4194)
      expect(normalized.url).toBe('https://www.eventbrite.com/e/event-123')
    })
  })

  describe('partial event data', () => {
    it('handles missing description', () => {
      const eventWithoutDescription: EventbriteEvent = {
        ...mockEventbriteEvent,
        description: undefined,
      }

      const normalized = normalizeEvent(eventWithoutDescription)

      expect(normalized.description).toBeNull()
    })

    it('handles missing venue', () => {
      const eventWithoutVenue: EventbriteEvent = {
        ...mockEventbriteEvent,
        venue: undefined,
      }

      const normalized = normalizeEvent(eventWithoutVenue)

      expect(normalized.venueName).toBeNull()
      expect(normalized.venueAddress).toBeNull()
      expect(normalized.latitude).toBeNull()
      expect(normalized.longitude).toBeNull()
    })

    it('handles missing end time', () => {
      const eventWithoutEnd: EventbriteEvent = {
        ...mockEventbriteEvent,
        end: undefined as any,
      }

      const normalized = normalizeEvent(eventWithoutEnd)

      expect(normalized.endTime).toBeNull()
    })

    it('handles venue without coordinates', () => {
      const eventWithPartialVenue: EventbriteEvent = {
        ...mockEventbriteEvent,
        venue: {
          id: 'venue-1',
          name: 'Somewhere',
          address: {},
        },
      }

      const normalized = normalizeEvent(eventWithPartialVenue)

      expect(normalized.venueName).toBe('Somewhere')
      expect(normalized.latitude).toBeNull()
      expect(normalized.longitude).toBeNull()
    })
  })

  describe('coordinate parsing', () => {
    it('parses string coordinates to numbers', () => {
      const normalized = normalizeEvent(mockEventbriteEvent)

      expect(typeof normalized.latitude).toBe('number')
      expect(typeof normalized.longitude).toBe('number')
    })
  })
})

// ============================================================================
// EventbriteApiError Tests
// ============================================================================

describe('EventbriteApiError', () => {
  describe('error construction', () => {
    it('creates error with all properties', () => {
      const error = new EventbriteApiError({
        status: 401,
        error: 'INVALID_AUTH',
        errorDescription: 'Token is invalid',
        isRateLimit: false,
        isTokenExpired: true,
      })

      expect(error.name).toBe('EventbriteApiError')
      expect(error.status).toBe(401)
      expect(error.errorCode).toBe('INVALID_AUTH')
      expect(error.message).toBe('Token is invalid')
      expect(error.isRateLimit).toBe(false)
      expect(error.isTokenExpired).toBe(true)
    })

    it('uses error code as message when description is missing', () => {
      const error = new EventbriteApiError({
        status: 500,
        error: 'INTERNAL_ERROR',
      })

      expect(error.message).toBe('INTERNAL_ERROR')
    })

    it('defaults boolean flags to false', () => {
      const error = new EventbriteApiError({
        status: 400,
        error: 'BAD_REQUEST',
      })

      expect(error.isRateLimit).toBe(false)
      expect(error.isTokenExpired).toBe(false)
    })
  })

  describe('error inheritance', () => {
    it('extends Error class', () => {
      const error = new EventbriteApiError({
        status: 400,
        error: 'TEST_ERROR',
      })

      expect(error).toBeInstanceOf(Error)
      expect(error).toBeInstanceOf(EventbriteApiError)
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
        EVENTBRITE_CLIENT_ID: '',
        EVENTBRITE_CLIENT_SECRET: '',
      })
      expect(shouldUseMockEventbrite()).toBe(true)
    })
  })

  describe('API response edge cases', () => {
    beforeEach(() => {
      setEventbriteCredentials()
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
        expect(error).toBeInstanceOf(EventbriteApiError)
        const apiError = error as EventbriteApiError
        expect(apiError.status).toBe(500)
      }
    })

    it('handles missing pagination in response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          events: [mockEventbriteEvent],
        }),
      })

      const result = await searchEvents('access-token', {
        latitude: 37.7749,
        longitude: -122.4194,
      })

      expect(result.pagination.pageNumber).toBe(1)
      expect(result.pagination.pageSize).toBe(50)
      expect(result.pagination.hasMoreItems).toBe(false)
    })
  })
})
