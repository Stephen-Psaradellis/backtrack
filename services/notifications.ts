/**
 * Push Notification Service
 *
 * Handles push notification permissions, token registration, and token management
 * for the Backtrack app. Uses Expo Notifications API for token acquisition
 * and Supabase for persistent token storage.
 *
 * KEY CONCEPTS:
 * - Permission must be granted before push notifications can be received
 * - Expo push tokens are unique per device/app installation
 * - Tokens are stored in expo_push_tokens table for Edge Function access
 * - Token registration should be retried on failure (network issues)
 *
 * @example
 * ```tsx
 * import { registerForPushNotifications, requestNotificationPermissions } from 'services/notifications'
 *
 * // Request permissions and register token
 * const result = await registerForPushNotifications(userId)
 * if (result.success) {
 *   console.log('Push token registered:', result.token)
 * }
 * ```
 */

import * as Notifications from 'expo-notifications'
import * as Device from 'expo-device'
import Constants from 'expo-constants'
import { Platform } from 'react-native'
import { supabase } from '../lib/supabase'

// ============================================================================
// TYPES
// ============================================================================

/**
 * Result from requesting notification permissions
 */
export interface PermissionResult {
  /** Whether permissions were granted */
  granted: boolean
  /** Whether the user can be asked again (false if permanently denied) */
  canAskAgain: boolean
  /** iOS-specific: Whether provisional permission was granted */
  isProvisional?: boolean
  /** Error message if something went wrong */
  error: string | null
}

/**
 * Result from push token registration
 */
export interface TokenRegistrationResult {
  /** Whether registration was successful */
  success: boolean
  /** The Expo push token (if successful) */
  token: string | null
  /** Error message if registration failed */
  error: string | null
}

/**
 * Result from removing a push token
 */
export interface TokenRemovalResult {
  /** Whether removal was successful */
  success: boolean
  /** Error message if removal failed */
  error: string | null
}

/**
 * Device information stored with push token
 */
export interface DeviceInfo {
  /** Device brand (e.g., 'Apple', 'Samsung') */
  brand: string | null
  /** Device model name */
  modelName: string | null
  /** OS name ('ios' or 'android') */
  osName: string | null
  /** OS version string */
  osVersion: string | null
  /** Device type from expo-device */
  deviceType: number | null
}

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Error messages for notification operations
 */
export const NOTIFICATION_ERRORS = {
  PERMISSION_DENIED: 'Notification permission was denied. Please enable notifications in your device settings.',
  NOT_PHYSICAL_DEVICE: 'Push notifications require a physical device. Simulators and emulators are not supported.',
  TOKEN_ACQUISITION_FAILED: 'Failed to acquire push notification token. Please check your network connection and try again.',
  TOKEN_REGISTRATION_FAILED: 'Failed to register push token with server. Please try again.',
  TOKEN_REMOVAL_FAILED: 'Failed to remove push token. Please try again.',
  USER_NOT_AUTHENTICATED: 'User must be authenticated to register push notifications.',
  PROJECT_ID_MISSING: 'Expo project ID is not configured. Please check your app.json or environment variables.',
  UNKNOWN_ERROR: 'An unexpected error occurred with push notifications.',
} as const

/**
 * Maximum number of retry attempts for token registration
 */
const MAX_RETRY_ATTEMPTS = 3

/**
 * Delay between retry attempts in milliseconds
 */
const RETRY_DELAY_MS = 1000

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get the Expo project ID from environment or app config
 *
 * @returns The project ID or null if not configured
 */
function getProjectId(): string | null {
  // First check environment variable
  const envProjectId = process.env.EXPO_PUBLIC_PROJECT_ID

  if (envProjectId) {
    return envProjectId
  }

  // Fall back to expo-constants
  const expoConfig = Constants.expoConfig
  if (expoConfig?.extra?.eas?.projectId) {
    return expoConfig.extra.eas.projectId
  }

  // Check manifest for backwards compatibility
  const manifest = Constants.manifest
  if (manifest?.extra?.eas?.projectId) {
    return manifest.extra.eas.projectId
  }

  return null
}

/**
 * Get current device information
 *
 * @returns Device info object for storage with push token
 */
function getDeviceInfo(): DeviceInfo {
  return {
    brand: Device.brand,
    modelName: Device.modelName,
    osName: Device.osName,
    osVersion: Device.osVersion,
    deviceType: Device.deviceType,
  }
}

/**
 * Sleep for a specified duration
 *
 * @param ms - Milliseconds to sleep
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Check if the current device is a physical device
 *
 * @returns Whether the device is physical (not simulator/emulator)
 */
