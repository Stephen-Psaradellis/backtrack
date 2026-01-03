import { memo, useMemo } from 'react'
import {
  ONBOARDING_STEPS,
  TOTAL_ONBOARDING_STEPS,
  calculateProgress,
  formatEstimatedTime,
  calculateRemainingTime,
} from '../../lib/onboarding/onboardingConfig'

// ============================================================================
// Types
// ============================================================================

export interface OnboardingStepperProps {
  /** Current step index (0-based) */
  currentStep: number
  /** Optional callback when a step dot is clicked (for accessibility) */
  onStepClick?: (stepIndex: number) => void
  /** Whether to show step labels (default: false on mobile, true on desktop) */
  showLabels?: boolean
  /** Whether to show estimated time remaining */
  showTimeEstimate?: boolean
  /** Additional CSS classes for the container */
  className?: string
}

// ============================================================================
// Step Dot Component
// ============================================================================

interface StepDotProps {
  /** Step index (0-based) */
  index: number
  /** Whether this step is completed */
  isCompleted: boolean
  /** Whether this step is the current step */
  isCurrent: boolean
  /** Step title for accessibility */
  title: string
  /** Optional click handler */
  onClick?: () => void
}

/**
 * Individual step indicator dot
 */
const StepDot = memo(function StepDot({
  index,
  isCompleted,
  isCurrent,
  title,
  onClick,
}: StepDotProps) {
  // Build dot classes based on state
  const dotClasses = useMemo(() => {
    const baseClasses = [
      'relative',
      'w-3 h-3 sm:w-4 sm:h-4',
      'rounded-full',
      'transition-all duration-300',
      'flex items-center justify-center',
      // Keyboard focus styles - visible ring for accessibility
      'focus:outline-none',
      'focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary-500',
    ]

    if (isCurrent) {
      baseClasses.push(
        'bg-primary-500',
        'ring-4 ring-primary-500/20',
        'scale-110'
      )
    } else if (isCompleted) {
      baseClasses.push(
        'bg-primary-500',
        'hover:bg-primary-600'
      )
    } else {
      baseClasses.push(
        'bg-gray-200',
        'dark:bg-gray-700'
      )
    }

    if (onClick && isCompleted) {
      baseClasses.push('cursor-pointer')
    } else {
      // Ensure disabled state is visually distinct
      baseClasses.push('cursor-default')
    }

    return baseClasses.join(' ')
  }, [isCurrent, isCompleted, onClick])

  return (
    <button
      type="button"
      className={dotClasses}
      onClick={onClick}
      disabled={!onClick || (!isCompleted && !isCurrent)}
      aria-label={`Step ${index + 1}: ${title}${isCurrent ? ' (current)' : ''}${isCompleted ? ' (completed)' : ''}`}
      aria-current={isCurrent ? 'step' : undefined}
      tabIndex={!onClick || (!isCompleted && !isCurrent) ? -1 : 0}
    >
      {/* Checkmark for completed steps */}
      {isCompleted && !isCurrent && (
        <svg
          className="w-2 h-2 sm:w-2.5 sm:h-2.5 text-white"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={3}
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M5 13l4 4L19 7"
          />
        </svg>
      )}

      {/* Pulsing dot for current step */}
      {isCurrent && (
        <span
          className="absolute inset-0 rounded-full bg-primary-500 animate-ping opacity-30"
          aria-hidden="true"
        />
      )}
    </button>
  )
})

// ============================================================================
// Connector Line Component
// ============================================================================

interface ConnectorLineProps {
  /** Whether this connector is between completed steps */
  isCompleted: boolean
}

/**
 * Connector line between step dots with smooth transition
 */
const ConnectorLine = memo(function ConnectorLine({
  isCompleted,
}: ConnectorLineProps) {
  const lineClasses = useMemo(() => {
    const baseClasses = [
      'flex-1',
      'h-0.5 sm:h-1',
      'min-w-4 sm:min-w-6',
      'max-w-12 sm:max-w-16',
      'transition-all duration-500 ease-out',
      'rounded-full',
    ]

    if (isCompleted) {
      baseClasses.push('bg-primary-500')
    } else {
      baseClasses.push('bg-gray-200', 'dark:bg-gray-700')
    }

    return baseClasses.join(' ')
  }, [isCompleted])

  return <div className={lineClasses} aria-hidden="true" />
})

// ============================================================================
// Progress Bar Component
// ============================================================================

