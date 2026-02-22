/**
 * Tests for useLiveCheckins hook
 *
 * Tests the live check-ins subscription functionality including:
 * - Access control (checked in, regular, not checked in, not authenticated)
 * - Real-time updates via Supabase subscriptions
 * - Query key invalidation
 * - Error handling
 */

import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import { useLiveCheckins } from '../useLiveCheckins'
import type { LiveCheckinUser } from '../../types/database'
import { supabase } from '../../lib/supabase'

// ============================================================================
// MOCKS
// ============================================================================

vi.mock('../../lib/supabase', () => {
  const mockUnsubscribe = vi.fn()
  const mockSubscribe = vi.fn(() => ({
    unsubscribe: mockUnsubscribe,
  }))
  const mockOn = vi.fn(function (this: any) {
    return this
  })

  const channelMock = {
    on: mockOn,
    subscribe: mockSubscribe,
    unsubscribe: mockUnsubscribe,
  }

  return {
    supabase: {
      rpc: vi.fn(),
      from: vi.fn(),
      channel: vi.fn(() => channelMock),
    },
  }
})

let mockAuth: any = { userId: null, isAuthenticated: false }
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => mockAuth,
}))

// Mock query keys
vi.mock('../useQueryConfig', () => ({
  queryKeys: {
    checkins: {
      live: (locationId: string, userId: string | null) => [
        'checkins',
        'live',
        locationId,
        userId,
      ],
    },
  },
}))

// ============================================================================
// TEST UTILITIES
// ============================================================================

const mockInvalidateQueries = vi.fn()

function createTestWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  })

  // Mock invalidateQueries
  queryClient.invalidateQueries = mockInvalidateQueries as any

  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children)
}

// Helper to get the channel mock
function getChannelMock() {
  const channelMock = vi.mocked(supabase.channel).mock.results[0]?.value
  return channelMock
}

const mockCheckinUsers: LiveCheckinUser[] = [
  {
    user_id: 'user-1',
    display_name: 'Alice',
    avatar: 'avatar-1',
    checkin_id: 'checkin-1',
    checked_in_at: '2026-02-16T12:00:00Z',
  },
  {
    user_id: 'user-2',
    display_name: 'Bob',
    avatar: 'avatar-2',
    checkin_id: 'checkin-2',
    checked_in_at: '2026-02-16T12:05:00Z',
  },
]

// ============================================================================
// TESTS
// ============================================================================

