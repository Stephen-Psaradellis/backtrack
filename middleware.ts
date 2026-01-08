import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'
import {
  rateLimit,
  RATE_LIMIT_PRESETS,
  getClientIdentifier,
  createRateLimitResponse,
  getRateLimitHeaders,
} from '@/lib/rateLimit'

/**
 * Determine the rate limit preset based on the request path
 */
function getRateLimitPreset(pathname: string) {
  // Auth endpoints - strict limiting
  if (pathname.startsWith('/api/auth')) {
    return RATE_LIMIT_PRESETS.auth
  }

  // Search endpoints
  if (pathname.includes('/search') || pathname.includes('/nearby')) {
    return RATE_LIMIT_PRESETS.search
  }

  // Upload endpoints
  if (pathname.includes('/upload') || pathname.includes('/photo')) {
    return RATE_LIMIT_PRESETS.upload
  }

  // Write operations (POST, PUT, DELETE to API)
  if (pathname.startsWith('/api')) {
    return RATE_LIMIT_PRESETS.api
  }

  // Default - lenient for page requests
  return RATE_LIMIT_PRESETS.read
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // Apply rate limiting to API routes
  if (pathname.startsWith('/api')) {
    const clientId = getClientIdentifier(request)
    const preset = getRateLimitPreset(pathname)

    // Include method in identifier for write operations
    const method = request.method
    const identifier = method !== 'GET'
      ? `${clientId}:${pathname}:${method}`
      : `${clientId}:${pathname}`

    const result = rateLimit(identifier, preset)

    if (!result.success) {
      return createRateLimitResponse(result)
    }

    // Continue with session update, then add rate limit headers
    const response = await updateSession(request)

    // Add rate limit headers to the response
    const headers = getRateLimitHeaders(result)
    Object.entries(headers).forEach(([key, value]) => {
      response.headers.set(key, value as string)
    })

    return response
  }

  // Non-API routes - just update session
  return await updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'
  ]
}
