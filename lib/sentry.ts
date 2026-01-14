/**
 * Sentry Error Tracking
 *
 * Provides crash reporting and error tracking for the Backtrack app using
 * Sentry SDK. Errors are captured and sent to Sentry for monitoring
 * and debugging.
 *
 * Features:
 * - Automatic crash reporting in production
 * - Manual error capture via captureException
 * - Sensitive data filtering via beforeSend hook
 * - User context attachment for debugging
 *
 * @example
 * ```tsx
 * import { captureException, setUserContext } from 'lib/sentry'
 *
 * // Set user context after login
 * setUserContext(userId)
 *
 * // Capture an error
 * try {
 *   await riskyOperation()
 * } catch (error) {
 *   captureException(error, { operation: 'riskyOperation' })
 * }
 * ```
 */

import * as Sentry from '@sentry/react-native'
import Constants from 'expo-constants'

// ============================================================================
// CONFIGURATION
// ============================================================================

/**
 * Get the Sentry DSN from environment variables
 * Returns undefined if not configured (Sentry will be disabled)
 */
function getSentryDsn(): string | undefined {
  return process.env.EXPO_PUBLIC_SENTRY_DSN
}

/**
 * Get app version from Expo config
 */
function getAppVersion(): string {
  return Constants.expoConfig?.version || '1.0.0'
}

/**
 * Get build number/version code for release identification
 */
function getBuildNumber(): string | undefined {
  const config = Constants.expoConfig
  // Android versionCode or iOS buildNumber
  return config?.android?.versionCode?.toString() ||
    config?.ios?.buildNumber ||
    undefined
}

/**
 * Patterns for sensitive data that should be filtered from error reports
 */
const SENSITIVE_PATTERNS = [
  /password/i,
  /secret/i,
  /token/i,
  /auth/i,
  /apikey/i,
  /api_key/i,
  /credential/i,
  /private/i,
  /bearer/i,
]

/**
 * Keys that should be redacted from error context
 */
const SENSITIVE_KEYS = [
  'password',
  'newPassword',
  'oldPassword',
  'accessToken',
  'refreshToken',
  'idToken',
  'sessionToken',
  'apiKey',
  'secret',
  'authorization',
  'cookie',
]

// ============================================================================
// SENSITIVE DATA FILTERING
// ============================================================================

/**
 * Check if a string contains sensitive data patterns
 */
function containsSensitiveData(value: string): boolean {
  return SENSITIVE_PATTERNS.some((pattern) => pattern.test(value))
}

/**
 * Recursively redact sensitive values from an object
 */
function redactSensitiveData(obj: unknown, depth = 0): unknown {
  // Prevent infinite recursion
  if (depth > 10) return '[DEPTH_LIMIT]'

  if (obj === null || obj === undefined) return obj

  if (typeof obj === 'string') {
    // Redact strings that look like tokens or keys
    if (obj.length > 20 && containsSensitiveData(obj)) {
      return '[REDACTED]'
    }
    // Redact JWT tokens
    if (obj.startsWith('eyJ') && obj.includes('.')) {
      return '[JWT_REDACTED]'
    }
    return obj
  }

  if (typeof obj !== 'object') return obj

  if (Array.isArray(obj)) {
    return obj.map((item) => redactSensitiveData(item, depth + 1))
  }

  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    // Redact known sensitive keys
    if (SENSITIVE_KEYS.some((k) => key.toLowerCase().includes(k.toLowerCase()))) {
      result[key] = '[REDACTED]'
    } else {
      result[key] = redactSensitiveData(value, depth + 1)
    }
  }
  return result
}

// ============================================================================
// INITIALIZATION
// ============================================================================

/**
 * Whether Sentry has been initialized
 */
let isInitialized = false

