/**
 * useProfilePhotos Hook
 *
 * React hook for managing user profile photos with real-time updates.
 * Provides state management, actions, and computed values for profile photos.
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const {
 *     photos,
 *     approvedPhotos,
 *     loading,
 *     uploading,
 *     uploadPhoto,
 *     deletePhoto,
 *     setPrimary,
 *   } = useProfilePhotos()
 *
 *   return (
 *     <View>
 *       {loading ? <Spinner /> : (
 *         photos.map(photo => <PhotoTile key={photo.id} photo={photo} />)
 *       )}
 *       <Button onPress={() => uploadPhoto(imageUri)} disabled={uploading}>
 *         Add Photo
 *       </Button>
 *     </View>
 *   )
 * }
 * ```
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  uploadProfilePhoto,
  getProfilePhotos,
  getApprovedPhotos,
  deleteProfilePhoto,
  setPrimaryPhoto,
  hasApprovedPhoto,
  getPrimaryPhoto,
  getPhotoCount,
  subscribeToPhotoChanges,
  MAX_PROFILE_PHOTOS,
  type ProfilePhotoWithUrl,
} from '../lib/profilePhotos'
import type { ModerationStatus } from '../types/database'

// ============================================================================
// TYPES
// ============================================================================

export interface UseProfilePhotosResult {
  /** All profile photos (including pending/rejected) */
  photos: ProfilePhotoWithUrl[]
  /** Only approved photos (for selection) */
  approvedPhotos: ProfilePhotoWithUrl[]
  /** The user's primary photo */
  primaryPhoto: ProfilePhotoWithUrl | null
  /** Whether photos are being loaded */
  loading: boolean
  /** Whether a photo is being uploaded */
  uploading: boolean
  /** Whether a photo is being deleted */
  deleting: boolean
  /** Last error message */
  error: string | null
  /** Whether user has any approved photos */
  hasApprovedPhotos: boolean
  /** Whether user has reached photo limit */
  hasReachedLimit: boolean
  /** Current photo count */
  photoCount: number

  // Actions
  /** Upload a new photo */
  uploadPhoto: (imageUri: string) => Promise<boolean>
  /** Delete a photo */
  deletePhoto: (photoId: string) => Promise<boolean>
  /** Set a photo as primary */
  setPrimary: (photoId: string) => Promise<boolean>
  /** Refresh photos from server */
  refresh: () => Promise<void>
  /** Clear error */
  clearError: () => void
}

// ============================================================================
// HOOK
// ============================================================================

export function useProfilePhotos(): UseProfilePhotosResult {
  // State
  const [photos, setPhotos] = useState<ProfilePhotoWithUrl[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Computed values
  const approvedPhotos = useMemo(
    () => photos.filter((p) => p.moderation_status === 'approved'),
    [photos]
  )

  const primaryPhoto = useMemo(
    () => approvedPhotos.find((p) => p.is_primary) ?? approvedPhotos[0] ?? null,
    [approvedPhotos]
  )

  const hasApprovedPhotos = approvedPhotos.length > 0

  const photoCount = useMemo(
    () => photos.filter((p) => p.moderation_status !== 'rejected' && p.moderation_status !== 'error').length,
    [photos]
  )

  const hasReachedLimit = photoCount >= MAX_PROFILE_PHOTOS

  // Load photos
  const loadPhotos = useCallback(async () => {
    try {
      const fetchedPhotos = await getProfilePhotos()
      setPhotos(fetchedPhotos)
    } catch (err) {
      console.error('Error loading photos:', err)
      setError('Failed to load photos')
    }
  }, [])

  // Initial load
  useEffect(() => {
    let isMounted = true

    const load = async () => {
      setLoading(true)
      try {
        const fetchedPhotos = await getProfilePhotos()
        if (isMounted) {
          setPhotos(fetchedPhotos)
        }
      } catch (err) {
        console.error('Error loading photos:', err)
        if (isMounted) {
          setError('Failed to load photos')
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    load()

    return () => {
      isMounted = false
    }
  }, [])

  // Subscribe to real-time updates
  useEffect(() => {
    const unsubscribe = subscribeToPhotoChanges((updatedPhotos) => {
      // Re-fetch to get signed URLs
      loadPhotos()
    })

    return () => {
      unsubscribe()
    }
  }, [loadPhotos])

  // Actions
  const uploadPhoto = useCallback(async (imageUri: string): Promise<boolean> => {
    if (hasReachedLimit) {
      setError(`Maximum ${MAX_PROFILE_PHOTOS} photos allowed`)
      return false
    }

    setUploading(true)
    setError(null)

    try {
      const result = await uploadProfilePhoto(imageUri)

      if (!result.success) {
        setError(result.error || 'Failed to upload photo')
        return false
      }

      // Refresh photos to include the new one
      await loadPhotos()
      return true
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to upload photo'
      setError(message)
      return false
    } finally {
      setUploading(false)
    }
  }, [hasReachedLimit, loadPhotos])

  const deletePhoto = useCallback(async (photoId: string): Promise<boolean> => {
    setDeleting(true)
    setError(null)

    try {
      const result = await deleteProfilePhoto(photoId)

      if (!result.success) {
        setError(result.error || 'Failed to delete photo')
        return false
      }

      // Remove from local state immediately for responsiveness
      setPhotos((prev) => prev.filter((p) => p.id !== photoId))
      return true
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete photo'
      setError(message)
      return false
    } finally {
      setDeleting(false)
    }
  }, [])

  const setPrimary = useCallback(async (photoId: string): Promise<boolean> => {
    setError(null)

    try {
      const result = await setPrimaryPhoto(photoId)

      if (!result.success) {
        setError(result.error || 'Failed to set primary photo')
        return false
      }

      // Update local state
      setPhotos((prev) =>
        prev.map((p) => ({
          ...p,
          is_primary: p.id === photoId,
        }))
      )
      return true
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to set primary photo'
      setError(message)
      return false
    }
  }, [])

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      await loadPhotos()
    } finally {
      setLoading(false)
    }
  }, [loadPhotos])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  return {
    photos,
    approvedPhotos,
    primaryPhoto,
    loading,
    uploading,
    deleting,
    error,
    hasApprovedPhotos,
    hasReachedLimit,
    photoCount,
    uploadPhoto,
    deletePhoto,
    setPrimary,
    refresh,
    clearError,
  }
}

export default useProfilePhotos
