/**
 * Image Picker Utility
 *
 * Utility functions for picking and capturing selfie images in the Backtrack app.
 * Supports both gallery selection and camera capture with proper permission handling.
 *
 * Uses expo-image-picker for cross-platform compatibility.
 *
 * @example
 * ```tsx
 * import { pickSelfieFromGallery, pickSelfieFromCamera } from 'utils/imagePicker'
 *
 * // Pick from gallery
 * const result = await pickSelfieFromGallery()
 * if (result.success) {
 *   console.log('Selected image:', result.uri)
 * }
 *
 * // Capture from camera
 * const result = await pickSelfieFromCamera()
 * if (result.success) {
 *   console.log('Captured image:', result.uri)
 * }
 *
 * // With custom options
 * const result = await pickSelfieFromGallery({
 *   quality: 0.9,
 *   allowsEditing: false,
 * })
 * ```
 */

import * as ImagePicker from 'expo-image-picker'
import { Platform } from 'react-native'

// ============================================================================
// TYPES
// ============================================================================

/**
 * Permission status for media library or camera
 */
export type ImagePickerPermissionStatus =
  | 'undetermined'
  | 'granted'
  | 'denied'
  | 'restricted'

/**
 * Result from image selection or capture
 */
export interface ImagePickerResult {
  /** Whether the operation was successful */
  success: boolean
  /** URI of the selected/captured image (if successful) */
  uri: string | null
  /** Width of the image in pixels */
  width: number | null
  /** Height of the image in pixels */
  height: number | null
  /** Base64-encoded image data (if requested) */
  base64: string | null
  /** MIME type of the image */
  type: string | null
  /** File size in bytes (if available) */
  fileSize: number | null
  /** File name (if available) */
  fileName: string | null
  /** Error message if operation failed */
  error: string | null
  /** Whether the user cancelled the operation */
  cancelled: boolean
}

/**
 * Options for image picking/capturing
 */
export interface ImagePickerOptions {
  /**
   * Whether to allow editing (cropping) after selection
   * @default true
   */
  allowsEditing?: boolean

  /**
   * Aspect ratio for cropping [width, height]
   * Only applies when allowsEditing is true
   * @default [1, 1] (square)
   */
  aspect?: [number, number]

  /**
   * Image quality (0-1)
   * @default 0.8
   */
  quality?: number

  /**
   * Whether to include base64 data in result
   * @default false
   */
  base64?: boolean

  /**
   * Whether to include EXIF data
   * @default false
   */
  exif?: boolean

  /**
   * Presentation style for picker (iOS only)
   * @default 'automatic'
   */
  presentationStyle?: ImagePicker.UIImagePickerPresentationStyle
}

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Default options for image picker
 */
export const DEFAULT_OPTIONS: Required<ImagePickerOptions> = {
  allowsEditing: true,
  aspect: [1, 1],
  quality: 0.8,
  base64: false,
  exif: false,
  presentationStyle: ImagePicker.UIImagePickerPresentationStyle.AUTOMATIC,
}

/**
 * Default quality for selfie images
 */
export const SELFIE_QUALITY = 0.8

/**
 * Square aspect ratio for selfies
 */
export const SELFIE_ASPECT: [number, number] = [1, 1]

/**
 * Error messages for image picker
 */
export const IMAGE_PICKER_ERRORS = {
  PERMISSION_DENIED_GALLERY: 'Media library permission denied. Please enable access in your device settings.',
  PERMISSION_DENIED_CAMERA: 'Camera permission denied. Please enable access in your device settings.',
  CANCELLED: 'Image selection cancelled.',
  NO_IMAGE: 'No image was selected.',
  UNKNOWN: 'An unknown error occurred while picking image.',
} as const

/**
 * Empty result object for error/cancelled states
 */
const EMPTY_RESULT: Omit<ImagePickerResult, 'success' | 'error' | 'cancelled'> = {
  uri: null,
  width: null,
  height: null,
  base64: null,
  type: null,
  fileSize: null,
  fileName: null,
}

