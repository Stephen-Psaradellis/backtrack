/**
 * Sentry Error Tracking Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as Sentry from '@sentry/react-native'

// Create hoisted mocks
const { mockConstants } = vi.hoisted(() => ({
  mockConstants: {
    expoConfig: { version: '1.0.0', android: { versionCode: 1 }, ios: { buildNumber: '1' } },
    manifest: null,
    systemFonts: [],
    appOwnership: 'expo',
    executionEnvironment: 'storeClient',
  },
}))

vi.mock('expo-constants', () => ({
  default: mockConstants,
}))

// Import after mocking
import {
  initSentry,
  captureException,
  captureMessage,
  setUserContext,
  clearUserContext,
  addBreadcrumb,
  reportReactError,
  redactSensitiveData,
} from '../sentry'

describe('Sentry Error Tracking', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('initSentry', () => {
    it('should skip initialization in development mode', () => {
      const result = initSentry()
      expect(result).toBe(false)
      expect(Sentry.init).not.toHaveBeenCalled()
    })

    it('should return false consistently when called multiple times in dev mode', () => {
      expect(initSentry()).toBe(false)
      expect(initSentry()).toBe(false)
    })
  })

  describe('captureException', () => {
    it('should log error in development mode', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      captureException(new Error('Test error'), { context: 'test' })

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[Sentry] Would capture exception:',
        expect.any(Error),
        { context: 'test' }
      )

      consoleErrorSpy.mockRestore()
    })

    it('should handle string errors', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      captureException('String error')

      expect(consoleErrorSpy).toHaveBeenCalled()

      consoleErrorSpy.mockRestore()
    })

    it('should handle errors without context', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      captureException(new Error('Test error'))

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[Sentry] Would capture exception:',
        expect.any(Error),
        undefined
      )

      consoleErrorSpy.mockRestore()
    })
  })

  describe('captureMessage', () => {
    it('should log message in development mode', () => {
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      captureMessage('Test message', 'info', { extra: 'data' })

      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[Sentry] Would capture message (info):',
        'Test message',
        { extra: 'data' }
      )

      consoleLogSpy.mockRestore()
    })

    it('should use default level of info', () => {
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      captureMessage('Test message')

      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[Sentry] Would capture message (info):',
        'Test message',
        undefined
      )

      consoleLogSpy.mockRestore()
    })

    it('should handle different severity levels', () => {
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      captureMessage('Warning message', 'warning')

      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[Sentry] Would capture message (warning):',
        'Warning message',
        undefined
      )

      consoleLogSpy.mockRestore()
    })
  })

  describe('setUserContext', () => {
    it('should log user context set in development mode', () => {
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      setUserContext('user-123')

      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[Sentry] Would set user context:',
        'user_set'
      )

      consoleLogSpy.mockRestore()
    })

    it('should log user context cleared in development mode', () => {
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      setUserContext(null)

      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[Sentry] Would set user context:',
        'cleared'
      )

      consoleLogSpy.mockRestore()
    })
  })

  describe('clearUserContext', () => {
    it('should clear user context', () => {
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      clearUserContext()

      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[Sentry] Would set user context:',
        'cleared'
      )

      consoleLogSpy.mockRestore()
    })
  })

  describe('addBreadcrumb', () => {
    it('should not log breadcrumbs in development mode', () => {
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      addBreadcrumb('Test breadcrumb', 'navigation', { screen: 'Home' })

      // Should not log anything in dev mode
      expect(consoleLogSpy).not.toHaveBeenCalled()

      consoleLogSpy.mockRestore()
    })
  })

  describe('reportReactError', () => {
    it('should log React error in development mode', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const error = new Error('React error')
      const errorInfo = { componentStack: '<Component>\n  <Child>' }

      reportReactError(error, errorInfo)

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[Sentry] Would report React error:',
        error
      )

      consoleErrorSpy.mockRestore()
    })
  })

  describe('redactSensitiveData', () => {
    describe('primitive values', () => {
      it('returns null unchanged', () => {
        expect(redactSensitiveData(null)).toBe(null)
      })

      it('returns undefined unchanged', () => {
        expect(redactSensitiveData(undefined)).toBe(undefined)
      })

      it('returns numbers unchanged', () => {
        expect(redactSensitiveData(42)).toBe(42)
      })

      it('returns booleans unchanged', () => {
        expect(redactSensitiveData(true)).toBe(true)
      })

      it('returns short safe strings unchanged', () => {
        expect(redactSensitiveData('hello')).toBe('hello')
      })
    })

    describe('JWT token detection', () => {
      it('redacts JWT tokens', () => {
        const jwt = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c'
        expect(redactSensitiveData(jwt)).toBe('[JWT_REDACTED]')
      })

      it('redacts strings starting with eyJ that contain dots', () => {
        const jwtLike = 'eyJsomething.otherstuff.moredata'
        expect(redactSensitiveData(jwtLike)).toBe('[JWT_REDACTED]')
      })

      it('does not redact strings that just start with eyJ without dots', () => {
        const notJwt = 'eyJnotavalidjwt'
        expect(redactSensitiveData(notJwt)).toBe('eyJnotavalidjwt')
      })
    })

    describe('sensitive pattern detection', () => {
      it('redacts long strings containing "password"', () => {
        const input = 'The password is supersecretpassword123'
        expect(redactSensitiveData(input)).toBe('[REDACTED]')
      })

      it('redacts long strings containing "token"', () => {
        const input = 'Bearer token: abcdef123456789012345'
        expect(redactSensitiveData(input)).toBe('[REDACTED]')
      })

      it('redacts long strings containing "secret"', () => {
        const input = 'client_secret_abcdef123456789012345'
        expect(redactSensitiveData(input)).toBe('[REDACTED]')
      })

      it('redacts long strings containing "apikey"', () => {
        const input = 'apikey=sk-1234567890abcdefghijk'
        expect(redactSensitiveData(input)).toBe('[REDACTED]')
      })

      it('does not redact short strings even with sensitive patterns', () => {
        // Length <= 20 should not be redacted
        expect(redactSensitiveData('my password')).toBe('my password')
      })

      it('is case insensitive for pattern matching', () => {
        const input = 'The PASSWORD is SUPERSECRET12345'
        expect(redactSensitiveData(input)).toBe('[REDACTED]')
      })
    })

    describe('object redaction', () => {
      it('redacts known sensitive keys', () => {
        const input = {
          username: 'john',
          password: 'secret123',
          email: 'john@example.com',
        }
        const result = redactSensitiveData(input) as Record<string, unknown>
        expect(result.username).toBe('john')
        expect(result.password).toBe('[REDACTED]')
        expect(result.email).toBe('john@example.com')
      })

      it('redacts accessToken key', () => {
        const input = { accessToken: 'abc123' }
        const result = redactSensitiveData(input) as Record<string, unknown>
        expect(result.accessToken).toBe('[REDACTED]')
      })

      it('redacts refreshToken key', () => {
        const input = { refreshToken: 'xyz789' }
        const result = redactSensitiveData(input) as Record<string, unknown>
        expect(result.refreshToken).toBe('[REDACTED]')
      })

      it('redacts sessionToken key', () => {
        const input = { sessionToken: 'session123' }
        const result = redactSensitiveData(input) as Record<string, unknown>
        expect(result.sessionToken).toBe('[REDACTED]')
      })

      it('redacts apiKey key', () => {
        const input = { apiKey: 'key123' }
        const result = redactSensitiveData(input) as Record<string, unknown>
        expect(result.apiKey).toBe('[REDACTED]')
      })

      it('redacts authorization key', () => {
        const input = { authorization: 'Bearer xyz' }
        const result = redactSensitiveData(input) as Record<string, unknown>
        expect(result.authorization).toBe('[REDACTED]')
      })

      it('redacts cookie key', () => {
        const input = { cookie: 'session=abc123' }
        const result = redactSensitiveData(input) as Record<string, unknown>
        expect(result.cookie).toBe('[REDACTED]')
      })

      it('is case insensitive for key matching', () => {
        const input = { PASSWORD: 'secret', AccessToken: 'token123' }
        const result = redactSensitiveData(input) as Record<string, unknown>
        expect(result.PASSWORD).toBe('[REDACTED]')
        expect(result.AccessToken).toBe('[REDACTED]')
      })

      it('redacts keys containing sensitive words', () => {
        const input = { userPassword: 'secret', mySecretKey: 'value' }
        const result = redactSensitiveData(input) as Record<string, unknown>
        expect(result.userPassword).toBe('[REDACTED]')
        expect(result.mySecretKey).toBe('[REDACTED]')
      })
    })

    describe('nested object handling', () => {
      it('recursively redacts nested objects', () => {
        const input = {
          user: {
            name: 'John',
            credentials: {
              password: 'secret',
            },
          },
        }
        const result = redactSensitiveData(input) as Record<string, Record<string, unknown>>
        expect(result.user.name).toBe('John')
        expect((result.user.credentials as Record<string, unknown>).password).toBe('[REDACTED]')
      })

      it('handles deeply nested objects', () => {
        const input = {
          level1: {
            level2: {
              level3: {
                password: 'secret',
              },
            },
          },
        }
        const result = redactSensitiveData(input) as Record<string, unknown>
        const level3 = (
          (result.level1 as Record<string, unknown>).level2 as Record<string, unknown>
        ).level3 as Record<string, unknown>
        expect(level3.password).toBe('[REDACTED]')
      })
    })

    describe('array handling', () => {
      it('processes arrays', () => {
        const input = ['hello', { password: 'secret' }]
        const result = redactSensitiveData(input) as unknown[]
        expect(result[0]).toBe('hello')
        expect((result[1] as Record<string, unknown>).password).toBe('[REDACTED]')
      })

      it('handles arrays of JWT tokens', () => {
        const jwt = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.signature'
        const input = [jwt, 'normal string']
        const result = redactSensitiveData(input) as string[]
        expect(result[0]).toBe('[JWT_REDACTED]')
        expect(result[1]).toBe('normal string')
      })
    })

    describe('depth limit', () => {
      it('returns DEPTH_LIMIT for deeply nested objects', () => {
        // Create object with depth > 10
        let obj: unknown = { value: 'deep' }
        for (let i = 0; i < 15; i++) {
          obj = { nested: obj }
        }
        const result = redactSensitiveData(obj) as Record<string, unknown>

        // Navigate down and eventually find [DEPTH_LIMIT]
        let current: unknown = result
        let foundDepthLimit = false
        for (let i = 0; i < 15; i++) {
          if (current === '[DEPTH_LIMIT]') {
            foundDepthLimit = true
            break
          }
          if (typeof current === 'object' && current !== null) {
            current = (current as Record<string, unknown>).nested
          }
        }
        expect(foundDepthLimit).toBe(true)
      })
    })

    describe('edge cases', () => {
      it('handles empty objects', () => {
        expect(redactSensitiveData({})).toEqual({})
      })

      it('handles empty arrays', () => {
        expect(redactSensitiveData([])).toEqual([])
      })

      it('handles mixed content', () => {
        const input = {
          items: [
            { id: 1, accessToken: 'abc' },
            { id: 2, password: 'xyz' },
          ],
          metadata: {
            apiKey: 'key123',
            count: 2,
          },
        }
        const result = redactSensitiveData(input) as Record<string, unknown>
        const items = result.items as Record<string, unknown>[]
        const metadata = result.metadata as Record<string, unknown>

        expect(items[0].id).toBe(1)
        expect(items[0].accessToken).toBe('[REDACTED]')
        expect(items[1].password).toBe('[REDACTED]')
        expect(metadata.apiKey).toBe('[REDACTED]')
        expect(metadata.count).toBe(2)
      })
    })
  })
})
