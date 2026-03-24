/**
 * Tests for components/OnboardingGuard.tsx
 *
 * Tests the OnboardingGuard component that redirects new users to onboarding.
 * This is a Next.js web component using next/navigation.
 */

import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'

// Mock next/navigation
const mockReplace = vi.fn()
const mockPathname = vi.fn(() => '/home')

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mockReplace }),
  usePathname: () => mockPathname(),
}))

// Mock storage utility
const mockIsOnboardingComplete = vi.fn(() => true)
vi.mock('../../utils/storage', () => ({
  isOnboardingComplete: () => mockIsOnboardingComplete(),
}))

import { OnboardingGuard } from '../OnboardingGuard'

describe('OnboardingGuard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPathname.mockReturnValue('/home')
    mockIsOnboardingComplete.mockReturnValue(true)
  })

  describe('completed onboarding', () => {
    it('should render children when onboarding is complete', () => {
      mockIsOnboardingComplete.mockReturnValue(true)

      render(
        <OnboardingGuard>
          <div data-testid="app-content">Main App</div>
        </OnboardingGuard>
      )

      expect(screen.getByTestId('app-content')).toBeInTheDocument()
    })

    it('should not redirect when onboarding is complete', () => {
      mockIsOnboardingComplete.mockReturnValue(true)

      render(
        <OnboardingGuard>
          <div>Main App</div>
        </OnboardingGuard>
      )

      expect(mockReplace).not.toHaveBeenCalled()
    })
  })

  describe('incomplete onboarding', () => {
    it('should redirect to /onboarding when not complete', () => {
      mockIsOnboardingComplete.mockReturnValue(false)

      render(
        <OnboardingGuard>
          <div>Main App</div>
        </OnboardingGuard>
      )

      expect(mockReplace).toHaveBeenCalledWith('/onboarding')
    })

    it('should show default loading state while redirecting', () => {
      mockIsOnboardingComplete.mockReturnValue(false)

      const { container } = render(
        <OnboardingGuard>
          <div data-testid="app-content">Main App</div>
        </OnboardingGuard>
      )

      expect(container.textContent).toContain('Loading...')
      expect(screen.queryByTestId('app-content')).not.toBeInTheDocument()
    })

    it('should show custom fallback while redirecting', () => {
      mockIsOnboardingComplete.mockReturnValue(false)

      render(
        <OnboardingGuard fallback={<div data-testid="custom-loader">Please wait</div>}>
          <div>Main App</div>
        </OnboardingGuard>
      )

      expect(screen.getByTestId('custom-loader')).toBeInTheDocument()
    })
  })

  describe('excluded paths', () => {
    it('should render children on /onboarding path without checking', () => {
      mockPathname.mockReturnValue('/onboarding')
      mockIsOnboardingComplete.mockReturnValue(false)

      render(
        <OnboardingGuard>
          <div data-testid="onboarding-content">Onboarding</div>
        </OnboardingGuard>
      )

      expect(screen.getByTestId('onboarding-content')).toBeInTheDocument()
      expect(mockReplace).not.toHaveBeenCalled()
    })

    it('should render children on /onboarding sub-paths', () => {
      mockPathname.mockReturnValue('/onboarding/step-2')
      mockIsOnboardingComplete.mockReturnValue(false)

      render(
        <OnboardingGuard>
          <div data-testid="onboarding-step">Step 2</div>
        </OnboardingGuard>
      )

      expect(screen.getByTestId('onboarding-step')).toBeInTheDocument()
    })
  })
})
