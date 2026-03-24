/**
 * Tests for components/ProfilePhotoGallery.tsx
 */

import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render } from '@testing-library/react'
import { ProfilePhotoGallery } from '../ProfilePhotoGallery'

vi.mock('../../lib/haptics', () => ({
  lightFeedback: vi.fn(),
  warningFeedback: vi.fn(),
  successFeedback: vi.fn(),
}))

vi.mock('../../lib/photoSharing', () => ({
  getPhotoShareCount: vi.fn().mockResolvedValue(0),
}))

vi.mock('../../utils/imagePicker', () => ({
  pickSelfieFromCamera: vi.fn().mockResolvedValue({ success: false }),
  pickSelfieFromGallery: vi.fn().mockResolvedValue({ success: false }),
}))

vi.mock('../../constants/glassStyles', () => ({
  darkTheme: {
    textMuted: '#8E8E93',
    textPrimary: '#FFFFFF',
    textSecondary: '#AEAEB2',
    surface: '#1C1C1E',
    surfaceElevated: '#2C2C2E',
    glassBorder: 'rgba(255,255,255,0.1)',
    glass: 'rgba(255,255,255,0.05)',
    success: '#34C759',
  },
}))

vi.mock('../../constants/theme', () => ({
  colors: {
    primary: { 400: '#FF8A65', 500: '#FF6B47' },
  },
}))

let mockPhotos: any[] = []
let mockLoading = false
vi.mock('../../hooks/useProfilePhotos', () => ({
  useProfilePhotos: () => ({
    photos: mockPhotos,
    loading: mockLoading,
    uploading: false,
    deleting: false,
    error: null,
    hasReachedLimit: false,
    uploadPhoto: vi.fn(),
    deletePhoto: vi.fn(),
    setPrimary: vi.fn(),
    clearError: vi.fn(),
  }),
}))

const getByTestId = (container: HTMLElement, testId: string) => {
  const element = container.querySelector(`[testid="${testId}"]`)
  if (!element) {
    throw new Error(`Unable to find element with testid="${testId}"\n\n${container.innerHTML}`)
  }
  return element
}

describe('ProfilePhotoGallery', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPhotos = []
    mockLoading = false
  })

  describe('loading state', () => {
    it('should show loading indicator when loading', () => {
      mockLoading = true
      const { container } = render(<ProfilePhotoGallery />)
      expect(getByTestId(container, 'profile-photo-gallery-loading')).toBeInTheDocument()
    })
  })

  describe('empty state', () => {
    it('should show empty state when no photos', () => {
      const { container, getByText } = render(<ProfilePhotoGallery />)
      expect(getByTestId(container, 'profile-photo-gallery-empty')).toBeInTheDocument()
      expect(getByText('No verification photos')).toBeInTheDocument()
      expect(getByText('Add Your First Photo')).toBeInTheDocument()
    })
  })

  describe('with photos', () => {
    it('should render photo grid with photos', () => {
      mockPhotos = [
        {
          id: 'p1',
          signedUrl: 'https://example.com/photo1.jpg',
          is_primary: true,
          moderation_status: 'approved',
        },
        {
          id: 'p2',
          signedUrl: 'https://example.com/photo2.jpg',
          is_primary: false,
          moderation_status: 'pending',
        },
      ]

      const { container, getByText } = render(<ProfilePhotoGallery />)
      expect(getByTestId(container, 'profile-photo-gallery')).toBeInTheDocument()
      expect(getByText(/of 5 photos/)).toBeInTheDocument()
    })

    it('should show info text about long press', () => {
      mockPhotos = [
        { id: 'p1', signedUrl: 'https://example.com/photo1.jpg', is_primary: false, moderation_status: 'approved' },
      ]

      const { getByText } = render(<ProfilePhotoGallery />)
      expect(getByText(/Long press a photo for options/)).toBeInTheDocument()
    })
  })

  describe('custom props', () => {
    it('should use custom testID', () => {
      mockPhotos = [
        { id: 'p1', signedUrl: null, is_primary: false, moderation_status: 'approved' },
      ]
      const { container } = render(
        <ProfilePhotoGallery testID="custom-gallery" />
      )
      expect(getByTestId(container, 'custom-gallery')).toBeInTheDocument()
    })
  })
})
