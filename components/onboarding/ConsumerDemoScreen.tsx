'use client'

import { memo, useCallback } from 'react'
import { Button } from '@/components/ui/Button'
import { getStepById } from '@/lib/onboarding/onboardingConfig'
import { createAvatarDataUri } from '@/lib/avatar/dicebear'
import type { AvatarConfig } from '@/types/avatar'

// ============================================================================
// Types
// ============================================================================

export interface ConsumerDemoScreenProps {
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
// Mock Data for Demo
// ============================================================================

/**
 * Mock posts that might be about the user
 * Shows a variety of scenarios to demonstrate the browsing experience
 */
interface MockBrowsePost {
  id: string
  avatar: AvatarConfig
  message: string
  location: string
  timeAgo: string
  matchScore?: number
}

const DEMO_POSTS: readonly MockBrowsePost[] = [
  {
    id: 'demo-1',
    avatar: {
      avatarStyle: 'Circle',
      topType: 'ShortHairShortFlat',
      hairColor: 'BrownDark',
      accessoriesType: 'Blank',
      facialHairType: 'Blank',
      clotheType: 'BlazerShirt',
      clotheColor: 'Black',
      eyeType: 'Default',
      eyebrowType: 'DefaultNatural',
      mouthType: 'Smile',
      skinColor: 'Light',
    },
    message:
      'You were wearing a blue scarf and reading at the window seat. Your laugh made my day brighter!',
    location: 'Central Library',
    timeAgo: '2 hours ago',
    matchScore: 85,
  },
  {
    id: 'demo-2',
    avatar: {
      avatarStyle: 'Circle',
      topType: 'LongHairCurly',
      hairColor: 'Black',
      accessoriesType: 'Round',
      facialHairType: 'Blank',
      clotheType: 'GraphicShirt',
      clotheColor: 'Blue01',
      eyeType: 'Happy',
      eyebrowType: 'RaisedExcitedNatural',
      mouthType: 'Twinkle',
      skinColor: 'Brown',
    },
    message:
      'We both reached for the last oat milk latte. You let me have it - thanks! Coffee sometime?',
    location: 'Sunrise Coffee Shop',
    timeAgo: '5 hours ago',
    matchScore: 72,
  },
] as const

// ============================================================================
// Consumer Icon Component
// ============================================================================

/**
 * Icon representing browsing/searching for posts with entrance animation
 */
const ConsumerIcon = memo(function ConsumerIcon() {
  return (
    <div
      className="mx-auto w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-900/40 dark:to-teal-800/30 flex items-center justify-center shadow-lg shadow-emerald-500/10 animate-fade-in-scale"
      aria-hidden="true"
    >
      <div className="relative">
        {/* Search/browse icon */}
        <svg
          className="w-10 h-10 sm:w-12 sm:h-12 text-emerald-500 transition-transform duration-300 hover:scale-110"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
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
// Mock Browse Post Card Component
// ============================================================================

interface MockBrowsePostCardProps {
  /** Post data to display */
  post: MockBrowsePost
  /** Whether this is a potential match */
  isHighlighted?: boolean
}

/**
 * A simplified post card component for browsing demonstration with enhanced transitions
 */
const MockBrowsePostCard = memo(function MockBrowsePostCard({
  post,
  isHighlighted = false,
}: MockBrowsePostCardProps) {
  const avatarDataUri = createAvatarDataUri(post.avatar, 64)

  return (
    <div
      className={`bg-white dark:bg-gray-800 rounded-xl shadow-md hover:shadow-lg border ${
        isHighlighted
          ? 'border-emerald-200 dark:border-emerald-700 ring-2 ring-emerald-100 dark:ring-emerald-900/50'
          : 'border-gray-100 dark:border-gray-700'
      } p-3 sm:p-4 transition-all duration-300`}
    >
      {/* Header with match badge */}
      <div className="flex items-center justify-between mb-2 sm:mb-3">
        {isHighlighted && post.matchScore && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 text-xs font-medium rounded-full">
            <svg
              className="w-3 h-3"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            {post.matchScore}% match
          </span>
        )}
        {!isHighlighted && (
          <span className="text-xs text-gray-400 dark:text-gray-500">
            Nearby post
          </span>
        )}
        <span className="text-xs text-gray-400 dark:text-gray-500 ml-auto">
          {post.timeAgo}
        </span>
      </div>

      {/* Content area */}
      <div className="flex gap-2 sm:gap-3">
        {/* Avatar - who posted about you */}
        <div className="flex-shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={avatarDataUri}
            alt="Avatar of the person who posted"
            className="w-12 h-12 sm:w-14 sm:h-14 rounded-full"
          />
        </div>

        {/* Message */}
        <div className="flex-1 min-w-0">
          <p className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 leading-relaxed line-clamp-3">
            {post.message}
          </p>
        </div>
      </div>

      {/* Location footer */}
      <div className="mt-2 sm:mt-3 pt-2 sm:pt-3 border-t border-gray-100 dark:border-gray-700 flex items-center gap-1.5">
        <svg
          className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500"
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
        <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
          {post.location}
        </span>
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
      <div className="flex-shrink-0 w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-xs sm:text-sm font-semibold">
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
 * Consumer demo screen for the onboarding flow
 *
 * This screen demonstrates how users can browse posts that might be about them.
 * It shows multiple mock posts to simulate the browsing experience and explains
 * the flow in a clear, non-intimidating way.
 *
 * Key concepts demonstrated:
 * - Browsing nearby posts
 * - Match scores showing how likely a post is about you
 * - Claiming a post to connect with the poster
 *
 * @example
 * ```tsx
 * <ConsumerDemoScreen
 *   onContinue={() => goToNextStep()}
 *   onSkip={() => skipOnboarding()}
 *   onBack={() => goToPreviousStep()}
 * />
 * ```
 */
function ConsumerDemoScreenComponent({
  onContinue,
  onSkip,
  onBack,
  isLoading = false,
  className = '',
}: ConsumerDemoScreenProps) {
  // Get step config for labels
  const stepConfig = getStepById('consumer-demo')
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
        <ConsumerIcon />

        <h2 className="mt-4 sm:mt-5 text-xl sm:text-2xl font-bold text-gray-900 dark:text-white animate-fade-in-up animation-delay-100">
          {stepConfig?.title ?? 'Find Posts About You'}
        </h2>

        <p className="mt-2 text-sm sm:text-base text-gray-600 dark:text-gray-300 max-w-xs sm:max-w-sm mx-auto leading-relaxed animate-fade-in-up animation-delay-200">
          Browse nearby posts and see if someone noticed you. Your avatar helps match you to posts!
        </p>
      </div>

      {/* Example posts section - scrollable with touch momentum */}
      <div className="flex-1 min-h-0 mb-4 sm:mb-6 overflow-y-auto touch-scroll-y">
        {/* Example label */}
        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3 animate-fade-in animation-delay-200">
          Example Posts Near You
        </p>

        {/* Mock browse posts with staggered entrance */}
        <div className="space-y-3">
          {DEMO_POSTS.map((post, index) => (
            <div
              key={post.id}
              className={`animate-fade-in-up ${index === 0 ? 'animation-delay-300' : 'animation-delay-400'}`}
            >
              <MockBrowsePostCard
                post={post}
                isHighlighted={index === 0}
              />
            </div>
          ))}
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
                description="Browse posts from places you visit"
              />
            </div>
            <div className="animate-fade-in-up animation-delay-500">
              <HowItWorksStep
                step={2}
                description="See match scores based on your avatar"
              />
            </div>
            <div className="animate-fade-in-up animation-delay-500">
              <HowItWorksStep
                step={3}
                description="Claim a post if you think it&apos;s about you"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Privacy reassurance */}
      <div className="text-center mb-4 sm:mb-6">
        <p className="text-xs sm:text-sm text-gray-400 dark:text-gray-500 leading-relaxed animate-fade-in animation-delay-500">
          Only you can see your matches. Connect only when you&apos;re ready.
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
            className="w-full text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 text-sm font-medium py-3 min-touch-target transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
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
            className="w-full text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 text-sm font-medium py-3 min-touch-target transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
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
  prevProps: ConsumerDemoScreenProps,
  nextProps: ConsumerDemoScreenProps
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
 * Memoized ConsumerDemoScreen component.
 * Demonstrates how to browse posts that might be about you during onboarding.
 */
export const ConsumerDemoScreen = memo(
  ConsumerDemoScreenComponent,
  arePropsEqual
)

// Set display name for debugging
ConsumerDemoScreen.displayName = 'ConsumerDemoScreen'

export default ConsumerDemoScreen
