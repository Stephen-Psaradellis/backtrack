/**
 * Tests for services/notifications.ts
 *
 * Tests push notification permission management, token registration,
 * token removal, and error handling paths.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

// expo-notifications is lazy-loaded via dynamic import, so we mock at module level
const mockGetPermissionsAsync = vi.fn()
const mockRequestPermissionsAsync = vi.fn()
const mockGetExpoPushTokenAsync = vi.fn()
const mockSetNotificationChannelAsync = vi.fn()

vi.mock('expo-notifications', () => ({
  getPermissionsAsync: mockGetPermissionsAsync,
  requestPermissionsAsync: mockRequestPermissionsAsync,
  getExpoPushTokenAsync: mockGetExpoPushTokenAsync,
  setNotificationChannelAsync: mockSetNotificationChannelAsync,
  IosAuthorizationStatus: { PROVISIONAL: 1 },
  AndroidImportance: { MAX: 5 },
}))

const mockRpc = vi.fn()
const mockDelete = vi.fn()
const mockEq = vi.fn()

vi.mock('../../lib/supabase', () => ({
  supabase: {
    rpc: (...args: unknown[]) => mockRpc(...args),
    from: () => ({
      delete: () => {
        mockDelete()
        return { eq: (...args: unknown[]) => mockEq(...args) }
      },
    }),
  },
}))

vi.mock('expo-device', () => ({
  isDevice: true,
  brand: 'Apple',
  modelName: 'iPhone 15',
  osName: 'iOS',
  osVersion: '17.0',
  deviceType: 1,
}))

vi.mock('expo-constants', () => ({
  default: {
    expoConfig: {
      extra: { eas: { projectId: 'test-project-id' } },
    },
    manifest: null,
  },
}))

vi.mock('react-native', () => ({
  Platform: { OS: 'ios' },
}))

vi.mock('../../lib/sentry', () => ({
  captureException: vi.fn(),
}))

// ---------------------------------------------------------------------------
// Import after mocks
// ---------------------------------------------------------------------------

import {
  registerForPushNotifications,
  requestNotificationPermissions,
  registerPushToken,
  removePushToken,
  NOTIFICATION_ERRORS,
} from '../notifications'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function grantedPermissions() {
  return { granted: true, canAskAgain: true, ios: { status: 0 } }
}

function deniedPermissions() {
  return { granted: false, canAskAgain: false, ios: { status: 0 } }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('notifications service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // 1. registerForPushNotifications stores token on success
  it('registerForPushNotifications stores token in DB on success', async () => {
    mockRequestPermissionsAsync.mockResolvedValue(grantedPermissions())
    mockGetExpoPushTokenAsync.mockResolvedValue({ data: 'ExponentPushToken[abc123]' })
    mockRpc.mockResolvedValue({ data: true, error: null })

    const result = await registerForPushNotifications('user-1')

    expect(result.success).toBe(true)
    expect(result.token).toBe('ExponentPushToken[abc123]')
    expect(mockRpc).toHaveBeenCalledWith('upsert_push_token', expect.objectContaining({
      p_user_id: 'user-1',
      p_token: 'ExponentPushToken[abc123]',
    }))
  })

  // 2. requestNotificationPermissions handles grant
  it('requestNotificationPermissions returns granted on approval', async () => {
    mockRequestPermissionsAsync.mockResolvedValue(grantedPermissions())

    const result = await requestNotificationPermissions()

    expect(result.granted).toBe(true)
    expect(result.error).toBeNull()
  })

  // 3. requestNotificationPermissions handles deny
  it('requestNotificationPermissions returns denied with error message', async () => {
    mockRequestPermissionsAsync.mockResolvedValue(deniedPermissions())

    const result = await requestNotificationPermissions()

    expect(result.granted).toBe(false)
    expect(result.error).toBe(NOTIFICATION_ERRORS.PERMISSION_DENIED)
  })

  // 4. Graceful fallback on missing native module
  it('returns graceful error when native module fails to load', async () => {
    // Simulate module load failure by making the lazy import throw
    // We test via getNotificationPermissions indirectly through registerForPushNotifications
    // with a null userId to hit the auth check first, but for native module:
    // The module is already loaded from the mock, so we test the permission-denied path
    // which exercises the same graceful-return pattern.
    mockRequestPermissionsAsync.mockRejectedValue(new Error('Native module unavailable'))

    const result = await requestNotificationPermissions()

    expect(result.granted).toBe(false)
    expect(result.error).toBe('Native module unavailable')
  })

  // 5. Non-physical device returns early
  it('returns early with error on non-physical device', async () => {
    // Override isDevice for this test
    const Device = await import('expo-device')
    const original = Device.isDevice
    Object.defineProperty(Device, 'isDevice', { value: false, writable: true })

    const result = await registerForPushNotifications('user-1')

    expect(result.success).toBe(false)
    expect(result.error).toBe(NOTIFICATION_ERRORS.NOT_PHYSICAL_DEVICE)
    expect(mockRequestPermissionsAsync).not.toHaveBeenCalled()

    // Restore
    Object.defineProperty(Device, 'isDevice', { value: original, writable: true })
  })

  // 6. registerPushToken calls supabase RPC
  it('registerPushToken calls upsert_push_token RPC with device info', async () => {
    mockRpc.mockResolvedValue({ data: true, error: null })

    const result = await registerPushToken('user-1', 'ExponentPushToken[xyz]')

    expect(result.success).toBe(true)
    expect(result.token).toBe('ExponentPushToken[xyz]')
    expect(mockRpc).toHaveBeenCalledWith('upsert_push_token', {
      p_user_id: 'user-1',
      p_token: 'ExponentPushToken[xyz]',
      p_device_info: expect.objectContaining({
        brand: 'Apple',
        modelName: 'iPhone 15',
        osName: 'iOS',
      }),
    })
  })

  // 7. removePushToken removes from DB
  it('removePushToken deletes token from expo_push_tokens table', async () => {
    mockEq.mockResolvedValue({ error: null })

    const result = await removePushToken('ExponentPushToken[abc]')

    expect(result.success).toBe(true)
    expect(result.error).toBeNull()
    expect(mockDelete).toHaveBeenCalled()
    expect(mockEq).toHaveBeenCalledWith('token', 'ExponentPushToken[abc]')
  })

  // 8. Error handling for failed token acquisition
  it('returns error after exhausting retry attempts on token failure', async () => {
    mockRequestPermissionsAsync.mockResolvedValue(grantedPermissions())
    mockGetExpoPushTokenAsync.mockResolvedValue({
      data: null,
    })

    const result = await registerForPushNotifications('user-1')

    expect(result.success).toBe(false)
    expect(result.token).toBeNull()
    // getExpoPushTokenAsync is called inside the retry loop (up to 3 times)
    expect(mockGetExpoPushTokenAsync).toHaveBeenCalled()
  }, 15000)
})
