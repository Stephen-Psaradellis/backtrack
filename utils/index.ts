/**
 * Utils Module
 *
 * Utility functions for the Love Ledger app.
 * Import all utilities from this file for convenience.
 *
 * @example
 * import { pickSelfieFromGallery, formatImageUri } from '../utils'
 */

// Image Picker utilities
export {
  // Main functions
  pickSelfieFromGallery,
  pickSelfieFromCamera,
  pickSelfieImage,
  // Permission functions
  requestMediaLibraryPermission,
  requestCameraPermission,
  getMediaLibraryPermissionStatus,
  getCameraPermissionStatus,
  // Utility functions
  formatImageUri,
  getImageExtension,
  getImageMimeType,
  generateSelfieFilename,
  isValidImageResult,
  getRecommendedQuality,
  createSelfiePickerOptions,
  // Constants
  DEFAULT_OPTIONS as IMAGE_PICKER_DEFAULT_OPTIONS,
  SELFIE_QUALITY,
  SELFIE_ASPECT,
  IMAGE_PICKER_ERRORS,
  // Types
  type ImagePickerPermissionStatus,
  type ImagePickerResult,
  type ImagePickerOptions,
} from './imagePicker'
