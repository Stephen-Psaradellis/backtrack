/**
 * PhotoStep Component
 *
 * First step in the CreatePost wizard flow. Allows the user to select a
 * verification photo from their profile gallery or upload a new one.
 * The photo verifies the user's identity when creating a post.
 *
 * Features:
 * - Display approved profile photos in a grid
 * - Select existing photo or upload new one
 * - Show photo moderation status (pending, approved, rejected)
 * - Navigate to profile if no photos exist
 *
 * @example
 * ```tsx
 * <PhotoStep
 *   selectedPhotoId={formData.selectedPhotoId}
 *   onPhotoSelect={handlePhotoSelect}
 *   onNext={handleNext}
 *   onBack={handleBack}
 * />
 * ```
 */

import React, { memo, useCallback, useState, useEffect } from 'react'
import {
  View,
  Text,
  Image,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ActionSheetIOS,
  Platform,
  Dimensions,
  SafeAreaView,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'

import { Button, OutlineButton } from '../../../components/Button'
import { useProfilePhotos } from '../../../hooks/useProfilePhotos'
import { pickSelfieFromCamera, pickSelfieFromGallery } from '../../../utils/imagePicker'
import { lightFeedback, successFeedback } from '../../../lib/haptics'
import { COLORS, sharedStyles } from '../styles'
import type { ProfilePhotoWithUrl } from '../../../lib/profilePhotos'

// ============================================================================
// TYPES
// ============================================================================

/**
 * Props for the PhotoStep component
 */
export interface PhotoStepProps {
  /**
   * Currently selected photo ID
   */
  selectedPhotoId: string | null

  /**
   * Callback fired when a photo is selected
   * @param photoId - The selected photo's ID
   */
  onPhotoSelect: (photoId: string) => void

  /**
   * Callback when user wants to proceed to next step
   */
  onNext: () => void

  /**
   * Callback when user wants to go back/cancel
   */
  onBack: () => void

  /**
   * Test ID prefix for testing purposes
   * @default 'create-post'
   */
  testID?: string
}

// ============================================================================
// CONSTANTS
// ============================================================================

const SCREEN_WIDTH = Dimensions.get('window').width
const GRID_PADDING = 16
const GRID_GAP = 8
const NUM_COLUMNS = 3
const TILE_SIZE = (SCREEN_WIDTH - GRID_PADDING * 2 - GRID_GAP * (NUM_COLUMNS - 1)) / NUM_COLUMNS

// ============================================================================
// PHOTO TILE COMPONENT
// ============================================================================

interface PhotoTileProps {
  photo: ProfilePhotoWithUrl
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
          <Ionicons name="image-outline" size={24} color="#8E8E93" />
        </View>
      )}

      {/* Selection indicator */}
      {isSelected && (
        <View style={styles.selectedBadge}>
          <Ionicons name="checkmark-circle" size={24} color="#007AFF" />
        </View>
      )}

      {/* Pending indicator */}
      {isPending && (
        <View style={styles.pendingOverlay}>
          <ActivityIndicator size="small" color="#FFFFFF" />
          <Text style={styles.pendingText}>Checking...</Text>
        </View>
      )}

      {/* Rejected indicator */}
      {photo.moderation_status === 'rejected' && (
        <View style={styles.rejectedOverlay}>
          <Ionicons name="close-circle" size={20} color="#FFFFFF" />
          <Text style={styles.rejectedText}>Not approved</Text>
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
        size={32}
        color={disabled ? '#C7C7CC' : '#007AFF'}
      />
      <Text style={[styles.addText, disabled && styles.addTextDisabled]}>
        Add Photo
      </Text>
    </TouchableOpacity>
  )
})

// ============================================================================
// MAIN COMPONENT
// ============================================================================

/**
 * PhotoStep - Photo selection step in the CreatePost wizard
 *
 * Displays:
 * 1. Grid of approved profile photos
 * 2. Add new photo option
 * 3. Empty state with link to profile if no photos
 * 4. Back/Next navigation buttons
 */
