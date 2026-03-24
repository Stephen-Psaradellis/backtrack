/**
 * Tests for components/posts/StaggeredPostList.tsx
 *
 * Tests the StaggeredPostList animated FlatList wrapper.
 */

import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render } from '@testing-library/react'
import { StaggeredPostList } from '../StaggeredPostList'

// Helper to get by testid
const getByTestId = (container: HTMLElement, testId: string) => {
  const element = container.querySelector(`[testid="${testId}"]`)
  if (!element) {
    throw new Error(`Unable to find element with testid="${testId}"`)
  }
  return element
}

describe('StaggeredPostList', () => {
  const mockData = [
    { id: '1', text: 'Post one' },
    { id: '2', text: 'Post two' },
    { id: '3', text: 'Post three' },
  ]

  const defaultProps = {
    data: mockData,
    renderItem: ({ item }: { item: { id: string; text: string } }) => (
      <div data-testid={`post-${item.id}`}>{item.text}</div>
    ),
    keyExtractor: (item: { id: string }) => item.id,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('rendering', () => {
    it('should render with default testID', () => {
      const { container } = render(<StaggeredPostList {...defaultProps} />)
      expect(getByTestId(container, 'staggered-post-list')).toBeInTheDocument()
    })

    it('should render with custom testID', () => {
      const { container } = render(
        <StaggeredPostList {...defaultProps} testID="my-list" />
      )
      expect(getByTestId(container, 'my-list')).toBeInTheDocument()
    })

    it('should render all items', () => {
      const { getByText } = render(<StaggeredPostList {...defaultProps} />)
      expect(getByText('Post one')).toBeInTheDocument()
      expect(getByText('Post two')).toBeInTheDocument()
      expect(getByText('Post three')).toBeInTheDocument()
    })
  })

  describe('empty state', () => {
    it('should render ListEmptyComponent when data is empty', () => {
      const { getByText } = render(
        <StaggeredPostList
          {...defaultProps}
          data={[]}
          ListEmptyComponent={<div>No posts yet</div>}
        />
      )
      expect(getByText('No posts yet')).toBeInTheDocument()
    })

    it('should not render ListEmptyComponent when data has items', () => {
      const { queryByText } = render(
        <StaggeredPostList
          {...defaultProps}
          ListEmptyComponent={<div>No posts yet</div>}
        />
      )
      expect(queryByText('No posts yet')).not.toBeInTheDocument()
    })
  })

  describe('header and footer', () => {
    it('should accept ListHeaderComponent prop', () => {
      const { container } = render(
        <StaggeredPostList
          {...defaultProps}
          ListHeaderComponent={<div>Header</div>}
        />
      )
      // FlatList is mocked in jsdom; verify component renders without error
      expect(getByTestId(container, 'staggered-post-list')).toBeInTheDocument()
    })

    it('should accept ListFooterComponent prop', () => {
      const { container } = render(
        <StaggeredPostList
          {...defaultProps}
          ListFooterComponent={<div>Footer</div>}
        />
      )
      expect(getByTestId(container, 'staggered-post-list')).toBeInTheDocument()
    })
  })

  describe('refresh', () => {
    it('should accept onRefresh callback', () => {
      const mockRefresh = vi.fn()
      const { container } = render(
        <StaggeredPostList
          {...defaultProps}
          onRefresh={mockRefresh}
          refreshing={false}
        />
      )
      // Component renders without errors when refresh props are provided
      expect(getByTestId(container, 'staggered-post-list')).toBeInTheDocument()
    })
  })

  describe('animation props', () => {
    it('should accept custom staggerDelay and animationDuration', () => {
      const { getByText } = render(
        <StaggeredPostList
          {...defaultProps}
          staggerDelay={200}
          animationDuration={600}
        />
      )
      // Renders correctly with custom animation values
      expect(getByText('Post one')).toBeInTheDocument()
    })

    it('should accept animateOnMount=false', () => {
      const { getByText } = render(
        <StaggeredPostList {...defaultProps} animateOnMount={false} />
      )
      expect(getByText('Post one')).toBeInTheDocument()
    })
  })
})
