/**
 * Tests for hooks/useCheckin.ts
 *
 * Tests the check-in management hook.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'

// Mock expo-location
const mockRequestForegroundPermissionsAsync = vi.fn()
const mockGetCurrentPositionAsync = vi.fn()

vi.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: () => mockRequestForegroundPermissionsAsync(),
  getCurrentPositionAsync: (...args: unknown[]) => mockGetCurrentPositionAsync(...args),
  Accuracy: {
    High: 6,
  },
}))

// Mock supabase
const mockRpc = vi.fn()

vi.mock('../../lib/supabase', () => ({
  supabase: {
    rpc: (...args: unknown[]) => mockRpc(...args),
  },
}))

import { useCheckin } from '../useCheckin'

describe('useCheckin', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Default mock for get_active_checkin
    mockRpc.mockImplementation((name: string) => {
      if (name === 'get_active_checkin') {
        return Promise.resolve({
          data: { success: true, checkin: null },
          error: null,
        })
      }
      return Promise.resolve({ data: null, error: null })
    })

    // Default location permission granted
    mockRequestForegroundPermissionsAsync.mockResolvedValue({ status: 'granted' })

    // Default location
    mockGetCurrentPositionAsync.mockResolvedValue({
      coords: {
        latitude: 40.7128,
        longitude: -74.006,
        accuracy: 10,
      },
    })
  })

  describe('initial state', () => {
    it('should start with loading true', () => {
      const { result } = renderHook(() => useCheckin())

      expect(result.current.isLoading).toBe(true)
    })

    it('should start with no active checkin', async () => {
      const { result } = renderHook(() => useCheckin())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.activeCheckin).toBeNull()
    })

    it('should fetch active checkin on mount', async () => {
      renderHook(() => useCheckin())

      await waitFor(() => {
        expect(mockRpc).toHaveBeenCalledWith('get_active_checkin')
      })
    })

    it('should set activeCheckin when user has an active checkin', async () => {
      const mockCheckin = {
        id: 'checkin-123',
        location_id: 'loc-456',
        location_name: 'Test Location',
        checked_in_at: '2024-01-01T12:00:00Z',
      }

      mockRpc.mockImplementation((name: string) => {
        if (name === 'get_active_checkin') {
          return Promise.resolve({
            data: { success: true, checkin: mockCheckin },
            error: null,
          })
        }
        return Promise.resolve({ data: null, error: null })
      })

      const { result } = renderHook(() => useCheckin())

      await waitFor(() => {
        expect(result.current.activeCheckin).toEqual(mockCheckin)
      })
    })
  })

  describe('checkIn', () => {
    it('should check in successfully', async () => {
      mockRpc.mockImplementation((name: string) => {
        if (name === 'checkin_to_location') {
          return Promise.resolve({
            data: {
              success: true,
              checkin_id: 'new-checkin-123',
              verified: true,
              distance_meters: 50,
            },
            error: null,
          })
        }
        if (name === 'get_active_checkin') {
          return Promise.resolve({
            data: { success: true, checkin: null },
            error: null,
          })
        }
        return Promise.resolve({ data: null, error: null })
      })

      const { result } = renderHook(() => useCheckin())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      let checkInResult: { success: boolean; error?: string | null } | undefined
      await act(async () => {
        checkInResult = await result.current.checkIn('loc-123')
      })

      expect(checkInResult).toEqual({
        success: true,
        checkinId: 'new-checkin-123',
        verified: true,
        alreadyCheckedIn: false,
        distanceMeters: 50,
        error: null,
      })
    })

    it('should set isCheckingIn during check-in', async () => {
      mockRpc.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  data: { success: true, checkin_id: 'new', verified: true },
                  error: null,
                }),
              100
            )
          )
      )

      const { result } = renderHook(() => useCheckin())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      act(() => {
        result.current.checkIn('loc-123')
      })

      expect(result.current.isCheckingIn).toBe(true)
    })

    it('should fail when location permission denied', async () => {
      mockRequestForegroundPermissionsAsync.mockResolvedValue({ status: 'denied' })

      const { result } = renderHook(() => useCheckin())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      let checkInResult: { success: boolean; error?: string | null } | undefined
      await act(async () => {
        checkInResult = await result.current.checkIn('loc-123')
      })

      expect(checkInResult!.success).toBe(false)
      expect(checkInResult!.error).toContain('permission')
    })

    it('should handle RPC error', async () => {
      mockRpc.mockImplementation((name: string) => {
        if (name === 'checkin_to_location') {
          return Promise.resolve({
            data: null,
            error: { message: 'Database error' },
          })
        }
        if (name === 'get_active_checkin') {
          return Promise.resolve({
            data: { success: true, checkin: null },
            error: null,
          })
        }
        return Promise.resolve({ data: null, error: null })
      })

      const { result } = renderHook(() => useCheckin())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      let checkInResult: { success: boolean; error?: string | null } | undefined
      await act(async () => {
        checkInResult = await result.current.checkIn('loc-123')
      })

      expect(checkInResult!.success).toBe(false)
      expect(checkInResult!.error).toBe('Database error')
      expect(result.current.error).toBe('Database error')
    })

    it('should handle non-success response', async () => {
      mockRpc.mockImplementation((name: string) => {
        if (name === 'checkin_to_location') {
          return Promise.resolve({
            data: { success: false, error: 'Too far from location' },
            error: null,
          })
        }
        if (name === 'get_active_checkin') {
          return Promise.resolve({
            data: { success: true, checkin: null },
            error: null,
          })
        }
        return Promise.resolve({ data: null, error: null })
      })

      const { result } = renderHook(() => useCheckin())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      let checkInResult: { success: boolean; error?: string | null } | undefined
      await act(async () => {
        checkInResult = await result.current.checkIn('loc-123')
      })

      expect(checkInResult!.success).toBe(false)
      expect(checkInResult!.error).toBe('Too far from location')
    })

    it('should handle exception during check-in', async () => {
      mockGetCurrentPositionAsync.mockRejectedValue(new Error('GPS unavailable'))

      const { result } = renderHook(() => useCheckin())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      let checkInResult: { success: boolean; error?: string | null } | undefined
      await act(async () => {
        checkInResult = await result.current.checkIn('loc-123')
      })

      expect(checkInResult!.success).toBe(false)
      expect(checkInResult!.error).toBe('GPS unavailable')
    })
  })

  describe('checkOut', () => {
    it('should check out successfully', async () => {
      mockRpc.mockImplementation((name: string) => {
        if (name === 'checkout_from_location') {
          return Promise.resolve({
            data: { success: true, checkouts: 1 },
            error: null,
          })
        }
        if (name === 'get_active_checkin') {
          return Promise.resolve({
            data: { success: true, checkin: null },
            error: null,
          })
        }
        return Promise.resolve({ data: null, error: null })
      })

      const { result } = renderHook(() => useCheckin())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      let checkOutResult: { success: boolean; error?: string | null } | undefined
      await act(async () => {
        checkOutResult = await result.current.checkOut('loc-123')
      })

      expect(checkOutResult).toEqual({
        success: true,
        checkouts: 1,
        error: null,
      })
    })

    it('should set isCheckingOut during check-out', async () => {
      mockRpc.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(() => resolve({ data: { success: true, checkouts: 1 }, error: null }), 100)
          )
      )

      const { result } = renderHook(() => useCheckin())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      act(() => {
        result.current.checkOut('loc-123')
      })

      expect(result.current.isCheckingOut).toBe(true)
    })

    it('should handle RPC error', async () => {
      mockRpc.mockImplementation((name: string) => {
        if (name === 'checkout_from_location') {
          return Promise.resolve({
            data: null,
            error: { message: 'Database error' },
          })
        }
        if (name === 'get_active_checkin') {
          return Promise.resolve({
            data: { success: true, checkin: null },
            error: null,
          })
        }
        return Promise.resolve({ data: null, error: null })
      })

      const { result } = renderHook(() => useCheckin())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      let checkOutResult: { success: boolean; error?: string | null } | undefined
      await act(async () => {
        checkOutResult = await result.current.checkOut('loc-123')
      })

      expect(checkOutResult!.success).toBe(false)
      expect(checkOutResult!.error).toBe('Database error')
    })

    it('should handle non-success response', async () => {
      mockRpc.mockImplementation((name: string) => {
        if (name === 'checkout_from_location') {
          return Promise.resolve({
            data: { success: false, error: 'No active check-in' },
            error: null,
          })
        }
        if (name === 'get_active_checkin') {
          return Promise.resolve({
            data: { success: true, checkin: null },
            error: null,
          })
        }
        return Promise.resolve({ data: null, error: null })
      })

      const { result } = renderHook(() => useCheckin())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      let checkOutResult: { success: boolean; error?: string | null } | undefined
      await act(async () => {
        checkOutResult = await result.current.checkOut('loc-123')
      })

      expect(checkOutResult!.success).toBe(false)
      expect(checkOutResult!.error).toBe('No active check-in')
    })

    it('should handle exception during check-out', async () => {
      mockRpc.mockImplementation((name: string) => {
        if (name === 'checkout_from_location') {
          return Promise.reject(new Error('Network error'))
        }
        if (name === 'get_active_checkin') {
          return Promise.resolve({
            data: { success: true, checkin: null },
            error: null,
          })
        }
        return Promise.resolve({ data: null, error: null })
      })

      const { result } = renderHook(() => useCheckin())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      let checkOutResult: { success: boolean; error?: string | null } | undefined
      await act(async () => {
        checkOutResult = await result.current.checkOut('loc-123')
      })

      expect(checkOutResult!.success).toBe(false)
      expect(checkOutResult!.error).toBe('Network error')
    })

    it('should clear active checkin when checking out from current location', async () => {
      const mockCheckin = {
        id: 'checkin-123',
        location_id: 'loc-456',
        location_name: 'Test Location',
        checked_in_at: '2024-01-01T12:00:00Z',
      }

      mockRpc.mockImplementation((name: string) => {
        if (name === 'get_active_checkin') {
          return Promise.resolve({
            data: { success: true, checkin: mockCheckin },
            error: null,
          })
        }
        if (name === 'checkout_from_location') {
          return Promise.resolve({
            data: { success: true, checkouts: 1 },
            error: null,
          })
        }
        return Promise.resolve({ data: null, error: null })
      })

      const { result } = renderHook(() => useCheckin())

      await waitFor(() => {
        expect(result.current.activeCheckin).toEqual(mockCheckin)
      })

      await act(async () => {
        await result.current.checkOut('loc-456')
      })

      expect(result.current.activeCheckin).toBeNull()
    })

    it('should pass null for location_id when checking out without specifying location', async () => {
      mockRpc.mockImplementation((name: string) => {
        if (name === 'checkout_from_location') {
          return Promise.resolve({
            data: { success: true, checkouts: 1 },
            error: null,
          })
        }
        if (name === 'get_active_checkin') {
          return Promise.resolve({
            data: { success: true, checkin: null },
            error: null,
          })
        }
        return Promise.resolve({ data: null, error: null })
      })

      const { result } = renderHook(() => useCheckin())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      await act(async () => {
        await result.current.checkOut()
      })

      expect(mockRpc).toHaveBeenCalledWith('checkout_from_location', {
        p_location_id: null,
      })
    })
  })

  describe('isCheckedInAt', () => {
    it('should return true when checked in at the location', async () => {
      const mockCheckin = {
        id: 'checkin-123',
        location_id: 'loc-456',
        location_name: 'Test Location',
        checked_in_at: '2024-01-01T12:00:00Z',
      }

      mockRpc.mockImplementation((name: string) => {
        if (name === 'get_active_checkin') {
          return Promise.resolve({
            data: { success: true, checkin: mockCheckin },
            error: null,
          })
        }
        return Promise.resolve({ data: null, error: null })
      })

      const { result } = renderHook(() => useCheckin())

      await waitFor(() => {
        expect(result.current.activeCheckin).not.toBeNull()
      })

      expect(result.current.isCheckedInAt('loc-456')).toBe(true)
      expect(result.current.isCheckedInAt('loc-other')).toBe(false)
    })

    it('should return false when not checked in anywhere', async () => {
      const { result } = renderHook(() => useCheckin())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.isCheckedInAt('loc-123')).toBe(false)
    })
  })

  describe('clearError', () => {
    it('should clear the error state', async () => {
      mockRpc.mockImplementation((name: string) => {
        if (name === 'get_active_checkin') {
          return Promise.resolve({
            data: null,
            error: { message: 'Database error' },
          })
        }
        return Promise.resolve({ data: null, error: null })
      })

      const { result } = renderHook(() => useCheckin())

      await waitFor(() => {
        expect(result.current.error).toBe('Database error')
      })

      act(() => {
        result.current.clearError()
      })

      expect(result.current.error).toBeNull()
    })
  })

  describe('error handling', () => {
    it('should set error when getActiveCheckin fails', async () => {
      mockRpc.mockImplementation((name: string) => {
        if (name === 'get_active_checkin') {
          return Promise.resolve({
            data: null,
            error: { message: 'Database error' },
          })
        }
        return Promise.resolve({ data: null, error: null })
      })

      const { result } = renderHook(() => useCheckin())

      await waitFor(() => {
        expect(result.current.error).toBe('Database error')
      })
    })

    it('should set error when getActiveCheckin throws', async () => {
      mockRpc.mockImplementation((name: string) => {
        if (name === 'get_active_checkin') {
          return Promise.reject(new Error('Network error'))
        }
        return Promise.resolve({ data: null, error: null })
      })

      const { result } = renderHook(() => useCheckin())

      await waitFor(() => {
        expect(result.current.error).toBe('Failed to fetch active check-in')
      })
    })
  })
})
