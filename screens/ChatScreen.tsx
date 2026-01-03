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
 * - Photo sharing with match (share private photos in chat)
 * - Display of photos shared by match
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
  StatusBar,
  Modal,
  ScrollView,
  Image,
} from 'react-native'
import { useRoute, useNavigation } from '@react-navigation/native'
import Tooltip from 'react-native-walkthrough-tooltip'

import {
  successFeedback,
  errorFeedback,
  warningFeedback,
  notificationFeedback,
  selectionFeedback,
} from '../lib/haptics'
import { usePhotoSharing } from '../hooks/usePhotoSharing'
import { useProfilePhotos } from '../hooks/useProfilePhotos'
import { useTutorialState } from '../hooks/useTutorialState'
import type { SharedPhotoWithUrl } from '../lib/photoSharing'
import type { ProfilePhotoWithUrl } from '../lib/profilePhotos'
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

/**
 * Props for SharePhotoModal component
 */
interface SharePhotoModalProps {
  visible: boolean
  onClose: () => void
  approvedPhotos: ProfilePhotoWithUrl[]
  photosLoading: boolean
  isPhotoShared: (photoId: string) => boolean
  onSharePhoto: (photoId: string) => Promise<void>
  sharing: boolean
}

// ============================================================================
// CONSTANTS
// ============================================================================