export function isPhysicalDevice(): boolean {
  return Device.isDevice
}

// ============================================================================
// PERMISSION FUNCTIONS
// ============================================================================

/**
 * Check current notification permission status
 *
 * @returns Current permission status without prompting the user
 *
 * @example
 * const { granted } = await getNotificationPermissions()
 * if (granted) {
 *   console.log('Notifications are enabled')
 * }
 */
export async function getNotificationPermissions(): Promise<PermissionResult> {
  try {
    const settings = await Notifications.getPermissionsAsync()

    const granted = settings.granted ||
      settings.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL

    return {
      granted,
      canAskAgain: settings.canAskAgain,
      isProvisional: settings.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL,
      error: null,
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : NOTIFICATION_ERRORS.UNKNOWN_ERROR
    return {
      granted: false,
      canAskAgain: true,
      error: message,
    }
  }
}

/**
 * Request notification permissions from the user
 *
 * This will show the system permission dialog on first request.
 * If the user has previously denied, returns denied status.
 *
 * @returns Permission result including whether granted and if can ask again
 *
 * @example
 * const result = await requestNotificationPermissions()
 * if (result.granted) {
 *   // Proceed with token registration
 * } else if (!result.canAskAgain) {
 *   // Show message to enable in settings
 * }
 */
export async function requestNotificationPermissions(): Promise<PermissionResult> {
  try {
    // Request permissions with iOS-specific options
    const settings = await Notifications.requestPermissionsAsync({
      ios: {
        allowAlert: true,
        allowBadge: true,
        allowSound: true,
      },
    })

    const granted = settings.granted ||
      settings.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL

    return {
      granted,
      canAskAgain: settings.canAskAgain,
      isProvisional: settings.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL,
      error: granted ? null : NOTIFICATION_ERRORS.PERMISSION_DENIED,
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : NOTIFICATION_ERRORS.UNKNOWN_ERROR
    return {
      granted: false,
      canAskAgain: true,
      error: message,
    }
  }
}

// ============================================================================
// TOKEN FUNCTIONS
// ============================================================================

/**
 * Get the Expo push token for the current device
 *
 * This requires notification permissions to be granted first.
 * Makes a network request to Expo's servers, so may fail offline.
 *
 * @returns The Expo push token string or null on failure
 */
export async function getExpoPushTokenAsync(): Promise<{ token: string | null; error: string | null }> {
  try {
    // Verify physical device
    if (!isPhysicalDevice()) {
      return {
        token: null,
        error: NOTIFICATION_ERRORS.NOT_PHYSICAL_DEVICE,
      }
    }

    // Get project ID
    const projectId = getProjectId()
    if (!projectId) {
      return {
        token: null,
        error: NOTIFICATION_ERRORS.PROJECT_ID_MISSING,
      }
    }

    // Setup Android notification channel (required for Android 8+)
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF6B6B',
      })
    }

    // Get the Expo push token
    const expoPushToken = await Notifications.getExpoPushTokenAsync({
      projectId,
    })

    return {
      token: expoPushToken.data,
      error: null,
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : NOTIFICATION_ERRORS.TOKEN_ACQUISITION_FAILED
    return {
      token: null,
      error: message,
    }
  }
}

/**
 * Register a push token with the Supabase backend
 *
 * Saves the token to expo_push_tokens table using upsert_push_token RPC.
 * Handles duplicates by updating existing token record.
 *
 * @param userId - The authenticated user's ID
 * @param token - The Expo push token to register
 * @returns Result indicating success or failure
 */
