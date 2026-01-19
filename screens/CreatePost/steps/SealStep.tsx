/**
 * SealStep Component (Moment 3: Seal & Send)
 *
 * Final step in the new 3-moment CreatePost wizard flow.
 * Combines review card with photo verification and submit action.
 *
 * Features:
 * - Compact review card showing all collected data
 * - Tappable sections to jump back to previous moments
 * - Photo verification grid
 * - Privacy text
 * - Single CTA to post
 *
 * @example
 * ```tsx
 * <SealStep
 *   avatar={formData.targetAvatar}
 *   note={formData.note}
 *   location={formData.location}
 *   sightingDate={formData.sightingDate}
 *   timeGranularity={formData.timeGranularity}
 *   selectedPhotoId={formData.selectedPhotoId}
 *   onPhotoSelect={handlePhotoSelect}
 *   isSubmitting={isSubmitting}
 *   isFormValid={isFormValid}
 *   onSubmit={handleSubmit}
 *   onBack={handleBack}
 *   goToStep={goToStep}
 * />
 * ```
 */

import React, { memo, useCallback, useEffect, useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ActionSheetIOS,
  Platform,
  Dimensions,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'

import { Avatar2DDisplay } from '../../../components/avatar2d'
import type { StoredAvatar2D } from '../../../components/avatar2d/types'
import { Button, GhostButton } from '../../../components/Button'
import { useProfilePhotos, type ProfilePhotoWithTimeout } from '../../../hooks/useProfilePhotos'
import { pickSelfieFromCamera, pickSelfieFromGallery } from '../../../utils/imagePicker'
import { lightFeedback, successFeedback, errorFeedback } from '../../../lib/haptics'
import { darkTheme } from '../../../constants/glassStyles'
import { colors } from '../../../constants/theme'
import type { LocationItem } from '../../../components/LocationPicker'
import type { TimeGranularity } from '../../../types/database'
import { formatSightingTime } from '../../../utils/dateTime'
import { COLORS } from '../styles'

// ============================================================================
// TYPES
// ============================================================================

/**
 * Step type for navigation
 */
type CreatePostStep = 'scene' | 'moment' | 'seal'

/**
 * Props for the SealStep component
 */
export interface SealStepProps {
  /**
   * Avatar for the target person
   */
  avatar: StoredAvatar2D | null

  /**
   * The note/message written by the user
   */
  note: string

  /**
   * The selected location
   */
  location: LocationItem | null

  /**
   * The sighting date (optional)
   */
  sightingDate: Date | null

  /**
   * Time granularity (optional)
   */
  timeGranularity: TimeGranularity | null

  /**
   * Currently selected photo ID
   */
  selectedPhotoId: string | null

  /**
   * Callback when photo is selected
   */
  onPhotoSelect: (photoId: string) => void

  /**
   * Whether form is submitting
   */
  isSubmitting: boolean

  /**
   * Whether form is valid for submission
   */
  isFormValid: boolean

  /**
   * Callback to submit the post
   */
  onSubmit: () => void

  /**
   * Callback to go back
   */
  onBack: () => void

  /**
   * Navigate to a specific step
   */
  goToStep: (step: CreatePostStep) => void

  /**
   * Test ID prefix
   */
  testID?: string
}

// ============================================================================
// CONSTANTS
// ============================================================================

const SCREEN_WIDTH = Dimensions.get('window').width
const PHOTO_GRID_PADDING = 16
const PHOTO_GRID_GAP = 8
const NUM_COLUMNS = 4
const PHOTO_SIZE = (SCREEN_WIDTH - PHOTO_GRID_PADDING * 2 - PHOTO_GRID_GAP * (NUM_COLUMNS - 1)) / NUM_COLUMNS

// ============================================================================
// PHOTO TILE COMPONENT
// ============================================================================

interface PhotoTileProps {
  photo: ProfilePhotoWithTimeout
  isSelected: boolean
  onSelect: () => void
}

const PhotoTile = memo(function PhotoTile({
  photo,
  isSelected,
  onSelect,
}: PhotoTileProps) {
  const isApproved = photo.moderation_status === 'approved'
  const isPending = photo.moderation_status === 'pending'

  return (
    <TouchableOpacity
      style={[
        styles.photoTile,
        isSelected && styles.photoTileSelected,
        !isApproved && styles.photoTileDisabled,
      ]}
      onPress={isApproved ? onSelect : undefined}
      disabled={!isApproved}
      activeOpacity={0.8}
    >
      {photo.signedUrl ? (
        <Image
          source={{ uri: photo.signedUrl }}
          style={styles.photoImage}
          resizeMode="cover"
        />
      ) : (
        <View style={styles.photoPlaceholder}>
          <Ionicons name="image-outline" size={18} color="#8E8E93" />
        </View>
      )}

      {/* Selection indicator */}
      {isSelected && (
        <View style={styles.selectedBadge}>
          <Ionicons name="checkmark-circle" size={20} color="#FF6B47" />
        </View>
      )}

      {/* Pending indicator */}
      {isPending && (
        <View style={styles.pendingOverlay}>
          <ActivityIndicator size="small" color="#FFFFFF" />
        </View>
      )}
    </TouchableOpacity>
  )
})

// ============================================================================
// ADD PHOTO TILE COMPONENT
// ============================================================================

interface AddPhotoTileProps {
  onPress: () => void
  disabled: boolean
}

const AddPhotoTile = memo(function AddPhotoTile({
  onPress,
  disabled,
}: AddPhotoTileProps) {
  return (
    <TouchableOpacity
      style={[styles.addTile, disabled && styles.addTileDisabled]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
    >
      <Ionicons
        name="add"
        size={24}
        color={disabled ? '#FFD0C2' : '#FF6B47'}
      />
    </TouchableOpacity>
  )
})

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * SealStep - Review and submit step (Moment 3)
 *
 * Layout:
 * 1. Compact review card (tappable sections)
 * 2. Divider with "Verify it's you"
 * 3. Photo selection grid
 * 4. Privacy text
 * 5. Submit CTA
 */
export const SealStep = memo(function SealStep({
  avatar,
  note,
  location,
  sightingDate,
  timeGranularity,
  selectedPhotoId,
  onPhotoSelect,
  isSubmitting,
  isFormValid,
  onSubmit,
  onBack,
  goToStep,
  testID = 'create-post',
}: SealStepProps): JSX.Element {
  // ---------------------------------------------------------------------------
  // HOOKS
  // ---------------------------------------------------------------------------

  const {
    photos,
    approvedPhotos,
    uploading,
    hasReachedLimit,
    uploadPhoto,
  } = useProfilePhotos()

  // Auto-select first approved photo if none selected
  useEffect(() => {
    if (!selectedPhotoId && approvedPhotos.length > 0) {
      onPhotoSelect(approvedPhotos[0].id)
    }
  }, [selectedPhotoId, approvedPhotos, onPhotoSelect])

  // ---------------------------------------------------------------------------
  // COMPUTED VALUES
  // ---------------------------------------------------------------------------

  const hasPhoto = selectedPhotoId && approvedPhotos.some((p) => p.id === selectedPhotoId)
  const canSubmit = isFormValid && hasPhoto && !isSubmitting

  // Truncate note for preview
  const notePreview = note.length > 80 ? note.slice(0, 80) + '...' : note

  // Format time for preview
  const timePreview = sightingDate && timeGranularity
    ? formatSightingTime(sightingDate, timeGranularity)
    : null

  // ---------------------------------------------------------------------------
  // HANDLERS
  // ---------------------------------------------------------------------------

  const handleAddPhoto = useCallback(async () => {
    await lightFeedback()

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', 'Take Photo', 'Choose from Library'],
          cancelButtonIndex: 0,
        },
        async (buttonIndex) => {
          if (buttonIndex === 1) {
            await takePhoto()
          } else if (buttonIndex === 2) {
            await chooseFromLibrary()
          }
        }
      )
    } else {
      Alert.alert(
        'Add Photo',
        'How would you like to add a photo?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Take Photo', onPress: takePhoto },
          { text: 'Choose from Library', onPress: chooseFromLibrary },
        ]
      )
    }
  }, [])

  const takePhoto = async () => {
    const result = await pickSelfieFromCamera()
    if (result.success && result.uri) {
      const success = await uploadPhoto(result.uri)
      if (success) {
        await successFeedback()
      }
    }
  }

  const chooseFromLibrary = async () => {
    const result = await pickSelfieFromGallery()
    if (result.success && result.uri) {
      const success = await uploadPhoto(result.uri)
      if (success) {
        await successFeedback()
      }
    }
  }

  const handleSelectPhoto = useCallback(async (photoId: string) => {
    await lightFeedback()
    onPhotoSelect(photoId)
  }, [onPhotoSelect])

  const handleGoToScene = useCallback(() => {
    goToStep('scene')
  }, [goToStep])

  const handleGoToMoment = useCallback(() => {
    goToStep('moment')
  }, [goToStep])

  // ---------------------------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------------------------

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* Review Card */}
      <View style={styles.reviewCard}>
        <Text style={styles.reviewCardTitle}>Review Your Post</Text>

        {/* Avatar + Note Row */}
        <TouchableOpacity
          style={styles.reviewRow}
          onPress={handleGoToMoment}
          activeOpacity={0.7}
          testID={`${testID}-edit-moment`}
        >
          <View style={styles.avatarThumbnail}>
            {avatar && <Avatar2DDisplay avatar={avatar} size="sm" />}
          </View>
          <View style={styles.reviewRowContent}>
            <Text style={styles.reviewRowLabel}>Your message</Text>
            <Text style={styles.reviewNotePreview} numberOfLines={2}>
              {notePreview}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
        </TouchableOpacity>

        {/* Location + Time Row */}
        <TouchableOpacity
          style={styles.reviewRow}
          onPress={handleGoToScene}
          activeOpacity={0.7}
          testID={`${testID}-edit-scene`}
        >
          <View style={styles.locationIcon}>
            <Ionicons name="location" size={20} color={COLORS.primary} />
          </View>
          <View style={styles.reviewRowContent}>
            <Text style={styles.reviewRowLabel}>{location?.name || 'Location'}</Text>
            {timePreview && (
              <Text style={styles.reviewTimePreview}>{timePreview}</Text>
            )}
          </View>
          <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Divider */}
      <View style={styles.divider}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>Verify it's you</Text>
        <View style={styles.dividerLine} />
      </View>

      {/* Photo Section */}
      <View style={styles.photoSection}>
        <Text style={styles.photoSectionLabel}>Select a verification photo</Text>

        <View style={styles.photoGrid}>
          {photos.map((photo) => (
            <PhotoTile
              key={photo.id}
              photo={photo}
              isSelected={photo.id === selectedPhotoId}
              onSelect={() => handleSelectPhoto(photo.id)}
            />
          ))}

          {/* Add photo tile */}
          {!hasReachedLimit && (
            <AddPhotoTile
              onPress={handleAddPhoto}
              disabled={uploading}
            />
          )}
        </View>

        {uploading && (
          <View style={styles.uploadingBanner}>
            <ActivityIndicator size="small" color="#FFFFFF" />
            <Text style={styles.uploadingText}>Uploading...</Text>
          </View>
        )}

        {/* Privacy text */}
        <View style={styles.privacyContainer}>
          <Ionicons name="lock-closed-outline" size={14} color={COLORS.textSecondary} />
          <Text style={styles.privacyText}>
            Your photo is only shown to matches
          </Text>
        </View>
      </View>

      {/* Submit Section */}
      <View style={styles.submitSection}>
        <Button
          title="Post Missed Connection"
          onPress={onSubmit}
          loading={isSubmitting}
          disabled={!canSubmit}
          fullWidth
          testID={`${testID}-submit`}
        />
        <GhostButton
          title="Go Back"
          onPress={onBack}
          disabled={isSubmitting}
          testID={`${testID}-seal-back`}
        />
      </View>
    </ScrollView>
  )
})

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.backgroundSecondary,
  },

  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },

  reviewCard: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },

  reviewCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 16,
  },

  reviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },

  avatarThumbnail: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    overflow: 'hidden',
  },

  locationIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },

  reviewRowContent: {
    flex: 1,
  },

  reviewRowLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textPrimary,
    marginBottom: 2,
  },

  reviewNotePreview: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },

  reviewTimePreview: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },

  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 8,
    paddingHorizontal: 8,
  },

  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.border,
  },

  dividerText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginHorizontal: 12,
  },

  photoSection: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },

  photoSectionLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textSecondary,
    marginBottom: 12,
  },

  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: PHOTO_GRID_GAP,
    marginBottom: 12,
  },

  photoTile: {
    width: PHOTO_SIZE,
    height: PHOTO_SIZE,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: darkTheme.cardBackground,
  },

  photoTileSelected: {
    borderWidth: 2,
    borderColor: '#FF6B47',
  },

  photoTileDisabled: {
    opacity: 0.6,
  },

  photoImage: {
    width: '100%',
    height: '100%',
  },

  photoPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: darkTheme.background,
  },

  selectedBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: darkTheme.background,
    borderRadius: 10,
  },

  pendingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  addTile: {
    width: PHOTO_SIZE,
    height: PHOTO_SIZE,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.primary[500],
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 107, 71, 0.1)',
  },

  addTileDisabled: {
    borderColor: 'rgba(255, 107, 71, 0.3)',
    backgroundColor: darkTheme.background,
  },

  uploadingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF6B47',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 12,
  },

  uploadingText: {
    marginLeft: 8,
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },

  privacyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },

  privacyText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },

  submitSection: {
    gap: 12,
  },
})

// ============================================================================
// EXPORTS
// ============================================================================

export default SealStep
