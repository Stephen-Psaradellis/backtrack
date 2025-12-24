/**
 * Unit tests for development mode detection utilities
 *
 * These tests cover:
 * - Environment mode detection (isDevMode, isProductionMode)
 * - Missing credentials detection functions
 * - Conditional mock usage functions
 * - Mock services summary functions
 * - Logging function behavior
 *
 * Tests use mock environment variables to simulate different configurations.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  isDevMode,
  isProductionMode,
  isMissingSupabaseCredentials,
  isMissingExpoSupabaseCredentials,
  isMissingGoogleMapsKey,
  shouldUseMockSupabase,
  shouldUseMockExpoSupabase,
  shouldUseMockGoogleMaps,
  isUsingMockServices,
  getMockServicesSummary,
  logDevModeStatus,
} from '@/lib/dev'

// ============================================================================
// Test Setup - Environment Variable Mocking
// ============================================================================

/**
 * Store original environment variables to restore after tests
 */
const originalEnv = { ...process.env }

/**
 * Helper to set environment variables for testing
 */
function setEnv(vars: Record<string, string | undefined>): void {
  for (const [key, value] of Object.entries(vars)) {
    if (value === undefined) {
      delete process.env[key]
    } else {
      process.env[key] = value
    }
  }
}

/**
 * Reset environment to original state after each test
 */
beforeEach(() => {
  // Start with clean environment
  delete process.env.NODE_ENV
  delete process.env.NEXT_PUBLIC_SUPABASE_URL
  delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  delete process.env.EXPO_PUBLIC_SUPABASE_URL
  delete process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
  delete process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
})

afterEach(() => {
  // Restore original environment
  process.env = { ...originalEnv }
  vi.restoreAllMocks()
})

// ============================================================================
// isDevMode Tests
// ============================================================================

describe('isDevMode', () => {
  describe('when NODE_ENV is development', () => {
    it('returns true', () => {
      setEnv({ NODE_ENV: 'development' })
      expect(isDevMode()).toBe(true)
    })
  })

  describe('when NODE_ENV is production', () => {
    it('returns false', () => {
      setEnv({ NODE_ENV: 'production' })
      expect(isDevMode()).toBe(false)
    })
  })

  describe('when NODE_ENV is test', () => {
    it('returns false', () => {
      setEnv({ NODE_ENV: 'test' })
      expect(isDevMode()).toBe(false)
    })
  })

  describe('when NODE_ENV is undefined', () => {
    it('returns false', () => {
      delete process.env.NODE_ENV
      expect(isDevMode()).toBe(false)
    })
  })

  describe('when NODE_ENV is empty string', () => {
    it('returns false', () => {
      setEnv({ NODE_ENV: '' })
      expect(isDevMode()).toBe(false)
    })
  })
})

// ============================================================================
// isProductionMode Tests
// ============================================================================

describe('isProductionMode', () => {
  describe('when NODE_ENV is production', () => {
    it('returns true', () => {
      setEnv({ NODE_ENV: 'production' })
      expect(isProductionMode()).toBe(true)
    })
  })

  describe('when NODE_ENV is development', () => {
    it('returns false', () => {
      setEnv({ NODE_ENV: 'development' })
      expect(isProductionMode()).toBe(false)
    })
  })

  describe('when NODE_ENV is test', () => {
    it('returns false', () => {
      setEnv({ NODE_ENV: 'test' })
      expect(isProductionMode()).toBe(false)
    })
  })

  describe('when NODE_ENV is undefined', () => {
    it('returns false', () => {
      delete process.env.NODE_ENV
      expect(isProductionMode()).toBe(false)
    })
  })
})

// ============================================================================
// isMissingSupabaseCredentials Tests (Next.js)
// ============================================================================

