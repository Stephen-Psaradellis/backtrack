/**
 * AvatarCreationStep Component
 *
 * Onboarding-specific avatar creation step that provides a simplified UI
 * for quick avatar creation. Features:
 * - Auto-generated initial avatar
 * - Prominent "Randomize" button for quick changes
 * - Basic customization options (simplified subset)
 * - "Customize Later" option for fast flow completion
 *
 * Designed for <30 second completion to meet onboarding time target.
 */

import { memo, useCallback, useMemo, useState } from 'react'
import { Button } from '../ui/Button'
import { getStepById } from '../../lib/onboarding/onboardingConfig'
import {
  AvatarConfig,
  AVATAR_OPTIONS,
} from '../../types/avatar'

// Placeholder for legacy DiceBear avatar - this component needs to be migrated to RPM
const createAvatarDataUri = (_config: AvatarConfig, _size: number): string => {
  // Return a placeholder image data URI
  return 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" fill="%23f0f0f0"/><circle cx="50" cy="40" r="20" fill="%23ccc"/><ellipse cx="50" cy="80" rx="30" ry="20" fill="%23ccc"/></svg>'
}

// ============================================================================
// Types
// ============================================================================

export interface AvatarCreationStepProps {
  /** Callback when user clicks "Continue" - passes the avatar config */
  onContinue: (avatarConfig: AvatarConfig) => void
  /** Callback when user clicks "Skip" */
  onSkip: () => void
  /** Callback when user clicks "Back" */
  onBack: () => void
  /** Initial avatar configuration (for resume functionality) */
  initialConfig?: Partial<AvatarConfig>
  /** Whether the continue action is loading */
  isLoading?: boolean
  /** Additional CSS classes for the container */
  className?: string
}

// ============================================================================
// Constants
// ============================================================================

/** Primary attributes for simplified customization */
const QUICK_CUSTOMIZE_OPTIONS = [
  {
    key: 'skinColor' as const,
    label: 'Skin',
    options: AVATAR_OPTIONS.skinColor,
  },
  {
    key: 'topType' as const,
    label: 'Hair',
    options: AVATAR_OPTIONS.topType.slice(0, 12), // Limit options for speed
  },
  {
    key: 'hairColor' as const,
    label: 'Hair Color',
    options: AVATAR_OPTIONS.hairColor,
  },
] as const

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get a random option from an array
 */
function getRandomOption<T>(options: readonly T[]): T {
  return options[Math.floor(Math.random() * options.length)]
}

/**
 * Generate a random avatar configuration
 */
function generateRandomConfig(): AvatarConfig {
  return {
    avatarStyle: 'Circle',
    topType: getRandomOption(AVATAR_OPTIONS.topType),
    hairColor: getRandomOption(AVATAR_OPTIONS.hairColor),
    accessoriesType: getRandomOption(AVATAR_OPTIONS.accessoriesType),
    facialHairType: getRandomOption(AVATAR_OPTIONS.facialHairType),
    facialHairColor: getRandomOption(AVATAR_OPTIONS.facialHairColor),
    clotheType: getRandomOption(AVATAR_OPTIONS.clotheType),
    clotheColor: getRandomOption(AVATAR_OPTIONS.clotheColor),
    eyeType: getRandomOption(AVATAR_OPTIONS.eyeType),
    eyebrowType: getRandomOption(AVATAR_OPTIONS.eyebrowType),
    mouthType: getRandomOption(AVATAR_OPTIONS.mouthType),
    skinColor: getRandomOption(AVATAR_OPTIONS.skinColor),
  }
}

/**
 * Format option label from camelCase/PascalCase to readable text
 */
function formatOptionLabel(value: string): string {
  // Handle special cases
  if (value === 'NoHair') return 'None'
  if (value === 'Blank') return 'None'

  // Convert PascalCase/camelCase to words
  return value
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (str) => str.toUpperCase())
    .replace(/\d+/g, ' $&')
    .trim()
}

// ============================================================================
// Sub-Components
// ============================================================================

/**
 * Avatar preview with animation feedback and entrance animation
 */
