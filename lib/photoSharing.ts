/**
 * Photo Sharing Service
 *
 * Handles privacy-first photo sharing functionality where users can selectively
 * share their profile photos with specific matches in conversations. Photos
 * remain private by default until explicitly shared.
 *
 * Key Principles:
 * - Photos are private until shared
 * - Sharing is per-conversation (match-specific)
 * - Photos shared in one conversation remain private in others
 * - Only approved (moderated) photos can be shared
 * - Sharing is idempotent (re-sharing same photo is a no-op)
 *
 * @example
 * ```tsx
 * import { sharePhotoWithMatch, getSharedPhotosForConversation } from 'lib/photoSharing'
 *
 * // Share a photo with your match in a conversation
 * const result = await sharePhotoWithMatch(photoId, conversationId)
 * if (result.success) {
 *   console.log('Photo shared successfully')
 * }
 *
 * // Get photos shared with you in a conversation
 * const sharedPhotos = await getSharedPhotosForConversation(conversationId)
 * ```
 */

import { supabase } from './supabase'
import { getSignedUrlFromPath } from './storage'
import { captureException } from './sentry'
import { trackEvent, AnalyticsEvent } from './analytics'
import type {
  PhotoShare,
  PhotoShareInsert,
} from '../types/database'

// ============================================================================
// TYPES
// ============================================================================

export interface SharePhotoResult {
  success: boolean
  share: PhotoShare | null
  error: string | null
}

export interface UnsharePhotoResult {
  success: boolean
  error: string | null
}

/**
 * Photo shared with the current user, including signed URL for display
 */
export interface SharedPhotoWithUrl {
  share_id: string
  photo_id: string
  owner_id: string
  storage_path: string
  is_primary: boolean
  shared_at: string
  signedUrl: string | undefined
}

/**
 * Photo that the current user has shared with others
 */
export interface MySharedPhotoWithUrl {
  share_id: string
  photo_id: string
  shared_with_user_id: string
  storage_path: string
  is_primary: boolean
  shared_at: string
  signedUrl: string | undefined
}

/**
 * Record of a photo share (where/when/with whom a photo was shared)
 */
export interface PhotoShareRecord {
  share_id: string
  conversation_id: string
  shared_with_user_id: string
  shared_at: string
}

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Error messages for photo sharing operations
 */
export const PHOTO_SHARING_ERRORS = {
  NOT_AUTHENTICATED: 'You must be signed in to share photos.',
  PHOTO_NOT_FOUND: 'Photo not found.',
  PHOTO_NOT_APPROVED: 'Only approved photos can be shared.',
  PHOTO_PENDING_MODERATION: 'This photo is still being reviewed. Please wait for approval before sharing.',
  PHOTO_REJECTED: 'This photo was rejected during review and cannot be shared.',
  PHOTO_NOT_OWNED: 'You can only share your own photos.',
  CONVERSATION_NOT_FOUND: 'Conversation not found.',
  NOT_IN_CONVERSATION: 'You are not a participant in this conversation.',
  SHARE_FAILED: 'Failed to share photo. Please try again.',
  UNSHARE_FAILED: 'Failed to unshare photo. Please try again.',
  FETCH_FAILED: 'Failed to load shared photos.',
  SHARE_NOT_FOUND: 'Photo share not found.',
} as const

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get the current authenticated user ID
 */
async function getCurrentUserId(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser()
  return user?.id ?? null
}

/**
 * Get the other user ID in a conversation (the match)
 */
async function getMatchUserId(
  conversationId: string,
  currentUserId: string
): Promise<string | null> {
  const { data: conversation, error } = await supabase
    .from('conversations')
    .select('producer_id, consumer_id')
    .eq('id', conversationId)
    .single()

  if (error || !conversation) {
    return null
  }

  // Return the other user in the conversation
  if (conversation.producer_id === currentUserId) {
    return conversation.consumer_id
  } else if (conversation.consumer_id === currentUserId) {
    return conversation.producer_id
  }

  // User is not in this conversation
  return null
}

// ============================================================================
// MAIN FUNCTIONS
// ============================================================================

/**
 * Share a photo with a match in a specific conversation
 *
 * Creates a share record that grants the match visibility to the photo.
 * The share is scoped to the conversation - the photo remains private
 * in other conversations with different matches.
 *
 * @param photoId - The photo's UUID to share
 * @param conversationId - The conversation where sharing occurs
 * @returns Share result with the created record
 */
