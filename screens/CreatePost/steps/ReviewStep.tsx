/**
 * ReviewStep Component
 *
 * Final step in the CreatePost wizard flow. Displays a summary
 * of all the form data collected (avatar, note, location, time) with
 * edit buttons to go back and modify each section. Includes the submit
 * action to create the missed connection post.
 *
 * Features:
 * - Avatar preview with edit button
 * - Note preview with edit button
 * - Location preview with edit button
 * - Time/date preview with edit button (optional field)
 * - Submit button for post creation
 * - Loading state during submission
 *
 * @example
 * ```tsx
 * <ReviewStep
 *   avatar={formData.targetAvatar}
 *   note={formData.note}
 *   location={formData.location}
 *   sightingDate={formData.sightingDate}
 *   timeGranularity={formData.timeGranularity}
 *   isSubmitting={isSubmitting}
 *   isFormValid={isFormValid}
 *   onSubmit={handleSubmit}
 *   onBack={handleBack}
 *   goToStep={goToStep}
 * />
 * ```
 */

import React, { memo, useEffect, useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'

import { Avatar2DDisplay } from '../../../components/avatar2d'
import type { StoredAvatar2D } from '../../../components/avatar2d/types'
import { Button, GhostButton } from '../../../components/Button'
import { COLORS, sharedStyles } from '../styles'
import type { LocationItem } from '../../../components/LocationPicker'
import type { CreatePostStepLegacy } from '../types'
import { getPhotoById, type ProfilePhotoWithUrl } from '../../../lib/profilePhotos'
import type { TimeGranularity } from '../../../types/database'
import { formatSightingTime } from '../../../utils/dateTime'

// ============================================================================
// TYPES
// ============================================================================

/**
 * Props for the ReviewStep component
 */
export interface ReviewStepProps {
  /**
   * The selected photo ID for verification
   */
  selectedPhotoId: string | null

  /**
   * Avatar for the target person
   */
  avatar: StoredAvatar2D | null

  /**
   * The note/message written by the user
   */
  note: string

  /**
   * The selected location for the missed connection
   */
  location: LocationItem | null

  /**
   * The sighting date/time (optional)
   */
  sightingDate: Date | null

  /**
   * The time granularity for the sighting (optional)
   * 'specific' for exact time, or 'morning'/'afternoon'/'evening' for approximate
   */
  timeGranularity: TimeGranularity | null

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
  goToStep: (step: CreatePostStepLegacy) => void

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
 * 1. Verification photo preview with edit button
 * 2. Avatar preview with edit button
 * 3. Note preview with edit button
 * 4. Location preview with edit button
 * 5. Time/date preview with edit button (if specified)
 * 6. Submit and Go Back buttons
 */
export const ReviewStep = memo(function ReviewStep({
  selectedPhotoId,
  avatar,
  note,
  location,
  sightingDate,
  timeGranularity,
  isSubmitting,
  isFormValid,
  onSubmit,
  onBack,
  goToStep,
  testID = 'create-post',
}: ReviewStepProps): JSX.Element {
  // ---------------------------------------------------------------------------
  // STATE
  // ---------------------------------------------------------------------------

  const [photo, setPhoto] = useState<ProfilePhotoWithUrl | null>(null)
  const [photoLoading, setPhotoLoading] = useState(false)

  // ---------------------------------------------------------------------------
  // EFFECTS
  // ---------------------------------------------------------------------------

  // Fetch photo details when selectedPhotoId changes
  useEffect(() => {
    if (!selectedPhotoId) {
      setPhoto(null)
      return
    }

    const fetchPhoto = async () => {
      setPhotoLoading(true)
      try {
        const photoData = await getPhotoById(selectedPhotoId)
        setPhoto(photoData)
      } catch {
        setPhoto(null)
      } finally {
        setPhotoLoading(false)
      }
    }

    fetchPhoto()
  }, [selectedPhotoId])

  // ---------------------------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------------------------

  return (
    <ScrollView
      style={styles.reviewContainer}
      contentContainerStyle={styles.reviewContent}
      showsVerticalScrollIndicator={false}
    >
      {/* Verification photo preview */}
      <View style={styles.reviewSection}>
        <View style={styles.reviewSectionHeader}>
          <Text style={styles.reviewSectionTitle}>Your Verification Photo</Text>
          <TouchableOpacity
            style={sharedStyles.editButton}
            onPress={() => goToStep('photo')}
            testID={`${testID}-review-edit-photo`}
          >
            <Text style={sharedStyles.editButtonText}>Edit</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.reviewPhotoContainer}>
          {photoLoading ? (
            <View style={styles.photoPlaceholder}>
              <ActivityIndicator size="small" color="#FF6B47" />
            </View>
          ) : photo?.signedUrl ? (
            <Image
              source={{ uri: photo.signedUrl }}
              style={styles.reviewPhotoImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.photoPlaceholder}>
              <Ionicons name="image-outline" size={32} color="#8E8E93" />
              <Text style={styles.photoPlaceholderText}>No photo selected</Text>
            </View>
          )}
        </View>
      </View>

      {/* Avatar preview */}
      <View style={styles.reviewSection}>
        <Text style={styles.reviewSectionTitle}>Who You're Looking For</Text>
        <View style={styles.reviewAvatarContainer}>
          {avatar && <Avatar2DDisplay avatar={avatar} size="lg" />}
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

      {/* Time preview */}
      <View style={styles.reviewSection}>
        <View style={styles.reviewSectionHeader}>
          <Text style={styles.reviewSectionTitle}>When You Saw Them</Text>
          <TouchableOpacity
            style={sharedStyles.editButton}
            onPress={() => goToStep('time')}
            testID={`${testID}-review-edit-time`}
          >
            <Text style={sharedStyles.editButtonText}>Edit</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.reviewTimeContainer}>
          <Text style={styles.reviewTimeIcon}>🕐</Text>
          <Text style={styles.reviewTimeText}>
            {sightingDate && timeGranularity
              ? formatSightingTime(sightingDate, timeGranularity)
              : 'Time not specified'}
          </Text>
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
   * Container for verification photo preview
   */
  reviewPhotoContainer: {
    alignItems: 'center',
  },

  /**
   * Verification photo image
   */
  reviewPhotoImage: {
    width: 120,
    height: 120,
    borderRadius: 12,
  },

  /**
   * Photo placeholder when loading or missing
   */
  photoPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 12,
    backgroundColor: COLORS.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /**
   * Photo placeholder text
   */
  photoPlaceholderText: {
    marginTop: 8,
    fontSize: 12,
    color: '#8E8E93',
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

  /**
   * Container for time preview (row layout)
   */
  reviewTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  /**
   * Time clock icon
   */
  reviewTimeIcon: {
    fontSize: 24,
    marginRight: 12,
  },

  /**
   * Time preview text
   */
  reviewTimeText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
})

// ============================================================================
// EXPORTS
// ============================================================================

export default ReviewStep
