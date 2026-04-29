// ============================================================================
// OAuth Social Callback (Feature 5.6)
// ============================================================================
// Authenticated client posts { platform, code, state } after the OAuth
// provider redirects back. The server:
//   1. Verifies the signed state (binds the request to the original user_id
//      and recovers the PKCE code_verifier when applicable).
//   2. Exchanges the code for tokens against the provider.
//   3. Fetches the provider's user profile to learn the canonical handle.
//   4. Calls record_verified_social_account RPC (service role) which
//      encrypts and upserts.
//
// The endpoint refuses if the JWT user_id does not match the state's
// embedded user_id — prevents one user finishing another user's flow.
// ============================================================================

import {
    withMiddleware,
    addCorsHeaders,
    errorResponse,
} from '../_shared/middleware.ts'

import {
    isSupportedPlatform,
    loadOAuthConfig,
    PROVIDERS,
    verifyState,
    exchangeCode,
    fetchProfile,
} from '../_shared/social-oauth.ts'

interface CallbackRequest {
    platform: unknown
    code: unknown
    state: unknown
}

Deno.serve(withMiddleware(async (_req, { supabase, auth, body, origin }) => {
    if (!auth.authenticated || !auth.userId) {
        return errorResponse(401, 'Authentication required', origin)
    }

    const { platform, code, state } = body as CallbackRequest
    if (!isSupportedPlatform(platform)) return errorResponse(400, 'unsupported platform', origin)
    if (typeof code !== 'string' || !code) return errorResponse(400, 'code required', origin)
    if (typeof state !== 'string' || !state) return errorResponse(400, 'state required', origin)

    let config
    try {
        config = await loadOAuthConfig(supabase, platform)
    } catch (err) {
        return errorResponse(503, `OAuth not configured: ${(err as Error).message}`, origin)
    }

    let payload
    try {
        payload = await verifyState(config.stateSecret, state)
    } catch (err) {
        return errorResponse(400, `invalid state: ${(err as Error).message}`, origin)
    }

    if (payload.user_id !== auth.userId || payload.platform !== platform) {
        return errorResponse(403, 'state binding mismatch', origin)
    }

    const provider = PROVIDERS[platform]

    let tokenResp
    try {
        tokenResp = await exchangeCode({
            platform,
            config,
            code,
            codeVerifier: provider.pkce ? payload.code_verifier : undefined,
        })
    } catch (err) {
        return errorResponse(502, `token exchange: ${(err as Error).message}`, origin)
    }

    let profile
    try {
        profile = await fetchProfile({
            platform,
            accessToken: tokenResp.access_token,
        })
    } catch (err) {
        return errorResponse(502, `profile fetch: ${(err as Error).message}`, origin)
    }

    const expiresAt = tokenResp.expires_in
        ? new Date(Date.now() + tokenResp.expires_in * 1000).toISOString()
        : null

    const { error: rpcError } = await supabase.rpc('record_verified_social_account', {
        p_user_id: auth.userId,
        p_platform: platform,
        p_platform_user_id: profile.platformUserId,
        p_handle: profile.handle,
        p_access_token: tokenResp.access_token,
        p_refresh_token: tokenResp.refresh_token ?? null,
        p_expires_at: expiresAt,
    })

    if (rpcError) {
        return errorResponse(500, `record failed: ${rpcError.message}`, origin)
    }

    return new Response(
        JSON.stringify({
            success: true,
            platform,
            handle: profile.handle,
        }),
        { status: 200, headers: addCorsHeaders({ 'Content-Type': 'application/json' }, origin) },
    )
}, {
    requireAuth: true,
}))
