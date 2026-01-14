/**
 * ChatBubble Component
 *
 * Displays a chat message in a bubble style for anonymous conversations.
 * Used in the ChatScreen to show messages between producer and consumer.
 *
 * @example
 * ```tsx
 * import { ChatBubble } from 'components/ChatBubble'
 *
 * // Basic usage
 * <ChatBubble
 *   message={message}
 *   isOwn={message.sender_id === userId}
 * />
 *
 * // With timestamp and read status
 * <ChatBubble
 *   message={message}
 *   isOwn={true}
 *   showTimestamp={true}
 *   showReadStatus={true}
 * />
 *
 * // Different position in conversation
 * <ChatBubble
 *   message={message}
 *   isOwn={false}
 *   position="first"
 * />
 * ```
 */

import React, { memo, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ViewStyle,
  Pressable,
} from 'react-native'
import type { Message, MessageWithSender } from '../types/database'

// ============================================================================
// TYPES
// ============================================================================

/**
 * Position of the bubble in a group of consecutive messages from same sender
 */
export type BubblePosition = 'single' | 'first' | 'middle' | 'last'

/**
 * Props for the ChatBubble component
 */
export interface ChatBubbleProps {
  /**
   * Message data to display
   */
  message: Message | MessageWithSender

  /**
   * Whether this message was sent by the current user
   * Determines bubble alignment and color
   */
  isOwn: boolean

  /**
   * Position of the bubble in a group of consecutive messages
   * Affects border radius styling
   * @default 'single'
   */
  position?: BubblePosition

  /**
   * Whether to show the timestamp below the bubble
   * @default false
   */
  showTimestamp?: boolean

  /**
   * Whether to show read status (checkmarks) for own messages
   * @default false
   */
  showReadStatus?: boolean

  /**
   * Callback when the bubble is long pressed
   * Useful for showing message options (copy, report, etc.)
   */
  onLongPress?: (message: Message | MessageWithSender) => void

  /**
   * Additional container style
   */
  style?: ViewStyle

  /**
   * Test ID for testing purposes
   */
  testID?: string
}

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Colors used in the ChatBubble component
 */
const COLORS = {
  /** Primary color for own messages (coral) */
  ownBubble: '#FF6B47',
  /** Text color for own messages */
  ownText: '#FFFFFF',
  /** Background color for received messages */
  otherBubble: '#E5E5EA',
  /** Text color for received messages */
  otherText: '#000000',
  /** Timestamp text color */
  timestamp: '#8E8E93',
  /** Read status color */
  readStatus: '#34C759',
  /** Unread status color */
  unreadStatus: '#8E8E93',
  /** Pressed state overlay */
  pressedOverlay: 'rgba(0, 0, 0, 0.1)',
} as const

/**
 * Border radius values for bubble corners
 */
const BORDER_RADIUS = {
  /** Large radius for outer corners */
  large: 18,
  /** Small radius for inner corners (grouped messages) */
  small: 4,
} as const

/**
 * Maximum width of the bubble as a percentage of container width
 */
const MAX_BUBBLE_WIDTH_PERCENT = 0.75

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Format a timestamp into a time string for chat display
 *
 * @param timestamp - ISO 8601 timestamp string
 * @returns Formatted time string (e.g., "2:30 PM")
 */
export function formatMessageTime(timestamp: string): string {
  const date = new Date(timestamp)

  if (isNaN(date.getTime())) {
    return ''
  }

  return date.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

/**
 * Format a timestamp for message grouping (date separator)
 *
 * @param timestamp - ISO 8601 timestamp string
 * @returns Formatted date string (e.g., "Today", "Yesterday", "Dec 15")
 */
export function formatMessageDate(timestamp: string): string {
  const date = new Date(timestamp)
  const now = new Date()

  if (isNaN(date.getTime())) {
    return ''
  }

  const isToday = date.toDateString() === now.toDateString()
  if (isToday) {
    return 'Today'
  }

  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  const isYesterday = date.toDateString() === yesterday.toDateString()
  if (isYesterday) {
    return 'Yesterday'
  }

  const isThisYear = date.getFullYear() === now.getFullYear()
  if (isThisYear) {
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    })
  }

  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

/**
 * Determine the position of a message in a group
 *
 * @param messages - Array of messages
 * @param index - Index of the current message
 * @param userId - Current user's ID (to determine own vs other)
 * @returns The bubble position
 */
