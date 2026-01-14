/**
 * Tests for lib/supabase/server.ts
 *
 * Tests the server-side Supabase client creation with mock handling.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock dependencies
const mockShouldUseMockSupabase = vi.fn()
const mockIsProductionMode = vi.fn()
const mockCreateTypedDevSupabaseClient = vi.fn()
const mockCreateServerClient = vi.fn()
const mockCookies = vi.fn()

vi.mock('../../dev', () => ({
  shouldUseMockSupabase: () => mockShouldUseMockSupabase(),
  isProductionMode: () => mockIsProductionMode(),
}))

vi.mock('../../dev/mock-supabase', () => ({
  createTypedDevSupabaseClient: () => mockCreateTypedDevSupabaseClient(),
}))

vi.mock('@supabase/ssr', () => ({
  createServerClient: (...args: unknown[]) => mockCreateServerClient(...args),
}))

vi.mock('next/headers', () => ({
  cookies: () => mockCookies(),
}))

// We need to reset module state between tests
beforeEach(() => {
  vi.resetModules()
  vi.clearAllMocks()

  // Default behaviors
  mockShouldUseMockSupabase.mockReturnValue(false)
  mockIsProductionMode.mockReturnValue(false)
  mockCreateTypedDevSupabaseClient.mockReturnValue({ mock: true })
  mockCreateServerClient.mockReturnValue({ real: true })
  mockCookies.mockResolvedValue({
    getAll: vi.fn().mockReturnValue([]),
    set: vi.fn(),
  })
})

describe('createClient (server)', () => {
  describe('mock client scenarios', () => {
    it('should return mock client when shouldUseMockSupabase is true', async () => {
      mockShouldUseMockSupabase.mockReturnValue(true)

      const { createClient } = await import('../server')
      const client = await createClient()

      expect(client).toEqual({ mock: true })
      expect(mockCreateTypedDevSupabaseClient).toHaveBeenCalled()
      expect(mockCreateServerClient).not.toHaveBeenCalled()
    })
  })

  describe('production mode', () => {
    beforeEach(() => {
      mockIsProductionMode.mockReturnValue(true)
    })

    it('should throw error if SUPABASE_URL is missing in production', async () => {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'test-key'

      const { createClient } = await import('../server')

      await expect(createClient()).rejects.toThrow('Missing NEXT_PUBLIC_SUPABASE_URL')
    })

    it('should throw error if SUPABASE_KEY is missing in production', async () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
      delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

      const { createClient } = await import('../server')

      await expect(createClient()).rejects.toThrow('Missing NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY')
    })

    it('should create real client with valid credentials', async () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'test-anon-key'

      const { createClient } = await import('../server')
      const client = await createClient()

      expect(client).toEqual({ real: true })
      expect(mockCreateServerClient).toHaveBeenCalledWith(
        'https://test.supabase.co',
        'test-anon-key',
        expect.objectContaining({
          cookies: expect.objectContaining({
            getAll: expect.any(Function),
            setAll: expect.any(Function),
          }),
        })
      )
    })
  })

  describe('development mode', () => {
    beforeEach(() => {
      mockIsProductionMode.mockReturnValue(false)
    })

    it('should create client with available credentials', async () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://dev.supabase.co'
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'dev-key'

      const { createClient } = await import('../server')
      const client = await createClient()

      expect(client).toEqual({ real: true })
      expect(mockCreateServerClient).toHaveBeenCalled()
    })
  })

  describe('cookie handling', () => {
    beforeEach(() => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'test-key'
    })

    it('should provide getAll function to cookie handler', async () => {
      const mockGetAll = vi.fn().mockReturnValue([{ name: 'test', value: '123' }])
      mockCookies.mockResolvedValue({
        getAll: mockGetAll,
        set: vi.fn(),
      })

      const { createClient } = await import('../server')
      await createClient()

      // Get the cookies config passed to createServerClient
      const call = mockCreateServerClient.mock.calls[0]
      const cookiesConfig = call[2].cookies

      // Test getAll
      const result = cookiesConfig.getAll()
      expect(mockGetAll).toHaveBeenCalled()
      expect(result).toEqual([{ name: 'test', value: '123' }])
    })

    it('should provide setAll function that handles cookies', async () => {
      const mockSet = vi.fn()
      mockCookies.mockResolvedValue({
        getAll: vi.fn().mockReturnValue([]),
        set: mockSet,
      })

      const { createClient } = await import('../server')
      await createClient()

      // Get the cookies config passed to createServerClient
      const call = mockCreateServerClient.mock.calls[0]
      const cookiesConfig = call[2].cookies

      // Test setAll
      cookiesConfig.setAll([
        { name: 'cookie1', value: 'value1', options: { path: '/' } },
        { name: 'cookie2', value: 'value2', options: { httpOnly: true } },
      ])

      expect(mockSet).toHaveBeenCalledTimes(2)
      expect(mockSet).toHaveBeenCalledWith('cookie1', 'value1', { path: '/' })
      expect(mockSet).toHaveBeenCalledWith('cookie2', 'value2', { httpOnly: true })
    })

    it('should handle setAll errors gracefully (Server Component context)', async () => {
      const mockSet = vi.fn().mockImplementation(() => {
        throw new Error('Cannot set cookies in Server Component')
      })
      mockCookies.mockResolvedValue({
        getAll: vi.fn().mockReturnValue([]),
        set: mockSet,
      })

      const { createClient } = await import('../server')
      await createClient()

      // Get the cookies config passed to createServerClient
      const call = mockCreateServerClient.mock.calls[0]
      const cookiesConfig = call[2].cookies

      // Test setAll - should not throw even when set fails
      expect(() => {
        cookiesConfig.setAll([
          { name: 'cookie1', value: 'value1', options: {} },
        ])
      }).not.toThrow()
    })
  })
})
