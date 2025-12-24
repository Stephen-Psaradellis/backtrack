import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { shouldUseMockSupabase, isProductionMode } from '@/lib/dev'
import { createTypedDevSupabaseClient } from '@/lib/dev/mock-supabase'

/**
 * Creates a Supabase client for server-side use
 *
 * In development mode with missing credentials, returns a mock client
 * that allows the app to run without a real Supabase connection.
 *
 * In production, always uses the real Supabase client and throws
 * an error if credentials are missing.
 */
export async function createClient() {
  // In development mode without credentials, use mock client
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

  const cookieStore = await cookies()

  return createServerClient(
    supabaseUrl!,
    supabaseAnonKey!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        }
      }
    }
  )
}
