/**
 * Shared Edge Function Middleware
 *
 * Provides authentication, CORS, rate limiting, and error handling
 * utilities shared across all Edge Functions.
 *
 * Security fixes addressed:
 * - [CRITICAL] Edge Functions lack authentication verification
 * - [CRITICAL] No webhook signature verification
 * - [CRITICAL] CORS allows all origins (*)
 * - [HIGH] Error detail leakage in responses
 * - [HIGH] No request body size limit
 */

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { validateSupabaseEnv } from './env-validation.ts'

// ============================================================================
// Types
// ============================================================================

export interface AuthResult {
  authenticated: boolean
  userId: string | null
  error: string | null
}

export interface CorsConfig {
  allowedOrigins: string[]
  allowMethods: string
  allowHeaders: string
  maxAge: string
}

// ============================================================================
// Constants
// ============================================================================

const isProduction =
  Deno.env.get('ENVIRONMENT') === 'production' ||
  Deno.env.get('DENO_ENV') === 'production'

const PRODUCTION_ORIGINS = [
  'https://backtrack.social',
  'https://www.backtrack.social',
  'https://app.backtrack.social',
]

const DEV_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:8081',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:8081',
]

const ALLOWED_ORIGINS = isProduction
  ? PRODUCTION_ORIGINS
  : [...PRODUCTION_ORIGINS, ...DEV_ORIGINS]

// Max request body sizes (bytes)
const MAX_BODY_SIZE_NOTIFICATION = 1024 * 1024 // 1MB
const MAX_BODY_SIZE_MODERATION = 10 * 1024 // 10KB (IDs only, not images)

// UUID v4 regex for validation
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

// ============================================================================
// CORS Handling
// ============================================================================

/**
 * Get the allowed CORS origin for a request.
 * Returns the origin if it's in the whitelist, null otherwise.
 */
export function getCorsOrigin(requestOrigin: string | null): string | null {
  if (!requestOrigin) return null
  if (ALLOWED_ORIGINS.includes(requestOrigin)) return requestOrigin
  // Allow Expo development URLs
  if (requestOrigin.startsWith('exp://') || requestOrigin.startsWith('backtrack://')) {
    return requestOrigin
  }
  return null
}

/**
 * Create a CORS preflight response for allowed origins.
 * Returns 403 for disallowed origins.
 */
export function handleCorsPreflightResponse(req: Request): Response {
  const origin = req.headers.get('origin')
  const corsOrigin = getCorsOrigin(origin)

  if (!corsOrigin) {
    return new Response(null, { status: 403 })
  }

  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': corsOrigin,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-signature',
      'Access-Control-Max-Age': '86400',
    },
  })
}

/**
 * Add CORS headers to a response if the origin is allowed.
 */
export function addCorsHeaders(
  headers: Record<string, string>,
  requestOrigin: string | null
): Record<string, string> {
  const corsOrigin = getCorsOrigin(requestOrigin)
  if (corsOrigin) {
    headers['Access-Control-Allow-Origin'] = corsOrigin
  }
  return headers
}

// ============================================================================
// Authentication
// ============================================================================

/**
 * Verify a JWT Bearer token from the Authorization header.
 * Returns the authenticated user ID or null.
 */
export async function verifyJWT(
  req: Request,
  supabase: SupabaseClient
): Promise<AuthResult> {
  const authHeader = req.headers.get('authorization')

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return {
      authenticated: false,
      userId: null,
      error: 'Missing or invalid Authorization header. Expected: Bearer <token>',
    }
  }

  const token = authHeader.slice(7)

  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token)

    if (error || !user) {
      return {
        authenticated: false,
        userId: null,
        error: 'Invalid or expired authentication token',
      }
    }

    return {
      authenticated: true,
      userId: user.id,
      error: null,
    }
  } catch {
    return {
      authenticated: false,
      userId: null,
      error: 'Authentication verification failed',
    }
  }
}

/**
 * Verify a webhook signature using HMAC-SHA256.
 * Used for database webhook-triggered functions.
 */
export async function verifyWebhookSignature(
  req: Request,
  secret: string
): Promise<boolean> {
  const signature = req.headers.get('x-webhook-signature')
  if (!signature) return false

  try {
    const body = await req.clone().text()
    const encoder = new TextEncoder()
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    )
    const signatureBytes = await crypto.subtle.sign(
      'HMAC',
      key,
      encoder.encode(body)
    )
    const expectedSignature = Array.from(new Uint8Array(signatureBytes))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')

    return signature === expectedSignature
  } catch {
    return false
  }
}

/**
 * Verify the request comes from a trusted source.
 * Accepts either:
 * 1. A valid JWT Bearer token (for client-initiated calls)
 * 2. The service role key in Authorization header (for webhook/cron calls)
 * 3. A valid webhook signature (for database webhook triggers)
 *
 * For webhook-triggered functions (notifications), we check for service role key
 * since Supabase webhooks use the service role key.
 */
