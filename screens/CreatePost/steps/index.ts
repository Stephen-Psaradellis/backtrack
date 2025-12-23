/**
 * CreatePost Step Components
 *
 * Barrel export for all step components used in the CreatePost wizard flow.
 * Each step handles a specific part of the post creation process.
 *
 * Steps:
 * 1. SelfieStep - Capture user's selfie for verification
 * 2. AvatarStep - Build avatar of the person they saw
 * 3. NoteStep - Write a personalized note
 * 4. LocationStep - Select where they saw the person
 * 5. ReviewStep - Review and submit the post
 *
 * @example
 * ```tsx
 * import { SelfieStep, AvatarStep, NoteStep, LocationStep, ReviewStep } from './steps'
 * ```
 */

// Selfie capture step
export { SelfieStep, type SelfieStepProps } from './SelfieStep'

// Avatar builder step
export { AvatarStep, type AvatarStepProps } from './AvatarStep'

// Note writing step
export { NoteStep, type NoteStepProps } from './NoteStep'

// Location selection step
export { LocationStep, type LocationStepProps } from './LocationStep'

// Review and submit step
export { ReviewStep, type ReviewStepProps } from './ReviewStep'
