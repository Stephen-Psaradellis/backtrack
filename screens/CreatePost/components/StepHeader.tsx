/**
 * StepHeader Component
 *
 * Header component for the CreatePost wizard flow displaying:
 * - Back button for navigation
 * - Step indicator with icon, title, and subtitle
 *
 * Used at the top of standard steps (selfie preview, note, location, review)
 * to provide consistent navigation and step context.
 *
 * @example
 * ```tsx
 * <StepHeader
 *   stepConfig={currentStepConfig}
 *   onBack={handleBack}
 *   testID="create-post"
 * />
 * ```
 */

import React, { memo } from 'react'
import { View, Text, TouchableOpacity } from 'react-native'

import { sharedStyles } from '../styles'
import type { StepConfig } from '../types'

// ============================================================================
// TYPES
// ============================================================================

/**
 * Props for the StepHeader component
 */
export interface StepHeaderProps {
  /**
   * Configuration for the current step
   * Includes id, title, subtitle, and icon
   */
  stepConfig: StepConfig

  /**
   * Callback when back button is pressed
   * Should handle navigation to previous step or exit confirmation
   */
  onBack: () => void

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
 * StepHeader - Header with back button and step indicator
 *
 * Displays the current step's icon, title, and subtitle alongside
 * a back button for navigation. Uses shared styles for consistent
 * appearance across the wizard flow.
 */
export const StepHeader = memo(function StepHeader({
  stepConfig,
  onBack,
  testID = 'create-post',
}: StepHeaderProps): JSX.Element {
  return (
    <View style={sharedStyles.header}>
      {/* Back button */}
      <TouchableOpacity
        style={sharedStyles.headerBackButton}
        onPress={onBack}
        testID={`${testID}-back`}
        accessibilityLabel="Go back"
        accessibilityRole="button"
      >
        <Text style={sharedStyles.headerBackText}>←</Text>
      </TouchableOpacity>

      {/* Step indicator */}
      <View style={sharedStyles.stepIndicator}>
        <Text style={sharedStyles.stepIcon}>{stepConfig.icon}</Text>
        <View style={sharedStyles.stepTextContainer}>
          <Text style={sharedStyles.stepTitle}>{stepConfig.title}</Text>
          <Text style={sharedStyles.stepSubtitle}>{stepConfig.subtitle}</Text>
        </View>
      </View>
    </View>
  )
})

// ============================================================================
// EXPORTS
// ============================================================================

export default StepHeader
