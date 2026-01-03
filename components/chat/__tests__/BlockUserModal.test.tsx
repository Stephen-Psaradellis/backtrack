/**
 * BlockUserModal Component Tests
 *
 * Tests for the BlockUserModal component including:
 * - Rendering when open/closed
 * - Displaying username in confirmation
 * - Loading state
 * - Error state display
 * - Button interactions
 * - Keyboard handling (Escape to close)
 * - Backdrop click to close
 * - Focus trap
 * - Accessibility requirements
 */

import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { BlockUserModal } from '../BlockUserModal'

// Mock CSS module - must have default export
vi.mock('../styles/ChatScreen.module.css', () => ({
  default: {
    modalOverlay: 'modalOverlay',
    modal: 'modal',
    modalHeader: 'modalHeader',
    iconContainer: 'iconContainer',
    iconContainerDanger: 'iconContainerDanger',
    modalTitle: 'modalTitle',
    modalText: 'modalText',
    usernameHighlight: 'usernameHighlight',
    modalDescription: 'modalDescription',
    modalList: 'modalList',
    listItem: 'listItem',
    modalError: 'modalError',
    errorIconBadge: 'errorIconBadge',
    modalActions: 'modalActions',
    modalCancelButton: 'modalCancelButton',
    modalConfirmButton: 'modalConfirmButton',
    modalConfirmButtonLoading: 'modalConfirmButtonLoading',
    spinnerSmall: 'spinnerSmall',
  },
}))

const defaultProps = {
  isOpen: true,
  username: 'TestUser',
  isLoading: false,
  error: null,
  onConfirm: vi.fn(),
  onCancel: vi.fn(),
}