export async function sharePhotoWithMatch(
  photoId: string,
  conversationId: string
): Promise<SharePhotoResult> {
  try {
    // Get current user
    const userId = await getCurrentUserId()
    if (!userId) {
      return {
        success: false,
        share: null,
        error: PHOTO_SHARING_ERRORS.NOT_AUTHENTICATED,
      }
    }

    // Validate photo ownership and approval status
    const { data: photo, error: photoError } = await supabase
      .from('profile_photos')
      .select('*')
      .eq('id', photoId)
      .eq('user_id', userId)
      .single()

    if (photoError || !photo) {
      return {
        success: false,
        share: null,
        error: PHOTO_SHARING_ERRORS.PHOTO_NOT_FOUND,
      }
    }

    // SECURITY: Prevent sharing photos before moderation completes (race condition fix)
    // Must explicitly check for 'approved' status to prevent sharing during moderation
    if (photo.moderation_status === 'pending') {
      return {
        success: false,
        share: null,
        error: PHOTO_SHARING_ERRORS.PHOTO_PENDING_MODERATION,
      }
    }

    if (photo.moderation_status === 'rejected') {
      return {
        success: false,
        share: null,
        error: PHOTO_SHARING_ERRORS.PHOTO_REJECTED,
      }
    }

    if (photo.moderation_status !== 'approved') {
      // Catch-all for any other status (error, etc.)
      return {
        success: false,
        share: null,
        error: PHOTO_SHARING_ERRORS.PHOTO_NOT_APPROVED,
      }
    }

    // Get the match user ID from the conversation
    const matchUserId = await getMatchUserId(conversationId, userId)
    if (!matchUserId) {
      return {
        success: false,
        share: null,
        error: PHOTO_SHARING_ERRORS.NOT_IN_CONVERSATION,
      }
    }

    // Create share record (upsert to handle re-sharing idempotently)
    const shareInsert: PhotoShareInsert = {
      photo_id: photoId,
      owner_id: userId,
      shared_with_user_id: matchUserId,
      conversation_id: conversationId,
    }

    const { data: share, error: shareError } = await supabase
      .from('photo_shares')
      .upsert(shareInsert, {
        onConflict: 'photo_id,shared_with_user_id,conversation_id',
      })
      .select()
      .single()

    if (shareError) {
      return {
        success: false,
        share: null,
        error: shareError.message || PHOTO_SHARING_ERRORS.SHARE_FAILED,
      }
    }

    // Track photo share (no photo content or metadata, just the event)
    trackEvent(AnalyticsEvent.PHOTO_SHARED)

    return {
      success: true,
      share: share as PhotoShare,
      error: null,
    }
  } catch (error) {
    captureException(error, { operation: 'sharePhotoWithMatch', photoId, conversationId })
    const message = error instanceof Error ? error.message : PHOTO_SHARING_ERRORS.SHARE_FAILED
    return {
      success: false,
      share: null,
      error: message,
    }
  }
}

/**
 * Share a photo with a match (alias for sharePhotoWithMatch)
 *
 * Convenience function that provides a shorter name for common usage.
 *
 * @param photoId - The photo's UUID to share
 * @param conversationId - The conversation where sharing occurs
 * @returns Share result with the created record
 */
export async function sharePhoto(
  photoId: string,
  conversationId: string
): Promise<SharePhotoResult> {
  return sharePhotoWithMatch(photoId, conversationId)
}

/**
 * Unshare a photo from a specific conversation
 *
 * Removes the share record, revoking the match's visibility to the photo.
 * Other shares of the same photo in different conversations are unaffected.
 *
 * @param photoId - The photo's UUID to unshare
 * @param conversationId - The conversation to unshare from
 * @returns Unshare result
 */
export async function unsharePhotoFromMatch(
  photoId: string,
  conversationId: string
): Promise<UnsharePhotoResult> {
  try {
    // Get current user
    const userId = await getCurrentUserId()
    if (!userId) {
      return {
        success: false,
        error: PHOTO_SHARING_ERRORS.NOT_AUTHENTICATED,
      }
    }

    // Delete the share record
    // RLS policies ensure only the owner can delete their shares
    const { error: deleteError } = await supabase
      .from('photo_shares')
      .delete()
      .eq('photo_id', photoId)
      .eq('owner_id', userId)
      .eq('conversation_id', conversationId)

    if (deleteError) {
      return {
        success: false,
        error: deleteError.message || PHOTO_SHARING_ERRORS.UNSHARE_FAILED,
      }
    }

    return {
      success: true,
      error: null,
    }
  } catch (error) {
    captureException(error, { operation: 'unsharePhotoFromMatch', photoId, conversationId })
    const message = error instanceof Error ? error.message : PHOTO_SHARING_ERRORS.UNSHARE_FAILED
    return {
      success: false,
      error: message,
    }
  }
}

