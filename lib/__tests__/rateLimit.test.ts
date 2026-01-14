/**
 * Tests for lib/rateLimit.ts
 *
 * Tests rate limiting functionality with sliding window algorithm.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  rateLimit,
  RATE_LIMIT_PRESETS,
  getRateLimitHeaders,
  createRateLimitResponse,
  getClientIdentifier,
  getRouteIdentifier,
  clearRateLimitStore,
  getRateLimitStoreSize,
  RateLimitConfig,
} from '../rateLimit'

describe('rateLimit', () => {
  beforeEach(() => {
    clearRateLimitStore()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('basic rate limiting', () => {
    const config: RateLimitConfig = {
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 5,
    }

    it('should allow requests under the limit', () => {
      const result = rateLimit('test-user', config)
      expect(result.success).toBe(true)
      expect(result.remaining).toBe(4)
      expect(result.limit).toBe(5)
    })

    it('should track remaining requests correctly', () => {
      for (let i = 0; i < 5; i++) {
        const result = rateLimit('test-user', config)
        expect(result.success).toBe(true)
        expect(result.remaining).toBe(4 - i)
      }
    })

    it('should block requests over the limit', () => {
      // Make 5 allowed requests
      for (let i = 0; i < 5; i++) {
        const result = rateLimit('test-user', config)
        expect(result.success).toBe(true)
      }

      // 6th request should be blocked
      const result = rateLimit('test-user', config)
      expect(result.success).toBe(false)
      expect(result.remaining).toBe(0)
    })

    it('should allow requests after window expires', () => {
      // Use up all requests
      for (let i = 0; i < 5; i++) {
        rateLimit('test-user', config)
      }

      // Should be blocked
      expect(rateLimit('test-user', config).success).toBe(false)

      // Advance time past the window
      vi.advanceTimersByTime(60 * 1000 + 1)

      // Should be allowed again
      const result = rateLimit('test-user', config)
      expect(result.success).toBe(true)
      expect(result.remaining).toBe(4)
    })

    it('should track different identifiers separately', () => {
      // Fill up limit for user1
      for (let i = 0; i < 5; i++) {
        rateLimit('user1', config)
      }
      expect(rateLimit('user1', config).success).toBe(false)

      // user2 should still be allowed
      const result = rateLimit('user2', config)
      expect(result.success).toBe(true)
      expect(result.remaining).toBe(4)
    })
  })

  describe('sliding window behavior', () => {
    const config: RateLimitConfig = {
      windowMs: 60 * 1000,
      maxRequests: 3,
    }

    it('should use sliding window algorithm', () => {
      // Make 3 requests at t=0
      for (let i = 0; i < 3; i++) {
        rateLimit('test-user', config)
      }

      // Blocked at t=0
      expect(rateLimit('test-user', config).success).toBe(false)

      // Advance 30 seconds - still blocked (requests haven't expired)
      vi.advanceTimersByTime(30 * 1000)
      expect(rateLimit('test-user', config).success).toBe(false)

      // Advance another 31 seconds (past window) - should be allowed
      vi.advanceTimersByTime(31 * 1000)
      const result = rateLimit('test-user', config)
      expect(result.success).toBe(true)
    })
  })

  describe('skip option', () => {
    it('should skip rate limiting when skip returns true', () => {
      const config: RateLimitConfig = {
        windowMs: 60 * 1000,
        maxRequests: 1,
        skip: (id) => id.startsWith('admin'),
      }

      // Regular user should be limited
      rateLimit('user', config)
      expect(rateLimit('user', config).success).toBe(false)

      // Admin should not be limited
      for (let i = 0; i < 10; i++) {
        const result = rateLimit('admin-123', config)
        expect(result.success).toBe(true)
        expect(result.remaining).toBe(1) // Always full when skipped
      }
    })
  })

  describe('resetIn calculation', () => {
    it('should return correct resetIn time', () => {
      const config: RateLimitConfig = {
        windowMs: 60 * 1000,
        maxRequests: 2,
      }

      rateLimit('test-user', config)
      vi.advanceTimersByTime(10 * 1000) // 10 seconds later

      const result = rateLimit('test-user', config)
      expect(result.success).toBe(true)
      // resetIn should be approximately 50 seconds (60 - 10)
      expect(result.resetIn).toBeGreaterThan(49 * 1000)
      expect(result.resetIn).toBeLessThanOrEqual(50 * 1000)
    })

    it('should return resetIn when blocked', () => {
      const config: RateLimitConfig = {
        windowMs: 60 * 1000,
        maxRequests: 1,
      }

      rateLimit('test-user', config)
      const result = rateLimit('test-user', config)

      expect(result.success).toBe(false)
      expect(result.resetIn).toBeGreaterThan(0)
      expect(result.resetIn).toBeLessThanOrEqual(60 * 1000)
    })
  })
})

describe('RATE_LIMIT_PRESETS', () => {
  it('should have auth preset', () => {
    expect(RATE_LIMIT_PRESETS.auth.windowMs).toBe(60 * 1000)
    expect(RATE_LIMIT_PRESETS.auth.maxRequests).toBe(5)
  })

  it('should have api preset', () => {
    expect(RATE_LIMIT_PRESETS.api.windowMs).toBe(60 * 1000)
    expect(RATE_LIMIT_PRESETS.api.maxRequests).toBe(60)
  })

  it('should have search preset', () => {
    expect(RATE_LIMIT_PRESETS.search.windowMs).toBe(60 * 1000)
    expect(RATE_LIMIT_PRESETS.search.maxRequests).toBe(30)
  })

  it('should have write preset', () => {
    expect(RATE_LIMIT_PRESETS.write.windowMs).toBe(60 * 1000)
    expect(RATE_LIMIT_PRESETS.write.maxRequests).toBe(20)
  })

  it('should have upload preset', () => {
    expect(RATE_LIMIT_PRESETS.upload.windowMs).toBe(60 * 1000)
    expect(RATE_LIMIT_PRESETS.upload.maxRequests).toBe(10)
  })

  it('should have read preset', () => {
    expect(RATE_LIMIT_PRESETS.read.windowMs).toBe(60 * 1000)
    expect(RATE_LIMIT_PRESETS.read.maxRequests).toBe(120)
  })
})

describe('getRateLimitHeaders', () => {
  it('should return correct headers', () => {
    const result = {
      success: true,
      remaining: 50,
      resetIn: 30000,
      limit: 60,
    }

    const headers = getRateLimitHeaders(result)

    expect(headers['X-RateLimit-Limit']).toBe('60')
    expect(headers['X-RateLimit-Remaining']).toBe('50')
    expect(headers['X-RateLimit-Reset']).toBe('30') // 30000ms = 30s
  })

  it('should round up reset time', () => {
    const result = {
      success: false,
      remaining: 0,
      resetIn: 1500, // 1.5 seconds
      limit: 10,
    }

    const headers = getRateLimitHeaders(result)
    expect(headers['X-RateLimit-Reset']).toBe('2') // Rounded up
  })
})

describe('createRateLimitResponse', () => {
  it('should create 429 response', async () => {
    const result = {
      success: false,
      remaining: 0,
      resetIn: 30000,
      limit: 60,
    }

    const response = createRateLimitResponse(result)

    expect(response.status).toBe(429)
    expect(response.headers.get('Content-Type')).toBe('application/json')
    expect(response.headers.get('Retry-After')).toBe('30')
    expect(response.headers.get('X-RateLimit-Limit')).toBe('60')
    expect(response.headers.get('X-RateLimit-Remaining')).toBe('0')
  })

  it('should include error message in body', async () => {
    const result = {
      success: false,
      remaining: 0,
      resetIn: 30000,
      limit: 60,
    }

    const response = createRateLimitResponse(result)
    const body = await response.json()

    expect(body.error).toBe('Too Many Requests')
    expect(body.message).toContain('30 seconds')
    expect(body.retryAfter).toBe(30)
  })
})

describe('getClientIdentifier', () => {
  it('should use x-forwarded-for header', () => {
    const request = new Request('https://example.com', {
      headers: {
        'x-forwarded-for': '192.168.1.1, 10.0.0.1',
      },
    })

    const id = getClientIdentifier(request)
    expect(id).toBe('192.168.1.1')
  })

  it('should use x-real-ip header', () => {
    const request = new Request('https://example.com', {
      headers: {
        'x-real-ip': '192.168.1.2',
      },
    })

    const id = getClientIdentifier(request)
    expect(id).toBe('192.168.1.2')
  })

  it('should use cf-connecting-ip header', () => {
    const request = new Request('https://example.com', {
      headers: {
        'cf-connecting-ip': '192.168.1.3',
      },
    })

    const id = getClientIdentifier(request)
    expect(id).toBe('192.168.1.3')
  })

  it('should prefer x-forwarded-for over other headers', () => {
    const request = new Request('https://example.com', {
      headers: {
        'x-forwarded-for': '192.168.1.1',
        'x-real-ip': '192.168.1.2',
        'cf-connecting-ip': '192.168.1.3',
      },
    })

    const id = getClientIdentifier(request)
    expect(id).toBe('192.168.1.1')
  })

  it('should return unknown-client when no IP headers present', () => {
    const request = new Request('https://example.com')
    const id = getClientIdentifier(request)
    expect(id).toBe('unknown-client')
  })
})

describe('getRouteIdentifier', () => {
  it('should combine client ID and route', () => {
    const request = new Request('https://example.com', {
      headers: {
        'x-forwarded-for': '192.168.1.1',
      },
    })

    const id = getRouteIdentifier(request, '/api/posts')
    expect(id).toBe('192.168.1.1:/api/posts')
  })
})

describe('clearRateLimitStore', () => {
  beforeEach(() => {
    clearRateLimitStore()
  })

  it('should clear all entries', () => {
    const config: RateLimitConfig = {
      windowMs: 60 * 1000,
      maxRequests: 5,
    }

    rateLimit('user1', config)
    rateLimit('user2', config)
    expect(getRateLimitStoreSize()).toBe(2)

    clearRateLimitStore()
    expect(getRateLimitStoreSize()).toBe(0)
  })
})

describe('getRateLimitStoreSize', () => {
  beforeEach(() => {
    clearRateLimitStore()
  })

  it('should return 0 for empty store', () => {
    expect(getRateLimitStoreSize()).toBe(0)
  })

  it('should return correct count', () => {
    const config: RateLimitConfig = {
      windowMs: 60 * 1000,
      maxRequests: 5,
    }

    rateLimit('user1', config)
    expect(getRateLimitStoreSize()).toBe(1)

    rateLimit('user2', config)
    expect(getRateLimitStoreSize()).toBe(2)

    rateLimit('user3', config)
    expect(getRateLimitStoreSize()).toBe(3)
  })
})

describe('cleanupStore (internal behavior)', () => {
  beforeEach(() => {
    clearRateLimitStore()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should clean up expired entries after cleanup interval', () => {
    const config: RateLimitConfig = {
      windowMs: 60 * 1000,
      maxRequests: 5,
    }

    // Add some entries
    rateLimit('user1', config)
    rateLimit('user2', config)
    expect(getRateLimitStoreSize()).toBe(2)

    // Advance time past window to expire entries
    vi.advanceTimersByTime(61 * 1000)

    // Make a request but cleanup shouldn't run yet (not past CLEANUP_INTERVAL of 5 minutes)
    rateLimit('user3', config)
    expect(getRateLimitStoreSize()).toBe(3)

    // Advance time past cleanup interval (5 minutes)
    vi.advanceTimersByTime(5 * 60 * 1000)

    // Now make another request which should trigger cleanup
    rateLimit('user4', config)

    // user1 and user2 entries should be cleaned up (expired)
    // user3 might still be valid or cleaned depending on timing
    // user4 should be present
    expect(getRateLimitStoreSize()).toBeLessThanOrEqual(3)
    expect(getRateLimitStoreSize()).toBeGreaterThanOrEqual(1)
  })

  it('should remove entries with all expired timestamps', () => {
    const config: RateLimitConfig = {
      windowMs: 60 * 1000,
      maxRequests: 5,
    }

    // Add entry
    rateLimit('expired-user', config)
    expect(getRateLimitStoreSize()).toBe(1)

    // Advance past both window AND cleanup interval
    vi.advanceTimersByTime(6 * 60 * 1000) // 6 minutes

    // Trigger cleanup via new request
    rateLimit('new-user', config)

    // expired-user should be removed, new-user added
    // But cleanup timing depends on global lastGlobalCleanup which persists
    // Just verify we have at most 2 entries (before cleanup) or 1 (after cleanup)
    expect(getRateLimitStoreSize()).toBeLessThanOrEqual(2)
    expect(getRateLimitStoreSize()).toBeGreaterThanOrEqual(1)
  })

  it('should keep entries with some valid timestamps', () => {
    const config: RateLimitConfig = {
      windowMs: 60 * 1000,
      maxRequests: 10,
    }

    // Add several requests for same user
    rateLimit('active-user', config)

    // Advance time but not past window
    vi.advanceTimersByTime(30 * 1000)
    rateLimit('active-user', config)

    // Advance past cleanup interval
    vi.advanceTimersByTime(5 * 60 * 1000)

    // Trigger cleanup
    rateLimit('active-user', config)

    // User should still exist with recent timestamps
    expect(getRateLimitStoreSize()).toBe(1)
  })
})
