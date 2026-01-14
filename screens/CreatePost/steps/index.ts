/**
 * CreatePost Step Components
 *
 * Barrel export for all step components used in the CreatePost wizard flow.
 *
 * New 3-Moment Flow:
 * 1. SceneStep - Where & When (location + time)
 * 2. MomentStep - Who & What (avatar + note)
 * 3. SealStep - Seal & Send (photo + review + submit)
 *
 * Legacy 6-Step Flow (kept for reference):
 * 1. PhotoStep - Select/upload verification photo
 * 2. AvatarStep - Build avatar of the person they saw
 * 3. NoteStep - Write a personalized note
 * 4. LocationStep - Select where they saw the person
 * 5. TimeStep - Optional time specification for when they saw the person
 * 6. ReviewStep - Review and submit the post
 *
 * @example
 * ```tsx
 * // New 3-moment flow
 * import { SceneStep, MomentStep, SealStep } from './steps'
 *
 * // Legacy (kept for reference)
 * import { PhotoStep, AvatarStep, NoteStep, LocationStep, TimeStep, ReviewStep } from './steps'
 * ```
 */

// =============================================================================
// NEW 3-MOMENT FLOW
// =============================================================================

// Scene step (Moment 1: Where & When)
export { SceneStep, type SceneStepProps } from './SceneStep'

// Moment step (Moment 2: Who & What)
export { MomentStep, type MomentStepProps } from './MomentStep'

// Seal step (Moment 3: Seal & Send)
export { SealStep, type SealStepProps } from './SealStep'

// =============================================================================
// LEGACY 6-STEP FLOW (kept for reference)
// =============================================================================

// Photo selection step
export { PhotoStep, type PhotoStepProps } from './PhotoStep'

// Avatar builder step
export { AvatarStep, type AvatarStepProps } from './AvatarStep'

// Note writing step
export { NoteStep, type NoteStepProps } from './NoteStep'

// Location selection step
export { LocationStep, type LocationStepProps } from './LocationStep'

// Time specification step (optional)
export { TimeStep, type TimeStepProps } from './TimeStep'

// Review and submit step
export { ReviewStep, type ReviewStepProps } from './ReviewStep'
