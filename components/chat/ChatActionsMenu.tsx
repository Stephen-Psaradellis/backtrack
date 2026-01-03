'use client'

/**
 * ChatActionsMenu Component
 *
 * An accessible dropdown/bottom sheet menu for chat actions
 */

import React, { memo, useCallback, useEffect, useRef } from 'react'
import { Ban, Flag, BellOff, Bell, Trash2, Image, X } from 'lucide-react'
import type { ChatActionsMenuProps } from '../../types/chat'
import styles from './styles/ChatScreen.module.css'

interface ExtendedChatActionsMenuProps extends ChatActionsMenuProps {
  onSharePhoto?: () => void
  onMuteNotifications?: () => void
  isMuted?: boolean
  onClearConversation?: () => void
}

interface MenuAction {
  id: string
  label: string
  icon: React.ReactNode
  onClick: () => void
  variant: 'default' | 'danger' | 'warning'
  disabled?: boolean
}

function ChatActionsMenuComponent({
  isOpen,
  onClose,
  onBlockUser,
  onReportUser,
  onSharePhoto,
  onMuteNotifications,
  isMuted = false,
  onClearConversation,
}: ExtendedChatActionsMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)

  const actions: MenuAction[] = [
    ...(onSharePhoto
      ? [{
          id: 'share-photo',
          label: 'Share Photo',
          icon: <Image size={20} aria-hidden="true" />,
          onClick: () => { onSharePhoto(); onClose(); },
          variant: 'default' as const,
        }]
      : []),
    ...(onMuteNotifications
      ? [{
          id: 'mute',
          label: isMuted ? 'Unmute notifications' : 'Mute notifications',
          icon: isMuted ? <Bell size={20} aria-hidden="true" /> : <BellOff size={20} aria-hidden="true" />,
          onClick: () => { onMuteNotifications(); onClose(); },
          variant: 'default' as const,
        }]
      : []),
    ...(onClearConversation
      ? [{
          id: 'clear',
          label: 'Clear conversation',
          icon: <Trash2 size={20} aria-hidden="true" />,
          onClick: () => { onClearConversation(); onClose(); },
          variant: 'default' as const,
        }]
      : []),
    {
      id: 'report',
      label: 'Report user',
      icon: <Flag size={20} aria-hidden="true" />,
      onClick: () => { onReportUser(); onClose(); },
      variant: 'warning' as const,
    },
    {
      id: 'block',
      label: 'Block user',
      icon: <Ban size={20} aria-hidden="true" />,
      onClick: () => { onBlockUser(); onClose(); },
      variant: 'danger' as const,
    },
  ]

  useEffect(() => {
    if (!isOpen) return
    closeButtonRef.current?.focus()

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose()
        return
      }
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

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    }
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  const handleOverlayClick = useCallback(
    (event: React.MouseEvent) => {
      if (event.target === event.currentTarget) onClose()
    },
    [onClose]
  )

  const getActionClass = (variant: MenuAction['variant']): string => {
    switch (variant) {
      case 'danger': return `${styles.menuItem} ${styles.menuItemDanger}`
      case 'warning': return `${styles.menuItem} ${styles.menuItemWarning}`
      default: return `${styles.menuItem} ${styles.menuItemDefault}`
    }
  }

  if (!isOpen) return null

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
        <div className={styles.actionsMenuHeader}>
          <h3 id="actions-menu-title" className={styles.actionsMenuTitle}>Chat Actions</h3>
          <button
            ref={closeButtonRef}
            className={styles.closeButton}
            onClick={onClose}
            aria-label="Close menu"
            type="button"
          >
            <X size={24} aria-hidden="true" />
          </button>
        </div>

        <div className={styles.dragHandle} aria-hidden="true">
          <div className={styles.dragIndicator} />
        </div>

        <div className={styles.menuItems}>
          {actions.map((action, index) => (
            <React.Fragment key={action.id}>
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

export const ChatActionsMenu = memo(ChatActionsMenuComponent)
