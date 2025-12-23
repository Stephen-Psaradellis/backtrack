/**
 * Supabase Client Configuration for React Native
 *
 * This file initializes the Supabase client with proper React Native settings:
 * - URL polyfill for Supabase compatibility
 * - AsyncStorage for persistent session storage
 * - detectSessionInUrl: false (CRITICAL for React Native)
 */

import 'react-native-url-polyfill/auto'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient } from '@supabase/supabase-js'

// Environment variables for Supabase configuration
// These must be set in .env file with EXPO_PUBLIC_ prefix for Expo to expose them
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY

// Validate environment variables
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

/**
 * Supabase client instance configured for React Native
 *
 * Configuration notes:
 * - storage: AsyncStorage - Required for session persistence in React Native
 * - autoRefreshToken: true - Automatically refresh auth tokens before expiry
 * - persistSession: true - Persist session to AsyncStorage
 * - detectSessionInUrl: false - CRITICAL: Must be false for React Native
 *   (prevents attempts to parse URL for OAuth callbacks which doesn't work in RN)
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})

/**
 * Export the Supabase URL for use in other parts of the app
 * (e.g., constructing storage URLs)
 */
export { supabaseUrl }
