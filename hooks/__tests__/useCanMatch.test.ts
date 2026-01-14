/**
 * Tests for useCanMatch hook
 *
 * Tests the functionality for checking if a user can match/respond to a post.
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

import { useCanMatch } from '../useCanMatch'

describe('useCanMatch', () => {
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
        can_match: true,
        reason: null,
        is_regular: false,
        has_matching_checkin: true,
        location_name: 'Coffee Shop',
      },
      error: null,
    })
  })

  describe('with no postId', () => {
    it('should return cannot match with reason', async () => {
      const { result } = renderHook(() => useCanMatch(null))

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.canMatch).toBe(false)
      expect(result.current.reason).toBe('Post not specified')
    })
  })

  describe('with unauthenticated user', () => {
    it('should return cannot match', async () => {
      mockUseAuth.mockReturnValue({
        userId: null,
        isAuthenticated: false,
      })

      const { result } = renderHook(() => useCanMatch('post-123'))

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.canMatch).toBe(false)
      expect(result.current.reason).toContain('logged in')
    })
  })

  describe('with authenticated user', () => {
    it('should return can match when user is a Regular', async () => {
      mockRpc.mockResolvedValue({
        data: {
          can_match: true,
          reason: null,
          is_regular: true,
          has_matching_checkin: false,
          location_name: 'Coffee Shop',
        },
        error: null,
      })

      const { result } = renderHook(() => useCanMatch('post-123'))

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.canMatch).toBe(true)
      expect(result.current.isRegular).toBe(true)
      expect(result.current.hasMatchingCheckin).toBe(false)
      expect(result.current.locationName).toBe('Coffee Shop')
    })

    it('should return can match when user has matching check-in', async () => {
      mockRpc.mockResolvedValue({
        data: {
          can_match: true,
          reason: null,
          is_regular: false,
          has_matching_checkin: true,
          location_name: 'Coffee Shop',
        },
        error: null,
      })

      const { result } = renderHook(() => useCanMatch('post-123'))

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.canMatch).toBe(true)
      expect(result.current.isRegular).toBe(false)
      expect(result.current.hasMatchingCheckin).toBe(true)
    })

    it('should return cannot match with reason when user has no permission', async () => {
      const deniedReason = 'You must be a Regular at Coffee Shop or have checked in within 24 hours of when this post was created to respond'
      mockRpc.mockResolvedValue({
        data: {
          can_match: false,
          reason: deniedReason,
          is_regular: false,
          has_matching_checkin: false,
          location_name: 'Coffee Shop',
        },
        error: null,
      })

      const { result } = renderHook(() => useCanMatch('post-123'))

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.canMatch).toBe(false)
      expect(result.current.reason).toBe(deniedReason)
      expect(result.current.isRegular).toBe(false)
      expect(result.current.hasMatchingCheckin).toBe(false)
    })

    it('should handle RPC error', async () => {
      mockRpc.mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      })

      const { result } = renderHook(() => useCanMatch('post-123'))

      await waitFor(() => {
        expect(result.current.error).not.toBeNull()
      })

      expect(result.current.canMatch).toBe(false)
      expect(result.current.error).toBe('Database error')
    })
  })

  describe('checkPermission manual call', () => {
    it('should allow manual permission check', async () => {
      mockRpc.mockResolvedValue({
        data: {
          can_match: true,
          reason: null,
          is_regular: true,
          has_matching_checkin: false,
        },
        error: null,
      })

      const { result } = renderHook(() => useCanMatch('post-123', { autoCheck: false }))

      // Should not have fetched automatically
      expect(result.current.isLoading).toBe(false)
      expect(mockRpc).not.toHaveBeenCalled()

      // Now call manually
      const checkResult = await result.current.checkPermission()

      expect(checkResult.can_match).toBe(true)
      expect(checkResult.is_regular).toBe(true)
    })
  })
})
