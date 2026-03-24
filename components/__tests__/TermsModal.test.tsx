/**
 * Tests for components/TermsModal.tsx
 */

import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, fireEvent } from '@testing-library/react'
import { TermsModal, hasAcceptedTerms, getTermsAcceptanceTimestamp } from '../TermsModal'

vi.mock('../../lib/haptics', () => ({
  selectionFeedback: vi.fn(),
}))

const getByTestId = (container: HTMLElement, testId: string) => {
  const element = container.querySelector(`[testid="${testId}"]`)
  if (!element) {
    throw new Error(`Unable to find element with testid="${testId}"\n\n${container.innerHTML}`)
  }
  return element
}

describe('TermsModal', () => {
  const defaultProps = {
    visible: true,
    onAccept: vi.fn(),
    onDecline: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('rendering', () => {
    it('should render the modal title', () => {
      const { getByText } = render(<TermsModal {...defaultProps} />)
      expect(getByText('Terms & Conditions')).toBeInTheDocument()
    })

    it('should render intro text', () => {
      const { getByText } = render(<TermsModal {...defaultProps} />)
      expect(getByText(/Before creating your account/)).toBeInTheDocument()
    })

    it('should render age confirmation checkbox', () => {
      const { container } = render(<TermsModal {...defaultProps} />)
      expect(getByTestId(container, 'terms-modal-age-checkbox')).toBeInTheDocument()
    })

    it('should render terms checkbox', () => {
      const { container } = render(<TermsModal {...defaultProps} />)
      expect(getByTestId(container, 'terms-modal-terms-checkbox')).toBeInTheDocument()
    })

    it('should render privacy checkbox', () => {
      const { container } = render(<TermsModal {...defaultProps} />)
      expect(getByTestId(container, 'terms-modal-privacy-checkbox')).toBeInTheDocument()
    })

    it('should render Decline and Accept buttons', () => {
      const { getByText } = render(<TermsModal {...defaultProps} />)
      expect(getByText('Decline')).toBeInTheDocument()
      expect(getByText('Accept & Continue')).toBeInTheDocument()
    })

    it('should render age requirement text', () => {
      const { getByText } = render(<TermsModal {...defaultProps} />)
      expect(getByText('18 years old')).toBeInTheDocument()
    })
  })

  describe('interactions', () => {
    it('should call onDecline when decline is pressed', () => {
      const { container } = render(<TermsModal {...defaultProps} />)
      fireEvent.click(getByTestId(container, 'terms-modal-decline'))
      expect(defaultProps.onDecline).toHaveBeenCalled()
    })

    it('should call onDecline when close button is pressed', () => {
      const { container } = render(<TermsModal {...defaultProps} />)
      fireEvent.click(getByTestId(container, 'terms-modal-close'))
      expect(defaultProps.onDecline).toHaveBeenCalled()
    })

    it('should not call onAccept when not all checkboxes are checked', () => {
      const { container } = render(<TermsModal {...defaultProps} />)
      fireEvent.click(getByTestId(container, 'terms-modal-accept'))
      expect(defaultProps.onAccept).not.toHaveBeenCalled()
    })

    it('should call onAccept when all checkboxes are checked and accept pressed', () => {
      const { container } = render(<TermsModal {...defaultProps} />)
      fireEvent.click(getByTestId(container, 'terms-modal-age-checkbox'))
      fireEvent.click(getByTestId(container, 'terms-modal-terms-checkbox'))
      fireEvent.click(getByTestId(container, 'terms-modal-privacy-checkbox'))
      fireEvent.click(getByTestId(container, 'terms-modal-accept'))
      expect(defaultProps.onAccept).toHaveBeenCalled()
    })
  })

  describe('utility functions', () => {
    it('hasAcceptedTerms returns true for non-null timestamp', () => {
      expect(hasAcceptedTerms('2024-01-01T00:00:00Z')).toBe(true)
    })

    it('hasAcceptedTerms returns false for null', () => {
      expect(hasAcceptedTerms(null)).toBe(false)
    })

    it('getTermsAcceptanceTimestamp returns ISO string', () => {
      const timestamp = getTermsAcceptanceTimestamp()
      expect(() => new Date(timestamp)).not.toThrow()
      expect(timestamp).toContain('T')
    })
  })
})
