/**
 * ChatListScreen
 *
 * Displays a list of all user conversations.
 * Tapping a conversation opens the ChatScreen for that conversation.
 *
 * Features:
 * - FlatList of conversations sorted by most recent activity
 * - Shows last message preview and timestamp
 * - Unread message count badge
 * - Avatar display for the conversation partner
 * - Pull-to-refresh functionality
 * - Empty state when no conversations exist
 * - Loading and error states
 * - Real-time updates for new messages via Supabase Realtime
 *
 * @example
 * ```tsx
 * // This screen is displayed in the ChatsTab of the bottom navigation
 * <MainTabs.Screen name="ChatsTab" component={ChatListScreen} />
 * ```
 */

import React, { useState, useCallback, useEffect, useRef } from 'react'
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Platform,
} from 'react-native'
import { useNavigation, useFocusEffect } from '@react-navigation/native'

import { SmallAvatarPreview, MediumAvatarPreview } from '../components/AvatarPreview'
import { lightFeedback } from '../lib/haptics'
import { LoadingSpinner } from '../components/LoadingSpinner'
import { EmptyChats, ErrorState } from '../components/EmptyState'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { getUserRole } from '../lib/conversations'
import { getHiddenUserIds } from '../lib/moderation'
import type { MainTabNavigationProp } from '../navigation/types'
import type { Conversation, Message, Post } from '../types/database'
import type { AvatarConfig } from '../types/avatar'
import type { RealtimeChannel, RealtimePostgresInsertPayload } from '@supabase/supabase-js'

// ============================================================================
// TYPES
// ============================================================================

/**
 * Conversation item with additional display information
 */
interface ConversationItem extends Conversation {
  /** The post's target avatar for display */
  target_avatar: AvatarConfig | null
  /** Preview of the most recent message */
  last_message_content: string | null
  /** Timestamp of the most recent message */
  last_message_at: string | null
  /** Sender ID of the last message */
  last_message_sender_id: string | null
  /** Number of unread messages */
  unread_count: number
  /** Location name for context */
  location_name: string | null
}

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Colors used in the ChatListScreen
 */
const COLORS = {
  primary: '#007AFF',
  background: '#F2F2F7',
  cardBackground: '#FFFFFF',
  textPrimary: '#000000',
  textSecondary: '#8E8E93',
  border: '#E5E5EA',
  unreadBadge: '#FF3B30',
  unreadBadgeText: '#FFFFFF',
} as const

/**
 * Maximum length for message preview
 */
const MAX_PREVIEW_LENGTH = 50

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Format a timestamp for display in the conversation list
 *
 * @param timestamp - ISO timestamp string
 * @returns Formatted time string (e.g., "2:30 PM", "Yesterday", "Dec 15")
 */
