/**
 * Safety Detection Tests
 *
 * Tests for detecting sensitive personal information in chat messages.
 */

import { detectSensitiveContent, detectors } from '../safetyDetection'

describe('safetyDetection', () => {
  describe('detectSensitiveContent', () => {
    it('should return no detection for normal text', () => {
      const result = detectSensitiveContent('Hey, how are you doing today?')
      expect(result.hasSensitiveContent).toBe(false)
      expect(result.type).toBeNull()
      expect(result.warning).toBe('')
    })

    it('should handle null and undefined input', () => {
      expect(detectSensitiveContent(null).hasSensitiveContent).toBe(false)
      expect(detectSensitiveContent(undefined).hasSensitiveContent).toBe(false)
      expect(detectSensitiveContent('').hasSensitiveContent).toBe(false)
    })

    it('should detect phone numbers in various formats', () => {
      const phoneNumbers = [
        '555-123-4567',
        '(555) 123-4567',
        '555.123.4567',
        '5551234567',
        '+1 555 123 4567',
        'Call me at 555-123-4567',
      ]

      phoneNumbers.forEach((text) => {
        const result = detectSensitiveContent(text)
        expect(result.hasSensitiveContent).toBe(true)
        expect(result.type).toBe('phone')
        expect(result.warning).toContain('phone number')
      })
    })

    it('should not false positive on dates or short numbers', () => {
      const nonPhoneNumbers = ['Meeting on 12-25-2024', 'Room 123', 'Item #456']

      nonPhoneNumbers.forEach((text) => {
        const result = detectSensitiveContent(text)
        // These should NOT be detected as phone numbers
        expect(result.type).not.toBe('phone')
      })
    })

    it('should detect email addresses', () => {
      const emails = [
        'john@example.com',
        'user.name@test.co.uk',
        'Email me at contact@site.org',
        'test+filter@gmail.com',
      ]

      emails.forEach((text) => {
        const result = detectSensitiveContent(text)
        expect(result.hasSensitiveContent).toBe(true)
        expect(result.type).toBe('email')
        expect(result.warning).toContain('email')
      })
    })

    it('should detect physical addresses', () => {
      const addresses = [
        '123 Main Street',
        '456 Oak Avenue, City',
        'Meet me at 789 Park Road',
        '1234 Elm St',
      ]

      addresses.forEach((text) => {
        const result = detectSensitiveContent(text)
        expect(result.hasSensitiveContent).toBe(true)
        expect(result.type).toBe('address')
        expect(result.warning).toContain('address')
      })
    })

    it('should detect social media handles and URLs', () => {
      const socialMedia = [
        '@username',
        'Find me @john_doe',
        'instagram.com/myprofile',
        'twitter.com/handle',
        'facebook.com/user.name',
        'tiktok.com/@creator',
        'snapchat.com/add/username',
      ]

      socialMedia.forEach((text) => {
        const result = detectSensitiveContent(text)
        expect(result.hasSensitiveContent).toBe(true)
        expect(result.type).toBe('social')
        expect(result.warning).toContain('social media')
      })
    })

    it('should prioritize by severity (address > phone > email > social)', () => {
      // Address should be detected first even if phone is also present
      const addressAndPhone = '123 Main St, call me at 555-1234'
      const result1 = detectSensitiveContent(addressAndPhone)
      expect(result1.type).toBe('address')

      // Phone should be detected before social (when no address or email)
      const phoneAndSocial = 'call 555-123-4567, follow @username'
      const result2 = detectSensitiveContent(phoneAndSocial)
      expect(result2.type).toBe('phone')

      // Email should be detected before social
      const emailAndSocial = 'email@test.com or @username'
      const result3 = detectSensitiveContent(emailAndSocial)
      expect(result3.type).toBe('email')
    })
  })

  describe('individual detectors', () => {
    describe('detectPhone', () => {
      it('should detect valid phone numbers', () => {
        expect(detectors.detectPhone('555-123-4567')).toBe(true)
        expect(detectors.detectPhone('+1 (555) 123-4567')).toBe(true)
      })

      it('should reject invalid or too short numbers', () => {
        expect(detectors.detectPhone('123-4567')).toBe(false) // Too short
        expect(detectors.detectPhone('12-34-56')).toBe(false)
      })
    })

    describe('detectEmail', () => {
      it('should detect valid emails', () => {
        expect(detectors.detectEmail('test@example.com')).toBe(true)
        expect(detectors.detectEmail('user+tag@domain.co.uk')).toBe(true)
      })

      it('should not false positive on @ symbols', () => {
        expect(detectors.detectEmail('Meet @ 3pm')).toBe(false)
      })
    })

    describe('detectAddress', () => {
      it('should detect street addresses', () => {
        expect(detectors.detectAddress('123 Main Street')).toBe(true)
        expect(detectors.detectAddress('4567 Oak Ave')).toBe(true)
      })

      it('should not false positive on simple numbers', () => {
        expect(detectors.detectAddress('I have 3 dogs')).toBe(false)
      })
    })

    describe('detectSocialMedia', () => {
      it('should detect @ handles', () => {
        expect(detectors.detectSocialMedia('@username')).toBe(true)
        expect(detectors.detectSocialMedia('DM me @john_doe')).toBe(true)
      })

      it('should detect social media URLs', () => {
        expect(detectors.detectSocialMedia('instagram.com/profile')).toBe(true)
        expect(detectors.detectSocialMedia('twitter.com/handle')).toBe(true)
      })

      it('should not false positive on short @ mentions', () => {
        // @username must be at least 4 characters (3 after @)
        expect(detectors.detectSocialMedia('@ab')).toBe(false)
      })
    })
  })
})
