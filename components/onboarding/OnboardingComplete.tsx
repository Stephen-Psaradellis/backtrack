'use client'

import { memo, useCallback } from 'react'
import { Button } from '@/components/ui/Button'
import { getStepById } from '@/lib/onboarding/onboardingConfig'

// ============================================================================
// Types
// ============================================================================

export interface OnboardingCompleteProps {
  /** Callback when user clicks the CTA to enter the app */
  onComplete: () => void
  /** Callback when user clicks "Back" */
  onBack: () => void
  /** Whether the complete action is loading */
  isLoading?: boolean
  /** Additional CSS classes for the container */
  className?: string
}

// ============================================================================
// Celebration Icon Component
// ============================================================================

/**
 * Celebration icon for the completion screen with entrance and subtle bounce animation
 */
const CelebrationIcon = memo(function CelebrationIcon() {
  return (
    <div
      className="mx-auto w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-gradient-to-br from-pink-100 to-purple-100 dark:from-pink-900/40 dark:to-purple-800/30 flex items-center justify-center shadow-lg shadow-pink-500/10 animate-fade-in-scale"
      aria-hidden="true"
    >
      {/* Party popper with subtle bounce animation */}
      <div className="relative animate-subtle-bounce">
        <span className="text-5xl sm:text-6xl" role="img" aria-label="celebration">
          🎉
        </span>
        {/* Sparkle accents */}
        <span
          className="absolute -top-2 -right-2 text-lg animate-pulse"
          aria-hidden="true"
        >
          ✨
        </span>
        <span
          className="absolute -bottom-1 -left-2 text-sm animate-pulse animation-delay-100"
          aria-hidden="true"
        >
          ✨
        </span>
      </div>
    </div>
  )
})

// ============================================================================
// Action Item Component
// ============================================================================

interface ActionItemProps {
  /** Icon emoji for the action */
  icon: string
  /** Action title */
  title: string
  /** Action description */
  description: string
}

/**
 * Individual action item showing what users can do in the app with hover effect
 */
const ActionItem = memo(function ActionItem({
  icon,
  title,
  description,
}: ActionItemProps) {
  return (
    <div className="flex items-start gap-3 group">
      {/* Action icon with hover effect */}
      <div
        className="flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-pink-50 dark:bg-pink-900/20 flex items-center justify-center transition-transform duration-200 group-hover:scale-105"
        aria-hidden="true"
      >
        <span className="text-lg sm:text-xl">{icon}</span>
      </div>

      {/* Action content */}
      <div className="flex-1 min-w-0">
        <h3 className="text-sm sm:text-base font-medium text-gray-900 dark:text-white">
          {title}
        </h3>
        <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
          {description}
        </p>
      </div>
    </div>
  )
})

// ============================================================================
// Constants
// ============================================================================

/**
 * Actions users can take after completing onboarding
 */
const COMPLETION_ACTIONS: readonly ActionItemProps[] = [
  {
    icon: '✍️',
    title: 'Post a missed connection',
    description: 'Describe someone who caught your eye',
  },
  {
    icon: '🔍',
    title: 'Browse nearby posts',
    description: 'See if anyone noticed you',
  },
  {
    icon: '💬',
    title: 'Start a conversation',
    description: 'Connect when there\'s a match',
  },
] as const

// ============================================================================
// Main Component
// ============================================================================

/**
 * Completion screen for the onboarding flow
 *
 * This is the final screen users see after completing onboarding.
 * It shows a subtle celebration, summarizes what they can do,
 * and provides a prominent CTA to enter the main app.
 *
 * @example
 * ```tsx
 * <OnboardingComplete
 *   onComplete={() => {
 *     markOnboardingComplete()
 *     router.push('/')
 *   }}
 *   onBack={() => goToPreviousStep()}
 * />
 * ```
 */
