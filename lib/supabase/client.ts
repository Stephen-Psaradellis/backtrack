import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '../../types/database'
import { shouldUseMockSupabase, shouldUseMockExpoSupabase, isProductionMode } from '../dev'
import { getSharedMockClient } from '../dev/shared-mock-client'

// Singleton browser client instance for web
let browserClientInstance: ReturnType<typeof createBrowserClient<Database>> | null = null

/**
 * Creates a Supabase client for browser/client-side use
 *
 * In development mode with missing credentials, returns the shared mock client
 * to ensure consistent auth state across all parts of the app.
 *
 * In production, always uses the real Supabase client and throws
 * an error if credentials are missing.
 */
export function createClient() {
  // In Expo/React Native environment, use shared mock client
  if (shouldUseMockExpoSupabase()) {
    return getSharedMockClient()
  }

  // Use shared mock client in web development when credentials are missing
  if (shouldUseMockSupabase()) {
    return getSharedMockClient()
  }

  // Return existing browser singleton if available
  if (browserClientInstance) {
    return browserClientInstance
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

  // Enforce credentials in production
  if (isProductionMode()) {
    if (!supabaseUrl) {
      throw new Error(
        'Missing NEXT_PUBLIC_SUPABASE_URL environment variable. ' +
        'This is required in production. Please set it in your environment.'
      )
    }
    if (!supabaseAnonKey) {
      throw new Error(
        'Missing NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY environment variable. ' +
        'This is required in production. Please set it in your environment.'
      )
    }
  }

  // Create and cache the real Supabase client when credentials are available
  browserClientInstance = createBrowserClient<Database>(
    supabaseUrl!,
    supabaseAnonKey!
  )
  return browserClientInstance
}
