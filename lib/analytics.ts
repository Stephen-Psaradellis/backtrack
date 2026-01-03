/**
 * Analytics Service
 *
 * Provides a centralized analytics tracking service for the Backtrack app.
 * Designed to be provider-agnostic - can integrate with Mixpanel, Amplitude,
 * Firebase Analytics, or custom solutions.
 *
 * Privacy-first approach:
 * - Respects user preferences
 * - No PII in event properties by default
 * - Opt-out support
 *
 * @example
 * ```typescript
 * import { initAnalytics, trackEvent, trackScreen } from './analytics'
 *
 * // Initialize on app start
 * initAnalytics()
 *
 * // Track events
 * trackEvent('post_created', { location_type: 'cafe' })
 * trackScreen('Home')
 * ```
 */

// ============================================================================
// Types
// ============================================================================

export interface AnalyticsUser {
  id: string
  properties?: Record<string, unknown>
}

export interface EventProperties {
  [key: string]: string | number | boolean | null | undefined
}

export interface ScreenProperties {
  /** Previous screen name */
  previousScreen?: string
  /** Additional properties */
  [key: string]: string | number | boolean | null | undefined
}

// ============================================================================
// Configuration
// ============================================================================

/**
 * Check if we're in production
 */
const isProduction = process.env.NODE_ENV === 'production'

/**
 * Analytics enabled state (can be toggled by user preferences)
 */
let analyticsEnabled = true

// ============================================================================
// Event Names (Type Safety)
// ============================================================================

/**
 * Predefined event names for consistency
 */
export const ANALYTICS_EVENTS = {
  // Authentication
  AUTH_SIGN_UP: 'auth_sign_up',
  AUTH_SIGN_IN: 'auth_sign_in',
  AUTH_SIGN_OUT: 'auth_sign_out',
  AUTH_PASSWORD_RESET: 'auth_password_reset',

  // Onboarding
  ONBOARDING_STARTED: 'onboarding_started',
  ONBOARDING_STEP_COMPLETED: 'onboarding_step_completed',
  ONBOARDING_COMPLETED: 'onboarding_completed',
  ONBOARDING_SKIPPED: 'onboarding_skipped',

  // Posts
  POST_CREATION_STARTED: 'post_creation_started',
  POST_CREATION_STEP: 'post_creation_step',
  POST_CREATED: 'post_created',
  POST_CREATION_ABANDONED: 'post_creation_abandoned',
  POST_VIEWED: 'post_viewed',
  POST_MATCHED: 'post_matched',

  // Locations
  LOCATION_SEARCHED: 'location_searched',
  LOCATION_SELECTED: 'location_selected',
  LOCATION_FAVORITED: 'location_favorited',
  LOCATION_UNFAVORITED: 'location_unfavorited',

  // Chat
  CONVERSATION_STARTED: 'conversation_started',
  MESSAGE_SENT: 'message_sent',
  PHOTO_SHARED: 'photo_shared',

  // Avatar
  AVATAR_CREATED: 'avatar_created',
  AVATAR_UPDATED: 'avatar_updated',

  // Moderation
  USER_BLOCKED: 'user_blocked',
  USER_UNBLOCKED: 'user_unblocked',
  CONTENT_REPORTED: 'content_reported',

  // Notifications
  NOTIFICATION_PERMISSION_GRANTED: 'notification_permission_granted',
  NOTIFICATION_PERMISSION_DENIED: 'notification_permission_denied',
  NOTIFICATION_RECEIVED: 'notification_received',
  NOTIFICATION_OPENED: 'notification_opened',

  // Errors
  ERROR_OCCURRED: 'error_occurred',
  ERROR_BOUNDARY_TRIGGERED: 'error_boundary_triggered',

  // Engagement
  APP_OPENED: 'app_opened',
  APP_BACKGROUNDED: 'app_backgrounded',
  FEATURE_USED: 'feature_used',
} as const

export type AnalyticsEventName =
  (typeof ANALYTICS_EVENTS)[keyof typeof ANALYTICS_EVENTS]

// ============================================================================
// Screen Names
// ============================================================================

export const ANALYTICS_SCREENS = {
  HOME: 'Home',
  AUTH: 'Auth',
  PROFILE: 'Profile',
  CHAT_LIST: 'ChatList',
  CHAT: 'Chat',
  CREATE_POST: 'CreatePost',
  POST_DETAIL: 'PostDetail',
  LOCATION_DETAIL: 'LocationDetail',
  AVATAR_CREATOR: 'AvatarCreator',
  SETTINGS: 'Settings',
  ONBOARDING: 'Onboarding',
} as const

export type AnalyticsScreenName =
  (typeof ANALYTICS_SCREENS)[keyof typeof ANALYTICS_SCREENS]

// ============================================================================
// Analytics Implementation
// ============================================================================

/**
 * Internal queue for batching events
 */
const eventQueue: Array<{
  name: string
  properties: EventProperties
  timestamp: number
}> = []

/**
 * Flush interval for batched events (30 seconds)
 */
const FLUSH_INTERVAL = 30 * 1000

/**
 * Maximum queue size before forcing a flush
 */
const MAX_QUEUE_SIZE = 50

/**
 * Flush the event queue to the analytics provider
 */
