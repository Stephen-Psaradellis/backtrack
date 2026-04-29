// ============================================================================
// Social OAuth Provider Module (Feature 5.6)
// ============================================================================
// Provider-agnostic OAuth helpers for the verified social-account flow.
// Used by oauth-social-start and oauth-social-callback edge functions.
//
// Supported platforms: instagram, twitter, tiktok.
// (Snapchat is intentionally omitted — no public identity API.)
//
// State signing:
//   The OAuth `state` parameter is a signed JWT-ish blob:
//     base64url(payload) + '.' + base64url(hmac-sha256(payload))
//   Payload is JSON with user_id, platform, nonce, exp, and code_verifier
//   (for PKCE platforms). Verified on callback to prevent CSRF and replay.
// ============================================================================

import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

// ============================================================================
// Types
// ============================================================================

export type SocialPlatform = 'instagram' | 'twitter' | 'tiktok'

export interface ProviderConfig {
    authorizeUrl: string
    tokenUrl: string
    profileUrl: string
    scopes: string
    /** OAuth 2.0 with PKCE (code_verifier / code_challenge). Currently: twitter. */
    pkce: boolean
    /**
     * Reads provider profile JSON and returns the canonical handle + provider
     * user id we want to persist.
     */
    extractProfile: (profileJson: unknown) => { platformUserId: string; handle: string }
}

export interface StatePayload {
    user_id: string
    platform: SocialPlatform
    nonce: string
    exp: number
    /** PKCE code_verifier — only present for providers where pkce=true. */
    code_verifier?: string
}

export interface OAuthConfig {
    clientId: string
    clientSecret: string
    redirectUri: string
    stateSecret: string
}

// ============================================================================
// Provider table
// ============================================================================

export const PROVIDERS: Record<SocialPlatform, ProviderConfig> = {
    instagram: {
        authorizeUrl: 'https://api.instagram.com/oauth/authorize',
        tokenUrl: 'https://api.instagram.com/oauth/access_token',
        profileUrl: 'https://graph.instagram.com/me?fields=id,username',
        scopes: 'user_profile',
        pkce: false,
        extractProfile: (json) => {
            const j = json as { id?: string; username?: string }
            if (!j.id || !j.username) throw new Error('instagram profile missing id/username')
            return { platformUserId: j.id, handle: j.username }
        },
    },
    twitter: {
        authorizeUrl: 'https://twitter.com/i/oauth2/authorize',
        tokenUrl: 'https://api.twitter.com/2/oauth2/token',
        profileUrl: 'https://api.twitter.com/2/users/me',
        scopes: 'tweet.read users.read',
        pkce: true,
        extractProfile: (json) => {
            const j = json as { data?: { id?: string; username?: string } }
            if (!j.data?.id || !j.data?.username) throw new Error('twitter profile missing data.id/username')
            return { platformUserId: j.data.id, handle: j.data.username }
        },
    },
    tiktok: {
        authorizeUrl: 'https://www.tiktok.com/v2/auth/authorize/',
        tokenUrl: 'https://open.tiktokapis.com/v2/oauth/token/',
        profileUrl: 'https://open.tiktokapis.com/v2/user/info/?fields=open_id,union_id,display_name',
        scopes: 'user.info.basic',
        pkce: false,
        extractProfile: (json) => {
            const j = json as { data?: { user?: { open_id?: string; display_name?: string } } }
            const u = j.data?.user
            if (!u?.open_id || !u?.display_name) throw new Error('tiktok profile missing user.open_id/display_name')
            return { platformUserId: u.open_id, handle: u.display_name }
        },
    },
}

export function isSupportedPlatform(value: unknown): value is SocialPlatform {
    return value === 'instagram' || value === 'twitter' || value === 'tiktok'
}

// ============================================================================
// Config loading from app_configuration
// ============================================================================

const REQUIRED_KEYS = (platform: SocialPlatform) => [
    `social_oauth_${platform}_client_id`,
    `social_oauth_${platform}_client_secret`,
    'social_oauth_redirect_uri',
    'social_oauth_state_secret',
]

export async function loadOAuthConfig(
    supabase: SupabaseClient,
    platform: SocialPlatform
): Promise<OAuthConfig> {
    const keys = REQUIRED_KEYS(platform)
    const { data, error } = await supabase
        .from('app_configuration')
        .select('key, value')
        .in('key', keys)
    if (error) throw new Error(`config load failed: ${error.message}`)

    const map = new Map<string, string>()
    for (const row of (data ?? []) as { key: string; value: string }[]) {
        map.set(row.key, row.value)
    }
    for (const k of keys) {
        const v = map.get(k)
        if (!v || v === '') throw new Error(`missing app_configuration: ${k}`)
    }
    return {
        clientId: map.get(`social_oauth_${platform}_client_id`)!,
        clientSecret: map.get(`social_oauth_${platform}_client_secret`)!,
        redirectUri: map.get('social_oauth_redirect_uri')!,
        stateSecret: map.get('social_oauth_state_secret')!,
    }
}

// ============================================================================
// HMAC + base64url helpers (Deno crypto.subtle)
// ============================================================================

