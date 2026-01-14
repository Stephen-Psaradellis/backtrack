/**
 * Tests for lib/validation.ts
 *
 * Comprehensive tests for input validation and sanitization functions.
 */

import { describe, it, expect } from 'vitest'
import {
  validateEmail,
  validatePassword,
  validatePasswordMatch,
  sanitizeText,
  sanitizeForStorage,
  validateText,
  escapeHtml,
  validateUsername,
  validateUrl,
  validateLatitude,
  validateLongitude,
  validateCoordinates,
  validateUuid,
  CONTENT_LIMITS,
} from '../validation'

// ============================================================================
// EMAIL VALIDATION TESTS
// ============================================================================

describe('validateEmail', () => {
  describe('valid emails', () => {
    it('should accept simple valid email', () => {
      const result = validateEmail('user@example.com')
      expect(result.isValid).toBe(true)
      expect(result.sanitized).toBe('user@example.com')
    })

    it('should accept email with subdomain', () => {
      const result = validateEmail('user@mail.example.com')
      expect(result.isValid).toBe(true)
    })

    it('should accept email with dots in local part', () => {
      const result = validateEmail('first.last@example.com')
      expect(result.isValid).toBe(true)
    })

    it('should accept email with plus sign', () => {
      const result = validateEmail('user+tag@example.com')
      expect(result.isValid).toBe(true)
    })

    it('should accept email with numbers', () => {
      const result = validateEmail('user123@example123.com')
      expect(result.isValid).toBe(true)
    })

    it('should trim whitespace', () => {
      const result = validateEmail('  user@example.com  ')
      expect(result.isValid).toBe(true)
      expect(result.sanitized).toBe('user@example.com')
    })

    it('should lowercase email', () => {
      const result = validateEmail('USER@EXAMPLE.COM')
      expect(result.isValid).toBe(true)
      expect(result.sanitized).toBe('user@example.com')
    })
  })

  describe('invalid emails', () => {
    it('should reject empty email', () => {
      const result = validateEmail('')
      expect(result.isValid).toBe(false)
      expect(result.error).toBe('Email address is required')
    })

    it('should reject whitespace only', () => {
      const result = validateEmail('   ')
      expect(result.isValid).toBe(false)
      expect(result.error).toBe('Email address is required')
    })

    it('should reject email without @', () => {
      const result = validateEmail('userexample.com')
      expect(result.isValid).toBe(false)
      expect(result.error).toBe('Please enter a valid email address')
    })

    it('should reject email without domain', () => {
      const result = validateEmail('user@')
      expect(result.isValid).toBe(false)
    })

    it('should reject email without local part', () => {
      const result = validateEmail('@example.com')
      expect(result.isValid).toBe(false)
    })

    it('should reject email with spaces', () => {
      const result = validateEmail('user name@example.com')
      expect(result.isValid).toBe(false)
    })

    it('should reject email without TLD', () => {
      const result = validateEmail('user@localhost')
      expect(result.isValid).toBe(false)
    })

    it('should reject email with single char TLD', () => {
      const result = validateEmail('user@example.c')
      expect(result.isValid).toBe(false)
    })

    it('should reject extremely long email', () => {
      const longEmail = 'a'.repeat(250) + '@example.com'
      const result = validateEmail(longEmail)
      expect(result.isValid).toBe(false)
      expect(result.error).toBe('Email address is too long')
    })
  })
})

// ============================================================================
// PASSWORD VALIDATION TESTS
// ============================================================================

describe('validatePassword', () => {
  describe('valid passwords', () => {
    it('should accept 8 character password', () => {
      const result = validatePassword('password')
      expect(result.isValid).toBe(true)
    })

    it('should accept strong password', () => {
      const result = validatePassword('MyP@ssw0rd!123')
      expect(result.isValid).toBe(true)
      expect(result.strength).toBe('strong')
    })

    it('should accept long password', () => {
      const result = validatePassword('a'.repeat(100))
      expect(result.isValid).toBe(true)
    })
  })

  describe('invalid passwords', () => {
    it('should reject empty password', () => {
      const result = validatePassword('')
      expect(result.isValid).toBe(false)
      expect(result.error).toBe('Password is required')
    })

    it('should reject password under 8 characters', () => {
      const result = validatePassword('short')
      expect(result.isValid).toBe(false)
      expect(result.error).toBe('Password must be at least 8 characters')
      expect(result.strength).toBe('weak')
    })

    it('should reject password over 128 characters', () => {
      const result = validatePassword('a'.repeat(129))
      expect(result.isValid).toBe(false)
      expect(result.error).toBe('Password must be less than 128 characters')
    })
  })

  describe('password strength', () => {
    it('should return weak for simple password', () => {
      const result = validatePassword('password')
      expect(result.strength).toBe('weak')
      expect(result.suggestions).toBeDefined()
    })

    it('should return fair for medium password', () => {
      const result = validatePassword('Password1')
      expect(result.strength).toBe('fair')
    })

    it('should return good for better password', () => {
      // Password12345678 = 16 chars (len>=8:+1, len>=12:+1, len>=16:+1, lowercase:+1, uppercase:+1, numbers:+1) = 6 = good
      const result = validatePassword('Password12345678')
      expect(result.strength).toBe('good')
    })

    it('should return strong for excellent password', () => {
      const result = validatePassword('MyP@ssw0rd!LongEnough')
      expect(result.strength).toBe('strong')
    })

    it('should provide suggestions for weak passwords', () => {
      const result = validatePassword('aaaaaaaa')
      expect(result.suggestions).toContain('Add uppercase letters')
      expect(result.suggestions).toContain('Add numbers')
      expect(result.suggestions).toContain('Add special characters (e.g., !@#$%)')
    })
  })
})

