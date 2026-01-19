/**
 * useOnboardingState Hook
 *
 * Custom hook for managing onboarding state in the Backtrack app.
 * Handles step navigation, completion tracking, avatar configuration,
 * location permission status, and localStorage persistence.
 *
 * Features:
 * - Step navigation (next, prev, goTo)
 * - Completion flag persistence to localStorage
 * - Avatar configuration storage and persistence
 * - Location permission status tracking
 * - Skip functionality for returning users
 * - Resume from last completed step
 * - SSR-safe with client-side hydration
 *
 * @example
 * ```tsx
 * function OnboardingPage() {
 *   const {
 *     currentStep,
 *     isComplete,
 *     avatarConfig,
 *     locationPermissionStatus,
 *     nextStep,
 *     prevStep,
 *     skipOnboarding,
 *     completeOnboarding,
 *     setAvatar,
 *     setLocationPermission
 *   } = useOnboardingState({ totalSteps: 6 })
 *
 *   if (isComplete) {
 *     return <Navigate to="/" />
 *   }
 *
 *   const handleAvatarCreated = (config: AvatarConfig) => {
 *     setAvatar(config)
 *     nextStep()
 *   }
 *
 *   const handleLocationPermission = (status: OnboardingLocationPermissionStatus) => {
 *     setLocationPermission(status)
 *     nextStep()
 *   }
 *
 *   return (
 *     <div>
 *       <StepContent step={currentStep} onAvatarCreated={handleAvatarCreated} />
 *       <button onClick={nextStep}>Next</button>
 *       <button onClick={skipOnboarding}>Skip</button>
 *     </div>
 *   )
 * }
 * ```
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Avatar2DConfig, DEFAULT_AVATAR_CONFIG } from '../types/avatar'
import { trackEvent, AnalyticsEvent } from '../lib/analytics'

// ============================================================================
// TYPES
// ============================================================================

/**
 * Location permission status tracked during onboarding
 *
 * - 'pending': User hasn't made a choice yet
 * - 'granted': User granted location permission
 * - 'denied': User denied location permission
 * - 'skipped': User skipped the location permission step
 */
export type OnboardingLocationPermissionStatus =
  | 'pending'
  | 'granted'
  | 'denied'
  | 'skipped'

/**
 * Options for the useOnboardingState hook
 */
export interface UseOnboardingStateOptions {
  /**
   * Total number of steps in the onboarding flow
   * @default 6
   */
  totalSteps?: number

  /**
   * Key used for localStorage persistence
   * @default 'backtrack_onboarding'
   */
  storageKey?: string

  /**
   * Whether to persist current step to localStorage for resume functionality
   * @default true
   */
  persistStep?: boolean
}

/**
 * Persisted onboarding state in localStorage
 */
export interface OnboardingPersistedState {
  /** Whether onboarding has been completed */
  isComplete: boolean
  /** Last visited step (for resume functionality) */
  lastStep: number
  /** Timestamp when onboarding was completed */
  completedAt: string | null
  /** User's avatar configuration */
  avatarConfig: Avatar2DConfig | null
  /** Location permission status during onboarding */
  locationPermissionStatus: OnboardingLocationPermissionStatus
}

/**
 * Return value from useOnboardingState hook
 */
export interface UseOnboardingStateResult {
  /** Current step index (0-based) */
  currentStep: number
  /** Whether onboarding has been completed */
  isComplete: boolean
  /** Whether the hook has finished loading from localStorage */
  isLoading: boolean
  /** Total number of steps */
  totalSteps: number
  /** Whether currently on the first step */
  isFirstStep: boolean
  /** Whether currently on the last step */
  isLastStep: boolean
  /** Progress percentage (0-100) */
  progress: number
  /** Current avatar configuration (uses DEFAULT_AVATAR_CONFIG as fallback) */
  avatarConfig: Avatar2DConfig
  /** Location permission status during onboarding */
  locationPermissionStatus: OnboardingLocationPermissionStatus

  /** Go to next step */
  nextStep: () => void
  /** Go to previous step */
  prevStep: () => void
  /** Go to a specific step (0-based index) */
  goToStep: (step: number) => void
  /** Skip onboarding entirely (marks as complete) */
  skipOnboarding: () => void
  /** Complete onboarding (called on final step) */
  completeOnboarding: () => void
  /** Reset onboarding state (for testing/debugging) */
  resetOnboarding: () => void
  /** Set the avatar configuration */
  setAvatar: (config: Avatar2DConfig) => void
  /** Set the location permission status */
  setLocationPermission: (status: OnboardingLocationPermissionStatus) => void
}

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Default storage key for onboarding state
 */
