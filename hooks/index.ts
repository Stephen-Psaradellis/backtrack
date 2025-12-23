/**
 * Hooks Module
 *
 * Custom React hooks for the Love Ledger app.
 * Import all hooks from this file for convenience.
 *
 * @example
 * import { useLocation, useNetworkStatus } from '../hooks'
 */

// Location hook
export {
  useLocation,
  calculateDistance,
  isWithinRadius,
  formatCoordinates,
  type LocationPermissionStatus,
  type ExtendedLocationState,
  type UseLocationOptions,
  type UseLocationResult,
} from './useLocation'

// Network status hook
export {
  useNetworkStatus,
  checkNetworkConnection,
  checkInternetReachable,
  getNetworkType,
  getConnectionTypeLabel,
  isConnectionExpensive,
  type NetworkConnectionType,
  type NetworkState,
  type NetworkDetails,
  type UseNetworkStatusOptions,
  type UseNetworkStatusResult,
} from './useNetworkStatus'
