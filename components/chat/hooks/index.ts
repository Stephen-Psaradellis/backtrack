/**
 * Chat Custom Hooks Index
 *
 * Central export file for all chat-related custom hooks.
 * These hooks extract and encapsulate the business logic from ChatScreen,
 * enabling better separation of concerns and independent testing.
 *
 * ## Hook Overview
 *
 * | Hook | Purpose | Supabase Table |
 * |------|---------|----------------|
 * | useChatMessages | Message fetching & real-time | messages |
 * | useSendMessage | Optimistic message sending | messages |
 * | useTypingIndicator | Typing events broadcast | (realtime channel) |
 * | useBlockUser | Block user functionality | blocked_users |
 * | useReportUser | Report user functionality | user_reports |
 *
 * ## Usage Pattern
 *
 * All hooks follow a consistent pattern:
 * - Accept an options object with configuration
 * - Return a typed object with state and functions
 * - Handle their own cleanup on unmount
 *
 * @example
 * ```tsx
 * import {
 *   useChatMessages,
 *   useSendMessage,
 *   useTypingIndicator,
 *   useBlockUser,
 *   useReportUser,
 * } from '../components/chat/hooks'
 *
 * function ChatScreen({ conversationId, currentUserId }) {
 *   const { messages, loadMore } = useChatMessages({ conversationId, currentUserId })
 *   const { sendMessage } = useSendMessage({ conversationId, currentUserId })
 *   const { isOtherUserTyping, broadcastTyping } = useTypingIndicator({ conversationId, currentUserId })
 *   // ...
 * }
 * ```
 *
 * @module components/chat/hooks
 */

// ============================================================================
// Custom Hooks
// ============================================================================

/**
 * Hook for fetching, paginating, and subscribing to chat messages.
 * Handles real-time message updates via Supabase postgres_changes.
 *
 * @see useChatMessages for implementation details
 * @see UseChatMessagesOptions for configuration options
 * @see UseChatMessagesReturn for return type
 */
export { useChatMessages } from './useChatMessages'
export type { UseChatMessagesOptions } from './useChatMessages'

/**
 * Hook for sending messages with optimistic updates.
 * Provides retry and delete functionality for failed messages.
 *
 * @see useSendMessage for implementation details
 * @see UseSendMessageOptions for configuration options
 * @see UseSendMessageReturn for return type
 */
export { useSendMessage } from './useSendMessage'
export type { UseSendMessageOptions } from './useSendMessage'

/**
 * Hook for managing typing indicator state.
 * Handles both broadcasting own typing and receiving others' typing events.
 *
 * @see useTypingIndicator for implementation details
 * @see UseTypingIndicatorOptions for configuration options
 * @see UseTypingIndicatorReturn for return type
 */
export { useTypingIndicator } from './useTypingIndicator'
export type { UseTypingIndicatorOptions } from './useTypingIndicator'

/**
 * Hook for blocking users in chat conversations.
 * Inserts into blocked_users table and updates conversation status.
 *
 * @see useBlockUser for implementation details
 * @see UseBlockUserOptions for configuration options
 * @see UseBlockUserReturn for return type
 */
export { useBlockUser } from './useBlockUser'
export type { UseBlockUserOptions } from './useBlockUser'

/**
 * Hook for reporting users in chat conversations.
 * Inserts into user_reports table with reason and optional details.
 *
 * @see useReportUser for implementation details
 * @see UseReportUserOptions for configuration options
 * @see UseReportUserReturn for return type
 */
export { useReportUser } from './useReportUser'
export type { UseReportUserOptions } from './useReportUser'

// ============================================================================
// Re-exported Types
// ============================================================================

/**
 * Re-export hook return types for convenience.
 * These types define the shape of objects returned by each hook.
 */
export type {
  UseChatMessagesReturn,
  UseSendMessageReturn,
  UseTypingIndicatorReturn,
  UseUserPresenceReturn,
  UseBlockUserReturn,
  UseReportUserReturn,
} from '../../../types/chat'
