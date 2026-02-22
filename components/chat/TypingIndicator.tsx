'use client'

/**
 * TypingIndicator Component
 *
 * Displays an animated typing indicator with three bouncing dots when the other user is typing.
 * Features:
 * - Three-dot bouncing animation with CSS animations
 * - Smooth fade in/out animations
 * - Chat bubble styling consistent with received messages
 * - Accessible with proper ARIA attributes
 * - Memoized for performance
 */

import React, { memo } from 'react'
import styles from './styles/ChatScreen.module.css'

// ============================================================================
// TYPES
// ============================================================================

/**
 * Props for the TypingIndicator component
 */
export interface TypingIndicatorProps {
  /**
   * Whether the typing indicator is visible (alias: isTyping)
   */
  isVisible?: boolean

  /**
   * Whether the typing indicator is visible (preferred)
   */
  isTyping?: boolean

  /**
   * Username of the person typing
   */
  username?: string

  /**
   * Test ID for testing
   */
  testID?: string
}

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * TypingIndicator shows three animated bouncing dots when someone is typing
 *
 * @param isVisible - Whether to show the typing indicator (also accepts isTyping)
 * @param isTyping - Whether to show the typing indicator
 * @param username - Username of the person typing
 * @param testID - Test ID for testing
 */
function TypingIndicatorComponent({ isVisible, isTyping, username, testID }: TypingIndicatorProps) {
  const visible = isVisible ?? isTyping ?? false
  const displayName = username || 'Someone'

  if (!visible) {
    return null
  }

  return (
    <div
      className={styles.typingContainer}
      role="status"
      aria-live="polite"
      data-testid={testID || 'typing-indicator'}
    >
      <div className={styles.typingBubbleWrapper}>
        <div
          className={styles.typingDotsContainer}
          aria-hidden="true"
        >
          <span className={`${styles.typingDot} ${styles.typingDotDelay1}`} />
          <span className={`${styles.typingDot} ${styles.typingDotDelay2}`} />
          <span className={`${styles.typingDot} ${styles.typingDotDelay3}`} />
        </div>
        <span className={styles.typingText}>{displayName} is typing...</span>
      </div>
    </div>
  )
}

/**
 * Memoized TypingIndicator for performance optimization
 * Only re-renders when props change
 */
export const TypingIndicator = memo(TypingIndicatorComponent)

// Also export as default for convenience
export default TypingIndicator