describe('validatePasswordMatch', () => {
  it('should return valid when passwords match', () => {
    const result = validatePasswordMatch('password123', 'password123')
    expect(result.isValid).toBe(true)
  })

  it('should return invalid when passwords do not match', () => {
    const result = validatePasswordMatch('password123', 'password456')
    expect(result.isValid).toBe(false)
    expect(result.error).toBe('Passwords do not match')
  })

  it('should be case sensitive', () => {
    const result = validatePasswordMatch('Password', 'password')
    expect(result.isValid).toBe(false)
  })
})

// ============================================================================
// TEXT SANITIZATION TESTS
// ============================================================================

describe('sanitizeText', () => {
  it('should return empty string for falsy input', () => {
    expect(sanitizeText('')).toBe('')
    expect(sanitizeText(null as unknown as string)).toBe('')
    expect(sanitizeText(undefined as unknown as string)).toBe('')
  })

  it('should trim whitespace', () => {
    expect(sanitizeText('  hello world  ')).toBe('hello world')
  })

  it('should normalize whitespace', () => {
    expect(sanitizeText('hello    world')).toBe('hello world')
    expect(sanitizeText('hello\n\nworld')).toBe('hello world')
    expect(sanitizeText('hello\t\tworld')).toBe('hello world')
  })

  describe('XSS prevention', () => {
    it('should remove script tags', () => {
      const result = sanitizeText('<script>alert("xss")</script>Hello')
      expect(result).toBe('Hello')
      expect(result).not.toContain('script')
    })

    it('should remove iframe tags', () => {
      const result = sanitizeText('<iframe src="evil.com"></iframe>Content')
      expect(result).toBe('Content')
    })

    it('should remove javascript: URLs', () => {
      const result = sanitizeText('javascript:alert(1)')
      expect(result).not.toContain('javascript:')
    })

    it('should remove onclick handlers', () => {
      const result = sanitizeText('<div onclick="alert(1)">Click</div>')
      expect(result).not.toContain('onclick')
    })

    it('should remove style tags', () => {
      const result = sanitizeText('<style>body{display:none}</style>Hello')
      expect(result).toBe('Hello')
    })

    it('should remove data: URLs for HTML', () => {
      const result = sanitizeText('data: text/html,<script>alert(1)</script>')
      expect(result).not.toContain('data:')
    })
  })

  describe('HTML handling', () => {
    it('should strip HTML tags by default', () => {
      const result = sanitizeText('<p>Hello</p>')
      expect(result).toBe('Hello')
    })

    it('should allow HTML tags when allowHtml is true', () => {
      const result = sanitizeText('<p>Hello</p>', true)
      expect(result).toBe('<p>Hello</p>')
    })

    it('should still remove dangerous patterns even with allowHtml', () => {
      const result = sanitizeText('<script>alert(1)</script><p>Hello</p>', true)
      expect(result).not.toContain('script')
      expect(result).toContain('<p>Hello</p>')
    })
  })
})

describe('sanitizeForStorage', () => {
  it('should sanitize text', () => {
    expect(sanitizeForStorage('  hello  ')).toBe('hello')
  })

  it('should remove SQL injection keywords', () => {
    const result = sanitizeForStorage('SELECT * FROM users')
    expect(result.toLowerCase()).not.toContain('select')
  })

  it('should remove DROP statements', () => {
    const result = sanitizeForStorage('DROP TABLE users')
    expect(result.toLowerCase()).not.toContain('drop')
  })

  it('should preserve text without SQL keywords', () => {
    const result = sanitizeForStorage('Testing123')
    expect(result).toBe('Testing123')
  })
})

