'use client'

/**
 * ChatInputToolbar Component
 *
 * A toolbar for chat input that provides action buttons for:
 * - Attaching files (images, documents, etc.)
 * - Opening an emoji picker
 * - Showing attachment previews with remove capability
 *
 * Features:
 * - File picker integration via hidden input
 * - Emoji picker trigger button
 * - Attachment preview with count badge
 * - Proper accessibility labels and keyboard navigation
 * - Disabled state handling
 * - Keyboard-aware positioning support
 */

import React, {
  memo,
  useCallback,
  useRef,
  useMemo,
  KeyboardEvent,
} from 'react'
import type { ChatInputToolbarProps, ChatAttachment } from '../../types/chat'
import styles from './styles/ChatScreen.module.css'

/**
 * Default accepted file types for attachments
 */
const DEFAULT_ACCEPTED_FILE_TYPES = 'image/*,.pdf,.doc,.docx,.txt'

/**
 * Default maximum file size: 10MB
 */
const DEFAULT_MAX_FILE_SIZE = 10 * 1024 * 1024

/**
 * Default maximum number of attachments
 */
const DEFAULT_MAX_ATTACHMENTS = 5

/**
 * Get file type category from MIME type or extension
 */
function getFileTypeCategory(file: File): ChatAttachment['type'] {
  const mimeType = file.type.toLowerCase()

  if (mimeType.startsWith('image/')) return 'image'
  if (mimeType.startsWith('video/')) return 'video'
  if (mimeType.startsWith('audio/')) return 'audio'
  if (
    mimeType.includes('pdf') ||
    mimeType.includes('document') ||
    mimeType.includes('msword') ||
    mimeType.includes('text/')
  ) {
    return 'document'
  }

  return 'other'
}

/**
 * Format file size for display
 */
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

/**
 * ChatInputToolbar provides action buttons for file attachment and emoji selection
 *
 * @param onAttachmentClick - Callback when attachment button is clicked
 * @param onEmojiClick - Callback when emoji button is clicked
 * @param onFileSelect - Optional callback when files are selected
 * @param disabled - Whether the toolbar is disabled
 * @param isEmojiPickerOpen - Whether the emoji picker is currently open
 * @param attachments - Currently attached files
 * @param onRemoveAttachment - Callback to remove an attachment
 * @param acceptedFileTypes - Accepted file types for the file input
 * @param maxFileSize - Maximum file size in bytes
 * @param maxAttachments - Maximum number of attachments allowed
 */
