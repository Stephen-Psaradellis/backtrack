import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useAchievements } from '../useAchievements'
import type {
  AchievementDefinition,
  UserAchievement,
  StreakLeaderboardEntry,
} from '../useAchievements'

// ============================================================================
// MOCKS
// ============================================================================

const mockFrom = vi.fn()
const mockRpc = vi.fn()

vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: (...args: any[]) => mockFrom(...args),
    rpc: (...args: any[]) => mockRpc(...args),
  },
}))

let mockUser: any = null

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: mockUser }),
}))

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Creates a chainable query builder that mimics Supabase's API
 * This must return a proper thenable Promise-like object
 */
function createChainableQuery(
  data: any[] | any = [],
  error: any = null,
  options?: {
    orHandler?: () => { data: any; error: any }
  }
) {
  let finalData = Array.isArray(data) ? data : (data !== null ? [data] : data)
  let finalError = error
  let isOrQuery = false

  const chain: any = {
    select: vi.fn(function(this: any) { return this }),
    eq: vi.fn(function(this: any) { return this }),
    or: vi.fn(function(this: any) {
      // If a custom or handler is provided, use it
      if (options?.orHandler) {
        const result = options.orHandler()
        isOrQuery = true
        finalData = result.data
        finalError = result.error
      }
      return this
    }),
    order: vi.fn(function(this: any) { return this }),
    single: vi.fn(() => {
      // For .single(), return data unwrapped (not in array)
      return Promise.resolve({ data, error })
    }),
  }

  // Make the chain thenable - this is critical for await to work
  chain.then = function(onfulfilled?: any, onrejected?: any) {
    const result = { data: finalData, error: finalError }
    const promise = Promise.resolve(result)
    return promise.then(onfulfilled, onrejected)
  }

  chain.catch = function(onrejected?: any) {
    const result = { data: finalData, error: finalError }
    const promise = Promise.resolve(result)
    return promise.catch(onrejected)
  }

  return chain
}

/**
 * Mock achievement definitions
 */
const mockDefinitions: AchievementDefinition[] = [
  {
    id: 'ach_1',
    category: 'explorer',
    name: 'First Steps',
    description: 'Visit your first location',
    icon: '🗺️',
    tier: 'bronze',
    requirement_type: 'visit_locations',
    requirement_value: 1,
  },
  {
    id: 'ach_2',
    category: 'social',
    name: 'Social Butterfly',
    description: 'Start 5 conversations',
    icon: '💬',
    tier: 'silver',
    requirement_type: 'start_conversations',
    requirement_value: 5,
  },
  {
    id: 'ach_3',
    category: 'streak',
    name: 'Dedicated',
    description: 'Maintain a 7-day streak',
    icon: '🔥',
    tier: 'gold',
    requirement_type: 'check_in_streak',
    requirement_value: 7,
  },
]

/**
 * Mock user achievements
 */
const mockUserAchievements: UserAchievement[] = [
  {
    id: 'ua_1',
    user_id: 'user_123',
    achievement_id: 'ach_1',
    earned_at: '2026-02-01T10:00:00Z',
  },
]

/**
 * Mock leaderboard data
 */
const mockLeaderboard: StreakLeaderboardEntry[] = [
  {
    user_id: 'user_1',
    display_name: 'Alice',
    current_streak: 10,
    max_streak: 15,
    location_id: 'loc_1',
    location_name: 'Coffee Shop',
  },
  {
    user_id: 'user_2',
    display_name: 'Bob',
    current_streak: 8,
    max_streak: 8,
    location_id: 'loc_2',
    location_name: 'Park',
  },
]

// ============================================================================
// TESTS
// ============================================================================