describe('escapeHtml', () => {
  it('should escape ampersand', () => {
    expect(escapeHtml('Tom & Jerry')).toBe('Tom &amp; Jerry')
  })

  it('should escape less than', () => {
    expect(escapeHtml('1 < 2')).toBe('1 &lt; 2')
  })

  it('should escape greater than', () => {
    expect(escapeHtml('2 > 1')).toBe('2 &gt; 1')
  })

  it('should escape double quotes', () => {
    expect(escapeHtml('He said "hello"')).toBe('He said &quot;hello&quot;')
  })

  it('should escape single quotes', () => {
    expect(escapeHtml("It's fine")).toBe("It&#039;s fine")
  })

  it('should escape multiple entities', () => {
    expect(escapeHtml('<script>"alert"</script>')).toBe(
      '&lt;script&gt;&quot;alert&quot;&lt;/script&gt;'
    )
  })
})

// ============================================================================
// TEXT VALIDATION TESTS
// ============================================================================

describe('validateText', () => {
  describe('basic validation', () => {
    it('should accept valid text', () => {
      const result = validateText('Hello world')
      expect(result.isValid).toBe(true)
      expect(result.sanitized).toBe('Hello world')
    })

    it('should reject empty text by default', () => {
      const result = validateText('')
      expect(result.isValid).toBe(false)
      expect(result.error).toBe('Field is required')
    })

    it('should accept empty text when allowEmpty is true', () => {
      const result = validateText('', { allowEmpty: true })
      expect(result.isValid).toBe(true)
    })

    it('should use custom field name in errors', () => {
      const result = validateText('', { fieldName: 'Message' })
      expect(result.error).toBe('Message is required')
    })
  })

  describe('length validation', () => {
    it('should reject text below minLength', () => {
      const result = validateText('Hi', { minLength: 5, fieldName: 'Message' })
      expect(result.isValid).toBe(false)
      expect(result.error).toBe('Message must be at least 5 characters')
    })

    it('should reject text above maxLength', () => {
      const result = validateText('Hello World!', { maxLength: 5, fieldName: 'Message' })
      expect(result.isValid).toBe(false)
      expect(result.error).toBe('Message must be less than 5 characters')
    })

    it('should accept text within limits', () => {
      const result = validateText('Hello', { minLength: 3, maxLength: 10 })
      expect(result.isValid).toBe(true)
    })
  })

  describe('URL validation', () => {
    it('should allow URLs by default', () => {
      const result = validateText('Check out https://example.com')
      expect(result.isValid).toBe(true)
    })

    it('should reject URLs when allowUrls is false', () => {
      const result = validateText('Check out https://example.com', {
        allowUrls: false,
        fieldName: 'Message',
      })
      expect(result.isValid).toBe(false)
      expect(result.error).toBe('Message cannot contain URLs')
    })
  })

  describe('pattern validation', () => {
    it('should accept text matching pattern', () => {
      const result = validateText('abc123', { pattern: /^[a-z0-9]+$/ })
      expect(result.isValid).toBe(true)
    })

    it('should reject text not matching pattern', () => {
      const result = validateText('ABC!', {
        pattern: /^[a-z0-9]+$/,
        fieldName: 'Code',
      })
      expect(result.isValid).toBe(false)
      expect(result.error).toBe('Code format is invalid')
    })
  })
})

// ============================================================================
// USERNAME VALIDATION TESTS
// ============================================================================

