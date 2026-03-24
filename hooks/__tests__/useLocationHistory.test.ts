import { renderHook, act, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockRpc = vi.fn()

vi.mock('../../lib/supabase', () => ({
  supabase: {
    rpc: (...args: unknown[]) => mockRpc(...args),
  },
}))

const mockUseAuth = vi.fn()
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}))

import { useLocationHistory } from '../useLocationHistory'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeLocations(n: number, daysAgo: number[] = []) {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (daysAgo[i] ?? i))
    return {
      id: `loc-${i}`,
      name: `Location ${i}`,
      latitude: 40.7 + i * 0.01,
      longitude: -74.0 + i * 0.01,
      last_visited_at: d.toISOString(),
    }
  })
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useLocationHistory', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseAuth.mockReturnValue({ userId: 'user-1', isAuthenticated: true })
    mockRpc.mockResolvedValue({ data: makeLocations(5), error: null })
  })

  it('fetches locations via RPC with userId', async () => {
    const { result } = renderHook(() => useLocationHistory())

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(mockRpc).toHaveBeenCalledWith('get_locations_visited_in_last_month', {
      p_user_id: 'user-1',
    })
    expect(result.current.locations).toHaveLength(5)
    expect(result.current.error).toBeNull()
  })

  it('filters locations by daysBack parameter', async () => {
    // Locations at 0, 5, 10, 15, 20 days ago; daysBack=7 should keep first 2
    mockRpc.mockResolvedValue({
      data: makeLocations(5, [0, 5, 10, 15, 20]),
      error: null,
    })

    const { result } = renderHook(() => useLocationHistory(7))

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.locations).toHaveLength(2)
  })

  it('locations include last_visited_at timestamps', async () => {
    const { result } = renderHook(() => useLocationHistory())

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    for (const loc of result.current.locations) {
      expect(loc.last_visited_at).toBeDefined()
      expect(new Date(loc.last_visited_at).getTime()).not.toBeNaN()
    }
  })

  it('returns empty array and no error when not authenticated', async () => {
    mockUseAuth.mockReturnValue({ userId: null, isAuthenticated: false })

    const { result } = renderHook(() => useLocationHistory())

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.locations).toEqual([])
    expect(result.current.error).toBeNull()
    expect(mockRpc).not.toHaveBeenCalled()
  })

  it('refetch reloads data', async () => {
    const { result } = renderHook(() => useLocationHistory())

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(mockRpc).toHaveBeenCalledTimes(1)

    await act(async () => {
      await result.current.refetch()
    })

    expect(mockRpc).toHaveBeenCalledTimes(2)
  })
})
