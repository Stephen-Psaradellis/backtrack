/**
 * Social Authentication Hook
 *
 * Provides Apple and Google sign-in functionality using Supabase Auth.
 * Handles OAuth flows via expo-apple-authentication and expo-auth-session.
 *
 * Features:
 * - Apple Sign In (iOS 13+)
 * - Google Sign In (iOS and Android)
 * - First-time user profile creation
 * - Loading states per provider
 * - Error handling with user-friendly messages
 *
 * Configuration Required:
 * - Supabase Dashboard: Enable Apple and Google auth providers
 * - Environment Variables:
 *   - EXPO_PUBLIC_GOOGLE_CLIENT_ID (Android)
 *   - EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID (iOS)
 *
 * Account Linking:
 * - Supabase automatically links social accounts by email
 * - For explicit account linking, use supabase.auth.linkIdentity() in future
 */

import { useState, useCallback, useMemo, Platform } from 'react'
// TODO: Re-enable after configuring Sign in with Apple capability in Apple Developer Portal
// import * as AppleAuthentication from 'expo-apple-authentication'
const AppleAuthentication = {
  signInAsync: async (_opts: any): Promise<any> => { throw new Error('Apple Sign In temporarily disabled') },
  AppleAuthenticationScope: { FULL_NAME: 0 as const, EMAIL: 1 as const },
} as any
import * as Google from 'expo-auth-session/providers/google'
import { makeRedirectUri } from 'expo-auth-session'
import { supabase } from '../lib/supabase'
import type { AuthError } from '@supabase/supabase-js'

// ============================================================================
// TYPES
// ============================================================================

export interface SocialAuthResult {
  success: boolean
  error: string | null
}

export interface UseSocialAuthReturn {
  signInWithApple: () => Promise<SocialAuthResult>
  signInWithGoogle: () => Promise<SocialAuthResult>
  isAppleAvailable: boolean
  isGoogleConfigured: boolean
  appleLoading: boolean
  googleLoading: boolean
}

// ============================================================================
// HOOK
// ============================================================================

/**
 * useSocialAuth Hook
 *
 * Provides social authentication methods for Apple and Google.
 * Automatically handles profile creation for first-time social users.
 *
 * @example
 * ```tsx
 * function AuthScreen() {
 *   const {
 *     signInWithApple,
 *     signInWithGoogle,
 *     isAppleAvailable,
 *     appleLoading,
 *     googleLoading
 *   } = useSocialAuth()
 *
 *   const handleAppleSignIn = async () => {
 *     const { success, error } = await signInWithApple()
 *     if (!success) {
 *       console.error('Apple sign in failed:', error)
 *     }
 *   }
 * }
 * ```
 */
