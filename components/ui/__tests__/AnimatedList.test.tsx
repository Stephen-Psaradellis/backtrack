/**
 * Tests for components/ui/AnimatedList.tsx
 *
 * Tests the AnimatedList and AnimatedListItem components.
 */

import React from 'react'
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AnimatedList, AnimatedListItem } from '../AnimatedList'

describe('AnimatedList', () => {
  describe('rendering', () => {
    it('should render children', () => {
      render(
        <AnimatedList>
          <div>Item 1</div>
          <div>Item 2</div>
          <div>Item 3</div>
        </AnimatedList>
      )

      expect(screen.getByText('Item 1')).toBeInTheDocument()
      expect(screen.getByText('Item 2')).toBeInTheDocument()
      expect(screen.getByText('Item 3')).toBeInTheDocument()
    })

    it('should render with custom className', () => {
      const { container } = render(
        <AnimatedList className="custom-list">
          <div>Item</div>
        </AnimatedList>
      )

      expect(container.firstChild).toHaveClass('custom-list')
    })

    it('should handle non-element children', () => {
      render(
        <AnimatedList>
          {null}
          <div>Item 1</div>
          {undefined}
          text content
          <div>Item 2</div>
        </AnimatedList>
      )

      expect(screen.getByText('Item 1')).toBeInTheDocument()
      expect(screen.getByText('Item 2')).toBeInTheDocument()
      expect(screen.getByText('text content')).toBeInTheDocument()
    })
  })

  describe('animation', () => {
    it('should use fade-in-up animation by default', () => {
      const { container } = render(
        <AnimatedList>
          <div>Item</div>
        </AnimatedList>
      )

      const animatedDiv = container.querySelector('.animate-fade-in-up')
      expect(animatedDiv).toBeInTheDocument()
    })

    it('should use fade-in animation when specified', () => {
      const { container } = render(
        <AnimatedList animation="fade-in">
          <div>Item</div>
        </AnimatedList>
      )

      const animatedDiv = container.querySelector('.animate-fade-in')
      expect(animatedDiv).toBeInTheDocument()
    })

    it('should use fade-in-scale animation when specified', () => {
      const { container } = render(
        <AnimatedList animation="fade-in-scale">
          <div>Item</div>
        </AnimatedList>
      )

      const animatedDiv = container.querySelector('.animate-fade-in-scale')
      expect(animatedDiv).toBeInTheDocument()
    })

    it('should apply opacity-0 to children', () => {
      const { container } = render(
        <AnimatedList>
          <div>Item</div>
        </AnimatedList>
      )

      const animatedDiv = container.querySelector('.opacity-0')
      expect(animatedDiv).toBeInTheDocument()
    })
  })

  describe('staggerDelay', () => {
    it('should apply default stagger delay of 50ms', () => {
      const { container } = render(
        <AnimatedList>
          <div>Item 1</div>
          <div>Item 2</div>
          <div>Item 3</div>
        </AnimatedList>
      )

      const items = container.querySelectorAll('.animate-fade-in-up')
      expect(items[0]).toHaveStyle({ animationDelay: '0ms' })
      expect(items[1]).toHaveStyle({ animationDelay: '50ms' })
      expect(items[2]).toHaveStyle({ animationDelay: '100ms' })
    })

    it('should apply custom stagger delay', () => {
      const { container } = render(
        <AnimatedList staggerDelay={100}>
          <div>Item 1</div>
          <div>Item 2</div>
          <div>Item 3</div>
        </AnimatedList>
      )

      const items = container.querySelectorAll('.animate-fade-in-up')
      expect(items[0]).toHaveStyle({ animationDelay: '0ms' })
      expect(items[1]).toHaveStyle({ animationDelay: '100ms' })
      expect(items[2]).toHaveStyle({ animationDelay: '200ms' })
    })

    it('should apply animationFillMode forwards', () => {
      const { container } = render(
        <AnimatedList>
          <div>Item</div>
        </AnimatedList>
      )

      const animatedDiv = container.querySelector('.animate-fade-in-up')
      expect(animatedDiv).toHaveStyle({ animationFillMode: 'forwards' })
    })
  })
})

describe('AnimatedListItem', () => {
  describe('rendering', () => {
    it('should render children', () => {
      render(
        <AnimatedListItem>
          <span>Content</span>
        </AnimatedListItem>
      )

      expect(screen.getByText('Content')).toBeInTheDocument()
    })

    it('should render with custom className', () => {
      const { container } = render(
        <AnimatedListItem className="custom-item">
          <span>Content</span>
        </AnimatedListItem>
      )

      expect(container.firstChild).toHaveClass('custom-item')
    })
  })

  describe('animation', () => {
    it('should use fade-in-up animation by default', () => {
      const { container } = render(
        <AnimatedListItem>
          <span>Content</span>
        </AnimatedListItem>
      )

      expect(container.firstChild).toHaveClass('animate-fade-in-up')
    })

    it('should use fade-in animation when specified', () => {
      const { container } = render(
        <AnimatedListItem animation="fade-in">
          <span>Content</span>
        </AnimatedListItem>
      )

      expect(container.firstChild).toHaveClass('animate-fade-in')
    })

    it('should use fade-in-scale animation when specified', () => {
      const { container } = render(
        <AnimatedListItem animation="fade-in-scale">
          <span>Content</span>
        </AnimatedListItem>
      )

      expect(container.firstChild).toHaveClass('animate-fade-in-scale')
    })

    it('should have opacity-0', () => {
      const { container } = render(
        <AnimatedListItem>
          <span>Content</span>
        </AnimatedListItem>
      )

      expect(container.firstChild).toHaveClass('opacity-0')
    })
  })

  describe('delay', () => {
    it('should use default delay of 50ms and index 0', () => {
      const { container } = render(
        <AnimatedListItem>
          <span>Content</span>
        </AnimatedListItem>
      )

      expect(container.firstChild).toHaveStyle({ animationDelay: '0ms' })
    })

    it('should calculate delay based on index', () => {
      const { container } = render(
        <AnimatedListItem index={3}>
          <span>Content</span>
        </AnimatedListItem>
      )

      expect(container.firstChild).toHaveStyle({ animationDelay: '150ms' })
    })

    it('should use custom delay', () => {
      const { container } = render(
        <AnimatedListItem index={2} delay={100}>
          <span>Content</span>
        </AnimatedListItem>
      )

      expect(container.firstChild).toHaveStyle({ animationDelay: '200ms' })
    })

    it('should apply animationFillMode forwards', () => {
      const { container } = render(
        <AnimatedListItem>
          <span>Content</span>
        </AnimatedListItem>
      )

      expect(container.firstChild).toHaveStyle({ animationFillMode: 'forwards' })
    })
  })
})
