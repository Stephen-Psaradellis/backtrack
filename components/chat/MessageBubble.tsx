'use client'

/**
 * MessageBubble Component
 *
 * Renders an individual chat message with appropriate styling based on
 * whether it was sent or received.
 */

import React, { memo, useCallback } from 'react'
import { Check, CheckCheck } from 'lucide-react'
import type { MessageBubbleProps, OptimisticMessageDisplay } from '../../types/chat'
import { formatMessageTime } from './utils/formatters'
import styles from './styles/ChatScreen.module.css'

function isOptimisticMessage(
  message: MessageBubbleProps['message']
): message is OptimisticMessageDisplay {
  return '_optimistic' in message && message._optimistic === true
}

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
        <p className={styles.messageContent}>{message.content}</p>

        <div className={styles.messageFooter}>
          <span className={styles.messageTime}>
            {formatMessageTime(message.created_at)}
          </span>

          {isOwn && (
            <MessageStatus
              isOptimistic={isOptimistic}
              optimisticStatus={optimisticStatus}
              isRead={message.is_read}
            />
          )}
        </div>

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
          <CheckCheck size={16} strokeWidth={2} />
        </span>
      ) : (
        <span className={styles.sentIcon} aria-hidden="true">
          <Check size={16} strokeWidth={2} />
        </span>
      )}
    </span>
  )
}

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

export const MessageBubble = memo(MessageBubbleComponent)
