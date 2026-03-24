/**
 * Tests for screens/CreatePost/components/ProgressBar.tsx
 *
 * Tests the ProgressBar component for showing animated progress
 * and step indicators.
 */

import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import { Animated } from 'react-native'
import { ProgressBar } from '../ProgressBar'

// Mock styles
vi.mock('../../styles', () => ({
  sharedStyles: {
    progressContainer: {},
    progressTrack: {},
    progressFill: {},
    progressText: {},
  },
}))

describe('ProgressBar', () => {
  describe('rendering', () => {
    it('should render the component', () => {
      const progressAnim = new Animated.Value(0.5)
      const { container } = render(
        <ProgressBar progressAnim={progressAnim} currentStep={2} totalSteps={5} />
      )
      expect(container.firstChild).toBeInTheDocument()
    })

    it('should render progress container', () => {
      const progressAnim = new Animated.Value(0.5)
      const { container } = render(
        <ProgressBar progressAnim={progressAnim} currentStep={2} totalSteps={5} />
      )
      expect(container.querySelector('[testid="create-post-progress"]')).toBeInTheDocument()
    })
  })

  describe('step text display', () => {
    it('should display correct step text', () => {
      const progressAnim = new Animated.Value(0.5)
      const { getByText } = render(
        <ProgressBar progressAnim={progressAnim} currentStep={2} totalSteps={5} />
      )
      expect(getByText('Step 2 of 5')).toBeInTheDocument()
    })

    it('should update step text when currentStep changes', () => {
      const progressAnim = new Animated.Value(0.5)
      const { rerender, getByText } = render(
        <ProgressBar progressAnim={progressAnim} currentStep={1} totalSteps={5} />
      )
      expect(getByText('Step 1 of 5')).toBeInTheDocument()

      rerender(<ProgressBar progressAnim={progressAnim} currentStep={3} totalSteps={5} />)
      expect(getByText('Step 3 of 5')).toBeInTheDocument()
    })

    it('should handle single step', () => {
      const progressAnim = new Animated.Value(1)
      const { getByText } = render(
        <ProgressBar progressAnim={progressAnim} currentStep={1} totalSteps={1} />
      )
      expect(getByText('Step 1 of 1')).toBeInTheDocument()
    })

    it('should handle large step numbers', () => {
      const progressAnim = new Animated.Value(0.8)
      const { getByText } = render(
        <ProgressBar progressAnim={progressAnim} currentStep={8} totalSteps={10} />
      )
      expect(getByText('Step 8 of 10')).toBeInTheDocument()
    })
  })

  describe('progress animation', () => {
    it('should accept animated value', () => {
      const progressAnim = new Animated.Value(0.3)
      const { container } = render(
        <ProgressBar progressAnim={progressAnim} currentStep={1} totalSteps={5} />
      )
      expect(container.firstChild).toBeInTheDocument()
    })

    it('should handle zero progress', () => {
      const progressAnim = new Animated.Value(0)
      const { container } = render(
        <ProgressBar progressAnim={progressAnim} currentStep={1} totalSteps={5} />
      )
      expect(container.firstChild).toBeInTheDocument()
    })

    it('should handle full progress', () => {
      const progressAnim = new Animated.Value(1)
      const { container } = render(
        <ProgressBar progressAnim={progressAnim} currentStep={5} totalSteps={5} />
      )
      expect(container.firstChild).toBeInTheDocument()
    })
  })

  describe('testID prop', () => {
    it('should use default testID', () => {
      const progressAnim = new Animated.Value(0.5)
      const { container } = render(
        <ProgressBar progressAnim={progressAnim} currentStep={2} totalSteps={5} />
      )
      expect(container.querySelector('[testid="create-post-progress"]')).toBeInTheDocument()
    })

    it('should use custom testID prefix', () => {
      const progressAnim = new Animated.Value(0.5)
      const { container } = render(
        <ProgressBar
          progressAnim={progressAnim}
          currentStep={2}
          totalSteps={5}
          testID="custom-progress"
        />
      )
      expect(container.querySelector('[testid="custom-progress-progress"]')).toBeInTheDocument()
    })
  })

  describe('multiple instances', () => {
    it('should render multiple progress bars independently', () => {
      const progressAnim1 = new Animated.Value(0.3)
      const progressAnim2 = new Animated.Value(0.7)

      const { getByText } = render(
        <>
          <ProgressBar progressAnim={progressAnim1} currentStep={1} totalSteps={5} />
          <ProgressBar progressAnim={progressAnim2} currentStep={4} totalSteps={5} />
        </>
      )

      expect(getByText('Step 1 of 5')).toBeInTheDocument()
      expect(getByText('Step 4 of 5')).toBeInTheDocument()
    })
  })
})
