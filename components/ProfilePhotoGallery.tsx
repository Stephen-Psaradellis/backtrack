/**
 * Profile Photo Gallery Component
 *
 * Displays a grid of user's profile photos with status indicators,
 * add photo button, and management actions (delete, set primary).
 *
 * @example
 * ```tsx
 * function ProfileScreen() {
 *   return (
 *     <ProfilePhotoGallery
 *       onAddPhoto={handleAddPhoto}
 *       maxPhotos={5}
 *     />
 *   )
 * }
 * ```
 */

import React, { useCallback, useState } from 'react'
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ActionSheetIOS,
  Platform,
  Dimensions,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useProfilePhotos } from '../hooks/useProfilePhotos'
import { pickSelfieFromCamera, pickSelfieFromGallery } from '../utils/imagePicker'
import { lightFeedback, warningFeedback, successFeedback } from '../lib/haptics'
import type { ProfilePhotoWithUrl } from '../lib/profilePhotos'

// ============================================================================
// TYPES
// ============================================================================

export interface ProfilePhotoGalleryProps {
  /** Callback when a photo is added (optional, uses default behavior if not provided) */
  onPhotoAdded?: () => void
  /** Maximum number of photos allowed (default: 5) */
  maxPhotos?: number
  /** Whether to show the add button (default: true) */
  showAddButton?: boolean
  /** Test ID for testing purposes */
  testID?: string
}

interface PhotoTileProps {
  photo: ProfilePhotoWithUrl
  onDelete: (photoId: string) => void
  onSetPrimary: (photoId: string) => void
  isDeleting: boolean
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

function PhotoTile({ photo, onDelete, onSetPrimary, isDeleting }: PhotoTileProps) {
  const handleLongPress = useCallback(async () => {
    await lightFeedback()

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', 'Set as Primary', 'Delete'],
          destructiveButtonIndex: 2,
          cancelButtonIndex: 0,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) {
            onSetPrimary(photo.id)
          } else if (buttonIndex === 2) {
            confirmDelete()
          }
        }
      )
    } else {
      // Android fallback
      Alert.alert(
        'Photo Options',
        undefined,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Set as Primary',
            onPress: () => onSetPrimary(photo.id),
          },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: confirmDelete,
          },
        ]
      )
    }
  }, [photo.id, onDelete, onSetPrimary])

  const confirmDelete = useCallback(() => {
    Alert.alert(
      'Delete Photo',
      'Are you sure you want to delete this photo?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await warningFeedback()
            onDelete(photo.id)
          },
        },
      ]
    )
  }, [photo.id, onDelete])

  const getStatusBadge = () => {
    switch (photo.moderation_status) {
      case 'pending':
        return (
          <View style={[styles.statusBadge, styles.statusPending]}>
            <ActivityIndicator size="small" color="#FFFFFF" />
          </View>
        )
      case 'approved':
        return (
          <View style={[styles.statusBadge, styles.statusApproved]}>
            <Ionicons name="checkmark" size={14} color="#FFFFFF" />
          </View>
        )
      case 'rejected':
        return (
          <View style={[styles.statusBadge, styles.statusRejected]}>
            <Ionicons name="close" size={14} color="#FFFFFF" />
          </View>
        )
      case 'error':
        return (
          <View style={[styles.statusBadge, styles.statusError]}>
            <Ionicons name="alert" size={14} color="#FFFFFF" />
          </View>
        )
      default:
        return null
    }
  }

  return (
    <TouchableOpacity
      style={styles.photoTile}
      onLongPress={handleLongPress}
      delayLongPress={400}
      activeOpacity={0.8}
      disabled={isDeleting}
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

      {/* Status badge */}
      {getStatusBadge()}

      {/* Primary badge */}
      {photo.is_primary && photo.moderation_status === 'approved' && (
        <View style={styles.primaryBadge}>
          <Ionicons name="star" size={12} color="#FFFFFF" />
        </View>
      )}

      {/* Overlay for rejected photos */}
      {photo.moderation_status === 'rejected' && (
        <View style={styles.rejectedOverlay}>
          <Text style={styles.rejectedText}>Not approved</Text>
        </View>
      )}

      {/* Deleting overlay */}
      {isDeleting && (
        <View style={styles.deletingOverlay}>
          <ActivityIndicator size="small" color="#FFFFFF" />
        </View>
      )}
    </TouchableOpacity>
  )
}

// ============================================================================
// ADD PHOTO TILE COMPONENT
// ============================================================================

