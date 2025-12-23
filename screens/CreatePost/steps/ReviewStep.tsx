/**
 * ReviewStep Component
 *
 * Fifth and final step in the CreatePost wizard flow. Displays a summary
 * of all the form data collected (selfie, avatar, note, location) with
 * edit buttons to go back and modify each section. Includes the submit
 * action to create the missed connection post.
 *
 * Features:
 * - Selfie preview with edit/retake button
 * - Avatar preview with edit button
 * - Note preview with edit button
 * - Location preview with edit button
 * - Submit button for post creation
 * - Loading state during submission
 *
 * @example
 * ```tsx
 * <ReviewStep
 *   selfieUri={formData.selfieUri}
 *   avatarConfig={formData.targetAvatar}
 *   note={formData.note}
 *   location={formData.location}
 *   isSubmitting={isSubmitting}
 *   isFormValid={isFormValid}
 *   onSubmit={handleSubmit}
 *   onBack={handleBack}
 *   goToStep={goToStep}
 *   onRetakeSelfie={handleRetakeSelfie}
 * />
 * ```
 */

import React, { memo } from 'react'
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  StyleSheet,
} from 'react-native'

import { LargeAvatarPreview } from '../../../components/AvatarPreview'
import { Button, GhostButton } from '../../../components/Button'
import { COLORS, sharedStyles } from '../styles'
import type { AvatarConfig } from '../../../types/avatar'
import type { LocationItem } from '../../../components/LocationPicker'
import type { CreatePostStep } from '../types'

// ============================================================================
// TYPES
// ============================================================================

/**
 * Props for the ReviewStep component
 */
export interface ReviewStepProps {
  /**
   * URI of the captured selfie image
   */
  selfieUri: string | null

  /**
   * Avatar configuration for the target person
   */
  avatarConfig: AvatarConfig

  /**
   * The note/message written by the user
   */
  note: string

  /**
   * The selected location for the missed connection
   */
  location: LocationItem | null

  /**
   * Whether the form is currently being submitted
   */
  isSubmitting: boolean

  /**
   * Whether the form data is valid for submission
   */
  isFormValid: boolean

  /**
   * Callback when user submits the post
   */
  onSubmit: () => void

  /**
   * Callback when user wants to go back to previous step
   */
  onBack: () => void

  /**
   * Callback to navigate to a specific step for editing
   * @param step - The step to navigate to
   */
  goToStep: (step: CreatePostStep) => void

  /**
   * Callback when user wants to retake their selfie
   */
  onRetakeSelfie: () => void

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
 * ReviewStep - Final review step in the CreatePost wizard
 *
 * Displays:
 * 1. Selfie preview with edit button
 * 2. Avatar preview with edit button
 * 3. Note preview with edit button
 * 4. Location preview with edit button
 * 5. Submit and Go Back buttons
 */
export const ReviewStep = memo(function ReviewStep({
  selfieUri,
  avatarConfig,
  note,
  location,
  isSubmitting,
  isFormValid,
  onSubmit,
  onBack,
  goToStep,
  onRetakeSelfie,
  testID = 'create-post',
}: ReviewStepProps): JSX.Element {
  // ---------------------------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------------------------

  return (
    <ScrollView
      style={styles.reviewContainer}
      contentContainerStyle={styles.reviewContent}
      showsVerticalScrollIndicator={false}
    >
      {/* Selfie preview */}
      <View style={styles.reviewSection}>
        <Text style={styles.reviewSectionTitle}>Your Verification Selfie</Text>
        <View style={styles.reviewSelfieContainer}>
          {selfieUri && (
            <Image
              source={{ uri: selfieUri }}
              style={styles.reviewSelfie}
              resizeMode="cover"
            />
          )}
          <TouchableOpacity
            style={sharedStyles.editButton}
            onPress={onRetakeSelfie}
            testID={`${testID}-review-edit-selfie`}
          >
            <Text style={sharedStyles.editButtonText}>Edit</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.reviewSelfieNote}>
          This is private and only used for verification.
        </Text>
      </View>

      {/* Avatar preview */}
      <View style={styles.reviewSection}>
        <Text style={styles.reviewSectionTitle}>Who You're Looking For</Text>
        <View style={styles.reviewAvatarContainer}>
          <LargeAvatarPreview config={avatarConfig} />
          <TouchableOpacity
            style={sharedStyles.editButton}
            onPress={() => goToStep('avatar')}
            testID={`${testID}-review-edit-avatar`}
          >
            <Text style={sharedStyles.editButtonText}>Edit</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Note preview */}
      <View style={styles.reviewSection}>
        <View style={styles.reviewSectionHeader}>
          <Text style={styles.reviewSectionTitle}>Your Note</Text>
          <TouchableOpacity
            style={sharedStyles.editButton}
            onPress={() => goToStep('note')}
            testID={`${testID}-review-edit-note`}
          >
            <Text style={sharedStyles.editButtonText}>Edit</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.reviewNoteContainer}>
          <Text style={styles.reviewNoteText}>{note}</Text>
        </View>
      </View>

