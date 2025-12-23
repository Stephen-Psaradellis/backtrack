/**
 * useNetworkStatus Hook
 *
 * Custom hook for monitoring network connectivity status in the Love Ledger app.
 * Provides real-time network state updates and connection type information.
 *
 * Features:
 * - Real-time network status monitoring
 * - Connection type detection (WiFi, cellular, etc.)
 * - Internet reachability check
 * - Retry functionality for connection checks
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { isConnected, isInternetReachable, type } = useNetworkStatus()
 *
 *   if (!isConnected) {
 *     return <OfflineIndicator />
 *   }
 *
 *   return <Text>Connected via {type}</Text>
 * }
 * ```
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import NetInfo, {
  NetInfoState,
  NetInfoSubscription,
  NetInfoStateType,
} from '@react-native-community/netinfo'

// ============================================================================
// TYPES
// ============================================================================

/**
 * Network connection type
 */
export type NetworkConnectionType =
  | 'wifi'
  | 'cellular'
  | 'bluetooth'
  | 'ethernet'
  | 'vpn'
  | 'other'
  | 'none'
  | 'unknown'

/**
 * Network status state
 */
export interface NetworkState {
  /** Whether the device is connected to a network */
  isConnected: boolean
  /** Whether the internet is actually reachable (can be different from isConnected) */
  isInternetReachable: boolean | null
  /** The type of network connection */
  type: NetworkConnectionType
  /** Whether the network status is still loading */
  loading: boolean
  /** Any error that occurred while checking network status */
  error: string | null
  /** Details about the connection (e.g., cellular generation) */
  details: NetworkDetails | null
}

/**
 * Additional network connection details
 */
export interface NetworkDetails {
  /** Whether the connection is expensive (e.g., cellular with data limit) */
  isConnectionExpensive: boolean
  /** For cellular: the generation (2g, 3g, 4g, 5g) */
  cellularGeneration: '2g' | '3g' | '4g' | '5g' | null
  /** For WiFi: the SSID (if available) */
  ssid: string | null
  /** For WiFi: the signal strength (if available) */
  strength: number | null
  /** IP address (if available) */
  ipAddress: string | null
  /** Subnet mask (if available) */
  subnet: string | null
}

/**
 * Options for the useNetworkStatus hook
 */
export interface UseNetworkStatusOptions {
  /** Whether to start monitoring on mount (default: true) */
  enableOnMount?: boolean
  /** Custom internet reachability test URL */
  reachabilityUrl?: string
  /** Interval for periodic reachability checks in ms (default: 0 - disabled) */
  reachabilityCheckInterval?: number
}

/**
 * Return value from useNetworkStatus hook
 */
export interface UseNetworkStatusResult extends NetworkState {
  /** Manually refresh network status */
  refresh: () => Promise<void>
  /** Start listening for network changes */
  startListening: () => void
  /** Stop listening for network changes */
  stopListening: () => void
  /** Whether currently listening for network changes */
  isListening: boolean
}

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Default options for network status hook
 */
const DEFAULT_OPTIONS: Required<UseNetworkStatusOptions> = {
  enableOnMount: true,
  reachabilityUrl: 'https://www.google.com',
  reachabilityCheckInterval: 0,
}

/**
 * Initial network state
 */
const INITIAL_STATE: NetworkState = {
  isConnected: true, // Assume connected initially
  isInternetReachable: null,
  type: 'unknown',
  loading: true,
  error: null,
  details: null,
}

/**
 * Error messages for network failures
 */
const ERROR_MESSAGES = {
  FETCH_FAILED: 'Failed to determine network status.',
  LISTENER_FAILED: 'Failed to start network listener.',
  UNKNOWN: 'An unknown error occurred while checking network status.',
} as const

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Map NetInfo state type to our connection type
 */