describe('isMissingSupabaseCredentials', () => {
  describe('when both credentials are present', () => {
    it('returns false', () => {
      setEnv({
        NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
        NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key',
      })
      expect(isMissingSupabaseCredentials()).toBe(false)
    })
  })

  describe('when URL is missing', () => {
    it('returns true', () => {
      setEnv({
        NEXT_PUBLIC_SUPABASE_URL: undefined,
        NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key',
      })
      expect(isMissingSupabaseCredentials()).toBe(true)
    })
  })

  describe('when anon key is missing', () => {
    it('returns true', () => {
      setEnv({
        NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
        NEXT_PUBLIC_SUPABASE_ANON_KEY: undefined,
      })
      expect(isMissingSupabaseCredentials()).toBe(true)
    })
  })

  describe('when both credentials are missing', () => {
    it('returns true', () => {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL
      delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      expect(isMissingSupabaseCredentials()).toBe(true)
    })
  })

  describe('when URL is empty string', () => {
    it('returns true', () => {
      setEnv({
        NEXT_PUBLIC_SUPABASE_URL: '',
        NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key',
      })
      expect(isMissingSupabaseCredentials()).toBe(true)
    })
  })

  describe('when anon key is empty string', () => {
    it('returns true', () => {
      setEnv({
        NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
        NEXT_PUBLIC_SUPABASE_ANON_KEY: '',
      })
      expect(isMissingSupabaseCredentials()).toBe(true)
    })
  })
})

// ============================================================================
// isMissingExpoSupabaseCredentials Tests (Expo/React Native)
// ============================================================================

describe('isMissingExpoSupabaseCredentials', () => {
  describe('when both Expo credentials are present', () => {
    it('returns false', () => {
      setEnv({
        EXPO_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
        EXPO_PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key',
      })
      expect(isMissingExpoSupabaseCredentials()).toBe(false)
    })
  })

  describe('when Expo URL is missing', () => {
    it('returns true', () => {
      setEnv({
        EXPO_PUBLIC_SUPABASE_URL: undefined,
        EXPO_PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key',
      })
      expect(isMissingExpoSupabaseCredentials()).toBe(true)
    })
  })

  describe('when Expo anon key is missing', () => {
    it('returns true', () => {
      setEnv({
        EXPO_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
        EXPO_PUBLIC_SUPABASE_ANON_KEY: undefined,
      })
      expect(isMissingExpoSupabaseCredentials()).toBe(true)
    })
  })

  describe('when both Expo credentials are missing', () => {
    it('returns true', () => {
      delete process.env.EXPO_PUBLIC_SUPABASE_URL
      delete process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
      expect(isMissingExpoSupabaseCredentials()).toBe(true)
    })
  })
})

// ============================================================================
// isMissingGoogleMapsKey Tests
// ============================================================================

describe('isMissingGoogleMapsKey', () => {
  describe('when Google Maps API key is present', () => {
    it('returns false', () => {
      setEnv({
        NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: 'test-maps-api-key',
      })
      expect(isMissingGoogleMapsKey()).toBe(false)
    })
  })

  describe('when Google Maps API key is missing', () => {
    it('returns true', () => {
      delete process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
      expect(isMissingGoogleMapsKey()).toBe(true)
    })
  })

  describe('when Google Maps API key is empty string', () => {
    it('returns true', () => {
      setEnv({
        NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: '',
      })
      expect(isMissingGoogleMapsKey()).toBe(true)
    })
  })
})

// ============================================================================
// shouldUseMockSupabase Tests
// ============================================================================

describe('shouldUseMockSupabase', () => {
  describe('in development mode with missing credentials', () => {
    it('returns true when both credentials are missing', () => {
      setEnv({
        NODE_ENV: 'development',
        NEXT_PUBLIC_SUPABASE_URL: undefined,
        NEXT_PUBLIC_SUPABASE_ANON_KEY: undefined,
      })
      expect(shouldUseMockSupabase()).toBe(true)
    })

    it('returns true when URL is missing', () => {
      setEnv({
        NODE_ENV: 'development',
        NEXT_PUBLIC_SUPABASE_URL: undefined,
        NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-key',
      })
      expect(shouldUseMockSupabase()).toBe(true)
    })

    it('returns true when anon key is missing', () => {
      setEnv({
        NODE_ENV: 'development',
        NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
        NEXT_PUBLIC_SUPABASE_ANON_KEY: undefined,
      })
      expect(shouldUseMockSupabase()).toBe(true)
    })
  })

  describe('in development mode with credentials present', () => {
    it('returns false', () => {
      setEnv({
        NODE_ENV: 'development',
        NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
        NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key',
      })
      expect(shouldUseMockSupabase()).toBe(false)
    })
  })

  describe('in production mode', () => {
    it('returns false even with missing credentials', () => {
      setEnv({
        NODE_ENV: 'production',
        NEXT_PUBLIC_SUPABASE_URL: undefined,
        NEXT_PUBLIC_SUPABASE_ANON_KEY: undefined,
      })
      expect(shouldUseMockSupabase()).toBe(false)
    })

    it('returns false with credentials present', () => {
      setEnv({
        NODE_ENV: 'production',
        NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
        NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key',
      })
      expect(shouldUseMockSupabase()).toBe(false)
    })
  })

  describe('in test mode', () => {
    it('returns false even with missing credentials', () => {
      setEnv({
        NODE_ENV: 'test',
        NEXT_PUBLIC_SUPABASE_URL: undefined,
        NEXT_PUBLIC_SUPABASE_ANON_KEY: undefined,
      })
      expect(shouldUseMockSupabase()).toBe(false)
    })
  })
})