      {/* Location preview */}
      <View style={styles.reviewSection}>
        <View style={styles.reviewSectionHeader}>
          <Text style={styles.reviewSectionTitle}>Location</Text>
          <TouchableOpacity
            style={sharedStyles.editButton}
            onPress={() => goToStep('location')}
            testID={`${testID}-review-edit-location`}
          >
            <Text style={sharedStyles.editButtonText}>Edit</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.reviewLocationContainer}>
          <Text style={styles.reviewLocationIcon}>📍</Text>
          <View style={styles.reviewLocationDetails}>
            <Text style={styles.reviewLocationName}>{location?.name}</Text>
            {location?.address && (
              <Text style={styles.reviewLocationAddress}>{location.address}</Text>
            )}
          </View>
        </View>
      </View>

      {/* Submit button */}
      <View style={sharedStyles.submitContainer}>
        <Button
          title="Post Missed Connection"
          onPress={onSubmit}
          loading={isSubmitting}
          disabled={isSubmitting || !isFormValid}
          fullWidth
          testID={`${testID}-submit`}
        />
        <GhostButton
          title="Go Back"
          onPress={onBack}
          disabled={isSubmitting}
          testID={`${testID}-review-back`}
        />
      </View>
    </ScrollView>
  )
})

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  /**
   * Main scrollable container for review step
   */
  reviewContainer: {
    flex: 1,
    backgroundColor: COLORS.backgroundSecondary,
  },

  /**
   * Content padding for review scroll view
   */
  reviewContent: {
    padding: 16,
    paddingBottom: 40,
  },

  /**
   * Individual review section card
   */
  reviewSection: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },

  /**
   * Section header with title and optional action button
   */
  reviewSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },

  /**
   * Section title text (uppercase, muted)
   */
  reviewSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },

  /**
   * Container for selfie preview (centered)
   */
  reviewSelfieContainer: {
    alignItems: 'center',
    position: 'relative',
  },

  /**
   * Selfie image preview (circular)
   */
  reviewSelfie: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 8,
  },

  /**
   * Note about selfie privacy
   */
  reviewSelfieNote: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
  },

  /**
   * Container for avatar preview (centered)
   */
  reviewAvatarContainer: {
    alignItems: 'center',
  },

  /**
   * Container for note text with background
   */
  reviewNoteContainer: {
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: 8,
    padding: 12,
  },

  /**
   * Note preview text
   */
  reviewNoteText: {
    fontSize: 16,
    color: COLORS.textPrimary,
    lineHeight: 24,
  },

  /**
   * Container for location preview (row layout)
   */
  reviewLocationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  /**
   * Location pin icon
   */
  reviewLocationIcon: {
    fontSize: 24,
    marginRight: 12,
  },

  /**
   * Container for location name and address
   */
  reviewLocationDetails: {
    flex: 1,
  },

  /**
   * Location name text (primary)
   */
  reviewLocationName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 2,
  },

  /**
   * Location address text (secondary)
   */
  reviewLocationAddress: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
})

// ============================================================================
// EXPORTS
// ============================================================================

export default ReviewStep
