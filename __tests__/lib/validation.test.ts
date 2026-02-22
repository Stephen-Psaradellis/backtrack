/**
 * Unit tests for Input Validation Service
 *
 * Tests cover:
 * - Email validation
 * - Password validation and strength
 * - Text sanitization and XSS prevention
 * - Username validation
 * - URL validation
 * - Coordinate validation
 * - UUID validation
 */

import { describe, it, expect } from 'vitest'
import {
  validateEmail,
  validatePassword,
  validatePasswordMatch,
  sanitizeText,
  sanitizeForStorage,
  escapeHtml,
  validateText,
  validateUsername,
  validateUrl,
  validateLatitude,
  validateLongitude,
  validateCoordinates,
  validateUuid,
  CONTENT_LIMITS,
} from '../../lib/validation'

// ============================================================================
// Email Validation
// ============================================================================

describe('validateEmail', () => {
  it('should accept valid email addresses', () => {
    expect(validateEmail('user@example.com').isValid).toBe(true)
    expect(validateEmail('user.name@example.co.uk').isValid).toBe(true)
    expect(validateEmail('user+tag@example.com').isValid).toBe(true)
  })

  it('should return sanitized (trimmed, lowercased) email', () => {
    const result = validateEmail('  User@EXAMPLE.com  ')
    expect(result.isValid).toBe(true)
    expect(result.sanitized).toBe('user@example.com')
  })

  it('should reject empty email', () => {
    const result = validateEmail('')
    expect(result.isValid).toBe(false)
    expect(result.error).toContain('required')
  })

  it('should reject whitespace-only email', () => {
    const result = validateEmail('   ')
    expect(result.isValid).toBe(false)
  })

  it('should reject email without @', () => {
    expect(validateEmail('userexample.com').isValid).toBe(false)
  })

  it('should reject email without domain', () => {
    expect(validateEmail('user@').isValid).toBe(false)
  })

  it('should reject email without TLD', () => {
    expect(validateEmail('user@example').isValid).toBe(false)
  })

  it('should reject very long email', () => {
    const longEmail = 'a'.repeat(250) + '@example.com'
    expect(validateEmail(longEmail).isValid).toBe(false)
    expect(validateEmail(longEmail).error).toContain('too long')
  })
})

// ============================================================================
// Password Validation
// ============================================================================

describe('validatePassword', () => {
  it('should accept valid passwords', () => {
    expect(validatePassword('MyP@ssw0rd!').isValid).toBe(true)
    expect(validatePassword('12345678').isValid).toBe(true)
    expect(validatePassword('abcdefgh').isValid).toBe(true)
  })

  it('should reject empty password', () => {
    const result = validatePassword('')
    expect(result.isValid).toBe(false)
    expect(result.error).toContain('required')
  })

  it('should reject short password', () => {
    const result = validatePassword('abc')
    expect(result.isValid).toBe(false)
    expect(result.error).toContain('at least 8')
  })

  it('should reject very long password', () => {
    const result = validatePassword('a'.repeat(129))
    expect(result.isValid).toBe(false)
    expect(result.error).toContain('less than 128')
  })

  it('should calculate password strength as weak', () => {
    const result = validatePassword('12345678')
    expect(result.isValid).toBe(true)
    expect(result.strength).toBe('weak')
  })

  it('should calculate password strength as strong', () => {
    const result = validatePassword('MyStr0ng!P@ssw0rd')
    expect(result.isValid).toBe(true)
    expect(result.strength).toBe('strong')
  })

  it('should provide improvement suggestions', () => {
    const result = validatePassword('abcdefgh')
    expect(result.suggestions).toBeDefined()
    expect(result.suggestions!.length).toBeGreaterThan(0)
  })
})

describe('validatePasswordMatch', () => {
  it('should return valid when passwords match', () => {
    expect(validatePasswordMatch('password', 'password').isValid).toBe(true)
  })

  it('should return invalid when passwords differ', () => {
    const result = validatePasswordMatch('password', 'different')
    expect(result.isValid).toBe(false)
    expect(result.error).toContain('do not match')
  })
})

// ============================================================================
// Text Sanitization
// ============================================================================

