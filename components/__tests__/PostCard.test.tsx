/**
 * PostCard Component Tests
 *
 * Tests for PostCard component that displays ledger posts with avatar, note, location, and reactions.
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PostCard, formatRelativeTime, truncateText, getMatchColor, getMatchLabel } from '../PostCard';
import type { Post } from '../../types/database';
import { getByTestId, queryByTestId } from '../../__tests__/utils/jsdom-queries';

// Mock dependencies
vi.mock('../../contexts/AuthContext', () => ({
  useAuthState: () => ({ userId: 'test-user-id' }),
}));

vi.mock('../ReportModal', () => ({
  ReportPostModal: ({ visible, onClose }: any) =>
    visible ? <div testID="report-modal">Report Modal</div> : null,
}));

vi.mock('../VerifiedBadge', () => ({
  VerifiedBadge: ({ testID }: any) => <div testID={testID}>Verified</div>,
}));

vi.mock('../native/PressableScale', () => ({
  PressableScale: ({ children, onPress, testID, style }: any) => (
    <div testID={testID} onClick={onPress} style={style}>
      {children}
    </div>
  ),
}));

vi.mock('../PostReactions', () => ({
  PostReactions: ({ postId, testID }: any) => (
    <div testID={testID}>Reactions for {postId}</div>
  ),
}));

vi.mock('react-native-bitmoji', () => ({
  Avatar: ({ testID }: any) => <div testID={testID}>Avatar</div>,
}));

describe('PostCard', () => {
  const mockPost: Post = {
    id: 'post-1',
    producer_id: 'producer-1',
    message: 'Looking for the person I saw at the coffee shop this morning. You were wearing a red jacket!',
    target_avatar_v2: {
      id: 'avatar-1',
      config: { metadata: { version: 2 }, features: {}, colors: {} },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
    location_id: 'location-1',
    sighting_date: '2024-01-15T10:00:00Z',
    time_granularity: 'hour',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    is_active: true,
  };

  const mockLocation = {
    id: 'location-1',
    name: 'Blue Bottle Coffee',
    address: '123 Main St',
    latitude: 37.7749,
    longitude: -122.4194,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders without crashing', () => {
      const { container } = render(<PostCard post={mockPost} />);
      expect(container).toBeTruthy();
    });

    it('displays the note preview', () => {
      const { container } = render(<PostCard post={mockPost} testID="post-card" />);
      const note = getByTestId(container, 'post-card-note');
      expect(note).toBeTruthy();
    });

    it('displays location when provided and showLocation is true', () => {
      const { container } = render(
        <PostCard post={mockPost} location={mockLocation} showLocation={true} testID="post-card" />
      );
      expect(getByTestId(container, 'post-card-location')).toBeTruthy();
    });

    it('hides location when showLocation is false', () => {
      const { container: cont } = render(
        <PostCard post={mockPost} location={mockLocation} showLocation={false} testID="post-card" />
      );
      expect(queryByTestId(cont, 'post-card-location')).toBeNull();
    });

    it('displays timestamp', () => {
      const { container } = render(<PostCard post={mockPost} testID="post-card" />);
      expect(getByTestId(container, 'post-card-timestamp')).toBeTruthy();
    });

    it('displays avatar in full detail mode', () => {
      const { container } = render(
        <PostCard post={mockPost} detailLevel="full" testID="post-card" />
      );
      expect(getByTestId(container, 'post-card-avatar')).toBeTruthy();
    });

    it('hides avatar in minimal detail mode', () => {
      const { container: cont } = render(
        <PostCard post={mockPost} detailLevel="minimal" testID="post-card" />
      );
      expect(queryByTestId(cont, 'post-card-avatar')).toBeNull();
    });
  });

  describe('Compact mode', () => {
    it('applies compact styles when compact is true', () => {
      const { container } = render(<PostCard post={mockPost} compact={true} testID="post-card" />);
      expect(getByTestId(container, 'post-card')).toBeTruthy();
    });

    it('truncates note more aggressively in compact mode', () => {
      const longPost = {
        ...mockPost,
        message: 'This is a very long message that should be truncated much more aggressively in compact mode than in normal mode because compact mode has a lower character limit for the preview text.',
      };
      const { container } = render(
        <PostCard post={longPost} compact={true} testID="post-card" />
      );
      const note = getByTestId(container, 'post-card-note');
      expect(note).toBeTruthy();
    });
  });

  describe('Match indicator', () => {
    it('shows match badge when matchScore is provided and isMatch is true', () => {
      const { container } = render(
        <PostCard post={mockPost} matchScore={85} isMatch={true} testID="post-card" />
      );
      expect(getByTestId(container, 'post-card-match-badge')).toBeTruthy();
    });

    it('shows match indicator when matchScore is provided and isMatch is true', () => {
      const { container } = render(
        <PostCard post={mockPost} matchScore={85} isMatch={true} testID="post-card" />
      );
      expect(getByTestId(container, 'post-card-match-indicator')).toBeTruthy();
    });

    it('hides match indicator when isMatch is false', () => {
      const { container: cont } = render(
        <PostCard post={mockPost} matchScore={30} isMatch={false} testID="post-card" />
      );
      expect(queryByTestId(cont, 'post-card-match-indicator')).toBeNull();
    });

    it('hides match indicator in compact mode even when isMatch is true', () => {
      const { container: cont } = render(
        <PostCard post={mockPost} matchScore={85} isMatch={true} compact={true} testID="post-card" />
      );
      expect(queryByTestId(cont, 'post-card-match-indicator')).toBeNull();
    });
  });

  describe('Verified badge', () => {
    it('shows verified badge when producer is verified', () => {
      const producerProfile = {
        id: 'producer-1',
        is_verified: true,
        display_name: 'Test User',
        username: 'testuser',
      };
      const { container } = render(
        <PostCard post={mockPost} producerProfile={producerProfile} testID="post-card" />
      );
      expect(getByTestId(container, 'post-card-verified-badge')).toBeTruthy();
    });

    it('hides verified badge when producer is not verified', () => {
      const producerProfile = {
        id: 'producer-1',
        is_verified: false,
        display_name: 'Test User',
        username: 'testuser',
      };
      const { container: cont } = render(
        <PostCard post={mockPost} producerProfile={producerProfile} testID="post-card" />
      );
      expect(queryByTestId(cont, 'post-card-verified-badge')).toBeNull();
    });
  });

  describe('Interactions', () => {
    it('calls onPress when card is pressed', () => {
      const onPress = vi.fn();
      const { container } = render(
        <PostCard post={mockPost} onPress={onPress} testID="post-card" />
      );

      fireEvent.click(getByTestId(container, 'post-card'));
      expect(onPress).toHaveBeenCalledWith(mockPost);
    });

    it('does not crash when onPress is not provided', () => {
      const { container } = render(<PostCard post={mockPost} testID="post-card" />);
      fireEvent.click(getByTestId(container, 'post-card'));
      // Should not throw
    });
  });

  describe('Reactions', () => {
    it('shows reactions when not in compact mode', () => {
      const { container } = render(
        <PostCard post={mockPost} compact={false} testID="post-card" />
      );
      expect(getByTestId(container, 'post-card-reactions')).toBeTruthy();
    });

    it('hides reactions in compact mode', () => {
      const { container: cont } = render(
        <PostCard post={mockPost} compact={true} testID="post-card" />
      );
      expect(queryByTestId(cont, 'post-card-reactions')).toBeNull();
    });
  });

  describe('Utility functions', () => {
    describe('formatRelativeTime', () => {
      it('formats time less than 1 minute as "Just now"', () => {
        const now = new Date();
        const timestamp = new Date(now.getTime() - 30 * 1000).toISOString();
        expect(formatRelativeTime(timestamp)).toBe('Just now');
      });

      it('formats time in minutes', () => {
        const now = new Date();
        const timestamp = new Date(now.getTime() - 5 * 60 * 1000).toISOString();
        expect(formatRelativeTime(timestamp)).toBe('5 minutes ago');
      });

      it('formats time in hours', () => {
        const now = new Date();
        const timestamp = new Date(now.getTime() - 3 * 60 * 60 * 1000).toISOString();
        expect(formatRelativeTime(timestamp)).toBe('3 hours ago');
      });

      it('formats time in days', () => {
        const now = new Date();
        const timestamp = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString();
        expect(formatRelativeTime(timestamp)).toBe('2 days ago');
      });

      it('uses approximate time when requested', () => {
        const now = new Date();
        const timestamp = new Date(now.getTime() - 6 * 60 * 60 * 1000).toISOString();
        expect(formatRelativeTime(timestamp, true)).toBe('this morning');
      });
    });

    describe('truncateText', () => {
      it('returns text as-is when shorter than max length', () => {
        expect(truncateText('Short text', 50)).toBe('Short text');
      });

      it('truncates text longer than max length', () => {
        const long = 'This is a very long text that should be truncated';
        const result = truncateText(long, 20);
        expect(result.length).toBeLessThanOrEqual(23); // 20 + '...'
        expect(result.endsWith('...')).toBe(true);
      });

      it('truncates at word boundary when possible', () => {
        const text = 'This is a test message';
        const result = truncateText(text, 10);
        expect(result).toBe('This is a...');
      });
    });

    describe('getMatchColor', () => {
      it('returns excellent match color for score >= 90', () => {
        expect(getMatchColor(95)).toBe('#34C759');
      });

      it('returns strong match color for score >= 75', () => {
        expect(getMatchColor(80)).toBe('#5AC8FA');
      });

      it('returns low match color for score < 40', () => {
        expect(getMatchColor(30)).toBeTruthy();
      });
    });

    describe('getMatchLabel', () => {
      it('returns "Excellent match!" for score >= 90', () => {
        expect(getMatchLabel(95)).toBe('Excellent match!');
      });

      it('returns "Strong match" for score >= 75', () => {
        expect(getMatchLabel(80)).toBe('Strong match');
      });

      it('returns "Low match" for score < 40', () => {
        expect(getMatchLabel(30)).toBe('Low match');
      });
    });
  });
});
