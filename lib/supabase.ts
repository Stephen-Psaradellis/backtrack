/**
 * Supabase Client Configuration for React Native
 *
 * This file initializes the Supabase client with proper React Native settings:
 * - URL polyfill for Supabase compatibility
 * - SecureStore for secure session storage (auth tokens encrypted at rest)
 * - detectSessionInUrl: false (CRITICAL for React Native)
 *
 * SECURITY: Auth tokens are stored in expo-secure-store which provides:
 * - Encrypted storage at rest
 * - Protection on rooted/jailbroken devices
 * - Keychain (iOS) / Keystore (Android) integration
 *
 * In development mode with missing credentials, returns a mock client
 * that allows the app to run without a real Supabase connection.
 */

import 'react-native-url-polyfill/auto'
import * as SecureStore from 'expo-secure-store'
import { createClient } from '@supabase/supabase-js'
import { shouldUseMockExpoSupabase } from './dev'
import { getSharedMockClient } from './dev/shared-mock-client'

// ============================================================================
// SECURE STORAGE ADAPTER
// ============================================================================

/**
 * SecureStore adapter for Supabase auth storage
 *
 * Provides encrypted storage for auth tokens using the device's secure enclave.
 * Falls back gracefully if SecureStore is not available (e.g., web environment).
 */
const SecureStoreAdapter = {
  /**
   * Retrieve an item from SecureStore
   */
  getItem: async (key: string): Promise<string | null> => {
    try {
      return await SecureStore.getItemAsync(key)
    } catch (error) {
      // SecureStore may not be available in all environments (e.g., web)
      console.warn('SecureStore getItem failed:', error)
      return null
    }
  },

  /**
   * Store an item in SecureStore
   */
  setItem: async (key: string, value: string): Promise<void> => {
    try {
      await SecureStore.setItemAsync(key, value)
    } catch (error) {
      // SecureStore may not be available in all environments (e.g., web)
      console.warn('SecureStore setItem failed:', error)
    }
  },

  /**
   * Remove an item from SecureStore
   */
  removeItem: async (key: string): Promise<void> => {
    try {
      await SecureStore.deleteItemAsync(key)
    } catch (error) {
      // SecureStore may not be available in all environments (e.g., web)
      console.warn('SecureStore removeItem failed:', error)
    }
  },
}

