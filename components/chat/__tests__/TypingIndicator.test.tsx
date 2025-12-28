/**
 * TypingIndicator Component Tests
 *
 * Tests for the TypingIndicator component including:
 * - Rendering when typing/not typing
 * - Username display
 * - Animated dots
 * - Accessibility requirements
 */

import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TypingIndicator } from '../TypingIndicator'

// Mock CSS module
vi.mock('../styles/ChatScreen.module.css', () => ({
  typingContainer: 'typingContainer',
  typingBubbleWrapper: 'typingBubbleWrapper',
  typingDotsContainer: 'typingDotsContainer',
  typingDot: 'typingDot',
  typingDotDelay1: 'typingDotDelay1',
  typingDotDelay2: 'typingDotDelay2',
  typingDotDelay3: 'typingDotDelay3',
  typingText: 'typingText',
}))

describe('TypingIndicator', () => {
  describe('Visibility', () => {
    it('should render when isTyping is true', () => {
      render(<TypingIndicator isTyping={true} />)

      expect(screen.getByRole('status')).toBeInTheDocument()
    })

    it('should not render when isTyping is false', () => {
      render(<TypingIndicator isTyping={false} />)

      expect(screen.queryByRole('status')).not.toBeInTheDocument()
    })

    it('should return null when isTyping is false', () => {
      const { container } = render(<TypingIndicator isTyping={false} />)

      expect(container.firstChild).toBeNull()
    })
  })

  describe('Username Display', () => {
    it('should display username when provided', () => {
      render(<TypingIndicator isTyping={true} username="Sarah" />)

      expect(screen.getByText('Sarah is typing...')).toBeInTheDocument()
    })

    it('should display "Someone" when username not provided', () => {
      render(<TypingIndicator isTyping={true} />)

      expect(screen.getByText('Someone is typing...')).toBeInTheDocument()
    })

    it('should display "Someone" when username is undefined', () => {
      render(<TypingIndicator isTyping={true} username={undefined} />)

      expect(screen.getByText('Someone is typing...')).toBeInTheDocument()
    })

    it('should display "Someone" when username is empty string', () => {
      render(<TypingIndicator isTyping={true} username="" />)

      expect(screen.getByText('Someone is typing...')).toBeInTheDocument()
    })
  })

  describe('Animated Dots', () => {
    it('should render three dots', () => {
      const { container } = render(<TypingIndicator isTyping={true} />)

      const dots = container.querySelectorAll('.typingDot')
      expect(dots).toHaveLength(3)
    })

    it('should have different delay classes on dots', () => {
      const { container } = render(<TypingIndicator isTyping={true} />)

      expect(container.querySelector('.typingDotDelay1')).toBeInTheDocument()
      expect(container.querySelector('.typingDotDelay2')).toBeInTheDocument()
      expect(container.querySelector('.typingDotDelay3')).toBeInTheDocument()
    })

    it('should have aria-hidden on dots container', () => {
      const { container } = render(<TypingIndicator isTyping={true} />)

      const dotsContainer = container.querySelector('.typingDotsContainer')
      expect(dotsContainer).toHaveAttribute('aria-hidden', 'true')
    })
  })

  describe('Accessibility', () => {
    it('should have role="status"', () => {
      render(<TypingIndicator isTyping={true} />)

      expect(screen.getByRole('status')).toBeInTheDocument()
    })

    it('should have aria-live="polite"', () => {
      render(<TypingIndicator isTyping={true} />)

      expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite')
    })

    it('should have visible text for screen readers', () => {
      render(<TypingIndicator isTyping={true} username="John" />)

      // The text "John is typing..." should be visible to screen readers
      expect(screen.getByText('John is typing...')).toBeInTheDocument()
    })
  })

  describe('Structure', () => {
    it('should have correct container structure', () => {
      const { container } = render(<TypingIndicator isTyping={true} />)

      expect(container.querySelector('.typingContainer')).toBeInTheDocument()
      expect(container.querySelector('.typingBubbleWrapper')).toBeInTheDocument()
      expect(container.querySelector('.typingDotsContainer')).toBeInTheDocument()
      expect(container.querySelector('.typingText')).toBeInTheDocument()
    })
  })

  describe('Edge Cases', () => {
    it('should handle very long username', () => {
      const longUsername = 'A'.repeat(100)
      render(<TypingIndicator isTyping={true} username={longUsername} />)

      expect(screen.getByText(`${longUsername} is typing...`)).toBeInTheDocument()
    })

    it('should handle special characters in username', () => {
      render(<TypingIndicator isTyping={true} username="User_123-Test" />)

      expect(screen.getByText('User_123-Test is typing...')).toBeInTheDocument()
    })

    it('should handle unicode characters in username', () => {
      render(<TypingIndicator isTyping={true} username="用户名" />)

      expect(screen.getByText('用户名 is typing...')).toBeInTheDocument()
    })

    it('should handle emojis in username', () => {
      render(<TypingIndicator isTyping={true} username="User 😀" />)

      expect(screen.getByText('User 😀 is typing...')).toBeInTheDocument()
    })
  })

  describe('Re-renders', () => {
    it('should hide when isTyping changes from true to false', () => {
      const { rerender } = render(<TypingIndicator isTyping={true} username="John" />)

      expect(screen.getByRole('status')).toBeInTheDocument()

      rerender(<TypingIndicator isTyping={false} username="John" />)

      expect(screen.queryByRole('status')).not.toBeInTheDocument()
    })

    it('should show when isTyping changes from false to true', () => {
      const { rerender } = render(<TypingIndicator isTyping={false} username="John" />)

      expect(screen.queryByRole('status')).not.toBeInTheDocument()

      rerender(<TypingIndicator isTyping={true} username="John" />)

      expect(screen.getByRole('status')).toBeInTheDocument()
    })

    it('should update username when changed', () => {
      const { rerender } = render(<TypingIndicator isTyping={true} username="John" />)

      expect(screen.getByText('John is typing...')).toBeInTheDocument()

      rerender(<TypingIndicator isTyping={true} username="Jane" />)

      expect(screen.getByText('Jane is typing...')).toBeInTheDocument()
      expect(screen.queryByText('John is typing...')).not.toBeInTheDocument()
    })
  })
})
