/**
 * Shared Environment Variable Validation for Edge Functions
 *
 * This module provides fail-fast validation for required environment variables.
 * Import and call at the top of each Edge Function to get clear error messages
 * when configuration is missing.
 */

export interface EnvConfig {
  supabaseUrl: string
  supabaseServiceRoleKey: string
}

/**
 * Validate required Supabase environment variables.
 * Throws a descriptive error if any are missing.
 *
 * @returns Validated environment configuration
 * @throws Error if required environment variables are missing
 */
export function validateSupabaseEnv(): EnvConfig {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  const missing: string[] = []

  if (!supabaseUrl) {
    missing.push('SUPABASE_URL')
  }
  if (!supabaseServiceRoleKey) {
    missing.push('SUPABASE_SERVICE_ROLE_KEY')
  }

  if (missing.length > 0) {
    throw new Error(
      '[Edge Function Config Error] Missing required environment variables: ' + missing.join(', ') + '. ' +
      'Please configure these in your Supabase project settings under Edge Functions > Secrets.'
    )
  }

  return { supabaseUrl, supabaseServiceRoleKey }
}

/**
 * Validate optional Vision API key for image moderation.
 *
 * @returns The Vision API key
 * @throws Error if GOOGLE_CLOUD_VISION_API_KEY is not set
 */
export function validateVisionApiKey(): string {
  const visionApiKey = Deno.env.get('GOOGLE_CLOUD_VISION_API_KEY')

  if (!visionApiKey) {
    throw new Error(
      '[Edge Function Config Error] Missing GOOGLE_CLOUD_VISION_API_KEY. ' +
      'Please configure this in your Supabase project settings under Edge Functions > Secrets.'
    )
  }

  return visionApiKey
}
