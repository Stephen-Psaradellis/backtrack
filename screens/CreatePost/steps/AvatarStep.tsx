/**
 * AvatarStep Component
 *
 * Second step in the CreatePost wizard flow. Allows the user to build an
 * avatar describing the person they saw. This is a thin wrapper around
 * the AvatarBuilder component with appropriate labels for the wizard context.
 *
 * @example
 * ```tsx
 * <AvatarStep
 *   avatarConfig={formData.targetAvatar}
 *   onChange={handleAvatarChange}
 *   onSave={handleAvatarSave}
 *   onBack={handleBack}
 * />
 * ```
 */

import React, { memo } from 'react'

import { AvatarBuilder } from '../../../components/AvatarBuilder'
import type { AvatarConfig } from '../../../types/avatar'

// ============================================================================
// TYPES
// ============================================================================

/**
 * Props for the AvatarStep component
 */
export interface AvatarStepProps {
  /**
   * Current avatar configuration
   */
  avatarConfig: AvatarConfig

  /**
   * Callback fired when any avatar attribute changes
   * @param config - The updated avatar configuration
   */
  onChange: (config: AvatarConfig) => void

  /**
   * Callback fired when user saves the avatar and wants to proceed
   * @param config - The final avatar configuration
   */
  onSave: (config: AvatarConfig) => void

  /**
   * Callback when user wants to go back to previous step
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
 * AvatarStep - Avatar building step in the CreatePost wizard
 *
 * Wraps AvatarBuilder with wizard-appropriate labels:
 * - Save button shows "Next" instead of "Save Avatar"
 * - Cancel button shows "Back" instead of "Cancel"
 */
export const AvatarStep = memo(function AvatarStep({
  avatarConfig,
  onChange,
  onSave,
  onBack,
  testID = 'create-post',
}: AvatarStepProps): JSX.Element {
  return (
    <AvatarBuilder
      initialConfig={avatarConfig}
      onChange={onChange}
      onSave={onSave}
      onCancel={onBack}
      saveLabel="Next"
      cancelLabel="Back"
      testID={`${testID}-avatar`}
    />
  )
})

// ============================================================================
// EXPORTS
// ============================================================================

export default AvatarStep
