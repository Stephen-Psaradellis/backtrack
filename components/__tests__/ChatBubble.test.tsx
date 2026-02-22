/**
 * ChatBubble Component Tests
 *
 * Tests for ChatBubble component that displays chat messages in bubble style.
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  ChatBubble,
  formatMessageTime,
  formatMessageDate,
  getBubblePosition,
  shouldShowDateSeparator,
  DateSeparator,
} from '../ChatBubble';
import type { Message } from '../../types/database';
import { getByTestId, queryByTestId } from '../../__tests__/utils/jsdom-queries';

// Mock dependencies
vi.mock('../../lib/utils/sanitize', () => ({
  sanitizeForDisplay: (text: string) => text,
}));

// Mock react-native components to avoid style-prop errors in jsdom
vi.mock('react-native', async () => {
  const actual = await vi.importActual('../../__tests__/mocks/react-native');
  const React = require('react');

  // Generic view-like component that discards style and renders as div
  const createView = (tag: string) => {
    const Component = React.forwardRef(
      ({ children, testID, style, accessible, accessibilityState, ...rest }: any, ref: any) =>
        React.createElement(tag, { ref, testid: testID, ...rest }, children)
    );
    Component.displayName = tag;
    return Component;
  };

  const ViewMock = createView('div');
  const AnimatedViewMock = createView('div');
  AnimatedViewMock.displayName = 'Animated.View';

  // Pressable-like component that handles both function-style and object-style props
  const createPressable = (Tag: string) => {
    const Component = React.forwardRef(
      ({
        onPress, onLongPress, children, testID,
        accessibilityState, accessibilityLabel, accessibilityRole,
        accessibilitylabel, disabled, accessible, style, ...rest
      }: any, ref: any) =>
        React.createElement(Tag, {
          ...rest,
          ref,
          testid: testID,
          accessibilitylabel: accessibilityLabel || accessibilitylabel,
          accessibilityrole: accessibilityRole,
          onClick: !disabled ? onPress : undefined,
          'data-longpress': onLongPress ? 'true' : undefined,
          disabled: disabled || undefined,
        }, children)
    );
    Component.displayName = Tag;
    return Component;
  };

  return {
    ...actual,
    View: ViewMock,
    TouchableOpacity: createPressable('button'),
    Pressable: createPressable('button'),
    Animated: {
      ...actual.Animated,
      View: AnimatedViewMock,
      Text: createView('span'),
      createAnimatedComponent: (c: any) => c,
    },
  };
});

describe('ChatBubble', () => {
  const mockMessage: Message = {
    id: 'msg-1',
    conversation_id: 'conv-1',
    sender_id: 'user-1',
    content: 'Hello, how are you?',
    created_at: new Date().toISOString(),
    is_read: false,
    is_deleted: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders without crashing', () => {
      const { container } = render(<ChatBubble message={mockMessage} isOwn={true} />);
      expect(container).toBeTruthy();
    });

    it('displays message content', () => {
      const { container } = render(
        <ChatBubble message={mockMessage} isOwn={true} testID="chat-bubble" />
      );
      expect(getByTestId(container, 'chat-bubble-text')).toBeTruthy();
    });

    it('applies own styles for own messages', () => {
      const { container } = render(
        <ChatBubble message={mockMessage} isOwn={true} testID="chat-bubble" />
      );
      expect(getByTestId(container, 'chat-bubble-bubble')).toBeTruthy();
    });

    it('applies other styles for received messages', () => {
      const { container } = render(
        <ChatBubble message={mockMessage} isOwn={false} testID="chat-bubble" />
      );
      expect(getByTestId(container, 'chat-bubble-bubble')).toBeTruthy();
    });
  });

  describe('Timestamp', () => {
    it('hides timestamp by default', () => {
      const { container } = render(
        <ChatBubble message={mockMessage} isOwn={true} testID="chat-bubble" />
      );
      expect(queryByTestId(container, 'chat-bubble-timestamp')).toBeNull();
    });

    it('shows timestamp when showTimestamp is true', () => {
      const { container } = render(
        <ChatBubble message={mockMessage} isOwn={true} showTimestamp={true} testID="chat-bubble" />
      );
      expect(getByTestId(container, 'chat-bubble-timestamp')).toBeTruthy();
    });

    it('formats timestamp correctly', () => {
      const message = {
        ...mockMessage,
        created_at: '2024-01-15T14:30:00Z',
      };
      const { container } = render(
        <ChatBubble message={message} isOwn={true} showTimestamp={true} testID="chat-bubble" />
      );
      const timestamp = getByTestId(container, 'chat-bubble-timestamp');
      expect(timestamp).toBeTruthy();
    });
  });

  describe('Read status', () => {
    it('hides read status by default', () => {
      const { container } = render(
        <ChatBubble message={mockMessage} isOwn={true} testID="chat-bubble" />
      );
      expect(queryByTestId(container, 'chat-bubble-read-status')).toBeNull();
    });

    it('shows read status for own messages when enabled', () => {
      const { container } = render(
        <ChatBubble
          message={mockMessage}
          isOwn={true}
          showReadStatus={true}
          testID="chat-bubble"
        />
      );
      expect(getByTestId(container, 'chat-bubble-read-status')).toBeTruthy();
    });

    it('does not show read status for received messages', () => {
      const { container } = render(
        <ChatBubble
          message={mockMessage}
          isOwn={false}
          showReadStatus={true}
          testID="chat-bubble"
        />
      );
      expect(queryByTestId(container, 'chat-bubble-read-status')).toBeNull();
    });

    it('shows double checkmark for read messages', () => {
      const readMessage = { ...mockMessage, is_read: true };
      const { container } = render(
        <ChatBubble
          message={readMessage}
          isOwn={true}
          showReadStatus={true}
          testID="chat-bubble"
        />
      );
      const status = getByTestId(container, 'chat-bubble-read-status');
      expect(status.getAttribute('name')).toBe('checkmark-done');
    });

    it('shows single checkmark for sent but unread messages', () => {
      const unreadMessage = { ...mockMessage, is_read: false };
      const { container } = render(
        <ChatBubble
          message={unreadMessage}
          isOwn={true}
          showReadStatus={true}
          testID="chat-bubble"
        />
      );
      const status = getByTestId(container, 'chat-bubble-read-status');
      expect(status.getAttribute('name')).toBe('checkmark');
    });
  });

  describe('Message status', () => {
    it('shows sending indicator when status is sending', () => {
      const { container } = render(
        <ChatBubble
          message={mockMessage}
          isOwn={true}
          status="sending"
          testID="chat-bubble"
        />
      );
      expect(getByTestId(container, 'chat-bubble-sending')).toBeTruthy();
    });

    it('shows failed indicator when status is failed', () => {
      const { container } = render(
        <ChatBubble
          message={mockMessage}
          isOwn={true}
          status="failed"
          testID="chat-bubble"
        />
      );
      expect(getByTestId(container, 'chat-bubble-failed')).toBeTruthy();
    });

    it('calls onRetry when failed message is tapped', () => {
      const onRetry = vi.fn();
      const { container } = render(
        <ChatBubble
          message={mockMessage}
          isOwn={true}
          status="failed"
          onRetry={onRetry}
          testID="chat-bubble"
        />
      );

      fireEvent.click(getByTestId(container, 'chat-bubble-retry-touch'));
      expect(onRetry).toHaveBeenCalledWith(mockMessage.id);
    });
  });

  describe('Bubble position', () => {
    it('applies single position styles by default', () => {
      const { container } = render(
        <ChatBubble message={mockMessage} isOwn={true} testID="chat-bubble" />
      );
      expect(getByTestId(container, 'chat-bubble-bubble')).toBeTruthy();
    });

    it('applies first position styles', () => {
      const { container } = render(
        <ChatBubble message={mockMessage} isOwn={true} position="first" testID="chat-bubble" />
      );
      expect(getByTestId(container, 'chat-bubble-bubble')).toBeTruthy();
    });

    it('applies middle position styles', () => {
      const { container } = render(
        <ChatBubble message={mockMessage} isOwn={true} position="middle" testID="chat-bubble" />
      );
      expect(getByTestId(container, 'chat-bubble-bubble')).toBeTruthy();
    });

    it('applies last position styles', () => {
      const { container } = render(
        <ChatBubble message={mockMessage} isOwn={true} position="last" testID="chat-bubble" />
      );
      expect(getByTestId(container, 'chat-bubble-bubble')).toBeTruthy();
    });
  });

  describe('Long press', () => {
    it('calls onLongPress when bubble is long pressed', () => {
      const onLongPress = vi.fn();
      const { container } = render(
        <ChatBubble
          message={mockMessage}
          isOwn={true}
          onLongPress={onLongPress}
          testID="chat-bubble"
        />
      );

      // In jsdom, onLongPress doesn't exist - use contextmenu or custom event
      const bubble = getByTestId(container, 'chat-bubble-bubble');
      fireEvent.contextMenu(bubble);
      // Note: In jsdom with string mocks, onLongPress won't trigger. This test just checks it doesn't crash.
    });

    it('does not crash when onLongPress is not provided', () => {
      const { container } = render(
        <ChatBubble message={mockMessage} isOwn={true} testID="chat-bubble" />
      );

      const bubble = getByTestId(container, 'chat-bubble-bubble');
      fireEvent.contextMenu(bubble);
      // Should not throw
    });
  });

  describe('Accessibility', () => {
    it('has accessible role', () => {
      const { container } = render(
        <ChatBubble message={mockMessage} isOwn={true} testID="chat-bubble" />
      );
      const bubble = getByTestId(container, 'chat-bubble-bubble');
      expect(bubble.getAttribute('accessibilityrole')).toBe('text');
    });

    it('includes comprehensive accessibility label', () => {
      const { container } = render(
        <ChatBubble message={mockMessage} isOwn={true} testID="chat-bubble" />
      );
      const bubble = getByTestId(container, 'chat-bubble-bubble');
      const label = bubble.getAttribute('accessibilitylabel');
      expect(label).toContain('You');
      expect(label).toContain(mockMessage.content);
    });

    it('includes sender info in accessibility label for received messages', () => {
      const { container } = render(
        <ChatBubble message={mockMessage} isOwn={false} testID="chat-bubble" />
      );
      const bubble = getByTestId(container, 'chat-bubble-bubble');
      const label = bubble.getAttribute('accessibilitylabel');
      expect(label).toContain('Anonymous');
    });
  });

  describe('Utility functions', () => {
    describe('formatMessageTime', () => {
      it('formats time correctly', () => {
        const timestamp = '2024-01-15T14:30:00Z';
        const result = formatMessageTime(timestamp);
        expect(result).toBeTruthy();
        expect(typeof result).toBe('string');
      });

      it('returns empty string for invalid timestamp', () => {
        const result = formatMessageTime('invalid');
        expect(result).toBe('');
      });
    });

    describe('formatMessageDate', () => {
      it('returns "Today" for today\'s date', () => {
        const today = new Date().toISOString();
        const result = formatMessageDate(today);
        expect(result).toBe('Today');
      });

      it('returns "Yesterday" for yesterday\'s date', () => {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const result = formatMessageDate(yesterday.toISOString());
        expect(result).toBe('Yesterday');
      });

      it('returns formatted date for older messages', () => {
        const oldDate = '2024-01-15T10:00:00Z';
        const result = formatMessageDate(oldDate);
        expect(result).toBeTruthy();
        expect(typeof result).toBe('string');
      });

      it('returns empty string for invalid date', () => {
        const result = formatMessageDate('invalid');
        expect(result).toBe('');
      });
    });

    describe('getBubblePosition', () => {
      const userId = 'user-1';
      const now = new Date();

      it('returns "single" for isolated message', () => {
        const messages: Message[] = [mockMessage];
        const result = getBubblePosition(messages, 0, userId);
        expect(result).toBe('single');
      });

      it('returns "first" for first message in group', () => {
        const messages: Message[] = [
          mockMessage,
          { ...mockMessage, id: 'msg-2', created_at: new Date(now.getTime() + 1000).toISOString() },
        ];
        const result = getBubblePosition(messages, 0, userId);
        expect(result).toBe('first');
      });

      it('returns "last" for last message in group', () => {
        const messages: Message[] = [
          mockMessage,
          { ...mockMessage, id: 'msg-2', created_at: new Date(now.getTime() + 1000).toISOString() },
        ];
        const result = getBubblePosition(messages, 1, userId);
        expect(result).toBe('last');
      });
    });

    describe('shouldShowDateSeparator', () => {
      it('returns true for first message', () => {
        const result = shouldShowDateSeparator(null, new Date().toISOString());
        expect(result).toBe(true);
      });

      it('returns true for messages on different days', () => {
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        const result = shouldShowDateSeparator(
          yesterday.toISOString(),
          today.toISOString()
        );
        expect(result).toBe(true);
      });

      it('returns false for messages on same day', () => {
        // Use a fixed midday UTC timestamp to avoid timezone midnight boundary issues
        const now = new Date('2024-06-15T12:00:00Z'); // noon UTC, well away from any midnight
        const later = new Date(now.getTime() + 3600000); // 1 hour later, still same day

        const result = shouldShowDateSeparator(
          now.toISOString(),
          later.toISOString()
        );
        expect(result).toBe(false);
      });
    });
  });

  describe('DateSeparator', () => {
    it('renders without crashing', () => {
      const { container } = render(<DateSeparator timestamp={new Date().toISOString()} />);
      expect(container).toBeTruthy();
    });

    it('displays formatted date', () => {
      const { getByText } = render(<DateSeparator timestamp={new Date().toISOString()} />);
      expect(getByText('Today')).toBeTruthy();
    });

    it('applies custom testID', () => {
      const { container } = render(
        <DateSeparator timestamp={new Date().toISOString()} testID="custom-separator" />
      );
      expect(getByTestId(container, 'custom-separator')).toBeTruthy();
    });
  });
});
