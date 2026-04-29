// ============================================================================
// OAuth Social Start (Feature 5.6)
// ============================================================================
// Authenticated client posts { platform: 'instagram' | 'twitter' | 'tiktok' }.
// Returns { authUrl, state } so the client can hand the URL to
// expo-auth-session / WebBrowser.openAuthSessionAsync. The state contains a
// signed user_id + (for PKCE platforms) a code_verifier the callback needs.
//
// This endpoint REQUIRES auth — we want the user_id baked into the state.
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
    signState,
    generateNonce,
    generateCodeVerifier,
    pkceChallenge,
    buildAuthorizeUrl,
    type SocialPlatform,
    type StatePayload,
} from '../_shared/social-oauth.ts'

const STATE_TTL_SECONDS = 10 * 60 // 10 minutes

interface StartRequest {
    platform: unknown
}

Deno.serve(withMiddleware(async (_req, { supabase, auth, body, origin }) => {
    if (!auth.authenticated || !auth.userId) {
        return errorResponse(401, 'Authentication required', origin)
    }

    const { platform } = body as StartRequest
    if (!isSupportedPlatform(platform)) {
        return errorResponse(400, 'unsupported platform', origin)
    }

    let config
    try {
        config = await loadOAuthConfig(supabase, platform)
    } catch (err) {
        return errorResponse(503, `OAuth not configured: ${(err as Error).message}`, origin)
    }

    const provider = PROVIDERS[platform as SocialPlatform]
    const codeVerifier = provider.pkce ? generateCodeVerifier() : undefined
    const codeChallenge = codeVerifier ? await pkceChallenge(codeVerifier) : undefined

    const statePayload: StatePayload = {
        user_id: auth.userId,
        platform: platform as SocialPlatform,
        nonce: generateNonce(),
        exp: Math.floor(Date.now() / 1000) + STATE_TTL_SECONDS,
        ...(codeVerifier ? { code_verifier: codeVerifier } : {}),
    }
    const state = await signState(config.stateSecret, statePayload)

    const authUrl = buildAuthorizeUrl({
        platform: platform as SocialPlatform,
        config,
        state,
        codeChallenge,
    })

    return new Response(
        JSON.stringify({ authUrl, state }),
        { status: 200, headers: addCorsHeaders({ 'Content-Type': 'application/json' }, origin) },
    )
}, {
    requireAuth: true,
}))
