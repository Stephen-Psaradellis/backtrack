/**
 * useTutorialState Hook
 *
 * Custom hook for managing tutorial tooltip visibility and completion state
 * in the Love Ledger app. Handles first-use detection, persistent dismissal,
 * and replay functionality.
 *
 * Features:
 * - Automatic first-use detection via AsyncStorage
 * - Persistent dismissal state across app restarts
 * - Replay functionality for Settings integration
 * - Fail-safe behavior (shows tooltip on storage errors)
 * - Loading state management
 *
 * @example
 * ```tsx
 * function CreatePostScreen() {
 *   const { isVisible, markComplete, loading } = useTutorialState('post_creation')
 *
 *   if (loading) return null
 *
 *   return (
 *     <Tooltip
 *       isVisible={isVisible}
 *       onClose={markComplete}
 *       content={<TutorialContent />}
 *     >
 *       <CreatePostForm />
 *     </Tooltip>
 *   )
 * }
 * ```
 */

import { useState, useEffect, useCallback, useRef } from 'react'

import {
  type TutorialFeature,
  isTutorialCompleted,
  saveTutorialCompletion,
  clearTutorialCompletion,
} from '../utils/tutorialStorage'

// ============================================================================
// TYPES
// ============================================================================

/**
 * State for tutorial visibility and completion
 */
export interface TutorialState {
  /** Whether the tutorial tooltip is currently visible */
  isVisible: boolean
  /** Whether the tutorial has been completed (dismissed) */
  hasCompleted: boolean
  /** Whether the state is still being loaded from storage */
  loading: boolean
  /** Any error that occurred during storage operations */
  error: string | null
}

/**
 * Options for the useTutorialState hook
 */
export interface UseTutorialStateOptions {
  /** Whether to automatically show the tooltip on first use (default: true) */
  autoShow?: boolean
  /** Delay in milliseconds before showing the tooltip (default: 500) */
  showDelay?: number
}

/**
 * Return value from useTutorialState hook
 */
export interface UseTutorialStateResult extends TutorialState {
  /** Mark the tutorial as complete (dismiss permanently) */
  markComplete: () => Promise<void>
  /** Trigger a replay of the tutorial (shows tooltip again) */
  replay: () => Promise<void>
  /** Hide the tooltip without marking as complete */
  hide: () => void
  /** Show the tooltip (if not already completed) */
  show: () => void
}

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Default options for tutorial state hook
 */
const DEFAULT_OPTIONS: Required<UseTutorialStateOptions> = {
  autoShow: true,
  showDelay: 500,
}

/**
 * Initial tutorial state
 */
const INITIAL_STATE: TutorialState = {
  isVisible: false,
  hasCompleted: false,
  loading: true,
  error: null,
}

/**
 * Error messages for tutorial state operations
 */
const ERROR_MESSAGES = {
  MARK_COMPLETE_FAILED: 'Failed to save tutorial completion.',
  REPLAY_FAILED: 'Failed to reset tutorial state.',
  LOAD_FAILED: 'Failed to load tutorial state.',
} as const

// ============================================================================
// HOOK
// ============================================================================

/**
 * useTutorialState - Custom hook for tutorial tooltip state management
 *
 * @param featureName - The tutorial feature name (e.g., 'post_creation')
 * @param options - Configuration options for tutorial behavior
 * @returns Tutorial state and control functions
 *
 * @example
 * // Basic usage - auto-shows on first use
 * const { isVisible, markComplete } = useTutorialState('post_creation')
 *
 * @example
 * // With delay before showing
 * const tutorial = useTutorialState('ledger_browsing', {
 *   showDelay: 1000, // Wait 1 second before showing
 * })
 *
 * @example
 * // Disable auto-show for manual control
 * const { show, hide, replay } = useTutorialState('messaging', {
 *   autoShow: false,
 * })
 *
 * // Manually trigger the tooltip
 * const handleHelp = () => show()
 */
