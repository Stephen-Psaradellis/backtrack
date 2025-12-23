/**
 * Haptics Utilities
 *
 * Provides centralized haptic feedback functions for the Love Ledger app.
 * Uses expo-haptics to deliver tactile feedback for user interactions.
 *
 * HAPTIC FEEDBACK TYPES:
 * 1. Light - Button presses, minor interactions
 * 2. Medium - Successful confirmations
 * 3. Heavy - Important warnings, major errors
 * 4. Selection - Option/tab selection changes
 * 5. Success - Successful completion (notification style)
 * 6. Warning - Destructive action confirmations (notification style)
 * 7. Error - Failures, validation errors (notification style)
 *
 * All functions are platform-safe and gracefully handle unsupported devices.
 *
 * @example
 * ```tsx
 * import { lightFeedback, successFeedback, errorFeedback } from 'lib/haptics'
 *
 * // Button press
 * const handlePress = async () => {
 *   await lightFeedback()
 *   doSomething()
 * }
 *
 * // Successful action
 * const handleSubmit = async () => {
 *   const result = await submitForm()
 *   if (result.success) {
 *     await successFeedback()
 *   } else {
 *     await errorFeedback()
 *   }
 * }
 * ```
 */

import { Platform } from 'react-native'
import * as Haptics from 'expo-haptics'

// ============================================================================
// TYPES
// ============================================================================

/**
 * Impact feedback intensity levels
 */
export type ImpactStyle = 'light' | 'medium' | 'heavy'

/**
 * Notification feedback types
 */
export type NotificationType = 'success' | 'warning' | 'error'

/**
 * All available haptic feedback types
 */
export type HapticType =
  | 'light'
  | 'medium'
  | 'heavy'
  | 'selection'
  | 'success'
  | 'warning'
  | 'error'
  | 'notification'

/**
 * Options for haptic feedback
 */
export interface HapticOptions {
  /**
   * Whether to skip haptic feedback (useful for respecting user preferences)
   * @default false
   */
  disabled?: boolean
}

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Whether haptics are supported on the current platform
 * Haptics are not supported on web
 */
export const HAPTICS_SUPPORTED = Platform.OS === 'ios' || Platform.OS === 'android'

/**
 * Mapping of impact styles to expo-haptics constants
 */
const IMPACT_STYLE_MAP: Record<ImpactStyle, Haptics.ImpactFeedbackStyle> = {
  light: Haptics.ImpactFeedbackStyle.Light,
  medium: Haptics.ImpactFeedbackStyle.Medium,
  heavy: Haptics.ImpactFeedbackStyle.Heavy,
}

/**
 * Mapping of notification types to expo-haptics constants
 */
