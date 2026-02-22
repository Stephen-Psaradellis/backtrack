/**
 * Tests for useRadar hook
 *
 * @vitest-environment jsdom
 */

import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import { useRadar, RADAR_RADIUS_OPTIONS } from '../useRadar'
import { captureException } from '../../lib/sentry'

// ============================================================================
// MOCKS
// ============================================================================

// Mock Supabase with chainable query builder
const mockFrom = vi.fn()
const mockRpc = vi.fn()
const mockChannel = vi.fn(() => ({
  on: vi.fn().mockReturnThis(),
  subscribe: vi.fn().mockReturnThis(),
  unsubscribe: vi.fn(),
}))
const mockRemoveChannel = vi.fn()

vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: (...args: any[]) => mockFrom(...args),
    rpc: (...args: any[]) => mockRpc(...args),
    channel: (...args: any[]) => mockChannel(...args),
    removeChannel: (...args: any[]) => mockRemoveChannel(...args),
  },
}))

// Mock AuthContext
let mockProfile: any = null
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ profile: mockProfile }),
}))

// Mock Sentry
vi.mock('../../lib/sentry', () => ({
  captureException: vi.fn(),
}))

// ============================================================================
// TEST UTILITIES
// ============================================================================

/**
 * Creates a test wrapper with QueryClientProvider
 */
function createTestWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  })
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children)
}

/**
 * Creates a chainable query builder mock for .from()
 */
function createQueryBuilder() {
  const builder = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn(),
    update: vi.fn().mockReturnThis(),
  }
  return builder
}

/**
 * Sample radar settings data
 */
const mockRadarSettings = {
  radar_enabled: true,
  radar_radius_meters: 200,
}

/**
 * Sample proximity encounter
 */
const mockEncounter = {
  id: 'encounter-1',
  user_id: 'user-123',
  encountered_user_id: 'user-456',
  location_id: 'loc-1',
  location_name: 'Coffee Shop',
  latitude: 40.7128,
  longitude: -74.006,
  distance_meters: 50,
  encounter_type: 'walkby' as const,
  notified: false,
  created_at: new Date().toISOString(),
}

// ============================================================================
// TESTS
// ============================================================================

