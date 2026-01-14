/**
 * Tests for useCheckinSettings hook
 *
 * Tests the functionality for managing user check-in/tracking settings.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'

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

import { useCheckinSettings } from '../useCheckinSettings'

describe('useCheckinSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Default: authenticated user
    mockUseAuth.mockReturnValue({
      userId: 'test-user-123',
      isAuthenticated: true,
    })

    // Default: RPC returns success with default settings
    mockRpc.mockResolvedValue({
      data: {
        success: true,
        always_on_tracking_enabled: false,
        checkin_prompt_minutes: 5,
      },
      error: null,
    })
  })

  describe('initial state', () => {
    it('should start with loading state', () => {
      // Mock RPC to return pending promise
      mockRpc.mockReturnValue(new Promise(() => {}))

      const { result } = renderHook(() => useCheckinSettings())

      expect(result.current.isLoading).toBe(true)
      expect(result.current.settings.always_on_tracking_enabled).toBe(false)
      expect(result.current.settings.checkin_prompt_minutes).toBe(5)
    })

    it('should use default settings when not authenticated', async () => {
      mockUseAuth.mockReturnValue({
        userId: null,
        isAuthenticated: false,
      })

      const { result } = renderHook(() => useCheckinSettings())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.settings.always_on_tracking_enabled).toBe(false)
      expect(result.current.settings.checkin_prompt_minutes).toBe(5)
    })
  })

  describe('fetchSettings', () => {
    it('should fetch settings from server', async () => {
      mockRpc.mockResolvedValue({
        data: {
          success: true,
          always_on_tracking_enabled: true,
          checkin_prompt_minutes: 15,
        },
        error: null,
      })

      const { result } = renderHook(() => useCheckinSettings())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.settings.always_on_tracking_enabled).toBe(true)
      expect(result.current.settings.checkin_prompt_minutes).toBe(15)
    })

    it('should handle fetch error', async () => {
      mockRpc.mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      })

      const { result } = renderHook(() => useCheckinSettings())

      await waitFor(() => {
        expect(result.current.error).not.toBeNull()
      })

      expect(result.current.error?.code).toBe('FETCH_ERROR')
      expect(result.current.error?.message).toBe('Database error')
    })
  })

  describe('updateSettings', () => {
    it('should update settings successfully', async () => {
      // First call for fetch, second for update
      mockRpc
        .mockResolvedValueOnce({
          data: {
            success: true,
            always_on_tracking_enabled: false,
            checkin_prompt_minutes: 5,
          },
          error: null,
        })
        .mockResolvedValueOnce({
          data: {
            success: true,
            always_on_tracking_enabled: true,
            checkin_prompt_minutes: 30,
          },
          error: null,
        })

      const { result } = renderHook(() => useCheckinSettings())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      let success: boolean = false
      await act(async () => {
        success = await result.current.updateSettings({
          always_on_tracking_enabled: true,
          checkin_prompt_minutes: 30,
        })
      })

      expect(success).toBe(true)
      expect(result.current.settings.always_on_tracking_enabled).toBe(true)
      expect(result.current.settings.checkin_prompt_minutes).toBe(30)
    })

    it('should handle update error', async () => {
      mockRpc
        .mockResolvedValueOnce({
          data: {
            success: true,
            always_on_tracking_enabled: false,
            checkin_prompt_minutes: 5,
          },
          error: null,
        })
        .mockResolvedValueOnce({
          data: null,
          error: { message: 'Update failed' },
        })

      const { result } = renderHook(() => useCheckinSettings())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      let success: boolean = true
      await act(async () => {
        success = await result.current.updateSettings({
          always_on_tracking_enabled: true,
        })
      })

      expect(success).toBe(false)
      expect(result.current.error?.code).toBe('UPDATE_ERROR')
    })
  })

  describe('toggleAlwaysOn', () => {
    it('should toggle always_on_tracking_enabled', async () => {
      mockRpc
        .mockResolvedValueOnce({
          data: {
            success: true,
            always_on_tracking_enabled: false,
            checkin_prompt_minutes: 5,
          },
          error: null,
        })
        .mockResolvedValueOnce({
          data: {
            success: true,
            always_on_tracking_enabled: true,
            checkin_prompt_minutes: 5,
          },
          error: null,
        })

      const { result } = renderHook(() => useCheckinSettings())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.settings.always_on_tracking_enabled).toBe(false)

      let success: boolean = false
      await act(async () => {
        success = await result.current.toggleAlwaysOn()
      })

      expect(success).toBe(true)
      expect(result.current.settings.always_on_tracking_enabled).toBe(true)
    })
  })

  describe('disabled state', () => {
    it('should not fetch when enabled is false', () => {
      renderHook(() => useCheckinSettings({ enabled: false }))

      expect(mockRpc).not.toHaveBeenCalled()
    })
  })
})
