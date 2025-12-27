/**
 * AvatarStep Component
 *
 * Second step in the CreatePost wizard flow. Allows the user to build an
 * avatar describing the person they saw using Ready Player Me.
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

import {
  ReadyPlayerMeCreator,
  toStoredAvatar,
  type RPMAvatarData,
  type StoredAvatar,
} from '../../../components/ReadyPlayerMe'

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
  avatar: StoredAvatar | null

  /**
   * Callback fired when user saves the avatar and wants to proceed
   * @param avatar - The created avatar
   */
  onSave: (avatar: StoredAvatar) => void

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
 * Embeds the Ready Player Me avatar creator to let users describe
 * the person they saw. When the avatar is created, it advances to
 * the next step.
 */
export const AvatarStep = memo(function AvatarStep({
  onSave,
  onBack,
  testID = 'create-post',
}: AvatarStepProps): JSX.Element {
  /**
   * Handle avatar creation from Ready Player Me
   */
  const handleAvatarCreated = useCallback(
    (data: RPMAvatarData) => {
      const storedAvatar = toStoredAvatar(data)
      onSave(storedAvatar)
    },
    [onSave]
  )

  return (
    <ReadyPlayerMeCreator
      onAvatarCreated={handleAvatarCreated}
      onClose={onBack}
      title="Describe Who You Saw"
      subtitle="Create an avatar that looks like the person you want to connect with"
      config={{
        clearCache: true, // Force fresh avatar creation each time
        quickStart: true,
        bodyType: 'fullbody',
        selectBodyType: true,
      }}
      testID={`${testID}-avatar`}
    />
  )
})

// ============================================================================
// EXPORTS
// ============================================================================

export default AvatarStep
