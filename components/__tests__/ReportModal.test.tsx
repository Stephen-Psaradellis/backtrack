/**
 * Tests for components/ReportModal.tsx
 */

import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, fireEvent, waitFor } from '@testing-library/react'
import { ReportModal, ReportPostModal, ReportMessageModal, ReportUserModal } from '../ReportModal'

// Mock dependencies
vi.mock('../../lib/haptics', () => ({
  successFeedback: vi.fn(),
  errorFeedback: vi.fn(),
  selectionFeedback: vi.fn(),
}))

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ userId: 'test-user-id' }),
}))

const mockSubmitReport = vi.fn()
vi.mock('../../lib/moderation', () => ({
  submitReport: (...args: unknown[]) => mockSubmitReport(...args),
  REPORT_REASONS: {
    SPAM: 'Spam or misleading',
    HARASSMENT: 'Harassment or bullying',
    INAPPROPRIATE: 'Inappropriate content',
    IMPERSONATION: 'Impersonation',
    VIOLENCE: 'Violence or dangerous behavior',
    HATE_SPEECH: 'Hate speech',
    OTHER: 'Other',
  },
  MODERATION_ERRORS: {
    REPORT_FAILED: 'Failed to submit report. Please try again.',
  },
}))

const getByTestId = (container: HTMLElement, testId: string) => {
  const element = container.querySelector(`[testid="${testId}"]`)
  if (!element) {
    throw new Error(`Unable to find element with testid="${testId}"\n\n${container.innerHTML}`)
  }
  return element
}

describe('ReportModal', () => {
  const defaultProps = {
    visible: true,
    onClose: vi.fn(),
    reportedType: 'post' as const,
    reportedId: 'post-123',
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockSubmitReport.mockResolvedValue({ success: true })
  })

  describe('rendering', () => {
    it('should render the modal with correct title for post', () => {
      const { getByText } = render(<ReportModal {...defaultProps} />)
      expect(getByText('Report Post')).toBeInTheDocument()
    })

    it('should render correct title for message type', () => {
      const { getByText } = render(
        <ReportModal {...defaultProps} reportedType="message" />
      )
      expect(getByText('Report Message')).toBeInTheDocument()
    })

    it('should render correct title for user type', () => {
      const { getByText } = render(
        <ReportModal {...defaultProps} reportedType="user" />
      )
      expect(getByText('Report User')).toBeInTheDocument()
    })

    it('should render custom title when provided', () => {
      const { getByText } = render(
        <ReportModal {...defaultProps} title="Custom Title" />
      )
      expect(getByText('Custom Title')).toBeInTheDocument()
    })

    it('should render all report reason options', () => {
      const { getByText } = render(<ReportModal {...defaultProps} />)
      expect(getByText('Spam or misleading')).toBeInTheDocument()
      expect(getByText('Harassment or bullying')).toBeInTheDocument()
      expect(getByText('Inappropriate content')).toBeInTheDocument()
      expect(getByText('Impersonation')).toBeInTheDocument()
      expect(getByText('Violence or dangerous behavior')).toBeInTheDocument()
      expect(getByText('Hate speech')).toBeInTheDocument()
      expect(getByText('Other')).toBeInTheDocument()
    })

    it('should render description text', () => {
      const { getByText } = render(<ReportModal {...defaultProps} />)
      expect(getByText('Why are you reporting this post?')).toBeInTheDocument()
    })

    it('should render Cancel and Submit buttons', () => {
      const { getByText } = render(<ReportModal {...defaultProps} />)
      expect(getByText('Cancel')).toBeInTheDocument()
      expect(getByText('Submit Report')).toBeInTheDocument()
    })
  })

  describe('interactions', () => {
    it('should call onClose when cancel is pressed', () => {
      const { container } = render(<ReportModal {...defaultProps} />)
      fireEvent.click(getByTestId(container, 'report-modal-cancel'))
      expect(defaultProps.onClose).toHaveBeenCalled()
    })

    it('should call onClose when close button is pressed', () => {
      const { container } = render(<ReportModal {...defaultProps} />)
      fireEvent.click(getByTestId(container, 'report-modal-close'))
      expect(defaultProps.onClose).toHaveBeenCalled()
    })

    it('should submit report when reason selected and submit pressed', async () => {
      const onSuccess = vi.fn()
      const { container } = render(
        <ReportModal {...defaultProps} onSuccess={onSuccess} />
      )

      fireEvent.click(getByTestId(container, 'report-modal-reason-spam'))
      fireEvent.click(getByTestId(container, 'report-modal-submit'))

      await waitFor(() => {
        expect(mockSubmitReport).toHaveBeenCalled()
      })
    })

    it('should disable submit button when no reason is selected', () => {
      const { container } = render(<ReportModal {...defaultProps} />)
      const submitBtn = getByTestId(container, 'report-modal-submit')
      expect(submitBtn).toHaveAttribute('disabled')
    })
  })

  describe('preset variants', () => {
    it('should render ReportPostModal with post type', () => {
      const { getByText } = render(
        <ReportPostModal visible={true} onClose={vi.fn()} reportedId="p-1" />
      )
      expect(getByText('Report Post')).toBeInTheDocument()
    })

    it('should render ReportMessageModal with message type', () => {
      const { getByText } = render(
        <ReportMessageModal visible={true} onClose={vi.fn()} reportedId="m-1" />
      )
      expect(getByText('Report Message')).toBeInTheDocument()
    })

    it('should render ReportUserModal with user type', () => {
      const { getByText } = render(
        <ReportUserModal visible={true} onClose={vi.fn()} reportedId="u-1" />
      )
      expect(getByText('Report User')).toBeInTheDocument()
    })
  })
})
