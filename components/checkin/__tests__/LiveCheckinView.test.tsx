/**
 * Tests for components/checkin/LiveCheckinView.tsx
 */

import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, fireEvent } from '@testing-library/react'
import { LiveCheckinView } from '../LiveCheckinView'

vi.mock('../../../lib/haptics', () => ({
  selectionFeedback: vi.fn(),
}))

vi.mock('react-native-bitmoji', () => ({
  Avatar: () => 'Avatar',
}))

vi.mock('../../LoadingSpinner', () => ({
  LoadingSpinner: (props: any) => React.createElement('div', { testid: 'loading-spinner' }, 'Loading'),
}))

vi.mock('../../../constants/glassStyles', () => ({
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

vi.mock('../../../constants/theme', () => ({
  colors: {
    primary: { 500: '#FF6B47' },
  },
}))

const mockUseLiveCheckins = vi.fn()
vi.mock('../../../hooks/useLiveCheckins', () => ({
  useLiveCheckins: (...args: unknown[]) => mockUseLiveCheckins(...args),
}))

const mockCheckIn = vi.fn()
vi.mock('../../../hooks/useCheckin', () => ({
  useCheckin: () => ({
    checkIn: mockCheckIn,
    isCheckingIn: false,
  }),
}))

const getByTestId = (container: HTMLElement, testId: string) => {
  const element = container.querySelector(`[testid="${testId}"]`)
  if (!element) {
    throw new Error(`Unable to find element with testid="${testId}"\n\n${container.innerHTML}`)
  }
  return element
}

describe('LiveCheckinView', () => {
  const defaultProps = {
    locationId: 'loc-123',
    locationName: 'Coffee Shop',
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('loading state', () => {
    it('should show loading spinner when loading', () => {
      mockUseLiveCheckins.mockReturnValue({
        checkins: [],
        count: 0,
        hasAccess: false,
        accessReason: null,
        isLoading: true,
        error: null,
      })

      const { container, getByText } = render(
        <LiveCheckinView {...defaultProps} />
      )
      expect(getByTestId(container, 'live-checkin-view')).toBeInTheDocument()
      expect(getByText('Live View')).toBeInTheDocument()
    })
  })

  describe('no access state', () => {
    it('should show no-access message with CTA', () => {
      mockUseLiveCheckins.mockReturnValue({
        checkins: [],
        count: 3,
        hasAccess: false,
        accessReason: null,
        isLoading: false,
        error: null,
      })

      const { getByText, container } = render(
        <LiveCheckinView {...defaultProps} />
      )
      expect(getByText(/Check into Coffee Shop/)).toBeInTheDocument()
      expect(getByTestId(container, 'live-checkin-view-checkin-cta')).toBeInTheDocument()
    })

    it('should show count badge when users are checked in', () => {
      mockUseLiveCheckins.mockReturnValue({
        checkins: [],
        count: 5,
        hasAccess: false,
        accessReason: null,
        isLoading: false,
        error: null,
      })

      const { getByText } = render(<LiveCheckinView {...defaultProps} />)
      expect(getByText('5')).toBeInTheDocument()
    })

    it('should call onCheckIn when CTA is pressed', async () => {
      mockUseLiveCheckins.mockReturnValue({
        checkins: [],
        count: 0,
        hasAccess: false,
        accessReason: null,
        isLoading: false,
        error: null,
      })

      const onCheckIn = vi.fn()
      const { container } = render(
        <LiveCheckinView {...defaultProps} onCheckIn={onCheckIn} />
      )
      fireEvent.click(getByTestId(container, 'live-checkin-view-checkin-cta'))
      await vi.waitFor(() => {
        expect(onCheckIn).toHaveBeenCalled()
      })
    })
  })

  describe('has access state', () => {
    it('should show user list when has access with checkins', () => {
      mockUseLiveCheckins.mockReturnValue({
        checkins: [
          { user_id: 'u1', display_name: 'Alice', avatar: null },
          { user_id: 'u2', display_name: 'Bob', avatar: null },
        ],
        count: 2,
        hasAccess: true,
        accessReason: 'checked_in',
        isLoading: false,
        error: null,
      })

      const { getByText, container } = render(
        <LiveCheckinView {...defaultProps} />
      )
      expect(getByText('2 here')).toBeInTheDocument()
      expect(getByTestId(container, 'live-checkin-view-user-list')).toBeInTheDocument()
    })

    it('should show empty message when no checkins', () => {
      mockUseLiveCheckins.mockReturnValue({
        checkins: [],
        count: 0,
        hasAccess: true,
        accessReason: 'checked_in',
        isLoading: false,
        error: null,
      })

      const { getByText } = render(<LiveCheckinView {...defaultProps} />)
      expect(getByText('No one else is checked in right now')).toBeInTheDocument()
    })

    it('should show Regular badge when access is via regular status', () => {
      mockUseLiveCheckins.mockReturnValue({
        checkins: [],
        count: 0,
        hasAccess: true,
        accessReason: 'regular',
        isLoading: false,
        error: null,
      })

      const { getByText } = render(<LiveCheckinView {...defaultProps} />)
      expect(getByText('Regular')).toBeInTheDocument()
    })
  })
})
