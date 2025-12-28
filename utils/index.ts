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

// Date & Time utilities for event integration
export {
  // Parsing
  parseEventDate,
  safeParseDate,
  // Formatting
  formatEventTime,
  formatEventDateRange,
  formatRelativeTime,
  formatTimeDistance,
  getCompactTimeString,
  // Event status
  getEventStatus,
  isEventPast,
  isEventUpcoming,
  isEventToday,
  // Reminders
  calculateReminderTime,
  shouldSendReminder,
  getEventRelevanceWindow,
  // Filtering
  filterEventsByDateRange,
  getTodaysEvents,
  getUpcomingEvents,
  // Timezone
  getTimezoneAbbreviation,
  getUserTimezone,
  isInLocalTimezone,
  // Constants
  TIME_FORMATS,
  DEFAULT_REMINDER_HOURS,
  // Types
  type EventTime,
  type FormatEventTimeOptions,
  type EventStatus,
  type EventTimeRange,
} from './date-helpers'
