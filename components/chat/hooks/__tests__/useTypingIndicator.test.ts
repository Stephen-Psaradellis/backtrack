/**
 * useTypingIndicator Hook Tests
 *
 * Tests for the useTypingIndicator hook including:
 * - Broadcasting typing state
 * - Debouncing typing broadcasts
 * - Receiving typing events from other users
 * - Auto-clearing typing indicator after timeout
 * - Cleanup on unmount
 */

import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useTypingIndicator } from '../useTypingIndicator'
import { createClient } from '../../../../lib/supabase/client'
import { CHAT_CONSTANTS } from '../../../../types/chat'
import type { UUID } from '../../../../types/database'

// Mock the Supabase client
vi.mock('../../../../lib/supabase/client', () => ({
  createClient: vi.fn(),
}))

// Mock data
const mockConversationId: UUID = 'test-conversation-123'
const mockCurrentUserId: UUID = 'test-user-123'
const mockOtherUserId: UUID = 'test-other-user-456'

// Create mock Supabase functions
const createMockSupabase = () => {
  let broadcastHandler: ((payload: { payload: { userId: string; isTyping: boolean } }) => void) | null = null

  // Create mockChannel with self-references properly
  const mockChannel: {
    on: ReturnType<typeof vi.fn>
    subscribe: ReturnType<typeof vi.fn>
    send: ReturnType<typeof vi.fn>
  } = {
    on: vi.fn(),
    subscribe: vi.fn(),
    send: vi.fn(),
  }
  // Set up self-referential returns after object creation
  mockChannel.on.mockImplementation((_type: unknown, _config: unknown, callback: (payload: { payload: { userId: string; isTyping: boolean } }) => void) => {
    broadcastHandler = callback
    return mockChannel
  })
  mockChannel.subscribe.mockReturnValue(mockChannel)
  mockChannel.send.mockResolvedValue({ status: 'ok' })

  return {
    channel: vi.fn().mockReturnValue(mockChannel),
    removeChannel: vi.fn(),
    _mockChannel: mockChannel,
    _simulateTypingEvent: (userId: string, isTyping: boolean) => {
      if (broadcastHandler) {
        broadcastHandler({
          payload: { userId, isTyping },
        })
      }
    },
  }
}

