/**
 * Tests for components/SelfieCamera.tsx
 */

import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, fireEvent } from '@testing-library/react'
import {
  SelfieCamera,
  FullScreenSelfieCamera,
  CompactSelfieCamera,
  formatPhotoUri,
  getRecommendedQuality,
  DEFAULT_QUALITY,
} from '../SelfieCamera'
import { Platform } from 'react-native'

vi.mock('../../lib/haptics', () => ({
  successFeedback: vi.fn(),
  lightFeedback: vi.fn(),
}))

vi.mock('../LoadingSpinner', () => ({
  LoadingSpinner: (props: any) => React.createElement('div', { testid: 'loading-spinner' }, props.message || 'Loading'),
}))

let mockPermission: any = { granted: true }
const mockRequestPermission = vi.fn()
vi.mock('expo-camera', () => ({
  CameraView: React.forwardRef(({ children, testID }: any, ref: any) => {
    return React.createElement('div', { testid: testID, ref }, children)
  }),
  CameraType: {},
  useCameraPermissions: () => [mockPermission, mockRequestPermission],
}))

const getByTestId = (container: HTMLElement, testId: string) => {
  const element = container.querySelector(`[testid="${testId}"]`)
  if (!element) {
    throw new Error(`Unable to find element with testid="${testId}"\n\n${container.innerHTML}`)
  }
  return element
}

const queryByTestId = (container: HTMLElement, testId: string) =>
  container.querySelector(`[testid="${testId}"]`)

describe('SelfieCamera', () => {
  const defaultProps = {
    onCapture: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockPermission = { granted: true }
  })

  describe('permission not loaded', () => {
    it('should show loading when permission is null', () => {
      mockPermission = null
      const { container } = render(<SelfieCamera {...defaultProps} />)
      expect(getByTestId(container, 'selfie-camera')).toBeInTheDocument()
    })
  })

  describe('permission not granted', () => {
    it('should show permission request UI', () => {
      mockPermission = { granted: false }
      const { container, getByText } = render(
        <SelfieCamera {...defaultProps} />
      )
      expect(getByTestId(container, 'selfie-camera-permission')).toBeInTheDocument()
      expect(getByText('Camera Access Required')).toBeInTheDocument()
      expect(getByText('Allow Camera Access')).toBeInTheDocument()
    })

    it('should show Go Back button when onCancel is provided', () => {
      mockPermission = { granted: false }
      const { getByText } = render(
        <SelfieCamera {...defaultProps} onCancel={vi.fn()} />
      )
      expect(getByText('Go Back')).toBeInTheDocument()
    })

    it('should call requestPermission when allow button is pressed', async () => {
      mockPermission = { granted: false }
      const { container } = render(<SelfieCamera {...defaultProps} />)
      fireEvent.click(getByTestId(container, 'selfie-camera-grant-permission'))
      await vi.waitFor(() => {
        expect(mockRequestPermission).toHaveBeenCalled()
      })
    })
  })

  describe('camera view', () => {
    it('should render camera view when permission granted', () => {
      const { container } = render(<SelfieCamera {...defaultProps} />)
      expect(getByTestId(container, 'selfie-camera')).toBeInTheDocument()
      expect(getByTestId(container, 'selfie-camera-view')).toBeInTheDocument()
    })

    it('should render capture button', () => {
      const { container } = render(<SelfieCamera {...defaultProps} />)
      expect(getByTestId(container, 'selfie-camera-capture')).toBeInTheDocument()
    })

    it('should render flip button by default', () => {
      const { container } = render(<SelfieCamera {...defaultProps} />)
      expect(getByTestId(container, 'selfie-camera-flip')).toBeInTheDocument()
    })

    it('should render cancel button when onCancel provided', () => {
      const { container } = render(
        <SelfieCamera {...defaultProps} onCancel={vi.fn()} />
      )
      expect(getByTestId(container, 'selfie-camera-cancel')).toBeInTheDocument()
    })

    it('should render instructions text', () => {
      const { getByText } = render(<SelfieCamera {...defaultProps} />)
      expect(getByText('Position your face in the frame')).toBeInTheDocument()
    })
  })

  describe('utility functions', () => {
    it('formatPhotoUri should add file:// prefix on iOS', () => {
      const originalPlatform = Platform.OS
      Object.defineProperty(Platform, 'OS', { value: 'ios', configurable: true })
      expect(formatPhotoUri('/path/photo.jpg')).toBe('file:///path/photo.jpg')
      Object.defineProperty(Platform, 'OS', { value: originalPlatform, configurable: true })
    })

    it('formatPhotoUri should not modify URIs already with file://', () => {
      const originalPlatform = Platform.OS
      Object.defineProperty(Platform, 'OS', { value: 'ios', configurable: true })
      expect(formatPhotoUri('file:///path/photo.jpg')).toBe('file:///path/photo.jpg')
      Object.defineProperty(Platform, 'OS', { value: originalPlatform, configurable: true })
    })

    it('getRecommendedQuality should return correct values', () => {
      expect(getRecommendedQuality('profile')).toBe(0.9)
      expect(getRecommendedQuality('verification')).toBe(0.8)
      expect(getRecommendedQuality('preview')).toBe(0.5)
    })

    it('DEFAULT_QUALITY should be 0.8', () => {
      expect(DEFAULT_QUALITY).toBe(0.8)
    })
  })

  describe('preset variants', () => {
    it('should render FullScreenSelfieCamera', () => {
      const { container } = render(
        <FullScreenSelfieCamera onCapture={vi.fn()} />
      )
      expect(getByTestId(container, 'selfie-camera-fullscreen')).toBeInTheDocument()
    })

    it('should render CompactSelfieCamera without flip button', () => {
      const { container } = render(
        <CompactSelfieCamera onCapture={vi.fn()} />
      )
      expect(getByTestId(container, 'selfie-camera-compact')).toBeInTheDocument()
      expect(queryByTestId(container, 'selfie-camera-compact-flip')).toBeNull()
    })
  })
})
