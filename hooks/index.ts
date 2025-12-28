/**
 * Hooks Module
 *
 * Custom React hooks for the Love Ledger app.
 * Import all hooks from this file for convenience.
 *
 * @example
 * import { useLocation, useNetworkStatus, useVisitedLocations, useRecordVisit } from '../hooks'
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

// Nearby locations hook (geospatial queries)
export {
  useNearbyLocations,
  useVisitedLocations,
  type UseNearbyLocationsOptions,
  type UseNearbyLocationsResult,
  type UseVisitedLocationsOptions,
  type UseVisitedLocationsResult,
} from './useNearbyLocations'

// User location hook (geolocation + visit recording)
export {
  useUserLocation,
  useRecordVisit,
  GeolocationError,
  type GeolocationErrorCode,
  type GeolocationPermissionState,
  type UseUserLocationOptions,
  type UseUserLocationResult,
  type UseRecordVisitOptions,
  type UseRecordVisitResult,
} from './useUserLocation'

// Notification settings hook
export {
  useNotificationSettings,
  type NotificationPreferences,
  type NotificationSettingsResult,
  type UseNotificationSettingsResult,
} from './useNotificationSettings'

// Tutorial state hook (onboarding tooltips)
export {
  useTutorialState,
  type TutorialState,
  type UseTutorialStateOptions,
  type UseTutorialStateResult,
} from './useTutorialState'