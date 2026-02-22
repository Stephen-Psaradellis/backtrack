'use client'

/**
 * useChatMessages Hook
 *
 * Custom hook for managing chat messages, pagination, and realtime subscriptions including:
 * - Fetching messages with pagination (cursor-based)
 * - Realtime message subscriptions (new message notifications)
 * - Marking messages as read
 * - Haptic feedback for new messages (with debouncing)
 * - Tracking new message IDs for animation
 *
 * This hook extracts the message fetching and realtime logic from ChatScreen
 * for better separation of concerns and testability.
 */

import { useState, useCallback, useEffect, useRef } from 'react'
import type { RealtimeChannel, RealtimePostgresInsertPayload } from '@supabase/supabase-js'
import { supabase } from '../../lib/supabase'
import { notificationFeedback } from '../../lib/haptics'
import type { Message } from '../../types/database'

// ============================================================================
// CONSTANTS
// ============================================================================

const MESSAGES_PER_PAGE = 50

/**
 * Minimum interval between haptic feedback for received messages (in milliseconds)
 * Prevents haptic spam when multiple messages arrive rapidly
 */
const HAPTIC_DEBOUNCE_MS = 500

// ============================================================================
// TYPES
// ============================================================================

export interface UseChatMessagesReturn {
  messages: Message[]
  loading: boolean
  error: string | null
  hasMoreMessages: boolean
  loadingMore: boolean
  fetchMessages: (isRefresh?: boolean, lastMessageId?: string) => Promise<void>
  markMessagesAsRead: () => Promise<void>
  newMessageIds: Set<string>
}

// ============================================================================
// HOOK
// ============================================================================

/**
 * Hook for managing chat messages, pagination, and realtime subscriptions
 *
 * @param conversationId - The conversation ID to fetch messages for
 * @param userId - The current user's ID (for marking messages as read)
 * @returns Object containing messages, loading state, and control functions
 *
 * @example
 * ```tsx
 * const {
 *   messages,
 *   loading,
 *   error,
 *   hasMoreMessages,
 *   loadingMore,
 *   fetchMessages,
 *   markMessagesAsRead,
 *   newMessageIds,
 * } = useChatMessages(conversationId, userId)
 * ```
 */
export function useChatMessages(conversationId: string, userId: string | null): UseChatMessagesReturn {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hasMoreMessages, setHasMoreMessages] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const realtimeChannelRef = useRef<RealtimeChannel | null>(null)
  const lastMessageHapticRef = useRef<number>(0)
  // Use a ref for messages to avoid recreating fetchMessages when messages change
  const messagesRef = useRef<Message[]>(messages)
  messagesRef.current = messages

  // Track message IDs that arrived via realtime (after initial load) for animation
  const [newMessageIds, setNewMessageIds] = useState<Set<string>>(new Set())
  const initialLoadComplete = useRef(false)

  const fetchMessages = useCallback(async (isRefresh = false, lastMessageId?: string) => {
    if (!isRefresh && !lastMessageId) {
      setLoading(true)
    }
    if (lastMessageId) {
      setLoadingMore(true)
    }

    try {
      let query = supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: false })
        .limit(MESSAGES_PER_PAGE)

      if (lastMessageId) {
        // Use ID-based cursor pagination for reliability
        // This ensures we don't miss messages with identical timestamps
        const lastMessage = messagesRef.current.find(m => m.id === lastMessageId)
        if (lastMessage) {
          // Use compound cursor: (created_at, id) for deterministic pagination
          // Messages with same timestamp are ordered by ID, so we use OR condition
          query = query.or(
            `created_at.lt.${lastMessage.created_at},and(created_at.eq.${lastMessage.created_at},id.lt.${lastMessage.id})`
          )
        }
      }

      const { data, error: fetchError } = await query

      if (fetchError) {
        if (!isRefresh && !lastMessageId) {
          setError('Failed to load messages. Please try again.')
        }
        return
      }

      const newMessages = (data as Message[]) || []

      if (lastMessageId) {
        setMessages(prev => [...prev, ...newMessages])
        setHasMoreMessages(newMessages.length === MESSAGES_PER_PAGE)
      } else {
        setMessages(newMessages)
        setHasMoreMessages(newMessages.length === MESSAGES_PER_PAGE)
        // Mark initial load as complete (messages fetched initially should NOT animate)
        if (!initialLoadComplete.current) {
          initialLoadComplete.current = true
        }
      }

      setError(null)
    } catch {
      if (!isRefresh && !lastMessageId) {
        setError('An unexpected error occurred.')
      }
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [conversationId])

  const markMessagesAsRead = useCallback(async () => {
    if (!userId || messages.length === 0) return

    const unreadMessages = messages.filter(
      m => m.sender_id !== userId && !m.is_read
    )

    if (unreadMessages.length === 0) return

    try {
      const { error: updateError } = await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('conversation_id', conversationId)
        .neq('sender_id', userId)
        .eq('is_read', false)

      if (!updateError) {
        setMessages(prev =>
          prev.map(m =>
            m.sender_id !== userId ? { ...m, is_read: true } : m
          )
        )
      }
    } catch {
      // Silently fail - not critical
    }
  }, [conversationId, messages, userId])

  // Ref to store markMessagesAsRead to avoid recreating subscription
  const markMessagesAsReadRef = useRef(markMessagesAsRead)
  useEffect(() => {
    markMessagesAsReadRef.current = markMessagesAsRead
  }, [markMessagesAsRead])

  // Subscribe to realtime updates
  // IMPORTANT: Only depends on conversationId and userId to prevent memory leak
  // from constant subscription recreation when messages change
  useEffect(() => {
    if (!conversationId || !userId) {
      return
    }

    const channelName = `chat-${conversationId}`

    const handleRealtimeInsert = (
      payload: RealtimePostgresInsertPayload<Message>
    ) => {
      const newMessage = payload.new

      if (newMessage.sender_id !== userId) {
        setMessages(prev => {
          const messageExists = prev.some(m => m.id === newMessage.id)
          if (messageExists) return prev
          return [newMessage, ...prev]
        })

        // Mark this message as new for animation (only if initial load is complete)
        if (initialLoadComplete.current) {
          setNewMessageIds(prev => new Set(prev).add(newMessage.id))
          // Remove from newMessageIds after animation completes (500ms)
          setTimeout(() => {
            setNewMessageIds(prev => {
              const next = new Set(prev)
              next.delete(newMessage.id)
              return next
            })
          }, 500)
        }

        // Use ref to call latest markMessagesAsRead without adding it as dependency
        markMessagesAsReadRef.current()

        // Trigger haptic feedback for incoming messages with debouncing
        const now = Date.now()
        if (now - lastMessageHapticRef.current > HAPTIC_DEBOUNCE_MS) {
          notificationFeedback('success')
          lastMessageHapticRef.current = now
        }
      }
    }

    const channel = supabase
      .channel(channelName, {
        config: {
          broadcast: { self: false },
          presence: { key: userId },
        },
      })
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        handleRealtimeInsert
      )
      .subscribe()

    realtimeChannelRef.current = channel

    return () => {
      if (realtimeChannelRef.current) {
        supabase.removeChannel(realtimeChannelRef.current)
        realtimeChannelRef.current = null
      }
    }
  }, [conversationId, userId])

  return {
    messages,
    loading,
    error,
    hasMoreMessages,
    loadingMore,
    fetchMessages,
    markMessagesAsRead,
    newMessageIds,
  }
}

export default useChatMessages
