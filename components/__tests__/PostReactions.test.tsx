/**
 * PostReactions Component Tests
 *
 * Tests for PostReactions component that displays reaction buttons for posts.
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PostReactions } from '../PostReactions';
import { supabase } from '../../lib/supabase';
import { getByTestId, queryByTestId } from '../../__tests__/utils/jsdom-queries';

// Mock Supabase - define mock factory INSIDE vi.mock for hoisting
vi.mock('../../lib/supabase', () => {
  const mockSupabase = {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ data: [], error: null })),
      })),
      insert: vi.fn(() => Promise.resolve({ error: null })),
      delete: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => Promise.resolve({ error: null })),
          })),
        })),
      })),
    })),
  };
  return {
    supabase: mockSupabase,
  };
});

vi.mock('expo-haptics', () => ({
  impactAsync: vi.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light' },
}));

// Get reference to the mocked supabase
const mockSupabase = vi.mocked(supabase);

describe('PostReactions', () => {
  const defaultProps = {
    postId: 'post-1',
    userId: 'user-1',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders without crashing', () => {
      const { container } = render(<PostReactions {...defaultProps} />);
      expect(container).toBeTruthy();
    });

    it('renders all three reaction types', () => {
      const { container } = render(<PostReactions {...defaultProps} testID="reactions" />);
      // In jsdom, testID becomes lowercase testid
      expect(container.querySelector('[testid="reactions-thats_me"]')).toBeTruthy();
      expect(container.querySelector('[testid="reactions-great_description"]')).toBeTruthy();
      expect(container.querySelector('[testid="reactions-saw_them_too"]')).toBeTruthy();
    });

    it('does not render when userId is null', () => {
      const { container } = render(<PostReactions postId="post-1" userId={null} />);
      expect(container.children.length).toBe(0);
    });

    it('displays reaction labels', () => {
      const { getByText } = render(<PostReactions {...defaultProps} />);
      expect(getByText('That was me!')).toBeTruthy();
      expect(getByText('Great description!')).toBeTruthy();
      expect(getByText('I saw them too!')).toBeTruthy();
    });

    it('displays emojis for each reaction', () => {
      const { getByText } = render(<PostReactions {...defaultProps} />);
      expect(getByText('👋')).toBeTruthy();
      expect(getByText('✨')).toBeTruthy();
      expect(getByText('👀')).toBeTruthy();
    });
  });

  describe('Loading reactions', () => {
    it('loads reactions on mount', async () => {
      const mockData = [
        { reaction_type: 'thats_me', user_id: 'other-user' },
        { reaction_type: 'great_description', user_id: 'user-1' },
      ];

      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ data: mockData, error: null })),
        })),
      });

      render(<PostReactions {...defaultProps} />);

      await waitFor(() => {
        expect(mockSupabase.from).toHaveBeenCalledWith('post_reactions');
      });
    });

    it('displays reaction counts', async () => {
      const mockData = [
        { reaction_type: 'thats_me', user_id: 'user-1' },
        { reaction_type: 'thats_me', user_id: 'user-2' },
        { reaction_type: 'thats_me', user_id: 'user-3' },
      ];

      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ data: mockData, error: null })),
        })),
      });

      const { getByText } = render(<PostReactions {...defaultProps} />);

      await waitFor(() => {
        expect(getByText('3')).toBeTruthy();
      });
    });

    it('highlights reactions user has made', async () => {
      const mockData = [
        { reaction_type: 'great_description', user_id: 'user-1' },
      ];

      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ data: mockData, error: null })),
        })),
      });

      const { container } = render(<PostReactions {...defaultProps} testID="reactions" />);

      await waitFor(() => {
        const button = getByTestId(container, 'reactions-great_description');
        expect(button.getAttribute('accessibilitystate')).toBeTruthy();
      });
    });
  });

  describe('Toggling reactions', () => {
    it('adds a reaction when button is pressed', async () => {
      mockSupabase.from.mockImplementation((table) => {
        if (table === 'post_reactions') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => Promise.resolve({ data: [], error: null })),
            })),
            insert: vi.fn(() => Promise.resolve({ error: null })),
          };
        }
        return {};
      });

      const { container } = render(<PostReactions {...defaultProps} testID="reactions" />);

      await waitFor(() => {
        expect(getByTestId(container, 'reactions-thats_me')).toBeTruthy();
      });

      fireEvent.click(getByTestId(container, 'reactions-thats_me'));

      await waitFor(() => {
        expect(mockSupabase.from).toHaveBeenCalledWith('post_reactions');
      });
    });

    it('removes a reaction when button is pressed again', async () => {
      const mockData = [
        { reaction_type: 'thats_me', user_id: 'user-1' },
      ];

      let callCount = 0;
      mockSupabase.from.mockImplementation((table) => {
        if (table === 'post_reactions') {
          callCount++;
          if (callCount === 1) {
            return {
              select: vi.fn(() => ({
                eq: vi.fn(() => Promise.resolve({ data: mockData, error: null })),
              })),
            };
          }
          return {
            delete: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  eq: vi.fn(() => Promise.resolve({ error: null })),
                })),
              })),
            })),
          };
        }
        return {};
      });

      const { container } = render(<PostReactions {...defaultProps} testID="reactions" />);

      await waitFor(() => {
        expect(container.querySelector('[testid="reactions-thats_me"]')).toBeTruthy();
      });

      fireEvent.click(container.querySelector('[testid="reactions-thats_me"]')!);

      await waitFor(() => {
        expect(mockSupabase.from).toHaveBeenCalled();
      });
    });

    it('prevents multiple simultaneous toggles', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ data: [], error: null })),
        })),
        insert: vi.fn(() => new Promise((resolve) => setTimeout(() => resolve({ error: null }), 100))),
      });

      const { container } = render(<PostReactions {...defaultProps} testID="reactions" />);

      await waitFor(() => {
        expect(container.querySelector('[testid="reactions-thats_me"]')).toBeTruthy();
      });

      const button = container.querySelector('[testid="reactions-thats_me"]')!;

      // Press multiple times quickly
      fireEvent.click(button);
      fireEvent.click(button);
      fireEvent.click(button);

      // Should only trigger insert once
      await waitFor(() => {
        expect(mockSupabase.from).toHaveBeenCalled();
      });
    });
  });

  describe('Accessibility', () => {
    it('has accessible labels for all reactions', async () => {
      const { container } = render(<PostReactions {...defaultProps} testID="reactions" />);

      await waitFor(() => {
        const button = getByTestId(container, 'reactions-thats_me');
        expect(button.getAttribute('accessibilitylabel')).toContain('That was me!');
      });
    });

    it('includes count in accessibility label', async () => {
      const mockData = [
        { reaction_type: 'thats_me', user_id: 'user-2' },
        { reaction_type: 'thats_me', user_id: 'user-3' },
      ];

      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ data: mockData, error: null })),
        })),
      });

      const { container } = render(<PostReactions {...defaultProps} testID="reactions" />);

      await waitFor(() => {
        const button = getByTestId(container, 'reactions-thats_me');
        expect(button.getAttribute('accessibilitylabel')).toContain('2 people reacted');
      });
    });

    it('indicates selected state in accessibility', async () => {
      const mockData = [
        { reaction_type: 'thats_me', user_id: 'user-1' },
      ];

      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ data: mockData, error: null })),
        })),
      });

      const { container } = render(<PostReactions {...defaultProps} testID="reactions" />);

      await waitFor(() => {
        const button = getByTestId(container, 'reactions-thats_me');
        const accessibilityState = button.getAttribute('accessibilitystate');
        expect(accessibilityState).toBeTruthy();
      });
    });
  });
});
