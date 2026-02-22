/**
 * Factories Test
 *
 * Smoke tests to verify all factory functions work correctly.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  generateTestUUID,
  resetUUIDCounter,
  getCurrentTimestamp,
  getTimestampOffset,
  createMockProfile,
  createMockConversation,
  createMockMessage,
  createMockLocation,
  createMockPost,
  createMockCheckin,
  createMockAvatar,
} from './factories'

describe('Test Factories', () => {
  beforeEach(() => {
    resetUUIDCounter()
  })

  describe('UUID generation', () => {
    it('should generate deterministic UUIDs', () => {
      const uuid1 = generateTestUUID()
      const uuid2 = generateTestUUID()

      expect(uuid1).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4000-8000-000000000001$/)
      expect(uuid1).not.toBe(uuid2)
    })

    it('should reset counter', () => {
      const uuid1 = generateTestUUID()
      resetUUIDCounter()
      const uuid2 = generateTestUUID()

      expect(uuid1).toBe(uuid2)
    })
  })

  describe('Timestamp utilities', () => {
    it('should generate current timestamp', () => {
      const timestamp = getCurrentTimestamp()
      expect(timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
    })

    it('should generate future timestamp', () => {
      const future = getTimestampOffset(1)
      const now = new Date()
      const futureDate = new Date(future)

      expect(futureDate.getTime()).toBeGreaterThan(now.getTime())
    })

    it('should generate past timestamp', () => {
      const past = getTimestampOffset(-1)
      const now = new Date()
      const pastDate = new Date(past)

      expect(pastDate.getTime()).toBeLessThan(now.getTime())
    })
  })

  describe('createMockProfile', () => {
    it('should create profile with defaults', () => {
      const profile = createMockProfile()

      expect(profile.id).toBeDefined()
      expect(profile.username).toBeDefined()
      expect(profile.display_name).toBeDefined()
      expect(profile.avatar).toBeDefined()
      expect(profile.trust_level).toBe(1)
      expect(profile.is_verified).toBe(false)
    })

    it('should allow overrides', () => {
      const profile = createMockProfile({
        username: 'custom_user',
        is_verified: true,
        trust_level: 5,
      })

      expect(profile.username).toBe('custom_user')
      expect(profile.is_verified).toBe(true)
      expect(profile.trust_level).toBe(5)
    })
  })

  describe('createMockAvatar', () => {
    it('should create avatar with defaults', () => {
      const avatar = createMockAvatar()

      expect(avatar.id).toBeDefined()
      expect(avatar.metadata).toBeDefined()
      expect(avatar.features).toBeDefined()
      expect(avatar.colors).toBeDefined()
    })

    it('should allow color overrides', () => {
      const avatar = createMockAvatar({
        colors: {
          skinTone: '#CUSTOM',
          hairColor: '#000000',
          outfitPrimary: '#FF0000',
          outfitSecondary: '#00FF00',
        },
      })

      expect(avatar.colors.skinTone).toBe('#CUSTOM')
      expect(avatar.colors.hairColor).toBe('#000000')
    })
  })

  describe('createMockConversation', () => {
    it('should create conversation with defaults', () => {
      const conversation = createMockConversation()

      expect(conversation.id).toBeDefined()
      expect(conversation.post_id).toBeDefined()
      expect(conversation.producer_id).toBeDefined()
      expect(conversation.consumer_id).toBeDefined()
      expect(conversation.status).toBe('active')
      expect(conversation.is_active).toBe(true)
    })

    it('should allow status override', () => {
      const conversation = createMockConversation({
        status: 'pending',
        producer_accepted: false,
      })

      expect(conversation.status).toBe('pending')
      expect(conversation.producer_accepted).toBe(false)
    })
  })

  describe('createMockMessage', () => {
    it('should create message with defaults', () => {
      const message = createMockMessage()

      expect(message.id).toBeDefined()
      expect(message.conversation_id).toBeDefined()
      expect(message.sender_id).toBeDefined()
      expect(message.content).toBe('Test message content')
      expect(message.is_read).toBe(false)
    })

    it('should allow content override', () => {
      const message = createMockMessage({
        content: 'Custom message',
        is_read: true,
      })

      expect(message.content).toBe('Custom message')
      expect(message.is_read).toBe(true)
    })
  })

  describe('createMockLocation', () => {
    it('should create location with defaults', () => {
      const location = createMockLocation()

      expect(location.id).toBeDefined()
      expect(location.google_place_id).toBeDefined()
      expect(location.name).toBe('Test Cafe')
      expect(location.latitude).toBe(40.7128)
      expect(location.longitude).toBe(-74.006)
      expect(location.place_types).toContain('cafe')
    })

    it('should allow coordinate overrides', () => {
      const location = createMockLocation({
        name: 'Custom Place',
        latitude: 51.5074,
        longitude: -0.1278,
      })

      expect(location.name).toBe('Custom Place')
      expect(location.latitude).toBe(51.5074)
      expect(location.longitude).toBe(-0.1278)
    })
  })

  describe('createMockPost', () => {
    it('should create post with defaults', () => {
      const post = createMockPost()

      expect(post.id).toBeDefined()
      expect(post.producer_id).toBeDefined()
      expect(post.location_id).toBeDefined()
      expect(post.message).toBe('Hope to connect!')
      expect(post.is_active).toBe(true)
      expect(post.target_avatar_v2).toBeDefined()
    })

    it('should allow message override', () => {
      const post = createMockPost({
        message: 'Custom message',
        is_active: false,
      })

      expect(post.message).toBe('Custom message')
      expect(post.is_active).toBe(false)
    })
  })

  describe('createMockCheckin', () => {
    it('should create checkin with defaults', () => {
      const checkin = createMockCheckin()

      expect(checkin.id).toBeDefined()
      expect(checkin.user_id).toBeDefined()
      expect(checkin.location_id).toBeDefined()
      expect(checkin.verified).toBe(true)
      expect(checkin.checked_out_at).toBeNull()
    })

    it('should allow verified override', () => {
      const checkin = createMockCheckin({
        verified: false,
        checked_out_at: getCurrentTimestamp(),
      })

      expect(checkin.verified).toBe(false)
      expect(checkin.checked_out_at).toBeDefined()
    })
  })

  describe('Related entities', () => {
    it('should create related entities with matching IDs', () => {
      const userId = generateTestUUID()
      const locationId = generateTestUUID()

      const profile = createMockProfile({ id: userId })
      const location = createMockLocation({ id: locationId })
      const checkin = createMockCheckin({
        user_id: userId,
        location_id: locationId,
      })

      expect(checkin.user_id).toBe(profile.id)
      expect(checkin.location_id).toBe(location.id)
    })

    it('should create conversation with related post', () => {
      const postId = generateTestUUID()
      const producerId = generateTestUUID()
      const consumerId = generateTestUUID()

      const post = createMockPost({ id: postId, producer_id: producerId })
      const conversation = createMockConversation({
        post_id: postId,
        producer_id: producerId,
        consumer_id: consumerId,
      })

      expect(conversation.post_id).toBe(post.id)
      expect(conversation.producer_id).toBe(post.producer_id)
    })
  })
})
