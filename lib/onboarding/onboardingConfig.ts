/**
 * Onboarding Configuration
 *
 * Defines the steps, content, and flow logic for the Love Ledger onboarding process.
 * This configuration drives the multi-step onboarding flow, providing consistent
 * metadata for each step including titles, descriptions, and icons.
 *
 * The onboarding flow is designed to:
 * - Complete in under 3 minutes
 * - Explain the missed connections concept
 * - Guide avatar creation
 * - Request location permissions
 * - Demonstrate both producer and consumer flows
 *
 * @example
 * ```tsx
 * import { ONBOARDING_STEPS, getStepById } from 'lib/onboarding/onboardingConfig'
 *
 * // Get all steps
 * ONBOARDING_STEPS.forEach(step => {
 *   console.log(step.title)
 * })
 *
 * // Get specific step
 * const welcomeStep = getStepById('welcome')
 * ```
 */

// ============================================================================
// TYPES
// ============================================================================

/**
 * Unique identifier for each onboarding step
 */
export type OnboardingStepId =
  | 'welcome'
  | 'avatar'
  | 'location'
  | 'producer-demo'
  | 'consumer-demo'
  | 'complete'

/**
 * Configuration for a single onboarding step
 */
export interface OnboardingStep {
  /** Unique identifier for the step */
  id: OnboardingStepId
  /** Display title for the step */
  title: string
  /** Short description explaining the step */
  description: string
  /** Icon emoji for visual representation */
  icon: string
  /** Whether skip button should be shown on this step */
  showSkip: boolean
  /** Whether back button should be shown on this step */
  showBack: boolean
  /** Label for the primary action button */
  primaryButtonLabel: string
  /** Estimated time in seconds for this step */
  estimatedSeconds: number
}

/**
 * Feature highlight shown on welcome screen
 */
export interface OnboardingFeature {
  /** Icon emoji for the feature */
  icon: string
  /** Feature title */
  title: string
  /** Feature description */
  description: string
}

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Total number of onboarding steps
 */
export const TOTAL_ONBOARDING_STEPS = 6

/**
 * Target completion time in minutes
 */
export const TARGET_COMPLETION_MINUTES = 3

/**
 * All onboarding steps in order
 *
 * Step order:
 * 1. Welcome - Introduce Love Ledger concept
 * 2. Avatar - Create privacy-preserving avatar
 * 3. Location - Request location permission
 * 4. Producer Demo - Show how to post about others
 * 5. Consumer Demo - Show how to find posts about you
 * 6. Complete - Success screen with CTA
 */
export const ONBOARDING_STEPS: readonly OnboardingStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to Love Ledger',
    description:
      'A gentle way to find the people you noticed but never got to meet.',
    icon: '💝',
    showSkip: true,
    showBack: false,
    primaryButtonLabel: 'Get Started',
    estimatedSeconds: 20,
  },
  {
    id: 'avatar',
    title: 'Create Your Avatar',
    description:
      'Build an avatar that represents you. No photos needed - your privacy matters.',
    icon: '🎨',
    showSkip: true,
    showBack: true,
    primaryButtonLabel: 'Continue',
    estimatedSeconds: 45,
  },
  {
    id: 'location',
    title: 'Enable Location',
    description:
      'See missed connections near you. We only use your location when you open the app.',
    icon: '📍',
    showSkip: true,
    showBack: true,
    primaryButtonLabel: 'Enable Location',
    estimatedSeconds: 15,
  },
  {
    id: 'producer-demo',
    title: 'Post About Others',
    description:
      'Saw someone interesting? Describe them with an avatar and location. Maybe they will find your post.',
    icon: '✨',
    showSkip: true,
    showBack: true,
    primaryButtonLabel: 'Next',
    estimatedSeconds: 25,
  },
  {
    id: 'consumer-demo',
    title: 'Find Posts About You',
    description:
      'Browse nearby posts and see if someone noticed you. Your avatar helps them recognize you.',
    icon: '🔍',
    showSkip: true,
    showBack: true,
    primaryButtonLabel: 'Next',
    estimatedSeconds: 25,
  },
  {
    id: 'complete',
    title: "You're All Set!",
    description:
      'Start exploring Love Ledger. Post about someone you noticed or browse to see if anyone posted about you.',
    icon: '🎉',
    showSkip: false,
    showBack: true,
    primaryButtonLabel: 'Enter Love Ledger',
    estimatedSeconds: 10,
  },
] as const

/**
 * Features highlighted on the welcome screen
 *
 * These explain the core value proposition of Love Ledger
 * in an introvert-friendly, non-intimidating way.
 */
export const WELCOME_FEATURES: readonly OnboardingFeature[] = [
  {
    icon: '💝',
    title: 'Missed Connections',
    description:
      'Post about someone you noticed but never got to meet. Maybe they saw you too.',
  },
  {
    icon: '🎭',
    title: 'Avatar Privacy',
    description:
      'Describe people with avatars instead of photos. Safe, private, and respectful.',
  },
  {
    icon: '📍',
    title: 'Local & Nearby',
    description:
      'Find posts from places you visit. Coffee shops, bookstores, your favorite spots.',
  },
] as const

