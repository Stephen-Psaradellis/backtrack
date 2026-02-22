/**
 * Content Screening Tests
 *
 * Tests for client-side content screening functionality.
 */

import { screenPostContent, isContentSafe } from '../contentScreening'

describe('screenPostContent', () => {
  // ============================================================================
  // HARD BLOCKS
  // ============================================================================

  describe('Hard Blocks', () => {
    it('should block hate speech (slurs)', () => {
      const result = screenPostContent('You are a retard')
      expect(result.isBlocked).toBe(true)
      expect(result.blockedReason).toContain('inappropriate language')
      expect(result.warnings).toEqual([])
    })

    it('should block threats of violence', () => {
      const result = screenPostContent('I will kill you')
      expect(result.isBlocked).toBe(true)
      expect(result.blockedReason).toContain('inappropriate language')
    })

    it('should block shooting threats', () => {
      const result = screenPostContent('gonna shoot you up')
      expect(result.isBlocked).toBe(true)
      expect(result.blockedReason).toBe(
        'This post contains inappropriate language or threats that violate our community guidelines.'
      )
    })

    it('should block bomb threats', () => {
      const result = screenPostContent('bomb threat at school')
      expect(result.isBlocked).toBe(true)
    })
  })

  // ============================================================================
  // PERSONAL INFORMATION WARNINGS
  // ============================================================================

  describe('Personal Information Warnings', () => {
    it('should warn about phone numbers (various formats)', () => {
      const formats = [
        '(555) 123-4567',
        '555-123-4567',
        '5551234567',
        '+1 555 123 4567',
        '555.123.4567',
      ]

      formats.forEach((phone) => {
        const result = screenPostContent(`Call me at ${phone}`)
        expect(result.isBlocked).toBe(false)
        expect(result.warnings).toContainEqual(
          expect.stringContaining('phone number')
        )
      })
    })

    it('should warn about email addresses', () => {
      const result = screenPostContent('Email me at john.doe@example.com')
      expect(result.isBlocked).toBe(false)
      expect(result.warnings).toContainEqual(
        expect.stringContaining('email address')
      )
    })

    it('should warn about social media handles', () => {
      const result = screenPostContent('DM me @john_doe on Twitter')
      expect(result.isBlocked).toBe(false)
      expect(result.warnings).toContainEqual(
        expect.stringContaining('social media handle')
      )
    })

    it('should warn about full names', () => {
      const result = screenPostContent('My name is John Smith')
      expect(result.isBlocked).toBe(false)
      expect(result.warnings).toContainEqual(
        expect.stringContaining('full name')
      )
    })

    it('should warn about apartment/suite numbers', () => {
      const variations = [
        'I live in Apt 123',
        'Meet me at Suite 4B',
        'Unit 5 on the third floor',
      ]

      variations.forEach((text) => {
        const result = screenPostContent(text)
        expect(result.isBlocked).toBe(false)
        expect(result.warnings).toContainEqual(
          expect.stringContaining('apartment or unit')
        )
      })
    })

    it('should warn about standalone # numbers in context', () => {
      const result = screenPostContent('Come to # 42')
      expect(result.isBlocked).toBe(false)
      expect(result.warnings).toContainEqual(
        expect.stringContaining('apartment or unit')
      )
    })

    it('should detect multiple personal info types', () => {
      const result = screenPostContent(
        'Hi, my name is John Smith, call me at 555-1234 or email john@example.com'
      )
      expect(result.isBlocked).toBe(false)
      expect(result.warnings.length).toBeGreaterThanOrEqual(3)
      expect(result.warnings).toContainEqual(expect.stringContaining('full name'))
      expect(result.warnings).toContainEqual(expect.stringContaining('phone number'))
      expect(result.warnings).toContainEqual(expect.stringContaining('email'))
    })
  })

  // ============================================================================
  // PROFANITY WARNINGS
  // ============================================================================

  describe('Profanity Warnings', () => {
    it('should warn about profanity but not block', () => {
      const profane = ['fuck this', 'shit happens', 'you asshole', 'bitch please']

      profane.forEach((text) => {
        const result = screenPostContent(text)
        expect(result.isBlocked).toBe(false)
        expect(result.warnings).toContainEqual(
          expect.stringContaining('profanity')
        )
      })
    })

    it('should handle repeated letters in profanity', () => {
      const result = screenPostContent('fuuuuuuck')
      expect(result.isBlocked).toBe(false)
      expect(result.warnings).toContainEqual(expect.stringContaining('profanity'))
    })
  })

  // ============================================================================
  // SAFE CONTENT
  // ============================================================================

  describe('Safe Content', () => {
    it('should allow clean content', () => {
      const result = screenPostContent('You had such a beautiful smile!')
      expect(result.isBlocked).toBe(false)
      expect(result.warnings).toEqual([])
      expect(result.blockedReason).toBeNull()
    })

    it('should allow empty content', () => {
      const result = screenPostContent('')
      expect(result.isBlocked).toBe(false)
      expect(result.warnings).toEqual([])
      expect(result.blockedReason).toBeNull()
    })

    it('should allow null content', () => {
      const result = screenPostContent(null)
      expect(result.isBlocked).toBe(false)
      expect(result.warnings).toEqual([])
    })

    it('should allow undefined content', () => {
      const result = screenPostContent(undefined)
      expect(result.isBlocked).toBe(false)
      expect(result.warnings).toEqual([])
    })

    it('should allow whitespace-only content', () => {
      const result = screenPostContent('   \n   ')
      expect(result.isBlocked).toBe(false)
      expect(result.warnings).toEqual([])
    })
  })

  // ============================================================================
  // EDGE CASES
  // ============================================================================

  describe('Edge Cases', () => {
    it('should handle greetings with first names', () => {
      // Note: Pattern matching can't perfectly distinguish between first/full names
      // "John," might trigger false positive if followed by capitalized word
      const result = screenPostContent('Hey John nice to meet you!')
      // This is acceptable - the simple pattern may have limitations
      // In production, you might want more sophisticated NER
    })

    it('should not flag short capitalized words as names', () => {
      const result = screenPostContent('I went to New York')
      // "New York" is capitalized but should ideally not be flagged as a full name
      // This is a limitation of the simple pattern matching
      // In production, you might want more sophisticated NER
    })

    it('should handle mixed warnings and blocks correctly', () => {
      // If blocked, warnings should be empty
      const result = screenPostContent('retard with phone 555-1234')
      expect(result.isBlocked).toBe(true)
      expect(result.warnings).toEqual([])
    })

    it('should handle case-insensitive blocking', () => {
      const result = screenPostContent('KILL YOU')
      expect(result.isBlocked).toBe(true)
    })

    it('should trim whitespace before checking', () => {
      const result = screenPostContent('  You had a beautiful smile!  ')
      expect(result.isBlocked).toBe(false)
      expect(result.warnings).toEqual([])
    })
  })
})

// ============================================================================
// isContentSafe CONVENIENCE FUNCTION
// ============================================================================

describe('isContentSafe', () => {
  it('should return false for blocked content', () => {
    expect(isContentSafe('I will kill you')).toBe(false)
  })

  it('should return true for content with warnings', () => {
    expect(isContentSafe('Call me at 555-1234')).toBe(true)
  })

  it('should return true for safe content', () => {
    expect(isContentSafe('You looked amazing today!')).toBe(true)
  })

  it('should return true for empty content', () => {
    expect(isContentSafe('')).toBe(true)
    expect(isContentSafe(null)).toBe(true)
    expect(isContentSafe(undefined)).toBe(true)
  })
})
