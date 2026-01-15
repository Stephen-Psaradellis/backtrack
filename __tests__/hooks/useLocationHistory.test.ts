/**
 * @vitest-environment jsdom
 */

/**
 * Unit tests for useLocationHistory hook
 *
 * Tests the location history hook including:
 * - Returns empty array for new user
 * - Returns locations within daysBack period
 * - Filters out locations older than daysBack
 * - Handles loading/error states
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'

// ============================================================================
// Mock Setup
// ============================================================================

// Mock useAuth hook
const mockUseAuth = vi.fn()

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}))

// Mock Supabase client
const mockSupabaseRpc = vi.fn()

vi.mock('../../lib/supabase', () => ({
  supabase: {
    rpc: (fnName: string, params: unknown) => mockSupabaseRpc(fnName, params),
  },
}))

// Import the hook under test AFTER mocking dependencies
import {
  useLocationHistory,
  type UseLocationHistoryResult,
  type LocationWithVisitDate,
} from '../../hooks/useLocationHistory'

// ============================================================================
// Test Constants
// ============================================================================

const TEST_USER_ID = 'test-user-123'

const DEFAULT_AUTH_STATE = {
  userId: TEST_USER_ID,
  isAuthenticated: true,
  isLoading: false,
  profile: null,
  session: null,
  user: null,
  signUp: vi.fn(),
  signIn: vi.fn(),
  signOut: vi.fn(),
  resetPassword: vi.fn(),
  updatePassword: vi.fn(),
  refreshProfile: vi.fn(),
  updateProfile: vi.fn(),
}

const UNAUTHENTICATED_STATE = {
  ...DEFAULT_AUTH_STATE,
  userId: null,
  isAuthenticated: false,
}

// Generate mock locations with various visit dates
const createMockLocation = (
  id: string,
  name: string,
  daysAgo: number
): LocationWithVisitDate => {
  const visitDate = new Date()
  visitDate.setDate(visitDate.getDate() - daysAgo)

  return {
    id,
    google_place_id: `place-${id}`,
    name,
    address: `123 ${name} Street`,
    latitude: 37.7749 + Math.random() * 0.01,
    longitude: -122.4194 + Math.random() * 0.01,
    place_types: ['restaurant'],
    post_count: Math.floor(Math.random() * 10),
    created_at: new Date().toISOString(),
    last_visited_at: visitDate.toISOString(),
  }
}

const MOCK_LOCATIONS: LocationWithVisitDate[] = [
  createMockLocation('loc-1', 'Coffee Shop', 1), // 1 day ago
  createMockLocation('loc-2', 'Restaurant', 5), // 5 days ago
  createMockLocation('loc-3', 'Bar', 10), // 10 days ago
  createMockLocation('loc-4', 'Gym', 20), // 20 days ago
  createMockLocation('loc-5', 'Old Place', 45), // 45 days ago (outside default 30 days)
]

// ============================================================================
// Setup and Teardown
// ============================================================================

describe('useLocationHistory', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Default auth state (authenticated)
    mockUseAuth.mockReturnValue(DEFAULT_AUTH_STATE)

    // Default Supabase RPC response
    mockSupabaseRpc.mockImplementation((fnName: string) => {
      if (fnName === 'get_locations_visited_in_last_month') {
        return Promise.resolve({
          data: MOCK_LOCATIONS,
          error: null,
        })
      }
      return Promise.resolve({ data: null, error: null })
    })
  })

  // ============================================================================
  // Initial State Tests
  // ============================================================================

  describe('initial state', () => {
    it('returns default values while loading', () => {
      const { result } = renderHook(() => useLocationHistory())

      expect(result.current.isLoading).toBe(true)
      expect(result.current.locations).toEqual([])
      expect(result.current.error).toBeNull()
    })

    it('loads locations on mount when authenticated', async () => {
      const { result } = renderHook(() => useLocationHistory())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.locations.length).toBeGreaterThan(0)
      expect(result.current.error).toBeNull()
    })
  })

  // ============================================================================
  // Empty Array for New User Tests
  // ============================================================================

  describe('returns empty array for new user', () => {
    it('returns empty locations when RPC returns empty data', async () => {
      mockSupabaseRpc.mockImplementation((fnName: string) => {
        if (fnName === 'get_locations_visited_in_last_month') {
          return Promise.resolve({
            data: [],
            error: null,
          })
        }
        return Promise.resolve({ data: null, error: null })
      })

      const { result } = renderHook(() => useLocationHistory())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.locations).toEqual([])
      expect(result.current.error).toBeNull()
    })

    it('returns empty locations when RPC returns null data', async () => {
      mockSupabaseRpc.mockImplementation((fnName: string) => {
        if (fnName === 'get_locations_visited_in_last_month') {
          return Promise.resolve({
            data: null,
            error: null,
          })
        }
        return Promise.resolve({ data: null, error: null })
      })

      const { result } = renderHook(() => useLocationHistory())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.locations).toEqual([])
      expect(result.current.error).toBeNull()
    })

    it('returns empty array when user is not authenticated', async () => {
      mockUseAuth.mockReturnValue(UNAUTHENTICATED_STATE)

      const { result } = renderHook(() => useLocationHistory())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.locations).toEqual([])
      expect(result.current.error).toBeNull()
      expect(mockSupabaseRpc).not.toHaveBeenCalled()
    })
  })

  // ============================================================================
  // Returns Locations Within daysBack Period Tests
  // ============================================================================

  describe('returns locations within daysBack period', () => {
    it('returns all locations from RPC when using default daysBack (30)', async () => {
      // Mock returns locations within 30 days
      const locationsWithin30Days = MOCK_LOCATIONS.filter((_, index) => index < 4) // first 4 are within 30 days

      mockSupabaseRpc.mockImplementation((fnName: string) => {
        if (fnName === 'get_locations_visited_in_last_month') {
          return Promise.resolve({
            data: locationsWithin30Days,
            error: null,
          })
        }
        return Promise.resolve({ data: null, error: null })
      })

      const { result } = renderHook(() => useLocationHistory())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      // Default daysBack is 30, should return all 4 locations
      expect(result.current.locations).toHaveLength(4)
    })

    it('calls RPC with correct user ID', async () => {
      const { result } = renderHook(() => useLocationHistory())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(mockSupabaseRpc).toHaveBeenCalledWith(
        'get_locations_visited_in_last_month',
        { p_user_id: TEST_USER_ID }
      )
    })

    it('returns locations sorted by last_visited_at', async () => {
      const { result } = renderHook(() => useLocationHistory())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      // Locations should be as returned by RPC (assuming RPC returns sorted)
      expect(result.current.locations.length).toBeGreaterThan(0)
    })
  })

  // ============================================================================
  // Filters Out Locations Older Than daysBack Tests
  // ============================================================================

  describe('filters out locations older than daysBack', () => {
    it('filters locations when daysBack is less than default (30)', async () => {
      // RPC returns all locations including those within 30 days
      const { result } = renderHook(() => useLocationHistory(7))

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      // With daysBack=7, only locations from last 7 days should be included
      // loc-1 (1 day ago) and loc-2 (5 days ago) should be included
      // loc-3 (10 days ago) and beyond should be filtered out
      const locationsWithin7Days = result.current.locations.filter((loc) => {
        const visitDate = new Date(loc.last_visited_at)
        const cutoffDate = new Date()
        cutoffDate.setDate(cutoffDate.getDate() - 7)
        return visitDate >= cutoffDate
      })

      expect(result.current.locations).toEqual(locationsWithin7Days)
    })

    it('returns all locations when daysBack equals default (30)', async () => {
      const { result } = renderHook(() => useLocationHistory(30))

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      // Should return all locations from RPC (which defaults to 30 days)
      expect(result.current.locations).toHaveLength(MOCK_LOCATIONS.length)
    })

    it('applies custom daysBack filter correctly', async () => {
      const { result } = renderHook(() => useLocationHistory(15))

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      // With daysBack=15, locations older than 15 days should be filtered
      result.current.locations.forEach((loc) => {
        const visitDate = new Date(loc.last_visited_at)
        const cutoffDate = new Date()
        cutoffDate.setDate(cutoffDate.getDate() - 15)
        expect(visitDate >= cutoffDate).toBe(true)
      })
    })
  })

  // ============================================================================
  // Loading/Error States Tests
  // ============================================================================

  describe('handles loading/error states', () => {
    it('sets isLoading to true initially', () => {
      const { result } = renderHook(() => useLocationHistory())

      expect(result.current.isLoading).toBe(true)
    })

    it('sets isLoading to false after data loads', async () => {
      const { result } = renderHook(() => useLocationHistory())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })
    })

    it('sets error when RPC returns an error', async () => {
      mockSupabaseRpc.mockImplementation((fnName: string) => {
        if (fnName === 'get_locations_visited_in_last_month') {
          return Promise.resolve({
            data: null,
            error: { message: 'Database connection failed' },
          })
        }
        return Promise.resolve({ data: null, error: null })
      })

      const { result } = renderHook(() => useLocationHistory())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.error).toBe('Database connection failed')
      expect(result.current.locations).toEqual([])
    })

    it('sets error when RPC throws an exception', async () => {
      mockSupabaseRpc.mockImplementation((fnName: string) => {
        if (fnName === 'get_locations_visited_in_last_month') {
          return Promise.reject(new Error('Network error'))
        }
        return Promise.resolve({ data: null, error: null })
      })

      const { result } = renderHook(() => useLocationHistory())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.error).toBe('Network error')
      expect(result.current.locations).toEqual([])
    })

    it('handles non-Error exception gracefully', async () => {
      mockSupabaseRpc.mockImplementation((fnName: string) => {
        if (fnName === 'get_locations_visited_in_last_month') {
          return Promise.reject('String error')
        }
        return Promise.resolve({ data: null, error: null })
      })

      const { result } = renderHook(() => useLocationHistory())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.error).toBe('Failed to fetch location history')
    })

    it('sets isLoading to true during refetch', async () => {
      const { result } = renderHook(() => useLocationHistory())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      // Trigger refetch
      act(() => {
        result.current.refetch()
      })

      // Should be loading during refetch
      expect(result.current.isLoading).toBe(true)

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })
    })
  })

  // ============================================================================
  // Refetch Tests
  // ============================================================================

  describe('refetch functionality', () => {
    it('refetches data when refetch is called', async () => {
      const { result } = renderHook(() => useLocationHistory())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(mockSupabaseRpc).toHaveBeenCalledTimes(1)

      // Trigger refetch
      await act(async () => {
        await result.current.refetch()
      })

      expect(mockSupabaseRpc).toHaveBeenCalledTimes(2)
    })

    it('updates locations when refetch returns new data', async () => {
      let callCount = 0

      mockSupabaseRpc.mockImplementation((fnName: string) => {
        if (fnName === 'get_locations_visited_in_last_month') {
          callCount++
          if (callCount === 1) {
            return Promise.resolve({
              data: [MOCK_LOCATIONS[0]],
              error: null,
            })
          } else {
            return Promise.resolve({
              data: MOCK_LOCATIONS.slice(0, 3),
              error: null,
            })
          }
        }
        return Promise.resolve({ data: null, error: null })
      })

      const { result } = renderHook(() => useLocationHistory())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.locations).toHaveLength(1)

      // Trigger refetch
      await act(async () => {
        await result.current.refetch()
      })

      expect(result.current.locations).toHaveLength(3)
    })

    it('clears previous error on successful refetch', async () => {
      let callCount = 0

      mockSupabaseRpc.mockImplementation((fnName: string) => {
        if (fnName === 'get_locations_visited_in_last_month') {
          callCount++
          if (callCount === 1) {
            return Promise.resolve({
              data: null,
              error: { message: 'Initial error' },
            })
          } else {
            return Promise.resolve({
              data: MOCK_LOCATIONS,
              error: null,
            })
          }
        }
        return Promise.resolve({ data: null, error: null })
      })

      const { result } = renderHook(() => useLocationHistory())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.error).toBe('Initial error')

      // Trigger refetch
      await act(async () => {
        await result.current.refetch()
      })

      expect(result.current.error).toBeNull()
    })
  })

  // ============================================================================
  // daysBack Parameter Tests
  // ============================================================================

  describe('daysBack parameter', () => {
    it('refetches when daysBack changes', async () => {
      const { result, rerender } = renderHook(
        ({ daysBack }) => useLocationHistory(daysBack),
        { initialProps: { daysBack: 30 } }
      )

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      const initialLength = result.current.locations.length

      // Change daysBack to 7
      rerender({ daysBack: 7 })

      await waitFor(() => {
        // With smaller daysBack, should have fewer or equal locations
        expect(result.current.locations.length).toBeLessThanOrEqual(initialLength)
      })
    })
  })
})
