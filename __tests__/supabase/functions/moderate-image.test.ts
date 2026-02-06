/**
 * Tests for the moderate-image Edge Function
 *
 * These tests verify the moderation logic without calling the actual
 * Google Cloud Vision API or Supabase services.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// ============================================================================
// Types (mirrored from the edge function)
// ============================================================================

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

// ============================================================================
// Rejection Logic (extracted from edge function for testing)
// ============================================================================

const REJECTION_THRESHOLDS: Partial<Record<keyof SafeSearchResult, SafeSearchLikelihood[]>> = {
  adult: ['LIKELY', 'VERY_LIKELY'],
  violence: ['LIKELY', 'VERY_LIKELY'],
  racy: ['LIKELY', 'VERY_LIKELY'],
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

// ============================================================================
// CORS Logic (extracted from edge function for testing)
// ============================================================================

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

function getCorsOrigin(requestOrigin: string | null, isProduction: boolean): string | null {
  if (!requestOrigin) return null

  const allowedOrigins = isProduction
    ? PRODUCTION_ORIGINS
    : [...PRODUCTION_ORIGINS, ...DEV_ORIGINS]

  if (allowedOrigins.includes(requestOrigin)) {
    return requestOrigin
  }

  // Allow Expo development URLs
  if (requestOrigin.startsWith('exp://') || requestOrigin.startsWith('backtrack://')) {
    return requestOrigin
  }

  return null
}

// ============================================================================
// Rate Limiting Logic (extracted for testing)
// ============================================================================

const RATE_LIMIT_WINDOW_MS = 60 * 1000
const RATE_LIMIT_MAX_REQUESTS = 10

class RateLimiter {
  private rateLimitMap = new Map<string, { count: number; resetTime: number }>()

  checkRateLimit(userId: string): { allowed: boolean; remaining: number } {
    const now = Date.now()
    const userLimit = this.rateLimitMap.get(userId)

    if (!userLimit || now > userLimit.resetTime) {
      this.rateLimitMap.set(userId, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS })
      return { allowed: true, remaining: RATE_LIMIT_MAX_REQUESTS - 1 }
    }

    if (userLimit.count >= RATE_LIMIT_MAX_REQUESTS) {
      return { allowed: false, remaining: 0 }
    }

    userLimit.count++
    return { allowed: true, remaining: RATE_LIMIT_MAX_REQUESTS - userLimit.count }
  }

  reset(): void {
    this.rateLimitMap.clear()
  }
}

// ============================================================================
// Tests
// ============================================================================

describe('moderate-image Edge Function', () => {
  describe('shouldReject', () => {
    it('should approve safe content', () => {
      const safeResult: SafeSearchResult = {
        adult: 'VERY_UNLIKELY',
        spoof: 'VERY_UNLIKELY',
        medical: 'UNLIKELY',
        violence: 'VERY_UNLIKELY',
        racy: 'UNLIKELY',
      }

      expect(shouldReject(safeResult)).toBe(false)
    })

    it('should reject adult content marked as LIKELY', () => {
      const adultResult: SafeSearchResult = {
        adult: 'LIKELY',
        spoof: 'VERY_UNLIKELY',
        medical: 'VERY_UNLIKELY',
        violence: 'VERY_UNLIKELY',
        racy: 'VERY_UNLIKELY',
      }

      expect(shouldReject(adultResult)).toBe(true)
    })

    it('should reject adult content marked as VERY_LIKELY', () => {
      const adultResult: SafeSearchResult = {
        adult: 'VERY_LIKELY',
        spoof: 'VERY_UNLIKELY',
        medical: 'VERY_UNLIKELY',
        violence: 'VERY_UNLIKELY',
        racy: 'VERY_UNLIKELY',
      }

      expect(shouldReject(adultResult)).toBe(true)
    })

    it('should reject violent content', () => {
      const violentResult: SafeSearchResult = {
        adult: 'VERY_UNLIKELY',
        spoof: 'VERY_UNLIKELY',
        medical: 'VERY_UNLIKELY',
        violence: 'LIKELY',
        racy: 'VERY_UNLIKELY',
      }

      expect(shouldReject(violentResult)).toBe(true)
    })

    it('should reject racy content marked as LIKELY', () => {
      const racyResult: SafeSearchResult = {
        adult: 'VERY_UNLIKELY',
        spoof: 'VERY_UNLIKELY',
        medical: 'VERY_UNLIKELY',
        violence: 'VERY_UNLIKELY',
        racy: 'LIKELY',
      }

      expect(shouldReject(racyResult)).toBe(true)
    })

    it('should allow racy content marked as POSSIBLE', () => {
      const borderlineResult: SafeSearchResult = {
        adult: 'POSSIBLE',
        spoof: 'VERY_UNLIKELY',
        medical: 'VERY_UNLIKELY',
        violence: 'POSSIBLE',
        racy: 'POSSIBLE',
      }

      expect(shouldReject(borderlineResult)).toBe(false)
    })

    it('should not reject based on medical or spoof categories', () => {
      const medicalResult: SafeSearchResult = {
        adult: 'VERY_UNLIKELY',
        spoof: 'VERY_LIKELY',
        medical: 'VERY_LIKELY',
        violence: 'VERY_UNLIKELY',
        racy: 'VERY_UNLIKELY',
      }

      expect(shouldReject(medicalResult)).toBe(false)
    })

    it('should reject if any monitored category exceeds threshold', () => {
      const mixedResult: SafeSearchResult = {
        adult: 'UNLIKELY',
        spoof: 'VERY_LIKELY',
        medical: 'VERY_LIKELY',
        violence: 'VERY_LIKELY',
        racy: 'UNLIKELY',
      }

      expect(shouldReject(mixedResult)).toBe(true)
    })
  })

  describe('CORS handling', () => {
    it('should allow production origins in production mode', () => {
      expect(getCorsOrigin('https://backtrack.social', true)).toBe('https://backtrack.social')
      expect(getCorsOrigin('https://www.backtrack.social', true)).toBe('https://www.backtrack.social')
      expect(getCorsOrigin('https://app.backtrack.social', true)).toBe('https://app.backtrack.social')
    })

    it('should reject localhost in production mode', () => {
      expect(getCorsOrigin('http://localhost:3000', true)).toBe(null)
      expect(getCorsOrigin('http://localhost:8081', true)).toBe(null)
    })

    it('should allow localhost in development mode', () => {
      expect(getCorsOrigin('http://localhost:3000', false)).toBe('http://localhost:3000')
      expect(getCorsOrigin('http://localhost:8081', false)).toBe('http://localhost:8081')
    })

    it('should allow Expo URLs in any mode', () => {
      expect(getCorsOrigin('exp://192.168.1.1:8081', true)).toBe('exp://192.168.1.1:8081')
      expect(getCorsOrigin('backtrack://post/123', true)).toBe('backtrack://post/123')
    })

    it('should reject unknown origins', () => {
      expect(getCorsOrigin('https://evil.com', true)).toBe(null)
      expect(getCorsOrigin('https://evil.com', false)).toBe(null)
    })

    it('should handle null origin', () => {
      expect(getCorsOrigin(null, true)).toBe(null)
      expect(getCorsOrigin(null, false)).toBe(null)
    })
  })

  describe('Rate limiting', () => {
    let rateLimiter: RateLimiter

    beforeEach(() => {
      rateLimiter = new RateLimiter()
    })

    it('should allow first request', () => {
      const result = rateLimiter.checkRateLimit('user-1')
      expect(result.allowed).toBe(true)
      expect(result.remaining).toBe(9)
    })

    it('should track request count', () => {
      const userId = 'user-2'

      for (let i = 0; i < 5; i++) {
        rateLimiter.checkRateLimit(userId)
      }

      const result = rateLimiter.checkRateLimit(userId)
      expect(result.allowed).toBe(true)
      expect(result.remaining).toBe(4)
    })

    it('should block after max requests', () => {
      const userId = 'user-3'

      for (let i = 0; i < 10; i++) {
        rateLimiter.checkRateLimit(userId)
      }

      const result = rateLimiter.checkRateLimit(userId)
      expect(result.allowed).toBe(false)
      expect(result.remaining).toBe(0)
    })

    it('should track users independently', () => {
      for (let i = 0; i < 10; i++) {
        rateLimiter.checkRateLimit('user-a')
      }

      const resultA = rateLimiter.checkRateLimit('user-a')
      const resultB = rateLimiter.checkRateLimit('user-b')

      expect(resultA.allowed).toBe(false)
      expect(resultB.allowed).toBe(true)
    })
  })

  describe('Request validation', () => {
    it('should require photo_id', () => {
      const body = { storage_path: '/path/to/image.jpg' }
      const isValid = Boolean(body && 'photo_id' in body && body.photo_id)
      expect(isValid).toBe(false)
    })

    it('should require storage_path', () => {
      const body = { photo_id: '123' }
      const isValid = Boolean(body && 'storage_path' in body && body.storage_path)
      expect(isValid).toBe(false)
    })

    it('should accept valid request body', () => {
      const body = { photo_id: '123', storage_path: '/path/to/image.jpg' }
      const isValid = Boolean(body?.photo_id && body?.storage_path)
      expect(isValid).toBe(true)
    })
  })
})