// ============================================================================
// PERMISSION FUNCTIONS
// ============================================================================

/**
 * Map expo permission status to our status type
 */
function mapPermissionStatus(
  status: ImagePicker.PermissionStatus
): ImagePickerPermissionStatus {
  switch (status) {
    case ImagePicker.PermissionStatus.GRANTED:
      return 'granted'
    case ImagePicker.PermissionStatus.DENIED:
      return 'denied'
    case ImagePicker.PermissionStatus.UNDETERMINED:
      return 'undetermined'
    default:
      return 'restricted'
  }
}

/**
 * Request permission to access the media library
 *
 * @returns Permission status and whether access was granted
 *
 * @example
 * const { granted, status } = await requestMediaLibraryPermission()
 * if (granted) {
 *   // Can access gallery
 * }
 */
export async function requestMediaLibraryPermission(): Promise<{
  granted: boolean
  status: ImagePickerPermissionStatus
}> {
  try {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
    return {
      granted: status === ImagePicker.PermissionStatus.GRANTED,
      status: mapPermissionStatus(status),
    }
  } catch {
    return {
      granted: false,
      status: 'denied',
    }
  }
}

/**
 * Request permission to access the camera
 *
 * @returns Permission status and whether access was granted
 *
 * @example
 * const { granted, status } = await requestCameraPermission()
 * if (granted) {
 *   // Can use camera
 * }
 */
export async function requestCameraPermission(): Promise<{
  granted: boolean
  status: ImagePickerPermissionStatus
}> {
  try {
    const { status } = await ImagePicker.requestCameraPermissionsAsync()
    return {
      granted: status === ImagePicker.PermissionStatus.GRANTED,
      status: mapPermissionStatus(status),
    }
  } catch {
    return {
      granted: false,
      status: 'denied',
    }
  }
}

/**
 * Check current media library permission status without requesting
 *
 * @returns Current permission status
 */
export async function getMediaLibraryPermissionStatus(): Promise<ImagePickerPermissionStatus> {
  try {
    const { status } = await ImagePicker.getMediaLibraryPermissionsAsync()
    return mapPermissionStatus(status)
  } catch {
    return 'denied'
  }
}

/**
 * Check current camera permission status without requesting
 *
 * @returns Current permission status
 */
export async function getCameraPermissionStatus(): Promise<ImagePickerPermissionStatus> {
  try {
    const { status } = await ImagePicker.getCameraPermissionsAsync()
    return mapPermissionStatus(status)
  } catch {
    return 'denied'
  }
}

// ============================================================================
// MAIN FUNCTIONS
// ============================================================================

/**
 * Pick a selfie image from the device's media library
 *
 * Requests permission if needed, opens the gallery picker,
 * and returns the selected image with optional editing.
 *
 * @param options - Configuration options for the picker
 * @returns Result object with image data or error
 *
 * @example
 * // Basic usage
 * const result = await pickSelfieFromGallery()
 * if (result.success) {
 *   uploadSelfie(result.uri)
 * }
 *
 * @example
 * // With custom options
 * const result = await pickSelfieFromGallery({
 *   quality: 0.9,
 *   allowsEditing: false,
 *   base64: true,
 * })
 */
