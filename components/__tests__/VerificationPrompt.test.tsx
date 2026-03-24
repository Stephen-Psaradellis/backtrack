/**
 * Tests for components/VerificationPrompt.tsx
 */

import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, fireEvent } from '@testing-library/react'
import { VerificationPrompt, CompactVerificationPrompt } from '../VerificationPrompt'

vi.mock('react-native-svg', () => ({
  SvgXml: 'SvgXml',
}))

vi.mock('../../lib/haptics', () => ({
  lightFeedback: vi.fn().mockResolvedValue(undefined),
  warningFeedback: vi.fn().mockResolvedValue(undefined),
}))

const getByTestId = (container: HTMLElement, testId: string) => {
  const element = container.querySelector(`[testid="${testId}"]`)
  if (!element) {
    throw new Error(`Unable to find element with testid="${testId}"\n\n${container.innerHTML}`)
  }
  return element
}

describe('VerificationPrompt', () => {
  const defaultProps = {
    onVerify: vi.fn(),
  }

  describe('default variant', () => {
    it('should render the prompt container', () => {
      const { container } = render(<VerificationPrompt {...defaultProps} />)
      expect(getByTestId(container, 'verification-prompt')).toBeInTheDocument()
    })

    it('should render the title', () => {
      const { getByText } = render(<VerificationPrompt {...defaultProps} />)
      expect(getByText('Get verified to build trust')).toBeInTheDocument()
    })

    it('should render the description message', () => {
      const { getByText } = render(<VerificationPrompt {...defaultProps} />)
      expect(getByText(/Complete selfie verification/)).toBeInTheDocument()
    })

    it('should render the CTA button', () => {
      const { getByText } = render(<VerificationPrompt {...defaultProps} />)
      expect(getByText('Complete Verification')).toBeInTheDocument()
    })

    it('should call onVerify when button is pressed', async () => {
      const { container } = render(<VerificationPrompt {...defaultProps} />)
      fireEvent.click(getByTestId(container, 'verification-prompt-button'))
      await vi.waitFor(() => {
        expect(defaultProps.onVerify).toHaveBeenCalled()
      })
    })

    it('should support custom testID', () => {
      const { container } = render(
        <VerificationPrompt {...defaultProps} testID="custom-prompt" />
      )
      expect(getByTestId(container, 'custom-prompt')).toBeInTheDocument()
    })
  })

  describe('compact variant', () => {
    it('should render compact text', () => {
      const { getByText } = render(
        <VerificationPrompt {...defaultProps} variant="compact" />
      )
      expect(getByText('Get verified to build trust')).toBeInTheDocument()
    })

    it('should render compact verify button', () => {
      const { getByText } = render(
        <VerificationPrompt {...defaultProps} variant="compact" />
      )
      expect(getByText('Verify')).toBeInTheDocument()
    })
  })

  describe('CompactVerificationPrompt preset', () => {
    it('should render as compact variant', () => {
      const { getByText } = render(
        <CompactVerificationPrompt onVerify={vi.fn()} />
      )
      expect(getByText('Verify')).toBeInTheDocument()
    })
  })
})