const NOTIFICATION_TYPE_MAP: Record<NotificationType, Haptics.NotificationFeedbackType> = {
  success: Haptics.NotificationFeedbackType.Success,
  warning: Haptics.NotificationFeedbackType.Warning,
  error: Haptics.NotificationFeedbackType.Error,
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Check if haptics should be triggered
 * Returns false on unsupported platforms or when explicitly disabled
 *
 * @param options - Haptic options
 * @returns Whether haptics should be triggered
 */
function shouldTriggerHaptics(options?: HapticOptions): boolean {
  if (!HAPTICS_SUPPORTED) {
    return false
  }

  if (options?.disabled) {
    return false
  }

  return true
}

/**
 * Safely execute a haptic function with error handling
 * Catches and silently ignores errors to prevent app crashes on unsupported devices
 *
 * @param hapticFn - The haptic function to execute
 */
async function safeHaptic(hapticFn: () => Promise<void>): Promise<void> {
  try {
    await hapticFn()
  } catch {
    // Silently ignore errors on unsupported devices
    // This ensures haptic calls never crash the app
  }
}

// ============================================================================
// IMPACT FEEDBACK FUNCTIONS
// ============================================================================

/**
 * Trigger impact feedback with a specific style
 *
 * @param style - The impact style (light, medium, or heavy)
 * @param options - Haptic options
 *
 * @example
 * await impactFeedback('medium')
 */
export async function impactFeedback(
  style: ImpactStyle,
  options?: HapticOptions
): Promise<void> {
  if (!shouldTriggerHaptics(options)) {
    return
  }

  await safeHaptic(() => Haptics.impactAsync(IMPACT_STYLE_MAP[style]))
}

/**
 * Trigger light impact feedback
 *
 * Use for: Button presses, minor interactions, taps
 *
 * @param options - Haptic options
 *
 * @example
 * const handleButtonPress = async () => {
 *   await lightFeedback()
 *   onPress?.()
 * }
 */
export async function lightFeedback(options?: HapticOptions): Promise<void> {
  await impactFeedback('light', options)
}

/**
 * Trigger medium impact feedback
 *
 * Use for: Successful confirmations, completed actions, saves
 *
 * @param options - Haptic options
 *
 * @example
 * const handleSave = async () => {
 *   const result = await saveProfile()
 *   if (result.success) {
 *     await mediumFeedback()
 *   }
 * }
 */
export async function mediumFeedback(options?: HapticOptions): Promise<void> {
  await impactFeedback('medium', options)
}

/**
 * Trigger heavy impact feedback
 *
 * Use for: Important warnings, major errors, significant state changes
 *
 * @param options - Haptic options
 *
 * @example
 * const handleCriticalError = async () => {
 *   await heavyFeedback()
 *   showCriticalErrorAlert()
 * }
 */
export async function heavyFeedback(options?: HapticOptions): Promise<void> {
  await impactFeedback('heavy', options)
}

// ============================================================================
// SELECTION FEEDBACK FUNCTION
// ============================================================================

/**
 * Trigger selection feedback
 *
 * Use for: Option selection changes, tab switches, picker changes,
 * toggles, radio buttons, checkbox changes
 *
 * @param options - Haptic options
 *
 * @example
 * const handleTabChange = async (tab: string) => {
 *   await selectionFeedback()
 *   setActiveTab(tab)
 * }
 */
export async function selectionFeedback(options?: HapticOptions): Promise<void> {
  if (!shouldTriggerHaptics(options)) {
    return
  }

  await safeHaptic(() => Haptics.selectionAsync())
}

// ============================================================================
// NOTIFICATION FEEDBACK FUNCTIONS
// ============================================================================

/**
 * Trigger notification feedback with a specific type
 *
 * @param type - The notification type (success, warning, or error)
 * @param options - Haptic options
 *
 * @example
 * await notificationFeedback('success')
 */
export async function notificationFeedback(
  type: NotificationType,
  options?: HapticOptions
): Promise<void> {
  if (!shouldTriggerHaptics(options)) {
    return
  }

  await safeHaptic(() => Haptics.notificationAsync(NOTIFICATION_TYPE_MAP[type]))
}

/**
 * Trigger success notification feedback
 *
 * Use for: Successful form submissions, completed operations,
 * successful auth, successful uploads
 *
 * @param options - Haptic options
 *
 * @example
 * const handleLogin = async () => {
 *   const result = await signIn(email, password)
 *   if (result.success) {
 *     await successFeedback()
 *     navigation.navigate('Home')
 *   }
 * }
 */
export async function successFeedback(options?: HapticOptions): Promise<void> {
  await notificationFeedback('success', options)
}

/**
 * Trigger warning notification feedback
 *
 * Use for: Destructive action confirmations, sign out,
 * delete confirmations, irreversible actions
 *
 * @param options - Haptic options
 *
 * @example
 * const handleSignOutConfirmation = async () => {
 *   await warningFeedback()
 *   Alert.alert('Sign Out', 'Are you sure?', [...])
 * }
 */
export async function warningFeedback(options?: HapticOptions): Promise<void> {
  await notificationFeedback('warning', options)
}

/**
 * Trigger error notification feedback
 *
 * Use for: Form validation failures, API errors, failed operations,
 * auth failures, upload failures
 *
 * @param options - Haptic options
 *
 * @example
 * const handleSubmit = async () => {
 *   const result = await submitForm()
 *   if (!result.success) {
 *     await errorFeedback()
 *     showError(result.error)
 *   }
 * }
 */
export async function errorFeedback(options?: HapticOptions): Promise<void> {
  await notificationFeedback('error', options)
}

// ============================================================================
// CONVENIENCE FUNCTION
// ============================================================================

/**
 * Trigger haptic feedback by type name
 *
 * Convenience function for when the haptic type is dynamic
 *
 * @param type - The haptic feedback type
 * @param options - Haptic options
 *
 * @example
 * const handleFeedback = async (type: HapticType) => {
 *   await triggerHaptic(type)
 * }
 */
export async function triggerHaptic(
  type: HapticType,
  options?: HapticOptions
): Promise<void> {
  switch (type) {
    case 'light':
      return lightFeedback(options)
    case 'medium':
      return mediumFeedback(options)
    case 'heavy':
      return heavyFeedback(options)
    case 'selection':
      return selectionFeedback(options)
    case 'success':
      return successFeedback(options)
    case 'warning':
      return warningFeedback(options)
    case 'error':
      return errorFeedback(options)
    case 'notification':
      // Default notification to success
      return successFeedback(options)
    default:
      // Unknown type - do nothing
      return
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  // Impact feedback
  impactFeedback,
  lightFeedback,
  mediumFeedback,
  heavyFeedback,
  // Selection feedback
  selectionFeedback,
  // Notification feedback
  notificationFeedback,
  successFeedback,
  warningFeedback,
  errorFeedback,
  // Convenience
  triggerHaptic,
  // Constants
  HAPTICS_SUPPORTED,
}
