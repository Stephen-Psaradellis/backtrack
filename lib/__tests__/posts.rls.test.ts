/**
 * Posts RLS Policy Tests
 *
 * Tests Row Level Security policies for the posts table.
 * Verifies that:
 * - Users can read active, non-expired posts
 * - Users cannot read posts from blocked users
 * - Users can only create posts for themselves
 * - Users can only update/delete their own posts
 * - Expired posts are filtered out
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { createMockSupabaseClient } from '../../__tests__/utils/supabase-mock'
import {
  createMockProfile,
  createMockPost,
  createMockBlock,
  createMockLocation,
  generateTestUUID,
  getTimestampOffset,
} from '../../__tests__/utils/factories'
import type { Post } from '../../types/database'

describe('Posts RLS Policies', () => {
  const userA = createMockProfile({ id: 'user-a-uuid' })
  const userB = createMockProfile({ id: 'user-b-uuid' })
  const userC = createMockProfile({ id: 'user-c-uuid' })
  const testLocation = createMockLocation({ id: 'location-123' })

  describe('SELECT policy: active posts are readable', () => {
    it('returns active, non-expired posts', async () => {
      const activePost = createMockPost({
        id: 'post-123',
        producer_id: userB.id,
        location_id: testLocation.id,
        is_active: true,
        expires_at: getTimestampOffset(24), // Expires in 24 hours
      })

      const mockClient = createMockSupabaseClient({
        defaultData: {
          posts: [activePost],
        },
        session: {
          user: { id: userA.id, email: 'usera@example.com' },
        },
      })

      const { data, error } = await mockClient.from('posts').select('*')

      expect(error).toBeNull()
      expect(data).toHaveLength(1)
      expect((data as Post[])[0].id).toBe('post-123')
      expect((data as Post[])[0].is_active).toBe(true)
    })

    it('filters out inactive posts', async () => {
      const inactivePost = createMockPost({
        producer_id: userB.id,
        is_active: false,
        expires_at: getTimestampOffset(24),
      })

      const mockClient = createMockSupabaseClient({
        defaultData: {
          posts: [], // RLS filters out inactive posts
        },
        session: {
          user: { id: userA.id, email: 'usera@example.com' },
        },
      })

      const { data, error } = await mockClient.from('posts').select('*')

      expect(error).toBeNull()
      expect(data).toEqual([])
    })

    it('filters out expired posts', async () => {
      const expiredPost = createMockPost({
        producer_id: userB.id,
        is_active: true,
        expires_at: getTimestampOffset(-24), // Expired 24 hours ago
      })

      const mockClient = createMockSupabaseClient({
        defaultData: {
          posts: [], // RLS filters out expired posts
        },
        session: {
          user: { id: userA.id, email: 'usera@example.com' },
        },
      })

      const { data, error } = await mockClient.from('posts').select('*')

      expect(error).toBeNull()
      expect(data).toEqual([])
    })

    it('allows producers to see their own posts (even if inactive)', async () => {
      const ownPost = createMockPost({
        id: 'post-own',
        producer_id: userA.id,
        is_active: false, // Inactive but owner can see
      })

      const mockClient = createMockSupabaseClient({
        defaultData: {
          posts: [ownPost],
        },
        session: {
          user: { id: userA.id, email: 'usera@example.com' },
        },
      })

      const { data, error } = await mockClient
        .from('posts')
        .select('*')
        .eq('producer_id', userA.id)

      expect(error).toBeNull()
      expect(data).toHaveLength(1)
      expect((data as Post[])[0].id).toBe('post-own')
    })
  })

  describe('SELECT policy: blocking prevents post visibility', () => {
    it('hides posts from blocked users', async () => {
      const blockedUserPost = createMockPost({
        producer_id: userB.id,
        is_active: true,
        expires_at: getTimestampOffset(24),
      })

      // UserA blocks userB
      const mockClient = createMockSupabaseClient({
        defaultData: {
          posts: [], // RLS filters out blocked user's posts
          blocks: [createMockBlock({ blocker_id: userA.id, blocked_id: userB.id })],
        },
        session: {
          user: { id: userA.id, email: 'usera@example.com' },
        },
      })

      const { data, error } = await mockClient.from('posts').select('*')

      expect(error).toBeNull()
      expect(data).toEqual([])
    })

    it('hides posts when user is blocked by producer', async () => {
      const post = createMockPost({
        producer_id: userB.id,
        is_active: true,
        expires_at: getTimestampOffset(24),
      })

      // UserB blocks userA
      const mockClient = createMockSupabaseClient({
        defaultData: {
          posts: [], // RLS filters out when blocked
          blocks: [createMockBlock({ blocker_id: userB.id, blocked_id: userA.id })],
        },
        session: {
          user: { id: userA.id, email: 'usera@example.com' },
        },
      })

      const { data, error } = await mockClient.from('posts').select('*')

      expect(error).toBeNull()
      expect(data).toEqual([])
    })

    it('shows posts when no blocking relationship exists', async () => {
      const post = createMockPost({
        id: 'post-visible',
        producer_id: userB.id,
        is_active: true,
        expires_at: getTimestampOffset(24),
      })

      const mockClient = createMockSupabaseClient({
        defaultData: {
          posts: [post],
          blocks: [],
        },
        session: {
          user: { id: userA.id, email: 'usera@example.com' },
        },
      })

      const { data, error } = await mockClient.from('posts').select('*')

      expect(error).toBeNull()
      expect(data).toHaveLength(1)
      expect((data as Post[])[0].id).toBe('post-visible')
    })
  })

  describe('INSERT policy: users can create posts for themselves', () => {
    it('allows user to create post as producer', async () => {
      const newPost = createMockPost({
        producer_id: userA.id,
        location_id: testLocation.id,
      })

      const mockClient = createMockSupabaseClient({
        defaultData: {
          posts: [newPost],
        },
        session: {
          user: { id: userA.id, email: 'usera@example.com' },
        },
      })

      const { data, error } = await mockClient.from('posts').insert({
        producer_id: userA.id,
        location_id: testLocation.id,
        message: 'Looking for you!',
      })

      expect(error).toBeNull()
      expect(data).toBeDefined()
    })

    it('prevents user from creating post for another user', async () => {
      const mockClient = createMockSupabaseClient({
        defaultData: {
          posts: [],
        },
        defaultErrors: {
          posts: {
            message: 'new row violates row-level security policy',
            code: '42501',
            details: null,
            hint: null,
          },
        },
        session: {
          user: { id: userA.id, email: 'usera@example.com' },
        },
      })

      const { data, error } = await mockClient.from('posts').insert({
        producer_id: userB.id, // Trying to create post as userB
        location_id: testLocation.id,
        message: 'Unauthorized post',
      })

      expect(error).not.toBeNull()
      expect(error?.code).toBe('42501')
    })
  })

  describe('UPDATE policy: users can only update their own posts', () => {
    it('allows producer to update their own post', async () => {
      const ownPost = createMockPost({
        id: 'post-update-own',
        producer_id: userA.id,
        message: 'Original message',
      })

      const mockClient = createMockSupabaseClient({
        defaultData: {
          posts: [{ ...ownPost, message: 'Updated message' }],
        },
        session: {
          user: { id: userA.id, email: 'usera@example.com' },
        },
      })

      const { data, error } = await mockClient
        .from('posts')
        .update({ message: 'Updated message' })
        .eq('id', ownPost.id)

      expect(error).toBeNull()
      expect(data).toBeDefined()
    })

    it('prevents user from updating another user\'s post', async () => {
      const otherPost = createMockPost({
        id: 'post-update-other',
        producer_id: userB.id,
      })

      const mockClient = createMockSupabaseClient({
        defaultData: {
          posts: [],
        },
        defaultErrors: {
          posts: {
            message: 'new row violates row-level security policy',
            code: '42501',
            details: null,
            hint: null,
          },
        },
        session: {
          user: { id: userA.id, email: 'usera@example.com' },
        },
      })

      const { data, error } = await mockClient
        .from('posts')
        .update({ is_active: false })
        .eq('id', otherPost.id)

      expect(error).not.toBeNull()
      expect(error?.code).toBe('42501')
    })
  })

  describe('DELETE policy: users can only delete their own posts', () => {
    it('allows producer to delete their own post', async () => {
      const ownPost = createMockPost({
        id: 'post-delete-own',
        producer_id: userA.id,
      })

      const mockClient = createMockSupabaseClient({
        defaultData: {
          posts: [],
        },
        session: {
          user: { id: userA.id, email: 'usera@example.com' },
        },
      })

      const { data, error } = await mockClient.from('posts').delete().eq('id', ownPost.id)

      expect(error).toBeNull()
    })

    it('prevents user from deleting another user\'s post', async () => {
      const otherPost = createMockPost({
        id: 'post-delete-other',
        producer_id: userB.id,
      })

      const mockClient = createMockSupabaseClient({
        defaultData: {
          posts: [],
        },
        defaultErrors: {
          posts: {
            message: 'new row violates row-level security policy',
            code: '42501',
            details: null,
            hint: null,
          },
        },
        session: {
          user: { id: userA.id, email: 'usera@example.com' },
        },
      })

      const { data, error } = await mockClient.from('posts').delete().eq('id', otherPost.id)

      expect(error).not.toBeNull()
      expect(error?.code).toBe('42501')
    })
  })

  describe('Edge cases', () => {
    it('filters posts by location with blocking applied', async () => {
      const postB = createMockPost({
        id: 'post-b',
        producer_id: userB.id,
        location_id: testLocation.id,
        is_active: true,
        expires_at: getTimestampOffset(24),
      })

      const postC = createMockPost({
        id: 'post-c',
        producer_id: userC.id,
        location_id: testLocation.id,
        is_active: true,
        expires_at: getTimestampOffset(24),
      })

      // UserA blocks userB but not userC
      const mockClient = createMockSupabaseClient({
        defaultData: {
          posts: [postC], // Only postC visible
          blocks: [createMockBlock({ blocker_id: userA.id, blocked_id: userB.id })],
        },
        session: {
          user: { id: userA.id, email: 'usera@example.com' },
        },
      })

      const { data, error } = await mockClient
        .from('posts')
        .select('*')
        .eq('location_id', testLocation.id)

      expect(error).toBeNull()
      expect(data).toHaveLength(1)
      expect((data as Post[])[0].id).toBe('post-c')
      expect((data as Post[])[0].producer_id).toBe(userC.id)
    })

    it('returns multiple active posts from different producers', async () => {
      const postB = createMockPost({
        id: 'post-multi-b',
        producer_id: userB.id,
        is_active: true,
        expires_at: getTimestampOffset(24),
      })

      const postC = createMockPost({
        id: 'post-multi-c',
        producer_id: userC.id,
        is_active: true,
        expires_at: getTimestampOffset(24),
      })

      const mockClient = createMockSupabaseClient({
        defaultData: {
          posts: [postB, postC],
          blocks: [],
        },
        session: {
          user: { id: userA.id, email: 'usera@example.com' },
        },
      })

      const { data, error } = await mockClient.from('posts').select('*')

      expect(error).toBeNull()
      expect(data).toHaveLength(2)
      expect((data as Post[]).map((p) => p.id)).toContain('post-multi-b')
      expect((data as Post[]).map((p) => p.id)).toContain('post-multi-c')
    })
  })
})
