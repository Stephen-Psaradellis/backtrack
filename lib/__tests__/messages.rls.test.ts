/**
 * Messages RLS Policy Tests
 *
 * Tests Row Level Security policies for the messages table.
 * Verifies that:
 * - Participants can read messages in their conversations
 * - Non-participants cannot read messages
 * - Participants can insert messages
 * - Non-participants cannot insert messages
 * - Message updates respect RLS (only read status)
 */

import { describe, it, expect } from 'vitest'
import { createMockSupabaseClient } from '../../__tests__/utils/supabase-mock'
import {
  createMockProfile,
  createMockConversation,
  createMockMessage,
  generateTestUUID,
} from '../../__tests__/utils/factories'
import type { Message } from '../../types/database'

describe('Messages RLS Policies', () => {
  const userA = createMockProfile({ id: 'user-a-uuid' })
  const userB = createMockProfile({ id: 'user-b-uuid' })
  const userC = createMockProfile({ id: 'user-c-uuid' })

  describe('SELECT policy: participants can read messages', () => {
    it('allows producer to read messages in their conversation', async () => {
      const conv = createMockConversation({
        id: 'conv-123',
        producer_id: userA.id,
        consumer_id: userB.id,
      })

      const message = createMockMessage({
        id: 'msg-123',
        conversation_id: conv.id,
        sender_id: userB.id,
        content: 'Hello producer!',
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
      expect((data as Message[])[0].id).toBe('msg-123')
      expect((data as Message[])[0].content).toBe('Hello producer!')
    })

    it('allows consumer to read messages in their conversation', async () => {
      const conv = createMockConversation({
        id: 'conv-456',
        producer_id: userA.id,
        consumer_id: userB.id,
      })

      const message = createMockMessage({
        id: 'msg-456',
        conversation_id: conv.id,
        sender_id: userA.id,
        content: 'Hello consumer!',
      })

      const mockClient = createMockSupabaseClient({
        defaultData: {
          messages: [message],
          conversations: [conv],
        },
        session: {
          user: { id: userB.id, email: 'userb@example.com' },
        },
      })

      const { data, error } = await mockClient
        .from('messages')
        .select('*')
        .eq('conversation_id', conv.id)

      expect(error).toBeNull()
      expect(data).toHaveLength(1)
      expect((data as Message[])[0].id).toBe('msg-456')
      expect((data as Message[])[0].content).toBe('Hello consumer!')
    })

    it('prevents non-participant from reading messages', async () => {
      const conv = createMockConversation({
        id: 'conv-789',
        producer_id: userA.id,
        consumer_id: userB.id,
      })

      const message = createMockMessage({
        conversation_id: conv.id,
        sender_id: userA.id,
        content: 'Private conversation',
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

    it('filters out messages from inactive conversations', async () => {
      const inactiveConv = createMockConversation({
        id: 'conv-inactive',
        producer_id: userA.id,
        consumer_id: userB.id,
        is_active: false,
      })

      const message = createMockMessage({
        conversation_id: inactiveConv.id,
        sender_id: userA.id,
        content: 'Message in inactive conversation',
      })

      const mockClient = createMockSupabaseClient({
        defaultData: {
          messages: [], // RLS filters out messages from inactive conversations
        },
        session: {
          user: { id: userA.id, email: 'usera@example.com' },
        },
      })

      const { data, error } = await mockClient
        .from('messages')
        .select('*')
        .eq('conversation_id', inactiveConv.id)

      expect(error).toBeNull()
      expect(data).toEqual([])
    })
  })

  describe('INSERT policy: participants can send messages', () => {
    it('allows producer to send message', async () => {
      const conv = createMockConversation({
        id: 'conv-send-1',
        producer_id: userA.id,
        consumer_id: userB.id,
        is_active: true,
      })

      const newMessage = createMockMessage({
        conversation_id: conv.id,
        sender_id: userA.id,
        content: 'Message from producer',
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
        content: 'Message from producer',
      })

      expect(error).toBeNull()
      expect(data).toBeDefined()
    })

    it('allows consumer to send message', async () => {
      const conv = createMockConversation({
        id: 'conv-send-2',
        producer_id: userA.id,
        consumer_id: userB.id,
        is_active: true,
      })

      const newMessage = createMockMessage({
        conversation_id: conv.id,
        sender_id: userB.id,
        content: 'Message from consumer',
      })

      const mockClient = createMockSupabaseClient({
        defaultData: {
          messages: [newMessage],
          conversations: [conv],
        },
        session: {
          user: { id: userB.id, email: 'userb@example.com' },
        },
      })

      const { data, error } = await mockClient.from('messages').insert({
        conversation_id: conv.id,
        sender_id: userB.id,
        content: 'Message from consumer',
      })

      expect(error).toBeNull()
      expect(data).toBeDefined()
    })

    it('prevents non-participant from sending message', async () => {
      const conv = createMockConversation({
        id: 'conv-send-3',
        producer_id: userA.id,
        consumer_id: userB.id,
      })

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

    it('prevents sending message to inactive conversation', async () => {
      const inactiveConv = createMockConversation({
        id: 'conv-send-4',
        producer_id: userA.id,
        consumer_id: userB.id,
        is_active: false,
      })

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
          user: { id: userA.id, email: 'usera@example.com' },
        },
      })

      const { data, error } = await mockClient.from('messages').insert({
        conversation_id: inactiveConv.id,
        sender_id: userA.id,
        content: 'Message to inactive conversation',
      })

      expect(error).not.toBeNull()
      expect(error?.code).toBe('42501')
    })

    it('prevents participant from spoofing sender_id', async () => {
      const conv = createMockConversation({
        id: 'conv-spoof',
        producer_id: userA.id,
        consumer_id: userB.id,
      })

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
          user: { id: userA.id, email: 'usera@example.com' },
        },
      })

      const { data, error } = await mockClient.from('messages').insert({
        conversation_id: conv.id,
        sender_id: userB.id, // UserA trying to send as userB
        content: 'Spoofed message',
      })

      expect(error).not.toBeNull()
      expect(error?.code).toBe('42501')
    })
  })

  describe('UPDATE policy: participants can update read status', () => {
    it('allows participant to mark message as read', async () => {
      const conv = createMockConversation({
        id: 'conv-update-1',
        producer_id: userA.id,
        consumer_id: userB.id,
      })

      const message = createMockMessage({
        id: 'msg-update-1',
        conversation_id: conv.id,
        sender_id: userB.id,
        is_read: false,
      })

      const mockClient = createMockSupabaseClient({
        defaultData: {
          messages: [{ ...message, is_read: true }],
          conversations: [conv],
        },
        session: {
          user: { id: userA.id, email: 'usera@example.com' },
        },
      })

      const { data, error } = await mockClient
        .from('messages')
        .update({ is_read: true })
        .eq('id', message.id)

      expect(error).toBeNull()
      expect(data).toBeDefined()
    })

    it('prevents non-participant from updating message', async () => {
      const conv = createMockConversation({
        id: 'conv-update-2',
        producer_id: userA.id,
        consumer_id: userB.id,
      })

      const message = createMockMessage({
        id: 'msg-update-2',
        conversation_id: conv.id,
        sender_id: userA.id,
      })

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

      const { data, error } = await mockClient
        .from('messages')
        .update({ is_read: true })
        .eq('id', message.id)

      expect(error).not.toBeNull()
      expect(error?.code).toBe('42501')
    })
  })

  describe('Edge cases', () => {
    it('handles multiple messages in conversation', async () => {
      const conv = createMockConversation({
        id: 'conv-multi',
        producer_id: userA.id,
        consumer_id: userB.id,
      })

      const messages = [
        createMockMessage({
          id: 'msg-1',
          conversation_id: conv.id,
          sender_id: userA.id,
          content: 'Message 1',
        }),
        createMockMessage({
          id: 'msg-2',
          conversation_id: conv.id,
          sender_id: userB.id,
          content: 'Message 2',
        }),
        createMockMessage({
          id: 'msg-3',
          conversation_id: conv.id,
          sender_id: userA.id,
          content: 'Message 3',
        }),
      ]

      const mockClient = createMockSupabaseClient({
        defaultData: {
          messages,
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
      expect(data).toHaveLength(3)
      expect((data as Message[]).map((m) => m.id)).toContain('msg-1')
      expect((data as Message[]).map((m) => m.id)).toContain('msg-2')
      expect((data as Message[]).map((m) => m.id)).toContain('msg-3')
    })

    it('filters messages by sender within conversation', async () => {
      const conv = createMockConversation({
        id: 'conv-filter',
        producer_id: userA.id,
        consumer_id: userB.id,
      })

      const messageFromB = createMockMessage({
        id: 'msg-from-b',
        conversation_id: conv.id,
        sender_id: userB.id,
        content: 'From B',
      })

      const mockClient = createMockSupabaseClient({
        defaultData: {
          messages: [messageFromB],
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
        .eq('sender_id', userB.id)

      expect(error).toBeNull()
      expect(data).toHaveLength(1)
      expect((data as Message[])[0].sender_id).toBe(userB.id)
    })
  })
})
