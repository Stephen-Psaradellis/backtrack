/**
 * Tests for hooks/useNotificationSettings.ts
 *
 * Tests notification settings management hook with Supabase integration.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'

// Mock supabase
const mockRpc = vi.fn()
vi.mock('../../lib/supabase', () => ({
  supabase: {
    rpc: (...args: unknown[]) => mockRpc(...args),
  },
}))

// Mock useAuth
const mockUseAuth = vi.fn()
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}))

import { useNotificationSettings } from '../useNotificationSettings'

describe('useNotificationSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Default: authenticated user
    mockUseAuth.mockReturnValue({
      userId: 'user-123',
      isAuthenticated: true,
    })

    // Default: return existing preferences
    mockRpc.mockResolvedValue({
      data: [{ match_notifications: true, message_notifications: true }],
      error: null,
    })
  })

  describe('initial state', () => {
    it('should start with loading true', () => {
      const { result } = renderHook(() => useNotificationSettings())

      expect(result.current.isLoading).toBe(true)
    })

    it('should load preferences on mount', async () => {
      const { result } = renderHook(() => useNotificationSettings())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(mockRpc).toHaveBeenCalledWith('get_notification_preferences', {
        p_user_id: 'user-123',
      })
    })

    it('should set preferences from database', async () => {
      mockRpc.mockResolvedValue({
        data: [{ match_notifications: false, message_notifications: true }],
        error: null,
      })

      const { result } = renderHook(() => useNotificationSettings())

      await waitFor(() => {
        expect(result.current.matchNotificationsEnabled).toBe(false)
        expect(result.current.messageNotificationsEnabled).toBe(true)
      })
    })

    it('should use defaults when no preferences exist', async () => {
      mockRpc.mockResolvedValue({
        data: [],
        error: null,
      })

      const { result } = renderHook(() => useNotificationSettings())

      await waitFor(() => {
        expect(result.current.matchNotificationsEnabled).toBe(true)
        expect(result.current.messageNotificationsEnabled).toBe(true)
      })
    })

    it('should use defaults when not authenticated', async () => {
      mockUseAuth.mockReturnValue({
        userId: null,
        isAuthenticated: false,
      })

      const { result } = renderHook(() => useNotificationSettings())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(mockRpc).not.toHaveBeenCalled()
      expect(result.current.matchNotificationsEnabled).toBe(true)
      expect(result.current.messageNotificationsEnabled).toBe(true)
    })
  })

  describe('error handling', () => {
    it('should handle load error and use defaults', async () => {
      mockRpc.mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      })

      const { result } = renderHook(() => useNotificationSettings())

      await waitFor(() => {
        expect(result.current.error).toContain('Failed to load notification preferences')
        expect(result.current.matchNotificationsEnabled).toBe(true)
      })
    })

    it('should handle exception during load', async () => {
      mockRpc.mockRejectedValue(new Error('Network error'))

      const { result } = renderHook(() => useNotificationSettings())

      await waitFor(() => {
        expect(result.current.error).toContain('Failed to load notification preferences')
      })
    })
  })

  describe('toggleMatchNotifications', () => {
    it('should toggle match notifications on', async () => {
      mockRpc
        .mockResolvedValueOnce({
          data: [{ match_notifications: false, message_notifications: true }],
          error: null,
        })
        .mockResolvedValueOnce({ data: null, error: null })

      const { result } = renderHook(() => useNotificationSettings())

      await waitFor(() => {
        expect(result.current.matchNotificationsEnabled).toBe(false)
      })

      await act(async () => {
        await result.current.toggleMatchNotifications()
      })

      expect(mockRpc).toHaveBeenCalledWith('upsert_notification_preferences', {
        p_user_id: 'user-123',
        p_match_notifications: true,
        p_message_notifications: true,
      })
      expect(result.current.matchNotificationsEnabled).toBe(true)
    })

    it('should toggle match notifications off', async () => {
      mockRpc
        .mockResolvedValueOnce({
          data: [{ match_notifications: true, message_notifications: true }],
          error: null,
        })
        .mockResolvedValueOnce({ data: null, error: null })

      const { result } = renderHook(() => useNotificationSettings())

      await waitFor(() => {
        expect(result.current.matchNotificationsEnabled).toBe(true)
      })

      await act(async () => {
        await result.current.toggleMatchNotifications()
      })

      expect(result.current.matchNotificationsEnabled).toBe(false)
    })

    it('should return error when not authenticated', async () => {
      mockUseAuth.mockReturnValue({
        userId: null,
        isAuthenticated: false,
      })

      const { result } = renderHook(() => useNotificationSettings())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      let toggleResult: { success: boolean; error: string | null }
      await act(async () => {
        toggleResult = await result.current.toggleMatchNotifications()
      })

      expect(toggleResult!.success).toBe(false)
      expect(toggleResult!.error).toContain('authenticated')
    })

    it('should handle save error', async () => {
      mockRpc
        .mockResolvedValueOnce({
          data: [{ match_notifications: true, message_notifications: true }],
          error: null,
        })
        .mockResolvedValueOnce({ data: null, error: { message: 'Save failed' } })

      const { result } = renderHook(() => useNotificationSettings())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      let toggleResult: { success: boolean; error: string | null }
      await act(async () => {
        toggleResult = await result.current.toggleMatchNotifications()
      })

      expect(toggleResult!.success).toBe(false)
      expect(result.current.error).toContain('Failed to save')
    })
  })

  describe('toggleMessageNotifications', () => {
    it('should toggle message notifications', async () => {
      mockRpc
        .mockResolvedValueOnce({
          data: [{ match_notifications: true, message_notifications: true }],
          error: null,
        })
        .mockResolvedValueOnce({ data: null, error: null })

      const { result } = renderHook(() => useNotificationSettings())

      await waitFor(() => {
        expect(result.current.messageNotificationsEnabled).toBe(true)
      })

      await act(async () => {
        await result.current.toggleMessageNotifications()
      })

      expect(mockRpc).toHaveBeenCalledWith('upsert_notification_preferences', {
        p_user_id: 'user-123',
        p_match_notifications: true,
        p_message_notifications: false,
      })
      expect(result.current.messageNotificationsEnabled).toBe(false)
    })
  })

  describe('setMatchNotifications', () => {
    it('should set match notifications to specific value', async () => {
      mockRpc
        .mockResolvedValueOnce({
          data: [{ match_notifications: true, message_notifications: true }],
          error: null,
        })
        .mockResolvedValueOnce({ data: null, error: null })

      const { result } = renderHook(() => useNotificationSettings())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      await act(async () => {
        await result.current.setMatchNotifications(false)
      })

      expect(result.current.matchNotificationsEnabled).toBe(false)
    })

    it('should not save if value is already set', async () => {
      mockRpc.mockResolvedValue({
        data: [{ match_notifications: true, message_notifications: true }],
        error: null,
      })

      const { result } = renderHook(() => useNotificationSettings())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      mockRpc.mockClear()

      let setResult: { success: boolean; error: string | null }
      await act(async () => {
        setResult = await result.current.setMatchNotifications(true)
      })

      expect(setResult!.success).toBe(true)
      expect(mockRpc).not.toHaveBeenCalled()
    })
  })

  describe('setMessageNotifications', () => {
    it('should set message notifications to specific value', async () => {
      mockRpc
        .mockResolvedValueOnce({
          data: [{ match_notifications: true, message_notifications: true }],
          error: null,
        })
        .mockResolvedValueOnce({ data: null, error: null })

      const { result } = renderHook(() => useNotificationSettings())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      await act(async () => {
        await result.current.setMessageNotifications(false)
      })

      expect(result.current.messageNotificationsEnabled).toBe(false)
    })

    it('should not save if value is already set', async () => {
      mockRpc.mockResolvedValue({
        data: [{ match_notifications: true, message_notifications: true }],
        error: null,
      })

      const { result } = renderHook(() => useNotificationSettings())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      mockRpc.mockClear()

      let setResult: { success: boolean; error: string | null }
      await act(async () => {
        setResult = await result.current.setMessageNotifications(true)
      })

      expect(setResult!.success).toBe(true)
      expect(mockRpc).not.toHaveBeenCalled()
    })
  })

  describe('refresh', () => {
    it('should reload preferences from database', async () => {
      const { result } = renderHook(() => useNotificationSettings())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      mockRpc.mockClear()
      mockRpc.mockResolvedValue({
        data: [{ match_notifications: false, message_notifications: false }],
        error: null,
      })

      await act(async () => {
        await result.current.refresh()
      })

      expect(mockRpc).toHaveBeenCalledWith('get_notification_preferences', {
        p_user_id: 'user-123',
      })
      expect(result.current.matchNotificationsEnabled).toBe(false)
      expect(result.current.messageNotificationsEnabled).toBe(false)
    })

    it('should set loading during refresh', async () => {
      mockRpc.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ data: [], error: null }), 100))
      )

      const { result } = renderHook(() => useNotificationSettings())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      act(() => {
        result.current.refresh()
      })

      expect(result.current.isLoading).toBe(true)
    })
  })

  describe('isSaving state', () => {
    it('should set isSaving during save operation', async () => {
      mockRpc
        .mockResolvedValueOnce({
          data: [{ match_notifications: true, message_notifications: true }],
          error: null,
        })
        .mockImplementation(
          () => new Promise((resolve) => setTimeout(() => resolve({ data: null, error: null }), 100))
        )

      const { result } = renderHook(() => useNotificationSettings())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      act(() => {
        result.current.toggleMatchNotifications()
      })

      expect(result.current.isSaving).toBe(true)
    })
  })

  describe('handle null preferences', () => {
    it('should handle null in preference values', async () => {
      mockRpc.mockResolvedValue({
        data: [{ match_notifications: null, message_notifications: null }],
        error: null,
      })

      const { result } = renderHook(() => useNotificationSettings())

      await waitFor(() => {
        // Should default to true when null
        expect(result.current.matchNotificationsEnabled).toBe(true)
        expect(result.current.messageNotificationsEnabled).toBe(true)
      })
    })
  })

  describe('save exception handling', () => {
    it('should handle exception during save', async () => {
      mockRpc
        .mockResolvedValueOnce({
          data: [{ match_notifications: true, message_notifications: true }],
          error: null,
        })
        .mockRejectedValueOnce(new Error('Network error'))

      const { result } = renderHook(() => useNotificationSettings())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      let toggleResult: { success: boolean; error: string | null }
      await act(async () => {
        toggleResult = await result.current.toggleMatchNotifications()
      })

      expect(toggleResult!.success).toBe(false)
      expect(toggleResult!.error).toContain('Failed to save')
    })
  })
})