function formatConversationTime(timestamp: string | null): string {
  if (!timestamp) return ''

  const date = new Date(timestamp)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  // Today - show time
  if (diffDays === 0) {
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  }

  // Yesterday
  if (diffDays === 1) {
    return 'Yesterday'
  }

  // Within a week - show day name
  if (diffDays < 7) {
    return date.toLocaleDateString([], { weekday: 'short' })
  }

  // Older - show date
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

/**
 * Truncate message content for preview display
 *
 * @param content - Full message content
 * @param maxLength - Maximum length before truncation
 * @returns Truncated message with ellipsis if needed
 */
function truncateMessage(content: string | null, maxLength: number = MAX_PREVIEW_LENGTH): string {
  if (!content) return 'No messages yet'

  if (content.length <= maxLength) return content

  // Truncate at word boundary if possible
  const truncated = content.substring(0, maxLength)
  const lastSpace = truncated.lastIndexOf(' ')

  if (lastSpace > maxLength - 15) {
    return truncated.substring(0, lastSpace) + '...'
  }

  return truncated + '...'
}

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * ChatListScreen - View all user conversations
 *
 * Fetches and displays all conversations for the current user,
 * sorted by most recent activity.
 */
export function ChatListScreen(): JSX.Element {
  // ---------------------------------------------------------------------------
  // HOOKS
  // ---------------------------------------------------------------------------

  const navigation = useNavigation<MainTabNavigationProp>()
  const { userId } = useAuth()

  // ---------------------------------------------------------------------------
  // REFS
  // ---------------------------------------------------------------------------

  const realtimeChannelRef = useRef<RealtimeChannel | null>(null)

  // ---------------------------------------------------------------------------
  // STATE
  // ---------------------------------------------------------------------------

  const [conversations, setConversations] = useState<ConversationItem[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // ---------------------------------------------------------------------------
  // DATA FETCHING
  // ---------------------------------------------------------------------------

  /**
   * Fetch all conversations for the current user
   * Filters out conversations with blocked users
   */
  const fetchConversations = useCallback(async (isRefresh = false) => {
    if (!userId) {
      setLoading(false)
      return
    }

    if (!isRefresh) {
      setLoading(true)
    }
    setError(null)

    try {
      // Get list of hidden user IDs (blocked users + users who blocked us)
      let hiddenUserIds: string[] = []
      const hiddenResult = await getHiddenUserIds(userId)
      if (hiddenResult.success) {
        hiddenUserIds = hiddenResult.hiddenUserIds
      }

      // Fetch conversations where user is producer or consumer
      const { data: conversationsData, error: fetchError } = await supabase
        .from('conversations')
        .select(`
          *,
          posts:post_id (
            id,
            target_avatar,
            note,
            location_id,
            locations:location_id (
              name
            )
          )
        `)
        .or(`producer_id.eq.${userId},consumer_id.eq.${userId}`)
        .eq('is_active', true)
        .order('updated_at', { ascending: false })

      if (fetchError) {
        setError('Failed to load conversations. Please try again.')
        return
      }

      if (!conversationsData) {
        setConversations([])
        return
      }

      // Filter out conversations with hidden users (blocked users or users who blocked us)
      const filteredConversations = conversationsData.filter((conv) => {
        // Determine the other user in the conversation
        const otherUserId = conv.producer_id === userId ? conv.consumer_id : conv.producer_id
        // Only include if the other user is not hidden
        return !hiddenUserIds.includes(otherUserId)
      })

      // Fetch last message and unread count for each conversation
      const conversationItems: ConversationItem[] = await Promise.all(
        filteredConversations.map(async (conv) => {
          // Fetch last message
          const { data: lastMessageData } = await supabase
            .from('messages')
            .select('content, created_at, sender_id')
            .eq('conversation_id', conv.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single()

          // Fetch unread count
          const { count: unreadCount } = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('conversation_id', conv.id)
            .eq('is_read', false)
            .neq('sender_id', userId)

          // Extract post data
          const post = conv.posts as unknown as {
            id: string
            target_avatar: AvatarConfig
            note: string
            location_id: string
            locations: { name: string } | null
          } | null

          return {
            ...conv,
            target_avatar: post?.target_avatar || null,
            last_message_content: lastMessageData?.content || null,
            last_message_at: lastMessageData?.created_at || conv.updated_at,
            last_message_sender_id: lastMessageData?.sender_id || null,
            unread_count: unreadCount || 0,
            location_name: post?.locations?.name || null,
          } as ConversationItem
        })
      )

      // Sort by last message time
      conversationItems.sort((a, b) => {
        const aTime = a.last_message_at || a.updated_at
        const bTime = b.last_message_at || b.updated_at
        return new Date(bTime).getTime() - new Date(aTime).getTime()
      })

      setConversations(conversationItems)
    } catch {
      setError('An unexpected error occurred.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [userId])

  // ---------------------------------------------------------------------------
  // EFFECTS
  // ---------------------------------------------------------------------------

  /**
   * Fetch conversations when screen gains focus
   * This ensures the list is refreshed when returning from ChatScreen
   */
  useFocusEffect(
    useCallback(() => {
      fetchConversations()
    }, [fetchConversations])
  )

  /**
   * Subscribe to real-time message updates
   * When a new message arrives, refresh the conversation list
   */
  useEffect(() => {
    if (!userId) return

    // Create a unique channel name
    const channelName = `chatlist-${userId}`

    // Handle incoming messages
    const handleMessageInsert = (
      payload: RealtimePostgresInsertPayload<Message>
    ) => {
      const newMessage = payload.new

      // Update the conversation that received the new message
      setConversations((prevConversations) => {
        const updatedConversations = prevConversations.map((conv) => {
          if (conv.id === newMessage.conversation_id) {
            return {
              ...conv,
              last_message_content: newMessage.content,
              last_message_at: newMessage.created_at,
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
          const aTime = a.last_message_at || a.updated_at
          const bTime = b.last_message_at || b.updated_at
          return new Date(bTime).getTime() - new Date(aTime).getTime()
        })
      })
    }

    // Subscribe to message inserts
    // Note: We filter client-side since we can't filter by conversation membership in realtime
    const channel = supabase
      .channel(channelName)
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

    realtimeChannelRef.current = channel

    return () => {
      if (realtimeChannelRef.current) {
        supabase.removeChannel(realtimeChannelRef.current)
        realtimeChannelRef.current = null
      }
    }
  }, [userId])

  // ---------------------------------------------------------------------------
  // HANDLERS
  // ---------------------------------------------------------------------------

  /**
   * Handle pull-to-refresh
   */
  const handleRefresh = useCallback(() => {
    setRefreshing(true)
    fetchConversations(true)
  }, [fetchConversations])

  /**
   * Handle conversation press - navigate to chat
   */
  const handleConversationPress = useCallback(
    async (conversation: ConversationItem) => {
      await lightFeedback()
      navigation.navigate('Chat', { conversationId: conversation.id })
    },
    [navigation]
  )

  /**
   * Handle retry on error
   */
  const handleRetry = useCallback(() => {
    fetchConversations()
  }, [fetchConversations])

  // ---------------------------------------------------------------------------
  // RENDER HELPERS
  // ---------------------------------------------------------------------------

  /**
   * Render individual conversation item
   */
  const renderConversation = useCallback(
    ({ item }: { item: ConversationItem }) => {
      const role = getUserRole(item, userId || '')
      const roleLabel = role === 'producer' ? 'Consumer' : 'Producer'
      const hasUnread = item.unread_count > 0
      const isOwnLastMessage = item.last_message_sender_id === userId

      return (
        <TouchableOpacity
          style={styles.conversationItem}
          onPress={() => handleConversationPress(item)}
          activeOpacity={0.7}
          testID={`chat-list-item-${item.id}`}
        >
          {/* Avatar */}
          <View style={styles.avatarContainer}>
            {item.target_avatar ? (
              <MediumAvatarPreview config={item.target_avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarPlaceholderText}>?</Text>
              </View>
            )}
          </View>

          {/* Content */}
          <View style={styles.contentContainer}>
            {/* Header row */}
            <View style={styles.headerRow}>
              <Text
                style={[styles.title, hasUnread && styles.titleUnread]}
                numberOfLines={1}
              >
                Chat with {roleLabel}
              </Text>
              <Text style={styles.timestamp}>
                {formatConversationTime(item.last_message_at)}
              </Text>
            </View>

            {/* Location subtitle */}
            {item.location_name && (
              <Text style={styles.location} numberOfLines={1}>
                📍 {item.location_name}
              </Text>
            )}

            {/* Message preview and badge row */}
            <View style={styles.messageRow}>
              <Text
                style={[styles.messagePreview, isOwnLastMessage && styles.ownMessage]}
                numberOfLines={1}
              >
                {isOwnLastMessage && 'You: '}
                {truncateMessage(item.last_message_content)}
              </Text>
              {hasUnread && (
                <View style={styles.unreadBadge}>
                  <Text style={styles.unreadBadgeText}>
                    {item.unread_count > 99 ? '99+' : item.unread_count}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </TouchableOpacity>
      )
    },
    [userId, handleConversationPress]
  )

  // ---------------------------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------------------------

  if (loading && conversations.length === 0) {
    return <LoadingSpinner />
  }

  if (error) {
    return <ErrorState message={error} onRetry={handleRetry} />
  }

  if (conversations.length === 0) {
    return <EmptyChats />
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={conversations}
        renderItem={renderConversation}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      />
    </View>
  )
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  conversationItem: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: COLORS.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    alignItems: 'flex-start',
  },
  avatarContainer: {
    marginRight: 12,
    marginTop: 4,
  },
  avatarPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarPlaceholderText: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  title: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.textPrimary,
    marginRight: 8,
  },
  titleUnread: {
    fontWeight: '600',
  },
  timestamp: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  location: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  messagePreview: {
    flex: 1,
    fontSize: 13,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
    marginRight: 8,
  },
  ownMessage: {
    color: COLORS.textSecondary,
  },
  unreadBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: COLORS.unreadBadge,
    minWidth: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  unreadBadgeText: {
    color: COLORS.unreadBadgeText,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
})