/**
 * Unshare a photo from a match (alias for unsharePhotoFromMatch)
 *
 * Convenience function that provides a shorter name for common usage.
 *
 * @param photoId - The photo's UUID to unshare
 * @param conversationId - The conversation to unshare from
 * @returns Unshare result
 */
export async function unsharePhoto(
  photoId: string,
  conversationId: string
): Promise<UnsharePhotoResult> {
  return unsharePhotoFromMatch(photoId, conversationId)
}

/**
 * Get photos shared with the current user in a conversation
 *
 * Returns photos that the match has shared with the current user,
 * including signed URLs for display.
 *
 * @param conversationId - The conversation to get shared photos for
 * @returns Array of shared photos with signed URLs
 */
export async function getSharedPhotosForConversation(
  conversationId: string
): Promise<SharedPhotoWithUrl[]> {
  const userId = await getCurrentUserId()
  if (!userId) {
    return []
  }

  try {
    // Get shared photos using direct query
    // This returns photos shared with the current user in this conversation
    const { data: shares, error } = await supabase
      .from('photo_shares')
      .select(`
        id,
        photo_id,
        owner_id,
        created_at,
        profile_photos!inner (
          storage_path,
          is_primary,
          moderation_status
        )
      `)
      .eq('conversation_id', conversationId)
      .eq('shared_with_user_id', userId)

    if (error || !shares) {
      return []
    }

    // Type for the Supabase query result - profile_photos can be array or object depending on join
    type ShareResult = {
      id: string
      photo_id: string
      owner_id: string
      created_at: string
      profile_photos: { storage_path: string; is_primary: boolean; moderation_status: string }[] | { storage_path: string; is_primary: boolean; moderation_status: string }
    }

    // Helper to get profile photo from share (handles array or object)
    const getProfilePhoto = (share: ShareResult) => {
      const photos = share.profile_photos
      return Array.isArray(photos) ? photos[0] : photos
    }

    // Filter to only approved photos and map to expected format with signed URLs
    const photosWithUrls: SharedPhotoWithUrl[] = await Promise.all(
      (shares as ShareResult[])
        .filter((share) => getProfilePhoto(share)?.moderation_status === 'approved')
        .map(async (share) => {
          const profilePhoto = getProfilePhoto(share)
          const urlResult = await getSignedUrlFromPath(profilePhoto.storage_path)
          return {
            share_id: share.id,
            photo_id: share.photo_id,
            owner_id: share.owner_id,
            storage_path: profilePhoto.storage_path,
            is_primary: profilePhoto.is_primary,
            shared_at: share.created_at,
            signedUrl: urlResult.success ? (urlResult.signedUrl ?? undefined) : undefined,
          }
        })
    )

    return photosWithUrls
  } catch {
    return []
  }
}

/**
 * Get photos the current user has shared in a conversation
 *
 * Returns photos that the current user has shared with their match,
 * including signed URLs for display.
 *
 * @param conversationId - The conversation to get shared photos for
 * @returns Array of shared photos with signed URLs
 */
