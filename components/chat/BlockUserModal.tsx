'use client'

/**
 * BlockUserModal Component
 *
 * A confirmation modal for blocking a user with:
 * - Clear explanation of what blocking does
 * - Consequences list explaining the effects
 * - Confirm and cancel buttons
 * - Loading state during API call
 * - Error handling with retry option
 *
 * This component is designed to be controlled by its parent via props
 * and does not manage its own visibility state.
 *
 * @example
 * ```tsx
 * const { isBlocking, error, blockUser, clearError } = useBlockUser({...})
 *
 * <BlockUserModal
 *   isOpen={isBlockModalOpen}
 *   username="John"
 *   isLoading={isBlocking}
 *   error={error}
 *   onConfirm={blockUser}
 *   onCancel={() => { setIsBlockModalOpen(false); clearError() }}
 * />
 * ```
 */

import React, { memo, useCallback, useEffect, useRef } from 'react'
import type { BlockUserModalProps } from '../../types/chat'
import styles from './styles/ChatScreen.module.css'

/**
 * Block icon for the modal header
 */
function BlockIcon() {
  return (
    <svg
      width="24"
      height="24"
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
 * The consequences of blocking a user
 */
const BLOCK_CONSEQUENCES = [
  "They won't be able to send you messages",
  "You won't see their posts",
  "They won't be notified that you blocked them",
  "You can unblock them later in settings",
] as const

/**
 * BlockUserModal displays a confirmation dialog for blocking a user
 *
 * @param isOpen - Whether the modal is visible
 * @param username - The name of the user being blocked
 * @param isLoading - Whether the block operation is in progress
 * @param error - Error message if blocking failed
 * @param onConfirm - Callback when user confirms the block action
 * @param onCancel - Callback when user cancels (closes modal)
 */
function BlockUserModalComponent({
  isOpen,
  username,
  isLoading,
  error,
  onConfirm,
  onCancel,
}: BlockUserModalProps) {
  const modalRef = useRef<HTMLDivElement>(null)
  const cancelButtonRef = useRef<HTMLButtonElement>(null)

  // Focus trap and escape key handling
  useEffect(() => {
    if (!isOpen) return

    // Focus the cancel button when modal opens
    cancelButtonRef.current?.focus()

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !isLoading) {
        onCancel()
      }

      // Trap focus within modal
      if (event.key === 'Tab') {
        const focusableElements = modalRef.current?.querySelectorAll(
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
  }, [isOpen, isLoading, onCancel])

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  // Handle overlay click (close when clicking outside modal)
  const handleOverlayClick = useCallback(
    (event: React.MouseEvent) => {
      if (event.target === event.currentTarget && !isLoading) {
        onCancel()
      }
    },
    [isLoading, onCancel]
  )

  // Don't render if not open
  if (!isOpen) {
    return null
  }

  const confirmButtonClass = `${styles.modalConfirmButton} ${isLoading ? styles.modalConfirmButtonLoading : ''}`

  return (
    <div
      className={styles.modalOverlay}
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="block-modal-title"
      aria-describedby="block-modal-description"
    >
      <div ref={modalRef} className={styles.modal}>
        {/* Header with icon */}
        <div className={styles.modalHeader}>
          <div className={`${styles.iconContainer} ${styles.iconContainerDanger}`}>
            <BlockIcon />
          </div>
          <h2 id="block-modal-title" className={styles.modalTitle}>
            Block User
          </h2>
        </div>

        {/* Confirmation text */}
        <p id="block-modal-description" className={styles.modalText}>
          Are you sure you want to block{' '}
          <span className={styles.usernameHighlight}>{username || 'this user'}</span>?
        </p>

        {/* Consequences list */}
        <p className={styles.modalDescription}>When you block someone:</p>
        <ul className={styles.modalList}>
          {BLOCK_CONSEQUENCES.map((consequence, index) => (
            <li key={index} className={styles.listItem}>
              {consequence}
            </li>
          ))}
        </ul>

        {/* Error message */}
        {error && (
          <div className={styles.modalError} role="alert">
            <span className={styles.errorIconBadge} aria-hidden="true">!</span>
            <span>{error}</span>
          </div>
        )}

        {/* Action buttons */}
        <div className={styles.modalActions}>
          <button
            ref={cancelButtonRef}
            className={styles.modalCancelButton}
            onClick={onCancel}
            disabled={isLoading}
            type="button"
          >
            Cancel
          </button>
          <button
            className={confirmButtonClass}
            onClick={onConfirm}
            disabled={isLoading}
            type="button"
          >
            {isLoading ? (
              <>
                <span className={styles.spinnerSmall} aria-hidden="true" />
                Blocking...
              </>
            ) : (
              'Block User'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

/**
 * Memoized BlockUserModal for performance optimization
 * Only re-renders when props change
 */
export const BlockUserModal = memo(BlockUserModalComponent)