describe('useAchievements', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUser = { id: 'user_123' }
  })

  afterEach(() => {
    mockUser = null
  })

  // --------------------------------------------------------------------------
  // LOADING STATE
  // --------------------------------------------------------------------------

  it('should start with loading state', () => {
    // Mock all queries to never resolve
    mockFrom.mockReturnValue(createChainableQuery([], null))
    mockRpc.mockResolvedValue({ data: 0, error: null })

    const { result } = renderHook(() => useAchievements())

    expect(result.current.loading).toBe(true)
    expect(result.current.achievements).toEqual([])
    expect(result.current.earnedAchievements).toEqual([])
    expect(result.current.lockedAchievements).toEqual([])
  })

  // --------------------------------------------------------------------------
  // DATA LOADING
  // --------------------------------------------------------------------------

  it('should load achievement definitions from achievement_definitions table', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'achievement_definitions') {
        return createChainableQuery(mockDefinitions, null)
      }
      return createChainableQuery([], null)
    })
    mockRpc.mockResolvedValue({ data: 0, error: null })

    const { result } = renderHook(() => useAchievements())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.allDefinitions).toEqual(mockDefinitions)
    expect(result.current.totalCount).toBe(3)
  })

  it('should load user achievements when user exists', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'achievement_definitions') {
        return createChainableQuery(mockDefinitions, null)
      }
      if (table === 'user_achievements') {
        return createChainableQuery(mockUserAchievements, null)
      }
      if (table === 'checkins') {
        return createChainableQuery([{ location_id: 'loc_1' }], null)
      }
      if (table === 'conversations') {
        return createChainableQuery([], null)
      }
      if (table === 'posts') {
        return createChainableQuery([], null)
      }
      if (table === 'profiles') {
        return createChainableQuery(
          { is_verified: false, created_at: '2026-01-01T00:00:00Z' },
          null
        )
      }
      return createChainableQuery([], null)
    })
    mockRpc.mockResolvedValue({ data: 0, error: null })

    const { result } = renderHook(() => useAchievements())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.earnedCount).toBe(1)
    expect(result.current.earnedAchievements).toHaveLength(1)
    expect(result.current.earnedAchievements[0].id).toBe('ach_1')
    expect(result.current.earnedAchievements[0].earned).toBe(true)
  })

  it('should return empty achievements when user is null', async () => {
    mockUser = null

    mockFrom.mockImplementation((table: string) => {
      if (table === 'achievement_definitions') {
        return createChainableQuery(mockDefinitions, null)
      }
      return createChainableQuery([], null)
    })
    mockRpc.mockResolvedValue({ data: 0, error: null })

    const { result } = renderHook(() => useAchievements())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.earnedCount).toBe(0)
    expect(result.current.earnedAchievements).toEqual([])
    expect(result.current.progress).toBeNull()
  })

  // --------------------------------------------------------------------------
  // COMPUTED PROPERTIES
  // --------------------------------------------------------------------------

  it('should filter earnedAchievements correctly', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'achievement_definitions') {
        return createChainableQuery(mockDefinitions, null)
      }
      if (table === 'user_achievements') {
        return createChainableQuery(mockUserAchievements, null)
      }
      if (table === 'checkins') {
        return createChainableQuery([{ location_id: 'loc_1' }], null)
      }
      if (table === 'conversations') {
        return createChainableQuery([], null)
      }
      if (table === 'posts') {
        return createChainableQuery([], null)
      }
      if (table === 'profiles') {
        return createChainableQuery(
          { is_verified: false, created_at: '2026-01-01T00:00:00Z' },
          null
        )
      }
      return createChainableQuery([], null)
    })
    mockRpc.mockResolvedValue({ data: 0, error: null })

    const { result } = renderHook(() => useAchievements())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    const earnedIds = result.current.earnedAchievements.map((a) => a.id)
    expect(earnedIds).toEqual(['ach_1'])
    expect(result.current.earnedAchievements.every((a) => a.earned)).toBe(true)
  })

  it('should filter lockedAchievements correctly', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'achievement_definitions') {
        return createChainableQuery(mockDefinitions, null)
      }
      if (table === 'user_achievements') {
        return createChainableQuery(mockUserAchievements, null)
      }
      if (table === 'checkins') {
        return createChainableQuery([{ location_id: 'loc_1' }], null)
      }
      if (table === 'conversations') {
        return createChainableQuery([], null)
      }
      if (table === 'posts') {
        return createChainableQuery([], null)
      }
      if (table === 'profiles') {
        return createChainableQuery(
          { is_verified: false, created_at: '2026-01-01T00:00:00Z' },
          null
        )
      }
      return createChainableQuery([], null)
    })
    mockRpc.mockResolvedValue({ data: 0, error: null })

    const { result } = renderHook(() => useAchievements())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    const lockedIds = result.current.lockedAchievements.map((a) => a.id)
    expect(lockedIds).toContain('ach_2')
    expect(lockedIds).toContain('ach_3')
    expect(result.current.lockedAchievements.every((a) => !a.earned)).toBe(true)
  })

  it('should calculate percentComplete correctly', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'achievement_definitions') {
        return createChainableQuery(mockDefinitions, null)
      }
      if (table === 'user_achievements') {
        return createChainableQuery(mockUserAchievements, null)
      }
      if (table === 'checkins') {
        return createChainableQuery([{ location_id: 'loc_1' }], null)
      }
      if (table === 'conversations') {
        return createChainableQuery([], null)
      }
      if (table === 'posts') {
        return createChainableQuery([], null)
      }
      if (table === 'profiles') {
        return createChainableQuery(
          { is_verified: false, created_at: '2026-01-01T00:00:00Z' },
          null
        )
      }
      return createChainableQuery([], null)
    })
    mockRpc.mockResolvedValue({ data: 0, error: null })

    const { result } = renderHook(() => useAchievements())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    // 1 earned out of 3 total = 33%
    expect(result.current.percentComplete).toBe(33)
    expect(result.current.earnedCount).toBe(1)
    expect(result.current.totalCount).toBe(3)
  })

  it('should return 0 percent when no achievements exist', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'achievement_definitions') {
        return createChainableQuery([], null)
      }
      return createChainableQuery([], null)
    })
    mockRpc.mockResolvedValue({ data: 0, error: null })

    const { result } = renderHook(() => useAchievements())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.percentComplete).toBe(0)
    expect(result.current.totalCount).toBe(0)
  })

  // --------------------------------------------------------------------------
  // CHECK AND AWARD
  // --------------------------------------------------------------------------

  it('should call rpc check_and_award_achievements with user id', async () => {
    mockFrom.mockReturnValue(createChainableQuery([], null))
    mockRpc.mockImplementation((fn: string) => {
      if (fn === 'calculate_user_streak') {
        return Promise.resolve({ data: 0, error: null })
      }
      if (fn === 'check_and_award_achievements') {
        return Promise.resolve({
          data: [{ achievement_id: 'ach_2' }],
          error: null,
        })
      }
      return Promise.resolve({ data: null, error: null })
    })

    const { result } = renderHook(() => useAchievements())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    let awardedIds: string[] = []
    await act(async () => {
      awardedIds = await result.current.checkAndAward()
    })

    expect(mockRpc).toHaveBeenCalledWith('check_and_award_achievements', {
      p_user_id: 'user_123',
    })
    expect(awardedIds).toEqual(['ach_2'])
    expect(result.current.checking).toBe(false)
  })

  it('should return empty array when not authenticated', async () => {
    mockUser = null

    mockFrom.mockReturnValue(createChainableQuery([], null))
    mockRpc.mockResolvedValue({ data: 0, error: null })

    const { result } = renderHook(() => useAchievements())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    let awardedIds: string[] = []
    await act(async () => {
      awardedIds = await result.current.checkAndAward()
    })

    expect(awardedIds).toEqual([])
    expect(mockRpc).not.toHaveBeenCalledWith('check_and_award_achievements', expect.anything())
  })

  it('should set checking state during checkAndAward', async () => {
    // Mock all table queries needed for initial load and calculateProgress
    mockFrom.mockImplementation((table: string) => {
      if (table === 'achievement_definitions') {
        return createChainableQuery([], null)
      }
      if (table === 'user_achievements') {
        return createChainableQuery([], null)
      }
      if (table === 'checkins') {
        return createChainableQuery([], null)
      }
      if (table === 'conversations') {
        return createChainableQuery([], null)
      }
      if (table === 'posts') {
        return createChainableQuery([], null)
      }
      if (table === 'profiles') {
        return createChainableQuery({ is_verified: false, created_at: '2026-01-01T00:00:00Z' }, null)
      }
      return createChainableQuery([], null)
    })

    let resolveCheckAndAward: ((value: any) => void) | null = null
    const checkAndAwardPromise = new Promise((resolve) => {
      resolveCheckAndAward = resolve
    })

    mockRpc.mockImplementation((fn: string) => {
      if (fn === 'calculate_user_streak') {
        return Promise.resolve({ data: 0, error: null })
      }
      if (fn === 'check_and_award_achievements') {
        return checkAndAwardPromise.then(() => ({ data: [], error: null }))
      }
      return Promise.resolve({ data: null, error: null })
    })

    const { result } = renderHook(() => useAchievements())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.checking).toBe(false)

    // Start checkAndAward without awaiting
    let checkPromise: Promise<void>
    act(() => {
      checkPromise = result.current.checkAndAward().then(() => {})
    })

    // Should be checking during execution
    await waitFor(() => {
      expect(result.current.checking).toBe(true)
    })

    // Resolve the RPC call
    act(() => {
      resolveCheckAndAward!({ data: [], error: null })
    })

    // Wait for checkAndAward to complete
    await act(async () => {
      await checkPromise!
    })

    // Should finish checking after completion
    expect(result.current.checking).toBe(false)
  })

  // --------------------------------------------------------------------------
  // ERROR HANDLING
  // --------------------------------------------------------------------------

  it('should handle error when loading definitions fails', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    mockFrom.mockImplementation((table: string) => {
      if (table === 'achievement_definitions') {
        return createChainableQuery([], { message: 'Database error' })
      }
      // Mock other tables needed for calculateProgress
      if (table === 'user_achievements') {
        return createChainableQuery([], null)
      }
      if (table === 'checkins') {
        return createChainableQuery([], null)
      }
      if (table === 'conversations') {
        return createChainableQuery([], null)
      }
      if (table === 'posts') {
        return createChainableQuery([], null)
      }
      if (table === 'profiles') {
        return createChainableQuery({ is_verified: false, created_at: '2026-01-01T00:00:00Z' }, null)
      }
      return createChainableQuery([], null)
    })
    mockRpc.mockResolvedValue({ data: 0, error: null })

    const { result } = renderHook(() => useAchievements())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.error).toBe('Failed to load achievements')
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Error loading achievement definitions:',
      expect.any(Object)
    )

    consoleErrorSpy.mockRestore()
  })

  it('should handle error when loading user achievements fails', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    mockFrom.mockImplementation((table: string) => {
      if (table === 'achievement_definitions') {
        return createChainableQuery(mockDefinitions, null)
      }
      if (table === 'user_achievements') {
        return createChainableQuery([], { message: 'Database error' })
      }
      // Mock other tables needed for calculateProgress
      if (table === 'checkins') {
        return createChainableQuery([], null)
      }
      if (table === 'conversations') {
        return createChainableQuery([], null)
      }
      if (table === 'posts') {
        return createChainableQuery([], null)
      }
      if (table === 'profiles') {
        return createChainableQuery({ is_verified: false, created_at: '2026-01-01T00:00:00Z' }, null)
      }
      return createChainableQuery([], null)
    })
    mockRpc.mockResolvedValue({ data: 0, error: null })

    const { result } = renderHook(() => useAchievements())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.error).toBe('Failed to load your achievements')
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Error loading user achievements:',
      expect.any(Object)
    )

    consoleErrorSpy.mockRestore()
  })

  it('should handle error in checkAndAward', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    // Mock all tables needed for initial load
    mockFrom.mockImplementation((table: string) => {
      if (table === 'checkins') {
        return createChainableQuery([], null)
      }
      if (table === 'conversations') {
        return createChainableQuery([], null)
      }
      if (table === 'posts') {
        return createChainableQuery([], null)
      }
      if (table === 'profiles') {
        return createChainableQuery({ is_verified: false, created_at: '2026-01-01T00:00:00Z' }, null)
      }
      return createChainableQuery([], null)
    })

    mockRpc.mockImplementation((fn: string) => {
      if (fn === 'calculate_user_streak') {
        return Promise.resolve({ data: 0, error: null })
      }
      if (fn === 'check_and_award_achievements') {
        return Promise.resolve({ data: null, error: { message: 'RPC error' } })
      }
      return Promise.resolve({ data: null, error: null })
    })

    const { result } = renderHook(() => useAchievements())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    let awardedIds: string[] = []
    await act(async () => {
      awardedIds = await result.current.checkAndAward()
    })

    expect(awardedIds).toEqual([])
    expect(result.current.error).toBe('Failed to check achievements')
    expect(consoleErrorSpy).toHaveBeenCalledWith('Error checking achievements:', expect.any(Object))

    consoleErrorSpy.mockRestore()
  })

  // --------------------------------------------------------------------------
  // CLEAR ERROR
  // --------------------------------------------------------------------------

  it('should clear error state', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'achievement_definitions') {
        return createChainableQuery([], { message: 'Database error' })
      }
      // Mock other tables needed for calculateProgress
      if (table === 'user_achievements') {
        return createChainableQuery([], null)
      }
      if (table === 'checkins') {
        return createChainableQuery([], null)
      }
      if (table === 'conversations') {
        return createChainableQuery([], null)
      }
      if (table === 'posts') {
        return createChainableQuery([], null)
      }
      if (table === 'profiles') {
        return createChainableQuery({ is_verified: false, created_at: '2026-01-01T00:00:00Z' }, null)
      }
      return createChainableQuery([], null)
    })
    mockRpc.mockResolvedValue({ data: 0, error: null })

    const { result } = renderHook(() => useAchievements())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.error).toBeTruthy()

    act(() => {
      result.current.clearError()
    })

    expect(result.current.error).toBeNull()
  })

  // --------------------------------------------------------------------------
  // LEADERBOARD
  // --------------------------------------------------------------------------

  it('should load leaderboard using get_streak_leaderboard RPC', async () => {
    // Mock all tables for initial load and calculateProgress
    mockFrom.mockImplementation((table: string) => {
      if (table === 'achievement_definitions') {
        return createChainableQuery([], null)
      }
      if (table === 'user_achievements') {
        return createChainableQuery([], null)
      }
      if (table === 'checkins') {
        return createChainableQuery([], null)
      }
      if (table === 'conversations') {
        return createChainableQuery([], null)
      }
      if (table === 'posts') {
        return createChainableQuery([], null)
      }
      if (table === 'profiles') {
        return createChainableQuery({ is_verified: false, created_at: '2026-01-01T00:00:00Z' }, null)
      }
      return createChainableQuery([], null)
    })

    mockRpc.mockImplementation((fn: string, params?: any) => {
      if (fn === 'calculate_user_streak') {
        return Promise.resolve({ data: 0, error: null })
      }
      if (fn === 'get_streak_leaderboard') {
        return Promise.resolve({ data: mockLeaderboard, error: null })
      }
      return Promise.resolve({ data: null, error: null })
    })

    const { result } = renderHook(() => useAchievements())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    await act(async () => {
      await result.current.loadLeaderboard()
    })

    expect(mockRpc).toHaveBeenCalledWith('get_streak_leaderboard', { p_limit: 10 })
    expect(result.current.leaderboard).toEqual(mockLeaderboard)
    expect(result.current.leaderboardLoading).toBe(false)
  })

  it('should load leaderboard with location filter', async () => {
    // Mock all tables for initial load and calculateProgress
    mockFrom.mockImplementation((table: string) => {
      if (table === 'achievement_definitions') {
        return createChainableQuery([], null)
      }
      if (table === 'user_achievements') {
        return createChainableQuery([], null)
      }
      if (table === 'checkins') {
        return createChainableQuery([], null)
      }
      if (table === 'conversations') {
        return createChainableQuery([], null)
      }
      if (table === 'posts') {
        return createChainableQuery([], null)
      }
      if (table === 'profiles') {
        return createChainableQuery({ is_verified: false, created_at: '2026-01-01T00:00:00Z' }, null)
      }
      return createChainableQuery([], null)
    })

    mockRpc.mockImplementation((fn: string) => {
      if (fn === 'calculate_user_streak') {
        return Promise.resolve({ data: 0, error: null })
      }
      if (fn === 'get_streak_leaderboard') {
        return Promise.resolve({ data: mockLeaderboard, error: null })
      }
      return Promise.resolve({ data: null, error: null })
    })

    const { result } = renderHook(() => useAchievements())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    await act(async () => {
      await result.current.loadLeaderboard('loc_1')
    })

    expect(mockRpc).toHaveBeenCalledWith('get_streak_leaderboard', {
      p_location_id: 'loc_1',
      p_limit: 10,
    })
  })

  it('should handle leaderboard loading error', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    // Mock all tables for initial load and calculateProgress
    mockFrom.mockImplementation((table: string) => {
      if (table === 'achievement_definitions') {
        return createChainableQuery([], null)
      }
      if (table === 'user_achievements') {
        return createChainableQuery([], null)
      }
      if (table === 'checkins') {
        return createChainableQuery([], null)
      }
      if (table === 'conversations') {
        return createChainableQuery([], null)
      }
      if (table === 'posts') {
        return createChainableQuery([], null)
      }
      if (table === 'profiles') {
        return createChainableQuery({ is_verified: false, created_at: '2026-01-01T00:00:00Z' }, null)
      }
      return createChainableQuery([], null)
    })

    mockRpc.mockImplementation((fn: string) => {
      if (fn === 'calculate_user_streak') {
        return Promise.resolve({ data: 0, error: null })
      }
      if (fn === 'get_streak_leaderboard') {
        return Promise.resolve({ data: null, error: { message: 'RPC error' } })
      }
      return Promise.resolve({ data: null, error: null })
    })

    const { result } = renderHook(() => useAchievements())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    await act(async () => {
      await result.current.loadLeaderboard()
    })

    expect(result.current.error).toBe('Failed to load leaderboard')
    expect(result.current.leaderboardLoading).toBe(false)
    expect(consoleErrorSpy).toHaveBeenCalledWith('Error loading leaderboard:', expect.any(Object))

    consoleErrorSpy.mockRestore()
  })

  // --------------------------------------------------------------------------
  // REFRESH
  // --------------------------------------------------------------------------

  it('should refresh all data when refresh is called', async () => {
    // Mock all tables for initial load and refresh
    mockFrom.mockImplementation((table: string) => {
      if (table === 'checkins') {
        return createChainableQuery([], null)
      }
      if (table === 'conversations') {
        return createChainableQuery([], null)
      }
      if (table === 'posts') {
        return createChainableQuery([], null)
      }
      if (table === 'profiles') {
        return createChainableQuery({ is_verified: false, created_at: '2026-01-01T00:00:00Z' }, null)
      }
      return createChainableQuery([], null)
    })
    mockRpc.mockResolvedValue({ data: 0, error: null })

    const { result } = renderHook(() => useAchievements())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    // Clear call history but keep the implementations
    mockFrom.mockClear()
    mockRpc.mockClear()

    await act(async () => {
      await result.current.refresh()
    })

    // Should reload all data sources
    expect(mockFrom).toHaveBeenCalledWith('achievement_definitions')
    expect(mockFrom).toHaveBeenCalledWith('user_achievements')
    expect(mockFrom).toHaveBeenCalledWith('checkins')
    expect(mockFrom).toHaveBeenCalledWith('conversations')
    expect(mockFrom).toHaveBeenCalledWith('posts')
    expect(mockFrom).toHaveBeenCalledWith('profiles')
  })

  // --------------------------------------------------------------------------
  // PROGRESS CALCULATION
  // --------------------------------------------------------------------------

  it('should calculate progress with streak data', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'achievement_definitions') {
        return createChainableQuery(mockDefinitions, null)
      }
      if (table === 'user_achievements') {
        return createChainableQuery([], null)
      }
      if (table === 'checkins') {
        return createChainableQuery(
          [{ location_id: 'loc_1' }, { location_id: 'loc_2' }, { location_id: 'loc_1' }],
          null
        )
      }
      if (table === 'conversations') {
        // Need to handle two different conversation queries:
        // 1. .eq('producer_id', user.id) - returns conversations started
        // 2. .or(...) - returns matches with chat_messages
        return createChainableQuery(
          [{ id: 'conv_1' }, { id: 'conv_2' }],
          null,
          {
            orHandler: () => ({
              data: [
                { id: 'conv_1', chat_messages: [{ id: 'msg_1' }] },
                { id: 'conv_2', chat_messages: [] }
              ],
              error: null
            })
          }
        )
      }
      if (table === 'posts') {
        return createChainableQuery([{ id: 'post_1' }], null)
      }
      if (table === 'profiles') {
        return createChainableQuery(
          { is_verified: true, created_at: '2026-01-01T00:00:00Z' },
          null
        )
      }
      return createChainableQuery([], null)
    })
    mockRpc.mockImplementation((fn: string) => {
      if (fn === 'calculate_user_streak') {
        return Promise.resolve({ data: 5, error: null })
      }
      return Promise.resolve({ data: null, error: null })
    })

    const { result } = renderHook(() => useAchievements())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.progress).toMatchObject({
      visit_locations: 2, // Two unique locations
      start_conversations: 2,
      matches: 1, // One conversation with messages
      create_posts: 1,
      check_in_streak: 5,
      verified: true,
      reports: 0,
    })
    expect(result.current.currentStreak).toBe(5)
  })

  it('should calculate progress percentage for locked achievements', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'achievement_definitions') {
        return createChainableQuery(mockDefinitions, null)
      }
      if (table === 'user_achievements') {
        return createChainableQuery([], null)
      }
      if (table === 'checkins') {
        return createChainableQuery([{ location_id: 'loc_1' }], null)
      }
      if (table === 'conversations') {
        // Handle both conversation queries
        return createChainableQuery(
          [{ id: 'conv_1' }, { id: 'conv_2' }],
          null,
          {
            orHandler: () => ({
              data: [
                { id: 'conv_1', chat_messages: [] },
                { id: 'conv_2', chat_messages: [] }
              ],
              error: null
            })
          }
        )
      }
      if (table === 'posts') {
        return createChainableQuery([], null)
      }
      if (table === 'profiles') {
        return createChainableQuery(
          { is_verified: false, created_at: '2026-01-01T00:00:00Z' },
          null
        )
      }
      return createChainableQuery([], null)
    })
    mockRpc.mockResolvedValue({ data: 0, error: null })

    const { result } = renderHook(() => useAchievements())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    // Find the "Social Butterfly" achievement (requires 5 conversations, we have 2)
    const socialAchievement = result.current.achievements.find((a) => a.id === 'ach_2')
    expect(socialAchievement?.progress).toBe(40) // 2/5 = 40%
  })
})
