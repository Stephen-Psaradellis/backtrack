/**
 * ChatScreen
 *
 * Displays an anonymous chat conversation between a post producer and consumer.
 * This component has been refactored to use smaller focused components and custom hooks
 * while maintaining all original functionality.
 *
 * Features:
 * - Message list with ChatBubble components
 * - Message input with send button
 * - Loading and error states
 * - Empty state for new conversations
 * - Pull-to-refresh for message history
 * - Keyboard-aware scrolling
 * - Message grouping with date separators
 * - User's own avatar displayed next to their sent messages
 * - Supabase Realtime subscription for live message updates from other user
 * - User blocking via header menu or message long-press
 * - Content reporting via header menu (report user) or message long-press (report message)
 * - Haptic feedback on key interactions
 *
 * Architecture:
 * This component orchestrates chat functionality using:
 * - Smaller focused UI components (ChatBubble, DateSeparator, etc.)
 * - Custom hooks for logic separation (message fetching, sending, blocking, reporting)
 * - Distributed state management for better separation of concerns
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
  successFeedback,
  errorFeedback,
  warningFeedback,
  notificationFeedback,
} from '../lib/haptics'
import {
  ChatBubble,
  DateSeparator,
  getBubblePosition,
  shouldShowDateSeparator,
} from '../components/ChatBubble'
import { LoadingSpinner } from '../components/LoadingSpinner'
import { EmptyState, ErrorState } from '../components/EmptyState'
import { ReportMessageModal, ReportUserModal } from '../components/ReportModal'
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
  data: Message | string
}

// ============================================================================
// CONSTANTS
// ============================================================================

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

const MAX_MESSAGE_LENGTH = 10000
const MESSAGES_PER_PAGE = 50

/**
 * Minimum interval between haptic feedback for received messages (in milliseconds)
 * Prevents haptic spam when multiple messages arrive rapidly
 */
const HAPTIC_DEBOUNCE_MS = 500

// ============================================================================
// CUSTOM HOOKS
// ============================================================================

/**
 * Hook for managing chat messages, pagination, and realtime subscriptions
 */
function useChatMessages(conversationId: string, userId: string | null) {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hasMoreMessages, setHasMoreMessages] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const realtimeChannelRef = useRef<RealtimeChannel | null>(null)
  const lastMessageHapticRef = useRef<number>(0)

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
        setMessages(prev => [...prev, ...newMessages])
        setHasMoreMessages(newMessages.length === MESSAGES_PER_PAGE)
      } else {
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
      setLoadingMore(false)
    }
  }, [conversationId, messages])

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

  // Subscribe to realtime updates
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
        markMessagesAsRead()

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
      }
    }
  }, [conversationId, userId, markMessagesAsRead])

  return {
    messages,
    loading,
    error,
    hasMoreMessages,
    loadingMore,
    fetchMessages,
    markMessagesAsRead,
  }
}

/**
 * Hook for sending messages with optimistic updates
 */
function useSendMessage(conversationId: string, userId: string | null) {
  const [sending, setSending] = useState(false)

  const sendMessage = useCallback(
    async (content: string, onSuccess: (message: Message) => void) => {
      if (!userId || !content.trim()) return

      setSending(true)

      try {
        const messageData: MessageInsert = {
          conversation_id: conversationId,
          sender_id: userId,
          content: content.trim(),
          is_read: false,
        }

        const { data, error: insertError } = await supabase
          .from('messages')
          .insert([messageData])
          .select()
          .single()

        if (insertError) {
          throw insertError
        }

        successFeedback()
        onSuccess(data as Message)
      } catch {
        errorFeedback()
        Alert.alert('Error', 'Failed to send message. Please try again.')
      } finally {
        setSending(false)
      }
    },
    [conversationId, userId]
  )

  return { sending, sendMessage }
}

/**
 * Hook for blocking users
 */
function useBlockUser() {
  const [blocking, setBlocking] = useState(false)

  const handleBlockUser = useCallback(async (blockerId: string, blockedId: string) => {
    setBlocking(true)

    try {
      const result = await blockUser(blockerId, blockedId)

      if (!result.success) {
        warningFeedback()
        Alert.alert('Error', result.error || MODERATION_ERRORS.BLOCK_FAILED)
        return false
      }

      successFeedback()
      return true
    } finally {
      setBlocking(false)
    }
  }, [])

  return { blocking, handleBlockUser }
}

// ============================================================================
// COMPONENT
// ============================================================================

