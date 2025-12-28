'use client'

import { memo, useCallback } from 'react'
import { Button } from '@/components/ui/Button'
import { WELCOME_FEATURES, getStepById } from '@/lib/onboarding/onboardingConfig'

// ============================================================================
// Types
// ============================================================================

export interface WelcomeScreenProps {
  /** Callback when user clicks "Get Started" */
  onContinue: () => void
  /** Callback when user clicks "Skip" */
  onSkip: () => void
  /** Whether the continue action is loading */
  isLoading?: boolean
  /** Additional CSS classes for the container */
  className?: string
}

// ============================================================================
// Feature Item Component
// ============================================================================

interface FeatureItemProps {
  /** Icon emoji for the feature */
  icon: string
  /** Feature title */
  title: string
  /** Feature description */
  description: string
}

/**
 * Individual feature highlight item with entrance animation
 */
const FeatureItem = memo(function FeatureItem({
  icon,
  title,
  description,
}: FeatureItemProps & { index?: number }) {
  return (
    <div className="flex items-start gap-3 sm:gap-4 group">
      {/* Feature icon with hover effect */}
      <div
        className="flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-pink-50 dark:bg-pink-900/20 flex items-center justify-center transition-transform duration-200 group-hover:scale-105"
        aria-hidden="true"
      >
        <span className="text-xl sm:text-2xl">{icon}</span>
      </div>

      {/* Feature content */}
      <div className="flex-1 min-w-0">
        <h3 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white">
          {title}
        </h3>
        <p className="mt-0.5 text-xs sm:text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
          {description}
        </p>
      </div>
    </div>
  )
})

// ============================================================================
// Hero Icon Component
// ============================================================================

/**
 * Large hero icon for the welcome screen with entrance animation
 */
const HeroIcon = memo(function HeroIcon() {
  return (
    <div
      className="mx-auto w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-gradient-to-br from-pink-100 to-pink-200 dark:from-pink-900/40 dark:to-pink-800/30 flex items-center justify-center shadow-lg shadow-pink-500/10 animate-fade-in-scale"
      aria-hidden="true"
    >
      {/* Heart icon with subtle animation */}
      <div className="relative">
        <svg
          className="w-12 h-12 sm:w-14 sm:h-14 text-pink-500 transition-transform duration-300 hover:scale-110"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
          />
        </svg>
        {/* Sparkle accent */}
        <span
          className="absolute -top-1 -right-1 text-lg animate-pulse"
          aria-hidden="true"
        >
          ✨
        </span>
      </div>
    </div>
  )
})

// ============================================================================
// Main Component
// ============================================================================

/**
 * Welcome screen for the onboarding flow
 *
 * This is the first screen users see when starting onboarding.
 * It introduces the Love Ledger concept with a gentle, introvert-friendly
 * approach that explains:
 * - The "missed connections" concept
 * - Avatar-based privacy (no photos required)
 * - The dual flow of posting about others and browsing for yourself
 *
 * @example
 * ```tsx
 * <WelcomeScreen
 *   onContinue={() => goToNextStep()}
 *   onSkip={() => skipOnboarding()}
 * />
 * ```
 */
function WelcomeScreenComponent({
  onContinue,
  onSkip,
  isLoading = false,
  className = '',
}: WelcomeScreenProps) {
  // Get step config for button label
  const stepConfig = getStepById('welcome')
  const primaryButtonLabel = stepConfig?.primaryButtonLabel ?? 'Get Started'

  // Memoized handlers
  const handleContinue = useCallback(() => {
    onContinue()
  }, [onContinue])

  const handleSkip = useCallback(() => {
    onSkip()
  }, [onSkip])

  // Container classes - min-h-0 enables proper flex shrinking for mobile scroll
  const containerClasses = [
    'flex flex-col h-full min-h-0',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={containerClasses} role="main" aria-labelledby="welcome-heading">
      {/* Hero section with entrance animation */}
      <header className="text-center mb-6 sm:mb-8">
        <HeroIcon />

        <h2
          id="welcome-heading"
          className="mt-6 text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white animate-fade-in-up animation-delay-100"
        >
          Welcome to Love Ledger
        </h2>

        <p className="mt-3 text-base sm:text-lg text-gray-600 dark:text-gray-300 max-w-xs sm:max-w-sm mx-auto leading-relaxed animate-fade-in-up animation-delay-200">
          A gentle way to find the people you noticed but never got to meet.
        </p>
      </header>

      {/* Features section with staggered entrance - overflow for small viewports */}
      <section
        className="flex-1 min-h-0 overflow-y-auto touch-scroll-y space-y-4 sm:space-y-5 mb-6 sm:mb-8"
        aria-label="Key features"
      >
        <ul className="space-y-4 sm:space-y-5 list-none p-0 m-0">
          {WELCOME_FEATURES.map((feature, index) => (
            <li
              key={feature.title}
              className={`animate-fade-in-up ${
                index === 0
                  ? 'animation-delay-300'
                  : index === 1
                  ? 'animation-delay-400'
                  : 'animation-delay-500'
              }`}
            >
              <FeatureItem
                icon={feature.icon}
                title={feature.title}
                description={feature.description}
              />
            </li>
          ))}
        </ul>
      </section>

      {/* Introvert-friendly reassurance */}
      <div className="text-center mb-6 sm:mb-8">
        <p className="text-xs sm:text-sm text-gray-400 dark:text-gray-500 animate-fade-in animation-delay-500">
          No pressure. No photos. Just meaningful connections.
        </p>
      </div>

      {/* Action buttons - pb-safe adds safe area padding for devices with home indicators */}
      <footer className="flex-shrink-0 space-y-3 pb-safe" role="group" aria-label="Actions">
        {/* Primary CTA */}
        <Button
          variant="primary"
          size="lg"
          fullWidth
          onClick={handleContinue}
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

        {/* Skip link - min-touch-target ensures 44px minimum touch target */}
        <button
          type="button"
          onClick={handleSkip}
          className="w-full text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 text-sm font-medium py-3 min-touch-target transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-pink-500 rounded-lg"
          aria-label="Skip onboarding and go directly to the app"
        >
          Skip for now
        </button>
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
  prevProps: WelcomeScreenProps,
  nextProps: WelcomeScreenProps
): boolean {
  return (
    prevProps.isLoading === nextProps.isLoading &&
    prevProps.className === nextProps.className &&
    prevProps.onContinue === nextProps.onContinue &&
    prevProps.onSkip === nextProps.onSkip
  )
}

/**
 * Memoized WelcomeScreen component.
 * First screen of the onboarding flow that introduces Love Ledger.
 */
export const WelcomeScreen = memo(WelcomeScreenComponent, arePropsEqual)

// Set display name for debugging
WelcomeScreen.displayName = 'WelcomeScreen'

export default WelcomeScreen
