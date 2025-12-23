/**
 * ChatScreen
 *
 * Displays an anonymous chat conversation between a post producer and consumer.
 * Supports real-time message display, message input, and sending new messages.
 *
 * Features:
 * - Message list with ChatBubble components
 * - Message input with send button
 * - Loading and error states
 * - Empty state for new conversations
 * - Pull-to-refresh for message history
 * - Keyboard-aware scrolling
 * - Message grouping with date separators
 * - **User's own avatar** displayed next to their sent messages
 * - **Supabase Realtime subscription** for live message updates from other user
 * - **User blocking** via header menu or message long-press
 * - **Content reporting** via header menu (report user) or message long-press (report message)
 *
 * Real-time Implementation:
 * - Subscribes to postgres_changes on the messages table filtered by conversation_id
 * - Incoming messages from other users are immediately added to the message list
 * - Own messages are added optimistically when sent (no duplicate handling needed)
 * - Subscription is cleaned up when component unmounts or conversation changes
 *
 * Blocking Implementation:
 * - Block user option in header menu (⋮ button) and message long-press
 * - Calls blockUser() from lib/moderation.ts which deactivates conversations
 * - After successful block, navigates back to previous screen
 *
 * Reporting Implementation:
 * - Report user option in header menu (⋮ button)
 * - Report message option in message long-press menu
 * - Uses ReportModal component with reason selection and optional details
 * - Calls submitReport() from lib/moderation.ts to save report to database
 *
 * @example
 * ```tsx
 * // Navigation from PostDetailScreen
 * navigation.navigate('Chat', { conversationId: '123e4567-e89b-12d3-a456-426614174000' })
 * ```
 */

import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native'
import { useRoute, useNavigation } from '@react-navigation/native'

import {
  ChatBubble,
  DateSeparator,
  getBubblePosition,
  shouldShowDateSeparator,
} from '../components/ChatBubble'
import { LoadingSpinner } from '../components/LoadingSpinner'
import { EmptyState, ErrorState } from '../components/EmptyState'
import { ReportMessageModal, ReportUserModal } from '../components/ReportModal'
import { AvatarPreview } from '../components/AvatarPreview'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import {
  getConversation,
  getUserRole,
  isConversationParticipant,
  getOtherUserId,
  CONVERSATION_ERRORS,
} from '../lib/conversations'
import { blockUser, MODERATION_ERRORS } from '../lib/moderation'
import type { ChatRouteProp, MainStackNavigationProp } from '../navigation/types'
import type { Message, Conversation, MessageInsert } from '../types/database'
import type { RealtimeChannel, RealtimePostgresInsertPayload } from '@supabase/supabase-js'

// ============================================================================
// TYPES
// ============================================================================

/**
 * Message list item - either a message or a date separator
 */
interface MessageListItem {
  type: 'message' | 'separator'
  id: string
  data: Message | string // Message for 'message' type, date string for 'separator'
}

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Colors used in the ChatScreen
 */
const COLORS = {
  primary: '#007AFF',
  background: '#F2F2F7',
  inputBackground: '#FFFFFF',
  inputBorder: '#E5E5EA',
  inputText: '#000000',
  inputPlaceholder: '#8E8E93',
  sendButtonActive: '#007AFF',
  sendButtonDisabled: '#C7C7CC',
  textSecondary: '#8E8E93',
  error: '#FF3B30',
} as const

/**
 * Maximum message length
 */
const MAX_MESSAGE_LENGTH = 10000

/**
 * Number of messages to load per page
 */
const MESSAGES_PER_PAGE = 50

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * ChatScreen - Anonymous conversation between producer and consumer
 *
 * Fetches conversation and messages from Supabase,
 * displays messages in a scrollable list,
 * and provides input for sending new messages.
 */
