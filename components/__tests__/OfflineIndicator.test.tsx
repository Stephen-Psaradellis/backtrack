/**
 * Tests for components/OfflineIndicator.tsx
 *
 * Tests the OfflineIndicator and ControlledOfflineIndicator banner components.
 */

import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, fireEvent } from '@testing-library/react'

// Mock useNetworkStatus hook
const mockRefresh = vi.fn().mockResolvedValue(undefined)
const mockNetworkStatus = {
  isConnected: false,
  isInternetReachable: false,
  type: 'wifi' as const,
  loading: false,
  refresh: mockRefresh,
}

vi.mock('../../hooks/useNetworkStatus', () => ({
  useNetworkStatus: () => mockNetworkStatus,
  getConnectionTypeLabel: (type: string) => {
    const labels: Record<string, string> = { wifi: 'Wi-Fi', cellular: 'Cellular', none: 'None' }
    return labels[type] || 'Unknown'
  },
}))

import { OfflineIndicator, ControlledOfflineIndicator } from '../OfflineIndicator'

// Helper to get by testid
const getByTestId = (container: HTMLElement, testId: string) => {
  const element = container.querySelector(`[testid="${testId}"]`)
  if (!element) {
    throw new Error(`Unable to find element with testid="${testId}"`)
  }
  return element
}

const queryByTestId = (container: HTMLElement, testId: string) =>
  container.querySelector(`[testid="${testId}"]`)

describe('OfflineIndicator', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockNetworkStatus.isConnected = false
    mockNetworkStatus.isInternetReachable = false
    mockNetworkStatus.loading = false
  })

  describe('visibility', () => {
    it('should render when offline', () => {
      const { container } = render(<OfflineIndicator />)
      expect(getByTestId(container, 'offline-indicator')).toBeInTheDocument()
    })

    it('should not render when connected and autoHide is true', () => {
      mockNetworkStatus.isConnected = true
      mockNetworkStatus.isInternetReachable = true

      const { container } = render(<OfflineIndicator />)
      expect(queryByTestId(container, 'offline-indicator')).toBeNull()
    })
  })

  describe('message display', () => {
    it('should show default offline message', () => {
      const { getByText } = render(<OfflineIndicator />)
      expect(getByText('No internet connection')).toBeInTheDocument()
    })

    it('should show custom message', () => {
      const { getByText } = render(<OfflineIndicator message="Server down" />)
      expect(getByText('Server down')).toBeInTheDocument()
    })

    it('should show connecting message when loading', () => {
      mockNetworkStatus.loading = true
      const { getByText } = render(<OfflineIndicator />)
      expect(getByText('Checking connection...')).toBeInTheDocument()
    })
  })

  describe('retry button', () => {
    it('should render retry button by default', () => {
      const { container } = render(<OfflineIndicator />)
      expect(getByTestId(container, 'offline-indicator-retry-button')).toBeInTheDocument()
    })

    it('should hide retry button when showRetryButton is false', () => {
      const { container } = render(<OfflineIndicator showRetryButton={false} />)
      expect(queryByTestId(container, 'offline-indicator-retry-button')).toBeNull()
    })

    it('should call refresh and onRetry when retry is pressed', () => {
      const mockOnRetry = vi.fn()
      const { container } = render(<OfflineIndicator onRetry={mockOnRetry} />)

      const retryBtn = getByTestId(container, 'offline-indicator-retry-button')
      fireEvent.click(retryBtn)

      expect(mockRefresh).toHaveBeenCalled()
    })

    it('should show custom retry label', () => {
      const { getByText } = render(<OfflineIndicator retryLabel="Try Again" />)
      expect(getByText('Try Again')).toBeInTheDocument()
    })
  })

  describe('connection type', () => {
    it('should show connection type when enabled', () => {
      const { getByText } = render(<OfflineIndicator showConnectionType />)
      expect(getByText('Wi-Fi')).toBeInTheDocument()
    })

    it('should not show connection type by default', () => {
      const { container } = render(<OfflineIndicator />)
      expect(queryByTestId(container, 'offline-indicator-connection-type')).toBeNull()
    })
  })
})

describe('ControlledOfflineIndicator', () => {
  it('should render when visible is true', () => {
    const { container } = render(<ControlledOfflineIndicator visible message="Offline" />)
    expect(getByTestId(container, 'offline-indicator-controlled')).toBeInTheDocument()
  })

  it('should not render when visible is false', () => {
    const { container } = render(<ControlledOfflineIndicator visible={false} message="Offline" />)
    expect(queryByTestId(container, 'offline-indicator-controlled')).toBeNull()
  })

  it('should call onRetry when retry button is pressed', () => {
    const mockOnRetry = vi.fn()
    const { container } = render(
      <ControlledOfflineIndicator visible onRetry={mockOnRetry} />
    )

    const retryBtn = getByTestId(container, 'offline-indicator-controlled-retry-button')
    fireEvent.click(retryBtn)

    expect(mockOnRetry).toHaveBeenCalled()
  })
})
