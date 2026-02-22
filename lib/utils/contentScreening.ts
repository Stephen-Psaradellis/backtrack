/**
 * Content Screening Utilities
 *
 * Client-side screening for user-generated post content to prevent
 * harmful content and help users avoid sharing personal information.
 *
 * Features:
 * - Hard blocks for slurs, hate speech, and threats
 * - Warnings for personal information (phone numbers, emails, etc.)
 * - Profanity detection (warn but don't block)
 * - Clear feedback messages for user guidance
 *
 * @example
 * ```tsx
 * const result = screenPostContent('Hey! Call me at 555-1234')
 * if (result.isBlocked) {
 *   // Show error, disable submit
 * } else if (result.warnings.length > 0) {
 *   // Show warnings, allow submit
 * }
 * ```
 */

// ============================================================================
// TYPES
// ============================================================================

/**
 * Result of content screening
 */
export interface ScreeningResult {
  /** Whether content should be blocked from submission */
  isBlocked: boolean
  /** Array of warning messages to display to user */
  warnings: string[]
  /** Reason for blocking (if blocked) */
  blockedReason: string | null
}

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Hard-blocked terms: slurs, hate speech, threats
 * Note: Using partial patterns to avoid false positives
 */
const BLOCKED_TERMS = [
  // Hate speech (examples - add more as needed)
  /\bn[i1]gg[ae3]r/i,
  /\bf[a@]gg[o0]t/i,
  /\btr[a@]nn[y1]/i,
  /\bretard/i,

  // Threats of violence
  /\bkill\s+(you|myself|him|her|them)\b/i,
  /\bmurder\s+(you|him|her|them)\b/i,
  /\bshoot\s+(you|up|him|her|them)\b/i,
  /\bbomb\s+(threat|you|this)\b/i,
]

/**
 * Profanity terms (warn but don't block)
 */
const PROFANITY_TERMS = [
  /\bf+u+c+k/i,
  /\bs+h+i+t/i,
  /\ba+s+s+h+o+l+e/i,
  /\bb+i+t+c+h/i,
  /\bc+u+n+t/i,
  /\bd+i+c+k/i,
  /\bp+u+s+s+y/i,
]

/**
 * Phone number patterns
 * Matches: (123) 456-7890, 123-456-7890, 1234567890, 555-1234 (short form), etc.
 */
const PHONE_PATTERN = /(\+?1?\s?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}|\b\d{3}[\s.-]\d{4}\b/

/**
 * Email patterns
 */
const EMAIL_PATTERN = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/

/**
 * Social media handle patterns
 * Matches: @username, @user_name, etc.
 */
const SOCIAL_HANDLE_PATTERN = /@[A-Za-z0-9_]{1,15}\b/

/**
 * Full name patterns (capitalized two-word patterns)
 * Matches: John Smith, Mary Jane, etc.
 */
const FULL_NAME_PATTERN = /\b[A-Z][a-z]{2,}\s+[A-Z][a-z]{2,}\b/

/**
 * Apartment/suite number patterns
 * Matches: Apt 123, Suite 4B, Unit 5, #12, # 42, etc.
 */
const LOCATION_DETAIL_PATTERN = /\b(apt|apartment|suite|unit)\s*[0-9A-Za-z]+\b|#\s*[0-9A-Za-z]+\b/i

// ============================================================================
// CORE FUNCTIONS
// ============================================================================

/**
 * Check if text contains hard-blocked content
 *
 * @param text - Text to check
 * @returns Object with blocked status and reason
 */
function checkBlockedContent(text: string): { isBlocked: boolean; reason: string | null } {
  for (const pattern of BLOCKED_TERMS) {
    if (pattern.test(text)) {
      return {
        isBlocked: true,
        reason: 'This post contains inappropriate language or threats that violate our community guidelines.',
      }
    }
  }

  return { isBlocked: false, reason: null }
}

/**
 * Detect personal information in text
 *
 * @param text - Text to check
 * @returns Array of warning messages
 */
function detectPersonalInfo(text: string): string[] {
  const warnings: string[] = []

  // Phone numbers
  if (PHONE_PATTERN.test(text)) {
    warnings.push('Looks like you included a phone number. For your safety, avoid sharing contact info.')
  }

  // Email addresses
  if (EMAIL_PATTERN.test(text)) {
    warnings.push('Looks like you included an email address. For your safety, avoid sharing contact info.')
  }

  // Social media handles
  if (SOCIAL_HANDLE_PATTERN.test(text)) {
    warnings.push('Looks like you included a social media handle. Consider removing it for privacy.')
  }

  // Full names
  if (FULL_NAME_PATTERN.test(text)) {
    warnings.push('Looks like you included a full name. For privacy, consider using first name only.')
  }

  // Apartment/suite numbers
  if (LOCATION_DETAIL_PATTERN.test(text)) {
    warnings.push('Avoid including specific apartment or unit numbers for your safety.')
  }

  return warnings
}

/**
 * Check for profanity (warn but don't block)
 *
 * @param text - Text to check
 * @returns Warning message if profanity detected
 */
function checkProfanity(text: string): string | null {
  for (const pattern of PROFANITY_TERMS) {
    if (pattern.test(text)) {
      return 'Your message contains profanity. Consider keeping it friendly.'
    }
  }

  return null
}

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Screen post content for inappropriate content and personal information
 *
 * This function performs comprehensive screening of user-generated post content:
 * - Hard blocks for slurs, hate speech, and threats
 * - Warnings for personal information (phone, email, social handles, names)
 * - Warnings for profanity (but doesn't block)
 *
 * @param text - Post content to screen
 * @returns Screening result with block status, warnings, and reason
 *
 * @example
 * ```tsx
 * const result = screenPostContent('Nice to meet you! Call me at 555-1234')
 *
 * if (result.isBlocked) {
 *   // Show error: result.blockedReason
 *   // Disable submit button
 * } else if (result.warnings.length > 0) {
 *   // Show warnings: result.warnings
 *   // Allow submit but inform user
 * }
 * ```
 */
export function screenPostContent(text: string | null | undefined): ScreeningResult {
  // Handle empty/null input
  if (!text || text.trim().length === 0) {
    return {
      isBlocked: false,
      warnings: [],
      blockedReason: null,
    }
  }

  const trimmedText = text.trim()

  // Check for hard-blocked content first
  const blockCheck = checkBlockedContent(trimmedText)
  if (blockCheck.isBlocked) {
    return {
      isBlocked: true,
      warnings: [],
      blockedReason: blockCheck.reason,
    }
  }

  // Collect warnings
  const warnings: string[] = []

  // Check for personal information
  const personalInfoWarnings = detectPersonalInfo(trimmedText)
  warnings.push(...personalInfoWarnings)

  // Check for profanity
  const profanityWarning = checkProfanity(trimmedText)
  if (profanityWarning) {
    warnings.push(profanityWarning)
  }

  return {
    isBlocked: false,
    warnings,
    blockedReason: null,
  }
}

/**
 * Check if text is safe for submission (not blocked)
 *
 * Convenience function for quick validation.
 *
 * @param text - Text to check
 * @returns true if text is safe (not blocked)
 *
 * @example
 * ```tsx
 * const canSubmit = isContentSafe(note)
 * ```
 */
export function isContentSafe(text: string | null | undefined): boolean {
  const result = screenPostContent(text)
  return !result.isBlocked
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  screenPostContent,
  isContentSafe,
}