describe('validateUsername', () => {
  describe('valid usernames', () => {
    it('should accept simple username', () => {
      const result = validateUsername('johndoe')
      expect(result.isValid).toBe(true)
      expect(result.sanitized).toBe('johndoe')
    })

    it('should accept username with numbers', () => {
      const result = validateUsername('john123')
      expect(result.isValid).toBe(true)
    })

    it('should accept username with underscores', () => {
      const result = validateUsername('john_doe')
      expect(result.isValid).toBe(true)
    })

    it('should accept 3 character username', () => {
      const result = validateUsername('abc')
      expect(result.isValid).toBe(true)
    })

    it('should lowercase username', () => {
      const result = validateUsername('JohnDoe')
      expect(result.sanitized).toBe('johndoe')
    })

    it('should trim whitespace', () => {
      const result = validateUsername('  johndoe  ')
      expect(result.sanitized).toBe('johndoe')
    })
  })

  describe('invalid usernames', () => {
    it('should reject empty username', () => {
      const result = validateUsername('')
      expect(result.isValid).toBe(false)
      expect(result.error).toBe('Username is required')
    })

    it('should reject username under 3 characters', () => {
      const result = validateUsername('ab')
      expect(result.isValid).toBe(false)
      expect(result.error).toBe(`Username must be at least ${CONTENT_LIMITS.username.min} characters`)
    })

    it('should reject username over 30 characters', () => {
      const result = validateUsername('a'.repeat(31))
      expect(result.isValid).toBe(false)
      expect(result.error).toBe(`Username must be less than ${CONTENT_LIMITS.username.max} characters`)
    })

    it('should reject username starting with underscore', () => {
      const result = validateUsername('_johndoe')
      expect(result.isValid).toBe(false)
    })

    it('should reject username ending with underscore', () => {
      const result = validateUsername('johndoe_')
      expect(result.isValid).toBe(false)
    })

    it('should reject username with consecutive underscores', () => {
      const result = validateUsername('john__doe')
      expect(result.isValid).toBe(false)
      expect(result.error).toBe('Username cannot contain consecutive underscores')
    })

    it('should reject username with special characters', () => {
      const result = validateUsername('john@doe')
      expect(result.isValid).toBe(false)
    })

    it('should reject username with spaces', () => {
      const result = validateUsername('john doe')
      expect(result.isValid).toBe(false)
    })
  })
})

// ============================================================================
// URL VALIDATION TESTS
// ============================================================================

describe('validateUrl', () => {
  describe('valid URLs', () => {
    it('should accept https URL', () => {
      const result = validateUrl('https://example.com')
      expect(result.isValid).toBe(true)
    })

    it('should accept http URL', () => {
      const result = validateUrl('http://example.com')
      expect(result.isValid).toBe(true)
    })

    it('should accept URL with path', () => {
      const result = validateUrl('https://example.com/path/to/page')
      expect(result.isValid).toBe(true)
    })

    it('should accept URL with query string', () => {
      const result = validateUrl('https://example.com?query=value')
      expect(result.isValid).toBe(true)
    })

    it('should normalize URL', () => {
      const result = validateUrl('  https://example.com  ')
      expect(result.sanitized).toBe('https://example.com/')
    })
  })

  describe('invalid URLs', () => {
    it('should reject empty URL', () => {
      const result = validateUrl('')
      expect(result.isValid).toBe(false)
      expect(result.error).toBe('URL is required')
    })

    it('should reject malformed URL', () => {
      const result = validateUrl('not-a-url')
      expect(result.isValid).toBe(false)
      expect(result.error).toBe('Please enter a valid URL')
    })

    it('should reject javascript: protocol', () => {
      const result = validateUrl('javascript:alert(1)')
      expect(result.isValid).toBe(false)
      expect(result.error).toBe('URL must use http or https protocol')
    })

    it('should reject file: protocol', () => {
      const result = validateUrl('file:///etc/passwd')
      expect(result.isValid).toBe(false)
      expect(result.error).toBe('URL must use http or https protocol')
    })

    it('should reject ftp: protocol', () => {
      const result = validateUrl('ftp://example.com')
      expect(result.isValid).toBe(false)
      expect(result.error).toBe('URL must use http or https protocol')
    })
  })
})

// ============================================================================
// COORDINATE VALIDATION TESTS
// ============================================================================

describe('validateLatitude', () => {
  it('should accept valid latitude', () => {
    expect(validateLatitude(0).isValid).toBe(true)
    expect(validateLatitude(90).isValid).toBe(true)
    expect(validateLatitude(-90).isValid).toBe(true)
    expect(validateLatitude(45.5).isValid).toBe(true)
  })

  it('should reject latitude below -90', () => {
    const result = validateLatitude(-91)
    expect(result.isValid).toBe(false)
    expect(result.error).toBe('Latitude must be between -90 and 90')
  })

  it('should reject latitude above 90', () => {
    const result = validateLatitude(91)
    expect(result.isValid).toBe(false)
    expect(result.error).toBe('Latitude must be between -90 and 90')
  })

  it('should reject non-number', () => {
    const result = validateLatitude('45' as unknown as number)
    expect(result.isValid).toBe(false)
    expect(result.error).toBe('Latitude must be a number')
  })

  it('should reject NaN', () => {
    const result = validateLatitude(NaN)
    expect(result.isValid).toBe(false)
    expect(result.error).toBe('Latitude must be a number')
  })
})

