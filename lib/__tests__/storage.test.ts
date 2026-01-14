/**
 * Tests for lib/storage.ts
 *
 * Tests Supabase storage utilities for selfies and profile photos.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock supabase
const mockUpload = vi.fn()
const mockCreateSignedUrl = vi.fn()
const mockRemove = vi.fn()
const mockList = vi.fn()

vi.mock('../supabase', () => ({
  supabase: {
    storage: {
      from: vi.fn(() => ({
        upload: mockUpload,
        createSignedUrl: mockCreateSignedUrl,
        remove: mockRemove,
        list: mockList,
      })),
    },
  },
  supabaseUrl: 'https://test.supabase.co',
}))

// Mock utils/imagePicker
vi.mock('../../utils/imagePicker', () => ({
  getImageMimeType: vi.fn(() => 'image/jpeg'),
  formatImageUri: vi.fn((uri: string) => uri),
}))

// Mock react-native Platform
vi.mock('react-native', () => ({
  Platform: {
    OS: 'ios',
  },
}))

// Mock expo-file-system with new File class
vi.mock('expo-file-system', () => ({
  File: class MockFile {
    constructor(public uri: string) {}
    base64 = vi.fn(() => Promise.resolve('iVBORwZXN0LWJhc2U2NA==')) // fake base64
  },
}))

// Mock base64-arraybuffer
vi.mock('base64-arraybuffer', () => ({
  decode: vi.fn(() => new ArrayBuffer(12)), // fake ArrayBuffer
}))

import {
  SELFIES_BUCKET,
  DEFAULT_SIGNED_URL_EXPIRY,
  MAX_SELFIE_SIZE,
  ALLOWED_MIME_TYPES,
  STORAGE_ERRORS,
  getSelfieStoragePath,
  getProfilePhotoStoragePath,
  isAllowedMimeType,
  uploadSelfie,
  getSelfieUrl,
  deleteSelfie,
  selfieExists,
  uploadSelfieAndGetPath,
  uploadProfilePhoto,
  getProfilePhotoUrl,
  getSignedUrlFromPath,
  deleteProfilePhoto,
  deletePhotoByPath,
} from '../storage'

describe('storage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('constants', () => {
    it('should have correct SELFIES_BUCKET', () => {
      expect(SELFIES_BUCKET).toBe('selfies')
    })

    it('should have correct DEFAULT_SIGNED_URL_EXPIRY', () => {
      expect(DEFAULT_SIGNED_URL_EXPIRY).toBe(3600)
    })

    it('should have correct MAX_SELFIE_SIZE', () => {
      expect(MAX_SELFIE_SIZE).toBe(5 * 1024 * 1024)
    })

    it('should have allowed MIME types', () => {
      expect(ALLOWED_MIME_TYPES).toContain('image/jpeg')
      expect(ALLOWED_MIME_TYPES).toContain('image/jpg')
      expect(ALLOWED_MIME_TYPES).toContain('image/png')
      expect(ALLOWED_MIME_TYPES).toContain('image/webp')
    })

    it('should have all required error messages', () => {
      expect(STORAGE_ERRORS.UPLOAD_FAILED).toBeDefined()
      expect(STORAGE_ERRORS.FILE_TOO_LARGE).toBeDefined()
      expect(STORAGE_ERRORS.INVALID_FILE_TYPE).toBeDefined()
      expect(STORAGE_ERRORS.DELETE_FAILED).toBeDefined()
      expect(STORAGE_ERRORS.URL_FAILED).toBeDefined()
      expect(STORAGE_ERRORS.MISSING_USER_ID).toBeDefined()
      expect(STORAGE_ERRORS.MISSING_POST_ID).toBeDefined()
      expect(STORAGE_ERRORS.MISSING_PHOTO_ID).toBeDefined()
      expect(STORAGE_ERRORS.MISSING_FILE).toBeDefined()
      expect(STORAGE_ERRORS.PROFILE_PHOTO_UPLOAD_FAILED).toBeDefined()
      expect(STORAGE_ERRORS.PROFILE_PHOTO_DELETE_FAILED).toBeDefined()
    })
  })

  describe('getSelfieStoragePath', () => {
    it('should generate correct path', () => {
      const path = getSelfieStoragePath('user-123', 'post-456')
      expect(path).toBe('user-123/post-456.jpg')
    })
  })

  describe('getProfilePhotoStoragePath', () => {
    it('should generate correct path', () => {
      const path = getProfilePhotoStoragePath('user-123', 'photo-456')
      expect(path).toBe('user-123/profile/photo-456.jpg')
    })
  })

  describe('isAllowedMimeType', () => {
    it('should return true for allowed MIME types', () => {
      expect(isAllowedMimeType('image/jpeg')).toBe(true)
      expect(isAllowedMimeType('image/jpg')).toBe(true)
      expect(isAllowedMimeType('image/png')).toBe(true)
      expect(isAllowedMimeType('image/webp')).toBe(true)
    })

    it('should return false for disallowed MIME types', () => {
      expect(isAllowedMimeType('image/gif')).toBe(false)
      expect(isAllowedMimeType('image/bmp')).toBe(false)
      expect(isAllowedMimeType('text/plain')).toBe(false)
      expect(isAllowedMimeType('application/pdf')).toBe(false)
    })
  })

  describe('uploadSelfie', () => {
    it('should return error for missing user ID', async () => {
      const result = await uploadSelfie('', 'post-123', 'file:///image.jpg')
      expect(result.success).toBe(false)
      expect(result.error).toBe(STORAGE_ERRORS.MISSING_USER_ID)
    })

    it('should return error for missing post ID', async () => {
      const result = await uploadSelfie('user-123', '', 'file:///image.jpg')
      expect(result.success).toBe(false)
      expect(result.error).toBe(STORAGE_ERRORS.MISSING_POST_ID)
    })

    it('should return error for missing image URI', async () => {
      const result = await uploadSelfie('user-123', 'post-456', '')
      expect(result.success).toBe(false)
      expect(result.error).toBe(STORAGE_ERRORS.MISSING_FILE)
    })

    it('should upload selfie successfully', async () => {
      // New implementation reads file as base64, converts to ArrayBuffer
      mockUpload.mockResolvedValueOnce({
        data: { path: 'user-123/post-456.jpg' },
        error: null,
      })

      const result = await uploadSelfie('user-123', 'post-456', 'file:///image.jpg')

      expect(result.success).toBe(true)
      expect(result.path).toBe('user-123/post-456.jpg')
      expect(result.fullUrl).toBe('https://test.supabase.co/storage/v1/object/selfies/user-123/post-456.jpg')

      // Verify upload was called with ArrayBuffer and contentType
      expect(mockUpload).toHaveBeenCalledWith(
        'user-123/post-456.jpg',
        expect.any(ArrayBuffer),
        expect.objectContaining({
          contentType: 'image/jpeg',
          upsert: true,
        })
      )
    })

    it('should handle invalid file type based on URI extension', async () => {
      // Mock getImageMimeType to return gif for .gif files
      const { getImageMimeType } = await import('../../utils/imagePicker')
      vi.mocked(getImageMimeType).mockReturnValueOnce('image/gif')

      const result = await uploadSelfie('user-123', 'post-456', 'file:///image.gif')

      expect(result.success).toBe(false)
      expect(result.error).toBe(STORAGE_ERRORS.INVALID_FILE_TYPE)
    })

    it('should handle upload error from Supabase', async () => {
      mockUpload.mockResolvedValueOnce({
        data: null,
        error: { message: 'Upload failed' },
      })

      const result = await uploadSelfie('user-123', 'post-456', 'file:///image.jpg')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Upload failed')
    })

    it('should handle exception during upload', async () => {
      mockUpload.mockRejectedValueOnce(new Error('Network error'))

      const result = await uploadSelfie('user-123', 'post-456', 'file:///image.jpg')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Network error')
    })
  })

  describe('getSelfieUrl', () => {
    it('should return error for missing user ID', async () => {
      const result = await getSelfieUrl('', 'post-123')
      expect(result.success).toBe(false)
      expect(result.error).toBe(STORAGE_ERRORS.MISSING_USER_ID)
    })

    it('should return error for missing post ID', async () => {
      const result = await getSelfieUrl('user-123', '')
      expect(result.success).toBe(false)
      expect(result.error).toBe(STORAGE_ERRORS.MISSING_POST_ID)
    })

    it('should return signed URL successfully', async () => {
      mockCreateSignedUrl.mockResolvedValueOnce({
        data: { signedUrl: 'https://test.supabase.co/signed-url' },
        error: null,
      })

      const result = await getSelfieUrl('user-123', 'post-456')

      expect(result.success).toBe(true)
      expect(result.signedUrl).toBe('https://test.supabase.co/signed-url')
      expect(result.expiresIn).toBe(DEFAULT_SIGNED_URL_EXPIRY)
    })

    it('should use custom expiration time', async () => {
      mockCreateSignedUrl.mockResolvedValueOnce({
        data: { signedUrl: 'https://test.supabase.co/signed-url' },
        error: null,
      })

      const result = await getSelfieUrl('user-123', 'post-456', 7200)

      expect(result.success).toBe(true)
      expect(result.expiresIn).toBe(7200)
    })

    it('should handle error from Supabase', async () => {
      mockCreateSignedUrl.mockResolvedValueOnce({
        data: null,
        error: { message: 'File not found' },
      })

      const result = await getSelfieUrl('user-123', 'post-456')

      expect(result.success).toBe(false)
      expect(result.error).toBe('File not found')
    })

    it('should handle exception', async () => {
      mockCreateSignedUrl.mockRejectedValueOnce(new Error('Network error'))

      const result = await getSelfieUrl('user-123', 'post-456')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Network error')
    })
  })

  describe('deleteSelfie', () => {
    it('should return error for missing user ID', async () => {
      const result = await deleteSelfie('', 'post-123')
      expect(result.success).toBe(false)
      expect(result.error).toBe(STORAGE_ERRORS.MISSING_USER_ID)
    })

    it('should return error for missing post ID', async () => {
      const result = await deleteSelfie('user-123', '')
      expect(result.success).toBe(false)
      expect(result.error).toBe(STORAGE_ERRORS.MISSING_POST_ID)
    })

    it('should delete selfie successfully', async () => {
      mockRemove.mockResolvedValueOnce({ error: null })

      const result = await deleteSelfie('user-123', 'post-456')

      expect(result.success).toBe(true)
      expect(result.error).toBeNull()
    })

    it('should handle delete error', async () => {
      mockRemove.mockResolvedValueOnce({
        error: { message: 'Delete failed' },
      })

      const result = await deleteSelfie('user-123', 'post-456')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Delete failed')
    })

    it('should handle exception', async () => {
      mockRemove.mockRejectedValueOnce(new Error('Network error'))

      const result = await deleteSelfie('user-123', 'post-456')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Network error')
    })
  })

  describe('selfieExists', () => {
    it('should return false for missing user ID', async () => {
      const result = await selfieExists('', 'post-123')
      expect(result).toBe(false)
    })

    it('should return false for missing post ID', async () => {
      const result = await selfieExists('user-123', '')
      expect(result).toBe(false)
    })

    it('should return true when selfie exists', async () => {
      mockList.mockResolvedValueOnce({
        data: [{ name: 'post-456.jpg' }],
        error: null,
      })

      const result = await selfieExists('user-123', 'post-456')

      expect(result).toBe(true)
    })

    it('should return false when selfie does not exist', async () => {
      mockList.mockResolvedValueOnce({
        data: [],
        error: null,
      })

      const result = await selfieExists('user-123', 'post-456')

      expect(result).toBe(false)
    })

    it('should return false on error', async () => {
      mockList.mockResolvedValueOnce({
        data: null,
        error: { message: 'Error' },
      })

      const result = await selfieExists('user-123', 'post-456')

      expect(result).toBe(false)
    })

    it('should return false on exception', async () => {
      mockList.mockRejectedValueOnce(new Error('Network error'))

      const result = await selfieExists('user-123', 'post-456')

      expect(result).toBe(false)
    })
  })

  describe('uploadSelfieAndGetPath', () => {
    it('should return path on success', async () => {
      mockUpload.mockResolvedValueOnce({
        data: { path: 'user-123/post-456.jpg' },
        error: null,
      })

      const path = await uploadSelfieAndGetPath('user-123', 'post-456', 'file:///image.jpg')

      expect(path).toBe('user-123/post-456.jpg')
    })

    it('should throw on upload failure', async () => {
      mockUpload.mockRejectedValueOnce(new Error('Network error'))

      await expect(
        uploadSelfieAndGetPath('user-123', 'post-456', 'file:///image.jpg')
      ).rejects.toThrow('Network error')
    })

    it('should throw on missing path', async () => {
      mockUpload.mockResolvedValueOnce({
        data: { path: null },
        error: null,
      })

      await expect(
        uploadSelfieAndGetPath('user-123', 'post-456', 'file:///image.jpg')
      ).rejects.toThrow()
    })
  })

  describe('uploadProfilePhoto', () => {
    it('should return error for missing user ID', async () => {
      const result = await uploadProfilePhoto('', 'photo-123', 'file:///image.jpg')
      expect(result.success).toBe(false)
      expect(result.error).toBe(STORAGE_ERRORS.MISSING_USER_ID)
    })

    it('should return error for missing photo ID', async () => {
      const result = await uploadProfilePhoto('user-123', '', 'file:///image.jpg')
      expect(result.success).toBe(false)
      expect(result.error).toBe(STORAGE_ERRORS.MISSING_PHOTO_ID)
    })

    it('should return error for missing image URI', async () => {
      const result = await uploadProfilePhoto('user-123', 'photo-456', '')
      expect(result.success).toBe(false)
      expect(result.error).toBe(STORAGE_ERRORS.MISSING_FILE)
    })

    it('should upload profile photo successfully', async () => {
      // New implementation reads file as base64, converts to ArrayBuffer
      mockUpload.mockResolvedValueOnce({
        data: { path: 'user-123/profile/photo-456.jpg' },
        error: null,
      })

      const result = await uploadProfilePhoto('user-123', 'photo-456', 'file:///image.jpg')

      expect(result.success).toBe(true)
      expect(result.path).toBe('user-123/profile/photo-456.jpg')
      expect(result.fullUrl).toBe('https://test.supabase.co/storage/v1/object/selfies/user-123/profile/photo-456.jpg')

      // Verify upload was called with ArrayBuffer and contentType
      expect(mockUpload).toHaveBeenCalledWith(
        'user-123/profile/photo-456.jpg',
        expect.any(ArrayBuffer),
        expect.objectContaining({
          contentType: 'image/jpeg',
          upsert: true,
        })
      )
    })

    it('should handle upload error', async () => {
      mockUpload.mockResolvedValueOnce({
        data: null,
        error: { message: 'Storage full' },
      })

      const result = await uploadProfilePhoto('user-123', 'photo-456', 'file:///image.jpg')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Storage full')
    })

    it('should handle exception', async () => {
      mockUpload.mockRejectedValueOnce(new Error('Network error'))

      const result = await uploadProfilePhoto('user-123', 'photo-456', 'file:///image.jpg')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Network error')
    })
  })

  describe('getProfilePhotoUrl', () => {
    it('should return error for missing user ID', async () => {
      const result = await getProfilePhotoUrl('', 'photo-123')
      expect(result.success).toBe(false)
      expect(result.error).toBe(STORAGE_ERRORS.MISSING_USER_ID)
    })

    it('should return error for missing photo ID', async () => {
      const result = await getProfilePhotoUrl('user-123', '')
      expect(result.success).toBe(false)
      expect(result.error).toBe(STORAGE_ERRORS.MISSING_PHOTO_ID)
    })

    it('should return signed URL successfully', async () => {
      mockCreateSignedUrl.mockResolvedValueOnce({
        data: { signedUrl: 'https://test.supabase.co/signed-url' },
        error: null,
      })

      const result = await getProfilePhotoUrl('user-123', 'photo-456')

      expect(result.success).toBe(true)
      expect(result.signedUrl).toBe('https://test.supabase.co/signed-url')
    })

    it('should handle error', async () => {
      mockCreateSignedUrl.mockResolvedValueOnce({
        data: null,
        error: { message: 'Not found' },
      })

      const result = await getProfilePhotoUrl('user-123', 'photo-456')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Not found')
    })

    it('should handle exception', async () => {
      mockCreateSignedUrl.mockRejectedValueOnce(new Error('Network error'))

      const result = await getProfilePhotoUrl('user-123', 'photo-456')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Network error')
    })
  })

  describe('getSignedUrlFromPath', () => {
    it('should return error for missing storage path', async () => {
      const result = await getSignedUrlFromPath('')
      expect(result.success).toBe(false)
      expect(result.error).toBe('Storage path is required')
    })

    it('should return signed URL successfully', async () => {
      mockCreateSignedUrl.mockResolvedValueOnce({
        data: { signedUrl: 'https://test.supabase.co/signed-url' },
        error: null,
      })

      const result = await getSignedUrlFromPath('user-123/profile/photo-456.jpg')

      expect(result.success).toBe(true)
      expect(result.signedUrl).toBe('https://test.supabase.co/signed-url')
    })

    it('should use custom expiration time', async () => {
      mockCreateSignedUrl.mockResolvedValueOnce({
        data: { signedUrl: 'https://test.supabase.co/signed-url' },
        error: null,
      })

      const result = await getSignedUrlFromPath('path/to/photo.jpg', 7200)

      expect(result.success).toBe(true)
      expect(result.expiresIn).toBe(7200)
    })

    it('should handle error', async () => {
      mockCreateSignedUrl.mockResolvedValueOnce({
        data: null,
        error: { message: 'Not found' },
      })

      const result = await getSignedUrlFromPath('path/to/photo.jpg')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Not found')
    })

    it('should handle exception', async () => {
      mockCreateSignedUrl.mockRejectedValueOnce(new Error('Network error'))

      const result = await getSignedUrlFromPath('path/to/photo.jpg')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Network error')
    })
  })

  describe('deleteProfilePhoto', () => {
    it('should return error for missing user ID', async () => {
      const result = await deleteProfilePhoto('', 'photo-123')
      expect(result.success).toBe(false)
      expect(result.error).toBe(STORAGE_ERRORS.MISSING_USER_ID)
    })

    it('should return error for missing photo ID', async () => {
      const result = await deleteProfilePhoto('user-123', '')
      expect(result.success).toBe(false)
      expect(result.error).toBe(STORAGE_ERRORS.MISSING_PHOTO_ID)
    })

    it('should delete photo successfully', async () => {
      mockRemove.mockResolvedValueOnce({ error: null })

      const result = await deleteProfilePhoto('user-123', 'photo-456')

      expect(result.success).toBe(true)
      expect(result.error).toBeNull()
    })

    it('should handle delete error', async () => {
      mockRemove.mockResolvedValueOnce({
        error: { message: 'Delete failed' },
      })

      const result = await deleteProfilePhoto('user-123', 'photo-456')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Delete failed')
    })

    it('should handle exception', async () => {
      mockRemove.mockRejectedValueOnce(new Error('Network error'))

      const result = await deleteProfilePhoto('user-123', 'photo-456')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Network error')
    })
  })

  describe('deletePhotoByPath', () => {
    it('should return error for missing storage path', async () => {
      const result = await deletePhotoByPath('')
      expect(result.success).toBe(false)
      expect(result.error).toBe('Storage path is required')
    })

    it('should delete photo successfully', async () => {
      mockRemove.mockResolvedValueOnce({ error: null })

      const result = await deletePhotoByPath('user-123/profile/photo-456.jpg')

      expect(result.success).toBe(true)
      expect(result.error).toBeNull()
    })

    it('should handle delete error', async () => {
      mockRemove.mockResolvedValueOnce({
        error: { message: 'Delete failed' },
      })

      const result = await deletePhotoByPath('path/to/photo.jpg')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Delete failed')
    })

    it('should handle exception', async () => {
      mockRemove.mockRejectedValueOnce(new Error('Network error'))

      const result = await deletePhotoByPath('path/to/photo.jpg')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Network error')
    })
  })
})
