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
 */
export function isDevMode(): boolean {
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
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
}

/**
 * Check if Supabase credentials are missing (Expo/React Native environment variables)
 * Checks for EXPO_PUBLIC_* variables used by the React Native application
 */
export function isMissingExpoSupabaseCredentials(): boolean {
  return (
    !process.env.EXPO_PUBLIC_SUPABASE_URL ||
    !process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
  )
}

/**
 * Check if Google Maps API key is missing
 */
export function isMissingGoogleMapsKey(): boolean {
  return !process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
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
 * Determine if any mock services are being used
 * Useful for displaying a dev mode banner
 */
export function isUsingMockServices(): boolean {
  return shouldUseMockSupabase() || shouldUseMockGoogleMaps()
}

/**
 * Get a summary of which mock services are active
 * Useful for logging and debugging
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
 * Log dev mode status (call once during app initialization)
 * Only logs in development mode to avoid polluting production logs
 */
export function logDevModeStatus(): void {
  if (!isDevMode()) return

  const summary = getMockServicesSummary()

  if (summary.mockSupabase || summary.mockGoogleMaps) {
    console.warn('[Dev Mode] Running with mock services:')
    if (summary.mockSupabase) {
      console.warn('  - Mock Supabase client (missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY)')
    }
    if (summary.mockGoogleMaps) {
      console.warn('  - Mock Google Maps (missing NEXT_PUBLIC_GOOGLE_MAPS_API_KEY)')
    }
  }
}
