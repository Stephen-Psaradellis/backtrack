import { memo, useCallback } from 'react'
import { Button } from '../ui/Button'
import { getStepById } from '../../lib/onboarding/onboardingConfig'
import { PRODUCER_DEMO_POST } from '../../lib/onboarding/mockData'

// Placeholder avatar for demo screens - returns a simple SVG silhouette
const createAvatarDataUri = (): string => {
  return 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" fill="%23f0f0f0"/><circle cx="50" cy="40" r="20" fill="%23ccc"/><ellipse cx="50" cy="80" rx="30" ry="20" fill="%23ccc"/></svg>'
}

// ============================================================================
// Types
// ============================================================================

export interface ProducerDemoScreenProps {
  /** Callback when user clicks "Next" */
  onContinue: () => void
  /** Callback when user clicks "Skip" */
  onSkip: () => void
  /** Callback when user clicks "Back" */
  onBack: () => void
  /** Whether the continue action is loading */
  isLoading?: boolean
  /** Additional CSS classes for the container */
  className?: string
}

// ============================================================================
// Producer Icon Component
// ============================================================================

/**
 * Icon representing posting/creating content with entrance animation
 */
const ProducerIcon = memo(function ProducerIcon() {
  return (
    <div
      className="mx-auto w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-br from-primary-100 to-purple-100 dark:from-primary-900/40 dark:to-purple-800/30 flex items-center justify-center shadow-lg shadow-primary-500/10 animate-fade-in-scale"
      aria-hidden="true"
    >
      <div className="relative">
        {/* Pencil/write icon */}
        <svg
          className="w-10 h-10 sm:w-12 sm:h-12 text-primary-500 transition-transform duration-300 hover:scale-110"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
          />
        </svg>
        {/* Sparkle accent */}
        <span
          className="absolute -top-1 -right-1 text-base sm:text-lg animate-pulse"
          aria-hidden="true"
        >
          ✨
        </span>
      </div>
    </div>
  )
})

// ============================================================================
// Mock Post Card Component
// ============================================================================

interface MockPostCardProps {
  /** Post message content */
  message: string
  /** Location name */
  location: string
  /** Time ago string */
  timeAgo: string
}

/**
 * A simplified post card component for demonstration purposes with enhanced transitions
 */
const MockPostCard = memo(function MockPostCard({
  message,
  location,
  timeAgo,
}: MockPostCardProps) {
  const avatarDataUri = createAvatarDataUri()

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg hover:shadow-xl border border-gray-100 dark:border-gray-700 p-4 transition-shadow duration-300">
      {/* Header with "Your post" badge */}
      <div className="flex items-center justify-between mb-3">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 text-xs font-medium rounded-full">
          <svg
            className="w-3.5 h-3.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
            />
          </svg>
          Your post
        </span>
        <span className="text-xs text-gray-400 dark:text-gray-500">{timeAgo}</span>
      </div>

      {/* Content area */}
      <div className="flex gap-3">
        {/* Avatar */}
        <div className="flex-shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={avatarDataUri}
            alt="Avatar of the person you saw"
            className="w-16 h-16 sm:w-20 sm:h-20 rounded-full"
          />
          <p className="mt-1.5 text-[10px] sm:text-xs text-gray-400 dark:text-gray-500 text-center">
            Who you saw
          </p>
        </div>

        {/* Message */}
        <div className="flex-1 min-w-0">
          <p className="text-sm sm:text-base text-gray-700 dark:text-gray-300 leading-relaxed line-clamp-4">
            {message}
          </p>
        </div>
      </div>

      {/* Location footer */}
      <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700 flex items-center gap-1.5">
        <svg
          className="w-4 h-4 text-gray-400 dark:text-gray-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
        <span className="text-sm text-gray-500 dark:text-gray-400">{location}</span>
      </div>
    </div>
  )
})

// ============================================================================
// How It Works Step Component
// ============================================================================

interface HowItWorksStepProps {
  /** Step number */
  step: number
  /** Step description */
  description: string
}

/**
 * Individual step in the "how it works" section
 */
const HowItWorksStep = memo(function HowItWorksStep({
  step,
  description,
}: HowItWorksStepProps) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex-shrink-0 w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-primary-100 dark:bg-primary-900/40 text-primary-600 dark:text-primary-400 flex items-center justify-center text-xs sm:text-sm font-semibold">
        {step}
      </div>
      <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
        {description}
      </p>
    </div>
  )
})

// ============================================================================
// Main Component
// ============================================================================

/**
 * Producer demo screen for the onboarding flow
 *
 * This screen demonstrates how users can create posts about people they noticed.
 * It shows a mock post example and explains the flow in a clear, non-intimidating way.
 *
 * Key concepts demonstrated:
 * - Describing someone with an avatar (not a photo)
 * - Adding a location where you saw them
 * - Writing a friendly message
 */