// ============================================================================
// shouldUseMockExpoSupabase Tests
// ============================================================================

describe('shouldUseMockExpoSupabase', () => {
  describe('in development mode with missing Expo credentials', () => {
    it('returns true when both Expo credentials are missing', () => {
      setEnv({
        NODE_ENV: 'development',
        EXPO_PUBLIC_SUPABASE_URL: undefined,
        EXPO_PUBLIC_SUPABASE_ANON_KEY: undefined,
      })
      expect(shouldUseMockExpoSupabase()).toBe(true)
    })
  })

  describe('in development mode with Expo credentials present', () => {
    it('returns false', () => {
      setEnv({
        NODE_ENV: 'development',
        EXPO_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
        EXPO_PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key',
      })
      expect(shouldUseMockExpoSupabase()).toBe(false)
    })
  })

  describe('in production mode', () => {
    it('returns false even with missing Expo credentials', () => {
      setEnv({
        NODE_ENV: 'production',
        EXPO_PUBLIC_SUPABASE_URL: undefined,
        EXPO_PUBLIC_SUPABASE_ANON_KEY: undefined,
      })
      expect(shouldUseMockExpoSupabase()).toBe(false)
    })
  })
})

// ============================================================================
// shouldUseMockGoogleMaps Tests
// ============================================================================

describe('shouldUseMockGoogleMaps', () => {
  describe('in development mode with missing API key', () => {
    it('returns true', () => {
      setEnv({
        NODE_ENV: 'development',
        NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: undefined,
      })
      expect(shouldUseMockGoogleMaps()).toBe(true)
    })
  })

  describe('in development mode with API key present', () => {
    it('returns false', () => {
      setEnv({
        NODE_ENV: 'development',
        NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: 'test-maps-key',
      })
      expect(shouldUseMockGoogleMaps()).toBe(false)
    })
  })

  describe('in production mode', () => {
    it('returns false even with missing API key', () => {
      setEnv({
        NODE_ENV: 'production',
        NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: undefined,
      })
      expect(shouldUseMockGoogleMaps()).toBe(false)
    })

    it('returns false with API key present', () => {
      setEnv({
        NODE_ENV: 'production',
        NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: 'test-maps-key',
      })
      expect(shouldUseMockGoogleMaps()).toBe(false)
    })
  })

  describe('in test mode', () => {
    it('returns false even with missing API key', () => {
      setEnv({
        NODE_ENV: 'test',
        NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: undefined,
      })
      expect(shouldUseMockGoogleMaps()).toBe(false)
    })
  })
})

// ============================================================================
// isUsingMockServices Tests
// ============================================================================

describe('isUsingMockServices', () => {
  describe('in development mode', () => {
    it('returns true when Supabase credentials are missing', () => {
      setEnv({
        NODE_ENV: 'development',
        NEXT_PUBLIC_SUPABASE_URL: undefined,
        NEXT_PUBLIC_SUPABASE_ANON_KEY: undefined,
        NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: 'test-maps-key',
      })
      expect(isUsingMockServices()).toBe(true)
    })

    it('returns true when Google Maps key is missing', () => {
      setEnv({
        NODE_ENV: 'development',
        NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
        NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key',
        NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: undefined,
      })
      expect(isUsingMockServices()).toBe(true)
    })

    it('returns true when both are missing', () => {
      setEnv({
        NODE_ENV: 'development',
        NEXT_PUBLIC_SUPABASE_URL: undefined,
        NEXT_PUBLIC_SUPABASE_ANON_KEY: undefined,
        NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: undefined,
      })
      expect(isUsingMockServices()).toBe(true)
    })

    it('returns false when all credentials are present', () => {
      setEnv({
        NODE_ENV: 'development',
        NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
        NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key',
        NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: 'test-maps-key',
      })
      expect(isUsingMockServices()).toBe(false)
    })
  })

  describe('in production mode', () => {
    it('returns false even with missing credentials', () => {
      setEnv({
        NODE_ENV: 'production',
        NEXT_PUBLIC_SUPABASE_URL: undefined,
        NEXT_PUBLIC_SUPABASE_ANON_KEY: undefined,
        NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: undefined,
      })
      expect(isUsingMockServices()).toBe(false)
    })
  })
})

