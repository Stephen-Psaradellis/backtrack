/**
 * Supabase Client Configuration for React Native
 *
 * This file initializes the Supabase client with proper React Native settings:
 * - URL polyfill for Supabase compatibility
 * - AsyncStorage for persistent session storage
 * - detectSessionInUrl: false (CRITICAL for React Native)
 *
 * In development mode with missing credentials, returns a mock client
 * that allows the app to run without a real Supabase connection.
 */

import 'react-native-url-polyfill/auto'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient } from '@supabase/supabase-js'
import { shouldUseMockExpoSupabase } from './dev'
import { createTypedDevSupabaseClient } from './dev/mock-supabase'

// Environment variables for Supabase configuration
// These must be set in .env file with EXPO_PUBLIC_ prefix for Expo to expose them
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY

/**
 * Mock Supabase URL for development mode
 * Used when real credentials are not available
 */
const MOCK_SUPABASE_URL = 'https://mock.supabase.co'

/**
 * Supabase client instance configured for React Native
 *
 * In development mode with missing credentials, returns a mock client
 * that allows the app to run without a real Supabase connection.
 *
 * Configuration notes for real client:
 * - storage: AsyncStorage - Required for session persistence in React Native
 * - autoRefreshToken: true - Automatically refresh auth tokens before expiry
 * - persistSession: true - Persist session to AsyncStorage
 * - detectSessionInUrl: false - CRITICAL: Must be false for React Native
 *   (prevents attempts to parse URL for OAuth callbacks which doesn't work in RN)
 */
function createSupabaseClient() {
  // Use mock client in development when credentials are missing
  if (shouldUseMockExpoSupabase()) {
    return createTypedDevSupabaseClient()
  }

  // Validate environment variables for real client
  if (!supabaseUrl) {
    throw new Error(
      'Missing EXPO_PUBLIC_SUPABASE_URL environment variable. ' +
      'Please ensure it is set in your .env file.'
    )
  }

  if (!supabaseAnonKey) {
    throw new Error(
      'Missing EXPO_PUBLIC_SUPABASE_ANON_KEY environment variable. ' +
      'Please ensure it is set in your .env file.'
    )
  }

  // Use real Supabase client when credentials are available
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  })
}

export const supabase = createSupabaseClient()

/**
 * Export the Supabase URL for use in other parts of the app
 * (e.g., constructing storage URLs)
 *
 * Returns the real URL if available, otherwise returns a mock URL
 * for development mode compatibility.
 */
export const exportedSupabaseUrl = supabaseUrl || MOCK_SUPABASE_URL

/**
 * @deprecated Use exportedSupabaseUrl instead. This export is kept for backward compatibility.
 */
export { exportedSupabaseUrl as supabaseUrl }

// ============================================================================
// PUSH TOKEN MANAGEMENT
// ============================================================================

/**
 * Device information to store with push token
 */
export interface PushTokenDeviceInfo {
  /** Device brand (e.g., 'Apple', 'Samsung') */
  brand?: string | null
  /** Device model name */
  modelName?: string | null
  /** OS name ('ios' or 'android') */
  osName?: string | null
  /** OS version string */
  osVersion?: string | null
  /** Device type identifier */
  deviceType?: number | null
}

/**
 * Result from push token operations
 */
export interface PushTokenResult {
  /** Whether the operation was successful */
  success: boolean
  /** Error message if operation failed */
  error: string | null
}

/**
 * Save or update a push token for the authenticated user
 *
 * Uses the upsert_push_token RPC function to handle both insert and update
 * cases. If the token already exists for this user, it updates the device info.
 * If the token exists for a different user, it moves ownership to the current user.
 *
 * @param token - The Expo push token to register
 * @param deviceInfo - Optional device information to store with the token
 * @returns Result indicating success or failure
 *
 * @example
 * ```tsx
 * import { savePushToken } from 'lib/supabase'
 *
 * const result = await savePushToken('ExponentPushToken[xxxx]', {
 *   brand: 'Apple',
 *   modelName: 'iPhone 14',
 *   osName: 'iOS',
 *   osVersion: '17.0',
 * })
 *
 * if (result.success) {
 *   console.log('Push token saved successfully')
 * }
 * ```
 */
export async function savePushToken(
  token: string,
  deviceInfo?: PushTokenDeviceInfo
): Promise<PushTokenResult> {
  try {
    // Get current user session
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError) {
      return {
        success: false,
        error: `Authentication error: ${authError.message}`,
      }
    }

    if (!user) {
      return {
        success: false,
        error: 'User must be authenticated to register push token.',
      }
    }

    // Validate token
    if (!token || typeof token !== 'string' || token.trim() === '') {
      return {
        success: false,
        error: 'Invalid push token provided.',
      }
    }

    // Call the upsert_push_token RPC function
    const { error: rpcError } = await supabase.rpc('upsert_push_token', {
      p_user_id: user.id,
      p_token: token.trim(),
      p_device_info: deviceInfo || null,
    })

    if (rpcError) {
      return {
        success: false,
        error: `Failed to save push token: ${rpcError.message}`,
      }
    }

    return {
      success: true,
      error: null,
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'An unexpected error occurred'
    return {
      success: false,
      error: `Failed to save push token: ${message}`,
    }
  }
}

/**
 * Remove a push token from the database
 *
 * Should be called when:
 * - User logs out
 * - User disables notifications
 * - Token becomes invalid
 *
 * @param token - The Expo push token to remove
 * @returns Result indicating success or failure
 *
 * @example
 * ```tsx
 * import { removePushToken } from 'lib/supabase'
 *
 * const result = await removePushToken('ExponentPushToken[xxxx]')
 * if (result.success) {
 *   console.log('Push token removed successfully')
 * }
 * ```
 */
export async function removePushToken(token: string): Promise<PushTokenResult> {
  try {
    if (!token || typeof token !== 'string' || token.trim() === '') {
      return {
        success: false,
        error: 'Invalid push token provided.',
      }
    }

    const { error } = await supabase
      .from('expo_push_tokens')
      .delete()
      .eq('token', token.trim())

    if (error) {
      return {
        success: false,
        error: `Failed to remove push token: ${error.message}`,
      }
    }

    return {
      success: true,
      error: null,
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'An unexpected error occurred'
    return {
      success: false,
      error: `Failed to remove push token: ${message}`,
    }
  }
}

/**
 * Remove all push tokens for the current authenticated user
 *
 * Useful for logout to stop receiving notifications on all devices.
 *
 * @returns Result indicating success or failure
 *
 * @example
 * ```tsx
 * import { removeAllUserPushTokens } from 'lib/supabase'
 *
 * // On logout
 * await removeAllUserPushTokens()
 * ```
 */
export async function removeAllUserPushTokens(): Promise<PushTokenResult> {
  try {
    // Get current user session
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError) {
      return {
        success: false,
        error: `Authentication error: ${authError.message}`,
      }
    }

    if (!user) {
      return {
        success: false,
        error: 'User must be authenticated to remove push tokens.',
      }
    }

    const { error } = await supabase
      .from('expo_push_tokens')
      .delete()
      .eq('user_id', user.id)

    if (error) {
      return {
        success: false,
        error: `Failed to remove push tokens: ${error.message}`,
      }
    }

    return {
      success: true,
      error: null,
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'An unexpected error occurred'
    return {
      success: false,
      error: `Failed to remove push tokens: ${message}`,
    }
  }
}