export function useSocialAuth(): UseSocialAuthReturn {
  // ---------------------------------------------------------------------------
  // STATE
  // ---------------------------------------------------------------------------

  const [appleLoading, setAppleLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)

  // ---------------------------------------------------------------------------
  // GOOGLE AUTH SESSION
  // ---------------------------------------------------------------------------

  const googleClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID
  const isGoogleConfigured = !!googleClientId

  const [_request, response, promptAsync] = Google.useAuthRequest(
    isGoogleConfigured
      ? {
          androidClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID,
          iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
          redirectUri: makeRedirectUri({
            scheme: 'com.backtrack.app',
          }),
        }
      : // Provide a dummy config to avoid the invariant error when client IDs are missing
        { clientId: 'NOT_CONFIGURED' }
  )

  // ---------------------------------------------------------------------------
  // PLATFORM CHECKS
  // ---------------------------------------------------------------------------

  /**
   * Check if Apple Sign In is available
   * Only available on iOS 13+ devices
   */
  const isAppleAvailable = useMemo(() => {
    return Platform.OS === 'ios'
  }, [])

  // ---------------------------------------------------------------------------
  // HELPER FUNCTIONS
  // ---------------------------------------------------------------------------

  /**
   * Create profile for first-time social auth users
   * If profile doesn't exist after social sign-in, create one with provider data
   */
  const createProfileIfNeeded = useCallback(async (userId: string): Promise<void> => {
    // Check if profile already exists
    const { data: existingProfile, error: fetchError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .single()

    // If profile exists, we're done
    if (existingProfile && !fetchError) {
      return
    }

    // Get user metadata from auth
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return
    }

    // Extract display name from provider metadata
    let displayName = null
    if (user.user_metadata) {
      // Apple provides: full_name
      // Google provides: name
      displayName = user.user_metadata.full_name || user.user_metadata.name || null
    }

    // Create profile with data from provider
    await supabase.from('profiles').insert({
      id: userId,
      display_name: displayName,
      username: null, // User will set this during onboarding
    })
  }, [])

  /**
   * Map Supabase auth errors to user-friendly messages
   */
  const mapAuthError = useCallback((error: AuthError | Error): string => {
    const message = error.message.toLowerCase()

    if (message.includes('user cancelled') || message.includes('canceled')) {
      return 'Sign in was cancelled. Please try again.'
    }
    if (message.includes('network')) {
      return 'Network error. Please check your connection and try again.'
    }
    if (message.includes('invalid')) {
      return 'Authentication failed. Please try again.'
    }
    if (message.includes('configuration')) {
      return 'Social login is not properly configured. Please contact support.'
    }

    return 'An error occurred during sign in. Please try again.'
  }, [])

  // ---------------------------------------------------------------------------
  // APPLE SIGN IN
  // ---------------------------------------------------------------------------

  /**
   * Sign in with Apple
   *
   * Uses expo-apple-authentication to get identity token from Apple,
   * then exchanges it with Supabase for a session.
   *
   * @returns Result object with success status and error message
   */
  const signInWithApple = useCallback(async (): Promise<SocialAuthResult> => {
    if (!isAppleAvailable) {
      return {
        success: false,
        error: 'Apple Sign In is only available on iOS devices.',
      }
    }

    setAppleLoading(true)

    try {
      // Request Apple credentials
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      })

      // Exchange Apple identity token for Supabase session
      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: 'apple',
        token: credential.identityToken ?? '',
        nonce: credential.nonce,
      })

      if (error) {
        return {
          success: false,
          error: mapAuthError(error),
        }
      }

      // Create profile if this is first-time sign in
      if (data.user) {
        await createProfileIfNeeded(data.user.id)
      }

      return {
        success: true,
        error: null,
      }
    } catch (error) {
      // Handle Apple-specific errors
      if (error instanceof Error) {
        return {
          success: false,
          error: mapAuthError(error),
        }
      }

      return {
        success: false,
        error: 'An unexpected error occurred during Apple sign in.',
      }
    } finally {
      setAppleLoading(false)
    }
  }, [isAppleAvailable, createProfileIfNeeded, mapAuthError])

  // ---------------------------------------------------------------------------
  // GOOGLE SIGN IN
  // ---------------------------------------------------------------------------

  /**
   * Sign in with Google
   *
   * Uses expo-auth-session to initiate Google OAuth flow,
   * then exchanges the ID token with Supabase for a session.
   *
   * @returns Result object with success status and error message
   */
  const signInWithGoogle = useCallback(async (): Promise<SocialAuthResult> => {
    if (!isGoogleConfigured) {
      return { success: false, error: 'Google Sign In is not configured.' }
    }

    setGoogleLoading(true)

    try {
      // Prompt Google OAuth flow
      const result = await promptAsync()

      // User cancelled or error occurred
      if (result.type !== 'success') {
        setGoogleLoading(false)
        return {
          success: false,
          error: result.type === 'cancel'
            ? 'Sign in was cancelled. Please try again.'
            : 'Google sign in failed. Please try again.',
        }
      }

      // Extract ID token from authentication response
      const idToken = result.params.id_token
      if (!idToken) {
        setGoogleLoading(false)
        return {
          success: false,
          error: 'Failed to get authentication token from Google.',
        }
      }

      // Exchange Google ID token for Supabase session
      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: idToken,
      })

      if (error) {
        setGoogleLoading(false)
        return {
          success: false,
          error: mapAuthError(error),
        }
      }

      // Create profile if this is first-time sign in
      if (data.user) {
        await createProfileIfNeeded(data.user.id)
      }

      setGoogleLoading(false)
      return {
        success: true,
        error: null,
      }
    } catch (error) {
      setGoogleLoading(false)

      if (error instanceof Error) {
        return {
          success: false,
          error: mapAuthError(error),
        }
      }

      return {
        success: false,
        error: 'An unexpected error occurred during Google sign in.',
      }
    }
  }, [promptAsync, createProfileIfNeeded, mapAuthError, isGoogleConfigured])

  // ---------------------------------------------------------------------------
  // RETURN
  // ---------------------------------------------------------------------------

  return {
    signInWithApple,
    signInWithGoogle,
    isAppleAvailable,
    isGoogleConfigured,
    appleLoading,
    googleLoading,
  }
}