// ============================================================================
// STEP LOOKUP FUNCTIONS
// ============================================================================

/**
 * Get step configuration by ID
 *
 * @param id - Step ID to look up
 * @returns Step configuration or undefined if not found
 *
 * @example
 * const avatarStep = getStepById('avatar')
 * console.log(avatarStep?.title) // "Create Your Avatar"
 */
export function getStepById(id: OnboardingStepId): OnboardingStep | undefined {
  return ONBOARDING_STEPS.find((step) => step.id === id)
}

/**
 * Get step configuration by index (0-based)
 *
 * @param index - Step index
 * @returns Step configuration or undefined if out of bounds
 *
 * @example
 * const firstStep = getStepByIndex(0)
 * console.log(firstStep?.id) // "welcome"
 */
export function getStepByIndex(index: number): OnboardingStep | undefined {
  if (index < 0 || index >= ONBOARDING_STEPS.length) {
    return undefined
  }
  return ONBOARDING_STEPS[index]
}

/**
 * Get index of a step by ID
 *
 * @param id - Step ID to look up
 * @returns Step index or -1 if not found
 *
 * @example
 * const index = getStepIndex('location')
 * console.log(index) // 2
 */
export function getStepIndex(id: OnboardingStepId): number {
  return ONBOARDING_STEPS.findIndex((step) => step.id === id)
}

// ============================================================================
// PROGRESS CALCULATION
// ============================================================================

/**
 * Calculate progress percentage for a given step index
 *
 * @param currentStep - Current step index (0-based)
 * @returns Progress percentage (0-100)
 *
 * @example
 * const progress = calculateProgress(2)
 * console.log(progress) // 50 (step 3 of 6)
 */
export function calculateProgress(currentStep: number): number {
  if (currentStep < 0) return 0
  if (currentStep >= TOTAL_ONBOARDING_STEPS) return 100
  return Math.round(((currentStep + 1) / TOTAL_ONBOARDING_STEPS) * 100)
}

/**
 * Calculate estimated remaining time in seconds
 *
 * @param currentStep - Current step index (0-based)
 * @returns Estimated remaining seconds
 *
 * @example
 * const remaining = calculateRemainingTime(0)
 * console.log(remaining) // Total time minus first step
 */
export function calculateRemainingTime(currentStep: number): number {
  if (currentStep < 0 || currentStep >= TOTAL_ONBOARDING_STEPS) return 0

  return ONBOARDING_STEPS.slice(currentStep).reduce(
    (total, step) => total + step.estimatedSeconds,
    0
  )
}

/**
 * Format seconds as a human-readable time string
 *
 * @param seconds - Time in seconds
 * @returns Formatted string (e.g., "2 min", "45 sec")
 */
export function formatEstimatedTime(seconds: number): string {
  if (seconds < 60) {
    return `${seconds} sec`
  }
  const minutes = Math.ceil(seconds / 60)
  return `${minutes} min`
}

// ============================================================================
// VALIDATION
// ============================================================================

/**
 * Check if a step index is valid
 *
 * @param index - Step index to validate
 * @returns Whether the index is within valid bounds
 */
export function isValidStepIndex(index: number): boolean {
  return index >= 0 && index < TOTAL_ONBOARDING_STEPS
}

/**
 * Check if a step ID is valid
 *
 * @param id - Step ID to validate
 * @returns Whether the ID is a valid onboarding step
 */
export function isValidStepId(id: string): id is OnboardingStepId {
  return ONBOARDING_STEPS.some((step) => step.id === id)
}

// ============================================================================
// STEP NAVIGATION HELPERS
// ============================================================================

/**
 * Get the next step ID after the current step
 *
 * @param currentId - Current step ID
 * @returns Next step ID or null if at end
 */
export function getNextStepId(
  currentId: OnboardingStepId
): OnboardingStepId | null {
  const currentIndex = getStepIndex(currentId)
  if (currentIndex === -1 || currentIndex >= TOTAL_ONBOARDING_STEPS - 1) {
    return null
  }
  return ONBOARDING_STEPS[currentIndex + 1].id
}

/**
 * Get the previous step ID before the current step
 *
 * @param currentId - Current step ID
 * @returns Previous step ID or null if at beginning
 */
export function getPreviousStepId(
  currentId: OnboardingStepId
): OnboardingStepId | null {
  const currentIndex = getStepIndex(currentId)
  if (currentIndex <= 0) {
    return null
  }
  return ONBOARDING_STEPS[currentIndex - 1].id
}

/**
 * Check if step is the first step
 *
 * @param id - Step ID to check
 * @returns Whether this is the first step
 */
export function isFirstStep(id: OnboardingStepId): boolean {
  return getStepIndex(id) === 0
}

/**
 * Check if step is the last step
 *
 * @param id - Step ID to check
 * @returns Whether this is the last step
 */
export function isLastStep(id: OnboardingStepId): boolean {
  return getStepIndex(id) === TOTAL_ONBOARDING_STEPS - 1
}
