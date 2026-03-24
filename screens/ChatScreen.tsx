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
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useRoute, useNavigation } from '@react-navigation/native'
import Tooltip from 'react-native-walkthrough-tooltip'

import { darkTheme } from '../constants/glassStyles'
import { useToast } from '../contexts/ToastContext'
import {
  successFeedback,
  errorFeedback,
  selectionFeedback,
} from '../lib/haptics'
import { usePhotoSharing } from '../hooks/usePhotoSharing'
import { useProfilePhotos } from '../hooks/useProfilePhotos'
import { useTutorialState } from '../hooks/useTutorialState'
import { useNetworkStatus } from '../hooks/useNetworkStatus'
import { useChatMessages } from '../hooks/chat/useChatMessages'
import type { SharedPhotoWithUrl } from '../lib/photoSharing'
import type { ProfilePhotoWithUrl } from '../lib/profilePhotos'
import {
  ChatBubble,
  DateSeparator,
  getBubblePosition,
} from '../components/ChatBubble'
import { IcebreakerChips } from '../components/chat/IcebreakerChips'
import { SafetyPrompt } from '../components/chat/SafetyPrompt'
import { TypingIndicator } from '../components/chat/TypingIndicator'
import { useTypingIndicator } from '../components/chat/hooks/useTypingIndicator'
import { useSendMessage } from '../components/chat/hooks/useSendMessage'
import { useBlockUser } from '../components/chat/hooks/useBlockUser'
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
import type { ChatRouteProp, MainStackNavigationProp } from '../navigation/types'
import type { Message, Conversation } from '../types/database'
import { sanitizeForDisplay } from '../lib/utils/sanitize'
import { detectSensitiveContent } from '../lib/utils/safetyDetection'

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
  primary: darkTheme.accent,
  background: darkTheme.background,
  inputBackground: darkTheme.cardBackground,
  inputBorder: darkTheme.cardBorder,
  inputText: darkTheme.textPrimary,
  inputPlaceholder: darkTheme.textMuted,
  sendButtonActive: darkTheme.primary,
  sendButtonDisabled: 'rgba(255, 107, 71, 0.3)',
  textSecondary: darkTheme.textSecondary,
  error: darkTheme.error,
  warning: darkTheme.warning,
} as const

const MAX_MESSAGE_LENGTH = 10000

// ============================================================================
// CUSTOM HOOKS
// ============================================================================

// All custom hooks have been extracted to separate files for better testability:
// - useChatMessages: hooks/chat/useChatMessages.ts
// - useSendMessage: components/chat/hooks/useSendMessage.ts
// - useBlockUser: components/chat/hooks/useBlockUser.ts

/**
 * Optimistic message status
 */
