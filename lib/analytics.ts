/**
 * Analytics module for Backtrack
 *
 * Privacy-focused analytics using PostHog.
 * - No PII is ever tracked
 * - User IDs are anonymous UUIDs
 * - Respects user opt-out preferences
 * - GDPR/CCPA compliant
 */

import PostHog from 'posthog-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';

// Storage key for analytics opt-out preference
const ANALYTICS_OPT_OUT_KEY = 'analytics_opt_out';
const ANONYMOUS_ID_KEY = 'analytics_anonymous_id';

// PostHog instance (lazy initialized)
let posthogClient: PostHog | null = null;
let isOptedOut = false;
let isInitialized = false;

/**
 * Core analytics events tracked in Backtrack.
 * These events help understand user behavior and funnel conversion
 * without collecting any personally identifiable information.
 */
export enum AnalyticsEvent {
  // Authentication
  SIGN_UP = 'sign_up',
  LOGIN = 'login',
  LOGOUT = 'logout',

  // Core features
  POST_CREATED = 'post_created',
  POST_VIEWED = 'post_viewed',
  MATCH_MADE = 'match_made',
  MESSAGE_SENT = 'message_sent',
  PHOTO_SHARED = 'photo_shared',

  // Account lifecycle
  ACCOUNT_DELETED = 'account_deleted',
  ONBOARDING_STARTED = 'onboarding_started',
  ONBOARDING_COMPLETED = 'onboarding_completed',
  ONBOARDING_STEP_COMPLETED = 'onboarding_step_completed',

  // Permissions
  LOCATION_PERMISSION_GRANTED = 'location_permission_granted',
  LOCATION_PERMISSION_DENIED = 'location_permission_denied',
  NOTIFICATION_PERMISSION_GRANTED = 'notification_permission_granted',
  NOTIFICATION_PERMISSION_DENIED = 'notification_permission_denied',

  // Engagement
  FAVORITE_LOCATION_ADDED = 'favorite_location_added',
  FAVORITE_LOCATION_REMOVED = 'favorite_location_removed',
  AVATAR_CREATED = 'avatar_created',
  AVATAR_UPDATED = 'avatar_updated',

  // Errors (for funnel analysis, not error tracking - use Sentry for that)
  AUTH_ERROR = 'auth_error',
  POST_CREATION_ERROR = 'post_creation_error',
}

/**
 * JSON-compatible type for PostHog event properties.
 * Matches PostHog's JsonType definition.
 */
type JsonType = string | number | boolean | null | { [key: string]: JsonType } | JsonType[];

/**
 * Event properties that are allowed to be tracked.
 * Never include PII like email, name, phone, etc.
 * Uses JsonType for PostHog compatibility.
 */
export interface EventProperties {
  // Post-related
  location_type?: string; // e.g., 'cafe', 'bar', 'gym'
  has_time?: boolean;
  has_note?: boolean;

  // Onboarding
  step_name?: string;
  step_number?: number;

  // Matching
  match_score?: number;

  // Message
  message_type?: 'text' | 'image' | 'system';

  // General
  source?: string;
  error_type?: string;
  success?: boolean;

  // Allow additional JSON-compatible properties
  [key: string]: JsonType | undefined;
}

/**
 * Get or create an anonymous user ID for analytics.
 * This is NOT the Supabase user ID - it's a separate anonymous identifier.
 */
async function getAnonymousId(): Promise<string> {
  try {
    const storedId = await AsyncStorage.getItem(ANONYMOUS_ID_KEY);
    if (storedId) {
      return storedId;
    }

    // Generate a new anonymous UUID
    const newId = Crypto.randomUUID();
    await AsyncStorage.setItem(ANONYMOUS_ID_KEY, newId);
    return newId;
  } catch {
    // Fallback to a random ID if storage fails
    return Crypto.randomUUID();
  }
}

/**
 * Check if user has opted out of analytics
 */
async function checkOptOutStatus(): Promise<boolean> {
  try {
    const optOut = await AsyncStorage.getItem(ANALYTICS_OPT_OUT_KEY);
    return optOut === 'true';
  } catch {
    return false;
  }
}

/**
 * Initialize the analytics client.
 * Call this once at app startup (e.g., in App.tsx).
 *
 * @returns Promise<boolean> - true if analytics was initialized, false if disabled/opted-out
 */
export async function initializeAnalytics(): Promise<boolean> {
  if (isInitialized) {
    return !isOptedOut;
  }

  // Check opt-out status
  isOptedOut = await checkOptOutStatus();
  if (isOptedOut) {
    isInitialized = true;
    return false;
  }

  const apiKey = process.env.EXPO_PUBLIC_POSTHOG_API_KEY;
  const host = process.env.EXPO_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com';

  // If no API key, analytics is disabled (development mode)
  if (!apiKey) {
    if (__DEV__) {
      console.log('[Analytics] No PostHog API key configured, analytics disabled');
    }
    isInitialized = true;
    return false;
  }

  try {
    const anonymousId = await getAnonymousId();

    posthogClient = new PostHog(apiKey, {
      host,
      // Don't capture app lifecycle events - we'll track what we need explicitly
      captureAppLifecycleEvents: false,
    });

    // Identify with anonymous ID only
    posthogClient.identify(anonymousId);

    isInitialized = true;

    if (__DEV__) {
      console.log('[Analytics] PostHog initialized with anonymous ID');
    }

    return true;
  } catch (error) {
    if (__DEV__) {
      console.error('[Analytics] Failed to initialize PostHog:', error);
    }
    isInitialized = true;
    return false;
  }
}

