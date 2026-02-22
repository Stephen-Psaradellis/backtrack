/**
 * Tests for useTrustLevel hook
 *
 * Tests the trust level management hook including:
 * - TRUST_TIERS constant validation
 * - getTierForPoints helper logic
 * - Hook state initialization
 * - pointsToNext calculations
 * - progressPercent calculations
 * - refresh functionality
 * - Error handling
 * - Real-time subscription updates
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useTrustLevel, TRUST_TIERS } from '../useTrustLevel'

// ============================================================================
// MOCKS
// ============================================================================

const mockRpc = vi.fn()
const mockFrom = vi.fn()
const mockSelect = vi.fn()
const mockEq = vi.fn()
const mockSingle = vi.fn()
const mockChannel = vi.fn()
const mockOn = vi.fn()
const mockSubscribe = vi.fn()
const mockRemoveChannel = vi.fn()

// Mock supabase client
vi.mock('../../lib/supabase', () => ({
  supabase: {
    rpc: (...args: any[]) => mockRpc(...args),
    from: (...args: any[]) => mockFrom(...args),
    channel: (...args: any[]) => mockChannel(...args),
    removeChannel: (...args: any[]) => mockRemoveChannel(...args),
  },
}))

// Mock auth context
let mockUser: any = null
let mockProfile: any = null
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: mockUser, profile: mockProfile }),
}))

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function setupMockChain(data: any = null, error: any = null) {
  mockSingle.mockResolvedValue({ data, error })
  mockEq.mockReturnValue({ single: mockSingle })
  mockSelect.mockReturnValue({ eq: mockEq })
  mockFrom.mockReturnValue({ select: mockSelect })
}

function setupMockChannel() {
  mockSubscribe.mockReturnThis()
  mockOn.mockReturnThis()
  mockChannel.mockReturnValue({
    on: mockOn,
    subscribe: mockSubscribe,
  })
}

// ============================================================================
// TESTS
// ============================================================================

describe('useTrustLevel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUser = null
    mockProfile = null
    setupMockChannel()
  })

  // ==========================================================================
  // TRUST_TIERS CONSTANT TESTS
  // ==========================================================================

  describe('TRUST_TIERS constant', () => {
    it('should export 5 tiers', () => {
      expect(TRUST_TIERS).toHaveLength(5)
    })

    it('should have correct tier levels (1-5)', () => {
      expect(TRUST_TIERS[0].level).toBe(1)
      expect(TRUST_TIERS[1].level).toBe(2)
      expect(TRUST_TIERS[2].level).toBe(3)
      expect(TRUST_TIERS[3].level).toBe(4)
      expect(TRUST_TIERS[4].level).toBe(5)
    })

    it('should have correct tier names', () => {
      expect(TRUST_TIERS[0].name).toBe('Newcomer')
      expect(TRUST_TIERS[1].name).toBe('Regular')
      expect(TRUST_TIERS[2].name).toBe('Trusted')
      expect(TRUST_TIERS[3].name).toBe('Verified')
      expect(TRUST_TIERS[4].name).toBe('Ambassador')
    })

    it('should have correct minPoints thresholds', () => {
      expect(TRUST_TIERS[0].minPoints).toBe(0) // Newcomer
      expect(TRUST_TIERS[1].minPoints).toBe(50) // Regular
      expect(TRUST_TIERS[2].minPoints).toBe(200) // Trusted
      expect(TRUST_TIERS[3].minPoints).toBe(500) // Verified
      expect(TRUST_TIERS[4].minPoints).toBe(1000) // Ambassador
    })

    it('should have correct maxPoints thresholds', () => {
      expect(TRUST_TIERS[0].maxPoints).toBe(49) // Newcomer
      expect(TRUST_TIERS[1].maxPoints).toBe(199) // Regular
      expect(TRUST_TIERS[2].maxPoints).toBe(499) // Trusted
      expect(TRUST_TIERS[3].maxPoints).toBe(999) // Verified
      expect(TRUST_TIERS[4].maxPoints).toBe(null) // Ambassador (unlimited)
    })

    it('should have all required properties for each tier', () => {
      TRUST_TIERS.forEach((tier) => {
        expect(tier).toHaveProperty('level')
        expect(tier).toHaveProperty('name')
        expect(tier).toHaveProperty('description')
        expect(tier).toHaveProperty('minPoints')
        expect(tier).toHaveProperty('maxPoints')
        expect(tier).toHaveProperty('icon')
        expect(tier).toHaveProperty('color')
      })
    })
  })

  // ==========================================================================
  // GET TIER FOR POINTS (via hook behavior)
  // ==========================================================================

  describe('getTierForPoints logic (via hook)', () => {
    beforeEach(() => {
      mockUser = { id: 'user-1' }
    })

    it('should return Newcomer tier for 0 points', () => {
      mockProfile = { trust_level: 1, trust_points: 0 }

      const { result } = renderHook(() => useTrustLevel())

      expect(result.current.trustLevel).toBe(1)
      expect(result.current.trustPoints).toBe(0)
      expect(result.current.tierName).toBe('Newcomer')
      expect(result.current.tier.level).toBe(1)
    })

    it('should return Regular tier for 50 points', () => {
      mockProfile = { trust_level: 2, trust_points: 50 }

      const { result } = renderHook(() => useTrustLevel())

      expect(result.current.trustLevel).toBe(2)
      expect(result.current.trustPoints).toBe(50)
      expect(result.current.tierName).toBe('Regular')
      expect(result.current.tier.level).toBe(2)
    })

    it('should return Trusted tier for 200 points', () => {
      mockProfile = { trust_level: 3, trust_points: 200 }

      const { result } = renderHook(() => useTrustLevel())

      expect(result.current.trustLevel).toBe(3)
      expect(result.current.trustPoints).toBe(200)
      expect(result.current.tierName).toBe('Trusted')
      expect(result.current.tier.level).toBe(3)
    })

    it('should return Verified tier for 500 points', () => {
      mockProfile = { trust_level: 4, trust_points: 500 }

      const { result } = renderHook(() => useTrustLevel())

      expect(result.current.trustLevel).toBe(4)
      expect(result.current.trustPoints).toBe(500)
      expect(result.current.tierName).toBe('Verified')
      expect(result.current.tier.level).toBe(4)
    })

    it('should return Ambassador tier for 1000 points', () => {
      mockProfile = { trust_level: 5, trust_points: 1000 }

      const { result } = renderHook(() => useTrustLevel())

      expect(result.current.trustLevel).toBe(5)
      expect(result.current.trustPoints).toBe(1000)
      expect(result.current.tierName).toBe('Ambassador')
      expect(result.current.tier.level).toBe(5)
    })

    it('should stay in same tier for edge case points', () => {
      // 49 points = still Newcomer (max is 49)
      mockProfile = { trust_level: 1, trust_points: 49 }
      const { result: result1 } = renderHook(() => useTrustLevel())
      expect(result1.current.tierName).toBe('Newcomer')

      // 199 points = still Regular (max is 199)
      mockProfile = { trust_level: 2, trust_points: 199 }
      const { result: result2 } = renderHook(() => useTrustLevel())
      expect(result2.current.tierName).toBe('Regular')
    })
  })

  // ==========================================================================
  // HOOK INITIAL STATE
  // ==========================================================================

  describe('initial state', () => {
    it('should default to level 1 and 0 points when no profile', () => {
      mockUser = { id: 'user-1' }
      mockProfile = null

      const { result } = renderHook(() => useTrustLevel())

      expect(result.current.trustLevel).toBe(1)
      expect(result.current.trustPoints).toBe(0)
      expect(result.current.tierName).toBe('Newcomer')
    })

    it('should use profile data when available', () => {
      mockUser = { id: 'user-1' }
      mockProfile = { trust_level: 3, trust_points: 250 }

      const { result } = renderHook(() => useTrustLevel())

      expect(result.current.trustLevel).toBe(3)
      expect(result.current.trustPoints).toBe(250)
      expect(result.current.tierName).toBe('Trusted')
    })

    it('should default to level 1 and 0 points when profile has undefined values', () => {
      mockUser = { id: 'user-1' }
      mockProfile = { trust_level: undefined, trust_points: undefined }

      const { result } = renderHook(() => useTrustLevel())

      expect(result.current.trustLevel).toBe(1)
      expect(result.current.trustPoints).toBe(0)
    })

    it('should initialize with loading false and no error', () => {
      mockUser = { id: 'user-1' }
      mockProfile = { trust_level: 2, trust_points: 100 }

      const { result } = renderHook(() => useTrustLevel())

      expect(result.current.isLoading).toBe(false)
      expect(result.current.error).toBe(null)
    })
  })

  // ==========================================================================
  // POINTS TO NEXT TIER CALCULATIONS
  // ==========================================================================

  describe('pointsToNext calculations', () => {
    beforeEach(() => {
      mockUser = { id: 'user-1' }
    })

    it('should calculate points to next tier for Newcomer at 0 points', () => {
      mockProfile = { trust_level: 1, trust_points: 0 }

      const { result } = renderHook(() => useTrustLevel())

      // Next tier (Regular) starts at 50 points
      expect(result.current.pointsToNext).toBe(50)
    })

    it('should calculate points to next tier for Newcomer at 25 points', () => {
      mockProfile = { trust_level: 1, trust_points: 25 }

      const { result } = renderHook(() => useTrustLevel())

      // 50 - 25 = 25 points to Regular
      expect(result.current.pointsToNext).toBe(25)
    })

    it('should calculate points to next tier for Regular at 100 points', () => {
      mockProfile = { trust_level: 2, trust_points: 100 }

      const { result } = renderHook(() => useTrustLevel())

      // Next tier (Trusted) starts at 200 points
      // 200 - 100 = 100 points
      expect(result.current.pointsToNext).toBe(100)
    })

    it('should calculate points to next tier for Trusted at 300 points', () => {
      mockProfile = { trust_level: 3, trust_points: 300 }

      const { result } = renderHook(() => useTrustLevel())

      // Next tier (Verified) starts at 500 points
      // 500 - 300 = 200 points
      expect(result.current.pointsToNext).toBe(200)
    })

    it('should return 0 points to next for Ambassador tier', () => {
      mockProfile = { trust_level: 5, trust_points: 1000 }

      const { result } = renderHook(() => useTrustLevel())

      // Ambassador is max tier, no next tier
      expect(result.current.pointsToNext).toBe(0)
    })

    it('should return 0 points to next for Ambassador with high points', () => {
      mockProfile = { trust_level: 5, trust_points: 5000 }

      const { result } = renderHook(() => useTrustLevel())

      expect(result.current.pointsToNext).toBe(0)
    })
  })

  // ==========================================================================
  // PROGRESS PERCENT CALCULATIONS
  // ==========================================================================

  describe('progressPercent calculations', () => {
    beforeEach(() => {
      mockUser = { id: 'user-1' }
    })

    it('should return 100% for Ambassador tier', () => {
      mockProfile = { trust_level: 5, trust_points: 1000 }

      const { result } = renderHook(() => useTrustLevel())

      expect(result.current.progressPercent).toBe(100)
    })

    it('should calculate ~50% for 25 points in Newcomer tier', () => {
      mockProfile = { trust_level: 1, trust_points: 25 }

      const { result } = renderHook(() => useTrustLevel())

      // Newcomer: 0-49 (50 values: 0,1,2,...,49)
      // tierRange = 49 - 0 + 1 = 50
      // progressInTier = 25 - 0 = 25
      // percent = floor((25 / 50) * 100) = 50
      expect(result.current.progressPercent).toBe(50)
    })

    it('should calculate 0% for start of Newcomer tier', () => {
      mockProfile = { trust_level: 1, trust_points: 0 }

      const { result } = renderHook(() => useTrustLevel())

      // progressInTier = 0 - 0 = 0
      // percent = floor((0 / 50) * 100) = 0
      expect(result.current.progressPercent).toBe(0)
    })

    it('should calculate 98% for 49 points in Newcomer tier', () => {
      mockProfile = { trust_level: 1, trust_points: 49 }

      const { result } = renderHook(() => useTrustLevel())

      // tierRange = 50
      // progressInTier = 49 - 0 = 49
      // percent = floor((49 / 50) * 100) = 98
      expect(result.current.progressPercent).toBe(98)
    })

    it('should calculate progress for Regular tier', () => {
      mockProfile = { trust_level: 2, trust_points: 125 }

      const { result } = renderHook(() => useTrustLevel())

      // Regular: 50-199 (150 values)
      // tierRange = 199 - 50 + 1 = 150
      // progressInTier = 125 - 50 = 75
      // percent = floor((75 / 150) * 100) = 50
      expect(result.current.progressPercent).toBe(50)
    })

    it('should calculate progress for Trusted tier', () => {
      mockProfile = { trust_level: 3, trust_points: 350 }

      const { result } = renderHook(() => useTrustLevel())

      // Trusted: 200-499 (300 values)
      // tierRange = 499 - 200 + 1 = 300
      // progressInTier = 350 - 200 = 150
      // percent = floor((150 / 300) * 100) = 50
      expect(result.current.progressPercent).toBe(50)
    })

    it('should calculate progress for Verified tier', () => {
      mockProfile = { trust_level: 4, trust_points: 750 }

      const { result } = renderHook(() => useTrustLevel())

      // Verified: 500-999 (500 values)
      // tierRange = 999 - 500 + 1 = 500
      // progressInTier = 750 - 500 = 250
      // percent = floor((250 / 500) * 100) = 50
      expect(result.current.progressPercent).toBe(50)
    })
  })

  // ==========================================================================
  // REFRESH FUNCTIONALITY
  // ==========================================================================

  describe('refresh', () => {
    beforeEach(() => {
      mockUser = { id: 'user-1' }
      mockProfile = { trust_level: 1, trust_points: 0 }
    })

    it('should call supabase.rpc to update trust level', async () => {
      mockRpc.mockResolvedValue({ error: null })
      setupMockChain({ trust_level: 2, trust_points: 75 })

      const { result } = renderHook(() => useTrustLevel())

      await act(async () => {
        await result.current.refresh()
      })

      expect(mockRpc).toHaveBeenCalledWith('update_user_trust_level', {
        p_user_id: 'user-1',
      })
    })

    it('should fetch updated profile after RPC call', async () => {
      mockRpc.mockResolvedValue({ error: null })
      setupMockChain({ trust_level: 2, trust_points: 75 })

      const { result } = renderHook(() => useTrustLevel())

      await act(async () => {
        await result.current.refresh()
      })

      expect(mockFrom).toHaveBeenCalledWith('profiles')
      expect(mockSelect).toHaveBeenCalledWith('trust_level, trust_points')
      expect(mockEq).toHaveBeenCalledWith('id', 'user-1')
      expect(mockSingle).toHaveBeenCalled()
    })

    it('should update state with fetched profile data', async () => {
      mockRpc.mockResolvedValue({ error: null })
      setupMockChain({ trust_level: 2, trust_points: 75 })

      const { result } = renderHook(() => useTrustLevel())

      await act(async () => {
        await result.current.refresh()
      })

      await waitFor(() => {
        expect(result.current.trustLevel).toBe(2)
        expect(result.current.trustPoints).toBe(75)
        expect(result.current.tierName).toBe('Regular')
      })
    })

    it('should set loading state during refresh', async () => {
      // Use a deferred promise so we can check loading state mid-flight
      let resolveRpc!: (value: any) => void
      mockRpc.mockReturnValue(new Promise((r) => { resolveRpc = r }))
      setupMockChain({ trust_level: 2, trust_points: 75 })

      const { result } = renderHook(() => useTrustLevel())

      // Start refresh but don't await
      let refreshPromise: Promise<void>
      act(() => {
        refreshPromise = result.current.refresh()
      })

      // Loading should be true while RPC is pending
      expect(result.current.isLoading).toBe(true)

      // Resolve the RPC
      await act(async () => {
        resolveRpc({ error: null })
        await refreshPromise!
      })

      expect(result.current.isLoading).toBe(false)
    })

    it('should handle null profile data gracefully', async () => {
      mockRpc.mockResolvedValue({ error: null })
      setupMockChain(null)

      const { result } = renderHook(() => useTrustLevel())

      await act(async () => {
        await result.current.refresh()
      })

      // Should remain at default values
      expect(result.current.trustLevel).toBe(1)
      expect(result.current.trustPoints).toBe(0)
    })

    it('should not call RPC if user is not logged in', async () => {
      mockUser = null

      const { result } = renderHook(() => useTrustLevel())

      await act(async () => {
        await result.current.refresh()
      })

      expect(mockRpc).not.toHaveBeenCalled()
    })
  })

  // ==========================================================================
  // ERROR HANDLING
  // ==========================================================================

  describe('error handling', () => {
    beforeEach(() => {
      mockUser = { id: 'user-1' }
      mockProfile = { trust_level: 1, trust_points: 0 }
    })

    it('should handle RPC error', async () => {
      const rpcError = new Error('RPC failed')
      mockRpc.mockResolvedValue({ error: rpcError })

      const { result } = renderHook(() => useTrustLevel())

      await act(async () => {
        await result.current.refresh()
      })

      await waitFor(() => {
        expect(result.current.error).toBe('RPC failed')
        expect(result.current.isLoading).toBe(false)
      })
    })

    it('should handle fetch error', async () => {
      mockRpc.mockResolvedValue({ error: null })
      const fetchError = new Error('Fetch failed')
      setupMockChain(null, fetchError)

      const { result } = renderHook(() => useTrustLevel())

      await act(async () => {
        await result.current.refresh()
      })

      await waitFor(() => {
        expect(result.current.error).toBe('Fetch failed')
        expect(result.current.isLoading).toBe(false)
      })
    })

    it('should handle non-Error exceptions', async () => {
      mockRpc.mockResolvedValue({ error: 'string error' })

      const { result } = renderHook(() => useTrustLevel())

      await act(async () => {
        await result.current.refresh()
      })

      await waitFor(() => {
        expect(result.current.error).toBe('Failed to fetch trust level')
      })
    })

    it('should clear error on successful refresh after error', async () => {
      // First call fails
      const rpcError = new Error('RPC failed')
      mockRpc.mockResolvedValueOnce({ error: rpcError })

      const { result } = renderHook(() => useTrustLevel())

      await act(async () => {
        await result.current.refresh()
      })

      await waitFor(() => {
        expect(result.current.error).toBe('RPC failed')
      })

      // Second call succeeds
      mockRpc.mockResolvedValue({ error: null })
      setupMockChain({ trust_level: 2, trust_points: 75 })

      await act(async () => {
        await result.current.refresh()
      })

      await waitFor(() => {
        expect(result.current.error).toBe(null)
        expect(result.current.trustLevel).toBe(2)
      })
    })
  })

  // ==========================================================================
  // REAL-TIME SUBSCRIPTION
  // ==========================================================================

  describe('real-time subscription', () => {
    beforeEach(() => {
      mockUser = { id: 'user-1' }
      mockProfile = { trust_level: 1, trust_points: 0 }
    })

    it('should subscribe to profile changes on mount', () => {
      renderHook(() => useTrustLevel())

      expect(mockChannel).toHaveBeenCalledWith('trust-level-user-1')
      expect(mockOn).toHaveBeenCalledWith(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: 'id=eq.user-1',
        },
        expect.any(Function)
      )
      expect(mockSubscribe).toHaveBeenCalled()
    })

    it('should update state when profile changes are received', () => {
      let subscriptionCallback: any

      const channelObj = {
        on: vi.fn().mockImplementation((_event: any, _config: any, callback: any) => {
          subscriptionCallback = callback
          return channelObj
        }),
        subscribe: vi.fn().mockReturnThis(),
      }
      mockChannel.mockReturnValue(channelObj)

      const { result } = renderHook(() => useTrustLevel())

      // Initial state
      expect(result.current.trustLevel).toBe(1)
      expect(result.current.trustPoints).toBe(0)

      // Simulate subscription update
      act(() => {
        subscriptionCallback({
          new: { trust_level: 3, trust_points: 250 },
        })
      })

      // State should be updated
      expect(result.current.trustLevel).toBe(3)
      expect(result.current.trustPoints).toBe(250)
      expect(result.current.tierName).toBe('Trusted')
    })

    it('should handle partial updates from subscription', () => {
      let subscriptionCallback: any

      const channelObj = {
        on: vi.fn().mockImplementation((_event: any, _config: any, callback: any) => {
          subscriptionCallback = callback
          return channelObj
        }),
        subscribe: vi.fn().mockReturnThis(),
      }
      mockChannel.mockReturnValue(channelObj)

      const { result } = renderHook(() => useTrustLevel())

      // Update only trust_points
      act(() => {
        subscriptionCallback({
          new: { trust_points: 50 },
        })
      })

      expect(result.current.trustPoints).toBe(50)
      expect(result.current.trustLevel).toBe(1) // Unchanged
    })

    it('should unsubscribe on unmount', () => {
      const mockUnsubscribe = vi.fn()
      const mockChannelInstance = {
        on: mockOn,
        subscribe: mockSubscribe,
        unsubscribe: mockUnsubscribe,
      }

      mockChannel.mockReturnValue(mockChannelInstance)

      const { unmount } = renderHook(() => useTrustLevel())

      unmount()

      expect(mockRemoveChannel).toHaveBeenCalledWith(mockChannelInstance)
    })

    it('should not subscribe if user is not logged in', () => {
      mockUser = null

      renderHook(() => useTrustLevel())

      expect(mockChannel).not.toHaveBeenCalled()
    })
  })

  // ==========================================================================
  // DERIVED VALUES
  // ==========================================================================

  describe('derived values', () => {
    beforeEach(() => {
      mockUser = { id: 'user-1' }
    })

    it('should provide tier object with all properties', () => {
      mockProfile = { trust_level: 2, trust_points: 100 }

      const { result } = renderHook(() => useTrustLevel())

      expect(result.current.tier).toEqual({
        level: 2,
        name: 'Regular',
        description: 'Unlock reactions and approximate times',
        minPoints: 50,
        maxPoints: 199,
        icon: 'shield-checkmark-outline',
        color: '#3B82F6',
      })
    })

    it('should provide tier description', () => {
      mockProfile = { trust_level: 3, trust_points: 300 }

      const { result } = renderHook(() => useTrustLevel())

      expect(result.current.description).toBe('See broader radius details and icebreakers')
    })

    it('should recalculate derived values when state changes', async () => {
      mockProfile = { trust_level: 1, trust_points: 0 }

      const { result } = renderHook(() => useTrustLevel())

      expect(result.current.tierName).toBe('Newcomer')
      expect(result.current.pointsToNext).toBe(50)
      expect(result.current.progressPercent).toBe(0)

      // Update via refresh
      mockRpc.mockResolvedValue({ error: null })
      setupMockChain({ trust_level: 2, trust_points: 100 })

      await act(async () => {
        await result.current.refresh()
      })

      await waitFor(() => {
        expect(result.current.tierName).toBe('Regular')
        expect(result.current.pointsToNext).toBe(100) // 200 - 100
        expect(result.current.progressPercent).toBeGreaterThan(0)
      })
    })
  })
})
