/**
 * Background Location Service Tests
 *
 * Tests for critical paths in the background location tracking service.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// All mocks must be defined before any imports
vi.mock('expo-location', () => ({
  getForegroundPermissionsAsync: vi.fn(),
  getBackgroundPermissionsAsync: vi.fn(),
  requestForegroundPermissionsAsync: vi.fn(),
  requestBackgroundPermissionsAsync: vi.fn(),
  hasStartedLocationUpdatesAsync: vi.fn(),
  startLocationUpdatesAsync: vi.fn(),
  stopLocationUpdatesAsync: vi.fn(),
  Accuracy: {
    Balanced: 3,
    High: 4,
    Highest: 5,
    Low: 1,
    Lowest: 0,
    BestForNavigation: 6,
  },
  ActivityType: {
    Other: 1,
    AutomotiveNavigation: 2,
    Fitness: 3,
    OtherNavigation: 4,
    Airborne: 5,
  },
}))

vi.mock('expo-task-manager', () => ({
  isTaskDefined: vi.fn(),
  defineTask: vi.fn(),
  isTaskRegisteredAsync: vi.fn(),
  unregisterTaskAsync: vi.fn(),
}))

vi.mock('expo-notifications', () => ({
  scheduleNotificationAsync: vi.fn(),
  setNotificationHandler: vi.fn(),
  setNotificationCategoryAsync: vi.fn(),
  cancelAllScheduledNotificationsAsync: vi.fn(),
  getPermissionsAsync: vi.fn().mockResolvedValue({ status: 'granted' }),
  requestPermissionsAsync: vi.fn().mockResolvedValue({ status: 'granted' }),
  AndroidNotificationPriority: { DEFAULT: 'default', HIGH: 'high' },
}))

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    multiRemove: vi.fn(),
    getAllKeys: vi.fn(),
  },
}))

vi.mock('../../lib/supabase', () => ({
  supabase: {
    rpc: vi.fn(),
  },
}))

vi.mock('../../lib/sentry', () => ({
  captureException: vi.fn(),
}))

vi.mock('../../lib/utils/gpsConfig', () => ({
  BACKGROUND_GPS_CONFIG: {
    DWELL_RADIUS: 100,
    DISTANCE_INTERVAL: 50,
    TIME_INTERVAL_MS: 120000,
  },
}))

vi.mock('../../lib/utils/sanitize', () => ({
  sanitizeLocationName: vi.fn((name) => name || 'this location'),
}))

vi.mock('expo-secure-store', () => ({
  getItemAsync: vi.fn().mockResolvedValue(null),
  setItemAsync: vi.fn().mockResolvedValue(undefined),
  deleteItemAsync: vi.fn().mockResolvedValue(undefined),
  AFTER_FIRST_UNLOCK: 6,
}))

vi.mock('@react-native-community/netinfo', () => ({
  default: {
    fetch: vi.fn().mockResolvedValue({ isConnected: true }),
  },
}))

vi.mock('../../services/locationService', () => ({
  searchNearbyPlaces: vi.fn().mockResolvedValue({ success: false, places: [] }),
}))

vi.mock('../../lib/utils/geoPrivacy', () => ({
  reduceCoordinatePrecision: vi.fn((val: number) => val),
}))

// Import mocked modules after all mocks are defined
import * as Location from 'expo-location'
import * as TaskManager from 'expo-task-manager'
import AsyncStorage from '@react-native-async-storage/async-storage'

import {
  BACKGROUND_LOCATION_TASK,
  isBackgroundLocationAvailable,
  hasBackgroundLocationPermission,
  requestBackgroundLocationPermission,
  startBackgroundLocationTracking,
  stopBackgroundLocationTracking,
  isBackgroundLocationRunning,
  updateTrackingSettings,
  getLocationHealthStatus,
  recoverLocationTracking,
} from '../backgroundLocation'

describe('Background Location Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset AsyncStorage mock
    vi.mocked(AsyncStorage.getItem).mockResolvedValue(null)
    vi.mocked(AsyncStorage.setItem).mockResolvedValue(undefined)
    vi.mocked(AsyncStorage.multiRemove).mockResolvedValue(undefined)
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('BACKGROUND_LOCATION_TASK', () => {
    it('should have correct task name', () => {
      expect(BACKGROUND_LOCATION_TASK).toBe('BACKTRACK_BACKGROUND_LOCATION')
    })
  })

  describe('isBackgroundLocationAvailable', () => {
    it('returns true when all conditions are met', async () => {
      vi.mocked(TaskManager.isTaskDefined).mockReturnValue(true)
      vi.mocked(Location.getForegroundPermissionsAsync).mockResolvedValue({
        status: 'granted',
        granted: true,
        canAskAgain: true,
        expires: 'never',
      } as Location.PermissionResponse)
      vi.mocked(Location.getBackgroundPermissionsAsync).mockResolvedValue({
        status: 'granted',
        granted: true,
        canAskAgain: true,
        expires: 'never',
      } as Location.PermissionResponse)

      const result = await isBackgroundLocationAvailable()
      expect(result).toBe(true)
    })

    it('returns false when task is not defined', async () => {
      vi.mocked(TaskManager.isTaskDefined).mockReturnValue(false)
      vi.mocked(Location.getForegroundPermissionsAsync).mockResolvedValue({
        status: 'granted',
        granted: true,
        canAskAgain: true,
        expires: 'never',
      } as Location.PermissionResponse)
      vi.mocked(Location.getBackgroundPermissionsAsync).mockResolvedValue({
        status: 'granted',
        granted: true,
        canAskAgain: true,
        expires: 'never',
      } as Location.PermissionResponse)

      const result = await isBackgroundLocationAvailable()
      expect(result).toBe(false)
    })

    it('returns false when foreground permission not granted', async () => {
      vi.mocked(TaskManager.isTaskDefined).mockReturnValue(true)
      vi.mocked(Location.getForegroundPermissionsAsync).mockResolvedValue({
        status: 'denied',
        granted: false,
        canAskAgain: true,
        expires: 'never',
      } as Location.PermissionResponse)
      vi.mocked(Location.getBackgroundPermissionsAsync).mockResolvedValue({
        status: 'granted',
        granted: true,
        canAskAgain: true,
        expires: 'never',
      } as Location.PermissionResponse)

      const result = await isBackgroundLocationAvailable()
      expect(result).toBe(false)
    })

    it('returns false when background permission not granted', async () => {
      vi.mocked(TaskManager.isTaskDefined).mockReturnValue(true)
      vi.mocked(Location.getForegroundPermissionsAsync).mockResolvedValue({
        status: 'granted',
        granted: true,
        canAskAgain: true,
        expires: 'never',
      } as Location.PermissionResponse)
      vi.mocked(Location.getBackgroundPermissionsAsync).mockResolvedValue({
        status: 'denied',
        granted: false,
        canAskAgain: true,
        expires: 'never',
      } as Location.PermissionResponse)

      const result = await isBackgroundLocationAvailable()
      expect(result).toBe(false)
    })

    it('returns false and captures exception on error', async () => {
      vi.mocked(TaskManager.isTaskDefined).mockImplementation(() => {
        throw new Error('Task manager error')
      })

      const result = await isBackgroundLocationAvailable()
      expect(result).toBe(false)
    })
  })

  describe('hasBackgroundLocationPermission', () => {
    it('returns true when both permissions granted', async () => {
      vi.mocked(Location.getForegroundPermissionsAsync).mockResolvedValue({
        status: 'granted',
        granted: true,
        canAskAgain: true,
        expires: 'never',
      } as Location.PermissionResponse)
      vi.mocked(Location.getBackgroundPermissionsAsync).mockResolvedValue({
        status: 'granted',
        granted: true,
        canAskAgain: true,
        expires: 'never',
      } as Location.PermissionResponse)

      const result = await hasBackgroundLocationPermission()
      expect(result).toBe(true)
    })

    it('returns false when foreground denied', async () => {
      vi.mocked(Location.getForegroundPermissionsAsync).mockResolvedValue({
        status: 'denied',
        granted: false,
        canAskAgain: true,
        expires: 'never',
      } as Location.PermissionResponse)
      vi.mocked(Location.getBackgroundPermissionsAsync).mockResolvedValue({
        status: 'granted',
        granted: true,
        canAskAgain: true,
        expires: 'never',
      } as Location.PermissionResponse)

      const result = await hasBackgroundLocationPermission()
      expect(result).toBe(false)
    })

    it('returns false when background denied', async () => {
      vi.mocked(Location.getForegroundPermissionsAsync).mockResolvedValue({
        status: 'granted',
        granted: true,
        canAskAgain: true,
        expires: 'never',
      } as Location.PermissionResponse)
      vi.mocked(Location.getBackgroundPermissionsAsync).mockResolvedValue({
        status: 'denied',
        granted: false,
        canAskAgain: true,
        expires: 'never',
      } as Location.PermissionResponse)

      const result = await hasBackgroundLocationPermission()
      expect(result).toBe(false)
    })
  })

  describe('requestBackgroundLocationPermission', () => {
    it('returns true if already granted', async () => {
      vi.mocked(Location.getForegroundPermissionsAsync).mockResolvedValue({
        status: 'granted',
        granted: true,
        canAskAgain: true,
        expires: 'never',
      } as Location.PermissionResponse)
      vi.mocked(Location.getBackgroundPermissionsAsync).mockResolvedValue({
        status: 'granted',
        granted: true,
        canAskAgain: true,
        expires: 'never',
      } as Location.PermissionResponse)

      const result = await requestBackgroundLocationPermission()
      expect(result).toBe(true)
      expect(Location.requestForegroundPermissionsAsync).not.toHaveBeenCalled()
      expect(Location.requestBackgroundPermissionsAsync).not.toHaveBeenCalled()
    })

    it('requests foreground permission if not granted', async () => {
      vi.mocked(Location.getForegroundPermissionsAsync).mockResolvedValue({
        status: 'denied',
        granted: false,
        canAskAgain: true,
        expires: 'never',
      } as Location.PermissionResponse)
      vi.mocked(Location.getBackgroundPermissionsAsync).mockResolvedValue({
        status: 'denied',
        granted: false,
        canAskAgain: true,
        expires: 'never',
      } as Location.PermissionResponse)
      vi.mocked(Location.requestForegroundPermissionsAsync).mockResolvedValue({
        status: 'granted',
        granted: true,
        canAskAgain: true,
        expires: 'never',
      } as Location.PermissionResponse)
      vi.mocked(Location.requestBackgroundPermissionsAsync).mockResolvedValue({
        status: 'granted',
        granted: true,
        canAskAgain: true,
        expires: 'never',
      } as Location.PermissionResponse)

      const result = await requestBackgroundLocationPermission()
      expect(result).toBe(true)
      expect(Location.requestForegroundPermissionsAsync).toHaveBeenCalled()
      expect(Location.requestBackgroundPermissionsAsync).toHaveBeenCalled()
    })

    it('returns false if foreground permission denied', async () => {
      vi.mocked(Location.getForegroundPermissionsAsync).mockResolvedValue({
        status: 'denied',
        granted: false,
        canAskAgain: true,
        expires: 'never',
      } as Location.PermissionResponse)
      vi.mocked(Location.getBackgroundPermissionsAsync).mockResolvedValue({
        status: 'denied',
        granted: false,
        canAskAgain: true,
        expires: 'never',
      } as Location.PermissionResponse)
      vi.mocked(Location.requestForegroundPermissionsAsync).mockResolvedValue({
        status: 'denied',
        granted: false,
        canAskAgain: true,
        expires: 'never',
      } as Location.PermissionResponse)

      const result = await requestBackgroundLocationPermission()
      expect(result).toBe(false)
    })
  })

  describe('startBackgroundLocationTracking', () => {
    beforeEach(() => {
      vi.mocked(Location.getForegroundPermissionsAsync).mockResolvedValue({
        status: 'granted',
        granted: true,
        canAskAgain: true,
        expires: 'never',
      } as Location.PermissionResponse)
      vi.mocked(Location.getBackgroundPermissionsAsync).mockResolvedValue({
        status: 'granted',
        granted: true,
        canAskAgain: true,
        expires: 'never',
      } as Location.PermissionResponse)
    })

    it('returns success result when started successfully', async () => {
      vi.mocked(Location.hasStartedLocationUpdatesAsync).mockResolvedValue(false)
      vi.mocked(Location.startLocationUpdatesAsync).mockResolvedValue(undefined)

      const result = await startBackgroundLocationTracking('user-123', 5)
      expect(result.success).toBe(true)
      expect(result.error).toBeUndefined()
    })

    it('returns success if already running and updates settings', async () => {
      vi.mocked(Location.hasStartedLocationUpdatesAsync).mockResolvedValue(true)

      const result = await startBackgroundLocationTracking('user-123', 5)
      expect(result.success).toBe(true)
      expect(Location.startLocationUpdatesAsync).not.toHaveBeenCalled()
      expect(AsyncStorage.setItem).toHaveBeenCalled()
    })

    it('returns error with PERMISSION_DENIED code when permission denied', async () => {
      vi.mocked(Location.getBackgroundPermissionsAsync).mockResolvedValue({
        status: 'denied',
        granted: false,
        canAskAgain: false,
        expires: 'never',
      } as Location.PermissionResponse)
      vi.mocked(Location.requestBackgroundPermissionsAsync).mockResolvedValue({
        status: 'denied',
        granted: false,
        canAskAgain: false,
        expires: 'never',
      } as Location.PermissionResponse)

      const result = await startBackgroundLocationTracking('user-123', 5)
      expect(result.success).toBe(false)
      expect(result.errorCode).toBe('PERMISSION_DENIED')
      expect(result.error).toContain('denied')
    })

    it('returns error with TASK_FAILED code on exception', async () => {
      vi.mocked(Location.hasStartedLocationUpdatesAsync).mockResolvedValue(false)
      vi.mocked(Location.startLocationUpdatesAsync).mockRejectedValue(new Error('Task failed'))

      const result = await startBackgroundLocationTracking('user-123', 5)
      expect(result.success).toBe(false)
      expect(result.errorCode).toBe('TASK_FAILED')
      expect(result.error).toContain('Failed to start')
    })

    it('saves tracking settings to AsyncStorage', async () => {
      vi.mocked(Location.hasStartedLocationUpdatesAsync).mockResolvedValue(false)
      vi.mocked(Location.startLocationUpdatesAsync).mockResolvedValue(undefined)

      await startBackgroundLocationTracking('user-123', 10)

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'backtrack.tracking_settings',
        expect.stringContaining('"enabled":true')
      )
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'backtrack.tracking_settings',
        expect.stringContaining('"promptMinutes":10')
      )
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'backtrack.tracking_settings',
        expect.stringContaining('"userId":"user-123"')
      )
    })
  })

  describe('stopBackgroundLocationTracking', () => {
    it('stops location updates if running', async () => {
      vi.mocked(Location.hasStartedLocationUpdatesAsync).mockResolvedValue(true)
      vi.mocked(Location.stopLocationUpdatesAsync).mockResolvedValue(undefined)

      await stopBackgroundLocationTracking()

      expect(Location.stopLocationUpdatesAsync).toHaveBeenCalledWith(BACKGROUND_LOCATION_TASK)
    })

    it('does not call stop if not running', async () => {
      vi.mocked(Location.hasStartedLocationUpdatesAsync).mockResolvedValue(false)

      await stopBackgroundLocationTracking()

      expect(Location.stopLocationUpdatesAsync).not.toHaveBeenCalled()
    })

    it('removes stored state from AsyncStorage', async () => {
      vi.mocked(Location.hasStartedLocationUpdatesAsync).mockResolvedValue(false)

      await stopBackgroundLocationTracking()

      // Source uses removeItem for TRACKING_SETTINGS_KEY (AsyncStorage)
      // and secureDelete for DWELL_STATE_KEY (SecureStore)
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('backtrack.tracking_settings')
    })
  })

  describe('isBackgroundLocationRunning', () => {
    it('returns true when running', async () => {
      vi.mocked(Location.hasStartedLocationUpdatesAsync).mockResolvedValue(true)

      const result = await isBackgroundLocationRunning()
      expect(result).toBe(true)
    })

    it('returns false when not running', async () => {
      vi.mocked(Location.hasStartedLocationUpdatesAsync).mockResolvedValue(false)

      const result = await isBackgroundLocationRunning()
      expect(result).toBe(false)
    })

    it('returns false on error', async () => {
      vi.mocked(Location.hasStartedLocationUpdatesAsync).mockRejectedValue(new Error('Error'))

      const result = await isBackgroundLocationRunning()
      expect(result).toBe(false)
    })
  })

  describe('updateTrackingSettings', () => {
    it('updates settings in AsyncStorage when settings exist', async () => {
      vi.mocked(AsyncStorage.getItem).mockResolvedValue(
        JSON.stringify({ enabled: true, promptMinutes: 5, userId: 'user-123' })
      )

      await updateTrackingSettings(10)

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'backtrack.tracking_settings',
        expect.stringContaining('"promptMinutes":10')
      )
    })

    it('does nothing when no settings exist', async () => {
      vi.mocked(AsyncStorage.getItem).mockResolvedValue(null)

      await updateTrackingSettings(10)

      expect(AsyncStorage.setItem).not.toHaveBeenCalled()
    })
  })

  describe('getLocationHealthStatus', () => {
    it('returns healthy status when running and has permission', async () => {
      vi.mocked(Location.hasStartedLocationUpdatesAsync).mockResolvedValue(true)
      vi.mocked(Location.getForegroundPermissionsAsync).mockResolvedValue({
        status: 'granted',
        granted: true,
        canAskAgain: true,
        expires: 'never',
      } as Location.PermissionResponse)
      vi.mocked(Location.getBackgroundPermissionsAsync).mockResolvedValue({
        status: 'granted',
        granted: true,
        canAskAgain: true,
        expires: 'never',
      } as Location.PermissionResponse)
      vi.mocked(AsyncStorage.getItem).mockResolvedValue(
        JSON.stringify({ enabled: true, promptMinutes: 5, userId: 'user-123' })
      )

      const status = await getLocationHealthStatus()

      expect(status.isRunning).toBe(true)
      expect(status.hasPermission).toBe(true)
      expect(status.permissionStatus).toBe('granted')
      expect(status.needsRecovery).toBe(false)
    })

    it('returns needsRecovery when enabled but not running', async () => {
      vi.mocked(Location.hasStartedLocationUpdatesAsync).mockResolvedValue(false)
      vi.mocked(Location.getForegroundPermissionsAsync).mockResolvedValue({
        status: 'granted',
        granted: true,
        canAskAgain: true,
        expires: 'never',
      } as Location.PermissionResponse)
      vi.mocked(Location.getBackgroundPermissionsAsync).mockResolvedValue({
        status: 'granted',
        granted: true,
        canAskAgain: true,
        expires: 'never',
      } as Location.PermissionResponse)
      vi.mocked(AsyncStorage.getItem).mockResolvedValue(
        JSON.stringify({ enabled: true, promptMinutes: 5, userId: 'user-123' })
      )

      const status = await getLocationHealthStatus()

      expect(status.needsRecovery).toBe(true)
      expect(status.recoveryReason).toContain('not running')
    })

    it('returns needsRecovery when permission revoked', async () => {
      vi.mocked(Location.hasStartedLocationUpdatesAsync).mockResolvedValue(true)
      vi.mocked(Location.getForegroundPermissionsAsync).mockResolvedValue({
        status: 'granted',
        granted: true,
        canAskAgain: true,
        expires: 'never',
      } as Location.PermissionResponse)
      vi.mocked(Location.getBackgroundPermissionsAsync).mockResolvedValue({
        status: 'denied',
        granted: false,
        canAskAgain: true,
        expires: 'never',
      } as Location.PermissionResponse)
      vi.mocked(AsyncStorage.getItem).mockResolvedValue(
        JSON.stringify({ enabled: true, promptMinutes: 5, userId: 'user-123' })
      )

      const status = await getLocationHealthStatus()

      expect(status.needsRecovery).toBe(true)
      expect(status.recoveryReason).toContain('Permissions revoked')
    })
  })

  describe('recoverLocationTracking', () => {
    it('returns success with action none when no recovery needed', async () => {
      vi.mocked(Location.hasStartedLocationUpdatesAsync).mockResolvedValue(true)
      vi.mocked(Location.getForegroundPermissionsAsync).mockResolvedValue({
        status: 'granted',
        granted: true,
        canAskAgain: true,
        expires: 'never',
      } as Location.PermissionResponse)
      vi.mocked(Location.getBackgroundPermissionsAsync).mockResolvedValue({
        status: 'granted',
        granted: true,
        canAskAgain: true,
        expires: 'never',
      } as Location.PermissionResponse)
      vi.mocked(AsyncStorage.getItem).mockResolvedValue(
        JSON.stringify({ enabled: true, promptMinutes: 5, userId: 'user-123' })
      )

      const result = await recoverLocationTracking()

      expect(result.success).toBe(true)
      expect(result.action).toBe('none')
    })

    it('returns open_settings action when permission denied', async () => {
      vi.mocked(Location.hasStartedLocationUpdatesAsync).mockResolvedValue(false)
      vi.mocked(Location.getForegroundPermissionsAsync).mockResolvedValue({
        status: 'granted',
        granted: true,
        canAskAgain: true,
        expires: 'never',
      } as Location.PermissionResponse)
      vi.mocked(Location.getBackgroundPermissionsAsync).mockResolvedValue({
        status: 'denied',
        granted: false,
        canAskAgain: false,
        expires: 'never',
      } as Location.PermissionResponse)
      vi.mocked(AsyncStorage.getItem).mockResolvedValue(
        JSON.stringify({ enabled: true, promptMinutes: 5, userId: 'user-123' })
      )

      const result = await recoverLocationTracking()

      expect(result.success).toBe(false)
      expect(result.action).toBe('open_settings')
      expect(result.message).toContain('Settings')
    })

    it('attempts to restart tracking when permissions granted', async () => {
      // First call - health check shows not running
      vi.mocked(Location.hasStartedLocationUpdatesAsync)
        .mockResolvedValueOnce(false) // health check
        .mockResolvedValueOnce(false) // start check
      vi.mocked(Location.getForegroundPermissionsAsync).mockResolvedValue({
        status: 'granted',
        granted: true,
        canAskAgain: true,
        expires: 'never',
      } as Location.PermissionResponse)
      vi.mocked(Location.getBackgroundPermissionsAsync).mockResolvedValue({
        status: 'granted',
        granted: true,
        canAskAgain: true,
        expires: 'never',
      } as Location.PermissionResponse)
      vi.mocked(AsyncStorage.getItem).mockResolvedValue(
        JSON.stringify({ enabled: true, promptMinutes: 5, userId: 'user-123' })
      )
      vi.mocked(Location.startLocationUpdatesAsync).mockResolvedValue(undefined)

      const result = await recoverLocationTracking()

      expect(result.success).toBe(true)
      expect(result.action).toBe('restart_tracking')
      expect(Location.startLocationUpdatesAsync).toHaveBeenCalled()
    })
  })

  describe('3-zone departure detection', () => {
    it('zone 1 (< DWELL_RADIUS): should reuse cached location without network call', async () => {
      const { getDistanceFromDwellLocation } = await import('../dwellDetection')
      const dwellState = {
        currentLocation: { latitude: 40.7128, longitude: -74.006, locationId: 'loc-1' },
        arrivedAt: Date.now(),
        notificationSent: false,
        userId: 'user-123',
      }

      const dist = getDistanceFromDwellLocation(dwellState, { latitude: 40.71285, longitude: -74.006 })
      expect(dist).toBeLessThan(100) // Zone 1: at venue
    })

    it('zone 2 (DWELL_RADIUS to 2*DWELL_RADIUS): should be in ambiguous range', async () => {
      const { getDistanceFromDwellLocation } = await import('../dwellDetection')
      const dwellState = {
        currentLocation: { latitude: 40.7128, longitude: -74.006, locationId: 'loc-1' },
        arrivedAt: Date.now(),
        notificationSent: false,
        userId: 'user-123',
      }

      // ~150m north
      const dist = getDistanceFromDwellLocation(dwellState, { latitude: 40.71415, longitude: -74.006 })
      expect(dist).toBeGreaterThan(100) // > DWELL_RADIUS
      expect(dist).toBeLessThan(200) // < 2*DWELL_RADIUS
    })

    it('zone 3 (> 2*DWELL_RADIUS): should force departure', async () => {
      const { getDistanceFromDwellLocation } = await import('../dwellDetection')
      const dwellState = {
        currentLocation: { latitude: 40.7128, longitude: -74.006, locationId: 'loc-1' },
        arrivedAt: Date.now(),
        notificationSent: false,
        userId: 'user-123',
      }

      // ~300m north
      const dist = getDistanceFromDwellLocation(dwellState, { latitude: 40.7155, longitude: -74.006 })
      expect(dist).toBeGreaterThan(200) // Zone 3: force departure
    })
  })

  describe('checkout resilience', () => {
    it('pendingCheckout flag should be preserved in DwellState', () => {
      const state = {
        currentLocation: { latitude: 40.7128, longitude: -74.006, locationId: 'loc-1', locationName: 'Café' },
        arrivedAt: Date.now(),
        notificationSent: true,
        userId: 'user-123',
        pendingCheckout: true,
      }

      expect(state.pendingCheckout).toBe(true)
      expect(state.currentLocation.locationId).toBe('loc-1')
    })

    it('checkout success should clear dwell state completely', async () => {
      const { createInitialDwellState } = await import('../dwellDetection')
      const cleared = createInitialDwellState('user-123')

      expect(cleared.currentLocation).toBeNull()
      expect(cleared.arrivedAt).toBeNull()
      expect(cleared.pendingCheckout).toBeUndefined()
    })
  })
})
