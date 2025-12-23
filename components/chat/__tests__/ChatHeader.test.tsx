/**
 * ChatHeader Component Tests
 *
 * Tests for the ChatHeader component including:
 * - Rendering with various props
 * - User info display (username, avatar)
 * - Online status indicator
 * - Back button functionality
 * - Actions menu trigger
 * - Accessibility requirements
 */

import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { ChatHeader } from '../ChatHeader'

// Mock CSS module
jest.mock('../styles/ChatScreen.module.css', () => ({
  header: 'header',
  backButton: 'backButton',
  headerUserInfo: 'headerUserInfo',
  avatarContainer: 'avatarContainer',
  avatar: 'avatar',
  onlineIndicator: 'onlineIndicator',
  userDetails: 'userDetails',
  username: 'username',
  actionsButton: 'actionsButton',
}))

// Mock UserPresenceIndicator component
jest.mock('../UserPresenceIndicator', () => ({
  UserPresenceIndicator: jest.fn(({ isOnline, lastSeen }) => (
    <div data-testid="presence-indicator" data-is-online={isOnline} data-last-seen={lastSeen}>
      {isOnline ? 'Online' : 'Offline'}
    </div>
  )),
}))

const defaultProps = {
  username: 'TestUser',
  avatarLetter: 'T',
  isOnline: false,
  lastSeen: '2024-01-15T10:00:00Z',
  onBack: jest.fn(),
  onActionsClick: jest.fn(),
}

