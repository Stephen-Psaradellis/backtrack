/**
 * Safety Detection Utilities
 *
 * Detects sensitive personal information in chat messages to warn users
 * before they share potentially dangerous information with strangers.
 *
 * Detects:
 * - Phone numbers (US and international formats)
 * - Email addresses
 * - Physical addresses (street addresses with numbers)
 * - Social media handles and URLs
 *
 * This is a client-side warning system - it doesn't block messages,
 * just alerts users so they can reconsider.
 *
 * @example
 * ```tsx
 * const result = detectSensitiveContent(messageText)
 * if (result.hasSensitiveContent) {
 *   showWarning(result.warning)
 * }
 * ```
 */

// ============================================================================
// TYPES
// ============================================================================

/**
 * Type of sensitive content detected
 */
export type SensitiveContentType = 'phone' | 'email' | 'address' | 'social' | null

/**
 * Detection result with warning message
 */
export interface SensitiveContentResult {
  /**
   * Whether sensitive content was detected
   */
  hasSensitiveContent: boolean

  /**
   * Type of content detected (null if none)
   */
  type: SensitiveContentType

  /**
   * User-friendly warning message
   */
  warning: string
}

// ============================================================================
// REGEX PATTERNS
// ============================================================================

/**
 * Phone number patterns
 * Matches common US and international formats:
 * - (555) 123-4567
 * - 555-123-4567
 * - 555.123.4567
 * - 5551234567
 * - +1 555 123 4567
 * - +44 20 7123 4567
 */
const PHONE_REGEX =
  /(?:\+\d{1,3}[\s.-]?)?\(?\d{2,4}\)?[\s.-]?\d{2,4}[\s.-]?\d{3,4}[\s.-]?\d{0,4}/g

/**
 * Email address pattern
 * Matches standard email formats
 */
const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g

/**
 * Street address pattern
 * Matches addresses with street numbers:
 * - 123 Main Street
 * - 456 Oak Ave
 * - 789 Park Rd
 */
const ADDRESS_REGEX = /\b\d{1,5}\s+[A-Za-z]{2,}[\s,]+[A-Za-z]{2,}/g

/**
 * Social media handle pattern
 * Matches:
 * - @username
 * - instagram.com/username
 * - twitter.com/username
 * - facebook.com/username
 * - tiktok.com/@username
 * - snapchat handle patterns
 */
const SOCIAL_MEDIA_REGEX =
  /@\w{3,}|(?:instagram|twitter|facebook|tiktok|snapchat|snap)\.com\/[\w@.-]+/gi

// ============================================================================
// WARNING MESSAGES
// ============================================================================

/**
 * User-friendly warning messages for each type
 */
const WARNINGS: Record<NonNullable<SensitiveContentType>, string> = {
  phone:
    'It looks like you\'re sharing a phone number. Be careful sharing personal contact info with people you haven\'t met.',
  email:
    'It looks like you\'re sharing an email address. Be careful sharing personal contact info with people you haven\'t met.',
  address:
    'It looks like you\'re sharing a physical address. Never share your home address with strangers - meet in public places instead.',
  social:
    'It looks like you\'re sharing a social media account. Be careful sharing personal accounts with people you haven\'t met.',
}

// ============================================================================
// DETECTION LOGIC
// ============================================================================

/**
 * Check if text contains a phone number
 */
function detectPhone(text: string): boolean {
  // Reset regex state
  PHONE_REGEX.lastIndex = 0

  const matches = text.match(PHONE_REGEX)
  if (!matches) return false

  // Additional validation: match must contain enough digits
  // to avoid false positives on dates or other numbers
  return matches.some((match) => {
    const digitCount = match.replace(/\D/g, '').length
    return digitCount >= 10 // US phone numbers are 10 digits minimum
  })
}

/**
 * Check if text contains an email address
 */
function detectEmail(text: string): boolean {
  EMAIL_REGEX.lastIndex = 0
  return EMAIL_REGEX.test(text)
}

/**
 * Check if text contains a physical address
 */
function detectAddress(text: string): boolean {
  ADDRESS_REGEX.lastIndex = 0
  return ADDRESS_REGEX.test(text)
}

/**
 * Check if text contains social media handles or URLs
 */
function detectSocialMedia(text: string): boolean {
  SOCIAL_MEDIA_REGEX.lastIndex = 0
  return SOCIAL_MEDIA_REGEX.test(text)
}

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Detect sensitive personal information in text
 *
 * Checks for phone numbers, emails, addresses, and social media handles.
 * Returns the first type detected with a user-friendly warning message.
 *
 * Detection order (by severity):
 * 1. Address (most dangerous - physical location)
 * 2. Phone (direct contact)
 * 3. Email (direct contact)
 * 4. Social media (less direct but still personal)
 *
 * @param text - Message text to analyze
 * @returns Detection result with type and warning message
 *
 * @example
 * ```tsx
 * const result = detectSensitiveContent('My number is 555-1234')
 * if (result.hasSensitiveContent) {
 *   console.log(result.warning) // "It looks like you're sharing a phone number..."
 * }
 * ```
 */
export function detectSensitiveContent(text: string | null | undefined): SensitiveContentResult {
  if (!text || typeof text !== 'string') {
    return {
      hasSensitiveContent: false,
      type: null,
      warning: '',
    }
  }

  // Check in order of severity (most dangerous first)
  if (detectAddress(text)) {
    return {
      hasSensitiveContent: true,
      type: 'address',
      warning: WARNINGS.address,
    }
  }

  if (detectPhone(text)) {
    return {
      hasSensitiveContent: true,
      type: 'phone',
      warning: WARNINGS.phone,
    }
  }

  if (detectEmail(text)) {
    return {
      hasSensitiveContent: true,
      type: 'email',
      warning: WARNINGS.email,
    }
  }

  if (detectSocialMedia(text)) {
    return {
      hasSensitiveContent: true,
      type: 'social',
      warning: WARNINGS.social,
    }
  }

  return {
    hasSensitiveContent: false,
    type: null,
    warning: '',
  }
}

/**
 * Export individual detectors for testing or custom workflows
 */
export const detectors = {
  detectPhone,
  detectEmail,
  detectAddress,
  detectSocialMedia,
}

export default detectSensitiveContent