export function getBubblePosition(
  messages: Message[],
  index: number,
  userId: string
): BubblePosition {
  const current = messages[index]
  const prev = index > 0 ? messages[index - 1] : null
  const next = index < messages.length - 1 ? messages[index + 1] : null

  const isOwnCurrent = current.sender_id === userId
  const isOwnPrev = prev ? prev.sender_id === userId : null
  const isOwnNext = next ? next.sender_id === userId : null

  const sameSenderAsPrev = isOwnPrev === isOwnCurrent
  const sameSenderAsNext = isOwnNext === isOwnCurrent

  // Check if messages are within 1 minute for grouping
  const closeToNext = next
    ? Math.abs(new Date(next.created_at).getTime() - new Date(current.created_at).getTime()) < 60000
    : false
  const closeToPrev = prev
    ? Math.abs(new Date(current.created_at).getTime() - new Date(prev.created_at).getTime()) < 60000
    : false

  const groupedWithPrev = sameSenderAsPrev && closeToPrev
  const groupedWithNext = sameSenderAsNext && closeToNext

  if (groupedWithPrev && groupedWithNext) {
    return 'middle'
  }
  if (groupedWithPrev) {
    return 'last'
  }
  if (groupedWithNext) {
    return 'first'
  }
  return 'single'
}

/**
 * Check if messages should have a date separator between them
 *
 * @param prevTimestamp - Previous message timestamp
 * @param currentTimestamp - Current message timestamp
 * @returns Whether a date separator should be shown
 */
export function shouldShowDateSeparator(
  prevTimestamp: string | null,
  currentTimestamp: string
): boolean {
  if (!prevTimestamp) {
    return true // Show separator for first message
  }

  const prevDate = new Date(prevTimestamp)
  const currentDate = new Date(currentTimestamp)

  return prevDate.toDateString() !== currentDate.toDateString()
}

/**
 * Get border radius style based on position and ownership
 *
 * @param position - Position in message group
 * @param isOwn - Whether message is from current user
 * @returns Border radius style object
 */
function getBorderRadiusStyle(
  position: BubblePosition,
  isOwn: boolean
): ViewStyle {
  const { large, small } = BORDER_RADIUS

  // For own messages: top-left always large, bottom-left always large
  // For other messages: top-right always large, bottom-right always large
  if (isOwn) {
    switch (position) {
      case 'first':
        return {
          borderTopLeftRadius: large,
          borderTopRightRadius: large,
          borderBottomLeftRadius: large,
          borderBottomRightRadius: small,
        }
      case 'middle':
        return {
          borderTopLeftRadius: large,
          borderTopRightRadius: small,
          borderBottomLeftRadius: large,
          borderBottomRightRadius: small,
        }
      case 'last':
        return {
          borderTopLeftRadius: large,
          borderTopRightRadius: small,
          borderBottomLeftRadius: large,
          borderBottomRightRadius: large,
        }
      default: // single
        return {
          borderTopLeftRadius: large,
          borderTopRightRadius: large,
          borderBottomLeftRadius: large,
          borderBottomRightRadius: large,
        }
    }
  } else {
    switch (position) {
      case 'first':
        return {
          borderTopLeftRadius: large,
          borderTopRightRadius: large,
          borderBottomLeftRadius: small,
          borderBottomRightRadius: large,
        }
      case 'middle':
        return {
          borderTopLeftRadius: small,
          borderTopRightRadius: large,
          borderBottomLeftRadius: small,
          borderBottomRightRadius: large,
        }
      case 'last':
        return {
          borderTopLeftRadius: small,
          borderTopRightRadius: large,
          borderBottomLeftRadius: large,
          borderBottomRightRadius: large,
        }
      default: // single
        return {
          borderTopLeftRadius: large,
          borderTopRightRadius: large,
          borderBottomLeftRadius: large,
          borderBottomRightRadius: large,
        }
    }
  }
}

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * ChatBubble displays a chat message in a bubble style.
 *
 * Features:
 * - Differentiates between sent and received messages
 * - Supports message grouping with variable border radius
 * - Shows timestamp and read status
 * - Long press handler for message options
 * - Memoized for performance in FlatList
 */