async function flushEventQueue(): Promise<void> {
  if (eventQueue.length === 0) return

  const events = [...eventQueue]
  eventQueue.length = 0

  if (!isProduction) {
    console.log('[Analytics] Flushing', events.length, 'events:', events)
    return
  }

  // In production, you would send these to your analytics provider
  // Example with a custom API:
  // await fetch('/api/analytics/batch', {
  //   method: 'POST',
  //   body: JSON.stringify({ events }),
  // })
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Initialize analytics
 *
 * Call this once at app startup
 */
export function initAnalytics(): void {
  if (!isProduction) {
    console.log('[Analytics] Initialized (development mode - events logged to console)')
  }

  // Set up periodic flush
  setInterval(() => {
    flushEventQueue()
  }, FLUSH_INTERVAL)

  // Track app open
  trackEvent(ANALYTICS_EVENTS.APP_OPENED)
}

/**
 * Enable or disable analytics
 *
 * @param enabled - Whether analytics should be enabled
 */
export function setAnalyticsEnabled(enabled: boolean): void {
  analyticsEnabled = enabled
  if (!isProduction) {
    console.log('[Analytics] Enabled:', enabled)
  }
}

/**
 * Check if analytics is enabled
 */
export function isAnalyticsEnabled(): boolean {
  return analyticsEnabled
}

/**
 * Identify the current user
 *
 * @param user - User to identify (or null to clear)
 */
export function identifyUser(user: AnalyticsUser | null): void {
  if (!analyticsEnabled) return

  if (!isProduction) {
    console.log('[Analytics] Identify user:', user)
  }

  // In production, send to analytics provider
  // Example: mixpanel.identify(user.id)
}

/**
 * Track an event
 *
 * @param name - Event name
 * @param properties - Event properties
 */
export function trackEvent(
  name: AnalyticsEventName | string,
  properties?: EventProperties
): void {
  if (!analyticsEnabled) return

  const event = {
    name,
    properties: {
      ...properties,
      // Add common properties
      platform: typeof window !== 'undefined' ? 'web' : 'mobile',
      timestamp: new Date().toISOString(),
    },
    timestamp: Date.now(),
  }

  if (!isProduction) {
    console.log('[Analytics] Event:', event.name, event.properties)
  }

  eventQueue.push(event)

  // Flush if queue is getting large
  if (eventQueue.length >= MAX_QUEUE_SIZE) {
    flushEventQueue()
  }
}

/**
 * Track a screen view
 *
 * @param screenName - Name of the screen
 * @param properties - Additional properties
 */
export function trackScreen(
  screenName: AnalyticsScreenName | string,
  properties?: ScreenProperties
): void {
  if (!analyticsEnabled) return

  if (!isProduction) {
    console.log('[Analytics] Screen:', screenName, properties)
  }

  trackEvent('screen_view', {
    screen_name: screenName,
    ...properties,
  })
}

/**
 * Set a user property
 *
 * @param name - Property name
 * @param value - Property value
 */
export function setUserProperty(
  name: string,
  value: string | number | boolean | null
): void {
  if (!analyticsEnabled) return

  if (!isProduction) {
    console.log('[Analytics] User property:', name, value)
  }

  // In production, send to analytics provider
}

/**
 * Track timing of an operation
 *
 * @param category - Category of the timing (e.g., 'api', 'render')
 * @param name - Name of the operation
 * @param durationMs - Duration in milliseconds
 */
export function trackTiming(
  category: string,
  name: string,
  durationMs: number
): void {
  if (!analyticsEnabled) return

  trackEvent('timing', {
    category,
    name,
    duration_ms: durationMs,
  })
}

/**
 * Create a timing tracker for measuring duration
 *
 * @param category - Category of the timing
 * @param name - Name of the operation
 * @returns Object with stop() method
 *
 * @example
 * ```typescript
 * const timer = startTiming('api', 'fetchPosts')
 * await fetchPosts()
 * timer.stop() // Automatically tracks the duration
 * ```
 */
export function startTiming(
  category: string,
  name: string
): { stop: () => void } {
  const startTime = Date.now()

  return {
    stop: () => {
      const duration = Date.now() - startTime
      trackTiming(category, name, duration)
    },
  }
}

/**
 * Track an error
 *
 * @param error - The error that occurred
 * @param context - Additional context
 */
export function trackError(
  error: Error | unknown,
  context?: Record<string, unknown>
): void {
  const errorMessage =
    error instanceof Error ? error.message : String(error)
  const errorName = error instanceof Error ? error.name : 'Unknown'

  trackEvent(ANALYTICS_EVENTS.ERROR_OCCURRED, {
    error_name: errorName,
    error_message: errorMessage.slice(0, 200), // Limit length
    ...context,
  })
}

// ============================================================================
// React Hooks
// ============================================================================

/**
 * Hook for tracking screen views
 *
 * @param screenName - Name of the screen
 *
 * @example
 * ```typescript
 * function HomeScreen() {
 *   useTrackScreen('Home')
 *   return <View>...</View>
 * }
 * ```
 */
export function useTrackScreen(screenName: AnalyticsScreenName | string): void {
  // Note: In a real implementation, use useEffect
  // useEffect(() => {
  //   trackScreen(screenName)
  // }, [screenName])
}

// ============================================================================
// Exports
// ============================================================================

export default {
  initAnalytics,
  setAnalyticsEnabled,
  isAnalyticsEnabled,
  identifyUser,
  trackEvent,
  trackScreen,
  setUserProperty,
  trackTiming,
  startTiming,
  trackError,
  useTrackScreen,
  ANALYTICS_EVENTS,
  ANALYTICS_SCREENS,
}
