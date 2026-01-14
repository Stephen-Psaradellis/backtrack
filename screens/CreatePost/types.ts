/**
 * CreatePost Types and Constants
 *
 * Shared types and constants for the CreatePost wizard flow.
 * Defines step configuration, form data structure, and validation constants.
 */

import type { StoredAvatar } from '../../components/avatar/types'
import type { LocationItem } from '../../components/LocationPicker'
import type { TimeGranularity } from '../../types/database'

// ============================================================================
// TYPES
// ============================================================================

/**
 * Steps in the create post flow (legacy 6-step)
 */
export type CreatePostStepLegacy = 'photo' | 'avatar' | 'note' | 'location' | 'time' | 'review'

/**
 * Steps in the new 3-moment create post flow
 * - scene: Where & When (location + time)
 * - moment: Who & What (avatar + note)
 * - seal: Seal & Send (photo verification + review + submit)
 */
export type CreatePostStep = 'scene' | 'moment' | 'seal'

/**
 * Form data for creating a post
 */
export interface CreatePostFormData {
  /** Selected profile photo ID for verification */
  selectedPhotoId: string | null
  /** Avatar describing the person seen */
  targetAvatar: StoredAvatar | null
  /** Message/note to the person */
  note: string
  /** Location where the connection happened */
  location: LocationItem | null
  /** Date/time when the sighting occurred (optional) */
  sightingDate: Date | null
  /** Granularity of the sighting time: specific time or approximate period */
  timeGranularity: TimeGranularity | null
}

/**
 * Step configuration
 */
export interface StepConfig {
  id: CreatePostStep
  title: string
  subtitle: string
  icon: string
}

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Step configuration for the new 3-moment flow
 */
export const STEPS: StepConfig[] = [
  {
    id: 'scene',
    title: 'Where & When',
    subtitle: 'Set the scene for your missed connection',
    icon: '📍',
  },
  {
    id: 'moment',
    title: 'Who & What',
    subtitle: 'Describe who you saw and your message',
    icon: '👤',
  },
  {
    id: 'seal',
    title: 'Seal & Send',
    subtitle: 'Verify yourself and post',
    icon: '✉️',
  },
]

/**
 * Legacy step configuration (for reference)
 * Note: Uses CreatePostStepLegacy type, not the new CreatePostStep
 */
export const STEPS_LEGACY = [
  {
    id: 'photo' as CreatePostStepLegacy,
    title: 'Verify Yourself',
    subtitle: 'Select or take a photo to verify your identity',
    icon: '📸',
  },
  {
    id: 'avatar' as CreatePostStepLegacy,
    title: 'Describe Who You Saw',
    subtitle: 'Build an avatar of the person you noticed',
    icon: '👤',
  },
  {
    id: 'note' as CreatePostStepLegacy,
    title: 'Write a Note',
    subtitle: 'What would you like to say to them?',
    icon: '✍️',
  },
  {
    id: 'location' as CreatePostStepLegacy,
    title: 'Where Did You See Them?',
    subtitle: 'Select the location of your missed connection',
    icon: '📍',
  },
  {
    id: 'time' as CreatePostStepLegacy,
    title: 'When Did You See Them?',
    subtitle: 'Add when you saw them (optional)',
    icon: '🕐',
  },
  {
    id: 'review' as CreatePostStepLegacy,
    title: 'Review Your Post',
    subtitle: "Make sure everything looks right before posting",
    icon: '✅',
  },
]

/**
 * Minimum note length
 */
export const MIN_NOTE_LENGTH = 10

/**
 * Maximum note length
 */
export const MAX_NOTE_LENGTH = 500
