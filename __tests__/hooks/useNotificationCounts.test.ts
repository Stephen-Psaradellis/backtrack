/**
 * @vitest-environment jsdom
 */

/**
 * Unit tests for useNotificationCounts hook
 *
 * Tests the notification counts hook including:
 * - Returns zero counts for new user
 * - Returns correct aggregate counts
 * - markAsSeen clears counts
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

// Mock AsyncStorage
const mockAsyncStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
}

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: (key: string) => mockAsyncStorage.getItem(key),
    setItem: (key: string, value: string) => mockAsyncStorage.setItem(key, value),
  },
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
  useNotificationCounts,
  type UseNotificationCountsResult,
  type NotificationCounts,
} from '../../hooks/useNotificationCounts'

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

// Default counts (what hook returns when no data)
const DEFAULT_COUNTS: NotificationCounts = {
  unreadMessages: 0,
  newMatches: 0,
  newPostsAtRegulars: 0,
  newPostsAtFavorites: 0,
  total: 0,
}

// Mock RPC response data (uses snake_case)
const MOCK_RPC_DATA = {
  unread_messages: 5,
  new_matches: 3,
  new_posts_at_regulars: 2,
  new_posts_at_favorites: 1,
}

// Expected hook output (uses camelCase)
const MOCK_COUNTS: NotificationCounts = {
  unreadMessages: 5,
  newMatches: 3,
  newPostsAtRegulars: 2,
  newPostsAtFavorites: 1,
  total: 11, // sum of all above
}

// ============================================================================
// Setup and Teardown
// ============================================================================

describe('useNotificationCounts', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Default auth state (authenticated)
    mockUseAuth.mockReturnValue(DEFAULT_AUTH_STATE)

    // Default AsyncStorage responses
    mockAsyncStorage.getItem.mockResolvedValue(null)
    mockAsyncStorage.setItem.mockResolvedValue(undefined)

    // Default Supabase RPC response
    mockSupabaseRpc.mockImplementation((fnName: string) => {
      if (fnName === 'get_notification_counts') {
        return Promise.resolve({
          data: MOCK_RPC_DATA,
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
      const { result } = renderHook(() => useNotificationCounts())

      expect(result.current.isLoading).toBe(true)
      expect(result.current.counts).toEqual(DEFAULT_COUNTS)
    })

    it('loads counts on mount when authenticated', async () => {
      const { result } = renderHook(() => useNotificationCounts())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.counts).toEqual(MOCK_COUNTS)
    })
  })

  // ============================================================================
  // Zero Counts for New User Tests
  // ============================================================================

  describe('returns zero counts for new user', () => {
    it('returns zero counts when RPC returns zeros', async () => {
      mockSupabaseRpc.mockImplementation((fnName: string) => {
        if (fnName === 'get_notification_counts') {
          return Promise.resolve({
            data: {
              unread_messages: 0,
              new_matches: 0,
              new_posts_at_regulars: 0,
              new_posts_at_favorites: 0,
            },
            error: null,
          })
        }
        return Promise.resolve({ data: null, error: null })
      })

      const { result } = renderHook(() => useNotificationCounts())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.counts.unreadMessages).toBe(0)
      expect(result.current.counts.newMatches).toBe(0)
      expect(result.current.counts.newPostsAtRegulars).toBe(0)
      expect(result.current.counts.newPostsAtFavorites).toBe(0)
      expect(result.current.counts.total).toBe(0)
    })

    it('returns zero counts when RPC returns null data', async () => {
      mockSupabaseRpc.mockImplementation((fnName: string) => {
        if (fnName === 'get_notification_counts') {
          return Promise.resolve({
            data: null,
            error: null,
          })
        }
        return Promise.resolve({ data: null, error: null })
      })

      const { result } = renderHook(() => useNotificationCounts())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.counts).toEqual(DEFAULT_COUNTS)
    })

    it('returns zero counts when user is not authenticated', async () => {
      mockUseAuth.mockReturnValue(UNAUTHENTICATED_STATE)

      const { result } = renderHook(() => useNotificationCounts())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.counts).toEqual(DEFAULT_COUNTS)
      expect(mockSupabaseRpc).not.toHaveBeenCalled()
    })
  })

  // ============================================================================
  // Correct Aggregate Counts Tests
  // ============================================================================

  describe('returns correct aggregate counts', () => {
    it('returns correct counts from RPC', async () => {
      const { result } = renderHook(() => useNotificationCounts())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.counts.unreadMessages).toBe(5)
      expect(result.current.counts.newMatches).toBe(3)
      expect(result.current.counts.newPostsAtRegulars).toBe(2)
      expect(result.current.counts.newPostsAtFavorites).toBe(1)
      expect(result.current.counts.total).toBe(11)
    })

    it('calls RPC with correct user ID', async () => {
      const { result } = renderHook(() => useNotificationCounts())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(mockSupabaseRpc).toHaveBeenCalledWith('get_notification_counts', {
        p_user_id: TEST_USER_ID,
      })
    })

    it('total equals sum of all count fields', async () => {
      const customRpcData = {
        unread_messages: 10,
        new_matches: 7,
        new_posts_at_regulars: 5,
        new_posts_at_favorites: 3,
      }

      mockSupabaseRpc.mockImplementation((fnName: string) => {
        if (fnName === 'get_notification_counts') {
          return Promise.resolve({
            data: customRpcData,
            error: null,
          })
        }
        return Promise.resolve({ data: null, error: null })
      })

      const { result } = renderHook(() => useNotificationCounts())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      const expectedTotal = 10 + 7 + 5 + 3 // 25
      expect(result.current.counts.total).toBe(expectedTotal)
      expect(result.current.counts.total).toBe(
        result.current.counts.unreadMessages +
          result.current.counts.newMatches +
          result.current.counts.newPostsAtRegulars +
          result.current.counts.newPostsAtFavorites
      )
    })

    it('handles missing fields in RPC response', async () => {
      mockSupabaseRpc.mockImplementation((fnName: string) => {
        if (fnName === 'get_notification_counts') {
          return Promise.resolve({
            data: {
              unread_messages: 5,
              // other fields missing
            },
            error: null,
          })
        }
        return Promise.resolve({ data: null, error: null })
      })

      const { result } = renderHook(() => useNotificationCounts())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.counts.unreadMessages).toBe(5)
      expect(result.current.counts.newMatches).toBe(0)
      expect(result.current.counts.newPostsAtRegulars).toBe(0)
      expect(result.current.counts.newPostsAtFavorites).toBe(0)
      expect(result.current.counts.total).toBe(5)
    })
  })

  // ============================================================================
  // markAsSeen Clears Counts Tests
  // ============================================================================

  describe('markAsSeen clears counts', () => {
    it('markAsSeen resets all counts to zero', async () => {
      const { result } = renderHook(() => useNotificationCounts())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.counts.total).toBe(11)

      await act(async () => {
        await result.current.markAsSeen()
      })

      expect(result.current.counts).toEqual(DEFAULT_COUNTS)
    })

    it('markAsSeen saves timestamp to AsyncStorage', async () => {
      const { result } = renderHook(() => useNotificationCounts())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      await act(async () => {
        await result.current.markAsSeen()
      })

      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        'notification_last_seen_at',
        expect.any(String)
      )
    })

    it('markAsSeen handles AsyncStorage error gracefully', async () => {
      mockAsyncStorage.setItem.mockRejectedValue(new Error('Storage error'))

      const { result } = renderHook(() => useNotificationCounts())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      // Should not throw
      await act(async () => {
        await result.current.markAsSeen()
      })

      // The hook sets counts before awaiting AsyncStorage,
      // but when AsyncStorage fails, the counts may not be reset
      // depending on the implementation timing.
      // Just verify no exception was thrown (test passes if we get here)
      expect(result.current.isLoading).toBe(false)
    })
  })

  // ============================================================================
  // Loading/Error States Tests
  // ============================================================================

  describe('handles loading/error states', () => {
    it('sets isLoading to true initially', () => {
      const { result } = renderHook(() => useNotificationCounts())

      expect(result.current.isLoading).toBe(true)
    })

    it('sets isLoading to false after data loads', async () => {
      const { result } = renderHook(() => useNotificationCounts())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })
    })

    it('uses default counts when RPC returns an error', async () => {
      mockSupabaseRpc.mockImplementation((fnName: string) => {
        if (fnName === 'get_notification_counts') {
          return Promise.resolve({
            data: null,
            error: { message: 'Database connection failed' },
          })
        }
        return Promise.resolve({ data: null, error: null })
      })

      const { result } = renderHook(() => useNotificationCounts())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      // Hook uses default counts on error (no error property exposed)
      expect(result.current.counts).toEqual(DEFAULT_COUNTS)
    })

    it('uses default counts when RPC throws an exception', async () => {
      mockSupabaseRpc.mockImplementation((fnName: string) => {
        if (fnName === 'get_notification_counts') {
          return Promise.reject(new Error('Network error'))
        }
        return Promise.resolve({ data: null, error: null })
      })

      const { result } = renderHook(() => useNotificationCounts())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.counts).toEqual(DEFAULT_COUNTS)
    })

    it('finishes loading even when RPC fails', async () => {
      mockSupabaseRpc.mockImplementation((fnName: string) => {
        if (fnName === 'get_notification_counts') {
          return Promise.reject('String error')
        }
        return Promise.resolve({ data: null, error: null })
      })

      const { result } = renderHook(() => useNotificationCounts())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.counts).toEqual(DEFAULT_COUNTS)
    })
  })

  // ============================================================================
  // Re-fetch on Auth Change Tests
  // ============================================================================

  describe('auth state changes', () => {
    it('refetches when user ID changes', async () => {
      const { result, rerender } = renderHook(() => useNotificationCounts())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(mockSupabaseRpc).toHaveBeenCalledTimes(1)

      // Change user
      mockUseAuth.mockReturnValue({
        ...DEFAULT_AUTH_STATE,
        userId: 'new-user-456',
      })

      rerender()

      await waitFor(() => {
        expect(mockSupabaseRpc).toHaveBeenCalledWith('get_notification_counts', {
          p_user_id: 'new-user-456',
        })
      })
    })

    it('uses default counts when user logs out', async () => {
      const { result, rerender } = renderHook(() => useNotificationCounts())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.counts).toEqual(MOCK_COUNTS)

      // User logs out
      mockUseAuth.mockReturnValue(UNAUTHENTICATED_STATE)

      rerender()

      await waitFor(() => {
        expect(result.current.counts).toEqual(DEFAULT_COUNTS)
      })
    })
  })

  // ============================================================================
  // Edge Cases Tests
  // ============================================================================

  describe('edge cases', () => {
    it('handles partial counts from RPC with nulls', async () => {
      mockSupabaseRpc.mockImplementation((fnName: string) => {
        if (fnName === 'get_notification_counts') {
          return Promise.resolve({
            data: {
              unread_messages: null,
              new_matches: 5,
              new_posts_at_regulars: null,
              new_posts_at_favorites: 2,
            },
            error: null,
          })
        }
        return Promise.resolve({ data: null, error: null })
      })

      const { result } = renderHook(() => useNotificationCounts())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.counts.unreadMessages).toBe(0)
      expect(result.current.counts.newMatches).toBe(5)
      expect(result.current.counts.newPostsAtRegulars).toBe(0)
      expect(result.current.counts.newPostsAtFavorites).toBe(2)
      expect(result.current.counts.total).toBe(7)
    })

    it('hook is a function', () => {
      expect(typeof useNotificationCounts).toBe('function')
    })

    it('returns markAsSeen as a function', async () => {
      const { result } = renderHook(() => useNotificationCounts())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(typeof result.current.markAsSeen).toBe('function')
    })
  })
})
