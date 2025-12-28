/**
 * Eventbrite OAuth Callback Route
 *
 * Handles the OAuth callback from Eventbrite after user authorization.
 * Exchanges the authorization code for access tokens and stores them
 * securely in the user_event_tokens table.
 *
 * Flow:
 * 1. User clicks "Connect Eventbrite" and is redirected to Eventbrite
 * 2. User authorizes the app on Eventbrite
 * 3. Eventbrite redirects back to this route with an authorization code
 * 4. This route exchanges the code for tokens and stores them
 * 5. User is redirected back to the app
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  exchangeCodeForTokens,
  shouldUseMockEventbrite,
  EventbriteApiError,
} from '@/lib/api/eventbrite'

// Default redirect paths
const SUCCESS_REDIRECT = '/events?connected=eventbrite'
const ERROR_REDIRECT = '/events?error=eventbrite_auth_failed'
const LOGIN_REDIRECT = '/login?redirect=/events'

/**
 * GET /api/auth/eventbrite
 *
 * Handles the OAuth callback from Eventbrite.
 *
 * Query Parameters:
 * - code: Authorization code from Eventbrite
 * - state: Optional state parameter for CSRF protection
 * - error: Error code if authorization was denied
 * - error_description: Human-readable error description
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')
  const errorDescription = searchParams.get('error_description')

  // Get the base URL for redirects
  const baseUrl = new URL(request.url).origin

  // Handle error response from Eventbrite
  if (error) {
    const redirectUrl = new URL(ERROR_REDIRECT, baseUrl)
    redirectUrl.searchParams.set('error_code', error)
    if (errorDescription) {
      redirectUrl.searchParams.set('error_description', errorDescription)
    }
    return NextResponse.redirect(redirectUrl)
  }

  // Validate authorization code is present
  if (!code) {
    const redirectUrl = new URL(ERROR_REDIRECT, baseUrl)
    redirectUrl.searchParams.set('error_code', 'missing_code')
    redirectUrl.searchParams.set('error_description', 'No authorization code provided')
    return NextResponse.redirect(redirectUrl)
  }

  try {
    // Create Supabase client for server-side operations
    const supabase = await createClient()

    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      // User needs to log in first
      const redirectUrl = new URL(LOGIN_REDIRECT, baseUrl)
      // Store state for after login if provided
      if (state) {
        redirectUrl.searchParams.set('state', state)
      }
      return NextResponse.redirect(redirectUrl)
    }

    // Exchange authorization code for tokens
    const tokens = await exchangeCodeForTokens(code)

    // Store tokens in the database
    // Use upsert to handle reconnection (user may already have tokens)
    const { error: upsertError } = await supabase
      .from('user_event_tokens')
      .upsert(
        {
          user_id: user.id,
          provider: 'eventbrite',
          access_token: tokens.accessToken,
          refresh_token: tokens.refreshToken || null,
          expires_at: tokens.expiresAt?.toISOString() || null,
        },
        {
          onConflict: 'user_id,provider',
        }
      )

    if (upsertError) {
      throw new Error(`Failed to store tokens: ${upsertError.message}`)
    }

    // Redirect to success page
    const redirectUrl = new URL(SUCCESS_REDIRECT, baseUrl)
    // Include state if it was provided (for CSRF validation on client)
    if (state) {
      redirectUrl.searchParams.set('state', state)
    }
    return NextResponse.redirect(redirectUrl)
  } catch (err) {
    // Handle specific Eventbrite API errors
    if (err instanceof EventbriteApiError) {
      const redirectUrl = new URL(ERROR_REDIRECT, baseUrl)
      redirectUrl.searchParams.set('error_code', err.errorCode)
      redirectUrl.searchParams.set('error_description', err.message)
      return NextResponse.redirect(redirectUrl)
    }

    // Handle generic errors
    const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
    const redirectUrl = new URL(ERROR_REDIRECT, baseUrl)
    redirectUrl.searchParams.set('error_code', 'exchange_failed')
    redirectUrl.searchParams.set('error_description', errorMessage)
    return NextResponse.redirect(redirectUrl)
  }
}
