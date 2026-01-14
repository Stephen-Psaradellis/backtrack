/**
 * Supabase Storage Utilities
 *
 * Handles file uploads and downloads to Supabase Storage with proper
 * error handling and privacy controls for the Backtrack app.
 *
 * PRIVACY PRINCIPLES:
 * 1. Selfies are stored in a private bucket (not publicly accessible)
 * 2. Only the producer who uploaded the selfie can access it
 * 3. Storage paths use user_id as folder to enforce ownership via RLS
 * 4. Signed URLs are used for downloads (time-limited access)
 *
 * @example
 * ```tsx
 * import { uploadSelfie, getSelfieUrl, deleteSelfie } from 'lib/storage'
 *
 * // Upload selfie during post creation
 * const result = await uploadSelfie(userId, postId, selfieUri)
 * if (result.success) {
 *   console.log('Uploaded to:', result.path)
 * }
 *
 * // Get signed URL for viewing own selfie
 * const url = await getSelfieUrl(userId, postId)
 * if (url.success) {
 *   setImageSource({ uri: url.signedUrl })
 * }
 * ```
 */

import { Platform } from 'react-native'
import * as FileSystem from 'expo-file-system/legacy'
import { decode } from 'base64-arraybuffer'

import { supabase, supabaseUrl } from './supabase'
import { getImageMimeType, formatImageUri } from '../utils/imagePicker'

// ============================================================================
// TYPES
// ============================================================================

/**
 * Result from a storage upload operation
 */
export interface UploadResult {
  /** Whether the upload was successful */
  success: boolean
  /** Storage path where file was uploaded (if successful) */
  path: string | null
  /** Full URL to access the file (if successful) */
  fullUrl: string | null
  /** Error message if upload failed */
  error: string | null
}

/**
 * Result from getting a signed URL
 */
export interface SignedUrlResult {
  /** Whether the operation was successful */
  success: boolean
  /** Signed URL for accessing the file (if successful) */
  signedUrl: string | null
  /** Expiration time in seconds */
  expiresIn: number | null
  /** Error message if operation failed */
  error: string | null
}

/**
 * Result from a storage delete operation
 */
export interface DeleteResult {
  /** Whether the delete was successful */
  success: boolean
  /** Error message if delete failed */
  error: string | null
}

/**
 * Options for selfie upload
 */
export interface UploadOptions {
  /**
   * Content type of the image
   * @default 'image/jpeg'
   */
  contentType?: string

  /**
   * Whether to overwrite existing file
   * @default true
   */
  upsert?: boolean

  /**
   * Cache control header
   * @default 'public, max-age=31536000'
   */
  cacheControl?: string
}

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Name of the selfies storage bucket
 */
export const SELFIES_BUCKET = 'selfies'

/**
 * Default signed URL expiration time (1 hour in seconds)
 */
export const DEFAULT_SIGNED_URL_EXPIRY = 3600

/**
 * Maximum file size for selfies (5MB in bytes)
 */
export const MAX_SELFIE_SIZE = 5 * 1024 * 1024

/**
 * Allowed MIME types for selfies
 */
export const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
] as const

/**
 * Storage error messages
 */
export const STORAGE_ERRORS = {
  UPLOAD_FAILED: 'Failed to upload selfie. Please try again.',
  FILE_TOO_LARGE: 'Selfie file is too large. Maximum size is 5MB.',
  INVALID_FILE_TYPE: 'Invalid file type. Please use JPEG, PNG, or WebP.',
  DELETE_FAILED: 'Failed to delete selfie.',
  URL_FAILED: 'Failed to get selfie URL.',
  MISSING_USER_ID: 'User ID is required for storage operations.',
  MISSING_POST_ID: 'Post ID is required for storage operations.',
  MISSING_PHOTO_ID: 'Photo ID is required for storage operations.',
  MISSING_FILE: 'No file provided for upload.',
  PROFILE_PHOTO_UPLOAD_FAILED: 'Failed to upload photo. Please try again.',
  PROFILE_PHOTO_DELETE_FAILED: 'Failed to delete photo.',
} as const

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Generate the storage path for a selfie
 *
 * Path format: {user_id}/{post_id}.jpg
 * This format matches the RLS policies in the storage bucket
 *
 * @param userId - The user's ID
 * @param postId - The post's ID
 * @returns Storage path string
 */
