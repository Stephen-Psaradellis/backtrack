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

import { renderHook, act, waitFor } from '@testing-library/react'
import { useSendMessage } from '../useSendMessage'
import { createClient } from '../../../../lib/supabase/client'
import type { MessageWithSender } from '../../../../types/chat'
import type { UUID } from '../../../../types/database'

// Mock the Supabase client
jest.mock('../../../../lib/supabase/client', () => ({
  createClient: jest.fn(),
}))

// Mock generateOptimisticId
jest.mock('../../utils/formatters', () => ({
  generateOptimisticId: jest.fn(() => `optimistic-${Date.now()}-mock123`),
}))

// Mock data
const mockConversationId: UUID = 'test-conversation-123'
const mockCurrentUserId: UUID = 'test-user-123'

const mockSenderProfile = {
  id: mockCurrentUserId,
  username: 'TestUser',
  avatar_config: null,
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
  const mockInsertSelect = jest.fn().mockReturnValue({
    single: jest.fn().mockResolvedValue({
      data: createMockSentMessage('Test message'),
      error: null,
    }),
  })

  const mockInsert = jest.fn().mockReturnValue({
    select: jest.fn().mockReturnValue(mockInsertSelect()),
  })

  const mockFrom = jest.fn().mockReturnValue({
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
    jest.clearAllMocks()
    jest.useFakeTimers()
    mockSupabase = createMockSupabase()
    ;(createClient as jest.Mock).mockReturnValue(mockSupabase)
  })

  afterEach(() => {
    jest.useRealTimers()
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
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockImplementation(
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
        insert: jest.fn().mockImplementation((data) => {
          capturedContent = data.content
          return {
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
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
      const onMessageSent = jest.fn()

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
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
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
      const onError = jest.fn()
      const errorMessage = 'Network error'

      mockSupabase._mockFrom.mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
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
      const onError = jest.fn()

      mockSupabase._mockFrom.mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockRejectedValue(new Error('Unexpected error')),
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
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockRejectedValue('String error'),
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
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
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
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
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
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockImplementation(
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
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
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
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockImplementation(
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
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
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

      act(() => {
        result.current.deleteFailedMessage(failedMessageId)
      })

      expect(result.current.optimisticMessages).toHaveLength(0)
    })

    it('should not delete a message that is not failed', async () => {
      // Make send hang
      mockSupabase._mockFrom.mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockImplementation(
              () => new Promise(() => {})
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

      act(() => {
        result.current.deleteFailedMessage(sendingMessageId)
      })

      // Message should still exist because it's not failed
      expect(result.current.optimisticMessages).toHaveLength(1)
    })

    it('should not throw when deleting non-existent message', () => {
      const { result } = renderHook(() =>
        useSendMessage({
          conversationId: mockConversationId,
          currentUserId: mockCurrentUserId,
        })
      )

      expect(() => {
        act(() => {
          result.current.deleteFailedMessage('non-existent-id')
        })
      }).not.toThrow()
    })
  })

  describe('Concurrent operations', () => {
    it('should handle multiple concurrent sends', async () => {
      const onMessageSent = jest.fn()
      let messageCount = 0

      mockSupabase._mockFrom.mockImplementation(() => ({
        insert: jest.fn().mockImplementation((data) => ({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: {
                ...createMockSentMessage(data.content),
                id: `real-msg-${++messageCount}`,
              },
              error: null,
            }),
          }),
        })),
      }))

      const { result } = renderHook(() =>
        useSendMessage({
          conversationId: mockConversationId,
          currentUserId: mockCurrentUserId,
          onMessageSent,
        })
      )

      await act(async () => {
        await Promise.all([
          result.current.sendMessage('Message 1'),
          result.current.sendMessage('Message 2'),
          result.current.sendMessage('Message 3'),
        ])
      })

      expect(onMessageSent).toHaveBeenCalledTimes(3)
      expect(result.current.optimisticMessages).toHaveLength(0)
    })

    it('should track isSending correctly with concurrent sends', async () => {
      let resolvers: Array<() => void> = []

      mockSupabase._mockFrom.mockImplementation(() => ({
        insert: jest.fn().mockImplementation((data) => ({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockImplementation(() => new Promise((resolve) => {
              resolvers.push(() => resolve({
                data: createMockSentMessage(data.content),
                error: null,
              }))
            })),
          }),
        })),
      }))

      const { result } = renderHook(() =>
        useSendMessage({
          conversationId: mockConversationId,
          currentUserId: mockCurrentUserId,
        })
      )

      // Start two sends
      act(() => {
        result.current.sendMessage('Message 1')
        result.current.sendMessage('Message 2')
      })

      await waitFor(() => {
        expect(result.current.isSending).toBe(true)
        expect(result.current.optimisticMessages).toHaveLength(2)
      })

      // Resolve first message
      await act(async () => {
        resolvers[0]()
      })

      await waitFor(() => {
        expect(result.current.optimisticMessages).toHaveLength(1)
      })

      // Should still be sending because second message is pending
      expect(result.current.isSending).toBe(true)

      // Resolve second message
      await act(async () => {
        resolvers[1]()
      })

      await waitFor(() => {
        expect(result.current.optimisticMessages).toHaveLength(0)
      })

      expect(result.current.isSending).toBe(false)
    })
  })

  describe('Return value structure', () => {
    it('should return all expected properties', () => {
      const { result } = renderHook(() =>
        useSendMessage({
          conversationId: mockConversationId,
          currentUserId: mockCurrentUserId,
        })
      )

      expect(result.current).toHaveProperty('isSending')
      expect(result.current).toHaveProperty('optimisticMessages')
      expect(result.current).toHaveProperty('sendMessage')
      expect(result.current).toHaveProperty('retryMessage')
      expect(result.current).toHaveProperty('deleteFailedMessage')

      // Verify types
      expect(typeof result.current.isSending).toBe('boolean')
      expect(Array.isArray(result.current.optimisticMessages)).toBe(true)
      expect(typeof result.current.sendMessage).toBe('function')
      expect(typeof result.current.retryMessage).toBe('function')
      expect(typeof result.current.deleteFailedMessage).toBe('function')
    })
  })
})
