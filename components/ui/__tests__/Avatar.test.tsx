/**
 * Tests for components/ui/Avatar.tsx
 *
 * Tests the Avatar and AvatarGroup components.
 */

import React from 'react'
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Avatar, AvatarGroup } from '../Avatar'

describe('Avatar', () => {
  describe('rendering', () => {
    it('should render with default props', () => {
      const { container } = render(<Avatar />)

      expect(container.firstChild).toBeInTheDocument()
    })

    it('should render image when src is provided', () => {
      render(<Avatar src="https://example.com/avatar.jpg" alt="User Avatar" />)

      const img = screen.getByRole('img')
      expect(img).toHaveAttribute('src', 'https://example.com/avatar.jpg')
      expect(img).toHaveAttribute('alt', 'User Avatar')
    })

    it('should render initials when no src is provided', () => {
      render(<Avatar alt="John Doe" />)

      expect(screen.getByText('JD')).toBeInTheDocument()
    })

    it('should render initials from fallback prop', () => {
      render(<Avatar fallback="Jane Smith" />)

      expect(screen.getByText('JS')).toBeInTheDocument()
    })

    it('should prefer fallback over alt for initials', () => {
      render(<Avatar alt="John Doe" fallback="Alice Bob" />)

      expect(screen.getByText('AB')).toBeInTheDocument()
      expect(screen.queryByText('JD')).not.toBeInTheDocument()
    })

    it('should render "?" when no alt or fallback', () => {
      render(<Avatar alt="" />)

      expect(screen.getByText('?')).toBeInTheDocument()
    })

    it('should handle single word names', () => {
      render(<Avatar alt="John" />)

      expect(screen.getByText('J')).toBeInTheDocument()
    })

    it('should limit initials to 2 characters', () => {
      render(<Avatar alt="John William Doe Smith" />)

      expect(screen.getByText('JW')).toBeInTheDocument()
    })
  })

  describe('sizes', () => {
    it('should render md size by default', () => {
      const { container } = render(<Avatar />)

      expect(container.firstChild).toHaveClass('h-10', 'w-10')
    })

    it('should render xs size', () => {
      const { container } = render(<Avatar size="xs" />)

      expect(container.firstChild).toHaveClass('h-6', 'w-6')
    })

    it('should render sm size', () => {
      const { container } = render(<Avatar size="sm" />)

      expect(container.firstChild).toHaveClass('h-8', 'w-8')
    })

    it('should render lg size', () => {
      const { container } = render(<Avatar size="lg" />)

      expect(container.firstChild).toHaveClass('h-12', 'w-12')
    })

    it('should render xl size', () => {
      const { container } = render(<Avatar size="xl" />)

      expect(container.firstChild).toHaveClass('h-16', 'w-16')
    })

    it('should render 2xl size', () => {
      const { container } = render(<Avatar size="2xl" />)

      expect(container.firstChild).toHaveClass('h-24', 'w-24')
    })
  })

  describe('status', () => {
    it('should not show status by default', () => {
      const { container } = render(<Avatar />)

      // Should only have one child (the initials span), no status indicator
      const statusIndicators = container.querySelectorAll('.bg-success, .bg-neutral-400, .bg-warning, .bg-error')
      expect(statusIndicators.length).toBe(0)
    })

    it('should show online status', () => {
      const { container } = render(<Avatar status="online" />)

      const statusIndicator = container.querySelector('.bg-success')
      expect(statusIndicator).toBeInTheDocument()
    })

    it('should show offline status', () => {
      const { container } = render(<Avatar status="offline" />)

      const statusIndicator = container.querySelector('.bg-neutral-400')
      expect(statusIndicator).toBeInTheDocument()
    })

    it('should show away status', () => {
      const { container } = render(<Avatar status="away" />)

      const statusIndicator = container.querySelector('.bg-warning')
      expect(statusIndicator).toBeInTheDocument()
    })

    it('should show busy status', () => {
      const { container } = render(<Avatar status="busy" />)

      const statusIndicator = container.querySelector('.bg-error')
      expect(statusIndicator).toBeInTheDocument()
    })

    it('should not show status when status is none', () => {
      const { container } = render(<Avatar status="none" />)

      const statusIndicators = container.querySelectorAll('.bg-success, .bg-neutral-400, .bg-warning, .bg-error')
      expect(statusIndicators.length).toBe(0)
    })
  })

  describe('ring', () => {
    it('should not show ring by default', () => {
      const { container } = render(<Avatar />)

      expect(container.firstChild).not.toHaveClass('ring-primary-500')
    })

    it('should show primary ring when showRing is true', () => {
      const { container } = render(<Avatar showRing />)

      expect(container.firstChild).toHaveClass('ring-primary-500')
    })

    it('should show accent ring', () => {
      const { container } = render(<Avatar showRing ringColor="accent" />)

      expect(container.firstChild).toHaveClass('ring-accent-500')
    })

    it('should show gradient ring', () => {
      const { container } = render(<Avatar showRing ringColor="gradient" />)

      // Gradient ring uses primary-500 as base
      expect(container.firstChild).toHaveClass('ring-primary-500')
    })
  })

  describe('className', () => {
    it('should merge custom className', () => {
      const { container } = render(<Avatar className="custom-avatar" />)

      expect(container.firstChild).toHaveClass('custom-avatar')
    })
  })

  describe('image props', () => {
    it('should pass through HTML attributes', () => {
      render(
        <Avatar
          src="https://example.com/avatar.jpg"
          data-testid="avatar-img"
          loading="lazy"
        />
      )

      const img = screen.getByTestId('avatar-img')
      expect(img).toHaveAttribute('loading', 'lazy')
    })
  })
})