// ============================================================================
// getMockServicesSummary Tests
// ============================================================================

describe('getMockServicesSummary', () => {
  describe('in development mode with all mocks active', () => {
    it('returns correct summary', () => {
      setEnv({
        NODE_ENV: 'development',
        NEXT_PUBLIC_SUPABASE_URL: undefined,
        NEXT_PUBLIC_SUPABASE_ANON_KEY: undefined,
        NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: undefined,
      })

      const summary = getMockServicesSummary()

      expect(summary).toEqual({
        devMode: true,
        mockSupabase: true,
        mockGoogleMaps: true,
      })
    })
  })

  describe('in development mode with no mocks', () => {
    it('returns correct summary', () => {
      setEnv({
        NODE_ENV: 'development',
        NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
        NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key',
        NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: 'test-maps-key',
      })

      const summary = getMockServicesSummary()

      expect(summary).toEqual({
        devMode: true,
        mockSupabase: false,
        mockGoogleMaps: false,
      })
    })
  })

  describe('in development mode with partial mocks', () => {
    it('returns correct summary for mock Supabase only', () => {
      setEnv({
        NODE_ENV: 'development',
        NEXT_PUBLIC_SUPABASE_URL: undefined,
        NEXT_PUBLIC_SUPABASE_ANON_KEY: undefined,
        NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: 'test-maps-key',
      })

      const summary = getMockServicesSummary()

      expect(summary).toEqual({
        devMode: true,
        mockSupabase: true,
        mockGoogleMaps: false,
      })
    })

    it('returns correct summary for mock Google Maps only', () => {
      setEnv({
        NODE_ENV: 'development',
        NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
        NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key',
        NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: undefined,
      })

      const summary = getMockServicesSummary()

      expect(summary).toEqual({
        devMode: true,
        mockSupabase: false,
        mockGoogleMaps: true,
      })
    })
  })

  describe('in production mode', () => {
    it('returns all false values', () => {
      setEnv({
        NODE_ENV: 'production',
        NEXT_PUBLIC_SUPABASE_URL: undefined,
        NEXT_PUBLIC_SUPABASE_ANON_KEY: undefined,
        NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: undefined,
      })

      const summary = getMockServicesSummary()

      expect(summary).toEqual({
        devMode: false,
        mockSupabase: false,
        mockGoogleMaps: false,
      })
    })
  })

  describe('summary structure', () => {
    it('returns object with correct keys', () => {
      const summary = getMockServicesSummary()

      expect(summary).toHaveProperty('devMode')
      expect(summary).toHaveProperty('mockSupabase')
      expect(summary).toHaveProperty('mockGoogleMaps')
      expect(typeof summary.devMode).toBe('boolean')
      expect(typeof summary.mockSupabase).toBe('boolean')
      expect(typeof summary.mockGoogleMaps).toBe('boolean')
    })
  })
})

// ============================================================================
// logDevModeStatus Tests
// ============================================================================

