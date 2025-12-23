/**
 * Chat Components Index
 * Central export file for all chat-related components
 *
 * This module provides:
 * - UI Components: MessageBubble, MessageList, ChatInput, ChatHeader, etc.
 * - Modal Components: BlockUserModal, ReportUserModal, ChatActionsMenu
 * - Custom Hooks: useChatMessages, useSendMessage, useTypingIndicator, etc.
 * - Utilities: formatMessageTime, formatLastSeen, etc.
 */

// ============================================================================
// UI Components
// ============================================================================

export { MessageBubble } from './MessageBubble'
export { MessageList } from './MessageList'
export { TypingIndicator } from './TypingIndicator'
export { ChatInput } from './ChatInput'
export { ChatInputToolbar } from './ChatInputToolbar'
export { ChatHeader } from './ChatHeader'
export { UserPresenceIndicator } from './UserPresenceIndicator'

// ============================================================================
// Modal Components
// ============================================================================

export { BlockUserModal } from './BlockUserModal'
export { ReportUserModal } from './ReportUserModal'
export { ChatActionsMenu } from './ChatActionsMenu'

// ============================================================================
// Custom Hooks
// ============================================================================

export { useChatMessages } from './hooks/useChatMessages'
export type { UseChatMessagesOptions } from './hooks/useChatMessages'

export { useSendMessage } from './hooks/useSendMessage'
export type { UseSendMessageOptions } from './hooks/useSendMessage'

export { useTypingIndicator } from './hooks/useTypingIndicator'
export type { UseTypingIndicatorOptions } from './hooks/useTypingIndicator'

export { useBlockUser } from './hooks/useBlockUser'
export type { UseBlockUserOptions } from './hooks/useBlockUser'

export { useReportUser } from './hooks/useReportUser'
export type { UseReportUserOptions } from './hooks/useReportUser'

// Hooks to be implemented in subsequent phases:
// export { useUserPresence } from './hooks/useUserPresence'

// ============================================================================
// Utilities
// ============================================================================

export {
  formatMessageTime,
  formatLastSeen,
  shouldShowDateSeparator,
  getDateSeparatorText,
  generateOptimisticId,
} from './utils/formatters'

// ============================================================================
// Types Re-exports
// ============================================================================

export type {
  // Component Props
  ChatScreenProps,
  ChatHeaderProps,
  UserPresenceIndicatorProps,
  MessageBubbleProps,
  MessageListProps,
  TypingIndicatorProps,
  ChatInputProps,
  ChatInputToolbarProps,
  ChatActionsMenuProps,
  BlockUserModalProps,
  ReportUserModalProps,
  // Data Types
  MessageWithSender,
  TypingState,
  OptimisticMessage,
  OptimisticMessageDisplay,
  OptimisticMessageStatus,
  ReportReasonOption,
  ChatAttachment,
  // Hook Return Types
  UseChatMessagesReturn,
  UseSendMessageReturn,
  UseTypingIndicatorReturn,
  UseUserPresenceReturn,
  UseBlockUserReturn,
  UseReportUserReturn,
} from '../../types/chat'

// Re-export constants
export { CHAT_CONSTANTS, REPORT_REASONS } from '../../types/chat'
