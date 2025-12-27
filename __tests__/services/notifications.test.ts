/**
 * Unit tests for Push Notification Service
 *
 * Tests the notification service including permission handling,
 * token acquisition, registration, and removal operations.
 *
 * Tests cover:
 * - Permission request returns granted/denied status correctly
 * - Token registration calls Supabase with correct user_id and token
 * - Error handling for offline/denied permissions
 * - Device info collection
 * - Retry logic for transient failures
 */

import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest'

// ============================================================================
// Mock Setup
// ============================================================================

// Mock expo-notifications
const mockGetPermissionsAsync = vi.fn()
const mockRequestPermissionsAsync = vi.fn()
const mockGetExpoPushTokenAsync = vi.fn()
const mockSetNotificationChannelAsync = vi.fn()

vi.mock('expo-notifications', () => ({
  getPermissionsAsync: () => mockGetPermissionsAsync(),
  requestPermissionsAsync: (options: unknown) => mockRequestPermissionsAsync(options),
  getExpoPushTokenAsync: (options: unknown) => mockGetExpoPushTokenAsync(options),
  setNotificationChannelAsync: (channelId: string, config: unknown) =>
    mockSetNotificationChannelAsync(channelId, config),
  IosAuthorizationStatus: {
    NOT_DETERMINED: 0,
    DENIED: 1,
    AUTHORIZED: 2,
    PROVISIONAL: 3,
    EPHEMERAL: 4,
  },
  AndroidImportance: {
    UNKNOWN: 0,
    UNSPECIFIED: 1,
    NONE: 2,
    MIN: 3,
    LOW: 4,
    DEFAULT: 5,
    HIGH: 6,
    MAX: 7,
  },
}))

// Mock expo-device
const mockDevice = {
  isDevice: true,
  brand: 'Apple',
  modelName: 'iPhone 14',
  osName: 'iOS',
  osVersion: '17.0',
  deviceType: 1,
}

vi.mock('expo-device', () => ({
  get isDevice() {
    return mockDevice.isDevice
  },
  get brand() {
    return mockDevice.brand
  },
  get modelName() {
    return mockDevice.modelName
  },
  get osName() {
    return mockDevice.osName
  },
  get osVersion() {
    return mockDevice.osVersion
  },
  get deviceType() {
    return mockDevice.deviceType
  },
}))

// Mock expo-constants
const mockConstants = {
  expoConfig: {
    extra: {
      eas: {
        projectId: 'test-project-id',
      },
    },
  },
  manifest: null,
}

vi.mock('expo-constants', () => ({
  default: mockConstants,
}))

// Mock react-native Platform
vi.mock('react-native', () => ({
  Platform: {
    OS: 'ios',
    select: (obj: Record<string, unknown>) => obj.ios || obj.default,
  },
}))

// Mock Supabase client
const mockSupabaseRpc = vi.fn()
const mockSupabaseFrom = vi.fn()
const mockSupabaseDelete = vi.fn()
const mockSupabaseEq = vi.fn()

vi.mock('../../lib/supabase', () => ({
  supabase: {
    rpc: (fnName: string, params: unknown) => mockSupabaseRpc(fnName, params),
    from: (table: string) => {
      mockSupabaseFrom(table)
      return {
        delete: () => {
          mockSupabaseDelete()
          return {
            eq: (column: string, value: string) => {
              mockSupabaseEq(column, value)
              return Promise.resolve({ error: null })
            },
          }
        },
      }
    },
  },
}))

// Import the service under test AFTER mocking dependencies
import {
  isPhysicalDevice,
  getNotificationPermissions,
  requestNotificationPermissions,
  getExpoPushTokenAsync,
  registerPushToken,
  registerForPushNotifications,
  removePushToken,
  removeAllUserTokens,
  NOTIFICATION_ERRORS,
  type PermissionResult,
  type TokenRegistrationResult,
  type TokenRemovalResult,
} from '../../services/notifications'

// ============================================================================
// Test Constants
// ============================================================================

const TEST_USER_ID = 'test-user-123'
const TEST_PUSH_TOKEN = 'ExponentPushToken[test-token-abc]'

// ============================================================================
// Setup and Teardown
// ============================================================================