export async function verifyRequest(
  req: Request,
  supabase: SupabaseClient,
  options: {
    allowServiceRole?: boolean
    webhookSecret?: string
  } = {}
): Promise<AuthResult> {
  const authHeader = req.headers.get('authorization')

  // Check for service role key (webhook/cron calls)
  if (options.allowServiceRole && authHeader) {
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (serviceRoleKey && authHeader === `Bearer ${serviceRoleKey}`) {
      return {
        authenticated: true,
        userId: null, // Service role doesn't have a user ID
        error: null,
      }
    }
  }

  // Check webhook signature
  if (options.webhookSecret) {
    const isValid = await verifyWebhookSignature(req, options.webhookSecret)
    if (isValid) {
      return {
        authenticated: true,
        userId: null,
        error: null,
      }
    }
  }

  // Fall back to JWT verification
  return verifyJWT(req, supabase)
}

// ============================================================================
// Input Validation
// ============================================================================

/**
 * Validate a UUID string format.
 */
export function isValidUUID(value: string): boolean {
  return UUID_REGEX.test(value)
}

/**
 * Check request body size against a limit.
 * Returns an error response if the body is too large.
 */
export function checkBodySize(
  req: Request,
  maxBytes: number = MAX_BODY_SIZE_NOTIFICATION
): Response | null {
  const contentLength = req.headers.get('content-length')
  if (contentLength && parseInt(contentLength, 10) > maxBytes) {
    return new Response(
      JSON.stringify({ error: 'Request body too large' }),
      {
        status: 413,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
  return null
}

// ============================================================================
// Content Sanitization
// ============================================================================

/**
 * Sanitize notification content to prevent injection attacks.
 * Strips HTML tags and limits string length.
 */
export function sanitizeNotificationContent(
  text: string,
  maxLength: number = 500
): string {
  if (typeof text !== 'string') return ''
  // Strip HTML tags
  const stripped = text.replace(/<[^>]*>/g, '')
  // Remove control characters except newlines
  const cleaned = stripped.replace(/[\x00-\x09\x0B\x0C\x0E-\x1F\x7F]/g, '')
  // Trim to max length
  return cleaned.slice(0, maxLength).trim()
}

// ============================================================================
// Error Handling
// ============================================================================

/**
 * Sanitize error messages for client responses.
 * Strips internal details (stack traces, DB errors, query structures).
 * Full error is logged server-side only.
 */
export function sanitizeError(error: unknown): string {
  if (error instanceof Error) {
    // Log the full error server-side
    console.error('[Edge Function Error]', error.message, error.stack)
  } else {
    console.error('[Edge Function Error]', error)
  }

  // Return generic message to client
  return 'Internal server error'
}

/**
 * Create a standardized error response.
 */
export function errorResponse(
  status: number,
  message: string,
  requestOrigin?: string | null
): Response {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (requestOrigin) {
    addCorsHeaders(headers, requestOrigin)
  }

  return new Response(
    JSON.stringify({ error: message }),
    { status, headers }
  )
}

/**
 * Create a standardized 401 Unauthorized response.
 */
export function unauthorizedResponse(
  message: string = 'Unauthorized',
  requestOrigin?: string | null
): Response {
  return errorResponse(401, message, requestOrigin)
}

// ============================================================================
// Supabase Client Factory
// ============================================================================

/**
 * Create a Supabase client with service role key.
 * Configures connection for edge function usage (no session persistence).
 */
export function createServiceClient(): SupabaseClient {
  const { supabaseUrl, supabaseServiceRoleKey } = validateSupabaseEnv()

  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}

// ============================================================================
// Request Handler Wrapper
// ============================================================================

/**
 * Wraps an Edge Function handler with common middleware:
 * - CORS preflight handling
 * - Method validation (POST only)
 * - Request body size check
 * - Authentication verification
 * - Error sanitization
 *
 * @example
 * ```typescript
 * Deno.serve(withMiddleware(async (req, { supabase, auth, body, origin }) => {
 *   // auth.userId is available if JWT was provided
 *   // body is the parsed JSON request body
 *   return new Response(JSON.stringify({ success: true }), {
 *     status: 200,
 *     headers: addCorsHeaders({ 'Content-Type': 'application/json' }, origin),
 *   })
 * }, { requireAuth: true }))
 * ```
 */
export function withMiddleware(
  handler: (
    req: Request,
    ctx: {
      supabase: SupabaseClient
      auth: AuthResult
      body: unknown
      origin: string | null
    }
  ) => Promise<Response>,
  options: {
    requireAuth?: boolean
    allowServiceRole?: boolean
    webhookSecret?: string
    maxBodySize?: number
  } = {}
): (req: Request) => Promise<Response> {
  const supabase = createServiceClient()

  return async (req: Request): Promise<Response> => {
    const origin = req.headers.get('origin')

    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
      return handleCorsPreflightResponse(req)
    }

    // Only allow POST
    if (req.method !== 'POST') {
      return errorResponse(405, 'Method not allowed', origin)
    }

    // Check body size
    const sizeError = checkBodySize(req, options.maxBodySize)
    if (sizeError) return sizeError

    try {
      // Verify authentication
      const auth = await verifyRequest(req, supabase, {
        allowServiceRole: options.allowServiceRole,
        webhookSecret: options.webhookSecret,
      })

      if (options.requireAuth && !auth.authenticated) {
        return unauthorizedResponse(auth.error || 'Unauthorized', origin)
      }

      // Parse body
      const body = await req.json()

      // Call the actual handler
      return await handler(req, { supabase, auth, body, origin })
    } catch (error) {
      const message = sanitizeError(error)
      return errorResponse(500, message, origin)
    }
  }
}
