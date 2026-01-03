/**
 * Development Mode Detection Utilities
 *
 * This module provides utilities for detecting development mode and
 * determining when mock services should be used in place of real APIs.
 *
 * Key behaviors:
 * - In development mode: Allow running without credentials, use mocks
 * - In production mode: Require all credentials, throw errors if missing
 */

/**
 * Check if the application is running in development mode
 * Uses __DEV__ for React Native/Expo, falls back to process.env.NODE_ENV for Next.js
 */
export function isDevMode(): boolean {
  // In React Native/Expo, __DEV__ is the standard way to check dev mode
  if (typeof __DEV__ !== 'undefined') {
    return __DEV__
  }
  // Fallback for Next.js and other environments
  return process.env.NODE_ENV === 'development'
}

/**
 * Check if the application is running in production mode
 */
export function isProductionMode(): boolean {
  return process.env.NODE_ENV === 'production'
}

/**
 * Check if Supabase credentials are missing (Next.js environment variables)
 * Checks for NEXT_PUBLIC_* variables used by the Next.js application
 */
export function isMissingSupabaseCredentials(): boolean {
  return (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  )
}

/**
 * Check if Supabase credentials are missing (Expo/React Native environment variables)
 * Checks for EXPO_PUBLIC_* variables used by the React Native application
 */
export function isMissingExpoSupabaseCredentials(): boolean {
  return (
    !process.env.EXPO_PUBLIC_SUPABASE_URL ||
    !process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  )
}

/**
 * Check if Google Maps API key is missing
 */
export function isMissingGoogleMapsKey(): boolean {
  return !process.env.NEXT_PUBLIC_GCP_MAPS_API_KEY
}

/**
 * Determine if mock Supabase client should be used (Next.js)
 *
 * Returns true when:
 * - Running in development mode AND
 * - Supabase credentials are missing
 *
 * In production, this always returns false (credentials are required)
 */
export function shouldUseMockSupabase(): boolean {
  return isDevMode() && isMissingSupabaseCredentials()
}

/**
 * Determine if mock Supabase client should be used (Expo/React Native)
 *
 * Returns true when:
 * - Running in development mode AND
 * - Expo Supabase credentials are missing
 *
 * In production, this always returns false (credentials are required)
 */
export function shouldUseMockExpoSupabase(): boolean {
  return isDevMode() && isMissingExpoSupabaseCredentials()
}

/**
 * Determine if mock Google Maps should be used
 *
 * Returns true when:
 * - Running in development mode AND
 * - Google Maps API key is missing
 *
 * In production, this always returns false (API key is required)
 */
export function shouldUseMockGoogleMaps(): boolean {
  return isDevMode() && isMissingGoogleMapsKey()
}

/**
 * Determine if any mock services are being used (Next.js)
 * Useful for displaying a dev mode banner in the web app
 */
export function isUsingMockServices(): boolean {
  return shouldUseMockSupabase() || shouldUseMockGoogleMaps()
}

/**
 * Determine if any mock services are being used (Expo/React Native)
 * Useful for displaying a dev mode banner in the mobile app
 */
export function isUsingExpoMockServices(): boolean {
  return shouldUseMockExpoSupabase()
}

/**
 * Get a summary of which mock services are active (Next.js)
 * Useful for logging and debugging in the web app
 */
export function getMockServicesSummary(): {
  devMode: boolean
  mockSupabase: boolean
  mockGoogleMaps: boolean
} {
  return {
    devMode: isDevMode(),
    mockSupabase: shouldUseMockSupabase(),
    mockGoogleMaps: shouldUseMockGoogleMaps(),
  }
}

/**
 * Get a summary of which mock services are active (Expo/React Native)
 * Useful for logging and debugging in the mobile app
 */
export function getExpoMockServicesSummary(): {
  devMode: boolean
  mockExpoSupabase: boolean
} {
  return {
    devMode: isDevMode(),
    mockExpoSupabase: shouldUseMockExpoSupabase(),
  }
}

/**
 * Log dev mode status for Next.js (call once during app initialization)
 * Only logs in development mode to avoid polluting production logs
 */
export function logDevModeStatus(): void {
  if (!isDevMode()) return

  const summary = getMockServicesSummary()

  if (summary.mockSupabase || summary.mockGoogleMaps) {
    console.warn('[Dev Mode] Running with mock services:')
    if (summary.mockSupabase) {
      console.warn('  - Mock Supabase client (missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)')
    }
    if (summary.mockGoogleMaps) {
      console.warn('  - Mock Google Maps (missing NEXT_PUBLIC_GCP_MAPS_API_KEY)')
    }
  }
}

/**
 * Log dev mode status for Expo/React Native (call once during app initialization)
 * Only logs in development mode to avoid polluting production logs
 */
export function logExpoDevModeStatus(): void {
  if (!isDevMode()) return

  const summary = getExpoMockServicesSummary()

  if (summary.mockExpoSupabase) {
    console.warn('[Dev Mode] Running with mock services:')
    console.warn('  - Mock Supabase client (missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY)')
  }
}