export async function pickSelfieFromGallery(
  options: ImagePickerOptions = {}
): Promise<ImagePickerResult> {
  try {
    // Merge with defaults
    const config = { ...DEFAULT_OPTIONS, ...options }

    // Request permission
    const { granted } = await requestMediaLibraryPermission()
    if (!granted) {
      return {
        ...EMPTY_RESULT,
        success: false,
        error: IMAGE_PICKER_ERRORS.PERMISSION_DENIED_GALLERY,
        cancelled: false,
      }
    }

    // Launch image picker
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: config.allowsEditing,
      aspect: config.aspect,
      quality: config.quality,
      base64: config.base64,
      exif: config.exif,
      presentationStyle: config.presentationStyle,
    })

    // IMPORTANT: Check canceled property (new API)
    if (result.canceled) {
      return {
        ...EMPTY_RESULT,
        success: false,
        error: null,
        cancelled: true,
      }
    }

    // IMPORTANT: Access image from assets array (new API), NOT result.uri
    const asset = result.assets?.[0]
    if (!asset) {
      return {
        ...EMPTY_RESULT,
        success: false,
        error: IMAGE_PICKER_ERRORS.NO_IMAGE,
        cancelled: false,
      }
    }

    // Return successful result
    return {
      success: true,
      uri: asset.uri,
      width: asset.width,
      height: asset.height,
      base64: asset.base64 ?? null,
      type: asset.type ?? 'image',
      fileSize: asset.fileSize ?? null,
      fileName: asset.fileName ?? null,
      error: null,
      cancelled: false,
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : IMAGE_PICKER_ERRORS.UNKNOWN
    return {
      ...EMPTY_RESULT,
      success: false,
      error: errorMessage,
      cancelled: false,
    }
  }
}

/**
 * Capture a selfie image using the device camera
 *
 * Opens the camera (front-facing by default for selfies),
 * allows capture, and returns the image with optional editing.
 *
 * @param options - Configuration options for the camera
 * @returns Result object with image data or error
 *
 * @example
 * // Basic usage
 * const result = await pickSelfieFromCamera()
 * if (result.success) {
 *   uploadSelfie(result.uri)
 * }
 *
 * @example
 * // With custom quality
 * const result = await pickSelfieFromCamera({ quality: 0.9 })
 */
export async function pickSelfieFromCamera(
  options: ImagePickerOptions = {}
): Promise<ImagePickerResult> {
  try {
    // Merge with defaults
    const config = { ...DEFAULT_OPTIONS, ...options }

    // Request camera permission
    const { granted } = await requestCameraPermission()
    if (!granted) {
      return {
        ...EMPTY_RESULT,
        success: false,
        error: IMAGE_PICKER_ERRORS.PERMISSION_DENIED_CAMERA,
        cancelled: false,
      }
    }

    // Launch camera
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: config.allowsEditing,
      aspect: config.aspect,
      quality: config.quality,
      base64: config.base64,
      exif: config.exif,
      cameraType: ImagePicker.CameraType.front, // Front camera for selfies
    })

    // IMPORTANT: Check canceled property (new API)
    if (result.canceled) {
      return {
        ...EMPTY_RESULT,
        success: false,
        error: null,
        cancelled: true,
      }
    }

    // IMPORTANT: Access image from assets array (new API), NOT result.uri
    const asset = result.assets?.[0]
    if (!asset) {
      return {
        ...EMPTY_RESULT,
        success: false,
        error: IMAGE_PICKER_ERRORS.NO_IMAGE,
        cancelled: false,
      }
    }

    // Return successful result
    return {
      success: true,
      uri: asset.uri,
      width: asset.width,
      height: asset.height,
      base64: asset.base64 ?? null,
      type: asset.type ?? 'image',
      fileSize: asset.fileSize ?? null,
      fileName: asset.fileName ?? null,
      error: null,
      cancelled: false,
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : IMAGE_PICKER_ERRORS.UNKNOWN
    return {
      ...EMPTY_RESULT,
      success: false,
      error: errorMessage,
      cancelled: false,
    }
  }
}

/**
 * Pick a selfie image (simple convenience function)
 *
 * Returns just the URI or null. Use pickSelfieFromGallery or
 * pickSelfieFromCamera for full result details.
 *
 * @param source - Whether to use 'gallery' or 'camera'
 * @returns Image URI or null if cancelled/failed
 *
 * @example
 * const uri = await pickSelfieImage('gallery')
 * if (uri) {
 *   setImageUri(uri)
 * }
 */
