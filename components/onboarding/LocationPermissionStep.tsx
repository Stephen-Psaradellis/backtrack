'use client'

import { memo, useCallback, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { getStepById } from '@/lib/onboarding/onboardingConfig'
import { useLocation, type LocationPermissionStatus } from '@/hooks/useLocation'

// ============================================================================
// Types
// ============================================================================

export interface LocationPermissionStepProps {
  /** Callback when user clicks "Continue" after granting/denying/skipping */
  onContinue: (status: LocationPermissionStatus) => void
  /** Callback when user clicks "Skip" */
  onSkip: () => void
  /** Callback when user clicks "Back" */
  onBack: () => void
  /** Whether the continue action is loading */
  isLoading?: boolean
  /** Additional CSS classes for the container */
  className?: string
}

/**
 * Permission state for UI rendering
 */
type PermissionUIState = 'initial' | 'requesting' | 'granted' | 'denied'

// ============================================================================
// Location Icon Component
// ============================================================================

/**
 * Location icon for the permission request screen with entrance animation
 */
const LocationIcon = memo(function LocationIcon() {
  return (
    <div
      className="mx-auto w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-gradient-to-br from-pink-100 to-blue-100 dark:from-pink-900/40 dark:to-blue-800/30 flex items-center justify-center shadow-lg shadow-pink-500/10 animate-fade-in-scale"
      aria-hidden="true"
    >
      <div className="relative">
        {/* Location pin icon */}
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
            d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
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
// Success Icon Component
// ============================================================================

/**
 * Success icon shown after location permission is granted with entrance animation
 */
const SuccessIcon = memo(function SuccessIcon() {
  return (
    <div
      className="mx-auto w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-900/40 dark:to-emerald-800/30 flex items-center justify-center shadow-lg shadow-green-500/10 animate-fade-in-scale"
      aria-hidden="true"
    >
      <div className="relative">
        {/* Checkmark icon */}
        <svg
          className="w-12 h-12 sm:w-14 sm:h-14 text-green-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
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
// Feature Item Component
// ============================================================================

interface FeatureItemProps {
  /** Icon for the feature */
  icon: React.ReactNode
  /** Feature title */
  title: string
  /** Feature description */
  description: string
}

/**
 * Individual feature item explaining why location is needed with hover effect
 */
const FeatureItem = memo(function FeatureItem({
  icon,
  title,
  description,
}: FeatureItemProps) {
  return (
    <div className="flex items-start gap-3 group">
      {/* Feature icon with hover effect */}
      <div
        className="flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-pink-50 dark:bg-pink-900/20 flex items-center justify-center text-pink-500 transition-transform duration-200 group-hover:scale-105"
        aria-hidden="true"
      >
        {icon}
      </div>

      {/* Feature content */}
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
 * Features that explain why location is beneficial
 */
const LOCATION_FEATURES = [
  {
    icon: (
      <svg
        className="w-4 h-4 sm:w-5 sm:h-5"
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
    ),
    title: 'See nearby posts',
    description: 'Find missed connections from places you visit',
  },
  {
    icon: (
      <svg
        className="w-4 h-4 sm:w-5 sm:h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
        />
      </svg>
    ),
    title: 'Get notified',
    description: 'Know when someone posts near your favorite spots',
  },
  {
    icon: (
      <svg
        className="w-4 h-4 sm:w-5 sm:h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
        />
      </svg>
    ),
    title: 'Privacy first',
    description: 'We only use location when you open the app',
  },
] as const

// ============================================================================
// Main Component
// ============================================================================

/**
 * Location permission request screen for the onboarding flow
 *
 * This screen explains why location is needed and handles the permission request.
 * It supports three outcomes:
 * - Permission granted: Shows success state and continues
 * - Permission denied: Explains graceful degradation and allows continuing
 * - Skip: Allows users to proceed without enabling location
 *
 * @example
 * ```tsx
 * <LocationPermissionStep
 *   onContinue={(status) => {
 *     setLocationStatus(status)
 *     goToNextStep()
 *   }}
 *   onSkip={() => skipOnboarding()}
 *   onBack={() => goToPreviousStep()}
 * />
 * ```
 */
function LocationPermissionStepComponent({
  onContinue,
  onSkip,
  onBack,
  isLoading = false,
  className = '',
}: LocationPermissionStepProps) {
  // Get step config for labels
  const stepConfig = getStepById('location')

  // Location hook - don't enable on mount, we'll request manually
  const { permissionStatus, requestPermission, loading: locationLoading } = useLocation({
    enableOnMount: false,
  })

  // Local UI state
  const [uiState, setUiState] = useState<PermissionUIState>('initial')

  // Memoized handlers
  const handleEnableLocation = useCallback(async () => {
    setUiState('requesting')

    const granted = await requestPermission()

    if (granted) {
      setUiState('granted')
      // Small delay to show success state before continuing
      setTimeout(() => {
        onContinue('granted')
      }, 1000)
    } else {
      setUiState('denied')
    }
  }, [requestPermission, onContinue])

  const handleContinueWithoutLocation = useCallback(() => {
    onContinue('denied')
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

  // Determine if any action is in progress
  const isProcessing = isLoading || locationLoading || uiState === 'requesting'

  // ---------------------------------------------------------------------------
  // RENDER: Success State
  // ---------------------------------------------------------------------------
  if (uiState === 'granted') {
    return (
      <div className={containerClasses}>
        <div className="flex-1 flex flex-col items-center justify-center text-center">
          <SuccessIcon />

          <h2 className="mt-6 text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
            Location Enabled!
          </h2>

          <p className="mt-3 text-base sm:text-lg text-gray-600 dark:text-gray-300 max-w-xs sm:max-w-sm mx-auto leading-relaxed">
            Great! You&apos;ll now see missed connections near you.
          </p>

          <p className="mt-4 text-sm text-gray-400 dark:text-gray-500">
            Moving to the next step...
          </p>
        </div>
      </div>
    )
  }

  // ---------------------------------------------------------------------------
  // RENDER: Denied State
  // ---------------------------------------------------------------------------
  if (uiState === 'denied') {
    return (
      <div className={containerClasses}>
        {/* Header */}
        <div className="text-center mb-6 sm:mb-8">
          <LocationIcon />

          <h2 className="mt-6 text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
            No Problem!
          </h2>

          <p className="mt-3 text-base sm:text-lg text-gray-600 dark:text-gray-300 max-w-xs sm:max-w-sm mx-auto leading-relaxed">
            You can still use Love Ledger without location access.
          </p>
        </div>

        {/* What you'll miss section - scrollable on small screens */}
        <div className="flex-1 min-h-0 overflow-y-auto touch-scroll-y mb-6 sm:mb-8">
          <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-4">
            What you&apos;ll miss
          </h3>

          <div className="space-y-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <span className="text-gray-400" aria-hidden="true">
                •
              </span>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Posts won&apos;t be filtered by your location
              </p>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-gray-400" aria-hidden="true">
                •
              </span>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                You&apos;ll need to manually browse all posts
              </p>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-gray-400" aria-hidden="true">
                •
              </span>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Location-based notifications won&apos;t work
              </p>
            </div>
          </div>

          <p className="mt-4 text-xs sm:text-sm text-gray-400 dark:text-gray-500 text-center">
            You can enable location later in Settings.
          </p>
        </div>

        {/* Action buttons - pb-safe adds safe area padding for devices with home indicators */}
        <div className="flex-shrink-0 space-y-3 pb-safe">
          {/* Primary CTA */}
          <Button
            variant="primary"
            size="lg"
            fullWidth
            onClick={handleContinueWithoutLocation}
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
            Continue Anyway
          </Button>

          {/* Back button - min-touch-target ensures 44px minimum touch target */}
          {stepConfig?.showBack && (
            <button
              type="button"
              onClick={handleBack}
              className="w-full text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 text-sm font-medium py-3 min-touch-target transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500 rounded-lg"
              aria-label="Go back to the previous step"
            >
              Go back
            </button>
          )}
        </div>
      </div>
    )
  }

  // ---------------------------------------------------------------------------
  // RENDER: Initial / Requesting State
  // ---------------------------------------------------------------------------
  return (
    <div className={containerClasses}>
      {/* Header section with entrance animations */}
      <div className="text-center mb-6 sm:mb-8">
        <LocationIcon />

        <h2 className="mt-6 text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white animate-fade-in-up animation-delay-100">
          {stepConfig?.title ?? 'Enable Location'}
        </h2>

        <p className="mt-3 text-base sm:text-lg text-gray-600 dark:text-gray-300 max-w-xs sm:max-w-sm mx-auto leading-relaxed animate-fade-in-up animation-delay-200">
          {stepConfig?.description ??
            'See missed connections near you. We only use your location when you open the app.'}
        </p>
      </div>

      {/* Features section with staggered entrance - scrollable on small screens */}
      <div className="flex-1 min-h-0 overflow-y-auto touch-scroll-y mb-6 sm:mb-8">
        <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-4 animate-fade-in animation-delay-200">
          Why enable location?
        </h3>

        <div className="space-y-4">
          {LOCATION_FEATURES.map((feature, index) => (
            <div
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
            </div>
          ))}
        </div>
      </div>

      {/* Privacy reassurance */}
      <div className="text-center mb-6 sm:mb-8">
        <p className="text-xs sm:text-sm text-gray-400 dark:text-gray-500 leading-relaxed animate-fade-in animation-delay-500">
          Your location is never shared with other users. It&apos;s only used to
          show you relevant nearby posts.
        </p>
      </div>

      {/* Action buttons - pb-safe adds safe area padding for devices with home indicators */}
      <div className="flex-shrink-0 space-y-3 pb-safe">
        {/* Primary CTA */}
        <Button
          variant="primary"
          size="lg"
          fullWidth
          onClick={handleEnableLocation}
          isLoading={isProcessing}
          leftIcon={
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
                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          }
        >
          {isProcessing ? 'Requesting Permission...' : (stepConfig?.primaryButtonLabel ?? 'Enable Location')}
        </Button>

        {/* Skip link - min-touch-target ensures 44px minimum touch target */}
        <button
          type="button"
          onClick={handleSkip}
          disabled={isProcessing}
          className="w-full text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 text-sm font-medium py-3 min-touch-target transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Skip location permission and continue onboarding"
        >
          Skip for now
        </button>

        {/* Back button - min-touch-target ensures 44px minimum touch target */}
        {stepConfig?.showBack && (
          <button
            type="button"
            onClick={handleBack}
            disabled={isProcessing}
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
  prevProps: LocationPermissionStepProps,
  nextProps: LocationPermissionStepProps
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
 * Memoized LocationPermissionStep component.
 * Location permission request screen for the onboarding flow.
 */
export const LocationPermissionStep = memo(
  LocationPermissionStepComponent,
  arePropsEqual
)

// Set display name for debugging
LocationPermissionStep.displayName = 'LocationPermissionStep'

export default LocationPermissionStep
