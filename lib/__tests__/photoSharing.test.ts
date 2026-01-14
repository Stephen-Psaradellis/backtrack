/**
 * Tests for lib/photoSharing.ts
 *
 * Tests photo sharing constants and error handling.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock storage
vi.mock('../storage', () => ({
  getSignedUrlFromPath: vi.fn().mockResolvedValue({
    success: true,
    signedUrl: 'https://example.com/signed-url',
    expiresIn: 3600,
    error: null,
  }),
}))

// Mock supabase
vi.mock('../supabase', () => {
  const mockGetUser = vi.fn()
  const mockSingle = vi.fn()
  const mockEq = vi.fn()
  const mockSelect = vi.fn()
  const mockUpsert = vi.fn()
  const mockDelete = vi.fn()
  const mockOrder = vi.fn()
  const mockChannel = vi.fn()
  const mockOn = vi.fn()
  const mockSubscribe = vi.fn()
  const mockUnsubscribe = vi.fn()

  // Set up chain returns
  mockSelect.mockReturnValue({ eq: mockEq, single: mockSingle, order: mockOrder })
  mockEq.mockReturnValue({ eq: mockEq, single: mockSingle, order: mockOrder })
  mockOrder.mockResolvedValue({ data: [], error: null })
  mockUpsert.mockReturnValue({ select: vi.fn().mockReturnValue({ single: mockSingle }) })
  mockDelete.mockReturnValue({ eq: mockEq })
  mockChannel.mockReturnValue({
    on: mockOn.mockReturnValue({
      subscribe: mockSubscribe.mockReturnValue({ unsubscribe: mockUnsubscribe }),
    }),
  })

  return {
    supabase: {
      auth: { getUser: () => mockGetUser() },
      from: vi.fn(() => ({
        select: mockSelect,
        upsert: mockUpsert,
        delete: mockDelete,
      })),
      channel: mockChannel,
      __mocks: {
        mockGetUser,
        mockSingle,
        mockEq,
        mockSelect,
        mockUpsert,
        mockDelete,
        mockOrder,
        mockChannel,
        mockOn,
        mockSubscribe,
        mockUnsubscribe,
      },
    },
  }
})

import { supabase } from '../supabase'
import {
  PHOTO_SHARING_ERRORS,
  sharePhotoWithMatch,
  sharePhoto,
  unsharePhotoFromMatch,
  unsharePhoto,
  subscribeToPhotoShareChanges,
  isPhotoSharedInConversation,
  getPhotoShareStatus,
  getPhotoShareCount,
  getSharedPhotosForConversation,
  getMySharedPhotosForConversation,
} from '../photoSharing'

// Get mocks from supabase
const { __mocks } = supabase as unknown as { __mocks: Record<string, ReturnType<typeof vi.fn>> }
const {
  mockGetUser,
  mockSingle,
  mockEq,
  mockSelect,
  mockUpsert,
  mockDelete,
  mockChannel,
  mockOn,
  mockSubscribe,
  mockUnsubscribe,
} = __mocks

describe('photoSharing', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Default: authenticated user
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-123' } },
    })

    // Reset default mock chain setup
    mockSelect.mockReturnValue({ eq: mockEq, single: mockSingle })
    mockEq.mockReturnValue({ eq: mockEq, single: mockSingle })
    mockUpsert.mockReturnValue({ select: vi.fn().mockReturnValue({ single: mockSingle }) })
    mockDelete.mockReturnValue({ eq: mockEq })
    mockChannel.mockReturnValue({
      on: mockOn.mockReturnValue({
        subscribe: mockSubscribe.mockReturnValue({ unsubscribe: mockUnsubscribe }),
      }),
    })
  })

  describe('PHOTO_SHARING_ERRORS', () => {
    it('should have required error messages', () => {
      expect(PHOTO_SHARING_ERRORS.NOT_AUTHENTICATED).toBeDefined()
      expect(PHOTO_SHARING_ERRORS.PHOTO_NOT_FOUND).toBeDefined()
      expect(PHOTO_SHARING_ERRORS.PHOTO_NOT_APPROVED).toBeDefined()
      expect(PHOTO_SHARING_ERRORS.PHOTO_PENDING_MODERATION).toBeDefined()
      expect(PHOTO_SHARING_ERRORS.PHOTO_REJECTED).toBeDefined()
      expect(PHOTO_SHARING_ERRORS.PHOTO_NOT_OWNED).toBeDefined()
      expect(PHOTO_SHARING_ERRORS.CONVERSATION_NOT_FOUND).toBeDefined()
      expect(PHOTO_SHARING_ERRORS.NOT_IN_CONVERSATION).toBeDefined()
      expect(PHOTO_SHARING_ERRORS.SHARE_FAILED).toBeDefined()
      expect(PHOTO_SHARING_ERRORS.UNSHARE_FAILED).toBeDefined()
      expect(PHOTO_SHARING_ERRORS.FETCH_FAILED).toBeDefined()
      expect(PHOTO_SHARING_ERRORS.SHARE_NOT_FOUND).toBeDefined()
    })
  })

  describe('sharePhotoWithMatch', () => {
    it('should return error when not authenticated', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: null } })

      const result = await sharePhotoWithMatch('photo-123', 'conv-456')

      expect(result.success).toBe(false)
      expect(result.error).toBe(PHOTO_SHARING_ERRORS.NOT_AUTHENTICATED)
    })

    it('should return error when photo not found', async () => {
      mockSingle.mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST116', message: 'Not found' },
      })

      const result = await sharePhotoWithMatch('photo-123', 'conv-456')

      expect(result.success).toBe(false)
      expect(result.error).toBe(PHOTO_SHARING_ERRORS.PHOTO_NOT_FOUND)
    })

    it('should return error when photo is pending moderation', async () => {
      mockSingle.mockResolvedValueOnce({
        data: { id: 'photo-123', moderation_status: 'pending' },
        error: null,
      })

      const result = await sharePhotoWithMatch('photo-123', 'conv-456')

      expect(result.success).toBe(false)
      expect(result.error).toBe(PHOTO_SHARING_ERRORS.PHOTO_PENDING_MODERATION)
    })

    it('should return error when photo is rejected', async () => {
      mockSingle.mockResolvedValueOnce({
        data: { id: 'photo-123', moderation_status: 'rejected' },
        error: null,
      })

      const result = await sharePhotoWithMatch('photo-123', 'conv-456')

      expect(result.success).toBe(false)
      expect(result.error).toBe(PHOTO_SHARING_ERRORS.PHOTO_REJECTED)
    })

    it('should return error when photo has unknown moderation status', async () => {
      mockSingle.mockResolvedValueOnce({
        data: { id: 'photo-123', moderation_status: 'error' },
        error: null,
      })

      const result = await sharePhotoWithMatch('photo-123', 'conv-456')

      expect(result.success).toBe(false)
      expect(result.error).toBe(PHOTO_SHARING_ERRORS.PHOTO_NOT_APPROVED)
    })

    it('should return error when conversation not found', async () => {
      // Photo is approved
      mockSingle.mockResolvedValueOnce({
        data: { id: 'photo-123', moderation_status: 'approved' },
        error: null,
      })
      // Conversation not found
      mockSingle.mockResolvedValueOnce({
        data: null,
        error: { message: 'Not found' },
      })

      const result = await sharePhotoWithMatch('photo-123', 'conv-456')

      expect(result.success).toBe(false)
      expect(result.error).toBe(PHOTO_SHARING_ERRORS.NOT_IN_CONVERSATION)
    })

    it('should return error when user is not a participant', async () => {
      // Photo is approved
      mockSingle.mockResolvedValueOnce({
        data: { id: 'photo-123', moderation_status: 'approved' },
        error: null,
      })
      // Conversation has different users
      mockSingle.mockResolvedValueOnce({
        data: { producer_id: 'other-user', consumer_id: 'another-user' },
        error: null,
      })

      const result = await sharePhotoWithMatch('photo-123', 'conv-456')

      expect(result.success).toBe(false)
      expect(result.error).toBe(PHOTO_SHARING_ERRORS.NOT_IN_CONVERSATION)
    })

    it('should share photo successfully as producer', async () => {
      // Photo is approved
      mockSingle.mockResolvedValueOnce({
        data: { id: 'photo-123', moderation_status: 'approved' },
        error: null,
      })
      // User is producer
      mockSingle.mockResolvedValueOnce({
        data: { producer_id: 'user-123', consumer_id: 'match-456' },
        error: null,
      })
      // Share creation succeeds
      mockSingle.mockResolvedValueOnce({
        data: { id: 'share-789', photo_id: 'photo-123' },
        error: null,
      })

      const result = await sharePhotoWithMatch('photo-123', 'conv-456')

      expect(result.success).toBe(true)
      expect(result.share).toBeDefined()
      expect(result.share?.id).toBe('share-789')
    })

    it('should share photo successfully as consumer', async () => {
      // Photo is approved
      mockSingle.mockResolvedValueOnce({
        data: { id: 'photo-123', moderation_status: 'approved' },
        error: null,
      })
      // User is consumer
      mockSingle.mockResolvedValueOnce({
        data: { producer_id: 'match-456', consumer_id: 'user-123' },
        error: null,
      })
      // Share creation succeeds
      mockSingle.mockResolvedValueOnce({
        data: { id: 'share-789', photo_id: 'photo-123' },
        error: null,
      })

      const result = await sharePhotoWithMatch('photo-123', 'conv-456')

      expect(result.success).toBe(true)
      expect(result.share).toBeDefined()
    })

    it('should handle share creation error', async () => {
      // Photo is approved
      mockSingle.mockResolvedValueOnce({
        data: { id: 'photo-123', moderation_status: 'approved' },
        error: null,
      })
      // User is in conversation
      mockSingle.mockResolvedValueOnce({
        data: { producer_id: 'user-123', consumer_id: 'match-456' },
        error: null,
      })
      // Share creation fails
      mockSingle.mockResolvedValueOnce({
        data: null,
        error: { message: 'Insert failed' },
      })

      const result = await sharePhotoWithMatch('photo-123', 'conv-456')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Insert failed')
    })

    it('should handle exceptions', async () => {
      mockSingle.mockRejectedValueOnce(new Error('Network error'))

      const result = await sharePhotoWithMatch('photo-123', 'conv-456')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Network error')
    })
  })

  describe('sharePhoto', () => {
    it('should be an alias for sharePhotoWithMatch', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: null } })

      const result = await sharePhoto('photo-123', 'conv-456')

      expect(result.success).toBe(false)
      expect(result.error).toBe(PHOTO_SHARING_ERRORS.NOT_AUTHENTICATED)
    })
  })

  describe('unsharePhotoFromMatch', () => {
    it('should return error when not authenticated', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: null } })

      const result = await unsharePhotoFromMatch('photo-123', 'conv-456')

      expect(result.success).toBe(false)
      expect(result.error).toBe(PHOTO_SHARING_ERRORS.NOT_AUTHENTICATED)
    })

    // Note: Additional tests for unshare functionality require more complex mock chaining
    // The core authentication check is tested above
  })

  describe('unsharePhoto', () => {
    it('should be an alias for unsharePhotoFromMatch', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: null } })

      const result = await unsharePhoto('photo-123', 'conv-456')

      expect(result.success).toBe(false)
      expect(result.error).toBe(PHOTO_SHARING_ERRORS.NOT_AUTHENTICATED)
    })
  })

  describe('subscribeToPhotoShareChanges', () => {
    it('should subscribe to changes and return unsubscribe function', () => {
      const callback = vi.fn()

      const unsubscribe = subscribeToPhotoShareChanges('conv-123', callback)

      expect(mockChannel).toHaveBeenCalledWith('photo_shares_conv-123')
      expect(mockOn).toHaveBeenCalled()
      expect(mockSubscribe).toHaveBeenCalled()
      expect(typeof unsubscribe).toBe('function')
    })

    it('should call unsubscribe when returned function is called', () => {
      const callback = vi.fn()

      const unsubscribe = subscribeToPhotoShareChanges('conv-123', callback)
      unsubscribe()

      expect(mockUnsubscribe).toHaveBeenCalled()
    })
  })

  describe('unsharePhotoFromMatch extended tests', () => {
    it('should delete share record successfully', async () => {
      // User is authenticated
      mockGetUser.mockResolvedValueOnce({ data: { user: { id: 'user-123' } } })
      // Set up delete chain: delete().eq().eq().eq() returns promise with no error
      mockDelete.mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
        }),
      })

      const result = await unsharePhotoFromMatch('photo-123', 'conv-456')

      expect(result.success).toBe(true)
      expect(result.error).toBeNull()
    })

    it('should handle delete error', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: { id: 'user-123' } } })
      mockDelete.mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: { message: 'Delete failed' } }),
          }),
        }),
      })

      const result = await unsharePhotoFromMatch('photo-123', 'conv-456')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Delete failed')
    })

    it('should handle exception during unshare', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: { id: 'user-123' } } })
      mockDelete.mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockRejectedValue(new Error('Network error')),
          }),
        }),
      })

      const result = await unsharePhotoFromMatch('photo-123', 'conv-456')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Network error')
    })

    it('should handle non-Error exception during unshare', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: { id: 'user-123' } } })
      mockDelete.mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockRejectedValue('String error'),
          }),
        }),
      })

      const result = await unsharePhotoFromMatch('photo-123', 'conv-456')

      expect(result.success).toBe(false)
      expect(result.error).toBe(PHOTO_SHARING_ERRORS.UNSHARE_FAILED)
    })
  })

  describe('isPhotoSharedInConversation', () => {
    it('should return false when not authenticated', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: null } })

      const result = await isPhotoSharedInConversation('photo-123', 'conv-456')

      expect(result).toBe(false)
    })

    it('should return true when photo is shared', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: { id: 'user-123' } } })
      mockSelect.mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ count: 1, error: null }),
          }),
        }),
      })

      const result = await isPhotoSharedInConversation('photo-123', 'conv-456')

      expect(result).toBe(true)
    })

    it('should return false when photo is not shared', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: { id: 'user-123' } } })
      mockSelect.mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ count: 0, error: null }),
          }),
        }),
      })

      const result = await isPhotoSharedInConversation('photo-123', 'conv-456')

      expect(result).toBe(false)
    })

    it('should return false on error', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: { id: 'user-123' } } })
      mockSelect.mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ count: null, error: { message: 'Error' } }),
          }),
        }),
      })

      const result = await isPhotoSharedInConversation('photo-123', 'conv-456')

      expect(result).toBe(false)
    })

    it('should return false on exception', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: { id: 'user-123' } } })
      mockSelect.mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockRejectedValue(new Error('Network error')),
          }),
        }),
      })

      const result = await isPhotoSharedInConversation('photo-123', 'conv-456')

      expect(result).toBe(false)
    })
  })

  describe('getPhotoShareStatus', () => {
    it('should return empty array when not authenticated', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: null } })

      const result = await getPhotoShareStatus('photo-123')

      expect(result).toEqual([])
    })

    it('should return share records', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: { id: 'user-123' } } })
      mockSelect.mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: [
                {
                  id: 'share-1',
                  conversation_id: 'conv-1',
                  shared_with_user_id: 'user-456',
                  created_at: '2025-01-01T00:00:00Z',
                },
              ],
              error: null,
            }),
          }),
        }),
      })

      const result = await getPhotoShareStatus('photo-123')

      expect(result).toHaveLength(1)
      expect(result[0].share_id).toBe('share-1')
      expect(result[0].conversation_id).toBe('conv-1')
    })

    it('should return empty array on error', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: { id: 'user-123' } } })
      mockSelect.mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: null, error: { message: 'Error' } }),
          }),
        }),
      })

      const result = await getPhotoShareStatus('photo-123')

      expect(result).toEqual([])
    })

    it('should return empty array on exception', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: { id: 'user-123' } } })
      mockSelect.mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockRejectedValue(new Error('Network error')),
          }),
        }),
      })

      const result = await getPhotoShareStatus('photo-123')

      expect(result).toEqual([])
    })
  })

  describe('getPhotoShareCount', () => {
    it('should return 0 when not authenticated', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: null } })

      const result = await getPhotoShareCount('photo-123')

      expect(result).toBe(0)
    })

    it('should return count when shares exist', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: { id: 'user-123' } } })
      mockSelect.mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ count: 5, error: null }),
        }),
      })

      const result = await getPhotoShareCount('photo-123')

      expect(result).toBe(5)
    })

    it('should return 0 on error', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: { id: 'user-123' } } })
      mockSelect.mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ count: null, error: { message: 'Error' } }),
        }),
      })

      const result = await getPhotoShareCount('photo-123')

      expect(result).toBe(0)
    })

    it('should return 0 on exception', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: { id: 'user-123' } } })
      mockSelect.mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockRejectedValue(new Error('Network error')),
        }),
      })

      const result = await getPhotoShareCount('photo-123')

      expect(result).toBe(0)
    })
  })

  describe('getSharedPhotosForConversation', () => {
    it('should return empty array when not authenticated', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: null } })

      const result = await getSharedPhotosForConversation('conv-123')

      expect(result).toEqual([])
    })

    it('should return empty array on error', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: { id: 'user-123' } } })
      mockSelect.mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: null, error: { message: 'Error' } }),
        }),
      })

      const result = await getSharedPhotosForConversation('conv-123')

      expect(result).toEqual([])
    })

    it('should return empty array on exception', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: { id: 'user-123' } } })
      mockSelect.mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockRejectedValue(new Error('Network error')),
        }),
      })

      const result = await getSharedPhotosForConversation('conv-123')

      expect(result).toEqual([])
    })

    // Note: Tests for successful data processing paths require more sophisticated
    // mock setup due to Supabase's chainable query builder pattern. The error
    // paths above verify the function handles failures correctly.
    // Success paths are covered by E2E tests where the real Supabase client is used.
  })

  describe('getMySharedPhotosForConversation', () => {
    it('should return empty array when not authenticated', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: null } })

      const result = await getMySharedPhotosForConversation('conv-123')

      expect(result).toEqual([])
    })

    it('should return empty array on error', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: { id: 'user-123' } } })
      mockSelect.mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: null, error: { message: 'Error' } }),
        }),
      })

      const result = await getMySharedPhotosForConversation('conv-123')

      expect(result).toEqual([])
    })

    it('should return empty array on exception', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: { id: 'user-123' } } })
      mockSelect.mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockRejectedValue(new Error('Network error')),
        }),
      })

      const result = await getMySharedPhotosForConversation('conv-123')

      expect(result).toEqual([])
    })

    // Note: Tests for successful data processing paths require more sophisticated
    // mock setup due to Supabase's chainable query builder pattern. The error
    // paths above verify the function handles failures correctly.
    // Success paths are covered by E2E tests where the real Supabase client is used.
  })
})
