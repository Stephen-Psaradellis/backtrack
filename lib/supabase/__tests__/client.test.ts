/**
 * Tests for lib/supabase/client.ts
 *
 * Tests the Supabase client creation with mock handling.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock dependencies
const mockShouldUseMockSupabase = vi.fn()
const mockShouldUseMockExpoSupabase = vi.fn()
const mockIsProductionMode = vi.fn()
const mockGetSharedMockClient = vi.fn()
const mockCreateBrowserClient = vi.fn()

vi.mock('../../dev', () => ({
  shouldUseMockSupabase: () => mockShouldUseMockSupabase(),
  shouldUseMockExpoSupabase: () => mockShouldUseMockExpoSupabase(),
  isProductionMode: () => mockIsProductionMode(),
}))

vi.mock('../../dev/shared-mock-client', () => ({
  getSharedMockClient: () => mockGetSharedMockClient(),
}))

vi.mock('@supabase/ssr', () => ({
  createBrowserClient: (...args: unknown[]) => mockCreateBrowserClient(...args),
}))

// We need to reset module state between tests
beforeEach(() => {
  vi.resetModules()
  vi.clearAllMocks()

  // Default behaviors
  mockShouldUseMockSupabase.mockReturnValue(false)
  mockShouldUseMockExpoSupabase.mockReturnValue(false)
  mockIsProductionMode.mockReturnValue(false)
  mockGetSharedMockClient.mockReturnValue({ mock: true })
  mockCreateBrowserClient.mockReturnValue({ real: true })
})

describe('createClient', () => {
  describe('mock client scenarios', () => {
    it('should return mock client in Expo environment', async () => {
      mockShouldUseMockExpoSupabase.mockReturnValue(true)

      const { createClient } = await import('../client')
      const client = createClient()

      expect(client).toEqual({ mock: true })
      expect(mockGetSharedMockClient).toHaveBeenCalled()
    })

    it('should return mock client when shouldUseMockSupabase is true', async () => {
      mockShouldUseMockSupabase.mockReturnValue(true)

      const { createClient } = await import('../client')
      const client = createClient()

      expect(client).toEqual({ mock: true })
      expect(mockGetSharedMockClient).toHaveBeenCalled()
    })
  })

  describe('production mode', () => {
    beforeEach(() => {
      mockIsProductionMode.mockReturnValue(true)
    })

    it('should throw error if SUPABASE_URL is missing in production', async () => {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'test-key'

      const { createClient } = await import('../client')

      expect(() => createClient()).toThrow('Missing NEXT_PUBLIC_SUPABASE_URL')
    })

    it('should throw error if SUPABASE_KEY is missing in production', async () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
      delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

      const { createClient } = await import('../client')

      expect(() => createClient()).toThrow('Missing NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY')
    })

    it('should create real client with valid credentials', async () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'test-anon-key'

      const { createClient } = await import('../client')
      const client = createClient()

      expect(client).toEqual({ real: true })
      expect(mockCreateBrowserClient).toHaveBeenCalledWith(
        'https://test.supabase.co',
        'test-anon-key'
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

      const { createClient } = await import('../client')
      const client = createClient()

      expect(client).toEqual({ real: true })
    })
  })

  describe('singleton behavior', () => {
    it('should return same instance on multiple calls', async () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'test-key'
      mockIsProductionMode.mockReturnValue(false)

      const { createClient } = await import('../client')

      const client1 = createClient()
      const client2 = createClient()

      // Should only create once
      expect(mockCreateBrowserClient).toHaveBeenCalledTimes(1)
      expect(client1).toBe(client2)
    })
  })
})
