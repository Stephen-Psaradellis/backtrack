'use client'

/**
 * MessageList Component
 *
 * Renders a scrollable list of chat messages with:
 * - Date separators between message groups
 * - Scroll-to-bottom behavior for new messages
 * - Empty state when no messages exist
 * - Loading indicators for pagination
 * - Virtualization support for performance with many messages
 * - Typing indicator display
 *
 * The component uses intersection observer for efficient scroll handling
 * and memoization to prevent unnecessary re-renders.
 */

import React, {
  memo,
  useRef,
  useEffect,
  useCallback,
  useMemo,
  useState,
} from 'react'
import { MessageBubble } from './MessageBubble'
import { TypingIndicator } from './TypingIndicator'
import { shouldShowDateSeparator, getDateSeparatorText } from './utils/formatters'
import type { MessageListProps, MessageWithSender, OptimisticMessageDisplay } from '../../types/chat'
import { CHAT_CONSTANTS } from '../../types/chat'
import styles from './styles/ChatScreen.module.css'

/**
 * Type guard to check if a message is optimistic
 */
function isOptimisticMessage(
  message: MessageWithSender | OptimisticMessageDisplay
): message is OptimisticMessageDisplay {
  return '_optimistic' in message && message._optimistic === true
}

/**
 * MessageList renders a scrollable list of chat messages
 *
 * @param messages - Array of messages to display
 * @param currentUserId - The current user's ID for determining sent/received styling
 * @param isLoadingMore - Whether older messages are being loaded
 * @param hasMoreMessages - Whether there are more older messages to load
 * @param isOtherUserTyping - Whether the other user is currently typing
 * @param otherUserName - Name of the other user for typing indicator
 * @param onLoadMore - Callback to load older messages
 * @param onRetryMessage - Callback to retry sending a failed message
 * @param onDeleteMessage - Callback to delete a failed message
 */
