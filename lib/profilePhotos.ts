/**
 * Profile Photos Service
 *
 * Handles profile photo management including upload, retrieval, deletion,
 * and moderation triggering. Profile photos are stored in Supabase Storage
 * and moderated via Google Cloud Vision SafeSearch API.
 *
 * @example
 * ```tsx
 * import { uploadProfilePhoto, getApprovedPhotos } from 'lib/profilePhotos'
 *
 * // Upload a new profile photo
 * const result = await uploadProfilePhoto(userId, imageUri)
 * if (result.success) {
 *   // Photo is now pending moderation
 *   console.log('Photo uploaded, awaiting moderation')
 * }
 *
 * // Get approved photos for post creation
 * const photos = await getApprovedPhotos(userId)
 * ```
 */

import { supabase, supabaseUrl } from './supabase'
import {
  uploadProfilePhoto as uploadToStorage,
  deletePhotoByPath,
  getSignedUrlFromPath,
} from './storage'
import type {
  ProfilePhoto,
  ProfilePhotoInsert,
  ModerationStatus,
} from '../types/database'

// ============================================================================
// TYPES
// ============================================================================

export interface UploadProfilePhotoResult {
  success: boolean
  photo: ProfilePhoto | null
  error: string | null
}

export interface DeleteProfilePhotoResult {
  success: boolean
  error: string | null
}

export interface SetPrimaryPhotoResult {
  success: boolean
  error: string | null
}

export interface ProfilePhotoWithUrl extends ProfilePhoto {
  signedUrl: string | null
}

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Maximum number of profile photos per user
 */
export const MAX_PROFILE_PHOTOS = 5

/**
 * Error messages
 */
export const PROFILE_PHOTO_ERRORS = {
  UPLOAD_FAILED: 'Failed to upload photo. Please try again.',
  DELETE_FAILED: 'Failed to delete photo.',
  SET_PRIMARY_FAILED: 'Failed to set photo as primary.',
  MAX_PHOTOS_REACHED: `You can only have ${MAX_PROFILE_PHOTOS} photos. Please delete one first.`,
  PHOTO_NOT_FOUND: 'Photo not found.',
  NOT_AUTHENTICATED: 'You must be signed in to manage photos.',
  MODERATION_TRIGGER_FAILED: 'Photo uploaded but moderation check failed.',
} as const

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Generate a UUID for a new photo
 */
function generatePhotoId(): string {
  return crypto.randomUUID()
}

/**
 * Get the current authenticated user ID
 */
async function getCurrentUserId(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser()
  return user?.id ?? null
}

/**
 * Trigger the moderation Edge Function for a photo
 */
async function triggerModeration(photoId: string, storagePath: string): Promise<void> {
  try {
    const { error } = await supabase.functions.invoke('moderate-image', {
      body: {
        photo_id: photoId,
        storage_path: storagePath,
      },
    })

    if (error) {
      console.error('Failed to trigger moderation:', error)
      // Don't throw - photo is still uploaded, just pending manual review
    }
  } catch (err) {
    console.error('Error invoking moderation function:', err)
    // Don't throw - photo is still uploaded, just pending manual review
  }
}

// ============================================================================
// MAIN FUNCTIONS
// ============================================================================

/**
 * Upload a new profile photo
 *
 * Uploads the photo to storage, creates a database record, and triggers
 * content moderation. The photo starts in 'pending' status and will be
 * updated to 'approved' or 'rejected' by the moderation function.
 *
 * @param imageUri - Local file URI of the image to upload
 * @returns Upload result with the new photo record
 */