export function useTutorialState(
  featureName: TutorialFeature,
  options: UseTutorialStateOptions = {}
): UseTutorialStateResult {
  // Merge options with defaults
  const config = { ...DEFAULT_OPTIONS, ...options }

  // ---------------------------------------------------------------------------
  // STATE
  // ---------------------------------------------------------------------------

  const [state, setState] = useState<TutorialState>(INITIAL_STATE)

  // Ref to track if component is mounted (prevent state updates after unmount)
  const mountedRef = useRef(true)
  // Ref for the show delay timeout
  const showTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ---------------------------------------------------------------------------
  // HELPER FUNCTIONS
  // ---------------------------------------------------------------------------

  /**
   * Set error state
   */
  const setError = useCallback((error: string) => {
    if (!mountedRef.current) return
    setState((prev) => ({
      ...prev,
      loading: false,
      error,
    }))
  }, [])

  /**
   * Update visibility state
   */
  const setVisible = useCallback((isVisible: boolean) => {
    if (!mountedRef.current) return
    setState((prev) => ({
      ...prev,
      isVisible,
    }))
  }, [])

  // ---------------------------------------------------------------------------
  // CONTROL FUNCTIONS
  // ---------------------------------------------------------------------------

  /**
   * Mark the tutorial as complete (permanently dismiss)
   */
  const markComplete = useCallback(async (): Promise<void> => {
    try {
      // Hide immediately for responsive UI
      if (mountedRef.current) {
        setState((prev) => ({
          ...prev,
          isVisible: false,
          hasCompleted: true,
        }))
      }

      // Persist to storage
      const result = await saveTutorialCompletion(featureName)

      if (!result.success && mountedRef.current) {
        // Revert if save failed (though tooltip stays hidden for UX)
        setState((prev) => ({
          ...prev,
          error: result.error || ERROR_MESSAGES.MARK_COMPLETE_FAILED,
        }))
      }
    } catch {
      if (mountedRef.current) {
        setError(ERROR_MESSAGES.MARK_COMPLETE_FAILED)
      }
    }
  }, [featureName, setError])

  /**
   * Replay the tutorial (clear completion and show)
   */
  const replay = useCallback(async (): Promise<void> => {
    try {
      // Clear completion from storage
      const result = await clearTutorialCompletion(featureName)

      if (mountedRef.current) {
        if (result.success) {
          setState((prev) => ({
            ...prev,
            isVisible: true,
            hasCompleted: false,
            error: null,
          }))
        } else {
          // Still show the tooltip even if clear failed
          setState((prev) => ({
            ...prev,
            isVisible: true,
            error: result.error || ERROR_MESSAGES.REPLAY_FAILED,
          }))
        }
      }
    } catch {
      if (mountedRef.current) {
        // Still show the tooltip on error
        setState((prev) => ({
          ...prev,
          isVisible: true,
          error: ERROR_MESSAGES.REPLAY_FAILED,
        }))
      }
    }
  }, [featureName])

  /**
   * Hide the tooltip without marking as complete
   */
  const hide = useCallback((): void => {
    setVisible(false)
  }, [setVisible])

  /**
   * Show the tooltip (if not already completed)
   */
  const show = useCallback((): void => {
    setVisible(true)
  }, [setVisible])

  // ---------------------------------------------------------------------------
  // EFFECTS
  // ---------------------------------------------------------------------------

  /**
   * Load completion state on mount
   */
  useEffect(() => {
    const loadCompletionState = async () => {
      try {
        const completed = await isTutorialCompleted(featureName)

        if (!mountedRef.current) return

        setState((prev) => ({
          ...prev,
          hasCompleted: completed,
          loading: false,
          error: null,
        }))

        // Auto-show if not completed and autoShow is enabled
        if (!completed && config.autoShow) {
          // Apply show delay
          showTimeoutRef.current = setTimeout(() => {
            if (mountedRef.current) {
              setVisible(true)
            }
          }, config.showDelay)
        }
      } catch {
        if (!mountedRef.current) return

        // Fail-safe: show tooltip on error (better to over-show than under-show)
        setState({
          isVisible: config.autoShow,
          hasCompleted: false,
          loading: false,
          error: ERROR_MESSAGES.LOAD_FAILED,
        })
      }
    }

    loadCompletionState()

    // Cleanup on unmount
    return () => {
      mountedRef.current = false
      if (showTimeoutRef.current) {
        clearTimeout(showTimeoutRef.current)
        showTimeoutRef.current = null
      }
    }
    // Only run on mount and when featureName changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [featureName])

  // ---------------------------------------------------------------------------
  // RETURN
  // ---------------------------------------------------------------------------

  return {
    // Tutorial state
    ...state,

    // Control functions
    markComplete,
    replay,
    hide,
    show,
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export default useTutorialState
