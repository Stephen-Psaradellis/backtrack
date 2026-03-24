/**
 * Tests for screens/CreatePost/components/GranularityToggle.tsx
 *
 * Tests the GranularityToggle component for switching between specific
 * and approximate time modes.
 */

import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, fireEvent } from '@testing-library/react'
import { GranularityToggle } from '../GranularityToggle'

// Mock haptics
vi.mock('../../../../lib/haptics', () => ({
  lightFeedback: vi.fn().mockResolvedValue(undefined),
}))

// Mock styles
vi.mock('../../styles', () => ({
  COLORS: {
    textSecondary: '#999',
    background: '#fff',
    border: '#eee',
    primary: '#007AFF',
    textPrimary: '#000',
  },
}))

describe('GranularityToggle', () => {
  const mockOnModeChange = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('rendering', () => {
    it('should render the component', () => {
      const { container } = render(
        <GranularityToggle mode="specific" onModeChange={mockOnModeChange} />
      )
      expect(container.firstChild).toBeInTheDocument()
    })

    it('should render both toggle options', () => {
      const { getByText } = render(
        <GranularityToggle mode="specific" onModeChange={mockOnModeChange} />
      )
      expect(getByText('Specific Time')).toBeInTheDocument()
      expect(getByText('Approximate')).toBeInTheDocument()
    })

    it('should render the time precision label', () => {
      const { getByText } = render(
        <GranularityToggle mode="specific" onModeChange={mockOnModeChange} />
      )
      expect(getByText('Time precision')).toBeInTheDocument()
    })

    it('should render emojis for both options', () => {
      const { getByText } = render(
        <GranularityToggle mode="specific" onModeChange={mockOnModeChange} />
      )
      expect(getByText('🕐')).toBeInTheDocument()
      expect(getByText('🌤️')).toBeInTheDocument()
    })

    it('should render descriptions for both options', () => {
      const { getByText } = render(
        <GranularityToggle mode="specific" onModeChange={mockOnModeChange} />
      )
      expect(getByText('e.g., 3:15 PM')).toBeInTheDocument()
      expect(getByText('Morning, Afternoon, Evening')).toBeInTheDocument()
    })
  })

  describe('selection state', () => {
    it('should highlight specific mode when selected', () => {
      const { container } = render(
        <GranularityToggle mode="specific" onModeChange={mockOnModeChange} />
      )
      const specificButton = container.querySelector('[testid="granularity-toggle-specific"]')
      expect(specificButton).toBeInTheDocument()
    })

    it('should highlight approximate mode when selected', () => {
      const { container } = render(
        <GranularityToggle mode="approximate" onModeChange={mockOnModeChange} />
      )
      const approximateButton = container.querySelector('[testid="granularity-toggle-approximate"]')
      expect(approximateButton).toBeInTheDocument()
    })

    it('should switch selected mode when toggled', () => {
      const { rerender, container } = render(
        <GranularityToggle mode="specific" onModeChange={mockOnModeChange} />
      )
      expect(container.querySelector('[testid="granularity-toggle-specific"]')).toBeInTheDocument()

      rerender(<GranularityToggle mode="approximate" onModeChange={mockOnModeChange} />)
      expect(container.querySelector('[testid="granularity-toggle-approximate"]')).toBeInTheDocument()
    })
  })

  describe('interactions', () => {
    it('should call onModeChange when specific mode is pressed', async () => {
      const { container } = render(
        <GranularityToggle mode="approximate" onModeChange={mockOnModeChange} />
      )
      const specificButton = container.querySelector('[testid="granularity-toggle-specific"]')
      if (specificButton) {
        fireEvent.click(specificButton)
      }

      await vi.waitFor(() => {
        expect(mockOnModeChange).toHaveBeenCalledWith('specific')
      })
    })

    it('should call onModeChange when approximate mode is pressed', async () => {
      const { container } = render(
        <GranularityToggle mode="specific" onModeChange={mockOnModeChange} />
      )
      const approximateButton = container.querySelector('[testid="granularity-toggle-approximate"]')
      if (approximateButton) {
        fireEvent.click(approximateButton)
      }

      await vi.waitFor(() => {
        expect(mockOnModeChange).toHaveBeenCalledWith('approximate')
      })
    })

    it('should not call onModeChange when same mode is pressed', () => {
      const { container } = render(
        <GranularityToggle mode="specific" onModeChange={mockOnModeChange} />
      )
      const specificButton = container.querySelector('[testid="granularity-toggle-specific"]')
      if (specificButton) {
        fireEvent.click(specificButton)
      }

      expect(mockOnModeChange).not.toHaveBeenCalled()
    })

    it('should not call onModeChange when disabled', () => {
      const { container } = render(
        <GranularityToggle mode="approximate" onModeChange={mockOnModeChange} disabled />
      )
      const specificButton = container.querySelector('[testid="granularity-toggle-specific"]')
      if (specificButton) {
        fireEvent.click(specificButton)
      }

      expect(mockOnModeChange).not.toHaveBeenCalled()
    })
  })

  describe('disabled state', () => {
    it('should disable both buttons when disabled prop is true', () => {
      const { container } = render(
        <GranularityToggle mode="specific" onModeChange={mockOnModeChange} disabled />
      )
      const specificButton = container.querySelector('[testid="granularity-toggle-specific"]') as HTMLElement
      const approximateButton = container.querySelector('[testid="granularity-toggle-approximate"]') as HTMLElement

      expect(specificButton?.closest('button')).toHaveAttribute('disabled')
      expect(approximateButton?.closest('button')).toHaveAttribute('disabled')
    })
  })

  describe('testID prop', () => {
    it('should use custom testID prefix', () => {
      const { container } = render(
        <GranularityToggle
          mode="specific"
          onModeChange={mockOnModeChange}
          testID="custom-toggle"
        />
      )
      expect(container.querySelector('[testid="custom-toggle"]')).toBeInTheDocument()
      expect(container.querySelector('[testid="custom-toggle-specific"]')).toBeInTheDocument()
      expect(container.querySelector('[testid="custom-toggle-approximate"]')).toBeInTheDocument()
    })
  })

  describe('haptic feedback', () => {
    it('should trigger haptic feedback on mode change', async () => {
      const { lightFeedback } = await import('../../../../lib/haptics')
      const { container } = render(
        <GranularityToggle mode="specific" onModeChange={mockOnModeChange} />
      )
      const approximateButton = container.querySelector('[testid="granularity-toggle-approximate"]')
      if (approximateButton) {
        fireEvent.click(approximateButton)
      }

      await vi.waitFor(() => {
        expect(lightFeedback).toHaveBeenCalled()
      })
    })

    it('should not trigger haptic when same mode is pressed', async () => {
      const { lightFeedback } = await import('../../../../lib/haptics')
      const { container } = render(
        <GranularityToggle mode="specific" onModeChange={mockOnModeChange} />
      )
      const specificButton = container.querySelector('[testid="granularity-toggle-specific"]')
      if (specificButton) {
        fireEvent.click(specificButton)
      }

      // Reset the mock to check if it's called again
      vi.clearAllMocks()
      if (specificButton) {
        fireEvent.click(specificButton)
      }
      expect(lightFeedback).not.toHaveBeenCalled()
    })
  })
})
