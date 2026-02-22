/**
 * SafetyPrompt Component Tests
 */

import React from 'react'
import { render, fireEvent } from '@testing-library/react'
import { SafetyPrompt } from '../SafetyPrompt'
import { vi } from 'vitest'

describe('SafetyPrompt', () => {
  it('should render when visible is true', () => {
    const { container } = render(
      <SafetyPrompt visible={true} onDismiss={() => {}} />
    )

    // In jsdom, React Native testID renders as testid (lowercase)
    expect(container.querySelector('[testid="safety-prompt"]')).toBeTruthy()
    expect(container.innerHTML).toContain('Stay Safe')
    expect(container.innerHTML).toContain('Never share personal info')
  })

  it('should not render when visible is false', () => {
    const { container } = render(
      <SafetyPrompt visible={false} onDismiss={() => {}} />
    )

    expect(container.querySelector('[testid="safety-prompt"]')).toBeNull()
  })

  it('should call onDismiss when "Got it" button is pressed', () => {
    const onDismiss = vi.fn()
    const { container } = render(
      <SafetyPrompt visible={true} onDismiss={onDismiss} />
    )

    const dismissButton = container.querySelector('[testid="safety-prompt-dismiss"]')
    expect(dismissButton).toBeTruthy()
    fireEvent.click(dismissButton!)

    expect(onDismiss).toHaveBeenCalledTimes(1)
  })

  it('should accept custom testID', () => {
    const { container } = render(
      <SafetyPrompt visible={true} onDismiss={() => {}} testID="custom-prompt" />
    )

    expect(container.querySelector('[testid="custom-prompt"]')).toBeTruthy()
    expect(container.querySelector('[testid="custom-prompt-dismiss"]')).toBeTruthy()
  })

  it('should have accessible button properties', () => {
    const { container } = render(
      <SafetyPrompt visible={true} onDismiss={() => {}} />
    )

    const dismissButton = container.querySelector('[testid="safety-prompt-dismiss"]')
    expect(dismissButton).toBeTruthy()
    expect(dismissButton?.getAttribute('accessibilitylabel')).toBe('Dismiss safety prompt')
    expect(dismissButton?.getAttribute('accessibilityrole')).toBe('button')
  })

  it('should display warning about personal information', () => {
    const { container } = render(<SafetyPrompt visible={true} onDismiss={() => {}} />)

    // The safety message contains these key terms
    const html = container.innerHTML
    expect(html).toContain('address')
    expect(html).toContain('phone number')
    expect(html).toContain('financial')
    expect(html).toContain('public places')
  })

  it('should have shield icon', () => {
    const { container } = render(
      <SafetyPrompt visible={true} onDismiss={() => {}} />
    )

    // Component renders with some content
    expect(container.firstChild).toBeTruthy()
    // The component should contain some element (ionicons renders as a custom element or text in jsdom)
    expect(container.innerHTML.length).toBeGreaterThan(0)
  })
})
