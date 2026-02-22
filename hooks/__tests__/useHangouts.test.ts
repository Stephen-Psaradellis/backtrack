/**
 * Tests for useHangouts Hook
 *
 * Tests nearby hangouts fetching, my hangouts, CRUD operations,
 * real-time subscriptions, and error handling.
 */

import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import { useHangouts } from '../useHangouts'

// ============================================================================
// TEST SETUP
// ============================================================================

function createTestWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  })
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children)
}

// ============================================================================
// MOCKS
// ============================================================================

const mockRpc = vi.fn()
const mockFrom = vi.fn()
const mockChannel = vi.fn()

vi.mock('../../lib/supabase', () => ({
  supabase: {
    rpc: (...args: any[]) => mockRpc(...args),
    from: (...args: any[]) => mockFrom(...args),
    channel: (...args: any[]) => mockChannel(...args),
  },
}))

let mockUser: any = null
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: mockUser }),
}))

let mockLocation = { latitude: null as number | null, longitude: null as number | null }
vi.mock('../useLocation', () => ({
  useLocation: () => mockLocation,
}))

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function createMockFromBuilder(data: any = [], error: any = null) {
  const builder = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
  }

  // Make the chain resolve to data/error
  Object.keys(builder).forEach((key) => {
    builder[key as keyof typeof builder] = vi.fn(() => {
      return {
        ...builder,
        then: (resolve: any) => resolve({ data, error }),
      }
    })
  })

  return builder
}

function createMockChannel() {
  return {
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn().mockReturnThis(),
    unsubscribe: vi.fn(),
  }
}

// ============================================================================
// TEST SUITE
// ============================================================================

