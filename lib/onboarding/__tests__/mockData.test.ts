/**
 * Tests for lib/onboarding/mockData.ts
 *
 * Tests demo data constants and helper functions for onboarding screens.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  DEMO_AVATAR_IDS,
  DEMO_LOCATIONS,
  PRODUCER_DEMO_POST,
  PRODUCER_DEMO_POSTS_ALT,
  CONSUMER_DEMO_POSTS,
  CONSUMER_DEMO_POSTS_EXTENDED,
  DEMO_MESSAGES,
  getRandomAvatarId,
  getRandomDemoLocation,
  getRandomMessage,
  formatTimeAgo,
  createMockConsumerPost,
  createMockProducerPost,
  type DemoAvatarId,
  type DemoLocation,
  type DemoProducerPost,
  type DemoConsumerPost,
} from '../mockData'

describe('Constants', () => {
  describe('DEMO_AVATAR_IDS', () => {
    it('should have 6 avatar preset IDs', () => {
      expect(DEMO_AVATAR_IDS).toHaveLength(6)
    })

    it('should contain expected avatar IDs', () => {
      expect(DEMO_AVATAR_IDS).toContain('avatar_asian_m')
      expect(DEMO_AVATAR_IDS).toContain('avatar_asian_f')
      expect(DEMO_AVATAR_IDS).toContain('avatar_black_m')
      expect(DEMO_AVATAR_IDS).toContain('avatar_white_f')
      expect(DEMO_AVATAR_IDS).toContain('avatar_hispanic_m')
      expect(DEMO_AVATAR_IDS).toContain('avatar_mena_f')
    })
  })

  describe('DEMO_LOCATIONS', () => {
    it('should have 8 demo locations', () => {
      expect(DEMO_LOCATIONS).toHaveLength(8)
    })

    it('should have valid location types', () => {
      const validTypes = ['coffee', 'library', 'park', 'bookstore', 'gym', 'grocery', 'transit']
      DEMO_LOCATIONS.forEach(location => {
        expect(validTypes).toContain(location.type)
      })
    })

    it('should have icons for all locations', () => {
      DEMO_LOCATIONS.forEach(location => {
        expect(location.icon).toBeDefined()
        expect(location.icon.length).toBeGreaterThan(0)
      })
    })

    it('should have names for all locations', () => {
      DEMO_LOCATIONS.forEach(location => {
        expect(location.name).toBeDefined()
        expect(location.name.length).toBeGreaterThan(0)
      })
    })
  })

  describe('PRODUCER_DEMO_POST', () => {
    it('should have required fields', () => {
      expect(PRODUCER_DEMO_POST.targetAvatarId).toBeDefined()
      expect(PRODUCER_DEMO_POST.message).toBeDefined()
      expect(PRODUCER_DEMO_POST.location).toBeDefined()
      expect(PRODUCER_DEMO_POST.timeAgo).toBeDefined()
    })

    it('should have valid avatar ID', () => {
      expect(DEMO_AVATAR_IDS).toContain(PRODUCER_DEMO_POST.targetAvatarId)
    })

    it('should have a meaningful message', () => {
      expect(PRODUCER_DEMO_POST.message.length).toBeGreaterThan(20)
    })
  })

  describe('PRODUCER_DEMO_POSTS_ALT', () => {
    it('should have 3 alternative posts', () => {
      expect(PRODUCER_DEMO_POSTS_ALT).toHaveLength(3)
    })

    it('should have valid avatar IDs', () => {
      PRODUCER_DEMO_POSTS_ALT.forEach(post => {
        expect(DEMO_AVATAR_IDS).toContain(post.targetAvatarId)
      })
    })
  })

  describe('CONSUMER_DEMO_POSTS', () => {
    it('should have 2 consumer posts', () => {
      expect(CONSUMER_DEMO_POSTS).toHaveLength(2)
    })

    it('should have unique IDs', () => {
      const ids = CONSUMER_DEMO_POSTS.map(p => p.id)
      const uniqueIds = new Set(ids)
      expect(uniqueIds.size).toBe(ids.length)
    })

    it('should have valid poster avatar IDs', () => {
      CONSUMER_DEMO_POSTS.forEach(post => {
        expect(DEMO_AVATAR_IDS).toContain(post.posterAvatarId)
      })
    })

    it('should have match scores', () => {
      CONSUMER_DEMO_POSTS.forEach(post => {
        expect(post.matchScore).toBeDefined()
        expect(post.matchScore).toBeGreaterThanOrEqual(0)
        expect(post.matchScore).toBeLessThanOrEqual(100)
      })
    })
  })

  describe('CONSUMER_DEMO_POSTS_EXTENDED', () => {
    it('should have 5 extended posts', () => {
      expect(CONSUMER_DEMO_POSTS_EXTENDED).toHaveLength(5)
    })

    it('should include all base posts', () => {
      CONSUMER_DEMO_POSTS.forEach(basePost => {
        const found = CONSUMER_DEMO_POSTS_EXTENDED.find(p => p.id === basePost.id)
        expect(found).toBeDefined()
      })
    })
  })

  describe('DEMO_MESSAGES', () => {
    it('should have all message categories', () => {
      expect(DEMO_MESSAGES.coffeeShop).toBeDefined()
      expect(DEMO_MESSAGES.bookish).toBeDefined()
      expect(DEMO_MESSAGES.outdoor).toBeDefined()
      expect(DEMO_MESSAGES.transit).toBeDefined()
      expect(DEMO_MESSAGES.fitness).toBeDefined()
      expect(DEMO_MESSAGES.general).toBeDefined()
    })

    it('should have non-empty arrays for each category', () => {
      Object.values(DEMO_MESSAGES).forEach(messages => {
        expect(messages.length).toBeGreaterThan(0)
      })
    })

    it('should have meaningful messages', () => {
      Object.values(DEMO_MESSAGES).forEach(messages => {
        messages.forEach(message => {
          expect(message.length).toBeGreaterThan(10)
        })
      })
    })
  })
})

describe('getRandomAvatarId', () => {
  it('should return a valid avatar ID', () => {
    const result = getRandomAvatarId()
    expect(DEMO_AVATAR_IDS).toContain(result)
  })

  it('should return different values over multiple calls', () => {
    // Run multiple times to ensure randomness works
    const results = new Set<DemoAvatarId>()
    for (let i = 0; i < 100; i++) {
      results.add(getRandomAvatarId())
    }
    // Should have gotten at least 2 different results in 100 tries
    expect(results.size).toBeGreaterThan(1)
  })
})

describe('getRandomDemoLocation', () => {
  it('should return a valid location', () => {
    const result = getRandomDemoLocation()
    expect(result.name).toBeDefined()
    expect(result.type).toBeDefined()
    expect(result.icon).toBeDefined()
  })

  it('should return one of the predefined locations', () => {
    const result = getRandomDemoLocation()
    const found = DEMO_LOCATIONS.find(loc => loc.name === result.name)
    expect(found).toBeDefined()
  })

  it('should return different values over multiple calls', () => {
    const results = new Set<string>()
    for (let i = 0; i < 100; i++) {
      results.add(getRandomDemoLocation().name)
    }
    // Should have gotten at least 2 different results in 100 tries
    expect(results.size).toBeGreaterThan(1)
  })
})

describe('getRandomMessage', () => {
  it('should return a message from coffeeShop category', () => {
    const result = getRandomMessage('coffeeShop')
    expect(DEMO_MESSAGES.coffeeShop).toContain(result)
  })

  it('should return a message from bookish category', () => {
    const result = getRandomMessage('bookish')
    expect(DEMO_MESSAGES.bookish).toContain(result)
  })

  it('should return a message from outdoor category', () => {
    const result = getRandomMessage('outdoor')
    expect(DEMO_MESSAGES.outdoor).toContain(result)
  })

  it('should return a message from transit category', () => {
    const result = getRandomMessage('transit')
    expect(DEMO_MESSAGES.transit).toContain(result)
  })

  it('should return a message from fitness category', () => {
    const result = getRandomMessage('fitness')
    expect(DEMO_MESSAGES.fitness).toContain(result)
  })

  it('should return a message from general category', () => {
    const result = getRandomMessage('general')
    expect(DEMO_MESSAGES.general).toContain(result)
  })
})

describe('formatTimeAgo', () => {
  it('should return "Just now" for 0 hours', () => {
    expect(formatTimeAgo(0)).toBe('Just now')
  })

  it('should return "Less than an hour ago" for less than 1 hour', () => {
    expect(formatTimeAgo(0.5)).toBe('Less than an hour ago')
  })

  it('should return "1 hour ago" for 1 hour', () => {
    expect(formatTimeAgo(1)).toBe('1 hour ago')
  })

  it('should return "X hours ago" for 2-23 hours', () => {
    expect(formatTimeAgo(2)).toBe('2 hours ago')
    expect(formatTimeAgo(5)).toBe('5 hours ago')
    expect(formatTimeAgo(12)).toBe('12 hours ago')
    expect(formatTimeAgo(23)).toBe('23 hours ago')
  })

  it('should return "1 day ago" for 24 hours', () => {
    expect(formatTimeAgo(24)).toBe('1 day ago')
  })

  it('should return "X days ago" for 2-6 days', () => {
    expect(formatTimeAgo(48)).toBe('2 days ago')
    expect(formatTimeAgo(72)).toBe('3 days ago')
    expect(formatTimeAgo(144)).toBe('6 days ago')
  })

  it('should return "1 week ago" for 7 days', () => {
    expect(formatTimeAgo(168)).toBe('1 week ago')
  })

  it('should return "X weeks ago" for more than 1 week', () => {
    expect(formatTimeAgo(336)).toBe('2 weeks ago')
    expect(formatTimeAgo(504)).toBe('3 weeks ago')
  })
})

describe('createMockConsumerPost', () => {
  it('should create a post with provided ID', () => {
    const result = createMockConsumerPost({ id: 'test-id' })
    expect(result.id).toBe('test-id')
  })

  it('should use default values when not provided', () => {
    const result = createMockConsumerPost({ id: 'test-id' })

    expect(DEMO_AVATAR_IDS).toContain(result.posterAvatarId)
    expect(result.message.length).toBeGreaterThan(0)
    expect(result.location.length).toBeGreaterThan(0)
    expect(result.timeAgo).toBe('1 hour ago')
  })

  it('should use provided values', () => {
    const result = createMockConsumerPost({
      id: 'test-id',
      posterAvatarId: 'avatar_asian_m',
      message: 'Custom message',
      location: 'Custom location',
      timeAgo: '3 hours ago',
      matchScore: 75,
    })

    expect(result.posterAvatarId).toBe('avatar_asian_m')
    expect(result.message).toBe('Custom message')
    expect(result.location).toBe('Custom location')
    expect(result.timeAgo).toBe('3 hours ago')
    expect(result.matchScore).toBe(75)
  })

  it('should allow undefined matchScore', () => {
    const result = createMockConsumerPost({ id: 'test-id' })
    // matchScore is optional and should be undefined if not provided
    expect(result.matchScore).toBeUndefined()
  })
})

describe('createMockProducerPost', () => {
  it('should create a post with default values', () => {
    const result = createMockProducerPost()

    expect(DEMO_AVATAR_IDS).toContain(result.targetAvatarId)
    expect(result.message.length).toBeGreaterThan(0)
    expect(result.location.length).toBeGreaterThan(0)
    expect(result.timeAgo).toBe('Just now')
  })

  it('should use provided values', () => {
    const result = createMockProducerPost({
      targetAvatarId: 'avatar_black_m',
      message: 'Custom producer message',
      location: 'Custom producer location',
      timeAgo: '5 minutes ago',
    })

    expect(result.targetAvatarId).toBe('avatar_black_m')
    expect(result.message).toBe('Custom producer message')
    expect(result.location).toBe('Custom producer location')
    expect(result.timeAgo).toBe('5 minutes ago')
  })

  it('should allow partial options', () => {
    const result = createMockProducerPost({
      targetAvatarId: 'avatar_mena_f',
    })

    expect(result.targetAvatarId).toBe('avatar_mena_f')
    expect(result.message.length).toBeGreaterThan(0) // Default message
    expect(result.location.length).toBeGreaterThan(0) // Default location
  })

  it('should handle undefined options', () => {
    const result = createMockProducerPost(undefined)

    expect(result.targetAvatarId).toBeDefined()
    expect(result.message).toBeDefined()
    expect(result.location).toBeDefined()
    expect(result.timeAgo).toBe('Just now')
  })
})
