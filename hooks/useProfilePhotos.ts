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

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
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
  retryPhotoModeration,
  MAX_PROFILE_PHOTOS,
  type ProfilePhotoWithUrl,
} from '../lib/profilePhotos'
import type { ModerationStatus } from '../types/database'

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Timeout for photo moderation in milliseconds (30 seconds)
 * If a photo is pending for longer than this, it's considered timed out
 */
const MODERATION_TIMEOUT_MS = 30 * 1000

/**
 * Interval for checking moderation timeouts (5 seconds)
 */
const TIMEOUT_CHECK_INTERVAL_MS = 5 * 1000

// ============================================================================
// TYPES
// ============================================================================

export interface ProfilePhotoWithTimeout extends ProfilePhotoWithUrl {
  /** Whether this photo has timed out waiting for moderation */
  isTimedOut?: boolean
  /** Whether this photo is in error state */
  hasError?: boolean
}

export interface UseProfilePhotosResult {
  /** All profile photos (including pending/rejected) with timeout info */
  photos: ProfilePhotoWithTimeout[]
  /** Only approved photos (for selection) */
  approvedPhotos: ProfilePhotoWithTimeout[]
  /** The user's primary photo */
  primaryPhoto: ProfilePhotoWithTimeout | null
  /** Whether photos are being loaded */
  loading: boolean
  /** Whether a photo is being uploaded */
  uploading: boolean
  /** Whether a photo is being deleted */
  deleting: boolean
  /** Whether a retry is in progress */
  retrying: boolean
  /** Last error message */
  error: string | null
  /** Whether user has any approved photos */
  hasApprovedPhotos: boolean
  /** Whether user has reached photo limit */
  hasReachedLimit: boolean
  /** Current photo count */
  photoCount: number
  /** Whether any photos have timed out */
  hasTimedOutPhotos: boolean
  /** Whether any photos are in error state */
  hasErrorPhotos: boolean
  /** Whether any photos need attention (timed out or error) */
  hasPhotosNeedingAttention: boolean

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
  /** Retry moderation for a failed/timed-out photo */
  retryModeration: (photoId: string) => Promise<boolean>
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
  const [retrying, setRetrying] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Track when photos started pending (for timeout detection)
  const pendingStartTimes = useRef<Map<string, number>>(new Map())

  // Force re-render for timeout updates
  const [, forceUpdate] = useState(0)

  // Helper to check if a photo has timed out
  const isPhotoTimedOut = useCallback((photo: ProfilePhotoWithUrl): boolean => {
    if (photo.moderation_status !== 'pending') {
      return false
    }

    const startTime = pendingStartTimes.current.get(photo.id)
    if (!startTime) {
      // First time seeing this pending photo, record the start time
      pendingStartTimes.current.set(photo.id, Date.now())
      return false
    }

    return Date.now() - startTime > MODERATION_TIMEOUT_MS
  }, [])

  // Photos with timeout and error info
  const photosWithTimeout: ProfilePhotoWithTimeout[] = useMemo(
    () => photos.map((p) => ({
      ...p,
      isTimedOut: isPhotoTimedOut(p),
      hasError: p.moderation_status === 'error',
    })),
    [photos, isPhotoTimedOut]
  )

  // Computed values
  const approvedPhotos = useMemo(
    () => photosWithTimeout.filter((p) => p.moderation_status === 'approved'),
    [photosWithTimeout]
  )

  const primaryPhoto = useMemo(
    () => approvedPhotos.find((p) => p.is_primary) ?? approvedPhotos[0] ?? null,
    [approvedPhotos]
  )

  const hasApprovedPhotos = approvedPhotos.length > 0

  const hasTimedOutPhotos = useMemo(
    () => photosWithTimeout.some((p) => p.isTimedOut),
    [photosWithTimeout]
  )

  const hasErrorPhotos = useMemo(
    () => photosWithTimeout.some((p) => p.hasError),
    [photosWithTimeout]
  )

  const hasPhotosNeedingAttention = hasTimedOutPhotos || hasErrorPhotos

  const photoCount = useMemo(
    () => photos.filter((p) => p.moderation_status !== 'rejected' && p.moderation_status !== 'error').length,
    [photos]
  )

  const hasReachedLimit = photoCount >= MAX_PROFILE_PHOTOS

  // Check for timeouts periodically
  useEffect(() => {
    const hasPendingPhotos = photos.some((p) => p.moderation_status === 'pending')

    if (!hasPendingPhotos) {
      return
    }

    const intervalId = setInterval(() => {
      // Force re-render to update timeout status
      forceUpdate((n) => n + 1)
    }, TIMEOUT_CHECK_INTERVAL_MS)

    return () => clearInterval(intervalId)
  }, [photos])

  // Clean up pending start times when photos are no longer pending
  useEffect(() => {
    const currentPendingIds = new Set(
      photos.filter((p) => p.moderation_status === 'pending').map((p) => p.id)
    )

    // Remove entries for photos that are no longer pending
    for (const id of pendingStartTimes.current.keys()) {
      if (!currentPendingIds.has(id)) {
        pendingStartTimes.current.delete(id)
      }
    }
  }, [photos])

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

  // Retry moderation for a failed or timed-out photo
  const retryModeration = useCallback(async (photoId: string): Promise<boolean> => {
    setRetrying(true)
    setError(null)

    try {
      // Reset the timeout timer for this photo
      pendingStartTimes.current.delete(photoId)

      // Call the library function to actually retry moderation
      const result = await retryPhotoModeration(photoId)

      if (!result.success) {
        setError(result.error || 'Failed to retry photo verification')
        return false
      }

      // Refresh photos to get updated status
      await loadPhotos()

      // If status is already approved or rejected, we're done
      if (result.status === 'approved' || result.status === 'rejected') {
        return result.status === 'approved'
      }

      // Otherwise, moderation is now pending - it should complete via realtime update
      return true
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to retry verification'
      setError(message)
      return false
    } finally {
      setRetrying(false)
    }
  }, [loadPhotos])

  return {
    photos: photosWithTimeout,
    approvedPhotos,
    primaryPhoto,
    loading,
    uploading,
    deleting,
    retrying,
    error,
    hasApprovedPhotos,
    hasReachedLimit,
    photoCount,
    hasTimedOutPhotos,
    hasErrorPhotos,
    hasPhotosNeedingAttention,
    uploadPhoto,
    deletePhoto,
    setPrimary,
    refresh,
    clearError,
    retryModeration,
  }
}

export default useProfilePhotos