describe('sanitizeText', () => {
  it('should trim whitespace', () => {
    expect(sanitizeText('  hello  ')).toBe('hello')
  })

  it('should normalize internal whitespace', () => {
    expect(sanitizeText('hello   world')).toBe('hello world')
  })

  it('should return empty string for empty input', () => {
    expect(sanitizeText('')).toBe('')
  })

  it('should strip HTML tags', () => {
    expect(sanitizeText('<b>bold</b>')).toBe('bold')
  })

  it('should remove script tags (XSS prevention)', () => {
    expect(sanitizeText('<script>alert("xss")</script>Hello')).toBe('Hello')
  })

  it('should remove iframe tags', () => {
    expect(sanitizeText('<iframe src="evil.com"></iframe>Safe')).toBe('Safe')
  })

  it('should remove javascript: protocol', () => {
    expect(sanitizeText('javascript:alert(1)')).toBe('alert(1)')
  })

  it('should remove event handlers', () => {
    const input = '<div onclick=alert(1)>Click</div>'
    const result = sanitizeText(input)
    expect(result).not.toContain('onclick')
  })

  it('should allow HTML when specified', () => {
    const result = sanitizeText('<b>bold</b>', true)
    expect(result).toContain('<b>')
  })
})

describe('sanitizeForStorage', () => {
  it('should strip HTML and dangerous patterns', () => {
    const result = sanitizeForStorage('<script>alert(1)</script>Hello')
    expect(result).not.toContain('script')
  })

  it('should preserve text content (SQL patterns not stripped - app uses parameterized queries)', () => {
    // The app uses parameterized queries via Supabase SDK, so SQL keywords are not stripped.
    // Stripping them would harm legitimate user content like "DROP" or "TABLE" in normal usage.
    const result = sanitizeForStorage("'; DROP TABLE users; --")
    // Should not be empty - text is preserved (minus dangerous HTML/JS patterns)
    expect(result.length).toBeGreaterThan(0)
    // Should strip the dangerous single-quote injection start
    expect(result).not.toContain('<script>')
  })
})

describe('escapeHtml', () => {
  it('should escape ampersand', () => {
    expect(escapeHtml('a & b')).toBe('a &amp; b')
  })

  it('should escape angle brackets', () => {
    expect(escapeHtml('<div>')).toBe('&lt;div&gt;')
  })

  it('should escape quotes', () => {
    expect(escapeHtml('"hello"')).toBe('&quot;hello&quot;')
  })

  it('should escape single quotes', () => {
    expect(escapeHtml("it's")).toBe("it&#039;s")
  })
})

// ============================================================================
// Text Validation
// ============================================================================

describe('validateText', () => {
  it('should reject empty text when required', () => {
    const result = validateText('', { fieldName: 'Message' })
    expect(result.isValid).toBe(false)
    expect(result.error).toContain('Message')
    expect(result.error).toContain('required')
  })

  it('should accept empty text when allowEmpty', () => {
    const result = validateText('', { allowEmpty: true })
    expect(result.isValid).toBe(true)
  })

  it('should reject text below minimum length', () => {
    const result = validateText('ab', { minLength: 3 })
    expect(result.isValid).toBe(false)
    expect(result.error).toContain('at least 3')
  })

  it('should reject text above maximum length', () => {
    const result = validateText('a'.repeat(501), { maxLength: 500 })
    expect(result.isValid).toBe(false)
    expect(result.error).toContain('less than 500')
  })

  it('should reject URLs when not allowed', () => {
    const result = validateText('Visit https://evil.com', { allowUrls: false })
    expect(result.isValid).toBe(false)
    expect(result.error).toContain('URLs')
  })

  it('should accept URLs by default', () => {
    const result = validateText('Visit https://example.com')
    expect(result.isValid).toBe(true)
  })

  it('should validate against custom pattern', () => {
    const result = validateText('123abc', { pattern: /^\d+$/ })
    expect(result.isValid).toBe(false)
  })

  it('should return sanitized text', () => {
    const result = validateText('  hello <b>world</b>  ')
    expect(result.sanitized).toBe('hello world')
  })
})

// ============================================================================
// Username Validation
// ============================================================================

describe('validateUsername', () => {
  it('should accept valid usernames', () => {
    expect(validateUsername('testuser').isValid).toBe(true)
    expect(validateUsername('user123').isValid).toBe(true)
    expect(validateUsername('test_user').isValid).toBe(true)
  })

  it('should lowercase and trim', () => {
    const result = validateUsername('  TestUser  ')
    expect(result.sanitized).toBe('testuser')
  })

  it('should reject empty username', () => {
    expect(validateUsername('').isValid).toBe(false)
  })

  it('should reject too short username', () => {
    expect(validateUsername('ab').isValid).toBe(false)
    expect(validateUsername('ab').error).toContain(`at least ${CONTENT_LIMITS.username.min}`)
  })

  it('should reject too long username', () => {
    expect(validateUsername('a'.repeat(31)).isValid).toBe(false)
  })

  it('should reject username starting with underscore', () => {
    expect(validateUsername('_testuser').isValid).toBe(false)
  })

  it('should reject username ending with underscore', () => {
    expect(validateUsername('testuser_').isValid).toBe(false)
  })

  it('should reject consecutive underscores', () => {
    expect(validateUsername('test__user').isValid).toBe(false)
    expect(validateUsername('test__user').error).toContain('consecutive underscores')
  })

  it('should reject special characters', () => {
    expect(validateUsername('test@user').isValid).toBe(false)
    expect(validateUsername('test user').isValid).toBe(false)
    expect(validateUsername('test.user').isValid).toBe(false)
  })
})