describe('useTypingIndicator', () => {
  let mockSupabase: ReturnType<typeof createMockSupabase>

  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    mockSupabase = createMockSupabase()
    ;(createClient as Mock).mockReturnValue(mockSupabase)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('Initial state', () => {
    it('should start with isOtherUserTyping false', () => {
      const { result } = renderHook(() =>
        useTypingIndicator({
          conversationId: mockConversationId,
          currentUserId: mockCurrentUserId,
        })
      )

      expect(result.current.isOtherUserTyping).toBe(false)
    })

    it('should provide broadcastTyping function', () => {
      const { result } = renderHook(() =>
        useTypingIndicator({
          conversationId: mockConversationId,
          currentUserId: mockCurrentUserId,
        })
      )

      expect(typeof result.current.broadcastTyping).toBe('function')
    })
  })

  describe('Channel subscription', () => {
    it('should subscribe to typing channel on mount', () => {
      renderHook(() =>
        useTypingIndicator({
          conversationId: mockConversationId,
          currentUserId: mockCurrentUserId,
        })
      )

      expect(mockSupabase.channel).toHaveBeenCalledWith(`typing:${mockConversationId}`)
      expect(mockSupabase._mockChannel.on).toHaveBeenCalledWith(
        'broadcast',
        { event: 'typing' },
        expect.any(Function)
      )
      expect(mockSupabase._mockChannel.subscribe).toHaveBeenCalled()
    })

    it('should clean up channel on unmount', () => {
      const { unmount } = renderHook(() =>
        useTypingIndicator({
          conversationId: mockConversationId,
          currentUserId: mockCurrentUserId,
        })
      )

      unmount()

      expect(mockSupabase.removeChannel).toHaveBeenCalled()
    })
  })

  describe('Broadcasting typing state', () => {
    it('should broadcast typing event when broadcastTyping is called', () => {
      const { result } = renderHook(() =>
        useTypingIndicator({
          conversationId: mockConversationId,
          currentUserId: mockCurrentUserId,
        })
      )

      act(() => {
        result.current.broadcastTyping()
      })

      expect(mockSupabase._mockChannel.send).toHaveBeenCalledWith({
        type: 'broadcast',
        event: 'typing',
        payload: {
          userId: mockCurrentUserId,
          isTyping: true,
        },
      })
    })

    it('should debounce typing broadcasts', () => {
      const { result } = renderHook(() =>
        useTypingIndicator({
          conversationId: mockConversationId,
          currentUserId: mockCurrentUserId,
        })
      )

      // Call broadcastTyping multiple times rapidly
      act(() => {
        result.current.broadcastTyping()
        result.current.broadcastTyping()
        result.current.broadcastTyping()
      })

      // Should only have sent one broadcast due to debouncing
      expect(mockSupabase._mockChannel.send).toHaveBeenCalledTimes(1)
    })

    it('should allow broadcast after debounce period', () => {
      const { result } = renderHook(() =>
        useTypingIndicator({
          conversationId: mockConversationId,
          currentUserId: mockCurrentUserId,
        })
      )

      act(() => {
        result.current.broadcastTyping()
      })

      expect(mockSupabase._mockChannel.send).toHaveBeenCalledTimes(1)

      // Advance time past debounce period
      act(() => {
        vi.advanceTimersByTime(CHAT_CONSTANTS.TYPING_DEBOUNCE_MS + 1)
      })

      act(() => {
        result.current.broadcastTyping()
      })

      expect(mockSupabase._mockChannel.send).toHaveBeenCalledTimes(2)
    })
  })

  describe('Receiving typing events', () => {
    it('should set isOtherUserTyping true when other user starts typing', () => {
      const { result } = renderHook(() =>
        useTypingIndicator({
          conversationId: mockConversationId,
          currentUserId: mockCurrentUserId,
        })
      )

      act(() => {
        mockSupabase._simulateTypingEvent(mockOtherUserId, true)
      })

      expect(result.current.isOtherUserTyping).toBe(true)
    })

    it('should set isOtherUserTyping false when other user stops typing', () => {
      const { result } = renderHook(() =>
        useTypingIndicator({
          conversationId: mockConversationId,
          currentUserId: mockCurrentUserId,
        })
      )

      // First, set typing to true
      act(() => {
        mockSupabase._simulateTypingEvent(mockOtherUserId, true)
      })

      expect(result.current.isOtherUserTyping).toBe(true)

      // Then, set typing to false
      act(() => {
        mockSupabase._simulateTypingEvent(mockOtherUserId, false)
      })

      expect(result.current.isOtherUserTyping).toBe(false)
    })

    it('should ignore typing events from current user', () => {
      const { result } = renderHook(() =>
        useTypingIndicator({
          conversationId: mockConversationId,
          currentUserId: mockCurrentUserId,
        })
      )

      act(() => {
        mockSupabase._simulateTypingEvent(mockCurrentUserId, true)
      })

      // Should still be false because we ignore our own events
      expect(result.current.isOtherUserTyping).toBe(false)
    })

    it('should call onTypingChange callback when typing state changes', () => {
      const onTypingChange = vi.fn()

      renderHook(() =>
        useTypingIndicator({
          conversationId: mockConversationId,
          currentUserId: mockCurrentUserId,
          onTypingChange,
        })
      )

      act(() => {
        mockSupabase._simulateTypingEvent(mockOtherUserId, true)
      })

      expect(onTypingChange).toHaveBeenCalledWith(true)

      act(() => {
        mockSupabase._simulateTypingEvent(mockOtherUserId, false)
      })

      expect(onTypingChange).toHaveBeenCalledWith(false)
    })
  })

  describe('Auto-clear typing indicator', () => {
    it('should clear typing indicator after timeout', () => {
      const { result } = renderHook(() =>
        useTypingIndicator({
          conversationId: mockConversationId,
          currentUserId: mockCurrentUserId,
        })
      )

      // Simulate other user typing
      act(() => {
        mockSupabase._simulateTypingEvent(mockOtherUserId, true)
      })

      expect(result.current.isOtherUserTyping).toBe(true)

      // Advance time past the typing timeout
      act(() => {
        vi.advanceTimersByTime(CHAT_CONSTANTS.TYPING_TIMEOUT_MS + 1)
      })

      expect(result.current.isOtherUserTyping).toBe(false)
    })

    it('should reset timeout when receiving new typing event', () => {
      const { result } = renderHook(() =>
        useTypingIndicator({
          conversationId: mockConversationId,
          currentUserId: mockCurrentUserId,
        })
      )

      // Simulate other user typing
      act(() => {
        mockSupabase._simulateTypingEvent(mockOtherUserId, true)
      })

      // Advance time but not past timeout
      act(() => {
        vi.advanceTimersByTime(CHAT_CONSTANTS.TYPING_TIMEOUT_MS - 500)
      })

      expect(result.current.isOtherUserTyping).toBe(true)

      // Receive another typing event (resets timeout)
      act(() => {
        mockSupabase._simulateTypingEvent(mockOtherUserId, true)
      })

      // Advance time again but not past new timeout
      act(() => {
        vi.advanceTimersByTime(CHAT_CONSTANTS.TYPING_TIMEOUT_MS - 500)
      })

      // Should still be typing because timeout was reset
      expect(result.current.isOtherUserTyping).toBe(true)

      // Now advance past the full timeout
      act(() => {
        vi.advanceTimersByTime(1000)
      })

      expect(result.current.isOtherUserTyping).toBe(false)
    })

    it('should clear timeout when user explicitly stops typing', () => {
      const { result } = renderHook(() =>
        useTypingIndicator({
          conversationId: mockConversationId,
          currentUserId: mockCurrentUserId,
        })
      )

      // Simulate other user typing
      act(() => {
        mockSupabase._simulateTypingEvent(mockOtherUserId, true)
      })

      // Immediately stop typing
      act(() => {
        mockSupabase._simulateTypingEvent(mockOtherUserId, false)
      })

      expect(result.current.isOtherUserTyping).toBe(false)

      // Advance time past timeout - should still be false (no flicker)
      act(() => {
        vi.advanceTimersByTime(CHAT_CONSTANTS.TYPING_TIMEOUT_MS + 1)
      })

      expect(result.current.isOtherUserTyping).toBe(false)
    })
  })

  describe('Cleanup', () => {
    it('should clear timeout on unmount', () => {
      const { result, unmount } = renderHook(() =>
        useTypingIndicator({
          conversationId: mockConversationId,
          currentUserId: mockCurrentUserId,
        })
      )

      // Simulate typing to start timeout
      act(() => {
        mockSupabase._simulateTypingEvent(mockOtherUserId, true)
      })

      expect(result.current.isOtherUserTyping).toBe(true)

      // Unmount before timeout expires
      unmount()

      // Advancing time should not cause any issues
      act(() => {
        vi.advanceTimersByTime(CHAT_CONSTANTS.TYPING_TIMEOUT_MS + 1)
      })

      // No errors should occur
    })
  })

  describe('Return value structure', () => {
    it('should return all expected properties', () => {
      const { result } = renderHook(() =>
        useTypingIndicator({
          conversationId: mockConversationId,
          currentUserId: mockCurrentUserId,
        })
      )

      expect(result.current).toHaveProperty('isOtherUserTyping')
      expect(result.current).toHaveProperty('broadcastTyping')

      // Verify types
      expect(typeof result.current.isOtherUserTyping).toBe('boolean')
      expect(typeof result.current.broadcastTyping).toBe('function')
    })
  })

  describe('Edge cases', () => {
    it('should handle rapid typing events from multiple users', () => {
      const anotherUserId: UUID = 'another-user-789'

      const { result } = renderHook(() =>
        useTypingIndicator({
          conversationId: mockConversationId,
          currentUserId: mockCurrentUserId,
        })
      )

      // Simulate typing from multiple users
      act(() => {
        mockSupabase._simulateTypingEvent(mockOtherUserId, true)
        mockSupabase._simulateTypingEvent(anotherUserId, true)
      })

      // Should still show typing indicator (from most recent event)
      expect(result.current.isOtherUserTyping).toBe(true)
    })

    it('should handle undefined onTypingChange gracefully', () => {
      const { result } = renderHook(() =>
        useTypingIndicator({
          conversationId: mockConversationId,
          currentUserId: mockCurrentUserId,
          // No onTypingChange callback
        })
      )

      // Should not throw when receiving typing event
      expect(() => {
        act(() => {
          mockSupabase._simulateTypingEvent(mockOtherUserId, true)
        })
      }).not.toThrow()

      expect(result.current.isOtherUserTyping).toBe(true)
    })
  })
})