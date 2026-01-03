/**
 * ReportUserModal Component Tests
 *
 * Tests for the ReportUserModal component including:
 * - Rendering when open/closed
 * - Report reason selection
 * - Additional details input
 * - Form validation
 * - Loading and error states
 * - Button interactions
 * - Keyboard handling
 * - Backdrop click
 * - Accessibility requirements
 */

import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ReportUserModal } from '../ReportUserModal'
import { REPORT_REASONS } from '../../../types/chat'
import type { ReportReason } from '../../../types/database'

// Mock CSS module - must have default export
vi.mock('../styles/ChatScreen.module.css', () => ({
  default: {
    modalOverlay: 'modalOverlay',
    modal: 'modal',
    modalLarge: 'modalLarge',
    modalHeader: 'modalHeader',
    iconContainer: 'iconContainer',
    iconContainerWarning: 'iconContainerWarning',
    modalTitle: 'modalTitle',
    modalText: 'modalText',
    usernameHighlight: 'usernameHighlight',
    fieldset: 'fieldset',
    legend: 'legend',
    reasonList: 'reasonList',
    reasonOption: 'reasonOption',
    reasonOptionSelected: 'reasonOptionSelected',
    reasonOptionDisabled: 'reasonOptionDisabled',
    radioInput: 'radioInput',
    customRadio: 'customRadio',
    customRadioChecked: 'customRadioChecked',
    radioInner: 'radioInner',
    reasonLabel: 'reasonLabel',
    detailsSection: 'detailsSection',
    detailsLabel: 'detailsLabel',
    optionalText: 'optionalText',
    detailsTextarea: 'detailsTextarea',
    textareaDisabled: 'textareaDisabled',
    characterCount: 'characterCount',
    privacyNote: 'privacyNote',
    modalError: 'modalError',
    errorIconBadge: 'errorIconBadge',
    modalActions: 'modalActions',
    modalCancelButton: 'modalCancelButton',
    modalSubmitButton: 'modalSubmitButton',
    modalSubmitButtonDisabled: 'modalSubmitButtonDisabled',
    modalSubmitButtonLoading: 'modalSubmitButtonLoading',
    spinnerSmall: 'spinnerSmall',
  },
}))

const defaultProps = {
  isOpen: true,
  username: 'TestUser',
  isLoading: false,
  error: null,
  selectedReason: null as ReportReason | null,
  details: '',
  onReasonChange: vi.fn(),
  onDetailsChange: vi.fn(),
  onSubmit: vi.fn(),
  onCancel: vi.fn(),
}

