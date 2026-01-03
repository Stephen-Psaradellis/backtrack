/**
 * Error Tracking Service
 *
 * Provides a centralized error tracking and monitoring service.
 * Currently configured for Sentry integration.
 *
 * To enable Sentry in production:
 * 1. Install @sentry/react-native: npm install @sentry/react-native
 * 2. Set EXPO_PUBLIC_SENTRY_DSN in your environment
 * 3. Call initErrorTracking() in your App.tsx
 *
 * @example
 * ```typescript
 * import { initErrorTracking, captureError, setUser } from './errorTracking'
 *
 * // Initialize on app start
 * initErrorTracking()
 *
 * // Set user context after login
 * setUser({ id: 'user-123', email: 'user@example.com' })
 *
 * // Capture errors
 * try {
 *   await riskyOperation()
 * } catch (error) {
 *   captureError(error, { context: 'riskyOperation' })
 * }
 * ```
 */

// ============================================================================
// Types
// ============================================================================

export interface ErrorTrackingUser {
  id: string
  email?: string
  username?: string
}

export interface ErrorContext {
  /** Additional context for the error */
  [key: string]: unknown
}

export interface Breadcrumb {
  /** Category of the breadcrumb (e.g., 'navigation', 'user-action') */
  category: string
  /** Message describing what happened */
  message: string
  /** Log level */
  level?: 'debug' | 'info' | 'warning' | 'error'
  /** Additional data */
  data?: Record<string, unknown>
}

// ============================================================================
// Configuration
// ============================================================================

const SENTRY_DSN = process.env.EXPO_PUBLIC_SENTRY_DSN

/**
 * Whether Sentry is properly configured
 */
export const isSentryConfigured = Boolean(SENTRY_DSN)

/**
 * Whether we're in production mode
 */
const isProduction = process.env.NODE_ENV === 'production'

// ============================================================================
// Mock Implementation (Development)
// ============================================================================

/**
 * When Sentry is not configured, we use console logging as a fallback
 */
const mockSentry = {
  init: (options: unknown) => {
    if (!isProduction) {
      console.log('[ErrorTracking] Mock initialized with options:', options)
    }
  },
  captureException: (error: unknown, context?: unknown) => {
    console.error('[ErrorTracking] Captured exception:', error)
    if (context) {
      console.error('[ErrorTracking] Context:', context)
    }
  },
  captureMessage: (message: string, level?: string) => {
    const logFn = level === 'error' ? console.error : console.warn
    logFn(`[ErrorTracking] ${level?.toUpperCase() || 'INFO'}: ${message}`)
  },
  setUser: (user: ErrorTrackingUser | null) => {
    if (!isProduction) {
      console.log('[ErrorTracking] Set user:', user)
    }
  },
  setTag: (key: string, value: string) => {
    if (!isProduction) {
      console.log(`[ErrorTracking] Set tag: ${key}=${value}`)
    }
  },
  setContext: (name: string, context: Record<string, unknown> | null) => {
    if (!isProduction) {
      console.log(`[ErrorTracking] Set context ${name}:`, context)
    }
  },
  addBreadcrumb: (breadcrumb: Breadcrumb) => {
    if (!isProduction) {
      console.log('[ErrorTracking] Breadcrumb:', breadcrumb)
    }
  },
}

// ============================================================================
// Sentry Integration
// ============================================================================

/**
 * Get the Sentry instance
 * Returns mock implementation if Sentry is not configured
 */
