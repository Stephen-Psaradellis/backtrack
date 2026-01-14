/**
 * CreatePost Module
 *
 * Barrel export for the CreatePost wizard module.
 * This module contains all components, hooks, types, and styles for
 * the multi-step post creation flow.
 *
 * @example
 * ```tsx
 * // Import the main screen component
 * import { CreatePostScreen } from './screens/CreatePostScreen'
 *
 * // Or import specific pieces from the module
 * import { useCreatePostForm, STEPS } from './screens/CreatePost'
 * ```
 */

// ============================================================================
// TYPES & CONSTANTS
// ============================================================================

export {
  type CreatePostStep,
  type CreatePostFormData,
  type StepConfig,
  STEPS,
  MIN_NOTE_LENGTH,
  MAX_NOTE_LENGTH,
} from './types'

// ============================================================================
// HOOKS
// ============================================================================

export {
  useCreatePostForm,
  type UseCreatePostFormOptions,
  type UseCreatePostFormResult,
} from './useCreatePostForm'

// ============================================================================
// STYLES
// ============================================================================

export { sharedStyles, COLORS, SCREEN_WIDTH } from './styles'

// ============================================================================
// UI COMPONENTS
// ============================================================================

export { StepHeader, type StepHeaderProps } from './components'
export { ProgressBar, type ProgressBarProps } from './components'

// ============================================================================
// STEP COMPONENTS (New 3-Moment Flow)
// ============================================================================

export {
  SceneStep,
  type SceneStepProps,
  MomentStep,
  type MomentStepProps,
  SealStep,
  type SealStepProps,
} from './steps'

// ============================================================================
// LEGACY STEP COMPONENTS (kept for reference)
// ============================================================================

export {
  AvatarStep,
  type AvatarStepProps,
  NoteStep,
  type NoteStepProps,
  LocationStep,
  type LocationStepProps,
  ReviewStep,
  type ReviewStepProps,
} from './steps'
