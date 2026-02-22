/**
 * Tests for useGhostMode hook
 *
 * Tests ghost mode privacy feature including activation, deactivation,
 * time remaining display, and edge cases.
 */

import { vi, beforeEach, afterEach, describe, it, expect } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useGhostMode } from '../useGhostMode'

// ============================================================================
// MOCKS
// ============================================================================

// Mock supabase
const mockRpc = vi.fn()
vi.mock('../../lib/supabase', () => ({
  supabase: {
    rpc: (...args: any[]) => mockRpc(...args),
  },
}))

// Mock AuthContext
const mockRefreshProfile = vi.fn()
let mockProfile: any = null
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    profile: mockProfile,
    refreshProfile: mockRefreshProfile,
  }),
}))

// ============================================================================
// TEST SETUP
// ============================================================================

describe('useGhostMode', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockProfile = {
      id: 'test-user-id',
      ghost_mode_until: null,
    }
    mockRefreshProfile.mockResolvedValue(undefined)
  })

  afterEach(() => {
    vi.clearAllTimers()
    vi.useRealTimers()
  })

  // ==========================================================================
  // INITIAL STATE TESTS
  // ==========================================================================

  describe('Initial State', () => {
    it('should return inactive ghost mode when profile has no ghost_mode_until', () => {
      const { result } = renderHook(() => useGhostMode())

      expect(result.current.isGhostMode).toBe(false)
      expect(result.current.ghostModeUntil).toBeNull()
      expect(result.current.timeRemaining).toBeNull()
      expect(result.current.isLoading).toBe(false)
      expect(result.current.error).toBeNull()
    })

    it('should return active ghost mode when ghost_mode_until is in the future', () => {
      const futureDate = new Date(Date.now() + 2 * 60 * 60 * 1000) // 2 hours from now
      mockProfile.ghost_mode_until = futureDate.toISOString()

      const { result } = renderHook(() => useGhostMode())

      expect(result.current.isGhostMode).toBe(true)
      expect(result.current.ghostModeUntil).toEqual(futureDate)
      expect(result.current.timeRemaining).toMatch(/1h 5\dm|2h 0m/)
    })

    it('should return inactive ghost mode when ghost_mode_until is in the past', () => {
      const pastDate = new Date(Date.now() - 60 * 1000) // 1 minute ago
      mockProfile.ghost_mode_until = pastDate.toISOString()

      const { result } = renderHook(() => useGhostMode())

      expect(result.current.isGhostMode).toBe(false)
      expect(result.current.ghostModeUntil).not.toBeNull()
      expect(result.current.timeRemaining).toBeNull()
    })

    it('should return inactive state when not authenticated', () => {
      mockProfile = null

      const { result } = renderHook(() => useGhostMode())

      expect(result.current.isGhostMode).toBe(false)
      expect(result.current.ghostModeUntil).toBeNull()
      expect(result.current.timeRemaining).toBeNull()
    })
  })

  // ==========================================================================
  // ACTIVATE FUNCTION TESTS
  // ==========================================================================

  describe('activate', () => {
    it('should successfully activate ghost mode for 1 hour', async () => {
      const ghostModeUntil = new Date(Date.now() + 60 * 60 * 1000).toISOString()
      mockRpc.mockResolvedValue({
        data: {
          success: true,
          ghost_mode_until: ghostModeUntil,
          duration_minutes: 60,
        },
        error: null,
      })

      const { result } = renderHook(() => useGhostMode())

      let activateResult: any
      await act(async () => {
        activateResult = await result.current.activate('1h')
      })

      expect(mockRpc).toHaveBeenCalledWith('activate_ghost_mode', {
        p_user_id: 'test-user-id',
        p_duration: '1 hour',
      })
      expect(mockRefreshProfile).toHaveBeenCalled()
      expect(activateResult).toEqual({
        success: true,
        ghost_mode_until: ghostModeUntil,
        duration_minutes: 60,
      })
      expect(result.current.isLoading).toBe(false)
      expect(result.current.error).toBeNull()
    })

    it('should successfully activate ghost mode for 2 hours', async () => {
      const ghostModeUntil = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString()
      mockRpc.mockResolvedValue({
        data: {
          success: true,
          ghost_mode_until: ghostModeUntil,
          duration_minutes: 120,
        },
        error: null,
      })

      const { result } = renderHook(() => useGhostMode())

      await act(async () => {
        await result.current.activate('2h')
      })

      expect(mockRpc).toHaveBeenCalledWith('activate_ghost_mode', {
        p_user_id: 'test-user-id',
        p_duration: '2 hours',
      })
    })

    it('should successfully activate ghost mode for 4 hours', async () => {
      mockRpc.mockResolvedValue({
        data: {
          success: true,
          ghost_mode_until: new Date().toISOString(),
          duration_minutes: 240,
        },
        error: null,
      })

      const { result } = renderHook(() => useGhostMode())

      await act(async () => {
        await result.current.activate('4h')
      })

      expect(mockRpc).toHaveBeenCalledWith('activate_ghost_mode', {
        p_user_id: 'test-user-id',
        p_duration: '4 hours',
      })
    })

    it('should successfully activate ghost mode for session (4 hours)', async () => {
      mockRpc.mockResolvedValue({
        data: {
          success: true,
          ghost_mode_until: new Date().toISOString(),
          duration_minutes: 240,
        },
        error: null,
      })

      const { result } = renderHook(() => useGhostMode())

      await act(async () => {
        await result.current.activate('session')
      })

      expect(mockRpc).toHaveBeenCalledWith('activate_ghost_mode', {
        p_user_id: 'test-user-id',
        p_duration: '4 hours',
      })
    })

    it('should return error when not authenticated', async () => {
      mockProfile = null

      const { result } = renderHook(() => useGhostMode())

      let activateResult: any
      await act(async () => {
        activateResult = await result.current.activate('1h')
      })

      expect(mockRpc).not.toHaveBeenCalled()
      expect(activateResult).toEqual({
        success: false,
        ghost_mode_until: null,
        error: 'Not authenticated',
      })
      expect(result.current.error).toBe('Not authenticated')
    })

    it('should handle RPC error', async () => {
      mockRpc.mockResolvedValue({
        data: null,
        error: { message: 'Database connection failed' },
      })

      const { result } = renderHook(() => useGhostMode())

      let activateResult: any
      await act(async () => {
        activateResult = await result.current.activate('1h')
      })

      expect(activateResult).toEqual({
        success: false,
        ghost_mode_until: null,
        error: 'Database connection failed',
      })
      expect(result.current.error).toBe('Database connection failed')
    })

    it('should handle RPC returning success: false', async () => {
      mockRpc.mockResolvedValue({
        data: {
          success: false,
          error: 'Rate limit exceeded',
        },
        error: null,
      })

      const { result } = renderHook(() => useGhostMode())

      let activateResult: any
      await act(async () => {
        activateResult = await result.current.activate('1h')
      })

      expect(activateResult).toEqual({
        success: false,
        ghost_mode_until: null,
        error: 'Rate limit exceeded',
      })
      expect(result.current.error).toBe('Rate limit exceeded')
    })

    it('should handle RPC returning success: false without error message', async () => {
      mockRpc.mockResolvedValue({
        data: {
          success: false,
        },
        error: null,
      })

      const { result } = renderHook(() => useGhostMode())

      let activateResult: any
      await act(async () => {
        activateResult = await result.current.activate('1h')
      })

      expect(activateResult.error).toBe('Failed to activate ghost mode')
    })

    it('should handle network error/exception', async () => {
      mockRpc.mockRejectedValue(new Error('Network error'))

      const { result } = renderHook(() => useGhostMode())

      let activateResult: any
      await act(async () => {
        activateResult = await result.current.activate('1h')
      })

      expect(activateResult).toEqual({
        success: false,
        ghost_mode_until: null,
        error: 'Network error',
      })
      expect(result.current.error).toBe('Network error')
    })

    it('should handle non-Error exception', async () => {
      mockRpc.mockRejectedValue('String error')

      const { result } = renderHook(() => useGhostMode())

      let activateResult: any
      await act(async () => {
        activateResult = await result.current.activate('1h')
      })

      expect(activateResult.error).toBe('Failed to activate ghost mode')
    })

    it('should set isLoading true during activation', async () => {
      let resolveRpc: any
      mockRpc.mockReturnValue(
        new Promise((resolve) => {
          resolveRpc = resolve
        })
      )

      const { result } = renderHook(() => useGhostMode())

      act(() => {
        result.current.activate('1h')
      })

      // Should be loading
      expect(result.current.isLoading).toBe(true)

      // Resolve the RPC
      await act(async () => {
        resolveRpc({
          data: { success: true, ghost_mode_until: new Date().toISOString() },
          error: null,
        })
      })

      // Should no longer be loading
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })
    })
  })

  // ==========================================================================
  // DEACTIVATE FUNCTION TESTS
  // ==========================================================================

  describe('deactivate', () => {
    it('should successfully deactivate ghost mode', async () => {
      mockRpc.mockResolvedValue({
        data: {
          success: true,
        },
        error: null,
      })

      const { result } = renderHook(() => useGhostMode())

      let deactivateResult: any
      await act(async () => {
        deactivateResult = await result.current.deactivate()
      })

      expect(mockRpc).toHaveBeenCalledWith('deactivate_ghost_mode', {
        p_user_id: 'test-user-id',
      })
      expect(mockRefreshProfile).toHaveBeenCalled()
      expect(deactivateResult).toEqual({
        success: true,
        ghost_mode_until: null,
      })
      expect(result.current.isLoading).toBe(false)
      expect(result.current.error).toBeNull()
    })

    it('should return error when not authenticated', async () => {
      mockProfile = null

      const { result } = renderHook(() => useGhostMode())

      let deactivateResult: any
      await act(async () => {
        deactivateResult = await result.current.deactivate()
      })

      expect(mockRpc).not.toHaveBeenCalled()
      expect(deactivateResult).toEqual({
        success: false,
        ghost_mode_until: null,
        error: 'Not authenticated',
      })
      expect(result.current.error).toBe('Not authenticated')
    })

    it('should handle RPC error', async () => {
      mockRpc.mockResolvedValue({
        data: null,
        error: { message: 'Permission denied' },
      })

      const { result } = renderHook(() => useGhostMode())

      let deactivateResult: any
      await act(async () => {
        deactivateResult = await result.current.deactivate()
      })

      expect(deactivateResult).toEqual({
        success: false,
        ghost_mode_until: null,
        error: 'Permission denied',
      })
      expect(result.current.error).toBe('Permission denied')
    })

    it('should handle RPC returning success: false', async () => {
      mockRpc.mockResolvedValue({
        data: {
          success: false,
          error: 'Ghost mode not active',
        },
        error: null,
      })

      const { result } = renderHook(() => useGhostMode())

      let deactivateResult: any
      await act(async () => {
        deactivateResult = await result.current.deactivate()
      })

      expect(deactivateResult.error).toBe('Ghost mode not active')
    })

    it('should handle RPC returning success: false without error message', async () => {
      mockRpc.mockResolvedValue({
        data: {
          success: false,
        },
        error: null,
      })

      const { result } = renderHook(() => useGhostMode())

      let deactivateResult: any
      await act(async () => {
        deactivateResult = await result.current.deactivate()
      })

      expect(deactivateResult.error).toBe('Failed to deactivate ghost mode')
    })

    it('should handle network error', async () => {
      mockRpc.mockRejectedValue(new Error('Connection timeout'))

      const { result } = renderHook(() => useGhostMode())

      let deactivateResult: any
      await act(async () => {
        deactivateResult = await result.current.deactivate()
      })

      expect(deactivateResult.error).toBe('Connection timeout')
      expect(result.current.error).toBe('Connection timeout')
    })

    it('should set isLoading true during deactivation', async () => {
      let resolveRpc: any
      mockRpc.mockReturnValue(
        new Promise((resolve) => {
          resolveRpc = resolve
        })
      )

      const { result } = renderHook(() => useGhostMode())

      act(() => {
        result.current.deactivate()
      })

      expect(result.current.isLoading).toBe(true)

      await act(async () => {
        resolveRpc({
          data: { success: true },
          error: null,
        })
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })
    })
  })

  // ==========================================================================
  // REFRESH FUNCTION TESTS
  // ==========================================================================

  describe('refresh', () => {
    it('should call refreshProfile when refresh is called', async () => {
      const { result } = renderHook(() => useGhostMode())

      await act(async () => {
        await result.current.refresh()
      })

      expect(mockRefreshProfile).toHaveBeenCalled()
    })
  })

  // ==========================================================================
  // CLEAR ERROR FUNCTION TESTS
  // ==========================================================================

  describe('clearError', () => {
    it('should clear error state', async () => {
      mockRpc.mockResolvedValue({
        data: null,
        error: { message: 'Some error' },
      })

      const { result } = renderHook(() => useGhostMode())

      // Trigger an error
      await act(async () => {
        await result.current.activate('1h')
      })

      expect(result.current.error).toBe('Some error')

      // Clear the error
      act(() => {
        result.current.clearError()
      })

      expect(result.current.error).toBeNull()
    })

    it('should not crash when clearing null error', () => {
      const { result } = renderHook(() => useGhostMode())

      expect(result.current.error).toBeNull()

      act(() => {
        result.current.clearError()
      })

      expect(result.current.error).toBeNull()
    })
  })

  // ==========================================================================
  // TIME REMAINING TESTS
  // ==========================================================================

  describe('Time Remaining', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    it('should format time remaining correctly for hours and minutes', () => {
      const futureDate = new Date(Date.now() + 2 * 60 * 60 * 1000 + 30 * 60 * 1000) // 2h 30m
      mockProfile.ghost_mode_until = futureDate.toISOString()

      const { result } = renderHook(() => useGhostMode())

      expect(result.current.timeRemaining).toMatch(/2h 30m/)
    })

    it('should format time remaining correctly for minutes only', () => {
      const futureDate = new Date(Date.now() + 45 * 60 * 1000) // 45m
      mockProfile.ghost_mode_until = futureDate.toISOString()

      const { result } = renderHook(() => useGhostMode())

      expect(result.current.timeRemaining).toBe('45m')
    })

    it('should show Expired when ghost mode has expired', () => {
      const pastDate = new Date(Date.now() - 1000) // 1 second ago
      mockProfile.ghost_mode_until = pastDate.toISOString()

      const { result } = renderHook(() => useGhostMode())

      // Since isGhostMode is false, timeRemaining should be null
      expect(result.current.timeRemaining).toBeNull()
    })

    it('should update time remaining every minute', () => {
      const futureDate = new Date(Date.now() + 90 * 60 * 1000) // 90 minutes
      mockProfile.ghost_mode_until = futureDate.toISOString()

      const { result } = renderHook(() => useGhostMode())

      expect(result.current.timeRemaining).toMatch(/1h 30m/)

      // Advance time by 1 minute
      act(() => {
        vi.advanceTimersByTime(60 * 1000)
      })

      expect(result.current.timeRemaining).toMatch(/1h 29m/)

      // Advance another minute
      act(() => {
        vi.advanceTimersByTime(60 * 1000)
      })

      expect(result.current.timeRemaining).toMatch(/1h 28m/)
    })

    it('should refresh profile when time remaining shows Expired', () => {
      // Start with 30 seconds remaining (will show "0m", not expired yet)
      const futureDate = new Date(Date.now() + 30 * 1000)
      mockProfile.ghost_mode_until = futureDate.toISOString()

      const { result } = renderHook(() => useGhostMode())

      expect(mockRefreshProfile).toHaveBeenCalledTimes(0)

      // Advance time by 60s - now the ghost mode has expired
      act(() => {
        vi.advanceTimersByTime(60 * 1000)
      })

      // Timer should detect expiration and call refreshProfile
      expect(mockRefreshProfile).toHaveBeenCalled()
    })

    it('should clear timer when ghost mode becomes inactive', () => {
      const futureDate = new Date(Date.now() + 2 * 60 * 60 * 1000)
      mockProfile.ghost_mode_until = futureDate.toISOString()

      const { result, rerender } = renderHook(() => useGhostMode())

      expect(result.current.timeRemaining).toBeTruthy()

      // Update profile to inactive
      mockProfile.ghost_mode_until = null
      rerender()

      expect(result.current.timeRemaining).toBeNull()
    })

    it('should not set timer when ghost mode is inactive', () => {
      mockProfile.ghost_mode_until = null

      const { result } = renderHook(() => useGhostMode())

      expect(result.current.timeRemaining).toBeNull()

      // Advance time - should not trigger any updates
      act(() => {
        vi.advanceTimersByTime(60 * 1000)
      })

      expect(result.current.timeRemaining).toBeNull()
      expect(mockRefreshProfile).not.toHaveBeenCalled()
    })
  })
})