describe('useLiveCheckins', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Reset auth mock
    mockAuth = { userId: null, isAuthenticated: false }
  })

  afterEach(() => {
    vi.clearAllTimers()
  })

  // ==========================================================================
  // NULL LOCATION ID
  // ==========================================================================

  it('returns default state when locationId is null', async () => {
    mockAuth = { userId: 'user-1', isAuthenticated: true }

    const { result } = renderHook(() => useLiveCheckins(null), {
      wrapper: createTestWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current).toMatchObject({
      checkins: [],
      count: 0,
      hasAccess: false,
      accessReason: 'loading',
      error: null,
    })

    // Should not call RPC when locationId is null
    expect(supabase.rpc).not.toHaveBeenCalled()
    expect(supabase.channel).not.toHaveBeenCalled()
  })

  // ==========================================================================
  // NOT AUTHENTICATED
  // ==========================================================================

  it('returns not_authenticated when user is not authenticated', async () => {
    mockAuth = { userId: null, isAuthenticated: false }

    const { result } = renderHook(() => useLiveCheckins('location-1'), {
      wrapper: createTestWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current).toMatchObject({
      checkins: [],
      count: 0,
      hasAccess: false,
      accessReason: 'not_authenticated',
      error: null,
    })

    // Should not call RPC when not authenticated
    expect(supabase.rpc).not.toHaveBeenCalled()
  })

  // ==========================================================================
  // CHECKED IN USER
  // ==========================================================================

  it('returns checked_in access when user is checked in', async () => {
    mockAuth = { userId: 'user-1', isAuthenticated: true }

    // Mock RPC responses
    vi.mocked(supabase.rpc).mockImplementation((name: string, params: any) => {
      if (name === 'get_active_checkin_count_at_location') {
        return Promise.resolve({ data: 2, error: null })
      }
      if (name === 'get_active_checkins_at_location') {
        return Promise.resolve({ data: mockCheckinUsers, error: null })
      }
      return Promise.resolve({ data: null, error: null })
    })

    // Mock location_regulars check (not a regular)
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          }),
        }),
      }),
    } as any)

    const { result } = renderHook(() => useLiveCheckins('location-1'), {
      wrapper: createTestWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current).toMatchObject({
      checkins: mockCheckinUsers,
      count: 2,
      hasAccess: true,
      accessReason: 'checked_in',
      error: null,
    })

    expect(supabase.rpc).toHaveBeenCalledWith('get_active_checkin_count_at_location', {
      p_location_id: 'location-1',
    })
    expect(supabase.rpc).toHaveBeenCalledWith('get_active_checkins_at_location', {
      p_location_id: 'location-1',
    })
  })

  // ==========================================================================
  // REGULAR USER
  // ==========================================================================

  it('returns regular access when user is a location regular', async () => {
    mockAuth = { userId: 'user-1', isAuthenticated: true }

    // Mock RPC responses
    vi.mocked(supabase.rpc).mockImplementation((name: string, params: any) => {
      if (name === 'get_active_checkin_count_at_location') {
        return Promise.resolve({ data: 3, error: null })
      }
      if (name === 'get_active_checkins_at_location') {
        return Promise.resolve({ data: mockCheckinUsers, error: null })
      }
      return Promise.resolve({ data: null, error: null })
    })

    // Mock location_regulars check (is a regular)
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { is_regular: true },
              error: null,
            }),
          }),
        }),
      }),
    })

    const { result } = renderHook(() => useLiveCheckins('location-1'), {
      wrapper: createTestWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current).toMatchObject({
      checkins: mockCheckinUsers,
      count: 3,
      hasAccess: true,
      accessReason: 'regular',
      error: null,
    })

    expect(supabase.from).toHaveBeenCalledWith('location_regulars')
  })

  // ==========================================================================
  // NOT CHECKED IN
  // ==========================================================================

  it('returns not_checked_in when user has no access', async () => {
    mockAuth = { userId: 'user-1', isAuthenticated: true }

    // Mock RPC responses - count is available, but list returns null (no access)
    vi.mocked(supabase.rpc).mockImplementation((name: string, params: any) => {
      if (name === 'get_active_checkin_count_at_location') {
        return Promise.resolve({ data: 5, error: null })
      }
      if (name === 'get_active_checkins_at_location') {
        return Promise.resolve({ data: null, error: null })
      }
      return Promise.resolve({ data: null, error: null })
    })

    const { result } = renderHook(() => useLiveCheckins('location-1'), {
      wrapper: createTestWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current).toMatchObject({
      checkins: [],
      count: 5,
      hasAccess: false,
      accessReason: 'not_checked_in',
      error: null,
    })
  })

  // ==========================================================================
  // ENABLED OPTION
  // ==========================================================================

  it('disables query when enabled is false', async () => {
    mockAuth = { userId: 'user-1', isAuthenticated: true }

    const { result } = renderHook(
      () => useLiveCheckins('location-1', { enabled: false }),
      {
        wrapper: createTestWrapper(),
      }
    )

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    // Should not call RPC when disabled
    expect(supabase.rpc).not.toHaveBeenCalled()
    expect(supabase.channel).not.toHaveBeenCalled()
  })

  // ==========================================================================
  // REALTIME SUBSCRIPTION
  // ==========================================================================

  it('sets up realtime subscription when realtime is true', async () => {
    mockAuth = { userId: 'user-1', isAuthenticated: true }

    // Mock RPC responses
    vi.mocked(supabase.rpc).mockImplementation((name: string) => {
      if (name === 'get_active_checkin_count_at_location') {
        return Promise.resolve({ data: 2, error: null })
      }
      if (name === 'get_active_checkins_at_location') {
        return Promise.resolve({ data: mockCheckinUsers, error: null })
      }
      return Promise.resolve({ data: null, error: null })
    })

    // Mock location_regulars check
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          }),
        }),
      }),
    } as any)

    const { result, unmount } = renderHook(
      () => useLiveCheckins('location-1', { realtime: true }),
      {
        wrapper: createTestWrapper(),
      }
    )

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    // Check channel subscription was set up
    expect(supabase.channel).toHaveBeenCalledWith('live-checkins-location-1')

    const channelMock = getChannelMock()
    expect(channelMock.on).toHaveBeenCalledWith(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'user_checkins',
        filter: 'location_id=eq.location-1',
      },
      expect.any(Function)
    )
    expect(channelMock.subscribe).toHaveBeenCalled()

    // Use fake timers for testing debounce
    vi.useFakeTimers()

    // Trigger a realtime event
    const realtimeCallback = vi.mocked(channelMock.on).mock.calls[0][2]
    realtimeCallback()

    // Fast-forward past debounce (500ms)
    await vi.advanceTimersByTimeAsync(500)

    expect(mockInvalidateQueries).toHaveBeenCalledWith({
      queryKey: ['checkins', 'live', 'location-1', 'user-1'],
    })

    vi.useRealTimers()

    // Cleanup
    unmount()

    expect(channelMock.unsubscribe).toHaveBeenCalled()
  })

  it('does not set up realtime subscription when realtime is false', async () => {
    mockAuth = { userId: 'user-1', isAuthenticated: true }

    // Mock RPC responses
    vi.mocked(supabase.rpc).mockImplementation((name: string) => {
      if (name === 'get_active_checkin_count_at_location') {
        return Promise.resolve({ data: 2, error: null })
      }
      if (name === 'get_active_checkins_at_location') {
        return Promise.resolve({ data: mockCheckinUsers, error: null })
      }
      return Promise.resolve({ data: null, error: null })
    })

    // Mock location_regulars check
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          }),
        }),
      }),
    })

    renderHook(() => useLiveCheckins('location-1', { realtime: false }), {
      wrapper: createTestWrapper(),
    })

    // Should not set up channel
    expect(supabase.channel).not.toHaveBeenCalled()
  })

  it('debounces realtime updates to prevent burst queries', async () => {
    mockAuth = { userId: 'user-1', isAuthenticated: true }

    // Mock RPC responses
    vi.mocked(supabase.rpc).mockImplementation((name: string) => {
      if (name === 'get_active_checkin_count_at_location') {
        return Promise.resolve({ data: 2, error: null })
      }
      if (name === 'get_active_checkins_at_location') {
        return Promise.resolve({ data: mockCheckinUsers, error: null })
      }
      return Promise.resolve({ data: null, error: null })
    })

    // Mock location_regulars check
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          }),
        }),
      }),
    } as any)

    const { result } = renderHook(() => useLiveCheckins('location-1', { realtime: true }), {
      wrapper: createTestWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    await waitFor(() => {
      expect(supabase.channel).toHaveBeenCalled()
    })

    const channelMock = getChannelMock()
    const realtimeCallback = vi.mocked(channelMock.on).mock.calls[0][2]

    vi.useFakeTimers()

    // Trigger multiple events in quick succession
    realtimeCallback()
    realtimeCallback()
    realtimeCallback()

    // Fast-forward 200ms (less than debounce time)
    await vi.advanceTimersByTimeAsync(200)

    // Should not have invalidated yet
    expect(mockInvalidateQueries).not.toHaveBeenCalled()

    // Fast-forward past debounce time (total 500ms)
    await vi.advanceTimersByTimeAsync(300)

    // Should have invalidated only once
    expect(mockInvalidateQueries).toHaveBeenCalledTimes(1)

    vi.useRealTimers()
  })

  // ==========================================================================
  // ERROR HANDLING
  // ==========================================================================

  it('handles count RPC error', async () => {
    mockAuth = { userId: 'user-1', isAuthenticated: true }

    // Mock count error
    vi.mocked(supabase.rpc).mockImplementation((name: string) => {
      if (name === 'get_active_checkin_count_at_location') {
        return Promise.resolve({
          data: null,
          error: { message: 'Count RPC failed' },
        })
      }
      return Promise.resolve({ data: null, error: null })
    })

    const { result } = renderHook(() => useLiveCheckins('location-1', { realtime: false }), {
      wrapper: createTestWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.error).toBe('Count RPC failed')
    expect(result.current.hasAccess).toBe(false)
  })

  it('handles list RPC error', async () => {
    mockAuth = { userId: 'user-1', isAuthenticated: true }

    // Mock list error
    vi.mocked(supabase.rpc).mockImplementation((name: string) => {
      if (name === 'get_active_checkin_count_at_location') {
        return Promise.resolve({ data: 3, error: null })
      }
      if (name === 'get_active_checkins_at_location') {
        return Promise.resolve({
          data: null,
          error: { message: 'List RPC failed' },
        })
      }
      return Promise.resolve({ data: null, error: null })
    })

    const { result } = renderHook(() => useLiveCheckins('location-1', { realtime: false }), {
      wrapper: createTestWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.error).toBe('List RPC failed')
    expect(result.current.hasAccess).toBe(false)
  })

  // ==========================================================================
  // REFETCH
  // ==========================================================================

  it('provides refetch function', async () => {
    mockAuth = { userId: 'user-1', isAuthenticated: true }

    let callCount = 0
    vi.mocked(supabase.rpc).mockImplementation((name: string) => {
      callCount++
      if (name === 'get_active_checkin_count_at_location') {
        return Promise.resolve({ data: callCount, error: null })
      }
      if (name === 'get_active_checkins_at_location') {
        return Promise.resolve({ data: mockCheckinUsers, error: null })
      }
      return Promise.resolve({ data: null, error: null })
    })

    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          }),
        }),
      }),
    } as any)

    const { result } = renderHook(() => useLiveCheckins('location-1', { realtime: false }), {
      wrapper: createTestWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    const initialCount = result.current.count

    // Call refetch
    await result.current.refetch()

    await waitFor(() => {
      expect(result.current.count).toBeGreaterThan(initialCount)
    })
  })

  // ==========================================================================
  // CLEANUP
  // ==========================================================================

  it('cleans up subscription on unmount', async () => {
    mockAuth = { userId: 'user-1', isAuthenticated: true }

    vi.mocked(supabase.rpc).mockImplementation((name: string) => {
      if (name === 'get_active_checkin_count_at_location') {
        return Promise.resolve({ data: 2, error: null })
      }
      if (name === 'get_active_checkins_at_location') {
        return Promise.resolve({ data: mockCheckinUsers, error: null })
      }
      return Promise.resolve({ data: null, error: null })
    })

    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          }),
        }),
      }),
    } as any)

    const { unmount } = renderHook(
      () => useLiveCheckins('location-1', { realtime: true }),
      {
        wrapper: createTestWrapper(),
      }
    )

    await waitFor(() => {
      expect(supabase.channel).toHaveBeenCalled()
    })

    const channelMock = getChannelMock()

    unmount()

    expect(channelMock.unsubscribe).toHaveBeenCalled()
  })

  // ==========================================================================
  // EDGE CASES
  // ==========================================================================

  it('handles empty checkin list with access', async () => {
    mockAuth = { userId: 'user-1', isAuthenticated: true }

    vi.mocked(supabase.rpc).mockImplementation((name: string) => {
      if (name === 'get_active_checkin_count_at_location') {
        return Promise.resolve({ data: 0, error: null })
      }
      if (name === 'get_active_checkins_at_location') {
        return Promise.resolve({ data: [], error: null })
      }
      return Promise.resolve({ data: null, error: null })
    })

    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          }),
        }),
      }),
    } as any)

    const { result } = renderHook(() => useLiveCheckins('location-1', { realtime: false }), {
      wrapper: createTestWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current).toMatchObject({
      checkins: [],
      count: 0,
      hasAccess: true,
      accessReason: 'checked_in',
      error: null,
    })
  })
})