const AvatarPreviewSection = memo(function AvatarPreviewSection({
  config,
  isAnimating,
}: {
  config: AvatarConfig
  isAnimating: boolean
}) {
  const avatarDataUri = useMemo(
    () => createAvatarDataUri(config, 200),
    [config]
  )

  return (
    <div
      className={`
        relative mx-auto w-36 h-36 sm:w-44 sm:h-44
        rounded-full bg-gradient-to-br from-primary-50 to-primary-100
        dark:from-primary-900/20 dark:to-primary-800/10
        shadow-lg shadow-primary-500/10 hover:shadow-xl hover:shadow-primary-500/15
        flex items-center justify-center
        transition-all duration-300 ease-out
        animate-fade-in-scale
        ${isAnimating ? 'scale-95' : 'scale-100 hover:scale-[1.02]'}
      `}
    >
      {/* Avatar image */}
      <img
        src={avatarDataUri}
        alt="Your avatar preview"
        className={`
          w-32 h-32 sm:w-40 sm:h-40 rounded-full
          transition-all duration-300
          ${isAnimating ? 'opacity-70 scale-95' : 'opacity-100 scale-100'}
        `}
        draggable={false}
      />

      {/* Loading indicator overlay */}
      {isAnimating && (
        <div className="absolute inset-0 flex items-center justify-center rounded-full bg-white/30 dark:bg-black/20 backdrop-blur-sm">
          <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </div>
  )
})

/**
 * Quick option selector for basic customization
 */
const QuickOptionSelector = memo(function QuickOptionSelector({
  label,
  options,
  value,
  onChange,
}: {
  label: string
  options: readonly string[]
  value: string
  onChange: (value: string) => void
}) {
  return (
    <div className="space-y-2">
      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">
        {label}
      </label>
      {/* Horizontal scroll with touch momentum and hidden scrollbar */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide touch-scroll-x">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => onChange(option)}
            className={`
              flex-shrink-0 px-3 py-2 rounded-lg text-xs font-medium
              min-touch-target transition-all duration-150
              focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1
              active:scale-95
              ${
                value === option
                  ? 'bg-primary-500 text-white shadow-md shadow-primary-500/20'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
              }
            `}
            aria-pressed={value === option}
          >
            {formatOptionLabel(option)}
          </button>
        ))}
      </div>
    </div>
  )
})

/**
 * Quick action buttons (Randomize / Reset) with enhanced transitions
 */
const QuickActions = memo(function QuickActions({
  onRandomize,
  isAnimating,
}: {
  onRandomize: () => void
  isAnimating: boolean
}) {
  return (
    <div className="flex justify-center gap-3 animate-fade-in-up animation-delay-200">
      <button
        type="button"
        onClick={onRandomize}
        disabled={isAnimating}
        className={`
          flex items-center gap-2 px-5 py-2.5
          bg-white dark:bg-gray-800
          border border-gray-200 dark:border-gray-700
          rounded-xl text-sm font-medium
          text-gray-700 dark:text-gray-300
          hover:bg-gray-50 dark:hover:bg-gray-750
          hover:border-primary-300 dark:hover:border-primary-700
          active:scale-95
          transition-all duration-200
          focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2
          disabled:opacity-50 disabled:cursor-not-allowed
          shadow-sm hover:shadow-md
          group
        `}
        aria-label="Generate a random avatar"
      >
        <span
          className={`text-lg transition-transform duration-300 ${isAnimating ? 'animate-spin' : 'group-hover:rotate-180'}`}
          aria-hidden="true"
        >
          🎲
        </span>
        <span>Randomize</span>
      </button>
    </div>
  )
})

// ============================================================================
// Main Component
// ============================================================================

/**
 * Avatar creation step for onboarding flow
 *
 * This component provides a streamlined avatar creation experience
 * optimized for quick completion. Users can:
 * - Start with a randomly generated avatar
 * - Randomize to get a new look
 * - Make basic customizations (skin, hair style, hair color)
 * - Proceed to customize later for detailed editing
 *
 * @example
 * ```tsx
 * <AvatarCreationStep
 *   onContinue={(config) => saveAvatarAndContinue(config)}
 *   onSkip={() => skipOnboarding()}
 *   onBack={() => goToPreviousStep()}
 * />
 * ```
 */