function mapConnectionType(type: NetInfoStateType): NetworkConnectionType {
  switch (type) {
    case NetInfoStateType.wifi:
      return 'wifi'
    case NetInfoStateType.cellular:
      return 'cellular'
    case NetInfoStateType.bluetooth:
      return 'bluetooth'
    case NetInfoStateType.ethernet:
      return 'ethernet'
    case NetInfoStateType.vpn:
      return 'vpn'
    case NetInfoStateType.other:
      return 'other'
    case NetInfoStateType.none:
      return 'none'
    default:
      return 'unknown'
  }
}

/**
 * Extract connection details from NetInfo state
 */
function extractDetails(state: NetInfoState): NetworkDetails | null {
  if (!state.isConnected) {
    return null
  }

  const baseDetails: NetworkDetails = {
    isConnectionExpensive: state.details?.isConnectionExpensive ?? false,
    cellularGeneration: null,
    ssid: null,
    strength: null,
    ipAddress: null,
    subnet: null,
  }

  // Extract cellular-specific details
  if (state.type === NetInfoStateType.cellular && state.details) {
    const cellularDetails = state.details as { cellularGeneration?: string }
    if (cellularDetails.cellularGeneration) {
      baseDetails.cellularGeneration = cellularDetails.cellularGeneration as
        | '2g'
        | '3g'
        | '4g'
        | '5g'
    }
  }

  // Extract WiFi-specific details
  if (state.type === NetInfoStateType.wifi && state.details) {
    const wifiDetails = state.details as {
      ssid?: string
      strength?: number
      ipAddress?: string
      subnet?: string
    }
    baseDetails.ssid = wifiDetails.ssid ?? null
    baseDetails.strength = wifiDetails.strength ?? null
    baseDetails.ipAddress = wifiDetails.ipAddress ?? null
    baseDetails.subnet = wifiDetails.subnet ?? null
  }

  return baseDetails
}

// ============================================================================
// HOOK
// ============================================================================

/**
 * useNetworkStatus - Custom hook for network connectivity monitoring
 *
 * @param options - Configuration options for network monitoring
 * @returns Network state and control functions
 *
 * @example
 * // Basic usage - monitors network on mount
 * const { isConnected, isInternetReachable } = useNetworkStatus()
 *
 * @example
 * // With conditional rendering
 * const { isConnected } = useNetworkStatus()
 * if (!isConnected) {
 *   return <OfflineIndicator />
 * }
 *
 * @example
 * // Manual control
 * const { refresh, startListening, stopListening } = useNetworkStatus({
 *   enableOnMount: false,
 * })
 *
 * // Check network when needed
 * await refresh()
 */