type OptimisticStatus = 'sending' | 'sent' | 'failed'

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
  const { showToast } = useToast()

  const { conversationId: rawConversationId } = route.params
  // Validate conversationId from deep links
  const conversationId = rawConversationId && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(rawConversationId) ? rawConversationId : null

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
  const [locationName, setLocationName] = useState<string | null>(null)
  const [showIcebreakers, setShowIcebreakers] = useState(true)
  const [userHasSentMessage, setUserHasSentMessage] = useState(false)
  const [safetyPromptDismissed, setSafetyPromptDismissed] = useState(false)
  const [sensitiveContentWarning, setSensitiveContentWarning] = useState<string | null>(null)

  const insets = useSafeAreaInsets()
  const [refreshing, setRefreshing] = useState(false)
  const [reportModalVisible, setReportModalVisible] = useState(false)
  const [messageToReport, setMessageToReport] = useState<Message | null>(null)
  const [userReportModalVisible, setUserReportModalVisible] = useState(false)
  const [sharePhotoModalVisible, setSharePhotoModalVisible] = useState(false)

  // Network status for offline indicator and reconnection
  const { isConnected } = useNetworkStatus()
  const wasDisconnectedRef = useRef(false)

  // Custom hooks
  const {
    messages,
    loading: messagesLoading,
    error: messagesError,
    hasMoreMessages,
    loadingMore,
    fetchMessages,
    newMessageIds,
  } = useChatMessages(conversationId, userId)

  // Optimistic message state - tracks messages shown before server confirms
  const [optimisticMessages, setOptimisticMessages] = useState<Map<string, OptimisticStatus>>(new Map())

  // Track optimistic messages for animation
  const [optimisticNewMessageIds, setOptimisticNewMessageIds] = useState<Set<string>>(new Set())

  const handleOptimisticAdd = useCallback((message: Message) => {
    // The realtime subscription will pick up the confirmed message;
    // for optimistic we manually prepend it to the message list via direct state update
    // handled by parent setting messages directly in useChatMessages wouldn't work
    // Instead we track status only here and show inline in the existing message list
    setOptimisticMessages(prev => new Map(prev).set(message.id, 'sending'))

    // Mark as new for animation
    setOptimisticNewMessageIds(prev => new Set(prev).add(message.id))
    // Remove from animation set after animation completes
    setTimeout(() => {
      setOptimisticNewMessageIds(prev => {
        const next = new Set(prev)
        next.delete(message.id)
        return next
      })
    }, 500)
  }, [])

  const handleOptimisticConfirm = useCallback((localId: string, _confirmed: Message) => {
    setOptimisticMessages(prev => {
      const next = new Map(prev)
      next.delete(localId)
      return next
    })
    // Also remove from optimistic animation tracking
    setOptimisticNewMessageIds(prev => {
      const next = new Set(prev)
      next.delete(localId)
      return next
    })
  }, [])

  const handleOptimisticFail = useCallback((localId: string) => {
    setOptimisticMessages(prev => new Map(prev).set(localId, 'failed'))
  }, [])

  const handleOptimisticRemove = useCallback((localId: string) => {
    setOptimisticMessages(prev => {
      const next = new Map(prev)
      next.delete(localId)
      return next
    })
  }, [])

  const {
    isSending,
    optimisticMessages: optimisticMessagesFromHook,
    sendMessage,
    retryMessage,
    deleteFailedMessage,
  } = useSendMessage({
    conversationId,
    currentUserId: userId || '',
    onError: (error) => {
      showToast({ message: error, variant: 'error' })
    },
  })

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

  const { blockUser: performBlockUser } = useBlockUser({
    currentUserId: userId || '',
    targetUserId: otherUserId || '',
    conversationId,
    onNavigateAway: () => navigation.goBack(),
    onError: (error) => {
      showToast({ message: error, variant: 'error' })
    },
  })

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

  // Typing indicator hook
  const { isOtherUserTyping, broadcastTyping } = useTypingIndicator({
    conversationId,
    currentUserId: userId || '',
  })

  const canSend = useMemo(() => {
    const trimmedMessage = messageText.trim()
    return (
      trimmedMessage.length > 0 &&
      trimmedMessage.length <= MAX_MESSAGE_LENGTH &&
      !isSending &&
      !messagesError &&
      conversation?.status === 'active'
    )
  }, [messageText, isSending, messagesError, conversation])

  const messageListItems = useMemo((): MessageListItem[] => {
    if (messages.length === 0) return []

    // Messages are in DESC order (newest first, index 0 = newest).
    // With inverted FlatList, index 0 renders at the bottom (newest at bottom).
    // Date separators go after (higher index) the messages they label,
    // because inverted rendering means higher indices appear above.
    const items: MessageListItem[] = []

    for (let i = 0; i < messages.length; i++) {
      const message = messages[i]
      items.push({
        type: 'message',
        id: message.id,
        data: message,
      })

      // Check if a date separator should appear between this message
      // and the next older message (which will render above in inverted list)
      const nextMessage = i < messages.length - 1 ? messages[i + 1] : null
      if (nextMessage) {
        const currentDate = new Date(message.created_at).toDateString()
        const nextDate = new Date(nextMessage.created_at).toDateString()
        if (currentDate !== nextDate) {
          items.push({
            type: 'separator',
            id: `separator-${message.id}`,
            data: message.created_at,
          })
        }
      } else {
        // Last (oldest) message - always show date separator above it
        items.push({
          type: 'separator',
          id: `separator-${message.id}`,
          data: message.created_at,
        })
      }
    }

    return items
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

    // Fetch location name for header display
    if (result.conversation.post_id) {
      try {
        const { data: post } = await supabase
          .from('posts')
          .select('location_id')
          .eq('id', result.conversation.post_id)
          .maybeSingle()

        if (post?.location_id) {
          const { data: location } = await supabase
            .from('locations')
            .select('name')
            .eq('id', post.location_id)
            .maybeSingle()
          setLocationName(location?.name || null)
        }
      } catch {
        // Non-critical - header will show fallback title
      }
    }

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

  // Initial load - only run once on mount
  // Using conversationId as dependency to reload if conversation changes
  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId])

  // Reconnection: refetch missed messages when connection restores
  useEffect(() => {
    if (!isConnected) {
      wasDisconnectedRef.current = true
      return
    }

    if (wasDisconnectedRef.current) {
      wasDisconnectedRef.current = false
      // Refetch messages to catch anything missed while offline
      fetchMessages(true)
    }
  }, [isConnected, fetchMessages])

  // ---------------------------------------------------------------------------
  // EVENT HANDLERS
  // ---------------------------------------------------------------------------

  const handleSendMessage = useCallback(async () => {
    if (!canSend) return

    const messageContent = messageText
    setMessageText('')

    // Hide icebreakers after first message
    if (!userHasSentMessage) {
      setUserHasSentMessage(true)
      setShowIcebreakers(false)
    }

    await sendMessage(messageContent)
  }, [canSend, messageText, sendMessage, userHasSentMessage])

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
    if (!otherUserId || !userId) return
    await performBlockUser()
  }, [otherUserId, userId, performBlockUser])

  const handleSharePhoto = useCallback(async (photoId: string) => {
    try {
      const success = await sharePhoto(photoId)
      if (success) {
        successFeedback()
      } else {
        errorFeedback()
        showToast({
          message: 'Failed to share photo. Please try again.',
          variant: 'error',
        })
      }
    } catch (error) {
      errorFeedback()
      showToast({
        message: 'Failed to share photo. Please try again.',
        variant: 'error',
      })
    }
  }, [sharePhoto, showToast])

  const handleIcebreakerSelect = useCallback((text: string) => {
    setMessageText(text)
    // Hide icebreakers after selection
    setShowIcebreakers(false)
    // Focus input
    inputRef.current?.focus()
  }, [])

  const handleMessageTextChange = useCallback((text: string) => {
    setMessageText(text)

    // Broadcast typing status when user types
    if (text.length > 0) {
      broadcastTyping()
    }

    // Detect sensitive content and show warning
    if (text.trim().length > 0) {
      const detection = detectSensitiveContent(text)
      if (detection.hasSensitiveContent) {
        setSensitiveContentWarning(detection.warning)
      } else {
        setSensitiveContentWarning(null)
      }
    } else {
      setSensitiveContentWarning(null)
    }
  }, [broadcastTyping])

  // ---------------------------------------------------------------------------
  // RENDER HELPERS
  // ---------------------------------------------------------------------------

  // P-012: Pre-compute message index map for O(1) lookups
  const messageIndexMap = useMemo(() => {
    const map = new Map<string, number>()
    messages.forEach((m, i) => map.set(m.id, i))
    return map
  }, [messages])

  const renderMessage = useCallback(
    ({ item }: { item: MessageListItem }) => {
      if (item.type === 'separator') {
        return <DateSeparator timestamp={item.data as string} />
      }

      const message = item.data as Message
      const isOwn = message.sender_id === userId
      const messageIndex = messageIndexMap.get(message.id) ?? -1
      const position = getBubblePosition(
        messages,
        messageIndex,
        userId || ''
      )

      // Get optimistic message status
      const messageStatus = optimisticMessages.get(message.id)

      // Check if this message is new (should be animated)
      const isNewMessage = newMessageIds.has(message.id) || optimisticNewMessageIds.has(message.id)

      return (
        <ChatBubble
          message={message}
          isOwn={isOwn}
          position={position}
          status={messageStatus}
          isNew={isNewMessage}
          onRetry={messageStatus === 'failed' ? retryMessage : undefined}
          onLongPress={() => {
            if (isOwn) {
              handleReportMessage(message)
            } else {
              // Sanitize content before displaying in Alert to prevent injection
              const safeContent = sanitizeForDisplay(message.content, 500)
              Alert.alert('Message', safeContent, [
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
    [userId, messages, messageIndexMap, handleReportMessage, optimisticMessages, retryMessage, newMessageIds, optimisticNewMessageIds]
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
          <ErrorState error={conversationError} />
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
            message="Send a message to begin chatting with this user"
          />
        </View>
      )
    }
    return null
  }, [conversationLoading, messagesLoading, messages])

  const renderTypingIndicator = useCallback(() => {
    return <TypingIndicator isVisible={isOtherUserTyping} testID="chat-typing-indicator" />
  }, [isOtherUserTyping])

  const renderInput = useCallback(() => {
    if (conversationError || !conversation?.status) {
      return null
    }

    const shouldShowIcebreakers = showIcebreakers && !userHasSentMessage && messages.filter(m => m.sender_id === userId).length === 0

    return (
      <>
        <IcebreakerChips
          visible={shouldShowIcebreakers}
          onSelect={handleIcebreakerSelect}
          testID="chat-icebreakers"
        />
        <Tooltip
          isVisible={tutorial.isVisible}
          content={
            <View style={{ padding: 8 }}>
              <Text style={{ color: 'white', fontSize: 16, fontWeight: '600', marginBottom: 4 }}>
                Start Chatting
              </Text>
              <Text style={{ color: 'rgba(255, 255, 255, 0.9)', fontSize: 14 }}>
                Type a message below and tap Send to start your conversation. Your identity stays anonymous until you both decide to share photos.
              </Text>
            </View>
          }
          placement="top"
          onClose={() => tutorial.markComplete()}
        >
          <View>
            <View style={styles.inputContainer}>
              <TextInput
                ref={inputRef}
                style={styles.input}
                placeholder="Type a message..."
                placeholderTextColor={COLORS.inputPlaceholder}
                value={messageText}
                onChangeText={handleMessageTextChange}
                editable={!isSending && conversation?.status === 'active'}
                maxLength={MAX_MESSAGE_LENGTH}
                multiline
                testID="chat-message-input"
              />
              <TouchableOpacity
                style={[
                  styles.sendButton,
                  { backgroundColor: canSend ? COLORS.sendButtonActive : COLORS.sendButtonDisabled },
                ]}
                onPress={handleSendMessage}
                disabled={!canSend}
                testID="chat-send-button"
              >
                <Ionicons name="send" size={20} color="#FFFFFF" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.photoButton}
                onPress={() => setSharePhotoModalVisible(true)}
                disabled={!conversation || conversation.status !== 'active'}
                testID="chat-photo-button"
              >
                <Ionicons name="camera-outline" size={22} color={darkTheme.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Sensitive content warning */}
            {sensitiveContentWarning && (
              <View style={styles.warningContainer} testID="chat-safety-warning">
                <Ionicons name="warning-outline" size={16} color={COLORS.warning} />
                <Text style={styles.warningText}>{sensitiveContentWarning}</Text>
              </View>
            )}
          </View>
        </Tooltip>
      </>
    )
  }, [
    conversationError,
    conversation,
    messageText,
    canSend,
    isSending,
    handleSendMessage,
    tutorial,
    showIcebreakers,
    userHasSentMessage,
    messages,
    userId,
    handleIcebreakerSelect,
    handleMessageTextChange,
    sensitiveContentWarning,
  ])

  // ---------------------------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------------------------

  const handleHeaderMenu = useCallback(() => {
    Alert.alert('Options', undefined, [
      {
        text: 'Report User',
        onPress: handleReportUser,
      },
      {
        text: 'Block User',
        style: 'destructive',
        onPress: () => {
          Alert.alert(
            'Block User',
            'Are you sure you want to block this user? You will no longer be able to communicate with them.',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Block', style: 'destructive', onPress: handleBlockUser },
            ]
          )
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ])
  }, [handleReportUser, handleBlockUser])

  const headerTitle = locationName
    ? `Missed Connection at ${locationName}`
    : 'Conversation'

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      testID="chat-screen"
    >
      <StatusBar barStyle="light-content" backgroundColor={darkTheme.background} />

      {/* Chat Header */}
      <View style={[styles.chatHeader, { paddingTop: insets.top }]} testID="chat-header">
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.chatHeaderBackButton}
          testID="chat-header-back"
          accessibilityLabel="Go back"
          accessibilityRole="button"
        >
          <Ionicons name="chevron-back" size={24} color={darkTheme.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.chatHeaderTitle} numberOfLines={1}>
          {headerTitle}
        </Text>
        <TouchableOpacity
          onPress={handleHeaderMenu}
          style={styles.chatHeaderMenuButton}
          testID="chat-header-menu"
          accessibilityLabel="More options"
          accessibilityRole="button"
        >
          <Ionicons name="ellipsis-vertical" size={20} color={darkTheme.textPrimary} />
        </TouchableOpacity>
      </View>

      {/* Offline indicator banner */}
      {!isConnected && (
        <View style={styles.offlineBanner} testID="chat-offline-banner">
          <Text style={styles.offlineBannerText}>
            No internet connection — messages will send when you reconnect
          </Text>
        </View>
      )}

      {messagesLoading && messages.length === 0 ? (
        <View style={styles.loadingContainer}>
          <LoadingSpinner />
        </View>
      ) : (
        <>
          {renderHeader()}

          {/* Safety prompt - show when conversation has < 3 total messages */}
          <SafetyPrompt
            visible={messages.length < 3 && !safetyPromptDismissed}
            onDismiss={() => setSafetyPromptDismissed(true)}
            testID="chat-safety-prompt"
          />

          <FlatList
            ref={flatListRef}
            data={messageListItems}
            renderItem={renderMessage}
            keyExtractor={(item) => item.id}
            inverted
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.5}
            ListEmptyComponent={renderEmpty}
            ListFooterComponent={renderTypingIndicator}
            refreshing={refreshing}
            onRefresh={handleRefresh}
            scrollEnabled
            nestedScrollEnabled
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            windowSize={5}
            maxToRenderPerBatch={5}
            removeClippedSubviews={true}
            testID="chat-message-list"
          />

          {renderInput()}
        </>
      )}

      {/* Modals */}
      <ReportMessageModal
        visible={reportModalVisible}
        reportedId={messageToReport?.id ?? ''}
        onClose={() => {
          setReportModalVisible(false)
          setMessageToReport(null)
        }}
      />

      <ReportUserModal
        visible={userReportModalVisible}
        reportedId={otherUserId ?? ''}
        onClose={() => setUserReportModalVisible(false)}
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
  chatHeader: {
    backgroundColor: darkTheme.background,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: darkTheme.cardBorder,
  },
  chatHeaderBackButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chatHeaderTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: darkTheme.textPrimary,
    marginHorizontal: 4,
  },
  chatHeaderMenuButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  offlineBanner: {
    backgroundColor: '#B45309',
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  offlineBannerText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
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
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(245, 158, 11, 0.2)',
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    color: COLORS.warning,
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