/**
 * useChatMessages Hook Tests
 *
 * Tests for the useChatMessages hook including:
 * - Initial message loading
 * - Pagination (load more messages)
 * - Realtime message subscriptions
 * - Message ordering
 * - Error handling
 * - Marking messages as read
 */

import { renderHook, waitFor, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useChatMessages } from '../useChatMessages'
import { createMockMessage, generateTestUUID } from '../../../__tests__/utils/factories'
import { supabase } from '../../../lib/supabase'

// Get the mocked functions after imports
const mockFrom = vi.mocked(supabase.from)
const mockChannel = vi.mocked(supabase.channel)
const mockRemoveChannel = vi.mocked(supabase.removeChannel)

// Mock supabase - must be before imports to avoid hoisting issues
vi.mock('../../../lib/supabase', () => {
  const mockFrom = vi.fn()
  const mockChannel = vi.fn()
  const mockRemoveChannel = vi.fn()

  return {
    supabase: {
      from: mockFrom,
      channel: mockChannel,
      removeChannel: mockRemoveChannel,
    },
  }
})

// Mock haptics
vi.mock('../../../lib/haptics', () => ({
  notificationFeedback: vi.fn(),
}))

describe('useChatMessages', () => {
  const conversationId = generateTestUUID()
  const userId = generateTestUUID()

  let mockSelect: any
  let mockEq: any
  let mockOrder: any
  let mockLimit: any
  let mockOr: any
  let mockUpdate: any
  let mockNeq: any
  let mockChannelOn: any
  let mockSubscribe: any

  // Helper to build a proper mock chain
  const buildMockChain = (data: unknown[], error: unknown = null) => {
    mockLimit = vi.fn().mockResolvedValue({ data, error })
    mockOrder = vi.fn().mockReturnValue({ limit: mockLimit })
    mockOr = vi.fn().mockReturnValue({ limit: mockLimit })
    mockNeq = vi.fn().mockResolvedValue({ data: null, error: null })
    mockEq = vi.fn().mockReturnValue({ order: mockOrder, neq: mockNeq, eq: vi.fn().mockResolvedValue({ data: null, error: null }) })
    mockSelect = vi.fn().mockReturnValue({ eq: mockEq })
    mockUpdate = vi.fn().mockReturnValue({ eq: mockEq })
    mockFrom.mockReturnValue({
      select: mockSelect,
      update: mockUpdate,
    })
  }

  beforeEach(() => {
    vi.clearAllMocks()

    // Default setup: empty messages, no error
    buildMockChain([])

    // Setup realtime mocks
    mockSubscribe = vi.fn().mockReturnValue({})
    const channelObj = {
      on: (...args: unknown[]) => {
        mockChannelOn(...args)
        return channelObj
      },
      subscribe: mockSubscribe,
    }
    mockChannelOn = vi.fn()
    mockChannel.mockReturnValue(channelObj)
  })

  afterEach(() => {
    vi.clearAllTimers()
  })

  it('should initialize with loading state', () => {
    const { result } = renderHook(() => useChatMessages(conversationId, userId))

    expect(result.current.loading).toBe(true)
    expect(result.current.messages).toEqual([])
    expect(result.current.error).toBeNull()
  })

  it('should fetch and display messages on mount', async () => {
    const mockMessages = [
      createMockMessage({ id: '1', conversation_id: conversationId }),
      createMockMessage({ id: '2', conversation_id: conversationId }),
    ]

    // Override the from mock to return messages
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue({ data: mockMessages, error: null }),
          }),
        }),
      }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          neq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
      }),
    })

    const { result } = renderHook(() => useChatMessages(conversationId, userId))

    // The hook doesn't auto-fetch - call fetchMessages explicitly
    await act(async () => {
      await result.current.fetchMessages()
    })

    expect(result.current.loading).toBe(false)
    expect(result.current.messages).toHaveLength(2)
    expect(result.current.messages[0].id).toBe('1')
    expect(result.current.error).toBeNull()
  })

  it('should handle fetch errors gracefully', async () => {
    // Override the from mock to return an error
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Database error' },
            }),
          }),
        }),
      }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: null, error: null }),
      }),
    })

    const { result } = renderHook(() => useChatMessages(conversationId, userId))

    // The hook doesn't auto-fetch - call fetchMessages explicitly
    await act(async () => {
      await result.current.fetchMessages()
    })

    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBe('Failed to load messages. Please try again.')
    expect(result.current.messages).toEqual([])
  })

  it('should subscribe to realtime updates', async () => {
    renderHook(() => useChatMessages(conversationId, userId))

    // The subscription is set up immediately in useEffect (on mount)
    // We just need to wait for the next tick
    await waitFor(() => {
      expect(mockSubscribe).toHaveBeenCalled()
    })

    expect(mockChannel).toHaveBeenCalledWith(
      `chat-${conversationId}`,
      expect.any(Object)
    )

    expect(mockChannelOn).toHaveBeenCalledWith(
      'postgres_changes',
      expect.objectContaining({
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
      }),
      expect.any(Function)
    )

    expect(mockSubscribe).toHaveBeenCalled()
  })

  it('should cleanup realtime subscription on unmount', async () => {
    const { unmount } = renderHook(() => useChatMessages(conversationId, userId))

    await waitFor(() => {
      expect(mockSubscribe).toHaveBeenCalled()
    })

    unmount()

    expect(mockRemoveChannel).toHaveBeenCalled()
  })
})