describe('logDevModeStatus', () => {
  describe('in production mode', () => {
    it('does not log anything', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      setEnv({
        NODE_ENV: 'production',
        NEXT_PUBLIC_SUPABASE_URL: undefined,
        NEXT_PUBLIC_SUPABASE_ANON_KEY: undefined,
        NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: undefined,
      })

      logDevModeStatus()

      expect(consoleWarnSpy).not.toHaveBeenCalled()
    })
  })

  describe('in development mode with no mocks', () => {
    it('does not log anything', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      setEnv({
        NODE_ENV: 'development',
        NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
        NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key',
        NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: 'test-maps-key',
      })

      logDevModeStatus()

      expect(consoleWarnSpy).not.toHaveBeenCalled()
    })
  })

  describe('in development mode with mock Supabase', () => {
    it('logs dev mode status with Supabase warning', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      setEnv({
        NODE_ENV: 'development',
        NEXT_PUBLIC_SUPABASE_URL: undefined,
        NEXT_PUBLIC_SUPABASE_ANON_KEY: undefined,
        NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: 'test-maps-key',
      })

      logDevModeStatus()

      expect(consoleWarnSpy).toHaveBeenCalledWith('[Dev Mode] Running with mock services:')
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Mock Supabase client')
      )
    })
  })

  describe('in development mode with mock Google Maps', () => {
    it('logs dev mode status with Google Maps warning', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      setEnv({
        NODE_ENV: 'development',
        NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
        NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key',
        NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: undefined,
      })

      logDevModeStatus()

      expect(consoleWarnSpy).toHaveBeenCalledWith('[Dev Mode] Running with mock services:')
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Mock Google Maps')
      )
    })
  })

  describe('in development mode with all mocks', () => {
    it('logs all mock service warnings', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      setEnv({
        NODE_ENV: 'development',
        NEXT_PUBLIC_SUPABASE_URL: undefined,
        NEXT_PUBLIC_SUPABASE_ANON_KEY: undefined,
        NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: undefined,
      })

      logDevModeStatus()

      expect(consoleWarnSpy).toHaveBeenCalledWith('[Dev Mode] Running with mock services:')
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Mock Supabase client')
      )
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Mock Google Maps')
      )
    })
  })
})

// ============================================================================
// Edge Cases and Integration Tests
// ============================================================================

describe('Edge Cases', () => {
  describe('mode detection edge cases', () => {
    it('handles case-sensitive NODE_ENV comparison', () => {
      setEnv({ NODE_ENV: 'DEVELOPMENT' })
      expect(isDevMode()).toBe(false)

      setEnv({ NODE_ENV: 'Development' })
      expect(isDevMode()).toBe(false)

      setEnv({ NODE_ENV: 'PRODUCTION' })
      expect(isProductionMode()).toBe(false)
    })

    it('handles whitespace in NODE_ENV', () => {
      setEnv({ NODE_ENV: ' development ' })
      expect(isDevMode()).toBe(false)

      setEnv({ NODE_ENV: 'development ' })
      expect(isDevMode()).toBe(false)
    })
  })

  describe('credential detection edge cases', () => {
    it('handles whitespace-only credentials as truthy', () => {
      setEnv({
        NEXT_PUBLIC_SUPABASE_URL: '   ',
        NEXT_PUBLIC_SUPABASE_ANON_KEY: '   ',
      })
      // Whitespace strings are truthy in JavaScript
      expect(isMissingSupabaseCredentials()).toBe(false)
    })
  })

  describe('function composition', () => {
    it('shouldUseMockSupabase equals isDevMode AND isMissingSupabaseCredentials', () => {
      setEnv({
        NODE_ENV: 'development',
        NEXT_PUBLIC_SUPABASE_URL: undefined,
        NEXT_PUBLIC_SUPABASE_ANON_KEY: undefined,
      })

      expect(shouldUseMockSupabase()).toBe(
        isDevMode() && isMissingSupabaseCredentials()
      )

      setEnv({
        NODE_ENV: 'production',
        NEXT_PUBLIC_SUPABASE_URL: undefined,
        NEXT_PUBLIC_SUPABASE_ANON_KEY: undefined,
      })

      expect(shouldUseMockSupabase()).toBe(
        isDevMode() && isMissingSupabaseCredentials()
      )

      setEnv({
        NODE_ENV: 'development',
        NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
        NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-key',
      })

      expect(shouldUseMockSupabase()).toBe(
        isDevMode() && isMissingSupabaseCredentials()
      )
    })

    it('isUsingMockServices equals shouldUseMockSupabase OR shouldUseMockGoogleMaps', () => {
      setEnv({
        NODE_ENV: 'development',
        NEXT_PUBLIC_SUPABASE_URL: undefined,
        NEXT_PUBLIC_SUPABASE_ANON_KEY: undefined,
        NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: undefined,
      })

      expect(isUsingMockServices()).toBe(
        shouldUseMockSupabase() || shouldUseMockGoogleMaps()
      )

      setEnv({
        NODE_ENV: 'development',
        NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
        NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-key',
        NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: 'test-maps-key',
      })

      expect(isUsingMockServices()).toBe(
        shouldUseMockSupabase() || shouldUseMockGoogleMaps()
      )
    })
  })
})
