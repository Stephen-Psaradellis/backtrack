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
import { View, Alert, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useNavigation, useRoute } from '@react-navigation/native'

import { darkTheme } from '../constants/glassStyles'
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
            sightingEndDate={form.formData.sightingEndDate}
            onStartTimeChange={form.handleSightingDateChange}
            onEndTimeChange={form.handleSightingEndDateChange}
            onClearTime={form.handleClearSightingTime}
            checkinTime={form.checkinTime}
            checkoutTime={form.checkoutTime}
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
            sightingEndDate={form.formData.sightingEndDate}
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

  // Use inline banner on all platforms to avoid tooltip collision with step content
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

      {/* Inline tutorial banner (consistent on iOS and Android) */}
      {tutorial.isVisible && !tutorial.loading && (
        <View style={tooltipStyles.androidBanner} testID="tutorial-banner">
          <View style={tooltipStyles.androidBannerTextContainer}>
            <Text style={tooltipStyles.androidBannerTitle}>Create a Missed Connection</Text>
            <Text style={tooltipStyles.androidBannerDescription}>
              First, set the scene — where and when did you spot them? Then describe who you saw, and finally, seal your post.
            </Text>
          </View>
          <TouchableOpacity
            style={tooltipStyles.androidBannerDismiss}
            onPress={tutorial.markComplete}
            testID="tutorial-dismiss-button"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="close" size={18} color={darkTheme.textMuted} />
          </TouchableOpacity>
        </View>
      )}

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
 * Styles for tutorial inline banner (cross-platform)
 */
const tooltipStyles = StyleSheet.create({
  // Inline tutorial banner styles (UX-026, unified cross-platform)
  androidBanner: {
    backgroundColor: darkTheme.surfaceElevated,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 4,
    borderRadius: 12,
    flexDirection: 'row' as const,
    alignItems: 'flex-start' as const,
    gap: 10,
    borderWidth: 1,
    borderColor: darkTheme.cardBorder,
  },
  androidBannerTextContainer: {
    flex: 1,
  },
  androidBannerTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: darkTheme.textPrimary,
    marginBottom: 4,
  },
  androidBannerDescription: {
    fontSize: 13,
    color: darkTheme.textSecondary,
    lineHeight: 18,
  },
  androidBannerDismiss: {
    padding: 4,
  },
})

// ============================================================================
// EXPORTS
// ============================================================================

export default CreatePostScreen