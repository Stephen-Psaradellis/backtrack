/**
 * Tests for hooks/usePhotoSharing.ts
 *
 * Tests the photo sharing hook with real-time updates.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'

// Mock the photoSharing library
const mockSharePhotoWithMatch = vi.fn()
const mockUnsharePhotoFromMatch = vi.fn()
const mockGetSharedPhotosForConversation = vi.fn()
const mockGetMySharedPhotosForConversation = vi.fn()
const mockIsPhotoSharedInConversation = vi.fn()
const mockSubscribeToPhotoShareChanges = vi.fn()

vi.mock('../../lib/photoSharing', () => ({
  sharePhotoWithMatch: (...args: unknown[]) => mockSharePhotoWithMatch(...args),
  unsharePhotoFromMatch: (...args: unknown[]) => mockUnsharePhotoFromMatch(...args),
  getSharedPhotosForConversation: (...args: unknown[]) => mockGetSharedPhotosForConversation(...args),
  getMySharedPhotosForConversation: (...args: unknown[]) => mockGetMySharedPhotosForConversation(...args),
  isPhotoSharedInConversation: (...args: unknown[]) => mockIsPhotoSharedInConversation(...args),
  subscribeToPhotoShareChanges: (...args: unknown[]) => mockSubscribeToPhotoShareChanges(...args),
}))

import { usePhotoSharing } from '../usePhotoSharing'

describe('usePhotoSharing', () => {
  const mockConversationId = 'conv-123'
  const mockSharedPhotos = [
    { photo_id: 'photo-1', signed_url: 'https://example.com/1.jpg' },
    { photo_id: 'photo-2', signed_url: 'https://example.com/2.jpg' },
  ]
  const mockMyPhotos = [
    { photo_id: 'photo-3', signed_url: 'https://example.com/3.jpg' },
  ]

  beforeEach(() => {
    vi.clearAllMocks()

    // Default mock implementations
    mockGetSharedPhotosForConversation.mockResolvedValue(mockSharedPhotos)
    mockGetMySharedPhotosForConversation.mockResolvedValue(mockMyPhotos)
    mockSubscribeToPhotoShareChanges.mockReturnValue(() => {})
  })

  describe('initial state', () => {
    it('should start with loading true', () => {
      const { result } = renderHook(() => usePhotoSharing(mockConversationId))

      expect(result.current.loading).toBe(true)
    })

    it('should load shared photos on mount', async () => {
      const { result } = renderHook(() => usePhotoSharing(mockConversationId))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(mockGetSharedPhotosForConversation).toHaveBeenCalledWith(mockConversationId)
      expect(mockGetMySharedPhotosForConversation).toHaveBeenCalledWith(mockConversationId)
    })

    it('should populate sharedWithMe after load', async () => {
      const { result } = renderHook(() => usePhotoSharing(mockConversationId))

      await waitFor(() => {
        expect(result.current.sharedWithMe).toEqual(mockSharedPhotos)
      })
    })

    it('should populate mySharedPhotos after load', async () => {
      const { result } = renderHook(() => usePhotoSharing(mockConversationId))

      await waitFor(() => {
        expect(result.current.mySharedPhotos).toEqual(mockMyPhotos)
      })
    })

    it('should set up subscription on mount', async () => {
      renderHook(() => usePhotoSharing(mockConversationId))

      await waitFor(() => {
        expect(mockSubscribeToPhotoShareChanges).toHaveBeenCalledWith(
          mockConversationId,
          expect.any(Function)
        )
      })
    })
  })

  describe('computed values', () => {
    it('should compute hasSharedPhotos correctly', async () => {
      const { result } = renderHook(() => usePhotoSharing(mockConversationId))

      await waitFor(() => {
        expect(result.current.hasSharedPhotos).toBe(true)
        expect(result.current.sharedWithMeCount).toBe(2)
      })
    })

    it('should compute hasSharedAnyPhotos correctly', async () => {
      const { result } = renderHook(() => usePhotoSharing(mockConversationId))

      await waitFor(() => {
        expect(result.current.hasSharedAnyPhotos).toBe(true)
        expect(result.current.mySharedCount).toBe(1)
      })
    })

    it('should return false for hasSharedPhotos when empty', async () => {
      mockGetSharedPhotosForConversation.mockResolvedValue([])

      const { result } = renderHook(() => usePhotoSharing(mockConversationId))

      await waitFor(() => {
        expect(result.current.hasSharedPhotos).toBe(false)
        expect(result.current.sharedWithMeCount).toBe(0)
      })
    })
  })

  describe('isPhotoShared', () => {
    it('should return true for shared photos', async () => {
      const { result } = renderHook(() => usePhotoSharing(mockConversationId))

      await waitFor(() => {
        expect(result.current.isPhotoShared('photo-3')).toBe(true)
      })
    })

    it('should return false for unshared photos', async () => {
      const { result } = renderHook(() => usePhotoSharing(mockConversationId))

      await waitFor(() => {
        expect(result.current.isPhotoShared('photo-999')).toBe(false)
      })
    })
  })

  describe('sharePhoto', () => {
    it('should share a photo successfully', async () => {
      mockSharePhotoWithMatch.mockResolvedValue({ success: true })

      const { result } = renderHook(() => usePhotoSharing(mockConversationId))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      let shareResult: boolean
      await act(async () => {
        shareResult = await result.current.sharePhoto('new-photo')
      })

      expect(shareResult!).toBe(true)
      expect(mockSharePhotoWithMatch).toHaveBeenCalledWith('new-photo', mockConversationId)
    })

    it('should set sharing to true while sharing', async () => {
      mockSharePhotoWithMatch.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ success: true }), 100))
      )

      const { result } = renderHook(() => usePhotoSharing(mockConversationId))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      act(() => {
        result.current.sharePhoto('new-photo')
      })

      expect(result.current.sharing).toBe(true)
    })

    it('should return false and set error on share failure', async () => {
      mockSharePhotoWithMatch.mockResolvedValue({ success: false, error: 'Share failed' })

      const { result } = renderHook(() => usePhotoSharing(mockConversationId))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      let shareResult: boolean
      await act(async () => {
        shareResult = await result.current.sharePhoto('new-photo')
      })

      expect(shareResult!).toBe(false)
      expect(result.current.error).toBe('Share failed')
    })

    it('should handle exception during share', async () => {
      mockSharePhotoWithMatch.mockRejectedValue(new Error('Network error'))

      const { result } = renderHook(() => usePhotoSharing(mockConversationId))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      let shareResult: boolean
      await act(async () => {
        shareResult = await result.current.sharePhoto('new-photo')
      })

      expect(shareResult!).toBe(false)
      expect(result.current.error).toBe('Network error')
    })

    it('should return false if no conversation selected', async () => {
      const { result } = renderHook(() => usePhotoSharing(''))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      let shareResult: boolean
      await act(async () => {
        shareResult = await result.current.sharePhoto('new-photo')
      })

      expect(shareResult!).toBe(false)
      expect(result.current.error).toBe('No conversation selected')
    })
  })

  describe('unsharePhoto', () => {
    it('should unshare a photo successfully', async () => {
      mockUnsharePhotoFromMatch.mockResolvedValue({ success: true })

      const { result } = renderHook(() => usePhotoSharing(mockConversationId))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      let unshareResult: boolean
      await act(async () => {
        unshareResult = await result.current.unsharePhoto('photo-3')
      })

      expect(unshareResult!).toBe(true)
      expect(mockUnsharePhotoFromMatch).toHaveBeenCalledWith('photo-3', mockConversationId)
    })

    it('should set unsharing to true while unsharing', async () => {
      mockUnsharePhotoFromMatch.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ success: true }), 100))
      )

      const { result } = renderHook(() => usePhotoSharing(mockConversationId))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      act(() => {
        result.current.unsharePhoto('photo-3')
      })

      expect(result.current.unsharing).toBe(true)
    })

    it('should remove photo from local state on unshare', async () => {
      mockUnsharePhotoFromMatch.mockResolvedValue({ success: true })

      const { result } = renderHook(() => usePhotoSharing(mockConversationId))

      await waitFor(() => {
        expect(result.current.mySharedPhotos).toHaveLength(1)
      })

      await act(async () => {
        await result.current.unsharePhoto('photo-3')
      })

      expect(result.current.mySharedPhotos).toHaveLength(0)
    })

    it('should return false and set error on unshare failure', async () => {
      mockUnsharePhotoFromMatch.mockResolvedValue({ success: false, error: 'Unshare failed' })

      const { result } = renderHook(() => usePhotoSharing(mockConversationId))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      let unshareResult: boolean
      await act(async () => {
        unshareResult = await result.current.unsharePhoto('photo-3')
      })

      expect(unshareResult!).toBe(false)
      expect(result.current.error).toBe('Unshare failed')
    })

    it('should handle exception during unshare', async () => {
      mockUnsharePhotoFromMatch.mockRejectedValue(new Error('Network error'))

      const { result } = renderHook(() => usePhotoSharing(mockConversationId))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      let unshareResult: boolean
      await act(async () => {
        unshareResult = await result.current.unsharePhoto('photo-3')
      })

      expect(unshareResult!).toBe(false)
      expect(result.current.error).toBe('Network error')
    })

    it('should return false if no conversation selected', async () => {
      const { result } = renderHook(() => usePhotoSharing(''))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      let unshareResult: boolean
      await act(async () => {
        unshareResult = await result.current.unsharePhoto('photo-3')
      })

      expect(unshareResult!).toBe(false)
      expect(result.current.error).toBe('No conversation selected')
    })
  })

  describe('refresh', () => {
    it('should reload shared photos', async () => {
      const { result } = renderHook(() => usePhotoSharing(mockConversationId))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      mockGetSharedPhotosForConversation.mockClear()
      mockGetMySharedPhotosForConversation.mockClear()

      await act(async () => {
        await result.current.refresh()
      })

      expect(mockGetSharedPhotosForConversation).toHaveBeenCalledWith(mockConversationId)
      expect(mockGetMySharedPhotosForConversation).toHaveBeenCalledWith(mockConversationId)
    })

    it('should set loading during refresh', async () => {
      mockGetSharedPhotosForConversation.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve([]), 100))
      )
      mockGetMySharedPhotosForConversation.mockResolvedValue([])

      const { result } = renderHook(() => usePhotoSharing(mockConversationId))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      act(() => {
        result.current.refresh()
      })

      expect(result.current.loading).toBe(true)
    })

    it('should clear error on refresh', async () => {
      mockSharePhotoWithMatch.mockResolvedValue({ success: false, error: 'Error' })

      const { result } = renderHook(() => usePhotoSharing(mockConversationId))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      await act(async () => {
        await result.current.sharePhoto('photo')
      })

      expect(result.current.error).toBe('Error')

      await act(async () => {
        await result.current.refresh()
      })

      expect(result.current.error).toBeNull()
    })
  })

  describe('clearError', () => {
    it('should clear the error state', async () => {
      mockSharePhotoWithMatch.mockResolvedValue({ success: false, error: 'Error' })

      const { result } = renderHook(() => usePhotoSharing(mockConversationId))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      await act(async () => {
        await result.current.sharePhoto('photo')
      })

      expect(result.current.error).toBe('Error')

      act(() => {
        result.current.clearError()
      })

      expect(result.current.error).toBeNull()
    })
  })

  describe('error handling', () => {
    it('should handle load error', async () => {
      mockGetSharedPhotosForConversation.mockRejectedValue(new Error('Load failed'))

      const { result } = renderHook(() => usePhotoSharing(mockConversationId))

      await waitFor(() => {
        expect(result.current.error).toBe('Failed to load shared photos')
      })
    })
  })

  describe('empty conversation id', () => {
    it('should not load when conversation id is empty', async () => {
      const { result } = renderHook(() => usePhotoSharing(''))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(mockGetSharedPhotosForConversation).not.toHaveBeenCalled()
    })

    it('should not subscribe when conversation id is empty', async () => {
      renderHook(() => usePhotoSharing(''))

      await waitFor(() => {
        expect(mockSubscribeToPhotoShareChanges).not.toHaveBeenCalled()
      })
    })
  })

  describe('cleanup', () => {
    it('should unsubscribe on unmount', async () => {
      const mockUnsubscribe = vi.fn()
      mockSubscribeToPhotoShareChanges.mockReturnValue(mockUnsubscribe)

      const { unmount } = renderHook(() => usePhotoSharing(mockConversationId))

      await waitFor(() => {
        expect(mockSubscribeToPhotoShareChanges).toHaveBeenCalled()
      })

      unmount()

      expect(mockUnsubscribe).toHaveBeenCalled()
    })
  })
})
