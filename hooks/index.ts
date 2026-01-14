/**
 * Hooks Module
 *
 * Custom React hooks for the Backtrack app.
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

// Photo sharing hook
export {
  usePhotoSharing,
  type UsePhotoSharingResult,
} from './usePhotoSharing'
// Location streaks hook
export {
  useLocationStreaks,
  useLocationStreak,
  type UseLocationStreaksOptions,
  type UseLocationStreaksResult,
} from './useLocationStreaks'

// Event attendance hook
export {
  useEventAttendance,
  useUserEvents,
  type AttendanceStatus,
  type EventAttendee,
  type EventWithStats,
  type UseEventAttendanceOptions,
  type UseEventAttendanceResult,
  type UseUserEventsOptions,
} from './useEventAttendance'

// Spark notification settings hook
export {
  useSparkNotificationSettings,
  type SparkSettingsResult,
  type UseSparkNotificationSettingsResult,
} from './useSparkNotificationSettings'

// Regulars mode hooks
export {
  useRegularsMode,
  useFellowRegulars,
  useLocationRegulars,
  type RegularsVisibility,
  type FellowRegular,
  type LocationRegular,
  type RegularsError,
  type UseRegularsModeOptions,
  type UseRegularsModeResult,
  type UseFellowRegularsOptions,
  type UseFellowRegularsResult,
  type UseLocationRegularsOptions,
  type UseLocationRegularsResult,
} from './useRegulars'

// Check-in hook (tiered matching)
export {
  useCheckin,
  type CheckinResult,
  type CheckoutResult,
  type UseCheckinResult,
} from './useCheckin'

// Check-in settings hook (tracking preferences)
export {
  useCheckinSettings,
  type TrackingSettingsError,
  type UseCheckinSettingsOptions,
  type UseCheckinSettingsResult,
} from './useCheckinSettings'

// Live check-ins hook (real-time presence at locations)
export {
  useLiveCheckins,
  type LiveCheckinAccessReason,
  type UseLiveCheckinsOptions,
  type UseLiveCheckinsResult,
} from './useLiveCheckins'

// Posting permission hook
export {
  useCanPost,
  type UseCanPostOptions,
  type UseCanPostResult,
} from './useCanPost'

// Matching permission hook
export {
  useCanMatch,
  type UseCanMatchOptions,
  type UseCanMatchResult,
} from './useCanMatch'

// Tiered posts hook
export {
  useTieredPosts,
  useVerifiedPosts,
  useFavoriteSpotPosts,
  type TieredPost,
  type TieredPostsResult,
  type UseTieredPostsOptions,
  type UseTieredPostsResult,
} from './useTieredPosts'

// Avatar snapshot hooks (Task 16 - 3D avatar snapshots)
export {
  useAvatarSnapshot,
  usePrefetchSnapshots,
  useUploadSnapshot,
  type UseAvatarSnapshotOptions,
  type UseAvatarSnapshotResult,
} from './useAvatarSnapshot'
