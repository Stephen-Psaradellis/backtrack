/**
 * Tests for text sanitization utilities
 */

import {
  sanitizeForDisplay,
  sanitizeForNotification,
  sanitizeLocationName,
  containsDangerousContent,
} from '../sanitize'

describe('sanitizeForDisplay', () => {
  describe('basic functionality', () => {
    it('returns empty string for null input', () => {
      expect(sanitizeForDisplay(null)).toBe('')
    })

    it('returns empty string for undefined input', () => {
      expect(sanitizeForDisplay(undefined)).toBe('')
    })

    it('returns empty string for empty string input', () => {
      expect(sanitizeForDisplay('')).toBe('')
    })

    it('returns unchanged text for safe input', () => {
      const input = 'Hello, world!'
      expect(sanitizeForDisplay(input)).toBe(input)
    })

    it('preserves newlines in display text', () => {
      const input = 'Line 1\nLine 2'
      expect(sanitizeForDisplay(input)).toBe('Line 1\nLine 2')
    })

    it('collapses multiple newlines to double newline', () => {
      const input = 'Line 1\n\n\n\nLine 2'
      expect(sanitizeForDisplay(input)).toBe('Line 1\n\nLine 2')
    })
  })

  describe('dangerous unicode removal', () => {
    it('removes RTL override character', () => {
      const input = 'Hello\u202Eworld'
      const result = sanitizeForDisplay(input)
      expect(result).not.toContain('\u202E')
      expect(result).toBe('Helloworld')
    })

    it('removes LTR override character', () => {
      const input = 'Hello\u202Dworld'
      const result = sanitizeForDisplay(input)
      expect(result).not.toContain('\u202D')
    })

    it('removes zero-width space', () => {
      const input = 'Hello\u200Bworld'
      const result = sanitizeForDisplay(input)
      expect(result).not.toContain('\u200B')
      expect(result).toBe('Helloworld')
    })

    it('removes zero-width non-joiner', () => {
      const input = 'Hello\u200Cworld'
      const result = sanitizeForDisplay(input)
      expect(result).not.toContain('\u200C')
    })

    it('removes byte order mark', () => {
      const input = '\uFEFFHello world'
      const result = sanitizeForDisplay(input)
      expect(result).not.toContain('\uFEFF')
      expect(result).toBe('Hello world')
    })
  })

  describe('control character removal', () => {
    it('removes null character', () => {
      const input = 'Hello\x00world'
      const result = sanitizeForDisplay(input)
      expect(result).not.toContain('\x00')
      expect(result).toBe('Helloworld')
    })

    it('removes bell character', () => {
      const input = 'Hello\x07world'
      const result = sanitizeForDisplay(input)
      expect(result).not.toContain('\x07')
    })

    it('converts tab to space', () => {
      // Whitespace normalization converts tabs to spaces
      const input = 'Hello\tworld'
      expect(sanitizeForDisplay(input)).toBe('Hello world')
    })

    it('preserves newline character', () => {
      const input = 'Hello\nworld'
      expect(sanitizeForDisplay(input)).toContain('\n')
    })

    it('removes delete character', () => {
      const input = 'Hello\x7Fworld'
      const result = sanitizeForDisplay(input)
      expect(result).not.toContain('\x7F')
    })
  })

  describe('whitespace normalization', () => {
    it('trims leading and trailing whitespace', () => {
      const input = '  Hello world  '
      expect(sanitizeForDisplay(input)).toBe('Hello world')
    })

    it('collapses multiple spaces', () => {
      const input = 'Hello    world'
      expect(sanitizeForDisplay(input)).toBe('Hello world')
    })

    it('handles mixed whitespace', () => {
      const input = 'Hello  \t  world'
      const result = sanitizeForDisplay(input)
      expect(result).not.toMatch(/\s{2,}/)
    })
  })

  describe('length truncation', () => {
    it('does not truncate short text', () => {
      const input = 'Hello'
      expect(sanitizeForDisplay(input, 100)).toBe('Hello')
    })

    it('truncates text exceeding max length', () => {
      const input = 'Hello world, this is a long message'
      const result = sanitizeForDisplay(input, 10)
      expect(result.length).toBe(10)
      expect(result).toBe('Hello wor…')
    })

    it('uses default max length of 10000', () => {
      const longInput = 'a'.repeat(15000)
      const result = sanitizeForDisplay(longInput)
      expect(result.length).toBe(10000)
    })
  })
})