function AvatarCreationStepComponent({
  onContinue,
  onSkip,
  onBack,
  initialConfig,
  isLoading = false,
  className = '',
}: AvatarCreationStepProps) {
  // Get step config for UI labels
  const stepConfig = getStepById('avatar')

  // State for avatar configuration - start with provided config or random
  const [config, setConfig] = useState<AvatarConfig>(() => ({
    ...generateRandomConfig(),
    ...initialConfig,
  }))

  // Animation state for preview feedback
  const [isAnimating, setIsAnimating] = useState(false)

  // Whether to show customization options
  const [showCustomize, setShowCustomize] = useState(false)

  // -------------------------------------------------------------------------
  // Handlers
  // -------------------------------------------------------------------------

  /**
   * Randomize avatar configuration with animation feedback
   */
  const handleRandomize = useCallback(() => {
    setIsAnimating(true)

    // Short delay for animation feedback
    setTimeout(() => {
      setConfig(generateRandomConfig())
      setIsAnimating(false)
    }, 200)
  }, [])

  /**
   * Update a specific attribute
   */
  const handleAttributeChange = useCallback(
    (attribute: keyof AvatarConfig, value: string) => {
      setConfig((prev) => ({
        ...prev,
        [attribute]: value,
      }))
    },
    []
  )

  /**
   * Continue to next step with current avatar
   */
  const handleContinue = useCallback(() => {
    onContinue(config)
  }, [config, onContinue])

  /**
   * Toggle customization panel
   */
  const handleToggleCustomize = useCallback(() => {
    setShowCustomize((prev) => !prev)
  }, [])

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  // Container classes - min-h-0 enables proper flex shrinking for mobile scroll
  const containerClasses = [
    'flex flex-col h-full min-h-0',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={containerClasses}>
      {/* Hero section with avatar preview and entrance animations */}
      <div className="text-center mb-4 sm:mb-6">
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2 animate-fade-in-up">
          {stepConfig?.title || 'Create Your Avatar'}
        </h2>
        <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 max-w-xs sm:max-w-sm mx-auto animate-fade-in-up animation-delay-100">
          {stepConfig?.description || 'Your avatar represents you in missed connection posts. No photos needed.'}
        </p>
      </div>

      {/* Avatar preview */}
      <div className="mb-4 sm:mb-6">
        <AvatarPreviewSection config={config} isAnimating={isAnimating} />
      </div>

      {/* Quick actions */}
      <div className="mb-4 sm:mb-6">
        <QuickActions onRandomize={handleRandomize} isAnimating={isAnimating} />
      </div>

      {/* Customization toggle and options */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {/* Toggle button */}
        <button
          type="button"
          onClick={handleToggleCustomize}
          className="w-full flex items-center justify-center gap-2 py-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
          aria-expanded={showCustomize}
          aria-controls="quick-customize-panel"
        >
          <svg
            className={`w-4 h-4 transition-transform duration-200 ${showCustomize ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
          <span>{showCustomize ? 'Hide Options' : 'Quick Customize'}</span>
        </button>

        {/* Customization panel with touch-friendly scrolling */}
        <div
          id="quick-customize-panel"
          className={`
            overflow-y-auto touch-scroll-y transition-all duration-300 ease-out
            ${showCustomize ? 'max-h-48 opacity-100 mt-3' : 'max-h-0 opacity-0'}
          `}
        >
          <div className="space-y-4 px-1">
            {QUICK_CUSTOMIZE_OPTIONS.map(({ key, label, options }) => (
              <QuickOptionSelector
                key={key}
                label={label}
                options={options}
                value={(config[key] as string) || ''}
                onChange={(value) => handleAttributeChange(key, value)}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Reassurance text */}
      <div className="text-center py-3 sm:py-4">
        <p className="text-xs text-gray-400 dark:text-gray-500">
          You can customize your avatar anytime in settings.
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
          {stepConfig?.primaryButtonLabel || 'Continue'}
        </Button>

        {/* Secondary actions - min-touch-target ensures 44px minimum touch target */}
        <div className="flex items-center justify-between">
          {stepConfig?.showBack && (
            <button
              type="button"
              onClick={onBack}
              className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 text-sm font-medium py-3 px-2 min-touch-target transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 rounded-lg"
              aria-label="Go back to the previous step"
            >
              Go back
            </button>
          )}

          {stepConfig?.showSkip && (
            <button
              type="button"
              onClick={onSkip}
              className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 text-sm font-medium py-3 px-2 min-touch-target transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 rounded-lg ml-auto"
              aria-label="Skip onboarding"
            >
              Skip for now
            </button>
          )}
        </div>
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
  prevProps: AvatarCreationStepProps,
  nextProps: AvatarCreationStepProps
): boolean {
  return (
    prevProps.isLoading === nextProps.isLoading &&
    prevProps.className === nextProps.className &&
    prevProps.onContinue === nextProps.onContinue &&
    prevProps.onSkip === nextProps.onSkip &&
    prevProps.onBack === nextProps.onBack &&
    prevProps.initialConfig === nextProps.initialConfig
  )
}

/**
 * Memoized AvatarCreationStep component.
 * Onboarding step for creating a user avatar with simplified UI.
 */
export const AvatarCreationStep = memo(AvatarCreationStepComponent, arePropsEqual)

// Set display name for debugging
AvatarCreationStep.displayName = 'AvatarCreationStep'

export default AvatarCreationStep