describe('useHangouts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUser = null
    mockLocation = { latitude: null, longitude: null }

    // Default channel mock
    mockChannel.mockReturnValue(createMockChannel())
  })

  // --------------------------------------------------------------------------
  // Nearby Hangouts Tests
  // --------------------------------------------------------------------------

  describe('nearbyHangouts', () => {
    it('returns empty data when location is null', async () => {
      mockLocation = { latitude: null, longitude: null }
      mockUser = { id: 'user-123' }

      const { result } = renderHook(() => useHangouts(), {
        wrapper: createTestWrapper(),
      })

      await waitFor(() => {
        expect(result.current.nearbyHangouts).toEqual([])
        expect(result.current.isLoadingNearby).toBe(false)
      })

      expect(mockRpc).not.toHaveBeenCalledWith('get_nearby_hangouts', expect.any(Object))
    })

    it('returns empty data when latitude is null', async () => {
      mockLocation = { latitude: null, longitude: -122.4194 }
      mockUser = { id: 'user-123' }

      const { result } = renderHook(() => useHangouts(), {
        wrapper: createTestWrapper(),
      })

      await waitFor(() => {
        expect(result.current.nearbyHangouts).toEqual([])
        expect(result.current.isLoadingNearby).toBe(false)
      })

      expect(mockRpc).not.toHaveBeenCalled()
    })

    it('returns empty data when longitude is null', async () => {
      mockLocation = { latitude: 37.7749, longitude: null }
      mockUser = { id: 'user-123' }

      const { result } = renderHook(() => useHangouts(), {
        wrapper: createTestWrapper(),
      })

      await waitFor(() => {
        expect(result.current.nearbyHangouts).toEqual([])
        expect(result.current.isLoadingNearby).toBe(false)
      })

      expect(mockRpc).not.toHaveBeenCalled()
    })

    it('calls rpc(get_nearby_hangouts) with correct params when location is available', async () => {
      mockLocation = { latitude: 37.7749, longitude: -122.4194 }
      mockUser = { id: 'user-123' }

      const mockHangouts = [
        {
          id: 'hangout-1',
          title: 'Coffee Meetup',
          location_name: 'Blue Bottle Coffee',
          scheduled_for: '2026-02-17T10:00:00Z',
          attendee_count: 3,
        },
      ]

      mockRpc.mockResolvedValue({ data: mockHangouts, error: null })

      const { result } = renderHook(() => useHangouts(), {
        wrapper: createTestWrapper(),
      })

      await waitFor(() => {
        expect(mockRpc).toHaveBeenCalledWith('get_nearby_hangouts', {
          p_lat: 37.7749,
          p_lng: -122.4194,
          p_radius_meters: 5000,
        })
      })

      await waitFor(() => {
        expect(result.current.nearbyHangouts).toEqual(mockHangouts)
        expect(result.current.isLoadingNearby).toBe(false)
      })
    })

    it('uses custom radius when provided', async () => {
      mockLocation = { latitude: 37.7749, longitude: -122.4194 }
      mockUser = { id: 'user-123' }
      mockRpc.mockResolvedValue({ data: [], error: null })

      renderHook(() => useHangouts(10000), {
        wrapper: createTestWrapper(),
      })

      await waitFor(() => {
        expect(mockRpc).toHaveBeenCalledWith('get_nearby_hangouts', {
          p_lat: 37.7749,
          p_lng: -122.4194,
          p_radius_meters: 10000,
        })
      })
    })

    it('handles error when fetching nearby hangouts', async () => {
      mockLocation = { latitude: 37.7749, longitude: -122.4194 }
      mockUser = { id: 'user-123' }

      const mockError = { message: 'Database error' }
      mockRpc.mockResolvedValue({ data: null, error: mockError })

      const { result } = renderHook(() => useHangouts(), {
        wrapper: createTestWrapper(),
      })

      await waitFor(() => {
        expect(result.current.nearbyError).toContain('Database error')
        expect(result.current.nearbyHangouts).toEqual([])
      })
    })
  })

  // --------------------------------------------------------------------------
  // My Hangouts Tests
  // --------------------------------------------------------------------------

  describe('myHangouts', () => {
    it('returns empty data when user is null', async () => {
      mockUser = null
      mockLocation = { latitude: 37.7749, longitude: -122.4194 }

      const { result } = renderHook(() => useHangouts(), {
        wrapper: createTestWrapper(),
      })

      await waitFor(() => {
        expect(result.current.myHangouts).toEqual([])
        expect(result.current.isLoadingMy).toBe(false)
      })

      expect(mockFrom).not.toHaveBeenCalledWith('hangouts')
    })

    it('returns empty data when location is null even with user', async () => {
      mockUser = { id: 'user-123' }
      mockLocation = { latitude: null, longitude: null }

      const { result } = renderHook(() => useHangouts(), {
        wrapper: createTestWrapper(),
      })

      await waitFor(() => {
        expect(result.current.myHangouts).toEqual([])
      })
    })

    it('fetches created and attending hangouts when user and location available', async () => {
      mockUser = { id: 'user-123' }
      mockLocation = { latitude: 37.7749, longitude: -122.4194 }

      const mockCreatedHangouts = [
        {
          id: 'hangout-1',
          title: 'My Hangout',
          creator_id: 'user-123',
          scheduled_for: '2026-02-17T10:00:00Z',
          is_active: true,
          locations: { name: 'Cafe X' },
        },
      ]

      const mockAttendingHangouts = [
        {
          hangout_id: 'hangout-2',
          hangouts: {
            id: 'hangout-2',
            title: 'Other Hangout',
            creator_id: 'user-456',
            scheduled_for: '2026-02-18T14:00:00Z',
            is_active: true,
            locations: { name: 'Bar Y' },
          },
        },
      ]

      const mockAttendeeCounts = [
        { hangout_id: 'hangout-1' },
        { hangout_id: 'hangout-1' },
        { hangout_id: 'hangout-2' },
      ]

      let callCount = 0
      mockFrom.mockImplementation((table: string) => {
        if (table === 'hangouts') {
          return createMockFromBuilder(mockCreatedHangouts, null)
        } else if (table === 'hangout_attendees') {
          callCount++
          if (callCount === 1) {
            // First call: attending hangouts
            return createMockFromBuilder(mockAttendingHangouts, null)
          } else {
            // Second call: attendee counts
            return createMockFromBuilder(mockAttendeeCounts, null)
          }
        }
        return createMockFromBuilder([], null)
      })

      const { result } = renderHook(() => useHangouts(), {
        wrapper: createTestWrapper(),
      })

      await waitFor(() => {
        expect(result.current.myHangouts).toHaveLength(2)
      })

      await waitFor(() => {
        expect(result.current.myHangouts[0]).toMatchObject({
          id: 'hangout-1',
          location_name: 'Cafe X',
          attendee_count: 2,
        })
        expect(result.current.myHangouts[1]).toMatchObject({
          id: 'hangout-2',
          location_name: 'Bar Y',
          attendee_count: 1,
        })
      })
    })

    it('handles error when fetching my hangouts', async () => {
      mockUser = { id: 'user-123' }
      mockLocation = { latitude: 37.7749, longitude: -122.4194 }

      const mockError = { message: 'Permission denied' }
      mockFrom.mockImplementation(() => createMockFromBuilder(null, mockError))

      const { result } = renderHook(() => useHangouts(), {
        wrapper: createTestWrapper(),
      })

      await waitFor(() => {
        expect(result.current.myError).toContain('Permission denied')
        expect(result.current.myHangouts).toEqual([])
      })
    })
  })

  // --------------------------------------------------------------------------
  // Create Hangout Mutation Tests
  // --------------------------------------------------------------------------

  describe('createHangout', () => {
    it('inserts hangout with creator_id from user', async () => {
      mockUser = { id: 'user-123' }
      mockLocation = { latitude: 37.7749, longitude: -122.4194 }

      const insertMock = vi.fn().mockResolvedValue({ data: null, error: null })
      mockFrom.mockImplementation(() => ({
        insert: insertMock,
      }))

      const { result } = renderHook(() => useHangouts(), {
        wrapper: createTestWrapper(),
      })

      const hangoutData = {
        location_id: 'loc-123',
        title: 'New Hangout',
        scheduled_for: '2026-02-20T15:00:00Z',
        vibe: 'chill' as const,
      }

      await result.current.createHangout(hangoutData)

      await waitFor(() => {
        expect(mockFrom).toHaveBeenCalledWith('hangouts')
        expect(insertMock).toHaveBeenCalledWith({
          ...hangoutData,
          creator_id: 'user-123',
        })
      })
    })

    it('throws error when user is not authenticated', async () => {
      mockUser = null
      mockLocation = { latitude: 37.7749, longitude: -122.4194 }

      const { result } = renderHook(() => useHangouts(), {
        wrapper: createTestWrapper(),
      })

      const hangoutData = {
        location_id: 'loc-123',
        title: 'New Hangout',
        scheduled_for: '2026-02-20T15:00:00Z',
        vibe: 'chill' as const,
      }

      await expect(result.current.createHangout(hangoutData)).rejects.toThrow('Not authenticated')
    })

    it('handles database error during creation', async () => {
      mockUser = { id: 'user-123' }
      mockLocation = { latitude: 37.7749, longitude: -122.4194 }

      const insertMock = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Constraint violation' },
      })
      mockFrom.mockImplementation(() => ({
        insert: insertMock,
      }))

      const { result } = renderHook(() => useHangouts(), {
        wrapper: createTestWrapper(),
      })

      const hangoutData = {
        location_id: 'loc-123',
        title: 'New Hangout',
        scheduled_for: '2026-02-20T15:00:00Z',
        vibe: 'chill' as const,
      }

      await expect(result.current.createHangout(hangoutData)).rejects.toThrow('Constraint violation')
    })
  })

  // --------------------------------------------------------------------------
  // Join Hangout Mutation Tests
  // --------------------------------------------------------------------------

  describe('joinHangout', () => {
    it('calls rpc(join_hangout) with correct params', async () => {
      mockUser = { id: 'user-123' }
      mockLocation = { latitude: 37.7749, longitude: -122.4194 }

      mockRpc.mockResolvedValue({ data: { success: true }, error: null })

      const { result } = renderHook(() => useHangouts(), {
        wrapper: createTestWrapper(),
      })

      await result.current.joinHangout('hangout-456', 'going')

      await waitFor(() => {
        expect(mockRpc).toHaveBeenCalledWith('join_hangout', {
          p_hangout_id: 'hangout-456',
          p_status: 'going',
        })
      })
    })

    it('defaults to "going" status when not specified', async () => {
      mockUser = { id: 'user-123' }
      mockLocation = { latitude: 37.7749, longitude: -122.4194 }

      mockRpc.mockResolvedValue({ data: { success: true }, error: null })

      const { result } = renderHook(() => useHangouts(), {
        wrapper: createTestWrapper(),
      })

      await result.current.joinHangout('hangout-456')

      await waitFor(() => {
        expect(mockRpc).toHaveBeenCalledWith('join_hangout', {
          p_hangout_id: 'hangout-456',
          p_status: 'going',
        })
      })
    })

    it('handles database error during join', async () => {
      mockUser = { id: 'user-123' }
      mockLocation = { latitude: 37.7749, longitude: -122.4194 }

      mockRpc.mockResolvedValue({
        data: null,
        error: { message: 'Hangout is full' },
      })

      const { result } = renderHook(() => useHangouts(), {
        wrapper: createTestWrapper(),
      })

      await expect(result.current.joinHangout('hangout-456')).rejects.toThrow('Hangout is full')
    })

    it('handles RPC function returning error in data', async () => {
      mockUser = { id: 'user-123' }
      mockLocation = { latitude: 37.7749, longitude: -122.4194 }

      mockRpc.mockResolvedValue({
        data: { success: false, error: 'Already joined' },
        error: null,
      })

      const { result } = renderHook(() => useHangouts(), {
        wrapper: createTestWrapper(),
      })

      await expect(result.current.joinHangout('hangout-456')).rejects.toThrow('Already joined')
    })
  })

  // --------------------------------------------------------------------------
  // Leave Hangout Mutation Tests
  // --------------------------------------------------------------------------

  describe('leaveHangout', () => {
    it('calls rpc(leave_hangout) with correct params', async () => {
      mockUser = { id: 'user-123' }
      mockLocation = { latitude: 37.7749, longitude: -122.4194 }

      mockRpc.mockResolvedValue({ data: { success: true }, error: null })

      const { result } = renderHook(() => useHangouts(), {
        wrapper: createTestWrapper(),
      })

      await result.current.leaveHangout('hangout-789')

      await waitFor(() => {
        expect(mockRpc).toHaveBeenCalledWith('leave_hangout', {
          p_hangout_id: 'hangout-789',
        })
      })
    })

    it('handles database error during leave', async () => {
      mockUser = { id: 'user-123' }
      mockLocation = { latitude: 37.7749, longitude: -122.4194 }

      mockRpc.mockResolvedValue({
        data: null,
        error: { message: 'Not a member' },
      })

      const { result } = renderHook(() => useHangouts(), {
        wrapper: createTestWrapper(),
      })

      await expect(result.current.leaveHangout('hangout-789')).rejects.toThrow('Not a member')
    })

    it('handles RPC function returning error in data', async () => {
      mockUser = { id: 'user-123' }
      mockLocation = { latitude: 37.7749, longitude: -122.4194 }

      mockRpc.mockResolvedValue({
        data: { success: false, error: 'Cannot leave as creator' },
        error: null,
      })

      const { result } = renderHook(() => useHangouts(), {
        wrapper: createTestWrapper(),
      })

      await expect(result.current.leaveHangout('hangout-789')).rejects.toThrow(
        'Cannot leave as creator'
      )
    })
  })

  // --------------------------------------------------------------------------
  // Cancel Hangout Mutation Tests
  // --------------------------------------------------------------------------

  describe('cancelHangout', () => {
    it('updates hangout status to cancelled', async () => {
      mockUser = { id: 'user-123' }
      mockLocation = { latitude: 37.7749, longitude: -122.4194 }

      const updateBuilder = createMockFromBuilder(null, null)
      mockFrom.mockImplementation(() => updateBuilder)

      const { result } = renderHook(() => useHangouts(), {
        wrapper: createTestWrapper(),
      })

      await result.current.cancelHangout('hangout-999')

      await waitFor(() => {
        expect(mockFrom).toHaveBeenCalledWith('hangouts')
        expect(updateBuilder.update).toHaveBeenCalledWith({
          status: 'cancelled',
          is_active: false,
        })
        expect(updateBuilder.eq).toHaveBeenCalledWith('id', 'hangout-999')
        expect(updateBuilder.eq).toHaveBeenCalledWith('creator_id', 'user-123')
      })
    })

    it('throws error when user is not authenticated', async () => {
      mockUser = null
      mockLocation = { latitude: 37.7749, longitude: -122.4194 }

      const { result } = renderHook(() => useHangouts(), {
        wrapper: createTestWrapper(),
      })

      await expect(result.current.cancelHangout('hangout-999')).rejects.toThrow('Not authenticated')
    })

    it('handles database error during cancel', async () => {
      mockUser = { id: 'user-123' }
      mockLocation = { latitude: 37.7749, longitude: -122.4194 }

      const updateBuilder = createMockFromBuilder(null, { message: 'Not the creator' })
      mockFrom.mockImplementation(() => updateBuilder)

      const { result } = renderHook(() => useHangouts(), {
        wrapper: createTestWrapper(),
      })

      await expect(result.current.cancelHangout('hangout-999')).rejects.toThrow('Not the creator')
    })
  })

  // --------------------------------------------------------------------------
  // Update Hangout Mutation Tests
  // --------------------------------------------------------------------------

  describe('updateHangout', () => {
    it('updates hangout with correct data and creator check', async () => {
      mockUser = { id: 'user-123' }
      mockLocation = { latitude: 37.7749, longitude: -122.4194 }

      const updateBuilder = createMockFromBuilder(null, null)
      mockFrom.mockImplementation(() => updateBuilder)

      const { result } = renderHook(() => useHangouts(), {
        wrapper: createTestWrapper(),
      })

      const updateData = {
        title: 'Updated Title',
        description: 'New description',
      }

      await result.current.updateHangout('hangout-111', updateData)

      await waitFor(() => {
        expect(mockFrom).toHaveBeenCalledWith('hangouts')
        expect(updateBuilder.update).toHaveBeenCalledWith(updateData)
        expect(updateBuilder.eq).toHaveBeenCalledWith('id', 'hangout-111')
        expect(updateBuilder.eq).toHaveBeenCalledWith('creator_id', 'user-123')
      })
    })

    it('throws error when user is not authenticated', async () => {
      mockUser = null
      mockLocation = { latitude: 37.7749, longitude: -122.4194 }

      const { result } = renderHook(() => useHangouts(), {
        wrapper: createTestWrapper(),
      })

      await expect(
        result.current.updateHangout('hangout-111', { title: 'Updated' })
      ).rejects.toThrow('Not authenticated')
    })

    it('handles database error during update', async () => {
      mockUser = { id: 'user-123' }
      mockLocation = { latitude: 37.7749, longitude: -122.4194 }

      const updateBuilder = createMockFromBuilder(null, { message: 'Update failed' })
      mockFrom.mockImplementation(() => updateBuilder)

      const { result } = renderHook(() => useHangouts(), {
        wrapper: createTestWrapper(),
      })

      await expect(
        result.current.updateHangout('hangout-111', { title: 'Updated' })
      ).rejects.toThrow('Update failed')
    })
  })

  // --------------------------------------------------------------------------
  // Real-time Subscription Tests
  // --------------------------------------------------------------------------

  describe('real-time subscriptions', () => {
    it('subscribes to hangouts and attendees changes when user is authenticated', async () => {
      mockUser = { id: 'user-123' }
      mockLocation = { latitude: 37.7749, longitude: -122.4194 }

      const mockChannelInstance = createMockChannel()
      mockChannel.mockReturnValue(mockChannelInstance)

      renderHook(() => useHangouts(), {
        wrapper: createTestWrapper(),
      })

      await waitFor(() => {
        expect(mockChannel).toHaveBeenCalledWith('hangouts-changes')
        expect(mockChannel).toHaveBeenCalledWith('hangout-attendees-changes')
        expect(mockChannelInstance.on).toHaveBeenCalled()
        expect(mockChannelInstance.subscribe).toHaveBeenCalled()
      })
    })

    it('does not subscribe when user is null', async () => {
      mockUser = null
      mockLocation = { latitude: 37.7749, longitude: -122.4194 }

      renderHook(() => useHangouts(), {
        wrapper: createTestWrapper(),
      })

      await waitFor(() => {
        expect(mockChannel).not.toHaveBeenCalled()
      })
    })

    it('unsubscribes on unmount', async () => {
      mockUser = { id: 'user-123' }
      mockLocation = { latitude: 37.7749, longitude: -122.4194 }

      const mockChannelInstance = createMockChannel()
      mockChannel.mockReturnValue(mockChannelInstance)

      const { unmount } = renderHook(() => useHangouts(), {
        wrapper: createTestWrapper(),
      })

      await waitFor(() => {
        expect(mockChannelInstance.subscribe).toHaveBeenCalled()
      })

      unmount()

      await waitFor(() => {
        expect(mockChannelInstance.unsubscribe).toHaveBeenCalledTimes(2)
      })
    })
  })

  // --------------------------------------------------------------------------
  // Refetch Functions Tests
  // --------------------------------------------------------------------------

  describe('refetch functions', () => {
    it('refetchNearby triggers nearby hangouts query', async () => {
      mockUser = { id: 'user-123' }
      mockLocation = { latitude: 37.7749, longitude: -122.4194 }

      mockRpc.mockResolvedValue({ data: [], error: null })

      const { result } = renderHook(() => useHangouts(), {
        wrapper: createTestWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isLoadingNearby).toBe(false)
      })

      const initialCallCount = mockRpc.mock.calls.length

      await result.current.refetchNearby()

      await waitFor(() => {
        expect(mockRpc.mock.calls.length).toBeGreaterThan(initialCallCount)
      })
    })

    it('refetchMy triggers my hangouts query', async () => {
      mockUser = { id: 'user-123' }
      mockLocation = { latitude: 37.7749, longitude: -122.4194 }

      mockFrom.mockImplementation(() => createMockFromBuilder([], null))

      const { result } = renderHook(() => useHangouts(), {
        wrapper: createTestWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isLoadingMy).toBe(false)
      })

      const initialCallCount = mockFrom.mock.calls.length

      await result.current.refetchMy()

      await waitFor(() => {
        expect(mockFrom.mock.calls.length).toBeGreaterThan(initialCallCount)
      })
    })
  })
})
