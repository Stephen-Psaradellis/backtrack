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
 * Steps in the create post flow
 */
export type CreatePostStep = 'photo' | 'avatar' | 'note' | 'location' | 'time' | 'review'

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
 * Step configuration for the flow
 */
export const STEPS: StepConfig[] = [
  {
    id: 'photo',
    title: 'Verify Yourself',
    subtitle: 'Select or take a photo to verify your identity',
    icon: '📸',
  },
  {
    id: 'avatar',
    title: 'Describe Who You Saw',
    subtitle: 'Build an avatar of the person you noticed',
    icon: '👤',
  },
  {
    id: 'note',
    title: 'Write a Note',
    subtitle: 'What would you like to say to them?',
    icon: '✍️',
  },
  {
    id: 'location',
    title: 'Where Did You See Them?',
    subtitle: 'Select the location of your missed connection',
    icon: '📍',
  },
  {
    id: 'time',
    title: 'When Did You See Them?',
    subtitle: 'Add when you saw them (optional)',
    icon: '🕐',
  },
  {
    id: 'review',
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
