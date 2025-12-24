import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '../../types/database'
import { shouldUseMockSupabase, isProductionMode } from '../dev'
import { createTypedDevSupabaseClient } from '../dev/mock-supabase'

/**
 * Creates a Supabase client for browser/client-side use
 *
 * In development mode with missing credentials, returns a mock client
 * that allows the app to run without a real Supabase connection.
 *
 * In production, always uses the real Supabase client and throws
 * an error if credentials are missing.
 */
export function createClient() {
  // Use mock client in development when credentials are missing
  if (shouldUseMockSupabase()) {
    return createTypedDevSupabaseClient()
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

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
        'Missing NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable. ' +
        'This is required in production. Please set it in your environment.'
      )
    }
  }

  // Use real Supabase client when credentials are available
  return createBrowserClient<Database>(
    supabaseUrl!,
    supabaseAnonKey!
  )
}