describe('AvatarGroup', () => {
  describe('rendering', () => {
    it('should render all children when under max', () => {
      render(
        <AvatarGroup>
          <Avatar alt="User 1" />
          <Avatar alt="User 2" />
          <Avatar alt="User 3" />
        </AvatarGroup>
      )

      expect(screen.getByText('U1')).toBeInTheDocument()
      expect(screen.getByText('U2')).toBeInTheDocument()
      expect(screen.getByText('U3')).toBeInTheDocument()
    })

    it('should render with custom className', () => {
      const { container } = render(
        <AvatarGroup className="custom-group">
          <Avatar />
        </AvatarGroup>
      )

      expect(container.firstChild).toHaveClass('custom-group')
    })

    it('should have flex layout', () => {
      const { container } = render(
        <AvatarGroup>
          <Avatar />
        </AvatarGroup>
      )

      expect(container.firstChild).toHaveClass('flex', 'items-center')
    })
  })

  describe('max avatars', () => {
    it('should use default max of 4', () => {
      render(
        <AvatarGroup>
          <Avatar alt="User 1" />
          <Avatar alt="User 2" />
          <Avatar alt="User 3" />
          <Avatar alt="User 4" />
          <Avatar alt="User 5" />
          <Avatar alt="User 6" />
        </AvatarGroup>
      )

      // First 4 should be visible
      expect(screen.getByText('U1')).toBeInTheDocument()
      expect(screen.getByText('U2')).toBeInTheDocument()
      expect(screen.getByText('U3')).toBeInTheDocument()
      expect(screen.getByText('U4')).toBeInTheDocument()

      // 5th and 6th should be hidden
      expect(screen.queryByText('U5')).not.toBeInTheDocument()
      expect(screen.queryByText('U6')).not.toBeInTheDocument()

      // Should show +2 indicator
      expect(screen.getByText('+2')).toBeInTheDocument()
    })

    it('should respect custom max', () => {
      render(
        <AvatarGroup max={2}>
          <Avatar alt="User 1" />
          <Avatar alt="User 2" />
          <Avatar alt="User 3" />
          <Avatar alt="User 4" />
        </AvatarGroup>
      )

      expect(screen.getByText('U1')).toBeInTheDocument()
      expect(screen.getByText('U2')).toBeInTheDocument()
      expect(screen.queryByText('U3')).not.toBeInTheDocument()
      expect(screen.getByText('+2')).toBeInTheDocument()
    })

    it('should not show +X indicator when exactly at max', () => {
      render(
        <AvatarGroup max={3}>
          <Avatar alt="User 1" />
          <Avatar alt="User 2" />
          <Avatar alt="User 3" />
        </AvatarGroup>
      )

      expect(screen.queryByText(/\+\d/)).not.toBeInTheDocument()
    })

    it('should handle single avatar', () => {
      render(
        <AvatarGroup>
          <Avatar alt="Only User" />
        </AvatarGroup>
      )

      expect(screen.getByText('OU')).toBeInTheDocument()
      expect(screen.queryByText(/\+\d/)).not.toBeInTheDocument()
    })
  })

  describe('size', () => {
    it('should use md size by default', () => {
      const { container } = render(
        <AvatarGroup>
          <Avatar alt="User 1" />
          <Avatar alt="User 2" />
        </AvatarGroup>
      )

      // Check for md overlap class on second avatar
      const overlappingDivs = container.querySelectorAll('.-ml-2\\.5')
      expect(overlappingDivs.length).toBeGreaterThan(0)
    })

    it('should apply correct overlap for sm size', () => {
      const { container } = render(
        <AvatarGroup size="sm">
          <Avatar alt="User 1" />
          <Avatar alt="User 2" />
        </AvatarGroup>
      )

      const overlappingDivs = container.querySelectorAll('.-ml-2')
      expect(overlappingDivs.length).toBeGreaterThan(0)
    })

    it('should apply correct overlap for lg size', () => {
      const { container } = render(
        <AvatarGroup size="lg">
          <Avatar alt="User 1" />
          <Avatar alt="User 2" />
        </AvatarGroup>
      )

      const overlappingDivs = container.querySelectorAll('.-ml-3')
      expect(overlappingDivs.length).toBeGreaterThan(0)
    })
  })

  describe('overflow indicator', () => {
    it('should show +1 for 5 avatars with default max', () => {
      render(
        <AvatarGroup>
          <Avatar alt="User 1" />
          <Avatar alt="User 2" />
          <Avatar alt="User 3" />
          <Avatar alt="User 4" />
          <Avatar alt="User 5" />
        </AvatarGroup>
      )

      expect(screen.getByText('+1')).toBeInTheDocument()
    })

    it('should show +10 for 14 avatars with default max', () => {
      render(
        <AvatarGroup>
          {Array.from({ length: 14 }, (_, i) => (
            <Avatar key={i} alt={`User ${i + 1}`} />
          ))}
        </AvatarGroup>
      )

      expect(screen.getByText('+10')).toBeInTheDocument()
    })
  })
})
