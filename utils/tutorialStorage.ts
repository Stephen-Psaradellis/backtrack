/**
 * Tutorial Storage Utility
 *
 * Handles persistence of tutorial completion state using AsyncStorage.
 * Used by the tutorial tooltip system to track which features have been
 * onboarded and allow replay of tutorials from Settings.
 *
 * STORAGE PRINCIPLES:
 * 1. Keys use app-specific prefix to prevent collisions
 * 2. Values are JSON-serialized with metadata (timestamp)
 * 3. Graceful fallbacks on storage failures (fail-safe to showing tooltips)
 * 4. No sensitive data stored (tutorial state is not private)
 *
 * @example
 * ```tsx
 * import {
 *   saveTutorialCompletion,
 *   getTutorialCompletion,
 *   clearTutorialCompletion,
 * } from 'utils/tutorialStorage'
 *
 * // Check if tutorial was completed
 * const isCompleted = await getTutorialCompletion('post_creation')
 *
 * // Mark tutorial as completed
 * await saveTutorialCompletion('post_creation')
 *
 * // Reset for replay
 * await clearTutorialCompletion('post_creation')
 * ```
 */

import AsyncStorage from '@react-native-async-storage/async-storage'

// ============================================================================
// TYPES
// ============================================================================

/**
 * Feature names for tutorial tooltips
 */
export type TutorialFeature =
  | 'post_creation'
  | 'ledger_browsing'
  | 'selfie_verification'
  | 'messaging'

/**
 * Data stored for each tutorial completion
 */
export interface TutorialCompletionData {
  /** Whether the tutorial was completed */
  completed: boolean
  /** Timestamp when the tutorial was completed */
  timestamp: number
}

/**
 * Result from a tutorial storage operation
 */
export interface TutorialStorageResult {
  /** Whether the operation was successful */
  success: boolean
  /** Error message if operation failed */
  error: string | null
}

/**
 * Result from getting tutorial completion status
 */
export interface TutorialCompletionResult {
  /** Whether the operation was successful */
  success: boolean
  /** Whether the tutorial has been completed (null if unknown/error) */
  completed: boolean | null
  /** Completion data including timestamp (null if not completed or error) */
  data: TutorialCompletionData | null
  /** Error message if operation failed */
  error: string | null
}

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Prefix for all tutorial-related storage keys
 * Follows app namespacing convention to prevent collisions
 */
export const TUTORIAL_KEY_PREFIX = '@Backtrack_tutorial_completed_'

/**
 * All valid tutorial feature names
 */
export const TUTORIAL_FEATURES: readonly TutorialFeature[] = [
  'post_creation',
  'ledger_browsing',
  'selfie_verification',
  'messaging',
] as const

/**
 * Human-readable labels for tutorial features
 */
export const TUTORIAL_FEATURE_LABELS: Record<TutorialFeature, string> = {
  post_creation: 'Post Creation',
  ledger_browsing: 'Ledger Browsing',
  selfie_verification: 'Selfie Verification',
  messaging: 'Messaging',
} as const

/**
 * Error messages for tutorial storage operations
 */
export const TUTORIAL_STORAGE_ERRORS = {
  SAVE_FAILED: 'Failed to save tutorial completion state.',
  LOAD_FAILED: 'Failed to load tutorial completion state.',
  CLEAR_FAILED: 'Failed to clear tutorial completion state.',
  INVALID_FEATURE: 'Invalid tutorial feature name.',
  PARSE_ERROR: 'Failed to parse stored tutorial data.',
} as const

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Generate the storage key for a tutorial feature
 *
 * @param feature - The tutorial feature name
 * @returns Storage key string
 */
export function getTutorialStorageKey(feature: TutorialFeature): string {
  return `${TUTORIAL_KEY_PREFIX}${feature}`
}

/**
 * Validate that a feature name is valid
 *
 * @param feature - The feature name to validate
 * @returns Whether the feature name is valid
 */
export function isValidTutorialFeature(feature: string): feature is TutorialFeature {
  return TUTORIAL_FEATURES.includes(feature as TutorialFeature)
}

// ============================================================================
// MAIN FUNCTIONS
// ============================================================================

/**
 * Save tutorial completion state for a feature
 *
 * Records that a user has completed (dismissed) the tutorial tooltip
 * for a specific feature. Stores completion timestamp for future analytics.
 *
 * @param feature - The tutorial feature that was completed
 * @returns Result indicating success or failure
 *
 * @example
 * ```tsx
 * // Mark post creation tutorial as completed
 * const result = await saveTutorialCompletion('post_creation')
 * if (result.success) {
 *   // Tutorial will not show again
 * }
 * ```
 */
