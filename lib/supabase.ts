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