export const ChatBubble = memo(function ChatBubble({
  message,
  isOwn,
  position = 'single',
  showTimestamp = false,
  showReadStatus = false,
  onLongPress,
  style,
  testID = 'chat-bubble',
}: ChatBubbleProps) {
  // Handle long press
  const handleLongPress = useCallback(() => {
    onLongPress?.(message)
  }, [onLongPress, message])

  // Get border radius based on position
  const borderRadiusStyle = getBorderRadiusStyle(position, isOwn)

  // Format timestamp if needed
  const formattedTime = showTimestamp ? formatMessageTime(message.created_at) : ''

  // Determine read status indicator
  const showRead = showReadStatus && isOwn

  return (
    <View
      style={[
        styles.container,
        isOwn ? styles.containerOwn : styles.containerOther,
        style,
      ]}
      testID={testID}
    >
      <Pressable
        onLongPress={handleLongPress}
        disabled={!onLongPress}
        style={({ pressed }) => [
          styles.bubble,
          isOwn ? styles.bubbleOwn : styles.bubbleOther,
          borderRadiusStyle,
          pressed && onLongPress && styles.bubblePressed,
        ]}
        testID={`${testID}-bubble`}
      >
        <Text
          style={[
            styles.messageText,
            isOwn ? styles.messageTextOwn : styles.messageTextOther,
          ]}
          testID={`${testID}-text`}
        >
          {message.content}
        </Text>
      </Pressable>

      {/* Timestamp and Read Status */}
      {(showTimestamp || showRead) && (
        <View
          style={[
            styles.metaContainer,
            isOwn ? styles.metaContainerOwn : styles.metaContainerOther,
          ]}
          testID={`${testID}-meta`}
        >
          {showTimestamp && (
            <Text style={styles.timestampText} testID={`${testID}-timestamp`}>
              {formattedTime}
            </Text>
          )}
          {showRead && (
            <Text
              style={[
                styles.readStatusText,
                message.is_read ? styles.readStatusRead : styles.readStatusUnread,
              ]}
              testID={`${testID}-read-status`}
            >
              {message.is_read ? '✓✓' : '✓'}
            </Text>
          )}
        </View>
      )}
    </View>
  )
})

// ============================================================================
// PRESET VARIANTS
// ============================================================================

/**
 * ChatBubble with timestamp visible
 */
export const ChatBubbleWithTimestamp = memo(function ChatBubbleWithTimestamp(
  props: Omit<ChatBubbleProps, 'showTimestamp'>
) {
  return (
    <ChatBubble
      {...props}
      showTimestamp={true}
      testID={props.testID ?? 'chat-bubble-with-timestamp'}
    />
  )
})

/**
 * ChatBubble for own messages with read status
 */
export const OwnChatBubble = memo(function OwnChatBubble(
  props: Omit<ChatBubbleProps, 'isOwn' | 'showReadStatus'>
) {
  return (
    <ChatBubble
      {...props}
      isOwn={true}
      showReadStatus={true}
      testID={props.testID ?? 'chat-bubble-own'}
    />
  )
})

/**
 * ChatBubble for received messages
 */
export const ReceivedChatBubble = memo(function ReceivedChatBubble(
  props: Omit<ChatBubbleProps, 'isOwn' | 'showReadStatus'>
) {
  return (
    <ChatBubble
      {...props}
      isOwn={false}
      showReadStatus={false}
      testID={props.testID ?? 'chat-bubble-received'}
    />
  )
})

// ============================================================================
// DATE SEPARATOR COMPONENT
// ============================================================================

/**
 * Props for DateSeparator component
 */
export interface DateSeparatorProps {
  /**
   * The timestamp to display
   */
  timestamp: string

  /**
   * Additional container style
   */
  style?: ViewStyle

  /**
   * Test ID for testing purposes
   */
  testID?: string
}

/**
 * DateSeparator displays a date divider between message groups
 */
export const DateSeparator = memo(function DateSeparator({
  timestamp,
  style,
  testID = 'date-separator',
}: DateSeparatorProps) {
  const formattedDate = formatMessageDate(timestamp)

  return (
    <View style={[styles.dateSeparatorContainer, style]} testID={testID}>
      <View style={styles.dateSeparatorLine} />
      <Text style={styles.dateSeparatorText}>{formattedDate}</Text>
      <View style={styles.dateSeparatorLine} />
    </View>
  )
})