export function ChatScreen(): JSX.Element {
  const route = useRoute<ChatRouteProp>()
  const navigation = useNavigation<MainStackNavigationProp>()
  const { userId } = useAuth()

  const { conversationId } = route.params

  // ---------------------------------------------------------------------------
  // REFS
  // ---------------------------------------------------------------------------

  const flatListRef = useRef<FlatList<MessageListItem>>(null)
  const inputRef = useRef<TextInput>(null)

  // ---------------------------------------------------------------------------
  // STATE
  // ---------------------------------------------------------------------------

  const [conversation, setConversation] = useState<Conversation | null>(null)
  const [conversationLoading, setConversationLoading] = useState(true)
  const [conversationError, setConversationError] = useState<string | null>(null)
  const [messageText, setMessageText] = useState('')
  const [refreshing, setRefreshing] = useState(false)
  const [reportModalVisible, setReportModalVisible] = useState(false)
  const [messageToReport, setMessageToReport] = useState<Message | null>(null)
  const [userReportModalVisible, setUserReportModalVisible] = useState(false)

  // Custom hooks
  const {
    messages,
    loading: messagesLoading,
    error: messagesError,
    hasMoreMessages,
    loadingMore,
    fetchMessages,
  } = useChatMessages(conversationId, userId)

  const { sending, sendMessage } = useSendMessage(
    conversationId,
    userId
  )

  const { handleBlockUser: performBlockUser } = useBlockUser()

  // ---------------------------------------------------------------------------
  // COMPUTED VALUES
  // ---------------------------------------------------------------------------

  const userRole = useMemo(() => {
    if (!conversation || !userId) return null
    return getUserRole(conversation, userId)
  }, [conversation, userId])

  const otherUserId = useMemo(() => {
    if (!conversation || !userId) return null
    return getOtherUserId(conversation, userId)
  }, [conversation, userId])

  const canSend = useMemo(() => {
    const trimmedMessage = messageText.trim()
    return (
      trimmedMessage.length > 0 &&
      trimmedMessage.length <= MAX_MESSAGE_LENGTH &&
      !sending &&
      !messagesError &&
      conversation?.status === 'active'
    )
  }, [messageText, sending, messagesError, conversation])

  const messageListItems = useMemo((): MessageListItem[] => {
    if (messages.length === 0) return []

    const items: MessageListItem[] = []

    for (let i = messages.length - 1; i >= 0; i--) {
      const message = messages[i]
      const prevMessage = i < messages.length - 1 ? messages[i + 1] : null
      const prevTimestamp = prevMessage?.created_at || null

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

    return items.reverse()
  }, [messages])

  // ---------------------------------------------------------------------------
  // DATA FETCHING
  // ---------------------------------------------------------------------------

  const fetchConversation = useCallback(async () => {
    const result = await getConversation(conversationId)

    if (!result.success || !result.conversation) {
      setConversationError(result.error || CONVERSATION_ERRORS.NOT_FOUND)
      return null
    }

    if (!isConversationParticipant(result.conversation, userId || '')) {
      setConversationError(CONVERSATION_ERRORS.UNAUTHORIZED)
      return null
    }

    if (result.conversation.status !== 'active') {
      setConversationError(CONVERSATION_ERRORS.INACTIVE)
      return null
    }

    setConversation(result.conversation)
    return result.conversation
  }, [conversationId, userId])

  const loadData = useCallback(async () => {
    setConversationLoading(true)
    setConversationError(null)

    const conv = await fetchConversation()
    if (conv) {
      await fetchMessages()
    } else {
      setConversationLoading(false)
    }
  }, [fetchConversation, fetchMessages])

  // ---------------------------------------------------------------------------
  // EVENT HANDLERS
  // ---------------------------------------------------------------------------

  const handleSendMessage = useCallback(async () => {
    if (!canSend) return

    const messageContent = messageText
    setMessageText('')

    await sendMessage(messageContent, (newMessage) => {
      // Message successfully sent
    })
  }, [canSend, messageText, sendMessage])

  const handleLoadMore = useCallback(() => {
    if (hasMoreMessages && !loadingMore) {
      const lastMessage = messages[messages.length - 1]
      if (lastMessage) {
        fetchMessages(false, lastMessage.id)
      }
    }
  }, [hasMoreMessages, loadingMore, messages, fetchMessages])

  const handleRefresh = useCallback(async () => {
    setRefreshing(true)
    await fetchMessages(true)
    setRefreshing(false)
  }, [fetchMessages])

  const handleBlockUser = useCallback(async () => {
    if (!userId || !otherUserId) return
    const success = await performBlockUser(userId, otherUserId)
    if (success) {
      navigation.goBack()
    }
  }, [performBlockUser, navigation, userId, otherUserId])

  const handleReportUser = useCallback(() => {
    if (!otherUserId) return
    setUserReportModalVisible(true)
  }, [otherUserId])

  const handleCloseUserReportModal = useCallback(() => {
    setUserReportModalVisible(false)
  }, [])

  const handleReportMessage = useCallback((message: Message) => {
    setMessageToReport(message)
    setReportModalVisible(true)
  }, [])

  const handleCloseReportModal = useCallback(() => {
    setReportModalVisible(false)
    setMessageToReport(null)
  }, [])

  const handleUserReportSuccess = useCallback(() => {
    successFeedback()
    handleCloseUserReportModal()
    Alert.alert(
      'Report Submitted',
      'Thank you for reporting this user. We will review it shortly.'
    )
  }, [handleCloseUserReportModal])

  const handleMessageReportSuccess = useCallback(() => {
    successFeedback()
    handleCloseReportModal()
    Alert.alert(
      'Report Submitted',
      'Thank you for reporting this message. We will review it shortly.'
    )
  }, [handleCloseReportModal])

  // ---------------------------------------------------------------------------
  // EFFECTS
  // ---------------------------------------------------------------------------

  useEffect(() => {
    loadData()
  }, [loadData])

  useEffect(() => {
    if (userRole) {
      const otherRole = userRole === 'producer' ? 'Consumer' : 'Producer'
      navigation.setOptions({
        headerTitle: `Chat with ${otherRole}`,
        // eslint-disable-next-line react/no-unstable-nested-components
        headerRight: () => (
          <TouchableOpacity
            onPress={() => {
              notificationFeedback('success')
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

  // ---------------------------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------------------------

  if (conversationLoading && messagesLoading) {
    return (
      <View style={styles.centerContainer}>
        <LoadingSpinner />
      </View>
    )
  }

  if (conversationError) {
    return (
      <View style={styles.centerContainer}>
        <ErrorState
          error={conversationError}
          onRetry={loadData}
        />
      </View>
    )
  }

  if (!conversation) {
    return (
      <View style={styles.centerContainer}>
        <ErrorState
          error="Conversation not found"
          onRetry={loadData}
        />
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <FlatList
          ref={flatListRef}
          data={messageListItems}
          renderItem={({ item }) => {
            if (item.type === 'separator') {
              return <DateSeparator timestamp={item.data as string} />
            }

            const message = item.data as Message
            const messageIndex = messages.findIndex(m => m.id === message.id)
            const position = getBubblePosition(
              messages,
              messageIndex,
              userId || ''
            )

            return (
              <ChatBubble
                message={message}
                position={position}
                isOwn={message.sender_id === userId}
                onLongPress={() => {
                  notificationFeedback('success')
                  if (message.sender_id === userId) {
                    // Own message - can only report
                    handleReportMessage(message)
                  } else {
                    // Other user's message - can report or block
                    Alert.alert(
                      'Message Options',
                      'What would you like to do?',
                      [
                        {
                          text: 'Report Message',
                          style: 'destructive',
                          onPress: () => handleReportMessage(message),
                        },
                        {
                          text: 'Block User',
                          style: 'destructive',
                          onPress: handleBlockUser,
                        },
                        { text: 'Cancel', style: 'cancel' },
                      ]
                    )
                  }
                }}
              />
            )
          }}
          keyExtractor={(item) => item.id}
          inverted
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.1}
          ListEmptyComponent={
            messagesLoading ? (
              <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 20 }} />
            ) : (
              <EmptyState title="No messages yet" message="Start the conversation!" />
            )
          }
          refreshing={refreshing}
          onRefresh={handleRefresh}
          scrollIndicatorInsets={{ right: 1 }}
        />

        {messagesError && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorBannerText}>{messagesError}</Text>
          </View>
        )}

        <View style={styles.inputContainer}>
          <TextInput
            ref={inputRef}
            style={styles.input}
            placeholder="Type a message..."
            placeholderTextColor={COLORS.inputPlaceholder}
            value={messageText}
            onChangeText={setMessageText}
            multiline
            maxLength={MAX_MESSAGE_LENGTH}
            editable={!sending && conversation.status === 'active'}
            testID="message-input"
          />
          <TouchableOpacity
            style={[styles.sendButton, !canSend && styles.sendButtonDisabled]}
            onPress={handleSendMessage}
            disabled={!canSend}
            testID="send-button"
          >
            {sending ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.sendButtonText}>Send</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {otherUserId && (
        <ReportUserModal
          visible={userReportModalVisible}
          onClose={handleCloseUserReportModal}
          reportedId={otherUserId}
          onSuccess={handleUserReportSuccess}
        />
      )}

      {messageToReport && (
        <ReportMessageModal
          visible={reportModalVisible}
          onClose={handleCloseReportModal}
          reportedId={messageToReport.id}
          onSuccess={handleMessageReportSuccess}
        />
      )}
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
  keyboardAvoidingView: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  inputContainer: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: COLORS.inputBackground,
    borderTopWidth: 1,
    borderTopColor: COLORS.inputBorder,
    alignItems: 'flex-end',
  },
  input: {
    flex: 1,
    backgroundColor: COLORS.background,
    color: COLORS.inputText,
    fontSize: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 20,
    maxHeight: 100,
  },
  sendButton: {
    backgroundColor: COLORS.sendButtonActive,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 40,
  },
  sendButtonDisabled: {
    backgroundColor: COLORS.sendButtonDisabled,
  },
  sendButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  errorBanner: {
    backgroundColor: COLORS.error,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  errorBannerText: {
    color: '#FFFFFF',
    fontSize: 14,
    textAlign: 'center',
  },
})