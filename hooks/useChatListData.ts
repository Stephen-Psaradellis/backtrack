/**
 * useChatListData Hook
 *
 * TanStack Query hook for fetching chat list data with optimized RPC.
 * Replaces N+1 query waterfall (80-100 queries) with single RPC call.
 *
 * Features:
 * - Single optimized query via get_user_conversations_with_details RPC
 * - 30s stale time for performance
 * - Real-time subscription for new messages (updates cache)
 * - Automatic cache invalidation on new messages
 * - Type-safe return values
 *
 * @example
 * ```tsx
 * const { data, isLoading, error, refetch } = useChatListData(userId)
 *
 * if (isLoading) return <LoadingSpinner />
 * if (error) return <ErrorState />
 *
 * return (
 *   <FlatList
 *     data={data}
 *     renderItem={({ item }) => <ConversationItem conversation={item} />}
 *   />
 * )
 * ```
 */

import { useEffect, useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { queryKeys } from './useQueryConfig'
import type { StoredAvatar } from 'react-native-bitmoji'
import type { RealtimeChannel, RealtimePostgresInsertPayload } from '@supabase/supabase-js'
import type { Message } from '../types/database'

// ============================================================================
// TYPES
// ============================================================================

/**
 * Conversation data returned from the optimized RPC
 */
export interface ConversationWithDetails {
  /** Conversation ID */
  conversation_id: string
  /** Producer (post creator) user ID */
  producer_id: string
  /** Consumer (person who initiated chat) user ID */
  consumer_id: string
  /** Associated post ID */
  post_id: string | null
  /** Conversation status */
  status: string
  /** Last activity timestamp */
  updated_at: string
  /** Conversation creation timestamp */
  created_at: string

  /** The other user in the conversation */
  other_user_id: string
  /** Whether the other user is verified */
  other_user_is_verified: boolean

  /** Content of the last message */
  last_message_content: string | null
  /** Sender ID of the last message */
  last_message_sender_id: string | null
  /** Timestamp of the last message */
  last_message_created_at: string | null

  /** Number of unread messages */
  unread_count: number

  /** Post's target avatar configuration */
  post_target_avatar_v2: StoredAvatar | null

  /** Location name for context */
  location_name: string | null
}

/**
 * Return type for useChatListData hook
 */
export interface UseChatListDataResult {
  /** Conversation list data */
  data: ConversationWithDetails[]
  /** Loading state */
  isLoading: boolean
  /** Error state */
  error: Error | null
  /** Refresh function */
  refetch: () => void
  /** Is currently refreshing */
  isRefetching: boolean
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Fetch conversations from the optimized RPC
 *
 * @param userId - User ID to fetch conversations for
 * @returns Array of conversation data
 */
async function fetchConversations(userId: string): Promise<ConversationWithDetails[]> {
  const { data, error } = await supabase.rpc('get_user_conversations_with_details', {
    p_user_id: userId,
  })

  if (error) {
    throw new Error(error.message || 'Failed to load conversations')
  }

  return (data || []) as ConversationWithDetails[]
}

// ============================================================================
// MAIN HOOK
// ============================================================================

/**
 * Hook to fetch and manage chat list data
 *
 * Uses TanStack Query for caching and real-time subscriptions for updates.
 * Single RPC call replaces 80-100 individual queries.
 *
 * @param userId - Current user ID
 * @returns Chat list data, loading state, and refetch function
 */
export function useChatListData(userId: string | null): UseChatListDataResult {
  const queryClient = useQueryClient()

  // Query configuration
  const {
    data = [],
    isLoading,
    error,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: queryKeys.conversations.list(),
    queryFn: () => fetchConversations(userId!),
    enabled: !!userId, // Only run if userId is available
    staleTime: 30 * 1000, // 30 seconds - matches existing pattern
    gcTime: 5 * 60 * 1000, // 5 minutes cache
    retry: 2,
  })

  /**
   * Update conversation in cache when new message arrives
   */
  const updateConversationCache = useCallback(
    (newMessage: Message) => {
      queryClient.setQueryData<ConversationWithDetails[]>(
        queryKeys.conversations.list(),
        (oldData) => {
          if (!oldData) return oldData

          // Update the conversation that received the message
          const updatedConversations = oldData.map((conv) => {
            if (conv.conversation_id === newMessage.conversation_id) {
              return {
                ...conv,
                last_message_content: newMessage.content,
                last_message_created_at: newMessage.created_at,
                last_message_sender_id: newMessage.sender_id,
                // Increment unread count if message is from other user
                unread_count:
                  newMessage.sender_id !== userId
                    ? conv.unread_count + 1
                    : conv.unread_count,
              }
            }
            return conv
          })

          // Re-sort by last message time
          return updatedConversations.sort((a, b) => {
            const aTime = a.last_message_created_at || a.updated_at
            const bTime = b.last_message_created_at || b.updated_at
            return new Date(bTime).getTime() - new Date(aTime).getTime()
          })
        }
      )
    },
    [queryClient, userId]
  )

  /**
   * Subscribe to real-time message updates
   */
  useEffect(() => {
    if (!userId) return

    let channel: RealtimeChannel | null = null

    // Handle new message inserts
    const handleMessageInsert = (payload: RealtimePostgresInsertPayload<Message>) => {
      const newMessage = payload.new
      updateConversationCache(newMessage)
    }

    // Subscribe to message inserts
    channel = supabase
      .channel(`chatlist-${userId}`)
      .on<Message>(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        handleMessageInsert
      )
      .subscribe()

    return () => {
      if (channel) {
        supabase.removeChannel(channel)
      }
    }
  }, [userId, updateConversationCache])

  return {
    data,
    isLoading,
    error: error as Error | null,
    refetch: () => {
      refetch()
    },
    isRefetching,
  }
}

/**
 * Invalidate chat list cache
 * Useful after blocking a user or other moderation actions
 */
export function invalidateChatListCache() {
  const queryClient = useQueryClient()
  queryClient.invalidateQueries({ queryKey: queryKeys.conversations.list() })
}
