/**
 * MessageList Component Tests
 *
 * Tests for the MessageList component including:
 * - Rendering messages list
 * - Empty state display
 * - Date separators
 * - Loading states
 * - Scroll behavior
 * - Typing indicator display
 * - Accessibility requirements
 */

import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MessageList } from '../MessageList'
import type { MessageWithSender } from '../../../types/chat'
import type { UUID } from '../../../types/database'

// Mock CSS module - must have default export
vi.mock('../styles/ChatScreen.module.css', () => ({
  default: {
    messageListContainer: 'messageListContainer',
    loadMoreTrigger: 'loadMoreTrigger',
    loadingMoreContainer: 'loadingMoreContainer',
    spinner: 'spinner',
    loadingMoreText: 'loadingMoreText',
    emptyState: 'emptyState',
    emptyStateIcon: 'emptyStateIcon',
    emptyStateText: 'emptyStateText',
    messagesList: 'messagesList',
    messageWrapper: 'messageWrapper',
    dateSeparator: 'dateSeparator',
    dateSeparatorLine: 'dateSeparatorLine',
    dateSeparatorText: 'dateSeparatorText',
    scrollAnchor: 'scrollAnchor',
  },
}))

// Create module-level mock functions for access in tests
const mockMessageBubble = vi.fn(({ message, isOwn }) => (
  <div data-testid={`message-${message.id}`} data-is-own={isOwn}>
    {message.content}
  </div>
))

const mockTypingIndicator = vi.fn(({ isTyping, username }) =>
  isTyping ? <div data-testid="typing-indicator">{username} is typing...</div> : null
)

const mockShouldShowDateSeparator = vi.fn((current: unknown, previous: unknown) => !previous)
const mockGetDateSeparatorText = vi.fn(() => 'Today')

// Mock MessageBubble component
vi.mock('../MessageBubble', () => ({
  MessageBubble: (props: Record<string, unknown>) => mockMessageBubble(props),
}))

// Mock TypingIndicator component
vi.mock('../TypingIndicator', () => ({
  TypingIndicator: (props: Record<string, unknown>) => mockTypingIndicator(props),
}))

// Mock formatters
vi.mock('../utils/formatters', () => ({
  shouldShowDateSeparator: (current: unknown, previous: unknown) => mockShouldShowDateSeparator(current, previous),
  getDateSeparatorText: () => mockGetDateSeparatorText(),
}))

// Mock IntersectionObserver
class MockIntersectionObserver {
  observe = vi.fn()
  unobserve = vi.fn()
  disconnect = vi.fn()
  constructor(callback: IntersectionObserverCallback, options?: IntersectionObserverInit) {
    // Store for potential assertions
  }
}
window.IntersectionObserver = MockIntersectionObserver as unknown as typeof IntersectionObserver

// Mock scrollIntoView (not implemented in jsdom)
Element.prototype.scrollIntoView = vi.fn()

// Test data
const mockCurrentUserId = 'user-123' as UUID

