/**
 * Onboarding Components Module
 *
 * This module provides all components for the Backtrack onboarding flow.
 * The onboarding is designed to complete in under 3 minutes and includes:
 * - Welcome screen introducing the app concept
 * - Avatar creation step
 * - Location permission request
 * - Producer demo (posting about others)
 * - Consumer demo (finding posts about you)
 * - Completion screen
 *
 * @module onboarding
 *
 * @example
 * ```tsx
 * import {
 *   WelcomeScreen,
 *   AvatarCreationStep,
 *   LocationPermissionStep,
 *   ProducerDemoScreen,
 *   ConsumerDemoScreen,
 *   OnboardingComplete,
 *   OnboardingStepper,
 * } from './'
 *
 * // Use in onboarding flow
 * function OnboardingFlow() {
 *   const [step, setStep] = useState(0)
 *   return (
 *     <div>
 *       <OnboardingStepper currentStep={step} showTimeEstimate />
 *       {step === 0 && <WelcomeScreen onContinue={() => setStep(1)} onSkip={skipOnboarding} />}
 *       {step === 1 && <AvatarCreationStep onContinue={handleAvatar} onSkip={skipOnboarding} onBack={() => setStep(0)} />}
 *       // ... other steps
 *     </div>
 *   )
 * }
 * ```
 */

// ============================================================================
// Step Screen Components
// ============================================================================

/**
 * Welcome screen - first step of onboarding
 * Introduces Backtrack and the missed connections concept.
 */
export { WelcomeScreen } from './WelcomeScreen'
export type { WelcomeScreenProps } from './WelcomeScreen'

/**
 * Avatar creation step - second step of onboarding
 * Allows users to create a privacy-preserving avatar.
 */
export { AvatarCreationStep } from './AvatarCreationStep'
export type { AvatarCreationStepProps } from './AvatarCreationStep'

// Web-only components removed: LocationPermissionStep, ProducerDemoScreen,
// ConsumerDemoScreen, OnboardingComplete (were HTML/Tailwind, not React Native)

// ============================================================================
// Navigation & Progress Components
// ============================================================================

/**
 * Onboarding stepper/progress indicator
 * Shows visual progress through onboarding steps.
 */
export { OnboardingStepper } from './OnboardingStepper'
export type { OnboardingStepperProps } from './OnboardingStepper'