describe('useRadar', () => {
  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks()
    mockProfile = null
  })

  describe('unauthenticated state', () => {
    it('should return default state when no profile (not authenticated)', () => {
      mockProfile = null

      const { result } = renderHook(() => useRadar(), {
        wrapper: createTestWrapper(),
      })

      // Default values when not authenticated
      expect(result.current.radarEnabled).toBe(true)
      expect(result.current.radarRadius).toBe(200)
      expect(result.current.recentEncounters).toEqual([])
      expect(result.current.encounterCount).toBe(0)
      expect(result.current.isLoading).toBe(false)
      expect(result.current.error).toBe(null)

      // Should not call supabase
      expect(mockFrom).not.toHaveBeenCalled()
    })
  })

  describe('authenticated state - data fetching', () => {
    beforeEach(() => {
      mockProfile = { id: 'user-123' }
    })

    it('should fetch radar settings from profiles table', async () => {
      const builder = createQueryBuilder()
      builder.single.mockResolvedValueOnce({
        data: mockRadarSettings,
        error: null,
      })
      mockFrom.mockReturnValueOnce(builder)

      const { result } = renderHook(() => useRadar(), {
        wrapper: createTestWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      // Verify query
      expect(mockFrom).toHaveBeenCalledWith('profiles')
      expect(builder.select).toHaveBeenCalledWith(
        'radar_enabled, radar_radius_meters'
      )
      expect(builder.eq).toHaveBeenCalledWith('id', 'user-123')
      expect(builder.single).toHaveBeenCalled()

      // Verify returned data
      expect(result.current.radarEnabled).toBe(true)
      expect(result.current.radarRadius).toBe(200)
    })

    it('should fetch recent encounters from proximity_encounters table', async () => {
      // Mock settings query
      const settingsBuilder = createQueryBuilder()
      settingsBuilder.single.mockResolvedValueOnce({
        data: mockRadarSettings,
        error: null,
      })
      mockFrom.mockReturnValueOnce(settingsBuilder)

      // Mock encounters query
      const encountersBuilder = createQueryBuilder()
      encountersBuilder.limit.mockResolvedValueOnce({
        data: [mockEncounter],
        error: null,
      })
      mockFrom.mockReturnValueOnce(encountersBuilder)

      const { result } = renderHook(() => useRadar(), {
        wrapper: createTestWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      // Verify encounters query
      expect(mockFrom).toHaveBeenCalledWith('proximity_encounters')
      expect(encountersBuilder.select).toHaveBeenCalled()
      expect(encountersBuilder.eq).toHaveBeenCalledWith('user_id', 'user-123')
      expect(encountersBuilder.gte).toHaveBeenCalledWith(
        'created_at',
        expect.any(String)
      )
      expect(encountersBuilder.order).toHaveBeenCalledWith('created_at', {
        ascending: false,
      })
      expect(encountersBuilder.limit).toHaveBeenCalledWith(50)

      // Verify returned data
      expect(result.current.recentEncounters).toEqual([mockEncounter])
      expect(result.current.encounterCount).toBe(1)
    })

    it('should use default values when radar settings are null', async () => {
      const builder = createQueryBuilder()
      builder.single.mockResolvedValueOnce({
        data: {
          radar_enabled: null,
          radar_radius_meters: null,
        },
        error: null,
      })
      mockFrom.mockReturnValueOnce(builder)

      const { result } = renderHook(() => useRadar(), {
        wrapper: createTestWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      // Should use defaults
      expect(result.current.radarEnabled).toBe(true)
      expect(result.current.radarRadius).toBe(200)
    })
  })

  describe('toggleRadar', () => {
    beforeEach(() => {
      mockProfile = { id: 'user-123' }
    })

    it('should toggle radar from enabled to disabled', async () => {
      // Mock initial settings (enabled)
      const settingsBuilder = createQueryBuilder()
      settingsBuilder.single.mockResolvedValueOnce({
        data: { radar_enabled: true, radar_radius_meters: 200 },
        error: null,
      })
      mockFrom.mockReturnValueOnce(settingsBuilder)

      // Mock update
      const updateBuilder = createQueryBuilder()
      updateBuilder.eq.mockResolvedValueOnce({
        error: null,
      })
      mockFrom.mockReturnValueOnce(updateBuilder)

      // Mock refetch after toggle
      settingsBuilder.single.mockResolvedValueOnce({
        data: { radar_enabled: false, radar_radius_meters: 200 },
        error: null,
      })
      mockFrom.mockReturnValueOnce(settingsBuilder)

      const { result } = renderHook(() => useRadar(), {
        wrapper: createTestWrapper(),
      })

      await waitFor(() => {
        expect(result.current.radarEnabled).toBe(true)
      })

      // Toggle radar
      const toggleResult = await result.current.toggleRadar()

      // Verify result
      expect(toggleResult.success).toBe(true)
      expect(toggleResult.error).toBeUndefined()

      // Verify update query
      await waitFor(() => {
        expect(mockFrom).toHaveBeenCalledWith('profiles')
        expect(updateBuilder.update).toHaveBeenCalledWith({
          radar_enabled: false,
          updated_at: expect.any(String),
        })
        expect(updateBuilder.eq).toHaveBeenCalledWith('id', 'user-123')
      })
    })

    it('should toggle radar from disabled to enabled', async () => {
      // Mock initial settings (disabled)
      const settingsBuilder = createQueryBuilder()
      settingsBuilder.single.mockResolvedValueOnce({
        data: { radar_enabled: false, radar_radius_meters: 200 },
        error: null,
      })
      mockFrom.mockReturnValueOnce(settingsBuilder)

      // Mock update
      const updateBuilder = createQueryBuilder()
      updateBuilder.eq.mockResolvedValueOnce({
        error: null,
      })
      mockFrom.mockReturnValueOnce(updateBuilder)

      const { result } = renderHook(() => useRadar(), {
        wrapper: createTestWrapper(),
      })

      await waitFor(() => {
        expect(result.current.radarEnabled).toBe(false)
      })

      // Toggle radar
      await result.current.toggleRadar()

      // Verify update called with enabled: true
      await waitFor(() => {
        expect(updateBuilder.update).toHaveBeenCalledWith({
          radar_enabled: true,
          updated_at: expect.any(String),
        })
      })
    })

    it('should handle toggle error and call captureException', async () => {
      // Mock initial settings
      const settingsBuilder = createQueryBuilder()
      settingsBuilder.single.mockResolvedValueOnce({
        data: mockRadarSettings,
        error: null,
      })
      mockFrom.mockReturnValueOnce(settingsBuilder)

      const { result } = renderHook(() => useRadar(), {
        wrapper: createTestWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      // Mock update error - return error object from the .eq() call
      const updateBuilder = createQueryBuilder()
      updateBuilder.eq.mockResolvedValueOnce({
        error: { message: 'Database error' },
      })
      mockFrom.mockReturnValueOnce(updateBuilder)

      // Toggle radar (should fail)
      const toggleResult = await result.current.toggleRadar()

      // Verify error result
      expect(toggleResult.success).toBe(false)
      expect(toggleResult.error).toBe('Database error')

      // Verify error state is updated
      await waitFor(() => {
        expect(result.current.error).toBe('Database error')
      })

      // Verify error was captured
      expect(captureException).toHaveBeenCalledWith(expect.any(Error), {
        operation: 'toggleRadar',
      })
    })

    it('should return error when not authenticated', async () => {
      mockProfile = null

      const { result } = renderHook(() => useRadar(), {
        wrapper: createTestWrapper(),
      })

      // Try to toggle (should fail)
      const toggleResult = await result.current.toggleRadar()

      expect(toggleResult.success).toBe(false)
      expect(toggleResult.error).toBe('Not authenticated')
      expect(captureException).toHaveBeenCalled()
    })
  })

  describe('setRadarRadius', () => {
    beforeEach(() => {
      mockProfile = { id: 'user-123' }
    })

    it('should update radar radius with valid value', async () => {
      // Mock initial settings
      const settingsBuilder = createQueryBuilder()
      settingsBuilder.single.mockResolvedValueOnce({
        data: mockRadarSettings,
        error: null,
      })
      mockFrom.mockReturnValueOnce(settingsBuilder)

      const { result } = renderHook(() => useRadar(), {
        wrapper: createTestWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      // Mock update - return success (no error) from .eq() call
      const updateBuilder = createQueryBuilder()
      updateBuilder.eq.mockResolvedValueOnce({
        error: null,
      })
      mockFrom.mockReturnValueOnce(updateBuilder)

      // Update radius to 500
      const updateResult = await result.current.setRadarRadius(500)

      // Verify result
      expect(updateResult.success).toBe(true)
      expect(updateResult.error).toBeUndefined()

      // Verify update query
      expect(mockFrom).toHaveBeenCalledWith('profiles')
      expect(updateBuilder.update).toHaveBeenCalledWith({
        radar_radius_meters: 500,
        updated_at: expect.any(String),
      })
      expect(updateBuilder.eq).toHaveBeenCalledWith('id', 'user-123')
    })

    it('should validate radius against RADAR_RADIUS_OPTIONS', async () => {
      // Mock initial settings
      const settingsBuilder = createQueryBuilder()
      settingsBuilder.single.mockResolvedValueOnce({
        data: mockRadarSettings,
        error: null,
      })
      mockFrom.mockReturnValueOnce(settingsBuilder)

      const { result } = renderHook(() => useRadar(), {
        wrapper: createTestWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      // Try each valid option
      for (const validRadius of RADAR_RADIUS_OPTIONS) {
        const updateBuilder = createQueryBuilder()
        updateBuilder.eq.mockResolvedValueOnce({
          error: null,
        })
        mockFrom.mockReturnValueOnce(updateBuilder)

        const updateResult = await result.current.setRadarRadius(validRadius)

        // Should not have validation error
        expect(updateResult.success).toBe(true)
      }
    })

    it('should return error with invalid radius without calling supabase', async () => {
      // Mock initial settings
      const settingsBuilder = createQueryBuilder()
      settingsBuilder.single.mockResolvedValueOnce({
        data: mockRadarSettings,
        error: null,
      })
      mockFrom.mockReturnValueOnce(settingsBuilder)

      const { result } = renderHook(() => useRadar(), {
        wrapper: createTestWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      const initialCallCount = mockFrom.mock.calls.length

      // Try invalid radius
      const updateResult = await result.current.setRadarRadius(999)

      // Verify error
      expect(updateResult.success).toBe(false)
      expect(updateResult.error).toContain('Invalid radius')
      expect(updateResult.error).toContain('50, 100, 200, 500')

      // Verify supabase was NOT called (no additional calls)
      expect(mockFrom.mock.calls.length).toBe(initialCallCount)

      // Verify error is also set in state
      await waitFor(() => {
        expect(result.current.error).toContain('Invalid radius')
      })
    })

    it('should handle update error and call captureException', async () => {
      // Mock initial settings
      const settingsBuilder = createQueryBuilder()
      settingsBuilder.single.mockResolvedValueOnce({
        data: mockRadarSettings,
        error: null,
      })
      mockFrom.mockReturnValueOnce(settingsBuilder)

      const { result } = renderHook(() => useRadar(), {
        wrapper: createTestWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      // Mock update error - return error object from the .eq() call
      const updateBuilder = createQueryBuilder()
      updateBuilder.eq.mockResolvedValueOnce({
        error: { message: 'Update failed' },
      })
      mockFrom.mockReturnValueOnce(updateBuilder)

      // Update radius (should fail)
      const updateResult = await result.current.setRadarRadius(100)

      // Verify error result
      expect(updateResult.success).toBe(false)
      expect(updateResult.error).toBe('Update failed')

      // Verify error state is updated
      await waitFor(() => {
        expect(result.current.error).toBe('Update failed')
      })

      // Verify error was captured
      expect(captureException).toHaveBeenCalledWith(expect.any(Error), {
        operation: 'setRadarRadius',
      })
    })
  })

  describe('real-time subscription', () => {
    beforeEach(() => {
      mockProfile = { id: 'user-123' }
    })

    it('should setup real-time subscription on mount', async () => {
      // Mock initial settings
      const settingsBuilder = createQueryBuilder()
      settingsBuilder.single.mockResolvedValueOnce({
        data: mockRadarSettings,
        error: null,
      })
      mockFrom.mockReturnValueOnce(settingsBuilder)

      const mockOn = vi.fn().mockReturnThis()
      const mockSubscribe = vi.fn().mockReturnThis()
      mockChannel.mockReturnValueOnce({
        on: mockOn,
        subscribe: mockSubscribe,
        unsubscribe: vi.fn(),
      })

      renderHook(() => useRadar(), {
        wrapper: createTestWrapper(),
      })

      await waitFor(() => {
        expect(mockChannel).toHaveBeenCalledWith(
          'proximity_encounters:user-123'
        )
      })

      expect(mockOn).toHaveBeenCalledWith(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'proximity_encounters',
          filter: 'user_id=eq.user-123',
        },
        expect.any(Function)
      )
      expect(mockSubscribe).toHaveBeenCalled()
    })

    it('should cleanup subscription on unmount', async () => {
      // Mock initial settings
      const settingsBuilder = createQueryBuilder()
      settingsBuilder.single.mockResolvedValueOnce({
        data: mockRadarSettings,
        error: null,
      })
      mockFrom.mockReturnValueOnce(settingsBuilder)

      const mockChannelInstance = {
        on: vi.fn().mockReturnThis(),
        subscribe: vi.fn().mockReturnThis(),
        unsubscribe: vi.fn(),
      }
      mockChannel.mockReturnValueOnce(mockChannelInstance)

      const { unmount } = renderHook(() => useRadar(), {
        wrapper: createTestWrapper(),
      })

      await waitFor(() => {
        expect(mockChannel).toHaveBeenCalled()
      })

      // Unmount
      unmount()

      // Verify cleanup
      expect(mockRemoveChannel).toHaveBeenCalledWith(mockChannelInstance)
    })

    it('should not setup subscription when not authenticated', () => {
      mockProfile = null

      renderHook(() => useRadar(), {
        wrapper: createTestWrapper(),
      })

      // Should not create channel
      expect(mockChannel).not.toHaveBeenCalled()
    })
  })

  describe('refreshEncounters', () => {
    beforeEach(() => {
      mockProfile = { id: 'user-123' }
    })

    it('should manually refresh encounters', async () => {
      // Mock initial settings
      const settingsBuilder = createQueryBuilder()
      settingsBuilder.single.mockResolvedValueOnce({
        data: mockRadarSettings,
        error: null,
      })
      mockFrom.mockReturnValueOnce(settingsBuilder)

      // Mock first encounters query
      const encountersBuilder1 = createQueryBuilder()
      encountersBuilder1.limit.mockResolvedValueOnce({
        data: [mockEncounter],
        error: null,
      })
      mockFrom.mockReturnValueOnce(encountersBuilder1)

      const { result } = renderHook(() => useRadar(), {
        wrapper: createTestWrapper(),
      })

      await waitFor(() => {
        expect(result.current.encounterCount).toBe(1)
      })

      // Mock second encounters query (after refresh)
      const encountersBuilder2 = createQueryBuilder()
      encountersBuilder2.limit.mockResolvedValueOnce({
        data: [mockEncounter, { ...mockEncounter, id: 'encounter-2' }],
        error: null,
      })
      mockFrom.mockReturnValueOnce(encountersBuilder2)

      // Refresh
      await result.current.refreshEncounters()

      await waitFor(() => {
        expect(result.current.encounterCount).toBe(2)
      })
    })
  })

  describe('error handling', () => {
    beforeEach(() => {
      mockProfile = { id: 'user-123' }
    })

    it('should handle settings fetch error', async () => {
      const builder = createQueryBuilder()
      builder.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Network error' },
      })
      mockFrom.mockReturnValueOnce(builder)

      const { result } = renderHook(() => useRadar(), {
        wrapper: createTestWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      // Should still return default values
      expect(result.current.radarEnabled).toBe(true)
      expect(result.current.radarRadius).toBe(200)
    })

    it('should handle encounters fetch error', async () => {
      // Mock settings success
      const settingsBuilder = createQueryBuilder()
      settingsBuilder.single.mockResolvedValueOnce({
        data: mockRadarSettings,
        error: null,
      })
      mockFrom.mockReturnValueOnce(settingsBuilder)

      // Mock encounters error
      const encountersBuilder = createQueryBuilder()
      encountersBuilder.limit.mockResolvedValueOnce({
        data: null,
        error: { message: 'Query error' },
      })
      mockFrom.mockReturnValueOnce(encountersBuilder)

      const { result } = renderHook(() => useRadar(), {
        wrapper: createTestWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      // Should return empty encounters
      expect(result.current.recentEncounters).toEqual([])
      expect(result.current.encounterCount).toBe(0)
    })
  })
})
