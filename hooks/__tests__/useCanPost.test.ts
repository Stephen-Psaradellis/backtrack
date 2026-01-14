/**
 * Tests for useCanPost hook
 *
 * Tests the functionality for checking if a user can post at a location.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'

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

import { useCanPost } from '../useCanPost'

describe('useCanPost', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Default: authenticated user
    mockUseAuth.mockReturnValue({
      userId: 'test-user-123',
      isAuthenticated: true,
    })

    // Default: RPC returns success
    mockRpc.mockResolvedValue({
      data: {
        can_post: true,
        reason: null,
        is_regular: false,
        has_recent_checkin: true,
        location_name: 'Coffee Shop',
      },
      error: null,
    })
  })

  describe('with no locationId', () => {
    it('should return cannot post with reason', async () => {
      const { result } = renderHook(() => useCanPost(null))

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.canPost).toBe(false)
      expect(result.current.reason).toBe('Location not specified')
    })
  })

  describe('with unauthenticated user', () => {
    it('should return cannot post', async () => {
      mockUseAuth.mockReturnValue({
        userId: null,
        isAuthenticated: false,
      })

      const { result } = renderHook(() => useCanPost('location-123'))

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.canPost).toBe(false)
      expect(result.current.reason).toContain('logged in')
    })
  })

  describe('with authenticated user', () => {
    it('should return can post when user is a Regular', async () => {
      mockRpc.mockResolvedValue({
        data: {
          can_post: true,
          reason: null,
          is_regular: true,
          has_recent_checkin: false,
          location_name: 'Coffee Shop',
        },
        error: null,
      })

      const { result } = renderHook(() => useCanPost('location-123'))

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.canPost).toBe(true)
      expect(result.current.isRegular).toBe(true)
      expect(result.current.hasRecentCheckin).toBe(false)
      expect(result.current.locationName).toBe('Coffee Shop')
    })

    it('should return can post when user has recent check-in', async () => {
      mockRpc.mockResolvedValue({
        data: {
          can_post: true,
          reason: null,
          is_regular: false,
          has_recent_checkin: true,
          location_name: 'Coffee Shop',
        },
        error: null,
      })

      const { result } = renderHook(() => useCanPost('location-123'))

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.canPost).toBe(true)
      expect(result.current.isRegular).toBe(false)
      expect(result.current.hasRecentCheckin).toBe(true)
    })

    it('should return cannot post with reason when user has no permission', async () => {
      const deniedReason = 'Only Regulars of Coffee Shop or users who have checked into Coffee Shop within the last 12 hours can post here'
      mockRpc.mockResolvedValue({
        data: {
          can_post: false,
          reason: deniedReason,
          is_regular: false,
          has_recent_checkin: false,
          location_name: 'Coffee Shop',
        },
        error: null,
      })

      const { result } = renderHook(() => useCanPost('location-123'))

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.canPost).toBe(false)
      expect(result.current.reason).toBe(deniedReason)
      expect(result.current.isRegular).toBe(false)
      expect(result.current.hasRecentCheckin).toBe(false)
    })

    it('should handle RPC error', async () => {
      mockRpc.mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      })

      const { result } = renderHook(() => useCanPost('location-123'))

      await waitFor(() => {
        expect(result.current.error).not.toBeNull()
      })

      expect(result.current.canPost).toBe(false)
      expect(result.current.error).toBe('Database error')
    })
  })

  describe('checkPermission manual call', () => {
    it('should allow manual permission check', async () => {
      mockRpc.mockResolvedValue({
        data: {
          can_post: true,
          reason: null,
          is_regular: true,
          has_recent_checkin: false,
        },
        error: null,
      })

      const { result } = renderHook(() => useCanPost('location-123', { autoCheck: false }))

      // Should not have fetched automatically
      expect(result.current.isLoading).toBe(false)
      expect(mockRpc).not.toHaveBeenCalled()

      // Now call manually
      const checkResult = await result.current.checkPermission()

      expect(checkResult.can_post).toBe(true)
      expect(checkResult.is_regular).toBe(true)
    })
  })
})