describe('sanitizeForNotification', () => {
  describe('basic functionality', () => {
    it('returns empty string for null input', () => {
      expect(sanitizeForNotification(null)).toBe('')
    })

    it('removes newlines in notification text', () => {
      const input = 'Line 1\nLine 2'
      expect(sanitizeForNotification(input)).toBe('Line 1 Line 2')
    })

    it('uses shorter default max length', () => {
      const longInput = 'a'.repeat(1000)
      const result = sanitizeForNotification(longInput)
      expect(result.length).toBe(500)
    })
  })

  describe('HTML entity escaping', () => {
    it('escapes less than sign', () => {
      const input = '<script>'
      expect(sanitizeForNotification(input)).toBe('&lt;script&gt;')
    })

    it('escapes greater than sign', () => {
      const input = 'a > b'
      expect(sanitizeForNotification(input)).toBe('a &gt; b')
    })

    it('escapes ampersand', () => {
      const input = 'Tom & Jerry'
      expect(sanitizeForNotification(input)).toBe('Tom &amp; Jerry')
    })

    it('escapes double quotes', () => {
      const input = 'He said "hello"'
      expect(sanitizeForNotification(input)).toBe('He said &quot;hello&quot;')
    })

    it('escapes single quotes', () => {
      const input = "It's a test"
      expect(sanitizeForNotification(input)).toBe('It&#x27;s a test')
    })

    it('escapes script injection attempt', () => {
      const input = '<script>alert("XSS")</script>'
      const result = sanitizeForNotification(input)
      expect(result).not.toContain('<script>')
      expect(result).toContain('&lt;script&gt;')
    })
  })

  describe('combined sanitization', () => {
    it('handles complex malicious input', () => {
      const input = '<b>Bold\u202E</b>\nNew line\x00null'
      const result = sanitizeForNotification(input)
      expect(result).not.toContain('<b>')
      expect(result).not.toContain('\u202E')
      expect(result).not.toContain('\n')
      expect(result).not.toContain('\x00')
    })
  })
})

describe('sanitizeLocationName', () => {
  it('returns default for null input', () => {
    expect(sanitizeLocationName(null)).toBe('this location')
  })

  it('returns default for undefined input', () => {
    expect(sanitizeLocationName(undefined)).toBe('this location')
  })

  it('returns default for empty string', () => {
    expect(sanitizeLocationName('')).toBe('this location')
  })

  it('sanitizes location name', () => {
    const input = 'Coffee<Shop>'
    const result = sanitizeLocationName(input)
    expect(result).toBe('Coffee&lt;Shop&gt;')
  })

  it('truncates long location names', () => {
    const input = 'a'.repeat(200)
    const result = sanitizeLocationName(input)
    expect(result.length).toBe(100)
  })

  it('removes dangerous unicode from location name', () => {
    const input = 'Café\u202EBar'
    const result = sanitizeLocationName(input)
    expect(result).not.toContain('\u202E')
  })
})

describe('containsDangerousContent', () => {
  it('returns false for null input', () => {
    expect(containsDangerousContent(null)).toBe(false)
  })

  it('returns false for safe input', () => {
    expect(containsDangerousContent('Hello, world!')).toBe(false)
  })

  it('returns true for RTL override', () => {
    expect(containsDangerousContent('Hello\u202Eworld')).toBe(true)
  })

  it('returns true for zero-width space', () => {
    expect(containsDangerousContent('Hello\u200Bworld')).toBe(true)
  })

  it('returns true for control characters', () => {
    expect(containsDangerousContent('Hello\x00world')).toBe(true)
  })

  it('returns true for script tags', () => {
    expect(containsDangerousContent('<script>alert(1)</script>')).toBe(true)
  })

  it('returns true for javascript: protocol', () => {
    expect(containsDangerousContent('javascript:alert(1)')).toBe(true)
  })

  it('returns true for data: URLs', () => {
    expect(containsDangerousContent('data:text/html,<script>alert(1)</script>')).toBe(true)
  })

  it('is case insensitive for script detection', () => {
    expect(containsDangerousContent('<SCRIPT>alert(1)</SCRIPT>')).toBe(true)
    expect(containsDangerousContent('JAVASCRIPT:alert(1)')).toBe(true)
  })
})
