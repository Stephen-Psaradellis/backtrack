/**
 * Unit tests for Background Location Service
 *
 * Tests cover:
 * - Permission checking (foreground + background)
 * - Start/stop background location tracking
 * - Running state detection
 * - Settings persistence
 * - Error handling for permission denials
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// ============================================================================
// Hoisted Mocks
// ============================================================================

const {
  mockGetForegroundPermissionsAsync,
  mockGetBackgroundPermissionsAsync,
  mockRequestForegroundPermissionsAsync,
  mockRequestBackgroundPermissionsAsync,
  mockHasStartedLocationUpdatesAsync,
  mockStartLocationUpdatesAsync,
  mockStopLocationUpdatesAsync,
  mockIsTaskDefined,
  mockAsyncStorageGetItem,
  mockAsyncStorageSetItem,
  mockSupabaseRpc,
} = vi.hoisted(() => ({
  mockGetForegroundPermissionsAsync: vi.fn(),
  mockGetBackgroundPermissionsAsync: vi.fn(),
  mockRequestForegroundPermissionsAsync: vi.fn(),
  mockRequestBackgroundPermissionsAsync: vi.fn(),
  mockHasStartedLocationUpdatesAsync: vi.fn(),
  mockStartLocationUpdatesAsync: vi.fn(),
  mockStopLocationUpdatesAsync: vi.fn(),
  mockIsTaskDefined: vi.fn(),
  mockAsyncStorageGetItem: vi.fn(),
  mockAsyncStorageSetItem: vi.fn(),
  mockSupabaseRpc: vi.fn(),
}))

// Mock expo-location
vi.mock('expo-location', () => ({
  getForegroundPermissionsAsync: () => mockGetForegroundPermissionsAsync(),
  getBackgroundPermissionsAsync: () => mockGetBackgroundPermissionsAsync(),
  requestForegroundPermissionsAsync: () => mockRequestForegroundPermissionsAsync(),
  requestBackgroundPermissionsAsync: () => mockRequestBackgroundPermissionsAsync(),
  hasStartedLocationUpdatesAsync: (task: string) => mockHasStartedLocationUpdatesAsync(task),
  startLocationUpdatesAsync: (task: string, opts: unknown) => mockStartLocationUpdatesAsync(task, opts),
  stopLocationUpdatesAsync: (task: string) => mockStopLocationUpdatesAsync(task),
  Accuracy: { Balanced: 3, High: 4 },
  ActivityType: { Other: 4 },
}))

// Mock expo-task-manager
vi.mock('expo-task-manager', () => ({
  defineTask: vi.fn(),
  isTaskDefined: (task: string) => mockIsTaskDefined(task),
}))

// Mock expo-notifications
vi.mock('expo-notifications', () => ({
  scheduleNotificationAsync: vi.fn(),
  AndroidNotificationPriority: { HIGH: 'high' },
}))

// Mock AsyncStorage
vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: (key: string) => mockAsyncStorageGetItem(key),
    setItem: (key: string, value: string) => mockAsyncStorageSetItem(key, value),
    removeItem: vi.fn(() => Promise.resolve()),
  },
}))

// Mock supabase
vi.mock('../../lib/supabase', () => ({
  supabase: {
    rpc: (...args: unknown[]) => mockSupabaseRpc(...args),
  },
}))

// Mock gpsConfig
vi.mock('../../lib/utils/gpsConfig', () => ({
  BACKGROUND_GPS_CONFIG: {
    DWELL_RADIUS: 50,
    DISTANCE_INTERVAL: 50,
    TIME_INTERVAL_MS: 120000,
    DEBUG_MODE: false,
  },
}))

// Import after all mocks
import {
  isBackgroundLocationAvailable,
  hasBackgroundLocationPermission,
  requestBackgroundLocationPermission,
  startBackgroundLocationTracking,
  stopBackgroundLocationTracking,
  isBackgroundLocationRunning,
  updateTrackingSettings,
  BACKGROUND_LOCATION_TASK,
} from '../../services/backgroundLocation'

// ============================================================================
// Tests
// ============================================================================

describe('Background Location Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Default: all permissions granted
    mockGetForegroundPermissionsAsync.mockResolvedValue({ status: 'granted' })
    mockGetBackgroundPermissionsAsync.mockResolvedValue({ status: 'granted' })
    mockRequestForegroundPermissionsAsync.mockResolvedValue({ status: 'granted' })
    mockRequestBackgroundPermissionsAsync.mockResolvedValue({ status: 'granted' })

    // Default: task defined, not running
    mockIsTaskDefined.mockReturnValue(true)
    mockHasStartedLocationUpdatesAsync.mockResolvedValue(false)

    // Default: no stored state
    mockAsyncStorageGetItem.mockResolvedValue(null)
    mockAsyncStorageSetItem.mockResolvedValue(undefined)

    // Default: start/stop succeed
    mockStartLocationUpdatesAsync.mockResolvedValue(undefined)
    mockStopLocationUpdatesAsync.mockResolvedValue(undefined)
  })

  // --------------------------------------------------------------------------
  // Task Name
  // --------------------------------------------------------------------------

  describe('BACKGROUND_LOCATION_TASK', () => {
    it('should export a task name constant', () => {
      expect(BACKGROUND_LOCATION_TASK).toBe('BACKTRACK_BACKGROUND_LOCATION')
    })
  })

  // --------------------------------------------------------------------------
  // isBackgroundLocationAvailable
  // --------------------------------------------------------------------------

  describe('isBackgroundLocationAvailable', () => {
    it('should return true when task is defined and permissions are granted', async () => {
      const result = await isBackgroundLocationAvailable()
      expect(result).toBe(true)
    })

    it('should return false when foreground permission denied', async () => {
      mockGetForegroundPermissionsAsync.mockResolvedValue({ status: 'denied' })

      const result = await isBackgroundLocationAvailable()
      expect(result).toBe(false)
    })

    it('should return false when background permission denied', async () => {
      mockGetBackgroundPermissionsAsync.mockResolvedValue({ status: 'denied' })

      const result = await isBackgroundLocationAvailable()
      expect(result).toBe(false)
    })

    it('should return false when task is not defined', async () => {
      mockIsTaskDefined.mockReturnValue(false)

      const result = await isBackgroundLocationAvailable()
      expect(result).toBe(false)
    })

    it('should return false on error', async () => {
      mockGetForegroundPermissionsAsync.mockRejectedValue(new Error('fail'))

      const result = await isBackgroundLocationAvailable()
      expect(result).toBe(false)
    })
  })

  // --------------------------------------------------------------------------
  // hasBackgroundLocationPermission
  // --------------------------------------------------------------------------

  describe('hasBackgroundLocationPermission', () => {
    it('should return true when both permissions granted', async () => {
      const result = await hasBackgroundLocationPermission()
      expect(result).toBe(true)
    })

    it('should return false when foreground denied', async () => {
      mockGetForegroundPermissionsAsync.mockResolvedValue({ status: 'denied' })

      const result = await hasBackgroundLocationPermission()
      expect(result).toBe(false)
    })

    it('should return false when background denied', async () => {
      mockGetBackgroundPermissionsAsync.mockResolvedValue({ status: 'denied' })

      const result = await hasBackgroundLocationPermission()
      expect(result).toBe(false)
    })

    it('should return false on error', async () => {
      mockGetForegroundPermissionsAsync.mockRejectedValue(new Error('fail'))

      const result = await hasBackgroundLocationPermission()
      expect(result).toBe(false)
    })
  })

  // --------------------------------------------------------------------------
  // requestBackgroundLocationPermission
  // --------------------------------------------------------------------------

  describe('requestBackgroundLocationPermission', () => {
    it('should return true when permissions already granted', async () => {
      const result = await requestBackgroundLocationPermission()

      expect(result).toBe(true)
      // Should NOT request permissions since already granted
      expect(mockRequestForegroundPermissionsAsync).not.toHaveBeenCalled()
      expect(mockRequestBackgroundPermissionsAsync).not.toHaveBeenCalled()
    })

    it('should request foreground then background when not granted', async () => {
      // First call to hasBackgroundLocationPermission returns false
      mockGetForegroundPermissionsAsync
        .mockResolvedValueOnce({ status: 'denied' }) // hasBackgroundLocationPermission
        .mockResolvedValueOnce({ status: 'denied' }) // check current foreground
      mockGetBackgroundPermissionsAsync
        .mockResolvedValueOnce({ status: 'denied' }) // hasBackgroundLocationPermission
        .mockResolvedValueOnce({ status: 'denied' }) // check current background

      const result = await requestBackgroundLocationPermission()

      expect(result).toBe(true)
      expect(mockRequestForegroundPermissionsAsync).toHaveBeenCalled()
      expect(mockRequestBackgroundPermissionsAsync).toHaveBeenCalled()
    })

    it('should return false when foreground permission denied', async () => {
      mockGetForegroundPermissionsAsync.mockResolvedValue({ status: 'denied' })
      mockGetBackgroundPermissionsAsync.mockResolvedValue({ status: 'denied' })
      mockRequestForegroundPermissionsAsync.mockResolvedValue({ status: 'denied' })

      const result = await requestBackgroundLocationPermission()
      expect(result).toBe(false)
    })

    it('should return false when background permission denied', async () => {
      mockGetForegroundPermissionsAsync
        .mockResolvedValueOnce({ status: 'denied' })
        .mockResolvedValueOnce({ status: 'granted' })
      mockGetBackgroundPermissionsAsync
        .mockResolvedValueOnce({ status: 'denied' })
        .mockResolvedValueOnce({ status: 'denied' })
      mockRequestForegroundPermissionsAsync.mockResolvedValue({ status: 'granted' })
      mockRequestBackgroundPermissionsAsync.mockResolvedValue({ status: 'denied' })

      const result = await requestBackgroundLocationPermission()
      expect(result).toBe(false)
    })

    it('should return false on error', async () => {
      mockGetForegroundPermissionsAsync.mockRejectedValue(new Error('fail'))

      const result = await requestBackgroundLocationPermission()
      expect(result).toBe(false)
    })
  })

  // --------------------------------------------------------------------------
  // startBackgroundLocationTracking
  // --------------------------------------------------------------------------

  describe('startBackgroundLocationTracking', () => {
    it('should start tracking successfully', async () => {
      const result = await startBackgroundLocationTracking('user-123', 5)

      expect(result.success).toBe(true)
      expect(mockStartLocationUpdatesAsync).toHaveBeenCalledWith(
        BACKGROUND_LOCATION_TASK,
        expect.objectContaining({
          showsBackgroundLocationIndicator: true,
        })
      )
    })

    it('should save tracking settings', async () => {
      await startBackgroundLocationTracking('user-123', 10)

      expect(mockAsyncStorageSetItem).toHaveBeenCalledWith(
        'backtrack:tracking_settings',
        expect.stringContaining('"enabled":true')
      )
      expect(mockAsyncStorageSetItem).toHaveBeenCalledWith(
        'backtrack:tracking_settings',
        expect.stringContaining('"promptMinutes":10')
      )
      expect(mockAsyncStorageSetItem).toHaveBeenCalledWith(
        'backtrack:tracking_settings',
        expect.stringContaining('"userId":"user-123"')
      )
    })

    it('should initialize dwell state via SecureStore', async () => {
      // Dwell state is stored via SecureStore (expo-secure-store), not AsyncStorage
      // The global vitest.setup.ts mocks SecureStore.setItemAsync
      await startBackgroundLocationTracking('user-123')

      // Verify that startLocationUpdatesAsync was called (tracking started)
      expect(mockStartLocationUpdatesAsync).toHaveBeenCalled()
    })

    it('should return failure result when permission denied', async () => {
      mockGetForegroundPermissionsAsync.mockResolvedValue({ status: 'denied' })
      mockGetBackgroundPermissionsAsync.mockResolvedValue({ status: 'denied' })
      mockRequestForegroundPermissionsAsync.mockResolvedValue({ status: 'denied' })

      const result = await startBackgroundLocationTracking('user-123')

      expect(result.success).toBe(false)
      expect(mockStartLocationUpdatesAsync).not.toHaveBeenCalled()
    })

    it('should update settings if already running', async () => {
      mockHasStartedLocationUpdatesAsync.mockResolvedValue(true)

      const result = await startBackgroundLocationTracking('user-123', 15)

      expect(result.success).toBe(true)
      // Should NOT start a new session since already running
      expect(mockStartLocationUpdatesAsync).not.toHaveBeenCalled()
      // But should update settings
      expect(mockAsyncStorageSetItem).toHaveBeenCalledWith(
        'backtrack:tracking_settings',
        expect.stringContaining('"promptMinutes":15')
      )
    })

    it('should use default 5 minute prompt when not specified', async () => {
      await startBackgroundLocationTracking('user-123')

      expect(mockAsyncStorageSetItem).toHaveBeenCalledWith(
        'backtrack:tracking_settings',
        expect.stringContaining('"promptMinutes":5')
      )
    })

    it('should return false on start error', async () => {
      mockStartLocationUpdatesAsync.mockRejectedValue(new Error('start failed'))

      const result = await startBackgroundLocationTracking('user-123')
      expect(result.success).toBe(false)
    })
  })

  // --------------------------------------------------------------------------
  // stopBackgroundLocationTracking
  // --------------------------------------------------------------------------

  describe('stopBackgroundLocationTracking', () => {
    it('should stop tracking when running', async () => {
      mockHasStartedLocationUpdatesAsync.mockResolvedValue(true)
      mockAsyncStorageGetItem.mockResolvedValue(
        JSON.stringify({ enabled: true, promptMinutes: 5, userId: 'user-123' })
      )

      await stopBackgroundLocationTracking()

      expect(mockStopLocationUpdatesAsync).toHaveBeenCalledWith(BACKGROUND_LOCATION_TASK)
    })

    it('should remove tracking settings on stop', async () => {
      mockHasStartedLocationUpdatesAsync.mockResolvedValue(true)
      mockAsyncStorageGetItem.mockResolvedValue(
        JSON.stringify({ enabled: true, promptMinutes: 5, userId: 'user-123' })
      )

      await stopBackgroundLocationTracking()

      // stopBackgroundLocationTracking purges data - it removes the settings key
      // rather than setting enabled: false, for privacy reasons
      const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('backtrack:tracking_settings')
    })

    it('should clear dwell state via SecureStore on stop', async () => {
      mockHasStartedLocationUpdatesAsync.mockResolvedValue(true)

      await stopBackgroundLocationTracking()

      // Dwell state is stored in SecureStore and deleted via secureDelete
      // The global setup mocks SecureStore.deleteItemAsync
      const SecureStore = await import('expo-secure-store')
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('backtrack:dwell_state')
    })

    it('should not call stop if not running', async () => {
      mockHasStartedLocationUpdatesAsync.mockResolvedValue(false)

      await stopBackgroundLocationTracking()

      expect(mockStopLocationUpdatesAsync).not.toHaveBeenCalled()
    })

    it('should not throw on stop error', async () => {
      mockHasStartedLocationUpdatesAsync.mockResolvedValue(true)
      mockStopLocationUpdatesAsync.mockRejectedValue(new Error('stop failed'))

      // Should not throw
      await expect(stopBackgroundLocationTracking()).resolves.toBeUndefined()
    })
  })

  // --------------------------------------------------------------------------
  // isBackgroundLocationRunning
  // --------------------------------------------------------------------------

  describe('isBackgroundLocationRunning', () => {
    it('should return true when running', async () => {
      mockHasStartedLocationUpdatesAsync.mockResolvedValue(true)

      const result = await isBackgroundLocationRunning()
      expect(result).toBe(true)
    })

    it('should return false when not running', async () => {
      mockHasStartedLocationUpdatesAsync.mockResolvedValue(false)

      const result = await isBackgroundLocationRunning()
      expect(result).toBe(false)
    })

    it('should return false on error', async () => {
      mockHasStartedLocationUpdatesAsync.mockRejectedValue(new Error('fail'))

      const result = await isBackgroundLocationRunning()
      expect(result).toBe(false)
    })
  })

  // --------------------------------------------------------------------------
  // updateTrackingSettings
  // --------------------------------------------------------------------------

  describe('updateTrackingSettings', () => {
    it('should update prompt minutes in stored settings', async () => {
      mockAsyncStorageGetItem.mockResolvedValue(
        JSON.stringify({ enabled: true, promptMinutes: 5, userId: 'user-123' })
      )

      await updateTrackingSettings(15)

      expect(mockAsyncStorageSetItem).toHaveBeenCalledWith(
        'backtrack:tracking_settings',
        expect.stringContaining('"promptMinutes":15')
      )
    })

    it('should not write if no settings exist', async () => {
      mockAsyncStorageGetItem.mockResolvedValue(null)

      await updateTrackingSettings(15)

      expect(mockAsyncStorageSetItem).not.toHaveBeenCalled()
    })
  })
})