/**
 * Sanitize event properties by removing undefined values.
 * PostHog's PostHogEventProperties requires JsonType values (no undefined).
 */
function sanitizeProperties(
  properties?: EventProperties
): Record<string, JsonType> | undefined {
  if (!properties) return undefined;

  const sanitized: Record<string, JsonType> = {};
  for (const [key, value] of Object.entries(properties)) {
    if (value !== undefined) {
      sanitized[key] = value as JsonType;
    }
  }
  return Object.keys(sanitized).length > 0 ? sanitized : undefined;
}

/**
 * Track an analytics event.
 * Safe to call even if analytics is not initialized - will be a no-op.
 *
 * @param event - The event name from AnalyticsEvent enum
 * @param properties - Optional event properties (no PII allowed)
 */
export function trackEvent(
  event: AnalyticsEvent | string,
  properties?: EventProperties
): void {
  if (!posthogClient || isOptedOut) {
    if (__DEV__ && !isOptedOut) {
      console.log(`[Analytics] Would track: ${event}`, properties);
    }
    return;
  }

  try {
    posthogClient.capture(event, sanitizeProperties(properties));

    if (__DEV__) {
      console.log(`[Analytics] Tracked: ${event}`, properties);
    }
  } catch (error) {
    if (__DEV__) {
      console.error('[Analytics] Failed to track event:', error);
    }
  }
}

/**
 * Track a screen view.
 * Use this in navigation event handlers.
 *
 * @param screenName - The name of the screen being viewed
 * @param properties - Optional additional properties
 */
export function trackScreenView(
  screenName: string,
  properties?: EventProperties
): void {
  if (!posthogClient || isOptedOut) {
    if (__DEV__ && !isOptedOut) {
      console.log(`[Analytics] Would track screen: ${screenName}`, properties);
    }
    return;
  }

  try {
    posthogClient.screen(screenName, sanitizeProperties(properties));

    if (__DEV__) {
      console.log(`[Analytics] Screen view: ${screenName}`, properties);
    }
  } catch (error) {
    if (__DEV__) {
      console.error('[Analytics] Failed to track screen view:', error);
    }
  }
}

/**
 * Set user opt-out preference.
 * When opted out, no events will be tracked.
 *
 * @param optOut - true to opt out, false to opt in
 */
export async function setAnalyticsOptOut(optOut: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(ANALYTICS_OPT_OUT_KEY, optOut.toString());
    isOptedOut = optOut;

    if (optOut && posthogClient) {
      // Flush any pending events before disabling
      await posthogClient.flush();
      // Reset the client to clear any stored data
      posthogClient.reset();
    }

    if (__DEV__) {
      console.log(`[Analytics] Opt-out set to: ${optOut}`);
    }
  } catch (error) {
    if (__DEV__) {
      console.error('[Analytics] Failed to set opt-out preference:', error);
    }
  }
}

/**
 * Get current opt-out status.
 *
 * @returns true if user has opted out of analytics
 */
export function isAnalyticsOptedOut(): boolean {
  return isOptedOut;
}

/**
 * Flush any pending analytics events.
 * Call this before the app is closed or backgrounded.
 */
export async function flushAnalytics(): Promise<void> {
  if (!posthogClient || isOptedOut) {
    return;
  }

  try {
    await posthogClient.flush();
  } catch (error) {
    if (__DEV__) {
      console.error('[Analytics] Failed to flush events:', error);
    }
  }
}

/**
 * Reset analytics state (for account deletion/logout).
 * This generates a new anonymous ID and clears any stored analytics data.
 */
export async function resetAnalytics(): Promise<void> {
  if (posthogClient) {
    posthogClient.reset();
  }

  try {
    // Generate new anonymous ID
    const newId = Crypto.randomUUID();
    await AsyncStorage.setItem(ANONYMOUS_ID_KEY, newId);

    if (posthogClient && !isOptedOut) {
      posthogClient.identify(newId);
    }

    if (__DEV__) {
      console.log('[Analytics] Reset with new anonymous ID');
    }
  } catch (error) {
    if (__DEV__) {
      console.error('[Analytics] Failed to reset:', error);
    }
  }
}

/**
 * Shutdown analytics client.
 * Call this when the app is terminating.
 */
export async function shutdownAnalytics(): Promise<void> {
  if (!posthogClient) {
    return;
  }

  try {
    await posthogClient.flush();
    await posthogClient.shutdown();
    posthogClient = null;
    isInitialized = false;

    if (__DEV__) {
      console.log('[Analytics] Shutdown complete');
    }
  } catch (error) {
    if (__DEV__) {
      console.error('[Analytics] Failed to shutdown:', error);
    }
  }
}

// Export for testing purposes
export { posthogClient as _posthogClient };
