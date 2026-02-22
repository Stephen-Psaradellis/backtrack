/**
 * Tests for useChatListData Hook
 *
 * Tests the TanStack Query hook that replaces N+1 query waterfall with single RPC call.
 * Covers query behavior, real-time subscriptions, and cache updates.
 */

import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import { useChatListData, type ConversationWithDetails } from '../useChatListData'
import type { RealtimeChannel, RealtimePostgresInsertPayload } from '@supabase/supabase-js'
import type { Message } from '../../types/database'

// ============================================================================
// MOCKS
// ============================================================================

const mockRpc = vi.fn()
const mockChannel = vi.fn()
const mockRemoveChannel = vi.fn()
const mockOn = vi.fn()
const mockSubscribe = vi.fn()
const mockUnsubscribe = vi.fn()

vi.mock('../../lib/supabase', () => ({
  supabase: {
    rpc: (...args: any[]) => mockRpc(...args),
    channel: (...args: any[]) => mockChannel(...args),
    removeChannel: (...args: any[]) => mockRemoveChannel(...args),
  },
}))

// ============================================================================
// TEST UTILITIES
// ============================================================================

function createTestWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  })
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children)
}

/**
 * Create mock conversation data
 */
function createMockConversation(
  overrides: Partial<ConversationWithDetails> = {}
): ConversationWithDetails {
  return {
    conversation_id: 'conv-1',
    producer_id: 'producer-1',
    consumer_id: 'consumer-1',
    post_id: 'post-1',
    status: 'active',
    updated_at: '2024-01-01T00:00:00Z',
    created_at: '2024-01-01T00:00:00Z',
    other_user_id: 'other-user-1',
    other_user_is_verified: false,
    last_message_content: 'Hello',
    last_message_sender_id: 'sender-1',
    last_message_created_at: '2024-01-01T00:00:00Z',
    unread_count: 0,
    post_target_avatar_v2: null,
    location_name: 'Test Location',
    ...overrides,
  }
}

/**
 * Create mock message data
 */
function createMockMessage(overrides: Partial<Message> = {}): Message {
  return {
    id: 'msg-1',
    conversation_id: 'conv-1',
    sender_id: 'sender-1',
    content: 'New message',
    created_at: '2024-01-01T00:00:00Z',
    ...overrides,
  } as Message
}

/**
 * Setup mock channel with chainable methods
 */
function setupMockChannel() {
  const channelInstance = {
    on: mockOn.mockReturnThis(),
    subscribe: mockSubscribe.mockReturnThis(),
    unsubscribe: mockUnsubscribe,
  }
  mockChannel.mockReturnValue(channelInstance)
  return channelInstance
}

// ============================================================================
// TESTS
// ============================================================================

