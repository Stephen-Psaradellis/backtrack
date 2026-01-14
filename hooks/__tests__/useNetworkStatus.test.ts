/**
 * Tests for hooks/useNetworkStatus.ts
 *
 * Tests network status monitoring hook and utility functions.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'

// Mock NetInfo
const mockFetch = vi.fn()
const mockAddEventListener = vi.fn()

vi.mock('@react-native-community/netinfo', () => ({
  default: {
    fetch: () => mockFetch(),
    addEventListener: (callback: (state: unknown) => void) => mockAddEventListener(callback),
  },
  NetInfoStateType: {
    wifi: 'wifi',
    cellular: 'cellular',
    bluetooth: 'bluetooth',
    ethernet: 'ethernet',
    vpn: 'vpn',
    other: 'other',
    none: 'none',
    unknown: 'unknown',
  },
}))

import {
  useNetworkStatus,
  checkNetworkConnection,
  checkInternetReachable,
  getNetworkType,
  getConnectionTypeLabel,
  isConnectionExpensive,
} from '../useNetworkStatus'

describe('useNetworkStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Default mock for NetInfo.fetch
    mockFetch.mockResolvedValue({
      isConnected: true,
      isInternetReachable: true,
      type: 'wifi',
      details: {
        isConnectionExpensive: false,
        ssid: 'TestNetwork',
        strength: 100,
        ipAddress: '192.168.1.1',
        subnet: '255.255.255.0',
      },
    })

    // Default mock for addEventListener
    mockAddEventListener.mockReturnValue(() => {})
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('initial state', () => {
    it('should start with loading true', async () => {
      const { result } = renderHook(() => useNetworkStatus())

      expect(result.current.loading).toBe(true)

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })
    })

    it('should fetch network status on mount', async () => {
      renderHook(() => useNetworkStatus())

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled()
      })
    })

    it('should start listening on mount by default', async () => {
      renderHook(() => useNetworkStatus())

      await waitFor(() => {
        expect(mockAddEventListener).toHaveBeenCalled()
      })
    })

    it('should set isListening to true after startListening', async () => {
      const { result } = renderHook(() => useNetworkStatus())

      await waitFor(() => {
        expect(result.current.isListening).toBe(true)
      })
    })
  })

  describe('network state updates', () => {
    it('should update state with network info', async () => {
      const { result } = renderHook(() => useNetworkStatus())

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true)
        expect(result.current.isInternetReachable).toBe(true)
        expect(result.current.type).toBe('wifi')
      })
    })

    it('should extract WiFi details', async () => {
      const { result } = renderHook(() => useNetworkStatus())

      await waitFor(() => {
        expect(result.current.details).not.toBeNull()
        expect(result.current.details?.ssid).toBe('TestNetwork')
        expect(result.current.details?.strength).toBe(100)
        expect(result.current.details?.ipAddress).toBe('192.168.1.1')
      })
    })

    it('should handle cellular connection', async () => {
      mockFetch.mockResolvedValue({
        isConnected: true,
        isInternetReachable: true,
        type: 'cellular',
        details: {
          isConnectionExpensive: true,
          cellularGeneration: '5g',
        },
      })

      const { result } = renderHook(() => useNetworkStatus())

      await waitFor(() => {
        expect(result.current.type).toBe('cellular')
        expect(result.current.details?.isConnectionExpensive).toBe(true)
        expect(result.current.details?.cellularGeneration).toBe('5g')
      })
    })

    it('should handle disconnected state', async () => {
      mockFetch.mockResolvedValue({
        isConnected: false,
        isInternetReachable: false,
        type: 'none',
        details: null,
      })

      const { result } = renderHook(() => useNetworkStatus())

      await waitFor(() => {
        expect(result.current.isConnected).toBe(false)
        expect(result.current.type).toBe('none')
        expect(result.current.details).toBeNull()
      })
    })
  })

  describe('options', () => {
    it('should not start listening when enableOnMount is false', async () => {
      const { result } = renderHook(() => useNetworkStatus({ enableOnMount: false }))

      // Give time for any async operations
      await new Promise((resolve) => setTimeout(resolve, 50))

      expect(mockFetch).not.toHaveBeenCalled()
      expect(mockAddEventListener).not.toHaveBeenCalled()
      expect(result.current.isListening).toBe(false)
    })
  })

  describe('refresh', () => {
    it('should fetch network status when called', async () => {
      const { result } = renderHook(() => useNetworkStatus({ enableOnMount: false }))

      await act(async () => {
        await result.current.refresh()
      })

      expect(mockFetch).toHaveBeenCalled()
    })

    it('should update state after refresh', async () => {
      mockFetch.mockResolvedValueOnce({
        isConnected: false,
        isInternetReachable: false,
        type: 'none',
        details: null,
      })

      const { result } = renderHook(() => useNetworkStatus({ enableOnMount: false }))

      await act(async () => {
        await result.current.refresh()
      })

      expect(result.current.isConnected).toBe(false)
    })

    it('should handle fetch error', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'))

      const { result } = renderHook(() => useNetworkStatus({ enableOnMount: false }))

      await act(async () => {
        await result.current.refresh()
      })

      expect(result.current.error).toBe('Network error')
    })
  })

  describe('startListening', () => {
    it('should start network listener', async () => {
      const { result } = renderHook(() => useNetworkStatus({ enableOnMount: false }))

      act(() => {
        result.current.startListening()
      })

      expect(mockAddEventListener).toHaveBeenCalled()
      expect(result.current.isListening).toBe(true)
    })

    it('should update state when network changes', async () => {
      let capturedCallback: ((state: unknown) => void) | null = null
      mockAddEventListener.mockImplementation((callback: (state: unknown) => void) => {
        capturedCallback = callback
        return () => {}
      })

      const { result } = renderHook(() => useNetworkStatus({ enableOnMount: false }))

      act(() => {
        result.current.startListening()
      })

      expect(capturedCallback).not.toBeNull()

      // Simulate network change
      act(() => {
        capturedCallback!({
          isConnected: false,
          isInternetReachable: false,
          type: 'none',
          details: null,
        })
      })

      expect(result.current.isConnected).toBe(false)
      expect(result.current.type).toBe('none')
    })
  })

  describe('stopListening', () => {
    it('should stop network listener', async () => {
      const unsubscribe = vi.fn()
      mockAddEventListener.mockReturnValue(unsubscribe)

      const { result } = renderHook(() => useNetworkStatus())

      await waitFor(() => {
        expect(result.current.isListening).toBe(true)
      })

      act(() => {
        result.current.stopListening()
      })

      expect(unsubscribe).toHaveBeenCalled()
      expect(result.current.isListening).toBe(false)
    })
  })

  describe('cleanup', () => {
    it('should unsubscribe on unmount', async () => {
      const unsubscribe = vi.fn()
      mockAddEventListener.mockReturnValue(unsubscribe)

      const { unmount } = renderHook(() => useNetworkStatus())

      await waitFor(() => {
        expect(mockAddEventListener).toHaveBeenCalled()
      })

      unmount()

      expect(unsubscribe).toHaveBeenCalled()
    })
  })

  describe('reachabilityCheckInterval', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('should set up periodic reachability checks when interval is configured', async () => {
      const unsubscribe = vi.fn()
      mockAddEventListener.mockReturnValue(unsubscribe)

      const { result } = renderHook(() =>
        useNetworkStatus({
          enableOnMount: false,
          reachabilityCheckInterval: 5000, // 5 seconds
        })
      )

      // Start listening (this sets up the interval)
      act(() => {
        result.current.startListening()
      })

      // Verify initial fetch
      expect(mockFetch).toHaveBeenCalledTimes(0)

      // Advance timer by 5 seconds
      await act(async () => {
        vi.advanceTimersByTime(5000)
      })

      // Should have called refresh
      expect(mockFetch).toHaveBeenCalledTimes(1)

      // Advance timer by another 5 seconds
      await act(async () => {
        vi.advanceTimersByTime(5000)
      })

      // Should have called again
      expect(mockFetch).toHaveBeenCalledTimes(2)
    })

    it('should clear interval when stopListening is called', async () => {
      const unsubscribe = vi.fn()
      mockAddEventListener.mockReturnValue(unsubscribe)

      const { result } = renderHook(() =>
        useNetworkStatus({
          enableOnMount: false,
          reachabilityCheckInterval: 5000,
        })
      )

      // Start listening
      act(() => {
        result.current.startListening()
      })

      // Advance timer to trigger one refresh
      await act(async () => {
        vi.advanceTimersByTime(5000)
      })

      expect(mockFetch).toHaveBeenCalledTimes(1)

      // Stop listening (should clear the interval)
      act(() => {
        result.current.stopListening()
      })

      // Clear the call count
      mockFetch.mockClear()

      // Advance timer again - interval should be cleared, no new fetches
      await act(async () => {
        vi.advanceTimersByTime(10000)
      })

      expect(mockFetch).toHaveBeenCalledTimes(0)
    })

    it('should clear interval on unmount', async () => {
      const unsubscribe = vi.fn()
      mockAddEventListener.mockReturnValue(unsubscribe)

      const { unmount } = renderHook(() =>
        useNetworkStatus({
          enableOnMount: true,
          reachabilityCheckInterval: 5000,
        })
      )

      // Wait for initial setup
      await act(async () => {
        await vi.advanceTimersByTimeAsync(100)
      })

      // Clear the initial call count
      mockFetch.mockClear()

      // Unmount (should clear the interval)
      unmount()

      // Advance timer - interval should be cleared, no new fetches
      await act(async () => {
        vi.advanceTimersByTime(10000)
      })

      expect(mockFetch).toHaveBeenCalledTimes(0)
    })
  })
})

describe('utility functions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('checkNetworkConnection', () => {
    it('should return true when connected', async () => {
      mockFetch.mockResolvedValue({ isConnected: true })

      const result = await checkNetworkConnection()

      expect(result).toBe(true)
    })

    it('should return false when disconnected', async () => {
      mockFetch.mockResolvedValue({ isConnected: false })

      const result = await checkNetworkConnection()

      expect(result).toBe(false)
    })

    it('should return false on error', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'))

      const result = await checkNetworkConnection()

      expect(result).toBe(false)
    })
  })

  describe('checkInternetReachable', () => {
    it('should return true when internet is reachable', async () => {
      mockFetch.mockResolvedValue({ isInternetReachable: true })

      const result = await checkInternetReachable()

      expect(result).toBe(true)
    })

    it('should return false when internet is not reachable', async () => {
      mockFetch.mockResolvedValue({ isInternetReachable: false })

      const result = await checkInternetReachable()

      expect(result).toBe(false)
    })

    it('should return false on error', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'))

      const result = await checkInternetReachable()

      expect(result).toBe(false)
    })
  })

  describe('getNetworkType', () => {
    it('should return wifi for wifi connection', async () => {
      mockFetch.mockResolvedValue({ type: 'wifi' })

      const result = await getNetworkType()

      expect(result).toBe('wifi')
    })

    it('should return cellular for cellular connection', async () => {
      mockFetch.mockResolvedValue({ type: 'cellular' })

      const result = await getNetworkType()

      expect(result).toBe('cellular')
    })

    it('should return unknown on error', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'))

      const result = await getNetworkType()

      expect(result).toBe('unknown')
    })
  })

  describe('getConnectionTypeLabel', () => {
    it('should return "Wi-Fi" for wifi', () => {
      expect(getConnectionTypeLabel('wifi')).toBe('Wi-Fi')
    })

    it('should return "Cellular" for cellular', () => {
      expect(getConnectionTypeLabel('cellular')).toBe('Cellular')
    })

    it('should return "Bluetooth" for bluetooth', () => {
      expect(getConnectionTypeLabel('bluetooth')).toBe('Bluetooth')
    })

    it('should return "Ethernet" for ethernet', () => {
      expect(getConnectionTypeLabel('ethernet')).toBe('Ethernet')
    })

    it('should return "VPN" for vpn', () => {
      expect(getConnectionTypeLabel('vpn')).toBe('VPN')
    })

    it('should return "Other" for other', () => {
      expect(getConnectionTypeLabel('other')).toBe('Other')
    })

    it('should return "No Connection" for none', () => {
      expect(getConnectionTypeLabel('none')).toBe('No Connection')
    })

    it('should return "Unknown" for unknown', () => {
      expect(getConnectionTypeLabel('unknown')).toBe('Unknown')
    })
  })

  describe('isConnectionExpensive', () => {
    it('should return true when connection is expensive', async () => {
      mockFetch.mockResolvedValue({
        details: { isConnectionExpensive: true },
      })

      const result = await isConnectionExpensive()

      expect(result).toBe(true)
    })

    it('should return false when connection is not expensive', async () => {
      mockFetch.mockResolvedValue({
        details: { isConnectionExpensive: false },
      })

      const result = await isConnectionExpensive()

      expect(result).toBe(false)
    })

    it('should return false on error', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'))

      const result = await isConnectionExpensive()

      expect(result).toBe(false)
    })
  })
})
