/**
 * Tests for components/Button.tsx
 *
 * Tests the Button component with variants, sizes, loading, disabled, and icon states.
 */

import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, fireEvent } from '@testing-library/react'
import { Button, PrimaryButton, DangerButton, IconButton } from '../Button'

// Mock haptics
vi.mock('../../lib/haptics', () => ({
  lightFeedback: vi.fn().mockResolvedValue(undefined),
  warningFeedback: vi.fn().mockResolvedValue(undefined),
}))

// Helper to get by testid
const getByTestId = (container: HTMLElement, testId: string) => {
  const element = container.querySelector(`[testid="${testId}"]`)
  if (!element) {
    throw new Error(`Unable to find element with testid="${testId}"`)
  }
  return element
}

const queryByTestId = (container: HTMLElement, testId: string) =>
  container.querySelector(`[testid="${testId}"]`)

describe('Button', () => {
  const mockOnPress = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('rendering', () => {
    it('should render with title text', () => {
      const { getByText } = render(<Button title="Click Me" onPress={mockOnPress} />)
      expect(getByText('Click Me')).toBeInTheDocument()
    })

    it('should render with default testID', () => {
      const { container } = render(<Button title="Test" onPress={mockOnPress} />)
      expect(getByTestId(container, 'button')).toBeInTheDocument()
    })

    it('should render with custom testID', () => {
      const { container } = render(
        <Button title="Test" onPress={mockOnPress} testID="my-button" />
      )
      expect(getByTestId(container, 'my-button')).toBeInTheDocument()
    })
  })

  describe('variants', () => {
    it.each(['primary', 'secondary', 'outline', 'ghost', 'danger'] as const)(
      'should render %s variant',
      (variant) => {
        const { getByText } = render(
          <Button title={`${variant} btn`} onPress={mockOnPress} variant={variant} />
        )
        expect(getByText(`${variant} btn`)).toBeInTheDocument()
      }
    )
  })

  describe('sizes', () => {
    it.each(['small', 'medium', 'large'] as const)(
      'should render %s size',
      (size) => {
        const { getByText } = render(
          <Button title="Sized" onPress={mockOnPress} size={size} />
        )
        expect(getByText('Sized')).toBeInTheDocument()
      }
    )
  })

  describe('interactions', () => {
    it('should call onPress when clicked', async () => {
      const { container } = render(<Button title="Press" onPress={mockOnPress} />)
      fireEvent.click(getByTestId(container, 'button'))
      // handlePress is async (awaits haptic), so flush promises
      await vi.waitFor(() => {
        expect(mockOnPress).toHaveBeenCalledTimes(1)
      })
    })

    it('should not call onPress when disabled', () => {
      const { container } = render(<Button title="Disabled" onPress={mockOnPress} disabled />)
      const btn = getByTestId(container, 'button')
      expect(btn).toHaveAttribute('disabled')
    })
  })

  describe('loading state', () => {
    it('should show loading indicator when loading', () => {
      const { container } = render(<Button title="Load" onPress={mockOnPress} loading />)
      expect(getByTestId(container, 'button-loading')).toBeInTheDocument()
    })

    it('should hide title text when loading', () => {
      const { queryByText } = render(<Button title="Load" onPress={mockOnPress} loading />)
      expect(queryByText('Load')).not.toBeInTheDocument()
    })

    it('should be disabled when loading', () => {
      const { container } = render(<Button title="Load" onPress={mockOnPress} loading />)
      expect(getByTestId(container, 'button')).toHaveAttribute('disabled')
    })
  })

  describe('icons', () => {
    it('should render left icon', () => {
      const { getByText } = render(
        <Button
          title="With Icon"
          onPress={mockOnPress}
          leftIcon={<span>L</span>}
        />
      )
      expect(getByText('L')).toBeInTheDocument()
      expect(getByText('With Icon')).toBeInTheDocument()
    })

    it('should render right icon', () => {
      const { getByText } = render(
        <Button
          title="With Icon"
          onPress={mockOnPress}
          rightIcon={<span>R</span>}
        />
      )
      expect(getByText('R')).toBeInTheDocument()
    })
  })

  describe('haptic feedback', () => {
    it('should trigger light feedback on press', async () => {
      const { lightFeedback } = await import('../../lib/haptics')
      const { container } = render(<Button title="Haptic" onPress={mockOnPress} />)

      fireEvent.click(getByTestId(container, 'button'))

      expect(lightFeedback).toHaveBeenCalled()
    })

    it('should trigger warning feedback for danger variant', async () => {
      const { warningFeedback } = await import('../../lib/haptics')
      const { container } = render(
        <Button title="Delete" onPress={mockOnPress} variant="danger" />
      )

      fireEvent.click(getByTestId(container, 'button'))

      expect(warningFeedback).toHaveBeenCalled()
    })

    it('should skip haptics when hapticDisabled is true', async () => {
      const { lightFeedback } = await import('../../lib/haptics')
      const { container } = render(
        <Button title="No Haptic" onPress={mockOnPress} hapticDisabled />
      )

      fireEvent.click(getByTestId(container, 'button'))

      expect(lightFeedback).not.toHaveBeenCalled()
    })
  })
})

describe('Preset Buttons', () => {
  const mockOnPress = vi.fn()

  it('PrimaryButton should render', () => {
    const { getByText } = render(<PrimaryButton title="Primary" onPress={mockOnPress} />)
    expect(getByText('Primary')).toBeInTheDocument()
  })

  it('DangerButton should render', () => {
    const { getByText } = render(<DangerButton title="Delete" onPress={mockOnPress} />)
    expect(getByText('Delete')).toBeInTheDocument()
  })
})

describe('IconButton', () => {
  it('should render with icon and accessibility label', () => {
    const { container } = render(
      <IconButton
        icon={<span>X</span>}
        onPress={vi.fn()}
        accessibilityLabel="Close"
      />
    )
    expect(getByTestId(container, 'icon-button')).toBeInTheDocument()
  })
})