describe('BlockUserModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset body overflow style
    document.body.style.overflow = ''
  })

  describe('Visibility', () => {
    it('should render when isOpen is true', () => {
      render(<BlockUserModal {...defaultProps} isOpen={true} />)

      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    it('should not render when isOpen is false', () => {
      render(<BlockUserModal {...defaultProps} isOpen={false} />)

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
  })

  describe('Content Display', () => {
    it('should display modal title', () => {
      render(<BlockUserModal {...defaultProps} />)

      expect(screen.getByRole('heading', { name: 'Block User' })).toBeInTheDocument()
    })

    it('should display username in confirmation text', () => {
      render(<BlockUserModal {...defaultProps} username="JohnDoe" />)

      expect(screen.getByText(/JohnDoe/)).toBeInTheDocument()
    })

    it('should display "this user" when username is empty', () => {
      render(<BlockUserModal {...defaultProps} username="" />)

      expect(screen.getByText(/this user/)).toBeInTheDocument()
    })

    it('should display consequences list', () => {
      render(<BlockUserModal {...defaultProps} />)

      expect(screen.getByText("They won't be able to send you messages")).toBeInTheDocument()
      expect(screen.getByText("You won't see their posts")).toBeInTheDocument()
      expect(screen.getByText("They won't be notified that you blocked them")).toBeInTheDocument()
      expect(screen.getByText('You can unblock them later in settings')).toBeInTheDocument()
    })

    it('should have 4 consequences items', () => {
      render(<BlockUserModal {...defaultProps} />)

      const listItems = screen.getAllByRole('listitem')
      expect(listItems).toHaveLength(4)
    })
  })

  describe('Loading State', () => {
    it('should show loading spinner when isLoading is true', () => {
      const { container } = render(<BlockUserModal {...defaultProps} isLoading={true} />)

      expect(container.querySelector('.spinnerSmall')).toBeInTheDocument()
    })

    it('should show "Blocking..." text when loading', () => {
      render(<BlockUserModal {...defaultProps} isLoading={true} />)

      expect(screen.getByText('Blocking...')).toBeInTheDocument()
    })

    it('should show "Block User" text when not loading', () => {
      render(<BlockUserModal {...defaultProps} isLoading={false} />)

      expect(screen.getByRole('button', { name: 'Block User' })).toBeInTheDocument()
    })

    it('should disable buttons when loading', () => {
      render(<BlockUserModal {...defaultProps} isLoading={true} />)

      expect(screen.getByText('Cancel').closest('button')).toBeDisabled()
      expect(screen.getByText('Blocking...').closest('button')).toBeDisabled()
    })

    it('should apply loading class to confirm button', () => {
      const { container } = render(<BlockUserModal {...defaultProps} isLoading={true} />)

      expect(container.querySelector('.modalConfirmButtonLoading')).toBeInTheDocument()
    })
  })

  describe('Error State', () => {
    it('should display error message when error is provided', () => {
      render(<BlockUserModal {...defaultProps} error="Network error occurred" />)

      expect(screen.getByText('Network error occurred')).toBeInTheDocument()
    })

    it('should have role="alert" on error container', () => {
      render(<BlockUserModal {...defaultProps} error="Some error" />)

      expect(screen.getByRole('alert')).toBeInTheDocument()
    })

    it('should not display error container when no error', () => {
      render(<BlockUserModal {...defaultProps} error={null} />)

      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    })

    it('should show error icon badge', () => {
      const { container } = render(<BlockUserModal {...defaultProps} error="Error" />)

      expect(container.querySelector('.errorIconBadge')).toBeInTheDocument()
    })
  })

  describe('Button Interactions', () => {
    it('should call onCancel when cancel button is clicked', () => {
      const onCancel = vi.fn()
      render(<BlockUserModal {...defaultProps} onCancel={onCancel} />)

      fireEvent.click(screen.getByText('Cancel'))

      expect(onCancel).toHaveBeenCalledTimes(1)
    })

    it('should call onConfirm when confirm button is clicked', () => {
      const onConfirm = vi.fn()
      render(<BlockUserModal {...defaultProps} onConfirm={onConfirm} />)

      fireEvent.click(screen.getByRole('button', { name: 'Block User' }))

      expect(onConfirm).toHaveBeenCalledTimes(1)
    })

    it('should not call onCancel when loading', () => {
      const onCancel = vi.fn()
      render(<BlockUserModal {...defaultProps} isLoading={true} onCancel={onCancel} />)

      fireEvent.click(screen.getByText('Cancel'))

      expect(onCancel).not.toHaveBeenCalled()
    })

    it('should not call onConfirm when loading', () => {
      const onConfirm = vi.fn()
      render(<BlockUserModal {...defaultProps} isLoading={true} onConfirm={onConfirm} />)

      fireEvent.click(screen.getByText('Blocking...').closest('button')!)

      expect(onConfirm).not.toHaveBeenCalled()
    })
  })

  describe('Keyboard Handling', () => {
    it('should call onCancel when Escape is pressed', () => {
      const onCancel = vi.fn()
      render(<BlockUserModal {...defaultProps} onCancel={onCancel} />)

      fireEvent.keyDown(document, { key: 'Escape' })

      expect(onCancel).toHaveBeenCalledTimes(1)
    })

    it('should not call onCancel on Escape when loading', () => {
      const onCancel = vi.fn()
      render(<BlockUserModal {...defaultProps} isLoading={true} onCancel={onCancel} />)

      fireEvent.keyDown(document, { key: 'Escape' })

      expect(onCancel).not.toHaveBeenCalled()
    })
  })

  describe('Backdrop Click', () => {
    it('should call onCancel when clicking on overlay', () => {
      const onCancel = vi.fn()
      render(<BlockUserModal {...defaultProps} onCancel={onCancel} />)

      // The overlay IS the dialog element - click directly on it
      const overlay = screen.getByRole('dialog')
      fireEvent.click(overlay)

      expect(onCancel).toHaveBeenCalledTimes(1)
    })

    it('should not call onCancel when clicking inside modal', () => {
      const onCancel = vi.fn()
      render(<BlockUserModal {...defaultProps} onCancel={onCancel} />)

      // Click on the button (not the heading) - use getByRole to be specific
      fireEvent.click(screen.getByRole('button', { name: 'Block User' }))

      // Only onConfirm should be called, not onCancel from backdrop
      expect(onCancel).not.toHaveBeenCalled()
    })

    it('should not close on backdrop click when loading', () => {
      const onCancel = vi.fn()
      render(<BlockUserModal {...defaultProps} isLoading={true} onCancel={onCancel} />)

      // The overlay IS the dialog element
      const overlay = screen.getByRole('dialog')
      fireEvent.click(overlay)

      expect(onCancel).not.toHaveBeenCalled()
    })
  })

  describe('Body Scroll Prevention', () => {
    it('should set body overflow to hidden when open', () => {
      render(<BlockUserModal {...defaultProps} isOpen={true} />)

      expect(document.body.style.overflow).toBe('hidden')
    })

    it('should reset body overflow when closed', () => {
      const { rerender } = render(<BlockUserModal {...defaultProps} isOpen={true} />)

      rerender(<BlockUserModal {...defaultProps} isOpen={false} />)

      expect(document.body.style.overflow).toBe('')
    })
  })

  describe('Accessibility', () => {
    it('should have role="dialog"', () => {
      render(<BlockUserModal {...defaultProps} />)

      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    it('should have aria-modal="true"', () => {
      render(<BlockUserModal {...defaultProps} />)

      // The overlay div IS the dialog element with aria-modal
      expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true')
    })

    it('should have aria-labelledby pointing to title', () => {
      render(<BlockUserModal {...defaultProps} />)

      // The overlay div IS the dialog element with aria-labelledby
      const dialog = screen.getByRole('dialog')
      expect(dialog).toHaveAttribute('aria-labelledby', 'block-modal-title')

      const title = document.getElementById('block-modal-title')
      expect(title).toHaveTextContent('Block User')
    })

    it('should have aria-describedby pointing to description', () => {
      render(<BlockUserModal {...defaultProps} />)

      // The overlay div IS the dialog element with aria-describedby
      const dialog = screen.getByRole('dialog')
      expect(dialog).toHaveAttribute('aria-describedby', 'block-modal-description')

      const description = document.getElementById('block-modal-description')
      expect(description).toBeInTheDocument()
    })

    it('should have type="button" on all buttons', () => {
      render(<BlockUserModal {...defaultProps} />)

      const buttons = screen.getAllByRole('button')
      buttons.forEach((button) => {
        expect(button).toHaveAttribute('type', 'button')
      })
    })

    it('should have aria-hidden on icon badge', () => {
      const { container } = render(<BlockUserModal {...defaultProps} error="Error" />)

      const badge = container.querySelector('.errorIconBadge')
      expect(badge).toHaveAttribute('aria-hidden', 'true')
    })
  })

  describe('Focus Management', () => {
    it('should focus cancel button when modal opens', async () => {
      render(<BlockUserModal {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('Cancel')).toHaveFocus()
      })
    })
  })

  describe('Edge Cases', () => {
    it('should handle very long username', () => {
      const longUsername = 'A'.repeat(100)
      render(<BlockUserModal {...defaultProps} username={longUsername} />)

      expect(screen.getByText(new RegExp(longUsername))).toBeInTheDocument()
    })

    it('should handle special characters in username', () => {
      render(<BlockUserModal {...defaultProps} username="User<script>alert('xss')</script>" />)

      // Should render as text, not execute
      expect(screen.getByText(/User<script>/)).toBeInTheDocument()
    })

    it('should handle very long error message', () => {
      const longError = 'Error: '.repeat(50)
      render(<BlockUserModal {...defaultProps} error={longError} />)

      // The error text is in a span element, use a function matcher
      expect(screen.getByText((content, element) => {
        return element?.textContent === longError
      })).toBeInTheDocument()
    })
  })
})
