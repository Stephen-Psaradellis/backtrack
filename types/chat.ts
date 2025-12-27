/**
 * Chat Component Type Definitions
 * Shared TypeScript interfaces for chat-related components and hooks
 */

import type { Message, Profile, ReportReason, UUID } from './database'

// ============================================================================
// Component Props
// ============================================================================

/**
 * Props for the main ChatScreen component
 */
export interface ChatScreenProps {
  conversationId: UUID
  currentUserId: UUID
  onBack: () => void
  onUserBlocked: (userId: UUID) => void
}

/**
 * Props for the ChatHeader component
 */
export interface ChatHeaderProps {
  /** The other user's display name */
  username?: string
  /** Single character for avatar fallback (usually first letter of username) */
  avatarLetter?: string
  /** Whether the other user is currently online */
  isOnline: boolean
  /** ISO timestamp of when the user was last seen */
  lastSeen: string | null
  /** Whether the other user is verified */
  isVerified?: boolean
  /** Callback when back button is pressed */
  onBack: () => void
  /** Callback when actions menu button is pressed */
  onActionsClick: () => void
}

/**
 * Props for the UserPresenceIndicator component
 */
export interface UserPresenceIndicatorProps {
  isOnline: boolean
  lastSeen: string | null
}

/**
 * Props for the MessageBubble component
 */
export interface MessageBubbleProps {
  message: MessageWithSender | OptimisticMessageDisplay
  isOwn: boolean
  onRetry?: (messageId: string) => void
  onDelete?: (messageId: string) => void
}

/**
 * Props for the MessageList component
 */
export interface MessageListProps {
  messages: Array<MessageWithSender | OptimisticMessageDisplay>
  currentUserId: UUID
  isLoadingMore: boolean
  hasMoreMessages: boolean
  isOtherUserTyping: boolean
  otherUserName?: string
  onLoadMore: () => void
  onRetryMessage: (messageId: string) => void
  onDeleteMessage: (messageId: string) => void
}

/**
 * Props for the TypingIndicator component
 */
export interface TypingIndicatorProps {
  isTyping: boolean
  username?: string
}

/**
 * Props for the ChatInput component
 */
export interface ChatInputProps {
  value: string
  onChange: (value: string) => void
  onSend: () => void
  onTyping?: () => void
  disabled?: boolean
  maxLength?: number
  placeholder?: string
}

/**
 * Props for the ChatActionsMenu component
 */
export interface ChatActionsMenuProps {
  isOpen: boolean
  onClose: () => void
  onBlockUser: () => void
  onReportUser: () => void
}

/**
 * Props for the BlockUserModal component
 */
export interface BlockUserModalProps {
  isOpen: boolean
  username: string
  isLoading: boolean
  error: string | null
  onConfirm: () => void
  onCancel: () => void
}

/**
 * Props for the ReportUserModal component
 */
export interface ReportUserModalProps {
  isOpen: boolean
  username: string
  isLoading: boolean
  error: string | null
  selectedReason: ReportReason | null
  details: string
  onReasonChange: (reason: ReportReason) => void
  onDetailsChange: (details: string) => void
  onSubmit: () => void
  onCancel: () => void
}

/**
 * Attachment file type for chat input
 */
export interface ChatAttachment {
  id: string
  file: File
  previewUrl?: string
  type: 'image' | 'document' | 'video' | 'audio' | 'other'
  status: 'pending' | 'uploading' | 'uploaded' | 'failed'
  progress?: number
  error?: string
}

/**
 * Props for the ChatInputToolbar component
 */
export interface ChatInputToolbarProps {
  /** Callback when attachment button is clicked */
  onAttachmentClick: () => void
  /** Callback when emoji picker trigger is clicked */
  onEmojiClick: () => void
  /** Callback when a file is selected for attachment */
  onFileSelect?: (files: FileList) => void
  /** Whether the toolbar is disabled */
  disabled?: boolean
  /** Whether the emoji picker is currently open */
  isEmojiPickerOpen?: boolean
  /** Currently attached files (for showing attachment count) */
  attachments?: ChatAttachment[]
  /** Callback to remove an attachment */
  onRemoveAttachment?: (attachmentId: string) => void
  /** Accepted file types for attachments (MIME types or extensions) */
  acceptedFileTypes?: string
  /** Maximum file size in bytes */
  maxFileSize?: number
  /** Maximum number of attachments allowed */
  maxAttachments?: number
}