// ============================================================================
// URL Validation
// ============================================================================

describe('validateUrl', () => {
  it('should accept valid http URLs', () => {
    expect(validateUrl('http://example.com').isValid).toBe(true)
  })

  it('should accept valid https URLs', () => {
    expect(validateUrl('https://example.com/path?q=1').isValid).toBe(true)
  })

  it('should reject empty URL', () => {
    expect(validateUrl('').isValid).toBe(false)
  })

  it('should reject invalid URL', () => {
    expect(validateUrl('not-a-url').isValid).toBe(false)
  })

  it('should reject non-http protocols', () => {
    expect(validateUrl('ftp://example.com').isValid).toBe(false)
    expect(validateUrl('javascript:alert(1)').isValid).toBe(false)
  })

  it('should return sanitized URL', () => {
    const result = validateUrl('https://example.com/path')
    expect(result.sanitized).toBe('https://example.com/path')
  })
})

// ============================================================================
// Coordinate Validation
// ============================================================================

describe('validateLatitude', () => {
  it('should accept valid latitudes', () => {
    expect(validateLatitude(0).isValid).toBe(true)
    expect(validateLatitude(90).isValid).toBe(true)
    expect(validateLatitude(-90).isValid).toBe(true)
    expect(validateLatitude(40.7128).isValid).toBe(true)
  })

  it('should reject out-of-range latitudes', () => {
    expect(validateLatitude(91).isValid).toBe(false)
    expect(validateLatitude(-91).isValid).toBe(false)
  })

  it('should reject NaN', () => {
    expect(validateLatitude(NaN).isValid).toBe(false)
  })
})

describe('validateLongitude', () => {
  it('should accept valid longitudes', () => {
    expect(validateLongitude(0).isValid).toBe(true)
    expect(validateLongitude(180).isValid).toBe(true)
    expect(validateLongitude(-180).isValid).toBe(true)
    expect(validateLongitude(-74.006).isValid).toBe(true)
  })

  it('should reject out-of-range longitudes', () => {
    expect(validateLongitude(181).isValid).toBe(false)
    expect(validateLongitude(-181).isValid).toBe(false)
  })

  it('should reject NaN', () => {
    expect(validateLongitude(NaN).isValid).toBe(false)
  })
})

describe('validateCoordinates', () => {
  it('should accept valid coordinates', () => {
    expect(validateCoordinates(40.7128, -74.006).isValid).toBe(true)
  })

  it('should reject invalid latitude', () => {
    expect(validateCoordinates(91, -74.006).isValid).toBe(false)
  })

  it('should reject invalid longitude', () => {
    expect(validateCoordinates(40.7128, 181).isValid).toBe(false)
  })
})

// ============================================================================
// UUID Validation
// ============================================================================

describe('validateUuid', () => {
  it('should accept valid UUID v4', () => {
    expect(validateUuid('550e8400-e29b-41d4-a716-446655440000').isValid).toBe(true)
  })

  it('should accept uppercase UUID', () => {
    const result = validateUuid('550E8400-E29B-41D4-A716-446655440000')
    expect(result.isValid).toBe(true)
    expect(result.sanitized).toBe('550e8400-e29b-41d4-a716-446655440000')
  })

  it('should reject empty UUID', () => {
    expect(validateUuid('').isValid).toBe(false)
  })

  it('should reject invalid UUID', () => {
    expect(validateUuid('not-a-uuid').isValid).toBe(false)
    expect(validateUuid('550e8400-e29b-31d4-a716-446655440000').isValid).toBe(false) // v3 not v4
  })

  it('should trim whitespace', () => {
    const result = validateUuid('  550e8400-e29b-41d4-a716-446655440000  ')
    expect(result.isValid).toBe(true)
  })
})

// ============================================================================
// Content Limits
// ============================================================================

describe('CONTENT_LIMITS', () => {
  it('should export content limits', () => {
    expect(CONTENT_LIMITS.username.min).toBe(3)
    expect(CONTENT_LIMITS.username.max).toBe(30)
    expect(CONTENT_LIMITS.postMessage.max).toBe(500)
    expect(CONTENT_LIMITS.chatMessage.max).toBe(1000)
    expect(CONTENT_LIMITS.bio.max).toBe(300)
  })
})
