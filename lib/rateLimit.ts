/**
 * Rate Limiting Service
 *
 * Provides in-memory rate limiting for API routes to prevent abuse.
 * Uses a sliding window algorithm for fair rate limiting.
 *
 * For production at scale, consider using Redis-based rate limiting
 * with Upstash or similar services.
 *
 * @example
 * ```typescript
 * import { rateLimit, RateLimitConfig } from './rateLimit'
 *
 * const config: RateLimitConfig = {
 *   windowMs: 60 * 1000, // 1 minute
 *   maxRequests: 60,     // 60 requests per minute
 * }
 *
 * const result = rateLimit(identifier, config)
 * if (!result.success) {
 *   return new Response('Too Many Requests', { status: 429 })
 * }
 * ```
 */

// ============================================================================
// Types
// ============================================================================

export interface RateLimitConfig {
  /** Time window in milliseconds */
  windowMs: number
  /** Maximum number of requests allowed in the window */
  maxRequests: number
  /** Optional: Skip rate limiting for certain conditions */
  skip?: (identifier: string) => boolean
}

export interface RateLimitResult {
  /** Whether the request is allowed */
  success: boolean
  /** Number of remaining requests in the current window */
  remaining: number
  /** Time in milliseconds until the rate limit resets */
  resetIn: number
  /** Total limit for the window */
  limit: number
}

interface RateLimitEntry {
  /** Timestamps of requests in the current window */
  timestamps: number[]
  /** When this entry was last cleaned */
  lastCleanup: number
}

// ============================================================================
// Rate Limit Store
// ============================================================================

/**
 * In-memory store for rate limit data
 * In production, consider using Redis for distributed rate limiting
 */
const rateLimitStore = new Map<string, RateLimitEntry>()

/**
 * Cleanup interval to prevent memory leaks (5 minutes)
 */
const CLEANUP_INTERVAL = 5 * 60 * 1000

/**
 * Last global cleanup timestamp
 */
let lastGlobalCleanup = Date.now()

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Clean up old entries from the store
 */
function cleanupStore(windowMs: number): void {
  const now = Date.now()
  const cutoff = now - windowMs

  // Only do global cleanup every CLEANUP_INTERVAL
  if (now - lastGlobalCleanup < CLEANUP_INTERVAL) {
    return
  }

  lastGlobalCleanup = now

  // Remove expired entries
  for (const [key, entry] of rateLimitStore.entries()) {
    // Filter out old timestamps
    const validTimestamps = entry.timestamps.filter((ts) => ts > cutoff)

    if (validTimestamps.length === 0) {
      // No valid timestamps, remove the entry entirely
      rateLimitStore.delete(key)
    } else {
      // Update with only valid timestamps
      entry.timestamps = validTimestamps
      entry.lastCleanup = now
    }
  }
}

/**
 * Get or create a rate limit entry for an identifier
 */
function getOrCreateEntry(identifier: string): RateLimitEntry {
  let entry = rateLimitStore.get(identifier)

  if (!entry) {
    entry = {
      timestamps: [],
      lastCleanup: Date.now(),
    }
    rateLimitStore.set(identifier, entry)
  }

  return entry
}

// ============================================================================
// Main Rate Limiting Function
// ============================================================================

/**
 * Check if a request should be rate limited
 *
 * @param identifier - Unique identifier for the client (e.g., IP address, user ID)
 * @param config - Rate limit configuration
 * @returns Rate limit result with success status and metadata
 */
export function rateLimit(
  identifier: string,
  config: RateLimitConfig
): RateLimitResult {
  const { windowMs, maxRequests, skip } = config
  const now = Date.now()

  // Check if we should skip rate limiting for this identifier
  if (skip && skip(identifier)) {
    return {
      success: true,
      remaining: maxRequests,
      resetIn: 0,
      limit: maxRequests,
    }
  }

  // Periodic cleanup
  cleanupStore(windowMs)

  // Get or create entry for this identifier
  const entry = getOrCreateEntry(identifier)

  // Calculate the start of the current window
  const windowStart = now - windowMs

  // Filter out timestamps outside the current window
  entry.timestamps = entry.timestamps.filter((ts) => ts > windowStart)

  // Check if we've exceeded the limit
  const currentCount = entry.timestamps.length

  if (currentCount >= maxRequests) {
    // Find when the oldest request in the window will expire
    const oldestTimestamp = entry.timestamps[0]
    const resetIn = oldestTimestamp + windowMs - now

    return {
      success: false,
      remaining: 0,
      resetIn: Math.max(0, resetIn),
      limit: maxRequests,
    }
  }

  // Add the current request timestamp
  entry.timestamps.push(now)

  // Calculate remaining requests
  const remaining = maxRequests - entry.timestamps.length

  // Calculate time until the window resets (when oldest request expires)
  const resetIn =
    entry.timestamps.length > 0
      ? entry.timestamps[0] + windowMs - now
      : windowMs

  return {
    success: true,
    remaining,
    resetIn: Math.max(0, resetIn),
    limit: maxRequests,
  }
}

