/**
 * ProgressBar Component
 *
 * Animated progress bar for the CreatePost wizard flow displaying:
 * - Visual progress fill with spring animation
 * - Step counter text (e.g., "Step 2 of 5")
 *
 * Used below the StepHeader to show wizard completion progress.
 * Receives an Animated.Value for smooth spring transitions between steps.
 *
 * @example
 * ```tsx
 * <ProgressBar
 *   progressAnim={progressAnimValue}
 *   currentStep={2}
 *   totalSteps={5}
 * />
 * ```
 */

import React, { memo } from 'react'
import { View, Text, Animated } from 'react-native'

import { sharedStyles } from '../styles'

// ============================================================================
// TYPES
// ============================================================================

/**
 * Props for the ProgressBar component
 */
export interface ProgressBarProps {
  /**
   * Animated value representing progress (0 to 1)
   * Should be animated using Animated.spring for smooth transitions
   */
  progressAnim: Animated.Value

  /**
   * Current step number (1-indexed for display)
   * Used in the step counter text
   */
  currentStep: number

  /**
   * Total number of steps in the wizard
   * Used in the step counter text
   */
  totalSteps: number

  /**
   * Test ID prefix for testing purposes
   * @default 'create-post'
   */
  testID?: string
}

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * ProgressBar - Animated progress indicator with step counter
 *
 * Displays a visual progress bar that animates smoothly between steps
 * using spring physics. Shows "Step X of Y" text below the bar.
 * Uses shared styles for consistent appearance across the wizard flow.
 */
export const ProgressBar = memo(function ProgressBar({
  progressAnim,
  currentStep,
  totalSteps,
  testID = 'create-post',
}: ProgressBarProps): JSX.Element {
  return (
    <View style={sharedStyles.progressContainer} testID={`${testID}-progress`}>
      <View style={sharedStyles.progressTrack}>
        <Animated.View
          style={[
            sharedStyles.progressFill,
            {
              width: progressAnim.interpolate({
                inputRange: [0, 1],
                outputRange: ['0%', '100%'],
              }),
            },
          ]}
        />
      </View>
      <Text style={sharedStyles.progressText}>
        Step {currentStep} of {totalSteps}
      </Text>
    </View>
  )
})

// ============================================================================
// EXPORTS
// ============================================================================

export default ProgressBar
