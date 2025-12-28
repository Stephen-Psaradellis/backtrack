'use client';

/**
 * Onboarding page for new Love Ledger users.
 *
 * This page provides a guided onboarding experience that:
 * - Educates users about the missed connections concept
 * - Explains avatar-based privacy approach
 * - Guides avatar creation
 * - Requests location permissions
 * - Demonstrates producer (posting) and consumer (browsing) flows
 *
 * The flow is designed to complete in under 3 minutes with
 * an introvert-friendly, non-intimidating user experience.
 */

import { useCallback, useEffect, memo } from 'react';
import { useRouter } from 'next/navigation';
import { useOnboardingState } from '@/hooks/useOnboardingState';
import { OnboardingStepper } from '@/components/onboarding/OnboardingStepper';
import { WelcomeScreen } from '@/components/onboarding/WelcomeScreen';
import { OnboardingComplete } from '@/components/onboarding/OnboardingComplete';
import { AvatarCreationStep } from '@/components/onboarding/AvatarCreationStep';
import { LocationPermissionStep } from '@/components/onboarding/LocationPermissionStep';
import { ProducerDemoScreen } from '@/components/onboarding/ProducerDemoScreen';
import { ConsumerDemoScreen } from '@/components/onboarding/ConsumerDemoScreen';
import { ONBOARDING_STEPS } from '@/lib/onboarding/onboardingConfig';
import type { AvatarConfig } from '@/types/avatar';
import type { LocationPermissionStatus } from '@/hooks/useLocation';

// ============================================================================
// Loading State Component
// ============================================================================

/**
 * Loading skeleton shown while onboarding state is being loaded
 */
const OnboardingLoadingSkeleton = memo(function OnboardingLoadingSkeleton() {
  return (
    <div className="flex flex-1 flex-col animate-pulse">
      {/* Header skeleton */}
      <header className="flex-shrink-0 text-center pt-4 pb-6 sm:pt-8 sm:pb-10">
        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded-lg w-40 mx-auto" />
        <div className="h-4 bg-gray-100 dark:bg-gray-600 rounded w-48 mx-auto mt-2" />
      </header>

      {/* Stepper skeleton */}
      <div className="flex-shrink-0 mb-6 sm:mb-8">
        <div className="h-1 bg-gray-200 dark:bg-gray-700 rounded-full" />
        <div className="flex justify-center gap-2 mt-3">
          {[1, 2, 3, 4, 5, 6].map((step) => (
            <div
              key={step}
              className="h-3 w-3 sm:h-4 sm:w-4 rounded-full bg-gray-200 dark:bg-gray-700"
            />
          ))}
        </div>
      </div>

      {/* Content skeleton */}
      <div className="flex-1 flex flex-col items-center justify-center">
        <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-gray-200 dark:bg-gray-700 mb-6" />
        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded-lg w-48 mb-3" />
        <div className="h-4 bg-gray-100 dark:bg-gray-600 rounded w-64" />
      </div>

      {/* Button skeleton */}
      <div className="flex-shrink-0 mt-auto pt-6 pb-4 space-y-3">
        <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded-lg" />
        <div className="h-8 bg-gray-100 dark:bg-gray-600 rounded-lg w-32 mx-auto" />
      </div>
    </div>
  );
});

// ============================================================================
// Main Onboarding Page Component
// ============================================================================