// ============================================================================
// Preset Configurations
// ============================================================================

/**
 * Preset rate limit configurations for different use cases
 */
export const RATE_LIMIT_PRESETS = {
  /**
   * Strict limit for authentication endpoints
   * 5 requests per minute to prevent brute force
   */
  auth: {
    windowMs: 60 * 1000,
    maxRequests: 5,
  } as RateLimitConfig,

  /**
   * Standard API limit
   * 60 requests per minute
   */
  api: {
    windowMs: 60 * 1000,
    maxRequests: 60,
  } as RateLimitConfig,

  /**
   * Search endpoints
   * 30 requests per minute (more expensive operations)
   */
  search: {
    windowMs: 60 * 1000,
    maxRequests: 30,
  } as RateLimitConfig,

  /**
   * Create/write operations
   * 20 requests per minute
   */
  write: {
    windowMs: 60 * 1000,
    maxRequests: 20,
  } as RateLimitConfig,

  /**
   * Upload operations
   * 10 requests per minute
   */
  upload: {
    windowMs: 60 * 1000,
    maxRequests: 10,
  } as RateLimitConfig,

  /**
   * Lenient limit for read-heavy endpoints
   * 120 requests per minute
   */
  read: {
    windowMs: 60 * 1000,
    maxRequests: 120,
  } as RateLimitConfig,
} as const

// ============================================================================
// Middleware Helper
// ============================================================================

/**
 * Get rate limit headers for a response
 *
 * @param result - Rate limit result
 * @returns Headers object with rate limit information
 */
export function getRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    'X-RateLimit-Limit': result.limit.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': Math.ceil(result.resetIn / 1000).toString(),
  }
}

/**
 * Create a rate limit response for rejected requests
 *
 * @param result - Rate limit result
 * @returns Response object with 429 status
 */
export function createRateLimitResponse(result: RateLimitResult): Response {
  const retryAfter = Math.ceil(result.resetIn / 1000)

  return new Response(
    JSON.stringify({
      error: 'Too Many Requests',
      message: `Rate limit exceeded. Please try again in ${retryAfter} seconds.`,
      retryAfter,
    }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': retryAfter.toString(),
        ...getRateLimitHeaders(result),
      },
    }
  )
}

// ============================================================================
// Identifier Extractors
// ============================================================================

/**
 * Extract client identifier from request headers
 * Uses X-Forwarded-For for proxied requests, falls back to a default
 *
 * @param request - Incoming request
 * @returns Client identifier string
 */
export function getClientIdentifier(request: Request): string {
  // Check for forwarded IP (behind proxy/load balancer)
  const forwardedFor = request.headers.get('x-forwarded-for')
  if (forwardedFor) {
    // Get the first IP in the chain (original client)
    return forwardedFor.split(',')[0].trim()
  }

  // Check for real IP header (Cloudflare, nginx)
  const realIp = request.headers.get('x-real-ip')
  if (realIp) {
    return realIp
  }

  // Check for CF-Connecting-IP (Cloudflare)
  const cfIp = request.headers.get('cf-connecting-ip')
  if (cfIp) {
    return cfIp
  }

  // Fallback to a default identifier
  // In production, you might want to handle this differently
  return 'unknown-client'
}

/**
 * Create a composite identifier combining IP and route
 *
 * @param request - Incoming request
 * @param route - Route identifier
 * @returns Composite identifier
 */
export function getRouteIdentifier(request: Request, route: string): string {
  const clientId = getClientIdentifier(request)
  return `${clientId}:${route}`
}

// ============================================================================
// Testing/Development Utilities
// ============================================================================

/**
 * Clear all rate limit entries (useful for testing)
 */
export function clearRateLimitStore(): void {
  rateLimitStore.clear()
}

/**
 * Get the current size of the rate limit store (useful for monitoring)
 */
export function getRateLimitStoreSize(): number {
  return rateLimitStore.size
}

export default {
  rateLimit,
  RATE_LIMIT_PRESETS,
  getRateLimitHeaders,
  createRateLimitResponse,
  getClientIdentifier,
  getRouteIdentifier,
  clearRateLimitStore,
  getRateLimitStoreSize,
}
