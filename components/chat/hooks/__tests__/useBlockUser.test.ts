/**
 * useBlockUser Hook Tests
 *
 * Tests for the useBlockUser hook including:
 * - Blocking user API calls
 * - Loading states
 * - Error handling
 * - Success/navigation callbacks
 * - Duplicate operation prevention
 * - Already blocked user handling
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useBlockUser } from '../useBlockUser'
import * as supabaseModule from '../../../../lib/supabase'
import type { UUID } from '../../../../types/database'

// Mock the Supabase client
vi.mock('../../../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}))

// Mock console.warn for testing warning scenarios
const originalWarn = console.warn
beforeEach(() => {
  console.warn = vi.fn()
})
afterEach(() => {
  console.warn = originalWarn
})

// Mock data
const mockCurrentUserId: UUID = 'test-user-123'
const mockTargetUserId: UUID = 'test-target-456'
const mockConversationId: UUID = 'test-conversation-789'

// Create mock Supabase functions
const createMockSupabase = () => {
  const mockInsert = vi.fn().mockResolvedValue({ error: null })
  const mockUpdate = vi.fn().mockReturnValue({
    eq: vi.fn().mockResolvedValue({ error: null }),
  })

  const mockFrom = vi.fn().mockImplementation((table: string) => {
    if (table === 'blocked_users') {
      return { insert: mockInsert }
    }
    if (table === 'conversations') {
      return { update: mockUpdate }
    }
    return {}
  })

  return {
    from: mockFrom,
    _mockFrom: mockFrom,
    _mockInsert: mockInsert,
    _mockUpdate: mockUpdate,
  }
}

describe('useBlockUser', () => {
  let mockSupabase: ReturnType<typeof createMockSupabase>

  beforeEach(() => {
    vi.clearAllMocks()
    mockSupabase = createMockSupabase()
    // Set up the mocked supabase module
    vi.mocked(supabaseModule.supabase.from).mockImplementation(mockSupabase.from)
  })

  describe('Initial state', () => {
    it('should start with isBlocking false', () => {
      const { result } = renderHook(() =>
        useBlockUser({
          currentUserId: mockCurrentUserId,
          targetUserId: mockTargetUserId,
          conversationId: mockConversationId,
        })
      )

      expect(result.current.isBlocking).toBe(false)
    })

    it('should start with error null', () => {
      const { result } = renderHook(() =>
        useBlockUser({
          currentUserId: mockCurrentUserId,
          targetUserId: mockTargetUserId,
          conversationId: mockConversationId,
        })
      )

      expect(result.current.error).toBeNull()
    })

    it('should provide blockUser and clearError functions', () => {
      const { result } = renderHook(() =>
        useBlockUser({
          currentUserId: mockCurrentUserId,
          targetUserId: mockTargetUserId,
          conversationId: mockConversationId,
        })
      )

      expect(typeof result.current.blockUser).toBe('function')
      expect(typeof result.current.clearError).toBe('function')
    })
  })

  describe('blockUser function', () => {
    it('should insert into blocked_users table', async () => {
      const { result } = renderHook(() =>
        useBlockUser({
          currentUserId: mockCurrentUserId,
          targetUserId: mockTargetUserId,
          conversationId: mockConversationId,
        })
      )

      await act(async () => {
        await result.current.blockUser()
      })

      expect(supabaseModule.supabase.from).toHaveBeenCalledWith('blocked_users')
      expect(mockSupabase._mockInsert).toHaveBeenCalledWith({
        blocker_id: mockCurrentUserId,
        blocked_id: mockTargetUserId,
      })
    })

    it('should update conversation status to blocked', async () => {
      const { result } = renderHook(() =>
        useBlockUser({
          currentUserId: mockCurrentUserId,
          targetUserId: mockTargetUserId,
          conversationId: mockConversationId,
        })
      )

      await act(async () => {
        await result.current.blockUser()
      })

      expect(supabaseModule.supabase.from).toHaveBeenCalledWith('conversations')
      expect(mockSupabase._mockUpdate).toHaveBeenCalledWith({ status: 'blocked' })
    })

    it('should set isBlocking to true during operation', async () => {
      let resolveBlock: () => void = () => {}
      mockSupabase._mockInsert.mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveBlock = () => resolve({ error: null })
          })
      )

      const { result } = renderHook(() =>
        useBlockUser({
          currentUserId: mockCurrentUserId,
          targetUserId: mockTargetUserId,
          conversationId: mockConversationId,
        })
      )

      act(() => {
        result.current.blockUser()
      })

      await waitFor(() => {
        expect(result.current.isBlocking).toBe(true)
      })

      await act(async () => {
        resolveBlock()
      })

      await waitFor(() => {
        expect(result.current.isBlocking).toBe(false)
      })
    })

    it('should call onSuccess callback on successful block', async () => {
      const onSuccess = vi.fn()

      const { result } = renderHook(() =>
        useBlockUser({
          currentUserId: mockCurrentUserId,
          targetUserId: mockTargetUserId,
          conversationId: mockConversationId,
          onSuccess,
        })
      )

      await act(async () => {
        await result.current.blockUser()
      })

      expect(onSuccess).toHaveBeenCalledWith(mockTargetUserId)
    })

    it('should call onNavigateAway callback after success', async () => {
      const onNavigateAway = vi.fn()

      const { result } = renderHook(() =>
        useBlockUser({
          currentUserId: mockCurrentUserId,
          targetUserId: mockTargetUserId,
          conversationId: mockConversationId,
          onNavigateAway,
        })
      )

      await act(async () => {
        await result.current.blockUser()
      })

      expect(onNavigateAway).toHaveBeenCalled()
    })

    it('should not block if targetUserId is empty', async () => {
      const { result } = renderHook(() =>
        useBlockUser({
          currentUserId: mockCurrentUserId,
          targetUserId: '' as UUID,
          conversationId: mockConversationId,
        })
      )

      await act(async () => {
        await result.current.blockUser()
      })

      expect(mockSupabase._mockInsert).not.toHaveBeenCalled()
    })
  })

  describe('Error handling', () => {
    it('should set error state on database error', async () => {
      mockSupabase._mockInsert.mockResolvedValue({
        error: { message: 'Database connection failed' },
      })

      const { result } = renderHook(() =>
        useBlockUser({
          currentUserId: mockCurrentUserId,
          targetUserId: mockTargetUserId,
          conversationId: mockConversationId,
        })
      )

      await act(async () => {
        await result.current.blockUser()
      })

      expect(result.current.error).toBeTruthy()
    })

    it('should call onError callback on failure', async () => {
      const onError = vi.fn()
      const errorMessage = 'Network error'

      mockSupabase._mockInsert.mockResolvedValue({
        error: { message: errorMessage },
      })

      const { result } = renderHook(() =>
        useBlockUser({
          currentUserId: mockCurrentUserId,
          targetUserId: mockTargetUserId,
          conversationId: mockConversationId,
          onError,
        })
      )

      await act(async () => {
        await result.current.blockUser()
      })

      expect(onError).toHaveBeenCalledWith(expect.any(String))
    })

    it('should handle unique constraint violation (already blocked)', async () => {
      mockSupabase._mockInsert.mockResolvedValue({
        error: { code: '23505', message: 'Unique constraint violation' },
      })

      const { result } = renderHook(() =>
        useBlockUser({
          currentUserId: mockCurrentUserId,
          targetUserId: mockTargetUserId,
          conversationId: mockConversationId,
        })
      )

      await act(async () => {
        await result.current.blockUser()
      })

      expect(result.current.error).toBe('You have already blocked this user')
    })

    it('should handle thrown exceptions', async () => {
      mockSupabase._mockInsert.mockRejectedValue(new Error('Unexpected error'))

      const { result } = renderHook(() =>
        useBlockUser({
          currentUserId: mockCurrentUserId,
          targetUserId: mockTargetUserId,
          conversationId: mockConversationId,
        })
      )

      await act(async () => {
        await result.current.blockUser()
      })

      expect(result.current.error).toBe('Unexpected error')
    })

    it('should handle non-Error thrown values', async () => {
      mockSupabase._mockInsert.mockRejectedValue('String error')

      const { result } = renderHook(() =>
        useBlockUser({
          currentUserId: mockCurrentUserId,
          targetUserId: mockTargetUserId,
          conversationId: mockConversationId,
        })
      )

      await act(async () => {
        await result.current.blockUser()
      })

      expect(result.current.error).toBe('Failed to block user. Please try again.')
    })

    it('should warn but continue if conversation update fails', async () => {
      mockSupabase._mockUpdate.mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          error: { message: 'Update failed' },
        }),
      })

      const onSuccess = vi.fn()

      const { result } = renderHook(() =>
        useBlockUser({
          currentUserId: mockCurrentUserId,
          targetUserId: mockTargetUserId,
          conversationId: mockConversationId,
          onSuccess,
        })
      )

      await act(async () => {
        await result.current.blockUser()
      })

      // Should still call success callback
      expect(onSuccess).toHaveBeenCalled()
      expect(console.warn).toHaveBeenCalled()
    })
  })

  describe('clearError function', () => {
    it('should clear the error state', async () => {
      mockSupabase._mockInsert.mockResolvedValue({
        error: { message: 'Some error' },
      })

      const { result } = renderHook(() =>
        useBlockUser({
          currentUserId: mockCurrentUserId,
          targetUserId: mockTargetUserId,
          conversationId: mockConversationId,
        })
      )

      await act(async () => {
        await result.current.blockUser()
      })

      expect(result.current.error).toBeTruthy()

      act(() => {
        result.current.clearError()
      })

      expect(result.current.error).toBeNull()
    })
  })

  describe('Duplicate operation prevention', () => {
    it('should prevent duplicate block operations', async () => {
      let resolveFirst: () => void = () => {}
      let callCount = 0

      mockSupabase._mockInsert.mockImplementation(() => {
        callCount++
        return new Promise((resolve) => {
          if (callCount === 1) {
            resolveFirst = () => resolve({ error: null })
          } else {
            resolve({ error: null })
          }
        })
      })

      const { result } = renderHook(() =>
        useBlockUser({
          currentUserId: mockCurrentUserId,
          targetUserId: mockTargetUserId,
          conversationId: mockConversationId,
        })
      )

      // Start first block operation
      act(() => {
        result.current.blockUser()
      })

      // Try to start second block operation while first is pending
      act(() => {
        result.current.blockUser()
      })

      // Should only have one call
      await waitFor(() => {
        expect(callCount).toBe(1)
      })

      // Complete the first operation
      await act(async () => {
        resolveFirst()
      })

      // After completion, should be able to block again
      await act(async () => {
        await result.current.blockUser()
      })

      expect(callCount).toBe(2)
    })
  })

  describe('Return value structure', () => {
    it('should return all expected properties', () => {
      const { result } = renderHook(() =>
        useBlockUser({
          currentUserId: mockCurrentUserId,
          targetUserId: mockTargetUserId,
          conversationId: mockConversationId,
        })
      )

      expect(result.current).toHaveProperty('isBlocking')
      expect(result.current).toHaveProperty('error')
      expect(result.current).toHaveProperty('blockUser')
      expect(result.current).toHaveProperty('clearError')

      // Verify types
      expect(typeof result.current.isBlocking).toBe('boolean')
      expect(typeof result.current.blockUser).toBe('function')
      expect(typeof result.current.clearError).toBe('function')
    })
  })
})
