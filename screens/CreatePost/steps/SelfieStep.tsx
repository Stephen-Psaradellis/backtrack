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
import { View, Image, StyleSheet, Dimensions } from 'react-native'

import { SelfieCamera } from '../../../components/SelfieCamera'
import { Button, OutlineButton } from '../../../components/Button'

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
    <SelfieCamera
      onCapture={onCapture}
      onCancel={onBack}
      testID={`${testID}-camera`}
    />
  )
})

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
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

// ============================================================================
// EXPORTS
// ============================================================================

export default SelfieStep
