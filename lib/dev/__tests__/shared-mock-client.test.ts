/**
 * Tests for lib/dev/shared-mock-client.ts
 *
 * Tests the shared mock Supabase client singleton functionality.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock the createTypedDevSupabaseClient function
const mockCreateTypedDevSupabaseClient = vi.fn()

vi.mock('../mock-supabase', () => ({
  createTypedDevSupabaseClient: () => mockCreateTypedDevSupabaseClient(),
}))

// Import after mocking
import { getSharedMockClient, resetSharedMockClient } from '../shared-mock-client'

describe('shared-mock-client', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset the singleton before each test
    resetSharedMockClient()
  })

  describe('getSharedMockClient', () => {
    it('should create a new mock client on first call', () => {
      const mockClient = { auth: { getUser: vi.fn() } }
      mockCreateTypedDevSupabaseClient.mockReturnValue(mockClient)

      const client = getSharedMockClient()

      expect(client).toBe(mockClient)
      expect(mockCreateTypedDevSupabaseClient).toHaveBeenCalledTimes(1)
    })

    it('should return the same instance on subsequent calls', () => {
      const mockClient = { auth: { getUser: vi.fn() } }
      mockCreateTypedDevSupabaseClient.mockReturnValue(mockClient)

      const client1 = getSharedMockClient()
      const client2 = getSharedMockClient()
      const client3 = getSharedMockClient()

      expect(client1).toBe(client2)
      expect(client2).toBe(client3)
      // Only called once due to singleton pattern
      expect(mockCreateTypedDevSupabaseClient).toHaveBeenCalledTimes(1)
    })
  })

  describe('resetSharedMockClient', () => {
    it('should allow creating a new instance after reset', () => {
      const mockClient1 = { id: 'client1', auth: { getUser: vi.fn() } }
      const mockClient2 = { id: 'client2', auth: { getUser: vi.fn() } }
      mockCreateTypedDevSupabaseClient
        .mockReturnValueOnce(mockClient1)
        .mockReturnValueOnce(mockClient2)

      const client1 = getSharedMockClient()
      expect(client1).toBe(mockClient1)

      resetSharedMockClient()

      const client2 = getSharedMockClient()
      expect(client2).toBe(mockClient2)
      expect(client2).not.toBe(client1)
      expect(mockCreateTypedDevSupabaseClient).toHaveBeenCalledTimes(2)
    })

    it('should not throw when called multiple times', () => {
      expect(() => {
        resetSharedMockClient()
        resetSharedMockClient()
        resetSharedMockClient()
      }).not.toThrow()
    })

    it('should not throw when called before any client is created', () => {
      expect(() => {
        resetSharedMockClient()
      }).not.toThrow()
    })
  })

  describe('singleton behavior', () => {
    it('should share auth state across multiple calls', () => {
      const mockAuthState = { user: { id: 'test-user' } }
      const mockClient = {
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: mockAuthState.user }, error: null }),
        },
      }
      mockCreateTypedDevSupabaseClient.mockReturnValue(mockClient)

      const client1 = getSharedMockClient()
      const client2 = getSharedMockClient()

      // Both clients should be the same instance
      expect(client1.auth.getUser).toBe(client2.auth.getUser)
    })
  })
})
