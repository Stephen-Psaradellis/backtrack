/**
 * CreatePost Types and Constants
 *
 * Shared types and constants for the CreatePost wizard flow.
 * Defines step configuration, form data structure, and validation constants.
 */

import type { AvatarConfig } from '../../types/avatar'
import type { LocationItem } from '../../components/LocationPicker'

// ============================================================================
// TYPES
// ============================================================================

/**
 * Steps in the create post flow
 */
export type CreatePostStep = 'selfie' | 'avatar' | 'note' | 'location' | 'review'

/**
 * Form data for creating a post
 */
export interface CreatePostFormData {
  selfieUri: string | null
  targetAvatar: AvatarConfig
  note: string
  location: LocationItem | null
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
    id: 'selfie',
    title: 'Take a Selfie',
    subtitle: 'This is private and used for verification only',
    icon: '📷',
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