export default function OnboardingPage() {
  const router = useRouter();

  // Get onboarding state from custom hook
  const {
    currentStep,
    isComplete,
    isLoading,
    nextStep,
    prevStep,
    goToStep,
    skipOnboarding,
    completeOnboarding,
    avatarConfig,
    setAvatar,
    setLocationPermission,
  } = useOnboardingState();

  // ---------------------------------------------------------------------------
  // Redirect when onboarding is complete
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (isComplete && !isLoading) {
      router.push('/');
    }
  }, [isComplete, isLoading, router]);

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  /**
   * Handle continue button click
   * Advances to next step, or completes onboarding if on last step
   */
  const handleContinue = useCallback(() => {
    if (currentStep === ONBOARDING_STEPS.length - 1) {
      completeOnboarding();
    } else {
      nextStep();
    }
  }, [currentStep, completeOnboarding, nextStep]);

  /**
   * Handle back button click
   */
  const handleBack = useCallback(() => {
    prevStep();
  }, [prevStep]);

  /**
   * Handle avatar creation completion
   * Saves the avatar config and advances to next step
   */
  const handleAvatarContinue = useCallback(
    (config: AvatarConfig) => {
      setAvatar(config);
      nextStep();
    },
    [setAvatar, nextStep]
  );

  /**
   * Handle location permission step completion
   * Maps location permission status and advances to next step
   */
  const handleLocationContinue = useCallback(
    (status: LocationPermissionStatus) => {
      // Map LocationPermissionStatus to OnboardingLocationPermissionStatus
      // The step component passes 'granted' or 'denied'
      if (status === 'granted') {
        setLocationPermission('granted');
      } else {
        setLocationPermission('denied');
      }
      nextStep();
    },
    [setLocationPermission, nextStep]
  );

  /**
   * Handle location permission skip
   * Sets status to 'skipped' and advances to next step (does NOT skip entire onboarding)
   */
  const handleLocationSkip = useCallback(() => {
    setLocationPermission('skipped');
    nextStep();
  }, [setLocationPermission, nextStep]);

  /**
   * Handle skip button click
   * Marks onboarding as complete and redirects to main app
   */
  const handleSkip = useCallback(() => {
    skipOnboarding();
  }, [skipOnboarding]);

  /**
   * Handle step click in stepper (for going back to completed steps)
   */
  const handleStepClick = useCallback(
    (stepIndex: number) => {
      // Only allow going back to completed steps
      if (stepIndex < currentStep) {
        goToStep(stepIndex);
      }
    },
    [currentStep, goToStep]
  );

  /**
   * Handle final completion (from OnboardingComplete screen)
   */
  const handleComplete = useCallback(() => {
    completeOnboarding();
  }, [completeOnboarding]);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  // Show loading skeleton while checking completion status
  if (isLoading) {
    return <OnboardingLoadingSkeleton />;
  }

  // Redirect will happen in useEffect if isComplete is true
  if (isComplete) {
    return <OnboardingLoadingSkeleton />;
  }

  return (
    <div className="flex flex-1 flex-col">
      {/* Header section with branding */}
      <header className="flex-shrink-0 text-center pt-4 pb-6 sm:pt-8 sm:pb-10">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
          Love Ledger
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Discover your missed connections
        </p>
      </header>

      {/* Stepper/progress indicator */}
      <div className="flex-shrink-0 mb-6 sm:mb-8">
        <OnboardingStepper
          currentStep={currentStep}
          onStepClick={handleStepClick}
          showTimeEstimate
        />
      </div>

      {/* Current step content with subtle fade transition */}
      <div className="flex-1 flex flex-col">
        {currentStep === 0 && (
          <WelcomeScreen
            onContinue={handleContinue}
            onSkip={handleSkip}
          />
        )}

        {currentStep === 1 && (
          <AvatarCreationStep
            onContinue={handleAvatarContinue}
            onSkip={handleSkip}
            onBack={handleBack}
            initialConfig={avatarConfig}
          />
        )}

        {currentStep === 2 && (
          <LocationPermissionStep
            onContinue={handleLocationContinue}
            onSkip={handleLocationSkip}
            onBack={handleBack}
          />
        )}

        {currentStep === 3 && (
          <ProducerDemoScreen
            onContinue={handleContinue}
            onSkip={handleSkip}
            onBack={handleBack}
          />
        )}

        {currentStep === 4 && (
          <ConsumerDemoScreen
            onContinue={handleContinue}
            onSkip={handleSkip}
            onBack={handleBack}
          />
        )}

        {currentStep === 5 && (
          <OnboardingComplete
            onComplete={handleComplete}
            onBack={handleBack}
          />
        )}
      </div>
    </div>
  );
}