describe('ReportUserModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    document.body.style.overflow = ''
  })

  describe('Visibility', () => {
    it('should render when isOpen is true', () => {
      render(<ReportUserModal {...defaultProps} isOpen={true} />)

      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    it('should not render when isOpen is false', () => {
      render(<ReportUserModal {...defaultProps} isOpen={false} />)

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
  })

  describe('Content Display', () => {
    it('should display modal title', () => {
      render(<ReportUserModal {...defaultProps} />)

      expect(screen.getByRole('heading', { name: 'Report User' })).toBeInTheDocument()
    })

    it('should display username in description', () => {
      render(<ReportUserModal {...defaultProps} username="JohnDoe" />)

      expect(screen.getByText(/JohnDoe/)).toBeInTheDocument()
    })

    it('should display "this user" when username is empty', () => {
      render(<ReportUserModal {...defaultProps} username="" />)

      expect(screen.getByText(/this user/)).toBeInTheDocument()
    })

    it('should display all report reasons', () => {
      render(<ReportUserModal {...defaultProps} />)

      REPORT_REASONS.forEach((reason) => {
        expect(screen.getByText(reason.label)).toBeInTheDocument()
      })
    })

    it('should display privacy note', () => {
      render(<ReportUserModal {...defaultProps} />)

      expect(
        screen.getByText(/Your report is confidential/)
      ).toBeInTheDocument()
    })

    it('should display details label with "(optional)"', () => {
      render(<ReportUserModal {...defaultProps} />)

      expect(screen.getByText('Additional details')).toBeInTheDocument()
      expect(screen.getByText('(optional)')).toBeInTheDocument()
    })
  })

  describe('Report Reason Selection', () => {
    it('should have radiogroup role for reasons', () => {
      render(<ReportUserModal {...defaultProps} />)

      expect(screen.getByRole('radiogroup')).toBeInTheDocument()
    })

    it('should render radio buttons for each reason', () => {
      render(<ReportUserModal {...defaultProps} />)

      const radioButtons = screen.getAllByRole('radio')
      expect(radioButtons).toHaveLength(REPORT_REASONS.length)
    })

    it('should call onReasonChange when reason is selected', () => {
      const onReasonChange = vi.fn()
      render(<ReportUserModal {...defaultProps} onReasonChange={onReasonChange} />)

      fireEvent.click(screen.getByText('Spam or advertising'))

      expect(onReasonChange).toHaveBeenCalledWith('spam')
    })

    it('should mark selected reason as checked', () => {
      render(<ReportUserModal {...defaultProps} selectedReason="harassment" />)

      const harassmentRadio = screen.getByRole('radio', { name: /Harassment or bullying/i })
      expect(harassmentRadio).toBeChecked()
    })

    it('should not call onReasonChange when loading', () => {
      const onReasonChange = vi.fn()
      render(
        <ReportUserModal {...defaultProps} isLoading={true} onReasonChange={onReasonChange} />
      )

      fireEvent.click(screen.getByText('Spam or advertising'))

      expect(onReasonChange).not.toHaveBeenCalled()
    })

    it('should disable radio buttons when loading', () => {
      render(<ReportUserModal {...defaultProps} isLoading={true} />)

      const radioButtons = screen.getAllByRole('radio')
      radioButtons.forEach((radio) => {
        expect(radio).toBeDisabled()
      })
    })
  })

  describe('Details Input', () => {
    it('should render details textarea', () => {
      render(<ReportUserModal {...defaultProps} />)

      expect(screen.getByPlaceholderText(/Provide any additional information/)).toBeInTheDocument()
    })

    it('should display current details value', () => {
      render(<ReportUserModal {...defaultProps} details="Some details here" />)

      expect(screen.getByDisplayValue('Some details here')).toBeInTheDocument()
    })

    it('should call onDetailsChange when typing in textarea', () => {
      const onDetailsChange = vi.fn()
      render(<ReportUserModal {...defaultProps} onDetailsChange={onDetailsChange} />)

      fireEvent.change(screen.getByPlaceholderText(/Provide any additional information/), {
        target: { value: 'New details' },
      })

      expect(onDetailsChange).toHaveBeenCalledWith('New details')
    })

    it('should show character count', () => {
      render(<ReportUserModal {...defaultProps} details="Hello" />)

      expect(screen.getByText('5/500')).toBeInTheDocument()
    })

    it('should disable textarea when loading', () => {
      render(<ReportUserModal {...defaultProps} isLoading={true} />)

      expect(screen.getByPlaceholderText(/Provide any additional information/)).toBeDisabled()
    })

    it('should have maxLength of 500', () => {
      render(<ReportUserModal {...defaultProps} />)

      expect(screen.getByPlaceholderText(/Provide any additional information/)).toHaveAttribute(
        'maxLength',
        '500'
      )
    })
  })

  describe('Form Validation', () => {
    it('should disable submit button when no reason selected', () => {
      render(<ReportUserModal {...defaultProps} selectedReason={null} />)

      expect(screen.getByRole('button', { name: 'Submit Report' })).toBeDisabled()
    })

    it('should enable submit button when reason is selected', () => {
      render(<ReportUserModal {...defaultProps} selectedReason="spam" />)

      expect(screen.getByRole('button', { name: 'Submit Report' })).not.toBeDisabled()
    })

    it('should allow submission without details (optional)', () => {
      const onSubmit = vi.fn()
      render(
        <ReportUserModal {...defaultProps} selectedReason="spam" details="" onSubmit={onSubmit} />
      )

      fireEvent.click(screen.getByRole('button', { name: 'Submit Report' }))

      expect(onSubmit).toHaveBeenCalled()
    })
  })

  describe('Loading State', () => {
    it('should show loading spinner when isLoading is true', () => {
      const { container } = render(
        <ReportUserModal {...defaultProps} selectedReason="spam" isLoading={true} />
      )

      expect(container.querySelector('.spinnerSmall')).toBeInTheDocument()
    })

    it('should show "Submitting..." text when loading', () => {
      render(<ReportUserModal {...defaultProps} selectedReason="spam" isLoading={true} />)

      expect(screen.getByText('Submitting...')).toBeInTheDocument()
    })

    it('should disable all buttons when loading', () => {
      render(<ReportUserModal {...defaultProps} selectedReason="spam" isLoading={true} />)

      expect(screen.getByText('Cancel').closest('button')).toBeDisabled()
      expect(screen.getByText('Submitting...').closest('button')).toBeDisabled()
    })
  })

  describe('Error State', () => {
    it('should display error message when error is provided', () => {
      render(<ReportUserModal {...defaultProps} error="Failed to submit report" />)

      expect(screen.getByText('Failed to submit report')).toBeInTheDocument()
    })

    it('should have role="alert" on error container', () => {
      render(<ReportUserModal {...defaultProps} error="Error" />)

      expect(screen.getByRole('alert')).toBeInTheDocument()
    })

    it('should not display error when no error', () => {
      render(<ReportUserModal {...defaultProps} error={null} />)

      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    })
  })

  describe('Button Interactions', () => {
    it('should call onCancel when cancel button is clicked', () => {
      const onCancel = vi.fn()
      render(<ReportUserModal {...defaultProps} onCancel={onCancel} />)

      fireEvent.click(screen.getByText('Cancel'))

      expect(onCancel).toHaveBeenCalledTimes(1)
    })

    it('should call onSubmit when submit button is clicked', () => {
      const onSubmit = vi.fn()
      render(<ReportUserModal {...defaultProps} selectedReason="spam" onSubmit={onSubmit} />)

      fireEvent.click(screen.getByRole('button', { name: 'Submit Report' }))

      expect(onSubmit).toHaveBeenCalledTimes(1)
    })

    it('should not call onSubmit when form is invalid', () => {
      const onSubmit = vi.fn()
      render(<ReportUserModal {...defaultProps} selectedReason={null} onSubmit={onSubmit} />)

      fireEvent.click(screen.getByRole('button', { name: 'Submit Report' }))

      expect(onSubmit).not.toHaveBeenCalled()
    })

    it('should not call onCancel when loading', () => {
      const onCancel = vi.fn()
      render(
        <ReportUserModal
          {...defaultProps}
          selectedReason="spam"
          isLoading={true}
          onCancel={onCancel}
        />
      )

      fireEvent.click(screen.getByText('Cancel'))

      expect(onCancel).not.toHaveBeenCalled()
    })
  })

  describe('Keyboard Handling', () => {
    it('should call onCancel when Escape is pressed', () => {
      const onCancel = vi.fn()
      render(<ReportUserModal {...defaultProps} onCancel={onCancel} />)

      fireEvent.keyDown(document, { key: 'Escape' })

      expect(onCancel).toHaveBeenCalledTimes(1)
    })

    it('should not call onCancel on Escape when loading', () => {
      const onCancel = vi.fn()
      render(
        <ReportUserModal
          {...defaultProps}
          selectedReason="spam"
          isLoading={true}
          onCancel={onCancel}
        />
      )

      fireEvent.keyDown(document, { key: 'Escape' })

      expect(onCancel).not.toHaveBeenCalled()
    })
  })

  describe('Backdrop Click', () => {
    it('should call onCancel when clicking on overlay', () => {
      const onCancel = vi.fn()
      render(<ReportUserModal {...defaultProps} onCancel={onCancel} />)

      // The overlay IS the dialog element - click directly on it
      const overlay = screen.getByRole('dialog')
      fireEvent.click(overlay)

      expect(onCancel).toHaveBeenCalledTimes(1)
    })

    it('should not call onCancel when clicking inside modal', () => {
      const onCancel = vi.fn()
      render(<ReportUserModal {...defaultProps} selectedReason="spam" onCancel={onCancel} />)

      fireEvent.click(screen.getByText('Submit Report'))

      expect(onCancel).not.toHaveBeenCalled()
    })

    it('should not close on backdrop click when loading', () => {
      const onCancel = vi.fn()
      render(
        <ReportUserModal
          {...defaultProps}
          selectedReason="spam"
          isLoading={true}
          onCancel={onCancel}
        />
      )

      // The overlay IS the dialog element
      const overlay = screen.getByRole('dialog')
      fireEvent.click(overlay)

      expect(onCancel).not.toHaveBeenCalled()
    })
  })

  describe('Accessibility', () => {
    it('should have role="dialog"', () => {
      render(<ReportUserModal {...defaultProps} />)

      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    it('should have aria-modal="true"', () => {
      render(<ReportUserModal {...defaultProps} />)

      // The overlay div IS the dialog element with aria-modal
      expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true')
    })

    it('should have aria-labelledby pointing to title', () => {
      render(<ReportUserModal {...defaultProps} />)

      // The overlay div IS the dialog element with aria-labelledby
      const dialog = screen.getByRole('dialog')
      expect(dialog).toHaveAttribute('aria-labelledby', 'report-modal-title')
    })

    it('should have aria-describedby pointing to description', () => {
      render(<ReportUserModal {...defaultProps} />)

      // The overlay div IS the dialog element with aria-describedby
      const dialog = screen.getByRole('dialog')
      expect(dialog).toHaveAttribute('aria-describedby', 'report-modal-description')
    })

    it('should have htmlFor on details label', () => {
      render(<ReportUserModal {...defaultProps} />)

      const label = screen.getByText('Additional details').closest('label')
      expect(label).toHaveAttribute('for', 'report-details')
    })

    it('should have id on textarea matching label htmlFor', () => {
      render(<ReportUserModal {...defaultProps} />)

      expect(
        screen.getByPlaceholderText(/Provide any additional information/)
      ).toHaveAttribute('id', 'report-details')
    })
  })

  describe('Edge Cases', () => {
    it('should handle all report reasons', () => {
      const onReasonChange = vi.fn()
      render(<ReportUserModal {...defaultProps} onReasonChange={onReasonChange} />)

      REPORT_REASONS.forEach((reason) => {
        fireEvent.click(screen.getByText(reason.label))
        expect(onReasonChange).toHaveBeenCalledWith(reason.value)
      })
    })

    it('should handle long details text', () => {
      const longDetails = 'A'.repeat(500)
      render(<ReportUserModal {...defaultProps} details={longDetails} />)

      expect(screen.getByDisplayValue(longDetails)).toBeInTheDocument()
      expect(screen.getByText('500/500')).toBeInTheDocument()
    })

    it('should handle special characters in username', () => {
      render(<ReportUserModal {...defaultProps} username="<script>alert('xss')</script>" />)

      // Should render as text, not execute
      expect(screen.getByText(/<script>/)).toBeInTheDocument()
    })
  })
})
