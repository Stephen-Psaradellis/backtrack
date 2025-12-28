/**
 * MessageBubble Component Tests
 *
 * Tests for the MessageBubble component including:
 * - Rendering with various message types
 * - Sent vs received message styling
 * - Timestamp display
 * - Read receipt indicators
 * - Optimistic message states (sending, failed)
 * - Failed message actions (retry, delete)
 * - Accessibility requirements
 */

import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MessageBubble } from '../MessageBubble'
import type { MessageWithSender, OptimisticMessageDisplay } from '../../../types/chat'
import type { UUID } from '../../../types/database'

// Mock CSS module
vi.mock('../styles/ChatScreen.module.css', () => ({
  messageRow: 'messageRow',
  messageRowSent: 'messageRowSent',
  messageRowReceived: 'messageRowReceived',
  messageBubble: 'messageBubble',
  messageBubbleSent: 'messageBubbleSent',
  messageBubbleReceived: 'messageBubbleReceived',
  messageBubbleFailed: 'messageBubbleFailed',
  messageAvatar: 'messageAvatar',
  messageContent: 'messageContent',
  messageFooter: 'messageFooter',
  messageTime: 'messageTime',
  messageStatus: 'messageStatus',
  sendingIcon: 'sendingIcon',
  failedIcon: 'failedIcon',
  readIcon: 'readIcon',
  sentIcon: 'sentIcon',
  failedActions: 'failedActions',
  retryMessageButton: 'retryMessageButton',
  deleteMessageButton: 'deleteMessageButton',
}))

// Mock formatMessageTime
vi.mock('../utils/formatters', () => ({
  formatMessageTime: vi.fn(() => '10:30 AM'),
}))

// Test data
const mockSender = {
  id: 'sender-123' as UUID,
  username: 'TestUser',
  display_name: 'Test User',
  own_avatar: {},
  avatar_config: null,
  rpm_avatar: null,
  rpm_avatar_id: null,
  is_verified: false,
  verified_at: null,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
}

const createMockMessage = (overrides = {}): MessageWithSender => ({
  id: 'msg-123' as UUID,
  conversation_id: 'conv-123' as UUID,
  sender_id: 'sender-123' as UUID,
  content: 'Hello, this is a test message!',
  is_read: false,
  created_at: '2024-01-15T10:30:00Z',
  sender: mockSender,
  ...overrides,
})

const createOptimisticMessage = (
  status: 'sending' | 'sent' | 'failed'
): OptimisticMessageDisplay => ({
  ...createMockMessage(),
  _optimistic: true,
  _status: status,
})