describe('ChatHeader', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Basic Rendering', () => {
    it('should render as a header element', () => {
      render(<ChatHeader {...defaultProps} />)

      expect(screen.getByRole('banner')).toBeInTheDocument()
    })

    it('should render username', () => {
      render(<ChatHeader {...defaultProps} />)

      expect(screen.getByRole('heading', { name: 'TestUser' })).toBeInTheDocument()
    })

    it('should render avatar letter', () => {
      const { container } = render(<ChatHeader {...defaultProps} />)

      const avatar = container.querySelector('.avatar')
      expect(avatar).toHaveTextContent('T')
    })

    it('should render back button', () => {
      render(<ChatHeader {...defaultProps} />)

      expect(screen.getByRole('button', { name: 'Go back to conversations' })).toBeInTheDocument()
    })

    it('should render actions button', () => {
      render(<ChatHeader {...defaultProps} />)

      expect(screen.getByRole('button', { name: 'Open chat actions menu' })).toBeInTheDocument()
    })
  })

  describe('User Avatar', () => {
    it('should display avatar letter from props', () => {
      const { container } = render(<ChatHeader {...defaultProps} avatarLetter="J" />)

      const avatar = container.querySelector('.avatar')
      expect(avatar).toHaveTextContent('J')
    })

    it('should fallback to first letter of username when avatarLetter not provided', () => {
      const { container } = render(
        <ChatHeader {...defaultProps} username="Sarah" avatarLetter={undefined} />
      )

      const avatar = container.querySelector('.avatar')
      expect(avatar).toHaveTextContent('S')
    })

    it('should display ? when no username or avatarLetter', () => {
      const { container } = render(
        <ChatHeader {...defaultProps} username={undefined} avatarLetter={undefined} />
      )

      const avatar = container.querySelector('.avatar')
      expect(avatar).toHaveTextContent('?')
    })

    it('should have aria-hidden on avatar', () => {
      const { container } = render(<ChatHeader {...defaultProps} />)

      const avatar = container.querySelector('.avatar')
      expect(avatar).toHaveAttribute('aria-hidden', 'true')
    })
  })

  describe('Online Status Indicator', () => {
    it('should show online indicator when user is online', () => {
      const { container } = render(<ChatHeader {...defaultProps} isOnline={true} />)

      expect(container.querySelector('.onlineIndicator')).toBeInTheDocument()
    })

    it('should not show online indicator when user is offline', () => {
      const { container } = render(<ChatHeader {...defaultProps} isOnline={false} />)

      expect(container.querySelector('.onlineIndicator')).not.toBeInTheDocument()
    })

    it('should have title="Online" on indicator', () => {
      const { container } = render(<ChatHeader {...defaultProps} isOnline={true} />)

      const indicator = container.querySelector('.onlineIndicator')
      expect(indicator).toHaveAttribute('title', 'Online')
    })

    it('should have aria-hidden on online indicator', () => {
      const { container } = render(<ChatHeader {...defaultProps} isOnline={true} />)

      const indicator = container.querySelector('.onlineIndicator')
      expect(indicator).toHaveAttribute('aria-hidden', 'true')
    })
  })

  describe('Presence Indicator', () => {
    it('should render UserPresenceIndicator with correct props', () => {
      const { UserPresenceIndicator } = require('../UserPresenceIndicator')

      render(<ChatHeader {...defaultProps} isOnline={true} lastSeen="2024-01-15T12:00:00Z" />)

      expect(UserPresenceIndicator).toHaveBeenCalledWith(
        expect.objectContaining({
          isOnline: true,
          lastSeen: '2024-01-15T12:00:00Z',
        }),
        expect.anything()
      )
    })

    it('should pass isOnline=false when offline', () => {
      const { UserPresenceIndicator } = require('../UserPresenceIndicator')

      render(<ChatHeader {...defaultProps} isOnline={false} />)

      expect(UserPresenceIndicator).toHaveBeenCalledWith(
        expect.objectContaining({
          isOnline: false,
        }),
        expect.anything()
      )
    })
  })

  describe('Username Display', () => {
    it('should render username in h1', () => {
      render(<ChatHeader {...defaultProps} username="JohnDoe" />)

      const heading = screen.getByRole('heading', { level: 1 })
      expect(heading).toHaveTextContent('JohnDoe')
    })

    it('should display "Unknown User" when username is undefined', () => {
      render(<ChatHeader {...defaultProps} username={undefined} />)

      expect(screen.getByRole('heading')).toHaveTextContent('Unknown User')
    })

    it('should display "Unknown User" when username is empty string', () => {
      render(<ChatHeader {...defaultProps} username="" />)

      expect(screen.getByRole('heading')).toHaveTextContent('Unknown User')
    })
  })

  describe('Back Button', () => {
    it('should call onBack when clicked', () => {
      const onBack = jest.fn()
      render(<ChatHeader {...defaultProps} onBack={onBack} />)

      fireEvent.click(screen.getByRole('button', { name: 'Go back to conversations' }))

      expect(onBack).toHaveBeenCalledTimes(1)
    })

    it('should have type="button"', () => {
      render(<ChatHeader {...defaultProps} />)

      expect(screen.getByRole('button', { name: 'Go back to conversations' })).toHaveAttribute(
        'type',
        'button'
      )
    })
  })

  describe('Actions Button', () => {
    it('should call onActionsClick when clicked', () => {
      const onActionsClick = jest.fn()
      render(<ChatHeader {...defaultProps} onActionsClick={onActionsClick} />)

      fireEvent.click(screen.getByRole('button', { name: 'Open chat actions menu' }))

      expect(onActionsClick).toHaveBeenCalledTimes(1)
    })

    it('should have aria-haspopup="true"', () => {
      render(<ChatHeader {...defaultProps} />)

      expect(screen.getByRole('button', { name: 'Open chat actions menu' })).toHaveAttribute(
        'aria-haspopup',
        'true'
      )
    })

    it('should have type="button"', () => {
      render(<ChatHeader {...defaultProps} />)

      expect(screen.getByRole('button', { name: 'Open chat actions menu' })).toHaveAttribute(
        'type',
        'button'
      )
    })
  })

  describe('Accessibility', () => {
    it('should use semantic header element', () => {
      const { container } = render(<ChatHeader {...defaultProps} />)

      expect(container.querySelector('header')).toBeInTheDocument()
    })

    it('should have accessible back button', () => {
      render(<ChatHeader {...defaultProps} />)

      const backButton = screen.getByRole('button', { name: 'Go back to conversations' })
      expect(backButton).toHaveAttribute('aria-label', 'Go back to conversations')
    })

    it('should have accessible actions button', () => {
      render(<ChatHeader {...defaultProps} />)

      const actionsButton = screen.getByRole('button', { name: 'Open chat actions menu' })
      expect(actionsButton).toHaveAttribute('aria-label', 'Open chat actions menu')
    })

    it('should have heading for username', () => {
      render(<ChatHeader {...defaultProps} />)

      expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument()
    })
  })

  describe('Edge Cases', () => {
    it('should handle very long username', () => {
      const longUsername = 'A'.repeat(100)
      render(<ChatHeader {...defaultProps} username={longUsername} />)

      expect(screen.getByRole('heading')).toHaveTextContent(longUsername)
    })

    it('should handle null lastSeen', () => {
      render(<ChatHeader {...defaultProps} lastSeen={null} />)

      expect(screen.getByTestId('presence-indicator')).toHaveAttribute('data-last-seen', '')
    })

    it('should handle special characters in username', () => {
      render(<ChatHeader {...defaultProps} username="User_123-Test" />)

      expect(screen.getByRole('heading')).toHaveTextContent('User_123-Test')
    })

    it('should uppercase avatar letter', () => {
      const { container } = render(<ChatHeader {...defaultProps} username="lowercase" avatarLetter={undefined} />)

      const avatar = container.querySelector('.avatar')
      expect(avatar).toHaveTextContent('L')
    })
  })
})
