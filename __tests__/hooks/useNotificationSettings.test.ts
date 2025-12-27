/**
 * @vitest-environment jsdom
 */

/**
 * Unit tests for useNotificationSettings hook
 *
 * Tests the notification settings hook including:
 * - Loading preferences from database
 * - Toggle match/message notifications
 * - Set match/message notifications to specific values
 * - Error handling
 * - Unauthenticated user behavior
 * - Refresh functionality
 * - Preferences persistence in Supabase
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'

// ============================================================================
// Mock Setup
// ============================================================================

// Mock useAuth hook
const mockUseAuth = vi.fn()

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}))

// Mock Supabase client
const mockSupabaseRpc = vi.fn()

vi.mock('../../lib/supabase', () => ({
  supabase: {
    rpc: (fnName: string, params: unknown) => mockSupabaseRpc(fnName, params),
  },
}))

// Import the hook under test AFTER mocking dependencies
import {
  useNotificationSettings,
  type NotificationPreferences,
  type NotificationSettingsResult,
  type UseNotificationSettingsResult,
} from '../../hooks/useNotificationSettings'

// ============================================================================
// Test Constants
// ============================================================================

const TEST_USER_ID = 'test-user-123'

const DEFAULT_AUTH_STATE = {
  userId: TEST_USER_ID,
  isAuthenticated: true,
  isLoading: false,
  profile: null,
  session: null,
  user: null,
  signUp: vi.fn(),
  signIn: vi.fn(),
  signOut: vi.fn(),
  resetPassword: vi.fn(),
  updatePassword: vi.fn(),
  refreshProfile: vi.fn(),
  updateProfile: vi.fn(),
}

const UNAUTHENTICATED_STATE = {
  ...DEFAULT_AUTH_STATE,
  userId: null,
  isAuthenticated: false,
}

// ============================================================================
// Setup and Teardown
// ============================================================================

describe('useNotificationSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Default auth state (authenticated)
    mockUseAuth.mockReturnValue(DEFAULT_AUTH_STATE)

    // Default Supabase RPC responses
    mockSupabaseRpc.mockImplementation((fnName: string) => {
      if (fnName === 'get_notification_preferences') {
        return Promise.resolve({
          data: [
            {
              match_notifications: true,
              message_notifications: true,
            },
          ],
          error: null,
        })
      }
      if (fnName === 'upsert_notification_preferences') {
        return Promise.resolve({
          data: null,
          error: null,
        })
      }
      return Promise.resolve({ data: null, error: null })
    })
  })

  // ============================================================================
  // Initial State Tests
  // ============================================================================

  describe('initial state', () => {
    it('returns default values while loading', () => {
      const { result } = renderHook(() => useNotificationSettings())

      // Initial state before load completes
      expect(result.current.isLoading).toBe(true)
      expect(result.current.isSaving).toBe(false)
      expect(result.current.error).toBeNull()
    })

    it('loads preferences from database on mount', async () => {
      mockSupabaseRpc.mockImplementation((fnName: string) => {
        if (fnName === 'get_notification_preferences') {
          return Promise.resolve({
            data: [
              {
                match_notifications: false,
                message_notifications: true,
              },
            ],
            error: null,
          })
        }
        return Promise.resolve({ data: null, error: null })
      })

      const { result } = renderHook(() => useNotificationSettings())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.matchNotificationsEnabled).toBe(false)
      expect(result.current.messageNotificationsEnabled).toBe(true)
    })

    it('calls get_notification_preferences with correct user ID', async () => {
      const { result } = renderHook(() => useNotificationSettings())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(mockSupabaseRpc).toHaveBeenCalledWith('get_notification_preferences', {
        p_user_id: TEST_USER_ID,
      })
    })

    it('uses default preferences when no data exists', async () => {
      mockSupabaseRpc.mockImplementation((fnName: string) => {
        if (fnName === 'get_notification_preferences') {
          return Promise.resolve({
            data: [],
            error: null,
          })
        }
        return Promise.resolve({ data: null, error: null })
      })

      const { result } = renderHook(() => useNotificationSettings())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.matchNotificationsEnabled).toBe(true)
      expect(result.current.messageNotificationsEnabled).toBe(true)
    })

    it('uses default preferences when user is not authenticated', async () => {
      mockUseAuth.mockReturnValue(UNAUTHENTICATED_STATE)

      const { result } = renderHook(() => useNotificationSettings())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.matchNotificationsEnabled).toBe(true)
      expect(result.current.messageNotificationsEnabled).toBe(true)
      expect(mockSupabaseRpc).not.toHaveBeenCalledWith(
        'get_notification_preferences',
        expect.any(Object)
      )
    })
  })

  // ============================================================================
  // Loading Preferences Tests
  // ============================================================================

  describe('loading preferences', () => {
    it('sets isLoading to true initially', () => {
      const { result } = renderHook(() => useNotificationSettings())

      expect(result.current.isLoading).toBe(true)
    })

    it('sets isLoading to false after load completes', async () => {
      const { result } = renderHook(() => useNotificationSettings())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })
    })

    it('handles RPC error gracefully', async () => {
      mockSupabaseRpc.mockImplementation((fnName: string) => {
        if (fnName === 'get_notification_preferences') {
          return Promise.resolve({
            data: null,
            error: { message: 'Database connection failed' },
          })
        }
        return Promise.resolve({ data: null, error: null })
      })

      const { result } = renderHook(() => useNotificationSettings())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.error).toContain('Failed to load notification preferences')
      expect(result.current.error).toContain('Database connection failed')
      // Should fall back to defaults
      expect(result.current.matchNotificationsEnabled).toBe(true)
      expect(result.current.messageNotificationsEnabled).toBe(true)
    })

    it('handles exception during load gracefully', async () => {
      mockSupabaseRpc.mockImplementation((fnName: string) => {
        if (fnName === 'get_notification_preferences') {
          return Promise.reject(new Error('Network error'))
        }
        return Promise.resolve({ data: null, error: null })
      })

      const { result } = renderHook(() => useNotificationSettings())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.error).toContain('Failed to load notification preferences')
      expect(result.current.error).toContain('Network error')
      // Should fall back to defaults
      expect(result.current.matchNotificationsEnabled).toBe(true)
    })

    it('handles null values in database response', async () => {
      mockSupabaseRpc.mockImplementation((fnName: string) => {
        if (fnName === 'get_notification_preferences') {
          return Promise.resolve({
            data: [
              {
                match_notifications: null,
                message_notifications: null,
              },
            ],
            error: null,
          })
        }
        return Promise.resolve({ data: null, error: null })
      })

      const { result } = renderHook(() => useNotificationSettings())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      // Null values should default to true
      expect(result.current.matchNotificationsEnabled).toBe(true)
      expect(result.current.messageNotificationsEnabled).toBe(true)
    })
  })

  // ============================================================================
  // Toggle Match Notifications Tests
  // ============================================================================

  describe('toggleMatchNotifications', () => {
    it('toggles match notifications from true to false', async () => {
      mockSupabaseRpc.mockImplementation((fnName: string) => {
        if (fnName === 'get_notification_preferences') {
          return Promise.resolve({
            data: [{ match_notifications: true, message_notifications: true }],
            error: null,
          })
        }
        if (fnName === 'upsert_notification_preferences') {
          return Promise.resolve({ data: null, error: null })
        }
        return Promise.resolve({ data: null, error: null })
      })

      const { result } = renderHook(() => useNotificationSettings())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.matchNotificationsEnabled).toBe(true)

      await act(async () => {
        await result.current.toggleMatchNotifications()
      })

      expect(result.current.matchNotificationsEnabled).toBe(false)
    })

    it('toggles match notifications from false to true', async () => {
      mockSupabaseRpc.mockImplementation((fnName: string) => {
        if (fnName === 'get_notification_preferences') {
          return Promise.resolve({
            data: [{ match_notifications: false, message_notifications: true }],
            error: null,
          })
        }
        if (fnName === 'upsert_notification_preferences') {
          return Promise.resolve({ data: null, error: null })
        }
        return Promise.resolve({ data: null, error: null })
      })

      const { result } = renderHook(() => useNotificationSettings())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.matchNotificationsEnabled).toBe(false)

      await act(async () => {
        await result.current.toggleMatchNotifications()
      })

      expect(result.current.matchNotificationsEnabled).toBe(true)
    })

    it('calls upsert_notification_preferences with correct parameters', async () => {
      const { result } = renderHook(() => useNotificationSettings())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      await act(async () => {
        await result.current.toggleMatchNotifications()
      })

      expect(mockSupabaseRpc).toHaveBeenCalledWith('upsert_notification_preferences', {
        p_user_id: TEST_USER_ID,
        p_match_notifications: false,
        p_message_notifications: true,
      })
    })

    it('returns success result on successful toggle', async () => {
      const { result } = renderHook(() => useNotificationSettings())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      let toggleResult: NotificationSettingsResult | undefined

      await act(async () => {
        toggleResult = await result.current.toggleMatchNotifications()
      })

      expect(toggleResult?.success).toBe(true)
      expect(toggleResult?.error).toBeNull()
    })

    it('returns error result when user is not authenticated', async () => {
      mockUseAuth.mockReturnValue(UNAUTHENTICATED_STATE)

      const { result } = renderHook(() => useNotificationSettings())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      let toggleResult: NotificationSettingsResult | undefined

      await act(async () => {
        toggleResult = await result.current.toggleMatchNotifications()
      })

      expect(toggleResult?.success).toBe(false)
      expect(toggleResult?.error).toContain('authenticated')
    })

    it('sets isSaving during toggle operation', async () => {
      let resolveSave: (value: unknown) => void = () => {}

      mockSupabaseRpc.mockImplementation((fnName: string) => {
        if (fnName === 'get_notification_preferences') {
          return Promise.resolve({
            data: [{ match_notifications: true, message_notifications: true }],
            error: null,
          })
        }
        if (fnName === 'upsert_notification_preferences') {
          return new Promise((resolve) => {
            resolveSave = resolve
          })
        }
        return Promise.resolve({ data: null, error: null })
      })

      const { result } = renderHook(() => useNotificationSettings())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      let togglePromise: Promise<NotificationSettingsResult>

      act(() => {
        togglePromise = result.current.toggleMatchNotifications()
      })

      await waitFor(() => {
        expect(result.current.isSaving).toBe(true)
      })

      await act(async () => {
        resolveSave({ data: null, error: null })
        await togglePromise
      })

      expect(result.current.isSaving).toBe(false)
    })

    it('handles save error and sets error state', async () => {
      mockSupabaseRpc.mockImplementation((fnName: string) => {
        if (fnName === 'get_notification_preferences') {
          return Promise.resolve({
            data: [{ match_notifications: true, message_notifications: true }],
            error: null,
          })
        }
        if (fnName === 'upsert_notification_preferences') {
          return Promise.resolve({
            data: null,
            error: { message: 'Save failed' },
          })
        }
        return Promise.resolve({ data: null, error: null })
      })

      const { result } = renderHook(() => useNotificationSettings())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      let toggleResult: NotificationSettingsResult | undefined

      await act(async () => {
        toggleResult = await result.current.toggleMatchNotifications()
      })

      expect(toggleResult?.success).toBe(false)
      expect(toggleResult?.error).toContain('Save failed')
      expect(result.current.error).toContain('Save failed')
    })
  })

  // ============================================================================
  // Toggle Message Notifications Tests
  // ============================================================================

  describe('toggleMessageNotifications', () => {
    it('toggles message notifications from true to false', async () => {
      const { result } = renderHook(() => useNotificationSettings())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.messageNotificationsEnabled).toBe(true)

      await act(async () => {
        await result.current.toggleMessageNotifications()
      })

      expect(result.current.messageNotificationsEnabled).toBe(false)
    })

    it('toggles message notifications from false to true', async () => {
      mockSupabaseRpc.mockImplementation((fnName: string) => {
        if (fnName === 'get_notification_preferences') {
          return Promise.resolve({
            data: [{ match_notifications: true, message_notifications: false }],
            error: null,
          })
        }
        if (fnName === 'upsert_notification_preferences') {
          return Promise.resolve({ data: null, error: null })
        }
        return Promise.resolve({ data: null, error: null })
      })

      const { result } = renderHook(() => useNotificationSettings())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.messageNotificationsEnabled).toBe(false)

      await act(async () => {
        await result.current.toggleMessageNotifications()
      })

      expect(result.current.messageNotificationsEnabled).toBe(true)
    })

    it('calls upsert_notification_preferences with correct parameters', async () => {
      const { result } = renderHook(() => useNotificationSettings())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      await act(async () => {
        await result.current.toggleMessageNotifications()
      })

      expect(mockSupabaseRpc).toHaveBeenCalledWith('upsert_notification_preferences', {
        p_user_id: TEST_USER_ID,
        p_match_notifications: true,
        p_message_notifications: false,
      })
    })

    it('returns success result on successful toggle', async () => {
      const { result } = renderHook(() => useNotificationSettings())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      let toggleResult: NotificationSettingsResult | undefined

      await act(async () => {
        toggleResult = await result.current.toggleMessageNotifications()
      })

      expect(toggleResult?.success).toBe(true)
      expect(toggleResult?.error).toBeNull()
    })
  })

  // ============================================================================
  // Set Match Notifications Tests
  // ============================================================================

  describe('setMatchNotifications', () => {
    it('sets match notifications to specified value', async () => {
      const { result } = renderHook(() => useNotificationSettings())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      await act(async () => {
        await result.current.setMatchNotifications(false)
      })

      expect(result.current.matchNotificationsEnabled).toBe(false)
    })

    it('skips save when value is unchanged', async () => {
      const { result } = renderHook(() => useNotificationSettings())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      // Clear mocks to track new calls
      mockSupabaseRpc.mockClear()

      // Set to same value (true)
      let setResult: NotificationSettingsResult | undefined

      await act(async () => {
        setResult = await result.current.setMatchNotifications(true)
      })

      // Should not have called upsert
      expect(mockSupabaseRpc).not.toHaveBeenCalledWith(
        'upsert_notification_preferences',
        expect.any(Object)
      )
      expect(setResult?.success).toBe(true)
      expect(setResult?.error).toBeNull()
    })

    it('calls upsert when value changes', async () => {
      const { result } = renderHook(() => useNotificationSettings())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      await act(async () => {
        await result.current.setMatchNotifications(false)
      })

      expect(mockSupabaseRpc).toHaveBeenCalledWith('upsert_notification_preferences', {
        p_user_id: TEST_USER_ID,
        p_match_notifications: false,
        p_message_notifications: true,
      })
    })

    it('returns error when user is not authenticated', async () => {
      mockUseAuth.mockReturnValue(UNAUTHENTICATED_STATE)

      const { result } = renderHook(() => useNotificationSettings())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      let setResult: NotificationSettingsResult | undefined

      await act(async () => {
        setResult = await result.current.setMatchNotifications(false)
      })

      expect(setResult?.success).toBe(false)
      expect(setResult?.error).toContain('authenticated')
    })
  })

  // ============================================================================
  // Set Message Notifications Tests
  // ============================================================================

  describe('setMessageNotifications', () => {
    it('sets message notifications to specified value', async () => {
      const { result } = renderHook(() => useNotificationSettings())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      await act(async () => {
        await result.current.setMessageNotifications(false)
      })

      expect(result.current.messageNotificationsEnabled).toBe(false)
    })

    it('skips save when value is unchanged', async () => {
      const { result } = renderHook(() => useNotificationSettings())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      // Clear mocks to track new calls
      mockSupabaseRpc.mockClear()

      // Set to same value (true)
      let setResult: NotificationSettingsResult | undefined

      await act(async () => {
        setResult = await result.current.setMessageNotifications(true)
      })

      // Should not have called upsert
      expect(mockSupabaseRpc).not.toHaveBeenCalledWith(
        'upsert_notification_preferences',
        expect.any(Object)
      )
      expect(setResult?.success).toBe(true)
      expect(setResult?.error).toBeNull()
    })

    it('calls upsert when value changes', async () => {
      const { result } = renderHook(() => useNotificationSettings())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      await act(async () => {
        await result.current.setMessageNotifications(false)
      })

      expect(mockSupabaseRpc).toHaveBeenCalledWith('upsert_notification_preferences', {
        p_user_id: TEST_USER_ID,
        p_match_notifications: true,
        p_message_notifications: false,
      })
    })
  })

  // ============================================================================
  // Refresh Tests
  // ============================================================================

  describe('refresh', () => {
    it('reloads preferences from database', async () => {
      let callCount = 0

      mockSupabaseRpc.mockImplementation((fnName: string) => {
        if (fnName === 'get_notification_preferences') {
          callCount++
          return Promise.resolve({
            data: [
              {
                match_notifications: callCount === 1 ? true : false,
                message_notifications: true,
              },
            ],
            error: null,
          })
        }
        return Promise.resolve({ data: null, error: null })
      })

      const { result } = renderHook(() => useNotificationSettings())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.matchNotificationsEnabled).toBe(true)

      await act(async () => {
        await result.current.refresh()
      })

      expect(result.current.matchNotificationsEnabled).toBe(false)
      expect(mockSupabaseRpc).toHaveBeenCalledWith(
        'get_notification_preferences',
        expect.any(Object)
      )
    })

    it('sets isLoading during refresh', async () => {
      let resolveLoad: (value: unknown) => void = () => {}

      mockSupabaseRpc.mockImplementation((fnName: string) => {
        if (fnName === 'get_notification_preferences') {
          return new Promise((resolve) => {
            resolveLoad = resolve
          })
        }
        return Promise.resolve({ data: null, error: null })
      })

      const { result } = renderHook(() => useNotificationSettings())

      // Initially loading
      expect(result.current.isLoading).toBe(true)

      await act(async () => {
        resolveLoad({
          data: [{ match_notifications: true, message_notifications: true }],
          error: null,
        })
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      // Start refresh
      let refreshPromise: Promise<void>

      act(() => {
        refreshPromise = result.current.refresh()
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(true)
      })

      await act(async () => {
        resolveLoad({
          data: [{ match_notifications: true, message_notifications: true }],
          error: null,
        })
        await refreshPromise
      })

      expect(result.current.isLoading).toBe(false)
    })
  })

  // ============================================================================
  // Error Handling Tests
  // ============================================================================

  describe('error handling', () => {
    it('clears error when load succeeds after previous error', async () => {
      // First call fails
      mockSupabaseRpc.mockImplementationOnce((fnName: string) => {
        if (fnName === 'get_notification_preferences') {
          return Promise.resolve({
            data: null,
            error: { message: 'Initial error' },
          })
        }
        return Promise.resolve({ data: null, error: null })
      })

      const { result } = renderHook(() => useNotificationSettings())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.error).toContain('Initial error')

      // Setup success for refresh
      mockSupabaseRpc.mockImplementation((fnName: string) => {
        if (fnName === 'get_notification_preferences') {
          return Promise.resolve({
            data: [{ match_notifications: true, message_notifications: true }],
            error: null,
          })
        }
        return Promise.resolve({ data: null, error: null })
      })

      await act(async () => {
        await result.current.refresh()
      })

      expect(result.current.error).toBeNull()
    })

    it('handles non-Error exceptions during save', async () => {
      mockSupabaseRpc.mockImplementation((fnName: string) => {
        if (fnName === 'get_notification_preferences') {
          return Promise.resolve({
            data: [{ match_notifications: true, message_notifications: true }],
            error: null,
          })
        }
        if (fnName === 'upsert_notification_preferences') {
          return Promise.reject('String error')
        }
        return Promise.resolve({ data: null, error: null })
      })

      const { result } = renderHook(() => useNotificationSettings())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      let toggleResult: NotificationSettingsResult | undefined

      await act(async () => {
        toggleResult = await result.current.toggleMatchNotifications()
      })

      expect(toggleResult?.success).toBe(false)
      expect(toggleResult?.error).toContain('unknown error')
    })

    it('handles non-Error exceptions during load', async () => {
      mockSupabaseRpc.mockImplementation((fnName: string) => {
        if (fnName === 'get_notification_preferences') {
          return Promise.reject('Non-error exception')
        }
        return Promise.resolve({ data: null, error: null })
      })

      const { result } = renderHook(() => useNotificationSettings())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.error).toContain('unknown error')
    })
  })

  // ============================================================================
  // Unauthenticated User Tests
  // ============================================================================

  describe('unauthenticated user', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue(UNAUTHENTICATED_STATE)
    })

    it('returns default preferences without database call', async () => {
      const { result } = renderHook(() => useNotificationSettings())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.matchNotificationsEnabled).toBe(true)
      expect(result.current.messageNotificationsEnabled).toBe(true)
      expect(mockSupabaseRpc).not.toHaveBeenCalledWith(
        'get_notification_preferences',
        expect.any(Object)
      )
    })

    it('returns error when trying to toggle match notifications', async () => {
      const { result } = renderHook(() => useNotificationSettings())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      let toggleResult: NotificationSettingsResult | undefined

      await act(async () => {
        toggleResult = await result.current.toggleMatchNotifications()
      })

      expect(toggleResult?.success).toBe(false)
      expect(toggleResult?.error).toContain('authenticated')
    })

    it('returns error when trying to toggle message notifications', async () => {
      const { result } = renderHook(() => useNotificationSettings())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      let toggleResult: NotificationSettingsResult | undefined

      await act(async () => {
        toggleResult = await result.current.toggleMessageNotifications()
      })

      expect(toggleResult?.success).toBe(false)
      expect(toggleResult?.error).toContain('authenticated')
    })

    it('returns error when trying to set match notifications', async () => {
      const { result } = renderHook(() => useNotificationSettings())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      let setResult: NotificationSettingsResult | undefined

      await act(async () => {
        setResult = await result.current.setMatchNotifications(false)
      })

      expect(setResult?.success).toBe(false)
      expect(setResult?.error).toContain('authenticated')
    })

    it('returns error when trying to set message notifications', async () => {
      const { result } = renderHook(() => useNotificationSettings())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      let setResult: NotificationSettingsResult | undefined

      await act(async () => {
        setResult = await result.current.setMessageNotifications(false)
      })

      expect(setResult?.success).toBe(false)
      expect(setResult?.error).toContain('authenticated')
    })
  })

  // ============================================================================
  // Type Exports Tests
  // ============================================================================

  describe('type exports', () => {
    it('NotificationPreferences type is usable', () => {
      const prefs: NotificationPreferences = {
        matchNotifications: true,
        messageNotifications: false,
      }
      expect(prefs.matchNotifications).toBe(true)
      expect(prefs.messageNotifications).toBe(false)
    })

    it('NotificationSettingsResult type is usable', () => {
      const result: NotificationSettingsResult = {
        success: true,
        error: null,
      }
      expect(result.success).toBe(true)
      expect(result.error).toBeNull()
    })

    it('UseNotificationSettingsResult type is usable', () => {
      // Just verify the type compiles correctly by referencing it
      const verifyType = (result: UseNotificationSettingsResult) => {
        expect(typeof result.matchNotificationsEnabled).toBe('boolean')
        expect(typeof result.messageNotificationsEnabled).toBe('boolean')
        expect(typeof result.toggleMatchNotifications).toBe('function')
        expect(typeof result.toggleMessageNotifications).toBe('function')
        expect(typeof result.setMatchNotifications).toBe('function')
        expect(typeof result.setMessageNotifications).toBe('function')
        expect(typeof result.isLoading).toBe('boolean')
        expect(typeof result.isSaving).toBe('boolean')
        expect(typeof result.refresh).toBe('function')
      }

      // The test verifies that the type is properly exported
      expect(verifyType).toBeDefined()
    })
  })

  // ============================================================================
  // Edge Cases Tests
  // ============================================================================

  describe('edge cases', () => {
    it('handles multiple rapid toggle calls', async () => {
      const { result } = renderHook(() => useNotificationSettings())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      // Rapid toggles
      await act(async () => {
        await Promise.all([
          result.current.toggleMatchNotifications(),
          result.current.toggleMatchNotifications(),
          result.current.toggleMatchNotifications(),
        ])
      })

      // Final state should reflect all toggles (odd number = flipped)
      expect(result.current.matchNotificationsEnabled).toBe(false)
    })

    it('handles both toggles called sequentially', async () => {
      const { result } = renderHook(() => useNotificationSettings())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      // Toggle match notifications first
      await act(async () => {
        await result.current.toggleMatchNotifications()
      })

      // Then toggle message notifications
      await act(async () => {
        await result.current.toggleMessageNotifications()
      })

      // Both should be toggled
      expect(result.current.matchNotificationsEnabled).toBe(false)
      expect(result.current.messageNotificationsEnabled).toBe(false)
    })

    it('handles auth state change from authenticated to unauthenticated', async () => {
      const { result, rerender } = renderHook(() => useNotificationSettings())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.matchNotificationsEnabled).toBe(true)

      // Change to unauthenticated
      mockUseAuth.mockReturnValue(UNAUTHENTICATED_STATE)

      rerender()

      // Should now return error on toggle
      let toggleResult: NotificationSettingsResult | undefined

      await act(async () => {
        toggleResult = await result.current.toggleMatchNotifications()
      })

      expect(toggleResult?.success).toBe(false)
    })

    it('preserves message notification value when toggling match notifications', async () => {
      mockSupabaseRpc.mockImplementation((fnName: string) => {
        if (fnName === 'get_notification_preferences') {
          return Promise.resolve({
            data: [{ match_notifications: true, message_notifications: false }],
            error: null,
          })
        }
        if (fnName === 'upsert_notification_preferences') {
          return Promise.resolve({ data: null, error: null })
        }
        return Promise.resolve({ data: null, error: null })
      })

      const { result } = renderHook(() => useNotificationSettings())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.matchNotificationsEnabled).toBe(true)
      expect(result.current.messageNotificationsEnabled).toBe(false)

      await act(async () => {
        await result.current.toggleMatchNotifications()
      })

      // Match should be toggled, message should be preserved
      expect(result.current.matchNotificationsEnabled).toBe(false)
      expect(result.current.messageNotificationsEnabled).toBe(false)
    })

    it('preserves match notification value when toggling message notifications', async () => {
      mockSupabaseRpc.mockImplementation((fnName: string) => {
        if (fnName === 'get_notification_preferences') {
          return Promise.resolve({
            data: [{ match_notifications: false, message_notifications: true }],
            error: null,
          })
        }
        if (fnName === 'upsert_notification_preferences') {
          return Promise.resolve({ data: null, error: null })
        }
        return Promise.resolve({ data: null, error: null })
      })

      const { result } = renderHook(() => useNotificationSettings())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.matchNotificationsEnabled).toBe(false)
      expect(result.current.messageNotificationsEnabled).toBe(true)

      await act(async () => {
        await result.current.toggleMessageNotifications()
      })

      // Message should be toggled, match should be preserved
      expect(result.current.matchNotificationsEnabled).toBe(false)
      expect(result.current.messageNotificationsEnabled).toBe(false)
    })
  })
})
