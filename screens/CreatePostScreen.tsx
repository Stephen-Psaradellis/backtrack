/**
 * CreatePostScreen
 *
 * Full producer flow screen for creating "missed connection" posts.
 * Guides users through a multi-step process:
 * 1. Selfie capture - Verify user identity
 * 2. Avatar building - Describe the person of interest
 * 3. Note writing - Write a message about the missed connection
 * 4. Location selection - Choose where the connection happened
 * 5. Review and submit
 *
 * This component orchestrates the step flow, delegating rendering
 * and state management to extracted components and hooks.
 *
 * @example
 * ```tsx
 * // Navigate to create post
 * navigation.navigate('CreatePost', { locationId: 'optional-preset-location' })
 * ```
 */

import React from 'react'
import { View } from 'react-native'
import { useNavigation, useRoute } from '@react-navigation/native'

import { locationToItem } from '../components/LocationPicker'
import { LoadingSpinner } from '../components/LoadingSpinner'
import type { MainStackNavigationProp, CreatePostRouteProp } from '../navigation/types'

// CreatePost module imports
import { STEPS } from './CreatePost/types'
import { useCreatePostForm } from './CreatePost/useCreatePostForm'
import { sharedStyles } from './CreatePost/styles'
import { StepHeader, ProgressBar } from './CreatePost/components'
import {
  SelfieStep,
  AvatarStep,
  NoteStep,
  LocationStep,
  ReviewStep,
} from './CreatePost/steps'

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * CreatePostScreen - Full producer flow for creating posts
 *
 * Orchestrates a 5-step wizard using extracted step components
 * and the useCreatePostForm hook for state management.
 */
export function CreatePostScreen(): JSX.Element {
  // ---------------------------------------------------------------------------
  // HOOKS
  // ---------------------------------------------------------------------------

  const navigation = useNavigation<MainStackNavigationProp>()
  const route = useRoute<CreatePostRouteProp>()

  // Form state and handlers from custom hook
  const form = useCreatePostForm({ navigation, route })

  // ---------------------------------------------------------------------------
  // RENDER HELPERS
  // ---------------------------------------------------------------------------

  /**
   * Render current step content based on currentStep
   */
  const renderStepContent = (): React.ReactNode => {
    switch (form.currentStep) {
      case 'selfie':
        return (
          <SelfieStep
            selfieUri={form.formData.selfieUri}
            onCapture={form.handleSelfieCapture}
            onRetake={form.handleRetakeSelfie}
            onNext={form.handleNext}
            onBack={form.handleBack}
            testID="create-post"
          />
        )

      case 'avatar':
        return (
          <AvatarStep
            avatarConfig={form.formData.targetAvatar}
            onChange={form.handleAvatarChange}
            onSave={form.handleAvatarSave}
            onBack={form.handleBack}
            testID="create-post"
          />
        )

      case 'note':
        return (
          <NoteStep
            avatarConfig={form.formData.targetAvatar}
            note={form.formData.note}
            onNoteChange={form.handleNoteChange}
            onNext={form.handleNext}
            onBack={form.handleBack}
            testID="create-post"
          />
        )

      case 'location':
        return (
          <LocationStep
            locations={form.nearbyLocations.map(locationToItem)}
            selectedLocation={form.formData.location}
            onSelect={form.handleLocationSelect}
            userCoordinates={
              form.userLatitude && form.userLongitude
                ? { latitude: form.userLatitude, longitude: form.userLongitude }
                : null
            }
            loading={form.loadingLocations || form.locationLoading}
            onNext={form.handleNext}
            onBack={form.handleBack}
            testID="create-post"
          />
        )

      case 'review':
        return (
          <ReviewStep
            selfieUri={form.formData.selfieUri}
            avatarConfig={form.formData.targetAvatar}
            note={form.formData.note}
            location={form.formData.location}
            isSubmitting={form.isSubmitting}
            isFormValid={form.isFormValid}
            onSubmit={form.handleSubmit}
            onBack={form.handleBack}
            goToStep={form.goToStep}
            onRetakeSelfie={form.handleRetakeSelfie}
            testID="create-post"
          />
        )

      default:
        return null
    }
  }

  // ---------------------------------------------------------------------------
  // RENDER: LOADING
  // ---------------------------------------------------------------------------

  if (form.isSubmitting) {
    return (
      <View style={sharedStyles.loadingContainer} testID="create-post-submitting">
        <LoadingSpinner message="Creating your post..." fullScreen />
      </View>
    )
  }

  // ---------------------------------------------------------------------------
  // RENDER: MAIN
  // ---------------------------------------------------------------------------

  // Full-screen steps (camera without preview and avatar builder)
  const isFullScreenStep =
    (form.currentStep === 'selfie' && !form.formData.selfieUri) ||
    form.currentStep === 'avatar'

  if (isFullScreenStep) {
    return (
      <View style={sharedStyles.fullScreenContainer} testID="create-post-screen">
        {renderStepContent()}
      </View>
    )
  }

  return (
    <View style={sharedStyles.container} testID="create-post-screen">
      {/* Header with step indicator */}
      <StepHeader
        stepConfig={form.currentStepConfig}
        onBack={form.handleBack}
        testID="create-post"
      />

      {/* Animated progress bar */}
      <ProgressBar
        progressAnim={form.progressAnim}
        currentStep={form.currentStepIndex + 1}
        totalSteps={STEPS.length}
        testID="create-post"
      />

      {/* Step content */}
      <View style={sharedStyles.content}>
        {renderStepContent()}
      </View>
    </View>
  )
}

// ============================================================================
// EXPORTS
// ============================================================================

export default CreatePostScreen