/**
 * Initialize Sentry for error tracking
 *
 * Should be called once at app startup, before any errors might occur.
 * Only initializes in production mode when DSN is configured.
 *
 * @returns Whether Sentry was successfully initialized
 *
 * @example
 * ```tsx
 * // In App.tsx
 * import { initSentry } from 'lib/sentry'
 *
 * // Initialize early in app lifecycle
 * initSentry()
 *
 * export default function App() { ... }
 * ```
 */
export function initSentry(): boolean {
  // Don't initialize in development mode
  if (__DEV__) {
    if (process.env.NODE_ENV !== 'test') {
      console.log('[Sentry] Skipped initialization in development mode')
    }
    return false
  }

  // Don't initialize if already done
  if (isInitialized) {
    return true
  }

  // Get DSN from environment
  const dsn = getSentryDsn()
  if (!dsn) {
    console.warn('[Sentry] No DSN configured. Error tracking is disabled.')
    return false
  }

  try {
    Sentry.init({
      dsn,
      // Set environment based on build type
      environment: __DEV__ ? 'development' : 'production',
      // Set release version for source map association
      release: `backtrack@${getAppVersion()}`,
      // Set dist for identifying specific builds
      dist: getBuildNumber(),
      // Enable performance monitoring (optional, start with low sample rate)
      tracesSampleRate: 0.1,
      // Filter sensitive data before sending
      beforeSend(event) {
        // Redact sensitive data from event extras
        if (event.extra) {
          event.extra = redactSensitiveData(event.extra) as Record<string, unknown>
        }
        // Redact sensitive data from breadcrumbs
        if (event.breadcrumbs) {
          event.breadcrumbs = event.breadcrumbs.map((breadcrumb) => {
            if (breadcrumb.data) {
              breadcrumb.data = redactSensitiveData(breadcrumb.data) as Record<string, unknown>
            }
            return breadcrumb
          })
        }
        // Redact user email if present (for privacy)
        if (event.user?.email) {
          event.user.email = '[REDACTED]'
        }
        return event
      },
      // Don't send events in debug builds
      enabled: !__DEV__,
      // Attach stack traces to messages
      attachStacktrace: true,
      // Automatically capture unhandled promise rejections
      enableAutoPerformanceTracing: false,
    })

    isInitialized = true
    console.log('[Sentry] Initialized successfully')
    return true
  } catch (error) {
    console.error('[Sentry] Failed to initialize:', error)
    return false
  }
}

// ============================================================================
// ERROR CAPTURE
// ============================================================================

/**
 * Capture an exception and send to Sentry
 *
 * Use this to manually report caught errors to Sentry.
 * Errors are only sent in production mode.
 *
 * @param error - The error to capture
 * @param context - Additional context to attach to the error
 *
 * @example
 * ```tsx
 * try {
 *   await saveUserData(data)
 * } catch (error) {
 *   captureException(error, {
 *     operation: 'saveUserData',
 *     userId: user.id,
 *   })
 * }
 * ```
 */
export function captureException(
  error: unknown,
  context?: Record<string, unknown>
): void {
  // In development, just log the error
  if (__DEV__) {
    console.error('[Sentry] Would capture exception:', error, context)
    return
  }

  // Ensure error is an Error object
  const errorObj = error instanceof Error ? error : new Error(String(error))

  // Redact sensitive data from context
  const safeContext = context ? redactSensitiveData(context) : undefined

  Sentry.captureException(errorObj, {
    extra: safeContext as Record<string, unknown> | undefined,
  })
}

/**
 * Capture a message and send to Sentry
 *
 * Use this to report non-error events that are worth tracking.
 *
 * @param message - The message to capture
 * @param level - Severity level (default: 'info')
 * @param context - Additional context to attach
 *
 * @example
 * ```tsx
 * captureMessage('User exceeded rate limit', 'warning', {
 *   userId: user.id,
 *   endpoint: '/api/posts',
 * })
 * ```
 */
