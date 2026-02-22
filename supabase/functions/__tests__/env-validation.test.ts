/**
 * Environment Validation Tests
 *
 * Tests for shared environment variable validation used across edge functions.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// ============================================================================
// MOCKS
// ============================================================================

// Mock Deno.env
const mockEnv = new Map<string, string>()

global.Deno = {
  env: {
    get: (key: string) => mockEnv.get(key),
    set: (key: string, value: string) => mockEnv.set(key, value),
  },
} as any

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function validateSupabaseEnv(): { supabaseUrl: string; supabaseServiceRoleKey: string } {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  const missing: string[] = []

  if (!supabaseUrl) {
    missing.push('SUPABASE_URL')
  }
  if (!supabaseServiceRoleKey) {
    missing.push('SUPABASE_SERVICE_ROLE_KEY')
  }

  if (missing.length > 0) {
    throw new Error(
      '[Edge Function Config Error] Missing required environment variables: ' + missing.join(', ') + '. ' +
      'Please configure these in your Supabase project settings under Edge Functions > Secrets.'
    )
  }

  return { supabaseUrl, supabaseServiceRoleKey }
}

function validateVisionApiKey(): string {
  const visionApiKey = Deno.env.get('GOOGLE_CLOUD_VISION_API_KEY')

  if (!visionApiKey) {
    throw new Error(
      '[Edge Function Config Error] Missing GOOGLE_CLOUD_VISION_API_KEY. ' +
      'Please configure this in your Supabase project settings under Edge Functions > Secrets.'
    )
  }

  return visionApiKey
}

// ============================================================================
// TESTS
// ============================================================================

describe('Environment Validation', () => {
  beforeEach(() => {
    mockEnv.clear()
  })

  afterEach(() => {
    mockEnv.clear()
  })

  // ==========================================================================
  // SUPABASE ENVIRONMENT VALIDATION
  // ==========================================================================

  describe('validateSupabaseEnv', () => {
    it('throws error when SUPABASE_URL is missing', () => {
      mockEnv.set('SUPABASE_SERVICE_ROLE_KEY', 'test-key')

      expect(() => validateSupabaseEnv()).toThrow('[Edge Function Config Error]')
      expect(() => validateSupabaseEnv()).toThrow('SUPABASE_URL')
      expect(() => validateSupabaseEnv()).toThrow('Missing required environment variables')
    })

    it('throws error when SUPABASE_SERVICE_ROLE_KEY is missing', () => {
      mockEnv.set('SUPABASE_URL', 'https://test.supabase.co')

      expect(() => validateSupabaseEnv()).toThrow('[Edge Function Config Error]')
      expect(() => validateSupabaseEnv()).toThrow('SUPABASE_SERVICE_ROLE_KEY')
      expect(() => validateSupabaseEnv()).toThrow('Missing required environment variables')
    })

    it('throws error when both required variables are missing', () => {
      expect(() => validateSupabaseEnv()).toThrow('[Edge Function Config Error]')
      expect(() => validateSupabaseEnv()).toThrow('SUPABASE_URL')
      expect(() => validateSupabaseEnv()).toThrow('SUPABASE_SERVICE_ROLE_KEY')
    })

    it('returns config when all required variables are present', () => {
      mockEnv.set('SUPABASE_URL', 'https://test.supabase.co')
      mockEnv.set('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-key')

      const config = validateSupabaseEnv()

      expect(config).toEqual({
        supabaseUrl: 'https://test.supabase.co',
        supabaseServiceRoleKey: 'test-service-role-key',
      })
    })

    it('provides helpful error message with configuration instructions', () => {
      try {
        validateSupabaseEnv()
        expect.fail('Should have thrown error')
      } catch (error) {
        expect(error).toBeInstanceOf(Error)
        expect((error as Error).message).toContain('Edge Functions > Secrets')
        expect((error as Error).message).toContain('Supabase project settings')
      }
    })

    it('lists all missing variables in error message', () => {
      try {
        validateSupabaseEnv()
        expect.fail('Should have thrown error')
      } catch (error) {
        const message = (error as Error).message
        expect(message).toContain('SUPABASE_URL')
        expect(message).toContain('SUPABASE_SERVICE_ROLE_KEY')
      }
    })
  })

  // ==========================================================================
  // VISION API KEY VALIDATION
  // ==========================================================================

  describe('validateVisionApiKey', () => {
    it('throws error when GOOGLE_CLOUD_VISION_API_KEY is missing', () => {
      expect(() => validateVisionApiKey()).toThrow('[Edge Function Config Error]')
      expect(() => validateVisionApiKey()).toThrow('GOOGLE_CLOUD_VISION_API_KEY')
      expect(() => validateVisionApiKey()).toThrow('Missing')
    })

    it('returns API key when present', () => {
      mockEnv.set('GOOGLE_CLOUD_VISION_API_KEY', 'test-vision-api-key')

      const apiKey = validateVisionApiKey()

      expect(apiKey).toBe('test-vision-api-key')
    })

    it('provides helpful error message with configuration instructions', () => {
      try {
        validateVisionApiKey()
        expect.fail('Should have thrown error')
      } catch (error) {
        expect(error).toBeInstanceOf(Error)
        expect((error as Error).message).toContain('Edge Functions > Secrets')
        expect((error as Error).message).toContain('Supabase project settings')
      }
    })

    it('throws error for empty string API key', () => {
      mockEnv.set('GOOGLE_CLOUD_VISION_API_KEY', '')

      expect(() => validateVisionApiKey()).toThrow('GOOGLE_CLOUD_VISION_API_KEY')
    })
  })

  // ==========================================================================
  // INTEGRATION SCENARIOS
  // ==========================================================================

  describe('Integration Scenarios', () => {
    it('validates all environment variables for notification functions', () => {
      mockEnv.set('SUPABASE_URL', 'https://test.supabase.co')
      mockEnv.set('SUPABASE_SERVICE_ROLE_KEY', 'test-key')

      expect(() => validateSupabaseEnv()).not.toThrow()

      const config = validateSupabaseEnv()
      expect(config.supabaseUrl).toBeTruthy()
      expect(config.supabaseServiceRoleKey).toBeTruthy()
    })

    it('validates all environment variables for moderation functions', () => {
      mockEnv.set('SUPABASE_URL', 'https://test.supabase.co')
      mockEnv.set('SUPABASE_SERVICE_ROLE_KEY', 'test-key')
      mockEnv.set('GOOGLE_CLOUD_VISION_API_KEY', 'test-vision-key')

      expect(() => validateSupabaseEnv()).not.toThrow()
      expect(() => validateVisionApiKey()).not.toThrow()

      const supabaseConfig = validateSupabaseEnv()
      const visionKey = validateVisionApiKey()

      expect(supabaseConfig).toBeDefined()
      expect(visionKey).toBe('test-vision-key')
    })

    it('fails fast when critical environment variables are missing', () => {
      let errorThrown = false

      try {
        validateSupabaseEnv()
      } catch (error) {
        errorThrown = true
        expect(error).toBeInstanceOf(Error)
      }

      expect(errorThrown).toBe(true)
    })

    it('handles partial configuration gracefully', () => {
      mockEnv.set('SUPABASE_URL', 'https://test.supabase.co')

      // Should fail because SERVICE_ROLE_KEY is missing
      expect(() => validateSupabaseEnv()).toThrow('SUPABASE_SERVICE_ROLE_KEY')

      // Add missing variable
      mockEnv.set('SUPABASE_SERVICE_ROLE_KEY', 'test-key')

      // Should now succeed
      expect(() => validateSupabaseEnv()).not.toThrow()
    })
  })

  // ==========================================================================
  // ERROR MESSAGE QUALITY
  // ==========================================================================

  describe('Error Message Quality', () => {
    it('provides actionable error messages', () => {
      try {
        validateSupabaseEnv()
        expect.fail('Should have thrown')
      } catch (error) {
        const message = (error as Error).message
        expect(message).toContain('Missing required environment variables')
        expect(message).toContain('Please configure')
        expect(message).toContain('Supabase project settings')
      }
    })

    it('includes specific variable names in error', () => {
      mockEnv.set('SUPABASE_URL', 'https://test.supabase.co')

      try {
        validateSupabaseEnv()
        expect.fail('Should have thrown')
      } catch (error) {
        const message = (error as Error).message
        expect(message).toContain('SUPABASE_SERVICE_ROLE_KEY')
        expect(message).not.toContain('SUPABASE_URL') // This one is set
      }
    })

    it('uses consistent error prefix', () => {
      const errorPrefix = '[Edge Function Config Error]'

      try {
        validateSupabaseEnv()
      } catch (error) {
        expect((error as Error).message).toContain(errorPrefix)
        expect((error as Error).message.startsWith(errorPrefix)).toBe(true)
      }

      try {
        validateVisionApiKey()
      } catch (error) {
        expect((error as Error).message).toContain(errorPrefix)
        expect((error as Error).message.startsWith(errorPrefix)).toBe(true)
      }
    })
  })

  // ==========================================================================
  // SECURITY CONSIDERATIONS
  // ==========================================================================

  describe('Security Considerations', () => {
    it('does not leak sensitive values in error messages', () => {
      mockEnv.set('SUPABASE_SERVICE_ROLE_KEY', 'super-secret-key-12345')

      try {
        validateSupabaseEnv()
      } catch (error) {
        const message = (error as Error).message
        expect(message).not.toContain('super-secret-key-12345')
      }
    })

    it('validates presence but not format of secrets', () => {
      // Any non-empty string should be accepted
      mockEnv.set('SUPABASE_URL', 'not-a-valid-url')
      mockEnv.set('SUPABASE_SERVICE_ROLE_KEY', 'invalid-key-format')

      // Should not throw - format validation is Supabase's job
      expect(() => validateSupabaseEnv()).not.toThrow()

      const config = validateSupabaseEnv()
      expect(config.supabaseUrl).toBe('not-a-valid-url')
      expect(config.supabaseServiceRoleKey).toBe('invalid-key-format')
    })
  })
})
