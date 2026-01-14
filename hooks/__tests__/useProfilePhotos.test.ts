/**
 * Tests for hooks/useProfilePhotos.ts
 *
 * Tests profile photo management hook including loading, upload, delete,
 * set primary, and timeout detection.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'

// Mock the profilePhotos lib
vi.mock('../../lib/profilePhotos', () => ({
  uploadProfilePhoto: vi.fn(),
  getProfilePhotos: vi.fn(),
  getApprovedPhotos: vi.fn(),
  deleteProfilePhoto: vi.fn(),
  setPrimaryPhoto: vi.fn(),
  hasApprovedPhoto: vi.fn(),
  getPrimaryPhoto: vi.fn(),
  getPhotoCount: vi.fn(),
  subscribeToPhotoChanges: vi.fn(),
  retryPhotoModeration: vi.fn(),
  MAX_PROFILE_PHOTOS: 6,
}))

import { useProfilePhotos } from '../useProfilePhotos'
import {
  uploadProfilePhoto,
  getProfilePhotos,
  deleteProfilePhoto,
  setPrimaryPhoto,
  subscribeToPhotoChanges,
  retryPhotoModeration,
  type UploadProfilePhotoResult,
  type DeleteProfilePhotoResult,
} from '../../lib/profilePhotos'

const mockUploadProfilePhoto = vi.mocked(uploadProfilePhoto)
const mockGetProfilePhotos = vi.mocked(getProfilePhotos)
const mockDeleteProfilePhoto = vi.mocked(deleteProfilePhoto)
const mockSetPrimaryPhoto = vi.mocked(setPrimaryPhoto)
const mockSubscribeToPhotoChanges = vi.mocked(subscribeToPhotoChanges)
const mockRetryPhotoModeration = vi.mocked(retryPhotoModeration)

describe('useProfilePhotos', () => {
  const mockPhotos = [
    {
      id: 'photo-1',
      user_id: 'user-123',
      storage_path: 'path/1.jpg',
      moderation_status: 'approved' as const,
      moderation_result: null,
      is_primary: true,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      signedUrl: 'https://example.com/1.jpg',
    },
    {
      id: 'photo-2',
      user_id: 'user-123',
      storage_path: 'path/2.jpg',
      moderation_status: 'approved' as const,
      moderation_result: null,
      is_primary: false,
      created_at: '2024-01-02T00:00:00Z',
      updated_at: '2024-01-02T00:00:00Z',
      signedUrl: 'https://example.com/2.jpg',
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()

    // Default mock implementations
    mockGetProfilePhotos.mockResolvedValue(mockPhotos)
    mockSubscribeToPhotoChanges.mockReturnValue(() => {})
    mockRetryPhotoModeration.mockResolvedValue({ success: true })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('initial state', () => {
    it('should start with loading true', async () => {
      const { result } = renderHook(() => useProfilePhotos())

      expect(result.current.loading).toBe(true)

      await act(async () => {
        await vi.runAllTimersAsync()
      })
    })

    it('should set loading false after fetch completes', async () => {
      const { result } = renderHook(() => useProfilePhotos())

      await act(async () => {
        await vi.runAllTimersAsync()
      })

      expect(result.current.loading).toBe(false)
    })

    it('should load photos on mount', async () => {
      const { result } = renderHook(() => useProfilePhotos())

      await act(async () => {
        await vi.runAllTimersAsync()
      })

      expect(result.current.photos).toHaveLength(2)
      expect(mockGetProfilePhotos).toHaveBeenCalled()
    })

    it('should subscribe to photo changes', async () => {
      renderHook(() => useProfilePhotos())

      await act(async () => {
        await vi.runAllTimersAsync()
      })

      expect(mockSubscribeToPhotoChanges).toHaveBeenCalled()
    })
  })

  describe('computed values', () => {
    it('should compute approvedPhotos correctly', async () => {
      const mixedPhotos = [
        { ...mockPhotos[0], moderation_status: 'approved' as const },
        { ...mockPhotos[1], moderation_status: 'pending' as const },
      ]
      mockGetProfilePhotos.mockResolvedValue(mixedPhotos)

      const { result } = renderHook(() => useProfilePhotos())

      await act(async () => {
        await vi.runAllTimersAsync()
      })

      expect(result.current.approvedPhotos).toHaveLength(1)
      expect(result.current.approvedPhotos[0].id).toBe('photo-1')
    })

    it('should compute primaryPhoto correctly', async () => {
      const { result } = renderHook(() => useProfilePhotos())

      await act(async () => {
        await vi.runAllTimersAsync()
      })

      expect(result.current.primaryPhoto?.id).toBe('photo-1')
      expect(result.current.primaryPhoto?.is_primary).toBe(true)
    })

    it('should use first approved photo as primary if none is marked', async () => {
      const photosNoPrimary = [
        { ...mockPhotos[0], is_primary: false },
        { ...mockPhotos[1], is_primary: false },
      ]
      mockGetProfilePhotos.mockResolvedValue(photosNoPrimary)

      const { result } = renderHook(() => useProfilePhotos())

      await act(async () => {
        await vi.runAllTimersAsync()
      })

      expect(result.current.primaryPhoto?.id).toBe('photo-1')
    })

    it('should compute hasApprovedPhotos correctly', async () => {
      const { result } = renderHook(() => useProfilePhotos())

      await act(async () => {
        await vi.runAllTimersAsync()
      })

      expect(result.current.hasApprovedPhotos).toBe(true)
    })

    it('should return hasApprovedPhotos false when no approved photos', async () => {
      mockGetProfilePhotos.mockResolvedValue([
        { ...mockPhotos[0], moderation_status: 'pending' as const },
      ])

      const { result } = renderHook(() => useProfilePhotos())

      await act(async () => {
        await vi.runAllTimersAsync()
      })

      expect(result.current.hasApprovedPhotos).toBe(false)
    })

    it('should compute photoCount correctly (excludes rejected)', async () => {
      const mixedPhotos = [
        { ...mockPhotos[0], moderation_status: 'approved' as const },
        { ...mockPhotos[1], moderation_status: 'rejected' as const },
      ]
      mockGetProfilePhotos.mockResolvedValue(mixedPhotos)

      const { result } = renderHook(() => useProfilePhotos())

      await act(async () => {
        await vi.runAllTimersAsync()
      })

      expect(result.current.photoCount).toBe(1)
    })

    it('should compute hasReachedLimit correctly', async () => {
      const { result } = renderHook(() => useProfilePhotos())

      await act(async () => {
        await vi.runAllTimersAsync()
      })

      expect(result.current.hasReachedLimit).toBe(false)
    })

    it('should show hasReachedLimit true at 6 photos', async () => {
      const sixPhotos = Array(6).fill(null).map((_, i) => ({
        ...mockPhotos[0],
        id: `photo-${i}`,
        moderation_status: 'approved' as const,
      }))
      mockGetProfilePhotos.mockResolvedValue(sixPhotos)

      const { result } = renderHook(() => useProfilePhotos())

      await act(async () => {
        await vi.runAllTimersAsync()
      })

      expect(result.current.hasReachedLimit).toBe(true)
    })
  })

  describe('uploadPhoto', () => {
    it('should upload photo successfully', async () => {
      mockUploadProfilePhoto.mockResolvedValue({
        success: true,
        photo: { ...mockPhotos[0], id: 'new-photo' },
        error: null,
      })

      const { result } = renderHook(() => useProfilePhotos())

      await act(async () => {
        await vi.runAllTimersAsync()
      })

      let success: boolean
      await act(async () => {
        success = await result.current.uploadPhoto('file://image.jpg')
      })

      expect(success!).toBe(true)
      expect(mockUploadProfilePhoto).toHaveBeenCalledWith('file://image.jpg')
    })

    it('should set uploading to true during upload', async () => {
      let resolveUpload!: (value: UploadProfilePhotoResult) => void
      mockUploadProfilePhoto.mockReturnValue(new Promise((resolve) => {
        resolveUpload = resolve
      }))

      const { result } = renderHook(() => useProfilePhotos())

      await act(async () => {
        await vi.runAllTimersAsync()
      })

      act(() => {
        result.current.uploadPhoto('file://image.jpg')
      })

      expect(result.current.uploading).toBe(true)

      await act(async () => {
        resolveUpload!({ success: true, photo: mockPhotos[0], error: null })
      })

      expect(result.current.uploading).toBe(false)
    })

    it('should return false and set error on upload failure', async () => {
      mockUploadProfilePhoto.mockResolvedValue({
        success: false,
        photo: null,
        error: 'Upload failed',
      })

      const { result } = renderHook(() => useProfilePhotos())

      await act(async () => {
        await vi.runAllTimersAsync()
      })

      let success: boolean
      await act(async () => {
        success = await result.current.uploadPhoto('file://image.jpg')
      })

      expect(success!).toBe(false)
      expect(result.current.error).toBe('Upload failed')
    })

    it('should prevent upload when limit is reached', async () => {
      const sixPhotos = Array(6).fill(null).map((_, i) => ({
        ...mockPhotos[0],
        id: `photo-${i}`,
        moderation_status: 'approved' as const,
      }))
      mockGetProfilePhotos.mockResolvedValue(sixPhotos)

      const { result } = renderHook(() => useProfilePhotos())

      await act(async () => {
        await vi.runAllTimersAsync()
      })

      let success: boolean
      await act(async () => {
        success = await result.current.uploadPhoto('file://image.jpg')
      })

      expect(success!).toBe(false)
      expect(result.current.error).toContain('Maximum')
      expect(mockUploadProfilePhoto).not.toHaveBeenCalled()
    })

    it('should handle upload exception', async () => {
      mockUploadProfilePhoto.mockRejectedValue(new Error('Network error'))

      const { result } = renderHook(() => useProfilePhotos())

      await act(async () => {
        await vi.runAllTimersAsync()
      })

      let success: boolean
      await act(async () => {
        success = await result.current.uploadPhoto('file://image.jpg')
      })

      expect(success!).toBe(false)
      expect(result.current.error).toBe('Network error')
    })
  })

  describe('deletePhoto', () => {
    it('should delete photo successfully', async () => {
      mockDeleteProfilePhoto.mockResolvedValue({
        success: true,
        error: null,
      })

      const { result } = renderHook(() => useProfilePhotos())

      await act(async () => {
        await vi.runAllTimersAsync()
      })

      let success: boolean
      await act(async () => {
        success = await result.current.deletePhoto('photo-1')
      })

      expect(success!).toBe(true)
      expect(mockDeleteProfilePhoto).toHaveBeenCalledWith('photo-1')
    })

    it('should remove photo from local state immediately', async () => {
      mockDeleteProfilePhoto.mockResolvedValue({
        success: true,
        error: null,
      })

      const { result } = renderHook(() => useProfilePhotos())

      await act(async () => {
        await vi.runAllTimersAsync()
      })

      expect(result.current.photos).toHaveLength(2)

      await act(async () => {
        await result.current.deletePhoto('photo-1')
      })

      expect(result.current.photos).toHaveLength(1)
      expect(result.current.photos[0].id).toBe('photo-2')
    })

    it('should set deleting to true during delete', async () => {
      let resolveDelete!: (value: DeleteProfilePhotoResult) => void
      mockDeleteProfilePhoto.mockReturnValue(new Promise((resolve) => {
        resolveDelete = resolve
      }))

      const { result } = renderHook(() => useProfilePhotos())

      await act(async () => {
        await vi.runAllTimersAsync()
      })

      act(() => {
        result.current.deletePhoto('photo-1')
      })

      expect(result.current.deleting).toBe(true)

      await act(async () => {
        resolveDelete!({ success: true, error: null })
      })

      expect(result.current.deleting).toBe(false)
    })

    it('should return false and set error on delete failure', async () => {
      mockDeleteProfilePhoto.mockResolvedValue({
        success: false,
        error: 'Delete failed',
      })

      const { result } = renderHook(() => useProfilePhotos())

      await act(async () => {
        await vi.runAllTimersAsync()
      })

      let success: boolean
      await act(async () => {
        success = await result.current.deletePhoto('photo-1')
      })

      expect(success!).toBe(false)
      expect(result.current.error).toBe('Delete failed')
    })

    it('should handle delete exception', async () => {
      mockDeleteProfilePhoto.mockRejectedValue(new Error('Network error'))

      const { result } = renderHook(() => useProfilePhotos())

      await act(async () => {
        await vi.runAllTimersAsync()
      })

      let success: boolean
      await act(async () => {
        success = await result.current.deletePhoto('photo-1')
      })

      expect(success!).toBe(false)
      expect(result.current.error).toBe('Network error')
    })
  })

  describe('setPrimary', () => {
    it('should set primary photo successfully', async () => {
      mockSetPrimaryPhoto.mockResolvedValue({
        success: true,
        error: null,
      })

      const { result } = renderHook(() => useProfilePhotos())

      await act(async () => {
        await vi.runAllTimersAsync()
      })

      let success: boolean
      await act(async () => {
        success = await result.current.setPrimary('photo-2')
      })

      expect(success!).toBe(true)
      expect(mockSetPrimaryPhoto).toHaveBeenCalledWith('photo-2')
    })

    it('should update local state to reflect new primary', async () => {
      mockSetPrimaryPhoto.mockResolvedValue({
        success: true,
        error: null,
      })

      const { result } = renderHook(() => useProfilePhotos())

      await act(async () => {
        await vi.runAllTimersAsync()
      })

      expect(result.current.photos[0].is_primary).toBe(true)
      expect(result.current.photos[1].is_primary).toBe(false)

      await act(async () => {
        await result.current.setPrimary('photo-2')
      })

      expect(result.current.photos[0].is_primary).toBe(false)
      expect(result.current.photos[1].is_primary).toBe(true)
    })

    it('should return false and set error on failure', async () => {
      mockSetPrimaryPhoto.mockResolvedValue({
        success: false,
        error: 'Failed to set primary',
      })

      const { result } = renderHook(() => useProfilePhotos())

      await act(async () => {
        await vi.runAllTimersAsync()
      })

      let success: boolean
      await act(async () => {
        success = await result.current.setPrimary('photo-2')
      })

      expect(success!).toBe(false)
      expect(result.current.error).toBe('Failed to set primary')
    })

    it('should handle exception', async () => {
      mockSetPrimaryPhoto.mockRejectedValue(new Error('Network error'))

      const { result } = renderHook(() => useProfilePhotos())

      await act(async () => {
        await vi.runAllTimersAsync()
      })

      let success: boolean
      await act(async () => {
        success = await result.current.setPrimary('photo-2')
      })

      expect(success!).toBe(false)
      expect(result.current.error).toBe('Network error')
    })
  })

  describe('refresh', () => {
    it('should reload photos from server', async () => {
      const { result } = renderHook(() => useProfilePhotos())

      await act(async () => {
        await vi.runAllTimersAsync()
      })

      mockGetProfilePhotos.mockClear()

      await act(async () => {
        await result.current.refresh()
      })

      expect(mockGetProfilePhotos).toHaveBeenCalled()
    })

    it('should set loading true during refresh', async () => {
      const { result } = renderHook(() => useProfilePhotos())

      await act(async () => {
        await vi.runAllTimersAsync()
      })

      expect(result.current.loading).toBe(false)

      let refreshPromise: Promise<void>
      act(() => {
        refreshPromise = result.current.refresh()
      })

      expect(result.current.loading).toBe(true)

      await act(async () => {
        await refreshPromise
      })

      expect(result.current.loading).toBe(false)
    })
  })

  describe('clearError', () => {
    it('should clear error', async () => {
      mockUploadProfilePhoto.mockResolvedValue({
        success: false,
        photo: null,
        error: 'Upload failed',
      })

      const { result } = renderHook(() => useProfilePhotos())

      await act(async () => {
        await vi.runAllTimersAsync()
      })

      await act(async () => {
        await result.current.uploadPhoto('file://image.jpg')
      })

      expect(result.current.error).toBe('Upload failed')

      act(() => {
        result.current.clearError()
      })

      expect(result.current.error).toBeNull()
    })
  })

  describe('error handling', () => {
    it('should set error when initial load fails', async () => {
      mockGetProfilePhotos.mockRejectedValue(new Error('Load failed'))

      const { result } = renderHook(() => useProfilePhotos())

      await act(async () => {
        await vi.runAllTimersAsync()
      })

      expect(result.current.error).toBe('Failed to load photos')
    })
  })

  describe('timeout detection', () => {
    it('should initially mark pending photos as not timed out', async () => {
      const pendingPhoto = {
        ...mockPhotos[0],
        id: 'pending-photo',
        moderation_status: 'pending' as const,
      }
      mockGetProfilePhotos.mockResolvedValue([pendingPhoto])

      const { result } = renderHook(() => useProfilePhotos())

      await act(async () => {
        await vi.runAllTimersAsync()
      })

      // Initially not timed out
      expect(result.current.hasTimedOutPhotos).toBe(false)
      expect(result.current.photos[0].isTimedOut).toBe(false)
    })

    it('should not mark approved photos as timed out', async () => {
      const { result } = renderHook(() => useProfilePhotos())

      await act(async () => {
        await vi.runAllTimersAsync()
      })

      expect(result.current.hasTimedOutPhotos).toBe(false)
      expect(result.current.photos[0].isTimedOut).toBe(false)
    })

    it('should add isTimedOut property to photos', async () => {
      const { result } = renderHook(() => useProfilePhotos())

      await act(async () => {
        await vi.runAllTimersAsync()
      })

      // Every photo should have isTimedOut property
      result.current.photos.forEach((photo) => {
        expect(photo).toHaveProperty('isTimedOut')
      })
    })
  })

  describe('retryModeration', () => {
    it('should call loadPhotos when retrying moderation', async () => {
      const pendingPhoto = {
        ...mockPhotos[0],
        id: 'pending-photo',
        moderation_status: 'pending' as const,
      }
      mockGetProfilePhotos.mockResolvedValue([pendingPhoto])

      const { result } = renderHook(() => useProfilePhotos())

      await act(async () => {
        await vi.runAllTimersAsync()
      })

      mockGetProfilePhotos.mockClear()

      await act(async () => {
        await result.current.retryModeration('pending-photo')
      })

      // Should have called getProfilePhotos to refresh
      expect(mockGetProfilePhotos).toHaveBeenCalled()
    })

    it('should return true when moderation is re-queued (status pending)', async () => {
      // When retryPhotoModeration succeeds but moderation is still pending,
      // the function should return true (moderation will complete via realtime)
      const pendingPhoto = {
        ...mockPhotos[0],
        id: 'pending-photo',
        moderation_status: 'pending' as const,
      }
      mockGetProfilePhotos.mockResolvedValue([pendingPhoto])

      const { result } = renderHook(() => useProfilePhotos())

      await act(async () => {
        await vi.runAllTimersAsync()
      })

      // Retry returns success without status (pending state)
      mockRetryPhotoModeration.mockResolvedValue({ success: true })

      let success: boolean
      await act(async () => {
        success = await result.current.retryModeration('pending-photo')
      })

      // Should return true because retry was queued successfully
      expect(success!).toBe(true)
      expect(result.current.error).toBeNull()
    })
  })

  describe('cleanup', () => {
    it('should unsubscribe on unmount', async () => {
      const unsubscribe = vi.fn()
      mockSubscribeToPhotoChanges.mockReturnValue(unsubscribe)

      const { unmount } = renderHook(() => useProfilePhotos())

      await act(async () => {
        await vi.runAllTimersAsync()
      })

      unmount()

      expect(unsubscribe).toHaveBeenCalled()
    })
  })
})