export async function uploadProfilePhoto(
  imageUri: string
): Promise<UploadProfilePhotoResult> {
  // Get current user
  const userId = await getCurrentUserId()
  if (!userId) {
    return {
      success: false,
      photo: null,
      error: PROFILE_PHOTO_ERRORS.NOT_AUTHENTICATED,
    }
  }

  try {
    // Check photo count limit
    const { count, error: countError } = await supabase
      .from('profile_photos')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .in('moderation_status', ['pending', 'approved'])

    if (countError) {
      console.error('Error checking photo count:', countError)
    } else if (count !== null && count >= MAX_PROFILE_PHOTOS) {
      return {
        success: false,
        photo: null,
        error: PROFILE_PHOTO_ERRORS.MAX_PHOTOS_REACHED,
      }
    }

    // Generate photo ID
    const photoId = generatePhotoId()

    // Upload to storage
    const uploadResult = await uploadToStorage(userId, photoId, imageUri)
    if (!uploadResult.success || !uploadResult.path) {
      return {
        success: false,
        photo: null,
        error: uploadResult.error || PROFILE_PHOTO_ERRORS.UPLOAD_FAILED,
      }
    }

    // Check if this is the first photo (should be primary)
    const { count: existingCount } = await supabase
      .from('profile_photos')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('moderation_status', 'approved')

    const isFirst = existingCount === 0

    // Create database record
    const photoInsert: ProfilePhotoInsert = {
      id: photoId,
      user_id: userId,
      storage_path: uploadResult.path,
      moderation_status: 'pending',
      is_primary: isFirst, // First approved photo will become primary
    }

    const { data: photo, error: insertError } = await supabase
      .from('profile_photos')
      .insert(photoInsert)
      .select()
      .single()

    if (insertError || !photo) {
      // Try to clean up the uploaded file
      await deletePhotoByPath(uploadResult.path)
      return {
        success: false,
        photo: null,
        error: insertError?.message || PROFILE_PHOTO_ERRORS.UPLOAD_FAILED,
      }
    }

    // Trigger moderation (don't wait for it)
    triggerModeration(photoId, uploadResult.path)

    return {
      success: true,
      photo: photo as ProfilePhoto,
      error: null,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : PROFILE_PHOTO_ERRORS.UPLOAD_FAILED
    return {
      success: false,
      photo: null,
      error: message,
    }
  }
}

/**
 * Get all profile photos for the current user
 *
 * Returns photos in order: primary first, then by created_at descending.
 * Includes signed URLs for displaying the photos.
 *
 * @returns Array of profile photos with signed URLs
 */
export async function getProfilePhotos(): Promise<ProfilePhotoWithUrl[]> {
  const userId = await getCurrentUserId()
  if (!userId) {
    return []
  }

  try {
    const { data: photos, error } = await supabase
      .from('profile_photos')
      .select('*')
      .eq('user_id', userId)
      .order('is_primary', { ascending: false })
      .order('created_at', { ascending: false })

    if (error || !photos) {
      console.error('Error fetching profile photos:', error)
      return []
    }

    // Get signed URLs for all photos
    const photosWithUrls: ProfilePhotoWithUrl[] = await Promise.all(
      photos.map(async (photo) => {
        const urlResult = await getSignedUrlFromPath(photo.storage_path)
        return {
          ...photo,
          signedUrl: urlResult.success ? urlResult.signedUrl : null,
        } as ProfilePhotoWithUrl
      })
    )

    return photosWithUrls
  } catch (error) {
    console.error('Error getting profile photos:', error)
    return []
  }
}

/**
 * Get approved profile photos for the current user
 *
 * Returns only photos that have passed content moderation.
 * Used when selecting a photo for post creation.
 *
 * @returns Array of approved profile photos with signed URLs
 */
export async function getApprovedPhotos(): Promise<ProfilePhotoWithUrl[]> {
  const userId = await getCurrentUserId()
  if (!userId) {
    return []
  }

  try {
    const { data: photos, error } = await supabase
      .from('profile_photos')
      .select('*')
      .eq('user_id', userId)
      .eq('moderation_status', 'approved')
      .order('is_primary', { ascending: false })
      .order('created_at', { ascending: false })

    if (error || !photos) {
      console.error('Error fetching approved photos:', error)
      return []
    }

    // Get signed URLs for all photos
    const photosWithUrls: ProfilePhotoWithUrl[] = await Promise.all(
      photos.map(async (photo) => {
        const urlResult = await getSignedUrlFromPath(photo.storage_path)
        return {
          ...photo,
          signedUrl: urlResult.success ? urlResult.signedUrl : null,
        } as ProfilePhotoWithUrl
      })
    )

    return photosWithUrls
  } catch (error) {
    console.error('Error getting approved photos:', error)
    return []
  }
}

/**
 * Get a single photo by ID
 *
 * @param photoId - The photo's UUID
 * @returns The photo with signed URL, or null if not found
 */
export async function getPhotoById(photoId: string): Promise<ProfilePhotoWithUrl | null> {
  const userId = await getCurrentUserId()
  if (!userId) {
    return null
  }

  try {
    const { data: photo, error } = await supabase
      .from('profile_photos')
      .select('*')
      .eq('id', photoId)
      .eq('user_id', userId)
      .single()

    if (error || !photo) {
      return null
    }

    const urlResult = await getSignedUrlFromPath(photo.storage_path)
    return {
      ...photo,
      signedUrl: urlResult.success ? urlResult.signedUrl : null,
    } as ProfilePhotoWithUrl
  } catch (error) {
    console.error('Error getting photo by ID:', error)
    return null
  }
}

/**
 * Delete a profile photo
 *
 * Removes the photo from both the database and storage.
 * If deleting the primary photo, another approved photo will become primary.
 *
 * @param photoId - The photo's UUID
 * @returns Delete result
 */
export async function deleteProfilePhoto(
  photoId: string
): Promise<DeleteProfilePhotoResult> {
  const userId = await getCurrentUserId()
  if (!userId) {
    return {
      success: false,
      error: PROFILE_PHOTO_ERRORS.NOT_AUTHENTICATED,
    }
  }

  try {
    // Get the photo to find storage path and check if primary
    const { data: photo, error: fetchError } = await supabase
      .from('profile_photos')
      .select('*')
      .eq('id', photoId)
      .eq('user_id', userId)
      .single()

    if (fetchError || !photo) {
      return {
        success: false,
        error: PROFILE_PHOTO_ERRORS.PHOTO_NOT_FOUND,
      }
    }

    const wasPrimary = photo.is_primary

    // Delete from database first
    const { error: deleteError } = await supabase
      .from('profile_photos')
      .delete()
      .eq('id', photoId)
      .eq('user_id', userId)

    if (deleteError) {
      return {
        success: false,
        error: deleteError.message || PROFILE_PHOTO_ERRORS.DELETE_FAILED,
      }
    }

    // Delete from storage
    await deletePhotoByPath(photo.storage_path)

    // If this was the primary photo, set another one as primary
    if (wasPrimary) {
      const { data: nextPhoto } = await supabase
        .from('profile_photos')
        .select('id')
        .eq('user_id', userId)
        .eq('moderation_status', 'approved')
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (nextPhoto) {
        await supabase
          .from('profile_photos')
          .update({ is_primary: true })
          .eq('id', nextPhoto.id)
      }
    }

    return {
      success: true,
      error: null,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : PROFILE_PHOTO_ERRORS.DELETE_FAILED
    return {
      success: false,
      error: message,
    }
  }
}

/**
 * Set a photo as the primary photo
 *
 * The primary photo is shown first and used as the default for posts.
 * Only approved photos can be set as primary.
 *
 * @param photoId - The photo's UUID
 * @returns Set primary result
 */
export async function setPrimaryPhoto(
  photoId: string
): Promise<SetPrimaryPhotoResult> {
  const userId = await getCurrentUserId()
  if (!userId) {
    return {
      success: false,
      error: PROFILE_PHOTO_ERRORS.NOT_AUTHENTICATED,
    }
  }

  try {
    // Verify the photo exists and is approved
    const { data: photo, error: fetchError } = await supabase
      .from('profile_photos')
      .select('moderation_status')
      .eq('id', photoId)
      .eq('user_id', userId)
      .single()

    if (fetchError || !photo) {
      return {
        success: false,
        error: PROFILE_PHOTO_ERRORS.PHOTO_NOT_FOUND,
      }
    }

    if (photo.moderation_status !== 'approved') {
      return {
        success: false,
        error: 'Only approved photos can be set as primary.',
      }
    }

    // Use the database function to handle the update
    const { error: updateError } = await supabase.rpc('set_primary_photo', {
      p_photo_id: photoId,
    })

    if (updateError) {
      return {
        success: false,
        error: updateError.message || PROFILE_PHOTO_ERRORS.SET_PRIMARY_FAILED,
      }
    }

    return {
      success: true,
      error: null,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : PROFILE_PHOTO_ERRORS.SET_PRIMARY_FAILED
    return {
      success: false,
      error: message,
    }
  }
}

/**
 * Check if the current user has any approved photos
 *
 * @returns Whether the user has at least one approved photo
 */
export async function hasApprovedPhoto(): Promise<boolean> {
  const userId = await getCurrentUserId()
  if (!userId) {
    return false
  }

  try {
    const { count, error } = await supabase
      .from('profile_photos')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('moderation_status', 'approved')

    if (error) {
      console.error('Error checking for approved photos:', error)
      return false
    }

    return (count ?? 0) > 0
  } catch (error) {
    console.error('Error checking for approved photos:', error)
    return false
  }
}

/**
 * Get the primary photo for the current user
 *
 * Returns the primary photo if one exists, otherwise the most recent
 * approved photo.
 *
 * @returns The primary photo with signed URL, or null if none exists
 */
export async function getPrimaryPhoto(): Promise<ProfilePhotoWithUrl | null> {
  const userId = await getCurrentUserId()
  if (!userId) {
    return null
  }

  try {
    // First try to get the primary photo
    let { data: photo, error } = await supabase
      .from('profile_photos')
      .select('*')
      .eq('user_id', userId)
      .eq('moderation_status', 'approved')
      .eq('is_primary', true)
      .single()

    // If no primary, get the most recent approved
    if (error || !photo) {
      const result = await supabase
        .from('profile_photos')
        .select('*')
        .eq('user_id', userId)
        .eq('moderation_status', 'approved')
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      photo = result.data
      error = result.error
    }

    if (error || !photo) {
      return null
    }

    const urlResult = await getSignedUrlFromPath(photo.storage_path)
    return {
      ...photo,
      signedUrl: urlResult.success ? urlResult.signedUrl : null,
    } as ProfilePhotoWithUrl
  } catch (error) {
    console.error('Error getting primary photo:', error)
    return null
  }
}

/**
 * Get the count of profile photos for the current user
 *
 * Counts photos that are pending or approved (excludes rejected/error).
 *
 * @returns The number of active photos
 */
export async function getPhotoCount(): Promise<number> {
  const userId = await getCurrentUserId()
  if (!userId) {
    return 0
  }

  try {
    const { count, error } = await supabase
      .from('profile_photos')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .in('moderation_status', ['pending', 'approved'])

    if (error) {
      console.error('Error getting photo count:', error)
      return 0
    }

    return count ?? 0
  } catch (error) {
    console.error('Error getting photo count:', error)
    return 0
  }
}

/**
 * Subscribe to changes in the user's profile photos
 *
 * Useful for real-time updates when moderation status changes.
 *
 * @param callback - Function to call when photos change
 * @returns Unsubscribe function
 */
export function subscribeToPhotoChanges(
  callback: (photos: ProfilePhoto[]) => void
): () => void {
  const channel = supabase
    .channel('profile_photos_changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'profile_photos',
      },
      async () => {
        // Refetch all photos when any change occurs
        const photos = await getProfilePhotos()
        callback(photos)
      }
    )
    .subscribe()

  return () => {
    channel.unsubscribe()
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  uploadProfilePhoto,
  getProfilePhotos,
  getApprovedPhotos,
  getPhotoById,
  deleteProfilePhoto,
  setPrimaryPhoto,
  hasApprovedPhoto,
  getPrimaryPhoto,
  getPhotoCount,
  subscribeToPhotoChanges,
  MAX_PROFILE_PHOTOS,
  PROFILE_PHOTO_ERRORS,
}
