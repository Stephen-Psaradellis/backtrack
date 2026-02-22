/**
 * Text Sanitization Utilities
 *
 * Provides text sanitization for user-generated content to prevent
 * XSS-style attacks, notification injection, and display issues.
 *
 * In React Native:
 * - <Text> components auto-escape HTML, but notifications on Android can interpret HTML
 * - Database-sourced content (location names, messages) should be sanitized
 * - Control characters and invisible Unicode can cause display issues
 *
 * @example
 * ```tsx
 * import { sanitizeForDisplay, sanitizeForNotification } from 'lib/utils/sanitize'
 *
 * // For displaying in UI
 * <Text>{sanitizeForDisplay(message.content)}</Text>
 *
 * // For notification bodies
 * await Notifications.scheduleNotificationAsync({
 *   content: { body: sanitizeForNotification(locationName) }
 * })
 * ```
 */

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Maximum length for displayed text to prevent memory issues
 */
const MAX_DISPLAY_LENGTH = 10000

/**
 * Maximum length for notification body
 */
const MAX_NOTIFICATION_LENGTH = 500

/**
 * Dangerous Unicode characters that can cause display issues
 * - RTL/LTR override characters can flip text direction maliciously
 * - Zero-width characters can hide content
 * - Object replacement character
 */
const DANGEROUS_UNICODE_REGEX = /[\u200B-\u200F\u202A-\u202E\u2060-\u206F\uFEFF\uFFFC]/g

/**
 * Control characters (except newline, tab, carriage return)
 */
const CONTROL_CHARS_REGEX = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g

/**
 * HTML entities that should be escaped for notification bodies
 */
const HTML_ENTITIES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
}

// ============================================================================
// CORE SANITIZATION
// ============================================================================

/**
 * Remove dangerous Unicode characters that can cause display issues
 */
function removeDangerousUnicode(text: string): string {
  return text.replace(DANGEROUS_UNICODE_REGEX, '')
}

/**
 * Remove control characters except newline, tab, carriage return
 */
function removeControlChars(text: string): string {
  return text.replace(CONTROL_CHARS_REGEX, '')
}

/**
 * Escape HTML entities for contexts where HTML might be interpreted
 */
function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (char) => HTML_ENTITIES[char] || char)
}

/**
 * Normalize whitespace - collapse multiple spaces, trim leading/trailing
 */
function normalizeWhitespace(text: string, preserveNewlines = true): string {
  if (preserveNewlines) {
    // Collapse multiple spaces but preserve single newlines
    return text
      .replace(/[^\S\n]+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim()
  }
  // Collapse all whitespace including newlines
  return text.replace(/\s+/g, ' ').trim()
}

/**
 * Truncate text to maximum length, adding ellipsis if needed
 */
function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text
  }
  return text.slice(0, maxLength - 1) + '…'
}

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Sanitize text for display in React Native UI components
 *
 * While React Native <Text> components don't interpret HTML,
 * this function still:
 * - Removes dangerous Unicode (RTL override, zero-width chars)
 * - Removes control characters
 * - Normalizes whitespace
 * - Truncates to safe length
 *
 * @param text - Raw text to sanitize
 * @param maxLength - Maximum length (default: 10000)
 * @returns Sanitized text safe for display
 *
 * @example
 * ```tsx
 * const safeContent = sanitizeForDisplay(message.content)
 * return <Text>{safeContent}</Text>
 * ```
 */
export function sanitizeForDisplay(
  text: string | null | undefined,
  maxLength: number = MAX_DISPLAY_LENGTH
): string {
  if (!text) {
    return ''
  }

  let result = String(text)
  result = removeDangerousUnicode(result)
  result = removeControlChars(result)
  result = normalizeWhitespace(result, true)
  result = truncate(result, maxLength)

  return result
}

/**
 * Sanitize text for use in notification bodies
 *
 * Android notifications can interpret HTML in some contexts,
 * so this function also escapes HTML entities.
 *
 * @param text - Raw text to sanitize
 * @param maxLength - Maximum length (default: 500)
 * @returns Sanitized text safe for notifications
 *
 * @example
 * ```tsx
 * await Notifications.scheduleNotificationAsync({
 *   content: {
 *     title: 'Check In?',
 *     body: sanitizeForNotification(`You've been at ${locationName} for a while.`)
 *   }
 * })
 * ```
 */
export function sanitizeForNotification(
  text: string | null | undefined,
  maxLength: number = MAX_NOTIFICATION_LENGTH
): string {
  if (!text) {
    return ''
  }

  let result = String(text)
  result = removeDangerousUnicode(result)
  result = removeControlChars(result)
  result = escapeHtml(result)
  result = normalizeWhitespace(result, false) // No newlines in notifications
  result = truncate(result, maxLength)

  return result
}

/**
 * Sanitize a location name for display or notification use
 *
 * Location names from database should be validated since they're
 * user-generated content from place data.
 *
 * @param name - Location name to sanitize
 * @returns Sanitized location name
 */
export function sanitizeLocationName(name: string | null | undefined): string {
  if (!name) {
    return 'this location'
  }

  // Use notification-safe sanitization (HTML escaped, no newlines)
  // with a shorter max length appropriate for location names
  return sanitizeForNotification(name, 100)
}

/**
 * Check if text contains potentially dangerous content
 *
 * Useful for logging/monitoring without actually sanitizing.
 *
 * @param text - Text to check
 * @returns true if text contains dangerous content
 */
export function containsDangerousContent(text: string | null | undefined): boolean {
  if (!text) {
    return false
  }

  // Reset lastIndex before testing (global regexes maintain state)
  DANGEROUS_UNICODE_REGEX.lastIndex = 0
  CONTROL_CHARS_REGEX.lastIndex = 0

  return (
    DANGEROUS_UNICODE_REGEX.test(text) ||
    CONTROL_CHARS_REGEX.test(text) ||
    /<script|javascript:|data:/i.test(text)
  )
}

export default {
  sanitizeForDisplay,
  sanitizeForNotification,
  sanitizeLocationName,
  containsDangerousContent,
}