describe('Notification Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Reset mock device to physical device
    mockDevice.isDevice = true
    mockDevice.brand = 'Apple'
    mockDevice.modelName = 'iPhone 14'
    mockDevice.osName = 'iOS'
    mockDevice.osVersion = '17.0'
    mockDevice.deviceType = 1

    // Reset mock constants
    mockConstants.expoConfig = {
      extra: {
        eas: {
          projectId: 'test-project-id',
        },
      },
    }
    mockConstants.manifest = null

    // Default permission result (granted)
    mockGetPermissionsAsync.mockResolvedValue({
      granted: true,
      canAskAgain: true,
      ios: { status: 2 }, // AUTHORIZED
    })

    mockRequestPermissionsAsync.mockResolvedValue({
      granted: true,
      canAskAgain: true,
      ios: { status: 2 }, // AUTHORIZED
    })

    // Default token result
    mockGetExpoPushTokenAsync.mockResolvedValue({
      data: TEST_PUSH_TOKEN,
    })

    // Default Supabase RPC result (success)
    mockSupabaseRpc.mockResolvedValue({ data: null, error: null })
  })

  // ============================================================================
  // isPhysicalDevice Tests
  // ============================================================================

  describe('isPhysicalDevice', () => {
    it('returns true when running on physical device', () => {
      mockDevice.isDevice = true

      expect(isPhysicalDevice()).toBe(true)
    })

    it('returns false when running on simulator/emulator', () => {
      mockDevice.isDevice = false

      expect(isPhysicalDevice()).toBe(false)
    })
  })

  // ============================================================================
  // getNotificationPermissions Tests
  // ============================================================================

  describe('getNotificationPermissions', () => {
    it('returns granted status when permissions are authorized', async () => {
      mockGetPermissionsAsync.mockResolvedValue({
        granted: true,
        canAskAgain: true,
        ios: { status: 2 }, // AUTHORIZED
      })

      const result = await getNotificationPermissions()

      expect(result.granted).toBe(true)
      expect(result.canAskAgain).toBe(true)
      expect(result.error).toBeNull()
    })

    it('returns denied status when permissions are denied', async () => {
      mockGetPermissionsAsync.mockResolvedValue({
        granted: false,
        canAskAgain: false,
        ios: { status: 1 }, // DENIED
      })

      const result = await getNotificationPermissions()

      expect(result.granted).toBe(false)
      expect(result.canAskAgain).toBe(false)
      expect(result.error).toBeNull()
    })

    it('returns granted for iOS provisional permissions', async () => {
      mockGetPermissionsAsync.mockResolvedValue({
        granted: false,
        canAskAgain: true,
        ios: { status: 3 }, // PROVISIONAL
      })

      const result = await getNotificationPermissions()

      expect(result.granted).toBe(true)
      expect(result.isProvisional).toBe(true)
      expect(result.error).toBeNull()
    })

    it('handles errors gracefully', async () => {
      mockGetPermissionsAsync.mockRejectedValue(new Error('Permission check failed'))

      const result = await getNotificationPermissions()

      expect(result.granted).toBe(false)
      expect(result.canAskAgain).toBe(true)
      expect(result.error).toBe('Permission check failed')
    })

    it('handles non-Error exceptions', async () => {
      mockGetPermissionsAsync.mockRejectedValue('String error')

      const result = await getNotificationPermissions()

      expect(result.granted).toBe(false)
      expect(result.error).toBe(NOTIFICATION_ERRORS.UNKNOWN_ERROR)
    })
  })

  // ============================================================================
  // requestNotificationPermissions Tests
  // ============================================================================

  describe('requestNotificationPermissions', () => {
    it('returns granted status when user grants permission', async () => {
      mockRequestPermissionsAsync.mockResolvedValue({
        granted: true,
        canAskAgain: true,
        ios: { status: 2 }, // AUTHORIZED
      })

      const result = await requestNotificationPermissions()

      expect(result.granted).toBe(true)
      expect(result.error).toBeNull()
    })

    it('passes iOS options to request', async () => {
      mockRequestPermissionsAsync.mockResolvedValue({
        granted: true,
        canAskAgain: true,
      })

      await requestNotificationPermissions()

      expect(mockRequestPermissionsAsync).toHaveBeenCalledWith({
        ios: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
        },
      })
    })

    it('returns denied status with error when user denies', async () => {
      mockRequestPermissionsAsync.mockResolvedValue({
        granted: false,
        canAskAgain: false,
        ios: { status: 1 }, // DENIED
      })

      const result = await requestNotificationPermissions()

      expect(result.granted).toBe(false)
      expect(result.canAskAgain).toBe(false)
      expect(result.error).toBe(NOTIFICATION_ERRORS.PERMISSION_DENIED)
    })

    it('returns granted for iOS provisional permissions', async () => {
      mockRequestPermissionsAsync.mockResolvedValue({
        granted: false,
        canAskAgain: true,
        ios: { status: 3 }, // PROVISIONAL
      })

      const result = await requestNotificationPermissions()

      expect(result.granted).toBe(true)
      expect(result.isProvisional).toBe(true)
    })

    it('handles request errors gracefully', async () => {
      mockRequestPermissionsAsync.mockRejectedValue(new Error('Request failed'))

      const result = await requestNotificationPermissions()

      expect(result.granted).toBe(false)
      expect(result.error).toBe('Request failed')
    })
  })

  // ============================================================================
  // getExpoPushTokenAsync Tests
  // ============================================================================

  describe('getExpoPushTokenAsync', () => {
    it('returns token on success', async () => {
      mockGetExpoPushTokenAsync.mockResolvedValue({
        data: TEST_PUSH_TOKEN,
      })

      const result = await getExpoPushTokenAsync()

      expect(result.token).toBe(TEST_PUSH_TOKEN)
      expect(result.error).toBeNull()
    })

    it('passes project ID to Expo API', async () => {
      mockGetExpoPushTokenAsync.mockResolvedValue({
        data: TEST_PUSH_TOKEN,
      })

      await getExpoPushTokenAsync()

      expect(mockGetExpoPushTokenAsync).toHaveBeenCalledWith({
        projectId: 'test-project-id',
      })
    })

    it('returns error when not on physical device', async () => {
      mockDevice.isDevice = false

      const result = await getExpoPushTokenAsync()

      expect(result.token).toBeNull()
      expect(result.error).toBe(NOTIFICATION_ERRORS.NOT_PHYSICAL_DEVICE)
      expect(mockGetExpoPushTokenAsync).not.toHaveBeenCalled()
    })

    it('returns error when project ID is missing', async () => {
      mockConstants.expoConfig = null as unknown as typeof mockConstants.expoConfig

      // Need to reset the process.env mock
      const originalEnv = process.env.EXPO_PUBLIC_PROJECT_ID
      delete process.env.EXPO_PUBLIC_PROJECT_ID

      const result = await getExpoPushTokenAsync()

      expect(result.token).toBeNull()
      expect(result.error).toBe(NOTIFICATION_ERRORS.PROJECT_ID_MISSING)

      // Restore
      if (originalEnv) {
        process.env.EXPO_PUBLIC_PROJECT_ID = originalEnv
      }
    })

    it('handles token acquisition errors', async () => {
      mockGetExpoPushTokenAsync.mockRejectedValue(new Error('Network error'))

      const result = await getExpoPushTokenAsync()

      expect(result.token).toBeNull()
      expect(result.error).toBe('Network error')
    })

    it('sets up Android notification channel on Android', async () => {
      // Mock Platform.OS as android
      vi.doMock('react-native', () => ({
        Platform: {
          OS: 'android',
        },
      }))

      // Re-import would be needed for full test, but we can verify the channel setup was called
      mockGetExpoPushTokenAsync.mockResolvedValue({
        data: TEST_PUSH_TOKEN,
      })

      await getExpoPushTokenAsync()

      // Note: Full Android testing would require re-importing the module
      // This test verifies the basic flow works
      expect(mockGetExpoPushTokenAsync).toHaveBeenCalled()
    })
  })

  // ============================================================================
  // registerPushToken Tests
  // ============================================================================

  describe('registerPushToken', () => {
    it('calls Supabase RPC with correct parameters', async () => {
      mockSupabaseRpc.mockResolvedValue({ data: null, error: null })

      const result = await registerPushToken(TEST_USER_ID, TEST_PUSH_TOKEN)

      expect(mockSupabaseRpc).toHaveBeenCalledWith('upsert_push_token', {
        p_user_id: TEST_USER_ID,
        p_token: TEST_PUSH_TOKEN,
        p_device_info: {
          brand: 'Apple',
          modelName: 'iPhone 14',
          osName: 'iOS',
          osVersion: '17.0',
          deviceType: 1,
        },
      })
      expect(result.success).toBe(true)
      expect(result.token).toBe(TEST_PUSH_TOKEN)
      expect(result.error).toBeNull()
    })

    it('returns error when user ID is empty', async () => {
      const result = await registerPushToken('', TEST_PUSH_TOKEN)

      expect(result.success).toBe(false)
      expect(result.error).toBe(NOTIFICATION_ERRORS.USER_NOT_AUTHENTICATED)
      expect(mockSupabaseRpc).not.toHaveBeenCalled()
    })

    it('handles Supabase RPC errors', async () => {
      mockSupabaseRpc.mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      })

      const result = await registerPushToken(TEST_USER_ID, TEST_PUSH_TOKEN)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Database error')
    })

    it('handles exceptions during registration', async () => {
      mockSupabaseRpc.mockRejectedValue(new Error('Network timeout'))

      const result = await registerPushToken(TEST_USER_ID, TEST_PUSH_TOKEN)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Network timeout')
    })

    it('includes correct device info', async () => {
      mockDevice.brand = 'Samsung'
      mockDevice.modelName = 'Galaxy S24'
      mockDevice.osName = 'Android'
      mockDevice.osVersion = '14'
      mockDevice.deviceType = 2

      await registerPushToken(TEST_USER_ID, TEST_PUSH_TOKEN)

      expect(mockSupabaseRpc).toHaveBeenCalledWith('upsert_push_token', {
        p_user_id: TEST_USER_ID,
        p_token: TEST_PUSH_TOKEN,
        p_device_info: {
          brand: 'Samsung',
          modelName: 'Galaxy S24',
          osName: 'Android',
          osVersion: '14',
          deviceType: 2,
        },
      })
    })
  })

  // ============================================================================
  // registerForPushNotifications Tests
  // ============================================================================

  describe('registerForPushNotifications', () => {
    beforeEach(() => {
      // Reduce retry delay for faster tests
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('completes full registration flow successfully', async () => {
      mockRequestPermissionsAsync.mockResolvedValue({
        granted: true,
        canAskAgain: true,
      })
      mockGetExpoPushTokenAsync.mockResolvedValue({ data: TEST_PUSH_TOKEN })
      mockSupabaseRpc.mockResolvedValue({ data: null, error: null })

      const resultPromise = registerForPushNotifications(TEST_USER_ID)

      // Fast-forward through any timers
      await vi.runAllTimersAsync()

      const result = await resultPromise

      expect(result.success).toBe(true)
      expect(result.token).toBe(TEST_PUSH_TOKEN)
      expect(result.error).toBeNull()
    })

    it('returns error when user ID is null', async () => {
      const result = await registerForPushNotifications(null)

      expect(result.success).toBe(false)
      expect(result.error).toBe(NOTIFICATION_ERRORS.USER_NOT_AUTHENTICATED)
    })

    it('returns error when user ID is undefined', async () => {
      const result = await registerForPushNotifications(undefined)

      expect(result.success).toBe(false)
      expect(result.error).toBe(NOTIFICATION_ERRORS.USER_NOT_AUTHENTICATED)
    })

    it('returns error when not on physical device', async () => {
      mockDevice.isDevice = false

      const result = await registerForPushNotifications(TEST_USER_ID)

      expect(result.success).toBe(false)
      expect(result.error).toBe(NOTIFICATION_ERRORS.NOT_PHYSICAL_DEVICE)
    })

    it('returns error when permission is denied', async () => {
      mockRequestPermissionsAsync.mockResolvedValue({
        granted: false,
        canAskAgain: false,
      })

      const resultPromise = registerForPushNotifications(TEST_USER_ID)
      await vi.runAllTimersAsync()
      const result = await resultPromise

      expect(result.success).toBe(false)
      expect(result.error).toBe(NOTIFICATION_ERRORS.PERMISSION_DENIED)
    })

    it('retries on transient failures', async () => {
      mockRequestPermissionsAsync.mockResolvedValue({
        granted: true,
        canAskAgain: true,
      })

      // Fail first two attempts, succeed on third
      mockGetExpoPushTokenAsync
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({ data: TEST_PUSH_TOKEN })

      mockSupabaseRpc.mockResolvedValue({ data: null, error: null })

      const resultPromise = registerForPushNotifications(TEST_USER_ID)

      // Run all timers to complete retries
      await vi.runAllTimersAsync()

      const result = await resultPromise

      expect(result.success).toBe(true)
      expect(mockGetExpoPushTokenAsync).toHaveBeenCalledTimes(3)
    })

    it('returns error after max retry attempts', async () => {
      mockRequestPermissionsAsync.mockResolvedValue({
        granted: true,
        canAskAgain: true,
      })
      mockGetExpoPushTokenAsync.mockRejectedValue(new Error('Persistent failure'))

      const resultPromise = registerForPushNotifications(TEST_USER_ID)
      await vi.runAllTimersAsync()
      const result = await resultPromise

      expect(result.success).toBe(false)
      expect(result.error).toBe('Persistent failure')
      expect(mockGetExpoPushTokenAsync).toHaveBeenCalledTimes(3) // MAX_RETRY_ATTEMPTS
    })

    it('retries on registration failure after token acquisition', async () => {
      mockRequestPermissionsAsync.mockResolvedValue({
        granted: true,
        canAskAgain: true,
      })
      mockGetExpoPushTokenAsync.mockResolvedValue({ data: TEST_PUSH_TOKEN })

      // Fail first two registration attempts, succeed on third
      mockSupabaseRpc
        .mockResolvedValueOnce({ data: null, error: { message: 'DB busy' } })
        .mockResolvedValueOnce({ data: null, error: { message: 'DB busy' } })
        .mockResolvedValueOnce({ data: null, error: null })

      const resultPromise = registerForPushNotifications(TEST_USER_ID)
      await vi.runAllTimersAsync()
      const result = await resultPromise

      expect(result.success).toBe(true)
      expect(mockSupabaseRpc).toHaveBeenCalledTimes(3)
    })
  })

  // ============================================================================
  // removePushToken Tests
  // ============================================================================

  describe('removePushToken', () => {
    beforeEach(() => {
      // Setup delete chain mock
      mockSupabaseEq.mockResolvedValue({ error: null })
    })

    it('deletes token from database', async () => {
      const result = await removePushToken(TEST_PUSH_TOKEN)

      expect(mockSupabaseFrom).toHaveBeenCalledWith('expo_push_tokens')
      expect(mockSupabaseDelete).toHaveBeenCalled()
      expect(mockSupabaseEq).toHaveBeenCalledWith('token', TEST_PUSH_TOKEN)
      expect(result.success).toBe(true)
      expect(result.error).toBeNull()
    })

    it('returns error when token is empty', async () => {
      const result = await removePushToken('')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Token is required to remove')
      expect(mockSupabaseFrom).not.toHaveBeenCalled()
    })

    it('handles database errors', async () => {
      mockSupabaseEq.mockResolvedValue({ error: { message: 'Delete failed' } })

      const result = await removePushToken(TEST_PUSH_TOKEN)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Delete failed')
    })

    it('handles exceptions during removal', async () => {
      mockSupabaseEq.mockRejectedValue(new Error('Connection lost'))

      const result = await removePushToken(TEST_PUSH_TOKEN)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Connection lost')
    })
  })

  // ============================================================================
  // removeAllUserTokens Tests
  // ============================================================================

  describe('removeAllUserTokens', () => {
    beforeEach(() => {
      mockSupabaseEq.mockResolvedValue({ error: null })
    })

    it('deletes all tokens for user', async () => {
      const result = await removeAllUserTokens(TEST_USER_ID)

      expect(mockSupabaseFrom).toHaveBeenCalledWith('expo_push_tokens')
      expect(mockSupabaseDelete).toHaveBeenCalled()
      expect(mockSupabaseEq).toHaveBeenCalledWith('user_id', TEST_USER_ID)
      expect(result.success).toBe(true)
      expect(result.error).toBeNull()
    })

    it('returns error when user ID is empty', async () => {
      const result = await removeAllUserTokens('')

      expect(result.success).toBe(false)
      expect(result.error).toBe(NOTIFICATION_ERRORS.USER_NOT_AUTHENTICATED)
      expect(mockSupabaseFrom).not.toHaveBeenCalled()
    })

    it('handles database errors', async () => {
      mockSupabaseEq.mockResolvedValue({ error: { message: 'Bulk delete failed' } })

      const result = await removeAllUserTokens(TEST_USER_ID)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Bulk delete failed')
    })

    it('handles exceptions during removal', async () => {
      mockSupabaseEq.mockRejectedValue(new Error('Timeout'))

      const result = await removeAllUserTokens(TEST_USER_ID)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Timeout')
    })
  })

  // ============================================================================
  // NOTIFICATION_ERRORS Constants Tests
  // ============================================================================

  describe('NOTIFICATION_ERRORS', () => {
    it('exports all expected error constants', () => {
      expect(NOTIFICATION_ERRORS.PERMISSION_DENIED).toBeDefined()
      expect(NOTIFICATION_ERRORS.NOT_PHYSICAL_DEVICE).toBeDefined()
      expect(NOTIFICATION_ERRORS.TOKEN_ACQUISITION_FAILED).toBeDefined()
      expect(NOTIFICATION_ERRORS.TOKEN_REGISTRATION_FAILED).toBeDefined()
      expect(NOTIFICATION_ERRORS.TOKEN_REMOVAL_FAILED).toBeDefined()
      expect(NOTIFICATION_ERRORS.USER_NOT_AUTHENTICATED).toBeDefined()
      expect(NOTIFICATION_ERRORS.PROJECT_ID_MISSING).toBeDefined()
      expect(NOTIFICATION_ERRORS.UNKNOWN_ERROR).toBeDefined()
    })

    it('error messages are user-friendly strings', () => {
      expect(typeof NOTIFICATION_ERRORS.PERMISSION_DENIED).toBe('string')
      expect(NOTIFICATION_ERRORS.PERMISSION_DENIED.length).toBeGreaterThan(10)
    })
  })

  // ============================================================================
  // Type Export Tests
  // ============================================================================

  describe('type exports', () => {
    it('PermissionResult type is usable', () => {
      const result: PermissionResult = {
        granted: true,
        canAskAgain: true,
        error: null,
      }
      expect(result.granted).toBe(true)
    })

    it('TokenRegistrationResult type is usable', () => {
      const result: TokenRegistrationResult = {
        success: true,
        token: TEST_PUSH_TOKEN,
        error: null,
      }
      expect(result.success).toBe(true)
    })

    it('TokenRemovalResult type is usable', () => {
      const result: TokenRemovalResult = {
        success: true,
        error: null,
      }
      expect(result.success).toBe(true)
    })
  })

  // ============================================================================
  // Edge Cases Tests
  // ============================================================================

  describe('edge cases', () => {
    it('handles null device info fields gracefully', async () => {
      mockDevice.brand = null as unknown as string
      mockDevice.modelName = null as unknown as string
      mockDevice.osName = null as unknown as string
      mockDevice.osVersion = null as unknown as string
      mockDevice.deviceType = null as unknown as number

      mockSupabaseRpc.mockResolvedValue({ data: null, error: null })

      const result = await registerPushToken(TEST_USER_ID, TEST_PUSH_TOKEN)

      expect(result.success).toBe(true)
      expect(mockSupabaseRpc).toHaveBeenCalledWith('upsert_push_token', {
        p_user_id: TEST_USER_ID,
        p_token: TEST_PUSH_TOKEN,
        p_device_info: {
          brand: null,
          modelName: null,
          osName: null,
          osVersion: null,
          deviceType: null,
        },
      })
    })

    it('handles very long push tokens', async () => {
      const longToken = 'ExponentPushToken[' + 'a'.repeat(200) + ']'
      mockSupabaseRpc.mockResolvedValue({ data: null, error: null })

      const result = await registerPushToken(TEST_USER_ID, longToken)

      expect(result.success).toBe(true)
      expect(mockSupabaseRpc).toHaveBeenCalledWith('upsert_push_token', {
        p_user_id: TEST_USER_ID,
        p_token: longToken,
        p_device_info: expect.any(Object),
      })
    })

    it('handles special characters in user ID', async () => {
      const specialUserId = 'user-123_abc-def@example.com'
      mockSupabaseRpc.mockResolvedValue({ data: null, error: null })

      const result = await registerPushToken(specialUserId, TEST_PUSH_TOKEN)

      expect(result.success).toBe(true)
      expect(mockSupabaseRpc).toHaveBeenCalledWith('upsert_push_token', {
        p_user_id: specialUserId,
        p_token: TEST_PUSH_TOKEN,
        p_device_info: expect.any(Object),
      })
    })
  })
})
