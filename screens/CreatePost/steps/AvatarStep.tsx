/**
 * AvatarStep Component
 *
 * Step in the CreatePost wizard flow. Allows the user to build an
 * avatar describing the person they saw using the 2D avatar creator.
 *
 * @example
 * ```tsx
 * <AvatarStep
 *   avatar={formData.targetAvatar}
 *   onSave={handleAvatarSave}
 *   onBack={handleBack}
 * />
 * ```
 */

import React, { memo, useCallback } from 'react'

import { Avatar2DCreator } from '../../../components/avatar2d'
import type { StoredAvatar2D } from '../../../components/avatar2d/types'

// ============================================================================
// TYPES
// ============================================================================

/**
 * Props for the AvatarStep component
 */
export interface AvatarStepProps {
  /**
   * Current avatar (if already created)
   */
  avatar: StoredAvatar2D | null

  /**
   * Callback fired when user saves the avatar and wants to proceed
   * @param avatar - The created avatar
   */
  onSave: (avatar: StoredAvatar2D) => void

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
 * Embeds the 2D avatar creator to let users describe
 * the person they saw. When the avatar is created, it advances to
 * the next step.
 */
export const AvatarStep = memo(function AvatarStep({
  avatar,
  onSave,
  onBack,
  testID = 'create-post',
}: AvatarStepProps): JSX.Element {
  /**
   * Handle avatar creation complete
   */
  const handleComplete = useCallback(
    (createdAvatar: StoredAvatar2D) => {
      onSave(createdAvatar)
    },
    [onSave]
  )

  return (
    <Avatar2DCreator
      initialConfig={avatar?.config}
      onComplete={handleComplete}
      onCancel={onBack}
    />
  )
})

// ============================================================================
// EXPORTS
// ============================================================================

export default AvatarStep
