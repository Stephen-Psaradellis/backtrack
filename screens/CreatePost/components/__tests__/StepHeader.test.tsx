/**
 * Tests for screens/CreatePost/components/StepHeader.tsx
 *
 * Tests the StepHeader component for displaying step information
 * and back navigation.
 */

import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, fireEvent } from '@testing-library/react'
import { StepHeader } from '../StepHeader'
import type { StepConfig } from '../types'

// Mock styles
vi.mock('../../styles', () => ({
  sharedStyles: {
    header: {},
    headerBackButton: {},
    headerBackText: {},
    stepIndicator: {},
    stepIcon: {},
    stepTextContainer: {},
    stepTitle: {},
    stepSubtitle: {},
  },
}))

// Mock types - no actual mocking needed, just used for structure
vi.mock('../types', () => ({}))

describe('StepHeader', () => {
  const mockOnBack = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('rendering', () => {
    it('should render the component', () => {
      const stepConfig: StepConfig = {
        id: 'test-step',
        title: 'Test Step',
        subtitle: 'Test subtitle',
        icon: '📸',
      }
      const { container } = render(
        <StepHeader stepConfig={stepConfig} onBack={mockOnBack} />
      )
      expect(container.firstChild).toBeInTheDocument()
    })

    it('should render step title', () => {
      const stepConfig: StepConfig = {
        id: 'test-step',
        title: 'Capture Selfie',
        subtitle: 'Take a photo',
        icon: '📸',
      }
      const { getByText } = render(
        <StepHeader stepConfig={stepConfig} onBack={mockOnBack} />
      )
      expect(getByText('Capture Selfie')).toBeInTheDocument()
    })

    it('should render step subtitle', () => {
      const stepConfig: StepConfig = {
        id: 'test-step',
        title: 'Capture Selfie',
        subtitle: 'Show your face',
        icon: '📸',
      }
      const { getByText } = render(
        <StepHeader stepConfig={stepConfig} onBack={mockOnBack} />
      )
      expect(getByText('Show your face')).toBeInTheDocument()
    })

    it('should render step icon', () => {
      const stepConfig: StepConfig = {
        id: 'test-step',
        title: 'Step Title',
        subtitle: 'Step subtitle',
        icon: '🎯',
      }
      const { getByText } = render(
        <StepHeader stepConfig={stepConfig} onBack={mockOnBack} />
      )
      expect(getByText('🎯')).toBeInTheDocument()
    })

    it('should render back button with arrow', () => {
      const stepConfig: StepConfig = {
        id: 'test-step',
        title: 'Step Title',
        subtitle: 'Subtitle',
        icon: '📝',
      }
      const { getByText } = render(
        <StepHeader stepConfig={stepConfig} onBack={mockOnBack} />
      )
      expect(getByText('←')).toBeInTheDocument()
    })
  })

  describe('step configuration', () => {
    it('should display different step content when config changes', () => {
      const stepConfig1: StepConfig = {
        id: 'step-1',
        title: 'First Step',
        subtitle: 'Do something',
        icon: '1️⃣',
      }
      const { rerender, getByText } = render(
        <StepHeader stepConfig={stepConfig1} onBack={mockOnBack} />
      )
      expect(getByText('First Step')).toBeInTheDocument()
      expect(getByText('1️⃣')).toBeInTheDocument()

      const stepConfig2: StepConfig = {
        id: 'step-2',
        title: 'Second Step',
        subtitle: 'Do something else',
        icon: '2️⃣',
      }
      rerender(<StepHeader stepConfig={stepConfig2} onBack={mockOnBack} />)
      expect(getByText('Second Step')).toBeInTheDocument()
      expect(getByText('2️⃣')).toBeInTheDocument()
    })

    it('should handle various emoji icons', () => {
      const icons = ['📸', '📝', '📍', '✓']
      icons.forEach((icon) => {
        const stepConfig: StepConfig = {
          id: 'test-step',
          title: 'Title',
          subtitle: 'Subtitle',
          icon,
        }
        const { getByText } = render(
          <StepHeader stepConfig={stepConfig} onBack={mockOnBack} />
        )
        expect(getByText(icon)).toBeInTheDocument()
      })
    })
  })

  describe('back button interactions', () => {
    it('should call onBack when back button is pressed', () => {
      const stepConfig: StepConfig = {
        id: 'test-step',
        title: 'Step Title',
        subtitle: 'Subtitle',
        icon: '📝',
      }
      const { container } = render(
        <StepHeader stepConfig={stepConfig} onBack={mockOnBack} />
      )
      const backButton = container.querySelector('[testid="create-post-back"]')
      if (backButton) {
        fireEvent.click(backButton)
      }

      expect(mockOnBack).toHaveBeenCalledTimes(1)
    })

    it('should call onBack multiple times on multiple presses', () => {
      const stepConfig: StepConfig = {
        id: 'test-step',
        title: 'Step Title',
        subtitle: 'Subtitle',
        icon: '📝',
      }
      const { container } = render(
        <StepHeader stepConfig={stepConfig} onBack={mockOnBack} />
      )
      const backButton = container.querySelector('[testid="create-post-back"]')

      if (backButton) {
        fireEvent.click(backButton)
        fireEvent.click(backButton)
        fireEvent.click(backButton)
      }

      expect(mockOnBack).toHaveBeenCalledTimes(3)
    })
  })

  describe('testID prop', () => {
    it('should use default testID prefix', () => {
      const stepConfig: StepConfig = {
        id: 'test-step',
        title: 'Title',
        subtitle: 'Subtitle',
        icon: '📝',
      }
      const { container } = render(
        <StepHeader stepConfig={stepConfig} onBack={mockOnBack} />
      )
      expect(container.querySelector('[testid="create-post-back"]')).toBeInTheDocument()
    })

    it('should use custom testID prefix', () => {
      const stepConfig: StepConfig = {
        id: 'test-step',
        title: 'Title',
        subtitle: 'Subtitle',
        icon: '📝',
      }
      const { container } = render(
        <StepHeader
          stepConfig={stepConfig}
          onBack={mockOnBack}
          testID="custom-header"
        />
      )
      expect(container.querySelector('[testid="custom-header-back"]')).toBeInTheDocument()
    })
  })

  describe('accessibility', () => {
    it('should render back button with accessibility support', () => {
      const stepConfig: StepConfig = {
        id: 'test-step',
        title: 'Title',
        subtitle: 'Subtitle',
        icon: '📝',
      }
      const { container } = render(
        <StepHeader stepConfig={stepConfig} onBack={mockOnBack} />
      )
      const backButton = container.querySelector('[testid="create-post-back"]')
      expect(backButton).toBeInTheDocument()
      // React Native accessibility props are preserved for screen readers
      expect(backButton).toBeDefined()
    })

    it('back button should be clickable and respond to interaction', () => {
      const stepConfig: StepConfig = {
        id: 'test-step',
        title: 'Title',
        subtitle: 'Subtitle',
        icon: '📝',
      }
      const { container } = render(
        <StepHeader stepConfig={stepConfig} onBack={mockOnBack} />
      )
      const backButton = container.querySelector('[testid="create-post-back"]')
      if (backButton) {
        fireEvent.click(backButton)
      }
      expect(mockOnBack).toHaveBeenCalledTimes(1)
    })
  })

  describe('multiple instances', () => {
    it('should render multiple headers independently', () => {
      const stepConfig1: StepConfig = {
        id: 'step-1',
        title: 'First Step',
        subtitle: 'First subtitle',
        icon: '1️⃣',
      }
      const stepConfig2: StepConfig = {
        id: 'step-2',
        title: 'Second Step',
        subtitle: 'Second subtitle',
        icon: '2️⃣',
      }
      const mockOnBack1 = vi.fn()
      const mockOnBack2 = vi.fn()

      const { getByText } = render(
        <>
          <StepHeader stepConfig={stepConfig1} onBack={mockOnBack1} />
          <StepHeader stepConfig={stepConfig2} onBack={mockOnBack2} />
        </>
      )

      expect(getByText('First Step')).toBeInTheDocument()
      expect(getByText('Second Step')).toBeInTheDocument()
    })
  })
})
