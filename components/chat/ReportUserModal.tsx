'use client'

/**
 * ReportUserModal Component
 *
 * A modal for reporting a user with:
 * - Predefined report reason options (radio button selection)
 * - Optional additional details text field
 * - Form validation before submission
 * - Loading, success, and error states
 * - Closes and returns to chat on success
 *
 * This component is designed to be controlled by its parent via props
 * and does not manage its own visibility state.
 *
 * @example
 * ```tsx
 * const { isReporting, error, reportUser, clearError } = useReportUser({...})
 * const [selectedReason, setSelectedReason] = useState<ReportReason | null>(null)
 * const [details, setDetails] = useState('')
 *
 * <ReportUserModal
 *   isOpen={isReportModalOpen}
 *   username="John"
 *   isLoading={isReporting}
 *   error={error}
 *   selectedReason={selectedReason}
 *   details={details}
 *   onReasonChange={setSelectedReason}
 *   onDetailsChange={setDetails}
 *   onSubmit={() => reportUser(selectedReason!, details)}
 *   onCancel={() => { setIsReportModalOpen(false); clearError() }}
 * />
 * ```
 */

import React, { memo, useCallback, useEffect, useRef } from 'react'
import type { ReportUserModalProps } from '../../types/chat'
import { REPORT_REASONS } from '../../types/chat'
import type { ReportReason } from '../../types/database'
import styles from './styles/ChatScreen.module.css'

/**
 * Report flag icon for the modal header
 */
function ReportIcon() {
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
      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
      <line x1="4" y1="22" x2="4" y2="15" />
    </svg>
  )
}

/** Maximum character length for report details */
const MAX_DETAILS_LENGTH = 500

/**
 * ReportUserModal displays a form for reporting a user
 *
 * @param isOpen - Whether the modal is visible
 * @param username - The name of the user being reported
 * @param isLoading - Whether the report operation is in progress
 * @param error - Error message if reporting failed
 * @param selectedReason - Currently selected report reason
 * @param details - Additional details text
 * @param onReasonChange - Callback when report reason changes
 * @param onDetailsChange - Callback when details text changes
 * @param onSubmit - Callback when user submits the report
 * @param onCancel - Callback when user cancels (closes modal)
 */
function ReportUserModalComponent({
  isOpen,
  username,
  isLoading,
  error,
  selectedReason,
  details,
  onReasonChange,
  onDetailsChange,
  onSubmit,
  onCancel,
}: ReportUserModalProps) {
  const modalRef = useRef<HTMLDivElement>(null)
  const cancelButtonRef = useRef<HTMLButtonElement>(null)

  // Validate form - requires a reason to be selected
  const isFormValid = selectedReason !== null

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
          'button:not(:disabled), [href], input:not(:disabled), select, textarea:not(:disabled), [tabindex]:not([tabindex="-1"])'
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

  // Handle reason selection
  const handleReasonSelect = useCallback(
    (reason: ReportReason) => {
      if (!isLoading) {
        onReasonChange(reason)
      }
    },
    [isLoading, onReasonChange]
  )

  // Handle details change
  const handleDetailsChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      onDetailsChange(e.target.value)
    },
    [onDetailsChange]
  )

  // Handle form submission
  const handleSubmit = useCallback(() => {
    if (isFormValid && !isLoading) {
      onSubmit()
    }
  }, [isFormValid, isLoading, onSubmit])

  // Don't render if not open
  if (!isOpen) {
    return null
  }

  const getReasonOptionClass = (reason: ReportReason) => {
    let className = styles.reasonOption
    if (selectedReason === reason) className += ` ${styles.reasonOptionSelected}`
    if (isLoading) className += ` ${styles.reasonOptionDisabled}`
    return className
  }

  const submitButtonClass = `${styles.modalSubmitButton} ${!isFormValid ? styles.modalSubmitButtonDisabled : ''} ${isLoading ? styles.modalSubmitButtonLoading : ''}`
  const textareaClass = `${styles.detailsTextarea} ${isLoading ? styles.textareaDisabled : ''}`

  return (
    <div
      className={styles.modalOverlay}
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="report-modal-title"
      aria-describedby="report-modal-description"
    >
      <div ref={modalRef} className={`${styles.modal} ${styles.modalLarge}`}>
        {/* Header with icon */}
        <div className={styles.modalHeader}>
          <div className={`${styles.iconContainer} ${styles.iconContainerWarning}`}>
            <ReportIcon />
          </div>
          <h2 id="report-modal-title" className={styles.modalTitle}>
            Report User
          </h2>
        </div>

        {/* Description */}
        <p id="report-modal-description" className={styles.modalText}>
          Why are you reporting{' '}
          <span className={styles.usernameHighlight}>{username || 'this user'}</span>?
        </p>

        {/* Report reasons selection */}
        <fieldset className={styles.fieldset}>
          <legend className={styles.legend}>Select a reason</legend>
          <div className={styles.reasonList} role="radiogroup">
            {REPORT_REASONS.map((reason) => (
              <label
                key={reason.value}
                className={getReasonOptionClass(reason.value)}
                onClick={() => handleReasonSelect(reason.value)}
              >
                <input
                  type="radio"
                  name="reportReason"
                  value={reason.value}
                  checked={selectedReason === reason.value}
                  onChange={() => handleReasonSelect(reason.value)}
                  disabled={isLoading}
                  className={styles.radioInput}
                />
                <span
                  className={`${styles.customRadio} ${selectedReason === reason.value ? styles.customRadioChecked : ''}`}
                  aria-hidden="true"
                >
                  {selectedReason === reason.value && (
                    <span className={styles.radioInner} />
                  )}
                </span>
                <span className={styles.reasonLabel}>{reason.label}</span>
              </label>
            ))}
          </div>
        </fieldset>

        {/* Additional details (optional) */}
        <div className={styles.detailsSection}>
          <label htmlFor="report-details" className={styles.detailsLabel}>
            Additional details <span className={styles.optionalText}>(optional)</span>
          </label>
          <textarea
            id="report-details"
            className={textareaClass}
            value={details}
            onChange={handleDetailsChange}
            placeholder="Provide any additional information that might help us investigate..."
            maxLength={MAX_DETAILS_LENGTH}
            disabled={isLoading}
            rows={4}
          />
          <div className={styles.characterCount}>
            {details.length}/{MAX_DETAILS_LENGTH}
          </div>
        </div>

        {/* Privacy note */}
        <p className={styles.privacyNote}>
          Your report is confidential. The reported user will not know who submitted this report.
        </p>

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
            className={submitButtonClass}
            onClick={handleSubmit}
            disabled={!isFormValid || isLoading}
            type="button"
          >
            {isLoading ? (
              <>
                <span className={styles.spinnerSmall} aria-hidden="true" />
                Submitting...
              </>
            ) : (
              'Submit Report'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

/**
 * Memoized ReportUserModal for performance optimization
 * Only re-renders when props change
 */
export const ReportUserModal = memo(ReportUserModalComponent)