function OnboardingCompleteComponent({
  onComplete,
  onBack,
  isLoading = false,
  className = '',
}: OnboardingCompleteProps) {
  // Get step config for button label
  const stepConfig = getStepById('complete')
  const primaryButtonLabel = stepConfig?.primaryButtonLabel ?? 'Enter Love Ledger'

  // Memoized handlers
  const handleComplete = useCallback(() => {
    onComplete()
  }, [onComplete])

  const handleBack = useCallback(() => {
    onBack()
  }, [onBack])

  // Container classes - min-h-0 enables proper flex shrinking for mobile scroll
  const containerClasses = [
    'flex flex-col h-full min-h-0',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={containerClasses} role="main" aria-labelledby="complete-heading">
      {/* Celebration section with entrance animations */}
      <header className="text-center mb-6 sm:mb-8">
        <CelebrationIcon />

        <h2
          id="complete-heading"
          className="mt-6 text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white animate-fade-in-up animation-delay-100"
        >
          You&apos;re All Set!
        </h2>

        <p className="mt-3 text-base sm:text-lg text-gray-600 dark:text-gray-300 max-w-xs sm:max-w-sm mx-auto leading-relaxed animate-fade-in-up animation-delay-200">
          Welcome to Love Ledger. Your journey to meaningful connections starts now.
        </p>
      </header>

      {/* What you can do section with staggered entrance - scrollable on small screens */}
      <section
        className="flex-1 min-h-0 overflow-y-auto touch-scroll-y mb-6 sm:mb-8"
        aria-labelledby="actions-heading"
      >
        <h3
          id="actions-heading"
          className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-4 animate-fade-in animation-delay-200"
        >
          What you can do
        </h3>

        <ul className="space-y-4 list-none p-0 m-0">
          {COMPLETION_ACTIONS.map((action, index) => (
            <li
              key={action.title}
              className={`animate-fade-in-up ${
                index === 0
                  ? 'animation-delay-300'
                  : index === 1
                  ? 'animation-delay-400'
                  : 'animation-delay-500'
              }`}
            >
              <ActionItem
                icon={action.icon}
                title={action.title}
                description={action.description}
              />
            </li>
          ))}
        </ul>
      </section>

      {/* Encouraging message */}
      <div className="text-center mb-6 sm:mb-8">
        <p className="text-xs sm:text-sm text-gray-400 dark:text-gray-500 leading-relaxed animate-fade-in animation-delay-500">
          Take your time. There&apos;s no rush to find your connection.
        </p>
      </div>

      {/* Action buttons - pb-safe adds safe area padding for devices with home indicators */}
      <footer className="flex-shrink-0 space-y-3 pb-safe" role="group" aria-label="Actions">
        {/* Primary CTA */}
        <Button
          variant="primary"
          size="lg"
          fullWidth
          onClick={handleComplete}
          isLoading={isLoading}
          rightIcon={
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 7l5 5m0 0l-5 5m5-5H6"
              />
            </svg>
          }
        >
          {primaryButtonLabel}
        </Button>

        {/* Back button - min-touch-target ensures 44px minimum touch target */}
        {stepConfig?.showBack && (
          <button
            type="button"
            onClick={handleBack}
            className="w-full text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 text-sm font-medium py-3 min-touch-target transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-pink-500 rounded-lg"
            aria-label="Go back to the previous step"
          >
            Go back
          </button>
        )}
      </footer>
    </div>
  )
}

// ============================================================================
// Memoized Export
// ============================================================================

/**
 * Custom comparison function for React.memo
 */
function arePropsEqual(
  prevProps: OnboardingCompleteProps,
  nextProps: OnboardingCompleteProps
): boolean {
  return (
    prevProps.isLoading === nextProps.isLoading &&
    prevProps.className === nextProps.className &&
    prevProps.onComplete === nextProps.onComplete &&
    prevProps.onBack === nextProps.onBack
  )
}

/**
 * Memoized OnboardingComplete component.
 * Final screen of the onboarding flow with celebration and CTA to enter app.
 */
export const OnboardingComplete = memo(OnboardingCompleteComponent, arePropsEqual)

// Set display name for debugging
OnboardingComplete.displayName = 'OnboardingComplete'

export default OnboardingComplete
