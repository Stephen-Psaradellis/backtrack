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
 * - Verified badge for verified users
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
} from 'react-native'
import { useNavigation, useFocusEffect } from '@react-navigation/native'

import { MdAvatarSnapshot } from '../components/avatar3d'
import type { StoredAvatar } from '../components/avatar/types'
import { VerifiedBadge } from '../components/VerifiedBadge'
import { lightFeedback } from '../lib/haptics'
import { LoadingSpinner } from '../components/LoadingSpinner'
import { EmptyChats, ErrorState } from '../components/EmptyState'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { getUserRole } from '../lib/conversations'
import { getHiddenUserIds } from '../lib/moderation'
import type { MainTabNavigationProp } from '../navigation/types'
import type { Conversation, Message } from '../types/database'
import type { RealtimeChannel, RealtimePostgresInsertPayload } from '@supabase/supabase-js'

// ============================================================================
// TYPES
// ============================================================================

/**
 * Conversation item with additional display information
 */
interface ConversationItem extends Conversation {
  /** The post's target avatar for display */
  target_avatar_v2: StoredAvatar | null
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
  /** Whether the other user in the conversation is verified */
  other_user_is_verified: boolean
}

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Colors used in the ChatListScreen
 */
const COLORS = {
  primary: '#FF6B47',
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
  const diffDays =Math.floor(diffMs / (1000 * 60 * 60 * 24))

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
export function ChatListScreen(): React.ReactNode {
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
      // This is optional - if it fails, we just show all conversations
      let hiddenUserIds: string[] = []
      try {
        const hiddenResult = await getHiddenUserIds(userId)
        if (hiddenResult.success) {
          hiddenUserIds = hiddenResult.hiddenUserIds
        }
      } catch {
        // Silently ignore - getHiddenUserIds RPC may not exist yet
        console.warn('getHiddenUserIds failed, showing all conversations')
      }

      // Fetch conversations where user is producer or consumer
      // Simplified query - fetch posts data separately to avoid nested join issues
      const { data: conversationsData, error: fetchError } = await supabase
        .from('conversations')
        .select('*')
        .or(`producer_id.eq.${userId},consumer_id.eq.${userId}`)
        .eq('is_active', true)
        .order('updated_at', { ascending: false })

      if (fetchError) {
        console.error('Failed to fetch conversations:', fetchError)
        setError('Failed to load conversations. Please try again.')
        return
      }

      if (!conversationsData || conversationsData.length === 0) {
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
          // Determine the other user's ID
          const otherUserId = conv.producer_id === userId ? conv.consumer_id : conv.producer_id

          // Fetch last message - use maybeSingle() to handle no messages case
          const { data: lastMessageData } = await supabase
            .from('messages')
            .select('content, created_at, sender_id')
            .eq('conversation_id', conv.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle()

          // Fetch unread count
          const { count: unreadCount } = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('conversation_id', conv.id)
            .eq('is_read', false)
            .neq('sender_id', userId)

          // Fetch other user's verification status - use maybeSingle() to handle missing profile
          const { data: otherUserProfile } = await supabase
            .from('profiles')
            .select('is_verified')
            .eq('id', otherUserId)
            .maybeSingle()

          // Fetch post data separately to avoid nested join issues
          let postData: {
            id: string
            target_avatar_v2: StoredAvatar | null
            note: string
            location_id: string
          } | null = null
          let locationName: string | null = null

          if (conv.post_id) {
            const { data: post } = await supabase
              .from('posts')
              .select('id, target_avatar_v2, note, location_id')
              .eq('id', conv.post_id)
              .maybeSingle()

            if (post) {
              postData = post as {
                id: string
                target_avatar_v2: StoredAvatar | null
                note: string
                location_id: string
              }
              // Fetch location name
              if (post.location_id) {
                const { data: location } = await supabase
                  .from('locations')
                  .select('name')
                  .eq('id', post.location_id)
                  .maybeSingle()
                locationName = location?.name || null
              }
            }
          }

          return {
            ...conv,
            target_avatar_v2: postData?.target_avatar_v2 || null,
            last_message_content: lastMessageData?.content || null,
            last_message_at: lastMessageData?.created_at || conv.updated_at,
            last_message_sender_id: lastMessageData?.sender_id || null,
            unread_count: unreadCount || 0,
            location_name: locationName,
            other_user_is_verified: otherUserProfile?.is_verified ?? false,
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
    } catch (err) {
      console.error('Unexpected error fetching conversations:', err)
      setError('An unexpected error occurred. Please try again.')
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
   * Fetch when userId becomes available (handles late auth initialization)
   * This ensures conversations load even if auth completes after initial render
   */
  useEffect(() => {
    if (userId && conversations.length === 0 && !error) {
      fetchConversations()
    }
  }, [userId]) // eslint-disable-line react-hooks/exhaustive-deps

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
          {/* Avatar with optional verified badge */}
          <View style={styles.avatarContainer}>
            {item.target_avatar_v2 ? (
              <>
                <MdAvatarSnapshot avatar={item.target_avatar_v2} />
                {item.other_user_is_verified && (
                  <View style={styles.verifiedBadgeContainer}>
                    <VerifiedBadge />
                  </View>
                )}
              </>
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
                {item.location_name}
              </Text>
            )}

            {/* Message preview and unread badge */}
            <View style={styles.messageRow}>
              <Text
                style={[
                  styles.messagePreview,
                  isOwnLastMessage && styles.messagePreviewOwn,
                  hasUnread && styles.messagePreviewUnread,
                ]}
                numberOfLines={1}
              >
                {isOwnLastMessage ? 'You: ' : ''}
                {truncateMessage(item.last_message_content)}
              </Text>

              {/* Unread badge */}
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
    [userId]
  )

  // ---------------------------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------------------------

  if (loading) {
    return (
      <View style={styles.container}>
        <LoadingSpinner />
      </View>
    )
  }

  if (error) {
    return (
      <View style={styles.container}>
        <ErrorState onRetry={handleRetry} />
      </View>
    )
  }

  if (conversations.length === 0) {
    return (
      <View style={styles.container}>
        <EmptyChats />
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={conversations}
        keyExtractor={(item) => item.id}
        renderItem={renderConversation}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={COLORS.primary}
          />
        }
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        testID="chat-list"
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
  listContent: {
    paddingBottom: 16,
  },
  conversationItem: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: COLORS.cardBackground,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
    marginTop: 4,
  },
  verifiedBadgeContainer: {
    position: 'absolute',
    bottom: -4,
    right: -4,
  },
  avatarPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarPlaceholderText: {
    fontSize: 24,
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
  },
  titleUnread: {
    fontWeight: '600',
  },
  timestamp: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginLeft: 8,
  },
  location: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  messageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  messagePreview: {
    flex: 1,
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  messagePreviewOwn: {
    fontWeight: '500',
  },
  messagePreviewUnread: {
    color: COLORS.textPrimary,
    fontWeight: '500',
  },
  unreadBadge: {
    backgroundColor: COLORS.unreadBadge,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 8,
  },
  unreadBadgeText: {
    color: COLORS.unreadBadgeText,
    fontSize: 11,
    fontWeight: '600',
  },
  separator: {
    height: 1,
    backgroundColor: COLORS.border,
  },
})