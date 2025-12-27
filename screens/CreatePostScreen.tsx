/**
 * CreatePostScreen
 *
 * Full producer flow screen for creating "missed connection" posts.
 * Guides users through a multi-step process:
 * 1. Avatar building - Describe the person of interest
 * 2. Note writing - Write a message about the missed connection
 * 3. Location selection - Choose where the connection happened
 * 4. Review and submit
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

import React, { useCallback } from 'react'
import { View, Alert } from 'react-native'
import { useNavigation, useRoute } from '@react-navigation/native'

import { locationToItem } from '../components/LocationPicker'
import { LoadingSpinner } from '../components/LoadingSpinner'
import { selectionFeedback, errorFeedback, warningFeedback, successFeedback } from '../lib/haptics'
import type { MainStackNavigationProp, CreatePostRouteProp } from '../navigation/types'

// CreatePost module imports
import { STEPS } from './CreatePost/types'
import { useCreatePostForm } from './CreatePost/useCreatePostForm'
import { sharedStyles } from './CreatePost/styles'
import { StepHeader, ProgressBar } from './CreatePost/components'
import {
  PhotoStep,
  AvatarStep,
  NoteStep,
  LocationStep,
  ReviewStep,
} from './CreatePost/steps'
import type { CreatePostStep } from './CreatePost/types'

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * CreatePostScreen - Full producer flow for creating posts
 *
 * Orchestrates a 4-step wizard using extracted step components
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
  // HAPTIC FEEDBACK HANDLERS
  // ---------------------------------------------------------------------------

  /**
   * Handle next step with selection haptic feedback
   */
  const handleNextWithFeedback = useCallback(() => {
    selectionFeedback()
    form.handleNext()
  }, [form])

  /**
   * Handle back with warning haptic feedback for first step
   */
  const handleBackWithFeedback = useCallback(() => {
    const currentIndex = STEPS.findIndex((s) => s.id === form.currentStep)
    if (currentIndex === 0) {
      warningFeedback()
      Alert.alert(
        'Discard Post?',
        'Are you sure you want to discard this post? All progress will be lost.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Discard', style: 'destructive', onPress: () => navigation.goBack() },
        ]
      )
    } else {
      form.handleBack()
    }
  }, [form, navigation])

  /**
   * Handle avatar save with selection haptic feedback
   */
  const handleAvatarWithFeedback = useCallback((config: any) => {
    selectionFeedback()
    form.handleAvatarSave(config)
  }, [form])

  /**
   * Handle location select with selection haptic feedback
   */
  const handleLocationSelectWithFeedback = useCallback((location: any) => {
    selectionFeedback()
    form.handleLocationSelect(location)
  }, [form])

  /**
   * Handle photo select with selection haptic feedback
   */
  const handlePhotoSelectWithFeedback = useCallback((photoId: string) => {
    selectionFeedback()
    form.handlePhotoSelect(photoId)
  }, [form])

  /**
   * Handle submit with success or error haptic feedback
   */
  const handleSubmitWithFeedback = useCallback(async () => {
    if (!form.isFormValid) {
      errorFeedback()
    } else {
      successFeedback()
    }
    await form.handleSubmit()
  }, [form])

  // ---------------------------------------------------------------------------
  // RENDER HELPERS
  // ---------------------------------------------------------------------------

  /**
   * Render current step content based on currentStep
   */
  const renderStepContent = (): React.ReactNode => {
    switch (form.currentStep) {
      case 'photo':
        return (
          <PhotoStep
            selectedPhotoId={form.formData.selectedPhotoId}
            onPhotoSelect={handlePhotoSelectWithFeedback}
            onNext={handleNextWithFeedback}
            onBack={handleBackWithFeedback}
            testID="create-post"
          />
        )

      case 'avatar':
        return (
          <AvatarStep
            avatar={form.formData.targetAvatar}
            onSave={handleAvatarWithFeedback}
            onBack={handleBackWithFeedback}
            testID="create-post"
          />
        )

      case 'note':
        return (
          <NoteStep
            avatar={form.formData.targetAvatar}
            note={form.formData.note}
            onNoteChange={form.handleNoteChange}
            onNext={handleNextWithFeedback}
            onBack={handleBackWithFeedback}
            testID="create-post"
          />
        )

      case 'location':
        return (
          <LocationStep
            locations={form.visitedLocations.map(locationToItem)}
            selectedLocation={form.formData.location}
            onSelect={handleLocationSelectWithFeedback}
            userCoordinates={
              form.userLatitude && form.userLongitude
                ? { latitude: form.userLatitude, longitude: form.userLongitude }
                : null
            }
            loading={form.loadingLocations || form.locationLoading}
            onNext={handleNextWithFeedback}
            onBack={handleBackWithFeedback}
            testID="create-post"
          />
        )

      case 'review':
        return (
          <ReviewStep
            selectedPhotoId={form.formData.selectedPhotoId}
            avatar={form.formData.targetAvatar}
            note={form.formData.note}
            location={form.formData.location}
            isSubmitting={form.isSubmitting}
            isFormValid={form.isFormValid}
            onSubmit={handleSubmitWithFeedback}
            onBack={handleBackWithFeedback}
            goToStep={form.goToStep}
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

  // Full-screen steps (photo selector and avatar builder take full screen)
  const isFullScreenStep = form.currentStep === 'photo' || form.currentStep === 'avatar'

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
        onBack={handleBackWithFeedback}
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