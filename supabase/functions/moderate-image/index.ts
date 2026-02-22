/**
 * Supabase Edge Function: moderate-image
 *
 * Moderates uploaded profile photos using Google Cloud Vision SafeSearch API.
 * Called after a photo is uploaded to check for inappropriate content.
 *
 * Security:
 * - Requires JWT authentication (client-initiated)
 * - Rate limits by authenticated user_id (not photo_id)
 * - Validates storage_path ownership before processing
 * - CORS restricted to allowed origins
 * - Error details sanitized
 *
 * Expected payload:
 * {
 *   photo_id: string,    // UUID of the profile_photo record
 *   storage_path: string // Path to the image in Supabase Storage
 * }
 */

import { encode as base64Encode } from 'https://deno.land/std@0.168.0/encoding/base64.ts'
import {
  withMiddleware,
  addCorsHeaders,
  isValidUUID,
  errorResponse,
} from '../_shared/middleware.ts'
import { validateVisionApiKey } from '../_shared/env-validation.ts'

// SafeSearch likelihood levels
type SafeSearchLikelihood =
  | 'VERY_UNLIKELY'
  | 'UNLIKELY'
  | 'POSSIBLE'
  | 'LIKELY'
  | 'VERY_LIKELY'

interface SafeSearchResult {
  adult: SafeSearchLikelihood
  spoof: SafeSearchLikelihood
  medical: SafeSearchLikelihood
  violence: SafeSearchLikelihood
  racy: SafeSearchLikelihood
}

interface VisionApiResponse {
  responses: Array<{
    safeSearchAnnotation?: SafeSearchResult
    error?: {
      code: number
      message: string
    }
  }>
}

interface ModerationRequest {
  photo_id: string
  storage_path: string
}

// Rejection thresholds
const REJECTION_THRESHOLDS: Partial<Record<keyof SafeSearchResult, SafeSearchLikelihood[]>> = {
  adult: ['LIKELY', 'VERY_LIKELY'],
  violence: ['LIKELY', 'VERY_LIKELY'],
  racy: ['LIKELY', 'VERY_LIKELY'],
}

// Rate limiting configuration
const RATE_LIMIT_WINDOW_MS = 60 * 1000
const RATE_LIMIT_MAX_REQUESTS = 10
const RATE_LIMIT_DB_TIMEOUT_MS = 1000

async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  operation: string
): Promise<T> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(new Error(`Timeout after ${timeoutMs}ms for operation: ${operation}`))
    }, timeoutMs)
  })

  return Promise.race([promise, timeoutPromise])
}

async function checkRateLimitPersistent(
  supabase: Parameters<typeof withMiddleware>[0] extends (req: Request, ctx: infer C) => Promise<Response> ? C['supabase'] : never,
  userId: string
): Promise<{ allowed: boolean; remaining: number }> {
  try {
    const { data, error } = await withTimeout(
      supabase.rpc('check_rate_limit', {
        p_user_id: userId,
        p_window_ms: RATE_LIMIT_WINDOW_MS,
        p_max_requests: RATE_LIMIT_MAX_REQUESTS,
      }),
      RATE_LIMIT_DB_TIMEOUT_MS,
      'rate_limit_rpc'
    )

    if (!error && data !== null) {
      return {
        allowed: data.allowed ?? false,
        remaining: data.remaining ?? 0,
      }
    }

    // RPC failed - fail closed (deny the request for safety)
    console.error('Rate limit RPC failed, failing closed:', error)
    return { allowed: false, remaining: 0 }
  } catch (dbError) {
    console.error('Rate limit DB error, rejecting request (fail-closed):', dbError)
    return { allowed: false, remaining: 0 }
  }
}

function shouldReject(result: SafeSearchResult): boolean {
  for (const [category, thresholds] of Object.entries(REJECTION_THRESHOLDS)) {
    const level = result[category as keyof SafeSearchResult]
    if (thresholds && thresholds.includes(level)) {
      return true
    }
  }
  return false
}

async function moderateImage(
  imageBase64: string,
  apiKey: string
): Promise<SafeSearchResult> {
  const visionApiUrl = 'https://vision.googleapis.com/v1/images:annotate'

  if (!imageBase64 || imageBase64.length === 0) {
    throw new Error('Image base64 content is empty')
  }

  const requestBody = {
    requests: [
      {
        image: {
          content: imageBase64,
        },
        features: [
          {
            type: 'SAFE_SEARCH_DETECTION',
          },
        ],
      },
    ],
  }

  const response = await fetch(visionApiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
    },
    body: JSON.stringify(requestBody),
  })

  if (!response.ok) {
    throw new Error(`Vision API request failed: ${response.status}`)
  }

  const data: VisionApiResponse = await response.json()

  if (data.responses[0]?.error) {
    throw new Error(`Vision API error: ${data.responses[0].error.message}`)
  }

  const safeSearchResult = data.responses[0]?.safeSearchAnnotation

  if (!safeSearchResult) {
    throw new Error('No SafeSearch result returned from Vision API')
  }

  return safeSearchResult
}

// ============================================================================
// Main Handler
// ============================================================================