// ============================================================================
// LIST ITEM COMPONENT
// ============================================================================

/**
 * Props for ChatBubbleListItem
 */
export interface ChatBubbleListItemProps extends ChatBubbleProps {
  /**
   * Index in the list
   */
  index?: number

  /**
   * Previous message timestamp for date separator
   */
  prevTimestamp?: string | null

  /**
   * Whether to show date separator
   * @default true
   */
  showDateSeparator?: boolean
}

/**
 * ChatBubble wrapped for use in FlatList with date separator support
 */
export const ChatBubbleListItem = memo(function ChatBubbleListItem({
  index,
  prevTimestamp,
  showDateSeparator = true,
  ...props
}: ChatBubbleListItemProps) {
  const shouldShowSeparator =
    showDateSeparator &&
    shouldShowDateSeparator(prevTimestamp ?? null, props.message.created_at)

  return (
    <View testID={`${props.testID ?? 'chat-bubble-list-item'}-${index ?? 0}`}>
      {shouldShowSeparator && (
        <DateSeparator
          timestamp={props.message.created_at}
          testID={`date-separator-${index ?? 0}`}
        />
      )}
      <ChatBubble {...props} />
    </View>
  )
})

// ============================================================================
// RENDER ITEM HELPER
// ============================================================================

/**
 * Create a renderItem function for FlatList
 *
 * @param userId - Current user's ID to determine own vs received
 * @param onLongPress - Optional callback for long press on messages
 * @param showTimestamps - Whether to show timestamps for last messages in groups
 * @returns A function suitable for FlatList's renderItem prop
 *
 * @example
 * ```tsx
 * const renderItem = createChatBubbleRenderer(
 *   userId,
 *   handleMessageLongPress,
 *   true
 * )
 *
 * <FlatList
 *   data={messages}
 *   renderItem={renderItem}
 *   keyExtractor={(item) => item.id}
 *   inverted
 * />
 * ```
 */
export function createChatBubbleRenderer(
  userId: string,
  onLongPress?: (message: Message | MessageWithSender) => void,
  showTimestamps: boolean = true
) {
  const ChatBubbleRenderer = ({
    item,
    index,
  }: {
    item: Message | MessageWithSender
    index: number
  }) => {
    const isOwn = item.sender_id === userId

    // Note: For inverted FlatList, index 0 is the newest message
    // so we don't need to pass messages array for position calculation
    // Instead, we show timestamp for every message or based on time gaps
    return (
      <ChatBubbleListItem
        message={item}
        isOwn={isOwn}
        position="single" // For simplicity, treat each as single; ChatScreen can optimize
        showTimestamp={showTimestamps}
        showReadStatus={isOwn}
        onLongPress={onLongPress}
        index={index}
        testID={`chat-bubble-${item.id}`}
      />
    )
  }
  ChatBubbleRenderer.displayName = 'ChatBubbleRenderer'
  return ChatBubbleRenderer
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    marginVertical: 1,
    maxWidth: `${MAX_BUBBLE_WIDTH_PERCENT * 100}%`,
  },
  containerOwn: {
    alignSelf: 'flex-end',
    marginLeft: '25%',
  },
  containerOther: {
    alignSelf: 'flex-start',
    marginRight: '25%',
  },
  bubble: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  bubbleOwn: {
    backgroundColor: COLORS.ownBubble,
  },
  bubbleOther: {
    backgroundColor: COLORS.otherBubble,
  },
  bubblePressed: {
    opacity: 0.8,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  messageTextOwn: {
    color: COLORS.ownText,
  },
  messageTextOther: {
    color: COLORS.otherText,
  },
  metaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    paddingHorizontal: 4,
    gap: 4,
  },
  metaContainerOwn: {
    justifyContent: 'flex-end',
  },
  metaContainerOther: {
    justifyContent: 'flex-start',
  },
  timestampText: {
    fontSize: 11,
    color: COLORS.timestamp,
  },
  readStatusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  readStatusRead: {
    color: COLORS.readStatus,
  },
  readStatusUnread: {
    color: COLORS.unreadStatus,
  },
  dateSeparatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
    paddingHorizontal: 16,
  },
  dateSeparatorLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.otherBubble,
  },
  dateSeparatorText: {
    fontSize: 12,
    color: COLORS.timestamp,
    marginHorizontal: 12,
    fontWeight: '500',
  },
})
