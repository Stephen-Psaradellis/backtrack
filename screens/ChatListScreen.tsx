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
 * - OPTIMIZED: Single RPC call instead of N+1 query waterfall (80-100 queries -> 1 query)
 *
 * @example
 * ```tsx
 * // This screen is displayed in the ChatsTab of the bottom navigation
 * <MainTabs.Screen name="ChatsTab" component={ChatListScreen} />
 * ```
 */

import React, { useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  StatusBar,
} from 'react-native'
import { useNavigation } from '@react-navigation/native'

import { GlobalHeader } from '../components/navigation/GlobalHeader'
import { FloatingActionButtons } from '../components/navigation/FloatingActionButtons'
import { PressableScale } from '../components/native/PressableScale'
import { darkTheme } from '../constants/glassStyles'
import { spacing } from '../constants/theme'
import { AvatarDisplay } from '../components/AvatarDisplay'
import { VerifiedBadge } from '../components/VerifiedBadge'
import { lightFeedback } from '../lib/haptics'
import { EmptyChats, ErrorState } from '../components/EmptyState'
import { SkeletonChatItem } from '../components/Skeleton'
import { useAuth } from '../contexts/AuthContext'
import { useChatListData, type ConversationWithDetails } from '../hooks/useChatListData'
import type { MainTabNavigationProp } from '../navigation/types'

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Colors used in the ChatListScreen - Dark theme
 */
const COLORS = {
  primary: darkTheme.accent,
  background: darkTheme.background,
  cardBackground: darkTheme.cardBackground,
  textPrimary: darkTheme.textPrimary,
  textSecondary: darkTheme.textSecondary,
  border: darkTheme.cardBorder,
  unreadBadge: darkTheme.accent,
  unreadBadgeText: darkTheme.textPrimary,
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

/**
 * Stable separator component (extracted to avoid re-creating on every render)
 */
const ItemSeparator = () => <View style={styles.separator} />

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * ChatListScreen - View all user conversations
 *
 * Uses optimized RPC for data fetching to avoid N+1 query waterfall.
 */
export function ChatListScreen(): React.ReactNode {
  // ---------------------------------------------------------------------------
  // HOOKS
  // ---------------------------------------------------------------------------

  const navigation = useNavigation<MainTabNavigationProp>()
  const { userId } = useAuth()

  // Use optimized data fetching hook (1 RPC instead of 80-100 queries)
  const { data: conversations, isLoading, error, refetch, isRefetching } = useChatListData(userId)

  // ---------------------------------------------------------------------------
  // HANDLERS
  // ---------------------------------------------------------------------------

  /**
   * Handle pull-to-refresh
   */
  const handleRefresh = useCallback(() => {
    refetch()
  }, [refetch])

  /**
   * Handle conversation press - navigate to chat
   */
  const handleConversationPress = useCallback(
    async (conversation: ConversationWithDetails) => {
      await lightFeedback()
      navigation.navigate('Chat', { conversationId: conversation.conversation_id })
    },
    [navigation]
  )

  /**
   * Handle retry on error
   */
  const handleRetry = useCallback(() => {
    refetch()
  }, [refetch])

  // ---------------------------------------------------------------------------
  // RENDER HELPERS
  // ---------------------------------------------------------------------------

  /**
   * Render individual conversation item
   */
  const renderConversation = useCallback(
    ({ item }: { item: ConversationWithDetails }) => {
      const hasUnread = item.unread_count > 0
      const isOwnLastMessage = item.last_message_sender_id === userId
      const displayTitle = item.location_name
        ? `Missed Connection at ${item.location_name}`
        : 'Missed Connection'

      return (
        <PressableScale
          onPress={() => handleConversationPress(item)}
          testID={`chat-list-item-${item.conversation_id}`}
        >
          <View style={styles.conversationItem}>
            {/* Avatar with optional verified badge */}
            <View style={styles.avatarContainer}>
              {item.post_target_avatar_v2 ? (
                <>
                  <AvatarDisplay avatar={item.post_target_avatar_v2} size="md" />
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
                  {displayTitle}
                </Text>
                <Text style={styles.timestamp}>
                  {formatConversationTime(item.last_message_created_at)}
                </Text>
              </View>

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
          </View>
        </PressableScale>
      )
    },
    [userId, handleConversationPress]
  )

  /**
   * Extract key for FlatList optimization
   */
  const keyExtractor = useCallback(
    (item: ConversationWithDetails) => item.conversation_id,
    []
  )

  // ---------------------------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------------------------

  if (isLoading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={darkTheme.background} />
        <GlobalHeader />
        <View style={styles.skeletonContainer}>
          {Array.from({ length: 5 }).map((_, index) => (
            <SkeletonChatItem key={index} style={index > 0 ? styles.skeletonItem : undefined} />
          ))}
        </View>
      </View>
    )
  }

  if (error) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={darkTheme.background} />
        <GlobalHeader />
        <View style={styles.centerContainer}>
          <ErrorState onRetry={handleRetry} />
        </View>
      </View>
    )
  }

  if (conversations.length === 0) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={darkTheme.background} />
        <GlobalHeader />
        <View style={styles.centerContainer}>
          <EmptyChats />
        </View>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={darkTheme.background} />
      <GlobalHeader />
      <FloatingActionButtons testID="chats-floating-actions" isVisible={false} />
      <FlatList
        data={conversations}
        keyExtractor={keyExtractor}
        renderItem={renderConversation}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={handleRefresh}
            tintColor={COLORS.primary}
            progressBackgroundColor={darkTheme.cardBackground}
          />
        }
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={ItemSeparator}
        windowSize={5}
        maxToRenderPerBatch={5}
        removeClippedSubviews={true}
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
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  skeletonContainer: {
    flex: 1,
    paddingTop: spacing[2],
  },
  skeletonItem: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  listContent: {
    paddingTop: spacing[2],
    paddingBottom: spacing[4],
  },
  conversationItem: {
    flexDirection: 'row',
    padding: spacing[3],
    backgroundColor: COLORS.cardBackground,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: spacing[3],
    marginTop: spacing[1],
  },
  verifiedBadgeContainer: {
    position: 'absolute',
    bottom: spacing[1] * -1,
    right: spacing[1] * -1,
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
    marginBottom: spacing[1],
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
    marginLeft: spacing[2],
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
    paddingHorizontal: spacing[1.5],
    paddingVertical: spacing[0.5],
    marginLeft: spacing[2],
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