// ============================================================================
// Data Types
// ============================================================================

/**
 * Message with sender profile information joined
 */
export interface MessageWithSender extends Message {
  sender: Profile
}

/**
 * Typing state for real-time typing indicators
 */
export interface TypingState {
  userId: UUID
  isTyping: boolean
  timestamp: number
}

/**
 * Status of an optimistic message
 */
export type OptimisticMessageStatus = 'sending' | 'sent' | 'failed'

/**
 * Optimistic message representation during send
 */
export interface OptimisticMessage {
  id: string
  content: string
  sender_id: UUID
  created_at: string
  status: OptimisticMessageStatus
}

/**
 * Optimistic message for display in message list
 * Extends base message structure with optimistic flags
 */
export interface OptimisticMessageDisplay extends MessageWithSender {
  _optimistic: true
  _status: OptimisticMessageStatus
}

/**
 * Report reason option for display
 */
export interface ReportReasonOption {
  value: ReportReason
  label: string
}

// ============================================================================
// Hook Return Types
// ============================================================================

/**
 * Return type for useChatMessages hook
 */
export interface UseChatMessagesReturn {
  messages: MessageWithSender[]
  isLoading: boolean
  isLoadingMore: boolean
  hasMoreMessages: boolean
  error: string | null
  loadMore: () => Promise<void>
  markAsRead: () => Promise<void>
  addMessage: (message: MessageWithSender) => void
}

/**
 * Return type for useSendMessage hook
 */
export interface UseSendMessageReturn {
  isSending: boolean
  optimisticMessages: OptimisticMessage[]
  sendMessage: (content: string) => Promise<void>
  retryMessage: (messageId: string) => Promise<void>
  deleteFailedMessage: (messageId: string) => void
}

/**
 * Return type for useTypingIndicator hook
 */
export interface UseTypingIndicatorReturn {
  isOtherUserTyping: boolean
  broadcastTyping: () => void
}

/**
 * Return type for useUserPresence hook
 */
export interface UseUserPresenceReturn {
  isOnline: boolean
  lastSeen: string | null
}

/**
 * Return type for useBlockUser hook
 */
export interface UseBlockUserReturn {
  /** Whether a block operation is in progress */
  isBlocking: boolean
  /** Error message if the block operation failed */
  error: string | null
  /** Function to block the target user */
  blockUser: () => Promise<void>
  /** Function to clear any existing error */
  clearError: () => void
}

/**
 * Return type for useReportUser hook
 */
export interface UseReportUserReturn {
  /** Whether a report operation is in progress */
  isReporting: boolean
  /** Error message if the report operation failed */
  error: string | null
  /** Function to report the target user with a reason and optional details */
  reportUser: (reason: ReportReason, details?: string) => Promise<void>
  /** Function to clear any existing error */
  clearError: () => void
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Chat configuration constants
 */
export const CHAT_CONSTANTS = {
  /** Number of messages to load per page */
  MESSAGES_PER_PAGE: 50,
  /** Debounce time for typing broadcasts in ms */
  TYPING_DEBOUNCE_MS: 500,
  /** Timeout for typing indicator in ms */
  TYPING_TIMEOUT_MS: 3000,
  /** Maximum message character length */
  MESSAGE_MAX_LENGTH: 2000,
  /** Scroll threshold for pagination trigger in px */
  SCROLL_THRESHOLD: 100,
} as const

/**
 * Report reasons for user reporting
 */
export const REPORT_REASONS: readonly ReportReasonOption[] = [
  { value: 'spam', label: 'Spam or advertising' },
  { value: 'harassment', label: 'Harassment or bullying' },
  { value: 'inappropriate_content', label: 'Inappropriate content' },
  { value: 'fake_profile', label: 'Fake profile or impersonation' },
  { value: 'other', label: 'Other' },
] as const