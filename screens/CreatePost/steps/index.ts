/**
 * CreatePost Step Components
 *
 * Barrel export for all step components used in the CreatePost wizard flow.
 *
 * 3-Moment Flow:
 * 1. SceneStep - Where & When (location + time)
 * 2. MomentStep - Who & What (avatar + note)
 * 3. SealStep - Seal & Send (photo + review + submit)
 *
 * @example
 * ```tsx
 * import { SceneStep, MomentStep, SealStep } from './steps'
 * ```
 */

// Scene step (Moment 1: Where & When)
export { SceneStep, type SceneStepProps } from './SceneStep'

// Moment step (Moment 2: Who & What)
export { MomentStep, type MomentStepProps } from './MomentStep'

// Seal step (Moment 3: Seal & Send)
export { SealStep, type SealStepProps } from './SealStep'