export function useNetworkStatus(
  options: UseNetworkStatusOptions = {}
): UseNetworkStatusResult {
  // Merge options with defaults
  const config = { ...DEFAULT_OPTIONS, ...options }

  // ---------------------------------------------------------------------------
  // STATE
  // ---------------------------------------------------------------------------

  const [state, setState] = useState<NetworkState>(INITIAL_STATE)
  const [isListening, setIsListening] = useState(false)

  // Ref to store the network subscription
  const subscriptionRef = useRef<NetInfoSubscription | null>(null)
  // Ref for periodic check interval
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  // ---------------------------------------------------------------------------
  // HELPER FUNCTIONS
  // ---------------------------------------------------------------------------

  /**
   * Update state from NetInfo state
   */
  const updateFromNetInfoState = useCallback((netInfoState: NetInfoState) => {
    setState({
      isConnected: netInfoState.isConnected ?? false,
      isInternetReachable: netInfoState.isInternetReachable,
      type: mapConnectionType(netInfoState.type),
      loading: false,
      error: null,
      details: extractDetails(netInfoState),
    })
  }, [])

  /**
   * Set error state
   */
  const setError = useCallback((error: string) => {
    setState((prev) => ({
      ...prev,
      loading: false,
      error,
    }))
  }, [])

  // ---------------------------------------------------------------------------
  // NETWORK STATUS OPERATIONS
  // ---------------------------------------------------------------------------

  /**
   * Fetch current network status
   */
  const refresh = useCallback(async (): Promise<void> => {
    try {
      setState((prev) => ({ ...prev, loading: true, error: null }))

      const netInfoState = await NetInfo.fetch()
      updateFromNetInfoState(netInfoState)
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : ERROR_MESSAGES.UNKNOWN

      setError(errorMessage)
    }
  }, [updateFromNetInfoState, setError])

  /**
   * Start listening for network changes
   */
  const startListening = useCallback((): void => {
    // Stop any existing subscription
    if (subscriptionRef.current) {
      subscriptionRef.current()
      subscriptionRef.current = null
    }

    try {
      // Subscribe to network state changes
      subscriptionRef.current = NetInfo.addEventListener((netInfoState) => {
        updateFromNetInfoState(netInfoState)
      })

      setIsListening(true)

      // Set up periodic reachability checks if configured
      if (config.reachabilityCheckInterval > 0) {
        intervalRef.current = setInterval(() => {
          refresh()
        }, config.reachabilityCheckInterval)
      }
    } catch (error) {
      setError(ERROR_MESSAGES.LISTENER_FAILED)
      setIsListening(false)
    }
  }, [
    config.reachabilityCheckInterval,
    refresh,
    updateFromNetInfoState,
    setError,
  ])

  /**
   * Stop listening for network changes
   */
  const stopListening = useCallback((): void => {
    if (subscriptionRef.current) {
      subscriptionRef.current()
      subscriptionRef.current = null
    }

    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }

    setIsListening(false)
  }, [])

  // ---------------------------------------------------------------------------
  // EFFECTS
  // ---------------------------------------------------------------------------

  /**
   * Initialize network monitoring on mount if enabled
   */
  useEffect(() => {
    if (config.enableOnMount) {
      // Initial fetch
      refresh()
      // Start listening
      startListening()
    }

    // Cleanup on unmount
    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current()
        subscriptionRef.current = null
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
    // Only run on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ---------------------------------------------------------------------------
  // RETURN
  // ---------------------------------------------------------------------------

  return {
    // Network state
    ...state,

    // Control functions
    refresh,
    startListening,
    stopListening,

    // Status
    isListening,
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Check if the device has an active internet connection
 * This is a one-time check, not a subscription
 *
 * @returns Promise resolving to true if connected
 */
export async function checkNetworkConnection(): Promise<boolean> {
  try {
    const state = await NetInfo.fetch()
    return state.isConnected ?? false
  } catch {
    return false
  }
}

/**
 * Check if the internet is reachable
 * This performs an actual reachability check
 *
 * @returns Promise resolving to true if internet is reachable
 */
export async function checkInternetReachable(): Promise<boolean> {
  try {
    const state = await NetInfo.fetch()
    return state.isInternetReachable ?? false
  } catch {
    return false
  }
}

/**
 * Get the current network connection type
 *
 * @returns Promise resolving to the connection type
 */
export async function getNetworkType(): Promise<NetworkConnectionType> {
  try {
    const state = await NetInfo.fetch()
    return mapConnectionType(state.type)
  } catch {
    return 'unknown'
  }
}

/**
 * Get a human-readable label for a connection type
 *
 * @param type - The connection type
 * @returns Human-readable label
 */
export function getConnectionTypeLabel(type: NetworkConnectionType): string {
  switch (type) {
    case 'wifi':
      return 'Wi-Fi'
    case 'cellular':
      return 'Cellular'
    case 'bluetooth':
      return 'Bluetooth'
    case 'ethernet':
      return 'Ethernet'
    case 'vpn':
      return 'VPN'
    case 'other':
      return 'Other'
    case 'none':
      return 'No Connection'
    case 'unknown':
    default:
      return 'Unknown'
  }
}

/**
 * Check if the current connection is metered (potentially expensive)
 *
 * @returns Promise resolving to true if connection is expensive
 */
export async function isConnectionExpensive(): Promise<boolean> {
  try {
    const state = await NetInfo.fetch()
    return state.details?.isConnectionExpensive ?? false
  } catch {
    return false
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export default useNetworkStatus
export type {
  NetworkConnectionType,
  NetworkState,
  NetworkDetails,
  UseNetworkStatusOptions,
  UseNetworkStatusResult,
}