export async function getMySharedPhotosForConversation(
  conversationId: string
): Promise<MySharedPhotoWithUrl[]> {
  const userId = await getCurrentUserId()
  if (!userId) {
    return []
  }

  try {
    // Get photos the current user has shared
    const { data: shares, error } = await supabase
      .from('photo_shares')
      .select(`
        id,
        photo_id,
        shared_with_user_id,
        created_at,
        profile_photos!inner (
          storage_path,
          is_primary,
          moderation_status
        )
      `)
      .eq('conversation_id', conversationId)
      .eq('owner_id', userId)

    if (error || !shares) {
      return []
    }

    // Type for the Supabase query result - profile_photos can be array or object depending on join
    type MyShareResult = {
      id: string
      photo_id: string
      shared_with_user_id: string
      created_at: string
      profile_photos: { storage_path: string; is_primary: boolean; moderation_status: string }[] | { storage_path: string; is_primary: boolean; moderation_status: string }
    }

    // Helper to get profile photo from share (handles array or object)
    const getProfilePhoto = (share: MyShareResult) => {
      const photos = share.profile_photos
      return Array.isArray(photos) ? photos[0] : photos
    }

    // Filter to only approved photos and map to expected format with signed URLs
    const photosWithUrls: MySharedPhotoWithUrl[] = await Promise.all(
      (shares as MyShareResult[])
        .filter((share) => getProfilePhoto(share)?.moderation_status === 'approved')
        .map(async (share) => {
          const profilePhoto = getProfilePhoto(share)
          const urlResult = await getSignedUrlFromPath(profilePhoto.storage_path)
          return {
            share_id: share.id,
            photo_id: share.photo_id,
            shared_with_user_id: share.shared_with_user_id,
            storage_path: profilePhoto.storage_path,
            is_primary: profilePhoto.is_primary,
            shared_at: share.created_at,
            signedUrl: urlResult.success ? (urlResult.signedUrl ?? undefined) : undefined,
          }
        })
    )

    return photosWithUrls
  } catch {
    return []
  }
}

/**
 * Check if a photo is shared in a specific conversation
 *
 * @param photoId - The photo's UUID
 * @param conversationId - The conversation to check
 * @returns Whether the photo is shared in the conversation
 */
export async function isPhotoSharedInConversation(
  photoId: string,
  conversationId: string
): Promise<boolean> {
  const userId = await getCurrentUserId()
  if (!userId) {
    return false
  }

  try {
    const { count, error } = await supabase
      .from('photo_shares')
      .select('*', { count: 'exact', head: true })
      .eq('photo_id', photoId)
      .eq('owner_id', userId)
      .eq('conversation_id', conversationId)

    if (error) {
      return false
    }

    return (count ?? 0) > 0
  } catch (error) {
    return false
  }
}

/**
 * Get the share status for a photo
 *
 * Returns all conversations/matches where the photo has been shared.
 * Useful for displaying "Shared with X" badges in the gallery.
 *
 * @param photoId - The photo's UUID
 * @returns Array of share status records
 */
export async function getPhotoShareStatus(
  photoId: string
): Promise<PhotoShareRecord[]> {
  const userId = await getCurrentUserId()
  if (!userId) {
    return []
  }

  try {
    const { data: shares, error } = await supabase
      .from('photo_shares')
      .select('id, conversation_id, shared_with_user_id, created_at')
      .eq('photo_id', photoId)
      .eq('owner_id', userId)
      .order('created_at', { ascending: false })

    if (error || !shares) {
      return []
    }

    return shares.map((share) => ({
      share_id: share.id,
      conversation_id: share.conversation_id,
      shared_with_user_id: share.shared_with_user_id,
      shared_at: share.created_at,
    }))
  } catch (error) {
    return []
  }
}

/**
 * Get the count of shares for a photo
 *
 * @param photoId - The photo's UUID
 * @returns Number of conversations the photo is shared in
 */
export async function getPhotoShareCount(photoId: string): Promise<number> {
  const userId = await getCurrentUserId()
  if (!userId) {
    return 0
  }

  try {
    const { count, error } = await supabase
      .from('photo_shares')
      .select('*', { count: 'exact', head: true })
      .eq('photo_id', photoId)
      .eq('owner_id', userId)

    if (error) {
      return 0
    }

    return count ?? 0
  } catch (error) {
    return 0
  }
}

/**
 * Subscribe to changes in photo shares for a conversation
 *
 * Useful for real-time updates when photos are shared/unshared.
 *
 * @param conversationId - The conversation to subscribe to
 * @param callback - Function to call when shares change
 * @returns Unsubscribe function
 */
export function subscribeToPhotoShareChanges(
  conversationId: string,
  callback: () => void
): () => void {
  const channel = supabase
    .channel(`photo_shares_${conversationId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'photo_shares',
        filter: `conversation_id=eq.${conversationId}`,
      },
      () => {
        // Trigger callback on any change
        callback()
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

const photoSharingApi = {
  // Main functions
  sharePhotoWithMatch,
  unsharePhotoFromMatch,
  getSharedPhotosForConversation,
  getMySharedPhotosForConversation,
  isPhotoSharedInConversation,
  getPhotoShareStatus,
  getPhotoShareCount,
  subscribeToPhotoShareChanges,
  // Alias functions
  sharePhoto,
  unsharePhoto,
  // Constants
  PHOTO_SHARING_ERRORS,
}

export default photoSharingApi