function AddPhotoTile({
  onPress,
  disabled,
}: {
  onPress: () => void
  disabled: boolean
}) {
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
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function ProfilePhotoGallery({
  onPhotoAdded,
  maxPhotos = 5,
  showAddButton = true,
  testID = 'profile-photo-gallery',
}: ProfilePhotoGalleryProps) {
  const {
    photos,
    loading,
    uploading,
    deleting,
    error,
    hasReachedLimit,
    uploadPhoto,
    deletePhoto,
    setPrimary,
    clearError,
  } = useProfilePhotos()

  const [deletingPhotoId, setDeletingPhotoId] = useState<string | null>(null)

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
        onPhotoAdded?.()
      }
    }
  }

  const chooseFromLibrary = async () => {
    const result = await pickSelfieFromGallery()
    if (result.success && result.uri) {
      const success = await uploadPhoto(result.uri)
      if (success) {
        await successFeedback()
        onPhotoAdded?.()
      }
    }
  }

  // Handle delete photo
  const handleDeletePhoto = useCallback(async (photoId: string) => {
    setDeletingPhotoId(photoId)
    await deletePhoto(photoId)
    setDeletingPhotoId(null)
  }, [deletePhoto])

  // Handle set primary
  const handleSetPrimary = useCallback(async (photoId: string) => {
    const success = await setPrimary(photoId)
    if (success) {
      await successFeedback()
    }
  }, [setPrimary])

  // Show error alert
  React.useEffect(() => {
    if (error) {
      Alert.alert('Error', error, [
        { text: 'OK', onPress: clearError },
      ])
    }
  }, [error, clearError])

  // Loading state
  if (loading) {
    return (
      <View style={styles.loadingContainer} testID={`${testID}-loading`}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading photos...</Text>
      </View>
    )
  }

  // Empty state (no photos)
  if (photos.length === 0 && showAddButton) {
    return (
      <View style={styles.emptyContainer} testID={`${testID}-empty`}>
        <Ionicons name="camera-outline" size={48} color="#C7C7CC" />
        <Text style={styles.emptyTitle}>No verification photos</Text>
        <Text style={styles.emptyMessage}>
          Add photos of yourself to verify your identity when creating posts.
        </Text>
        <TouchableOpacity
          style={styles.emptyButton}
          onPress={handleAddPhoto}
          disabled={uploading}
        >
          {uploading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.emptyButtonText}>Add Your First Photo</Text>
          )}
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <View style={styles.container} testID={testID}>
      {/* Info text */}
      <Text style={styles.infoText}>
        Long press a photo for options. Approved photos can be used for posts.
      </Text>

      {/* Photo grid */}
      <View style={styles.grid}>
        {photos.map((photo) => (
          <PhotoTile
            key={photo.id}
            photo={photo}
            onDelete={handleDeletePhoto}
            onSetPrimary={handleSetPrimary}
            isDeleting={deletingPhotoId === photo.id}
          />
        ))}

        {/* Add photo tile */}
        {showAddButton && !hasReachedLimit && (
          <AddPhotoTile
            onPress={handleAddPhoto}
            disabled={uploading}
          />
        )}
      </View>

      {/* Uploading overlay */}
      {uploading && (
        <View style={styles.uploadingBanner}>
          <ActivityIndicator size="small" color="#FFFFFF" />
          <Text style={styles.uploadingText}>Uploading photo...</Text>
        </View>
      )}

      {/* Photo count */}
      <Text style={styles.countText}>
        {photos.filter(p => p.moderation_status !== 'rejected').length} of {maxPhotos} photos
      </Text>
    </View>
  )
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: GRID_PADDING,
  },
  loadingContainer: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#8E8E93',
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
  },
  emptyMessage: {
    marginTop: 8,
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyButton: {
    marginTop: 20,
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
    minWidth: 180,
    alignItems: 'center',
  },
  emptyButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  infoText: {
    fontSize: 13,
    color: '#8E8E93',
    marginBottom: 12,
    textAlign: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GRID_GAP,
  },
  photoTile: {
    width: TILE_SIZE,
    height: TILE_SIZE,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#E5E5EA',
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
  statusBadge: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusPending: {
    backgroundColor: '#FF9500',
  },
  statusApproved: {
    backgroundColor: '#34C759',
  },
  statusRejected: {
    backgroundColor: '#FF3B30',
  },
  statusError: {
    backgroundColor: '#FF3B30',
  },
  primaryBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rejectedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rejectedText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  deletingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
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
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 12,
  },
  uploadingText: {
    marginLeft: 8,
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  countText: {
    marginTop: 12,
    fontSize: 13,
    color: '#8E8E93',
    textAlign: 'center',
  },
})

// ============================================================================
// EXPORTS
// ============================================================================

export default ProfilePhotoGallery
