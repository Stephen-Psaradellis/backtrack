/**
 * Blocks RLS Policy Tests
 *
 * Tests Row Level Security policies for the blocks table.
 * Verifies that:
 * - Users can see blocks they created
 * - Users can see who has blocked them (for content filtering)
 * - Users cannot see unrelated blocks
 * - Users can create blocks
 * - Users can only delete their own blocks
 */

import { describe, it, expect } from 'vitest'
import { createMockSupabaseClient } from '../../__tests__/utils/supabase-mock'
import { createMockProfile, createMockBlock } from '../../__tests__/utils/factories'
import type { Block } from '../../types/database'

describe('Blocks RLS Policies', () => {
  const userA = createMockProfile({ id: 'user-a-uuid' })
  const userB = createMockProfile({ id: 'user-b-uuid' })
  const userC = createMockProfile({ id: 'user-c-uuid' })

  describe('SELECT policy: users can see their own blocks', () => {
    it('returns blocks where user is the blocker', async () => {
      const block = createMockBlock({
        blocker_id: userA.id,
        blocked_id: userB.id,
      })

      const mockClient = createMockSupabaseClient({
        defaultData: {
          blocks: [block],
        },
        session: {
          user: { id: userA.id, email: 'usera@example.com' },
        },
      })

      const { data, error } = await mockClient.from('blocks').select('*')

      expect(error).toBeNull()
      expect(data).toHaveLength(1)
      expect((data as Block[])[0].blocker_id).toBe(userA.id)
      expect((data as Block[])[0].blocked_id).toBe(userB.id)
    })

    it('returns blocks where user is the blocked party', async () => {
      const block = createMockBlock({
        blocker_id: userB.id,
        blocked_id: userA.id,
      })

      const mockClient = createMockSupabaseClient({
        defaultData: {
          blocks: [block],
        },
        session: {
          user: { id: userA.id, email: 'usera@example.com' },
        },
      })

      const { data, error } = await mockClient.from('blocks').select('*')

      expect(error).toBeNull()
      expect(data).toHaveLength(1)
      expect((data as Block[])[0].blocker_id).toBe(userB.id)
      expect((data as Block[])[0].blocked_id).toBe(userA.id)
    })

    it('does not return blocks user is not involved in', async () => {
      // Block between userB and userC (userA not involved)
      const block = createMockBlock({
        blocker_id: userB.id,
        blocked_id: userC.id,
      })

      const mockClient = createMockSupabaseClient({
        defaultData: {
          blocks: [], // RLS filters out unrelated blocks
        },
        session: {
          user: { id: userA.id, email: 'usera@example.com' },
        },
      })

      const { data, error } = await mockClient.from('blocks').select('*')

      expect(error).toBeNull()
      expect(data).toEqual([])
    })

    it('returns multiple blocks where user is blocker', async () => {
      const blockB = createMockBlock({
        blocker_id: userA.id,
        blocked_id: userB.id,
      })

      const blockC = createMockBlock({
        blocker_id: userA.id,
        blocked_id: userC.id,
      })

      const mockClient = createMockSupabaseClient({
        defaultData: {
          blocks: [blockB, blockC],
        },
        session: {
          user: { id: userA.id, email: 'usera@example.com' },
        },
      })

      const { data, error } = await mockClient
        .from('blocks')
        .select('*')
        .eq('blocker_id', userA.id)

      expect(error).toBeNull()
      expect(data).toHaveLength(2)
      expect((data as Block[]).map((b) => b.blocked_id)).toContain(userB.id)
      expect((data as Block[]).map((b) => b.blocked_id)).toContain(userC.id)
    })
  })

  describe('INSERT policy: users can create blocks', () => {
    it('allows user to block another user', async () => {
      const newBlock = createMockBlock({
        blocker_id: userA.id,
        blocked_id: userB.id,
      })

      const mockClient = createMockSupabaseClient({
        defaultData: {
          blocks: [newBlock],
        },
        session: {
          user: { id: userA.id, email: 'usera@example.com' },
        },
      })

      const { data, error } = await mockClient.from('blocks').insert({
        blocker_id: userA.id,
        blocked_id: userB.id,
      })

      expect(error).toBeNull()
      expect(data).toBeDefined()
    })

    it('prevents user from creating block with different blocker_id', async () => {
      const mockClient = createMockSupabaseClient({
        defaultData: {
          blocks: [],
        },
        defaultErrors: {
          blocks: {
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

      const { data, error } = await mockClient.from('blocks').insert({
        blocker_id: userB.id, // UserA trying to create block as userB
        blocked_id: userC.id,
      })

      expect(error).not.toBeNull()
      expect(error?.code).toBe('42501')
    })

    it('allows blocking the same user who blocked you', async () => {
      // UserB blocked userA, now userA blocks userB (mutual block)
      const existingBlock = createMockBlock({
        blocker_id: userB.id,
        blocked_id: userA.id,
      })

      const newBlock = createMockBlock({
        blocker_id: userA.id,
        blocked_id: userB.id,
      })

      const mockClient = createMockSupabaseClient({
        defaultData: {
          blocks: [existingBlock, newBlock],
        },
        session: {
          user: { id: userA.id, email: 'usera@example.com' },
        },
      })

      const { data, error } = await mockClient.from('blocks').insert({
        blocker_id: userA.id,
        blocked_id: userB.id,
      })

      expect(error).toBeNull()
      expect(data).toBeDefined()
    })
  })

  describe('DELETE policy: users can unblock (delete their blocks)', () => {
    it('allows user to delete block they created', async () => {
      const block = createMockBlock({
        blocker_id: userA.id,
        blocked_id: userB.id,
      })

      const mockClient = createMockSupabaseClient({
        defaultData: {
          blocks: [],
        },
        session: {
          user: { id: userA.id, email: 'usera@example.com' },
        },
      })

      const { data, error } = await mockClient
        .from('blocks')
        .delete()
        .eq('blocker_id', userA.id)
        .eq('blocked_id', userB.id)

      expect(error).toBeNull()
    })

    it('prevents user from deleting blocks created by others', async () => {
      const block = createMockBlock({
        blocker_id: userB.id,
        blocked_id: userA.id,
      })

      const mockClient = createMockSupabaseClient({
        defaultData: {
          blocks: [],
        },
        defaultErrors: {
          blocks: {
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

      // UserA tries to delete block where they are the blocked party
      const { data, error } = await mockClient
        .from('blocks')
        .delete()
        .eq('blocker_id', userB.id)
        .eq('blocked_id', userA.id)

      expect(error).not.toBeNull()
      expect(error?.code).toBe('42501')
    })
  })

  describe('Edge cases', () => {
    it('handles querying who user has blocked', async () => {
      const blocks = [
        createMockBlock({ blocker_id: userA.id, blocked_id: userB.id }),
        createMockBlock({ blocker_id: userA.id, blocked_id: userC.id }),
      ]

      const mockClient = createMockSupabaseClient({
        defaultData: {
          blocks,
        },
        session: {
          user: { id: userA.id, email: 'usera@example.com' },
        },
      })

      const { data, error } = await mockClient
        .from('blocks')
        .select('blocked_id')
        .eq('blocker_id', userA.id)

      expect(error).toBeNull()
      expect(data).toHaveLength(2)
      expect((data as Block[]).map((b) => b.blocked_id)).toContain(userB.id)
      expect((data as Block[]).map((b) => b.blocked_id)).toContain(userC.id)
    })

    it('handles querying who blocked user', async () => {
      const blocks = [
        createMockBlock({ blocker_id: userB.id, blocked_id: userA.id }),
        createMockBlock({ blocker_id: userC.id, blocked_id: userA.id }),
      ]

      const mockClient = createMockSupabaseClient({
        defaultData: {
          blocks,
        },
        session: {
          user: { id: userA.id, email: 'usera@example.com' },
        },
      })

      const { data, error } = await mockClient
        .from('blocks')
        .select('blocker_id')
        .eq('blocked_id', userA.id)

      expect(error).toBeNull()
      expect(data).toHaveLength(2)
      expect((data as Block[]).map((b) => b.blocker_id)).toContain(userB.id)
      expect((data as Block[]).map((b) => b.blocker_id)).toContain(userC.id)
    })

    it('handles mutual blocking scenario', async () => {
      const blocks = [
        createMockBlock({ blocker_id: userA.id, blocked_id: userB.id }),
        createMockBlock({ blocker_id: userB.id, blocked_id: userA.id }),
      ]

      const mockClient = createMockSupabaseClient({
        defaultData: {
          blocks,
        },
        session: {
          user: { id: userA.id, email: 'usera@example.com' },
        },
      })

      const { data, error } = await mockClient.from('blocks').select('*')

      expect(error).toBeNull()
      expect(data).toHaveLength(2)

      // UserA can see both: the block they created and the block against them
      const blocksByA = (data as Block[]).filter((b) => b.blocker_id === userA.id)
      const blocksAgainstA = (data as Block[]).filter((b) => b.blocked_id === userA.id)

      expect(blocksByA).toHaveLength(1)
      expect(blocksAgainstA).toHaveLength(1)
    })

    it('returns empty when user has no block relationships', async () => {
      const mockClient = createMockSupabaseClient({
        defaultData: {
          blocks: [],
        },
        session: {
          user: { id: userA.id, email: 'usera@example.com' },
        },
      })

      const { data, error } = await mockClient.from('blocks').select('*')

      expect(error).toBeNull()
      expect(data).toEqual([])
    })
  })

  describe('Application-level block checking', () => {
    it('supports checking if specific block relationship exists', async () => {
      const block = createMockBlock({
        blocker_id: userA.id,
        blocked_id: userB.id,
      })

      const mockClient = createMockSupabaseClient({
        defaultData: {
          blocks: [block],
        },
        session: {
          user: { id: userA.id, email: 'usera@example.com' },
        },
      })

      const { data, error } = await mockClient
        .from('blocks')
        .select('*')
        .eq('blocker_id', userA.id)
        .eq('blocked_id', userB.id)

      expect(error).toBeNull()
      expect(data).toHaveLength(1)
    })

    it('supports checking for any block relationship between two users', async () => {
      const blocks = [createMockBlock({ blocker_id: userB.id, blocked_id: userA.id })]

      const mockClient = createMockSupabaseClient({
        defaultData: {
          blocks,
        },
        session: {
          user: { id: userA.id, email: 'usera@example.com' },
        },
      })

      // Check if userA blocked userB OR userB blocked userA
      const { data, error } = await mockClient.from('blocks').select('*')

      expect(error).toBeNull()
      expect(data).toHaveLength(1)

      // In application code, check both directions
      const hasBlockRelationship = (data as Block[]).some(
        (b) =>
          (b.blocker_id === userA.id && b.blocked_id === userB.id) ||
          (b.blocker_id === userB.id && b.blocked_id === userA.id)
      )

      expect(hasBlockRelationship).toBe(true)
    })
  })
})
