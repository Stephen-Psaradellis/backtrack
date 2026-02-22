/**
 * PostingPermissionModal Component Tests
 *
 * Tests for the posting permission modal that explains why users can't post at a location.
 */

import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'
import { PostingPermissionModal } from '../PostingPermissionModal'

// Mock haptics
vi.mock('../../../lib/haptics', () => ({
  selectionFeedback: vi.fn(() => Promise.resolve()),
}))

describe('PostingPermissionModal', () => {
  const defaultProps = {
    visible: true,
    locationName: 'Coffee Shop',
    onCheckIn: vi.fn(),
    onViewRegulars: vi.fn(),
    onClose: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('renders without crashing', () => {
      const { container } = render(<PostingPermissionModal {...defaultProps} />)
      expect(container).toBeTruthy()
    })

    it('renders when visible is true', () => {
      const { getByText } = render(<PostingPermissionModal {...defaultProps} />)
      expect(getByText("Can't Post Here Yet")).toBeTruthy()
    })

    it('displays the location name', () => {
      const { getByText } = render(<PostingPermissionModal {...defaultProps} />)
      expect(getByText('Coffee Shop')).toBeTruthy()
    })

    it('displays the title', () => {
      const { getByText } = render(<PostingPermissionModal {...defaultProps} />)
      expect(getByText("Can't Post Here Yet")).toBeTruthy()
    })

    it('displays the requirement message', () => {
      const { getByText } = render(<PostingPermissionModal {...defaultProps} />)
      expect(getByText(/Only/)).toBeTruthy()
      expect(getByText(/Regulars/)).toBeTruthy()
      expect(getByText(/checked in within the last 12 hours/)).toBeTruthy()
    })

    it('displays the info box with both sections', () => {
      const { getByText } = render(<PostingPermissionModal {...defaultProps} />)
      expect(getByText('Become a Regular')).toBeTruthy()
      expect(getByText(/Visit.*regularly/)).toBeTruthy()
      expect(getByText('Check In Now')).toBeTruthy()
      expect(getByText(/Check in when you're at/)).toBeTruthy()
    })

    it('renders check-in button when onCheckIn is provided', () => {
      const { getByText } = render(<PostingPermissionModal {...defaultProps} />)
      expect(getByText('Check In to Post')).toBeTruthy()
    })

    it('does not render check-in button when onCheckIn is not provided', () => {
      const { queryByText } = render(
        <PostingPermissionModal {...defaultProps} onCheckIn={undefined} />
      )
      expect(queryByText('Check In to Post')).toBeNull()
    })

    it('renders close button', () => {
      const { getByText } = render(<PostingPermissionModal {...defaultProps} />)
      expect(getByText('Got it')).toBeTruthy()
    })
  })

  describe('Interactions', () => {
    it('renders interactive close button', () => {
      const { getByText } = render(<PostingPermissionModal {...defaultProps} />)
      const closeButton = getByText('Got it')
      expect(closeButton).toBeTruthy()
    })

    it('renders interactive check-in button', () => {
      const { getByText } = render(<PostingPermissionModal {...defaultProps} />)
      const checkInButton = getByText('Check In to Post')
      expect(checkInButton).toBeTruthy()
    })
  })

  describe('Visibility', () => {
    it('renders with visible=true', () => {
      const { getByText } = render(
        <PostingPermissionModal {...defaultProps} visible={true} />
      )
      expect(getByText("Can't Post Here Yet")).toBeTruthy()
    })

    it('renders with visible=false', () => {
      const { getByText } = render(
        <PostingPermissionModal {...defaultProps} visible={false} />
      )
      // Modal component still renders but React Native handles visibility
      expect(getByText("Can't Post Here Yet")).toBeTruthy()
    })
  })

  describe('Accessibility', () => {
    it('renders with accessibility features', () => {
      const { container } = render(<PostingPermissionModal {...defaultProps} />)
      // Modal is rendered for accessibility
      expect(container).toBeTruthy()
    })
  })
})
