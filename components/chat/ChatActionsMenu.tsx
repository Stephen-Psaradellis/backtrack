'use client'

/**
 * ChatActionsMenu Component
 *
 * An accessible dropdown/bottom sheet menu for chat actions:
 * - Block user option
 * - Report user option
 * - Mute notifications option (optional)
 * - Clear conversation option (optional)
 *
 * Designed as a mobile-friendly bottom sheet that slides up from the bottom
 * on smaller screens and as a dropdown on larger screens.
 * Triggers appropriate modals/actions on selection.
 *
 * This component is designed to be controlled by its parent via props
 * and does not manage its own visibility state.
 *
 * @example
 * ```tsx
 * <ChatActionsMenu
 *   isOpen={isActionsMenuOpen}
 *   onClose={() => setIsActionsMenuOpen(false)}
 *   onBlockUser={() => {
 *     setIsActionsMenuOpen(false)
 *     setIsBlockModalOpen(true)
 *   }}
 *   onReportUser={() => {
 *     setIsActionsMenuOpen(false)
 *     setIsReportModalOpen(true)
 *   }}
 * />
 * ```
 */

import React, { memo, useCallback, useEffect, useRef } from 'react'
import type { ChatActionsMenuProps } from '../../types/chat'
import styles from './styles/ChatScreen.module.css'

/**
 * Extended props for ChatActionsMenu with optional actions
 */
interface ExtendedChatActionsMenuProps extends ChatActionsMenuProps {
  /** Callback when mute notifications is clicked */
  onMuteNotifications?: () => void
  /** Whether notifications are currently muted */
  isMuted?: boolean
  /** Callback when clear conversation is clicked */
  onClearConversation?: () => void
}

/**
 * Block icon for the menu item
 */
function BlockIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
    </svg>
  )
}

/**
 * Report flag icon for the menu item
 */
function ReportIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
      <line x1="4" y1="22" x2="4" y2="15" />
    </svg>
  )
}

/**
 * Bell icon for mute notifications
 */
function MuteIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  )
}

/**
 * Unmute bell icon
 */
function UnmuteIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  )
}

/**
 * Trash icon for clear conversation
 */
function ClearIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  )
}

/**
 * Close X icon for the sheet
 */
function CloseIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

/**
 * Menu action item definition
 */
interface MenuAction {
  id: string
  label: string
  icon: React.ReactNode
  onClick: () => void
  variant: 'default' | 'danger' | 'warning'
  disabled?: boolean
}

/**
 * ChatActionsMenu displays a bottom sheet menu for chat actions
 *
 * @param isOpen - Whether the menu is visible
 * @param onClose - Callback when menu is closed
 * @param onBlockUser - Callback to open block user modal
 * @param onReportUser - Callback to open report user modal
 * @param onMuteNotifications - Optional callback to toggle notification mute
 * @param isMuted - Whether notifications are currently muted
 * @param onClearConversation - Optional callback to clear conversation
 */
function ChatActionsMenuComponent({
  isOpen,
  onClose,
  onBlockUser,
  onReportUser,
  onMuteNotifications,
  isMuted = false,
  onClearConversation,
}: ExtendedChatActionsMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)

  // Build menu actions list
  const actions: MenuAction[] = [
    // Mute notifications (if handler provided)
    ...(onMuteNotifications
      ? [
          {
            id: 'mute',
            label: isMuted ? 'Unmute notifications' : 'Mute notifications',
            icon: isMuted ? <UnmuteIcon /> : <MuteIcon />,
            onClick: () => {
              onMuteNotifications()
              onClose()
            },
            variant: 'default' as const,
          },
        ]
      : []),
    // Clear conversation (if handler provided)
    ...(onClearConversation
      ? [
          {
            id: 'clear',
            label: 'Clear conversation',
            icon: <ClearIcon />,
            onClick: () => {
              onClearConversation()
              onClose()
            },
            variant: 'default' as const,
          },
        ]
      : []),
    // Report user
    {
      id: 'report',
      label: 'Report user',
      icon: <ReportIcon />,
      onClick: () => {
        onReportUser()
        onClose()
      },
      variant: 'warning' as const,
    },
    // Block user
    {
      id: 'block',
      label: 'Block user',
      icon: <BlockIcon />,
      onClick: () => {
        onBlockUser()
        onClose()
      },
      variant: 'danger' as const,
    },
  ]

  // Focus trap and escape key handling
  useEffect(() => {
    if (!isOpen) return

    // Focus the close button when menu opens
    closeButtonRef.current?.focus()

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose()
        return
      }

      // Trap focus within menu
      if (event.key === 'Tab') {
        const focusableElements = menuRef.current?.querySelectorAll(
          'button:not(:disabled), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
        if (!focusableElements?.length) return

        const firstElement = focusableElements[0] as HTMLElement
        const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement

        if (event.shiftKey) {
          if (document.activeElement === firstElement) {
            event.preventDefault()
            lastElement.focus()
          }
        } else {
          if (document.activeElement === lastElement) {
            event.preventDefault()
            firstElement.focus()
          }
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  // Prevent body scroll when menu is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  // Handle overlay click (close when clicking outside menu)
  const handleOverlayClick = useCallback(
    (event: React.MouseEvent) => {
      if (event.target === event.currentTarget) {
        onClose()
      }
    },
    [onClose]
  )

  // Get class for action variant
  const getActionClass = (variant: MenuAction['variant']): string => {
    switch (variant) {
      case 'danger':
        return `${styles.menuItem} ${styles.menuItemDanger}`
      case 'warning':
        return `${styles.menuItem} ${styles.menuItemWarning}`
      default:
        return `${styles.menuItem} ${styles.menuItemDefault}`
    }
  }

  // Don't render if not open
  if (!isOpen) {
    return null
  }

  return (
    <div
      className={styles.actionsMenuOverlay}
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="actions-menu-title"
    >
      <div
        ref={menuRef}
        className={styles.actionsMenu}
        role="menu"
        aria-orientation="vertical"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with close button */}
        <div className={styles.actionsMenuHeader}>
          <h3 id="actions-menu-title" className={styles.actionsMenuTitle}>
            Chat Actions
          </h3>
          <button
            ref={closeButtonRef}
            className={styles.closeButton}
            onClick={onClose}
            aria-label="Close menu"
            type="button"
          >
            <CloseIcon />
          </button>
        </div>

        {/* Drag handle indicator (for mobile bottom sheet) */}
        <div className={styles.dragHandle} aria-hidden="true">
          <div className={styles.dragIndicator} />
        </div>

        {/* Menu Items */}
        <div className={styles.menuItems}>
          {actions.map((action, index) => (
            <React.Fragment key={action.id}>
              {/* Add separator before danger/warning items */}
              {index > 0 && actions[index - 1].variant === 'default' && action.variant !== 'default' && (
                <div className={styles.separator} role="separator" aria-hidden="true" />
              )}
              <button
                className={getActionClass(action.variant)}
                onClick={action.onClick}
                disabled={action.disabled}
                role="menuitem"
                type="button"
              >
                <span className={styles.menuItemIcon}>{action.icon}</span>
                <span className={styles.menuItemLabel}>{action.label}</span>
              </button>
            </React.Fragment>
          ))}
        </div>

        {/* Cancel Button */}
        <div className={styles.actionsMenuFooter}>
          <button
            className={styles.cancelButton}
            onClick={onClose}
            role="menuitem"
            type="button"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

/**
 * Memoized ChatActionsMenu for performance optimization
 * Only re-renders when props change
 */
export const ChatActionsMenu = memo(ChatActionsMenuComponent)
