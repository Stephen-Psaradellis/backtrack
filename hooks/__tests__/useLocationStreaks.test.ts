/**
 * Tests for hooks/useLocationStreaks.ts
 *
 * Tests location streaks hook for managing visit streaks.
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

import { useLocationStreaks, useLocationStreak } from '../useLocationStreaks'

describe('useLocationStreaks', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Default: authenticated user
    mockUseAuth.mockReturnValue({
      userId: 'user-123',
      isAuthenticated: true,
    })

    // Default: empty results
    mockRpc.mockResolvedValue({
      data: [],
      error: null,
    })
  })

  describe('initial state', () => {
    it('should start with empty streaks when disabled', () => {
      const { result } = renderHook(() => useLocationStreaks({ enabled: false }))

      expect(result.current.streaks).toEqual([])
    })

    it('should start with empty topStreaks when disabled', () => {
      const { result } = renderHook(() => useLocationStreaks({ enabled: false }))

      expect(result.current.topStreaks).toEqual([])
    })

    it('should start with empty milestones when disabled', () => {
      const { result } = renderHook(() => useLocationStreaks({ enabled: false }))

      expect(result.current.milestones).toEqual([])
    })

    it('should start with isLoading false when disabled', () => {
      const { result } = renderHook(() => useLocationStreaks({ enabled: false }))

      expect(result.current.isLoading).toBe(false)
    })

    it('should start with no error when disabled', () => {
      const { result } = renderHook(() => useLocationStreaks({ enabled: false }))

      expect(result.current.error).toBeNull()
    })

    it('should start with lastFetchedAt null', () => {
      const { result } = renderHook(() => useLocationStreaks({ enabled: false }))

      expect(result.current.lastFetchedAt).toBeNull()
    })
  })

  describe('authentication handling', () => {
    it('should not fetch when not authenticated', async () => {
      mockUseAuth.mockReturnValue({
        userId: null,
        isAuthenticated: false,
      })

      renderHook(() => useLocationStreaks())

      await new Promise((r) => setTimeout(r, 50))

      // Should not call RPC when not authenticated
      expect(mockRpc).not.toHaveBeenCalled()
    })

    it('should clear data when not authenticated', async () => {
      mockUseAuth.mockReturnValue({
        userId: null,
        isAuthenticated: false,
      })

      const { result } = renderHook(() => useLocationStreaks())

      await new Promise((r) => setTimeout(r, 50))

      expect(result.current.streaks).toEqual([])
      expect(result.current.milestones).toEqual([])
    })
  })

  describe('fetching streaks', () => {
    it('should fetch streaks on mount when enabled', async () => {
      renderHook(() => useLocationStreaks())

      await waitFor(() => {
        expect(mockRpc).toHaveBeenCalledWith('get_user_streaks', {
          p_user_id: 'user-123',
          p_location_id: null,
          p_streak_type: null,
        })
      })
    })

    it('should pass locationId when provided', async () => {
      renderHook(() => useLocationStreaks({ locationId: 'loc-123' }))

      await waitFor(() => {
        expect(mockRpc).toHaveBeenCalledWith('get_user_streaks', {
          p_user_id: 'user-123',
          p_location_id: 'loc-123',
          p_streak_type: null,
        })
      })
    })

    it('should pass streakType when provided', async () => {
      renderHook(() => useLocationStreaks({ streakType: 'weekly' }))

      await waitFor(() => {
        expect(mockRpc).toHaveBeenCalledWith('get_user_streaks', {
          p_user_id: 'user-123',
          p_location_id: null,
          p_streak_type: 'weekly',
        })
      })
    })

    it('should not fetch when disabled', async () => {
      renderHook(() => useLocationStreaks({ enabled: false }))

      await new Promise((r) => setTimeout(r, 50))

      expect(mockRpc).not.toHaveBeenCalled()
    })
  })

  describe('error handling', () => {
    it('should set error on RPC failure', async () => {
      mockRpc.mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      })

      const { result } = renderHook(() => useLocationStreaks())

      await waitFor(() => {
        expect(result.current.error?.code).toBe('FETCH_ERROR')
      })
    })

    it('should set error on exception', async () => {
      mockRpc.mockRejectedValue(new Error('Network error'))

      const { result } = renderHook(() => useLocationStreaks())

      await waitFor(() => {
        expect(result.current.error?.code).toBe('FETCH_ERROR')
      })
    })
  })

  describe('computed values', () => {
    it('should compute topStreaks sorted by current_streak', async () => {
      const mockData = [
        {
          id: 'streak-1',
          user_id: 'user-123',
          location_id: 'loc-1',
          streak_type: 'weekly',
          current_streak: 5,
          longest_streak: 10,
          last_visit_period: '2024-W01',
          total_visits: 20,
          started_at: '2023-01-01',
          updated_at: '2024-01-01',
          location_name: 'Coffee Shop',
          location_address: '123 Main St',
        },
        {
          id: 'streak-2',
          user_id: 'user-123',
          location_id: 'loc-2',
          streak_type: 'weekly',
          current_streak: 10,
          longest_streak: 15,
          last_visit_period: '2024-W01',
          total_visits: 30,
          started_at: '2023-06-01',
          updated_at: '2024-01-01',
          location_name: 'Gym',
          location_address: '456 Oak Ave',
        },
      ]

      mockRpc.mockResolvedValue({ data: mockData, error: null })

      const { result } = renderHook(() => useLocationStreaks())

      await waitFor(() => {
        expect(result.current.topStreaks).toHaveLength(2)
      })

      // Should be sorted by current_streak descending
      expect(result.current.topStreaks[0].current_streak).toBe(10)
      expect(result.current.topStreaks[1].current_streak).toBe(5)
    })

    it('should filter out zero-streak entries from topStreaks', async () => {
      const mockData = [
        {
          id: 'streak-1',
          user_id: 'user-123',
          location_id: 'loc-1',
          streak_type: 'weekly',
          current_streak: 0,
          longest_streak: 10,
          last_visit_period: '2024-W01',
          total_visits: 20,
          started_at: '2023-01-01',
          updated_at: '2024-01-01',
          location_name: 'Coffee Shop',
          location_address: '123 Main St',
        },
      ]

      mockRpc.mockResolvedValue({ data: mockData, error: null })

      const { result } = renderHook(() => useLocationStreaks())

      await waitFor(() => {
        expect(result.current.streaks).toHaveLength(1)
      })

      expect(result.current.topStreaks).toHaveLength(0)
    })
  })

  describe('getLocationStreakSummary', () => {
    it('should return null for unknown location', async () => {
      mockRpc.mockResolvedValue({ data: [], error: null })

      const { result } = renderHook(() => useLocationStreaks())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      const summary = result.current.getLocationStreakSummary('unknown-loc')
      expect(summary).toBeNull()
    })

    it('should return summary for known location', async () => {
      const mockData = [
        {
          id: 'streak-1',
          user_id: 'user-123',
          location_id: 'loc-1',
          streak_type: 'weekly',
          current_streak: 5,
          longest_streak: 10,
          last_visit_period: '2024-W01',
          total_visits: 20,
          started_at: '2023-01-01',
          updated_at: '2024-01-01',
          location_name: 'Coffee Shop',
          location_address: '123 Main St',
        },
      ]

      mockRpc.mockResolvedValue({ data: mockData, error: null })

      const { result } = renderHook(() => useLocationStreaks())

      await waitFor(() => {
        expect(result.current.streaks).toHaveLength(1)
      })

      const summary = result.current.getLocationStreakSummary('loc-1')
      expect(summary).not.toBeNull()
      expect(summary?.weekly?.current).toBe(5)
      expect(summary?.weekly?.longest).toBe(10)
    })
  })

  describe('getBestStreak', () => {
    it('should return null for unknown location', async () => {
      mockRpc.mockResolvedValue({ data: [], error: null })

      const { result } = renderHook(() => useLocationStreaks())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      const best = result.current.getBestStreak('unknown-loc')
      expect(best).toBeNull()
    })

    it('should return best streak for known location', async () => {
      const mockData = [
        {
          id: 'streak-1',
          user_id: 'user-123',
          location_id: 'loc-1',
          streak_type: 'weekly',
          current_streak: 5,
          longest_streak: 10,
          last_visit_period: '2024-W01',
          total_visits: 20,
          started_at: '2023-01-01',
          updated_at: '2024-01-01',
          location_name: 'Coffee Shop',
          location_address: '123 Main St',
        },
        {
          id: 'streak-2',
          user_id: 'user-123',
          location_id: 'loc-1',
          streak_type: 'monthly',
          current_streak: 3,
          longest_streak: 6,
          last_visit_period: '2024-01',
          total_visits: 10,
          started_at: '2023-01-01',
          updated_at: '2024-01-01',
          location_name: 'Coffee Shop',
          location_address: '123 Main St',
        },
      ]

      mockRpc.mockResolvedValue({ data: mockData, error: null })

      const { result } = renderHook(() => useLocationStreaks())

      await waitFor(() => {
        expect(result.current.streaks).toHaveLength(2)
      })

      const best = result.current.getBestStreak('loc-1')
      expect(best).not.toBeNull()
      expect(best?.current_streak).toBe(5) // Weekly has higher current
    })
  })

  describe('refetch', () => {
    it('should refetch data', async () => {
      const { result } = renderHook(() => useLocationStreaks())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      mockRpc.mockClear()
      mockRpc.mockResolvedValue({ data: [], error: null })

      await act(async () => {
        await result.current.refetch()
      })

      expect(mockRpc).toHaveBeenCalled()
    })
  })

  describe('return value structure', () => {
    it('should provide all expected properties', () => {
      const { result } = renderHook(() => useLocationStreaks({ enabled: false }))

      expect(result.current).toHaveProperty('streaks')
      expect(result.current).toHaveProperty('topStreaks')
      expect(result.current).toHaveProperty('milestones')
      expect(result.current).toHaveProperty('isLoading')
      expect(result.current).toHaveProperty('error')
      expect(result.current).toHaveProperty('refetch')
      expect(result.current).toHaveProperty('lastFetchedAt')
      expect(result.current).toHaveProperty('getLocationStreakSummary')
      expect(result.current).toHaveProperty('getBestStreak')
    })
  })
})

describe('useLocationStreak', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mockUseAuth.mockReturnValue({
      userId: 'user-123',
      isAuthenticated: true,
    })

    mockRpc.mockResolvedValue({
      data: [],
      error: null,
    })
  })

  it('should filter streaks for specific location', async () => {
    const mockData = [
      {
        id: 'streak-1',
        user_id: 'user-123',
        location_id: 'loc-123',
        streak_type: 'weekly',
        current_streak: 5,
        longest_streak: 10,
        last_visit_period: '2024-W01',
        total_visits: 20,
        started_at: '2023-01-01',
        updated_at: '2024-01-01',
        location_name: 'Coffee Shop',
        location_address: '123 Main St',
      },
    ]

    mockRpc.mockResolvedValue({ data: mockData, error: null })

    const { result } = renderHook(() => useLocationStreak('loc-123'))

    await waitFor(() => {
      expect(result.current.streaks).toHaveLength(1)
    })

    expect(result.current.streaks[0].location_id).toBe('loc-123')
  })

  it('should provide summary for the location', async () => {
    const mockData = [
      {
        id: 'streak-1',
        user_id: 'user-123',
        location_id: 'loc-123',
        streak_type: 'weekly',
        current_streak: 5,
        longest_streak: 10,
        last_visit_period: '2024-W01',
        total_visits: 20,
        started_at: '2023-01-01',
        updated_at: '2024-01-01',
        location_name: 'Coffee Shop',
        location_address: '123 Main St',
      },
    ]

    mockRpc.mockResolvedValue({ data: mockData, error: null })

    const { result } = renderHook(() => useLocationStreak('loc-123'))

    await waitFor(() => {
      expect(result.current.summary).not.toBeNull()
    })
  })

  it('should provide bestStreak for the location', async () => {
    const mockData = [
      {
        id: 'streak-1',
        user_id: 'user-123',
        location_id: 'loc-123',
        streak_type: 'weekly',
        current_streak: 5,
        longest_streak: 10,
        last_visit_period: '2024-W01',
        total_visits: 20,
        started_at: '2023-01-01',
        updated_at: '2024-01-01',
        location_name: 'Coffee Shop',
        location_address: '123 Main St',
      },
    ]

    mockRpc.mockResolvedValue({ data: mockData, error: null })

    const { result } = renderHook(() => useLocationStreak('loc-123'))

    await waitFor(() => {
      expect(result.current.bestStreak).not.toBeNull()
    })

    expect(result.current.bestStreak?.current_streak).toBe(5)
  })

  it('should provide all expected properties', () => {
    const { result } = renderHook(() => useLocationStreak('loc-123'))

    expect(result.current).toHaveProperty('streaks')
    expect(result.current).toHaveProperty('summary')
    expect(result.current).toHaveProperty('bestStreak')
    expect(result.current).toHaveProperty('isLoading')
    expect(result.current).toHaveProperty('error')
    expect(result.current).toHaveProperty('refetch')
  })
})
