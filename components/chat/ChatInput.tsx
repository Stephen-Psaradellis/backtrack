'use client'

/**
 * ChatInput Component
 *
 * A message input field with send button for chat conversations.
 * Features:
 * - Multi-line text input with auto-resize
 * - Send button that enables when message is valid
 * - Keyboard event handling (Enter to send, Shift+Enter for newline)
 * - Character count display when approaching limit
 * - Typing indicator callback support
 * - Accessibility labels and keyboard navigation
 */

import React, {
  memo,
  useCallback,
  useRef,
  useEffect,
  KeyboardEvent,
  ChangeEvent,
  useMemo,
} from 'react'
import type { ChatInputProps } from '../../types/chat'
import { CHAT_CONSTANTS } from '../../types/chat'
import styles from './styles/ChatScreen.module.css'

/**
 * Default values for optional props
 */
const DEFAULT_MAX_LENGTH = CHAT_CONSTANTS.MESSAGE_MAX_LENGTH
const DEFAULT_PLACEHOLDER = 'Type a message...'
const CHARACTER_WARNING_THRESHOLD = 0.9

/**
 * ChatInput provides a message composition area with send functionality
 *
 * @param value - The current input value (controlled)
 * @param onChange - Callback when input value changes
 * @param onSend - Callback when message should be sent
 * @param onTyping - Optional callback to broadcast typing status
 * @param disabled - Whether the input is disabled
 * @param maxLength - Maximum character count (default: 2000)
 * @param placeholder - Input placeholder text
 */
function ChatInputComponent({
  value,
  onChange,
  onSend,
  onTyping,
  disabled = false,
  maxLength = DEFAULT_MAX_LENGTH,
  placeholder = DEFAULT_PLACEHOLDER,
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // ---------------------------------------------------------------------------
  // Computed Values
  // ---------------------------------------------------------------------------

  const characterCount = value.length
  const isOverLimit = characterCount > maxLength
  const showCharacterWarning = characterCount > maxLength * CHARACTER_WARNING_THRESHOLD
  const canSend = value.trim().length > 0 && !isOverLimit && !disabled

  const characterCountClass = useMemo(() => {
    if (isOverLimit) return `${styles.characterCount} ${styles.characterCountError}`
    if (characterCount > maxLength * 0.95) return `${styles.characterCount} ${styles.characterCountWarning}`
    return styles.characterCount
  }, [characterCount, maxLength, isOverLimit])

  // ---------------------------------------------------------------------------
  // Auto-resize Effect
  // ---------------------------------------------------------------------------

  useEffect(() => {
    const textarea = textareaRef.current
    if (!textarea) return

    // Reset height to auto to get the correct scrollHeight
    textarea.style.height = 'auto'
    // Set height to scrollHeight, capped at 150px
    const newHeight = Math.min(textarea.scrollHeight, 150)
    textarea.style.height = `${newHeight}px`
  }, [value])

  // ---------------------------------------------------------------------------
  // Focus on mount when not disabled
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (!disabled) {
      // Small delay to ensure component is mounted
      const timer = setTimeout(() => {
        textareaRef.current?.focus()
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [disabled])

  // ---------------------------------------------------------------------------
  // Event Handlers
  // ---------------------------------------------------------------------------

  const handleInputChange = useCallback(
    (e: ChangeEvent<HTMLTextAreaElement>) => {
      const newValue = e.target.value
      onChange(newValue)

      // Broadcast typing status
      if (onTyping && newValue.length > 0) {
        onTyping()
      }
    },
    [onChange, onTyping]
  )

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      // Send on Enter (without Shift for newline)
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        if (canSend) {
          onSend()
          // Reset textarea height after sending
          if (textareaRef.current) {
            textareaRef.current.style.height = 'auto'
          }
        }
      }
    },
    [canSend, onSend]
  )

  const handleSendClick = useCallback(() => {
    if (canSend) {
      onSend()
      // Reset textarea height after sending
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto'
      }
      // Refocus the textarea
      textareaRef.current?.focus()
    }
  }, [canSend, onSend])

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  const textInputClass = `${styles.textInput} ${disabled ? styles.textInputDisabled : ''}`
  const sendButtonClass = `${styles.sendButton} ${!canSend ? styles.sendButtonDisabled : ''}`

  return (
    <div className={styles.inputContainer}>
      <div className={styles.inputWrapper}>
        <textarea
          ref={textareaRef}
          className={textInputClass}
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          rows={1}
          maxLength={maxLength + 100} // Allow slight overflow for UX, but show warning
          disabled={disabled}
          aria-label="Message input"
          aria-describedby={showCharacterWarning ? 'character-count' : undefined}
          aria-invalid={isOverLimit}
        />

        {/* Character count warning */}
        {showCharacterWarning && (
          <span
            id="character-count"
            className={characterCountClass}
            role="status"
            aria-live="polite"
          >
            {characterCount}/{maxLength}
          </span>
        )}
      </div>

      <button
        className={sendButtonClass}
        onClick={handleSendClick}
        disabled={!canSend}
        aria-label="Send message"
        type="button"
      >
        <SendIcon />
      </button>
    </div>
  )
}

/**
 * Send icon SVG component
 */
function SendIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
    </svg>
  )
}

/**
 * Memoized ChatInput for performance optimization
 * Only re-renders when props change
 */
export const ChatInput = memo(ChatInputComponent)