export async function saveTutorialCompletion(
  feature: TutorialFeature
): Promise<TutorialStorageResult> {
  // Validate feature name
  if (!isValidTutorialFeature(feature)) {
    return {
      success: false,
      error: TUTORIAL_STORAGE_ERRORS.INVALID_FEATURE,
    }
  }

  try {
    const key = getTutorialStorageKey(feature)
    const data: TutorialCompletionData = {
      completed: true,
      timestamp: Date.now(),
    }

    await AsyncStorage.setItem(key, JSON.stringify(data))

    return {
      success: true,
      error: null,
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : TUTORIAL_STORAGE_ERRORS.SAVE_FAILED
    return {
      success: false,
      error: message,
    }
  }
}

/**
 * Get tutorial completion state for a feature
 *
 * Checks if the user has previously completed the tutorial for a feature.
 * Returns false if no record exists (new user) or on storage errors
 * (fail-safe: better to show tutorial than hide it).
 *
 * @param feature - The tutorial feature to check
 * @returns Result with completion status
 *
 * @example
 * ```tsx
 * const result = await getTutorialCompletion('post_creation')
 * if (result.success && result.completed) {
 *   // Don't show tutorial
 * } else {
 *   // Show tutorial (either not completed or error occurred)
 * }
 * ```
 */
export async function getTutorialCompletion(
  feature: TutorialFeature
): Promise<TutorialCompletionResult> {
  // Validate feature name
  if (!isValidTutorialFeature(feature)) {
    return {
      success: false,
      completed: null,
      data: null,
      error: TUTORIAL_STORAGE_ERRORS.INVALID_FEATURE,
    }
  }

  try {
    const key = getTutorialStorageKey(feature)
    const value = await AsyncStorage.getItem(key)

    // No record exists - tutorial not completed
    if (value === null) {
      return {
        success: true,
        completed: false,
        data: null,
        error: null,
      }
    }

    // Parse stored data
    const data = JSON.parse(value) as TutorialCompletionData

    return {
      success: true,
      completed: data.completed,
      data,
      error: null,
    }
  } catch (err) {
    // On parse/read error, fail-safe to not completed
    // This ensures tutorials show if something is wrong
    const message = err instanceof Error ? err.message : TUTORIAL_STORAGE_ERRORS.LOAD_FAILED
    return {
      success: false,
      completed: null,
      data: null,
      error: message,
    }
  }
}

/**
 * Check if a tutorial has been completed (simple boolean version)
 *
 * Convenience function that returns a boolean directly.
 * On any error, returns false (fail-safe to show tutorial).
 *
 * @param feature - The tutorial feature to check
 * @returns Whether the tutorial has been completed
 *
 * @example
 * ```tsx
 * const isCompleted = await isTutorialCompleted('post_creation')
 * if (!isCompleted) {
 *   // Show tutorial tooltip
 * }
 * ```
 */
export async function isTutorialCompleted(feature: TutorialFeature): Promise<boolean> {
  const result = await getTutorialCompletion(feature)
  return result.success && result.completed === true
}

/**
 * Clear tutorial completion state for a feature
 *
 * Resets the completion state so the tutorial will show again.
 * Used by the "Replay Tutorial" feature in Settings.
 *
 * @param feature - The tutorial feature to reset
 * @returns Result indicating success or failure
 *
 * @example
 * ```tsx
 * // Allow user to replay post creation tutorial
 * const result = await clearTutorialCompletion('post_creation')
 * if (result.success) {
 *   // Navigate to post creation, tutorial will show
 * }
 * ```
 */
export async function clearTutorialCompletion(
  feature: TutorialFeature
): Promise<TutorialStorageResult> {
  // Validate feature name
  if (!isValidTutorialFeature(feature)) {
    return {
      success: false,
      error: TUTORIAL_STORAGE_ERRORS.INVALID_FEATURE,
    }
  }

  try {
    const key = getTutorialStorageKey(feature)
    await AsyncStorage.removeItem(key)

    return {
      success: true,
      error: null,
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : TUTORIAL_STORAGE_ERRORS.CLEAR_FAILED
    return {
      success: false,
      error: message,
    }
  }
}

/**
 * Clear all tutorial completion states
 *
 * Resets all tutorials so they will all show again.
 * Useful for testing or complete tutorial replay.
 *
 * @returns Result indicating success or failure
 *
 * @example
 * ```tsx
 * // Reset all tutorials (e.g., for testing)
 * const result = await clearAllTutorialCompletions()
 * ```
 */
export async function clearAllTutorialCompletions(): Promise<TutorialStorageResult> {
  try {
    const keys = TUTORIAL_FEATURES.map(getTutorialStorageKey)
    await AsyncStorage.multiRemove(keys)

    return {
      success: true,
      error: null,
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : TUTORIAL_STORAGE_ERRORS.CLEAR_FAILED
    return {
      success: false,
      error: message,
    }
  }
}

/**
 * Get completion status for all tutorials
 *
 * Returns an object with completion status for each tutorial feature.
 * Useful for displaying status in Settings screen.
 *
 * @returns Object mapping feature names to completion status
 *
 * @example
 * ```tsx
 * const statuses = await getAllTutorialCompletions()
 * // { post_creation: true, ledger_browsing: false, ... }
 * ```
 */
export async function getAllTutorialCompletions(): Promise<Record<TutorialFeature, boolean>> {
  const result: Record<TutorialFeature, boolean> = {
    post_creation: false,
    ledger_browsing: false,
    selfie_verification: false,
    messaging: false,
  }

  try {
    const keys = TUTORIAL_FEATURES.map(getTutorialStorageKey)
    const values = await AsyncStorage.multiGet(keys)

    values.forEach(([key, value], index) => {
      const feature = TUTORIAL_FEATURES[index]
      if (value) {
        try {
          const data = JSON.parse(value) as TutorialCompletionData
          result[feature] = data.completed
        } catch {
          // Parse error, keep as false
          result[feature] = false
        }
      }
    })
  } catch {
    // On error, return all as false (fail-safe)
  }

  return result
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  // Main functions
  saveTutorialCompletion,
  getTutorialCompletion,
  isTutorialCompleted,
  clearTutorialCompletion,
  clearAllTutorialCompletions,
  getAllTutorialCompletions,
  // Helper functions
  getTutorialStorageKey,
  isValidTutorialFeature,
  // Constants
  TUTORIAL_KEY_PREFIX,
  TUTORIAL_FEATURES,
  TUTORIAL_FEATURE_LABELS,
  TUTORIAL_STORAGE_ERRORS,
}