describe('MessageBubble', () => {
  describe('Basic Rendering', () => {
    it('should render message content', () => {
      const message = createMockMessage()
      render(<MessageBubble message={message} isOwn={false} />)

      expect(screen.getByText('Hello, this is a test message!')).toBeInTheDocument()
    })

    it('should render timestamp', () => {
      const message = createMockMessage()
      render(<MessageBubble message={message} isOwn={false} />)

      expect(screen.getByText('10:30 AM')).toBeInTheDocument()
    })

    it('should render with role="article"', () => {
      const message = createMockMessage()
      render(<MessageBubble message={message} isOwn={false} />)

      expect(screen.getByRole('article')).toBeInTheDocument()
    })
  })

  describe('Sent vs Received Styling', () => {
    it('should show avatar for received messages', () => {
      const message = createMockMessage()
      const { container } = render(<MessageBubble message={message} isOwn={false} />)

      const avatar = container.querySelector('.messageAvatar')
      expect(avatar).toBeInTheDocument()
      expect(avatar).toHaveTextContent('T') // First letter of TestUser
    })

    it('should not show avatar for sent messages', () => {
      const message = createMockMessage()
      const { container } = render(<MessageBubble message={message} isOwn={true} />)

      const avatar = container.querySelector('.messageAvatar')
      expect(avatar).not.toBeInTheDocument()
    })

    it('should apply sent styling class for own messages', () => {
      const message = createMockMessage()
      const { container } = render(<MessageBubble message={message} isOwn={true} />)

      expect(container.querySelector('.messageRowSent')).toBeInTheDocument()
      expect(container.querySelector('.messageBubbleSent')).toBeInTheDocument()
    })

    it('should apply received styling class for other messages', () => {
      const message = createMockMessage()
      const { container } = render(<MessageBubble message={message} isOwn={false} />)

      expect(container.querySelector('.messageRowReceived')).toBeInTheDocument()
      expect(container.querySelector('.messageBubbleReceived')).toBeInTheDocument()
    })
  })

  describe('Read Receipt Indicators', () => {
    it('should show single check for unread sent messages', () => {
      const message = createMockMessage({ is_read: false })
      const { container } = render(<MessageBubble message={message} isOwn={true} />)

      expect(container.querySelector('.sentIcon')).toBeInTheDocument()
    })

    it('should show double check for read sent messages', () => {
      const message = createMockMessage({ is_read: true })
      const { container } = render(<MessageBubble message={message} isOwn={true} />)

      expect(container.querySelector('.readIcon')).toBeInTheDocument()
    })

    it('should not show read receipts for received messages', () => {
      const message = createMockMessage({ is_read: true })
      const { container } = render(<MessageBubble message={message} isOwn={false} />)

      expect(container.querySelector('.sentIcon')).not.toBeInTheDocument()
      expect(container.querySelector('.readIcon')).not.toBeInTheDocument()
    })
  })

  describe('Optimistic Message States', () => {
    it('should show sending indicator for sending messages', () => {
      const message = createOptimisticMessage('sending')
      const { container } = render(<MessageBubble message={message} isOwn={true} />)

      expect(container.querySelector('.sendingIcon')).toBeInTheDocument()
      expect(container.querySelector('.sendingIcon')).toHaveTextContent('...')
    })

    it('should show failed indicator for failed messages', () => {
      const message = createOptimisticMessage('failed')
      const { container } = render(<MessageBubble message={message} isOwn={true} />)

      expect(container.querySelector('.failedIcon')).toBeInTheDocument()
      expect(container.querySelector('.failedIcon')).toHaveTextContent('!')
    })

    it('should apply failed styling for failed messages', () => {
      const message = createOptimisticMessage('failed')
      const { container } = render(<MessageBubble message={message} isOwn={true} />)

      expect(container.querySelector('.messageBubbleFailed')).toBeInTheDocument()
    })
  })

  describe('Failed Message Actions', () => {
    it('should show retry and delete buttons for failed messages', () => {
      const message = createOptimisticMessage('failed')
      render(<MessageBubble message={message} isOwn={true} onRetry={vi.fn()} onDelete={vi.fn()} />)

      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument()
    })

    it('should not show actions for non-failed messages', () => {
      const message = createOptimisticMessage('sending')
      render(<MessageBubble message={message} isOwn={true} onRetry={vi.fn()} onDelete={vi.fn()} />)

      expect(screen.queryByRole('button', { name: /retry/i })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument()
    })

    it('should call onRetry when retry button is clicked', () => {
      const onRetry = vi.fn()
      const message = createOptimisticMessage('failed')
      render(<MessageBubble message={message} isOwn={true} onRetry={onRetry} onDelete={vi.fn()} />)

      fireEvent.click(screen.getByRole('button', { name: /retry/i }))

      expect(onRetry).toHaveBeenCalledWith(message.id)
    })

    it('should call onDelete when delete button is clicked', () => {
      const onDelete = vi.fn()
      const message = createOptimisticMessage('failed')
      render(<MessageBubble message={message} isOwn={true} onRetry={vi.fn()} onDelete={onDelete} />)

      fireEvent.click(screen.getByRole('button', { name: /delete/i }))

      expect(onDelete).toHaveBeenCalledWith(message.id)
    })
  })

  describe('Accessibility', () => {
    it('should have proper aria-label for own messages', () => {
      const message = createMockMessage()
      render(<MessageBubble message={message} isOwn={true} />)

      expect(screen.getByRole('article')).toHaveAttribute(
        'aria-label',
        'Message from you'
      )
    })

    it('should have proper aria-label for received messages', () => {
      const message = createMockMessage()
      render(<MessageBubble message={message} isOwn={false} />)

      expect(screen.getByRole('article')).toHaveAttribute(
        'aria-label',
        'Message from TestUser'
      )
    })

    it('should have accessible retry button label', () => {
      const message = createOptimisticMessage('failed')
      render(<MessageBubble message={message} isOwn={true} onRetry={vi.fn()} onDelete={vi.fn()} />)

      expect(screen.getByRole('button', { name: 'Retry sending message' })).toBeInTheDocument()
    })

    it('should have accessible delete button label', () => {
      const message = createOptimisticMessage('failed')
      render(<MessageBubble message={message} isOwn={true} onRetry={vi.fn()} onDelete={vi.fn()} />)

      expect(screen.getByRole('button', { name: 'Delete failed message' })).toBeInTheDocument()
    })

    it('should have aria-hidden avatar for received messages', () => {
      const message = createMockMessage()
      const { container } = render(<MessageBubble message={message} isOwn={false} />)

      const avatar = container.querySelector('.messageAvatar')
      expect(avatar).toHaveAttribute('aria-hidden', 'true')
    })
  })

  describe('Edge Cases', () => {
    it('should handle message with no sender username', () => {
      const message = createMockMessage({
        sender: { ...mockSender, username: null },
      })
      const { container } = render(<MessageBubble message={message} isOwn={false} />)

      const avatar = container.querySelector('.messageAvatar')
      expect(avatar).toHaveTextContent('?')
    })

    it('should handle long message content', () => {
      const longContent = 'A'.repeat(2000)
      const message = createMockMessage({ content: longContent })
      render(<MessageBubble message={message} isOwn={false} />)

      expect(screen.getByText(longContent)).toBeInTheDocument()
    })

    it('should handle message with unknown sender for aria-label', () => {
      const message = createMockMessage({
        sender: { ...mockSender, username: null },
      })
      render(<MessageBubble message={message} isOwn={false} />)

      expect(screen.getByRole('article')).toHaveAttribute(
        'aria-label',
        'Message from unknown'
      )
    })
  })
})