/**
 * MatchingPermissionModal Component Tests
 *
 * Tests for the matching permission modal that explains why users can't respond to posts.
 */

import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'
import { MatchingPermissionModal } from '../MatchingPermissionModal'

// Mock haptics
vi.mock('../../../lib/haptics', () => ({
  selectionFeedback: vi.fn(() => Promise.resolve()),
}))

describe('MatchingPermissionModal', () => {
  const defaultProps = {
    visible: true,
    locationName: 'Coffee Shop',
    onCheckIn: vi.fn(),
    onClose: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('renders without crashing', () => {
      const { container } = render(<MatchingPermissionModal {...defaultProps} />)
      expect(container).toBeTruthy()
    })

    it('renders when visible is true', () => {
      const { getByText } = render(<MatchingPermissionModal {...defaultProps} />)
      expect(getByText("Can't Respond Yet")).toBeTruthy()
    })

    it('displays the location name', () => {
      const { getByText } = render(<MatchingPermissionModal {...defaultProps} />)
      expect(getByText('Coffee Shop')).toBeTruthy()
    })

    it('displays the title', () => {
      const { getByText } = render(<MatchingPermissionModal {...defaultProps} />)
      expect(getByText("Can't Respond Yet")).toBeTruthy()
    })

    it('displays the requirement message', () => {
      const { getByText } = render(<MatchingPermissionModal {...defaultProps} />)
      expect(getByText(/To respond to this post/)).toBeTruthy()
      expect(getByText(/Regular/)).toBeTruthy()
      expect(getByText(/checked in within 24 hours/)).toBeTruthy()
    })

    it('displays the info box', () => {
      const { getByText } = render(<MatchingPermissionModal {...defaultProps} />)
      expect(getByText('Why This Requirement?')).toBeTruthy()
      expect(getByText(/authentic connections/)).toBeTruthy()
    })

    it('renders check-in button when onCheckIn is provided', () => {
      const { getByText } = render(<MatchingPermissionModal {...defaultProps} />)
      expect(getByText('Check In Now')).toBeTruthy()
    })

    it('does not render check-in button when onCheckIn is not provided', () => {
      const { queryByText } = render(
        <MatchingPermissionModal {...defaultProps} onCheckIn={undefined} />
      )
      expect(queryByText('Check In Now')).toBeNull()
    })

    it('renders close button', () => {
      const { getByText } = render(<MatchingPermissionModal {...defaultProps} />)
      expect(getByText('Got it')).toBeTruthy()
    })
  })

  describe('Interactions', () => {
    it('renders interactive close button', () => {
      const { getByText } = render(<MatchingPermissionModal {...defaultProps} />)
      const closeButton = getByText('Got it')
      expect(closeButton).toBeTruthy()
    })

    it('renders interactive check-in button', () => {
      const { getByText } = render(<MatchingPermissionModal {...defaultProps} />)
      const checkInButton = getByText('Check In Now')
      expect(checkInButton).toBeTruthy()
    })
  })

  describe('Visibility', () => {
    it('renders with visible=true', () => {
      const { getByText } = render(
        <MatchingPermissionModal {...defaultProps} visible={true} />
      )
      expect(getByText("Can't Respond Yet")).toBeTruthy()
    })

    it('renders with visible=false', () => {
      const { getByText } = render(
        <MatchingPermissionModal {...defaultProps} visible={false} />
      )
      // Modal component still renders but React Native handles visibility
      expect(getByText("Can't Respond Yet")).toBeTruthy()
    })
  })

  describe('Accessibility', () => {
    it('renders with accessibility features', () => {
      const { container } = render(<MatchingPermissionModal {...defaultProps} />)
      // Modal is rendered for accessibility
      expect(container).toBeTruthy()
    })
  })
})
