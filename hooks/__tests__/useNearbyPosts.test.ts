import { renderHook, act, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockRpc = vi.fn()
const mockFrom = vi.fn()

vi.mock('../../lib/supabase', () => ({
  supabase: {
    rpc: (...args: unknown[]) => mockRpc(...args),
    from: (...args: unknown[]) => mockFrom(...args),
  },
}))

vi.mock('../useLocation', () => ({
  useLocation: vi.fn(() => ({
    latitude: 40.7128,
    longitude: -74.006,
    loading: false,
    error: null,
  })),
}))

import { useLocation } from '../useLocation'
import { useNearbyPosts, RADIUS_TIERS } from '../useNearbyPosts'

const mockedUseLocation = vi.mocked(useLocation)

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makePosts(n: number) {
  return Array.from({ length: n }, (_, i) => ({
    id: `post-${i}`,
    content: `Post ${i}`,
    created_at: new Date().toISOString(),
  }))
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useNearbyPosts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRpc.mockResolvedValue({ data: makePosts(10), error: null })
  })

  it('fetches posts via RPC with user coordinates', async () => {
    const { result } = renderHook(() => useNearbyPosts(500))

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(mockRpc).toHaveBeenCalledWith('get_posts_within_radius', expect.objectContaining({
      p_lat: 40.7128,
      p_lng: -74.006,
      p_radius_meters: 500,
    }))
    expect(result.current.posts).toHaveLength(10)
    expect(result.current.error).toBeNull()
  })

  it('expands radius tier when not enough posts at first tier', async () => {
    // First call (500m) returns too few, second call (2km) returns enough
    mockRpc
      .mockResolvedValueOnce({ data: makePosts(2), error: null })
      .mockResolvedValueOnce({ data: makePosts(8), error: null })

    const { result } = renderHook(() => useNearbyPosts(500, true))

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(mockRpc).toHaveBeenCalledTimes(2)
    expect(result.current.activeTier.value).toBe(2000)
    expect(result.current.effectiveRadius).toBe(2000)
    expect(result.current.posts).toHaveLength(8)
  })

  it('expands through all tiers until last tier', async () => {
    // All tiers return 0 posts
    mockRpc.mockResolvedValue({ data: [], error: null })

    const { result } = renderHook(() => useNearbyPosts(500, true))

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(mockRpc).toHaveBeenCalledTimes(RADIUS_TIERS.length)
    expect(result.current.activeTier.value).toBe(25000)
  })

  it('skips tiered expansion when disabled', async () => {
    mockRpc.mockResolvedValue({ data: makePosts(1), error: null })

    const { result } = renderHook(() => useNearbyPosts(500, false))

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(mockRpc).toHaveBeenCalledTimes(1)
    expect(result.current.usingTieredExpansion).toBe(false)
  })

  it('returns loading true initially', () => {
    mockRpc.mockReturnValue(new Promise(() => {})) // never resolves
    const { result } = renderHook(() => useNearbyPosts())
    expect(result.current.isLoading).toBe(true)
  })

  it('sets error when RPC throws', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: 'db down' } })

    const { result } = renderHook(() => useNearbyPosts(500))

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.error).toBe('db down')
    expect(result.current.posts).toEqual([])
  })

  it('handles no location gracefully', async () => {
    mockedUseLocation.mockReturnValue({
      latitude: null as unknown as number,
      longitude: null as unknown as number,
      loading: false,
      error: null,
    })

    const { result } = renderHook(() => useNearbyPosts())

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.error).toBe('Unable to get current location')
  })

  it('refetch triggers a new data load', async () => {
    const { result } = renderHook(() => useNearbyPosts(500))

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(mockRpc).toHaveBeenCalledTimes(1)

    await act(async () => {
      await result.current.refetch()
    })

    expect(mockRpc).toHaveBeenCalledTimes(2)
  })
})