export function getSelfieStoragePath(userId: string, postId: string): string {
  return `${userId}/${postId}.jpg`
}

/**
 * Validate that a MIME type is allowed
 *
 * @param mimeType - The MIME type to check
 * @returns Whether the MIME type is allowed
 */
export function isAllowedMimeType(mimeType: string): boolean {
  return ALLOWED_MIME_TYPES.includes(mimeType as typeof ALLOWED_MIME_TYPES[number])
}

/**
 * Create an upload payload from a local file URI (React Native)
 *
 * Uses the new expo-file-system File class to read the file as base64,
 * then converts to ArrayBuffer using base64-arraybuffer. This is the
 * Supabase-recommended approach for React Native file uploads.
 *
 * Why this approach:
 * - fetch() for local file:// URIs is unreliable on iOS production builds
 * - Plain objects {uri, name, type} are not recognized by Supabase upload
 * - ArrayBuffer is a valid upload type that Supabase handles correctly
 *
 * @param uri - Local file URI (file:// or content://)
 * @param mimeType - MIME type of the file
 * @returns ArrayBuffer suitable for Supabase upload
 */
async function createUploadPayload(
  uri: string,
  mimeType: string
): Promise<{ arrayBuffer: ArrayBuffer; error: string | null }> {
  try {
    // Validate MIME type before upload
    if (!isAllowedMimeType(mimeType)) {
      return {
        arrayBuffer: new ArrayBuffer(0),
        error: STORAGE_ERRORS.INVALID_FILE_TYPE,
      }
    }

    // Format URI for the platform
    const formattedUri = formatImageUri(uri)

    // Read file as base64 using FileSystem.readAsStringAsync
    // This works with both file:// (iOS) and content:// (Android) URIs
    const base64 = await FileSystem.readAsStringAsync(formattedUri, {
      encoding: FileSystem.EncodingType.Base64,
    })

    // Convert base64 to ArrayBuffer
    const arrayBuffer = decode(base64)

    return { arrayBuffer, error: null }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error reading file'
    return {
      arrayBuffer: new ArrayBuffer(0),
      error: message,
    }
  }
}

/**
 * Create a Blob from a local file URI (React Native) - Legacy approach
 *
 * This method uses fetch() which doesn't work reliably on Android.
 * Kept for reference but not used in production.
 *
 * @deprecated Use createUploadPayload instead
 */
async function createUploadPayloadLegacy(
  uri: string,
  mimeType: string
): Promise<{ blob: Blob; error: string | null }> {
  try {
    // Format URI properly for the platform
    const formattedUri = formatImageUri(uri)

    // Fetch the file as a blob
    const response = await fetch(formattedUri)

    if (!response.ok) {
      return {
        blob: new Blob(),
        error: `Failed to read file: ${response.status}`,
      }
    }

    const blob = await response.blob()

    // Validate file size
    if (blob.size > MAX_SELFIE_SIZE) {
      return {
        blob: new Blob(),
        error: STORAGE_ERRORS.FILE_TOO_LARGE,
      }
    }

    // Validate MIME type
    const actualMimeType = blob.type || mimeType
    if (!isAllowedMimeType(actualMimeType)) {
      return {
        blob: new Blob(),
        error: STORAGE_ERRORS.INVALID_FILE_TYPE,
      }
    }

    return { blob, error: null }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error reading file'
    return {
      blob: new Blob(),
      error: message,
    }
  }
}

// ============================================================================
// MAIN FUNCTIONS
// ============================================================================

/**
 * Upload a selfie to Supabase Storage
 *
 * Uploads the selfie to the private 'selfies' bucket with the path format:
 * {user_id}/{post_id}.jpg
 *
 * The RLS policies ensure that:
 * - Only the owner can upload to their folder
 * - Only the owner can access their uploaded files
 *
 * @param userId - The user's ID (must match authenticated user)
 * @param postId - The post's ID (used in file path)
 * @param imageUri - Local file URI of the image to upload
 * @param options - Upload options
 * @returns Upload result with path or error
 *
 * @example
 * const result = await uploadSelfie(userId, postId, 'file:///path/to/image.jpg')
 * if (result.success) {
 *   // Save result.path to database
 *   await updatePost(postId, { selfie_url: result.path })
 * }
 */
