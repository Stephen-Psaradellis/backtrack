/**
 * Development Mode Banner Component
 *
 * A banner component that displays when the application is running in
 * development mode with mock services. Provides visual feedback to developers
 * that they are not connected to real backend services.
 *
 * Features:
 * - Automatic visibility based on mock services status
 * - Non-obtrusive design
 * - Shows which mock services are active
 * - Dismissible with session persistence
 */

'use client'

import React, { useState, useEffect } from 'react'
import { isUsingMockServices, getMockServicesSummary } from '../lib/dev'

// ============================================================================
// TYPES
// ============================================================================

/**
 * Position of the dev mode banner
 */
export type DevModeBannerPosition = 'top' | 'bottom'

/**
 * Variant of the dev mode banner
 */
export type DevModeBannerVariant = 'info' | 'warning'

/**
 * Props for the DevModeBanner component
 */
export interface DevModeBannerProps {
  /** Position of the banner (default: 'bottom') */
  position?: DevModeBannerPosition
  /** Visual variant (default: 'info') */
  variant?: DevModeBannerVariant
  /** Custom message to display */
  message?: string
  /** Whether to show which services are mocked (default: true) */
  showMockDetails?: boolean
  /** Whether the banner can be dismissed (default: true) */
  dismissible?: boolean
  /** Custom container className */
  className?: string
  /** Test ID for testing purposes */
  testID?: string
}

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Default messages for the banner
 */
const DEFAULT_MESSAGES = {
  main: 'Development Mode - Using Mock Data',
  mockSupabase: 'Supabase',
  mockGoogleMaps: 'Google Maps',
} as const

/**
 * Colors for different variants
 */
const VARIANT_STYLES = {
  info: {
    background: 'bg-indigo-600',
    text: 'text-white',
    border: 'border-indigo-700',
    button: 'bg-indigo-700 hover:bg-indigo-800',
  },
  warning: {
    background: 'bg-amber-500',
    text: 'text-white',
    border: 'border-amber-600',
    button: 'bg-amber-600 hover:bg-amber-700',
  },
} as const

/**
 * Session storage key for dismissed state
 */
const DISMISSED_KEY = 'dev-mode-banner-dismissed'

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * DevModeBanner - A banner that shows when running in dev mode with mocks
 *
 * @example
 * // Basic usage - auto-manages visibility based on mock services
 * <DevModeBanner />
 *
 * @example
 * // At top of screen with warning variant
 * <DevModeBanner position="top" variant="warning" />
 *
 * @example
 * // Custom message without dismiss button
 * <DevModeBanner
 *   message="Running without backend"
 *   dismissible={false}
 * />
 *
 * @example
 * // Without mock service details
 * <DevModeBanner showMockDetails={false} />
 */
export function DevModeBanner({
  position = 'bottom',
  variant = 'info',
  message = DEFAULT_MESSAGES.main,
  showMockDetails = true,
  dismissible = true,
  className = '',
  testID = 'dev-mode-banner',
}: DevModeBannerProps): JSX.Element | null {
  const [isDismissed, setIsDismissed] = useState(false)
  const [isVisible, setIsVisible] = useState(false)
  const [mockSummary, setMockSummary] = useState<ReturnType<typeof getMockServicesSummary> | null>(null)

  // ---------------------------------------------------------------------------
  // EFFECTS
  // ---------------------------------------------------------------------------

  // Check mock services status and dismissed state on mount
  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') return

    // Check if using mock services
    const usingMocks = isUsingMockServices()
    if (!usingMocks) {
      setIsVisible(false)
      return
    }

    // Get mock services summary
    setMockSummary(getMockServicesSummary())

    // Check if banner was dismissed in this session
    const dismissed = sessionStorage.getItem(DISMISSED_KEY) === 'true'
    setIsDismissed(dismissed)
    setIsVisible(!dismissed)
  }, [])

  // ---------------------------------------------------------------------------
  // HANDLERS
  // ---------------------------------------------------------------------------

  const handleDismiss = () => {
    setIsDismissed(true)
    setIsVisible(false)
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(DISMISSED_KEY, 'true')
    }
  }

  // ---------------------------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------------------------

  // Don't render if not visible or dismissed
  if (!isVisible || isDismissed) {
    return null
  }

  const styles = VARIANT_STYLES[variant]

  // Build mock services list
  const mockServices: string[] = []
  if (mockSummary?.mockSupabase) {
    mockServices.push(DEFAULT_MESSAGES.mockSupabase)
  }
  if (mockSummary?.mockGoogleMaps) {
    mockServices.push(DEFAULT_MESSAGES.mockGoogleMaps)
  }

  const positionStyles = position === 'top' ? 'top-0' : 'bottom-0'

  return (
    <div
      className={`
        fixed left-0 right-0 ${positionStyles} z-50
        ${styles.background} ${styles.text}
        px-4 py-2 shadow-lg
        ${className}
      `}
      data-testid={testID}
      role="alert"
      aria-label={message}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1">
          {/* Dev Mode Icon */}
          <span className="text-lg" aria-hidden="true">
            🛠️
          </span>

          {/* Message */}
          <span
            className="text-sm font-medium"
            data-testid={`${testID}-message`}
          >
            {message}
          </span>

          {/* Mock Services Details */}
          {showMockDetails && mockServices.length > 0 && (
            <span
              className="text-xs opacity-80 hidden sm:inline"
              data-testid={`${testID}-details`}
            >
              ({mockServices.join(', ')} mocked)
            </span>
          )}
        </div>

        {/* Dismiss Button */}
        {dismissible && (
          <button
            onClick={handleDismiss}
            className={`
              ${styles.button}
              text-xs font-medium
              px-3 py-1 rounded
              transition-colors duration-150
              focus:outline-none focus:ring-2 focus:ring-white focus:ring-opacity-50
            `}
            aria-label="Dismiss development mode banner"
            data-testid={`${testID}-dismiss`}
          >
            Dismiss
          </button>
        )}
      </div>
    </div>
  )
}

// ============================================================================
// PRESET VARIANTS
// ============================================================================

/**
 * Top-positioned dev mode banner
 */
export function TopDevModeBanner(
  props: Omit<DevModeBannerProps, 'position'>
): JSX.Element | null {
  return <DevModeBanner {...props} position="top" />
}

/**
 * Bottom-positioned dev mode banner (default)
 */
export function BottomDevModeBanner(
  props: Omit<DevModeBannerProps, 'position'>
): JSX.Element | null {
  return <DevModeBanner {...props} position="bottom" />
}

/**
 * Warning-style dev mode banner
 */
export function WarningDevModeBanner(
  props: Omit<DevModeBannerProps, 'variant'>
): JSX.Element | null {
  return <DevModeBanner {...props} variant="warning" />
}

/**
 * Minimal dev mode banner (no details, no dismiss)
 */
export function MinimalDevModeBanner(
  props: Omit<DevModeBannerProps, 'showMockDetails' | 'dismissible'>
): JSX.Element | null {
  return <DevModeBanner {...props} showMockDetails={false} dismissible={false} />
}

// ============================================================================
// EXPORTS
// ============================================================================

export default DevModeBanner
export type {
  DevModeBannerPosition,
  DevModeBannerVariant,
  DevModeBannerProps,
}