Deno.serve(withMiddleware(async (_req, { supabase, auth, body, origin }) => {
  const visionApiKey = Deno.env.get('GOOGLE_CLOUD_VISION_API_KEY')
  if (!visionApiKey) {
    console.error('Missing GOOGLE_CLOUD_VISION_API_KEY')
    return errorResponse(500, 'Internal server error', origin)
  }

  const { photo_id, storage_path } = body as ModerationRequest

  // Validate input BEFORE rate limit (don't consume rate limit on bad input)
  if (!photo_id || !isValidUUID(photo_id)) {
    return new Response(
      JSON.stringify({ error: 'Valid photo_id is required' }),
      {
        status: 400,
        headers: addCorsHeaders({ 'Content-Type': 'application/json' }, origin),
      }
    )
  }

  if (!storage_path || typeof storage_path !== 'string' || storage_path.length === 0) {
    return new Response(
      JSON.stringify({ error: 'Valid storage_path is required' }),
      {
        status: 400,
        headers: addCorsHeaders({ 'Content-Type': 'application/json' }, origin),
      }
    )
  }

  // Validate storage_path prefix - must start with authenticated user's ID
  if (auth.userId && !storage_path.startsWith(`${auth.userId}/`)) {
    return new Response(
      JSON.stringify({ error: 'Forbidden: storage path does not belong to you' }),
      {
        status: 403,
        headers: addCorsHeaders({ 'Content-Type': 'application/json' }, origin),
      }
    )
  }

  // Validate storage_path ownership - ensure photo belongs to authenticated user
  if (auth.userId) {
    const { data: photoRecord, error: photoError } = await supabase
      .from('profile_photos')
      .select('user_id')
      .eq('id', photo_id)
      .single()

    if (photoError || !photoRecord) {
      return new Response(
        JSON.stringify({ error: 'Photo not found' }),
        {
          status: 404,
          headers: addCorsHeaders({ 'Content-Type': 'application/json' }, origin),
        }
      )
    }

    if (photoRecord.user_id !== auth.userId) {
      return new Response(
        JSON.stringify({ error: 'Forbidden: photo does not belong to you' }),
        {
          status: 403,
          headers: addCorsHeaders({ 'Content-Type': 'application/json' }, origin),
        }
      )
    }
  }

  // Rate limiting by authenticated user_id (not photo_id)
  const rateLimitKey = auth.userId || photo_id
  const rateLimitResult = await checkRateLimitPersistent(supabase, rateLimitKey)
  if (!rateLimitResult.allowed) {
    return new Response(
      JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
      {
        status: 429,
        headers: addCorsHeaders({
          'Content-Type': 'application/json',
          'Retry-After': '60',
          'X-RateLimit-Remaining': '0',
        }, origin),
      }
    )
  }

  // Download the image from Supabase Storage
  const { data: imageData, error: downloadError } = await supabase.storage
    .from('selfies')
    .download(storage_path)

  if (downloadError || !imageData) {
    console.error('Failed to download image for moderation')
    await supabase.rpc('update_photo_moderation', {
      p_photo_id: photo_id,
      p_status: 'error',
      p_result: { error: 'Failed to download image' },
    })
    return new Response(
      JSON.stringify({ error: 'Failed to download image' }),
      {
        status: 500,
        headers: addCorsHeaders({ 'Content-Type': 'application/json' }, origin),
      }
    )
  }

  // Convert blob to base64
  const arrayBuffer = await imageData.arrayBuffer()
  const uint8Array = new Uint8Array(arrayBuffer)

  let base64Image: string
  try {
    base64Image = base64Encode(uint8Array)
  } catch {
    const binaryString = Array.from(uint8Array, byte => String.fromCharCode(byte)).join('')
    base64Image = btoa(binaryString)
  }

  // Call Google Cloud Vision API
  let safeSearchResult: SafeSearchResult
  try {
    safeSearchResult = await moderateImage(base64Image, visionApiKey)
  } catch (visionError) {
    console.error('Vision API error:', visionError)
    await supabase.rpc('update_photo_moderation', {
      p_photo_id: photo_id,
      p_status: 'error',
      p_result: { error: 'Moderation service unavailable' },
    })
    return new Response(
      JSON.stringify({ error: 'Moderation failed' }),
      {
        status: 500,
        headers: addCorsHeaders({ 'Content-Type': 'application/json' }, origin),
      }
    )
  }

  // Determine if content should be rejected
  const isRejected = shouldReject(safeSearchResult)
  const newStatus = isRejected ? 'rejected' : 'approved'

  // Update the photo record with moderation result
  await supabase.rpc('update_photo_moderation', {
    p_photo_id: photo_id,
    p_status: newStatus,
    p_result: safeSearchResult,
  })

  // If rejected, delete the image from storage
  if (isRejected) {
    const { error: deleteError } = await supabase.storage
      .from('selfies')
      .remove([storage_path])

    if (deleteError) {
      console.error('Failed to delete rejected image')
    }
  }

  return new Response(
    JSON.stringify({
      success: true,
      photo_id,
      status: newStatus,
      moderation_result: safeSearchResult,
    }),
    {
      status: 200,
      headers: addCorsHeaders({ 'Content-Type': 'application/json' }, origin),
    }
  )
}, {
  requireAuth: true,
  maxBodySize: 10 * 1024,
}))
