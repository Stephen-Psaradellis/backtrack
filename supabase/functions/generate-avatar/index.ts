/**
 * Supabase Edge Function: generate-avatar
 *
 * Proxies avatar generation requests to the Recraft API, keeping the
 * RECRAFT_API_KEY server-side only.
 *
 * Security:
 * - Requires JWT authentication
 * - CORS restricted to allowed origins
 * - Error details sanitized
 *
 * Expected payload:
 * {
 *   prompt: string,
 *   style?: string,   // default: 'digital_illustration'
 *   size?: string      // default: '1024x1024'
 * }
 */

import {
  withMiddleware,
  addCorsHeaders,
  errorResponse,
} from '../_shared/middleware.ts'

const RECRAFT_API_URL = 'https://external.api.recraft.ai/v1/images/generations'
const MAX_PROMPT_LENGTH = 2000

Deno.serve(
  withMiddleware(
    async (_req, { body, origin }) => {
      const apiKey = Deno.env.get('RECRAFT_API_KEY')
      if (!apiKey) {
        console.error('RECRAFT_API_KEY not configured in Supabase secrets')
        return errorResponse(503, 'Avatar generation is not configured', origin)
      }

      const { prompt, style, size } = body as {
        prompt?: string
        style?: string
        size?: string
      }

      if (!prompt || typeof prompt !== 'string') {
        return errorResponse(400, 'prompt is required and must be a string', origin)
      }
      if (prompt.length > MAX_PROMPT_LENGTH) {
        return errorResponse(400, `prompt must be ${MAX_PROMPT_LENGTH} characters or less`, origin)
      }

      const recraftBody = {
        prompt,
        style: style ?? 'digital_illustration',
        size: size ?? '1024x1024',
        model: 'recraftv2',
        response_format: 'url',
        n: 2,
      }

      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 55000)

      let recraftRes: Response
      try {
        recraftRes = await fetch(RECRAFT_API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify(recraftBody),
          signal: controller.signal,
        })
      } catch (e) {
        clearTimeout(timeout)
        console.error('Recraft API timeout or fetch error:', e)
        return errorResponse(504, 'Avatar generation timed out. Please try again.', origin)
      }
      clearTimeout(timeout)

      if (!recraftRes.ok) {
        const status = recraftRes.status
        console.error(`Recraft API error: ${status}`)
        return errorResponse(
          status === 429 ? 429 : status >= 500 ? 502 : 500,
          status === 429
            ? 'Avatar generation rate limit reached. Try again later.'
            : 'Avatar generation failed',
          origin
        )
      }

      const data = await recraftRes.json()
      const urls = (data?.data ?? []).map((item: { url: string }) => item.url).filter(Boolean)

      if (urls.length === 0) {
        return errorResponse(502, 'Avatar generation returned no images', origin)
      }

      return new Response(JSON.stringify({ svgUrls: urls, svgUrl: urls[0] }), {
        status: 200,
        headers: addCorsHeaders({ 'Content-Type': 'application/json' }, origin),
      })
    },
    { requireAuth: true }
  )
)
