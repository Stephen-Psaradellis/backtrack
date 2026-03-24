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

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    setItem: vi.fn().mockResolvedValue(undefined),
    getItem: vi.fn().mockResolvedValue(null),
  },
}))

const mockUseAuth = vi.fn()
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}))

import AsyncStorage from '@react-native-async-storage/async-storage'
import { useNotificationCounts } from '../useNotificationCounts'

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useNotificationCounts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseAuth.mockReturnValue({ userId: 'user-1', isAuthenticated: true })
    mockRpc.mockResolvedValue({
      data: {
        unread_messages: 3,
        new_matches: 2,
        new_posts_at_regulars: 1,
        new_posts_at_favorites: 4,
      },
      error: null,
    })
  })

  it('returns notification counts from RPC', async () => {
    const { result } = renderHook(() => useNotificationCounts())

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.counts).toEqual({
      unreadMessages: 3,
      newMatches: 2,
      newPostsAtRegulars: 1,
      newPostsAtFavorites: 4,
      total: 10,
    })
  })

  it('calls RPC with userId', async () => {
    renderHook(() => useNotificationCounts())

    await waitFor(() => {
      expect(mockRpc).toHaveBeenCalledWith('get_notification_counts', {
        p_user_id: 'user-1',
      })
    })
  })

  it('returns default counts when no user is authenticated', async () => {
    mockUseAuth.mockReturnValue({ userId: null, isAuthenticated: false })

    const { result } = renderHook(() => useNotificationCounts())

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.counts.total).toBe(0)
    expect(mockRpc).not.toHaveBeenCalled()
  })

  it('returns default counts on RPC error', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: 'rpc not found' } })

    const { result } = renderHook(() => useNotificationCounts())

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.counts.total).toBe(0)
  })

  it('markAsSeen resets counts and writes to AsyncStorage', async () => {
    const { result } = renderHook(() => useNotificationCounts())

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.counts.total).toBe(10)

    await act(async () => {
      await result.current.markAsSeen()
    })

    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      'notification_last_seen_at',
      expect.any(String),
    )
    expect(result.current.counts.total).toBe(0)
  })

  it('loading is true initially', () => {
    mockRpc.mockReturnValue(new Promise(() => {}))
    const { result } = renderHook(() => useNotificationCounts())
    expect(result.current.isLoading).toBe(true)
  })
})
