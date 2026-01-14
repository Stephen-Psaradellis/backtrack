/**
 * CreatePostScreen
 *
 * Full producer flow screen for creating "missed connection" posts.
 * Uses a streamlined 3-moment flow:
 * 1. Scene (Where & When) - Location + optional time
 * 2. Moment (Who & What) - Avatar + note
 * 3. Seal (Verify & Send) - Photo verification + review + submit
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
import { View, Alert, Text, TouchableOpacity, Platform, StatusBar, StyleSheet } from 'react-native'
import { useNavigation, useRoute } from '@react-navigation/native'
import Tooltip from 'react-native-walkthrough-tooltip'

import { locationToItem } from '../components/LocationPicker'
import { LoadingSpinner } from '../components/LoadingSpinner'
import { selectionFeedback, errorFeedback, warningFeedback, successFeedback } from '../lib/haptics'
import { useTutorialState } from '../hooks/useTutorialState'
import type { MainStackNavigationProp, CreatePostRouteProp } from '../navigation/types'

// CreatePost module imports
import { STEPS } from './CreatePost/types'
import { useCreatePostForm } from './CreatePost/useCreatePostForm'
import { sharedStyles } from './CreatePost/styles'
import { StepHeader, ProgressBar } from './CreatePost/components'
import {
  SceneStep,
  MomentStep,
  SealStep,
} from './CreatePost/steps'
import type { CreatePostStep } from './CreatePost/types'

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * CreatePostScreen - Full producer flow for creating posts
 *
 * Orchestrates a 3-moment wizard using extracted step components
 * and the useCreatePostForm hook for state management.
 */
export function CreatePostScreen(): React.ReactNode {
  // ---------------------------------------------------------------------------
  // HOOKS
  // ---------------------------------------------------------------------------

  const navigation = useNavigation<MainStackNavigationProp>()
  const route = useRoute<CreatePostRouteProp>()

  // Form state and handlers from custom hook
  const form = useCreatePostForm({ navigation, route })

  // Tutorial tooltip state for post creation onboarding
  const tutorial = useTutorialState('post_creation')

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
   * Handle avatar change with selection haptic feedback
   */
  const handleAvatarChangeWithFeedback = useCallback((avatar: any) => {
    selectionFeedback()
    form.handleAvatarChange(avatar)
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
   * Render tutorial tooltip content for post creation onboarding
   */
  const renderTutorialContent = (): React.ReactNode => (
    <View style={tooltipStyles.container}>
      <Text style={tooltipStyles.title}>Create a Missed Connection</Text>
      <Text style={tooltipStyles.description}>
        Start by selecting a photo, then describe who you saw, write a note, and choose a location.
        Your post will help you reconnect!
      </Text>
      <TouchableOpacity
        style={tooltipStyles.button}
        onPress={tutorial.markComplete}
        testID="tutorial-dismiss-button"
      >
        <Text style={tooltipStyles.buttonText}>Got it</Text>
      </TouchableOpacity>
    </View>
  )

  /**
   * Render current step content based on currentStep (new 3-moment flow)
   */
  const renderStepContent = (): React.ReactNode => {
    switch (form.currentStep) {
      case 'scene':
        return (
          <SceneStep
            locations={form.visitedLocations.map(locationToItem)}
            selectedLocation={form.formData.location}
            onLocationSelect={handleLocationSelectWithFeedback}
            userCoordinates={
              form.userLatitude && form.userLongitude
                ? { latitude: form.userLatitude, longitude: form.userLongitude }
                : null
            }
            loadingLocations={form.loadingLocations || form.locationLoading}
            isPreselected={form.preselectedLocation !== null}
            sightingDate={form.formData.sightingDate}
            timeGranularity={form.formData.timeGranularity}
            onDateChange={form.handleSightingDateChange}
            onGranularityChange={form.handleTimeGranularityChange}
            onNext={handleNextWithFeedback}
            onBack={handleBackWithFeedback}
            testID="create-post"
          />
        )

      case 'moment':
        return (
          <MomentStep
            avatar={form.formData.targetAvatar}
            note={form.formData.note}
            onAvatarChange={handleAvatarChangeWithFeedback}
            onNoteChange={form.handleNoteChange}
            onNext={handleNextWithFeedback}
            onBack={handleBackWithFeedback}
            testID="create-post"
          />
        )

      case 'seal':
        return (
          <SealStep
            avatar={form.formData.targetAvatar}
            note={form.formData.note}
            location={form.formData.location}
            sightingDate={form.formData.sightingDate}
            timeGranularity={form.formData.timeGranularity}
            selectedPhotoId={form.formData.selectedPhotoId}
            onPhotoSelect={handlePhotoSelectWithFeedback}
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

  // In the new 3-moment flow, no steps are full-screen
  // All steps render within the standard container with header and progress bar

  // Render without Tooltip to fix Android blank screen issue
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
// STYLES
// ============================================================================

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

export default CreatePostScreen