/**
 * ChatActionsMenu Component Tests
 *
 * Tests for the ChatActionsMenu component including:
 * - Rendering when open/closed
 * - Menu action items display
 * - Action callbacks (block, report, mute, clear)
 * - Keyboard handling (Escape to close)
 * - Backdrop click to close
 * - Focus trap
 * - Accessibility requirements
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ChatActionsMenu } from '../ChatActionsMenu'

// Mock CSS module
jest.mock('../styles/ChatScreen.module.css', () => ({
  actionsMenuOverlay: 'actionsMenuOverlay',
  actionsMenu: 'actionsMenu',
  actionsMenuHeader: 'actionsMenuHeader',
  actionsMenuTitle: 'actionsMenuTitle',
  closeButton: 'closeButton',
  dragHandle: 'dragHandle',
  dragIndicator: 'dragIndicator',
  menuItems: 'menuItems',
  menuItem: 'menuItem',
  menuItemDefault: 'menuItemDefault',
  menuItemDanger: 'menuItemDanger',
  menuItemWarning: 'menuItemWarning',
  menuItemIcon: 'menuItemIcon',
  menuItemLabel: 'menuItemLabel',
  separator: 'separator',
  actionsMenuFooter: 'actionsMenuFooter',
  cancelButton: 'cancelButton',
}))

const defaultProps = {
  isOpen: true,
  onClose: jest.fn(),
  onBlockUser: jest.fn(),
  onReportUser: jest.fn(),
}

describe('ChatActionsMenu', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    document.body.style.overflow = ''
  })

  describe('Visibility', () => {
    it('should render when isOpen is true', () => {
      render(<ChatActionsMenu {...defaultProps} isOpen={true} />)

      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    it('should not render when isOpen is false', () => {
      render(<ChatActionsMenu {...defaultProps} isOpen={false} />)

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    it('should return null when isOpen is false', () => {
      const { container } = render(<ChatActionsMenu {...defaultProps} isOpen={false} />)

      expect(container.firstChild).toBeNull()
    })
  })

  describe('Content Display', () => {
    it('should display menu title', () => {
      render(<ChatActionsMenu {...defaultProps} />)

      expect(screen.getByText('Chat Actions')).toBeInTheDocument()
    })

    it('should display block user option', () => {
      render(<ChatActionsMenu {...defaultProps} />)

      expect(screen.getByRole('menuitem', { name: /block user/i })).toBeInTheDocument()
    })

    it('should display report user option', () => {
      render(<ChatActionsMenu {...defaultProps} />)

      expect(screen.getByRole('menuitem', { name: /report user/i })).toBeInTheDocument()
    })

    it('should display cancel button', () => {
      render(<ChatActionsMenu {...defaultProps} />)

      expect(screen.getByRole('menuitem', { name: 'Cancel' })).toBeInTheDocument()
    })

    it('should display close button in header', () => {
      render(<ChatActionsMenu {...defaultProps} />)

      expect(screen.getByRole('button', { name: 'Close menu' })).toBeInTheDocument()
    })

    it('should display drag handle for mobile', () => {
      const { container } = render(<ChatActionsMenu {...defaultProps} />)

      expect(container.querySelector('.dragHandle')).toBeInTheDocument()
    })
  })

  describe('Menu Item Styling', () => {
    it('should apply danger class to block user item', () => {
      const { container } = render(<ChatActionsMenu {...defaultProps} />)

      const blockButton = screen.getByRole('menuitem', { name: /block user/i })
      expect(blockButton).toHaveClass('menuItemDanger')
    })

    it('should apply warning class to report user item', () => {
      const { container } = render(<ChatActionsMenu {...defaultProps} />)

      const reportButton = screen.getByRole('menuitem', { name: /report user/i })
      expect(reportButton).toHaveClass('menuItemWarning')
    })
  })

  describe('Action Callbacks', () => {
    it('should call onBlockUser and onClose when block user is clicked', () => {
      const onBlockUser = jest.fn()
      const onClose = jest.fn()
      render(
        <ChatActionsMenu {...defaultProps} onBlockUser={onBlockUser} onClose={onClose} />
      )

      fireEvent.click(screen.getByRole('menuitem', { name: /block user/i }))

      expect(onBlockUser).toHaveBeenCalledTimes(1)
      expect(onClose).toHaveBeenCalledTimes(1)
    })

    it('should call onReportUser and onClose when report user is clicked', () => {
      const onReportUser = jest.fn()
      const onClose = jest.fn()
      render(
        <ChatActionsMenu {...defaultProps} onReportUser={onReportUser} onClose={onClose} />
      )

      fireEvent.click(screen.getByRole('menuitem', { name: /report user/i }))

      expect(onReportUser).toHaveBeenCalledTimes(1)
      expect(onClose).toHaveBeenCalledTimes(1)
    })

    it('should call onClose when cancel button is clicked', () => {
      const onClose = jest.fn()
      render(<ChatActionsMenu {...defaultProps} onClose={onClose} />)

      fireEvent.click(screen.getByRole('menuitem', { name: 'Cancel' }))

      expect(onClose).toHaveBeenCalledTimes(1)
    })

    it('should call onClose when close button is clicked', () => {
      const onClose = jest.fn()
      render(<ChatActionsMenu {...defaultProps} onClose={onClose} />)

      fireEvent.click(screen.getByRole('button', { name: 'Close menu' }))

      expect(onClose).toHaveBeenCalledTimes(1)
    })
  })

  describe('Optional Actions', () => {
    it('should show mute notifications when onMuteNotifications is provided', () => {
      render(
        <ChatActionsMenu
          {...defaultProps}
          onMuteNotifications={jest.fn()}
        />
      )

      expect(screen.getByRole('menuitem', { name: /mute notifications/i })).toBeInTheDocument()
    })

    it('should not show mute notifications when onMuteNotifications is not provided', () => {
      render(<ChatActionsMenu {...defaultProps} />)

      expect(screen.queryByRole('menuitem', { name: /mute notifications/i })).not.toBeInTheDocument()
    })

    it('should show "Unmute notifications" when isMuted is true', () => {
      render(
        <ChatActionsMenu
          {...defaultProps}
          onMuteNotifications={jest.fn()}
          isMuted={true}
        />
      )

      expect(screen.getByRole('menuitem', { name: /unmute notifications/i })).toBeInTheDocument()
    })

    it('should call onMuteNotifications and onClose when mute is clicked', () => {
      const onMuteNotifications = jest.fn()
      const onClose = jest.fn()
      render(
        <ChatActionsMenu
          {...defaultProps}
          onMuteNotifications={onMuteNotifications}
          onClose={onClose}
        />
      )

      fireEvent.click(screen.getByRole('menuitem', { name: /mute notifications/i }))

      expect(onMuteNotifications).toHaveBeenCalledTimes(1)
      expect(onClose).toHaveBeenCalledTimes(1)
    })

    it('should show clear conversation when onClearConversation is provided', () => {
      render(
        <ChatActionsMenu
          {...defaultProps}
          onClearConversation={jest.fn()}
        />
      )

      expect(screen.getByRole('menuitem', { name: /clear conversation/i })).toBeInTheDocument()
    })

    it('should not show clear conversation when onClearConversation is not provided', () => {
      render(<ChatActionsMenu {...defaultProps} />)

      expect(screen.queryByRole('menuitem', { name: /clear conversation/i })).not.toBeInTheDocument()
    })

    it('should call onClearConversation and onClose when clear is clicked', () => {
      const onClearConversation = jest.fn()
      const onClose = jest.fn()
      render(
        <ChatActionsMenu
          {...defaultProps}
          onClearConversation={onClearConversation}
          onClose={onClose}
        />
      )

      fireEvent.click(screen.getByRole('menuitem', { name: /clear conversation/i }))

      expect(onClearConversation).toHaveBeenCalledTimes(1)
      expect(onClose).toHaveBeenCalledTimes(1)
    })
  })

  describe('Separator', () => {
    it('should render separator between default and danger/warning actions', () => {
      const { container } = render(
        <ChatActionsMenu
          {...defaultProps}
          onMuteNotifications={jest.fn()}
        />
      )

      expect(container.querySelector('.separator')).toBeInTheDocument()
    })

    it('should have role="separator" on separator element', () => {
      render(
        <ChatActionsMenu
          {...defaultProps}
          onMuteNotifications={jest.fn()}
        />
      )

      expect(screen.getByRole('separator')).toBeInTheDocument()
    })
  })

  describe('Keyboard Handling', () => {
    it('should call onClose when Escape is pressed', () => {
      const onClose = jest.fn()
      render(<ChatActionsMenu {...defaultProps} onClose={onClose} />)

      fireEvent.keyDown(document, { key: 'Escape' })

      expect(onClose).toHaveBeenCalledTimes(1)
    })
  })

  describe('Backdrop Click', () => {
    it('should call onClose when clicking on overlay', () => {
      const onClose = jest.fn()
      render(<ChatActionsMenu {...defaultProps} onClose={onClose} />)

      // Get the overlay (parent of dialog)
      const overlay = screen.getByRole('dialog').parentElement
      fireEvent.click(overlay!)

      expect(onClose).toHaveBeenCalledTimes(1)
    })

    it('should not call onClose when clicking inside menu', () => {
      const onClose = jest.fn()
      render(<ChatActionsMenu {...defaultProps} onClose={onClose} />)

      fireEvent.click(screen.getByText('Chat Actions'))

      expect(onClose).not.toHaveBeenCalled()
    })
  })

  describe('Body Scroll Prevention', () => {
    it('should set body overflow to hidden when open', () => {
      render(<ChatActionsMenu {...defaultProps} isOpen={true} />)

      expect(document.body.style.overflow).toBe('hidden')
    })

    it('should reset body overflow when closed', () => {
      const { rerender } = render(<ChatActionsMenu {...defaultProps} isOpen={true} />)

      rerender(<ChatActionsMenu {...defaultProps} isOpen={false} />)

      expect(document.body.style.overflow).toBe('')
    })
  })

  describe('Accessibility', () => {
    it('should have role="dialog" on overlay', () => {
      render(<ChatActionsMenu {...defaultProps} />)

      expect(screen.getByRole('dialog').parentElement).toHaveAttribute('role', 'dialog')
    })

    it('should have aria-modal="true"', () => {
      render(<ChatActionsMenu {...defaultProps} />)

      expect(screen.getByRole('dialog').parentElement).toHaveAttribute('aria-modal', 'true')
    })

    it('should have aria-labelledby pointing to title', () => {
      render(<ChatActionsMenu {...defaultProps} />)

      const overlay = screen.getByRole('dialog').parentElement
      expect(overlay).toHaveAttribute('aria-labelledby', 'actions-menu-title')

      const title = document.getElementById('actions-menu-title')
      expect(title).toHaveTextContent('Chat Actions')
    })

    it('should have role="menu" on menu container', () => {
      render(<ChatActionsMenu {...defaultProps} />)

      expect(screen.getByRole('menu')).toBeInTheDocument()
    })

    it('should have aria-orientation="vertical" on menu', () => {
      render(<ChatActionsMenu {...defaultProps} />)

      expect(screen.getByRole('menu')).toHaveAttribute('aria-orientation', 'vertical')
    })

    it('should have role="menuitem" on all action buttons', () => {
      render(
        <ChatActionsMenu
          {...defaultProps}
          onMuteNotifications={jest.fn()}
          onClearConversation={jest.fn()}
        />
      )

      const menuItems = screen.getAllByRole('menuitem')
      // mute + clear + report + block + cancel = 5
      expect(menuItems).toHaveLength(5)
    })

    it('should have type="button" on all buttons', () => {
      render(<ChatActionsMenu {...defaultProps} />)

      const buttons = screen.getAllByRole('button')
      buttons.forEach((button) => {
        expect(button).toHaveAttribute('type', 'button')
      })
    })

    it('should have aria-label on close button', () => {
      render(<ChatActionsMenu {...defaultProps} />)

      expect(screen.getByRole('button', { name: 'Close menu' })).toHaveAttribute(
        'aria-label',
        'Close menu'
      )
    })

    it('should have aria-hidden on drag handle', () => {
      const { container } = render(<ChatActionsMenu {...defaultProps} />)

      expect(container.querySelector('.dragHandle')).toHaveAttribute('aria-hidden', 'true')
    })

    it('should have aria-hidden on separator', () => {
      render(
        <ChatActionsMenu
          {...defaultProps}
          onMuteNotifications={jest.fn()}
        />
      )

      expect(screen.getByRole('separator')).toHaveAttribute('aria-hidden', 'true')
    })
  })

  describe('Focus Management', () => {
    it('should focus close button when menu opens', async () => {
      render(<ChatActionsMenu {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Close menu' })).toHaveFocus()
      })
    })
  })

  describe('Menu Item Order', () => {
    it('should show default actions before danger/warning actions', () => {
      const { container } = render(
        <ChatActionsMenu
          {...defaultProps}
          onMuteNotifications={jest.fn()}
          onClearConversation={jest.fn()}
        />
      )

      const menuItems = container.querySelectorAll('[role="menuitem"]')
      const labels = Array.from(menuItems).map((item) => item.textContent)

      // Default actions (mute, clear) should come before warning/danger (report, block)
      const muteIndex = labels.findIndex((l) => l?.includes('Mute'))
      const clearIndex = labels.findIndex((l) => l?.includes('Clear'))
      const reportIndex = labels.findIndex((l) => l?.includes('Report'))
      const blockIndex = labels.findIndex((l) => l?.includes('Block'))

      expect(muteIndex).toBeLessThan(reportIndex)
      expect(clearIndex).toBeLessThan(reportIndex)
      expect(reportIndex).toBeLessThan(blockIndex)
    })
  })

  describe('Edge Cases', () => {
    it('should handle rapid open/close', () => {
      const { rerender } = render(<ChatActionsMenu {...defaultProps} isOpen={true} />)

      rerender(<ChatActionsMenu {...defaultProps} isOpen={false} />)
      rerender(<ChatActionsMenu {...defaultProps} isOpen={true} />)
      rerender(<ChatActionsMenu {...defaultProps} isOpen={false} />)

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      expect(document.body.style.overflow).toBe('')
    })

    it('should handle multiple callback invocations', () => {
      const onBlockUser = jest.fn()
      const onClose = jest.fn()
      const { rerender } = render(
        <ChatActionsMenu {...defaultProps} onBlockUser={onBlockUser} onClose={onClose} />
      )

      fireEvent.click(screen.getByRole('menuitem', { name: /block user/i }))

      // Rerender to simulate modal reopening
      rerender(
        <ChatActionsMenu
          {...defaultProps}
          isOpen={true}
          onBlockUser={onBlockUser}
          onClose={onClose}
        />
      )

      fireEvent.click(screen.getByRole('menuitem', { name: /block user/i }))

      expect(onBlockUser).toHaveBeenCalledTimes(2)
      expect(onClose).toHaveBeenCalledTimes(2)
    })
  })
})