// Environment variables for Supabase configuration
// These must be set in .env file with EXPO_PUBLIC_ prefix for Expo to expose them
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY

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
 * - storage: SecureStoreAdapter - SECURE encrypted storage using device keychain/keystore
 * - autoRefreshToken: true - Automatically refresh auth tokens before expiry
 * - persistSession: true - Persist session to SecureStore (encrypted)
 * - detectSessionInUrl: false - CRITICAL: Must be false for React Native
 *   (prevents attempts to parse URL for OAuth callbacks which doesn't work in RN)
 *
 * SECURITY: Tokens are now stored encrypted in the device's secure enclave,
 * protecting against extraction on rooted/jailbroken devices.
 */
function createSupabaseClient() {
  // Use mock client in development when credentials are missing
  if (shouldUseMockExpoSupabase()) {
    return getSharedMockClient()
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
      'Missing EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY environment variable. ' +
      'Please ensure it is set in your .env file.'
    )
  }

  // Use real Supabase client when credentials are available
  // SECURITY: Using SecureStore for encrypted token storage
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      storage: SecureStoreAdapter,
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

// ============================================================================
// POST SORTING - 30-DAY DEPRIORITIZATION
// ============================================================================

/**
 * Number of days after which a post should be deprioritized in sorting
 */
const DEPRIORITIZE_AFTER_DAYS = 30

/**
 * Milliseconds in one day
 */
const MS_PER_DAY = 24 * 60 * 60 * 1000

/**
 * Interface for posts that support deprioritization sorting
 * Posts must have created_at and optional sighting_date/time_granularity
 */
export interface DeprioritizablePost {
  /** Post ID */
  id: string
  /** When the post was created */
  created_at: string
  /** Optional date when the sighting occurred */
  sighting_date?: string | null
  /** Time granularity for the sighting ('specific', 'morning', 'afternoon', 'evening') */
  time_granularity?: string | null
}

/**
 * Calculate the sort priority timestamp for a post
 *
 * Implements 30-day deprioritization logic:
 * - Posts with sighting_date within 30 days: use sighting_date as priority
 * - Posts with sighting_date older than 30 days: heavily deprioritize (subtract 60 days from created_at)
 * - Posts without sighting_date: use created_at as priority
 *
 * This aligns with the SQL pattern:
 * ```sql
 * CASE
 *   WHEN sighting_date IS NULL THEN created_at
 *   WHEN sighting_date > now() - interval '30 days' THEN sighting_date
 *   ELSE created_at - interval '60 days' -- Penalize old posts
 * END
 * ```
 *
 * @param post - Post to calculate priority for
 * @param referenceDate - Optional reference date (defaults to now)
 * @returns Priority timestamp in milliseconds (higher = more recent = higher priority)
 *
 * @example
 * ```tsx
 * import { getPostSortPriority } from 'lib/supabase'
 *
 * const priority = getPostSortPriority(post)
 * // Recent sighting: returns sighting_date timestamp
 * // Old sighting: returns created_at - 60 days (deprioritized)
 * // No sighting: returns created_at timestamp
 * ```
 */
export function getPostSortPriority(
  post: DeprioritizablePost,
  referenceDate: Date = new Date()
): number {
  const createdAt = new Date(post.created_at).getTime()
  const now = referenceDate.getTime()
  const thirtyDaysAgo = now - (DEPRIORITIZE_AFTER_DAYS * MS_PER_DAY)

  // If no sighting_date, use created_at
  if (!post.sighting_date) {
    return createdAt
  }

  const sightingDate = new Date(post.sighting_date).getTime()

  // If sighting_date is within 30 days, use it as priority
  if (sightingDate >= thirtyDaysAgo) {
    return sightingDate
  }

  // If sighting_date is older than 30 days, deprioritize by subtracting 60 days from created_at
  const sixtyDaysPenalty = 60 * MS_PER_DAY
  return createdAt - sixtyDaysPenalty
}

/**
 * Sort posts with 30-day deprioritization
 *
 * Posts are sorted by their calculated priority:
 * - Recent sightings (within 30 days) appear first, sorted by sighting_date
 * - Posts without sighting_date appear in their natural created_at order
 * - Old sightings (>30 days) are pushed to the bottom
 *
 * @param posts - Array of posts to sort
 * @param ascending - Sort in ascending order (oldest first) if true, descending (newest first) if false
 * @param referenceDate - Optional reference date for deprioritization calculation
 * @returns New array of posts sorted by priority
 *
 * @example
 * ```tsx
 * import { sortPostsWithDeprioritization } from 'lib/supabase'
 *
 * // After fetching posts from Supabase
 * const { data: posts } = await supabase.from('posts').select('*')
 *
 * // Apply 30-day deprioritization sorting
 * const sortedPosts = sortPostsWithDeprioritization(posts)
 * ```
 */
export function sortPostsWithDeprioritization<T extends DeprioritizablePost>(
  posts: T[],
  ascending: boolean = false,
  referenceDate: Date = new Date()
): T[] {
  return [...posts].sort((a, b) => {
    const priorityA = getPostSortPriority(a, referenceDate)
    const priorityB = getPostSortPriority(b, referenceDate)

    // For descending (newest first), higher priority comes first
    // For ascending (oldest first), lower priority comes first
    return ascending ? priorityA - priorityB : priorityB - priorityA
  })
}

/**
 * Check if a post should be deprioritized based on its sighting_date
 *
 * A post is deprioritized if:
 * - It has a sighting_date that is older than 30 days
 *
 * Posts without sighting_date are NOT deprioritized (they use created_at ordering).
 *
 * @param post - Post to check
 * @param referenceDate - Optional reference date (defaults to now)
 * @returns true if the post should be deprioritized
 *
 * @example
 * ```tsx
 * import { isPostDeprioritized } from 'lib/supabase'
 *
 * if (isPostDeprioritized(post)) {
 *   // Show visual indicator that this is an older sighting
 * }
 * ```
 */
export function isPostDeprioritized(
  post: DeprioritizablePost,
  referenceDate: Date = new Date()
): boolean {
  // Posts without sighting_date are not deprioritized
  if (!post.sighting_date) {
    return false
  }

  const sightingDate = new Date(post.sighting_date).getTime()
  const now = referenceDate.getTime()
  const thirtyDaysAgo = now - (DEPRIORITIZE_AFTER_DAYS * MS_PER_DAY)

  return sightingDate < thirtyDaysAgo
}
