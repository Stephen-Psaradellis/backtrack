/**
 * useSendMessage Hook Tests
 *
 * Tests for the useSendMessage hook including:
 * - Sending messages with optimistic updates
 * - Success confirmation handling
 * - Error handling and rollback
 * - Retry functionality
 * - Delete failed message functionality
 * - Sending state tracking
 */

import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useSendMessage } from '../useSendMessage'
import { createClient } from '../../../../lib/supabase/client'
import type { MessageWithSender } from '../../../../types/chat'
import type { UUID } from '../../../../types/database'

// Mock the Supabase client
vi.mock('../../../../lib/supabase/client', () => ({
  createClient: vi.fn(),
}))

// Mock generateOptimisticId
vi.mock('../../utils/formatters', () => ({
  generateOptimisticId: vi.fn(() => `optimistic-${Date.now()}-mock123`),
}))

// Mock data
const mockConversationId: UUID = 'test-conversation-123'
const mockCurrentUserId: UUID = 'test-user-123'

const mockSenderProfile = {
  id: mockCurrentUserId,
  username: 'TestUser',
  avatar_config: null,
  display_name: 'Test User',
  own_avatar: {},
  rpm_avatar: null,
  rpm_avatar_id: null,
  is_verified: false,
  verified_at: null,
  created_at: '2024-01-01T00:00:00.000Z',
  updated_at: '2024-01-01T00:00:00.000Z',
}

const createMockSentMessage = (content: string): MessageWithSender => ({
  id: 'real-msg-123',
  conversation_id: mockConversationId,
  sender_id: mockCurrentUserId,
  content,
  is_read: false,
  created_at: new Date().toISOString(),
  sender: mockSenderProfile,
})

// Create mock Supabase functions
const createMockSupabase = () => {
  const mockInsertSelect = vi.fn().mockReturnValue({
    single: vi.fn().mockResolvedValue({
      data: createMockSentMessage('Test message'),
      error: null,
    }),
  })

  const mockInsert = vi.fn().mockReturnValue({
    select: vi.fn().mockReturnValue(mockInsertSelect()),
  })

  const mockFrom = vi.fn().mockReturnValue({
    insert: mockInsert,
  })

  return {
    from: mockFrom,
    _mockFrom: mockFrom,
    _mockInsert: mockInsert,
  }
}

