/**
 * useConnectSocial (Feature 5.6)
 *
 * Drives the OAuth flow for verifying a social account:
 *   1. Posts to oauth-social-start to get an authorization URL
 *   2. Opens it in an in-app browser via expo-web-browser
 *   3. Posts the resulting { code, state } to oauth-social-callback
 *   4. Caller refetches useVerifiedSocials
 *
 * The redirect URI must match supabase app_configuration.social_oauth_redirect_uri
 * AND be registered with each provider. Default expectation is the app
 * scheme: `backtrack://oauth/social-callback`.
 */

import { useCallback, useState } from 'react'
import * as WebBrowser from 'expo-web-browser'
import * as Linking from 'expo-linking'

import { supabase } from '../lib/supabase'
import type { SocialPlatform } from '../lib/socialPlatforms'

export interface ConnectResult {
    success: boolean
    handle?: string
    error?: string
}

export interface UseConnectSocialResult {
    connect: (platform: SocialPlatform) => Promise<ConnectResult>
    isConnecting: boolean
}

const REDIRECT_PATH = 'oauth/social-callback'

export function useConnectSocial(): UseConnectSocialResult {
    const [isConnecting, setIsConnecting] = useState(false)

    const connect = useCallback(async (platform: SocialPlatform): Promise<ConnectResult> => {
        setIsConnecting(true)
        try {
            const redirectUri = Linking.createURL(REDIRECT_PATH)

            const startResp = await supabase.functions.invoke<{ authUrl: string; state: string }>(
                'oauth-social-start',
                { body: { platform } },
            )
            if (startResp.error || !startResp.data?.authUrl) {
                return { success: false, error: startResp.error?.message ?? 'failed to start OAuth' }
            }

            const sessionResult = await WebBrowser.openAuthSessionAsync(
                startResp.data.authUrl,
                redirectUri,
            )

            if (sessionResult.type !== 'success' || !sessionResult.url) {
                return { success: false, error: 'OAuth flow cancelled' }
            }

            const parsed = Linking.parse(sessionResult.url)
            const code = (parsed.queryParams?.code as string | undefined) ?? null
            const state = (parsed.queryParams?.state as string | undefined) ?? null
            const providerError = (parsed.queryParams?.error as string | undefined) ?? null

            if (providerError) return { success: false, error: providerError }
            if (!code || !state) return { success: false, error: 'missing code/state from provider' }

            const callbackResp = await supabase.functions.invoke<{ success: boolean; handle: string }>(
                'oauth-social-callback',
                { body: { platform, code, state } },
            )
            if (callbackResp.error || !callbackResp.data?.success) {
                return { success: false, error: callbackResp.error?.message ?? 'callback failed' }
            }

            return { success: true, handle: callbackResp.data.handle }
        } finally {
            setIsConnecting(false)
        }
    }, [])

    return { connect, isConnecting }
}

export default useConnectSocial