interface ProgressBarProps {
  /** Progress percentage (0-100) */
  progress: number
}

/**
 * Linear progress bar showing overall completion with smooth animation
 */
const ProgressBar = memo(function ProgressBar({ progress }: ProgressBarProps) {
  return (
    <div
      className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden shadow-inner"
      role="progressbar"
      aria-valuenow={progress}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`Onboarding progress: ${progress}%`}
    >
      <div
        className="h-full bg-gradient-to-r from-primary-500 to-primary-400 transition-all duration-700 ease-out rounded-full shadow-sm"
        style={{ width: `${progress}%` }}
      />
    </div>
  )
})

// ============================================================================
// Main Component
// ============================================================================

/**
 * Onboarding stepper/progress indicator component
 *
 * Shows the user's progress through the onboarding steps with visual
 * indicators for completed, current, and upcoming steps.
 *
 * Features:
 * - Step dots with completion indicators
 * - Connecting lines between steps
 * - Progress bar option
 * - Estimated time remaining
 * - Responsive design (smaller dots on mobile)
 * - Accessible with proper ARIA labels
 *
 * @example
 * ```tsx
 * <OnboardingStepper
 *   currentStep={2}
 *   showTimeEstimate
 * />
 * ```
 */
function OnboardingStepperComponent({
  currentStep,
  onStepClick,
  showLabels = false,
  showTimeEstimate = false,
  className = '',
}: OnboardingStepperProps) {
  // Calculate progress percentage
  const progress = useMemo(
    () => calculateProgress(currentStep),
    [currentStep]
  )

  // Calculate remaining time
  const remainingTime = useMemo(
    () => calculateRemainingTime(currentStep),
    [currentStep]
  )

  // Container classes with fade-in animation
  const containerClasses = useMemo(
    () => ['flex flex-col gap-3 animate-fade-in', className].filter(Boolean).join(' '),
    [className]
  )

  // Current step info for display
  const currentStepInfo = ONBOARDING_STEPS[currentStep]

  return (
    <nav
      className={containerClasses}
      aria-label="Onboarding progress"
      role="navigation"
    >
      {/* Progress bar - always visible */}
      <ProgressBar progress={progress} />

      {/* Step indicator row */}
      <div
        className="flex items-center justify-center gap-1 sm:gap-2"
        role="list"
        aria-label="Onboarding steps"
      >
        {ONBOARDING_STEPS.map((step, index) => (
          <div key={step.id} className="flex items-center" role="listitem">
            <StepDot
              index={index}
              isCompleted={index < currentStep}
              isCurrent={index === currentStep}
              title={step.title}
              onClick={onStepClick && index < currentStep ? () => onStepClick(index) : undefined}
            />

            {/* Connector line (not after last step) */}
            {index < TOTAL_ONBOARDING_STEPS - 1 && (
              <ConnectorLine isCompleted={index < currentStep} />
            )}
          </div>
        ))}
      </div>

      {/* Step label and time estimate */}
      <div className="flex items-center justify-between text-xs sm:text-sm">
        {/* Current step indicator */}
        <span className="text-gray-500 dark:text-gray-400">
          Step {currentStep + 1} of {TOTAL_ONBOARDING_STEPS}
        </span>

        {/* Time estimate */}
        {showTimeEstimate && remainingTime > 0 && (
          <span className="text-gray-400 dark:text-gray-500">
            ~{formatEstimatedTime(remainingTime)} remaining
          </span>
        )}
      </div>

      {/* Step title (optional) */}
      {showLabels && currentStepInfo && (
        <div className="text-center">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
            {currentStepInfo.icon} {currentStepInfo.title}
          </span>
        </div>
      )}
    </nav>
  )
}

// ============================================================================
// Memoized Export
// ============================================================================

/**
 * Custom comparison function for React.memo
 */
function arePropsEqual(
  prevProps: OnboardingStepperProps,
  nextProps: OnboardingStepperProps
): boolean {
  return (
    prevProps.currentStep === nextProps.currentStep &&
    prevProps.showLabels === nextProps.showLabels &&
    prevProps.showTimeEstimate === nextProps.showTimeEstimate &&
    prevProps.className === nextProps.className
  )
}

/**
 * Memoized OnboardingStepper component.
 * Shows progress through onboarding steps with visual indicators.
 */
export const OnboardingStepper = memo(OnboardingStepperComponent, arePropsEqual)

// Set display name for debugging
OnboardingStepper.displayName = 'OnboardingStepper'

export default OnboardingStepper
