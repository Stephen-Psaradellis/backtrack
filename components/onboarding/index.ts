/**
 * Onboarding Components Module
 *
 * This module provides all components for the Love Ledger onboarding flow.
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
 * } from '@/components/onboarding'
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
 * Introduces Love Ledger and the missed connections concept.
 */
export { WelcomeScreen } from './WelcomeScreen'
export type { WelcomeScreenProps } from './WelcomeScreen'

/**
 * Avatar creation step - second step of onboarding
 * Allows users to create a privacy-preserving avatar.
 */
export { AvatarCreationStep } from './AvatarCreationStep'
export type { AvatarCreationStepProps } from './AvatarCreationStep'

/**
 * Location permission step - third step of onboarding
 * Requests location permission with graceful degradation.
 */
export { LocationPermissionStep } from './LocationPermissionStep'
export type { LocationPermissionStepProps } from './LocationPermissionStep'

/**
 * Producer demo screen - fourth step of onboarding
 * Shows how to post about someone you noticed.
 */
export { ProducerDemoScreen } from './ProducerDemoScreen'
export type { ProducerDemoScreenProps } from './ProducerDemoScreen'

/**
 * Consumer demo screen - fifth step of onboarding
 * Shows how to browse and find posts about you.
 */
export { ConsumerDemoScreen } from './ConsumerDemoScreen'
export type { ConsumerDemoScreenProps } from './ConsumerDemoScreen'

/**
 * Onboarding complete screen - final step of onboarding
 * Celebrates completion and provides CTA to enter the app.
 */
export { OnboardingComplete } from './OnboardingComplete'
export type { OnboardingCompleteProps } from './OnboardingComplete'

// ============================================================================
// Navigation & Progress Components
// ============================================================================

/**
 * Onboarding stepper/progress indicator
 * Shows visual progress through onboarding steps.
 */
export { OnboardingStepper } from './OnboardingStepper'
export type { OnboardingStepperProps } from './OnboardingStepper'
