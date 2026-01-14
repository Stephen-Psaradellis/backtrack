/**
 * Tests for lib/profilePhotos.ts
 *
 * Tests profile photo management including upload, retrieval, deletion,
 * and moderation triggering.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock expo-crypto
vi.mock('expo-crypto', () => ({
  randomUUID: vi.fn(() => 'mock-uuid-123'),
}))

// Mock storage module
vi.mock('../storage', () => ({
  uploadProfilePhoto: vi.fn(),
  deletePhotoByPath: vi.fn(),
  getSignedUrlFromPath: vi.fn(),
}))

// Mock supabase - factory function with mocks inside
vi.mock('../supabase', () => {
  const mockGetUser = vi.fn()
  const mockSingle = vi.fn()
  const mockEq = vi.fn()
  const mockIn = vi.fn()
  const mockSelect = vi.fn()
  const mockInsert = vi.fn()
  const mockDelete = vi.fn()
  const mockUpdate = vi.fn()
  const mockOrder = vi.fn()
  const mockLimit = vi.fn()
  const mockRpc = vi.fn()
  const mockInvoke = vi.fn()
  const mockChannel = vi.fn()
  const mockOn = vi.fn()
  const mockSubscribe = vi.fn()
  const mockUnsubscribe = vi.fn()

  // Set up chain returns
  mockSelect.mockReturnValue({ eq: mockEq, order: mockOrder, single: mockSingle })
  mockEq.mockReturnValue({ eq: mockEq, in: mockIn, order: mockOrder, single: mockSingle, limit: mockLimit })
  mockIn.mockReturnValue({ eq: mockEq, order: mockOrder, single: mockSingle })
  mockOrder.mockReturnValue({ order: mockOrder, limit: mockLimit, single: mockSingle })
  mockLimit.mockReturnValue({ single: mockSingle })
  mockInsert.mockReturnValue({ select: vi.fn().mockReturnValue({ single: mockSingle }) })
  mockDelete.mockReturnValue({ eq: mockEq })
  mockUpdate.mockReturnValue({ eq: mockEq })
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
        insert: mockInsert,
        delete: mockDelete,
        update: mockUpdate,
      })),
      rpc: mockRpc,
      functions: { invoke: mockInvoke },
      channel: mockChannel,
      __mocks: {
        mockGetUser,
        mockSingle,
        mockEq,
        mockIn,
        mockSelect,
        mockInsert,
        mockDelete,
        mockUpdate,
        mockOrder,
        mockLimit,
        mockRpc,
        mockInvoke,
        mockChannel,
        mockOn,
        mockSubscribe,
        mockUnsubscribe,
      },
    },
    supabaseUrl: 'https://test.supabase.co',
  }
})

import { supabase } from '../supabase'
import {
  uploadProfilePhoto as uploadToStorage,
  deletePhotoByPath,
  getSignedUrlFromPath,
} from '../storage'
import {
  uploadProfilePhoto,
  getProfilePhotos,
  getApprovedPhotos,
  getPhotoById,
  deleteProfilePhoto,
  setPrimaryPhoto,
  hasApprovedPhoto,
  getPrimaryPhoto,
  getPhotoCount,
  subscribeToPhotoChanges,
  MAX_PROFILE_PHOTOS,
  PROFILE_PHOTO_ERRORS,
} from '../profilePhotos'

// Get mocks from supabase
const { __mocks } = supabase as unknown as { __mocks: Record<string, ReturnType<typeof vi.fn>> }
const {
  mockGetUser,
  mockSingle,
  mockEq,
  mockIn,
  mockSelect,
  mockInsert,
  mockDelete,
  mockUpdate,
  mockOrder,
  mockLimit,
  mockRpc,
  mockInvoke,
  mockChannel,
  mockOn,
  mockSubscribe,
  mockUnsubscribe,
} = __mocks

// Get storage mocks
const mockUploadToStorage = vi.mocked(uploadToStorage)
const mockDeletePhotoByPath = vi.mocked(deletePhotoByPath)
const mockGetSignedUrlFromPath = vi.mocked(getSignedUrlFromPath)

describe('profilePhotos', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Default: authenticated user
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-123' } },
    })

    // Reset mock chain setup
    mockSelect.mockReturnValue({ eq: mockEq, order: mockOrder, single: mockSingle })
    mockEq.mockReturnValue({ eq: mockEq, in: mockIn, order: mockOrder, single: mockSingle, limit: mockLimit })
    mockIn.mockReturnValue({ eq: mockEq, order: mockOrder, single: mockSingle })
    mockOrder.mockReturnValue({ order: mockOrder, limit: mockLimit, single: mockSingle })
    mockLimit.mockReturnValue({ single: mockSingle })
    mockInsert.mockReturnValue({ select: vi.fn().mockReturnValue({ single: mockSingle }) })
    mockDelete.mockReturnValue({ eq: mockEq })
    mockUpdate.mockReturnValue({ eq: mockEq })
    mockChannel.mockReturnValue({
      on: mockOn.mockReturnValue({
        subscribe: mockSubscribe.mockReturnValue({ unsubscribe: mockUnsubscribe }),
      }),
    })

    // Default storage mock behavior
    mockGetSignedUrlFromPath.mockResolvedValue({
      success: true,
      signedUrl: 'https://example.com/signed-url',
      expiresIn: 3600,
      error: null,
    })
  })

  describe('MAX_PROFILE_PHOTOS', () => {
    it('should be 6', () => {
      expect(MAX_PROFILE_PHOTOS).toBe(6)
    })
  })

  describe('PROFILE_PHOTO_ERRORS', () => {
    it('should have all required error messages', () => {
      expect(PROFILE_PHOTO_ERRORS.UPLOAD_FAILED).toBeDefined()
      expect(PROFILE_PHOTO_ERRORS.DELETE_FAILED).toBeDefined()
      expect(PROFILE_PHOTO_ERRORS.SET_PRIMARY_FAILED).toBeDefined()
      expect(PROFILE_PHOTO_ERRORS.MAX_PHOTOS_REACHED).toBeDefined()
      expect(PROFILE_PHOTO_ERRORS.PHOTO_NOT_FOUND).toBeDefined()
      expect(PROFILE_PHOTO_ERRORS.NOT_AUTHENTICATED).toBeDefined()
      expect(PROFILE_PHOTO_ERRORS.MODERATION_TRIGGER_FAILED).toBeDefined()
    })

    it('should include MAX_PROFILE_PHOTOS in max photos message', () => {
      expect(PROFILE_PHOTO_ERRORS.MAX_PHOTOS_REACHED).toContain('6')
    })
  })

  describe('uploadProfilePhoto', () => {
    it('should return error when not authenticated', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: null } })

      const result = await uploadProfilePhoto('file://image.jpg')

      expect(result.success).toBe(false)
      expect(result.photo).toBeNull()
      expect(result.error).toBe(PROFILE_PHOTO_ERRORS.NOT_AUTHENTICATED)
    })

    it('should return error when max photos reached', async () => {
      // First select call returns count at limit
      mockSelect.mockReturnValueOnce({
        eq: vi.fn().mockReturnValue({
          in: vi.fn().mockResolvedValue({ count: 6, error: null }),
        }),
      })

      const result = await uploadProfilePhoto('file://image.jpg')

      expect(result.success).toBe(false)
      expect(result.error).toBe(PROFILE_PHOTO_ERRORS.MAX_PHOTOS_REACHED)
    })

    it('should return error when storage upload fails', async () => {
      // Photo count check passes
      mockSelect.mockReturnValueOnce({
        eq: vi.fn().mockReturnValue({
          in: vi.fn().mockResolvedValue({ count: 0, error: null }),
        }),
      })

      // Storage upload fails
      mockUploadToStorage.mockResolvedValueOnce({
        success: false,
        path: null,
        fullUrl: null,
        error: 'Storage full',
      })

      const result = await uploadProfilePhoto('file://image.jpg')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Storage full')
    })

    it('should upload photo successfully', async () => {
      const mockPhoto = {
        id: 'mock-uuid-123',
        user_id: 'user-123',
        storage_path: 'profile-photos/user-123/mock-uuid-123.jpg',
        moderation_status: 'pending',
        is_primary: true,
      }

      // Photo count check - under limit
      mockSelect.mockReturnValueOnce({
        eq: vi.fn().mockReturnValue({
          in: vi.fn().mockResolvedValue({ count: 0, error: null }),
        }),
      })

      // Storage upload succeeds
      mockUploadToStorage.mockResolvedValueOnce({
        success: true,
        path: 'profile-photos/user-123/mock-uuid-123.jpg',
        fullUrl: 'https://storage.test/profile-photos/user-123/mock-uuid-123.jpg',
        error: null,
      })

      // Check for existing approved photos (for is_primary)
      mockSelect.mockReturnValueOnce({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ count: 0, error: null }),
        }),
      })

      // Insert succeeds
      mockSingle.mockResolvedValueOnce({
        data: mockPhoto,
        error: null,
      })

      // Moderation invoked successfully
      mockInvoke.mockResolvedValueOnce({
        data: { success: true, status: 'pending' },
        error: null,
      })

      const result = await uploadProfilePhoto('file://image.jpg')

      expect(result.success).toBe(true)
      expect(result.photo).toEqual(mockPhoto)
      expect(result.error).toBeNull()
      expect(mockUploadToStorage).toHaveBeenCalledWith('user-123', 'mock-uuid-123', 'file://image.jpg')
    })

    it('should clean up storage if database insert fails', async () => {
      // Photo count check passes
      mockSelect.mockReturnValueOnce({
        eq: vi.fn().mockReturnValue({
          in: vi.fn().mockResolvedValue({ count: 0, error: null }),
        }),
      })

      // Storage upload succeeds
      mockUploadToStorage.mockResolvedValueOnce({
        success: true,
        path: 'profile-photos/user-123/mock-uuid-123.jpg',
        fullUrl: 'https://storage.test/profile-photos/user-123/mock-uuid-123.jpg',
        error: null,
      })

      // Check for existing photos
      mockSelect.mockReturnValueOnce({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ count: 0, error: null }),
        }),
      })

      // Insert fails
      mockSingle.mockResolvedValueOnce({
        data: null,
        error: { message: 'Insert failed' },
      })

      const result = await uploadProfilePhoto('file://image.jpg')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Insert failed')
      expect(mockDeletePhotoByPath).toHaveBeenCalledWith('profile-photos/user-123/mock-uuid-123.jpg')
    })

    it('should handle exceptions', async () => {
      // Photo count check throws
      mockSelect.mockReturnValueOnce({
        eq: vi.fn().mockReturnValue({
          in: vi.fn().mockRejectedValue(new Error('Network error')),
        }),
      })

      const result = await uploadProfilePhoto('file://image.jpg')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Network error')
    })
  })

  describe('getProfilePhotos', () => {
    it('should return empty array when not authenticated', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: null } })

      const result = await getProfilePhotos()

      expect(result).toEqual([])
    })

    it('should return photos with signed URLs', async () => {
      const mockPhotos = [
        { id: 'photo-1', storage_path: 'path/1.jpg', is_primary: true },
        { id: 'photo-2', storage_path: 'path/2.jpg', is_primary: false },
      ]

      mockOrder.mockReturnValue({
        order: vi.fn().mockResolvedValue({ data: mockPhotos, error: null }),
      })

      const result = await getProfilePhotos()

      expect(result).toHaveLength(2)
      expect(result[0].signedUrl).toBe('https://example.com/signed-url')
      expect(mockGetSignedUrlFromPath).toHaveBeenCalledTimes(2)
    })

    it('should return empty array on database error', async () => {
      mockOrder.mockReturnValue({
        order: vi.fn().mockResolvedValue({ data: null, error: { message: 'DB error' } }),
      })

      const result = await getProfilePhotos()

      expect(result).toEqual([])
    })

    it('should handle null signed URL', async () => {
      const mockPhotos = [
        { id: 'photo-1', storage_path: 'path/1.jpg' },
      ]

      mockOrder.mockReturnValue({
        order: vi.fn().mockResolvedValue({ data: mockPhotos, error: null }),
      })

      mockGetSignedUrlFromPath.mockResolvedValueOnce({
        success: false,
        signedUrl: null,
        expiresIn: null,
        error: 'Failed to get URL',
      })

      const result = await getProfilePhotos()

      expect(result).toHaveLength(1)
      expect(result[0].signedUrl).toBeNull()
    })
  })

  describe('getApprovedPhotos', () => {
    it('should return empty array when not authenticated', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: null } })

      const result = await getApprovedPhotos()

      expect(result).toEqual([])
    })

    it('should return approved photos with signed URLs', async () => {
      const mockPhotos = [
        { id: 'photo-1', storage_path: 'path/1.jpg', moderation_status: 'approved' },
      ]

      mockEq.mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: mockPhotos, error: null }),
          }),
        }),
      })

      const result = await getApprovedPhotos()

      expect(result).toHaveLength(1)
      expect(mockGetSignedUrlFromPath).toHaveBeenCalled()
    })

    it('should return empty array on error', async () => {
      mockEq.mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: null, error: { message: 'Error' } }),
          }),
        }),
      })

      const result = await getApprovedPhotos()

      expect(result).toEqual([])
    })
  })

  describe('getPhotoById', () => {
    it('should return null when not authenticated', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: null } })

      const result = await getPhotoById('photo-123')

      expect(result).toBeNull()
    })

    it('should return photo with signed URL', async () => {
      const mockPhoto = {
        id: 'photo-123',
        storage_path: 'path/photo.jpg',
        moderation_status: 'approved',
      }

      // Set up select -> eq -> eq -> single chain
      mockSelect.mockReturnValueOnce({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: mockPhoto, error: null }),
          }),
        }),
      })

      const result = await getPhotoById('photo-123')

      expect(result).not.toBeNull()
      expect(result?.id).toBe('photo-123')
      expect(result?.signedUrl).toBe('https://example.com/signed-url')
    })

    it('should return null when photo not found', async () => {
      mockSelect.mockReturnValueOnce({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } }),
          }),
        }),
      })

      const result = await getPhotoById('photo-123')

      expect(result).toBeNull()
    })

    it('should handle exceptions', async () => {
      mockSelect.mockReturnValueOnce({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockRejectedValue(new Error('Network error')),
          }),
        }),
      })

      const result = await getPhotoById('photo-123')

      expect(result).toBeNull()
    })
  })

  describe('deleteProfilePhoto', () => {
    it('should return error when not authenticated', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: null } })

      const result = await deleteProfilePhoto('photo-123')

      expect(result.success).toBe(false)
      expect(result.error).toBe(PROFILE_PHOTO_ERRORS.NOT_AUTHENTICATED)
    })

    it('should return error when photo not found', async () => {
      // Set up select -> eq -> eq -> single chain for photo fetch
      const mockNestedEq = vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } }) })
      mockSelect.mockReturnValueOnce({
        eq: vi.fn().mockReturnValue({
          eq: mockNestedEq,
        }),
      })

      const result = await deleteProfilePhoto('photo-123')

      expect(result.success).toBe(false)
      expect(result.error).toBe(PROFILE_PHOTO_ERRORS.PHOTO_NOT_FOUND)
    })

    it('should delete photo successfully', async () => {
      const mockPhoto = {
        id: 'photo-123',
        storage_path: 'path/photo.jpg',
        is_primary: false,
      }

      // Fetch photo - set up select -> eq -> eq -> single chain
      mockSelect.mockReturnValueOnce({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: mockPhoto, error: null }),
          }),
        }),
      })

      // Delete from database - set up delete -> eq -> eq chain
      mockDelete.mockReturnValueOnce({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      })

      const result = await deleteProfilePhoto('photo-123')

      expect(result.success).toBe(true)
      expect(result.error).toBeNull()
      expect(mockDeletePhotoByPath).toHaveBeenCalledWith('path/photo.jpg')
    })

    it('should set new primary when deleting primary photo', async () => {
      const mockPhoto = {
        id: 'photo-123',
        storage_path: 'path/photo.jpg',
        is_primary: true,
      }

      const nextPhoto = { id: 'photo-456' }

      // Fetch photo
      mockSelect.mockReturnValueOnce({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: mockPhoto, error: null }),
          }),
        }),
      })

      // Delete from database
      mockDelete.mockReturnValueOnce({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      })

      // Find next photo to be primary - select -> eq -> eq -> order -> limit -> single
      mockSelect.mockReturnValueOnce({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: nextPhoto, error: null }),
              }),
            }),
          }),
        }),
      })

      // Update next photo as primary
      mockUpdate.mockReturnValueOnce({
        eq: vi.fn().mockResolvedValue({ error: null }),
      })

      const result = await deleteProfilePhoto('photo-123')

      expect(result.success).toBe(true)
    })

    it('should handle database delete error', async () => {
      const mockPhoto = {
        id: 'photo-123',
        storage_path: 'path/photo.jpg',
        is_primary: false,
      }

      // Fetch photo
      mockSelect.mockReturnValueOnce({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: mockPhoto, error: null }),
          }),
        }),
      })

      // Delete fails
      mockDelete.mockReturnValueOnce({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: { message: 'Delete failed' } }),
        }),
      })

      const result = await deleteProfilePhoto('photo-123')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Delete failed')
    })

    it('should handle exceptions', async () => {
      // Make the select chain throw
      mockSelect.mockReturnValueOnce({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockRejectedValue(new Error('Network error')),
          }),
        }),
      })

      const result = await deleteProfilePhoto('photo-123')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Network error')
    })
  })

  describe('setPrimaryPhoto', () => {
    it('should return error when not authenticated', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: null } })

      const result = await setPrimaryPhoto('photo-123')

      expect(result.success).toBe(false)
      expect(result.error).toBe(PROFILE_PHOTO_ERRORS.NOT_AUTHENTICATED)
    })

    it('should return error when photo not found', async () => {
      // Set up select -> eq -> eq -> single chain
      mockSelect.mockReturnValueOnce({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } }),
          }),
        }),
      })

      const result = await setPrimaryPhoto('photo-123')

      expect(result.success).toBe(false)
      expect(result.error).toBe(PROFILE_PHOTO_ERRORS.PHOTO_NOT_FOUND)
    })

    it('should return error when photo not approved', async () => {
      mockSelect.mockReturnValueOnce({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { moderation_status: 'pending' },
              error: null,
            }),
          }),
        }),
      })

      const result = await setPrimaryPhoto('photo-123')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Only approved photos can be set as primary.')
    })

    it('should set primary photo successfully', async () => {
      // Fetch photo - is approved
      mockSelect.mockReturnValueOnce({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { moderation_status: 'approved' },
              error: null,
            }),
          }),
        }),
      })

      // RPC call succeeds
      mockRpc.mockResolvedValueOnce({ error: null })

      const result = await setPrimaryPhoto('photo-123')

      expect(result.success).toBe(true)
      expect(result.error).toBeNull()
      expect(mockRpc).toHaveBeenCalledWith('set_primary_photo', { p_photo_id: 'photo-123' })
    })

    it('should handle RPC error', async () => {
      mockSelect.mockReturnValueOnce({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { moderation_status: 'approved' },
              error: null,
            }),
          }),
        }),
      })

      mockRpc.mockResolvedValueOnce({ error: { message: 'RPC failed' } })

      const result = await setPrimaryPhoto('photo-123')

      expect(result.success).toBe(false)
      expect(result.error).toBe('RPC failed')
    })

    it('should handle exceptions', async () => {
      mockSelect.mockReturnValueOnce({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockRejectedValue(new Error('Network error')),
          }),
        }),
      })

      const result = await setPrimaryPhoto('photo-123')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Network error')
    })
  })

  describe('hasApprovedPhoto', () => {
    it('should return false when not authenticated', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: null } })

      const result = await hasApprovedPhoto()

      expect(result).toBe(false)
    })

    it('should return true when user has approved photos', async () => {
      mockEq.mockReturnValue({
        eq: vi.fn().mockResolvedValue({ count: 2, error: null }),
      })

      const result = await hasApprovedPhoto()

      expect(result).toBe(true)
    })

    it('should return false when user has no approved photos', async () => {
      mockEq.mockReturnValue({
        eq: vi.fn().mockResolvedValue({ count: 0, error: null }),
      })

      const result = await hasApprovedPhoto()

      expect(result).toBe(false)
    })

    it('should return false on error', async () => {
      mockEq.mockReturnValue({
        eq: vi.fn().mockResolvedValue({ count: null, error: { message: 'Error' } }),
      })

      const result = await hasApprovedPhoto()

      expect(result).toBe(false)
    })

    it('should handle exceptions', async () => {
      mockEq.mockReturnValue({
        eq: vi.fn().mockRejectedValue(new Error('Network error')),
      })

      const result = await hasApprovedPhoto()

      expect(result).toBe(false)
    })
  })

  describe('getPrimaryPhoto', () => {
    it('should return null when not authenticated', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: null } })

      const result = await getPrimaryPhoto()

      expect(result).toBeNull()
    })

    it('should return primary photo when one exists', async () => {
      const mockPhoto = {
        id: 'photo-123',
        storage_path: 'path/photo.jpg',
        is_primary: true,
      }

      // Set up select -> eq -> eq -> eq -> single chain
      mockSelect.mockReturnValueOnce({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: mockPhoto, error: null }),
            }),
          }),
        }),
      })

      const result = await getPrimaryPhoto()

      expect(result).not.toBeNull()
      expect(result?.id).toBe('photo-123')
      expect(result?.signedUrl).toBe('https://example.com/signed-url')
    })

    it('should return most recent approved when no primary exists', async () => {
      const mockPhoto = {
        id: 'photo-456',
        storage_path: 'path/photo2.jpg',
        is_primary: false,
      }

      // First call - no primary (select -> eq -> eq -> eq -> single)
      mockSelect.mockReturnValueOnce({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
            }),
          }),
        }),
      })

      // Second call - most recent approved (select -> eq -> eq -> order -> limit -> single)
      mockSelect.mockReturnValueOnce({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: mockPhoto, error: null }),
              }),
            }),
          }),
        }),
      })

      const result = await getPrimaryPhoto()

      expect(result).not.toBeNull()
      expect(result?.id).toBe('photo-456')
    })

    it('should return null when no photos exist', async () => {
      // First call - no primary
      mockSelect.mockReturnValueOnce({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
            }),
          }),
        }),
      })

      // Second call - no approved photos either
      mockSelect.mockReturnValueOnce({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
              }),
            }),
          }),
        }),
      })

      const result = await getPrimaryPhoto()

      expect(result).toBeNull()
    })

    it('should handle exceptions', async () => {
      mockSelect.mockReturnValueOnce({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockRejectedValue(new Error('Network error')),
            }),
          }),
        }),
      })

      const result = await getPrimaryPhoto()

      expect(result).toBeNull()
    })
  })

  describe('getPhotoCount', () => {
    it('should return 0 when not authenticated', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: null } })

      const result = await getPhotoCount()

      expect(result).toBe(0)
    })

    it('should return photo count', async () => {
      mockIn.mockResolvedValueOnce({ count: 5, error: null })

      const result = await getPhotoCount()

      expect(result).toBe(5)
    })

    it('should return 0 on error', async () => {
      mockIn.mockResolvedValueOnce({ count: null, error: { message: 'Error' } })

      const result = await getPhotoCount()

      expect(result).toBe(0)
    })

    it('should handle null count', async () => {
      mockIn.mockResolvedValueOnce({ count: null, error: null })

      const result = await getPhotoCount()

      expect(result).toBe(0)
    })

    it('should handle exceptions', async () => {
      mockIn.mockRejectedValueOnce(new Error('Network error'))

      const result = await getPhotoCount()

      expect(result).toBe(0)
    })
  })

  describe('subscribeToPhotoChanges', () => {
    it('should subscribe to changes and return unsubscribe function', () => {
      const callback = vi.fn()

      const unsubscribe = subscribeToPhotoChanges(callback)

      expect(mockChannel).toHaveBeenCalledWith('profile_photos_changes')
      expect(mockOn).toHaveBeenCalled()
      expect(mockSubscribe).toHaveBeenCalled()
      expect(typeof unsubscribe).toBe('function')
    })

    it('should call unsubscribe when returned function is called', () => {
      const callback = vi.fn()

      const unsubscribe = subscribeToPhotoChanges(callback)
      unsubscribe()

      expect(mockUnsubscribe).toHaveBeenCalled()
    })
  })
})
