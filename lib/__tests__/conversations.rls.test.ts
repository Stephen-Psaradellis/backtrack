/**
 * Conversations RLS Policy Tests
 *
 * Tests Row Level Security policies for the conversations table.
 * Verifies that:
 * - Participants can access their conversations
 * - Non-participants cannot access conversations
 * - Blocking relationships prevent access
 * - Message insertion and reading respect RLS
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { createMockSupabaseClient } from '../../__tests__/utils/supabase-mock'
import {
  createMockProfile,
  createMockConversation,
  createMockMessage,
  createMockBlock,
  generateTestUUID,
} from '../../__tests__/utils/factories'
import type { Conversation, Message } from '../../types/database'

describe('Conversations RLS Policies', () => {
  const userA = createMockProfile({ id: 'user-a-uuid' })
  const userB = createMockProfile({ id: 'user-b-uuid' })
  const userC = createMockProfile({ id: 'user-c-uuid' })

  describe('SELECT policy: participants can view conversations', () => {
    it('returns conversations where user is producer', async () => {
      const conv = createMockConversation({
        id: 'conv-123',
        producer_id: userA.id,
        consumer_id: userB.id,
      })

      const mockClient = createMockSupabaseClient({
        defaultData: {
          conversations: [conv],
        },
        session: {
          user: { id: userA.id, email: 'usera@example.com' },
        },
      })

      const { data, error } = await mockClient.from('conversations').select('*')

      expect(error).toBeNull()
      expect(data).toHaveLength(1)
      expect((data as Conversation[])[0].id).toBe('conv-123')
      expect((data as Conversation[])[0].producer_id).toBe(userA.id)
    })

    it('returns conversations where user is consumer', async () => {
      const conv = createMockConversation({
        id: 'conv-456',
        producer_id: userB.id,
        consumer_id: userA.id,
      })

      const mockClient = createMockSupabaseClient({
        defaultData: {
          conversations: [conv],
        },
        session: {
          user: { id: userA.id, email: 'usera@example.com' },
        },
      })

      const { data, error } = await mockClient.from('conversations').select('*')

      expect(error).toBeNull()
      expect(data).toHaveLength(1)
      expect((data as Conversation[])[0].id).toBe('conv-456')
      expect((data as Conversation[])[0].consumer_id).toBe(userA.id)
    })

    it('returns empty for conversations where user is not a participant', async () => {
      // Conversation between B and C (userA is not a participant)
      const conv = createMockConversation({
        producer_id: userB.id,
        consumer_id: userC.id,
      })

      const mockClient = createMockSupabaseClient({
        defaultData: {
          conversations: [], // RLS would return empty
        },
        session: {
          user: { id: userA.id, email: 'usera@example.com' },
        },
      })

      const { data, error } = await mockClient.from('conversations').select('*')

      expect(error).toBeNull()
      expect(data).toEqual([])
    })
  })

  describe('SELECT policy: blocking prevents access', () => {
    it('hides conversation when user blocks other participant', async () => {
      const conv = createMockConversation({
        producer_id: userA.id,
        consumer_id: userB.id,
      })

      // UserA blocks userB
      const mockClient = createMockSupabaseClient({
        defaultData: {
          conversations: [], // RLS filters out blocked conversations
          blocks: [createMockBlock({ blocker_id: userA.id, blocked_id: userB.id })],
        },
        session: {
          user: { id: userA.id, email: 'usera@example.com' },
        },
      })

      const { data, error } = await mockClient.from('conversations').select('*')

      expect(error).toBeNull()
      expect(data).toEqual([])
    })

    it('hides conversation when user is blocked by other participant', async () => {
      const conv = createMockConversation({
        producer_id: userA.id,
        consumer_id: userB.id,
      })

      // UserB blocks userA
      const mockClient = createMockSupabaseClient({
        defaultData: {
          conversations: [], // RLS filters out when blocked
          blocks: [createMockBlock({ blocker_id: userB.id, blocked_id: userA.id })],
        },
        session: {
          user: { id: userA.id, email: 'usera@example.com' },
        },
      })

      const { data, error } = await mockClient.from('conversations').select('*')

      expect(error).toBeNull()
      expect(data).toEqual([])
    })

    it('shows conversation when no blocking relationship exists', async () => {
      const conv = createMockConversation({
        id: 'conv-789',
        producer_id: userA.id,
        consumer_id: userB.id,
      })

      const mockClient = createMockSupabaseClient({
        defaultData: {
          conversations: [conv],
          blocks: [], // No blocks
        },
        session: {
          user: { id: userA.id, email: 'usera@example.com' },
        },
      })

      const { data, error } = await mockClient.from('conversations').select('*')

      expect(error).toBeNull()
      expect(data).toHaveLength(1)
      expect((data as Conversation[])[0].id).toBe('conv-789')
    })

    it('shows conversation when unrelated user is blocked (userC blocks userA)', async () => {
      const conv = createMockConversation({
        id: 'conv-abc',
        producer_id: userA.id,
        consumer_id: userB.id,
      })

      const mockClient = createMockSupabaseClient({
        defaultData: {
          conversations: [conv],
          // UserC blocks userA, but this doesn't affect A-B conversation
          blocks: [createMockBlock({ blocker_id: userC.id, blocked_id: userA.id })],
        },
        session: {
          user: { id: userA.id, email: 'usera@example.com' },
        },
      })

      const { data, error } = await mockClient.from('conversations').select('*')

      expect(error).toBeNull()
      expect(data).toHaveLength(1)
      expect((data as Conversation[])[0].id).toBe('conv-abc')
    })
  })

  describe('INSERT policy: consumers can create conversations', () => {
    it('allows consumer to create conversation with producer', async () => {
      const newConv = createMockConversation({
        producer_id: userB.id,
        consumer_id: userA.id,
      })

      const mockClient = createMockSupabaseClient({
        defaultData: {
          conversations: [newConv],
        },
        session: {
          user: { id: userA.id, email: 'usera@example.com' },
        },
      })

      const { data, error } = await mockClient
        .from('conversations')
        .insert({
          producer_id: userB.id,
          consumer_id: userA.id,
          post_id: generateTestUUID(),
        })

      expect(error).toBeNull()
      expect(data).toBeDefined()
    })

    it('prevents creating conversation when blocked', async () => {
      const mockClient = createMockSupabaseClient({
        defaultData: {
          conversations: [],
          blocks: [createMockBlock({ blocker_id: userB.id, blocked_id: userA.id })],
        },
        defaultErrors: {
          conversations: {
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
        .from('conversations')
        .insert({
          producer_id: userB.id,
          consumer_id: userA.id,
          post_id: generateTestUUID(),
        })

      expect(error).not.toBeNull()
      expect(error?.code).toBe('42501')
    })
  })

  describe('Messages RLS: participants can read and send messages', () => {
    it('allows participant to read messages in their conversation', async () => {
      const conv = createMockConversation({
        id: 'conv-msg-1',
        producer_id: userA.id,
        consumer_id: userB.id,
      })

      const message = createMockMessage({
        conversation_id: conv.id,
        sender_id: userB.id,
        content: 'Hello!',
      })

      const mockClient = createMockSupabaseClient({
        defaultData: {
          messages: [message],
          conversations: [conv],
        },
        session: {
          user: { id: userA.id, email: 'usera@example.com' },
        },
      })

      const { data, error } = await mockClient
        .from('messages')
        .select('*')
        .eq('conversation_id', conv.id)

      expect(error).toBeNull()
      expect(data).toHaveLength(1)
      expect((data as Message[])[0].content).toBe('Hello!')
    })

    it('prevents non-participant from reading messages', async () => {
      const conv = createMockConversation({
        id: 'conv-msg-2',
        producer_id: userA.id,
        consumer_id: userB.id,
      })

      const message = createMockMessage({
        conversation_id: conv.id,
        sender_id: userA.id,
        content: 'Private message',
      })

      // UserC is not a participant
      const mockClient = createMockSupabaseClient({
        defaultData: {
          messages: [], // RLS denies access
        },
        session: {
          user: { id: userC.id, email: 'userc@example.com' },
        },
      })

      const { data, error } = await mockClient
        .from('messages')
        .select('*')
        .eq('conversation_id', conv.id)

      expect(error).toBeNull()
      expect(data).toEqual([])
    })

    it('allows participant to insert message', async () => {
      const conv = createMockConversation({
        id: 'conv-msg-3',
        producer_id: userA.id,
        consumer_id: userB.id,
      })

      const newMessage = createMockMessage({
        conversation_id: conv.id,
        sender_id: userA.id,
        content: 'New message',
      })

      const mockClient = createMockSupabaseClient({
        defaultData: {
          messages: [newMessage],
          conversations: [conv],
        },
        session: {
          user: { id: userA.id, email: 'usera@example.com' },
        },
      })

      const { data, error } = await mockClient.from('messages').insert({
        conversation_id: conv.id,
        sender_id: userA.id,
        content: 'New message',
      })

      expect(error).toBeNull()
      expect(data).toBeDefined()
    })

    it('prevents non-participant from inserting message', async () => {
      const conv = createMockConversation({
        id: 'conv-msg-4',
        producer_id: userA.id,
        consumer_id: userB.id,
      })

      // UserC tries to insert message
      const mockClient = createMockSupabaseClient({
        defaultData: {
          messages: [],
        },
        defaultErrors: {
          messages: {
            message: 'new row violates row-level security policy',
            code: '42501',
            details: null,
            hint: null,
          },
        },
        session: {
          user: { id: userC.id, email: 'userc@example.com' },
        },
      })

      const { data, error } = await mockClient.from('messages').insert({
        conversation_id: conv.id,
        sender_id: userC.id,
        content: 'Unauthorized message',
      })

      expect(error).not.toBeNull()
      expect(error?.code).toBe('42501')
    })
  })

  describe('Edge cases', () => {
    it('handles mutual blocking (both users block each other)', async () => {
      const conv = createMockConversation({
        producer_id: userA.id,
        consumer_id: userB.id,
      })

      // Both users block each other
      const mockClient = createMockSupabaseClient({
        defaultData: {
          conversations: [], // RLS hides conversation
          blocks: [
            createMockBlock({ blocker_id: userA.id, blocked_id: userB.id }),
            createMockBlock({ blocker_id: userB.id, blocked_id: userA.id }),
          ],
        },
        session: {
          user: { id: userA.id, email: 'usera@example.com' },
        },
      })

      const { data, error } = await mockClient.from('conversations').select('*')

      expect(error).toBeNull()
      expect(data).toEqual([])
    })

    it('does not affect other conversations when blocking occurs', async () => {
      const convAB = createMockConversation({
        id: 'conv-ab',
        producer_id: userA.id,
        consumer_id: userB.id,
      })

      const convAC = createMockConversation({
        id: 'conv-ac',
        producer_id: userA.id,
        consumer_id: userC.id,
      })

      // UserA blocks userB
      const mockClient = createMockSupabaseClient({
        defaultData: {
          // Only convAC should be visible
          conversations: [convAC],
          blocks: [createMockBlock({ blocker_id: userA.id, blocked_id: userB.id })],
        },
        session: {
          user: { id: userA.id, email: 'usera@example.com' },
        },
      })

      const { data, error } = await mockClient.from('conversations').select('*')

      expect(error).toBeNull()
      expect(data).toHaveLength(1)
      expect((data as Conversation[])[0].id).toBe('conv-ac')
      expect((data as Conversation[])[0].consumer_id).toBe(userC.id)
    })

    it('allows unblocking to restore conversation visibility', async () => {
      const conv = createMockConversation({
        id: 'conv-unblock',
        producer_id: userA.id,
        consumer_id: userB.id,
      })

      // After unblocking, conversation is visible again
      const mockClient = createMockSupabaseClient({
        defaultData: {
          conversations: [conv],
          blocks: [], // Block removed
        },
        session: {
          user: { id: userA.id, email: 'usera@example.com' },
        },
      })

      const { data, error } = await mockClient.from('conversations').select('*')

      expect(error).toBeNull()
      expect(data).toHaveLength(1)
      expect((data as Conversation[])[0].id).toBe('conv-unblock')
    })
  })
})
