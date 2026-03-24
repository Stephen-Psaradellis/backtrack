/**
 * Tests for components/VerifiedBadge.tsx
 */

import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import { VerifiedBadge } from '../VerifiedBadge'

vi.mock('react-native-svg', () => ({
  SvgXml: 'SvgXml',
}))

const getByTestId = (container: HTMLElement, testId: string) => {
  const element = container.querySelector(`[testid="${testId}"]`)
  if (!element) {
    throw new Error(`Unable to find element with testid="${testId}"\n\n${container.innerHTML}`)
  }
  return element
}

describe('VerifiedBadge', () => {
  it('should render without crashing', () => {
    const { container } = render(<VerifiedBadge />)
    expect(getByTestId(container, 'verified-badge')).toBeInTheDocument()
  })

  it('should render with custom testID', () => {
    const { container } = render(<VerifiedBadge testID="custom-badge" />)
    expect(getByTestId(container, 'custom-badge')).toBeInTheDocument()
  })

  it('should have accessibility label', () => {
    const { container } = render(<VerifiedBadge />)
    const el = container.querySelector('[accessibilitylabel="Verified user"]')
    expect(el).toBeInTheDocument()
  })

  describe('sizes', () => {
    it('should render with sm size', () => {
      const { container } = render(<VerifiedBadge size="sm" />)
      expect(getByTestId(container, 'verified-badge')).toBeInTheDocument()
    })

    it('should render with md size (default)', () => {
      const { container } = render(<VerifiedBadge />)
      expect(getByTestId(container, 'verified-badge')).toBeInTheDocument()
    })

    it('should render with lg size', () => {
      const { container } = render(<VerifiedBadge size="lg" />)
      expect(getByTestId(container, 'verified-badge')).toBeInTheDocument()
    })
  })
})