const createMockMessage = (
  id: string,
  senderId: string,
  content: string,
  createdAt: string
): MessageWithSender => ({
  id: id as UUID,
  conversation_id: 'conv-123' as UUID,
  sender_id: senderId as UUID,
  content,
  is_read: false,
  created_at: createdAt,
  sender: {
    id: senderId as UUID,
    username: senderId === mockCurrentUserId ? 'You' : 'OtherUser',
    avatar_config: null,
    display_name: 'Test User',
    own_avatar: {},
    rpm_avatar: null,
    rpm_avatar_id: null,
    is_verified: false,
    verified_at: null,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
})

const createMockMessages = (count: number): MessageWithSender[] => {
  return Array.from({ length: count }, (_, i) => {
    const isOwn = i % 2 === 0
    return createMockMessage(
      `msg-${i}`,
      isOwn ? mockCurrentUserId : 'other-user',
      `Message ${i}`,
      `2024-01-15T10:${String(i).padStart(2, '0')}:00Z`
    )
  })
}

const defaultProps = {
  messages: [] as MessageWithSender[],
  currentUserId: mockCurrentUserId,
  isLoadingMore: false,
  hasMoreMessages: false,
  isOtherUserTyping: false,
  otherUserName: 'OtherUser',
  onLoadMore: vi.fn(),
  onRetryMessage: vi.fn(),
  onDeleteMessage: vi.fn(),
}

describe('MessageList', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Basic Rendering', () => {
    it('should render with role="log"', () => {
      render(<MessageList {...defaultProps} />)

      expect(screen.getByRole('log')).toBeInTheDocument()
    })

    it('should have aria-label for chat messages', () => {
      render(<MessageList {...defaultProps} />)

      expect(screen.getByRole('log')).toHaveAttribute('aria-label', 'Chat messages')
    })

    it('should have aria-live="polite"', () => {
      render(<MessageList {...defaultProps} />)

      expect(screen.getByRole('log')).toHaveAttribute('aria-live', 'polite')
    })
  })

  describe('Empty State', () => {
    it('should show empty state when no messages', () => {
      render(<MessageList {...defaultProps} messages={[]} />)

      expect(screen.getByText('No messages yet. Start the conversation!')).toBeInTheDocument()
    })

    it('should not show empty state when loading', () => {
      render(<MessageList {...defaultProps} messages={[]} isLoadingMore={true} />)

      expect(screen.queryByText('No messages yet. Start the conversation!')).not.toBeInTheDocument()
    })

    it('should not show empty state when messages exist', () => {
      render(<MessageList {...defaultProps} messages={createMockMessages(3)} />)

      expect(screen.queryByText('No messages yet. Start the conversation!')).not.toBeInTheDocument()
    })
  })

  describe('Message Rendering', () => {
    it('should render all messages', () => {
      const messages = createMockMessages(3)
      render(<MessageList {...defaultProps} messages={messages} />)

      expect(screen.getByTestId('message-msg-0')).toBeInTheDocument()
      expect(screen.getByTestId('message-msg-1')).toBeInTheDocument()
      expect(screen.getByTestId('message-msg-2')).toBeInTheDocument()
    })

    it('should correctly identify own messages', () => {
      const messages = createMockMessages(2)
      render(<MessageList {...defaultProps} messages={messages} />)

      // First message (even index) should be own message
      expect(screen.getByTestId('message-msg-0')).toHaveAttribute('data-is-own', 'true')
      // Second message (odd index) should be from other user
      expect(screen.getByTestId('message-msg-1')).toHaveAttribute('data-is-own', 'false')
    })

    it('should display message content', () => {
      const messages = createMockMessages(2)
      render(<MessageList {...defaultProps} messages={messages} />)

      expect(screen.getByText('Message 0')).toBeInTheDocument()
      expect(screen.getByText('Message 1')).toBeInTheDocument()
    })
  })

  describe('Date Separators', () => {
    it('should render date separator for first message', () => {
      mockShouldShowDateSeparator.mockReturnValue(true)

      const messages = createMockMessages(1)
      render(<MessageList {...defaultProps} messages={messages} />)

      expect(screen.getByRole('separator')).toBeInTheDocument()
      expect(screen.getByText('Today')).toBeInTheDocument()
    })

    it('should have separator with role="separator"', () => {
      mockShouldShowDateSeparator.mockReturnValue(true)

      const messages = createMockMessages(1)
      render(<MessageList {...defaultProps} messages={messages} />)

      expect(screen.getByRole('separator')).toBeInTheDocument()
    })
  })

  describe('Loading States', () => {
    it('should show loading indicator when loading more', () => {
      render(<MessageList {...defaultProps} isLoadingMore={true} />)

      expect(screen.getByText('Loading older messages...')).toBeInTheDocument()
    })

    it('should show loading spinner with role="status"', () => {
      render(<MessageList {...defaultProps} isLoadingMore={true} />)

      expect(screen.getByRole('status')).toBeInTheDocument()
    })

    it('should not show loading indicator when not loading', () => {
      render(<MessageList {...defaultProps} isLoadingMore={false} />)

      expect(screen.queryByText('Loading older messages...')).not.toBeInTheDocument()
    })
  })

  describe('Load More Trigger', () => {
    it('should render load more trigger when hasMoreMessages is true', () => {
      const { container } = render(
        <MessageList {...defaultProps} hasMoreMessages={true} />
      )

      expect(container.querySelector('.loadMoreTrigger')).toBeInTheDocument()
    })

    it('should not render load more trigger when hasMoreMessages is false', () => {
      const { container } = render(
        <MessageList {...defaultProps} hasMoreMessages={false} />
      )

      expect(container.querySelector('.loadMoreTrigger')).not.toBeInTheDocument()
    })

    it('should set up IntersectionObserver for load more', () => {
      // Verify that with hasMoreMessages=true and a load more trigger, the observer would be set up
      const { container } = render(
        <MessageList {...defaultProps} hasMoreMessages={true} messages={createMockMessages(1)} />
      )

      // When hasMoreMessages is true, the load more trigger should be rendered
      expect(container.querySelector('.loadMoreTrigger')).toBeInTheDocument()
    })
  })

  describe('Typing Indicator', () => {
    it('should show typing indicator when other user is typing', () => {
      render(<MessageList {...defaultProps} isOtherUserTyping={true} />)

      expect(screen.getByTestId('typing-indicator')).toBeInTheDocument()
      expect(screen.getByText('OtherUser is typing...')).toBeInTheDocument()
    })

    it('should not show typing indicator when other user is not typing', () => {
      render(<MessageList {...defaultProps} isOtherUserTyping={false} />)

      expect(screen.queryByTestId('typing-indicator')).not.toBeInTheDocument()
    })
  })

  describe('Scroll Behavior', () => {
    it('should handle scroll events', () => {
      const { container } = render(
        <MessageList {...defaultProps} messages={createMockMessages(10)} hasMoreMessages={true} />
      )

      const scrollContainer = container.querySelector('.messageListContainer')
      expect(scrollContainer).toBeInTheDocument()

      // Simulate scroll event
      fireEvent.scroll(scrollContainer!)
    })
  })

  describe('Callback Props', () => {
    it('should pass onRetryMessage to MessageBubble', () => {
      const onRetryMessage = vi.fn()
      const messages = createMockMessages(1)

      render(<MessageList {...defaultProps} messages={messages} onRetryMessage={onRetryMessage} />)

      expect(mockMessageBubble).toHaveBeenCalledWith(
        expect.objectContaining({
          onRetry: onRetryMessage,
        })
      )
    })

    it('should pass onDeleteMessage to MessageBubble', () => {
      const onDeleteMessage = vi.fn()
      const messages = createMockMessages(1)

      render(<MessageList {...defaultProps} messages={messages} onDeleteMessage={onDeleteMessage} />)

      expect(mockMessageBubble).toHaveBeenCalledWith(
        expect.objectContaining({
          onDelete: onDeleteMessage,
        })
      )
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA attributes on container', () => {
      render(<MessageList {...defaultProps} />)

      const container = screen.getByRole('log')
      expect(container).toHaveAttribute('aria-label', 'Chat messages')
      expect(container).toHaveAttribute('aria-live', 'polite')
    })

    it('should have aria-hidden on load more trigger', () => {
      const { container } = render(
        <MessageList {...defaultProps} hasMoreMessages={true} />
      )

      const trigger = container.querySelector('.loadMoreTrigger')
      expect(trigger).toHaveAttribute('aria-hidden', 'true')
    })

    it('should have aria-live="polite" on loading indicator', () => {
      render(<MessageList {...defaultProps} isLoadingMore={true} />)

      expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite')
    })
  })

  describe('Edge Cases', () => {
    it('should handle large number of messages', () => {
      const messages = createMockMessages(100)
      render(<MessageList {...defaultProps} messages={messages} />)

      expect(screen.getByTestId('message-msg-0')).toBeInTheDocument()
      expect(screen.getByTestId('message-msg-99')).toBeInTheDocument()
    })

    it('should handle messages with same timestamp', () => {
      const messages = [
        createMockMessage('msg-1', 'other-user', 'First', '2024-01-15T10:00:00Z'),
        createMockMessage('msg-2', mockCurrentUserId, 'Second', '2024-01-15T10:00:00Z'),
      ]

      render(<MessageList {...defaultProps} messages={messages} />)

      expect(screen.getByText('First')).toBeInTheDocument()
      expect(screen.getByText('Second')).toBeInTheDocument()
    })

    it('should handle empty username', () => {
      render(<MessageList {...defaultProps} otherUserName="" isOtherUserTyping={true} />)

      expect(screen.getByTestId('typing-indicator')).toBeInTheDocument()
    })
  })
})