function b64urlEncode(bytes: Uint8Array): string {
    let bin = ''
    for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i])
    return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function b64urlDecode(str: string): Uint8Array {
    const padded = str.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(str.length / 4) * 4, '=')
    const bin = atob(padded)
    const out = new Uint8Array(bin.length)
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
    return out
}

async function hmacKey(secret: string): Promise<CryptoKey> {
    return await crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(secret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign', 'verify'],
    )
}

async function hmacSign(secret: string, payload: Uint8Array): Promise<Uint8Array> {
    const key = await hmacKey(secret)
    const sig = await crypto.subtle.sign('HMAC', key, payload)
    return new Uint8Array(sig)
}

async function hmacVerify(secret: string, payload: Uint8Array, sig: Uint8Array): Promise<boolean> {
    const key = await hmacKey(secret)
    return await crypto.subtle.verify('HMAC', key, sig, payload)
}

export async function signState(secret: string, payload: StatePayload): Promise<string> {
    const json = new TextEncoder().encode(JSON.stringify(payload))
    const sig = await hmacSign(secret, json)
    return `${b64urlEncode(json)}.${b64urlEncode(sig)}`
}

export async function verifyState(secret: string, state: string): Promise<StatePayload> {
    const parts = state.split('.')
    if (parts.length !== 2) throw new Error('malformed state')
    const json = b64urlDecode(parts[0])
    const sig = b64urlDecode(parts[1])
    const ok = await hmacVerify(secret, json, sig)
    if (!ok) throw new Error('state signature mismatch')
    const payload = JSON.parse(new TextDecoder().decode(json)) as StatePayload
    if (payload.exp < Math.floor(Date.now() / 1000)) throw new Error('state expired')
    return payload
}

// ============================================================================
// PKCE helpers (Twitter)
// ============================================================================

export function generateCodeVerifier(): string {
    const bytes = new Uint8Array(32)
    crypto.getRandomValues(bytes)
    return b64urlEncode(bytes)
}

export async function pkceChallenge(verifier: string): Promise<string> {
    const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))
    return b64urlEncode(new Uint8Array(hash))
}

export function generateNonce(): string {
    const bytes = new Uint8Array(16)
    crypto.getRandomValues(bytes)
    return b64urlEncode(bytes)
}

// ============================================================================
// Authorize URL builder
// ============================================================================

export function buildAuthorizeUrl(params: {
    platform: SocialPlatform
    config: OAuthConfig
    state: string
    codeChallenge?: string
}): string {
    const provider = PROVIDERS[params.platform]
    const url = new URL(provider.authorizeUrl)
    url.searchParams.set('response_type', 'code')
    url.searchParams.set('client_id', params.config.clientId)
    url.searchParams.set('redirect_uri', params.config.redirectUri)
    url.searchParams.set('scope', provider.scopes)
    url.searchParams.set('state', params.state)
    if (provider.pkce && params.codeChallenge) {
        url.searchParams.set('code_challenge', params.codeChallenge)
        url.searchParams.set('code_challenge_method', 'S256')
    }
    return url.toString()
}

// ============================================================================
// Token exchange
// ============================================================================

export interface TokenResponse {
    access_token: string
    refresh_token?: string
    expires_in?: number
}

export async function exchangeCode(params: {
    platform: SocialPlatform
    config: OAuthConfig
    code: string
    codeVerifier?: string
}): Promise<TokenResponse> {
    const provider = PROVIDERS[params.platform]
    const body = new URLSearchParams()
    body.set('grant_type', 'authorization_code')
    body.set('code', params.code)
    body.set('redirect_uri', params.config.redirectUri)
    body.set('client_id', params.config.clientId)
    body.set('client_secret', params.config.clientSecret)
    if (provider.pkce && params.codeVerifier) {
        body.set('code_verifier', params.codeVerifier)
    }

    const headers: Record<string, string> = {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
    }

    const resp = await fetch(provider.tokenUrl, {
        method: 'POST',
        headers,
        body: body.toString(),
    })
    if (!resp.ok) {
        const text = await resp.text()
        throw new Error(`token exchange failed (${resp.status}): ${text.slice(0, 200)}`)
    }
    const json = await resp.json() as TokenResponse
    if (!json.access_token) throw new Error('token response missing access_token')
    return json
}

// ============================================================================
// Profile fetch
// ============================================================================

export async function fetchProfile(params: {
    platform: SocialPlatform
    accessToken: string
}): Promise<{ platformUserId: string; handle: string }> {
    const provider = PROVIDERS[params.platform]
    const url = params.platform === 'instagram'
        ? `${provider.profileUrl}&access_token=${encodeURIComponent(params.accessToken)}`
        : provider.profileUrl
    const headers: Record<string, string> = { 'Accept': 'application/json' }
    if (params.platform !== 'instagram') {
        headers['Authorization'] = `Bearer ${params.accessToken}`
    }

    const resp = await fetch(url, { method: 'GET', headers })
    if (!resp.ok) {
        const text = await resp.text()
        throw new Error(`profile fetch failed (${resp.status}): ${text.slice(0, 200)}`)
    }
    const json = await resp.json()
    return provider.extractProfile(json)
}
