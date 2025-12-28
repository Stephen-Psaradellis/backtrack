/**
 * Storage Utilities for Love Ledger
 *
 * Utility functions for localStorage operations with error handling.
 * Provides type-safe wrappers for common storage operations.
 *
 * @example
 * ```tsx
 * import { isOnboardingComplete, setOnboardingComplete } from '@/utils/storage'
 *
 * // Check if user has completed onboarding
 * if (isOnboardingComplete()) {
 *   // User has completed onboarding
 * }
 *
 * // Mark onboarding as complete
 * setOnboardingComplete()
 * ```
 */

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Storage key for onboarding state
 * Must match the key used in useOnboardingState hook
 */
export const ONBOARDING_STORAGE_KEY = 'love_ledger_onboarding'

/**
 * Storage key for onboarding redirect check
 * Used to track if we've already redirected in this session
 */
export const ONBOARDING_REDIRECT_KEY = 'love_ledger_onboarding_redirect'

// ============================================================================
// TYPES
// ============================================================================

/**
 * Persisted onboarding state structure
 * Must match the structure in useOnboardingState hook
 */
interface OnboardingPersistedState {
  isComplete: boolean
  lastStep: number
  completedAt: string | null
  avatarConfig: unknown | null
  locationPermissionStatus: 'pending' | 'granted' | 'denied' | 'skipped'
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Check if we're running in a browser environment
 */
function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

/**
 * Safely get item from localStorage
 *
 * @param key - Storage key
 * @returns Parsed value or null if not found/error
 */
function getFromStorage<T>(key: string): T | null {
  if (!isBrowser()) {
    return null
  }

  try {
    const item = localStorage.getItem(key)
    if (!item) {
      return null
    }
    return JSON.parse(item) as T
  } catch {
    // Invalid JSON or localStorage error
    return null
  }
}

/**
 * Safely set item in localStorage
 *
 * @param key - Storage key
 * @param value - Value to store
 * @returns Whether the operation succeeded
 */
function setToStorage<T>(key: string, value: T): boolean {
  if (!isBrowser()) {
    return false
  }

  try {
    localStorage.setItem(key, JSON.stringify(value))
    return true
  } catch {
    // localStorage full or disabled
    return false
  }
}

/**
 * Safely remove item from localStorage
 *
 * @param key - Storage key
 * @returns Whether the operation succeeded
 */
function removeFromStorage(key: string): boolean {
  if (!isBrowser()) {
    return false
  }

  try {
    localStorage.removeItem(key)
    return true
  } catch {
    return false
  }
}

// ============================================================================
// ONBOARDING STORAGE FUNCTIONS
// ============================================================================

/**
 * Check if onboarding has been completed
 *
 * Reads the onboarding state from localStorage and checks the isComplete flag.
 * Returns false if localStorage is not available, the data is corrupted,
 * or onboarding has not been completed.
 *
 * @returns Whether onboarding is complete
 *
 * @example
 * ```tsx
 * // In a layout or page component
 * if (isOnboardingComplete()) {
 *   // User has completed onboarding
 * } else {
 *   // New user, show onboarding
 * }
 * ```
 */
export function isOnboardingComplete(): boolean {
  const stored = getFromStorage<OnboardingPersistedState>(ONBOARDING_STORAGE_KEY)
  return stored?.isComplete === true
}

/**
 * Get onboarding completion status
 *
 * Alias for isOnboardingComplete() - returns true if onboarding has been completed.
 * This function is provided for naming consistency with setOnboardingComplete().
 *
 * @returns Whether onboarding is complete
 *
 * @example
 * ```tsx
 * const isComplete = getOnboardingComplete()
 * if (isComplete) {
 *   // User has completed onboarding
 * }
 * ```
 */
export function getOnboardingComplete(): boolean {
  return isOnboardingComplete()
}

/**
 * Mark onboarding as complete
 *
 * Updates the onboarding state in localStorage to mark it as complete.
 * Preserves existing state data (avatar, location permission, etc.).
 *
 * @returns Whether the operation succeeded
 *
 * @example
 * ```tsx
 * // When user completes onboarding
 * setOnboardingComplete()
 * ```
 */
export function setOnboardingComplete(): boolean {
  const stored = getFromStorage<OnboardingPersistedState>(ONBOARDING_STORAGE_KEY)
  const updated: OnboardingPersistedState = {
    isComplete: true,
    lastStep: stored?.lastStep ?? 0,
    completedAt: new Date().toISOString(),
    avatarConfig: stored?.avatarConfig ?? null,
    locationPermissionStatus: stored?.locationPermissionStatus ?? 'pending',
  }
  return setToStorage(ONBOARDING_STORAGE_KEY, updated)
}

/**
 * Get the complete onboarding state
 *
 * Returns the full onboarding state object, or null if not found.
 *
 * @returns Onboarding state or null
 */
export function getOnboardingState(): OnboardingPersistedState | null {
  return getFromStorage<OnboardingPersistedState>(ONBOARDING_STORAGE_KEY)
}

/**
 * Clear onboarding state
 *
 * Removes the onboarding state from localStorage.
 * Useful for testing or allowing users to re-experience onboarding.
 *
 * @returns Whether the operation succeeded
 */
export function clearOnboardingState(): boolean {
  return removeFromStorage(ONBOARDING_STORAGE_KEY)
}

/**
 * Check if we should redirect to onboarding
 *
 * Returns true if:
 * - We're in a browser environment
 * - Onboarding is not complete
 *
 * @returns Whether to redirect to onboarding
 */
export function shouldRedirectToOnboarding(): boolean {
  if (!isBrowser()) {
    return false
  }
  return !isOnboardingComplete()
}

// ============================================================================
// GENERIC STORAGE UTILITIES
// ============================================================================

/**
 * Get a value from localStorage with type safety
 *
 * @param key - Storage key
 * @param defaultValue - Default value if not found
 * @returns Stored value or default
 */
export function getStorageItem<T>(key: string, defaultValue: T): T {
  const value = getFromStorage<T>(key)
  return value ?? defaultValue
}

/**
 * Set a value in localStorage
 *
 * @param key - Storage key
 * @param value - Value to store
 * @returns Whether the operation succeeded
 */
export function setStorageItem<T>(key: string, value: T): boolean {
  return setToStorage(key, value)
}

/**
 * Remove a value from localStorage
 *
 * @param key - Storage key
 * @returns Whether the operation succeeded
 */
export function removeStorageItem(key: string): boolean {
  return removeFromStorage(key)
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  // Onboarding storage
  isOnboardingComplete,
  getOnboardingComplete,
  setOnboardingComplete,
  getOnboardingState,
  clearOnboardingState,
  shouldRedirectToOnboarding,
  // Generic storage
  getStorageItem,
  setStorageItem,
  removeStorageItem,
  // Constants
  ONBOARDING_STORAGE_KEY,
}