describe('useSendMessage', () => {
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
    it('should start with isSending false', () => {
      const { result } = renderHook(() =>
        useSendMessage({
          conversationId: mockConversationId,
          currentUserId: mockCurrentUserId,
        })
      )

      expect(result.current.isSending).toBe(false)
    })

    it('should start with empty optimisticMessages array', () => {
      const { result } = renderHook(() =>
        useSendMessage({
          conversationId: mockConversationId,
          currentUserId: mockCurrentUserId,
        })
      )

      expect(result.current.optimisticMessages).toEqual([])
    })
  })

  describe('sendMessage function', () => {
    it('should not send empty messages', async () => {
      const { result } = renderHook(() =>
        useSendMessage({
          conversationId: mockConversationId,
          currentUserId: mockCurrentUserId,
        })
      )

      await act(async () => {
        await result.current.sendMessage('')
      })

      expect(mockSupabase.from).not.toHaveBeenCalled()
      expect(result.current.optimisticMessages).toHaveLength(0)
    })

    it('should not send whitespace-only messages', async () => {
      const { result } = renderHook(() =>
        useSendMessage({
          conversationId: mockConversationId,
          currentUserId: mockCurrentUserId,
        })
      )

      await act(async () => {
        await result.current.sendMessage('   ')
      })

      expect(mockSupabase.from).not.toHaveBeenCalled()
      expect(result.current.optimisticMessages).toHaveLength(0)
    })

    it('should add optimistic message with sending status', async () => {
      // Make insert hang to observe optimistic state
      mockSupabase._mockFrom.mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockImplementation(
              () => new Promise(() => {}) // Never resolves
            ),
          }),
        }),
      })

      const { result } = renderHook(() =>
        useSendMessage({
          conversationId: mockConversationId,
          currentUserId: mockCurrentUserId,
        })
      )

      act(() => {
        result.current.sendMessage('Hello world')
      })

      // Check optimistic message was added
      await waitFor(() => {
        expect(result.current.optimisticMessages).toHaveLength(1)
      })

      expect(result.current.optimisticMessages[0].content).toBe('Hello world')
      expect(result.current.optimisticMessages[0].status).toBe('sending')
      expect(result.current.isSending).toBe(true)
    })

    it('should trim message content', async () => {
      let capturedContent = ''
      mockSupabase._mockFrom.mockReturnValue({
        insert: vi.fn().mockImplementation((data) => {
          capturedContent = data.content
          return {
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: createMockSentMessage(data.content),
                error: null,
              }),
            }),
          }
        }),
      })

      const { result } = renderHook(() =>
        useSendMessage({
          conversationId: mockConversationId,
          currentUserId: mockCurrentUserId,
        })
      )

      await act(async () => {
        await result.current.sendMessage('  Hello world  ')
      })

      expect(capturedContent).toBe('Hello world')
    })

    it('should call onMessageSent callback on success', async () => {
      const onMessageSent = vi.fn()

      const { result } = renderHook(() =>
        useSendMessage({
          conversationId: mockConversationId,
          currentUserId: mockCurrentUserId,
          onMessageSent,
        })
      )

      await act(async () => {
        await result.current.sendMessage('Test message')
      })

      expect(onMessageSent).toHaveBeenCalledWith(
        expect.objectContaining({
          content: 'Test message',
          sender_id: mockCurrentUserId,
        })
      )
    })

    it('should remove optimistic message on success', async () => {
      const { result } = renderHook(() =>
        useSendMessage({
          conversationId: mockConversationId,
          currentUserId: mockCurrentUserId,
        })
      )

      await act(async () => {
        await result.current.sendMessage('Test message')
      })

      // After success, optimistic message should be removed
      expect(result.current.optimisticMessages).toHaveLength(0)
    })

    it('should set isSending to false after completion', async () => {
      const { result } = renderHook(() =>
        useSendMessage({
          conversationId: mockConversationId,
          currentUserId: mockCurrentUserId,
        })
      )

      await act(async () => {
        await result.current.sendMessage('Test message')
      })

      expect(result.current.isSending).toBe(false)
    })
  })

  describe('Error handling and rollback', () => {
    it('should mark optimistic message as failed on error', async () => {
      mockSupabase._mockFrom.mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Database error' },
            }),
          }),
        }),
      })

      const { result } = renderHook(() =>
        useSendMessage({
          conversationId: mockConversationId,
          currentUserId: mockCurrentUserId,
        })
      )

      await act(async () => {
        await result.current.sendMessage('Test message')
      })

      expect(result.current.optimisticMessages).toHaveLength(1)
      expect(result.current.optimisticMessages[0].status).toBe('failed')
    })

    it('should call onError callback on failure', async () => {
      const onError = vi.fn()
      const errorMessage = 'Network error'

      mockSupabase._mockFrom.mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { message: errorMessage },
            }),
          }),
        }),
      })

      const { result } = renderHook(() =>
        useSendMessage({
          conversationId: mockConversationId,
          currentUserId: mockCurrentUserId,
          onError,
        })
      )

      await act(async () => {
        await result.current.sendMessage('Test message')
      })

      expect(onError).toHaveBeenCalledWith(expect.any(String), expect.any(String))
    })

    it('should handle thrown exceptions', async () => {
      const onError = vi.fn()

      mockSupabase._mockFrom.mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockRejectedValue(new Error('Unexpected error')),
          }),
        }),
      })

      const { result } = renderHook(() =>
        useSendMessage({
          conversationId: mockConversationId,
          currentUserId: mockCurrentUserId,
          onError,
        })
      )

      await act(async () => {
        await result.current.sendMessage('Test message')
      })

      expect(result.current.optimisticMessages[0].status).toBe('failed')
    })

    it('should handle non-Error thrown values', async () => {
      mockSupabase._mockFrom.mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockRejectedValue('String error'),
          }),
        }),
      })

      const { result } = renderHook(() =>
        useSendMessage({
          conversationId: mockConversationId,
          currentUserId: mockCurrentUserId,
        })
      )

      await act(async () => {
        await result.current.sendMessage('Test message')
      })

      expect(result.current.optimisticMessages[0].status).toBe('failed')
    })
  })

  describe('retryMessage function', () => {
    it('should retry a failed message', async () => {
      // First, make the send fail
      mockSupabase._mockFrom.mockReturnValueOnce({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'First attempt failed' },
            }),
          }),
        }),
      })

      const { result } = renderHook(() =>
        useSendMessage({
          conversationId: mockConversationId,
          currentUserId: mockCurrentUserId,
        })
      )

      await act(async () => {
        await result.current.sendMessage('Test message')
      })

      expect(result.current.optimisticMessages[0].status).toBe('failed')

      // Now setup for success on retry
      mockSupabase._mockFrom.mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: createMockSentMessage('Test message'),
              error: null,
            }),
          }),
        }),
      })

      const failedMessageId = result.current.optimisticMessages[0].id

      await act(async () => {
        await result.current.retryMessage(failedMessageId)
      })

      // After successful retry, optimistic message should be removed
      expect(result.current.optimisticMessages).toHaveLength(0)
    })

    it('should not retry a non-existent message', async () => {
      const { result } = renderHook(() =>
        useSendMessage({
          conversationId: mockConversationId,
          currentUserId: mockCurrentUserId,
        })
      )

      await act(async () => {
        await result.current.retryMessage('non-existent-id')
      })

      // No message should be added
      expect(result.current.optimisticMessages).toHaveLength(0)
    })

    it('should not retry a message that is not failed', async () => {
      // Make send hang to keep message in "sending" state
      mockSupabase._mockFrom.mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockImplementation(
              () => new Promise(() => {}) // Never resolves
            ),
          }),
        }),
      })

      const { result } = renderHook(() =>
        useSendMessage({
          conversationId: mockConversationId,
          currentUserId: mockCurrentUserId,
        })
      )

      act(() => {
        result.current.sendMessage('Test message')
      })

      await waitFor(() => {
        expect(result.current.optimisticMessages).toHaveLength(1)
      })

      const sendingMessageId = result.current.optimisticMessages[0].id

      // Try to retry a message that is still sending
      await act(async () => {
        await result.current.retryMessage(sendingMessageId)
      })

      // Message should still be in sending state
      expect(result.current.optimisticMessages[0].status).toBe('sending')
    })

    it('should set status to sending during retry', async () => {
      // First fail
      mockSupabase._mockFrom.mockReturnValueOnce({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Failed' },
            }),
          }),
        }),
      })

      const { result } = renderHook(() =>
        useSendMessage({
          conversationId: mockConversationId,
          currentUserId: mockCurrentUserId,
        })
      )

      await act(async () => {
        await result.current.sendMessage('Test message')
      })

      // Hang on retry to observe status change
      mockSupabase._mockFrom.mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockImplementation(
              () => new Promise(() => {}) // Never resolves
            ),
          }),
        }),
      })

      const failedMessageId = result.current.optimisticMessages[0].id

      act(() => {
        result.current.retryMessage(failedMessageId)
      })

      await waitFor(() => {
        expect(result.current.optimisticMessages[0].status).toBe('sending')
      })
    })
  })

  describe('deleteFailedMessage function', () => {
    it('should delete a failed message', async () => {
      // Make send fail
      mockSupabase._mockFrom.mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Failed' },
            }),
          }),
        }),
      })

      const { result } = renderHook(() =>
        useSendMessage({
          conversationId: mockConversationId,
          currentUserId: mockCurrentUserId,
        })
      )

      await act(async () => {
        await result.current.sendMessage('Test message')
      })

      expect(result.current.optimisticMessages).toHaveLength(1)

      const failedMessageId = result.current.optimisticMessages[0].id

      await act(async () => {
        await result.current.deleteFailedMessage(failedMessageId)
      })

      expect(result.current.optimisticMessages).toHaveLength(0)
    })

    it('should not delete a message that does not exist', async () => {
      const { result } = renderHook(() =>
        useSendMessage({
          conversationId: mockConversationId,
          currentUserId: mockCurrentUserId,
        })
      )

      await act(async () => {
        await result.current.deleteFailedMessage('non-existent-id')
      })

      expect(result.current.optimisticMessages).toHaveLength(0)
    })

    it('should not delete a message that is still sending', async () => {
      // Make send hang to keep message in "sending" state
      mockSupabase._mockFrom.mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockImplementation(
              () => new Promise(() => {}) // Never resolves
            ),
          }),
        }),
      })

      const { result } = renderHook(() =>
        useSendMessage({
          conversationId: mockConversationId,
          currentUserId: mockCurrentUserId,
        })
      )

      act(() => {
        result.current.sendMessage('Test message')
      })

      await waitFor(() => {
        expect(result.current.optimisticMessages).toHaveLength(1)
      })

      const sendingMessageId = result.current.optimisticMessages[0].id

      await act(async () => {
        await result.current.deleteFailedMessage(sendingMessageId)
      })

      // Message should still exist since it's not failed
      expect(result.current.optimisticMessages).toHaveLength(1)
    })
  })
})