describe('validateLongitude', () => {
  it('should accept valid longitude', () => {
    expect(validateLongitude(0).isValid).toBe(true)
    expect(validateLongitude(180).isValid).toBe(true)
    expect(validateLongitude(-180).isValid).toBe(true)
    expect(validateLongitude(-73.9857).isValid).toBe(true)
  })

  it('should reject longitude below -180', () => {
    const result = validateLongitude(-181)
    expect(result.isValid).toBe(false)
    expect(result.error).toBe('Longitude must be between -180 and 180')
  })

  it('should reject longitude above 180', () => {
    const result = validateLongitude(181)
    expect(result.isValid).toBe(false)
    expect(result.error).toBe('Longitude must be between -180 and 180')
  })

  it('should reject non-number', () => {
    const result = validateLongitude('45' as unknown as number)
    expect(result.isValid).toBe(false)
    expect(result.error).toBe('Longitude must be a number')
  })

  it('should reject NaN', () => {
    const result = validateLongitude(NaN)
    expect(result.isValid).toBe(false)
    expect(result.error).toBe('Longitude must be a number')
  })
})

describe('validateCoordinates', () => {
  it('should accept valid coordinates', () => {
    const result = validateCoordinates(40.7128, -74.006)
    expect(result.isValid).toBe(true)
  })

  it('should return latitude error for invalid latitude', () => {
    const result = validateCoordinates(91, -74.006)
    expect(result.isValid).toBe(false)
    expect(result.error).toBe('Latitude must be between -90 and 90')
  })

  it('should return longitude error for invalid longitude', () => {
    const result = validateCoordinates(40.7128, 181)
    expect(result.isValid).toBe(false)
    expect(result.error).toBe('Longitude must be between -180 and 180')
  })

  it('should check latitude before longitude', () => {
    const result = validateCoordinates(91, 181)
    expect(result.error).toBe('Latitude must be between -90 and 90')
  })
})

// ============================================================================
// UUID VALIDATION TESTS
// ============================================================================

describe('validateUuid', () => {
  describe('valid UUIDs', () => {
    it('should accept valid UUID v4', () => {
      const result = validateUuid('550e8400-e29b-41d4-a716-446655440000')
      expect(result.isValid).toBe(true)
    })

    it('should accept uppercase UUID', () => {
      const result = validateUuid('550E8400-E29B-41D4-A716-446655440000')
      expect(result.isValid).toBe(true)
      expect(result.sanitized).toBe('550e8400-e29b-41d4-a716-446655440000')
    })

    it('should trim whitespace', () => {
      const result = validateUuid('  550e8400-e29b-41d4-a716-446655440000  ')
      expect(result.isValid).toBe(true)
    })
  })

  describe('invalid UUIDs', () => {
    it('should reject empty UUID', () => {
      const result = validateUuid('')
      expect(result.isValid).toBe(false)
      expect(result.error).toBe('ID is required')
    })

    it('should reject malformed UUID', () => {
      const result = validateUuid('not-a-uuid')
      expect(result.isValid).toBe(false)
      expect(result.error).toBe('Invalid ID format')
    })

    it('should reject UUID without dashes', () => {
      const result = validateUuid('550e8400e29b41d4a716446655440000')
      expect(result.isValid).toBe(false)
    })

    it('should reject UUID with wrong version', () => {
      // UUID v1 (version 1 has 1xxx in 3rd group)
      const result = validateUuid('550e8400-e29b-11d4-a716-446655440000')
      expect(result.isValid).toBe(false)
    })

    it('should reject UUID with wrong variant', () => {
      // Wrong variant (should be 8, 9, a, or b)
      const result = validateUuid('550e8400-e29b-41d4-c716-446655440000')
      expect(result.isValid).toBe(false)
    })
  })
})

// ============================================================================
// CONTENT LIMITS TESTS
// ============================================================================

describe('CONTENT_LIMITS', () => {
  it('should have correct username limits', () => {
    expect(CONTENT_LIMITS.username.min).toBe(3)
    expect(CONTENT_LIMITS.username.max).toBe(30)
  })

  it('should have correct post message limits', () => {
    expect(CONTENT_LIMITS.postMessage.min).toBe(1)
    expect(CONTENT_LIMITS.postMessage.max).toBe(500)
  })

  it('should have correct chat message limits', () => {
    expect(CONTENT_LIMITS.chatMessage.min).toBe(1)
    expect(CONTENT_LIMITS.chatMessage.max).toBe(1000)
  })

  it('should have correct bio limits', () => {
    expect(CONTENT_LIMITS.bio.min).toBe(0)
    expect(CONTENT_LIMITS.bio.max).toBe(300)
  })

  it('should have correct report description limits', () => {
    expect(CONTENT_LIMITS.reportDescription.min).toBe(10)
    expect(CONTENT_LIMITS.reportDescription.max).toBe(500)
  })
})
