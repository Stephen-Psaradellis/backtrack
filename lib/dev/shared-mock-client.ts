/**
 * Shared Mock Supabase Client Singleton
 * 
 * This module provides a single shared mock Supabase client instance
 * that is used across the entire app in development mode.
 * 
 * This ensures consistent auth state regardless of which module
 * (lib/supabase.ts or lib/supabase/client.ts) imports the client.
 */

import { createTypedDevSupabaseClient } from './mock-supabase'
import type { SupabaseClient } from '@supabase/supabase-js'

// The single shared mock client instance
let sharedMockClientInstance: SupabaseClient | null = null

/**
 * Get or create the shared mock Supabase client singleton.
 *
 * This function ensures that all parts of the app share the same
 * mock client instance, which means they share the same auth state.
 *
 * By default, starts with a logged-in user for easier development/testing.
 */
export function getSharedMockClient(): SupabaseClient {
  if (!sharedMockClientInstance) {
    // Start logged in by default for development mode
    sharedMockClientInstance = createTypedDevSupabaseClient({ startLoggedIn: true })
  }
  return sharedMockClientInstance
}

/**
 * Reset the shared mock client (useful for testing)
 */
export function resetSharedMockClient(): void {
  sharedMockClientInstance = null
}
