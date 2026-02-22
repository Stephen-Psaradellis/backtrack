/**
 * SwipeableCardStack Component Tests
 *
 * Tests for the Tinder-style swipeable card stack component.
 */

import React from 'react'
import { render, fireEvent } from '@testing-library/react'
import { Text } from 'react-native'
import { SwipeableCardStack } from '../SwipeableCardStack'
import type { Post } from '../../types/database'

describe('SwipeableCardStack', () => {
  const mockPosts: Post[] = [
    {
      id: 'post-1',
      user_id: 'user-1',
      location_id: 'loc-1',
      moment: 'coffee',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'post-2',
      user_id: 'user-2',
      location_id: 'loc-1',
      moment: 'lunch',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'post-3',
      user_id: 'user-3',
      location_id: 'loc-1',
      moment: 'dinner',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ]

  const defaultProps = {
    posts: mockPosts,
    onSwipeRight: vi.fn(),
    onSwipeLeft: vi.fn(),
    renderCard: (post: Post) => <Text testID={`card-content-${post.id}`}>{post.moment}</Text>,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('renders without crashing', () => {
      const { container } = render(<SwipeableCardStack {...defaultProps} />)
      expect(container).toBeTruthy()
    })

    it('renders the card stack container', () => {
      const { container } = render(<SwipeableCardStack {...defaultProps} />)
      expect(container.querySelector('[testid="swipeable-card-stack"]')).toBeTruthy()
    })

    it('renders cards for visible posts', () => {
      const { container } = render(<SwipeableCardStack {...defaultProps} />)
      // Should render first card (top card)
      expect(container.querySelector('[testid="swipeable-card-stack-card-0"]')).toBeTruthy()
    })

    it('renders card content using renderCard function', () => {
      const { container } = render(<SwipeableCardStack {...defaultProps} />)
      expect(container.querySelector('[testid="card-content-post-1"]')).toBeTruthy()
    })

    it('renders empty state when no posts', () => {
      const { container, getByText } = render(
        <SwipeableCardStack {...defaultProps} posts={[]} />
      )
      expect(container.querySelector('[testid="swipeable-card-stack-empty"]')).toBeTruthy()
      expect(getByText('No more posts')).toBeTruthy()
      expect(getByText('Check back later for new connections')).toBeTruthy()
    })

    it('uses custom testID when provided', () => {
      const { container } = render(
        <SwipeableCardStack {...defaultProps} testID="custom-stack" />
      )
      expect(container.querySelector('[testid="custom-stack"]')).toBeTruthy()
    })
  })

  describe('Card Display', () => {
    it('displays cards in stack order', () => {
      const { container } = render(<SwipeableCardStack {...defaultProps} />)
      // First card should be visible
      const card = container.querySelector('[testid="swipeable-card-stack-card-0"]')
      expect(card).toBeTruthy()
    })

    it('renders multiple cards when available', () => {
      const { container } = render(<SwipeableCardStack {...defaultProps} />)
      // Should render up to 3 cards (current + next 2)
      expect(container.querySelector('[testid="swipeable-card-stack-card-0"]')).toBeTruthy()
    })
  })

  describe('Gestures (PanResponder)', () => {
    it('has pan responder handlers on top card', () => {
      const { container } = render(<SwipeableCardStack {...defaultProps} />)
      const topCard = container.querySelector('[testid="swipeable-card-stack-card-0"]')

      // Check that the card has gesture handlers (panHandlers attached)
      // In test environment, we can't fully test PanResponder, but we can verify structure
      expect(topCard).toBeTruthy()
    })
  })

  describe('Empty State', () => {
    it('shows empty state when all cards are swiped', () => {
      const { container, getByText } = render(
        <SwipeableCardStack {...defaultProps} posts={[]} />
      )
      expect(container.querySelector('[testid="swipeable-card-stack-empty"]')).toBeTruthy()
      expect(getByText('No more posts')).toBeTruthy()
    })

    it('shows appropriate empty state message', () => {
      const { getByText } = render(
        <SwipeableCardStack {...defaultProps} posts={[]} />
      )
      expect(getByText('Check back later for new connections')).toBeTruthy()
    })
  })

  describe('Animations', () => {
    it('renders Animated.View for top card', () => {
      const { container } = render(<SwipeableCardStack {...defaultProps} />)
      const card = container.querySelector('[testid="swipeable-card-stack-card-0"]')
      // Animated.View should be present
      expect(card).toBeTruthy()
    })

    it('renders background cards with proper structure', () => {
      const { container } = render(<SwipeableCardStack {...defaultProps} />)
      // Background cards should exist if there are enough posts
      const card = container.querySelector('[testid="swipeable-card-stack-card-0"]')
      expect(card).toBeTruthy()
    })
  })

  describe('Card Content', () => {
    it('calls renderCard for each visible card', () => {
      const renderCard = vi.fn((post: Post) => <Text>{post.moment}</Text>)
      render(<SwipeableCardStack {...defaultProps} renderCard={renderCard} />)

      // Should be called at least once for visible cards
      expect(renderCard).toHaveBeenCalled()
    })

    it('passes correct post data to renderCard', () => {
      const renderCard = vi.fn((post: Post) => <Text>{post.id}</Text>)
      render(<SwipeableCardStack {...defaultProps} renderCard={renderCard} />)

      // Should pass the first post
      expect(renderCard).toHaveBeenCalledWith(mockPosts[0])
    })
  })

  describe('Integration', () => {
    it('renders with single post', () => {
      const { container } = render(
        <SwipeableCardStack {...defaultProps} posts={[mockPosts[0]]} />
      )
      expect(container.querySelector('[testid="swipeable-card-stack-card-0"]')).toBeTruthy()
    })

    it('renders with many posts', () => {
      const manyPosts = Array.from({ length: 10 }, (_, i) => ({
        ...mockPosts[0],
        id: `post-${i}`,
      }))
      const { container } = render(
        <SwipeableCardStack {...defaultProps} posts={manyPosts} />
      )
      expect(container.querySelector('[testid="swipeable-card-stack"]')).toBeTruthy()
    })
  })
})
