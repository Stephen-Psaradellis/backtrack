/**
 * SelfieStep Component
 *
 * First step in the CreatePost wizard flow. Handles capturing the user's
 * selfie for verification purposes or displaying a preview of an already
 * captured selfie with options to retake or proceed.
 *
 * States:
 * - Camera mode: Shows SelfieCamera component for capturing
 * - Preview mode: Shows captured selfie with Retake/Use This Photo actions
 *
 * @example
 * ```tsx
 * <SelfieStep
 *   selfieUri={formData.selfieUri}
 *   onCapture={handleSelfieCapture}
 *   onRetake={handleRetakeSelfie}
 *   onNext={handleNext}
 *   onBack={handleBack}
 * />
 * ```
 */

import React, { memo } from 'react'
import { View, Image, Text, TouchableOpacity, Platform, StatusBar, StyleSheet, Dimensions } from 'react-native'
import Tooltip from 'react-native-walkthrough-tooltip'

import { SelfieCamera } from '../../../components/SelfieCamera'
import { Button, OutlineButton } from '../../../components/Button'
import { useTutorialState } from '../../../hooks/useTutorialState'

// ============================================================================
// TYPES
// ============================================================================

/**
 * Props for the SelfieStep component
 */
export interface SelfieStepProps {
  /**
   * URI of the captured selfie, or null if not yet captured
   */
  selfieUri: string | null

  /**
   * Callback when a photo is captured
   * @param uri - The file URI of the captured photo
   */
  onCapture: (uri: string) => void

  /**
   * Callback when user wants to retake the selfie
   */
  onRetake: () => void

  /**
   * Callback when user confirms the selfie and wants to proceed
   */
  onNext: () => void

  /**
   * Callback when user wants to go back (cancel camera)
   */
  onBack: () => void

  /**
   * Test ID prefix for testing purposes
   * @default 'create-post'
   */
  testID?: string
}

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Screen dimensions for responsive sizing
 */
const SCREEN_WIDTH = Dimensions.get('window').width

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * SelfieStep - Selfie capture step in the CreatePost wizard
 *
 * Displays either:
 * 1. SelfieCamera component for capturing a new selfie
 * 2. Preview of captured selfie with Retake/Use This Photo actions
 */
export const SelfieStep = memo(function SelfieStep({
  selfieUri,
  onCapture,
  onRetake,
  onNext,
  onBack,
  testID = 'create-post',
}: SelfieStepProps): JSX.Element {
  // ---------------------------------------------------------------------------
  // HOOKS
  // ---------------------------------------------------------------------------

  // Tutorial tooltip state for selfie verification onboarding
  const tutorial = useTutorialState('selfie_verification')

  // ---------------------------------------------------------------------------
  // RENDER HELPERS
  // ---------------------------------------------------------------------------

  /**
   * Render tutorial tooltip content for selfie verification onboarding
   */
  const renderTutorialContent = (): React.ReactNode => (
    <View style={tooltipStyles.container}>
      <Text style={tooltipStyles.title}>Verify It's You</Text>
      <Text style={tooltipStyles.description}>
        Take a quick selfie to verify you're real. This helps build trust and keeps our community safe.
        Your selfie is only used for verification.
      </Text>
      <TouchableOpacity
        style={tooltipStyles.button}
        onPress={tutorial.markComplete}
        testID="selfie-tutorial-dismiss-button"
      >
        <Text style={tooltipStyles.buttonText}>Got it</Text>
      </TouchableOpacity>
    </View>
  )

  // ---------------------------------------------------------------------------
  // RENDER: SELFIE PREVIEW
  // ---------------------------------------------------------------------------

  if (selfieUri) {
    return (
      <View style={styles.selfiePreviewContainer} testID={`${testID}-selfie-preview`}>
        <Image
          source={{ uri: selfieUri }}
          style={styles.selfiePreview}
          resizeMode="cover"
          testID={`${testID}-selfie-image`}
        />
        <View style={styles.selfieActions}>
          <OutlineButton
            title="Retake"
            onPress={onRetake}
            testID={`${testID}-retake-selfie`}
          />
          <Button
            title="Use This Photo"
            onPress={onNext}
            testID={`${testID}-use-selfie`}
          />
        </View>
      </View>
    )
  }

  // ---------------------------------------------------------------------------
  // RENDER: CAMERA
  // ---------------------------------------------------------------------------

  return (
    <Tooltip
      isVisible={tutorial.isVisible}
      content={renderTutorialContent()}
      placement="bottom"
      onClose={tutorial.markComplete}
      closeOnChildInteraction={false}
      allowChildInteraction={true}
      topAdjustment={Platform.OS === 'android' ? -(StatusBar.currentHeight ?? 0) : 0}
    >
      <View style={styles.cameraContainer}>
        <SelfieCamera
          onCapture={onCapture}
          onCancel={onBack}
          testID={`${testID}-camera`}
        />
      </View>
    </Tooltip>
  )
})

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  /**
   * Container for camera view to enable tooltip wrapping
   */
  cameraContainer: {
    flex: 1,
  },

  /**
   * Container for selfie preview with dark background
   */
  selfiePreviewContainer: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },

  /**
   * Square selfie preview image
   */
  selfiePreview: {
    width: SCREEN_WIDTH - 80,
    height: SCREEN_WIDTH - 80,
    borderRadius: 16,
    marginBottom: 24,
  },

  /**
   * Row container for action buttons
   */
  selfieActions: {
    flexDirection: 'row',
    gap: 16,
  },
})

/**
 * Styles for tutorial tooltip content
 */
const tooltipStyles = StyleSheet.create({
  container: {
    padding: 16,
    maxWidth: 280,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
    marginBottom: 16,
  },
  button: {
    backgroundColor: '#FF6B47',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
})

// ============================================================================
// EXPORTS
// ============================================================================

export default SelfieStep