export async function pickSelfieImage(
  source: 'gallery' | 'camera' = 'gallery'
): Promise<string | null> {
  const result = source === 'camera'
    ? await pickSelfieFromCamera()
    : await pickSelfieFromGallery()

  return result.success ? result.uri : null
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Format an image URI for proper display/upload
 *
 * Ensures the URI has the correct file:// prefix on iOS
 *
 * @param uri - The image URI to format
 * @returns Formatted URI
 */
export function formatImageUri(uri: string): string {
  // Ensure URI has proper file:// prefix on iOS
  if (Platform.OS === 'ios' && !uri.startsWith('file://') && !uri.startsWith('http')) {
    return `file://${uri}`
  }
  return uri
}

/**
 * Get file extension from an image URI
 *
 * @param uri - The image URI
 * @returns File extension (e.g., 'jpg', 'png') or 'jpg' as default
 */
export function getImageExtension(uri: string): string {
  const match = uri.match(/\.(\w+)(?:\?.*)?$/)
  if (match) {
    const ext = match[1].toLowerCase()
    // Normalize common extensions
    if (ext === 'jpeg') return 'jpg'
    return ext
  }
  return 'jpg' // Default to jpg
}

/**
 * Get MIME type from an image URI
 *
 * @param uri - The image URI
 * @returns MIME type (e.g., 'image/jpeg', 'image/png')
 */
export function getImageMimeType(uri: string): string {
  const ext = getImageExtension(uri)
  switch (ext) {
    case 'jpg':
      return 'image/jpeg'
    case 'png':
      return 'image/png'
    case 'gif':
      return 'image/gif'
    case 'webp':
      return 'image/webp'
    case 'heic':
      return 'image/heic'
    default:
      return 'image/jpeg'
  }
}

/**
 * Generate a unique filename for a selfie image
 *
 * @param userId - Optional user ID to include in filename
 * @param postId - Optional post ID to include in filename
 * @returns Unique filename (e.g., 'selfie_user123_1703333333333.jpg')
 */
export function generateSelfieFilename(userId?: string, postId?: string): string {
  const timestamp = Date.now()
  const parts = ['selfie']

  if (userId) {
    parts.push(userId)
  }
  if (postId) {
    parts.push(postId)
  }

  parts.push(String(timestamp))

  return `${parts.join('_')}.jpg`
}

/**
 * Validate that an image result is usable
 *
 * @param result - The ImagePickerResult to validate
 * @returns Whether the result contains a valid image
 */
export function isValidImageResult(result: ImagePickerResult): boolean {
  return (
    result.success &&
    result.uri !== null &&
    result.uri.length > 0 &&
    result.width !== null &&
    result.height !== null &&
    result.width > 0 &&
    result.height > 0
  )
}

/**
 * Get a recommended quality value based on use case
 *
 * @param useCase - The intended use for the image
 * @returns Quality value (0-1)
 */
export function getRecommendedQuality(
  useCase: 'selfie' | 'profile' | 'preview' | 'thumbnail'
): number {
  switch (useCase) {
    case 'selfie':
      return 0.8
    case 'profile':
      return 0.9
    case 'preview':
      return 0.6
    case 'thumbnail':
      return 0.4
    default:
      return SELFIE_QUALITY
  }
}

/**
 * Create image picker options for selfie capture/selection
 *
 * @param overrides - Options to override defaults
 * @returns Complete ImagePickerOptions for selfies
 */
export function createSelfiePickerOptions(
  overrides: Partial<ImagePickerOptions> = {}
): ImagePickerOptions {
  return {
    allowsEditing: true,
    aspect: SELFIE_ASPECT,
    quality: SELFIE_QUALITY,
    base64: false,
    exif: false,
    ...overrides,
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  pickSelfieFromGallery,
  pickSelfieFromCamera,
  pickSelfieImage,
  requestMediaLibraryPermission,
  requestCameraPermission,
  getMediaLibraryPermissionStatus,
  getCameraPermissionStatus,
  formatImageUri,
  getImageExtension,
  getImageMimeType,
  generateSelfieFilename,
  isValidImageResult,
  getRecommendedQuality,
  createSelfiePickerOptions,
}