describe('useChatListData', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setupMockChannel()
  })

  // --------------------------------------------------------------------------
  // Basic Query Behavior
  // --------------------------------------------------------------------------

  describe('Query Behavior', () => {
    it('does not fetch when userId is null', async () => {
      const { result } = renderHook(() => useChatListData(null), {
        wrapper: createTestWrapper(),
      })

      // Should not call RPC
      expect(mockRpc).not.toHaveBeenCalled()

      // Should return default values
      expect(result.current.data).toEqual([])
      expect(result.current.isLoading).toBe(false)
      expect(result.current.error).toBe(null)
    })

    it('calls rpc with correct parameters when userId is provided', async () => {
      const userId = 'user-123'
      const mockData = [createMockConversation()]

      mockRpc.mockResolvedValue({ data: mockData, error: null })

      renderHook(() => useChatListData(userId), {
        wrapper: createTestWrapper(),
      })

      await waitFor(() => {
        expect(mockRpc).toHaveBeenCalledWith('get_user_conversations_with_details', {
          p_user_id: userId,
        })
      })
    })

    it('returns conversation data on successful fetch', async () => {
      const userId = 'user-123'
      const mockData = [
        createMockConversation({ conversation_id: 'conv-1' }),
        createMockConversation({ conversation_id: 'conv-2' }),
      ]

      mockRpc.mockResolvedValue({ data: mockData, error: null })

      const { result } = renderHook(() => useChatListData(userId), {
        wrapper: createTestWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.data).toEqual(mockData)
      expect(result.current.error).toBe(null)
    })

    it('returns empty array when RPC returns null data', async () => {
      const userId = 'user-123'
      mockRpc.mockResolvedValue({ data: null, error: null })

      const { result } = renderHook(() => useChatListData(userId), {
        wrapper: createTestWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.data).toEqual([])
    })

    it('returns error when RPC fails', async () => {
      const userId = 'user-123'
      const errorMessage = 'Database connection failed'

      mockRpc.mockResolvedValue({
        data: null,
        error: { message: errorMessage },
      })

      const { result } = renderHook(() => useChatListData(userId), {
        wrapper: createTestWrapper(),
      })

      await waitFor(() => {
        expect(result.current.error).not.toBe(null)
      })

      expect(result.current.error?.message).toBe(errorMessage)
      expect(result.current.data).toEqual([])
    })

    it('handles RPC error with no message', async () => {
      const userId = 'user-123'
      mockRpc.mockResolvedValue({ data: null, error: {} })

      const { result } = renderHook(() => useChatListData(userId), {
        wrapper: createTestWrapper(),
      })

      await waitFor(() => {
        expect(result.current.error).not.toBe(null)
      })

      expect(result.current.error?.message).toBe('Failed to load conversations')
    })
  })

  // --------------------------------------------------------------------------
  // Real-time Subscription
  // --------------------------------------------------------------------------

  describe('Real-time Subscription', () => {
    it('sets up real-time subscription channel when userId is provided', async () => {
      const userId = 'user-123'
      mockRpc.mockResolvedValue({ data: [], error: null })

      renderHook(() => useChatListData(userId), {
        wrapper: createTestWrapper(),
      })

      await waitFor(() => {
        expect(mockChannel).toHaveBeenCalledWith(`chatlist-${userId}`)
      })

      expect(mockOn).toHaveBeenCalledWith(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        expect.any(Function)
      )

      expect(mockSubscribe).toHaveBeenCalled()
    })

    it('does not set up subscription when userId is null', () => {
      renderHook(() => useChatListData(null), {
        wrapper: createTestWrapper(),
      })

      expect(mockChannel).not.toHaveBeenCalled()
      expect(mockSubscribe).not.toHaveBeenCalled()
    })

    it('cleans up subscription on unmount', async () => {
      const userId = 'user-123'
      mockRpc.mockResolvedValue({ data: [], error: null })

      const { unmount } = renderHook(() => useChatListData(userId), {
        wrapper: createTestWrapper(),
      })

      await waitFor(() => {
        expect(mockChannel).toHaveBeenCalled()
      })

      unmount()

      expect(mockRemoveChannel).toHaveBeenCalled()
    })

    it('updates cache when new message arrives for existing conversation', async () => {
      const userId = 'user-123'
      const initialConv = createMockConversation({
        conversation_id: 'conv-1',
        last_message_content: 'Old message',
        unread_count: 0,
      })

      mockRpc.mockResolvedValue({ data: [initialConv], error: null })

      let insertHandler: ((payload: RealtimePostgresInsertPayload<Message>) => void) | null = null
      mockOn.mockImplementation((event: string, config: any, handler: any) => {
        if (event === 'postgres_changes') {
          insertHandler = handler
        }
        return mockChannel()
      })

      const { result } = renderHook(() => useChatListData(userId), {
        wrapper: createTestWrapper(),
      })

      // Wait for initial data
      await waitFor(() => {
        expect(result.current.data).toHaveLength(1)
      })

      // Simulate new message from other user
      const newMessage = createMockMessage({
        conversation_id: 'conv-1',
        content: 'New message',
        sender_id: 'other-user',
        created_at: '2024-01-02T00:00:00Z',
      })

      insertHandler?.({ new: newMessage } as RealtimePostgresInsertPayload<Message>)

      await waitFor(() => {
        expect(result.current.data[0].last_message_content).toBe('New message')
      })

      expect(result.current.data[0].unread_count).toBe(1)
      expect(result.current.data[0].last_message_created_at).toBe('2024-01-02T00:00:00Z')
    })

    it('does not increment unread count when message is from current user', async () => {
      const userId = 'user-123'
      const initialConv = createMockConversation({
        conversation_id: 'conv-1',
        unread_count: 0,
      })

      mockRpc.mockResolvedValue({ data: [initialConv], error: null })

      let insertHandler: ((payload: RealtimePostgresInsertPayload<Message>) => void) | null = null
      mockOn.mockImplementation((event: string, config: any, handler: any) => {
        if (event === 'postgres_changes') {
          insertHandler = handler
        }
        return mockChannel()
      })

      const { result } = renderHook(() => useChatListData(userId), {
        wrapper: createTestWrapper(),
      })

      await waitFor(() => {
        expect(result.current.data).toHaveLength(1)
      })

      // Simulate message from current user
      const newMessage = createMockMessage({
        conversation_id: 'conv-1',
        sender_id: userId,
        created_at: '2024-01-02T00:00:00Z',
      })

      insertHandler?.({ new: newMessage } as RealtimePostgresInsertPayload<Message>)

      await waitFor(() => {
        expect(result.current.data[0].last_message_created_at).toBe('2024-01-02T00:00:00Z')
      })

      expect(result.current.data[0].unread_count).toBe(0)
    })

    it('re-sorts conversations by last message time', async () => {
      const userId = 'user-123'
      const conv1 = createMockConversation({
        conversation_id: 'conv-1',
        last_message_created_at: '2024-01-01T00:00:00Z',
      })
      const conv2 = createMockConversation({
        conversation_id: 'conv-2',
        last_message_created_at: '2024-01-02T00:00:00Z',
      })

      // conv2 should be first initially (more recent)
      mockRpc.mockResolvedValue({ data: [conv2, conv1], error: null })

      let insertHandler: ((payload: RealtimePostgresInsertPayload<Message>) => void) | null = null
      mockOn.mockImplementation((event: string, config: any, handler: any) => {
        if (event === 'postgres_changes') {
          insertHandler = handler
        }
        return mockChannel()
      })

      const { result } = renderHook(() => useChatListData(userId), {
        wrapper: createTestWrapper(),
      })

      await waitFor(() => {
        expect(result.current.data).toHaveLength(2)
      })

      // Initial order: conv2, conv1
      expect(result.current.data[0].conversation_id).toBe('conv-2')
      expect(result.current.data[1].conversation_id).toBe('conv-1')

      // New message in conv-1 (should move it to top)
      const newMessage = createMockMessage({
        conversation_id: 'conv-1',
        created_at: '2024-01-03T00:00:00Z',
      })

      insertHandler?.({ new: newMessage } as RealtimePostgresInsertPayload<Message>)

      await waitFor(() => {
        expect(result.current.data[0].conversation_id).toBe('conv-1')
      })

      expect(result.current.data[1].conversation_id).toBe('conv-2')
    })
  })

  // --------------------------------------------------------------------------
  // Refetch Behavior
  // --------------------------------------------------------------------------

  describe('Refetch Behavior', () => {
    it('refetch triggers a new data fetch', async () => {
      const userId = 'user-123'
      const initialData = [createMockConversation({ conversation_id: 'conv-1' })]
      const updatedData = [createMockConversation({ conversation_id: 'conv-2' })]

      mockRpc.mockResolvedValueOnce({ data: initialData, error: null })

      const { result } = renderHook(() => useChatListData(userId), {
        wrapper: createTestWrapper(),
      })

      // Wait for initial fetch
      await waitFor(() => {
        expect(result.current.data[0].conversation_id).toBe('conv-1')
      })

      // Mock second fetch with different data
      mockRpc.mockResolvedValueOnce({ data: updatedData, error: null })

      // Trigger refetch
      result.current.refetch()

      // Wait for refetch to complete
      await waitFor(() => {
        expect(result.current.data[0].conversation_id).toBe('conv-2')
      })

      expect(mockRpc).toHaveBeenCalledTimes(2)
    })

    it('isRefetching state works correctly', async () => {
      const userId = 'user-123'
      const mockData = [createMockConversation()]

      // Use a promise that we can control to observe isRefetching state
      let resolveRefetch: ((value: any) => void) | null = null
      const refetchPromise = new Promise((resolve) => {
        resolveRefetch = resolve
      })

      mockRpc
        .mockResolvedValueOnce({ data: mockData, error: null }) // Initial load
        .mockImplementationOnce(() => refetchPromise) // Refetch - controlled promise

      const { result } = renderHook(() => useChatListData(userId), {
        wrapper: createTestWrapper(),
      })

      // Wait for initial load
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.isRefetching).toBe(false)

      // Trigger refetch
      result.current.refetch()

      // isRefetching should become true during refetch
      await waitFor(() => {
        expect(result.current.isRefetching).toBe(true)
      })

      // Resolve the refetch promise
      resolveRefetch?.({ data: mockData, error: null })

      // Should return to false after completion
      await waitFor(() => {
        expect(result.current.isRefetching).toBe(false)
      })
    })
  })

  // --------------------------------------------------------------------------
  // Edge Cases
  // --------------------------------------------------------------------------

  describe('Edge Cases', () => {
    it('handles message for non-existent conversation gracefully', async () => {
      const userId = 'user-123'
      const initialConv = createMockConversation({ conversation_id: 'conv-1' })

      mockRpc.mockResolvedValue({ data: [initialConv], error: null })

      let insertHandler: ((payload: RealtimePostgresInsertPayload<Message>) => void) | null = null
      mockOn.mockImplementation((event: string, config: any, handler: any) => {
        if (event === 'postgres_changes') {
          insertHandler = handler
        }
        return mockChannel()
      })

      const { result } = renderHook(() => useChatListData(userId), {
        wrapper: createTestWrapper(),
      })

      await waitFor(() => {
        expect(result.current.data).toHaveLength(1)
      })

      // Message for different conversation
      const newMessage = createMockMessage({ conversation_id: 'conv-999' })

      insertHandler?.({ new: newMessage } as RealtimePostgresInsertPayload<Message>)

      // Should not crash, original data should remain unchanged
      await waitFor(() => {
        expect(result.current.data).toHaveLength(1)
      })

      expect(result.current.data[0].conversation_id).toBe('conv-1')
    })

    it('handles conversations with no last_message_created_at', async () => {
      const userId = 'user-123'
      const conv1 = createMockConversation({
        conversation_id: 'conv-1',
        last_message_created_at: null,
        updated_at: '2024-01-01T00:00:00Z',
      })
      const conv2 = createMockConversation({
        conversation_id: 'conv-2',
        last_message_created_at: '2024-01-02T00:00:00Z',
        updated_at: '2024-01-02T00:00:00Z',
      })

      // RPC should return data in sorted order (most recent first)
      // conv2 has the most recent timestamp
      mockRpc.mockResolvedValue({ data: [conv2, conv1], error: null })

      const { result } = renderHook(() => useChatListData(userId), {
        wrapper: createTestWrapper(),
      })

      await waitFor(() => {
        expect(result.current.data).toHaveLength(2)
      })

      // Data should be returned as-is from RPC (already sorted)
      // conv2 should be first (has more recent message)
      expect(result.current.data[0].conversation_id).toBe('conv-2')
      expect(result.current.data[1].conversation_id).toBe('conv-1')
    })

    it('changes userId triggers new subscription', async () => {
      const userId1 = 'user-123'
      const userId2 = 'user-456'

      mockRpc.mockResolvedValue({ data: [], error: null })

      const { rerender } = renderHook(({ userId }) => useChatListData(userId), {
        wrapper: createTestWrapper(),
        initialProps: { userId: userId1 },
      })

      await waitFor(() => {
        expect(mockChannel).toHaveBeenCalledWith(`chatlist-${userId1}`)
      })

      const initialChannelCallCount = mockChannel.mock.calls.length

      // Change userId
      rerender({ userId: userId2 })

      await waitFor(() => {
        expect(mockChannel).toHaveBeenCalledWith(`chatlist-${userId2}`)
      })

      // Should have called channel more times (cleanup old, setup new)
      expect(mockChannel.mock.calls.length).toBeGreaterThan(initialChannelCallCount)
      expect(mockRemoveChannel).toHaveBeenCalled()
    })
  })

  // --------------------------------------------------------------------------
  // Loading States
  // --------------------------------------------------------------------------

  describe('Loading States', () => {
    it('isLoading is true initially', () => {
      const userId = 'user-123'
      mockRpc.mockImplementation(() => new Promise(() => {})) // Never resolves

      const { result } = renderHook(() => useChatListData(userId), {
        wrapper: createTestWrapper(),
      })

      expect(result.current.isLoading).toBe(true)
      expect(result.current.data).toEqual([])
    })

    it('isLoading is false after successful fetch', async () => {
      const userId = 'user-123'
      mockRpc.mockResolvedValue({ data: [], error: null })

      const { result } = renderHook(() => useChatListData(userId), {
        wrapper: createTestWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })
    })

    it('isLoading is false after error', async () => {
      const userId = 'user-123'
      mockRpc.mockResolvedValue({ data: null, error: { message: 'Error' } })

      const { result } = renderHook(() => useChatListData(userId), {
        wrapper: createTestWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.error).not.toBe(null)
    })
  })
})
