import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, fireEvent } from '@testing-library/react'

vi.mock('../../../lib/onboarding/onboardingConfig', () => ({
  ONBOARDING_STEPS: [
    { id: 'welcome', title: 'Welcome', icon: '1' },
    { id: 'avatar', title: 'Avatar', icon: '2' },
    { id: 'location', title: 'Location', icon: '3' },
  ],
  TOTAL_ONBOARDING_STEPS: 3,
  calculateProgress: (step: number) => Math.round((step / 3) * 100),
  formatEstimatedTime: (seconds: number) => `${seconds}s`,
  calculateRemainingTime: (step: number) => (3 - step) * 20,
}))

import { OnboardingStepper } from '../OnboardingStepper'

describe('OnboardingStepper', () => {
  it('renders step indicators', () => {
    const { container } = render(<OnboardingStepper currentStep={0} />)
    const buttons = container.querySelectorAll('button')
    expect(buttons.length).toBe(3)
  })

  it('shows current step number', () => {
    const { getByText } = render(<OnboardingStepper currentStep={1} />)
    expect(getByText('Step 2 of 3')).toBeInTheDocument()
  })

  it('renders progress bar', () => {
    const { container } = render(<OnboardingStepper currentStep={1} />)
    const progressbar = container.querySelector('[role="progressbar"]')
    expect(progressbar).toBeInTheDocument()
    expect(progressbar?.getAttribute('aria-valuenow')).toBe('33')
  })

  it('shows time estimate when enabled', () => {
    const { getByText } = render(<OnboardingStepper currentStep={0} showTimeEstimate />)
    expect(getByText(/remaining/)).toBeInTheDocument()
  })

  it('does not show time estimate by default', () => {
    const { queryByText } = render(<OnboardingStepper currentStep={0} />)
    expect(queryByText(/remaining/)).not.toBeInTheDocument()
  })

  it('shows labels when enabled', () => {
    const { getByText } = render(<OnboardingStepper currentStep={0} showLabels />)
    expect(getByText(/Welcome/)).toBeInTheDocument()
  })

  it('calls onStepClick for completed steps', () => {
    const onStepClick = vi.fn()
    const { container } = render(<OnboardingStepper currentStep={2} onStepClick={onStepClick} />)
    const buttons = container.querySelectorAll('button')
    // First button (step 0) is completed, should be clickable
    fireEvent.click(buttons[0])
    expect(onStepClick).toHaveBeenCalledWith(0)
  })

  it('applies custom className', () => {
    const { container } = render(<OnboardingStepper currentStep={0} className="custom-class" />)
    const nav = container.querySelector('nav')
    expect(nav?.className).toContain('custom-class')
  })

  it('has proper navigation role', () => {
    const { container } = render(<OnboardingStepper currentStep={0} />)
    const nav = container.querySelector('nav')
    expect(nav).toBeInTheDocument()
    expect(nav?.getAttribute('aria-label')).toBe('Onboarding progress')
  })
})