export const ONBOARDING_STORAGE_KEY = 'backtrack_onboarding'

/**
 * Default number of onboarding steps
 */
export const DEFAULT_TOTAL_STEPS = 6

/**
 * Default options for the hook
 */
const DEFAULT_OPTIONS: Required<UseOnboardingStateOptions> = {
  totalSteps: DEFAULT_TOTAL_STEPS,
  storageKey: ONBOARDING_STORAGE_KEY,
  persistStep: true,
}

/**
 * Initial persisted state
 */
const INITIAL_PERSISTED_STATE: OnboardingPersistedState = {
  isComplete: false,
  lastStep: 0,
  completedAt: null,
  avatarConfig: null,
  locationPermissionStatus: 'pending',
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
// HOOK
// ============================================================================

/**
 * useOnboardingState - Custom hook for onboarding state management
 *
 * @param options - Configuration options
 * @returns Onboarding state and control functions
 *
 * @example
 * // Basic usage
 * const { currentStep, nextStep, isComplete } = useOnboardingState()
 *
 * @example
 * // With custom options
 * const onboarding = useOnboardingState({
 *   totalSteps: 5,
 *   persistStep: true,
 * })
 *
 * @example
 * // Skip or complete flow
 * const { skipOnboarding, completeOnboarding, isLastStep } = useOnboardingState()
 *
 * // On skip button click
 * skipOnboarding()
 *
 * // On final step continue
 * if (isLastStep) {
 *   completeOnboarding()
 * }
 */
export function useOnboardingState(
  options: UseOnboardingStateOptions = {}
): UseOnboardingStateResult {
  // Merge options with defaults
  const config = { ...DEFAULT_OPTIONS, ...options }

  // ---------------------------------------------------------------------------
  // STATE
  // ---------------------------------------------------------------------------

  const [currentStep, setCurrentStep] = useState(0)
  const [isComplete, setIsComplete] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [avatarConfig, setAvatarConfigState] = useState<Avatar2DConfig>(DEFAULT_AVATAR_CONFIG)
  const [locationPermissionStatus, setLocationPermissionStatusState] =
    useState<OnboardingLocationPermissionStatus>('pending')

  // ---------------------------------------------------------------------------
  // COMPUTED VALUES
  // ---------------------------------------------------------------------------

  const isFirstStep = currentStep === 0
  const isLastStep = currentStep === config.totalSteps - 1
  const progress = useMemo(
    () => Math.round(((currentStep + 1) / config.totalSteps) * 100),
    [currentStep, config.totalSteps]
  )

  // ---------------------------------------------------------------------------
  // PERSISTENCE FUNCTIONS
  // ---------------------------------------------------------------------------

  /**
   * Load persisted state from localStorage
   */
  const loadPersistedState = useCallback((): OnboardingPersistedState => {
    const stored = getFromStorage<OnboardingPersistedState>(config.storageKey)
    return stored || INITIAL_PERSISTED_STATE
  }, [config.storageKey])

  /**
   * Save state to localStorage
   */
  const savePersistedState = useCallback(
    (state: Partial<OnboardingPersistedState>) => {
      const current = loadPersistedState()
      const updated: OnboardingPersistedState = {
        ...current,
        ...state,
      }
      setToStorage(config.storageKey, updated)
    },
    [config.storageKey, loadPersistedState]
  )

  // ---------------------------------------------------------------------------
  // NAVIGATION FUNCTIONS
  // ---------------------------------------------------------------------------

  /**
   * Go to the next step
   */
  const nextStep = useCallback(() => {
    setCurrentStep((prev) => {
      const next = Math.min(prev + 1, config.totalSteps - 1)
      if (config.persistStep) {
        savePersistedState({ lastStep: next })
      }

      // Track step completion (when moving to next step, the previous step was completed)
      trackEvent(AnalyticsEvent.ONBOARDING_STEP_COMPLETED, {
        step_number: prev,
        step_name: `step_${prev}`,
      })

      return next
    })
  }, [config.totalSteps, config.persistStep, savePersistedState])

  /**
   * Go to the previous step
   */
  const prevStep = useCallback(() => {
    setCurrentStep((prev) => {
      const next = Math.max(prev - 1, 0)
      if (config.persistStep) {
        savePersistedState({ lastStep: next })
      }
      return next
    })
  }, [config.persistStep, savePersistedState])

  /**
   * Go to a specific step
   */
  const goToStep = useCallback(
    (step: number) => {
      const validStep = Math.max(0, Math.min(step, config.totalSteps - 1))
      setCurrentStep(validStep)
      if (config.persistStep) {
        savePersistedState({ lastStep: validStep })
      }
    },
    [config.totalSteps, config.persistStep, savePersistedState]
  )

  // ---------------------------------------------------------------------------
  // COMPLETION FUNCTIONS
  // ---------------------------------------------------------------------------

  /**
   * Mark onboarding as complete
   */
  const completeOnboarding = useCallback(() => {
    const completedAt = new Date().toISOString()
    savePersistedState({
      isComplete: true,
      completedAt,
      lastStep: config.totalSteps - 1,
    })
    setIsComplete(true)

    // Track onboarding completion
    trackEvent(AnalyticsEvent.ONBOARDING_COMPLETED)
  }, [config.totalSteps, savePersistedState])

  /**
   * Skip onboarding (marks as complete)
   */
  const skipOnboarding = useCallback(() => {
    completeOnboarding()
  }, [completeOnboarding])

  /**
   * Reset onboarding state (for testing/debugging)
   */
  const resetOnboarding = useCallback(() => {
    removeFromStorage(config.storageKey)
    setCurrentStep(0)
    setIsComplete(false)
    setAvatarConfigState(DEFAULT_AVATAR_CONFIG)
    setLocationPermissionStatusState('pending')
  }, [config.storageKey])

  // ---------------------------------------------------------------------------
  // AVATAR FUNCTIONS
  // ---------------------------------------------------------------------------

  /**
   * Set avatar configuration and persist to localStorage
   */
  const setAvatar = useCallback(
    (newAvatarConfig: Avatar2DConfig) => {
      setAvatarConfigState(newAvatarConfig)
      savePersistedState({ avatarConfig: newAvatarConfig })
    },
    [savePersistedState]
  )

  // ---------------------------------------------------------------------------
  // LOCATION PERMISSION FUNCTIONS
  // ---------------------------------------------------------------------------

  /**
   * Set location permission status and persist to localStorage
   *
   * This tracks the user's choice during onboarding:
   * - 'granted': User granted location permission
   * - 'denied': User denied location permission
   * - 'skipped': User skipped the location permission step
   */
  const setLocationPermission = useCallback(
    (status: OnboardingLocationPermissionStatus) => {
      setLocationPermissionStatusState(status)
      savePersistedState({ locationPermissionStatus: status })
    },
    [savePersistedState]
  )

  // ---------------------------------------------------------------------------
  // EFFECTS
  // ---------------------------------------------------------------------------

  /**
   * Initialize state from localStorage on mount
   */
  useEffect(() => {
    // Only run on client side
    if (!isBrowser()) {
      setIsLoading(false)
      return
    }

    const persisted = loadPersistedState()

    // Set completion status
    setIsComplete(persisted.isComplete)

    // Resume from last step if not complete and persistStep is enabled
    if (!persisted.isComplete && config.persistStep && persisted.lastStep > 0) {
      setCurrentStep(persisted.lastStep)
    }

    // Track onboarding started if not complete and starting fresh
    if (!persisted.isComplete && persisted.lastStep === 0) {
      trackEvent(AnalyticsEvent.ONBOARDING_STARTED)
    }

    // Load saved avatar config or use default
    if (persisted.avatarConfig) {
      setAvatarConfigState(persisted.avatarConfig)
    }

    // Load saved location permission status or use default
    if (persisted.locationPermissionStatus) {
      setLocationPermissionStatusState(persisted.locationPermissionStatus)
    }

    setIsLoading(false)
    // Only run on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ---------------------------------------------------------------------------
  // RETURN
  // ---------------------------------------------------------------------------

  return {
    // State
    currentStep,
    isComplete,
    isLoading,
    totalSteps: config.totalSteps,
    isFirstStep,
    isLastStep,
    progress,
    avatarConfig,
    locationPermissionStatus,

    // Navigation
    nextStep,
    prevStep,
    goToStep,

    // Completion
    skipOnboarding,
    completeOnboarding,
    resetOnboarding,

    // Avatar
    setAvatar,

    // Location Permission
    setLocationPermission,
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Check if onboarding has been completed
 *
 * Utility function for checking completion without using the hook.
 * Useful for redirect logic in layouts or middleware.
 *
 * @param storageKey - Optional custom storage key
 * @returns Whether onboarding is complete
 *
 * @example
 * // In a layout or page component
 * if (isOnboardingComplete()) {
 *   // User has completed onboarding
 * }
 */
export function isOnboardingComplete(
  storageKey: string = ONBOARDING_STORAGE_KEY
): boolean {
  const stored = getFromStorage<OnboardingPersistedState>(storageKey)
  return stored?.isComplete ?? false
}

/**
 * Get the last visited onboarding step
 *
 * @param storageKey - Optional custom storage key
 * @returns Last step index or 0 if not found
 */
export function getLastOnboardingStep(
  storageKey: string = ONBOARDING_STORAGE_KEY
): number {
  const stored = getFromStorage<OnboardingPersistedState>(storageKey)
  return stored?.lastStep ?? 0
}

/**
 * Get the stored avatar configuration
 *
 * Utility function for getting avatar config without using the hook.
 * Returns DEFAULT_AVATAR_CONFIG if no stored config exists.
 *
 * @param storageKey - Optional custom storage key
 * @returns Avatar configuration
 */
export function getOnboardingAvatarConfig(
  storageKey: string = ONBOARDING_STORAGE_KEY
): Avatar2DConfig {
  const stored = getFromStorage<OnboardingPersistedState>(storageKey)
  return stored?.avatarConfig ?? DEFAULT_AVATAR_CONFIG
}

/**
 * Save avatar configuration programmatically
 *
 * Utility function for saving avatar config without using the hook.
 * Useful for edge cases or external integrations.
 *
 * @param avatarConfig - Avatar configuration to save
 * @param storageKey - Optional custom storage key
 */
export function setOnboardingAvatarConfig(
  avatarConfig: Avatar2DConfig,
  storageKey: string = ONBOARDING_STORAGE_KEY
): void {
  const stored = getFromStorage<OnboardingPersistedState>(storageKey)
  const updated: OnboardingPersistedState = {
    isComplete: stored?.isComplete ?? false,
    lastStep: stored?.lastStep ?? 0,
    completedAt: stored?.completedAt ?? null,
    avatarConfig,
    locationPermissionStatus: stored?.locationPermissionStatus ?? 'pending',
  }
  setToStorage(storageKey, updated)
}

/**
 * Mark onboarding as complete programmatically
 *
 * Utility function for marking completion without using the hook.
 * Useful for edge cases or external integrations.
 *
 * @param storageKey - Optional custom storage key
 */
export function markOnboardingComplete(
  storageKey: string = ONBOARDING_STORAGE_KEY
): void {
  const stored = getFromStorage<OnboardingPersistedState>(storageKey)
  const updated: OnboardingPersistedState = {
    isComplete: true,
    lastStep: stored?.lastStep ?? 0,
    completedAt: new Date().toISOString(),
    avatarConfig: stored?.avatarConfig ?? null,
    locationPermissionStatus: stored?.locationPermissionStatus ?? 'pending',
  }
  setToStorage(storageKey, updated)
}

/**
 * Get the stored location permission status
 *
 * Utility function for getting location permission status without using the hook.
 * Returns 'pending' if no stored status exists.
 *
 * @param storageKey - Optional custom storage key
 * @returns Location permission status
 */
export function getOnboardingLocationPermissionStatus(
  storageKey: string = ONBOARDING_STORAGE_KEY
): OnboardingLocationPermissionStatus {
  const stored = getFromStorage<OnboardingPersistedState>(storageKey)
  return stored?.locationPermissionStatus ?? 'pending'
}

/**
 * Save location permission status programmatically
 *
 * Utility function for saving location permission status without using the hook.
 * Useful for edge cases or external integrations.
 *
 * @param status - Location permission status to save
 * @param storageKey - Optional custom storage key
 */
export function setOnboardingLocationPermissionStatus(
  status: OnboardingLocationPermissionStatus,
  storageKey: string = ONBOARDING_STORAGE_KEY
): void {
  const stored = getFromStorage<OnboardingPersistedState>(storageKey)
  const updated: OnboardingPersistedState = {
    isComplete: stored?.isComplete ?? false,
    lastStep: stored?.lastStep ?? 0,
    completedAt: stored?.completedAt ?? null,
    avatarConfig: stored?.avatarConfig ?? null,
    locationPermissionStatus: status,
  }
  setToStorage(storageKey, updated)
}

/**
 * Clear onboarding state
 *
 * Utility function for resetting onboarding state.
 * Useful for testing or allowing users to re-experience onboarding.
 *
 * @param storageKey - Optional custom storage key
 */
export function clearOnboardingState(
  storageKey: string = ONBOARDING_STORAGE_KEY
): void {
  removeFromStorage(storageKey)
}

// ============================================================================
// EXPORTS
// ============================================================================

export default useOnboardingState
