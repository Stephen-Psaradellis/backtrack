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
})
