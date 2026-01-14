/**
 * Tests for lib/supabase/middleware.ts
 *
 * Tests the middleware session update function.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { NextRequest } from 'next/server'

// Store original env values
const originalEnv = { ...process.env }

// Mock function references that survive module resets
const mockFunctions = {
  shouldUseMockSupabase: vi.fn(),
  isProductionMode: vi.fn(),
  isMissingSupabaseCredentials: vi.fn(),
  getUser: vi.fn(),
  responseCookiesSet: vi.fn(),
}

// Define mocks before any imports
vi.mock('../../dev', () => ({
  shouldUseMockSupabase: () => mockFunctions.shouldUseMockSupabase(),
  isProductionMode: () => mockFunctions.isProductionMode(),
  isMissingSupabaseCredentials: () => mockFunctions.isMissingSupabaseCredentials(),
}))

vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn((_url: string, _key: string, config: unknown) => ({
    auth: {
      getUser: mockFunctions.getUser,
    },
    _config: config,
  })),
}))

vi.mock('next/server', () => ({
  NextResponse: {
    next: vi.fn(() => ({
      cookies: {
        set: mockFunctions.responseCookiesSet,
      },
    })),
  },
}))

// Create mock request helper
function createMockRequest(url = 'http://localhost:3000/'): NextRequest {
  const mockCookies = {
    getAll: vi.fn().mockReturnValue([]),
    set: vi.fn(),
  }

  return {
    url,
    cookies: mockCookies,
  } as unknown as NextRequest
}

beforeEach(async () => {
  // Reset modules to get fresh imports
  vi.resetModules()
  vi.clearAllMocks()

  // Default behaviors
  mockFunctions.shouldUseMockSupabase.mockReturnValue(false)
  mockFunctions.isProductionMode.mockReturnValue(false)
  mockFunctions.isMissingSupabaseCredentials.mockReturnValue(false)
  mockFunctions.getUser.mockResolvedValue({ data: { user: null }, error: null })
})

afterEach(() => {
  // Restore env
  process.env = { ...originalEnv }
})

describe('updateSession', () => {
  describe('mock mode', () => {
    it('should pass through request in mock mode', async () => {
      mockFunctions.shouldUseMockSupabase.mockReturnValue(true)

      const { updateSession } = await import('../middleware')
      const request = createMockRequest()
      const response = await updateSession(request)

      expect(response).toBeDefined()
      expect(response.cookies).toBeDefined()
    })
  })

  describe('production mode', () => {
    beforeEach(() => {
      mockFunctions.isProductionMode.mockReturnValue(true)
    })

    it('should throw error when credentials are missing in production', async () => {
      mockFunctions.isMissingSupabaseCredentials.mockReturnValue(true)

      const { updateSession } = await import('../middleware')
      const request = createMockRequest()

      await expect(updateSession(request)).rejects.toThrow('Missing Supabase credentials in production')
    })

    it('should process request normally with valid credentials', async () => {
      mockFunctions.isMissingSupabaseCredentials.mockReturnValue(false)
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'test-key'

      const { updateSession } = await import('../middleware')
      const request = createMockRequest()
      const response = await updateSession(request)

      expect(response).toBeDefined()
      expect(mockFunctions.getUser).toHaveBeenCalled()
    })
  })

  describe('development mode', () => {
    beforeEach(() => {
      mockFunctions.isProductionMode.mockReturnValue(false)
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://dev.supabase.co'
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'dev-key'
    })

    it('should create supabase client and call getUser', async () => {
      const { updateSession } = await import('../middleware')
      const request = createMockRequest()
      await updateSession(request)

      const { createServerClient } = await import('@supabase/ssr')
      expect(createServerClient).toHaveBeenCalledWith(
        'https://dev.supabase.co',
        'dev-key',
        expect.objectContaining({
          cookies: expect.objectContaining({
            getAll: expect.any(Function),
            setAll: expect.any(Function),
          }),
        })
      )
      expect(mockFunctions.getUser).toHaveBeenCalled()
    })
  })

  describe('cookie handling', () => {
    beforeEach(() => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'test-key'
    })

    it('should provide getAll that reads from request cookies', async () => {
      const request = createMockRequest()
      const mockCookieData = [{ name: 'session', value: 'abc123' }]
      ;(request.cookies.getAll as ReturnType<typeof vi.fn>).mockReturnValue(mockCookieData)

      const { updateSession } = await import('../middleware')
      await updateSession(request)

      const { createServerClient } = await import('@supabase/ssr')
      const calls = (createServerClient as ReturnType<typeof vi.fn>).mock.calls
      const lastCall = calls[calls.length - 1]
      const cookiesConfig = lastCall[2].cookies

      // Test getAll returns the request cookies
      const result = cookiesConfig.getAll()
      expect(result).toEqual(mockCookieData)
    })

    it('should provide setAll that updates both request and response cookies', async () => {
      const request = createMockRequest()

      const { updateSession } = await import('../middleware')
      await updateSession(request)

      const { createServerClient } = await import('@supabase/ssr')
      const calls = (createServerClient as ReturnType<typeof vi.fn>).mock.calls
      const lastCall = calls[calls.length - 1]
      const cookiesConfig = lastCall[2].cookies

      // Test setAll
      const cookiesToSet = [
        { name: 'token', value: 'xyz', options: { path: '/', httpOnly: true } },
      ]
      cookiesConfig.setAll(cookiesToSet)

      // Should set on request
      expect(request.cookies.set).toHaveBeenCalledWith('token', 'xyz')
      // Should set on response
      expect(mockFunctions.responseCookiesSet).toHaveBeenCalledWith('token', 'xyz', { path: '/', httpOnly: true })
    })
  })
})