function MessageListComponent({
  messages,
  currentUserId,
  isLoadingMore,
  hasMoreMessages,
  isOtherUserTyping,
  otherUserName,
  onLoadMore,
  onRetryMessage,
  onDeleteMessage,
}: MessageListProps) {
  // Refs for scroll handling
  const containerRef = useRef<HTMLDivElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const loadMoreTriggerRef = useRef<HTMLDivElement>(null)
  const prevMessagesLengthRef = useRef(messages.length)
  const isUserScrolledRef = useRef(false)

  // Track whether we should auto-scroll to bottom
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true)

  /**
   * Scroll to bottom of the message list
   * Uses smooth scrolling for a better UX
   */
  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior, block: 'end' })
  }, [])

  /**
   * Check if the user is scrolled near the bottom
   * Used to determine if we should auto-scroll on new messages
   */
  const isNearBottom = useCallback(() => {
    const container = containerRef.current
    if (!container) return true

    const threshold = CHAT_CONSTANTS.SCROLL_THRESHOLD
    return (
      container.scrollHeight - container.scrollTop - container.clientHeight < threshold
    )
  }, [])

  /**
   * Handle scroll events to track user scroll position
   * and trigger loading more messages
   */
  const handleScroll = useCallback(() => {
    const container = containerRef.current
    if (!container) return

    // Track if user is scrolled to bottom
    const nearBottom = isNearBottom()
    setShouldAutoScroll(nearBottom)
    isUserScrolledRef.current = !nearBottom

    // Load more messages when scrolled near top
    if (
      container.scrollTop < CHAT_CONSTANTS.SCROLL_THRESHOLD &&
      hasMoreMessages &&
      !isLoadingMore
    ) {
      onLoadMore()
    }
  }, [hasMoreMessages, isLoadingMore, onLoadMore, isNearBottom])

  /**
   * Effect: Scroll to bottom when new messages arrive
   * Only auto-scrolls if user hasn't scrolled up
   */
  useEffect(() => {
    const newMessagesAdded = messages.length > prevMessagesLengthRef.current
    prevMessagesLengthRef.current = messages.length

    // Auto-scroll to bottom for new messages if user is near bottom
    if (newMessagesAdded && shouldAutoScroll) {
      scrollToBottom()
    }
  }, [messages.length, shouldAutoScroll, scrollToBottom])

  /**
   * Effect: Initial scroll to bottom
   */
  useEffect(() => {
    // Instant scroll to bottom on mount
    scrollToBottom('instant')
  }, [scrollToBottom])

  /**
   * Effect: Set up Intersection Observer for loading more messages
   * This is more performant than scroll event listening for pagination
   */
  useEffect(() => {
    const trigger = loadMoreTriggerRef.current
    if (!trigger || !hasMoreMessages) return

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        if (entry.isIntersecting && hasMoreMessages && !isLoadingMore) {
          onLoadMore()
        }
      },
      {
        root: containerRef.current,
        rootMargin: '100px',
        threshold: 0,
      }
    )

    observer.observe(trigger)

    return () => {
      observer.disconnect()
    }
  }, [hasMoreMessages, isLoadingMore, onLoadMore])

  /**
   * Memoize messages with date separator info
   * Pre-compute which messages need date separators
   */
  const messagesWithSeparators = useMemo(() => {
    return messages.map((message, index) => {
      const previousMessage = index > 0 ? messages[index - 1] : null
      const showSeparator = shouldShowDateSeparator(
        message.created_at,
        previousMessage?.created_at ?? null
      )
      return {
        message,
        showDateSeparator: showSeparator,
        dateSeparatorText: showSeparator ? getDateSeparatorText(message.created_at) : '',
      }
    })
  }, [messages])

  /**
   * Render the empty state when there are no messages
   */
  const renderEmptyState = () => (
    <div className={styles.emptyState}>
      <div className={styles.emptyStateIcon} aria-hidden="true">
        <MessageIcon />
      </div>
      <p className={styles.emptyStateText}>
        No messages yet. Start the conversation!
      </p>
    </div>
  )

  /**
   * Render the loading indicator for older messages
   */
  const renderLoadingMore = () => (
    <div className={styles.loadingMoreContainer} role="status" aria-live="polite">
      <div className={styles.spinner} aria-hidden="true" />
      <span className={styles.loadingMoreText}>Loading older messages...</span>
    </div>
  )

  return (
    <div
      ref={containerRef}
      className={styles.messageListContainer}
      onScroll={handleScroll}
      role="log"
      aria-label="Chat messages"
      aria-live="polite"
    >
      {/* Intersection observer trigger for loading more */}
      {hasMoreMessages && (
        <div
          ref={loadMoreTriggerRef}
          className={styles.loadMoreTrigger}
          aria-hidden="true"
        />
      )}

      {/* Loading indicator for older messages */}
      {isLoadingMore && renderLoadingMore()}

      {/* Empty state */}
      {messages.length === 0 && !isLoadingMore && renderEmptyState()}

      {/* Message list with virtualization-ready structure */}
      <div className={styles.messagesList}>
        {messagesWithSeparators.map(({ message, showDateSeparator, dateSeparatorText }) => (
          <div key={message.id} className={styles.messageWrapper}>
            {/* Date separator */}
            {showDateSeparator && (
              <div className={styles.dateSeparator} role="separator">
                <span className={styles.dateSeparatorLine} aria-hidden="true" />
                <span className={styles.dateSeparatorText}>{dateSeparatorText}</span>
                <span className={styles.dateSeparatorLine} aria-hidden="true" />
              </div>
            )}

            {/* Message bubble */}
            <MessageBubble
              message={message}
              isOwn={message.sender_id === currentUserId}
              onRetry={onRetryMessage}
              onDelete={onDeleteMessage}
            />
          </div>
        ))}
      </div>

      {/* Typing indicator */}
      <TypingIndicator isTyping={isOtherUserTyping} username={otherUserName} />

      {/* Scroll anchor */}
      <div ref={messagesEndRef} className={styles.scrollAnchor} aria-hidden="true" />
    </div>
  )
}

/**
 * Message icon for empty state
 */
function MessageIcon() {
  return (
    <svg
      width="48"
      height="48"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  )
}

/**
 * Memoized MessageList for performance optimization
 * Only re-renders when props change
 */
export const MessageList = memo(MessageListComponent)
