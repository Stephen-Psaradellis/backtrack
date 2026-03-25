/**
 * CheckinContext Tests
 *
 * Tests the foreground refresh behavior (AppState listener).
 */

import React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { AppState } from 'react-native'

// ============================================================================
// MOCKS
// ============================================================================

vi.mock('react-native', () => {
  const listeners: Array<(state: string) => void> = []
  return {
    AppState: {
      addEventListener: vi.fn((event: string, handler: (state: string) => void) => {
        listeners.push(handler)
        return {
          remove: vi.fn(() => {
            const idx = listeners.indexOf(handler)
            if (idx >= 0) listeners.splice(idx, 1)
          }),
        }
      }),
      // Expose listeners for test simulation
      __listeners: listeners,
    },
  }
})

const mockGetActiveCheckin = vi.fn().mockResolvedValue(undefined)
const mockRpc = vi.fn()

vi.mock('../../lib/supabase', () => ({
  supabase: {
    rpc: (...args: unknown[]) => mockRpc(...args),
  },
}))

vi.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: vi.fn().mockResolvedValue({ status: 'granted' }),
  getCurrentPositionAsync: vi.fn().mockResolvedValue({
    coords: { latitude: 40.7128, longitude: -74.006, accuracy: 10 },
  }),
}))

vi.mock('../../services/backgroundLocation', () => ({
  isBackgroundLocationRunning: vi.fn().mockResolvedValue(false),
  startBackgroundLocationTracking: vi.fn().mockResolvedValue({ success: true }),
}))

vi.mock('../AuthContext', () => ({
  useAuth: vi.fn(() => ({ userId: 'user-123' })),
}))

vi.mock('../../lib/utils/geoPrivacy', () => ({
  reduceCoordinatePrecision: vi.fn((val: number) => val),
}))

// ============================================================================
// TESTS
// ============================================================================

describe('CheckinContext foreground refresh', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRpc.mockImplementation((name: string) => {
      if (name === 'get_active_checkin') {
        return Promise.resolve({ data: { success: true, checkin: null }, error: null })
      }
      return Promise.resolve({ data: { success: true }, error: null })
    })
  })

  afterEach(() => {
    // Clear listeners
    const listeners = (AppState as any).__listeners as Array<(state: string) => void>
    listeners.length = 0
  })

  it('should call getActiveCheckin when app comes to foreground', async () => {
    const { CheckinProvider, useCheckinContext } = await import('../CheckinContext')

    const wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
      <CheckinProvider>{children}</CheckinProvider>
    )

    const { result } = renderHook(() => useCheckinContext(), { wrapper })

    // Wait for initial fetch
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0))
    })

    // Initial mount calls get_active_checkin once
    const initialCallCount = mockRpc.mock.calls.filter(
      (call) => call[0] === 'get_active_checkin'
    ).length
    expect(initialCallCount).toBeGreaterThanOrEqual(1)

    // Simulate app returning to foreground
    const listeners = (AppState as any).__listeners as Array<(state: string) => void>
    expect(listeners.length).toBeGreaterThan(0)

    await act(async () => {
      listeners.forEach((fn) => fn('active'))
      await new Promise((r) => setTimeout(r, 0))
    })

    // Should have called get_active_checkin again
    const totalCalls = mockRpc.mock.calls.filter(
      (call) => call[0] === 'get_active_checkin'
    ).length
    expect(totalCalls).toBeGreaterThan(initialCallCount)
  })

  it('should register AppState listener on mount', async () => {
    const { CheckinProvider, useCheckinContext } = await import('../CheckinContext')

    const wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
      <CheckinProvider>{children}</CheckinProvider>
    )

    renderHook(() => useCheckinContext(), { wrapper })

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0))
    })

    expect(AppState.addEventListener).toHaveBeenCalledWith('change', expect.any(Function))
  })
})
