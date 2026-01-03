'use client'

/**
 * useChatMessages Hook
 *
 * Custom hook for managing chat messages including:
 * - Initial message fetching on mount
 * - Pagination for loading older messages
 * - Real-time message subscription via Supabase
 * - Mark messages as read functionality
 * - Error handling and loading states
 *
 * This hook extracts the message-related logic from ChatScreen
 * for better separation of concerns and reusability.
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../../../lib/supabase'
import type { UUID } from '../../../types/database'
import type { MessageWithSender, UseChatMessagesReturn } from '../../../types/chat'
import { CHAT_CONSTANTS } from '../../../types/chat'

/**
 * Options for the useChatMessages hook
 */
export interface UseChatMessagesOptions {
  /** The conversation ID to fetch messages for */
  conversationId: UUID
  /** The current user's ID (used to filter own messages from subscription) */
  currentUserId: UUID
  /** Optional callback when a new message is received */
  onNewMessage?: (message: MessageWithSender) => void
}

/**
 * useChatMessages - Hook for managing chat message state and subscriptions
 *
 * @param options - Configuration options for the hook
 * @returns Object containing messages, loading states, error, and control functions
 *
 * @example
 * ```tsx
 * const {
 *   messages,
 *   isLoading,
 *   isLoadingMore,
 *   hasMoreMessages,
 *   error,
 *   loadMore,
 *   markAsRead,
 *   addMessage,
 * } = useChatMessages({
 *   conversationId: 'conv-123',
 *   currentUserId: 'user-456',
 * })
 * ```
 */
export function useChatMessages({
  conversationId,
  currentUserId,
  onNewMessage,
}: UseChatMessagesOptions): UseChatMessagesReturn {
  // supabase imported from lib/supabase

  // ============================================================================
  // State
  // ============================================================================

  /** Array of messages with sender information */
  const [messages, setMessages] = useState<MessageWithSender[]>([])

  /** Loading state for initial message fetch */
  const [isLoading, setIsLoading] = useState(true)

  /** Loading state for pagination (loading older messages) */
  const [isLoadingMore, setIsLoadingMore] = useState(false)

  /** Whether there are more older messages to load */
  const [hasMoreMessages, setHasMoreMessages] = useState(true)

  /** Error message if any operation fails */
  const [error, setError] = useState<string | null>(null)

  // ============================================================================
  // Refs
  // ============================================================================

  /** Track if initial load has been performed */
  const initialLoadRef = useRef(false)

  /** Track container scroll position for maintaining scroll after pagination */
  const scrollStateRef = useRef<{
    container: HTMLElement | null
    previousScrollHeight: number
  }>({ container: null, previousScrollHeight: 0 })

  // ============================================================================
  // Message Fetching
  // ============================================================================

  /**
   * Fetch initial messages for the conversation
   * Orders by created_at descending to get latest messages first,
   * then reverses for chronological display
   */
  const loadMessages = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      const { data, error: fetchError } = await supabase
        .from('messages')
        .select(
          `
          *,
          sender:profiles!sender_id(*)
        `
        )
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: false })
        .limit(CHAT_CONSTANTS.MESSAGES_PER_PAGE)

      if (fetchError) {
        throw fetchError
      }

      // Reverse to get chronological order (oldest first)
      const messagesData = (data || []).reverse() as MessageWithSender[]
      setMessages(messagesData)
      setHasMoreMessages(messagesData.length === CHAT_CONSTANTS.MESSAGES_PER_PAGE)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load messages'
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [conversationId, supabase])

  /**
   * Load older messages for pagination
   * Uses cursor-based pagination with the oldest message's created_at timestamp
   */
  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMoreMessages || messages.length === 0) {
      return
    }

    try {
      setIsLoadingMore(true)

      const oldestMessage = messages[0]

      const { data, error: fetchError } = await supabase
        .from('messages')
        .select(
          `
          *,
          sender:profiles!sender_id(*)
        `
        )
        .eq('conversation_id', conversationId)
        .lt('created_at', oldestMessage.created_at)
        .order('created_at', { ascending: false })
        .limit(CHAT_CONSTANTS.MESSAGES_PER_PAGE)

      if (fetchError) {
        throw fetchError
      }

      // Reverse to get chronological order and prepend to existing messages
      const olderMessages = (data || []).reverse() as MessageWithSender[]
      setMessages((prev) => [...olderMessages, ...prev])
      setHasMoreMessages(olderMessages.length === CHAT_CONSTANTS.MESSAGES_PER_PAGE)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load more messages'
      setError(errorMessage)
    } finally {
      setIsLoadingMore(false)
    }
  }, [conversationId, hasMoreMessages, isLoadingMore, messages, supabase])

  // ============================================================================
  // Message Management
  // ============================================================================

  /**
   * Mark all unread messages in the conversation as read
   * Silently fails as read receipts are not critical
   */
  const markAsRead = useCallback(async () => {
    if (!conversationId) {
      return
    }

    try {
      await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('conversation_id', conversationId)
        .neq('sender_id', currentUserId)
        .eq('is_read', false)
    } catch {
      // Silent fail for read receipts - not critical functionality
    }
  }, [conversationId, currentUserId, supabase])

  /**
   * Add a new message to the messages array
   * Used for adding messages from real-time subscription
   * or for adding messages after successful send
   */
  const addMessage = useCallback((message: MessageWithSender) => {
    setMessages((prev) => {
      // Check if message already exists to prevent duplicates
      const exists = prev.some((m) => m.id === message.id)
      if (exists) {
        return prev
      }
      return [...prev, message]
    })
  }, [])

  // ============================================================================
  // Effects
  // ============================================================================

  /**
   * Effect: Load initial messages on mount
   */
  useEffect(() => {
    if (!initialLoadRef.current) {
      initialLoadRef.current = true
      loadMessages()
    }
  }, [loadMessages])

  /**
   * Effect: Real-time subscription for new messages
   * Subscribes to INSERT events on the messages table for this conversation
   */
  useEffect(() => {
    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        async (payload) => {
          // Don't add our own messages (handled by optimistic updates in useSendMessage)
          if (payload.new.sender_id === currentUserId) {
            return
          }

          // Fetch the full message with sender profile
          const { data } = await supabase
            .from('messages')
            .select(
              `
              *,
              sender:profiles!sender_id(*)
            `
            )
            .eq('id', payload.new.id)
            .single()

          if (data) {
            const newMessage = data as MessageWithSender
            addMessage(newMessage)

            // Call the optional callback for new messages
            if (onNewMessage) {
              onNewMessage(newMessage)
            }

            // Mark as read since user is viewing the conversation
            markAsRead()
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [conversationId, currentUserId, supabase, addMessage, markAsRead, onNewMessage])

  /**
   * Effect: Mark messages as read when messages change
   */
  useEffect(() => {
    if (messages.length > 0) {
      markAsRead()
    }
  }, [messages.length, markAsRead])

  // ============================================================================
  // Return
  // ============================================================================

  return {
    messages,
    isLoading,
    isLoadingMore,
    hasMoreMessages,
    error,
    loadMore,
    markAsRead,
    addMessage,
  }
}

export default useChatMessages
