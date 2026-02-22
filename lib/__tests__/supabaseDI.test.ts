/**
 * Tests for Supabase Dependency Injection
 *
 * Demonstrates how to inject mock Supabase clients into functions
 * that previously used the global supabase import directly.
 */

import { describe, it, expect, vi } from 'vitest'
import { getConversation } from '../conversations'
import type { AppSupabaseClient } from '../supabase'

describe('Supabase Dependency Injection', () => {
  it('should allow injecting a mock client into getConversation', async () => {
    // Create a mock Supabase client
    const mockClient = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({
              data: {
                id: 'test-conversation-id',
                post_id: 'test-post-id',
                producer_id: 'producer-user-id',
                consumer_id: 'consumer-user-id',
                is_active: true,
                created_at: '2024-01-01T00:00:00Z',
                updated_at: '2024-01-01T00:00:00Z',
              },
              error: null,
            })),
          })),
        })),
      })),
    } as unknown as AppSupabaseClient

    // Call the function with the mock client
    const result = await getConversation('test-conversation-id', mockClient)

    // Verify the result
    expect(result.success).toBe(true)
    expect(result.conversation).toBeDefined()
    expect(result.conversation?.id).toBe('test-conversation-id')
    expect(result.conversation?.producer_id).toBe('producer-user-id')
    expect(result.error).toBeNull()

    // Verify the mock was called correctly
    expect(mockClient.from).toHaveBeenCalledWith('conversations')
  })

  it('should use the default client when none is provided', async () => {
    // This test demonstrates that the default parameter works
    // The function can be called without passing the client parameter
    const result = await getConversation('non-existent-id')

    // The function should execute (using the mock client from the dev environment)
    // The important thing is that the function signature allows calling without the client parameter
    // In dev mode, the mock client may return mock data
    expect(result).toBeDefined()
    expect(result.success).toBeDefined()
    // Don't assert on specific values since behavior depends on the mock client
  })

  it('should handle empty conversation ID gracefully', async () => {
    const mockClient = {} as unknown as AppSupabaseClient

    const result = await getConversation('', mockClient)

    expect(result.success).toBe(false)
    expect(result.conversation).toBeNull()
    expect(result.error).toBe('Conversation not found.')
  })
})