export async function uploadSelfie(
  userId: string,
  postId: string,
  imageUri: string,
  options: UploadOptions = {}
): Promise<UploadResult> {
  // Validate inputs
  if (!userId) {
    return {
      success: false,
      path: null,
      fullUrl: null,
      error: STORAGE_ERRORS.MISSING_USER_ID,
    }
  }

  if (!postId) {
    return {
      success: false,
      path: null,
      fullUrl: null,
      error: STORAGE_ERRORS.MISSING_POST_ID,
    }
  }

  if (!imageUri) {
    return {
      success: false,
      path: null,
      fullUrl: null,
      error: STORAGE_ERRORS.MISSING_FILE,
    }
  }

  try {
    // Determine MIME type from URI
    const mimeType = options.contentType || getImageMimeType(imageUri)

    // Generate storage path
    const storagePath = getSelfieStoragePath(userId, postId)

    // Create upload payload - reads file as base64, converts to ArrayBuffer
    const { arrayBuffer, error: fileError } = await createUploadPayload(
      imageUri,
      mimeType
    )
    if (fileError) {
      return {
        success: false,
        path: null,
        fullUrl: null,
        error: fileError,
      }
    }

    // Upload to Supabase Storage using ArrayBuffer
    // contentType is required when uploading ArrayBuffer so Supabase knows the file type
    const { data, error } = await supabase.storage
      .from(SELFIES_BUCKET)
      .upload(storagePath, arrayBuffer, {
        contentType: mimeType,
        upsert: options.upsert ?? true,
        cacheControl: options.cacheControl ?? 'public, max-age=31536000',
      })

    if (error) {
      return {
        success: false,
        path: null,
        fullUrl: null,
        error: error.message || STORAGE_ERRORS.UPLOAD_FAILED,
      }
    }

    // Construct full URL (note: this is the storage path, not a public URL)
    const fullUrl = `${supabaseUrl}/storage/v1/object/${SELFIES_BUCKET}/${data.path}`

    return {
      success: true,
      path: data.path,
      fullUrl,
      error: null,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : STORAGE_ERRORS.UPLOAD_FAILED
    return {
      success: false,
      path: null,
      fullUrl: null,
      error: message,
    }
  }
}

/**
 * Get a signed URL for accessing a selfie
 *
 * Creates a time-limited signed URL for downloading the selfie.
 * Only the owner (authenticated user matching the userId) can get a signed URL
 * due to RLS policies.
 *
 * @param userId - The user's ID (must match authenticated user)
 * @param postId - The post's ID
 * @param expiresIn - URL expiration time in seconds (default: 1 hour)
 * @returns Signed URL result
 *
 * @example
 * const result = await getSelfieUrl(userId, postId)
 * if (result.success) {
 *   Image.source = { uri: result.signedUrl }
 * }
 */
export async function getSelfieUrl(
  userId: string,
  postId: string,
  expiresIn: number = DEFAULT_SIGNED_URL_EXPIRY
): Promise<SignedUrlResult> {
  // Validate inputs
  if (!userId) {
    return {
      success: false,
      signedUrl: null,
      expiresIn: null,
      error: STORAGE_ERRORS.MISSING_USER_ID,
    }
  }

  if (!postId) {
    return {
      success: false,
      signedUrl: null,
      expiresIn: null,
      error: STORAGE_ERRORS.MISSING_POST_ID,
    }
  }

  try {
    const storagePath = getSelfieStoragePath(userId, postId)

    const { data, error } = await supabase.storage
      .from(SELFIES_BUCKET)
      .createSignedUrl(storagePath, expiresIn)

    if (error) {
      return {
        success: false,
        signedUrl: null,
        expiresIn: null,
        error: error.message || STORAGE_ERRORS.URL_FAILED,
      }
    }

    return {
      success: true,
      signedUrl: data.signedUrl,
      expiresIn,
      error: null,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : STORAGE_ERRORS.URL_FAILED
    return {
      success: false,
      signedUrl: null,
      expiresIn: null,
      error: message,
    }
  }
}

/**
 * Delete a selfie from storage
 *
 * Removes the selfie file from the storage bucket.
 * Only the owner can delete their selfie due to RLS policies.
 *
 * Note: There's also a database trigger that automatically deletes
 * selfies when their associated post is deleted.
 *
 * @param userId - The user's ID
 * @param postId - The post's ID
 * @returns Delete result
 *
 * @example
 * const result = await deleteSelfie(userId, postId)
 * if (result.success) {
 *   console.log('Selfie deleted')
 * }
 */
export async function deleteSelfie(
  userId: string,
  postId: string
): Promise<DeleteResult> {
  // Validate inputs
  if (!userId) {
    return {
      success: false,
      error: STORAGE_ERRORS.MISSING_USER_ID,
    }
  }

  if (!postId) {
    return {
      success: false,
      error: STORAGE_ERRORS.MISSING_POST_ID,
    }
  }

  try {
    const storagePath = getSelfieStoragePath(userId, postId)

    const { error } = await supabase.storage
      .from(SELFIES_BUCKET)
      .remove([storagePath])

    if (error) {
      return {
        success: false,
        error: error.message || STORAGE_ERRORS.DELETE_FAILED,
      }
    }

    return {
      success: true,
      error: null,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : STORAGE_ERRORS.DELETE_FAILED
    return {
      success: false,
      error: message,
    }
  }
}

/**
 * Check if a selfie exists in storage
 *
 * Useful for verifying upload success or checking before re-upload.
 *
 * @param userId - The user's ID
 * @param postId - The post's ID
 * @returns Whether the selfie exists
 */
export async function selfieExists(
  userId: string,
  postId: string
): Promise<boolean> {
  if (!userId || !postId) {
    return false
  }

  try {
    const storagePath = getSelfieStoragePath(userId, postId)

    // Try to get the file metadata
    const { data, error } = await supabase.storage
      .from(SELFIES_BUCKET)
      .list(userId, {
        limit: 1,
        search: `${postId}.jpg`,
      })

    if (error) {
      return false
    }

    return data.length > 0
  } catch {
    return false
  }
}

/**
 * Upload selfie and get its storage path in one operation
 *
 * Convenience function that uploads the selfie and returns just the path
 * for storing in the database. Throws on error.
 *
 * @param userId - The user's ID
 * @param postId - The post's ID
 * @param imageUri - Local file URI
 * @returns Storage path or null if upload failed
 * @throws Error if upload fails
 *
 * @example
 * try {
 *   const path = await uploadSelfieAndGetPath(userId, postId, uri)
 *   await supabase.from('posts').update({ selfie_url: path }).eq('id', postId)
 * } catch (error) {
 *   Alert.alert('Upload Failed', error.message)
 * }
 */
export async function uploadSelfieAndGetPath(
  userId: string,
  postId: string,
  imageUri: string
): Promise<string> {
  const result = await uploadSelfie(userId, postId, imageUri)

  if (!result.success) {
    throw new Error(result.error || STORAGE_ERRORS.UPLOAD_FAILED)
  }

  if (!result.path) {
    throw new Error(STORAGE_ERRORS.UPLOAD_FAILED)
  }

  return result.path
}

// ============================================================================
// PROFILE PHOTO FUNCTIONS
// ============================================================================

/**
 * Generate the storage path for a profile photo
 *
 * Path format: {user_id}/profile/{photo_id}.jpg
 * This keeps profile photos separate from per-post selfies
 *
 * @param userId - The user's ID
 * @param photoId - The photo's ID
 * @returns Storage path string
 */
export function getProfilePhotoStoragePath(userId: string, photoId: string): string {
  return `${userId}/profile/${photoId}.jpg`
}

/**
 * Upload a profile photo to Supabase Storage
 *
 * Uploads the photo to the private 'selfies' bucket with the path format:
 * {user_id}/profile/{photo_id}.jpg
 *
 * Note: After uploading, the photo should be sent to the moderation
 * Edge Function for content safety verification.
 *
 * @param userId - The user's ID (must match authenticated user)
 * @param photoId - The photo's UUID (generated before upload)
 * @param imageUri - Local file URI of the image to upload
 * @param options - Upload options
 * @returns Upload result with path or error
 *
 * @example
 * const photoId = uuid()
 * const result = await uploadProfilePhoto(userId, photoId, imageUri)
 * if (result.success) {
 *   // Save to database and trigger moderation
 *   await supabase.from('profile_photos').insert({
 *     id: photoId,
 *     user_id: userId,
 *     storage_path: result.path,
 *   })
 * }
 */
export async function uploadProfilePhoto(
  userId: string,
  photoId: string,
  imageUri: string,
  options: UploadOptions = {}
): Promise<UploadResult> {
  // Validate inputs
  if (!userId) {
    return {
      success: false,
      path: null,
      fullUrl: null,
      error: STORAGE_ERRORS.MISSING_USER_ID,
    }
  }

  if (!photoId) {
    return {
      success: false,
      path: null,
      fullUrl: null,
      error: STORAGE_ERRORS.MISSING_PHOTO_ID,
    }
  }

  if (!imageUri) {
    return {
      success: false,
      path: null,
      fullUrl: null,
      error: STORAGE_ERRORS.MISSING_FILE,
    }
  }

  try {
    // Determine MIME type from URI
    const mimeType = options.contentType || getImageMimeType(imageUri)

    // Generate storage path for profile photo
    const storagePath = getProfilePhotoStoragePath(userId, photoId)

    // Create upload payload - reads file as base64, converts to ArrayBuffer
    const { arrayBuffer, error: fileError } = await createUploadPayload(
      imageUri,
      mimeType
    )
    if (fileError) {
      return {
        success: false,
        path: null,
        fullUrl: null,
        error: fileError,
      }
    }

    // Upload to Supabase Storage using ArrayBuffer
    // contentType is required when uploading ArrayBuffer so Supabase knows the file type
    const { data, error } = await supabase.storage
      .from(SELFIES_BUCKET)
      .upload(storagePath, arrayBuffer, {
        contentType: mimeType,
        upsert: options.upsert ?? true,
        cacheControl: options.cacheControl ?? 'public, max-age=31536000',
      })

    if (error) {
      return {
        success: false,
        path: null,
        fullUrl: null,
        error: error.message || STORAGE_ERRORS.PROFILE_PHOTO_UPLOAD_FAILED,
      }
    }

    // Construct full URL
    const fullUrl = `${supabaseUrl}/storage/v1/object/${SELFIES_BUCKET}/${data.path}`

    return {
      success: true,
      path: data.path,
      fullUrl,
      error: null,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : STORAGE_ERRORS.PROFILE_PHOTO_UPLOAD_FAILED
    return {
      success: false,
      path: null,
      fullUrl: null,
      error: message,
    }
  }
}

/**
 * Get a signed URL for accessing a profile photo
 *
 * Creates a time-limited signed URL for downloading the photo.
 * Only the owner can get a signed URL due to RLS policies.
 *
 * @param userId - The user's ID
 * @param photoId - The photo's ID
 * @param expiresIn - URL expiration time in seconds (default: 1 hour)
 * @returns Signed URL result
 */
export async function getProfilePhotoUrl(
  userId: string,
  photoId: string,
  expiresIn: number = DEFAULT_SIGNED_URL_EXPIRY
): Promise<SignedUrlResult> {
  if (!userId) {
    return {
      success: false,
      signedUrl: null,
      expiresIn: null,
      error: STORAGE_ERRORS.MISSING_USER_ID,
    }
  }

  if (!photoId) {
    return {
      success: false,
      signedUrl: null,
      expiresIn: null,
      error: STORAGE_ERRORS.MISSING_PHOTO_ID,
    }
  }

  try {
    const storagePath = getProfilePhotoStoragePath(userId, photoId)

    const { data, error } = await supabase.storage
      .from(SELFIES_BUCKET)
      .createSignedUrl(storagePath, expiresIn)

    if (error) {
      return {
        success: false,
        signedUrl: null,
        expiresIn: null,
        error: error.message || STORAGE_ERRORS.URL_FAILED,
      }
    }

    return {
      success: true,
      signedUrl: data.signedUrl,
      expiresIn,
      error: null,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : STORAGE_ERRORS.URL_FAILED
    return {
      success: false,
      signedUrl: null,
      expiresIn: null,
      error: message,
    }
  }
}

/**
 * Get signed URL from storage path (for profile photos stored in DB)
 *
 * @param storagePath - The storage path from profile_photos.storage_path
 * @param expiresIn - URL expiration time in seconds (default: 1 hour)
 * @returns Signed URL result
 */
export async function getSignedUrlFromPath(
  storagePath: string,
  expiresIn: number = DEFAULT_SIGNED_URL_EXPIRY
): Promise<SignedUrlResult> {
  if (!storagePath) {
    return {
      success: false,
      signedUrl: null,
      expiresIn: null,
      error: 'Storage path is required',
    }
  }

  try {
    const { data, error } = await supabase.storage
      .from(SELFIES_BUCKET)
      .createSignedUrl(storagePath, expiresIn)

    if (error) {
      return {
        success: false,
        signedUrl: null,
        expiresIn: null,
        error: error.message || STORAGE_ERRORS.URL_FAILED,
      }
    }

    return {
      success: true,
      signedUrl: data.signedUrl,
      expiresIn,
      error: null,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : STORAGE_ERRORS.URL_FAILED
    return {
      success: false,
      signedUrl: null,
      expiresIn: null,
      error: message,
    }
  }
}

/**
 * Delete a profile photo from storage
 *
 * @param userId - The user's ID
 * @param photoId - The photo's ID
 * @returns Delete result
 */
export async function deleteProfilePhoto(
  userId: string,
  photoId: string
): Promise<DeleteResult> {
  if (!userId) {
    return {
      success: false,
      error: STORAGE_ERRORS.MISSING_USER_ID,
    }
  }

  if (!photoId) {
    return {
      success: false,
      error: STORAGE_ERRORS.MISSING_PHOTO_ID,
    }
  }

  try {
    const storagePath = getProfilePhotoStoragePath(userId, photoId)

    const { error } = await supabase.storage
      .from(SELFIES_BUCKET)
      .remove([storagePath])

    if (error) {
      return {
        success: false,
        error: error.message || STORAGE_ERRORS.PROFILE_PHOTO_DELETE_FAILED,
      }
    }

    return {
      success: true,
      error: null,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : STORAGE_ERRORS.PROFILE_PHOTO_DELETE_FAILED
    return {
      success: false,
      error: message,
    }
  }
}

/**
 * Delete a photo from storage by its storage path
 *
 * @param storagePath - The storage path from profile_photos.storage_path
 * @returns Delete result
 */
export async function deletePhotoByPath(storagePath: string): Promise<DeleteResult> {
  if (!storagePath) {
    return {
      success: false,
      error: 'Storage path is required',
    }
  }

  try {
    const { error } = await supabase.storage
      .from(SELFIES_BUCKET)
      .remove([storagePath])

    if (error) {
      return {
        success: false,
        error: error.message || STORAGE_ERRORS.PROFILE_PHOTO_DELETE_FAILED,
      }
    }

    return {
      success: true,
      error: null,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : STORAGE_ERRORS.PROFILE_PHOTO_DELETE_FAILED
    return {
      success: false,
      error: message,
    }
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  // Selfie functions (legacy)
  uploadSelfie,
  getSelfieUrl,
  deleteSelfie,
  selfieExists,
  uploadSelfieAndGetPath,
  getSelfieStoragePath,
  // Profile photo functions
  uploadProfilePhoto,
  getProfilePhotoUrl,
  getSignedUrlFromPath,
  deleteProfilePhoto,
  deletePhotoByPath,
  getProfilePhotoStoragePath,
  // Utilities
  isAllowedMimeType,
  // Constants
  SELFIES_BUCKET,
  DEFAULT_SIGNED_URL_EXPIRY,
  MAX_SELFIE_SIZE,
  ALLOWED_MIME_TYPES,
  STORAGE_ERRORS,
}