export const PhotoStep = memo(function PhotoStep({
  selectedPhotoId,
  onPhotoSelect,
  onNext,
  onBack,
  testID = 'create-post',
}: PhotoStepProps): JSX.Element {
  const navigation = useNavigation<any>()
  const {
    photos,
    approvedPhotos,
    loading,
    uploading,
    error,
    hasReachedLimit,
    uploadPhoto,
    refresh,
    clearError,
  } = useProfilePhotos()

  // Auto-select first approved photo if none selected
  useEffect(() => {
    if (!selectedPhotoId && approvedPhotos.length > 0) {
      onPhotoSelect(approvedPhotos[0].id)
    }
  }, [selectedPhotoId, approvedPhotos, onPhotoSelect])

  // Handle add photo action
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

  // Handle photo selection
  const handleSelectPhoto = useCallback(async (photoId: string) => {
    await lightFeedback()
    onPhotoSelect(photoId)
  }, [onPhotoSelect])

  // Navigate to profile
  const handleGoToProfile = useCallback(() => {
    navigation.navigate('ProfileTab')
  }, [navigation])

  // Show error alert
  useEffect(() => {
    if (error) {
      Alert.alert('Error', error, [
        { text: 'OK', onPress: clearError },
      ])
    }
  }, [error, clearError])

  // Check if can proceed
  const canProceed = selectedPhotoId && approvedPhotos.some((p) => p.id === selectedPhotoId)

  // ---------------------------------------------------------------------------
  // RENDER: Loading
  // ---------------------------------------------------------------------------

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} testID={`${testID}-photo-loading`}>
        <View style={styles.container}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingText}>Loading your photos...</Text>
          </View>
        </View>
      </SafeAreaView>
    )
  }

  // ---------------------------------------------------------------------------
  // RENDER: Empty state (no photos)
  // ---------------------------------------------------------------------------

  if (approvedPhotos.length === 0 && photos.filter(p => p.moderation_status === 'pending').length === 0) {
    return (
      <SafeAreaView style={styles.safeArea} testID={`${testID}-photo-empty`}>
        <View style={styles.container}>
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.emptyContent}
          >
          <View style={styles.emptyState}>
            <Ionicons name="camera-outline" size={64} color="#C7C7CC" />
            <Text style={styles.emptyTitle}>No Verification Photos</Text>
            <Text style={styles.emptyMessage}>
              You need at least one approved photo to create a post.
              Add a photo of yourself to get started.
            </Text>

            <View style={styles.emptyActions}>
              <Button
                title="Add Photo"
                onPress={handleAddPhoto}
                loading={uploading}
                disabled={uploading}
                fullWidth
                testID={`${testID}-add-first-photo`}
              />
              <OutlineButton
                title="Go to Profile"
                onPress={handleGoToProfile}
                fullWidth
                testID={`${testID}-go-to-profile`}
              />
            </View>
          </View>

          {/* Action buttons */}
          <View style={sharedStyles.stepActions}>
            <OutlineButton
              title="Cancel"
              onPress={onBack}
              testID={`${testID}-photo-cancel`}
            />
          </View>
        </ScrollView>
        </View>
      </SafeAreaView>
    )
  }

  // ---------------------------------------------------------------------------
  // RENDER: Photo grid
  // ---------------------------------------------------------------------------

  return (
    <SafeAreaView style={styles.safeArea} testID={`${testID}-photo-step`}>
      <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Instructions */}
        <Text style={styles.instructions}>
          Select a photo to verify your identity. Only approved photos can be used.
        </Text>

        {/* Photo grid */}
        <View style={styles.grid}>
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

        {/* Uploading indicator */}
        {uploading && (
          <View style={styles.uploadingBanner}>
            <ActivityIndicator size="small" color="#FFFFFF" />
            <Text style={styles.uploadingText}>Uploading photo...</Text>
          </View>
        )}

        {/* Pending photos notice */}
        {photos.some((p) => p.moderation_status === 'pending') && (
          <View style={styles.pendingNotice}>
            <Ionicons name="information-circle-outline" size={18} color="#FF9500" />
            <Text style={styles.pendingNoticeText}>
              Some photos are being verified. This usually takes a few seconds.
            </Text>
          </View>
        )}

        {/* Action buttons */}
        <View style={sharedStyles.stepActions}>
          <OutlineButton
            title="Cancel"
            onPress={onBack}
            testID={`${testID}-photo-back`}
          />
          <Button
            title="Next"
            onPress={onNext}
            disabled={!canProceed}
            testID={`${testID}-photo-next`}
          />
        </View>
      </ScrollView>
      </View>
    </SafeAreaView>
  )
})

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.backgroundSecondary,
  },
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: GRID_PADDING,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#8E8E93',
  },
  emptyContent: {
    flex: 1,
    padding: GRID_PADDING,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    backgroundColor: COLORS.background,
    borderRadius: 12,
    marginBottom: 16,
  },
  emptyTitle: {
    marginTop: 16,
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  emptyMessage: {
    marginTop: 8,
    fontSize: 15,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 16,
  },
  emptyActions: {
    marginTop: 24,
    width: '100%',
    gap: 12,
  },
  instructions: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 16,
    textAlign: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GRID_GAP,
    marginBottom: 16,
  },
  photoTile: {
    width: TILE_SIZE,
    height: TILE_SIZE,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#E5E5EA',
  },
  photoTileSelected: {
    borderWidth: 3,
    borderColor: '#007AFF',
  },
  photoTileDisabled: {
    opacity: 0.7,
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
    backgroundColor: '#F2F2F7',
  },
  selectedBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
  },
  pendingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pendingText: {
    marginTop: 4,
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
  rejectedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rejectedText: {
    marginTop: 4,
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
  addTile: {
    width: TILE_SIZE,
    height: TILE_SIZE,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#007AFF',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8F8FF',
  },
  addTileDisabled: {
    borderColor: '#C7C7CC',
    backgroundColor: '#F2F2F7',
  },
  addText: {
    marginTop: 4,
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '500',
  },
  addTextDisabled: {
    color: '#C7C7CC',
  },
  uploadingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  uploadingText: {
    marginLeft: 8,
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  pendingNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF8E6',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  pendingNoticeText: {
    marginLeft: 8,
    flex: 1,
    color: '#996600',
    fontSize: 13,
    lineHeight: 18,
  },
})

// ============================================================================
// EXPORTS
// ============================================================================

export default PhotoStep