function ProducerDemoScreenComponent({
  onContinue,
  onSkip,
  onBack,
  isLoading = false,
  className = '',
}: ProducerDemoScreenProps) {
  // Get step config for labels
  const stepConfig = getStepById('producer-demo')
  const primaryButtonLabel = stepConfig?.primaryButtonLabel ?? 'Next'

  // Memoized handlers
  const handleContinue = useCallback(() => {
    onContinue()
  }, [onContinue])

  const handleSkip = useCallback(() => {
    onSkip()
  }, [onSkip])

  const handleBack = useCallback(() => {
    onBack()
  }, [onBack])

  // Container classes - min-h-0 enables proper flex shrinking for mobile scroll
  const containerClasses = ['flex flex-col h-full min-h-0', className]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={containerClasses}>
      {/* Header section with entrance animations */}
      <div className="text-center mb-4 sm:mb-6">
        <ProducerIcon />

        <h2 className="mt-4 sm:mt-5 text-xl sm:text-2xl font-bold text-gray-900 dark:text-white animate-fade-in-up animation-delay-100">
          {stepConfig?.title ?? 'Post About Others'}
        </h2>

        <p className="mt-2 text-sm sm:text-base text-gray-600 dark:text-gray-300 max-w-xs sm:max-w-sm mx-auto leading-relaxed animate-fade-in-up animation-delay-200">
          Saw someone interesting? Describe them with an avatar and maybe they&apos;ll find your post.
        </p>
      </div>

      {/* Example post section - scrollable with touch momentum */}
      <div className="flex-1 min-h-0 mb-4 sm:mb-6 overflow-y-auto touch-scroll-y">
        {/* Example label */}
        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3 animate-fade-in animation-delay-200">
          Example Post
        </p>

        {/* Mock post card with entrance animation */}
        <div className="animate-fade-in-up animation-delay-300">
          <MockPostCard
            message={PRODUCER_DEMO_POST.message}
            location={PRODUCER_DEMO_POST.location}
            timeAgo={PRODUCER_DEMO_POST.timeAgo}
          />
        </div>

        {/* How it works section */}
        <div className="mt-4 sm:mt-6">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3 animate-fade-in animation-delay-400">
            How it works
          </p>

          <div className="space-y-2.5 sm:space-y-3">
            <div className="animate-fade-in-up animation-delay-400">
              <HowItWorksStep
                step={1}
                description="Build an avatar to describe who you saw"
              />
            </div>
            <div className="animate-fade-in-up animation-delay-500">
              <HowItWorksStep
                step={2}
                description="Pick the location where you spotted them"
              />
            </div>
            <div className="animate-fade-in-up animation-delay-500">
              <HowItWorksStep
                step={3}
                description="Write a friendly message about the moment"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Privacy reassurance */}
      <div className="text-center mb-4 sm:mb-6">
        <p className="text-xs sm:text-sm text-gray-400 dark:text-gray-500 leading-relaxed animate-fade-in animation-delay-500">
          No photos needed. Avatars keep everyone&apos;s identity private until you both choose to connect.
        </p>
      </div>

      {/* Action buttons - pb-safe adds safe area padding for devices with home indicators */}
      <div className="flex-shrink-0 space-y-3 pb-safe">
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
        {stepConfig?.showSkip && (
          <button
            type="button"
            onClick={handleSkip}
            disabled={isLoading}
            className="w-full text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 text-sm font-medium py-3 min-touch-target transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Skip onboarding and go directly to the app"
          >
            Skip for now
          </button>
        )}

        {/* Back button - min-touch-target ensures 44px minimum touch target */}
        {stepConfig?.showBack && (
          <button
            type="button"
            onClick={handleBack}
            disabled={isLoading}
            className="w-full text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 text-sm font-medium py-3 min-touch-target transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Go back to the previous step"
          >
            Go back
          </button>
        )}
      </div>
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
  prevProps: ProducerDemoScreenProps,
  nextProps: ProducerDemoScreenProps
): boolean {
  return (
    prevProps.isLoading === nextProps.isLoading &&
    prevProps.className === nextProps.className &&
    prevProps.onContinue === nextProps.onContinue &&
    prevProps.onSkip === nextProps.onSkip &&
    prevProps.onBack === nextProps.onBack
  )
}

/**
 * Memoized ProducerDemoScreen component.
 * Demonstrates how to post about someone you saw during onboarding.
 */
export const ProducerDemoScreen = memo(
  ProducerDemoScreenComponent,
  arePropsEqual
)

// Set display name for debugging
ProducerDemoScreen.displayName = 'ProducerDemoScreen'

export default ProducerDemoScreen