const COLORS = {
  primary: '#FF6B47',
  background: '#F2F2F7',
  inputBackground: '#FFFFFF',
  inputBorder: '#E5E5EA',
  inputText: '#000000',
  inputPlaceholder: '#8E8E93',
  sendButtonActive: '#FF6B47',
  sendButtonDisabled: '#FFD0C2',
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
// PHOTO SHARING COMPONENTS
// ============================================================================

/**
 * Modal for selecting and sharing photos with a match
 */
function SharePhotoModal({
  visible,
  onClose,
  approvedPhotos,
  photosLoading,
  isPhotoShared,
  onSharePhoto,
  sharing,
}: SharePhotoModalProps): JSX.Element {
  const availablePhotos = approvedPhotos.filter(photo => !isPhotoShared(photo.id))
  const sharedPhotos = approvedPhotos.filter(photo => isPhotoShared(photo.id))

  const handlePhotoPress = useCallback(async (photoId: string) => {
    selectionFeedback()
    await onSharePhoto(photoId)
  }, [onSharePhoto])

  const handleClose = useCallback(() => {
    if (!sharing) {
      onClose()
    }
  }, [sharing, onClose])

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
      testID="share-photo-modal"
    >
      <KeyboardAvoidingView
        style={sharePhotoStyles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <TouchableOpacity
          style={sharePhotoStyles.overlayTouchable}
          activeOpacity={1}
          onPress={handleClose}
        >
          <TouchableOpacity
            style={sharePhotoStyles.modalContainer}
            activeOpacity={1}
            onPress={() => {}}
          >
            {/* Header */}
            <View style={sharePhotoStyles.header}>
              <Text style={sharePhotoStyles.title}>Share a Photo</Text>
              <TouchableOpacity
                onPress={handleClose}
                disabled={sharing}
                style={sharePhotoStyles.closeButton}
                testID="share-photo-modal-close"
                accessibilityLabel="Close"
                accessibilityRole="button"
              >
                <Text style={sharePhotoStyles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Content */}
            <ScrollView
              style={sharePhotoStyles.content}
              contentContainerStyle={sharePhotoStyles.contentContainer}
              showsVerticalScrollIndicator={false}
            >
              {/* Loading state */}
              {photosLoading && (
                <View style={sharePhotoStyles.loadingContainer}>
                  <ActivityIndicator size="large" color={COLORS.primary} />
                  <Text style={sharePhotoStyles.loadingText}>Loading photos...</Text>
                </View>
              )}

              {/* Empty state - no approved photos */}
              {!photosLoading && approvedPhotos.length === 0 && (
                <View style={sharePhotoStyles.emptyContainer}>
                  <Text style={sharePhotoStyles.emptyTitle}>No photos available</Text>
                  <Text style={sharePhotoStyles.emptyText}>
                    Upload and verify photos in your profile to share them with your matches.
                  </Text>
                </View>
              )}

              {/* All photos shared state */}
              {!photosLoading && approvedPhotos.length > 0 && availablePhotos.length === 0 && (
                <View style={sharePhotoStyles.emptyContainer}>
                  <Text style={sharePhotoStyles.emptyTitle}>All photos shared</Text>
                  <Text style={sharePhotoStyles.emptyText}>
                    You have already shared all your approved photos with this match.
                  </Text>
                </View>
              )}

              {/* Available photos section */}
              {!photosLoading && availablePhotos.length > 0 && (
                <>
                  <Text style={sharePhotoStyles.instructions}>
                    Tap a photo to share it privately with this match.
                  </Text>
                  <Text style={sharePhotoStyles.sectionTitle}>Available to Share</Text>
                  <View style={sharePhotoStyles.photoGrid}>
                    {availablePhotos.map((photo) => (
                      <TouchableOpacity
                        key={photo.id}
                        style={sharePhotoStyles.photoTile}
                        onPress={() => handlePhotoPress(photo.id)}
                        disabled={sharing}
                        testID={`photo-tile-${photo.id}`}
                        activeOpacity={0.7}
                      >
                        <Image
                          source={{ uri: photo.signedUrl || '' }}
                          style={sharePhotoStyles.photoImage}
                          testID={`photo-image-${photo.id}`}
                        />
                        {sharing && (
                          <View style={sharePhotoStyles.sharingOverlay}>
                            <ActivityIndicator size="small" color="#FFFFFF" />
                          </View>
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}

              {/* Shared photos section */}
              {!photosLoading && sharedPhotos.length > 0 && (
                <>
                  <Text style={sharePhotoStyles.sectionTitle}>Already Shared</Text>
                  <View style={sharePhotoStyles.photoGrid}>
                    {sharedPhotos.map((photo) => (
                      <View
                        key={photo.id}
                        style={[sharePhotoStyles.photoTile, sharePhotoStyles.sharedPhotoTile]}
                        testID={`shared-photo-tile-${photo.id}`}
                      >
                        <Image
                          source={{ uri: photo.signedUrl || '' }}
                          style={sharePhotoStyles.photoImage}
                          testID={`shared-photo-image-${photo.id}`}
                        />
                        <View style={sharePhotoStyles.sharedBadge}>
                          <Text style={sharePhotoStyles.sharedBadgeText}>✓</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                </>
              )}
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </Modal>
  )
}

// ============================================================================
// COMPONENT
// ============================================================================

export function ChatScreen(): React.ReactNode {
  const route = useRoute<ChatRouteProp>()
  const navigation = useNavigation<MainStackNavigationProp>()
  const { userId } = useAuth()

  const { conversationId } = route.params

  // Tutorial tooltip state for messaging onboarding
  const tutorial = useTutorialState('messaging')

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
  const [sharePhotoModalVisible, setSharePhotoModalVisible] = useState(false)

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

  const {
    mySharedPhotos,
    sharedWithMe,
    sharing: sharingPhoto,
    sharePhoto,
    refresh: loadSharedPhotos,
    isPhotoShared,
    hasSharedPhotos,
    hasSharedAnyPhotos,
  } = usePhotoSharing(conversationId)

  const {
    approvedPhotos,
    loading: photosLoading,
    refresh: refreshProfilePhotos,
  } = useProfilePhotos()

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
      await loadSharedPhotos()
      await refreshProfilePhotos()
    }
    setConversationLoading(false)
  }, [fetchConversation, fetchMessages, loadSharedPhotos, refreshProfilePhotos])

  // ---------------------------------------------------------------------------
  // EFFECTS
  // ---------------------------------------------------------------------------

  useEffect(() => {
    setConversationLoading(true)
    loadData()
  }, [loadData])

  // ---------------------------------------------------------------------------
  // EVENT HANDLERS
  // ---------------------------------------------------------------------------

  const handleSendMessage = useCallback(async () => {
    if (!canSend) return

    const messageContent = messageText
    setMessageText('')

    await sendMessage(messageContent, (newMessage) => {
      // Message will be added via realtime subscription
    })
  }, [canSend, messageText, sendMessage])

  const handleRefresh = useCallback(async () => {
    setRefreshing(true)
    await fetchMessages(true)
    setRefreshing(false)
  }, [fetchMessages])

  const handleLoadMore = useCallback(() => {
    if (hasMoreMessages && !loadingMore && !messagesLoading) {
      const lastMessage = messages[messages.length - 1]
      if (lastMessage) {
        fetchMessages(false, lastMessage.id)
      }
    }
  }, [hasMoreMessages, loadingMore, messagesLoading, messages, fetchMessages])

  const handleReportMessage = useCallback((message: Message) => {
    setMessageToReport(message)
    setReportModalVisible(true)
  }, [])

  const handleReportUser = useCallback(() => {
    setUserReportModalVisible(true)
  }, [])

  const handleBlockUser = useCallback(async () => {
    if (!otherUserId) return

    const blocked = await performBlockUser(userId || '', otherUserId)
    if (blocked) {
      navigation.goBack()
    }
  }, [otherUserId, userId, performBlockUser, navigation])

  const handleSharePhoto = useCallback(async (photoId: string) => {
    try {
      const success = await sharePhoto(photoId)
      if (success) {
        successFeedback()
      } else {
        errorFeedback()
        Alert.alert('Error', 'Failed to share photo. Please try again.')
      }
    } catch (error) {
      errorFeedback()
      Alert.alert('Error', 'Failed to share photo. Please try again.')
    }
  }, [sharePhoto])

  // ---------------------------------------------------------------------------
  // RENDER HELPERS
  // ---------------------------------------------------------------------------

  const renderMessage = useCallback(
    ({ item }: { item: MessageListItem }) => {
      if (item.type === 'separator') {
        return <DateSeparator timestamp={item.data as string} />
      }

      const message = item.data as Message
      const isOwn = message.sender_id === userId
      const messageIndex = messages.findIndex(m => m.id === message.id)
      const position = getBubblePosition(
        messages,
        messageIndex,
        userId || ''
      )

      return (
        <ChatBubble
          message={message}
          isOwn={isOwn}
          position={position}
          onLongPress={() => {
            if (isOwn) {
              handleReportMessage(message)
            } else {
              Alert.alert('Message', message.content, [
                {
                  text: 'Report Message',
                  onPress: () => handleReportMessage(message),
                },
                { text: 'Cancel', style: 'cancel' },
              ])
            }
          }}
        />
      )
    },
    [userId, messages, handleReportMessage]
  )

  const renderHeader = useCallback(() => {
    if (conversationLoading) {
      return (
        <View style={styles.headerContainer}>
          <LoadingSpinner />
        </View>
      )
    }

    if (conversationError) {
      return (
        <View style={styles.headerContainer}>
          <ErrorState message={conversationError} />
        </View>
      )
    }

    return null
  }, [conversationLoading, conversationError])

  const renderEmpty = useCallback(() => {
    if (!conversationLoading && !messagesLoading && messages.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <EmptyState
            title="Start the Conversation"
            description="Send a message to begin chatting with this user"
          />
        </View>
      )
    }
    return null
  }, [conversationLoading, messagesLoading, messages])

  const renderInput = useCallback(() => {
    if (conversationError || !conversation?.status) {
      return null
    }

    return (
      <Tooltip
        isVisible={tutorial.showMessageInputTutorial}
        content={
          <View>
            <Text style={{ color: 'white', fontSize: 14 }}>
              Type your message here
            </Text>
          </View>
        }
        placement="top"
        onClose={() => tutorial.dismissMessageInputTutorial()}
      >
        <View style={styles.inputContainer}>
          <TextInput
            ref={inputRef}
            style={styles.input}
            placeholder="Type a message..."
            placeholderTextColor={COLORS.inputPlaceholder}
            value={messageText}
            onChangeText={setMessageText}
            editable={!sending && conversation?.status === 'active'}
            maxLength={MAX_MESSAGE_LENGTH}
            multiline
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              { backgroundColor: canSend ? COLORS.sendButtonActive : COLORS.sendButtonDisabled },
            ]}
            onPress={handleSendMessage}
            disabled={!canSend}
          >
            <Text style={styles.sendButtonText}>Send</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.photoButton}
            onPress={() => setSharePhotoModalVisible(true)}
            disabled={!conversation || conversation.status !== 'active'}
          >
            <Text style={styles.photoButtonText}>📷</Text>
          </TouchableOpacity>
        </View>
      </Tooltip>
    )
  }, [
    conversationError,
    conversation,
    messageText,
    canSend,
    sending,
    handleSendMessage,
    tutorial,
  ])

  // ---------------------------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------------------------

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />

      {messagesLoading && messages.length === 0 ? (
        <View style={styles.loadingContainer}>
          <LoadingSpinner />
        </View>
      ) : (
        <>
          {renderHeader()}

          <FlatList
            ref={flatListRef}
            data={messageListItems}
            renderItem={renderMessage}
            keyExtractor={(item) => item.id}
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.5}
            ListEmptyComponent={renderEmpty}
            refreshing={refreshing}
            onRefresh={handleRefresh}
            scrollEnabled
            nestedScrollEnabled
          />

          {renderInput()}
        </>
      )}

      {/* Modals */}
      <ReportMessageModal
        visible={reportModalVisible}
        message={messageToReport}
        onClose={() => {
          setReportModalVisible(false)
          setMessageToReport(null)
        }}
      />

      <ReportUserModal
        visible={userReportModalVisible}
        onClose={() => setUserReportModalVisible(false)}
        onBlock={handleBlockUser}
      />

      <SharePhotoModal
        visible={sharePhotoModalVisible}
        onClose={() => setSharePhotoModalVisible(false)}
        approvedPhotos={approvedPhotos}
        photosLoading={photosLoading}
        isPhotoShared={isPhotoShared}
        onSharePhoto={handleSharePhoto}
        sharing={sharingPhoto}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerContainer: {
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: COLORS.inputBackground,
    borderTopWidth: 1,
    borderTopColor: COLORS.inputBorder,
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: COLORS.inputText,
    maxHeight: 100,
  },
  sendButton: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    borderRadius: 20,
  },
  sendButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  photoButton: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  photoButtonText: {
    fontSize: 20,
  },
})

const sharePhotoStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  overlayTouchable: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.inputBorder,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.inputText,
  },
  closeButton: {
    padding: 8,
  },
  closeButtonText: {
    fontSize: 24,
    color: COLORS.textSecondary,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  emptyContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.inputText,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 16,
  },
  instructions: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 16,
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.inputText,
    marginBottom: 12,
    marginTop: 16,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  photoTile: {
    width: '48%',
    aspectRatio: 1,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: COLORS.inputBorder,
  },
  photoImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  sharedPhotoTile: {
    opacity: 0.6,
  },
  sharingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sharedBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#34C759',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sharedBadgeText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
})