export async function registerPushToken(
  userId: string,
  token: string
): Promise<TokenRegistrationResult> {
  if (!userId) {
    return {
      success: false,
      token: null,
      error: NOTIFICATION_ERRORS.USER_NOT_AUTHENTICATED,
    }
  }

  try {
    const deviceInfo = getDeviceInfo()

    // Use the upsert_push_token RPC function
    const { data, error } = await supabase.rpc('upsert_push_token', {
      p_user_id: userId,
      p_token: token,
      p_device_info: deviceInfo,
    })

    if (error) {
      return {
        success: false,
        token: null,
        error: error.message || NOTIFICATION_ERRORS.TOKEN_REGISTRATION_FAILED,
      }
    }

    return {
      success: true,
      token,
      error: null,
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : NOTIFICATION_ERRORS.TOKEN_REGISTRATION_FAILED
    return {
      success: false,
      token: null,
      error: message,
    }
  }
}

/**
 * Register for push notifications with retry logic
 *
 * This is the main entry point for push notification registration.
 * It handles the complete flow:
 * 1. Checks if device is physical
 * 2. Requests permissions if needed
 * 3. Gets Expo push token
 * 4. Registers token with backend
 *
 * Includes retry logic for transient failures.
 *
 * @param userId - The authenticated user's ID
 * @returns Registration result with token on success
 *
 * @example
 * ```tsx
 * const result = await registerForPushNotifications(userId)
 * if (result.success) {
 *   console.log('Registered with token:', result.token)
 * } else {
 *   console.error('Registration failed:', result.error)
 * }
 * ```
 */
export async function registerForPushNotifications(
  userId: string | null | undefined
): Promise<TokenRegistrationResult> {
  // Validate user ID
  if (!userId) {
    return {
      success: false,
      token: null,
      error: NOTIFICATION_ERRORS.USER_NOT_AUTHENTICATED,
    }
  }

  // Check physical device
  if (!isPhysicalDevice()) {
    return {
      success: false,
      token: null,
      error: NOTIFICATION_ERRORS.NOT_PHYSICAL_DEVICE,
    }
  }

  // Request permissions
  const permissionResult = await requestNotificationPermissions()
  if (!permissionResult.granted) {
    return {
      success: false,
      token: null,
      error: permissionResult.error || NOTIFICATION_ERRORS.PERMISSION_DENIED,
    }
  }

  // Get push token with retry logic
  let lastError: string | null = null
  for (let attempt = 1; attempt <= MAX_RETRY_ATTEMPTS; attempt++) {
    const tokenResult = await getExpoPushTokenAsync()

    if (tokenResult.token) {
      // Register token with backend
      const registrationResult = await registerPushToken(userId, tokenResult.token)

      if (registrationResult.success) {
        return registrationResult
      }

      lastError = registrationResult.error
    } else {
      lastError = tokenResult.error
    }

    // Wait before retrying (except on last attempt)
    if (attempt < MAX_RETRY_ATTEMPTS) {
      await sleep(RETRY_DELAY_MS * attempt)
    }
  }

  return {
    success: false,
    token: null,
    error: lastError || NOTIFICATION_ERRORS.TOKEN_ACQUISITION_FAILED,
  }
}

/**
 * Remove a push token from the backend
 *
 * Should be called when:
 * - User logs out
 * - User disables notifications
 * - Token is no longer valid
 *
 * @param token - The Expo push token to remove
 * @returns Result indicating success or failure
 *
 * @example
 * const result = await removePushToken(currentToken)
 * if (result.success) {
 *   console.log('Token removed successfully')
 * }
 */
export async function removePushToken(token: string): Promise<TokenRemovalResult> {
  if (!token) {
    return {
      success: false,
      error: 'Token is required to remove',
    }
  }

  try {
    const { error } = await supabase
      .from('expo_push_tokens')
      .delete()
      .eq('token', token)

    if (error) {
      return {
        success: false,
        error: error.message || NOTIFICATION_ERRORS.TOKEN_REMOVAL_FAILED,
      }
    }

    return {
      success: true,
      error: null,
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : NOTIFICATION_ERRORS.TOKEN_REMOVAL_FAILED
    return {
      success: false,
      error: message,
    }
  }
}

/**
 * Remove all push tokens for the current user
 *
 * Useful when user logs out to stop receiving notifications.
 *
 * @param userId - The user's ID
 * @returns Result indicating success or failure
 */
export async function removeAllUserTokens(userId: string): Promise<TokenRemovalResult> {
  if (!userId) {
    return {
      success: false,
      error: NOTIFICATION_ERRORS.USER_NOT_AUTHENTICATED,
    }
  }

  try {
    const { error } = await supabase
      .from('expo_push_tokens')
      .delete()
      .eq('user_id', userId)

    if (error) {
      return {
        success: false,
        error: error.message || NOTIFICATION_ERRORS.TOKEN_REMOVAL_FAILED,
      }
    }

    return {
      success: true,
      error: null,
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : NOTIFICATION_ERRORS.TOKEN_REMOVAL_FAILED
    return {
      success: false,
      error: message,
    }
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  // Permission functions
  getNotificationPermissions,
  requestNotificationPermissions,
  // Token functions
  getExpoPushTokenAsync,
  registerPushToken,
  registerForPushNotifications,
  removePushToken,
  removeAllUserTokens,
  // Utility functions
  isPhysicalDevice,
  // Constants
  NOTIFICATION_ERRORS,
}