export function captureMessage(
  message: string,
  level: Sentry.SeverityLevel = 'info',
  context?: Record<string, unknown>
): void {
  // In development, just log the message
  if (__DEV__) {
    console.log(`[Sentry] Would capture message (${level}):`, message, context)
    return
  }

  // Redact sensitive data from context
  const safeContext = context ? redactSensitiveData(context) : undefined

  Sentry.captureMessage(message, {
    level,
    extra: safeContext as Record<string, unknown> | undefined,
  })
}

// ============================================================================
// USER CONTEXT
// ============================================================================

/**
 * Set user context for Sentry error reports
 *
 * Call this after user authentication to associate errors with users.
 * User ID is included but email is redacted for privacy.
 *
 * @param userId - The authenticated user's ID
 *
 * @example
 * ```tsx
 * // After successful login
 * setUserContext(user.id)
 *
 * // After logout
 * clearUserContext()
 * ```
 */
export function setUserContext(userId: string | null): void {
  if (__DEV__) {
    console.log('[Sentry] Would set user context:', userId ? 'user_set' : 'cleared')
    return
  }

  if (userId) {
    Sentry.setUser({ id: userId })
  } else {
    Sentry.setUser(null)
  }
}

/**
 * Clear user context from Sentry
 *
 * Call this on logout to stop associating errors with the previous user.
 */
export function clearUserContext(): void {
  setUserContext(null)
}

// ============================================================================
// BREADCRUMBS
// ============================================================================

/**
 * Add a breadcrumb to help debug error context
 *
 * Breadcrumbs are trail of events leading up to an error.
 * Use them to track user actions and state changes.
 *
 * @param message - Description of the event
 * @param category - Category for grouping (e.g., 'navigation', 'ui', 'api')
 * @param data - Additional data to attach
 *
 * @example
 * ```tsx
 * // Track navigation
 * addBreadcrumb('Navigated to profile', 'navigation', { screen: 'Profile' })
 *
 * // Track API calls
 * addBreadcrumb('Fetched user data', 'api', { endpoint: '/api/user' })
 * ```
 */
export function addBreadcrumb(
  message: string,
  category: string,
  data?: Record<string, unknown>
): void {
  if (__DEV__) {
    return // Don't clutter dev console
  }

  // Redact sensitive data
  const safeData = data ? redactSensitiveData(data) : undefined

  Sentry.addBreadcrumb({
    message,
    category,
    data: safeData as Record<string, unknown> | undefined,
    level: 'info',
  })
}

// ============================================================================
// REACT INTEGRATION
// ============================================================================

/**
 * Wrap a React component with Sentry error boundary
 *
 * This provides automatic error reporting for React component errors.
 *
 * @param component - The component to wrap
 * @param fallback - Optional fallback UI to show on error
 * @returns Wrapped component with Sentry error boundary
 *
 * @example
 * ```tsx
 * const SafeApp = wrapWithSentry(App, <ErrorFallback />)
 * ```
 */
export const wrapWithSentry = Sentry.wrap

/**
 * Report a React error to Sentry
 *
 * Use this in ErrorBoundary componentDidCatch to report React errors.
 *
 * @param error - The error caught by ErrorBoundary
 * @param errorInfo - React error info with component stack
 *
 * @example
 * ```tsx
 * class ErrorBoundary extends Component {
 *   componentDidCatch(error: Error, errorInfo: ErrorInfo) {
 *     reportReactError(error, errorInfo)
 *   }
 * }
 * ```
 */
export function reportReactError(
  error: Error,
  errorInfo: { componentStack?: string }
): void {
  if (__DEV__) {
    console.error('[Sentry] Would report React error:', error)
    return
  }

  Sentry.captureException(error, {
    extra: {
      componentStack: errorInfo.componentStack,
    },
  })
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  initSentry,
  captureException,
  captureMessage,
  setUserContext,
  clearUserContext,
  addBreadcrumb,
  wrapWithSentry,
  reportReactError,
}
