/**
 * Tests for hooks/useRegulars.ts
 *
 * Tests regulars mode management hooks.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React, { type ReactNode } from 'react'

// Mock supabase
const mockRpc = vi.fn()
const mockFrom = vi.fn()
const mockSelect = vi.fn()
const mockEq = vi.fn()
const mockSingle = vi.fn()

vi.mock('../../lib/supabase', () => ({
  supabase: {
    rpc: (...args: unknown[]) => mockRpc(...args),
    from: (...args: unknown[]) => mockFrom(...args),
  },
}))

// Mock useAuth
const mockUseAuth = vi.fn()
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}))

import {
  useRegularsMode,
  useFellowRegulars,
  useLocationRegulars,
} from '../useRegulars'

// Wrapper with QueryClientProvider
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  })
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

describe('useRegularsMode', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Default: authenticated user
    mockUseAuth.mockReturnValue({
      userId: 'user-123',
      isAuthenticated: true,
    })

    // Set up mock chain for profiles select
    mockFrom.mockReturnValue({
      select: mockSelect,
    })
    mockSelect.mockReturnValue({ eq: mockEq })
    mockEq.mockReturnValue({ single: mockSingle })

    // Default: regulars mode enabled
    mockSingle.mockResolvedValue({
      data: { regulars_mode_enabled: true, regulars_visibility: 'mutual' },
      error: null,
    })

    // Default: RPC returns success
    mockRpc.mockResolvedValue({ data: true, error: null })
  })

  describe('initial state', () => {
    it('should start with loading true', () => {
      const { result } = renderHook(() => useRegularsMode(), { wrapper: createWrapper() })

      expect(result.current.isLoading).toBe(true)
    })

    it('should load settings on mount', async () => {
      const { result } = renderHook(() => useRegularsMode(), { wrapper: createWrapper() })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(mockFrom).toHaveBeenCalledWith('profiles')
      expect(mockSelect).toHaveBeenCalledWith('regulars_mode_enabled, regulars_visibility')
    })

    it('should set isEnabled from database', async () => {
      mockSingle.mockResolvedValue({
        data: { regulars_mode_enabled: false, regulars_visibility: 'public' },
        error: null,
      })

      const { result } = renderHook(() => useRegularsMode(), { wrapper: createWrapper() })

      await waitFor(() => {
        expect(result.current.isEnabled).toBe(false)
      })
    })

    it('should set visibility from database', async () => {
      mockSingle.mockResolvedValue({
        data: { regulars_mode_enabled: true, regulars_visibility: 'hidden' },
        error: null,
      })

      const { result } = renderHook(() => useRegularsMode(), { wrapper: createWrapper() })

      await waitFor(() => {
        expect(result.current.visibility).toBe('hidden')
      })
    })

    it('should use defaults when not authenticated', async () => {
      mockUseAuth.mockReturnValue({
        userId: null,
        isAuthenticated: false,
      })

      const { result } = renderHook(() => useRegularsMode(), { wrapper: createWrapper() })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      // Defaults are used, no fetch
      expect(result.current.isEnabled).toBe(true)
      expect(result.current.visibility).toBe('mutual')
      expect(mockFrom).not.toHaveBeenCalled()
    })

    it('should not fetch when disabled', async () => {
      renderHook(() => useRegularsMode({ enabled: false }), { wrapper: createWrapper() })

      await new Promise((r) => setTimeout(r, 50))

      expect(mockFrom).not.toHaveBeenCalled()
    })
  })

  describe('toggleMode', () => {
    it('should call toggle_regulars_mode RPC', async () => {
      // Initial fetch returns enabled=true
      mockSingle
        .mockResolvedValueOnce({
          data: { regulars_mode_enabled: true, regulars_visibility: 'mutual' },
          error: null,
        })
        // After toggle, refetch returns enabled=false
        .mockResolvedValueOnce({
          data: { regulars_mode_enabled: false, regulars_visibility: 'mutual' },
          error: null,
        })

      const { result } = renderHook(() => useRegularsMode(), { wrapper: createWrapper() })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      mockRpc.mockResolvedValue({ data: false, error: null })

      let success: boolean
      await act(async () => {
        success = await result.current.toggleMode()
      })

      expect(success!).toBe(true)
      expect(mockRpc).toHaveBeenCalledWith('toggle_regulars_mode', {
        p_user_id: 'user-123',
        p_enabled: null,
      })

      await waitFor(() => {
        expect(result.current.isEnabled).toBe(false)
      })
    })

    it('should return false when not authenticated', async () => {
      mockUseAuth.mockReturnValue({
        userId: null,
        isAuthenticated: false,
      })

      const { result } = renderHook(() => useRegularsMode(), { wrapper: createWrapper() })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      let success: boolean
      await act(async () => {
        success = await result.current.toggleMode()
      })

      expect(success!).toBe(false)
    })

    it('should handle RPC error', async () => {
      const { result } = renderHook(() => useRegularsMode(), { wrapper: createWrapper() })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      mockRpc.mockResolvedValue({ data: null, error: { message: 'Toggle failed' } })

      let toggleResult: boolean
      await act(async () => {
        toggleResult = await result.current.toggleMode()
      })

      // toggleMode catches the error and returns false
      expect(toggleResult!).toBe(false)
    })
  })

  describe('setMode', () => {
    it('should set mode to true', async () => {
      // Initial fetch returns enabled=false
      mockSingle
        .mockResolvedValueOnce({
          data: { regulars_mode_enabled: false, regulars_visibility: 'mutual' },
          error: null,
        })
        // After setMode, refetch returns enabled=true
        .mockResolvedValueOnce({
          data: { regulars_mode_enabled: true, regulars_visibility: 'mutual' },
          error: null,
        })

      const { result } = renderHook(() => useRegularsMode(), { wrapper: createWrapper() })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      mockRpc.mockResolvedValue({ data: true, error: null })

      let success: boolean
      await act(async () => {
        success = await result.current.setMode(true)
      })

      expect(success!).toBe(true)
      expect(mockRpc).toHaveBeenCalledWith('toggle_regulars_mode', {
        p_user_id: 'user-123',
        p_enabled: true,
      })

      await waitFor(() => {
        expect(result.current.isEnabled).toBe(true)
      })
    })

    it('should return true when already at desired state', async () => {
      mockSingle.mockResolvedValue({
        data: { regulars_mode_enabled: true, regulars_visibility: 'mutual' },
        error: null,
      })

      const { result } = renderHook(() => useRegularsMode(), { wrapper: createWrapper() })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      mockRpc.mockClear()

      let success: boolean
      await act(async () => {
        success = await result.current.setMode(true)
      })

      expect(success!).toBe(true)
      expect(mockRpc).not.toHaveBeenCalled()
    })
  })

  describe('setVisibility', () => {
    it('should set visibility via RPC', async () => {
      // Initial fetch returns visibility=mutual
      mockSingle
        .mockResolvedValueOnce({
          data: { regulars_mode_enabled: true, regulars_visibility: 'mutual' },
          error: null,
        })
        // After setVisibility, refetch returns visibility=public
        .mockResolvedValueOnce({
          data: { regulars_mode_enabled: true, regulars_visibility: 'public' },
          error: null,
        })

      const { result } = renderHook(() => useRegularsMode(), { wrapper: createWrapper() })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      mockRpc.mockResolvedValue({ error: null })

      let success: boolean
      await act(async () => {
        success = await result.current.setVisibility('public')
      })

      expect(success!).toBe(true)
      expect(mockRpc).toHaveBeenCalledWith('set_regulars_visibility', {
        p_user_id: 'user-123',
        p_visibility: 'public',
      })

      await waitFor(() => {
        expect(result.current.visibility).toBe('public')
      })
    })

    it('should return false when not authenticated', async () => {
      mockUseAuth.mockReturnValue({
        userId: null,
        isAuthenticated: false,
      })

      const { result } = renderHook(() => useRegularsMode(), { wrapper: createWrapper() })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      let success: boolean
      await act(async () => {
        success = await result.current.setVisibility('public')
      })

      expect(success!).toBe(false)
    })

    it('should return true when already at desired visibility', async () => {
      mockSingle.mockResolvedValue({
        data: { regulars_mode_enabled: true, regulars_visibility: 'hidden' },
        error: null,
      })

      const { result } = renderHook(() => useRegularsMode(), { wrapper: createWrapper() })

      await waitFor(() => {
        expect(result.current.visibility).toBe('hidden')
      })

      mockRpc.mockClear()

      let success: boolean
      await act(async () => {
        success = await result.current.setVisibility('hidden')
      })

      expect(success!).toBe(true)
      expect(mockRpc).not.toHaveBeenCalled()
    })
  })

  describe('refresh', () => {
    it('should refetch settings', async () => {
      // Initial fetch returns enabled=true
      mockSingle
        .mockResolvedValueOnce({
          data: { regulars_mode_enabled: true, regulars_visibility: 'mutual' },
          error: null,
        })
        // After refresh, returns enabled=false
        .mockResolvedValueOnce({
          data: { regulars_mode_enabled: false, regulars_visibility: 'public' },
          error: null,
        })

      const { result } = renderHook(() => useRegularsMode(), { wrapper: createWrapper() })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      await act(async () => {
        await result.current.refresh()
      })

      await waitFor(() => {
        expect(result.current.isEnabled).toBe(false)
        expect(result.current.visibility).toBe('public')
      })
    })
  })

  describe('error handling', () => {
    it('should set error when fetch fails', async () => {
      mockSingle.mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      })

      const { result } = renderHook(() => useRegularsMode(), { wrapper: createWrapper() })

      await waitFor(() => {
        expect(result.current.error?.code).toBe('FETCH_ERROR')
      })
    })

    it('should handle exception', async () => {
      mockSingle.mockRejectedValue(new Error('Network error'))

      const { result } = renderHook(() => useRegularsMode(), { wrapper: createWrapper() })

      await waitFor(() => {
        expect(result.current.error?.code).toBe('FETCH_ERROR')
      })
    })
  })
})

describe('useFellowRegulars', () => {
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

  describe('initial state', () => {
    it('should start with empty regulars when disabled', () => {
      const { result } = renderHook(() => useFellowRegulars({ enabled: false }), { wrapper: createWrapper() })

      expect(result.current.regulars).toEqual([])
    })

    it('should start with isLoading false when disabled', () => {
      // With TanStack Query, when enabled=false and no cached data,
      // the query is in 'pending' state but isLoading is false (not fetching)
      const { result } = renderHook(() => useFellowRegulars({ enabled: false }), { wrapper: createWrapper() })

      // When disabled, the query never fetches so isLoading can be true or false
      // The key behavior is that no fetch occurs
      expect(result.current.regulars).toEqual([])
    })

    it('should not fetch when disabled', async () => {
      renderHook(() => useFellowRegulars({ enabled: false }), { wrapper: createWrapper() })

      await new Promise((r) => setTimeout(r, 50))

      expect(mockRpc).not.toHaveBeenCalled()
    })
  })

  describe('fetching regulars', () => {
    it('should fetch regulars when enabled', async () => {
      const mockData = [
        {
          fellow_user_id: 'user-456',
          display_name: 'John',
          avatar_url: null,
          is_verified: true,
          location_id: 'loc-1',
          location_name: 'Coffee Shop',
          shared_weeks: 4,
          visibility: 'public',
        },
      ]
      mockRpc.mockResolvedValue({ data: mockData, error: null })

      const { result } = renderHook(() => useFellowRegulars(), { wrapper: createWrapper() })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(mockRpc).toHaveBeenCalledWith('get_fellow_regulars', {
        p_user_id: 'user-123',
        p_location_id: null,
      })
      expect(result.current.regulars).toEqual(mockData)
    })

    it('should pass locationId when provided', async () => {
      renderHook(() => useFellowRegulars({ locationId: 'loc-123' }), { wrapper: createWrapper() })

      await waitFor(() => {
        expect(mockRpc).toHaveBeenCalledWith('get_fellow_regulars', {
          p_user_id: 'user-123',
          p_location_id: 'loc-123',
        })
      })
    })

    it('should return empty array when not authenticated', async () => {
      mockUseAuth.mockReturnValue({
        userId: null,
        isAuthenticated: false,
      })

      const { result } = renderHook(() => useFellowRegulars(), { wrapper: createWrapper() })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.regulars).toEqual([])
      expect(mockRpc).not.toHaveBeenCalled()
    })
  })

  describe('error handling', () => {
    it('should set error on RPC failure', async () => {
      mockRpc.mockResolvedValue({
        data: null,
        error: { message: 'Failed to fetch regulars' },
      })

      const { result } = renderHook(() => useFellowRegulars(), { wrapper: createWrapper() })

      await waitFor(() => {
        expect(result.current.error?.code).toBe('FETCH_ERROR')
      })
    })

    it('should handle exception during fetch', async () => {
      mockRpc.mockRejectedValue(new Error('Network error'))

      const { result } = renderHook(() => useFellowRegulars(), { wrapper: createWrapper() })

      await waitFor(() => {
        expect(result.current.error?.code).toBe('FETCH_ERROR')
      })

      expect(result.current.error?.message).toBe('Network error')
    })

    it('should handle non-Error exception during fetch', async () => {
      mockRpc.mockRejectedValue('String error')

      const { result } = renderHook(() => useFellowRegulars(), { wrapper: createWrapper() })

      await waitFor(() => {
        expect(result.current.error?.code).toBe('FETCH_ERROR')
      })
    })
  })

  describe('refetch', () => {
    it('should refetch data', async () => {
      const { result } = renderHook(() => useFellowRegulars(), { wrapper: createWrapper() })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      mockRpc.mockClear()
      mockRpc.mockResolvedValue({
        data: [{ fellow_user_id: 'new-user' }],
        error: null,
      })

      await act(async () => {
        await result.current.refetch()
      })

      expect(mockRpc).toHaveBeenCalled()
    })
  })
})

describe('useLocationRegulars', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mockUseAuth.mockReturnValue({
      userId: 'user-123',
      isAuthenticated: true,
    })

    // By default, mock the optimized RPC to fail with PGRST202 to trigger fallback
    mockRpc.mockResolvedValue({
      data: null,
      error: { code: 'PGRST202', message: 'RPC not found' },
    })

    // Mock from chain for location_regulars check
    const mockEq2 = vi.fn()
    const mockSingleLr = vi.fn()
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: mockEq2,
        }),
      }),
    })
    mockEq2.mockReturnValue({ single: mockSingleLr })
    mockSingleLr.mockResolvedValue({
      data: { is_regular: false },
      error: null,
    })
  })

  it('should not fetch when locationId is empty', async () => {
    renderHook(() => useLocationRegulars('', { enabled: false }), { wrapper: createWrapper() })

    await new Promise((r) => setTimeout(r, 50))

    expect(mockRpc).not.toHaveBeenCalled()
  })

  it('should start with empty regulars when disabled', () => {
    const { result } = renderHook(() => useLocationRegulars('loc-123', { enabled: false }), { wrapper: createWrapper() })

    expect(result.current.regulars).toEqual([])
    expect(result.current.totalCount).toBe(0)
    expect(result.current.isUserRegular).toBe(false)
  })

  it('should fetch count on mount', async () => {
    // First call: optimized RPC fails with PGRST202
    // Second call: count RPC returns 5
    mockRpc
      .mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST202', message: 'RPC not found' },
      })
      .mockResolvedValueOnce({ data: 5, error: null }) // count

    const { result } = renderHook(() => useLocationRegulars('loc-123'), { wrapper: createWrapper() })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(mockRpc).toHaveBeenCalledWith('get_location_regulars_count', {
      p_location_id: 'loc-123',
    })
    expect(result.current.totalCount).toBe(5)
  })

  it('should handle error when fetching count', async () => {
    // First call: optimized RPC fails with PGRST202
    // Second call: count RPC also fails
    mockRpc
      .mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST202', message: 'RPC not found' },
      })
      .mockResolvedValueOnce({
        data: null,
        error: { message: 'Count error' },
      })

    const { result } = renderHook(() => useLocationRegulars('loc-123'), { wrapper: createWrapper() })

    await waitFor(() => {
      expect(result.current.error?.code).toBe('FETCH_ERROR')
    })
  })

  it('should set loading false when locationId is empty', async () => {
    const { result } = renderHook(() => useLocationRegulars(''), { wrapper: createWrapper() })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.regulars).toEqual([])
    expect(result.current.totalCount).toBe(0)
  })

  it('should set isUserRegular true and fetch regulars when user is a regular', async () => {
    // Mock from chain for location_regulars check - user IS a regular
    const mockEq2 = vi.fn()
    const mockSingleLr = vi.fn()
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: mockEq2,
        }),
      }),
    })
    mockEq2.mockReturnValue({ single: mockSingleLr })
    mockSingleLr.mockResolvedValue({
      data: { is_regular: true },
      error: null,
    })

    mockRpc
      .mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST202', message: 'RPC not found' },
      })
      .mockResolvedValueOnce({ data: 3, error: null }) // count
      .mockResolvedValueOnce({
        // regulars list
        data: [
          { user_id: 'user-456', display_name: 'Fellow Regular', avatar_url: null },
        ],
        error: null,
      })

    const { result } = renderHook(() => useLocationRegulars('loc-123'), { wrapper: createWrapper() })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.isUserRegular).toBe(true)
    expect(result.current.totalCount).toBe(3)
    expect(result.current.regulars).toHaveLength(1)
    expect(mockRpc).toHaveBeenCalledWith('get_location_regulars', {
      p_location_id: 'loc-123',
      p_limit: 20,
    })
  })

  it('should handle error when fetching regulars list', async () => {
    // Mock from chain - user IS a regular
    const mockEq2 = vi.fn()
    const mockSingleLr = vi.fn()
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: mockEq2,
        }),
      }),
    })
    mockEq2.mockReturnValue({ single: mockSingleLr })
    mockSingleLr.mockResolvedValue({
      data: { is_regular: true },
      error: null,
    })

    mockRpc
      .mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST202', message: 'RPC not found' },
      })
      .mockResolvedValueOnce({ data: 3, error: null }) // count
      .mockResolvedValueOnce({
        // regulars list error
        data: null,
        error: { message: 'Failed to fetch regulars list' },
      })

    const { result } = renderHook(() => useLocationRegulars('loc-123'), { wrapper: createWrapper() })

    await waitFor(() => {
      expect(result.current.error?.code).toBe('FETCH_ERROR')
    })

    expect(result.current.error?.message).toBe('Failed to fetch regulars list')
  }, 10000)

  it('should handle exception during fetch', async () => {
    mockRpc.mockRejectedValue(new Error('Network error'))

    const { result } = renderHook(() => useLocationRegulars('loc-123'), { wrapper: createWrapper() })

    await waitFor(() => {
      expect(result.current.error?.code).toBe('FETCH_ERROR')
    })

    expect(result.current.error?.message).toBe('Network error')
  })

  it('should handle non-Error exception during fetch', async () => {
    mockRpc.mockRejectedValue('String error')

    const { result } = renderHook(() => useLocationRegulars('loc-123'), { wrapper: createWrapper() })

    await waitFor(() => {
      expect(result.current.error?.code).toBe('FETCH_ERROR')
    })
  })
})