export function ChatScreen(): JSX.Element {
  // ---------------------------------------------------------------------------
  // HOOKS
  // ---------------------------------------------------------------------------

  const route = useRoute<ChatRouteProp>()
  const navigation = useNavigation<MainStackNavigationProp>()
  const { userId, profile } = useAuth()

  const { conversationId } = route.params

  // ---------------------------------------------------------------------------
  // REFS
  // ---------------------------------------------------------------------------

  const flatListRef = useRef<FlatList<MessageListItem>>(null)
  const inputRef = useRef<TextInput>(null)
  const realtimeChannelRef = useRef<RealtimeChannel | null>(null)

  // ---------------------------------------------------------------------------
  // STATE
  // ---------------------------------------------------------------------------

  const [conversation, setConversation] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [messageText, setMessageText] = useState('')
  const [sending, setSending] = useState(false)
  const [hasMoreMessages, setHasMoreMessages] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [blocking, setBlocking] = useState(false)
  const [reportModalVisible, setReportModalVisible] = useState(false)
  const [messageToReport, setMessageToReport] = useState<Message | null>(null)
  const [userReportModalVisible, setUserReportModalVisible] = useState(false)

  // ---------------------------------------------------------------------------
  // COMPUTED VALUES
  // ---------------------------------------------------------------------------

  /**
   * User's role in the conversation
   */
  const userRole = useMemo(() => {
    if (!conversation || !userId) return null
    return getUserRole(conversation, userId)
  }, [conversation, userId])

  /**
   * The other participant's user ID
   */
  const otherUserId = useMemo(() => {
    if (!conversation || !userId) return null
    return getOtherUserId(conversation, userId)
  }, [conversation, userId])

  /**
   * Whether the send button should be enabled
   */
  const canSend = useMemo(() => {
    const trimmedMessage = messageText.trim()
    return (
      trimmedMessage.length > 0 &&
      trimmedMessage.length <= MAX_MESSAGE_LENGTH &&
      !sending &&
      !error &&
      conversation?.is_active
    )
  }, [messageText, sending, error, conversation])

  /**
   * Process messages into list items with date separators
   */
  const messageListItems = useMemo((): MessageListItem[] => {
    if (messages.length === 0) return []

    const items: MessageListItem[] = []

    // Messages are sorted newest first (for inverted FlatList)
    // So we iterate backwards to add date separators correctly
    for (let i = messages.length - 1; i >= 0; i--) {
      const message = messages[i]
      const prevMessage = i < messages.length - 1 ? messages[i + 1] : null
      const prevTimestamp = prevMessage?.created_at || null

      // Check if we need a date separator before this message
      if (shouldShowDateSeparator(prevTimestamp, message.created_at)) {
        items.push({
          type: 'separator',
          id: `separator-${message.id}`,
          data: message.created_at,
        })
      }

      items.push({
        type: 'message',
        id: message.id,
        data: message,
      })
    }

    // Reverse to get newest first (for inverted FlatList)
    return items.reverse()
  }, [messages])

  // ---------------------------------------------------------------------------
  // DATA FETCHING
  // ---------------------------------------------------------------------------

  /**
   * Fetch conversation details
   */
  const fetchConversation = useCallback(async () => {
    const result = await getConversation(conversationId)

    if (!result.success || !result.conversation) {
      setError(result.error || CONVERSATION_ERRORS.NOT_FOUND)
      return null
    }

    // Verify user is a participant
    if (!isConversationParticipant(result.conversation, userId || '')) {
      setError(CONVERSATION_ERRORS.UNAUTHORIZED)
      return null
    }

    // Check if conversation is active
    if (!result.conversation.is_active) {
      setError(CONVERSATION_ERRORS.INACTIVE)
      return null
    }

    setConversation(result.conversation)
    return result.conversation
  }, [conversationId, userId])

  /**
   * Fetch messages for the conversation
   */
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

      // If loading more, get messages older than the last one
      if (lastMessageId) {
        const lastMessage = messages.find(m => m.id === lastMessageId)
        if (lastMessage) {
          query = query.lt('created_at', lastMessage.created_at)
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
        // Append older messages
        setMessages(prev => [...prev, ...newMessages])
        setHasMoreMessages(newMessages.length === MESSAGES_PER_PAGE)
      } else {
        // Replace all messages
        setMessages(newMessages)
        setHasMoreMessages(newMessages.length === MESSAGES_PER_PAGE)
      }

      setError(null)
    } catch {
      if (!isRefresh && !lastMessageId) {
        setError('An unexpected error occurred.')
      }
    } finally {
      setLoading(false)
      setRefreshing(false)
      setLoadingMore(false)
    }
  }, [conversationId, messages])

  /**
   * Initial data fetch
   */
  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)

    const conv = await fetchConversation()
    if (conv) {
      await fetchMessages()
    } else {
      setLoading(false)
    }
  }, [fetchConversation, fetchMessages])

  /**
   * Mark messages as read
   */
  const markMessagesAsRead = useCallback(async () => {
    if (!userId || messages.length === 0) return

    // Get unread messages from other user
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
        // Update local state
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

  // ---------------------------------------------------------------------------
  // EFFECTS
  // ---------------------------------------------------------------------------

  /**
   * Load data when screen mounts
   */
  useEffect(() => {
    loadData()
  }, [loadData])

  /**
   * Mark messages as read when messages are loaded
   */
  useEffect(() => {
    if (messages.length > 0) {
      markMessagesAsRead()
    }
  }, [messages.length, markMessagesAsRead])

  /**
   * Set navigation header title and options based on role
   */
  /**
   * Handle reporting the other user in the conversation
   */
  const handleReportUser = useCallback(() => {
    if (!otherUserId) return
    setUserReportModalVisible(true)
  }, [otherUserId])

  /**
   * Handle closing user report modal
   */
  const handleCloseUserReportModal = useCallback(() => {
    setUserReportModalVisible(false)
  }, [])

  useEffect(() => {
    if (userRole) {
      const otherRole = userRole === 'producer' ? 'Consumer' : 'Producer'
      navigation.setOptions({
        headerTitle: `Chat with ${otherRole}`,
        // eslint-disable-next-line react/no-unstable-nested-components
        headerRight: () => (
          <TouchableOpacity
            onPress={() => {
              Alert.alert(
                'Chat Options',
                'What would you like to do?',
                [
                  {
                    text: 'Report User',
                    style: 'destructive',
                    onPress: handleReportUser,
                  },
                  {
                    text: 'Block User',
                    style: 'destructive',
                    onPress: handleBlockUser,
                  },
                  { text: 'Cancel', style: 'cancel' },
                ]
              )
            }}
            style={{ marginRight: 8, padding: 8 }}
            testID="chat-options-button"
          >
            <Text style={{ fontSize: 20 }}>⋮</Text>
          </TouchableOpacity>
        ),
      })
    }
  }, [userRole, navigation, handleBlockUser, handleReportUser])

  /**
   * Supabase Realtime subscription for live message updates
   *
   * Subscribes to INSERT events on the messages table filtered by conversation_id.
   * When a new message is received from the other user, it's added to the message list.
   * Own messages sent via handleSendMessage are already added optimistically,
   * so we skip duplicates by checking if the message already exists.
   */
  useEffect(() => {
    // Only subscribe if we have a valid conversation and user
    if (!conversationId || !userId || error) {
      return
    }

    // Create a unique channel name for this conversation
    const channelName = `chat-${conversationId}`

    // Handle incoming new messages from Realtime
    const handleRealtimeInsert = (
      payload: RealtimePostgresInsertPayload<Message>
    ) => {
      const newMessage = payload.new

      // Skip if this is our own message (already added optimistically)
      if (newMessage.sender_id === userId) {
        return
      }

      // Add the new message to the beginning (newest first) if not already present
      setMessages((prevMessages) => {
        // Check for duplicates (message might already exist from a race condition)
        const messageExists = prevMessages.some((m) => m.id === newMessage.id)
        if (messageExists) {
          return prevMessages
        }

        // Add new message at the beginning (inverted FlatList shows newest first)
        return [newMessage, ...prevMessages]
      })

      // Scroll to bottom (top of inverted list) to show new message
      flatListRef.current?.scrollToOffset({ offset: 0, animated: true })

      // Mark the new message as read immediately since we're viewing the chat
      markNewMessageAsRead(newMessage.id)
    }

    // Mark a single new message as read
    const markNewMessageAsRead = async (messageId: string) => {
      try {
        await supabase
          .from('messages')
          .update({ is_read: true })
          .eq('id', messageId)
      } catch {
        // Silently fail - not critical
      }
    }

    // Subscribe to Realtime changes for this conversation
    const channel = supabase
      .channel(channelName)
      .on<Message>(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        handleRealtimeInsert
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          // Channel successfully subscribed
        }
      })

    // Store the channel reference for cleanup
    realtimeChannelRef.current = channel

    // Cleanup: unsubscribe when component unmounts or conversation changes
    return () => {
      if (realtimeChannelRef.current) {
        supabase.removeChannel(realtimeChannelRef.current)
        realtimeChannelRef.current = null
      }
    }
  }, [conversationId, userId, error])

  // ---------------------------------------------------------------------------
  // HANDLERS
  // ---------------------------------------------------------------------------

  /**
   * Handle pull-to-refresh
   */
  const handleRefresh = useCallback(async () => {
    setRefreshing(true)
    await fetchMessages(true)
  }, [fetchMessages])

  /**
   * Handle retry on error
   */
  const handleRetry = useCallback(() => {
    loadData()
  }, [loadData])

  /**
   * Handle loading more messages
   */
  const handleLoadMore = useCallback(() => {
    if (!loadingMore && hasMoreMessages && messages.length > 0) {
      const lastMessage = messages[messages.length - 1]
      fetchMessages(false, lastMessage.id)
    }
  }, [loadingMore, hasMoreMessages, messages, fetchMessages])

  /**
   * Handle sending a message
   */
  const handleSendMessage = useCallback(async () => {
    const trimmedMessage = messageText.trim()

    if (!trimmedMessage || !userId || !conversationId || sending) {
      return
    }

    if (trimmedMessage.length > MAX_MESSAGE_LENGTH) {
      Alert.alert('Error', `Message is too long. Maximum ${MAX_MESSAGE_LENGTH} characters allowed.`)
      return
    }

    setSending(true)

    try {
      const insertData: MessageInsert = {
        conversation_id: conversationId,
        sender_id: userId,
        content: trimmedMessage,
      }

      const { data, error: sendError } = await supabase
        .from('messages')
        .insert(insertData)
        .select()
        .single()

      if (sendError) {
        Alert.alert('Error', 'Failed to send message. Please try again.')
        return
      }

      // Add new message to the top of the list (newest first)
      const newMessage = data as Message
      setMessages(prev => [newMessage, ...prev])

      // Clear input
      setMessageText('')

      // Scroll to bottom (top of inverted list)
      flatListRef.current?.scrollToOffset({ offset: 0, animated: true })
    } catch {
      Alert.alert('Error', 'An unexpected error occurred. Please try again.')
    } finally {
      setSending(false)
    }
  }, [messageText, userId, conversationId, sending])

  /**
   * Handle blocking the other user in the conversation
   */
  const handleBlockUser = useCallback(async () => {
    if (!userId || !otherUserId || blocking) {
      return
    }

    const otherRole = userRole === 'producer' ? 'consumer' : 'producer'

    Alert.alert(
      'Block User',
      `Are you sure you want to block this ${otherRole}? You will no longer see their content and this conversation will be deactivated.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Block',
          style: 'destructive',
          onPress: async () => {
            setBlocking(true)

            const result = await blockUser(userId, otherUserId)

            setBlocking(false)

            if (result.success) {
              Alert.alert(
                'User Blocked',
                'You will no longer see content from this user.',
                [
                  {
                    text: 'OK',
                    onPress: () => navigation.goBack(),
                  },
                ]
              )
            } else {
              Alert.alert(
                'Error',
                result.error || MODERATION_ERRORS.BLOCK_FAILED
              )
            }
          },
        },
      ]
    )
  }, [userId, otherUserId, userRole, blocking, navigation])

  /**
   * Handle opening report modal for a message
   */
  const handleReportMessage = useCallback((message: Message) => {
    setMessageToReport(message)
    setReportModalVisible(true)
  }, [])

  /**
   * Handle closing report modal
   */
  const handleCloseReportModal = useCallback(() => {
    setReportModalVisible(false)
    setMessageToReport(null)
  }, [])

  /**
   * Handle successful report submission
   */
  const handleReportSuccess = useCallback(() => {
    Alert.alert(
      'Report Submitted',
      'Thank you for helping keep our community safe. We will review your report.',
      [{ text: 'OK' }]
    )
  }, [])

  /**
   * Handle message long press (for options like copy, report, block)
   */
  const handleMessageLongPress = useCallback((message: Message) => {
    const options = [
      {
        text: 'Copy',
        onPress: () => {
          // Clipboard functionality would go here
        },
      },
      {
        text: 'Report',
        style: 'destructive' as const,
        onPress: () => handleReportMessage(message),
      },
      {
        text: 'Block User',
        style: 'destructive' as const,
        onPress: handleBlockUser,
      },
      { text: 'Cancel', style: 'cancel' as const },
    ]

    Alert.alert('Message Options', 'What would you like to do?', options)
  }, [handleBlockUser, handleReportMessage])

  // ---------------------------------------------------------------------------
  // RENDER ITEM
  // ---------------------------------------------------------------------------

  /**
   * Render a message list item (message or date separator)
   */
  const renderItem = useCallback(({ item, index }: { item: MessageListItem; index: number }) => {
    if (item.type === 'separator') {
      return (
        <DateSeparator
          timestamp={item.data as string}
          testID={`date-separator-${index}`}
        />
      )
    }

    const message = item.data as Message
    const isOwn = message.sender_id === userId

    // Calculate bubble position for grouping
    const messageIndex = messages.findIndex(m => m.id === message.id)
    const position = getBubblePosition(messages, messageIndex, userId || '')

    // Show timestamp for last message in a group
    const showTimestamp = position === 'single' || position === 'last'

    // Show avatar for own messages (only for single or last in group to avoid repetition)
    const showAvatar = isOwn && (position === 'single' || position === 'last')

    return (
      <View style={styles.messageRow} testID={`message-row-${message.id}`}>
        <View style={styles.messageBubbleContainer}>
          <ChatBubble
            message={message}
            isOwn={isOwn}
            position={position}
            showTimestamp={showTimestamp}
            showReadStatus={isOwn}
            onLongPress={() => handleMessageLongPress(message)}
            testID={`chat-bubble-${message.id}`}
          />
        </View>
        {showAvatar && (
          <View style={styles.messageAvatarContainer} testID={`message-avatar-${message.id}`}>
            {profile?.own_avatar ? (
              <AvatarPreview
                config={profile.own_avatar}
                size={24}
                avatarStyle="Circle"
                testID={`message-avatar-preview-${message.id}`}
              />
            ) : (
              <View style={styles.messageAvatarPlaceholder}>
                <Text style={styles.messageAvatarPlaceholderText}>?</Text>
              </View>
            )}
          </View>
        )}
        {/* Spacer to maintain alignment when avatar is not shown */}
        {isOwn && !showAvatar && <View style={styles.messageAvatarSpacer} />}
      </View>
    )
  }, [userId, profile, messages, handleMessageLongPress])

  /**
   * Extract key from list item
   */
  const keyExtractor = useCallback((item: MessageListItem) => item.id, [])

  // ---------------------------------------------------------------------------
  // RENDER: LOADING STATE
  // ---------------------------------------------------------------------------

  if (loading && !refreshing) {
    return (
      <View style={styles.centeredContainer} testID="chat-screen-loading">
        <LoadingSpinner message="Loading conversation..." />
      </View>
    )
  }

  // ---------------------------------------------------------------------------
  // RENDER: ERROR STATE
  // ---------------------------------------------------------------------------

  if (error) {
    return (
      <View style={styles.centeredContainer} testID="chat-screen-error">
        <ErrorState
          title="Unable to Load Chat"
          message={error}
          onAction={handleRetry}
          actionLabel="Try Again"
        />
      </View>
    )
  }

  // ---------------------------------------------------------------------------
  // RENDER: CHAT SCREEN
  // ---------------------------------------------------------------------------

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      testID="chat-screen"
    >
      {/* Message List */}
      <FlatList
        ref={flatListRef}
        data={messageListItems}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        contentContainerStyle={styles.messageList}
        showsVerticalScrollIndicator={false}
        inverted
        onRefresh={handleRefresh}
        refreshing={refreshing}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.3}
        testID="chat-message-list"
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <EmptyState
              icon="💬"
              title="Start the Conversation"
              message="Send a message to begin your anonymous chat."
            />
          </View>
        }
        ListFooterComponent={
          loadingMore ? (
            <View style={styles.loadingMore} testID="chat-loading-more">
              <ActivityIndicator size="small" color={COLORS.primary} />
              <Text style={styles.loadingMoreText}>Loading older messages...</Text>
            </View>
          ) : null
        }
      />

      {/* Input Area */}
      {conversation?.is_active && (
        <View style={styles.inputContainer} testID="chat-input-container">
          <TextInput
            ref={inputRef}
            style={styles.input}
            value={messageText}
            onChangeText={setMessageText}
            placeholder="Type a message..."
            placeholderTextColor={COLORS.inputPlaceholder}
            multiline
            maxLength={MAX_MESSAGE_LENGTH}
            editable={!sending}
            returnKeyType="default"
            blurOnSubmit={false}
            testID="chat-input"
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              canSend ? styles.sendButtonActive : styles.sendButtonDisabled,
            ]}
            onPress={handleSendMessage}
            disabled={!canSend}
            activeOpacity={0.7}
            testID="chat-send-button"
          >
            {sending ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.sendButtonText}>↑</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Inactive Conversation Banner */}
      {conversation && !conversation.is_active && (
        <View style={styles.inactiveBanner} testID="chat-inactive-banner">
          <Text style={styles.inactiveBannerText}>
            This conversation is no longer active.
          </Text>
        </View>
      )}

      {/* Report Message Modal */}
      {messageToReport && (
        <ReportMessageModal
          visible={reportModalVisible}
          onClose={handleCloseReportModal}
          reportedId={messageToReport.id}
          onSuccess={handleReportSuccess}
          testID="chat-report-modal"
        />
      )}

      {/* Report User Modal */}
      {otherUserId && (
        <ReportUserModal
          visible={userReportModalVisible}
          onClose={handleCloseUserReportModal}
          reportedId={otherUserId}
          onSuccess={handleReportSuccess}
          testID="chat-report-user-modal"
        />
      )}
    </KeyboardAvoidingView>
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
  centeredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    padding: 24,
  },

  // Message List
  messageList: {
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 8,
    flexGrow: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 48,
    // Inverted list - flip the empty state
    transform: [{ scaleY: -1 }],
  },

  // Message Row with Avatar
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginVertical: 1,
  },
  messageBubbleContainer: {
    flex: 1,
  },
  messageAvatarContainer: {
    marginLeft: 6,
    marginBottom: 4,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messageAvatarPlaceholder: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#E5E5EA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  messageAvatarPlaceholderText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8E8E93',
  },
  messageAvatarSpacer: {
    width: 30, // 24 (avatar) + 6 (margin)
  },

  // Loading More
  loadingMore: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  loadingMoreText: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },

  // Input Area
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: COLORS.inputBackground,
    borderTopWidth: 1,
    borderTopColor: COLORS.inputBorder,
    gap: 8,
  },
  input: {
    flex: 1,
    minHeight: 36,
    maxHeight: 120,
    backgroundColor: COLORS.background,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 10 : 8,
    paddingBottom: Platform.OS === 'ios' ? 10 : 8,
    fontSize: 16,
    color: COLORS.inputText,
    borderWidth: 1,
    borderColor: COLORS.inputBorder,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonActive: {
    backgroundColor: COLORS.sendButtonActive,
  },
  sendButtonDisabled: {
    backgroundColor: COLORS.sendButtonDisabled,
  },
  sendButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Inactive Banner
  inactiveBanner: {
    backgroundColor: '#FFF3E0',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.inputBorder,
  },
  inactiveBannerText: {
    textAlign: 'center',
    fontSize: 14,
    color: '#FF9500',
    fontWeight: '500',
  },
})

// ============================================================================
// EXPORTS
// ============================================================================

export default ChatScreen
