'use client'

/**
 * MessageBubble Component
 *
 * Renders an individual chat message with appropriate styling based on
 * whether it was sent or received. Handles:
 * - Sent vs received message styling
 * - Timestamp display
 * - Read receipt indicators
 * - Optimistic message status (sending, failed)
 * - Failed message actions (retry, delete)
 * - Long text wrapping
 *
 * @example
 * ```tsx
 * // Regular message
 * <MessageBubble
 *   message={messageData}
 *   isOwn={message.sender_id === currentUserId}
 * />
 *
 * // With retry/delete handlers for optimistic messages
 * <MessageBubble
 *   message={optimisticMessage}
 *   isOwn={true}
 *   onRetry={(id) => retryMessage(id)}
 *   onDelete={(id) => deleteFailedMessage(id)}
 * />
 * ```
 */

import React, { memo, useCallback } from 'react'
import type { MessageBubbleProps, OptimisticMessageDisplay } from '../../types/chat'
import { formatMessageTime } from './utils/formatters'
import styles from './styles/ChatScreen.module.css'

/**
 * Type guard to check if a message is optimistic
 */
function isOptimisticMessage(
  message: MessageBubbleProps['message']
): message is OptimisticMessageDisplay {
  return '_optimistic' in message && message._optimistic === true
}

/**
 * MessageBubble displays a single chat message bubble
 *
 * @param message - The message data to display
 * @param isOwn - Whether the message was sent by the current user
 * @param onRetry - Callback to retry sending a failed message
 * @param onDelete - Callback to delete a failed message
 */
function MessageBubbleComponent({
  message,
  isOwn,
  onRetry,
  onDelete,
}: MessageBubbleProps) {
  const isOptimistic = isOptimisticMessage(message)
  const optimisticStatus = isOptimistic ? message._status : null
  const isFailed = optimisticStatus === 'failed'

  const handleRetry = useCallback(() => {
    onRetry?.(message.id)
  }, [message.id, onRetry])

  const handleDelete = useCallback(() => {
    onDelete?.(message.id)
  }, [message.id, onDelete])

  const messageRowClass = `${styles.messageRow} ${isOwn ? styles.messageRowSent : styles.messageRowReceived}`
  const bubbleClass = `${styles.messageBubble} ${isOwn ? styles.messageBubbleSent : styles.messageBubbleReceived} ${isFailed ? styles.messageBubbleFailed : ''}`

  return (
    <div className={messageRowClass}>
      {/* Avatar for received messages */}
      {!isOwn && (
        <div className={styles.messageAvatar} aria-hidden="true">
          {message.sender?.username?.[0]?.toUpperCase() || '?'}
        </div>
      )}

      <div
        className={bubbleClass}
        role="article"
        aria-label={`Message from ${isOwn ? 'you' : message.sender?.username || 'unknown'}`}
      >
        {/* Message content */}
        <p className={styles.messageContent}>{message.content}</p>

        {/* Message footer with timestamp and status */}
        <div className={styles.messageFooter}>
          <span className={styles.messageTime}>
            {formatMessageTime(message.created_at)}
          </span>

          {/* Status indicator for own messages */}
          {isOwn && (
            <MessageStatus
              isOptimistic={isOptimistic}
              optimisticStatus={optimisticStatus}
              isRead={message.is_read}
            />
          )}
        </div>

        {/* Failed message actions */}
        {isOptimistic && isFailed && (
          <div className={styles.failedActions}>
            <button
              className={styles.retryMessageButton}
              onClick={handleRetry}
              aria-label="Retry sending message"
            >
              Retry
            </button>
            <button
              className={styles.deleteMessageButton}
              onClick={handleDelete}
              aria-label="Delete failed message"
            >
              Delete
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * MessageStatus displays the delivery status of a sent message
 */
interface MessageStatusProps {
  isOptimistic: boolean
  optimisticStatus: 'sending' | 'sent' | 'failed' | null
  isRead: boolean
}

function MessageStatus({ isOptimistic, optimisticStatus, isRead }: MessageStatusProps) {
  return (
    <span className={styles.messageStatus} aria-label={getStatusLabel(isOptimistic, optimisticStatus, isRead)}>
      {isOptimistic ? (
        optimisticStatus === 'sending' ? (
          <span className={styles.sendingIcon} aria-hidden="true">...</span>
        ) : optimisticStatus === 'failed' ? (
          <span className={styles.failedIcon} aria-hidden="true">!</span>
        ) : null
      ) : isRead ? (
        <span className={styles.readIcon} aria-hidden="true">
          <DoubleCheckIcon />
        </span>
      ) : (
        <span className={styles.sentIcon} aria-hidden="true">
          <SingleCheckIcon />
        </span>
      )}
    </span>
  )
}

/**
 * Get accessible label for message status
 */
function getStatusLabel(
  isOptimistic: boolean,
  optimisticStatus: string | null,
  isRead: boolean
): string {
  if (isOptimistic) {
    if (optimisticStatus === 'sending') return 'Sending'
    if (optimisticStatus === 'failed') return 'Failed to send'
    return 'Sent'
  }
  return isRead ? 'Read' : 'Delivered'
}

/**
 * Double check icon for read messages
 */
function DoubleCheckIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M20 6L9 17l-5-5" />
      <path d="M15 6L4 17" />
    </svg>
  )
}

/**
 * Single check icon for delivered messages
 */
function SingleCheckIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M20 6L9 17l-5-5" />
    </svg>
  )
}

/**
 * Memoized MessageBubble for performance optimization
 * Only re-renders when message data or callbacks change
 */
export const MessageBubble = memo(MessageBubbleComponent)
