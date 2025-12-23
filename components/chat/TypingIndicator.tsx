'use client'

/**
 * TypingIndicator Component
 *
 * Displays an animated typing indicator when the other user is typing.
 * Features:
 * - Animated bouncing dots
 * - Optional username display
 * - Accessible with proper ARIA attributes
 * - Memoized for performance
 *
 * @example
 * ```tsx
 * <TypingIndicator isTyping={isOtherUserTyping} username="Sarah" />
 * ```
 */

import React, { memo } from 'react'
import type { TypingIndicatorProps } from '../../types/chat'
import styles from './styles/ChatScreen.module.css'

/**
 * TypingIndicator shows animated dots when someone is typing
 *
 * @param isTyping - Whether to show the typing indicator
 * @param username - Optional name of the person typing
 */
function TypingIndicatorComponent({ isTyping, username }: TypingIndicatorProps) {
  // Don't render if not typing
  if (!isTyping) {
    return null
  }

  const displayName = username || 'Someone'

  return (
    <div className={styles.typingContainer} role="status" aria-live="polite">
      <div className={styles.typingBubbleWrapper}>
        <div className={styles.typingDotsContainer} aria-hidden="true">
          <span className={`${styles.typingDot} ${styles.typingDotDelay1}`} />
          <span className={`${styles.typingDot} ${styles.typingDotDelay2}`} />
          <span className={`${styles.typingDot} ${styles.typingDotDelay3}`} />
        </div>
      </div>
      <span className={styles.typingText}>
        {displayName} is typing...
      </span>
    </div>
  )
}

/**
 * Memoized TypingIndicator for performance optimization
 * Only re-renders when props change
 */
export const TypingIndicator = memo(TypingIndicatorComponent)
