/**
 * Tests for hooks/useSparkNotificationSettings.ts
 *
 * Tests spark notification settings management hook.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'

// Mock supabase
const mockFrom = vi.fn()
const mockSelect = vi.fn()
const mockEq = vi.fn()
const mockSingle = vi.fn()
const mockUpsert = vi.fn()

vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}))

// Mock useAuth
const mockUseAuth = vi.fn()
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}))

import { useSparkNotificationSettings } from '../useSparkNotificationSettings'

describe('useSparkNotificationSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Default: authenticated user
    mockUseAuth.mockReturnValue({
      userId: 'user-123',
      isAuthenticated: true,
    })

    // Set up mock chain
    mockFrom.mockReturnValue({ select: mockSelect, upsert: mockUpsert })
    mockSelect.mockReturnValue({ eq: mockEq })
    mockEq.mockReturnValue({ single: mockSingle })

    // Default: spark notifications enabled
    mockSingle.mockResolvedValue({
      data: { spark_notifications: true },
      error: null,
    })

    mockUpsert.mockResolvedValue({ error: null })
  })

  describe('initial state', () => {
    it('should start with loading true', () => {
      const { result } = renderHook(() => useSparkNotificationSettings())

      expect(result.current.isLoading).toBe(true)
    })

    it('should load spark notification preference on mount', async () => {
      const { result } = renderHook(() => useSparkNotificationSettings())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(mockFrom).toHaveBeenCalledWith('notification_preferences')
      expect(mockSelect).toHaveBeenCalledWith('spark_notifications')
      expect(mockEq).toHaveBeenCalledWith('user_id', 'user-123')
    })

    it('should set sparkNotificationsEnabled from database', async () => {
      mockSingle.mockResolvedValue({
        data: { spark_notifications: false },
        error: null,
      })

      const { result } = renderHook(() => useSparkNotificationSettings())

      await waitFor(() => {
        expect(result.current.sparkNotificationsEnabled).toBe(false)
      })
    })

    it('should default to true when no row exists', async () => {
      mockSingle.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116', message: 'No rows' },
      })

      const { result } = renderHook(() => useSparkNotificationSettings())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.sparkNotificationsEnabled).toBe(true)
    })

    it('should use defaults when not authenticated', async () => {
      mockUseAuth.mockReturnValue({
        userId: null,
        isAuthenticated: false,
      })

      const { result } = renderHook(() => useSparkNotificationSettings())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.sparkNotificationsEnabled).toBe(true)
    })
  })

  describe('error handling', () => {
    it('should handle load error and default to true', async () => {
      mockSingle.mockResolvedValue({
        data: null,
        error: { code: 'OTHER', message: 'Database error' },
      })

      const { result } = renderHook(() => useSparkNotificationSettings())

      await waitFor(() => {
        expect(result.current.error).toContain('Failed to load')
        expect(result.current.sparkNotificationsEnabled).toBe(true)
      })
    })

    it('should handle exception during load', async () => {
      mockSingle.mockRejectedValue(new Error('Network error'))

      const { result } = renderHook(() => useSparkNotificationSettings())

      await waitFor(() => {
        expect(result.current.error).toContain('Failed to load')
      })
    })
  })

  describe('toggleSparkNotifications', () => {
    it('should toggle spark notifications on', async () => {
      mockSingle.mockResolvedValue({
        data: { spark_notifications: false },
        error: null,
      })

      const { result } = renderHook(() => useSparkNotificationSettings())

      await waitFor(() => {
        expect(result.current.sparkNotificationsEnabled).toBe(false)
      })

      await act(async () => {
        await result.current.toggleSparkNotifications()
      })

      expect(mockUpsert).toHaveBeenCalledWith(
        {
          user_id: 'user-123',
          spark_notifications: true,
        },
        { onConflict: 'user_id' }
      )
      expect(result.current.sparkNotificationsEnabled).toBe(true)
    })

    it('should toggle spark notifications off', async () => {
      mockSingle.mockResolvedValue({
        data: { spark_notifications: true },
        error: null,
      })

      const { result } = renderHook(() => useSparkNotificationSettings())

      await waitFor(() => {
        expect(result.current.sparkNotificationsEnabled).toBe(true)
      })

      await act(async () => {
        await result.current.toggleSparkNotifications()
      })

      expect(result.current.sparkNotificationsEnabled).toBe(false)
    })

    it('should return error when not authenticated', async () => {
      mockUseAuth.mockReturnValue({
        userId: null,
        isAuthenticated: false,
      })

      const { result } = renderHook(() => useSparkNotificationSettings())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      let toggleResult: { success: boolean; error: string | null }
      await act(async () => {
        toggleResult = await result.current.toggleSparkNotifications()
      })

      expect(toggleResult!.success).toBe(false)
      expect(toggleResult!.error).toContain('authenticated')
    })

    it('should handle save error', async () => {
      mockUpsert.mockResolvedValue({ error: { message: 'Save failed' } })

      const { result } = renderHook(() => useSparkNotificationSettings())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      let toggleResult: { success: boolean; error: string | null }
      await act(async () => {
        toggleResult = await result.current.toggleSparkNotifications()
      })

      expect(toggleResult!.success).toBe(false)
      expect(result.current.error).toContain('Failed to save')
    })
  })

  describe('setSparkNotifications', () => {
    it('should set spark notifications to specific value', async () => {
      mockSingle.mockResolvedValue({
        data: { spark_notifications: true },
        error: null,
      })

      const { result } = renderHook(() => useSparkNotificationSettings())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      await act(async () => {
        await result.current.setSparkNotifications(false)
      })

      expect(result.current.sparkNotificationsEnabled).toBe(false)
    })

    it('should not save if value is already set', async () => {
      mockSingle.mockResolvedValue({
        data: { spark_notifications: true },
        error: null,
      })

      const { result } = renderHook(() => useSparkNotificationSettings())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      mockUpsert.mockClear()

      let setResult: { success: boolean; error: string | null }
      await act(async () => {
        setResult = await result.current.setSparkNotifications(true)
      })

      expect(setResult!.success).toBe(true)
      expect(mockUpsert).not.toHaveBeenCalled()
    })
  })

  describe('refresh', () => {
    it('should reload preference from database', async () => {
      const { result } = renderHook(() => useSparkNotificationSettings())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      mockSingle.mockResolvedValue({
        data: { spark_notifications: false },
        error: null,
      })

      await act(async () => {
        await result.current.refresh()
      })

      expect(result.current.sparkNotificationsEnabled).toBe(false)
    })

    it('should set loading during refresh', async () => {
      let resolveQuery: (value: unknown) => void
      mockSingle.mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveQuery = resolve
          })
      )

      const { result } = renderHook(() => useSparkNotificationSettings())

      // Resolve initial load
      await act(async () => {
        resolveQuery!({ data: { spark_notifications: true }, error: null })
      })

      expect(result.current.isLoading).toBe(false)

      // Start refresh
      act(() => {
        result.current.refresh()
      })

      expect(result.current.isLoading).toBe(true)
    })
  })

  describe('isSaving state', () => {
    it('should set isSaving during save operation', async () => {
      let resolveUpsert: (value: unknown) => void
      mockUpsert.mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveUpsert = resolve
          })
      )

      const { result } = renderHook(() => useSparkNotificationSettings())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      act(() => {
        result.current.toggleSparkNotifications()
      })

      expect(result.current.isSaving).toBe(true)

      await act(async () => {
        resolveUpsert!({ error: null })
      })

      expect(result.current.isSaving).toBe(false)
    })
  })

  describe('handle null preference', () => {
    it('should default to true when spark_notifications is null', async () => {
      mockSingle.mockResolvedValue({
        data: { spark_notifications: null },
        error: null,
      })

      const { result } = renderHook(() => useSparkNotificationSettings())

      await waitFor(() => {
        expect(result.current.sparkNotificationsEnabled).toBe(true)
      })
    })
  })

  describe('save exception handling', () => {
    it('should handle exception during save', async () => {
      mockUpsert.mockRejectedValue(new Error('Network error'))

      const { result } = renderHook(() => useSparkNotificationSettings())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      let toggleResult: { success: boolean; error: string | null }
      await act(async () => {
        toggleResult = await result.current.toggleSparkNotifications()
      })

      expect(toggleResult!.success).toBe(false)
      expect(toggleResult!.error).toContain('Failed to save')
    })
  })
})