function ChatInputToolbarComponent({
  onAttachmentClick,
  onEmojiClick,
  onFileSelect,
  disabled = false,
  isEmojiPickerOpen = false,
  attachments = [],
  onRemoveAttachment,
  acceptedFileTypes = DEFAULT_ACCEPTED_FILE_TYPES,
  maxFileSize = DEFAULT_MAX_FILE_SIZE,
  maxAttachments = DEFAULT_MAX_ATTACHMENTS,
}: ChatInputToolbarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ---------------------------------------------------------------------------
  // Computed Values
  // ---------------------------------------------------------------------------

  const attachmentCount = attachments.length
  const hasAttachments = attachmentCount > 0
  const canAddMoreAttachments = attachmentCount < maxAttachments

  const attachmentStatusSummary = useMemo(() => {
    const uploading = attachments.filter(a => a.status === 'uploading').length
    const failed = attachments.filter(a => a.status === 'failed').length

    if (failed > 0) return `${failed} failed`
    if (uploading > 0) return `Uploading ${uploading}...`
    return `${attachmentCount} file${attachmentCount !== 1 ? 's' : ''}`
  }, [attachments, attachmentCount])

  // ---------------------------------------------------------------------------
  // Event Handlers
  // ---------------------------------------------------------------------------

  const handleAttachmentButtonClick = useCallback(() => {
    if (disabled) return

    // Trigger file input click
    fileInputRef.current?.click()
    onAttachmentClick()
  }, [disabled, onAttachmentClick])

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files
      if (!files || files.length === 0) return

      // Validate file count
      if (attachmentCount + files.length > maxAttachments) {
        // Could trigger an error callback here in the future
        return
      }

      // Validate file sizes
      for (let i = 0; i < files.length; i++) {
        if (files[i].size > maxFileSize) {
          // Could trigger an error callback here in the future
          return
        }
      }

      // Call the onFileSelect callback if provided
      if (onFileSelect) {
        onFileSelect(files)
      }

      // Reset the input so the same file can be selected again
      e.target.value = ''
    },
    [attachmentCount, maxAttachments, maxFileSize, onFileSelect]
  )

  const handleEmojiButtonClick = useCallback(() => {
    if (disabled) return
    onEmojiClick()
  }, [disabled, onEmojiClick])

  const handleRemoveAttachment = useCallback(
    (attachmentId: string) => {
      if (onRemoveAttachment) {
        onRemoveAttachment(attachmentId)
      }
    },
    [onRemoveAttachment]
  )

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLButtonElement>, action: 'attachment' | 'emoji') => {
      // Handle Enter and Space for accessibility
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        if (action === 'attachment') {
          handleAttachmentButtonClick()
        } else {
          handleEmojiButtonClick()
        }
      }
    },
    [handleAttachmentButtonClick, handleEmojiButtonClick]
  )

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  const toolbarButtonClass = (isActive = false, isDisabled = false) => {
    let className = styles.toolbarButton
    if (isDisabled) className += ` ${styles.toolbarButtonDisabled}`
    if (isActive) className += ` ${styles.toolbarButtonActive}`
    return className
  }

  const getAttachmentPreviewClass = (attachment: ChatAttachment) => {
    let className = styles.attachmentPreview
    if (attachment.status === 'failed') className += ` ${styles.attachmentPreviewFailed}`
    if (attachment.status === 'uploading') className += ` ${styles.attachmentPreviewUploading}`
    return className
  }

  return (
    <div className={styles.toolbarContainer} role="toolbar" aria-label="Message actions">
      {/* Hidden file input for attachment selection */}
      <input
        ref={fileInputRef}
        type="file"
        accept={acceptedFileTypes}
        multiple
        className={styles.hiddenInput}
        onChange={handleFileInputChange}
        disabled={disabled || !canAddMoreAttachments}
        aria-hidden="true"
        tabIndex={-1}
      />

      {/* Attachment previews (if any) */}
      {hasAttachments && (
        <div
          className={styles.attachmentPreviews}
          role="list"
          aria-label={`Attachments: ${attachmentStatusSummary}`}
        >
          {attachments.map((attachment) => (
            <div
              key={attachment.id}
              className={getAttachmentPreviewClass(attachment)}
              role="listitem"
            >
              {/* Preview thumbnail for images */}
              {attachment.type === 'image' && attachment.previewUrl ? (
                <img
                  src={attachment.previewUrl}
                  alt={attachment.file.name}
                  className={styles.attachmentThumbnail}
                />
              ) : (
                <div className={styles.attachmentIcon}>
                  <FileIcon type={attachment.type} />
                </div>
              )}

              {/* File info */}
              <div className={styles.attachmentInfo}>
                <span className={styles.attachmentName} title={attachment.file.name}>
                  {attachment.file.name}
                </span>
                <span className={styles.attachmentSize}>
                  {formatFileSize(attachment.file.size)}
                </span>
              </div>

              {/* Upload progress */}
              {attachment.status === 'uploading' && attachment.progress !== undefined && (
                <div
                  className={styles.attachmentProgress}
                  role="progressbar"
                  aria-valuenow={attachment.progress}
                  aria-valuemin={0}
                  aria-valuemax={100}
                >
                  <div
                    className={styles.attachmentProgressBar}
                    style={{ width: `${attachment.progress}%` }}
                  />
                </div>
              )}

              {/* Error message */}
              {attachment.status === 'failed' && attachment.error && (
                <span className={styles.attachmentError}>{attachment.error}</span>
              )}

              {/* Remove button */}
              {onRemoveAttachment && (
                <button
                  className={styles.removeAttachmentButton}
                  onClick={() => handleRemoveAttachment(attachment.id)}
                  aria-label={`Remove ${attachment.file.name}`}
                  type="button"
                >
                  <CloseIcon />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Toolbar buttons */}
      <div className={styles.buttonGroup}>
        {/* Attachment button */}
        <button
          className={toolbarButtonClass(false, disabled || !canAddMoreAttachments)}
          onClick={handleAttachmentButtonClick}
          onKeyDown={(e) => handleKeyDown(e, 'attachment')}
          disabled={disabled || !canAddMoreAttachments}
          aria-label={
            !canAddMoreAttachments
              ? `Maximum ${maxAttachments} attachments reached`
              : 'Attach file'
          }
          title={
            !canAddMoreAttachments
              ? `Maximum ${maxAttachments} attachments`
              : 'Attach file'
          }
          type="button"
        >
          <AttachmentIcon />
          {hasAttachments && (
            <span className={styles.attachmentBadge} aria-hidden="true">
              {attachmentCount}
            </span>
          )}
        </button>

        {/* Emoji button */}
        <button
          className={toolbarButtonClass(isEmojiPickerOpen, disabled)}
          onClick={handleEmojiButtonClick}
          onKeyDown={(e) => handleKeyDown(e, 'emoji')}
          disabled={disabled}
          aria-label={isEmojiPickerOpen ? 'Close emoji picker' : 'Open emoji picker'}
          aria-pressed={isEmojiPickerOpen}
          title="Emoji"
          type="button"
        >
          <EmojiIcon />
        </button>
      </div>
    </div>
  )
}

// ============================================================================
// Icon Components
// ============================================================================

/**
 * Attachment (paperclip) icon
 */
function AttachmentIcon() {
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
      <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
    </svg>
  )
}

/**
 * Emoji (smile) icon
 */
function EmojiIcon() {
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
      <circle cx="12" cy="12" r="10" />
      <path d="M8 14s1.5 2 4 2 4-2 4-2" />
      <line x1="9" y1="9" x2="9.01" y2="9" />
      <line x1="15" y1="9" x2="15.01" y2="9" />
    </svg>
  )
}

/**
 * Close (X) icon for remove button
 */
function CloseIcon() {
  return (
    <svg
      width="14"
      height="14"
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
 * File type icon based on attachment type
 */
function FileIcon({ type }: { type: ChatAttachment['type'] }) {
  switch (type) {
    case 'document':
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
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
          <polyline points="10 9 9 9 8 9" />
        </svg>
      )
    case 'video':
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
          <polygon points="23 7 16 12 23 17 23 7" />
          <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
        </svg>
      )
    case 'audio':
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
          <path d="M9 18V5l12-2v13" />
          <circle cx="6" cy="18" r="3" />
          <circle cx="18" cy="16" r="3" />
        </svg>
      )
    case 'image':
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
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <polyline points="21 15 16 10 5 21" />
        </svg>
      )
    default:
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
          <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
          <polyline points="13 2 13 9 20 9" />
        </svg>
      )
  }
}

/**
 * Memoized ChatInputToolbar for performance optimization
 * Only re-renders when props change
 */
export const ChatInputToolbar = memo(ChatInputToolbarComponent)