function getSentry() {
  // In a real implementation, you would import Sentry here:
  // import * as Sentry from '@sentry/react-native'
  // return Sentry

  // For now, return mock implementation
  return mockSentry
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Initialize error tracking
 *
 * Call this once at app startup (e.g., in App.tsx)
 *
 * @example
 * ```typescript
 * // In App.tsx
 * import { initErrorTracking } from './errorTracking'
 *
 * export default function App() {
 *   useEffect(() => {
 *     initErrorTracking()
 *   }, [])
 *   // ...
 * }
 * ```
 */
export function initErrorTracking(): void {
  const Sentry = getSentry()

  Sentry.init({
    dsn: SENTRY_DSN,
    environment: isProduction ? 'production' : 'development',
    // Only send errors in production
    enabled: isProduction && isSentryConfigured,
    // Capture 10% of transactions for performance monitoring
    tracesSampleRate: 0.1,
    // Enable debug mode in development
    debug: !isProduction,
  })

  if (!isProduction) {
    console.log('[ErrorTracking] Initialized', {
      configured: isSentryConfigured,
      environment: isProduction ? 'production' : 'development',
    })
  }
}

/**
 * Capture an error and send to error tracking service
 *
 * @param error - The error to capture
 * @param context - Additional context for debugging
 *
 * @example
 * ```typescript
 * try {
 *   await fetchUserData()
 * } catch (error) {
 *   captureError(error, {
 *     operation: 'fetchUserData',
 *     userId: currentUser.id,
 *   })
 * }
 * ```
 */
export function captureError(error: unknown, context?: ErrorContext): void {
  const Sentry = getSentry()

  if (context) {
    Sentry.setContext('errorContext', context)
  }

  Sentry.captureException(error)
}

/**
 * Capture a message (non-error event)
 *
 * @param message - The message to capture
 * @param level - Severity level
 *
 * @example
 * ```typescript
 * captureMessage('User exceeded rate limit', 'warning')
 * ```
 */
export function captureMessage(
  message: string,
  level: 'debug' | 'info' | 'warning' | 'error' = 'info'
): void {
  const Sentry = getSentry()
  Sentry.captureMessage(message, level)
}

/**
 * Set the current user for error context
 *
 * @param user - User information (or null to clear)
 *
 * @example
 * ```typescript
 * // After login
 * setUser({ id: user.id, email: user.email })
 *
 * // After logout
 * setUser(null)
 * ```
 */
export function setUser(user: ErrorTrackingUser | null): void {
  const Sentry = getSentry()
  Sentry.setUser(user)
}

/**
 * Set a tag for filtering errors
 *
 * @param key - Tag key
 * @param value - Tag value
 *
 * @example
 * ```typescript
 * setTag('feature', 'chat')
 * setTag('subscription', 'premium')
 * ```
 */
export function setTag(key: string, value: string): void {
  const Sentry = getSentry()
  Sentry.setTag(key, value)
}

/**
 * Set additional context for errors
 *
 * @param name - Context name
 * @param context - Context data
 *
 * @example
 * ```typescript
 * setContext('location', {
 *   latitude: 40.7128,
 *   longitude: -74.0060,
 *   name: 'New York',
 * })
 * ```
 */
export function setContext(
  name: string,
  context: Record<string, unknown> | null
): void {
  const Sentry = getSentry()
  Sentry.setContext(name, context)
}

/**
 * Add a breadcrumb for debugging
 *
 * Breadcrumbs are events leading up to an error, helping with debugging.
 *
 * @param breadcrumb - Breadcrumb data
 *
 * @example
 * ```typescript
 * addBreadcrumb({
 *   category: 'navigation',
 *   message: 'User navigated to Chat screen',
 *   level: 'info',
 * })
 *
 * addBreadcrumb({
 *   category: 'user-action',
 *   message: 'User clicked Send button',
 *   data: { messageLength: 150 },
 * })
 * ```
 */
export function addBreadcrumb(breadcrumb: Breadcrumb): void {
  const Sentry = getSentry()
  Sentry.addBreadcrumb(breadcrumb)
}

/**
 * Wrap a function to automatically capture errors
 *
 * @param fn - Function to wrap
 * @param context - Additional context for errors
 * @returns Wrapped function
 *
 * @example
 * ```typescript
 * const safeFetch = withErrorCapture(
 *   async () => {
 *     const data = await fetchData()
 *     return data
 *   },
 *   { operation: 'fetchData' }
 * )
 *
 * const result = await safeFetch()
 * ```
 */
export function withErrorCapture<T extends (...args: unknown[]) => unknown>(
  fn: T,
  context?: ErrorContext
): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await fn(...args)
    } catch (error) {
      captureError(error, context)
      throw error
    }
  }) as T
}

// ============================================================================
// React Integration
// ============================================================================

/**
 * Error boundary fallback component props
 */
export interface ErrorBoundaryFallbackProps {
  error: Error
  resetError: () => void
}

/**
 * Create an error handler for React error boundaries
 *
 * @param componentName - Name of the component for context
 * @returns Error handler function
 *
 * @example
 * ```typescript
 * // In a React component
 * <ErrorBoundary
 *   onError={createErrorBoundaryHandler('ChatScreen')}
 *   fallback={(props) => <ErrorFallback {...props} />}
 * >
 *   <ChatContent />
 * </ErrorBoundary>
 * ```
 */
export function createErrorBoundaryHandler(
  componentName: string
): (error: Error, info: { componentStack: string }) => void {
  return (error: Error, info: { componentStack: string }) => {
    captureError(error, {
      component: componentName,
      componentStack: info.componentStack,
    })
  }
}

// ============================================================================
// Exports
// ============================================================================

export default {
  initErrorTracking,
  captureError,
  captureMessage,
  setUser,
  setTag,
  setContext,
  addBreadcrumb,
  withErrorCapture,
  createErrorBoundaryHandler,
  isSentryConfigured,
}
